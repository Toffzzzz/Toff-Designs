// Converts the single-stroke SVG fonts in tools/svg-fonts/ (Hershey and EMS,
// from Evil Mad Scientist's Hershey Text / Inkscape) into small JS data files
// in paths/fonts/, one per font, that the site loads at runtime.
//
//   node tools/build-fonts.mjs
//
// For every printable ASCII glyph it stores the advance width and the pen
// strokes in drawing order, with y flipped to screen coordinates (y down,
// baseline at 0, 1000 units per em). Each stroke is one pen-down movement:
// these are centre lines, never letter outlines, so nothing is traced twice.
//
// Stroke clean-up, so every stroke goes the way a hand would draw it:
// - straight, mostly horizontal strokes run left to right
// - straight, mostly vertical strokes run top to bottom
// - curves keep the font designer's direction
// Strokes are tagged so the site can draw them just after the word:
// - "dot":   the dot on i and j
// - "cross": the separate cross stroke on t
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, 'svg-fonts');
const outDir = join(here, '..', 'paths', 'fonts');
mkdirSync(outDir, { recursive: true });

const round = (n) => Math.round(n * 10) / 10;

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

// Absolute M / L / C / Q / H / V / Z only (that is all these fonts use).
function parsePath(d) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
  const subpaths = [];
  let cur = null;
  let cmd = null;
  let i = 0;
  let x = 0, y = 0, sx = 0, sy = 0;
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) cmd = tokens[i++];
    if (/[a-z]/.test(cmd)) throw new Error(`relative command ${cmd} not supported`);
    if (cmd === 'M') {
      x = num(); y = -num(); sx = x; sy = y;
      cur = { start: [x, y], segs: [] };
      subpaths.push(cur);
      cmd = 'L';
    } else if (cmd === 'L') {
      x = num(); y = -num();
      cur.segs.push(['L', x, y]);
    } else if (cmd === 'H') {
      x = num(); cur.segs.push(['L', x, y]);
    } else if (cmd === 'V') {
      y = -num(); cur.segs.push(['L', x, y]);
    } else if (cmd === 'C') {
      const a = [num(), -num(), num(), -num(), num(), -num()];
      cur.segs.push(['C', ...a]);
      x = a[4]; y = a[5];
    } else if (cmd === 'Q') {
      const a = [num(), -num(), num(), -num()];
      cur.segs.push(['Q', ...a]);
      x = a[2]; y = a[3];
    } else if (cmd === 'Z') {
      if (x !== sx || y !== sy) cur.segs.push(['L', sx, sy]);
      x = sx; y = sy;
      cmd = null;
    } else {
      throw new Error(`unknown command ${cmd}`);
    }
  }
  return subpaths;
}

// Points along a subpath (corners + sampled curves), for measuring
function points(sp) {
  const pts = [sp.start];
  let [px, py] = sp.start;
  for (const s of sp.segs) {
    if (s[0] === 'L') { pts.push([s[1], s[2]]); [px, py] = [s[1], s[2]]; continue; }
    const n = 8;
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t;
      let qx, qy;
      if (s[0] === 'C') {
        qx = u * u * u * px + 3 * u * u * t * s[1] + 3 * u * t * t * s[3] + t * t * t * s[5];
        qy = u * u * u * py + 3 * u * u * t * s[2] + 3 * u * t * t * s[4] + t * t * t * s[6];
      } else {
        qx = u * u * px + 2 * u * t * s[1] + t * t * s[3];
        qy = u * u * py + 2 * u * t * s[2] + t * t * s[4];
      }
      pts.push([qx, qy]);
    }
    const e = s.slice(-2);
    [px, py] = e;
  }
  return pts;
}

function measure(sp) {
  const pts = points(sp);
  let len = 0;
  for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const first = pts[0];
  const last = pts[pts.length - 1];
  return {
    len,
    chord: Math.hypot(last[0] - first[0], last[1] - first[1]),
    dx: last[0] - first[0],
    dy: last[1] - first[1],
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys),
  };
}

function reverse(sp) {
  // Rebuild the subpath backwards
  const nodes = [sp.start];
  for (const s of sp.segs) nodes.push(s.slice(-2));
  const segs = [];
  for (let k = sp.segs.length - 1; k >= 0; k--) {
    const s = sp.segs[k];
    const to = nodes[k];
    if (s[0] === 'L') segs.push(['L', to[0], to[1]]);
    else if (s[0] === 'C') segs.push(['C', s[3], s[4], s[1], s[2], to[0], to[1]]);
    else segs.push(['Q', s[1], s[2], to[0], to[1]]);
  }
  return { start: nodes[nodes.length - 1], segs };
}

function toD(sp) {
  let d = `M${round(sp.start[0])} ${round(sp.start[1])}`;
  for (const s of sp.segs) d += s[0] + s.slice(1).map(round).join(' ');
  return d;
}

// Hershey's "medium" and "bold" fonts fake weight by drawing a second stroke
// a few units beside the first. Drawn as pen lines that looks like a doubled
// outline, so the single-line variants drop any stroke that runs alongside
// a longer one.
function distToPolyline(p, pts) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l2));
    best = Math.min(best, Math.hypot(p[0] - ax - t * dx, p[1] - ay - t * dy));
  }
  return best;
}
function dedouble(subs, gap = 48) {
  const pts = subs.map((sp) => {
    const raw = points(sp);
    // resample densely
    const out = [];
    for (let i = 1; i < raw.length; i++) {
      const [ax, ay] = raw[i - 1], [bx, by] = raw[i];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 12));
      for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
    }
    out.push(raw[raw.length - 1]);
    return out;
  });
  const lens = subs.map((sp) => measure(sp).len);
  const keep = subs.map(() => true);
  subs.forEach((sp, b) => {
    if (lens[b] < 40) return; // dots and serifs stay
    for (let a = 0; a < subs.length; a++) {
      if (a === b || !keep[a] || lens[a] < lens[b] * 0.6) continue;
      if (lens[a] < lens[b] || (lens[a] === lens[b] && a > b)) continue;
      const near = pts[b].filter((p) => distToPolyline(p, pts[a]) <= gap).length;
      if (near >= pts[b].length * 0.8) { keep[b] = false; break; }
    }
  });
  return subs.filter((_, i) => keep[i]);
}

