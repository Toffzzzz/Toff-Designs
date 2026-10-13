# Toff Studio portfolio: design values

The exact values the site uses, as of Round 05 (the showcase rebuild). They live in three places that must always agree: this file, the CSS variables in `assets/shared/tokens.css`, and `settings.js`. `assets/shared/boot.js` (loaded straight after `settings.js` on every studio page) writes the colours (`colors.*`) and the motion tokens (`motion.*`) from `settings.js` over the defaults in `tokens.css`, so the owner changes them in one place. **Whenever a value changes in `settings.js`, change it here and in `tokens.css` too.**

The design work behind these values (references, storyboard, risks) is in `rounds/round-05-plan.md`. Everything from Rounds 01 to 04 is kept, unchanged, under "History" at the end of this file.

## The design system

### Art direction

Midnight & Gold, kept quiet. The page is a dark sheet of paper and type does the work. Gold is spent sparingly: the one solid button ("Start a project" in the top bar), fine rules, selected states and the focus ring. Cormorant Garamond light for display, never bold; Work Sans for everything you read or press. Calm, generous spacing with a varied rhythm. 8px corners on controls and 12px on pictures; no borders around pictures; no glows. One easing family (quintic) for every interface movement, with durations that grow with distance. The cream-paper section ("How we work") is the one change of tone in the scroll; the deep midnight footer and the AI band are the only changes of shade. A still paper grain sits over everything and never moves.

What stays from earlier rounds: the headline "We sketch it. Then we build it." with "build" in gold italic, the one-line ink pen and its gold under-shadow, the cream-paper section with the torn edge, the still grain, the gold-line page transition, the skip link, the "This page is closed" 404 page and the craft line in the footer.

### Grid and breakpoints

| Range | Columns | Outer margin (`--margin`) | Gutter (`--gutter`) | Content max (`--content-max`) | Top bar (`--bar-h`) |
|---|---|---|---|---|---|
| under 700px (phone) | 4 | 16px | 16px | 100% | 56px |
| 700 to 1023px (tablet) | 8 | clamp(24px, 4vw, 40px) | 24px | 100% | 64px |
| 1024 to 1679px (laptop) | 12 | clamp(40px, 4.4vw, 64px) | clamp(24px, 2.2vw, 32px) | 1312px | 64px |
| 1680px and wider | 12 | centred | 32px | 1440px; type has stopped growing | 64px |

`--measure` 60ch for paragraphs; `--measure-lede` 40ch for ledes. The phone breakpoint is 700px (`handwriting.breakpoint` in settings.js): below it the top bar shows the name, "Start a project" and Menu (a full-screen menu), and the motion rules play parts by themselves. Helpers: `.wrap` (centred content width) and `.grid` (the columns above). At 320px nothing scrolls sideways (the bar's button reads "Enquire" below 360px). At 2560px the content sits centred at 1440px.

### Type

Cormorant Garamond (variable, 300 for display, never bold; italic 400 for "build" and captions) and Work Sans (400 text, 500 buttons and labels), self-hosted in `assets/studio/fonts/` (SIL Open Font License 1.1, see CREDITS.md). The `@font-face` rules are at the top of `tokens.css`. Pages preload the Cormorant roman and Work Sans regular files.

| Token (class) | Font | Size | Line height | Use |
|---|---|---|---|---|
| `--fs-display-xl` (`.t-display-xl`) | Cormorant 300 | clamp(52px, 6.6vw, 100px) | 0.92 | The hero headline |
| `--fs-display-l` (`.t-display-l`) | Cormorant 300 | clamp(40px, 5vw, 72px) | 1.0 | Chapter headings (h2) |
| `--fs-display-m` (`.t-display-m`) | Cormorant 300 | clamp(32px, 3.6vw, 56px) | 1.04 | Concept names, Lab titles, the footer's "Start a project →" |
| `--fs-display-s` (`.t-display-s`, `.t-caption` italic) | Cormorant 300 / italic 400 | clamp(22px, 2vw, 28px) | 1.2 | Sub-headings, italic captions |
| `--fs-lede` (`.t-lede`) | Work Sans 400, slate | clamp(17px, 1.3vw, 20px) | 1.5 | Lines under headings |
| `--fs-body` | Work Sans 400 | 17px | 1.6 | Body |
| `--fs-ui` (`.t-ui`) | Work Sans 500 | 15px | 1.2 | Buttons, links in bars, chips |
| `--fs-small` (`.t-small`) | Work Sans 400 | 15px | 1.5 | Captions, notes, meta |
| `--fs-fine` (`.t-fine`) | Work Sans 400 | 14px | 1.5 | Fine print only; nothing on the studio's pages is smaller |

Display letter-spacing -0.012em (`--tracking-display`); everything else 0 (no tracked capitals anywhere). Headings `text-wrap: balance`, paragraphs `text-wrap: pretty`. Prices and times use `.tnum` (tabular numerals). Proper quotes and apostrophes (’ “ ”), and a non-breaking space before units (32&nbsp;°C).

The pen (the one-line Hershey cursive) writes "Bluebird / Wellness" and "Everest Climate / Solutions" in Recent work, "Tell us what you need" above the concierge, and the footer signature. It is drawn, never set as a font; the real words are always in the page as text for screen readers.

### Spacing

4px base: `--s-1` 4, `--s-2` 8, `--s-3` 12, `--s-4` 16, `--s-5` 24, `--s-6` 32, `--s-7` 48, `--s-8` 64, `--s-9` 96, `--s-10` 128, `--s-11` 192.

Section rhythm, varied on purpose: `--section-s` clamp(48px, 6vw, 80px), `--section-m` clamp(72px, 9vw, 128px), `--section-l` clamp(96px, 12vw, 176px) (classes `.section-s/m/l`). The AI chapter uses l; the Lab band s; the rest m. The home page is at most 12 laptop screens (1440×900) long with Kind words and About hidden.

### Colours

| Token | Value | Use | Contrast | settings.js |
|---|---|---|---|---|
| `--bg` | #0E1628 | Page | | `colors.bg` |
| `--bg-deep` | #0A101E | Footer, the AI band, the hero stage's paper | | `colors.footer` |
| `--tint` | #1A2541 | Raised areas, inputs, chips | | `colors.tint` |
| `--text` | #F6F0E4 | Headings and body | 15.9 : 1 on bg | `colors.text` |
| `--ink` | #F1E3C6 | Lines, links, outlines | 14.2 : 1 on bg | `colors.ink` |
| `--slate` | #A7AFC2 | Quiet text | 8.2 : 1 on bg, 6.9 on tint | `colors.slate` |
| `--gold` (also `--accent`) | #D8AC5F | The one solid button, fine rules, selected states, focus ring | 8.6 : 1 on bg; bg text on gold 8.6 | `colors.accent` |
| `--line-shadow` | rgba(216, 172, 95, 0.38) | The gold under-shadow | | `colors.lineShadow` |
| `--hairline` | rgba(216, 172, 95, 0.22) | Fine rules | | `colors.hairline` |
| `--error` | #F2A7A0 | Form messages | 9.3 : 1 on bg | `colors.error` |
| `--paper` | #F1EADC | The cream-paper section | | `colors.paper` |
| `--paper-text` | #141C2E | Text on paper | 14.2 : 1 | `colors.paperText` |
| `--paper-quiet` | #4C5468 | Quiet text on paper | 6.3 : 1 | `colors.paperQuiet` |
| `--paper-line` | #8F6A2A | Lines on paper only (never text) | 4.1 : 1 | `colors.paperLine` |
| `--paper-accent` | #7E5E24 | Gold-ish text on paper | 5.0 : 1 | `colors.paperAccent` |

Inside `.paper` (the cream-paper section, torn edge above and below as a mask, so it follows `--paper`), `--text`, `--slate`, `--ink` and `--gold` point at the paper colours, so anything placed on it reads correctly.

The pen's colours are separate settings, because the handwriting engine takes them as options: `handwriting.color` #F1E3C6 (the same as `colors.ink`) and `handwriting.shadow.color` rgba(216,172,95,0.30). **If you change `colors.ink` or `colors.lineShadow`, change these two to match.**

Focus ring: 2px solid gold, 3px offset (on paper: 2px `--paper-text`). Hover effects only inside `@media (hover: hover)`; pressed states move 1px down over `--dur-press`. A disabled button says why, beside it.

### Shape

`--radius` 8px (buttons, chips, inputs, segmented controls); `--radius-media` 12px (the stage, film screens, preview windows, the AI frame, stills); `--radius-panel` 18px (the concierge sheet). True circles only for dots, radio buttons and the brush cursor. No borders around pictures: the hero stage is separated from the page by its deeper paper, not a line.

Two button styles, both 44px tall with 8px corners and Work Sans 500 at `--fs-ui`:

- `.btn-gold`, the one solid button (gold, midnight text, 8.6 : 1), used once: the top bar's "Start a project". On paper it turns paper-text with paper-coloured text.
- `.btn-line`, the secondary button: the raised tint with a gold outline at 55% and text-coloured words (about 14 : 1); the outline turns full gold on hover. Used for every other button, such as "Send this to Toff", "Download your brief" and the Lab pieces' main actions (`.lp-btn--line` in the pieces' kit). On paper: no fill, a paper-text outline and paper-text words.

