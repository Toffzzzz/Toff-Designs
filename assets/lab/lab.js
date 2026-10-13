/*
 * Toff Studio: the Lab as an exhibition (round 05; rounds/round-05.md Appendix B, round-05-plan.md section 6).
 *
 * The index (lab.html) is a gallery wall of large titles, written in the HTML (each <li class="lab-row"
 * id="<id>" data-piece="<id>"> holds the title link and its one line). This module adds:
 *  - the stills: on laptops (a fine pointer, 1024px and wider) one still in a column on the right that
 *    slides to the row you hover or focus; elsewhere a still under each title. Stills live at
 *    assets/lab/stills/<id>.webp and are listed in assets/lab/stills/index.json (written by the capture
 *    script), so a missing still is never requested: a dark, title-only panel stands in for it.
 *  - the piece view: opening a title pushes #<id> and shows the piece full-screen with a quiet caption
 *    (title, how it's made, Good for), Pause (for pieces that move by themselves), Previous, Next and
 *    All experiments. Arrow keys move between pieces, Escape goes back, Back works, a swipe on the
 *    caption bar moves between pieces on phones. lab.html#<id> opens straight to the piece; the old
 *    anchors (#build-itself, #particles-band, #one-line, #liquid-gold, #moving-ink) land on theirs.
 *  - one piece at a time: each assets/lab/pieces/<id>.js is import()ed when opened, mounted with
 *    mount(container, { reducedMotion, lowPower, soundOn, still }) and always disposed of (awaited)
 *    before anything else is shown. A module that isn't there yet shows "This one is still being made".
 *  - the sound switch (off until turned on; remembered on this device as 'toff-sound', as before).
 *
 * The container handed to a piece carries --lab-safe-bottom (the caption bar's height) and
 * --lab-safe-top (0: the top bar is hidden while a piece is open), so pieces keep their controls clear.
 *
 * Settings (optional, settings.js): lab.lowPowerCores (4), lab.lowPowerMemoryGB (4).
 * ?capture in the address hides the caption bar and the grain (used by the stills capture script).
 * Tests and tools: window.__lab = { open(id), close(), state(), ready }.
 */
import { mount as mountShell } from '../shared/shell.js';

const S = window.TOFF_SETTINGS || {};
const doc = document, root = doc.documentElement;
const ORDER = ['sketch', 'gold', 'specks', 'vase', 'ink', 'weight', 'oneline', 'making'];
// Pieces that move by themselves get a Pause button (a piece may also say so itself with api.moves).
const MOVES = { sketch: false, gold: true, specks: true, vase: true, ink: true, weight: true, oneline: true, making: false };
const OLD = { 'build-itself': 'making', 'particles-band': 'specks', 'one-line': 'oneline', 'liquid-gold': 'gold', 'moving-ink': 'ink' };
const STILLS = new URL('./stills/', import.meta.url);
const PIECES = new URL('./pieces/', import.meta.url);
const CAPTURE = /[?&]capture\b/.test(location.search);
const LAB = S.lab || {};

const shell = mountShell({ cleanHash: false });
if (CAPTURE) root.classList.add('lab-capture');

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function lowPower() {
  const n = navigator, cores = LAB.lowPowerCores || 4, mem = LAB.lowPowerMemoryGB || 4;
  return (n.hardwareConcurrency > 0 && n.hardwareConcurrency <= cores) ||
    (n.deviceMemory > 0 && n.deviceMemory <= mem) || !!(n.connection && n.connection.saveData);
}
function soundOn() { try { return localStorage.getItem('toff-sound') === 'on'; } catch (e) { return false; } }
function el(tag, attrs, ...kids) {
  const e = doc.createElement(tag);
  for (const k in attrs || {}) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach((c) => { if (c != null) e.append(c); });
  return e;
}
const sentence = (s) => String(s || '').trim();
// "Good for: jewellers and luxury brands" reads the same whichever case a piece used
const lowerFirst = (s) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/* ------------------------------------------------------------------ the catalogue (from the HTML) */
const rows = new Map();
doc.querySelectorAll('.lab-row[data-piece]').forEach((li) => {
  const id = li.getAttribute('data-piece');
  const a = li.querySelector('.lab-title a'), line = li.querySelector('.lab-line'), good = li.querySelector('.lab-good');
  const what = line ? [...line.childNodes].filter((n) => n !== good).map((n) => n.textContent).join('').trim() : '';
  rows.set(id, { id, li, a, title: a ? a.textContent.trim() : id, what, good: good ? good.textContent.replace(/^Good for:?\s*/i, '').trim() : '' });
});
const ids = ORDER.filter((id) => rows.has(id));

