/*
 * Toff Studio: the concierge ("Plan with us"), round 05 (round-05.md 7.2 and 7.1 point 9).
 *
 * One component, shown in two places:
 *  - inline, under "Tell us what you need" on the home page (mount(el, ctx)), with "Prefer a form? →",
 *    which swaps in a short enquiry form;
 *  - in a panel opened from the floating "Plan with us" button (bottom right, in shell.floatSlot), from
 *    "Start a project" and from anything with data-concierge. Laptops get a panel docked on the right;
 *    under 1024px it is a full-height sheet. Both are modal dialogs: focus stays inside, Escape closes,
 *    focus goes back to what opened it. The conversation and the brief are the same in both places
 *    (the component moves between them).
 *
 * The conversation asks one short question at a time and fills in a brief beside it, field by field
 * (business, goals, must-haves, look, pins, designs, timing, budget range, notes), which the visitor can
 * edit directly. It shows the studio's work as cards, opens Design yours with a preset, and lets the
 * visitor point at anything on the page ("I want this", assistant.js's pointer, with snapshot.js pictures).
 * At the end: a summary (the Worker's /brief, or written on the page), "Download your brief" (brief.js,
 * with its generative cover), then a short contact step that never goes to the AI and is only sent
 * anywhere once the enquiry is live (settings.chatMode 'live' with formEndpoint and legal.privacyPolicyUrl).
 *
 * Live: POST settings.ai.conciergeEndpoint (plan section 13): { history, brief, studio } -> text/event-stream
 * with text, tool_call, done and error events; tool calls (show_work, open_design_tool, start_pointing,
 * update_brief, finish) are carried out on the page and their results sent back with the next request.
 * At most settings.ai.maxLiveAnswers per visit (a tool round trip is part of one answer), 12 s
 * (ai.firstWordTimeoutMs) to the first event. Offline (endpoint '' or blocked, off, slow, an error, or past
 * the limit): Assistant.script() runs the same flow on the page, and the header says so.
 * Privacy: names, email addresses and phone numbers are never asked for, and anything that looks like one
 * is taken out (Assistant.stripContact) before a request leaves the page.
 *
 * API
 *   import { mount, open } from './assets/home/concierge.js';
 *   mount(el, { settings, shell })      the inline concierge (call once); also builds the floating button
 *   open({ topic, preset, source })     open it (topic 'assistant' starts on AI assistants;
 *                                       preset { brief: { field: value }, message: 'text to send' })
 * Events
 *   listens   'toff:concierge-open' (cancelable; preventDefault() claims it), detail { source, topic }
 *             'toff:brief-add' detail { kind: 'design', spec, describe, source?, el? }: adds a design to the brief
 *             (and window.__toffLastDesign, a design sent before this module loaded)
 *   dispatches 'toff:design-open' detail { way, business, mood, layout, words } (then goes to #design-yours);
 *             the same detail is left on window.__toffDesignOpen first, for a Design yours that loads later
 * Also window.ToffConcierge = { mount, open, close, state }.
 */
import { reducedMotion } from '../shared/motion.js';

const S = window.TOFF_SETTINGS || {};
const AI = S.ai || {};
const doc = document, root = doc.documentElement;
const STUDIO_URL = new URL('../studio/', import.meta.url);
const SITE_URL = new URL('../../', import.meta.url);
const filled = (v) => (typeof v === 'string' ? v.trim() !== '' : !!v);
const reduce = () => reducedMotion();

const OPENING = 'Hello. I’m the studio’s assistant, an AI. Tell me a little about your business and what you’d like your website to do, and I’ll put together a brief for Toff. You can also point at anything on this site and say ‘I want this’.';
const OPENING_CHIPS = ['A new website', 'A redesign', 'An AI assistant', 'Just looking'];
const TIMING = ['As soon as possible', 'In 1 to 3 months', 'Just exploring'];
const BUDGET = ['£1,000 to £2,000', '£2,000 to £4,000', '£4,000+', 'Not sure yet'];
const NEEDS = ['A new website', 'A redesign', 'An AI assistant', 'Something else'];
const QUOTE = 'Every project is quoted personally after a short call.';
const LIST_FIELDS = ['goals', 'must_haves', 'notes'];
const TEXT_FIELDS = ['business', 'look', 'timing', 'budget'];
const FIELDS = [
  { key: 'business', label: 'The business', kind: 'text', ph: 'What it is and where' },
  { key: 'goals', label: 'What the website must do', kind: 'list', add: 'Add something it must do', one: 'Goal' },
  { key: 'must_haves', label: 'Must-haves', kind: 'list', add: 'Add a must-have', one: 'Must-have' },
  { key: 'look', label: 'The look', kind: 'text', ph: 'Colours, mood, sites you like' },
  { key: 'pins', label: 'Pinned on this site', kind: 'pins' },
  { key: 'designs', label: 'Designs', kind: 'designs' },
  { key: 'timing', label: 'Timing', kind: 'select', options: TIMING },
  { key: 'budget', label: 'Budget range', kind: 'select', options: BUDGET },
  { key: 'notes', label: 'Notes', kind: 'list', add: 'Add a note', one: 'Note' },
];
const LABEL = Object.fromEntries(FIELDS.map((f) => [f.key, f.label]));

const LINKS = S.links || {};
const WORK = {
  bluebird: { name: 'Bluebird Wellness', kind: 'A client’s site', line: 'A doctor-led IV clinic in west London, in clinic or at your door.', live: LINKS.bluebird, study: 'work/bluebird/' },
  everest: { name: 'Everest Climate Solutions', kind: 'A client’s site', line: 'Air conditioning, designed and fitted across London.', live: LINKS.everest, soon: true, study: 'work/everest/' },
  saltmarsh: { name: 'Saltmarsh', kind: 'A concept site', line: 'A restaurant in Bermondsey. Steam off the dish.', open: 'work/saltmarsh/' },
  morrow: { name: 'Morrow Coffee', kind: 'A concept site', line: 'A café in Hackney. Build your drink and order ahead.', open: 'work/morrow/' },
  'atelier-wren': { name: 'Atelier Wren', kind: 'A concept site', line: 'A hair studio in Marylebone, with booking. A lookbook that flows.', open: 'work/atelier-wren/' },
  'hollis-and-pine': { name: 'Hollis & Pine', kind: 'A concept site', line: 'Clothing and ceramics in Islington. A vase in 3D.', open: 'work/hollis-and-pine/' },
  'hart-and-sons': { name: 'Hart & Sons Plumbing', kind: 'A concept site', line: 'Plumbing and heating in west London. An instant quote.', open: 'work/hart-and-sons/' },
};

