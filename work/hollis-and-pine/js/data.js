/*
 * Hollis & Pine: the shop's data. Everything here is made up for a concept site
 * (makers, products, prices); nothing is real stock.
 *
 * Ceramic profiles are the outer silhouette from the foot to the rim, as [radius, height]
 * in centimetres. The same numbers draw the product pictures (art.js) and the 3D lathe
 * (vase.js), so the picture and the turning vase are always the same pot.
 */

export const SHOP = {
  name: 'Hollis & Pine',
  street: '28 Halton Yard',
  area: 'Islington, London N1',
  phone: '020 7946 0412',
  phoneHref: '+442079460412',
  email: 'hello@hollisandpine.example',
  deliveryFee: 4.95,
  freeDeliveryFrom: 120,
};

/* Colours a visitor can filter by. `hex` is the dye or glaze as drawn; `glaze` is the
   finish a ceramic in that colour has (each glaze has its own colour). */
export const COLOURS = {
  chalk:    { label: 'Chalk',    hex: '#ECE7DE', glaze: 'matte' },
  oat:      { label: 'Oat',      hex: '#D6C6AA', glaze: 'speckled' },
  sage:     { label: 'Sage',     hex: '#9AA992', glaze: 'satin' },
  clay:     { label: 'Clay',     hex: '#A9654A', glaze: 'gloss' },
  charcoal: { label: 'Charcoal', hex: '#3E403C', glaze: 'satin' },
};

export const GLAZE_NAMES = { matte: 'matte', satin: 'satin', gloss: 'gloss', speckled: 'speckled' };

export const MAKERS = {
  maren: { name: 'Maren Holt', short: 'Maren', craft: 'Stoneware vases', place: 'Walthamstow',
    note: 'Throws every vase on a kick wheel and dips each one by hand, so the glaze line is never quite the same twice.' },
  ewan: { name: 'Ewan Price', short: 'Ewan', craft: 'Everyday tableware', place: 'Margate',
    note: 'Makes mugs, bowls and jugs meant for the dishwasher and the daily table, in small firings of forty or so.' },
  field: { name: 'Field Linen', short: 'Field Linen', craft: 'Linen clothing', place: 'Leicester',
    note: 'Ada and Jo Fenwick cut and sew washed linen in a two-room workshop, in short runs of each shape.' },
  ruth: { name: 'Ruth Okafor', short: 'Ruth', craft: 'Knitwear', place: 'Hebden Bridge',
    note: 'Knits jumpers, hats and scarves from British wool, spun and dyed close to where the sheep are kept.' },
};

const ONE = ['One size'];
const CLOTHES = ['XS', 'S', 'M', 'L', 'XL'];

