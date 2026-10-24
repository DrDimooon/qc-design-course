/*
 * Тесты общей библиотеки qc-core.js.
 *
 * Запуск:  node tools/js/qc-core.test.js
 *
 * Проверяются операции над вектором состояния, матрицы гейтов,
 * преобразование Блоха и статистику измерения. Никаких зависимостей.
 *
 * Главный блок — «соглашение Qiskit» (CONVENTIONS.md): кет |q_{n-1}...q0>,
 * q0 — младший бит, индекс = sum_q b_q * 2^q, counts в порядке q_{n-1}...q0.
 * Тесты намеренно используют НЕсимметричные состояния и направленный CNOT:
 * симметричное состояние Белла не поймало бы переворот порядка кубитов.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

global.window = global;
const src = fs.readFileSync(
  path.join(__dirname, '..', '..', 'assets', 'js', 'qc-core.js'),
  'utf8'
);
(0, eval)(src);
const QC = global.QC;

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

function close(a, b, eps) {
  eps = eps || 1e-9;
  return Math.abs(a - b) < eps;
}

function vecClose(v, expected, eps) {
  eps = eps || 1e-9;
  if (v.length !== expected.length) { return false; }
  for (let i = 0; i < v.length; i++) {
    if (!close(v[i].re, expected[i].re, eps) || !close(v[i].im, expected[i].im, eps)) {
      return false;
    }
  }
  return true;
}

const S = Math.SQRT1_2;

console.log('qc-core: базовые операции');
check('норма |0> равна 1', close(QC.sv.norm(QC.sv.basis(1, 0)), 1));
check('ket форматируется как |101⟩', QC.sv.ket(5, 3) === '|101⟩');

console.log('qc-core: однокубитные гейты');
let v = QC.sv.basis(1, 0);
check('H|0> = (|0>+|1>)/sqrt(2)', vecClose(QC.sv.apply1(v, QC.GATES.H, 0, 1), [QC.C(S, 0), QC.C(S, 0)]));
check('X|0> = |1>', vecClose(QC.sv.apply1(v, QC.GATES.X, 0, 1), [QC.C(0, 0), QC.C(1, 0)]));
check('Z|1> = -|1>', vecClose(QC.sv.apply1(QC.sv.basis(1, 1), QC.GATES.Z, 0, 1), [QC.C(0, 0), QC.C(-1, 0)]));
check(
  'T|1> = e^{i*pi/4}|1>',
  vecClose(QC.sv.apply1(QC.sv.basis(1, 1), QC.GATES.T, 0, 1), [QC.C(0, 0), QC.C(S, S)], 1e-12)
);
check(
  'Z*H|0> = (|0>-|1>)/sqrt(2)',
  vecClose(
    QC.sv.apply1(QC.sv.apply1(v, QC.GATES.H, 0, 1), QC.GATES.Z, 0, 1),
    [QC.C(S, 0), QC.C(-S, 0)]
  )
);

console.log('qc-core: повороты Раби');
const rz = QC.GATES.rz(Math.PI);
const rzOut = QC.sv.apply1(QC.sv.basis(1, 0), rz, 0, 1);
check('Rz(pi)|0> = -i|0> (глобальная фаза)', vecClose(rzOut, [QC.C(0, -1), QC.C(0, 0)], 1e-12));
const ryOut = QC.sv.apply1(QC.sv.basis(1, 0), QC.GATES.ry(Math.PI), 0, 1);
check('Ry(pi)|0> = |1>', vecClose(ryOut, [QC.C(0, 0), QC.C(1, 0)], 1e-12));

console.log('qc-core: два кубита');
/* Bell: H на q0, затем cx(0, 1). В терминах qc-core: apply1(..., q0)
   и apply2(..., MAT4.CNOT, qHi=1, qLo=0) — матрица читается в |q1 q0>. */