/* ------------------------------------------------------------------ small helpers */
function h(tag, attrs, ...kids) {
  const e = doc.createElement(tag);
  for (const k in attrs || {}) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach((c) => { if (c != null && c !== false) e.append(c); });
  return e;
}
const svgPen = () => { const s = doc.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = '<path d="M4 20 L7.5 19 L19 7.5 Q20 6.5 19 5.5 L18.5 5 Q17.5 4 16.5 5 L5 16.5 Z"/><path d="M14.5 7 L17 9.5"/>'; return s; };
const svgPoint = () => { const s = doc.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = '<circle cx="12" cy="12" r="6.5"/><path d="M12 2.5 V6.5 M12 17.5 V21.5 M2.5 12 H6.5 M17.5 12 H21.5"/>'; return s; };
const link = (href, text, ext) => (ext ? h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, text, h('span', { class: 'visually-hidden', text: ' (opens in a new tab)' })) : h('a', { href }, text));
const cap = (s, n) => { s = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') : s; };
const strip = (t) => (window.Assistant ? window.Assistant.stripContact(t) : { text: String(t || '').replace(/[^\s@]+@[^\s@]+\.[a-z]{2,}/gi, '(removed)').replace(/(?:\+\s?)?\(?\d[\d\s().\/-]{5,}\d/g, (m) => ((m.match(/\d/g) || []).length >= 7 ? '(removed)' : m)), found: false });
const clean = (t, n) => cap(strip(t).text, n);
const lowerFirst = (s) => (s && /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const store = {
  get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode: memory only */ } },
};

/* ------------------------------------------------------------------ styles and kept scripts */
let cssPromise = null;
function loadCss() {
  if (cssPromise) return cssPromise;
  cssPromise = new Promise((res) => {
    const l = h('link', { rel: 'stylesheet', href: new URL('concierge.css', import.meta.url).href });
    l.onload = res; l.onerror = res; doc.head.append(l);
  });
  return cssPromise;
}
const scripts = {};
function loadScript(name, globalName) {
  if (window[globalName]) return Promise.resolve();
  if (!scripts[name]) {
    scripts[name] = new Promise((res) => {
      const s = h('script', { src: new URL(name, STUDIO_URL).href });
      s.onload = res; s.onerror = res; doc.head.append(s);
    });
  }
  return scripts[name];
}
let keptPromise = null;
function loadKept() {
  if (!keptPromise) keptPromise = Promise.all([loadScript('assistant.js', 'Assistant'), loadScript('brief.js', 'Brief'), loadScript('snapshot.js', 'Snapshot')]).then(() => { initKept(); });
  return keptPromise;
}

/* ------------------------------------------------------------------ state */
const LIVE_KEY = 'toff-concierge-live-used';
const st = {
  brief: { business: '', goals: [], must_haves: [], look: '', pins: [], designs: [], timing: '', budget: '', notes: [], summary: '' },
  history: [],          // the Messages API turns sent to /concierge
  transcript: [],       // { who: 'you'|'bot', text } for /brief and the document
  mode: '',             // 'live' or 'offline'
  why: '',              // why it is offline: 'off', 'failed', 'limit'
  started: false, busy: false, view: 'chat', script: null, pointer: null, unseen: 0,
  summarySource: '',
};
const liveUsed = () => +(store.get(LIVE_KEY) || 0);
const liveMax = () => (AI.maxLiveAnswers == null ? 8 : +AI.maxLiveAnswers);
function canGoLive() { return filled(AI.conciergeEndpoint) && st.why !== 'failed' && liveUsed() < liveMax(); }
const enquiryLive = () => S.chatMode === 'live' && filled(S.formEndpoint) && filled((S.legal || {}).privacyPolicyUrl);

/* ------------------------------------------------------------------ DOM: the component */
let ui = null;        // built once
let ctxShell = null, inlineHost = null, dialog = null, fab = null, fabWrap = null, opener = null;

function buildComponent() {
  if (ui) return ui;
  const modeLine = h('p', { class: 'cg-mode', id: 'cg-mode' });
  const log = h('div', { class: 'cg-log', role: 'log', 'aria-live': 'off', tabindex: '0', 'aria-label': 'Conversation' });
  const say = h('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });
  const chips = h('div', { class: 'cg-chips', role: 'group', 'aria-label': 'Suggested replies' });
  const input = h('textarea', { class: 'cg-input', id: 'cg-input', rows: '1', maxlength: '600', autocomplete: 'off', placeholder: 'Type your answer', 'aria-describedby': 'cg-mode' });
  const send = h('button', { class: 'cg-send', type: 'submit' }, 'Send');
  const wait = h('p', { class: 'cg-wait', id: 'cg-wait', 'aria-live': 'polite' });
  const compose = h('form', { class: 'cg-compose' }, h('label', { class: 'visually-hidden', for: 'cg-input', text: 'Your message' }), input, send);
  const pointBtn = h('button', { class: 'cg-tool', type: 'button' }, svgPoint(), h('span', { text: 'Point at something' }));
  const finishBtn = h('button', { class: 'cg-tool', type: 'button' }, h('span', { text: 'Finish my brief' }));
  const tools = h('div', { class: 'cg-tools' }, pointBtn, finishBtn);
  const chatView = h('div', { class: 'cg-chatview' }, log, say, chips, compose, wait, tools);
  const endView = h('div', { class: 'cg-endview', hidden: true });
  const chat = h('div', { class: 'cg-chat' }, modeLine, chatView, endView);

  const count = h('span', { class: 'cg-brief-count' });
  const toggle = h('button', { class: 'cg-brief-toggle', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'cg-brief-body' }, h('span', { text: 'Your brief' }), count, h('span', { class: 'cg-chev', 'aria-hidden': 'true' }));
  const cover = h('div', { class: 'cg-cover', 'aria-hidden': 'true' });
  const fields = h('dl', { class: 'cg-fields' });
  const body = h('div', { class: 'cg-brief-body', id: 'cg-brief-body' },
    cover,
    h('h3', { class: 'cg-brief-title', id: 'cg-brief-title', text: 'Your brief' }),
    h('p', { class: 'cg-brief-note', text: 'It fills in as we talk, and you can change anything in it.' }),
    fields);
  const brief = h('section', { class: 'cg-brief', 'aria-labelledby': 'cg-brief-title' }, toggle, body);
  const el = h('div', { class: 'cg' }, h('div', { class: 'cg-grid' }, chat, brief));

  ui = { el, modeLine, log, say, chips, input, send, wait, compose, pointBtn, finishBtn, chatView, endView, count, toggle, cover, fields, body, brief };

  compose.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(); } });
  input.addEventListener('input', () => autosize(input));
  pointBtn.addEventListener('click', () => startPointing());
  finishBtn.addEventListener('click', () => { if (st.busy) { waitNote(); return; } note('You asked to finish here.'); goEnd(); });
  toggle.addEventListener('click', () => setBriefOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  renderMode(); renderBrief();
  return ui;
}
function autosize(t) { if (CSS.supports && CSS.supports('field-sizing', 'content')) return; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 160) + 'px'; }
function narrow() { return ui && ui.el.clientWidth > 0 && ui.el.clientWidth < 760; }
function setBriefOpen(on) { ui.toggle.setAttribute('aria-expanded', on ? 'true' : 'false'); ui.brief.classList.toggle('is-open', on); }

function renderMode() {
  if (!ui) return;
  const t = st.mode === 'live'
    ? 'This assistant is an AI. What you type goes to Anthropic to be answered and isn’t stored. Please don’t type personal details.'
    : st.why === 'failed' ? 'The live AI didn’t answer, so the assistant is now working on this page with a short set of questions. Nothing you type leaves the page. Please don’t type personal details.'
      : st.why === 'limit' ? 'That’s the most live answers for one visit, so the assistant is now working on this page with a short set of questions. Nothing you type leaves the page.'
        : 'The live AI is off, so this assistant is working on this page with a short set of questions. Nothing you type leaves the page. Please don’t type personal details.';
  ui.modeLine.textContent = t;
  ui.el.dataset.mode = st.mode || 'offline';
}

/* ------------------------------------------------------------------ messages */
let typer = null;
function scrollLog() { ui.log.scrollTop = ui.log.scrollHeight; }
function you(text, removed) {
  const m = h('div', { class: 'cg-msg cg-you' }, h('p', { text }));
  if (removed) m.append(h('p', { class: 'cg-removed', text: 'Contact details were taken out before sending.' }));
  ui.log.append(m); scrollLog();
  st.transcript.push({ who: 'you', text: strip(text).text });
}
function note(text) { ui.log.append(h('p', { class: 'cg-note', text })); scrollLog(); }
function waitNote() { ui.wait.textContent = 'One moment: I’ll read that once I’ve finished answering.'; clearTimeout(waitNote.t); waitNote.t = setTimeout(() => { ui.wait.textContent = ''; }, 2400); }

// A bot message that writes itself word by word (live deltas or offline text), at a natural pace.
function botMessage() {
  const p = h('p', { class: 'cg-text' });
  const m = h('div', { class: 'cg-msg cg-bot' }, p);
  ui.log.append(m); scrollLog();
  let buf = '', all = '', ended = false, timer = 0, resolve;
  const done = new Promise((r) => { resolve = r; });
  const step = () => {
    timer = 0;
    if (!buf) { if (ended) finish(); return; }
    const words = buf.match(/\s*\S+\s*/g) || [buf];
    const n = Math.max(1, Math.ceil(words.length / 10));
    const out = words.slice(0, n).join('');
    buf = buf.slice(out.length); p.textContent += out; scrollLog();
    timer = setTimeout(step, 38);
  };
  const kick = () => { if (reduce()) { p.textContent += buf; buf = ''; if (ended) finish(); return; } if (!timer) step(); };
  let fin = false;
  function finish() {
    if (fin) return; fin = true;
    p.textContent = p.textContent.replace(/\s+$/, '');
    if (!p.textContent) m.remove(); else { ui.say.textContent = p.textContent; st.transcript.push({ who: 'bot', text: p.textContent }); }
    if (typer === api) typer = null;
    resolve();
  }
  const api = {
    push(d) { if (!d) return; all += d; buf += d; kick(); },
    end() { ended = true; kick(); return done; },
    flush() { clearTimeout(timer); timer = 0; p.textContent += buf; buf = ''; ended = true; finish(); },
    text: () => all, done,
  };
  typer = api;
  return api;
}
function botSay(text) { const b = botMessage(); b.push(text); return b.end(); }
function thinking() { const t = h('p', { class: 'cg-thinking', text: 'Thinking…' }); ui.log.append(t); scrollLog(); return () => t.remove(); }

