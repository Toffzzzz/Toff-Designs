/*
 * Point targets for "A million specks": the typed name, a laptop, a phone and the Toff T.
 * Everything is drawn in code. Each surface of a shape is painted on a small 2D canvas (outlines strong,
 * fills faint, so the alpha is a density map), sampled into weighted points, and placed in 3D. The laptop,
 * the phone and the T are real 3D arrangements (a lid at an angle over a keyboard deck, a slab with a rim,
 * a T with depth) seen in three-quarter view, so the specks have volume and perspective.
 *
 * Every shape returns { pts: Float32Array(MAXP * 4) as x, y, z, shade; area } in CSS pixels, y up, centred
 * on the free area of the screen. `area` is roughly how many square pixels the shape covers on screen,
 * which the engines use to set each speck's brightness so every shape reads with the same density.
 */

export const MAXP = 262144;   // target points per shape (a 512 x 512 texture in the WebGL version)

const SERIF = '"Cormorant Garamond", Georgia, "Times New Roman", serif';
// The Toff T, as in favicon.svg (font units, y up).
const T_PATH = 'M188 607Q126 607 94.5 575.0Q63 543 49 466Q49 464 43.5 464.0Q38 464 38 466Q40 479 42.0 502.5Q44 526 46.5 553.0Q49 580 50.5 605.5Q52 631 52 647Q52 652 57.5 652.0Q63 652 63 647Q63 637 73.0 632.5Q83 628 95.5 626.5Q108 625 117 625Q203 622 318 622Q389 622 430.5 623.5Q472 625 511 625Q545 625 563.5 629.5Q582 634 587 650Q588 654 593.0 654.0Q598 654 598 650Q597 635 595.0 609.0Q593 583 592.0 555.0Q591 527 590.0 503.0Q589 479 589 466Q589 464 583.0 464.0Q577 464 577 466Q574 544 545.0 575.5Q516 607 449 607Q407 607 386.0 603.0Q365 599 358.5 585.5Q352 572 352 542V81Q352 52 359.0 37.0Q366 22 386.5 17.0Q407 12 449 12Q452 12 452.0 6.0Q452 0 449 0Q423 0 390.0 1.0Q357 2 318 2Q281 2 248.0 1.0Q215 0 188 0Q186 0 186.0 6.0Q186 12 188 12Q229 12 250.5 17.0Q272 22 279.0 37.0Q286 52 286 81V544Q286 574 279.0 587.5Q272 601 251.0 604.0Q230 607 188 607Z';

let fontReady = null;
export function loadFont() {
  if (!fontReady) {
    fontReady = (document.fonts && document.fonts.load)
      ? Promise.race([document.fonts.load(`500 120px ${SERIF}`), new Promise((r) => setTimeout(r, 1800))]).catch(() => {})
      : Promise.resolve();
  }
  return fontReady;
}

/* ---------- helpers ---------- */
function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  const g = c.getContext('2d', { willReadFrequently: true });
  g.lineCap = 'round'; g.lineJoin = 'round';
  return { c, g };
}
function rrect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function ink(g, a) { g.strokeStyle = `rgba(255,255,255,${a})`; g.fillStyle = `rgba(255,255,255,${a})`; }

/** Embossed shading from a blurred alpha: edges facing the light (top left) brighter, the others darker. */
function embossShade(alpha, w, h, radius) {
  const n = w * h, a = new Float32Array(n), t = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = alpha[i * 4 + 3] / 255;
  const r = Math.max(1, Math.round(radius));
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) { let acc = 0; const o = y * w; for (let x = -r; x <= r; x++) acc += a[o + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { t[o + x] = acc / (2 * r + 1); acc += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; } }
    for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += t[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { a[y * w + x] = acc / (2 * r + 1); acc += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
  }
  const shade = new Float32Array(n), lx = -0.62, ly = -0.78, k = r * 1.6;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const gx = (a[i + 1] - a[i - 1]) * k, gy = (a[i + w] - a[i - w]) * k;
    // gradient points inwards; the light comes from the top left, so inner slopes facing it catch it
    const lit = -(gx * lx + gy * ly);
    shade[i] = Math.max(0.35, Math.min(1.5, 0.82 + 0.75 * lit));
  }
  return shade;
}

/**
 * Collects weighted candidate points from faces, then draws `total` points by stratified sampling, so dense
 * strokes get many specks and faint fills a few, with no clumping.
 */
