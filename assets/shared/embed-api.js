/*
 * Toff Studio: embed-api.js, Contract A (round-05-plan.md section 10) for both sides.
 * The envelope, origin and source checks, one-at-a-time queue, ready/hello, state
 * throttling and time-outs live here, so a frame only writes its action handlers.
 * No dependencies. Importing it also adds class "is-embed" (and data-embed="<feature>")
 * to <html> when the address has ?embed=<feature>.
 *
 * ── In a concept site (the frame) ──────────────────────────────────────────────
 *
 *   import { serve, EmbedError, v, embedFeature } from '../../assets/shared/embed-api.js';
 *
 *   const api = serve({
 *     business: 'cafe',                       // 'cafe' | 'salon' | 'clinic' | 'trades'
 *     getState: () => ({ business: 'cafe', now: …, basket: … }),   // the get_state result
 *     actions: {
 *       // Preferred form: serve() checks args against the spec first (plain object,
 *       // exactly these keys, each valid), else replies invalid_args naming the key.
 *       add_to_order: {
 *         args: { item: v.oneOf(MENU_KEYS), quantity: v.int(1, 6), size: v.oneOf(['regular', 'large']),
 *                 milk: v.oneOf(MILKS), extra_shots: v.int(0, 2), syrup: v.oneOf(SYRUPS) },
 *         run: async (a) => {
 *           if (basketFull()) throw new EmbedError('basket_full', 'The basket can take 8 lines and 20 items.');
 *           const result = addLine(a);           // the same code path the visitor's button uses
 *           spotlight(document.querySelector('#basket'));
 *           return result;
 *         } },
 *       set_collection_time: { args: { time: v.time({ step: 5 }) }, run: async (a) => … },
 *       reset: { args: {}, run: async () => { clearAll(); return { cleared: true }; } },
 *       // A bare function also works: run(args) gets the raw (plain-object) args, unchecked.
 *     },
 *   });
 *   // After ANY change the visitor makes (clicks, typing, a hold expiring):
 *   api.notifyState();                        // throttled to one toff-state per 100ms
 *
 *   serve(options) -> { active, business, actions, notifyState(), dispose() }
 *     Active only when window.parent !== window; otherwise a no-op handle (active: false).
 *     Call it once the interface is built: it attaches its listener and posts toff-ready
 *     ({ business, actions, state }) straight away, and again on every toff-hello.
 *     get_state is built in (args {}, returns getState()) unless you supply your own.
 *     reset is required (Contract A 10.4): serve() throws a TypeError without it.
 *     Accepts a message only if event.origin === location.origin and
 *     event.source === window.parent, and only the envelope { type: 'toff-action',
 *     v: 1, id: '<1–64 chars>', action, args }; anything else is ignored silently.
 *     Requests run one at a time, in order; each gets exactly one toff-result.
 *     Unknown action -> unknown_action. Throw an EmbedError (or any object with a
 *     contract `code`) to reply with that code and message; any other exception is
 *     logged with console.error and replied as 'internal'. A handler still running
 *     after 2 seconds gets an 'internal' reply ("took too long") and the queue moves on.
 *     After each successful action other than get_state, toff-state is sent for you.
 *
 *   Writing handlers (Contract A "Behaviour"):
 *     - Change the site through the same functions the visitor's controls use, so the
 *       interface and sessionStorage end up exactly as if the visitor had done it.
 *     - spotlight(el) scrolls the changed part into view inside the frame (smooth, or
 *       instant with reduced motion) and adds class "is-spotlit" for 1.2 seconds: style
 *       that class in the site's own highlight style. It scrolls only the frame's window,
 *       never the parent page (element.scrollIntoView() can scroll the parent too).
 *     - Never call .focus() from a handler: focusing anything in the frame moves focus
 *       out of the parent page.
 *     - Return plain JSON-safe data (no DOM nodes, functions or class instances).
 *
 * ── On the home page (the parent) ──────────────────────────────────────────────
 *
 *   import { connect } from './assets/shared/embed-api.js';
 *   const frame = connect(iframeEl, { timeoutMs: 4000 });
 *   const info = await frame.ready;           // { business, actions, state }
 *   const off = frame.onState((state, business) => render(state));
 *   try { const result = await frame.call('add_to_order', { item: 'latte', … }); }
 *   catch (err) { err.code; err.message; }     // an EmbedError; JSON.stringify(err) -> { code, message }
 *   frame.dispose();                           // removes listeners, rejects anything pending with 'timeout'
 *
 *   connect(iframe, { timeoutMs = 4000, readyTimeoutMs = 15000 })
 *     -> { ready: Promise<{ business, actions, state }>, call(action, args = {}) -> Promise<result>,
 *          onState(fn) -> unsubscribe, dispose(), readyInfo (latest toff-ready, or null) }
 *     Sends toff-hello now and on every load of the iframe. Accepts a message only if
 *     event.origin === location.origin and event.source === iframe.contentWindow.
 *     Calls made before the first toff-ready are queued and sent when it arrives; a
 *     queued call rejects with 'timeout' if the frame isn't ready within readyTimeoutMs.
 *     A sent call rejects with 'timeout' if no reply comes within timeoutMs (4 s).
 *     `ready` never rejects. onState fns get (state, business) for every toff-state and
 *     toff-ready (a reloaded frame announces itself again).
 *
 * ── Helpers ────────────────────────────────────────────────────────────────────
 *
 *   isEmbed() -> boolean                     ?embed is in the address (any value)
 *   embedFeature() -> string | null          its value, e.g. 'order' (letters, digits, - and _ only)
 *     For no flash of the menu/ribbon before this module runs, put this in <head> too:
 *     <script>if(/[?&]embed(=|&|$)/.test(location.search))document.documentElement.classList.add('is-embed')</script>
 *   EmbedError(code, message?)               message defaults to a plain sentence for the code
 *   ERROR_CODES                              the contract's codes, plus 'internal'
 *   checkArgs(args, spec) -> args            what serve() runs for { args, run } entries
 *   v.oneOf(values)                          strict ===, so 1 and '1' differ (use for integer enums too)
 *   v.int(min, max)                          a whole number min..max
 *   v.string({ max = 200, min = 0, pattern })  text; pattern (a RegExp) must match the whole value;
 *                                            '' skips the pattern when min is 0 (e.g. postcode_district)
 *   v.date()                                 'YYYY-MM-DD', a real calendar date
 *   v.time({ step = 1 })                     'HH:MM', 24-hour, minutes a multiple of step (5, 30…)
 *   v.bool()                                 true or false
 *     Every validator is (value, name) -> value and throws EmbedError('invalid_args').
 *   spotlight(el, { className = 'is-spotlit', ms = 1200 })
 *   London time (Europe/London). In embed mode, ?now=YYYY-MM-DDTHH:MM (London) sets the
 *   clock at page load; it then runs on normally, so holds still expire:
 *     nowMs() -> epoch ms                    londonNow() -> { date, time, weekday, minutes, ms }
 *     londonParts(ms) -> same shape          londonToMs(date, time) -> epoch ms
 *     addDays(date, n) -> date               weekdayOf(date) -> 'Monday'…
 *     dayLabel(date) -> 'Thursday 16 October' timeText('09:30') -> '9.30am' ('18:00' -> '6pm', '12:00' -> '12pm')
 *     penceText(340) -> '£3.40' (5800 -> '£58')
 *   Availability (Contract A): fnv1a32(str) -> unsigned 32-bit;
 *     isBusy(date, resource, time, below = 4) -> fnv1a32(`${date}|${resource}|${time}`) % 10 < below
 *     (pass below = 3 for Hart & Sons' van). Held slots are yours to add.
 *   makeRef(prefix) -> 'AW-7K2Q'             a 4-character reference without 0/O/1/I
 */

