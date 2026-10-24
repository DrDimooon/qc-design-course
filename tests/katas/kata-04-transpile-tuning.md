---
title: "Kata 04: transpile и метрики схем"
module: "Каты"
difficulty: "intermediate/advanced"
duration: "~60 мин"
status: "draft"
tags: [kata, transpile, optimization-level, coupling-map, seed-transpiler, metrics]
---

# Kata 04: transpile и метрики схем

Серия упражнений по принципу кат: учимся управлять транспилятором — уровнями оптимизации,
набором гейтов, топологией (`coupling_map`) и воспроизводимостью (`seed_transpiler`), —
а затем сверять результаты по метрикам схемы: depth, size, число 2q-гейтов.

Понадобится:

```python
import time
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.transpiler import CouplingMap
```

Разборы и полные решения: [tests/answers/kata-04.md](../answers/kata-04.md) — не открывайте до попытки.

Справочная схема для всей каты — «утяжелённая» Bell-подобная конструкция с избыточными
проходами и дальней парой (0, 2):

```python
def template_circuit():
    qc = QuantumCircuit(3)
    qc.h(0)
    qc.cx(0, 1)
    qc.cx(1, 2)
    qc.h(0)
    qc.cx(0, 1)
    qc.cx(1, 2)
    qc.cx(0, 2)          # «дальняя» пара для 2q-топологии
    qc.measure_all()
    return qc
```

## Задача 4.1. Перевод в нативный базис

**Цель:** прогнать `transpile` с `basis_gates` и убедиться, что библиотечные гейты
(h, cx) переписываются в целевой набор. Сравните два целевых базиса.

```python
qc = template_circuit()
ecr_hit = transpile(qc, basis_gates=["rz", "sx", "x", "ecr"], optimization_level=1)
u_cx = transpile(qc, basis_gates=["u", "cx"], optimization_level=1)
```

Самопроверка:

```python
allowed_ecr = set(ecr_hit.count_ops()) <= {"rz", "sx", "x", "ecr", "id", "measure", "barrier"}
allowed_u = set(u_cx.count_ops()) <= {"u", "cx", "id", "measure", "barrier"}
assert allowed_ecr and allowed_u
print("базис ecr:", ecr_hit.count_ops())
print("базис u/cx:", u_cx.count_ops())
print("4.1 OK")
```

<details markdown="1"><summary>Подсказка к 4.1</summary>
Это тот же «нативный» базис, который вы читали о железе IBM в 02-quiz (вопрос 14):
{rz, sx, x, ecr}. Библиотечные h разлагаются в rz+sx.
</details>

## Задача 4.2. Уровни оптимизации

**Цель:** прогнать `optimization_level` от 0 до 3 и собрать таблицу метрик. В общем
случае глубина и число гейтов убывают с уровнем, потому что более высокий уровень
перебирает больше кандидатов раскладки/маршрутизации и выполняет более дорогие
оптимизации (отмены через коммутацию, пересборку пар 2q-гейтов). Какие именно пассы
это реализуют — версионная деталь, а не часть контракта уровня: не заучивайте ростер,
а получайте его дампом пресета и сверяйтесь с [уроком 04](../../curriculum/04-systems-design/02-transpiler-internals.md). На маленькой шаблонной схеме (3 кубита, 5 гейтов) все четыре уровня могут дать
одинаковые метрики (depth 7, size 10): чтобы увидеть разницу, нужна схема покрупнее
(см. [lab-04](../../curriculum/04-systems-design/lab-04-platform-comparison.md)).

```python
for level in range(4):
    out = transpile(qc, optimization_level=level, seed_transpiler=42)
    # TODO: соберите метрики: depth, size, count_ops
```

Самопроверка:

```python
for level in range(4):
    out = transpile(qc, optimization_level=level, seed_transpiler=42)
    print(level, out.depth(), out.size(), dict(out.count_ops()))
# контрольная строка: уровень 3 не должен быть больше уровня 0 по depth
metrics = [transpile(qc, optimization_level=lv, seed_transpiler=42) for lv in range(4)]
assert metrics[3].depth() <= metrics[0].depth()
print("4.2 OK")
```

<details markdown="1"><summary>Подсказка к 4.2</summary>
Метрики: out.depth() (глубина), out.size() (число инструкций), out.count_ops() (словарь
гейт). Уровень 3 — самый дорогой пресет: больше перебора и пересборка пар 2q-гейтов
(см. 04-quiz, вопрос 7). Конкретный набор пассов версионный — проверяйте дампом пресета.
На шаблонной схеме все уровни могут совпасть по метрикам (depth 7, size 10) — это
нормально, разница видна на схемах с десятками гейтов.
</details>

## Задача 4.3. Ограничения топологии: SWAP автоматически

**Цель:** задать линейную топологию 0–1–2 и увидеть, как транспилятор вставляет SWAP
для НЕсвязанной пары кубитов. Сравните схемы с топологией и без неё.

```python
line = CouplingMap.from_line(3)
routed = transpile(qc, coupling_map=line, optimization_level=1, seed_transpiler=42)
# TODO: найдите depth/size, посчитайте, сколько SWAP появилось (count_ops)
```

Самопроверка:

```python
ops = routed.count_ops()
assert ops.get("swap", 0) >= 1          # cx(0, 2) не укладывается в линейную цепочку
assert "cx" in ops or "ecr" in ops or "swap" in ops
print("4.3 OK")
```

