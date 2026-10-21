---
title: "Kata 05: Sabre-маршрутизация и вариативность seed'ов"
module: "Каты"
difficulty: "advanced"
duration: "~60 мин"
status: "draft"
tags: [kata, sabre-swap, routing, seeds, depth, swap-count]
---

# Kata 05: Sabre-маршрутизация и вариативность seed'ов

Серия упражнений по принципу кат: убеждаемся на числах, что Sabre-маршрутизация
стохастична, изучаем, как seed и параметры меняют качество (SWAP/depth), и вырабатываем
честный протокол для сравнения. Это упрощённая, «катовая» версия
[lab-05](../../curriculum/04-systems-design/lab-05-sabre-routing.md): без своего
router, без графика, только метрики и статистика.

Понадобится:

```python
import statistics
from qiskit import QuantumCircuit, transpile
from qiskit.transpiler import CouplingMap
from qiskit.transpiler.passes import TrivialLayout, SabreSwap
from qiskit.transpiler import PassManager
```

Разборы и полные решения: [tests/answers/kata-05.md](../answers/kata-05.md) — не открывайте до попытки.

## Задача 5.1. «Все-пара» схема как нагрузка для маршрутизации

**Цель:** построить схему, которая заведомо требует маршрутизации на любой связной
топологии: 2q-операции между фактически не связанными парами кубитов (включая «дальние»).

```python
def all_to_all(num_qubits):
    qc = QuantumCircuit(num_qubits, num_qubits)
    layers = [
        [(0, 4), (1, 3)],
        [(0, 3), (4, 1)],
        [(0, 2), (3, 4)],
        [(1, 4), (2, 3)],
        [(0, 1), (2, 4)],
    ]
    for layer in layers:
        for a, b in layer:
            qc.cx(a, b)
        qc.barrier()
    qc.h(0)
    qc.cx(0, 1)
    qc.measure(list(range(num_qubits)), list(range(num_qubits)))
    return qc

qc = all_to_all(5)
```

Самопроверка:

```python
assert qc.size() >= 12          # много 2q-гейтов
assert all_to_all(5).num_qubits == 5
print("5.1 OK")
```

<details markdown="1"><summary>Подсказка к 5.1</summary>
Пары (0, 4) и (1, 3) — не соседи на линии 0-1-2-3-4; маршрутизатор не обойдётся
без SWAP. Барьеры нужны, чтобы параллельные слои чётко выделялись.
</details>

## Задача 5.2. Базовый прогон transpile с coupling_map

**Цель:** транспилировать схему на линейную топологию 5 кубитов (level 1) и вытащить
таблицу метрик: depth, size и число SWAP.

```python
line5 = CouplingMap.from_line(5)
routed = transpile(qc, coupling_map=line5, optimization_level=1, seed_transpiler=1)
```

Самопроверка:

```python
ops = routed.count_ops()
assert "swap" in ops, "маршрутизация должна была вставить SWAP"
print("depth =", routed.depth(), "size =", routed.size(), "swap =", ops.get("swap"))
print("5.2 OK")
```

<details markdown="1"><summary>Подсказка к 5.2</summary>
count_ops() возвращает Counter; ключ "swap" появляется, только если маршрутизатор
вставил SWAP (на этой схеме он обязан это сделать).
</details>

## Задача 5.3. Разброс от seed: Sabre не детерминирован

**Цель:** прогнать 30 запусков с разными seed_transpiler и собрать все три метрики.
Ожидание: по схеме задачи 5.1 число SWAP у всех seed'ов одинаково (4), а разброс
идёт по depth (в прогонах — 11…12, около 9 %): стохастичность Sabre проявляется
в структуре схемы, а не обязательно в числе вставленных свопов. На более крупных
схемах разброс по обоим метрикам заметнее.

```python
runs = []
for seed in range(30):
    r = transpile(qc, coupling_map=line5, optimization_level=1, seed_transpiler=seed)
    # TODO: добавьте в runs словарь {"seed": ..., "depth": ..., "size": ..., "swap": ...}
```

Самопроверка:

```python
depths = [r["depth"] for r in runs]
swaps = [r["swap"] for r in runs]
best = min(runs, key=lambda r: (r["swap"], r["depth"]))
assert max(swaps) >= min(swaps)
print("swap: min/mean/max =", min(swaps), statistics.mean(swaps), max(swaps))
print("best seed =", best["seed"])
print("5.3 OK")
```

<details markdown="1"><summary>Подсказка к 5.3</summary>
Для каждой строки запоминайте результат как словарь: {"seed": seed, "depth": r.depth(),
"size": r.size(), "swap": r.count_ops().get("swap", 0)} — потом легко считать статистику.
</details>

## Задача 5.4. Топологии: линия против кольца

