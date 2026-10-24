---
title: "Модуль 04. Проектирование квантовых систем, компиляция и оптимизация"
module: "04 Проектирование систем"
difficulty: "advanced"
duration: "~36 ч по ROADMAP (5 уроков + 2 лабы + квиз/каты/повторения)"
status: "draft"
tags: [transpiler, sabre, coupling-map, noise-aware, co-design, routing, qubit-mapping]
---

# Модуль 04. Проектирование квантовых систем, компиляция и оптимизация (Systems Design, Compilation and Optimization)

Это ядро курса. До этого момента вы работали в «идеальном» мире: строили схемы модулями 02–03, считали глубину и верили, что любой кубит связан с любым. Между этим идеальным миром и криостатом лежит целый инженерный слой — архитектура устройства, компилятор, маппинг логических кубитов на физические, роутинг взаимодействий через ограниченный граф связей и учёт шума. Тот разрыв будем закрывать в этом модуле.

## Зачем это нужно: разрыв между алгоритмом и железом

Типичная фраза из модуля 03: «применим CNOT между кубитами 0 и 3». На реальном сверхпроводящем процессоре кубиты 0 и 3 могут быть не связаны вообще — тогда компилятор должен вставить SWAP-операции (каждая из которых — три CX с собственным вкладом в ошибку), выбрать, какой физический кубит получит логическое состояние, и сделать это так, чтобы итоговая схема уложилась во времена когерентности T1/T2. Итоговые результаты могут отличаться на десятки процентов точности между «наивной» компиляцией и грамотной — это и есть предмет модуля.

Пять больших вопросов модуля:

1. **Как устроено устройство** (урок 01): стек квантовой системы, топологии связности, физические метрики качества кубитов (T1/T2/1q-err/2q-err), NISQ vs fault-tolerant, модулярные архитектуры.
2. **Как устроен компилятор** (урок 02): внутренности transpiler Qiskit — DAG-схемы, PassManager, группы пассов, optimization_level 0–3, как писать свой пасс.
3. **Как компилятор решает задачу размещения** (урок 03): логические vs физические кубиты, вставка SWAP, NP-трудность, алгоритм SABRE и альтернативы, метрики качества (SWAP count, depth, 2q-gates, fidelity).
4. **Как компилятор учитывает шум** (урок 04): noise-aware layout/routing по свойствам backend, оптимизация под fidelity, error mitigation.
5. **Как проектировать архитектуру под приложение** (урок 05): co-design железа и софта, QAOA/QCNN-специфичные связности, quantum architecture search, компилятор как часть архитектуры.

## Карта урока

| № | Файл | Содержание | Время |
|---|------|------------|-------|
| 01 | [01-architecture-models.md](01-architecture-models.md) | Стек системы (algorithm → compiler → control → cryo/hardware → physics), топологии связности (all-to-all, heavy-hex, grid, модулярные), метрики качества, NISQ vs FT | ~2 ч |
| 02 | [02-transpiler-internals.md](02-transpiler-internals.md) | DAG-схемы, PassManager и StagedPassManager, группы пассов (init/layout/routing/translation/optimization/scheduling), optimization_level 0–3, собственные пассы, scheduling | ~2 ч |
| 03 | [03-routing-mapping-sabre.md](03-routing-mapping-sabre.md) | Задача qubit mapping и routing, NP-трудность, SABRE (bidirectional search, decay), сравнение алгоритмов, метрики качества компиляции | ~2 ч |
| 04 | [04-noise-aware-compilation.md](04-noise-aware-compilation.md) | Модель шума устройства, Target/properties бэкенда, noise-aware layout/routing, оптимизация под fidelity, ZNE/PEC/dynamical decoupling | ~2 ч |
| 05 | [05-architecture-optimization.md](05-architecture-optimization.md) | Co-design, QAOA/QCNN-специфичные связности, dynamic edges, quantum architecture search, circuit reduction, компилятор как часть архитектуры | ~2 ч |

## Лабы

| Лаба | Содержание |
|------|------------|
| [lab-04-platform-comparison.md](lab-04-platform-comparison.md) | QFT-8 / QAOA maxcut под line, heavy-hex и all-to-all; depth, финальные явные SWAP и 2q-инструкции, 5 seeds с оценкой разброса. Для Core без QAOA используйте часть QFT-8. Финальный SWAP-счёт не равен числу вставок роутера |
| [lab-05-sabre-routing.md](lab-05-sabre-routing.md) | Свой жадный router «руками» + сравнение с Qiskit SabreSwap; исследование параметров SabreSwap (heuristic, trials), график качество vs время, осмысление, когда важны детали реализации |

