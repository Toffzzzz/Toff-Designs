/*
 * Saltmarsh: the page's behaviour. Everything here is a demo: nothing is booked, sent or
 * charged; confirmations are kept in sessionStorage for this visit only.
 *  - the top bar (hides going down, returns going up) and the phone menu
 *  - the headline's arrival, and the steam (js/steam.js, loaded after first paint)
 *  - the menu card: diet filters, and the dotted leaders that run out as each line arrives
 *  - table booking, the private dining enquiry, the gift voucher picker
 *  - open now (London time) and today's hours
 * Motion rules come from the shared motion.js (laptops follow the scroll, never backwards;
 * phones play each part when reached; reduced motion shows everything finished).
 */
import { mountRibbon } from '../../../assets/shared/ribbon.js';
import { start, fadeUp, reducedMotion, tokens } from '../../../assets/shared/motion.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const EMBED = document.documentElement.classList.contains('is-embed');

/* ------------------------------------------------------------------ storage (this visit only) */
const store = {
  get(k) { try { const v = sessionStorage.getItem('saltmarsh:' + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { try { sessionStorage.setItem('saltmarsh:' + k, JSON.stringify(v)); } catch (e) { /* private mode: fine */ } },
  del(k) { try { sessionStorage.removeItem('saltmarsh:' + k); } catch (e) { /* fine */ } },
};

/* ------------------------------------------------------------------ London time and dates */
function londonNow() {
  const q = new URLSearchParams(location.search).get('now');
  if (q && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(q)) {
    const [d, t] = q.split('T');
    const [h, m] = t.split(':').map(Number);
    return { iso: d, mins: h * 60 + m };
  }
  const parts = {};
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date()).forEach((p) => { parts[p.type] = p.value; });
  return { iso: `${parts.year}-${parts.month}-${parts.day}`, mins: Number(parts.hour) * 60 + Number(parts.minute) };
}
const dayOf = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 12)); };
const isoOf = (date) => date.toISOString().slice(0, 10);
const addDays = (date, n) => new Date(date.getTime() + n * 86400000);
const FMT_DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const FMT_MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const FMT_WEEKDAY = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' });
const fmtDay = (iso) => FMT_DAY.format(dayOf(iso));
function fmtTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${m ? '.' + String(m).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`;
}
const toMins = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/* The restaurant's week (made up, and the same everywhere on the page) */
const DINNER = ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'];
const LUNCH = ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00'];
function serviceFor(date) {
  const dow = date.getUTCDay();
  if (dow === 1) return null;                       // Monday: closed
  if (dow === 0) return { name: 'Sunday lunch', slots: LUNCH, open: 12 * 60, close: 17 * 60 };
  return { name: 'Dinner', slots: DINNER, open: 17 * 60 + 30, close: 23 * 60 };
}

const NOW = londonNow();
const TODAY = dayOf(NOW.iso);

/* ------------------------------------------------------------------ small helpers */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function makeCode(groups) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rnd = new Uint32Array(groups.reduce((a, b) => a + b, 0));
  (window.crypto || window.msCrypto).getRandomValues(rnd);
  let i = 0;
  return 'SM-' + groups.map((n) => Array.from({ length: n }, () => A[rnd[i++] % A.length]).join('')).join('-');
}
function showError(input, errEl, msg) {
  if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if (!errEl) return;
  errEl.textContent = msg || '';
  errEl.hidden = !msg;
}
function counter(textarea, out) {
  const max = Number(textarea.getAttribute('maxlength'));
  const upd = () => {
    const left = max - textarea.value.length;
    out.textContent = `${left} left`;
    out.classList.toggle('is-low', left <= 20);
  };
  textarea.addEventListener('input', upd);
  upd();
  return upd;
}
function fillList(dl, rows) {
  dl.replaceChildren(...rows.filter(([, v]) => v !== '' && v != null).map(([k, v]) => {
    const div = document.createElement('div');
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    div.append(dt, dd);
    return div;
  }));
}
function arrive(el) {
  if (reducedMotion()) return;
  el.classList.remove('is-arriving'); void el.offsetWidth; el.classList.add('is-arriving');
  el.addEventListener('animationend', () => el.classList.remove('is-arriving'), { once: true });
}
function swap(hideEl, showEl, focusEl) {
  hideEl.hidden = true;
  showEl.hidden = false;
  arrive(showEl);
  const target = focusEl || showEl;
  target.focus({ preventScroll: true });
  const r = showEl.getBoundingClientRect();
  const barH = $('#bar') ? $('#bar').offsetHeight : 0;
  if (r.top < barH || r.top > window.innerHeight * 0.6) {
    window.scrollTo({ top: window.scrollY + r.top - barH - 24, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }
}

/* A − n + stepper. aria-disabled (not disabled) so focus stays put at the ends; the hint beside says why. */
function stepper(root, onChange) {
  const min = Number(root.dataset.min), max = Number(root.dataset.max);
  const out = $('[data-value]', root), unit = $('[data-unit]', root);
  const field = root.closest('.field');
  const maxHint = field && $('[data-max-hint]', field), minHint = field && $('[data-min-hint]', field);
  const [dec, inc] = $$('.stepper__btn', root);
  let value = Number(root.dataset.start || out.textContent) || min;
  let ready = false;
  const render = (announce) => {
    out.textContent = String(value);
    unit.textContent = value === 1 ? 'guest' : 'guests';
    dec.setAttribute('aria-disabled', String(value <= min));
    inc.setAttribute('aria-disabled', String(value >= max));
    if (maxHint) maxHint.hidden = !(value >= max && announce === 'up');
    if (minHint) minHint.hidden = !(value <= min && announce === 'down');
    if (onChange && ready) onChange(value);
  };
  const step = (d) => {
    const next = Math.min(max, Math.max(min, value + d));
    if (next === value) { render(d > 0 ? 'up' : 'down'); return; }
    value = next; render(value >= max ? 'up' : value <= min ? 'down' : '');
  };
  dec.addEventListener('click', () => step(-1));
  inc.addEventListener('click', () => step(1));
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });
  render('');
  ready = true;
  if (onChange) onChange(value, true);
  return {
    get value() { return value; },
    set(v) { value = Math.min(max, Math.max(min, Number(v) || min)); render(''); },
  };
}

/* ------------------------------------------------------------------ top bar and phone menu */
function initBar() {
  const bar = $('#bar'), toggle = $('.bar__toggle'), sheet = $('#sheet');
  if (!bar) return;
  let lastY = window.scrollY, ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    bar.classList.toggle('is-solid', y > 8);
    if (sheet.classList.contains('is-open')) { lastY = y; return; }
    if (y > lastY + 6 && y > bar.offsetHeight * 2) bar.classList.add('is-hidden');
    else if (y < lastY - 6 || y <= bar.offsetHeight) bar.classList.remove('is-hidden');
    lastY = y;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  const outside = [$('#main'), $('.foot'), $('[data-toff-ribbon]'), $('.skip')].filter(Boolean);
  const label = $('.bar__toggle-text', toggle);
  const focusables = () => [toggle, ...$$('a, button', sheet)];
  const open = () => {
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add('is-open'));
    toggle.setAttribute('aria-expanded', 'true');
    label.textContent = 'Close';
    bar.classList.add('is-solid'); bar.classList.remove('is-hidden');
    outside.forEach((el) => el.setAttribute('inert', ''));
    document.documentElement.style.overflow = 'hidden';
    const first = $('a', sheet); if (first) first.focus();
  };
  const close = (returnFocus = true) => {
    sheet.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    label.textContent = 'Menu';
    outside.forEach((el) => el.removeAttribute('inert'));
    document.documentElement.style.overflow = '';
    const done = () => { if (!sheet.classList.contains('is-open')) sheet.hidden = true; };
    if (reducedMotion()) done(); else setTimeout(done, tokens.baseMs);
    if (returnFocus) toggle.focus();
    bar.classList.toggle('is-solid', window.scrollY > 8);
  };
  toggle.addEventListener('click', () => (toggle.getAttribute('aria-expanded') === 'true' ? close() : open()));
  sheet.addEventListener('click', (e) => { if (e.target.closest('a')) close(false); });
  document.addEventListener('keydown', (e) => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      const f = focusables(), i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches && toggle.getAttribute('aria-expanded') === 'true') close(false); });
}

/* ------------------------------------------------------------------ hero: the headline arrives */
function initHeadline() {
  const h1 = $('.hero__title');
  if (!h1 || EMBED) return;
  const original = h1.innerHTML;
  const text = h1.textContent;
  if (reducedMotion()) { h1.classList.add('is-done'); return; }
  const split = () => {
    const words = text.split(' ');
    h1.textContent = '';
    const spans = words.map((w, i) => {
      const s = document.createElement('span'); s.textContent = w;
      h1.append(s); if (i < words.length - 1) h1.append(' ');
      return s;
    });
    const lines = [];
    let top = null;
    spans.forEach((s) => {
      const t = s.offsetTop;
      if (top === null || Math.abs(t - top) > 4) { lines.push([]); top = t; }
      lines[lines.length - 1].push(s.textContent);
    });
    h1.textContent = '';
    lines.forEach((ws) => {
      const ln = document.createElement('span'); ln.className = 'ln';
      const inner = document.createElement('span'); inner.textContent = ws.join(' ') + ' ';
      ln.append(inner); h1.append(ln);
    });
    $$('.ln > span', h1).forEach((s, i) => { s.style.transitionDelay = `${i * tokens.staggerLinesMs}ms`; });
    h1.classList.add('is-split');
    return lines.length;
  };
  const restore = () => { h1.innerHTML = original; h1.classList.remove('is-split', 'is-in'); h1.classList.add('is-done'); };
  const fonts = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]) : Promise.resolve();
  fonts.then(() => {
    const n = split();
    start(h1, {
      trigger: 1,
      onPlay({ instant }) {
        if (instant) { restore(); return; }
        requestAnimationFrame(() => requestAnimationFrame(() => h1.classList.add('is-in')));
        setTimeout(restore, tokens.moveMs + n * tokens.staggerLinesMs + 120);
      },
    });
  });
}

/* ------------------------------------------------------------------ hero: the shade follows the text */
// The night shade over the photo is darkest where the headline and the line under it sit, and
// again under the facts at the bottom, wherever the layout puts them (320px phones included).
// js/steam.js reads the same stops, so the canvas and this shade always match.
export const SHADE = { a: [0.94, 0.88, 0.5, 0, 0, 0.76, 1] };
function initShade() {
  const hero = $('.hero');
  if (!hero || EMBED) return;
  const lede = $('.hero__lede', hero), title = $('.hero__title', hero), facts = $('.hero__facts', hero);
  const measure = () => {
    const H = hero.offsetHeight;
    if (!H) return;
    const top = hero.getBoundingClientRect().top;
    const textEnd = Math.max(lede.getBoundingClientRect().bottom, title.getBoundingClientRect().bottom) - top;
    const factsTop = facts.getBoundingClientRect().top - top;
    const s2 = Math.min(textEnd + 6, H * 0.62);
    const s1 = s2 * 0.58;
    const s3 = Math.min(s2 + Math.max(56, H * 0.09), H * 0.7);
    const s5 = Math.max(s3 + 40, factsTop + 4);
    const s4 = Math.max(s3, s5 - Math.max(90, H * 0.14));
    const px = [s1, s2, s3, s4, s5].map((v) => Math.round(v));
    px.forEach((v, i) => hero.style.setProperty(`--sh-${i + 1}`, `${v}px`));
    hero.dispatchEvent(new CustomEvent('saltmarsh:shade', { detail: { stops: px.map((v) => v / H), alphas: SHADE.a } }));
  };
  measure();
  if (document.fonts) document.fonts.ready.then(measure);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(hero);
}

/* ------------------------------------------------------------------ the steam (after first paint) */
function initSteam() {
  const stage = $('#steam-stage'), toggle = $('#steam-toggle');
  if (!stage || EMBED) return;
  const conn = navigator.connection;
  if ((conn && conn.saveData) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2)) return;
  const go = () => {
    import('./steam.js')
      .then((m) => m.mountSteam(stage, { img: $('.hero__img', stage), toggle, reduced: reducedMotion(), store }))
      .catch((err) => { console.warn('Steam unavailable:', err && err.message); });
  };
  const idle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 300));
  // after load and an idle moment, and only once the hero is on screen (a visit that lands
  // further down, from Back or a link, sets it up when the visitor scrolls up to it)
  const whenSeen = (fn) => {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect(); idle(fn);
    });
    io.observe(stage);
  };
  if (document.readyState === 'complete') idle(() => whenSeen(go));
  else window.addEventListener('load', () => idle(() => whenSeen(go)), { once: true });
}

/* ------------------------------------------------------------------ the menu card */
function initMenu() {
  const card = $('#menu-card');
  if (!card) return;

  // the dated header: the menu changes on Tuesdays, when we reopen after Monday
  const back = (TODAY.getUTCDay() + 7 - 2) % 7;
  const tue = addDays(TODAY, -back);
  const t = $('#menu-date');
  t.dateTime = isoOf(tue);
  t.textContent = fmtDay(isoOf(tue));

  // filters: dishes must match every chosen mark (vegan counts as vegetarian)
  const chips = $$('.chip', card);
  const dishes = $$('.courses .dish', card);
  const count = $('#filters-count');
  const empty = $('#courses-empty');
  const apply = () => {
    const on = chips.filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.filter);
    let shown = 0;
    dishes.forEach((d) => {
      const marks = d.dataset.diet.split(' ');
      const ok = on.every((f) => marks.includes(f));
      const was = !d.hidden;
      d.hidden = !ok;
      if (ok) { shown++; if (!was) arrive(d); }
    });
    $$('.course', card).forEach((c) => { if (c.closest('.wine')) return; c.hidden = !$$('.dish', c).some((d) => !d.hidden); });
    empty.hidden = shown > 0;
    if (!on.length) count.textContent = `All ${dishes.length} dishes`;
    else count.textContent = `${shown} of ${dishes.length} dishes`;
    store.set('filters', on);
  };
  chips.forEach((c) => c.addEventListener('click', () => {
    c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'));
    apply();
  }));
  const saved = store.get('filters');
  if (Array.isArray(saved) && saved.length) { chips.forEach((c) => c.setAttribute('aria-pressed', String(saved.includes(c.dataset.filter)))); apply(); }

  // the dotted leaders run out to the price as each line arrives
  if (!reducedMotion()) {
    $$('.dish', card).forEach((row) => {
      row.style.setProperty('--lp', '0');
      start(row, {
        start: 0.97, end: 0.78, anchor: 0, duration: 650, minDuration: 450,
        onProgress: (p) => row.style.setProperty('--lp', (1 - Math.pow(1 - p, 3)).toFixed(4)),
      });
    });
  }
}

/* ------------------------------------------------------------------ table booking */
function initBooking() {
  const form = $('#booking');
  if (!form) return;
  const cal = $('#b-cal'), times = $('#b-times'), timeHint = $('#b-time-hint');
  const summary = $('#b-summary');
  const name = $('#b-name'), email = $('#b-email'), notes = $('#b-notes');
  const confirm = $('#b-confirm');
  const updNotes = counter(notes, $('#b-notes-count'));
  const guests = stepper($('[data-stepper]', form), (v, init) => { if (!init) sum(); });
  form.setAttribute('tabindex', '-1');

  const days = Array.from({ length: 30 }, (_, i) => addDays(TODAY, i));
  const slotsFor = (date) => {
    const svc = serviceFor(date);
    if (!svc) return { svc: null, slots: [] };
    let slots = svc.slots;
    if (isoOf(date) === NOW.iso) slots = slots.filter((s) => toMins(s) >= NOW.mins + 60);
    return { svc, slots };
  };

  // the calendar: native radios laid out as weeks; closed days are disabled and say why
  const FMT_SHORT_MONTH = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });
  const FMT_MONTH_ONLY = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' });
  const build = () => {
    const frag = document.createDocumentFragment();
    const first = days[0], lastDay = days[days.length - 1];
    const head = document.createElement('p'); head.className = 'cal__month';
    head.textContent = first.getUTCMonth() === lastDay.getUTCMonth() ? FMT_MONTH_ONLY.format(first) : `${FMT_MONTH_ONLY.format(first)} and ${FMT_MONTH_ONLY.format(lastDay)}`;
    frag.append(head);
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((d) => { const s = document.createElement('span'); s.className = 'cal__dow'; s.setAttribute('aria-hidden', 'true'); s.textContent = d; frag.append(s); });
    const lead = (first.getUTCDay() + 6) % 7;
    for (let k = lead; k > 0; k--) {
      const past = addDays(first, -k);
      const b = document.createElement('span'); b.className = 'cal__past'; b.setAttribute('aria-hidden', 'true');
      b.textContent = String(past.getUTCDate());
      frag.append(b);
    }
    days.forEach((date, i) => {
      const iso = isoOf(date);
      const { svc, slots } = slotsFor(date);
      const closed = !svc, gone = svc && !slots.length;
      const label = document.createElement('label');
      label.className = 'cal__day' + (i === 0 ? ' is-today' : '');
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'b-date'; input.value = iso;
      input.disabled = closed || gone;
      const face = document.createElement('span'); face.className = 'cal__face';
      const num = document.createElement('span'); num.setAttribute('aria-hidden', 'true'); num.textContent = String(date.getUTCDate());
      if (date.getUTCDate() === 1 && i > 0) { const m = document.createElement('b'); m.textContent = FMT_SHORT_MONTH.format(date); num.append(m); }
      face.append(num);
      let note = '';
      if (closed) note = 'closed';
      else if (gone) note = 'full';
      else if (date.getUTCDay() === 0) note = 'lunch';
      else if (i === 0) note = 'today';
      if (note) { const sm = document.createElement('small'); sm.setAttribute('aria-hidden', 'true'); sm.textContent = note; face.append(sm); }
      const sr = document.createElement('span'); sr.className = 'vh';
      sr.textContent = `${i === 0 ? 'Today, ' : ''}${fmtDay(iso)}${closed ? ', closed' : gone ? ', no more tables today' : date.getUTCDay() === 0 ? ', lunch only' : ''}`;
      face.append(sr);
      label.append(input, face);
      frag.append(label);
    });
    const tail = (7 - ((lead + days.length) % 7)) % 7;
    for (let k = 0; k < tail; k++) { const b = document.createElement('span'); b.className = 'cal__blank'; b.setAttribute('aria-hidden', 'true'); frag.append(b); }
    cal.replaceChildren(frag);
  };
  build();

  const selected = (n) => { const r = $(`input[name="${n}"]:checked`, form); return r ? r.value : ''; };
  const renderTimes = (keep) => {
    const iso = selected('b-date');
    times.replaceChildren();
    if (!iso) { timeHint.textContent = 'Choose a date first.'; return; }
    const date = dayOf(iso);
    const { svc, slots } = slotsFor(date);
    const isToday = iso === NOW.iso;
    timeHint.textContent = `${svc.name}, ${fmtDay(iso)}.${isToday && slots.length < svc.slots.length ? ' Later times only, as it’s today.' : ''}`;
    slots.forEach((s) => {
      const l = document.createElement('label'); l.className = 'time';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'b-time'; input.value = s;
      if (s === keep) input.checked = true;
      const span = document.createElement('span'); span.textContent = fmtTime(s);
      l.append(input, span); times.append(l);
    });
  };
  function sum() {
    const iso = selected('b-date'), tm = selected('b-time');
    const g = guests.value;
    const who = `A table for ${g}`;
    if (!iso) summary.textContent = `${who}. Choose a date and a time.`;
    else if (!tm) summary.textContent = `${who} on ${fmtDay(iso)}. Now choose a time.`;
    else summary.textContent = `${who} on ${fmtDay(iso)} at ${fmtTime(tm)}.`;
  }
  cal.addEventListener('change', () => {
    renderTimes(selected('b-time'));
    showError(null, $('#b-date-err'), '');
    sum();
  });
  times.addEventListener('change', () => { showError(null, $('#b-time-err'), ''); sum(); });
  name.addEventListener('input', () => { if (name.getAttribute('aria-invalid') === 'true' && name.value.trim()) showError(name, $('#b-name-err'), ''); });
  email.addEventListener('input', () => { if (email.getAttribute('aria-invalid') === 'true' && EMAIL_RE.test(email.value.trim())) showError(email, $('#b-email-err'), ''); });
  sum();

  const showConfirm = (b, moveFocus) => {
    $('#b-ref').textContent = b.ref;
    const d = dayOf(b.date);
    const diff = Math.round((d - TODAY) / 86400000);
    $('#b-confirm-title').textContent = diff === 0 ? 'See you tonight' : diff === 1 ? 'See you tomorrow' : `See you on ${FMT_WEEKDAY.format(d)}`;
    if (diff === 0 && d.getUTCDay() === 0) $('#b-confirm-title').textContent = 'See you at lunch';
    fillList($('#b-confirm-list'), [
      ['Guests', String(b.guests)],
      ['Date', fmtDay(b.date)],
      ['Time', fmtTime(b.time)],
      ['Name', b.name],
      ['Email', b.email],
      ['Requests', b.notes],
    ]);
    if (moveFocus) swap(form, confirm, confirm);
    else { form.hidden = true; confirm.hidden = false; }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const errs = [];
    const iso = selected('b-date'), tm = selected('b-time');
    showError(null, $('#b-date-err'), iso ? '' : 'Choose a date. Mondays are closed.');
    if (!iso) errs.push($('input[name="b-date"]:not(:disabled)', form));
    showError(null, $('#b-time-err'), !iso || tm ? '' : 'Choose a time.');
    if (iso && !tm) errs.push($('input[name="b-time"]', form));
    const nm = name.value.trim();
    showError(name, $('#b-name-err'), nm ? '' : 'Tell us the name for the booking.');
    if (!nm) errs.push(name);
    const em = email.value.trim();
    const emErr = !em ? 'Add an email address for the confirmation.' : EMAIL_RE.test(em) ? '' : 'Check the email address. It should look like name@example.com.';
    showError(email, $('#b-email-err'), emErr);
    if (emErr) errs.push(email);
    if (errs.length) { errs[0].focus(); return; }
    const b = { ref: makeCode([5]), guests: guests.value, date: iso, time: tm, name: nm, email: em, notes: notes.value.trim() };
    store.set('booking', b);
    showConfirm(b, true);
  });

  $('#b-change').addEventListener('click', () => {
    const b = store.get('booking');
    if (b) {
      guests.set(b.guests);
      const d = $(`input[name="b-date"][value="${b.date}"]`, form);
      if (d && !d.disabled) { d.checked = true; renderTimes(b.time); }
      name.value = b.name; email.value = b.email; notes.value = b.notes || ''; updNotes(); sum();
    }
    swap(confirm, form, form);
  });
  $('#b-again').addEventListener('click', () => {
    store.del('booking');
    form.reset(); guests.set(2); renderTimes(''); updNotes(); sum();
    $$('.err', form).forEach((el) => { el.hidden = true; });
    $$('[aria-invalid]', form).forEach((el) => el.setAttribute('aria-invalid', 'false'));
    swap(confirm, form, form);
  });

  const saved = store.get('booking');
  if (saved && saved.date && saved.date >= NOW.iso) showConfirm(saved, false);
}

/* ------------------------------------------------------------------ private dining */
function initPrivate() {
  const form = $('#private-form');
  if (!form) return;
  const chairsG = $('#plan-chairs'), countEl = $('#plan-count');
  const confirm = $('#pd-confirm');
  const date = $('#pd-date'), name = $('#pd-name'), email = $('#pd-email'), notes = $('#pd-notes');
  const updNotes = counter(notes, $('#pd-notes-count'));
  form.setAttribute('tabindex', '-1');
  const WORDS = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

  // twelve chairs around the long table; they fill from the middle outwards
  const NS = 'http://www.w3.org/2000/svg';
  const spots = [];
  [144, 212, 280, 348, 416].forEach((x, i) => { spots.push({ id: `t${i}`, x: x - 15, y: 86, w: 30, h: 22 }); spots.push({ id: `b${i}`, x: x - 15, y: 192, w: 30, h: 22 }); });
  spots.push({ id: 'l', x: 78, y: 135, w: 22, h: 30 }, { id: 'r', x: 460, y: 135, w: 22, h: 30 });
  const ORDER = ['t2', 'b2', 't1', 'b1', 't3', 'b3', 't0', 'b0', 't4', 'b4', 'l', 'r'];
  const chairEls = {};
  spots.forEach((s) => {
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', s.x); r.setAttribute('y', s.y); r.setAttribute('width', s.w); r.setAttribute('height', s.h); r.setAttribute('rx', 4);
    r.setAttribute('pathLength', '1'); r.setAttribute('class', 'plan__chair');
    chairsG.append(r); chairEls[s.id] = r;
  });
  const paint = (n) => {
    ORDER.forEach((id, i) => chairEls[id].classList.toggle('is-on', i < n));
    countEl.textContent = String(n);
  };
  const guests = stepper($('[data-stepper]', form), paint);

  // the plan draws itself in line as it arrives
  const svg = $('#plan-svg');
  if (!reducedMotion()) {
    svg.style.setProperty('--draw', '0');
    start($('.plan'), { start: 0.92, end: 0.5, anchor: 0, duration: 1600, minDuration: 900, onProgress: (p) => svg.style.setProperty('--draw', p.toFixed(4)) });
  }

  // dates: from tomorrow, up to a year ahead
  date.min = isoOf(addDays(TODAY, 1));
  date.max = isoOf(addDays(TODAY, 365));
  const meal = () => { const r = $('input[name="pd-meal"]:checked', form); return r ? r.value : 'Dinner'; };
  const checkDate = () => {
    const v = date.value;
    if (!v) return 'Choose a date.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v < date.min || v > date.max) return 'Choose a date from tomorrow to a year ahead.';
    const dow = dayOf(v).getUTCDay();
    if (meal() === 'Sunday lunch' && dow !== 0) return 'Sunday lunch is on Sundays. Choose a Sunday, or switch to dinner.';
    if (meal() === 'Dinner' && (dow === 0 || dow === 1)) return 'Dinner is Tuesday to Saturday. Choose one of those days, or switch to Sunday lunch.';
    return '';
  };
  const recheck = () => { if (date.getAttribute('aria-invalid') === 'true') showError(date, $('#pd-date-err'), checkDate()); };
  date.addEventListener('change', recheck);
  form.addEventListener('change', (e) => { if (e.target.name === 'pd-meal') recheck(); });
  name.addEventListener('input', () => { if (name.getAttribute('aria-invalid') === 'true' && name.value.trim()) showError(name, $('#pd-name-err'), ''); });
  email.addEventListener('input', () => { if (email.getAttribute('aria-invalid') === 'true' && EMAIL_RE.test(email.value.trim())) showError(email, $('#pd-email-err'), ''); });

  const showConfirm = (q, moveFocus) => {
    $('#pd-confirm-lede').textContent = `Thank you, ${q.name}. This is the enquiry we’d receive, for ${WORDS[q.guests]} guests in the back room.`;
    fillList($('#pd-confirm-list'), [
      ['Guests', String(q.guests)],
      ['Meal', q.meal],
      ['Date', fmtDay(q.date)],
      ['Occasion', q.occasion],
      ['Name', q.name],
      ['Email', q.email],
      ['Notes', q.notes],
    ]);
    if (moveFocus) swap(form, confirm, confirm); else { form.hidden = true; confirm.hidden = false; }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const errs = [];
    const dErr = checkDate(); showError(date, $('#pd-date-err'), dErr); if (dErr) errs.push(date);
    const nm = name.value.trim(); showError(name, $('#pd-name-err'), nm ? '' : 'Tell us your name.'); if (!nm) errs.push(name);
    const em = email.value.trim();
    const emErr = !em ? 'Add an email address so we can reply.' : EMAIL_RE.test(em) ? '' : 'Check the email address. It should look like name@example.com.';
    showError(email, $('#pd-email-err'), emErr); if (emErr) errs.push(email);
    if (errs.length) { errs[0].focus(); return; }
    const occ = $('input[name="pd-occasion"]:checked', form);
    const q = { guests: guests.value, meal: meal(), date: date.value, occasion: occ ? occ.value : '', name: nm, email: em, notes: notes.value.trim() };
    store.set('private', q);
    showConfirm(q, true);
  });
  $('#pd-change').addEventListener('click', () => { swap(confirm, form, form); });

  const saved = store.get('private');
  if (saved && saved.date) {
    guests.set(saved.guests); date.value = saved.date; name.value = saved.name; email.value = saved.email; notes.value = saved.notes || ''; updNotes();
    const m = $(`input[name="pd-meal"][value="${saved.meal}"]`, form); if (m) m.checked = true;
    const o = saved.occasion && $(`input[name="pd-occasion"][value="${saved.occasion}"]`, form); if (o) o.checked = true;
    showConfirm(saved, false);
  }
}

/* ------------------------------------------------------------------ gift vouchers */
function initVouchers() {
  const form = $('#voucher-form');
  if (!form) return;
  const confirm = $('#v-confirm');
  const otherWrap = $('#v-other-wrap'), other = $('#v-other');
  const to = $('#v-to'), from = $('#v-from'), msg = $('#v-msg'), email = $('#v-email'), date = $('#v-date');
  const dateWrap = $('#v-date-wrap'), emailLabel = $('#v-email-label');
  const ticket = $('#ticket'), tAmount = $('#t-amount'), tFor = $('#t-for'), tMsg = $('#t-msg'), tFrom = $('#t-from'), tCode = $('#t-code');
  const summary = $('#v-summary');
  const updMsg = counter(msg, $('#v-msg-count'));
  form.setAttribute('tabindex', '-1');
  date.min = NOW.iso; date.max = isoOf(addDays(TODAY, 365));

  const amountChoice = () => { const r = $('input[name="v-amount"]:checked', form); return r ? r.value : '75'; };
  const sendTo = () => { const r = $('input[name="v-send"]:checked', form); return r ? r.value : 'me'; };
  const otherValue = () => { const v = other.value.trim(); return /^\d{1,3}$/.test(v) ? Number(v) : NaN; };
  const amount = () => (amountChoice() === 'other' ? otherValue() : Number(amountChoice()));
  const otherErr = () => {
    const v = other.value.trim();
    if (!v) return 'Type an amount from £25 to £500.';
    const n = otherValue();
    if (!Number.isFinite(n)) return 'Use whole pounds, numbers only.';
    if (n < 25) return 'The smallest voucher is £25.';
    if (n > 500) return 'The largest voucher is £500.';
    return '';
  };

  let lastAmt = '';
  const render = () => {
    const isOther = amountChoice() === 'other';
    otherWrap.hidden = !isOther;
    const n = amount();
    const valid = Number.isFinite(n) && n >= 25 && n <= 500;
    const amt = valid ? `£${n}` : '£…';
    if (amt !== lastAmt) {
      tAmount.textContent = amt;
      if (lastAmt && !reducedMotion()) { ticket.classList.remove('is-bump'); void ticket.offsetWidth; ticket.classList.add('is-bump'); }
      lastAmt = amt;
    }
    tFor.textContent = to.value.trim() ? `For ${to.value.trim()}` : 'For someone';
    tFrom.textContent = from.value.trim() ? `From ${from.value.trim()}` : 'From you';
    tMsg.textContent = msg.value.trim() || 'Your note will appear here.';
    tMsg.classList.toggle('is-empty', !msg.value.trim());
    const them = sendTo() === 'them';
    dateWrap.hidden = !them;
    emailLabel.textContent = them ? 'Their email' : 'Your email';
    if (them && !date.value) date.value = NOW.iso;
    const forWhom = to.value.trim() ? ` for ${to.value.trim()}` : '';
    const when = them ? (date.value && date.value !== NOW.iso ? ` on ${fmtDay(date.value)}` : ' today') : '';
    summary.textContent = `A ${valid ? amt : 'voucher'}${valid ? ' voucher' : ''}${forWhom}, emailed to ${them ? 'them' : 'you'}${when}.`;
  };
  form.addEventListener('input', render);
  form.addEventListener('change', (e) => {
    if (e.target.name === 'v-amount' && e.target.value === 'other') { render(); other.focus(); return; }
    render();
  });
  other.addEventListener('input', () => { other.value = other.value.replace(/[^\d]/g, '').slice(0, 3); if (other.getAttribute('aria-invalid') === 'true') showError(other, $('#v-other-err'), otherErr()); render(); });
  [[to, '#v-to-err'], [from, '#v-from-err']].forEach(([el, sel]) => el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true' && el.value.trim()) showError(el, $(sel), ''); }));
  email.addEventListener('input', () => { if (email.getAttribute('aria-invalid') === 'true' && EMAIL_RE.test(email.value.trim())) showError(email, $('#v-email-err'), ''); });
  render();

  const showConfirm = (v, moveFocus) => {
    $('#v-code').textContent = v.code;
    tCode.textContent = v.code;
    fillList($('#v-confirm-list'), [
      ['Amount', `£${v.amount}`],
      ['For', v.to],
      ['From', v.from],
      ['Note', v.msg],
      ['Emailed to', v.send === 'them' ? `${v.email}, ${v.date === NOW.iso ? 'today' : 'on ' + fmtDay(v.date)}` : `${v.email} (you)`],
    ]);
    if (moveFocus) swap(form, confirm, confirm); else { form.hidden = true; confirm.hidden = false; }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const errs = [];
    if (amountChoice() === 'other') { const er = otherErr(); showError(other, $('#v-other-err'), er); if (er) errs.push(other); }
    const tv = to.value.trim(); showError(to, $('#v-to-err'), tv ? '' : 'Add the name for the voucher.'); if (!tv) errs.push(to);
    const fv = from.value.trim(); showError(from, $('#v-from-err'), fv ? '' : 'Add who it’s from.'); if (!fv) errs.push(from);
    const em = email.value.trim();
    const emErr = !em ? (sendTo() === 'them' ? 'Add their email address.' : 'Add your email address.') : EMAIL_RE.test(em) ? '' : 'Check the email address. It should look like name@example.com.';
    showError(email, $('#v-email-err'), emErr); if (emErr) errs.push(email);
    if (sendTo() === 'them') {
      const dv = date.value;
      const dErr = !dv ? 'Choose the day it’s sent.' : dv < date.min || dv > date.max ? 'Choose a day from today to a year ahead.' : '';
      showError(date, $('#v-date-err'), dErr); if (dErr) errs.push(date);
    }
    if (errs.length) { errs[0].focus(); return; }
    const v = { code: makeCode([4, 4]), amount: amount(), to: tv, from: fv, msg: msg.value.trim(), send: sendTo(), email: em, date: sendTo() === 'them' ? date.value : '' };
    store.set('voucher', v);
    showConfirm(v, true);
  });
  $('#v-again').addEventListener('click', () => {
    store.del('voucher');
    form.reset(); lastAmt = ''; date.value = ''; updMsg(); render();
    tCode.textContent = 'SM-····-····';
    $$('.err', form).forEach((el) => { el.hidden = true; });
    $$('[aria-invalid]', form).forEach((el) => el.setAttribute('aria-invalid', 'false'));
    swap(confirm, form, form);
  });

  const saved = store.get('voucher');
  if (saved && saved.code) {
    const r = $(`input[name="v-amount"][value="${saved.amount}"]`, form);
    if (r) r.checked = true; else { $('input[name="v-amount"][value="other"]', form).checked = true; other.value = String(saved.amount); }
    to.value = saved.to; from.value = saved.from; msg.value = saved.msg || ''; email.value = saved.email; updMsg();
    const s = $(`input[name="v-send"][value="${saved.send}"]`, form); if (s) s.checked = true;
    if (saved.date) date.value = saved.date;
    render();
    showConfirm(saved, false);
  }
}

/* ------------------------------------------------------------------ open now, today's hours */
function initVisit() {
  const el = $('#open-now');
  const rows = $$('#hours-list > div');
  const dow = TODAY.getUTCDay();
  rows.forEach((r) => r.classList.toggle('is-today', Number(r.dataset.day) === dow));
  const update = () => {
    const now = londonNow();
    const today = dayOf(now.iso);
    const svc = serviceFor(today);
    let text = '', open = false;
    if (svc && now.mins >= svc.open && now.mins < svc.close) {
      open = true;
      text = `Open now for ${svc.name === 'Dinner' ? 'dinner' : 'Sunday lunch'}, until ${fmtTime(`${Math.floor(svc.close / 60)}:${String(svc.close % 60).padStart(2, '0')}`)}.`;
    } else if (svc && now.mins < svc.open) {
      text = `Closed now. ${svc.name === 'Dinner' ? 'Dinner' : 'Lunch'} from ${fmtTime(svc.slots[0])} today.`;
    } else {
      for (let i = 1; i <= 7; i++) {
        const d = addDays(today, i), s = serviceFor(d);
        if (!s) continue;
        const when = i === 1 ? 'tomorrow' : `on ${FMT_WEEKDAY.format(d)}`;
        text = `Closed now. ${s.name === 'Dinner' ? 'Dinner' : 'Sunday lunch'} ${when} from ${fmtTime(s.slots[0])}.`;
        break;
      }
    }
    el.textContent = text;
    el.classList.toggle('is-open', open);
  };
  update();
  setInterval(update, 60000);

  if (!reducedMotion()) {
    rows.forEach((row) => {
      row.style.setProperty('--lp', '0');
      start(row, { start: 0.96, end: 0.8, anchor: 0, duration: 600, minDuration: 420, onProgress: (p) => row.style.setProperty('--lp', (1 - Math.pow(1 - p, 3)).toFixed(4)) });
    });
  }
}

/* ------------------------------------------------------------------ arrivals */
function initFades() {
  if (EMBED) return;
  fadeUp([
    ...$$('.book__intro > *'), $('.book__panel'),
    ...$$('.private__intro > *'), $('.private__panel'),
    ...$$('.vouchers__intro > *'), $('.voucher-preview'), $('.vouchers__panel'),
    ...$$('.visit__intro > *'), $('.hours'),
  ].filter(Boolean), { trigger: 0.96 });
}

/* ------------------------------------------------------------------ go */
mountRibbon({ name: 'Saltmarsh' });
[initBar, initShade, initHeadline, initMenu, initBooking, initPrivate, initVouchers, initVisit, initFades, initSteam].forEach((fn) => {
  try { fn(); } catch (err) { console.error(err); }
});
