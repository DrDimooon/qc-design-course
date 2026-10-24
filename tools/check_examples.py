#!/usr/bin/env python3
"""Offline smoke tests, including actual Markdown blocks marked '# qc: executable'.

Run from any directory: python -X utf8 tools/check_examples.py
Install requirements-lock.txt first. No IBM credentials, QPU jobs or optional
chemistry/QEC packages are used. This is deliberately NOT coverage of every
Python fragment: exercises, partial snippets and QPU examples are not executable.
Each marked block runs in a fresh process (90-second timeout) and must assert
its numerical contract. Discovery/failure-path tests: tools/test_example_blocks.py.
"""
from __future__ import annotations

import ast
from collections import Counter
import os
from pathlib import Path
import subprocess
import sys
import unittest
import warnings

from example_blocks import iter_python_blocks, marked_python_blocks

# Set before importing numerical libraries (also fixed explicitly in CI).
os.environ.setdefault("QISKIT_NUM_PROCS", "1")
os.environ.setdefault("RAYON_NUM_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")

import numpy as np
import qiskit
from qiskit import ClassicalRegister, QuantumCircuit, QuantumRegister
from qiskit.quantum_info import Operator, SparsePauliOp, Statevector

ROOT = Path(__file__).resolve().parent.parent
REQUIRED_EXAMPLES = {
    "CONVENTIONS.md": 1,
    "curriculum/00-fundamentals/lab-00-env-setup.md": 1,
    "curriculum/02-programming/lab-02-first-circuit.md": 3,
    "curriculum/02-programming/lab-03-ibm-quantum-run.md": 1,
    "curriculum/03-algorithms/02-qft-shor.md": 1,
    "curriculum/04-systems-design/02-transpiler-internals.md": 2,
    "curriculum/04-systems-design/lab-04-platform-comparison.md": 2,
    "curriculum/04-systems-design/lab-05-sabre-routing.md": 1,
    "curriculum/05-hardware/05-benchmarking.md": 1,
    "projects/03-vqe-h2.md": 1,
    "tests/answers/final.md": 1,
}


def python_blocks(path: Path):
    yield from iter_python_blocks(path.read_text(encoding="utf-8"), str(path))


def marked_blocks():
    paths = [ROOT / "CONVENTIONS.md"]
    for directory in ("curriculum", "projects", "tests"):
        paths.extend(sorted((ROOT / directory).rglob("*.md")))
    for path in paths:
        for line, source in marked_python_blocks(path.read_text(encoding="utf-8"), str(path)):
            yield path, line, source


