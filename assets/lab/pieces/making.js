/*
 * Lab piece 8: The making of this site (#making).
 * A timeline across rounds 01 to 05. Each round's commit was checked out from the site's git history
 * into a temporary worktree, served and photographed by tools/capture/making_of.py: its first screen
 * at 1440 x 900 and 390 x 844, and a short scroll strip of four frames further down the page. The
 * captures live in assets/lab/pieces/making/ with stable names (rNN-laptop.webp, rNN-phone.webp,
 * rNN-laptop-strip-K.webp, rNN-phone-strip-K.webp).
 *
 * Scrub through the rounds by dragging the scrubber, with the arrow keys (Home and End too), or by
 * clicking a round. While you drag, the next round wipes in behind a fine gold edge; a click or a key
 * press travels there in one short, eased movement. "Scroll through the page" turns each picture into
 * a window you can scroll down. Nothing advances by itself. Reduced motion: every change is instant.
 *
 * Commits (see tools/capture/making_of.py for why each one):
 *   01 1a4f898  02 6653e27  03 41fcc52  04 a5e4bc9  05 the round-05 branch as it stands
 *
 * Contract (rounds/round-05-plan.md section 6):
 *   mount(container, { reducedMotion, lowPower, soundOn, still }) -> { title, made, goodFor, describe, pause, resume, dispose }
 */

const TITLE = 'The making of this site';
const MADE = 'Each round’s commit was checked out from the site’s git history, served and photographed at laptop and phone size, and the scrubber moves between them.';
const GOOD_FOR = 'showing a client how a site grows';

/* One plain line for each round, written from rounds/*.md and DECISIONS.md. */
const ROUNDS = [
  { id: '01', name: 'Round 1', short: 'One ink line', when: 'Commit 1a4f898, 9 October 2026',
    line: 'A warm off-white page and one navy ink line that writes four phrases as you scroll, draws Bluebird Wellness’s face and runs into Everest’s air conditioner counting down from 32 °C.' },
  { id: '02', name: 'Round 2', short: 'Midnight and gold', when: 'Commit 6653e27, 12 October 2026',
    line: 'The whole site turns midnight and gold: it opens on a website sketched in cream ink that colours itself in, and a calm cursive line writes four phrases beside Bluebird and Everest.' },
  { id: '03', name: 'Round 3', short: 'Work and a Lab', when: 'Commit 41fcc52, 12 October 2026',
    line: 'Recent work, tools to try such as Sketch your homepage and a separate Lab page arrive, with new rules against anything that looks template-made; a follow-up lets Claude read a visitor’s sketch.' },
  { id: '04', name: 'Round 4', short: 'AI assistants', when: 'Commit a5e4bc9, 12 October 2026',
    line: 'A live AI assistants demo near the top, the four tools gathered into one Try it section, How it works on cream paper, and a page cut from 18 laptop screens to 14.' },
  { id: '05', name: 'Round 5', short: 'The rebuild', when: 'The round-05 branch, October 2026',
    line: 'A rebuild: our real sites drawn as pencil sketches you paint back into colour, five complete concept sites, assistants that take actions on them, a concierge that takes the brief, and this Lab.' },
];
const STRIP = 4;
const LAPTOP_RATIO = 1440 / 900, PHONE_RATIO = 390 / 844;
let uid = 0;

