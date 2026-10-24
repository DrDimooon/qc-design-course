#!/usr/bin/env python3
"""Check a student routing callable; contains no routing implementation."""
from __future__ import annotations

import argparse
from copy import deepcopy
import importlib
from numbers import Integral
from pathlib import Path
import sys

import numpy as np
from qiskit import QuantumCircuit
from qiskit.circuit import ControlFlowOp, Parameter
from qiskit.circuit.random import random_circuit
from qiskit.quantum_info import Operator
from qiskit.transpiler import CouplingMap


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def check_case(route, qc, cm, seed=17):
    """Check all logical input columns with ancillas initially zero."""
    original = qc.copy()
    graph = deepcopy(cm)
    edges = set(cm.get_edges())
    width = cm.size()
    result = route(qc, cm, seed)
    require(qc == original, "route mutated the input circuit")
    require(cm.size() == width and set(cm.get_edges()) == set(graph.get_edges()),
            "route mutated the coupling map")
    require(isinstance(result, tuple) and len(result) == 2,
            "route must return (routed, phys)")
    routed, phys = result
    require(isinstance(routed, QuantumCircuit), "routed must be QuantumCircuit")
    require(routed.num_qubits == width and routed.num_clbits == 0,
            "output must use the physical width without classical bits")
    require(isinstance(phys, (list, tuple)) and len(phys) == original.num_qubits,
            "phys must have one position per logical qubit")
    require(all(isinstance(q, Integral) and not isinstance(q, bool)
                and 0 <= q < width for q in phys), "invalid physical index")
    require(len(set(phys)) == len(phys), "phys must be injective")
    for inst in routed.data:
        op = inst.operation
        require(not isinstance(op, ControlFlowOp)
                and not getattr(op, "condition", None)
                and op.name not in {"measure", "reset", "barrier", "delay"}
                and not inst.clbits and op.num_qubits in (1, 2),
                "output must contain only static unitary 1q/2q operations")
        if op.num_qubits == 2:
            pair = tuple(routed.find_bit(q).index for q in inst.qubits)
            require(pair in edges, f"2q operation outside coupling graph: {pair}")

    unitary = Operator(original).data
    expected = np.zeros((2**width, 2**original.num_qubits), dtype=complex)
    for logical in range(2**original.num_qubits):
        physical = sum(((logical >> q) & 1) << int(phys[q])
                       for q in range(original.num_qubits))
        expected[physical, :] = unitary[logical, :]
    # Initial logical wires are 0..n-1; all extra high bits start at zero.
    actual = Operator(routed).data[:, :2**original.num_qubits]
    phase = np.vdot(expected, actual) / np.vdot(expected, expected)
    require(np.isclose(abs(phase), 1.0, atol=1e-9, rtol=0)
            and np.allclose(actual, phase * expected, atol=1e-9, rtol=0),
            "semantics differ after final permutation (one common phase required)")

    repeated = route(original.copy(), deepcopy(graph), seed)
    require(isinstance(repeated, tuple) and len(repeated) == 2,
            "repeated call must return (routed, phys)")
    require(isinstance(repeated[0], QuantumCircuit)
            and repeated[0] == routed and list(repeated[1]) == list(phys),
            "same seed/configuration must reproduce circuit and mapping")


def valid_cases():
    yield "empty", QuantumCircuit(1), CouplingMap.from_line(1)
    far = QuantumCircuit(3, global_phase=0.31)
    far.h(0)
    far.cx(0, 2)
    far.ry(0.47, 0)
    far.cx(2, 1)
    yield "far-and-remapped-1q", far, CouplingMap.from_line(3)
    swaps = QuantumCircuit(3)
    swaps.h(0)
    swaps.swap(0, 2)
    swaps.rz(0.29, 2)
    swaps.cx(0, 1)
    yield "logical-swap", swaps, CouplingMap.from_line(3)
    spare = QuantumCircuit(2, global_phase=-0.43)
    spare.h(0)
    spare.ry(0.73, 1)
    spare.cx(0, 1)
    spare.swap(0, 1)
    spare.rz(0.17, 0)
    yield "unused-physical-wire", spare, CouplingMap([[0, 2], [2, 0], [2, 1], [1, 2]])
    disconnected = CouplingMap([[0, 1], [1, 0]])
    disconnected.add_physical_qubit(2)
    yield "reachable-disconnected", spare, disconnected
    for n in (2, 3, 4):
        for seed in (7, 11, 42):
            qc = random_circuit(n, depth=5, max_operands=2, seed=seed)
            qc.global_phase = -0.23
            for name, cm in (("line", CouplingMap.from_line(n)),
                             ("ring", CouplingMap.from_ring(n))):
                yield f"random-{n}-{seed}-{name}", qc.copy(), cm


def invalid_cases():
    qc = QuantumCircuit(3)
    qc.cx(0, 2)
    yield "too-narrow", qc, CouplingMap.from_line(2)
    yield "directed", qc, CouplingMap([[0, 1], [1, 2]])
    disconnected = CouplingMap([[0, 1], [1, 0]])
    disconnected.add_physical_qubit(2)
    yield "unreachable", qc, disconnected
    threeq = QuantumCircuit(3)
    threeq.ccx(0, 1, 2)
    yield "three-qubit-input", threeq, CouplingMap.from_line(3)
    measured = QuantumCircuit(1, 1)
    measured.measure(0, 0)
    yield "measurement", measured, CouplingMap.from_line(1)
    reset = QuantumCircuit(1)
    reset.reset(0)
    yield "reset", reset, CouplingMap.from_line(1)
    conditional = QuantumCircuit(1, 1)
    with conditional.if_test((conditional.clbits[0], True)):
        conditional.x(0)
    yield "control-flow", conditional, CouplingMap.from_line(1)
    barrier = QuantumCircuit(1)
    barrier.barrier()
    yield "barrier", barrier, CouplingMap.from_line(1)
    delay = QuantumCircuit(1)
    delay.delay(10, 0)
    yield "delay", delay, CouplingMap.from_line(1)
    parameterized = QuantumCircuit(1)
    parameterized.rz(Parameter("theta"), 0)
    yield "unbound-parameter", parameterized, CouplingMap.from_line(1)


def check_rejection(route, qc, cm):
    try:
        route(qc, cm, 17)
    except ValueError:
        return
    raise AssertionError("unsupported/impossible input must raise ValueError")


def run_contract(route):
    require(callable(route), "module.route must be callable")
    count = 0
    for name, qc, cm in valid_cases():
        try:
            check_case(route, qc, cm)
        except Exception as exc:
            raise AssertionError(f"valid case {name}: {exc}") from exc
        count += 1
    for name, qc, cm in invalid_cases():
        try:
            check_rejection(route, qc, cm)
        except Exception as exc:
            raise AssertionError(f"invalid case {name}: {exc}") from exc
        count += 1
    return count


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--module", required=True,
                        help="importable student module exporting route(qc, cm, seed)")
    args = parser.parse_args()
    sys.path.insert(0, str(Path.cwd()))
    module = importlib.import_module(args.module)
    count = run_contract(getattr(module, "route", None))
    print(f"Mapper contract passed: {count} cases; not a performance grade.")


if __name__ == "__main__":
    main()
