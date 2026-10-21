---
title: "Лаба 05: свой жадный router и параметры SabreSwap"
module: "04 Проектирование систем"
difficulty: "advanced"
duration: "~2 ч"
status: "draft"
tags: [sabre-swap, routing, heuristic-decay, trials, benchmark, greedy-router]
---

# Лаба 05: свой жадный router и параметры SabreSwap

Практика по уроку 03. Две части: (A) строим простой жадный router «руками» и сравниваем его с Qiskit SabreSwap; (B) исследуем параметры SabreSwap (heuristic, trials) и строим график качества против времени. Главная мысль лабы: даже между реализациями одного и того же алгоритма варьируются результаты, поэтому сравнение компиляторов требует аккуратных протоколов.

## Часть A. Свой жадный router

Идея: простой, но рабочий подход — берём BFS-путь между кубитами каждой 2q-операции и итеративно сдвигаем первый кубит по пути (SWAP), пока они не станут соседями. Так работает классический тривиальный router (типа `BasicSwap`).

```python
from collections import deque
from qiskit import QuantumCircuit, transpile
from qiskit.transpiler import CouplingMap, PassManager
from qiskit.transpiler.passes import TrivialLayout, SabreSwap
from qiskit.converters import circuit_to_dag

def bfs_path(cm, src, dst):
    """Кратчайший путь в графе cm между узлами src и dst."""
    visited = {src: None}
    queue = deque([src])
    while queue:
        node = queue.popleft()
        if node == dst:
            break
        for nxt in cm.neighbors(node):
            if nxt not in visited:
                visited[nxt] = node
                queue.append(nxt)
    # восстанавливаем путь назад
    path = []
    cur = dst
    while cur is not None:
        path.append(cur)
        cur = visited[cur]
    return list(reversed(path))

def greedy_route(qc, cm):
    """Тривиальный router: вставляем SWAP вдоль кратчайшего пути."""
    routed = QuantumCircuit(cm.size())
    # классические регистры нужны, чтобы measure из measure_all имел куда писать
    for creg in qc.cregs:
        routed.add_register(creg)
    pos = list(range(qc.num_qubits))     # logical -> physical
    swap_count = 0

    for inst in qc.data:
        name = inst.operation.name
        qargs = [qc.find_bit(b).index for b in inst.qubits]
        phys = [pos[q] for q in qargs]

        if name in ("barrier", "delay"):     # barrier из measure_all не гейт
            routed.append(inst.operation, phys)
            continue
        if name == "measure":
            routed.measure(phys[0], inst.clbits[0])
            continue
        if inst.operation.num_qubits == 1:
            routed.append(inst.operation, phys)
            continue

        a, b = phys
        path = bfs_path(cm, a, b)
        while len(path) > 2:             # пока кубиты не рядом
            edge = path[:2]
            routed.swap(edge[0], edge[1])
            # логический кубит, сидевший на edge[0], переезжает на edge[1]
            for logic in range(qc.num_qubits):
                if pos[logic] == edge[0]:
                    pos[logic] = edge[1]
                elif pos[logic] == edge[1]:
                    pos[logic] = edge[0]
            path = path[1:]
            swap_count += 1
        routed.append(inst.operation, [pos[qargs[0]], pos[qargs[1]]])
    return routed, swap_count
```

Функция возвращает уже routed-схему (в физическом масштабе, со swap) и число swap.

## Сравнение с SabreSwap

Берём QAOA-схему 6 кубитов (из lab-04) и сравниваем два сценария: (1) наш greedy router, (2) `SabreSwap` на том же layout'е. Сравниваем число SWAP, depth и время.

```python
import time
import numpy as np

line = CouplingMap.from_line(6)   # как в lab-04
qc = build_qaoa(6, edges, gamma, beta_s)

# наш greedy router
t0 = time.time()
routed, swap_count = greedy_route(qc, line)
t_greedy = time.time() - t0
print("greedy: swap =", swap_count, "time =", round(t_greedy, 4), "s")

# Qiskit SabreSwap на том же layout (TrivialLayout + SabreSwap)
pm = PassManager([TrivialLayout(line), SabreSwap(line, heuristic="basic", seed=42)])
t0 = time.time()
out = pm.run(qc)
t_sabre = time.time() - t0
swap_count_sabre = out.count_ops().get("swap", 0)
print("sabre: swap =", swap_count_sabre, "time =", round(t_sabre, 4), "s")
```

Ожидания: greedy router почти всегда даёт больше SWAP и большую глубину, чем SabreSwap, потому что он не заглядывает вперёд и не адаптирует SWAP под будущие слои. Это и есть содержательный вывод части A: детали реализации важны.

## Часть B. Параметры SabreSwap

У SabreSwap есть параметры:

- `heuristic`: `basic` (только front layer), `lookahead` (front + extended layer), `decay` (lookahead + штраф на недавно использованные кубиты);
- `trials`: число независимых попыток маршрутизации (в песочнице варьируйте 1, 5, 20);
- `seed`: вариация результатов.

Оговорка по версиям: параметр `trials` есть только начиная с **Qiskit 2.0** (в Qiskit 1.x те же настройки назывались `swap_trials` и `layout_trials`, а `routing_method` — предшественник `heuristic`). Весь модуль рассчитан на Qiskit ≥ 2.0 (проверено на 2.6.0).

Прогон: три heuristic × пять trials × пять seeds, усредняем SWAP и depth. Собираем таблицу.

