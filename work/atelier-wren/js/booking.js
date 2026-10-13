/*
 * Atelier Wren: booking (service, then stylist, then day and time) and the salon's side of
 * Contract A (round-05-plan.md 10.6): find_free_times, hold_booking, get_state, reset.
 *
 * One store, one set of functions. The visitor's controls and the AI demo's actions both go
 * through selectService / selectStylist / selectDate / selectPart / hold(), so the page,
 * its sessionStorage and the state the parent sees are always the same. A demo: nothing is
 * sent anywhere; the selection, the hold and a confirmed booking live in sessionStorage only.
 */
import {
  serve, EmbedError, v, spotlight, isBusy, makeRef, londonNow, londonParts, londonToMs, nowMs,
  addDays, weekdayOf, dayLabel, timeText,
} from '../../../assets/shared/embed-api.js';
import {
  SERVICES, SERVICE_KEYS, STYLISTS, STYLIST_KEYS, HOURS, WEEK, WINDOW_DAYS, LEAD_MS, PATCH_MS, HOLD_S,
  PATCH_NOTE, priceText, toMin, fromMin, partOf, hoursText, PHONE, PHONE_TEL,
} from './data.js';

const KEY = 'wren.booking.v1';
const PARTS = ['any', 'morning', 'afternoon', 'evening'];
const PART_NAMES = { any: 'Any time', morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };
const $ = (sel, root = document) => root.querySelector(sel);

/* ── State ──────────────────────────────────────────────────────────────────── */

const blank = () => ({ service: null, stylist: 'any', date: null, part: 'any', slot: null, hold: null, booked: null, expired: null });
let state = blank();

function load() {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') state = { ...blank(), ...s };
  } catch { /* private mode: start blank */ }
  if (state.service && !SERVICES[state.service]) state.service = null;
  if (!STYLISTS[state.stylist] && state.stylist !== 'any') state.stylist = 'any';
  if (!PARTS.includes(state.part)) state.part = 'any';
  if (state.hold && !(state.hold.expiresMs > nowMs())) state.hold = null;
  const today = londonNow().date;
  if (state.date && (state.date < today || state.date > addDays(today, WINDOW_DAYS - 1))) { state.date = null; state.slot = null; }
}
function save() {
  try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked: the page still works */ }
}

/* ── Availability (Contract A) ──────────────────────────────────────────────── */

const today = () => londonNow().date;
const lastDay = () => addDays(today(), WINDOW_DAYS - 1);
const windowDates = () => Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(today(), i));

function starts(date, service) {
  const h = HOURS[weekdayOf(date)];
  if (!h) return [];
  const out = [], len = SERVICES[service].min;
  for (let m = toMin(h[0]); m + len <= toMin(h[1]); m += 30) out.push(fromMin(m));
  return out;
}
const held = (date, stylist, time) => {
  const h = state.hold;
  const b = state.booked;
  return !!((h && h.date === date && h.stylist === stylist && h.time === time) ||
    (b && b.date === date && b.stylist === stylist && b.time === time));
};
const leadOk = (date, time) => date !== today() || londonToMs(date, time) >= nowMs() + LEAD_MS;
const free = (date, stylist, time) => leadOk(date, time) && !isBusy(date, stylist, time) && !held(date, stylist, time);

/** Every free time on a date: [{ time, stylist }], one per time when stylist is 'any'. */
function freeTimes(service, stylist, date, part = 'any') {
  const out = [];
  for (const time of starts(date, service)) {
    if (part !== 'any' && partOf(time) !== part) continue;
    const who = stylist === 'any' ? STYLIST_KEYS.find((s) => free(date, s, time)) : (free(date, stylist, time) ? stylist : null);
    if (who) out.push({ time, stylist: who });
  }
  return out;
}

function slotOut(service, date, s) {
  return {
    date, day_label: dayLabel(date), time: s.time, time_text: timeText(s.time), stylist: s.stylist,
    stylist_name: STYLISTS[s.stylist], service, service_name: SERVICES[service].name,
    duration_min: SERVICES[service].min, price_text: priceText(service),
  };
}