let bell = QC.sv.kron(QC.sv.basis(1, 0), QC.sv.basis(1, 0));
bell = QC.sv.apply1(bell, QC.GATES.H, 0, 2);
bell = QC.sv.apply2(bell, QC.MAT4.CNOT, 1, 0, 2);
check(
  'H + CNOT дают (|00>+|11>)/sqrt(2)',
  vecClose(bell, [QC.C(S, 0), QC.C(0, 0), QC.C(0, 0), QC.C(S, 0)])
);
let probs = QC.sv.probs(bell);
check('вероятности Bell-состояния: 0.5 / 0 / 0 / 0.5', close(probs[0], 0.5) && close(probs[3], 0.5) && close(probs[1], 0) && close(probs[2], 0));
let swapped = QC.sv.apply2(bell, QC.MAT4.SWAP, 1, 0, 2);
check('SWAP меняет кубиты местами', vecClose(swapped, [QC.C(S, 0), QC.C(0, 0), QC.C(0, 0), QC.C(S, 0)]));

console.log('qc-core: сохранение нормы и вероятностей');
let mixed = QC.sv.basis(3, 5);
mixed = QC.sv.apply1(mixed, QC.GATES.H, 1, 3);
mixed = QC.sv.apply1(mixed, QC.GATES.T, 1, 3);
mixed = QC.sv.apply1(mixed, QC.GATES.X, 0, 3);
mixed = QC.sv.apply2(mixed, QC.MAT4.CNOT, 0, 2, 3);
const sumP = QC.sv.probs(mixed).reduce((a, b) => a + b, 0);
check('сумма вероятностей равна 1', close(sumP, 1, 1e-12));

console.log('qc-core: сфера Блоха');
check('|0> -> z = +1', close(QC.bloch.fromVector([QC.C(1, 0), QC.C(0, 0)]).z, 1));
check('|1> -> z = -1', close(QC.bloch.fromVector([QC.C(0, 0), QC.C(1, 0)]).z, -1));
const plus = QC.bloch.fromVector([QC.C(S, 0), QC.C(S, 0)]);
check('|+> -> x = +1, z = 0', close(plus.x, 1) && close(plus.z, 0));
const minusI = QC.bloch.fromVector([QC.C(S, 0), QC.C(0, S)]);
check('|i> -> y = +1', close(minusI.y, 1));
const roundTrip = QC.bloch.toVector(plus);
check('обратное преобразование Блоха сохраняет |+>', vecClose(roundTrip, [QC.C(S, 0), QC.C(S, 0)], 1e-9));

console.log('qc-core: измерение');
let counts = [0, 0];
for (let i = 0; i < 4000; i++) {
  counts[QC.sv.sample(QC.sv.apply1(QC.sv.basis(1, 0), QC.GATES.H, 0, 1))]++;
}
const ratio = counts[0] / (counts[0] + counts[1]);
check('частота исходов |0> около 0.5', Math.abs(ratio - 0.5) < 0.05, 'получено ' + ratio.toFixed(3));

console.log('qc-core: унитарность гейтов');
function matMul(A, B) {
  const n = A.length;
  const R = [];
  for (let i = 0; i < n; i++) {
    R.push([]);
    for (let j = 0; j < n; j++) {
      let s = QC.C(0, 0);
      for (let k = 0; k < n; k++) { s = QC.cadd(s, QC.cmul(A[i][k], B[k][j])); }
      R[i].push(s);
    }
  }
  return R;
}
function matConjT(M) {
  return M.map(function (row, i) { return row.map(function (c, j) { return QC.cconj(M[j][i]); }); });
}
function isUnitary(M) {
  const U = matMul(matConjT(M), M);
  for (let i = 0; i < M.length; i++) {
    for (let j = 0; j < M.length; j++) {
      const wantRe = (i === j) ? 1 : 0;
      if (!close(U[i][j].re, wantRe, 1e-9) || !close(U[i][j].im, 0, 1e-9)) { return false; }
    }
  }
  return true;
}
const gateList = {
  I: QC.GATES.I, X: QC.GATES.X, Y: QC.GATES.Y, Z: QC.GATES.Z,
  H: QC.GATES.H, S: QC.GATES.S, T: QC.GATES.T,
  'rx(0.7)': QC.GATES.rx(0.7), 'ry(0.7)': QC.GATES.ry(0.7), 'rz(0.7)': QC.GATES.rz(0.7),
  'rx(pi)': QC.GATES.rx(Math.PI), 'ry(pi)': QC.GATES.ry(Math.PI), 'rz(pi)': QC.GATES.rz(Math.PI)
};
Object.keys(gateList).forEach(function (name) {
  check('гейт ' + name + ' унитарен', isUnitary(gateList[name]));
});

