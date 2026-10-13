/*
 * Morrow Coffee: the facts, the menu and the ordering rules, in one place.
 *
 * Every value here comes from round-05-plan.md, Contract A section 10.5, and the AI demo's
 * facts in assets/studio/aiassist.js (hours, prices, milks, seats, dogs, no bookings).
 * Change them here only: the page, the drink builder, the basket and the message API
 * all read this file.
 */

export const CAFE = {
  name: 'Morrow Coffee',
  address: '14 Elm Row, Hackney',
  phone: '020 7946 0381',          // Ofcom's drama range
  email: 'hello@morrow.example',
  // Opening hours, London time. Day numbers: 0 Sunday … 6 Saturday.
  hours: {
    weekday: { open: '07:30', close: '16:00' },
    weekend: { open: '08:30', close: '16:00' },
  },
  lastOrderBefore: '15:35',        // after this, orders are for the next day
  latestCollection: '15:45',
  leadMinutes: 10,                 // earliest collection: now + 10 minutes, rounded up to 5
  stepMinutes: 5,
  maxLines: 8,
  maxItems: 20,
  maxPerLine: 6,
  stampsToFill: 9,                 // nine stamps, and the tenth hot drink is on us
};

export const MILKS = ['none', 'whole', 'oat', 'almond', 'soy'];
export const SYRUPS = ['none', 'vanilla', 'caramel', 'cardamom'];
export const SIZES = ['regular', 'large'];

export const EXTRA = { large: 50, shot: 60, syrup: 50 };

// Contract A's menu: exactly these keys, names and prices (pence).
export const MENU = {
  espresso:        { name: 'Espresso',            plural: 'espressos',            price: 260, kind: 'drink', sizes: ['regular'],          milks: ['none'],                                shots: [0, 1, 2], syrups: ['none'],  defMilk: 'none',
                     note: 'A double shot of this month’s single origin.' },
  flat_white:      { name: 'Flat white',          plural: 'flat whites',          price: 340, kind: 'drink', sizes: ['regular'],          milks: ['whole', 'oat', 'almond', 'soy'],       shots: [0, 1, 2], syrups: SYRUPS,    defMilk: 'whole',
                     note: 'Two ristretto shots and silky milk, in a small cup.' },
  cappuccino:      { name: 'Cappuccino',          plural: 'cappuccinos',          price: 340, kind: 'drink', sizes: ['regular', 'large'], milks: ['whole', 'oat', 'almond', 'soy'],       shots: [0, 1, 2], syrups: SYRUPS,    defMilk: 'whole',
                     note: 'Espresso under a deep cap of foam.' },
  latte:           { name: 'Latte',               plural: 'lattes',               price: 360, kind: 'drink', sizes: ['regular', 'large'], milks: ['whole', 'oat', 'almond', 'soy'],       shots: [0, 1, 2], syrups: SYRUPS,    defMilk: 'whole',
                     note: 'Mostly milk, gently sweet, served in a glass.' },
  filter_coffee:   { name: 'Filter coffee',       plural: 'filter coffees',       price: 300, kind: 'drink', sizes: ['regular', 'large'], milks: ['none', 'whole', 'oat', 'almond', 'soy'], shots: [0],      syrups: SYRUPS,    defMilk: 'none',
                     note: 'Brewed by the pot through the morning, black or with milk.' },
  hot_chocolate:   { name: 'Hot chocolate',       plural: 'hot chocolates',       price: 350, kind: 'drink', sizes: ['regular', 'large'], milks: ['whole', 'oat', 'almond', 'soy'],       shots: [0],       syrups: SYRUPS,    defMilk: 'whole',
                     note: 'Dark chocolate melted into steamed milk.' },
  croissant:       { name: 'Butter croissant',    plural: 'butter croissants',    price: 280, kind: 'food',
                     note: 'Laminated by hand and baked at dawn.' },
  cardamom_bun:    { name: 'Cardamom bun',        plural: 'cardamom buns',        price: 320, kind: 'food',
                     note: 'Knotted, sticky and warm from the oven.' },
  sourdough_toast: { name: 'Sourdough toast',     plural: 'sourdough toasts',     price: 450, kind: 'food',
                     note: 'Two thick slices of this morning’s loaf, with butter and jam.' },
  gf_brownie:      { name: 'Gluten-free brownie', plural: 'gluten-free brownies', price: 320, kind: 'food',
                     note: 'Dense and fudgy, made without gluten.' },
};
for (const it of Object.values(MENU)) {
  if (it.kind === 'food') Object.assign(it, { sizes: ['regular'], milks: ['none'], shots: [0], syrups: ['none'], defMilk: 'none' });
}
export const MENU_KEYS = Object.keys(MENU);
export const DRINK_KEYS = MENU_KEYS.filter((k) => MENU[k].kind === 'drink');
export const FOOD_KEYS = MENU_KEYS.filter((k) => MENU[k].kind === 'food');

