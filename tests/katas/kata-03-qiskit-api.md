---
title: "Kata 03: API Qiskit на практике"
module: "Каты"
difficulty: "intermediate"
duration: "~60 мин"
status: "draft"
tags: [kata, qiskit, operator, statevector, parameter, measurements]
---

# Kata 03: API Qiskit на практике

Серия упражнений по принципу кат: не викторина, а мини-задачи на аккуратное владение
ядром API — `QuantumCircuit`, `Operator`, `Statevector`, `Parameter` и измерения.
Ориентир сложности — материалы Qiskit Developer certification, но формат — практика
с самопроверкой.

Понадобится:

```python
import numpy as np
from qiskit import QuantumCircuit
from qiskit.circuit import Parameter, ParameterVector
from qiskit.quantum_info import Statevector, Operator
from qiskit_aer import AerSimulator
```

Разборы и полные решения: [tests/answers/kata-03.md](../answers/kata-03.md) — не открывайте до попытки.

## Задача 3.1. `Operator.equiv`: эквивалентность операций

**Цель:** показать, что SWAP эквивалентен трём CNOT (каноническое тождество из lab-02,
шаг 3), а `cx(0, 1)` и `cx(1, 0)` — нет. Разница: `equiv` сравнивает унитарности
с точностью до глобальной фазы, а точное равенство матриц это фазу игнорировать не может.

```python
swap = QuantumCircuit(2)
swap.swap(0, 1)

three_cnot = QuantumCircuit(2)
# TODO: cx(0, 1); cx(1, 0); cx(0, 1)

c01 = QuantumCircuit(2)
c01.cx(0, 1)
```

Самопроверка:

```python
assert Operator(three_cnot).equiv(Operator(swap))
assert not Operator(c01).equiv(Operator(swap))
print("3.1 OK")
```

<details markdown="1"><summary>Подсказка к 3.1</summary>
Разложение SWAP: CNOT чередует направление управления: (0→1), (1→0), (0→1).
C(1, 0) отличается от C(0, 1) тем, к какому кубиту применяется «мишень».
</details>

## Задача 3.2. `Statevector`: вероятности и амплитуды

**Цель:** построить Bell-схему и научиться читать `Statevector` тремя способами:
`probabilities()` (массив целочисленных индексов, little-endian), `probabilities_dict()`
(строковые ключи) и амплитуды через `data`. Обратите внимание: вероятности «не видят»
общую фазу и знаки, амплитуды — видят.

```python
bell = QuantumCircuit(2)
# TODO: h(0); cx(0, 1)
```

Самопроверка:

```python
sv = Statevector.from_instruction(bell)
assert np.allclose(sv.probabilities(), [0.5, 0, 0, 0.5])
assert set(sv.probabilities_dict()) == {"00", "11"}
assert np.allclose(sv.data, [1 / np.sqrt(2), 0, 0, 1 / np.sqrt(2)])
print("3.2 OK")
```

<details markdown="1"><summary>Подсказка к 3.2</summary>
`probabilities()` индексируется целым числом базисного состояния в little-endian;
ключ в `probabilities_dict()` — строка «b(n-1)...b(0)», самый правый бит — q0.
</details>

<details markdown="1"><summary>Подсказка к 3.2 (вторая)</summary>
Попробуйте также сравнить Statevector(bell) и Statevector.from_instruction(bell) —
в Qiskit 1.x оба способа дают одинаковый результат.
</details>

## Задача 3.3. `Parameter` и параметризованные схемы

**Цель:** собрать параметризованную схему, проверить `num_parameters`, затем получить
две конкретные схемы через `assign_parameters` и убедиться, что их состояния различаются.

```python
theta = Parameter("theta")
qc = QuantumCircuit(2)
# TODO: h(0); ry(theta, 1); cx(1, 0) — связная, параметризованная схема
```

Самопроверка:

```python
assert qc.num_parameters == 1

qc_a = qc.assign_parameters([np.pi / 4])    # θ = π/4
qc_b = qc.assign_parameters([np.pi / 2])    # θ = π/2

va = Statevector.from_instruction(qc_a)
vb = Statevector.from_instruction(qc_b)
assert not np.allclose(va, vb)
assert qc_a.num_parameters == 0             # параметры привязаны
print("3.3 OK")
```

<details markdown="1"><summary>Подсказка к 3.3</summary>
`assign_parameters` возвращает новую привязанную схему, оригинал не изменяет.
Альтернатива: qc.assign_parameters({theta: value}) — то же через словарь.
</details>