/* ------------------------------------------------------------------ stills */
let stills = new Set();
const stillsReady = fetch(new URL('index.json', STILLS), { cache: 'no-cache' })
  .then((r) => (r.ok ? r.json() : { stills: [] }))
  .then((j) => { stills = new Set((j && j.stills) || []); })
  .catch(() => {});
const stillUrl = (id) => (stills.has(id) ? new URL(id + '.webp', STILLS).href : '');
function stillFigure(id, cls, lazy) {
  const r = rows.get(id), url = stillUrl(id);
  const box = el('div', { class: cls });
  if (url) {
    const img = el('img', { src: url, alt: '', width: 960, height: 600, decoding: 'async', loading: lazy ? 'lazy' : null });
    img.addEventListener('error', () => img.replaceWith(placeholder(r.title)), { once: true });
    box.append(img);
  } else box.append(placeholder(r.title));
  return box;
}
function placeholder(title) { return el('div', { class: 'lab-ph' }, el('span', null, title)); }

/* ------------------------------------------------------------------ the index: stills beside or under the titles */
const list = doc.querySelector('.lab-list');
const peek = doc.querySelector('.lab-peek');
const mqPeek = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
let peekFrame = null, peekLayers = new Map(), peekId = null;

function buildInline() {
  rows.forEach((r) => {
    if (r.li.querySelector('.lab-thumb')) return;
    r.li.append(stillFigure(r.id, 'lab-thumb', true));
  });
}
function buildPeek() {
  if (peekFrame || !peek) return;
  peekFrame = el('div', { class: 'lab-peek-frame' });
  peek.append(peekFrame);
  showPeek(ids[0], true);
}
function showPeek(id, instant) {
  if (!peekFrame || !rows.has(id)) return;
  if (!peekLayers.has(id)) {
    const layer = stillFigure(id, 'lab-peek-layer', false);
    peekLayers.set(id, layer); peekFrame.append(layer);
    void layer.offsetWidth;
  }
  peekLayers.forEach((l, k) => l.classList.toggle('is-on', k === id));
  peekId = id;
  placePeek(instant);
  rows.forEach((r) => r.li.classList.toggle('is-active', r.id === id));
}
function placePeek(instant) {
  if (!peekFrame || !peekId) return;
  const r = rows.get(peekId), lr = list.getBoundingClientRect(), rr = r.li.getBoundingClientRect();
  const fh = peekFrame.offsetHeight, max = Math.max(0, lr.height - fh);
  const y = Math.max(0, Math.min(max, rr.top - lr.top + Math.max(0, (rr.height - fh) / 2)));
  if (instant) peekFrame.classList.add('no-anim');
  peekFrame.style.transform = `translateY(${Math.round(y)}px)`;
  if (instant) { void peekFrame.offsetWidth; peekFrame.classList.remove('no-anim'); }
}
function layoutIndex() {
  if (mqPeek.matches) buildPeek(); else buildInline();
  root.classList.toggle('lab-peek-mode', mqPeek.matches);
  placePeek(true);
}
stillsReady.then(layoutIndex);
(mqPeek.addEventListener ? mqPeek.addEventListener('change', layoutIndex) : mqPeek.addListener(layoutIndex));
window.addEventListener('resize', () => placePeek(true), { passive: true });
if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => placePeek(true));

