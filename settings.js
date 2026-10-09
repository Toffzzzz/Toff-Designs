/* =====================================================================
   SETTINGS — every adjustable value for the site lives here.
   Change values in this file only; nothing else needs touching.
   Keep DESIGN.md in sync whenever a value here changes.
   ===================================================================== */
window.TOFF_SETTINGS = {
  /* ---------- Studio ---------- */
  studioName: 'Toff Studio',
  copyrightYear: 2026,
  // Shown in the footer once filled in, e.g. 'hello@toffstudio.com'. Empty = hidden.
  email: '',

  /* ---------- Colours ---------- */
  colors: {
    background: '#F7F5F0', // warm off-white page
    ink: '#1F3A5F', // the line, the studio mark, headings
    text: '#1F3A5F', // body text
    muted: '#5A6472', // captions and small print (5.6:1 on the background)
    shadow: '#7D838C', // the soft grey copy under every drawn line
    focus: '#1F3A5F', // keyboard focus ring
  },

  /* ---------- The line ---------- */
  stroke: {
    width: 2.6, // px, the same everywhere (round ends and joins)
  },
  shadow: {
    offsetX: 0, // px
    offsetY: 2.5, // px below the line
    blur: 1.1, // px
    opacity: 0.32, // 0–1
    delay: 0.09, // seconds the shadow trails behind the line as it draws
  },

  /* ---------- Section 1: the four phrases ----------
     font: any id from paths/fonts/index.js (see fonts-preview.html).
     size: relative size (1 = the standard phrase size).
     letterSpacing: extra space between letters, in em. */
  phrases: [
    { text: 'You plan', font: 'EMSAllure', size: 1.25, letterSpacing: 0 },
    { text: 'WE DESIGN', font: 'HersheySans1', size: 0.95, letterSpacing: 0.22 },
    { text: 'We deliver', font: 'HersheySerifMedItalicSingle', size: 0.95, letterSpacing: 0 },
    { text: 'So... what will it be?', font: 'EMSNeato', size: 1.0, letterSpacing: 0 },
  ],

  /* ---------- Drawing speeds ---------- */
  speeds: {
    writing: 8, // letters: em of pen travel per second
    line: 0.95, // joining lines: screen heights per second
    drawing: 0.5, // style drawings (the face): screen heights per second
    details: 0.9, // small strokes of a drawing (eye, lips…): screen heights per second
    penLift: 0.035, // pause between strokes, seconds
    wordGap: 0.14, // pause between words, seconds
    // Laptops: scroll distance (in screen heights) per second of drawing,
    // for joining lines that run sideways
    scrollPerSecond: 0.16,
    // Laptops: each phrase is written while it moves from this far down the
    // screen to that far down (fractions of the screen height)
    phraseScroll: [0.66, 0.3],
    // Laptops: where on the screen the pen draws, as a fraction of the screen
    // height from the top (0.62 = a little below the middle)
    penHeight: 0.62,
    // Laptops: the fastest the pen may catch up when you scroll quickly,
    // as a multiple of its natural speed
    maxCatchUp: 1.8,
  },

  /* ---------- Sections ----------
     The opening always comes first and the finale last. This list is the
     order of the style sections in between; each one also needs show: true. */
  sectionOrder: ['bluebird', 'everest', 'style3', 'style4'],

  styles: {
    bluebird: {
      show: true,
      kind: 'lineart', // a single-stroke SVG drawing, like assets/face-line.svg
      artwork: 'assets/face-line.svg',
      title: 'Bluebird Wellness',
      subtitle: 'Doctor-led IV clinic, London',
      url: 'https://toffzzzz.github.io/bluebird-wellness/',
      linkText: 'View the live site →',
    },
    everest: {
      show: true,
      kind: 'everest-ac', // the air-conditioning animation copied from the Everest site
      title: 'Everest Climate Solutions',
      subtitle: 'Air conditioning installation',
      url: '', // add the live site URL here; the link stays hidden until then
      linkText: 'View the live site →',
    },
    style3: {
      show: false,
      kind: 'lineart',
      artwork: 'assets/styles/placeholder-style.svg',
      title: 'Style three',
      subtitle: 'Short description',
      url: '',
      linkText: 'View the live site →',
    },
    style4: {
      show: false,
      kind: 'lineart',
      artwork: 'assets/styles/placeholder-style.svg',
      title: 'Style four',
      subtitle: 'Short description',
      url: '',
      linkText: 'View the live site →',
    },
  },

  /* ---------- Everest air-conditioning animation ----------
     Copied from the Everest site's coolScene.js SETTINGS. */
  everest: {
    temperature: { from: 32, to: 18 }, // the original counts 32 → 18°C
    flap: { half: 27, open: 22, crossfade: 0.03 }, // as in the original
    colors: {
      warmBackground: '#FBE3D0', // hazy peach (original)
      neutralBackground: '#F8F4F1', // passed through halfway (original)
      coolBackground: '#F7F5F0', // original: #F6F9FD; here the page background so the room cools back into the page
      warmNumber: '#B4532A', // terracotta (original)
      coolNumber: '#0F2E5A', // Everest Deep Blue (original)
      label: '#4B607D', // Everest Slate, "Room temperature" (original)
    },
    // The original's phases, as fractions of its pinned scroll. Only the
    // parts belonging to the AC animation are used (intro, cooling, "Just right").
    phases: { introEnd: 0.06, coolingEnd: 0.85, justRightEnd: 0.88 },
    duration: 7, // phones: seconds for the whole animation
    scrollLength: 0.6, // laptops: screen heights of scrolling for the whole animation
  },

  /* ---------- Finale ---------- */
  finale: {
    heading: 'Tell us what you need',
    font: null, // null = the same font as phrase 4
    size: 1.0,
    pinLength: 2.2, // laptops: screen heights the finale stays pinned while it plays
    rowScale: 0.42, // how small the row of previews gets at the top
    durations: { slideIn: 1.6, rowUp: 1.2, chatRise: 0.9 }, // seconds
  },

  /* ---------- Chat box ---------- */
  chat: {
    mode: 'demo', // 'demo' (sends nothing) or 'live'
    // Live mode only: your form service endpoint, e.g. 'https://formspree.io/f/xxxxxxx'
    formEndpoint: '',
    // Live mode is only allowed once this is set (a page on your site)
    privacyPolicyUrl: '',
    placeholder: 'A website for my clinic, with online booking…',
    sendLabel: 'Send',
    thanks: "Thanks! We'll be in touch soon.",
    demoNote: "Demo: please don't enter personal details yet",
    privacyNote: 'We only use what you write here to reply to you.',
    consentLabel: 'I agree to {studio} using my message to reply to me.', // {studio} = studioName,
  },

  /* ---------- Breakpoints ---------- */
  breakpoints: {
    phone: 767, // px and below: phone layout, animations play by themselves
  },
};