function setChips(list, multi) {
  ui.chips.replaceChildren();
  ui.pointBtn.hidden = !!(list && list.includes('Point at something'));   // never offered twice
  if (!list || !list.length) return;
  const picked = [];
  list.forEach((c) => {
    const b = h('button', { class: 'cg-chip', type: 'button', 'aria-pressed': multi ? 'false' : null }, c);
    b.addEventListener('click', () => {
      if (multi) {
        const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) picked.push(c); else picked.splice(picked.indexOf(c), 1);
        doneBtn.textContent = picked.length ? 'Done' : 'None of these';
      } else chip(c);
    });
    ui.chips.append(b);
  });
  let doneBtn = null;
  if (multi) {
    doneBtn = h('button', { class: 'cg-chip cg-chip-done', type: 'button' }, 'None of these');
    doneBtn.addEventListener('click', () => chip(picked.length ? picked.slice() : 'Nothing in particular', picked.length ? picked.join(', ') : 'Nothing in particular'));
    ui.chips.append(doneBtn);
  }
}
function focusFirst() {
  if (!ui) return;
  const t = st.view === 'end' ? ui.endView.querySelector('button, input') : (ui.chips.querySelector('button') || ui.input);
  if (t) t.focus({ preventScroll: true });
}

/* ------------------------------------------------------------------ the brief */
function briefCount() {
  const b = st.brief;
  return FIELDS.filter((f) => (Array.isArray(b[f.key]) ? b[f.key].length : filled(b[f.key]))).length;
}
function renderBrief(changed) {
  if (!ui) return;
  const keep = doc.activeElement && ui.fields.contains(doc.activeElement) ? doc.activeElement.id : null;
  const keys = changed ? [changed] : FIELDS.map((f) => f.key);
  keys.forEach((key) => {
    const f = FIELDS.find((x) => x.key === key); if (!f) return;
    const row = fieldRow(f);
    const old = ui.fields.querySelector(`[data-field="${key}"]`);
    if (old) old.replaceWith(row); else ui.fields.append(row);
  });
  if (keep) { const k = doc.getElementById(keep); if (k) k.focus({ preventScroll: true }); }
  const n = briefCount();
  ui.count.textContent = n ? `${n} of ${FIELDS.length} filled` : 'Empty so far';
  coverArt();
}
function mark(key) {
  const row = ui && ui.fields.querySelector(`[data-field="${key}"]`); if (!row) return;
  row.classList.remove('is-new'); void row.offsetWidth; row.classList.add('is-new');
  setTimeout(() => row.classList.remove('is-new'), 1600);
  if (narrow() && ui.toggle.getAttribute('aria-expanded') !== 'true') note(`Added to your brief: ${LABEL[key].toLowerCase()}.`);
}
function fieldRow(f) {
  const b = st.brief, id = 'cg-f-' + f.key;
  const dt = h('dt', null), dd = h('dd', null);
  const row = h('div', { class: 'cg-field cg-field--' + f.kind, 'data-field': f.key }, dt, dd);
  if (f.kind === 'text') {
    dt.append(h('label', { for: id, text: f.label }));
    const t = h('textarea', { id, class: 'cg-val', rows: '1', maxlength: f.key === 'business' ? '200' : '300', placeholder: 'Not yet' });
    t.value = b[f.key] || '';
    t.addEventListener('input', () => { b[f.key] = t.value; autosize(t); ui.count.textContent = `${briefCount()} of ${FIELDS.length} filled`; });
    t.addEventListener('change', () => { b[f.key] = t.value.trim(); if (f.key === 'business') coverArt(); });
    dd.append(t); requestAnimationFrame(() => autosize(t));
  } else if (f.kind === 'select') {
    dt.append(h('label', { for: id, text: f.label }));
    const s = h('select', { id, class: 'cg-val cg-select' }, h('option', { value: '', text: 'Not yet' }), f.options.map((o) => h('option', { value: o, text: o })));
    s.value = f.options.includes(b[f.key]) ? b[f.key] : '';
    s.addEventListener('change', () => { b[f.key] = s.value; renderBrief(f.key); });
    dd.append(s);
  } else if (f.kind === 'list') {
    dt.append(h('span', { id: id + '-l', text: f.label }));
    const ul = h('ul', { class: 'cg-items', 'aria-labelledby': id + '-l' });
    b[f.key].forEach((v, i) => {
      const inp = h('input', { class: 'cg-val', id: `${id}-${i}`, type: 'text', maxlength: '200', 'aria-label': `${f.one} ${i + 1}` });
      inp.value = v;
      inp.addEventListener('input', () => { b[f.key][i] = inp.value; });
      inp.addEventListener('change', () => { if (!inp.value.trim()) { b[f.key].splice(i, 1); renderBrief(f.key); } });
      const rm = h('button', { class: 'cg-rm', type: 'button', 'aria-label': `Remove ${f.one.toLowerCase()}: ${v}` }, h('span', { 'aria-hidden': 'true', text: '×' }));
      rm.addEventListener('click', () => { b[f.key].splice(i, 1); renderBrief(f.key); const nx = doc.getElementById(`${id}-add`); if (nx) nx.focus(); });
      ul.append(h('li', null, inp, rm));
    });
    const add = h('input', { class: 'cg-add', id: `${id}-add`, type: 'text', maxlength: '200', placeholder: b[f.key].length ? f.add : 'Not yet', 'aria-label': f.add });
    const commit = () => { const v = add.value.trim(); if (!v) return; b[f.key].push(v); renderBrief(f.key); const nx = doc.getElementById(`${id}-add`); if (nx) nx.focus(); };
    add.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
    add.addEventListener('change', commit);
    dd.append(ul, add);
  } else if (f.kind === 'pins') {
    dt.append(h('span', { id: id + '-l', text: f.label }));
    if (!b.pins.length) dd.append(h('p', { class: 'cg-empty', text: 'Nothing yet. Point at anything on this site you’d like.' }));
    else {
      const ul = h('ul', { class: 'cg-items cg-pins', 'aria-labelledby': id + '-l' });
      b.pins.forEach((p, i) => {
        const thumb = p.snapshot ? h('img', { class: 'cg-thumb', src: p.snapshot, alt: '', width: '72', height: '45' }) : h('span', { class: 'cg-thumb cg-thumb-n', 'aria-hidden': 'true', text: String(p.n) });
        const noteIn = h('input', { class: 'cg-val', type: 'text', id: `${id}-${i}`, maxlength: '200', placeholder: 'Add a note', 'aria-label': `Note for pin ${p.n}: ${p.label}` });
        noteIn.value = p.note || '';
        noteIn.addEventListener('input', () => { p.note = noteIn.value; });
        const rm = h('button', { class: 'cg-rm', type: 'button', 'aria-label': `Remove pin ${p.n}: ${p.label}` }, h('span', { 'aria-hidden': 'true', text: '×' }));
        rm.addEventListener('click', () => { if (st.pointer) st.pointer.remove(p); else { b.pins.splice(i, 1); renderBrief('pins'); } });
        ul.append(h('li', null, thumb, h('div', { class: 'cg-pin-text' }, h('p', { class: 'cg-pin-label', text: `${p.n}. ${p.label}` }), h('p', { class: 'cg-pin-choice', text: p.choice || 'I want this' }), noteIn), rm));
      });
      dd.append(ul);
    }
  } else if (f.kind === 'designs') {
    dt.append(h('span', { id: id + '-l', text: f.label }));
    if (!b.designs.length) dd.append(h('p', { class: 'cg-empty', text: 'Nothing yet. Make one in Design yours and send it here.' }));
    else {
      const ul = h('ul', { class: 'cg-items cg-designs', 'aria-labelledby': id + '-l' });
      b.designs.forEach((d, i) => {
        const rm = h('button', { class: 'cg-rm', type: 'button', 'aria-label': `Remove design: ${d.summary}` }, h('span', { 'aria-hidden': 'true', text: '×' }));
        rm.addEventListener('click', () => { b.designs.splice(i, 1); renderBrief('designs'); });
        ul.append(h('li', null, d.snapshot ? h('img', { class: 'cg-thumb', src: d.snapshot, alt: '', width: '72', height: '45' }) : null, h('p', { class: 'cg-design-text', text: d.summary }), rm));
      });
      dd.append(ul);
    }
  }
  return row;
}
let coverSeed = null, coverTimer = 0;
function coverArt() {
  if (!ui || !window.Brief) return;
  const seed = (st.brief.business || '').trim().toLowerCase() || 'toff';
  if (seed === coverSeed) return;
  clearTimeout(coverTimer);
  coverTimer = setTimeout(() => {
    coverSeed = seed;
    const art = h('div', { class: 'cg-cover-art' }); art.innerHTML = window.Brief.flowArt(seed, 640, 150);
    const old = ui.cover.querySelector('.cg-cover-art');
    ui.cover.append(art);
    if (old) { if (reduce()) old.remove(); else { art.classList.add('is-in'); setTimeout(() => old.remove(), 600); } }
  }, coverSeed === null ? 0 : 500);
}

