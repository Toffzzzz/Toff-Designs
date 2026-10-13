/*
 * Shape a vase: turning a hand-drawn half outline into a profile the lathe can throw.
 *
 *   fromStroke(points, axisX, { minHeight })  -> { profile } | { error: 'short' | 'few' }
 *       points: [[x, y], …] in CSS px on the drawing surface (y down), in drawing order.
 *       The result is a profile [[r, y], …] from foot to rim, 1 unit tall (y up), that is
 *       monotonic in height, never thinner than a wall can make, with a foot that stands
 *       and a lip that turns out a little.
 *   PRESETS            the shapes offered as a start and for keyboard users
 *   sampleOutline(p)   a smooth [[r, y], …] polyline through a profile (for drawing it flat)
 *   radiusAt(p, y)     radius of a normalised outline at height y (0..1)
 *   shapeWords(p)      a plain-English description of a profile's shape
 */

export const PRESETS = [
  { id: 'bud', label: 'Bud vase', words: 'a small bud vase',
    profile: [[2.6, 0], [3.5, 1.4], [4.3, 4], [4.0, 6.4], [2.7, 8.5], [1.45, 9.9], [1.35, 11], [1.75, 12]] },
  { id: 'moon', label: 'Moon jar', words: 'a moon jar',
    profile: [[3.1, 0], [3.7, 0.45], [5.7, 2], [7.6, 4.6], [8.4, 7.4], [8.0, 10.2], [6.4, 12.5], [4.3, 14.1], [3.8, 14.9], [4.1, 15.7]] },
  { id: 'bottle', label: 'Bottle', words: 'a tall bottle vase',
    profile: [[4.4, 0], [5.5, 1.1], [6.6, 5], [6.9, 11.5], [6.3, 16.5], [4.1, 20.5], [2.1, 23.8], [1.75, 29], [2.3, 32]] },
  { id: 'bowl', label: 'Bowl', words: 'a deep bowl',
    profile: [[3.0, 0], [3.7, 0.6], [5.8, 2.4], [7.2, 4.8], [7.75, 7.4]] },
];

const R_MIN = 0.055;     // the narrowest a neck may get (the lathe's wall is 0.032 of the height)
const R_MAX = 1.5;       // the widest a bowl may get, in heights
const BINS = 48;

export function normalise(profile) {
  const src = profile.slice().sort((a, b) => a[1] - b[1]);
  const y0 = src[0][1], h = Math.max(1e-6, src[src.length - 1][1] - y0);
  return src.map(([r, y]) => [r / h, (y - y0) / h]);
}

export function fromStroke(points, axisX, { minHeight = 60 } = {}) {
  if (!points || points.length < 4) return { error: 'few' };
  // radius and height (y up) for every point, with the segments filled in so fast strokes still cover every height
  const raw = points.map(([x, y]) => [Math.abs(x - axisX), -y]);
  let yLo = Infinity, yHi = -Infinity;
  raw.forEach(([, y]) => { yLo = Math.min(yLo, y); yHi = Math.max(yHi, y); });
  const H = yHi - yLo;
  if (H < minHeight) return { error: 'short' };
  const sum = new Float64Array(BINS), cnt = new Float64Array(BINS);
  const add = (r, y) => {
    const i = Math.max(0, Math.min(BINS - 1, Math.round(((y - yLo) / H) * (BINS - 1))));
    sum[i] += r; cnt[i] += 1;
  };
  for (let i = 0; i < raw.length; i++) {
    const [r, y] = raw[i];
    add(r, y);
    if (i) {
      const [pr, py] = raw[i - 1], steps = Math.ceil(Math.abs(y - py) / (H / BINS / 2));
      for (let k = 1; k < steps; k++) { const t = k / steps; add(pr + (r - pr) * t, py + (y - py) * t); }
    }
  }
  // mean radius per height; gaps filled from their neighbours
  let r = Array.from(sum, (s, i) => (cnt[i] ? s / cnt[i] / H : NaN));
  for (let i = 0; i < BINS; i++) {
    if (!Number.isNaN(r[i])) continue;
    let a = i - 1; while (a >= 0 && Number.isNaN(r[a])) a--;
    let b = i + 1; while (b < BINS && Number.isNaN(r[b])) b++;
    r[i] = a < 0 ? r[b] : b >= BINS ? r[a] : r[a] + (r[b] - r[a]) * ((i - a) / (b - a));
  }
  // smooth out the hand's tremor (a few passes of a small kernel keep the intended curves)
  for (let pass = 0; pass < 4; pass++) {
    const n = r.slice();
    for (let i = 0; i < BINS; i++) n[i] = (r[Math.max(0, i - 1)] + 2 * r[i] + r[Math.min(BINS - 1, i + 1)]) / 4;
    r = n;
  }
  r = r.map((v) => Math.min(R_MAX, Math.max(R_MIN, v)));
  return { profile: tidy(r.map((v, i) => [v, i / (BINS - 1)])) };
}

