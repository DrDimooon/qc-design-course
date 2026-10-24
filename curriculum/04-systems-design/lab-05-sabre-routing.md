---
title: "Лаба 05: свой жадный router и параметры SabreSwap"
module: "04 Проектирование систем"
difficulty: "advanced"
duration: "~2 ч"
status: "draft"
tags: [sabre-swap, routing, heuristic-decay, trials, benchmark, greedy-router]
---

# Лаба 05: свой жадный router и параметры SabreSwap

Практика по уроку 03: (A) строим жадный router и проверяем семантику, (B) сравниваем параметры SabreSwap. Выполняйте Python-блоки последовательно в одном namespace. Первый блок самодостаточен; остальные используют его определения. Проверено на Qiskit 2.6.0.

## Часть A. Свой жадный router

Для каждой 2q-операции находим BFS-путь и сдвигаем первый операнд вставленными SWAP, пока операнды не станут соседями. Предполагаем **симметричный** coupling: проверяем смежность, но не исправляем направленность CX и не синтезируем гейты в basis устройства.

`greedy_route(qc, cm) -> (routed, swap_count, phys)`: `phys[logical]` — конечная физическая позиция, `swap_count` считает только **вставленные** SWAP. Логический SWAP из исходной схемы исполняется как гейт и не меняет карту позиций. При более широком устройстве начальное размещение — первые `qc.num_qubits` позиций, остальные провода имеют тождественную эволюцию до маршрутизации (для запуска обычно ancilla в |0⟩). Для унитарных схем контракт: `U_routed = P @ (I_extra ⊗ U_original)` в little-endian порядке Qiskit; `P` включает также перемещение дополнительных проводов. Возвращаемая карта описывает только логические кубиты.

