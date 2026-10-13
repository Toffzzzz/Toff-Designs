/*
 * Toff Studio: Design yours (round 05, home page chapter 5, "See your business as a website").
 * One tool with three ways in, as a segmented control (a tablist: arrow keys, Home and End):
 *   Pick      business, mood, layout and name (the playground's options), drawn as you choose
 *   Sketch    Draw your site's blocks and pen, with "I'm done" (assets/studio/drawsite.js, loaded only when
 *             Sketch is first chosen; it reads the sketch through /read-sketch exactly as before and hands
 *             the result to SiteKit instead of drawing its own picture)
 *   Describe  a sentence or two (up to 400 characters) and "Show me": live through S.ai.designEndpoint
 *             (POST { text }, with a time-out); offline or on any error, SiteKit.fromWords(text). The panel
 *             says plainly which one happened.
 * One preview, a laptop and a phone drawn in the studio's ink line, both rendered by SiteKit.render
 * (assets/shared/sitekit.js) from the same spec. The first time the preview is reached the two devices
 * are drawn in ink and the site appears inside them (once; reduced motion shows them finished).
 *
 *   import { mount, open } from './assets/home/design-yours.js';
 *   const tool = mount(el, { settings: window.TOFF_SETTINGS, shell: window.ToffShell });
 *   tool.open({ way: 'describe', words: 'A florist in Deptford' });   // same as the 'toff:design-open' event
 *   tool.spec()   tool.way()   tool.ready (a Promise)   tool.destroy()
 *   open(detail)  works before mount too (it is applied when the tool mounts); so does window.__toffDesignOpen = detail
 *                 set by anyone who sent 'toff:design-open' before this module was imported
 *
 * Events
 *   listens  document 'toff:design-open'  detail { way: 'pick'|'sketch'|'describe', business, mood, layout, words }
 *            ('' or a missing value means "not chosen"). Switches to that way, applies the preset to Pick,
 *            draws it (Pick), or fills in and shows the words (Describe), and brings the tool on screen.
 *   sends    document 'toff:brief-add'      detail { kind: 'design', spec, describe, source }  ("Send this to Toff")
 *            then 'toff:concierge-open'     detail { source: 'design-yours' } (cancelable; the concierge claims it).
 *            The last design sent is also kept on window.__toffLastDesign, for a concierge that mounts later.
 *
 * Loads its own CSS (design-yours.css and SiteKit's sitekit.css) next to this file. Nothing here is fixed or
 * sticky; the drawing surface is the only place with touch-action: none.
 */
import SiteKit from '../shared/sitekit.js';
import { start as motionStart, reducedMotion, tokens } from '../shared/motion.js';

const WAYS = [
  { id: 'pick', label: 'Pick', intro: '' },
  { id: 'sketch', label: 'Sketch', intro: 'Drag blocks onto the paper, or draw with the pen. Press “I’m done” when you’re happy.' },
  { id: 'describe', label: 'Describe', intro: 'Tell us about your business and what the site should have, in a sentence or two.' },
];
const EXAMPLE = 'A Turkish bakery in Walthamstow, warm and modern, with our hours and a map';
const PICK_KINDS = ['clinic', 'cafe', 'salon', 'trades', 'restaurant', 'boutique'];
const NAME_MAX = 40, WORDS_MAX = 400;
const STORE = 'toff-design-yours';        // sessionStorage: this visitor's Pick choices (a convenience only)
const LIVE_KEY = 'toff-live-design';      // sessionStorage: live Describe answers used this visit
const LAYOUT_GLYPH = {
  split: '<svg viewBox="0 0 36 24" aria-hidden="true"><rect x="1" y="1" width="34" height="22" rx="3"/><path d="M5 9 H15 M5 13 H13 M5 17 H10"/><rect x="19" y="6" width="12" height="12" rx="2"/></svg>',
  story: '<svg viewBox="0 0 36 24" aria-hidden="true"><rect x="1" y="1" width="34" height="22" rx="3"/><path d="M11 6 H25 M13 9.5 H23"/><rect x="5" y="13" width="26" height="7" rx="2"/></svg>',
  full: '<svg viewBox="0 0 36 24" aria-hidden="true"><rect x="1" y="1" width="34" height="22" rx="3"/><path d="M1 16 H35" opacity=".35"/><path d="M5 12 H17 M5 15.5 H13"/></svg>',
};
const PEN_KEY = [
  ['<rect x="2" y="5" width="36" height="9" rx="2"/><circle cx="7" cy="9.5" r="2.3"/>', 'Wide box at the top', 'menu bar'],
  ['<rect x="3" y="3" width="34" height="22" rx="2"/><path d="M3 3 L37 25 M37 3 L3 25"/>', 'Box with an X', 'picture'],
  ['<path d="M4 9 H36 M4 16 H30 M4 22 H24"/>', 'Lines', 'a heading, then text'],
  ['<rect x="8" y="8" width="24" height="12" rx="3"/>', 'Small box', 'button'],
  ['<rect x="3" y="3" width="34" height="22" rx="2"/>', 'Big empty box', 'card'],
  ['<circle cx="20" cy="14" r="9"/>', 'Circle', 'logo'],
];