export async function mount(container, { reducedMotion = false } = {}) {
  const base = new URL('./making/', import.meta.url);
  const src = (name) => new URL(name, base).href;
  const id = 'mk-' + (++uid);
  const n = ROUNDS.length, last = n - 1;

  const root = el('div', { class: 'mk' });
  container.appendChild(root);
  await loadCss(root, src('making.css'));

  // ---- listeners, object URLs and fetches, all released by dispose()
  const offs = [];
  const on = (t, type, fn, o) => { t.addEventListener(type, fn, o); offs.push(() => t.removeEventListener(type, fn, o)); };
  const urls = new Map();            // file -> Promise<object URL or direct URL>
  const made = [];                   // object URLs to revoke
  const ctrl = new AbortController();
  let disposed = false, raf = 0, tween = null;
  function blobUrl(file) {
    if (!urls.has(file)) {
      urls.set(file, fetch(src(file), { signal: ctrl.signal })
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); })
        .then((b) => { if (disposed) return ''; const u = URL.createObjectURL(b); made.push(u); return u; })
        .catch(() => (disposed ? '' : src(file))));
    }
    return urls.get(file);
  }

  // ---- the words
  const roundEl = el('h2', { class: 'mk-round', id: id + '-round' });
  const metaEl = el('p', { class: 'mk-meta' });
  const lineEl = el('p', { class: 'mk-line' });
  const scrollBtn = el('button', { type: 'button', class: 'mk-btn mk-scrollbtn', 'aria-pressed': 'false', text: 'Scroll the page' });
  const phoneBtn = el('button', { type: 'button', class: 'mk-btn', 'aria-pressed': 'true', text: 'Phone' });
  const laptopBtn = el('button', { type: 'button', class: 'mk-btn', 'aria-pressed': 'false', text: 'Laptop' });
  const seg = el('div', { class: 'mk-seg', role: 'group', 'aria-label': 'Screen size' }, [phoneBtn, laptopBtn]);
  const head = el('div', { class: 'mk-head' }, [
    el('div', { class: 'mk-name' }, [roundEl, metaEl]),
    lineEl,
    el('div', { class: 'mk-tools' }, [seg, scrollBtn]),
  ]);

  // ---- the captures: a base layer, a top layer that wipes in, and the gold edge between them
  function frame(kind) {
    const mk = () => { const img = el('img', { alt: '', decoding: 'async', draggable: 'false' }); return { img, box: el('div', { class: 'mk-layer' }, [img]) }; };
    const a = mk(), b = mk(), edge = el('div', { class: 'mk-edge', 'aria-hidden': 'true' });
    b.box.setAttribute('data-top', ''); b.box.setAttribute('aria-hidden', 'true'); b.box.style.visibility = 'hidden';
    const node = el('div', { class: 'mk-frame', 'data-kind': kind }, [a.box, b.box, edge]);
    return { kind, node, a, b, edge, scroller: null, shownBase: -1, shownTop: -1 };
  }
  const laptop = frame('laptop'), phone = frame('phone');
  const stage = el('div', { class: 'mk-stage' }, [phone.node, laptop.node]);   // phone first in the reading order

  // ---- the scrubber (one slider; the round names under it are click targets for the pointer)
  const fill = el('div', { class: 'mk-fill' });
  const rail = el('div', { class: 'mk-rail' }, [fill]);
  const stops = ROUNDS.map((r, i) => {
    const s = el('div', { class: 'mk-stop', 'aria-hidden': 'true' }, [el('b', {}, [el('i', { text: 'Round ' }), String(i + 1)]), el('span', { text: r.short })]);
    s.style.left = (i / last * 100) + '%';
    rail.appendChild(s);
    return s;
  });
  rail.appendChild(el('div', { class: 'mk-thumb', 'aria-hidden': 'true' }));
  const scrub = el('div', {
    class: 'mk-scrub', role: 'slider', tabindex: '0', 'aria-label': 'Rounds of the site',
    'aria-valuemin': '1', 'aria-valuemax': String(n), 'aria-orientation': 'horizontal',
  }, [rail]);

  const status = el('p', { class: 'mk-sr', 'aria-live': 'polite' });
  root.append(head, stage, scrub, status);

  // ---- state
  const phoneWidth = () => window.matchMedia('(max-width: 699px)').matches;
  let p = 0;                  // position along the timeline, 0 .. n-1 (fractional while scrubbing)
  let shownRound = -1, strip = false, small = phoneWidth(), show = 'phone';   // show: which capture a phone visitor sees

  const fileFor = (i, kind) => `r${ROUNDS[i].id}-${kind}.webp`;
  function preload(i) { if (i >= 0 && i <= last) { blobUrl(fileFor(i, 'laptop')); blobUrl(fileFor(i, 'phone')); } }

  function setImg(img, file, alt) {
    if (img.dataset.file === file) return;
    img.dataset.file = file;
    if (alt != null) img.alt = alt;
    blobUrl(file).then((u) => { if (!disposed && img.dataset.file === file && u) img.src = u; });
  }
  const altFor = (i, kind) => `${ROUNDS[i].name}: the home page’s first screen on a ${kind}, as it was at the end of the round.`;

  function paintFrame(f, b, t, frac) {
    if (f.scroller) return;
    if (b !== f.shownBase) { setImg(f.a.img, fileFor(b, f.kind), altFor(b, f.kind)); f.shownBase = b; }
    const wiping = frac > 0.0005 && t !== b;
    if (wiping) {
      if (t !== f.shownTop) { setImg(f.b.img, fileFor(t, f.kind), ''); f.shownTop = t; }
      f.b.box.style.visibility = '';
      f.b.box.style.clipPath = `inset(0 ${((1 - frac) * 100).toFixed(3)}% 0 0)`;
      f.edge.style.left = (frac * 100).toFixed(3) + '%';
      f.edge.toggleAttribute('data-on', true);
    } else {
      f.b.box.style.visibility = 'hidden';
      f.edge.toggleAttribute('data-on', false);
    }
  }

  function render() {
    const b = Math.min(last, Math.floor(p + 1e-6)), frac = Math.max(0, p - b), t = Math.min(last, b + 1);
    paintFrame(laptop, b, t, frac);
    paintFrame(phone, b, t, frac);
    scrub.style.setProperty('--mk-p', String(p / last));
    rail.style.setProperty('--mk-p', String(p / last));
    const near = Math.round(p);
    if (near !== shownRound) showWords(near);
  }

  function showWords(i) {
    shownRound = i;
    const r = ROUNDS[i];
    roundEl.textContent = r.name;
    metaEl.textContent = r.when;
    lineEl.textContent = r.line;
    stops.forEach((s, k) => s.toggleAttribute('data-on', k === i));
    scrub.setAttribute('aria-valuenow', String(i + 1));
    scrub.setAttribute('aria-valuetext', `${r.name} of ${n}: ${r.short}`);
    preload(i - 1); preload(i + 1);
    if (strip) fillStrips(i);
  }

  function settled(i) { status.textContent = `${ROUNDS[i].name} of ${n}. ${ROUNDS[i].line}`; }

  // ---- moving along the timeline
  const easeInOut = (x) => (x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2);   // quintic, the site's in-out
  function stopTween() { if (raf) cancelAnimationFrame(raf); raf = 0; tween = null; }
  function goTo(target, { announce = true } = {}) {
    target = Math.max(0, Math.min(last, Math.round(target)));
    stopTween();
    if (reducedMotion || strip || Math.abs(target - p) < 0.001) { p = target; render(); if (announce) settled(target); return; }
    const from = p, dist = Math.abs(target - from);
    const dur = Math.min(900, 300 + 240 * dist);
    tween = { from, target, t0: performance.now(), dur, announce };
    const stepT = (now) => {
      raf = 0;
      if (!tween || disposed) return;
      const k = Math.min(1, (now - tween.t0) / tween.dur);
      p = tween.from + (tween.target - tween.from) * easeInOut(k);
      if (k >= 1) { p = tween.target; const a = tween.announce, tg = tween.target; tween = null; render(); if (a) settled(tg); return; }
      render();
      raf = requestAnimationFrame(stepT);
    };
    raf = requestAnimationFrame(stepT);
  }
  function finishTween() { if (tween) { const tg = tween.target, a = tween.announce; stopTween(); p = tg; render(); if (a) settled(tg); } }

  // pointer: drag anywhere on the scrubber; a click jumps to the nearest round
  let drag = null;
  function posFrom(e) {
    const r = rail.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / Math.max(1, r.width))) * last;
  }
  on(scrub, 'pointerdown', (e) => {
    if (e.button !== 0) return;
    stopTween();
    drag = { id: e.pointerId, x: e.clientX, moved: false };
    try { scrub.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    scrub.setAttribute('data-drag', '');
  });
  on(scrub, 'pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.abs(e.clientX - drag.x) < 4) return;
    drag.moved = true;
    const q = posFrom(e);
    p = reducedMotion || strip ? Math.round(q) : q;
    render();
  });
  const release = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const wasMove = drag.moved; drag = null;
    scrub.removeAttribute('data-drag');
    goTo(wasMove ? p : posFrom(e));
  };
  on(scrub, 'pointerup', release);
  on(scrub, 'pointercancel', () => { if (drag) { drag = null; scrub.removeAttribute('data-drag'); goTo(p); } });

  // keyboard: the slider takes the arrow keys (the Lab leaves arrows alone on a slider)
  on(scrub, 'keydown', (e) => {
    const cur = tween ? tween.target : Math.round(p);
    let to = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'PageUp') to = cur + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'PageDown') to = cur - 1;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = last;
    if (to == null) return;
    e.preventDefault(); e.stopPropagation();
    goTo(to);
  });

  // ---- phone or laptop (phones only), and the scroll strip
  function applyView() {
    small = phoneWidth();
    phone.node.hidden = small && show !== 'phone';
    laptop.node.hidden = small && show !== 'laptop';
    phoneBtn.setAttribute('aria-pressed', String(show === 'phone'));
    laptopBtn.setAttribute('aria-pressed', String(show === 'laptop'));
    layout();
  }
  on(phoneBtn, 'click', () => { show = 'phone'; applyView(); });
  on(laptopBtn, 'click', () => { show = 'laptop'; applyView(); });

  function makeScroller(f) {
    const sc = el('div', { class: 'mk-scroll', tabindex: '0', role: 'region' });
    f.node.appendChild(sc);
    f.scroller = sc;
    f.a.box.hidden = true; f.b.box.hidden = true; f.edge.toggleAttribute('data-on', false);
  }
  function dropScroller(f) {
    if (f.scroller) f.scroller.remove();
    f.scroller = null; f.a.box.hidden = false; f.b.box.hidden = false; f.shownBase = -1; f.shownTop = -1;
  }
  function fillStrips(i) {
    [laptop, phone].forEach((f) => {
      const sc = f.scroller; if (!sc) return;
      if (sc.dataset.round === String(i)) return;
      sc.dataset.round = String(i);
      sc.setAttribute('aria-label', `${ROUNDS[i].name} on a ${f.kind}, from the top of the page down; scroll to see more`);
      sc.textContent = '';
      const items = [[fileFor(i, f.kind), altFor(i, f.kind)]];
      for (let k = 1; k <= STRIP; k++) items.push([`r${ROUNDS[i].id}-${f.kind}-strip-${k}.webp`, `${ROUNDS[i].name} on a ${f.kind}, further down the page (${k} of ${STRIP}).`]);
      items.forEach(([file, alt], k) => {
        if (k === 1) sc.appendChild(el('p', { class: 'mk-gapnote', text: 'Further down the page', 'aria-hidden': 'true' }));
        const img = el('img', { alt, decoding: 'async', draggable: 'false', width: f.kind === 'laptop' ? '1440' : '390', height: f.kind === 'laptop' ? '900' : '844' });
        img.dataset.file = file;
        blobUrl(file).then((u) => { if (!disposed && u) img.src = u; });
        sc.appendChild(img);
      });
      sc.scrollTop = 0;
    });
  }
  on(scrollBtn, 'click', () => {
    finishTween();
    strip = !strip;
    scrollBtn.setAttribute('aria-pressed', String(strip));
    const i = Math.round(p); p = i;
    if (strip) { makeScroller(laptop); makeScroller(phone); fillStrips(i); status.textContent = `Scroll inside the pictures to see further down ${ROUNDS[i].name}’s page.`; }
    else { dropScroller(laptop); dropScroller(phone); status.textContent = `Back to the first screens of ${ROUNDS[i].name}.`; }
    render();
  });

  // ---- sizes: the laptop and phone captures share one height and fill the stage
  function layout() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    if (small) {
      const lw = Math.min(w, h * LAPTOP_RATIO), ph = Math.min(h, w / PHONE_RATIO);
      stage.style.setProperty('--mk-lw', Math.floor(lw) + 'px'); stage.style.setProperty('--mk-lh', Math.floor(lw / LAPTOP_RATIO) + 'px');
      stage.style.setProperty('--mk-pw', Math.floor(ph * PHONE_RATIO) + 'px'); stage.style.setProperty('--mk-ph', Math.floor(ph) + 'px');
      return;
    }
    const gap = Math.max(16, Math.min(32, w * 0.022));
    const H = Math.min(h, (w - gap) / (LAPTOP_RATIO + PHONE_RATIO));
    stage.style.setProperty('--mk-gap', Math.round(gap) + 'px');
    stage.style.setProperty('--mk-lw', Math.floor(H * LAPTOP_RATIO) + 'px'); stage.style.setProperty('--mk-lh', Math.floor(H) + 'px');
    stage.style.setProperty('--mk-pw', Math.floor(H * PHONE_RATIO) + 'px'); stage.style.setProperty('--mk-ph', Math.floor(H) + 'px');
  }
  const ro = new ResizeObserver(() => { if (!disposed) { if (phoneWidth() !== small) applyView(); else layout(); } });
  ro.observe(stage);

  function describe() {
    const now = ROUNDS[Math.round(p)];
    return `${TITLE}. A timeline of the Toff Studio website across five rounds of work, from its first build to the rebuild, ` +
      'each shown by the home page’s first screen at laptop and phone size, captured from that round’s commit in the site’s history. ' +
      ROUNDS.map((r) => `${r.name} (${r.when}): ${r.line}`).join(' ') +
      ` ${now.name} is shown now. Drag along the scrubber or use the arrow keys on it to move between rounds, or click a round. ` +
      '“Scroll the page” lets you scroll down each round’s page through four further pictures.';
  }

  const api = {
    title: TITLE, made: MADE, goodFor: GOOD_FOR, moves: false, describe,
    pause() { finishTween(); },
    resume() {},
    dispose() {
      if (disposed) return;
      disposed = true;
      stopTween();
      offs.splice(0).forEach((f) => f());
      ro.disconnect();
      ctrl.abort();
      made.splice(0).forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
      root.remove();
    },
  };

  // ---- first frame: the earliest round, so the story runs forward as you scrub
  applyView();
  render();
  for (let i = 0; i < n; i++) preload(i);
  await Promise.all([phone.a.img, laptop.a.img].map((img) => blobUrl(img.dataset.file).then(() => waitImg(img))));
  if (disposed) return api;
  layout();
  return api;
}

function waitImg(img) {
  return new Promise((res) => {
    const done = () => (img.decode ? img.decode().catch(() => {}).then(res) : res());
    if (img.complete && img.naturalWidth) return done();
    const t = setTimeout(res, 4000);
    img.addEventListener('load', () => { clearTimeout(t); done(); }, { once: true });
    img.addEventListener('error', () => { clearTimeout(t); res(); }, { once: true });
  });
}

function loadCss(container, url) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  const ready = new Promise((res) => { link.onload = res; link.onerror = res; });
  container.appendChild(link);
  return ready;
}

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  (children || []).forEach((c) => c && node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return node;
}
