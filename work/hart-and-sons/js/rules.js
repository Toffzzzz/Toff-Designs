/*
 * Hart & Sons Plumbing: the business's facts and booking rules (plan section 10.8).
 * One source for the visitor's form and the message API, so both behave the same.
 * Facts unchanged from assets/studio/aiassist.js: west London from Paddington out to
 * Ealing; Monday to Saturday 8am to 6pm, emergency call-outs only on Sunday; boiler
 * service £95; emergency call-out £120, then £60 an hour; quote visit free; anyone who
 * smells gas calls the gas emergency line (0800 111 999) first.
 */
import { EmbedError, addDays, weekdayOf, dayLabel, isBusy } from '../../../assets/shared/embed-api.js';

export const GAS_LINE = '0800 111 999';

/** Covered postcode districts (the same list the map, the postcode check and request_visit use). */
export const DISTRICTS = Object.freeze({
  W2: 'Paddington', W3: 'Acton', W4: 'Chiswick', W5: 'Ealing', W6: 'Hammersmith', W7: 'Hanwell',
  W8: 'Kensington', W9: 'Maida Vale', W10: 'North Kensington', W11: 'Notting Hill',
  W12: 'Shepherd’s Bush', W13: 'West Ealing', W14: 'West Kensington',
});

/** The price list. Keys are Contract A's job keys. */
export const PRICE_LIST = Object.freeze({
  boiler_service: {
    name: 'Boiler service', price_pence: 9500, price_text: '£95',
    detail: 'A yearly service, with a full safety check.',
  },
  emergency_callout: {
    name: 'Emergency call-out', price_pence: 12000, price_text: '£120, then £60 an hour',
    detail: `For leaks, no heating or no hot water, any time. If you smell gas, call ${GAS_LINE} first.`,
  },
  quote_visit: {
    name: 'Quote visit', price_pence: 0, price_text: 'Free',
    detail: 'We come, look at the job and tell you the price before any work starts.',
  },
  other: {
    name: 'Anything else', price_pence: null, price_text: 'Free quote visit',
    detail: 'Anything bigger gets a free quote visit.',
  },
});

export const VISIT_JOBS = ['boiler_service', 'emergency_callout', 'quote_visit'];
export const QUOTE_JOBS = ['boiler_service', 'emergency_callout', 'quote_visit', 'other'];
export const WINDOW_KEYS = ['morning', 'afternoon', 'asap'];

export const WINDOWS = Object.freeze({
  morning: { name: 'Morning', text: '8am to 12pm', start: '08:00', cutoff: 11 * 60, cutoffText: '11am' },
  afternoon: { name: 'Afternoon', text: '12pm to 6pm', start: '12:00', cutoff: 17 * 60, cutoffText: '5pm' },
  asap: { name: 'As soon as possible', text: 'as soon as possible' },
});

export const DAYS_AHEAD = 13;               // today to today + 13 days
export const HOLD_SECONDS = 600;            // a request lasts 10 minutes
export const POSTCODE_DISTRICT = /^[A-Z]{1,2}[0-9]{1,2}[A-Z]?$/;

const lc = (s) => s.charAt(0).toLowerCase() + s.slice(1);

/** Card text for a price-list line (quote_from_list). */
export function quoteCardText(job) {
  if (job === 'other') return 'Anything not on the price list gets a free quote visit.';
  const item = PRICE_LIST[job];
  return `From the price list: ${lc(item.name)}, ${item.price_text === 'Free' ? 'free' : item.price_text}.`;
}

/** The quote_from_list result (also what get_state returns as `quote`). */
export function quoteFor(job) {
  const item = PRICE_LIST[job];
  return {
    job, job_name: item.name, price_text: item.price_text, price_pence: item.price_pence,
    detail: item.detail, card_text: quoteCardText(job),
  };
}

/** Postcode text (full or first half, any case and spacing) -> { district } or { error }. */
export function parsePostcode(text) {
  const s = String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!s) return { district: '' };
  let outward = null;
  if (/^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(s)) outward = s.slice(0, -3);
  else if (/^[A-Z]{1,2}[0-9][A-Z0-9]?$/.test(s)) outward = s;
  if (!outward || !POSTCODE_DISTRICT.test(outward)) return { error: 'That doesn’t look like a UK postcode. Try the first half, like W5.' };
  return { district: outward };
}