/* What the Worker may see of the brief: text only, contact details taken out, at most 4 KB. */
function briefForWorker() {
  const b = st.brief;
  const out = {
    business: clean(b.business, 200), goals: b.goals.map((x) => clean(x, 140)).filter(Boolean).slice(0, 6),
    must_haves: b.must_haves.map((x) => clean(x, 80)).filter(Boolean).slice(0, 10), look: clean(b.look, 300),
    pins: b.pins.map((p) => ({ label: clean(p.label, 80), note: clean([p.choice, p.note].filter(Boolean).join(': '), 200) })).slice(0, 12),
    designs: b.designs.map((d) => ({ source: d.source, summary: clean(d.summary, 200) })).slice(0, 4),
    timing: TIMING.includes(b.timing) ? b.timing : '', budget: BUDGET.includes(b.budget) ? b.budget : '',
    notes: b.notes.map((x) => clean(x, 200)).filter(Boolean).slice(0, 8),
  };
  const size = () => new TextEncoder().encode(JSON.stringify(out)).length;
  while (size() > 4000) {
    if (out.notes.length) out.notes.pop(); else if (out.pins.length) out.pins.pop(); else if (out.goals.length > 1) out.goals.pop(); else if (out.must_haves.length > 1) out.must_haves.pop(); else { out.look = out.look.slice(0, 80); break; }
  }
  return out;
}
function studioFacts() {
  const names = ['Discovery call', 'Sketch', 'Build', 'Launch & care'];
  const tf = ((S.process || {}).timeframes || []).map((t, i) => (filled(t) ? `${names[i] || 'Step ' + (i + 1)}: ${cap(t, 60)}` : '')).filter(Boolean).slice(0, 8);
  const prices = typeof S.prices === 'string' ? S.prices : (S.prices && typeof S.prices === 'object' ? Object.values(S.prices).filter((v) => typeof v === 'string' && v.trim()).join('; ') : '');
  return {
    name: cap(S.studioName || 'Toff Studio', 100), location: cap(S.location || '', 100), timeframes: tf, prices: cap(prices, 200),
    reply_time: cap((S.contact || {}).replyTime || '', 100), quote_line: QUOTE,
  };
}

/* ------------------------------------------------------------------ tools (live and offline alike) */
function fail(code, message) { return { ok: false, error: { code, message } }; }
function runTool(call, later) {
  const a = call.input && typeof call.input === 'object' ? call.input : {};
  try {
    if (call.name === 'update_brief') {
      const field = a.field, value = typeof a.value === 'string' ? a.value : '';
      if (![...LIST_FIELDS, ...TEXT_FIELDS].includes(field)) return fail('invalid_args', 'That isn’t a field of the brief.');
      let v = clean(value, field === 'business' ? 200 : field === 'look' ? 300 : 200);
      v = v.replace(/\s*\(removed\)/g, '').trim();
      if (!v) return fail('invalid_args', 'The value was empty.');
      if (field === 'timing' && !TIMING.includes(v)) return fail('invalid_args', 'timing must be one of: ' + TIMING.join(', ') + '.');
      if (field === 'budget' && !BUDGET.includes(v)) return fail('invalid_args', 'budget must be one of: ' + BUDGET.join(', ') + '.');
      if (LIST_FIELDS.includes(field)) {
        const list = st.brief[field];
        if (list.some((x) => x.toLowerCase() === v.toLowerCase())) return { ok: true, result: { field, saved: v, note: 'Already in the brief.' } };
        if (list.length >= (field === 'must_haves' ? 10 : field === 'goals' ? 6 : 8)) return fail('full', 'That part of the brief is full.');
        list.push(v);
      } else st.brief[field] = v;
      renderBrief(field); mark(field);
      return { ok: true, result: { field, saved: v } };
    }
    if (call.name === 'show_work') {
      const list = (Array.isArray(a.projects) ? a.projects : []).filter((p) => WORK[p]);
      const uniq = [...new Set(list)].slice(0, 3);
      if (!uniq.length) return fail('invalid_args', 'None of those is a project on this site.');
      workCards(uniq);
      return { ok: true, result: { shown: uniq } };
    }
    if (call.name === 'open_design_tool') {
      const target = doc.getElementById('design-yours');
      if (!target) return fail('unavailable', 'Design yours isn’t on this page.');
      const detail = { way: ['pick', 'sketch', 'describe'].includes(a.way) ? a.way : 'pick', business: a.business || '', mood: a.mood || '', layout: a.layout || '', words: clean(a.words, 400) };
      window.__toffDesignOpen = detail;   // Design yours reads this when it mounts, in case it hasn't loaded yet
      doc.dispatchEvent(new CustomEvent('toff:design-open', { detail }));
      later.push(() => goToDesign(detail));
      return { ok: true, result: { opened: true, way: detail.way, note: 'The visitor is taken to Design yours once this answer ends.' } };
    }
    if (call.name === 'start_pointing') {
      later.push(() => startPointing(cap(a.hint, 120)));
      return { ok: true, result: { started: true, note: 'Pointing starts once this answer ends. Pins will appear in the brief.' } };
    }
    if (call.name === 'finish') {
      later.push(() => goEnd());
      return { ok: true, result: { finished: true } };
    }
    return fail('unknown_tool', 'The page doesn’t know that tool.');
  } catch (err) {
    return fail('internal', 'The page couldn’t do that.');
  }
}
function workCards(keys) {
  const list = h('ul', { class: 'cg-work', 'aria-label': 'Some of our work' });
  keys.forEach((k) => {
    const w = WORK[k], links = [];
    if (w.open) links.push(link(new URL(w.open, SITE_URL).href, 'Open the site →'));
    if (w.live) links.push(link(w.live, 'Visit the live site', true));
    else if (w.soon) links.push(h('span', { class: 'cg-soon', text: 'Live site coming soon' }));
    if (w.study) links.push(link(new URL(w.study, SITE_URL).href, 'Read the case study →'));
    list.append(h('li', { class: 'cg-card' }, h('p', { class: 'cg-card-name', text: w.name }), h('p', { class: 'cg-card-kind', text: w.kind }), h('p', { class: 'cg-card-line', text: w.line }), h('p', { class: 'cg-card-links' }, links)));
  });
  ui.log.append(list); scrollLog();
}

/* ------------------------------------------------------------------ the conversation */
let startPromise = null;
function start() {
  buildComponent();
  if (!startPromise) {
    st.started = true;
    startPromise = (async () => {
      await loadKept();
      if (!st.script) st.script = window.Assistant ? window.Assistant.script({ timeframes: studioFacts().timeframes }) : null;
      await botSay(OPENING);
      if (!st.transcript.some((m) => m.who === 'you')) setChips(OPENING_CHIPS);
    })();
  }
  return startPromise;
}
// A scripted first exchange (no live answer used): the visitor's choice, and the next question.
async function firstTopic(text) {
  you(text);
  const r = st.script.reply(text, st.brief);
  r.calls.forEach((c) => runTool(c, []));
  if (st.mode === 'live') { st.history.push({ role: 'user', content: text }); st.history.push({ role: 'assistant', content: r.text }); }
  await botSay(r.text);
  setChips(r.chips, r.multi);
}

// While an answer is still arriving, what the visitor sends waits its turn (and the answer being typed out finishes at once).
const queue = [];
function submit() {
  const v = ui.input.value.trim();
  if (!v) { ui.input.focus(); return; }
  ui.input.value = ''; autosize(ui.input);
  chip(v);
}
function chip(value, shown) {
  if (st.busy) { queue.push([value, shown]); if (typer) typer.flush(); waitNote(); return; }
  visitor(value, shown);
}

async function visitor(value, shown) {
  await start();
  if (typer) typer.flush();
  const text = shown || (Array.isArray(value) ? value.join(', ') : value);
  const s = strip(text);
  you(text, s.found);
  setChips([]);
  st.busy = true; ui.el.classList.add('is-busy');
  try {
    if (st.view === 'end') { st.view = 'chat'; showView(); }
    if (st.mode === 'live' && !canGoLive()) {
      st.mode = 'offline'; st.why = st.why === 'failed' ? 'failed' : 'limit'; renderMode();
      if (st.why === 'limit') note('That was the last live answer for this visit, so from here I’ll follow a short set of questions on this page.');
      await offlineAfterLive(value);
    } else if (st.mode === 'live') {
      await liveTurn(s.text, value);
    } else {
      await offlineTurn(value);
    }
  } finally {
    st.busy = false; ui.el.classList.remove('is-busy'); ui.wait.textContent = '';
    if (queue.length) { const [v, sh] = queue.shift(); setTimeout(() => visitor(v, sh), 0); }
  }
}

async function offlineTurn(value) {
  if (!st.script) return;
  const r = st.script.reply(value, st.brief);
  const later = [];
  r.calls.filter((c) => c.name === 'update_brief').forEach((c) => runTool(c, later));
  await botSay(r.text);
  r.calls.filter((c) => c.name !== 'update_brief').forEach((c) => runTool(c, later));
  setChips(r.chips, r.multi);
  later.forEach((fn) => fn());
}
// The live AI stopped part-way: keep what the visitor said, and carry on with the next question.
async function offlineAfterLive(value) {
  const answered = st.history.some((m) => m.role === 'assistant');
  if (!answered) return offlineTurn(value);
  const text = Array.isArray(value) ? value.join(', ') : value;
  if (!OPENING_CHIPS.includes(text) && !TIMING.includes(text) && !BUDGET.includes(text)) runTool({ name: 'update_brief', input: { field: 'notes', value: text } }, []);
  if (TIMING.includes(text)) runTool({ name: 'update_brief', input: { field: 'timing', value: text } }, []);
  if (BUDGET.includes(text)) runTool({ name: 'update_brief', input: { field: 'budget', value: text } }, []);
  const r = st.script.resume(st.brief);
  const later = [];
  await botSay(r.text);
  r.calls.forEach((c) => runTool(c, later));
  setChips(r.chips, r.multi);
  later.forEach((fn) => fn());
}

