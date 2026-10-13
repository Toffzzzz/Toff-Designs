/*
 * Handwriting line — draws the opening phrases as one calm, continuous pen line.
 *
 * Motion rules (from the studio master prompt):
 *  - Laptops/desktops: drawing follows the scroll. Phrase 1 writes itself when
 *    the page opens; each later phrase writes at a steady pace while its
 *    baseline passes from writeStart to writeEnd down the screen; the line
 *    between phrases reaches down towards the next one.
 *  - Phones: each part writes itself at a natural pace when it is reached.
 *  - The browser's own continuous scrolling; nothing is pinned.
 *  - While on the page nothing runs backwards, snaps back, freezes or replays.
 *  - Coming back to the page (Back/Forward, bfcache, Safari's late scroll
 *    restore, or a link to a section): you stay where you were; what's on
 *    screen draws itself again; what's below draws as you scroll down; what's
 *    above draws itself as you scroll back up to it.
 *  - Jumping down the page: the part you land on draws itself.
 *  - A fresh visit opens at the top. Reduced motion shows everything finished.
 *
 * Usage:
 *   <div id="hw"></div>
 *   <script src="assets/handwriting/handwriting.js"></script>
 *   <script>Handwriting.mount(document.getElementById('hw'), { basePath: 'assets/handwriting/' })</script>
 */
