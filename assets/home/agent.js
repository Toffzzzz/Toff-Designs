/*
 * Toff Studio: the home page's AI chapter (round-05.md 7.1 point 4; plan section 3, screens 6 and 7).
 * "Your website can answer your customers for you" (the heading and lede are static in index.html;
 * the "Other AI we build" list is too). This module builds the demo under them:
 *
 *   - Café · Salon · Clinic · Plumber (Morrow Coffee, Atelier Wren, Linden Clinic, Hart & Sons Plumbing),
 *     each with its opening exchanges already shown, suggestion chips, and the editable
 *     "What it's been taught" panel (every answer names the facts it used; after an edit, "Ask that again").
 *   - Beside the chat, the business's own website in a phone-sized frame (Contract A, plan section 10):
 *     work/morrow/?embed=order, work/atelier-wren/?embed=booking, work/hart-and-sons/?embed=visit and
 *     assets/home/demo/linden.html?embed=booking. A frame loads only when the section is within 600px.
 *   - Live through the Worker's /agent (settings.js ai.agentEndpoint; plan section 13): answers stream in
 *     word by word; each tool_call is carried out on the site in the frame through embed-api.js connect(),
 *     the chat shows a confirmation card, and the result goes back as a tool_result (at most 3 tool rounds
 *     per answer; one answer, however many round trips, counts as one of ai.maxLiveAnswers per visit).
 *     ai.firstWordTimeoutMs until the first streamed event.
 *   - Without the Worker (blocked, off, a time-out, or the live answers used up), the same actions run from
 *     on-page rules (assets/studio/aiassist.js, AIAssist.act) with the same cards, and the header says so.
 *
 *   import { mount } from './assets/home/agent.js';
 *   const demo = await mount(el, { settings: window.TOFF_SETTINGS, shell: window.ToffShell });
 *   demo.choose('salon'); await demo.ask('Can I get a cut on Thursday evening?'); demo.state(); demo.destroy();
 *
 * Options (ctx): settings, shell, start ('cafe' by default), frameQuery (appended to every frame address,
 * for tests: e.g. 'now=2026-10-14T09:00').
 */
import { connect, londonNow } from '../shared/embed-api.js';
import { fadeUp, reducedMotion } from '../shared/motion.js';

const ORDER = ['cafe', 'salon', 'clinic', 'trades'];
const KIND = { cafe: 'Café', salon: 'Salon', clinic: 'Clinic', trades: 'Plumber' };
const FRAME = {
  cafe: '../../work/morrow/?embed=order',
  salon: '../../work/atelier-wren/?embed=booking',
  clinic: './demo/linden.html?embed=booking',
  trades: '../../work/hart-and-sons/?embed=visit',
};
const SITE = {
  cafe: { href: '../../work/morrow/', about: 'Morrow Coffee’s own website, a concept site we built. This is its order page.' },
  salon: { href: '../../work/atelier-wren/', about: 'Atelier Wren’s own website, a concept site we built. This is its booking page.' },
  clinic: { href: './demo/linden.html', about: 'Linden Clinic’s booking page, a small page we built for this demo.' },
  trades: { href: '../../work/hart-and-sons/', about: 'Hart & Sons’ own website, a concept site we built. This is its visit booking.' },
};
const TOOLS = {   // the Worker's tools for each business (plan 10.9); anything else is refused here too
  cafe: ['add_to_order', 'set_collection_time'],
  salon: ['find_free_times', 'hold_booking'],
  clinic: ['find_free_times', 'book_appointment'],
  trades: ['request_visit', 'quote_from_list'],
};
const MAX_ROUNDS = 3;
const MAX_HISTORY = 8;
const STALL_MS = 20000;
const USED_KEY = 'toff-agent-live-used';

const MODE_TEXT = {
  live: 'Live: answered by Claude, an AI. Questions go to Anthropic to be answered and aren’t stored. Please don’t type personal details.',
  page: 'Worked out on this page, without a live AI: replies come from simple rules and what it’s been taught.',
  failed: 'Worked out on this page: the live AI isn’t answering right now, so replies come from simple rules and what it’s been taught.',
  used: 'Worked out on this page: that was the last live answer for this visit, so replies now come from simple rules and what it’s been taught.',
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class LiveError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}

function loadCss(href) {
  if (document.querySelector(`link[data-agent-css]`)) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.agentCss = '';
    link.onload = link.onerror = () => resolve();
    document.head.appendChild(link);
    setTimeout(resolve, 2500);
  });
}

async function loadEngine() {
  if (!window.AIAssist || !window.AIAssist.act) await import(new URL('../studio/aiassist.js', import.meta.url).href);
  return window.AIAssist;
}