/* History for the Worker: at most 16 messages, starting on a visitor's text, tool pairs kept whole. */
function trimmedHistory() {
  let hst = st.history.slice();
  const startsOnText = (m) => m.role === 'user' && (typeof m.content === 'string' || (Array.isArray(m.content) && m.content.length && m.content[0].type === 'text'));
  while (hst.length > 16 || (hst.length && !startsOnText(hst[0]))) {
    if (hst.length <= 16 && hst[0].role === 'user' && Array.isArray(hst[0].content)) {
      const texts = hst[0].content.filter((b) => b.type === 'text');
      if (texts.length) { hst[0] = { role: 'user', content: texts }; continue; }
    }
    hst.shift();
  }
  return hst;
}
function addVisitorTurn(text) {
  const last = st.history[st.history.length - 1];
  if (last && last.role === 'user') {          // after tool results that got no answer: the text joins that turn
    last.content = (Array.isArray(last.content) ? last.content : [{ type: 'text', text: last.content }]).concat({ type: 'text', text });
  } else st.history.push({ role: 'user', content: text });
}

async function liveTurn(textForAI, value) {
  addVisitorTurn(cap(textForAI, 1500));
  store.set(LIVE_KEY, String(liveUsed() + 1));
  const later = [];
  let rounds = 0, spoke = false;
  for (;;) {
    let msg = null;
    const done = new Map();      // tool id -> result
    const off = thinking();
    let res;
    try {
      res = await stream({
        onText(d) { off(); if (!msg) msg = botMessage(); msg.push(d); spoke = true; },
        onTool(call) { off(); if (msg) { msg.flush(); msg = null; } done.set(call.id, runTool(call, later)); },
      });
    } catch (err) {
      off();
      if (msg) msg.flush();
      st.mode = 'offline'; st.why = 'failed'; renderMode();
      note('The live AI didn’t answer this time, so I’ll carry on from this page.');
      if (rounds === 0 && !spoke) { st.history.pop(); await offlineAfterLive(value); }
      else { const r = st.script.resume(st.brief); await botSay(r.text); r.calls.forEach((c) => runTool(c, later)); setChips(r.chips, r.multi); }
      later.forEach((fn) => fn());
      return;
    }
    off();
    if (msg) await msg.end();
    const blocks = Array.isArray(res.assistant) ? res.assistant : [];
    if (blocks.length) st.history.push({ role: 'assistant', content: blocks });
    const uses = blocks.filter((b) => b && b.type === 'tool_use');
    if (uses.length) {
      const results = uses.map((u) => {
        const r = done.get(u.id) || runTool(u, later);
        return { type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(r.ok ? r.result : { error: r.error }), is_error: !r.ok };
      });
      st.history.push({ role: 'user', content: results });
      rounds += 1;
      if (rounds < 3) continue;
    }
    break;
  }
  setChips(liveChips());
  later.forEach((fn) => fn());
}
function liveChips() {
  const last = [...st.transcript].reverse().find((m) => m.who === 'bot');
  const t = last ? last.text.toLowerCase() : '';
  if (st.view === 'end') return [];
  if (/budget/.test(t) && !st.brief.budget) return BUDGET;
  if (/\bwhen\b|timing|how soon|start date|launch/.test(t) && !st.brief.timing) return TIMING;
  return [];
}

/* One request to /concierge, read as server-sent events. Resolves with the done event; rejects on any failure. */
async function stream(on) {
  const body = JSON.stringify({ history: trimmedHistory(), brief: briefForWorker(), studio: studioFacts() });
  const ctl = new AbortController();
  let first = false, idle = 0;
  const firstTimer = setTimeout(() => { if (!first) ctl.abort(); }, +AI.firstWordTimeoutMs || 12000);
  const bump = () => { clearTimeout(idle); idle = setTimeout(() => ctl.abort(), 25000); };
  try {
    const r = await fetch(AI.conciergeEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: ctl.signal, credentials: 'omit' });
    if (!r.ok || !/text\/event-stream/.test(r.headers.get('content-type') || '') || !r.body) throw new Error('refused');
    const reader = r.body.getReader(), dec = new TextDecoder();
    let buf = '', result = null;
    const handle = (raw) => {
      let ev = 'message', data = '';
      raw.split('\n').forEach((line) => { if (line.startsWith('event:')) ev = line.slice(6).trim(); else if (line.startsWith('data:')) data += line.slice(5).trim(); });
      if (!data) return;
      let d; try { d = JSON.parse(data); } catch (e) { return; }
      if (!first) { first = true; clearTimeout(firstTimer); }
      if (ev === 'text' && typeof d.text === 'string') on.onText(d.text);
      else if (ev === 'tool_call' && d && typeof d.name === 'string' && typeof d.id === 'string') on.onTool({ id: d.id, name: d.name, input: d.input || {} });
      else if (ev === 'done') result = d || {};
      else if (ev === 'error') throw new Error(d && d.code || 'upstream');
    };
    bump();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bump();
      buf += dec.decode(value, { stream: true }).replace(/\r/g, '');
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) { const raw = buf.slice(0, i); buf = buf.slice(i + 2); handle(raw); }
      if (result) break;
    }
    if (!result && buf.trim()) handle(buf);
    if (!result) throw new Error('incomplete');
    try { reader.cancel(); } catch (e) { /* done */ }
    return result;
  } finally { clearTimeout(firstTimer); clearTimeout(idle); }
}

