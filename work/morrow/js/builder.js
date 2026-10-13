/*
 * Morrow Coffee: the drink builder's controls. Radios (native keyboard behaviour), the
 * quantity stepper, the price, and the cup. setDrink() is the one way in, for the
 * visitor's own clicks, the menu's "Build it" buttons and the message API alike.
 */
import { MENU, CAFE, unitPence, lineLabel, linePhrase, article, gbp } from './data.js';
import { createCup } from './cup.js';

const DEFAULT = { item: 'flat_white', size: 'regular', milk: 'whole', extra_shots: 0, syrup: 'none' };

export function createBuilder({ reduced, onAdd }) {
  const form = document.querySelector('[data-builder]');
  const canvas = document.querySelector('[data-cup]');
  const desc = document.querySelector('[data-cup-desc]');
  const label = document.querySelector('[data-drink-label]');
  const price = document.querySelector('[data-drink-price]');
  const qtyN = form.querySelector('[data-qty-n]');
  const said = form.querySelector('[data-build-status]');
  const less = form.querySelector('[data-qty="-1"]');
  const more = form.querySelector('[data-qty="1"]');

  const state = { ...DEFAULT, quantity: 1 };
  let firstFill = null;           // motion.js handle for the first fill
  let describeTimer = 0;

  const cup = createCup(canvas, {
    reduced,
    onDescribe(text) {
      clearTimeout(describeTimer);
      describeTimer = setTimeout(() => { desc.textContent = text; canvas.setAttribute('aria-label', `A cup drawn in cross-section. ${text}`); }, 400);
    },
  });

  /** Coerce options to what this drink allows (keeping what still fits). */
  function fit(o) {
    const m = MENU[o.item];
    return {
      item: o.item,
      size: m.sizes.includes(o.size) ? o.size : m.sizes[0],
      milk: m.milks.includes(o.milk) ? o.milk : m.defMilk,
      extra_shots: m.shots.includes(o.extra_shots) ? o.extra_shots : 0,
      syrup: m.syrups.includes(o.syrup) ? o.syrup : 'none',
    };
  }

  function why(group, m, name) {
    const a = article(name.toLowerCase());
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    if (group === 'size' && m.sizes.length === 1) return `${cap(a)} comes in one size.`;
    if (group === 'milk' && m.milks.length === 1) return `${cap(a)} has no milk.`;
    if (group === 'extra_shots' && m.shots.length === 1) return `${cap(a)} has no extra shots.`;
    if (group === 'syrup' && m.syrups.length === 1) return `${cap(a)} has no syrup.`;
    return '';
  }

  function paint() {
    const m = MENU[state.item];
    for (const group of ['item', 'size', 'milk', 'extra_shots', 'syrup']) {
      const fs = form.querySelector(`[data-group="${group}"]`);
      const value = String(state[group]);
      fs.querySelectorAll('input').forEach((inp) => { inp.checked = inp.value === value; });
      if (group === 'item') continue;
      const reason = why(group, m, m.name);
      fs.disabled = !!reason;
      fs.querySelector('[data-why]').textContent = reason;
      if (group === 'milk') {
        // "None" is offered only where a drink can come without milk (filter: "Black")
        const none = fs.querySelector('[data-opt="none"]');
        none.classList.toggle('is-off', !m.milks.includes('none'));
        fs.querySelector('[data-none-label]').textContent = state.item === 'filter_coffee' ? 'Black' : 'None';
      }
    }
    const unit = unitPence(state);
    label.textContent = state.quantity > 1 ? `${state.quantity} × ${lineLabel(state)}` : lineLabel(state);
    price.textContent = gbp(unit * state.quantity);
    qtyN.textContent = String(state.quantity);
    less.disabled = state.quantity <= 1;
    more.disabled = state.quantity >= CAFE.maxPerLine;
    more.setAttribute('aria-label', more.disabled ? `One more (${CAFE.maxPerLine} is the most for one line)` : 'One more');
  }

  /** Set the drink (and optionally the quantity). Returns the fitted options. */
  function setDrink(opts, { quantity, slosh = 1 } = {}) {
    if (firstFill) { firstFill.finish(); firstFill = null; }
    const next = fit({ ...state, ...opts });
    const changed = ['item', 'size', 'milk', 'extra_shots', 'syrup'].some((k) => next[k] !== state[k]);
    Object.assign(state, next);
    if (quantity != null) state.quantity = Math.max(1, Math.min(CAFE.maxPerLine, quantity));
    paint();
    if (changed) cup.setDrink(state, { impulse: slosh });
    return next;
  }

  form.addEventListener('change', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || t.type !== 'radio') return;
    const val = t.name === 'extra_shots' ? Number(t.value) : t.value;
    said.textContent = '';
    setDrink({ [t.name]: val });
  });
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-qty]');
    if (!b || b.disabled) return;
    if (firstFill) { firstFill.finish(); firstFill = null; }
    state.quantity = Math.max(1, Math.min(CAFE.maxPerLine, state.quantity + Number(b.dataset.qty)));
    paint();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (firstFill) { firstFill.finish(); firstFill = null; }
    const r = onAdd({ ...fit(state), quantity: state.quantity }, 'visitor');
    if (r && r.ok) {
      said.innerHTML = '';
      said.append(`Added ${linePhrase({ ...state })}. Your order comes to ${r.total}. `);
      const a = document.createElement('a');
      a.href = '#order'; a.textContent = 'See your order';
      said.append(a);
      state.quantity = 1;
      paint();
    } else if (r) {
      said.textContent = r.message;
    }
  });

  // First paint: the default drink in its own cup, empty, waiting to be filled.
  cup.setDrink(state, { impulse: 0 });
  cup.snapShape();
  paint();

  return {
    state,
    cup,
    setDrink,
    say(text) { said.textContent = text; },
    /** motion.js drives the first fill through this handle. */
    attachFirstFill(handle) { firstFill = handle; },
    focusItem() { const r = form.querySelector('input[name="item"]:checked'); if (r) r.focus({ preventScroll: true }); },
    stage: document.querySelector('.build__stage'),
  };
}
