---
title: "Советы практиков: как работать удобно"
module: "Ресурсы"
difficulty: "beginner"
duration: "~1 ч чтения"
status: "draft"
tags: [tips, community, workflow]
---

# Советы практиков: цитаты и рабочие привычки

Это не ещё один каталог ссылок. Рядом с [articles.md](articles.md), [books.md](books.md), [papers.md](papers.md) и [tools.md](tools.md) лежит слой другого рода: **как работают люди, которые уже в поле**. Не «что нужно прочитать», а «как именно читать, как отлаживать цепь, как выбирать, во что верить, а во что — нет». Формат записи простой: реальный человек → что он сказал → как это применить у нас → в каком уроке курса это пригодится.

Все цитаты приведены дословно по оригиналу и проверены по ссылке. Русский перевод в скобках — наш (перевод наш), английский оригинал оставлен рядом, чтобы можно было сверить. Никаких «примерных» цитат и реконструкций: если фразу нельзя подтвердить первоисточником, её здесь нет.

---

## Как учить материал

### 1. Интервальное повторение превращает память из удачи в решение

> "Second, spaced-repetition testing gives you a guarantee you will remember the answer to the question. For the most part our memories work in a haphazard manner. We read or hear something interesting, and hope we remember it in future. **Spaced-repetition testing makes memory into a choice.**"
>
> «Во-вторых, тестирование с интервальным повторением даёт гарантию, что вы запомните ответ на вопрос. По большей части наша память работает как попало: мы читаем или слышим что-то интересное и надеемся, что вспомним это потом. **Тестирование с интервальным повторением превращает память из удачи в решение.**» (перевод наш)

— Эндрю Матучак и Майкл Нильсен, «Quantum Computing for the Very Curious», Quantum Country, 2019
Источник: <https://quantum.country/qcvc>

**Как это применить.** «Надёжно» в этой формулировке — не про математику, а про расписание: те же вопросы возвращаются через 5 дней, 2 недели, месяц, 2 месяца. Именно эту схему повторения мы развернули в карточках курса — [../tests/flashcards.md](../tests/flashcards.md) (сами карточки) и [../tests/flashcards-schedule.md](../tests/flashcards-schedule.md) (расписание и FSRS-параметры). Не пытайтесь «прочитать всё и запомнить»: после урока отложите 5 карточек и вернитесь к ним на следующий день.

### 2. Учиться надо не «всё подряд», а по спирали, ведущей к фронтиру

> "So, if you're just beginning your quantum information journey, then please start with my QIS I notes, which presuppose only linear algebra and a bit of classical algorithms (e.g., recurrence relations and big-O notation), and which self-containedly explain all the rules of QM, moving on to (e.g.) quantum circuits, density matrices, entanglement entropy, Wiesner's quantum money, QKD, quantum teleportation, the Bell inequality, interpretations of QM, the Shor 9-qubit code, and the algorithms of Deutsch-Jozsa, Bernstein-Vazirani, Simon, Shor, and Grover. **Master all that, and you'll be close to the quantum information research frontier of circa 1996.**"
>
> «Так что, если вы только начинаете путь в квантовую информатику, начните с моих конспектов QIS I: в них предполагается только линейная алгебра и немного классических алгоритмов, а правила квантовой механики объясняются полностью, после чего идут квантовые схемы, матрицы плотности, энтропия запутанности, квантовые деньги Визнера, QKD, квантовая телепортация, неравенство Белла, интерпретации КМ, 9-кубитный код Шора и алгоритмы Дойча—Йоцзы, Бернштейна—Вазирани, Саймона, Шора и Гровера. **Освоив всё это, вы будете близко к исследовательскому фронтиру квантовой информации circa 1996 года.**» (перевод наш)

— Скотт Ааронсон, «My Quantum Information Science II Lecture Notes: The wait is over!», Shtetl-Optimized, 31 августа 2022
Источник: <https://scottaaronson.blog/?p=6685>

**Как это применить.** Это не план «прочитать всё», а план слоёв: база → классика → современные алгоритмы. Практически то же самое делает порядок модулей курса, и в нём стоит держаться: [../README.md](../README.md) — маршрут от математики к системному проектированию, [../curriculum/01-quantum-basics/README.md](../curriculum/01-quantum-basics/README.md) — базовый слой, который Ааронсон рекомендует не пропускать. Самоконтроль после базы — [../tests/00-quiz.md](../tests/00-quiz.md).