<details markdown="1"><summary>Подсказка к 4.3</summary>
SWAP появится в count_ops как ключ "swap". Помните: маршрутизация может также
менять финальное число кубитов в схеме (layout не обязан быть тривиальным), поэтому
depth/size двух разных прогонов не сводятся «лобовому» сравнению.
</details>

<details markdown="1"><summary>Подсказка к 4.3 (вторая)</summary>
Для линейной топологии 0-1-2 пара (0, 2) НЕ соседняя — именно она заставляет
транспилятор вставить SWAP. Пары (0, 1) и (1, 2) соседние, их SWAP не касается.
</details>

## Задача 4.4. Вариативность от seed: `seed_transpiler`

**Цель:** показать стохастичность этапов layout/routing: без указания seed каждый
запуск transpile может дать разную depth/size. Соберите статистику по 20 запускам
с разными seed'ами.

```python
results = []
for seed in range(20):
    routed = transpile(qc, coupling_map=CouplingMap.from_line(3),
                       optimization_level=1, seed_transpiler=seed + 1)
    # TODO: добавьте в results словарь {"seed": ..., "depth": ..., "size": ..., "swap": ...}
```

Самопроверка:

```python
depths = [row["depth"] for row in results]
swaps = [row["swap"] for row in results]
print("depth:", min(depths), "-", max(depths))
print("swap:", min(swaps), "-", max(swaps))
assert max(depths) >= min(depths)
# на маленькой схеме на 3 кубитах разброс может быть нулевым: depth 8…8, swap 1…1
# (проверено для 20 seed'ов) — это не ошибка, а особенность размера схемы
print("4.4 OK")
```

<details markdown="1"><summary>Подсказка к 4.4</summary>
seed_transpiler задаёт случайность layout/routing; при одном и том же seed результат
одинаковый (воспроизводимость, см. 02-quiz, вопрос 6). Число SWAP достаётся как
routed.count_ops().get("swap", 0).
</details>

## Задача 4.5. Изменяющаяся топология: линейная против кольца

**Цель:** сравнить качество маршрутизации на двух топологиях по 5 кубитам: линия
(диаметр 4) и кольцо (диаметр 2). Замерьте средние depth и число SWAP по 5 seed'ам
при фиксированном optimization_level.

Важно: трёхкубитный шаблон из начала каты для этого сравнения не годится — на трёх
кубитах линия и кольцо дают одинаковые метрики (swap 1, depth 8). Возьмите схему на
5 кубитах с «дальними» парами:

```python
def template5():
    qc = QuantumCircuit(5)
    qc.h(0)
    qc.cx(0, 1); qc.cx(1, 2); qc.cx(2, 3); qc.cx(3, 4)
    qc.cx(0, 2); qc.cx(2, 4); qc.cx(1, 3)
    qc.h(0)
    qc.cx(0, 4); qc.cx(1, 3)
    qc.measure_all()
    return qc

qc5 = template5()

def avg_metrics(cmap, seeds=5):
    # TODO: прогон transpile по seed'ам; верните средний depth и средний swap
    ...

line5 = CouplingMap.from_line(5)
ring5 = CouplingMap.from_ring(5)
```

Самопроверка:

```python
avg_line = avg_metrics(line5)
avg_ring = avg_metrics(ring5)
print("line:", avg_line, "| ring:", avg_ring)
# на кольце маршруты в среднем короче => меньше SWAP
assert avg_ring["swap"] <= avg_line["swap"]
print("4.5 OK")
```

Ожидаемые числа (проверено на Qiskit 2.6): на линии в среднем 3 SWAP, на кольце —
2 (depth при этом может быть чуть больше на кольце: маршрут короче, но шаг глубже).

<details markdown="1"><summary>Подсказка к 4.5</summary>
В кольце максимальное расстояние между кубитами меньше, чем в линии того же размера,
— маршрутизация дешевле. Это тоже метрика топологии, не только схемы.
</details>

<details markdown="1"><summary>Подсказка к 4.5 (вторая)</summary>
Чтобы сравнение было честным, используйте одно и то же целевое число кубитов и
одинаковый optimization_level и seed'ы в обоих прогонах.
</details>

## Задача 4.6. Время компиляции против уровня

**Цель:** замерить время компиляции на каждом level. Обратная сторона оптимизации:
более жёсткие уровни требуют больше времени на компиляцию (даже когда схема маленькая).

```python
for level in range(4):
    t0 = time.perf_counter()
    out = transpile(qc, optimization_level=level)
    dt = time.perf_counter() - t0
    print(f"level = {level}: {dt * 1000:.1f} ms, depth = {out.depth()}, size = {out.size()}")
```

Самопроверка: время может расти не монотонно на маленьких схемах (для нормального
эксперимента нужны крупные схемы — см. [lab-04](../../curriculum/04-systems-design/lab-04-platform-comparison.md)),
но уровень 0 должен быть сопоставимо быстрее остальных.

<details markdown="1"><summary>Подсказка к 4.6</summary>
time.perf_counter() точнее, чем time.time(). Для стабильного замера сделайте по
несколько повторов на уровень и берите минимальное время (это отсекает «шум» системы).
</details>

## Итог серии

- transpile — не одна функция, а конвейер из шести стадий: init → layout → routing →
  translation → optimization → scheduling (теория — в модуле 04).
- Статистика сравнения требует seed_transpiler и повторов — иначе сравнивать нечего.

## ➡️ Что дальше

[Kata 05 — Sabre и seeds](kata-05-sabre-seeds.md). Теория:
[02-transpiler-internals](../../curriculum/04-systems-design/02-transpiler-internals.md).
Проверить понимание — [04-quiz](../04-quiz.md).
