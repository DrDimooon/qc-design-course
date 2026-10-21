---
title: "Статьи и блоги по темам курса"
module: "Ресурсы"
difficulty: "all"
duration: "справочник"
status: "draft"
tags: [quantum-computing, articles, blogs, education, resources]
---

# Статьи и блоги по темам курса

Понятные (не arXiv-препринты) статьи и блог-посты, привязанные к модулям курса: IBM Quantum blog, Google Research blog, MIT News, Quanta Magazine, блоги Quantinuum, Princeton, Scott Aaronson, Quantum Country (Matuschak/Nielsen), документация Qiskit. Препринты и научные статьи — в [papers.md](papers.md), книги — в [books.md](books.md).

## Модуль 00 — Математика и квантовая механика

| Тема (модуль) | Статья | Автор/Источник | Что внутри | Ссылка | Статус |
| --- | --- | --- | --- | --- | --- |
| 00 Ввод в квантовые вычисления | «Quantum Computing for the Very Curious» | Andy Matuschak, Michael Nielsen / Quantum Country | Интерактивное эссе с интервальным повторением: амплитуды, интерференция, измерение и схемы объясняются «с нуля», без физического багажа | <https://quantum.country/qcvc> | Проверено |
| 00 Мифы о параллелизме | «Quantum Computing Promises New Insights, Not Just Supermachines» (эссе NYT + пост) | Scott Aaronson / Shtetl-Optimized | Разбор популярного заблуждения «квантовый компьютер пробует все ответы параллельно»; роль интерференции амплитуд; зачем вообще изучать квантовые вычисления | <https://scottaaronson.blog/?p=871> | Проверено |
| 00 Что такое квантовая инженерия | «Explained: Quantum engineering» | Daniel Ackerman / MIT News | Объяснение с нуля: биты против кубитов, суперпозиция, декогеренция, сравнение сверхпроводников и ионных ловушек, зачем нужны инженерные компромиссы | <https://news.mit.edu/2020/explained-quantum-engineering-1210> | Проверено |

## Модуль 01 — Кубиты, гейты, запутанность

| Тема (модуль) | Статья | Автор/Источник | Что внутри | Ссылка | Статус |
| --- | --- | --- | --- | --- | --- |
| 01 Запутанность пояснительно | «Entanglement Made Simple» | Frank Wilczek / Quanta Magazine | Объяснение запутанности сначала на «классических c-ons» (вымышленный пример с формами и цветами), затем подтверждение и GHZ-эффект | <https://www.quantamagazine.org/entanglement-made-simple-20160428/> | Проверено |
| 01 Запутанность как ресурс | «Pioneering Quantum Physicists Win Nobel Prize in Physics» | Charlie Wood / Quanta Magazine | Прозрачный пересказ Bell/Aspect/Clauser/Zeilinger: что такое ЭПР, как измеряют запутанность, квантовая телепортация, «коин-флип»-интуиция | <https://www.quantamagazine.org/pioneering-quantum-physicists-win-nobel-prize-in-physics-20221004/> | Проверено |

## Модуль 02 — Qiskit и программирование

| Тема (модуль) | Статья | Автор/Источник | Что внутри | Ссылка | Статус |
| --- | --- | --- | --- | --- | --- |
| 02 Обзор стека Qiskit | «Simplified quantum software development with Qiskit» (итоги 2024) | Blake Johnson и др. / IBM Quantum blog | SDK 1.0 и стабильный релизный цикл, V2-примитивы Estimator/Sampler, fake-бэкенды, Qiskit addons, Functions Catalog, Transpiler Service и Code Assistant с примерами кода | <https://www.ibm.com/quantum/blog/dev-tools> | Проверено |
| 02 Сравнение SDK и производительность | «Qiskit leads quantum SDKs in performance, testing shows» | Paul Nation и др. / IBM Quantum blog | Открытый бенчмарк Benchpress (более 1000 тестов) на сборку и транспиляцию цепей: Qiskit в 13 раз быстрее TKET при транспиляции и на 24% меньше двухкубитных гейтов; введение LightSABRE | <https://www.ibm.com/quantum/blog/qiskit-performance> | Проверено |

## Модуль 03 — Алгоритмы (Grover, Shor, VQE/QAOA, QEC)

| Тема (модуль) | Статья | Автор/Источник | Что внутри | Ссылка | Статус |
| --- | --- | --- | --- | --- | --- |
| 03 QEC: рождение логического кубита | «Suppressing quantum errors by scaling a surface code logical qubit» | Hartmut Neven, Julian Kelly / Google Research blog | Доступное объяснение surface code и первой демонстрации, что увеличение кода снижает ошибку логического кубита; что такое threshold | <https://research.google/blog/suppressing-quantum-errors-by-scaling-a-surface-code-logical-qubit/> | Проверено |
| 03 Shor и факторизация | «Toward a code-breaking quantum computer» | Adam Zewe / MIT News | Как алгоритм Шора 1994 года «ломает» RSA; улучшение Regev и гибрид MIT (Fibonacci-метод, два регистра памяти, устойчивость к шуму) | <https://news.mit.edu/2024/toward-code-breaking-quantum-computer-0823> | Проверено |

## Модуль 04 — Компиляция, оптимизация, SABRE (ядро курса)