**Цель:** сравнить два топологических профиля: линия 0-1-2-3-4 и кольцо из 5 кубитов.
Ожидание: у кольца лучше «диаметр» взаимодействия, поэтому маршрутизация дешевле.
Замерьте средние depth/swap по 10 seed'ам.

```python
ring5 = CouplingMap.from_ring(5)

def collect(cmap, seeds=10, level=1):
    # TODO: вернуть средние depth и swap по seed'ам
    ...
```

Самопроверка:

```python
line_stats = collect(line5)
ring_stats = collect(ring5)
assert ring_stats["swap"] <= line_stats["swap"]
print("5.4 OK")
```

<details markdown="1"><summary>Подсказка к 5.4</summary>
В кольце расстояние между любой парой кубитов не больше 2 (по числу рёбер пути);
в линии максимальный путь — 4. Короче путь — меньше SWAP.
</details>

## Задача 5.5. Эвристики SabreSwap: basic против decay

**Цель:** сравнить эвристики Sabre на зафиксированном layout'е. Почему PassManager,
а не transpile? Потому что transpile использует SabreLayout — там layout и routing
связаны в один проход, а «чистое» сравнение эвристик внутри SabreSwap требует
разложить этапы вручную (подход lab-05; упрощаем: используем TrivialLayout).

```python
def sabre_metrics(heuristic, seed):
    pm = PassManager([
        TrivialLayout(line5),
        SabreSwap(line5, heuristic=heuristic, seed=seed),
    ])
    out = pm.run(qc)
    return {"swap": out.count_ops().get("swap", 0), "depth": out.depth()}
```

**Цель в числах:** прогнать basic и decay по seed'ам 0..9 на схеме из задачи 5.1.

```python
all_metrics = {}
for heuristic in ("basic", "decay"):
    # TODO: соберите swap/depth по 10 seed'ам через sabre_metrics,
    #       напечатайте mean/std и сохраните в all_metrics[heuristic]
    ...
```

Самопроверка:

```python
assert all(row["swap"] > 0
           for rows in all_metrics.values() for row in rows)
print("5.5 OK")
```

<details markdown="1"><summary>Подсказка к 5.5</summary>
heuristic — параметр SabreSwap: "basic" смотрит только на текущий фронт (front layer),
"decay" (по умолчанию в Qiskit) добавляет штраф на «свежеиспользованные» кубиты.
А ещё есть trials — число независимых попыток (по умолчанию trials=5); при сравнении
эвристик фиксируйте trials, иначе сравнивать бесполезно.
</details>

<details markdown="1"><summary>Подсказка к 5.5 (вторая)</summary>
Первым аргументом SabreSwap идёт coupling_map, поэтому SabreSwap(line5, ...).
TrivialLayout(line5) обязателен перед маршрутизацией: без layout у PassManager
не окажется привязки логических кубитов к физическим.
</details>

## Задача 5.6. Протокол сравнения: best seed против среднего

**Цель:** сформулировать (и проверить) правило: в эксперименте используйте либо
фиксированный seed с осознанием его «удачности», либо агрегирование по seed'ам.
Задача: по данным 5.3 сравните (a) лучший seed, (b) среднее, (c) худший — и придите
к честной форме для отчёта.

```python
swaps = [r["swap"] for r in runs]            # данные из задачи 5.3
print("best   :", min(swaps))
print("mean   :", statistics.mean(swaps))
print("worst  :", max(swaps))
# честная оценка «в среднем» — не минимум, а среднее (или медиана)
```

Самопроверка: на схеме задачи 5.1 число SWAP у всех 30 seed'ов одинаково (4),
так что best == worst и разница равна нулю; разброс виден только по depth
(11…12, то есть около 9 %). Вывод для отчёта: «мой SWAP = min» без указания
протокола — приукрашенный; на этой схеме минимальное и среднее значения SWAP
совпадают, и разброс проявляется в depth, а на больших схемах — и в числе свопов.

<details markdown="1"><summary>Подсказка к 5.6</summary>
Сравнение подходов компиляции честно показывать таблицей mean±std по seed'ам
(как в lab-05), а не «лучшую точку». «Best seed» допустима только при фиксированном
протоколе: один и тот же набор seed'ов у всех сравниваемых подходов.
</details>

## Итог серии

- Sabre-маршрутизация стохастична: seed меняет структуру скомпилированной схемы,
  а не только «шум» в цифрах.
- Число SWAP и depth — разные метрики; минимум SWAP не всегда совпадает с минимумом depth.
- Честное сравнение: mean±std по seed'ам, а не cherry-picking лучшего запуска.

## ➡️ Что дальше

Основной практический материал — [lab-05](../../curriculum/04-systems-design/lab-05-sabre-routing.md):
свой жадный router и полный эксперимент с heuristic/trials. Теория маршрутизации —
[03-routing-mapping-sabre](../../curriculum/04-systems-design/03-routing-mapping-sabre.md).
Проверить понимание — [04-quiz](../04-quiz.md).
