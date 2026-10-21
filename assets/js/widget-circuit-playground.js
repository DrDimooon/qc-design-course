/*
 * Виджет «Конструктор квантовых схем»: сборка цепи кликами.
 *
 * Страница виджета: assets/interactive/circuit-playground.html
 * Используется только API общей библиотеки window.QC (assets/js/qc-core.js),
 * внешних зависимостей нет, работа офлайн по file://.
 *
 * Устройство:
 *   ops      — цепочка операций: {kind:'1', name, gate, target}
 *              или {kind:'2', name:'CNOT', mat, q1, q2};
 *   counts   — счётчики результатов измерения по четырём исходам;
 *   target   — выбранный целевой кубит для однокубитных гейтов.
 *
 * Состояние не накапливается: при любом изменении цепочки оно пересчитывается
 * с нуля — QC.sv.basis(2, 0), затем QC.sv.applyOp для каждой операции.
 */
(function () {
  'use strict';

  var QC = window.QC;
  if (!QC || !QC.sv || !QC.draw || !QC.dom) { return; }

  var NQ = 2;                             /* число кубитов */
  var SHOTS = 200;                        /* измерений в одной серии */
  var SINGLE_GATES = ['X', 'Y', 'Z', 'H', 'S', 'T'];
  var LABELS = ['|00⟩', '|01⟩', '|10⟩', '|11⟩'];

  var ops = [];
  var counts = [0, 0, 0, 0];
  var measured = false;
  var target = 0;

  /* ------------------------------------------------------------------ */
  /* Модель                                                             */
  /* ------------------------------------------------------------------ */

  /* Состояние пересчитывается с нуля: начальное |00> плюс вся цепочка. */
  function computeState() {
    var v = QC.sv.basis(NQ, 0);
    for (var i = 0; i < ops.length; i++) {
      v = QC.sv.applyOp(v, ops[i], NQ);
    }
    return v;
  }

  /* Текст цепи: «q0: H, S; q1: X; CNOT(q0->q1)». */
  function chainText() {
    var perQubit = [[], []];
    var cnots = [];
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      if (op.kind === '1') {
        perQubit[op.target].push(op.name);
      } else {
        cnots.push('CNOT(q' + op.q1 + '->q' + op.q2 + ')');
      }
    }
    var parts = [];
    for (var q = 0; q < NQ; q++) {
      if (perQubit[q].length) {
        parts.push('q' + q + ': ' + perQubit[q].join(', '));
      }
    }
    parts = parts.concat(cnots);
    return parts.length ? parts.join('; ') : 'схема пуста';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ------------------------------------------------------------------ */
  /* Действия пользователя                                              */
  /* ------------------------------------------------------------------ */

  function resetCounts() {
    counts = [0, 0, 0, 0];
    measured = false;
  }

  function addGate(name) {
    ops.push({ kind: '1', name: name, gate: QC.GATES[name], target: target });
    resetCounts();
    render();
  }

  function addCnot() {
    ops.push({ kind: '2', name: 'CNOT', mat: QC.MAT4.CNOT, q1: 0, q2: 1 });
    resetCounts();
    render();
  }

  function undo() {
    if (!ops.length) { return; }
    ops.pop();
    resetCounts();
    render();
  }

  function reset() {
    ops = [];
    resetCounts();
    render();
  }

  /* Случайная схема: 2–6 операций, иногда с CNOT. */
  function randomCircuit() {
    ops = [];
    var n = 2 + Math.floor(Math.random() * 5);
    for (var i = 0; i < n; i++) {
      if (ops.length && Math.random() < 0.25) {
        ops.push({ kind: '2', name: 'CNOT', mat: QC.MAT4.CNOT, q1: 0, q2: 1 });
      } else {
        var name = SINGLE_GATES[Math.floor(Math.random() * SINGLE_GATES.length)];
        ops.push({ kind: '1', name: name, gate: QC.GATES[name], target: Math.floor(Math.random() * NQ) });
      }
    }
    resetCounts();
    render();
  }

  /* Серия из 200 измерений одной и той же схемы. */
  function measure() {
    var v = computeState();
    counts = [0, 0, 0, 0];
    for (var i = 0; i < SHOTS; i++) {
      counts[QC.sv.sample(v)]++;
    }
    measured = true;
    render();
  }

  function setTarget(t) {
    target = t;
    var b0 = QC.dom.el('target-q0');
    var b1 = QC.dom.el('target-q1');
    if (b0) { b0.setAttribute('aria-pressed', t === 0 ? 'true' : 'false'); }
    if (b1) { b1.setAttribute('aria-pressed', t === 1 ? 'true' : 'false'); }
  }

  /* ------------------------------------------------------------------ */
  /* Отрисовка                                                          */
  /* ------------------------------------------------------------------ */

  function isDark() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch (e) {
      return false;
    }
  }

  /* Палитра линий и подписей: подстраивается под тёмную тему. */
  function palette() {
    var dark = isDark();
    return {
      text: dark ? '#e8e8e8' : '#333333',
      dim: dark ? 'rgba(232,232,232,0.6)' : 'rgba(51,51,51,0.6)',
      wire: dark ? 'rgba(210,210,210,0.55)' : 'rgba(120,120,120,0.7)',
      fill: dark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.8)'
    };
  }

  function gateColor(name) {
    switch (name) {
      case 'X': return QC.draw.colors.x;
      case 'Y': return QC.draw.colors.y;
      case 'Z': return QC.draw.colors.z;
      case 'H': return QC.draw.colors.state;
      case 'S': return '#e08b52';
      case 'T': return '#3aa0a8';
      default: return QC.draw.colors.text;
    }
  }

  function drawGate(ctx, name, cx, cy, boxW, boxH, pal) {
    var color = gateColor(name);
    var x = cx - boxW / 2;
    var y = cy - boxH / 2;
    ctx.save();
    ctx.fillStyle = pal.fill;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, boxW, boxH, 4);
    } else {
      ctx.rect(x, y, boxW, boxH);
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = 'bold ' + Math.max(10, Math.min(14, Math.floor(boxW * 0.5))) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, cx, cy + 1);
    ctx.restore();
  }

  /* CNOT: кружок на управляющем q0, вертикальная линия, крест на целевом q1. */
  function drawCnot(ctx, cx, yCtrl, yTgt, pal) {
    ctx.save();
    ctx.strokeStyle = pal.text;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, yCtrl);
    ctx.lineTo(cx, yTgt);
    ctx.stroke();
    ctx.fillStyle = pal.text;
    ctx.beginPath();
    ctx.arc(cx, yCtrl, 5.5, 0, 2 * Math.PI);
    ctx.fill();
    var r = 8;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - r, yTgt - r);
    ctx.lineTo(cx + r, yTgt + r);
    ctx.moveTo(cx + r, yTgt - r);
    ctx.lineTo(cx - r, yTgt + r);
    ctx.stroke();
    ctx.restore();
  }

  function drawCircuit() {
    var c = QC.dom.canvas('circuit');
    if (!c) { return; }
    var ctx = c.ctx;
    var w = c.width;
    var h = c.height;
    var pal = palette();

    var padL = 76;
    var padR = 20;
    var padT = 34;
    var padB = 26;
    var x0 = padL;
    var x1 = Math.max(x0 + 80, w - padR);
    var areaH = Math.max(40, h - padT - padB);
    var y0 = padT + areaH * 0.3;
    var y1 = padT + areaH * 0.7;

    ctx.clearRect(0, 0, w, h);

    /* дорожки кубитов */
    ctx.save();
    ctx.strokeStyle = pal.wire;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y0);
    ctx.moveTo(x0, y1);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();

    /* подписи дорожек */
    ctx.save();
    ctx.fillStyle = pal.text;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('кубит 0', x0 - 12, y0);
    ctx.fillText('кубит 1', x0 - 12, y1);
    ctx.restore();

    if (!ops.length) {
      ctx.save();
      ctx.fillStyle = pal.dim;
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Схема пуста: нажмите кнопку гейта', (x0 + x1) / 2, (y0 + y1) / 2);
      ctx.restore();
      return;
    }

    var n = ops.length;
    var colW = (x1 - x0) / n;
    var boxW = Math.max(16, Math.min(36, colW * 0.72));
    var boxH = Math.max(16, Math.min(28, boxW * 0.8));

    for (var i = 0; i < n; i++) {
      var cx = x0 + (i + 0.5) * colW;
      var op = ops[i];

      if (colW >= 44) {
        ctx.save();
        ctx.fillStyle = pal.dim;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('шаг ' + (i + 1), cx, padT - 8);
        ctx.restore();
      }

      if (op.kind === '1') {
        drawGate(ctx, op.name, cx, op.target === 0 ? y0 : y1, boxW, boxH, pal);
      } else {
        drawCnot(ctx, cx, y0, y1, pal);
      }
    }
  }

  function drawProbs(probs) {
    var c = QC.dom.canvas('probs');
    if (!c) { return; }
    QC.draw.bars(c.ctx, c.width, c.height, probs, LABELS, { color: QC.draw.colors.state });
  }

  function drawHist() {
    var c = QC.dom.canvas('hist');
    if (!c) { return; }
    var total = 0;
    for (var i = 0; i < counts.length; i++) { total += counts[i]; }
    var freq = [];
    for (var j = 0; j < counts.length; j++) {
      freq.push(total ? counts[j] / total : 0);
    }
    QC.draw.bars(c.ctx, c.width, c.height, freq, LABELS, { color: QC.draw.colors.y });
  }

  /* ------------------------------------------------------------------ */
  /* Текстовый вывод                                                    */
  /* ------------------------------------------------------------------ */

  function updateStateText(v, probs) {
    var lines = [];
    lines.push('Цепь: ' + chainText());
    lines.push('Состояние: ' + QC.sv.fmtState(v, NQ, 4));
    var parts = [];
    for (var i = 0; i < probs.length; i++) {
      parts.push(LABELS[i] + ' ' + (probs[i] * 100).toFixed(1) + '%');
    }
    lines.push('Вероятности: ' + parts.join('   '));
    QC.dom.html('state', escapeHtml(lines.join('\n')));
  }

  function updateShotsText() {
    if (!measured) {
      QC.dom.text('shots', 'Измерений ещё не было: нажмите «Измерить 200 раз».');
      return;
    }
    var parts = [];
    for (var i = 0; i < counts.length; i++) {
      parts.push(LABELS[i] + ' — ' + counts[i]);
    }
    QC.dom.text('shots', 'Результаты ' + SHOTS + ' измерений: ' + parts.join(', ') + '.');
  }

  /* ------------------------------------------------------------------ */
  /* Отрисовка целиком                                                  */
  /* ------------------------------------------------------------------ */

  function render() {
    var v = computeState();
    var probs = QC.sv.probs(v);
    drawCircuit();
    drawProbs(probs);
    drawHist();
    updateStateText(v, probs);
    updateShotsText();
  }

  /* ------------------------------------------------------------------ */
  /* Инициализация                                                      */
  /* ------------------------------------------------------------------ */

  function bindButtons() {
    for (var i = 0; i < SINGLE_GATES.length; i++) {
      (function (name) {
        QC.dom.button('gate-' + name, name, function () { addGate(name); },
          'Добавить гейт ' + name + ' на выбранный кубит');
      })(SINGLE_GATES[i]);
    }
    QC.dom.button('gate-cnot', 'CNOT', addCnot, 'Добавить CNOT: управление q0, цель q1');
    QC.dom.button('target-q0', 'q0', function () { setTarget(0); }, 'Выбрать кубит 0 целью гейта');
    QC.dom.button('target-q1', 'q1', function () { setTarget(1); }, 'Выбрать кубит 1 целью гейта');
    QC.dom.button('undo', 'Удалить последний', undo, 'Убрать последний гейт из цепочки');
    QC.dom.button('random', 'Случайная схема', randomCircuit, 'Собрать случайную схему из нескольких гейтов');
    QC.dom.button('measure', 'Измерить ' + SHOTS + ' раз', measure, 'Выполнить ' + SHOTS + ' измерений схемы');
    QC.dom.button('reset', 'Сброс', reset, 'Очистить схему и счётчики измерений');
  }

  function init() {
    if (!QC.dom.el('circuit') || !QC.dom.el('state')) { return; }
    bindButtons();
    setTarget(0);
    render();
    window.addEventListener('resize', render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
