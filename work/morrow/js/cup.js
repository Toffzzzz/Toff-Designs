/*
 * Morrow Coffee: the cup in cross-section (the signature).
 *
 * A 2D canvas drawing in the site's own line style (roast, 1.75px, round caps, a slight
 * wobble), with a small spring solver of its own, no library:
 *  - every layer's height (syrup, espresso, milk, foam…) is a damped spring towards its
 *    target, so a new layer pours in, overshoots a little and settles;
 *  - the top of the drink is a 1D wave field (a row of coupled springs) that sloshes when
 *    the drink changes, when liquid pours in, and when the pointer or a finger touches it;
 *    the boundaries below follow it, more gently the deeper they are;
 *  - the cup itself (its width, height, bowl, handle and saucer) springs between shapes.
 * It sleeps when everything is still, and runs only while the canvas is on screen.
 * Reduced motion: no simulation; every change is drawn finished, at once.
 */

const TAU = Math.PI * 2;

// Cup shapes, in units of the scale S. top/bot: outer widths; h: height; round: how
// rounded the bowl is (0..1 of half the base); wall: wall thickness; handle/saucer: 0 or 1.
const SHAPES = {
  demitasse: { top: 0.40, bot: 0.27, h: 0.34, round: 0.55, wall: 0.034, handle: 1, saucer: 1, glass: 0 },
  small:     { top: 0.54, bot: 0.35, h: 0.43, round: 0.55, wall: 0.034, handle: 1, saucer: 1, glass: 0 },
  cup:       { top: 0.62, bot: 0.40, h: 0.49, round: 0.55, wall: 0.034, handle: 1, saucer: 1, glass: 0 },
  cupL:      { top: 0.68, bot: 0.43, h: 0.56, round: 0.55, wall: 0.034, handle: 1, saucer: 1, glass: 0 },
  glass:     { top: 0.48, bot: 0.40, h: 0.66, round: 0.10, wall: 0.016, handle: 0, saucer: 0, glass: 1 },
  glassL:    { top: 0.54, bot: 0.44, h: 0.80, round: 0.10, wall: 0.016, handle: 0, saucer: 0, glass: 1 },
  mug:       { top: 0.52, bot: 0.50, h: 0.56, round: 0.16, wall: 0.040, handle: 1, saucer: 0, glass: 0 },
  mugL:      { top: 0.60, bot: 0.57, h: 0.68, round: 0.16, wall: 0.040, handle: 1, saucer: 0, glass: 0 },
};
const SHAPE_KEYS = Object.keys(SHAPES.cup);

export const COLORS = {
  roast: '#2B1D14', grounds: '#6B5546', foamWhite: '#FFF9F1', inside: '#F2E7D8', page: '#EBDDC9',
  espresso: '#3B2318', crema: '#B4733C', coffee: '#563019', coffeeMilk: '#8C5D3D', chocolate: '#5A2F20',
  whole: '#F5EAD7', oat: '#EAD5B1', almond: '#EFDDC3', soy: '#F2E5C9',
  foam: '#FFFBF5', foamChoc: '#F2E1CC',
  vanilla: '#E5C077', caramel: '#C47F32', cardamom: '#C6B36A',
};

const LAYER_ORDER = ['syrup', 'espresso', 'coffee', 'chocolate', 'milk', 'crema', 'foam'];
const MILK_WORD = { whole: 'Whole milk', oat: 'Oat milk', almond: 'Almond milk', soy: 'Soy milk' };

