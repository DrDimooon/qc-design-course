---
title: "Каты: практика с самопроверкой"
module: "Каты"
difficulty: "beginner/advanced"
duration: "~5 ч (все каты)"
status: "draft"
tags: [katas, practice, qiskit, exercises, self-check]
---

# Каты: практика с самопроверкой

Идея заимствована у [Microsoft Quantum Katas](https://github.com/microsoft/QuantumKatas):
это серии учебных упражнений «от простого к сложному» внутри одной темы, где каждое
задание нужно решить самому, а затем проверить правильность. Оригинальные каты устроены так:
каждая тема — отдельный модуль с последовательностью задач (первая может требовать одной строки,
последняя — заметного куска кода), для каждой задачи заранее приготовлен тест, который сначала
падает, а после вашего решения проходит; рядом лежат подсказки, эталонные решения и подробные разборы.

Здесь та же идея перенесена на наш стек и формат: вместо Q# и юнит-тестов — Qiskit 1.x/2.x
и самопроверка кодом в задачах (assert-проверки, сверка через `Operator.equiv`,
`Statevector` и counts от `AerSimulator`). Никакого фреймворка не требуется —
достаточно Python и Qiskit.

## Правила работы (важно)

1. **Сначала попытка, потом подсказка, и только потом ответ.** Точный принцип кат:
   открывать разбор без собственной попытки — вредно для обучения.
2. Копируйте код задачи в Jupyter или обычный `.py`-файл, дописывайте вместо `# TODO`,
   запускайте самопроверку, которая идёт сразу после задачи.
3. Самопроверка провалилась — перечитайте условие и подсказку (`<details>`), попробуйте снова.
4. Самопроверка прошла — переходите к следующей задаче. Задачи внутри каты нарастают по сложности
   и часто опираются на предыдущие.
5. Готовое и полное решение с объяснениями лежит в [tests/answers/](../answers/):
   [kata-01](../answers/kata-01.md), [kata-02](../answers/kata-02.md), [kata-03](../answers/kata-03.md),
   [kata-04](../answers/kata-04.md), [kata-05](../answers/kata-05.md). Структура ответов повторяет задачи 1:1.

## Список кат

| Kata | Тема | Сложность | Задачи |
|---|---|---|---|
| [kata-01-bell](kata-01-bell.md) | Белл, GHZ, телепортация | beginner | 4 |
| [kata-02-grover-2q](kata-02-grover-2q.md) | Гровер на 2–3 кубитах: оракул, диффузор, итерации | beginner/intermediate | 6 |
| [kata-03-qiskit-api](kata-03-qiskit-api.md) | API Qiskit: Operator, Statevector, Parameter, измерения | intermediate | 6 |
| [kata-04-transpile-tuning](kata-04-transpile-tuning.md) | transpile: уровни оптимизации, coupling_map, basis | intermediate/advanced | 6 |
| [kata-05-sabre-seeds](kata-05-sabre-seeds.md) | Sabre-маршрутизация: seeds, метрики, вариативность | advanced | 6 |

## Связь с основной программой

| Ката | Модуль курса | Уроки и лабы | Тест |
|---|---|---|---|
| kata-01 | [01 Основы](../../curriculum/01-quantum-basics/README.md) | [01-qubit-superposition](../../curriculum/01-quantum-basics/01-qubit-superposition.md), [02-gates-circuits](../../curriculum/01-quantum-basics/02-gates-circuits.md), [03-entanglement-measurement](../../curriculum/01-quantum-basics/03-entanglement-measurement.md), [lab-02](../../curriculum/02-programming/lab-02-first-circuit.md) | [01-quiz](../01-quiz.md) |
| kata-02 | [03 Алгоритмы](../../curriculum/03-algorithms/README.md) | [01-grover](../../curriculum/03-algorithms/01-grover.md), [lab-02 Шаг 2](../../curriculum/02-programming/lab-02-first-circuit.md) | [03-quiz](../03-quiz.md) |
| kata-03 | [02 Программирование](../../curriculum/02-programming/README.md) | [01-qiskit-intro](../../curriculum/02-programming/01-qiskit-intro.md), [02-gates-circuits-qiskit](../../curriculum/02-programming/02-gates-circuits-qiskit.md) | [02-quiz](../02-quiz.md) |
| kata-04 | [04 Проектирование систем](../../curriculum/04-systems-design/README.md) | [02-transpiler-internals](../../curriculum/04-systems-design/02-transpiler-internals.md), [lab-04](../../curriculum/04-systems-design/lab-04-platform-comparison.md) | [04-quiz](../04-quiz.md) |
| kata-05 | [04 Проектирование систем](../../curriculum/04-systems-design/README.md) | [03-routing-mapping-sabre](../../curriculum/04-systems-design/03-routing-mapping-sabre.md), [lab-05](../../curriculum/04-systems-design/lab-05-sabre-routing.md) | [04-quiz](../04-quiz.md) |

## Рекомендуемый порядок

kata-01 → kata-02 → kata-03 (базовые навыки построения и чтения схем), затем kata-04 → kata-05
(транспилятор и роутинг — ядро курса, модуль 04). Прохождение кат не заменяет модульные квизы,
а дополняет их: квиз проверяет понимание теории, ката — умение написать рабочий код.

## Технические заметки

- Стек: `pip install qiskit qiskit-aer`, Qiskit 1.x/2.x, современный API
  (`from qiskit import QuantumCircuit, transpile`, `from qiskit_aer import AerSimulator`;
  процедурный `execute()` не используется).
- Все схемы для самопроверки через `Statevector`/`Operator` — без измерений; измерения
  только в задачах, где проверяются counts.
- Формат задачи везде одинаковый: условие → код с `# TODO` → подсказка в `<details>` →
  самопроверка → ссылка на разбор в answers.
