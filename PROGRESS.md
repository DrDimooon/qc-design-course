---
title: "PROGRESS: трекер прохождения курса"
module: "Общее"
difficulty: "beginner"
duration: "—"
status: "draft"
tags: [progress, tracking]
---

# PROGRESS

Правило отмечать проект: ставьте `- [x]` только после того, как: (1) урок прочитан, (2) соответствующий квиз пройден, (3) лаба/проект фактически выполнена. Подробнее о порядке прохождения — в [README.md](README.md) и [ROADMAP.md](ROADMAP.md).

## Модуль 00 — Фундамент

- [ ] [README модуля](curriculum/00-fundamentals/README.md)
- [ ] [01-linear-algebra](curriculum/00-fundamentals/01-linear-algebra.md)
- [ ] [02-quantum-mechanics-basics](curriculum/00-fundamentals/02-quantum-mechanics-basics.md)
- [ ] [03-complex-signals-qubits](curriculum/00-fundamentals/03-complex-signals-qubits.md)
- [ ] [Лаба: lab-00-env-setup](curriculum/00-fundamentals/lab-00-env-setup.md)
- [ ] [Problem set: analytic 00](curriculum/00-fundamentals/problem-set-00.md)
- [ ] [Тест: 00-quiz](tests/00-quiz.md)

## Модуль 01 — Основы квантовых вычислений

- [ ] [README модуля](curriculum/01-quantum-basics/README.md)
- [ ] [01-qubit-superposition](curriculum/01-quantum-basics/01-qubit-superposition.md)
- [ ] [02-gates-circuits](curriculum/01-quantum-basics/02-gates-circuits.md)
- [ ] [03-entanglement-measurement](curriculum/01-quantum-basics/03-entanglement-measurement.md)
- [ ] [04-algorithms-overview](curriculum/01-quantum-basics/04-algorithms-overview.md)
- [ ] [Тест: 01-quiz](tests/01-quiz.md)

## Модуль 02 — Программирование на Qiskit

- [ ] [README модуля](curriculum/02-programming/README.md)
- [ ] [01-qiskit-intro](curriculum/02-programming/01-qiskit-intro.md)
- [ ] [02-gates-circuits-qiskit](curriculum/02-programming/02-gates-circuits-qiskit.md)
- [ ] [03-transpilation-hardware](curriculum/02-programming/03-transpilation-hardware.md)
- [ ] [04-noise-simulation](curriculum/02-programming/04-noise-simulation.md)
- [ ] [Лаба: lab-02-first-circuit](curriculum/02-programming/lab-02-first-circuit.md)
- [ ] [Лаба: локальная репетиция Runtime](curriculum/02-programming/lab-03-ibm-quantum-run.md) — QPU-запуск дополнительный
- [ ] [Тест: 02-quiz](tests/02-quiz.md)

## Модуль 03 — Алгоритмы

- [ ] [README модуля](curriculum/03-algorithms/README.md)
- [ ] [01-grover](curriculum/03-algorithms/01-grover.md)
- [ ] [02-qft-shor](curriculum/03-algorithms/02-qft-shor.md)
- [ ] [03-vqe-qaoa](curriculum/03-algorithms/03-vqe-qaoa.md) — elective; раздел QAOA нужен для capstone 01
- [ ] [04-error-correction](curriculum/03-algorithms/04-error-correction.md) — elective
- [ ] [Problem set: analytic 03](curriculum/03-algorithms/problem-set-03.md) — A1–A4 в Core, остальное elective
- [ ] [Тест: 03-quiz](tests/03-quiz.md) — 1–7 и 16 в Core; остальные после соответствующих уроков

## Модуль 04 — Проектирование систем и оптимизация (core)

- [ ] [README модуля](curriculum/04-systems-design/README.md)
- [ ] [01-architecture-models](curriculum/04-systems-design/01-architecture-models.md)
- [ ] [02-transpiler-internals](curriculum/04-systems-design/02-transpiler-internals.md)
- [ ] [03-routing-mapping-sabre](curriculum/04-systems-design/03-routing-mapping-sabre.md)
- [ ] [04-noise-aware-compilation](curriculum/04-systems-design/04-noise-aware-compilation.md)
- [ ] [05-architecture-optimization](curriculum/04-systems-design/05-architecture-optimization.md)
- [ ] [Лаба: lab-04-platform-comparison](curriculum/04-systems-design/lab-04-platform-comparison.md)
- [ ] [Лаба: lab-05-sabre-routing](curriculum/04-systems-design/lab-05-sabre-routing.md)
- [ ] [Тест: 04-quiz](tests/04-quiz.md)
- [ ] [Compiler Exit: локальная выпускная проверка](tests/compiler-exit-exam.md) — перед capstone 01/04

