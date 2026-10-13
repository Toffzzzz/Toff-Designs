/*
 * Hart & Sons: the visit request part (the price list and "Book a visit").
 * The visitor's controls and the message API (js/embed.js) go through the same functions
 * here, so an action changes the page exactly as if the visitor had done it.
 */
import {
  EmbedError, londonNow, londonParts, nowMs, addDays, weekdayOf, dayLabel, timeText, makeRef, spotlight,
} from '../../../assets/shared/embed-api.js';
import {
  PRICE_LIST, WINDOWS, DAYS_AHEAD, HOLD_SECONDS, DISTRICTS, GAS_LINE,
  quoteFor, parsePostcode, isCovered, outOfAreaMessage, windowStatus, checkRequest, requestCardText,
} from './rules.js';
import { store, changed, save } from './store.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  n.append(...kids.filter((k) => k != null));
  return n;
};
const SHORT_DAYS = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let form, daysEl, winsEl, ticketWrap, pcInput, pcHint, pricelist, plPanel;
let expiryTimer = 0;
let expired = null;          // the last request that ran out (shown until the next change)
const resetHooks = [];
export const onReset = (fn) => resetHooks.push(fn);

/* ── Price list (the quote panel) ────────────────────────────────────────── */

function renderPriceList() {
  const chosen = store.quote && store.quote.job;
  const buttons = $$('.pl', pricelist);
  buttons.forEach((b, i) => {
    const on = b.dataset.job === chosen;
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    b.tabIndex = on || (!chosen && i === 0) ? 0 : -1;
  });
  const body = $('[data-pl-body]', plPanel);
  const empty = $('[data-pl-empty]', plPanel);
  if (!store.quote) { body.hidden = true; empty.hidden = false; return; }
  empty.hidden = true; body.hidden = false;
  $('[data-pl-line]', plPanel).textContent = store.quote.card_text;
  $('[data-pl-detail]', plPanel).textContent = store.quote.detail;
}

export function chooseQuote(job) {
  store.quote = quoteFor(job);
  changed();
  renderPriceList();
  return { ...store.quote };
}

function initPriceList() {
  pricelist = $('[data-pricelist]');
  plPanel = $('[data-pl-panel]');
  const buttons = $$('.pl', pricelist);
  pricelist.addEventListener('click', (e) => {
    const b = e.target.closest('.pl');
    if (b) chooseQuote(b.dataset.job);
  });
  // A radio group: arrows move and choose; Home and End jump.
  pricelist.addEventListener('keydown', (e) => {
    const i = buttons.indexOf(document.activeElement);
    if (i < 0) return;
    let j = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') j = (i + 1) % buttons.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') j = (i - 1 + buttons.length) % buttons.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = buttons.length - 1;
    if (j == null) return;
    e.preventDefault();
    chooseQuote(buttons[j].dataset.job);
    buttons[j].focus();
  });
  $('[data-pl-book]', plPanel).addEventListener('click', () => {
    if (!store.quote) return;
    const job = store.quote.job === 'other' ? 'quote_visit' : store.quote.job;
    goBook({ job });
  });
  renderPriceList();
}

/* ── Book a visit ────────────────────────────────────────────────────────── */

function dayStatus(job, date, now) {
  const wd = weekdayOf(date);
  if (wd === 'Sunday' && job !== 'emergency_callout') {
    return { disabled: !!job, note: 'Emergencies only', why: 'emergency call-outs only' };
  }
  if (!job) return { disabled: false };
  const free = ['morning', 'afternoon'].some((w) => windowStatus(job, date, w, now).ok)
    || (job === 'emergency_callout' && date === now.date);
  return free ? { disabled: false } : { disabled: true, note: 'Full', why: 'no free windows' };
}

function renderDays() {
  const now = londonNow();
  const job = store.form.job;
  const keep = daysEl.scrollLeft;
  const frag = document.createDocumentFragment();
  let selectedOk = false;
  for (let k = 0; k <= DAYS_AHEAD; k++) {
    const date = addDays(now.date, k);
    const wd = weekdayOf(date);
    const st = dayStatus(job, date, now);
    const [, m, d] = date.split('-').map(Number);
    const checked = store.form.date === date && !st.disabled;
    if (checked) selectedOk = true;
    const label = `${dayLabel(date)}${k === 0 ? ', today' : ''}${st.why ? `, ${st.why}` : ''}`;
    const input = el('input', { type: 'radio', name: 'bday', value: date, 'aria-label': label });
    input.checked = checked;
    input.disabled = st.disabled;
    frag.append(el('label', { class: 'day-opt' }, input,
      el('span', { 'aria-hidden': 'true' },
        el('b', { text: k === 0 ? 'Today' : SHORT_DAYS[wd] }),
        el('strong', { text: String(d) }),
        el('em', { text: st.note || SHORT_MONTHS[m - 1] }))));
  }
  daysEl.replaceChildren(frag);
  daysEl.scrollLeft = keep;
  if (store.form.date && !selectedOk && dateInStrip(store.form.date, now)) { store.form.date = ''; store.form.window = ''; }
}