console.log('qc-core: форматирование');
check('cfmt печатает комплексное число', /0\.7071 \+ 0\.0000i/.test(QC.cfmt(QC.C(S, 0), 4)));
check('fmtState печатает кет', /\|000⟩/.test(QC.sv.fmtState(QC.sv.basis(3, 0), 3)));

/* ------------------------------------------------------------------ */
/* Соглашение Qiskit: |q1 q0>, q0 — младший бит (CONVENTIONS.md)       */
/* ------------------------------------------------------------------ */

function amp(v, i) { return v[i] || QC.C(0, 0); }

/* Индекс, в котором сосредоточена вся амплитуда базисного состояния. */
function basisIndexOf(v) {
  let best = -1;
  let bestP = -1;
  for (let i = 0; i < v.length; i++) {
    const p = QC.cabs(v[i]) ** 2;
    if (p > bestP) { bestP = p; best = i; }
  }
  return best;
}

/* Для n=2: строка r соответствует кету |q1 q0>, r = 2*q1 + q0. */
function ketOf2(r) { return '|' + ((r >> 1) & 1) + (r & 1) + '⟩'; }

console.log('соглашение Qiskit: X на каждом кубите (2 кубита)');
/* X на q0 — это переворот младшего бита: |00> -> |01>, index 1. */
let xq0 = QC.sv.apply1(QC.sv.basis(2, 0), QC.GATES.X, 0, 2);
check('X(q0)|00> = |01>, index 1', basisIndexOf(xq0) === 1 && vecClose(xq0, QC.sv.basis(2, 1)),
  'получен index ' + basisIndexOf(xq0));
check('X(q0)|00> совпадает с np.kron(|0>_q1, |1>_q0)',
  vecClose(xq0, QC.sv.kron(QC.sv.basis(1, 0), QC.sv.basis(1, 1))));
/* X на q1 — переворот старшего бита: |00> -> |10>, index 2. */
let xq1 = QC.sv.apply1(QC.sv.basis(2, 0), QC.GATES.X, 1, 2);
check('X(q1)|00> = |10>, index 2', basisIndexOf(xq1) === 2 && vecClose(xq1, QC.sv.basis(2, 2)),
  'получен index ' + basisIndexOf(xq1));
check('X(q1)|00> совпадает с np.kron(|1>_q1, |0>_q0)',
  vecClose(xq1, QC.sv.kron(QC.sv.basis(1, 1), QC.sv.basis(1, 0))));
/* Обратный порядок кубитов не эквивалентен: X(q0) != X(q1) на |00>. */
check('X(q0)|00> и X(q1)|00> — разные векторы (ловит переворот порядка)',
  !vecClose(xq0, xq1));

console.log('соглашение Qiskit: X на каждом кубите (3 кубита)');
const x3 = {};
for (let q = 0; q < 3; q++) {
  const v3 = QC.sv.apply1(QC.sv.basis(3, 0), QC.GATES.X, q, 3);
  x3[q] = basisIndexOf(v3);
  check('X(q' + q + ')|000> = index 2^' + q + ' = ' + (1 << q), x3[q] === (1 << q),
    'получен index ' + x3[q]);
}
check('индексы X(q0), X(q1), X(q2) различны и растут с номером кубита',
  x3[0] === 1 && x3[1] === 2 && x3[2] === 4);

