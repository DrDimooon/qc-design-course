/* Parent-side receiver. Include once on course pages containing .qc-embed. */
(function () {
  'use strict';
  function allowedFrame(frame) {
    var url = new URL(frame.src, location.href);
    return location.protocol === 'file:' ? url.protocol === 'file:' :
      /^(https?:)$/.test(location.protocol) && /^(https?:)$/.test(url.protocol) &&
      url.origin === location.origin;
  }
  function request(frame) {
    if (!frame.matches('iframe.qc-embed') || !allowedFrame(frame) || !frame.contentWindow) { return; }
    frame.contentWindow.postMessage({ type: 'qc-widget:resize-request' },
      location.protocol === 'file:' ? '*' : location.origin);
  }
  function requestAll() {
    document.querySelectorAll('iframe.qc-embed').forEach(request);
  }
  function loaded(event) {
    if (event.target.tagName === 'IFRAME') { request(event.target); }
  }
  function receive(event) {
    var allowed = location.protocol === 'file:' ? event.origin === 'null' :
      /^(https?:)$/.test(location.protocol) && event.origin === location.origin;
    if (!allowed) { return; }
    var data = event.data;
    if (!data || data.type !== 'qc-widget:resize' || typeof data.height !== 'number' ||
        !Number.isFinite(data.height) || data.height < 100 || data.height > 20000) { return; }
    var frames = document.querySelectorAll('iframe.qc-embed');
    for (var i = 0; i < frames.length; i++) {
      var frame = frames[i];
      if (frame.contentWindow !== event.source) { continue; }
      if (!allowedFrame(frame)) { return; }
      var height = Math.ceil(data.height);
      if (frame.getAttribute('height') !== String(height)) { frame.setAttribute('height', height); }
      return;
    }
  }
  function start() {
    // Listen before requesting: children can answer even when already fully loaded.
    window.addEventListener('message', receive);
    document.addEventListener('load', loaded, true);
    requestAll();
  }
  start();
  window.addEventListener('pagehide', function () {
    window.removeEventListener('message', receive);
    document.removeEventListener('load', loaded, true);
  });
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) { start(); }
  });
})();