function nextFree(service, stylist, date, part) {
  for (let d = addDays(date, 1); d <= lastDay(); d = addDays(d, 1)) {
    const list = freeTimes(service, stylist, d, part);
    if (list.length) return slotOut(service, d, list[0]);
  }
  return null;
}

function holdOut(h) {
  if (!h) return null;
  const { expiresMs, ...rest } = h;
  return { ...rest, expires_in_s: Math.max(0, Math.round((expiresMs - nowMs()) / 1000)) };
}

/* ── The actions (shared by the visitor and the AI demo) ────────────────────── */

const plural = (day) => `${day}s`;

function checkWindow(date) {
  if (date < today()) throw new EmbedError('too_soon', `${dayLabel(date)} has already passed.`);
  if (date > lastDay()) throw new EmbedError('too_far', `Appointments can be booked up to two weeks ahead, so the last day open now is ${dayLabel(lastDay())}.`);
}

function findFreeTimes({ service, stylist, date, part_of_day }) {
  checkWindow(date);
  const wd = weekdayOf(date);
  const closed = !HOURS[wd];
  const slots = closed ? [] : freeTimes(service, stylist, date, part_of_day).slice(0, 6).map((s) => slotOut(service, date, s));
  return {
    date, day_label: dayLabel(date), closed, slots,
    next_free: slots.length ? null : nextFree(service, stylist, date, part_of_day),
  };
}

function checkHold({ service, stylist, date, time }) {
  checkWindow(date);
  const wd = weekdayOf(date), h = HOURS[wd], svc = SERVICES[service];
  if (!h) throw new EmbedError('closed', `Atelier Wren is closed on ${plural(wd)}.`);
  if (toMin(time) < toMin(h[0]) || toMin(time) + svc.min > toMin(h[1])) {
    throw new EmbedError('closed', `On ${plural(wd)} Atelier Wren is open ${hoursText(wd)}, and a ${svc.name.toLowerCase()} takes ${svc.min} minutes, so it has to start by ${timeText(fromMin(toMin(h[1]) - svc.min))}.`);
  }
  const startMs = londonToMs(date, time);
  if (startMs < nowMs()) throw new EmbedError('too_soon', `${timeText(time)} on ${dayLabel(date)} has already passed.`);
  if (!leadOk(date, time)) throw new EmbedError('too_soon', 'Appointments on the same day need to start at least two hours from now.');
  if (service === 'full_colour' && startMs - nowMs() < PATCH_MS) {
    const p = londonParts(Math.ceil((nowMs() + PATCH_MS) / 1800e3) * 1800e3);
    throw new EmbedError('patch_test', `${PATCH_NOTE} A first colour can start from ${timeText(p.time)} on ${dayLabel(p.date)}.`);
  }
  if (!free(date, stylist, time) && !(state.hold && state.hold.date === date && state.hold.stylist === stylist && state.hold.time === time)) {
    throw new EmbedError('not_free', `${STYLISTS[stylist]} isn’t free at ${timeText(time)} on ${dayLabel(date)}.`);
  }
}

function holdBooking(a) {
  checkHold(a);
  const svc = SERVICES[a.service];
  const expiresMs = nowMs() + HOLD_S * 1000;
  const h = {
    hold_id: makeRef('AW'), name: 'Guest', service: a.service, service_name: svc.name, stylist: a.stylist,
    stylist_name: STYLISTS[a.stylist], date: a.date, day_label: dayLabel(a.date), time: a.time, time_text: timeText(a.time),
    duration_min: svc.min, price_text: priceText(a.service), expires_at: new Date(expiresMs).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    expires_in_s: HOLD_S, patch_test_note: a.service === 'full_colour' ? PATCH_NOTE : '',
    card_text: `Held for 10 minutes: ${svc.name.toLowerCase()}, ${weekdayOf(a.date)} ${timeText(a.time)} with ${STYLISTS[a.stylist]}`,
    expiresMs,
  };
  // a new hold releases the previous one; the page shows this one exactly as if the visitor had chosen it
  state.hold = h;
  state.booked = null;
  state.expired = null;
  state.service = a.service;
  if (state.stylist !== 'any' && state.stylist !== a.stylist) state.stylist = a.stylist;
  state.date = a.date;
  if (state.part !== 'any' && state.part !== partOf(a.time)) state.part = 'any';
  state.slot = { time: a.time, stylist: a.stylist };
  return holdOut(h);
}

