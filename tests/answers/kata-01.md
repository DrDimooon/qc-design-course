---
title: "Ответы: Kata 01 (Белл, GHZ, телепортация)"
module: "Каты"
difficulty: "beginner"
duration: "~10 мин"
status: "draft"
tags: [answers, kata, bell, ghz, teleportation]
---

# Ответы: Kata 01

Полные решения к [tests/katas/kata-01-bell.md](../katas/kata-01-bell.md). Читайте только после попытки.

## 1.1. Состояние Белла Φ⁺

```python
bell = QuantumCircuit(2)
bell.h(0)
bell.cx(0, 1)

sv = Statevector.from_instruction(bell)
print(sv.probabilities_dict())     # {'00': 0.5, '11': 0.5}
```

Пояснение: H создаёт суперпозицию (|00⟩ + |01⟩)/√2 по кубиту 0 (в записи |q1 q0⟩), а CNOT копирует
состояние управляющего кубита на управляемый: (|00⟩ + |11⟩)/√2.

## 1.2. Остальные три состояния Белла

Из готового Φ⁺ — только однокубитные добавки:

```python
phi_plus = QuantumCircuit(2)
phi_plus.h(0); phi_plus.cx(0, 1)

psi_plus  = phi_plus.copy(); psi_plus.x(1)          # Ψ⁺ = (|01> + |10>)/sqrt(2)
phi_minus = phi_plus.copy(); phi_minus.z(0)         # Φ⁻ = (|00> - |11>)/sqrt(2)
psi_minus = phi_plus.copy()
psi_minus.z(1)
psi_minus.x(1)                                      # Ψ⁻ = (|10> - |01>)/sqrt(2)

# референсные схемы, собранные с нуля
ref_psi_plus = QuantumCircuit(2)
ref_psi_plus.x(1); ref_psi_plus.h(0); ref_psi_plus.cx(0, 1)

ref_phi_minus = QuantumCircuit(2)
ref_phi_minus.h(0); ref_phi_minus.cx(0, 1); ref_phi_minus.z(0)

ref_psi_minus = QuantumCircuit(2)
ref_psi_minus.x(1); ref_psi_minus.h(0); ref_psi_minus.cx(0, 1)
ref_psi_minus.z(1)

assert Operator(psi_plus) .equiv(Operator(ref_psi_plus))
assert Operator(phi_minus).equiv(Operator(ref_phi_minus))
assert Operator(psi_minus).equiv(Operator(ref_psi_minus))
```

Пояснения:

- `x(1)` меняет местами базисные состояния по кубиту 1: |00⟩ ↔ |10⟩ и |11⟩ ↔ |01⟩,
  поэтому Φ⁺ превращается в Ψ⁺.
- `z(0)` меняет знак тех компонент, где кубит 0 = 1, то есть |11⟩: Φ⁺ -> Φ⁻.
- Ψ⁻ = «и обмен, и знак»: z(1), затем x(1).
- `Operator.equiv` игнорирует глобальную фазу, поэтому кандидат, отличающийся общим
  минусом, всё равно эквивалентен референсу.
- Амплитудная проверка (вероятности фазу не видят):

```python
assert np.allclose(Statevector.from_instruction(phi_minus).data,
                   [1 / np.sqrt(2), 0, 0, -1 / np.sqrt(2)])
assert np.allclose(Statevector.from_instruction(psi_minus).data,
                   [0, -1 / np.sqrt(2), 1 / np.sqrt(2), 0])
```

## 1.3. GHZ-состояние

```python
ghz = QuantumCircuit(3)
ghz.h(0)
ghz.cx(0, 1)
ghz.cx(0, 2)

sv = Statevector.from_instruction(ghz)
assert np.allclose(sv.probabilities(), [0.5, 0, 0, 0, 0, 0, 0, 0.5])

qc = ghz.copy(); qc.measure_all()
counts = AerSimulator().run(qc, shots=2000).result().get_counts()
assert set(counts) <= {"000", "111"}
```

Пояснение: один источник (кубит 0) каскадом CNOT распространяет суперпозицию на все
кубиты. Вариант «каскад» cx(0, 1); cx(1, 2) даёт то же состояние — проверьте через
`Operator(ghz).equiv(...)`.

Мини-вывод (бонус): GHZ — это не три независимых кубита, а одно общее суперпозиционное
состояние: маргинал любого кубита полностью смешанный. Этим свойством GHZ-состояния
пользуются в тестах нелокальности.

## 1.4. Телепортация

```python
tp = QuantumCircuit(3, 3)

# телепортируемое состояние |1>
tp.x(0)

# Белл-пара между кубитами 1 и 2
tp.h(1)
tp.cx(1, 2)

# Белл-измерение пары (0, 1)
tp.cx(0, 1)
tp.h(0)
tp.measure(0, 0)
tp.measure(1, 1)

# классические коррекции на кубите 2
with tp.if_test((tp.clbits[1], 1)):
    tp.x(2)
with tp.if_test((tp.clbits[0], 1)):
    tp.z(2)

# измерение телепортированного бита
tp.measure(2, 2)

counts = AerSimulator().run(tp, shots=1000).result().get_counts()
assert all(k.startswith("1") for k in counts), counts
print(counts)
```

Разбор механики:

- после Белл-измерения на кубите 2 оказывается исходное состояние с одной из четырёх
  ошибок: I, X, Z или XZ;
- бит c1 (результат измерения кубита 1) отвечает за X-поправку: `if c1: x(2)`;
- бит c0 (результат измерения кубита 0) отвечает за Z-поправку: `if c0: z(2)`;
- строки counts читаются как «c2 c1 c0» (little-endian): левый символ — телепортированный
  бит (всегда 1), правые два — случайные результаты Белл-измерения, поэтому всего
  ровно 4 ключа.

Bonus (телепортация произвольного состояния):

```python
tp2 = QuantumCircuit(3, 3)
tp2.ry(np.pi / 3, 0)
tp2.h(1); tp2.cx(1, 2)
tp2.cx(0, 1); tp2.h(0)
tp2.measure(0, 0); tp2.measure(1, 1)
with tp2.if_test((tp2.clbits[1], 1)):
    tp2.x(2)
with tp2.if_test((tp2.clbits[0], 1)):
    tp2.z(2)
tp2.measure(2, 2)

counts = AerSimulator().run(tp2, shots=8000).result().get_counts()
# маргинал по телепортированному биту (левый символ ключа):
p1 = sum(v for k, v in counts.items() if k.startswith("1")) / 8000
p0 = sum(v for k, v in counts.items() if k.startswith("0")) / 8000
print("P(c2=1) =", p1)      # около sin^2(pi/6) = 0.25 (со статистическим отклонением)
print("P(c2=0) =", p0)      # около cos^2(pi/6) = 0.75
```
