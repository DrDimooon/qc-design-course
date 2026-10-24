---
title: "Лаба 04: одна схема под три топологии — сравнение платформ"
module: "04 Проектирование систем"
difficulty: "advanced"
duration: "~2 ч"
status: "draft"
tags: [transpile, coupling-map, layout, benchmark, seeds, qaoa, qft]
---

# Лаба 04: одна схема под три топологии — сравнение платформ

Практика по урокам 01–04. Транспилируем одну схему под line, heavy-hex и all-to-all, сравниваем depth, число SWAP и число 2q-операций. Пять `seed_transpiler` — небольшой срез вариации, а не доказательство устойчивости выводов.

## QAOA-6: схема, топологии, метрики

Граф MaxCut — цикл 0–1–…–5–0 плюс две хорды; схема содержит два слоя QAOA. Блок самодостаточный, работает офлайн. Запускайте каждый блок в свежем процессе: переменные окружения должны быть заданы **до импорта SDK**. Для обоих блоков фиксируем `QISKIT_NUM_PROCS=1`, `RAYON_NUM_THREADS=1`, seeds 0–4, SABRE и preset level 3. Числа layout/swap trials не передаём: используются встроенные настройки пресета установленной версии Qiskit, которые могут меняться. Запишите версию и параметры; совпадение чисел между версиями не гарантируется.

```python
# qc: executable
import os
os.environ["QISKIT_NUM_PROCS"] = "1"
os.environ["RAYON_NUM_THREADS"] = "1"
import numpy as np
import qiskit
from qiskit import QuantumCircuit, transpile
from qiskit.quantum_info import Operator
from qiskit.transpiler import CouplingMap

print("Qiskit", qiskit.__version__, "QISKIT_NUM_PROCS=1 RAYON_NUM_THREADS=1")
edges = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 0), (0, 3), (1, 4)]
qc = QuantumCircuit(6)
qc.h(range(6))
for _ in range(2):
    for a, b in edges:
        qc.cx(a, b)
        qc.rz(2 * 0.6, b)
        qc.cx(a, b)
    qc.rx(2 * 0.35, range(6))
qc_plain = qc.copy()
qc.measure_all()

topologies = {"line": CouplingMap.from_line(6),
              "heavy-hex": CouplingMap.from_heavy_hex(3),
              "all-to-all": CouplingMap.from_full(6)}
assert [cm.size() for cm in topologies.values()] == [6, 19, 6]
assert [len(cm.get_edges()) for cm in topologies.values()] == [10, 40, 30]
results = {}
for name, cm in topologies.items():
    rows = []
    allowed = set(cm.get_edges())  # все три coupling map двунаправленные
    for seed in range(5):
        tq = transpile(qc, coupling_map=cm,
                       basis_gates=["rz", "sx", "x", "cx", "swap"],
                       layout_method="sabre", routing_method="sabre",
                       optimization_level=3, seed_transpiler=seed)
        assert tq.num_qubits == cm.size()
        pairs = [tuple(tq.find_bit(q).index for q in inst.qubits)
                 for inst in tq.data if len(inst.qubits) == 2]
        assert all(pair in allowed for pair in pairs), name
        rows.append({"depth": tq.depth(), "swap": tq.count_ops().get("swap", 0),
                     "2q": len(pairs), "layout": tq.layout.final_index_layout()})
        if seed == 0 and tq.num_qubits == 6:
            # from_circuit учитывает начальный layout и финальную перестановку.
            unitary = tq.remove_final_measurements(inplace=False)
            assert Operator.from_circuit(unitary).equiv(Operator(qc_plain))
    results[name] = rows
    print(name, "(depth, swap, 2q):", [(r["depth"], r["swap"], r["2q"]) for r in rows])
    print("  final layout (seed 0):", rows[0]["layout"])
    print("  " + ", ".join(f"{k}={np.mean([r[k] for r in rows]):.1f}"
                            f"±{np.std([r[k] for r in rows]):.1f}"
                            for k in ("depth", "swap", "2q")))
assert all(r["swap"] == 0 for r in results["all-to-all"])
print("контракты QAOA-блока выполнены")
```

