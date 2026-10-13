/*
 * SiteKit: the one renderer behind Design yours (Pick, Sketch and Describe). It draws a small but real-looking
 * website from a spec (Contract B, rounds/round-05-plan.md section 11), on a laptop or a phone.
 *
 *   import SiteKit from './sitekit.js';           // also: import { render, validate, ... } and window.SiteKit
 *   const view = SiteKit.render(el, spec, { device: 'laptop' | 'phone', photos: { clinic: 'url', ... } });
 *   view.update(nextSpec); view.spec(); view.describe(); view.problems(); view.destroy();
 *   SiteKit.validate(spec)              -> { ok, spec, problems }   ok is false only when the input was unusable
 *   SiteKit.fromPick({ business, mood, layout, name })      -> spec
 *   SiteKit.fromSketch(blocks, { business, mood, name })    -> spec   (Draw your site's dr.blocks() or AI elements)
 *   SiteKit.fromWords(text)                                 -> spec   (offline Describe)
 *   SiteKit.MOODS, SiteKit.BUSINESSES, SiteKit.LAYOUTS
 *
 * Extra render options: fit (default true: the site is laid out at a design width, 1200 for a laptop and 390 for
 * a phone, and zoomed to the container's width), width (another design width).
 * Needs sitekit.css. The preview is built from div and span only, so a host page's element styles (h2, p, figure)
 * never reach it. Everything from a spec is set with textContent, never as HTML; the only markup written with
 * innerHTML is the constant SVG drawings below. The rendered site is aria-hidden and inert: the frame around it
 * carries the label from describe().
 */

const PHOTO_KINDS = ['clinic', 'cafe', 'salon', 'trades', 'restaurant', 'boutique'];
const KINDS = PHOTO_KINDS.concat('other');
const MOOD_KEYS = ['calm', 'bold', 'classic', 'fresh'];
const LAYOUT_KEYS = ['split', 'story', 'full'];
const SECTION_TYPES = ['menu_bar', 'hero', 'heading', 'text', 'buttons', 'picture', 'round_photo', 'cards', 'gallery', 'video', 'map',
  'contact_form', 'price_list', 'booking', 'hours', 'contact', 'reviews', 'row'];
const BLOCK_TYPES = SECTION_TYPES.filter((t) => t !== 'menu_bar' && t !== 'hero' && t !== 'row');
const FIELDS = ['name', 'email', 'phone', 'message', 'date', 'party_size'];
const SHOW = ['phone', 'email', 'address', 'social'];

export const MOODS = {
  calm: { label: 'Calm', bg: '#EEF1EC', surface: '#E1E8DF', text: '#22332B', muted: '#5D6B63', btn: '#2F4A3E', btnText: '#FFFFFF', accent: '#8FAF96', type: 'serif headings, soft corners', dots: ['#EEF1EC', '#2F4A3E', '#8FAF96'] },
  bold: { label: 'Bold', bg: '#121212', surface: '#1D1D1D', text: '#FAFAF7', muted: '#A9A9A4', btn: '#FF5A36', btnText: '#121212', accent: '#FF5A36', type: 'heavy capitals, sharp corners', dots: ['#121212', '#FF5A36', '#FAFAF7'] },
  classic: { label: 'Classic', bg: '#F6EFE6', surface: '#ECE1D2', text: '#2B1A1E', muted: '#6E5A5E', btn: '#5A1E2C', btnText: '#F6EFE6', accent: '#B08D57', type: 'italic serif, fine rules', dots: ['#F6EFE6', '#5A1E2C', '#B08D57'] },
  fresh: { label: 'Fresh', bg: '#FFFFFF', surface: '#EAF4F6', text: '#0F2A44', muted: '#557086', btn: '#12355B', btnText: '#FFFFFF', accent: '#3FB6A8', type: 'clean sans, rounded', dots: ['#FFFFFF', '#12355B', '#3FB6A8'] }
};

export const LAYOUTS = {
  split: { label: 'Side by side' },
  story: { label: 'Centred story' },
  full: { label: 'Full-bleed photo' }
};

// The made-up businesses (the same ones as the concept sites and the AI demo; facts match assets/studio/aiassist.js).
export const BUSINESSES = {
  clinic: {
    label: 'Clinic', name: 'Linden Clinic', what: 'private GP clinic', area: 'Notting Hill', mood: 'calm', layout: 'split',
    h1: 'A GP appointment this week, in Notting Hill.', sub: 'Unhurried appointments with experienced GPs, in clinic or by video.',
    cta: 'Book an appointment', short: 'Book', link: 'Our services', links: ['Services', 'Our GPs', 'Visit', 'Contact'],
    services: [['GP appointments', 'Thirty minutes, never rushed.'], ['Health checks', 'Bloods, results and a plan.'], ['Video appointments', 'See a GP from home.']],
    strip: 'Same-week appointments, six days a week.', booking: 'appointment',
    prices: [['GP appointment', '£95', '30 minutes'], ['Video appointment', '£75', ''], ['Health check', 'from £245', '']],
    hours: [['Monday to Friday', '8am to 7pm'], ['Saturday', '9am to 1pm'], ['Sunday', 'Closed']]
  },
  cafe: {
    label: 'Café', name: 'Morrow Coffee', what: 'coffee and bakery', area: 'Hackney', mood: 'calm', layout: 'split',
    h1: 'Slow mornings, very good coffee.', sub: 'Single-origin espresso, bread baked at dawn and a long table by the window.',
    cta: 'See the menu', short: 'Order ahead', link: 'Find us', links: ['Menu', 'Visit', 'About'],
    services: [['Coffee', 'Single-origin espresso and filter.'], ['Bakery', 'Bread and buns baked at dawn.'], ['Lunch', 'Sourdough toast and something warm.']],
    strip: 'Dogs welcome, and a bench outside.', booking: 'collection',
    prices: [['Flat white', '£3.40', 'Oat, almond or soy at no extra cost'], ['Cardamom bun', '£3.20', ''], ['Pastries', 'from £2.80', ''], ['Sourdough toast', '£4.50', '']],
    hours: [['Monday to Friday', '7.30am to 4pm'], ['Saturday and Sunday', '8.30am to 4pm']]
  },
  salon: {
    label: 'Salon', name: 'Atelier Wren', what: 'hair studio', area: 'Marylebone', mood: 'classic', layout: 'story',
    h1: 'Hair, cut and coloured with care.', sub: 'A quiet, four-chair studio for precise cuts and colour that grows out beautifully.',
    cta: 'Book a chair', short: 'Book', link: 'See prices', links: ['Services', 'Stylists', 'Prices', 'Gift cards'],
    services: [['Cut and finish', 'Shaped to how you live.'], ['Colour', 'Balayage, gloss and grey blending.'], ['Blow-dry', 'For an evening out, or just because.']],
    strip: 'Late appointments on Thursdays.', booking: 'appointment',
    prices: [['Cut and finish', 'from £58', ''], ['Full colour', 'from £85', 'Patch test 48 hours before'], ['Blow-dry', '£35', '']],
    hours: [['Tuesday, Wednesday and Friday', '9am to 6pm'], ['Thursday', '9am to 8pm'], ['Saturday', '9am to 5pm'], ['Sunday and Monday', 'Closed']]
  },
  trades: {
    label: 'Trades', name: 'Hart & Sons Plumbing', what: 'plumbing and heating firm', area: 'West London', mood: 'fresh', layout: 'split',
    h1: 'Plumbing and heating across west London.', sub: 'Boiler services, repairs and emergency call-outs, from Paddington out to Ealing.',
    cta: 'Book a visit', short: 'Book', link: 'See prices', links: ['Services', 'Prices', 'Areas', 'Contact'],
    services: [['Boiler service', 'Once a year, at a time that suits you.'], ['Repairs', 'Leaks, taps, radiators and pipes.'], ['Emergencies', 'Call-outs on Sundays too.']],
    strip: 'A quote visit is free.', booking: 'visit',
    prices: [['Boiler service', '£95', ''], ['Emergency call-out', '£120', 'Then £60 an hour'], ['Quote visit', 'Free', '']],
    hours: [['Monday to Saturday', '8am to 6pm'], ['Sunday', 'Emergency call-outs only']]
  },
  restaurant: {
    label: 'Restaurant', name: 'Saltmarsh', what: 'seasonal restaurant', area: 'Bermondsey', mood: 'bold', layout: 'full',
    h1: 'Seasonal cooking in a small Bermondsey dining room.', sub: 'A short menu that changes with the coast and the market, and a wine list worth lingering over.',
    cta: 'Reserve a table', short: 'Reserve', link: 'See the menu', links: ['Menu', 'Wine', 'Private dining', 'Find us'],
    services: [['Dinner', 'Tuesday to Saturday.'], ['Sunday lunch', 'Long, slow and shared.'], ['Private dining', 'The back room seats twelve.']],
    strip: 'Walk-ins welcome at the bar.', booking: 'table',
    prices: [], hours: [['Tuesday to Saturday', 'Dinner'], ['Sunday', 'Lunch']]
  },
  boutique: {
    label: 'Boutique', name: 'Hollis & Pine', what: 'clothing and ceramics shop', area: 'Islington', mood: 'fresh', layout: 'story',
    h1: 'Clothing and ceramics from small makers.', sub: 'Natural-fibre clothing and hand-thrown ceramics from small makers we know by name.',
    cta: 'Visit the shop', short: 'Shop', link: 'New in', links: ['New in', 'Clothing', 'Homeware', 'Journal'],
    services: [['New in', 'Arrivals every Friday.'], ['Clothing', 'Linen, wool and cotton.'], ['Homeware', 'Ceramics, glass and textiles.']],
    strip: 'Free delivery across London.', booking: 'collection', prices: [], hours: []
  },
  other: {
    label: 'Other', name: 'Your business', what: '', area: 'London', mood: 'calm', layout: 'split',
    h1: 'Everything about your business, in one place.', sub: 'What you do, where to find you and how to get in touch.',
    cta: 'Get in touch', short: 'Contact', link: 'Our services', links: ['Services', 'About', 'Contact'],
    services: [['What we do', 'A few words about your work.'], ['How it works', 'From the first call to the finished job.'], ['Where to find us', 'Your area and your opening times.']],
    strip: 'Tell your customers what to do next.', booking: 'appointment', prices: [], hours: []
  }
};

