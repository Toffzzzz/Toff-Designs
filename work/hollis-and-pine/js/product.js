/*
 * Hollis & Pine: the product page (product.html?item=<id>&colour=<colour>).
 * Colour, size and quantity; "Add to basket" opens the basket drawer. Vases and bowls
 * can be turned in 3D: the same lathe as the home page, loaded only when asked for,
 * and disposed of again with "Back to the picture".
 */
import { initSite, fades } from './site.js';
import { byId, PRODUCTS, MAKERS, COLOURS, money, unitPrice, colourName, SHOP } from './data.js';
import { productArt, tileTone } from './art.js';
import basket, { announce } from './basket.js';
import { loadVase } from './stage.js';

initSite();

const q = new URLSearchParams(location.search);
const product = byId(q.get('item') || '');
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

if (!product) notFound(); else render(product);
fades();

function notFound() {
  document.title = 'Not found: Hollis & Pine';
  $('[data-title]').textContent = 'We couldn’t find that piece';
  $('[data-maker]').textContent = '';
  $('[data-blurb]').innerHTML = 'It may have sold out, or the link may be wrong. <a href="./#shop">See everything in the shop</a>.';
  $('[data-art]').style.background = 'var(--mist)';
  $('[data-art]').innerHTML = productArt(byId('hearth-vase'), 'chalk');
}

