/*
 * Morrow Coffee: the page. Header and phone menu, open/closed from London time, the menu
 * rows, the basket and collection time, the loyalty card, the map, the motion, and the
 * message API for the AI demo (?embed=order).
 */
import { mountRibbon } from '../../../assets/shared/ribbon.js';
import { start, fadeUp, reducedMotion, ease } from '../../../assets/shared/motion.js';
import { serve, spotlight, v, londonNow, isEmbed, timeText, dayLabel } from '../../../assets/shared/embed-api.js';
import { CAFE, MENU, DRINK_KEYS, FOOD_KEYS, MENU_KEYS, MILKS, SYRUPS, SIZES, toMin, optionProblem, gbp } from './data.js';
import * as order from './order.js';
import { createBuilder } from './builder.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = reducedMotion();
const embedded = isEmbed();

mountRibbon({ name: 'Morrow Coffee' });

/* ── Header: hides on the way down, returns on the way up ───────────────── */
const top = $('[data-top]');
let lastY = window.scrollY;
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  top.classList.toggle('is-scrolled', y > 8);
  if (!sheetOpen) top.classList.toggle('is-hidden', y > lastY && y > 240);
  lastY = y;
}, { passive: true });
top.addEventListener('focusin', () => top.classList.remove('is-hidden'));

/* The phone menu: a full-screen sheet, focus kept inside, Escape closes */
const sheet = $('[data-sheet]');
const openBtn = $('[data-menu-open]');
let sheetOpen = false;
function setSheet(open, { restore = true } = {}) {
  sheetOpen = open;
  sheet.hidden = !open;
  openBtn.setAttribute('aria-expanded', String(open));
  document.documentElement.style.overflow = open ? 'hidden' : '';
  if (open) {
    sheet.classList.add('is-in');
    $('[data-menu-close]', sheet).focus();
  } else {
    sheet.classList.remove('is-in');
    if (restore) openBtn.focus();
  }
}
openBtn.addEventListener('click', () => setSheet(true));
$('[data-menu-close]', sheet).addEventListener('click', () => setSheet(false));
sheet.addEventListener('click', (e) => { if (e.target.closest('a')) setSheet(false, { restore: false }); });
sheet.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.preventDefault(); setSheet(false); return; }
  if (e.key !== 'Tab') return;
  const f = $$('a, button', sheet);
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
window.addEventListener('resize', () => { if (sheetOpen && window.innerWidth >= 1024) setSheet(false, { restore: false }); });

/* ── Open or closed, right now (London time) ─────────────────────────────── */
let api = { notifyState() {} };
let lastStatus = '', lastOrdering = '';
function paintStatus() {
  const now = londonNow();
  const st = order.openStatus(now);
  $$('[data-status-short]').forEach((el) => { el.classList.toggle('is-open', st.open); $('[data-status-text]', el).textContent = st.short; });
  $$('[data-status-long]').forEach((el) => { el.classList.toggle('is-open', st.open); el.textContent = st.text; });
  const day = new Date(Date.UTC(...now.date.split('-').map((n, i) => (i === 1 ? n - 1 : +n)))).getUTCDay();
  $$('[data-hours] tr').forEach((tr) => {
    const d = tr.dataset.days;
    const today = d === '1-5' ? day >= 1 && day <= 5 : d.split(',').map(Number).includes(day);
    tr.classList.toggle('is-today', today);
  });
  const of = order.orderingFor(now);
  const key = `${st.open}|${of.date}|${of.earliest}`;
  if (lastStatus && key !== lastStatus) {
    order.revalidate();
    paintCollection();
    api.notifyState();
  }
  lastStatus = key;
}

/* ── Builder ─────────────────────────────────────────────────────────────── */
function add(opts, source) {
  try {
    const r = order.addItem(opts, { source });
    return { ok: true, result: r, total: r.basket.total_text };
  } catch (err) {
    if (source !== 'visitor') throw err;
    return { ok: false, message: err.message };
  }
}
const builder = createBuilder({ reduced, onAdd: add });

