#!/usr/bin/env python3
"""SDK-only snapshot contracts; run: python -B tools/test_snapshot_transpiler.py."""
from contextlib import redirect_stderr, redirect_stdout
from copy import deepcopy
from io import StringIO
import json
from pathlib import Path
import unittest
from unittest.mock import patch

import snapshot_transpiler as snapshot
from qiskit import QuantumCircuit
from qiskit.passmanager import ConditionalController, DoWhileController, FlowControllerLinear
from qiskit.quantum_info import Operator
from qiskit.transpiler import generate_preset_pass_manager
from qiskit.transpiler.basepasses import AnalysisPass

REFERENCE = Path(__file__).parent / "fixtures" / "transpiler-2.6.0.json"


class First(AnalysisPass):
    def run(self, dag):
        pass


class Second(First):
    def name(self):
        return "public-name"


def rehash(value):
    value["structure_sha256"] = snapshot.fingerprint(snapshot.structure(value))
    value["target_sha256"] = snapshot.fingerprint(value["target"])
    return value


class SnapshotTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.reference = json.loads(REFERENCE.read_text(encoding="utf-8"))
        cls.actual = snapshot.snapshot_transpiler()

    def changed(self):
        value = deepcopy(self.reference)
        value["profiles"]["automatic"]["levels"][0][0]["tasks"]["linear"][0] = "ChangedPass"
        return rehash(value)

    def test_recursive_controllers_preserve_order_duplicates_and_public_name(self):
        def predicate(_):
            raise AssertionError("Snapshot must never execute predicates")
        task = FlowControllerLinear([
            First(), ConditionalController([
                DoWhileController([Second(), First(), First()], do_while=predicate),
                FlowControllerLinear([])], condition=predicate)])
        self.assertEqual(snapshot.normalize_task(task), {
            "linear": ["First", {"if": [{"do_while": ["public-name", "First", "First"]},
                                       {"linear": []}]}]})

    def test_unsupported_task_and_controller_subclass_raise(self):
        class CustomController(FlowControllerLinear):
            pass
        for task in (object(), CustomController([])):
            with self.subTest(task=type(task).__name__), self.assertRaisesRegex(TypeError, "Unsupported"):
                snapshot.normalize_task(task)

    def test_canonical_mapping_order_but_task_order_matters(self):
        self.assertEqual(snapshot.fingerprint({"a": 1, "b": 2}),
                         snapshot.fingerprint({"b": 2, "a": 1}))
        self.assertNotEqual(snapshot.fingerprint(["First", "Second"]),
                            snapshot.fingerprint(["Second", "First"]))
        self.assertNotEqual(snapshot.fingerprint({"linear": []}), snapshot.fingerprint(None))
        self.assertNotEqual(snapshot.fingerprint({"if": []}), snapshot.fingerprint({"do_while": []}))

    def test_fixture_reproducible_and_matches_reference_with_version_policy(self):
        self.assertEqual(self.actual, snapshot.snapshot_transpiler())
        code, messages = snapshot.compare_snapshots(self.reference, self.actual, allow_version_drift=True)
        self.assertEqual(code, 0, "\n".join(messages))
        self.assertEqual(json.loads(snapshot.format_snapshot(self.actual)), self.actual)

    def test_target_has_fixed_properties_and_parameterized_delay(self):
        target = snapshot.make_target_fixture()
        self.assertEqual(snapshot.describe_target(target), self.reference["target"])
        self.assertIsNone(target.qubit_properties)
        self.assertTrue(all(prop is None for prop in target["delay"].values()))
        self.assertEqual(target["rz"][(0,)].duration, 0.0)
        self.assertEqual(target["cx"][(0, 1)].error, 0.01)

    def test_same_identity_mismatch_fails_even_with_drift_flag(self):
        for allow in (False, True):
            code, messages = snapshot.compare_snapshots(self.reference, self.changed(), allow)
            self.assertEqual(code, 1)
            self.assertIn("profiles/automatic/0/0/tasks/linear/0", "\n".join(messages))
            self.assertIn("ChangedPass", "\n".join(messages))

    def test_version_drift_requires_flag_and_supported_range(self):
        changed = self.changed()
        changed["provenance"]["qiskit"] = "2.6.1"
        self.assertEqual(snapshot.compare_snapshots(self.reference, changed)[0], 1)
        code, messages = snapshot.compare_snapshots(self.reference, changed, True)
        self.assertEqual(code, 0)
        self.assertIn("WARNING: transpiler snapshot changed", messages[0])
        changed["provenance"]["qiskit"] = "2.7.0"
        self.assertEqual(snapshot.compare_snapshots(self.reference, changed, True)[0], 1)

    def test_provenance_change_does_not_change_structure_hash(self):
        changed = deepcopy(self.reference)
        changed["provenance"]["qiskit"] = "2.6.1"
        self.assertEqual(snapshot.fingerprint(snapshot.structure(changed)), changed["structure_sha256"])
        code, messages = snapshot.compare_snapshots(self.reference, changed, True)
        self.assertEqual(code, 0)
        self.assertIn("configured task trees match", messages[0])

    def test_input_difference_is_not_treated_as_sdk_drift(self):
        changed = deepcopy(self.reference)
        changed["provenance"]["qiskit"] = "2.6.1"
        changed["target"]["dt"] = 1e-9
        code, messages = snapshot.compare_snapshots(self.reference, rehash(changed), True)
        self.assertEqual(code, 1)
        self.assertIn("Target differs", messages[0])

    def test_malformed_fixture_rejected_even_in_advisory_mode(self):
        variants = []
        bad = deepcopy(self.reference)
        bad["structure_sha256"] = "incorrect"
        variants.append(bad)
        bad = deepcopy(self.reference)
        bad["profiles"]["automatic"]["levels"][0][0]["tasks"] = {"unknown": []}
        variants.append(rehash(bad))
        bad = deepcopy(self.reference)
        bad["profiles"]["automatic"]["config"]["layout_method"] = "default"
        variants.append(bad)
        for bad in variants:
            with self.subTest(bad=bad["structure_sha256"]), self.assertRaisesRegex(ValueError, "Malformed"):
                snapshot.compare_snapshots(bad, self.actual, True)

    def test_cli_check_paths_without_writing_reference(self):
        # Exercise CLI positive, negative, malformed and API-error paths in memory.
        cases = [(self.reference, self.reference, [], 0, "OK:"),
                 (self.reference, self.changed(), [], 1, "snapshot changed"),
                 ({}, self.reference, ["--allow-version-drift"], 1, "Malformed snapshot")]
        latest = self.changed()
        latest["provenance"]["qiskit"] = "2.6.1"
        cases.append((self.reference, latest, ["--allow-version-drift"], 0, "WARNING:"))
        for expected, observed, flags, wanted, text in cases:
            stdout, stderr = StringIO(), StringIO()
            with patch.object(Path, "read_text", return_value=json.dumps(expected)), \
                    patch.object(snapshot, "snapshot_transpiler", return_value=observed), \
                    redirect_stdout(stdout), redirect_stderr(stderr):
                code = snapshot.main(["--check", str(REFERENCE), *flags])
            self.assertEqual(code, wanted)
            self.assertIn(text, stdout.getvalue() + stderr.getvalue())
        with patch.object(snapshot, "snapshot_transpiler", side_effect=TypeError("Unsupported controller")), \
                redirect_stderr(StringIO()) as error:
            self.assertEqual(snapshot.main(["--check", str(REFERENCE), "--allow-version-drift"]), 1)
        self.assertIn("Unsupported controller", error.getvalue())

    def test_transpile_small_unitaries_valid_for_target_and_layout_equivalent(self):
        target = snapshot.make_target_fixture()
        for n in (2, 3):
            source = QuantumCircuit(n, global_phase=0.17)
            source.h(0)
            source.ry(0.37, 1)
            source.cx(0, 1)
            if n == 3:
                source.ccx(0, 1, 2)
                source.rz(-0.29, 2)
            padded = QuantumCircuit(5)
            padded.compose(source, range(n), inplace=True)
            for profile in snapshot.PROFILES:
                for level in range(4):
                    with self.subTest(qubits=n, profile=profile, level=level):
                        pm = generate_preset_pass_manager(
                            optimization_level=level, target=target,
                            initial_layout=[4, 0, 2][:n], **snapshot.configuration(profile))
                        output = pm.run(source)
                        for instruction in output.data:
                            qargs = tuple(output.find_bit(q).index for q in instruction.qubits)
                            self.assertTrue(target.instruction_supported(
                                operation_name=instruction.operation.name, qargs=qargs))
                        self.assertTrue(Operator.from_circuit(output).equiv(Operator(padded)))


if __name__ == "__main__":
    unittest.main(verbosity=2)
