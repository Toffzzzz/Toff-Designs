/*
 * Try it: the hands-on tools under one heading, one at a time (proper tabs: arrow keys move between them).
 *   window.__tt = TryTabs.mount(document.getElementById('try-it'))
 * Links to anything inside a tab (#playground, #draw-your-site, #one-line, #what-we-build…), "Open in the playground"
 * and the planner all open the right tab first, so nothing ever scrolls to a hidden tool.
 */
(function () {
  'use strict';
  function mount(root) {
    var tabs = [].slice.call(root.querySelectorAll('.tt-tab')), panels = [].slice.call(root.querySelectorAll('.tt-panel')), current = null;
    function show(key, focus) {
      if (key === current) return;
      current = key;
      tabs.forEach(function (t) { var on = t.getAttribute('data-tab') === key; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
      panels.forEach(function (p) { p.hidden = p.getAttribute('data-tab-panel') !== key; });
      window.dispatchEvent(new Event('resize'));          // tools size themselves to the space they now have
      try { sessionStorage.setItem('toff-try-tab', key); } catch (e) {}
    }
    function panelFor(el) { var p = el && el.closest && el.closest('.tt-panel'); return p && root.contains(p) ? p.getAttribute('data-tab-panel') : null; }
    function openFor(id) { var el = id && document.getElementById(id); var k = panelFor(el); if (k) show(k); return !!k; }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(t.getAttribute('data-tab')); });
      t.addEventListener('keydown', function (e) {
        var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
        if (j === null) return; e.preventDefault(); j = (j + tabs.length) % tabs.length; show(tabs[j].getAttribute('data-tab'), true);
      });
    });
    // any same-page link into a tab opens that tab before the browser scrolls to it
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]'); if (a) openFor(a.getAttribute('href').slice(1));
    }, true);
    window.addEventListener('hashchange', function () { openFor(location.hash.slice(1)); });
    window.addEventListener('toff:open-concept', function () { show('look'); }, true);   // runs before the playground scrolls itself into view
    var start = 'look';
    try { var saved = sessionStorage.getItem('toff-try-tab'); if (saved && root.querySelector('[data-tab-panel="' + saved + '"]')) start = saved; } catch (e) {}
    show(start);
    if (location.hash) openFor(location.hash.slice(1));
    return { show: show, current: function () { return current; }, openFor: openFor };
  }
  window.TryTabs = { mount: mount };
})();
