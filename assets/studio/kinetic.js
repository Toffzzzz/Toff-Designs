/*
 * Kinetic type: letters in big headings thicken as the pointer passes over them, like ink pooling under a pen
 * (Cormorant Garamond is a variable font, so the weight changes smoothly). Laptops only; off for reduced motion.
 *   Kinetic.mount('.r3-h2')
 */
(function () {
  'use strict';
  function mount(selector, options) {
    var o = options || {}, min = o.min || 300, max = o.max || 680, radius = o.radius || 150;
    var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return { enabled: false };
    var heads = [].slice.call(document.querySelectorAll(selector));
    heads.forEach(function (h) {
      if (h.getAttribute('data-kt')) return;
      var text = h.textContent; h.setAttribute('aria-label', text); h.setAttribute('data-kt', '1');
      var wrap = document.createElement('span'); wrap.setAttribute('aria-hidden', 'true');
      text.split(/(\s+)/).forEach(function (part) {
        if (/^\s+$/.test(part)) { wrap.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement('span'); w.className = 'kt-w';
        part.split('').forEach(function (ch) { var s = document.createElement('span'); s.className = 'kt-l'; s.textContent = ch; w.appendChild(s); });
        wrap.appendChild(w);
      });
      h.textContent = ''; h.appendChild(wrap);
      h._letters = [].slice.call(h.querySelectorAll('.kt-l'));
    });
    var active = null, raf = 0, px = 0, py = 0;
    function frame() {
      raf = 0; if (!active) return;
      var settled = true;
      active._letters.forEach(function (l) {
        var r = l.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var d = Math.hypot(px - cx, (py - cy) * 1.4), k = Math.max(0, 1 - d / radius); k = k * k * (3 - 2 * k);
        var target = min + (max - min) * k, cur = l._w || min, nw = cur + (target - cur) * 0.25;
        if (Math.abs(nw - target) > 1) settled = false;
        l._w = nw; l.style.fontWeight = Math.round(nw);
      });
      if (!settled) raf = requestAnimationFrame(frame);
    }
    heads.forEach(function (h) {
      h.addEventListener('pointermove', function (e) { active = h; px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(frame); });
      h.addEventListener('pointerleave', function () { px = py = -1e5; if (!raf) raf = requestAnimationFrame(frame); });
    });
    return { enabled: true, count: heads.length };
  }
  window.Kinetic = { mount: mount };
})();