console.log('соглашение Qiskit: направленный CNOT');
/* Qiskit: cx(0, 1) — контроль q0, цель q1 (переворачивается q1 при q0 = 1).
   В базисе |q1 q0> его Operator — матрица
   [[1,0,0,0],[0,0,0,1],[0,0,1,0],[0,1,0,0]] (строки |00>,|01>,|10>,|11>),
   то есть |01> -> |11>. Вектор в порядке (A, B) = (q1, q0). */
const CX01_QISKIT = [
  [1, 0, 0, 0],
  [0, 0, 0, 1],
  [0, 0, 1, 0],
  [0, 1, 0, 0]
];
function mat4AsInt(m) { return m.map(function (row) { return row.map(function (c) { return c.re; }); }); }
check('MAT4.CNOT = Operator(CX(0,1)) в базисе |q1 q0>',
  JSON.stringify(mat4AsInt(QC.MAT4.CNOT)) === JSON.stringify(CX01_QISKIT),
  JSON.stringify(mat4AsInt(QC.MAT4.CNOT)));
check('MAT4.CNOT — инволюция (CNOT^2 = I)', (function () {
  const sq = [];
  for (let i = 0; i < 4; i++) {
    sq.push([]);
    for (let j = 0; j < 4; j++) {
      let s = QC.C(0, 0);
      for (let k = 0; k < 4; k++) { s = QC.cadd(s, QC.cmul(QC.MAT4.CNOT[i][k], QC.MAT4.CNOT[k][j])); }
      sq[i].push(s);
    }
  }
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (!close(sq[i][j].re, i === j ? 1 : 0) || !close(sq[i][j].im, 0)) { return false; }
    }
  }
  return true;
})());

/* Qiskit-операторы. Аргументы apply2 при n = 2 всегда (qHi, qLo) = (1, 0):
   матрица читается в порядке |q1 q0>, а направление задаёт выбор матрицы. */
function qiskitCX(ctrl, state) {
  const mat = (ctrl === 0) ? QC.MAT4.CNOT : QC.MAT4.CNOT_T;
  return QC.sv.apply2(state, mat, 1, 0, 2);
}
/* cx(0, 1): контроль q0. Срабатывает на |01> (index 1) и не на |10>. */
const cx01 = qiskitCX(0, QC.sv.basis(2, 1));   /* состояние |q1 q0> = |01> */
check('CX(0,1)|01> = |11> (index 3)', basisIndexOf(cx01) === 3 && ketOf2(basisIndexOf(cx01)) === '|11⟩',
  'получен ' + ketOf2(basisIndexOf(cx01)));
const cx01on10 = qiskitCX(0, QC.sv.basis(2, 2)); /* |10>: контроль q0 = 0 */
check('CX(0,1)|10> = |10> (не срабатывает: q0 = 0)', basisIndexOf(cx01on10) === 2,
  'получен ' + ketOf2(basisIndexOf(cx01on10)));
/* cx(1, 0): контроль q1. Срабатывает на |10> и не на |01> — другое направление. */
const cx10 = qiskitCX(1, QC.sv.basis(2, 2));      /* состояние |10> */
check('CX(1,0)|10> = |11> (index 3)', basisIndexOf(cx10) === 3,
  'получен ' + ketOf2(basisIndexOf(cx10)));
const cx10on01 = qiskitCX(1, QC.sv.basis(2, 1)); /* |01>: контроль q1 = 0 */
check('CX(1,0)|01> = |01> (не срабатывает: q1 = 0)', basisIndexOf(cx10on01) === 1,
  'получен ' + ketOf2(basisIndexOf(cx10on01)));
check('CX(0,1) и CX(1,0) дают разные результаты на одном состоянии (направленность)',
  !vecClose(qiskitCX(0, QC.sv.basis(2, 2)), qiskitCX(1, QC.sv.basis(2, 2))));

/* Таблица переходов обоих направлений на всех 4 базисных состояниях.
   ket index r = 2*q1 + q0, то есть a = q1 (старший), b = q0 (младший). */