rows.forEach((r) => {
  r.li.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && mqPeek.matches) showPeek(r.id); });
  r.li.addEventListener('focusin', () => { if (mqPeek.matches) showPeek(r.id); });
  if (r.a) r.a.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openFromIndex(r.id);
  });
});
if (list) {
  list.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && mqPeek.matches) list.classList.add('is-browsing'); });
  list.addEventListener('pointerleave', () => list.classList.remove('is-browsing'));
  list.addEventListener('focusin', () => { if (mqPeek.matches) list.classList.add('is-browsing'); });
  list.addEventListener('focusout', (e) => { if (!list.contains(e.relatedTarget)) list.classList.remove('is-browsing'); });
}

/* ------------------------------------------------------------------ the sound switch */
const soundBtn = doc.querySelector('.lab-sound');
function syncSound() {
  if (!soundBtn) return;
  const on = soundOn();
  soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  const st = soundBtn.querySelector('.lab-sound-state'); if (st) st.textContent = on ? 'on' : 'off';
}
if (soundBtn) {
  soundBtn.addEventListener('click', () => {
    try { localStorage.setItem('toff-sound', soundOn() ? 'off' : 'on'); } catch (e) { /* private window: stays off */ }
    syncSound();
  });
  syncSound();
}

/* ------------------------------------------------------------------ the piece view */
const view = el('div', { class: 'lab-view', id: 'lab-view', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'lab-cap-title', 'aria-describedby': 'lab-desc', tabindex: '-1', hidden: true });
const stage = el('div', { class: 'lab-stage' });
const desc = el('p', { class: 'visually-hidden', id: 'lab-desc' });
const live = el('p', { class: 'visually-hidden', 'aria-live': 'polite' });
const capTitle = el('h2', { class: 'lab-cap-title', id: 'lab-cap-title' });
const capGood = el('p', { class: 'lab-cap-good' });
const capMade = el('p', { class: 'lab-cap-made', id: 'lab-cap-made' });
const madeBtn = el('button', { type: 'button', class: 'lab-cap-more', 'aria-expanded': 'false', 'aria-controls': 'lab-cap-made' }, 'How it’s made');
const pauseBtn = el('button', { type: 'button', class: 'lab-btn lab-pause', hidden: true },
  el('span', { class: 'lab-pause-icon', 'aria-hidden': 'true' }), el('span', { class: 'lab-pause-text' }, 'Pause'));
const prevBtn = el('button', { type: 'button', class: 'lab-btn lab-prev' }, el('span', { 'aria-hidden': 'true' }, '←'), ' ', el('span', { class: 'lab-btn-word' }, 'Previous'));
const nextBtn = el('button', { type: 'button', class: 'lab-btn lab-next' }, el('span', { class: 'lab-btn-word' }, 'Next'), ' ', el('span', { 'aria-hidden': 'true' }, '→'));
const allBtn = el('button', { type: 'button', class: 'lab-btn lab-all' }, 'All experiments');
const caption = el('div', { class: 'lab-caption' },
  el('div', { class: 'lab-cap-text' },
    el('div', { class: 'lab-cap-head' }, capTitle, capGood),
    madeBtn, capMade),
  el('div', { class: 'lab-cap-actions' }, pauseBtn, el('div', { class: 'lab-cap-nav' }, prevBtn, nextBtn, allBtn)));
view.append(stage, desc, live, caption);
doc.body.append(view);

// The caption bar's height, for the pieces (read when they mount, so it's set synchronously whenever
// the caption changes, and kept up to date by a ResizeObserver for later changes)
function syncSafe() {
  const h = CAPTURE || view.hidden ? '0px' : caption.offsetHeight + 'px';
  view.style.setProperty('--lab-safe-bottom', h);
  view.style.setProperty('--lab-caption-h', h);   // the name the gold and specks pieces read
}
const ro = new ResizeObserver(syncSafe);
ro.observe(caption);
view.style.setProperty('--lab-safe-top', '0px');