/** What's in the cup, bottom to top: [{ key, frac, color, label }]. */
export function composition({ item, size, milk, extra_shots: shots, syrup }) {
  const L = [];
  const syr = syrup && syrup !== 'none' ? 0.07 : 0;
  if (syr) L.push({ key: 'syrup', frac: syr, color: COLORS[syrup], label: `${syrup[0].toUpperCase()}${syrup.slice(1)} syrup` });
  const espLabel = shots ? `Espresso, +${shots} shot${shots > 1 ? 's' : ''}` : 'Espresso';
  const milky = (esp, foam, foamLabel) => {
    L.push({ key: 'espresso', frac: esp, color: COLORS.espresso, label: espLabel });
    L.push({ key: 'milk', frac: 0.9 - syr - esp - foam, color: COLORS[milk] || COLORS.whole, label: MILK_WORD[milk] || 'Milk' });
    L.push({ key: 'foam', frac: foam, color: COLORS.foam, label: foamLabel });
  };
  switch (item) {
    case 'espresso':
      L.push({ key: 'espresso', frac: 0.30 + 0.19 * shots, color: COLORS.espresso, label: espLabel });
      L.push({ key: 'crema', frac: 0.07, color: COLORS.crema, label: 'Crema' });
      break;
    case 'flat_white': milky(0.24 + 0.09 * shots, 0.07, 'Microfoam'); break;
    case 'cappuccino': milky(0.19 + 0.07 * shots, 0.30, 'Foam'); break;
    case 'latte': milky(0.15 + 0.06 * shots, 0.09, 'Foam'); break;
    case 'filter_coffee':
      L.push({ key: 'coffee', frac: 0.8 - syr, color: milk && milk !== 'none' ? COLORS.coffeeMilk : COLORS.coffee,
        label: milk && milk !== 'none' ? `Coffee, ${(MILK_WORD[milk] || 'milk').toLowerCase()}` : 'Filter coffee' });
      break;
    case 'hot_chocolate':
      L.push({ key: 'chocolate', frac: 0.72 - syr, color: COLORS.chocolate, label: `Chocolate, ${(MILK_WORD[milk] || 'milk').toLowerCase()}` });
      L.push({ key: 'foam', frac: 0.12, color: COLORS.foamChoc, label: 'Milk foam' });
      break;
    default: break;
  }
  return L;
}

export function shapeFor({ item, size }) {
  const big = size === 'large';
  switch (item) {
    case 'espresso': return 'demitasse';
    case 'flat_white': return 'small';
    case 'cappuccino': return big ? 'cupL' : 'cup';
    case 'latte': return big ? 'glassL' : 'glass';
    default: return big ? 'mugL' : 'mug';   // filter coffee, hot chocolate
  }
}

/* ── A damped spring (semi-implicit Euler) ───────────────────────────────── */
function spring(value, hz, zeta) { return { x: value, v: 0, target: value, w: TAU * hz, z: zeta }; }
function stepSpring(s, dt) {
  const a = s.w * s.w * (s.target - s.x) - 2 * s.z * s.w * s.v;
  s.v += a * dt; s.x += s.v * dt;
}
const springAwake = (s, eps) => Math.abs(s.target - s.x) > eps || Math.abs(s.v) > eps * 4;

/* ── Colour helpers ──────────────────────────────────────────────────────── */
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const rgb = (c, alpha = 1) => `rgba(${c.map((v) => Math.round(v)).join(',')},${alpha})`;

// A fixed, smooth wobble along a path (s in 0..1): the hand-drawn line, stable from frame to frame.
const wob = (s, seed) => 0.55 * Math.sin(TAU * (3 * s) + seed) + 0.35 * Math.sin(TAU * (7 * s) + seed * 2.1) + 0.2 * Math.sin(TAU * (13 * s) + seed * 0.7);

// Foam bubbles: fixed spots in the unit square.
const BUBBLES = Array.from({ length: 34 }, (_, i) => {
  const r = Math.sin(i * 12.9898) * 43758.5453;
  const q = Math.sin(i * 78.233) * 12345.6789;
  return [r - Math.floor(r), q - Math.floor(q), 0.6 + ((i * 7) % 5) * 0.28];
});

