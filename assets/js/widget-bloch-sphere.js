/*
 * Виджет «Сфера Блоха: гейты и фаза».
 *
 * Работает офлайн (file:// и внутри iframe), без внешних зависимостей: вся
 * квантовая математика выполняется общей библиотекой QC (assets/js/qc-core.js).
 *
 * Соглашения (как в библиотеке):
 *   |0⟩ — северный полюс (+Z), |1⟩ — южный полюс;
 *   ось X направлена вправо, ось Y — в глубину рисунка, ось Z — вверх;
 *   |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩, то есть φ = arg(β) − arg(α) —
 *   относительная фаза амплитуд, совпадающая с азимутом вектора Блоха
 *   в плоскости XY.
 */
(function (global) {
  'use strict';

  var QC = global.QC;
  if (!QC) { return; }

  var DEG = 180 / Math.PI;
  var TWO_PI = 2 * Math.PI;
  var ANIM_MS = 2500;       /* полный оборот вокруг оси Y, мс */
  var ROT = [-2.05, 0.12];   /* ракурс сферы: |0⟩ наверху, ось X вправо */
  var PAD = 34;              /* отступ сферы от края canvas */
  var N = 1;                 /* один кубит */

  var state = QC.sv.basis(N, 0);
  var note = 'Начальное состояние: |0⟩, точка на северном полюсе сферы.';
  var anim = { on: false, raf: 0, t0: 0, base: null };
  var resizeRaf = 0;

  /* ------------------------------------------------------------------ */
  /* Описания гейтов                                                     */
  /* ------------------------------------------------------------------ */

  var GATE_INFO = {
    I: 'I — тождественный оператор: состояние не меняется.',
    X: 'X — переворот кубита (поворот на 180° вокруг оси X): |0⟩ → |1⟩.',
    Y: 'Y — переворот с фазой π (поворот на 180° вокруг оси Y): |0⟩ → i|1⟩.',
    Z: 'Z — знаковый переворот (поворот на 180° вокруг оси Z): |1⟩ → −|1⟩.',
    H: 'H — Адамар (поворот на 180° вокруг оси (x+z)/√2): |0⟩ → |+⟩.',
    S: 'S — поворот на 90° вокруг оси Z: к амплитуде |1⟩ добавляется фаза π/2.',
    T: 'T — поворот на 45° вокруг оси Z: к амплитуде |1⟩ добавляется фаза π/4.'
  };

  /* ------------------------------------------------------------------ */
  /* Вспомогательные вычисления                                         */
  /* ------------------------------------------------------------------ */

  /* Относительная фаза φ = arg(β) − arg(α) (азимут вектора Блоха).
   * На полюсах (|α|≈0 или |β|≈0) азимут физически не определён: при |1⟩
   * совершенно иное выражение фазы могло бы изобразить «изменение», хотя
   * глобальная фаза состояния ни на что не влияет (E005). */
  function phaseInfo() {
    var a0 = state[0], a1 = state[1];
    if (QC.cabs(a1) < 1e-9 || QC.cabs(a0) < 1e-9) {
      /* Полюсное состояние |0⟩ или |1⟩: одна амплитуда нулевая,
       * относительной фазы у суперпозиции не существует. */
      return { defined: false, phi: 0 };
    }
    var phi = QC.cphase(a1) - QC.cphase(a0);
    phi = phi % TWO_PI;
    if (phi < 0) { phi += TWO_PI; }
    return { defined: true, phi: phi };
  }

  function blochVector() {
    return QC.bloch.fromVector([state[0], state[1]]);
  }

  /*
   * Поворот Раби вокруг оси X на угол t:
   *   [[cos(t/2), -i·sin(t/2)], [-i·sin(t/2), cos(t/2)]].
   * Матрица совпадает с QC.GATES.rx (она идемпотентна к глобальной фазе) —
   * здесь она выписана явно, чтобы поведение кнопки «RX 90°» не зависело
   * от внутренней реализации библиотеки.
   */
  function rx(t) {
    var c = Math.cos(t / 2), s = Math.sin(t / 2);
    return [[QC.C(c, 0), QC.C(0, -s)], [QC.C(0, -s), QC.C(c, 0)]];
  }

  /* Короткое описание положения точки на сфере. */
  function describePosition(thetaDeg, p0, p1) {
    if (thetaDeg < 0.5) {
      return 'точка на северном полюсе: чистое состояние |0⟩, P(0) = 100%.';
    }
    if (thetaDeg > 179.5) {
      return 'точка на южном полюсе: чистое состояние |1⟩, P(1) = 100%.';
    }
    if (Math.abs(thetaDeg - 90) < 0.5) {
      return 'точка на экваторе: чистая равновзвешенная суперпозиция, равные вероятности ' +
        'в Z-базисе (P(0) = P(1) = 50%). Максимум смеси — точка в центре шара, не на поверхности.';
    }
    if (thetaDeg < 90) {
      return 'точка в северном полушарии: |0⟩ вероятнее, чем |1⟩ (P(0) > P(1)).';
    }
    return 'точка в южном полушарии: |1⟩ вероятнее, чем |0⟩ (P(1) > P(0)).';
  }

  /* ------------------------------------------------------------------ */
  /* Отрисовка сферы                                                     */
  /* ------------------------------------------------------------------ */

  /* Проекция точки на экран — та же формула, что использует QC.draw.sphere. */
  function projectPoint(p, cx, cy, r) {
    var cosA = Math.cos(ROT[0]), sinA = Math.sin(ROT[0]);
    var y1 = p[1] * cosA - p[2] * sinA;
    var cosB = Math.cos(ROT[1]), sinB = Math.sin(ROT[1]);
    var x2 = p[0] * cosB - y1 * sinB;
    var y2 = p[0] * sinB + y1 * cosB;
    return { x: cx + r * x2, y: cy - r * y2 };
  }

  /* Подписи полюсов: |0⟩, |1⟩, |+⟩, |−⟩. */
  function drawPoleLabels(c) {
    var ctx = c.ctx;
    var r = Math.min(c.width, c.height) / 2 - PAD;
    var cx = c.width / 2, cy = c.height / 2;

    function put(text, p, dist, side) {
      var q = projectPoint(p, cx, cy, r);
      var dx = q.x - cx, dy = q.y - cy;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1e-6) { len = 1; }
      var px = -dy / len, py = dx / len;   /* перпендикуляр к направлению */
      ctx.fillText(text, q.x + side * px * dist, q.y + side * py * dist);
    }

    ctx.save();
    ctx.fillStyle = QC.draw.colors.text;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    put('|0⟩', [0, 0, 1.10], 16, 1);
    put('|1⟩', [0, 0, -1.10], 16, -1);
    put('|+⟩', [1.02, 0, 0], 15, -1);
    put('|−⟩', [-1.02, 0, 0], 15, -1);
    ctx.restore();
  }

  function drawSphere() {
    var c = QC.dom.canvas('cv-sphere');
    if (!c) { return; }
    var b = blochVector();
    var ang = QC.bloch.angles(b);
    var ph = phaseInfo();
    var phiText = ph.defined ? (ph.phi * DEG).toFixed(1) + '°' : 'не определена';
    QC.draw.sphere(c.ctx, c.width, c.height, b, {
      rotation: ROT,
      padding: PAD,
      label: 'θ = ' + (ang.theta * DEG).toFixed(1) + '°,  φ = ' + phiText
    });
    drawPoleLabels(c);
  }

  /* ------------------------------------------------------------------ */
  /* Отрисовка окружности фаз                                            */
  /* ------------------------------------------------------------------ */

  function drawPhase() {
    var c = QC.dom.canvas('cv-phase');
    if (!c) { return; }
    var ctx = c.ctx;
    var w = c.width, h = c.height;
    var cx = w / 2, cy = h / 2;
    var R = Math.min(w, h) / 2 - 32;
    var ph = phaseInfo();
    var col = QC.draw.colors;

    ctx.clearRect(0, 0, w, h);

    /* Окружность и оси Re/Im. */
    ctx.save();
    ctx.strokeStyle = 'rgba(128,128,128,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TWO_PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - R - 8, cy);
    ctx.lineTo(cx + R + 8, cy);
    ctx.moveTo(cx, cy + R + 8);
    ctx.lineTo(cx, cy - R - 8);
    ctx.stroke();
    ctx.fillStyle = col.text;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Re', cx + R + 10, cy - 8);
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Im', cx + 4, cy - R - 12);
    ctx.restore();

    /* Отметки: 0, π/4 (T), π/2 (S), π, 3π/2. */
    var marks = [
      { a: 0, t: '0' },
      { a: Math.PI / 4, t: 'π/4 (T)' },
      { a: Math.PI / 2, t: 'π/2 (S)' },
      { a: Math.PI, t: 'π' },
      { a: 3 * Math.PI / 2, t: '3π/2' }
    ];
    ctx.save();
    ctx.strokeStyle = 'rgba(128,128,128,0.75)';
    ctx.lineWidth = 1.6;
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      var x0 = cx + R * 0.86 * Math.cos(m.a), y0 = cy - R * 0.86 * Math.sin(m.a);
      var x1 = cx + R * 1.02 * Math.cos(m.a), y1 = cy - R * 1.02 * Math.sin(m.a);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.fillStyle = col.text;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var j = 0; j < marks.length; j++) {
      var mk = marks[j];
      var lx = cx + R * 1.16 * Math.cos(mk.a);
      var ly = cy - R * 1.16 * Math.sin(mk.a);
      if (Math.abs(mk.a) < 1e-9) { ctx.textAlign = 'left'; lx = cx + R * 1.06; }
      else if (Math.abs(mk.a - Math.PI) < 1e-9) { ctx.textAlign = 'right'; lx = cx - R * 1.06; }
      else if (Math.abs(mk.a - Math.PI / 2) < 1e-9) { ctx.textBaseline = 'bottom'; ly = cy - R * 1.10; }
      else if (Math.abs(mk.a - 3 * Math.PI / 2) < 1e-9) { ctx.textBaseline = 'top'; ly = cy + R * 1.12; }
      ctx.fillText(mk.t, lx, ly);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    }
    ctx.restore();

    /* Стрелка текущей фазы. */
    if (ph.defined) {
      var a = ph.phi;
      ctx.save();
      ctx.strokeStyle = col.state;
      ctx.fillStyle = col.state;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx, cy, 0.34 * R, 0, -a, true);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + 0.1 * R * Math.cos(a), cy - 0.1 * R * Math.sin(a));
      ctx.lineTo(cx + 0.95 * R * Math.cos(a), cy - 0.95 * R * Math.sin(a));
      ctx.stroke();
      var hx = cx + 0.95 * R * Math.cos(a);
      var hy = cy - 0.95 * R * Math.sin(a);
      var dx = -Math.sin(a), dy = -Math.cos(a);
      var px = -dy, py = dx;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx - 13 * dx + 5 * px, hy - 13 * dy + 5 * py);
      ctx.lineTo(hx - 13 * dx - 5 * px, hy - 13 * dy - 5 * py);
      ctx.closePath();
      ctx.fill();
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('φ = ' + (a * DEG).toFixed(1) + '°',
                   cx + 0.55 * R * Math.cos(a) - 0.22 * R * Math.sin(a),
                   cy - 0.55 * R * Math.sin(a) - 0.22 * R * Math.cos(a));
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = col.text;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('φ не определена', cx, cy);
      ctx.font = '11px sans-serif';
      ctx.fillText('(состояние на полюсе сферы)', cx, cy + 16);
      ctx.restore();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Текстовый вывод                                                     */
  /* ------------------------------------------------------------------ */

  function updateState() {
    var b = blochVector();
    var ang = QC.bloch.angles(b);
    var probs = QC.sv.probs(state);
    var norm = QC.sv.norm(state);
    var ph = phaseInfo();
    var thetaDeg = ang.theta * DEG;
    var lines = [];

    lines.push('|ψ⟩ = (' + QC.cfmt(state[0], 4) + ')|0⟩ + (' + QC.cfmt(state[1], 4) + ')|1⟩');
    lines.push('θ = ' + thetaDeg.toFixed(1) + '°   φ = ' +
               (ph.defined ? (ph.phi * DEG).toFixed(1) + '°' : 'не определена (состояние на полюсе)'));
    lines.push('P(0) = ' + probs[0].toFixed(3) + '   P(1) = ' + probs[1].toFixed(3) +
               '   сумма = ' + (probs[0] + probs[1]).toFixed(3));
    lines.push('вектор Блоха: x = ' + b.x.toFixed(3) + '   y = ' + b.y.toFixed(3) +
               '   z = ' + b.z.toFixed(3) + '   норма = ' + norm.toFixed(6));
    lines.push('где точка: ' + describePosition(thetaDeg, probs[0], probs[1]));
    lines.push('что сделал гейт: ' + note);
    QC.dom.text('state', lines.join('\n'));
  }

  function render() {
    drawSphere();
    drawPhase();
    updateState();
  }

  /* ------------------------------------------------------------------ */
  /* Действия                                                            */
  /* ------------------------------------------------------------------ */

  function stopAnim() {
    if (anim.raf) {
      global.cancelAnimationFrame(anim.raf);
      anim.raf = 0;
    }
    anim.on = false;
    var b = QC.dom.el('btn-anim');
    if (b) { b.setAttribute('aria-pressed', 'false'); }
  }

  function applyGate(gate, desc) {
    stopAnim();
    var before = phaseInfo();
    state = QC.sv.apply1(state, gate, 0, N);
    var after = phaseInfo();
    var extra = '';
    if (before.defined && after.defined) {
      var d = after.phi - before.phi;
      while (d > Math.PI) { d -= TWO_PI; }
      while (d < -Math.PI) { d += TWO_PI; }
      if (Math.abs(d) > 1e-6) {
        extra = ' Фаза (азимут) изменилась на ' + (d * DEG).toFixed(1) + '°.';
      }
    }
    note = desc + extra;
    render();
  }

  function doReset() {
    stopAnim();
    state = QC.sv.basis(N, 0);
    note = 'Сброс: состояние |0⟩, точка на северном полюсе сферы.';
    render();
  }

  function doRandom() {
    stopAnim();
    var th = Math.random() * Math.PI;
    var ph2 = Math.random() * TWO_PI;
    var b = {
      x: Math.sin(th) * Math.cos(ph2),
      y: Math.sin(th) * Math.sin(ph2),
      z: Math.cos(th)
    };
    state = QC.bloch.toVector(b);
    note = 'Случайное состояние: θ = ' + (th * DEG).toFixed(1) + '°, φ = ' +
           (ph2 * DEG).toFixed(1) + '° (точка выбрана равномерно по сфере).';
    render();
  }

  function animStep(now) {
    if (!anim.on) { anim.raf = 0; return; }
    var t = now - anim.t0;
    var frac = t / ANIM_MS;
    if (frac > 1) { frac = 1; }
    var ang = frac * TWO_PI;
    state = QC.sv.apply1(anim.base, QC.GATES.ry(ang), 0, N);
    if (frac >= 1) {
      anim.on = false;
      anim.raf = 0;
      var btn = QC.dom.el('btn-anim');
      if (btn) { btn.setAttribute('aria-pressed', 'false'); }
      note = 'Оборот вокруг оси Y завершён: 2π за 2,5 с, состояние вернулось в ту же точку ' +
             '(с точностью до общей фазы).';
      render();
      return;
    }
    render();
    anim.raf = global.requestAnimationFrame(animStep);
  }

  function toggleAnim() {
    if (anim.on) {
      stopAnim();
      note = 'Вращение остановлено.';
      render();
      return;
    }
    if (global.QCWidget && global.QCWidget.reducedMotion()) {
      state = QC.sv.apply1(state, QC.GATES.ry(TWO_PI), 0, N);
      note = 'Полный оборот 2π выполнен одним действием (уменьшение движения).';
      render();
      return;
    }
    anim.base = [state[0], state[1]];
    anim.t0 = (global.performance && global.performance.now) ? global.performance.now() : Date.now();
    anim.on = true;
    var btn = QC.dom.el('btn-anim');
    if (btn) { btn.setAttribute('aria-pressed', 'true'); }
    note = 'Вращение вокруг оси Y: равномерный полный оборот (2π) за 2,5 с. Повторное нажатие ' +
           'останавливает вращение.';
    anim.raf = global.requestAnimationFrame(animStep);
  }

  /* ------------------------------------------------------------------ */
  /* Инициализация                                                       */
  /* ------------------------------------------------------------------ */

  function init() {
    var half = Math.PI / 2;
    if (global.QCWidget) {
      global.QCWidget.onReducedMotion(function () {
        stopAnim();
        note = 'Вращение остановлено: включено уменьшение движения.';
        render();
      });
    }
    global.addEventListener('pagehide', stopAnim);

    QC.dom.button('btn-I', 'I', function () {
      applyGate(QC.GATES.I, GATE_INFO.I);
    }, 'Тождественный оператор: ничего не меняет.');

    QC.dom.button('btn-X', 'X', function () {
      applyGate(QC.GATES.X, GATE_INFO.X);
    }, 'Переворот кубита: |0⟩ → |1⟩, |1⟩ → |0⟩.');

    QC.dom.button('btn-Y', 'Y', function () {
      applyGate(QC.GATES.Y, GATE_INFO.Y);
    }, 'Переворот с фазой π вокруг оси Y: |0⟩ → i|1⟩.');

    QC.dom.button('btn-Z', 'Z', function () {
      applyGate(QC.GATES.Z, GATE_INFO.Z);
    }, 'Знаковый переворот: |1⟩ → −|1⟩, вероятности не меняются.');

    QC.dom.button('btn-H', 'H', function () {
      applyGate(QC.GATES.H, GATE_INFO.H);
    }, 'Адамар: |0⟩ → (|0⟩ + |1⟩)/√2 = |+⟩, точка на экваторе.');

    QC.dom.button('btn-S', 'S', function () {
      applyGate(QC.GATES.S, GATE_INFO.S);
    }, 'Фазовый гейт S: поворот на 90° вокруг оси Z.');

    QC.dom.button('btn-T', 'T', function () {
      applyGate(QC.GATES.T, GATE_INFO.T);
    }, 'Фазовый гейт T: поворот на 45° вокруг оси Z.');

    QC.dom.button('btn-rx90', 'RX 90°', function () {
      applyGate(rx(half), 'RX 90° — поворот на 90° вокруг оси X: точка идёт по дуге в плоскости YZ; если она лежит на самой оси X, точка неподвижна.');
    }, 'Поворот Раби вокруг оси X на 90°.');

    QC.dom.button('btn-ry90', 'RY 90°', function () {
      applyGate(QC.GATES.ry(half), 'RY 90° — поворот на 90° вокруг оси Y: точка идёт по меридиану XZ, |0⟩ → |+⟩, |+⟩ → |1⟩.');
    }, 'Поворот Раби вокруг оси Y на 90°.');

    QC.dom.button('btn-rz90', 'RZ 90°', function () {
      applyGate(QC.GATES.rz(half), 'RZ 90° — поворот на 90° вокруг оси Z: меняется только фаза, вероятности те же.');
    }, 'Поворот Раби вокруг оси Z на 90°.');

    QC.dom.button('btn-rz180', 'RZ 180°', function () {
      applyGate(QC.GATES.rz(Math.PI), 'RZ 180° — поворот на 180° вокруг оси Z: фаза +180°, состояние отличается от исходного знаком амплитуды |1⟩.');
    }, 'Поворот Раби вокруг оси Z на 180° (эквивалентно Z с точностью до общей фазы).');

    QC.dom.button('btn-reset', 'Сброс |0⟩', doReset,
      'Вернуть состояние |0⟩: точка на северном полюсе сферы.');

    QC.dom.button('btn-random', 'Случайное', doRandom,
      'Случайное состояние: равномерная точка на сфере Блоха.');

    QC.dom.button('btn-anim', 'Анимация', toggleAnim,
      'Плавно повернуть состояние вокруг оси Y на 2π за 2,5 с; повторное нажатие останавливает.');

    global.addEventListener('resize', function () {
      if (resizeRaf) { return; }
      resizeRaf = global.requestAnimationFrame(function () {
        resizeRaf = 0;
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
