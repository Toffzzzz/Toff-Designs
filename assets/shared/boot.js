/*
 * Toff Studio: boot (round 05). A tiny classic script, loaded in the <head> straight after settings.js,
 * before anything is drawn:
 *
 *   <script src="{base}settings.js"></script>
 *   <script src="{base}assets/shared/boot.js"></script>
 *
 * 1. Colours and motion tokens from settings.js onto the CSS variables in tokens.css
 *    (settings.js colors.* and motion.*), so the owner changes them in one place.
 * 2. html.js-motion (never with reduced motion): lets fade-ups start hidden. If motion.js hasn't
 *    started within 4 seconds (a failed download), the class goes again, so nothing stays hidden.
 * 3. html.show-unfinished while showPlaceholders is true or the address has ?unfinished.
 * 4. A fresh visit opens at the very top: on a new visit or a reload without a #fragment the
 *    browser's own scroll restore is switched off for this load (and on again after load, so
 *    Back/Forward still restore your place). motion.js does the same if a page has no boot.js.
 */
(function () {
  'use strict';
  var S = window.TOFF_SETTINGS || {}, root = document.documentElement, st = root.style;

  var C = S.colors || {};
  var COLOURS = {
    bg: ['--bg'], ink: ['--ink'], text: ['--text'], slate: ['--slate'], accent: ['--gold', '--accent'], tint: ['--tint'],
    lineShadow: ['--line-shadow'], footer: ['--bg-deep'], error: ['--error'], hairline: ['--hairline'],
    paper: ['--paper'], paperText: ['--paper-text'], paperQuiet: ['--paper-quiet'], paperLine: ['--paper-line'], paperAccent: ['--paper-accent']
  };
  for (var k in COLOURS) if (C[k]) COLOURS[k].forEach(function (v) { st.setProperty(v, C[k]); });

  var M = S.motion || {};
  var MOTION = {
    easeOut: '--ease-out', easeInOut: '--ease-in-out', easeIn: '--ease-in',
    pressMs: '--dur-press', quickMs: '--dur-quick', baseMs: '--dur-base', revealMs: '--dur-reveal', moveMs: '--dur-move', lineMs: '--dur-line',
    riseSmallPx: '--rise-s', riseMediumPx: '--rise-m', riseLargePx: '--rise-l', staggerLinesMs: '--stagger-lines', staggerRowsMs: '--stagger-rows'
  };
  for (var m in MOTION) if (M[m] != null && M[m] !== '') st.setProperty(MOTION[m], typeof M[m] === 'number' ? M[m] + (/Px$/.test(m) ? 'px' : 'ms') : M[m]);

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) {
    root.classList.add('js-motion');
    setTimeout(function () { if (!window.__toffMotion) root.classList.remove('js-motion'); }, 4000);
  }

  if (S.showPlaceholders !== false || /[?&]unfinished\b/.test(location.search)) root.classList.add('show-unfinished');

  // A fresh visit opens at the top (the same rule as the handwriting engine)
  if (!window.__toffOpenedAtTop) {
    window.__toffOpenedAtTop = true;
    var t = 'navigate';
    try { var e = performance.getEntriesByType('navigation')[0]; if (e) t = e.type; } catch (err) {}
    if ((t === 'navigate' || t === 'reload') && !location.hash) {
      window.__toffFreshTop = true;
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      // A reload still restores the old place once the page is tall enough (the entry was left with
      // 'auto'), so go back to the top again when the document is parsed and when it has loaded,
      // unless the visitor has started scrolling by then.
      var touched = false, mark = function () { touched = true; };
      ['wheel', 'touchstart', 'keydown'].forEach(function (n) { window.addEventListener(n, mark, { capture: true, passive: true, once: true }); });
      var top = function () { if (!touched && window.scrollY !== 0) window.scrollTo(0, 0); };
      top();
      document.addEventListener('DOMContentLoaded', top);
      window.addEventListener('load', function () {
        top();
        setTimeout(function () { top(); if ('scrollRestoration' in history) history.scrollRestoration = 'auto'; }, 0);
      });
    }
  }
})();