/* ── The cup ─────────────────────────────────────────────────────────────── */
export function createCup(canvas, { reduced = false, onDescribe = null } = {}) {
  const ctx = canvas.getContext('2d');
  const N = 48;                                   // wave columns across the top of the drink
  const wave = { h: new Float32Array(N), v: new Float32Array(N) };
  const shape = {};
  for (const k of SHAPE_KEYS) shape[k] = spring(SHAPES.small[k], 1.5, 0.72);
  const nudge = spring(0, 2.0, 0.32);             // the cup shifts a few px sideways when knocked
  const layers = new Map();                       // key -> { frac spring, color [r,g,b], toColor, label, order }
  let comp = [];
  let fill = 0;                                   // 0..1: the first fill, driven by motion.js
  let W = 300, H = 300, dpr = 1, S = 200, labelW = 140, gapL = 34;
  let running = false, visible = true, raf = 0, lastT = 0, acc = 0;
  let pour = null;                                // { color, until, x }
  let fontReady = false;
  let flip = 1;

  /* geometry */
  function layout() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(200, r.width); H = Math.max(200, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const small = W < 480;
    labelW = small ? 104 : 140; gapL = small ? 18 : 34;
    S = Math.max(120, Math.min((W - labelW - gapL - 10) / 0.9, (H - 36) / 0.9));
  }

  function geom() {
    const sh = {}; for (const k of SHAPE_KEYS) sh[k] = shape[k].x;
    // centre the cup (and its handle) in the room right of the labels
    const reach = 0.2 * S * Math.max(0, Math.min(1, sh.handle));
    const cx = (labelW + gapL + W - 10) / 2 - reach / 2 + nudge.x;
    const saucerSpace = 0.05 * S * Math.max(0, Math.min(1, sh.saucer));
    const baseY = H - 18 - saucerSpace - 0.02 * S;
    const topW = sh.top * S, botW = sh.bot * S, ht = sh.h * S;
    const rimY = baseY - ht;
    const t = Math.max(2.5, sh.wall * S);
    const tb = t * 1.5;
    const rad = Math.max(2, sh.round * botW * 0.5);
    const outer = profile(cx, rimY, baseY, topW, botW, rad);
    const iTop = topW - 2 * t, iBot = botW - 2 * t;
    const innerBottom = baseY - tb;
    const inner = profile(cx, rimY, innerBottom, iTop, iBot, Math.max(2, rad - t));
    const leftAt = (y) => cx - (iBot + (iTop - iBot) * (innerBottom - y) / Math.max(1, innerBottom - rimY)) / 2;
    return { sh, cx, baseY, rimY, topW, botW, t, innerBottom, inner, outer, iTop, iBot, leftAt, cap: innerBottom - rimY - 1 };
  }

  // The outline of a cup: left rim → down the wall → round the bowl → up to the right rim.
  function profile(cx, top, bottom, wTop, wBot, rad) {
    const pts = [];
    const xl0 = cx - wTop / 2, xl1 = cx - wBot / 2, xr0 = cx + wTop / 2, xr1 = cx + wBot / 2;
    const seg = (x0, y0, x1, y1, n) => { for (let i = 0; i < n; i++) { const s = i / n; pts.push([x0 + (x1 - x0) * s, y0 + (y1 - y0) * s]); } };
    const quad = (x0, y0, qx, qy, x1, y1, n) => { for (let i = 0; i < n; i++) { const s = i / n, u = 1 - s; pts.push([u * u * x0 + 2 * u * s * qx + s * s * x1, u * u * y0 + 2 * u * s * qy + s * s * y1]); } };
    const r = Math.min(rad, (bottom - top) * 0.8, wBot / 2);
    const ky = r / Math.max(1, bottom - top);   // where the wall meets the corner
    const xlc = xl1 + (xl0 - xl1) * ky, xrc = xr1 + (xr0 - xr1) * ky;
    seg(xl0, top, xlc, bottom - r, 26);
    quad(xlc, bottom - r, xl1, bottom, xl1 + r, bottom, 14);
    seg(xl1 + r, bottom, xr1 - r, bottom, 22);
    quad(xr1 - r, bottom, xr1, bottom, xrc, bottom - r, 14);
    seg(xrc, bottom - r, xr0, top, 26);
    pts.push([xr0, top]);
    return pts;
  }

  function linePath(pts, seed, amp = 0.8, close = false) {
    ctx.beginPath();
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const s = i / Math.max(1, n - 1);
      const x = pts[i][0] + wob(s, seed) * amp, y = pts[i][1] + wob(s, seed + 1.7) * amp;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    if (close) ctx.closePath();
  }
  function rawPath(pts, close = true) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    if (close) ctx.closePath();
  }

  function handlePts(g) {
    const y1 = g.rimY + (g.baseY - g.rimY) * 0.18, y2 = g.rimY + (g.baseY - g.rimY) * 0.66;
    const xAt = (y) => g.cx + (g.botW + (g.topW - g.botW) * (g.baseY - y) / Math.max(1, g.baseY - g.rimY)) / 2;
    const out = 0.2 * S, inn = 0.11 * S;
    const curve = (reach, inset) => {
      const pts = [];
      const a = [xAt(y1 + inset) - 1, y1 + inset], b = [xAt(y2 - inset) - 1, y2 - inset];
      const c1 = [a[0] + reach, a[1] - reach * 0.12], c2 = [b[0] + reach * 0.9, b[1] + reach * 0.15];
      for (let i = 0; i <= 30; i++) {
        const s = i / 30, u = 1 - s;
        pts.push([u * u * u * a[0] + 3 * u * u * s * c1[0] + 3 * u * s * s * c2[0] + s * s * s * b[0],
          u * u * u * a[1] + 3 * u * u * s * c1[1] + 3 * u * s * s * c2[1] + s * s * s * b[1]]);
      }
      return pts;
    };
    return { outer: curve(out, 0), inner: curve(inn, (y2 - y1) * 0.16) };
  }

  function hatch(x0, y0, x1, y1, gap = 5) {
    ctx.beginPath();
    for (let x = x0 - (y1 - y0); x < x1; x += gap) { ctx.moveTo(x, y1); ctx.lineTo(x + (y1 - y0), y0); }
    ctx.stroke();
  }

  /* drawing */
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const g = geom();
    const lw = 1.75;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // Saucer
    const sa = Math.max(0, Math.min(1, g.sh.saucer));
    if (sa > 0.02) {
      ctx.globalAlpha = sa;
      const sw = g.topW * 1.6, sy = g.baseY - 1, depth = 0.045 * S;
      const pts = [];
      for (let i = 0; i <= 40; i++) { const s = i / 40; pts.push([g.cx - sw / 2 + sw * s, sy - Math.sin(Math.PI * s) * 1.5]); }
      for (let i = 0; i <= 40; i++) { const s = i / 40; const x = g.cx + sw / 2 - sw * s; const k = Math.abs(s - 0.5) * 2; pts.push([x, sy + depth * Math.sqrt(Math.max(0, 1 - Math.pow(k, 6))) ]); }
      rawPath(pts); ctx.fillStyle = COLORS.foamWhite; ctx.fill();
      ctx.save(); ctx.clip(); ctx.strokeStyle = rgb(hex(COLORS.roast), 0.28); ctx.lineWidth = 1; hatch(g.cx - sw / 2, sy - 4, g.cx + sw / 2, sy + depth + 2, 5); ctx.restore();
      ctx.strokeStyle = COLORS.roast; ctx.lineWidth = lw; linePath(pts, 4.1, 0.7, true); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Handle (behind the wall's outline, in front of the page)
    const ha = Math.max(0, Math.min(1, g.sh.handle));
    if (ha > 0.02) {
      ctx.globalAlpha = ha;
      const hp = handlePts(g);
      const ring = hp.outer.concat(hp.inner.slice().reverse());
      rawPath(ring); ctx.fillStyle = COLORS.foamWhite; ctx.fill('evenodd');
      ctx.save(); ctx.clip('evenodd'); ctx.strokeStyle = rgb(hex(COLORS.roast), 0.28); ctx.lineWidth = 1;
      hatch(g.cx, g.rimY, g.cx + g.topW, g.baseY, 5); ctx.restore();
      ctx.strokeStyle = COLORS.roast; ctx.lineWidth = lw;
      linePath(hp.outer, 2.3, 0.7); ctx.stroke();
      linePath(hp.inner, 5.2, 0.6); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // The wall in section: outer body, hatched where the cut is
    const ga = Math.max(0, Math.min(1, g.sh.glass));
    rawPath(g.outer); ctx.fillStyle = COLORS.foamWhite; ctx.fill();
    ctx.save();
    ctx.beginPath();
    g.outer.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    g.inner.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    ctx.clip('evenodd');
    ctx.strokeStyle = rgb(hex(COLORS.roast), 0.3 * (1 - ga));
    ctx.lineWidth = 1;
    hatch(g.cx - g.topW, g.rimY - 4, g.cx + g.topW, g.baseY + 4, 5);
    ctx.restore();

    // Inside: the empty cup, then the drink, clipped to the inside
    rawPath(g.inner); ctx.fillStyle = ga > 0.5 ? '#F7F0E6' : COLORS.inside; ctx.fill();
    ctx.save(); rawPath(g.inner); ctx.clip();
    const x0 = g.cx - g.iTop / 2 - 2, x1 = g.cx + g.iTop / 2 + 2;
    const list = [...layers.values()].filter((l) => l.frac.x > 0.0015).sort((a, b) => a.order - b.order);
    // boundaries: the level (px above the inside bottom) at the top of each layer
    let level = 0;
    const bounds = list.map((l) => { level += Math.max(0, l.frac.x) * g.cap; return level; });
    const topLevel = level;
    const surfaceAt = (i, lv, depthK) => g.innerBottom - lv + wave.h[i] * depthK;
    const xs = (i) => x0 + (x1 - x0) * i / (N - 1);
    const depthOf = (lv) => (topLevel > 1 ? Math.max(0.12, Math.pow(lv / topLevel, 1.6)) : 1);
    for (let k = list.length - 1; k >= 0; k--) {
      const l = list[k], lv = bounds[k], dk = depthOf(lv);
      ctx.beginPath();
      ctx.moveTo(x0, g.innerBottom + 4);
      for (let i = 0; i < N; i++) ctx.lineTo(xs(i), surfaceAt(i, lv, dk));
      ctx.lineTo(x1, g.innerBottom + 4); ctx.closePath();
      const below = k > 0 ? list[k - 1] : null;
      if (below && l.key === 'milk' && below.key === 'espresso') {
        const yb = g.innerBottom - bounds[k - 1];
        const gr = ctx.createLinearGradient(0, yb + 2, 0, yb - Math.min(26, (lv - bounds[k - 1]) * 0.5));
        gr.addColorStop(0, rgb(mix(l.color, below.color, 0.55)));
        gr.addColorStop(1, rgb(l.color));
        ctx.fillStyle = gr;
      } else ctx.fillStyle = rgb(l.color);
      ctx.fill();
      // foam bubbles
      if (l.key === 'foam' || l.key === 'crema') {
        const yTop = g.innerBottom - lv, yBot = g.innerBottom - (k > 0 ? bounds[k - 1] : 0);
        if (yBot - yTop > 6) {
          ctx.strokeStyle = rgb(hex(l.key === 'crema' ? COLORS.espresso : COLORS.grounds), 0.32); ctx.lineWidth = 1;
          ctx.beginPath();
          for (const [u, v, r] of BUBBLES) {
            const bx = x0 + 10 + (x1 - x0 - 20) * u, by = yTop + 5 + (yBot - yTop - 9) * v, rr = r * Math.min(3, (yBot - yTop) / 8);
            if (rr < 0.5) continue;
            ctx.moveTo(bx + rr, by); ctx.arc(bx, by, rr, 0, TAU);
          }
          ctx.stroke();
        }
      }
    }
    // the drawn boundary lines between layers, and the surface
    for (let k = 0; k < list.length; k++) {
      const lv = bounds[k], dk = depthOf(lv);
      const top = k === list.length - 1;
      ctx.strokeStyle = top ? COLORS.roast : rgb(hex(COLORS.roast), 0.4);
      ctx.lineWidth = top ? lw : 1;
      ctx.beginPath();
      for (let i = 0; i < N; i++) { const y = surfaceAt(i, lv, dk); if (i) ctx.lineTo(xs(i), y); else ctx.moveTo(xs(i), y); }
      ctx.stroke();
    }
    ctx.restore();

    // The pour: a stream from above while a layer is filling
    const now = performance.now();
    if (pour && now < pour.until && !reduced) {
      const surf = g.innerBottom - topLevel;
      const px = g.cx + pour.x * g.iTop * 0.2;
      const fade = Math.min(1, (pour.until - now) / 160);
      const wdt = 5 * fade + 1;
      ctx.fillStyle = rgb(pour.color);
      ctx.strokeStyle = COLORS.roast; ctx.lineWidth = 1.25;
      ctx.beginPath();
      const steps = 16;
      for (let i = 0; i <= steps; i++) { const y = (surf + 2) * i / steps; ctx.lineTo(px - wdt / 2 + Math.sin(i * 1.3 + now / 90) * 0.6, y); }
      for (let i = steps; i >= 0; i--) { const y = (surf + 2) * i / steps; ctx.lineTo(px + wdt / 2 + Math.sin(i * 1.1 + now / 110) * 0.6, y); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    // Outlines on top
    ctx.strokeStyle = COLORS.roast; ctx.lineWidth = lw;
    linePath(g.outer, 0.9, 0.75); ctx.stroke();
    ctx.lineWidth = ga > 0.5 ? 1.1 : 1.4;
    linePath(g.inner, 3.3, 0.55); ctx.stroke();
    // rim
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(g.outer[0][0], g.outer[0][1]); ctx.lineTo(g.inner[0][0], g.inner[0][1]); ctx.stroke();
    const oe = g.outer[g.outer.length - 1], ie = g.inner[g.inner.length - 1];
    ctx.beginPath(); ctx.moveTo(oe[0], oe[1]); ctx.lineTo(ie[0], ie[1]); ctx.stroke();
    if (ga > 0.05) {   // a glint down a glass
      ctx.globalAlpha = ga * 0.9; ctx.strokeStyle = COLORS.foamWhite; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(g.cx + g.iTop * 0.36, g.rimY + 14); ctx.lineTo(g.cx + g.iBot * 0.36, g.innerBottom - 16); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Labels, each with a drawn leader into its layer
    drawLabels(g, list, bounds);
  }

  function drawLabels(g, list, bounds) {
    const small = W < 480;
    const fs = small ? 13 : 15;
    ctx.font = `500 ${fs}px ${fontReady ? '"Figtree Variable", ' : ''}system-ui, sans-serif`;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
    const items = [];
    for (let k = 0; k < list.length; k++) {
      const l = list[k];
      const thick = (k ? bounds[k] - bounds[k - 1] : bounds[k]);
      if (thick < 3) continue;
      const mid = g.innerBottom - (bounds[k] - thick / 2);
      items.push({ l, y: mid, target: mid, alpha: Math.min(1, 0.45 + thick / 8) });
    }
    // keep labels apart (top to bottom)
    const tx = g.cx - g.topW / 2 - gapL;
    // a label too long for the room on its left breaks after its comma
    for (const it of items) {
      const t = it.l.label;
      it.lines = [t];
      if (ctx.measureText(t).width > tx - 4 && t.includes(', ')) { const i = t.indexOf(', '); it.lines = [t.slice(0, i + 1), t.slice(i + 2)]; }
      it.h = it.lines.length * (fs + 3);
    }
    items.sort((a, b) => a.y - b.y);
    for (let i = 1; i < items.length; i++) {
      const need = (items[i - 1].h + items[i].h) / 2 + 7;
      if (items[i].y - items[i - 1].y < need) items[i].y = items[i - 1].y + need;
    }
    const maxY = H - 12;
    if (items.length && items[items.length - 1].y > maxY) {
      const shift = items[items.length - 1].y - maxY;
      for (const it of items) it.y -= shift;
    }
    for (const it of items) {
      ctx.globalAlpha = it.alpha;
      ctx.fillStyle = COLORS.roast;
      it.lines.forEach((line, i) => ctx.fillText(line, tx, it.y + (i - (it.lines.length - 1) / 2) * (fs + 3)));
      const ex = g.leftAt(it.target) + 14;
      ctx.strokeStyle = COLORS.roast; ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(tx + 7, it.y);
      ctx.bezierCurveTo(tx + 7 + (ex - tx) * 0.45, it.y, ex - (ex - tx) * 0.35, it.target, ex, it.target);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(ex, it.target, 2, 0, TAU); ctx.fillStyle = COLORS.roast; ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* simulation */
  function targetsFor(compList, f) {
    const total = compList.reduce((n, l) => n + l.frac, 0);
    let amount = f * total, before = 0;
    const out = new Map();
    for (const l of compList) { out.set(l.key, Math.max(0, Math.min(l.frac, amount - before))); before += l.frac; }
    return out;
  }

  function applyTargets(impulse) {
    const t = targetsFor(comp, fill);
    let pourColor = null, pourGain = 0;
    for (const l of comp) {
      let layer = layers.get(l.key);
      if (!layer) {
        layer = { key: l.key, frac: spring(0, 1.35, 0.55), color: hex(l.color), to: hex(l.color), label: l.label, order: LAYER_ORDER.indexOf(l.key) };
        layers.set(l.key, layer);
      }
      layer.to = hex(l.color); layer.label = l.label;
      const nt = t.get(l.key);
      const gain = nt - layer.frac.target;
      if (gain > 0.004 && gain > pourGain) { pourGain = gain; pourColor = layer.to; }
      layer.frac.target = nt;
    }
    for (const [key, layer] of layers) if (!comp.some((l) => l.key === key)) layer.frac.target = 0;
    if (reduced) {
      for (const [key, layer] of layers) { layer.frac.x = layer.frac.target; layer.frac.v = 0; layer.color = layer.to; if (layer.frac.x <= 0) layers.delete(key); }
      for (const k of SHAPE_KEYS) { shape[k].x = shape[k].target; shape[k].v = 0; }
      draw(); return;
    }
    if (pourColor) {
      pour = { color: pourColor, until: performance.now() + 260 + pourGain * 900, x: (Math.random() - 0.5) };
    }
    if (impulse) knock(impulse);
    wake();
  }

  function knock(strength = 1) {
    flip = -flip;
    const a = 70 * strength * flip;
    for (let i = 0; i < N; i++) wave.v[i] += a * ((i / (N - 1)) - 0.5) * 2;
    nudge.v += -flip * 34 * strength;
  }

  function splash(u, amount) {
    for (let i = 0; i < N; i++) {
      const d = (i / (N - 1)) - u;
      wave.v[i] += amount * Math.exp(-(d * d) / 0.004);
    }
  }

  function step(dt) {
    for (const s of Object.values(shape)) stepSpring(s, dt);
    stepSpring(nudge, dt);
    for (const [key, l] of layers) {
      stepSpring(l.frac, dt);
      if (l.frac.target <= 0 && l.frac.x < 0.001 && Math.abs(l.frac.v) < 0.01) layers.delete(key);
      const k = Math.min(1, dt * 7);
      l.color = mix(l.color, l.to, k);
    }
    // the pour stirs the surface where it lands
    if (pour && performance.now() < pour.until) splash(0.5 + pour.x * 0.2, -700 * dt);
    // waves: coupled springs with a little damping; the walls reflect
    const h = wave.h, v = wave.v;
    const c2 = 24000, k0 = 40, damp = 3.0;
    for (let i = 0; i < N; i++) {
      const l = h[i > 0 ? i - 1 : 0], r = h[i < N - 1 ? i + 1 : N - 1];
      v[i] += (c2 * (l + r - 2 * h[i]) / 4 - k0 * h[i] - damp * v[i]) * dt;
    }
    let mean = 0;
    for (let i = 0; i < N; i++) { h[i] += v[i] * dt; mean += h[i]; }
    mean /= N;
    for (let i = 0; i < N; i++) { h[i] -= mean; if (h[i] > 11) h[i] = 11; if (h[i] < -11) h[i] = -11; }
  }

  function awake() {
    if (pour && performance.now() < pour.until) return true;
    for (const s of Object.values(shape)) if (springAwake(s, 0.0005)) return true;
    if (springAwake(nudge, 0.05)) return true;
    for (const l of layers.values()) {
      if (springAwake(l.frac, 0.0004)) return true;
      if (Math.abs(l.color[0] - l.to[0]) + Math.abs(l.color[1] - l.to[1]) + Math.abs(l.color[2] - l.to[2]) > 1.5) return true;
    }
    for (let i = 0; i < N; i++) if (Math.abs(wave.h[i]) > 0.08 || Math.abs(wave.v[i]) > 0.6) return true;
    return false;
  }

  function frame(t) {
    raf = 0;
    if (!visible) { running = false; return; }
    const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 1 / 60;
    lastT = t;
    acc += dt;
    const h = 1 / 240;
    let n = 0;
    while (acc >= h && n < 24) { step(h); acc -= h; n++; }
    draw();
    if (awake()) raf = requestAnimationFrame(frame);
    else { running = false; lastT = 0; acc = 0; for (let i = 0; i < N; i++) { wave.h[i] = 0; wave.v[i] = 0; } draw(); }
  }
  function wake() {
    if (reduced) { draw(); return; }
    if (!visible) return;
    if (!raf) { running = true; raf = requestAnimationFrame(frame); }
  }

  /* pointer and touch: the drink answers a finger or the pointer */
  let lastPX = null, lastPT = 0;
  function uAt(e) {
    const r = canvas.getBoundingClientRect();
    const g = geom();
    const x = e.clientX - r.left;
    return { u: (x - (g.cx - g.iTop / 2)) / Math.max(1, g.iTop), y: e.clientY - r.top, g };
  }
  canvas.addEventListener('pointermove', (e) => {
    if (reduced) return;
    const { u, y, g } = uAt(e);
    const t = performance.now();
    if (lastPX !== null && u > -0.15 && u < 1.15 && y > g.rimY - 30 && y < g.baseY) {
      const vx = (e.clientX - lastPX) / Math.max(8, t - lastPT);   // px per ms
      const amt = Math.max(-1.6, Math.min(1.6, vx));
      if (Math.abs(amt) > 0.05) {
        for (let i = 0; i < N; i++) { const d = (i / (N - 1)) - u; wave.v[i] += amt * 26 * Math.sign(d) * Math.exp(-(d * d) / 0.02); }
        wake();
      }
    }
    lastPX = e.clientX; lastPT = t;
  }, { passive: true });
  canvas.addEventListener('pointerleave', () => { lastPX = null; });
  canvas.addEventListener('pointerdown', (e) => {
    if (reduced) return;
    const { u } = uAt(e);
    if (u > -0.1 && u < 1.1) { splash(Math.max(0, Math.min(1, u)), -150); wake(); }
  }, { passive: true });

  /* visibility */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) wake();
    }).observe(canvas);
  }
  const ro = new ResizeObserver(() => { layout(); draw(); });
  ro.observe(canvas);
  layout();
  if (document.fonts && document.fonts.load) {
    document.fonts.load('500 15px "Figtree Variable"').then(() => { fontReady = true; draw(); }).catch(() => {});
  }

  return {
    /** Shows a drink; impulse > 0 sloshes it (a change the visitor made). */
    setDrink(opts, { impulse = 1 } = {}) {
      comp = composition(opts);
      const target = SHAPES[shapeFor(opts)];
      for (const k of SHAPE_KEYS) shape[k].target = target[k];
      applyTargets(impulse);
      if (onDescribe) onDescribe(describe());
    },
    /** The first fill, 0..1 (only ever forwards). */
    setFill(p) {
      const np = Math.max(fill, Math.min(1, p));
      if (np === fill) return;
      fill = np;
      applyTargets(0);
    },
    /** Snap the cup's shape (first paint), so it doesn't grow in from another cup. */
    snapShape() { for (const k of SHAPE_KEYS) { shape[k].x = shape[k].target; shape[k].v = 0; } draw(); },
    fillLevel: () => fill,
    describe,
    redraw: draw,
  };

  function describe() {
    const parts = comp.map((l) => l.label.toLowerCase());
    return parts.length ? `In the cup, from the bottom: ${parts.join(', ')}.` : 'An empty cup.';
  }
}
