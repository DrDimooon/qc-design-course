---
title: "Qiskit за один урок: от кубита до counts"
module: "02 Программирование"
difficulty: "intermediate"
duration: "~1.5 ч"
status: "draft"
tags: [qiskit, aer, statevector]
---

# Qiskit за один урок: от кубита до counts

## Модель программирования

Qiskit 2.x устроен так: вы строите объект `QuantumCircuit` (описание, а не «исполнение»), затем передаёте его бэкенду (симулятору или реальному QPU) и получаете результат. Никакой неявной файловой системы состояний — всё через явные объекты.

```python
from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)   # 2 кубита, 2 классических бита
qc.h(0)                     # H на кубите 0
qc.cx(0, 1)                 # CNOT: control=0, target=1
qc.measure([0, 1], [0, 1])  # измеряем кубиты в биты
qc.draw()                   # текстовый рисунок схемы
```

`draw()` работает в терминалах/Jupyter как ASCII-диаграмма. Для Jupyter также полезно `qc.draw("mpl")` (нужен matplotlib).

## Аналитический взгляд: Statevector

До измерения схема описывается вектором состояния. `qiskit.quantum_info` позволяет «прикрепить» состояние:

```python
from qiskit.quantum_info import Statevector

sv = Statevector.from_instruction(qc.remove_final_measurements(inplace=False))
sv
# Statevector([0.70710678+0.j, 0.        +0.j, 0.        +0.j, 0.70710678+0.j],
#             dims=(2, 2))   # (|00> + |11>)/sqrt(2)
```

Для проверки, что две схемы равны, используйте матрицу оператора:

```python
from qiskit import QuantumCircuit
from qiskit.quantum_info import Operator

a = qc.remove_final_measurements(inplace=False)
b = QuantumCircuit(2); b.h(0); b.cx(0, 1)
Operator(a).equiv(Operator(b))   # True
```

## Статистический взгляд: симуляция

Симулятор воспроизводит счёт реального устройства: много выстрелов (shots), распределение результатов.

```python
from qiskit_aer import AerSimulator

sim = AerSimulator()
result = sim.run(qc, shots=1024).result()
result.get_counts()
# {'00': 513, '11': 511}   (примерно 50/50)
```

Три режима работы с одной и той же схемой — аналитика (`Statevector`), проверка эквивалентности (`Operator`), статистика (`AerSimulator`) — распознавайте, какой нужен для задачи, это половина навыка.

## Проверка визуализаций

```python
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

qc1 = QuantumCircuit(1); qc1.h(0)
sv = Statevector.from_instruction(qc1)   # то состояние, которое рисуем на сфере
```

Для сферы Блоха:

```python
import matplotlib
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector
from qiskit.visualization import plot_bloch_multivector
qc1 = QuantumCircuit(1); qc1.h(0)
plot_bloch_multivector(Statevector.from_instruction(qc1))
```

## Установка (коротко)

Если ещё не сделали [lab-00](../00-fundamentals/lab-00-env-setup.md): `pip install qiskit qiskit-ibm-runtime qiskit-aer matplotlib jupyterlab`. Подробности и типичные ошибки — там же.

## 📚 Узнать подробнее

Примечание: таймкоды в этом справочнике не проставлены — на момент проверки YouTube блокирует программный доступ к субтитрам, а выдуманные или непроверенные интервалы вставлять нельзя. Ссылки даны без времени.

<details markdown="1">
<summary>Видеолекции</summary>