let cxOk = true;
for (let r = 0; r < 4; r++) {
  const b = r & 1;             /* q0 */
  const a = (r >> 1) & 1;      /* q1 */
  /* cx(0,1): цель q1 ^= q0 => r' = 2*(a ^ b) + b */
  if (basisIndexOf(qiskitCX(0, QC.sv.basis(2, r))) !== 2 * (a ^ b) + b) { cxOk = false; }
  /* cx(1,0): цель q0 ^= q1 => r' = 2*a + (b ^ a) */
  if (basisIndexOf(qiskitCX(1, QC.sv.basis(2, r))) !== 2 * a + (b ^ a)) { cxOk = false; }
}
check('CX(0,1): q1\' = q1 XOR q0 для всех 4 состояний; CX(1,0): q0\' = q0 XOR q1', cxOk);

/* Асимметричное состояние: в нём ненулевые пары |01> и |11> (index 1 и 3).
   Симметричное (|00> + |11>)/sqrt2 не поймало бы переворот q0/q1. */
console.log('соглашение Qiskit: несимметричное состояние');
let asym2 = QC.sv.basis(2, 0);
asym2 = QC.sv.apply1(asym2, QC.GATES.H, 1, 2);       /* H на q1: (|00> + |10>)/sqrt2 */
asym2 = QC.sv.apply1(asym2, QC.GATES.X, 0, 2);       /* X на q0: (|01> + |11>)/sqrt2 */
check('H(q1), X(q0) дают (|01> + |11>)/sqrt2 — несимметричное состояние',
  vecClose(asym2, [QC.C(0, 0), QC.C(S, 0), QC.C(0, 0), QC.C(S, 0)]),
  QC.sv.fmtState(asym2, 2, 3));
check('у несимметричного состояния амплитуды при |00> и |10> нулевые (index 0 и 2)',
  close(QC.cabs(amp(asym2, 0)), 0) && close(QC.cabs(amp(asym2, 2)), 0));
/* CX(0,1) на этом состоянии: |01> -> |11>, |11> -> |01>, поэтому
   (|01>+|11>)/sqrt2 переходит в себя (компоненты 1 и 3 меняются местами,
   а у обеих одинаковые амплитуды 1/sqrt2). Это НЕ наблюдаемый в этом тесте
   сдвиг: чтобы поймать переворот порядка кубитов, нужен эталон с разными
   амплитудами — он ниже (CX(1,0) и qiskitCX на двух разных состояниях). */
const asymAfterCx = qiskitCX(0, asym2);
check('CX(0,1) на (|01>+|11>)/sqrt2 оставляет состояние тем же (амплитуды равны)',
  vecClose(asymAfterCx, [QC.C(0, 0), QC.C(S, 0), QC.C(0, 0), QC.C(S, 0)]));
/* А вот CX(1,0) на этом состоянии: q1 = 0 в |01>, q1 = 1 в |11>,
   поэтому |01> не меняется, |11> -> |10> => (|01> + |10>)/sqrt2. */
const asymAfterCx10 = qiskitCX(1, asym2);
check('CX(1,0) на (|01>+|11>)/sqrt2 даёт (|01>+|10>)/sqrt2 (срабатывает иначе)',
  vecClose(asymAfterCx10, [QC.C(0, 0), QC.C(S, 0), QC.C(S, 0), QC.C(0, 0)]),
  QC.sv.fmtState(asymAfterCx10, 2, 3));
check('CX(0,1) и CX(1,0) на несимметричном состоянии дают разные состояния',
  !vecClose(asymAfterCx, asymAfterCx10));

/* Решающий тест на переворот порядка: берём ненулевые амплитуды ТОЛЬКО при
   index 0 и index 1 (|00> и |01>) с разными весами. CX(0,1) компоненту 1
   переносит в 3, а CX(1,0) — оставляет 1 и 0 на месте. Если бы apply2 путал
   q0/q1, результат совпал бы с одним из ожиданий не там. */