```python
# qc: executable
from collections import deque
import numpy as np
from qiskit import QuantumCircuit
from qiskit.circuit import ControlFlowOp
from qiskit.quantum_info import Operator
from qiskit.primitives import StatevectorSampler
from qiskit.transpiler import CouplingMap, PassManager
from qiskit.transpiler.passes import TrivialLayout, SabreSwap

def bfs_path(cm, src, dst):
    parent, queue = {src: None}, deque([src])
    while queue:
        node = queue.popleft()
        if node == dst:
            path = []
            while node is not None:
                path.append(node)
                node = parent[node]
            return path[::-1]
        for nxt in sorted(cm.neighbors(node)):
            if nxt not in parent:
                parent[nxt] = node
                queue.append(nxt)
    raise ValueError(f"No coupling path between {src} and {dst}")

def greedy_route(qc, cm):
    """Return (physical circuit, inserted SWAP count, logical->physical list)."""
    if cm.size() < qc.num_qubits:
        raise ValueError("CouplingMap has too few qubits")
    if not cm.is_symmetric:
        raise ValueError("A symmetric CouplingMap is required")
    routed = QuantumCircuit(cm.size())
    for creg in qc.cregs:
        routed.add_register(creg)
    loose = [bit for bit in qc.clbits if bit not in routed.clbits]
    routed.add_bits(loose)
    cmap = {bit: bit for bit in qc.clbits}  # те же объекты, не порядок регистров
    routed.global_phase = qc.global_phase
    pos, swap_count = list(range(qc.num_qubits)), 0
    for inst in qc.data:
        op = inst.operation
        if isinstance(op, ControlFlowOp) or getattr(op, "condition", None) is not None:
            raise ValueError("Conditions and control flow are unsupported")
        if op.name not in ("barrier", "delay", "measure") and op.num_qubits not in (1, 2):
            raise ValueError(f"Unsupported operation: {op.name} ({op.num_qubits}q)")
        if inst.clbits and op.name != "measure":
            raise ValueError("Only measurement may have classical operands")
        logical = [qc.find_bit(bit).index for bit in inst.qubits]
        physical = [pos[q] for q in logical]
        if op.name not in ("barrier", "delay", "measure") and op.num_qubits == 2:
            path = bfs_path(cm, *physical)
            for a, b in zip(path[:-2], path[1:-1]):
                routed.swap(a, b)
                pos = [b if p == a else a if p == b else p for p in pos]
                swap_count += 1
            physical = [pos[q] for q in logical]
        routed.append(op, physical, [cmap[bit] for bit in inst.clbits])
    return routed, swap_count, pos

def assert_unitary_routing(qc, cm):
    """Small same-width unitary test; explicit final-permutation matrix."""
    assert qc.num_qubits == cm.size() <= 4
    routed, swaps, phys = greedy_route(qc, cm)
    n = qc.num_qubits
    P = np.zeros((2**n, 2**n), dtype=complex)
    for x in range(2**n):
        y = sum(((x >> q) & 1) << phys[q] for q in range(n))
        P[y, x] = 1
    np.testing.assert_allclose(Operator(routed).data,
                               P @ Operator(qc).data, atol=1e-12, rtol=0)
    edges = set(cm.get_edges())
    assert all(tuple(routed.find_bit(q).index for q in inst.qubits) in edges
               for inst in routed.data if inst.operation.num_qubits == 2)
    return routed, swaps, phys

line4 = CouplingMap.from_line(4)
unitary = QuantumCircuit(4, global_phase=0.37)
unitary.h(0)
unitary.ry(0.41, 3)
unitary.cx(0, 3)
unitary.swap(0, 2)  # исходный SWAP не должен менять pos
unitary.cz(1, 3)
unitary.rx(-0.23, 0)
assert_unitary_routing(unitary, line4)
logical_swap = QuantumCircuit(2)
logical_swap.swap(0, 1)
_, inserted, phys = assert_unitary_routing(logical_swap, CouplingMap.from_line(2))
assert inserted == 0 and phys == [0, 1]

# Несколько классических регистров, нестандартный порядок измерений,
# barrier и delay; проверяем биты результата, а не только число операций.
from qiskit.circuit import ClassicalRegister, Clbit
a, b = ClassicalRegister(1, "a"), ClassicalRegister(2, "b")
measured = QuantumCircuit(3)
measured.add_register(a, b)
measured.x(0)
measured.cx(0, 2)
measured.barrier()
measured.delay(8, 2, unit="dt")
measured.measure(2, a[0])
measured.measure(1, b[0])
measured.measure(0, b[1])
routed, inserted, phys = greedy_route(measured, CouplingMap.from_line(3))
assert inserted == 1 and phys == [1, 0, 2]
result = StatevectorSampler(seed=7).run([routed.decompose()], shots=32).result()[0]
assert result.data.a.get_counts() == {"1": 32}
assert result.data.b.get_counts() == {"10": 32}
loose = QuantumCircuit(1)
bit = Clbit()
loose.add_bits([bit])
loose.add_register(ClassicalRegister(1, "later"))
loose.measure(0, bit)
out, _, _ = greedy_route(loose, CouplingMap.from_line(1))
assert out.data[0].clbits == (bit,)

def expect_value_error(qc, cm):
    try:
        greedy_route(qc, cm)
    except ValueError:
        return
    raise AssertionError("Expected ValueError")

expect_value_error(unitary, CouplingMap.from_line(3))
expect_value_error(logical_swap, CouplingMap([[0, 1]]))
disconnected = CouplingMap([[0, 1], [1, 0]])
disconnected.add_physical_qubit(2)
far = QuantumCircuit(3)
far.cx(0, 2)
expect_value_error(far, disconnected)
threeq = QuantumCircuit(3)
threeq.ccx(0, 1, 2)
expect_value_error(threeq, CouplingMap.from_line(3))
conditional = QuantumCircuit(1, 1)
with conditional.if_test((conditional.clbits[0], True)):
    conditional.x(0)
expect_value_error(conditional, CouplingMap.from_line(1))
print("greedy_route: unitary, measurement and validation checks passed")
```