/* Foot, lip and a sensible number of control points, from a dense normalised [[r, y]] */
function tidy(dense) {
  const maxR = Math.max(...dense.map((p) => p[0]));
  const at = (y) => radiusAt(dense, y);
  // a foot that stands: at least a third of the widest point, with a small bevel where it meets the table
  const foot = Math.max(at(0.02), maxR * 0.36, 0.1);
  const out = [[foot * 0.93, 0], [foot, 0.03]];
  // the body: control points every tenth of the height, eased into the foot over the bottom fifth
  for (let k = 0; k < 9; k++) {
    const y = 0.1 + k * 0.1;
    let v = at(y);
    if (y < 0.22) { const t = (y - 0.03) / (0.22 - 0.03); v = foot + (v - foot) * (t * t * (3 - 2 * t)); }
    out.push([Math.max(R_MIN, v), y]);
  }
  // the lip: the rim turns out a little (more on a narrow neck, where it shows)
  const rimR = Math.max(R_MIN * 1.1, at(0.97));
  const flare = 0.012 + 0.03 * Math.max(0, 1 - rimR / Math.max(0.2, maxR));
  out.push([rimR + flare, 1]);
  return out.map(([a, b]) => [round(a), round(b)]);
}
const round = (v) => Math.round(v * 10000) / 10000;

/* radius at height y of a normalised outline [[r, y]] sorted by y (linear between points) */
export function radiusAt(p, y) {
  if (y <= p[0][1]) return p[0][0];
  for (let i = 1; i < p.length; i++) {
    if (y <= p[i][1]) { const [r0, y0] = p[i - 1], [r1, y1] = p[i]; return r0 + (r1 - r0) * ((y - y0) / Math.max(1e-9, y1 - y0)); }
  }
  return p[p.length - 1][0];
}

/* A smooth polyline through the profile (Catmull-Rom), normalised: 1 unit tall */
export function sampleOutline(profile, per = 14) {
  const P = normalise(profile);
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([Math.max(0.001, f(p0[0], p1[0], p2[0], p3[0])), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(P[P.length - 1].slice());
  return out;
}

/* Plain words for a shape, for the text alternative and the status line */
export function shapeWords(profile) {
  const P = sampleOutline(profile, 10);
  let maxR = 0, maxY = 0;
  P.forEach(([r, y]) => { if (r > maxR) { maxR = r; maxY = y; } });
  const rim = P[P.length - 1][0], foot = P[0][0];
  const ratio = 1 / (2 * maxR);   // height over width
  let neckR = Infinity; P.forEach(([r, y]) => { if (y > maxY) neckR = Math.min(neckR, r); });
  if (!Number.isFinite(neckR)) neckR = rim;
  const shape = ratio > 2.3 ? 'tall and slender' : ratio > 1.5 ? 'taller than it is wide' : ratio > 1.05 ? 'a little taller than it is wide'
    : ratio > 0.8 ? 'about as wide as it is tall' : ratio > 0.5 ? 'low and wide, more a bowl than a vase' : 'a wide, shallow bowl';
  const widest = maxY < 0.3 ? 'widest low down' : maxY < 0.62 ? 'widest around the middle' : maxY < 0.92 ? 'widest high up, at the shoulder' : '';
  const top = maxY >= 0.92 ? 'opening out all the way to the rim'
    : neckR / maxR < 0.38 ? 'narrowing to a slim neck' : neckR / maxR < 0.75 ? 'narrowing to a neck' : 'with a wide mouth';
  const footW = foot / maxR < 0.5 ? 'on a small foot' : 'on a broad foot';
  return [shape, widest, top, footW].filter(Boolean).join(', ');
}
