---
title: "Capstone 03: Вычисление энергии молекулы H2 методом VQE"
module: "Проекты"
difficulty: "advanced"
duration: "~24 ч"
status: "draft"
tags: [vqe, qiskit-nature, h2, ansatz, cobyla, spsa, optimizer, quantum-chemistry]
---

# Capstone: Вычисление энергии молекулы H2 (VQE)

## Цель

Вычислить энергию молекулы водорода (H2) методом вариационного квантового решателя собственных значений (VQE): построить молекулярный гамильтониан, подобрать анзац (ansatz), сравнить классические оптимизаторы (COBYLA vs SPSA), построить графики сходимости и сверить результат против эталона (FCI/точной диагонализации). Эталонный ответ проекта: суммарная основная энергия H2 в STO-3G базисе при равновесной геометрии R ≈ 0.735 Å, известная величина ≈ −1.137 Ha (электронная часть ≈ −1.857 Ha, отталкивание ядер ≈ +0.720 Ha).

## Что вы научитесь

- подключать `qiskit-nature` (>= 0.7) с драйвером PySCF; строить молекулярный гамильтониан (`ElectronicStructureProblem`, маппинг ParityMapper с двухкубитной редукцией — H2 в STO-3G стандартно сводится к 2–4 кубитам);
- спроектировать анзац: `efficient_su2(...)` (не-deprecated функция; класс `EfficientSU2` — legacy), `real_amplitudes(...)` (аналог для `RealAmplitudes`) или собственный аппаратно-эффективный анзац в духе Kandala;
- оценивать ⟨H⟩ через primitive-интерфейс: `StatevectorEstimator` локально (точная оценка) и `Estimator` из `qiskit_ibm_runtime.executor_estimator` на железе (см. [lab-03](../curriculum/02-programming/lab-03-ibm-quantum-run.md); `EstimatorV2` в runtime 0.50 — legacy), плюс собственный цикл оптимизации на scipy + SPSA; вести трассировку энергии по итерациям;
- сравнивать оптимизаторы: COBYLA (градиент-фри) vs SPSA (стохастический, устойчив к шумным целям);
- интерпретировать результат в терминах квантовой химии: энергетический error в единицах mHa («химическая точность» = 1.6 mHa).

## Предварительные модули

- [Модуль 02: Программирование на Qiskit](../curriculum/02-programming/README.md).
- [Модуль 03: Алгоритмы](../curriculum/03-algorithms/README.md) — [урок VQE/QAOA](../curriculum/03-algorithms/03-vqe-qaoa.md).

## Пошаговый план

### Шаг 1. Окружение

`pip install qiskit qiskit-nature[pyscf] matplotlib` — оптимизацию делаем на scipy + самописном SPSA (Шаг 4), а эталонную энергию — прямой диагонализацией: `numpy.linalg.eigvalsh(H.to_matrix()).min()` (Шаг 5). Пакет `qiskit-algorithms` **не нужен**: `NumPyMinimumEigensolver` из него — только необязательная альтернатива того же самого расчёта, так что без этого пакета проект не ломается. Или без PySCF (fallback ниже) — Qiskit Nature 0.7+ с PySCF 2.+.

> **Про проверяемость.** В среде, на которой проверялся этот проект (Qiskit 2.6.0, Python 3.11), пакеты `qiskit-nature` и `qiskit-algorithms` **не установлены**. Поэтому код ниже, использующий `qiskit-nature`, приведён как референс и здесь не прогонялся; исполняемый и проверенный путь — fallback-гамильтониан (Шаг 2b) + `StatevectorEstimator` + `np.linalg.eigvalsh`. Если ставите `qiskit-nature`, сверяйте сигнатуры с установленной версией (шаги 2a/3 с `PySCFDriver`/`UCCSD` здесь даны по документации и **не** верифицированы).

### Шаг 2 (основной путь). Гамильтониан через qiskit-nature

```python
from qiskit_nature.second_q.drivers import PySCFDriver
from qiskit_nature.second_q.mappers import ParityMapper
from qiskit_nature.second_q.circuit.library import UCCSD, HartreeFock

driver = PySCFDriver(atom="H 0 0 0; H 0 0 0.735", basis="sto3g")
problem = driver.run()
mapper = ParityMapper(num_particles=problem.num_particles)  # даёт 2-кубитную редукцию
hamiltonian = mapper.map(problem.second_q_ops()[0])
```

