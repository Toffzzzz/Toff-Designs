/*
 * Devices: scales what's inside a CSS laptop/phone to fit its screen, scrolls it like a screen
 * recording, and tilts a stage gently towards the mouse.
 *
 *   Devices.fit(screenEl, contentEl, designWidth)      // keep content scaled to the screen width
 *   var rec = Devices.record(screenEl, contentEl, { speed: 150 })   // screen-recording style scroll
 *   Devices.tilt(stageEl, innerEl, { maxX: 5, maxY: 7 })
 *
 * The recording plays only while on screen and never runs backwards: it scrolls down, holds,
 * fades to the top and starts again, like a looped video. Reduced motion: no recording, no tilt.
 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function fit(screen, content, designWidth) {
    function apply() {
      var w = screen.clientWidth; if (!w) return;
      var dw = designWidth || content.scrollWidth || w, s = w / dw;
      content.style.width = dw + 'px';
      content.style.setProperty('--dv-scale', s);
      content._dvScale = s;
      content.style.transform = 'translateY(' + (content._dvY || 0) + 'px) scale(' + s + ')';
    }
    apply();
    if ('ResizeObserver' in window) new ResizeObserver(apply).observe(screen);
    else window.addEventListener('resize', apply);
    return apply;
  }

  function setY(content, y) {
    content._dvY = y;
    content.style.transform = 'translateY(' + y + 'px) scale(' + (content._dvScale || 1) + ')';
  }
  function ease(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }

  function record(screen, content, opts) {
    var o = opts || {}, speed = o.speed || 150, holdTop = o.holdTop || 1400, holdEnd = o.holdEnd || 1600;
    var visible = false, raf = 0, phase = 'top', t0 = 0, paused = 0, dist = 0, dur = 0, stopped = false;
    if (reduce) return { stop: function () {}, playing: function () { return false; } };
    function measure() {
      var s = content._dvScale || 1;
      dist = Math.max(0, content.scrollHeight * s - screen.clientHeight);
      dur = dist / (speed * s) * 1000;                     // speed is in the site's own pixels per second
    }
    function frame(now) {
      raf = 0; if (!visible || stopped) return;
      var t = now - t0;
      if (phase === 'top') { if (t > holdTop) { measure(); phase = 'down'; t0 = now; } }
      else if (phase === 'down') {
        var f = dur ? Math.min(1, t / dur) : 1;
        setY(content, -dist * ease(f));
        if (f >= 1) { phase = 'end'; t0 = now; }
      } else if (phase === 'end') { if (t > holdEnd) { phase = 'fade'; t0 = now; content.style.transition = 'opacity .35s ease'; content.style.opacity = '0'; } }
      else if (phase === 'fade') {
        if (t > 380) { setY(content, 0); content.style.opacity = '1'; phase = 'back'; t0 = now; }
      } else if (phase === 'back') { if (t > 380) { content.style.transition = ''; phase = 'top'; t0 = now; } }
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf) { var n = performance.now(); t0 = n - (paused || 0); paused = 0; raf = requestAnimationFrame(frame); } }
    function pause() { if (raf) { cancelAnimationFrame(raf); raf = 0; paused = performance.now() - t0; } }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { visible = e.isIntersecting; if (visible) start(); else pause(); });
      }, { threshold: 0.25 }).observe(screen);
    } else { visible = true; start(); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else if (visible) start(); });
    return { stop: function () { stopped = true; pause(); setY(content, 0); }, playing: function () { return !!raf; }, phase: function () { return phase; } };
  }

  function tilt(stage, inner, opts) {
    var o = opts || {}, maxX = o.maxX == null ? 5 : o.maxX, maxY = o.maxY == null ? 7 : o.maxY;
    if (reduce || !finePointer) return;
    var tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    function frame() {
      x += (tx - x) * 0.08; y += (ty - y) * 0.08;
      inner.style.transform = 'rotateX(' + (-y * maxX).toFixed(3) + 'deg) rotateY(' + (x * maxY).toFixed(3) + 'deg)';
      if (Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001) raf = requestAnimationFrame(frame); else raf = 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width * 2 - 1));
      ty = Math.max(-1, Math.min(1, (e.clientY - r.top) / r.height * 2 - 1));
      kick();
    });
    stage.addEventListener('pointerleave', function () { tx = 0; ty = 0; kick(); });
  }

  window.Devices = { fit: fit, record: record, tilt: tilt };
})();