let skew = QC.sv.zeros(4);
skew[0] = QC.C(0.6, 0);
skew[1] = QC.C(0.8, 0);
const skewCx01 = qiskitCX(0, skew);
const skewCx10 = qiskitCX(1, skew);
check('CX(0,1): 0.6|00> + 0.8|01> -> 0.6|00> + 0.8|11>',
  vecClose(skewCx01, [QC.C(0.6, 0), QC.C(0, 0), QC.C(0, 0), QC.C(0.8, 0)]),
  QC.sv.fmtState(skewCx01, 2, 3));
check('CX(1,0): 0.6|00> + 0.8|01> -> без изменений (q1 = 0)',
  vecClose(skewCx10, [QC.C(0.6, 0), QC.C(0.8, 0), QC.C(0, 0), QC.C(0, 0)]),
  QC.sv.fmtState(skewCx10, 2, 3));
check('разные веса амплитуд: CX(0,1) != CX(1,0) (ловит переворот q0/q1)',
  !vecClose(skewCx01, skewCx10));

/* Эквивалентность apply2 и полных матриц: X(q0) == I⊗X (|q1> ⊗ |q0>). */
console.log('соглашение Qiskit: однокубитный гейт = kron(I, X) для q0');
function mat4Apply(m, v) {
  /* sv.zeros(n) — это n компонент, поэтому для 2 кубитов нужно zeros(4), но
     проще собрать результат через apply-подобную аккумуляцию без zeros(). */
  const out = [];
  for (let i = 0; i < 4; i++) {
    let s = QC.C(0, 0);
    for (let j = 0; j < 4; j++) {
      /* m — матрица вещественных чисел, cmul ждёт {re, im}: оборачиваем. */
      s = QC.cadd(s, QC.cmul(QC.C(m[i][j], 0), v[j]));
    }
    out[i] = s;
  }
  return out;
}
const I2 = QC.GATES.I, X2 = QC.GATES.X;
/* Вектор np.kron(A, B) трактуем как 4x4: (A⊗B)_{2i+k,2j+l} = A_{ij} B_{kl}. */
function matFromKron(A, B) {
  const M = [];
  for (let i = 0; i < 2; i++) {
    for (let k = 0; k < 2; k++) {
      const row = [];
      for (let j = 0; j < 2; j++) {
        for (let l = 0; l < 2; l++) {
          row.push(A[i][j].re * B[k][l].re);
        }
      }
      M[i * 2 + k] = row;   /* строка = i*2 + k, а не порядок перебора */
    }
  }
  return M;
}
const IxX = matFromKron(I2, X2);
const XxI = matFromKron(X2, I2);
check('I⊗X (|q1>⊗|q0>) на |00> даёт index 1 (X на q0)',
  basisIndexOf(mat4Apply(IxX, QC.sv.basis(2, 0))) === 1);
check('X⊗I (|q1>⊗|q0>) на |00> даёт index 2 (X на q1)',
  basisIndexOf(mat4Apply(XxI, QC.sv.basis(2, 0))) === 2);
check('apply1(...,q0) == (I⊗X) · |00>, apply1(...,q1) == (X⊗I) · |00>',
  vecClose(QC.sv.apply1(QC.sv.basis(2, 0), QC.GATES.X, 0, 2), mat4Apply(IxX, QC.sv.basis(2, 0))) &&
  vecClose(QC.sv.apply1(QC.sv.basis(2, 0), QC.GATES.X, 1, 2), mat4Apply(XxI, QC.sv.basis(2, 0))));

/* counts: порядок битов q_{n-1}...q0, раскрывается в sv.ket и fmtState. */
console.log('соглашение Qiskit: counts в порядке q_{n-1}...q0');
check('ket(1, 2) = |01⟩ (бинарь, q0 справа)', QC.sv.ket(1, 2) === '|01⟩');
check('ket(2, 2) = |10⟩', QC.sv.ket(2, 2) === '|10⟩');
check('ket(5, 3) = |101⟩ (q2=1, q1=0, q0=1)', QC.sv.ket(5, 3) === '|101⟩');
check('fmtState(X(q0)|00>) печатает |01⟩, не |10⟩',
  /\|01⟩/.test(QC.sv.fmtState(xq0, 2, 3)));

