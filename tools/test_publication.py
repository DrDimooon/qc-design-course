#!/usr/bin/env python3
"""Ensure local reports and hidden files cannot leak into the staged site."""
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import build_site


class PublicationBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="qc-publication-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.staging = self.root / ".site-build"
        self.staging.mkdir()
        self.root_patch = patch.object(build_site, "ROOT", self.root)
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)

    def write(self, name, text="local content"):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def test_root_reports_and_service_content_are_excluded(self):
        private = (
            "AUDIT-NOTES.md", "audit_2026-10-24.txt", "Audit-Report.md",
            "REVIEW-NOTES.md", "review-report-final.txt", ".env",
            ".local/notes.md", ".github/workflows/check.yml",
            "site/stale.html", "__pycache__/old.pyc",
        )
        for name in private:
            self.write(name)
        self.write("README.md", "# Course")
        docs = build_site.stage_content(self.staging)
        self.assertEqual({path.name for path in docs.iterdir()}, {"README.md"})

    def test_nested_reports_and_hidden_files_are_excluded(self):
        for name in (
            "curriculum/AUDIT-NOTES.md", "resources/review-notes.md",
            "assets/.local/notes.md", "assets/.env", "tools/cache.pyc",
        ):
            self.write(name)
        self.write("curriculum/lesson.md", "# Lesson")
        self.write("assets/js/widget.js", "// public widget")
        docs = build_site.stage_content(self.staging)
        self.assertEqual({path.relative_to(docs).as_posix() for path in docs.rglob("*") if path.is_file()},
                         {"curriculum/lesson.md", "assets/js/widget.js"})

    def test_learner_materials_and_linked_downloads_are_preserved(self):
        public = ("CONVENTIONS.md", "requirements-lock.txt", "LICENSE", "mkdocs.yml",
                  "tests/answers/final.md", "tools/check_examples.py", "assets/figures/example.png")
        for name in public:
            self.write(name)
        docs = build_site.stage_content(self.staging)
        for name in public:
            self.assertTrue((docs / name).is_file(), name)

    def test_rebuilding_discards_stale_staging_content(self):
        self.write("README.md", "# Current course")
        self.write(".site-build/docs/AUDIT-NOTES.md", "stale report")
        docs = build_site.stage_content(self.staging)
        self.assertEqual({path.name for path in docs.iterdir()}, {"README.md"})

    def test_private_name_matching_is_case_insensitive(self):
        for name in ("AUDIT-NOTES.md", "Audit-Notes.md", "aUdIt_2026.txt", "Review-Report.md"):
            with self.subTest(name=name):
                self.assertTrue(build_site.exclude_from_site(name))
        for name in ("README.md", "CONVENTIONS.md", "01-how-to-read-paper.md", "student-report.md"):
            with self.subTest(name=name):
                self.assertFalse(build_site.exclude_from_site(name))


if __name__ == "__main__":
    unittest.main(verbosity=2)
