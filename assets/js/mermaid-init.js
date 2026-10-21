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
      fontFamily: 'inherit'
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
