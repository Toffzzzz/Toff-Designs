/*
 * How it works: a hand-drawn gold line wanders from step to step and draws itself once when the section
 * comes into view; each step appears as the pen reaches it. It never reverses or replays.
 * Reduced motion shows it finished.   Process.mount(document.getElementById('how-it-works'))
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function mount(root) {
    var box = root.querySelector('.pr'), svg = root.querySelector('.pr-ink'), steps = [].slice.call(root.querySelectorAll('.pr-step'));
    var state = 'idle', raf = 0, path, shadow, circles = [], stopsAt = [];
    function wobble(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 - 0.5; }; }
    function build() {
      var b = box.getBoundingClientRect(), r = wobble(7), pts = [];
      var dots = steps.map(function (s) { var d = s.querySelector('.pr-dot').getBoundingClientRect(); return [d.left - b.left, d.top - b.top]; });
      var vertical = dots.length > 1 && Math.abs(dots[1][0] - dots[0][0]) < 20;
      var first = dots[0], last = dots[dots.length - 1];
      pts.push(vertical ? [first[0], first[1] - 30] : [first[0] - 40, first[1] + 10]);
      dots.forEach(function (d, i) {
        pts.push(d);
        var n = dots[i + 1]; if (!n) return;
        pts.push(vertical ? [d[0] + 14 * (i % 2 ? -1 : 1), (d[1] + n[1]) / 2] : [(d[0] + n[0]) / 2, Math.min(d[1], n[1]) - 18 + r() * 24]);   // a loose, hand-made curve between stops
      });
      pts.push(vertical ? [last[0], last[1] + 40] : [last[0] + Math.min(140, b.width - last[0] - 4), last[1] - 14]);
      var dStr = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
      for (var i = 0; i < pts.length - 1; i++) {                 // Catmull-Rom through the points, handles kept short
        var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, t = 0.16;
        dStr += ' C' + (p1[0] + (p2[0] - p0[0]) * t).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) * t).toFixed(1) + ' ' + (p2[0] - (p3[0] - p1[0]) * t).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) * t).toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
      }
      // a hand-drawn feel: walk along the smooth curve and let the pen drift slightly, as a real line would
      var tmp = document.createElementNS(NS, 'path'); tmp.setAttribute('d', dStr); svg.appendChild(tmp);
      var TL = tmp.getTotalLength(), n = Math.max(12, Math.round(TL / 9)), q = [], ph = 1.7;
      for (var k = 0; k <= n; k++) {
        var at = TL * k / n, p1 = tmp.getPointAtLength(at), p2 = tmp.getPointAtLength(Math.min(TL, at + 1)), ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        var off = Math.sin(k * 0.37 + ph) * 0.9 + Math.sin(k * 0.11) * 1.4 + r() * 0.5;
        q.push([p1.x - Math.sin(ang) * off, p1.y + Math.cos(ang) * off]);
      }
      dStr = 'M' + q[0][0].toFixed(1) + ' ' + q[0][1].toFixed(1);
      for (var m = 1; m < q.length - 1; m++) dStr += ' Q' + q[m][0].toFixed(1) + ' ' + q[m][1].toFixed(1) + ' ' + ((q[m][0] + q[m + 1][0]) / 2).toFixed(1) + ' ' + ((q[m][1] + q[m + 1][1]) / 2).toFixed(1);
      dStr += ' L' + q[q.length - 1][0].toFixed(1) + ' ' + q[q.length - 1][1].toFixed(1);
      svg.innerHTML = ''; svg.setAttribute('viewBox', '0 0 ' + b.width.toFixed(0) + ' ' + b.height.toFixed(0));
      shadow = document.createElementNS(NS, 'path'); shadow.setAttribute('class', 'pr-shadow'); shadow.setAttribute('d', dStr); shadow.setAttribute('transform', 'translate(1.5 2)');
      path = document.createElementNS(NS, 'path'); path.setAttribute('d', dStr);
      svg.appendChild(shadow); svg.appendChild(path);
      var L = path.getTotalLength(); path.style.strokeDasharray = shadow.style.strokeDasharray = L + ' ' + L;
      circles = dots.map(function (d) { var c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', d[0]); c.setAttribute('cy', d[1]); c.setAttribute('r', 6); svg.appendChild(c); return c; });
      stopsAt = dots.map(function (d) { var best = 0, bd = 1e9; for (var s = 0; s <= 200; s++) { var p = path.getPointAtLength(L * s / 200), dd = Math.hypot(p.x - d[0], p.y - d[1]); if (dd < bd) { bd = dd; best = s / 200; } } return best; });
      return L;
    }
    function set(k) {
      var L = path.getTotalLength();
      [path, shadow].forEach(function (p) { p.style.strokeDashoffset = (L * (1 - k)).toFixed(1); p.style.visibility = k > 0 ? 'visible' : 'hidden'; });
      circles.forEach(function (c, i) { var on = k >= stopsAt[i] - 0.005; c.style.visibility = on ? 'visible' : 'hidden'; steps[i].classList.toggle('pr-reached', on); });
    }
    function play() {
      if (state !== 'idle') return;
      if (reduce) { state = 'done'; set(1); box.classList.add('pr-drawn'); return; }
      state = 'drawing'; var L = path.getTotalLength(), dur = Math.max(2200, Math.min(4200, L / 0.42)), t0 = null;
      function f(now) { if (t0 == null) t0 = now; var t = Math.min(1, (now - t0) / dur), k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; set(k); if (t < 1) raf = requestAnimationFrame(f); else { state = 'done'; box.classList.add('pr-drawn'); } }
      raf = requestAnimationFrame(f);
    }
    build(); set(0);
    var lastW = box.clientWidth;
    if ('ResizeObserver' in window) new ResizeObserver(function () { if (Math.abs(box.clientWidth - lastW) < 2) return; lastW = box.clientWidth; cancelAnimationFrame(raf); build(); if (state === 'idle') set(0); else { state = 'done'; set(1); box.classList.add('pr-drawn'); } }).observe(box);
    if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); play(); } }, { threshold: 0.35 }); io.observe(box); } else play();
    return { state: function () { return state; }, play: play };
  }
  window.Process = { mount: mount };
})();