// Kinds of business Describe recognises: words -> the closest Pick business, with lines that fit it.
const TRADES_WORDS = [
  // [pattern, kind, what, sub, services]
  [/\bbaker(y|ies)\b|\bpatisserie\b|\bcake shop\b/, 'cafe', 'Bakery', 'Bread, pastries and cakes, baked every morning.', [['Bread', 'Loaves and rolls, made by hand.'], ['Pastries', 'Sweet and savoury, from the oven.'], ['Cakes', 'Whole cakes to order.']]],
  [/\bcoffee ?(shop|house|bar|roasters?)\b|\bcaf[eé]s?\b|\bcoffee\b|\btea ?rooms?\b/, 'cafe', 'Café', '', null],
  [/\bdeli(catessen)?\b|\bgrocer/, 'cafe', 'Deli', 'Good things to eat, to take home or to eat here.', [['On the counter', 'Fresh every day.'], ['Pantry', 'Oils, jars and dry goods.'], ['Lunch', 'Sandwiches and salads to go.']]],
  [/\brestaurants?\b|\bbistro\b|\bpizz(a|eria)\b|\bdining\b|\bkitchen\b|\bbrasserie\b|\btrattoria\b|\btakeaway\b/, 'restaurant', 'Restaurant', 'Good food, a warm room and a table waiting.', [['Lunch', 'Short and seasonal.'], ['Dinner', 'The full menu.'], ['Private dining', 'For larger tables.']]],
  [/\bpubs?\b|\bwine bar\b|\bcocktail bar\b|\bbar\b/, 'restaurant', 'Bar', 'Drinks, small plates and a room to linger in.', [['Drinks', 'A short, changing list.'], ['Food', 'Small plates until late.'], ['Events', 'Book the room for a party.']]],
  [/\bdentists?\b|\bdental\b|\bclinic\b|\bgp\b|\bdoctors?\b|\bphysio(therapy|therapist)?\b|\bosteopath|\bchiropract|\btherap(y|ist)\b|\bvets?\b|\bveterinary\b|\boptician/, 'clinic', 'Clinic', 'Appointments that run on time, with people who listen.', [['Appointments', 'Book online in a minute.'], ['Treatments', 'Explained clearly, before you start.'], ['Follow-ups', 'In person or by video.']]],
  [/\bsalons?\b|\bhair(dresser|dressers|dressing)?\b|\bbarbers?\b|\bbarbershop\b|\bnails?\b|\bbeauty\b|\bspa\b|\blashes\b|\bbrows?\b|\bmassage\b/, 'salon', 'Salon', 'Book a chair, sit back and leave looking like yourself.', [['Cuts', 'Shaped to how you live.'], ['Colour', 'Subtle or striking.'], ['Treatments', 'Time to look after yourself.']]],
  [/\bplumb(er|ers|ing)\b|\bheating\b|\bboilers?\b|\belectrician|\belectrical\b|\bbuilders?\b|\broofer|\broofing\b|\bdecorat(or|ors|ing)\b|\bcarpent(er|ry)\b|\blocksmith|\bcleaners?\b|\bcleaning\b|\bgardeners?\b|\blandscap|\bhandyman\b|\bair[- ]condition(ing|er)?\b|\btrades?(man|people)?\b/, 'trades', 'Trades', 'Reliable work, clear prices and a tidy finish.', [['Repairs', 'Booked in quickly.'], ['Installations', 'Planned, fitted and tidied up.'], ['Free quotes', 'We come and take a look.']]],
  [/\bboutiques?\b|\bshops?\b|\bstores?\b|\bclothing\b|\bfashion\b|\bceramics?\b|\bflorists?\b|\bflowers?\b|\bgifts?\b|\bjeweller(y|s)?\b|\bjewelry\b|\bbookshop\b|\bbooks\b|\bhomeware\b|\bvintage shop\b/, 'boutique', 'Shop', 'Things chosen with care, in the shop and online.', [['New in', 'The latest arrivals.'], ['Bestsellers', 'What people come back for.'], ['Gifts', 'Wrapped and ready to give.']]],
  [/\byoga\b|\bpilates\b|\bgym\b|\bfitness\b|\bpersonal trainer\b|\bdance\b|\bmartial arts\b/, 'other', 'Studio', 'Classes for every level, in a room that feels good to be in.', [['Classes', 'Book a place online.'], ['Private sessions', 'One to one, at your pace.'], ['First visit', 'What to bring and what to expect.']]],
  [/\bphotograph(er|y)\b|\bdesigners?\b|\barchitects?\b|\baccountants?\b|\blawyers?\b|\bsolicitors?\b|\bconsultan(t|cy)\b|\btutors?\b|\btutoring\b|\bcoach(ing)?\b|\bagency\b/, 'other', '', 'What we do, who it’s for and how to get started.', [['Services', 'What we can help with.'], ['How we work', 'From the first call to the finished job.'], ['Get in touch', 'A short call to start.']]]
];
const NOUN_FIX = { coffee: 'café', cafe: 'café', hair: 'hair salon', gp: 'GP practice', dental: 'dental practice', beauty: 'beauty salon', nail: 'nail salon', nails: 'nail salon', heating: 'heating engineer', cleaning: 'cleaning company', fitness: 'fitness studio', dining: 'restaurant', yoga: 'yoga studio', pilates: 'pilates studio', dance: 'dance studio', gym: 'gym', massage: 'massage therapist', 'air conditioning': 'air conditioning installer', 'air condition': 'air conditioning installer', photography: 'photographer', tutoring: 'tutor', coaching: 'coach', flowers: 'florist', flower: 'florist', gifts: 'gift shop', gift: 'gift shop', books: 'bookshop', clothing: 'clothing shop', fashion: 'fashion boutique', ceramics: 'ceramics shop', jewellery: 'jeweller', jewelry: 'jeweller', homeware: 'homeware shop', plumbing: 'plumber', electrical: 'electrician', roofing: 'roofer', decorating: 'decorator', landscap: 'landscaper', physio: 'physiotherapist', therapy: 'therapist', veterinary: 'vet', brows: 'brow studio', brow: 'brow studio', lashes: 'lash studio', boilers: 'boiler engineer', boiler: 'boiler engineer', takeaway: 'takeaway', trades: 'tradesperson', trade: 'tradesperson' };
const DESCRIPTORS = /^(independent|family|family-run|vegan|vegetarian|organic|specialty|speciality|small|local|mobile|artisan|craft|private|neighbourhood|neighborhood|seasonal|plant-based|halal|kosher|luxury|boutique|dog-friendly|little|tiny|new)$/i;
const MOOD_WORDS = {
  calm: [[/\bcalm|quiet|soft|gentle|natural|relax|peace|serene|earthy|green|sage|muted|tranquil|zen\b/, 1], [/\bminimal|simple|warm|light\b/, 0.6]],
  bold: [[/\bbold|loud|vibrant|edgy|striking|punchy|energetic|urban|dark|black|confident|strong|fun|playful|dramatic|street\b/, 1], [/\bmodern|bright|contemporary\b/, 0.7]],
  classic: [[/\bclassic|elegant|traditional|timeless|luxur|refined|warm|cos[yi]|heritage|vintage|rustic|romantic|sophisticat|premium|old[- ]fashioned|old-world|homely|homey\b/, 1]],
  fresh: [[/\bfresh|modern|clean|airy|friendly|crisp|young|contemporary|sleek|blue|professional|light\b/, 1], [/\bbright|simple|minimal\b/, 0.5]]
};
const LAYOUT_WORDS = {
  full: /\bfull[- ]?(bleed|width|screen)|big (photo|picture|image)|large (photo|picture|image)|photo[- ]led|image[- ]led|immersive|cinematic|hero photo\b/,
  story: /\bcent(red|ered|re)|story|one column|single column|editorial|magazine|minimal\b/,
  split: /\bside[- ]by[- ]side|split|two columns?\b/
};
const SECTION_WORDS = [
  ['hours', /\b(opening )?hours\b|opening times|when (we're|we are|you're|you are) open|times we open/],
  ['map', /\bmaps?\b|find us|directions|location|where (we are|to find)/],
  ['menu', /\bmenus?\b/],
  ['prices', /\bprices?\b|price ?list|pricing|tariffs?|rates\b|how much/],
  ['booking', /\bbook(ing|ings|s)?\b|reserv|appointments?|\bslots?\b/],
  ['gallery', /\bgallery|photos|pictures|portfolio|our work|instagram/],
  ['reviews', /\breviews?|testimonials?/],
  ['contact_form', /contact form|enquir|inquir|\bform\b/],
  ['contact', /\bcontact\b|phone|e-?mail|address|get in touch/],
  ['video', /\bvideos?\b|\bfilm\b/],
  ['round_photo', /\bteam\b|about (me|us)|\bowner\b|founder|meet (me|us|the)/]
];
const TITLES = ['What we offer', 'Why come to us', 'Come and say hello', 'How it works'];

/* ---------------------------------------------------------------- cleaning ---------------------------------------------------------------- */

