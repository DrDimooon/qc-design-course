---
title: "Инструменты и SDK для квантовых вычислений"
module: "Ресурсы"
difficulty: "all"
duration: "справочник"
status: "draft"
tags: [quantum-computing, sdk, tools, qiskit, resources]
---

# Инструменты и SDK

Стек, которым можно проходить лабы и проекты курса. «Язык» — язык интерфейса/библиотеки; «Qiskit» — характер интеграции с Qiskit: нативная — инструментальная часть Qiskit-экосистемы или официальное расширение; да — есть официальный мост/плагин; нет — обмен только через OpenQASM или свой стек.

## Карта категорий

| Категория | Инструменты |
| --- | --- |
| SDK (сборка схем, исполнение) | Qiskit SDK + IBM Quantum Runtime, Cirq, PennyLane, Q# + QDK, NVIDIA CUDA-Q |
| Симуляция (идеальные и шумные цепи, динамика) | Qiskit Aer, QuTiP |
| Компиляция и оптимизация схем | транспилятор Qiskit SDK, TKET (pytket), staq |
| Проектирование чипов (hardware-design) | KQCircuits (IQM) |
| Характеризация и бенчмаркинг (QCVV) | Qiskit Experiments, IQM Benchmarks |
| Платформы с доступом к бэкендам | Quantum Inspire (QuTech); доступ к железу IBM — через Qiskit Runtime |
| Криптология и QEC | выделенных инструментов нет; учебные QEC-модули — CUDA-Q Academic (qec101) и CUDA-Q QEC-библиотека |

## Каталог инструментов

| Название | Категория | Описание | Уровень | Язык | Qiskit | Бесплатно | Ссылка |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Qiskit SDK + IBM Quantum Runtime | SDK | Основной стек курса: построение схем, транспилятор, примитивы (Sampler/Estimator), запуск на симуляторах и реальном железе IBM; единая документация SDK и сервисов Runtime. | начальный/средний | Python | нативная | да (SDK open source; доступ к железу — по тарифам) | <https://quantum.cloud.ibm.com/docs/> |
| Qiskit Aer | симуляция | Движок симуляции идеальных и шумных цепей (state vector, density matrix, stabilizer), интегрирован в Qiskit SDK. Проект переведён в режим reduced maintenance (только критические исправления). | средний | Python | нативная | да | <https://github.com/Qiskit/qiskit-aer> |
| Qiskit Experiments | бенчмаркинг/QCVV | Библиотека для построения, запуска и анализа экспериментов на шумных квантовых компьютерах: T1/T2, randomized benchmarking и другие протоколы. | средний/продвинутый | Python | нативная | да | <https://github.com/qiskit-community/qiskit-experiments> |
| Cirq | SDK | Фреймворк Google Quantum AI для написания, манипуляции и оптимизации квантовых цепей с учётом ограничений NISQ-железа; симуляторы, qsim, Quantum Virtual Machine. | средний | Python | нет (обмен через OpenQASM) | да | <https://quantumai.google/cirq> |
| PennyLane | SDK (QML) | Библиотека дифференцируемого квантово-классического программирования (квантовое машинное обучение), совместима с устройствами/симуляторами Qiskit, Cirq и других стеков. | средний | Python | да (плагин qiskit) | да | <https://pennylane.ai/> |
| Q# и Microsoft QDK | SDK | Язык Q# и Quantum Development Kit: компилятор, resource estimator, учебные Quantum Katas; открытый исходный код, MIT. Отдельная сила — оценка ресурсов отказоустойчивых схем. | средний | Q#/Python/Rust | нет | да | <https://github.com/microsoft/qdk> |
| QuTiP | симуляция | Quantum Toolbox in Python: симуляция открытых квантовых систем (эволюция Шрёдингера/Линдблада), квантовая оптика; пакет qutip-qip для протоколов. Цельная поддержка hardware-трека (модуль 05). | продвинутый | Python | нет | да | <https://qutip.org/> |
| KQCircuits (IQM) | hardware-design | Open source инструмент проектирования сверхпроводящих чипов на базе KLayout: библиотеки элементов (резонаторы, кубиты, айрбриджи), экспорт масок, интеграция с симуляторами Elmer/Ansys. Практическая база проекта 05-kqcircuits-chip. | продвинутый | Python (+KLayout GUI) | нет | да | <https://iqm-finland.github.io/KQCircuits/> |
| Quantum Inspire (QuTech) | платформа | Платформа QuTech/TU Delft: редактор квантовых алгоритмов, SDK, симуляторы и доступ к квантовым бэкендам (сверхпроводящие, нейтральные атомы); официальный путь подключения из Qiskit и PennyLane. Бесплатная регистрация. | начальный/средний | Python/OpenQASM | да (коннекторы из Qiskit/PennyLane) | да (базовый доступ) | <https://www.quantum-inspire.com/> |
| IQM Benchmarks | бенчмаркинг/QCVV | Набор QCVV-инструментов IQM: randomized benchmarking (Clifford/interleaved/mirror), Quantum Volume, CLOPS, GHZ-фиделити, GST, Q-Score. Опирается на урок 05-benchmarking. | продвинутый | Python | не проверено | да (open source; работа с реальным железом — через IQM Resonance) | <https://docs.iqm.tech/iqm-benchmarks/> |
| NVIDIA CUDA-Q | SDK (гибрид) | Open source платформа гибридных классически-квантовых вычислений с GPU-ускорением (система задач, симуляторы, интеграция с CUDA); с 2024–2025 в платформу интегрирован стек cuQuantum (cuStateVec/cuDensityMat) и библиотеки CUDA-QX; QEC-библиотека и учебные модули — CUDA-Q Academic. | средний/продвинутый | Python/C++ | нет | да | <https://developer.nvidia.com/cuda-q> |
| TKET (Quantinuum) | компиляция | Высокоэффективный квантовый компилятор: pytket (Python-интерфейс) поверх tket (C++), оптимизация под разные архитектуры, расширения для стыковки с Qiskit/Cirq/PennyLane. | средний/продвинутый | Python/C++ | да (pytket-qiskit) | да (Apache-2.0) | <https://github.com/Quantinuum/tket> |
| staq | компиляция | Полностековый квантовый toolkit для OpenQASM на C++: парсер, синтез, оптимизация, маршрутизация; разработчик — softwareQ Inc. (не MIT/EPiQC, как иногда ошибочно пишут). | продвинутый | C++/OpenQASM | нет (обмен через OpenQASM 2.0; есть pystaq) | да (MIT) | <https://github.com/softwareQinc/staq> |