---

## Как читать статьи и проверять результаты

### 3. NISQ — это ступень, а не поворотный момент; это снимает панику и хайп

> "We shouldn't expect NISQ to change the world by itself; instead it should be regarded as a step toward more powerful quantum technologies we'll develop in the future."
>
> «Мы не должны ожидать, что NISQ сама по себе изменит мир; напротив, её следует рассматривать как ступень к более мощным квантовым технологиям, которые мы разработаем в будущем.» (перевод наш)

— Джон Прескилл, «Quantum Computing in the NISQ era and beyond», §4.1 «The 50-qubit barrier», arXiv:1801.00862 (2018; журнальная версия: Quantum 2, 79)
Источник: <https://arxiv.org/abs/1801.00862>

**Как это применить.** Способ трезво оценивать любую новость про «квантовый прорыв»: спрашивайте не «что сделали», а «какая это ступень и к какой следующей она ведёт». Для алгоритмов это сразу даёт корректный масштаб ожиданий — [../curriculum/01-quantum-basics/04-algorithms-overview.md](../curriculum/01-quantum-basics/04-algorithms-overview.md) (что именно даёт ускорение, а что — нет), для железа — [../curriculum/05-hardware/README.md](../curriculum/05-hardware/README.md).

### 4. Результат на шумном устройстве надо именно проверять, а не «считать, что получилось»

> "We should also bear in mind that, because of the imperfect performance of NISQ technology, **it may be hard to validate that a quantum computer is really giving the right answer**. That's particularly true for the quantum simulation problems physicists are excited about. **So it's important for researchers to continue seeking better methods for verifying the output of a quantum computer.**"
>
> «Нам также следует иметь в виду, что из-за несовершенной производительности NISQ-технологии **может быть трудно проверить, что квантовый компьютер действительно выдаёт правильный ответ**. Это особенно верно для задач квантовой симуляции, которые физики так любят. **Поэтому важно, чтобы исследователи продолжали искать лучшие способы верификации выхода квантового компьютера.**» (перевод наш)

— Джон Прескилл, «Quantum Computing in the NISQ era and beyond», §6 «Quantum speedups?», arXiv:1801.00862
Источник: <https://arxiv.org/abs/1801.00862>

**Как это применить.** «Один результат с реального железа» — не доказательство корректности цепи. Проверяйте хотя бы на классическом симуляторе, сравнивайте с ожидаемым распределением, а не «получилось — значит, работает». Порядок работы с публикациями в курсе — в [../curriculum/06-publications/01-how-to-read-paper.md](../curriculum/06-publications/01-how-to-read-paper.md); практика запуска и разбора результатов — в [../curriculum/02-programming/lab-03-ibm-quantum-run.md](../curriculum/02-programming/lab-03-ibm-quantum-run.md).

### 5. Мотивация всего поля: природа не классическая

> "Nature isn't classical, dammit, and if you want to make a simulation of Nature, you'd better make it quantum mechanical, and by golly it's a wonderful problem because it doesn't look so easy."
>
> «Природа не классическая, чёрт возьми, и если хотите смоделировать природу, вам лучше сделать это квантовомеханически, и, ей-богу, это чудесная задача, потому что выглядит она не так-то просто.» (перевод наш)

— Ричард Фейнман, «Simulating Physics with Computers», Int. J. Theor. Phys. 21, 467–488 (1982)
Источник (оригинал, DOI): <https://doi.org/10.1007/BF02650179> — свободный текст цитаты: Джон Прескилл, «Quantum computing 40 years later», §1.1, <https://arxiv.org/abs/2106.10522>

**Как это применить.** Классическая симуляция квантовой системы ломается экспоненциально — и это не «недостаток наших компьютеров», а следствие устройства природы. Отсюда честная постановка задачи в модуле алгоритмов: [../curriculum/01-quantum-basics/04-algorithms-overview.md](../curriculum/01-quantum-basics/04-algorithms-overview.md) — что именно мы симулируем и почему для этого нужен квантовый компьютер.

### 6. Квантовый компьютер — не «тот же компьютер, только быстрее»