- **Introduction to Qiskit | Coding with Qiskit 1.x | Programming on Quantum Computers, канал Qiskit** — блок урока «Модель программирования»: установка Qiskit 1.x и первые схемы `QuantumCircuit` с гейтом H, CNOT и `measure`, объяснение цикла «объект схемы -> бэкенд -> counts», о котором начинается урок. [ссылка](https://youtu.be/Tk9LOL9--Y4)
- **QIQT23 | Abby Mitchell - Learn Qiskit in 1 Hour, QIQT** — сжатый практикум по всему материалу урока: создание `QuantumCircuit`, `draw`, вёрстка «Аналитический/Статистический взгляд» на одной и той же схеме. [ссылка](https://youtu.be/d8kKYQgxc70)
- **Quantum Circuits | Understanding Quantum Information & Computation | Lesson 03, канал Qiskit** (Джон Уотрус) — формальная сторона блока «Аналитический взгляд: Statevector»: схема как унитарная операция над состоянием, связь с вектором состояния до измерения. [ссылка](https://youtu.be/30U2DTfIrOU)
</details>

<details markdown="1">
<summary>Статьи и блоги</summary>

- **«Simplified quantum software development with Qiskit», IBM Quantum blog** — обзор всего стека вокруг «Модели программирования»: SDK 1.0, V2-примитивы Estimator/Sampler, fake-бэкенды и сервисы Runtime — куда перерастает цикл «QuantumCircuit -> бэкенд -> counts» из урока. [ссылка](https://www.ibm.com/quantum/blog/dev-tools)
</details>

<details markdown="1">
<summary>Книги / документация (глава/раздел)</summary>

- **Qiskit документация** (quantum.cloud.ibm.com), гайд «Construct circuits»: построение схемы методами `qc.h(0)`, `qc.cx(0, 1)`, `append`, `compose`, `measure`, встроенное `qc.draw("mpl")` — прямое сопровождение блоков «Модель программирования» и «Установка». Проверено webfetch. [ссылка](https://quantum.cloud.ibm.com/docs/guides/construct-circuits)
- **Qiskit документация** (quantum.cloud.ibm.com), API `qiskit.quantum_info.Statevector`: `from_instruction`, `equiv` (сравнение состояний с точностью до глобальной фазы), `probabilities`, `sample_counts` — расширяет блок «Аналитический взгляд: Statevector». Проверено webfetch. [ссылка](https://quantum.cloud.ibm.com/docs/api/qiskit/qiskit.quantum_info.Statevector)
- **Qiskit Aer документация** (qiskit.github.io), туториал «Simulators» и API-страница `qiskit_aer.AerSimulator`: методы симуляции, `sim.run(qc, shots=...).result().get_counts()`, замена ideal-симуляции шумной через `NoiseModel` — блок «Статистический взгляд: симуляция». Проверено webfetch (туториал), API-страница — поиском по содержимому. [ссылка](https://qiskit.github.io/qiskit-aer/tutorials/1_aersimulator.html), [API AerSimulator](https://qiskit.github.io/qiskit-aer/stubs/qiskit_aer.AerSimulator.html)
</details>

<details markdown="1">
<summary>Русскоязычные ресурсы</summary>

- **«Учимся квантовому программированию с помощью примеров», Ришат Ибрагимов (Яндекс), Хабр** — практический доклад по основам Qiskit: создание схем, гейты H/X/CNOT, запуск на локальном симуляторе и IBM Q, разбор результатов — прямое сопровождение блоков «Модель программирования» и «Статистический взгляд: симуляция». Проверено webfetch. [ссылка](https://habr.com/ru/companies/yandex/articles/510054/)
- **«Обзор и сравнение квантовых программных платформ гейтового уровня», перевод статьи Ryan LaRose, Хабр** — сравнение Qiskit, pyQuil, ProjectQ и Q# по установке, синтаксису, симуляторам и облачным бэкендам — контекст для «Модели программирования» и выбора инструментов. Проверено webfetch. [ссылка](https://habr.com/ru/articles/418505/)
- **Онлайн-курс «Программируем квантовые компьютеры на Python с QisKit», Сысоев С.С., СПбГУ** — модуль 1 «QisKit. Основы. Симуляторы» и модуль 2 «QisKit. Гейты. Ввод-вывод» покрывают `QuantumCircuit`, симуляторы Aer и базовые гейты — блоки «Модель программирования», «Аналитический взгляд» и «Статистический взгляд». Проверено webfetch. [ссылка](https://online.spbu.ru/courses/programmirovanie-kvantovyx-kompyuterov-na-python-s-qiskit/)
- **«Программирование квантовых компьютеров: джентльменский набор», издательство «Питер», Хабр** — обзор русскоязычной книги по Qiskit с разбором кода: установка, создание схем, работа с IBM Quantum Experience — дополнение к «Установке» и «Модели программирования». Проверено webfetch. [ссылка](https://habr.com/ru/companies/piter/articles/521128/)
- **Лекции МФТИ «Квантовые вычисления», Л.Е. Федичкин** — вводный курс по квантовым вычислениям с базовыми понятиями кубитов, операций и алгоритмов — контекст для «Модели программирования» и «Аналитического взгляда». По поиску. [ссылка](https://youtu.be/9-li-7EKWeE)
</details>

## 🎛 Интерактив

Виджет-конструктор собирает квантовую схему кликами по кнопкам гейтов и сразу показывает текст цепи, вектор состояния, вероятности четырёх исходов и гистограмму из 200 измерений. Здесь видно руками, что `QuantumCircuit` — это описание, а не исполнение: та же цепочка гейтов, что записана в коде урока, даёт здесь тот же вектор состояния.

<iframe class="qc-embed" src="../../assets/interactive/circuit-playground.html" title="Конструктор схем" height="700" loading="lazy"></iframe>

**Задание.**

- Нажмите **H** при выбранной цели **q0**, затем кнопку **CNOT**. Ожидаемый результат: строка цепи `q0: H; CNOT(q0->q1)`, а в блоке состояния — ровно две ненулевые амплитуды `0.7071 + 0.0000i` у `|00>` и `|11>`.
- Посмотрите на строку «Вероятности» и на диаграмму. Ожидаемый результат: `|00> 50.0%`, `|01> 0.0%`, `|10> 0.0%`, `|11> 50.0%` — запутанное состояние, в котором второй кубит повторяет первый.
- Нажмите **«Измерить 200 раз»**. Ожидаемый результат: гистограмма содержит только два столбика — `|00>` и `|11>`, их счётчики в сумме дают 200, а по `|01>` и `|10>` — ноль измерений.
- Нажмите **«Удалить последний»** (убирается CNOT) и посмотрите на строку цепи. Ожидаемый результат: остаётся `q0: H`, вероятности снова по 50 % на `|00>` и `|10>` и нули на `|01>` и `|11>`, а счётчики измерений обнулены, потому что схема изменилась.

Как это связано с уроком: собранная цепочка — это ровно та схема, что в коде выше записывается как `qc.h(0); qc.cx(0, 1)`, а её состояние `(0.7071 + 0.0000i) |00> + (0.7071 + 0.0000i) |11>` совпадает с выводом `Statevector.from_instruction` из раздела «Аналитический взгляд». Гистограмма виджета — аналог `get_counts()` из раздела «Статистический взгляд», только с 200 выстрелами вместо 1024: поэтому частоты `|00>` и `|11>` отличаются друг от друга, а лишних ключей в словаре не появляется.

## ✅ Проверь себя

1. Чем отличается `QuantumCircuit(2)` от `QuantumCircuit(2, 2)`?
2. Почему `Statevector.from_instruction` требует убрать измерения? Что вытолкнет ошибка, если этого не сделать?
3. Какой из трёх подходов (Statevector / Operator / AerSimulator) покажет вероятность, что «q0 (младший разряд) равен 1», для схемы с 5 кубитами? Почему Statevector тоже может, но по-другому?
4. За счёт чего `shots=1024` даёт результат «50/50 ± разброс»? (правильный ответ: выборка из распределения Бернулли — подумайте и проверьте в тесте)

Тест по модулю: [02-quiz.md](../../tests/02-quiz.md).

## ➡️ Что дальше

[02-gates-circuits-qiskit.md](02-gates-circuits-qiskit.md) — полный набор гейтов и параметризация.