## Инструменты, появившиеся/раскрутившиеся за 2024–2026

Отдельная подборка инструментов, ставших заметными в открытой экосистеме в последние два года (либо новых, либо резко выросших по применимости и цитируемости). Колонки совпадают с каталогом выше.

| Название | Категория | Описание | Уровень | Язык | Qiskit | Бесплатно | Ссылка |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Stim (quantumlib) | симуляция QEC | Высокопроизводительный симулятор и анализатор стабилизаторных схем (К. Гидни/Google) — де-факто стандарт для QEC-работы 2024–2026: миллионы операций на тысячи кубитов, semi-автоматическое построение detector error model (Tanner graph) под декодеры; сабпроекты Sinter (сэмплирование декодирования) и Crumble (интерактивный редактор схем). Ограничение: только стабилизаторные (Клиффордовские) схемы и Pauli-шум. Журнал: Quantum 5, 497 (2021), DOI 10.22331/q-2021-07-06-497 | средний/продвинутый | Python/C++/CLI | нет | да (Apache-2.0) | <https://github.com/quantumlib/Stim> |
| Mitiq (Unitary Foundation) | mitigation (виртуальная коррекция ошибок) | Python-тулкит квантовой коррекции ошибок на программном уровне: ZNE, PEC, CDR, DDD, REM, LRE + экспериментальные PEA, shadows, VD, TREX; модуль calibration параметров под конкретный бэкенд; фронтенды Cirq, Qiskit, PennyLane, Braket, pyQuil, Qibo, OpenQASM 3 (Cirq — core requirement). Лицензия GPL-3.0 | средний | Python | да (официальный frontend Qiskit) | да (GPL-3.0) | <https://mitiq.readthedocs.io/en/stable/> |
| Bloqade (QuEra) | SDK (нейтральные атомы) | SDK QuEra «The Neutral Atom SDK», активно развивавшийся в 2024–2026: набор eDSL поверх компиляторной инфраструктуры Kirin — bloqade.qasm2, bloqade.analog (эмуляция гамильтониана Рыдберга для аналоговых задач), среда QEC Studio и bloqade.lanes (компиляция в программы с шаттлированием); отправка задач на QPU Aquila (через AWS Braket) и цифровой бэкенд Gemini | средний/продвинутый | Python | нет | да | <https://bloqade.quera.com/> |
| Qrisp (Fraunhofer FOKUS / Eclipse) | SDK (высокоуровневый) | Высокоуровневый Python-фреймворк: типизированные QuantumVariable/QuantumFloat, автоматический uncomputation и переработка кубитов, модульная арифметика, JAX-интеграция (Jasp) для real-time гибридных алгоритмов; компиляция в стандартные схемы (симулятор до 100+ кубитов) с бэкендами IQM, IBM Quantum, Quantinuum, AQT, Rigetti. Стал проектом Eclipse (2025) | средний/продвинутый | Python | нет (обмен через схемы/OpenQASM) | да | <https://qrisp.eu/> |

