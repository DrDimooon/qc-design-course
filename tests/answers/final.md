---
title: "Ответы: итоговый экзамен"
module: "Итоговый"
difficulty: "mixed"
duration: "~6 мин"
status: "draft"
tags: [answers, final-exam, mixed]
---

# Ответы: итоговый экзамен

Ключ к [tests/final-exam.md](../final-exam.md).

## Вопрос 1 (модуль 00)
**Ответ: B.** Z-статистика зависит от |0⟩ и |1⟩ модулей — φ тут не виден; но после H к исходам подключается относительная фаза (P(0) = (1+cos φ)/2 в X-базисе).
_Урок: [../../curriculum/00-fundamentals/03-complex-signals-qubits.md](../../curriculum/00-fundamentals/03-complex-signals-qubits.md)._

## Вопрос 2 (модуль 00)
**Ответ: D.** Замкнутая система без измерений эволюционирует унитарно: U сохраняет скалярные произведения (inner products). Эрмитовость — отдельное свойство, к гейтам эволюции отношения не имеющее.
_Урок: [../../curriculum/00-fundamentals/02-quantum-mechanics-basics.md](../../curriculum/00-fundamentals/02-quantum-mechanics-basics.md)._

## Вопрос 3 (модуль 01)
**Ответ: C.** На экваторе при φ = π получаем фазу e^{iπ} = −1 перед |1⟩, состояние (|0⟩ − |1⟩)/√2 = |−⟩. Южный полюс — это θ = π, а не экватор.
_Урок: [../../curriculum/01-quantum-basics/01-qubit-superposition.md](../../curriculum/01-quantum-basics/01-qubit-superposition.md)._

## Вопрос 4 (модуль 01)
**Ответ: A.** HZH = X (спряжение через H «крутит» оси X↔Z): HXH = Z. Проверка матриц подтверждает − это базовое свойство H.
_Урок: [../../curriculum/01-quantum-basics/02-gates-circuits.md](../../curriculum/01-quantum-basics/02-gates-circuits.md)._

## Вопрос 5 (модуль 01)
**Ответ: A.** Φ⁺ даёт только '00'/'11' по ~1/2; выборочная разбалансировка на ~√(N·p(1−p)) — норма (для N=1000 σ ≈ 16). Счёт не обязан быть ровно 500/500, но ровно пополам — тоже допустимая реализация (вероятность ≈ 2,52 %): «не обязано» ≠ «невозможно».
_Урок: [../../curriculum/01-quantum-basics/03-entanglement-measurement.md](../../curriculum/01-quantum-basics/03-entanglement-measurement.md)._

## Вопрос 6 (модуль 02)
**Ответ: C.** V2-примитивы возвращают list PubResult; counts: result[0].data.meas.get_counts(). 'evs' — поле Estimator, а quasi_dists — наследие V1 Sampler'а.
_Урок: [../../curriculum/02-programming/README.md](../../curriculum/02-programming/README.md)._

## Вопрос 7 (модуль 02)
**Ответ: A.** Параметры схемы нужно привязать до исполнения: `qc.assign_parameters({"θ": value})`, затем sim.run. (Метод `bind_parameters` у QuantumCircuit в Qiskit 2.x уже удалён — в актуальном API его нет; актуальный API — assign_parameters.) Сами по себе параметры при execute не резолвятся.
_Урок: [../../curriculum/02-programming/README.md](../../curriculum/02-programming/README.md)._

## Вопрос 8 (модуль 02)
**Ответ: B.** init → layout → routing → translation → optimization (→ scheduling). Прочие порядки нарушают логику конвейера: замерить нельзя до привязки к физическим кубитам.
_Урок: [../../curriculum/04-systems-design/02-transpiler-internals.md](../../curriculum/04-systems-design/02-transpiler-internals.md)._

## Вопрос 9 (модуль 02)
**Ответ: B.** Строки counts пишутся little-endian: q2q1q0 = '011', правый бит — q0. Decimal-число то же (3), но принятый формат строк в Qiskit — '011'.
_Урок: [../../curriculum/02-programming/README.md](../../curriculum/02-programming/README.md)._

