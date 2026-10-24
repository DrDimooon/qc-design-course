---
title: "Как измерить качество квантового компьютера"
module: "05 Железо"
difficulty: "advanced"
duration: "~2 ч чтение + 1.5–2 ч calibration exercise"
status: "draft"
tags: [benchmarking, randomized-benchmarking, quantum-volume, clops, gate-set-tomography, eplg, layer-fidelity, algorithmic-benchmarks, qiskit-backend]
---

# Как измерить качество квантового компьютера (Benchmarking)

## Не все метрики равны

Число кубитов — плохая метрика: 127 «плохих» кубитов проигрывают 20 «хорошим». Инженерно полезная таблица метрик:

| Уровень | Метрика | Что отвечает | Цена измерения |
|---|---|---|---|
| кубит | $T_1$, $T_2$ | сколько живёт состояние | дёшево (насыщение-восстановление, Ramsey) |
| гейт | RB-ошибка гейта | средняя ошибка 1q/2q | дёшево |
| слой | Layer fidelity / EPLG | деградация на 2q-слое у *всего* процессора | средне |
| процессор | Quantum Volume, EPLG по цепочке | шум + связность + транспиляция | средне |
| скорость | CLOPS | сколько квантовых слоёв-операций в секунду | дорого |
| процесс | Gate Set Tomography | полная матрица процесса | дорого |
| алгоритм | QAOA-fidelity, QV-tool | «посчитает ли он мой код» | дорого |

```mermaid
flowchart TB
  Q["Уровень кубита: T1 и T2, насыщение-восстановление и Ramsey — дёшево"]
  C["Уровень схемы: RB-ошибка гейта, Layer fidelity и EPLG — дёшево и средне"]
  S["Уровень системы: Quantum Volume, CLOPS, Gate Set Tomography — средне и дорого"]
  A["Уровень приложения: QED-C, QAOA-fidelity, QV-tool — дорого"]
  Q -->|"растёт цена эксперимента"| C
  C -->|"растёт цена эксперимента"| S
  S -->|"растёт цена эксперимента"| A
```

**Как читать схему.** Схема выстроена как пирамида уровней бенчмаркинга: от уровня отдельного кубита к уровню схемы, затем системы и, наконец, приложения. Подпись над стрелками «растёт цена эксперимента» означает, что каждый следующий уровень ближе к реальной полезной задаче, но требует всё больше машинного времени и усилий, тогда как самый дешёвый уровень — кубитный. Подпись в каждом узле перечисляет метрики этого уровня и их цену измерения по таблице в начале урока; число кубитов в этой пирамиде не участвует, потому что это плохая метрика.

- Проверь себя: почему число кубитов нельзя поставить на место кубитного уровня в пирамиде?
- Проверь себя: на каком уровне появляется Gate Set Tomography и почему для рутинного мониторинга её не используют?
- Проверь себя: какой уровень отвечает на вопрос «сможет ли машина посчитать мой код» и что он требует по времени?

## Randomized benchmarking (RB)

Идея: не собирая детального «профиля шума», оцениваем усреднённую ошибку гейта. Берём случайные последовательности Клиффорд-гейтов длины $m$, затем инвертируем их произведение (дополнительный Клиффорд), чтобы итоговая унитарность была $I$. Идеальная машина вернула бы $|0\ldots0\rangle$ с вероятностью 1; в реальности вероятность возврата экспоненциально падает:

$$P(m) = A\,\alpha^m + B, \qquad \mathrm{EPC} = \frac{d-1}{d}\,(1-\alpha).$$

где $d$ — размерность пространства ($2$ для 1q, $4$ для 2q), то есть $\mathrm{EPC}_{1q} = (1-\alpha)/2$ и $\mathrm{EPC}_{2q} = 3(1-\alpha)/4$. Граничные проверки: при идеальном устройстве ($\alpha = 1$) обе ошибки нулевые, при $\alpha = 0$ ошибки равны $1/2$ и $3/4$ соответственно. Различайте также величины по смыслу: **EPC** — ошибка «на один случайный Клиффорд» (усреднённая по ансамблю), а **EPG** (error per elementary gate) — пересчёт на элементарный гейт; они совпадают только в простых моделях, где все Клиффорды равной стоимости; общий пересчёт нетривиален (Qiskit Experiments: randomized benchmarking).