## Соответствия: что брать под тему курса

### Модуль 04 (компиляция и системный дизайн)

| Задача | Инструменты |
| --- | --- |
| Транспиляция и оптимизация схем под конкретное железо | транспилятор Qiskit SDK (pass managers); TKET — как альтернативный компилятор; staq — для OpenQASM source-to-source |
| Оценка ресурсов отказоустойчивых схем | Q# resource estimator (Microsoft QDK) |
| Шумная симуляция после компиляции | Qiskit Aer (state vector/density matrix/stabilizer) |
| GPU-ускорение гибридных конвейеров | NVIDIA CUDA-Q (+ CUDA-Q Academic, модуль simulation) |

### Модуль 05 (аппаратура и чипы)

| Задача | Инструменты |
| --- | --- |
| Проектирование сверхпроводящего чипа и масок | KQCircuits (проект 05-kqcircuits-chip) |
| Динамика кубитов и открытых систем | QuTiP (и модуль dynamics CUDA-Q) |
| Характеризация железа и QCVV-протоколы | Qiskit Experiments; протоколы на стороне IQM — IQM Benchmarks (урок 05-benchmarking) |
| Доступ к реальным бэкендам | IBM Quantum Runtime (Qiskit), Quantum Inspire (QuTech), IQM Resonance (через IQM Benchmarks) |
| Калибровка и управление чипом (учебная практика) | CUDA-Q Academic, модуль calibration |

## Примечания

- Все ссылки проверены вручную (webfetch) 18.10.2026: документации, сайты и репозитории открываются.
- Qiskit Aer: репозиторий в режиме reduced maintenance — критические багфиксы продолжаются, новые функции в бэклоге; для базового цикла курса остаётся основным симулятором.
- Про staq: проект ведётся компанией softwareQ Inc. (<https://www.softwareq.ca/>), репозиторий — <https://github.com/softwareQinc/staq>; в задании фигурировало «staq (у Oliver?)» — к MIT и группе W. Oliver staq отношения не имеет.
- Microsoft: облачная служба Azure Quantum завершается; актуальный путь работы с Q# — open-source QDK (репозиторий `microsoft/qdk`).
- Quantum Inspire обновился до версии 2.0; для железных бэкендов требуется бесплатная регистрация; на сайте официально описано подключение из Qiskit и PennyLane.
- Интеграция IQM Benchmarks с Qiskit не проверена (не проверено — см. колонку «Qiskit»); инструмент документирован как QCVV-пакет от IQM для своих устройств.
- Для проекта курса: Qiskit — модули 02–04 и проекты 01/04; PennyLane/Cirq — альтернативный стек для алгоритмических лаб; TKET — альтернативный компилятор для модуля 04; KQCircuits — проект 05-kqcircuits-chip; IQM Benchmarks, Qiskit Experiments и QuTiP — темы модуля 05.
- Секция «2024–2026»: ссылки Stim (<https://github.com/quantumlib/Stim>) и Mitiq (<https://mitiq.readthedocs.io/en/stable/>) проверены открытием страниц 18.10.2026; Bloqade (<https://bloqade.quera.com/>) и Qrisp (<https://qrisp.eu/>) — проверены через официальные документации 18.10.2026.
- NVIDIA CUDA-Q: описание в каталоге обновлено по состоянию на 2025–2026 — стек cuQuantum интегрирован в платформу, отдельные библиотеки CUDA-QX (в т.ч. QEC) считаются её частью; отдельная строка не дублируется.
- Qiskit Runtime / Qiskit Functions 2025–2026: в экосистеме IBM (Qiskit Runtime, тарифы Premium/партнёры) появилась категория Qiskit Functions — переиспользуемые «функции-сервисы» (конвертация, оптимизация, error mitigation, симуляция от сторонних провайдеров), вызываемые из Python; сервисы не добавлены в таблицу как отдельные инструменты, так как доступны только внутри тарифов IBM Quantum; детали см. в актуальной документации quantum.cloud.ibm.com/docs.