/* ── The interface ──────────────────────────────────────────────────────────── */

let ui = null, api = null, quiet = false;

function announce(text) {
  if (!ui.status) return;
  ui.status.textContent = '';
  setTimeout(() => { ui.status.textContent = text; }, 30);
}
function changed() { save(); render(); if (api) api.notifyState(); }

// Keeps focus on the same control when a list is rebuilt by the visitor's own action.
function keepFocus(container, build) {
  const a = document.activeElement;
  const key = !quiet && a && container.contains(a) ? a.getAttribute('data-key') : null;
  build();
  if (key) { const again = container.querySelector(`[data-key="${CSS.escape(key)}"]`); if (again) again.focus(); }
}

export function selectService(key, { from = 'visitor' } = {}) {
  if (!SERVICES[key]) return;
  if (state.service !== key) { state.service = key; state.slot = null; }
  changed();
  if (from === 'visitor') announce(`${SERVICES[key].name} chosen: ${SERVICES[key].min} minutes, ${priceText(key)}.`);
}
export function selectStylist(key) {
  if (key !== 'any' && !STYLISTS[key]) return;
  if (state.stylist !== key) { state.stylist = key; state.slot = null; }
  changed();
}
export function selectDate(date) {
  if (state.date !== date) { state.date = date; state.slot = null; }
  changed();
  if (state.service) {
    const n = HOURS[weekdayOf(date)] ? freeTimes(state.service, state.stylist, date, state.part).length : -1;
    announce(n < 0 ? `Closed on ${plural(weekdayOf(date))}.` : n ? `${n} ${n === 1 ? 'time' : 'times'} free on ${dayLabel(date)}.` : `Nothing free on ${dayLabel(date)}.`);
  }
}
export function selectPart(part) {
  if (!PARTS.includes(part)) return;
  state.part = part;
  if (state.slot && part !== 'any' && partOf(state.slot.time) !== part) state.slot = null;
  changed();
}
function selectSlot(time, stylist) {
  state.slot = { time, stylist };
  state.expired = null;
  changed();
}
function release() {
  state.hold = null;
  changed();
  announce('The hold has been let go, and the time is free again.');
}
function confirm() {
  const h = state.hold;
  if (!h) return;
  state.booked = { ref: h.hold_id, service: h.service, stylist: h.stylist, date: h.date, time: h.time };
  state.hold = null;
  changed();
  announce(`Booked: ${h.service_name.toLowerCase()} on ${h.day_label} at ${h.time_text} with ${h.stylist_name}. Reference ${h.hold_id}.`);
}
export function reset() {
  state = blank();
  if (ui) ui.error.hidden = true;
  changed();
}

function holdFromVisitor() {
  if (!state.service || !state.date || !state.slot) return;
  try {
    holdBooking({ service: state.service, stylist: state.slot.stylist, date: state.date, time: state.slot.time });
    ui.error.hidden = true;
    changed();
    announce(state.hold.card_text + '.');
    const card = $('#book-held');
    if (card) card.focus({ preventScroll: true });
  } catch (err) {
    ui.error.textContent = err.message;
    ui.error.hidden = false;
    render();
  }
}

/* rendering */