const V = 1;
const REPLY_WITHIN_MS = 2000;
const STATE_GAP_MS = 100;
const LATE = Symbol('late');

/* ── Errors ─────────────────────────────────────────────────────────────────── */

export const ERROR_CODES = Object.freeze([
  'unknown_action', 'invalid_args', 'closed', 'too_soon', 'too_far', 'not_free',
  'patch_test', 'out_of_area', 'basket_full', 'not_found', 'timeout', 'internal',
]);

const DEFAULT_MESSAGES = {
  unknown_action: "That isn't something this site can do.",
  invalid_args: 'One of the details was missing or not allowed.',
  closed: "We're closed then.",
  too_soon: "That's too soon to book.",
  too_far: "That's too far ahead to book.",
  not_free: "That time isn't free.",
  patch_test: 'A first colour needs a patch test at least 48 hours before.',
  out_of_area: "That postcode isn't in the area covered.",
  basket_full: 'The basket is full.',
  not_found: "That couldn't be found.",
  timeout: "The site didn't answer in time.",
  internal: 'Something went wrong on the site. Please try again.',
};

// Codes a frame may reply with ('timeout' is the parent's alone).
const FRAME_CODES = new Set(ERROR_CODES.filter((c) => c !== 'timeout'));

export class EmbedError extends Error {
  constructor(code, message) {
    const text = typeof message === 'string' && message ? message : (DEFAULT_MESSAGES[code] || DEFAULT_MESSAGES.internal);
    super(text);
    this.name = 'EmbedError';
    // Own, enumerable fields so the error survives JSON.stringify and spreading.
    Object.defineProperty(this, 'code', { value: String(code), enumerable: true, writable: true, configurable: true });
    Object.defineProperty(this, 'message', { value: text, enumerable: true, writable: true, configurable: true });
  }
  toJSON() { return { code: this.code, message: this.message }; }
}