Проверяем размеры и рёбра всех выходных схем, отсутствие SWAP на all-to-all в этом рецепте и операторную эквивалентность для seed 0 на line/all-to-all (6 кубитов, с точностью до глобальной фазы). Для heavy-hex проверка ограничена coupling и шириной 19: плотный оператор на 19 кубитах не строим. `Operator.from_circuit` компенсирует layout; тривиальное размещение не требуется. `final_index_layout()[i]` — физический провод, где закончил логический кубит i (см. [проект 04, шаг 3a](../../projects/04-qubit-mapper.md)).

## Как читать метрики

- **depth** — глубина итоговой схемы, включая измерения в QAOA; это не длительность исполнения. Для QFT ниже измерений нет.
- **SWAP** — число явных `swap` в **финальной** схеме. Это не сырой счётчик вставок роутера: оптимизация может удалить или преобразовать операции.
- **2q** — число двухкубитных инструкций итоговой схемы; в выбранном абстрактном базисе `swap` считается одной инструкцией. Это не число нативных импульсов или физическая стоимость.

`"swap"` оставлен в `basis_gates` ради наблюдения явных SWAP. При компиляции в базис `rz/sx/x/cx` явных SWAP не останется: стандартное разложение SWAP использует три CX, после чего оптимизация может менять итоговый счётчик. На платформах с другими нативными гейтами стоимость разложения другая. Для аппаратного сравнения нужен отдельный прогон с нативным `Target`, его связностью, длительностями и ошибками (см. [урок 04](04-noise-aware-compilation.md)).

Нельзя гарантированно восстановить число вставленных SWAP из ΔCX или Δ2q: синтез, отмена гейтов и оптимизация меняют оба счётчика. В исходном QAOA здесь 32 CX (8 рёбер × 2 слоя × 2), но равенство `2q = 32 + SWAP` не является контрактом транспиляции. Измеряйте метрики отдельно.

## Результаты QAOA

Проверенный прогон: Qiskit 2.6.0, оба ограничения потоков заданы до импорта, параметры — как в блоке. Mean ± std — по пяти seeds, `np.std` использует `ddof=0`. Это иллюстрация данного рецепта, а не эталон платформы.

| Топология | depth | SWAP | 2q |
|-----------|-------|------|----|
| all-to-all | 56.0 ± 0.0 | 0.0 ± 0.0 | 32.0 ± 0.0 |
| heavy-hex | 70.8 ± 2.4 | 12.0 ± 0.0 | 44.0 ± 0.0 |
| line | 78.0 ± 0.0 | 17.0 ± 0.0 | 49.0 ± 0.0 |

В этом прогоне heavy-hex лучше line и по SWAP, и по depth (70.8 < 78.0). Depth heavy-hex менялась от 66 до 72; нулевой разброс других столбцов на пяти seeds не доказывает устойчивость в общем случае.

Полный граф допускает все пары взаимодействий и не требует маршрутизации; нулевой SWAP проверяется блоком. Это не доказывает глобальную минимальность depth. Line и heavy-hex сравнивайте по фактическим числам: меньше SWAP не обязательно означает меньшую глубину. Здесь heavy-hex имеет 19 физических кубитов против 6 у остальных — это сравнение конкретных графов, а не изолированное влияние их формы.

## Расширенное задание: QFT-8

Используем библиотечный `synth_qft_full`. Сначала положительно проверяем построение: вариант с финальными SWAP эквивалентен `QFTGate`, а вариант без них становится эквивалентным после явного разворота выходных проводов. В эксперимент идёт вариант **без** финального разворота, чтобы не смешивать его с маршрутизацией. Итоговый счётчик SWAP всё равно относится ко всей оптимизированной схеме, а не к журналу роутера.

