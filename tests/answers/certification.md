---
title: "Ответы: Qiskit API readiness — промежуточная проверка"
module: "Промежуточная проверка"
difficulty: "intermediate"
duration: "~4 мин"
status: "draft"
tags: [answers, qiskit, api, intermediate-check]
---

# Ответы: Qiskit API readiness — промежуточная проверка

Ключ к [tests/certification-quiz.md](../certification-quiz.md).

## Вопрос 1
**Ответ: B.** measure_all() создаёт недостающий classical register 'meas' (по биту на кубит), ставит барьер и мерит все кубиты. Ошибки из-за отсутствия классических битов не будет.
_Урок: [../../curriculum/02-programming/README.md](../../curriculum/02-programming/README.md)._

## Вопрос 2
**Ответ: A.** Аргументы measure сопоставляются попарно по позициям: первый список — кубиты, второй — классические биты. [0, 1] → [1, 0] означает q0→c1, q1→c0.
_Урок: [../../curriculum/02-programming/README.md](../../curriculum/02-programming/README.md)._

## Вопрос 3
**Ответ: C.** Layout/SABRE и прочие стохастические этапы зависят от случайного seed'а; seed_transpiler делает компиляцию воспроизводимой. Токены и скорость программы ни при чём.
_Урок: [../../curriculum/02-programming/README.md](../../curriculum/02-programming/README.md)._

## Вопрос 4
**Ответ: D.** Допустимые значения стандартного пресета — 0, 1, 2, 3: от минимального до более дорогого поиска оптимизаций. Номер не гарантирует ни минимальную глубину, ни лучшее качество; сравнивайте метрики вместе со временем компиляции. Имена и размещение пассов зависят от версии и плагинов — источник подробностей: [каноническое описание транспилятора](../../curriculum/04-systems-design/02-transpiler-internals.md).
_Урок: [../../curriculum/04-systems-design/02-transpiler-internals.md](../../curriculum/04-systems-design/02-transpiler-internals.md)._

## Вопрос 5
**Ответ: A.** Стандартный V2-путь: result[0].data.meas.get_counts(), где 'meas' — имя регистра (конкретно при measure_all). Поля quasi_dists — от старого V1 Sampler.
_Урок: [../../curriculum/02-programming/README.md](../../curriculum/02-programming/README.md)._

## Вопрос 6
**Ответ: D.** Estimator V2 возвращает оценки: result[0].data.evs (значения) и .stds (неопределенности). 'meas' — поле Sampler, а не Estimator.
_Урок: [../../curriculum/02-programming/README.md](../../curriculum/02-programming/README.md)._

## Вопрос 7
**Ответ: B.** Counts — это статистика измерений; у схемы без классических битов (или без измерений) их нет, и get_counts() кидает QiskitError. «Случайные counts» — не вариант симулятора.
_Урок: [../../curriculum/02-programming/README.md](../../curriculum/02-programming/README.md)._

## Вопрос 8
**Ответ: A.** Statevector.from_instruction(qc) — стандартный способ достать амплитуды из схемы без измерений. Метода qc.statevector() у QuantumCircuit нет.
_Урок: [../../curriculum/02-programming/README.md](../../curriculum/02-programming/README.md)._

## Вопрос 9
**Ответ: B.** В `cx(control, target)` первый аргумент — управление, второй — цель: у `cx(0, 1)` управляет `q0`, меняется `q1`. В базисе $|q_1 q_0\rangle$ обмениваются $|01\rangle$ (индекс 1) и $|11\rangle$ (индекс 3), а $|00\rangle$ и $|10\rangle$ неизменны. Это не зависит от бэкенда; матрица и соглашение — в [CONVENTIONS.md](../../CONVENTIONS.md).
_Урок: [../../curriculum/01-quantum-basics/02-gates-circuits.md](../../curriculum/01-quantum-basics/02-gates-circuits.md)._

## Вопрос 10
**Ответ: C.** Little-endian: правый бит — q0, строка читается как q1q0. '01' означает q0 = 1, q1 = 0. (Hex-форма '0x1' — лишь альтернативная запись того же числа.)
_Урок: [../../curriculum/02-programming/README.md](../../curriculum/02-programming/README.md)._

## Вопрос 11
**Ответ: A.** save_account сохраняет токен локально (overwrite=True нужен при обновлении); далее QiskitRuntimeService() использует сохранённую конфигурацию. Вставлять токен строкой в код, а тем более коммитить его в публичный репозиторий — плохая практика.
_Урок: [../../curriculum/02-programming/README.md](../../curriculum/02-programming/README.md)._

## Вопрос 12
**Ответ: A.** У PrimitiveJob — .status() и .result(); .pulse/.open/.waveform — не часть API примитивов.
_Урок: [../../curriculum/02-programming/README.md](../../curriculum/02-programming/README.md)._

## Вопрос 13
**Ответ: B.** Число итераций ≈ π/4·√(N/M) = π/4·√8 ≈ 2.2, берут floor = 2. В записи курса полный угол поворота θ = 2·arcsin√(M/N), а «рабочий» угол амплитуды θ₀ = θ/2 = arcsin(1/√8) ≈ 0.3614 рад; после k итераций амплитуда равна sin((2k+1)·θ₀). После 2 итераций sin(5·θ₀) ≈ 0.97, т.е. вероятность sin²(5·θ₀) ≈ 0.945 (в симуляции выходит около 0.94) — максимум, близкий к 1 (3 итерации формально чуть хуже: оптимум пройден).
_Урок: [../../curriculum/03-algorithms/README.md](../../curriculum/03-algorithms/README.md)._

## Вопрос 14
**Ответ: A.** Асимметричная матрица ошибок считывания — классический элемент readout error: при замере '1' чаще превращается в '0' из-за T1-релаксации в процессе readout. Coherent unitary error имел бы структурированный полярный сдвиг, а crosstalk — только эффекты между соседями.
_Урок: [../../curriculum/05-hardware/02-superconducting-qubits.md](../../curriculum/05-hardware/02-superconducting-qubits.md)._

## Вопрос 15
*Открытый вопрос.*
**Ответ:** H на q0 готовит |+⟩ на q0; q1 остаётся |0⟩. Измеряем отдельно каждый кубит, корреляций нет (это продуктовое состояние). Counts будут примерно: '00' ~ 500 раз, '01' ~ 500 раз (с позицией битов: q1q0, q1 всегда 0). Флуктуации — по стохастике ±O(√N), отклонение ≈ 16.
_Урок: [../../curriculum/02-programming/README.md](../../curriculum/02-programming/README.md)._
