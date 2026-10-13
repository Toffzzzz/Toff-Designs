/*
 * Hart & Sons: the page's state, kept in sessionStorage only (a demo: nothing is sent).
 * { request, quote, form, iq } where
 *   request: the visit request (Contract A request_visit result, with expires_at) or null
 *   quote:   the chosen price-list line (quote_from_list result) or null
 *   form:    the booking form's choices { job, pc, date, window }
 *   iq:      the instant quote's answers { job, size, soon, extras[] }
 */
const KEY = 'hart-and-sons:v1';

function read() {
  try {
    const raw = sessionStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : null;
    return data && typeof data === 'object' ? data : {};
  } catch { return {}; }
}

const saved = read();

export const store = {
  request: saved.request || null,
  quote: saved.quote || null,
  form: Object.assign({ job: '', pc: '', date: '', window: '' }, saved.form || {}),
  iq: Object.assign({ job: '', size: '', soon: '', extras: [] }, saved.iq || {}),
};

export function save() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ request: store.request, quote: store.quote, form: store.form, iq: store.iq }));
  } catch { /* storage switched off: the page still works for this visit */ }
}

/* A tiny change feed so the message API can announce state after the visitor's own changes. */
const fns = new Set();
export const onChange = (fn) => { fns.add(fn); return () => fns.delete(fn); };
export function changed() {
  save();
  for (const fn of fns) { try { fn(); } catch (err) { console.error(err); } }
}
