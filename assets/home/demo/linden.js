/*
 * Linden Clinic: the booking page, and Contract A for the AI demo's frame (round-05-plan.md 10.7).
 * Facts (the same as assets/studio/aiassist.js): Monday to Friday 8am to 7pm, Saturday 9am to 1pm,
 * Sunday closed; GP appointment £95 for 30 minutes, video appointment £75 (30 minutes), health check
 * from £245 (60 minutes, on the hour). The window is today to today + 13 days; today's slots start at
 * least 60 minutes from now. A hold lasts 10 minutes, in the name Guest. Nothing is ever sent anywhere.
 *
 * The assistant's actions (find_free_times, book_appointment, get_state, reset) go through the same
 * functions as the visitor's own clicks, so the page ends up exactly as if the visitor had done it.
 */
import {
  serve, EmbedError, v, spotlight, isEmbed,
  londonNow, nowMs, addDays, weekdayOf, dayLabel, timeText, penceText, isBusy, makeRef,
} from '../../shared/embed-api.js';
import { mountRibbon } from '../../shared/ribbon.js';

const SERVICES = {
  gp: { name: 'GP appointment', pence: 9500, price: '£95', min: 30, step: 30 },
  video: { name: 'Video appointment', pence: 7500, price: '£75', min: 30, step: 30 },
  health_check: { name: 'Health check', pence: 24500, price: 'from £245', min: 60, step: 60 },
};
const PARTS = { any: 'Any time', morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };
const WINDOW_DAYS = 13;
const LEAD_MIN = 60;
const HOLD_S = 600;
const STORE = 'linden-clinic-hold';

const $ = (id) => document.getElementById(id);
const toMin = (t) => +t.slice(0, 2) * 60 + +t.slice(3);
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const partOf = (t) => (toMin(t) < 720 ? 'morning' : toMin(t) < 1020 ? 'afternoon' : 'evening');
const shortDay = (d) => weekdayOf(d).slice(0, 3);

function hoursOf(date) {
  const wd = weekdayOf(date);
  if (wd === 'Sunday') return null;
  if (wd === 'Saturday') return { open: '09:00', close: '13:00' };
  return { open: '08:00', close: '19:00' };
}

/* ---------- State ---------- */
const S = {
  service: 'gp',
  date: null,
  part: 'any',
  time: null,
  hold: null,
};
let expireTimer = 0;
let tick = 0;

function today() { return londonNow().date; }

function readHold() {
  try {
    const h = JSON.parse(sessionStorage.getItem(STORE) || 'null');
    if (h && Date.parse(h.expires_at) > nowMs()) return h;
  } catch { /* storage off */ }
  return null;
}
function writeHold(h) {
  try { if (h) sessionStorage.setItem(STORE, JSON.stringify(h)); else sessionStorage.removeItem(STORE); } catch { /* storage off */ }
}

function heldCovers(date, time, min) {
  const h = S.hold;
  if (!h || h.date !== date) return false;
  const a = toMin(time), b = a + min, ha = toMin(h.time), hb = ha + h.duration_min;
  return a < hb && ha < b;
}

/** Every start time for a service on a date, with whether it's free. */
function startsFor(service, date) {
  const hrs = hoursOf(date);
  if (!hrs) return [];
  const sv = SERVICES[service];
  const now = londonNow();
  const out = [];
  for (let m = toMin(hrs.open); m + sv.min <= toMin(hrs.close); m += sv.step) {
    const time = hhmm(m);
    const tooSoon = date < now.date || (date === now.date && m < now.minutes + LEAD_MIN);
    const free = !tooSoon && !isBusy(date, 'clinic', time) && !heldCovers(date, time, sv.min);
    out.push({ time, free, tooSoon });
  }
  return out;
}

function slotOf(service, date, time) {
  const sv = SERVICES[service];
  return { date, day_label: dayLabel(date), time, time_text: timeText(time), service, service_name: sv.name, duration_min: sv.min, price_text: sv.price };
}

