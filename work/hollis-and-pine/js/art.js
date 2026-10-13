/*
 * Hollis & Pine: product pictures, drawn in SVG in the shop's own style.
 * Ceramics are drawn from the same profile the 3D lathe uses (a side view with a rim
 * ellipse, soft cylinder shading, a hand-dipped glaze line over the bare clay foot,
 * speckles or a gloss highlight by glaze). Clothes are flat-lays in natural fibres with
 * a woven or knitted texture, seams and soft folds. No photos, no grey boxes.
 *
 *   productArt(product, colour, { title }) -> '<svg …>' (viewBox 0 0 400 500)
 *   tileTone(colour) -> CSS colour for the surface behind the picture
 */
import { COLOURS } from './data.js';

let uid = 0;
const W = 400, H = 500;

/* ---------- small helpers */
function rng(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hexToRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  const m = (c) => Math.max(0, Math.min(255, Math.round(f >= 1 ? c + (255 - c) * (f - 1) : c * f)));
  return '#' + [m(r), m(g), m(b)].map((c) => c.toString(16).padStart(2, '0')).join('');
}
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return '#' + A.map((c, i) => Math.round(c + (B[i] - c) * t).toString(16).padStart(2, '0')).join('');
}
const f1 = (n) => Math.round(n * 10) / 10;

/* Catmull-Rom through points -> smooth cubic Bézier path segments (no leading M). */
function smoothThrough(pts) {
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d;
}
/* Sample the profile's radius at a height (linear between control points: good enough for highlights). */
function radiusAt(profile, y) {
  for (let i = 0; i < profile.length - 1; i++) {
    const [r0, y0] = profile[i], [r1, y1] = profile[i + 1];
    if (y >= y0 && y <= y1) return r0 + (r1 - r0) * ((y - y0) / Math.max(1e-6, y1 - y0));
  }
  return profile[profile.length - 1][0];
}

const CLAY = '#B48D6C';      // bare stoneware at the foot
const SHADOW = '#2C2B25';

export function tileTone(colour) {
  return { chalk: 'var(--mist)', oat: 'var(--mist)', sage: 'var(--clay-mist)', clay: 'var(--mist)', charcoal: 'var(--clay-mist)' }[colour] || 'var(--mist)';
}