| Тема (модуль) | Статья | Автор/Источник | Что внутри | Ссылка | Статус |
| --- | --- | --- | --- | --- | --- |
| 04 Как устроен транспилятор | «How Does The Qiskit Transpiler Work?» | Qiskit / Medium | Шаги транспилятора: DAG-представление, проходы (passes), компоновка (layout), роутинг, синтез — механика, которую мы допиливаем в проекте 4-Qubit Mapper | <https://medium.com/qiskit/how-does-the-qiskit-transpiler-work-6710863beaac> | Не проверено (Medium отдаёт 403 ботам, ссылка найдена через поиск по карточке статьи) |
| 04 optimization levels на практике | «Compare transpiler settings» (документация-гайд) | IBM Quantum documentation | Живой пример: цепь с оракулом Гровера, сравнение optimization_level 0 против 3 по числу двухкубитных гейтов и результату на реальном железе; плюс dynamical decoupling | <https://quantum.cloud.ibm.com/docs/guides/circuit-transpilation-settings> | Проверено |
| 04 AI-проходы транспилятора | «Optimize quantum circuits with AI-powered transpiler passes» | David Kremer и др. / IBM Quantum blog | Объяснение RL-подхода к AIRouting и AI-синтезу, кодовые примеры на `qiskit-transpiler-service`, средний −42% двухкубитных гейтов против эвристик | <https://www.ibm.com/quantum/blog/ai-transpiler-passes> | Проверено |
| 04 Couplers: Heron, Flamingo, Nighthawk | «IBM Quantum delivers on performance challenge made two years ago» (QDC 2024) | Jay Gambetta, Ryan Mandelbaum / IBM Quantum blog | Heron R2 на 156 кубитов с перестраиваемыми couplers, демонстрация l-couplers на IBM Quantum Flamingo (две микросхемы Heron R2, CNOT между чипами) и m-couplers на Crossbill | <https://www.ibm.com/quantum/blog/qdc-2024> | Проверено |
| 04 Архитектура для FTQC и компиляция под неё | «How IBM will build the world's first large-scale, fault-tolerant quantum computer» | Ryan Mandelbaum, Jay Gambetta и др. / IBM Quantum blog | bivariate bicycle codes и gross-код, LPU и universal adapters, c-/l-/m-couplers, план Loon, Kookaburra, Cockatoo, Nighthawk и Starling; внимание к компиляции под сильно связанную топологию | <https://www.ibm.com/quantum/blog/large-scale-ftqc> | Проверено |

## Модуль 05 — Железо, платформы, криогеника, бенчмаркинг

| Тема (модуль) | Статья | Автор/Источник | Что внутри | Ссылка | Статус |
| --- | --- | --- | --- | --- | --- |
| 05 Willow и порог QEC | «Meet Willow, our state-of-the-art quantum chip» | Hartmut Neven / Google blog | Willow (105 кубитов): первое «below threshold» — ошибка падает вдвое при переходе 3x3, 5x5, 7x7 ячеек; random circuit sampling и почему важна именно точность, а не только число кубитов | <https://blog.google/technology/research/google-willow-quantum-chip/> | Проверено |
| 05 Helios (Quantinuum) | «Introducing Helios: The Most Accurate Quantum Computer in the World» | Quantinuum technical blog | Ионная ловушка QCCD: 98 кубитов бария, полная связность любой пары кубитов, первый коммерческий ионный junction, коррекция ошибок в реальном времени, лидерство по RCS-бенчмарку | <https://www.quantinuum.com/blog/introducing-helios-the-most-accurate-quantum-computer-in-the-world> | Проверено |
| 05 Тантал-кремниевые transmon (Princeton) | «Princeton's new quantum chip built for scale» | Alaina O'Regan / Princeton Engineering | Как тантал вместо алюминия и кремний вместо сапфира подняли время когерентности transmon к 1,68 мс (около 1 мс в устройстве: в 15 раз больше индустриального стандарта); почему материалы — главный ограничитель | <https://engineering.princeton.edu/news/2025/11/05/princetons-new-quantum-chip-built-for-scale> | Проверено |
| 05 Платформа-дорожная карта IBM | «How IBM will build the world's first large-scale, fault-tolerant quantum computer» | Ryan Mandelbaum, Jay Gambetta и др. / IBM Quantum blog | Модульные микросхемы (c-, l- и m-couplers), упаковка и управляющая электроника, Starling и декодеры (Relay-BP) — архитектура, которая задаёт требования к железу модуля 05 | <https://www.ibm.com/quantum/blog/large-scale-ftqc> | Проверено |

## Примечания

- Дата проверки: 18.10.2026. Все ссылки проверены автоматическим переходом с чтением содержимого, кроме той, что помечена «Не проверено» (Medium блокирует ботов со статусом 403; статья подтверждена через поисковую выдачу и карточку блога Qiskit).
- Ссылка на Princeton ведёт на сайт инженерного факультета (engineering.princeton.edu); основной URL на princeton.edu отдавал 403, тот же материал доступен по факультетскому адресу, содержимое идентично.
- Отобраны только статьи в жанре «объяснение», а не препринты: оригинальные научные статьи (Nature-публикации Willow, Princeton, gross-кода) упомянуты здесь лишь косвенно и живут в [papers.md](papers.md).
- Для модуля 04 намеренно смешаны формат блога (IBM Quantum blog, Qiskit Medium) и живой гайд документации Qiskit: гайд «Compare transpiler settings» — готовый сценарий для лаборатории 04 (transpile-tuning).
- Статья «How IBM will build...» включена дважды намеренно: в модуль 04 (компиляция под модульную архитектуру) и в модуль 05 (платформа и железо).
- Статья про Helios датирована 05.11.2025; Quantinuum обновляет блог часто — при переиздании сверьте заголовок «Introducing Helios».