```python
# qc: executable
import os
os.environ["QISKIT_NUM_PROCS"] = "1"
os.environ["RAYON_NUM_THREADS"] = "1"
import numpy as np
import qiskit
from qiskit.circuit.library import QFTGate
from qiskit import transpile
from qiskit.quantum_info import Operator
from qiskit.synthesis.qft import synth_qft_full
from qiskit.transpiler import CouplingMap

print("Qiskit", qiskit.__version__, "QISKIT_NUM_PROCS=1 RAYON_NUM_THREADS=1")
n = 8
qc8 = synth_qft_full(n, do_swaps=False)
with_swaps = synth_qft_full(n, do_swaps=True)
restored = qc8.copy()
for i in range(n // 2):
    restored.swap(i, n - 1 - i)
reference = Operator(QFTGate(n))
assert Operator(with_swaps).equiv(reference)
assert Operator(restored).equiv(reference)
print("исходные гейты QFT-8:", dict(qc8.count_ops()))

topologies = {"line": CouplingMap.from_line(n),
              "heavy-hex": CouplingMap.from_heavy_hex(3),
              "all-to-all": CouplingMap.from_full(n)}
assert [cm.size() for cm in topologies.values()] == [8, 19, 8]
results = {}
for name, cm in topologies.items():
    rows = []
    allowed = set(cm.get_edges())
    for seed in range(5):
        tq = transpile(qc8, coupling_map=cm,
                       basis_gates=["rz", "sx", "x", "cx", "swap"],
                       layout_method="sabre", routing_method="sabre",
                       optimization_level=3, seed_transpiler=seed)
        assert tq.num_qubits == cm.size()
        pairs = [tuple(tq.find_bit(q).index for q in inst.qubits)
                 for inst in tq.data if len(inst.qubits) == 2]
        assert all(pair in allowed for pair in pairs), name
        if seed == 0 and tq.num_qubits == n:
            assert Operator.from_circuit(tq).equiv(Operator(qc8))
        rows.append({"depth": tq.depth(), "swap": tq.count_ops().get("swap", 0),
                     "2q": len(pairs), "layout": tq.layout.final_index_layout()})
    results[name] = rows
    print(name, "(depth, swap, 2q):", [(r["depth"], r["swap"], r["2q"]) for r in rows])
    print("  final layout (seed 0):", rows[0]["layout"])
    print("  " + ", ".join(f"{k}={np.mean([r[k] for r in rows]):.1f}"
                            f"±{np.std([r[k] for r in rows]):.1f}"
                            for k in ("depth", "swap", "2q")))
assert all(r["swap"] == 0 for r in results["all-to-all"])
print("контракты QFT-блока выполнены")
```

Операторные проверки ограничены 8 кубитами (построение QFT и seed 0 на line/all-to-all); на 19 проверяем только ширину и рёбра. У QFT без разворота 28 управляемых фаз; стандартное разложение каждой CP в два CX даёт исходный ориентир 56 CX, но не гарантию итогового счётчика после оптимизации. Наличие явного SWAP на line не assert'им: необходимость маршрутизации не гарантирует сохранение конкретного гейта после синтеза.

| Топология | depth | SWAP | 2q |
|-----------|-------|------|----|
| all-to-all | 52.0 ± 0.0 | 0.0 ± 0.0 | 56.0 ± 0.0 |
| heavy-hex | 91.8 ± 9.0 | 17.2 ± 0.7 | 73.2 ± 0.7 |
| line | 79.0 ± 1.1 | 23.0 ± 0.0 | 79.0 ± 0.0 |

Тот же проверенный контекст: Qiskit 2.6.0, ограничения потоков и параметры блока. Здесь heavy-hex даёт меньше SWAP, но большую depth, чем line; диапазон depth — 75–101 против 78–81. Это наблюдение данного прогона, а не универсальное свойство heavy-hex.

## Что записать в отчёт

1. Версию Qiskit, переменные окружения, параметры `transpile` и таблицы mean ± std для двух схем; добавьте min/max. При заметном разбросе расширьте выборку до 20 seeds и проверьте, сохраняется ли вывод.
2. Финальные layout для нескольких seeds: какие физические провода заняты и как это связано с метриками?
3. Вывод в 3–5 предложений: где выигрывает каждая топология по каждой метрике? Отделите наблюдение данного прогона от свойств графа связности.
4. Проверьте гипотезу: QFT-8 на line требует больше явных SWAP, чем QAOA-6. Учтите разную ширину и структуру схем, а также отсутствие измерений в QFT.

## ✅ Проверь себя

1. Почему all-to-all не требует маршрутизации, но это ещё не доказательство оптимальности depth?
2. Почему три CX на SWAP — свойство выбранного разложения, а не универсальная аппаратная цена?
3. Почему меньше SWAP может сочетаться с большей глубиной? Какие данные нужны для сравнения времени и ошибок исполнения?
4. Что проверяет `Operator.from_circuit`, как учитывает layout и почему здесь его не вызывают на 19 кубитах?

Пройдите [тест модуля 04](../../tests/04-quiz.md).

## ➡️ Что дальше

Последняя практическая работа модуля: [lab-05 — свой router и параметры SabreSwap](lab-05-sabre-routing.md).
