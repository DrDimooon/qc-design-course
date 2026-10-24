---
title: "Ответы: Kata 02 (Гровер на 2-3 кубитах)"
module: "Каты"
difficulty: "beginner/intermediate"
duration: "~10 мин"
status: "draft"
tags: [answers, kata, grover, oracle, diffuser]
---

# Ответы: Kata 02

Полные решения к [tests/katas/kata-02-grover-2q.md](../katas/kata-02-grover-2q.md). Читайте только после попытки.

Общая формула: после k итераций амплитуда цели равна sin((2k+1)θ), где
θ = asin(sqrt(M/N)), M — число решений, N — размер пространства.

## 2.1. Оракул — CZ

```python
oracle = QuantumCircuit(2)
oracle.cz(0, 1)

prepared = QuantumCircuit(2)
prepared.h([0, 1])
sv = Statevector.from_instruction(prepared.compose(oracle))
amp = sv.data
assert np.allclose(sv.probabilities(), [0.25, 0.25, 0.25, 0.25])
assert amp[3] < 0 and amp[0] > 0        # минус только у |11> (index 3)
```

Пояснение: CZ = diag(1, 1, 1, −1), то есть меняет только знак |11⟩ — «помечает
решение фазой», не трогая вероятностей. Именно это и делает оракул Гровера. CZ
симметричен по контролю и мишени, поэтому порядок аргументов — вопрос стиля.

## 2.2. Переключение оракула на |10⟩ и диффузор

```python
oracle_10 = QuantumCircuit(2)
oracle_10.x(0)
oracle_10.cz(0, 1)
oracle_10.x(0)

diffuser = QuantumCircuit(2)
diffuser.h([0, 1])
diffuser.x([0, 1])
diffuser.cz(0, 1)
diffuser.x([0, 1])
diffuser.h([0, 1])
```

Проверки:

```python
prepared = QuantumCircuit(2)
prepared.h([0, 1])
sv = Statevector.from_instruction(prepared.compose(oracle_10))
assert sv.data[2] < 0                   # минус ровно на index 2 (|10>)

s = np.array([0.5, 0.5, 0.5, 0.5])
D = 2 * np.outer(s, s) - np.eye(4)
assert Operator(diffuser).equiv(D)
```

Пояснение: CZ помечает |11⟩; X-обёртка на кубите `q0` (младший бит, см. [CONVENTIONS.md](../../CONVENTIONS.md)) «переносит» метку на состояние,
отличающееся от |11⟩ только битом q0, — на |10⟩. Диффузор — это отражение относительно
равновесного вектора |s⟩ = |++⟩ (матрица 2|s⟩⟨s| − I); конструкция «H, X, CZ, X, H»
равна ему с точностью до глобальной фазы, которую `equiv` игнорирует.

## 2.3. Полная итерация на 2 кубитах

```python
grover = QuantumCircuit(2, 2)
grover.h([0, 1])
grover.cz(0, 1)                          # оракул
grover.h([0, 1])                         # диффузор
grover.x([0, 1])
grover.cz(0, 1)
grover.x([0, 1])
grover.h([0, 1])
grover.measure([0, 1], [0, 1])

counts = AerSimulator().run(grover, shots=1024).result().get_counts()
assert all(k == "11" for k in counts), counts
```

Пояснение: для N = 4, M = 1 угол Гровера θ = 30 град, амплитуда после одной итерации
sin(3·30°) = 1 — задача решается ровно одной итерацией.

## 2.4. Больше итераций — хуже

```python
def grover_2q(k):
    qc = QuantumCircuit(2, 2)
    qc.h([0, 1])
    for _ in range(k):
        qc.cz(0, 1)                      # оракул
        qc.h([0, 1]); qc.x([0, 1])       # диффузор
        qc.cz(0, 1)
        qc.x([0, 1]); qc.h([0, 1])
    qc.measure([0, 1], [0, 1])
    return qc

for k in (1, 2, 3):
    counts = AerSimulator().run(grover_2q(k), shots=4000).result().get_counts()
    print(f"k = {k}: P(|11>) ~ {counts.get('11', 0) / 4000:.3f}")
# ожидание: примерно 1.0, 0.25, 0.25
```

Пояснение: sin(150°) = 0.5 и sin(210°) = −0.5 — по модулю одна и та же амплитуда
0.5, поэтому вероятность на k = 2 и k = 3 одинаковая (~0.25) и заметно меньше
максимума на k = 1.

## 2.5. 3 кубита: оракул и диффузор через CCZ

```python
def apply_ccz(qc, a, b, c):
    qc.h(c)
    qc.ccx(a, b, c)
    qc.h(c)

oracle = QuantumCircuit(3)
apply_ccz(oracle, 0, 1, 2)

diffuser = QuantumCircuit(3)
diffuser.h([0, 1, 2])
diffuser.x([0, 1, 2])
apply_ccz(diffuser, 0, 1, 2)
diffuser.x([0, 1, 2])
diffuser.h([0, 1, 2])

# проверки
prepared = QuantumCircuit(3)
prepared.h([0, 1, 2])
sv = Statevector.from_instruction(prepared.compose(oracle))
amp = sv.data
assert np.allclose(np.abs(amp), [1 / np.sqrt(8)] * 8)
assert amp[7] < 0 and amp[0] > 0

s3 = np.array([1 / np.sqrt(8)] * 8)
D3 = 2 * np.outer(s3, s3) - np.eye(8)
assert Operator(diffuser).equiv(D3)
```

Пояснение: CCZ — диагональная матрица с минусом на |111⟩; он реализуется как
H·CCX·H на мишени (кубите 2). Диффузор — та же CCZ-конструкция в обёртке H/X,
эквивалентен отражению относительно |s⟩.

## 2.6. Оптимальное число итераций на 3 кубитах

```python
def grover_3q(k):
    qc = QuantumCircuit(3, 3)
    qc.h([0, 1, 2])
    for _ in range(k):
        apply_ccz(qc, 0, 1, 2)               # оракул
        qc.h([0, 1, 2]); qc.x([0, 1, 2])     # диффузор
        apply_ccz(qc, 0, 1, 2)
        qc.x([0, 1, 2]); qc.h([0, 1, 2])
    qc.measure([0, 1, 2], [0, 1, 2])
    return qc

for k in range(5):
    counts = AerSimulator().run(grover_3q(k), shots=4000).result().get_counts()
    print(f"k = {k}: P(|111>) ~ {counts.get('111', 0) / 4000:.3f}")
# ожидание: около 0.125, 0.78, 0.94, 0.33, 0.01
```

Пояснение: θ = asin(1/√8) ≈ 20.7 град; максимум sin((2k+1)θ) достигается при
(2k+1)θ ≈ 90 град, то есть k ≈ 1.67, округление вниз даёт k = 2. Две итерации —
оптимум, третья резко уводит амплитуду от единицы.

Итог: Гровер — детерминированный поворот амплитуды; оптимум итераций конечен, а
вероятность при «правильном» k близка к sin²((2k+1)θ) при k = floor(π/4·sqrt(N/M)).
