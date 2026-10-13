/*
 * Cursive: lays out any short name in the handwriting line's own pen (the Hershey cursive font),
 * the same way tools/handwriting/build_line.py builds the opening line: each word's letters chained
 * into one stroke where they meet, i dots and t bars added after the word (as a person writes),
 * a pen lift between words, then smoothed so the curves are calm and round.
 *
 *   const plan = layoutName('Ada Lovelace', { width, height, cx, cy, maxLineHeight })
 *   plan.strokes = [{ pts: [[x, y], ...], len }]   in the caller's pixels, in writing order
 *   plan.text    = the text actually written (characters the font lacks are dropped)
 */
import { GLYPHS } from './cursive-data.js';

const SPACE = (GLYPHS[' '][1] - GLYPHS[' '][0]) * 0.42;   // build_line.py word_space
const TOP = -12, BOTTOM = 21;                                // font extent (cap top to descender)

export function cleanName(raw, max = 24) {
  const s = String(raw || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/\s+/g, ' ').trim();
  return s.slice(0, max).trim();
}

function pairs(flat) { const o = []; for (let i = 0; i < flat.length; i += 2) o.push([flat[i], flat[i + 1]]); return o; }
function isMark(ch, idx, s, n) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  s.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
  if (Math.hypot(x1 - x0, y1 - y0) <= 3.2) return true;     // dots
  return ch === 't' && idx === n - 1;                          // t crossbar
}
function trimLeadIn(s) {
  let k = 0; s.forEach((p, i) => { if (p[1] < s[k][1]) k = i; });
  return k > 0 && k < s.length * 0.5 ? s.slice(k) : s;
}

function wordStrokes(word, firstInPhrase) {
  let x = 0; const chain = [], marks = [];
  for (const ch of word) {
    const g = GLYPHS[ch]; if (!g) continue;
    const [L, R, S] = g, ox = x - L;
    S.map(pairs).forEach((s, i) => {
      if (firstInPhrase && x === 0 && i === 0 && 'YWS'.includes(ch)) s = trimLeadIn(s);
      const pts = s.map(([px, py]) => [px + ox, py]);
      (isMark(ch, i, s, S.length) ? marks : chain).push(pts);
    });
    x += R - L;
  }
  const pieces = [];
  chain.forEach((p) => {
    const last = pieces[pieces.length - 1];
    if (last && Math.hypot(last[last.length - 1][0] - p[0][0], last[last.length - 1][1] - p[0][1]) <= 3.6) last.push(...p);
    else pieces.push(p.slice());
  });
  return { pieces, marks, adv: x };
}

/* smoothing, after build_line.py: split at sharp reversals, resample, average, keep the ends */
function splitAtCusps(pts, deg = 115) {
  const out = []; let start = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const ax = pts[i][0] - pts[i - 1][0], ay = pts[i][1] - pts[i - 1][1], bx = pts[i + 1][0] - pts[i][0], by = pts[i + 1][1] - pts[i][1];
    const na = Math.hypot(ax, ay), nb = Math.hypot(bx, by);
    if (na < 1e-9 || nb < 1e-9) continue;
    const c = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (na * nb)));
    if (Math.acos(c) * 180 / Math.PI > deg) { out.push(pts.slice(start, i + 1)); start = i; }
  }
  out.push(pts.slice(start));
  return out.filter((o) => o.length >= 2);
}
function resample(pts, step) {
  const p = [pts[0]];
  for (let i = 1; i < pts.length; i++) if (Math.hypot(pts[i][0] - p[p.length - 1][0], pts[i][1] - p[p.length - 1][1]) > 1e-9) p.push(pts[i]);
  if (p.length < 2) return p;
  const cum = [0]; for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  const L = cum[cum.length - 1], n = Math.max(2, Math.floor(L / step) + 1), out = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const t = L * k / (n - 1);
    while (j < cum.length - 2 && cum[j + 1] < t) j++;
    const f = (t - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
    out.push([p[j][0] + (p[j + 1][0] - p[j][0]) * f, p[j][1] + (p[j + 1][1] - p[j][1]) * f]);
  }
  return out;
}
function smooth(pts, passes) {
  let p = pts;
  if (p.length < 4) return p;
  for (let k = 0; k < passes; k++) {
    const q = p.map((v) => v.slice());
    for (let i = 1; i < p.length - 1; i++) { q[i][0] = 0.25 * p[i - 1][0] + 0.5 * p[i][0] + 0.25 * p[i + 1][0]; q[i][1] = 0.25 * p[i - 1][1] + 0.5 * p[i][1] + 0.25 * p[i + 1][1]; }
    p = q;
  }
  return p;
}
function smoothPolyline(pts) {
  const out = [];
  splitAtCusps(pts).forEach((part) => {
    const r = resample(part, 0.4);
    const s = smooth(r, 6);
    s[0] = part[0].slice(); s[s.length - 1] = part[part.length - 1].slice();
    if (out.length) s.shift();
    out.push(...s);
  });
  return out;
}
function plen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }

