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
from qiskit_ibm_runtime import QiskitRuntimeService
service = QiskitRuntimeService(channel="ibm_quantum_platform")  # прочтёт токен из окружения
# либо сохранить раз и навсегда (файл локальный):
# QiskitRuntimeService.save_account(channel="ibm_quantum_platform", token=os.environ["QISKIT_IBM_TOKEN"])
print(service.backends())   # список устройств
```

## Шаг 2. Выбор бэкенда и запуск

```python
from qiskit_ibm_runtime import Session, SamplerV2
from qiskit import QuantumCircuit, transpile

backend = service.least_busy(operational=True, simulator=False)  # наименее загруженное устройство
bell = QuantumCircuit(2, 2)
bell.h(0); bell.cx(0, 1); bell.measure([0, 1], [0, 1])

tbell = transpile(bell, backend, optimization_level=2, seed_transpiler=0)

# Основной сценарий — job mode: у free/Open Plan нет права отправлять
# session-задания (Open Plan ограничен job/batch), поэтому Sampler
# привязывается прямо к бэкенду:
sampler = SamplerV2(mode=backend)          # job mode: mode=backend
job = sampler.run([tbell], shots=4096)
result = job.result()

# Session (пакетное исполнение групп заданий с минимальной задержкой между ними)
# доступен на платных планах — отдельный вариант для платного доступа:
# with Session(backend=backend) as session:
#     sampler = SamplerV2(mode=session)
#     ...
```

> **О deprecation.** В qiskit-ibm-runtime 0.50 класс `SamplerV2` помечен как deprecated (удаление — не раньше чем через 3 месяца после релиза): его преемник — `qiskit_ibm_runtime.executor_sampler.Sampler`, который выполняет пред- и постобработку на стороне клиента. Пока работаете с `SamplerV2`, просто держите в уме, что в следующем мажорном релизе импорт придётся поменять; сам код запуска при этом не меняется.

Получение counts (имя ключа — имя классического регистра схемы; у `QuantumCircuit(2, 2)` это `'c'`):

```python
data = result[0].data
print(data.c.get_counts())
```

## Шаг 3. Что ожидать

Симулятор: {'00'≈50%, '11'≈50%}. Реальное железо: ~47/47 + «паразитные» '01'/'10' (~малые проценты). Это **readout error** + ошибки гейтов: у каждого устройства есть свой профиль.

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

## Экономия бесплатных минут

- Комбинируйте эксперименты: в один job можно класть много схем (ограничение — не фиксированное число PUB'ов, а суммарные лимиты по числу инструкций и выстрелов, см. «Job limits» в документации Runtime).
- shots: больше выстрелов — точнее статистика, но и время исполнения растёт примерно пропорционально; держите shots минимально достаточным (1024 для первых опытов).
- Начинайте с 1-2-кубитных схем: транспилированная схема короткая и не съест лимит.

## Критерии приёмки

- [ ] Аккаунт создан, токен сохранён через переменную окружения (не в git).
- [ ] Bell-состояние запущено на реальном бэкенде, counts сохранены.
- [ ] Отклонение counts от 50/50 объяснено через свойства бэкенда.
- [ ] (доп.) Гровер 2-кубитный тоже запущен и его реальная точность ниже симуляции — согласуется с ошибками гейтов.

## ✅ Проверь себя

1. Почему токен держат через переменную окружения, а не строкой в коде? Что произойдёт, если закоммитить токен в публичный git?
2. Где в `backend.target` лежат readout-ошибка, ошибка родного 2q-гейта и T1/T2, и как они объясняют разброс counts на реальном железе?
3. Что даёт `transpile(qc, backend)` перед отправкой в SamplerV2 и что сломается, если её пропустить?
4. Зачем сравнивать симулятор и реальный бэкенд на одной и той же схеме? Что показывает расхождение?

## ➡️ Что дальше

Модуль [03 Алгоритмы](../03-algorithms/README.md), а затем главный модуль [04 Проектирование систем](../04-systems-design/README.md).
Тест модуля: [../../tests/02-quiz.md](../../tests/02-quiz.md).