/* ---------------------------------------------------------------- small helpers */
const doc = document;
function h(tag, attrs, ...kids) {
  const e = doc.createElement(tag);
  for (const k in attrs || {}) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;       // constant markup from this file only
    else e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach((c) => { if (c != null && c !== false) e.append(c); });
  return e;
}
function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(sessionStorage.getItem(key) || 'null');
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) { /* private mode or blocked storage: fine without it */ }
  return null;
}
function endpoint(S, key, route) {           // settings.js: '' = off; null = workerBase + route; a full address as given
  const ai = (S && S.ai) || {}, v = ai[key], base = typeof ai.workerBase === 'string' ? ai.workerBase.replace(/\/+$/, '') : '';
  if (v === '' || v === false) return '';
  if (typeof v === 'string' && v) return /^https?:\/\//i.test(v) ? v : base ? base + (v.charAt(0) === '/' ? v : '/' + v) : '';
  return base ? base + route : '';
}
function loadCss(href) {
  return new Promise((resolve) => {
    const abs = new URL(href, doc.baseURI).href;
    const have = [...doc.querySelectorAll('link[rel="stylesheet"]')].find((l) => l.href === abs);
    if (have) { if (have.sheet) resolve(); else { have.addEventListener('load', resolve, { once: true }); have.addEventListener('error', resolve, { once: true }); setTimeout(resolve, 3000); } return; }
    const l = h('link', { rel: 'stylesheet', href: abs });
    l.addEventListener('load', resolve, { once: true }); l.addEventListener('error', resolve, { once: true });
    doc.head.append(l);
  });
}
let drawSiteLoading = null;
function loadDrawSite() {
  if (window.DrawSite) return Promise.resolve(window.DrawSite);
  if (drawSiteLoading) return drawSiteLoading;
  drawSiteLoading = new Promise((resolve, reject) => {
    const s = h('script', { src: new URL('../studio/drawsite.js', import.meta.url).href });
    s.onload = () => (window.DrawSite ? resolve(window.DrawSite) : reject(new Error('DrawSite missing')));
    s.onerror = () => { drawSiteLoading = null; s.remove(); reject(new Error('drawsite.js did not load')); };
    doc.head.append(s);
  });
  return drawSiteLoading;
}

/* ---------------------------------------------------------------- one tool per page */
let tool = null, pending = null;
function onDesignOpen(e) { open(e && e.detail); }
doc.addEventListener('toff:design-open', onDesignOpen);
// A 'toff:design-open' sent before this module was imported can be left on window.__toffDesignOpen; it is applied on mount.
if (window.__toffDesignOpen && typeof window.__toffDesignOpen === 'object') { pending = window.__toffDesignOpen; window.__toffDesignOpen = null; }

export function open(detail) {
  if (tool) tool.open(detail || {});
  else pending = detail || {};
}

export function mount(el, ctx) {
  if (tool) return tool;
  tool = build(el, ctx || {});
  return tool;
}

