/*
 * Тесты общей библиотеки qc-core.js.
 *
 * Запуск:  node tools/js/qc-core.test.js
 *
 * Проверяются операции над вектором состояния, матрицы гейтов,
 * преобразование Блоха и статистику измерения. Никаких зависимостей.
 */
'use strict';

const fs = require('fs');
const path = require('path');

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

console.log('qc-core: повороты Расбека');
const rz = QC.GATES.rz(Math.PI);
const rzOut = QC.sv.apply1(QC.sv.basis(1, 0), rz, 0, 1);
check('Rz(pi)|0> = -i|0> (глобальная фаза)', vecClose(rzOut, [QC.C(0, -1), QC.C(0, 0)], 1e-12));
const ryOut = QC.sv.apply1(QC.sv.basis(1, 0), QC.GATES.ry(Math.PI), 0, 1);
check('Ry(pi)|0> = |1>', vecClose(ryOut, [QC.C(0, 0), QC.C(1, 0)], 1e-12));

console.log('qc-core: два кубита');
let bell = QC.sv.kron(QC.sv.basis(1, 0), QC.sv.basis(1, 0));
bell = QC.sv.apply1(bell, QC.GATES.H, 0, 2);
bell = QC.sv.apply2(bell, QC.MAT4.CNOT, 0, 1, 2);
check(
  'H + CNOT дают (|00>+|11>)/sqrt(2)',
  vecClose(bell, [QC.C(S, 0), QC.C(0, 0), QC.C(0, 0), QC.C(S, 0)])
);
let probs = QC.sv.probs(bell);
check('вероятности Bell-состояния: 0.5 / 0 / 0 / 0.5', close(probs[0], 0.5) && close(probs[3], 0.5) && close(probs[1], 0) && close(probs[2], 0));
let swapped = QC.sv.apply2(bell, QC.MAT4.SWAP, 0, 1, 2);
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

console.log('');
console.log('ИТОГ: успешно ' + passed + ', провалено ' + failed);
process.exit(failed === 0 ? 0 : 1);