В тесте `P[y, x] = 1` переносит бит логического провода `q` на `phys[q]`. Поэтому нельзя напрямую сравнивать две матрицы без `P`, даже если обе схемы правильны. Тест ограничен одинаковой шириной ≤4; он сравнивает матрицы, включая global phase, а не только вероятности или число SWAP. Измерения проверены отдельно после декомпозиции SWAP.

## Сравнение с SabreSwap

Явно создадим детерминированную QAOA-6 схему: два слоя, фиксированные углы и граф. Начальное размещение для обоих routers — тождественное.

```python
from time import perf_counter

edges = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 0), (0, 3), (1, 4)]
def build_qaoa(num_qubits, edges, gamma, beta):
    qc = QuantumCircuit(num_qubits)
    qc.h(range(num_qubits))
    for _ in range(2):
        for a, b in edges:
            qc.cx(a, b)
            qc.rz(2 * gamma, b)
            qc.cx(a, b)
        qc.rx(2 * beta, range(num_qubits))
    qc.measure_all()
    return qc

line = CouplingMap.from_line(6)
qc = build_qaoa(6, edges, gamma=0.6, beta=0.35)

def run_sabre(qc, cm, heuristic, trials, seed):
    pm = PassManager([TrivialLayout(cm),
                      SabreSwap(cm, heuristic=heuristic, trials=trials, seed=seed)])
    t0 = perf_counter()
    out = pm.run(qc)
    dt = perf_counter() - t0
    return {"swap": out.count_ops().get("swap", 0), "depth": out.depth(), "time": dt}

# Прогрев обоих путей вне измерений.
greedy_route(qc, line)
run_sabre(qc, line, "basic", trials=1, seed=42)
t0 = perf_counter()
routed, swap_count, phys = greedy_route(qc, line)
t_greedy = perf_counter() - t0
print("greedy:", swap_count, "SWAP; depth", routed.depth(), "; seconds", t_greedy)
print("sabre:", run_sabre(qc, line, "basic", trials=1, seed=42))
```

Это время вызова router/PassManager, без построения входной схемы и без синтеза в аппаратный basis; накладные расходы различаются. Один замер — иллюстрация, не устойчивый latency benchmark. Для выводов повторите измерения, чередуя порядок routers. Число SWAP не включает стоимость последующей декомпозиции.

## Часть B. Параметры SabreSwap

- `heuristic`: `basic` (front layer), `lookahead` (front + extended layer), `decay` (lookahead со штрафом за недавнее использование кубитов).
- `trials`: число попыток маршрутизации, из которых выбирается результат по числу SWAP; задавайте явно, иначе default зависит от доступных CPU.
- `seed`: воспроизводимость случайных решений при фиксированных версии и конфигурации.

`trials` существовал уже до Qiskit 2.0. `swap_trials` и `layout_trials` — параметры **SabreLayout**, а не прежние имена `SabreSwap.trials`. `routing_method` выбирает алгоритм маршрутизации на уровне transpile/preset pipeline; это не прежнее имя `heuristic`.

Прогон: **3 эвристики × 3 значения trials × 5 seeds = 45 запусков**, 9 агрегированных строк. Прогреваем каждую конфигурацию вне выборки. Используем одинаковые seeds для всех конфигураций (paired seeds), чтобы сравнивать результаты попарно; это не гарантирует одинаковые внутренние случайные траектории. Для строгого timing-эксперимента повторите сетку с перемешанным порядком и укажите CPU, версию и параллелизм.

```python
import statistics

heuristics, trial_values = ("basic", "lookahead", "decay"), (1, 5, 20)
for heuristic in heuristics:
    for trials in trial_values:
        run_sabre(qc, line, heuristic, trials, seed=99)  # warmup
rows = []
for seed in range(5):
    for heuristic in heuristics:
        for trials in trial_values:
            m = run_sabre(qc, line, heuristic, trials, seed)
            rows.append(dict(m, heuristic=heuristic, trials=trials, seed=seed))

summary = []
for heuristic in heuristics:
    for trials in trial_values:
        subset = [r for r in rows
                  if r["heuristic"] == heuristic and r["trials"] == trials]
        means = {key: statistics.mean(r[key] for r in subset)
                 for key in ("swap", "depth", "time")}
        summary.append(dict(means, heuristic=heuristic, trials=trials))
        print(heuristic, trials, means)
```

