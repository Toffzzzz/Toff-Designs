/*
 * Morrow Coffee: the order (basket, collection time, placed order) and the loyalty card.
 * One store, used by the visitor's own controls and by the message API alike, so an action
 * from the AI demo leaves exactly the same state, interface and sessionStorage as a click.
 *
 * Demo: nothing is sent anywhere. The state lives in sessionStorage for this tab only.
 */
import { EmbedError, londonNow, addDays, weekdayOf, dayLabel, timeText, makeRef } from '../../../assets/shared/embed-api.js';
import { CAFE, MENU, unitPence, optionProblem, lineLabel, linePhrase, toMin, toHHMM, hoursFor, gbp } from './data.js';

const KEY = 'morrow-v1';

function load() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.lines)) return { lines: s.lines.filter((l) => l && MENU[l.item]), nextLine: s.nextLine | 0 || 1, collection: s.collection || null, stamps: Math.max(0, Math.min(CAFE.stampsToFill, s.stamps | 0)), placed: s.placed || null };
    }
  } catch { /* private mode or blocked storage: start empty */ }
  return { lines: [], nextLine: 1, collection: null, stamps: 0, placed: null };
}

const state = load();
const listeners = new Set();
let notice = null;     // a one-off message for the interface (e.g. a collection time that has passed)

function save() {
  try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch { /* nothing to do */ }
}
function changed(reason, detail) {
  save();
  for (const fn of [...listeners]) { try { fn(reason, detail); } catch (e) { console.error(e); } }
}
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function takeNotice() { const n = notice; notice = null; return n; }

/* ── Time ─────────────────────────────────────────────────────────────────── */

const ceilTo = (min, step) => Math.ceil(min / step) * step;

export function openStatus(now = londonNow()) {
  const h = hoursFor(now.weekday);
  const open = toMin(h.open), close = toMin(h.close);
  if (now.minutes >= open && now.minutes < close) return { open: true, text: `Open now until ${timeText(h.close)}`, short: `Open until ${timeText(h.close)}` };
  if (now.minutes < open) return { open: false, text: `Closed now, opens at ${timeText(h.open)}`, short: `Opens at ${timeText(h.open)}` };
  const next = hoursFor(weekdayOf(addDays(now.date, 1)));
  return { open: false, text: `Closed now, opens tomorrow at ${timeText(next.open)}`, short: `Opens tomorrow ${timeText(next.open)}` };
}

/** Contract A's ordering day. */
export function orderingFor(now = londonNow()) {
  if (now.minutes < toMin(CAFE.lastOrderBefore)) {
    const h = hoursFor(now.weekday);
    const earliest = Math.max(toMin(h.open), ceilTo(now.minutes + CAFE.leadMinutes, CAFE.stepMinutes));
    return { date: now.date, day_label: 'Today', earliest: toHHMM(earliest), latest: CAFE.latestCollection, open: h.open };
  }
  const date = addDays(now.date, 1);
  const h = hoursFor(weekdayOf(date));
  return { date, day_label: 'Tomorrow', earliest: h.open, latest: CAFE.latestCollection, open: h.open };
}

export function collectionTimes(of = orderingFor()) {
  const out = [];
  for (let m = toMin(of.earliest); m <= toMin(of.latest); m += CAFE.stepMinutes) out.push(toHHMM(m));
  return out;
}

/* ── Basket ───────────────────────────────────────────────────────────────── */

function lineView(l) {
  const unit = unitPence(l);
  return {
    line_id: l.line_id, item: l.item, name: MENU[l.item].name, quantity: l.quantity,
    size: l.size, milk: l.milk, extra_shots: l.extra_shots, syrup: l.syrup,
    label: lineLabel(l), unit_pence: unit, line_pence: unit * l.quantity,
  };
}

export function basket() {
  const lines = state.lines.map(lineView);
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const total = lines.reduce((n, l) => n + l.line_pence, 0);
  return { lines, count, total_pence: total, total_text: gbp(total) };
}

const ordering = () => { const o = orderingFor(); return { date: o.date, day_label: o.day_label, earliest: o.earliest, latest: o.latest }; };

const same = (l, o) => l.item === o.item && l.size === o.size && l.milk === o.milk && l.extra_shots === o.extra_shots && l.syrup === o.syrup;

/** Adds an item (options already in range). Throws EmbedError invalid_args / basket_full. */
export function addItem(opts, { source = 'visitor' } = {}) {
  const o = { item: opts.item, quantity: opts.quantity, size: opts.size, milk: opts.milk, extra_shots: opts.extra_shots, syrup: opts.syrup };
  const bad = optionProblem(o);
  if (bad) throw new EmbedError('invalid_args', bad.message);
  const count = state.lines.reduce((n, l) => n + l.quantity, 0);
  const existing = state.lines.find((l) => same(l, o));
  if (existing && existing.quantity + o.quantity > CAFE.maxPerLine) {
    throw new EmbedError('basket_full', `One line can have at most ${CAFE.maxPerLine}, and you already have ${existing.quantity} of those.`);
  }
  if (!existing && state.lines.length >= CAFE.maxLines) {
    throw new EmbedError('basket_full', `An order can have at most ${CAFE.maxLines} different lines, and this one is full.`);
  }
  if (count + o.quantity > CAFE.maxItems) {
    throw new EmbedError('basket_full', `An order can have at most ${CAFE.maxItems} items, and this would make ${count + o.quantity}.`);
  }
  let line;
  if (existing) { existing.quantity += o.quantity; line = existing; }
  else { line = { line_id: `l${state.nextLine++}`, ...o }; state.lines.push(line); }
  state.placed = null;
  const b = basket();
  const result = {
    line: lineView(line),
    basket: b,
    ordering_for: ordering(),
    card_text: `Added to your order: ${linePhrase(o)}. Basket ${b.total_text}.`,
  };
  changed('add', { line_id: line.line_id, source, text: result.card_text });
  return result;
}