/* ------------------------------------------------------------------ pointing, Design yours, designs added */
let pointFromDialog = false;
function initKept() {
  coverArt();
  if (st.pointer || !window.Assistant) return;
  st.pointer = window.Assistant.pointer({
    ignore: '.cg, .cg-dialog, .sh-float, .sh-bar, .cg-inline-extra',
    onPin(p) { st.brief.pins.push(p); renderBrief('pins'); mark('pins'); },
    onChange() { renderBrief('pins'); },
    onRemove(p) { const i = st.brief.pins.indexOf(p); if (i >= 0) st.brief.pins.splice(i, 1); renderBrief('pins'); },
    onStop(added) {
      const back = pointFromDialog; pointFromDialog = false;
      if (back) showDialog(); else if (inlineHost) { ui.el.scrollIntoView({ block: 'nearest', behavior: reduce() ? 'auto' : 'smooth' }); }
      if (!st.script) return;
      const r = st.script.afterPins(added.length);
      botSay(r.text).then(() => { setChips(r.chips); focusFirst(); });
    },
  });
}
async function startPointing(hint) {
  await loadKept();
  if (!st.pointer) return;
  await start();
  pointFromDialog = !!(dialog && dialog.open);
  if (pointFromDialog) closeDialog({ silent: true });
  st.pointer.start(hint || '');
}
function goToDesign(detail) {
  const target = doc.getElementById('design-yours'); if (!target) return;
  if (dialog && dialog.open) closeDialog({ silent: true });
  note('Design yours is open with your choices. Press “Send this to Toff” there and it’ll join your brief.');
  const shell = ctxShell || window.ToffShell;
  if (shell && shell.jumpTo) shell.jumpTo('design-yours', { focus: true });
  else { target.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth' }); target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  void detail;
}
let lastDesign = null;
function onBriefAdd(e) {
  const d = e.detail || {};
  if (d.kind && d.kind !== 'design') return;
  if (d === lastDesign) return;
  lastDesign = d;
  buildComponent();
  const describe = typeof d.describe === 'string' ? d.describe : d.describe && (d.describe.summary || d.describe.label || d.describe.text) || '';
  const source = ['pick', 'sketch', 'describe'].includes(d.source || d.way) ? (d.source || d.way) : (d.spec && Array.isArray(d.spec.sections) && d.spec.sections.some((s) => s.type === 'row') ? 'sketch' : 'pick');
  const entry = { source, summary: cap(describe || 'A design made in Design yours', 200), spec: d.spec || null, snapshot: null };
  st.brief.designs = st.brief.designs.filter((x) => x.source !== source).concat(entry).slice(-3);
  renderBrief('designs'); mark('designs');
  const shot = d.el || doc.querySelector('#design-yours .sk-site');
  loadKept().then(() => {
    if (shot && window.Snapshot) window.Snapshot.take(shot, { maxWidth: 520 }).then((s) => { if (s) { entry.snapshot = s; renderBrief('designs'); } });
  });
  if (st.started) note('Your design is in your brief.');
  // Design yours opens the concierge itself ('toff:concierge-open' straight after); until then the button counts it.
  if (!(dialog && dialog.open)) { st.unseen += 1; badge(); }
}

/* ------------------------------------------------------------------ the end: summary, download, contact */
function showView() {
  ui.chatView.hidden = st.view !== 'chat';
  ui.endView.hidden = st.view !== 'end';
}
async function goEnd() {
  if (typer) typer.flush();
  st.view = 'end'; showView(); setChips([]);
  const v = ui.endView;
  const status = h('p', { class: 'cg-sum-status', role: 'status', text: 'Writing your summary…' });
  const sum = h('textarea', { class: 'cg-sum', id: 'cg-sum', rows: '5', maxlength: '800', 'aria-describedby': 'cg-sum-note' });
  const sumNote = h('p', { class: 'cg-sum-note', id: 'cg-sum-note' });
  const dl = h('button', { class: 'btn-gold cg-download', type: 'button' }, 'Download your brief');
  const back = h('button', { class: 'cg-back', type: 'button' }, h('span', { 'aria-hidden': 'true', text: '←' }), 'Back to the conversation');
  v.replaceChildren(back, h('h3', { class: 'cg-end-title', id: 'cg-end-title', tabindex: '-1', text: 'Your summary' }), status,
    h('label', { class: 'visually-hidden', for: 'cg-sum', text: 'Your summary' }), sum, sumNote,
    h('div', { class: 'cg-end-actions' }, dl, h('p', { class: 'cg-dl-note', text: 'A page you can keep, print or email, with a cover drawn for your brief alone.' })),
    contactStep());
  back.addEventListener('click', () => { st.view = 'chat'; showView(); focusFirst(); });
  dl.addEventListener('click', () => { st.brief.summary = sum.value.trim(); if (window.Brief) window.Brief.download(briefDocument()); });
  sum.addEventListener('input', () => { st.brief.summary = sum.value; });
  v.querySelector('.cg-end-title').focus({ preventScroll: true });
  v.scrollTop = 0;
  const text = await summary();
  sum.value = text; st.brief.summary = text;
  status.textContent = 'Here it is. Change anything you like.';
  sumNote.textContent = st.summarySource === 'ai' ? 'Written by the AI from our conversation and your brief.' : 'Put together on this page from your brief.';
}
async function summary() {
  const local = localSummary();
  if (!filled(AI.briefEndpoint) || st.why === 'failed' || !st.transcript.length) { st.summarySource = 'page'; return local; }
  const history = st.transcript.slice(-16).map((m) => ({ role: m.who === 'you' ? 'user' : 'assistant', content: clean(m.text, 1500) || '…' }));
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(AI.briefEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ history, brief: briefForWorker() }), signal: ctl.signal, credentials: 'omit' });
    const j = await r.json();
    if (!r.ok || !j || !j.ok || !j.brief || !filled(j.brief.summary)) throw new Error('no summary');
    const b = j.brief, mine = st.brief;
    if (!filled(mine.business) && filled(b.business)) { mine.business = cap(b.business, 200); renderBrief('business'); }
    if (!filled(mine.look) && filled(b.look)) { mine.look = cap(b.look, 300); renderBrief('look'); }
    if (!mine.timing && TIMING.includes(b.timing)) { mine.timing = b.timing; renderBrief('timing'); }
    if (!mine.budget && BUDGET.includes(b.budget)) { mine.budget = b.budget; renderBrief('budget'); }
    st.summarySource = 'ai';
    return clean(b.summary, 600);
  } catch (e) {
    st.summarySource = 'page';
    return local;
  } finally { clearTimeout(t); }
}
function localSummary() {
  const b = st.brief, out = [];
  const join = (list) => (list.length < 2 ? list.join('') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]);
  const biz = b.business.replace(/[.\s]+$/, '').replace(/^(A|An|The|Our|My)\b/, (m) => m.toLowerCase());
  out.push(b.business ? `A website for ${biz}.` : 'A website, with the business still to describe.');
  if (b.goals.length) out.push(`It should ${join(b.goals.map((g) => lowerFirst(g.replace(/[.\s]+$/, ''))))}.`);
  if (b.must_haves.length) out.push(`Must-haves: ${join(b.must_haves.map((g) => lowerFirst(g.replace(/[.\s]+$/, ''))))}.`);
  if (b.look) out.push(`The look: ${lowerFirst(b.look.replace(/[.\s]+$/, ''))}.`);
  const pinsN = b.pins.length, desN = b.designs.length;
  if (pinsN || desN) out.push('They ' + [pinsN ? `pinned ${pinsN === 1 ? 'one thing' : pinsN + ' things'} they like on this site` : '', desN ? `sent ${desN === 1 ? 'a design' : desN + ' designs'} from Design yours` : ''].filter(Boolean).join(' and ') + '.');
  return out.join(' ');
}
function briefDocument() {
  const b = st.brief;
  return {
    business: b.business, goals: b.goals.slice(), must_haves: b.must_haves.slice(), look: b.look,
    pins: b.pins.map((p) => ({ n: p.n, label: p.label, section: p.section, choice: p.choice, note: p.note, snapshot: p.snapshot })),
    designs: b.designs.map((d) => ({ source: d.source, summary: d.summary, snapshot: d.snapshot })),
    timing: b.timing, budget: b.budget, notes: b.notes.slice(), summary: b.summary,
    transcript: st.transcript.slice(), created: new Date().toISOString(),
  };
}

// The contact step: never sent to the AI; only sent anywhere once the enquiry is live.
function contactStep() {
  const live = enquiryLive(), L = S.legal || {};
  const err = h('p', { class: 'cg-error', role: 'alert' });
  const field = (id, label, attrs, opt) => h('div', { class: 'cg-cf' }, h('label', { for: id }, label, opt ? h('span', { class: 'cg-opt', text: ' (optional)' }) : null), h('input', Object.assign({ id, class: 'cg-input-line' }, attrs)));
  const consentText = `I agree to ${S.studioName || 'Toff Studio'} using these details to reply to my enquiry.`;
  const form = h('form', { class: 'cg-contact', novalidate: true, 'aria-labelledby': 'cg-contact-title' },
    h('h3', { class: 'cg-end-title', id: 'cg-contact-title', text: 'Your details' }),
    h('p', { class: 'cg-contact-note', text: 'So Toff can reply to you. These go to the studio only, never to the AI.' }),
    field('cg-name', 'Your name', { name: 'name', type: 'text', autocomplete: 'name', maxlength: '120' }),
    field('cg-email', 'Email', { name: 'email', type: 'email', autocomplete: 'email', inputmode: 'email', maxlength: '200' }),
    field('cg-phone', 'Phone', { name: 'phone', type: 'tel', autocomplete: 'tel', inputmode: 'tel', maxlength: '40' }, true),
    h('label', { class: 'cg-consent' }, h('input', { type: 'checkbox', name: 'consent', id: 'cg-consent' }), h('span', null, consentText, filled(L.privacyPolicyUrl) ? [' ', link(L.privacyPolicyUrl, 'Privacy policy', true)] : null)),
    err,
    h('div', { class: 'cg-send-row' }, h('button', { class: 'cg-send-brief', type: 'submit' }, 'Send to Toff')),
    live ? null : h('p', { class: 'cg-demo', text: 'Preview: the enquiry isn’t switched on yet, so nothing is sent. Please don’t enter personal details.' }));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = form.elements, missing = []; let first = null;
    const bad = (input, isBad) => { input.setAttribute('aria-invalid', isBad ? 'true' : 'false'); return isBad; };
    if (bad(f.name, !f.name.value.trim())) { missing.push('your name'); first = first || f.name; }
    if (bad(f.email, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim()))) { missing.push('an email address we can reply to'); first = first || f.email; }
    if (bad(f.consent, !f.consent.checked)) { missing.push('a tick in the box'); first = first || f.consent; }
    if (missing.length) { err.textContent = 'Please add ' + missing.join(', ').replace(/, ([^,]*)$/, ' and $1') + '.'; first.focus(); return; }
    err.textContent = '';
    const thanks = (sent) => {
      const t = h('div', { class: 'cg-thanks', tabindex: '-1' },
        h('h3', { class: 'cg-end-title', text: sent ? 'Thank you, Toff will be in touch personally' : 'Thank you' }),
        h('p', { text: sent ? 'Your brief and details are with the studio.' : 'This is a preview, so nothing was sent. Download your brief to keep it' + (filled(S.email) ? `, and email it to ${S.email.trim()} if you’d like to get in touch now.` : '.') }));
      form.replaceWith(t); t.focus();
    };
    if (!live) { thanks(false); return; }
    const btn = form.querySelector('.cg-send-brief'); btn.disabled = true; btn.textContent = 'Sending…';
    const b = briefDocument();
    const payload = { name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), message: window.Brief ? window.Brief.text(b) : '', brief: JSON.stringify(Object.assign({}, b, { pins: b.pins.map((p) => Object.assign({}, p, { snapshot: null })), designs: b.designs.map((d) => Object.assign({}, d, { snapshot: null })) })).slice(0, 90000) };
    fetch(S.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) })
      .then((r) => { if (!r.ok) throw new Error(r.status); thanks(true); })
      .catch(() => { btn.disabled = false; btn.textContent = 'Send to Toff'; err.textContent = 'Sorry, that didn’t go through. Please try again in a moment' + (filled(S.email) ? ', or email ' + S.email.trim() : '') + '.'; });
  });
  return form;
}