/* ── Menu rows ───────────────────────────────────────────────────────────── */
function row(key, kind) {
  const m = MENU[key];
  const li = document.createElement('li');
  li.className = 'row';
  li.dataset.item = key;
  li.innerHTML = `<p class="row__name"></p><p class="row__price"></p><p class="row__note"></p>
    <div class="row__act"><button type="button" class="row__btn"></button></div><p class="row__said" aria-live="polite"></p>`;
  $('.row__name', li).textContent = m.name;
  $('.row__price', li).textContent = gbp(m.price);
  $('.row__note', li).textContent = m.note;
  const btn = $('.row__btn', li);
  if (kind === 'drink') {
    btn.innerHTML = `Build it<span class="visually-hidden">: ${m.name.toLowerCase()}</span>`;
    btn.addEventListener('click', () => {
      builder.setDrink({ item: key });
      const target = $('#build');
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      builder.focusItem();
    });
  } else {
    btn.innerHTML = `Add<span class="visually-hidden"> a ${m.name.toLowerCase()} to your order</span>`;
    btn.addEventListener('click', () => {
      const r = add({ item: key, quantity: 1, size: 'regular', milk: 'none', extra_shots: 0, syrup: 'none' }, 'visitor');
      if (!r.ok) $('.row__said', li).textContent = r.message;
    });
  }
  return li;
}
const drinkRows = $('[data-drink-rows]');
const foodRows = $('[data-food-rows]');
DRINK_KEYS.forEach((k) => drinkRows.append(row(k, 'drink')));
FOOD_KEYS.forEach((k) => foodRows.append(row(k, 'food')));
function paintFoodCounts() {
  const b = order.basket();
  FOOD_KEYS.forEach((k) => {
    const n = b.lines.filter((l) => l.item === k).reduce((s, l) => s + l.quantity, 0);
    const said = $(`.row[data-item="${k}"] .row__said`, foodRows);
    const text = n ? `${n} in your order` : '';
    if (said.textContent !== text && !(said.textContent && !n && said.dataset.err)) said.textContent = text;
  });
}

/* ── Basket ──────────────────────────────────────────────────────────────── */
const linesEl = $('[data-lines]');
const basketSaid = $('[data-basket-status]');
function paintBasket() {
  const b = order.basket();
  // keep focus on the same control across a re-render
  const act = document.activeElement;
  const keep = act && linesEl.contains(act) ? { id: act.closest('[data-line]')?.dataset.line, role: act.dataset.role } : null;

  linesEl.replaceChildren(...b.lines.map((l) => {
    const li = document.createElement('li');
    li.className = 'line';
    li.dataset.line = l.line_id;
    li.innerHTML = `<div><p class="line__label"></p><p class="line__each"></p></div><p class="line__price"></p>
      <div class="line__ctrl"><div class="qty qty--small" role="group"><button type="button" class="qty__btn" data-role="less">−</button><span class="qty__n"></span><button type="button" class="qty__btn" data-role="more">+</button></div>
      <span class="line__why"></span><button type="button" class="link-btn" data-role="remove">Remove</button></div>`;
    $('.line__label', li).textContent = l.label;
    $('.line__each', li).textContent = `${gbp(l.unit_pence)} each`;
    $('.line__price', li).textContent = gbp(l.line_pence);
    $('.qty__n', li).textContent = String(l.quantity);
    $('.qty', li).setAttribute('aria-label', `How many: ${l.label}`);
    const less = $('[data-role="less"]', li), more = $('[data-role="more"]', li);
    less.setAttribute('aria-label', l.quantity > 1 ? `One fewer ${l.label.toLowerCase()}` : `Remove ${l.label.toLowerCase()}`);
    const why = order.cannotIncrease(l.line_id);
    more.disabled = !!why;
    const lineWhy = l.quantity >= CAFE.maxPerLine ? why : '';
    more.setAttribute('aria-label', `One more ${l.label.toLowerCase()}`);
    if (lineWhy) { $('.line__why', li).textContent = lineWhy; more.setAttribute('aria-describedby', `why-${l.line_id}`); $('.line__why', li).id = `why-${l.line_id}`; }
    $('[data-role="remove"]', li).setAttribute('aria-label', `Remove ${l.label.toLowerCase()}`);
    less.addEventListener('click', () => order.changeQuantity(l.line_id, -1));
    more.addEventListener('click', () => { try { order.changeQuantity(l.line_id, 1); } catch (e) { basketSaid.textContent = e.message; } });
    $('[data-role="remove"]', li).addEventListener('click', () => { order.removeLine(l.line_id); basketSaid.textContent = `Removed ${l.label.toLowerCase()}.`; });
    return li;
  }));
  $('[data-empty]').hidden = b.count > 0;
  $('[data-total-row]').hidden = b.count === 0;
  $('[data-total]').textContent = b.total_text;
  $('[data-full-note]').hidden = b.count < CAFE.maxItems;
  $('[data-clear]').hidden = b.count === 0;
  const count = $('[data-count]');
  count.textContent = String(b.count);
  count.classList.toggle('is-zero', b.count === 0);
  $('[data-count-words]').textContent = b.count === 1 ? ' item' : ' items';

  if (keep && keep.id) {
    const li = $(`[data-line="${keep.id}"]`, linesEl);
    const el = li && $(`[data-role="${keep.role}"]`, li);
    if (el && !el.disabled) el.focus({ preventScroll: true });
    else if (li) $('[data-role="remove"]', li).focus({ preventScroll: true });
    else { const first = $('[data-role]', linesEl); (first || $('#order-title')).focus?.({ preventScroll: true }); }
  }
}
$('[data-clear]').addEventListener('click', () => {
  order.resetOrder();
  basketSaid.textContent = 'Your order is empty again.';
  $('#basket-title')?.focus?.();
});

