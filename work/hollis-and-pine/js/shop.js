/*
 * Hollis & Pine: the shop grid with its filters (category, colour, price, order, and a
 * maker from "Show Maren's work"), and the makers list. Cards are built once; filtering
 * hides and reorders them, so nothing re-animates and focus is never lost.
 */
import { PRODUCTS, MAKERS, COLOURS, money } from './data.js';
import { productArt, tileTone } from './art.js';

const state = { cat: 'all', colours: new Set(), price: 'any', sort: 'featured', maker: null };
let form, grid, empty, countEl, tagsEl, cards = new Map();

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function shownColour(p) {
  for (const c of p.colours) if (state.colours.has(c)) return c;
  return p.colours[0];
}

function cardFor(p) {
  const li = document.createElement('li');
  li.className = 'card';
  li.dataset.fade = '';
  li.innerHTML = `<a class="card__link" href="product.html?item=${p.id}">
      <div class="card__art"></div>
      <div class="card__text">
        <h3 class="card__name">${esc(p.name)}</h3>
        <span class="card__price price">${money(p.price)}${p.sizePrice ? '<span class="visually-hidden"> and up</span>' : ''}</span>
        <span class="card__maker">${esc(MAKERS[p.maker].name)}</span>
        <span class="card__dots" aria-hidden="true">${p.colours.map((c) => `<i style="background:${COLOURS[c].hex}"></i>`).join('')}</span>
        <span class="visually-hidden">In ${p.colours.map((c) => COLOURS[c].label.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' and $1')}.</span>
      </div>
    </a>`;
  paintCard(li, p);
  return li;
}
function paintCard(li, p) {
  const c = shownColour(p);
  if (li.dataset.colour === c) return;
  li.dataset.colour = c;
  const art = li.querySelector('.card__art');
  art.style.background = tileTone(c);
  art.innerHTML = productArt(p, c);
  li.querySelector('.card__link').href = `product.html?item=${p.id}&colour=${c}`;
}

function matches(p) {
  if (state.cat !== 'all' && p.category !== state.cat) return false;
  if (state.maker && p.maker !== state.maker) return false;
  if (state.colours.size && !p.colours.some((c) => state.colours.has(c))) return false;
  if (state.price !== 'any') {
    const [lo, hi] = state.price.split('-').map(Number);
    if (p.price < lo || p.price >= hi) return false;
  }
  return true;
}

function update() {
  let list = PRODUCTS.filter(matches);
  if (state.sort === 'low') list = list.slice().sort((a, b) => a.price - b.price);
  if (state.sort === 'high') list = list.slice().sort((a, b) => b.price - a.price);
  const showing = new Set(list.map((p) => p.id));
  PRODUCTS.forEach((p) => { const li = cards.get(p.id); li.hidden = !showing.has(p.id); paintCard(li, p); });
  list.forEach((p) => grid.appendChild(cards.get(p.id)));   // order (moving nodes keeps focus where it is)
  const n = list.length;
  countEl.textContent = n ? `${n} ${n === 1 ? 'piece' : 'pieces'}` : 'No pieces match';
  empty.hidden = n > 0;
  grid.hidden = n === 0;

  const tags = [];
  if (state.maker) tags.push(['maker', '', MAKERS[state.maker].name]);
  state.colours.forEach((c) => tags.push(['colour', c, COLOURS[c].label]));
  if (state.price !== 'any') tags.push(['price', '', form.price.selectedOptions[0].textContent]);
  tagsEl.innerHTML = tags.map(([k, v, label]) => `<button class="tag" type="button" data-tag="${k}" data-val="${v}" aria-label="Remove filter: ${esc(label)}">${esc(label)}<b aria-hidden="true">×</b></button>`).join(' ');
  tagsEl.style.display = tags.length ? 'flex' : 'none';
  tagsEl.style.flexWrap = 'wrap'; tagsEl.style.gap = '8px';
  const any = state.cat !== 'all' || state.colours.size || state.price !== 'any' || state.maker;
  form.querySelectorAll('[data-clear]').forEach((b) => { b.hidden = !any; });
}