> "One of the misconceptions that a lot of people had in the early days of quantum computing, when I was talking to journalists and I think a lot of people still have, is that it's not the case that a quantum computer is just like a classical computer, only faster. **You need a new kind of algorithm to make quantum computers run faster.** And for a lot of problems, it's quite likely that such an algorithm doesn't actually exist."
>
> «Одно из заблуждений, которое было распространено в ранние дни квантовых вычислений, когда я говорил с журналистами и, я думаю, до сих пор есть у многих, — это убеждение, будто квантовый компьютер это просто классический компьютер, только быстрее. **Чтобы квантовые компьютеры работали быстрее, нужен новый тип алгоритма.** И для многих задач такого алгоритма, скорее всего, просто не существует.» (перевод наш)

— Питер Шор, подкаст MIT CSAIL Alliances с Уиллом Оливером (ведущий — Стив Льюис), 2022
Источник (PDF-транскрипт): <https://cap.csail.mit.edu/sites/default/files/session-pdfs/Peter%20Shor%20Will%20Oliver%20Podcast%20Export%204.pdf>

**Как это применить.** Проверка любой «квантовой новости»: если в ней не сказано, какой именно алгоритм даёт выигрыш и на какой задаче, — это не аргумент. Разбор того, что даёт ускорение, а что нет, — в [../curriculum/01-quantum-basics/04-algorithms-overview.md](../curriculum/01-quantum-basics/04-algorithms-overview.md); конкретика алгоритма Шора и его цены — в [../curriculum/03-algorithms/02-qft-shor.md](../curriculum/03-algorithms/02-qft-shor.md).

### 7. Не цепляйтесь за один внешний бенчмарк — смотрите под капот

> "Yes, sometimes emperors are naked—but you can't tell until you actually look at the emperor! **Engage with the specifics of quantum error correction.** If there's a reason why you think it can't work beyond a certain scale, say so. But don't fixate on one external benchmark and ignore everything happening under the hood, if the experts are telling you that under the hood is where all the action now is, and your preferred benchmark is only relevant later."
>
> «Да, иногда император действительно голый — но это можно установить, только если посмотреть на императора! **Разбирайтесь в конкретике квантовой коррекции ошибок.** Если у вас есть соображение, почему это не заработает за пределами некоторого масштаба, — выскажите его. Но не зацикливайтесь на одном внешнем бенчмарке и не игнорируйте то, что происходит под капотом, если эксперты говорят, что именно под капотом сейчас вся движуха, а ваш любимый бенчмарк станет важен позже.» (перевод наш)

— Скотт Ааронсон, «Before we start on quantum», Shtetl-Optimized, 7 апреля 2026
Источник: <https://scottaaronson.blog/?p=9668>

**Как это применить.** «Шор до сих пор факторизует только 15» — не аргумент против прогресса: один удобный внешний показатель не отражает состояния поля. Смотрите на то, что под капотом: порог, код, точность гейтов, размер кода. Порядок работы с публикациями в курсе — в [../curriculum/06-publications/01-how-to-read-paper.md](../curriculum/06-publications/01-how-to-read-paper.md), подборка работ с проверенными ссылками — в [papers.md](papers.md).

---

## Как писать квантовый код и проверять его

### 8. Отлаживай не «на глаз», а конкретным протоколом

> "There are a variety of strategies I use to debug these issues:
> - Read the rest of the error message closely. It will say *what* anticommuted, *where* it anticommuted, and *when* it anticommuted. All of these are useful hints.
> - See how much of the end of the circuit you can cut off. If `circuit[:20].detector_error_model()` fails, you know there's a problem in the first 20 instructions.
> - Make a `stim.Circuit.diagram` of the circuit and check that things look right.
> - Put the circuit into an interactive editor like crumble, that lets you track how Paulis propagate. Recreate the detector or observable in question and check it moves how you expect.
> - **Build up circuit generation tools that make it harder to make these mistakes in the first place.**"
>
> «Вот набор стратегий, которыми я пользуюсь при отладке таких ошибок: внимательно прочитать остаток сообщения об ошибке — оно скажет, *что* антикоммутировало, *где* и *когда*; отрезать конец цепи — если `circuit[:20].detector_error_model()` падает, проблема в первых 20 инструкциях; построить диаграмму цепи и проверить, что всё выглядит правильно; открыть цепь в интерактивном редакторе вроде crumble и проследить, как распространяются Паули; **и построить инструменты генерации цепей так, чтобы такие ошибки было труднее допустить в первую очередь.**» (перевод наш)