function render(p) {
  const maker = MAKERS[p.maker];
  let colour = p.colours.includes(q.get('colour')) ? q.get('colour') : p.colours[0];
  let size = p.sizes[0];
  let qty = 1;
  let vase = null, canvas = null;

  document.title = `${p.name} by ${maker.name}: Hollis & Pine`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = `${p.blurb} ${money(p.price)}, from ${maker.name} at Hollis & Pine.`;
  $('[data-crumbs]').insertAdjacentHTML('beforeend', `<li><a href="./#shop">${p.category === 'ceramics' ? 'Ceramics' : 'Clothing'}</a></li><li><span aria-current="page">${esc(p.name)}</span></li>`);
  $('[data-maker]').textContent = `${maker.name}, ${maker.place}`;
  $('[data-title]').textContent = p.name;
  $('[data-blurb]').textContent = p.blurb;

  const art = $('[data-art]');
  const paintArt = () => {
    art.style.background = tileTone(colour);
    const svg = art.querySelector('svg');
    const fresh = productArt(p, colour, { title: `${p.name} in ${colourName(p, colour).toLowerCase()}` });
    if (svg) svg.outerHTML = fresh; else art.insertAdjacentHTML('afterbegin', fresh);
    if (vase) art.querySelector('svg').style.visibility = 'hidden';
  };
  const paintPrice = () => {
    const unit = unitPrice(p, size);
    $('[data-price]').textContent = qty > 1 ? `${money(unit)} each, ${money(unit * qty)} for ${qty}` : money(unit);
  };

  /* the form: colour, size, quantity */
  const form = $('[data-buy]');
  const colourChips = p.colours.map((c) => `<label class="chip"><input type="radio" name="colour" value="${c}" ${c === colour ? 'checked' : ''}><span><i style="background:${COLOURS[c].hex}"></i>${esc(colourName(p, c))}</span></label>`).join('');
  const sizeBlock = p.sizes.length > 1
    ? `<fieldset class="choices"><legend>Size</legend><div class="choices__row">${p.sizes.map((s) => `<label class="chip chip--plain"><input type="radio" name="size" value="${esc(s)}" ${s === size ? 'checked' : ''}><span>${esc(s)}${p.sizePrice && p.sizePrice[s] ? ` <em class="chip__sub">+${money(p.sizePrice[s])}</em>` : ''}</span></label>`).join('')}</div></fieldset>`
    : `<p class="small"><span class="quiet">Size</span> &nbsp;One size, ${esc(p.dims)}</p>`;
  form.innerHTML = `
    <fieldset class="choices"><legend>${p.category === 'ceramics' ? 'Glaze' : 'Colour'}</legend><div class="choices__row">${colourChips}</div></fieldset>
    ${sizeBlock}
    <div class="field" style="display:grid; gap:8px; justify-items:start">
      <label for="qty" style="font-weight:500; font-size:15px">Quantity</label>
      <div class="qty">
        <button type="button" data-q="-1" aria-label="One fewer" aria-controls="qty">−</button>
        <input id="qty" name="qty" type="number" inputmode="numeric" min="1" max="${basket.MAX_QTY}" value="1">
        <button type="button" data-q="1" aria-label="One more" aria-controls="qty">+</button>
      </div>
    </div>
    <div class="pdp__add">
      <button class="btn btn--solid" type="submit">Add to basket</button>
      <span class="concept-line">A concept: nothing is charged.</span>
    </div>`;
  const qtyInput = form.querySelector('#qty');
  const syncQty = () => {
    qtyInput.value = qty;
    form.querySelector('[data-q="-1"]').disabled = qty <= 1;
    form.querySelector('[data-q="1"]').disabled = qty >= basket.MAX_QTY;
    paintPrice();
  };
  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'colour') {
      colour = t.value; paintArt();
      if (vase) vase.setGlaze(COLOURS[colour].glaze, { colour: COLOURS[colour].hex });
      const u = new URL(location.href); u.searchParams.set('colour', colour); history.replaceState(history.state, '', u);
    }
    if (t.name === 'size') { size = t.value; paintPrice(); }
    if (t.name === 'qty') { const n = parseInt(t.value, 10); qty = Number.isFinite(n) ? Math.min(basket.MAX_QTY, Math.max(1, n)) : 1; syncQty(); }
  });
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]');
    if (!b) return;
    qty = Math.min(basket.MAX_QTY, Math.max(1, qty + Number(b.dataset.q)));
    syncQty();
    if (b.disabled) qtyInput.focus();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const r = basket.add({ id: p.id, colour, size, qty });
    const what = `${r.added} × ${p.name} (${colourName(p, colour).toLowerCase()}${size !== 'One size' ? ', ' + size : ''})`;
    announce(r.capped ? `Added ${what}. The basket holds up to ${basket.MAX_QTY} of each.` : `Added ${what} to your basket.`);
    basket.open(form.querySelector('[type="submit"]'));
  });

  /* details */
  $('[data-more]').innerHTML = `
    <div><h2 class="h3" style="margin-bottom:8px">Details</h2><ul class="pdp__list">${p.details.concat(p.details.includes(p.dims) ? [] : [p.dims]).map((d) => `<li>${esc(d)}</li>`).join('')}</ul></div>
    <div><h2 class="h3" style="margin-bottom:8px">Care</h2><p>${esc(p.care)}</p></div>
    <div><h2 class="h3" style="margin-bottom:8px">Delivery</h2><p>${money(SHOP.deliveryFee)} in the UK, free over ${money(SHOP.freeDeliveryFrom)}, or collect from the shop for free. Returns within 30 days.</p></div>`;

  paintArt(); syncQty();

  /* 3D for pots without handles */
  if (p.category === 'ceramics' && (p.kind === 'vase' || p.kind === 'bowl')) {
    const wrap = $('[data-3d]'), btn = $('[data-3d-btn]'), note = $('[data-3d-note]');
    wrap.hidden = false; note.hidden = true;
    let busy = false;
    const keys = (e) => {
      const d = { ArrowRight: 15, ArrowLeft: -15, ArrowUp: 15, ArrowDown: -15 }[e.key];
      if (d == null || !vase) return;
      e.preventDefault(); vase.turnBy((d * Math.PI) / 180);
    };
    const back = () => {
      if (vase) { vase.dispose(); vase = null; }
      if (canvas) { canvas.remove(); canvas = null; }
      art.querySelector('svg').style.visibility = '';
      art.removeAttribute('tabindex'); art.removeAttribute('role'); art.removeAttribute('aria-label');
      art.removeEventListener('keydown', keys);
      btn.textContent = 'Turn it in 3D'; note.hidden = true;
    };
    btn.addEventListener('click', async () => {
      if (busy) return;
      if (vase) { back(); btn.focus(); return; }
      busy = true; btn.textContent = 'Loading the 3D view…'; btn.setAttribute('aria-disabled', 'true');
      canvas = document.createElement('canvas');
      canvas.className = 'stage__canvas';
      canvas.setAttribute('aria-hidden', 'true');
      art.appendChild(canvas);
      vase = await loadVase(canvas, { profile: p.profile, glaze: COLOURS[colour].glaze, colour: COLOURS[colour].hex, angle: 0.6,
        onLost: () => { back(); note.hidden = false; note.textContent = 'The 3D view stopped, so here is the picture again.'; } });
      busy = false; btn.removeAttribute('aria-disabled');
      if (!vase) {
        canvas.remove(); canvas = null;
        btn.textContent = 'Turn it in 3D'; btn.disabled = true;
        note.hidden = false; note.textContent = 'This browser can’t show 3D, so here is the drawing.';
        return;
      }
      canvas.style.opacity = '1';
      art.querySelector('svg').style.visibility = 'hidden';
      art.tabIndex = 0; art.setAttribute('role', 'img');
      art.setAttribute('aria-label', `${p.name} in 3D. Drag, or use the arrow keys, to turn it.`);
      art.addEventListener('keydown', keys);
      btn.textContent = 'Back to the picture'; note.hidden = false; note.textContent = 'Drag to turn it, or use the arrow keys.';
    });
  }

  /* more from the maker (or the same category) */
  let more = PRODUCTS.filter((x) => x.maker === p.maker && x.id !== p.id);
  if (more.length < 3) more = more.concat(PRODUCTS.filter((x) => x.category === p.category && x.maker !== p.maker)).slice(0, 4);
  more = more.slice(0, 4);
  $('[data-related-title]').textContent = PRODUCTS.filter((x) => x.maker === p.maker && x.id !== p.id).length >= 3 ? `More from ${maker.name}` : 'You might also like';
  $('[data-related-grid]').innerHTML = more.map((x) => `<li class="card" data-fade>
    <a class="card__link" href="product.html?item=${x.id}">
      <div class="card__art" style="background:${tileTone(x.colours[0])}">${productArt(x, x.colours[0])}</div>
      <div class="card__text"><h3 class="card__name">${esc(x.name)}</h3><span class="card__price price">${money(x.price)}</span><span class="card__maker">${esc(MAKERS[x.maker].name)}</span></div>
    </a></li>`).join('');
  $('[data-related]').hidden = false;
}