class Sampler {
  constructor() { this.faces = []; }
  /** A canvas face. map(u, v) -> [x, y, z] with u, v in 0..1 (v down the canvas). share: fraction of all points. */
  face(c, map, share, shadeOf) {
    const g = c.getContext('2d', { willReadFrequently: true });
    const data = g.getImageData(0, 0, c.width, c.height).data;
    this.faces.push({ w: c.width, h: c.height, data, map, share, shadeOf: shadeOf || (() => 1) });
  }
  /** A generator face: gen() -> [x, y, z, shade]. */
  gen(fn, share) { this.faces.push({ fn, share }); }
  build(total) {
    const out = new Float32Array(total * 4);
    const sumShare = this.faces.reduce((s, f) => s + f.share, 0);
    let k = 0;
    this.faces.forEach((f, fi) => {
      const count = fi === this.faces.length - 1 ? total - k : Math.round((total * f.share) / sumShare);
      if (f.fn) { for (let j = 0; j < count; j++, k++) { const p = f.fn(); out.set(p, k * 4); } return; }
      const { w, h, data } = f;
      const idx = [], cum = [];
      let sum = 0;
      for (let i = 0, n = w * h; i < n; i++) { const a = data[i * 4 + 3]; if (a > 2) { sum += a; idx.push(i); cum.push(sum); } }
      if (!sum) { k += count; return; }
      const step = sum / count;
      let c = 0;
      for (let j = 0; j < count; j++, k++) {
        const r = (j + Math.random()) * step;
        while (c < cum.length - 1 && cum[c] < r) c++;
        const i = idx[c], px = i % w, py = (i / w) | 0;
        const u = (px + Math.random()) / w, v = (py + Math.random()) / h;
        const p = f.map(u, v);
        out[k * 4] = p[0]; out[k * 4 + 1] = p[1]; out[k * 4 + 2] = p[2]; out[k * 4 + 3] = f.shadeOf(px, py, u, v);
      }
    });
    return out;
  }
}

/* 3 x 3 rotation (row-major helpers) */
function rotYXZ(yaw, pitch, roll) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  return (p) => {
    // yaw about y
    let x = cy * p[0] + sy * p[2], y = p[1], z = -sy * p[0] + cy * p[2];
    // pitch about x (positive brings the top towards us: a view from a little above)
    const y2 = cp * y - sp * z, z2 = sp * y + cp * z; y = y2; z = z2;
    // roll about z
    const x3 = cr * x - sr * y, y3 = sr * x + cr * y;
    return [x3, y3, z];
  };
}

/** Centres the points on (0, 0) in x, y, scales them to fit the box, and estimates the area they cover. */
function fitAndMeasure(pts, boxW, boxH) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const n = pts.length / 4;
  for (let i = 0; i < n; i++) {
    const x = pts[i * 4], y = pts[i * 4 + 1];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const s = Math.min(boxW / Math.max(1e-6, x1 - x0), boxH / Math.max(1e-6, y1 - y0));
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  for (let i = 0; i < n; i++) { pts[i * 4] = (pts[i * 4] - cx) * s; pts[i * 4 + 1] = (pts[i * 4 + 1] - cy) * s; pts[i * 4 + 2] *= s; }
  return measure(pts, (x1 - x0) * s, (y1 - y0) * s);
}
function measure(pts, w, h) {
  const cell = 2, gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, grid = new Uint8Array(gw * gh);
  const n = pts.length / 4;
  let cells = 0;
  for (let i = 0; i < n; i++) {
    const gx = Math.floor((pts[i * 4] + w / 2) / cell) + 1, gy = Math.floor((pts[i * 4 + 1] + h / 2) / cell) + 1;
    if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue;
    const j = gy * gw + gx;
    if (!grid[j]) { grid[j] = 1; cells++; }
  }
  return cells * cell * cell;
}

