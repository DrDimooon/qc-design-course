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
h разлагается в rz и sx, а CX можно представить одним ECR и локальными гейтами
с точностью до глобальной фазы. Итоговый счёт зависит от оптимизации всей схемы;
не выводите число нативных 2q-гейтов только из числа логических CX.

## 4.2. Уровни оптимизации

```python
from qiskit.quantum_info import Operator

metrics = [transpile(qc, optimization_level=lv, seed_transpiler=42) for lv in range(4)]
reference = Operator(qc.remove_final_measurements(inplace=False))
for level, out in enumerate(metrics):
    print(level, "depth =", out.depth(), "size =", out.size(), dict(out.count_ops()))
    assert Operator.from_circuit(out.remove_final_measurements(inplace=False)).equiv(reference)
```

Пояснение: 0 — базовый исполнимый вариант, 1 — лёгкие оптимизации, 2–3 — более
дорогой поиск и преобразования. Level 3 не гарантирует победы по depth, нативному
2q-count, длительности или ошибке. Проверяем сохранение оператора унитарной части
с учётом layout и с точностью до глобальной фазы, а не монотонность метрик.
Depth — структурные слои, не физическое время. Имена и ростеры пассов зависят от
версии и параметров: получайте рекурсивное дерево `generate_preset_pass_manager` и сверяйтесь с
[уроком 04](../../curriculum/04-systems-design/02-transpiler-internals.md).
На маленькой схеме метрики уровней могут совпасть; сравнивайте конкретные схемы
и время компиляции по [лестнице метрик](../../curriculum/04-systems-design/03-routing-mapping-sabre.md#metrics-ladder).

## 4.3. Ограничения топологии

```python
line = CouplingMap.from_line(3)
routed = transpile(qc, coupling_map=line, optimization_level=1, seed_transpiler=42)

ops = routed.count_ops()
assert ops.get("swap", 0) >= 1
print("depth =", routed.depth(), "size =", routed.size(), "swap =", ops.get("swap", 0))
```

Пояснение: в шаблоне взаимодействуют все три пары, и весь interaction-граф нельзя
вложить в линию без routing. Начальный layout может менять физические адреса;
SWAP меняет карту и для последующих взаимодействий. Здесь считаются сохранившиеся
явные SWAP, не нативный 2q-count после их декомпозиции.

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
print(line_stats, "|", ring_stats)
```

Пояснение: в кольце максимальное расстояние между кубитами — 2, в линии — 4, поэтому
топология допускает более короткие маршруты, но эвристика не обязана выиграть на
каждом корпусе/seed'е; поэтому строгого assert о победе кольца нет. Верхнеуровневый
вывод: качество зависит не только от схемы, но и от топологии. Ранее наблюдавшиеся
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

Пояснение: уровень 0 — базовый исполнимый вариант, а высокие уровни допускают
более дорогие преобразования. Это не гарантия строгого порядка времени отдельных
запусков: нужны прогрев, повторы и фиксированные условия. Сравнивайте классическое
время компилятора и качество отдельно от физического makespan (см. lab-05).