let shown = null;        // the id on screen (null: the index)
let want = null;         // the id asked for most recently
let running = false;
let current = null;      // { id, api, box }
let userPaused = false, opener = null, inerted = [];
let phase = 'index';     // index | loading | ready | missing | failed | gated
let ready = null, readyRes = null;
const nextReady = () => { ready = new Promise((r) => { readyRes = r; }); };
nextReady();

function request(id) {
  want = id && rows.has(id) ? id : null;
  if (!running) pump();
}
async function pump() {
  running = true;
  try {
    while (want !== shown) await swap(want);
  } finally { running = false; }
}

async function disposeCurrent() {
  const c = current; current = null;
  if (!c) return;
  try { await (c.api && c.api.dispose && c.api.dispose()); } catch (e) { console.warn('[lab] dispose', c.id, e); }
  c.box.remove();
}

function setInert(on) {
  if (on) {
    inerted = [...doc.body.children].filter((c) => c !== view && !c.inert && c.tagName !== 'SCRIPT');
    inerted.forEach((c) => { c.inert = true; });
  } else { inerted.forEach((c) => { c.inert = false; }); inerted = []; }
}

function fillCaption(id, api) {
  const r = rows.get(id);
  capTitle.textContent = sentence(api && api.title) || r.title;
  const good = sentence(api && api.goodFor) || r.good;
  capGood.textContent = good ? 'Good for: ' + lowerFirst(good).replace(/\.$/, '') : '';
  capMade.textContent = sentence(api && api.made) || r.what;
  const i = ids.indexOf(id), n = ids.length;
  const p = rows.get(ids[(i - 1 + n) % n]), q = rows.get(ids[(i + 1) % n]);
  prevBtn.setAttribute('aria-label', 'Previous: ' + p.title);
  nextBtn.setAttribute('aria-label', 'Next: ' + q.title);
  doc.title = (sentence(api && api.title) || r.title) + ' · The Lab · ' + (S.studioName || 'Toff Studio');
}
function setPause(visible) {
  pauseBtn.hidden = !visible;
  userPaused = false;
  pauseBtn.querySelector('.lab-pause-text').textContent = 'Pause';
  pauseBtn.classList.remove('is-paused');
}

// The still (or its title-only stand-in) while a piece loads, and under a piece that can't run
function cover(id) {
  stage.querySelectorAll('.lab-cover, .lab-note').forEach((n) => n.remove());
  const c = stillFigure(id, 'lab-cover', false);
  stage.prepend(c);
  const wait = el('p', { class: 'lab-note lab-loading', role: 'status' }, 'Getting it ready');
  stage.append(wait);
  return c;
}
function calm(kind, id) {
  stage.querySelectorAll('.lab-note').forEach((n) => n.remove());
  const r = rows.get(id), i = ids.indexOf(id), q = rows.get(ids[(i + 1) % ids.length]);
  const go = el('button', { type: 'button', class: 'link-arrow lab-calm-next' }, el('span', null, 'Try ' + q.title), ' ', el('span', { class: 'arrow', 'aria-hidden': 'true' }, '→'));
  go.addEventListener('click', () => step(1));
  const msg = kind === 'missing'
    ? ['This one is still being made', 'It will be here soon. The other experiments are ready to try.']
    : ['This one couldn’t start here', 'Your browser or device doesn’t offer what it needs. The other experiments may still work.'];
  stage.append(el('div', { class: 'lab-note lab-calm', role: 'status' }, el('p', { class: 'lab-calm-title' }, msg[0]), el('p', { class: 'lab-calm-text' }, msg[1]), go));
  desc.textContent = r.title + '. ' + msg[0] + '.';
}

