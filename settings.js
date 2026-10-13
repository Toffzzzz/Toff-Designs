/* =====================================================================
   SETTINGS — every adjustable value for the site lives here.
   Change values in this file only; nothing else needs touching.
   Keep DESIGN.md in sync whenever a value here changes.
   ===================================================================== */
window.TOFF_SETTINGS = {
  // The top bar. hideOnScroll: false keeps it (and its "Start a project" button) on screen all the time;
  // true hides it while scrolling down and brings it back on the way up.
  topbar: { hideOnScroll: false },

  /* ---------- Studio ---------- */
  studioName: 'Toff Studio',
  copyrightYear: 2026,
  location: 'London',
  // The site's public address, with the closing slash. Canonical links, link previews, JSON-LD and
  // sitemap.xml are all built from it. Change it once the studio has its own domain.
  siteUrl: 'https://toffzzzz.github.io/Toff-Designs/',
  // Your email, e.g. 'hello@toffstudio.com'. Shown in the footer.
  email: '',

  // The one switch for anything not filled in yet: true shows clearly marked placeholders and the unfinished details
  // (data-unfinished); false hides both, with no gaps. Adding ?unfinished to the address always shows everything.
  showPlaceholders: false,

  /* ---------- Live sites ----------
     Empty = no link: the Everest picture says "Live site coming soon" and the
     enquiry's style picker shows no "View site" link for it. */
  links: {
    bluebird: 'https://toffzzzz.github.io/bluebird-wellness/',
    everest: '', // add the Everest Climate Solutions live address here once it's online
  },

  /* ---------- Footer extras (each one appears only once it's filled in) ---------- */
  // Social links, e.g. [{ label: 'Instagram', url: 'https://instagram.com/…' }]
  social: [],
  // Legal pages. They stay hidden until each page exists; the enquiry can only go
  // live once privacyPolicyUrl is set.
  legal: {
    privacyPolicyUrl: '',
    termsUrl: '',
    cookiesUrl: '',
  },
  // Company details, e.g. { name: 'Toff Studio Ltd', number: '01234567', address: '…', vat: '' }
  company: {
    name: '',
    number: '', // company registration number
    address: '', // registered office address
    vat: '', // VAT number
  },

  /* ---------- "How it works": how long each step takes ----------
     One per step, in order: Discovery call, Sketch, Build, Launch & care. Shown as "How long: …".
     e.g. ['30 minutes', 'About a week', '3–4 weeks', 'Ongoing']. Empty = "How long: to be added" (or hidden). */
  process: {
    timeframes: ['', '', '', ''],
  },

  /* ---------- "Kind words": one real testimonial per project ----------
     Paste the client's own words into quote, their name into name, and their
     business into business. Never invent one. Empty = placeholder (or hidden).
     project is only used for the placeholder's wording. */
  testimonials: [
    { project: 'Bluebird Wellness', quote: '', name: '', business: 'Bluebird Wellness' },
    { project: 'Everest Climate Solutions', quote: '', name: '', business: 'Everest Climate Solutions' },
  ],

  /* ---------- The enquiry ---------- */
  contact: {
    // Shown after "We'll reply within", e.g. 'two working days'. Empty = placeholder (or hidden).
    replyTime: '',
  },
  // 'demo' sends and stores nothing. 'live' sends the answers to formEndpoint, and
  // only switches on once legal.privacyPolicyUrl and formEndpoint are both set.
  chatMode: 'demo',
  // Live mode only: your form service address, e.g. 'https://formspree.io/f/xxxxxxx'
  formEndpoint: '',

  /* ---------- Colours (Midnight & Gold) ----------
     Written onto the page as CSS variables when it loads. If you change ink or
     lineShadow, change handwriting.color and handwriting.shadow.color to match. */
  colors: {
    bg: '#0E1628', // midnight page
    ink: '#F1E3C6', // cream: lines, links, outlines
    text: '#F6F0E4', // headings and body text
    slate: '#A7AFC2', // quiet text, placeholders
    accent: '#D8AC5F', // gold: fine rules, the main button, selected states, small italic notes
    tint: '#1A2541', // raised areas: a selected choice, an input
    lineShadow: 'rgba(216, 172, 95, 0.38)', // the gold under-shadow on every line
    footer: '#0A101E', // the footer's slightly deeper midnight
    error: '#F2A7A0', // form messages when something is missing
    hairline: 'rgba(216, 172, 95, 0.22)', // fine gold rules (round 05)
    // The cream-paper section ("How we work"), round 05:
    paper: '#F1EADC', // the paper
    paperText: '#141C2E', // text on paper
    paperQuiet: '#4C5468', // quiet text on paper
    paperLine: '#8F6A2A', // lines on paper only (too light for text)
    paperAccent: '#7E5E24', // gold-ish text on paper
  },

  /* ---------- The opening page ("From sketch to site") ---------- */
  opening: {
    sketchSeconds: 2.3, // the whole sketch draws itself in about this many seconds
    overlap: 0.45, // each stroke starts when the previous one is this far from finishing (0 = one after another)
    pressAt: 0.25, // pause before the sketched button is pressed, in seconds
    revealDuration: 1.25, // how long the colour takes to spread from the button, in seconds
    lineDuration: 0.9, // how long the line takes to drop to the bottom of the screen, in seconds
  },

  /* ---------- The handwriting line ("You plan" … "So... what will it be?") ---------- */
  handwriting: {
    color: '#F1E3C6', // the ink colour (keep the same as colors.ink)
    strokePx: { desktop: 3.2, mobile: 2.6 }, // line thickness on screen, in pixels
    // the gold under-shadow: colour, how far below the line (px), how much wider than the line (px),
    // blur (px; keep 0, blurring long lines costs smoothness) and how far it trails the pen (seconds)
    shadow: { color: 'rgba(216,172,95,0.30)', offsetPx: 3.5, extraWidthPx: 1.2, blurPx: 0, lag: 0.22 },
    writeStart: 0.86, // laptops: a phrase starts writing when it is this far down the screen (0 = top, 1 = bottom)
    writeEnd: 0.56, // laptops: …and has finished by the time it is this far down
    tailTip: 0.62, // laptops: where on screen the pen sits while the last line runs down
    ease: 0.12, // laptops: how closely the pen follows the scroll, in seconds (smaller = tighter)
    maxSpeedPx: 3400, // laptops: the pen never draws faster than this many pixels of line per second
    autoSpeedPx: 820, // parts that draw themselves (coming back to the page, jumps): pen speed in pixels per second
    phoneSpeedPx: 620, // phones: pen speed in pixels per second
    phoneTrigger: 0.82, // phones: a part starts writing when it reaches this far down the screen
    breakpoint: 700, // screens narrower than this many pixels use the phone layout
    jumpScreens: 1.2, // a scroll bigger than this many screen heights at once counts as a jump
    settleMs: 450, // wait this long after loading for the browser to restore the scroll position
    minLinkScroll: 0.38, // laptops: each joining line gets at least this share of the scroll between phrases
    introOnLoad: false, // false: the first phrase writes as you scroll to it (the opening page sits above it)
    entryTip: 0.7, // laptops: where on screen the pen sits while the line runs in from the top
  },

  /* ---------- The pictures beside the phrases ---------- */
  showcase: {
    ease: 0.28, // how gently a picture follows its phrase, in seconds
  },

  /* ---------- The enquiry's style picker ---------- */
  stylePicker: {
    drawSeconds: 1.1, // how long the three little icons take to draw themselves
  },

  /* ---------- Gentle fade-up of the items in "What's included" and the quotes in "Kind words" ---------- */
  reveal: {
    durationMs: 600, // how long each fade-up takes
    risePx: 12, // how far it rises into place
  },

  /* ---------- Movement on the studio's pages (round 05) ----------
     One family of easings (quintic). Written onto the page as CSS variables (assets/shared/boot.js)
     and read by assets/shared/motion.js. Durations grow with distance: about 200ms plus 1.2ms per pixel,
     never more than moveMs. */
  motion: {
    easeOut: 'cubic-bezier(.22, 1, .36, 1)', // everything that arrives
    easeInOut: 'cubic-bezier(.83, 0, .17, 1)', // things that move from one place to another
    easeIn: 'cubic-bezier(.64, 0, .78, 0)', // things that leave (rare)
    pressMs: 100, // pressed states
    quickMs: 180, // hover, chips, toggles
    baseMs: 280, // menus, disclosures, segmented controls, panels
    revealMs: 560, // fade-ups, confirmation cards
    moveMs: 900, // headline lines, stage swaps, large travels
    lineMs: 1400, // the gold line dropping from the stage
    riseSmallPx: 8, // small rise
    riseMediumPx: 16, // fade-ups
    riseLargePx: 32, // large rise
    staggerLinesMs: 90, // between the headline's lines
    staggerRowsMs: 60, // between list rows (at most five)
  },

  /* ---------- The hero: the sketch you paint into the finished site (round 05) ---------- */
  hero: {
    idleMs: 2500, // if the visitor doesn't paint for this long, a brush paints the site in by itself
    autoPaintMs: 2000, // how long that brush takes
    doneAt: 0.98, // once this share of the stage is painted, the finished site is shown and drawing stops
  },

  /* ---------- The AI features (round 05) ----------
     They call the studio's Cloudflare Worker only when a visitor uses them. Each address below is
     workerBase plus its route unless you give a full address; '' switches that feature to answering
     from the page only. */
  ai: {
    workerBase: 'https://toff-sketch-ai.toffdesigns.workers.dev', // the Worker's address, without a closing slash
    chatEndpoint: null, // the round 04 chat demo: workerBase + '/chat'
    readSketchEndpoint: null, // "Draw your site" reading a sketch: workerBase + '/read-sketch'
    agentEndpoint: null, // the AI demo that acts on the business's site: workerBase + '/agent'
    conciergeEndpoint: null, // the concierge ("Plan with us"): workerBase + '/concierge'
    briefEndpoint: null, // writing the brief's summary: workerBase + '/brief'
    designEndpoint: null, // "Design yours", Describe: workerBase + '/design'
    maxLiveAnswers: 8, // at most this many live answers per visit (a tool round trip counts as part of one answer)
    firstWordTimeoutMs: 12000, // if the first word hasn't arrived after this long, answer from the page instead
  },

  /* ---------- The Lab (lab.html, round 05) ----------
     On a slower device each experiment opens as a still with a Play button, and runs a lighter
     version once played. A device counts as slower when it reports this many processor cores
     or fewer, or this much memory or less (or when the visitor's browser asks to save data). */
  lab: {
    lowPowerCores: 4, // processor cores (4 or fewer counts as slower)
    lowPowerMemoryGB: 4, // memory in GB (4 or less counts as slower; not every browser reports it)
  },
};

/* Fill in the AI addresses left as null from ai.workerBase (nothing to change here). */
(function (ai) {
  if (!ai) return;
  var base = String(ai.workerBase || '').replace(/\/+$/, '');
  var routes = { chat: '/chat', readSketch: '/read-sketch', agent: '/agent', concierge: '/concierge', brief: '/brief', design: '/design' };
  for (var k in routes) if (ai[k + 'Endpoint'] == null) ai[k + 'Endpoint'] = base ? base + routes[k] : '';
})(window.TOFF_SETTINGS.ai);
