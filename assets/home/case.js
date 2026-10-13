/*
 * Toff Studio: the case studies (work/bluebird/, work/everest/), round 05.
 *
 *   <html lang="en-GB" data-base="../../" data-page="case">
 *   <script type="module" src="../../assets/home/case.js"></script>
 *
 * What it does
 *  - Mounts the shared shell (top bar, skip link, footer, the gold-line page transition).
 *  - Live-site links from settings.js links.*: [data-live="bluebird"] gets its href; while a link is
 *    empty, [data-live] stays hidden and [data-soon] ("Live site coming soon") shows instead.
 *  - Fade-ups ([data-fade]) through motion.js: once, forward only.
 *  - [data-film="bluebird"]: the real site moving on a screen. Frames from Phase 4
 *    (assets/home/captures/manifest.json films.<key>.laptop with count > 0) when they exist;
 *    until then the full-page screenshot scrolls inside the screen from its top to data-end
 *    (pixels in the picture). On laptops the page's scroll drives it (forward only); on phones it
 *    plays once by itself; reduced motion shows the last frame. [data-film-index] li[data-at]
 *    light up as the film passes them, and a gold line draws down beside them.
 *  - [data-cool]: Everest's cooling scene: the flap opens (closed, half, open) and the room counts
 *    down in whole degrees from data-from to data-to (32 to 26 °C), the number turning from warm
 *    orange to icy blue and the warm light giving way to a cool one.
 *  - [data-fit="1280"]: a mock-up drawn at a design width, scaled to its screen.
 */
import { mount } from '../shared/shell.js';
import { start, fadeUp, ease, reducedMotion } from '../shared/motion.js';