const invalid = (message) => new EmbedError('invalid_args', message);

/* ── Embed mode ─────────────────────────────────────────────────────────────── */

const PARAMS = new URLSearchParams(location.search);
const EMBED = PARAMS.has('embed');
const RAW_FEATURE = PARAMS.get('embed') || '';
const FEATURE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/.test(RAW_FEATURE) ? RAW_FEATURE : null;

if (EMBED) {
  document.documentElement.classList.add('is-embed');
  if (FEATURE) document.documentElement.dataset.embed = FEATURE;
}

export const isEmbed = () => EMBED;
export const embedFeature = () => (EMBED ? FEATURE : null);

/* ── Argument checks ────────────────────────────────────────────────────────── */

function isPlainObject(x) {
  if (x === null || typeof x !== 'object' || Array.isArray(x)) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === null || proto === Object.prototype || Object.getPrototypeOf(proto) === null;
}

const list = (values) => values.map((x) => (typeof x === 'string' ? x : String(x))).join(', ');
const pad2 = (n) => String(n).padStart(2, '0');

export const v = Object.freeze({
  oneOf(values) {
    const allowed = [...values];
    return (value, name) => {
      if (!allowed.some((a) => a === value)) throw invalid(`The argument "${name}" must be one of: ${list(allowed)}.`);
      return value;
    };
  },
  int(min, max) {
    return (value, name) => {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
        throw invalid(`The argument "${name}" must be a whole number from ${min} to ${max}.`);
      }
      return value;
    };
  },
  string({ max = 200, min = 0, pattern = null } = {}) {
    return (value, name) => {
      if (typeof value !== 'string' || value.length > max || value.length < min) {
        throw invalid(min > 0
          ? `The argument "${name}" must be text of ${min} to ${max} characters.`
          : `The argument "${name}" must be text of at most ${max} characters.`);
      }
      if (pattern && value !== '') {
        const re = new RegExp(pattern.source, pattern.flags.replace('g', '').replace('y', ''));
        const m = value.match(re);
        if (!m || m[0] !== value) throw invalid(`The argument "${name}" isn't in the expected format.`);
      }
      return value;
    };
  },
  date() {
    return (value, name) => {
      const m = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (m) {
        const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
        if (d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]) return value;
      }
      throw invalid(`The argument "${name}" must be a date written as YYYY-MM-DD.`);
    };
  },
  time({ step = 1 } = {}) {
    return (value, name) => {
      const m = typeof value === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
      if (!m) throw invalid(`The argument "${name}" must be a 24-hour time written as HH:MM.`);
      if (+m[2] % step !== 0) throw invalid(`The argument "${name}" must be on a ${step}-minute step.`);
      return value;
    };
  },
  bool() {
    return (value, name) => {
      if (typeof value !== 'boolean') throw invalid(`The argument "${name}" must be true or false.`);
      return value;
    };
  },
});

/** Checks args against spec ({ key: validator }): a plain object with exactly the spec's
 *  keys, each valid. Throws EmbedError('invalid_args') naming the first bad argument.
 *  Returns a fresh object with the validated values, in the spec's order. */
export function checkArgs(args, spec) {
  if (!isPlainObject(args)) throw invalid('The arguments must be an object.');
  for (const key of Object.keys(args)) {
    if (!Object.prototype.hasOwnProperty.call(spec, key)) throw invalid(`The argument "${key}" isn't accepted here.`);
  }
  const out = {};
  for (const key of Object.keys(spec)) {
    if (!Object.prototype.hasOwnProperty.call(args, key) || args[key] === undefined) {
      throw invalid(`The argument "${key}" is missing.`);
    }
    out[key] = spec[key](args[key], key);
  }
  return out;
}

