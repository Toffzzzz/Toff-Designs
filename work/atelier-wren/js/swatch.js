/*
 * Atelier Wren: hair swatches drawn in code (a classic script, not a module, so the lookbook's
 * pictures exist before the first paint and the View Transitions always have something to morph).
 *
 * A swatch is a lock of hair held in a slim clip, the way a colourist shows a shade: about 140
 * strands from a seeded random generator, each a smooth curve from the clip to its tip, over a
 * filled body in the same colours, with a band of sheen. Every look has its own length, cut line,
 * movement and colour. The same key always draws exactly the same swatch on every page.
 *
 *   <svg data-swatch="soft-bob" viewBox="0 0 200 320" role="img" aria-label="…"></svg>
 *   WrenSwatch.renderAll(document)        draws every [data-swatch] that is still empty
 *   WrenSwatch.reveal(svg, p)             combs it in from the top: p 0 (hidden) to 1 (all there)
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var W = 200, H = 320, CX = 100, ROOT_Y = 26, CLIP_W = 50;

  // root → mid → end colours, sheen, length, spread at the tips, cut line, movement
  var LOOKS = {
    'soft-bob':        { seed: 11, len: 150, spread: 150, end: 'blunt',   bend: 9,  wave: [0, 0],     c: ['#22160f', '#3d281b', '#56392a'], sheen: '#a37b5f', n: 150 },
    'long-layers':     { seed: 23, len: 272, spread: 122, end: 'layered', wave: [3, 1.1],             c: ['#1f140d', '#3a271a', '#674733'], sheen: '#a8805f', n: 140 },
    'honey-balayage':  { seed: 37, len: 262, spread: 132, end: 'v',       wave: [5, 1.5],             c: ['#33210f', '#86592f', '#d4a66b'], sheen: '#f3d7a3', n: 140 },
    'copper-gloss':    { seed: 41, len: 208, spread: 112, end: 'blunt',   wave: [0, 0],               c: ['#4e1f0f', '#9c4426', '#c9693b'], sheen: '#f6b07f', n: 140 },
    'smooth-blow-dry': { seed: 53, len: 226, spread: 138, end: 'blunt',   curl: 22, wave: [0, 0],     c: ['#17110e', '#2e221b', '#46342a'], sheen: '#9a7c66', n: 150 },
    'soft-waves':      { seed: 67, len: 262, spread: 150, end: 'v',       wave: [9, 2.2],             c: ['#5c4130', '#9c7854', '#c7a47b'], sheen: '#eed7b5', n: 150 },
    // the before and after
    'before':          { seed: 79, len: 236, spread: 156, end: 'ragged',  wave: [2, 1.3], frizz: 7, fly: 12, regrowth: 0.2, c: ['#33251b', '#b5722e', '#d89b4c'], sheen: '#e9bd78', sheenOpacity: 0.25, n: 140 },
    'after':           { seed: 79, len: 214, spread: 140, end: 'blunt',   bend: 5, wave: [2, 1.3],    c: ['#2f231b', '#6f5641', '#a3836a'], sheen: '#e2cdb0', n: 150 }
  };

  function rng(seed) {   // mulberry32
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(a, b, t) {
    var A = hex(a), B = hex(b);
    return '#' + [0, 1, 2].map(function (i) { return Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0'); }).join('');
  }
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  var f1 = function (n) { return Math.round(n * 10) / 10; };

  // Catmull-Rom through the points, as one cubic Bézier path
  function smooth(pts) {
    var d = 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += 'C' + f1(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f1(p1[1] + (p2[1] - p0[1]) / 6) + ' ' +
        f1(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f1(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f1(p2[0]) + ' ' + f1(p2[1]);
    }
    return d;
  }

  function strand(L, u, r, K, opts) {
    var rootX = CX + (u - 0.5) * CLIP_W + (r() - 0.5) * 0.8;
    var len = L.len, a = Math.abs(2 * u - 1);
    if (L.end === 'layered') len *= 0.74 + 0.26 * (1 - Math.pow(a, 1.6));
    else if (L.end === 'v') len *= 0.88 + 0.12 * (1 - a);
    else if (L.end === 'ragged') len *= 0.66 + 0.34 * r();
    len *= 1 + (r() - 0.5) * (L.end === 'blunt' ? 0.012 : 0.03);
    if (opts && opts.fly) len *= 0.5 + r() * 0.5;
    var endX = CX + (u - 0.5) * L.spread + (r() - 0.5) * 3;
    var phase = (L.seed % 7) + u * 0.7 + r() * 0.35;
    var amp = L.wave[0] * (0.85 + r() * 0.3), freq = L.wave[1];
    var pts = [];
    for (var k = 0; k <= K; k++) {
      var t = k / K;
      var fan = 1 - Math.pow(1 - Math.min(1, t * 2.6), 2);
      var x = rootX + (endX - rootX) * fan;
      var y = ROOT_Y + t * len;
      if (amp) x += amp * Math.sin(Math.PI * 2 * freq * t + phase) * Math.min(1, t * 2.2);
      if (L.bend) { var s = Math.max(0, (t - 0.82) / 0.18); x -= (u - 0.5) * 2 * L.bend * s * s; y -= L.bend * 0.5 * s * s * s; }
      if (L.curl) { var c = Math.max(0, (t - 0.66) / 0.34); x -= (u - 0.5) * 2 * L.curl * c * c * 0.9; y -= L.curl * 0.55 * c * c * c; }
      if (L.frizz) x += (r() - 0.5) * L.frizz * Math.pow(t, 2.4) * 2;
      if (opts && opts.fly) { x += (r() - 0.5) * 26 * Math.pow(t, 2); y += (r() - 0.5) * 6 * t; }
      pts.push([x, y]);
    }
    return pts;
  }

  function render(svg, key) {
    var L = LOOKS[key];
    if (!L || svg.getAttribute('data-drawn')) return;
    var r = rng(L.seed * 7919 + 1), id = 'sw-' + key + '-' + Math.floor(r() * 1e6).toString(36);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('data-drawn', '1');
    var defs = el('defs', {}, svg);
    var y0 = ROOT_Y, y1 = ROOT_Y + L.len;
    var rg = L.regrowth || 0.16;

    function ramp(gid, c0, c1, c2) {
      var g = el('linearGradient', { id: gid, gradientUnits: 'userSpaceOnUse', x1: 0, y1: y0, x2: 0, y2: y1 }, defs);
      if (L.regrowth) {   // a hard line where old colour meets the roots
        el('stop', { offset: 0, 'stop-color': c0 }, g);
        el('stop', { offset: rg, 'stop-color': mix(c0, c1, 0.25) }, g);
        el('stop', { offset: rg + 0.07, 'stop-color': mix(c1, c0, 0.15) }, g);
        el('stop', { offset: 0.6, 'stop-color': c1 }, g);
      } else {
        el('stop', { offset: 0, 'stop-color': c0 }, g);
        el('stop', { offset: rg, 'stop-color': c0 }, g);
        el('stop', { offset: 0.5, 'stop-color': c1 }, g);
      }
      el('stop', { offset: 1, 'stop-color': c2 }, g);
    }
    ramp(id + '-a', L.c[0], L.c[1], L.c[2]);
    ramp(id + '-b', mix(L.c[0], '#000000', 0.25), mix(L.c[1], L.c[0], 0.35), mix(L.c[2], L.c[1], 0.4));
    ramp(id + '-c', L.c[0], mix(L.c[1], L.sheen, 0.25), mix(L.c[2], L.sheen, 0.3));
    var sh = el('linearGradient', { id: id + '-s', gradientUnits: 'userSpaceOnUse', x1: 0, y1: y0, x2: 0, y2: y1 }, defs);
    var so = L.sheenOpacity != null ? L.sheenOpacity : 0.85;
    [[0, 0], [0.2, 0], [0.31, so], [0.4, so * 0.55], [0.52, 0], [0.7, 0], [0.8, so * 0.35], [0.88, 0], [1, 0]].forEach(function (s) {
      el('stop', { offset: s[0], 'stop-color': L.sheen, 'stop-opacity': s[1] }, sh);
    });
    // the comb-in reveal: a soft-edged mask that slides down
    var mg = el('linearGradient', { id: id + '-mg', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0.8, 'stop-color': '#fff' }, mg);
    el('stop', { offset: 1, 'stop-color': '#000' }, mg);
    var mask = el('mask', { id: id + '-m', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H }, defs);
    var mrect = el('rect', { x: 0, y: 0, width: W, height: H * 1.25, fill: 'url(#' + id + '-mg)' }, mask);

    var hair = el('g', { class: 'swatch__hair' }, svg);
    var K = 14, N = L.n, strands = [];
    for (var i = 0; i < N; i++) {
      var u = (i + r() * 0.8) / N;
      strands.push({ u: u, pts: strand(L, u, r, K) });
    }
    strands.sort(function (a, b) { return a.u - b.u; });

    // the body: left edge down, along the tips, right edge up
    var left = strands[2].pts, right = strands[N - 3].pts, tips = strands.map(function (s) { return s.pts[s.pts.length - 1]; });
    // ragged and layered ends stay as loose strands: the body stops above them
    var short = L.end === 'ragged' ? 0.66 : L.end === 'layered' ? 0.84 : L.end === 'v' ? 0.95 : 0.985;
    var lift = function (p) { return [p[0], y0 + (p[1] - y0) * short]; };
    var bodyTips = tips.filter(function (p, j) { return j % 4 === 0; }).map(lift);
    var body = left.slice(0, -1).map(function (p, j) { return j > K * short ? lift(p) : p; })
      .concat(bodyTips)
      .concat(right.slice(0, -1).map(function (p, j) { return j > K * short ? lift(p) : p; }).reverse());
    var inset = body.map(function (p) { return [CX + (p[0] - CX) * 0.992, p[1]]; });
    // the body fades out just above the loose ends, so it never shows a hard edge
    var bg = el('linearGradient', { id: id + '-f', gradientUnits: 'userSpaceOnUse', x1: 0, y1: y0, x2: 0, y2: y1 }, defs);
    [[0, L.c[0], 1], [Math.min(0.45, short - 0.22), mix(L.c[1], L.c[0], 0.35), 1], [short - 0.1, mix(L.c[2], L.c[1], 0.45), 1], [short, mix(L.c[2], L.c[1], 0.45), 0]].forEach(function (st) {
      el('stop', { offset: f1(st[0] * 100) / 100, 'stop-color': st[1], 'stop-opacity': st[2] }, bg);
    });
    el('path', { d: smooth(inset) + 'Z', fill: 'url(#' + id + '-f)' }, hair);

    var grads = ['-a', '-a', '-b', '-c'];
    strands.forEach(function (s) {
      el('path', {
        d: smooth(s.pts), fill: 'none', stroke: 'url(#' + id + grads[Math.floor(r() * grads.length)] + ')',
        'stroke-width': f1(0.5 + r() * 0.85), 'stroke-linecap': 'round', opacity: f1(s.u < 0.05 || s.u > 0.95 ? 0.95 : 0.6 + r() * 0.4)
      }, hair);
    });
    // sheen: finer strands that only show in the light bands
    for (var j = 0; j < N * 0.45; j++) {
      var su = 0.06 + r() * 0.88;
      el('path', { d: smooth(strand(L, su, r, K)), fill: 'none', stroke: 'url(#' + id + '-s)', 'stroke-width': f1(0.35 + r() * 0.6), 'stroke-linecap': 'round' }, hair);
    }
    if (L.fly) for (var q = 0; q < L.fly; q++) {
      el('path', { d: smooth(strand(L, r(), r, K, { fly: true })), fill: 'none', stroke: 'url(#' + id + '-a)', 'stroke-width': 0.4, 'stroke-linecap': 'round', opacity: 0.8 }, hair);
    }

    // the clip
    var clip = el('g', { class: 'swatch__clip' }, svg);
    el('rect', { x: CX - CLIP_W / 2 - 7, y: ROOT_Y - 13, width: CLIP_W + 14, height: 15, rx: 2, fill: 'var(--swatch-clip, #111111)' }, clip);
    el('rect', { x: CX - CLIP_W / 2 - 3, y: ROOT_Y - 7, width: CLIP_W + 6, height: 1.2, fill: 'var(--swatch-clip-line, #D9B3B5)' }, clip);

    svg.__wren = { hair: hair, mask: mask, mrect: mrect, maskId: id + '-m', p: 1 };
  }

  function reveal(svg, p) {
    var s = svg && svg.__wren;
    if (!s) return;
    p = Math.max(0, Math.min(1, p));
    if (p === s.p) return;
    s.p = p;
    if (p >= 1) { s.hair.removeAttribute('mask'); return; }
    s.hair.setAttribute('mask', 'url(#' + s.maskId + ')');
    s.mrect.setAttribute('y', f1(-H * 1.25 + p * H * 2.25));
  }

  function renderAll(root) {
    var list = (root || document).querySelectorAll('svg[data-swatch]');
    for (var i = 0; i < list.length; i++) render(list[i], list[i].getAttribute('data-swatch'));
  }

  window.WrenSwatch = { LOOKS: LOOKS, render: render, renderAll: renderAll, reveal: reveal };
  renderAll(document);
})();
