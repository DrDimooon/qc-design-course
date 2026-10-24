---
title: "Ответы: входная диагностика 00"
module: "Тесты"
difficulty: "beginner"
duration: "~10 мин"
status: "draft"
tags: [answers, diagnostic, fundamentals, numpy]
---

# Ответы: входная диагностика 00

Ключ к [tests/diagnostic-00.md](../diagnostic-00.md). Сверяйте после того, как ответили сами: засчитывайте только точные совпадения.

## Вопрос 1. Комплексные числа
**Ответ: B.** $(1+i)(1-i) = 1 - i^2 = 1 - (-1) = 2$. Это модуль в квадрате: $|1+i|^2 = 2$.
_Урок: [01-linear-algebra](../../curriculum/00-fundamentals/01-linear-algebra.md)._

## Вопрос 2. Комплексные числа
**Ответ: B.** $|3+4i| = \sqrt{3^2 + 4^2} = \sqrt{25} = 5$ (а $25$ — это квадрат модуля, ловушка D).
_Урок: [01-linear-algebra](../../curriculum/00-fundamentals/01-linear-algebra.md)._

## Вопрос 3. Векторы и нормировка
**Ответ: C.** $\|v\| = \sqrt{1+1+1+1} = 2$. Нормированный вектор — $v/2 = (\tfrac12,\tfrac12,\tfrac12,\tfrac12)$.
_Урок: [01-linear-algebra](../../curriculum/00-fundamentals/01-linear-algebra.md)._

## Вопрос 4. Векторы и нормировка
**Ответ: A.** Условие нормировки — сумма **квадратов модулей** амплитуд: $|1/2|^2 + |\sqrt3/2|^2 = 1/4 + 3/4 = 1$. Сумма самих амплитуд нормировкой не является (ловушка B/C).
_Урок: [02-quantum-mechanics-basics](../../curriculum/00-fundamentals/02-quantum-mechanics-basics.md)._

## Вопрос 5. Умножение матриц
**Ответ: A.** $XZ = \begin{pmatrix}0&1\\1&0\end{pmatrix}\begin{pmatrix}1&0\\0&-1\end{pmatrix} = \begin{pmatrix}0&-1\\1&0\end{pmatrix} = -iY$. Порядок важен: $ZX \neq XZ$.
_Урок: [01-linear-algebra](../../curriculum/00-fundamentals/01-linear-algebra.md)._

## Вопрос 6. Унитарность
**Ответ: B.** H эрмитова ($H^\dagger = H$) и $H^2 = I$, значит $H^\dagger H = H^2 = I$. Для вещественной симметричной матрицы это и есть проверка унитарности.
_Урок: [02-quantum-mechanics-basics](../../curriculum/00-fundamentals/02-quantum-mechanics-basics.md)._

## Вопрос 7. Собственные векторы
**Ответ: A.** Z диагональна: собственные значения $\pm1$, векторы $|0\rangle$ ($\lambda=1$) и $|1\rangle$ ($\lambda=-1$). $|+\rangle,|-\rangle$ — собственные векторы X, а не Z.
_Урок: [01-linear-algebra](../../curriculum/00-fundamentals/01-linear-algebra.md)._

## Вопрос 8. Собственные значения
**Ответ: B.** Унитарная $U$ сохраняет длину, поэтому её спектр лежит на единичной окружности: $|\lambda_k| = 1$ (фазы $e^{i\theta}$). Вещественность не гарантирована (ловушка D).
_Урок: [02-quantum-mechanics-basics](../../curriculum/00-fundamentals/02-quantum-mechanics-basics.md)._

## Вопрос 9. Тензорное произведение
**Ответ: A.** $|0\rangle\otimes|0\rangle = (1,0)\otimes(1,0) = (1,0,0,0)$ — первый базисный вектор, индекс 0.
_Урок: [01-linear-algebra](../../curriculum/00-fundamentals/01-linear-algebra.md)._

