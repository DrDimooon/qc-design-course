---
title: "Kata 02: Гровер на 2-3 кубитах"
module: "Каты"
difficulty: "beginner/intermediate"
duration: "~60 мин"
status: "draft"
tags: [kata, grover, oracle, diffuser, amplitude-amplification, qiskit]
---

# Kata 02: Гровер на 2-3 кубитах

Серия упражнений по принципу кат: строим оракул, диффузор, полную итерацию Гровера и
экспериментируем с числом итераций. Ключевой вывод: «правильное» число итераций конечно,
дальше вероятность целевого состояния падает.

Понадобится:

```python
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, Operator
from qiskit_aer import AerSimulator
```

Разборы и полные решения: [tests/answers/kata-02.md](../answers/kata-02.md) — не открывайте до попытки.

## Задача 2.1. Оракул, помечающий |11⟩, — это CZ

**Цель:** убедиться, что оракул Гровера «помечает фазой»: `cz(0, 1)` умножает амплитуду
|11⟩ на −1 и больше ничего не делает. В глобальной фазе не важно, какой кубит считать
контролем (CZ симметричен).

```python
oracle = QuantumCircuit(2)
# TODO: один гейт
```

Самопроверка:

```python
prepared = QuantumCircuit(2)
prepared.h([0, 1])                       # |++>
sv = Statevector.from_instruction(prepared.compose(oracle))
amp = sv.data
assert np.allclose(sv.probabilities(), [0.25, 0.25, 0.25, 0.25])   # вероятности не меняются
assert amp[0] > 0 and amp[3] < 0                                   # минус только у |11>
assert np.allclose(np.abs(amp), [0.5, 0.5, 0.5, 0.5])
print("2.1 OK")
```

<details markdown="1"><summary>Подсказка к 2.1</summary>
CZ симметричен: qc.cz(0, 1) и qc.cz(1, 0) эквивалентны (проверьте через Operator equiv).
</details>

## Задача 2.2. Переключение оракула на другую цель

**Цель:** собрать оракул, помечающий |10⟩, меняя «значение» целевого бита гейтами X
вокруг CZ. Отдельно проверить диффузор.

Напоминание о соглашении (см. [CONVENTIONS.md](../../CONVENTIONS.md)): вместо «little-endian» достаточно помнить, что `q0` — младший бит справа, поэтому кет `|q1 q0⟩ = |10⟩` — это `q1 = 1, q0 = 0`, а его индекс в `sv.data` равен 2.

Пометка |10⟩: CZ помечает |11⟩, поэтому «занесём» целевое состояние на место |11⟩
гейтами X вокруг CZ: |10⟩ → x(0) → |11⟩ → CZ помечает → x(0) → |10⟩. Убедитесь сами: `x(0)` в `|10⟩` переворачивает `q0` (0 → 1) и даёт `|11⟩`.

```python
oracle_10 = QuantumCircuit(2)
# TODO: x(0); cz(0, 1); x(0)

diffuser = QuantumCircuit(2)
# TODO: h([0, 1]); x([0, 1]); cz(0, 1); x([0, 1]); h([0, 1])
```

Самопроверка оракула:

```python
prepared = QuantumCircuit(2)
prepared.h([0, 1])
sv = Statevector.from_instruction(prepared.compose(oracle_10))
amp = sv.data
assert amp[2] < 0                  # минус ровно на |10> (little-endian index 2)
assert np.allclose(np.abs(amp), [0.5, 0.5, 0.5, 0.5])
print("оракул OK")
```

Самопроверка диффузора: он должен быть эквивалентен D = 2|s⟩⟨s| − I, где
|s⟩ = |++⟩:

```python
s = np.array([0.5, 0.5, 0.5, 0.5])
D = 2 * np.outer(s, s) - np.eye(4)
assert Operator(diffuser).equiv(D)      # equiv сравнивает с точностью до глобальной фазы
print("диффузор OK")
```