Откройте Pauli-коэффициенты гамильтониана и сохраните их (для отчёта: это матрица $H = \sum_i c_i P_i$).

### Шаг 2 (fallback). Литературно-известный гамильтониан

Если PySCF недоступен — широко используемая (Qiskit Textbook, по мотивам O'Malley et al., PRX 6, 031007 (2016)) двухкубитная модель электронного гамильтониана H2 (в Ha):

$$H = -1.0524\,II + 0.3979\,IZ - 0.3980\,ZI - 0.0113\,ZZ + 0.1809\,XX.$$

Гамильтониан в коде (исполняемый, проверен на Qiskit 2.6.0):

```python
# qc: executable
import numpy as np
from qiskit.quantum_info import SparsePauliOp

# Qiskit Textbook (по мотивам O'Malley et al. 2016), электронная часть, Ha.
# ВАЖНО: from_list принимает ПОЛНЫЕ метки длиной num_qubits ("II","IZ","ZI","ZZ","XX").
H = SparsePauliOp.from_list([
    ("II", -1.052373245772859),
    ("IZ",  0.39793742484318045),
    ("ZI", -0.39793742484318045),
    ("ZZ", -0.01128010425623538),
    ("XX",  0.18093119978423156),
])
print(H)                                        # 5 слагаемых, 2 кубита

spectrum = np.linalg.eigvalsh(H.to_matrix())
print("spectrum      =", spectrum)              # [-1.85728 -1.24458 -0.88272 -0.22491]
E_exact = spectrum.min()
print("E_electronic  =", E_exact)               # -1.857275 Ha
R_bohr  = 0.735 / 0.5291772109                  # ≈ 1.38895 bohr
E_total = E_exact + 1.0 / R_bohr
print("E_total       =", E_total)               # -1.137306 Ha
assert H.paulis.to_labels() == ["II", "IZ", "ZI", "ZZ", "XX"]
np.testing.assert_allclose(spectrum, [-1.85727503, -1.24458455, -0.88272215, -0.22491125], atol=1e-8)
assert abs(E_total - (-1.1373060358)) < 1e-8
```

**Проверенные числа (Qiskit 2.6.0):** спектр `[-1.85727503, -1.24458455,
-0.88272215, -0.22491125]`, электронный минимум **−1.857275 Ha**, полная энергия при
R = 0.735 Å — **−1.137306 Ha**. Это согласуется с эталонными значениями проекта
(электронная ≈ −1.857 Ha, полная ≈ −1.137 Ha, химическая точность 1.6 mHa).

> **Ловушка `from_sparse_list` (важно).** `SparsePauliOp.from_list` требует **полные**
> метки: длина строки равна числу кубитов (`num_qubits=2` → 2 символа, `"IZ"`).
> `SparsePauliOp.from_sparse_list` использует **локальные** метки, и по конструкции
> длина локальной метки должна совпадать с числом индексов в списке кубитов:
> `("Z", [1], c)` означает `Z` только на кубите 1, а `("IZ", [1], c)` — **неверный**
> вход (2 символа при одном индексе). Qiskit молча обрежет/скомбинирует такую пару,
> и вы получите **не тот оператор**, чем задумали, без ошибки. Проверяйте: после
> построения распечатайте `H` и сравните число слагаемых и спектр с ожидаемыми.
>
> Правильные эквивалентные записи — обе дают один и тот же оператор и
> `E_electronic = -1.857275` (проверено):
>
> ```python
> c0, c1, c2, c3, c4 = (-1.052373245772859, 0.39793742484318045,
>                      -0.39793742484318045, -0.01128010425623538,
>                      0.18093119978423156)
>
> # (a) полные метки
> H_a = SparsePauliOp.from_list(
>     [("II", c0), ("IZ", c1), ("ZI", c2), ("ZZ", c3), ("XX", c4)])
>
> # (b) локальные метки: длина метки == len(qubits)
> H_b = SparsePauliOp.from_sparse_list(
>     [("II", [0, 1], c0), ("Z", [0], c1), ("Z", [1], c2),
>      ("ZZ", [0, 1], c3), ("XX", [0, 1], c4)], num_qubits=2)
>
> assert H_a == H_b            # True
> ```

> Порядок операторов — соглашение Qiskit (`q0` — правый/младший бит). Строка `"IZ"`
> означает `I` на `q1` и `Z` на `q0`. Перестановка `IZ`↔`ZI` — это переименование
> кубитов конъюгацией SWAP (`II`, `ZZ`, `XX` при этом неизменны), поэтому **спектр и
> минимум не меняются**, но меняется соответствие собственных векторов базисным строкам.
> Важно не «какие числа», а согласованная нумерация кубитов между гамильтонианом и
> анзацем: сверяйте свой гамильтониан с `mapper.map(problem.second_q_ops()[0])`,
> а не «на глаз».

### Шаг 3. Анзац

Основной (физически осмысленный): `UCCSD` — но с сигнатурой qiskit-nature 0.8 (первые аргументы
— числа орбиталей и частиц, а не объект problem):

```python
from qiskit_nature.units import DistanceUnit
from qiskit_nature.second_q.mappers import ParityMapper
from qiskit_nature.second_q.circuit.library import UCCSD, HartreeFock

problem  # ElectronicStructureProblem с шага 1
mapper   = ParityMapper(num_particles=problem.num_particles)  # 2-кубитная редукция

hf    = HartreeFock(problem.num_spatial_orbitals, problem.num_particles, mapper)
ansatz = UCCSD(
    num_spatial_orbitals=problem.num_spatial_orbitals,
    num_particles=problem.num_particles,
    qubit_mapper=mapper,
    initial_state=hf,
)
```

Согласуйте ширину с редуцированным гамильтонианом (для H₂/STO-3G с Parity-редукцией это 2
кубита; HartreeFock обязан использовать тот же mapper, иначе расхождение ширин). Простой
вариант — **не-deprecated функции** `efficient_su2(2, reps=2)` (12 параметров) или
`real_amplitudes(2, reps=2)` (6 параметров, только Ry), либо ручной анзац вида
`$R_{Y,\theta} R_{Z,\phi}$ + CX + $R_{Y,\theta} R_{Z,\phi}$ + CX`. Классы `EfficientSU2` и
`RealAmplitudes` — legacy (deprecated), в новом коде их не используйте. Сравните число
параметров, глубину и скорость сходимости.

```python
from qiskit.circuit.library import efficient_su2, real_amplitudes

ansatz = efficient_su2(2, reps=2)      # проверено: 12 параметров, ops {ry:6, rz:6, cx:2}
# ansatz = real_amplitudes(2, reps=2)  # проверено: 6 параметров, ops {ry:6, cx:2}
print(ansatz.num_parameters, ansatz.count_ops())
```

### Шаг 4. Оптимизаторы

```python
from qiskit.circuit.library import efficient_su2
from qiskit.primitives import StatevectorEstimator
from scipy.optimize import minimize
import numpy as np

# H и ansatz — из Шагов 2b и 3 (fallback-путь, здесь всё исполняется локально)
ansatz    = efficient_su2(2, reps=2)
estimator = StatevectorEstimator()               # точная statevector-оценка ⟨H⟩
history   = []                                   # трассировка энергии

def energy(theta):
    evs = estimator.run([(ansatz, H, theta)]).result()[0].data.evs
    history.append(float(evs))
    return float(evs)                            # запускайте на num_qubits == 2

rng    = np.random.default_rng(7)
x0     = rng.uniform(-np.pi, np.pi, ansatz.num_parameters)
result = minimize(energy, x0, method="COBYLA", options={"maxiter": 200})
print(result.fun)                                # лучший найденный ⟨H⟩ (≥ -1.85728)
print(len(history), "evaluations")
```

Проверено (Qiskit 2.6.0, `seed=7`, `maxiter=200`): `result.fun = -1.857275`
при `E_ref = -1.857275`, т.е. **ΔE ≈ 0 mHa** — `efficient_su2(2, reps=2)` содержит
основное состояние этого 2-кубитного гамильтониана, и COBYLA находит его за 200
итераций. (Для `reps=1` разрыв будет больше — это и есть цена выразительности.)

`StatevectorEstimator` (точный, без шума) даёт `stds ≈ 0`; `ansatz` и `H` должны иметь
**одинаковую ширину** — `estimator.run` кинет ошибку, если у circuits и observable
разное число кубитов.

Прогоните оба: COBYLA (так, как выше, `method="COBYLA"`) и SPSA — соберите его вручную (10–20 строк: два рандомных сдвига по всем параметрам за итерацию, по формулам из раздела «Градиенты» урока [03-vqe-qaoa.md](../curriculum/03-algorithms/03-vqe-qaoa.md)); несколько seeds — SPSA стохастичен. Кривые сходимости: в `history` логируйте каждое значение, сохраняйте список в CSV/json.

Теоретическая рамка для интерпретации: VQE минимизирует $\min_\theta \langle\psi_\theta|H|\psi_\theta\rangle \ge E_0$ — вариационный принцип гарантирует, что вы сверху приближаетесь к основному состоянию. COBYLA — детерминированный локальный метод без градиента: быстрый на гладких ландшафтах, легко застревает в локальных минимумах и чувствителен к шуму измерений. SPSA — приближает градиент всего двумя измерениями на итерацию, устойчив к шуму, но «грубее»; на идеальном симуляторе он тоже работает, хотя и требует больше итераций.

### Шаг 5. Эталон и графики

Эталон — **прямая диагонализация того же гамильтониана**, без каких-либо внешних
пакетов оптимизации:

```python
E_ref = np.linalg.eigvalsh(H.to_matrix()).min()   # -1.857275 (электронная часть)
print("ΔE =", result.fun - E_ref)                  # ≈ 0; всегда ≥ 0 (вариационный принцип)
print("E_total =", result.fun + 1.0 / (0.735 / 0.5291772109))   # ≈ -1.137306 Ha
```

`NumPyMinimumEigensolver` из `qiskit-algorithms` делает то же самое — это **опциональная**
альтернатива, а не обязательный шаг (в проверенной среде пакета нет). Если PySCF-путь
работает, эталоном может служить FCI-энергия из `problem`. Постройте:
(a) кривые E(итерация) для COBYLA и SPSA на одном графике;
(b) таблицу «оптимизатор → параметры → итерации → энергия → |E−E_ref|»;
(c) финальный вердикт по точности.

### Шаг 6. (опционально) Шум и полная энергия

**Локально (основной путь, работает без QPU и без fake-бэкендов).** Добавьте шум
прямо в оценку ⟨H⟩: `EstimatorV2` из `qiskit_aer.primitives` с `NoiseModel` (подробности
по каналам и `NoiseModel` — в [уроке о шумовой симуляции](../curriculum/02-programming/04-noise-simulation.md)):

```python
from qiskit import transpile
from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel, depolarizing_error
from qiskit_aer.primitives import EstimatorV2
from qiskit.quantum_info import Statevector
import numpy as np

# 1) связываем параметры анзаца (иначе Estimator требует parameter_values)
theta  = np.random.default_rng(7).uniform(-np.pi, np.pi, ansatz.num_parameters)
bound  = ansatz.assign_parameters(theta)

# 2) модель шума на тех гейтах, которые появятся после transpile
noise = NoiseModel()
noise.add_all_qubit_quantum_error(depolarizing_error(1e-3, 1), ["sx", "x", "ry", "rz", "rx"])
noise.add_all_qubit_quantum_error(depolarizing_error(1e-2, 2), ["cx"])

sim  = AerSimulator(noise_model=noise, seed_simulator=7)
tqc  = transpile(bound, sim, optimization_level=1, seed_transpiler=0)
Ht   = H.apply_layout(tqc.layout) if tqc.layout is not None else H

est = EstimatorV2(options={
    "backend_options": {"method": "density_matrix", "noise_model": noise},
    "run_options": {"seed_simulator": 7},
    "default_precision": 0.0,  # сначала отделяем шум каналов от ошибки выборки
})
print("noisy ⟨H⟩ =", est.run([(tqc, Ht)]).result()[0].data.evs)
print("exact ⟨H⟩ =", float(Statevector.from_instruction(bound).expectation_value(H).real))
```

`NoiseModel` нужно передать **самому Estimator** через `backend_options`: наличие
модели у `sim`, использованного только для транспиляции, не делает другой primitive
шумным. При `default_precision=0.0` density-matrix метод вычисляет ожидание канала
без добавленной ошибки выборки; отличие от `Statevector` здесь проверяет влияние
ошибок гейтов. Для отдельного эксперимента со статистической неопределённостью
задайте ненулевую precision: Aer Estimator добавляет гауссовскую погрешность оценки,
а не автоматически исполняет конкретное число физических shots. Фиксируйте оба
источника ошибок отдельно. Матрица плотности требует памяти порядка `4^n`, поэтому
этот путь оставляем двухкубитным, а не переносим на произвольную ширину.

**Связь с полной энергией.** Электронная энергия из модели — `-1.857275 Ha`;
полная = электронная + отталкивание ядер. **Обязательная привязка единиц:** расстояние
геометрии задано в ангстремах, но энергия в Ha — атомные единицы длины, поэтому

$$R_{\text{bohr}} = \frac{R_{\text{Å}}}{0{,}5291772109}, \qquad \texttt{R = 0.735 / 0.5291772109;} \quad \texttt{E\_nn = 1/R} \approx 0{,}720\ \text{Ha}$$

(при $R = 0{,}735\ \text{Å} \to R \approx 1{,}38895$ bohr). Итого
`-1.857275 + 0.719969 = -1.137306 Ha`, что согласуется с эталоном ≈ −1.137 Ha.
Прямая подстановка $0{,}735$ в $1/R$ даёт $\approx 1{,}36$ Ha — типичная
систематическая ошибка. В PySCF-пути берите готовое `problem.nuclear_repulsion_energy`
(оно уже в Ha).

> **Про реальный QPU (не проверялось локально).** Если вы хотите считать ⟨H⟩ на железе,
> `Estimator` из `qiskit_ibm_runtime.executor_estimator` принимает схему **в ISA-виде**:
> её нужно транспилировать под `backend` и **приложить тот же layout к наблюдаемой**.
> Иначе схема (ширина устройства, например 127) и observable (ширина 2) не совпадут —
> `Estimator.run` отклонит такую пару ещё на клиенте. Правильный шаблон:
>
> ```python
> from qiskit_ibm_runtime import QiskitRuntimeService
> from qiskit_ibm_runtime.executor_estimator import Estimator
>
> backend = QiskitRuntimeService(channel="ibm_quantum_platform").least_busy(
>     operational=True, simulator=False)
> isa_circuit = transpile(ansatz, backend, optimization_level=1, seed_transpiler=0)
> isa_H       = H.apply_layout(isa_circuit.layout)      # <- ключевая строка
>
> estimator = Estimator(mode=backend)
> estimator.options.default_precision = 0.02
> print(estimator.run([(isa_circuit, isa_H)]).result()[0].data.evs)
> ```
>
> Этот блок приведён как референс и **локально не исполнялся** (нет доступа к QPU).
> Замечание про fake-бэкенды: `Estimator(mode=FakeSherbrooke())` на 2-кубитной схеме
> годится только для очень узкой демонстрации синтаксиса и падал в наших прогонах
> на 127-кубитных ISA-схемах/observable (детали — в [lab-03](../curriculum/02-programming/lab-03-ibm-quantum-run.md));
> это ограничение конкретного локального пути, а не вывод «Aer/Fake сломаны вообще».

## Критерии приёмки

- [ ] Гамильтониан построен и сохранён (список Pauli-строк и коэффициентов); приведён **проверенный** спектр (`np.linalg.eigvalsh`), а не предполагаемый.
- [ ] Эталон `E_ref = np.linalg.eigvalsh(H.to_matrix()).min()` посчитан из того же гамильтониана; ΔE = E_VQE − E_ref ≥ 0 (вариационный принцип).
- [ ] |E_VQE − E_ref| <= 10 mHa в идеальных условиях (лучше — <= 1.6 mHa). Для учебного fallback-гамильтониана это достижимо при достаточных `reps`/итерациях; отсутствие 1.6 mHa само по себе — не провал, если объяснено.
- [ ] Оба оптимизатора прогнаны; сравнение имеет хотя бы 3 seeds для SPSA.
- [ ] График сходимости с осью итераций и двумя кривыми сохранён в файл.
- [ ] В README решения — таблица и интерпретация: почему COBYLA рано сходится/застревает.
- [ ] Указано, какой путь пройден (PySCF или fallback) и какие пакеты реально установлены; если PySCF-путь — код запускался, а не только приведён.
- [ ] (bonus) Шумной прогон с комментариями (уровень ошибки/итерации), seed сохранён.

## Расширения

1. **Профиль по R**: пройдите R = 0.3..2.5 Å шагом 0.1, для каждой геометрии — VQE; получите диссоциационную кривую (dissociation curve) и сверьте равновесную позицию с экспериментом.
2. **Другой маппинг**: Jordan-Wigner против Parity: сравните число кубитов и глубину анзаца.
3. **Ad-анзац**: попытайтесь [ADAPT-VQE]-подход: посчитайте градиенты на первых шагах по операторам (без полного алгоритма).

## Оценка времени

~24 ч: 2 ч окружение, 4 ч гамильтониан (оба пути), 4 ч анзац и прогон, 4 ч оптимизаторы + эксперименты, 4 ч графики/таблицы, 4 ч README/выводы, 2 ч расширение 1 (R-профиль — опционально).

## Чекпоинты и самооценка

Формат в стиле рубрик problem sets MIT 8.370/8.371: на каждом чекпоинте три критерия (реализация, анализ, документация), каждый — от 0 до 5, оценка ставится самостоятельно. Шкала: 5 — закрыт полностью и проверяемо; 3 — закрыт с оговорками; 1 — начато, не проверено; 0 — не начато.

### Чекпоинт 1: гамильтониан (Шаги 1–2)

| Критерий | Что проверяете | Баллы 0–5 |
|---|---|---|
| Реализация | Гамильтониан построен (PySCF-путь или fallback) и сохранён списком Pauli-строк с коэффициентами; выбран маппинг (Parity с двукубитной редукцией) или явно указано, что используется литературная 2-кубитная модель | |
| Анализ | Вы можете объяснить, почему в редукции получается 2 кубита и что именно «закодировали» симметрии частиц | |
| Документация | В README записан полный гамильтониан и ссылка на источник чисел (свой расчёт или O'Malley et al. для fallback) | |

### Чекпоинт 2: анзац (Шаг 3)

| Критерий | Что проверяете | Баллы 0–5 |
|---|---|---|
| Реализация | Анзац запускается, число параметров посчитано; варианты (UCCSD / EfficientSU2 / ручной) сменяются одним аргументом | |
| Анализ | Сравнение выразительность/глубина: для двух анзацев записаны число параметров, глубина транспилированной схемы и скорость сходимости | |
| Документация | В README — короткий раздел «почему выбран анзац» с числами глубины/параметров | |

### Чекпоинт 3: оптимизаторы (Шаги 4–6)

| Критерий | Что проверяете | Баллы 0–5 |
|---|---|---|
| Реализация | COBYLA и SPSA прогнаны на одном и том же (ansatz, H, Estimator); SPSA — минимум 3 seeds, все кривые в CSV | |
| Анализ | Числа честные: во всех ячейках таблицы «оптимизатор → итерации → энергия → ошибка ΔE» посчитаны из одних данных; ΔE = E_VQE − E_ref не хуже 10 mHa в идеальных условиях | |
| Документация | График сходимости подписан (оси, легенда); в README объяснено поведение COBYLA (ранняя сходимость/застревание) через свойства метода | |

### Чекпоинт 4: эталон и вердикт (Шаги 5–6)

| Критерий | Что проверяете | Баллы 0–5 |
|---|---|---|
| Реализация | Эталонная энергия посчитана на том же гамильтониане (`np.linalg.eigvalsh(H.to_matrix()).min()`; опц. NumPyMinimumEigensolver / FCI). Если заявлена полная энергия H₂ — она сравнена с литературным значением ≈ −1.137 Ha; для учебного fallback-гамильтониана указано, что полная энергия получается ≈ −0.383 Ha (см. Шаг 2b) | |
| Анализ | Финальный вердикт: достигли ли химической точности (1.6 mHa); если нет — объяснение источника остаточной ошибки (анзац, оптимизатор, шум) | |
| Документация | README завершается сводкой: лучшее значение, отклонение от `E_ref`, ограничения метода, что пробовать дальше | |

### Итоговая сумма и трактовка

Максимальный результат: 4 чекпоинта × 3 критерия × 5 = 60 баллов. Ориентиры: 48–60 — расчёт воспроизводим и выводы химически корректны; 36–47 — энергия посчитана, но сравнение оптимизаторов поверхностно; ниже 36 — вернитесь к чекпоинту 1 (гамильтониан — самый частый источник систематической ошибки) и двигайтесь заново сверху вниз.
