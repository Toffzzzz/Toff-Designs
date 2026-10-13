/*
 * Atelier Wren: the home page. The hero's arrival, the lookbook's locks combing in, the
 * before-and-after wipe, the booking (booking.js, with the AI demo's message API) and the
 * gift card. Motion follows assets/shared/motion.js: laptops are driven by the scroll and only
 * move forward; phones play each part by itself when reached; reduced motion shows it finished.
 */
import { start, reducedMotion, ease, durationFor } from '../../../assets/shared/motion.js';
import { isEmbed, makeRef } from '../../../assets/shared/embed-api.js';
import { initCommon } from './common.js';
import { initBooking, selectStylist } from './booking.js';

const root = document.documentElement;


/* ── Hero: plays once on arrival ────────────────────────────────────────── */

function initHero() {
  if (reducedMotion() || isEmbed()) { root.classList.add('hero-in'); return; }
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('hero-in')));
}

/* ── Lookbook: each lock combs in from the clip down ────────────────────── */

const SEEN = 'wren.lookbook.seen';
function initLookbook() {
  const plates = [...document.querySelectorAll('.plate[data-look]')];
  let seen = [];
  try { seen = JSON.parse(sessionStorage.getItem(SEEN) || '[]'); } catch { /* blocked */ }
  const remember = (key) => {
    if (seen.includes(key)) return;
    seen.push(key);
    try { sessionStorage.setItem(SEEN, JSON.stringify(seen)); } catch { /* blocked */ }
  };
  for (const plate of plates) {
    const key = plate.dataset.look;
    const svg = plate.querySelector('svg[data-swatch]');
    if (!svg || !window.WrenSwatch) continue;
    // Once a plate has been seen in this visit it stays finished, so coming back from a look's
    // page (with or without the back-forward cache) the plate is already whole for the transition.
    if (reducedMotion() || seen.includes(key)) { window.WrenSwatch.reveal(svg, 1); continue; }
    window.WrenSwatch.reveal(svg, 0);
    start(plate.querySelector('.plate__art'), {
      start: 0.92, end: 0.38, duration: 1600, ease: ease.out, minDuration: 900,
      onProgress: (p) => window.WrenSwatch.reveal(svg, p),
      onDone: () => remember(key),
      replayOnReturn: false,
    });
    plate.addEventListener('click', () => { window.WrenSwatch.reveal(svg, 1); remember(key); });
  }
}

/* ── Before and after: a soft-edged wipe you drag or move with the arrow keys ── */

function initBeforeAfter() {
  const stage = document.getElementById('ba-stage');
  if (!stage) return;
  const grip = stage.querySelector('.ba__grip');
  let pos = 50, glide = 0, auto = null, taken = false;

  const set = (v) => {
    pos = Math.max(0, Math.min(100, v));
    stage.style.setProperty('--pos', pos.toFixed(2) + '%');
    const r = Math.round(pos);
    grip.setAttribute('aria-valuenow', String(r));
    grip.setAttribute('aria-valuetext', r <= 2 ? 'All after' : r >= 98 ? 'All before' : `${r}% before, ${100 - r}% after`);
  };
  // the visitor takes over: any automatic or scroll-driven motion stops for good
  const takeOver = () => {
    if (taken) return;
    taken = true;
    if (auto) { auto.destroy(); auto = null; }
  };
  const glideTo = (target) => {
    cancelAnimationFrame(glide);
    if (reducedMotion()) { set(target); return; }
    const from = pos, dist = Math.abs(target - from) * stage.clientWidth / 100;
    const dur = durationFor(dist), t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      set(from + (target - from) * ease.out(t));
      if (t < 1) glide = requestAnimationFrame(step);
    };
    glide = requestAnimationFrame(step);
  };
  const fromEvent = (e) => {
    const r = stage.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * 100;
  };

  // Drag: the whole picture answers a finger or the pointer; vertical swipes still scroll the page.
  let dragging = false, downX = 0, downY = 0, decided = false, onGrip = false;
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    takeOver();
    cancelAnimationFrame(glide);
    dragging = true; decided = e.pointerType !== 'touch'; downX = e.clientX; downY = e.clientY;
    onGrip = e.target.closest('.ba__grip') != null;
    if (decided) { stage.setPointerCapture(e.pointerId); stage.classList.add('is-dragging'); if (onGrip) set(pos); else glideTo(fromEvent(e)); }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    if (!decided) {
      const dx = Math.abs(e.clientX - downX), dy = Math.abs(e.clientY - downY);
      if (dx < 6 && dy < 6) return;
      if (dy > dx) { dragging = false; return; }   // a scroll, not a drag
      decided = true;
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('is-dragging');
    }
    cancelAnimationFrame(glide);
    set(fromEvent(e));
  });
  const end = (e) => {
    if (dragging && !decided && e.type === 'pointerup') glideTo(fromEvent(e));   // a tap
    dragging = false;
    stage.classList.remove('is-dragging');
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  grip.addEventListener('keydown', (e) => {
    const big = e.shiftKey ? 20 : 5;
    let to = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') to = pos - big;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') to = pos + big;
    else if (e.key === 'PageDown') to = pos - 20;
    else if (e.key === 'PageUp') to = pos + 20;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = 100;
    if (to == null) return;
    e.preventDefault();
    takeOver();
    cancelAnimationFrame(glide);
    if (e.repeat) set(to); else glideTo(to);
  });

  // Arrival: the wipe opens from all-before to the middle. Laptops: with the scroll, forward only.
  // Phones: by itself when reached. Reduced motion: already in the middle.
  if (reducedMotion()) { set(50); return; }
  set(92);
  auto = start(stage, {
    start: 0.85, end: 0.3, duration: 1800, ease: ease.inOut, minDuration: 900,
    onProgress: (p) => { if (!taken) set(92 - 42 * p); },
  });
}

