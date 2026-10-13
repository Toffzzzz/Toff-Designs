/*
 * Hart & Sons: the instant quote (signature, part one).
 * Four questions; the docket builds the price line by line from the price list, with the
 * call-out fee first. Labour is £60 an hour (the emergency rate's hourly price); a booked
 * visit has no call-out fee; an emergency adds the £120 call-out. Fixed prices stay fixed.
 * Only new lines animate in, and the amounts count to their value; reduced motion shows
 * the result at once. Any answer interrupts whatever is moving.
 */
import { penceText, londonNow } from '../../../assets/shared/embed-api.js';
import { store, save } from './store.js';
import { onReset, goBook } from './booking.js';

const RATE = 6000;            // pence an hour
const CALLOUT = 12000;        // emergency call-out
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const SIZES = {
  flat: 'A flat or maisonette',
  house: 'A house, up to 3 bedrooms',
  large: 'A house, 4 bedrooms or more',
};

// hours: [min, max]; parts in pence; sizeHours: extra hours by size.
const JOBS = {
  service: { label: 'Boiler service', fixed: 9500, fixedNote: 'From the price list. The same for any size of home.', noToday: 'A service is booked ahead, so it can’t be an emergency.' },
  heating: { label: 'Finding and fixing the fault', hours: [1, 2], parts: [0, 15000], partsNote: 'Only if a part needs replacing',
    sizeHours: { flat: [0, 0], house: [0, 0.5], large: [0.5, 1] }, sizeWhy: 'More radiators to check once it’s running' },
  leak: { label: 'Finding and fixing the leak', hours: [1, 2], parts: [500, 4000], partsNote: 'Fittings and a length of pipe' },
  radiators: { label: 'Bleeding and balancing the radiators', hours: [1, 1.5], parts: [0, 2000], partsNote: 'Only if a valve needs replacing',
    sizeHours: { flat: [0, 0], house: [0.5, 1], large: [1.5, 2] }, sizeWhy: 'More radiators to bleed and balance' },
  taps: { label: 'Fixing the tap, toilet or shower', hours: [1, 1.5], parts: [1000, 8000], partsNote: 'Washers, cartridges or a fill valve' },
  bigger: { label: 'Something bigger', quoteVisit: true, noToday: 'A quote visit is booked ahead, so it can’t be an emergency.' },
};

const EXTRAS = {
  co_alarm: { label: 'Carbon monoxide alarm, fitted', price: { any: [3500, 3500] } },
  filter: { label: 'Magnetic boiler filter, fitted', price: { any: [14000, 18000] } },
  flush: { label: 'Power flush of the heating', price: { flat: [35000, 42000], house: [42000, 52000], large: [52000, 65000], any: [35000, 65000] },
    note: { flat: 'For a flat or maisonette', house: 'For a house up to 3 bedrooms', large: 'For a house with 4 bedrooms or more', any: 'Depends on the size of your home' } },
};

const half = (h) => {
  const whole = Math.floor(h);
  const frac = h - whole > 0 ? '½' : '';
  return whole === 0 && frac ? '½' : `${whole}${frac}`;
};
function hoursText([a, b]) {
  if (a === b) return a === 1 ? 'About an hour' : `About ${half(a)} hours`;
  return `About ${half(a)} to ${half(b)} hours`;
}
const money = (p) => penceText(Math.round(p / 100) * 100);
function rangeText([a, b]) { return a === b ? money(a) : `${money(a)}–${money(b)}`; }