— Крейг Гидни (Google Quantum AI, автор Stim), ответ на вопрос «How to resolve ValueError: The circuit contains non-deterministic observables», Quantum Computing Stack Exchange, 2023
Источник: <https://quantumcomputing.stackexchange.com/questions/32769/how-to-resolve-valueerror-the-circuit-contains-non-deterministic-observables>

**Как это применить.** Последний пункт — самый практичный: код, который генерирует цепи, должен сам следить за индексами измерений и давать им человеческие имена. Начните с простой схемы в [../curriculum/02-programming/lab-02-first-circuit.md](../curriculum/02-programming/lab-02-first-circuit.md), а «самопроверку» оформляйте по формату кат: [../tests/katas/README.md](../tests/katas/README.md).

### 9. Проверяй результат независимой реализацией, а не «на слово»

> "The reason unitary gates are less likely to have mistakes is they're so easy to cross-check. There are a lot of simulators in stim (a tableau simulator, a graph simulator, a flip/frame simulator, a state vector simulator; not all exposed to python) and there's a lot of data about gates in stim (every gate specifies a hardcoded unitary matrix, tableau, and decomposition). **Stim has unit tests checking each simulator's implementation, and each gate's data, against each other.** A graph simulator is very different from a tableau simulator, you're likely to make different mistakes when writing them, so verifying that they agree on the behavior of circuits is a way of gaining confidence they are both correct."
>
> «Унитарные гейты реже содержат ошибки именно потому, что их легко перекрёстно проверять. В Stim много разных симуляторов (табличный, графовый, flip/frame, векторный), и для каждого гейта задано много данных (жёстко зашитая унитарная матрица, таблица и разложение). **В Stim есть юнит-тесты, сверяющие реализацию каждого симулятора и данные каждого гейта между собой.** Графовый симулятор устроен совсем не так, как табличный, — вы с разной вероятностью наделаете в них разные ошибки, поэтому проверка того, что они дают одинаковое поведение на цепях, и даёт уверенность в корректности обоих.» (перевод наш)

— Крейг Гидни, ответ на вопрос «How is stim validated», Quantum Computing Stack Exchange, 2025
Источник: <https://quantumcomputing.stackexchange.com/questions/41577/how-is-stim-validated>

**Как это применить.** Универсальный приём: один и тот же результат должен сходиться у двух независимых реализаций. Проверяйте свой код-симулятор, с одной стороны, против `StatevectorSampler` из Qiskit — с другой. Материал для сверки: [../curriculum/02-programming/02-gates-circuits-qiskit.md](../curriculum/02-programming/02-gates-circuits-qiskit.md) и [../tests/katas/kata-01-bell.md](../tests/katas/kata-01-bell.md).

---

## Как строить отношения с железом и экспериментами

### 10. Качество, а не количество кубитов

> "**We're focusing on quality, not just quantity** — because just producing larger numbers of qubits doesn't help if they're not high enough quality. With 105 qubits, Willow now has best-in-class performance across the two system benchmarks discussed above: quantum error correction and random circuit sampling. Such algorithmic benchmarks are the best way to measure overall chip performance."
>
> «**Мы делаем ставку на качество, а не просто на количество**, потому что само по себе производство большего числа кубитов не помогает, если качество недостаточно высокое. Со 105 кубитами Willow теперь показывает лучшие в классе показатели по двум системным бенчмаркам: квантовой коррекции ошибок и случайным схемам сэмплирования. Именно такие алгоритмические бенчмарки — лучший способ измерить производительность чипа в целом.» (перевод наш)

— Хартмут Невен (основатель и руководитель Google Quantum AI), «Meet Willow, our state-of-the-art quantum chip», Google Blog, 9 декабря 2024
Источник: <https://blog.google/technology/research/google-willow-quantum-chip/>

**Как это применить.** Не сравнивайте процессоры по числу кубитов: смотрите на точность гейтов, T1, и на то, что именно измеряет бенчмарк. Показатели, на которые стоит смотреть, разобраны в [../curriculum/05-hardware/05-benchmarking.md](../curriculum/05-hardware/05-benchmarking.md); почему «below threshold» важнее «105 кубитов» — в [../curriculum/03-algorithms/04-error-correction.md](../curriculum/03-algorithms/04-error-correction.md).