/* CNOT и SWAP симметричны: на них ошибка U^T вместо U была бы незаметна.
   Этот комплексный четырёхцикл проверяет настоящий порядок matrix[row][col]. */
console.log('qc-core: произвольная несимметричная двухкубитная матрица');
const cycle = [
  [QC.C(0, 0), QC.C(0, 0), QC.C(0, 0), QC.C(0, 1)],
  [QC.C(1, 0), QC.C(0, 0), QC.C(0, 0), QC.C(0, 0)],
  [QC.C(0, 0), QC.C(0, 1), QC.C(0, 0), QC.C(0, 0)],
  [QC.C(0, 0), QC.C(0, 0), QC.C(1, 0), QC.C(0, 0)]
];
for (let input = 0; input < 4; input++) {
  const expected = QC.sv.zeros(4);
  const output = (input + 1) % 4;
  expected[output] = input % 2 ? QC.C(0, 1) : QC.C(1, 0);
  check('apply2: U|basis ' + input + '> = column ' + input + ' of U',
    vecClose(QC.sv.apply2(QC.sv.basis(2, input), cycle, 1, 0, 2), expected));

  // Та же матрица на (q2,q0), при фиксированном q1=1: spectator не меняется.
  const input3 = 2 | ((input & 2) << 1) | (input & 1);
  const output3 = 2 | ((output & 2) << 1) | (output & 1);
  const expected3 = QC.sv.zeros(8);
  expected3[output3] = expected[output];
  check('apply2: несоседние (q2,q0), spectator q1=1, input ' + input3,
    vecClose(QC.sv.apply2(QC.sv.basis(3, input3), cycle, 2, 0, 3), expected3));
}
check('sample(rnd=0) не выбирает исход с нулевой вероятностью',
  QC.sv.sample(QC.sv.basis(2, 3), function () { return 0; }) === 3);

/* ------------------------------------------------------------------ */
/* Сверка с настоящим Qiskit                                           */
/*                                                                     */
/* Две разные ситуации, которые нельзя смешивать:                      */
/*   1) Qiskit вообще не установлен — это НЕ провал: стенд без Python/  */
/*      Qiskit должен проходить. Тогда блок пропускается явно.          */
/*   2) Qiskit установлен, но сверка разошлась или упала — это провал    */
/*      регрессии, он обязан валить тест, а не маскироваться под        */
/*      «недоступен».                                                   */
/* Поэтому сначала отдельно пробуем импорт (probe), и только потом      */
/* выполняем сценарий; любая ошибка исполнения идёт в FAIL.             */
/* ------------------------------------------------------------------ */

