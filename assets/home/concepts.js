/*
 * Toff Studio: the concept sites list on the home page (round 05). Builder HOME.
 *
 * An editorial list of five rows (in index.html). This adds:
 *  - laptops (hover and a fine pointer): a preview window of the row's site, just above the row (below it
 *    near the top of the screen) so it never covers the row's own words, following the pointer sideways
 *    while the row is hovered, and towards the row's right while the row has keyboard focus.
 *    It shows the site's short frame sequence (captures.json concepts.<slug>, from tools/capture/concepts.py),
 *    played once per hover, or its still. Reduced motion: the still, no movement of its own.
 *  - phones and touch screens: a still under each name (lazy, sized, no layout shift).
 * Opening a site is an ordinary link: the gold-line page transition comes from the View Transition in
 * tokens.css.
 *
 *   import { mountConcepts } from './concepts.js';
 *   mountConcepts(document.getElementById('concepts'), { manifest });
 */
import { reducedMotion } from '../shared/motion.js';

const HOVER = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 700px)');

export function mountConcepts(root, opts) {
  const m = (opts && opts.manifest) || {}, C = m.concepts || {};
  const list = root.querySelector('[data-concepts]'); if (!list) return null;
  const rows = [...list.querySelectorAll('[data-concept]')];

  // Phones: a still under each name (CSS hides it where the preview window is used)
  rows.forEach((li) => {
    const c = C[li.getAttribute('data-concept')], st = c && ((c.phoneStill && c.phoneStill.src) ? c.phoneStill : c.still);
    if (!st || !st.src) return;
    const a = li.querySelector('.cp-row'), kind = a.querySelector('.cp-kind');
    if (a.querySelector('.cp-still')) return;
    const img = document.createElement('img');
    img.className = 'cp-still'; img.loading = 'lazy'; img.decoding = 'async';
    img.width = st.w || 720; img.height = st.h || 450;
    img.alt = 'The first screen of the ' + a.querySelector('.cp-name').textContent + ' website';
    if (st.srcset) { img.srcset = st.srcset; img.sizes = 'calc(100vw - 32px)'; }
    img.src = st.src;
    kind.after(img);
  });

  // Laptops: the preview window
  const win = document.createElement('div');
  win.className = 'cp-preview'; win.setAttribute('aria-hidden', 'true');
  const still = document.createElement('img'); still.alt = ''; still.decoding = 'async';
  const canvas = document.createElement('canvas'); canvas.hidden = true;
  win.append(still, canvas);
  root.append(win);
  const ctx = canvas.getContext('2d');
  const seqs = {};   // slug -> { imgs, loaded }
  let active = null, raf = 0, playT0 = 0, playing = null;

  function place(row, clientX, clientY) {
    const r = root.getBoundingClientRect(), rr = row.getBoundingClientRect();
    const w = win.offsetWidth || 360, h = win.offsetHeight || 225;
    // Always just above the row (just below it when the top bar would cover it), so it never sits over
    // the row's own words: the name, the kind of business, the signature or "Open the site". Sideways it
    // follows the pointer (keyboard focus: towards the row's right), kept inside the list.
    const bar = 72, gap = 12;
    const y = rr.top - h - gap < bar ? rr.bottom - r.top + gap : rr.top - r.top - h - gap;
    let x = clientX == null ? rr.right - r.left - w - 150 : clientX - r.left - w / 2;
    x = Math.max(rr.left - r.left, Math.min(rr.right - r.left - w, x));
    win.style.setProperty('--x', Math.round(x) + 'px');
    win.style.setProperty('--y', Math.round(y) + 'px');
  }
  function sequence(slug) {
    const p = C[slug] && C[slug].preview;
    if (!p || !p.frames || !(p.count > 0)) return null;
    if (seqs[slug]) return seqs[slug];
    const s = seqs[slug] = { p, imgs: new Array(p.count) };
    for (let i = 0; i < p.count; i++) {
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { s.imgs[i] = im; };
      im.src = Array.isArray(p.frames) ? p.frames[i] : p.frames.replace('{i}', String(i + 1).padStart(p.pad || 3, '0'));
    }
    return s;
  }
  function play(slug) {
    cancelAnimationFrame(raf); playing = null;
    const s = reducedMotion() ? null : sequence(slug);
    canvas.hidden = !s; still.hidden = !!s;
    if (!s) return;
    canvas.width = 720; canvas.height = 450;
    playing = s; playT0 = performance.now();
    const fps = s.p.fps || 24;
    const tick = (now) => {
      if (playing !== s) return;
      const want = Math.min(s.p.count - 1, Math.floor((now - playT0) / 1000 * fps));
      let k = want; while (k > 0 && !s.imgs[k]) k--;
      if (s.imgs[k]) ctx.drawImage(s.imgs[k], 0, 0, canvas.width, canvas.height);
      if (want < s.p.count - 1) raf = requestAnimationFrame(tick);   // once, then it holds the last frame
    };
    raf = requestAnimationFrame(tick);
  }
  function show(li, x, y) {
    if (!HOVER.matches) return;
    const slug = li.getAttribute('data-concept'), c = C[slug];
    if (!c || !c.still || !c.still.src) { hide(); return; }
    const row = li.querySelector('.cp-row');
    if (active !== li) {
      active = li;
      if (still.getAttribute('src') !== c.still.src) still.src = c.still.src;
      play(slug);
      win.style.transition = 'none'; place(row, x, y); void win.offsetWidth; win.style.transition = '';
    } else place(row, x, y);
    win.classList.add('is-on');
  }
  function hide() { active = null; playing = null; cancelAnimationFrame(raf); win.classList.remove('is-on'); }

  rows.forEach((li) => {
    const row = li.querySelector('.cp-row');
    li.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') show(li, e.clientX, e.clientY); });
    li.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch' && active === li) place(row, e.clientX, e.clientY); });
    li.addEventListener('pointerleave', () => { if (active === li && !li.contains(document.activeElement)) hide(); });
    row.addEventListener('focus', () => { if (row.matches(':focus-visible')) show(li); });
    row.addEventListener('blur', () => { if (active === li) hide(); });
  });
  // the stills for the preview window load when the list is near (they're small)
  if (HOVER.matches) rows.forEach((li) => { const c = C[li.getAttribute('data-concept')]; if (c && c.still && c.still.src) { const im = new Image(); im.decoding = 'async'; im.src = c.still.src; } });
  window.addEventListener('scroll', () => { if (active && !active.matches(':hover') && !active.contains(document.activeElement)) hide(); }, { passive: true });
  return { hide };
}

export default { mountConcepts };