/* ------------------------------------------------------------------ "Prefer a form? →": the short enquiry */
function shortForm(onBack) {
  const live = enquiryLive(), L = S.legal || {};
  const radios = (name, legend, list) => h('fieldset', { class: 'cg-sf-set' }, h('legend', { text: legend }),
    h('div', { class: 'cg-sf-choices' }, list.map((v, i) => h('label', { class: 'cg-sf-choice' }, h('input', { type: 'radio', name, value: v, id: `cg-sf-${name}-${i}` }), h('span', { text: v })))));
  const err = h('p', { class: 'cg-error', role: 'alert' });
  const back = h('button', { class: 'cg-back', type: 'button' }, h('span', { 'aria-hidden': 'true', text: '←' }), 'Back to the assistant');
  back.addEventListener('click', onBack);
  const form = h('form', { class: 'cg-sf', novalidate: true, 'aria-labelledby': 'cg-sf-title' },
    h('h3', { class: 'cg-sf-title', id: 'cg-sf-title', tabindex: '-1', text: 'A short form' }),
    h('div', { class: 'cg-cf cg-sf-wide' }, h('label', { for: 'cg-sf-business', text: 'What does your business do?' }), h('input', { id: 'cg-sf-business', name: 'business', type: 'text', class: 'cg-input-line', maxlength: '240', placeholder: 'For example: a bakery in Hackney' })),
    radios('need', 'What do you need?', NEEDS), radios('timing', 'When would you like it?', TIMING), radios('budget', 'Budget range', BUDGET),
    h('div', { class: 'cg-sf-people' },
      h('div', { class: 'cg-cf' }, h('label', { for: 'cg-sf-name', text: 'Your name' }), h('input', { id: 'cg-sf-name', name: 'name', type: 'text', class: 'cg-input-line', autocomplete: 'name', maxlength: '120' })),
      h('div', { class: 'cg-cf' }, h('label', { for: 'cg-sf-email', text: 'Email' }), h('input', { id: 'cg-sf-email', name: 'email', type: 'email', class: 'cg-input-line', autocomplete: 'email', inputmode: 'email', maxlength: '200' })),
      h('div', { class: 'cg-cf' }, h('label', { for: 'cg-sf-phone' }, 'Phone', h('span', { class: 'cg-opt', text: ' (optional)' })), h('input', { id: 'cg-sf-phone', name: 'phone', type: 'tel', class: 'cg-input-line', autocomplete: 'tel', inputmode: 'tel', maxlength: '40' }))),
    h('label', { class: 'cg-consent' }, h('input', { type: 'checkbox', name: 'consent', id: 'cg-sf-consent' }), h('span', null, `I agree to ${S.studioName || 'Toff Studio'} using these details to reply to my enquiry.`, filled(L.privacyPolicyUrl) ? [' ', link(L.privacyPolicyUrl, 'Privacy policy', true)] : null)),
    err,
    h('div', { class: 'cg-send-row' }, h('button', { class: 'btn-gold', type: 'submit' }, 'Send')),
    live ? null : h('p', { class: 'cg-demo', text: 'Preview: the enquiry isn’t switched on yet, so nothing is sent. Please don’t enter personal details.' }));
  const wrap = h('div', { class: 'cg-sf-wrap', hidden: true }, back, form);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = form.elements, missing = []; let first = null;
    const pick = (n) => { const r = form.querySelector(`input[name="${n}"]:checked`); return r ? r.value : ''; };
    const bad = (input, isBad) => { if (input.setAttribute) input.setAttribute('aria-invalid', isBad ? 'true' : 'false'); return isBad; };
    if (bad(f.business, !f.business.value.trim())) { missing.push('what your business does'); first = first || f.business; }
    if (bad(f.name, !f.name.value.trim())) { missing.push('your name'); first = first || f.name; }
    if (bad(f.email, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim()))) { missing.push('an email address we can reply to'); first = first || f.email; }
    if (bad(f.consent, !f.consent.checked)) { missing.push('a tick in the box'); first = first || f.consent; }
    if (missing.length) { err.textContent = 'Please add ' + missing.join(', ').replace(/, ([^,]*)$/, ' and $1') + '.'; first.focus(); return; }
    err.textContent = '';
    const answers = { business: f.business.value.trim(), need: pick('need'), timing: pick('timing'), budget: pick('budget'), name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim() };
    const thanks = (sent) => {
      const dl = h('dl', { class: 'cg-sf-summary' }, [['Your business', answers.business], ['You need', answers.need], ['When', answers.timing], ['Budget', answers.budget], ['Your details', [answers.name, answers.email, answers.phone].filter(Boolean).join(' · ')]]
        .filter((r) => r[1]).map((r) => h('div', null, h('dt', { text: r[0] }), h('dd', { text: r[1] }))));
      const t = h('div', { class: 'cg-thanks', tabindex: '-1' }, h('h3', { class: 'cg-sf-title', text: sent ? 'Thank you, we’ll be in touch personally' : 'Thank you' }),
        h('p', { text: sent ? (filled((S.contact || {}).replyTime) ? `We’ll reply within ${S.contact.replyTime.trim()}.` : 'We’ll reply personally.') : 'This is a preview, so nothing was sent.' }), dl);
      form.replaceWith(t); t.focus();
    };
    if (!live) { thanks(false); return; }
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…';
    fetch(S.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(answers) })
      .then((r) => { if (!r.ok) throw new Error(r.status); thanks(true); })
      .catch(() => { btn.disabled = false; btn.textContent = 'Send'; err.textContent = 'Sorry, that didn’t go through. Please try again in a moment' + (filled(S.email) ? ', or email ' + S.email.trim() : '') + '.'; });
  });
  return wrap;
}

/* ------------------------------------------------------------------ the panel (a modal dialog) */
function buildDialog() {
  if (dialog) return dialog;
  const close = h('button', { class: 'cg-close', type: 'button' }, 'Close');
  const host = h('div', { class: 'cg-host' });
  dialog = h('dialog', { class: 'cg-dialog', id: 'cg-dialog', 'aria-labelledby': 'cg-dialog-title' },
    h('div', { class: 'cg-sheet' }, h('header', { class: 'cg-head' }, h('h2', { class: 'cg-title', id: 'cg-dialog-title' }, 'Plan with us'), close), host));
  dialog._host = host;
  close.addEventListener('click', () => closeDialog());
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); if (st.pointer && st.pointer.isOn()) return; closeDialog(); });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) closeDialog(); });   // a click on the backdrop
  doc.body.append(dialog);
  return dialog;
}
function showDialog() {
  buildDialog(); buildComponent();
  if (!dialog.open) {
    const y = ui.log.scrollTop;
    dialog._host.append(ui.el);
    if (inlineHost) inlineHost.classList.add('is-away');
    ui.log.scrollTop = y;
    const sbw = window.innerWidth - root.clientWidth;
    root.classList.add('cg-locked'); if (sbw > 0) root.style.setProperty('--cg-sbw', sbw + 'px');
    dialog.showModal();
    if (!reduce()) { dialog.classList.remove('is-in'); void dialog.offsetWidth; }
    dialog.classList.add('is-in');
    if (fab) fab.setAttribute('aria-expanded', 'true');
  }
  st.unseen = 0; badge(); hideCheck();
  setTimeout(focusFirst, 30);
}
function closeDialog(o) {
  if (!dialog || !dialog.open) return;
  dialog.close(); dialog.classList.remove('is-in');
  root.classList.remove('cg-locked'); root.style.removeProperty('--cg-sbw');
  if (fab) fab.setAttribute('aria-expanded', 'false');
  if (inlineHost) { const y = ui.log.scrollTop; inlineHost.querySelector('.cg-slot').append(ui.el); inlineHost.classList.remove('is-away'); ui.log.scrollTop = y; }
  if (!(o && o.silent)) {
    const back = opener && opener.isConnected && opener.getClientRects().length && getComputedStyle(opener).visibility !== 'hidden' ? opener : (fab && fabVisible ? fab : null);
    if (back) back.focus({ preventScroll: true });
    opener = null;
  }
  hideCheck();
}
function mountOnScreen() {
  if (!inlineHost) return false;
  const r = inlineHost.getBoundingClientRect(), vh = window.innerHeight;
  const seen = Math.min(r.bottom, vh) - Math.max(r.top, 0);
  return seen > Math.min(vh * 0.45, r.height * 0.6);
}
function inlineOnScreen() { return !!inlineHost && !inlineHost.querySelector('.cg-sf-wrap:not([hidden])') && mountOnScreen(); }

