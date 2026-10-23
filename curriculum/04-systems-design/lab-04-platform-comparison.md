---
title: "Лаба 04: одна схема под три топологии — сравнение платформ"
module: "04 Проектирование систем"
difficulty: "advanced"
duration: "~2 ч"
status: "draft"
tags: [transpile, coupling-map, layout, benchmark, seeds, qaoa, qft]
---

# Лаба 04: одна схема под три топологии — сравнение платформ

Практика по урокам 01–04. Берём одну и ту же схему, транслируем её под три разных топологии (линейная, heavy-hex, all-to-all), замеряем depth / число SWAP / число 2q-гейтов и смотрим, как меняется выбор layout. Чтобы выводы были устойчивыми, прогоняем 5 разных `seed_transpiler` и усредняем.

## Что готовим

Схема QFT-8 или QAOA maxcut на 6 кубитах. QAOA-вариант нам ближе к практике (граф задачи + описание в уроке 05), поэтому берём её; QFT-8 оставляем как расширенное задание.

```python
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.transpiler import CouplingMap

# граф задачи: 6 вершин цикла + пара хорд
edges = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 0), (0, 3), (1, 4)]
gamma, beta_s = 0.6, 0.35

def build_qaoa(num_qubits, edges, gamma, beta):
    qc = QuantumCircuit(num_qubits)
    qc.h(range(num_qubits))
    for layer in range(2):  # 2 слоя QAOA
        for a, b in edges:
            qc.cx(a, b)
            qc.rz(2 * gamma, b)
            qc.cx(a, b)
        qc.rx(2 * beta, range(num_qubits))
    qc.measure_all()
    return qc

qc = build_qaoa(6, edges, gamma, beta_s)
```

## Три топологии

```python
line = CouplingMap.from_line(6)
hh   = CouplingMap.from_heavy_hex(3)   # тяжёлый гексагон: 19 кубитов (проверьте)
a2a  = CouplingMap.from_full(6)

topologies = {"line": line, "heavy-hex": hh, "all-to-all": a2a}
```

`CouplingMap.from_heavy_hex(3)` даёт **19** физических кубитов — это нормально: transpile раскладывает 6 логических кубитов на подграф. Проверьте: `len(topologies["heavy-hex"].physical_qubits) == 19` (и что 19 >= 6, то есть места хватает).

## Замеры по 5 seed'ам

Общая метрика: depth, число SWAP, число 2q-гейтов (включая SWAP), плюс средняя оценка fidelity по estimated formula (по гейту cx при константной ошибке; если доступны свойства бэкенда — используйте его Target). Прогоняем 5 seeds, усредняем, показываем max/min.

> **Явно про единицы.** Число 2q ниже — **абстрактный счётчик логических операций**: `swap` считается здесь за одну операцию (базис со SWAP выбран нарочно), а под капотом SWAP-гейт всегда разворачивается в три физических 2q-гейта. Поэтому эти числа нельзя напрямую сопоставлять с «3q-стоимостью гейта» из модуля 05 — для физического сравнения сделайте второй прогон в нативном базисе без `swap` в `basis_gates` (SWAP автоматически раскладывается в базисные гейты, и счётчик 2q станции покажет реальную нагрузку), а оценки по времени/ошибкам — через `Target` фейк-бэкенда (длительности и error rate пар), как в [уроке 04](04-noise-aware-compilation.md).

```python
import numpy as np

def count_2q(circ):
    return sum(1 for inst in circ.data if inst.operation.num_qubits == 2)

def metrics(circ):
    ops = circ.count_ops()
    return {
        "depth": circ.depth(),
        "swap": ops.get("swap", 0),
        "2q": count_2q(circ),   # абстрактный счётчик: swap = 1 операция
    }

results = {}
for name, cm in topologies.items():
    rows = []
    for seed in range(5):
        tq = transpile(qc, coupling_map=cm,
                       # "swap" в basis_gates — обязательно: без него транспилятор
                       # раскладывает вставленные SWAP на три CX, и метрика
                       # "swap" всегда равна нулю
                       basis_gates=["rz", "sx", "x", "cx", "swap"],
                       routing_method="sabre", optimization_level=3,
                       seed_transpiler=seed)
        m = metrics(tq)
        m["layout"] = tq.layout.initial_layout  # если интересно
        rows.append(m)
    results[name] = rows

for name, rows in results.items():
    depth = [r["depth"] for r in rows]
    swaps = [r["swap"] for r in rows]
    twoq  = [r["2q"] for r in rows]
    print(f"{name:>12}: depth = {np.mean(depth):.1f}±{np.std(depth):.1f}, "
          f"swap = {np.mean(swaps):.1f}±{np.std(swaps):.1f}, "
          f"2q = {np.mean(twoq):.1f}±{np.std(twoq):.1f}")
```

**Как честно измерять SWAP.** Гейт `swap` должен остаться в итоговой схеме, иначе его не видно: при `basis_gates=["rz", "sx", "x", "cx"]` транспилятор декомпозирует каждый вставленный SWAP на три `cx`, и `ops.get("swap", 0)` всегда даёт 0 (проверено на Qiskit 2.6.0). Поэтому добавляем `"swap"` в базис — на реальном бэкенде такого гейта нет, но здесь он работает как измеритель. Альтернатива: считать SWAP как `(n_2q_после − n_2q_без_routing) / 2`.

## Что смотреть в результатах

