---
title: "Лаба 02: первые схемы на симуляторе"
module: "02 Программирование"
difficulty: "intermediate"
duration: "~2 ч"
status: "draft"
tags: [lab, qiskit, aer]
---

# Лаба 02: первые схемы на симуляторе

## Цель

Отработать полный цикл «схема → аналитика → статистика» на трёх классических примерах, чтобы алгоритмы модуля 03 не были «кодом без интуиции».

## Шаг 0. Подготовка

Проверка окружения (из [lab-00](../00-fundamentals/lab-00-env-setup.md)):

```bash
python -c "import qiskit, qiskit_aer; print(qiskit.__version__)"
```

## Шаг 1. Bell-состояние: три взгляда на одну схему

```python
# qc: executable
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, Operator
from qiskit_aer import AerSimulator

qc = QuantumCircuit(2, 2)
qc.h(0); qc.cx(0, 1); qc.measure([0, 1], [0, 1])

plain = qc.remove_final_measurements(inplace=False)
print(Operator(plain))                       # матрица 4x4
print(Statevector.from_instruction(plain))   # (|00>+|11>)/sqrt(2)
np.testing.assert_allclose(Statevector(plain).data, [1/np.sqrt(2), 0, 0, 1/np.sqrt(2)])
counts = AerSimulator(seed_simulator=7).run(qc, shots=1024).result().get_counts()
assert set(counts) == {"00", "11"} and sum(counts.values()) == 1024
assert abs(counts["00"] / 1024 - 0.5) < 0.1
print(counts)
```

**Контроль:** все три вывода согласуются? (матрица — вектор — распределение counts).

## Шаг 2. Мини-Гровер на 2 кубитах (с 1 решением из 4)

Оракул «помечаем |11>» — это один CZ:

```python
g = QuantumCircuit(2)
g.cz(0, 1)                                   # отмечает |11> фазой -1
# диффузор: H⊗H X⊗X CZ X⊗X H⊗H
# В базисе |q1 q0>: CZ = (H⊗I) CX(0,1) (H⊗I); H действует на цель q1.
g.h([0,1]); g.x([0,1]); g.h(1); g.cx(0,1); g.h(1); g.x([0,1]); g.h([0,1])
```

Соберите полную схему: подготовка |++>, ОДНА итерация Grover, измерение. Ожидание: почти 100% на |11>.

Проверим также непалиндромную цель `|01⟩`: в записи `|q1 q0⟩` это `q0=1`, `q1=0`, поэтому X-обрамление CZ нужно на **q1**. Диффузор выше равен $I-2|++\rangle\langle++|$, то есть отличается от $2|++\rangle\langle++|-I$ только глобальным минусом.

```python
# qc: executable
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Operator, Statevector
from qiskit_aer import AerSimulator

oracle = QuantumCircuit(2)
oracle.x(1); oracle.cz(0, 1); oracle.x(1)  # только |01> получает -1
np.testing.assert_allclose(Operator(oracle).data, np.diag([1, -1, 1, 1]))
diffuser = QuantumCircuit(2)
diffuser.h([0, 1]); diffuser.x([0, 1])
diffuser.h(1); diffuser.cx(0, 1); diffuser.h(1)  # CZ через H на цели CX
diffuser.x([0, 1]); diffuser.h([0, 1])
np.testing.assert_allclose(Operator(diffuser).data, np.eye(4) - np.ones((4, 4))/2,
                           atol=1e-14)
iteration = oracle.compose(diffuser)
for repeats, expected in ((1, 1.0), (2, 0.25), (3, 0.25)):
    circuit = QuantumCircuit(2)
    circuit.h([0, 1])
    for _ in range(repeats):
        circuit.compose(iteration, inplace=True)
    assert np.isclose(Statevector(circuit).probabilities()[1], expected)
    if repeats == 1:
        circuit.measure_all()  # q0 -> c0, q1 -> c1: ключ counts равен '01'
        counts = AerSimulator(seed_simulator=7).run(circuit, shots=128).result().get_counts()
        assert counts == {"01": 128}
```

**Упражнение.** Прогоните 2 и 3 итерации Grover (повторите блок `g` целиком 2 и 3 раза) — вероятность целевого состояния **падает с 100 % до 25 %** (прошли дальше оптимума), и на третьей итерации остаётся 25 %: амплитуды осциллируют, лишний шаг не «докручивает» результат. Здесь $P_k=\sin^2((2k+1)\theta)$, $\sin^2\theta=1/4$. Один случай $N=4$ показывает осцилляции; масштабирование $O(\sqrt N)$ следует из этой формулы для одного решения при растущем $N$.

## Шаг 3. Эквивалентность операций

Проверьте, что SWAP эквивалентен трём CNOT:

```python
# qc: executable
from qiskit import QuantumCircuit
from qiskit.quantum_info import Operator
swap = QuantumCircuit(2); swap.swap(0, 1)
c3   = QuantumCircuit(2); c3.cx(0,1); c3.cx(1,0); c3.cx(0,1)
assert Operator(swap).equiv(Operator(c3))
```

## Шаг 4. Отчёт

- Таблица: схема | count_ops | depth | ожидание vs counts.
- Короткий вывод: где аналитика достаточна, где нужна статистика.

## Критерии приёмки

- [ ] Bell-состояние подтверждено тремя методами.
- [ ] Мини-Гровер: 1 итерация даёт ~100% на |11>, 2 и 3 итерации — падение до 25%.
- [ ] Эквивалентность SWAP/CNOTx3 показана.
- [ ] Отчёт с таблицей сохранён.

## ✅ Проверь себя

1. Зачем `remove_final_measurements(inplace=False)` перед `Operator(...)`? Что мешает построить матрицу на схеме с измерениями?
2. Как через `Operator(swap)` проверить эквивалентность трём CNOT? Чем `equiv` отличается от `==`?
3. Почему одна итерация мини-Гровера даёт почти 100% на |11⟩, а две — уже нет? Какая формула описывает вероятность успеха после k итераций?
4. Что изменится в counts, если убрать измерение одного из кубитов?

## ➡️ Что дальше

[lab-03-ibm-quantum-run.md](lab-03-ibm-quantum-run.md) — тот же Bell на реальном QPU.
Тест модуля: [../../tests/02-quiz.md](../../tests/02-quiz.md).