const CTRL = /[\u0000-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF]/g;
const EMAIL_RE = /[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+/g;
const URL_RE = /\b(?:(?:https?|ftp|file|javascript|data|mailto|tel):\/*|www\.)[^\s]*/gi;
const DOMAIN_RE = /\b(?:[a-z0-9](?:[a-z0-9-]{0,40}[a-z0-9])?\.)+(?:com|net|org|io|co|uk|app|dev|shop|store|info|biz|me|ai|xyz|london|online|site|website|example|tech|eu|us|de|fr|ly|gg|tv|page|link)\b(?:\/[^\s]*)?/gi;
const PHONE_RE = /\+?\(?\d[\d\s().\-–]{5,}\d/g;

function digitCount(s) { let n = 0; for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) >= 48 && s.charCodeAt(i) <= 57) n++; return n; }

function cutAt(s, cap) {
  if (s.length <= cap) return s;
  let t = s.slice(0, cap);
  if (s.charAt(cap) !== ' ') { const i = t.lastIndexOf(' '); if (i > cap * 0.5) t = t.slice(0, i); }
  return t.replace(/[\s,;:–—\-(&/]+$/, '');
}

// Clean one string from a spec. P collects what was changed (plain sentences, for the page's log or tests).
function clean(v, cap, path, P) {
  if (v == null) return '';
  if (typeof v === 'number' && isFinite(v)) v = String(v);
  if (typeof v !== 'string') { P.push(path + ' was not text, so it was left out'); return ''; }
  let s = v.length > cap * 8 + 400 ? v.slice(0, cap * 8 + 400) : v;
  const removed = [];
  s = s.replace(CTRL, ' ');
  if (/[<>]/.test(s)) { s = s.replace(/[<>]/g, ''); removed.push('< and >'); }
  s = s.replace(EMAIL_RE, () => { removed.push('an email address'); return ' '; });
  s = s.replace(URL_RE, () => { removed.push('a web address'); return ' '; });
  s = s.replace(DOMAIN_RE, () => { removed.push('a web address'); return ' '; });
  s = s.replace(PHONE_RE, (m) => { if (digitCount(m) >= 7) { removed.push('a phone number'); return ' '; } return m; });
  s = s.replace(/\s+/g, ' ').trim().replace(/^[,;:.\-–—]\s*/, '').replace(/\s+([,.;:!?])/g, '$1');
  if (removed.length) P.push(path + ': removed ' + Array.from(new Set(removed)).join(', '));
  if (s.length > cap) { s = cutAt(s, cap); P.push(path + ' was cut to ' + cap + ' characters'); }
  return s;
}
function oneOf(v, list, def, path, P) {
  if (list.indexOf(v) >= 0) return v;
  if (v !== undefined && v !== null && v !== '') P.push(path + ' "' + String(v).slice(0, 20).replace(/[<>]/g, '') + '" is not one of ' + list.join(', ') + ', so ' + def + ' was used');
  return def;
}
function list(v, max, path, P) {
  if (!Array.isArray(v)) { if (v != null) P.push(path + ' was not a list'); return []; }
  if (v.length > max) { P.push(path + ': kept the first ' + max + ' of ' + v.length); return v.slice(0, max); }
  return v;
}
function obj(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }

// One cleaner per section type. Each returns the cleaned section, or null when it fails its rules.
const CLEAN = {
  menu_bar(s, p, P) {
    const links = list(s.links, 5, p + '.links', P).map((l, i) => clean(l, 18, p + '.links[' + i + ']', P)).filter(Boolean);
    return { type: 'menu_bar', logo: oneOf(s.logo, ['mark', 'none'], 'mark', p + '.logo', P), links, button: clean(s.button, 20, p + '.button', P) };
  },
  hero(s, p, P) {
    const heading = clean(s.heading, 70, p + '.heading', P);
    if (!heading) { P.push(p + ' had no heading, so it was dropped'); return null; }
    return { type: 'hero', variant: oneOf(s.variant, ['split', 'story', 'full', 'text'], 'split', p + '.variant', P), heading,
      text: clean(s.text, 200, p + '.text', P), button: clean(s.button, 24, p + '.button', P), link: clean(s.link, 24, p + '.link', P),
      picture: oneOf(s.picture, ['photo', 'drawing', 'none'], 'photo', p + '.picture', P) };
  },
  heading(s, p, P) {
    const text = clean(s.text, 70, p + '.text', P);
    if (!text) { P.push(p + ' was empty, so it was dropped'); return null; }
    return { type: 'heading', text, size: oneOf(s.size, ['large', 'medium'], 'medium', p + '.size', P), align: oneOf(s.align, ['left', 'centre'], 'left', p + '.align', P) };
  },
  text(s, p, P) {
    const text = clean(s.text, 400, p + '.text', P);
    if (!text) { P.push(p + ' was empty, so it was dropped'); return null; }
    return { type: 'text', text, align: oneOf(s.align, ['left', 'centre'], 'left', p + '.align', P) };
  },
  buttons(s, p, P) {
    const buttons = list(s.buttons, 3, p + '.buttons', P).map((b, i) => {
      const o = obj(b), label = clean(o.label, 24, p + '.buttons[' + i + '].label', P);
      return label ? { label, style: oneOf(o.style, ['solid', 'outline'], i ? 'outline' : 'solid', p + '.buttons[' + i + '].style', P) } : null;
    }).filter(Boolean);
    if (!buttons.length) { P.push(p + ' had no buttons with words, so it was dropped'); return null; }
    return { type: 'buttons', buttons, align: oneOf(s.align, ['left', 'centre'], 'left', p + '.align', P) };
  },
  picture(s, p, P) {
    return { type: 'picture', picture: oneOf(s.picture, ['photo', 'drawing'], 'photo', p + '.picture', P), width: oneOf(s.width, ['full', 'wide', 'half'], 'wide', p + '.width', P), caption: clean(s.caption, 80, p + '.caption', P) };
  },
  round_photo(s, p, P) { return { type: 'round_photo', caption: clean(s.caption, 60, p + '.caption', P) }; },
  cards(s, p, P) {
    const cards = list(s.cards, 4, p + '.cards', P).map((c, i) => {
      const o = obj(c), title = clean(o.title, 40, p + '.cards[' + i + '].title', P), text = clean(o.text, 120, p + '.cards[' + i + '].text', P);
      return title || text ? { title, text } : null;
    }).filter(Boolean);
    if (!cards.length) { P.push(p + ' had no cards with words, so it was dropped'); return null; }
    return { type: 'cards', cards, style: oneOf(s.style, ['plain', 'boxed'], 'boxed', p + '.style', P) };
  },
  gallery(s, p, P) {
    let count = typeof s.count === 'string' ? parseInt(s.count, 10) : s.count;
    if ([3, 4, 6].indexOf(count) < 0) {
      const n = typeof count === 'number' && isFinite(count) ? count : 4, to = n <= 3 ? 3 : n <= 4 ? 4 : 6;
      if (s.count != null) P.push(p + '.count ' + String(s.count).slice(0, 8).replace(/[<>]/g, '') + ' became ' + to);
      count = to;
    }
    return { type: 'gallery', count, caption: clean(s.caption, 80, p + '.caption', P) };
  },
  video(s, p, P) { return { type: 'video', caption: clean(s.caption, 80, p + '.caption', P) }; },
  map(s, p, P) { return { type: 'map', label: clean(s.label, 80, p + '.label', P) }; },
  contact_form(s, p, P) {
    const seen = new Set();
    list(s.fields, 12, p + '.fields', P).forEach((f) => { if (FIELDS.indexOf(f) >= 0) seen.add(f); else P.push(p + '.fields: dropped an unknown field'); });
    const fields = Array.from(seen).slice(0, 6);
    if (!fields.length) { P.push(p + ' had no fields, so it was dropped'); return null; }
    return { type: 'contact_form', heading: clean(s.heading, 60, p + '.heading', P), fields, button: clean(s.button, 24, p + '.button', P) };
  },
  price_list(s, p, P) {
    const items = list(s.items, 12, p + '.items', P).map((it, i) => {
      const o = obj(it), q = p + '.items[' + i + ']', name = clean(o.name, 40, q + '.name', P);
      return name ? { name, price: clean(o.price, 16, q + '.price', P), note: clean(o.note, 60, q + '.note', P) } : null;
    }).filter(Boolean);
    if (!items.length) { P.push(p + ' had no items, so it was dropped'); return null; }
    return { type: 'price_list', variant: oneOf(s.variant, ['menu', 'prices'], 'prices', p + '.variant', P), heading: clean(s.heading, 60, p + '.heading', P), items };
  },
  booking(s, p, P) {
    return { type: 'booking', kind: oneOf(s.kind, ['table', 'appointment', 'visit', 'class', 'collection'], 'appointment', p + '.kind', P),
      heading: clean(s.heading, 60, p + '.heading', P), button: clean(s.button, 24, p + '.button', P) };
  },
  hours(s, p, P) {
    const rows = list(s.rows, 7, p + '.rows', P).map((r, i) => { const o = obj(r); return { days: clean(o.days, 30, p + '.rows[' + i + '].days', P), hours: clean(o.hours, 30, p + '.rows[' + i + '].hours', P) }; });
    if (!rows.length) { P.push(p + ' had no rows, so it was dropped'); return null; }
    return { type: 'hours', heading: clean(s.heading, 60, p + '.heading', P), rows };
  },
  contact(s, p, P) {
    const seen = new Set();
    list(s.show, 8, p + '.show', P).forEach((f) => { if (SHOW.indexOf(f) >= 0) seen.add(f); else P.push(p + '.show: dropped an unknown item'); });
    const show = Array.from(seen);
    if (!show.length) { P.push(p + ' had nothing to show, so it was dropped'); return null; }
    return { type: 'contact', heading: clean(s.heading, 60, p + '.heading', P), show };
  },
  reviews(s, p, P) { return { type: 'reviews', heading: clean(s.heading, 60, p + '.heading', P) }; },
  row(s, p, P) {
    const cols = list(s.columns, 3, p + '.columns', P).map((c, i) => {
      const o = obj(c), q = p + '.columns[' + i + ']';
      let span = typeof o.span === 'string' ? parseInt(o.span, 10) : o.span;
      if (!(typeof span === 'number' && isFinite(span))) span = 6;
      span = Math.round(span);
      if (span < 3 || span > 9) { P.push(q + '.span ' + span + ' was kept between 3 and 9'); span = Math.max(3, Math.min(9, span)); }
      const blocks = list(o.blocks, 4, q + '.blocks', P).map((b, j) => cleanSection(b, q + '.blocks[' + j + ']', P, true)).filter(Boolean);
      return blocks.length ? { span, blocks } : null;
    }).filter(Boolean);
    let sum = cols.reduce((a, c) => a + c.span, 0);
    if (sum > 12) {
      P.push(p + ': the column spans added up to ' + sum + ', so they were narrowed to fit 12');
      while (sum > 12) { const big = cols.reduce((m, c) => (c.span > m.span ? c : m), cols[0]); if (big.span <= 3) break; big.span--; sum--; }
    }
    if (cols.length < 2) { P.push(p + ' had fewer than two columns, so its blocks were put on the page in order'); return cols.length ? { unwrap: cols[0].blocks } : null; }
    return { type: 'row', columns: cols };
  }
};

function cleanSection(raw, path, P, asBlock) {
  const s = obj(raw), type = s.type;
  if (typeof type !== 'string' || !Object.prototype.hasOwnProperty.call(CLEAN, type)) { P.push(path + ': unknown type "' + String(type).slice(0, 20).replace(/[<>]/g, '') + '" was dropped'); return null; }
  if (asBlock && BLOCK_TYPES.indexOf(type) < 0) { P.push(path + ': a ' + type + ' can’t sit inside a row, so it was dropped'); return null; }
  return CLEAN[type](s, path, P);
}

export function validate(input) {
  const P = [], src = obj(input);
  let ok = true;
  if (!input || typeof input !== 'object' || Array.isArray(input)) { P.push('The spec was not an object'); ok = false; }
  if (src.version !== 1 && input && typeof input === 'object') P.push('version was set to 1');
  const b = obj(src.business);
  const kind = oneOf(b.kind, KINDS, 'other', 'business.kind', P);
  const business = { kind, name: clean(b.name, 40, 'business.name', P), what: clean(b.what, 60, 'business.what', P), area: clean(b.area, 40, 'business.area', P) };
  const mood = oneOf(src.mood, MOOD_KEYS, BUSINESSES[kind].mood, 'mood', P);
  const layout = oneOf(src.layout, LAYOUT_KEYS, BUSINESSES[kind].layout, 'layout', P);
  const photo = oneOf(src.photo, PHOTO_KINDS.concat('none'), PHOTO_KINDS.indexOf(kind) >= 0 ? kind : 'none', 'photo', P);

  let raw = Array.isArray(src.sections) ? src.sections : [];
  if (!Array.isArray(src.sections) && src.sections != null) P.push('sections was not a list');
  if (raw.length > 40) { P.push('Only the first 40 sections were read'); raw = raw.slice(0, 40); }
  let out = [];
  raw.forEach((r, i) => {
    const c = cleanSection(r, 'sections[' + i + ']', P, false);
    if (!c) return;
    if (c.unwrap) out = out.concat(c.unwrap); else out.push(c);
  });
  const bars = out.filter((s) => s.type === 'menu_bar'), heroes = out.filter((s) => s.type === 'hero');
  if (bars.length > 1) P.push('Only one menu bar is allowed, so ' + (bars.length - 1) + ' more were dropped');
  if (heroes.length > 1) P.push('Only one hero is allowed, so ' + (heroes.length - 1) + ' more were dropped');
  const rest = out.filter((s) => s.type !== 'menu_bar' && s.type !== 'hero');
  const ordered = [].concat(bars.slice(0, 1), heroes.slice(0, 1), rest);
  if ((bars.length && out.indexOf(bars[0]) !== 0) || (heroes.length && out.indexOf(heroes[0]) !== (bars.length ? 1 : 0))) P.push('The menu bar and the hero were moved to the top');
  let sections = ordered;
  if (sections.length > 12) { P.push('Only 12 sections are allowed, so ' + (sections.length - 12) + ' were dropped'); sections = sections.slice(0, 12); }

  if (!sections.length) {
    P.push('Nothing usable was left, so the standard ' + BUSINESSES[kind].label.toLowerCase() + ' design was used');
    const fb = buildPick({ business: kind, mood, layout, name: business.name });
    if (business.what) fb.business.what = business.what;
    if (business.area) fb.business.area = business.area;
    return { ok: false, spec: fb, problems: P };
  }
  return { ok, spec: { version: 1, business, mood, layout, photo, sections }, problems: P };
}

/* ---------------------------------------------------------------- builders ---------------------------------------------------------------- */

function isDefaultName(kind, name) { return !name || name === BUSINESSES[kind].name; }
function cap1(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function priceSection(kind, variant, honest) {
  const B = BUSINESSES[kind];
  const items = (B.prices.length ? B.prices : B.services.map((s) => [s[0], '', ''])).map((r) => ({ name: r[0], price: honest ? '' : r[1], note: r[2] || '' }));
  return { type: 'price_list', variant, heading: variant === 'menu' ? 'On the menu' : 'Prices', items };
}
function hoursSection(kind, honest) {
  const B = BUSINESSES[kind];
  const rows = !honest && B.hours.length ? B.hours.map((r) => ({ days: r[0], hours: r[1] })) : [{ days: '', hours: '' }];
  return { type: 'hours', heading: 'Opening hours', rows };
}
const BOOKING_LINES = { table: ['Book a table', 'Find a table'], appointment: ['Book an appointment', 'Choose a time'], visit: ['Book a visit', 'Choose a day'], class: ['Book a class', 'Choose a class'], collection: ['Order ahead', 'Choose a time'] };
function bookingSection(kind) { const k = BUSINESSES[kind].booking; return { type: 'booking', kind: k, heading: BOOKING_LINES[k][0], button: BOOKING_LINES[k][1] }; }

function buildPick(pick) {
  const p = obj(pick);
  const kind = KINDS.indexOf(p.business) >= 0 ? p.business : 'cafe';
  const B = BUSINESSES[kind];
  const mood = MOOD_KEYS.indexOf(p.mood) >= 0 ? p.mood : B.mood;
  const layout = LAYOUT_KEYS.indexOf(p.layout) >= 0 ? p.layout : B.layout;
  const name = typeof p.name === 'string' ? p.name.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
  const own = !isDefaultName(kind, name);          // a visitor's own name: never show the made-up business's prices or hours as theirs
  const hasPhoto = PHOTO_KINDS.indexOf(kind) >= 0 && kind !== 'trades';
  const S = [
    { type: 'menu_bar', logo: 'mark', links: B.links.slice(0, 4), button: B.short },
    { type: 'hero', variant: layout, heading: B.h1, text: B.sub, button: B.cta, link: B.link, picture: hasPhoto ? 'photo' : 'drawing' },
    { type: 'cards', cards: B.services.map((s) => ({ title: s[0], text: s[1] })), style: mood === 'calm' || mood === 'fresh' ? 'boxed' : 'plain' }
  ];
  if (kind === 'cafe') S.push(priceSection(kind, 'menu', own), hoursSection(kind, own), { type: 'map', label: own ? '' : 'Elm Row, Hackney' });
  if (kind === 'clinic') S.push(bookingSection(kind), hoursSection(kind, own), { type: 'contact', heading: 'Visit the clinic', show: ['phone', 'email', 'address'] });
  if (kind === 'salon') S.push(priceSection(kind, 'prices', own), bookingSection(kind), { type: 'round_photo', caption: own ? '' : 'Four chairs, and time for each of them.' });
  if (kind === 'trades') S.push(priceSection(kind, 'prices', own), bookingSection(kind), hoursSection(kind, own));
  if (kind === 'restaurant') S.push({ type: 'gallery', count: 3, caption: '' }, bookingSection(kind), hoursSection(kind, own));
  if (kind === 'boutique') S.push({ type: 'gallery', count: 6, caption: own ? '' : 'New in on Fridays.' }, { type: 'contact', heading: 'Visit the shop', show: ['address', 'email', 'social'] });
  if (kind === 'other') S.push({ type: 'contact_form', heading: 'Get in touch', fields: ['name', 'email', 'message'], button: 'Send' });
  S.push({ type: 'heading', text: B.strip, size: 'large', align: 'centre' }, { type: 'buttons', buttons: [{ label: B.cta, style: 'solid' }], align: 'centre' });
  return { version: 1, business: { kind, name, what: B.what, area: B.area }, mood, layout, photo: hasPhoto ? kind : (kind === 'trades' ? 'trades' : 'none'), sections: S };
}

export function fromPick(pick) { return validate(buildPick(pick)).spec; }

/* Sketch: Draw your site's blocks (dr.blocks(): header, logo, heading, text, button, image, card, gallery, map, form) and its
   AI or pen elements (adds nav, para, avatar, video, reviews). x, y, w, h are fractions of the paper. */
const SKETCH_KINDS = ['header', 'logo', 'nav', 'heading', 'text', 'para', 'button', 'image', 'card', 'avatar', 'map', 'form', 'gallery', 'video', 'reviews'];

export function fromSketch(blocks, style) {
  const st = obj(style);
  const kind = KINDS.indexOf(st.business) >= 0 ? st.business : 'cafe';
  const B = BUSINESSES[kind];
  const mood = MOOD_KEYS.indexOf(st.mood) >= 0 ? st.mood : B.mood;
  const name = typeof st.name === 'string' ? st.name.trim().slice(0, 40) : '';
  const own = !isDefaultName(kind, name);
  const hasPhoto = PHOTO_KINDS.indexOf(kind) >= 0 && kind !== 'trades';
  const num = (v) => (typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(1, v)) : null);
  let items = (Array.isArray(blocks) ? blocks.slice(0, 120) : []).map((raw) => {
    const o = obj(raw), x = num(o.x), y = num(o.y), w = num(o.w), h = num(o.h);
    if (SKETCH_KINDS.indexOf(o.kind) < 0 || x == null || y == null || !w || !h) return null;
    return { kind: o.kind, x, y, w: Math.min(w, 1 - x) || w, h: Math.min(h, 1 - y) || h, text: typeof o.text === 'string' ? o.text.replace(/\s+/g, ' ').trim().slice(0, 600) : '' };
  }).filter(Boolean);
  items.sort((a, b) => (Math.abs(a.y - b.y) < 0.02 ? a.x - b.x : a.y - b.y));

  const within = (a, b) => { const cx = a.x + a.w / 2, cy = a.y + a.h / 2; return cx >= b.x - 0.02 && cx <= b.x + b.w + 0.02 && cy >= b.y - 0.02 && cy <= b.y + b.h + 0.02; };
  const sections = [];
  // the menu bar: a header block, and the logo, links and button inside it (or links and a logo near the top with no header)
  const header = items.filter((e) => e.kind === 'header')[0];
  let bar = null;
  const navs = [];
  if (header) {
    bar = { type: 'menu_bar', logo: 'none', links: [], button: '' };
    items = items.filter((e) => {
      if (e.kind === 'header') return false;                       // extra menu bars are folded into the first
      if (!within(e, header)) return true;
      if (e.kind === 'logo' || e.kind === 'avatar') { bar.logo = 'mark'; return false; }
      if (e.kind === 'nav' || e.kind === 'text' || e.kind === 'heading') { navs.push(e); return false; }
      if (e.kind === 'button') { bar.button = e.text || B.short; return false; }
      return true;
    });
  }
  items = items.filter((e) => { if (e.kind === 'nav') { navs.push(e); return false; } return true; });
  const topLogo = items.filter((e) => e.kind === 'logo')[0];
  if (!bar && (navs.length || (topLogo && topLogo.y < 0.12))) bar = { type: 'menu_bar', logo: topLogo ? 'mark' : 'none', links: [], button: '' };
  if (bar) {
    navs.sort((a, b) => a.x - b.x);
    let li = 0;
    bar.links = navs.slice(0, 5).map((n) => n.text || B.links[li++ % B.links.length]);
    if (!navs.length) bar.links = B.links.slice(0, 3);
    if (topLogo || items.some((e) => e.kind === 'logo')) bar.logo = 'mark';
    sections.push(bar);
  }
  items = items.filter((e) => e.kind !== 'logo');                 // a logo only ever marks the menu bar

  // default words for anything the visitor didn't type
  let headCount = 0, textCount = 0, cardCount = 0, btnCount = 0;
  const sentences = [B.sub, B.strip].concat(B.services.map((s) => s[1]));
  const centred = (e) => Math.abs(e.x + e.w / 2 - 0.5) < 0.06 && e.w < 0.75;

  // merge things that sit side by side and belong together: cards into one cards block, buttons into one buttons block
  function mergeSideBySide(kind) {
    const out = [], used = new Set();
    items.forEach((e, i) => {
      if (used.has(i)) return;
      if (e.kind !== kind) { out.push(e); return; }
      const group = [e];
      items.forEach((f, j) => { if (j > i && !used.has(j) && f.kind === kind && vOverlap(e, f) >= 0.4) { group.push(f); used.add(j); } });
      group.sort((a, b) => a.x - b.x);
      const x0 = Math.min(...group.map((g) => g.x)), y0 = Math.min(...group.map((g) => g.y));
      const x1 = Math.max(...group.map((g) => g.x + g.w)), y1 = Math.max(...group.map((g) => g.y + g.h));
      out.push({ kind: kind + 's', x: x0, y: y0, w: x1 - x0, h: y1 - y0, group });
    });
    items = out;
  }
  function vOverlap(a, b) { const o = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y); return o <= 0 ? 0 : o / Math.min(a.h, b.h); }
  function hOverlap(a, b) { const o = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x); return o <= 0 ? 0 : o / Math.min(a.w, b.w); }
  mergeSideBySide('card');
  mergeSideBySide('button');

  function toBlock(e, first) {
    switch (e.kind) {
      case 'heading': {
        const typed = e.parts.map((p) => p.text).filter(Boolean).join(' ');
        const text = typed || (headCount === 0 ? B.h1 : TITLES[(headCount - 1) % TITLES.length]);
        const size = headCount === 0 || e.h > 0.09 ? 'large' : 'medium';
        headCount++;
        return { type: 'heading', text, size, align: centred(e) ? 'centre' : 'left' };
      }
      case 'text': case 'para': {
        const typed = e.parts.map((p) => p.text).filter(Boolean).join(' ');
        let text = typed;
        if (!text) {
          const lines = e.parts.reduce((n, p) => n + (p.kind === 'para' ? Math.max(2, Math.round(p.h / 0.03)) : 1), 0);
          const want = Math.max(1, Math.min(3, Math.round(lines / 2)));
          const pick = [];
          for (let k = 0; k < want; k++) pick.push(sentences[(textCount + k) % sentences.length]);
          textCount += want;
          text = pick.join(' ');
        }
        return { type: 'text', text, align: centred(e) ? 'centre' : 'left' };
      }
      case 'buttons': return { type: 'buttons', buttons: e.group.slice(0, 3).map((g, i) => ({ label: g.text || (btnCount++ === 0 ? B.cta : B.link), style: i ? 'outline' : 'solid' })), align: centred(e) ? 'centre' : 'left' };
      case 'image': return { type: 'picture', picture: hasPhoto ? 'photo' : 'drawing', width: e.w >= 0.85 ? 'full' : e.w >= 0.55 ? 'wide' : 'half', caption: '' };
      case 'cards': return { type: 'cards', cards: e.group.slice(0, 4).map((g) => { const sv = B.services[cardCount++ % B.services.length]; return { title: g.text || sv[0], text: sv[1] }; }), style: 'boxed' };
      case 'avatar': return { type: 'round_photo', caption: e.text || '' };
      case 'map': return { type: 'map', label: '' };
      case 'form': return { type: 'contact_form', heading: e.text || '', fields: ['name', 'email', 'message'], button: 'Send' };
      case 'gallery': return { type: 'gallery', count: 4, caption: '' };
      case 'video': return { type: 'video', caption: e.text || '' };
      case 'reviews': return { type: 'reviews', heading: e.text || '' };
      default: return null;
    }
  }
  // consecutive headings or text lines in one column become one heading or one text
  function joinLines(col) {
    const out = [];
    col.forEach((e) => {
      const k = e.kind === 'para' ? 'text' : e.kind, last = out[out.length - 1];
      if ((k === 'heading' || k === 'text') && last && last.kind === k && e.y - (last.y + last.h) < 0.05 && !(k === 'heading' && last.parts.some((p) => p.text) && e.text)) {
        last.parts.push(e); last.h = e.y + e.h - last.y; last.w = Math.max(last.w, e.x + e.w - last.x);
      } else out.push(Object.assign({}, e, { kind: k, parts: [e] }));
    });
    return out;
  }

  // bands: blocks whose vertical extents overlap by 40% or more of the shorter one
  const bands = [];
  items.forEach((e) => {
    const band = bands.find((bd) => bd.some((f) => vOverlap(e, f) >= 0.4));
    if (band) band.push(e); else bands.push([e]);
  });
  bands.sort((a, b) => Math.min(...a.map((e) => e.y)) - Math.min(...b.map((e) => e.y)));
  bands.forEach((band) => {
    const sorted = band.slice().sort((a, b) => a.x - b.x);
    let cols = [];
    sorted.forEach((e) => {
      const c = cols.find((col) => col.some((f) => hOverlap(e, f) >= 0.3));
      if (c) c.push(e); else cols.push([e]);
    });
    while (cols.length > 3) {                                      // more than three columns: join the two closest
      let best = 1, gap = 9;
      for (let i = 1; i < cols.length; i++) { const g = Math.min(...cols[i].map((e) => e.x)) - Math.max(...cols[i - 1].map((e) => e.x + e.w)); if (g < gap) { gap = g; best = i; } }
      cols.splice(best - 1, 2, cols[best - 1].concat(cols[best]));
    }
    cols = cols.map((c) => joinLines(c.sort((a, b) => a.y - b.y)));
    if (cols.length === 1) { cols[0].forEach((e) => { const b = toBlock(e); if (b) sections.push(b); }); return; }
    const columns = cols.map((c) => {
      const x0 = Math.min(...c.map((e) => e.x)), x1 = Math.max(...c.map((e) => e.x + e.w));
      return { span: Math.max(3, Math.min(9, Math.round((x1 - x0) * 12))), blocks: c.map((e) => toBlock(e)).filter(Boolean).slice(0, 4) };
    }).filter((c) => c.blocks.length);
    let sum = columns.reduce((a, c) => a + c.span, 0);
    while (sum > 12) { const big = columns.reduce((m, c) => (c.span > m.span ? c : m), columns[0]); if (big.span <= 3) break; big.span--; sum--; }
    if (columns.length >= 2) sections.push({ type: 'row', columns });
    else if (columns.length === 1) columns[0].blocks.forEach((b) => sections.push(b));
  });

  const spec = { version: 1, business: { kind, name, what: B.what, area: own ? '' : B.area }, mood, layout: 'split', photo: hasPhoto ? kind : (kind === 'trades' ? 'trades' : 'none'), sections };
  return validate(spec).spec;
}