function radio(name, value, checked, labelHtml, { extraClass = '', disabled = false, describedby = '' } = {}) {
  const id = `bk-${name}-${value.replace(/[^a-z0-9]/gi, '')}`;
  return `<label class="opt ${extraClass}" for="${id}"><input type="radio" id="${id}" name="${name}" value="${value}" data-key="${name}:${value}"${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}${describedby ? ` aria-describedby="${describedby}"` : ''}>${labelHtml}</label>`;
}

function renderCalendar() {
  const dates = windowDates();
  const first = dates[0];
  const lead = (WEEK.indexOf(weekdayOf(first)));   // blanks before today, Monday first
  let html = '';
  for (let i = 0; i < lead; i++) html += '<span class="cal__blank" aria-hidden="true"></span>';
  for (const d of dates) {
    const wd = weekdayOf(d), closed = !HOURS[wd];
    const n = closed || !state.service ? 0 : freeTimes(state.service, state.stylist, d, state.part).length;
    const isHeld = (state.hold && state.hold.date === d) || (state.booked && state.booked.date === d);
    const day = Number(d.slice(8));
    const note = closed ? 'Closed' : !state.service ? '' : n ? `${n} free` : 'Full';
    const sr = `${dayLabel(d)}${d === today() ? ', today' : ''}: ${closed ? 'closed' : !state.service ? 'open' : n ? `${n} ${n === 1 ? 'time' : 'times'} free` : 'nothing free'}${isHeld ? (state.booked && state.booked.date === d ? ', your booking' : ', your hold') : ''}`;
    const cls = ['cal__day', closed ? 'is-closed' : '', !closed && state.service && !n ? 'is-full' : '', isHeld ? 'is-held' : '', d === today() ? 'is-today' : ''].join(' ');
    html += radio('date', d, state.date === d,
      `<span class="vh">${sr}</span><span class="cal__num" aria-hidden="true">${day}</span><span class="cal__note" aria-hidden="true">${isHeld ? '<span class="cal__mark"></span>' : ''}${note}</span>`,
      { extraClass: cls });
  }
  keepFocus(ui.cal, () => { ui.cal.innerHTML = html; });
  const a = dayLabel(first).split(' '), b = dayLabel(dates[dates.length - 1]).split(' ');
  ui.range.textContent = a[2] === b[2] ? `${a[1]} to ${b[1]} ${b[2]}` : `${a[1]} ${a[2]} to ${b[1]} ${b[2]}`;
}