export const MILK_NAME = { none: 'No milk', whole: 'Whole', oat: 'Oat', almond: 'Almond', soy: 'Soy' };
export const SYRUP_NAME = { none: 'None', vanilla: 'Vanilla', caramel: 'Caramel', cardamom: 'Cardamom' };

/** Unit price in pence for a set of options (already checked). */
export function unitPence({ item, size, extra_shots, syrup }) {
  const m = MENU[item];
  return m.price + (size === 'large' ? EXTRA.large : 0) + extra_shots * EXTRA.shot + (syrup !== 'none' ? EXTRA.syrup : 0);
}

/** Why these options don't suit this item, as { arg, message }, or null when they do.
 *  Checked in the contract's argument order: size, milk, extra_shots, syrup. */
export function optionProblem({ item, size, milk, extra_shots, syrup }) {
  const m = MENU[item];
  const n = m.name;
  const an = article(n.toLowerCase());
  if (m.kind === 'food') {
    if (size !== 'regular') return { arg: 'size', message: `The argument "size" must be "regular" for food: ${an} comes as it is.` };
    if (milk !== 'none') return { arg: 'milk', message: `The argument "milk" must be "none" for food: ${an} comes as it is.` };
    if (extra_shots !== 0) return { arg: 'extra_shots', message: `The argument "extra_shots" must be 0 for food: ${an} comes as it is.` };
    if (syrup !== 'none') return { arg: 'syrup', message: `The argument "syrup" must be "none" for food: ${an} comes as it is.` };
    return null;
  }
  if (!m.sizes.includes(size)) return { arg: 'size', message: `The argument "size" must be "regular": ${an} comes in one size.` };
  if (!m.milks.includes(milk)) {
    return { arg: 'milk', message: item === 'espresso'
      ? 'The argument "milk" must be "none": an espresso has no milk.'
      : `The argument "milk" must be one of: ${m.milks.join(', ')}.` };
  }
  if (!m.shots.includes(extra_shots)) return { arg: 'extra_shots', message: `The argument "extra_shots" must be 0: ${an} has no extra shots.` };
  if (!m.syrups.includes(syrup)) return { arg: 'syrup', message: `The argument "syrup" must be "none": ${an} has no syrup.` };
  return null;
}

export const article = (words) => `${/^[aeiou]/i.test(words) ? 'an' : 'a'} ${words}`;

const SHOTS_WORD = ['', 'extra shot', 'two extra shots'];

/** 'Large oat latte, extra shot, vanilla' (the basket line's label). */
export function lineLabel({ item, size, milk, extra_shots, syrup }) {
  const m = MENU[item];
  if (m.kind === 'food') return m.name;
  const pre = [];
  if (size === 'large') pre.push('large');
  if (['oat', 'almond', 'soy'].includes(milk) && item !== 'filter_coffee') pre.push(milk);
  let base = m.name.toLowerCase();
  let head = pre.length ? `${pre.join(' ')} ${base}` : base;
  head = head.charAt(0).toUpperCase() + head.slice(1);
  const tail = [];
  if (item === 'filter_coffee' && milk !== 'none') tail.push(milk === 'whole' ? 'with milk' : `${milk} milk`);
  if (extra_shots) tail.push(SHOTS_WORD[extra_shots]);
  if (syrup !== 'none') tail.push(`${syrup} syrup`);
  return [head, ...tail].join(', ');
}

/** '2 oat flat whites with an extra shot' / 'a cardamom bun' (for sentences). */
export function linePhrase({ item, quantity, size, milk, extra_shots, syrup }) {
  const m = MENU[item];
  const pre = [];
  if (size === 'large') pre.push('large');
  if (['oat', 'almond', 'soy'].includes(milk) && item !== 'filter_coffee') pre.push(milk);
  const noun = quantity === 1 ? m.name.toLowerCase() : m.plural;
  let words = pre.length ? `${pre.join(' ')} ${noun}` : noun;
  if (quantity === 1) words = article(words);
  else words = `${quantity} ${words}`;
  const withs = [];
  if (item === 'filter_coffee' && milk !== 'none') withs.push(milk === 'whole' ? 'milk' : `${milk} milk`);
  if (extra_shots === 1) withs.push('an extra shot');
  if (extra_shots === 2) withs.push('two extra shots');
  if (syrup !== 'none') withs.push(`${syrup} syrup`);
  if (withs.length) words += ' with ' + (withs.length > 1 ? withs.slice(0, -1).join(', ') + ' and ' + withs[withs.length - 1] : withs[0]);
  return words;
}

/** '£3.40', '£8.00' (the café always shows pence, as in Contract A's example). */
export const gbp = (pence) => `£${Math.floor(pence / 100)}.${String(pence % 100).padStart(2, '0')}`;

/* ── Time ─────────────────────────────────────────────────────────────────── */

export const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export function hoursFor(weekday) {
  return weekday === 'Saturday' || weekday === 'Sunday' ? CAFE.hours.weekend : CAFE.hours.weekday;
}