function measureLine(words) {
  let x = 0; const built = [];
  words.forEach((w, i) => { const ws = wordStrokes(w, i === 0); built.push({ ws, x }); x += ws.adv + SPACE; });
  return { built, width: Math.max(1, x - SPACE) };
}

/* Splits the words into one or two lines, whichever writes larger in the box. */
export function layoutName(rawText, { width, height, cx, cy, maxLineHeight }) {
  const text = cleanName(rawText);
  const words = text.split(' ').filter(Boolean);
  if (!words.length) return { text: '', strokes: [], scale: 1 };
  const H = TOP - BOTTOM < 0 ? BOTTOM - TOP : 33;
  const options = [[words]];
  if (words.length > 1) {
    let best = null;
    for (let k = 1; k < words.length; k++) {
      const a = measureLine(words.slice(0, k)).width, b = measureLine(words.slice(k)).width, m = Math.max(a, b);
      if (!best || m < best.m) best = { m, k };
    }
    options.push([words.slice(0, best.k), words.slice(best.k)]);
  }
  let pick = null;
  options.forEach((lines) => {
    const ms = lines.map(measureLine), wMax = Math.max(...ms.map((m) => m.width));
    const lineGap = 1.12;
    const s = Math.min(width / wMax, height / (H * (1 + (lines.length - 1) * lineGap)), maxLineHeight / H);
    if (!pick || s > pick.s * 1.18) pick = { lines, ms, s, lineGap };
  });
  const { ms, s, lineGap } = pick;
  const total = H * s * (1 + (ms.length - 1) * lineGap);
  const strokes = [];
  ms.forEach((m, li) => {
    const top = cy - total / 2 + li * H * s * lineGap;          // top of this line's box
    const baseY = top - TOP * s;                                  // y = 0 in font units
    const x0 = cx - m.width * s / 2;
    m.built.forEach(({ ws, x }) => {
      const map = (p) => [x0 + (x + p[0]) * s, baseY + p[1] * s];
      ws.pieces.forEach((pc) => {
        const pts = smoothPolyline(pc, s).map(map);
        strokes.push({ pts, len: plen(pts), mark: false });
      });
      ws.marks.forEach((mk) => {
        let pts;
        let x0m = Infinity, x1m = -Infinity, y0m = Infinity, y1m = -Infinity;
        mk.forEach(([x, y]) => { x0m = Math.min(x0m, x); x1m = Math.max(x1m, x); y0m = Math.min(y0m, y); y1m = Math.max(y1m, y); });
        if (Math.hypot(x1m - x0m, y1m - y0m) <= 3.2) {
          const c = [(x0m + x1m) / 2, (y0m + y1m) / 2];
          pts = [[c[0] - 0.35, c[1]], [c[0] + 0.35, c[1]]].map(map);
        } else pts = smoothPolyline(mk, s).map(map);
        strokes.push({ pts, len: Math.max(1, plen(pts)), mark: true });
      });
    });
  });
  return { text, strokes, scale: s };
}
