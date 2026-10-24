---
title: "Лаба 03: запуск на реальном квантовом компьютере"
module: "02 Программирование"
difficulty: "intermediate"
duration: "~2 ч"
status: "draft"
tags: [lab, ibm-quantum, runtime]
---

# Лаба 03: запуск на реальном квантовом компьютере

## Цель

Провести первый эксперимент на железе: регистрация, токен, запуск Bell/Гровера через Qiskit Runtime, сравнение полученных counts с симуляцией и объяснение разницы (шум).

## Шаг 1. Аккаунт

1. Зарегистрируйтесь на quantum.ibm.com (бесплатный план: ~10 минут QPU-времени в месяц).
2. Скопируйте API token в личном кабинете.
3. НЕ вставляйте токен в код: используйте переменные окружения.

```bash
# PowerShell
$env:QISKIT_IBM_TOKEN = "ВАШ_ТОКЕН"
```

```python
import os
from qiskit_ibm_runtime import QiskitRuntimeService

# Явно передаём token из окружения — так не зависите от того, как
# конкретная версия runtime ищет креденшелы (и от сохранённого профиля).
service = QiskitRuntimeService(
    channel="ibm_quantum_platform",
    token=os.environ["QISKIT_IBM_TOKEN"],
    instance=os.environ.get("QISKIT_IBM_INSTANCE"),   # если ваш аккаунт требует instance
)
print(service.backends())   # список устройств
```

> Токен из `QISKIT_IBM_TOKEN` runtime умеет читать и сам, но тогда не читается
> `instance` (env-путь подставляет только `token`/`url`/`instance` из конкретных
> переменных), и поведение может отличаться от сохранённого профиля. Явная передача
> `token=` делает пример предсказуемым; проверено только то, что вызов **без**
> корректных креденшелов падает с `AccountNotFoundError`, поэтому сам успешный
> вызов `service.backends()` здесь **не проверялся** (нужен ваш аккаунт).

## Шаг 2. Выбор бэкенда и запуск

### Как устроен стек: primitive → Executor → бэкенд

Прежде чем писать код — одна схема, на которой держится весь остальной курс:

```text
Sampler / Estimator   ← ваш интерфейс (что запустить и в каком виде получить результат)
      ↓  клиентская обработка (client-side processing)
Executor              ← единый нижний уровень отправки на IBM Quantum
      ↓
QPU / симулятор
```

`Sampler`/`Estimator` — это **обёртки**: они превращают удобный вход (схемы, наблюдаемые,
число выстрелов) в программу для `Executor`, отправляют её и собирают результат обратно.
Вся «пред- и постобработка» (сборка параметров, группировка коммутирующих наблюдаемых,
сборка counts из сырых битстрингов) идёт **на вашем компьютере**, отсюда название
*client-side processing*. Практические следствия:

- задержка перед отправкой задания может быть заметной (для больших задач на клиенте
  считается много), и документация советует включить `INFO`-логирование, чтобы видеть,
  где время;
- результат приходит в контейнерном формате (`PrimitiveResult` →
  `data.<creg>.get_counts()`/`data.evs`), а не в старом формате «словарь с шумами» —
  так что вы получаете больше контроля, но и парсите сами.

`Executor` обычно не нужен напрямую: это нижний уровень, на котором `Sampler`/`Estimator`
и построены. Импортировать его отдельно имеет смысл, только если вы строите собственный
primitive.

### Запуск: `Sampler` из `executor_sampler`

```python
from qiskit import QuantumCircuit, transpile
from qiskit_ibm_runtime.executor_sampler import Sampler   # новый client-side Sampler

backend = service.least_busy(operational=True, simulator=False)  # наименее загруженное устройство

bell = QuantumCircuit(2, 2)
bell.h(0); bell.cx(0, 1); bell.measure([0, 1], [0, 1])
tbell = transpile(bell, backend, optimization_level=2, seed_transpiler=0)

# Основной сценарий — job mode: у free/Open Plan нет права отправлять
# session-задания, поэтому primitive привязывается прямо к бэкенду.
sampler = Sampler(mode=backend)                 # job mode: mode=backend
sampler.options.default_shots = 4096            # или sampler.run([...], shots=4096)
job = sampler.run([tbell])
result = job.result()
```

> **Важно про импорт.** `from qiskit_ibm_runtime import Sampler` в runtime 0.50 указывает
> на **legacy-класс** `qiskit_ibm_runtime.sampler.Sampler` (V2-интерфейс), а не на новый
> client-side Sampler. Это разные классы с одинаковым именем — проверено:
> `qiskit_ibm_runtime.Sampler is not qiskit_ibm_runtime.executor_sampler.Sampler`.
> Поэтому всегда импортируйте явно из `qiskit_ibm_runtime.executor_sampler`
> (и `...executor_estimator` для Estimator).