/* ── The frame: serve() ─────────────────────────────────────────────────────── */

export function serve({ business, actions = {}, getState = () => ({}) } = {}) {
  const inactive = { active: false, business, actions: [], notifyState() {}, dispose() {} };
  if (window.parent === window) return inactive;
  if (typeof business !== 'string' || !business) throw new TypeError('embed-api serve(): business is required.');
  if (!actions || !actions.reset) throw new TypeError('embed-api serve(): a reset action is required (Contract A 10.4).');

  // Normalise the action table: { name: { spec | null, run } }.
  const table = Object.create(null);
  const add = (name, entry) => {
    if (typeof entry === 'function') table[name] = { spec: null, run: entry };
    else if (entry && typeof entry.run === 'function') table[name] = { spec: entry.args || {}, run: entry.run };
    else throw new TypeError(`embed-api serve(): action "${name}" must be a function or { args, run }.`);
  };
  if (!Object.prototype.hasOwnProperty.call(actions, 'get_state')) add('get_state', { args: {}, run: () => getState() });
  for (const name of Object.keys(actions)) add(name, actions[name]);
  const names = Object.keys(table);

  const parent = window.parent;
  const origin = location.origin;
  let disposed = false;

  const post = (msg) => parent.postMessage(msg, origin);

  const readState = () => {
    try { return getState(); } catch (err) { console.error('[embed-api] getState() failed:', err); return null; }
  };

  const announce = () => {
    if (disposed) return;
    try { post({ type: 'toff-ready', v: V, business, actions: names.slice(), state: readState() }); }
    catch (err) { console.error('[embed-api] could not post toff-ready (is the state JSON-safe?):', err); }
  };

  // toff-state, at most one per 100ms; the state is read when it's sent, so it's the latest.
  let lastStateAt = -Infinity;
  let stateTimer = 0;
  const sendState = () => {
    stateTimer = 0;
    if (disposed) return;
    lastStateAt = performance.now();
    try { post({ type: 'toff-state', v: V, business, state: readState() }); }
    catch (err) { console.error('[embed-api] could not post toff-state (is the state JSON-safe?):', err); }
  };
  const notifyState = () => {
    if (disposed || stateTimer) return;
    const wait = lastStateAt + STATE_GAP_MS - performance.now();
    if (wait <= 0) sendState();
    else stateTimer = setTimeout(sendState, wait);
  };

  const errorFrom = (err) => {
    if (err && typeof err === 'object' && typeof err.code === 'string' && FRAME_CODES.has(err.code)) {
      const message = typeof err.message === 'string' && err.message ? err.message : DEFAULT_MESSAGES[err.code];
      return { code: err.code, message };
    }
    console.error('[embed-api] action failed:', err);
    return { code: 'internal', message: DEFAULT_MESSAGES.internal };
  };

  async function handle({ id, action, args }) {
    let replied = false;
    const reply = (body) => {
      if (replied || disposed) return;
      replied = true;
      try { post({ type: 'toff-result', v: V, id, ...body }); }
      catch (err) {
        console.error('[embed-api] could not post the result (is it JSON-safe?):', err);
        post({ type: 'toff-result', v: V, id, ok: false, error: { code: 'internal', message: DEFAULT_MESSAGES.internal } });
      }
    };

    const entry = typeof action === 'string' && action in table ? table[action] : null;
    if (!entry) {
      reply({ ok: false, error: { code: 'unknown_action', message: typeof action === 'string'
        ? `This site has no action called "${action.slice(0, 64)}".`
        : DEFAULT_MESSAGES.unknown_action } });
      return;
    }

    let runP;
    try {
      const checked = entry.spec ? checkArgs(args, entry.spec)
        : (isPlainObject(args) ? args : (() => { throw invalid('The arguments must be an object.'); })());
      runP = Promise.resolve(entry.run(checked));
    } catch (err) {
      reply({ ok: false, error: errorFrom(err) });
      return;
    }

    let timer = 0;
    const late = new Promise((resolve) => { timer = setTimeout(resolve, REPLY_WITHIN_MS, LATE); });
    try {
      const value = await Promise.race([runP, late]);
      if (value === LATE) {
        reply({ ok: false, error: { code: 'internal', message: 'The site took too long to answer.' } });
        if (action !== 'get_state') runP.then(notifyState, () => {});
        return;
      }
      reply({ ok: true, result: value === undefined ? {} : value });
      if (action !== 'get_state') notifyState();
    } catch (err) {
      reply({ ok: false, error: errorFrom(err) });
    } finally {
      clearTimeout(timer);
    }
  }

  let chain = Promise.resolve();
  const onMessage = (event) => {
    if (disposed || event.origin !== origin || event.source !== parent) return;
    const d = event.data;
    if (!isPlainObject(d) || d.v !== V) return;
    if (d.type === 'toff-hello') { announce(); return; }
    if (d.type !== 'toff-action') return;
    if (typeof d.id !== 'string' || d.id.length < 1 || d.id.length > 64) return;
    const job = { id: d.id, action: d.action, args: d.args };
    chain = chain.then(() => handle(job));
  };

  window.addEventListener('message', onMessage);
  announce();

  return {
    active: true,
    business,
    actions: names.slice(),
    notifyState,
    dispose() {
      disposed = true;
      clearTimeout(stateTimer);
      window.removeEventListener('message', onMessage);
    },
  };
}