Формы RB и их смысл: обычный (standard) RB даёт среднюю ошибку, но не чувствует гейт-специфичные дефекты; **Interleaved RB** (вставка целевого гейта после каждого Клиффорда) выделяет ошибку конкретного гейта через **отношение** затуханий интерливед и «пустой» кривых (не через простую разность их $\alpha$ — деталь в ключе итогового экзамена); **Layer RB** — RB на «слое» 2q-гейтов — работает на всём процессоре сразу. При масштабировании IBM дополняет это парой **layer fidelity** (LF) и **EPLG** (error per layered gate).

$$\text{EPLG} = 1 - \mathrm{LF}^{\,1/N_{2q}}, \qquad \text{EPLG} \approx -\frac{\ln \mathrm{LF}}{N_{2q}}\ \text{(малошумовая аппроксимация)},$$

где $N_{2q}$ — число 2q-гейтов в бенчмаркируемой цепочке/слое, LF — её измеренная layer fidelity. Нормировка именно на $N_{2q}$ (пространственный размер слоя), а не на число временных слоёв $d$: смешение этих счётчиков меняет смысл метрики (пример: при LF = 0.9 и $N_{2q} = 10$ точное EPLG $= 1 - 0.9^{0.1} \approx 0.0105$). Порядок величин на современных 100+ кубитных процессорах: EPLG ~10⁻³ (на лучших цепочках ниже). Первоисточник — McKay et al., «Benchmarking Quantum Processor Performance at Scale» (arXiv:2311.05933).

## Quantum Volume (QV)

Маркер IBM (Cross et al., arXiv:1811.12926): «квадратные» (width = depth) схемы из случайных унитарных блоков. Heavy output — результат с амплитудой выше медианы. QV = $2^n$, где $n$ — максимальная ширина, при которой по протоколу (100 схем на размер, статистическая уверенность ≥ 97%) средняя вероятность тяжёлого исхода $\ge 2/3$. QV ловит: readout error, 1q/2q ошибки, связность, сложность транспиляции. Qiskit даёт готовый генератор: функция `qiskit.circuit.library.quantum_volume(...)` (класс `QuantumVolume` помечен deprecated с Qiskit 2.2 и будет удалён в 3.0). Ограничение: QV — метрика «одной картинки»; она не отражает специфику конкретного алгоритма (VQE/QAOA).

## CLOPS и «скорость»

**CLOPS** (Circuit Layer Operations Per Second, IBM, 2021): сколько слоёв параметризованных схем процессор прогоняет за секунду при реальном runtime (батчи, очередь, время repeat-delay). Концептуально: CLOPS растёт с уменьшением времени гейтов и времени считывания; влияет на скорость VQE/QAOA, где нужны сотни–тысячи итераций по параметрам.

$$\text{CLOPS} = \frac{\text{слоёв\_в\_запуске} \times \text{выстрелов}}{\text{время\_полной\_итерации\_параметров}}.$$

Практический маркер: CLOPS ~ десятки тысяч слоёв/с на Heron/Eagle — это то, что ограничивает скорость вариационных алгоритмов.

## Gate Set Tomography: дорогая «полная карта»

GST (пакет pyGSTi, Sandia) — восстановление матриц процесса для выбранного набора гейтов (считывание, 1q-гейты, CNOT): дорогой, но точный метод; он отделяет SPAM-ошибки от ошибок гейтов и даёт gauge-invariant картину шума. На практике применяют к небольшим системам и при разработке процессоров; для рутинного мониторинга слишком тяжело — там правят RB/QV.

## Algorithmic benchmarks: QED-C, QAOA-fidelity

