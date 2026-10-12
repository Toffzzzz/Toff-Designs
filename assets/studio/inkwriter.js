/*
 * InkWriter: writes a short phrase with the same pen and cursive as the handwriting, once, when it
 * comes into view (at a natural writing pace), with the same gold under-shadow. Reduced motion: shown written.
 *
 *   InkWriter.mount(el, { phrase: 'finale', narrow: 'finale-narrow', narrowBelow: 620, speed: 120,
 *                         onPen: function (clientX, clientY) { … } })   // where the pen tip is, while writing
 * Phrases come from inkwriter-data.js (window.INK_PHRASES), generated from the handwriting font.
 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  function mount(el, options) {
    var o = options || {}, data = window.INK_PHRASES || {}, svg = null, strokes = [], state = 'idle', raf = 0, key = null;
    var speed = o.speed || 120, lift = o.liftMs == null ? 110 : o.liftMs;

    function pick() { return (o.narrow && el.clientWidth < (o.narrowBelow || 620)) ? o.narrow : o.phrase; }
    function build() {
      key = pick(); var ph = data[key]; if (!ph) return;
      el.innerHTML = '';
      svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', ph.viewBox.join(' ')); svg.setAttribute('class', 'iw-svg'); svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('fill', 'none'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
      var sh = document.createElementNS(NS, 'g'), ink = document.createElementNS(NS, 'g');
      sh.setAttribute('class', 'iw-shadow'); ink.setAttribute('class', 'iw-ink');
      svg.appendChild(sh); svg.appendChild(ink); el.appendChild(svg);
      strokes = ph.strokes.map(function (s) {
        var a = document.createElementNS(NS, 'path'), b = document.createElementNS(NS, 'path');
        a.setAttribute('d', s.d); b.setAttribute('d', s.d); sh.appendChild(a); ink.appendChild(b);
        var L = b.getTotalLength() || s.len;
        [a, b].forEach(function (p) { p.style.strokeDasharray = L + ' ' + (L + 2); p.style.strokeDashoffset = L; p.style.visibility = 'hidden'; });
        return { a: a, b: b, L: L };
      });
      if (state === 'done') finish();
    }
    function set(s, f) {
      if (f <= 0) { s.a.style.visibility = s.b.style.visibility = 'hidden'; return; }    // hidden, never a zero-length dash
      s.a.style.visibility = s.b.style.visibility = 'visible';
      var off = s.L * (1 - Math.min(1, f)); s.a.style.strokeDashoffset = off; s.b.style.strokeDashoffset = off;
    }
    function finish() { state = 'done'; strokes.forEach(function (s) { set(s, 1); }); el.setAttribute('data-written', '1'); }
    function play() {
      if (state !== 'idle') return; state = 'writing';
      if (reduce) { finish(); return; }
      var total = strokes.reduce(function (t, s) { return t + s.L; }, 0), t0 = null;
      var plan = [], acc = 0; strokes.forEach(function (s) { plan.push({ s: s, start: acc }); acc += s.L / speed * 1000 + lift; });
      function frame(now) {
        if (t0 == null) t0 = now;
        var t = now - t0, tip = null;
        plan.forEach(function (p) {
          var f = (t - p.start) / (p.s.L / speed * 1000);
          set(p.s, f);
          if (f > 0 && f < 1) tip = p.s.b.getPointAtLength(p.s.L * f);
        });
        if (tip && o.onPen) {
          var m = p_ctm(tip); if (m) o.onPen(m.x, m.y);
        }
        if (t < acc) raf = requestAnimationFrame(frame); else finish();
      }
      raf = requestAnimationFrame(frame);
    }
    function p_ctm(pt) {
      var M = svg.getScreenCTM(); if (!M) return null;
      var q = svg.createSVGPoint(); q.x = pt.x; q.y = pt.y; return q.matrixTransform(M);
    }
    build();
    var lastKey = key;
    if ('ResizeObserver' in window) new ResizeObserver(function () { if (pick() !== lastKey) { lastKey = pick(); cancelAnimationFrame(raf); if (state === 'writing') state = 'done'; build(); } }).observe(el);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); setTimeout(play, o.delay || 250); } }, { threshold: o.threshold || 0.6 });
      io.observe(el);
    } else play();
    return { play: play, finish: finish, state: function () { return state; } };
  }
  window.InkWriter = { mount: mount };
})();