/* ── The parent: connect() ──────────────────────────────────────────────────── */

export function connect(iframe, { timeoutMs = 4000, readyTimeoutMs = 15000 } = {}) {
  const origin = location.origin;
  const prefix = Math.random().toString(36).slice(2, 8);
  let seq = 0;
  let disposed = false;
  let readyInfo = null;
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });
  const pending = new Map();      // id -> job, sent and waiting for toff-result
  const queue = [];               // jobs waiting for the first toff-ready
  const stateFns = new Set();

  const post = (msg) => {
    const w = iframe.contentWindow;
    if (!w) return false;
    w.postMessage(msg, origin);
    return true;
  };
  const hello = () => { if (!disposed) { try { post({ type: 'toff-hello', v: V }); } catch { /* not loaded yet */ } } };

  const emitState = (state, business) => {
    for (const fn of [...stateFns]) {
      try { fn(state, business); } catch (err) { console.error('[embed-api] onState handler failed:', err); }
    }
  };

  const send = (job) => {
    pending.set(job.id, job);
    job.timer = setTimeout(() => {
      if (pending.delete(job.id)) job.reject(new EmbedError('timeout', DEFAULT_MESSAGES.timeout));
    }, timeoutMs);
    try {
      post({ type: 'toff-action', v: V, id: job.id, action: job.action, args: job.args });
    } catch (err) {
      clearTimeout(job.timer);
      pending.delete(job.id);
      job.reject(new EmbedError('invalid_args', "The details couldn't be sent to the site."));
    }
  };

  const onMessage = (event) => {
    const w = iframe.contentWindow;
    if (disposed || event.origin !== origin || !w || event.source !== w) return;
    const d = event.data;
    if (!isPlainObject(d) || d.v !== V) return;

    if (d.type === 'toff-result') {
      const job = typeof d.id === 'string' ? pending.get(d.id) : null;
      if (!job) return;
      pending.delete(d.id);
      clearTimeout(job.timer);
      if (d.ok === true) job.resolve(d.result);
      else {
        const e = isPlainObject(d.error) ? d.error : {};
        job.reject(new EmbedError(typeof e.code === 'string' ? e.code : 'internal', typeof e.message === 'string' ? e.message : undefined));
      }
    } else if (d.type === 'toff-ready') {
      if (typeof d.business !== 'string' || !Array.isArray(d.actions)) return;
      const first = !readyInfo;
      readyInfo = { business: d.business, actions: d.actions.filter((a) => typeof a === 'string'), state: d.state ?? null };
      if (first) {
        resolveReady(readyInfo);
        for (const job of queue.splice(0)) { clearTimeout(job.qtimer); send(job); }
      }
      emitState(readyInfo.state, readyInfo.business);
    } else if (d.type === 'toff-state') {
      if (readyInfo) readyInfo.state = d.state ?? null;
      emitState(d.state ?? null, typeof d.business === 'string' ? d.business : readyInfo && readyInfo.business);
    }
  };

  window.addEventListener('message', onMessage);
  iframe.addEventListener('load', hello);
  hello();

  return {
    ready,
    get readyInfo() { return readyInfo; },
    call(action, args = {}) {
      if (disposed) return Promise.reject(new EmbedError('timeout', 'The demo has been closed.'));
      return new Promise((resolve, reject) => {
        const job = { id: `${prefix}-${++seq}`, action, args, resolve, reject, timer: 0, qtimer: 0 };
        if (readyInfo) { send(job); return; }
        job.qtimer = setTimeout(() => {
          const i = queue.indexOf(job);
          if (i >= 0) { queue.splice(i, 1); reject(new EmbedError('timeout', "The demo didn't load in time.")); }
        }, readyTimeoutMs);
        queue.push(job);
      });
    },
    onState(fn) {
      stateFns.add(fn);
      return () => stateFns.delete(fn);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      window.removeEventListener('message', onMessage);
      iframe.removeEventListener('load', hello);
      const closed = () => new EmbedError('timeout', 'The demo has been closed.');
      for (const job of pending.values()) { clearTimeout(job.timer); job.reject(closed()); }
      for (const job of queue) { clearTimeout(job.qtimer); job.reject(closed()); }
      pending.clear();
      queue.length = 0;
      stateFns.clear();
    },
  };
}

