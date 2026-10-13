/*
 * Hollis & Pine: the basket. Remembers its contents for this visit only (sessionStorage),
 * sends nothing anywhere. The drawer is a modal <dialog>: focus moves into it, Tab stays
 * inside, Escape closes it and focus goes back to whatever opened it.
 *
 *   import basket from './basket.js';
 *   basket.add({ id, colour, size, qty })   -> the line
 *   basket.setQty(key, n) / basket.remove(key) / basket.clear()
 *   basket.lines() -> [{ key, id, colour, size, qty, product, unit, total }]
 *   basket.count() / basket.subtotal()
 *   basket.subscribe(fn)                       // called after every change
 *   basket.open(opener) / basket.close()       // the drawer
 */
import { byId, money, unitPrice, colourName, SHOP } from './data.js';
import { productArt, tileTone } from './art.js';

const KEY = 'hollis-pine-basket';
const MAX_QTY = 10;
let items = load();
const subs = new Set();

function load() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((l) => byId(l.id) && Number.isInteger(l.qty) && l.qty > 0).map((l) => ({ ...l, qty: Math.min(MAX_QTY, l.qty) })) : [];
  } catch (e) { return []; }
}
function save() {
  try { sessionStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* private mode: it still works for this page */ }
  subs.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
}
const keyOf = (l) => `${l.id}|${l.colour}|${l.size}`;

const basket = {
  MAX_QTY,
  add({ id, colour, size, qty = 1 }) {
    const p = byId(id);
    if (!p) throw new Error('No such product: ' + id);
    const line = { id, colour: p.colours.includes(colour) ? colour : p.colours[0], size: p.sizes.includes(size) ? size : p.sizes[0], qty: 0 };
    const key = keyOf(line);
    let found = items.find((l) => keyOf(l) === key);
    if (!found) { found = line; items.push(found); }
    const before = found.qty;
    found.qty = Math.min(MAX_QTY, found.qty + Math.max(1, Math.round(qty)));
    save();
    return { key, added: found.qty - before, qty: found.qty, capped: found.qty === MAX_QTY && before + qty > MAX_QTY };
  },
  setQty(key, n) {
    const l = items.find((x) => keyOf(x) === key);
    if (!l) return;
    if (n <= 0) items = items.filter((x) => x !== l); else l.qty = Math.min(MAX_QTY, Math.round(n));
    save();
  },
  remove(key) { items = items.filter((x) => keyOf(x) !== key); save(); },
  clear() { items = []; save(); },
  lines() {
    return items.map((l) => {
      const product = byId(l.id), unit = unitPrice(product, l.size);
      return { ...l, key: keyOf(l), product, unit, total: unit * l.qty };
    });
  },
  count() { return items.reduce((n, l) => n + l.qty, 0); },
  subtotal() { return this.lines().reduce((n, l) => n + l.total, 0); },
  subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  open, close,
};
export default basket;

/* ------------------------------------------------------------ shared line markup (drawer and checkout) */
export function lineVariant(l) {
  const parts = [colourName(l.product, l.colour)];
  if (l.size !== 'One size') parts.push(l.size);
  return parts.join(' · ');
}
export function lineArt(l) {
  return `<div class="line__art" style="background:${tileTone(l.colour)}">${productArt(l.product, l.colour)}</div>`;
}

/* ------------------------------------------------------------ the drawer */
let dlg = null, opener = null, live = null;

function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

function build() {
  if (dlg) return;
  dlg = el(`<dialog class="drawer" aria-labelledby="basket-title">
    <div class="drawer__head"><h2 id="basket-title">Your basket</h2><button class="close-btn" type="button" data-close>Close</button></div>
    <div class="drawer__body" data-body></div>
    <div class="drawer__foot" data-foot></div>
  </dialog>`);
  document.body.appendChild(dlg);
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) { close(); return; }          // a tap on the dimmed page
    const b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-close')) close();
    const key = b.closest('[data-key]')?.dataset.key;
    if (!key) return;
    const l = basket.lines().find((x) => x.key === key);
    if (!l) return;
    if (b.dataset.act === 'inc') basket.setQty(key, l.qty + 1);
    if (b.dataset.act === 'dec') basket.setQty(key, l.qty - 1);
    if (b.dataset.act === 'remove') { basket.remove(key); announce(`Removed ${l.product.name} from your basket.`); }
    // keep focus on the same control after the redraw, or on the heading if the line went away
    requestAnimationFrame(() => {
      const again = dlg.querySelector(`[data-key="${CSS.escape(key)}"] [data-act="${b.dataset.act}"]`);
      (again && !again.disabled ? again : dlg.querySelector(`[data-key="${CSS.escape(key)}"] [data-act="remove"]`) || dlg.querySelector('[data-close]')).focus();
    });
  });
  dlg.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
    if (opener && document.contains(opener)) opener.focus();
  });
  dlg.addEventListener('animationend', () => dlg.classList.remove('is-opening'));
  render();
}