### 11. Избыточность коррекции определяется качеством элементов

> "As Peter described, quantum error correction is basically building resilience through redundancy. And **the amount of redundancy we need goes down if the fundamental constituent elements, individually, are better.** Put a bunch of kindergartners together and trying to do something that's resilient is really challenging. But putting a bunch of adults together in the same room, OK, there's a lot that we can accomplish."
>
> «Как сказал Питер, квантовая коррекция ошибок — это, по сути, построение устойчивости через избыточность. И **объём необходимой избыточности уменьшается, если фундаментальные элементы по отдельности лучше.** Собрать группу дошкольников вместе и пытаться сделать что-то устойчивое — по-настоящему трудно. А соберите группу взрослых в одной комнате — ну, тут можно свернуть горы.» (перевод наш)

— Уилл Оливер (MIT, Center for Quantum Engineering), подкаст MIT CSAIL Alliances с Питером Шором, 2022
Источник (PDF-транскрипт): <https://cap.csail.mit.edu/sites/default/files/session-pdfs/Peter%20Shor%20Will%20Oliver%20Podcast%20Export%204.pdf>

**Как это применить.** Прямая связь с архитектурой: чем лучше отдельные кубиты, тем меньше дополнительных кубитов нужно на коррекцию — а это и есть масштабируемость. Считайте накладные расходы при выборе кода в [../curriculum/03-algorithms/04-error-correction.md](../curriculum/03-algorithms/04-error-correction.md) и при выборе топологии в [../curriculum/04-systems-design/03-routing-mapping-sabre.md](../curriculum/04-systems-design/03-routing-mapping-sabre.md) (связность и маршрутизация — это тоже «избыточность»).

### 12. Классика вычислит не всё: грузите часть работы на неё

> "But performant hardware alone won't bring useful quantum computing: we need to provide value, which means advanced capabilities that our users can deploy frictionlessly."
>
> «Но одно только производительное железо не сделает квантовые вычисления полезными: нужно давать ценность, а это значит — передовые возможности, которые пользователь может применить без лишних усилий.» (перевод наш)
>
> "This middleware will incorporate the Circuit Knitting Toolbox, where circuit knitting is a technique incorporating classical computation to take on some of the computational burden of a quantum circuit to exceed what we can achieve with either alone."
>
> «Этот middleware включает Circuit Knitting Toolbox, где circuit knitting — это приём, в котором классические вычисления берут на себя часть вычислительной нагрузки квантовой цепи, чтобы выйти за пределы того, что достижимо каждым из них по отдельности.» (перевод наш)

— Джей Гамбетта (IBM Fellow, VP IBM Quantum), «Quantum-centric supercomputing: The next wave of computing», IBM Quantum Blog, 9 ноября 2022
Источник: <https://www.ibm.com/quantum/blog/next-wave-quantum-centric-supercomputing>

**Как это применить.** Не ждите отказоустойчивости, чтобы начать: классическая часть конвейера (транспиляция, mitigation, постобработка) делает часть работы за вас. Это ровно то, что вы делаете в [../curriculum/02-programming/lab-03-ibm-quantum-run.md](../curriculum/02-programming/lab-03-ibm-quantum-run.md), и то, над чем стоит подумать в модуле системного проектирования: [../curriculum/04-systems-design/02-transpiler-internals.md](../curriculum/04-systems-design/02-transpiler-internals.md) — что именно должно уйти на классику, а что на квантовый процессор.

---

## Ещё источники таких цитат

Здесь — только места, где стоит искать следующую порцию практических цитат. Часть из них уже использована выше; ничего из перечисленного в этот раз не цитируется.