function freeSlots(service, date, part) {
  return startsFor(service, date).filter((s) => s.free && (part === 'any' || partOf(s.time) === part)).map((s) => slotOf(service, date, s.time));
}

function nextFree(service, date, part) {
  const last = addDays(today(), WINDOW_DAYS);
  for (let d = addDays(date, 1); d <= last; d = addDays(d, 1)) {
    const s = freeSlots(service, d, part);
    if (s.length) return s[0];
  }
  return null;
}

/* ---------- Rendering ---------- */
function renderServices() {
  const box = $('services');
  box.innerHTML = '';
  for (const [key, sv] of Object.entries(SERVICES)) {
    const label = document.createElement('label');
    label.className = 'svc';
    label.innerHTML = `<input type="radio" name="service" value="${key}"><span class="svc__name">${sv.name}</span><span class="svc__price">${sv.price}</span><span class="svc__len">${sv.min} minutes${key === 'video' ? ', on your phone or laptop' : key === 'health_check' ? ', starting on the hour' : ', in person'}</span>`;
    const input = label.querySelector('input');
    input.checked = key === S.service;
    input.addEventListener('change', () => { setService(key); api.notifyState(); });
    box.appendChild(label);
  }
}

function renderDays() {
  const box = $('days');
  box.innerHTML = '';
  const t = today();
  for (let i = 0; i <= WINDOW_DAYS; i++) {
    const d = addDays(t, i);
    const closed = !hoursOf(d);
    const label = document.createElement('label');
    label.className = 'day';
    const top = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : shortDay(d);
    const num = +d.slice(8);
    label.innerHTML = `<input type="radio" name="day" value="${d}" aria-label="${dayLabel(d)}${closed ? ', closed' : ''}"><span>${top}<b>${num}</b>${closed ? 'Closed' : ''}</span>`;
    const input = label.querySelector('input');
    input.disabled = closed;
    input.checked = d === S.date;
    input.addEventListener('change', () => { setDate(d); api.notifyState(); });
    box.appendChild(label);
  }
}

function renderParts() {
  const box = $('parts');
  box.innerHTML = '';
  for (const [key, text] of Object.entries(PARTS)) {
    const label = document.createElement('label');
    label.className = 'part';
    label.innerHTML = `<input type="radio" name="part" value="${key}"><span>${text}</span>`;
    const input = label.querySelector('input');
    input.checked = key === S.part;
    input.addEventListener('change', () => { S.part = key; S.time = null; renderTimes(); api.notifyState(); });
    box.appendChild(label);
  }
}

function syncChecks() {
  for (const i of document.querySelectorAll('input[name="service"]')) i.checked = i.value === S.service;
  for (const i of document.querySelectorAll('input[name="day"]')) i.checked = i.value === S.date;
  for (const i of document.querySelectorAll('input[name="part"]')) i.checked = i.value === S.part;
}

function renderTimes() {
  const box = $('times');
  const empty = $('times-empty');
  box.innerHTML = '';
  $('times-title').textContent = `Free times, ${dayLabel(S.date)}`;
  const slots = freeSlots(S.service, S.date, S.part);
  if (!slots.length) {
    const nf = nextFree(S.service, S.date, S.part);
    empty.hidden = false;
    empty.textContent = hoursOf(S.date) ? 'Nothing free on this day. ' : 'We’re closed on Sundays. ';
    if (nf) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `Next free: ${nf.day_label} at ${nf.time_text}`;
      b.addEventListener('click', () => { setDate(nf.date); selectTime(nf.time); api.notifyState(); });
      empty.appendChild(b);
    }
  } else {
    empty.hidden = true;
  }
  for (const s of slots) {
    const label = document.createElement('label');
    label.className = 'time';
    label.innerHTML = `<input type="radio" name="time" value="${s.time}"><span>${s.time_text}</span>`;
    const input = label.querySelector('input');
    input.checked = s.time === S.time;
    input.addEventListener('change', () => { selectTime(s.time); api.notifyState(); });
    box.appendChild(label);
  }
  if (S.time && !slots.some((s) => s.time === S.time)) S.time = null;
  updateHoldButton();
}