function build(root, ctx) {
  const S = ctx.settings || window.TOFF_SETTINGS || {};
  const shell = ctx.shell || window.ToffShell || null;
  const reduce = reducedMotion();
  const uid = 'dy' + Math.random().toString(36).slice(2, 7);
  const AI = S.ai || {};
  const designEp = endpoint(S, 'designEndpoint', '/design');
  const sketchEp = endpoint(S, 'readSketchEndpoint', '/read-sketch');
  const maxLive = typeof AI.maxLiveAnswers === 'number' ? AI.maxLiveAnswers : 8;
  const timeoutMs = typeof AI.firstWordTimeoutMs === 'number' && AI.firstWordTimeoutMs > 0 ? AI.firstWordTimeoutMs : 12000;

  /* ---------- state ---------- */
  const saved = store(STORE) || {};
  const pick = {
    business: PICK_KINDS.includes(saved.business) ? saved.business : 'cafe',
    mood: SiteKit.MOODS[saved.mood] ? saved.mood : 'calm',
    layout: SiteKit.LAYOUTS[saved.layout] ? saved.layout : 'split',
    name: typeof saved.name === 'string' ? saved.name.slice(0, NAME_MAX) : '',
  };
  let way = 'pick', spec = SiteKit.fromPick(pick), source = 'pick', seq = 0, drawSite = null;

  /* ---------- the segmented control ---------- */
  const tabs = {}, panels = {};
  const ind = h('span', { class: 'dy-ways-ind', 'aria-hidden': 'true' });
  const tablist = h('div', { class: 'dy-ways', role: 'tablist', 'aria-label': 'Ways to make your design' }, ind);
  WAYS.forEach((w, i) => {
    tabs[w.id] = h('button', { type: 'button', class: 'dy-way', role: 'tab', id: `${uid}-tab-${w.id}`, 'aria-controls': `${uid}-panel-${w.id}`,
      'aria-selected': i === 0 ? 'true' : 'false', tabindex: i === 0 ? '0' : '-1', 'data-way': w.id, text: w.label });
    tablist.append(tabs[w.id]);
  });

  /* ---------- Pick ---------- */
  const pickForm = h('form', { class: 'dy-pick', 'aria-label': 'Pick a design', novalidate: true });
  const pickGroups = {};
  function chipGroup(key, legend, items) {
    const box = h('div', { class: `dy-chips dy-chips--${key}` });
    items.forEach(([value, label, extra]) => {
      const id = `${uid}-${key}-${value}`;
      box.append(h('label', { class: 'dy-chip', for: id },
        h('input', { type: 'radio', class: 'dy-radio', name: `${uid}-${key}`, id, value }),
        extra ? h('span', { class: 'dy-chip-art', 'aria-hidden': 'true', html: extra }) : null,
        h('span', { class: 'dy-chip-label', text: label })));
    });
    pickGroups[key] = box;
    return h('fieldset', { class: 'dy-field' }, h('legend', { class: 'dy-legend', text: legend }), box);
  }
  pickForm.append(
    chipGroup('business', 'Your business', PICK_KINDS.map((k) => [k, SiteKit.BUSINESSES[k].label])),
    chipGroup('mood', 'Mood', Object.keys(SiteKit.MOODS).map((k) => [k, SiteKit.MOODS[k].label,
      '<span class="dy-dots">' + SiteKit.MOODS[k].dots.map((c) => `<i style="background:${c}"></i>`).join('') + '</span>'])),
    chipGroup('layout', 'Layout', Object.keys(SiteKit.LAYOUTS).map((k) => [k, SiteKit.LAYOUTS[k].label, LAYOUT_GLYPH[k]])),
  );
  const nameInput = h('input', { class: 'dy-input', type: 'text', id: `${uid}-name`, maxlength: String(NAME_MAX), autocomplete: 'organization', spellcheck: 'false' });
  pickForm.append(h('div', { class: 'dy-field dy-field--name' },
    h('label', { class: 'dy-legend', for: `${uid}-name` }, 'Business name ', h('span', { class: 'dy-optional', text: '(optional)' })),
    nameInput));
  pickForm.addEventListener('submit', (e) => e.preventDefault());
  pickForm.addEventListener('change', (e) => {
    const t = e.target;
    if (!t.classList.contains('dy-radio')) return;
    const key = t.name.slice(uid.length + 1);
    pick[key] = t.value; savePick(); drawPick();
  });
  let nameTimer = 0;
  nameInput.addEventListener('input', () => {
    clearTimeout(nameTimer);
    nameTimer = setTimeout(() => { pick.name = nameInput.value.trim().slice(0, NAME_MAX); savePick(); drawPick(); }, 160);
  });
  function syncPick() {
    ['business', 'mood', 'layout'].forEach((k) => pickGroups[k].querySelectorAll('input').forEach((i) => { i.checked = i.value === pick[k]; }));
    if (doc.activeElement !== nameInput) nameInput.value = pick.name;
    if (styleNote) styleNote.textContent = `${SiteKit.BUSINESSES[pick.business].label}, ${SiteKit.MOODS[pick.mood].label.toLowerCase()}`;
  }
  function savePick() { store(STORE, pick); }
  function drawPick() { seq++; busy(false); setSpec(SiteKit.fromPick(pick), 'pick'); }

  /* ---------- Sketch (DrawSite, loaded when first chosen) ---------- */
  const styleNote = h('b');
  const sketchRoot = h('div', { class: 'dy-sketch' },
    h('div', { class: 'dr-palette' },
      h('p', { class: 'dr-palette-hint', id: `${uid}-palette`, text: 'Tap a block to add it, or drag it onto the paper.' }),
      h('div', { class: 'dr-palette-chips', role: 'group', 'aria-labelledby': `${uid}-palette` })),
    h('div', { class: 'dr-paper' },
      h('canvas', { class: 'dr-canvas', role: 'img', 'aria-label': 'Paper for your homepage sketch. Add blocks with the buttons above, or draw on it with a mouse, pen or finger. The top of the paper is the top of the page.' }),
      h('div', { class: 'dr-blocks' }),
      h('p', { class: 'dr-hint', 'aria-hidden': 'true' }, h('span', { text: 'Drag blocks here, or draw' }), h('small', { text: 'The top of the paper is the top of your page' }))),
    h('div', { class: 'dr-tools' },
      h('button', { type: 'button', class: 'dr-done dy-btn', disabled: true, text: 'I’m done: build my site' }),
      h('button', { type: 'button', class: 'dr-example dy-text-btn', disabled: true, text: 'Draw one for me' }),
      h('button', { type: 'button', class: 'dr-undo dy-text-btn', disabled: true, text: 'Undo' }),
      h('button', { type: 'button', class: 'dr-clear dy-text-btn', disabled: true, text: 'Start again' })),
    h('p', { class: 'dy-why dy-why--sketch', text: 'Add a block or draw on the paper first, then “I’m done” builds it.' }),
    h('p', { class: 'dr-status dy-status', 'aria-live': 'polite' }),
    h('p', { class: 'dy-note' }, 'It’s built for the business and mood chosen in Pick: ', styleNote, '.'),
    h('p', { class: 'dr-ai-privacy dy-note', hidden: true, text: 'When you press “I’m done”, your sketch and the words you typed on it are sent to Anthropic’s Claude to be read. They aren’t stored.' }),
    h('details', { class: 'dr-pen dy-details' },
      h('summary', { text: 'What can I draw with the pen?' }),
      h('ul', { class: 'dr-key' },
        PEN_KEY.map(([svg, what, becomes]) => h('li', null, h('span', { class: 'dy-key-art', 'aria-hidden': 'true', html: `<svg viewBox="0 0 40 28">${svg}</svg>` }), h('span', null, h('b', { text: what }), ' ' + becomes))),
        h('li', { class: 'dr-key-ai', hidden: true }, h('span', { class: 'dy-key-art', 'aria-hidden': 'true', html: '<svg viewBox="0 0 40 28"><rect x="3" y="3" width="34" height="22" rx="2"/><path d="M10 18 V10 L14 15 L18 10 V18 M22 18 L25 10 L28 18 M23 15 H27"/></svg>' }), h('span', null, h('b', { text: 'A word' }), ' such as map, gallery or video')))),
    h('p', { class: 'dr-touch-tip dy-note', text: 'To scroll the page, swipe outside the paper.' }),
    h('p', { class: 'dy-loading dy-status', role: 'status', text: 'Getting the paper ready…' }));
  function startSketch() {
    if (drawSite || sketchRoot.dataset.state === 'loading') return;
    sketchRoot.dataset.state = 'loading';
    loadDrawSite().then((DS) => {
      drawSite = DS.mount(sketchRoot, {
        getStyle: () => ({ business: pick.business, mood: pick.mood, name: pick.name }),
        ai: sketchEp ? { endpoint: sketchEp } : null,
        onBusy: (on, message) => { if (on) { seq++; busy(true, message); } else busy(false); },
        onBuilt: (r) => {
          if (!r || !r.elements || !r.elements.length) return;
          setSpec(SiteKit.fromSketch(r.elements, { business: pick.business, mood: pick.mood, name: pick.name }), 'sketch');
        },
      });
      sketchRoot.dataset.state = 'ready';
      sketchRoot.querySelector('.dy-loading').textContent = '';
    }).catch(() => {
      sketchRoot.dataset.state = 'failed';
      sketchRoot.querySelector('.dy-loading').textContent = 'The sketch tool didn’t load. Check your connection, then choose Sketch again.';
    });
  }

  /* ---------- Describe ---------- */
  const ta = h('textarea', { class: 'dy-input dy-textarea', id: `${uid}-words`, rows: '5', maxlength: String(WORDS_MAX), 'aria-describedby': `${uid}-count ${uid}-dwhy`, placeholder: 'A sentence or two about your business' });
  const count = h('span', { class: 'dy-count tnum', id: `${uid}-count`, 'aria-live': 'off', text: `0 of ${WORDS_MAX} characters` });
  const showBtn = h('button', { type: 'submit', class: 'dy-btn', text: 'Show me' });
  const dWhy = h('p', { class: 'dy-why', id: `${uid}-dwhy`, 'aria-live': 'polite' });
  const dHow = h('p', { class: 'dy-status', 'aria-live': 'polite' });
  const exampleBtn = h('button', { type: 'button', class: 'dy-text-btn dy-example', text: 'Use this example' });
  const describeForm = h('form', { class: 'dy-describe', novalidate: true },
    h('label', { class: 'dy-legend', for: `${uid}-words`, text: 'Your business and your website' }),
    ta,
    h('div', { class: 'dy-row' }, count),
    h('p', { class: 'dy-eg' }, 'For example: ', h('q', { text: EXAMPLE })),
    h('div', { class: 'dy-row dy-row--act' }, showBtn, exampleBtn),
    dWhy, dHow,
    designEp ? h('p', { class: 'dy-note', text: 'Your words are sent to Anthropic’s Claude to be read, and aren’t stored. Please don’t type personal details.' }) : null);
  function countWords() { count.textContent = `${ta.value.length} of ${WORDS_MAX} characters`; }
  ta.addEventListener('input', () => { countWords(); if (ta.value.trim()) dWhy.textContent = ''; });
  exampleBtn.addEventListener('click', () => { ta.value = EXAMPLE; countWords(); dWhy.textContent = ''; ta.focus(); });
  describeForm.addEventListener('submit', (e) => { e.preventDefault(); showWords(ta.value); });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); showWords(ta.value); } });

  function liveUsed() { const n = store(LIVE_KEY); return typeof n === 'number' ? n : 0; }
  async function showWords(raw) {
    const text = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, WORDS_MAX);
    if (!text) { dWhy.textContent = 'Type a sentence or two first, or use the example.'; ta.focus(); return; }
    dWhy.textContent = '';
    if (showBtn.getAttribute('aria-disabled') === 'true') return;   // one at a time; the button says it's drawing
    const my = ++seq;
    if (!designEp) { setSpec(SiteKit.fromWords(text), 'describe'); dHow.textContent = 'Worked out on this page from your words.'; return; }
    if (liveUsed() >= maxLive) {
      setSpec(SiteKit.fromWords(text), 'describe');
      dHow.textContent = 'You’ve used this visit’s live answers, so this one was worked out on this page from your words.';
      return;
    }
    store(LIVE_KEY, liveUsed() + 1);
    busy(true, 'Claude is reading your words…');
    showBtn.setAttribute('aria-disabled', 'true'); showBtn.textContent = 'Drawing it…';
    dHow.textContent = 'Sending your words to Claude…';
    let live = null;
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => { if (ctl) ctl.abort(); }, timeoutMs);
    try {
      const r = await fetch(designEp, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: ctl ? ctl.signal : undefined });
      if (r.ok && /json/i.test(r.headers.get('content-type') || '')) {
        const data = await r.json();
        if (data && data.ok === true && data.spec) { const v = SiteKit.validate(data.spec); if (v.ok) live = v.spec; }
      }
    } catch (err) { /* offline, blocked, timed out or not JSON: the page answers instead */ }
    clearTimeout(timer);
    showBtn.removeAttribute('aria-disabled'); showBtn.textContent = 'Show me';
    if (my !== seq) { dHow.textContent = ''; return; }   // something newer was made meanwhile (Pick or Sketch)
    busy(false);
    if (live) { setSpec(live, 'describe'); dHow.textContent = 'Drawn live by Claude, an AI, from your words.'; }
    else { setSpec(SiteKit.fromWords(text), 'describe'); dHow.textContent = 'The AI didn’t answer this time, so this one was worked out on this page from your words.'; }
  }

  /* ---------- panels ---------- */
  const panelBodies = { pick: pickForm, sketch: sketchRoot, describe: describeForm };
  WAYS.forEach((w, i) => {
    panels[w.id] = h('div', { class: `dy-panel dy-panel--${w.id}`, role: 'tabpanel', id: `${uid}-panel-${w.id}`, 'aria-labelledby': `${uid}-tab-${w.id}`, hidden: i !== 0 },
      w.intro ? h('p', { class: 'dy-intro', text: w.intro }) : null, panelBodies[w.id]);
  });
  const controls = h('div', { class: 'dy-controls' }, WAYS.map((w) => panels[w.id]));

  /* ---------- the preview: a laptop and a phone, drawn in ink ---------- */
  const outline = (rx) => h('span', { class: 'dy-ol', 'aria-hidden': 'true', html: `<svg><rect x="0" y="0" width="100%" height="100%" rx="${rx}" ry="${rx}"/></svg>` });
  const lapSite = h('div', { class: 'dy-site' }), phoneSite = h('div', { class: 'dy-site' });
  const lapScreen = h('div', { class: 'dy-screen dy-screen--laptop' }, lapSite);
  const phoneScreen = h('div', { class: 'dy-screen dy-screen--phone' }, phoneSite);
  const busyBox = h('p', { class: 'dy-busy', hidden: true }, h('span', { class: 'dy-busy-text' }));
  const devices = h('div', { class: 'dy-devices' },
    h('div', { class: 'dy-laptop' },
      h('div', { class: 'dy-lid' }, outline(14), h('div', { class: 'dy-screen-wrap' }, lapScreen, busyBox)),
      h('div', { class: 'dy-base' }, outline(7), h('span', { class: 'dy-notch', 'aria-hidden': 'true' }))),
    h('div', { class: 'dy-phone' }, outline(26), h('span', { class: 'dy-island', 'aria-hidden': 'true' }), phoneScreen));
  const caption = h('figcaption', { class: 'dy-caption', id: `${uid}-cap` });
  const moreBtn = h('button', { type: 'button', class: 'link-arrow dy-more' }, h('span', { text: 'See more of the page' }), h('span', { class: 'arrow', 'aria-hidden': 'true', text: '↓' }));
  const preview = h('figure', { class: 'dy-preview', 'aria-labelledby': `${uid}-cap` }, devices, h('div', { class: 'dy-preview-foot' }, caption, moreBtn));

  /* ---------- Send this to Toff ---------- */
  const sendBtn = h('button', { type: 'button', class: 'dy-btn dy-send-btn' }, h('span', { text: 'Send this to Toff' }), h('span', { class: 'arrow', 'aria-hidden': 'true', text: '→' }));
  const sent = h('p', { class: 'dy-sent', role: 'status' });
  const send = h('div', { class: 'dy-send' }, sendBtn, sent);

  const wrap = h('div', { class: 'dy', 'data-way': 'pick' }, h('div', { class: 'dy-grid' }, h('div', { class: 'dy-head' }, tablist), controls, preview, send));

  /* ---------- "See your site ↓": when the preview is off screen after a build (phones), never automatic ---------- */
  const jumps = {};
  ['sketch', 'describe'].forEach((k) => {
    jumps[k] = h('button', { type: 'button', class: 'link-arrow dy-jump', hidden: true }, h('span', { text: 'See your site' }), h('span', { class: 'arrow', 'aria-hidden': 'true', text: '↓' }));
    jumps[k].addEventListener('click', () => {
      jumps[k].hidden = true;
      preview.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      preview.focus({ preventScroll: true });
    });
  });
  sketchRoot.querySelector('.dr-status').after(jumps.sketch);
  dHow.after(jumps.describe);
  preview.tabIndex = -1;
  function offerJump(from) {
    Object.keys(jumps).forEach((k) => { jumps[k].hidden = true; });
    if (!jumps[from]) return;
    const r = preview.getBoundingClientRect();
    const below = r.top > innerHeight - 120, above = r.bottom < 80;
    jumps[from].hidden = !(below || above);
    jumps[from].lastChild.textContent = above ? '↑' : '↓';
  }

  /* ---------- SiteKit ---------- */
  let lapView = null, phoneView = null;
  function setSpec(next, from) {
    const v = SiteKit.validate(next);
    spec = v.spec; source = from;
    if (lapView) { lapView.update(spec); phoneView.update(spec); }
    caption.textContent = SiteKit.describe(spec).replace(/^A picture of a website/, 'A website');
    sent.textContent = '';
    lapScreen.scrollTop = 0; phoneScreen.scrollTop = 0; moreLabel();
    wrap.dataset.source = from;
    offerJump(from);
  }
  function busy(on, message) {
    busyBox.hidden = !on;
    devices.classList.toggle('is-busy', !!on);
    devices.setAttribute('aria-busy', on ? 'true' : 'false');
    if (on) busyBox.firstChild.textContent = message || 'Working on it…';
  }

  /* ---------- the screens: scroll the page inside them ---------- */
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  function screensMode() {
    const can = fine.matches;
    devices.classList.toggle('can-scroll', can);
    if (can) { lapScreen.tabIndex = 0; lapScreen.setAttribute('role', 'region'); lapScreen.setAttribute('aria-label', 'The laptop’s screen. Scroll to see the whole page.'); }
    else { lapScreen.removeAttribute('tabindex'); lapScreen.removeAttribute('role'); lapScreen.removeAttribute('aria-label'); }
  }
  let syncing = false;
  const maxOf = (s) => Math.max(0, s.scrollHeight - s.clientHeight);
  lapScreen.addEventListener('scroll', () => {
    if (!syncing) { syncing = true; const m = maxOf(lapScreen); phoneScreen.scrollTop = m ? (lapScreen.scrollTop / m) * maxOf(phoneScreen) : 0; requestAnimationFrame(() => { syncing = false; }); }
    moreLabel();
  }, { passive: true });
  function moreLabel() {
    const m = maxOf(lapScreen), end = m > 0 && lapScreen.scrollTop >= m - 4;
    moreBtn.hidden = m <= 0 && lapScreen.scrollTop <= 0;
    moreBtn.firstChild.textContent = end ? 'Back to the top of the page' : 'See more of the page';
    moreBtn.lastChild.textContent = end ? '↑' : '↓';
    moreBtn.dataset.end = end ? '1' : '';
  }
  moreBtn.addEventListener('click', () => {
    const end = moreBtn.dataset.end === '1';
    const top = end ? 0 : Math.min(maxOf(lapScreen), lapScreen.scrollTop + lapScreen.clientHeight * 0.85);
    lapScreen.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ---------- the tabs ---------- */
  function select(id, opts) {
    const o = opts || {};
    if (!panels[id]) return;
    way = id; wrap.dataset.way = id;
    WAYS.forEach((w, i) => {
      const on = w.id === id;
      tabs[w.id].setAttribute('aria-selected', on ? 'true' : 'false');
      tabs[w.id].tabIndex = on ? 0 : -1;
      panels[w.id].hidden = !on;
      if (on) tablist.style.setProperty('--i', String(i));
    });
    if (o.focus) tabs[id].focus();
    if (id === 'sketch') startSketch();
  }
  tablist.addEventListener('click', (e) => { const b = e.target.closest('[role="tab"]'); if (b) select(b.dataset.way); });
  tablist.addEventListener('keydown', (e) => {
    const ids = WAYS.map((w) => w.id), i = ids.indexOf(way);
    let n = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % ids.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + ids.length) % ids.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = ids.length - 1;
    if (n < 0) return;
    e.preventDefault(); select(ids[n], { focus: true });
  });

  /* ---------- Send ---------- */
  sendBtn.addEventListener('click', () => {
    const detail = { kind: 'design', spec: JSON.parse(JSON.stringify(spec)), describe: SiteKit.describe(spec), source };
    window.__toffLastDesign = detail;
    doc.dispatchEvent(new CustomEvent('toff:brief-add', { detail }));
    let claimed = false;
    if (shell && typeof shell.openConcierge === 'function') claimed = shell.openConcierge({ source: 'design-yours' });
    else claimed = !doc.dispatchEvent(new CustomEvent('toff:concierge-open', { cancelable: true, detail: { source: 'design-yours' } }));
    if (claimed) sent.textContent = 'Added to your brief. The studio’s assistant has it open.';
    else {
      sent.textContent = 'Kept for your enquiry. Tell us the rest under Start a project.';
      const contact = doc.getElementById('contact');
      if (contact && shell && typeof shell.jumpTo === 'function') shell.jumpTo('contact');
    }
  });

  /* ---------- 'toff:design-open' and open() ---------- */
  function apply(d) {
    const detail = d && typeof d === 'object' ? d : {};
    const target = WAYS.some((w) => w.id === detail.way) ? detail.way : 'pick';
    if (PICK_KINDS.includes(detail.business)) pick.business = detail.business;
    if (SiteKit.MOODS[detail.mood]) pick.mood = detail.mood;
    if (SiteKit.LAYOUTS[detail.layout]) pick.layout = detail.layout;
    savePick(); syncPick();
    select(target);
    if (target === 'pick') drawPick();
    if (target === 'describe' && typeof detail.words === 'string' && detail.words.trim()) {
      ta.value = detail.words.slice(0, WORDS_MAX); countWords(); showWords(ta.value);
    }
    const r = wrap.getBoundingClientRect();
    if (r.top > innerHeight * 0.75 || r.bottom < 80) {
      const section = root.closest('section[id]');
      if (section && shell && typeof shell.jumpTo === 'function') shell.jumpTo(section.id, { focus: false });
      else wrap.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  }

  /* ---------- the ink drawing, once, when the preview is reached ---------- */
  let drawn = false, motionHandle = null;
  function drawDevices(instant) {
    if (drawn) return;
    drawn = true;
    const rects = [...devices.querySelectorAll('.dy-ol rect')];
    if (instant || reduce) { devices.classList.remove('is-pre'); devices.classList.add('is-drawn'); rects.forEach((r) => { r.style.strokeDasharray = ''; r.style.strokeDashoffset = ''; }); return; }
    const ms = (tokens && tokens.lineMs) || 1400;
    rects.forEach((r) => {
      let L = 0; try { L = r.getTotalLength(); } catch (e) { L = 0; }
      if (!L) return;
      r.style.strokeDasharray = `${L} ${L}`; r.style.strokeDashoffset = String(L);
      r.getBoundingClientRect();
      r.style.transition = `stroke-dashoffset ${ms}ms var(--ease-out)`;
      requestAnimationFrame(() => { r.style.strokeDashoffset = '0'; });
    });
    devices.classList.remove('is-pre');
    devices.classList.add('is-drawing');
    setTimeout(() => { devices.classList.add('is-drawn'); }, Math.round(ms * 0.55));
    setTimeout(() => { rects.forEach((r) => { r.style.transition = ''; r.style.strokeDasharray = ''; r.style.strokeDashoffset = ''; }); devices.classList.remove('is-drawing'); }, ms + 80);
  }
  function resetDevices() {
    if (reduce) return;
    drawn = false; devices.classList.remove('is-drawn', 'is-drawing'); devices.classList.add('is-pre');
  }

  /* ---------- assemble ---------- */
  const cssReady = Promise.all([loadCss(new URL('./design-yours.css', import.meta.url).href), loadCss(new URL('../shared/sitekit.css', import.meta.url).href)]);
  const ready = cssReady.then(() => {
    if (!reduce && doc.documentElement.classList.contains('js-motion')) devices.classList.add('is-pre');
    if (!root.closest('.wrap')) wrap.classList.add('wrap');   // the mount point may sit outside the page's content width
    root.append(wrap);
    lapView = SiteKit.render(lapSite, spec, { device: 'laptop' });
    phoneView = SiteKit.render(phoneSite, spec, { device: 'phone' });
    syncPick(); screensMode(); setSpec(spec, source);
    if (fine.addEventListener) fine.addEventListener('change', screensMode);
    if (devices.classList.contains('is-pre')) {
      motionHandle = motionStart(devices, { trigger: 0.82, onPlay: ({ instant }) => drawDevices(instant), onReset: resetDevices });
      setTimeout(() => { if (!drawn && devices.getBoundingClientRect().top < innerHeight && !doc.documentElement.classList.contains('js-motion')) drawDevices(true); }, 4500);
    } else drawn = true;
    requestAnimationFrame(moreLabel);
    setTimeout(moreLabel, 600);
    if (pending) { const p = pending; pending = null; apply(p); }
  });

  const api = {
    ready,
    open(d) { ready.then(() => apply(d)); },
    spec: () => JSON.parse(JSON.stringify(spec)),
    way: () => way,
    source: () => source,
    destroy() {
      if (motionHandle) motionHandle.destroy();
      if (lapView) lapView.destroy();
      if (phoneView) phoneView.destroy();
      if (fine.removeEventListener) fine.removeEventListener('change', screensMode);
      wrap.remove(); tool = null;
    },
  };
  return api;
}

export default { mount, open };