function render() {
  if (!dlg) return;
  const lines = basket.lines();
  const body = dlg.querySelector('[data-body]'), foot = dlg.querySelector('[data-foot]');
  if (!lines.length) {
    body.innerHTML = `<div class="empty" style="padding-top:32px"><p class="h3">Your basket is empty</p><p class="quiet">Anything you add stays here while you look around.</p></div>`;
    foot.innerHTML = `<button class="btn btn--line btn--wide" type="button" data-close>Keep looking</button>`;
    return;
  }
  body.innerHTML = `<ul class="lines">${lines.map((l) => `
    <li class="line" data-key="${l.key}">
      ${lineArt(l)}
      <div>
        <div class="line__top"><a class="line__name" href="product.html?item=${l.id}&amp;colour=${l.colour}">${l.product.name}</a><span class="price">${money(l.total)}</span></div>
        <p class="line__variant">${lineVariant(l)}</p>
        <div class="line__row">
          <div class="qty" role="group" aria-label="Quantity of ${l.product.name}">
            <button type="button" data-act="dec" aria-label="One fewer" ${l.qty <= 1 ? 'disabled' : ''}>−</button>
            <output aria-live="polite">${l.qty}</output>
            <button type="button" data-act="inc" aria-label="One more" ${l.qty >= MAX_QTY ? 'disabled' : ''}>+</button>
          </div>
          <button class="textbtn" type="button" data-act="remove">Remove<span class="visually-hidden"> ${l.product.name}</span></button>
        </div>
      </div>
    </li>`).join('')}</ul>`;
  const sub = basket.subtotal();
  const away = SHOP.freeDeliveryFrom - sub;
  foot.innerHTML = `
    <div class="sum"><span>Subtotal</span><span class="price">${money(sub)}</span></div>
    <p class="note">${away > 0 ? `Delivery is ${money(SHOP.deliveryFee)}, or free over ${money(SHOP.freeDeliveryFrom)} (${money(away)} to go). Collecting from the shop is free.` : 'Delivery is free on this order.'}</p>
    <a class="btn btn--solid btn--wide" href="checkout.html">Go to checkout</a>
    <p class="concept-line">A concept: nothing is charged.</p>`;
}

function announce(msg) {
  if (!live) {
    live = el('<p class="visually-hidden" role="status" aria-live="polite"></p>');
    document.body.appendChild(live);
  }
  live.textContent = '';
  setTimeout(() => { live.textContent = msg; }, 30);
}
export { announce };

function open(from) {
  build();
  render();
  opener = from || document.activeElement;
  if (dlg.open) return;
  dlg.classList.add('is-opening');
  dlg.showModal();
  document.documentElement.style.overflow = 'hidden';
  const first = dlg.querySelector('.drawer__body a, .drawer__body button, [data-close]');
  if (first) first.focus();
}
function close() { if (dlg && dlg.open) dlg.close(); }

/* header counts */
function paintCounts() {
  const n = basket.count();
  document.querySelectorAll('[data-basket-count]').forEach((c) => { c.textContent = n; c.dataset.n = n; });
  document.querySelectorAll('.bag[data-open-basket]').forEach((b) => b.setAttribute('aria-label', `Basket, ${n} ${n === 1 ? 'item' : 'items'}`));
}
basket.subscribe(() => { paintCounts(); render(); });

export function mountBasket() {
  paintCounts();
  document.querySelectorAll('[data-open-basket]').forEach((b) => b.addEventListener('click', () => open(b)));
  // another tab of the same visit changed it
  window.addEventListener('pageshow', () => { items = load(); paintCounts(); render(); });
}