/* Describe, offline: the closest Pick settings from the words, plus the sections they ask for. */
export function fromWords(text) {
  const raw = typeof text === 'string' ? text.slice(0, 400) : '';
  const P = [];
  const t = clean(raw, 400, 'text', P);
  const lower = t.toLowerCase();

  // the business: the earliest match wins, so "a bakery that also serves coffee" is a bakery
  let match = null;
  TRADES_WORDS.forEach((row) => { const m = row[0].exec(lower); if (m && (!match || m.index < match.index)) match = { row, index: m.index, word: m[0] }; });
  const kind = match ? match.row[1] : 'other';

  // a name: in quotes, after "called" or "named", or at the start ("Bloom & Co is a florist ...")
  let name = '';
  const NAME = "[A-Z0-9][\\w’'&.-]*(?:\\s+(?:&|and|of|the|[A-Z0-9][\\w’'&.-]*)){0,4}";
  const q = /["“]([^"”]{2,40})["”]/.exec(t) || /‘([^’]{2,40})’/.exec(t) || /(?:^|\s)'([^']{2,40})'(?=[\s.,!?]|$)/.exec(t);
  const called = new RegExp('\\b(?:called|named|name is|name’s|name\'s)\\s+(' + NAME + ')').exec(t);
  const lead = new RegExp('^(?:we(?:’|\')?re|we are|this is|it(?:’|\')?s)?\\s*(' + NAME + ')\\s*(?:,|\\bis\\b|\\bare\\b)\\s*(?:a|an|the)\\b', 'i').exec(t);
  if (q) name = q[1];
  else if (called) name = called[1];
  else if (lead && /^[A-Z0-9]/.test(lead[1]) && !/^(A|An|The|We|Our|My|I)$/i.test(lead[1])) name = lead[1];
  name = name.replace(/\s+(?:and|of|the|&)$/i, '').trim().slice(0, 40);

  // where: "in Walthamstow", "based in Leeds", "north London"
  let area = '';
  const dir = /\b(north|south|east|west|central|greater)(?:[- ](east|west))?\s+london\b/i.exec(t);
  const inPlace = /\b(?:in|based in|near|around|serving)\s+([A-Z][\w’'-]+(?:\s+[A-Z][\w’'-]+){0,2})/.exec(t);
  if (dir) area = cap1(dir[1].toLowerCase()) + (dir[2] ? '-' + dir[2].toLowerCase() : '') + ' London';
  else if (inPlace && (!name || name.indexOf(inPlace[1]) < 0)) area = inPlace[1];

  // what: the matched word with up to two describing words before it ("Turkish bakery")
  let what = '';
  if (match) {
    const before = t.slice(0, match.index).trim().split(/\s+/).filter(Boolean), keep = [];
    for (let i = before.length - 1; i >= 0 && keep.length < 2; i--) {
      const w = before[i].replace(/[,.;:!?]+$/, '');
      if (/^(a|an|the|our|my|we|i|is|are|run|own|small-ish)$/i.test(w) || before[i] !== w) break;
      if (Object.keys(MOOD_WORDS).some((m) => MOOD_WORDS[m].some((r) => r[0].test(w.toLowerCase())))) break;
      if (/^[A-Z][a-z]/.test(w) && (i > 0 || before.length === 1) && (!name || name.split(' ').indexOf(w) < 0)) keep.unshift(w);
      else if (DESCRIPTORS.test(w)) keep.unshift(w.toLowerCase());
      else break;
    }
    let noun = match.word.toLowerCase().replace(/-/g, ' ');
    if (Object.prototype.hasOwnProperty.call(NOUN_FIX, noun)) noun = NOUN_FIX[noun];
    what = (keep.join(' ') + ' ' + noun).trim();
  }

  // mood and layout from the words; ties go to the word that came first
  const words = lower.split(/[^a-zà-ÿ'-]+/).filter(Boolean);
  const score = { calm: 0, bold: 0, classic: 0, fresh: 0 };
  words.forEach((w, i) => {
    MOOD_KEYS.forEach((m) => { MOOD_WORDS[m].forEach((r) => { if (r[0].test(w)) score[m] += r[1] * (1 + (words.length - i) * 0.001); }); });
  });
  let mood = BUSINESSES[kind].mood, best = 0;
  MOOD_KEYS.forEach((m) => { if (score[m] > best + 1e-9) { best = score[m]; mood = m; } });
  let layout = BUSINESSES[kind].layout;
  ['full', 'story', 'split'].some((l) => { if (LAYOUT_WORDS[l].test(lower)) { layout = l; return true; } return false; });

  const spec = buildPick({ business: kind, mood, layout, name: name || '' });
  const B = BUSINESSES[kind];
  const isDefaultWhat = !match || (match.row[2] === 'Café' && what === 'café');
  const own = !!(name || area || (what && !isDefaultWhat));
  spec.business.what = what || B.what;
  spec.business.area = area || (own ? '' : B.area);
  if (own) {
    const hero = spec.sections.find((s) => s.type === 'hero');
    const sub = match && match.row[3];
    if (!isDefaultWhat || kind === 'other') {
      hero.heading = what ? cap1(what) + (area ? ' in ' + area : '') + '.' : (name ? name + (area ? ', ' + area : '') + '.' : B.h1);
      if (sub) hero.text = sub;
      const cards = spec.sections.find((s) => s.type === 'cards');
      if (match && match.row[4]) cards.cards = match.row[4].map((c) => ({ title: c[0], text: c[1] }));
      if (match && match.row[4]) spec.sections.forEach((s) => { if (s.type === 'price_list') s.items = match.row[4].map((c) => ({ name: c[0], price: '', note: '' })); });
    }
    spec.sections.forEach((s) => {                              // never the made-up business's prices, hours or address
      if (s.type === 'price_list') s.items.forEach((it) => { it.price = ''; });
      if (s.type === 'hours') s.rows = [{ days: '', hours: '' }];
      if (s.type === 'map') s.label = '';
      if (s.type === 'round_photo') s.caption = '';
      if (s.type === 'gallery') s.caption = '';
      if (s.type === 'heading' && s.text === B.strip && kind !== 'other') s.text = 'Come and see us' + (area ? ' in ' + area : '') + '.';
    });
  }

  // sections the words ask for, added before the closing line if they aren't there yet
  const has = (type, variant) => spec.sections.some((s) => s.type === type && (!variant || s.variant === variant));
  const extra = [];
  SECTION_WORDS.forEach(([key, re]) => {
    if (!re.test(lower)) return;
    if (key === 'hours' && !has('hours')) extra.push({ type: 'hours', heading: 'Opening hours', rows: [{ days: '', hours: '' }] });
    if (key === 'map' && !has('map')) extra.push({ type: 'map', label: '' });
    const named = (sec) => { if (own && match && match.row[4]) sec.items = match.row[4].map((c) => ({ name: c[0], price: '', note: '' })); return sec; };
    if (key === 'menu' && !has('price_list')) extra.push(named(priceSection(kind, 'menu', true)));
    if (key === 'prices' && !has('price_list')) extra.push(named(priceSection(kind, 'prices', true)));
    if (key === 'booking' && !has('booking')) extra.push(bookingSection(kind));
    if (key === 'gallery' && !has('gallery')) extra.push({ type: 'gallery', count: 6, caption: '' });
    if (key === 'reviews' && !has('reviews')) extra.push({ type: 'reviews', heading: 'Reviews' });
    if (key === 'contact_form' && !has('contact_form')) extra.push({ type: 'contact_form', heading: 'Get in touch', fields: ['name', 'email', 'message'], button: 'Send' });
    if (key === 'contact' && !has('contact') && !/contact form/.test(lower)) extra.push({ type: 'contact', heading: 'Contact', show: ['phone', 'email', 'address'] });
    if (key === 'video' && !has('video')) extra.push({ type: 'video', caption: '' });
    if (key === 'round_photo' && !has('round_photo')) extra.push({ type: 'round_photo', caption: '' });
  });
  if (extra.length) {
    const closing = spec.sections.findIndex((s) => s.type === 'heading' && s.align === 'centre');
    const at = closing > 0 ? closing : spec.sections.length;
    spec.sections.splice(at, 0, ...extra);
    // keep within 12: drop the business's own extras (not the ones asked for) first
    const asked = new Set(extra);
    for (let i = spec.sections.length - 1; spec.sections.length > 12 && i > 2; i--) {
      const s = spec.sections[i];
      if (!asked.has(s) && s.type !== 'heading' && s.type !== 'buttons' && s.type !== 'cards') spec.sections.splice(i, 1);
    }
  }
  return validate(spec).spec;
}

/* ---------------------------------------------------------------- drawing ---------------------------------------------------------------- */

const SVGNS = 'http://www.w3.org/2000/svg';
// Line drawings (viewBox 0 0 120 120, stroke only). Constant markup: never built from a spec.
const ART = {
  clinic: ['<rect x="30" y="30" width="60" height="60" rx="16"/><path d="M60 44 V76 M44 60 H76"/>',
    '<path d="M44 78 H76 L72 100 H48 Z"/><path d="M60 78 V48"/><path d="M60 62 Q44 58 40 42 Q56 44 60 58"/><path d="M60 54 Q74 48 80 32 Q64 34 60 50"/>'],
  cafe: ['<path d="M34 50 H82 V70 Q82 88 64 88 H52 Q34 88 34 70 Z"/><path d="M82 56 Q96 56 96 66 Q96 76 82 74"/><path d="M28 96 H90"/><path d="M50 40 Q46 34 50 28 M60 40 Q56 34 60 28 M70 40 Q66 34 70 28"/>',
    '<path d="M24 78 Q24 50 60 50 Q96 50 96 78 V88 H24 Z"/><path d="M42 60 L48 70 M58 57 L62 70 M74 60 L76 70"/>'],
  salon: ['<circle cx="40" cy="84" r="11"/><circle cx="80" cy="84" r="11"/><path d="M47 76 L82 26 M73 76 L38 26"/><circle cx="60" cy="51" r="2"/>',
    '<circle cx="60" cy="46" r="22"/><path d="M60 68 V98 M48 98 H72"/><path d="M50 38 Q55 32 63 33"/>'],
  trades: ['<path d="M10 46 H50 M10 62 H50 M10 40 V68"/><rect x="50" y="38" width="24" height="32" rx="5"/><path d="M62 38 V26 M50 26 H74"/><path d="M74 48 H86 Q98 48 98 60 V70 M74 60 H82 Q86 60 86 64 V70"/><path d="M92 82 Q88 88 92 92 Q96 88 92 82 Z"/><path d="M92 100 Q89 104 92 107 Q95 104 92 100 Z"/>',
    '<rect x="24" y="40" width="72" height="50" rx="6"/><path d="M38 40 V90 M52 40 V90 M66 40 V90 M80 40 V90"/><path d="M32 90 V100 M88 90 V100"/>',
    '<path d="M30 92 L66 56"/><path d="M66 56 Q60 42 70 32 Q78 26 88 28 L78 40 L82 46 L90 50 L100 40 Q102 52 94 60 Q84 68 72 62"/><circle cx="30" cy="92" r="5"/>'],
  restaurant: ['<circle cx="60" cy="62" r="26"/><circle cx="60" cy="62" r="16"/><path d="M22 36 V56 M18 36 V48 Q18 56 22 56 Q26 56 26 48 V36 M22 56 V92"/><path d="M98 36 Q90 46 92 60 L98 62 V92"/>',
    '<path d="M46 26 H74 Q76 58 60 62 Q44 58 46 26 Z"/><path d="M60 62 V92 M46 94 H74"/><path d="M47 40 H73"/>'],
  boutique: ['<path d="M60 34 Q60 26 66 26 Q72 26 72 32 Q72 38 60 42 L22 70 Q18 74 24 76 H96 Q102 74 98 70 L60 42"/><path d="M32 84 H88"/>',
    '<path d="M50 28 H70 M52 28 Q52 40 46 50 Q36 66 44 84 Q50 96 60 96 Q70 96 76 84 Q84 66 74 50 Q68 40 68 28"/><path d="M42 66 H78"/>'],
  other: ['<path d="M20 44 L28 26 H92 L100 44"/><path d="M20 44 Q30 54 40 44 Q50 54 60 44 Q70 54 80 44 Q90 54 100 44"/><path d="M26 50 V96 H94 V50"/><path d="M38 96 V66 H58 V96"/><rect x="66" y="62" width="20" height="16" rx="2"/>',
    '<rect x="30" y="40" width="60" height="34" rx="6"/><path d="M60 24 L42 40 M60 24 L78 40"/><circle cx="60" cy="24" r="3"/><path d="M44 57 H76"/>']
};
const SCENE_SHAPES = '<path class="skd-shape skd-calm" d="M118 236 C58 206 66 112 138 80 C210 48 300 66 322 140 C342 212 262 262 190 252 C160 248 140 242 118 236 Z"/>' +
  '<g class="skd-shape skd-bold"><rect x="128" y="54" width="184" height="184"/><rect class="skd-outline" x="146" y="72" width="184" height="184"/></g>' +
  '<path class="skd-shape skd-classic" d="M140 262 V142 A80 80 0 0 1 300 142 V262 Z"/>' +
  '<circle class="skd-shape skd-fresh" cx="220" cy="150" r="104"/>';
const SCENE_MARKS = '<path class="skd-ground" d="M70 264 H350"/><circle class="skd-dot" cx="92" cy="98" r="5"/><circle class="skd-dot" cx="336" cy="80" r="3.5"/><path class="skd-tick" d="M300 230 l16 -16 M314 236 l16 -16"/>';
const MAP_SVG = '<rect class="skm-land" width="600" height="340"/>' +
  '<path class="skm-park" d="M52 34 H170 Q182 34 182 46 V116 Q182 128 170 128 H52 Q40 128 40 116 V46 Q40 34 52 34 Z"/>' +
  '<path class="skm-park" d="M452 206 H560 Q572 206 572 218 V262 Q572 274 560 274 H452 Q440 274 440 262 V218 Q440 206 452 206 Z"/>' +
  '<path class="skm-water" d="M-20 316 C110 272 220 330 336 286 S520 236 640 262"/>' +
  '<path class="skm-block" d="M210 30 h70 v52 h-70z M300 26 h96 v40 h-96z M214 196 h44 v44 h-44z M318 196 h80 v30 h-80z M464 40 h100 v60 h-100z M60 196 h120 v34 h-120z"/>' +
  '<path class="skm-road" d="M0 88 L600 112 M128 0 L150 340 M424 0 C412 130 452 232 432 340 M0 252 C200 238 380 250 600 232 M330 0 L356 168"/>' +
  '<path class="skm-road skm-major" d="M0 170 C150 160 300 192 600 150 M262 0 C250 120 292 222 272 340"/>';
const ICONS = {
  phone: '<path d="M6.5 3.5h3l1.6 4.2-2.1 1.3a11 11 0 0 0 6 6l1.3-2.1 4.2 1.6v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  address: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  social: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r=".9"/>',
  quote: '<path d="M5 17c2.6-1 4-3.2 4-6.4V7H5v4h3M14 17c2.6-1 4-3.2 4-6.4V7h-4v4h3"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  chevron: '<path d="M7 10l5 5 5-5"/>'
};

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null && text !== '') n.textContent = text;
  return n;
}
function svg(viewBox, markup, cls, slice) {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('viewBox', viewBox);
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('focusable', 'false');
  if (slice) s.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  if (cls) s.setAttribute('class', cls);
  s.innerHTML = markup;                                   // constant markup only (ART, SCENE_*, MAP_SVG, ICONS)
  return s;
}
function icon(name) { return svg('0 0 24 24', ICONS[name], 'sk-icon'); }