Everything else is a text button or a text link (`.link-arrow` for "Read the case study →").

### Motion tokens

| Token | Value | Use | settings.js |
|---|---|---|---|
| `--ease-out` | cubic-bezier(.22, 1, .36, 1) | Everything that arrives (JS: `ease.out`, 1 − (1 − t)^5) | `motion.easeOut` |
| `--ease-in-out` | cubic-bezier(.83, 0, .17, 1) | Things that move from one place to another | `motion.easeInOut` |
| `--ease-in` | cubic-bezier(.64, 0, .78, 0) | Things that leave (rare) | `motion.easeIn` |
| `--dur-press` | 100ms | Pressed states | `motion.pressMs` |
| `--dur-quick` | 180ms | Hover, chips, toggles | `motion.quickMs` |
| `--dur-base` | 280ms | Menus, disclosures, segmented controls, panels | `motion.baseMs` |
| `--dur-reveal` | 560ms | Fade-ups (16px rise), confirmation cards | `motion.revealMs` |
| `--dur-move` | 900ms | Headline lines, stage swaps, large travels | `motion.moveMs` |
| `--dur-line` | 1400ms | The gold line dropping from the stage | `motion.lineMs` |
| `--rise-s` / `--rise-m` / `--rise-l` | 8px / 16px / 32px | Distances | `motion.riseSmallPx` / `riseMediumPx` / `riseLargePx` |
| `--stagger-lines` | 90ms | Headline lines only | `motion.staggerLinesMs` |
| `--stagger-rows` | 60ms | List rows, at most five | `motion.staggerRowsMs` |

Duration grows with distance: about 200ms + 1.2ms per pixel, capped at `--dur-move` (`durationFor(px)` in motion.js). Nothing linear in the interface (the pen and the films follow the scroll, which is not an interface easing). Every animation can be interrupted.

### The pen (settings.js `handwriting`)

The handwriting engine (`assets/handwriting/handwriting.js`) and its settings carry over from Round 02; `assets/shared/motion.js` reads the same settings, so every part of every studio page follows one set of rules.

| What | Value | Setting |
|---|---|---|
| Ink colour | #F1E3C6 | `handwriting.color` |
| Stroke | 3.2px on laptops, 2.6px on phones, round ends and joins | `handwriting.strokePx` |
| Gold under-shadow | rgba(216,172,95,0.30), 3.5px below, 1.2px wider than the line, no blur, trailing the pen by 0.22s | `handwriting.shadow` |
| Laptops: a name writes while it moves from 86% to 56% down the screen | 0.86 / 0.56 | `handwriting.writeStart`, `writeEnd` |
| Laptops: where the pen sits while the last line runs down / while the line runs in from the top | 0.62 / 0.7 | `handwriting.tailTip`, `entryTip` |
| Laptops: the pen follows the scroll within 0.12s and never draws faster than 3400px a second | 0.12 / 3400 | `handwriting.ease`, `maxSpeedPx` |
| Parts that draw themselves (coming back, jumps) | 820px a second | `handwriting.autoSpeedPx` |
| Phones: pen speed, and where on screen a part starts | 620px a second; 0.82 (82% down the screen) | `handwriting.phoneSpeedPx`, `phoneTrigger` |
| Phone layout below | 700px | `handwriting.breakpoint` |
| A scroll of more than this many screens at once is a jump | 1.2 | `handwriting.jumpScreens` |
| Wait after loading for the browser's late scroll restore | 450ms | `handwriting.settleMs` |
| Laptops: each joining line gets at least this share of the scroll | 0.38 | `handwriting.minLinkScroll` |
| The first part writes as you scroll to it (not on load) | false | `handwriting.introOnLoad` |