<details markdown="1"><summary>Подсказка к 3.3 (вторая)</summary>
Для большего числа параметров заведите ParameterVector("thetas", 2) и обратитесь
к элементам через thetas[0], thetas[1].
</details>

## Задача 3.4. Измерения: `measure` против `measure_all`

**Цель:** сравнить два способа добавления измерений и понять, как они отражаются в
ключах counts. `measure(qubits, clbits)` привязывает конкретные кубиты к конкретным
битам; `measure_all()` создаёт регистр `meas`, добавляет барьер и мапит все кубиты
в новые классические биты. Учтите: `measure` требует, чтобы в схеме уже был
классический регистр, — поэтому для «частичного» замера мы сразу заводим один
классический бит: `QuantumCircuit(3, 1)`.

```python
partial = QuantumCircuit(3, 1)
partial.h(0)
# TODO: замерить ТОЛЬКО кубит 0 (measure([0], [0]))
```

Самопроверка:

```python
counts_partial = AerSimulator().run(partial, shots=1000).result().get_counts()
# в counts попал только замеренный бит: строки длиной 1
assert all(len(k) == 1 for k in counts_partial)
assert set(counts_partial) <= {"0", "1"}

full = QuantumCircuit(3)
full.h(0)
# TODO: measure_all()
```

Самопроверка:

```python
counts_full = AerSimulator().run(full, shots=1000).result().get_counts()
# замерены все 3 кубита: строки длиной 3, читаются «c2 c1 c0»
assert all(len(k) == 3 for k in counts_full)
assert set(counts_full) <= {"000", "001"}
print("3.4 OK")
```

<details markdown="1"><summary>Подсказка к 3.4</summary>
Длина ключа counts равна числу классических бит в схеме; ключ читается «c2 c1 c0».
Замерен только кубит 0, поэтому возможные ключи — «000» и «001» (правый бит — c0).
</details>

## Задача 3.5. `Operator` и кастомный унитарный гейт

**Цель:** построить матрицу составного гейта XX (тензорное произведение двух X) и
вставить её в схему через `qc.unitary(...)`. Проверить эффект: XX|00⟩ = |11⟩.

```python
xx = Operator.from_label("XX")           # X ⊗ X
qc = QuantumCircuit(2)
# TODO: примените xx на пару кубитов (0, 1), затем найдите итоговый Statevector
```

Самопроверка:

```python
sv = Statevector.from_instruction(qc)
assert np.allclose(sv.data, [0, 0, 0, 1])       # |11>
print("3.5 OK")
```

<details markdown="1"><summary>Подсказка к 3.5</summary>
X|0⟩ = |1⟩, поэтому XX|00⟩ = |11⟩. Operator.from_label собирает тензорное произведение
однокубитных меток ("X", "Y", "Z", "I").
</details>

## Задача 3.6. Алгебра операций: `inverse`, `decompose`

**Цель:** продемонстрировать алгебру схем: двойной `inverse()` возвращает схему
к исходной (сравниваем с унитарностью исходной схемы), а `decompose()` раскрывает
составные инструкции — то, с чего транспилятор начинает при unrolling.

```python
gates = QuantumCircuit(2)
gates.h(0)
gates.cx(0, 1)
gates.rz(0.3, 1)

twice_inverse = gates.inverse().inverse()
decomposed = gates.decompose()
```

Самопроверка:

```python
assert Operator(twice_inverse).equiv(Operator(gates))   # двойной inverse = исходная схема
assert decomposed.count_ops().get("cx", 0) == 1
print("3.6 OK")
```

<details markdown="1"><summary>Подсказка к 3.6</summary>
`inverse()` строит адъюнктную схему: обратные гейты в обратном порядке. Двойной
inverse возвращается к исходной схеме (сравнение через equiv, потому что
глобальная фаза может отличаться). С тождественной операцией его сравнивать
нельзя: `gates.inverse().inverse()` — это сама `gates`, а не `I`.
</details>

## ➡️ Что дальше

[Kata 04 — transpile](kata-04-transpile-tuning.md): практика уже с транспилятором.
Теория: [02-gates-circuits-qiskit](../../curriculum/02-programming/02-gates-circuits-qiskit.md),
[03-transpilation-hardware](../../curriculum/02-programming/03-transpilation-hardware.md).
Проверить понимание — [02-quiz](../02-quiz.md).