class CourseContracts(unittest.TestCase):
    def test_qubit_weights_and_kron(self):
        for n in (2, 3):
            for q in range(n):
                circuit = QuantumCircuit(n)
                circuit.x(q)
                expected = np.eye(2**n)[2**q]
                np.testing.assert_allclose(Statevector(circuit).data, expected)
        np.testing.assert_allclose(Statevector.from_label("01").data, np.kron([1, 0], [0, 1]))

    def test_both_cnot_directions_on_every_basis_state(self):
        for control, target in ((0, 1), (1, 0)):
            gate = QuantumCircuit(2)
            gate.cx(control, target)
            for index in range(4):
                state = Statevector.from_int(index, 4).evolve(gate)
                wanted = index ^ ((1 << target) if (index >> control) & 1 else 0)
                np.testing.assert_allclose(state.data, np.eye(4)[wanted])

    def test_counts_follow_classical_mapping_not_qubit_names(self):
        from qiskit.primitives import StatevectorSampler
        circuit = QuantumCircuit(2, 2)
        circuit.x(0)
        circuit.measure([0, 1], [1, 0])
        result = StatevectorSampler(seed=7).run([circuit], shots=32).result()[0]
        self.assertEqual(result.data.c.get_counts(), {"10": 32})

    def test_multiple_classical_register_order(self):
        from qiskit_aer import AerSimulator
        q = QuantumRegister(2, "q")
        a, b = ClassicalRegister(1, "a"), ClassicalRegister(1, "b")
        circuit = QuantumCircuit(q, a, b)
        circuit.x(0)
        circuit.measure(0, a[0])
        circuit.measure(1, b[0])
        result = AerSimulator(seed_simulator=7).run(circuit, shots=16).result()
        self.assertEqual(result.get_counts(), {"0 1": 16})

    def test_qec_syndromes_in_canonical_order(self):
        stabilizers = (SparsePauliOp("ZZI"), SparsePauliOp("IZZ"))
        for qubit, syndrome in ((2, (-1, 1)), (1, (-1, -1)), (0, (1, -1))):
            circuit = QuantumCircuit(3)
            circuit.x(qubit)
            state = Statevector(circuit)
            actual = tuple(int(state.expectation_value(s).real) for s in stabilizers)
            self.assertEqual(actual, syndrome)

    def test_functional_api_without_deprecations(self):
        from qiskit.circuit.library import ModularAdderGate, efficient_su2, qaoa_ansatz, quantum_volume
        from qiskit.circuit.random import random_circuit
        ansatz = efficient_su2(2, reps=2)
        self.assertEqual(ansatz.num_parameters, 12)
        self.assertEqual(qaoa_ansatz(SparsePauliOp("ZZ"), reps=2).num_parameters, 4)
        self.assertEqual(quantum_volume(3, depth=2, seed=7).num_qubits, 3)
        self.assertEqual(random_circuit(3, depth=2, max_operands=2, seed=7).num_qubits, 3)
        self.assertEqual(ModularAdderGate(4).num_qubits, 8)

    def test_qft_swap_option_is_not_ignored(self):
        from qiskit.circuit.library import QFTGate
        from qiskit.synthesis.qft import synth_qft_full
        full = Operator(QFTGate(3))
        self.assertTrue(full.equiv(Operator(synth_qft_full(3, do_swaps=True))))
        self.assertFalse(full.equiv(Operator(synth_qft_full(3, do_swaps=False))))

    def test_capstone_metrics_from_actual_markdown(self):
        path = ROOT / "projects/01-transpiler-benchmark.md"
        functions = [node for _, source in python_blocks(path) for node in ast.parse(source).body
                     if isinstance(node, ast.FunctionDef) and node.name == "metrics"]
        self.assertEqual(len(functions), 1)
        namespace = {}
        exec(compile(ast.Module(body=functions, type_ignores=[]), str(path), "exec"), namespace)
        circuit = QuantumCircuit(3)
        circuit.h(0)
        circuit.cx(0, 1)
        circuit.swap(1, 2)
        circuit.ccx(0, 1, 2)
        metrics = namespace["metrics"](circuit)
        self.assertEqual(metrics["2q"], 2)
        self.assertEqual(metrics["nonlocal"], 3)

    def test_compiler_exit_inputs_allow_all_twenty_valid_runs(self):
        from qiskit.transpiler import generate_preset_pass_manager
        path = ROOT / "tests/compiler-exit-exam.md"
        inputs = [source for _, source in python_blocks(path)
                  if "SEEDS = (" in source and "def make_target(" in source]
        self.assertEqual(len(inputs), 1)
        namespace = {}
        exec(compile(inputs[0], str(path), "exec"), namespace)
        source = namespace["qc"]
        seen = set()
        for name, target in namespace["targets"].items():
            for level in namespace["LEVELS"]:
                for seed in namespace["SEEDS"]:
                    with self.subTest(target=name, level=level, seed=seed):
                        pm = generate_preset_pass_manager(
                            optimization_level=level, target=target,
                            initial_layout=[0, 1, 2, 3], seed_transpiler=seed)
                        output = pm.run(source)
                        self.assertEqual(output.num_qubits, 4)
                        for instruction in output.data:
                            qargs = tuple(output.find_bit(q).index for q in instruction.qubits)
                            self.assertTrue(target.instruction_supported(
                                operation_name=instruction.operation.name, qargs=qargs,
                                parameters=instruction.operation.params))
                        self.assertTrue(Operator.from_circuit(output).equiv(Operator(source)))
                        self.assertEqual(sorted(output.layout.final_index_layout()), list(range(4)))
                        seen.add((name, level, seed))
        self.assertEqual(len(seen), 20)

    def test_duration_units_are_explicit(self):
        from qiskit_ibm_runtime.fake_provider import FakeSherbrooke
        backend = FakeSherbrooke()
        ticks = backend.instruction_durations.get("x", (0,), unit="dt")
        seconds = backend.instruction_durations.get("x", (0,), unit="s")
        self.assertAlmostEqual(ticks * backend.dt, seconds)
        self.assertAlmostEqual(seconds, backend.target["x"][(0,)].duration)

    def test_vqe_noise_model_reaches_the_estimator(self):
        from qiskit.circuit.library import efficient_su2
        from qiskit_aer.primitives import EstimatorV2
        path = ROOT / "projects/03-vqe-h2.md"
        blocks = list(python_blocks(path))
        hamiltonian_blocks = [source for _, source in blocks if "H = SparsePauliOp.from_list([" in source]
        noisy_blocks = [source for _, source in blocks if "noise = NoiseModel()" in source]
        self.assertEqual(len(hamiltonian_blocks), 1)
        self.assertEqual(len(noisy_blocks), 1)
        namespace = {"ansatz": efficient_su2(2, reps=2)}
        exec(compile(hamiltonian_blocks[0], str(path), "exec"), namespace)
        exec(compile(noisy_blocks[0], str(path), "exec"), namespace)
        estimator = namespace["est"]
        self.assertIs(estimator.options.backend_options["noise_model"], namespace["noise"])
        circuit, observable = namespace["tqc"], namespace["Ht"]
        noisy = float(estimator.run([(circuit, observable)], precision=0.0).result()[0].data.evs)
        ideal_estimator = EstimatorV2(options={"backend_options": {"method": "density_matrix"}})
        ideal = float(ideal_estimator.run([(circuit, observable)], precision=0.0).result()[0].data.evs)
        reference = float(Statevector(namespace["bound"]).expectation_value(namespace["H"]).real)
        self.assertAlmostEqual(ideal, reference, places=10)
        self.assertGreater(abs(noisy - ideal), 1e-4)

    def test_all_marked_blocks_contain_assertions(self):
        blocks = list(marked_blocks())
        counts = Counter(path.relative_to(ROOT).as_posix() for path, _, _ in blocks)
        for path, minimum in REQUIRED_EXAMPLES.items():
            self.assertGreaterEqual(counts[path], minimum, f"Required Markdown examples disappeared: {path}")
        for path, _, source in blocks:
            self.assertTrue(any(isinstance(node, ast.Assert) for node in ast.walk(ast.parse(source))),
                            f"{path}: executable block needs an assert, not only print()")

    def test_greedy_router_operators_on_small_corpus(self):
        from qiskit.circuit.random import random_circuit
        from qiskit.transpiler import CouplingMap
        path = ROOT / "curriculum/04-systems-design/lab-05-sabre-routing.md"
        nodes = [node for _, source in python_blocks(path) for node in ast.parse(source).body
                 if isinstance(node, (ast.Import, ast.ImportFrom, ast.FunctionDef))]
        namespace = {}
        exec(compile(ast.Module(body=nodes, type_ignores=[]), str(path), "exec"), namespace)
        for n in (2, 3, 4):
            for seed in (7, 11, 42):
                with self.subTest(qubits=n, seed=seed):
                    circuit = random_circuit(n, depth=5, max_operands=2, seed=seed)
                    circuit.global_phase = 0.37
                    namespace["assert_unitary_routing"](circuit, CouplingMap.from_line(n))

    def test_greedy_router_with_unused_physical_qubit(self):
        from qiskit.transpiler import CouplingMap
        path = ROOT / "curriculum/04-systems-design/lab-05-sabre-routing.md"
        nodes = [node for _, source in python_blocks(path) for node in ast.parse(source).body
                 if isinstance(node, (ast.Import, ast.ImportFrom, ast.FunctionDef))]
        namespace = {}
        exec(compile(ast.Module(body=nodes, type_ignores=[]), str(path), "exec"), namespace)
        # Logical q0/q1 start on physical 0/1, but only 0--2--1 is connected.
        cm = CouplingMap([[0, 2], [2, 0], [2, 1], [1, 2]])
        circuit = QuantumCircuit(2, global_phase=-0.29)
        circuit.h(0)
        circuit.ry(0.71, 1)
        circuit.cx(0, 1)
        circuit.swap(0, 1)
        circuit.rz(0.33, 0)
        routed, swaps, phys = namespace["greedy_route"](circuit, cm)
        self.assertGreater(swaps, 0)
        for initial in range(4):
            preparation = QuantumCircuit(3)
            for q in range(2):
                if (initial >> q) & 1:
                    preparation.x(q)
            actual = Statevector(preparation.compose(routed)).data
            logical = Statevector.from_int(initial, 4).evolve(circuit).data
            expected = np.zeros(8, dtype=complex)
            for index, amplitude in enumerate(logical):
                mapped = sum(((index >> q) & 1) << phys[q] for q in range(2))
                expected[mapped] = amplitude
            np.testing.assert_allclose(actual, expected, atol=1e-12, rtol=0)


class MarkdownExamples(unittest.TestCase):
    """Actual source, not a copied test-only version of each example."""


def make_example_test(path: Path, line: int):
    def test(self):
        try:
            child = subprocess.run(
                [sys.executable, "-X", "utf8", str(ROOT / "tools/example_blocks.py"), str(path), str(line)],
                cwd=ROOT, capture_output=True, text=True, encoding="utf-8", timeout=90,
            )
        except subprocess.TimeoutExpired as error:
            self.fail(f"{path}:{line}: example exceeded 90 seconds: {error}")
        self.assertEqual(child.returncode, 0,
                         f"{path}:{line}\n{child.stdout}\n{child.stderr}")
    test.__doc__ = f"{path.relative_to(ROOT).as_posix()}:{line}"
    return test


for number, (file, first_line, _) in enumerate(marked_blocks(), 1):
    setattr(MarkdownExamples, f"test_marked_{number:02d}", make_example_test(file, first_line))


if __name__ == "__main__":
    from importlib.metadata import version
    print(f"Qiskit {qiskit.__version__}, Aer {version('qiskit-aer')}, Runtime {version('qiskit-ibm-runtime')}", flush=True)
    warnings.simplefilter("error", DeprecationWarning)
    unittest.main(verbosity=2)