function renderTimes() {
  const wrap = ui.times;
  if (!state.service) {
    ui.timesNote.textContent = 'Choose a service first, and the free times show here.';
    ui.timesNote.hidden = false;
    keepFocus(wrap, () => { wrap.innerHTML = ''; });
    ui.parts.hidden = true;
    return;
  }
  ui.parts.hidden = false;
  if (!state.date) {
    ui.timesNote.textContent = 'Choose a day to see the free times.';
    ui.timesNote.hidden = false;
    keepFocus(wrap, () => { wrap.innerHTML = ''; });
    return;
  }
  const wd = weekdayOf(state.date);
  if (!HOURS[wd]) {
    const nf = nextFree(state.service, state.stylist, state.date, state.part);
    ui.timesNote.innerHTML = `We’re closed on ${plural(wd)}.${nf ? ` The next free time is ${nf.day_label}, ${nf.time_text} with ${nf.stylist_name}. <button type="button" class="link-btn" data-jump="${nf.date}|${nf.time}|${nf.stylist}">Choose it</button>` : ''}`;
    ui.timesNote.hidden = false;
    keepFocus(wrap, () => { wrap.innerHTML = ''; });
    return;
  }
  let list = freeTimes(state.service, state.stylist, state.date, state.part);
  // the visitor's own hold or booking still shows, chosen, on its day (in place of anyone else at that time)
  const mine = state.hold || state.booked;
  if (mine && mine.service === state.service && mine.date === state.date && (state.stylist === 'any' || state.stylist === mine.stylist) && (state.part === 'any' || partOf(mine.time) === state.part)) {
    list = list.filter((s) => s.time !== mine.time);
    list.push({ time: mine.time, stylist: mine.stylist, mine: true });
    list.sort((a, b) => (a.time < b.time ? -1 : 1));
  }
  if (!list.length) {
    const nf = nextFree(state.service, state.stylist, state.date, state.part);
    const who = state.stylist === 'any' ? '' : ` with ${STYLISTS[state.stylist]}`;
    const when = state.part === 'any' ? '' : ` in the ${state.part}`;
    ui.timesNote.innerHTML = `Nothing is free${who}${when} on ${dayLabel(state.date)}.${nf ? ` The next free time is ${nf.day_label}, ${nf.time_text} with ${nf.stylist_name}. <button type="button" class="link-btn" data-jump="${nf.date}|${nf.time}|${nf.stylist}">Choose it</button>` : ''}`;
    ui.timesNote.hidden = false;
    keepFocus(wrap, () => { wrap.innerHTML = ''; });
    return;
  }
  ui.timesNote.hidden = true;
  const groups = { morning: [], afternoon: [], evening: [] };
  list.forEach((s) => groups[partOf(s.time)].push(s));
  let html = '';
  for (const g of ['morning', 'afternoon', 'evening']) {
    if (!groups[g].length) continue;
    html += `<div class="times__group"><p class="times__label" aria-hidden="true">${PART_NAMES[g]}</p><div class="times__row">`;
    for (const s of groups[g]) {
      const chosen = state.slot && state.slot.time === s.time && state.slot.stylist === s.stylist;
      const label = `${timeText(s.time)}${state.stylist === 'any' ? ` with ${STYLISTS[s.stylist]}` : ''}`;
      html += radio('time', `${s.time}|${s.stylist}`, !!chosen,
        `<span class="vh">${label}${s.mine ? (state.hold ? ', held for you' : ', your booking') : ''}</span><span aria-hidden="true" class="time__t">${timeText(s.time)}</span>${state.stylist === 'any' ? `<span aria-hidden="true" class="time__who">${STYLISTS[s.stylist]}</span>` : ''}`,
        { extraClass: `time${s.mine ? ' is-mine' : ''}` });
    }
    html += '</div></div>';
  }
  keepFocus(wrap, () => { wrap.innerHTML = html; });
}