/* ── Behaviour helper ───────────────────────────────────────────────────────── */

const spotTimers = new WeakMap();

/** Scrolls el into view inside this window only (never the parent page) and marks it
 *  with className for ms. Style the class in the site's own highlight style. */
export function spotlight(el, { className = 'is-spotlit', ms = 1200 } = {}) {
  if (!el || !el.getBoundingClientRect) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const offset = r.height < vh - 32 ? (vh - r.height) / 2 : 16;
  const top = Math.max(0, Math.round(window.scrollY + r.top - offset));
  if (Math.abs(top - window.scrollY) > 2) {
    try { window.scrollTo({ top, behavior: reduce ? 'instant' : 'smooth' }); }
    catch { window.scrollTo(0, top); }
  }
  clearTimeout(spotTimers.get(el));
  el.classList.remove(className);
  void el.offsetWidth; // restart any CSS animation on the class
  el.classList.add(className);
  spotTimers.set(el, setTimeout(() => el.classList.remove(className), ms));
}

/* ── London time, money, availability ───────────────────────────────────────── */

const TZ = 'Europe/London';
const PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', weekday: 'long', hourCycle: 'h23',
});
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function londonParts(ms = Date.now()) {
  const p = {};
  for (const { type, value } of PARTS.formatToParts(new Date(ms))) p[type] = value;
  const hour = +p.hour % 24;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${pad2(hour)}:${p.minute}`, weekday: p.weekday, minutes: hour * 60 + +p.minute, ms };
}

/** London wall-clock date ('YYYY-MM-DD') and time ('HH:MM') -> epoch ms. */
export function londonToMs(date, time = '00:00') {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const want = Date.UTC(y, mo - 1, d, h, mi);
  let t = want;
  for (let i = 0; i < 3; i++) {
    const p = londonParts(t);
    const [py, pm, pd] = p.date.split('-').map(Number);
    const got = Date.UTC(py, pm - 1, pd, Math.floor(p.minutes / 60), p.minutes % 60);
    if (got === want) break;
    t += want - got;
  }
  return t;
}

const NOW_MATCH = EMBED && /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(PARAMS.get('now') || '');
const CLOCK_OFFSET = NOW_MATCH ? londonToMs(NOW_MATCH[1], NOW_MATCH[2]) - Date.now() : 0;

export const nowMs = () => Date.now() + CLOCK_OFFSET;
export const londonNow = () => londonParts(nowMs());

export function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
}

export function weekdayOf(date) {
  const [y, m, d] = date.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function dayLabel(date) {
  const [, m, d] = date.split('-').map(Number);
  return `${weekdayOf(date)} ${d} ${MONTHS[m - 1]}`;
}

export function timeText(time) {
  const [h, m] = time.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? '.' + pad2(m) : ''}${h < 12 ? 'am' : 'pm'}`;
}

export function penceText(pence) {
  const pounds = Math.floor(pence / 100);
  const rest = pence % 100;
  return `£${pounds.toLocaleString('en-GB')}${rest ? '.' + pad2(rest) : ''}`;
}

const ENC = new TextEncoder();
export function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (const byte of ENC.encode(str)) {
    h ^= byte;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const isBusy = (date, resource, time, below = 4) => fnv1a32(`${date}|${resource}|${time}`) % 10 < below;

const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makeRef(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return `${prefix}-${[...bytes].map((b) => REF_CHARS[b % REF_CHARS.length]).join('')}`;
}
