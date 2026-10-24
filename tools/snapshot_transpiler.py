#!/usr/bin/env python3
"""Snapshot configured preset task trees, not a trace of executed passes.

Default output is JSON on stdout. --check never modifies the reference file.
Only public APIs are inspected; predicates, pass budgets and runtime are omitted.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys

# Set before SDK/numerical imports, including when imported by the unit tests.
for _variable in ("QISKIT_NUM_PROCS", "RAYON_NUM_THREADS", "OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS"):
    os.environ[_variable] = "1"

import qiskit
from qiskit.passmanager import ConditionalController, DoWhileController, FlowControllerLinear
from qiskit.providers.fake_provider import GenericBackendV2
from qiskit.transpiler import CouplingMap, InstructionProperties, generate_preset_pass_manager
from qiskit.transpiler.basepasses import BasePass

SCHEMA = 1
FIXTURE_ID = "generic-line5-fixed-v1"
STAGES = ("init", "layout", "routing", "translation", "optimization", "scheduling")
METHODS = tuple(f"{stage}_method" for stage in STAGES)
PROFILES = ("automatic", "explicit-default")
THREADS = {name: "1" for name in
           ("QISKIT_NUM_PROCS", "RAYON_NUM_THREADS", "OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS")}


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


def fingerprint(value):
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def format_snapshot(value, depth=0):
    """Readable JSON with compact task subtrees/placement entries."""
    if depth >= 5 or not isinstance(value, (dict, list)) or not value:
        return json.dumps(value, allow_nan=False)
    if isinstance(value, dict):
        entries = [json.dumps(key) + ": " + format_snapshot(item, depth + 1)
                   for key, item in value.items()]
        opening, closing = "{", "}"
    else:
        entries = [format_snapshot(item, depth + 1) for item in value]
        opening, closing = "[", "]"
    return opening + "\n" + ",\n".join("  " * (depth + 1) + e for e in entries) + "\n" + "  " * depth + closing


def make_target_fixture():
    """Small public-API Target with no randomly generated calibrations."""
    target = GenericBackendV2(
        5, basis_gates=["id", "rz", "sx", "x", "cx"],
        coupling_map=CouplingMap.from_line(5), control_flow=False,
        dt=2e-9, seed=42, noise_info=False,
    ).target
    # Durations are seconds, all exact multiples of dt. Delay stays parameterized
    # with None properties; it has no single fixed duration/error to describe.
    properties = {"id": (4e-8, 1e-4), "rz": (0.0, 0.0), "sx": (4e-8, 1e-4),
                  "x": (8e-8, 2e-4), "cx": (4e-7, 0.01),
                  "reset": (1e-6, 0.0), "measure": (1e-6, 0.02)}
    for name, (duration, error) in properties.items():
        for qargs in target[name]:
            target.update_instruction_properties(
                name, qargs, InstructionProperties(duration=duration, error=error))
    return target


def describe_target(target):
    """Canonical public Target data for this fixed, parameterized-gate fixture."""
    instructions = []
    for name in sorted(target.operation_names):
        operation = target.operation_from_name(name)
        params = []
        for param in operation.params:
            # Parameter names, not UUIDs/repr, describe these standard gates.
            params.append({"parameter": param.name} if hasattr(param, "name") else float(param))
        placements = []
        for qargs, prop in sorted(target[name].items(), key=lambda item: item[0]):
            placements.append([list(qargs), None if prop is None else
                               {"duration": prop.duration, "error": prop.error}])
        instructions.append({"name": name, "num_qubits": operation.num_qubits,
                             "params": params, "placements": placements})
    constraints = target.timing_constraints()
    return {"num_qubits": target.num_qubits, "dt": target.dt,
            "qubit_properties": None if target.qubit_properties is None else [
                {"t1": p.t1, "t2": p.t2, "frequency": p.frequency}
                for p in target.qubit_properties],
            "timing_constraints": {name: getattr(constraints, name) for name in
                                   ("granularity", "min_length", "pulse_alignment", "acquire_alignment")},
            "instructions": instructions}


def normalize_task(task):
    """Retain controller boundaries/order, even empty and repeated tasks."""
    controllers = {FlowControllerLinear: "linear", ConditionalController: "if",
                   DoWhileController: "do_while"}
    # Exact types: a subclass may have semantics that this schema cannot express.
    if type(task) in controllers:
        return {controllers[type(task)]: [normalize_task(child) for child in task.tasks]}
    if isinstance(task, BasePass):
        return task.name()
    raise TypeError(f"Unsupported task/controller: {type(task).__name__}")


def configuration(profile):
    if profile not in PROFILES:
        raise ValueError(f"Unknown profile: {profile}")
    return {**{method: None if profile == "automatic" else "default" for method in METHODS},
            "seed_transpiler": 7, "unitary_synthesis_method": "default",
            "approximation_degree": 1.0, "qubits_initially_zero": True}


def snapshot_transpiler():
    target = make_target_fixture()
    descriptor = describe_target(target)
    profiles = {}
    for profile in PROFILES:
        config = configuration(profile)
        levels = []
        for level in range(4):
            pm = generate_preset_pass_manager(optimization_level=level, target=target, **config)
            if tuple(pm.stages) != STAGES:
                raise ValueError(f"Unsupported preset stages: {pm.stages}")
            def tree(name):
                manager = getattr(pm, name)
                return None if manager is None else normalize_task(manager.to_flow_controller())
            levels.append([{"name": stage, "pre": tree(f"pre_{stage}"),
                            "tasks": tree(stage), "post": tree(f"post_{stage}")}
                           for stage in STAGES])
        profiles[profile] = {"config": config, "levels": levels}
    result = {"schema": SCHEMA, "fixture_id": FIXTURE_ID,
              "provenance": {"qiskit": qiskit.__version__, "threads": THREADS},
              "target": descriptor, "target_sha256": fingerprint(descriptor), "profiles": profiles}
    result["structure_sha256"] = fingerprint(structure(result))
    return result


def structure(snapshot):
    return {name: entry["levels"] for name, entry in snapshot["profiles"].items()}


def validate_snapshot(value):
    """Strict schema/integrity validation: malformed references cannot pass."""
    def require(condition, message):
        if not condition:
            raise ValueError(f"Malformed snapshot: {message}")

    def tree(node):
        if isinstance(node, str):
            require(bool(node), "empty pass name")
        else:
            require(isinstance(node, dict) and len(node) == 1, "invalid task node")
            key = next(iter(node))
            require(key in ("linear", "if", "do_while") and isinstance(node[key], list),
                    "invalid controller")
            for child in node[key]:
                tree(child)

    require(isinstance(value, dict), "expected object")
    require(set(value) == {"schema", "fixture_id", "provenance", "target", "target_sha256",
                           "profiles", "structure_sha256"}, "header keys")
    require(value["schema"] == SCHEMA and value["fixture_id"] == FIXTURE_ID, "schema/fixture ID")
    provenance = value["provenance"]
    require(isinstance(provenance, dict) and set(provenance) == {"qiskit", "threads"}, "provenance")
    require(isinstance(provenance["qiskit"], str) and bool(provenance["qiskit"]), "SDK version")
    require(provenance["threads"] == THREADS, "thread configuration")
    require(isinstance(value["target"], dict) and
            fingerprint(value["target"]) == value["target_sha256"], "Target integrity")
    require(isinstance(value["profiles"], dict) and set(value["profiles"]) == set(PROFILES), "profiles")
    for name, profile in value["profiles"].items():
        require(isinstance(profile, dict) and set(profile) == {"config", "levels"}, "profile keys")
        require(profile["config"] == configuration(name), "profile configuration")
        require(isinstance(profile["levels"], list) and len(profile["levels"]) == 4, "levels 0-3")
        for stages in profile["levels"]:
            require(isinstance(stages, list) and len(stages) == 6, "six stages")
            for stage, expected in zip(stages, STAGES):
                require(isinstance(stage, dict) and set(stage) == {"name", "pre", "tasks", "post"},
                        "stage keys")
                require(stage["name"] == expected, "stage order")
                for key in ("pre", "tasks", "post"):
                    if stage[key] is not None:
                        require(isinstance(stage[key], dict) and set(stage[key]) == {"linear"},
                                "stage root must be linear")
                        tree(stage[key])
    require(fingerprint(structure(value)) == value["structure_sha256"], "structure integrity")


def differences(before, after, path="profiles"):
    """Readable bounded path diagnostics; list order and duplicates matter."""
    if type(before) is not type(after):
        yield f"{path}: {canonical(before)} -> {canonical(after)}"
    elif isinstance(before, dict) and before.keys() == after.keys():
        for key in before:
            yield from differences(before[key], after[key], f"{path}/{key}")
    elif isinstance(before, list):
        for index in range(max(len(before), len(after))):
            if index >= len(before) or index >= len(after):
                yield f"{path}/{index}: task added/removed"
            else:
                yield from differences(before[index], after[index], f"{path}/{index}")
    elif before != after:
        yield f"{path}: {canonical(before)} -> {canonical(after)}"


def compare_snapshots(expected, observed, allow_version_drift=False):
    """Return (exit status, diagnostics). Only supported SDK drift is advisory."""
    validate_snapshot(expected)
    validate_snapshot(observed)
    if expected["target"] != observed["target"]:
        return 1, ["ERROR: Target differs; inputs are not equivalent (not SDK-only drift)."]
    old, new = (s["provenance"]["qiskit"] for s in (expected, observed))
    version_changed = old != new
    advisory = (version_changed and allow_version_drift and
                all(re.fullmatch(r"2\.6\.\d+", v) for v in (old, new)))
    changed = expected["structure_sha256"] != observed["structure_sha256"]
    if version_changed and not advisory:
        return 1, [f"ERROR: SDK version {old} -> {new}; use --allow-version-drift for supported 2.6.x."]
    if changed:
        status = "WARNING" if advisory else "ERROR"
        messages = [f"{status}: transpiler snapshot changed; review lesson 04.02 (Qiskit {old} -> {new})."]
        for index, message in enumerate(differences(structure(expected), structure(observed))):
            if index == 20:
                messages.append("Further differences omitted; compare JSON output for the full trees.")
                break
            messages.append(message)
        return (0 if advisory else 1), messages
    return 0, [f"{'WARNING: supported version drift; ' if advisory else 'OK: '}"
               f"configured task trees match ({old} -> {new}); "
               f"structure_sha256={observed['structure_sha256']}"]


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", type=Path, help="read-only comparison against reference JSON")
    parser.add_argument("--allow-version-drift", action="store_true",
                        help="warn instead of failing for structural drift on a different supported 2.6.x")
    args = parser.parse_args(argv)
    try:
        observed = snapshot_transpiler()
        if args.check:
            expected = json.loads(args.check.read_text(encoding="utf-8"))
            code, messages = compare_snapshots(expected, observed, args.allow_version_drift)
            print("\n".join(messages))
            return code
        validate_snapshot(observed)
        print(format_snapshot(observed))
        return 0
    except (OSError, ValueError, TypeError, AttributeError, KeyError) as error:
        print(f"ERROR: snapshot inspection/comparison failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
