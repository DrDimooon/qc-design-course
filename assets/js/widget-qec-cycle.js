/*
 * Виджет «Цикл коррекции ошибок: 3-кубитный код».
 *
 * Страница виджета: assets/interactive/qec-cycle.html
 * Работает офлайн (в том числе по file://), внешних зависимостей нет:
 * вся математика выполняется общей библиотекой window.QC (assets/js/qc-core.js).
 *
 * Код: |psi> = alpha|000> + beta|111>.
 * Стабилизаторы: S1 = Z1 Z2, S2 = Z2 Z3.
 *
 * Нумерация кубитов в учебных текстах: кубит 1 — старший бит кета,
 * кубит 2 — средний, кубит 3 — младший. В QC.sv.apply1 нумерация с нуля,
 * поэтому кубит 1 -> target 0, кубит 2 -> target 1, кубит 3 -> target 2.
 *
 * Синдромы считаются как собственные значения операторов-стабилизаторов:
 * для каждого стабилизатора строится матрица 8x8 (столбцы — образы базисных
 * векторов под действием QC.GATES.Z через QC.sv.apply1), затем берётся
 * формула Рэлея lambda = <v|M|v> / <v|v>. Для кодовых состояний это ровно +1
 * или -1, так что собственное значение находится надёжно, а не «на глаз».
 */