QED-C (Quantum Economic Development Consortium) публикует open-source набор алгоритмических бенчмарков (QAOA, VQE, QFT, Grover и др.) с единым протоколом: запуск на симуляторе и на реальном устройстве, вычисление fidelity против «идеального» распределения для фиксированных размеров задачи. Так ловится не средняя ошибка, а «сможет ли машина посчитать мой код». Похожие сервисы: IQM Benchmarks (облачная платформа IQM с рядом алгоритмических метрик) и Quantum Inspire (QuTech) с бэкенд-инструментами. Прикладное применение: прогон QAOA на MaxCut с оценкой approximation ratio против симулятора — честный «algorithmic» индикатор состояния железа.

## Практический чек-лист перед запуском на железе

```
 1. зафиксировать целевую задачу и её теоретический ответ (на симуляторе)
 2. выбрать бэкенд: проверить связность (coupling_map/target) под мою схему
 3. смотреть 2q-ошибки на нужных рёбрах и readout-ошибки
    (target[name_2q][(a,b)].error, target["measure"][(q,)].error)
  4. оценить бюджет ошибок: depth × ошибка_слоя (плюс вклад простоя: Σ idle / T₁, T₂)
 5. транспилировать (optimization_level=3), сверить depth и число 2q-гейтов
 6. сравнить варианты layout/routing (trivial vs sabre, разные seed)
 7. прогнать smoke-тест (Bell, RB-цепочка) перед полным объёмом
 8. запустить основной job с учётом session/queue бюджета
```

## Практика: чтение calibration snapshot

**1.5–2 ч сверх чтения урока.** Цель — превратить snapshot в небольшую таблицу и обосновать решение для layout/scheduling. Используйте локальный `FakeSherbrooke`: учётная запись и QPU не нужны. Это сохранённые данные устройства, а не текущая калибровка реальной машины.

| Что извлекаем | Где в `Target` | Единицы и интерпретация |
|---|---|---|
| T1 / T2 | `qubit_properties[q].t1 / .t2` | секунды в API; в таблице переводим в мкс |
| Readout error | `target["measure"][(q,)].error` | безразмерная ошибка считывания, не ошибка гейта |
| Нативный 2q-гейт и ошибка | `target[name][(a, b)].error` | имя из операций с `num_qubits == 2`; ошибка безразмерна |
| Длительность гейта / измерения | соответствующая `InstructionProperties.duration` | секунды в `Target`, в таблице нс; это не число тактов `dt` |
| Связность | ключи `(a, b)` нативной операции | допустимые упорядоченные пары; обратное направление не подразумевается |
| Пропуск | нет свойства, записи или значения | **`None` — неизвестно**, а не ноль и не идеальная операция |

Код возвращает две таблицы (списки словарей). Полный список рёбер используется для выбора максимальной **из известных** 2q-ошибок; вывод ограничен тремя кубитами и тремя парами. Все числа берутся из snapshot. Проверено на Qiskit 2.6.0: у этого `FakeSherbrooke` 127 кубитов и нативный `ecr`; функция использует параметры переданного устройства.

