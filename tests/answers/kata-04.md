---
title: "Ответы: Kata 04 (transpile и метрики схем)"
module: "Каты"
difficulty: "intermediate/advanced"
duration: "~10 мин"
status: "draft"
tags: [answers, kata, transpiler, optimization-level, coupling-map, seed-transpiler]
---

# Ответы: Kata 04

Полные решения к [tests/katas/kata-04-transpile-tuning.md](../katas/kata-04-transpile-tuning.md). Читайте только после попытки.

Дополнительно к импортам из задания: `import statistics` (нужен в 4.5).

Шаблонная схема (та же, что в задании):

```python
def template_circuit():
    qc = QuantumCircuit(3)
    qc.h(0)
    qc.cx(0, 1)
    qc.cx(1, 2)
    qc.h(0)
    qc.cx(0, 1)
    qc.cx(1, 2)
    qc.cx(0, 2)          # «дальняя» пара
    qc.measure_all()
    return qc

qc = template_circuit()
```

## 4.1. Перевод в нативный базис

```python
ecr_hit = transpile(qc, basis_gates=["rz", "sx", "x", "ecr"], optimization_level=1)
u_cx = transpile(qc, basis_gates=["u", "cx"], optimization_level=1)

print(ecr_hit.count_ops())   # {"rz": ..., "sx": ..., "ecr": ..., "measure": ...}
print(u_cx.count_ops())      # {"u": ..., "cx": ..., "measure": ...}
```

Пояснение: набор `["rz", "sx", "x", "ecr"]` — нативный базис современных IBM-чипов:
h разлагается в rz и sx, а один cx переписывается в две ecr (поэтому счёт 2q-гейтов
может вырасти).

## 4.2. Уровни оптимизации

```python
for level in range(4):
    out = transpile(qc, optimization_level=level, seed_transpiler=42)
    print(level, "depth =", out.depth(), "size =", out.size(),
          dict(out.count_ops()))

metrics = [transpile(qc, optimization_level=lv, seed_transpiler=42) for lv in range(4)]
assert metrics[3].depth() <= metrics[0].depth()
```

Пояснение: level 0 почти не оптимизирует, level 1 делает лёгкие проходы
(сжатие цепочек 1q-гейтов и отмену взаимно обратных гейтов), level 2 добавляет
отмены через коммутацию и более глубокий поиск layout/routing, level 3 — пересборку
пар 2q-гейтов и самые дорогие проходы с повторными прогонами. Имена и ростеры пассов
версионны и не являются частью контракта уровня: получайте их дампом
`generate_preset_pass_manager` и сверяйтесь с
[уроком 04](../../curriculum/04-systems-design/02-transpiler-internals.md).
Минимальная глубина никаким уровнем не гарантирована — сравнивайте конкретные
схемы. На шаблонной схеме каты (3 кубита, 5 гейтов) все четыре уровня могут дать
одинаковые метрики (depth 7, size 10) — разница между уровнями видна на более крупных
схемах.

## 4.3. Ограничения топологии

```python
line = CouplingMap.from_line(3)
routed = transpile(qc, coupling_map=line, optimization_level=1, seed_transpiler=42)

ops = routed.count_ops()
assert ops.get("swap", 0) >= 1
print("depth =", routed.depth(), "size =", routed.size(), "swap =", ops.get("swap", 0))
```

Пояснение: пара (0, 2) не соседняя на линии 0-1-2, поэтому маршрутизатор обязан
вставить SWAP (который при разложении достаточно дорог). Остальные пары соседние,
их SWAP не касается.

## 4.4. Вариативность от seed

```python
results = []
for seed in range(20):
    r = transpile(qc, coupling_map=CouplingMap.from_line(3),
                  optimization_level=1, seed_transpiler=seed + 1)
    results.append({"seed": seed + 1,
                    "depth": r.depth(),
                    "size": r.size(),
                    "swap": r.count_ops().get("swap", 0)})

depths = [row["depth"] for row in results]
swaps = [row["swap"] for row in results]
print("depth: min =", min(depths), "max =", max(depths))
print("swap:  min =", min(swaps),  "max =", max(swaps))
assert max(depths) >= min(depths)
```

Пояснение: seed задаёт случайность layout/routing; одинаковый seed — одинаковый
результат. Для маленькой схемы на 3 кубитах разброс может быть нулевым (проверено
для 20 seed'ов: depth 8…8, swap 1…1), а для крупных схем вариативность существенна —
поэтому бенчмарки всегда фиксируют seed.

## 4.5. Линия против кольца

```python
def template5():
    qc = QuantumCircuit(5)
    qc.h(0)
    qc.cx(0, 1); qc.cx(1, 2); qc.cx(2, 3); qc.cx(3, 4)
    qc.cx(0, 2); qc.cx(2, 4); qc.cx(1, 3)
    qc.h(0)
    qc.cx(0, 4); qc.cx(1, 3)
    qc.measure_all()
    return qc

qc5 = template5()

def collect_metrics(cmap, seeds=10, level=1):
    rundata = []
    for seed in range(seeds):
        r = transpile(qc5, coupling_map=cmap, optimization_level=level,
                      seed_transpiler=seed)
        rundata.append({"depth": r.depth(),
                        "swap": r.count_ops().get("swap", 0)})
    return {"depth": statistics.mean(row["depth"] for row in rundata),
            "swap": statistics.mean(row["swap"] for row in rundata)}

line5 = CouplingMap.from_line(5)
ring5 = CouplingMap.from_ring(5)

line_stats = collect_metrics(line5)
ring_stats = collect_metrics(ring5)
assert ring_stats["swap"] <= line_stats["swap"]
print(line_stats, "|", ring_stats)
```

Пояснение: в кольце максимальное расстояние между кубитами — 2, в линии — 4, поэтому
маршрутизация тех же 2q-гейтов требует меньше подвижек. Верхнеуровневый вывод:
качество компиляции зависит не только от схемы, но и от топологии. Проверенные
числа (Qiskit 2.6, 5 и 10 seed'ов): на линии в среднем 3 SWAP, на кольце — 2;
по depth кольцо может чуть проигрывать (маршрут короче, но шаг глубже). На
трёхкубитном шаблоне каты сравнение неинформативно: там и линия, и кольцо дают
swap 1 и depth 8.

## 4.6. Время компиляции

```python
for level in range(4):
    t0 = time.perf_counter()
    out = transpile(qc, optimization_level=level)
    dt = time.perf_counter() - t0
    print(f"level = {level}: {dt * 1000:.1f} ms, depth = {out.depth()}, "
          f"size = {out.size()}")
```

Пояснение: уровень 0 — почти тривиальный проход, он быстрее. Чем выше уровень, тем
больше этап активен; на крупных схемах разница может быть в разы. Здесь же — большой
вывод: в общем случае trade-off «время компиляции против качества» (см. lab-05).