## Вопрос 10 (модуль 03)
**Ответ: C.** π/4·√4096 = π/4·64 ≈ 50.28 — примерно 50 итераций: квадратичный выигрыш, но всё ещё линейно от √N, а не log N.
_Урок: [../../curriculum/03-algorithms/README.md](../../curriculum/03-algorithms/README.md)._

## Вопрос 11 (модуль 03)
**Ответ: A.** На выходе QFT (без обратного QFT) порядок битов результата инвертирован относительно «ожидаемого»: bit reversal SWAP-ами добивают схему до канонической записи.
_Урок: [../../curriculum/03-algorithms/README.md](../../curriculum/03-algorithms/README.md)._

## Вопрос 12 (модуль 03)
**Ответ: D.** Ошибка на q1 приводит: S₁ = −1 (сравнение q0↔q1 нарушено) и S₂ = −1 (сравнение q1↔q2 нарушено). Итого '11'.
_Урок: [../../curriculum/03-algorithms/README.md](../../curriculum/03-algorithms/README.md)._

## Вопрос 13 (модуль 04)
**Ответ: A.** Backward-проход — двунаправленный обход, уточняющий начальную раскладку: результат реверснутого роутинга оценивает «ухудшает ли карта хвост схемы» и подкладывает ландшафтом стартовые карты следующей попытки. Score отдельного SWAP-кандидата при этом строится только из front layer и extended set с decay — обратный проход в него не входит.
_Урок: [../../curriculum/04-systems-design/03-routing-mapping-sabre.md](../../curriculum/04-systems-design/03-routing-mapping-sabre.md)._