function clearAll() {
  state.cat = 'all'; state.colours.clear(); state.price = 'any'; state.maker = null;
  form.cat.value = 'all';
  form.querySelectorAll('[name="colour"]').forEach((i) => { i.checked = false; });
  form.price.value = 'any';
  update();
}

export function setCategory(cat) {
  if (!form) return;
  state.cat = cat; form.cat.value = cat; update();
}
export function showMaker(id) {
  state.maker = id; update();
}

export function initShop() {
  form = document.querySelector('[data-filters]');
  grid = document.querySelector('[data-grid]');
  if (!form || !grid) return;
  empty = document.querySelector('[data-empty]');
  countEl = form.querySelector('[data-count]');
  tagsEl = form.querySelector('[data-tags]');

  form.querySelector('[data-colours]').innerHTML = Object.entries(COLOURS).map(([k, c]) =>
    `<label class="chip"><input type="checkbox" name="colour" value="${k}"><span><i style="background:${c.hex}"></i>${c.label}</span></label>`).join('');

  PRODUCTS.forEach((p) => { const li = cardFor(p); cards.set(p.id, li); grid.appendChild(li); });

  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'cat') state.cat = t.value;
    if (t.name === 'colour') { if (t.checked) state.colours.add(t.value); else state.colours.delete(t.value); }
    if (t.name === 'price') state.price = t.value;
    if (t.name === 'sort') state.sort = t.value;
    update();
  });
  const more = form.querySelector('[data-more]'), panel = form.querySelector('#more-filters');
  more.addEventListener('click', () => {
    const open = more.getAttribute('aria-expanded') !== 'true';
    more.setAttribute('aria-expanded', String(open));
    panel.classList.toggle('is-collapsed', !open);
  });
  tagsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tag]');
    if (!b) return;
    const { tag, val } = b.dataset;
    if (tag === 'maker') state.maker = null;
    if (tag === 'colour') { state.colours.delete(val); const i = form.querySelector(`[name="colour"][value="${val}"]`); if (i) i.checked = false; }
    if (tag === 'price') { state.price = 'any'; form.price.value = 'any'; }
    update();
    countEl.setAttribute('tabindex', '-1'); countEl.focus();
  });
  document.querySelectorAll('[data-clear]').forEach((b) => b.addEventListener('click', () => {
    clearAll();
    const first = form.querySelector('[name="cat"]:checked'); if (first) first.focus();
  }));
  document.querySelectorAll('[data-shop-cat]').forEach((a) => a.addEventListener('click', () => setCategory(a.dataset.shopCat)));
  update();
  initMakers();
}

function initMakers() {
  const list = document.querySelector('[data-makers]');
  if (!list) return;
  list.innerHTML = Object.entries(MAKERS).map(([k, m]) => {
    const n = PRODUCTS.filter((p) => p.maker === k).length;
    const work = PRODUCTS.filter((p) => p.maker === k).slice(0, 4);
    return `<li class="maker" data-fade>
      <div class="maker__head">
        <h3 class="maker__name">${esc(m.name)}</h3>
        <div class="maker__work">${work.map((p) => `<a href="product.html?item=${p.id}" style="background:${tileTone(p.colours[0])}">${productArt(p, p.colours[0], { title: p.name })}</a>`).join('')}</div>
      </div>
      <p class="maker__craft">${esc(m.craft)}, ${esc(m.place)}</p>
      <p class="maker__note">${esc(m.note)}</p>
      <button class="textbtn" type="button" data-maker="${k}">Show ${esc(m.short)}’s work (${n})</button>
    </li>`;
  }).join('');
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-maker]');
    if (!b) return;
    clearAll();
    showMaker(b.dataset.maker);
    const head = document.getElementById('shop-title');
    head.setAttribute('tabindex', '-1');
    head.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    head.focus({ preventScroll: true });
  });
}