const dateInStrip = (date, now) => date >= now.date && date <= addDays(now.date, DAYS_AHEAD);

function windowOptions(job, date, now) {
  const list = ['morning', 'afternoon'];
  if (job === 'emergency_callout' && date === now.date) list.push('asap');
  return list;
}

function renderWindows() {
  const now = londonNow();
  const { job, date } = store.form;
  if (!date) {
    winsEl.replaceChildren(el('p', { class: 'windows__empty', text: 'Choose a day first, and the free windows show here.' }));
    return;
  }
  const frag = document.createDocumentFragment();
  let keep = false;
  for (const w of windowOptions(job, date, now)) {
    const st = windowStatus(job || 'emergency_callout', date, w, now);
    const held = store.request && store.request.date === date && store.request.window === w;
    const ok = st.ok || held;
    const info = WINDOWS[w];
    const note = held ? 'Your request' : !ok ? st.short
      : w === 'asap' ? 'Emergency call-out, £120, then £60 an hour' : 'Free';
    const input = el('input', { type: 'radio', name: 'bwin', value: w, 'aria-label': `${info.name}, ${w === 'asap' ? 'today' : info.text}, ${note.toLowerCase()}` });
    input.disabled = !ok;
    input.checked = ok && store.form.window === w;
    if (input.checked) keep = true;
    frag.append(el('label', { class: 'win' }, input,
      el('span', { 'aria-hidden': 'true' },
        el('b', { text: info.name }),
        el('i', { text: w === 'asap' ? 'Today' : info.text }),
        el('em', { text: note }))));
  }
  winsEl.replaceChildren(frag);
  if (!keep) store.form.window = '';
}

function syncJobRadios() {
  for (const r of $$('input[name="bjob"]', form)) r.checked = r.value === store.form.job;
}

function setJob(job) {
  store.form.job = job;
  syncJobRadios();
  renderDays();
  renderWindows();
  renderDraft();
  hideError('job');
  save();
}

function pcFeedback(showErrors) {
  const { district, error } = parsePostcode(pcInput.value);
  hideError('postcode');
  pcHint.classList.remove('is-yes');
  pcHint.textContent = 'Just the first half, like W5. We only keep that part.';
  pcInput.removeAttribute('aria-invalid');
  if (error) { if (showErrors) showError('postcode', error); return { error }; }
  if (!district) return { district };
  if (isCovered(district)) {
    pcHint.textContent = `${district} ${DISTRICTS[district]} is in our area.`;
    pcHint.classList.add('is-yes');
  } else if (showErrors) {
    showError('postcode', `${district} is outside our area. We cover west London from Paddington out to Ealing: W2 to W14.`);
  }
  return { district };
}

function showError(key, message) {
  const p = $(`[data-error="${key}"]`, form);
  if (!p) return;
  p.textContent = message;
  p.hidden = false;
  if (key === 'postcode') pcInput.setAttribute('aria-invalid', 'true');
}
function hideError(key) {
  const p = $(`[data-error="${key}"]`, form);
  if (p) { p.hidden = true; p.textContent = ''; }
  if (key === 'postcode') pcInput.removeAttribute('aria-invalid');
}
function clearErrors() { ['job', 'postcode', 'date', 'window', 'form'].forEach(hideError); }

/* The request itself: shared by the visitor's form and request_visit. */
function makeRequest(args) {
  const now = londonNow();
  checkRequest(args, now);
  releaseRequest();
  const item = PRICE_LIST[args.job];
  const expiresMs = nowMs() + HOLD_SECONDS * 1000;
  const req = {
    request_ref: makeRef('HS'),
    name: 'Guest',
    job: args.job,
    job_name: item.name,
    date: args.date,
    day_label: dayLabel(args.date),
    window: args.window,
    window_text: WINDOWS[args.window].text,
    postcode_district: args.postcode_district,
    price_text: item.price_text,
    expires_at: new Date(expiresMs).toISOString(),
    expires_in_s: HOLD_SECONDS,
    card_text: requestCardText(args),
  };
  store.request = req;
  expired = null;
  changed();
  scheduleExpiry();
  renderWindows();
  renderTicket(true);
  return { ...req };
}

function releaseRequest() {
  clearTimeout(expiryTimer);
  store.request = null;
}

function scheduleExpiry() {
  clearTimeout(expiryTimer);
  if (!store.request) return;
  const ms = Date.parse(store.request.expires_at) - nowMs();
  if (ms <= 0) { expire(); return; }
  expiryTimer = setTimeout(expire, Math.min(ms, 2 ** 31 - 1));
}

