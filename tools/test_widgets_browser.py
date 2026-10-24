"""Browser UX regressions. Requires installed Playwright and Chromium; never installs them."""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import unittest
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[1]
WIDGETS = {
    'bloch-sphere': ('btn-X', 'state'),
    'two-qubit': ('btn-h0', 'state-text'),
    'circuit-playground': ('gate-H', 'state'),
    'qec-cycle': ('btn-x1', 'state-text'),
    'grover-amplitude': ('btn-step', 'state-text'),
}


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        if urlsplit(self.path).path == '/fixture':
            query = parse_qs(urlsplit(self.path).query)
            name = query.get('widget', ['bloch-sphere'])[0]
            if name not in WIDGETS:
                self.send_error(404)
                return
            receiver = '' if 'late' in query else '<script src="/assets/js/widget-embed.js"></script>'
            body = (f'<!doctype html><html><head><meta name="viewport" content="width=device-width">'
                    f'<script>window.resizeReports=0;addEventListener("message",e=>{{'
                    f'if(e.data && e.data.type==="qc-widget:resize") resizeReports++;}});</script>'
                    f'<link rel="stylesheet" href="/assets/styles/interactive.css"></head><body>'
                    f'<button id="before">Before</button><iframe class="qc-embed" title="Widget" '
                    f'height="640" src="/assets/interactive/{name}.html"></iframe>'
                    f'<button id="after">After</button><iframe id="unknown" title="Unknown" src="about:blank"></iframe>'
                    f'{receiver}</body></html>').encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()


# Record horizontal ink bounds in CSS pixels, including rotated graph labels.
PROBE = """(() => {
  window.canvasClips=[]; window.statusUpdates=0;
  const orig=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...args) {
    const m=this.measureText(text), t=this.getTransform(), d=devicePixelRatio||1;
    const left=x-m.actualBoundingBoxLeft, right=x+m.actualBoundingBoxRight;
    const top=y-m.actualBoundingBoxAscent, bottom=y+m.actualBoundingBoxDescent;
    const xs=[[left,top],[right,top],[left,bottom],[right,bottom]].map(([a,b])=>(t.a*a+t.c*b+t.e)/d);
    const width=this.canvas.getBoundingClientRect().width;
    if(Math.min(...xs)<-1 || Math.max(...xs)>width+1)
      canvasClips.push({id:this.canvas.id,text,left:Math.min(...xs),right:Math.max(...xs),width});
    return orig.call(this,text,x,y,...args);
  };
  addEventListener('DOMContentLoaded',()=>{
    const s=document.getElementById('widget-status');
    if(s) new MutationObserver(()=>statusUpdates++).observe(s,{childList:true,characterData:true,subtree:true});
  });
})();"""


class WidgetBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as exc:
            raise RuntimeError('Install the separate browser-test dependencies: Python Playwright and Chromium.') from exc
        cls.playwright = sync_playwright().start()
        try:
            cls.browser = cls.playwright.chromium.launch(headless=True)
        except Exception as exc:
            cls.playwright.stop()
            raise RuntimeError('Installed Chromium is required; this test does not download browsers.') from exc
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'
        print('Browser:', cls.browser.version)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 375, 'height': 800})
        self.context.add_init_script(PROBE)
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def load(self, name, fixture=False):
        self.page.goto(self.base + (f'/fixture?widget={name}' if fixture else f'/assets/interactive/{name}.html'))
        frame = self.page.frames[1] if fixture else self.page
        frame.locator('.qc-state').wait_for()
        return frame

    def tab_to(self, frame, element_id):
        for _ in range(60):
            if frame.evaluate('document.activeElement.id') == element_id:
                return
            self.page.keyboard.press('Tab')
        self.fail(f'Cannot reach {element_id} with Tab')

    def test_keyboard_and_announcements(self):
        for name, (action, state) in WIDGETS.items():
            with self.subTest(widget=name):
                frame = self.load(name)
                expected = frame.locator('button,summary').evaluate_all('es=>es.map(e=>e.id||e.tagName)')
                for element in expected:
                    self.page.keyboard.press('Tab')
                    self.assertEqual(frame.evaluate('document.activeElement.id||document.activeElement.tagName'), element)
                    self.assertNotEqual(frame.evaluate('getComputedStyle(document.activeElement).outlineStyle'), 'none')
                # Reverse traversal works as well.
                self.page.keyboard.press('Shift+Tab')
                self.assertEqual(frame.evaluate('document.activeElement.id'), expected[-2])
                self.tab_to(frame, action)
                before = frame.locator('#' + state).inner_text()
                self.page.keyboard.press('Enter')
                self.assertNotEqual(frame.locator('#' + state).inner_text(), before)
                self.assertEqual(frame.evaluate('document.activeElement.id'), action)
                self.assertTrue(frame.locator('[role=status]').inner_text())
                self.assertEqual(frame.locator('[aria-live], [role=status]').count(), 1)
                if name in ('two-qubit', 'circuit-playground'):
                    self.tab_to(frame, 'btn-measure' if name == 'two-qubit' else 'measure')
                    self.page.keyboard.press('Space')
                    self.assertIn('200', frame.locator('[role=status]').inner_text())

    def test_ordered_chain(self):
        self.load('circuit-playground')
        for action in ['gate-H', 'gate-cnot', 'gate-H']:
            self.tab_to(self.page, action)
            self.page.keyboard.press('Enter')
        self.assertEqual(self.page.locator('#state').inner_text().splitlines()[0],
                         'Цепь: H(q0); CNOT(q0->q1); H(q0)')

    def test_mobile_canvas_and_document_bounds(self):
        for width in [320, 375]:
            self.page.set_viewport_size({'width': width, 'height': 800})
            for name, (action, _) in WIDGETS.items():
                with self.subTest(width=width, widget=name):
                    self.load(name)
                    self.page.locator('#' + action).press('Enter')
                    if name == 'qec-cycle':
                        self.page.locator('#btn-syndrome').press('Enter')
                        self.page.locator('#btn-fix').press('Enter')
                    self.page.locator('summary').press('Space')
                    self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), width)
                    self.assertEqual(self.page.evaluate('canvasClips'), [])

    def test_reduced_motion_discrete_actions(self):
        self.page.emulate_media(reduced_motion='reduce')
        for name, action, state in [('bloch-sphere', 'btn-anim', 'state'), ('grover-amplitude', 'btn-auto', 'state-text')]:
            with self.subTest(widget=name):
                self.load(name)
                self.tab_to(self.page, action)
                self.page.keyboard.press('Space')
                before = self.page.locator('#' + state).inner_text()
                self.page.wait_for_timeout(850)
                self.assertEqual(self.page.locator('#' + state).inner_text(), before)
                if name == 'grover-amplitude':
                    self.assertIn('k = 1', before)
                    self.assertEqual(self.page.locator('#btn-auto').inner_text(), 'Авто')
                else:
                    self.assertIn('P(0) = 1.000', before)
                    self.assertIn('одним действием', before)
                    self.assertEqual(self.page.locator('#btn-anim').get_attribute('aria-pressed'), 'false')

    def test_animation_announcements_and_preference_change(self):
        for name, action, state in [('bloch-sphere', 'btn-anim', 'state'), ('grover-amplitude', 'btn-auto', 'state-text')]:
            with self.subTest(widget=name):
                self.page.emulate_media(reduced_motion='no-preference')
                self.load(name)
                self.tab_to(self.page, action)
                self.page.keyboard.press('Enter')
                self.page.wait_for_timeout(100)
                count = self.page.evaluate('statusUpdates')
                self.assertEqual(count, 1)
                before = self.page.locator('#' + state).inner_text()
                self.page.wait_for_timeout(800)
                self.assertNotEqual(self.page.locator('#' + state).inner_text(), before)
                self.assertEqual(self.page.evaluate('statusUpdates'), count)
                self.page.emulate_media(reduced_motion='reduce')
                self.page.wait_for_timeout(100)
                stopped = self.page.locator('#' + state).inner_text()
                self.page.wait_for_timeout(850)
                self.assertEqual(self.page.locator('#' + state).inner_text(), stopped)

    def test_page_lifecycle_restores_shared_listeners_once(self):
        self.load('bloch-sphere')
        for _ in range(2):
            self.page.evaluate("dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}))")
            self.page.evaluate("dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))")
        self.tab_to(self.page, 'btn-X')
        self.page.keyboard.press('Enter')
        self.page.wait_for_timeout(50)
        self.assertEqual(self.page.evaluate('statusUpdates'), 1)
        self.assertIn('P(1) = 1.000', self.page.locator('[role=status]').inner_text())

    def test_iframe_resize_growth_shrink_and_keyboard_exit(self):
        self.page.set_viewport_size({'width': 320, 'height': 800})
        for name in WIDGETS:
            with self.subTest(widget=name):
                frame = self.load(name, fixture=True)
                self.page.wait_for_function("+document.querySelector('.qc-embed').height > 640")
                initial = int(self.page.locator('.qc-embed').get_attribute('height'))
                frame.locator('summary').press('Enter')
                self.page.wait_for_function('(h)=>+document.querySelector(".qc-embed").height>h', arg=initial)
                expanded = int(self.page.locator('.qc-embed').get_attribute('height'))
                frame.locator('summary').press('Enter')
                self.page.wait_for_function('(h)=>+document.querySelector(".qc-embed").height<h', arg=expanded)
                if name == 'qec-cycle':
                    frame.locator('#btn-syndrome').press('Enter')
                    self.page.wait_for_function('(h)=>+document.querySelector(".qc-embed").height>h', arg=initial)
                frame.locator('summary').press('Tab')
                self.assertEqual(self.page.evaluate('document.activeElement.id'), 'after')
                height = self.page.locator('.qc-embed').get_attribute('height')
                self.page.wait_for_timeout(200)
                self.assertEqual(self.page.locator('.qc-embed').get_attribute('height'), height)

    def test_file_embedding(self):
        url = (ROOT / 'assets/interactive/bloch-sphere.html').as_uri()
        self.page.goto(url)
        self.page.set_content('<script>window.resizeReports=0;addEventListener("message",e=>{'
                              'if(e.data && e.data.type==="qc-widget:resize") resizeReports++;});</script>'
                              f'<iframe class="qc-embed" title="Offline" height="640" src="{url}"></iframe>')
        frame = self.page.frames[1]
        frame.locator('.qc-state').wait_for()
        self.page.wait_for_function('resizeReports > 0')
        self.assertEqual(self.page.locator('.qc-embed').get_attribute('height'), '640')
        self.page.add_script_tag(url=(ROOT / 'assets/js/widget-embed.js').as_uri())
        expected = frame.evaluate("Math.ceil(document.querySelector('.qc-widget').getBoundingClientRect().height + 48)")
        self.page.wait_for_function('(h)=>+document.querySelector(".qc-embed").height===h', arg=expected, timeout=1500)
        height = self.page.locator('.qc-embed').get_attribute('height')
        self.page.evaluate('''() => dispatchEvent(new MessageEvent('message',{
          origin:'https://wrong.invalid',source:document.querySelector('.qc-embed').contentWindow,
          data:{type:'qc-widget:resize',height:1234}}))''')
        self.assertEqual(self.page.locator('.qc-embed').get_attribute('height'), height)

    def test_receiver_loaded_after_initial_report(self):
        for name in WIDGETS:
            with self.subTest(widget=name):
                self.page.goto(self.base + f'/fixture?widget={name}&late=1')
                frame = self.page.frames[1]
                frame.locator('.qc-state').wait_for()
                self.page.wait_for_function('resizeReports > 0')
                self.assertEqual(self.page.locator('.qc-embed').get_attribute('height'), '640')
                self.page.add_script_tag(url=self.base + '/assets/js/widget-embed.js')
                expected = frame.evaluate("Math.ceil(document.querySelector('.qc-widget').getBoundingClientRect().height + 48)")
                self.page.wait_for_function('(h)=>+document.querySelector(".qc-embed").height===h',
                                            arg=expected, timeout=1500)

    def test_resize_request_authentication(self):
        frame = self.load('bloch-sphere', fixture=True)
        self.page.wait_for_function("+document.querySelector('.qc-embed').height > 640")
        self.page.wait_for_timeout(100)
        reports = self.page.evaluate('resizeReports')
        frame.evaluate('''() => {
          function send(origin,source,type='qc-widget:resize-request') {
            dispatchEvent(new MessageEvent('message',{origin,source,data:{type}}));
          }
          send(location.origin,window);
          send('https://wrong.invalid',parent);
          send('null',parent);
          send(location.origin,parent,'wrong');
        }''')
        self.page.wait_for_timeout(100)
        self.assertEqual(self.page.evaluate('resizeReports'), reports)
        # An authenticated request must produce a report even with identical height.
        self.page.evaluate('''() => document.querySelector('.qc-embed').contentWindow.postMessage(
          {type:'qc-widget:resize-request'},location.origin)''')
        self.page.wait_for_function('(n)=>resizeReports>n', arg=reports)
        self.assertEqual(self.page.evaluate('resizeReports'), reports + 1)
        self.page.wait_for_timeout(100)
        self.assertEqual(self.page.evaluate('resizeReports'), reports + 1)

    def test_resize_authentication(self):
        self.load('bloch-sphere', fixture=True)
        self.page.wait_for_function("+document.querySelector('.qc-embed').height > 640")
        height = self.page.locator('.qc-embed').get_attribute('height')
        results = self.page.evaluate('''() => {
          const f=document.querySelector('.qc-embed'), unknown=document.querySelector('#unknown');
          const results=[];
          function send(origin,source,data) {
            dispatchEvent(new MessageEvent('message',{origin,source,data})); results.push(f.height);
          }
          const valid={type:'qc-widget:resize',height:1234};
          send(location.origin,window,valid);
          send(location.origin,unknown.contentWindow,valid);
          send('https://wrong.invalid',f.contentWindow,valid);
          send('null',f.contentWindow,valid);
          for(const h of [NaN,Infinity,-Infinity,99,20001,'1234',null])
            send(location.origin,f.contentWindow,{type:'qc-widget:resize',height:h});
          send(location.origin,f.contentWindow,{type:'wrong',height:1234});
          return results;
        }''')
        self.assertTrue(all(value == height for value in results), results)
        self.page.evaluate('''() => dispatchEvent(new MessageEvent('message',{
          origin:location.origin,source:document.querySelector('.qc-embed').contentWindow,
          data:{type:'qc-widget:resize',height:1234}}))''')
        self.assertEqual(self.page.locator('.qc-embed').get_attribute('height'), '1234')


if __name__ == '__main__':
    unittest.main(verbosity=2)