## Как проходить модуль

- Порядок: 01 → 02 → 03 → 04 → 05 → lab-04 → lab-05. Лабы опираются на текст уроков: lab-04 закрывает уроки 01–04, lab-05 — урок 03.
- Правило прогресса прежнее: урок → вопросы «Проверь себя» → тест → лаба. Не переходите к lab-04, пока не закрыт урок 04.
- Примеры проверены на **Qiskit 2.6.0**; окружение устанавливайте по [лабе 00](../00-fundamentals/lab-00-env-setup.md). `SabreSwap.trials` существовал до Qiskit 2.0; `swap_trials`/`layout_trials` — параметры **SabreLayout**, а не прежние имена `SabreSwap.trials`. Задавайте trials явно, поскольку значение по умолчанию зависит от доступных CPU. В Qiskit 2.x вместо удалённого `DynamicalDecoupling` используется `PadDynamicalDecoupling`.
- Закройте [Compiler Exit](../../tests/compiler-exit-exam.md) за ~90 минут перед capstone 01/04. Это часть существующего бюджета ~36 ч вместо части повторения, а не дополнительный модуль. [Полный final 00–06](../../tests/final-exam.md) — элективная проверка после соответствующих материалов.
- Научные статьи, на которые опирается модуль (все — на arxiv.org):
  - [arXiv:1809.02573](https://arxiv.org/abs/1809.02573) — SABRE: Tackling the Qubit Mapping Problem for NISQ-Era Quantum Devices (ASPLOS 2019);
  - [arXiv:2207.14482](https://arxiv.org/abs/2207.14482) — Domain-Specific Quantum Architecture Optimization;
  - [arXiv:2407.00736](https://arxiv.org/abs/2407.00736) — Quantum Circuit Synthesis and Compilation Optimization: Overview and Prospects;
  - [arXiv:2505.16891](https://arxiv.org/abs/2505.16891) — Quantum Compiler Design for Qubit Mapping and Routing: survey;
  - [arXiv:2502.14715](https://arxiv.org/abs/2502.14715) — Optimization Driven Quantum Circuit Reduction.

## Статус компетенций после модуля

- [ ] Формулируете pipeline компилятора Qiskit и пассовую модель.
- [ ] Объясняете, что такое layout и routing, почему задача NP-трудная и как работает SABRE.
- [ ] Считаете метрики качества компиляции (depth, SWAP count, 2q-gates, оценка fidelity) и сравниваете стратегии объективно.
- [ ] Пишете собственные трансформационные и аналитические пассы.
- [ ] Компилируете с учётом шума конкретного бэкенда и оцениваете вклад каждой компоненты ошибки.
- [ ] Аргументируете выбор связности под приложение и понимаете идею co-design.

## Матрица навыков, практики и проверки

Переход к самостоятельности стройте внутри существующих страниц: **разобранный пример → completion → самостоятельная задача → перенос**. В [уроке 02](02-transpiler-internals.md) («Как писать свой пасс») разберите готовый `TwoQubitProfile`, затем заполните вариант подсчёта/проверки самостоятельно. В [уроке 03](03-routing-mapping-sabre.md) («Мини-эксперимент: transpile + вариация seeds») разберите готовый прогон и дополните сбор метрик. Самостоятельный опыт — QFT-часть lab-04 или новый вход lab-05; перенос — тот же граф с другими ошибками из урока 04. Ссылки ниже ведут на страницы; названия разделов помогают найти соответствующие примеры и задания.

| Результат | Где учим (разобранный пример) | Где тренируем (completion → самостоятельно) | Где проверяем |
|---|---|---|---|
| Шесть стадий, AnalysisPass/TransformationPass | [02 — внутренности transpiler](02-transpiler-internals.md), «StagedPassManager: шесть этапов», «Как писать свой пасс» | Подсчёт 2q в пассе → свой вариант пасса с проверкой семантики | [Квиз 04](../../tests/04-quiz.md), В5–9; [Exit](../../tests/compiler-exit-exam.md), A1/B |
| Layout, routing, SABRE и конечная карта | [03 — routing/mapping](03-routing-mapping-sabre.md), «SABRE» и мини-эксперимент | Дополнение таблицы метрик → [lab-05](lab-05-sabre-routing.md), «Часть A. Свой жадный router» и «Часть B. Параметры SabreSwap» на новом входе | Квиз 04 В1–4; Exit A2/B; [проект 04](../../projects/04-qubit-mapper.md) |
| Семантика и объективное сравнение метрик | [lab-04](lab-04-platform-comparison.md), «Как читать метрики» | Разобранная таблица → «Расширенное задание: QFT-8» и собственный отчёт | Exit B/C/D; [проект 01](../../projects/01-transpiler-benchmark.md) |
| Target и шумовой proxy без подмены fidelity | [04 — noise-aware](04-noise-aware-compilation.md), «Как устройство видно из Qiskit: Target и свойства» | Дополнение score → те же рёбра с другими error rates (transfer) | Квиз 04 В10–13; Exit D3; анализ выбранного capstone |
| Выбор связности под workload | [01 — архитектуры](01-architecture-models.md), [05 — co-design](05-architecture-optimization.md) | QFT-часть lab-04 → обоснование выбора и его ограничений | Квиз 04 В14–16; Exit D1/D4; выводы capstone |

Для минимального Core-03 достаточно Grover/QFT: QAOA-часть lab-04 можно заменить её QFT-частью, а для нового входа lab-05 использовать малую статическую схему из 1q/2q-гейтов. Упоминания QEC и статей в обзоре не превращают их в предпосылки Exit. Контрольные артефакты — код проверок, сырые строки эксперимента и объяснение; одно чтение страницы не закрывает практический навык.

## ✅ Проверь себя

1. Перечислите пять слоёв стека квантовой системы от алгоритма до физики и объясните, что «теряется» на каждом переходе.
2. Почему all-to-all связность у ионных ловушек снимает проблему routing, но не снимает проблему компиляции в целом?
3. Что означает NP-трудность задачи qubit mapping и какие метрики используются вместо точного решения?
4. Чем error suppression (например, dynamical decoupling) отличается от error correction?

Пройдите [тест модуля 04](../../tests/04-quiz.md).

## Актуальность и применение (2024–2026)

- **Обзор 2025 года систематизирует qubit mapping/routing по трём платформам (сверхпроводники, ионы, нейтральные атомы) и выделяет solver-, heuristic- и ML-подходы** — [arXiv:2505.16891](https://arxiv.org/abs/2505.16891) — дополняет литературу модуля свежим срезом: центральный вывод совпадает с тезой уроков 03–04, а именно, mapping/routing стал самостоятельной областью исследования.
- **В ноябре 2025 IBM представила Nighthawk: 120 кубитов и 218 настраиваемых куплеров в квадратной решётке (+20% связности против Heron), цель — 5000 2q-гейтов** — [IBM Newsroom](https://newsroom.ibm.com/2025-11-12-ibm-delivers-new-quantum-processors,-software,-and-algorithm-breakthroughs-on-path-to-advantage-and-fault-tolerance) — связность графа прямо задаёт цену routing: лаба lab-05 и метрики уроков 03–04 — это ровно те измерения, на которых сравниваются поколения устройств.
- **В QDC 2024 IBM показала Flamingo: l-couplers, соединяющие два чипа Heron R2 кабелями до метра, с CNOT между чипами (~3.5% ошибка)** — [IBM Quantum Blog](https://www.ibm.com/quantum/blog/qdc-2024) — модулярные архитектуры из урока 01 перестают быть концепцией: топология связности превращается в композицию графов, и компилятор должен это учитывать.
- **В декабре 2024 Google Willow впервые показал surface code «ниже порога» (подавление логической ошибки Λ = 2.14 при росте дистанции) с real-time-декодером (63 мкс при цикле 1.1 мкс)** — [Nature](https://www.nature.com/articles/s41586-024-08449-y) — уточняет трасс уроков 04–05: разница между mitigation и коррекцией перестаёт быть теоретической, а real-time decoding требует со-дизайна классического слоя с железом.

## ➡️ Что дальше

Начните с урока [01 — Модели квантовых архитектур: стек, топологии, метрики качества](01-architecture-models.md). Общая логика курса — в [ROADMAP.md](../../ROADMAP.md), отметки о прогрессе — в [PROGRESS.md](../../PROGRESS.md).
