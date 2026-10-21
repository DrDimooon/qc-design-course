---
title: "Kata 01: состояния Белла, GHZ и телепортация"
module: "Каты"
difficulty: "beginner"
duration: "~45 мин"
status: "draft"
tags: [kata, bell, ghz, teleportation, entanglement, qiskit]
---

# Kata 01: состояния Белла, GHZ и телепортация

Серия упражнений по принципу кат: собираем запутанные состояния руками и сразу проверяем себя.
Задачи идут от одной строки кода к полноценному протоколу телепортации.

Понадобится:

```python
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, Operator
from qiskit_aer import AerSimulator
```

Разборы и полные решения: [tests/answers/kata-01.md](../answers/kata-01.md) — не открывайте до попытки.

## Задача 1.1. Состояние Белла Φ⁺

**Цель:** собрать Φ⁺ = (|00⟩ + |11⟩)/√2 из |00⟩.

```python
bell = QuantumCircuit(2)
# TODO: допишите гейты
```

Самопроверка:

```python
sv = Statevector.from_instruction(bell)
p = sv.probabilities_dict()
assert abs(p.get("00", 0) - 0.5) < 1e-9
assert abs(p.get("11", 0) - 0.5) < 1e-9
assert len(p) == 2
print("1.1 OK")
```

<details markdown="1"><summary>Подсказка к 1.1</summary>
h на нулевом кубите создаёт суперпозицию |+⟩|0⟩, затем cx(0, 1) делает второй кубит
равным первому в вычислительном базисе: |0⟩|0⟩ + |1⟩|1⟩.
</details>

<details markdown="1"><summary>Подсказка к 1.1 (вторая)</summary>
Ровно два гейта: qc.h(0); qc.cx(0, 1).
</details>

## Задача 1.2. Остальные три состояния Белла

**Цель:** из готового Φ⁺ получить Ψ⁺, Φ⁻ и Ψ⁻, добавляя к схеме только однокубитные гейты
(новый CNOT не требуется). Каждый результат проверьте против «референсной» схемы,
собранной с нуля, через `Operator.equiv` — это сравнение унитарностей, оно не зависит
от глобальной фазы.

```python
phi_plus = QuantumCircuit(2)
phi_plus.h(0); phi_plus.cx(0, 1)

# референсные схемы, собранные с нуля
ref_psi_plus = QuantumCircuit(2)     # x(1), h(0), cx(0, 1)
# TODO
ref_phi_minus = QuantumCircuit(2)    # h(0), cx(0, 1), z(0)
# TODO
ref_psi_minus = QuantumCircuit(2)    # x(1), h(0), cx(0, 1), z(1)
# TODO

# кандидаты: phi_plus плюс минимальная добавка
psi_plus = phi_plus.copy()
phi_minus = phi_plus.copy()
psi_minus = phi_plus.copy()
# TODO: psi_plus.x(1);  phi_minus.z(0);  psi_minus.z(1) и потом x(1)
```

Самопроверка:

```python
assert Operator(psi_plus).equiv(Operator(ref_psi_plus))
assert Operator(phi_minus).equiv(Operator(ref_phi_minus))
assert Operator(psi_minus).equiv(Operator(ref_psi_minus))
print("1.2 OK")
```

Дополнительная проверка амплитуд (фазы не видны в вероятностях):

```python
sv = Statevector.from_instruction(phi_minus)
assert np.allclose(sv.data, [1 / np.sqrt(2), 0, 0, -1 / np.sqrt(2)])
sv = Statevector.from_instruction(psi_minus)
assert np.allclose(sv.data, [0, -1 / np.sqrt(2), 1 / np.sqrt(2), 0])
```

<details markdown="1"><summary>Подсказка к 1.2</summary>
Обмен базисных состояний — это X: x(1) превращает Φ⁺ в Ψ⁺ (обмениваются |00⟩ ↔ |10⟩
и |11⟩ ↔ |01⟩ по кубиту 1). Фазовый минус — это Z: z(0) превращает Φ⁺ в Φ⁻.
Комбинация — Ψ⁻: например, z(1), затем x(1).
</details>

Полный разбор — в [answers/kata-01.md](../answers/kata-01.md), раздел 1.2.

## Задача 1.3. GHZ-состояние

**Цель:** собрать GHZ = (|000⟩ + |111⟩)/√2 на трёх кубитах.

```python
ghz = QuantumCircuit(3)
# TODO: допишите гейты
```

