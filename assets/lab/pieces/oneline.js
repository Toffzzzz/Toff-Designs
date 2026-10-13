/*
 * Lab piece 7: Your logo in one line (#oneline).
 * The existing tracer (assets/studio/oneline.js, loaded as it is) turns a logo into one continuous line:
 * flat artwork is traced as outlines, photos as shading (dots joined by one route). This piece is its
 * new presentation: choose a sample logo or drop in your own (it never leaves the device), and watch
 * the single line draw it, cream with the gold under-shadow, the pen tip in gold.
 *
 * Contract: mount(container, { reducedMotion, lowPower, soundOn, still }) -> { title, made, goodFor, describe, pause, resume, dispose }
 * Reduced motion and low power: the drawing appears finished, with a "Play the drawing" button.
 */
import { loadCss, el, tokens, coarse, listeners, makeSound } from './ink/kit.js';

const TITLE = 'Your logo in one line';
const MADE = 'Your browser traces the picture and joins every shape into one continuous line, then draws it without lifting the pen.';
const GOOD_FOR = 'brand moments';
const SIZE = 360;                                   // the tracer's working size for shading (as in oneline.js)
let uid = 0;

function loadTracer() {
  if (window.OneLine && window.OneLine._outline) return Promise.resolve(window.OneLine);
  const src = new URL('../../studio/oneline.js', import.meta.url).href;
  let s = document.querySelector(`script[data-lp-tracer]`);
  return new Promise((res, rej) => {
    if (!s) { s = document.createElement('script'); s.src = src; s.async = true; s.setAttribute('data-lp-tracer', ''); document.head.appendChild(s); }
    s.addEventListener('load', () => (window.OneLine ? res(window.OneLine) : rej(new Error('tracer'))));
    s.addEventListener('error', () => rej(new Error('tracer')));
  });
}