async function swap(id) {
  const from = shown;
  const opening = from === null && id !== null, closing = id === null;
  const update = async () => {
    await disposeCurrent();
    shown = id;
    if (closing) { hideView(); return; }
    if (opening) showView();
    fillCaption(id, null);
    setPause(false);
    madeBtn.setAttribute('aria-expanded', 'false'); caption.classList.remove('is-more');
    cover(id);
    syncSafe();
    desc.textContent = rows.get(id).title + '. ' + rows.get(id).what;
    live.textContent = rows.get(id).title;
    phase = 'loading';
  };
  if (instantNext || CAPTURE) { instantNext = false; await update(); }
  else await shell.transition(update);
  if (closing) { phase = 'index'; afterClose(from); return; }
  if (want !== id) return;
  await mountPiece(id);
}
let instantNext = false;

async function mountPiece(id) {
  let mod;
  try { mod = await import(new URL(id + '.js', PIECES).href); }
  catch (e) {
    if (want !== id || shown !== id) return;
    phase = 'missing'; calm('missing', id); readyRes(phase); nextReady();
    return;
  }
  if (want !== id || shown !== id) return;
  const box = el('div', { class: 'lab-mount', 'data-piece': id });
  stage.append(box);
  syncSafe();
  const opts = { reducedMotion: reduced(), lowPower: lowPower(), soundOn: soundOn(), still: stillUrl(id) || undefined };
  let api = null;
  try { api = await mod.mount(box, opts); }
  catch (e) {
    console.warn('[lab] mount', id, e);
    box.remove();
    if (want !== id || shown !== id) return;
    phase = 'failed'; calm('failed', id); readyRes(phase); nextReady();
    return;
  }
  current = { id, api: api || {}, box };
  if (want !== id || shown !== id) return;   // pump() disposes it on the next swap
  fillCaption(id, api);
  const moves = api && typeof api.moves === 'boolean' ? api.moves : MOVES[id];
  setPause(!!moves);
  try { desc.textContent = api && api.describe ? api.describe() : ''; } catch (e) { /* keep the line */ }
  stage.querySelectorAll('.lab-loading').forEach((n) => n.remove());
  requestAnimationFrame(() => box.classList.add('is-in'));
  const done = () => stage.querySelectorAll('.lab-cover').forEach((c) => { if (c.parentNode) c.remove(); });
  if (reduced() || CAPTURE) done(); else setTimeout(done, 400);
  if (doc.hidden && api && api.pause) api.pause();
  phase = 'ready'; readyRes(phase); nextReady();
}

function showView() {
  root.classList.add('lab-is-open');
  shell.bar.setSuppressed(true);
  view.hidden = false;
  setInert(true);
  view.focus({ preventScroll: true });
}
function hideView() {
  view.hidden = true;
  root.classList.remove('lab-is-open');
  setInert(false);
  shell.bar.setSuppressed(false);
  stage.replaceChildren();
  doc.title = 'The Lab · ' + (S.studioName || 'Toff Studio');
}
function afterClose(lastId) {
  const r = rows.get(lastId) || rows.get(opener);
  opener = null;
  if (!r || !r.a) return;
  r.a.focus({ preventScroll: true });
  const b = r.li.getBoundingClientRect();
  if (b.top < 80 || b.bottom > window.innerHeight) r.li.scrollIntoView({ block: 'center', behavior: 'instant' });
  if (mqPeek.matches) showPeek(r.id, true);
}

/* ------------------------------------------------------------------ addresses and history */
function idFromHash() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (!h) return null;
  if (OLD[h]) return OLD[h];
  return rows.has(h) ? h : null;
}
function openFromIndex(id) {
  opener = id;
  history.pushState({ lab: id, pushed: true }, '', '#' + id);
  request(id);
}
function step(dir) {
  if (!shown) return;
  const i = ids.indexOf(want || shown), id = ids[(i + dir + ids.length) % ids.length];
  const st = history.state || {};
  history.replaceState({ lab: id, pushed: !!st.pushed }, '', '#' + id);
  request(id);
}
function close() {
  if (!shown && !want) return;
  const st = history.state || {};
  if (st.pushed) history.back();
  else { history.replaceState(null, '', location.pathname + location.search); request(null); }
}
window.addEventListener('popstate', () => request(idFromHash()));
window.addEventListener('hashchange', () => { const id = idFromHash(); if (id !== want) request(id); });