(function (global) {
  'use strict';

  var QC = global.QC;
  if (!QC || !QC.sv || !QC.draw || !QC.dom) { return; }

  var N = 3;                        /* число кубитов */
  var DIM = 8;                      /* размерность пространства 2^3 */
  var EPS = 1e-9;                   /* допуск при сравнении векторов */

  /* Таблица соответствий: собственные значения стабилизаторов -> кубит. */
  var SYNDROME_TABLE = [
    { s1: 1, s2: 1, qubit: -1, text: 'ошибок нет' },
    { s1: -1, s2: 1, qubit: 0, text: 'X-ошибка на кубите 1' },
    { s1: -1, s2: -1, qubit: 1, text: 'X-ошибка на кубите 2' },
    { s1: 1, s2: -1, qubit: 2, text: 'X-ошибка на кубите 3' }
  ];

  /* Состояние виджета. */
  var logical = 'zero';             /* 'zero' -> |0>, 'plus' -> |+> */
  var original = null;              /* исходное кодовое состояние */
  var current = null;               /* состояние после ошибок и коррекций */
  var errors = [];                  /* внедрённые X-ошибки (target с нуля) */
  var fixes = [];                   /* применённые коррекции */
  var syndromes = null;             /* {s1, s2, raw1, raw2, drift} после измерения */
  var damaged = -1;                 /* кубит, найденный по синдрому (-1 — нет) */
  var lastFix = null;               /* результат последней коррекции */
  var note = '';

  /* ------------------------------------------------------------------ */
  /* Линейная алгебра: матрицы операторов и собственные значения         */
  /* ------------------------------------------------------------------ */

  /* Матрица однокубитного гейта в базисе из 2^n состояний:
     столбец j — образ базисного вектора |j> под действием гейта. */
  function operatorMatrix(gate, target, n) {
    var dim = 1 << n;
    var m = [];
    for (var col = 0; col < dim; col++) {
      var v = QC.sv.apply1(QC.sv.basis(n, col), gate, target, n);
      for (var row = 0; row < dim; row++) {
        if (!m[row]) { m[row] = []; }
        m[row][col] = QC.C(v[row].re, v[row].im);
      }
    }
    return m;
  }

  /* Произведение двух матриц (используется для S1 = Z1 Z2 и S2 = Z2 Z3). */
  function matMul(a, b) {
    var out = [];
    for (var i = 0; i < a.length; i++) {
      var row = [];
      for (var j = 0; j < b[0].length; j++) {
        var acc = QC.C(0, 0);
        for (var p = 0; p < b.length; p++) {
          acc = QC.cadd(acc, QC.cmul(a[i][p], b[p][j]));
        }
        row.push(acc);
      }
      out.push(row);
    }
    return out;
  }

  /* Умножение матрицы на вектор. */
  function matVec(m, v) {
    var out = QC.sv.zeros(v.length);
    for (var i = 0; i < m.length; i++) {
      var acc = QC.C(0, 0);
      for (var j = 0; j < v.length; j++) {
        acc = QC.cadd(acc, QC.cmul(m[i][j], v[j]));
      }
      out[i] = acc;
    }
    return out;
  }

  /* Собственное значение эрмитовой матрицы для состояния v (формула Рэлея):
     lambda = <v|M|v> / <v|v>. Для собственного состояния это ровно +-1. */
  function eigenvalue(m, v) {
    var mv = matVec(m, v);
    var num = QC.C(0, 0);
    var den = 0;
    for (var i = 0; i < v.length; i++) {
      num = QC.cadd(num, QC.cmul(QC.cconj(v[i]), mv[i]));
      den += QC.cabs(v[i]) * QC.cabs(v[i]);
    }
    if (den < 1e-15) { return 0; }
    return num.re / den;
  }

  /* Проекция на собственное подпространство оператора с собственным значением lam:
     P = (1 + lam*M)/2 — это и есть результат измерения стабилизатора. */
  function projectOnEigen(m, v, lam) {
    var mv = matVec(m, v);
    var out = QC.sv.zeros(v.length);
    for (var i = 0; i < v.length; i++) {
      out[i] = QC.cscale(QC.cadd(v[i], QC.cscale(mv[i], lam)), 0.5);
    }
    return out;
  }

  /* Построение матриц стабилизаторов: S1 = Z1 Z2, S2 = Z2 Z3. */
  var Z1 = operatorMatrix(QC.GATES.Z, 0, N);
  var Z2 = operatorMatrix(QC.GATES.Z, 1, N);
  var Z3 = operatorMatrix(QC.GATES.Z, 2, N);
  var M_S1 = matMul(Z1, Z2);
  var M_S2 = matMul(Z2, Z3);

  /* ------------------------------------------------------------------ */
  /* Модель кода                                                         */
  /* ------------------------------------------------------------------ */

  /* Исходное кодируемое состояние: |0> -> |000>, |+> -> (|000>+|111>)/sqrt(2). */
  function encodeLogical(which) {
    var v = QC.sv.zeros(DIM);
    var a = QC.C(1, 0);
    var b = QC.C(0, 0);
    if (which === 'plus') {
      var s = 1 / Math.sqrt(2);
      a = QC.C(s, 0);
      b = QC.C(s, 0);
    }
    v[0] = a;   /* |000> */
    v[7] = b;   /* |111> */
    return v;
  }

  /* Применение X к заданному кубиту (target с нуля). */
  function applyXTo(v, target) {
    return QC.sv.apply1(v, QC.GATES.X, target, N);
  }

  /* Сравнение двух векторов состояния по компонентам. */
  function compareStates(a, b) {
    var maxDiff = 0;
    for (var i = 0; i < a.length; i++) {
      var d = QC.cabs(QC.csub(a[i], b[i]));
      if (d > maxDiff) { maxDiff = d; }
    }
    return { equal: maxDiff < EPS, maxDiff: maxDiff };
  }

  /* Собственные значения стабилизаторов для произвольного состояния. */
  function syndromesOf(v) {
    var raw1 = eigenvalue(M_S1, v);
    var raw2 = eigenvalue(M_S2, v);
    return {
      s1: raw1 >= 0 ? 1 : -1,
      s2: raw2 >= 0 ? 1 : -1,
      raw1: raw1,
      raw2: raw2
    };
  }

  /* Поиск строки таблицы соответствий по паре синдромов. */
  function lookupSyndrome(s1, s2) {
    for (var i = 0; i < SYNDROME_TABLE.length; i++) {
      if (SYNDROME_TABLE[i].s1 === s1 && SYNDROME_TABLE[i].s2 === s2) {
        return SYNDROME_TABLE[i];
      }
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Состояние виджета и действия                                        */
  /* ------------------------------------------------------------------ */

  function logicalLabel() {
    return (logical === 'plus') ? '|+⟩' : '|0⟩';
  }

  function qubitName(target) {
    return 'кубит ' + (target + 1);
  }

  /* Пересчёт текущего состояния: исходное + все ошибки + все коррекции. */
  function recompute() {
    var v = original.slice(0);
    var list = errors.concat(fixes);
    for (var i = 0; i < list.length; i++) {
      v = applyXTo(v, list[i]);
    }
    current = v;
  }

  function setLogical(which) {
    logical = (which === 'plus') ? 'plus' : 'zero';
    original = encodeLogical(logical);
    errors = [];
    fixes = [];
    syndromes = null;
    damaged = -1;
    lastFix = null;
    recompute();
    note = 'Кодируемое состояние: ' + logicalLabel() +
      ' (alpha = ' + (logical === 'plus' ? '1/sqrt(2)' : '1') +
      ', beta = ' + (logical === 'plus' ? '1/sqrt(2)' : '0') +
      '). Кодовое состояние |psi> = alpha|000> + beta|111> приготовлено.';
  }

  function injectError(target) {
    if (!original) { setLogical('zero'); }
    errors.push(target);
    syndromes = null;
    damaged = -1;
    lastFix = null;
    recompute();
    note = 'Внедрена X-ошибка на ' + qubitName(target) +
      '. Кодовое пространство нарушено: теперь вектор состояния не равен исходному.';
  }

  /* Измерение синдромов: вычисляем собственные значения и моделируем
     проекцию на измеренные подпространства. */
  function measureSyndromes() {
    var before = current.slice(0);
    var s = syndromesOf(current);
    current = projectOnEigen(M_S1, current, s.s1);
    current = projectOnEigen(M_S2, current, s.s2);
    var cmp = compareStates(before, current);
    s.drift = cmp.maxDiff;
    syndromes = s;
    var entry = lookupSyndrome(s.s1, s.s2);
    damaged = entry ? entry.qubit : -2;
    lastFix = null;
    note = 'Синдромы измерены: S1 = ' + signStr(s.s1) + ', S2 = ' + signStr(s.s2) +
      '. Состояние-вектор не изменился (максимальное расхождение ' +
      fmtNum(cmp.maxDiff) + '): стабилизаторы коммутируют с данными.';
  }

  /* Декодирование и коррекция: X на кубит, найденный по синдрому. */
  function fixError() {
    if (!syndromes) { measureSyndromes(); }
    var entry = lookupSyndrome(syndromes.s1, syndromes.s2);
    if (!entry) {
      lastFix = { applied: false, ok: false, text: 'Синдром не соответствует ни одной строке таблицы.' };
      note = 'Декодирование невозможно: неизвестная пара синдромов.';
      return;
    }
    if (entry.qubit < 0) {
      var cmp0 = compareStates(current, original);
      lastFix = {
        applied: false,
        ok: cmp0.equal,
        text: 'Синдром (+1, +1): ошибок нет, корректировать нечего.'
      };
      note = 'Коррекция не потребовалась: кодовое состояние уже корректно.';
      return;
    }
    fixes.push(entry.qubit);
    recompute();
    var cmp = compareStates(current, original);
    lastFix = {
      applied: true,
      qubit: entry.qubit,
      ok: cmp.equal,
      maxDiff: cmp.maxDiff,
      text: 'Применена коррекция X на ' + qubitName(entry.qubit) + '.'
    };
    if (cmp.equal) {
      note = 'Коррекция завершена: состояние совпало с исходным по всем ' + DIM + ' компонентам.';
    } else {
      note = 'Внимание: внедрённых X-ошибок было ' + errors.length +
        '. Трёхкубитный код исправляет только одиночную X-ошибку, поэтому одной' +
        ' коррекции недостаточно.';
    }
  }

  function resetAll() {
    setLogical('zero');
    note = 'Виджет сброшен: кодируемое состояние |0>, ошибок нет, синдромы не измерены.';
  }

  /* ------------------------------------------------------------------ */
  /* Форматирование                                                      */
  /* ------------------------------------------------------------------ */

  function signStr(s) {
    return (s >= 0) ? '+1' : '-1';
  }

  function fmtNum(x) {
    return x.toFixed(9);
  }

  function errListText(list) {
    var parts = [];
    for (var i = 0; i < list.length; i++) {
      parts.push('X на ' + qubitName(list[i]));
    }
    return parts.length ? parts.join(', ') : 'нет';
  }

  /* Пояснение «почему именно такой кубит»: Z даёт минус на бите 1,
     поэтому Z1 Z2 = -1 ровно тогда, когда биты 1 и 2 различаются. */
  function whyLines(entry) {
    var L = [];
    L.push('  Z на кубите даёт знак -1 для бита 1 и знак +1 для бита 0.');
    L.push('  Поэтому S1 = Z1 Z2 = -1 ровно тогда, когда биты 1 и 2 различаются,');
    L.push('  а S2 = Z2 Z3 = -1 ровно тогда, когда биты 2 и 3 различаются.');
    if (!entry || entry.qubit < 0) {
      L.push('  Здесь биты 1, 2 и 3 совпадают (000 или 111), значит оба произведения дают +1.');
      L.push('  Общее правило: S1 = -1 означает «перевёрнут кубит 1 или 2»,');
      L.push('  S2 = -1 означает «перевёрнут кубит 2 или 3»; пересечение двух условий');
      L.push('  однозначно указывает на кубит 2.');
      return L;
    }
    L.push('  X-ошибка на ' + qubitName(entry.qubit) + ' переворачивает ровно один бит:');
    if (entry.qubit === 0) {
      L.push('    биты 1 и 2 становятся разными -> S1 = Z1 Z2 = -1;');
      L.push('    биты 2 и 3 остаются одинаковыми -> S2 = Z2 Z3 = +1.');
    } else if (entry.qubit === 1) {
      L.push('    биты 1 и 2 становятся разными -> S1 = Z1 Z2 = -1;');
      L.push('    биты 2 и 3 становятся разными -> S2 = Z2 Z3 = -1.');
    } else {
      L.push('    биты 1 и 2 остаются одинаковыми -> S1 = Z1 Z2 = +1;');
      L.push('    биты 2 и 3 становятся разными -> S2 = Z2 Z3 = -1.');
    }
    L.push('  Итак, S1 = -1 означает «перевёрнут кубит 1 или 2»,');
    L.push('  S2 = -1 означает «перевёрнут кубит 2 или 3»; пересечение двух условий');
    L.push('  однозначно указывает на испорченный кубит.');
    return L;
  }

  /* ------------------------------------------------------------------ */
  /* Отрисовка схемы                                                     */
  /* ------------------------------------------------------------------ */

  function isDark() {
    try {
      return !!(global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches);
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
      fill: dark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.8)',
      accent: '#7c4dff'
    };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  /* Значок X-ошибки: кружок с крестом на дорожке кубита. */
  function drawXMark(ctx, cx, cy, r, color, pal) {
    ctx.save();
    ctx.fillStyle = pal.fill;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.55, cy - r * 0.55);
    ctx.lineTo(cx + r * 0.55, cy + r * 0.55);
    ctx.moveTo(cx + r * 0.55, cy - r * 0.55);
    ctx.lineTo(cx - r * 0.55, cy + r * 0.55);
    ctx.stroke();
    ctx.restore();
  }

  /* Блок стабилизатора с пунктирными связями к дорожкам кубитов. */
  function drawStabilizerBox(ctx, bx, cy, bw, title, value, color, tracks, ys, xEnd, pal, hint) {
    var bh = 54;
    ctx.save();

    /* связи блока с дорожками, которые он затрагивает */
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1.3;
    ctx.setLineDash([4, 3]);
    for (var i = 0; i < tracks.length; i++) {
      var ty = ys[tracks[i]];
      ctx.beginPath();
      ctx.moveTo(bx - 2, cy);
      ctx.lineTo(xEnd + 14, cy);
      ctx.lineTo(xEnd + 14, ty);
      ctx.lineTo(xEnd + 2, ty);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    /* сам блок */
    ctx.fillStyle = pal.fill;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    roundRect(ctx, bx, cy - bh / 2, bw, bh, 6);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(title, bx + 10, cy - 17);
    ctx.fillStyle = pal.text;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('= ' + value, bx + 10, cy + 1);
    ctx.fillStyle = hint ? QC.draw.colors.x : pal.dim;
    ctx.font = '11px sans-serif';
    ctx.fillText(hint, bx + 10, cy + 18);
    ctx.restore();
  }

  /* Схема: три дорожки кубитов, два блока стабилизаторов, отметка ошибки. */
  function drawScheme() {
    var c = QC.dom.canvas('cv-scheme');
    if (!c) { return; }
    var ctx = c.ctx;
    var w = c.width;
    var h = c.height;
    var pal = palette();

    ctx.clearRect(0, 0, w, h);

    var padL = 74;
    var padR = 12;
    var padT = 26;
    var padB = 56;
    var boxW = Math.max(130, Math.min(220, Math.round(w * 0.26)));
    var x0 = padL;
    var x1 = Math.max(x0 + 70, w - padR - boxW - 26);
    var avail = Math.max(70, h - padT - padB);
    var gap = avail / 3;
    var ys = [padT + gap * 0.5, padT + gap * 1.5, padT + gap * 2.5];

    var cS1 = '#3aa0a8';
    var cS2 = '#e08b52';
    var cBad = QC.draw.colors.x;

    /* заголовок */
    ctx.save();
    ctx.fillStyle = pal.text;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('3-кубитный код: |psi> = alpha|000> + beta|111>', 8, padT * 0.45);
    ctx.restore();

    /* дорожки кубитов */
    for (var i = 0; i < N; i++) {
      var isBad = (damaged === i);
      ctx.save();
      ctx.strokeStyle = isBad ? cBad : pal.wire;
      ctx.lineWidth = isBad ? 2.2 : 1.6;
      ctx.beginPath();
      ctx.moveTo(x0, ys[i]);
      ctx.lineTo(x1, ys[i]);
      ctx.stroke();
      ctx.fillStyle = isBad ? cBad : pal.text;
      ctx.font = (isBad ? 'bold ' : '') + '13px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('кубит ' + (i + 1), x0 - 10, ys[i]);
      ctx.restore();
    }

    /* отметки внедрённых X-ошибок */
    for (var e = 0; e < errors.length; e++) {
      var q = errors[e];
      var fx = 0.28 + 0.2 * e;
      if (fx > 0.82) { fx = 0.82; }
      drawXMark(ctx, x0 + (x1 - x0) * fx, ys[q], 9, cBad, pal);
    }

    /* блоки стабилизаторов */
    var bx = w - padR - boxW;
    var entry = syndromes ? lookupSyndrome(syndromes.s1, syndromes.s2) : null;
    var hint1 = 'ошибок нет';
    var hint2 = 'ошибок нет';
    if (entry) {
      if (entry.qubit === 0) { hint1 = 'ошибка: кубит 1'; hint2 = 'ошибок нет'; }
      else if (entry.qubit === 1) { hint1 = 'ошибка: кубит 2'; hint2 = 'ошибка: кубит 2'; }
      else if (entry.qubit === 2) { hint1 = 'ошибок нет'; hint2 = 'ошибка: кубит 3'; }
    }
    drawStabilizerBox(ctx, bx, (ys[0] + ys[1]) / 2, boxW, 'S1 = Z1 Z2',
      syndromes ? signStr(syndromes.s1) : '?', cS1, [0, 1], ys, x1, pal, hint1);
    drawStabilizerBox(ctx, bx, (ys[1] + ys[2]) / 2, boxW, 'S2 = Z2 Z3',
      syndromes ? signStr(syndromes.s2) : '?', cS2, [1, 2], ys, x1, pal, hint2);

    /* нижняя подпись: цикл коррекции */
    drawFlow(ctx, w, h, pal);
  }

  /* Полоса «измерение синдромов -> декодирование -> коррекция» с подсветкой шага. */
  function drawFlow(ctx, w, h, pal) {
    var steps = ['измерение синдромов', 'декодирование', 'коррекция'];
    var active = -1;
    if (errors.length && !syndromes) { active = 0; }
    else if (syndromes && !lastFix) { active = 1; }
    else if (lastFix) { active = 2; }

    var y = h - 18;

    if (w < 430) {
      ctx.save();
      ctx.fillStyle = pal.dim;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('измерение синдромов -> декодирование -> коррекция', w / 2, y);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.font = '12px sans-serif';
    var widths = [];
    var total = 0;
    for (var i = 0; i < steps.length; i++) {
      widths[i] = ctx.measureText(steps[i]).width + 18;
      total += widths[i];
    }
    total += 2 * 24;
    var start = Math.max(8, (w - total) / 2);
    var x = start;
    for (var k = 0; k < steps.length; k++) {
      var on = (k === active);
      ctx.fillStyle = on ? pal.accent : pal.fill;
      ctx.strokeStyle = on ? pal.accent : pal.dim;
      ctx.lineWidth = 1.4;
      roundRect(ctx, x, y - 12, widths[k], 24, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = on ? '#ffffff' : pal.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(steps[k], x + widths[k] / 2, y);
      x += widths[k];
      if (k < steps.length - 1) {
        ctx.fillStyle = pal.dim;
        ctx.textAlign = 'center';
        ctx.fillText('->', x + 12, y);
        x += 24;
      }
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /* Текстовый вывод                                                     */
  /* ------------------------------------------------------------------ */

  function updateText() {
    var L = [];

    L.push('Кодируемое состояние: ' + logicalLabel() +
      '   ->   |psi> = alpha|000> + beta|111>');
    L.push('Исходное кодовое состояние: ' + QC.sv.fmtState(original, N, 4));
    L.push('');

    L.push('Внедрённые X-ошибки: ' + errListText(errors) +
      (errors.length > 1 ? '  (код исправляет только одиночную ошибку)' : ''));
    L.push('Состояние после ошибки: ' + QC.sv.fmtState(current, N, 4));
    L.push('');

    if (syndromes) {
      L.push('Синдромы (собственные значения операторов-стабилизаторов):');
      L.push('  S1 = Z1 Z2 : ' + signStr(syndromes.s1) +
        '   (формула Рэлея дала ' + syndromes.raw1.toFixed(6) + ')');
      L.push('  S2 = Z2 Z3 : ' + signStr(syndromes.s2) +
        '   (формула Рэлея дала ' + syndromes.raw2.toFixed(6) + ')');
      L.push('  Состояние после измерения синдромов: ' + QC.sv.fmtState(current, N, 4));
      L.push('  Расхождение с состоянием до измерения: ' + fmtNum(syndromes.drift) +
        '  -> данные не разрушены (S1 и S2 коммутируют с кодируемой информацией).');
      L.push('');
      L.push('Таблица соответствий «синдром -> испорченный кубит»:');
      for (var i = 0; i < SYNDROME_TABLE.length; i++) {
        var row = SYNDROME_TABLE[i];
        var mark = (row.s1 === syndromes.s1 && row.s2 === syndromes.s2) ? ' <-- наш случай' : '';
        L.push('  (' + signStr(row.s1) + ', ' + signStr(row.s2) + ')  ->  ' + row.text + mark);
      }
      L.push('');
      var entry = lookupSyndrome(syndromes.s1, syndromes.s2);
      L.push('Декодирование: ' + (entry ? entry.text : 'неизвестный синдром') + '.');
      L.push('Почему так:');
      var why = whyLines(entry);
      for (var w = 0; w < why.length; w++) { L.push(why[w]); }
    } else {
      L.push('Синдромы ещё не измерены. Нажмите «Измерить синдромы».');
      L.push('Ожидаемые синдромы:');
      L.push('  (+1, +1) -> ошибок нет;  (-1, +1) -> кубит 1;');
      L.push('  (-1, -1) -> кубит 2;      (+1, -1) -> кубит 3.');
    }
    L.push('');

    if (lastFix) {
      L.push('Результат после исправления:');
      L.push('  ' + lastFix.text);
      if (lastFix.applied) {
        L.push('  Состояние: ' + QC.sv.fmtState(current, N, 4));
        L.push('  Сравнение с исходным (по всем ' + DIM + ' компонентам): ' +
          (lastFix.ok ? 'СОВПАДАЕТ' : 'НЕ СОВПАДАЕТ') +
          ', максимальное расхождение ' + fmtNum(lastFix.maxDiff));
      } else {
        L.push('  Состояние: ' + QC.sv.fmtState(current, N, 4));
        L.push('  Сравнение с исходным: ' + (lastFix.ok ? 'СОВПАДАЕТ' : 'НЕ СОВПАДАЕТ'));
      }
    } else {
      L.push('Коррекция ещё не выполнялась.');
    }

    if (note) {
      L.push('');
      L.push(note);
    }

    QC.dom.text('state-text', L.join('\n'));
  }

  function updatePressed() {
    var z = QC.dom.el('btn-logical-zero');
    var p = QC.dom.el('btn-logical-plus');
    if (z) { z.setAttribute('aria-pressed', logical === 'zero' ? 'true' : 'false'); }
    if (p) { p.setAttribute('aria-pressed', logical === 'plus' ? 'true' : 'false'); }
  }

  function render() {
    drawScheme();
    updateText();
    updatePressed();
  }

  /* ------------------------------------------------------------------ */
  /* Инициализация                                                      */
  /* ------------------------------------------------------------------ */

  function init() {
    if (!QC.dom.el('cv-scheme') || !QC.dom.el('state-text')) { return; }

    QC.dom.button('btn-logical-zero', 'Состояние |0⟩', function () {
      setLogical('zero');
      render();
    }, 'Закодировать логическое состояние |0⟩: |psi> = |000>.');

    QC.dom.button('btn-logical-plus', 'Состояние |+⟩', function () {
      setLogical('plus');
      render();
    }, 'Закодировать логическое состояние |+⟩: |psi> = (|000> + |111>)/sqrt(2).');

    QC.dom.button('btn-x1', 'X-ошибка на кубит 1', function () {
      injectError(0);
      render();
    }, 'Перевернуть первый кубит (старший бит кета) гейтом X.');

    QC.dom.button('btn-x2', 'X-ошибка на кубит 2', function () {
      injectError(1);
      render();
    }, 'Перевернуть второй кубит (средний бит кета) гейтом X.');

    QC.dom.button('btn-x3', 'X-ошибка на кубит 3', function () {
      injectError(2);
      render();
    }, 'Перевернуть третий кубит (младший бит кета) гейтом X.');

    QC.dom.button('btn-syndrome', 'Измерить синдромы', function () {
      measureSyndromes();
      render();
    }, 'Измерить собственные значения стабилизаторов S1 = Z1 Z2 и S2 = Z2 Z3.');

    QC.dom.button('btn-fix', 'Исправить', function () {
      fixError();
      render();
    }, 'Найти испорченный кубит по синдрому и применить к нему X.');

    QC.dom.button('btn-reset', 'Сброс', function () {
      resetAll();
      render();
    }, 'Вернуть виджет в исходное состояние.');

    global.addEventListener('resize', render);

    setLogical('zero');
    note = 'Виджет сброшен: кодируемое состояние |0>, ошибок нет, синдромы не измерены.';
    render();
  }

  /* ------------------------------------------------------------------ */
  /* Публичный интерфейс математики (используется в проверках)            */
  /* ------------------------------------------------------------------ */

  global.QECycle = {
    N: N,
    DIM: DIM,
    table: SYNDROME_TABLE,
    encode: encodeLogical,
    applyX: applyXTo,
    syndromes: syndromesOf,
    lookup: lookupSyndrome,
    compare: compareStates,
    eigenvalue: eigenvalue,
    matrix: function (which) {
      return (which === 's2') ? M_S2 : M_S1;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