<details markdown="1"><summary>Подсказка к 2.2</summary>
X-обёртка переносит «место пометки» CZ на другое базисное состояние: в |10⟩ кубит 0 = 0,
поэтому обёртка ставится именно на него: x(0), cz, x(0). Диффузор повторяет шаблон
из lab-02 (шаг 2): h, x, cz, x, h. Operator.equiv принимает и матрицу (numpy array),
и Operator.
</details>

## Задача 2.3. Полная итерация на 2 кубитах: одна итерация ровно решает задачу

**Цель:** собрать полный Гровер для N = 4, M = 1: H-подготовка, одна итерация
(оракул CZ из задачи 2.1 + диффузор), измерение. Для N = 4, M = 1 одна итерация
оптимальна: sin(3·30°) = 1, вероятность цели ровно 1.

```python
grover = QuantumCircuit(2, 2)
grover.h([0, 1])
# TODO: добавьте в grover гейты оракула (cz(0, 1)) и диффузора (как в 2.2),
#       затем measure([0, 1], [0, 1])
```

Самопроверка:

```python
counts = AerSimulator().run(grover, shots=1024).result().get_counts()
assert all(k == "11" for k in counts), counts
print("2.3 OK")
```

<details markdown="1"><summary>Подсказка к 2.3</summary>
Стандартное определение итерации Гровера: G = D·O, где O — оракул, D — диффузор.
При построении схемы это просто последовательность: сначала гейты оракула, затем
гейты диффузора.
</details>

## Задача 2.4. Больше итераций — хуже (проверка на 2 кубитах)

**Цель:** собрать Гровер с k итерациями и посмотреть на вероятности для k = 1, 2, 3.
Теория для N = 4, M = 1: амплитуда цели после k итераций = sin((2k+1)·30°), то есть
k = 1: 1.0, k = 2: sin(150°) = 0.5, k = 3: sin(210°) = −0.5 (амплитуда по модулю 0.5).

Аккуратно: если решение единственное, вероятность P = sin²((2k+1)θ) — сравните
максимум P при k = 1 с падением на k = 2 и k = 3.

```python
def grover_2q(k):
    qc = QuantumCircuit(2, 2)
    qc.h([0, 1])
    for _ in range(k):
        # TODO: oracle (cz(0, 1)) + diffuser (те же гейты, что в 2.2)
        ...
    qc.measure([0, 1], [0, 1])
    return qc

for k in (1, 2, 3):
    counts = AerSimulator().run(grover_2q(k), shots=4000).result().get_counts()
    print(f"k = {k}: P(|11>) ~ {counts.get('11', 0) / 4000:.3f}")
```

Самопроверка: при k = 1 вероятность около 1.0, при k = 2 и k = 3 — около 0.25,
то есть падение.

<details markdown="1"><summary>Подсказка к 2.4</summary>
В каждой итерации добавляйте: qc.cz(0, 1), затем diffuser-гейты qc.h([0,1]); qc.x([0,1]);
qc.cz(0,1); qc.x([0,1]); qc.h([0,1]). Замечание: диффузор содержит свой CZ — это нормально.
</details>

<details markdown="1"><summary>Подсказка к 2.4 (вторая)</summary>
Не путайте: «оракулный cz» и «диффузорный cz» — два отдельных мультигейта внутри одной итерации.
</details>

## Задача 2.5. Гровер на 3 кубитах: оракул и диффузор через CCZ

**Цель:** масштабируем на 3 кубита. Единственное решение — |111⟩. Оракул
(двухуправляемый Z) собирается как h(2) + ccx(0, 1, 2) + h(2); диффузор — та же
конструкция в обёртке H/X. Убедитесь, что обе конструкции диагональны, а минус стоит
только на |111⟩.

```python
def ccz_in_qc(qc, a, b, c):
    """Применить CCZ к схеме qc на кубитах a, b, c."""
    # TODO: h(c); ccx(a, b, c); h(c)

oracle = QuantumCircuit(3)
# TODO: применить ccz-конструкцию

diffuser = QuantumCircuit(3)
# TODO: h([0, 1, 2]); x([0, 1, 2]); ccz-конструкция; x([0, 1, 2]); h([0, 1, 2])
```

