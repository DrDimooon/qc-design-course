#!/usr/bin/env python3
"""Parser and failure-path tests. No Qiskit or third-party packages required."""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from example_blocks import iter_python_blocks, marked_python_blocks


class ExampleBlockTests(unittest.TestCase):
    def test_line_numbers_and_blank_lines(self):
        self.assertEqual(list(iter_python_blocks("title\n\n```python\nx = 1\n\n```\n")),
                         [(4, "x = 1\n")])

    def test_tilde_fences(self):
        self.assertEqual(list(iter_python_blocks("~~~python\nx = 1\n~~~")), [(2, "x = 1")])

    def test_longer_closer(self):
        self.assertEqual(list(iter_python_blocks("```python\nx = 1\n````")), [(2, "x = 1")])

    def test_short_fence_is_not_a_closer(self):
        with self.assertRaisesRegex(ValueError, "unclosed"):
            list(iter_python_blocks("````python\nx = 1\n```"))

    def test_other_marker_is_not_a_closer(self):
        with self.assertRaisesRegex(ValueError, "unclosed"):
            list(iter_python_blocks("```python\nx = 1\n~~~"))

    def test_closer_info_string_does_not_close(self):
        with self.assertRaisesRegex(ValueError, "unclosed"):
            list(iter_python_blocks("```python\nx = 1\n```python"))

    def test_nested_literal_python_fence_is_not_executed(self):
        text = "````text\n```python\nassert False\n```\n````"
        self.assertEqual(list(iter_python_blocks(text)), [])

    def test_container_indent_preserves_python_indent(self):
        text = "    ```python\n    if True:\n        assert True\n    ```"
        self.assertEqual(list(iter_python_blocks(text)), [(2, "if True:\n    assert True")])

    def test_only_explicit_markers_are_selected(self):
        text = "```python\nassert False\n```\n```python\n# qc: executable\nassert True\n```"
        self.assertEqual(list(marked_python_blocks(text)), [(5, "# qc: executable\nassert True")])

    def test_orphan_marker_is_an_error(self):
        with self.assertRaisesRegex(ValueError, "outside a Python fence"):
            list(marked_python_blocks("# qc: executable\nassert True"))

    def test_marker_in_wrong_language_is_an_error(self):
        with self.assertRaisesRegex(ValueError, "outside a Python fence"):
            list(marked_python_blocks("```text\n# qc: executable\nassert True\n```"))

    def test_duplicate_marker_is_an_error(self):
        with self.assertRaisesRegex(ValueError, "duplicate"):
            list(marked_python_blocks("```python\n# qc: executable\n# qc: executable\n```"))

    def test_unclosed_marked_block_is_not_silently_skipped(self):
        with self.assertRaisesRegex(ValueError, "unclosed"):
            list(marked_python_blocks("```python\n# qc: executable\nassert True"))

    def test_crlf_and_unicode(self):
        self.assertEqual(list(iter_python_blocks("```python\r\nvalue = 'кубит'\r\n```")),
                         [(2, "value = 'кубит'")])

    def test_empty_python_fence(self):
        self.assertEqual(list(iter_python_blocks("```python\n```")), [(2, "")])

    def test_quoted_fence_is_not_executable(self):
        self.assertEqual(list(iter_python_blocks("> ```python\n> # qc: executable\n> assert False\n> ```")), [])

    def test_child_errors_fail_instead_of_being_skipped(self):
        script = Path(__file__).with_name("example_blocks.py")
        cases = (
            ("assert True", True, ""),
            ("assert False", False, "AssertionError"),
            ("raise RuntimeError('regression')", False, "RuntimeError"),
            ("import warnings\nwarnings.warn('old API', DeprecationWarning)", False, "DeprecationWarning"),
        )
        with tempfile.TemporaryDirectory(prefix="qc-example-test-") as directory:
            path = Path(directory) / "пример.md"
            for code, expected, error in cases:
                with self.subTest(code=code):
                    path.write_text("```python\n# qc: executable\n" + code + "\n```", encoding="utf-8")
                    child = subprocess.run([sys.executable, "-X", "utf8", str(script), str(path), "2"],
                                           capture_output=True, text=True, encoding="utf-8", timeout=15)
                    self.assertEqual(child.returncode == 0, expected, child.stdout + child.stderr)
                    if error:
                        self.assertIn(error, child.stderr)

    def test_missing_child_block_is_a_failure(self):
        script = Path(__file__).with_name("example_blocks.py")
        with tempfile.TemporaryDirectory(prefix="qc-example-test-") as directory:
            path = Path(directory) / "example.md"
            path.write_text("```python\n# qc: executable\nassert True\n```", encoding="utf-8")
            child = subprocess.run([sys.executable, str(script), str(path), "999"],
                                   capture_output=True, text=True, encoding="utf-8", timeout=15)
            self.assertNotEqual(child.returncode, 0)
            self.assertIn("marked block not found", child.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