The two names are laid out through four `LAYOUTS` in `tools/handwriting/build_line.py` (bluebird and everest, desktop and mobile), always on two lines with a pen lift. `line-data.js` and the line SVG/JSON are only ever regenerated with that script (it must print no WARNING), never edited by hand. `assets/face-line.svg` is never redrawn or retraced.

### Settings kept for retired parts

These values are still in settings.js, unchanged, but only the retired Round 02 to 04 parts read them (see README.md, "Retired files"); no Round 05 page uses them: `opening` (sketchSeconds 2.3, overlap 0.45, pressAt 0.25, revealDuration 1.25, lineDuration 0.9), `showcase.ease` 0.28, `stylePicker.drawSeconds` 1.1 and `reveal` (durationMs 600, risePx 12). Round 05's fade-ups use `motion.revealMs` and `motion.riseMediumPx` instead.

### The hero stage (settings.js `hero`)

The stage shows one of the studio's sites drawn live as a pen-and-pencil sketch in cream ink on deep-midnight paper (`assets/shared/sketch-shader.js`, raw WebGL2). The visitor paints the finished site back in.

| What | Value | Setting or file |
|---|---|---|
| Stage shape | 2.4 : 1 on laptops (1024px and wider), 1.6 : 1 on tablets, 358 : 470 on phones; its height shrinks on short laptop screens so the caption row stays on the first screen, never below 360px | `assets/home/home.css` |
| Paper | `--bg-deep` #0A101E, 12px corners, no border | `tokens.css` |
| Idle time before a brush paints the site in by itself | 2500ms | `hero.idleMs` |
| How long that brush takes | 2000ms | `hero.autoPaintMs` |
| Painted share at which the finished site is shown and drawing stops | 0.98 | `hero.doneAt` |
| Brush radius | 9% of the stage's short side; soft splats sized by the pointer's speed, spreading a little at the edge like ink bleeding | `sketch-shader.js` |
| The reveal's edge | a thin, crisp gold line (no glow, no blur) | `sketch-shader.js` (`goldEdge`) |
| Textures | WebP, at most 2560px wide; laptop captures at 1440×600 (device scale 1.5), phone captures at 390×844 cropped to 358 : 470 | `tools/capture/hero.py` |
| First paint | the pre-rendered still sketch, `fetchpriority="high"`, sized, so it is the largest paint and nothing shifts | `index.html`, `assets/home/captures/hero/` |
| Order | Bluebird Wellness, Atelier Wren, Saltmarsh, Morrow Coffee, Hollis & Pine, Hart & Sons Plumbing, Everest Climate Solutions; "Another site →" returns to the first after the last | the `hero` list in `assets/home/captures/captures.json` |

How the sketch is drawn: edges (Sobel on luminance and colour, single-pixel, with non-maximum suppression) become ink lines; large dark areas get cross-hatching at two angles; a slow, low-frequency wobble makes it look hand-drawn; a fine paper grain sits over it. The reveal mask only ever grows. On phones the stage plays by itself when 60% of it is in view, a tap finishes it, and it keeps `touch-action: pan-y` so scrolling always wins. "Build it" finishes it for keyboard users (the stage itself takes no keys); "Another site →" swaps in the next site as a fresh sketch; nothing advances by itself. Without WebGL2 the still sketch cross-fades into the finished screenshot; with reduced motion or Save-Data the finished screenshot is shown and nothing moves. The caption under the stage always says which site it is and whether it is a client's site or a concept. When the painting finishes, a line in the pen's cream ink with its gold under-shadow drops from the bottom centre of the stage into Recent work (`--dur-line`).

### The AI features (settings.js `ai`)

| What | Value | Setting |
|---|---|---|
| The Worker's address | https://toff-sketch-ai.toffdesigns.workers.dev | `ai.workerBase` |
| Routes (each is workerBase + route unless a full address is given; '' answers from the page only) | /chat, /read-sketch, /agent, /concierge, /brief, /design | `ai.chatEndpoint`, `readSketchEndpoint`, `agentEndpoint`, `conciergeEndpoint`, `briefEndpoint`, `designEndpoint` |
| Live answers per visit (counted separately for the AI demo, the concierge and Describe) | 8 | `ai.maxLiveAnswers` |
| Time-out until the first streamed word | 12000ms | `ai.firstWordTimeoutMs` |

Answers stream in word by word, with no bouncing dots. Each AI part says plainly whether it is answering live or from the page.

### Address

`siteUrl` in settings.js (`https://toffzzzz.github.io/Toff-Designs/`): canonical links, link previews, JSON-LD and sitemap.xml are built from it.

### The shell (assets/shared/shell.js, shell.css)