/** Why the quantity of this line can't go up, or '' if it can. */
export function cannotIncrease(line_id) {
  const l = state.lines.find((x) => x.line_id === line_id);
  if (!l) return 'That line has gone.';
  if (l.quantity >= CAFE.maxPerLine) return `${CAFE.maxPerLine} is the most for one line.`;
  if (basket().count >= CAFE.maxItems) return `${CAFE.maxItems} items is the most for one order.`;
  return '';
}

export function changeQuantity(line_id, delta) {
  const l = state.lines.find((x) => x.line_id === line_id);
  if (!l) throw new EmbedError('not_found', 'That line isn’t in the order.');
  if (delta > 0 && cannotIncrease(line_id)) throw new EmbedError('basket_full', cannotIncrease(line_id));
  l.quantity += delta;
  if (l.quantity <= 0) state.lines = state.lines.filter((x) => x !== l);
  changed('quantity', { line_id });
}

export function removeLine(line_id) {
  const before = state.lines.length;
  state.lines = state.lines.filter((x) => x.line_id !== line_id);
  if (state.lines.length !== before) changed('remove', { line_id });
}

/* ── Collection time ──────────────────────────────────────────────────────── */

export function collection() {
  return state.collection ? { date: state.collection.date, time: state.collection.time, time_text: timeText(state.collection.time) } : null;
}

export function setCollection(time, { source = 'visitor' } = {}) {
  const of = orderingFor();
  const m = toMin(time);
  const dayWord = of.day_label === 'Today' ? 'today' : 'tomorrow';
  if (m < toMin(of.open) || m > toMin(of.latest)) {
    throw new EmbedError('closed', `Collection ${dayWord} is between ${timeText(of.open)} and ${timeText(of.latest)}.`);
  }
  if (m < toMin(of.earliest)) {
    throw new EmbedError('too_soon', `The earliest collection ${dayWord} is ${timeText(of.earliest)}.`);
  }
  state.collection = { date: of.date, time };
  state.placed = null;
  const result = {
    date: of.date, day_label: of.day_label, time, time_text: timeText(time), basket: basket(),
    card_text: `Collection set: ${dayWord} at ${timeText(time)}. Pay when you collect.`,
  };
  changed('collection', { source, text: result.card_text });
  return result;
}

export function clearCollection() {
  if (!state.collection) return;
  state.collection = null;
  changed('collection', {});
}

/** Drops a collection time that is no longer possible (time moves on). */
export function revalidate() {
  if (!state.collection) return false;
  const of = orderingFor();
  if (state.collection.date !== of.date || toMin(state.collection.time) < toMin(of.earliest)) {
    notice = `${timeText(state.collection.time)} has passed, so please choose another collection time.`;
    state.collection = null;
    changed('expired', {});
    return true;
  }
  return false;
}

/* ── Placing the order (a demo: nothing is sent) ──────────────────────────── */

export function placeOrder() {
  const b = basket();
  if (!b.count) throw new EmbedError('not_found', 'Your order is empty.');
  revalidate();
  const c = collection();
  if (!c) throw new EmbedError('invalid_args', 'Choose a collection time first.');
  const drinks = b.lines.filter((l) => MENU[l.item].kind === 'drink').reduce((n, l) => n + l.quantity, 0);
  const room = CAFE.stampsToFill - state.stamps;
  const stamped = Math.min(room, drinks);
  state.stamps += stamped;
  const of = orderingFor();
  state.placed = {
    ref: makeRef('MC'), date: c.date, time: c.time, day_label: c.date === of.date ? of.day_label : dayLabel(c.date),
    lines: b.lines.map((l) => ({ label: l.label, quantity: l.quantity, line_pence: l.line_pence })),
    total_text: b.total_text, stamped,
  };
  state.lines = [];
  state.collection = null;
  changed('placed', { stamped });
  return state.placed;
}

export const placed = () => state.placed;

export function newOrder() {
  if (!state.placed) return;
  state.placed = null;
  changed('new-order', {});
}

/** Contract A reset: empties the basket, clears the collection time (and any placed-order card). */
export function resetOrder() {
  state.lines = [];
  state.collection = null;
  state.placed = null;
  changed('reset', {});
}

/* ── Loyalty card ─────────────────────────────────────────────────────────── */

export const stamps = () => state.stamps;
export function addStamp() {
  if (state.stamps >= CAFE.stampsToFill) return false;
  state.stamps += 1;
  changed('stamp', { stamped: 1 });
  return true;
}
export function newCard() {
  state.stamps = 0;
  changed('card', {});
}

/* ── Contract A get_state ─────────────────────────────────────────────────── */

export function getState() {
  const now = londonNow();
  return {
    business: 'cafe',
    now: { date: now.date, time: now.time, weekday: now.weekday },
    open_now: openStatus(now).open,
    ordering_for: ordering(),
    basket: basket(),
    collection: collection(),
  };
}

export { dayLabel, timeText };
