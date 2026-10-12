/*
 * Top bar: a way to get in touch from the very first screen. Over the opening it is just a small
 * "Start a project" button; once you scroll past, it becomes a slim bar with the main sections.
 *   TopBar.mount({ cta: '#contact', links: [['Work', '#selected-work'], ...], hero: '#opening' })
 */
(function () {
  'use strict';
  function mount(o) {
    o = o || {};
    var bar = document.createElement('header'); bar.className = 'tb'; bar.setAttribute('data-state', 'hero');
    var links = (o.links || []).filter(function (l) { return l[1].charAt(0) !== '#' || document.querySelector(l[1]); });
    bar.innerHTML = '<div class="tb-inner"><a class="tb-mark" href="#top">Toff Studio</a>' +
      '<nav class="tb-nav" aria-label="Sections">' + links.map(function (l) { return '<a href="' + l[1] + '">' + l[0] + '</a>'; }).join('') + '</nav>' +
      '<a class="tb-cta" href="' + (o.cta || '#contact') + '"><span class="tb-long">Start a project</span><span class="tb-short" aria-hidden="true">Enquire</span></a>' +
      '<button type="button" class="tb-menu" aria-expanded="false" aria-controls="tb-sheet">Menu</button></div>' +
      '<nav class="tb-sheet" id="tb-sheet" aria-label="Sections" hidden>' + links.map(function (l) { return '<a href="' + l[1] + '">' + l[0] + '</a>'; }).join('') + '</nav>';
    document.body.insertBefore(bar, document.body.firstChild);
    if (!document.getElementById('top')) { var t = document.createElement('a'); t.id = 'top'; t.setAttribute('aria-hidden', 'true'); t.tabIndex = -1; t.className = 'tb-top'; document.body.insertBefore(t, bar); }
    var hero = o.hero && document.querySelector(o.hero);
    function sync() {
      var past = o.solid || window.scrollY > 24;   // see-through only at the very top; solid as soon as the page moves, so nothing shows through
      bar.setAttribute('data-state', past ? 'bar' : 'hero');
    }
    var menu = bar.querySelector('.tb-menu'), sheet = bar.querySelector('.tb-sheet');   // phones: a simple menu with the same links
    function openMenu(on) { sheet.hidden = !on; menu.setAttribute('aria-expanded', on ? 'true' : 'false'); bar.classList.toggle('tb-open', on); }
    menu.addEventListener('click', function () { openMenu(sheet.hidden); if (!sheet.hidden) { var f = sheet.querySelector('a'); if (f) f.focus(); } });
    sheet.addEventListener('click', function (e) { if (e.target.closest('a')) openMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) { openMenu(false); menu.focus(); } });
    document.addEventListener('click', function (e) { if (!sheet.hidden && !bar.contains(e.target)) openMenu(false); });
    sync(); window.addEventListener('scroll', sync, { passive: true }); window.addEventListener('resize', sync);
    // the section you're reading is marked in the bar
    var as = [].slice.call(bar.querySelectorAll('.tb-nav a')), secs = links.filter(function (l) { return l[1].charAt(0) === '#'; }).map(function (l) { return document.querySelector(l[1]); });
    function mark() {                                    // exactly one link is marked: the last section whose top has passed 40% of the screen
      var cur = null; secs.forEach(function (s) { if (s.getBoundingClientRect().top <= window.innerHeight * 0.4) cur = s; });
      if (cur && cur.getBoundingClientRect().bottom < window.innerHeight * 0.2) cur = null;
      as.forEach(function (a) { if (cur && a.getAttribute('href') === '#' + cur.id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    }
    mark(); window.addEventListener('scroll', mark, { passive: true });
    // on narrow phones the lens switch moves into the menu, so the bar never overflows
    function placeLens(btn) {
      var inner = bar.querySelector('.tb-inner'), cta = bar.querySelector('.tb-cta'), mq = window.matchMedia('(max-width: 480px)');
      function put() { if (mq.matches) sheet.appendChild(btn); else inner.insertBefore(btn, cta); }
      btn.addEventListener('click', function () { if (!sheet.hidden) openMenu(false); });   // close the menu so the lens can be seen
      put(); if (mq.addEventListener) mq.addEventListener('change', put); else mq.addListener(put);
    }
    return { el: bar, state: function () { return bar.getAttribute('data-state'); }, placeLens: placeLens };
  }
  window.TopBar = { mount: mount };
})();
