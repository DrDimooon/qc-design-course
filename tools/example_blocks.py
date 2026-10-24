#!/usr/bin/env python3
"""Standard-library-only discovery and isolated execution of Markdown examples."""
from __future__ import annotations

from pathlib import Path
import re
import sys
import warnings

MARKER = "# qc: executable"
OPEN_FENCE = re.compile(r"^( *)(`{3,}|~{3,})([^`~]*)$")


def iter_python_blocks(text: str, source: str = "<markdown>"):
    """Yield (first code line, source) with original 1-based line numbers.

    Backticks and tildes are supported; closing fences cannot be shorter than
    the opener or contain an info string. Only the opener's container indent
    is removed, preserving Python's own indentation. Quoted fences are not
    executable. An unclosed fence is an error, not a silently missing example.
    """
    lines = text.splitlines()
    opening = None
    for index, line in enumerate(lines):
        if opening is None:
            match = OPEN_FENCE.fullmatch(line)
            if match:
                indent, fence, language = match.groups()
                opening = (index, indent, fence, language.strip())
            continue
        start, indent, fence, language = opening
        if re.fullmatch(re.escape(fence[0]) + "{" + str(len(fence)) + r",}\s*", line.strip()):
            if language == "python":
                body = [row[len(indent):] if row.startswith(indent) else row
                        for row in lines[start + 1:index]]
                yield start + 2, "\n".join(body)
            opening = None
    if opening is not None:
        raise ValueError(f"{source}:{opening[0] + 1}: unclosed code fence")


def marked_python_blocks(text: str, source: str = "<markdown>"):
    """Reject orphan markers and execute only explicitly marked Python blocks."""
    blocks = list(iter_python_blocks(text, source))
    selected = []
    recognized = set()
    for line, code in blocks:
        markers = [line + offset for offset, row in enumerate(code.splitlines())
                   if row.strip() == MARKER]
        if markers:
            if len(markers) != 1:
                raise ValueError(f"{source}:{line}: duplicate executable marker")
            selected.append((line, code))
            recognized.update(markers)
    for line, row in enumerate(text.splitlines(), 1):
        if row.strip() == MARKER and line not in recognized:
            raise ValueError(f"{source}:{line}: executable marker outside a Python fence")
    yield from selected


def run_marked_block(path: Path, first_line: int) -> None:
    """Used as a child-process entry point; no SDK is imported before the block."""
    blocks = dict(marked_python_blocks(path.read_text(encoding="utf-8"), str(path)))
    if first_line not in blocks:
        raise ValueError(f"{path}:{first_line}: marked block not found")
    warnings.simplefilter("error", DeprecationWarning)
    namespace = {"__name__": "__course_example__", "__file__": str(path)}
    exec(compile("\n" * (first_line - 1) + blocks[first_line], str(path), "exec"), namespace)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python tools/example_blocks.py MARKDOWN_PATH FIRST_CODE_LINE")
    run_marked_block(Path(sys.argv[1]).resolve(), int(sys.argv[2]))
