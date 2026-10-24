"""Integration of the built MkDocs theme, Mermaid and lazy widget iframes.

Run tools/build_site.py --strict first. Requires the optional browser tools.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import unittest

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class BuiltSiteBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not (ROOT / "site/index.html").is_file():
            raise RuntimeError("Build the site first: python tools/build_site.py --strict")
        from playwright.sync_api import sync_playwright
        cls.playwright = sync_playwright().start()
        try:
            cls.browser = cls.playwright.chromium.launch(headless=True)
        except Exception:
            cls.playwright.stop()
            raise
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0),
                                        partial(QuietHandler, directory=str(ROOT / "site")))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}/"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={"width": 375, "height": 800})
        self.page = self.context.new_page()
        self.errors = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def test_mermaid_and_embeds_on_real_lesson_pages(self):
        for lesson in ("curriculum/01-quantum-basics/02-gates-circuits/",
                       "curriculum/03-algorithms/04-error-correction/"):
            with self.subTest(lesson=lesson):
                self.assertEqual(self.page.goto(self.base + lesson).status, 200)
                if self.page.locator(".qc-mermaid").count():
                    self.page.wait_for_function('''Array.from(document.querySelectorAll('.qc-mermaid'))
                        .every(el => el.querySelector('svg .node'))''')
                element = self.page.locator("iframe.qc-embed").first
                element.scroll_into_view_if_needed()
                frame = element.element_handle().content_frame()
                frame.wait_for_selector(".qc-widget")
                height = frame.evaluate("Math.ceil(document.querySelector('.qc-widget').getBoundingClientRect().height + 48)")
                self.page.wait_for_function("h => +document.querySelector('iframe.qc-embed').height === h", arg=height)
                self.assertGreater(height, 640)

    def test_reinitialization_does_not_replace_completed_diagrams(self):
        self.page.goto(self.base + "curriculum/01-quantum-basics/02-gates-circuits/")
        self.page.wait_for_selector(".qc-mermaid svg .node")
        before = self.page.locator(".qc-mermaid").evaluate_all("es => es.map(e => e.innerHTML)")
        self.page.add_script_tag(url=self.base + "assets/js/mermaid-init.js")
        self.page.wait_for_timeout(100)
        self.assertEqual(self.page.locator(".qc-mermaid").evaluate_all("es => es.map(e => e.innerHTML)"), before)
        self.assertTrue(all(self.page.locator(".qc-mermaid").evaluate_all(
            "es => es.map(e => e.getAttribute('data-processed') === 'true')")))


if __name__ == "__main__":
    unittest.main(verbosity=2)