export async function open(opts) {
  const o = opts || {};
  await loadCss();
  buildComponent();
  if (!opener && doc.activeElement && doc.activeElement !== doc.body && !(ui.el.contains(doc.activeElement))) opener = doc.activeElement;
  if (o.preset && o.preset.brief) Object.keys(o.preset.brief).forEach((k) => { if (TEXT_FIELDS.includes(k)) st.brief[k] = clean(o.preset.brief[k], 300); else if (LIST_FIELDS.includes(k)) [].concat(o.preset.brief[k]).forEach((v) => { const c = clean(v, 200); if (c && !st.brief[k].includes(c)) st.brief[k].push(c); }); });
  if (o.preset && o.preset.brief) renderBrief();
  if (inlineOnScreen() && !(dialog && dialog.open)) {
    inlineHost.scrollIntoView({ block: 'nearest', behavior: reduce() ? 'auto' : 'smooth' });
    opener = null;
  } else showDialog();
  await start();
  if (o.topic === 'assistant' && !st.brief.must_haves.some((m) => /assistant/i.test(m))) {
    if (st.busy) waitNote();
    else if (!st.transcript.some((m) => m.who === 'you')) await firstTopic('An AI assistant');
    else await visitor('An AI assistant');
  }
  if (o.preset && filled(o.preset.message)) await visitor(String(o.preset.message).slice(0, 600));
  focusFirst();
}
export function close() { closeDialog(); }

/* ------------------------------------------------------------------ the floating button and its hide rules */
let fabVisible = false, clearSince = 0, checking = 0;
const HIDE_OVER = [['[data-hero]', '#hero', '.hero', '#top'], ['#ai'], ['#design-yours'], ['.sh-footer', 'body > footer']];
const CONTROL = 'a[href], button, input, select, textarea, summary, label, [role="button"], [role="link"], [role="tab"], [tabindex]:not([tabindex="-1"]), iframe, video, audio, canvas, img, svg, [role="img"], [contenteditable="true"]';
function buildFab(shell) {
  if (fab) return;
  const slot = (shell && shell.floatSlot) || doc.querySelector('[data-shell-float]') || doc.body.appendChild(h('div', { class: 'sh-float cg-float-own', 'data-shell-float': true }));
  fab = h('button', { class: 'cg-fab', type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': 'cg-dialog' }, svgPen(), h('span', { class: 'cg-fab-label', text: 'Plan with us' }), h('span', { class: 'cg-badge', hidden: true }));
  fabWrap = h('div', { class: 'cg-fab-wrap is-tucked' }, fab);
  slot.append(fabWrap);
  fab.addEventListener('click', () => { opener = fab; open({ source: 'float' }); });
  const tick = () => { if (!checking) checking = requestAnimationFrame(() => { checking = 0; hideCheck(); }); };
  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick);
  setInterval(() => { if (!doc.hidden) hideCheck(); }, 500);
  tick(); badge();
}
function badge() {
  if (!fab) return;
  const b = fab.querySelector('.cg-badge');
  b.hidden = !st.unseen; b.textContent = st.unseen ? String(st.unseen) : '';
  fab.setAttribute('aria-label', st.unseen ? `Plan with us (${st.unseen} new in your brief)` : 'Plan with us');
}
function overlaps(a, b, m) { return a.left < b.right + m && a.right > b.left - m && a.top < b.bottom + m && a.bottom > b.top - m; }
function regionUnder(r) {
  for (const group of HIDE_OVER) {
    const n = group.map((s) => doc.querySelector(s)).find(Boolean);
    if (n && overlaps(n.getBoundingClientRect(), r, 8)) return true;
  }
  return false;
}
// Would the button cover text, a control or a picture? Look at what is under its rectangle.
const range = doc.createRange();
function coversContent(r) {
  const R = { left: r.left - 6, right: r.right + 6, top: r.top - 6, bottom: r.bottom + 6 };
  const seen = new Set();
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
    const x = R.left + (R.right - R.left) * (i / 4), y = R.top + (R.bottom - R.top) * (j / 2);
    if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) continue;
    for (const n of doc.elementsFromPoint(x, y)) {
      if (seen.has(n)) continue; seen.add(n);
      if (n === root || n === doc.body || (fabWrap && fabWrap.contains(n)) || n.closest('.sh-float, .vt-rule, .as-pin-layer')) continue;
      if (n.matches(CONTROL) && overlaps(n.getBoundingClientRect(), R, 0)) return true;
      for (const c of n.childNodes) {
        if (c.nodeType !== 3 || !c.nodeValue.trim()) continue;
        range.selectNodeContents(c);
        for (const q of range.getClientRects()) if (overlaps(q, R, 0)) return true;
      }
    }
  }
  // Pictures under a pointer-events: none layer (films, stills) aren't hit-tested, so look for them directly.
  for (const m of doc.querySelectorAll('img, video, canvas, iframe, svg[role="img"], [role="img"]')) {
    if ((fabWrap && fabWrap.contains(m)) || m.closest('.sh-float, .cg-dialog, .as-pin-layer, [hidden]')) continue;
    const q = m.getBoundingClientRect();
    if (q.width && q.height && overlaps(q, R, 0) && getComputedStyle(m).visibility !== 'hidden') return true;
  }
  return false;
}
function hideCheck() {
  if (!fabWrap) return;
  const slot = fabWrap.parentElement; if (!slot) return;
  const r = fabWrap.getBoundingClientRect();   // the wrapper never moves; the button inside slides a little when tucked
  const modal = (dialog && dialog.open) || !!doc.querySelector('dialog[open]:not(.cg-dialog), [aria-modal="true"]:not([hidden])') || root.classList.contains('sh-menu-open') || root.classList.contains('as-pointing');
  const noHero = !HIDE_OVER[0].some((s) => doc.querySelector(s));
  const early = noHero && window.scrollY < window.innerHeight * 0.6;
  const focused = doc.activeElement === fab;
  const blocked = modal || early || mountOnScreen() || regionUnder(r) || coversContent(r);
  const now = performance.now();
  if (blocked && !(focused && !modal)) { clearSince = 0; setFab(false); return; }
  if (!clearSince) clearSince = now;
  if (focused || now - clearSince >= 160) setFab(true); else setTimeout(hideCheck, 170);
}
function setFab(on) {
  if (on === fabVisible) return;
  fabVisible = on;
  fabWrap.classList.toggle('is-tucked', !on);
}

/* ------------------------------------------------------------------ mount (the inline concierge) */
let mounted = false;
export function mount(el, ctx) {
  const c = ctx || {};
  ctxShell = c.shell || window.ToffShell || null;
  loadCss();
  buildFab(ctxShell);
  if (!el || mounted) return api;
  mounted = true;
  buildComponent();
  inlineHost = el;
  el.classList.add('cg-inline');
  const slot = h('div', { class: 'cg-slot' }, ui.el);
  const away = h('p', { class: 'cg-away', text: 'The conversation is open in the panel.' });
  const preferBtn = h('button', { class: 'link-arrow cg-prefer', type: 'button' }, h('span', { text: 'Prefer a form?' }), ' ', h('span', { class: 'arrow', 'aria-hidden': 'true', text: '→' }));
  const sf = shortForm(() => { sf.hidden = true; slot.hidden = false; extra.hidden = false; preferBtn.focus(); });
  const extra = h('div', { class: 'cg-inline-extra' }, preferBtn);
  preferBtn.addEventListener('click', () => { slot.hidden = true; extra.hidden = true; sf.hidden = false; const t = sf.querySelector('.cg-sf-title'); if (t) t.focus({ preventScroll: true }); sf.scrollIntoView({ block: 'nearest', behavior: reduce() ? 'auto' : 'smooth' }); });
  el.replaceChildren(slot, away, extra, sf);
  // The opening appears once the inline concierge is near (or at once if it already is).
  const startNear = () => { start(); };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); startNear(); } }, { rootMargin: '0px 0px 50% 0px' });
    io.observe(el);
  } else startNear();
  return api;
}

/* ------------------------------------------------------------------ wiring */
st.mode = canGoLive() ? 'live' : 'offline';
st.why = filled(AI.conciergeEndpoint) ? (liveUsed() >= liveMax() ? 'limit' : '') : 'off';
doc.addEventListener('toff:concierge-open', (e) => {
  e.preventDefault();
  const d = e.detail || {};
  if (doc.activeElement && doc.activeElement !== doc.body) opener = doc.activeElement;
  open({ topic: d.topic, source: d.source });
});
doc.addEventListener('toff:brief-add', onBriefAdd);
if (window.__toffLastDesign) onBriefAdd({ detail: window.__toffLastDesign });   // sent before this module loaded
if (window.ToffShell) buildFab(window.ToffShell);
loadCss();
const api = { mount, open, close, state: () => st };
window.ToffConcierge = api;
export default api;