```python
from qiskit.transpiler.passes import TrivialLayout, SabreSwap

def run_sabre(qc, cm, heuristic, trials, seed):
    pm = PassManager([
        TrivialLayout(cm),
        SabreSwap(cm, heuristic=heuristic, trials=trials, seed=seed),
    ])
    t0 = time.time()
    out = pm.run(qc)
    dt = time.time() - t0
    ops = out.count_ops()
    return {
        "swap": ops.get("swap", 0),
        "depth": out.depth(),
        "time": dt,
    }

rows = []
for heuristic in ("basic", "lookahead", "decay"):
    for trials in (1, 5, 20):
        for seed in range(5):
            m = run_sabre(qc, line, heuristic, trials, seed)
            m["heuristic"], m["trials"], m["seed"] = heuristic, trials, seed
            rows.append(m)
```

Сводка по клеткам (mean по seeds) и построение графика качества/performance:

```python
import statistics

for heuristic in ("basic", "lookahead", "decay"):
    for trials in (1, 5, 20):
        subset = [r for r in rows
                  if r["heuristic"] == heuristic and r["trials"] == trials]
        swaps = [r["swap"] for r in subset]
        depth = [r["depth"] for r in subset]
        times = [r["time"] for r in subset]
        print(f"{heuristic:>10} trials={trials:>3}: "
              f"swap={statistics.mean(swaps):5.1f}, "
              f"depth={statistics.mean(depth):5.1f}, "
              f"time={statistics.mean(times)*1000:6.1f} ms")
```

Для графика с matplotlib:

```python
import matplotlib.pyplot as plt
import statistics

fig, ax = plt.subplots(figsize=(6, 4))
for heuristic in ("basic", "lookahead", "decay"):
    xs, ys = [], []
    for trials in (1, 5, 20):
        subset = [r for r in rows
                  if r["heuristic"] == heuristic and r["trials"] == trials]
        xs.append(statistics.mean(r["time"] for r in subset) * 1000)
        ys.append(statistics.mean(r["swap"] for r in subset))
    ax.plot(xs, ys, marker="o", label=heuristic)

ax.set_xlabel("время (мс)")
ax.set_ylabel("число SWAP")
ax.legend()
ax.set_title("SabreSwap: качество vs время")
plt.tight_layout()
plt.savefig("sabre_quality_vs_time.png", dpi=120)
```

## Таблица результатов (шаблон)

Заполните средние значения по 5 seed'ам:

| heuristic | trials | swap (mean) | depth (mean) | time (mean, ms) |
|-----------|--------|-------------|--------------|-----------------|
| basic | 1 |  |  |  |
| basic | 5 |  |  |  |
| lookahead | 1 |  |  |  |
| lookahead | 5 |  |  |  |
| decay | 1 |  |  |  |
| decay | 5 |  |  |  |

Ожидания (с поправкой на то, что показал прогон на Qiskit 2.6.0 для QAOA-6 на line(6)): (1) `lookahead` и `decay` на этой схеме дают практически одинаковый результат (16 SWAP при всех `trials`), а `basic` — хуже (20.2 SWAP при `trials=1`, 16.2 при `trials=20`); то есть `decay` не «обгоняет» `lookahead`, а лишь добавляет штраф за недавние обмены; (2) рост `trials` улучшает результат и снижает дисперсию **у эвристики `basic`** (на `lookahead`/`decay` в нашем прогоне он ничего не менял), но время растёт; (3) вне зависимости от параметров SabreSwap лучше greedy (16 против 22 SWAP в нашем прогоне). Проверьте, воспроизводится ли это на вашей схеме: общий принцип — насыщение `trials` даёт выигрыш там, где сама эвристика слабее.

## Осмысление: когда важны детали реализации

1. **Качество против скорости**: наш router — учебная реализация; Sabre-подобные маршрутизаторы дают меньше SWAP (а значит дешевле исполнение), но дольше считают. При маленьких схемах можно позволить себе детальные эксперименты с параметрами Sabre; при больших становится важным время компиляции, и тривиальный router может выиграть по latency (но проиграть по стоимости исполнения).
2. **Стабильность**: замена seed'ов и числа trials может заметно менять результат (в нашем прогоне сильнее всего — у эвристики `basic`: 20.2 → 16.2 SWAP); использование стандартного transpile без фиксированного seed'а даёт невоспроизводимое качество между запусками.
3. **Trade-off время/качество**: выбор между ними зависит от use case, а не от алгоритма как такового.

Если остались силы: повторите прогон части B на heavy-hex топологии (`CouplingMap.from_heavy_hex(3)` — 19 кубитов, схема раскладывается по подграфу) — та же закономерность, но больше дисперсия.

## ✅ Проверь себя

1. Почему greedy router, вставляющий SWAP вдоль BFS-пути, даёт больше SWAP, чем SabreSwap на том же layout'е?
2. Какая эвристика SabreSwap (`basic`, `lookahead`, `decay`) даёт результат с наибольшей вероятностью: минимальное число SWAP или минимальная depth?
3. Что делает параметр `trials` и почему его увеличение улучшает результат?
4. Сравните время работы вашего greedy router и SabreSwap: что дешевле и в какой ситуации это важно?
5. Почему в реальных задачах нужно фиксировать `seed_transpiler` и/или усреднять по нескольким seed'ам?

Пройдите [тест модуля 04](../../tests/04-quiz.md).

## ➡️ Что дальше

Модуль 04 завершён. Дальше по курсу — hardware-трек: [модуль 05 — Железо: платформы и устройство](../05-hardware/README.md). Повторение общей картины — в [ROADMAP.md](../../ROADMAP.md).