function expire() {
  if (!store.request) return;
  expired = store.request;
  store.request = null;
  changed();
  renderWindows();
  renderTicket(false);
}

/** Reads the form, checks it and makes the request. Throws an EmbedError for rule errors. */
function submit({ fromApi = false } = {}) {
  clearErrors();
  const { job, date, window: win } = store.form;
  const pc = parsePostcode(pcInput.value);
  const missing = [];
  if (!job) { showError('job', 'Choose what the visit is for.'); missing.push('input[name="bjob"]'); }
  if (pc.error) { showError('postcode', pc.error); missing.push('#bpc'); }
  if (!date) { showError('date', 'Choose a day.'); missing.push('input[name="bday"]:not(:disabled)'); }
  else if (!win) { showError('window', 'Choose a morning or afternoon window.'); missing.push('input[name="bwin"]:not(:disabled)'); }
  if (missing.length) {
    if (!fromApi) { const first = $(missing[0], form); if (first) first.focus(); }
    throw new EmbedError('invalid_args', 'Some details are missing.');
  }
  try {
    return makeRequest({ job, date, window: win, postcode_district: pc.district || '' });
  } catch (err) {
    if (err && err.code === 'out_of_area') showError('postcode', err.message);
    else showError('form', err && err.message ? err.message : 'Something went wrong. Please try again.');
    if (err && err.code === 'not_free') renderWindows();
    throw err;
  }
}

/* ── The ticket (the request card) and the draft summary beside the form ─── */

function row(dt, dd, ddClass) { return el('div', {}, el('dt', { text: dt }), el('dd', { class: ddClass, text: dd })); }

function renderTicket(isNew) {
  const req = store.request || expired;
  if (!req) { renderDraft(); return; }
  const isExpired = !store.request;
  const asap = req.window === 'asap';
  const until = londonParts(Date.parse(req.expires_at));
  const title = el('h3', { class: 'ticket__title', id: 'ticket-title', tabindex: '-1', text: isExpired ? 'Request expired' : 'Visit requested' });
  const rows = el('dl', { class: 'ticket__rows' },
    row('Job', req.job_name),
    row('Day', asap ? 'Today' : req.day_label),
    row('Window', asap ? 'As soon as possible' : req.window_text),
    req.postcode_district ? row('Postcode', `${req.postcode_district} ${DISTRICTS[req.postcode_district] || ''}`.trim()) : null,
    row('Price', req.price_text, 'ticket__price num-wide'));
  const actions = el('div', { class: 'ticket__actions' });
  if (isExpired) {
    const again = el('button', { class: 'btn btn--bright', type: 'button', text: 'Request it again' });
    again.addEventListener('click', () => {
      store.form = { job: req.job, pc: req.postcode_district, date: req.date, window: req.window };
      applyForm();
      try { submit(); focusTicket(); } catch { /* the form shows why */ }
    });
    actions.append(again);
  } else {
    const cancel = el('button', { class: 'btn btn--line', type: 'button', text: 'Cancel request' });
    cancel.addEventListener('click', () => {
      releaseRequest();
      expired = null;
      changed();
      renderWindows();
      renderTicket(false);
      const submitBtn = $('button[type="submit"]', form);
      if (submitBtn) submitBtn.focus();
    });
    actions.append(cancel);
  }
  const card = el('article', { class: `ticket${isExpired ? ' is-expired' : ''}${isNew ? ' is-new' : ''}`, 'aria-labelledby': 'ticket-title', 'data-ticket': '' },
    el('div', { class: 'ticket__top' }, title, el('span', { class: 'ticket__ref num-wide', text: req.request_ref, 'aria-label': `Reference ${req.request_ref.split('').join(' ')}` })),
    rows,
    el('p', { class: 'ticket__hold', text: isExpired
      ? 'This request ran out after 10 minutes, so the window is free again.'
      : `Held for 10 minutes, until ${timeText(until.time)}, in the name Guest.` }),
    el('p', { class: 'ticket__note', text: 'On a real site you’d add your address and phone number next. This is a demo, so nothing is booked or sent.' }),
    req.job === 'emergency_callout' ? el('p', { class: 'ticket__gas', text: `If you smell gas, call ${GAS_LINE} first.` }) : null,
    actions);
  ticketWrap.replaceChildren(card);
}