export const PRODUCTS = [
  { id: 'hearth-vase', name: 'Hearth vase', maker: 'maren', category: 'ceramics', kind: 'vase', price: 68,
    colours: ['chalk', 'sage', 'clay', 'oat'], sizes: ONE, dims: '24 cm tall',
    profile: [[4.6, 0], [5.7, 1.2], [7.6, 4.4], [8.6, 9], [8.1, 13.8], [6.2, 17.6], [3.9, 20.4], [3.6, 22.1], [4.4, 24]],
    blurb: 'A round-bellied stoneware vase with a narrow neck, for a few stems or a single branch.',
    details: ['Stoneware, fired to 1280 °C', 'Glazed inside, so it holds water', 'Unglazed foot, sanded smooth'],
    care: 'Wash by hand. Each one is thrown and dipped by hand, so the shape and the glaze line vary a little.' },
  { id: 'bud-vase', name: 'Bud vase', maker: 'maren', category: 'ceramics', kind: 'vase', price: 24,
    colours: ['chalk', 'sage', 'oat'], sizes: ONE, dims: '12 cm tall',
    profile: [[2.6, 0], [3.5, 1.4], [4.3, 4], [4.0, 6.4], [2.7, 8.5], [1.45, 9.9], [1.35, 11], [1.75, 12]],
    blurb: 'A small, weighty vase for one stem on a sill or a desk.',
    details: ['Stoneware, fired to 1280 °C', 'Glazed inside', 'Unglazed foot'],
    care: 'Wash by hand. No two are quite alike.' },
  { id: 'bottle-vase', name: 'Tall bottle vase', maker: 'maren', category: 'ceramics', kind: 'vase', price: 96,
    colours: ['clay', 'charcoal', 'chalk'], sizes: ONE, dims: '32 cm tall',
    profile: [[4.4, 0], [5.5, 1.1], [6.6, 5], [6.9, 11.5], [6.3, 16.5], [4.1, 20.5], [2.1, 23.8], [1.75, 29], [2.3, 32]],
    blurb: 'A tall, slender bottle that stands on its own on a shelf or a mantelpiece.',
    details: ['Stoneware, fired to 1280 °C', 'Glazed inside', 'Unglazed foot'],
    care: 'Wash by hand. Each glaze runs a little differently in the kiln.' },
  { id: 'everyday-mug', name: 'Everyday mug', maker: 'ewan', category: 'ceramics', kind: 'mug', price: 22,
    colours: ['chalk', 'sage', 'oat', 'charcoal'], sizes: ['250 ml', '350 ml'], sizePrice: { '350 ml': 4 }, dims: '9.5 cm tall',
    profile: [[3.5, 0], [3.95, 0.6], [4.1, 3], [4.2, 7], [4.15, 9.5]],
    blurb: 'A straight-sided mug with a handle that fits three fingers.',
    details: ['Stoneware', 'Dishwasher and microwave safe', 'Unglazed foot ring'],
    care: 'Fine in the dishwasher.' },
  { id: 'breakfast-bowl', name: 'Breakfast bowl', maker: 'ewan', category: 'ceramics', kind: 'bowl', price: 26,
    colours: ['chalk', 'oat', 'sage'], sizes: ONE, dims: '15.5 cm across',
    profile: [[3.0, 0], [3.7, 0.6], [5.8, 2.4], [7.2, 4.8], [7.75, 7.4]],
    blurb: 'A deep bowl for porridge, soup or a big salad for one.',
    details: ['Stoneware', 'Dishwasher and microwave safe'],
    care: 'Fine in the dishwasher.' },
  { id: 'pouring-jug', name: 'Pouring jug', maker: 'ewan', category: 'ceramics', kind: 'jug', price: 44,
    colours: ['chalk', 'clay'], sizes: ONE, dims: '18 cm tall, holds 1 litre',
    profile: [[4.2, 0], [5.0, 1], [6.0, 5], [6.0, 10], [5.2, 14], [5.0, 16.4], [5.4, 18]],
    blurb: 'A litre jug with a pulled lip that pours without dripping.',
    details: ['Stoneware', 'Dishwasher safe'],
    care: 'Fine in the dishwasher.' },
  { id: 'serving-bowl', name: 'Wide serving bowl', maker: 'ewan', category: 'ceramics', kind: 'bowl', price: 58,
    colours: ['oat', 'chalk', 'clay'], sizes: ONE, dims: '24 cm across',
    profile: [[4.6, 0], [5.2, 0.5], [8.4, 2.8], [10.8, 5.6], [12, 8.6]],
    blurb: 'A broad, shallow bowl for the middle of the table.',
    details: ['Stoneware', 'Dishwasher safe'],
    care: 'Fine in the dishwasher.' },

  { id: 'work-shirt', name: 'Linen work shirt', maker: 'field', category: 'clothing', kind: 'shirt', price: 118,
    colours: ['oat', 'sage', 'chalk'], sizes: CLOTHES, dims: 'Relaxed fit',
    blurb: 'A boxy shirt in heavy washed linen, with one chest pocket and horn buttons.',
    details: ['100% linen, washed soft', 'Horn buttons', 'Relaxed, boxy fit'],
    care: 'Wash at 30 °C and dry on the line. It softens with every wash.' },
  { id: 'wide-trousers', name: 'Wide linen trousers', maker: 'field', category: 'clothing', kind: 'trousers', price: 124,
    colours: ['oat', 'charcoal', 'clay'], sizes: CLOTHES, dims: 'High waist, wide leg',
    blurb: 'High-waisted trousers with two front pleats and deep side pockets.',
    details: ['100% linen, washed soft', 'Button fly', 'Deep side pockets'],
    care: 'Wash at 30 °C and dry on the line.' },
  { id: 'smock-dress', name: 'Linen smock dress', maker: 'field', category: 'clothing', kind: 'dress', price: 148,
    colours: ['sage', 'clay', 'oat'], sizes: CLOTHES, dims: 'Loose, calf length',
    blurb: 'A loose smock dress gathered at the yoke, with pockets in both side seams.',
    details: ['100% linen, washed soft', 'Side-seam pockets', 'Calf length'],
    care: 'Wash at 30 °C and dry on the line.' },
  { id: 'linen-apron', name: 'Linen apron', maker: 'field', category: 'clothing', kind: 'apron', price: 42,
    colours: ['oat', 'charcoal', 'sage'], sizes: ONE, dims: 'Adjustable neck strap',
    blurb: 'A full apron for the kitchen or the potting shed, with a wide front pocket.',
    details: ['100% linen', 'Adjustable neck strap', 'Long ties'],
    care: 'Wash at 40 °C.' },
  { id: 'fisherman-jumper', name: 'Fisherman jumper', maker: 'ruth', category: 'clothing', kind: 'jumper', price: 165,
    colours: ['oat', 'charcoal', 'sage'], sizes: CLOTHES, dims: 'Relaxed fit',
    blurb: 'A cabled crew-neck jumper in undyed and plant-dyed British wool.',
    details: ['100% British wool', 'Hand-finished seams', 'Relaxed fit'],
    care: 'Wash by hand in cool water and dry flat.' },
  { id: 'ribbed-hat', name: 'Ribbed wool hat', maker: 'ruth', category: 'clothing', kind: 'hat', price: 38,
    colours: ['oat', 'clay', 'charcoal'], sizes: ONE, dims: 'Turn-up brim',
    blurb: 'A close-fitting rib hat with a deep turn-up.',
    details: ['100% British wool', 'One size, stretches to fit'],
    care: 'Wash by hand in cool water and dry flat.' },
  { id: 'wool-scarf', name: 'Wool scarf', maker: 'ruth', category: 'clothing', kind: 'scarf', price: 58,
    colours: ['oat', 'sage', 'clay'], sizes: ONE, dims: '180 × 30 cm',
    blurb: 'A long, soft scarf in a simple rib, with a short fringe at each end.',
    details: ['100% British wool', '180 × 30 cm'],
    care: 'Wash by hand in cool water and dry flat.' },
];

export const byId = (id) => PRODUCTS.find((p) => p.id === id) || null;

/* Prices: "£68" and "£4.95"; tabular numerals come from the CSS. */
export function money(n) {
  const whole = Math.round(n * 100) % 100 === 0;
  return '£' + (whole ? String(Math.round(n)) : n.toFixed(2));
}

export function unitPrice(product, size) {
  const extra = (product.sizePrice && product.sizePrice[size]) || 0;
  return product.price + extra;
}

/* "Hearth vase in sage" / ceramics read as "in a sage satin glaze" on the product page. */
export function colourName(product, colour) {
  const c = COLOURS[colour];
  if (!c) return '';
  return product.category === 'ceramics' ? `${c.label}, ${c.glaze}` : c.label;
}