function renderSummary() {
  const box = ui.summary;
  const h = state.hold, b = state.booked;
  let html = '';
  if (b) {
    html = `<div class="held held--booked" id="book-held" tabindex="-1">
      <p class="held__title">Booked</p>
      <p class="held__what">${SERVICES[b.service].name}, ${dayLabel(b.date)} at ${timeText(b.time)} with ${STYLISTS[b.stylist]}</p>
      <p class="held__ref">Reference <span class="num">${b.ref}</span>, in the name Guest</p>
      ${b.service === 'full_colour' ? `<p class="patch-note">${PATCH_NOTE} Pop in for it any time we’re open.</p>` : ''}
      <p class="held__small">Need to change it? Please give 24 hours’ notice.</p>
      <p class="demo-line">A demo: nothing is booked or charged.</p>
      <button type="button" class="btn btn--quiet" data-act="again">Book something else</button>
    </div>`;
  } else if (h) {
    const left = Math.max(0, Math.round((h.expiresMs - nowMs()) / 1000));
    html = `<div class="held" id="book-held" tabindex="-1">
      <p class="held__title">Held for you</p>
      <p class="held__what">${h.service_name}, ${h.day_label} at ${h.time_text} with ${h.stylist_name}</p>
      <dl class="held__facts"><div><dt>Length</dt><dd><span class="num">${h.duration_min}</span> minutes</dd></div><div><dt>Price</dt><dd class="num">${h.price_text}</dd></div><div><dt>Time left</dt><dd><span class="num" data-countdown>${fmtLeft(left)}</span> <span class="vh">minutes and seconds</span></dd></div></dl>
      ${h.patch_test_note ? `<p class="patch-note">${h.patch_test_note}</p>` : ''}
      <div class="held__actions"><button type="button" class="btn btn--rose" data-act="confirm">Confirm the booking</button><button type="button" class="btn btn--quiet" data-act="release">Let it go</button></div>
      <p class="held__small">Reference <span class="num">${h.hold_id}</span>, in the name Guest. ${'Please give 24 hours’ notice to cancel or move.'}</p>
      <p class="demo-line">A demo: nothing is booked or charged.</p>
    </div>`;
  } else {
    const svc = state.service && SERVICES[state.service];
    const slot = state.slot;
    const rows = [
      ['Service', svc ? `${svc.name}, <span class="num">${svc.min}</span> minutes, <span class="num">${priceText(svc.key)}</span>` : '<span class="muted">Not chosen yet</span>'],
      ['Stylist', slot ? STYLISTS[slot.stylist] : state.stylist === 'any' ? 'Whoever is free first' : STYLISTS[state.stylist]],
      ['When', slot && state.date ? `${dayLabel(state.date)} at ${timeText(slot.time)}` : '<span class="muted">Not chosen yet</span>'],
    ];
    let why = '';
    let ok = !!(svc && slot && state.date);
    if (!svc) why = 'Choose a service, a day and a time to hold it.';
    else if (!state.date || !slot) why = 'Choose a day and a time to hold it.';
    else if (svc.key === 'full_colour' && londonToMs(state.date, slot.time) - nowMs() < PATCH_MS) {
      ok = false;
      why = `${PATCH_NOTE} Choose a time two days or more from now, or call us on <a href="tel:${PHONE_TEL}">${PHONE}</a> if you’ve had colour with us before.`;
    }
    html = `<div class="sum">
      <p class="sum__title">Your appointment</p>
      <dl class="sum__rows">${rows.map(([k, val]) => `<div><dt>${k}</dt><dd>${val}</dd></div>`).join('')}</dl>
      ${svc && svc.key === 'full_colour' && ok ? `<p class="patch-note">${PATCH_NOTE}</p>` : ''}
      ${state.expired ? `<p class="sum__expired">${state.expired}</p>` : ''}
      <div class="sum__go">
        <button type="button" class="btn btn--rose" data-act="hold" ${ok ? '' : 'aria-disabled="true"'} aria-describedby="book-why">Hold this time for 10 minutes</button>
        <p class="sum__why${svc && svc.key === 'full_colour' && !ok && slot ? ' patch-note' : ''}" id="book-why">${ok ? 'Nothing is taken from you to hold it.' : why}</p>
      </div>
      <p class="demo-line">A demo: nothing is booked or charged.</p>
    </div>`;
  }
  const a = document.activeElement;
  const act = !quiet && a && box.contains(a) ? a.getAttribute('data-act') : null;
  box.innerHTML = html;
  if (act) { const again = box.querySelector(`[data-act="${act}"]`) || box.querySelector('#book-held'); if (again) again.focus({ preventScroll: true }); }
}
const fmtLeft = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function render() {
  if (!ui) return;
  ui.root.querySelectorAll('input[name="service"]').forEach((i) => { i.checked = i.value === state.service; });
  ui.root.querySelectorAll('input[name="stylist"]').forEach((i) => { i.checked = i.value === state.stylist; });
  ui.root.querySelectorAll('input[name="part"]').forEach((i) => { i.checked = i.value === state.part; });
  ui.root.classList.toggle('is-colour', state.service === 'full_colour');
  ui.patch.hidden = state.service !== 'full_colour';
  renderCalendar();
  renderTimes();
  renderSummary();
}

function tick() {
  const h = state.hold;
  if (!h) return;
  const left = Math.round((h.expiresMs - nowMs()) / 1000);
  if (left <= 0) {
    state.expired = `Your hold on ${h.day_label} at ${h.time_text} has ended, and the time is free again.`;
    state.hold = null;
    changed();
    announce(state.expired);
    return;
  }
  const c = ui.summary.querySelector('[data-countdown]');
  if (c) c.textContent = fmtLeft(left);
}