/* ---------- ceramics */
function ceramic(p, colour, id) {
  const c = COLOURS[colour] || COLOURS.chalk;
  const glaze = c.glaze;
  const prof = p.profile;
  const Hc = prof[prof.length - 1][1];
  const rMax = Math.max(...prof.map((q) => q[0]));
  const hasHandle = p.kind === 'mug' || p.kind === 'jug';
  const s = Math.min(330 / Hc, (hasHandle ? 250 : 300) / (2 * rMax), 21);
  const cx = hasHandle ? 188 : 200, base = 418;
  const X = (r) => r * s, Y = (y) => base - y * s;
  const tilt = p.kind === 'bowl' ? 0.34 : 0.17;     // how far we look down into it
  const rimR = prof[prof.length - 1][0], footR = prof[0][0];
  const top = Y(Hc), rimRy = X(rimR) * tilt, footRy = X(footR) * tilt;
  const rand = rng(p.id + colour);
  const g = c.hex;

  // outline: left side down, foot arc, right side up, rim front arc back to the start
  const left = prof.slice().reverse().map(([r, y]) => [cx - X(r), Y(y)]);
  const right = prof.map(([r, y]) => [cx + X(r), Y(y)]);
  const body = `M${f1(left[0][0])} ${f1(left[0][1])}` + smoothThrough(left)
    + ` A${f1(X(footR))} ${f1(footRy)} 0 0 0 ${f1(right[0][0])} ${f1(right[0][1])}` + smoothThrough(right)
    + ` A${f1(X(rimR))} ${f1(rimRy)} 0 0 1 ${f1(left[0][0])} ${f1(left[0][1])} Z`;

  const bx = cx - X(rMax), bw = 2 * X(rMax);
  const lo = glaze === 'matte' ? 0.86 : 0.74;
  const hi = glaze === 'gloss' ? 1.1 : glaze === 'matte' ? 1.04 : 1.07;
  const out = [];
  out.push(`<defs>
    <linearGradient id="${id}s" gradientUnits="userSpaceOnUse" x1="${f1(bx)}" y1="0" x2="${f1(bx + bw)}" y2="0">
      <stop offset="0" stop-color="${shade(g, lo)}"/><stop offset=".2" stop-color="${shade(g, 0.97)}"/>
      <stop offset=".38" stop-color="${shade(g, hi)}"/><stop offset=".62" stop-color="${shade(g, 1)}"/>
      <stop offset=".86" stop-color="${shade(g, (lo + 1) / 2)}"/><stop offset="1" stop-color="${shade(g, lo - 0.04)}"/>
    </linearGradient>
    <linearGradient id="${id}c" gradientUnits="userSpaceOnUse" x1="${f1(bx)}" y1="0" x2="${f1(bx + bw)}" y2="0">
      <stop offset="0" stop-color="${shade(CLAY, 0.78)}"/><stop offset=".38" stop-color="${shade(CLAY, 1.06)}"/><stop offset="1" stop-color="${shade(CLAY, 0.72)}"/>
    </linearGradient>
    <linearGradient id="${id}i" x1="0" y1="0" x2="0" y2="1">
      ${p.kind === 'bowl'
        ? `<stop offset="0" stop-color="${shade(g, 1.02)}"/><stop offset=".55" stop-color="${shade(g, 0.9)}"/><stop offset="1" stop-color="${shade(g, 0.68)}"/>`
        : `<stop offset="0" stop-color="${shade(g, 0.42)}"/><stop offset="1" stop-color="${shade(g, 0.62)}"/>`}
    </linearGradient>
    <radialGradient id="${id}h" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="${SHADOW}" stop-opacity=".26"/><stop offset=".55" stop-color="${SHADOW}" stop-opacity=".1"/><stop offset="1" stop-color="${SHADOW}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="${id}k"><path d="${body}"/></clipPath>
  </defs>`);

  // soft contact shadow, a little to the right (the light comes from the upper left)
  out.push(`<ellipse cx="${f1(cx + X(footR) * 0.35)}" cy="${f1(base + 3)}" rx="${f1(X(Math.max(footR * 1.9, rMax * 1.05)))}" ry="${f1(Math.max(10, footRy * 1.6))}" fill="url(#${id}h)"/>`);

  // handle (behind the body; its ends tuck under the body's edge)
  if (hasHandle) {
    const y1 = Hc * (p.kind === 'jug' ? 0.82 : 0.8), y2 = Hc * (p.kind === 'jug' ? 0.3 : 0.22);
    const xa = cx + X(radiusAt(prof, y1)) - 6, xb = cx + X(radiusAt(prof, y2)) - 6;
    const reach = X(Hc * (p.kind === 'jug' ? 0.26 : 0.36));
    const d = `M${f1(xa)} ${f1(Y(y1))} C${f1(xa + reach)} ${f1(Y(y1) - 8)} ${f1(xb + reach * 0.95)} ${f1(Y(y2) + 6)} ${f1(xb)} ${f1(Y(y2))}`;
    out.push(`<path d="${d}" fill="none" stroke="${shade(g, 0.8)}" stroke-width="${f1(X(0.95))}" stroke-linecap="round"/>`);
    out.push(`<path d="${d}" fill="none" stroke="${shade(g, glaze === 'gloss' ? 1.25 : 1.06)}" stroke-width="${f1(X(0.22))}" stroke-linecap="round" opacity=".55" transform="translate(-1.5 -2)"/>`);
  }

  // inside of the rim, then the body over its front half
  out.push(`<ellipse cx="${cx}" cy="${f1(top)}" rx="${f1(X(rimR))}" ry="${f1(rimRy)}" fill="url(#${id}i)"/>`);
  out.push(`<path d="${body}" fill="url(#${id}s)"/>`);

  // the bare foot under a hand-dipped glaze line, with a few drips
  const dipY = Y(Hc * (p.kind === 'vase' ? 0.12 : 0.1) + 0.4);
  let edge = `M${f1(bx - 4)} ${f1(dipY)}`;
  const steps = 26;
  for (let i = 1; i <= steps; i++) {
    const x = bx - 4 + ((bw + 8) * i) / steps;
    const drip = rand() < 0.13 ? 5 + rand() * 9 : 0;
    edge += ` Q${f1(x - (bw + 8) / steps / 2)} ${f1(dipY + (rand() - 0.5) * 5 + drip)} ${f1(x)} ${f1(dipY + (rand() - 0.5) * 3)}`;
  }
  edge += ` L${f1(bx + bw + 4)} ${base + 40} L${f1(bx - 4)} ${base + 40} Z`;
  out.push(`<g clip-path="url(#${id}k)">`);
  out.push(`<path d="${edge}" fill="url(#${id}c)"/>`);
  out.push(`<path d="${edge}" fill="none" stroke="${shade(g, 0.8)}" stroke-width="1.6" opacity=".55"/>`);

  // throwing rings: faint lines across the body
  for (let y = Hc * 0.18; y < Hc * 0.94; y += Hc / 9) {
    const rr = X(radiusAt(prof, y)), yy = Y(y);
    out.push(`<path d="M${f1(cx - rr)} ${f1(yy)} A${f1(rr)} ${f1(rr * tilt * 0.6)} 0 0 0 ${f1(cx + rr)} ${f1(yy)}" fill="none" stroke="${shade(g, 0.86)}" stroke-width="1" opacity="${glaze === 'gloss' ? 0.22 : 0.32}"/>`);
  }

  if (glaze === 'speckled') {
    for (let i = 0; i < 170; i++) {
      const yv = Hc * (0.13 + rand() * 0.86), rr = radiusAt(prof, yv);
      const xv = (rand() * 2 - 1) * rr * 0.97;
      const rad = 0.7 + rand() * rand() * 2.2;
      out.push(`<circle cx="${f1(cx + X(xv))}" cy="${f1(Y(yv))}" r="${f1(rad)}" fill="#5A4433" opacity="${f1(0.45 + rand() * 0.45)}"/>`);
    }
  }
  // highlights: a long streak for gloss, a soft band for satin, nothing for matte
  if (glaze === 'gloss' || glaze === 'satin') {
    const ys = []; for (let i = 0; i <= 12; i++) ys.push(Hc * (0.16 + (0.78 * i) / 12));
    const line = ys.map((y) => [cx - X(radiusAt(prof, y)) * 0.48, Y(y)]);
    const d = `M${f1(line[0][0])} ${f1(line[0][1])}` + smoothThrough(line);
    if (glaze === 'gloss') {
      out.push(`<path d="${d}" fill="none" stroke="#fff" stroke-width="${f1(X(0.9))}" stroke-linecap="round" opacity=".14"/>`);
      out.push(`<path d="${d}" fill="none" stroke="#fff" stroke-width="${f1(X(0.22))}" stroke-linecap="round" opacity=".6"/>`);
    } else {
      out.push(`<path d="${d}" fill="none" stroke="#fff" stroke-width="${f1(X(1.3))}" stroke-linecap="round" opacity=".12"/>`);
    }
  }
  out.push('</g>');
  // glaze breaking thin on the rim
  out.push(`<path d="M${f1(cx - X(rimR))} ${f1(top)} A${f1(X(rimR))} ${f1(rimRy)} 0 0 0 ${f1(cx + X(rimR))} ${f1(top)}" fill="none" stroke="${mix(g, CLAY, 0.45)}" stroke-width="2.2" opacity=".7"/>`);
  // a jug's pulled lip
  if (p.kind === 'jug') {
    const lx = cx - X(rimR);
    out.push(`<path d="M${f1(lx + 10)} ${f1(top - 2)} Q${f1(lx - 6)} ${f1(top - 6)} ${f1(lx - X(1.1))} ${f1(top - X(0.7))} Q${f1(lx - 2)} ${f1(top + 6)} ${f1(lx + 10)} ${f1(top + rimRy * 0.7)} Z" fill="${shade(g, 1.02)}"/>`);
  }
  return out.join('');
}