- **Quantum Computing Stack Exchange** — <https://quantumcomputing.stackexchange.com/>. Крейг Гидни (<https://quantumcomputing.stackexchange.com/users/119/craig-gidney>) отвечает по отладке схем, QEC и симуляторам; там же практики из разных лабораторий.
- **Shtetl-Optimized (Скотт Ааронсон)** — <https://scottaaronson.blog/>. Помимо постов самого Ааронсона полезны комментарии: там отвечают коллеги по цеху (например, Крейг Гидни — по конспектам Ааронсона).
- **Algorithmic Assertions (Крейг Гидни)** — <https://algassert.com/>. Инженерные заметки по Stim, QEC, компиляции.
- **Quantum Country (Эндрю Матучак, Майкл Нильсен)** — <https://quantum.country/>. Кроме основного эссе <https://quantum.country/qcvc> там есть «How the quantum search algorithm works», «How quantum teleportation works» и «Quantum mechanics distilled».
- **Google Blog, раздел Quantum AI** — <https://blog.google/technology/research/google-willow-quantum-chip/> и далее посты команды Google Quantum AI.
- **IBM Quantum Blog** — <https://www.ibm.com/quantum/blog/>. Посты Ааронсона, Гамбетты и инженеров Qiskit; там же практические разборы ошибок и релизов.
- **MIT CSAIL Alliances (подкасты)** — транскрипты интервью с исследователями MIT; см. PDF-транскрипт с Питером Шором и Уиллом Оливером, использованный выше.
- **Джон Прескилл, «Quantum computing 40 years later»** — <https://arxiv.org/abs/2106.10522>. Обзор с цитатами первоисточников (в том числе Фейнмана) — удобный способ найти первоисточник цитаты.
- **Nature Reviews Physics, «40 years of quantum computing»** — <https://www.nature.com/articles/s42254-021-00410-6>. Исторический обзор; полезен, чтобы понять, кому принадлежит та или иная формулировка.

---

## Оценка применимости

- **Переводы наши.** Английский оригинал приведён дословно и сверялся с источником; русский текст в скобках — наш перевод, он не публиковался в первоисточнике.
- **Ссылки могут «высыхать».** Это живой веб: блоги и репозитории переезжают, Stack Exchange отдаёт автоматическим запросам 403 (открывается в браузере), адреса статей на blog.google меняются при переезде разделов. Если ссылка не открывается — ищите ту же речь в другом месте (для Прескилла и Фейнмана это arXiv-версии, для подкаста MIT — PDF-транскрипт), и сверяйте дату.
- **Проверяйте актуальность.** Статьи Ааронсона датированы, посты IBM и Google — датированы явно; подкаст MIT — 2022 год, blog.google — декабрь 2024. Если цитата противоречит тому, что вы видите в более свежем источнике, — более свежий источник прав, а цитата остаётся историческим свидетельством.
- **Не все советы применимы к вашей задаче.** Интервальное повторение и протокол отладки Гидни работают всегда; рекомендации по архитектуре железа актуальны для конкретного момента (декабрь 2024 для Willow) и требуют сверки с текущим состоянием поля.

---

## Примечания

- **Дата проверки ссылок: 20.10.2026.** Все внешние ссылки открыты и сверены с содержимым: arXiv-страницы (1801.00862, 2106.10522), DOI Фейнмана (10.1007/BF02650179), blog.google, IBM Quantum Blog, оба поста Shtetl-Optimized, PDF-транскрипт подкаста MIT CSAIL, Quantum Country, страницы Quantum Computing Stack Exchange.
- **Ответы Крейга Гидни на Stack Exchange** сверены через официальный Stack Exchange API (`api.stackexchange.com/2.3`), потому что сам сайт отдаёт автоматическим запросам 403; по API подтверждены и текст ответов, и их канонические URL.
- **Цитата Фейнмана** приведена в редакции Прескилла (он транскрибировал выступление 1981 года); оригинал — «Simulating Physics with Computers», Int. J. Theor. Phys. 21, 467–488 (1982), DOI 10.1007/BF02650179. Свободный текст с этой цитатой — в §1.1 статьи arXiv:2106.10522.
- **Цитаты Уилла Оливера и Питера Шора** взяты из PDF-транскрипта подкаста MIT CSAIL Alliances; формулировка Оливера про «дошкольников и взрослых» приведена дословно, вместе с её авторской синтаксической неловкостью.
- **Ничего не выдумано:** в файле нет ни одной цитаты, не подтверждённой первоисточником. Кандидаты, которые не прошли проверку, перечислены в отчёте к этой странице (Umesh Vazirani, Oskar Higgott, ряд постов IBM Quantum Blog без подтверждённого автора).
- **Перекрёстные ссылки внутри курса** даны относительными путями от каталога `resources/`: `../curriculum/...`, `../tests/...`, `../README.md`.