/* ---------- the name ---------- */
export function nameShape(text, availW, availH) {
  text = (text || '').trim() || 'Toff Studio';
  const probe = canvas2d(8, 8).g;
  const weight = 500;
  const lineSize = (lines) => {
    probe.font = `${weight} 100px ${SERIF}`;
    const widest = Math.max(...lines.map((l) => probe.measureText(l).width));
    return Math.min((availW * 0.9) / widest * 100, (availH * (lines.length === 1 ? 0.46 : 0.78)) / (lines.length * 1.0));
  };
  let lines = [text], size = lineSize(lines);
  const words = text.split(/\s+/);
  if (words.length > 1) {
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const two = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
      const s2 = lineSize(two);
      if (!best || s2 > best.s) best = { lines: two, s: s2 };
    }
    if (best && best.s > size * 1.25) { lines = best.lines; size = best.s; }
  }
  const lead = size * 1.0;
  const k = Math.min(2, 2400 / availW);            // canvas pixels per CSS pixel
  const cw = availW * k, ch = Math.max(lead * lines.length + size * 0.5, size) * k;
  const { c, g } = canvas2d(cw, ch);
  g.font = `${weight} ${size * k}px ${SERIF}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  ink(g, 1);
  lines.forEach((l, i) => g.fillText(l, cw / 2, ch / 2 + (i - (lines.length - 1) / 2) * lead * k));
  const data = g.getImageData(0, 0, c.width, c.height).data;
  const shade = embossShade(data, c.width, c.height, size * k * 0.035);
  const sm = new Sampler();
  sm.face(c, (u, v) => [(u - 0.5) * c.width / k, -(v - 0.5) * c.height / k, (Math.random() - 0.5) * 6], 1, (px, py) => shade[py * c.width + px]);
  const pts = sm.build(MAXP);
  return { pts, area: measure(pts, c.width / k, c.height / k), label: `the name “${text}”` };
}

/* ---------- a laptop ---------- */
function websiteMock(g, x, y, w, h, wide) {
  // a small website: navigation, headline, a picture and lines of text
  ink(g, 0.05); g.fillRect(x, y, w, h);
  const u = (f) => x + f * w, v = (f) => y + f * h;
  ink(g, 0.95); g.beginPath(); g.arc(u(0.07), v(0.09), h * 0.025, 0, Math.PI * 2); g.fill();
  g.lineWidth = h * 0.012;
  if (wide) { for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(u(0.62 + i * 0.085), v(0.09)); g.lineTo(u(0.68 + i * 0.085), v(0.09)); g.stroke(); } }
  else { for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(u(0.8), v(0.075 + i * 0.016)); g.lineTo(u(0.92), v(0.075 + i * 0.016)); g.stroke(); } }
  const img = wide ? [0.55, 0.2, 0.37, 0.5] : [0.07, 0.15, 0.86, 0.3];
  const grad = g.createLinearGradient(u(img[0]), v(img[1]), u(img[0] + img[2]), v(img[1] + img[3]));
  grad.addColorStop(0, 'rgba(255,255,255,0.42)'); grad.addColorStop(1, 'rgba(255,255,255,0.14)');
  g.fillStyle = grad; rrect(g, u(img[0]), v(img[1]), img[2] * w, img[3] * h, h * 0.02); g.fill();
  // a sun and hills inside the picture
  ink(g, 0.9); g.lineWidth = h * 0.01;
  g.beginPath(); g.arc(u(img[0] + img[2] * 0.72), v(img[1] + img[3] * 0.3), Math.min(img[2] * w, img[3] * h) * 0.1, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(u(img[0] + 0.02), v(img[1] + img[3] * 0.92));
  g.lineTo(u(img[0] + img[2] * 0.35), v(img[1] + img[3] * 0.5)); g.lineTo(u(img[0] + img[2] * 0.55), v(img[1] + img[3] * 0.75));
  g.lineTo(u(img[0] + img[2] * 0.7), v(img[1] + img[3] * 0.6)); g.lineTo(u(img[0] + img[2] - 0.02), v(img[1] + img[3] * 0.92)); g.stroke();
  // headline, text and a button
  const tx = wide ? 0.07 : 0.07, ty = wide ? 0.24 : 0.52, tw = wide ? 0.42 : 0.8;
  ink(g, 0.95);
  rrect(g, u(tx), v(ty), tw * w, h * (wide ? 0.06 : 0.035), h * 0.01); g.fill();
  rrect(g, u(tx), v(ty + (wide ? 0.09 : 0.05)), tw * 0.72 * w, h * (wide ? 0.06 : 0.035), h * 0.01); g.fill();
  ink(g, 0.42); g.lineWidth = h * 0.009;
  for (let i = 0; i < (wide ? 3 : 4); i++) { g.beginPath(); g.moveTo(u(tx), v(ty + (wide ? 0.22 : 0.13) + i * (wide ? 0.045 : 0.03))); g.lineTo(u(tx + tw * (i % 2 ? 0.8 : 0.95)), v(ty + (wide ? 0.22 : 0.13) + i * (wide ? 0.045 : 0.03))); g.stroke(); }
  ink(g, 0.9); g.lineWidth = h * 0.01;
  rrect(g, u(tx), v(wide ? 0.6 : 0.82), w * (wide ? 0.14 : 0.36), h * (wide ? 0.07 : 0.045), h * 0.02); g.stroke();
  if (wide) {
    ink(g, 0.3); g.lineWidth = h * 0.008;
    for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(u(0.07), v(0.8 + i * 0.05)); g.lineTo(u(0.93 - i * 0.2), v(0.8 + i * 0.05)); g.stroke(); }
  }
}

export function laptopShape(availW, availH) {
  const W = 1, D = 0.68, LH = 0.64, lean = 0.26;   // lid leans back about 15 degrees
  const sm = new Sampler();
  // the lid (screen side)
  { const { c, g } = canvas2d(1000, 640);
    ink(g, 1); g.lineWidth = 7; rrect(g, 4, 4, 992, 632, 34); g.stroke();
    ink(g, 0.7); g.lineWidth = 3; rrect(g, 34, 34, 932, 548, 6); g.stroke();
    ink(g, 1); g.beginPath(); g.arc(500, 18, 4, 0, Math.PI * 2); g.fill();
    websiteMock(g, 34, 34, 932, 548, true);
    const ly = Math.cos(lean), lz = -Math.sin(lean);
    sm.face(c, (u, v) => { const t = (1 - v) * LH; return [(u - 0.5) * W, t * ly, -D / 2 + t * lz]; }, 0.56, () => 1.05); }
  // the keyboard deck
  { const { c, g } = canvas2d(1000, 680);
    ink(g, 1); g.lineWidth = 7; rrect(g, 4, 4, 992, 672, 30); g.stroke();
    const rows = [14, 14, 13, 12, 11];
    const kx0 = 90, kx1 = 910, ky0 = 70, kh = 46, gap = 9;
    rows.forEach((nk, r) => {
      const kw = (kx1 - kx0 - gap * (nk - 1)) / nk;
      for (let i = 0; i < nk; i++) { ink(g, 0.5); g.lineWidth = 2.5; rrect(g, kx0 + i * (kw + gap), ky0 + r * (kh + gap), kw, kh, 6); g.stroke(); ink(g, 0.07); g.fill(); }
    });
    ink(g, 0.5); g.lineWidth = 2.5; rrect(g, 300, ky0 + 5 * (kh + gap), 400, kh, 6); g.stroke();
    ink(g, 0.85); g.lineWidth = 3.5; rrect(g, 340, 420, 320, 210, 16); g.stroke();
    sm.face(c, (u, v) => [(u - 0.5) * W, 0, -D / 2 + v * D], 0.36, () => 0.62); }
  // the front edge, with its notch
  { const { c, g } = canvas2d(1000, 24);
    ink(g, 0.8); g.fillRect(0, 0, 1000, 24); g.clearRect(440, 0, 120, 10);
    sm.face(c, (u, v) => [(u - 0.5) * W, -v * 0.028, D / 2], 0.06, () => 0.9); }
  // the hinge
  sm.gen(() => [(Math.random() - 0.5) * W * 0.9, Math.random() * 0.015, -D / 2 - 0.01, 0.8], 0.02);
  const pts = sm.build(MAXP);
  const rot = rotYXZ(0.5, 0.42, 0);
  for (let i = 0; i < MAXP; i++) { const p = rot([pts[i * 4], pts[i * 4 + 1], pts[i * 4 + 2]]); pts[i * 4] = p[0]; pts[i * 4 + 1] = p[1]; pts[i * 4 + 2] = p[2]; }
  const area = fitAndMeasure(pts, availW * 0.8, availH * 0.82);
  return { pts, area, label: 'a laptop showing a small website' };
}

/* ---------- a phone ---------- */
export function phoneShape(availW, availH) {
  const W = 0.49, H = 1, T = 0.06, R = 0.075;
  const sm = new Sampler();
  { const { c, g } = canvas2d(490, 1000);
    ink(g, 1); g.lineWidth = 7; rrect(g, 4, 4, 482, 992, 72); g.stroke();
    ink(g, 0.6); g.lineWidth = 2.5; rrect(g, 20, 20, 450, 960, 58); g.stroke();
    ink(g, 1); rrect(g, 190, 38, 110, 30, 15); g.fill();
    websiteMock(g, 20, 86, 450, 860, false);
    ink(g, 0.9); g.lineWidth = 5; g.beginPath(); g.moveTo(190, 962); g.lineTo(300, 962); g.stroke();
    sm.face(c, (u, v) => [(u - 0.5) * W, (0.5 - v) * H, T / 2], 0.84, () => 1.05); }
  // the rim: points on the rounded outline, through the thickness
  const per = () => {
    // a random point on a rounded rectangle's outline
    const sw = W - 2 * R, sh = H - 2 * R, arc = (Math.PI / 2) * R, L = 2 * sw + 2 * sh + 4 * arc;
    let d = Math.random() * L;
    const seg = [sw, arc, sh, arc, sw, arc, sh, arc];
    let i = 0; while (d > seg[i]) { d -= seg[i]; i++; }
    const a = d / R;
    switch (i) {
      case 0: return [-sw / 2 + d, H / 2];
      case 1: return [sw / 2 + R * Math.sin(a), sh / 2 + R * Math.cos(a)];
      case 2: return [W / 2, sh / 2 - d];
      case 3: return [sw / 2 + R * Math.cos(a), -sh / 2 - R * Math.sin(a)];
      case 4: return [sw / 2 - d, -H / 2];
      case 5: return [-sw / 2 - R * Math.sin(a), -sh / 2 - R * Math.cos(a)];
      case 6: return [-W / 2, -sh / 2 + d];
      default: return [-sw / 2 - R * Math.cos(a), sh / 2 + R * Math.sin(a)];
    }
  };
  sm.gen(() => { const p = per(); return [p[0], p[1], (Math.random() - 0.5) * T, 0.7]; }, 0.13);
  // the side buttons
  sm.gen(() => [W / 2 + 0.006, 0.22 + Math.random() * 0.14, (Math.random() - 0.5) * T * 0.5, 0.9], 0.03);
  const pts = sm.build(MAXP);
  const rot = rotYXZ(-0.52, 0.1, -0.1);
  for (let i = 0; i < MAXP; i++) { const p = rot([pts[i * 4], pts[i * 4 + 1], pts[i * 4 + 2]]); pts[i * 4] = p[0]; pts[i * 4 + 1] = p[1]; pts[i * 4 + 2] = p[2]; }
  const area = fitAndMeasure(pts, availW * 0.8, availH * 0.86);
  return { pts, area, label: 'a phone showing a small website' };
}

/* ---------- the Toff T ---------- */
export function tShape(availW, availH) {
  const S = 900, { c, g } = canvas2d(S, S);
  const k = (S * 0.6) / 654;                         // the glyph is 654 units tall
  const path = new Path2D(T_PATH);
  g.setTransform(k, 0, 0, -k, S / 2 - 318 * k, S / 2 + 327 * k);
  ink(g, 1); g.fill(path);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const data = g.getImageData(0, 0, S, S).data;
  const shade = embossShade(data, S, S, S * 0.012);
  // the edge pixels give the sides their depth
  const edge = canvas2d(S, S);
  { const ed = edge.g.createImageData(S, S);
    for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
      const i = y * S + x, a = data[i * 4 + 3];
      if (a > 20 && (data[(i - 1) * 4 + 3] < 128 || data[(i + 1) * 4 + 3] < 128 || data[(i - S) * 4 + 3] < 128 || data[(i + S) * 4 + 3] < 128)) ed.data[i * 4 + 3] = 255;
    }
    edge.g.putImageData(ed, 0, 0); }
  // the rounded square the T sits in (as in the favicon)
  const frame = canvas2d(S, S);
  ink(frame.g, 1); frame.g.lineWidth = 3; rrect(frame.g, S * 0.12, S * 0.12, S * 0.76, S * 0.76, S * 0.14); frame.g.stroke();
  const depth = 0.07;
  const sm = new Sampler();
  sm.face(c, (u, v) => [u - 0.5, 0.5 - v, depth / 2], 0.66, (px, py) => shade[py * S + px]);
  sm.face(edge.c, (u, v) => [u - 0.5, 0.5 - v, depth / 2 - Math.random() * depth], 0.22, () => 0.6);
  sm.face(frame.c, (u, v) => [u - 0.5, 0.5 - v, -depth * 0.6], 0.12, () => 0.55);
  const pts = sm.build(MAXP);
  const rot = rotYXZ(0.32, 0.06, 0);
  for (let i = 0; i < MAXP; i++) { const p = rot([pts[i * 4], pts[i * 4 + 1], pts[i * 4 + 2]]); pts[i * 4] = p[0]; pts[i * 4 + 1] = p[1]; pts[i * 4 + 2] = p[2]; }
  const area = fitAndMeasure(pts, availW * 0.82, availH * 0.84);
  return { pts, area, label: 'the Toff Studio T' };
}

export function makeShape(kind, name, availW, availH) {
  if (kind === 'laptop') return laptopShape(availW, availH);
  if (kind === 'phone') return phoneShape(availW, availH);
  if (kind === 't') return tShape(availW, availH);
  return nameShape(name, availW, availH);
}

/** The cloud the specks start from on a first visit: a wide, deep drift of dust. */
export function cloud(i, w, h, rnd) {
  const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
  return [Math.cos(a) * r * w * 0.62, Math.sin(a) * r * h * 0.62, (rnd() - 0.5) * 600];
}
