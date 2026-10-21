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
| [lab-04-platform-comparison.md](lab-04-platform-comparison.md) | Одна схема (QFT-8 / QAOA maxcut), транспиляция под 3 топологии (линейная, heavy-hex, all-to-all), замер depth / SWAP / 2q-gates (SWAP считается при базисе с гейтом `swap` — иначе он декомпозируется в CX и не виден), 5 seed'ов с усреднением, сравнение таблицей |
| [lab-05-sabre-routing.md](lab-05-sabre-routing.md) | Свой жадный router «руками» + сравнение с Qiskit SabreSwap; исследование параметров SabreSwap (heuristic, trials), график качество vs время, осмысление, когда важны детали реализации |

## Как проходить модуль

- Порядок: 01 → 02 → 03 → 04 → 05 → lab-04 → lab-05. Лабы опираются на текст уроков: lab-04 закрывает уроки 01–04, lab-05 — урок 03.
- Правило прогресса прежнее: урок → вопросы «Проверь себя» → тест → лаба. Не переходите к lab-04, пока не закрыт урок 04.
- Все примеры кода рассчитаны на **Qiskit ≥ 2.0** (проверено на 2.6.0; `pip install qiskit qiskit-ibm-runtime`, см. [лабу 00](../00-fundamentals/lab-00-env-setup.md)). Отдельные фрагменты версионно-зависимы и помечены в тексте: `SabreSwap(..., trials=...)` существует только начиная с Qiskit 2.0 (в 1.x те же настройки назывались `swap_trials`/`layout_trials`), а пасс `DynamicalDecoupling` в Qiskit 2.x удалён — используйте `PadDynamicalDecoupling`.
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