// A copy of the businesses the visitor can edit (keeps the RegExps).
function cloneData(src) {
  return JSON.parse(JSON.stringify(src, (k, v) => (v instanceof RegExp ? { __re: v.source } : v)), (k, v) => (v && v.__re ? new RegExp(v.__re) : v));
}

function readUsed() { try { return +sessionStorage.getItem(USED_KEY) || 0; } catch { return 0; } }
function writeUsed(n) { try { sessionStorage.setItem(USED_KEY, String(n)); } catch { /* storage off: counted in memory */ } }

/** Trims Messages-API history from the front: at most max messages, starting on a visitor's own words
 *  (so tool_use / tool_result pairs are never split). */
export function trimHistory(list, max = MAX_HISTORY) {
  const out = list.slice();
  while (out.length && (out.length > max || !(out[0].role === 'user' && typeof out[0].content === 'string'))) out.shift();
  return out;
}

function parseBlock(block) {
  let event = 'message';
  const data = [];
  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) continue;
    const i = line.indexOf(':');
    const field = i < 0 ? line : line.slice(0, i);
    let value = i < 0 ? '' : line.slice(i + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
  }
  if (!data.length) return null;
  try { return { event, data: JSON.parse(data.join('\n')) }; } catch { return null; }
}

export async function mount(el, ctx = {}) {
  if (!el || el.dataset.agentMounted) return el && el.__agent;
  el.dataset.agentMounted = 'true';
  const S = ctx.settings || window.TOFF_SETTINGS || {};
  const AI = S.ai || {};
  const endpoint = typeof AI.agentEndpoint === 'string' ? AI.agentEndpoint : '';
  const maxLive = Number.isFinite(+AI.maxLiveAnswers) ? +AI.maxLiveAnswers : 8;
  const firstMs = +AI.firstWordTimeoutMs || 12000;
  const frameQuery = ctx.frameQuery ? String(ctx.frameQuery).replace(/^[?&]/, '') : '';
  const reduce = () => reducedMotion();

  const [, A] = await Promise.all([loadCss(new URL('./agent.css', import.meta.url).href), loadEngine()]);
  const data = cloneData(A.BUSINESSES);

  let mode = !endpoint ? 'page' : readUsed() >= maxLive ? 'used' : 'live';
  let key = ORDER.includes(ctx.start) ? ctx.start : 'cafe';
  let busy = false;
  let near = false;
  let destroyed = false;
  const per = {};      // key -> { log, history, asked:Set, last, offer, edited, frame }
  const timers = new Set();

  /* ---------- Structure ---------- */
  const uid = `ag${Math.random().toString(36).slice(2, 7)}`;
  el.classList.add('ag');
  if (!el.closest('.wrap')) el.classList.add('wrap');   // keeps to the page's content width wherever the mount point sits
  // If the chapter itself is already on deep midnight, the band needs no tone of its own.
  const bgOf = (n) => { for (; n && n !== document.documentElement; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c)) return c; } return ''; };
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;width:0;height:0;background:var(--bg-deep)';
  el.appendChild(probe);
  const deep = getComputedStyle(probe).backgroundColor;
  probe.remove();
  if (bgOf(el.parentElement) === deep) el.classList.add('ag--on-deep');
  el.innerHTML = `
    <div class="ag-switch" role="group" aria-label="Choose a business to try" data-fade>
      <span class="ag-switch__mark" aria-hidden="true"></span>
      ${ORDER.map((k) => `<button type="button" class="ag-seg" data-k="${k}" aria-pressed="false"><span class="ag-seg__kind">${KIND[k]}</span><span class="ag-seg__name">${esc(data[k].name)}</span></button>`).join('')}
    </div>
    <div class="ag-band" data-fade>
      <section class="ag-chat" aria-labelledby="${uid}-name">
        <header class="ag-head">
          <h3 class="ag-name" id="${uid}-name"></h3>
          <p class="ag-mode"><span class="ag-dot" aria-hidden="true"></span><span class="ag-mode__text"></span></p>
        </header>
        <div class="ag-logs"></div>
        <div class="ag-chips" role="group" aria-label="Things you could ask"></div>
        <form class="ag-form" autocomplete="off">
          <label class="visually-hidden" for="${uid}-q">Ask the assistant a question</label>
          <input id="${uid}-q" class="ag-input" type="text" maxlength="200" placeholder="Ask a question, or ask it to do something" enterkeyhint="send">
          <button type="submit" class="ag-ask">Ask</button>
        </form>
        <p class="ag-status" aria-hidden="true"></p>
        <p class="ag-note">A demo for a made-up business: nothing is booked, ordered or charged.</p>
      </section>
      <figure class="ag-site">
        <div class="ag-frame">
          <div class="ag-frame__state" role="status"></div>
        </div>
        <figcaption class="ag-cap">
          <p class="ag-cap__about"></p>
          <p class="ag-cap__can"></p>
          <a class="link-arrow ag-cap__link" href="#"><span>Open the whole site</span> <span class="arrow" aria-hidden="true">→</span></a>
        </figcaption>
      </figure>
      <aside class="ag-taught" aria-labelledby="${uid}-taught">
        <h3 class="ag-taught__title" id="${uid}-taught">What it’s been taught</h3>
        <button type="button" class="ag-taught__toggle" aria-expanded="false" aria-controls="${uid}-taught-body"><span>What it’s been taught</span><span class="ag-taught__chev" aria-hidden="true"></span></button>
        <div class="ag-taught__body" id="${uid}-taught-body">
          <p class="ag-taught__hint">Everything it says comes from here. Change a line, then ask again.</p>
          <div class="ag-facts"></div>
        </div>
      </aside>
    </div>
    <p class="visually-hidden" aria-live="polite" aria-atomic="true" data-ag-live></p>`;

  const q = (s) => el.querySelector(s);
  const switchEl = q('.ag-switch');
  const markEl = q('.ag-switch__mark');
  const segs = [...el.querySelectorAll('.ag-seg')];
  const nameEl = q('.ag-name');
  const modeEl = q('.ag-mode');
  const modeText = q('.ag-mode__text');
  const logs = q('.ag-logs');
  const chipsEl = q('.ag-chips');
  const form = q('.ag-form');
  const input = q('.ag-input');
  const askBtn = q('.ag-ask');
  const statusEl = q('.ag-status');
  const siteEl = q('.ag-site');
  const frameBox = q('.ag-frame');
  const frameState = q('.ag-frame__state');
  const capAbout = q('.ag-cap__about');
  const capCan = q('.ag-cap__can');
  const capLink = q('.ag-cap__link');
  const factsEl = q('.ag-facts');
  const taught = q('.ag-taught');
  const toggle = q('.ag-taught__toggle');
  const liveEl = q('[data-ag-live]');

  /* ---------- Small helpers ---------- */
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
  const announce = (text) => { liveEl.textContent = ''; later(() => { liveEl.textContent = text; }, 60); };
  const stacked = () => window.matchMedia('(max-width: 699px)').matches;
  const factsFor = (k) => {
    const b = data[k], out = [];
    b.hours.forEach((r) => out.push({ label: 'Opening hours', text: `${r.days}: ${r.value}`.slice(0, 200) }));
    b.prices.forEach((p) => out.push({ label: 'Prices', text: `${p.item}: ${p.value}`.slice(0, 200) }));
    b.facts.forEach((f) => out.push({ label: String(f.label).slice(0, 40), text: String(f.value).slice(0, 200) }));
    return out.slice(0, 24);
  };
  const siteLabel = (k) => `${data[k].name}’s website`;

  function setMode(m) {
    mode = m;
    modeEl.dataset.mode = m;
    modeText.textContent = MODE_TEXT[m];
  }

  /* ---------- The switch ---------- */
  function placeMark(instant) {
    const btn = segs.find((b) => b.dataset.k === key);
    if (!btn) return;
    markEl.classList.toggle('is-instant', !!instant || reduce());
    markEl.style.width = `${btn.offsetWidth}px`;
    markEl.style.height = `${btn.offsetHeight}px`;
    markEl.style.transform = `translate(${btn.offsetLeft}px, ${btn.offsetTop}px)`;
  }
  segs.forEach((b) => b.addEventListener('click', () => choose(b.dataset.k)));
  switchEl.addEventListener('keydown', (e) => {   // arrow keys move between the four, as in a segmented control
    const i = segs.indexOf(document.activeElement);
    if (i < 0 || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? segs.length - 1 : (i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + segs.length) % segs.length;
    segs[n].focus();
    choose(segs[n].dataset.k);
  });

  /* ---------- The taught panel ---------- */
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    taught.classList.toggle('is-open', open);
    if (open) fitFacts();
  });

  function factRow(label, value, onChange, isRow, hiddenLabel) {
    const row = document.createElement('label');
    row.className = 'ag-fact';
    const long = value.length > (isRow ? 22 : 34);
    row.innerHTML = `<span class="ag-fact__label${hiddenLabel ? ' visually-hidden' : ''}">${esc(label)}</span>`;
    const inp = document.createElement(long ? 'textarea' : 'input');
    if (long) inp.rows = 1; else inp.type = 'text';
    inp.className = 'ag-fact__input';
    inp.value = value;
    inp.maxLength = 160;
    inp.spellcheck = false;
    const fit = () => { if (long && inp.scrollHeight) { inp.style.height = 'auto'; inp.style.height = `${inp.scrollHeight + 2}px`; } };
    inp.addEventListener('input', () => {
      onChange(inp.value);
      fit();
      row.classList.add('is-edited');
      const st = per[key];
      st.edited = true;
      if (st.last) renderChips();
    });
    inp.addEventListener('keydown', (e) => { if (long && e.key === 'Enter') e.preventDefault(); });
    row.appendChild(inp);
    return row;
  }
  function renderFacts() {
    const b = data[key];
    factsEl.innerHTML = '';
    const group = (title, id) => {
      const g = document.createElement('div');
      g.className = 'ag-group';
      g.dataset.group = id;
      g.innerHTML = `<p class="ag-group__title">${esc(title)}</p>`;
      factsEl.appendChild(g);
      return g;
    };
    const g1 = group('Opening hours', 'Opening hours');
    g1.classList.add('ag-group--rows');
    b.hours.forEach((r) => g1.appendChild(factRow(r.days, r.value, (v) => { r.value = v; }, true)));
    const g2 = group('Prices', 'Prices');
    g2.classList.add('ag-group--rows');
    b.prices.forEach((p) => g2.appendChild(factRow(p.item, p.value, (v) => { p.value = v; }, true)));
    b.facts.forEach((f) => group(f.label, f.label).appendChild(factRow(f.label, f.value, (v) => { f.value = v; }, false, true)));
    requestAnimationFrame(fitFacts);
  }
  function fitFacts() {   // textareas grow to their text (again whenever the panel is shown or resized)
    for (const t of factsEl.querySelectorAll('textarea')) { t.style.height = 'auto'; if (t.scrollHeight) t.style.height = `${t.scrollHeight + 2}px`; }
  }
  function markUsed(labels) {
    for (const g of factsEl.querySelectorAll('.ag-group')) g.classList.toggle('is-used', labels.includes(g.dataset.group));
  }

  /* ---------- The conversation ---------- */
  function stateFor(k) {
    if (per[k]) return per[k];
    const log = document.createElement('ol');
    log.className = 'ag-log';
    log.dataset.k = k;
    log.setAttribute('aria-label', `Conversation with ${data[k].name}’s assistant`);
    log.tabIndex = 0;
    logs.appendChild(log);
    per[k] = { log, history: [], asked: new Set(), last: '', offer: null, edited: false, frame: null };
    // Two questions already asked, so nobody faces an empty box.
    const b = data[k];
    addBot(k, `Hello. I’m ${b.name}’s assistant, an AI. I can answer questions and do a few things on their website for you.`);
    for (const oq of b.openers || []) {
      const a = A.answer(k, b, oq, new Date());
      addVisitor(k, oq);
      addBot(k, a.text, a.src);
      per[k].asked.add(oq);
      per[k].history.push({ role: 'user', content: oq }, { role: 'assistant', content: a.text });
      per[k].last = oq;
    }
    return per[k];
  }
  const nearBottom = (log) => log.scrollHeight - log.scrollTop - log.clientHeight < 96;
  const toBottom = (log, force) => { if (force || nearBottom(log)) log.scrollTop = log.scrollHeight; };

  function addVisitor(k, text) {
    const log = per[k] ? per[k].log : logs.querySelector(`[data-k="${k}"]`);
    const li = document.createElement('li');
    li.className = 'ag-msg ag-msg--you';
    if (A.isSpanish(text)) li.lang = 'es';
    li.innerHTML = `<span class="visually-hidden">You: </span><p class="ag-text">${esc(text)}</p>`;
    log.appendChild(li);
    toBottom(log, true);
    return li;
  }
  function addBot(k, text, src) {
    const log = per[k] ? per[k].log : logs.querySelector(`[data-k="${k}"]`);
    const li = document.createElement('li');
    li.className = 'ag-msg ag-msg--bot';
    if (A.isSpanish(text)) li.lang = 'es';
    li.innerHTML = `<span class="visually-hidden">Assistant: </span><p class="ag-text">${esc(text)}</p>${src && src.length ? `<p class="ag-src">From: ${src.map(esc).join(', ')}</p>` : ''}`;
    log.appendChild(li);
    toBottom(log, true);
    return li;
  }

  /** An answer being written: words appear one by one at a natural reading pace. */
  function startAnswer(k) {
    const log = per[k].log;
    const li = document.createElement('li');
    li.className = 'ag-msg ag-msg--bot is-writing';
    li.setAttribute('aria-busy', 'true');
    li.innerHTML = '<span class="visually-hidden">Assistant: </span><p class="ag-text"><span class="ag-wait">One moment</span><span class="ag-caret" aria-hidden="true"></span></p><div class="ag-cards"></div>';
    log.appendChild(li);
    toBottom(log, true);
    const p = li.querySelector('.ag-text');
    const caret = li.querySelector('.ag-caret');
    const cards = li.querySelector('.ag-cards');
    const wait = li.querySelector('.ag-wait');
    let pending = '';      // a word still arriving
    const queue = [];
    let all = '';
    let pumping = false;
    let waiters = [];
    let cardCount = 0;

    const clean = (s) => s.replace(/\*\*|__|^#+\s*/g, '');
    const delayFor = (w) => (queue.length > 40 ? 12 : /[.!?]\s*$/.test(w) ? 150 : /[,;:]\s*$/.test(w) ? 70 : 34);
    function pump() {
      if (!queue.length) { pumping = false; waiters.splice(0).forEach((f) => f()); return; }
      pumping = true;
      if (wait.isConnected) wait.remove();
      const w = queue.shift();
      if (reduce()) {
        caret.before(document.createTextNode(w + queue.splice(0).join('')));
      } else {
        const span = document.createElement('span');
        span.className = 'ag-w';
        span.textContent = w;
        caret.before(span);
      }
      toBottom(log);
      if (destroyed) return;
      later(pump, reduce() ? 0 : delayFor(w));
    }
    function push(tokens) {
      for (const t of tokens) { queue.push(t); all += t; }
      if (!pumping && queue.length) pump();
    }
    return {
      li,
      write(text) {
        const s = clean(pending + String(text));
        const m = s.match(/[\s\S]*\s/);   // everything up to the last whitespace is complete words
        const done = m ? m[0] : '';
        pending = s.slice(done.length);
        if (done) push(done.match(/\S+\s*|\s+/g) || []);
      },
      space() { if (pending) { push([pending]); pending = ''; } if (all && !/\s$/.test(all)) push([' ']); },
      end() { if (pending) { push([pending]); pending = ''; } return this.flush(); },
      flush() { return queue.length || pumping ? new Promise((r) => waiters.push(r)) : Promise.resolve(); },
      text: () => (all + pending).trim(),
      hasText: () => !!(all + pending).trim(),
      hasCards: () => cardCount > 0,
      reset() { queue.length = 0; pending = ''; all = ''; for (const n of [...p.childNodes]) if (n !== caret) n.remove(); },
      card(text) {
        cardCount++;
        const c = document.createElement('div');
        c.className = 'ag-card';
        c.innerHTML = `<svg class="ag-card__tick" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4.5 10.5l3.6 3.4 7.4-8"/></svg><p class="ag-card__text">${esc(text)}</p><button type="button" class="ag-see">See it on their site <span aria-hidden="true">↓</span></button>`;
        c.querySelector('.ag-see').addEventListener('click', () => {
          siteEl.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });
        });
        cards.appendChild(c);
        toBottom(log, true);
      },
      finish(src, note) {
        caret.remove();
        if (wait.isConnected) wait.remove();
        li.classList.remove('is-writing');
        li.removeAttribute('aria-busy');
        const txt = this.text();
        if (A.isSpanish(txt)) li.lang = 'es';
        if (src && src.length) {
          const s = document.createElement('p');
          s.className = 'ag-src';
          s.textContent = `From: ${src.join(', ')}`;
          li.appendChild(s);
        }
        if (note) {
          const n = document.createElement('p');
          n.className = 'ag-src ag-fallback';
          n.textContent = note;
          li.appendChild(n);
        }
        toBottom(log);
        announce(txt + (note ? ` ${note}` : ''));
      },
    };
  }

  /* ---------- The chips ---------- */
  function renderChips() {
    const st = per[key];
    const b = data[key];
    chipsEl.innerHTML = '';
    const add = (text, ask, cls, label) => {
      const bt = document.createElement('button');
      bt.type = 'button';
      bt.className = `ag-chip${cls ? ` ${cls}` : ''}`;
      bt.textContent = text;
      if (label) bt.setAttribute('aria-label', label);
      if (A.isSpanish(text)) bt.lang = 'es';
      bt.addEventListener('click', () => { if (!busy) ask(); });
      chipsEl.appendChild(bt);
    };
    if (st.edited && st.last) add('Ask that again', () => askQ(st.last), 'ag-chip--again', `Ask that again: ${st.last}`);
    if (st.offer && st.offer.label) add(st.offer.label, () => askQ(st.offer.label), 'ag-chip--offer');
    const room = st.edited && st.last ? 3 : 4;
    (b.suggest || []).filter((c) => !st.asked.has(c)).slice(0, room).forEach((c) => add(c, () => askQ(c)));
    setBusy(busy);
  }
  function setBusy(on) {
    busy = on;
    askBtn.disabled = on;
    for (const c of chipsEl.children) c.setAttribute('aria-disabled', String(on));
    statusEl.textContent = on ? 'Answering. You can ask again once it has finished.' : '';
    statusEl.classList.toggle('is-on', on);
  }

  /* ---------- The frames ---------- */
  function frameFor(k) {
    const st = stateFor(k);
    if (st.frame) return st.frame;
    const iframe = document.createElement('iframe');
    iframe.className = 'ag-iframe';
    iframe.title = `${data[k].name}’s website, in a frame. The assistant changes it when it acts.`;
    iframe.setAttribute('referrerpolicy', 'same-origin');
    iframe.dataset.k = k;
    iframe.hidden = k !== key;
    frameBox.insertBefore(iframe, frameState);
    const api = connect(iframe, { timeoutMs: 4000, readyTimeoutMs: 10000 });
    const f = { iframe, api, status: 'loading', watchdog: 0 };
    st.frame = f;
    let src = new URL(FRAME[k], import.meta.url).href;
    if (frameQuery) src += (src.includes('?') ? '&' : '?') + frameQuery;
    api.ready.then(() => { f.status = 'ready'; clearTimeout(f.watchdog); if (k === key) showFrameState(); });
    f.watchdog = later(() => { if (f.status !== 'ready') { f.status = 'error'; if (k === key) showFrameState(); } }, 12000);
    iframe.src = src;
    if (k === key) showFrameState();
    fitFrame();
    return f;
  }
  function showFrameState() {
    const st = per[key];
    const f = st && st.frame;
    const name = data[key].name;
    let text = '';
    let s = 'idle';
    if (!f) { s = 'idle'; text = `${name}’s website appears here as you reach it.`; }
    else if (f.status === 'loading') { s = 'loading'; text = `Loading ${name}’s website…`; }
    else if (f.status === 'error') { s = 'error'; text = `${name}’s website didn’t load. The assistant still answers, but can’t show what it does.`; }
    else s = 'ready';
    frameBox.dataset.state = s;
    frameState.textContent = text;
  }
  function fitFrame() {
    const w = frameBox.clientWidth;
    const h = frameBox.clientHeight;
    const scale = w > 0 && w < 360 ? w / 360 : 1;
    for (const ifr of frameBox.querySelectorAll('iframe')) {
      if (scale < 1) {
        ifr.style.width = '360px';
        ifr.style.height = `${Math.round(h / scale)}px`;
        ifr.style.transform = `scale(${scale})`;
      } else {
        ifr.style.width = '100%';
        ifr.style.height = '100%';
        ifr.style.transform = '';
      }
    }
  }
  let lastFactsW = 0;
  const ro = new ResizeObserver(() => {
    fitFrame();
    placeMark(true);
    if (factsEl.clientWidth !== lastFactsW) { lastFactsW = factsEl.clientWidth; fitFacts(); }
  });
  ro.observe(frameBox);
  ro.observe(switchEl);
  ro.observe(factsEl);

  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { near = true; frameFor(key); io.disconnect(); }
  }, { rootMargin: '600px 0px' });
  io.observe(q('.ag-band'));   // the frame's address is set when the band is within 600px

  function markChanged() {
    frameBox.classList.remove('is-changed');
    void frameBox.offsetWidth;
    frameBox.classList.add('is-changed');
    later(() => frameBox.classList.remove('is-changed'), 1400);
  }

  function siteError(k) {
    return Object.assign(new Error(`${data[k].name}’s website didn’t load, so I can’t do that on it just now.`), { code: 'timeout' });
  }
  /** Contract A call on k's frame; shows the card when the result has one. */
  async function callSite(k, action, args, ans) {
    const f = frameFor(k);
    if (f.status === 'loading') await frameReady(k, 6000);
    if (f.status !== 'ready') throw siteError(k);
    const r = await f.api.call(action, args);
    if (action !== 'get_state' && action !== 'find_free_times' && r && typeof r.card_text === 'string') {
      ans.card(r.card_text);
      if (k === key) markChanged();
      announce(r.card_text);
    } else if (action === 'find_free_times' && k === key) markChanged();
    return r;
  }
  function frameToday(k) {
    const f = per[k] && per[k].frame;
    const s = f && f.api.readyInfo && f.api.readyInfo.state;
    return (s && s.now && /^\d{4}-\d{2}-\d{2}$/.test(s.now.date)) ? s.now.date : londonNow().date;
  }
  async function frameReady(k, ms = 8000) {
    const f = frameFor(k);
    if (f.status === 'ready' || f.status === 'error') return;
    await Promise.race([f.api.ready, sleep(ms)]);
  }

  /* ---------- Asking ---------- */
  async function runTool(k, call, ans) {
    const id = String(call && call.id || '');
    const name = String(call && call.name || '');
    const input = call && call.input && typeof call.input === 'object' && !Array.isArray(call.input) ? call.input : {};
    if (!TOOLS[k].includes(name)) {
      return { id, is_error: true, content: JSON.stringify({ error: { code: 'unknown_action', message: `This site has no action called "${name.slice(0, 64)}".` } }) };
    }
    try {
      const r = await callSite(k, name, input, ans);
      return { id, is_error: false, content: JSON.stringify(r === undefined ? {} : r) };
    } catch (e) {
      return { id, is_error: true, content: JSON.stringify({ error: { code: e && e.code ? String(e.code) : 'internal', message: e && e.message ? String(e.message) : 'The site couldn’t do that.' } }) };
    }
  }

  async function liveRound(body, onEvent) {
    const ctl = new AbortController();
    let timer = setTimeout(() => ctl.abort(), firstMs);
    const bump = () => { clearTimeout(timer); timer = setTimeout(() => ctl.abort(), STALL_MS); };
    try {
      const r = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        signal: ctl.signal, credentials: 'omit', cache: 'no-store',
      });
      const ct = r.headers.get('content-type') || '';
      if (!r.ok || !/text\/event-stream/i.test(ct) || !r.body) {
        let code = 'upstream';
        try { const j = await r.json(); if (j && j.error && j.error.code) code = String(j.error.code); } catch { /* not JSON */ }
        throw new LiveError(code);
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let first = true;
      for (;;) {
        const { value, done } = await reader.read();
        if (value) buf += dec.decode(value, { stream: !done }).replace(/\r\n/g, '\n');
        let cut;
        while ((cut = buf.indexOf('\n\n')) >= 0) {
          const ev = parseBlock(buf.slice(0, cut));
          buf = buf.slice(cut + 2);
          if (!ev) continue;
          if (first && (ev.event === 'text' || ev.event === 'tool_call' || ev.event === 'done')) first = false;
          if (!first) bump();
          onEvent(ev);
        }
        if (done) break;
      }
      if (buf.trim()) { const ev = parseBlock(buf); if (ev) onEvent(ev); }
    } catch (e) {
      if (e instanceof LiveError) throw e;
      if (ctl.signal.aborted) throw new LiveError('timeout');
      throw new LiveError('network');
    } finally {
      clearTimeout(timer);
    }
  }

  async function askLive(k, question, ans) {
    const st = per[k];
    const turn = [{ role: 'user', content: question }];
    let q = question;
    let rounds = 0;
    let sources = [];
    let acted = false;
    for (;;) {
      const body = { business: k, facts: factsFor(k), history: trimHistory(q ? st.history : st.history.concat(turn)), question: q };
      const calls = [];
      const results = [];
      let chain = Promise.resolve();
      let done = null;
      let failure = null;
      await liveRound(body, (ev) => {
        const d = ev.data || {};
        if (ev.event === 'text' && typeof d.text === 'string') ans.write(d.text);
        else if (ev.event === 'tool_call') {
          calls.push(d);
          if (rounds < MAX_ROUNDS) chain = chain.then(() => runTool(k, d, ans)).then((res) => { results.push(res); if (!res.is_error) acted = true; });
        } else if (ev.event === 'done') done = d;
        else if (ev.event === 'error') failure = new LiveError(String(d.code || 'upstream'), d.message);
      });
      await chain;
      if (failure) throw failure;
      if (!done) throw new LiveError('upstream');
      if (Array.isArray(done.sources)) sources = done.sources.map(String).slice(0, 4);
      const blocks = Array.isArray(done.assistant) ? done.assistant : [];
      if (done.stop_reason === 'tool_use' && calls.length && rounds < MAX_ROUNDS) {
        rounds++;
        if (blocks.length) turn.push({ role: 'assistant', content: blocks });
        turn.push({ role: 'user', content: results.map((r) => ({ type: 'tool_result', tool_use_id: r.id, content: r.content, is_error: r.is_error })) });
        q = '';
        ans.space();
        continue;
      }
      // The final turn: never keep a tool_use without its result in the history.
      const textOnly = blocks.filter((b) => b && b.type === 'text' && b.text);
      if (textOnly.length) turn.push({ role: 'assistant', content: textOnly });
      else turn.push({ role: 'assistant', content: ans.text() || 'Done.' });
      if (!ans.hasText()) ans.write(acted ? 'Done. You can see it on their site. ' : 'Sorry, I couldn’t do that just now. ');
      break;
    }
    st.history = st.history.concat(turn).slice(-24);
    if (acted && !sources.includes(siteLabel(k))) sources.push(siteLabel(k));
    return sources;
  }

  async function askOffline(k, question, ans) {
    const st = per[k];
    const b = data[k];
    let res = null;
    try {
      await frameReady(k, 3000);   // so "today" is the site's own today
      res = await A.act(k, b, question, { today: frameToday(k), offer: st.offer, call: (action, args) => callSite(k, action, args, ans) });
    } catch (e) {
      res = { text: e && e.message ? String(e.message) : 'I couldn’t do that on their site just now.', src: [] };
    }
    if (!res) res = A.answer(k, b, question, new Date());
    st.offer = res.offer || null;
    if (!reduce()) await sleep(260);
    ans.write(`${res.text} `);
    st.history.push({ role: 'user', content: question }, { role: 'assistant', content: res.text });
    st.history = st.history.slice(-24);
    return res.src || [];
  }

  async function askQ(raw) {
    const question = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!question || busy || destroyed) return;
    const k = key;
    const st = stateFor(k);
    setBusy(true);
    input.value = '';
    st.last = question;
    st.edited = false;
    st.asked.add(question);
    frameFor(k);
    addVisitor(k, question);
    const ans = startAnswer(k);
    let src = [];
    let note = '';
    let answered = false;
    if (mode === 'live' && endpoint && readUsed() < maxLive) {
      writeUsed(readUsed() + 1);
      st.offer = null;
      try {
        src = await askLive(k, question, ans);
        answered = true;
        if (readUsed() >= maxLive) { setMode('used'); note = 'That was the last live answer for this visit. From here, answers are worked out on this page.'; }
      } catch (e) {
        setMode('failed');
        if (ans.hasText() || ans.hasCards()) {
          answered = true;
          note = 'The live AI stopped part-way, so from here answers are worked out on this page.';
          st.history.push({ role: 'user', content: question }, { role: 'assistant', content: ans.text() || 'Done.' });
        } else {
          ans.reset();
          note = 'The live AI didn’t answer, so this one was worked out on this page.';
        }
      }
    }
    if (!answered) src = await askOffline(k, question, ans);
    await ans.end();
    ans.finish(src, note);
    if (k === key) markUsed(src);
    setBusy(false);
    if (k === key) renderChips();
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); askQ(input.value); });

  /* ---------- Choosing a business ---------- */
  function choose(k) {
    if (!ORDER.includes(k)) return;
    key = k;
    el.dataset.business = k;
    const st = stateFor(k);
    for (const b of segs) b.setAttribute('aria-pressed', String(b.dataset.k === k));
    placeMark(false);
    for (const log of logs.children) log.hidden = log.dataset.k !== k;
    toBottom(st.log, true);
    nameEl.textContent = `${data[k].name}’s assistant`;
    capAbout.textContent = SITE[k].about;
    capCan.textContent = `What the assistant can do here: ${data[k].can.map((c) => c.charAt(0).toLowerCase() + c.slice(1)).join('; ')}.`;
    capLink.href = new URL(SITE[k].href, import.meta.url).href;
    capLink.firstElementChild.textContent = k === 'clinic' ? 'Open the page on its own' : 'Open the whole site';
    for (const ifr of frameBox.querySelectorAll('iframe')) ifr.hidden = ifr.dataset.k !== k;
    if (near) frameFor(k);
    showFrameState();
    renderFacts();
    markUsed([]);
    renderChips();
  }

  setMode(mode);
  choose(key);
  requestAnimationFrame(() => placeMark(true));
  fadeUp([switchEl, q('.ag-band')]);

  const api = {
    choose,
    ask: askQ,
    state: () => ({
      key, busy, mode, liveUsed: readUsed(), maxLive,
      frames: Object.fromEntries(ORDER.filter((k) => per[k] && per[k].frame).map((k) => [k, per[k].frame.status])),
      history: per[key] ? per[key].history.slice() : [],
    }),
    frame: (k = key) => (per[k] && per[k].frame ? per[k].frame.api : null),
    destroy() {
      destroyed = true;
      io.disconnect();
      ro.disconnect();
      timers.forEach(clearTimeout);
      for (const k of ORDER) if (per[k] && per[k].frame) per[k].frame.api.dispose();
      el.innerHTML = '';
      delete el.dataset.agentMounted;
    },
  };
  el.__agent = api;
  return api;
}

export default { mount, trimHistory };