/* ---------------------------------------------------------------- rendering ---------------------------------------------------------------- */

const DEFAULT_PHOTOS = {};
PHOTO_KINDS.forEach((k) => { try { DEFAULT_PHOTOS[k] = new URL('../studio/playground/playground-' + k + '.webp', import.meta.url).href; } catch (e) { /* no URL support */ } });
const CROPS = [['50% 50%', 1], ['28% 42%', 1.7], ['74% 62%', 1.9], ['40% 72%', 2.2], ['64% 30%', 1.6], ['18% 60%', 2]];

function shownName(spec) {
  const b = spec.business, B = BUSINESSES[b.kind];
  if (b.name) return b.name;
  if (b.what && b.kind !== 'other' && b.what !== B.what) { const last = b.what.trim().split(/\s+/).pop(); return 'Your ' + last.toLowerCase(); }
  if (b.kind === 'other' && b.what) return 'Your ' + b.what.trim().split(/\s+/).pop().toLowerCase();
  return B.name;
}
function photoFor(spec, photos) {
  const k = spec.photo;
  if (!k || k === 'none') return '';
  if (k === 'trades' && !/air|condition|cool|climate|hvac|ventilat/i.test(spec.business.what + ' ' + spec.business.name)) return '';   // the trades photo is an air conditioner: a plumber gets the drawing
  return Object.prototype.hasOwnProperty.call(photos, k) ? (photos[k] || '') : '';
}