/* ── Start ──────────────────────────────────────────────────────────────────── */

export function initBooking() {
  const root = $('#book');
  if (!root) return null;
  ui = {
    root,
    cal: $('#book-cal'), times: $('#book-times-list'), timesNote: $('#book-times-note'), parts: $('#book-parts'),
    summary: $('#book-summary'), range: $('#book-range'), status: $('#book-status'), error: $('#book-error'), patch: $('#book-patch'),
  };
  load();

  // "Book this look" and "Book with Ana" arrive as ?service=…&stylist=…
  const q = new URLSearchParams(location.search);
  let fromLink = false;
  if (SERVICES[q.get('service')]) { state.service = q.get('service'); state.slot = null; fromLink = true; }
  if (STYLISTS[q.get('stylist')]) { state.stylist = q.get('stylist'); state.slot = null; fromLink = true; }
  if (fromLink && !q.has('embed')) {
    q.delete('service'); q.delete('stylist');
    history.replaceState(history.state, '', location.pathname + (q.toString() ? `?${q}` : '') + location.hash);
  }

  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'service') selectService(t.value);
    else if (t.name === 'stylist') selectStylist(t.value);
    else if (t.name === 'part') selectPart(t.value);
    else if (t.name === 'date') selectDate(t.value);
    else if (t.name === 'time') { const [time, who] = t.value.split('|'); selectSlot(time, who); }
    ui.error.hidden = true;
  });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !root.contains(b)) return;
    if (b.dataset.jump) {
      const [date, time, who] = b.dataset.jump.split('|');
      state.date = date; state.slot = { time, stylist: who };
      if (state.part !== 'any' && partOf(time) !== state.part) state.part = 'any';
      changed();
      const input = ui.times.querySelector(`[data-key="time:${time}|${who}"]`);
      if (input) input.focus();
      announce(`${dayLabel(date)} at ${timeText(time)} with ${STYLISTS[who]} chosen.`);
      return;
    }
    const act = b.dataset.act;
    if (act === 'hold') { if (b.getAttribute('aria-disabled') === 'true') return; holdFromVisitor(); }
    else if (act === 'release') release();
    else if (act === 'confirm') confirm();
    else if (act === 'again') { state.booked = null; state.slot = null; changed(); $('#bk-service-' + (state.service || 'cut_finish').replace(/_/g, ''))?.focus(); }
  });
  setInterval(tick, 1000);
  document.addEventListener('visibilitychange', tick);
  render();

  // Contract A: the AI demo's frame
  const pick = (name) => v.oneOf(name === 'service' ? SERVICE_KEYS : name === 'stylistAny' ? ['any', ...STYLIST_KEYS] : name === 'part' ? PARTS : STYLIST_KEYS);
  const run = (fn) => (a) => { quiet = true; try { return fn(a); } finally { quiet = false; } };
  api = serve({
    business: 'salon',
    getState: () => {
      const n = londonNow();
      return { business: 'salon', now: { date: n.date, time: n.time, weekday: n.weekday }, hold: holdOut(state.hold) };
    },
    actions: {
      find_free_times: {
        args: { service: pick('service'), stylist: pick('stylistAny'), date: v.date(), part_of_day: pick('part') },
        run: run((a) => {
          const result = findFreeTimes(a);
          state.service = a.service; state.stylist = a.stylist; state.date = a.date; state.part = a.part_of_day; state.slot = null;
          state.expired = null;
          changed();
          spotlight($('#book-when'));
          return result;
        }),
      },
      hold_booking: {
        args: { service: pick('service'), stylist: pick('stylist'), date: v.date(), time: v.time({ step: 30 }) },
        run: run((a) => {
          const result = holdBooking(a);
          changed();
          spotlight($('#book-summary'));
          return result;
        }),
      },
      reset: {
        args: {},
        run: run(() => { reset(); spotlight($('#book')); return { cleared: true }; }),
      },
    },
  });
  return api;
}
