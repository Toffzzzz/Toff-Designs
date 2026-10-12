/*
 * Opening page — "From sketch to site".
 * An ink sketch of a website draws itself inside a browser window (a phone on
 * small screens); the sketched button is pressed and colour spreads out from it,
 * turning the sketch into a finished website; then one line draws down to the
 * bottom of the screen, where the handwriting line carries on.
 *
 * Follows the studio motion rules: plays once when shown, never reverses or
 * replays while you're on the page, plays again when you come back to the page
 * (Back/Forward, bfcache) and it's on screen (or when you scroll up to it),
 * and with reduced motion it's shown finished at once. No libraries.
 *
 * Usage: <section id="opening" class="opening">…markup from opening.html…</section>
 *        <script src="assets/opening/opening.js"></script>
 *        <script>Opening.mount(document.getElementById('opening'))</script>
 */
(function () {
  'use strict';
  var DEFAULTS = {
    sketchSeconds: 2.3,    // the whole sketch draws in about this long
    overlap: 0.45,         // each stroke starts when the previous one is this far from finishing (0 = no overlap)
    pressAt: 0.25,         // pause before the button press, seconds
    revealDuration: 1.25,  // colour spreading from the button, seconds
    lineDuration: 0.9,     // the line down to the next section, seconds
    settleMs: 450
  };

  function navType() { try { var e = performance.getEntriesByType('navigation')[0]; if (e) return e.type; } catch (x) {} return 'navigate'; }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function mount(root, options) {
    var o = {}, k; for (k in DEFAULTS) o[k] = DEFAULTS[k]; for (k in (options || {})) o[k] = options[k];
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var st = { raf: 0, played: false, playing: false };
    if (o.photo) [].slice.call(root.querySelectorAll('.r-photo')).forEach(function (im) { im.setAttribute('href', o.photo); });   // a real photo in the finished site (otherwise the drawn hills stay)

    function current() {   // the visible variant (desktop browser or phone)
      var vs = root.querySelectorAll('.op-variant');
      for (var i = 0; i < vs.length; i++) if (vs[i].offsetParent !== null) return vs[i];
      return vs[0];
    }

    function strokesOf(v) {
      return [].slice.call(v.querySelectorAll('.op-sketch [data-draw]')).sort(function (a, b) {
        return (+a.getAttribute('data-draw')) - (+b.getAttribute('data-draw'));
      });
    }

    function reset(v) {
      cancelAnimationFrame(st.raf);
      root.classList.remove('op-done');
      strokesOf(v).forEach(function (p) {
        var L = p.getTotalLength(); p._L = L;
        p.style.visibility = 'hidden';                    // hidden, never a zero-length dash (it shows as a dot)
        p.style.strokeDasharray = L + ' ' + (L + 4);
        p.style.strokeDashoffset = L;
      });
      var sk = v.querySelector('.op-sketch'); sk.style.opacity = 1;
      var btn = v.querySelector('.op-sketch-button'); if (btn) btn.style.transform = '';
      var real = v.querySelector('.op-real'); real.style.clipPath = 'circle(0% at ' + real.getAttribute('data-origin') + ')';
      real.style.webkitClipPath = real.style.clipPath; real.style.visibility = 'hidden';
      var line = root.querySelector('.op-line-bar');
      if (line) { line.style.visibility = 'hidden'; line.style.transform = 'scaleY(0)'; }
      root.querySelectorAll('.op-fade').forEach(function (e) { e.classList.remove('op-in'); });
    }

    function finish(v) {
      cancelAnimationFrame(st.raf);
      strokesOf(v).forEach(function (p) { p.style.visibility = 'visible'; p.style.strokeDashoffset = 0; });
      v.querySelector('.op-sketch').style.opacity = 0;
      var real = v.querySelector('.op-real'); real.style.visibility = 'visible'; real.style.clipPath = 'none'; real.style.webkitClipPath = 'none';
      var line = root.querySelector('.op-line-bar'); if (line) { line.style.visibility = 'visible'; line.style.transform = 'scaleY(1)'; }
      root.querySelectorAll('.op-fade').forEach(function (e) { e.classList.add('op-in'); });
      root.classList.add('op-done');
      st.played = true; st.playing = false;
    }

    function play() {
      var v = current(); if (!v) return;
      reset(v); st.played = true; st.playing = true;
      root.querySelectorAll('.op-fade').forEach(function (e) { e.classList.add('op-in'); });
      var strokes = strokesOf(v);
      // timeline: share the sketch time by stroke length, strokes overlapping like a quick, confident hand
      var total = 0; strokes.forEach(function (p) { total += Math.sqrt(p._L); });   // sqrt: long outlines don't hog the time
      var budget = o.sketchSeconds / (1 + 0.0), t = 0.35, plan = [], end = t;
      var scaleT = budget / Math.max(1e-6, total * (1 - o.overlap) + Math.sqrt(strokes[strokes.length - 1]._L) * o.overlap);
      strokes.forEach(function (p) {
        var d = Math.max(0.08, Math.sqrt(p._L) * scaleT);
        plan.push({ p: p, t0: t, t1: t + d }); end = Math.max(end, t + d); t += d * (1 - o.overlap);
      });
      t = end;
      var tPress = t + o.pressAt, tReveal = tPress + 0.22, tRevealEnd = tReveal + o.revealDuration, tLine = tRevealEnd - 0.15, tEnd = tLine + o.lineDuration;
      var btn = v.querySelector('.op-sketch-button'), real = v.querySelector('.op-real'), sk = v.querySelector('.op-sketch');
      var line = root.querySelector('.op-line-bar'), origin = real.getAttribute('data-origin');
      var start = null;
      function f(now) {
        if (start === null) start = now;
        var s = (now - start) / 1000;
        plan.forEach(function (x) {
          if (s < x.t0) return;
          x.p.style.visibility = 'visible';
          var q = Math.min(1, (s - x.t0) / (x.t1 - x.t0));
          x.p.style.strokeDashoffset = x.p._L * (1 - easeInOut(q));
        });
        if (btn && s >= tPress) {
          var q2 = Math.min(1, (s - tPress) / 0.22);
          btn.style.transform = 'scale(' + (1 - 0.07 * Math.sin(Math.PI * q2)) + ')';
        }
        if (s >= tReveal) {
          real.style.visibility = 'visible';
          var q3 = easeInOut(Math.min(1, (s - tReveal) / o.revealDuration));
          var c = 'circle(' + (q3 * 150).toFixed(2) + '% at ' + origin + ')';
          real.style.clipPath = c; real.style.webkitClipPath = c;
          sk.style.opacity = String(1 - Math.max(0, Math.min(1, (q3 - 0.55) / 0.45)));
        }
        if (line && s >= tLine) {
          line.style.visibility = 'visible';
          line.style.transform = 'scaleY(' + easeOut(Math.min(1, (s - tLine) / o.lineDuration)).toFixed(4) + ')';
        }
        if (s < tEnd) st.raf = requestAnimationFrame(f);
        else finish(v);
      }
      st.raf = requestAnimationFrame(f);
    }

    function inView() { var r = root.getBoundingClientRect(); return r.bottom > window.innerHeight * 0.3 && r.top < window.innerHeight * 0.7; }

    function arm() {
      // play when the opening is on screen and hasn't played yet on this visit
      function check() { if (!st.played && inView()) play(); }
      window.addEventListener('scroll', check, { passive: true });
      window.addEventListener('resize', function () { if (st.played && !st.playing) finish(current()); });
      return check;
    }

    var check = arm();
    if (reduce) { finish(current()); }
    else {
      var t = navType();
      if ((t === 'navigate' || t === 'reload') && !location.hash) play();             // fresh visit: opens at the top
      else setTimeout(function () { reset(current()); check(); }, o.settleMs);         // coming back: wait for the scroll to settle
    }
    window.addEventListener('pageshow', function (e) {                                 // bfcache: start afresh
      if (!e.persisted) return;
      if (reduce) { finish(current()); return; }
      st.played = false; reset(current());
      setTimeout(check, o.settleMs);
    });
    return { replay: play, finish: function () { finish(current()); }, isDone: function () { return root.classList.contains('op-done'); } };
  }

  window.Opening = { mount: mount, defaults: DEFAULTS };
})();
