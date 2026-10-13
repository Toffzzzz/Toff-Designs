/*
 * Hollis & Pine: the checkout preview. Contact details, delivery or collection, a UK
 * address with validation (checked on submit, then as you correct each field), the order
 * summary, and a confirmation. A concept: nothing is charged, sent or stored, and the
 * details typed in are never saved anywhere (not even in sessionStorage).
 */
import { initSite, fades } from './site.js';
import { money, SHOP } from './data.js';
import basket, { lineArt, lineVariant } from './basket.js';

initSite();

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const form = $('[data-co-form]');
const summary = $('[data-co-summary]');
const emptyEl = $('[data-co-empty]');
const done = $('[data-co-done]');
let submitted = false, finished = false;

/* UK postcodes (the Royal Mail pattern, as used by gov.uk) */
const POSTCODE = /^(GIR ?0AA|[A-PR-UWYZ]([0-9]{1,2}|([A-HK-Y][0-9]([0-9ABEHMNPRV-Y])?)|[0-9][A-HJKPS-UW]) ?[0-9][ABD-HJLNP-UW-Z]{2})$/i;
export function formatPostcode(v) {
  const s = String(v).toUpperCase().replace(/\s+/g, '');
  return s.length > 3 ? s.slice(0, -3) + ' ' + s.slice(-3) : s;
}

const method = () => form.elements.method.value;
function delivery(sub) {
  if (method() === 'collect') return 0;
  return sub >= SHOP.freeDeliveryFrom ? 0 : SHOP.deliveryFee;
}

function paintSummary() {
  const lines = basket.lines();
  const has = lines.length > 0;
  if (!finished) {
    emptyEl.hidden = has; form.hidden = !has; summary.hidden = !has;
  }
  if (!has) return;
  $('[data-co-lines]').innerHTML = lines.map((l) => `<li class="line">${lineArt(l)}<div>
      <div class="line__top"><span class="line__name">${esc(l.product.name)}</span><span class="price">${money(l.total)}</span></div>
      <p class="line__variant">${esc(lineVariant(l))}${l.qty > 1 ? ` · ${l.qty} × ${money(l.unit)}` : ''}</p></div></li>`).join('');
  const sub = basket.subtotal(), del = delivery(sub);
  $('[data-co-totals]').innerHTML = `
    <div><span>Subtotal</span><span>${money(sub)}</span></div>
    <div><span>${method() === 'collect' ? 'Collect from the shop' : 'Delivery'}</span><span>${del ? money(del) : 'Free'}</span></div>
    <div class="grand"><span>Total</span><span>${money(sub + del)}</span></div>
    <p class="note">Prices include VAT.</p>`;
  $('[data-post-price]').textContent = sub >= SHOP.freeDeliveryFrom ? 'Free' : money(SHOP.deliveryFee);
}

/* validation */
const RULES = {
  name: (v) => (v.trim().length < 2 ? 'Enter your full name' : ''),
  email: (v) => (!v.trim() ? 'Enter your email address' : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter an email address like name@example.com'),
  line1: (v) => (method() === 'collect' ? '' : v.trim().length < 3 ? 'Enter the first line of your address' : ''),
  town: (v) => (method() === 'collect' ? '' : v.trim().length < 2 ? 'Enter your town or city' : ''),
  postcode: (v) => (method() === 'collect' ? '' : !v.trim() ? 'Enter your postcode' : POSTCODE.test(v.replace(/\s+/g, ' ').trim()) ? '' : 'Enter a full UK postcode, like N1 2AB'),
};
function check(name) {
  const input = form.elements[name];
  const msg = RULES[name](input.value);
  const err = document.getElementById('e-' + name);
  err.hidden = !msg;
  err.textContent = msg ? msg : '';
  if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  return msg;
}
function checkAll() {
  return Object.keys(RULES).map((n) => [n, check(n)]).filter(([, m]) => m);
}

form.addEventListener('change', (e) => {
  if (e.target.name === 'method') {
    $('[data-address]').hidden = method() === 'collect';
    paintSummary();
    if (submitted) checkAll();
  }
});
form.addEventListener('input', (e) => { if (submitted && RULES[e.target.name]) check(e.target.name); });
form.elements.postcode.addEventListener('blur', (e) => {
  if (POSTCODE.test(e.target.value.replace(/\s+/g, ' ').trim())) e.target.value = formatPostcode(e.target.value);
  if (submitted) check('postcode');
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  submitted = true;
  const errs = checkAll();
  const sum = $('[data-errsum]');
  if (errs.length) {
    $('[data-errlist]').innerHTML = errs.map(([n, m]) => `<li><a href="#f-${n}">${esc(m)}</a></li>`).join('');
    sum.hidden = false;
    sum.focus();
    return;
  }
  sum.hidden = true;
  complete();
});
$('[data-errlist]').addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (!a) return;
  e.preventDefault();
  const input = document.querySelector(a.getAttribute('href'));
  input.focus(); input.scrollIntoView({ block: 'center' });
});

function complete() {
  const f = form.elements;
  const lines = basket.lines();
  const sub = basket.subtotal(), del = delivery(sub);
  const ref = 'HP-' + String(1000 + Math.floor(Math.random() * 9000));
  const first = f.name.value.trim().split(/\s+/)[0];
  const where = method() === 'collect'
    ? '<p>Collect it from 28 Halton Yard, Islington, any day we’re open in the next week.</p>'
    : `<p>Delivery to:</p><p>${esc(f.name.value.trim())}<br>${esc(f.line1.value.trim())}${f.line2.value.trim() ? '<br>' + esc(f.line2.value.trim()) : ''}<br>${esc(f.town.value.trim())}<br>${esc(formatPostcode(f.postcode.value))}</p>`;
  $('[data-done-ref]').textContent = `Order ${ref}`;
  $('#done-title').textContent = `Thank you, ${first}`;
  $('[data-done-body]').innerHTML = `
    <ul class="lines">${lines.map((l) => `<li class="line">${lineArt(l)}<div><div class="line__top"><span class="line__name">${esc(l.product.name)}${l.qty > 1 ? ` × ${l.qty}` : ''}</span><span class="price">${money(l.total)}</span></div><p class="line__variant">${esc(lineVariant(l))}</p></div></li>`).join('')}</ul>
    <div class="totals"><div><span>${method() === 'collect' ? 'Collect from the shop' : 'Delivery'}</span><span>${del ? money(del) : 'Free'}</span></div><div class="grand"><span>Total</span><span>${money(sub + del)}</span></div></div>
    <div style="display:grid; gap:6px; margin-top:8px">${where}</div>
    <p>In a real shop, a confirmation would now go to ${esc(f.email.value.trim())}.</p>`;
  finished = true;
  form.hidden = true; summary.hidden = true; emptyEl.hidden = true;
  done.hidden = false;
  form.reset();
  basket.clear();
  done.focus();
  window.scrollTo(0, 0);
}

basket.subscribe(paintSummary);
paintSummary();
fades();
