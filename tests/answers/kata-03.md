---
title: "Ответы: Kata 03 (API Qiskit на практике)"
module: "Каты"
difficulty: "intermediate"
duration: "~10 мин"
status: "draft"
tags: [answers, kata, qiskit, operator, statevector, parameter]
---

# Ответы: Kata 03

Полные решения к [tests/katas/kata-03-qiskit-api.md](../katas/kata-03-qiskit-api.md). Читайте только после попытки.

## 3.1. `Operator.equiv`

```python
swap = QuantumCircuit(2)
swap.swap(0, 1)

three_cnot = QuantumCircuit(2)
three_cnot.cx(0, 1)
three_cnot.cx(1, 0)
three_cnot.cx(0, 1)

c01 = QuantumCircuit(2)
c01.cx(0, 1)

assert Operator(three_cnot).equiv(Operator(swap))
assert not Operator(c01).equiv(Operator(swap))
```

Пояснение: разложение SWAP — три чередующихся CNOT (0→1, 1→0, 0→1). `equiv`
сравнивает унитарные матрицы с точностью до глобальной фазы; отдельный CNOT это
другая унитарность, и дело не в фазе — SWAP переставляет кубиты, CNOT — нет.

## 3.2. `Statevector`

```python
bell = QuantumCircuit(2)
bell.h(0); bell.cx(0, 1)

sv = Statevector.from_instruction(bell)
assert np.allclose(sv.probabilities(), [0.5, 0, 0, 0.5])
assert set(sv.probabilities_dict()) == {"00", "11"}
assert np.allclose(sv.data, [1 / np.sqrt(2), 0, 0, 1 / np.sqrt(2)])
```

Пояснение: `probabilities()` — массив по целым индексам базисных состояний
(little-endian), `probabilities_dict()` — словарь со строковыми ключами, `data` —
амплитуды. Вероятности не видят фазу и общий знак, амплитуды — видят.

## 3.3. `Parameter`

```python
theta = Parameter("theta")
qc = QuantumCircuit(2)
qc.h(0)
qc.ry(theta, 1)
qc.cx(1, 0)

assert qc.num_parameters == 1

qc_a = qc.assign_parameters([np.pi / 4])
qc_b = qc.assign_parameters([np.pi / 2])

va = Statevector.from_instruction(qc_a)
vb = Statevector.from_instruction(qc_b)
assert not np.allclose(va, vb)
assert qc_a.num_parameters == 0
```

Пояснение: `assign_parameters` возвращает новую привязанную схему, оригинал не
меняется. Вместо списка можно передать словарь `{theta: value}` — так надёжнее,
если параметров несколько. Для многих однотипных параметров удобен `ParameterVector`.

## 3.4. `measure` против `measure_all`

```python
partial = QuantumCircuit(3, 1)
partial.h(0)
partial.measure([0], [0])

counts_partial = AerSimulator().run(partial, shots=1000).result().get_counts()
assert all(len(k) == 1 for k in counts_partial)
assert set(counts_partial) <= {"0", "1"}

full = QuantumCircuit(3)
full.h(0)
full.measure_all()

counts_full = AerSimulator().run(full, shots=1000).result().get_counts()
assert all(len(k) == 3 for k in counts_full)
assert set(counts_full) <= {"000", "001"}
```

Пояснение: `measure` замеряет только указанную пару (кубит, бит), поэтому в counts
попадает строка длиной 1 — но для этого в схеме должен быть классический регистр
(`QuantumCircuit(3, 1)`), иначе `measure` бросает `CircuitError`. `measure_all`
создаёт регистр `meas` и замеряет все кубиты — строки длиной 3; кубиты 1 и 2
постоянно в |0⟩, значит возможные ключи — «000» и «001» (правый бит — результат
измерения q0).

## 3.5. Кастомный унитарный гейт

```python
xx = Operator.from_label("XX")

qc = QuantumCircuit(2)
qc.unitary(xx, [0, 1])

sv = Statevector.from_instruction(qc)
assert np.allclose(sv.data, [0, 0, 0, 1])       # |11>
```

Пояснение: X|0⟩ = |1⟩, поэтому XX|00⟩ = |11⟩. `from_label("XX")` собирает тензорное
произведение X ⊗ X; `qc.unitary(...)` вставляет произвольную унитарность в схему —
эти гейты потом транспилятор «раскладывает» в нативный базис (см. kata-04).

## 3.6. `inverse` и `decompose`

```python
gates = QuantumCircuit(2)
gates.h(0)
gates.cx(0, 1)
gates.rz(0.3, 1)

twice_inverse = gates.inverse().inverse()
assert Operator(twice_inverse).equiv(Operator(gates))

decomposed = gates.decompose()
assert decomposed.count_ops().get("cx", 0) == 1
```

Пояснение: `inverse()` строит схему из обратных гейтов в обратном порядке; двойной
inverse возвращает исходную схему (проверяем через `equiv` с `Operator(gates)`,
потому что глобальная фаза может отличаться). С тождественной операцией сравнивать
нельзя: `gates.inverse().inverse()` — это сама `gates`, а не `I`.
`decompose()` раскрывает высокоуровневые
инструкции в более примитивные — это первый шаг работы транспилятора при unrolling.
