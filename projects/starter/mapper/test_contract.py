#!/usr/bin/env python3
"""Harness self-tests; reference routing is loaded only from existing lab Markdown."""
from __future__ import annotations

import ast
import importlib.util
from pathlib import Path
import subprocess
import sys
import unittest

from qiskit import QuantumCircuit
from qiskit.transpiler import CouplingMap

from check_solution import check_case, check_rejection, run_contract


def load_reference():
    root = Path(__file__).resolve().parents[3]
    spec = importlib.util.spec_from_file_location("course_example_blocks",
                                                root / "tools/example_blocks.py")
    blocks = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(blocks)
    path = root / "curriculum/04-systems-design/lab-05-sabre-routing.md"
    nodes = []
    for _, source in blocks.iter_python_blocks(path.read_text(encoding="utf-8"), str(path)):
        body = ast.parse(source).body
        if not any(isinstance(node, ast.FunctionDef) and node.name == "greedy_route"
                   for node in body):
            continue
        nodes.extend(node for node in body
                     if isinstance(node, (ast.Import, ast.ImportFrom))
                     or isinstance(node, ast.FunctionDef)
                     and node.name in {"bfs_path", "greedy_route"})
    names = [node.name for node in nodes if isinstance(node, ast.FunctionDef)]
    if sorted(names) != ["bfs_path", "greedy_route"]:
        raise AssertionError("Expected exactly the two named lab reference functions")
    namespace = {}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(path), "exec"), namespace)

    def reference(qc, cm, seed):
        # The lab also handles measurement/reset; restrict this test-only adapter
        # to the starter's smaller unitary domain. No routing algorithm here.
        if qc.num_clbits or qc.parameters or any(
                inst.operation.name in {"reset", "barrier", "delay"}
                for inst in qc.data):
            raise ValueError("Starter domain is static unitary 1q/2q")
        routed, _, phys = namespace["greedy_route"](qc, cm)
        return routed, phys

    return reference


class HarnessTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.reference = staticmethod(load_reference())

    def test_reference_passes_entire_contract(self):
        self.assertEqual(run_contract(self.reference), 33)

    def test_global_phase_is_allowed(self):
        def phased(qc, cm, seed):
            routed, phys = self.reference(qc, cm, seed)
            routed.global_phase += 0.61
            return routed, phys
        self.assertEqual(run_contract(phased), 33)

    def test_cli_requires_explicit_module(self):
        result = subprocess.run(
            [sys.executable, "-B", str(Path(__file__).with_name("check_solution.py"))],
            capture_output=True, text=True, timeout=30)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("--module", result.stderr)
        self.assertNotIn("contract passed", result.stdout)

    def test_cli_missing_module_is_failure(self):
        result = subprocess.run(
            [sys.executable, "-B", str(Path(__file__).with_name("check_solution.py")),
             "--module", "_qc_nonexistent_student_solution_6c82"],
            capture_output=True, text=True, timeout=30)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("ModuleNotFoundError", result.stderr)
        self.assertNotIn("contract passed", result.stdout)

    def test_missing_router_is_not_skipped(self):
        with self.assertRaisesRegex(AssertionError, "callable"):
            run_contract(None)

    def test_no_routing_is_rejected(self):
        qc = QuantumCircuit(3)
        qc.cx(0, 2)
        with self.assertRaisesRegex(AssertionError, "outside coupling"):
            check_case(lambda q, cm, s: (q.copy(), [0, 1, 2]), qc,
                       CouplingMap.from_line(3))

    def test_lost_gate_is_rejected(self):
        qc = QuantumCircuit(2)
        qc.h(0)
        with self.assertRaisesRegex(AssertionError, "semantics"):
            check_case(lambda q, cm, s: (QuantumCircuit(2), [0, 1]), qc,
                       CouplingMap.from_line(2))

    def test_wrong_mapping_is_rejected(self):
        qc = QuantumCircuit(2)
        qc.h(0)
        with self.assertRaisesRegex(AssertionError, "semantics"):
            check_case(lambda q, cm, s: (q.copy(), [1, 0]), qc,
                       CouplingMap.from_line(2))

    def test_duplicate_mapping_is_rejected(self):
        with self.assertRaisesRegex(AssertionError, "injective"):
            check_case(lambda q, cm, s: (q.copy(), [0, 0]), QuantumCircuit(2),
                       CouplingMap.from_line(2))

    def test_relative_column_phases_are_rejected(self):
        def bad(qc, cm, seed):
            routed = qc.copy()
            routed.z(0)
            return routed, [0, 1]
        with self.assertRaisesRegex(AssertionError, "common phase"):
            check_case(bad, QuantumCircuit(2), CouplingMap.from_line(2))

    def test_dirty_ancilla_is_rejected(self):
        def bad(qc, cm, seed):
            out = QuantumCircuit(3)
            out.x(2)
            return out, [0, 1]
        with self.assertRaisesRegex(AssertionError, "semantics"):
            check_case(bad, QuantumCircuit(2), CouplingMap.from_line(3))

    def test_nonunitary_output_is_rejected(self):
        def bad(qc, cm, seed):
            out = qc.copy()
            out.reset(0)
            return out, [0, 1]
        with self.assertRaisesRegex(AssertionError, "static unitary"):
            check_case(bad, QuantumCircuit(2), CouplingMap.from_line(2))

    def test_input_mutation_is_rejected(self):
        def bad(qc, cm, seed):
            qc.x(0)
            return qc.copy(), [0, 1]
        with self.assertRaisesRegex(AssertionError, "mutated"):
            check_case(bad, QuantumCircuit(2), CouplingMap.from_line(2))

    def test_graph_mutation_is_rejected(self):
        def bad(qc, cm, seed):
            cm.add_physical_qubit(2)
            return QuantumCircuit(3), [0, 1]
        with self.assertRaisesRegex(AssertionError, "mutated"):
            check_case(bad, QuantumCircuit(2), CouplingMap.from_line(2))

    def test_nonrepeatable_output_is_rejected(self):
        calls = 0

        def bad(qc, cm, seed):
            nonlocal calls
            calls += 1
            out = qc.copy()
            out.global_phase = calls * 0.1
            return out, [0, 1]
        with self.assertRaisesRegex(AssertionError, "reproduce"):
            check_case(bad, QuantumCircuit(2), CouplingMap.from_line(2))

    def test_silent_invalid_input_acceptance_is_rejected(self):
        qc = QuantumCircuit(3)
        qc.ccx(0, 1, 2)
        with self.assertRaisesRegex(AssertionError, "raise ValueError"):
            check_rejection(lambda q, cm, s: (q.copy(), [0, 1, 2]), qc,
                            CouplingMap.from_line(3))


if __name__ == "__main__":
    unittest.main()