- **Top bar:** 64px (56px on phones), see-through at the very top, solid midnight with the gold hairline once the page moves. "Toff Studio" (Cormorant 26px; 23px on phones), then Work, AI, Design yours, The Lab (Work Sans 15px, slate; the section you're reading is underlined in gold), then "Start a project" (the one gold button, 44px tall). It stays on screen while scrolling (`topbar.hideOnScroll` false); set it to true and the bar slides away (280ms) while you scroll down and comes back as soon as you scroll up or tab into it. Phones: name, "Start a project", Menu; the menu fills the screen with the four links in the serif and the two case studies, the rest of the page is inert while it's open, Escape or Close shuts it and focus returns to Menu.
- **Links** jump straight to their section, land 12px below the bar and add no #fragment; from other pages they go to `index.html#id` (the home page removes the fragment on arrival, and maps old addresses through `aliases`).
- **"Start a project"** dispatches `toff:concierge-open` on document; without a concierge it goes to #contact on the home page.
- **Skip link** first in the tab order, shown below the bar when focused.
- **Footer** (deep midnight, gold hairline above): the signature written by the pen (gold, 132px wide, 70 font units a second, once when reached), the name, "Start a project →" (Cormorant 300 at `--fs-display-m`, gold), "Plan it with our helper", the two case studies, the Lab, Email and Privacy policy (hidden until set), other legal pages, social links, the craft line (this page's real load time and weight, and the time in London) and ©.
- **Floating-button slot** bottom right (16px from the edges, safe areas respected). The concierge puts its "Plan with us" button there; it is the only floating control, and it hides over the hero, the footer, the AI demo, the Design yours controls and the inline concierge, while a dialog is open, wherever it would cover text or a control, and on phones on the home page.
- **Gold-line page transition:** cross-document View Transitions (`@view-transition { navigation: auto }` in tokens.css, with a `.vt-rule` element): the old page dims, the new one is wiped in behind a 2px gold line (760ms, `--ease-out`). Browsers without it simply change page; off with reduced motion. The Lab uses the same line inside the page when a piece opens.

### The concierge

One component in two places: inline under "Tell us what you need", and as a panel (docked on the right from 1024px, a full-height sheet below, `--radius-panel` 18px). The conversation sits beside the brief, which fills in field by field and can be edited directly. Its header says it is an AI, that questions go to Anthropic and aren't stored, and asks visitors not to type personal details. "Prefer a form? →" swaps in a short form.

### The concept sites (work/<slug>/)

Five complete websites for made-up businesses. None of them uses the studio's own devices (an italic word in an accent colour, cream ink on midnight, the gold line); each has its own palette, fonts and one signature moment. Fonts are OFL, self-hosted as woff2 Latin subsets from @fontsource 5.3.0. Contrast ratios were measured (plan section 5). Every page ends with the concept ribbon (`assets/shared/ribbon.js`), in the page flow, never fixed: "A concept site by Toff Studio. <Name> is made up." and "Back to Toff Studio". With `?embed=<feature>` a site shows only that feature, without the ribbon or the menu. Every page carries `<meta name="robots" content="noindex">`.

| Site | Mood | Palette (with contrast) | Fonts | Signature |
|---|---|---|---|---|
| Saltmarsh, a restaurant in Bermondsey | Bold: a candlelit room on a weeknight, with the menu card as the main character | night #17110E page, room #221915 raised, candle #F4E8D4 text (15.4 : 1), linen #BFA88C quiet (8.2), ember #E8804A accent (6.8; buttons with night text 6.8), brine #8FB5A6 dietary marks (8.3) | Fraunces (display), Schibsted Grotesk (text and the menu) | Heat and steam rising off the hero dish: a WebGL distortion over the photo, running in a worker only while on screen; still with reduced motion. Device: a printed menu card with dotted leaders and tabular prices |
| Morrow Coffee, a café in Hackney | Calm: a bright corner café at half past seven | crema #F6EEE3 page, oat #EBDDC9 raised, foam #FFF9F1 cards, roast #2B1D14 text (14.2), grounds #6B5546 quiet (6.1), terracotta #A8482A accent (5.0; buttons with foam text 5.5) | Young Serif (display), Figtree (text); hand-drawn accents in roast, 1.75px, round caps, no shadow | Build your drink: a cup in cross-section whose layers slosh and settle with spring physics as the drink changes, with the price updating |
| Atelier Wren, a hair studio in Marylebone | Classic: a fashion magazine's quiet issue | paper #F4EFE7 page, ink #111111 text (16.5), smoke #5E5750 quiet (6.2), rose #8A5459 the one accent (5.3), blush #E8D6D2 fills; dark spreads in ink with paper text and petal #D9B3B5 (10.0) | Bodoni Moda (display, very large), Hanken Grotesk (text) | A lookbook where a picture flows into its detail page and back (shared-element View Transitions), and a before-and-after wipe you drag or move with the arrow keys |
| Hollis & Pine, clothing and ceramics in Islington | Fresh: a gallery shop on a bright morning | chalk #FAFAF7 page, white cards, birch #22261F text (14.7), moss #5C6656 quiet (5.8), sage-deep #3E4D3A buttons (8.6), sage #8A9A82 fills only, mist #E4E9DF surfaces, clay #9A5A43 accent (5.1), clay-mist #EFE4DA surfaces | Albert Sans throughout (300 display, 400 text, 500 buttons) | A ceramic vase drawn live with three.js r186 from a lathe profile, in matte, satin, gloss and speckled glazes; drag to turn it; it turns once when it first appears, then waits; loads only when near |
| Hart & Sons Plumbing, west London | Practical: a well-run van, with numbers you can trust at a glance | off-white #F5F3EE page, charcoal #1F2326 text and dark bands (14.3), pewter #565C61 quiet (6.1), copper #9C5424 accent (5.1; buttons with white text 5.7), bright copper #E0915A on charcoal (6.3), steel #B9BEC2 quiet on charcoal (8.5) | Archivo (weight and width axes; wide bold numerals for prices) | An instant quote whose price range builds itself line by line, with the call-out fee shown first, and a map of the covered area that draws itself in line, with a postcode check |

The made-up details (menus, prices, stylists, makers, addresses, phone numbers in Ofcom's drama range 020 7946 0000 to 0999) are listed in DECISIONS.md. Real emergency numbers stay real: 999, NHS 111 and the gas emergency line 0800 111 999.

### The case studies (work/bluebird/, work/everest/)

The same look and shell as the home page. Each tells the project in order: what the business needed, the sketch, what we built, the highlights as moving captures, and a way to see it ("Visit the live site" for Bluebird; "Live site coming soon" for Everest while `links.everest` is empty). Only real pictures of the two projects (screenshots and captures, never AI-made ones), and only facts already in the repo. Everest's cooling scene keeps its warm-to-cool light and its number colours (warm rgb(242,166,90) 8.9 : 1, cool rgb(169,205,240) 10.9 : 1 on midnight), counting from 32 to 26&nbsp;°C.

### The Lab (lab.html, assets/lab/)

An exhibition. The index is a gallery wall: a list of large titles (`--fs-display-m`), each with one line on what it is and what it's good for. No card grid, no numbering. On laptops (a fine pointer, 1024px and wider) a still (480×300, 12px corners) sits in a column on the right and slides to the row you hover or focus (`--ease-in-out`, 280ms); on phones each still sits under its title (358×200). A piece opens full-screen at `lab.html#<id>` with a quiet caption bar (deep midnight at 92%, no blur): the title in the serif, how it's made in one sentence, "Good for: …", Pause, Previous, Next and All experiments. The order: Sketch to site, Your initials in liquid gold, A million specks, Shape a vase, Ink that moves, Letters with weight, Your logo in one line, The making of this site. Low-powered devices (4 cores or fewer, 4 GB of memory or less, or Save-Data) and reduced motion get the still with a "Play" button. Kinetic type and decorative effects are allowed here, because each piece is an exhibit.

The Lab's settings (settings.js `lab`):

| What | Value | Setting |
|---|---|---|
| A device with this many processor cores or fewer counts as slower (each piece opens as a still with Play, then runs a lighter version) | 4 | `lab.lowPowerCores` |
| …or with this much memory or less (GB; not every browser reports it) | 4 | `lab.lowPowerMemoryGB` |

## Motion rules (every page, including the concept sites)

- **Laptops** (a fine pointer, 700px and wider): animations are driven by scrolling at a natural speed, starting only once that part is on screen. Progress is a high-water mark: it never goes backwards, and it eases after the scroll without rushing.
- **Phones** (and tablets with a finger): each part plays by itself at a natural speed when it reaches 82% down the screen.
- **Never** reverses, replays, snaps back or freezes half-way while on the page; once something starts, it finishes.
- **No pinning.** The content always moves with the scroll: a fixed background that changes is fine, a section that stops is not. The only fixed or sticky things are the top bar and the concierge's button (and a Lab piece, which fills the screen while it is open). The concept ribbon is in the page flow.
- **Coming back** (Back/Forward with or without bfcache, Safari's late scroll restore): you stay where you were; what's on screen plays again, what's above plays as you scroll back up. Jumping down plays what you land on. No `unload` listeners anywhere.
- **A fresh visit opens at the top**, and in-page links add no #fragment.
- **Reduced motion** shows everything finished, with no animation.
- **Interactive pieces:** anything that answers the pointer or a finger isn't a "replay"; any automatic motion stops for good the moment the visitor takes over; nothing advances by itself (no carousels); anything that moves by itself for more than five seconds has a pause control (WCAG 2.2.2).
- One module holds these rules for every studio page: `assets/shared/motion.js` (ported from the handwriting engine, using its settings). The concept sites follow the same rules with their own code.

## Not template-looking (the not-AI-made rules)

A design-literate visitor should never think "AI made this" or "template". These rules apply to every page; the concept sites follow them too, except that a shop may have a product grid. The `copy` test suite checks the wording rules automatically; the ai-tells-auditor reviewer checks the rest from screenshots. The record of every change made under these rules in Rounds 03 and 04 is in History below ("Not template-looking (Round 03)").

1. **No labels or eyebrows above headings**, and no heading that repeats its label.
2. **No spaced-out capitals** (uppercase with letter-spacing) on the studio's pages.
3. **No 01 / 02 / 03 numbering** without a real sequence, and no giant numerals.
4. **No equal card grids or stat rows** on the studio's pages (no icon, heading, text three or four in a row; no big number with a small label repeated).
5. **No slogans, stock words or em dashes** in visible text: no forced contrasts ("Not X. Y."), no slogan triplets, none of bespoke, seamless, elevate, effortless, world-class, supercharge, unlock, delve, crafted, and no chirpy filler. Sentence-case headings without full stops.
6. **No glows, blur, halos or gradient text**; no glassmorphism, neon, decorative grid backgrounds, floating particles, hairline border with a big soft shadow, or thick side stripes.
7. **8px corners on buttons and chips**; no pill buttons mixed with square ones.
8. **No decorative motion**: nothing pulsing, bouncing, blinking, marquees, elastic easing, or images that zoom on hover.
9. **No fake window chrome** (three dots) on anything that isn't a drawing of a window.
10. **Varied rhythm**: not every section is heading, paragraph, grid.
11. **Every effect has a job**: it shows the work, explains the process or lets the visitor try something. Anything else goes, however clever.
12. **Few colours**: no colour bands that change every section.

### Added in Round 05

13. **The four phrases are retired.** "You plan", "We design", "We deliver", "So... what will it be?" were a slogan triplet by these rules. The pen now writes the names of the work and "Tell us what you need".
14. **Kinetic headings are retired** on the main pages (headings that thickened under the pointer). They stay allowed in the Lab, where type experiments are exhibits.
15. **Lists instead of grids.** The concept sites are an editorial list of five rows (name in the serif, kind of business and area, the signature in a few words, "Open the site →"); the Lab index is a list of large titles; "Other AI we build" is six plain lines; What's included is a plain list. Hart & Sons' "What happens on the day" is not a numbered list.
16. **One gold solid button.** Only the top bar's "Start a project" is solid gold. "Send this to Toff", "Download your brief" and the Lab pieces' main actions use the outlined secondary button; other actions are text buttons or links.
17. **Streaming, not typing dots.** AI answers appear word by word as they are written; there are no bouncing dots or pulsing "thinking" states.
18. **The hero's gold edge is a crisp line**, with no glow or blur, and the stage is separated by tone, not a border.
19. **No sample reviews, ratings or testimonials anywhere**: SiteKit's reviews section is an empty, clearly labelled space ("Your own reviews will show here"); the concept sites have no reviews, star ratings, awards, accreditations, guarantees or "years in business"; Kind words stays hidden until a real quote is set.
20. **The concept sites don't look like the studio or like each other**: none uses an italic accent word, cream ink on midnight or the gold line; each has its own palette, fonts and one named signature moment. Saltmarsh's first screen is not a plain split hero.
21. **Device frames are drawn as line**, in the studio's ink, around real screenshots and captures; there are no fake browser bars.
22. **Captions say what a thing is**, plainly: "Bluebird Wellness, a client’s site" / "Saltmarsh, a concept site".
23. **Plain microcopy for AI parts**: the header line says whether an answer is live or worked out on the page, and the concierge never uses filler ("Lovely!", "Great question!").

---

# History

Everything below is the record of Rounds 01 to 04, kept unchanged. It describes parts that Round 05 retired or replaced (the opening, the four phrases, the showcase pictures, the six-step enquiry, the Sketch lens, the kinetic headings, round 04's top bar). Where it disagrees with the sections above, the sections above are current.

This file began, before Round 05:

> The exact values used by the site (Round 02: Midnight & Gold; Round 03: Work Sans, the top bar, the portfolio sections and the Lab). **Keep this file and `settings.js` in sync:** whenever a value changes in one, update the other. The colours are defined on `:root` in `site.css` and overwritten from `settings.js` (`colors`) when the page loads. Round 01's values (light page, navy ink) are in git history and on the `backup-before-round-02` branch.

## Colours

| Name | CSS variable | Value | Where it's used | settings.js |
|---|---|---|---|---|
| Midnight | `--bg` | `#0E1628` | The whole page, the solid top bar and its menu | `colors.bg` |
| Cream ink | `--ink` | `#F1E3C6` | Every drawn line, links, outlines, the quotes, footer text | `colors.ink` |
| Text | `--text` | `#F6F0E4` | Headings and body text | `colors.text` |
| Slate | `--slate` | `#A7AFC2` | Quiet text, descriptions, placeholders, fine outlines (40%) | `colors.slate` |
| Gold | `--accent` | `#D8AC5F` | Fine rules, the one solid button, selected states, the enquiry's "Step 1 of 6" and summary notes, the footer's "Start a project" | `colors.accent` |
| Tint | `--tint` | `#1A2541` | Raised areas: inputs, choice buttons, a selected picker card | `colors.tint` |
| Gold under-shadow | `--line-shadow` | `rgba(216, 172, 95, 0.38)` | The shadow under every line (opening sketch, showcase drawings, picker icons) | `colors.lineShadow` |
| Deep midnight | `--bg-deep` | `#0A101E` | The footer (the only change of shade), with a fine gold hairline (`--hairline`, gold at 22%) above it | `colors.footer` |
| Error | `--error` | `#F2A7A0` | Enquiry messages when something is missing | `colors.error` |

**The handwriting colour lives in `settings.js`** (`handwriting.color` `#F1E3C6` and `handwriting.shadow.color` `rgba(216,172,95,0.30)`), because the handwriting engine takes its colours as options rather than from CSS. It is used by the handwriting line, the finale's "Tell us what you need" and the "So... what will it be?" reprise. **If you change `--ink` or `--line-shadow`, change these two to match.**

The opening's finished website (`assets/opening/opening.css`, `.op-real`) keeps its own light colours on purpose: it's a client's site. The Everest picture keeps its warm-to-cool glow and its number colours (orange `rgb(242,166,90)` → icy blue `rgb(169,205,240)`) from `assets/showcase/`.

### Contrast (WCAG AA; measured from the rendered page by the site checks)

| Text | On | Ratio |
|---|---|---|
| Text `#F6F0E4` | Midnight | 15.9 : 1 |
| Text | Tint | 13.4 : 1 |
| Cream ink `#F1E3C6` | Midnight | 14.2 : 1 |
| Cream ink | Deep midnight (footer) | 15.0 : 1 |
| Cream ink | Tint | 12.0 : 1 |
| Slate `#A7AFC2` | Midnight | 8.2 : 1 |
| Slate | Tint | 6.9 : 1 |
| Slate | Deep midnight | 8.6 : 1 |
| Slate at 85% (input placeholder text) | Tint | 5.4 : 1 |
| Gold `#D8AC5F` | Midnight | 8.6 : 1 |
| Gold | Deep midnight | 9.0 : 1 |
| Gold | Tint | 7.2 : 1 |
| Midnight text | Gold (the button) | 8.6 : 1 |
| Error `#F2A7A0` | Midnight | 9.3 : 1 |
| Error | Tint | 7.8 : 1 |
| Everest number, warm `rgb(242,166,90)` | Midnight | 8.9 : 1 |
| Everest number, cool `rgb(169,205,240)` | Midnight | 10.9 : 1 |

## Typography

Self-hosted in `assets/studio/fonts/` (SIL Open Font License, see CREDITS.md). The `@font-face` rules are at the top of `site.css`.

| Text | Font | Size |
|---|---|---|
| Opening headline "We sketch it. Then we build it." | Cormorant Garamond 400 (from `opening.css`, as delivered) | clamp(34px, 5.2vw, 64px) |
| Opening's supporting line, under the headline | Work Sans, slate | clamp(16px, 1.3vw, 18px) |
| Section headings (`.r3-h2`) | Cormorant Garamond 300, sentence case, no full stop; on laptops letters thicken towards 680 under the pointer (kinetic type) | clamp(36px, 5vw, 64px), line-height 1.04 |
| Intro text under a heading (`.r3-lede`) | Work Sans, slate | clamp(16px, 1.3vw, 18px), at most 52 characters wide |
| Quotes ("Kind words") | Cormorant Garamond 300, cream | clamp(28px, 3.4vw, 44px) |
| Enquiry questions | Cormorant Garamond 300 | clamp(28px, 3vw, 40px) |
| "Step 1 of 6", the enquiry summary's labels | Cormorant Garamond italic 400, gold | 18px / 17px |
| Placeholder and Concept notes | Cormorant Garamond italic 400, slate, sentence case (a quiet note, never a badge) | 15–16px |
| Body | Work Sans 400 | 17px, line-height 1.6 |
| Buttons | Work Sans 500 | 15px (top bar 14px) |
| Example client sites inside the demos | Inter (and each mood's own heading font), from `minisite.css` | — |
| Handwriting | Hershey cursive (single line), built into `assets/handwriting/line-data.js` | Laptop: 5.6 (phrases 1–3), 4.2 (phrase 4) font units per unit on a 1440-wide drawing. Phone: 2.6 on a 400-wide drawing |
| Enquiry heading "Tell us what you need", footer signature | The same Hershey cursive, flat ink, from `assets/studio/inkwriter-data.js` | Fills the column (`.ct-write`, up to 760px); signature 132px wide |

`--sans` is `"Work Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; `--serif` is `"Cormorant Garamond", Georgia, serif`. Cormorant Garamond is never set bold (only the kinetic effect thickens letters briefly). Text columns are no wider than about 60 characters (`--measure`).

## Lines

| Value | Setting |
|---|---|
| Handwriting stroke: 3.2px laptops, 2.6px phones, round ends and joins | `handwriting.strokePx` |
| Gold under-shadow: 3.5px below, 1.2px wider, no blur, trails the pen by 0.22s | `handwriting.shadow` |
| Opening sketch, showcase drawings, picker icons: their own stroke widths with `drop-shadow(0 2.5px 1.1px var(--line-shadow))` (as delivered) | `assets/*/…css` |
| Undrawn strokes are hidden (`visibility: hidden`), never a zero-length dash | — |

## Layout and spacing

- Sections (`.r3-section`, `assets/studio/studio.css`): clamp(56px, 8vw, 104px) top and bottom, 16px side gutter, content up to 1180px. The handwriting and showcase run full width.
- Intros vary: a split intro (heading left, text right; one column below 860px) for Recent work, Things we can build, How it works and What's included; heading over text for Try a look, Sketch your homepage and the Lab; About has the heading in a narrow left column and prose on the right.
- Top bar (`assets/studio/topbar.css`): 60px tall (56px on phones), see-through over the very top of the opening and solid midnight with a gold hairline as soon as the page moves; it doesn't hide while scrolling. In-page links land 12px below it (`site.js`), and leave no #fragment in the address.
- Corner radius: 8px for buttons, chips and inputs (`--radius`). Panels and pictures keep their own gentle corners (the drawing paper 10px, the preview window 12px, the planner 18px). Only true circles are round: the planner button on phones, dots, radio buttons.
- One solid button style (gold, midnight text, 8px corners): the top bar's "Start a project", the enquiry's Continue and Send, "Send this to Toff". Every other action is a text link or a quiet tint button.
- Footer: deep midnight, signature, "Start a project →" (gold serif), "Plan it with our helper", Email, Privacy policy, the Lab, then the craft line (this page's real load time, weight and London time) and the copyright.

## Motion (settings.js)

| What | Value | Setting |
|---|---|---|
| Opening sketch | 2.3s, strokes overlapping 0.45; press after 0.25s; colour spreads over 1.25s; line drops in 0.9s | `opening` |
| Laptops: a phrase writes while it moves from 86% to 56% down the screen | | `handwriting.writeStart`, `writeEnd` |
| Laptops: pen follows the scroll within 0.12s, never faster than 3400px/s | | `handwriting.ease`, `maxSpeedPx` |
| Self-drawing parts (coming back, jumps): 820px/s; phones: 620px/s, starting 82% down the screen | | `handwriting.autoSpeedPx`, `phoneSpeedPx`, `phoneTrigger` |
| A scroll of more than 1.2 screens at once is a jump (what you land on draws itself) | | `handwriting.jumpScreens` |
| Pictures follow their phrase within 0.28s | | `showcase.ease` |
| Picker icons draw in 1.1s, once | | `stylePicker.drawSeconds` |
| Fade-ups in What's included and Kind words: 600ms, 12px rise, once | | `reveal` |
| How it works: one gold line draws through the four steps when it comes into view (shown drawn with reduced motion) | | `assets/studio/process.js` |
| Enquiry heading and footer signature: written once in flat ink when they come into view | | `assets/studio/inkwriter.js` (mounted in `index.html`) |

## Breakpoints

- **Phones:** narrower than 700px (`handwriting.breakpoint`): phone layouts of the opening and the line, pictures under their phrases, parts play by themselves.
- **Top bar:** above 1100px: name, section links, "Sketch lens", "Start a project". 1001 to 1100px: the lens becomes an icon. 801 to 1000px: the name hides so everything fits on one line. 800px and below: name, "Start a project" and Menu (the menu lists every section, with the lens at the bottom on screens up to 480px). Over the opening it shows only the name, the lens and the button.
- **Sections:** split intros and two-column layouts become one column below 860px; What's included's list is one column below 600px.
- **Laptops/desktops:** 700px and wider: scroll-driven.

## Motion rules

- Laptops: driven by scrolling at a natural speed, starting only when on screen. Phones: each part plays by itself when it comes into view.
- Never reverses, replays, snaps back or freezes half-way while on the page; once something starts drawing, it finishes.
- Coming back (Back/Forward with or without bfcache, Safari's late scroll restore): you stay where you were, what's on screen plays again, what's above plays as you scroll back up. Jumping down plays what you land on.
- No pinning anywhere. The page opens at the top on a fresh visit (in-page links don't add a #fragment to the address).
- Reduced motion: everything shown finished, no animation.

## Not template-looking (Round 03)

A reviewer listed the tells that make a site look template- or AI-made. Every change made under those rules, across the whole site:

1. **No labels above headings.** Removed the gold "—— Process" and "—— Included" eyebrows and the small capitals "Kind words" caption; each section now starts with its heading. The opening's capitals line above the headline ("Toff Studio · Bespoke web design") is now a plain supporting sentence under it (delivered `opening.css`/`.html`).
2. **No spaced-out capitals.** The `.label` style (uppercase, .18em tracking) is gone, along with the uppercase "Placeholder" tags, the enquiry's "Step 1 of 6", the testimonial bylines and the enquiry summary's labels. Placeholder and Concept notes are quiet italic serif notes in sentence case. The showcase cards' "01 — Your brief" captions are now "Your brief" / "Recent work" in italic serif (delivered `showcase.css`/`.html`). Left as they are: the "Room temperature" label inside the Everest picture, the Everest concept screen and the "Bold" example site's buttons, because they reproduce client designs, not the studio's own pages.
3. **No 01 / 02 / 03 numbering, no giant numerals.** The Process section's 01–04 (gold, up to 72px) is replaced by How it works: one hand-drawn line through the four steps. "Step 1 of 6" stays: it's a real sequence the visitor needs.
4. **No equal card grids.** How it works: uneven columns at staggered heights instead of four equal ones. Concept studies: one large and two small. What's included: a plain list, not an icon grid.
5. **No hero-metric stat row.** The page-speed numbers appear once, as the footer's craft sentence.
6. **Copy.** Removed "Four quiet steps.", "What's included." (with its "Included" label), "Thank you. We'll be in touch personally." (now without the full stop), the "Bespoke websites…" title, description and footer line, and every em dash in visible text. Headings are sentence case without full stops. **Kept on purpose:** the six What's included items word for word, as the round asked, apart from "Bespoke design, never a template", which the owner changed to "Designed from scratch for your business" (round 03 AI follow-up); the opening's headline "We sketch it. Then we build it." as delivered; and two plain disclaimers that say what something is not ("not client work", "not a working site").
7. **No glows, blur or halos.** The planner's pins lose their gold halo ring. (The Everest picture's warm-to-cool glow stays: it is the client's animation, a deliberate round 02 exception.)
8. **8px corners on buttons and chips.** `--radius` goes from 12px to 8px (buttons, inputs, the enquiry's choices); the Lab's initials box and detail menu, and the planner's notes, also 8px.
9. **No decorative motion.** The typing dots in the chat demo and the planner are still instead of bouncing; the planner's pins drop in without overshooting. The Lab's code caret is steady (no blink). The one-line drawing's loading ring still turns, because it shows work in progress.
10. **No fake window chrome.** No three-dot window bars on the studio's own panels (the Lab's code editor shows file tabs only). The opening's sketch of a browser keeps its dots, because it is a drawing of a browser.
11. **Varied rhythm.** Split intros, a full-width handwriting moment, a narrow-left About, the What's included list beside its heading, and different section spacing (What's included sits closer to How it works).
12. **Copy, Round 04.** No "X, not Y" lines: the concept studies' "Designs we made to explore an idea, not client work" becomes "Studies we designed for made-up businesses, to try out ideas"; the Everest mock-up's "Placeholder · Concept screen…" note becomes "A mock-up of the design, until the live site is ready"; the handwriting cards' captions say what each one is ("A doctor-led IV clinic in London. We designed and built its site."). "Bespoke design, never a template" is now "Designed from scratch for your business" (round 03 AI follow-up). The plain "not client work" / "not a working site" disclaimers from item 6 are replaced where Round 04 rewrote the line.

## Round 04 design upgrade

Based on research into recent Awwwards winners, then tightened after a critical review by a juror and a first-time customer. All of it is in the delivered files (`assets/studio/`, `assets/opening/`, `assets/showcase/`); the values below are as delivered.

- **A large editorial headline.** The opening's "We sketch it. Then we build it." is set large (Cormorant Garamond, `clamp(46px, 7.2vw, 112px)`, line height .98), and each line rises out of its own slot (1.05s, `cubic-bezier(.22, 1, .36, 1)`, the second line .09s later), with **build** in gold italic. Reduced motion: shown in place.
- **The café in the opening drawing.** The drawn site is now "Morrow Coffee" (a made-up café) with real text, and its picture is a real photo (`assets/studio/playground/playground-cafe.webp`, passed by `site.js` to `Opening.mount`).
- **AI assistants** ("Your website can answer your customers for you"), a band in a deeper ink (`#0A101E`, the footer's midnight) straight after the handwriting: a chat demo for four made-up businesses whose taught facts the visitor can edit, and the other AI features the studio builds.
- **How it works on cream paper** (`#F1EADC`, text `#141C2E`, quiet text `#4C5468`, gold ink `#8F6A2A`) with a torn-paper edge: the one change of tone in the middle of the scroll.
- **A still paper grain**: a fine noise texture over the whole page at 5% opacity that never moves (`body::after` in `studio.css`; it replaces the round 02 grain in `site.css`). Hidden when printing.
- **A gold-line page transition** between the main site and the Lab (CSS View Transitions): the old page dims, the new one is wiped in from the left behind a 2px gold line that sweeps across (760ms). Switched off for reduced motion; browsers without View Transitions simply change page.
- **A skip link** ("Skip to content"), first in the tab order on every page, hidden until it has focus.
- **The 404 page** ("This page is closed"): a shop sign drawn in line with "Closed" handwritten on it, and links back to the main site, the Lab and Start a project. `404.html` in the site root, with absolute `/Toff-Designs/` paths and `noindex`.
- **The Lab teaser** ("There's more in the Lab"): a full-width band with real stills from the Lab, listing every experiment.
- **A simpler menu**: AI assistants, Work, Try it, How it works, The Lab (was seven links).
- **Balanced line breaks**: headings use `text-wrap: balance`, paragraphs `text-wrap: pretty`, so there are no lonely last words.
- **The four tools grouped into the Try it tabs** ("Try it with your own business": Pick a look, Sketch your homepage, Your logo in one line, Booking and other features), one at a time. Proper tabs (arrow keys, Home, End); links into a tool open its tab first. The page went from about 18 laptop screens to 14.
- **The handwriting cards** lose their small "Recent work" / "Your brief" labels; the caption says what each one is.
- **A softer AC glow** on the Everest picture (the client's warm-to-cool glow, kept from round 02, now gentler).
- **No studio caption under 14px** (the style picker's descriptions are at least 13px). On the real page this includes `site.css`'s enquiry demo note, its sent note and the footer's © line, raised from 13px to 14px.
- **Unfinished details hidden**: the "How long" notes, the price line in How it works, About's "Placeholder text" note and the footer's email and privacy lines are marked `data-unfinished`. They follow `showPlaceholders` in `settings.js` (now `false`: hidden); `?unfinished` in the address shows them all.