/** The docket's lines for a set of answers. Each: { key, what, note, range: [min, max] | null, text } */
export function linesFor({ job, size, soon, extras }) {
  const lines = [];
  const j = JOBS[job];
  if (!soon) {
    lines.push({ key: 'callout', what: 'Call-out fee', note: 'None for a booked visit. £120 for an emergency, then £60 an hour.', range: null, text: 'from £0' });
  } else if (soon === 'today') {
    lines.push({ key: 'callout:today', what: 'Emergency call-out', note: 'Then £60 an hour for the work', range: [CALLOUT, CALLOUT] });
  } else {
    lines.push({ key: 'callout:booked', what: 'Booked visit', note: 'No call-out fee, Monday to Saturday', range: [0, 0] });
  }
  if (j) {
    if (j.fixed) lines.push({ key: `job:${job}`, what: j.label, note: j.fixedNote, range: [j.fixed, j.fixed] });
    else if (j.quoteVisit) lines.push({ key: `job:${job}`, what: 'Something bigger', note: 'Too big to price from a list, so we come and look first', range: null, text: 'Free visit' });
    else {
      lines.push({ key: `job:${job}`, what: j.label, note: `${hoursText(j.hours)} at £60 an hour`, range: [j.hours[0] * RATE, j.hours[1] * RATE] });
      lines.push({ key: `parts:${job}`, what: 'Parts', note: j.partsNote, range: j.parts.slice() });
    }
  }
  if (size) {
    const extra = j && j.sizeHours ? j.sizeHours[size] : null;
    if (!j) lines.push({ key: `size:${size}`, what: SIZES[size], note: 'Changes the price of some jobs', range: null, text: 'to follow' });
    else if (extra && extra[1] > 0) lines.push({ key: `size:${size}:${job}`, what: SIZES[size], note: `${j.sizeWhy}, ${hoursText(extra).toLowerCase()} more`, range: [extra[0] * RATE, extra[1] * RATE] });
    else lines.push({ key: `size:${size}:${job}`, what: SIZES[size], note: 'Doesn’t change the price of this job', range: [0, 0] });
  }
  for (const x of extras) {
    const e = EXTRAS[x];
    if (!e) continue;
    const k = e.price[size] ? size : 'any';
    lines.push({ key: `extra:${x}:${k}`, what: e.label, note: e.note ? e.note[k] : (j && j.quoteVisit ? 'We’ll add it to your quote' : ''), range: e.price[k].slice() });
  }
  return lines;
}

export function totalFor(answers, lines) {
  const j = JOBS[answers.job];
  if (!j) return { words: 'Answer the questions' };
  let min = 0, max = 0;
  for (const l of lines) if (l.range) { min += l.range[0]; max += l.range[1]; }
  if (j.quoteVisit) {
    const extra = lines.filter((l) => l.key.startsWith('extra:'));
    if (!extra.length) return { words: 'Free quote visit' };
    return { words: `Free quote visit, plus ${rangeText([min, max])}` };
  }
  return { range: [min, max], partial: !answers.soon };
}

/* ── The interface ───────────────────────────────────────────────────────── */

let formEl, listEl, totalEl, liveEl, whyEl, bookEl;
const shown = new Map();      // key -> { li, amountEl, value: [min, max] }
let totalShown = null;        // [min, max] currently on screen
const tweens = new Set();
let liveTimer = 0;

function stopTweens() { for (const t of tweens) cancelAnimationFrame(t.raf); tweens.clear(); }

function tween(from, to, ms, draw) {
  if (reduce() || ms <= 0) { draw(to); return; }
  const t = { raf: 0 };
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    const e = 1 - Math.pow(1 - k, 5);
    draw([from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e]);
    if (k < 1) t.raf = requestAnimationFrame(step); else tweens.delete(t);
  };
  t.raf = requestAnimationFrame(step);
  tweens.add(t);
}

function lineEl(l) {
  const li = document.createElement('li');
  li.className = 'line';
  li.dataset.key = l.key;
  const what = document.createElement('span');
  what.className = 'line__what';
  what.textContent = l.what;
  if (l.note) {
    const note = document.createElement('span');
    note.className = 'line__note';
    note.textContent = l.note;
    what.append(note);
  }
  const amount = document.createElement('span');
  amount.className = 'line__amount num-wide';
  li.append(what, amount);
  return { li, amount };
}