/* ---------- clothes: flat-lays */
const GARMENTS = {
  shirt: {
    body: 'M166 88 C181 102 219 102 234 88 L292 106 L344 284 L305 299 L287 206 L290 420 Q200 436 110 420 L113 206 L95 299 L56 284 L108 106 Z',
    folds: ['M113 206 L150 240 L118 290 Z', 'M287 206 L252 246 L284 300 Z'],
    seams: ['M108 106 L113 206', 'M292 106 L287 206', 'M66 270 L101 258', 'M334 270 L299 258'],
    extra: (g, id) => `
      <path d="M166 88 L200 104 L184 140 Z" fill="${shade(g, 1.06)}"/><path d="M234 88 L200 104 L216 140 Z" fill="${shade(g, 1.06)}"/>
      <path d="M166 88 L200 104 L184 140 Z M234 88 L200 104 L216 140 Z" fill="none" stroke="${shade(g, 0.78)}" stroke-width="1.2"/>
      <path d="M193 106 L193 428 M207 106 L207 428" stroke="${shade(g, 0.8)}" stroke-width="1.2" fill="none"/>
      ${[150, 200, 250, 300, 350, 400].map((y) => `<circle cx="200" cy="${y}" r="4.2" fill="#6E5A46"/><circle cx="199" cy="${y - 1}" r="1.4" fill="#A08A72"/>`).join('')}
      <path d="M222 170 L266 170 L266 214 Q244 226 222 214 Z" fill="none" stroke="${shade(g, 0.78)}" stroke-width="1.2" stroke-dasharray="3 3"/>`,
    texture: 'linen',
  },
  trousers: {
    body: 'M122 70 L278 70 L278 98 L302 440 L210 440 L200 176 L190 440 L98 440 L122 98 Z',
    folds: ['M150 98 L140 300 L156 300 Z', 'M250 98 L260 300 L244 300 Z', 'M200 176 L210 440 L196 440 Z'],
    seams: ['M122 98 L278 98', 'M98 424 L190 424', 'M210 424 L302 424', 'M128 102 Q142 128 140 168', 'M272 102 Q258 128 260 168'],
    extra: (g) => `<path d="M200 98 L200 170" stroke="${shade(g, 0.75)}" stroke-width="1.2" fill="none"/><path d="M212 100 Q214 150 200 172" stroke="${shade(g, 0.78)}" stroke-width="1.2" stroke-dasharray="3 3" fill="none"/>
      <circle cx="200" cy="84" r="4.4" fill="#6E5A46"/>
      ${[148, 186, 214, 252].map((x) => `<rect x="${x}" y="66" width="7" height="34" rx="2" fill="${shade(g, 0.88)}"/>`).join('')}`,
    texture: 'linen',
  },
  dress: {
    body: 'M162 66 C180 82 220 82 238 66 L278 80 L332 168 L302 186 L284 150 L338 452 Q200 472 62 452 L116 150 L98 186 L68 168 L122 80 Z',
    folds: ['M150 170 L118 450 L134 452 Z', 'M200 172 L196 462 L208 462 Z', 'M250 170 L282 452 L266 454 Z'],
    seams: ['M116 150 Q200 166 284 150', 'M88 178 L112 164', 'M312 178 L288 164', 'M118 300 L126 340', 'M282 300 L274 340'],
    extra: (g) => Array.from({ length: 15 }, (_, i) => { const x = 128 + i * 10.3; return `<path d="M${x} 160 q2 10 0 22" stroke="${shade(g, 0.8)}" stroke-width="1.1" fill="none"/>`; }).join(''),
    texture: 'linen',
  },
  apron: {
    body: 'M150 92 L250 92 L254 198 Q298 204 314 214 L322 452 L78 452 L86 214 Q102 204 146 198 Z',
    folds: ['M140 230 L120 450 L134 452 Z', 'M262 230 L282 452 L268 452 Z'],
    seams: ['M130 286 L270 286 L270 352 L130 352 Z', 'M200 286 L200 352', 'M150 100 L250 100', 'M80 440 L320 440'],
    extra: (g) => `<path d="M156 94 C150 40 250 40 244 94" stroke="${shade(g, 0.9)}" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M86 216 C60 240 66 300 40 340" stroke="${shade(g, 0.9)}" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M314 216 C340 240 334 300 360 340" stroke="${shade(g, 0.9)}" stroke-width="10" fill="none" stroke-linecap="round"/>`,
    texture: 'linen',
  },
  jumper: {
    body: 'M150 84 C172 106 228 106 250 84 L302 104 L354 322 L318 336 L292 212 L296 422 L104 422 L108 212 L82 336 L46 322 L98 104 Z',
    folds: ['M108 212 L140 250 L112 300 Z', 'M292 212 L260 250 L288 300 Z'],
    seams: ['M98 104 L108 212', 'M302 104 L292 212'],
    extra: (g, id) => `<path d="M104 392 L296 392 L296 422 L104 422 Z" fill="url(#${id}rib)"/>
      <path d="M50 306 L84 320 L80 336 L46 322 Z M350 306 L316 320 L320 336 L354 322 Z" fill="${shade(g, 0.9)}"/>
      <path d="M150 84 C172 106 228 106 250 84" stroke="${shade(g, 0.88)}" stroke-width="13" fill="none"/>
      ${cable(200, 116, 384, g)}${cable(152, 120, 384, g, 0.7)}${cable(248, 120, 384, g, 0.7)}`,
    texture: 'knit',
  },
  hat: {
    body: 'M124 336 L124 222 Q124 118 200 112 Q276 118 276 222 L276 336 Z',
    folds: ['M200 112 L190 300 L206 300 Z'],
    seams: ['M140 160 Q170 130 200 112', 'M260 160 Q230 130 200 112'],
    extra: (g, id) => `<path d="M114 300 L286 300 L290 384 L110 384 Z" fill="${shade(g, 0.92)}"/><path d="M114 300 L286 300 L290 384 L110 384 Z" fill="url(#${id}rib)"/>`,
    texture: 'knit',
  },
  scarf: {
    body: 'M120 70 Q170 54 220 70 L226 420 L134 432 Z M196 104 L282 92 L290 452 L204 460 Z',
    folds: ['M196 104 L204 460 L214 459 L206 103 Z'],
    seams: [],
    extra: (g) => `<path d="M120 70 Q170 54 220 70 Q250 76 282 92 L196 104 Q160 92 120 70 Z" fill="${shade(g, 0.88)}"/>
      ${fringe(134, 226, 428, g)}${fringe(204, 290, 456, g)}`,
    texture: 'knit',
  },
};
function cable(x, y0, y1, g, k = 1) {
  let d = '', e = '';
  for (let y = y0; y < y1 - 10; y += 32) {
    d += `M${x - 9 * k} ${y} C${x - 9 * k} ${y + 14} ${x + 9 * k} ${y + 18} ${x + 9 * k} ${y + 32} `;
    e += `M${x + 9 * k} ${y} C${x + 9 * k} ${y + 12} ${x + 3 * k} ${y + 14} ${x + 1 * k} ${y + 15} M${x - 1 * k} ${y + 18} C${x - 4 * k} ${y + 20} ${x - 9 * k} ${y + 22} ${x - 9 * k} ${y + 32} `;
  }
  return `<path d="${d}" stroke="${shade(g, 0.78)}" stroke-width="${f1(5 * k)}" fill="none" stroke-linecap="round"/>
    <path d="${d}" stroke="${shade(g, 1.14)}" stroke-width="${f1(1.6 * k)}" fill="none" stroke-linecap="round" transform="translate(-1 -1)"/>
    <path d="${e}" stroke="${shade(g, 0.78)}" stroke-width="${f1(5 * k)}" fill="none" stroke-linecap="round"/>`;
}
function fringe(x0, x1, y, g) {
  let d = '';
  for (let x = x0 + 4; x < x1 - 2; x += 7) d += `M${x} ${y - 2} q2 14 0 26 `;
  return `<path d="${d}" stroke="${shade(g, 0.86)}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
}

function garment(p, colour, id) {
  const c = COLOURS[colour] || COLOURS.oat;
  const g = c.hex;
  const spec = GARMENTS[p.kind];
  const dark = colour === 'charcoal';
  const line = dark ? '#FFFFFF' : SHADOW;
  const pat = spec.texture === 'linen'
    ? `<pattern id="${id}t" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 2.5 H5" stroke="${line}" stroke-width=".7" opacity="${dark ? 0.07 : 0.06}"/><path d="M2.5 0 V5" stroke="${line}" stroke-width=".5" opacity="${dark ? 0.05 : 0.04}"/></pattern>`
    : `<pattern id="${id}t" width="7" height="8" patternUnits="userSpaceOnUse"><path d="M1 0 Q3.5 4 1 8 M4.5 0 Q2 4 4.5 8" stroke="${line}" stroke-width=".8" fill="none" opacity="${dark ? 0.08 : 0.07}"/></pattern>`;
  const rib = `<pattern id="${id}rib" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${shade(g, 0.94)}"/><path d="M2 0 V8" stroke="${shade(g, 0.76)}" stroke-width="2.4"/><path d="M5.5 0 V8" stroke="${shade(g, 1.08)}" stroke-width="1.2"/></pattern>`;
  // linen slubs: a few short, slightly darker threads
  const rand = rng(p.id + colour);
  let slubs = '';
  if (spec.texture === 'linen') {
    for (let i = 0; i < 46; i++) {
      const x = 70 + rand() * 260, y = 70 + rand() * 380, l = 6 + rand() * 18;
      slubs += `M${f1(x)} ${f1(y)} h${f1(l)} `;
    }
  }
  return `<defs>${pat}${rib}<clipPath id="${id}k"><path d="${spec.body}"/></clipPath></defs>
    <path d="${spec.body}" fill="${SHADOW}" opacity=".08" transform="translate(7 10)"/>
    <path d="${spec.body}" fill="${g}"/>
    <g clip-path="url(#${id}k)">
      <rect width="${W}" height="${H}" fill="url(#${id}t)"/>
      ${slubs ? `<path d="${slubs}" stroke="${shade(g, dark ? 1.3 : 0.84)}" stroke-width="1" opacity=".45"/>` : ''}
      ${spec.folds.map((d) => `<path d="${d}" fill="${SHADOW}" opacity="${dark ? 0.16 : 0.07}"/>`).join('')}
      <path d="M0 0 H${W} V160 Q200 120 0 180 Z" fill="#fff" opacity="${dark ? 0.05 : 0.08}"/>
    </g>
    ${spec.seams.map((d) => `<path d="${d}" fill="none" stroke="${shade(g, dark ? 1.5 : 0.78)}" stroke-width="1.2" stroke-dasharray="3 3"/>`).join('')}
    ${spec.extra(g, id)}`;
}

export function productArt(product, colour, { title, className = '' } = {}) {
  const id = 'hp' + (++uid) + '-';
  const inner = product.category === 'ceramics' ? ceramic(product, colour, id) : garment(product, colour, id);
  const label = title ? `role="img" aria-label="${title.replace(/"/g, '&quot;')}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="art ${className}" viewBox="0 0 ${W} ${H}" ${label} xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}