## Модуль 05 — Гардвэйр

- [ ] [README модуля](curriculum/05-hardware/README.md)
- [ ] [01-qubit-platforms](curriculum/05-hardware/01-qubit-platforms.md)
- [ ] [02-superconducting-qubits](curriculum/05-hardware/02-superconducting-qubits.md)
- [ ] [03-iontraps-neutral-atoms](curriculum/05-hardware/03-iontraps-neutral-atoms.md)
- [ ] [04-cryogenics-fabrication](curriculum/05-hardware/04-cryogenics-fabrication.md)
- [ ] [05-benchmarking](curriculum/05-hardware/05-benchmarking.md)
- [ ] [Тест: 05-quiz](tests/05-quiz.md)

## Модуль 06 — Разборы публикаций

- [ ] [README модуля](curriculum/06-publications/README.md)
- [ ] [01-how-to-read-paper](curriculum/06-publications/01-how-to-read-paper.md)
- [ ] [02-anthropic-efficient-circuits](curriculum/06-publications/02-anthropic-efficient-circuits.md)
- [ ] [03-google-willow-qec](curriculum/06-publications/03-google-willow-qec.md)
- [ ] [Самостоятельная проверка другой статьи](curriculum/06-publications/01-how-to-read-paper.md) — факультативный перенос навыка
- [ ] [Ключи к урокам модуля 06](curriculum/06-publications/answers/README.md) — ответы вынесены из уроков в отдельные файлы (по схеме tests/answers)

## Итоговые тесты

- [ ] [Промежуточная проверка Qiskit API](tests/certification-quiz.md)
- [ ] [Compiler Exit — Core + Compiler](tests/compiler-exit-exam.md)
- [ ] [Полный экзамен 00–06](tests/final-exam.md) — после соответствующих элективов

## Каты и флеш-карты

- [ ] [Kata 01: Bell](tests/katas/kata-01-bell.md)
- [ ] [Kata 02: Grover на 2 кубитах](tests/katas/kata-02-grover-2q.md)
- [ ] [Kata 03: API Qiskit](tests/katas/kata-03-qiskit-api.md)
- [ ] [Kata 04: настройка transpile](tests/katas/kata-04-transpile-tuning.md)
- [ ] [Kata 05: seeds Sabre](tests/katas/kata-05-sabre-seeds.md)
- [ ] [Флеш-карты: первая сессия (методика — в [tests/katas/README.md](tests/katas/README.md) и [расписании повторений](tests/flashcards-schedule.md))](tests/flashcards.md)
- [ ] [Расписание повторений заведено](tests/flashcards-schedule.md)

## Проекты

- [ ] [01-transpiler-benchmark](projects/01-transpiler-benchmark.md)
- [ ] [02-grover-oracles](projects/02-grover-oracles.md)
- [ ] [03-vqe-h2](projects/03-vqe-h2.md)
- [ ] [04-qubit-mapper](projects/04-qubit-mapper.md)
- [ ] [05-kqcircuits-chip](projects/05-kqcircuits-chip.md)

## 🎛 Интерактив

- [ ] [Сфера Блоха: гейты и фаза](assets/interactive/bloch-sphere.html) — модули 00, 01
- [ ] [Два кубита: запутанность и корреляции](assets/interactive/two-qubit.html) — модуль 01
- [ ] [Конструктор схем](assets/interactive/circuit-playground.html) — модули 01, 02, 03
- [ ] [Цикл коррекции ошибок](assets/interactive/qec-cycle.html) — модуль 03
- [ ] [Амплитуды и Гровер](assets/interactive/grover-amplitude.html) — модули 01, 03
- [ ] Пройдены интерактивные задания во всех уроках с разделом `## Интерактив` (см. [INTERACTIVE.md](INTERACTIVE.md))

## Ресурсы

- [ ] [courses.md](resources/courses.md)
- [ ] [books.md](resources/books.md)
- [ ] [papers.md](resources/papers.md)
- [ ] [video-lectures.md](resources/video-lectures.md)
- [ ] [articles.md](resources/articles.md)
- [ ] [tools.md](resources/tools.md)
- [ ] [communities.md](resources/communities.md)
- [ ] [practitioner-tips.md](resources/practitioner-tips.md)

Планы развития материалов — в [ROADMAP.md](ROADMAP.md#развитие-курса).
