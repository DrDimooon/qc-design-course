---
title: "Ответы: Kata 05 (Sabre-маршрутизация и seed'ы)"
module: "Каты"
difficulty: "advanced"
duration: "~10 мин"
status: "draft"
tags: [answers, kata, sabre-swap, routing, seeds, depth]
---

# Ответы: Kata 05

Полные решения к [tests/katas/kata-05-sabre-seeds.md](../katas/kata-05-sabre-seeds.md). Читайте только после попытки.

Импорты — те же, что в задании (`statistics`, `CouplingMap`, `PassManager`,
`TrivialLayout`, `SabreSwap`).

Нагрузочная схема (та же, что в задании):

```python
def all_to_all(num_qubits):
    qc = QuantumCircuit(num_qubits, num_qubits)
    layers = [
        [(0, 4), (1, 3)],
        [(0, 3), (4, 1)],
        [(0, 2), (3, 4)],
        [(1, 4), (2, 3)],
        [(0, 1), (2, 4)],
    ]
    for layer in layers:
        for a, b in layer:
            qc.cx(a, b)
        qc.barrier()
    qc.h(0)
    qc.cx(0, 1)
    qc.measure(list(range(num_qubits)), list(range(num_qubits)))
    return qc

qc = all_to_all(5)
```

## 5.1. Зачем такая схема

Пары внутри слоёв (включая, например, (0, 4)) не соседи на линии 0-1-2-3-4, поэтому
маршрутизации без SWAP не обойтись. Барьеры размечают слои, поэтому сравнение
результатов между seed'ами остаётся информативным.

## 5.2. Базовый прогон

```python
line5 = CouplingMap.from_line(5)
routed = transpile(qc, coupling_map=line5, optimization_level=1, seed_transpiler=1)

ops = routed.count_ops()
print("depth =", routed.depth(), "size =", routed.size(), "swap =", ops.get("swap", 0))
assert "swap" in ops
```

Пояснение: с coupling_map transpile также привязывает схему к физическим кубитам;
число кубитов в выходной схеме равно размеру coupling_map.

## 5.3. Вариативность по seed

```python
runs = []
for seed in range(30):
    r = transpile(qc, coupling_map=line5, optimization_level=1, seed_transpiler=seed)
    runs.append({"seed": seed,
                 "depth": r.depth(),
                 "size": r.size(),
                 "swap": r.count_ops().get("swap", 0)})

depths = [row["depth"] for row in runs]
swaps = [row["swap"] for row in runs]
best = min(runs, key=lambda row: (row["swap"], row["depth"]))

print("swap:  min =", min(swaps), "mean =", statistics.mean(swaps), "max =", max(swaps))
print("depth: min =", min(depths), "mean =", statistics.mean(depths), "max =", max(depths))
print("best seed =", best["seed"])
```

Пояснение: Sabre — стохастическая эвристика: многие seed'ы дают близкую статистику,
а заметно «лучший» seed — редкая удача. Именно поэтому один запуск ничего не говорит
о качестве компилятора в общем случае. На конкретной схеме задачи 5.1 (5 кубитов,
линия 0-1-2-3-4) 30 seed'ов дают одинаковое число SWAP (4), а depth колеблется
в пределах 11…12: стохастичность проявляется в структуре схемы, и на этой схеме
почти не в числе свопов.

## 5.4. Линия против кольца

```python
ring5 = CouplingMap.from_ring(5)

def collect(cmap, seeds=10, level=1):
    rundata = []
    for seed in range(seeds):
        r = transpile(qc, coupling_map=cmap, optimization_level=level,
                      seed_transpiler=seed)
        rundata.append({"depth": r.depth(), "swap": r.count_ops().get("swap", 0)})
    return {"depth": statistics.mean(row["depth"] for row in rundata),
            "swap": statistics.mean(row["swap"] for row in rundata)}

line_stats = collect(line5)
ring_stats = collect(ring5)
assert ring_stats["swap"] <= line_stats["swap"]
print("line:", line_stats, "ring:", ring_stats)
```

Пояснение: у кольца максимальное расстояние между кубитами — 2, у линии — 4, поэтому
маршрутизация требует меньше SWAP. Это одна из причин, почему топология устройства —
важный input для планировщика.

## 5.5. Эвристики SabreSwap

```python
def sabre_metrics(heuristic, seed):
    pm = PassManager([
        TrivialLayout(line5),
        SabreSwap(line5, heuristic=heuristic, seed=seed),
    ])
    out = pm.run(qc)
    return {"swap": out.count_ops().get("swap", 0), "depth": out.depth()}

for heuristic in ("basic", "decay"):
    metrics = [sabre_metrics(heuristic, seed) for seed in range(10)]
    swaps = [row["swap"] for row in metrics]
    depths = [row["depth"] for row in metrics]
    print(f"{heuristic:>6}: swap mean = {statistics.mean(swaps):.1f}, "
          f"depth mean = {statistics.mean(depths):.1f}")
```

Пояснение: transpile целиком использует SabreLayout (layout и routing связаны), поэтому
для «чистого» сравнения эвристик SabreSwap мы фиксируем layout через TrivialLayout и
включаем только маршрутизацию. В реальных экспериментах фиксируйте и trials
(число независимых попыток Sabre), иначе сравнение эвристик будет несправедливым.

## 5.6. Честный протокол сравнения

```python
swaps = [row["swap"] for row in runs]     # данные из 5.3
print("best :", min(swaps))
print("mean :", statistics.mean(swaps))
print("worst:", max(swaps))
```

Пояснение: честный отчёт по стохастическому сравнению — таблица mean ± std по seed'ам
(или медиана), а не мин. Если цель — «наш транспилятор», а не «наш транспилятор при
удачном seed 7», то протокол включает: фиксированный набор seed'ов, одинаковое
optimization_level, одинаковые trials, mean±std в отчёте. На схеме задачи 5.1
минимум, среднее и максимум по SWAP совпадают (4) — разброс виден только по depth,
и именно поэтому «best = min» здесь не даёт никакого выигрыша в отчёте.

## Сводный вывод

- Sabre — стохастическая эвристика: seed меняет структуру скомпилированной схемы,
  а на этой схеме — глубину (11…12); число SWAP у всех 30 seed'ов одинаково.
- Кольцо лучше линии по стоимости маршрутизации при одинаковом числе кубитов.
- Качество компиляции зависит и от схемы, и от топологии, и от параметров
  маршрутизатора — поэтому эксперименты требуют протокола.