const S = window.TOFF_SETTINGS || {};
const doc = document;
const shell = mount();
const base = shell.base;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const span = (p, a, b) => clamp01((p - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const filled = (v) => typeof v === 'string' && v.trim() !== '';

/* ---------------------------------------------------------------- live-site links from settings.js */
const links = S.links || {};
doc.querySelectorAll('[data-live]').forEach((a) => {
  const u = links[a.getAttribute('data-live')];
  if (filled(u)) { a.href = u.trim(); a.hidden = false; a.querySelectorAll('[data-addr]').forEach((s) => { s.textContent = u.trim().replace(/^https?:\/\//, '').replace(/\/$/, ''); }); }
  else { a.hidden = true; a.removeAttribute('href'); }
});
doc.querySelectorAll('[data-soon]').forEach((s) => { s.hidden = filled(links[s.getAttribute('data-soon')]); });
doc.querySelectorAll('[data-live-addr]').forEach((s) => {
  const u = links[s.getAttribute('data-live-addr')];
  if (filled(u)) s.textContent = u.trim().replace(/^https?:\/\//, '').replace(/\/$/, ''); else s.hidden = true;
});

/* ---------------------------------------------------------------- mock-ups drawn at a design width */
doc.querySelectorAll('[data-fit]').forEach((box) => {
  const W = Number(box.getAttribute('data-fit')) || 1280, screen = box.parentElement;
  const fit = () => { const w = screen.clientWidth; if (w) box.style.transform = 'scale(' + (w / W).toFixed(5) + ')'; };
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(screen);
  fit();
});

/* ---------------------------------------------------------------- the film (Bluebird) */
async function manifest() {
  try {
    const r = await fetch(base + 'assets/home/captures/manifest.json', { cache: 'no-cache' });
    if (r.ok) return await r.json();
  } catch (e) { /* no manifest yet: the fallback below */ }
  return null;
}

function scrollPlayer(screen, src, endY) {
  let img = screen.querySelector('img.film-img');   // the page's own picture of the site (shown as it is without scripts)
  if (!img) {
    img = new Image();
    img.className = 'film-img'; img.alt = ''; img.decoding = 'async';
    img.width = src.w; img.height = src.h; img.src = src.src;
    screen.append(img);
  }
  let p = 0;
  function apply() {
    const w = screen.clientWidth, h = screen.clientHeight; if (!w) return;
    const k = w / src.w, max = Math.max(0, Math.min(src.h * k - h, endY * k));
    img.style.transform = 'translate3d(0,' + (-max * p).toFixed(2) + 'px,0)';
  }
  if ('ResizeObserver' in window) new ResizeObserver(apply).observe(screen);
  apply();
  return { set(v) { p = clamp01(v); apply(); } };
}

function framePlayer(screen, seq) {
  const canvas = doc.createElement('canvas');
  canvas.className = 'film-canvas'; canvas.setAttribute('aria-hidden', 'true');
  screen.append(canvas);
  const ctx = canvas.getContext('2d');
  const n = seq.count, imgs = new Array(n), pad = seq.pad || 3;
  const url = (i) => base + seq.frames.replace('{i}', String(i + 1).padStart(pad, '0'));
  let want = 0, shown = -1, nextLoad = 0, loading = 0;
  function pump() {
    while (loading < 4 && nextLoad < n) {
      const k = nextLoad++, im = new Image();
      im.decoding = 'async'; loading++;
      im.onload = () => { loading--; (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => { imgs[k] = im; draw(); }); pump(); };
      im.onerror = () => { loading--; pump(); };
      im.src = url(k);
    }
  }
  function size() {
    const r = screen.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; shown = -1; draw(); }
  }
  function draw() {
    let k = Math.min(n - 1, want);
    while (k > 0 && !imgs[k]) k--;   // the nearest frame that has arrived, never a later one
    const im = imgs[k]; if (!im || k === shown) return;
    shown = k;
    const cw = canvas.width, ch = canvas.height, s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    ctx.drawImage(im, (cw - im.naturalWidth * s) / 2, 0, im.naturalWidth * s, im.naturalHeight * s);
  }
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(screen);
  size(); pump();
  return { set(p) { want = Math.round(clamp01(p) * (n - 1)); draw(); } };
}

async function films() {
  const els = [...doc.querySelectorAll('[data-film]')];
  if (!els.length) return;
  const m = await manifest();
  els.forEach((el) => {
    const key = el.getAttribute('data-film');
    const screen = el.querySelector('[data-device="laptop"]');
    if (!screen) return;
    const cfg = (m && m.films && m.films[key]) || {};
    const seq = cfg.laptop;
    // the fallback: the real full-page screenshot, from the page's own attributes
    const fb = { src: base + el.getAttribute('data-src'), w: Number(el.getAttribute('data-w')), h: Number(el.getAttribute('data-h')) };
    const useFrames = seq && seq.frames && seq.count > 0;
    if (useFrames) screen.querySelectorAll('img.film-img').forEach((i) => i.remove());
    const player = useFrames ? framePlayer(screen, seq) : scrollPlayer(screen, fb, Number(el.getAttribute('data-end')) || 0);
    const idx = doc.querySelector('[data-film-index="' + key + '"]');
    const items = idx ? [...idx.querySelectorAll('li[data-at]')].map((li) => ({ li, at: Number(li.getAttribute('data-at')) })) : [];
    const line = idx && idx.querySelector('.cs-index-line');
    const h = start(el, {
      start: 0.82, end: 0.06, anchor: 0, minDuration: 1100,
      duration: 4800, ease: ease.inOut,   // phones: under five seconds, so it needs no pause control
      onProgress(p) {
        player.set(p);
        if (line) line.style.setProperty('--p', p.toFixed(4));
        items.forEach((it) => { if (p >= it.at - 0.0005) it.li.classList.add('is-on'); });
      },
    });
    el.__film = h;
  });
}
films();

/* ---------------------------------------------------------------- the cooling scene (Everest) */
doc.querySelectorAll('[data-cool]').forEach((el) => {
  const from = Number(el.getAttribute('data-from')) || 32, to = Number(el.getAttribute('data-to')) || 26, steps = from - to;
  const q = (s) => el.querySelector(s);
  const closed = q('[data-unit="closed"]'), half = q('[data-unit="half"]'), open = q('[data-unit="open"]');
  const num = q('[data-temp]'), temp = q('.cs-cool-temp'), warm = q('.cs-cool-glow--warm'), cool = q('.cs-cool-glow--cool');
  const W = [242, 166, 90], C = [169, 205, 240];   // DESIGN.md: the Everest number, warm and cool
  let shown = null;
  // The markup shows the finished scene (for a page without scripts); begin from the warm room.
  function render(p) {
    const c = span(p, 0.08, 0.92);
    const d = from - Math.min(steps, Math.floor(c * steps + 1e-6));   // whole degrees, as the site counts
    if (d !== shown) { num.textContent = String(d); shown = d; }
    const t = smooth(c);
    temp.style.color = 'rgb(' + W.map((v, i) => Math.round(v + (C[i] - v) * t)).join(',') + ')';
    warm.style.opacity = (1 - t).toFixed(3);
    cool.style.opacity = t.toFixed(3);
    // the flap: each image fades in on top before the one under it fades out, so the unit never dims
    half.style.opacity = (span(c, 0.25, 0.4) * (1 - span(c, 0.66, 0.78))).toFixed(3);
    open.style.opacity = span(c, 0.6, 0.72).toFixed(3);
    closed.style.opacity = (1 - span(c, 0.36, 0.42)).toFixed(3);
  }
  if (!reducedMotion()) render(0);
  start(el, { start: 0.8, end: 0.18, anchor: 0, minDuration: 1000, duration: 3400, ease: ease.inOut, onProgress: render });
});

/* ---------------------------------------------------------------- fade-ups */
fadeUp('[data-fade]');