function processGlyph(ch, d, single = false) {
  let subs = parsePath(d).filter((sp) => sp.segs.length > 0);
  if (single) subs = dedouble(subs);
  subs = subs.map((sp) => {
    const m = measure(sp);
    const closed = m.chord < 1 && m.len > 1;
    const straight = !closed && m.len <= m.chord * 1.08 + 1;
    let flip = false;
    if (straight && Math.abs(m.dx) > Math.abs(m.dy) * 1.5) flip = m.dx < 0;
    else if (straight && Math.abs(m.dy) > Math.abs(m.dx) * 1.5) flip = m.dy < 0;
    return flip ? reverse(sp) : sp;
  });

  const info = subs.map(measure);
  const tags = subs.map(() => null);
  if (subs.length > 1 && (ch === 'i' || ch === 'j')) {
    // The dot: small, and the highest stroke in the glyph
    let best = -1;
    info.forEach((m, k) => {
      const small = m.maxX - m.minX < 170 && m.maxY - m.minY < 170;
      if (small && (best < 0 || m.minY < info[best].minY)) best = k;
    });
    if (best >= 0) tags[best] = 'dot';
  }
  if (subs.length > 1 && ch === 't') {
    // The cross: a separate, straight, mostly horizontal stroke
    info.forEach((m, k) => {
      const straight = m.len <= m.chord * 1.15 + 1;
      if (straight && Math.abs(m.dx) > Math.abs(m.dy) * 2) tags[k] = 'cross';
    });
  }
  return subs.map((sp, k) => (tags[k] ? { d: toD(sp), t: tags[k] } : { d: toD(sp) }));
}

// Single-line variants of the doubled-stroke Hershey fonts: "<id>Single"
const SINGLE = ['HersheySerifMed', 'HersheySerifMedItalic', 'HersheySansMed', 'HersheyScriptMed', 'HersheySerifBold', 'HersheySerifBoldItalic'];
const files = readdirSync(srcDir).filter((f) => f.endsWith('.svg'));
const jobs = [];
for (const file of files) {
  jobs.push({ file, id: file.replace(/\.svg$/, ''), single: false });
  if (SINGLE.includes(file.replace(/\.svg$/, ''))) jobs.push({ file, id: `${file.replace(/\.svg$/, '')}Single`, single: true });
}
const index = [];
for (const { file, id, single } of jobs) {
  const svg = readFileSync(join(srcDir, file), 'utf8');
  const fontTag = svg.match(/<font\b[^>]*>/)[0];
  const defaultAdv = +(fontTag.match(/horiz-adv-x="([^"]+)"/) || [])[1] || 500;
  const face = svg.match(/<font-face\b[^>]*>/)[0];
  const attr = (tag, name) => (tag.match(new RegExp(`${name}="([^"]+)"`)) || [])[1];
  const family = (attr(face, 'font-family') || id) + (single ? ' (single line)' : '');
  const meta = (svg.match(/<metadata>([\s\S]*?)<\/metadata>/) || [])[1] || '';
  const licence = /Open Font License/i.test(meta) ? 'SIL Open Font License 1.1' : /Hershey Fonts/i.test(meta) ? 'Hershey Fonts licence (free for any use, with acknowledgement)' : 'unknown';

  const glyphs = {};
  for (const m of svg.matchAll(/<glyph\b([^>]*)\/?>/g)) {
    const a = m[1];
    const uni = (a.match(/unicode="([^"]*)"/) || [])[1];
    if (uni === undefined) continue;
    const ch = decodeEntities(uni);
    if ([...ch].length !== 1) continue;
    const code = ch.codePointAt(0);
    if (code < 32 || code > 126) continue;
    const adv = +(a.match(/horiz-adv-x="([^"]+)"/) || [])[1] || defaultAdv;
    const d = (a.match(/\sd="([^"]*)"/) || [])[1];
    glyphs[ch] = { a: round(adv), s: d ? processGlyph(ch, d, single) : [] };
  }

  const data = {
    id,
    family,
    licence,
    unitsPerEm: +attr(face, 'units-per-em') || 1000,
    capHeight: +attr(face, 'cap-height') || 500,
    xHeight: +attr(face, 'x-height') || 300,
    glyphs,
  };
  const js = `// Generated by tools/build-fonts.mjs from tools/svg-fonts/${file}${single ? ' (doubled strokes removed)' : ''}. Do not edit by hand.\n` +
    `// ${family}: ${licence}. See CREDITS.md.\n` +
    `(window.TOFF_FONTS = window.TOFF_FONTS || {})[${JSON.stringify(id)}] = ${JSON.stringify(data)};\n`;
  writeFileSync(join(outDir, `${id}.js`), js);
  index.push({ id, family, licence });
}

const idx = `// Generated by tools/build-fonts.mjs. The single-line fonts available in paths/fonts/.\n` +
  `window.TOFF_FONT_LIST = ${JSON.stringify(index, null, 2)};\n`;
writeFileSync(join(outDir, 'index.js'), idx);
console.log(`Wrote ${index.length} fonts to paths/fonts/`);