/* ── Collection ──────────────────────────────────────────────────────────── */
const timeSel = $('[data-time]');
const note = $('[data-collect-note]');
const placeBtn = $('[data-place]');
const placeWhy = $('[data-place-why]');
let builtFor = '';
function paintCollection() {
  const of = order.orderingFor();
  const c = order.collection();
  const key = `${of.date}|${of.earliest}`;
  if (key !== builtFor) {
    builtFor = key;
    const opts = [new Option('Choose a time', '')];
    const times = order.collectionTimes(of);
    let group = null, hour = -1;
    const frag = document.createDocumentFragment();
    frag.append(opts[0]);
    for (const t of times) {
      const h = Number(t.slice(0, 2));
      if (h !== hour) { hour = h; group = document.createElement('optgroup'); group.label = timeText(`${t.slice(0, 2)}:00`).replace('.00', ''); frag.append(group); }
      group.append(new Option(timeText(t), t));
    }
    timeSel.replaceChildren(frag);
  }
  timeSel.value = c && c.date === of.date ? c.time : '';
  const forText = of.day_label === 'Today'
    ? `Ordering for today, ${dayLabel(of.date)}.`
    : `Orders for today close at ${timeText(CAFE.lastOrderBefore)}, so this one is for tomorrow, ${dayLabel(of.date)}.`;
  $('[data-ordering-for]').textContent = forText;
  const n = order.takeNotice();
  if (n) { note.textContent = n; note.classList.add('is-warn'); }
  else if (!note.classList.contains('is-warn') || c) {
    note.classList.remove('is-warn');
    note.textContent = c
      ? `Collect ${of.day_label === 'Today' ? 'today' : 'tomorrow'} at ${timeText(c.time)} from the counter at 14 Elm Row.`
      : `The earliest is ${timeText(of.earliest)} and the latest ${timeText(of.latest)}.`;
  }
  const b = order.basket();
  const why = !b.count && !c ? 'Add something and choose a time first.'
    : !b.count ? 'Add something to your order first.'
    : !c ? 'Choose a collection time first.' : '';
  placeBtn.disabled = !!why;
  placeWhy.textContent = why;
}
timeSel.addEventListener('change', () => {
  note.classList.remove('is-warn');
  if (!timeSel.value) { order.clearCollection(); return; }
  try { order.setCollection(timeSel.value); }
  catch (e) { note.textContent = e.message; note.classList.add('is-warn'); }
});
placeBtn.addEventListener('click', () => {
  try {
    order.placeOrder();
    const card = $('[data-placed]');
    card.focus({ preventScroll: true });
    card.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  } catch (e) { placeWhy.textContent = e.message; paintCollection(); }
});
$('[data-new-order]').addEventListener('click', () => {
  order.newOrder();
  $('#order-title').setAttribute('tabindex', '-1');
  $('#order-title').focus({ preventScroll: true });
});

function paintPlaced() {
  const p = order.placed();
  const section = $('#order');
  section.classList.toggle('is-placed', !!p);
  const card = $('[data-placed]');
  card.hidden = !p;
  if (!p) return;
  $('[data-placed-ref]').textContent = p.ref;
  const day = p.day_label === 'Today' ? 'today' : p.day_label === 'Tomorrow' ? 'tomorrow' : `on ${p.day_label}`;
  $('[data-placed-when]').textContent = `Collect it ${day} at ${timeText(p.time)} from 14 Elm Row. Pay when you collect.`;
  $('[data-placed-lines]').replaceChildren(...p.lines.map((l) => {
    const li = document.createElement('li');
    const a = document.createElement('span'); a.textContent = `${l.quantity} × ${l.label}`;
    const b = document.createElement('span'); b.textContent = gbp(l.line_pence);
    li.append(a, b); return li;
  }));
  $('[data-placed-total]').textContent = `Total ${p.total_text}`;
  $('[data-placed-stamps]').textContent = p.stamped ? `${p.stamped === 1 ? 'One stamp' : `${p.stamped} stamps`} added to your loyalty card.` : '';
}