Получение counts (имя ключа — имя классического регистра схемы; у `QuantumCircuit(2, 2)` это `'c'`):

```python
data = result[0].data
print(data.c.get_counts())
print(data.c.num_shots)          # 4096
print(data.c.get_bitstrings()[:5])  # сырые битстринги, по одному на выстрел
```

> `SamplerV2`/`EstimatorV2` из `qiskit_ibm_runtime` в 0.50 помечены как deprecated
> (удаление — не раньше чем через 3 месяца после релиза). Их замена — client-side
> `Sampler`/`Estimator` из `executor_sampler`/`executor_estimator`, которые работают
> поверх `Executor`. Пока видите в чужом коде `SamplerV2`, держите в уме: код запуска
> (`mode=backend`, `run([...])`, `result()[0].data`) похож, но импорт поменяется.
> Полная миграция — в конце лабораторной.

### Режимы исполнения

```python
from qiskit_ibm_runtime import Session, Batch

# Session: группа заданий с минимальной задержкой между ними (обычно платные планы)
# with Session(backend=backend) as session:
#     sampler = Sampler(mode=session)
#     ...

# Batch: несколько независимых заданий в одном «пакете» (упрощает управление,
# снижает задержку между заданиями). Параллельное исполнение на QPU НЕ гарантируется —
# фактическая конкурентность зависит от загрузки устройства и плана.
# with Batch(backend=backend) as batch:
#     sampler = Sampler(mode=batch)
```

Привязку primitive к `session`/`batch` делайте **внутри** контекстного менеджера —
иначе задание уйдёт в job mode (runtime предупредит об этом).

## Шаг 2a. Прогон нового API локально — до траты QPU-минут

Прежде чем отправлять задание на железо, **проверьте сам код** на локальном
fake-бэкенде: у fake-бэкенда из `qiskit_ibm_runtime.fake_provider` есть собственный
симулятор, и объект бэкенда можно передать прямо в `Sampler(mode=...)`. Полный стек
(primitive → client-side processing → Executor → симулятор) реально исполняется.
Проверено на `FakeSherbrooke` + Qiskit 2.6.0 / runtime 0.50.0:

```python
# qc: executable
from qiskit import QuantumCircuit, transpile
from qiskit_ibm_runtime.fake_provider import FakeSherbrooke
from qiskit_ibm_runtime.executor_sampler import Sampler

backend = FakeSherbrooke()           # локальная «карта» реального устройства

bell = QuantumCircuit(2, 2)
bell.h(0); bell.cx(0, 1); bell.measure([0, 1], [0, 1])
tbell = transpile(bell, backend, optimization_level=2, seed_transpiler=0)

sampler = Sampler(mode=backend)      # job mode против локального симулятора
sampler.options.default_shots = 4096
sampler.options.simulator.seed_simulator = 7   # воспроизводимость
result = sampler.run([tbell]).result()

print(result[0].data.c.num_shots)              # 4096
print(result[0].data.c.get_counts())           # {'00': 2019, '11': 2017, '01': 27, '10': 33}
counts = result[0].data.c.get_counts()
assert result[0].data.c.num_shots == 4096
assert sum(counts.values()) == 4096
assert (counts.get("00", 0) + counts.get("11", 0)) / 4096 > 0.85
```

(Конкретные числа зависят от seed; при `seed_simulator=7` на FakeSherbrooke получено
именно `{'00': 2019, '11': 2017, '01': 27, '10': 33}`.) Затем достаточно заменить
`backend = FakeSherbrooke()` на `backend = service.least_busy(...)` — остальной код
не меняется. Заодно это **дёшево проверяет**, что ваша схема транспилируется в
нативный базис устройства.

## Шаг 2b. Estimator для наблюдаемых (кратко)

Если нужна не гистограмма, а ожидание (например, для VQE/QAOA), используйте
`Estimator` из `qiskit_ibm_runtime.executor_estimator` — тот же client-side стек.

**На QPU (референс, локально не проверялся — нет доступа к железу).** Схема должна
быть в ISA-виде, и **наблюдаемую нужно приложить к тому же layout**. Это ключевая
строка: после `transpile(qc, backend)` схема получает ширину устройства (например, 127
кубитов), а исходная наблюдаемая — ширину 2, и без `apply_layout` `Estimator.run`
отклонит пару ещё на клиенте (`ValueError: number of qubits ... does not match`).