(function () {
  'use strict';

  var DEFAULTS = {
    basePath: '',
    data: null,                   // { desktop: {svg, meta}, mobile: {svg, meta} } (default: window.HANDWRITING_DATA)
    breakpoint: 700,              // below this width: phone layout, each part writes itself
    color: '#F1E3C6',                    // cream ink (Midnight & Gold palette)
    strokePx: { desktop: 3.2, mobile: 2.6 },
    shadow: { color: 'rgba(216,172,95,0.30)', offsetPx: 3.5, extraWidthPx: 1.2, blurPx: 0, lag: 0.22 },   // blurPx > 0 costs smoothness on long lines
    writeStart: 0.86,             // a phrase starts writing when its baseline is 86% down the screen
    writeEnd: 0.56,               // ...and has finished when its baseline reaches 56% (still well in view)
    tailTip: 0.62,                // where the pen sits on screen as the final line runs down
    ease: 0.12,                   // seconds; how closely the pen follows the scroll on laptops
    maxSpeedPx: 3400,             // laptops: never draw faster than this (screen px of line per second)
    autoSpeedPx: 820,             // self-drawing parts (phrase 1 on load, phones, returns): pen speed
    phoneSpeedPx: 620,            // phones: pen speed
    phoneTrigger: 0.82,           // phones: a part starts when it reaches 82% down the screen
    jumpScreens: 1.2,
    minLinkScroll: 0.38,          // each connecting line gets at least this share of the gap between phrases (in scroll)             // a scroll jump bigger than this many screen heights counts as a jump
    settleMs: 450,                // wait this long after load for a browser to restore the scroll position
    introOnLoad: true,            // true: phrase 1 writes itself when the page opens (use false when an
                                  // opening page sits above, so it writes as you scroll to it instead)
    entryTip: 0.70,               // while the entry line runs in from the top, the pen sits 70% down the screen
    onProgress: null,
    onComplete: null
  };

  function merge(a, b) {
    var o = {}, k;
    for (k in a) o[k] = a[k];
    for (k in (b || {})) o[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') ? merge(a[k], b[k]) : b[k];
    return o;
  }
  function fetchText(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(url + ' ' + r.status); return r.text(); }); }
  function navType() {
    try { var e = performance.getEntriesByType('navigation')[0]; if (e) return e.type; } catch (err) {}
    return 'navigate';
  }

  // ------------------------------------------------------------------ fresh visits open at the top
  (function openAtTop() {
    if (window.__toffOpenedAtTop) return;   // round 05: boot.js / motion.js already did this (and this script may load after the visitor has scrolled)
    var t = navType();
    if ((t === 'navigate' || t === 'reload') && !location.hash) {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
      // let Back/Forward restore normally later on
      window.addEventListener('load', function () { setTimeout(function () { if ('scrollRestoration' in history) history.scrollRestoration = 'auto'; }, 0); });
    }
  })();

  function mount(el, options) {
    var o = merge(DEFAULTS, options);
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var st = {
      layout: null, meta: null, svg: null, ink: [], shadow: [], starts: [], lens: [], total: 0,
      units: [], samples: null, mapS: null, mapF: null,
      G: 0, Gmax: 0,               // laptops: eased scroll-driven pen position (absolute length)
      shadowLag: [],               // per-unit shadow lengths
      settled: false, lastScroll: 0, last: 0, raf: 0, complete: false
    };

    function layoutName() { return window.innerWidth < o.breakpoint ? 'mobile' : 'desktop'; }
    function scale() { return st.svg.getBoundingClientRect().width / st.meta.width; }
    function svgTop() { return st.svg.getBoundingClientRect().top + window.scrollY; }

    function load(name) {
      var src = o.data || window.HANDWRITING_DATA;   // round 05: options.data = { desktop, mobile } lets a page mount several lines
      var bundled = src && src[name];
      // bundled data (line-data.js) renders straight away, before the page's load event,
      // so the page has its full height when the browser restores the scroll position
      var got = bundled ? Promise.resolve([bundled.svg, JSON.stringify(bundled.meta)])
                        : Promise.all([fetchText(o.basePath + 'line-' + name + '.svg'), fetchText(o.basePath + 'line-' + name + '.json')]);
      return got.then(function (r) {
        el.innerHTML = r[0];
        st.layout = name; st.meta = JSON.parse(r[1]); st.svg = el.querySelector('svg');
        st.svg.setAttribute('class', 'hw-svg');
        var s = st.svg.style; s.display = 'block'; s.width = '100%'; s.height = 'auto'; s.overflow = 'visible';
        st.ink = [].slice.call(st.svg.querySelectorAll('.hw-ink path'));
        st.shadow = [].slice.call(st.svg.querySelectorAll('.hw-shadow path'));
        st.starts = []; st.lens = []; var acc = 0;
        st.ink.forEach(function (p) { var L = p.getTotalLength(); st.starts.push(acc); st.lens.push(L); acc += L; });
        st.total = acc;
        st.ink.concat(st.shadow).forEach(function (p) { p.style.visibility = 'hidden'; p._da = 'hidden'; });
        style(); sample(); makeUnits(); buildMap();
      });
    }

    function style() {
      var s = scale(), w = (st.layout === 'mobile' ? o.strokePx.mobile : o.strokePx.desktop) / s;
      var ink = st.svg.querySelector('.hw-ink'), sh = st.svg.querySelector('.hw-shadow');
      ink.setAttribute('stroke', o.color); ink.setAttribute('stroke-width', w);
      sh.setAttribute('stroke', o.shadow.color); sh.setAttribute('stroke-width', w + o.shadow.extraWidthPx / s);
      sh.setAttribute('transform', 'translate(0,' + (o.shadow.offsetPx / s) + ')');
      sh.style.filter = o.shadow.blurPx ? 'blur(' + o.shadow.blurPx + 'px)' : '';
    }

    // (length, y) samples along the whole line
    function sample() {
      var step = Math.max(4, st.total / 2500), out = [], idx = 0;
      for (var L = 0; L <= st.total + 0.01; L += step) {
        while (idx < st.ink.length - 1 && L > st.starts[idx] + st.lens[idx]) idx++;
        var pt = st.ink[idx].getPointAtLength(Math.max(0, Math.min(st.lens[idx], L - st.starts[idx])));
        out.push([L, pt.y]);
      }
      st.samples = out;
    }

    // Units: each phrase's handwriting, and each connecting line, in pen order.
    function makeUnits() {
      var ph = st.meta.phrases, T = st.total, u = [];
      if (ph[0].startFrac > 0) u.push({ a: 0, b: ph[0].startFrac * T, kind: 'entry', k: -1 });   // line in from the top
      for (var k = 0; k < ph.length; k++) {
        u.push({ a: ph[k].startFrac * T, b: ph[k].endFrac * T, kind: 'phrase', k: k });
        u.push({ a: ph[k].endFrac * T, b: (k + 1 < ph.length ? ph[k + 1].startFrac * T : T), kind: 'link', k: k });
      }
      u = u.filter(function (x) { return x.b - x.a > 0.5; });
      u.forEach(function (x) {
        var y0 = Infinity, y1 = -Infinity;
        st.samples.forEach(function (s) { if (s[0] >= x.a - 4 && s[0] <= x.b + 4) { y0 = Math.min(y0, s[1]); y1 = Math.max(y1, s[1]); } });
        x.y0 = y0; x.y1 = y1;
        x.mode = 'scroll';   // 'scroll' (follows the pen G) or 'auto' (draws itself when in view)
        x.d = 0;             // drawn length within the unit
        x.sd = 0;            // shadow drawn length
      });
      st.units = u;
    }

    // Laptops: scroll position -> pen position (absolute length), monotonic
    function buildMap() {
      var s = scale(), top = svgTop(), vh = window.innerHeight, ph = st.meta.phrases, T = st.total, S = [], F = [];
      function push(sc, len) {
        if (S.length && sc < S[S.length - 1]) sc = S[S.length - 1];
        if (F.length && len < F[F.length - 1]) len = F[F.length - 1];
        S.push(sc); F.push(len);
      }
      function at(base, frac) { return top + base * s - frac * vh; }
      if (o.introOnLoad) push(-1e9, ph[0].endFrac * T);             // phrase 1 writes itself on load
      else {
        push(-1e9, 0);
        if (ph[0].startFrac > 0) {                                    // entry line: follows the scroll by height
          var e0 = top - o.entryTip * vh, e1 = at(ph[0].baseline, o.writeEnd) - Math.min((o.writeStart - o.writeEnd) * vh, (1 - o.minLinkScroll) * ph[0].baseline * s), yE = ph[0].capTop;
          push(e0, 0);
          for (var j = 0; j < st.samples.length; j++) {
            var LL = st.samples[j][0]; if (LL >= ph[0].startFrac * T) break;
            var tt = Math.max(0, Math.min(1, st.samples[j][1] / Math.max(1, yE)));
            push(e0 + (e1 - e0) * tt, LL);
          }
        }
      }
      // Each phrase writes while its baseline rises to writeEnd (just above mid-screen). Its writing
      // window is the usual (writeStart - writeEnd) of the screen, but never more than (1 - minLinkScroll)
      // of the gap above it, so the connecting line before it always gets a fair share of the scroll.
      function win(k) {
        var gap = (k > 0 ? ph[k].baseline - ph[k - 1].baseline : ph[0].baseline) * s;
        return Math.min((o.writeStart - o.writeEnd) * vh, (1 - o.minLinkScroll) * gap);
      }
      for (var k = 0; k < ph.length; k++) {
        var a = ph[k];
        if (k > 0 || !o.introOnLoad) {
          var w1 = at(a.baseline, o.writeEnd);
          push(w1 - win(k), a.startFrac * T); push(w1, a.endFrac * T);
        }
        else push(Math.max(0, at(a.baseline, o.writeEnd)), a.endFrac * T);
        var fromL = a.endFrac * T, toL = k + 1 < ph.length ? ph[k + 1].startFrac * T : T;
        var s0 = S[S.length - 1], s1 = k + 1 < ph.length ? at(ph[k + 1].baseline, o.writeEnd) - win(k + 1) : top + st.meta.height * s - o.tailTip * vh;
        var y0 = a.baseline, y1 = k + 1 < ph.length ? ph[k + 1].capTop : st.meta.height;
        for (var i = 0; i < st.samples.length; i++) {
          var L = st.samples[i][0]; if (L <= fromL || L >= toL) continue;
          var t = Math.max(0, Math.min(1, (st.samples[i][1] - y0) / Math.max(1, y1 - y0)));
          push(s0 + (s1 - s0) * t, L);
        }
        push(s1, toL);
      }
      st.mapS = S; st.mapF = F;
    }
    function penAtScroll(y) {
      var maxY = document.documentElement.scrollHeight - window.innerHeight;
      if (y >= maxY - 2 && maxY > 0) return st.total;                 // reaching the bottom always finishes the line
      var S = st.mapS, F = st.mapF, lo = 0, hi = S.length - 1;
      if (y <= S[0]) return F[0]; if (y >= S[hi]) return F[hi];
      while (hi - lo > 1) { var m = (lo + hi) >> 1; if (S[m] <= y) lo = m; else hi = m; }
      return F[lo] + (F[hi] - F[lo]) * (y - S[lo]) / Math.max(1e-6, S[hi] - S[lo]);
    }

    function inView(u, bottomFrac) {
      var s = scale(), top = st.svg.getBoundingClientRect().top, vh = window.innerHeight;
      var y0 = top + u.y0 * s, y1 = top + u.y1 * s;
      return y1 > 0 && y0 < vh * (bottomFrac == null ? 1 : bottomFrac);
    }
    function isAbove(u) { var s = scale(), top = st.svg.getBoundingClientRect().top; return top + u.y1 * s <= 0; }

    // Start (or restart) from wherever the page is now: on-screen parts draw
    // themselves, parts above wait until you scroll back up, parts below follow the scroll.
    function startFromHere() {
      var phone = st.layout === 'mobile';
      var atTop = window.scrollY < 4;
      var keep = atTop ? st.units[0].d : 0, keepS = atTop ? st.units[0].sd : 0;   // keep phrase 1's progress if it started on load
      st.units.forEach(function (u) { u.d = 0; u.sd = 0; });
      st.units[0].d = keep; st.units[0].sd = keepS;
      if (phone) { st.units.forEach(function (u) { u.mode = 'auto'; }); return; }
      if (atTop) {
        // whatever is on screen when the page opens writes itself, in order, at a natural pace
        var pen0 = Math.max(o.introOnLoad ? st.units[0].b : 0, penAtScroll(0));
        st.units.forEach(function (u, i) { u.mode = ((o.introOnLoad && i === 0) || u.a < pen0 - 0.5) ? 'auto' : 'scroll'; });
        st.units.forEach(function (u) { if (u.mode === 'auto' && u.b > pen0) pen0 = u.b; });
        st.G = st.Gmax = pen0;
        return;
      }
      var pen = penAtScroll(window.scrollY);
      st.units.forEach(function (u) { u.mode = (u.a < pen && (inView(u) || isAbove(u))) ? 'auto' : 'scroll'; });
      st.units.forEach(function (u) { if (u.mode === 'auto' && u.b > pen) pen = u.b; });
      st.G = st.Gmax = pen;
    }

    // Big jumps (section links, scrollbar drags): what you land on draws itself;
    // what you skipped above draws itself if you scroll back up to it.
    function onJump() {
      if (st.layout === 'mobile') return;
      var pen = penAtScroll(window.scrollY);
      st.units.forEach(function (u) {
        if (u.mode === 'scroll' && u.d < u.b - u.a - 0.5 && u.a < pen && (inView(u) || isAbove(u))) u.mode = 'auto';
      });
      st.units.forEach(function (u) { if (u.mode === 'auto' && u.b > pen) pen = u.b; });
      st.G = st.Gmax = Math.max(st.Gmax, pen);
    }

    function step(dt) {
      var s = scale(), phone = st.layout === 'mobile', i, u;
      if (!phone) {
        var target = Math.max(st.Gmax, penAtScroll(window.scrollY)); st.Gmax = target;
        var gap = target - st.G;
        if (gap > 0) { var inc = Math.min(gap * (1 - Math.exp(-dt / o.ease)), o.maxSpeedPx / s * dt); st.G = gap - inc < 0.5 ? target : st.G + inc; }
      }
      var prevDone = true;
      for (i = 0; i < st.units.length; i++) {
        u = st.units[i]; var len = u.b - u.a;
        if (u.mode === 'scroll') {
          u.d = Math.max(u.d, Math.max(0, Math.min(len, st.G - u.a)));     // never backwards
        } else if (u.d < len) {
          var ready = phone ? (inView(u, o.phoneTrigger) && prevDone) : (inView(u) && (prevDone || !inView(st.units[i - 1] || u)));
          if (!st.settled) ready = ready && o.introOnLoad && i === 0 && window.scrollY < 4;
          if (u.d > 0 && st.settled) ready = true;            // once started, always finish
          if (ready) u.d = Math.min(len, u.d + (phone ? o.phoneSpeedPx : o.autoSpeedPx) / s * dt);
        }
        prevDone = u.d >= len - 0.5;
        var sg = u.d - u.sd; u.sd += sg * (1 - Math.exp(-dt / o.shadow.lag)); if (sg < 0.5) u.sd = u.d;
      }
    }

    // Draw each path from the union of the drawn intervals that cross it.
    function paint(group, key) {
      for (var p = 0; p < group.length; p++) {
        var s0 = st.starts[p], L = st.lens[p], parts = [], cursor = 0;
        for (var i = 0; i < st.units.length; i++) {
          var u = st.units[i], from = Math.max(u.a, s0), to = Math.min(u.a + u[key], s0 + L);
          if (to - from > 0.01) parts.push([from - s0, to - s0]);
        }
        var da, off = 0, hidden = !parts.length;
        if (!hidden) {
          parts.sort(function (x, y) { return x[0] - y[0]; });
          var m = [parts[0].slice()];                       // merge touching intervals
          for (i = 1; i < parts.length; i++) { var last = m[m.length - 1]; if (parts[i][0] <= last[1] + 0.05) last[1] = Math.max(last[1], parts[i][1]); else m.push(parts[i].slice()); }
          // Never use a zero-length dash: with round pen ends it shows as a dot.
          // Pattern = dash, gap, dash, gap, ... dash, long gap; shifted to the first interval.
          var arr = [];
          for (i = 0; i < m.length; i++) {
            arr.push((m[i][1] - m[i][0]).toFixed(2));
            arr.push((i + 1 < m.length ? m[i + 1][0] - m[i][1] : L + 10).toFixed(2));
          }
          da = arr.join(' '); off = -m[0][0];
        } else { da = 'none'; }
        var key2 = hidden ? 'hidden' : da + '|' + off.toFixed(2);
        if (group[p]._da !== key2) {
          group[p]._da = key2;
          group[p].style.visibility = hidden ? 'hidden' : 'visible';
          if (!hidden) { group[p].style.strokeDasharray = da; group[p].style.strokeDashoffset = off; }
        }
      }
    }

    function drawnTotal() { var t = 0; st.units.forEach(function (u) { t += u.d; }); return t; }

    function frame(now) {
      st.raf = requestAnimationFrame(frame);
      var dt = Math.min(0.05, (now - (st.last || now)) / 1000); st.last = now;
      if (!st.svg) return;
      var y = window.scrollY;
      if (st.settled && Math.abs(y - st.lastScroll) > o.jumpScreens * window.innerHeight) onJump();
      st.lastScroll = y;
      step(dt);
      paint(st.ink, 'd'); paint(st.shadow, 'sd');
      var f = drawnTotal() / st.total;
      if (o.onProgress) o.onProgress(f);
      if (!st.complete && f > 0.9995) { st.complete = true; if (o.onComplete) o.onComplete(); }
    }

    function finishAll() { st.units.forEach(function (u) { u.d = u.sd = u.b - u.a; u.mode = 'scroll'; }); st.G = st.Gmax = st.total; paint(st.ink, 'd'); paint(st.shadow, 'sd'); }

    // Wait for the page to settle (some browsers, e.g. Safari, restore the
    // scroll position only after load), or for the visitor to scroll first.
    function settle() {
      if (st.settled) return;
      st.settled = true; buildMap(); startFromHere(); st.lastScroll = window.scrollY;
    }
    function armSettle() {
      st.settled = false;
      var done = false;
      function go() { if (done) return; done = true; ['wheel', 'touchstart', 'keydown'].forEach(function (e) { window.removeEventListener(e, go, true); }); settle(); }
      ['wheel', 'touchstart', 'keydown'].forEach(function (e) { window.addEventListener(e, go, true); });
      var wait = function () { setTimeout(go, o.settleMs); };
      if (document.readyState === 'complete') wait(); else window.addEventListener('load', wait, { once: true });
    }

    var resizeTimer = 0;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var want = layoutName();
        if (want !== st.layout) load(want).then(function () { if (reduce) finishAll(); else { st.settled = true; startFromHere(); } });
        else if (st.svg) { style(); buildMap(); }
      }, 150);
    }

    // bfcache: coming back restores a finished page from memory, so start afresh
    window.addEventListener('pagehide', function () { if (st.units.length && !reduce) { st.units.forEach(function (u) { u.d = u.sd = 0; }); } });
    window.addEventListener('pageshow', function (e) {
      if (e.persisted && st.svg) { if (reduce) { finishAll(); return; } style(); buildMap(); st.settled = false; settle(); }
    });

    return load(layoutName()).then(function () {
      if (reduce) { finishAll(); }
      else {
        // until settled: only phrase 1 may draw, and only if we're at the top
        st.units.forEach(function (u) { u.mode = 'auto'; });
        armSettle();
        st.raf = requestAnimationFrame(frame);
      }
      window.addEventListener('resize', onResize);
      return {
        progress: function () { return st.total ? drawnTotal() / st.total : 0; },
        layout: function () { return st.layout; },
        meta: function () { return st.meta; },
        units: function () {
          var s = scale(), top = st.svg.getBoundingClientRect().top;
          return st.units.map(function (u) { return { kind: u.kind, k: u.k, mode: u.mode, frac: (u.d / (u.b - u.a)), top: top + u.y0 * s, bottom: top + u.y1 * s }; });
        },
        destroy: function () { cancelAnimationFrame(st.raf); window.removeEventListener('resize', onResize); }
      };
    });
  }

  window.Handwriting = { mount: mount, defaults: DEFAULTS };
})();