/* ── Loyalty card ────────────────────────────────────────────────────────── */
const slots = $('[data-slots]');
const STAMP_SVG = '<svg class="slot__stamp" viewBox="0 0 60 60" aria-hidden="true"><circle class="ink" cx="30" cy="30" r="26"/><path d="M30 4.5c14 .2 25.7 11.4 25.5 25.8-.2 14.1-11.7 25.3-25.8 25.2C15.6 55.4 4.3 44 4.5 29.7 4.7 15.6 16 4.3 30 4.5z"/><path d="M18.5 24.5h20.5l-1.4 11.2c-.5 3.2-3.1 5.4-6.3 5.4h-5.1c-3.2 0-5.8-2.2-6.3-5.4z"/><path d="M38.8 27h2.4c2.2 0 3.3 1.6 3 3.4-.3 1.9-2 3.3-4 3.3h-2.1"/><path d="M15.5 45.2c9.5-.8 19.3-.6 29 .2"/></svg>';
let shownStamps = -1;
function paintCard() {
  const n = order.stamps();
  const full = n >= CAFE.stampsToFill;
  if (!slots.children.length) {
    for (let i = 0; i < CAFE.stampsToFill + 1; i++) {
      const li = document.createElement('li');
      li.className = 'slot';
      const rot = ((i * 47) % 23) - 11;
      li.style.setProperty('--rot', `${rot}deg`);
      li.innerHTML = '<svg class="slot__ring" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="27"/></svg>';
      if (i === CAFE.stampsToFill) { const s = document.createElement('span'); s.className = 'slot__free'; s.textContent = 'On us'; li.append(s); }
      slots.append(li);
    }
  }
  [...slots.children].forEach((li, i) => {
    const has = i < n;
    const stamp = $('.slot__stamp', li);
    if (i === CAFE.stampsToFill) { li.setAttribute('aria-label', full ? 'Your tenth hot drink is on us' : 'The tenth hot drink, on us'); return; }
    li.setAttribute('aria-label', has ? `Stamp ${i + 1}, stamped` : `Stamp ${i + 1}, empty`);
    if (has && !stamp) {
      li.insertAdjacentHTML('beforeend', STAMP_SVG);
      const s = $('.slot__stamp', li);
      s.style.transform = `rotate(${li.style.getPropertyValue('--rot')})`;
      if (shownStamps >= 0 && i >= shownStamps && !reduced) s.classList.add('is-new');
    } else if (!has && stamp) stamp.remove();
  });
  shownStamps = n;
  $('[data-stamp-count]').textContent = full ? 'Card full: your next hot drink is on us.' : n === 0 ? 'No stamps yet' : `${n} of ${CAFE.stampsToFill} stamps`;
  const btn = $('[data-stamp]');
  btn.disabled = full;
  $('[data-new-card]').hidden = !full;
}
$('[data-stamp]').addEventListener('click', () => order.addStamp());
$('[data-new-card]').addEventListener('click', () => { order.newCard(); $('[data-stamp]').focus(); });

/* ── Paint everything after any change, and tell the AI demo ─────────────── */
function paintAll() { paintBasket(); paintCollection(); paintPlaced(); paintCard(); paintFoodCounts(); }
order.subscribe((reason, detail) => {
  paintAll();
  if (reason === 'add' && detail.source === 'visitor') basketSaid.textContent = detail.text;
  if (reason === 'collection' && detail.text) { note.classList.remove('is-warn'); }
  api.notifyState();
});
paintStatus();
paintAll();
setInterval(paintStatus, 15000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) paintStatus(); });

/* ── Motion ──────────────────────────────────────────────────────────────── */
// In the AI demo's frame everything is shown at once (the demo scrolls the frame itself).
if (embedded) $$('[data-fade]').forEach((el) => el.removeAttribute('data-fade'));
else fadeUp('[data-fade]');

// The cup's first fill: with the scroll on laptops, by itself on phones; never backwards.
builder.attachFirstFill(start(builder.stage, {
  start: 0.92, end: 0.42, anchor: 0.25,
  duration: 2200, ease: ease.inOut, trigger: 0.85,
  onProgress: (p) => builder.cup.setFill(p),
}));

