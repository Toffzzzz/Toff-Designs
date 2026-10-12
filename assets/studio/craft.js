/*
 * Craft: honest, live measurements of this page, taken in the visitor's own browser.
 *   Craft.measure(function (m) { … })   m = { loadMs, kb, requests, external, externalHosts }
 *   Craft.londonTime()                   -> "20:41"
 *   Craft.fillFooter(el)                 fills [data-craft="load|weight|external|time"] spans and keeps the time current
 * Nothing is sent anywhere.
 */
(function () {
  'use strict';
  function measure(cb) {
    function run() {
      var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || null;
      var loadMs = nav && nav.loadEventEnd > 0 ? nav.loadEventEnd - nav.startTime
        : (performance.timing ? performance.timing.loadEventEnd - performance.timing.navigationStart : 0);
      var res = performance.getEntriesByType ? performance.getEntriesByType('resource') : [];
      var bytes = nav ? (nav.transferSize || nav.encodedBodySize || 0) : 0, ext = 0, hosts = {};
      res.forEach(function (r) {
        bytes += r.transferSize || r.encodedBodySize || 0;      // cached files count at their size, so the number stays honest on repeat visits
        try {
          var u = new URL(r.name, location.href);
          if (/^(https?):$/.test(u.protocol) && u.host !== location.host) { ext++; hosts[u.host] = 1; }
        } catch (e) {}
      });
      cb({ loadMs: Math.max(0, Math.round(loadMs)), kb: Math.round(bytes / 1024), requests: res.length + 1, external: ext, externalHosts: Object.keys(hosts) });
    }
    if (document.readyState === 'complete') setTimeout(run, 0);
    else window.addEventListener('load', function () { setTimeout(run, 0); });
  }
  function londonTime() {
    try { return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(new Date()); }
    catch (e) { return ''; }
  }
  function seconds(ms) { return ms < 1000 ? (ms / 1000).toFixed(2) : (ms / 1000).toFixed(1); }
  function fillFooter(el) {
    measure(function (m) {
      var set = function (k, v) { [].slice.call(el.querySelectorAll('[data-craft="' + k + '"]')).forEach(function (s) { s.textContent = v; }); };
      set('load', seconds(m.loadMs) + ' s');
      set('weight', m.kb + ' KB');
      set('external', m.external === 0 ? 'no trackers and nothing loaded from other websites' : m.external + ' file' + (m.external === 1 ? '' : 's') + ' from other websites');
    });
    function tick() { [].slice.call(el.querySelectorAll('[data-craft="time"]')).forEach(function (s) { s.textContent = londonTime(); }); }
    tick(); setInterval(tick, 20000);
  }
  window.Craft = { measure: measure, londonTime: londonTime, seconds: seconds, fillFooter: fillFooter };
})();