Самопроверка: оракул диагонален, поэтому проверяем знаки амплитуд на равновесном состоянии.

```python
prepared = QuantumCircuit(3)
prepared.h([0, 1, 2])                 # равновесие |s>
sv = Statevector.from_instruction(prepared.compose(oracle))
amp = sv.data
assert np.allclose(np.abs(amp), [1 / np.sqrt(8)] * 8)   # амплитуды равны по модулю
assert amp[0] > 0 and amp[7] < 0     # минус только на |111> (index 7)
# диффузор — отражение относительно |s>, сверяем с эталонной матрицей:
s3 = np.array([1 / np.sqrt(8)] * 8)
D3 = 2 * np.outer(s3, s3) - np.eye(8)
assert Operator(diffuser).equiv(D3)
print("2.5 OK")
```

<details markdown="1"><summary>Подсказка к 2.5</summary>
CCZ = H·CCX·H на «мишенном» (третьем) кубите. Третий кубит в ccx(a, b, c) — тот,
который контролируется двумя остальными.
</details>

<details markdown="1"><summary>Подсказка к 2.5 (вторая)</summary>
Шаблон диффузора тот же, что в задаче 2.2, только cz заменён на ccz-конструкцию,
а h/x применяются к трём кубитам: qc.h([0, 1, 2]); qc.x([0, 1, 2]); ...
</details>

## Задача 2.6. Оптимальное число итераций на 3 кубитах

**Цель:** прогнать k = 0..4 итераций на 3 кубитах и увидеть кривую вероятностей.
Ожидание: k = 0 ≈ 0.125 (чистое равновесие), k = 1 ≈ 0.78, k = 2 ≈ 0.94 (максимум,
floor(π/4·√(N/M)) = 2), k = 3 ≈ 0.33, k = 4 ≈ 0.01.

```python
def grover_3q(k):
    qc = QuantumCircuit(3, 3)
    qc.h([0, 1, 2])
    for _ in range(k):
        # TODO: oracle + diffuser
        ...
    qc.measure([0, 1, 2], [0, 1, 2])
    return qc

for k in range(5):
    counts = AerSimulator().run(grover_3q(k), shots=4000).result().get_counts()
    print(f"k = {k}: P(|111>) ~ {counts.get('111', 0) / 4000:.3f}")
```

Самопроверка: максимум на k = 2, больше итераций — хуже, k = 0 даёт около 1/8.

<details markdown="1"><summary>Подсказка к 2.6</summary>
Вероятность считается так же, как в задаче 2.4, только N = 8. Амплитуда цели =
sin((2k+1)θ), θ = asin(1/√8) ≈ 20.7°. Максимум sin — при (2k+1)θ ≈ π/2, то есть
k ≈ 1.67, округлённо k = 2.
</details>

Расширение: если хотите продолжить, пометить несколько решений (например, |010⟩ и |101⟩)
и посмотреть правильное k для M = 2 — это по духу ближе к
[projects/02-grover-oracles.md](../../projects/02-grover-oracles.md).

## Итог серии

- Гровер = «оракул (фаза) + диффузор (отражение относительно равновесия)»; одна итерация —
  детерминированный поворот амплитуд, а не «накопление» вероятности.
- Оптимум итераций конечен: floor(π/4 · √(N/M)); дальше всегда хуже (проверено на 2q и 3q).
- Оракул — не «чёрный ящик», а унитарная матрица, которую мы строим явно и проверяем
  через знаки амплитуд.

## ➡️ Что дальше

[Kata 03 — API](kata-03-qiskit-api.md). Теория Гровера:
[01-grover](../../curriculum/03-algorithms/01-grover.md), практический контекст —
[lab-02, шаг 2](../../curriculum/02-programming/lab-02-first-circuit.md). Проверить понимание —
[03-quiz](../03-quiz.md).
