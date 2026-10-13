/*
 * Toff Studio: the case films on the home page (round 05). Builder HOME.
 *
 * Each case shows a large laptop and a phone with the real site playing on their screens.
 *  - Laptops: scrolling moves the film forward, and only ever forward (motion.js's high-water mark);
 *    it starts once the film is on screen and the last frame holds when the case scrolls away. No pinning.
 *  - Phones: it plays once by itself when reached.
 *  - Reduced motion: the last frame, at once.
 * What plays comes from assets/home/captures/manifest.json `films`:
 *  - frames: a frame sequence per device ({ frames: 'path/f{i}.webp' or a list of addresses, pad, count, w, h, poster }),
 *    streamed in order and drawn on a canvas; used once Phase 4 has made them (count > 0);
 *  - fallback 'scroll': the real site's full-page screenshot scrolls inside each screen down to endY;
 *  - fallback 'everest-mock': the mock-up of the design, with the air conditioner opening as the room
 *    cools from 32 to 26 °C.
 *
 *   import { mountFilms } from './films.js';
 *   mountFilms(document.getElementById('work'), { manifest });   // returns { progress(key) }
 */
import { start, ease } from '../shared/motion.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const span = (p, a, b) => clamp01((p - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);

export function mountFilms(root, opts) {
  const m = (opts && opts.manifest) || {}, films = m.films || {}, handles = {};
  root.querySelectorAll('[data-film]').forEach((el) => {
    const key = el.getAttribute('data-film'), cfg = films[key];
    if (!cfg) return;
    const players = [], fb = cfg.fallback || {};
    const has = ['laptop', 'phone'].some((d) => (cfg[d] && cfg[d].frames && cfg[d].count > 0) || (fb.type === 'scroll' && fb[d]) || fb.type === 'everest-mock');
    if (!has) return;
    let last = 0, ready = false;
    // Each film's pictures load when it's about a screen away (not with the rest of the chapter)
    function init() {
      if (ready) return; ready = true;
      [['laptop', el.querySelector('[data-device="laptop"]')], ['phone', el.querySelector('[data-device="phone"]')]].forEach(([d, screen]) => {
        if (!screen) return;
        const seq = cfg[d];
        if (seq && seq.frames && seq.count > 0) players.push(framePlayer(screen, seq));
        else if (fb.type === 'scroll' && fb[d]) players.push(scrollPlayer(screen, fb[d]));
        else if (fb.type === 'everest-mock') players.push(everestPlayer(screen, fb, d));
      });
      players.forEach((pl) => pl.set(last));
    }
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); init(); } }, { rootMargin: '100% 0px 100% 0px' });
      io.observe(el);
    } else init();
    // Real captures in place of the mock-up: its note and its description go
    if (cfg.laptop && cfg.laptop.count > 0 && (cfg.fallback || {}).type === 'everest-mock') {
      const note = root.querySelector('[data-film-note="' + key + '"]'); if (note) note.hidden = true;
      el.setAttribute('aria-label', 'The Everest Climate Solutions website on a laptop and a phone');
    }
    handles[key] = start(el, {
      start: 0.92, end: 0.16, anchor: 0, minDuration: 900,
      duration: 4600, ease: ease.inOut,
      onProgress(p) { last = p; players.forEach((pl) => pl.set(p)); },
      onReset() {},
    });
    handles[key].last = () => last;
  });
  return { progress: (key) => (handles[key] ? handles[key].progress() : null), handles };
}

