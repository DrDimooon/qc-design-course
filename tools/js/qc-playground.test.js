/*
 * Тест виджета «Конструктор квантовых схем» (widget-circuit-playground.js).
 *
 * Запуск:  node tools/js/qc-playground.test.js
 *
 * Зачем: в виджете CNOT — это cx(0, 1) из Qiskit (контроль q0, цель q1), но
 * рисунок раньше рисовал кружок контроля на ВЕРХНЕЙ дорожке (q1) и крест на
 * нижней (q0) — то есть ровно наоборот. Схема на экране противоречила
 * вычислению. Этот тест ловит такой рассинхрон: он проверяет, что
 *   - операция CNOT действительно применяется как cx(0, 1);
 *   - геометрия рисунка берёт дорожки из операции (qCtrl / qTgt);
 *   - подпись цепи совпадает с направлением.
 *
 * DOM не нужен настоящий: подменяем document/window заглушками, а canvas —
 * «записывающим» контекстом, который сохраняет вызовы arc/moveTo/lineTo.
 * Зависимостей нет.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');

/* --------------------------- заглушки DOM --------------------------- */

function makeRecordingContext() {
  const calls = [];
  const rec = (name) => function () { calls.push({ name: name, args: Array.prototype.slice.call(arguments) }); };
  const ctx = {
    calls: calls,
    canvas: { width: 960, height: 240 },
    save: rec('save'),
    restore: rec('restore'),
    clearRect: rec('clearRect'),
    beginPath: rec('beginPath'),
    stroke: rec('stroke'),
    fill: rec('fill'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    arc: rec('arc'),
    rect: rec('rect'),
    fillRect: rec('fillRect'),
    fillText: rec('fillText'),
    setLineDash: rec('setLineDash'),
    measureText: () => ({ width: 10 }),
    setTransform: rec('setTransform')
  };
  return ctx;
}

function runWidget() {
  const listeners = {};
  const els = {};
  const canvasCtxs = {};

  function mkEl(id) {
    return {
      id: id,
      tag: 'div',
      textContent: '',
      innerHTML: '',
      style: {},
      children: [],
      firstChild: null,
      width: 960,
      height: 240,
      clientWidth: 960,
      clientHeight: 240,
      appendChild(c) { this.children.push(c); this.firstChild = this.children[0]; },
      removeChild(c) {
        const i = this.children.indexOf(c);
        if (i >= 0) { this.children.splice(i, 1); }
        this.firstChild = this.children[0] || null;
      },
      setAttribute(k, v) { this['attr_' + k] = v; },
      getAttribute(k) { return this['attr_' + k]; },
      addEventListener(ev, fn) { listeners[id + ':' + ev] = fn; },
      getBoundingClientRect() { return { width: 960, height: 240 }; },
      getContext() {
        if (!canvasCtxs[id]) { canvasCtxs[id] = makeRecordingContext(); }
        return canvasCtxs[id];
      }
    };
  }

  const doc = {
    readyState: 'complete',
    getElementById(id) { if (!els[id]) { els[id] = mkEl(id); } return els[id]; },
    createElement(t) { const e = mkEl('new-' + t); e.tag = t; return e; },
    addEventListener() {}
  };

  const win = {
    devicePixelRatio: 1,
    requestAnimationFrame() { return 0; },
    addEventListener() {},
    matchMedia() { return { matches: false }; },
    document: doc,
    console: console,
    Math: Math
  };
  win.window = win;

  const ctx = vm.createContext(win);
  for (const f of ['assets/js/qc-core.js', 'assets/js/widget-circuit-playground.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  }
  return {
    win: win,
    els: els,
    ctxs: canvasCtxs,
    click(id) {
      const fn = listeners[id + ':click'];
      if (!fn) { throw new Error('нет кнопки ' + id); }
      fn();
    }
  };
}

/* --------------------------- мини-фреймворк --------------------------- */

let passed = 0;
let failed = 0;

function check(name, cond, detail) {
  if (cond) {
    passed++;
    console.log('  ok   ' + name);
  } else {
    failed++;
    console.log('  FAIL ' + name + (detail ? ' -> ' + detail : ''));
  }
}

/* --------------------------- тесты --------------------------- */

const h = runWidget();
const CP = h.win.CircuitPlayground;

console.log('qc-playground: геометрия дорожек');
check('виджет выставляет window.CircuitPlayground', !!CP);

const H = 240;
const L = CP.layout(H);
check('сверху дорожка q1 (старший), снизу q0 (младший)',
  L.wireY(1) === L.yTop && L.wireY(0) === L.yBottom && L.yTop < L.yBottom,
  'wireY(1)=' + L.wireY(1) + ' yTop=' + L.yTop + ' wireY(0)=' + L.wireY(0) + ' yBottom=' + L.yBottom);

console.log('qc-playground: CNOT = cx(0, 1) и рисунок совпадает с операцией');
const op = CP.makeCnotOp();
check('операция CNOT: контроль q0, цель q1', op.qCtrl === 0 && op.qTgt === 1,
  'qCtrl=' + op.qCtrl + ' qTgt=' + op.qTgt);
check('базисные индексы матрицы для |q1 q0>: (qA, qB) = (1, 0)', op.qA === 1 && op.qB === 0);
check('матрица — QC.MAT4.CNOT (Operator(CX(0,1)))', op.mat === h.win.QC.MAT4.CNOT);

const g = CP.cnotGeometry(op, H);
check('контроль нарисован на дорожке q0 (нижняя)', g.ctrlY === L.wireY(0),
  'ctrlY=' + g.ctrlY + ' ожидалось ' + L.wireY(0));
check('цель (крест) нарисована на дорожке q1 (верхняя)', g.tgtY === L.wireY(1),
  'tgtY=' + g.tgtY + ' ожидалось ' + L.wireY(1));
check('контроль ниже цели (q0 под q1) — не перевёрнуто', g.ctrlY > g.tgtY,
  'ctrlY=' + g.ctrlY + ' tgtY=' + g.tgtY);

console.log('qc-playground: подпись цепи и реальная отрисовка');
check('подпись цепи: CNOT(q0->q1)',
  CP.chainText([op]) === 'CNOT(q0->q1)', CP.chainText([op]));

/* Собираем H на q0 + CNOT и проверяем, что на canvas кружок (arc) стоит на
   нижней дорожке, а крест (пересекающиеся moveTo/lineTo) — на верхней. */
h.click('reset');
h.click('target-q0');
h.click('gate-H');
h.click('gate-cnot');

const calls = (h.ctxs['circuit'] && h.ctxs['circuit'].calls) || [];
const arcs = calls.filter((c) => c.name === 'arc');
const lineEnds = calls.filter((c) => c.name === 'lineTo' || c.name === 'moveTo');

/* CNOT рисует ровно один кружок контроля (arc радиусом 5.5). */
const ctrlArc = arcs.filter((c) => Math.abs(c.args[2] - 5.5) < 1e-9);
check('на схеме есть кружок контроля CNOT', ctrlArc.length === 1,
  'найдено ' + ctrlArc.length);
if (ctrlArc.length === 1) {
  const cy = ctrlArc[0].args[1];
  check('кружок контроля CNOT стоит на нижней дорожке q0', Math.abs(cy - L.wireY(0)) < 1e-6,
    'cy=' + cy + ' ожидалось ' + L.wireY(0));
}

/* Крест цели: диагональ из (cx-r, y-r) в (cx+r, y+r) и обратная.
   Достаточно найти пару moveTo/lineTo с концами на верхней дорожке. */
const crossOnTop = lineEnds.some((c) => {
  const a = c.args;
  return Math.abs(a[1] - L.wireY(1)) < 1e-6;
});
check('крест цели CNOT задевает верхнюю дорожку q1', crossOnTop);

/* Реверс-контроль: если бы контроль и цель были перепутаны, кружок стоял бы
   на верхней дорожке. Проверяем, что этого нет. */
const wrongCtrl = arcs.some((c) => Math.abs(c.args[2] - 5.5) < 1e-9 &&
  Math.abs(c.args[1] - L.wireY(1)) < 1e-6);
check('кружок контроля НЕ на верхней дорожке (регресс-защита)', !wrongCtrl);

console.log('qc-playground: X на каждом кубите в состоянии');
function stateAfter(ids) {
  h.click('reset');
  ids.forEach((id) => h.click(id));
  return h.els['state'].innerHTML.replace(/&gt;/g, '>').replace(/&lt;/g, '<')
    .replace(/&quot;/g, '"').replace(/\n/g, '\n');
}
const xq0 = stateAfter(['target-q0', 'gate-X']);
const xq1 = stateAfter(['target-q1', 'gate-X']);
check('X на q0 даёт |01>', xq0.indexOf('|01⟩') >= 0, xq0.split('\n')[1]);
check('X на q1 даёт |10>', xq1.indexOf('|10⟩') >= 0, xq1.split('\n')[1]);

const bell = stateAfter(['target-q0', 'gate-H', 'gate-cnot']);
check('H(q0) + CNOT(q0->q1) даёт (|00>+|11>)/sqrt2',
  bell.indexOf('|00⟩') >= 0 && bell.indexOf('|11⟩') >= 0 && bell.indexOf('|01⟩ 0.0%') >= 0,
  bell.split('\n').slice(0, 3).join(' | '));

const noEntangle = stateAfter(['target-q1', 'gate-H', 'gate-cnot']);
check('H(q1) + CNOT(q0->q1) не запутывает: только |00> и |10>',
  noEntangle.indexOf('|10⟩') >= 0 && noEntangle.indexOf('|01⟩ 0.0%') >= 0 &&
  noEntangle.indexOf('|11⟩ 0.0%') >= 0,
  noEntangle.split('\n').slice(0, 3).join(' | '));

console.log('');
console.log('ИТОГ: успешно ' + passed + ', провалено ' + failed);
process.exit(failed === 0 ? 0 : 1);