/* image -> darkness map; the same as oneline.js's own (not exported there) */
function darkness(source, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(source, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, n = w * h, v = new Float32Array(n);
  let edge = 0, en = 0;
  for (let i = 0; i < n; i++) {
    const a = d[i * 4 + 3] / 255, l = ((0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255) * a + (1 - a);
    v[i] = 1 - l;
    const x = i % w, y = (i / w) | 0; if (x < 3 || y < 3 || x > w - 4 || y > h - 4) { edge += v[i]; en++; }
  }
  if (edge / en > 0.5) for (let i = 0; i < n; i++) v[i] = 1 - v[i];
  const sorted = Array.from(v).sort((a, b) => a - b);
  const mid = sorted[Math.floor(n * 0.5)], photo = mid > 0.12 && mid < 0.88;
  const lo = sorted[Math.floor(n * 0.04)], hi = sorted[Math.floor(n * 0.995)] || 1, span = Math.max(0.05, hi - lo);
  for (let i = 0; i < n; i++) { const t = Math.max(0, Math.min(1, (v[i] - lo) / span)); v[i] = Math.pow(t, photo ? 2.1 : 1.35); }
  if (photo) {
    const e = new Float32Array(n); let emax = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const j = y * w + x;
      const gx = v[j + 1] - v[j - 1] + 0.5 * (v[j - w + 1] - v[j - w - 1] + v[j + w + 1] - v[j + w - 1]);
      const gy = v[j + w] - v[j - w] + 0.5 * (v[j + w - 1] - v[j - w - 1] + v[j + w + 1] - v[j - w + 1]);
      e[j] = Math.hypot(gx, gy); if (e[j] > emax) emax = e[j];
    }
    for (let i = 0; i < n; i++) v[i] = Math.max(v[i] * 0.55, Math.min(1, e[i] / (emax * 0.45 || 1)));
  }
  return v;
}
/* a smooth curve through the route (Catmull-Rom as cubic Béziers), as oneline.js draws it */
function curve(path, scale, ox, oy) {
  const P = path.map((p) => [p[0] * scale + ox, p[1] * scale + oy]);
  let d = 'M' + P[0][0].toFixed(1) + ' ' + P[0][1].toFixed(1);
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' +
      (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
  }
  return d;
}
const nextPaint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

export async function mount(container, { reducedMotion = false, lowPower = false, soundOn = false } = {}) {
  const base = new URL('./oneline/', import.meta.url);
  const logos = new URL('../../studio/lab-logos/', import.meta.url);
  const id = 'lp-oneline-' + (++uid);
  const root = el('div', { class: 'lp lp-oneline' });
  container.appendChild(root);
  const [OL] = await Promise.all([
    loadTracer().catch(() => null),
    loadCss(root, new URL('../ink/kit.css', base).href), loadCss(root, new URL('oneline.css', base).href),
  ]);

  const ev = listeners(), sound = makeSound(!!soundOn);
  const instant = !!reducedMotion;
  const detail = lowPower ? 900 : 1600;
  let scale = 1, raf = 0, paused = false, disposed = false, job = 0, finished = null, ownUrl = null, anim = null;

  const SAMPLES = [
    { label: 'A mountain badge', src: new URL('mountain.svg', logos).href },
    { label: 'A shield', src: new URL('shield.svg', logos).href },
    { label: 'An app icon', src: new URL('bolt.svg', logos).href },
    { label: 'A café mark', src: new URL('cup.svg', logos).href },
  ];

  // ---- the drawing
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 400 400'); svg.setAttribute('class', 'lp-ol-svg'); svg.setAttribute('aria-hidden', 'true');
  const shadow = document.createElementNS(NS, 'path'), line = document.createElementNS(NS, 'path'), tip = document.createElementNS(NS, 'circle');
  shadow.setAttribute('class', 'lp-ol-shadow'); line.setAttribute('class', 'lp-ol-path'); tip.setAttribute('class', 'lp-ol-tip');
  tip.setAttribute('r', '3'); tip.setAttribute('cx', '-20'); tip.setAttribute('cy', '-20');
  svg.append(shadow, line, tip);
  const busy = el('div', { class: 'lp-ol-busy', hidden: true, 'aria-hidden': 'true' });
  const stage = el('div', { class: 'lp-ol-stage', role: 'img', 'aria-label': 'The drawing' }, [svg, busy]);
  root.appendChild(stage);

  // ---- the panel
  const chips = SAMPLES.map((s, i) => el('button', { type: 'button', class: 'lp-btn lp-btn--quiet', 'aria-pressed': 'false', text: s.label, 'data-i': String(i) }));
  const file = el('input', { id: id + '-file', class: 'lp-ol-file', type: 'file', accept: 'image/*' });
  const fileBtn = el('label', { class: 'lp-btn lp-btn--gold', for: file.id, text: 'Use your own logo' });
  const again = el('button', { type: 'button', class: 'lp-btn lp-btn--quiet', text: instant ? 'Play the drawing' : 'Draw it again', disabled: true });
  const save = el('button', { type: 'button', class: 'lp-btn lp-btn--quiet', text: 'Save the drawing', disabled: true });
  const thumb = el('img', { alt: '', width: '56', height: '56', decoding: 'async' });
  const statusText = el('span', { 'aria-live': 'polite' });
  const ref = el('p', { class: 'lp-ol-ref lp-status' }, [thumb, statusText]);
  const panel = el('div', { class: 'lp-panel', role: 'group', 'aria-label': 'Choose a logo to draw' }, [
    el('div', {}, [el('p', { class: 'lp-label', id: id + '-samples', text: 'Choose a sample' }), el('div', { class: 'lp-ol-chips', role: 'group', 'aria-labelledby': id + '-samples' }, chips)]),
    el('div', { class: 'lp-ol-own' }, [file, fileBtn, el('p', { class: 'lp-hint', text: coarse() ? 'It never leaves your phone.' : 'Or drop one anywhere here. It never leaves your device.' })]),
    ref,
    el('div', { class: 'lp-actions' }, [again, save]),
  ]);
  root.appendChild(panel);

  function setStatus(t) { statusText.textContent = t; }
  function describe() {
    const what = finished ? `It shows ${finished.label.toLowerCase()} drawn as ${finished.how === 'outline' ? 'a clean outline' : 'loose shading'}, all in one unbroken cream line with a fine gold shadow, without the pen ever lifting.` : 'A single cream line draws a logo without the pen ever lifting.';
    return `${TITLE}. ${what} Choose one of four sample logos, or your own picture; it is traced in your browser and never leaves your device. Draw it again replays the line; Save the drawing downloads it as an SVG file.`;
  }

  // ---- layout: a square sheet beside the panel (under it on a phone)
  function layout() {
    const r = root.getBoundingClientRect(), p = panel.getBoundingClientRect(), T = tokens(root);
    const W = r.width, H = r.height, gut = Math.max(16, Math.min(64, W * 0.044));
    let x0, y0, x1, y1;
    if (W >= 900) { x0 = p.right - r.left + gut; x1 = W - gut; y0 = T.safeTop + gut * 0.6; y1 = H - T.safeBottom - gut * 0.6; }
    else { x0 = 16; x1 = W - 16; y0 = p.bottom - r.top + 12; y1 = H - T.safeBottom - 12; }
    const side = Math.max(160, Math.min(x1 - x0, y1 - y0, 860));
    stage.style.left = Math.round(x0 + (x1 - x0 - side) / 2) + 'px'; stage.style.top = Math.round(y0 + Math.max(0, (y1 - y0 - side) / 2)) + 'px';
    stage.style.width = stage.style.height = Math.round(side) + 'px';
    scale = side / 400;
    shadow.setAttribute('transform', `translate(0 ${(3.5 / scale).toFixed(2)})`);
    tip.setAttribute('r', (3.2 / scale).toFixed(2));
    if (finished) widths();
  }

  // ---- tracing
  async function trace(source, label) {
    const my = ++job;
    stopAnim(); [line, shadow].forEach((p) => { p.style.visibility = 'hidden'; }); tip.style.opacity = 0;
    again.disabled = true; save.disabled = true; busy.hidden = false;
    setStatus('Tracing the shapes…'); await nextPaint(); if (my !== job || disposed) return;
    let path = null, how = 'shading', w, h;
    try {
      const ol = OL._outline(source, 420, detail, false);
      if (my !== job || disposed) return;
      if (ol && ol.path.length > 10 && !ol.photo) { path = ol.path; how = 'outline'; w = ol.w; h = ol.h; }
      if (!path) {
        const iw = source.naturalWidth || source.width, ih = source.naturalHeight || source.height, s = SIZE / Math.max(iw, ih);
        w = Math.max(8, Math.round(iw * s)); h = Math.max(8, Math.round(ih * s));
        setStatus('Placing ' + detail.toLocaleString('en-GB') + ' dots…'); await nextPaint(); if (my !== job || disposed) return;
        const pts = OL._stipple(darkness(source, w, h), w, h, detail, 11);
        if (pts.length < 20) { busy.hidden = true; setStatus('That picture is too pale to draw. Try one with darker shapes.'); return; }
        setStatus('Finding one line through every dot…'); await nextPaint(); if (my !== job || disposed) return;
        path = OL._route(pts, lowPower ? 500 : 900);
      }
    } catch (e) { busy.hidden = true; setStatus('That picture couldn’t be traced. Try another.'); return; }
    if (my !== job || disposed) return;
    const vb = 400, sc = (vb - 30) / Math.max(w, h), ox = (vb - w * sc) / 2, oy = (vb - h * sc) / 2;
    finished = { d: curve(path, sc, ox, oy), label, how, points: path.length };
    busy.hidden = true;
    draw();
    stage.setAttribute('aria-label', describe());
  }
  // widths are set in screen pixels and converted to the drawing's own units (dashes must stay in those units)
  function widths() { const sw = strokeWidth(); line.style.strokeWidth = (sw / scale).toFixed(3); shadow.style.strokeWidth = ((sw + 1.2) / scale).toFixed(3); }
  function strokeWidth() { return finished.how === 'outline' ? 1.7 : Math.max(0.8, Math.min(1.6, 1.4 * Math.sqrt(1600 / Math.max(1, finished.points)))); }
  function draw() {
    if (!finished) return;
    line.setAttribute('d', finished.d); shadow.setAttribute('d', finished.d);
    widths();
    const L = line.getTotalLength();
    [line, shadow].forEach((p) => { p.style.strokeDasharray = L + ' ' + (L + 10); p.style.visibility = 'visible'; });
    again.disabled = false; save.disabled = false;
    const done = `Drawn: ${finished.label.charAt(0).toLowerCase() + finished.label.slice(1)}, ${finished.how === 'outline' ? 'as an outline' : 'in shading'}, in one line without lifting the pen.`;
    if (instant) { line.style.strokeDashoffset = 0; shadow.style.strokeDashoffset = 0; tip.style.opacity = 0; setStatus(done); return; }
    const dur = finished.how === 'outline' ? Math.max(3.8, Math.min(8, L * 0.0016)) : 5.2 + finished.points * 0.0012;
    anim = { t: 0, dur, L, done };
    setStatus('Drawing…');
    tip.style.opacity = 1;
    wake();
  }
  function frame(now) {
    raf = 0;
    if (!anim || paused || disposed) return;
    const dt = Math.min(0.1, ((now - (anim.last || now)) / 1000) || 1 / 60);
    anim.last = now; anim.t += dt;
    const k = Math.min(1, anim.t / anim.dur), e = easeInOut(k), es = easeInOut(Math.max(0, Math.min(1, (anim.t - 0.12) / anim.dur)));
    line.style.strokeDashoffset = anim.L * (1 - e); shadow.style.strokeDashoffset = anim.L * (1 - Math.max(es, k >= 1 ? 1 : 0));
    const pt = line.getPointAtLength(anim.L * e); tip.setAttribute('cx', pt.x); tip.setAttribute('cy', pt.y);
    sound.scratch();
    if (k >= 1) { tip.style.opacity = 0; shadow.style.strokeDashoffset = 0; setStatus(anim.done); anim = null; return; }
    raf = requestAnimationFrame(frame);
  }
  function wake() { if (!raf && anim && !paused && !disposed) { anim.last = 0; raf = requestAnimationFrame(frame); } }
  function stopAnim() { if (raf) cancelAnimationFrame(raf); raf = 0; anim = null; }

  // ---- sources
  function pick(i) {
    chips.forEach((c, j) => c.setAttribute('aria-pressed', j === i ? 'true' : 'false'));
    const s = SAMPLES[i];
    thumb.src = s.src; thumb.alt = s.label;
    const img = new Image(); img.decoding = 'async';
    img.onload = () => { if (!disposed) trace(img, s.label); };
    img.onerror = () => setStatus('That sample couldn’t be opened.');
    img.src = s.src;
  }
  function fromFile(f) {
    if (!f || !/^image\//.test(f.type)) { setStatus('Please choose an image file (PNG, JPG, SVG or WebP).'); return; }
    if (f.size > 15 * 1024 * 1024) { setStatus('That image is very large. Please choose one under 15 MB.'); return; }
    if (ownUrl) URL.revokeObjectURL(ownUrl);
    ownUrl = URL.createObjectURL(f);
    chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
    const img = new Image();
    img.onload = () => { if (!disposed) { thumb.src = ownUrl; thumb.alt = 'Your picture'; trace(img, 'Your picture'); } };
    img.onerror = () => setStatus('That image couldn’t be opened.');
    img.src = ownUrl;
  }
  chips.forEach((c, i) => ev.on(c, 'click', () => pick(i)));
  ev.on(file, 'change', () => { fromFile(file.files[0]); file.value = ''; });
  ev.on(again, 'click', () => { if (!finished) return; if (instant) { playOnce(); } else draw(); });
  function playOnce() {                       // reduced motion: the visitor asked to see it drawn
    line.setAttribute('d', finished.d); const L = line.getTotalLength();
    anim = { t: 0, dur: finished.how === 'outline' ? Math.max(3.8, Math.min(8, L * 0.0016)) : 5.2 + finished.points * 0.0012, L, done: 'Drawn.' };
    tip.style.opacity = 1; setStatus('Drawing…'); wake();
  }
  ev.on(save, 'click', () => {
    if (!finished) return;
    const T = tokens(root), sw = strokeWidth() * 0.66;
    const s = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="1200" height="1200">' +
      `<rect width="400" height="400" fill="${T.bg}"/><path d="${finished.d}" transform="translate(0 1.2)" fill="none" stroke="${T.gold}" stroke-opacity="0.38" stroke-width="${(sw + 0.4).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${finished.d}" fill="none" stroke="${T.ink}" stroke-width="${sw.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const url = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' })), a = document.createElement('a');
    a.href = url; a.download = 'one-line-drawing.svg'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  });
  // drop anywhere on the piece, or paste
  let depth = 0;
  ev.on(root, 'dragenter', (e) => { e.preventDefault(); depth++; root.setAttribute('data-over', ''); });
  ev.on(root, 'dragover', (e) => { e.preventDefault(); });
  ev.on(root, 'dragleave', () => { if (--depth <= 0) { depth = 0; root.removeAttribute('data-over'); } });
  ev.on(root, 'drop', (e) => { e.preventDefault(); depth = 0; root.removeAttribute('data-over'); if (e.dataTransfer && e.dataTransfer.files[0]) fromFile(e.dataTransfer.files[0]); });
  ev.on(document, 'paste', (e) => { const f = e.clipboardData && Array.from(e.clipboardData.files || []).find((x) => /^image\//.test(x.type)); if (f) { e.preventDefault(); fromFile(f); } });
  const ro = new ResizeObserver(() => layout());
  ro.observe(root); ro.observe(panel);
  layout();

  const api = {
    title: TITLE, made: MADE, goodFor: GOOD_FOR, describe,
    pause() { paused = true; if (raf) cancelAnimationFrame(raf); raf = 0; },
    resume() { if (disposed) return; paused = false; wake(); },
    dispose() {
      if (disposed) return; disposed = true; job++;
      stopAnim(); ev.clear(); ro.disconnect(); sound.dispose();
      if (ownUrl) URL.revokeObjectURL(ownUrl);
      root.remove();
    },
  };
  if (!OL) { setStatus('The tracer couldn’t load. Please try again in a moment.'); return api; }
  pick(0);
  await nextPaint();
  return api;
}
