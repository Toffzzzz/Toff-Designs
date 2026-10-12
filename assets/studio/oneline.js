/*
 * Your logo, in one line: turns any image into a single continuous gold line and draws it. Two styles, chosen
 * automatically (or by the visitor), all worked out in the visitor's browser, nothing uploaded:
 *   Outline (logos, icons, lettering, flat artwork): split the image into its flat colours -> trace the edge of each
 *     shape (thin line art along its centre) -> drop duplicate edges -> join the pieces, nearest first, into one line.
 *   Shading (photos): scatter dots where it's dark -> relax them -> one route through every dot (nearest neighbour,
 *     then 2-opt untangling) -> smooth curves.
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

  // ===================== Outline mode (logos, icons, lettering, flat artwork) =====================
  // The image is split into its few flat colours; the edge of every coloured shape is traced (thin line art is traced
  // along its centre instead, so it isn't drawn twice); duplicate edges are dropped; then all the pieces are joined,
  // nearest first, into one continuous line.

  function readPixels(source, w, h, crop) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d', { willReadFrequently: true });
    g.clearRect(0, 0, w, h);
    if (crop) g.drawImage(source, crop[0], crop[1], crop[2], crop[3], 0, 0, w, h); else g.drawImage(source, 0, 0, w, h);
    return g.getImageData(0, 0, w, h).data;
  }
  function cdist(px, p, c) { var dr = px[p] - c[0], dg = px[p + 1] - c[1], db = px[p + 2] - c[2]; return dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11; }

  // Find the part of the image that holds the logo, so a small logo on a big plain background is traced at full size.
  // Returns the crop in the image's own pixels.
  function findContent(source) {
    var iw = source.naturalWidth || source.width, ih = source.naturalHeight || source.height, s = 200 / Math.max(iw, ih);
    var w = Math.max(4, Math.round(iw * s)), h = Math.max(4, Math.round(ih * s)), px = readPixels(source, w, h), n = w * h, i;
    var border = [], transp = 0;
    for (i = 0; i < n; i++) { var x = i % w, y = (i / w) | 0; if (x && y && x < w - 1 && y < h - 1) continue; if (px[i * 4 + 3] < 128) transp++; else border.push(i); }
    var useAlpha = transp > border.length, bgc = null;
    if (!useAlpha && border.length) {                        // the most common border colour, roughly
      var votes = {}, bestKey = null;
      border.forEach(function (j) { var k = (px[j * 4] >> 4) + ',' + (px[j * 4 + 1] >> 4) + ',' + (px[j * 4 + 2] >> 4); votes[k] = (votes[k] || 0) + 1; if (!bestKey || votes[k] > votes[bestKey]) bestKey = k; });
      var acc = [0, 0, 0, 0]; border.forEach(function (j) { var k = (px[j * 4] >> 4) + ',' + (px[j * 4 + 1] >> 4) + ',' + (px[j * 4 + 2] >> 4); if (k === bestKey) { acc[0] += px[j * 4]; acc[1] += px[j * 4 + 1]; acc[2] += px[j * 4 + 2]; acc[3]++; } });
      bgc = [acc[0] / acc[3], acc[1] / acc[3], acc[2] / acc[3]];
      if (acc[3] < border.length * 0.45) return null;      // no plain background (a photo, or art to the edges): keep the whole image
    }
    var x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (i = 0; i < n; i++) {
      var on = useAlpha ? px[i * 4 + 3] >= 128 : (px[i * 4 + 3] >= 128 && cdist(px, i * 4, bgc) > 30 * 30);
      if (!on) continue; var xx = i % w, yy = (i / w) | 0;
      if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy;
    }
    if (x1 < 0) return null;
    var pad = Math.max(x1 - x0, y1 - y0) * 0.04 + 1;
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w, x1 + 1 + pad); y1 = Math.min(h, y1 + 1 + pad);
    return [x0 / s, y0 / s, (x1 - x0) / s, (y1 - y0) / s];
  }

  // k-means with spread-out starting colours (k-means++), on pixels that sit inside flat areas
  function kmeans(px, idxs, k, seed) {
    var r = rng(seed || 5), cs = [], i, it, c;
    cs.push([px[idxs[0] * 4], px[idxs[0] * 4 + 1], px[idxs[0] * 4 + 2]]);
    var dmin = new Float64Array(idxs.length).fill(1e12);
    while (cs.length < k) {
      var tot = 0, last = cs[cs.length - 1];
      for (i = 0; i < idxs.length; i++) { var d0 = cdist(px, idxs[i] * 4, last); if (d0 < dmin[i]) dmin[i] = d0; tot += dmin[i]; }
      if (tot <= 0) break;
      var pick = r() * tot, j = 0; for (; j < idxs.length - 1; j++) { pick -= dmin[j]; if (pick <= 0) break; }
      cs.push([px[idxs[j] * 4], px[idxs[j] * 4 + 1], px[idxs[j] * 4 + 2]]);
    }
    k = cs.length;
    var err = 0, cnt = [];
    for (it = 0; it < 14; it++) {
      var sum = cs.map(function () { return [0, 0, 0, 0]; }); err = 0;
      for (i = 0; i < idxs.length; i++) {
        var p = idxs[i] * 4, best = 0, bd = 1e12;
        for (c = 0; c < k; c++) { var d = cdist(px, p, cs[c]); if (d < bd) { bd = d; best = c; } }
        err += Math.sqrt(bd); var s = sum[best]; s[0] += px[p]; s[1] += px[p + 1]; s[2] += px[p + 2]; s[3]++;
      }
      for (c = 0; c < k; c++) if (sum[c][3]) cs[c] = [sum[c][0] / sum[c][3], sum[c][1] / sum[c][3], sum[c][2] / sum[c][3]];
      cnt = sum.map(function (s) { return s[3]; });
    }
    return { centres: cs, err: err / idxs.length, count: cnt };
  }

  // split the image into its flat colour regions; also says whether it looks like a photo (too many colours to be flat)
  function segment(px, w, h) {
    var n = w * h, opaque = 0, i, x, y, c;
    for (i = 0; i < n; i++) if (px[i * 4 + 3] > 127) opaque++;
    if (opaque < n * 0.003) return null;
    // "core" pixels: the same colour as their neighbours. Soft anti-aliased edges and JPEG noise are left out of the
    // colour count, so they can't pass themselves off as extra colours.
    var core = [];
    for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) {
      i = y * w + x; var p = i * 4; if (px[p + 3] <= 127) continue;
      var flat = true;
      for (var q = 0; q < 4 && flat; q++) { var j = (q === 0 ? i - 1 : q === 1 ? i + 1 : q === 2 ? i - w : i + w) * 4; if (px[j + 3] <= 127 || Math.abs(px[j] - px[p]) + Math.abs(px[j + 1] - px[p + 1]) + Math.abs(px[j + 2] - px[p + 2]) > 30) flat = false; }
      if (flat) core.push(i);
    }
    var coreShare = core.length / Math.max(1, opaque);
    var pool = core.length > 200 ? core : (function () { var all = []; for (var t = 0; t < n; t++) if (px[t * 4 + 3] > 127) all.push(t); return all; })();
    var sample = [], step = Math.max(1, Math.floor(pool.length / 6000));
    for (i = 0; i < pool.length; i += step) sample.push(pool[i]);
    // try 1 to 7 colours (two starts each) and keep the fewest that describe the image well
    var runs = [];
    for (var k = 1; k <= 7; k++) { var a = kmeans(px, sample, k, 3 + k), b = kmeans(px, sample, k, 101 + k * 7); runs.push(a.err <= b.err ? a : b); }
    var best = runs[runs.length - 1];
    for (k = 0; k < runs.length; k++) {
      var nextGain = k + 1 < runs.length ? runs[k + 1].err / Math.max(0.01, runs[k].err) : 1;
      if (runs[k].err < 5 || (runs[k].err < 12 && nextGain > 0.72)) { best = runs[k]; break; }
    }
    // a small but clearly different colour (a thin rule, a highlight) is worth keeping even if it hardly changes the fit
    for (var k2 = runs.indexOf(best) + 1; k2 < runs.length; k2++) {
      var extra = runs[k2], distinct = extra.centres.some(function (cc, ci) {
        if (extra.count[ci] < sample.length * 0.004) return false;
        return best.centres.every(function (bc) { return Math.sqrt(cdist([cc[0], cc[1], cc[2]], 0, bc)) > 45; });
      });
      if (distinct && extra.err <= best.err) best = extra; else break;
    }
    // drop colours that cover almost nothing (they were edges after all)
    var keepC = best.centres.filter(function (cc, ci) { return best.count[ci] > sample.length * 0.002; });
    var photo = best.err > 12 || coreShare < 0.35;
    var cs = keepC.length ? keepC : best.centres, K = cs.length;
    // label every pixel; transparent pixels count as their own colour (K)
    var lab = new Int16Array(n);
    for (i = 0; i < n; i++) {
      var pp = i * 4; if (px[pp + 3] <= 127) { lab[i] = K; continue; }
      var bi = 0, bd = 1e12;
      for (c = 0; c < K; c++) { var d = cdist(px, pp, cs[c]); if (d < bd) { bd = d; bi = c; } }
      lab[i] = bi;
    }
    // tidy: each pixel takes the most common label around it (removes the speckle of anti-aliasing and compression)
    var out = new Int16Array(n), cnt = new Int16Array(K + 1);
    for (var pass = 0; pass < 2; pass++) {
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        cnt.fill(0);
        for (var yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++) for (var xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) cnt[lab[yy * w + xx]]++;
        var m = lab[y * w + x]; for (c = 0; c <= K; c++) if (cnt[c] > cnt[m]) m = c; out[y * w + x] = m;
      }
      var tmp = lab; lab = out; out = tmp;
    }
    // a gradient gets cut into bands of colour. Bands meet softly (the pixels either side of the border are almost the
    // same), while real shapes meet sharply, so neighbouring colours with soft borders are joined back together.
    var pairSum = {}, pairN = {};
    function look(i, j, a2, b2) {
      var la = lab[i], lb = lab[j]; if (la === lb || la === K || lb === K) return;
      if (a2 < 0 || b2 < 0 || a2 >= n || b2 >= n || px[a2 * 4 + 3] <= 127 || px[b2 * 4 + 3] <= 127) return;
      var key2 = la < lb ? la + '_' + lb : lb + '_' + la;
      pairSum[key2] = (pairSum[key2] || 0) + Math.sqrt(cdist(px, a2 * 4, [px[b2 * 4], px[b2 * 4 + 1], px[b2 * 4 + 2]])); pairN[key2] = (pairN[key2] || 0) + 1;
    }
    for (y = 2; y < h - 2; y++) for (x = 2; x < w - 3; x++) { i = y * w + x; look(i, i + 1, i - 2, i + 3); }
    for (y = 2; y < h - 3; y++) for (x = 2; x < w - 2; x++) { i = y * w + x; look(i, i + w, i - 2 * w, i + 3 * w); }
    var root = []; for (c = 0; c <= K; c++) root[c] = c;
    function find(a) { while (root[a] !== a) a = root[a] = root[root[a]]; return a; }
    Object.keys(pairSum).forEach(function (k2) {
      if (pairN[k2] < 6) return;
      var ab = k2.split('_').map(Number), D = Math.sqrt(cdist([cs[ab[0]][0], cs[ab[0]][1], cs[ab[0]][2]], 0, cs[ab[1]]));
      if (pairSum[k2] / pairN[k2] < D * 0.4) root[find(ab[0])] = find(ab[1]);
    });
    for (i = 0; i < n; i++) if (lab[i] !== K) lab[i] = find(lab[i]);
    // the background is whatever fills most of the border (or the transparency)
    var edgeCount = new Int32Array(K + 1);
    for (x = 0; x < w; x++) { edgeCount[lab[x]]++; edgeCount[lab[(h - 1) * w + x]]++; }
    for (y = 0; y < h; y++) { edgeCount[lab[y * w]]++; edgeCount[lab[y * w + w - 1]]++; }
    var bg = 0; for (c = 1; c <= K; c++) if (edgeCount[c] > edgeCount[bg]) bg = c;
    if (edgeCount[K] > (w + h) * 2 * 0.01) bg = K;           // a cut-out picture (see-through corners): the see-through part is the background
    // tiny colour groups are left-over edge shading: give them to their most common neighbour
    var area = new Int32Array(K + 1); for (i = 0; i < n; i++) area[lab[i]]++;
    for (c = 0; c <= K; c++) if (c !== bg && area[c] > 0 && area[c] < n * 0.003) {
      var votes = new Int32Array(K + 1);
      for (i = 0; i < n; i++) if (lab[i] === c) { if (i % w > 0) votes[lab[i - 1]]++; if (i % w < w - 1) votes[lab[i + 1]]++; if (i >= w) votes[lab[i - w]]++; if (i < n - w) votes[lab[i + w]]++; }
      votes[c] = 0; var to = bg; for (var v2 = 0; v2 <= K; v2++) if (votes[v2] > votes[to]) to = v2;
      for (i = 0; i < n; i++) if (lab[i] === c) lab[i] = to;
      area[to] += area[c]; area[c] = 0;
    }
    return { lab: lab, K: K, bg: bg, area: area, photo: photo, err: best.err, core: coreShare, px: px };
  }

  // marching squares on a softened mask: closed loops around every shape (and around every hole in it)
  function contours(mask, w, h) {
    var f = new Float32Array((w + 2) * (h + 2)), W = w + 2, H = h + 2, x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) f[(y + 1) * W + x + 1] = mask[y * w + x];
    var s = new Float32Array(W * H);                       // a light blur, so edges come out smooth instead of stair-stepped
    for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) { var i = y * W + x; s[i] = (f[i] * 4 + f[i - 1] + f[i + 1] + f[i - W] + f[i + W]) / 8; }
    var key = function (a) { return a[0].toFixed(3) + ',' + a[1].toFixed(3); };
    function lerp(ax, ay, av, bx, by, bv) { var t = (0.5 - av) / ((bv - av) || 1e-6); return [ax + (bx - ax) * t - 1, ay + (by - ay) * t - 1]; }
    var list = [];
    for (y = 0; y < H - 1; y++) for (x = 0; x < W - 1; x++) {
      var a = s[y * W + x], b = s[y * W + x + 1], c = s[(y + 1) * W + x + 1], d = s[(y + 1) * W + x];
      var idx = (a > 0.5 ? 8 : 0) | (b > 0.5 ? 4 : 0) | (c > 0.5 ? 2 : 0) | (d > 0.5 ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      var top = lerp(x, y, a, x + 1, y, b), right = lerp(x + 1, y, b, x + 1, y + 1, c), bottom = lerp(x, y + 1, d, x + 1, y + 1, c), left = lerp(x, y, a, x, y + 1, d);
      var pairs = { 1: [[left, bottom]], 2: [[bottom, right]], 3: [[left, right]], 4: [[top, right]], 5: [[left, top], [bottom, right]], 6: [[top, bottom]], 7: [[left, top]],
        8: [[left, top]], 9: [[top, bottom]], 10: [[left, bottom], [top, right]], 11: [[top, right]], 12: [[left, right]], 13: [[bottom, right]], 14: [[left, bottom]] }[idx];
      pairs.forEach(function (pq) { list.push(pq); });
    }
    var adj = new Map();                                    // join the little segments into loops
    list.forEach(function (sg, i) { [0, 1].forEach(function (e) { var k = key(sg[e]); if (!adj.has(k)) adj.set(k, []); adj.get(k).push([i, e]); }); });
    var used = new Uint8Array(list.length), loops = [];
    for (var i0 = 0; i0 < list.length; i0++) {
      if (used[i0]) continue; used[i0] = 1;
      var loop = [list[i0][0], list[i0][1]], endKey = key(list[i0][1]), startKey = key(list[i0][0]), guard = 0;
      while (endKey !== startKey && guard++ < 200000) {
        var nexts = adj.get(endKey) || [], found = false;
        for (var q = 0; q < nexts.length; q++) { var si = nexts[q][0]; if (used[si]) continue; used[si] = 1; var other = list[si][1 - nexts[q][1]]; loop.push(other); endKey = key(other); found = true; break; }
        if (!found) break;
      }
      if (loop.length > 3) loops.push(loop);
    }
    return loops;
  }

  // Zhang–Suen thinning: line art reduced to its centre line, then walked into as few long strokes as possible
  function skeleton(mask, w, h) {
    var m = new Uint8Array(mask), changed = true, n = w * h, x, y, i;
    function P(x, y) { return x < 0 || y < 0 || x >= w || y >= h ? 0 : m[y * w + x]; }
    var guard = 0;
    while (changed && guard++ < 80) {
      changed = false;
      for (var pass = 0; pass < 2; pass++) {
        var del = [];
        for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
          if (!m[y * w + x]) continue;
          var p2 = P(x, y - 1), p3 = P(x + 1, y - 1), p4 = P(x + 1, y), p5 = P(x + 1, y + 1), p6 = P(x, y + 1), p7 = P(x - 1, y + 1), p8 = P(x - 1, y), p9 = P(x - 1, y - 1);
          var B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9; if (B < 2 || B > 6) continue;
          var seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2], A = 0; for (var k = 0; k < 8; k++) if (!seq[k] && seq[k + 1]) A++;
          if (A !== 1) continue;
          if (pass === 0 ? (p2 * p4 * p6 || p4 * p6 * p8) : (p2 * p4 * p8 || p2 * p6 * p8)) continue;
          del.push(y * w + x);
        }
        if (del.length) { changed = true; del.forEach(function (j) { m[j] = 0; }); }
      }
    }
    // remove the extra corner pixels of stair steps, so a line is one pixel wide everywhere and has no false junctions
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if (!m[y * w + x]) continue;
      var N = P(x, y - 1), E = P(x + 1, y), S = P(x, y + 1), Wst = P(x - 1, y);
      if ((N && E && !P(x - 1, y + 1)) || (E && S && !P(x - 1, y - 1)) || (S && Wst && !P(x + 1, y - 1)) || (Wst && N && !P(x + 1, y + 1))) {
        // only if the two neighbours stay connected without this pixel
        if ((N && E && !S && !Wst) || (E && S && !N && !Wst) || (S && Wst && !N && !E) || (Wst && N && !S && !E)) m[y * w + x] = 0;
      }
    }
    var NB = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]];
    function deg(j) { var x = j % w, y = (j / w) | 0, c = 0; NB.forEach(function (d) { if (P(x + d[0], y + d[1])) c++; }); return c; }
    var seen = new Uint8Array(n), strokes = [];
    function walk(start) {
      var line = [start], cur = start, dx = 0, dy = 0; seen[start] = 1;
      for (var g = 0; g < 200000; g++) {
        var x = cur % w, y = (cur / w) | 0, nxt = -1, bestScore = -9;
        for (var q = 0; q < 8; q++) {                       // carry on in the straightest direction
          var nx = x + NB[q][0], ny = y + NB[q][1]; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          var j = ny * w + nx; if (!m[j] || seen[j]) continue;
          var L = Math.hypot(NB[q][0], NB[q][1]), score = (dx * NB[q][0] + dy * NB[q][1]) / L + (q < 4 ? 0.05 : 0);
          if (score > bestScore) { bestScore = score; nxt = j; }
        }
        if (nxt < 0) break;
        var ndx = (nxt % w) - x, ndy = ((nxt / w) | 0) - y; dx = dx * 0.6 + ndx * 0.4; dy = dy * 0.6 + ndy * 0.4;
        seen[nxt] = 1; line.push(nxt); cur = nxt;
      }
      var pts = line.map(function (j) { return [j % w + 0.5, ((j / w) | 0) + 0.5]; });
      var e = pts[pts.length - 1];                          // a stroke that comes back to where it started is a loop
      if (pts.length > 8 && Math.abs(e[0] - pts[0][0]) <= 1.5 && Math.abs(e[1] - pts[0][1]) <= 1.5) pts.closed = true;
      return pts;
    }
    for (i = 0; i < n; i++) if (m[i] && !seen[i] && deg(i) === 1) strokes.push(walk(i));       // from loose ends first
    for (i = 0; i < n; i++) if (m[i] && !seen[i]) strokes.push(walk(i));                        // then whatever is left
    return strokes.filter(function (s) { return s.length >= 3; });
  }

  function rdp(pts, eps) {                                 // fewer points, same shape
    if (pts.length < 3) return pts.slice();
    var keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    var stack = [[0, pts.length - 1]];
    while (stack.length) {
      var r = stack.pop(), a = pts[r[0]], b = pts[r[1]], md = -1, mi = -1, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9;
      for (var i = r[0] + 1; i < r[1]; i++) { var d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L; if (d > md) { md = d; mi = i; } }
      if (md > eps) { keep[mi] = 1; stack.push([r[0], mi], [mi, r[1]]); }
    }
    return pts.filter(function (p, i) { return keep[i]; });
  }
  function rdpClosed(pts, eps) {                           // a loop starts and ends at the same point, so split it at its far side first
    if (pts.length < 4) return pts.slice();
    var far = 0, fd = -1; for (var i = 1; i < pts.length; i++) { var d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > fd) { fd = d; far = i; } }
    var a = rdp(pts.slice(0, far + 1), eps), b = rdp(pts.slice(far), eps);
    var out = a.concat(b.slice(1)); if (out.length > 2 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < 0.01) out.pop();
    return out;
  }
  function chaikin(pts, closed, rounds) {                  // soften the corners a little
    for (var r = 0; r < rounds; r++) {
      var out = [], n = pts.length;
      if (n < 3) return pts;
      if (!closed) out.push(pts[0]);
      for (var i = 0; i < (closed ? n : n - 1); i++) {
        var a = pts[i], b = pts[(i + 1) % n];
        out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      if (!closed) out.push(pts[n - 1]);
      pts = out;
    }
    return pts;
  }
  function plen(pts, closed) { var L = 0; for (var i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (closed && pts.length) L += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]); return L; }

  // Join the pieces into one line. From the piece just drawn, the pen may first run back along that same line (which
  // can't be seen, it's drawn over itself) to whichever point is closest to an undrawn piece, then makes the short hop.
  // So the visible jumps between shapes are as short as they can be.
  function joinPieces(pieces) {
    if (!pieces.length) return [];
    var D = function (a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); };
    var left = pieces.slice(), out = [], smart = pieces.length <= 160;
    left.sort(function (a, b) { return (a.pts[0][1] + a.pts[0][0] * 0.3) - (b.pts[0][1] + b.pts[0][0] * 0.3); });
    var first = left.shift(), seq = first.pts.slice(); if (first.closed) seq.push(first.pts[0]);
    var curClosed = first.closed;
    out = seq.slice();
    while (left.length) {
      // where on the current piece to leave from (cum = distance along it, for the cost of running back)
      var cum = [0]; for (var i = 1; i < seq.length; i++) cum.push(cum[i - 1] + D(seq[i - 1], seq[i]));
      var total = cum[cum.length - 1], exits = [];
      if (smart) { var st = Math.max(1, Math.floor(seq.length / 60)); for (i = 0; i < seq.length; i += st) exits.push(i); if (exits[exits.length - 1] !== seq.length - 1) exits.push(seq.length - 1); }
      else exits.push(seq.length - 1);
      var best = null;
      for (var e = 0; e < exits.length; e++) {
        var ei = exits[e], back = total - cum[ei], fwd = curClosed ? cum[ei] : Infinity, run = Math.min(back, fwd), from = seq[ei];
        for (var k = 0; k < left.length; k++) {
          var pc = left[k], cost;
          if (pc.closed) {
            var step = Math.max(1, Math.floor(pc.pts.length / 80));
            for (var j = 0; j < pc.pts.length; j += step) { cost = D(pc.pts[j], from) + run * 0.04; if (!best || cost < best.cost) best = { cost: cost, ei: ei, k: k, j: j, rev: false, viaStart: fwd < back }; }
          } else {
            var a0 = D(pc.pts[0], from), a1 = D(pc.pts[pc.pts.length - 1], from);
            cost = a0 + run * 0.04; if (!best || cost < best.cost) best = { cost: cost, ei: ei, k: k, rev: false, viaStart: fwd < back };
            cost = a1 + run * 0.04; if (cost < best.cost) best = { cost: cost, ei: ei, k: k, rev: true, viaStart: fwd < back };
          }
        }
      }
      // run back along the line to the chosen point
      if (best.ei !== seq.length - 1) {
        if (best.viaStart) { for (i = 1; i <= best.ei; i++) out.push(seq[i]); }          // a loop ends where it began: carry on round
        else { for (i = seq.length - 2; i >= best.ei; i--) out.push(seq[i]); }
      }
      var pick = left.splice(best.k, 1)[0];
      if (pick.closed) { seq = pick.pts.slice(best.j).concat(pick.pts.slice(0, best.j + 1)); }
      else seq = best.rev ? pick.pts.slice().reverse() : pick.pts.slice();
      curClosed = pick.closed;
      out = out.concat(seq);
    }
    return out;
  }

  // The whole outline drawing. Returns { path, w, h, pieces, photo } in its own w × h frame, or null for a blank image.
  function outline(source, maxSide, detail, evenPhotos) {
    var iw = source.naturalWidth || source.width, ih = source.naturalHeight || source.height;
    var crop = findContent(source) || [0, 0, iw, ih];
    var s = maxSide / Math.max(crop[2], crop[3]), w = Math.max(8, Math.round(crop[2] * s)), h = Math.max(8, Math.round(crop[3] * s));
    var seg = segment(readPixels(source, w, h, crop), w, h); if (!seg) return null;
    if (seg.photo && !evenPhotos) return { path: [], w: w, h: h, pieces: 0, photo: true, err: seg.err, core: seg.core };
    var eps = detail <= 900 ? 1.4 : detail >= 2600 ? 0.6 : 0.9, minLen = (w + h) * (detail <= 900 ? 0.04 : detail >= 2600 ? 0.012 : 0.022);
    var order = [], c, i, n = w * h, px = seg.px;
    // how sharp the image is at each pixel: colour change across a few pixels. Only edges you can actually see get drawn,
    // so soft shading in a rendered or photographed object doesn't turn into stray lines.
    var sharp = new Float32Array(n);
    for (var yy0 = 2; yy0 < h - 2; yy0++) for (var xx0 = 2; xx0 < w - 2; xx0++) {
      var i0 = yy0 * w + xx0, best0 = 0;
      [[i0 - 2, i0 + 2], [i0 - 2 * w, i0 + 2 * w], [i0 - 2 * w - 2, i0 + 2 * w + 2], [i0 - 2 * w + 2, i0 + 2 * w - 2]].forEach(function (pr) {
        var a = pr[0] * 4, b = pr[1] * 4, d;
        if (px[a + 3] <= 127 || px[b + 3] <= 127) d = (px[a + 3] <= 127) !== (px[b + 3] <= 127) ? 255 : 0;
        else d = Math.sqrt(cdist(px, a, [px[b], px[b + 1], px[b + 2]]));
        if (d > best0) best0 = d;
      });
      sharp[i0] = best0;
    }
    for (i = 0; i < n; i++) { var xb = i % w, yb = (i / w) | 0; if (xb < 2 || yb < 2 || xb >= w - 2 || yb >= h - 2) sharp[i] = 255; }
    function isSharp(p) {
      var cx = Math.round(p[0]), cy = Math.round(p[1]), m = 0;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var x2 = cx + dx, y2 = cy + dy; if (x2 >= 0 && y2 >= 0 && x2 < w && y2 < h && sharp[y2 * w + x2] > m) m = sharp[y2 * w + x2]; }
      return m > 26;
    }
    // split a traced loop into the runs that follow a visible edge (tiny soft gaps are bridged)
    function visibleRuns(loop) {
      var flags = loop.map(isSharp), N = loop.length, soft = 0;
      flags.forEach(function (f) { if (!f) soft++; });
      if (soft <= N * 0.04) return [{ pts: loop, closed: true }];
      for (var g = 0; g < 2; g++) for (var t = 0; t < N; t++) if (!flags[t] && flags[(t - 1 + N) % N] && (flags[(t + 1) % N] || flags[(t + 2) % N])) flags[t] = true;
      var start = flags.indexOf(false); if (start < 0) return [{ pts: loop, closed: true }];
      var runs = [], cur = null;
      for (var s = 1; s <= N; s++) { var k = (start + s) % N; if (flags[k]) { if (!cur) cur = []; cur.push(loop[k]); } else if (cur) { runs.push({ pts: cur, closed: false }); cur = null; } }
      if (cur) runs.push({ pts: cur, closed: false });
      return runs;
    }
    for (c = 0; c <= seg.K; c++) if (c !== seg.bg && seg.area[c] > 0) order.push(c);
    order.sort(function (a, b) { return seg.area[b] - seg.area[a]; });
    var pieces = [], grid = new Map(), G = 2.5;
    function gk(x, y) { return ((x / G) | 0) + ',' + ((y / G) | 0); }
    function near(p) { var cx = (p[0] / G) | 0, cy = (p[1] / G) | 0; for (var yy = cy - 1; yy <= cy + 1; yy++) for (var xx = cx - 1; xx <= cx + 1; xx++) if (grid.has(xx + ',' + yy)) return true; return false; }
    function at(pts, t) { var L = plen(pts, false) * t, acc = 0; for (var i = 1; i < pts.length; i++) { var sl = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (acc + sl >= L) { var k = (L - acc) / (sl || 1); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]; } acc += sl; } return pts[pts.length - 1]; }
    function remember(pts, into) { var L = plen(pts, false), steps = Math.max(2, Math.ceil(L / 1.5)); for (var s = 0; s <= steps; s++) { var p = at(pts, s / steps); into.push(gk(p[0], p[1])); } }
    // an edge already drawn by an earlier colour (two colours share every border between them) is drawn once;
    // edges are only remembered once a colour is finished, so the pieces of one colour never cancel each other
    function duplicate(pts) { var hit = 0, tot = 0; for (var s = 0; s <= 40; s++) { tot++; if (near(at(pts, s / 40))) hit++; } return hit / tot > 0.75; }
    // each separate shape is judged on its own: thin lines and small lettering are traced along their centre (once),
    // anything with body is traced around its edge
    var comp = new Int32Array(n).fill(-1), shapes = [];
    order.forEach(function (c) {
      for (var s0 = 0; s0 < n; s0++) {
        if (seg.lab[s0] !== c || comp[s0] >= 0) continue;
        var id = shapes.length, stack = [s0], px0 = [], x0 = w, y0 = h, x1 = 0, y1 = 0; comp[s0] = id;
        while (stack.length) {
          var q = stack.pop(), qx = q % w, qy = (q / w) | 0; px0.push(q);
          if (qx < x0) x0 = qx; if (qx > x1) x1 = qx; if (qy < y0) y0 = qy; if (qy > y1) y1 = qy;
          if (qx > 0 && comp[q - 1] < 0 && seg.lab[q - 1] === c) { comp[q - 1] = id; stack.push(q - 1); }
          if (qx < w - 1 && comp[q + 1] < 0 && seg.lab[q + 1] === c) { comp[q + 1] = id; stack.push(q + 1); }
          if (qy > 0 && comp[q - w] < 0 && seg.lab[q - w] === c) { comp[q - w] = id; stack.push(q - w); }
          if (qy < h - 1 && comp[q + w] < 0 && seg.lab[q + w] === c) { comp[q + w] = id; stack.push(q + w); }
        }
        if (px0.length >= 6) shapes.push({ c: c, px: px0, box: [x0, y0, x1, y1], size: Math.max(x1 - x0, y1 - y0) + 1 });
      }
    });
    var colourDone = -1, added = [];
    shapes.forEach(function (sh) {
      if (sh.c !== colourDone) { added.forEach(function (k) { grid.set(k, 1); }); added = []; colourDone = sh.c; }
      // work in a small window around the shape: much faster for images with many shapes
      var bx = Math.max(0, sh.box[0] - 2), by = Math.max(0, sh.box[1] - 2), bw = Math.min(w, sh.box[2] + 3) - bx, bh = Math.min(h, sh.box[3] + 3) - by;
      var mask = new Uint8Array(bw * bh); sh.px.forEach(function (j) { mask[(((j / w) | 0) - by) * bw + (j % w) - bx] = 1; });
      function shift(list) { return list.map(function (l) { var o = l.map(function (p) { return [p[0] + bx, p[1] + by]; }); if (l.closed) o.closed = true; return o; }); }
      var loops = shift(contours(mask, bw, bh)), perim = loops.reduce(function (s, l) { return s + plen(l, true); }, 0) || 1;
      var thickness = 2 * sh.px.length / perim;              // average width of this shape
      if (thickness < Math.max(4, Math.max(w, h) / 45) || thickness < sh.size * 0.05) {
        shift(skeleton(mask, bw, bh)).forEach(function (st) {
          var closed = !!st.closed, pts = chaikin(closed ? rdpClosed(st, eps) : rdp(st, eps), closed, 2);
          if (plen(pts, closed) < Math.max(3, minLen * 0.25) || duplicate(pts)) return;
          pieces.push({ pts: pts, closed: closed }); remember(closed ? pts.concat([pts[0]]) : pts, added);
        });
      } else {
        loops.forEach(function (l) {
          visibleRuns(l).forEach(function (run) {
            var closed = run.closed, pts = chaikin(closed ? rdpClosed(run.pts, eps) : rdp(run.pts, eps), closed, 2);
            if (plen(pts, closed) < (closed ? minLen : minLen * 0.6) || duplicate(pts)) return;
            pieces.push({ pts: pts, closed: closed }); remember(closed ? pts.concat([pts[0]]) : pts, added);
          });
        });
      }
    });
    added.forEach(function (k) { grid.set(k, 1); });
    return { path: joinPieces(pieces), w: w, h: h, pieces: pieces.length, photo: seg.photo, err: seg.err, core: seg.core };
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
    var styleSel = root.querySelector('.ol-style'), detail = root.querySelector('.ol-detail'), dl = root.querySelector('.ol-download'), again = root.querySelector('.ol-again'), exBox = root.querySelector('.ol-examples');
    var lastSource = null, job = 0, anim = 0, finished = null, started = false;

    function setStatus(t) { status.textContent = t; }
    function draw(d, dur) {
      cancelAnimationFrame(anim);
      pathEl.setAttribute('d', d); shadowEl.setAttribute('d', d);
      var sw = finished && finished.how === 'outline' ? 1.35 : Math.max(0.6, Math.min(1.4, 1.15 * Math.sqrt(1600 / Math.max(1, finished ? finished.points : 1600))));
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
      var count = +detail.value || 1600, mode = styleSel ? styleSel.value : 'auto', path = null, how = 'shading';
      if (mode !== 'shading') {
        setStatus('Tracing the shapes…'); await wait();
        var ol = outline(source, 420, count, mode === 'outline'); if (my !== job) return;
        if (ol && ol.path.length > 10 && (mode === 'outline' || !ol.photo)) { path = ol.path; how = 'outline'; w = ol.w; h = ol.h; }
        else if (mode === 'outline') { setStatus('There are no clear shapes to trace in that image. Try Shading instead.'); root.removeAttribute('data-busy'); return; }
      }
      if (!path) {
      var v = darkness(source, w, h); if (my !== job) return;
      setStatus('Placing ' + count.toLocaleString('en-GB') + ' dots…'); await wait();
      var pts = stipple(v, w, h, count, 11); if (my !== job) return;
      if (pts.length < 20) { setStatus('That image is too pale to draw. Try one with darker shapes.'); root.removeAttribute('data-busy'); return; }
      setStatus('Finding one line through every dot…'); await wait();
      path = route(pts, 900); if (my !== job) return;
      }
      var vb = 400, sc = (vb - 30) / Math.max(w, h), ox = (vb - w * sc) / 2, oy = (vb - h * sc) / 2;
      var d = curve(path, sc, ox, oy);
      finished = { d: d, label: label, points: path.length, how: how };
      draw(d, duration());
      setStatus('Drawn' + (label ? ': ' + label : '') + (how === 'outline' ? ', as an outline' : ', in shading') + ', in one line without lifting the pen.' + (how === 'shading' ? ' Busy photos come out loose and sketchy; a close-up of one thing works best.' : ''));
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
    function duration() { return finished.how === 'outline' ? Math.max(3800, Math.min(8000, pathEl.getTotalLength() * 1.6)) : 5200 + finished.points * 1.2; }
    again.addEventListener('click', function () { if (finished) draw(finished.d, duration()); });
    detail.addEventListener('change', function () { if (lastSource) run(lastSource.source, lastSource.label); });
    if (styleSel) styleSel.addEventListener('change', function () { if (lastSource) run(lastSource.source, lastSource.label); });

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
  window.OneLine = { mount: mount, _route: route, _stipple: stipple, _outline: outline, _segment: segment, _contours: contours };
})();