```python
# qc: executable
from qiskit_ibm_runtime.fake_provider import FakeSherbrooke


def scaled(value, factor):
    return None if value is None else value * factor


def calibration_tables(backend, limit=3):
    assert limit > 0
    target = backend.target
    names = sorted(n for n in target.operation_names
                   if target.operation_from_name(n).num_qubits == 2)
    properties = target.qubit_properties
    qubits = []
    for q in range(min(limit, backend.num_qubits)):
        prop = (properties[q] if properties is not None
                and q < len(properties) else None)
        readout = (target["measure"].get((q,))
                   if "measure" in target.operation_names else None)
        qubits.append({
            "q": q,
            "T1_us": scaled(getattr(prop, "t1", None), 1e6),
            "T2_us": scaled(getattr(prop, "t2", None), 1e6),
            "readout_error": getattr(readout, "error", None),
            "measure_ns": scaled(getattr(readout, "duration", None), 1e9),
        })
    edges = []
    for name in names:
        for pair, prop in target[name].items():
            # None key means global support, not a concrete calibrated edge.
            if pair is None:
                continue
            edges.append({
                "gate": name, "pair": pair,
                "error": getattr(prop, "error", None),
                "duration_ns": scaled(getattr(prop, "duration", None), 1e9),
            })
    edges.sort(key=lambda row: (row["gate"], row["pair"]))
    known = [row for row in edges if row["error"] is not None]
    worst = max(known, key=lambda row: row["error"], default=None)
    return qubits, edges[:limit], worst, len(edges)


backend = FakeSherbrooke()
qubits, pairs, worst, edge_count = calibration_tables(backend)
assert len(qubits) == min(3, backend.num_qubits)
assert 0 < len(pairs) <= 3 and edge_count >= len(pairs)
for row in pairs:
    prop = backend.target[row["gate"]][row["pair"]]
    assert len(row["pair"]) == 2
    assert row["duration_ns"] == scaled(getattr(prop, "duration", None), 1e9)
    assert row["error"] is None or 0 <= row["error"] <= 1
assert worst is not None and all(
    row["error"] is None or worst["error"] >= row["error"] for row in pairs
)
assert scaled(None, 1e6) is None
assert scaled(1e-6, 1e6) == 1.0  # проверка перевода единиц, не калибровка
print("qubits (us / ns):", qubits)
print("native pairs (ns):", pairs, "total directed entries:", edge_count)
print("largest known 2q error:", worst)
```

**Что сдать:** таблицы и короткое инженерное заключение:

1. Зафиксируйте версии Qiskit/runtime, имя fake backend и происхождение snapshot; обозначьте единицы и все `None`. Для выбранной пары дополните таблицу T1/T2 и readout обоих концов (увеличьте `limit` или прочитайте их напрямую). Не заменяйте пропуски нулями.
2. Сравните длительность нативного 2q-гейта с T1/T2 его кубитов в **одних единицах**; объясните связь с простоем и scheduling. Отношение длительности к T1 — ориентир для модели релаксации, а не измеренная fidelity схемы. Для плотностной матрицы и каналов шума используйте уже изученный [материал о шуме](../02-programming/04-noise-simulation.md).
3. Выберите две доступные пары, сравните ошибки, длительности и readout концов; объясните, почему минимум 2q-error не гарантирует лучший layout для всего workload. Отдельно назовите пару с максимальной известной ошибкой и перечислите данные, которых не хватает для вывода.
4. Проверьте направления рёбер в `target[name]`; объясните, как ограничение связности может добавить routing overhead. Сформулируйте одну гипотезу для [noise-aware компиляции](../04-systems-design/04-noise-aware-compilation.md) и укажите, чем её проверять.

**Самопроверка:** есть T1/T2, readout, имя и ошибка нативного 2q-гейта, длительности и связность; единицы согласованы; пропуски явно отмечены; вывод опирается на snapshot и отделён от предсказания результата QPU. Если свойство отсутствует, достаточно назвать ограничение и нужное дополнительное измерение.

## 📚 Узнать подробнее

<details markdown="1">
<summary>Видеолекции (с таймкодами)</summary>