```python
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(6, 4))
for heuristic in heuristics:
    subset = [r for r in summary if r["heuristic"] == heuristic]
    ax.plot([r["time"] * 1000 for r in subset], [r["swap"] for r in subset],
            marker="o", label=heuristic)
ax.set(xlabel="время (мс)", ylabel="число SWAP", title="SabreSwap: качество vs время")
ax.legend()
fig.tight_layout()
plt.show()
```

## Таблица результатов (шаблон)

Заполните средние по пяти seeds; сохраните также отдельные строки для оценки разброса.

| heuristic | trials | swap (mean) | depth (mean) | time (mean, ms) |
|-----------|--------|-------------|--------------|-----------------|
| basic | 1 | | | |
| basic | 5 | | | |
| basic | 20 | | | |
| lookahead | 1 | | | |
| lookahead | 5 | | | |
| lookahead | 20 | | | |
| decay | 1 | | | |
| decay | 5 | | | |
| decay | 20 | | | |

Историческая иллюстрация для QAOA-6, line(6), тождественного начального layout и пяти seeds на Qiskit 2.6.0: greedy — 22 вставленных SWAP; `lookahead`/`decay` — 16; у `basic` средние 20.2 при trials=1 и 16.2 при trials=20. Это ориентир прежнего прогона, не ожидаемые ответы текущего эксперимента: детали конфигурации и протокол времени должны быть записаны отдельно. SABRE не обязан превосходить greedy на каждой схеме; больше trials не гарантирует строгое улучшение, меньшую depth или монотонное время. Даже при сохранении лучшей попытки число SWAP может остаться прежним.

## Осмысление: когда важны детали реализации

Сопоставьте стоимость маршрутизации и исполнения, разброс по seeds и влияние эвристики. Не выводите превосходство алгоритма из одной схемы или одного замера. Фиксированный seed помогает повторить конкретный запуск, несколько seeds помогают оценить устойчивость.

Дополнение: `CouplingMap.from_heavy_hex(3)` имеет 19 кубитов. Нельзя передавать 6-кубитную схему прямо в bare `SabreSwap` для этого устройства: сначала нужны полный физический регистр и layout. Используйте preset pipeline, который выполняет embedding, например:

```python
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager

heavy = CouplingMap.from_heavy_hex(3)
pm = generate_preset_pass_manager(optimization_level=1, coupling_map=heavy,
                                 routing_method="sabre", seed_transpiler=42)
heavy_out = pm.run(qc)
print(heavy_out.num_qubits, heavy_out.depth())
```

Здесь pipeline также выбирает layout и выполняет другие проходы: это отдельный эксперимент, а не изолированное сравнение `SabreSwap.trials`. Для такого сравнения подготовьте 19-кубитную схему через allocation/enlargement и `ApplyLayout`, затем используйте один фиксированный layout для всех запусков.

## ✅ Проверь себя

1. Зачем возвращать `phys` и учитывать `P` при сравнении унитарных матриц?
2. Почему вставленный и исходный логический SWAP по-разному влияют на карту?
3. Может ли меньшее число SWAP сопровождаться большей depth?
4. Что выбирает `trials`, и почему улучшение не обязано быть строгим?
5. Какие параметры и условия нужны для воспроизводимого сравнения качества и времени?

Пройдите [тест модуля 04](../../tests/04-quiz.md).

## ➡️ Что дальше

Модуль 04 завершён. Дальше — [модуль 05 — Железо: платформы и устройство](../05-hardware/README.md). Общая картина — [ROADMAP.md](../../ROADMAP.md).