function makeRenderer(spec, ctx) {
  const name = shownName(spec), area = spec.business.area || BUSINESSES[spec.business.kind].area || '';
  const kind = spec.business.kind, photo = ctx.photo, phone = ctx.device === 'phone';
  let crop = 0, art = 0;

  function drawing(variant) {
    const wrap = el('div', 'sk-drawing' + (variant ? ' sk-drawing--' + variant : ''));
    const arts = ART[kind] || ART.other;
    wrap.appendChild(svg('0 0 440 300', '<rect class="skd-bg" width="440" height="300"/>' + SCENE_SHAPES +
      '<g class="skd-art" transform="translate(150 78) scale(1.18)">' + arts[art++ % arts.length] + '</g>' + SCENE_MARKS, 'skd', true));
    return wrap;
  }
  function media(kindOfPicture, cls, cropIndex) {
    const box = el('div', 'sk-media' + (cls ? ' ' + cls : ''));
    if (kindOfPicture !== 'drawing' && photo) {
      const img = el('img', 'sk-photo');
      img.alt = ''; img.decoding = 'async'; img.loading = 'lazy'; img.draggable = false; img.width = 1200; img.height = 751;
      const c = CROPS[(cropIndex != null ? cropIndex : crop++) % CROPS.length];
      img.style.objectPosition = c[0];
      if (c[1] !== 1 && cropIndex != null) { img.style.transform = 'scale(' + c[1] + ')'; img.style.transformOrigin = c[0]; }
      img.src = photo;
      box.appendChild(img);
      box.classList.add('sk-has-photo');
    } else box.appendChild(drawing());
    return box;
  }
  function btn(label, style, small) {
    const b = el('span', 'sk-btn' + (style === 'outline' ? ' sk-btn--outline' : '') + (small ? ' sk-btn--sm' : ''), label);
    return b;
  }
  function wrap(type, inner, extra) {
    const s = el('div', 'sk-sec sk-sec--' + type + (extra ? ' ' + extra : ''));
    const w = el('div', 'sk-wrap');
    w.appendChild(inner);
    s.appendChild(w);
    return s;
  }
  function mark() {
    const m = el('span', 'sk-mark');
    m.appendChild(el('span', 'sk-mark-letter', (name.replace(/^(the|your)\s+/i, '').match(/[A-Za-z0-9À-ÿ]/) || ['S'])[0].toUpperCase()));
    return m;
  }

  const R = {
    menu_bar(s) {
      const h = el('div', 'sk-nav'), w = el('div', 'sk-wrap sk-nav-in'), brand = el('span', 'sk-brand');
      if (s.logo === 'mark') brand.appendChild(mark());
      brand.appendChild(el('span', 'sk-name', name));
      w.appendChild(brand);
      if (!phone && s.links.length) { const nav = el('span', 'sk-links'); s.links.forEach((l) => nav.appendChild(el('span', 'sk-navlink', l))); w.appendChild(nav); }
      if (s.button && !phone) w.appendChild(btn(s.button, 'solid', true));
      if (phone && (s.links.length || s.button)) { const bg = el('span', 'sk-burger'); bg.appendChild(el('i')); bg.appendChild(el('i')); w.appendChild(bg); }
      h.appendChild(w);
      return h;
    },
    hero(s) {
      let variant = s.variant;
      const pic = s.picture === 'none' ? null : s.picture;
      if (!pic && variant !== 'text') variant = 'text';
      const sec = el('div', 'sk-hero sk-hero--' + variant);
      const textBox = el('div', 'sk-hero-text');
      textBox.appendChild(el('div', 'sk-h1', s.heading));
      if (s.text) textBox.appendChild(el('div', 'sk-lede', s.text));
      if (s.button || s.link) {
        const a = el('div', 'sk-actions');
        if (s.button) a.appendChild(btn(s.button, 'solid'));
        if (s.link) { const l = el('span', 'sk-textlink', s.link); l.appendChild(el('span', 'sk-arrow', ' →')); a.appendChild(l); }
        textBox.appendChild(a);
      }
      if (variant === 'full') {
        const m = media(pic, 'sk-hero-media');
        sec.appendChild(m);
        if (!m.classList.contains('sk-has-photo')) sec.classList.add('sk-hero--drawn');
        const w = el('div', 'sk-wrap sk-hero-in'); w.appendChild(textBox); sec.appendChild(w);
        return sec;
      }
      const w = el('div', 'sk-wrap sk-hero-in');
      if (variant === 'text') {
        w.appendChild(textBox);
        sec.appendChild(w);
        sec.appendChild(el('div', 'sk-hero-rule'));
        return sec;
      }
      w.appendChild(textBox);
      w.appendChild(media(pic, 'sk-hero-media'));
      sec.appendChild(w);
      return sec;
    },
    heading(s) { const h = el('div', 'sk-h2 sk-h2--' + s.size, s.text); h.dataset.align = s.align; return h; },
    text(s) { const p = el('div', 'sk-text', s.text); p.dataset.align = s.align; return p; },
    buttons(s) { const a = el('div', 'sk-actions'); a.dataset.align = s.align; s.buttons.forEach((b) => a.appendChild(btn(b.label, b.style))); return a; },
    picture(s) {
      const f = el('div', 'sk-fig sk-fig--' + s.width);
      f.appendChild(media(s.picture, 'sk-fig-media'));
      if (s.caption) f.appendChild(el('div', 'sk-caption', s.caption));
      return f;
    },
    round_photo(s) {
      const f = el('div', 'sk-round' + (s.caption ? '' : ' sk-round--alone'));
      f.appendChild(media('photo', 'sk-round-img', 1));
      if (s.caption) f.appendChild(el('div', 'sk-round-cap', s.caption));
      return f;
    },
    cards(s) {
      const g = el('div', 'sk-cards sk-cards--' + s.style);
      g.dataset.count = String(s.cards.length);
      s.cards.forEach((c) => {
        const card = el('div', 'sk-card');
        card.appendChild(el('span', 'sk-card-mark'));
        if (c.title) card.appendChild(el('div', 'sk-h3', c.title));
        if (c.text) card.appendChild(el('div', 'sk-card-text', c.text));
        g.appendChild(card);
      });
      return g;
    },
    gallery(s) {
      const f = el('div', 'sk-gallery'), tiles = el('div', 'sk-tiles');
      tiles.dataset.count = String(s.count);
      for (let i = 0; i < s.count; i++) {
        const drawn = !photo || i % 3 === 1;
        const t = drawn ? el('div', 'sk-tile sk-tile--drawn sk-tile--t' + (i % 3)) : media('photo', 'sk-tile', i % CROPS.length);
        if (drawn) { const arts = ART[kind] || ART.other; t.appendChild(svg('0 0 120 120', arts[(i + 1) % arts.length], 'sk-tile-art')); }
        tiles.appendChild(t);
      }
      f.appendChild(tiles);
      if (s.caption) f.appendChild(el('div', 'sk-caption', s.caption));
      return f;
    },
    video(s) {
      const f = el('div', 'sk-video'), frame = el('div', 'sk-video-frame');
      frame.appendChild(media('photo', 'sk-video-media', 4));
      const play = el('span', 'sk-play'); play.appendChild(el('i')); frame.appendChild(play);
      const bar = el('span', 'sk-video-bar'); bar.appendChild(el('i')); frame.appendChild(bar);
      f.appendChild(frame);
      if (s.caption) f.appendChild(el('div', 'sk-caption', s.caption));
      return f;
    },
    map(s) {
      const m = el('div', 'sk-map');
      m.appendChild(svg('0 0 600 340', MAP_SVG, 'skm', true));
      const pin = el('span', 'sk-pin'); pin.appendChild(el('i')); m.appendChild(pin);
      m.appendChild(el('span', 'sk-map-label', s.label || area || 'Your area'));
      return m;
    },
    contact_form(s) {
      const box = el('div', 'sk-form' + (s.heading ? '' : ' sk-form--alone'));
      if (s.heading) { const side = el('div', 'sk-form-side'); side.appendChild(el('div', 'sk-h2 sk-h2--medium', s.heading)); box.appendChild(side); }
      const form = el('div', 'sk-form-fields');
      const LABEL = { name: 'Name', email: 'Email', phone: 'Phone', message: 'Message', date: 'Date', party_size: 'Party size' };
      s.fields.forEach((f) => {
        const field = el('div', 'sk-field sk-field--' + f);
        field.appendChild(el('span', 'sk-field-label', LABEL[f]));
        const input = el('span', 'sk-input' + (f === 'message' ? ' sk-input--area' : ''));
        if (f === 'party_size') { input.appendChild(el('span', 'sk-input-value', '2 people')); input.appendChild(icon('chevron')); }
        if (f === 'date') { input.appendChild(el('span', 'sk-input-value sk-quiet', 'Choose a date')); input.appendChild(icon('calendar')); }
        field.appendChild(input);
        form.appendChild(field);
      });
      if (s.button) { const a = el('div', 'sk-form-send'); a.appendChild(btn(s.button, 'solid')); form.appendChild(a); }
      box.appendChild(form);
      return box;
    },
    price_list(s) {
      const box = el('div', 'sk-prices sk-prices--' + s.variant);
      if (s.heading) box.appendChild(el('div', 'sk-h2 sk-h2--medium sk-prices-head', s.heading));
      const listEl = el('div', 'sk-price-items');
      s.items.forEach((it) => {
        const row = el('div', 'sk-price');
        const top = el('div', 'sk-price-top');
        top.appendChild(el('span', 'sk-price-name', it.name));
        top.appendChild(el('span', 'sk-price-dots'));
        top.appendChild(el('span', 'sk-price-value' + (it.price ? '' : ' sk-quiet'), it.price || '£ –'));
        row.appendChild(top);
        if (it.note) row.appendChild(el('span', 'sk-price-note', it.note));
        listEl.appendChild(row);
      });
      box.appendChild(listEl);
      return box;
    },
    booking(s) {
      const box = el('div', 'sk-booking' + (s.heading ? '' : ' sk-booking--alone'));
      if (s.heading) { const side = el('div', 'sk-booking-side'); side.appendChild(el('div', 'sk-h2 sk-h2--medium', s.heading)); box.appendChild(side); }
      const w = el('div', 'sk-widget');
      const FIRST = { table: ['Guests', '2 people'], appointment: ['Service', 'Choose a service'], visit: ['Job', 'Tell us what it’s for'], class: ['Class', 'Choose a class'], collection: ['Order', 'Your basket'] };
      const f = el('div', 'sk-field'); f.appendChild(el('span', 'sk-field-label', FIRST[s.kind][0]));
      const inp = el('span', 'sk-input'); inp.appendChild(el('span', 'sk-input-value', FIRST[s.kind][1])); inp.appendChild(icon('chevron')); f.appendChild(inp);
      w.appendChild(f);
      const days = el('div', 'sk-days'), D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], now = new Date();
      for (let i = 1; i <= (phone ? 5 : 7); i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
        const c = el('span', 'sk-day' + (i === 2 ? ' is-on' : '')); c.appendChild(el('span', 'sk-day-name', D[d.getDay()])); c.appendChild(el('span', 'sk-day-num', String(d.getDate())));
        days.appendChild(c);
      }
      w.appendChild(days);
      const TIMES = { table: ['18:00', '18:30', '19:00', '19:30', '20:30'], appointment: ['10:00', '11:30', '13:00', '14:30', '16:00'], visit: ['Morning', 'Afternoon'], class: ['07:00', '09:30', '12:15', '18:00', '19:30'], collection: ['08:30', '09:00', '09:30', '10:00', '10:30'] };
      const times = el('div', 'sk-times' + (s.kind === 'visit' ? ' sk-times--wide' : ''));
      TIMES[s.kind].slice(0, phone && s.kind !== 'visit' ? 4 : 5).forEach((tm, i) => times.appendChild(el('span', 'sk-time' + (i === 1 ? ' is-on' : i === 3 ? ' is-off' : ''), tm)));
      w.appendChild(times);
      if (s.button) w.appendChild(btn(s.button, 'solid'));
      box.appendChild(w);
      return box;
    },
    hours(s) {
      const box = el('div', 'sk-hours');
      box.appendChild(el('div', 'sk-h2 sk-h2--medium', s.heading || 'Opening hours'));
      const t = el('div', 'sk-hours-rows');
      const real = s.rows.filter((r) => r.days && r.hours);
      if (!real.length) {
        const r = el('div', 'sk-hours-row sk-hours-row--empty');
        r.appendChild(el('span', 'sk-hours-days sk-quiet', 'Your opening hours'));
        t.appendChild(r);
      } else s.rows.forEach((r) => {
        const row = el('div', 'sk-hours-row');
        row.appendChild(el('span', 'sk-hours-days' + (r.days ? '' : ' sk-quiet'), r.days || 'Your opening hours'));
        row.appendChild(el('span', 'sk-hours-time' + (r.hours ? '' : ' sk-quiet'), r.hours || 'Your opening hours'));
        t.appendChild(row);
      });
      box.appendChild(t);
      return box;
    },
    contact(s) {
      const box = el('div', 'sk-contact');
      if (s.heading) box.appendChild(el('div', 'sk-h2 sk-h2--medium', s.heading));
      const g = el('div', 'sk-contact-items');
      const TEXT = { phone: ['Phone', 'Your phone number'], email: ['Email', 'hello@yourbusiness.example'], address: ['Address', 'Your address'], social: ['Social', 'Your social links'] };
      s.show.forEach((k) => {
        const it = el('div', 'sk-contact-item');
        const ic = el('span', 'sk-contact-icon'); ic.appendChild(icon(k)); it.appendChild(ic);
        const tx = el('span', 'sk-contact-text'); tx.appendChild(el('span', 'sk-contact-label', TEXT[k][0])); tx.appendChild(el('span', 'sk-contact-value', TEXT[k][1]));
        it.appendChild(tx);
        g.appendChild(it);
      });
      box.appendChild(g);
      return box;
    },
    reviews(s) {
      const box = el('div', 'sk-reviews');
      box.appendChild(el('div', 'sk-h2 sk-h2--medium', s.heading || 'Reviews'));
      const space = el('div', 'sk-reviews-space');
      const q = el('span', 'sk-reviews-icon'); q.appendChild(icon('quote')); space.appendChild(q);
      space.appendChild(el('span', 'sk-reviews-title', 'Your own reviews will show here'));
      space.appendChild(el('span', 'sk-reviews-note', 'Only real ones, from your customers.'));
      box.appendChild(space);
      return box;
    },
    row(s) {
      const g = el('div', 'sk-row');
      const sum = s.columns.reduce((a, c) => a + c.span, 0), gaps = s.columns.length - 1, spare = 12 - sum;
      let at = 1;
      s.columns.forEach((c, i) => {
        const col = el('div', 'sk-col');
        if (!phone) col.style.gridColumn = at + ' / span ' + c.span;
        at += c.span + (gaps ? Math.floor(spare / gaps) + (i < spare % gaps ? 1 : 0) : 0);
        c.blocks.forEach((b) => { const n = R[b.type] && R[b.type](b, true); if (n) { n.classList.add('sk-in-row'); col.appendChild(n); } });
        g.appendChild(col);
      });
      return g;
    }
  };
  const FLOW = { heading: 1, text: 1, buttons: 1 };
  const BAND = { price_list: 1, booking: 1, reviews: 1, contact_form: 1 };

  return function build(root) {
    const site = el('div', 'sk-site');
    let prev = '';
    spec.sections.forEach((s) => {
      let node = null;
      try {
        if (s.type === 'menu_bar' || s.type === 'hero') node = R[s.type](s);
        else if (s.type === 'picture' && s.width === 'full') { node = el('div', 'sk-sec sk-sec--picture sk-sec--bleed'); node.appendChild(R.picture(s)); }
        else {
          const inner = R[s.type](s);
          node = wrap(s.type, inner, (FLOW[s.type] ? 'sk-flow' : '') + (BAND[s.type] ? ' sk-band' : '') + (s.align === 'centre' ? ' sk-centre' : ''));
          if (FLOW[s.type] && FLOW[prev]) node.classList.add('sk-flow-next');
          if (s.type === 'heading' && s.align === 'centre') node.classList.add('sk-statement');
        }
      } catch (e) { node = null; }                  // one odd section never stops the page
      if (node) { node.dataset.type = s.type; site.appendChild(node); prev = s.type; }
    });
    const foot = el('div', 'sk-foot'), fw = el('div', 'sk-wrap sk-foot-in');
    const left = el('div', 'sk-foot-brand');
    left.appendChild(el('span', 'sk-foot-name', name));
    if (area) left.appendChild(el('span', 'sk-foot-area', area));
    fw.appendChild(left);
    fw.appendChild(el('span', 'sk-foot-links', 'Privacy · Terms'));
    fw.appendChild(el('span', 'sk-foot-copy', '© ' + new Date().getFullYear() + ' ' + name));
    foot.appendChild(fw);
    site.appendChild(foot);
    root.appendChild(site);
    return site;
  };
}

