/*
 * Glyphs with real shapes: a letter is drawn once on a canvas in Cormorant Garamond, its pixels are
 * cut into horizontal slabs, and each separate run of ink in a slab becomes one convex hull. Together
 * the hulls follow the letter (an O is a ring, an A has two legs and a bar, a T has its arm), so letters
 * stack and catch on each other the way their shapes say they should.
 *
 *   glyph(ch, { px, family, dpr, fill, shadow }) -> { ch, w, h, parts: [[[x, y], ...], ...], sprite, shadowSprite }
 *   parts are in CSS px, centred on the letter's box; sprites are canvases at dpr, drawn centred.
 */

const cache = new Map();

function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function area(poly) { let a = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; }
/* drop vertices until at most `max` remain, removing the one that changes the area least each time */
function simplify(poly, max) {
  const p = poly.slice();
  while (p.length > max) {
    let best = 0, bestA = Infinity;
    for (let i = 0; i < p.length; i++) {
      const a = p[(i + p.length - 1) % p.length], b = p[i], c = p[(i + 1) % p.length];
      const t = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
      if (t < bestA) { bestA = t; best = i; }
    }
    p.splice(best, 1);
  }
  return p;
}

/* The body is solid where a cut-out letter would be: narrow openings closed (dilate, then erode)
   and enclosed counters filled, so no other letter can sit inside an o or the mouth of an e. */
function spread(m, W, H, r, val) {           // square dilation (val 1) or erosion (val 0), separable
  const t = new Uint8Array(m.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = 1 - val;
    for (let k = Math.max(0, x - r); k <= Math.min(W - 1, x + r); k++) if (m[y * W + k] === val) { v = val; break; }
    t[y * W + x] = v;
  }
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    let v = 1 - val;
    for (let k = Math.max(0, y - r); k <= Math.min(H - 1, y + r); k++) if (t[k * W + x] === val) { v = val; break; }
    m[y * W + x] = v;
  }
}
function solidify(on, W, H, r) {
  const c = on.slice();
  spread(c, W, H, r, 1); spread(c, W, H, r, 0);
  const out = new Uint8Array(W * H), stack = [];          // flood the outside from the border
  for (let x = 0; x < W; x++) { stack.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++) { stack.push(y * W, y * W + W - 1); }
  while (stack.length) {
    const i = stack.pop();
    if (out[i] || c[i]) continue;
    out[i] = 1;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) stack.push(i - 1); if (x < W - 1) stack.push(i + 1); if (y > 0) stack.push(i - W); if (y < H - 1) stack.push(i + W);
  }
  for (let i = 0; i < on.length; i++) on[i] = on[i] || !out[i] ? 1 : 0;
}

export function glyph(ch, { px, family, weight = 400, dpr = 1, fill, shadow }) {
  const key = [ch, px, family, weight, dpr, fill, shadow].join('|');
  if (cache.has(key)) return cache.get(key);
  const font = `${weight} ${px}px ${family}`;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;
  const m = probe.measureText(ch);
  const pad = Math.ceil(px * 0.08) + 2;
  const left = Math.ceil(m.actualBoundingBoxLeft || 0), right = Math.ceil(m.actualBoundingBoxRight || m.width);
  const asc = Math.ceil(m.actualBoundingBoxAscent || px * 0.7), desc = Math.ceil(m.actualBoundingBoxDescent || 0);
  const W = left + right + pad * 2, H = asc + desc + pad * 2;
  if (W <= pad * 2 || H <= pad * 2) return null;

  // 1. the mask, at 1 CSS px per pixel
  const mc = document.createElement('canvas'); mc.width = W; mc.height = H;
  const g = mc.getContext('2d', { willReadFrequently: true });
  g.font = font; g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
  g.fillText(ch, pad + left, pad + asc);
  const data = g.getImageData(0, 0, W, H).data;
  let x0 = W, x1 = -1, y0 = H, y1 = -1;
  const on = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (data[(y * W + x) * 4 + 3] > 110) { on[y * W + x] = 1; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, cx = x0 + bw / 2, cy = y0 + bh / 2;
  solidify(on, W, H, Math.max(2, Math.round(px * 0.035)));

  // 2. slabs -> runs -> hulls
  const slabs = Math.max(5, Math.min(11, Math.round(bh / 14)));
  const sh = bh / slabs, parts = [];
  for (let s = 0; s < slabs; s++) {
    const ya = Math.floor(y0 + s * sh), yb = Math.min(y1 + 1, Math.ceil(y0 + (s + 1) * sh));
    const col = new Uint8Array(bw);
    for (let y = ya; y < yb; y++) for (let x = x0; x <= x1; x++) if (on[y * W + x]) col[x - x0] = 1;
    const runs = [];
    for (let i = 0; i < bw; i++) {
      if (!col[i]) continue;
      const last = runs[runs.length - 1];
      if (last && i - last[1] <= 2) last[1] = i; else runs.push([i, i]);
    }
    runs.forEach(([ra, rb]) => {
      const pts = [];
      for (let y = ya; y < yb; y++) {
        let l = -1, r = -1;
        for (let x = x0 + ra; x <= x0 + rb; x++) if (on[y * W + x]) { if (l < 0) l = x; r = x; }
        if (l < 0) continue;
        pts.push([l, y], [r + 1, y], [l, y + 1], [r + 1, y + 1]);
      }
      if (pts.length < 4) return;
      let h = hull(pts);
      if (area(h) < 4) return;
      h = simplify(h, 8);
      // a hair of overlap with the slabs above and below so the pieces read as one solid
      parts.push(h.map(([x, y]) => [x - cx, y - cy + (y <= ya + 0.5 ? -0.6 : y >= yb - 0.5 ? 0.6 : 0)]));
    });
  }

  // 3. sprites at the screen's pixel density
  function sprite(colour) {
    const c = document.createElement('canvas');
    c.width = Math.ceil((bw + 4) * dpr); c.height = Math.ceil((bh + 4) * dpr);
    const k = c.getContext('2d');
    k.scale(dpr, dpr); k.font = font; k.fillStyle = colour; k.textBaseline = 'alphabetic';
    k.fillText(ch, pad + left - x0 + 2, pad + asc - y0 + 2);
    return c;
  }
  const out = { ch, w: bw, h: bh, parts, sprite: sprite(fill), shadowSprite: sprite(shadow), sw: bw + 4, shh: bh + 4 };
  cache.set(key, out);
  return out;
}

export function clearGlyphs() { cache.clear(); }
