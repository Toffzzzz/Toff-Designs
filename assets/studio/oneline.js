/*
 * Your logo, in one line: turns any image into a single continuous gold line and draws it.
 * Steps (all in the visitor's browser, nothing uploaded): shrink and grey the image -> scatter dots
 * where it's dark (more dots where darker) -> relax them so they spread evenly -> find one route
 * through every dot (nearest neighbour, then 2-opt untangling) -> smooth the route into curves -> draw it.
 *
 *   var ol = OneLine.mount(document.getElementById('one-line'), { examples: [{ label, src | text }] });
 *   ol.fromImage(img)   ol.fromText('T')   ol.svg()  (the finished drawing as an SVG file string)
 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SIZE = 360;                                         // working resolution
  function wait() { return new Promise(function (r) { setTimeout(r, 0); }); }
  function rng(seed) { var s = seed || 7; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  // 1. image -> darkness map (0 = paper, 1 = ink)
  function darkness(source, w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.drawImage(source, 0, 0, w, h);
    var d = g.getImageData(0, 0, w, h).data, n = w * h, v = new Float32Array(n), sum = 0, edge = 0, en = 0;
    for (var i = 0; i < n; i++) {
      var a = d[i * 4 + 3] / 255, l = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
      l = l * a + (1 - a); v[i] = 1 - l; sum += v[i];
      var x = i % w, y = (i / w) | 0; if (x < 3 || y < 3 || x > w - 4 || y > h - 4) { edge += v[i]; en++; }
    }
    if (edge / en > 0.5) for (i = 0; i < n; i++) v[i] = 1 - v[i];      // light drawing on a dark background: flip it
    var sorted = Array.prototype.slice.call(v).sort(function (a, b) { return a - b; });
    var mid = sorted[Math.floor(n * 0.5)], photo = mid > 0.12 && mid < 0.88;   // photos have lots of mid-tones; logos are mostly paper or ink
    var lo = sorted[Math.floor(n * 0.04)], hi = sorted[Math.floor(n * 0.995)] || 1, span = Math.max(0.05, hi - lo);
    for (i = 0; i < n; i++) { var t = Math.max(0, Math.min(1, (v[i] - lo) / span)); v[i] = Math.pow(t, photo ? 2.1 : 1.35); }
    if (photo) {                                            // add outlines (edge strength) so shapes read clearly
      var e = new Float32Array(n), emax = 0;
      for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) {
        var j = y * w + x, gx = v[j + 1] - v[j - 1] + 0.5 * (v[j - w + 1] - v[j - w - 1] + v[j + w + 1] - v[j + w - 1]), gy = v[j + w] - v[j - w] + 0.5 * (v[j + w - 1] - v[j - w - 1] + v[j + w + 1] - v[j - w + 1]);
        e[j] = Math.hypot(gx, gy); if (e[j] > emax) emax = e[j];
      }
      for (i = 0; i < n; i++) v[i] = Math.max(v[i] * 0.55, Math.min(1, e[i] / (emax * 0.45 || 1)));
    }
    return v;
  }

  // 2. dots where it's dark, then spread them out a little (cheap relaxation on a grid)
  function stipple(v, w, h, count, seed) {
    var r = rng(seed), pts = [], tries = 0, max = count * 60;
    while (pts.length < count && tries++ < max) {
      var x = r() * w, y = r() * h, k = v[(y | 0) * w + (x | 0)];
      if (r() < k) pts.push([x, y]);
    }
    for (var it = 0; it < 3; it++) {                      // push near neighbours apart
      var cell = Math.sqrt(w * h / Math.max(1, pts.length)) * 1.2, cols = Math.ceil(w / cell), rows = Math.ceil(h / cell), grid = {};
      pts.forEach(function (p, i) { var key = ((p[1] / cell) | 0) * cols + ((p[0] / cell) | 0); (grid[key] = grid[key] || []).push(i); });
      var moved = pts.map(function (p) { return [p[0], p[1]]; });
      pts.forEach(function (p, i) {
        var cx = (p[0] / cell) | 0, cy = (p[1] / cell) | 0, fx = 0, fy = 0;
        var local = cell * (0.35 + 0.65 * (1 - v[(p[1] | 0) * w + (p[0] | 0)]));
        for (var yy = cy - 1; yy <= cy + 1; yy++) for (var xx = cx - 1; xx <= cx + 1; xx++) {
          (grid[yy * cols + xx] || []).forEach(function (j) {
            if (j === i) return; var dx = p[0] - pts[j][0], dy = p[1] - pts[j][1], d = Math.hypot(dx, dy);
            if (d > 0 && d < local) { var f = (local - d) / local; fx += dx / d * f; fy += dy / d * f; }
          });
        }
        var nx = p[0] + fx * 0.6, ny = p[1] + fy * 0.6;
        if (v[(Math.max(0, Math.min(h - 1, ny)) | 0) * w + (Math.max(0, Math.min(w - 1, nx)) | 0)] > 0.05) { moved[i][0] = nx; moved[i][1] = ny; }
      });
      pts = moved;
    }
    return pts;
  }

  // 3. one route through every dot: nearest neighbour on a grid, then 2-opt untangling within a time budget
  function route(pts, budgetMs) {
    var n = pts.length; if (n < 3) return pts.slice();
    var cell = 12, grid = {}, cols = Math.ceil(SIZE / cell) + 2;
    pts.forEach(function (p, i) { var k = ((p[1] / cell) | 0) * cols + ((p[0] / cell) | 0); (grid[k] = grid[k] || []).push(i); });
    var used = new Uint8Array(n), order = [], cur = 0;
    for (var s = 0; s < n; s++) {
      order.push(cur); used[cur] = 1;
      var p = pts[cur], best = -1, bd = 1e18, cx = (p[0] / cell) | 0, cy = (p[1] / cell) | 0;
      for (var ring = 0; ring < 60 && best < 0; ring++) {
        for (var yy = cy - ring; yy <= cy + ring; yy++) for (var xx = cx - ring; xx <= cx + ring; xx++) {
          if (Math.max(Math.abs(yy - cy), Math.abs(xx - cx)) !== ring) continue;
          var list = grid[yy * cols + xx]; if (!list) continue;
          for (var q = 0; q < list.length; q++) { var j = list[q]; if (used[j]) continue; var dx = pts[j][0] - p[0], dy = pts[j][1] - p[1], d = dx * dx + dy * dy; if (d < bd) { bd = d; best = j; } }
        }
        if (best >= 0 && ring > 0) break;
      }
      if (best < 0) { for (var j2 = 0; j2 < n; j2++) if (!used[j2]) { best = j2; break; } }
      if (best < 0) break;
      cur = best;
    }
    var path = order.map(function (i) { return pts[i]; });
    // 2-opt with neighbour lists: for every point, try to untangle against its nearest neighbours wherever they
    // sit on the route. This removes crossings and the long straight jumps a nearest-neighbour route leaves.
    var t0 = performance.now(), K = 10, N = path.length;
    var D = function (a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); };
    var idx = new Map(); path.forEach(function (p, i) { idx.set(p, i); });
    var g2 = {}; path.forEach(function (p) { var k = ((p[1] / cell) | 0) * cols + ((p[0] / cell) | 0); (g2[k] = g2[k] || []).push(p); });
    var nbr = new Map();
    path.forEach(function (p) {
      var cx = (p[0] / cell) | 0, cy = (p[1] / cell) | 0, cand = [];
      for (var ring = 0; ring < 6 && cand.length < K * 2; ring++)
        for (var yy = cy - ring; yy <= cy + ring; yy++) for (var xx = cx - ring; xx <= cx + ring; xx++) {
          if (Math.max(Math.abs(yy - cy), Math.abs(xx - cx)) !== ring) continue;
          (g2[yy * cols + xx] || []).forEach(function (q) { if (q !== p) cand.push(q); });
        }
      cand.sort(function (a, b) { return D(p, a) - D(p, b); }); nbr.set(p, cand.slice(0, K));
    });
    function reverse(i, j) { while (i < j) { var t = path[i]; path[i] = path[j]; path[j] = t; idx.set(path[i], i); idx.set(path[j], j); i++; j--; } }
    var improved = true, rounds = 0;
    while (improved && performance.now() - t0 < budgetMs && rounds++ < 40) {
      improved = false;
      for (var i = 0; i < N - 1 && performance.now() - t0 < budgetMs; i++) {
        var a = path[i], b = path[i + 1], dab = D(a, b), list = nbr.get(a);
        for (var q = 0; q < list.length; q++) {
          var c = list[q], k = idx.get(c);
          if (D(a, c) >= dab) break;                      // neighbours are sorted: nothing closer can help
          if (k === i + 1 || k === i || k >= N - 1) continue;
          var d = path[k + 1];
          if (D(a, c) + D(b, d) < dab + D(c, d) - 1e-6) {
            if (k > i) reverse(i + 1, k); else reverse(k + 1, i);
            improved = true; b = path[i + 1]; dab = D(a, b);
          }
        }
        // the other direction: neighbours of b, joined through their predecessor
        var listB = nbr.get(b);
        for (q = 0; q < listB.length; q++) {
          var c2 = listB[q], k2 = idx.get(c2);
          if (D(b, c2) >= dab) break;
          if (k2 <= 0 || k2 === i || k2 === i + 1 || k2 === i + 2) continue;
          var e = path[k2 - 1];
          if (D(a, e) + D(b, c2) < dab + D(e, c2) - 1e-6) {
            if (k2 > i + 1) reverse(i + 1, k2 - 1); else reverse(k2, i);
            improved = true; b = path[i + 1]; dab = D(a, b); break;
          }
        }
      }
    }
    return fixJumps(path);
  }

  // Long jumps that are left join separate parts of the drawing. Lift the part after (or before) the longest
  // jump and re-insert it wherever it joins most cheaply, in either direction. Repeat for the next longest.
  function fixJumps(path) {
    var D = function (a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); };
    for (var round = 0; round < 40; round++) {
      var n = path.length, edges = [];
      for (var i = 0; i < n - 1; i++) edges.push([D(path[i], path[i + 1]), i]);
      var sorted = edges.map(function (e) { return e[0]; }).sort(function (a, b) { return a - b; }), med = sorted[Math.floor(sorted.length / 2)] || 1;
      edges.sort(function (a, b) { return b[0] - a[0]; });
      var done = false;
      for (var c = 0; c < 10 && !done && edges[c] && edges[c][0] > med * 3; c++) {      // try the ten longest jumps in turn
        var ml = edges[c][0], m = edges[c][1];
        var A = path.slice(0, m + 1), B = path.slice(m + 1), best = null, bestGain = ml * 0.05;
        [[A, B], [B, A]].forEach(function (pair) {
          var move = pair[0], host = pair[1];
          [move, move.slice().reverse()].forEach(function (seg) {
            var a = seg[0], z = seg[seg.length - 1];
            var g0 = ml - D(z, host[0]); if (g0 > bestGain) { bestGain = g0; best = seg.concat(host); }
            var g1 = ml - D(host[host.length - 1], a); if (g1 > bestGain) { bestGain = g1; best = host.concat(seg); }
            for (var t = 0; t < host.length - 1; t++) {
              var g = ml + D(host[t], host[t + 1]) - D(host[t], a) - D(z, host[t + 1]);
              if (g > bestGain) { bestGain = g; best = host.slice(0, t + 1).concat(seg, host.slice(t + 1)); }
            }
          });
        });
        if (best) { path = best; done = true; }
      }
      if (!done) break;
    }
    return path;
  }

  // 4. smooth curve through the route (Catmull-Rom as cubic Béziers)
  function curve(path, scale, ox, oy) {
    var P = path.map(function (p) { return [p[0] * scale + ox, p[1] * scale + oy]; }), d = 'M' + P[0][0].toFixed(1) + ' ' + P[0][1].toFixed(1);
    for (var i = 0; i < P.length - 1; i++) {
      var p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6, c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += 'C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }

  function mount(root, options) {
    var o = options || {};
    var svg = root.querySelector('.ol-svg'), pathEl = root.querySelector('.ol-path'), shadowEl = root.querySelector('.ol-shadow'), tip = root.querySelector('.ol-tip');
    function showStage() {                             // on a phone the drawing sits below the buttons: bring it into view
      var r = drop.getBoundingClientRect(); if (r.top > window.innerHeight * 0.6 || r.bottom < 0) drop.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    }
    var status = root.querySelector('.ol-status'), file = root.querySelector('.ol-file'), drop = root.querySelector('.ol-stage');
    var detail = root.querySelector('.ol-detail'), dl = root.querySelector('.ol-download'), again = root.querySelector('.ol-again'), exBox = root.querySelector('.ol-examples');
    var lastSource = null, job = 0, anim = 0, finished = null, started = false;

    function setStatus(t) { status.textContent = t; }
    function draw(d, dur) {
      cancelAnimationFrame(anim);
      pathEl.setAttribute('d', d); shadowEl.setAttribute('d', d);
      var sw = Math.max(0.6, Math.min(1.4, 1.15 * Math.sqrt(1600 / Math.max(1, finished ? finished.points : 1600))));
      pathEl.style.strokeWidth = sw; shadowEl.style.strokeWidth = sw + 0.45;
      var L = pathEl.getTotalLength();
      [pathEl, shadowEl].forEach(function (p) { p.style.strokeDasharray = L + ' ' + (L + 10); p.style.visibility = 'visible'; });
      if (reduce) { pathEl.style.strokeDashoffset = 0; shadowEl.style.strokeDashoffset = 0; tip.style.opacity = 0; root.setAttribute('data-drawn', '1'); return; }
      var t0 = null; tip.style.opacity = 1; root.removeAttribute('data-drawn');
      function f(now) {
        if (t0 == null) t0 = now;
        var k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        var off = L * (1 - e); pathEl.style.strokeDashoffset = off; shadowEl.style.strokeDashoffset = off + 0;
        var pt = pathEl.getPointAtLength(L * e); tip.setAttribute('cx', pt.x); tip.setAttribute('cy', pt.y);
        if (k < 1) anim = requestAnimationFrame(f); else { tip.style.opacity = 0; root.setAttribute('data-drawn', '1'); }
      }
      anim = requestAnimationFrame(f);
    }
    async function run(source, label) {
      var my = ++job; lastSource = { source: source, label: label }; root.removeAttribute('data-drawn');
      root.setAttribute('data-busy', '1'); dl.disabled = true; again.disabled = true;
      [pathEl, shadowEl].forEach(function (p) { p.style.visibility = 'hidden'; }); tip.style.opacity = 0;
      setStatus('Reading the image…'); await wait();
      var iw = source.naturalWidth || source.width, ih = source.naturalHeight || source.height, s = SIZE / Math.max(iw, ih);
      var w = Math.max(8, Math.round(iw * s)), h = Math.max(8, Math.round(ih * s));
      var v = darkness(source, w, h); if (my !== job) return;
      var count = +detail.value || 1600;
      setStatus('Placing ' + count.toLocaleString('en-GB') + ' dots…'); await wait();
      var pts = stipple(v, w, h, count, 11); if (my !== job) return;
      if (pts.length < 20) { setStatus('That image is too pale to draw. Try one with darker shapes.'); root.removeAttribute('data-busy'); return; }
      setStatus('Finding one line through every dot…'); await wait();
      var path = route(pts, 900); if (my !== job) return;
      var vb = 400, sc = (vb - 30) / Math.max(w, h), ox = (vb - w * sc) / 2, oy = (vb - h * sc) / 2;
      var d = curve(path, sc, ox, oy);
      finished = { d: d, label: label, points: path.length };
      draw(d, 5200 + path.length * 1.2);
      setStatus('Drawn' + (label ? ': ' + label : '') + ', in one line without lifting the pen.');
      root.removeAttribute('data-busy'); dl.disabled = false; again.disabled = false;
    }
    function fromImage(img, label) { return run(img, label); }
    function fromText(text, label) {
      var c = document.createElement('canvas'); c.width = c.height = 600;
      var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 600, 600); g.fillStyle = '#000';
      var fs = text.length <= 1 ? 520 : text.length === 2 ? 330 : 230;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 ' + fs + 'px "Cormorant Garamond", Georgia, serif'; g.fillText(text, 300, 330);
      return run(c, label || text);
    }
    function fromSvg(sel, label) {
      var node = document.querySelector(sel);
      if (!node) { var parts = sel.split(' '), tpl = document.querySelector(parts[0]); if (tpl && tpl.content) node = tpl.content.querySelector(parts.slice(1).join(' ')); }   // drawings kept in a <template>
      if (!node) { setStatus('That example isn’t available on this page.'); return; }
      var c = node.cloneNode(true); c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      [].slice.call(c.querySelectorAll('path')).forEach(function (p) { p.setAttribute('style', 'visibility:visible;stroke:#000;stroke-width:' + (o.svgStroke || 18) + ';fill:none;stroke-linecap:round;stroke-linejoin:round'); });
      c.removeAttribute('class'); c.setAttribute('width', 800); c.setAttribute('height', 800);
      var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(c));
      loadSrc(url, label);
    }
    function loadSrc(src, label) {
      root.removeAttribute('data-drawn');
      var img = new Image(); img.decoding = 'async';
      img.onload = function () { run(img, label); };
      img.onerror = function () { setStatus('That image couldn’t be opened.'); };
      img.src = src;
    }
    function fromFile(f) {
      if (!f || !/^image\//.test(f.type)) { setStatus('Please choose an image file (PNG, JPG, SVG or WebP).'); return; }
      if (f.size > 15 * 1024 * 1024) { setStatus('That image is very large. Please choose one under 15 MB.'); return; }
      var url = URL.createObjectURL(f), img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); run(img, 'your image'); };
      img.onerror = function () { URL.revokeObjectURL(url); setStatus('That image couldn’t be opened.'); };
      img.src = url;
    }
    file.addEventListener('change', function () { fromFile(file.files[0]); file.value = ''; });
    ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('ol-over'); }); });
    ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('ol-over'); }); });
    drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files[0]) fromFile(e.dataTransfer.files[0]); });
    again.addEventListener('click', function () { if (finished) draw(finished.d, 5200 + finished.points * 1.2); });
    detail.addEventListener('change', function () { if (lastSource) run(lastSource.source, lastSource.label); });

    function svgFile() {
      if (!finished) return '';
      return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="1200" height="1200">' +
        '<rect width="400" height="400" fill="#0E1628"/><path d="' + finished.d + '" fill="none" stroke="#D8AC5F" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    dl.addEventListener('click', function () {
      var s = svgFile(); if (!s) return;
      var url = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' })), a = document.createElement('a');
      a.href = url; a.download = 'one-line-drawing.svg'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    });

    var initials = root.querySelector('.ol-initials');
    if (initials) initials.addEventListener('submit', function (e) {
      e.preventDefault(); var v = initials.querySelector('input').value.trim().slice(0, 3);
      if (v) { showStage(); root.removeAttribute('data-drawn'); fromText(v, 'your initials'); }
    });
    (o.examples || []).forEach(function (ex, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ol-ex'; b.textContent = ex.label;
      b.addEventListener('click', function () { showStage(); root.removeAttribute('data-drawn'); if (ex.text) fromText(ex.text, ex.label); else if (ex.svg) fromSvg(ex.svg, ex.label); else loadSrc(ex.src, ex.label); });
      exBox.appendChild(b);
    });
    // draw the first example by itself the first time the section is seen
    function begin() { if (started || !o.examples || !o.examples.length) return; started = true; var ex = o.examples[0]; if (ex.text) fromText(ex.text, ex.label); else loadSrc(ex.src, ex.label); }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(begin); } }, { threshold: 0.35 });
      io.observe(root);
    } else begin();

    return { fromImage: fromImage, fromText: fromText, svg: svgFile, result: function () { return finished; } };
  }
  window.OneLine = { mount: mount, _route: route, _stipple: stipple };
})();
