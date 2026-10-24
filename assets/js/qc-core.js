/*
 * QC core — общая библиотека для интерактивных виджетов курса.
 *
 * Содержит: комплексную арифметику, гейты, операции над вектором состояния,
 * преобразование Блоха и помощники для отрисовки на canvas.
 *
 * Библиотека не использует внешних зависимостей и модулей, поэтому работает
 * и при открытии html-файла напрямую (file://), и внутри iframe на сайте.
 *
 * Соглашение о кубитах (см. CONVENTIONS.md в корне репозитория).
 * Одно-единственное, как в Qiskit:
 *   - кет записывается как |q_{n-1} ... q_1 q_0>, q0 — самый правый,
 *     младший (least significant) бит;
 *   - индекс вектора состояния idx = sum_q b_q * 2^q, то есть при n = 2
 *     порядок амплитуд |q1 q0> = |00>, |01>, |10>, |11>;
 *   - гейт на кубите `q` меняет бит с весом 2^q (см. sv.apply1);
 *   - классическая строка counts содержит биты в том же порядке q_{n-1}...q0,
 *     поэтому counts['01'] означает q1 = 0, q0 = 1.
 *
 * Двухкубитные матрицы MAT4.* записаны в базисе |qHi qLo>, где qHi — кубит
 * со старшим весом в паре, qLo — с младшим; при n = 2 это ровно |q1 q0>,
 * поэтому матрица читается так же, как Qiskit печатает Operator(...).data.
 * Направление CNOT задаётся выбором матрицы, а не порядком аргументов:
 *   cx(0, 1) -> apply2(v, MAT4.CNOT,   1, 0, 2)
 *   cx(1, 0) -> apply2(v, MAT4.CNOT_T, 1, 0, 2)
 * Подробности — в комментарии к MAT4 ниже и в tools/js/qc-core.test.js.
 */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Комплексные числа: представляются объектами {re, im}.              */
  /* ------------------------------------------------------------------ */

  function C(re, im) {
    return { re: re || 0, im: im || 0 };
  }

  function cadd(a, b) { return C(a.re + b.re, a.im + b.im); }
  function csub(a, b) { return C(a.re - b.re, a.im - b.im); }
  function cmul(a, b) { return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
  function cconj(a) { return C(a.re, -a.im); }
  function cscale(a, k) { return C(a.re * k, a.im * k); }

  function cdiv(a, b) {
    var d = b.re * b.re + b.im * b.im;
    if (d === 0) { return C(0, 0); }
    return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
  }

  function cabs(a) { return Math.sqrt(a.re * a.re + a.im * a.im); }

  function cphase(a) { return Math.atan2(a.im, a.re); }

  function cfromPolar(r, theta) { return C(r * Math.cos(theta), r * Math.sin(theta)); }

  /* Печать комплексного числа в читаемом виде. */
  function cfmt(a, digits) {
    var d = (digits === undefined) ? 4 : digits;
    var re = a.re.toFixed(d);
    var im = a.im.toFixed(d);
    if (im.charAt(0) !== '-') { im = '+ ' + im; } else { im = '- ' + im.slice(1); }
    return re + ' ' + im + 'i';
  }

  /* ------------------------------------------------------------------ */
  /* Гейты: матрицы 2x2, элементы — комплексные числа.                 */
  /* ------------------------------------------------------------------ */

  var SQRT1_2 = Math.SQRT1_2 || Math.sqrt(0.5);

  var GATES = {
    I: [[C(1, 0), C(0, 0)], [C(0, 0), C(1, 0)]],
    X: [[C(0, 0), C(1, 0)], [C(1, 0), C(0, 0)]],
    Y: [[C(0, 0), C(0, -1)], [C(0, 1), C(0, 0)]],
    Z: [[C(1, 0), C(0, 0)], [C(0, 0), C(-1, 0)]],
    H: [[C(SQRT1_2, 0), C(SQRT1_2, 0)], [C(SQRT1_2, 0), C(-SQRT1_2, 0)]],
    S: [[C(1, 0), C(0, 0)], [C(0, 0), C(0, 1)]],
    T: [[C(1, 0), C(0, 0)], [C(0, 0), C(SQRT1_2, SQRT1_2)]],
    /* Полные повороты Раби на угол t (в радианах). */
    rx: function (t) {
      var c = Math.cos(t / 2), s = Math.sin(t / 2);
      return [[C(c, 0), C(0, -s)], [C(0, -s), C(c, 0)]];
    },
    ry: function (t) {
      var c = Math.cos(t / 2), s = Math.sin(t / 2);
      return [[C(c, 0), C(-s, 0)], [C(s, 0), C(c, 0)]];
    },
    rz: function (t) {
      var c = Math.cos(t / 2), s = Math.sin(t / 2);
      return [[C(c, -s), C(0, 0)], [C(0, 0), C(c, s)]];
    }
  };

  /*
   * Двухкубитные матрицы 4x4.
   *
   * Матрицы записаны в базисе |qHi qLo>, где qHi — кубит со старшим весом
   * в паре, qLo — с младшим. При n = 2 это ровно |q1 q0>, поэтому матрица
   * читается так же, как Qiskit печатает Operator(...).data:
   * строки/столбцы в порядке |00>, |01>, |10>, |11>, index = 2*q1 + q0.
   *
   * Два факта, которые важно не перепутать:
   *
   *   1. Позиции в кете — это позиции в паре, а не порядок контроля/цели.
   *      Для Qiskit-схемы cx(0, 1) контроль — q0 (младший), цель — q1
   *      (старший), но матрица всё равно читается в порядке |q1 q0>.
   *      Поэтому в коде: apply2(v, MAT4.CNOT, 1, 0, 2) для cx(0, 1) и
   *      apply2(v, MAT4.CNOT_T, 1, 0, 2) для cx(1, 0).
   *
   *   2. «Абстрактный» CNOT_{A->B} для упорядоченной пары подсистем
   *      (A, B), где A — старший фактор, записывается как CNOT(A -> B)
    *      с |B> в младшем разряде: |a b> -> |a, b XOR a>.
    *      Матрица в базисе |A B>:
    *        [[1,0,0,0], [0,1,0,0], [0,0,0,1], [0,0,1,0]]
    *      При A=q1, B=q0 это CX(1, 0), то есть MAT4.CNOT_T.
    *      CNOT_T здесь означает противоположное направление, НЕ транспонирование:
    *      обе CNOT-матрицы симметричны, но связаны сопряжением через SWAP.
   * См. CONVENTIONS.md и tools/js/qc-core.test.js.
   */
  var MAT4 = {};

  /* Вспомогательная сборка 4x4 по списку переходов [вход, выход]. */
  function mat4FromPermutation(pairs) {
    var m = [];
    for (var i = 0; i < 4; i++) { m.push([C(0, 0), C(0, 0), C(0, 0), C(0, 0)]); }
    for (var k = 0; k < pairs.length; k++) { m[pairs[k][1]][pairs[k][0]] = C(1, 0); }
    return m;
  }

  /*
   * CX(0, 1) в базисе |q1 q0>: контроль q0 (младший бит), цель q1 (старший).
   * Строки/столбцы в порядке |00>, |01>, |10>, |11> (index = 2*q1 + q0):
   *   |00> -> |00>,  |01> (q0=1) -> |11>,  |10> -> |10>,  |11> -> |01>.
   * Это ровно Operator(CX(0, 1)) из Qiskit, проверено в qc-core.test.js.
   */
  MAT4.CNOT = mat4FromPermutation([[0, 0], [1, 3], [2, 2], [3, 1]]);

  /*
   * CX(1, 0) в том же базисе |q1 q0>: контроль q1 (старший), цель q0.
   *   |00> -> |00>,  |01> -> |01>,  |10> (q1=1) -> |11>,  |11> -> |10>
   * То же, что «абстрактный» CNOT_{A->B} в базисе |A B> с A = q1, B = q0.
   */
  MAT4.CNOT_T = mat4FromPermutation([[0, 0], [1, 1], [2, 3], [3, 2]]);

  /* SWAP: перестановка кубитов. */
  (function () {
    var m = [];
    for (var i = 0; i < 4; i++) { m.push([C(0, 0), C(0, 0), C(0, 0), C(0, 0)]); }
    m[0][0] = C(1, 0);
    m[1][2] = C(1, 0);
    m[2][1] = C(1, 0);
    m[3][3] = C(1, 0);
    MAT4.SWAP = m;
  })();

  /* ------------------------------------------------------------------ */
  /* Вектор состояния.                                                 */
  /* ------------------------------------------------------------------ */

  var sv = {
    zeros: function (n) {
      var v = [];
      for (var i = 0; i < n; i++) { v.push(C(0, 0)); }
      return v;
    },

    /* Базисный вектор |idx> в n-кубитном пространстве (размерность 2^n).
       idx = sum_q b_q * 2^q: младший бит — q0. */
    basis: function (n, idx) {
      var v = sv.zeros(1 << n);
      v[idx] = C(1, 0);
      return v;
    },

    kron: function (a, b) {
      var out = [];
      for (var i = 0; i < a.length; i++) {
        for (var j = 0; j < b.length; j++) {
          out.push(cmul(a[i], b[j]));
        }
      }
      return out;
    },

    norm: function (v) {
      var s = 0;
      for (var i = 0; i < v.length; i++) { s += cabs(v[i]) * cabs(v[i]); }
      return Math.sqrt(s);
    },

    probs: function (v) {
      var p = [];
      for (var i = 0; i < v.length; i++) { p.push(cabs(v[i]) * cabs(v[i])); }
      return p;
    },

    /* Применение однокубитного гейта к кубиту target (нумерация с 0).
       target = q меняет бит с весом 2^q: это и есть соглашение Qiskit
       (|q_{n-1}...q0>, q0 — младший бит, index = sum b_q * 2^q). */
    apply1: function (v, gate, target, n) {
      var out = sv.zeros(v.length);
      var bit = 1 << target;
      for (var j = 0; j < v.length; j++) {
        var b = (j & bit) ? 1 : 0;
        var i0 = j & ~bit;              /* тот же базисный индекс, бит сброшен */
        var i1 = j | bit;               /* тот же индекс, бит установлен */
        out[j] = cadd(cmul(gate[b][0], v[i0]), cmul(gate[b][1], v[i1]));
      }
      return out;
    },

    /* Применение двухкубитной матрицы 4x4 к паре кубитов (qHi, qLo),
       где qHi — кубит со старшим весом в паре, qLo — с младшим.
       Матрица записана в базисе |qHi qLo>: индекс r = 2*b_hi + b_lo,
       то есть она читается ровно так, как печатает Qiskit (|q1 q0>), если
       qHi = 1, qLo = 0.

       Направление CNOT задаётся не этой функцией, а выбором матрицы:
         - cx(0, 1) (контроль q0, цель q1) -> MAT4.CNOT  при (1, 0);
         - cx(1, 0) (контроль q1, цель q0) -> MAT4.CNOT_T при (1, 0).
       В обоих случаях аргументы — (qHi, qLo) = (1, 0) для двух кубитов,
       потому что матрица всегда читается в порядке |q1 q0>. Это ровно
       поведение Operator(...).data в Qiskit. */
    apply2: function (v, mat, qHi, qLo, n) {
      var out = sv.zeros(v.length);
      var bHi = 1 << qHi;
      var bLo = 1 << qLo;
      for (var j = 0; j < v.length; j++) {
        var jHi = (j & bHi) ? 1 : 0;
        var jLo = (j & bLo) ? 1 : 0;
        var base = j & ~(bHi | bLo);
        var row = (jHi << 1) | jLo;
        var acc = C(0, 0);
        for (var r = 0; r < 4; r++) {
          var rHi = (r >> 1) & 1;
          var rLo = r & 1;
          var i = base | (rHi ? bHi : 0) | (rLo ? bLo : 0);
          acc = cadd(acc, cmul(mat[row][r], v[i]));
        }
        out[j] = acc;
      }
      return out;
    },

    /* Универсальное применение операции:
       {kind:'1', gate, target} или
       {kind:'2', mat, qA, qB} — qA/qB читаются как (старший, младший) фактор
       пары, то есть в порядке базиса матрицы. Для обратной совместимости
       принимаются и имена q1/q2. qCtrl/qTgt сюда не входят: они нужны только
       для подписи схемы. */
    applyOp: function (v, op, n) {
      if (op.kind === '2') {
        var a = (op.qA !== undefined) ? op.qA : op.q1;
        var b = (op.qB !== undefined) ? op.qB : op.q2;
        return sv.apply2(v, op.mat, a, b, n);
      }
      return sv.apply1(v, op.gate, op.target, n);
    },

    /* Выборка результата измерения по распределению |амплитуда|^2. */
    sample: function (v, rnd) {
      var p = sv.probs(v);
      var r = (rnd || Math.random)();
      var acc = 0;
      for (var i = 0; i < p.length; i++) {
        acc += p[i];
        if (r < acc) { return i; }
      }
      return p.length - 1;
    },

    /* Кет в двоичной записи: 5 -> |101⟩. */
    ket: function (i, n) {
      var s = i.toString(2);
      while (s.length < n) { s = '0' + s; }
      return '|' + s + '⟩';
    },

    /* Текстовое представление состояния с ненулевыми амплитудами. */
    fmtState: function (v, n, digits) {
      var d = (digits === undefined) ? 3 : digits;
      var parts = [];
      for (var i = 0; i < v.length; i++) {
        if (cabs(v[i]) > 1e-6) {
          parts.push(cfmt(v[i], d) + ' ' + sv.ket(i, n));
        }
      }
      return parts.length ? parts.join('  +  ') : 'нулевое состояние';
    }
  };

  /* ------------------------------------------------------------------ */
  /* Сфера Блоха.                                                      */
  /* ------------------------------------------------------------------ */

  var bloch = {
    /* Из амплитуд (a0, a1) в декартовы координаты сферы. */
    fromVector: function (v2) {
      var a0 = v2[0], a1 = v2[1];
      var r = 2 * (a0.re * a1.re + a0.im * a1.im);
      var i = 2 * (a0.re * a1.im - a0.im * a1.re);
      var z = cabs(a0) * cabs(a0) - cabs(a1) * cabs(a1);
      return { x: r, y: i, z: z };
    },

    /* Из декартовых координат в амплитуды. */
    toVector: function (b) {
      var theta = Math.acos(Math.max(-1, Math.min(1, b.z)));
      var phi = Math.atan2(b.y, b.x);
      return [C(Math.cos(theta / 2), 0), cfromPolar(Math.sin(theta / 2), phi)];
    },

    /* Угол и фаза для текстовой подписи. */
    angles: function (b) {
      var theta = Math.acos(Math.max(-1, Math.min(1, b.z)));
      var phi = Math.atan2(b.y, b.x);
      return { theta: theta, phi: phi };
    }
  };

  /* ------------------------------------------------------------------ */
  /* Отрисовка.                                                        */
  /* ------------------------------------------------------------------ */

  var COLORS = {
    x: '#e05252',
    y: '#3fa96a',
    z: '#3b7dd8',
    state: '#7c4dff',
    grid: 'rgba(128,128,128,0.35)',
    text: '#333'
  };

  function project(p, rot, cx, cy, r) {
    var x = p[0], y = p[1], z = p[2];
    var cosA = Math.cos(rot[0]), sinA = Math.sin(rot[0]);
    var y1 = y * cosA - z * sinA, z1 = y * sinA + z * cosA;
    var cosB = Math.cos(rot[1]), sinB = Math.sin(rot[1]);
    var x2 = x * cosB - y1 * sinB, y2 = x * sinB + y1 * cosB;
    return { x: cx + r * x2, y: cy - r * y2, depth: z1 };
  }

  var draw = {
    colors: COLORS,

    /* Сфера Блоха с осями, экватором и вектором состояния. */
    sphere: function (ctx, w, h, b, opts) {
      opts = opts || {};
      var cx = w / 2, cy = h / 2;
      var r = Math.min(w, h) / 2 - (opts.padding || 28);
      var rot = opts.rotation || [-0.45, 0.7];

      ctx.clearRect(0, 0, w, h);

      /* Полусфера: рисуем эллипсы-меридианы с разной прозрачностью. */
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.fillStyle = opts.fill || 'rgba(120,120,200,0.08)';
      ctx.fill();
      ctx.strokeStyle = opts.stroke || 'rgba(120,120,120,0.6)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      /* Экватор (плоскость XY) и меридианы (YZ). */
      var equator = [];
      for (var a = 0; a <= 64; a++) {
        var t = a / 64 * 2 * Math.PI;
        equator.push(project([Math.cos(t), Math.sin(t), 0], rot, cx, cy, r));
      }
      draw.polyline(ctx, equator, opts.grid || COLORS.grid, 1);

      var meridian = [];
      for (var b2 = 0; b2 <= 64; b2++) {
        var t2 = b2 / 64 * 2 * Math.PI;
        meridian.push(project([0, Math.cos(t2), Math.sin(t2)], rot, cx, cy, r));
      }
      draw.polyline(ctx, meridian, opts.grid || COLORS.grid, 1);

      /* Оси. */
      draw.axis(ctx, project([-1.2, 0, 0], rot, cx, cy, r), project([1.2, 0, 0], rot, cx, cy, r), COLORS.x, 'X');
      draw.axis(ctx, project([0, -1.2, 0], rot, cx, cy, r), project([0, 1.2, 0], rot, cx, cy, r), COLORS.y, 'Y');
      draw.axis(ctx, project([0, 0, -1.2], rot, cx, cy, r), project([0, 0, 1.2], rot, cx, cy, r), COLORS.z, 'Z');

      /* Вектор состояния. */
      var tip = project([b.x, b.y, b.z], rot, cx, cy, r);
      var origin = project([0, 0, 0], rot, cx, cy, r);
      ctx.save();
      ctx.strokeStyle = COLORS.state;
      ctx.fillStyle = COLORS.state;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();

      /* Подпись состояния. */
      if (opts.label) {
        ctx.save();
        ctx.fillStyle = COLORS.text;
        ctx.font = (opts.font || '14px') + ' sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(opts.label, cx, h - 8);
        ctx.restore();
      }
    },

    polyline: function (ctx, pts, color, width) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width || 1;
      ctx.beginPath();
      for (var i = 0; i < pts.length; i++) {
        if (i === 0) { ctx.moveTo(pts[i].x, pts[i].y); } else { ctx.lineTo(pts[i].x, pts[i].y); }
      }
      ctx.stroke();
      ctx.restore();
    },

    axis: function (ctx, p1, p2, color, label) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, p2.x, p2.y);
      ctx.restore();
    },

    /* Столбиковая диаграмма распределения вероятностей. */
    bars: function (ctx, w, h, probs, labels, opts) {
      opts = opts || {};
      ctx.clearRect(0, 0, w, h);
      var padL = opts.padLeft || 44, padB = opts.padBottom || 26, padT = 12;
      var cw = (w - padL - 8) / probs.length;
      var maxV = 1;
      ctx.save();
      ctx.strokeStyle = 'rgba(128,128,128,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, padT);
      ctx.lineTo(padL, h - padB);
      ctx.stroke();
      for (var i = 0; i < probs.length; i++) {
        var bh = (h - padB - padT) * (probs[i] / maxV);
        var x = padL + i * cw + cw * 0.15;
        var y = h - padB - bh;
        ctx.fillStyle = opts.color || COLORS.state;
        ctx.fillRect(x, y, cw * 0.7, bh);
        ctx.fillStyle = COLORS.text;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((probs[i] * 100).toFixed(1) + '%', x + cw * 0.35, y - 3);
        if (labels && labels[i]) {
          ctx.fillText(labels[i], x + cw * 0.35, h - padB + 14);
        }
      }
      ctx.restore();
    },

    /* Комплексные амплитуды: действительная часть вверх, мнимая вниз. */
    amplitudes: function (ctx, w, h, v, labels, opts) {
      opts = opts || {};
      ctx.clearRect(0, 0, w, h);
      var mid = h / 2;
      var padL = opts.padLeft || 44;
      var cw = (w - padL - 8) / v.length;
      ctx.save();
      ctx.strokeStyle = 'rgba(128,128,128,0.6)';
      ctx.beginPath();
      ctx.moveTo(padL, mid);
      ctx.lineTo(w - 6, mid);
      ctx.stroke();
      for (var i = 0; i < v.length; i++) {
        var x = padL + i * cw + cw * 0.2;
        var bw = cw * 0.6;
        var reH = v[i].re * (h / 2 - 16) * 0.9;
        var imH = v[i].im * (h / 2 - 16) * 0.9;
        ctx.fillStyle = '#3b7dd8';
        ctx.fillRect(x, mid - reH, bw, Math.abs(reH));
        ctx.fillStyle = '#e08b52';
        ctx.fillRect(x, mid, bw, Math.abs(imH));
        ctx.fillStyle = COLORS.text;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        if (labels && labels[i]) { ctx.fillText(labels[i], x + bw / 2, h - 8); }
      }
      ctx.fillStyle = '#3b7dd8';
      ctx.textAlign = 'left';
      ctx.fillText('Re', 6, 16);
      ctx.fillStyle = '#e08b52';
      ctx.fillText('Im', 6, mid + 14);
      ctx.restore();
    }
  };

  /* ------------------------------------------------------------------ */
  /* Вспомогательные функции для DOM.                                   */
  /* ------------------------------------------------------------------ */

  var dom = {
    el: function (id) { return document.getElementById(id); },

    /* Навешивает обработчик на элемент по id. */
    on: function (id, event, fn) {
      var e = dom.el(id);
      if (e) { e.addEventListener(event, fn); }
      return e;
    },

    /* Кнопка-«чип» с обработчиком. */
    button: function (id, label, fn, title) {
      var e = dom.el(id);
      if (!e) { return null; }
      e.textContent = label;
      e.addEventListener('click', fn);
      if (title) { e.setAttribute('title', title); }
      return e;
    },

    /* Подготовка canvas под devicePixelRatio. Возвращает контекст и размеры. */
    canvas: function (id) {
      var cv = dom.el(id);
      if (!cv) { return null; }
      var dpr = global.devicePixelRatio || 1;
      var rect = cv.getBoundingClientRect();
      var w = Math.max(240, Math.floor(rect.width || cv.clientWidth || 400));
      var h = Math.max(180, Math.floor(rect.height || cv.clientHeight || 300));
      cv.width = Math.floor(w * dpr);
      cv.height = Math.floor(h * dpr);
      cv.style.height = h + 'px';
      var ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx: ctx, width: w, height: h, canvas: cv };
    },

    /* Текст с форматированием: элемент id -> innerHTML. */
    html: function (id, text) {
      var e = dom.el(id);
      if (e) { e.innerHTML = text; }
    },

    text: function (id, text) {
      var e = dom.el(id);
      if (e) { e.textContent = text; }
    }
  };

  global.QC = {
    C: C, cadd: cadd, csub: csub, cmul: cmul, cdiv: cdiv, cconj: cconj,
    cscale: cscale, cabs: cabs, cphase: cphase, cfromPolar: cfromPolar, cfmt: cfmt,
    GATES: GATES, MAT4: MAT4,
    sv: sv, bloch: bloch, draw: draw, dom: dom,
    version: '1.0.0'
  };
})(window);