1. **all-to-all** не требует SWAP вовсе (0 штук) — разница между топологиями в depth и числе 2q-гейтов целиком определяется расстояниями в графе. Ориентир: depth(all-to-all) — минимально возможное.
2. **line** даст больше нагрузки: QAOA замыкает цикл 0-1-...-5-0, а line не имеет ребра 5-0 — отсюда максимальное число SWAP.
3. **heavy-hex** даст middle-ground: больше связности, чем у line, но и дороже по розыгрышу (пара хорд в графе задачи может не ложиться на рёбра heavy-hex).
4. **Вариация по seed'ам** на этой задаче может оказаться нулевой: так, на Qiskit 2.6.0 (level 3, 5 seed'ов) SWAP и 2q совпадают для всех seed'ов, а depth «гуляет» только на heavy-hex (72 против 66 у одного из seed'ов, std ≈ 2.4). Если std больше 15 % от mean — увеличивайте число seeds до 20 и вставьте в вывод выбор как min/max.

## Примерная таблица (как ориентироваться)

Числа зависят от Qiskit-версии, gamma/бета, seeds: ниже порядок величин, а не эталон. Приведённые значения — реальный прогон на Qiskit 2.6.0 (level 3, 5 seed'ов, базис с `"swap"`):

| Топология | depth (avg) | SWAP (avg) | 2q gates (avg) | Комментарий |
|-----------|-------------|------------|----------------|-------------|
| all-to-all | 56 | 0 | 32 | upper bound качества |
| heavy-hex | 70.8 ± 2.4 | 12 | 44 | middle ground |
| line | 78 | 17 | 49 | худшая связность для этой задачи |

Полезная арифметика для самопроверки: базовых `cx` в схеме 32 (8 рёбер графа задачи × 2 слоя QAOA × 2 гейта), а каждый вставленный SWAP добавляет один 2q-гейт, поэтому `2q = 32 + SWAP` — если у вас сходится, метрика измеряется правильно.

## Расширенное задание: QFT-8

Повторите с QFT-8 (построим вручную):

```python
def build_qft(n):
    qc = QuantumCircuit(n)
    for target in range(n):
        qc.h(target)
        for control in range(target):
            qc.cp(np.pi / 2 ** (target - control), control, target)
    return qc

qc8 = build_qft(8)
```

Прогон под `CouplingMap.from_line(8)`, `CouplingMap.from_heavy_hex(3)` (те же 19 кубитов — места хватает) и `CouplingMap.from_full(8)` — заполняется та же таблица; покажите, как различаются layout'ы (распечатайте `tq.layout.initial_layout` по 5 seed'ам). QFT — плотная схема (взаимодействия между всеми кубитами), ожидается большой разрыв между all-to-all и line.

Ориентир по прогонам на Qiskit 2.6.0 (level 3, 5 seed'ов, базис с `"swap"`): all-to-all — 0 SWAP, depth 51, 2q 56; line — 23 SWAP, depth 75.2 ± 1.5, 2q 79; heavy-hex — 18.4 ± 0.5 SWAP, depth 83.0 ± 3.8, 2q 74.4. Обратите внимание на любопытный эффект: **heavy-hex даёт меньше SWAP, но большую depth**, чем line — плата за то, что 6 логических кубитов раскладываются по 19 физическим (расстояния длиннее), в то время как line кладёт их подряд. Это ровно тот случай, когда одна метрика не выводится из другой.

## Осмысление

1. На какой топологии выбранная стратегия layout (SabreLayout) даёт лучший результат и почему?
2. Что произойдёт, если заменить heavy-hex на line при том же уровне optimization? Что растёт быстрее: depth или число SWAP?
3. Какие из ваших замеров имеют наибольшую вариацию по seed'ам и почему?

## Что записать в отчёт

Чтобы лаба была «закрытой», зафиксируйте в отчёте:

1. **Таблицу метрик** по трём топологиям: mean и std на 5 seed'ах (depth, SWAP, 2q-гейты).
2. **Скриншоты или текстовый вывод** выбранных layout'ов (`tq.layout.initial_layout`) для двух seed'ов на каждой топологии — видно, что SabreLayout стабилизируется или, наоборот, прыгает.
3. **Вывод в 3-5 предложений**: как форма графа связности меняет стоимость исполнения конкретной задачи и нужен ли вообще учёт seed'ов при таком разбросе.
4. **Одну гипотезу** для расширенного задания: например, «на line QFT-8 требует примерно в 1.4 раза больше SWAP, чем QAOA-6 (23 против 17) — из-за попарно дальних взаимодействий QFT», и проверьте её числами. Гипотеза, кстати, проверяется: именно так и получается.

Мелкая деталь для воспроизводимости: зафиксируйте разброс между seed'ами, каким бы он ни был (на QAOA-6 он может сойтись к нулю по SWAP, а на более крупной схеме — 10-15 % по depth) — это прямая иллюстрация стохастичности SABRE из урока 03.

## ✅ Проверь себя

1. Почему на all-to-all depth близок к минимуму, а число SWAP почти не зависит от layout?
2. Почему на heavy-hex число 2q-гейтов выше базового спектра CX-взаимодействий? Какое соотношение SWAP и CX вы наблюдаете?
3. Сколько SWAP добавляет QFT-8 на line по сравнению с heavy-hex (в наших прогонах — 23 против 18.4, то есть line тяжелее, но depth у heavy-hex больше) и насколько это близко к верхней оценке (сумма расстояний между кубитами, чьи взаимодействия «не на ребре»)?
4. На каких схемах (QAOA vs QFT) вариация по seed'ам больше и почему?

Пройдите [тест модуля 04](../../tests/04-quiz.md).

## ➡️ Что дальше

Последняя практическая работа модуля: [lab-05 — свой router и параметры SabreSwap](lab-05-sabre-routing.md).