function renderDraft() {
  if (store.request || expired) return;
  const { job, date, window: win } = store.form;
  const item = job ? PRICE_LIST[job] : null;
  const pc = parsePostcode(pcInput ? pcInput.value : '');
  const card = el('aside', { class: 'ticket ticket--draft', 'aria-label': 'Your visit so far' },
    el('div', { class: 'ticket__top' }, el('p', { class: 'ticket__title', text: 'Your visit' })),
    el('dl', { class: 'ticket__rows' },
      row('Job', item ? item.name : 'Not chosen yet'),
      row('Day', date ? (win === 'asap' ? 'Today' : dayLabel(date)) : 'Not chosen yet'),
      row('Window', win ? (win === 'asap' ? 'As soon as possible' : WINDOWS[win].text) : 'Not chosen yet'),
      pc.district ? row('Postcode', pc.district) : null,
      row('Price', item ? item.price_text : '', 'ticket__price num-wide')),
    el('p', { class: 'ticket__note', text: 'Nothing is requested until you press “Request this visit”.' }));
  ticketWrap.replaceChildren(card);
}

function focusTicket() {
  const t = $('#ticket-title');
  if (t) t.focus({ preventScroll: false });
}

/* Puts store.form into the controls. */
function applyForm() {
  syncJobRadios();
  pcInput.value = store.form.pc || '';
  pcFeedback(false);
  renderDays();
  renderWindows();
  renderDraft();
}

/** Takes the visitor to the form with these choices made (from the price list, the quote or the map). */
export function goBook({ job, pc, date, window: win } = {}) {
  if (job) store.form.job = job;
  if (pc != null) store.form.pc = pc;
  if (date) store.form.date = date;
  if (win) store.form.window = win;
  save();
  applyForm();
  if (win) { store.form.window = win; renderWindows(); renderDraft(); save(); }
  const target = $('input[name="bjob"]:checked', form) || $('#book');
  target.focus();
}

/* ── Message API entry points (js/embed.js) ──────────────────────────────── */

export function apiRequestVisit(a) {
  store.form = { job: a.job, pc: a.postcode_district, date: a.date, window: a.window };
  syncJobRadios();
  pcInput.value = a.postcode_district;
  pcFeedback(false);
  renderDays();
  store.form.date = a.date;
  for (const r of $$('input[name="bday"]', form)) r.checked = r.value === a.date && !r.disabled;
  renderWindows();
  store.form.window = a.window;
  for (const r of $$('input[name="bwin"]', form)) r.checked = r.value === a.window && !r.disabled;
  renderDraft();
  save();
  try {
    const result = submit({ fromApi: true });
    spotlight($('[data-ticket]'));
    return result;
  } catch (err) {
    const shown = $$('[data-error]', form).find((p) => !p.hidden);
    spotlight(shown || form);
    throw err;
  }
}

export function apiQuoteFromList(job) {
  const result = chooseQuote(job);
  spotlight(plPanel);
  return result;
}

export function resetAll() {
  releaseRequest();
  expired = null;
  store.quote = null;
  store.form = { job: '', pc: '', date: '', window: '' };
  clearErrors();
  for (const fn of resetHooks) fn();
  changed();
  renderPriceList();
  applyForm();
  return { cleared: true };
}

export function getState() {
  const now = londonNow();
  const req = store.request;
  return {
    business: 'trades',
    now: { date: now.date, time: now.time, weekday: now.weekday },
    request: req ? { ...req, expires_in_s: Math.max(0, Math.round((Date.parse(req.expires_at) - nowMs()) / 1000)) } : null,
    quote: store.quote ? { ...store.quote } : null,
  };
}

/* ── Start ───────────────────────────────────────────────────────────────── */

export function initVisit() {
  form = $('[data-book-form]');
  daysEl = $('[data-days]', form);
  winsEl = $('[data-windows]', form);
  ticketWrap = $('[data-ticket-wrap]');
  pcInput = $('#bpc');
  pcHint = $('[data-bpc-hint]');

  // A request that ran out while the visitor was away is simply gone.
  if (store.request && Date.parse(store.request.expires_at) <= nowMs()) { store.request = null; save(); }
  // A remembered day that has since passed is dropped.
  if (store.form.date && store.form.date < londonNow().date) { store.form.date = ''; store.form.window = ''; }

  initPriceList();

  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'bjob') setJob(t.value);
    else if (t.name === 'bday') {
      store.form.date = t.value;
      hideError('date'); hideError('form');
      renderWindows(); renderDraft(); save();
    } else if (t.name === 'bwin') {
      store.form.window = t.value;
      hideError('window'); hideError('form');
      renderDraft(); save();
    }
  });
  pcInput.addEventListener('input', () => { store.form.pc = pcInput.value; pcFeedback(false); renderDraft(); save(); });
  pcInput.addEventListener('blur', () => { if (pcInput.value.trim()) pcFeedback(true); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    try { submit(); focusTicket(); } catch { /* the form shows why */ }
  });

  applyForm();
  if (store.request) { renderTicket(false); scheduleExpiry(); }

  // The day strip and windows depend on the clock: refresh them when the visitor comes back to the tab.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { renderDays(); renderWindows(); if (!store.request && !expired) renderDraft(); }
  });
}