/* ── "Book with Ana": the same as choosing her in the booking ─────────────── */

function initStylistLinks() {
  document.querySelectorAll('[data-book-stylist]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      selectStylist(a.dataset.bookStylist);
      const book = document.getElementById('book');
      history.pushState(null, '', '#book');
      book.scrollIntoView({ behavior: reducedMotion() ? 'instant' : 'smooth' });
      const input = document.getElementById(`bk-stylist-${a.dataset.bookStylist}`);
      if (input) input.focus({ preventScroll: true });
    });
  });
}

/* ── Gift card ──────────────────────────────────────────────────────────── */

const GIFT_KEY = 'wren.gift.v1';
const FOR = { 35: 'A blow-dry', 58: 'A cut and finish', 85: 'A full colour' };

function initGift() {
  const form = document.getElementById('gift-form');
  if (!form) return;
  const $ = (s) => form.querySelector(s);
  const card = document.getElementById('giftcard');
  const out = (k) => card.querySelector(`[data-gc="${k}"]`);
  const custom = $('#gc-custom'), err = $('#gc-custom-err'), other = $('#gc-other-field');
  const msg = $('#gc-msg'), count = $('#gc-count .num'), done = $('#gift-done');
  const patch = $('#gc-patch');

  try {
    const saved = JSON.parse(sessionStorage.getItem(GIFT_KEY) || 'null');
    if (saved) {
      const r = form.querySelector(`input[name="amount"][value="${saved.amount}"]`);
      if (r) r.checked = true;
      custom.value = saved.custom || ''; $('#gc-to').value = saved.to || ''; $('#gc-from').value = saved.from || ''; msg.value = saved.msg || '';
    }
  } catch { /* blocked */ }

  const amount = () => {
    const r = form.querySelector('input[name="amount"]:checked');
    if (!r) return null;
    if (r.value !== 'other') return Number(r.value);
    const v = custom.value.trim();
    return /^\d{1,3}$/.test(v) ? Number(v) : NaN;
  };
  const valid = (a) => Number.isInteger(a) && a >= 20 && a <= 300;

  const paint = () => {
    const choice = form.querySelector('input[name="amount"]:checked');
    const isOther = choice && choice.value === 'other';
    other.hidden = !isOther;
    const a = amount();
    out('amount').textContent = valid(a) ? `£${a}` : '£';
    out('for').textContent = FOR[a] && !isOther ? FOR[a] : 'For anything at the studio';
    patch.hidden = !(a === 85 && !isOther);
    out('msg').textContent = msg.value.trim();
    const to = $('#gc-to').value.trim(), from = $('#gc-from').value.trim();
    out('to').textContent = to ? `For ${to}` : '';
    out('from').textContent = from ? `From ${from}` : '';
    count.textContent = String(140 - msg.value.length);
    try { sessionStorage.setItem(GIFT_KEY, JSON.stringify({ amount: choice ? choice.value : '58', custom: custom.value, to, from, msg: msg.value })); } catch { /* blocked */ }
  };
  const showErr = (text) => {
    err.textContent = text; err.hidden = !text;
    custom.setAttribute('aria-invalid', text ? 'true' : 'false');
  };

  form.addEventListener('input', (e) => {
    if (e.target === custom) { custom.value = custom.value.replace(/\D/g, '').slice(0, 3); showErr(''); }
    if (!done.hidden) { done.hidden = true; out('ref').textContent = ''; }
    paint();
  });
  form.addEventListener('change', (e) => {
    if (e.target.name === 'amount' && e.target.value === 'other') custom.focus();
    paint();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const a = amount();
    if (!valid(a)) {
      showErr('Choose an amount from £20 to £300, in whole pounds.');
      custom.focus();
      return;
    }
    showErr('');
    const ref = makeRef('WG');
    out('ref').textContent = ref;
    done.querySelector('[data-gc-done]').textContent = `A £${a} gift card, reference ${ref}. Print it, or keep this page open to show it at the studio.`;
    done.hidden = false;
    done.focus();
  });
  done.querySelector('[data-print]').addEventListener('click', () => {
    document.body.classList.add('print-gift');
    const off = () => { document.body.classList.remove('print-gift'); window.removeEventListener('afterprint', off); };
    window.addEventListener('afterprint', off);
    window.print();
    setTimeout(off, 1000);
  });
  done.querySelector('[data-edit]').addEventListener('click', () => {
    done.hidden = true; out('ref').textContent = '';
    form.querySelector('input[name="amount"]:checked').focus();
  });
  paint();
}

/* ── Start ──────────────────────────────────────────────────────────────── */

initCommon();
initHero();
initLookbook();
initBeforeAfter();
initBooking();
initStylistLinks();
initGift();