export const isCovered = (district) => Object.prototype.hasOwnProperty.call(DISTRICTS, district);

export function outOfAreaMessage(district) {
  return `Hart & Sons cover west London from Paddington out to Ealing; ${district} is outside that.`;
}

/**
 * Whether one window can be requested. now = londonNow().
 * Returns { ok: true } or { ok: false, code, message, short } (short: the few words shown on the option).
 */
export function windowStatus(job, date, win, now, { ignoreBusy = false } = {}) {
  const today = now.date;
  const last = addDays(today, DAYS_AHEAD);
  if (win === 'asap') {
    if (job !== 'emergency_callout') return { ok: false, code: 'invalid_args', short: 'Emergencies only', message: 'The window "asap" is only for an emergency call-out today.' };
    if (date !== today) return { ok: false, code: 'invalid_args', short: 'Today only', message: 'The window "asap" is only for an emergency call-out today.' };
    return { ok: true };
  }
  if (date < today) return { ok: false, code: 'too_soon', short: 'Passed', message: 'That date has already passed.' };
  if (date > last) return { ok: false, code: 'too_far', short: 'Too far ahead', message: `Visits can be requested up to two weeks ahead, until ${dayLabel(last)}.` };
  if (weekdayOf(date) === 'Sunday' && job !== 'emergency_callout') {
    return { ok: false, code: 'closed', short: 'Emergencies only', message: 'On Sundays Hart & Sons only do emergency call-outs.' };
  }
  const w = WINDOWS[win];
  if (date === today && now.minutes >= w.cutoff) {
    return { ok: false, code: 'too_soon', short: 'Too late today', message: `Today’s ${w.name.toLowerCase()} window can only be requested until ${w.cutoffText}.` };
  }
  if (!ignoreBusy && isBusy(date, 'van', w.start, 3)) {
    return { ok: false, code: 'not_free', short: 'Taken', message: `The van is already booked on ${dayLabel(date)}, ${w.text}.` };
  }
  return { ok: true };
}

/** The next window that can be requested for this job after (date, win), or null. */
export function nextFreeWindow(job, date, win, now) {
  const order = ['morning', 'afternoon'];
  let d = date < now.date ? now.date : date;
  let i = date < now.date ? 0 : order.indexOf(win) + 1;
  const last = addDays(now.date, DAYS_AHEAD);
  while (d <= last) {
    for (; i < order.length; i++) {
      if (windowStatus(job, d, order[i], now).ok) return { date: d, window: order[i] };
    }
    d = addDays(d, 1);
    i = 0;
  }
  return null;
}

/** Checks a visit request; throws an EmbedError with the contract's code, or returns nothing. */
export function checkRequest({ job, date, window: win, postcode_district: pd }, now) {
  if (win === 'asap' && job !== 'emergency_callout') throw new EmbedError('invalid_args', 'The window "asap" is only for an emergency call-out.');
  if (win === 'asap' && date !== now.date) throw new EmbedError('invalid_args', 'The window "asap" is only for an emergency call-out today.');
  if (pd && !isCovered(pd)) throw new EmbedError('out_of_area', outOfAreaMessage(pd));
  const status = windowStatus(job, date, win, now);
  if (status.ok) return;
  if (status.code === 'not_free') {
    const next = nextFreeWindow(job, date, win, now);
    const tail = next
      ? ` The next free window is ${dayLabel(next.date)}, ${WINDOWS[next.window].text}.`
      : ' There’s no free window in the next two weeks.';
    throw new EmbedError('not_free', status.message + tail);
  }
  throw new EmbedError(status.code, status.message);
}

/** The card text for a request (Contract A 10.8). */
export function requestCardText({ job, date, window: win }) {
  if (job === 'emergency_callout' && win === 'asap') {
    return `Emergency call-out requested for today. £120, then £60 an hour. If you smell gas, call ${GAS_LINE} first.`;
  }
  const item = PRICE_LIST[job];
  const price = item.price_text === 'Free' ? 'Free' : item.price_text;
  const gas = job === 'emergency_callout' ? ` If you smell gas, call ${GAS_LINE} first.` : '';
  return `Visit requested: ${lc(item.name)}, ${dayLabel(date)}, ${WINDOWS[win].text}. ${price}.${gas}`;
}
