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
    window.mermaid.run({ querySelector: '.mermaid' });
  }

  if (typeof window.document$ !== 'undefined') {
    window.document$.subscribe(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
