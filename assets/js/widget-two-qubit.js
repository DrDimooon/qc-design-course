/*
 * Виджет «Два кубита: суперпозиция, запутанность, корреляции».
 *
 * Работает офлайн (в том числе по file://) и не имеет внешних зависимостей:
 * вся математика выполняется общей библиотекой QC (assets/js/qc-core.js).
 *
 * Соглашение — Qiskit, единственное во всём курсе (см. CONVENTIONS.md):
 *   кет |q1 q0>, q0 — самый правый, младший бит;
 *   амплитуды |00>, |01>, |10>, |11> (index = 2*q1 + q0);
 *   counts печатаются в том же порядке: '01' — q1 = 0, q0 = 1.
 * Поэтому q0 — МЛАДШИЙ разряд, а q1 — старший. CNOT(q0 -> q1) применяется
 * через QC.sv.apply2(state, QC.MAT4.CNOT, 1, 0, N): матрица читается в базисе
 * |q1 q0>, то есть аргументы — (старший кубит пары, младший).
 */
(function (global) {
  'use strict';

  var QC = global.QC;
  if (!QC) { return; }

  var N = 2;                  /* два кубита */
  var SHOTS = 200;            /* число измерений за один клик */
  var C_THRESHOLD = 0.1;      /* порог, выше которого состояние считаем запутанным */
  var LABELS = ['|00⟩', '|01⟩', '|10⟩', '|11⟩'];

  var state = QC.sv.basis(N, 0);
  var counts = [0, 0, 0, 0];
  var total = 0;
  var note = [];
  var rafId = 0;

  /* ------------------------------------------------------------------ */
  /* Редуцированное состояние кубита                                   */
  /* ------------------------------------------------------------------ */
  /* Индекс в базисе |q1 q0>: index = 2*q1 + q0, поэтому младший разряд
     индекса — это q0, старший — q1. q0 = МЛАДШИЙ бит (соглашение Qiskit). */

  /* Редуцированные амплитуды: сумма амплитуд по второму кубиту. */
  function reducedAmplitudes(q) {
    var red;
    if (q === 0) {
      /* q0 — младший разряд: фиксируем бит q0, суммируем по q1. */
      red = [QC.cadd(state[0], state[2]), QC.cadd(state[1], state[3])];
    } else {
      /* q1 — старший разряд: фиксируем q1, суммируем по q0. */
      red = [QC.cadd(state[0], state[1]), QC.cadd(state[2], state[3])];
    }
    var n = QC.sv.norm(red);
    if (n > 1e-12) {
      red = [QC.cscale(red[0], 1 / n), QC.cscale(red[1], 1 / n)];
    }
    return red;
  }

  /* Вероятности исходов одного кубита по отдельности (след по второму). */
  function reducedProbs(q) {
    var p = QC.sv.probs(state);
    if (q === 0) {
      return [p[0] + p[2], p[1] + p[3]];
    }
    return [p[0] + p[1], p[2] + p[3]];
  }

  /* Недиагональный элемент редуцированной матрицы плотности rho[0][1]. */
  function reducedOff(q) {
    if (q === 0) {
      /* q0 младший: пары индексов, различающиеся только битом q0. */
      return QC.cadd(QC.cmul(state[0], QC.cconj(state[1])),
                     QC.cmul(state[2], QC.cconj(state[3])));
    }
    return QC.cadd(QC.cmul(state[0], QC.cconj(state[2])),
                   QC.cmul(state[1], QC.cconj(state[3])));
  }

  /* Чистота редукции Tr(rho^2): 1 — чистое состояние, 0.5 — максимально смешанное. */
  function reducedPurity(q) {
    var rp = reducedProbs(q);
    var o = QC.cabs(reducedOff(q));
    return rp[0] * rp[0] + rp[1] * rp[1] + 2 * o * o;
  }

  /* Конкорренс чистого состояния двух кубитов: C = 2|a00 a11 - a01 a10|. */
  function concurrence() {
    var d = QC.csub(QC.cmul(state[0], state[3]), QC.cmul(state[1], state[2]));
    return 2 * QC.cabs(d);
  }

  function percent(x) {
    return (x * 100).toFixed(2) + '%';
  }

  /* ------------------------------------------------------------------ */
  /* Отрисовка                                                          */
  /* ------------------------------------------------------------------ */

  function drawSphere(canvasId, title, q, textId) {
    var c = QC.dom.canvas(canvasId);
    if (!c) { return; }
    var red = reducedAmplitudes(q);
    var b = QC.bloch.fromVector(red);
    var ang = QC.bloch.angles(b);
    var deg = 180 / Math.PI;
    QC.draw.sphere(c.ctx, c.width, c.height, b, {
      label: title + ': x=' + b.x.toFixed(2) + '  y=' + b.y.toFixed(2) + '  z=' + b.z.toFixed(2)
    });

    var rp = reducedProbs(q);
    var pur = reducedPurity(q);
    var lines = [];
    lines.push('редуцированные амплитуды: ' + QC.sv.fmtState(red, 1, 4));
    lines.push('вектор Блоха: x=' + b.x.toFixed(2) + '  y=' + b.y.toFixed(2) + '  z=' + b.z.toFixed(2));
    lines.push('угол сферы: theta = ' + (ang.theta * deg).toFixed(1) + ' градусов, phi = ' + (ang.phi * deg).toFixed(1) + ' градусов');
    lines.push('по отдельности: P(0) = ' + (rp[0] * 100).toFixed(1) + '%, P(1) = ' + (rp[1] * 100).toFixed(1) + '%');
    if (pur > 0.999) {
      lines.push('чистота редукции: ' + pur.toFixed(3) + ' (чистое состояние)');
    } else {
      lines.push('чистота редукции: ' + pur.toFixed(3) + ' (смешанное состояние, признак запутанности)');
    }
    QC.dom.text(textId, lines.join('\n'));
  }

  function drawState() {
    var probs = QC.sv.probs(state);
    var c = concurrence();
    var lines = [];
    lines.push('Вектор состояния (4 амплитуды):');
    lines.push(QC.sv.fmtState(state, N, 4));
    lines.push('');
    var ps = [];
    for (var i = 0; i < LABELS.length; i++) {
      ps.push(LABELS[i] + ' ' + (probs[i] * 100).toFixed(1) + '%');
    }
    lines.push('Вероятности: ' + ps.join('   '));
    lines.push('Конкорренс C = ' + c.toFixed(3));
    if (c > C_THRESHOLD) {
      lines.push('ЗАПУТАНОЕ СОСТОЯНИЕ (C > ' + C_THRESHOLD + ')');
    } else {
      lines.push('СЕПАРАБЕЛЬНОЕ СОСТОЯНИЕ (C <= ' + C_THRESHOLD + ')');
    }
    if (c > C_THRESHOLD && probs[1] < 1e-6 && probs[2] < 1e-6 &&
        (probs[0] > 1e-6 || probs[3] > 1e-6)) {
      lines.push('Исходы |01⟩ и |10⟩ невозможны: кубиты всегда дают одинаковые биты');
      lines.push('(корреляция 100%), хотя по отдельности каждый из них равновероятен (50% / 50%).');
    }
    for (var k = 0; k < note.length; k++) {
      lines.push(note[k]);
    }
    QC.dom.text('state-text', lines.join('\n'));
  }

  function drawProbs() {
    var probs = QC.sv.probs(state);
    var body = QC.dom.el('prob-body');
    if (!body) { return; }
    while (body.firstChild) { body.removeChild(body.firstChild); }
    var sum = 0;
    for (var i = 0; i < LABELS.length; i++) {
      var row = document.createElement('tr');
      var c1 = document.createElement('td');
      c1.textContent = LABELS[i];
      var c2 = document.createElement('td');
      c2.textContent = percent(probs[i]);
      var c3 = document.createElement('td');
      c3.textContent = QC.cfmt(state[i], 4);
      row.appendChild(c1);
      row.appendChild(c2);
      row.appendChild(c3);
      body.appendChild(row);
      sum += probs[i];
    }
    var totalRow = document.createElement('tr');
    var t1 = document.createElement('td');
    t1.textContent = 'сумма';
    var t2 = document.createElement('td');
    t2.textContent = percent(sum);
    var t3 = document.createElement('td');
    t3.textContent = 'норма = ' + QC.sv.norm(state).toFixed(6);
    totalRow.appendChild(t1);
    totalRow.appendChild(t2);
    totalRow.appendChild(t3);
    body.appendChild(totalRow);
  }

  function drawHistogram() {
    var c = QC.dom.canvas('cv-hist');
    if (!c) { return; }
    var fr = [];
    for (var i = 0; i < 4; i++) {
      fr.push(total > 0 ? counts[i] / total : 0);
    }
    QC.draw.bars(c.ctx, c.width, c.height, fr, LABELS, {});
    var lines = [];
    if (total === 0) {
      lines.push('Измерений ещё не было. Нажмите «Измерить 200 раз».');
    } else {
      lines.push('Всего измерений: ' + total + '. Счётчики:');
      for (var j = 0; j < LABELS.length; j++) {
        lines.push('  ' + LABELS[j] + ': ' + counts[j] + ' (' + (counts[j] / total * 100).toFixed(1) + '%)');
      }
    }
    lines.push('Серия запусков одного и того же приготовленного состояния: измерения не схлопывают состояние-вектор.');
    QC.dom.text('tx-hist', lines.join('\n'));
  }

  function render() {
    drawSphere('cv-q0', 'q0', 0, 'tx-q0');
    drawSphere('cv-q1', 'q1', 1, 'tx-q1');
    drawState();
    drawProbs();
    drawHistogram();
  }

  /* ------------------------------------------------------------------ */
  /* Действия кнопок                                                    */
  /* ------------------------------------------------------------------ */

  function doReset() {
    state = QC.sv.basis(N, 0);
    counts = [0, 0, 0, 0];
    total = 0;
    note = ['Состояние сброшено к |00⟩, счётчики измерений обнулены.'];
    render();
  }

  function doMeasure() {
    for (var i = 0; i < SHOTS; i++) {
      var idx = QC.sv.sample(state);
      counts[idx] += 1;
      total += 1;
    }
    note = [];
    render();
  }

  function doCompare() {
    /* Сравнение всегда стартует с чистого |00⟩, иначе кнопка зависела бы от
       текущего состояния и результат был бы неоднозначен. */
    state = QC.sv.basis(N, 0);
    state = QC.sv.apply1(state, QC.GATES.H, 0, N);
    state = QC.sv.apply1(state, QC.GATES.H, 1, N);
    note = [
      'Сравнение: сброс к |00⟩, затем H на обоих кубитах без CNOT даёт |+⟩|+⟩ — по 25% на каждый исход,',
      'конкорренс 0, кубиты независимы (исходы 01 и 10 вполне возможны).'
    ];
    render();
  }

  /* ------------------------------------------------------------------ */
  /* Инициализация                                                      */
  /* ------------------------------------------------------------------ */

  function init() {
    QC.dom.button('btn-h0', 'H на q0', function () {
      state = QC.sv.apply1(state, QC.GATES.H, 0, N);
      note = [];
      render();
    }, 'Применить гейт Адамара к кубиту q0 (младший бит, правый разряд кета).');

    QC.dom.button('btn-h1', 'H на q1', function () {
      state = QC.sv.apply1(state, QC.GATES.H, 1, N);
      note = [];
      render();
    }, 'Применить гейт Адамара к кубиту q1 (старший бит, левый разряд кета).');

    QC.dom.button('btn-cnot', 'CNOT (q0 -> q1)', function () {
      /* cx(0, 1): контроль q0, цель q1. Матрица MAT4.CNOT читается в базисе
         |q1 q0>, поэтому аргументы apply2 — (старший кубит пары, младший). */
      state = QC.sv.apply2(state, QC.MAT4.CNOT, 1, 0, N);
      note = [];
      render();
    }, 'Управляющий q0 (младший бит), управляемый q1 (старший): |01> <-> |11>.');

    QC.dom.button('btn-reset', 'Сброс |00⟩', doReset,
      'Вернуть состояние |00⟩ и обнулить счётчики измерений.');

    QC.dom.button('btn-compare', 'Сравнить: H на обоих без CNOT', doCompare,
      'H на q0 и H на q1 без CNOT: сепарабельное состояние с равными вероятностями.');

    QC.dom.button('btn-measure', 'Измерить 200 раз', doMeasure,
      'Добавить 200 измерений текущего состояния к накопленным счётчикам.');

    global.addEventListener('resize', function () {
      if (rafId) { return; }
      rafId = global.requestAnimationFrame(function () {
        rafId = 0;
        render();
      });
    });

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