```python
from qiskit import QuantumCircuit, transpile
from qiskit.quantum_info import SparsePauliOp
from qiskit_ibm_runtime.executor_estimator import Estimator

bell = QuantumCircuit(2)
bell.h(0); bell.cx(0, 1)

isa_circuit = transpile(bell, backend, optimization_level=1, seed_transpiler=0)
obs         = SparsePauliOp.from_list([("ZZ", 1.0)])
isa_obs     = obs.apply_layout(isa_circuit.layout)     # <- обязательная строка

estimator = Estimator(mode=backend)                     # backend с QPU
estimator.options.default_precision = 0.02
res = estimator.run([(isa_circuit, isa_obs)]).result()
print(res[0].data.evs, res[0].data.stds)                # ⟨ZZ⟩ ≈ 1 для Белла
```

> **Локально.** `Sampler(mode=FakeSherbrooke())` работает (Шаг 2a), а
> `Estimator(mode=FakeSherbrooke())` в runtime 0.50 — **не универсальная замена QPU**:
> он прогоняет симуляцию в нативном базисе тика fake-бэкенда, и в наших прогонах
> небольшая схема из нативных гейтов (`sx`/`rz`) считалась, а транспилированные
> wide (`127`-кубитные) схемы/observable падали в клиентской постобработке
> (`ValueError`/memory). Это ограничение **этого** локального пути, а не вывод
> «fake-бэкенды сломаны» или «Aer не имеет ограничений»: Aer хранит вектор состояния
> ширины `n` (~`2^n`), так что «любая ширина» — неверно в принципе.
>
> Для локальной проверки своих observable-расчётов берите схему **малой ширины**:
> либо `StatevectorEstimator()` из `qiskit.primitives` (точное матожидание, 2–10
> кубитов — см. [проект VQE](../../projects/03-vqe-h2.md)), либо
> `EstimatorV2` из `qiskit_aer.primitives` с `NoiseModel` на маленькой схеме.
> Проверено (FakeSherbrooke, нативная схема): `Estimator(mode=FakeSherbrooke())`
> с `default_precision=0.02` вернул `evs=0.0, stds≈0.0145` для игрушечной схемы
> из `sx`/`rz` — синтаксис и постобработка корректны, но это не проверка вашей
> боевой пары `ISA-схема + apply_layout(obs)`.

## Шаг 3. Что ожидать

Симулятор без шума (`StatevectorSampler` или Aer без модели): `{'00' ≈ 50%, '11' ≈ 50%}`
и ничего в `'01'/'10'`. Для ⟨ZZ⟩ на Белле точная оценка —
`StatevectorEstimator()` → `evs ≈ 1.0, stds = 0.0` (проверено), а на шумном
fake-бэкенде ожидание будет заметно меньше 1 из-за ошибок гейтов/readout.
Симулятор с шумом `FakeSherbrooke` (Шаг 2a): доминируют `'00'/'11'` (≈49% каждый при
`seed_simulator=7`), «паразитные» `'01'/'10'` — по ~0.7% в проверенном прогоне.
Реальное железо: похожая картина, но процент паразитных исходов зависит от устройства
и текущей калибровки. Источники — **readout error** + ошибки гейтов: у каждого
устройства свой профиль.

## Разбор: сколько ошибок пришлось на наше железо

```python
# в Target уже есть оценки ошибок
target = backend.target
print(target["measure"][(0,)].error)            # readout ошибка кубита 0
name_2q = next(n for n in target.operation_names if n in ("ecr", "cz"))
for edge, props in target[name_2q].items():     # родной 2q-гейт: ECR (Eagle) или CZ (Heron)
    print(edge, props.error)
props_q = target.qubit_properties[0]            # T1/T2 кубита 0
print(props_q.t1, props_q.t2)
```

(Родной 2q-гейт зависит от поколения процессора: у Eagle это ECR, у Heron — CZ; имя всегда берите из `backend.target.operation_names`, а не из конкретного файла. В списке выше `cx` намеренно исключён: `cx` — это составной гейт, а не нативный двухкубитный примитив устройства, и выбрать его — значит получить не тот гейт, который реально стоит на железе.)

**О пространствах имён.** Фейк-бэкенды живут в двух пакетах: `qiskit.providers.fake_provider.GenericBackendV2` — конфигурируемый генерируемый бэкенд из SDK (в этом модуле не используется — пригодится, когда понадобится бэкенд «под себя», с заданной топологией и числами), и `qiskit_ibm_runtime.fake_provider.Fake*` — «зеркала» реальных устройств из qiskit-ibm-runtime: `FakeSherbrooke` используется в уроке [03](03-transpilation-hardware.md) и в примере `NoiseModel.from_backend` из [урока о шуме](04-noise-simulation.md). Классы не взаимозаменяемы: не смешивайте импорты и фиксируйте в эксперименте, какой бэкенд использовали.