function updateHoldButton() {
  const btn = $('hold-btn');
  btn.disabled = !S.time;
  $('hold-why').textContent = S.time ? `${SERVICES[S.service].name}, ${dayLabel(S.date)} at ${timeText(S.time)}.` : 'Choose a time first.';
}

function renderHold() {
  const box = $('held');
  clearInterval(tick);
  if (!S.hold) { box.hidden = true; return; }
  const h = S.hold;
  box.hidden = false;
  $('held-what').textContent = `${h.service_name}, ${h.day_label} at ${h.time_text} (${h.duration_min} minutes).`;
  $('held-ref').textContent = h.hold_id;
  $('held-price').textContent = h.price_text;
  $('held-done').textContent = '';
  const left = () => {
    const s = Math.max(0, Math.round((Date.parse(h.expires_at) - nowMs()) / 1000));
    $('held-left').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  left();
  tick = setInterval(left, 1000);
}

/* ---------- Changes (the visitor's controls and the assistant's actions both use these) ---------- */
function setService(key) {
  S.service = key;
  S.time = null;
  syncChecks();
  renderTimes();
}
function setDate(d) {
  S.date = d;
  S.time = null;
  syncChecks();
  renderTimes();
}
function selectTime(t) {
  S.time = t;
  renderTimes();
  const i = document.querySelector(`input[name="time"][value="${t}"]`);
  if (i) i.checked = true;
}

function placeHold(service, date, time) {
  releaseHold(false);
  const sv = SERVICES[service];
  const expires = nowMs() + HOLD_S * 1000;
  const h = {
    hold_id: makeRef('LC'), name: 'Guest', service, service_name: sv.name, date, day_label: dayLabel(date), time, time_text: timeText(time),
    duration_min: sv.min, price_text: sv.price, expires_at: new Date(expires).toISOString().replace(/\.\d{3}Z$/, 'Z'), expires_in_s: HOLD_S,
    card_text: `Held for 10 minutes: ${sv.name}, ${dayLabel(date)} at ${timeText(time)}`,
  };
  S.hold = h;
  writeHold(h);
  $('expired').textContent = '';
  scheduleExpiry();
  S.service = service; S.date = date; S.time = null;
  syncChecks();
  renderTimes();
  renderHold();
  return h;
}

function releaseHold(render = true) {
  clearTimeout(expireTimer);
  S.hold = null;
  writeHold(null);
  if (render) { renderTimes(); renderHold(); }
}

function scheduleExpiry() {
  clearTimeout(expireTimer);
  if (!S.hold) return;
  const ms = Date.parse(S.hold.expires_at) - nowMs();
  expireTimer = setTimeout(() => {
    const h = S.hold;
    releaseHold(true);
    if (h) $('expired').textContent = `Your hold on ${h.time_text}, ${h.day_label}, has run out, so the time is free again.`;
    api.notifyState();
  }, Math.max(0, ms));
}

function stateObj() {
  const n = londonNow();
  return { business: 'clinic', now: { date: n.date, time: n.time, weekday: n.weekday }, hold: S.hold ? { ...S.hold, expires_in_s: Math.max(0, Math.round((Date.parse(S.hold.expires_at) - nowMs()) / 1000)) } : null };
}

/* ---------- Checks shared by the actions ---------- */
function checkWindow(date) {
  const t = today();
  if (date < t) throw new EmbedError('too_soon', 'That day has already passed.');
  if (date > addDays(t, WINDOW_DAYS)) throw new EmbedError('too_far', 'Linden Clinic takes bookings up to two weeks ahead.');
}

/* ---------- Boot ---------- */
S.hold = readHold();
S.date = (() => {   // the first day with a free GP appointment
  const t = today();
  for (let i = 0; i <= WINDOW_DAYS; i++) { const d = addDays(t, i); if (freeSlots('gp', d, 'any').length) return d; }
  return t;
})();
if (S.hold) { S.service = S.hold.service; S.date = S.hold.date; }
renderServices();
renderDays();
renderParts();
renderTimes();
renderHold();
scheduleExpiry();

$('booking').addEventListener('submit', (e) => e.preventDefault());
$('hold-btn').addEventListener('click', () => {
  if (!S.time) return;
  placeHold(S.service, S.date, S.time);
  api.notifyState();
});
$('release-btn').addEventListener('click', () => {
  releaseHold(true);
  $('expired').textContent = 'Released. The time is free again.';
  api.notifyState();
});
$('confirm-btn').addEventListener('click', () => {
  $('held-done').textContent = 'This is a demo, so nothing is booked. On the real site this would confirm it.';
});

if (!isEmbed()) mountRibbon({ name: 'Linden Clinic' });

/* ---------- Contract A ---------- */
const DATE = v.date();
const api = serve({
  business: 'clinic',
  getState: stateObj,
  actions: {
    find_free_times: {
      args: { service: v.oneOf(Object.keys(SERVICES)), date: DATE, part_of_day: v.oneOf(['any', 'morning', 'afternoon', 'evening']) },
      run: (a) => {
        checkWindow(a.date);
        S.service = a.service; S.part = a.part_of_day;
        setDate(a.date);
        const slots = freeSlots(a.service, a.date, a.part_of_day).slice(0, 6);
        spotlight(slots.length ? $('times') : $('times-step'));
        return {
          date: a.date, day_label: dayLabel(a.date), closed: !hoursOf(a.date), slots,
          next_free: slots.length ? null : nextFree(a.service, a.date, a.part_of_day),
        };
      },
    },
    book_appointment: {
      args: { service: v.oneOf(Object.keys(SERVICES)), date: DATE, time: v.time({ step: 30 }) },
      run: (a) => {
        checkWindow(a.date);
        const sv = SERVICES[a.service];
        const hrs = hoursOf(a.date);
        if (!hrs) throw new EmbedError('closed', 'Linden Clinic is closed on Sundays.');
        if (toMin(a.time) < toMin(hrs.open) || toMin(a.time) + sv.min > toMin(hrs.close)) {
          throw new EmbedError('closed', `On ${weekdayOf(a.date)}s Linden Clinic is open ${timeText(hrs.open)} to ${timeText(hrs.close)}, and a ${sv.name.toLowerCase()} takes ${sv.min} minutes.`);
        }
        const n = londonNow();
        if (a.date === n.date && toMin(a.time) < n.minutes + LEAD_MIN) throw new EmbedError('too_soon', 'Appointments today start at least an hour from now.');
        if (sv.step === 60 && a.time.slice(3) !== '00') throw new EmbedError('not_free', 'Health checks start on the hour.');
        const start = startsFor(a.service, a.date).find((s) => s.time === a.time);
        const isMine = S.hold && S.hold.service === a.service && S.hold.date === a.date && S.hold.time === a.time;
        if (!isMine && (!start || !start.free)) {
          const later = freeSlots(a.service, a.date, 'any').find((s) => s.time > a.time) || freeSlots(a.service, a.date, 'any')[0];
          throw new EmbedError('not_free', later ? `${timeText(a.time)} isn’t free. The nearest free time that day is ${later.time_text}.` : `${timeText(a.time)} isn’t free, and nothing else is free that day.`);
        }
        const h = placeHold(a.service, a.date, a.time);
        spotlight($('held'));
        return { ...h };
      },
    },
    reset: {
      args: {},
      run: () => {
        releaseHold(false);
        $('expired').textContent = '';
        S.service = 'gp'; S.part = 'any'; S.time = null;
        S.date = today();
        if (!hoursOf(S.date)) S.date = addDays(S.date, 1);
        syncChecks(); renderTimes(); renderHold();
        return { cleared: true };
      },
    },
  },
});

// Keep the day strip right if the page stays open past midnight.
let shownDay = today();
setInterval(() => {
  const t = today();
  if (t !== shownDay) { shownDay = t; if (S.date < t) S.date = t; renderDays(); renderTimes(); api.notifyState(); }
}, 60000);