const NAMES = {
  menu_bar: ['a menu bar', 'menu bars'], hero: ['an opening', 'openings'], heading: ['a heading', 'headings'], text: ['some text', 'blocks of text'], buttons: ['buttons', 'sets of buttons'],
  picture: ['a picture', 'pictures'], round_photo: ['a round photo', 'round photos'], cards: ['cards', 'sets of cards'], gallery: ['a gallery', 'galleries'], video: ['a video', 'videos'],
  map: ['a map', 'maps'], contact_form: ['a contact form', 'contact forms'], price_list: ['a price list', 'price lists'], booking: ['booking', 'booking sections'], hours: ['opening hours', 'opening hours'],
  contact: ['contact details', 'contact details'], reviews: ['a space for reviews', 'spaces for reviews']
};
export function describe(input) {
  const spec = validate(input).spec, counts = {}, order = [];
  const add = (t, extra) => { if (!counts[t]) order.push(t); counts[t] = (counts[t] || 0) + 1; if (t === 'price_list' && extra === 'menu') counts.__menu = 1; };
  spec.sections.forEach((s) => { if (s.type === 'row') s.columns.forEach((c) => c.blocks.forEach((b) => add(b.type, b.variant))); else add(s.type, s.variant); });
  const parts = order.map((t) => {
    if (t === 'hero') { const h = spec.sections.find((s) => s.type === 'hero'); return { split: 'a side-by-side opening', story: 'a centred opening', full: 'a full-width photo opening', text: 'a large headline' }[h.variant]; }
    if (t === 'price_list' && counts.__menu && counts[t] === 1) return 'a menu';
    return counts[t] === 1 ? NAMES[t][0] : NAMES[t][1];
  });
  const B = BUSINESSES[spec.business.kind];
  const w0 = spec.business.what || B.label.toLowerCase(), what = /^[A-Z][a-z]/.test(w0) && !/^[A-Z][a-z]+ [A-Z]/.test(w0) && /^(Coffee|Private|Hair|Plumbing|Seasonal|Clothing|Bakery|Café|Shop|Studio|Restaurant|Salon|Clinic|Bar|Deli|Trades|Other)\b/.test(w0) ? w0.charAt(0).toLowerCase() + w0.slice(1) : w0;
  const where = spec.business.area ? ' in ' + spec.business.area : '';
  const list = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0] || 'a single section';
  return 'A picture of a website for ' + shownName(spec) + ', ' + (/^[aeiou]/.test(what) ? 'an ' : 'a ') + what + where + ', in the ' + MOODS[spec.mood].label.toLowerCase() + ' style: ' + list + '.';
}