## Миграционная заметка: `SamplerV2`/`EstimatorV2` → `Sampler`/`Estimator`

Старый код (runtime 0.50 помечает эти классы deprecated):

```python
from qiskit_ibm_runtime import SamplerV2, EstimatorV2
sampler = SamplerV2(mode=backend)
```

Новый код:

```python
from qiskit_ibm_runtime.executor_sampler import Sampler
from qiskit_ibm_runtime.executor_estimator import Estimator
sampler = Sampler(mode=backend)
```

Что меняется:

| | legacy `SamplerV2` (runtime 0.50) | client-side `Sampler` |
|---|---|---|
| импорт | `qiskit_ibm_runtime` (имя `Sampler` там тоже legacy!) | `qiskit_ibm_runtime.executor_sampler` |
| вызов | `run(pubs, *, shots=None, dry_run=False)` | та же сигнатура `run` (проверено) |
| обработка | на стороне сервиса | client-side поверх `Executor` |
| результат | `PrimitiveResult` → `data.<creg>` | `PrimitiveResult` → `data.<creg>` (совпадает) |
| options | `options.*` V2 | `options.*` (часть полей может отличаться — сверяйте с `print(sampler.options)`) |

**Что проверено, а что — нет.** Проверено: импорты, `Sampler(mode=FakeSherbrooke())`,
`options.default_shots`, `options.simulator.seed_simulator`, `run([...])`,
`result()[0].data.c.get_counts()`, `num_shots`, `get_bitstrings()`, а также что
`qiskit_ibm_runtime.Sampler` — **не** тот же класс, что `executor_sampler.Sampler`.
**Не проверялось** (нет доступа к реальному QPU/сервису): совпадает ли полный набор
опций конструктора у legacy и нового классов — не переносите `options`-словари
«слепо», сверяйте поля в `print(sampler.options)` на своей версии runtime.

## Экономия бесплатных минут

- Комбинируйте эксперименты: в один job можно класть много схем (ограничение — не фиксированное число PUB'ов, а суммарные лимиты по числу инструкций и выстрелов, см. «Job limits» в документации Runtime).
- shots: больше выстрелов — точнее статистика, но и время исполнения растёт примерно пропорционально; держите shots минимально достаточным (1024 для первых опытов).
- Начинайте с 1-2-кубитных схем: транспилированная схема короткая и не съест лимит.
- Сначала прогоняйте весь код на fake-бэкенде (`FakeSherbrooke`, Шаг 2a) — ошибки
  синтаксиса и импорта не должны стоить QPU-минут.

## Критерии приёмки

- [ ] Аккаунт создан, токен сохранён через переменную окружения (не в git).
- [ ] Bell-состояние запущено на реальном бэкенде, counts сохранены.
- [ ] Код использует `Sampler` из `qiskit_ibm_runtime.executor_sampler` (не `SamplerV2` и не `from qiskit_ibm_runtime import Sampler`).
- [ ] Код предварительно прогнан на `FakeSherbrooke` (Шаг 2a); в отчёте указаны полученные локальные counts и seed.
- [ ] Отклонение counts от 50/50 объяснено через свойства бэкенда.
- [ ] (доп.) Гровер 2-кубитный тоже запущен и его реальная точность ниже симуляции — согласуется с ошибками гейтов.
- [ ] (доп.) `Estimator` из `executor_estimator` использован для оценки ⟨ZZ⟩; наблюдаемая приложена через `apply_layout(isa_circuit.layout)`, результат и `stds` сохранены.

## ✅ Проверь себя

1. Почему токен держат через переменную окружения, а не строкой в коде? Что произойдёт, если закоммитить токен в публичный git?
2. Где в `backend.target` лежат readout-ошибка, ошибка родного 2q-гейта и T1/T2, и как они объясняют разброс counts на реальном железе?
3. Что такое client-side processing? Какая часть работы выполняется на вашем компьютере, а какая — на стороне сервиса, и почему `Sampler` назван «обёрткой над `Executor`»?
4. Почему `from qiskit_ibm_runtime import Sampler` — не то же самое, что `from qiskit_ibm_runtime.executor_sampler import Sampler`? Проверьте это в REPL через `is`.
5. Что даёт `transpile(qc, backend)` перед отправкой в `Sampler` и что сломается, если её пропустить?
6. Зачем сравнивать симулятор и реальный бэкенд на одной и той же схеме? Что показывает расхождение?

## ➡️ Что дальше

Модуль [03 Алгоритмы](../03-algorithms/README.md), а затем главный модуль [04 Проектирование систем](../04-systems-design/README.md).
Тест модуля: [../../tests/02-quiz.md](../../tests/02-quiz.md).