Самопроверка (аналитический вид и статистика):

```python
sv = Statevector.from_instruction(ghz)
assert np.allclose(sv.probabilities(), [0.5, 0, 0, 0, 0, 0, 0, 0.5])

qc = ghz.copy(); qc.measure_all()
counts = AerSimulator().run(qc, shots=2000).result().get_counts()
assert set(counts) <= {"000", "111"}
print("1.3 OK")
```

Бонус: GHZ не факторизуется ни в какое произведение кубитов. Размотайте схему
обратными гейтами в обратном порядке — и получите |000⟩: для «хребта»
(ghz.h(0); ghz.cx(0, 1); ghz.cx(0, 2)) это cx(0, 2), затем cx(0, 1), затем h(0);
для «каскада» (ghz.h(0); ghz.cx(0, 1); ghz.cx(1, 2)) — cx(1, 2), затем cx(0, 1),
затем h(0). GHZ — общее суперпозиционное состояние, а не три независимых кубита.

<details markdown="1"><summary>Подсказка к 1.3</summary>
Сначала h(0) — суперпозиция на нулевом кубите, затем два каскадных cx:
cx(0, 1) и cx(1, 2).
</details>

<details markdown="1"><summary>Подсказка к 1.3 (вторая)</summary>
Вариант «хребет»: ghz.h(0); ghz.cx(0, 1); ghz.cx(0, 2) даёт ту же матрицу (проверьте Operator equiv).
</details>

Полный разбор — в [answers/kata-01.md](../answers/kata-01.md), раздел 1.3.

## Задача 1.4. Телепортация состояния

**Цель:** классический протокол — телепортируем состояние |1⟩ (подготовим x(0)) с кубита 0
на кубит 2 через Белл-пару и два классических бита. Коррекции применяем конструкцией
`if_test` — современным API динамических схем (устаревший `c_if` не используем).
Схема: `QuantumCircuit(3, 3)`, кубиты 0/1/2, классические биты c0/c1/c2.

```python
tp = QuantumCircuit(3, 3)
tp.x(0)                      # телепортируем |1>

# TODO 1: Белл-пара между кубитами 1 и 2: h(1), cx(1, 2)

# TODO 2: Белл-измерение пары (0, 1): cx(0, 1), h(0), затем
#         measure(0, 0) и measure(1, 1)

# TODO 3: коррекции на кубите 2: if c[1] == 1 -> x(2); if c[0] == 1 -> z(2)

# TODO 4: measure(2, 2) — результат телепортации
```

Самопроверка:

```python
counts = AerSimulator().run(tp, shots=1000).result().get_counts()
# строка counts — три классических бита «c2 c1 c0» (little-endian):
# левый символ — телепортированный бит,
# остальные два — результат Белл-измерения (случайный)
assert all(k.startswith("1") for k in counts), counts
assert len(counts) == 4                # c0 и c1 принимают все 4 комбинации
print("1.4 OK")
```

Бонус (необязательный): телепортируйте ry(π/3)|0⟩ и проверьте маргинал по
телепортированному биту: P(c2=0) = cos²(π/6) ≈ 0.75 (то есть P(c2=1) =
sin²(π/6) ≈ 0.25).

<details markdown="1"><summary>Подсказка к 1.4</summary>
После Белл-измерения на кубите 2 появляется исходное состояние с одной из четырёх ошибок:
I, X, Z или XZ. Бит c1 (результат измерения кубита 1) отвечает за X-поправку,
бит c0 — за Z-поправку. Порядок: сначала X (по c1), затем Z (по c0).
</details>

<details markdown="1"><summary>Подсказка к 1.4 (вторая, про if_test)</summary>
Синтаксис ветвления:

```python
with tp.if_test((tp.clbits[1], 1)):
    tp.x(2)
```

Ключи counts объясняются тем, что биты c0 и c1 в Белл-измерении случайны, — поэтому
всего четыре ключа, а первый символ всех ключей всегда «1» (телепортировали |1⟩).
</details>

Полный протокол с разбором битов — в [answers/kata-01.md](../answers/kata-01.md), раздел 1.4.

## ➡️ Что дальше

[Kata 02 — Гровер](kata-02-grover-2q.md): тот же стиль построения схем, но с алгоритмом.
Теория: [03-entanglement-measurement](../../curriculum/01-quantum-basics/03-entanglement-measurement.md),
[lab-02](../../curriculum/02-programming/lab-02-first-circuit.md).
