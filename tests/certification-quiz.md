---
title: "Qiskit API readiness — промежуточная проверка"
module: "Промежуточная проверка"
difficulty: "intermediate"
duration: "~25 мин"
status: "draft"
tags: [quiz, qiskit, api, primitives, aer, algorithms, intermediate-check]
---

# Qiskit API readiness — промежуточная проверка

**Инструкция:** ключи с ответами и объяснениями лежат в [tests/answers/certification.md](answers/certification.md).
**Сначала попробуй сам** — это промежуточная проверка практических знаний Qiskit: API схем и измерений, примитивы, симуляторы и базовые алгоритмы. Замечание по охвату: последние вопросы — связки с соседними модулями (В13 — алгоритмы, Гровер; В14 — readout-ошибка из железа); контент вопросов не меняется, просто это соседние темы, а не API-вопросы.

> **Дисклеймер.** Это внутренняя проверка курса. Она **не является** сертификацией IBM, не воспроизводит и не копирует официальные экзаменационные вопросы. Название файла `certification-quiz.md` сохранено для совместимости старых ссылок; публичный заголовок — «Qiskit API readiness / промежуточная проверка». Официальные программы сертификации IBM и их статус см. на сайте IBM Training (актуальный статус проверяйте у IBM — мы его здесь не утверждаем).

Версия Qiskit: 1.x/2.x (V2-примитивы, BackendV2).

## Вопрос 1
qc = QuantumCircuit(2); qc.measure_all(). Что произойдёт?
- A. Ошибка: нет классических битов
- B. Добавится регистр 'meas' на 2 бита, плюс барьер, и оба кубита будут измерены
- C. Измеряется только q0
- D. Схема будет заменена на измерительную (входные гейты удалены)

## Вопрос 2
qc.measure([0, 1], [1, 0]) — что произойдёт?
- A. q0 → c1 и q1 → c0 (сопоставление по позициям)
- B. q0 → c0 и q1 → c1
- C. Ошибка: индексы не совпадают
- D. Оба кубита замеряются в c0

## Вопрос 3
transpile(qc, backend, optimization_level=3, seed_transpiler=42). Зачем здесь seed_transpiler?
- A. Задать число кубитов
- B. Включить шумовую модель
- C. Для воспроизводимости стохастических этапов (layout/routing), чтобы повторный вызов давал ту же схему
- D. Чтобы компилятор работал быстрее

## Вопрос 4
Какие значения optimization_level допустимы в preset-конвейере Qiskit 1.x/2.x?
- A. только 0
- B. 1–5
- C. −1…4
- D. 0…3

## Вопрос 5
job = sampler.run(pubs); result = job.result(). Как правильно достать counts (схема паба включает measure_all)?
- A. job.result()[0].data.meas.get_counts()
- B. job.get_counts()
- C. job.result().quasi_dists
- D. Результат приходит только после job.wait_for_result(timeout=...) вручную

## Вопрос 6
estimator_job = estimator.run(pubs); result = estimator_job.result(). Какие поля содержит result[0].data для одного параметризованного паба?
- A. 'meas'
- B. 'statevector'
- C. 'transpiled'
- D. 'evs' (оценка ожидания) и 'stds' (стандартное отклонение)

## Вопрос 7
result = AerSimulator().run(qc_no_measurements).result(); result.get_counts() — что произойдёт?
- A. Полный словарь всех базовых состояний с амплитудами
- B. Пустой результат или кидание ошибки — Counts подходят только после измерений
- C. Случайные counts
- D. Statevector'ом, переведённым в hex

## Вопрос 8
Как корректно построить Statevector из квантовой схемы (без measurements)?
- A. Statevector.from_instruction(qc)
- B. qc.counts()
- C. transpile(qc, shots=1024)
- D. qc.statevector()

## Вопрос 9
qc.cx(0, 1) — какой аргумент контроль?
- A. Оба кубита
- B. Первый (q0) — q0 управление, q1 цель
- C. Второй (q1)
- D. Зависит от бэкенда

## Вопрос 10
Counts содержит ключ '01'. Как расшифровать (2 кубита)?
- A. q0 = 0, q1 = 1
- B. Зависит от order бэкенда
- C. q0 = 1, q1 = 0 (little-endian: строка читается q1q0)
- D. Это hex '0x1'

## Вопрос 11
Что правильное при первом подключении к Qiskit Runtime?
- A. QiskitRuntimeService.save_account(token="...", channel="ibm_quantum_platform", overwrite=True), затем QiskitRuntimeService() возвращает настроенный service
- B. Каждый раз вставлять токен строкой в код
- C. Хранить токен в публичном репозитории
- D. Токен вообще не нужен — достаточно pip install qiskit-ibm-runtime

## Вопрос 12
PrimitiveJob — какие методы реально доступны?
- A. .status() и .result()
- B. .pulse() и .open()
- C. .frame() и .waveform()
- D. .noise() и .draw_pulse()

## Вопрос 13
Сколько итераций Гровера нужно для n = 3 (N = 8) при одном помеченном элементе?
- A. 0
- B. Примерно 2 (π/4·√8 ≈ 2.2 → обычно берут 2)
- C. 8
- D. 64

## Вопрос 14
Какой тип ошибки характеризует асимметричную матрицу считывания, где '1' чаще читается как '0' (из-за релаксации T1 в момент замера)?
- A. Readout error
- B. Coherent unitary error
- C. Ошибка транспиляции схемы
- D. Исключительно crosstalk

## Вопрос 15
*Открытый вопрос:* что выведет get_counts() после кода ниже (симулятор без шума, 1000 выстрелов, точность примерная)?
qc = QuantumCircuit(2, 2)
qc.h(0)
qc.measure([0,1], [0,1])
Ответ кратко: ________

## Разбор сложных мест
Частые ошибки промежуточной проверки: полагать, что measure_all использует существующие классические биты (в Qiskit 1.x он создаёт новый регистр 'meas'); забыть little-endian порядок при чтении counts; перепутать Sampler (counts/quasi-probabilities) и Estimator (expectation values). Также не путайте seed_transpiler и seed_simulator — первый фиксирует стохастичность компиляции, второй — стохастичность семплирования.
