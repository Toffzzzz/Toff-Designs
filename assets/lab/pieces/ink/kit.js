/*
 * Shared helpers for Lab pieces 5, 6 and 7 (ink.js, weight.js, oneline.js).
 *   loadCss(container, url)   adds a stylesheet inside the piece (removed with the piece)
 *   el(tag, attrs, children)  tiny DOM helper
 *   tokens(node)              the site's colours from its CSS variables (settings.js writes them)
 *   stillGate(root, opts)     the still with a "Play" button (reduced motion, low power)
 *   makeSound(on)             soft synthesised sounds, silent unless the visitor turned sound on
 *   listen(target, type, fn, opts)  addEventListener that remembers itself, for dispose()
 */

export function loadCss(container, url) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  const ready = new Promise((res) => { link.onload = res; link.onerror = res; });
  container.appendChild(link);
  return ready;
}

export function el(tag, attrs, children) {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  (children || []).forEach((c) => c && n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return n;
}

function hexOf(v, fallback) {
  v = (v || '').trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : fallback;
}
export function rgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
export function tokens(node) {
  const cs = getComputedStyle(node || document.documentElement);
  const g = (name, fb) => hexOf(cs.getPropertyValue(name), fb);
  return {
    bg: g('--bg', '#0E1628'), deep: g('--bg-deep', '#0A101E'), tint: g('--tint', '#1A2541'),
    text: g('--text', '#F6F0E4'), ink: g('--ink', '#F1E3C6'), slate: g('--slate', '#A7AFC2'), gold: g('--gold', '#D8AC5F'),
    lineShadow: (cs.getPropertyValue('--line-shadow') || '').trim() || 'rgba(216,172,95,0.38)',
    hairline: (cs.getPropertyValue('--hairline') || '').trim() || 'rgba(216,172,95,0.22)',
    safeTop: parseFloat(cs.getPropertyValue('--lab-safe-top')) || 0,
    safeBottom: parseFloat(cs.getPropertyValue('--lab-safe-bottom')) || 0,
  };
}

export function settings() { return (typeof window !== 'undefined' && window.TOFF_SETTINGS) || {}; }
export function isPhone() { return window.matchMedia('(max-width: 699px)').matches; }
export function coarse() { return window.matchMedia('(pointer: coarse)').matches; }

/* Event listeners that are all removed together. */
export function listeners() {
  const list = [];
  return {
    on(target, type, fn, opts) { target.addEventListener(type, fn, opts); list.push([target, type, fn, opts]); },
    clear() { list.splice(0).forEach(([t, ty, f, o]) => t.removeEventListener(ty, f, o)); },
  };
}

/*
 * The still with "Play". `still` is the Lab's still for the piece (a URL), or nothing, in which case
 * draw(canvas) paints one. Resolves when the visitor presses Play.
 */
export function stillGate(root, { still, draw, message, label, place }) {
  const card = el('div', { class: 'lp-still-card', 'data-place': place || 'bottom' }, [
    el('p', { text: message }),
  ]);
  const btn = el('button', { type: 'button', class: 'lp-btn lp-btn--line', text: 'Play' });
  if (label) btn.setAttribute('aria-label', label);
  card.appendChild(btn);
  const wrap = el('div', { class: 'lp-still' });
  if (typeof still === 'string' && still) {
    const img = el('img', { src: still, alt: '', decoding: 'async' });
    img.onerror = () => { img.remove(); if (draw) paint(); };
    wrap.appendChild(img);
  } else if (draw) paint();
  function paint() {
    const c = el('canvas', { 'aria-hidden': 'true' });
    wrap.insertBefore(c, wrap.firstChild);
    const r = root.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.max(2, Math.round(r.width * d)); c.height = Math.max(2, Math.round(r.height * d));
    try { draw(c, d); } catch (e) { /* the still is decoration; the Play button is what matters */ }
  }
  wrap.appendChild(card);
  root.appendChild(wrap);
  let done;
  const played = new Promise((res) => { done = res; });
  btn.addEventListener('click', () => done());
  return {
    played,
    focus() { btn.focus({ preventScroll: true }); },
    leave() {
      wrap.setAttribute('data-leaving', '');
      setTimeout(() => wrap.remove(), 320);
    },
    remove() { wrap.remove(); },
  };
}

/*
 * Sound: synthesised with Web Audio, no files. Nothing is created unless sound is on.
 *   scratch()  a soft nib on paper      tock(v)  a felt-padded knock, v 0..1
 */
export function makeSound(on) {
  let ctx = null, noise = null, lastScratch = 0, lastTock = 0;
  function ac() {
    if (!on) return null;
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      const len = ctx.sampleRate * 0.5;
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  return {
    scratch() {
      const now = performance.now();
      if (!on || now - lastScratch < 55) return;
      lastScratch = now;
      const c = ac(); if (!c) return;
      const t = c.currentTime, src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = noise; bp.type = 'bandpass'; bp.frequency.value = 2200 + Math.random() * 1400; bp.Q.value = 1.3;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      src.connect(bp); bp.connect(g); g.connect(c.destination); src.start(t, Math.random() * 0.4, 0.12);
    },
    tock(v) {
      const now = performance.now();
      if (!on || now - lastTock < 40) return;
      lastTock = now;
      const c = ac(); if (!c) return;
      const t = c.currentTime, o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
      const vol = Math.min(0.09, 0.012 + 0.08 * v);
      o.type = 'sine'; o.frequency.setValueAtTime(150 + Math.random() * 50, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
      lp.type = 'lowpass'; lp.frequency.value = 900;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(lp); lp.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.2);
    },
    dispose() { if (ctx) { ctx.close().catch(() => {}); ctx = null; } },
  };
}

/* Quintic ease-out (the site's one easing family). */
export const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 5);
