---
title: "QC: Проектирование и оптимизация квантовых компьютеров"
module: "Общее"
difficulty: "beginner"
duration: "~110–140 ч (core-маршрут); ~286 ч (все элективы)"
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

**Сколько это займёт.** Курс разделён на три слоя (подробно — в [ROADMAP.md](ROADMAP.md#три-слоя-курса)):

| Слой | Что входит | Ориентир |
|---|---|---:|
| **Core** | модули 00–02 + выбранный минимум модуля 03 | ~60–75 ч |
| **Compiler track** | модуль 04 + **один** capstone-проект | ~50–65 ч |
| **Core + compiler** | обязательный маршрут software/compiler | **~110–140 ч** |
| **Electives** | расширенный 03, модуль 05, остальные проекты, разборы публикаций | сколько угодно |
| **Full curriculum** | всё вместе, включая все 5 проектов | ~286 ч |

Цифра **~286 ч — это «все материалы курса», а не обязательная программа**. Обязательный минимум для software/compiler-маршрута — **~110–140 ч**: он зависит от того, какой объём модуля 03 вы выберете (он же частично пересекается с capstone). Точные суммы по модулям и проектам — в [ROADMAP.md](ROADMAP.md), а не «на глаз».

Курс построен вокруг двух треков:

1. **Трек «Разработка / архитектура / компиляция» (software/architecture)** — основной трек. Целевая аудитория: разработчики, системные инженеры, DevOps/компиляторные инженеры, которые уже умеют программировать на Python и хотят перейти в квантовые вычисления со стороны ПО: программирование цепей (circuits), компиляция под железо, оптимизация схем, обработка шума, проектирование архитектур квантовых систем.
2. **Трек «Физическая инженерия» (hardware)** — дополнительный трек для тех, кто хочет понять, «из чего состоит» квантовый компьютер: платформы кубитов, сверхпроводящие кубиты, ионные ловушки и нейтральные атомы, криогеника и техпроцессы, бенчмаркинг устройств.

Оба трека проходят общую базу (модули 00–02 + выбранный минимум модуля 03), затем расходятся: software/архитектурный трек углубляется в модуль 04 (ключевой, core-модуль «Оптимизация архитектуры и компиляция»), hardware-трек — в модуль 05. Для обоих треков есть общий практикум-модуль 06 «Разборы публикаций»: он входит в elective-часть — разобрать 2 статьи и воспроизвести часть расчёта (Anthropic, Google Willow) с проверкой чисел.

**Что проверяется и чем.** Перед модулем 00 — короткая [входная диагностика](tests/diagnostic-00.md) (15 вопросов) с маршрутами пропуска. Итоговые проверки — [промежуточная проверка Qiskit API](tests/certification-quiz.md) и [итоговый экзамен](tests/final-exam.md); масштаб и честная рамка каждой описаны в самих файлах.

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
│   ├── diagnostic-00.md             # входная диагностика перед модулем 00 (15 вопросов + skip-маршруты)
│   ├── certification-quiz.md        # публично: «Qiskit API readiness / промежуточная проверка»
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
│   └── answers/                     # ключи ко всем квизам, катам, диагностике и экзамену
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

1. Установите Python 3.11. Именно на 3.11 тестировался курс; другие версии могут работать, но не гарантируются. Проверка: `python --version`.
2. Создайте виртуальное окружение (venv):

   ```bash
   python -m venv .venv
   # Windows (PowerShell)
   .venv\Scripts\Activate.ps1
   # Linux/macOS
   source .venv/bin/activate
   ```

3. Установите зависимости из [requirements-lock.txt](requirements-lock.txt) — это снимок основного стека, проверенный 24.10.2026 на Windows x64 / Python 3.11.9:

   ```bash
   python -m pip install -r requirements-lock.txt
   ```

   Основные версии: **Qiskit 2.6.0, Aer 0.17.2, Runtime 0.50.0, NumPy 2.3.5, SciPy 1.16.3**. [requirements.txt](requirements.txt) задаёт ограниченные диапазоны для проверки обновлений (`python -m pip install --upgrade -r requirements.txt`), но не фиксирует снимок. Jupyter, сборка сайта, Nature/PySCF и Stim/PyMatching устанавливаются отдельно для нужных материалов. Подробнее — в лабе [настройки окружения](curriculum/00-fundamentals/lab-00-env-setup.md).
4. Перед модулем 00 пройдите [входную диагностику](tests/diagnostic-00.md) — она покажет, какие уроки модуля 00 можно пропустить.
5. Полезные официальные ресурсы:
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
| 06 — Разборы публикаций (практикум, elective) | [curriculum/06-publications/README.md](curriculum/06-publications/README.md) | — (критерии внутри уроков) | advanced |

**Проверки:** [входная диагностика 00](tests/diagnostic-00.md) — перед модулем 00; модульные квизы — после соответствующих уроков; [промежуточная проверка Qiskit API](tests/certification-quiz.md) — после 02 с вопросами-мостами к соседним модулям (не сертификация IBM). Сокращённый Core + compiler подтверждается выбранными проверками 00–04 и одним capstone по общей рубрике. [Полный итоговый экзамен](tests/final-exam.md) охватывает 00–06 и предполагает также аппаратные темы и разбор публикаций: он не обязателен для сокращённого маршрута.

В frontmatter (поле `module`) модули подписаны короткими метками — `00 Основы`, `01 Квантовые основы`, `02 Программирование`, `03 Алгоритмы`, `04 Проектирование систем`, `05 Железо`, `06 Разборы публикаций`; это тот же порядок, что и в `curriculum/`, а названия в таблице выше — читательские заголовки разделов. Вне модулей метки вида `Тесты`, `Каты`, `Проекты`, `Промежуточная проверка`, `Итоговый` означают тип материала (бывшая метка `Сертификация` теперь читается как `Промежуточная проверка`).

Дополнительно: [проекты](projects/README.md), [тесты и экзамен](tests/00-quiz.md), [ресурсы](resources/courses.md), [видеолекции](resources/video-lectures.md), [статьи и блоги](resources/articles.md), [советы практиков](resources/practitioner-tips.md), [стил-гайд оформления](STYLEGUIDE.md) и [CONTRIBUTING.md](CONTRIBUTING.md). Порядок кубитов и измерительных битов задаёт [CONVENTIONS.md](CONVENTIONS.md): кет $|q_{n-1}\ldots q_0\rangle$; для **двух** кубитов левый множитель `np.kron` относится к `q1`. Публикация сайта — по [PUBLISHING.md](PUBLISHING.md).

## Как учиться

Порядок прохождения: **00 → 01 → 02 → 03** — общая база. Дальше треки расходятся. Перед стартом пройдите [входную диагностику](tests/diagnostic-00.md): она покажет, какие уроки модуля 00 можно пропустить.

**Маршрут «Разработка / архитектура / компиляция»** (основной, ~110–140 ч):

- ядро (~60–75 ч): 00 → 01 → 02, затем из модуля 03 — уроки [01-grover](curriculum/03-algorithms/01-grover.md) и [02-qft-shor](curriculum/03-algorithms/02-qft-shor.md) + вопросы **1–7 и 16** [квиза 03](tests/03-quiz.md). Для benchmark-проекта добавьте раздел QAOA урока 03. Полный [problem-set-03](curriculum/03-algorithms/problem-set-03.md), VQE и QEC — elective. Точный мини-набор — в [ROADMAP.md](ROADMAP.md#мини-набор-для-core-03);
- compiler track (~50–65 ч): **модуль 04 + один capstone**. Полный бюджет 04 — ~36 ч (уроки, 2 лабы, квиз, повторения); сокращённый путь (~18 ч, без полной lab-04) — в [ROADMAP.md](ROADMAP.md#сокращённый-путь-compiler-трека-без-полной-лабы-04). Проект: [01-transpiler-benchmark](projects/01-transpiler-benchmark.md) (~30 ч) или [04-qubit-mapper](projects/04-qubit-mapper.md) (~28 ч);
- elective (по желанию): уроки 03/04 модуля 03 и полный problem-set-03, модуль 05, модуль 06, проекты 02/03/05. Тогда каталог доходит до полных ~286 ч;
- проекты: обязательный — **один** (01 или 04), остальные — элективы.

**Маршрут «Физическая инженерия» / hardware** (элективный):

- общая база: та же, что в основном маршруте (~60–75 ч);
- ядро маршрута — модуль 05 «Железо» (~30 ч); модуль 04 для этого трека — дополнительный (обязательство — только [02-обзор транспилятора](curriculum/04-systems-design/02-transpiler-internals.md) и [03-routing](curriculum/04-systems-design/03-routing-mapping-sabre.md) на минимальной глубине, чтобы понимать, как карта чипа попадает в код);
- после ядра: модуль 06, разборы публикаций (~8–10 ч), плюс проект [05-kqcircuits-chip](projects/05-kqcircuits-chip.md) или [03-vqe-h2](projects/03-vqe-h2.md).

Планировочные бюджеты по модулям, состав Core-03 и сокращённый путь compiler-трека — в [ROADMAP.md](ROADMAP.md#три-слоя-курса).

- Правило прогресса: **урок → локальные вопросы урока («Проверь себя») → [лаба/проект по модулю](projects/README.md)**. Модульные квизы ([tests/00-quiz.md](tests/00-quiz.md) … [05-quiz.md](tests/05-quiz.md)) проходите **в конце модуля**, когда все его уроки закрыты — вопрос квиза может опираться на материал нескольких уроков, а не только предыдущего урока; для контроля шага урока достаточно его локальных вопросов.
- Второй контур закрепления — интервальные повторения по колоде [flashcards.md](tests/flashcards.md) (метод Quantum Country: 20 карточек в сессию, расписание и экспорт в Anki — в [flashcards-schedule.md](tests/flashcards-schedule.md)). В модулях 00 и 03 дополнительно есть аналитические problem sets без кода: [problem-set-00](curriculum/00-fundamentals/problem-set-00.md), [problem-set-03](curriculum/03-algorithms/problem-set-03.md).
- Практика «маленькими глотками» — квантовые каты в стиле Microsoft Quantum Katas: [tests/katas/README.md](tests/katas/README.md): сейчас 5 кат (Bell, Гровер на 2 кубитах, API Qiskit, настройка transpile, seeds Sabre); внутри каждой каты — задачи с TODO-кодами, подсказками и решениями в answers. Расширение до 12–15 кат — в [планах развития](ROADMAP.md#развитие-курса).
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
| [IBM Quantum Learning / docs Qiskit](https://docs.quantum.ibm.com) | сверка API и фактов (шесть стадий transpile, Runtime, primitives) в модулях 02 и 04 и в промежуточной проверке Qiskit API |
| [quantumcomputingcourses.com](https://quantumcomputingcourses.com) | каталогизация курсов и инструментов: тип, время, сертификат, соответствие модулям в `resources/` |
| Университетские курсы (Preskill Ph219, MIT 8.371, Stanford CS269Q) | аналитические problem sets в модулях 00 и 03, rubric-чекпоинты в проектах 01–03 |
| [Quantum Country](https://quantumcountry.com) | флеш-карты с интервальными повторениями: `tests/flashcards.md` (55 карточек) + расписание и экспорт в Anki |

## Планируемые улучшения

Планы развития — в [ROADMAP.md](ROADMAP.md#развитие-курса):

- Юпитер-ноутбуки к каждой лабе и кате с авторскими разборами.
- Автоматизированные тесты решений (pytest) для проектов и кат; CI-прогон исполняемых примеров покрывает ключевые примеры (smoke), а не полный набор сниппетов.
- Градуер для кат: проверка assert-цепочек из continuous integration (GitHub Actions).
- Углублённые кейсы по noise-aware компиляции и бенчмаркингу транспилятора.
- Расширение кат до 12–15 (сейчас 5).

### Что уже проверяется автоматически

```bash
python -X utf8 tools/check_examples.py
python -X utf8 tools/test_example_blocks.py
python -X utf8 tools/test_publication.py
node tools/js/qc-core.test.js
node tools/js/qc-playground.test.js
python tools/check_docs.py --selftest
python tools/check_docs.py --quiet
```

`check_examples.py` запускает непосредственно **14 блоков Markdown** с комментарием `# qc: executable`: каждый в новом Python-процессе, с тайм-аутом 90 секунд и `DeprecationWarning` как ошибкой. Контракты в `assert` проверяют порядок битов, Bell/Гровера, QFT, локальный Runtime Sampler, multi-IR, динамическую схему, лабы 04/05, H₂ и RB. Дополнительные проверки гоняют жадный router на малом корпусе схем, включая незанятые физические провода.

`test_example_blocks.py` проверяет сам механизм извлечения и запуска **без установки Qiskit**: незакрытая ограда, потерянный блок, ошибка вычисления и deprecated API не должны превратиться в молчаливый пропуск. Для ключевых файлов зафиксирован минимальный состав примеров — удаление метки обнаруживается в CI.

Это всё ещё **не все фрагменты курса**. В CI `course-stable` устанавливает lock-файл, а рекомендательный `course-latest` проверяет новые версии внутри разрешённых диапазонов. QPU-задания и необязательные Nature/PySCF-примеры автоматически не запускаются.

## Лицензия

Курс распространяется по лицензии MIT — см. [LICENSE](LICENSE).