// The map draws itself in line: streets, then buildings, then the café, then labels.
const map = $('[data-map]');
const paths = $$('.map__lines path', map);
const labels = $$('[data-map-label]', map);
const ORDER = ['street', 'centre', 'block', 'tree', 'cafe', 'cafe-mark', 'bench', 'north', 'leader'];
const groups = ORDER.map((g) => paths.filter((p) => p.classList.contains(`m-${g}`)));
const windows = [];
let cursor = 0;
const SPAN = { street: 0.26, centre: 0.1, block: 0.24, tree: 0.12, cafe: 0.1, 'cafe-mark': 0.06, bench: 0.05, north: 0.04, leader: 0.05 };
ORDER.forEach((g, gi) => {
  const list = groups[gi];
  const span = SPAN[g];
  const each = span / Math.max(1, list.length);
  list.forEach((p, i) => { windows.push([p, cursor + i * each * 0.6, cursor + i * each * 0.6 + Math.max(each * 1.6, span * 0.5)]); });
  cursor += span * 0.86;
});
const total = Math.max(...windows.map((w) => w[2]));
function drawMap(p) {
  const t = p * total;
  for (const [path, a, b] of windows) {
    const k = Math.max(0, Math.min(1, (t - a) / (b - a)));
    path.style.strokeDasharray = k >= 1 ? '' : '1 1';
    path.style.strokeDashoffset = k >= 1 ? '' : String(1 - k);
    path.style.visibility = k > 0 ? '' : 'hidden';
    if (path.classList.contains('m-cafe')) path.style.setProperty('--cafe-fill', String(k));
  }
  const lk = Math.max(0, Math.min(1, (p - 0.82) / 0.18));
  map.style.setProperty('--label-in', String(lk));
  map.classList.toggle('is-drawing', p < 1);
  map.dataset.p = p.toFixed(3);
}
const svg = $('[data-map-svg]', map);
new ResizeObserver(() => {
  const w = svg.getBoundingClientRect().width || 640;
  map.style.setProperty('--map-sw', String(1.75 * 640 / w));
}).observe(svg);
if (!reduced) drawMap(0);
start(map, { start: 0.9, end: 0.25, anchor: 0, duration: 2600, ease: ease.out, trigger: 0.8, onProgress: drawMap });

/* ── The message API (Contract A): active only inside the AI demo's frame ─── */
const lineEl = (id) => $(`[data-line="${id}"]`, linesEl);
api = serve({
  business: 'cafe',
  getState: () => order.getState(),
  actions: {
    add_to_order: {
      args: { item: v.oneOf(MENU_KEYS), quantity: v.int(1, 6), size: v.oneOf(SIZES), milk: v.oneOf(MILKS), extra_shots: v.oneOf([0, 1, 2]), syrup: v.oneOf(SYRUPS) },
      run: async (a) => {
        if (MENU[a.item].kind === 'drink') {
          // exactly as the visitor would: set the drink in the builder, then add it
          if (!optionProblem(a)) builder.setDrink({ item: a.item, size: a.size, milk: a.milk, extra_shots: a.extra_shots, syrup: a.syrup }, { quantity: a.quantity });
        }
        let r;
        try { r = order.addItem(a, { source: 'api' }); }
        catch (err) { if (MENU[a.item].kind === 'drink' && err.code === 'basket_full') builder.say(err.message); throw err; }
        if (MENU[a.item].kind === 'drink') builder.setDrink({}, { quantity: 1 });
        if (MENU[a.item].kind === 'drink') builder.say(`Added ${r.card_text.replace(/^Added to your order: /, '').replace(/\. Basket .*$/, '')}. Your order comes to ${r.basket.total_text}.`);
        basketSaid.textContent = r.card_text;
        spotlight(lineEl(r.line.line_id) || $('[data-basket]'));
        return r;
      },
    },
    set_collection_time: {
      args: { time: v.time({ step: 5 }) },
      run: async (a) => {
        const r = order.setCollection(a.time, { source: 'api' });
        spotlight($('[data-collect]'));
        return r;
      },
    },
    reset: {
      args: {},
      run: async () => {
        order.resetOrder();
        basketSaid.textContent = '';
        spotlight($('[data-basket]'));
        return { cleared: true };
      },
    },
  },
});

// Tests and the lead's checks can read this; it has no effect on the page.
window.__morrow = { order, builder, embedded, toMin };
