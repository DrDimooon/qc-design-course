/*
 * Инициализация Mermaid для схем в уроках.
 *
 * Подключается в mkdocs.yml через extra_javascript. Схема инициализируется
 * при каждой перерисовке страницы (в Material это событие document$),
 * тема подстраивается под светлую/тёмную окраску сайта.
 */
(function () {
  'use strict';

  function init() {
    if (typeof window.mermaid === 'undefined') { return; }
    var scheme = document.body ? document.body.getAttribute('data-md-color-scheme') : null;
    window.mermaid.initialize({
      startOnLoad: false,
      theme: scheme === 'slate' ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
      // Схемы не масштабируются под ширину колонки: иначе длинные
      // конвейеры сжимаются в нечитаемую полоску. Вместо этого у блока
      // появляется горизонтальная прокрутка (см. assets/styles/interactive.css).
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        nodeSpacing: 45,
        rankSpacing: 60,
        curve: 'basis',
        padding: 8
      },
      sequence: { useMaxWidth: false, wrap: true },
      themeVariables: { fontSize: '15px' }
    });
    // Идемпотентность: рендерим только необработанные блоки — уже
    // отрисованные mermaid помечает атрибутом data-processed, и
    // повторные вызовы (document$ срабатывает на каждой внутренней
    // навигации) уже отрисованные схемы не трогают.
    // Каждый блок отдельно: сбой одной схемы с синтаксической ошибкой
    // не должен ломать отрисовку остальных.
    // Private fence class prevents Material's own Mermaid renderer from replacing
    // the same node while this asynchronous render is measuring SVG labels.
    var pending = document.querySelectorAll('.qc-mermaid:not([data-processed]):not([data-qc-rendering])');
    function render(node) {
      // SuperFences can emit <pre class="mermaid"><code>...</code></pre>.
      // Mermaid reads innerHTML, so remove the code wrapper before rendering.
      var code = node.querySelector('code');
      if (code) { node.textContent = code.textContent; }
      node.setAttribute('data-qc-rendering', 'true');
      function done() { node.removeAttribute('data-qc-rendering'); }
      try {
        // run() is asynchronous: try/catch alone cannot catch its rejection.
        Promise.resolve(window.mermaid.run({ nodes: [node] })).then(done, function (error) {
          done();
          console.warn('mermaid block failed:', error);
        });
      } catch (e) {
        done();
        console.warn('mermaid block failed:', e);
      }
    }
    for (var i = 0; i < pending.length; i++) { render(pending[i]); }
  }

  // Двойная инициализация: document$ в Material срабатывает и на первой
  // загрузке, и на каждой внутренней навигации. Если он доступен, слушаем
  // только его, иначе fallback на стандартные события документа.
  if (typeof window.document$ !== 'undefined') {
    window.document$.subscribe(init);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
