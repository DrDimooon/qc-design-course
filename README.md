---
title: "QC: Проектирование и оптимизация квантовых компьютеров"
module: "Общее"
difficulty: "beginner"
duration: "~286 ч (полный курс)"
status: "draft"
tags: [quantum-computing, qiskit, curriculum, systems-design, optimization]
---

# QC: Проектирование и оптимизация квантовых компьютеров

[![CI](https://github.com/DrDimooon/qc-design-course/actions/workflows/check.yml/badge.svg)](https://github.com/DrDimooon/qc-design-course/actions/workflows/check.yml)
[![Сайт](https://img.shields.io/badge/сайт-онлайн-3f51b5)](https://drdimooon.github.io/qc-design-course/)
[![Лицензия: MIT](https://img.shields.io/badge/Лицензия-MIT-yellow.svg)](LICENSE)

Учебный репозиторий-курс, посвящённый проектированию и оптимизации квантовых компьютеров (quantum computing design and optimization): от линейной алгебры и основ Qiskit до внутренней работы транспилятора (transpiler), алгоритмов роутинга/маппинга Sabre и сопоставления аппаратных платформ.

> **Читать курс удобнее на сайте:** <https://drdimooon.github.io/qc-design-course/> — там формулы, схемы, врезки и интерактивные виджеты отрисовываются полностью. В этом репозитории лежат исходники `.md`, и их вид зависит от просмотрщика (GitHub, редактор), из-за чего часть формул может выглядеть иначе; правила совместимости — в [STYLEGUIDE.md](STYLEGUIDE.md).

> **Локальный просмотр с полным оформлением:** `python tools/build_site.py --serve` → <http://127.0.0.1:8000>. В редакторе картинки могут не показываться: относительные пути (`../../assets/…`) редакторы обычно разрешают от корня проекта, а не от папки файла.

## Что это и для кого

Курс построен вокруг двух треков:

1. **Трек «Разработка / архитектура / компиляция» (software/architecture)** — основной трек. Целевая аудитория: разработчики, системные инженеры, DevOps/компиляторные инженеры, которые уже умеют программировать на Python и хотят перейти в квантовые вычисления со стороны ПО: программирование цепей (circuits), компиляция под железо, оптимизация схем, обработка шума, проектирование архитектур квантовых систем.
2. **Трек «Физическая инженерия» (hardware)** — дополнительный трек для тех, кто хочет понять, «из чего состоит» квантовый компьютер: платформы кубитов, сверхпроводящие кубиты, ионные ловушки и нейтральные атомы, криогеника и техпроцессы, бенчмаркинг устройств.

Оба трека проходят общую базу (модули 00–03), затем расходятся: software/архитектурный трек углубляется в модуль 04 (ключевой, core-модуль «Оптимизация архитектуры и компиляция»), hardware-трек — в модуль 05. Для обоих треков есть общий практикум-модуль 06 «Разборы публикаций»: как читать и воспроизводить современные статьи (Anthropic, Google и т.п.) с проверкой чисел.

## Дерево репозитория

```text
QC/
├── README.md
├── ROADMAP.md
├── PROGRESS.md
├── INTERACTIVE.md
├── LICENSE
├── .gitignore
├── mkdocs.yml
├── assets/
│   ├── figures/
│   │   ├── bloch-sphere.png
│   │   ├── coupling-maps.png
│   │   ├── grover-iterations.png
│   │   ├── phase-circle.png
│   │   ├── qec-cycle.png
│   │   ├── surface-code-lattice.png
│   │   └── gif/
│   │       ├── bloch-rotation.gif
│   │       ├── grover-iterations.gif
│   │       └── qec-cycle.gif
│   ├── interactive/
│   │   ├── bloch-sphere.html
│   │   ├── circuit-playground.html
│   │   ├── grover-amplitude.html
│   │   ├── qec-cycle.html
│   │   └── two-qubit.html
│   ├── js/
│   │   ├── mermaid-init.js
│   │   ├── qc-core.js
│   │   ├── widget-bloch-sphere.js
│   │   ├── widget-circuit-playground.js
│   │   ├── widget-grover-amplitude.js
│   │   ├── widget-qec-cycle.js
│   │   └── widget-two-qubit.js
│   └── styles/
│       ├── admonitions.css
│       └── interactive.css
├── tools/
│   ├── build_site.py
│   ├── js/
│   │   └── qc-core.test.js
│   └── make_figures.py
├── curriculum/
│   ├── 00-fundamentals/
│   │   ├── README.md
│   │   ├── 01-linear-algebra.md
│   │   ├── 02-quantum-mechanics-basics.md
│   │   ├── 03-complex-signals-qubits.md
│   │   ├── lab-00-env-setup.md
│   │   └── problem-set-00.md        # аналитические задачи (без кода)
│   ├── 01-quantum-basics/
│   │   ├── README.md
│   │   ├── 01-qubit-superposition.md
│   │   ├── 02-gates-circuits.md
│   │   ├── 03-entanglement-measurement.md
│   │   └── 04-algorithms-overview.md
│   ├── 02-programming/
│   │   ├── README.md
│   │   ├── 01-qiskit-intro.md
│   │   ├── 02-gates-circuits-qiskit.md
│   │   ├── 03-transpilation-hardware.md
│   │   ├── 04-noise-simulation.md
│   │   ├── lab-02-first-circuit.md
│   │   └── lab-03-ibm-quantum-run.md
│   ├── 03-algorithms/
│   │   ├── README.md
│   │   ├── 01-grover.md
│   │   ├── 02-qft-shor.md
│   │   ├── 03-vqe-qaoa.md
│   │   ├── 04-error-correction.md
│   │   └── problem-set-03.md        # аналитические задачи (Гровер/Шор/QEC)
│   ├── 04-systems-design/
│   │   ├── README.md
│   │   ├── 01-architecture-models.md
│   │   ├── 02-transpiler-internals.md
│   │   ├── 03-routing-mapping-sabre.md
│   │   ├── 04-noise-aware-compilation.md
│   │   ├── 05-architecture-optimization.md
│   │   ├── lab-04-platform-comparison.md
│   │   └── lab-05-sabre-routing.md
│   ├── 05-hardware/
│       ├── README.md
│       ├── 01-qubit-platforms.md
│       ├── 02-superconducting-qubits.md
│       ├── 03-iontraps-neutral-atoms.md
│       ├── 04-cryogenics-fabrication.md
│       └── 05-benchmarking.md
│   └── 06-publications/
│       ├── README.md
│       ├── 01-how-to-read-paper.md
│       ├── 02-anthropic-efficient-circuits.md
│       └── 03-google-willow-qec.md
├── tests/
│   ├── 00-quiz.md
│   ├── 01-quiz.md
│   ├── 02-quiz.md
│   ├── 03-quiz.md
│   ├── 04-quiz.md
│   ├── 05-quiz.md
│   ├── certification-quiz.md
│   ├── final-exam.md
│   ├── flashcards.md                # 55 карточек для интервальных повторений
│   ├── flashcards-schedule.md       # расписание повторений + экспорт в Anki
│   ├── katas/                       # квантовые каты: задача -> попытка -> подсказка -> ответ
│   │   ├── README.md
│   │   ├── kata-01-bell.md
│   │   ├── kata-02-grover-2q.md
│   │   ├── kata-03-qiskit-api.md
│   │   ├── kata-04-transpile-tuning.md
│   │   └── kata-05-sabre-seeds.md
│   └── answers/                     # ключи ко всем квизам, катам и экзамену
├── resources/
│   ├── courses.md
│   ├── books.md
│   ├── papers.md
│   ├── video-lectures.md     # каталог видеолекций по модулям (48 позиций: 37 по модулям + 11 каналов)
│   ├── articles.md           # статьи и блоги по темам курса
│   ├── tools.md
│   ├── communities.md
│   └── practitioner-tips.md  # советы и рабочие приёмы от реальных людей (только проверенные ссылки)
└── projects/
    ├── README.md
    ├── 01-transpiler-benchmark.md
    ├── 02-grover-oracles.md
    ├── 03-vqe-h2.md
    ├── 04-qubit-mapper.md
    └── 05-kqcircuits-chip.md
```

## Быстрый старт

1. Установите Python 3.10+ (лучше — 3.11 или 3.12). Проверка: `python --version`.
2. Создайте виртуальное окружение (venv):

   ```bash
   python -m venv .venv
   # Windows (PowerShell)
   .venv\Scripts\Activate.ps1
   # Linux/macOS
   source .venv/bin/activate
   ```

3. Установите основной стек:

   ```bash
   pip install qiskit qiskit-ibm-runtime jupyter
   ```

   Примечание: пока устанавливаются только основные пакеты — `qiskit`, `qiskit-ibm-runtime` и `jupyter`. Дополнительные пакеты (например, расширения и инструменты визуализации) понадобятся позже; точные и актуальные команды установки — в лабе [curriculum/00-fundamentals/lab-00-env-setup.md](curriculum/00-fundamentals/lab-00-env-setup.md).
4. Полезные официальные ресурсы:
   - Qiskit документация: <https://docs.quantum.ibm.com>
   - IBM Quantum Platform: <https://quantum.ibm.com>

## Навигация по курсу

| Модуль | README модуля | Тест | Уровень |
|---|---|---|---|
| 00 — Фундамент (математика, механика, окружение) | [curriculum/00-fundamentals/README.md](curriculum/00-fundamentals/README.md) | [tests/00-quiz.md](tests/00-quiz.md) | beginner |
| 01 — Основы квантовых вычислений | [curriculum/01-quantum-basics/README.md](curriculum/01-quantum-basics/README.md) | [tests/01-quiz.md](tests/01-quiz.md) | beginner |
| 02 — Программирование на Qiskit | [curriculum/02-programming/README.md](curriculum/02-programming/README.md) | [tests/02-quiz.md](tests/02-quiz.md) | beginner/intermediate |
| 03 — Алгоритмы (Grover, QFT/Shor, VQE/QAOA, коррекция ошибок) | [curriculum/03-algorithms/README.md](curriculum/03-algorithms/README.md) | [tests/03-quiz.md](tests/03-quiz.md) | intermediate |
| 04 — Проектирование систем и оптимизация (core-модуль) | [curriculum/04-systems-design/README.md](curriculum/04-systems-design/README.md) | [tests/04-quiz.md](tests/04-quiz.md) | advanced |
| 05 — Гардвэйр: платформы и устройство | [curriculum/05-hardware/README.md](curriculum/05-hardware/README.md) | [tests/05-quiz.md](tests/05-quiz.md) | intermediate/advanced |
| 06 — Разборы публикаций (практикум, оба трека) | [curriculum/06-publications/README.md](curriculum/06-publications/README.md) | — (критерии внутри уроков) | advanced |

В frontmatter (поле `module`) модули подписаны короткими метками — `00 Основы`, `01 Квантовые основы`, `02 Программирование`, `03 Алгоритмы`, `04 Проектирование систем`, `05 Железо`, `06 Разборы публикаций`; это тот же порядок, что и в `curriculum/`, а названия в таблице выше — читательские заголовки разделов. Вне модулей метки вида `Тесты`, `Каты`, `Проекты`, `Сертификация`, `Итоговый` означают тип материала.

Дополнительно: [проекты](projects/README.md), [тесты и экзамен](tests/00-quiz.md) (оглавление тестов начинается с 00-quiz), [ресурсы](resources/courses.md) — включая каталоги [видеолекций](resources/video-lectures.md), [статей и блогов](resources/articles.md), страницу [советов практиков](resources/practitioner-tips.md), [стил-гайд оформления](STYLEGUIDE.md) (таксономия визуальных блоков и правила плотности) и [CONTRIBUTING.md](CONTRIBUTING.md) (как предлагать правки). Итоговые проверки: [tests/certification-quiz.md](tests/certification-quiz.md) и [tests/final-exam.md](tests/final-exam.md). Публикация репозитория и сайта — по инструкции в [PUBLISHING.md](PUBLISHING.md).

## Как учиться

Порядок прохождения: **00 → 01 → 02 → 03** — общая база для обоих треков. Дальше треки расходятся: это два разных маршрута с разными обязательными и дополнительными модулями.

**Маршрут «Разработка / архитектура / компиляция»** (основной):

- ядро маршрута: база 00–03 (~120 ч) → **модуль 04 — «Проектирование систем» (~58 ч); он про проектирование и компиляцию, и именно для этого маршрута он обязательный**;
- после ядра: модуль 06, разборы публикаций (~10 ч); финальный итог с capstone-проектами — до ~286 ч (суммы по всем урокам — в [ROADMAP.md](ROADMAP.md));
- проекты: обязательный — [01-transpiler-benchmark](projects/01-transpiler-benchmark.md); выберите ещё любой по вкусу.

**Маршрут «Физическая инженерия» / hardware** (~170 ч minimum):

- общая база: 00 → 01 → 02 → 03 (та же, ~120 ч);
- ядро маршрута — модуль 05 «Железо» (~40 ч); модуль 04 для этого трека — дополнительный (обязательство — только [01-обзор транспилятора](curriculum/04-systems-design/02-transpiler-internals.md) и [03-routing](curriculum/04-systems-design/03-routing-mapping-sabre.md) на минимальной глубине, чтобы понимать, как карта чипа попадает в код);
- после ядра: модуль 06, разборы публикаций (~10 ч);
- проекты: [03-vqe-h2](projects/03-vqe-h2.md) и/или [05-kqcircuits-chip](projects/05-kqcircuits-chip.md).

Итог по сумме часов каждого урока — в [ROADMAP.md](ROADMAP.md).

- Правило прогресса: **урок → локальные вопросы урока («Проверь себя») → [лаба/проект по модулю](projects/README.md)**. Модульные квизы ([tests/00-quiz.md](tests/00-quiz.md) … [05-quiz.md](tests/05-quiz.md)) проходите **в конце модуля**, когда все его уроки закрыты — вопрос квиза может опираться на материал нескольких уроков, а не только предыдущего урока; для контроля шага урока достаточно его локальных вопросов.
- Второй контур закрепления — интервальные повторения по колоде [flashcards.md](tests/flashcards.md) (метод Quantum Country: 20 карточек в сессию, расписание и экспорт в Anki — в [flashcards-schedule.md](tests/flashcards-schedule.md)). В модулях 00 и 03 дополнительно есть аналитические problem sets без кода: [problem-set-00](curriculum/00-fundamentals/problem-set-00.md), [problem-set-03](curriculum/03-algorithms/problem-set-03.md).
- Практика «маленькими глотками» — квантовые каты в стиле Microsoft Quantum Katas: [tests/katas/README.md](tests/katas/README.md): 5 кат (Bell, Гровер на 2 кубитах, API Qiskit, настройка transpile, seeds Sabre); внутри каждой каты — задачи с TODO-кодами, подсказками и решениями в answers.
- Отслеживайте прогресс в [PROGRESS.md](PROGRESS.md): отмечайте выполненные уроки, лабы, тесты и проекты чек-боксами.
- Ориентир по плану и вехам — [ROADMAP.md](ROADMAP.md).

## Интерактив и визуализации

Курс — не только текст. В ключевых уроках модулей 00–03 есть раздел `## Интерактив` с браузерными симуляторами (10 уроков, честная карта — в [INTERACTIVE.md](INTERACTIVE.md)), которые считают настоящую квантовую математику (амплитуды, синдромы, вероятности); плюс схемы потоков в Mermaid и готовые иллюстрации с анимациями.

| Виджет | Что показывает | Где полезен |
|---|---|---|
| Сфера Блоха | состояние одного кубита, действие гейтов X/Y/Z/H/S/T и поворотов Раби, фаза и вероятности | модули 00, 01 |
| Два кубита | запутанность, конкорренс, корреляции при измерении | модуль 01 |
| Конструктор схем | сборка схемы кликами, вектор состояния, диаграмма вероятностей и гистограмма измерений | модули 01, 02, 03 |
| Цикл коррекции ошибок | 3-кубитный код: внедрение X-ошибки, измерение синдромов, декодирование и исправление | модуль 03 |
| Амплитуды и Гровер | интерференция и рост вероятности нахождения отмеченного элемента | модули 01, 03 |

Всё работает офлайн и без внешних зависимостей: общая библиотека `assets/js/qc-core.js` (покрыта тестами `node tools/js/qc-core.test.js`), стили — `assets/styles/interactive.css`, иллюстрации и анимации перегенерируются скриптом `python tools/make_figures.py`. Подробности и инструкция по расширению — в [INTERACTIVE.md](INTERACTIVE.md).

## Как собрать сайт (опционально)

Репозиторий подготовлен для сборки статического сайта при помощи MkDocs + Material. Контент лежит в корне (удобно читать на GitHub), а MkDocs требует, чтобы каталог с документами был подчинён каталогу конфига, поэтому сборка идёт через скрипт:

```bash
pip install mkdocs mkdocs-material
python tools/build_site.py            # сборка в ./site
python tools/build_site.py --serve    # локальный предпросмотр: http://127.0.0.1:8000
```

Конфигурация — [mkdocs.yml](mkdocs.yml) (тема `material`, язык интерфейса `ru`, поддержка схем Mermaid и формул MathJax).

## Эталонные источники (что перенято)

Репозиторий собран не на пустом месте — при доработке сверялся с шестью альтернативами:

| Источник | Что взято |
|---|---|
| [awesome-quantum-computing](https://github.com/desireevl/awesome-quantum-computing) | канонические обзоры в `resources/papers.md`, книги и свободные лекции в `books.md`, сообщества (PennyLane Forum, QWorld, QOSF) в `communities.md` |
| [Microsoft Quantum Katas](https://github.com/microsoft/QuantumKatas) | принцип кат «задача → попытка → подсказка → ответ» — папка `tests/katas/` (5 кат) |
| [IBM Quantum Learning / docs Qiskit](https://docs.quantum.ibm.com) | сверка API и фактов (`transpile` уровни, Runtime, primitives) в модулях 02 и 04 и в certification-quiz |
| [quantumcomputingcourses.com](https://quantumcomputingcourses.com) | каталогизация курсов и инструментов: тип, время, сертификат, соответствие модулям в `resources/` |
| Университетские курсы (Preskill Ph219, MIT 8.371, Stanford CS269Q) | аналитические problem sets в модулях 00 и 03, rubric-чекпоинты в проектах 01–03 |
| [Quantum Country](https://quantumcountry.com) | флеш-карты с интервальными повторениями: `tests/flashcards.md` (55 карточек) + расписание и экспорт в Anki |

## Планируемые улучшения

- Юпитер-ноутбуки к каждой лабе и кате с авторскими разборами.
- Автоматизированные тесты решений (pytest) для проектов и кат.
- Градуер для кат: проверка assert-цепочек из continuous integration (GitHub Actions).
- Углублённые кейсы по noise-aware компиляции и бенчмаркингу транспилятора.

## Лицензия

Курс распространяется по лицензии MIT — см. [LICENSE](LICENSE).