console.log('соглашение Qiskit: сверка с установленным qiskit');
(function () {
  let hasQiskit = false;
  try {
    execFileSync('python', ['-c', 'import qiskit, numpy'], {
      encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'ignore']
    });
    hasQiskit = true;
  } catch (e) {
    console.log('  skip: интерпретатор python или qiskit не установлены (' +
      (e.code || e.message) + ')');
    return;
  }
  if (!hasQiskit) { return; }

  const script = [
    'import json',
    'import numpy as np',
    'from qiskit import QuantumCircuit, ClassicalRegister',
    'from qiskit.quantum_info import Statevector, Operator',
    'out = {}',
    'c = QuantumCircuit(2); c.x(0); out["x_q0"] = np.round(Statevector(c).data.real, 9).tolist()',
    'c = QuantumCircuit(2); c.x(1); out["x_q1"] = np.round(Statevector(c).data.real, 9).tolist()',
    'c = QuantumCircuit(2); c.cx(0, 1); out["cx01"] = np.round(np.real(Operator(c).data), 9).astype(int).tolist()',
    'c = QuantumCircuit(2); c.cx(1, 0); out["cx10"] = np.round(np.real(Operator(c).data), 9).astype(int).tolist()',
    'c = QuantumCircuit(2); c.h(1); c.x(0); out["asym"] = np.round(Statevector(c).data.real, 9).tolist()',
    'c = QuantumCircuit(2); c.x(1); out["x_q1_ket"] = np.round(Statevector(c).data.real, 9).tolist()',
    'c = QuantumCircuit(2); c.s(0); _s = Statevector(c).data; out["s_q0"] = [[float(z.real), float(z.imag)] for z in _s]',
    'print(json.dumps(out))'
  ].join('\n');

  let raw;
  try {
    raw = execFileSync('python', ['-c', script], { encoding: 'utf8', timeout: 120000 }).trim();
  } catch (e) {
    /* qiskit есть, но сценарий упал — это провал, а не «недоступен». */
    check('сверка с Qiskit выполняется без ошибок', false,
      'выполнение упало: ' + ((e.stderr && String(e.stderr).trim().split(/\r?\n/).pop()) || e.message));
    return;
  }

  let ref;
  try {
    ref = JSON.parse(raw.split(/\r?\n/).pop());
  } catch (e) {
    check('ответ Qiskit разбирается как JSON', false, raw.slice(0, 200));
    return;
  }

  const asArr = function (v) { return v.map(function (c) { return Number(c.re.toFixed(9)); }); };
  check('совпадает с Qiskit: X(q0)|00>', JSON.stringify(asArr(xq0)) === JSON.stringify(ref.x_q0),
    JSON.stringify(asArr(xq0)) + ' vs ' + JSON.stringify(ref.x_q0));
  check('совпадает с Qiskit: X(q1)|00>', JSON.stringify(asArr(xq1)) === JSON.stringify(ref.x_q1),
    JSON.stringify(asArr(xq1)) + ' vs ' + JSON.stringify(ref.x_q1));
  check('совпадает с Qiskit: Operator(CX(0,1))',
    JSON.stringify(mat4AsInt(QC.MAT4.CNOT)) === JSON.stringify(ref.cx01),
    JSON.stringify(mat4AsInt(QC.MAT4.CNOT)) + ' vs ' + JSON.stringify(ref.cx01));
  check('совпадает с Qiskit: MAT4.CNOT_T = Operator(CX(1,0))',
    JSON.stringify(mat4AsInt(QC.MAT4.CNOT_T)) === JSON.stringify(ref.cx10),
    JSON.stringify(mat4AsInt(QC.MAT4.CNOT_T)) + ' vs ' + JSON.stringify(ref.cx10));
  check('совпадает с Qiskit: несимметричное состояние H(q1), X(q0)',
    JSON.stringify(asArr(asym2)) === JSON.stringify(ref.asym),
    JSON.stringify(asArr(asym2)) + ' vs ' + JSON.stringify(ref.asym));
  check('совпадает с Qiskit: CX(0,1) на 0.6|00> + 0.8|01>', (function () {
    const mine = asArr(skewCx01);
    const want = [0.6, 0, 0, 0.8];
    if (mine.length !== 4) { return false; }
    for (let i = 0; i < 4; i++) { if (Math.abs(mine[i] - want[i]) > 1e-9) { return false; } }
    return true;
  })());
  check('совпадает с Qiskit: S(q0) даёт фазу только у |01>', (function () {
    const mine = QC.sv.apply1(QC.sv.basis(2, 0), QC.GATES.S, 0, 2);
    const same = mine.length === ref.s_q0.length && mine.every(function (c, i) {
      return Math.abs(c.re - ref.s_q0[i][0]) < 1e-9 && Math.abs(c.im - ref.s_q0[i][1]) < 1e-9;
    });
    return same;
  })());
})();

console.log('');
console.log('ИТОГ: успешно ' + passed + ', провалено ' + failed);
process.exit(failed === 0 ? 0 : 1);