function render({ animate = true } = {}) {
  const answers = store.iq;
  const lines = linesFor(answers);
  const total = totalFor(answers, lines);
  stopTweens();
  const keep = new Set(lines.map((l) => l.key));
  for (const [key, s] of shown) if (!keep.has(key)) { s.li.remove(); shown.delete(key); }

  let newIndex = 0;
  let prev = null;
  for (const l of lines) {
    let s = shown.get(l.key);
    const isNew = !s;
    if (isNew) {
      const made = lineEl(l);
      s = { li: made.li, amountEl: made.amount, value: null };
      shown.set(l.key, s);
      if (animate && !reduce()) {
        s.li.classList.add('is-new');
        s.li.style.setProperty('--i', String(newIndex++));
        s.li.addEventListener('animationend', () => { s.li.classList.remove('is-new'); s.li.style.removeProperty('--i'); }, { once: true });
      }
    }
    // keep the order of `lines`
    const want = prev ? prev.nextSibling : listEl.firstChild;
    if (want !== s.li) listEl.insertBefore(s.li, want);
    prev = s.li;

    if (l.range) {
      const from = s.value || [0, 0];
      const to = l.range;
      const amountEl = s.amountEl;
      const delay = isNew && animate ? (newIndex - 1) * 70 : 0;
      const run = () => tween(from, to, animate ? 520 : 0, (v) => { amountEl.textContent = rangeText(v); });
      if (delay && !reduce()) { amountEl.textContent = rangeText(from); setTimeout(run, delay); } else run();
      s.value = to.slice();
    } else {
      s.amountEl.textContent = l.text || '';
      s.value = null;
    }
  }

  // The total.
  if (total.words) {
    totalEl.classList.add('is-words');
    totalEl.textContent = total.words;
    totalShown = null;
  } else {
    totalEl.classList.remove('is-words');
    const from = totalShown || [0, 0];
    const prefix = total.partial ? 'from ' : '';
    tween(from, total.range, animate ? 700 : 0, (v) => { totalEl.textContent = prefix + rangeText(v); });
    totalShown = total.range.slice();
  }

  // Say the total once things settle.
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => {
    liveEl.textContent = total.words ? total.words : `Guide total ${total.partial ? 'from ' : ''}${rangeText(total.range).replace('–', ' to ')}`;
  }, 700);

  // Today isn't possible for a service or a quote visit: say why beside it.
  const j = JOBS[answers.job];
  const today = formEl.querySelector('input[name="soon"][value="today"]');
  if (j && j.noToday) {
    today.disabled = true;
    whyEl.textContent = j.noToday;
    whyEl.hidden = false;
  } else {
    today.disabled = false;
    whyEl.hidden = true;
  }
  bookEl.textContent = answers.job ? 'Book a visit for this' : 'Book a visit';
}

function readForm() {
  const get = (name) => { const r = formEl.querySelector(`input[name="${name}"]:checked`); return r ? r.value : ''; };
  store.iq = {
    job: get('job'),
    size: get('size'),
    soon: get('soon'),
    extras: Array.from(formEl.querySelectorAll('input[name="extra"]:checked')).map((c) => c.value),
  };
  // A service or quote visit can't be "today".
  const j = JOBS[store.iq.job];
  if (j && j.noToday && store.iq.soon === 'today') {
    store.iq.soon = '';
    formEl.querySelector('input[name="soon"][value="today"]').checked = false;
  }
  save();
}

function applyForm() {
  for (const input of formEl.querySelectorAll('input')) {
    if (input.type === 'radio') input.checked = store.iq[input.name] === input.value;
    else input.checked = store.iq.extras.includes(input.value);
  }
}

export function initQuote() {
  formEl = document.querySelector('[data-quote-form]');
  const docket = document.querySelector('[data-docket]');
  if (!formEl || !docket) return;
  listEl = docket.querySelector('[data-docket-lines]');
  totalEl = docket.querySelector('[data-docket-total]');
  liveEl = docket.querySelector('[data-docket-live]');
  whyEl = formEl.querySelector('[data-soon-why]');
  bookEl = docket.querySelector('[data-quote-book]');
  listEl.replaceChildren();

  // Restore answers from this visit, if any (no animation for what was already there).
  if (!['job', 'size', 'soon'].every((k) => typeof store.iq[k] === 'string') || !Array.isArray(store.iq.extras)) {
    store.iq = { job: '', size: '', soon: '', extras: [] };
  }
  applyForm();
  render({ animate: false });

  formEl.addEventListener('change', () => { readForm(); render(); });
  formEl.addEventListener('submit', (e) => e.preventDefault());

  docket.querySelector('[data-quote-reset]').addEventListener('click', () => {
    store.iq = { job: '', size: '', soon: '', extras: [] };
    save();
    applyForm();
    render();
    const first = formEl.querySelector('input[name="job"]');
    if (first) first.focus();
  });

  bookEl.addEventListener('click', (e) => {
    const { job, soon } = store.iq;
    if (!job) return;   // a plain link to #book
    e.preventDefault();
    if (job === 'service') goBook({ job: 'boiler_service' });
    else if (soon === 'today') goBook({ job: 'emergency_callout', ...todayAsap() });
    else goBook({ job: 'quote_visit' });
  });

  onReset(() => {
    store.iq = { job: '', size: '', soon: '', extras: [] };
    applyForm();
    render({ animate: false });
  });
}

function todayAsap() { return { date: londonNow().date, window: 'asap' }; }