## Вопрос 10. Тензорное произведение (Qiskit convention)
**Ответ: B.** Канон курса — `CONVENTIONS.md`: состояние $|q_1 q_0\rangle$, правый бит — $q_0$. X на `q1` даёт $|q_1 q_0\rangle = |10\rangle$; в little-endian индекс это $(q_1 q_0)_2 = 2$, т.е. Statevector `[0, 0, 1, 0]`. Для двух кубитов `np.kron` левым множителем берёт $q_1$: `np.kron(X, I)`.
_Урок: [03-complex-signals-qubits](../../curriculum/00-fundamentals/03-complex-signals-qubits.md), соглашение — `CONVENTIONS.md`._

## Вопрос 11. NumPy: массивы
**Ответ: B.** Вложенный список `[[1,0],[0,1]]` превращается в матрицу $2\times2$; это единичная матрица $I_2$.
_Урок: [lab-00-env-setup](../../curriculum/00-fundamentals/lab-00-env-setup.md)._

## Вопрос 12. NumPy: `kron`
**Ответ: B.** `np.kron([1,0], [0,1])` даёт `[0,1,0,0]`: первый множитель задаёт «блоки», второй — их содержимое. Это $|0\rangle\otimes|1\rangle = |01\rangle$ — состояние $|q_1 q_0\rangle$ при каноне курса (левый множитель — старший разряд индекса; см. `CONVENTIONS.md`).
_Урок: [01-linear-algebra](../../curriculum/00-fundamentals/01-linear-algebra.md)._

## Вопрос 13. Вероятность
**Ответ: A.** По правилу Борна $P(1) = |\sqrt{0.1}\,e^{i\pi/3}|^2 = 0.1$: относительная фаза между слагаемыми не влияет на измерение в Z-базисе. После смены базиса (например, H) она может стать наблюдаемой. Это **не глобальная** фаза всего состояния.
_Урок: [02-quantum-mechanics-basics](../../curriculum/00-fundamentals/02-quantum-mechanics-basics.md)._

## Вопрос 14. Python: списки и срезы
**Ответ: B.** Срез `[1:3]` берёт индексы 1 и 2, правый конец не включается: `[20, 30]`.
_Урок: [lab-00-env-setup](../../curriculum/00-fundamentals/lab-00-env-setup.md)._

## Вопрос 15. Python/NumPy: короткий ответ
**Ответ (любой эквивалент):** `np.kron([1, 0], [1, 0])` → `array([1, 0, 0, 0])`. Можно и явно: `np.array([1, 0, 0, 0])`. Главное — длина 4 и единица в позиции 0 (индекс $|q_1 q_0\rangle = |00\rangle$).
_Урок: [01-linear-algebra](../../curriculum/00-fundamentals/01-linear-algebra.md)._

## Подсчёт и маршрут

| Правильных | Доля | Маршрут |
|---|---:|---|
| 0–5 | 0–33 % | Модуль 00 целиком: уроки 01–03, lab-00, problem-set-00 |
| 6–10 | 40–67 % | Только проваленные темы + обязательно problem-set-00 |
| 11–13 | 73–87 % | Уроки не читать, сделать только problem-set-00 |
| 14–15 | 93 %+ | Сразу [модуль 01](../../curriculum/01-quantum-basics/README.md) |

**Математика и Python считаются раздельно.** Математика — В1–В10 и В13 (11 заданий): меньше 7/11 означает, что уроки 01–02 модуля 00 не пропускаются. Python/NumPy — В11–В12, В14–В15 (4 задания): меньше 3/4 означает, что нужно пройти lab-00 и NumPy-раздел урока 01. Оба правила действуют одновременно; они не отменяют разбора всех ошибок.

Разбор частых ошибок: путать нормировку амплитуд с суммой амплитуд (В4); считать $|z|$ вместо $|z|^2$ (В2); забывать, что порядок матриц и множителей `kron` важен (В5, В12); путать направление порядка кубитов (В10) — для этого есть `CONVENTIONS.md`.
