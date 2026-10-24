/*
 * Виджет «Интерференция и Гровер: рост амплитуды».
 *
 * Постановка: N = 4 элемента (два кубита), помечен ровно один элемент.
 * Начальное состояние — равномерная суперпозиция: амплитуда 0.5 у каждого
 * из четырёх элементов, то есть вероятность 25% на каждый элемент.
 *
 * Оракул меняет знак амплитуды помеченного элемента на минус.
 * Диффузор (инверсия относительно среднего) отражает все амплитуды:
 *   a'_i = 2 * mean - a_i,   mean = (сумма амплитуд) / N.
 *
 * Поэтому помеченная амплитуда растёт, а вероятность (квадрат амплитуды)
 * растёт ещё быстрее: после одной итерации P(помеченного) = 100%.
 * Ещё одна итерация «перекручивает» амплитуду, и вероятность снова падает
 * до 25% — лишние итерации ухудшают результат.
 *
 * Работает офлайн (в том числе по file://) без внешних зависимостей:
 * вся математика и отрисовка — общей библиотекой assets/js/qc-core.js.
 */
(function (global) {
  'use strict';

  var QC = global.QC;
  if (!QC) { return; }

  var DIM = 4;            /* N = 4 элемента */
  var LABELS = ['|00>', '|01>', '|10>', '|11>'];
  var START_AMP = 0.5;    /* sqrt(0.25) — амплитуда равномерной суперпозиции */
  var START_P = 0.25;     /* стартовая вероятность на каждый элемент */
  var OPT_K = 1;          /* оптимальное число итераций при N = 4 */
  var STEP_MS = 700;      /* длительность одного шага в режиме «Авто» */
  var MAX_AUTO = 12;      /* ограничение длительности авто-анимации */

  var state = uniformState();
  var marked = 0;         /* индекс помеченного элемента (0..3) */
  var iter = 0;           /* число выполненных полных итераций */
  var history = [START_P];/* P(помеченного) после k полных итераций, history[k] */
  var message = '';       /* короткая ремарка о последнем действии */
  var autoTimer = 0;
  var rafId = 0;

  /* ------------------------------------------------------------------ */
  /* Состояние и операции                                                */
  /* ------------------------------------------------------------------ */

  /* Равномерная суперпозиция по четырём элементам. */
  function uniformState() {
    var v = QC.sv.zeros(DIM);
    for (var i = 0; i < DIM; i++) { v[i] = QC.C(START_AMP, 0); }
    return v;
  }

  /* Оракул: меняет знак амплитуды помеченного элемента на противоположный. */
  function applyOracle() {
    state[marked] = QC.cscale(state[marked], -1);
  }

  /* Диффузор: инверсия относительно среднего значения амплитуд.
   * Амплитуды в этом виджете всегда вещественные, поэтому достаточно
   * действительных частей: a'_i = 2*mean - a_i, mean = (сумма a_i)/N. */
  function applyDiffuser() {
    var sum = 0, i;
    for (i = 0; i < DIM; i++) { sum += state[i].re; }
    var mean = sum / DIM;
    for (i = 0; i < DIM; i++) {
      state[i] = QC.C(2 * mean - state[i].re, 0);
    }
  }

  /* Полная итерация Гровера: оракул + диффузор. */
  function doStep() {
    applyOracle();
    applyDiffuser();
    iter += 1;
    history.push(probMarked());
  }

  function probMarked() {
    return QC.sv.probs(state)[marked];
  }

  function resetAll(text) {
    stopAuto();
    state = uniformState();
    iter = 0;
    history = [START_P];
    message = text;
    render();
  }

  /* ------------------------------------------------------------------ */
  /* Отрисовка: амплитуды                                                */
  /* ------------------------------------------------------------------ */

  function drawAmplitudes() {
    var c = QC.dom.canvas('cv-amp');
    if (!c) { return; }
    var ctx = c.ctx, w = c.width, h = c.height;

    QC.draw.amplitudes(ctx, w, h, state, LABELS, { padLeft: 48 });

    /* Геометрия столбцов повторяет ту, что использует QC.draw.amplitudes. */
    var padL = 48;
    var cw = (w - padL - 8) / DIM;
    var mid = h / 2;
    var maxH = (h / 2 - 16) * 0.9;

    /* Рамка вокруг столбца помеченного элемента. */
    var mx = padL + marked * cw + cw * 0.2;
    var mw = cw * 0.6;
    ctx.save();
    ctx.strokeStyle = QC.draw.colors.state;
    ctx.lineWidth = 2;
    ctx.strokeRect(mx - 5, mid - maxH - 9, mw + 10, 2 * maxH + 18);
    ctx.restore();

    /* Числовые значения амплитуд: знак виден по тому, с какой стороны
     * от нулевой линии стоит полоска (вверх — плюс, вниз — минус). */
    ctx.save();
    ctx.font = '10px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (var i = 0; i < DIM; i++) {
      var re = state[i].re;
      if (Math.abs(re) < 0.005) { re = 0; }
      var x = padL + i * cw + cw * 0.2;
      var bw = cw * 0.6;
      var reH = re * maxH;
      if (re >= 0 || Math.abs(re) < 0.12) {
        ctx.fillStyle = QC.draw.colors.text;
        ctx.fillText(re.toFixed(2), x + bw / 2, mid - reH - 5);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillText(re.toFixed(2), x + bw / 2, mid - reH - 6);
      }
    }
    ctx.restore();

    /* Подпись помеченного элемента — фиолетовым полужирным. */
    ctx.save();
    ctx.fillStyle = QC.draw.colors.state;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(LABELS[marked], mx + mw / 2, h - 8);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /* Отрисовка: график вероятности по итерациям                           */
  /* ------------------------------------------------------------------ */

  function drawGraph() {
    var c = QC.dom.canvas('cv-graph');
    if (!c) { return; }
    var ctx = c.ctx, w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    var padL = 58, padR = 22, padT = 26, padB = 48;
    var x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    var kMax = Math.max(3, history.length - 1);

    function px(k) { return x0 + (x1 - x0) * (k / kMax); }
    function py(p) { return y1 - (y1 - y0) * p; }

    /* Горизонтальная сетка: уровни вероятности. */
    var levels = [0, 0.25, 0.5, 0.75, 1];
    ctx.save();
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var i = 0; i < levels.length; i++) {
      var y = py(levels[i]);
      QC.draw.polyline(ctx, [{ x: x0, y: y }, { x: x1, y: y }], QC.draw.colors.grid, 1);
      ctx.fillStyle = QC.draw.colors.text;
      ctx.fillText(Math.round(levels[i] * 100) + '%', x0 - 7, y);
    }

    /* Вертикальная сетка: номера итераций. */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (var k = 0; k <= kMax; k++) {
      var xv = px(k);
      QC.draw.polyline(ctx, [{ x: xv, y: y0 }, { x: xv, y: y1 }], QC.draw.colors.grid, 1);
      ctx.fillStyle = QC.draw.colors.text;
      ctx.fillText(String(k), xv, y1 + 6);
    }
    ctx.restore();

    /* Оси. */
    ctx.save();
    ctx.strokeStyle = 'rgba(128,128,128,0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0, y1);
    ctx.moveTo(x0, y1);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();

    /* Пунктир: равномерный уровень 25%. */
    ctx.save();
    ctx.setLineDash([5, 4]);
    QC.draw.polyline(ctx, [{ x: x0, y: py(0.25) }, { x: x1, y: py(0.25) }],
      'rgba(128,128,128,0.85)', 1);
    ctx.setLineDash([]);
    ctx.fillStyle = QC.draw.colors.text;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('равномерно 25%', x1 - 2, py(0.25) - 3);
    ctx.restore();

    /* Кривая: P(помеченного) по итерациям. */
    var pts = [];
    for (var j = 0; j < history.length; j++) {
      pts.push({ x: px(j), y: py(history[j]) });
    }
    if (pts.length > 1) {
      QC.draw.polyline(ctx, pts, QC.draw.colors.state, 2.5);
    }
    for (j = 0; j < pts.length; j++) {
      ctx.save();
      ctx.fillStyle = QC.draw.colors.state;
      ctx.beginPath();
      ctx.arc(pts[j].x, pts[j].y, 3.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }

    /* Отметка оптимума: k = 1 (для N = 4) даёт 100%. */
    if (history.length > OPT_K) {
      var ox = px(OPT_K), oy = py(history[OPT_K]);
      ctx.save();
      ctx.strokeStyle = '#e05252';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ox, oy, 7.5, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#e05252';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('оптимум k = 1', ox, oy - 12);
      ctx.restore();
    }

    /* Подпись текущей точки. */
    if (pts.length) {
      var last = pts[pts.length - 1];
      var lbl = (history[history.length - 1] * 100).toFixed(0) + '%';
      ctx.save();
      ctx.fillStyle = QC.draw.colors.state;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      var lx = Math.min(last.x + 34, x1);
      ctx.fillText('k = ' + (history.length - 1) + ': ' + lbl, lx, last.y);
      ctx.restore();
    }

    /* Названия осей. */
    ctx.save();
    ctx.fillStyle = QC.draw.colors.text;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('итерация', (x0 + x1) / 2, h - 8);
    ctx.translate(14, (y0 + y1) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'middle';
    ctx.fillText('P(помеченного)', 0, 0);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /* Текстовый вывод                                                     */
  /* ------------------------------------------------------------------ */

  function describe() {
    var pm = probMarked();
    var am = state[marked].re;
    if (iter === 0) {
      return 'Старт: равномерная суперпозиция, амплитуда 0.500 у каждого элемента, ' +
        'вероятность по 25%. Оракул сменит знак амплитуды помеченного элемента, ' +
        'а диффузор отразит все амплитуды относительно среднего — и помеченная ' +
        'амплитуда вырастет.';
    }
    if (pm > 0.999) {
      return 'Итерация ' + iter + ': амплитуда помеченного элемента = ' + am.toFixed(3) +
        ', её квадрат даёт P = 100%. Это максимум: амплитуда выросла, а вероятность, ' +
        'будучи её квадратом, выросла ещё сильнее. Дальше итерации только «перекрутят» ' +
        'амплитуду: лишние итерации ухудшают результат (оптимум при N = 4 — k = 1).';
    }
    return 'Итерация ' + iter + ': амплитуда помеченного элемента = ' + am.toFixed(3) +
      ', вероятность упала до ' + (pm * 100).toFixed(2) + '%. Итерации «перекручивают» ' +
      'амплитуду, поэтому лишний шаг ухудшает результат: оптимум для N = 4 — k = 1 (100%).';
  }

  function updateText() {
    var probs = QC.sv.probs(state);
    var pm = probs[marked];
    var lines = [];
    lines.push('Итерация k = ' + iter + '   (полных итераций выполнено: ' + iter + ')');
    lines.push('Помеченный элемент: ' + LABELS[marked]);
    lines.push('P(помеченного) = ' + (pm * 100).toFixed(2) + '%');
    lines.push('');
    lines.push('Вероятности и амплитуды по элементам:');
    for (var i = 0; i < DIM; i++) {
      var tail = (i === marked) ? '   <- помечен' : '';
      lines.push('  ' + LABELS[i] + '   P = ' + (probs[i] * 100).toFixed(2) + '%' +
        '   a = ' + QC.cfmt(state[i], 3) + tail);
    }
    lines.push('  сумма вероятностей = ' + (probs[0] + probs[1] + probs[2] + probs[3]).toFixed(4));
    lines.push('');
    lines.push('Амплитуда — вес элемента, вероятность — квадрат амплитуды. Чем дальше ' +
      'амплитуда уходит от среднего, тем круче растёт вероятность.');
    lines.push(describe());
    if (message) {
      lines.push('');
      lines.push(message);
    }
    QC.dom.text('state-text', lines.join('\n'));
  }

  /* ------------------------------------------------------------------ */
  /* Общий пересчёт                                                      */
  /* ------------------------------------------------------------------ */

  function render() {
    drawAmplitudes();
    drawGraph();
    updateText();
  }

  /* ------------------------------------------------------------------ */
  /* Авто-анимация                                                       */
  /* ------------------------------------------------------------------ */

  function startAuto() {
    if (autoTimer) { return; }
    QC.dom.text('btn-auto', 'Стоп');
    autoTimer = global.setTimeout(autoTick, STEP_MS);
  }

  function stopAuto() {
    if (autoTimer) {
      global.clearTimeout(autoTimer);
      autoTimer = 0;
    }
    QC.dom.text('btn-auto', 'Авто');
  }

  function autoTick() {
    autoTimer = 0;
    if (iter >= MAX_AUTO) {
      stopAuto();
      message = 'Авто-анимация остановлена: цикл повторился, оптимум остаётся на k = 1.';
      render();
      return;
    }
    doStep();
    message = '';
    render();
    autoTimer = global.setTimeout(autoTick, STEP_MS);
  }

  /* ------------------------------------------------------------------ */
  /* Инициализация                                                       */
  /* ------------------------------------------------------------------ */

  function syncMarkedButtons() {
    for (var i = 0; i < DIM; i++) {
      var b = QC.dom.el('btn-mark-' + i);
      if (b) { b.setAttribute('aria-pressed', i === marked ? 'true' : 'false'); }
    }
  }

  function init() {
    if (global.QCWidget) {
      global.QCWidget.onReducedMotion(stopAuto);
    }
    global.addEventListener('pagehide', stopAuto);
    /* Выбор помеченного элемента. */
    for (var i = 0; i < DIM; i++) {
      (function (idx) {
        QC.dom.on('btn-mark-' + idx, 'click', function () {
          if (idx === marked) { return; }
          stopAuto();
          marked = idx;
          state = uniformState();
          iter = 0;
          history = [START_P];
          message = 'Помеченный элемент изменён: состояние возвращено к равномерной ' +
            'суперпозиции, итерации считаются заново.';
          syncMarkedButtons();
          render();
        });
      })(i);
    }

    QC.dom.button('btn-oracle', 'Применить оракул', function () {
      stopAuto();
      applyOracle();
      message = 'Оракул: знак амплитуды помеченного элемента ' + LABELS[marked] +
        ' сменён на минус (видно ниже нулевой линии на графике амплитуд).';
      render();
    }, 'Оракул меняет знак амплитуды помеченного элемента на противоположный.');

    QC.dom.button('btn-diffuser', 'Диффузор', function () {
      stopAuto();
      applyDiffuser();
      message = 'Диффузор: все амплитуды отражены относительно среднего: a\' = 2*mean - a.';
      render();
    }, 'Инверсия относительно среднего: a\' = 2*mean - a, mean = (сумма амплитуд)/4.');

    QC.dom.button('btn-step', 'Шаг', function () {
      stopAuto();
      doStep();
      message = '';
      render();
    }, 'Полная итерация: оракул + диффузор.');

    QC.dom.button('btn-reset', 'Сброс', function () {
      resetAll('Состояние сброшено: снова равномерная суперпозиция, счётчик итераций обнулён.');
    }, 'Вернуть равномерную суперпозицию и обнулить счётчик итераций.');

    QC.dom.button('btn-auto', 'Авто', function () {
      if (global.QCWidget && global.QCWidget.reducedMotion()) {
        stopAuto();
        doStep();
        message = 'Одна итерация выполнена без таймера (уменьшение движения).';
      } else if (autoTimer) {
        stopAuto();
        message = 'Авто-анимация остановлена.';
      } else {
        message = 'Авто-анимация: один полный шаг (оракул + диффузор) каждые 700 мс.';
        startAuto();
      }
      render();
    }, 'Пошаговая анимация: оракул + диффузор каждые 700 мс. Повторное нажатие останавливает.');

    global.addEventListener('resize', function () {
      if (rafId) { return; }
      rafId = global.requestAnimationFrame(function () {
        rafId = 0;
        render();
      });
    });

    syncMarkedButtons();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