- **Benchmarking near-term quantum computers, IBM Research** [00:01:53-00:10:25] - блок урока «Не все метрики равны»: «пирамида бенчмарков» — от ошибок гейтов к процессорным метрикам — и живой протокол измерения Quantum Volume с результатами. [ссылка](https://youtu.be/DD-JCi0lcLo)
- **Benchmarking near-term quantum computers*, IBM Research** [00:07:42-00:08:41] - блок урока «Quantum Volume (QV)»: точечный фрагмент про определение QV и критерии успеха теста (порог 2/3), о котором говорит формула урока. [ссылка](https://youtu.be/DD-JCi0lcLo)
- **Not All Benchmarks Are Created Equal, Simons Institute for the Theory of Computing** [00:41:38-00:56:56] - блок урока «Randomized benchmarking (RB)»: direct randomized benchmarking, зачем в протоколе клиффорд-гейты, и выход на объёмные (volumetric) метрики уровня «Layer fidelity / EPLG». [ссылка](https://youtu.be/XskSHchkn2g)
</details>

<details markdown="1">
<summary>Статьи и блоги</summary>

- Google blog «Meet Willow, our state-of-the-art quantum chip» (Х. Невен) - блок урока «Не все метрики равны»: как выбирается бенчмарк верхнего уровня — у Willow это random circuit sampling «ниже порога» вместо числа кубитов. [ссылка](https://blog.google/technology/research/google-willow-quantum-chip/)
- IBM Quantum Learning «Running quantum circuits» (курс Quantum Computing in Practice) - блок урока «CLOPS и «скорость»»: актуальный справочник метрик процессора — EPLG, CLOPS и три «первичные» характеристики (scale, quality, speed); лежит рядом с чек-листом урока. [ссылка](https://quantum.cloud.ibm.com/learning/en/courses/quantum-computing-in-practice/running-quantum-circuits)
</details>

<details markdown="1">
<summary>Книги/статьи (глава/раздел, arXiv)</summary>

- Cross, Bishop, Sheldon, Nation, Gambetta «Validating quantum computers using randomized model circuits» (arXiv:1811.12926; Phys. Rev. A 100, 032328) - блок урока «Quantum Volume (QV)»: первоисточник метрики и протокола — heavy outputs, 100 схем, статистическая уверенность. [ссылка](https://arxiv.org/abs/1811.12926)
- McKay и др. «Benchmarking Quantum Processor Performance at Scale» (arXiv:2311.05933) - блок урока «Randomized benchmarking (RB)»: протокол layer fidelity на цепочке 80–100 кубитов и метрика EPLG = $1 - \mathrm{LF}^{1/N_{2q}}$ (нормировка на число 2q-гейтов цепочки, −ln LF/$N_{2q}$ — малошумовая аппроксимация). [ссылка](https://arxiv.org/abs/2311.05933)
</details>

<details markdown="1">
<summary>Русскоязычные ресурсы</summary>

- **Бенчмаркинг квантовых компьютеров: Исследовательский систематический обзор литературы, alphaXiv** — блок урока «Не все метрики равны»: систематический обзор бенчмарков квантовых компьютеров — таксономия, метрики, стандартизация. [ссылка](https://www.alphaxiv.org/ru/abs/2509.03078) — по поиску
- **Обзор и подборка метрик и бенчмарков для квантовых компьютеров: определения, методологии и программное обеспечение, alphaXiv** — блок урока «Не все метрики равны»: комплексная система оценки качества квантовых компьютеров по уровням — от кубитов до приложений. [ссылка](https://www.alphaxiv.org/ru/abs/2502.06717) — по поиску
- **Бенчмаркинг квантовых компьютеров: от кубитов к производительности, Colobridge** — блок урока «Практический чек-лист перед запуском на железе»: практический обзор бенчмаркинга квантовых компьютеров — метрики, стандартизация, приложения. [ссылка](https://blog.colobridge.net/2025/05/benchmarking-quantum-systems/) — по поиску
- **Масштабный бенчмаркинг производительности квантовых процессоров, alphaXiv** — блок урока «Randomized benchmarking (RB)»: обзор статьи McKay и др. о масштабном бенчмаркинге процессоров — layer fidelity и EPLG. [ссылка](https://www.alphaxiv.org/ru/abs/2311.05933) — по поиску
</details>

## ✅ Проверь себя

1. Объясните формулу QV: почему именно «квадратные» схемы и что означает порог 2/3?
2. Что такое EPLG и почему он считается полезнее отдельного 2q-гейта в отчёте?
3. Что входит в CLOPS-оценку и почему эта метрика ограничивает вариационные алгоритмы?
4. Почему RB на «произвольных random-схемах» даёт лишь среднюю оценку, а не точный профиль вашей задачи?
5. Опишите бэкенд-доступ в Qiskit: где взять readout error, T1/T2 и coupling map.

Пройдите [тест модуля 05](../../tests/05-quiz.md).

## ➡️ Что дальше

Модуль «Железо» окончен. Вернитесь к [README модуля](README.md) и переходите к проекту [01-transpiler-benchmark](../../projects/01-transpiler-benchmark.md): метрики урока применяются к реальному транспилятору под две топологии.