export function render(container, input, options) {
  const o = options || {};
  const device = o.device === 'phone' ? 'phone' : 'laptop';
  const design = typeof o.width === 'number' && o.width > 200 ? o.width : device === 'phone' ? 390 : 1200;
  const fit = o.fit !== false;
  const photos = Object.assign({}, DEFAULT_PHOTOS, o.photos || {});
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = validate(input), site = null, ro = null;
  const root = el('div', 'sk');
  root.setAttribute('aria-hidden', 'true');
  root.inert = true;
  root.dataset.device = device;
  container.appendChild(root);

  function zoom() {
    if (!fit || !site) return;
    const w = container.clientWidth;
    if (w) site.style.zoom = String(Math.round((w / design) * 10000) / 10000);
  }
  function draw(fade) {
    const spec = current.spec;
    root.dataset.mood = spec.mood;
    root.dataset.kind = spec.business.kind;
    const old = site;
    site = makeRenderer(spec, { device, photo: photoFor(spec, photos) })(root);
    if (fit) site.style.width = design + 'px';
    zoom();
    if (old) old.remove();
    if (fade && !reduce) { site.classList.add('sk-enter'); requestAnimationFrame(() => requestAnimationFrame(() => site && site.classList.remove('sk-enter'))); }
  }
  draw(false);
  if (fit && typeof ResizeObserver === 'function') { ro = new ResizeObserver(zoom); ro.observe(container); }

  const sameButMood = (a, b) => JSON.stringify(Object.assign({}, a, { mood: '' })) === JSON.stringify(Object.assign({}, b, { mood: '' }));
  return {
    el: root,
    update(next) {
      const v = validate(next);
      const moodOnly = sameButMood(v.spec, current.spec);
      current = v;
      if (moodOnly) root.dataset.mood = v.spec.mood;            // colours and type change in place (CSS transitions)
      else draw(true);
    },
    spec() { return JSON.parse(JSON.stringify(current.spec)); },
    problems() { return current.problems.slice(); },
    describe() { return describe(current.spec); },
    destroy() { if (ro) ro.disconnect(); root.remove(); site = null; }
  };
}

const SiteKit = { render, validate, fromPick, fromSketch, fromWords, describe, MOODS, BUSINESSES, LAYOUTS, SECTION_TYPES: SECTION_TYPES.slice() };
if (typeof window !== 'undefined') window.SiteKit = SiteKit;
export default SiteKit;