/* ------------------------------------------------------------------ controls */
prevBtn.addEventListener('click', () => step(-1));
nextBtn.addEventListener('click', () => step(1));
allBtn.addEventListener('click', close);
madeBtn.addEventListener('click', () => {
  const open = madeBtn.getAttribute('aria-expanded') !== 'true';
  madeBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  caption.classList.toggle('is-more', open);
});
pauseBtn.addEventListener('click', () => {
  if (!current || !current.api) return;
  userPaused = !userPaused;
  try { if (userPaused) current.api.pause && current.api.pause(); else current.api.resume && current.api.resume(); } catch (e) { /* ignore */ }
  pauseBtn.querySelector('.lab-pause-text').textContent = userPaused ? 'Play' : 'Pause';
  pauseBtn.classList.toggle('is-paused', userPaused);
  live.textContent = userPaused ? 'Paused' : 'Playing';
});
doc.addEventListener('visibilitychange', () => {
  if (!current || !current.api) return;
  try {
    if (doc.hidden) current.api.pause && current.api.pause();
    else if (!userPaused) current.api.resume && current.api.resume();
  } catch (e) { /* ignore */ }
});
doc.addEventListener('keydown', (e) => {
  if (view.hidden || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  if (e.key === 'Escape') { e.preventDefault(); close(); return; }
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  if (t && t.closest && (t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="slider"]') || (stage.contains(t) && t !== stage))) return;
  e.preventDefault();
  step(e.key === 'ArrowLeft' ? -1 : 1);
});
// a sideways swipe on the caption bar (never on the piece, which may need the finger)
let swipe = null;
caption.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') swipe = { x: e.clientX, y: e.clientY, t: e.timeStamp }; });
caption.addEventListener('pointerup', (e) => {
  if (!swipe) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.6) step(dx < 0 ? 1 : -1);
});
caption.addEventListener('pointercancel', () => { swipe = null; });
// refresh the text alternative after the visitor has done something in the piece
['pointerup', 'keyup', 'change'].forEach((t) => stage.addEventListener(t, () => {
  if (current && current.api && current.api.describe) setTimeout(() => { try { if (current) desc.textContent = current.api.describe(); } catch (e) { /* ignore */ } }, 250);
}));

/* ------------------------------------------------------------------ leaving and coming back (bfcache) */
window.addEventListener('pagehide', (e) => {
  if (!e.persisted || !current) return;
  const c = current; current = null;
  try { c.api.dispose && c.api.dispose(); } catch (err) { /* ignore */ }
  c.box.remove();
  shown = null; want = null; phase = 'index';
  view.hidden = true; root.classList.remove('lab-is-open'); setInert(false); shell.bar.setSuppressed(false); stage.replaceChildren();
});
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  const id = idFromHash();
  if (id) { instantNext = true; request(id); }
});

/* ------------------------------------------------------------------ arriving */
(function arrive() {
  const raw = decodeURIComponent(location.hash.slice(1));
  const id = idFromHash();
  if (raw && OLD[raw]) history.replaceState(history.state, '', '#' + OLD[raw]);
  if (id) {
    instantNext = true;
    stillsReady.then(() => request(id));
  }
})();

window.__lab = {
  open: (id) => { if (!shown && !want) openFromIndex(id); else { history.replaceState({ lab: id, pushed: !!(history.state || {}).pushed }, '', '#' + id); request(id); } },
  close,
  next: () => step(1),
  prev: () => step(-1),
  state: () => ({ shown, want, phase, mounted: current ? current.id : null, busy: running }),
  get ready() { return ready; },
  ids,
};