## Вопрос 14 (модуль 04)
**Ответ: C.** Level 3 = level 2 + пересборка пар двухкубитных гейтов (`TwoQubitPeepholeOptimization`), синтез унитарных блоков (`UnitarySynthesis`), unitarity-breaking пассы (`RemoveDiagonalGatesBeforeMeasure` и более агрессивные повторные прогоны (несколько кандидатов layout, больше пассов). CommutativeCancellation — это уже уровень 2, на уровне 3 он просто наследуется. Уровни 2 и 3 разные, а VF2 остаётся задействованным.
_Урок: [../../curriculum/04-systems-design/02-transpiler-internals.md](../../curriculum/04-systems-design/02-transpiler-internals.md)._

## Вопрос 15 (модуль 04)
**Ответ: A.** VF2Layout — точное вложение interaction-графа в coupling map (без свопов, до routing); VF2PostLayout — post-layout корректировка расстановки уже транслированной схемы по error-рейтам Target.
_Урок: [../../curriculum/04-systems-design/02-transpiler-internals.md](../../curriculum/04-systems-design/02-transpiler-internals.md)._

## Вопрос 16 (модуль 04)
**Ответ: D.** Depth игнорирует «стоимость» гейтов: два 2q-гейта с error e+2 стоят как во много раз дороже 1q-гейта с e+4; правильный бюджет — Σ (1−f_i) по всем гейтам + readout + idle-декогеренция. Depth как proxy — комфортная, но слабая метрика.
_Урок: [../../curriculum/04-systems-design/04-noise-aware-compilation.md](../../curriculum/04-systems-design/04-noise-aware-compilation.md)._

## Вопрос 17 (модуль 04)
**Ответ: A.** Co-design — совместная оптимизация слоёв стека: топология и куплеры железа, требования surface code, компилятор и класс целевых приложений разрабатываются вместе, а не «сначала железо, потом софт» (arXiv:2207.14482 — domain-specific архитектурная оптимизация).
_Урок: [../../curriculum/04-systems-design/05-architecture-optimization.md](../../curriculum/04-systems-design/05-architecture-optimization.md)._

## Вопрос 18 (модуль 05)
**Ответ: A.** Transmon — предел $E_J/E_C \gg 1$ за счёт **большой шунтирующей ёмкости** (мала зарядовая энергия $E_C = e^2/2C$): charge dispersion экспоненциально подавляется, charge-noise практически исчезает. (Не «маленькая ёмкость» — она уменьшила бы $E_J/E_C$ и усилила бы чувствительность к заряду.)
_Урок: [../../curriculum/05-hardware/02-superconducting-qubits.md](../../curriculum/05-hardware/02-superconducting-qubits.md)._

## Вопрос 19 (модуль 05)
**Ответ: B.** У ионов практический all-to-all за счёт общих фононных мод, но двухкубитные гейты занимают десятки микросекунд и больше (µs–ms) против нано-секундных у SC. мК-криостат без надобности (комнатная температура/UT-камера), readout — по флуоресценции, а не по IQ-отклику резонатора.
_Урок: [../../curriculum/05-hardware/03-iontraps-neutral-atoms.md](../../curriculum/05-hardware/03-iontraps-neutral-atoms.md)._

## Вопрос 20 (модуль 05)
*Открытый вопрос.*
**Ответ:** Interleaved RB: случайные последовательности Клиффорда чередуются с вставкой исследуемого гейта; сравнивают затухание интерливед- и обычной RB-кривых и выделяют EPC конкретного гейта. Важно: оценка строится через **отношение** затуханий, в модели $\mathrm{EPC} = \frac{d-1}{d}\left(1 - \alpha_{\mathrm{interleaved}}/\alpha_{\mathrm{ref}}\right)$, причём с оговорками метода (оценка валидна, когда оба затухания измерены с достаточной статистикой и !$\alpha$ близки); см. Magesan et al. и реализацию в Qiskit Experiments.
_Урок: [../../curriculum/05-hardware/05-benchmarking.md](../../curriculum/05-hardware/05-benchmarking.md)._

## Вопрос 21 (модуль 06)
**Ответ: B.** Toffoli — счёт логических FT-гейтов (профиль алгоритма); формального перевода «Toffoli → столько-то классических операций» не существует. Классическая и квантовая стоимости сравниваются отдельным анализом задачи; «340 млн Toffoli» против «10⁶ 2q-гейтов» без перевода в общую единицу — несопоставимые бюджеты (см. урок 01, «Извлечение модели затрат»).
_Урок: [../../curriculum/06-publications/01-how-to-read-paper.md](../../curriculum/06-publications/01-how-to-read-paper.md)._

## Вопрос 22 (модуль 06)
**Ответ: B.** Оценка Λ на редких отказах чувствительна к статистике: при 3 отказах относительная погрешность по счёту ±√N/N ≈ ±58 % (это минимум, без доверительных интервалов); для честного сравнения нужны ≥ 3 seed'а, больше шотов, Poisson-интервалы и сравнение через отношение затуханий с интервалами, а не одноразовая цифра. Повышение d до 15 или отключение seed проблему непроверенного выигрыша не решают.
_Урок: [../../curriculum/06-publications/03-google-willow-qec.md](../../curriculum/06-publications/03-google-willow-qec.md)._

## Вопрос 23 (модуль 06, практическое)
**Ожидание:** пять пунктов шаблона (главное утверждение своими словами; тип статьи; главная метрика и единицы; одна выполнимая численная проверка с результатом; ограничения по одной из статей/разборов). Проверка: (1) формулировка не копирует текст статьи; (2) метрика и её единицы названы явно (например, «p_L за цикл», «Λ с интервалом», «# лог. кубитов»); (3) проверка реально выполнена (Stim-симуляция/вычисление), воспроизводима (seed/шоты зафиксированы); (4) честно разделено «проверено кодом» и «на веру»; (5) отмечено ограничение, которое авторы называют. Ответ не сравниваем с «идеальным» образцом — проверяем внутреннюю согласованность разбора.
_Урок: [../../curriculum/06-publications/README.md](../../curriculum/06-publications/README.md)._
