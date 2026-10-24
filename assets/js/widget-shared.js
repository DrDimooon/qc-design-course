/* Offline widget accessibility and child-side embedding support. */
(function () {
  'use strict';
  var media = window.matchMedia('(prefers-reduced-motion: reduce)');
  var callbacks = [];
  function changed() {
    if (media.matches) { callbacks.forEach(function (fn) { fn(); }); }
  }
  window.QCWidget = {
    reducedMotion: function () { return media.matches; },
    onReducedMotion: function (fn) { callbacks.push(fn); }
  };
  media.addEventListener('change', changed);

  var wrapper = document.querySelector('.qc-widget');
  var status = document.getElementById('widget-status');
  var raf = 0, lastHeight = 0, forceHeight = false;
  function reportHeight() {
    raf = 0;
    // Measure content, never scrollHeight/viewport height: shrinking must work too.
    var height = Math.ceil(wrapper.getBoundingClientRect().height + 48);
    var force = forceHeight;
    forceHeight = false;
    if (!force && height === lastHeight) { return; }
    lastHeight = height;
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'qc-widget:resize', height: height },
        location.protocol === 'file:' ? '*' : location.origin);
    }
  }
  function scheduleHeight() {
    if (!raf) { raf = window.requestAnimationFrame(reportHeight); }
  }
  function receiveRequest(event) {
    if (window.parent === window || event.source !== window.parent) { return; }
    var allowed = location.protocol === 'file:' ? event.origin === 'null' :
      /^(https?:)$/.test(location.protocol) && event.origin === location.origin;
    if (!allowed || !event.data || event.data.type !== 'qc-widget:resize-request') { return; }
    forceHeight = true;
    scheduleHeight();
  }
  window.addEventListener('message', receiveRequest);
  function announce(event) {
    var button = event.target.closest('button');
    if (!button || !wrapper.contains(button)) { return; }
    var state = document.getElementById('state') || document.getElementById('state-text');
    var lines = state.textContent.split('\n').filter(function (line) { return line.trim(); });
    var summary = button.textContent + '. ' + lines.slice(0, 3).join(' ');
    if (document.getElementById('cv-scheme')) {
      summary = button.textContent + '. ' + state.textContent.split('\n\n').pop();
    }
    if (button.id === 'measure' || button.id === 'btn-measure') {
      summary = (document.getElementById('shots') || document.getElementById('tx-hist')).textContent;
    }
    // A persistent, concise region, updated only by deliberate actions, never RAF.
    status.textContent = summary;
  }
  wrapper.addEventListener('click', announce);
  wrapper.addEventListener('input', announce);
  var observer = new ResizeObserver(scheduleHeight);
  observer.observe(wrapper);
  scheduleHeight();
  window.addEventListener('pagehide', function () {
    observer.disconnect();
    window.cancelAnimationFrame(raf);
    media.removeEventListener('change', changed);
    window.removeEventListener('message', receiveRequest);
    wrapper.removeEventListener('click', announce);
    wrapper.removeEventListener('input', announce);
    raf = 0;
    forceHeight = false;
  });
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      media.addEventListener('change', changed);
      window.addEventListener('message', receiveRequest);
      wrapper.addEventListener('click', announce);
      wrapper.addEventListener('input', announce);
      observer.observe(wrapper);
      changed();
      scheduleHeight();
    }
  });
})();