/* ---------------------------------------------------------------- frame sequences (Phase 4) */
function framePlayer(screen, seq) {
  const canvas = document.createElement('canvas');
  canvas.className = 'film-canvas'; canvas.setAttribute('aria-hidden', 'true');
  screen.append(canvas);
  const ctx = canvas.getContext('2d');
  const n = seq.count, imgs = new Array(n), pad = seq.pad || 3;
  const url = (i) => (Array.isArray(seq.frames) ? seq.frames[i] : seq.frames.replace('{i}', String(i + 1).padStart(pad, '0')));
  let want = 0, shown = -1, nextLoad = 0, loading = 0;
  if (seq.poster) { screen.style.backgroundImage = 'url("' + seq.poster + '")'; screen.style.backgroundSize = 'cover'; }
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
    while (k > 0 && !imgs[k]) k--;          // the nearest frame that has arrived (never a later one)
    const im = imgs[k]; if (!im || k === shown) return;
    shown = k;
    const cw = canvas.width, ch = canvas.height, s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.drawImage(im, (cw - w) / 2, 0, w, h);   // top-aligned cover
  }
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(screen);
  size(); pump();
  return { set(p) { want = Math.round(clamp01(p) * (n - 1)); draw(); } };
}

/* ---------------------------------------------------------------- the real site scrolling in the screen */
function scrollPlayer(screen, src) {
  const img = new Image();
  img.className = 'film-img'; img.alt = ''; img.decoding = 'async';
  img.width = src.w; img.height = src.h; img.src = src.src;
  screen.append(img);
  let p = 0;
  function apply() {
    const w = screen.clientWidth, h = screen.clientHeight; if (!w) return;
    const k = w / src.w, max = Math.max(0, Math.min(src.h * k - h, (src.endY || 0) * k));
    img.style.transform = 'translate3d(0,' + (-max * smooth(p)).toFixed(2) + 'px,0)';
  }
  if ('ResizeObserver' in window) new ResizeObserver(apply).observe(screen);
  apply();
  return { set(v) { p = clamp01(v); apply(); } };
}

/* ---------------------------------------------------------------- Everest's mock-up, cooling from 32 to 26 °C */
function everestPlayer(screen, fb, device) {
  const lap = device === 'laptop', W = lap ? 1280 : 390;
  const peak = '<svg viewBox="0 0 40 26" width="30" height="20" aria-hidden="true"><path d="M2 24 L14 4 L21 14 L26 7 L38 24 Z" fill="#0F2D52"/></svg>';
  const box = document.createElement('div');
  box.className = 'evm ' + (lap ? 'evm-lap' : 'evm-pho');
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML =
    '<div class="evm-nav">' + peak + '<b>Everest Climate Solutions</b>' +
      (lap ? '<span class="evm-links"><span>Services</span><span>Projects</span><span>Contact</span></span><span class="evm-btn">Get a quote</span>' : '<span class="evm-burger"></span>') + '</div>' +
    '<div class="evm-hero"><h1>Cool, quiet comfort.</h1>' +
      '<div class="evm-unit"><img class="evm-closed" alt="" width="1000" height="300" decoding="async" src="' + fb.closed + '"><img class="evm-open" alt="" width="1000" height="302" decoding="async" src="' + fb.open + '"></div>' +
      '<p class="evm-label">Room temperature</p><p class="evm-temp"><span class="evm-num">' + fb.from + '</span><sup>&nbsp;°C</sup></p>' +
      '<span class="evm-btn">Get a quote</span></div>';
  screen.append(box);
  const open = box.querySelector('.evm-open'), num = box.querySelector('.evm-num'), temp = box.querySelector('.evm-temp');
  const from = fb.from != null ? fb.from : 32, to = fb.to != null ? fb.to : 26;
  const warm = [200, 116, 46], cool = [47, 116, 181];
  function fit() { const w = screen.clientWidth; if (w) box.style.transform = 'scale(' + (w / W).toFixed(5) + ')'; }
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(screen);
  fit();
  return {
    set(p) {
      open.style.opacity = smooth(span(p, 0.12, 0.55)).toFixed(3);
      const t = smooth(span(p, 0.2, 0.95));
      num.textContent = String(Math.round(from - (from - to) * t));
      temp.style.color = 'rgb(' + warm.map((c, i) => Math.round(c + (cool[i] - c) * t)).join(',') + ')';
    },
  };
}

export default { mountFilms };
