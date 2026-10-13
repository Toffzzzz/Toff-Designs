# Round 05 plan: direction, design system and contracts

Written in Phase 1 (2026-10-13). This is the working plan for rounds/round-05.md. Where the two disagree, round-05.md wins. Sections 10 and 11 (the two contracts) are pasted word for word into the site-builder briefs and the Worker; change them only by adding a dated line to section 13.

Contents
1. The current site: what works and what doesn't
2. Ten references
3. The home page storyboard (1440 and 390)
4. Design system
5. The five concept sites: art direction
6. The Lab as an exhibition
7. Technical plan
8. Risks and how each is handled
9. Decisions made in this plan (owner to confirm)
10. Contract A: the message API between the AI demo and its frames
11. Contract B: SiteKit's spec schema, /design and /brief
12. Style frames and the cold critique
13. Changes to this plan

---

## 1. The current site: what works and what doesn't

Captured with scratch/phase1/capture_current.py (viewport frames while scrolling). Contact sheets: scratch/phase1/current/sheet-index-1440.png, sheet-index-390.png, sheet-lab-1440.png, sheet-lab-390.png.

Measured length: index.html is 13.8 screens at 1440×900 and 16.7 screens at 390×844; lab.html is 5.8 and 6.2.

Works:
- The headline "We sketch it. Then we build it." with "build" in gold italic: the one memorable typographic moment. Keep it, larger.
- The palette holds together; the cream-paper How it works with its torn edge is the only real change of tone and it lands.
- The AI assistants demo has real substance (facts, "From:" sources, editable panel). It is the most convincing part for a business owner.
- The footer signature and the craft line feel personal and true.
- The Lab's liquid-gold T and gold-speck lettering look expensive.

Doesn't work:
- Screens 2 to 5 at 1440 are mostly empty midnight with a thin line and small cards: four screens that show almost nothing. On phones, two consecutive frames are completely empty while the pen hasn't reached them; it reads as a broken page.
- The opening stage is small (about 45% of the width) and draws a mock café, not our work.
- The floating "Plan with us" button sits over text on phones (Recent work, the concept rows).
- Every section has the same shape: heading on the left, paragraph on the right, content below. Section headings are timid (about 40px at 1440).
- Concept studies are cramped thumbnails with cropped headlines; the four tools are hidden behind tabs with small previews.
- "Tell us what you need" is caught half-written ("Tel") when the visitor arrives at a normal pace; a large gap sits above the enquiry.
- The Lab is one long stacked page with no index; the pieces compete with each other.

---

## 2. Ten references

Researched on awwwards.com on 2026-10-13 (Sites of the Day to 13 October 2026, Sites of the Month to September 2026). We borrow principles, never looks. A pattern across all ten: Accessibility is the lowest developer sub-score on almost every winner (6.4 to 7.4). Beating them on usability and accessibility while matching their craft is our opening.

1. **Bruno's Portfolio** (Bruno Simon; SOTD 21 Jan 2026, SOTM Jan 2026; Creativity 8.62). The portfolio is itself the demo: you play with it instead of reading about it. Principle: the hero is something the visitor does (paint a site in), not something they watch.
2. **The Renaissance Edition** (Shopify Design; SOTD 9 Feb 2026, SOTM Feb 2026; Animations 9.40). A "hidden layer reveal" uncovers commerce under generative paintings. Principle: one reveal mechanic, carried through the whole story, and real working commerce inside the showpiece.
3. **Oryzo AI** (Lusion; SOTD 13 Apr 2026, SOTM Apr 2026; WPO 8.60). Turns an ordinary cork coaster into a cinematic product story. Principle: tell an ordinary thing (a café, a plumber) with extraordinary care; heavy WebGL can still score high on performance when it loads late and stops when done.
4. **L.I.S.A.** (Locomotive; SOTD 16 Sep 2026). An agency's conversational assistant as the front door, with microcopy credited as a feature and a real mobile layout. Principle: the concierge is designed as an interface with its own typography and microcopy, not a chat bubble bolted on.
5. **Heron AI** (Bearplus; SOTD 12 Oct 2026). An AI that suggests fixes and makes the edits once you approve, shown on a real dashboard. Principle: show AI acting on a real interface beside the conversation, with a clear confirmation of what it did.
6. **Son Daven** (The First The Last; SOTD 5 Jun 2026, SOTM Jun 2026; Responsive 8.40). A Carpathian venue where location, FAQ and contact modules are designed as carefully as the hero, in two colours. Principle: on a hospitality site the practical modules are the design; strict two-colour discipline per site.
7. **ERA Residence** (The First The Last; SOTD 31 Aug 2026, SOTM Aug 2026). One day/night switch changes the whole mood; listing cards carry real facts. Principle: one meaningful control that changes everything (Design yours' mood switch), and cards with facts rather than decoration.
8. **Floema** (Bürocratik; SOTD 13 May 2026, SOTM May 2026). Material shown in mouse-driven 3D to explain what the product is made of. Principle: 3D only where it explains the product (Hollis & Pine's glazes), never as ambience.
9. **Why Zero** (Sindhur Dutta with Zero; SOTD 7 Sep 2026, SOTM Sep 2026; Creativity 8.16, Accessibility 6.60). A narrative scroll with one idea per screen, but gated by "hold to proceed" and a pointer unlock. Principle: one idea per screen, and the counter-lesson: never gate content behind a gesture.
10. **Boc.Studio** (Jordi Canals; SOTD 19 Sep 2026; Usability 6.84). A small studio's portfolio, "structure first, delight throughout", with a case study on the landing page. Principle: a small studio wins with structure and one clear case on the first screens; its low usability score is the warning to keep every control obvious.

Also read, not chosen: LPAS (Studio Naam, SOTD 10 Oct 2026; process shown in an in-depth modal), Maria Vasilyeva Portfolio (SOTD 9 Oct 2026; annotations and notes interaction), Terminal Industries (REJOUICE, SOTD 3 Sep 2025).

---

## 3. The home page storyboard

Order exactly as round-05.md 7.1. Laptop budget: at most 12 screens of 1440×900 (10,800px). Planned total: about 9,900px (11 screens), leaving a screen of slack. A test asserts scrollHeight / 900 ≤ 12 with Kind words and About hidden.

### 3.1 At 1440×900 (y ranges are targets, ±60px)

**Screen 1 (0 to 900): the hero.**
- Top bar, 64px, solid midnight with the gold hairline once the page moves: "Toff Studio" (Cormorant 26px) left; Work · AI · Design yours · The Lab (Work Sans 15px, slate, text colour on hover/focus) right of centre; "Start a project" (the one gold button, 44px tall, 8px corners) far right.
- Headline in columns 1 to 8, two lines at 100px (line-height 0.92), each line rising once out of its own slot (900ms, 90ms apart), "build" in gold italic. Supporting line in columns 9 to 12, bottom-aligned with the headline's second line, slate, 34 characters wide.
- The stage, columns 1 to 12 (1312px wide), 2.4 : 1 (about 547px tall; on shorter screens its height shrinks so the caption row stays on the first screen, never below 360px). Its paper is deep midnight (#0A101E), so it reads as an object without a border; 12px corners. First paint: the pre-rendered still sketch. The pointer is a brush (a small cream ring cursor); if the visitor doesn't paint, after 2.5s a brush paints the site in by itself in about 2s.
- Caption row under the stage (about 70px): left, the caption in italic serif ("Bluebird Wellness, a client’s site") and a quiet hint in Work Sans slate ("Move your pointer over it to paint it in"); right, the text buttons "Build it" and "Another site →".

**Screen 2 (900 to 1800): Recent work, Bluebird.**
- When the painting finishes, the gold line drops from the bottom centre of the stage, as the old opening did, and becomes the pen.
- "Recent work" (display L, 72px) in columns 1 to 6; one line beside it in columns 8 to 12: "Two projects so far. Both began as a pencil sketch." (existing wording).
- The pen writes "Bluebird / Wellness" in two lines in columns 1 to 5 (cursive, legible size, a pen lift between lines). Columns 6 to 12: the Bluebird case film begins: a large laptop with the phone overlapping its lower right, the real site's own line-drawing story playing on both screens (frame sequences), moving forward only as you scroll.

**Screen 3 (1800 to 2700): Bluebird, continued.**
- Under the written name: "A doctor-led IV clinic in west London, in clinic or at your door." Then "What we built" as a short list with fine gold rules between items (the five existing points, word for word), "Visit the live site" (new tab, with the visually hidden "opens in a new tab") and "Read the case study →".
- The film keeps playing forward with the scroll; it ends on the finished site.

**Screen 4 (2700 to 3600): Everest, mirrored.**
- Film in columns 1 to 7 (from the local Everest capture; otherwise the existing mock-up and the cooling picture, 32 → 26 °C). The pen writes "Everest Climate / Solutions" in columns 8 to 12, then its line, the four "What we built" points, "Live site coming soon" (no link) and "Read the case study →".

**Screen 5 (3600 to 4500): Concept sites.**
- "Concept sites" (display L) with one line: "Five complete websites for businesses we made up, each built around something a real one could use."
- An editorial list of five rows, 112px each, separated by fine hairlines. Each row: the name in the serif at 56px (columns 1 to 6), the kind of business and the area (columns 7 to 9, slate), the signature in a few words (columns 10 to 11), and "Open the site →" (column 12). Hover or focus shows a 360×225 preview window of that site's signature moment that follows the pointer within the row (a short frame sequence, 12px corners, no border, no shadow halo).
  - Saltmarsh · Restaurant, Bermondsey · Steam off the dish
  - Morrow Coffee · Café, Hackney · Build your drink
  - Atelier Wren · Hair studio, Marylebone · A lookbook that flows
  - Hollis & Pine · Clothing and ceramics, Islington · A vase in 3D
  - Hart & Sons Plumbing · Plumbing and heating, west London · An instant quote
- Opening a site uses the gold-line page transition.

**Screen 6 (4500 to 5500): AI.**
- "Your website can answer your customers for you" (display L), with the second line: "It can also do things for them: take an order, find a free time, book a visit."
- A segmented control: Café · Salon · Clinic · Plumber (Morrow Coffee, Atelier Wren, Linden Clinic, Hart & Sons Plumbing; the café first, as now).
- Three columns on a deep-midnight band: the chat (columns 1 to 5, with the plain header line saying whether it's live or worked out on the page), the business's real site in a phone-sized frame (columns 6 to 8, 360×740 scaled to fit), and "What it’s been taught" (columns 9 to 12). When the assistant acts, the site in the frame changes and the chat shows a confirmation card.

**Screen 7 (5500 to 5950): Other AI we build.**
- A tightened list in two columns of plain lines (six items at most) and "Ask us about an assistant →", which opens the concierge on that topic.

**Screen 8 (5950 to 6950): Design yours.**
- "See your business as a website" (display L). One segmented control: Pick · Sketch · Describe. Controls in columns 1 to 4 (Pick: business, mood, layout, name; Sketch: blocks palette and pen, "I’m done"; Describe: a text box with an example, "Show me"). One preview in columns 5 to 12: a laptop and a phone drawn by SiteKit. "Send this to Toff" (gold button) under the controls.

**Screen 9 (6950 to 7550): The Lab band.**
- One wide still made from the new pieces (1312×360, 12px corners), "There’s more in the Lab" beside a list of the eight titles as links (two lines of serif links), "Open the Lab →".

**Screen 10 (7550 to 8600): How we work, on cream paper.**
- Torn top edge. "How we work" (display L, paper text). The process line runs through Discovery call, Sketch, Build, and Launch & care (texts word for word, timeframes from settings.js, hidden while empty) in columns 1 to 7, at staggered heights. What's included (six items word for word) in columns 9 to 12 as a plain list. Under both: "Every project is quoted personally after a short call." The hidden price line stays hidden.

**Screen 11 (8600 to 9500): Start a project.**
- The pen writes "Tell us what you need" (InkWriter) across columns 1 to 8, starting only once the heading's box is 70% on screen so nobody arrives at a half-written word.
- The inline concierge: the conversation in columns 1 to 7, the brief beside it in columns 8 to 12 filling in field by field. "Prefer a form? →" swaps in the short form.

**Screen 12 (9500 to 9950): Footer.** As now, with "Plan it with our helper" opening the concierge and links to the two case studies.

Kind words and About: 0px while hidden.

### 3.2 At 390×844 (phone; about 22 screens)

- **Hero (about 1.1 screens).** Top bar 56px: name, "Start a project", Menu. Headline 52px in two lines, supporting line under it (17px). The stage is 358px wide, 358 : 470, showing the phone capture of the site (top crop). It plays by itself when 60% of it is in view; a tap finishes it; touch-action: pan-y so scrolling always wins. Caption, then the hint "Tap to finish it", then "Build it" and "Another site →" as two 44px text buttons on one row.
- **Bluebird (about 2.2 screens).** "Recent work" heading and its line; the pen writes "Bluebird / Wellness" (always two lines); the film (phone first, then a smaller laptop) plays once by itself when reached; text and links under it.
- **Everest (about 2 screens).** The same order.
- **Concept sites (about 2.4 screens).** Heading and line; each row stacks: name (40px), kind and area, a still (358×224) under the name, the signature in a few words, "Open the site →".
- **AI (about 3 screens).** Heading and line; the business switch (four buttons in a 2×2 grid, 44px); the chat (fixed height 440px, scrolls inside); the frame (300×600) straight after the chat; "What it’s been taught" as a disclosure (closed by default, opens in place). When the assistant acts, its confirmation card has "See it on their site ↓", which scrolls the frame into view (never automatic scrolling).
- **Other AI (about 0.8 screens).**
- **Design yours (about 2.6 screens).** Segmented control; controls; the preview (phone large, laptop small beside it); "Send this to Toff".
- **The Lab band (about 1.2 screens).** Still (358×200), heading, titles as a list, "Open the Lab →".
- **How we work (about 2.6 screens).** The process line runs down the left as now; What's included under it.
- **Start a project (about 2 screens).** Pen-written heading; the inline concierge full width; the brief as a disclosure under the chat.
- **Footer (about 1 screen).**

The floating "Plan with us" button: never over the hero, the AI demo, the Design yours controls, the inline concierge or the footer, and hidden whenever it would overlap text or a control (assistant.js's hide rules, plus a check against the element under its rectangle on every scroll frame).

---

## 4. Design system

All values become custom properties in assets/shared/tokens.css (Phase 2), written from settings.js where they apply, and recorded in DESIGN.md.

### 4.1 Grid and breakpoints

| Range | Columns | Outer margin | Gutter | Content max |
|---|---|---|---|---|
| < 700px (phone) | 4 | 16px | 16px | 100% |
| 700 to 1023px (tablet) | 8 | clamp(24px, 4vw, 40px) | 24px | 100% |
| 1024 to 1679px (laptop) | 12 | clamp(40px, 4.4vw, 64px) | clamp(24px, 2.2vw, 32px) | 1312px |
| ≥ 1680px (large) | 12 | auto (centred) | 32px | 1440px; type stops growing at 1680 |

`--measure: 60ch` for paragraphs; ledes 34 to 40ch. The phone breakpoint stays 700px (handwriting.breakpoint). At 320px nothing scrolls sideways; at 2560px the content sits centred at 1440px with the stage and films growing to 1440.

### 4.2 Type scale

Cormorant Garamond (light 300 for display, never bold; italic 400 for "build" and captions) and Work Sans (400 text, 500 buttons and labels), both self-hosted.

| Token | Font | Size | Line height | Use |
|---|---|---|---|---|
| `--fs-display-xl` | Cormorant 300 | clamp(52px, 6.6vw, 100px) | 0.92 | The hero headline |
| `--fs-display-l` | Cormorant 300 | clamp(40px, 5vw, 72px) | 1.0 | Chapter headings (h2) |
| `--fs-display-m` | Cormorant 300 | clamp(32px, 3.6vw, 56px) | 1.04 | Concept names, Lab titles on the index |
| `--fs-display-s` | Cormorant 300 / italic 400 | clamp(22px, 2vw, 28px) | 1.2 | Sub-headings, captions in italic |
| `--fs-lede` | Work Sans 400 | clamp(17px, 1.3vw, 20px) | 1.5 | Lines under headings |
| `--fs-body` | Work Sans 400 | 17px | 1.6 | Body |
| `--fs-ui` | Work Sans 500 | 15px | 1.2 | Buttons, links in bars, chips |
| `--fs-small` | Work Sans 400 | 15px | 1.5 | Captions, notes, meta |
| `--fs-fine` | Work Sans 400 | 14px | 1.5 | Fine print only; nothing on the studio's pages is smaller |

Letter-spacing: display -0.012em; everything else 0 (no tracked capitals anywhere). Headings `text-wrap: balance`, paragraphs `text-wrap: pretty`. Prices and times use `font-variant-numeric: tabular-nums`. Proper quotes and apostrophes, and a non-breaking space before units (32 °C).

### 4.3 Spacing

4px base: `--s-1` 4, `--s-2` 8, `--s-3` 12, `--s-4` 16, `--s-5` 24, `--s-6` 32, `--s-7` 48, `--s-8` 64, `--s-9` 96, `--s-10` 128, `--s-11` 192.
Section rhythm (varied on purpose): `--section-s` clamp(48px, 6vw, 80px); `--section-m` clamp(72px, 9vw, 128px); `--section-l` clamp(96px, 12vw, 176px). Work and AI use l; Other AI and the Lab band s; the rest m.

### 4.4 Colour tokens (Midnight & Gold)

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--bg` | #0E1628 | Page | |
| `--bg-deep` | #0A101E | Footer, the AI band, the hero stage's paper | |
| `--tint` | #1A2541 | Raised areas, inputs, chips | |
| `--text` | #F6F0E4 | Headings and body | 15.9 on bg |
| `--ink` | #F1E3C6 | Lines, links, outlines | 14.2 on bg |
| `--slate` | #A7AFC2 | Quiet text | 8.2 on bg, 6.9 on tint |
| `--gold` | #D8AC5F | The one solid button, fine rules, selected states, focus ring | 8.6 on bg; bg text on gold 8.6 |
| `--line-shadow` | rgba(216,172,95,.38) | The gold under-shadow | |
| `--hairline` | rgba(216,172,95,.22) | Fine rules | |
| `--error` | #F2A7A0 | Form messages | 9.3 on bg |
| `--paper` | #F1EADC | The cream-paper section | |
| `--paper-text` | #141C2E | Text on paper | 14.2 |
| `--paper-quiet` | #4C5468 | Quiet text on paper | 6.3 |
| `--paper-line` | #8F6A2A | Lines on paper only (non-text, 4.1 : 1) | |
| `--paper-accent` | #7E5E24 | Gold-ish text on paper (new: #8F6A2A is only 4.1 : 1 for text) | 5.0 |

Focus ring: 2px solid gold, 3px offset (on paper: 2px `--paper-text`). Hover only inside `@media (hover: hover)`.

### 4.5 Shape

`--radius` 8px (buttons, chips, inputs, segmented controls); `--radius-media` 12px (the stage, films' screens, preview windows, the AI frame, stills); `--radius-panel` 18px (the concierge sheet). True circles only for dots, radio buttons and the brush cursor. No borders around pictures (the stage separates by tone).

### 4.6 Motion tokens (one easing family: quintic)

| Token | Value | Use |
|---|---|---|
| `--ease-out` | cubic-bezier(.22, 1, .36, 1) | Everything that arrives (JS: 1 − (1 − t)^5 as the reference) |
| `--ease-in-out` | cubic-bezier(.83, 0, .17, 1) | Things that move from one place to another (stage swap, segment indicator) |
| `--ease-in` | cubic-bezier(.64, 0, .78, 0) | Things that leave (rare: closing sheets) |
| `--dur-press` | 100ms | Pressed states |
| `--dur-quick` | 180ms | Hover, chips, toggles |
| `--dur-base` | 280ms | Menus, disclosures, segmented controls, panels |
| `--dur-reveal` | 560ms | Fade-ups (16px rise), confirmation cards |
| `--dur-move` | 900ms | Headline lines, stage swaps, large travels |
| `--dur-line` | 1400ms | The gold line dropping from the stage |
| `--rise-s` / `--rise-m` / `--rise-l` | 8px / 16px / 32px | Distances; the headline rises 100% of its own line |
| `--stagger-lines` | 90ms | Headline lines only |
| `--stagger-rows` | 60ms | List rows, at most five |

Rule: duration grows with distance (about 200ms + 1.2ms per pixel, capped at 900ms); nothing linear in the interface (the pen and the films follow the scroll, which is not an interface easing). Every animation can be interrupted; any automatic motion stops for good when the visitor takes over. Hero: idle 2500ms before the auto-brush, auto-paint 2000ms, finished at 98% coverage. The handwriting values stay in settings.js.

---

## 5. The five concept sites: art direction

Shared for all five (from the style-frame critique, section 12): none of them uses the studio's own devices (an italic word in an accent colour, cream ink on midnight, the gold line). Each site's palette and fonts are its own; contrast was measured (scratch/phase1/contrast.py). Fonts are OFL, from @fontsource 5.3.0 (checked with npm view on 2026-10-13), self-hosted as woff2 latin subsets.

### 5.1 Saltmarsh (work/saltmarsh/): bold

- **Palette:** night #17110E (page), room #221915 (raised), candle #F4E8D4 (text; 15.4 : 1 on night, 14.2 on room), linen #BFA88C (quiet; 8.2 on night, 7.6 on room), ember #E8804A (accent text 6.8 on night; buttons with night text, 6.8), brine #8FB5A6 (dietary marks; 8.3 on night).
- **Fonts:** Fraunces (variable, with its SOFT and WONK axes, optical size up to 144) for display; Schibsted Grotesk for text and the menu.
- **Mood:** A candlelit room on a weeknight: warm, low and close, with the menu card as the main character.
- **Signature:** heat and steam rising off the hero dish: a WebGL distortion over playground-restaurant.webp with soft, slow wisps, running only while it's on screen; reduced motion shows it still.
- **Typographic device:** a printed menu card: a dated header ("This week’s menu"), dotted leaders, prices in tabular figures, allergen letters in brine.

### 5.2 Morrow Coffee (work/morrow/): calm

- **Palette:** crema #F6EEE3 (page), oat #EBDDC9 (raised), foam #FFF9F1 (cards), roast #2B1D14 (text; 14.2 on crema), grounds #6B5546 (quiet; 6.1 on crema, 5.2 on oat), terracotta #A8482A (accent text 5.0 on crema; buttons with foam text 5.5; on oat only for large text or fills, 4.3).
- **Fonts:** Young Serif (display) and Figtree (variable; text). Hand-drawn accents in its own line style: roast, 1.75px, round caps, slightly wobbly SVG paths, no shadow.
- **Mood:** A bright corner café at half past seven: unhurried, warm, a little hand-made.
- **Signature:** build your drink: a cup in cross-section filling with layers (espresso, milk, foam, syrup) that slosh and settle with spring physics as size, milk, shots and syrup change, with the price updating.

### 5.3 Atelier Wren (work/atelier-wren/): classic

- **Palette:** paper #F4EFE7 (page), ink #111111 (text; 16.5), smoke #5E5750 (quiet; 6.2), rose #8A5459 (the one accent; text 5.3; buttons with paper text 5.3), blush #E8D6D2 (fills; ink on blush 13.5). Dark editorial spreads: ink background with paper text and petal #D9B3B5 (10.0).
- **Fonts:** Bodoni Moda (variable, high contrast, optical sizes) for display, set very large; Hanken Grotesk (variable) for text.
- **Mood:** A fashion magazine's quiet issue: big type, white space and one rose-coloured thread.
- **Signature:** a lookbook where a picture flows into its detail page and back with shared-element View Transitions, and a before-and-after with a soft-edged wipe you drag (or move with the arrow keys).

### 5.4 Hollis & Pine (work/hollis-and-pine/): fresh

- **Palette:** chalk #FAFAF7 (page), white #FFFFFF (cards), birch #22261F (text; 14.7), moss #5C6656 (quiet; 5.8 on chalk, 4.9 on mist), sage-deep #3E4D3A (buttons with chalk text, 8.6), sage #8A9A82 (fills and illustration only), mist #E4E9DF (surfaces), clay #9A5A43 (accent text 5.1; buttons with white text 5.4), clay-mist #EFE4DA (surfaces; clay text on it only when large, 4.3).
- **Fonts:** Albert Sans (variable; a clean sans drawn after Scandinavian typography) for everything: light 300 at large sizes for display, 400 for text, 500 for buttons.
- **Mood:** A gallery shop on a bright morning: unfussy, tactile, with room to breathe.
- **Signature:** a ceramic vase drawn live with three.js r186 from a lathe profile; matte, satin, gloss and speckled glazes with physically based materials and soft studio light; drag to turn it; it turns slowly once when it first appears, then waits. Loads only when near.

### 5.5 Hart & Sons Plumbing (work/hart-and-sons/): practical

- **Palette:** off-white #F5F3EE (page), charcoal #1F2326 (text 14.3; also dark bands), pewter #565C61 (quiet; 6.1), copper #9C5424 (accent text 5.1; buttons with white text 5.7), bright copper #E0915A (on charcoal 6.3; charcoal text on it 6.3), steel #B9BEC2 (quiet on charcoal 8.5).
- **Fonts:** Archivo (variable weight and width): wide (125) bold numerals for prices and the quote, normal width for text.
- **Mood:** A well-run van: plain-spoken, organised, with numbers you can trust at a glance.
- **Signature:** an instant quote (four questions, a price range that builds itself line by line, the call-out fee shown first) and a map of the covered area that draws itself in line, with a postcode check against the covered districts (section 10.7).

---

## 6. The Lab as an exhibition

**Index (lab.html).** A gallery wall: a short intro ("The Lab", one sentence on what it is), then the eight pieces as a list of large titles (`--fs-display-m`, up to 72px on the Lab), each with one line underneath: what it is and what it's good for. On laptops, hovering or focusing a title shows its still in a fixed-position column on the right (480×300, 12px corners), sliding to the row's height with `--ease-in-out` 280ms; it never follows the pointer outside the list. On phones each still sits under its title (358×200, lazy). No card grid, no numbering. The order: Sketch to site, Your initials in liquid gold, A million specks, Shape a vase, Ink that moves, Letters with weight, Your logo in one line, The making of this site. Sound stays off until it's turned on (the existing switch, in the intro).

**A piece (lab.html#id).** Opening a title pushes `#<id>` (history.pushState, so Back returns to the index) and shows the piece full-screen over the index, using the gold-line transition inside the page (a View Transition when available). Layout: the piece fills the viewport; a quiet caption bar at the bottom (deep midnight at 92%, no blur): left, the title in the serif (28px), how it's made in one sentence and "Good for: …"; right, Pause (on anything that moves by itself), "← Previous", "Next →" and "All experiments". Arrow keys move between pieces, Escape goes back; on phones a horizontal swipe on the caption bar (not on the piece, which may need touch) moves between pieces. While a module loads, its still is shown at full size and the piece cross-fades in (280ms).

**Piece module contract** (assets/lab/pieces/<id>.js; ids: sketch, gold, specks, vase, ink, weight, oneline, making):

```js
export async function mount(container, { reducedMotion, lowPower, soundOn, still }) {
  // build the piece inside container; resolve when the first frame is drawn
  return {
    title, made, goodFor,          // strings for the caption
    describe(),                    // text alternative for screen readers (string)
    pause(), resume(),             // pause stops every animation frame and timer
    dispose()                      // cancels frames, removes listeners, loses WebGL contexts (WEBGL_lose_context), frees buffers
  };
}
```

Only one piece is mounted at a time; leaving a piece always awaits dispose(). Low power (hardwareConcurrency ≤ 4, or deviceMemory ≤ 4, or Save-Data): the still with a "Play" button and the lighter version. Reduced motion: the still with "Play". Old anchors: #build-itself → #making, #particles-band → #specks, #one-line → #oneline, #liquid-gold → #gold, #moving-ink → #ink.

---

## 7. Technical plan

### 7.1 Code layout (new files)

```
assets/shared/tokens.css         every token in section 4, base type, focus, grain, paper section, view-transition line
assets/shared/motion.js          the motion rules (ported from the handwriting engine): on-screen start, high-water progress, phone autoplay, reduced motion, Back/bfcache/late restore, jump detection
assets/shared/shell.js, shell.css  top bar, footer, skip link, page shell (home, case studies, Lab)
assets/shared/sitekit.js, sitekit.css  SiteKit (contract B)
assets/shared/sketch-shader.js   the hero's WebGL2 sketch shader (also the Lab's first piece)
assets/shared/embed-api.js       contract A: serve() for frames, connect() for the parent (envelope, origin checks, queue, ready, time-outs)
assets/shared/ribbon.js, ribbon.css  the concept ribbon
assets/home/home.css, home.js    the home page's chapters
assets/home/hero.js              stage, brush, auto-paint, site cycling
assets/home/films.js             case films (frame sequences)
assets/home/concepts.js          the concept list and its preview window
assets/home/agent.js             the AI chapter around aiassist.js (frame, cards, streaming)
assets/home/design-yours.js      the three-way tool around SiteKit
assets/home/concierge.js         the concierge (uses assistant.js, brief.js, snapshot.js where they are)
assets/home/demo/linden.html     the Linden Clinic page for the AI demo (noindex)
assets/home/captures/            final captures from Phase 4 (stable names)
assets/lab/lab.js, lab.css, pieces/<id>.js
work/<slug>/                     each concept site, self-contained
work/bluebird/, work/everest/    case studies
vendor/three/, vendor/rapier/    libraries (Lab and Hollis & Pine only)
tests/, tools/capture/
```

Kept where they are and changed in place: aiassist.js, drawsite.js, brief.js, snapshot.js, assistant.js, inkwriter.js, oneline.js, handwriting.js (and its regenerated line-data.js).

### 7.2 What loads when (home page)

1. **In the HTML (before first paint):** tokens.css, home.css (critical layout), settings.js, a tiny inline script (colours from settings, js-motion class). Preloads: Cormorant Garamond normal (32 KB) and Work Sans regular (30 KB); Cormorant italic loads normally (34 KB). The hero's still sketch: `<img fetchpriority="high">` with srcset 1312w / 1968w / 2624w (laptop) and 358w / 716w / 1074w (phone), width and height set, so it is the LCP element and nothing shifts.
2. **Deferred modules (after first paint):** shell.js, motion.js, hero.js and sketch-shader.js (raw WebGL2, no three.js). Then the first site's finished screenshot (WebP) as the texture. The next site's still and screenshot preload on idle after the first painting finishes.
3. **On the first scroll, or when Work is within 1.5 screens:** handwriting.js and the regenerated line-data.js (only the two names now, so far smaller than today's 46 KB compressed), films.js and the first film's frames (frames stream in order; at most 90 per sequence, under 2.5 MB each).
4. **When near (IntersectionObserver, one screen ahead):** the concept stills; the AI chapter (aiassist.js, agent.js) and, 600px ahead, the frame's src; Design yours (sitekit.js, playground controls); the Lab band's still; InkWriter for "Tell us what you need".
5. **When used:** drawsite.js only when Sketch is chosen; concept preview frame sequences on first hover; assistant.js, brief.js and snapshot.js on the first opening of the concierge (the floating button itself is a few lines in shell.js and appears after the first scroll); the Worker only when the visitor asks something.
6. **Never on the home page:** vendor/three, vendor/rapier, assets/lab/.

### 7.3 Budgets (Appendix F; measured compressed through tools/serve.py --gzip)

| Item | Laptop | Phone |
|---|---|---|
| Page before any interaction | ≤ 900 KB (target 650) | ≤ 700 KB (target 450) |
| JavaScript before interaction | ≤ 150 KB (target 60: shell, motion, hero, shader) | same |
| Fonts | about 96 KB | same |
| Hero still + first texture | about 350 KB | about 180 KB |
| Each case film | ≤ 2.5 MB, loaded when near | same |
| Each concept preview | ≤ 600 KB, on hover | stills only |
| Lighthouse | performance ≥ 95 | ≥ 90; accessibility, best practices, SEO 100; LCP < 2 s desktop / 2.5 s mobile; CLS < 0.02 |
| Concept sites | < 400 KB before interaction each | |

---

## 8. Risks and how each is handled

1. **The sketch shader turns small text into mush** (seen in the style frame: hatching inside letters, double outlines). Hatch only large dark areas (luminance blurred at about 6px before thresholding), single-pixel edges with non-maximum suppression, a higher edge threshold for fine detail, and per-site parameters (edge threshold, hatch density) in the captures' manifest. Tested in Phase 2 against three screenshots and looked at.
2. **The home page grows past 12 screens.** The per-chapter budgets in section 3; a test asserts the limit; anything over budget is cut, not squeezed.
3. **LCP or layout shift from the hero.** The still sketch is the LCP image (preloaded, sized, high priority); WebGL starts after first paint; the stage reserves its size.
4. **JavaScript budget.** The handwriting data loads on the first scroll; drawsite.js, the concierge and SiteKit load when near or used.
5. **No WebGL2, a lost context, or a weak GPU.** Without WebGL2 the still cross-fades into the screenshot; webglcontextlost shows the screenshot; rendering stops once the reveal passes 98%.
6. **Five builders implement the message API differently.** Contract A is exact; assets/shared/embed-api.js (Phase 2) implements the envelope, origin checks, queue and ready message so builders only write handlers; a conformance test (tests, "ai" suite) runs the same calls against every frame.
7. **Structured output rejects SiteKit's schema** ("too complex" or a 400). The /design schema has exactly one union, no optional fields, no recursion, no numeric or length constraints. If compilation still fails, the Worker uses a flat fallback schema (one section object with every field, unused ones empty) and converts to the canonical spec before replying, so SiteKit never sees the difference.
8. **Tool calls with thinking disabled come out as text.** The /agent system prompt adds: "When you use a tool, you may say a brief sentence first. If no tool can express what the user asked for, say so instead of guessing." The Worker never forwards text that looks like a tool call; tests cover it.
9. **Strict tools not accepted on Haiku 5.5.** Tools are sent with strict: true; if the API refuses, the Worker drops strict and relies on the frames' own argument checks (which exist anyway).
10. **Demos fail at night or on closed days.** The café orders for the next opening day when today has closed; the salon and clinic return next_free; frames accept `?now=YYYY-MM-DDTHH:MM` (embed mode only) so tests are stable.
11. **Painting fights scrolling on phones.** The stage keeps touch-action: pan-y; phones play by themselves; a tap finishes.
12. **The case films look pinned.** They never stop the scroll: progress comes from the section's position while it moves with the page (high-water mark), and the last frame holds when the section leaves.
13. **The concept ribbon covers content** (seen in the Saltmarsh frame, where a fixed ribbon hid the menu card on a phone). The ribbon is in the flow at the bottom of the page, never fixed, so it can't cover anything.
14. **The concept sites look like the studio, or like each other.** Each art direction bans the studio's devices; the design-critic and ai-tells-auditor review each site's screenshots.
15. **Everest capture.** The local folder exists (Phase 0). It is served read-only from its own folder on another port by the capture script; nothing is written or built there. If it doesn't render, the existing mock-up and the cooling picture stay.
16. **bfcache broken by the frame or listeners.** No unload listeners anywhere; the frame is created when near and kept; the motion test checks pageshow's persisted with the frame present.
17. **Rate limits during tool use.** At most 3 tool rounds per answer (4 Worker requests), counted as one of the 8 live answers; the 20-a-minute counter is respected by spacing nothing (an answer's requests are sequential).
18. **The Bluebird live site's opening drawing.** The capture waits for its finished state (a timeout plus a check that the page has stopped changing) and retries once.
19. **Permission refusals** (CLAUDE.md editing was refused in Phase 0). Logged and reported; nothing depends on it before Phase 10.
20. **Usage runs short.** Phases are committed one by one with the log updated, so a later session can resume.

---

## 9. Decisions made in this plan (owner to confirm)

- Hero order: Bluebird Wellness (client), Atelier Wren, Everest Climate Solutions (client, from the local capture), Saltmarsh, Morrow Coffee, Hollis & Pine, Hart & Sons Plumbing; "Another site →" returns to the first after the last. Reason: real client work first, Bluebird's light page gives the biggest dark-to-light change and its line-drawn bird and serif headline survive the sketch (style frame); Atelier Wren next for its large editorial type and photography. Phase 4 may swap 2 and 4 after looking at the real stills.
- The laptop stage is 2.4 : 1 so the caption row and its controls are on the first screen; laptop hero screenshots are therefore captured at a 1440×600 viewport (device scale 1.5, 2160×900) instead of 1440×900, so each site lays out its own first screen for that shape. Phone stills: 390×844 captures, cropped to the top 358 : 470.
- The stage's paper is deep midnight (#0A101E), not the page colour, so it reads as an object without a border.
- A quiet hint sits beside the caption ("Move your pointer over it to paint it in" / "Tap to finish it").
- A new token, `--paper-accent` #7E5E24, for gold-ish text on the cream paper (the existing #8F6A2A is 4.1 : 1, so it is kept for lines only).
- The concept ribbon is in the page flow at the bottom, never fixed.
- The heading of 7.1 point 7 is "How we work"; the concept list's heading is "Concept sites".
- The AI demo's business switch is a segmented control labelled Café, Salon, Clinic, Plumber.
- /brief returns a ninth field, `summary`, because 7.2 asks the AI to write the brief's summary through /brief.
- Made-up details for the concept sites that the AI demo now needs (section 10): Morrow's full menu and drink options, Atelier Wren's four stylists (Ana, Theo, Isla, Sam), the clinic's 30-minute video appointment and 60-minute health check, Hart & Sons' covered postcode districts (W2 to W14) and visit windows.
- Lab pieces follow the module contract in section 6.

---

## 10. Contract A: the message API between the AI demo and its frames

Pasted word for word into the briefs for Morrow Coffee, Atelier Wren and Hart & Sons, the Linden Clinic page, the home page's agent.js and the Worker.

### 10.1 The frames

| Business key | Page in the frame | Embed address |
|---|---|---|
| `cafe` | Morrow Coffee | `work/morrow/?embed=order` |
| `salon` | Atelier Wren | `work/atelier-wren/?embed=booking` |
| `clinic` | Linden Clinic | `assets/home/demo/linden.html` (always embedded; noindex) |
| `trades` | Hart & Sons Plumbing | `work/hart-and-sons/?embed=visit` |

With `?embed=<feature>`, a concept site shows only that feature, without the ribbon or the menu, laid out for a 360 to 400px wide frame. The API is active only when `window.parent !== window`.

### 10.2 Envelope

All messages are plain objects sent with `postMessage(message, location.origin)`; never `'*'`.

```
Parent → frame (a request):
  { type: 'toff-action', v: 1, id: '<string, 1–64 chars, unique per request>', action: '<action name>', args: { … } }
  { type: 'toff-hello', v: 1 }                       // asks the frame to announce itself again

Frame → parent (a reply, exactly one per request, same id):
  { type: 'toff-result', v: 1, id, ok: true,  result: { … } }
  { type: 'toff-result', v: 1, id, ok: false, error: { code: '<code>', message: '<one plain sentence>' } }

Frame → parent (announcements):
  { type: 'toff-ready', v: 1, business: 'cafe' | 'salon' | 'clinic' | 'trades', actions: [ '<action names>' ], state: { …get_state result… } }
  { type: 'toff-state', v: 1, business, state: { …get_state result… } }
```

- **Ready:** the frame sends `toff-ready` once its interface is built and its listener is attached, and again whenever it receives `toff-hello`. The parent sends `toff-hello` when its listener is attached and on the frame's load event, and treats the frame as ready on the first `toff-ready`.
- **State:** after any change, whether made by the visitor or by an action, the frame sends `toff-state` (at most one per 100ms).
- **Origin and source checks:** the frame accepts a message only if `event.origin === location.origin` and `event.source === window.parent`. The parent accepts one only if `event.origin === location.origin` and `event.source === frame.contentWindow`. Anything else is ignored silently.
- **Unknown messages:** messages without `type` 'toff-action' or 'toff-hello' are ignored. A `toff-action` with a missing or non-string `id`, or `v !== 1`, is ignored. A known envelope with an action not listed for that business gets `unknown_action`.
- **Arguments:** `args` must be a plain object containing exactly the listed keys (no others), each of the listed type and allowed value; otherwise `invalid_args`, naming the first bad argument in the message.
- **Order:** the frame handles requests one at a time in the order received. Every request gets a reply within 2 seconds; the parent gives up after 4 seconds and treats it as `timeout`.
- **Behaviour:** an action changes the site exactly as if the visitor had done it (the same state, the same interface, the same sessionStorage), scrolls the changed part into view inside the frame (smoothly, or instantly with reduced motion), and marks it for 1.2 seconds in the site's own highlight style. It never moves focus out of the parent page.
- **Time:** every date and time is London time (Europe/London, via Intl.DateTimeFormat). Dates are `YYYY-MM-DD`; times are 24-hour `HH:MM`. Labels for people use the site's own style: "Thursday 16 October", "6pm", "9.30am". In embed mode only, `?now=YYYY-MM-DDTHH:MM` (London time) replaces the clock, for tests.
- **Money:** amounts are integers in pence (`price_pence`, `total_pence`) plus a display string (`price_text`, `total_text`, e.g. "£3.40", "from £58", "Free").
- **People:** every booking, hold and request is in the name "Guest". No action accepts a name, email address, phone number, symptom or any other personal detail.
- **Holds:** a hold or request lasts 10 minutes (`expires_in_s: 600`, `expires_at` as an ISO 8601 UTC string). Each frame keeps at most one hold or request: a new one releases the previous. When it expires, the slot becomes free again, the site shows that it has expired, and the frame sends `toff-state`.
- **Availability:** a slot is busy when FNV-1a 32-bit of the string `date + '|' + resource + '|' + time` (UTF-8, unsigned) modulo 10 is less than 4, or when it is held. `resource` is the stylist key for the salon, `'clinic'` for the clinic and `'van'` for Hart & Sons' windows (modulo 10 less than 3 for the van). This keeps every demo deterministic.

### 10.3 Error codes

| Code | Meaning |
|---|---|
| `unknown_action` | The action isn't one this business offers |
| `invalid_args` | An argument is missing, extra, of the wrong type or not an allowed value |
| `closed` | The business is closed at that day or time |
| `too_soon` | In the past, or inside the lead time |
| `too_far` | Beyond the booking window |
| `not_free` | That slot or window is taken |
| `patch_test` | A first colour needs a patch test at least 48 hours before |
| `out_of_area` | The postcode district isn't covered |
| `basket_full` | The basket limit is reached |
| `not_found` | No such hold, request or line |
| `timeout` | Parent side only: no reply within 4 seconds |

Each error's `message` is one plain sentence the assistant can repeat, e.g. "Atelier Wren is closed on Mondays." or "Hart & Sons cover west London from Paddington out to Ealing; W1 is outside that."

### 10.4 Actions for every frame (parent only, never Worker tools)

- `get_state` (args `{}`): returns the business's state object (below).
- `reset` (args `{}`): empties the basket, releases any hold or request, clears the collection time and the quote; returns `{ cleared: true }`.

### 10.5 Café: Morrow Coffee (`cafe`)

Facts (unchanged from aiassist.js): weekdays 7.30am to 4pm, weekends 8.30am to 4pm; flat white £3.40; pastries from £2.80 (cardamom bun £3.20); sourdough toast £4.50; oat, almond and soy milk at no extra cost; a gluten-free brownie; the kitchen uses nuts; 24 seats inside and a bench outside; dogs welcome; no bookings.

Menu (the site uses exactly these keys, names and prices):

| Key | Name | Price | Size | Milk | Extra shots | Syrup |
|---|---|---|---|---|---|---|
| `espresso` | Espresso | £2.60 | regular only | none only | 0, 1, 2 | none only |
| `flat_white` | Flat white | £3.40 | regular only | whole, oat, almond, soy | 0, 1, 2 | any |
| `cappuccino` | Cappuccino | £3.40 | regular, large | whole, oat, almond, soy | 0, 1, 2 | any |
| `latte` | Latte | £3.60 | regular, large | whole, oat, almond, soy | 0, 1, 2 | any |
| `filter_coffee` | Filter coffee | £3.00 | regular, large | none, whole, oat, almond, soy | 0 only | any |
| `hot_chocolate` | Hot chocolate | £3.50 | regular, large | whole, oat, almond, soy | 0 only | any |
| `croissant` | Butter croissant | £2.80 | regular | none | 0 | none |
| `cardamom_bun` | Cardamom bun | £3.20 | regular | none | 0 | none |
| `sourdough_toast` | Sourdough toast | £4.50 | regular | none | 0 | none |
| `gf_brownie` | Gluten-free brownie | £3.20 | regular | none | 0 | none |

Extras: large +£0.50; each extra shot +£0.60; syrup (vanilla, caramel or cardamom) +£0.50; milk no extra cost. Food items take only the defaults shown; anything else is `invalid_args`.

**Ordering day:** if the café is open today and London time is before 3.35pm, orders are for today, earliest = the later of opening time and now + 10 minutes, rounded up to 5 minutes; otherwise orders are for the next day (it opens every day), earliest = that day's opening time. Latest collection is 3.45pm. Collection times are on 5-minute steps.

**Basket limits:** at most 8 lines and 20 items; at most 6 of one line. Adding an item identical in every option to an existing line adds to that line's quantity.

`add_to_order` args:

| Arg | Type | Allowed |
|---|---|---|
| `item` | string | a menu key above |
| `quantity` | integer | 1 to 6 |
| `size` | string | `regular`, `large` (as allowed for the item) |
| `milk` | string | `none`, `whole`, `oat`, `almond`, `soy` (as allowed) |
| `extra_shots` | integer | 0, 1, 2 (as allowed) |
| `syrup` | string | `none`, `vanilla`, `caramel`, `cardamom` (as allowed) |

Result:
```
{ line: { line_id: 'l1', item, name, quantity, size, milk, extra_shots, syrup, label: 'Oat flat white, extra shot', unit_pence: 400, line_pence: 800 },
  basket: { lines: [ …lines… ], count: 2, total_pence: 800, total_text: '£8.00' },
  ordering_for: { date, day_label: 'Today', earliest: '08:45', latest: '15:45' },
  card_text: 'Added to your order: 2 oat flat whites with an extra shot. Basket £8.00.' }
```
Errors: `invalid_args`, `basket_full`.

`set_collection_time` args: `time` (string `HH:MM`, a 5-minute step). Result:
```
{ date, day_label: 'Today', time: '08:45', time_text: '8.45am', basket: { …as above… },
  card_text: 'Collection set: today at 8.45am. Pay when you collect.' }
```
Errors: `invalid_args` (not HH:MM or not a 5-minute step), `closed` (outside the ordering day's 7.30am or 8.30am to 3.45pm), `too_soon` (before earliest).

`get_state` result: `{ business: 'cafe', now: { date, time, weekday }, open_now: true, ordering_for: { date, day_label, earliest, latest }, basket: { lines, count, total_pence, total_text }, collection: { date, time, time_text } | null }`.

### 10.6 Salon: Atelier Wren (`salon`)

Facts (unchanged): open Tuesday, Wednesday and Friday 9am to 6pm, Thursday 9am to 8pm, Saturday 9am to 5pm, closed Sunday and Monday; cut and finish from £58, full colour from £85, blow-dry £35; 24 hours' notice to cancel or move; a patch test at least 48 hours before a first colour.

| Service key | Name | Price | Length |
|---|---|---|---|
| `cut_finish` | Cut and finish | from £58 (5800) | 60 minutes |
| `full_colour` | Full colour | from £85 (8500) | 120 minutes |
| `blow_dry` | Blow-dry | £35 (3500) | 45 minutes |

Stylists (four chairs; every stylist does every service at the same price): `ana` Ana, `theo` Theo, `isla` Isla, `sam` Sam.

Slots start every 30 minutes and must end by closing. The window is today to today + 13 days; today's slots start at least 2 hours from now. Part of day: `morning` before 12:00, `afternoon` 12:00 to 16:59, `evening` 17:00 or later.

`find_free_times` args: `service` (a service key), `stylist` (`any`, `ana`, `theo`, `isla`, `sam`), `date` (`YYYY-MM-DD`), `part_of_day` (`any`, `morning`, `afternoon`, `evening`). Result:
```
{ date, day_label: 'Thursday 16 October', closed: false,
  slots: [ { date, day_label, time: '18:00', time_text: '6pm', stylist: 'ana', stylist_name: 'Ana', service, service_name, duration_min: 60, price_text: 'from £58' } ],   // up to 6, by time; with stylist 'any', one per time
  next_free: { …a slot… } | null }   // when slots is empty: the first free slot after that date in the window, same part of day
```
A closed day returns `closed: true`, `slots: []` and `next_free`. Errors: `invalid_args`, `too_soon` (a past date), `too_far` (beyond the window).

`hold_booking` args: `service`, `stylist` (`ana`, `theo`, `isla`, `sam`), `date`, `time` (`HH:MM` on :00 or :30). Result:
```
{ hold_id: 'AW-7K2Q', name: 'Guest', service, service_name: 'Cut and finish', stylist, stylist_name: 'Ana', date, day_label: 'Thursday 16 October',
  time: '18:00', time_text: '6pm', duration_min: 60, price_text: 'from £58', expires_at: '2026-10-14T09:10:00Z', expires_in_s: 600,
  patch_test_note: '' ,      // for full_colour: 'A patch test is needed at least 48 hours before your first colour with us.'
  card_text: 'Held for 10 minutes: cut and finish, Thursday 6pm with Ana' }
```
Errors: `invalid_args`, `closed`, `too_soon`, `too_far`, `not_free`, `patch_test` (full colour starting less than 48 hours from now).

`get_state` result: `{ business: 'salon', now: { date, time, weekday }, hold: { …as hold_booking's result… } | null }`.

### 10.7 Clinic: Linden Clinic (`clinic`)

Facts (unchanged): Monday to Friday 8am to 7pm, Saturday 9am to 1pm, Sunday closed; GP appointment £95 for 30 minutes; video appointment £75; health check from £245; book online, usually for the same or next day; ten minutes' walk from Notting Hill Gate station, paid street parking nearby; never gives medical advice (it suggests booking, NHS 111, or 999 in an emergency).

| Service key | Name | Price | Length | Starts |
|---|---|---|---|---|
| `gp` | GP appointment | £95 (9500) | 30 minutes | every 30 minutes |
| `video` | Video appointment | £75 (7500) | 30 minutes | every 30 minutes |
| `health_check` | Health check | from £245 (24500) | 60 minutes | on the hour |

Window: today to today + 13 days; today's slots start at least 60 minutes from now; every slot ends by closing. `resource` for availability is `'clinic'`.

`find_free_times` args: `service`, `date`, `part_of_day` (`any`, `morning`, `afternoon`, `evening`). Result: as the salon's, without stylist fields (`{ date, day_label, closed, slots: [ { date, day_label, time, time_text, service, service_name, duration_min, price_text } ], next_free }`). Errors: `invalid_args`, `too_soon`, `too_far`.

`book_appointment` args: `service`, `date`, `time` (`HH:MM` on :00 or :30). It places a 10-minute hold. Result:
```
{ hold_id: 'LC-4F7K', name: 'Guest', service, service_name: 'GP appointment', date, day_label: 'Saturday 18 October', time: '09:30', time_text: '9.30am',
  duration_min: 30, price_text: '£95', expires_at, expires_in_s: 600,
  card_text: 'Held for 10 minutes: GP appointment, Saturday 18 October at 9.30am' }
```
Errors: `invalid_args`, `closed`, `too_soon`, `too_far`, `not_free`. No argument carries a symptom or reason.

`get_state` result: `{ business: 'clinic', now: { date, time, weekday }, hold: { … } | null }`.

### 10.8 Plumber: Hart & Sons Plumbing (`trades`)

Facts (unchanged): west London from Paddington out to Ealing; Monday to Saturday 8am to 6pm, emergency call-outs only on Sunday; boiler service £95; emergency call-out £120, then £60 an hour; quote visit free; anyone who smells gas calls the gas emergency line (0800 111 999) first.

| Job key | Name | Price |
|---|---|---|
| `boiler_service` | Boiler service | £95 (9500) |
| `emergency_callout` | Emergency call-out | £120, then £60 an hour (12000) |
| `quote_visit` | Quote visit | Free (0) |
| `other` (quote_from_list only) | Anything else | Free quote visit |

Covered postcode districts (the same list the site's postcode check uses): W2, W3, W4, W5, W6, W7, W8, W9, W10, W11, W12, W13, W14.

Windows: `morning` 8am to 12pm, `afternoon` 12pm to 6pm, `asap` (emergency call-outs today only). Monday to Saturday for every job; Sunday for `emergency_callout` only. Window: today to today + 13 days; today's morning window can be requested until 11:00 and the afternoon until 17:00. `resource` is `'van'` (busy when the hash modulo 10 is less than 3).

`request_visit` args: `job` (`boiler_service`, `emergency_callout`, `quote_visit`), `date` (`YYYY-MM-DD`), `window` (`morning`, `afternoon`, `asap`), `postcode_district` (string: `''` when not given, otherwise upper case like `W5`, matching `^[A-Z]{1,2}[0-9]{1,2}[A-Z]?$`). Result:
```
{ request_ref: 'HS-2M9D', name: 'Guest', job, job_name: 'Boiler service', date, day_label: 'Tuesday 14 October', window: 'morning',
  window_text: '8am to 12pm', postcode_district: 'W5', price_text: '£95', expires_at, expires_in_s: 600,
  card_text: 'Visit requested: boiler service, Tuesday 14 October, 8am to 12pm. £95.' }
```
For `emergency_callout` with `asap`: `window_text: 'as soon as possible'`, `card_text: 'Emergency call-out requested for today. £120, then £60 an hour. If you smell gas, call 0800 111 999 first.'`
Errors: `invalid_args` (including `asap` with another job, or on another day), `closed` (Sunday for a non-emergency job), `too_soon`, `too_far`, `not_free` (message names the next free window), `out_of_area`.

`quote_from_list` args: `job` (`boiler_service`, `emergency_callout`, `quote_visit`, `other`). The site's quote panel shows the line. Result:
```
{ job, job_name, price_text: '£95', price_pence: 9500,      // price_pence null for 'other'
  detail: 'A yearly service, with a full safety check.', 
  card_text: 'From the price list: boiler service, £95.' }
```
For `other`: `price_text: 'Free quote visit'`, `detail: 'Anything bigger gets a free quote visit.'`. Errors: `invalid_args`.

`get_state` result: `{ business: 'trades', now: { date, time, weekday }, request: { … } | null, quote: { … } | null }`.

### 10.9 The Worker's tools (input_schema sent to Anthropic)

Each tool is sent as `{ name, description, input_schema, strict: true }`. Every property is required, every object has `additionalProperties: false`, and there is no minLength, maxLength, minimum, maximum or multipleOf (integer ranges are enums). The frame checks every argument again. The Worker sends only the two tools of the business named in the request.

```json
{
  "cafe": [
    { "name": "add_to_order",
      "description": "Add an item to the customer's collection order on Morrow Coffee's website. Food items take size 'regular', milk 'none', extra_shots 0 and syrup 'none'. Espresso: milk 'none', syrup 'none', size 'regular'. Flat white: size 'regular'. Filter coffee and hot chocolate: extra_shots 0. Milk is whole unless the customer asks for oat, almond or soy (no extra cost).",
      "input_schema": { "type": "object", "additionalProperties": false,
        "required": ["item", "quantity", "size", "milk", "extra_shots", "syrup"],
        "properties": {
          "item": { "type": "string", "enum": ["espresso", "flat_white", "cappuccino", "latte", "filter_coffee", "hot_chocolate", "croissant", "cardamom_bun", "sourdough_toast", "gf_brownie"] },
          "quantity": { "type": "integer", "enum": [1, 2, 3, 4, 5, 6] },
          "size": { "type": "string", "enum": ["regular", "large"] },
          "milk": { "type": "string", "enum": ["none", "whole", "oat", "almond", "soy"] },
          "extra_shots": { "type": "integer", "enum": [0, 1, 2] },
          "syrup": { "type": "string", "enum": ["none", "vanilla", "caramel", "cardamom"] } } } },
    { "name": "set_collection_time",
      "description": "Set when the customer will collect their order, in London time, as HH:MM on a 5-minute step. Orders are for today until 3.35pm, otherwise for the next day. Latest collection 3.45pm. Payment is taken on collection.",
      "input_schema": { "type": "object", "additionalProperties": false, "required": ["time"],
        "properties": { "time": { "type": "string", "pattern": "^[0-2][0-9]:[0-5][05]$" } } } }
  ],
  "salon": [
    { "name": "find_free_times",
      "description": "Find free appointment times at Atelier Wren for a service on one date (YYYY-MM-DD, London time), optionally with a named stylist and part of the day. Returns up to six slots, or the next free slot if that date has none.",
      "input_schema": { "type": "object", "additionalProperties": false, "required": ["service", "stylist", "date", "part_of_day"],
        "properties": {
          "service": { "type": "string", "enum": ["cut_finish", "full_colour", "blow_dry"] },
          "stylist": { "type": "string", "enum": ["any", "ana", "theo", "isla", "sam"] },
          "date": { "type": "string", "format": "date" },
          "part_of_day": { "type": "string", "enum": ["any", "morning", "afternoon", "evening"] } } } },
    { "name": "hold_booking",
      "description": "Hold a free slot for 10 minutes in the name 'Guest', so the customer can confirm it on the website. Use only a slot returned by find_free_times. Never ask for the customer's name or contact details.",
      "input_schema": { "type": "object", "additionalProperties": false, "required": ["service", "stylist", "date", "time"],
        "properties": {
          "service": { "type": "string", "enum": ["cut_finish", "full_colour", "blow_dry"] },
          "stylist": { "type": "string", "enum": ["ana", "theo", "isla", "sam"] },
          "date": { "type": "string", "format": "date" },
          "time": { "type": "string", "pattern": "^[0-2][0-9]:[03]0$" } } } }
  ],
  "clinic": [
    { "name": "find_free_times",
      "description": "Find free appointment times at Linden Clinic for a service on one date (YYYY-MM-DD, London time) and part of the day. Returns up to six slots, or the next free slot if that date has none. Never ask about symptoms.",
      "input_schema": { "type": "object", "additionalProperties": false, "required": ["service", "date", "part_of_day"],
        "properties": {
          "service": { "type": "string", "enum": ["gp", "video", "health_check"] },
          "date": { "type": "string", "format": "date" },
          "part_of_day": { "type": "string", "enum": ["any", "morning", "afternoon", "evening"] } } } },
    { "name": "book_appointment",
      "description": "Hold a free appointment for 10 minutes in the name 'Guest', so the patient can confirm it on the website. Use only a slot returned by find_free_times. Never ask for personal or medical details.",
      "input_schema": { "type": "object", "additionalProperties": false, "required": ["service", "date", "time"],
        "properties": {
          "service": { "type": "string", "enum": ["gp", "video", "health_check"] },
          "date": { "type": "string", "format": "date" },
          "time": { "type": "string", "pattern": "^[0-2][0-9]:[03]0$" } } } }
  ],
  "trades": [
    { "name": "request_visit",
      "description": "Request a visit from Hart & Sons in the name 'Guest' for a date (YYYY-MM-DD, London time) and a window. 'asap' is only for an emergency call-out today. Sunday is emergencies only. postcode_district is the first half of the postcode in capitals (for example W5), or an empty string if the customer hasn't said. If anyone smells gas, tell them to call 0800 111 999 first.",
      "input_schema": { "type": "object", "additionalProperties": false, "required": ["job", "date", "window", "postcode_district"],
        "properties": {
          "job": { "type": "string", "enum": ["boiler_service", "emergency_callout", "quote_visit"] },
          "date": { "type": "string", "format": "date" },
          "window": { "type": "string", "enum": ["morning", "afternoon", "asap"] },
          "postcode_district": { "type": "string", "pattern": "^[A-Z0-9]{0,4}$" } } } },
    { "name": "quote_from_list",
      "description": "Show the price of a job from Hart & Sons' price list on their website. Use 'other' for anything not on the list: it gets a free quote visit.",
      "input_schema": { "type": "object", "additionalProperties": false, "required": ["job"],
        "properties": { "job": { "type": "string", "enum": ["boiler_service", "emergency_callout", "quote_visit", "other"] } } } }
  ]
}
```

The Worker's system prompt for /agent includes today's London date and weekday (computed by the Worker), so the model can turn "Thursday evening" into a date.

### 10.10 /agent streaming and the round trip (Worker ↔ home page)

Request body (POST, JSON, ≤ 32 KB): `{ business: 'clinic'|'cafe'|'salon'|'trades', facts: [ { label, text } ] (≤ 24), history: [ …messages… ] (≤ 8 turns), question: string (≤ 200; '' when continuing after tool results) }`.

`history` uses the Messages API shapes: `{ role: 'user' | 'assistant', content: string | [ blocks ] }`, with blocks `{ type: 'text', text }`, `{ type: 'tool_use', id, name, input }` and `{ type: 'tool_result', tool_use_id, content: '<JSON string of the result, or of { error }>', is_error: boolean }`. When continuing, the last history entry is a user message whose content is the tool_result blocks (first, in the same order as the tool_use blocks).

Response: `text/event-stream`:
```
event: text       data: { "text": "<delta>" }
event: tool_call  data: { "id": "toolu_…", "name": "hold_booking", "input": { … } }     // sent when the tool_use block is complete
event: done       data: { "stop_reason": "end_turn" | "tool_use" | "max_tokens", "assistant": [ …content blocks to append to history as the assistant turn… ] }
event: error      data: { "code": "invalid" | "rate_limited" | "daily_cap" | "timeout" | "upstream", "message": "<plain sentence>" }
```
The page carries out each tool_call through contract A, shows the confirmation card (`card_text`) as soon as the result arrives, and sends the next request with the tool results. At most 3 tool rounds per visitor question; the whole round trip counts as one of the 8 live answers. The 12-second time-out runs until the first `text` event.

---

## 11. Contract B: SiteKit's spec schema, /design and /brief

Pasted word for word into the Worker and used by assets/shared/sitekit.js, Design yours and the concierge.

### 11.1 The SiteKit API (assets/shared/sitekit.js)

```js
SiteKit.render(el, spec, { device: 'laptop' | 'phone', photos: { clinic: 'url', … } }) → { update(spec), spec(), describe(), destroy() }
SiteKit.validate(spec) → { ok: boolean, spec: <cleaned spec with every cap below applied>, problems: [string] }
SiteKit.fromPick({ business, mood, layout, name }) → spec
SiteKit.fromSketch(blocks, { business, mood, name }) → spec        // blocks as DrawSite's dr.blocks() / AI elements
SiteKit.fromWords(text) → spec                                       // offline Describe: picks the closest Pick settings
SiteKit.MOODS, SiteKit.BUSINESSES, SiteKit.LAYOUTS
```
render() always validates first, so a bad spec renders as its cleaned version and never throws. The rendered site is aria-hidden (a picture of a website); the frame around it carries the label from describe().

### 11.2 Values from the existing tools

- Pick (playground.js and minisite.js): `business` ∈ clinic, cafe, salon, trades, restaurant, boutique (labels Clinic, Café, Salon, Trades, Restaurant, Boutique); `mood` ∈ calm, bold, classic, fresh; `layout` ∈ split ("Side by side"), story ("Centred story"), full ("Full-bleed photo"); `name` up to 40 characters ('' = the business's default name).
- Moods' colours and type (from drawsite.js's MOODS): calm `#EEF1EC / #E1E8DF / #22332B / #5D6B63 / button #2F4A3E on #fff / accent #8FAF96`, serif display; bold `#121212 / #1D1D1D / #FAFAF7 / #A9A9A4 / button #FF5A36 with #121212 / accent #FF5A36`, heavy sans, upper case headings; classic `#F6EFE6 / #ECE1D2 / #2B1A1E / #6E5A5E / button #5A1E2C with #F6EFE6 / accent #B08D57`, italic serif; fresh `#FFFFFF / #EAF4F6 / #0F2A44 / #557086 / button #12355B on #fff / accent #3FB6A8`, sans.
- Draw your site's blocks (drawsite.js BLOCKS): header (Menu bar), logo, heading (≤ 70 chars), text (≤ 280), button (≤ 28), image (Picture), card (≤ 40), gallery, map, form (Contact form). Its AI and pen kinds add: nav (menu link), para (paragraph), avatar (round photo), video, reviews. Positions are fractions of a 4 × 5 paper.

### 11.3 The spec (canonical; SiteKit accepts this)

```
SiteSpec {
  version: 1,
  business: { kind: 'clinic'|'cafe'|'salon'|'trades'|'restaurant'|'boutique'|'other', name: string, what: string, area: string },
  mood: 'calm'|'bold'|'classic'|'fresh',
  layout: 'split'|'story'|'full',
  photo: 'clinic'|'cafe'|'salon'|'trades'|'restaurant'|'boutique'|'none',
  sections: [ Section ]                      // 1 to 12, in page order
}

Section is one of:
  { type: 'menu_bar',     logo: 'mark'|'none', links: [string], button: string }
  { type: 'hero',         variant: 'split'|'story'|'full'|'text', heading: string, text: string, button: string, link: string, picture: 'photo'|'drawing'|'none' }
  { type: 'heading',      text: string, size: 'large'|'medium', align: 'left'|'centre' }
  { type: 'text',         text: string, align: 'left'|'centre' }
  { type: 'buttons',      buttons: [ { label: string, style: 'solid'|'outline' } ], align: 'left'|'centre' }
  { type: 'picture',      picture: 'photo'|'drawing', width: 'full'|'wide'|'half', caption: string }
  { type: 'round_photo',  caption: string }
  { type: 'cards',        cards: [ { title: string, text: string } ], style: 'plain'|'boxed' }
  { type: 'gallery',      count: 3|4|6, caption: string }
  { type: 'video',        caption: string }
  { type: 'map',          label: string }
  { type: 'contact_form', heading: string, fields: [ 'name'|'email'|'phone'|'message'|'date'|'party_size' ], button: string }
  { type: 'price_list',   variant: 'menu'|'prices', heading: string, items: [ { name: string, price: string, note: string } ] }
  { type: 'booking',      kind: 'table'|'appointment'|'visit'|'class'|'collection', heading: string, button: string }
  { type: 'hours',        heading: string, rows: [ { days: string, hours: string } ] }
  { type: 'contact',      heading: string, show: [ 'phone'|'email'|'address'|'social' ] }
  { type: 'reviews',      heading: string }
  { type: 'row',          columns: [ { span: 3|4|5|6|7|8|9, blocks: [ Block ] } ] }      // canonical only (Sketch); never in /design

Block is any Section except menu_bar, hero and row.
```

Rendering rules SiteKit keeps:
- An empty string means "not shown" (`button: ''` shows no button), except in `price_list` (an empty `price` shows "£ –"), `hours` (empty `days` or `hours` shows "Your opening hours"), `map` (empty `label` shows the business's area) and `business.name` (empty shows the business's default name, or "Your business").
- `contact` never shows invented details: it shows labelled placeholders ("Your phone number", "hello@yourbusiness.example", "Your address", "Your social links").
- `reviews` is always an empty, clearly labelled space ("Your own reviews will show here"), never sample reviews.
- `photo` picks one of the six playground photos (assets/studio/playground/playground-<kind>.webp; 'trades' shows an air conditioner, so SiteKit uses its line drawing for a plumber); `picture: 'drawing'` and photo 'none' use the mood's line drawing.
- The footer (name, area, "Privacy · Terms") is always added by SiteKit and is not a section.
- Pick's layout sets the hero's variant; mood sets colours and type.

Mapping from Draw your site to the spec (SiteKit.fromSketch): header → menu_bar (logo 'mark' if a logo sits in it; nav items → links); heading → heading; text and para → text; button → buttons; image → picture; card → cards (cards side by side merge into one cards section); avatar → round_photo; map → map; form → contact_form (name, email, message); gallery → gallery (count 4); video → video; reviews → reviews. Blocks whose vertical extents overlap by 40% or more of the shorter one form a row, ordered by x, with spans from their widths (rounded to twelfths, at least 3, summing to 12 or less). The visitor's typed text carries over, capped as below.

### 11.4 Caps (enforced by SiteKit.validate and by the Worker after parsing)

| Field | Cap |
|---|---|
| sections | 1 to 12; at most one menu_bar (moved first) and one hero (moved after the menu_bar) |
| business.name / what / area | 40 / 60 / 40 characters |
| menu_bar.links | 0 to 5, each ≤ 18; button ≤ 20 |
| hero.heading / text / button / link | 70 / 200 / 24 / 24 |
| heading.text | 70 |
| text.text | 400 |
| buttons.buttons | 1 to 3, label ≤ 24 |
| picture.caption, gallery.caption, video.caption, map.label | 80 |
| round_photo.caption | 60 |
| cards.cards | 1 to 4; title ≤ 40, text ≤ 120 |
| contact_form.fields | 1 to 6, no repeats; heading ≤ 60, button ≤ 24 |
| price_list.items | 1 to 12; name ≤ 40, price ≤ 16, note ≤ 60; heading ≤ 60 |
| booking | heading ≤ 60, button ≤ 24 |
| hours.rows | 1 to 7; days ≤ 30, hours ≤ 30; heading ≤ 60 |
| contact.show | 1 to 4, no repeats; heading ≤ 60 |
| reviews.heading | 60 |
| row.columns | 2 to 3, spans summing to ≤ 12; blocks 1 to 4 per column |

Every string: trimmed, whitespace collapsed, control characters and `<` `>` removed, cut at the cap on a word boundary. Removed from every string (replaced with ''): web addresses, email addresses and phone-like numbers (seven or more digits). A section that fails its rules is dropped; an unknown `type` is dropped; if nothing is left, the spec falls back to SiteKit.fromPick with the business kind.

Extra rule for /design only: never invented prices or hours. A `price` must appear in the visitor's own text, otherwise the Worker sets it to ''; `hours` rows are '' unless the visitor gave hours.

### 11.5 /design

Request: POST `{ text: string (1 to 400 characters) }`. Response: `{ ok: true, spec: SiteSpec }` or `{ ok: false, error: { code: 'invalid'|'rate_limited'|'daily_cap'|'timeout'|'upstream', message } }`. The page validates the spec again with SiteKit.validate. Offline, or on any error, Describe uses SiteKit.fromWords(text) and says so in one quiet line.

The structured-output schema (output_config.format, type json_schema). One union (the section anyOf), no optional fields, no recursion, no length or number constraints; minItems only 1. `row` is not offered.

```json
{
  "type": "object", "additionalProperties": false,
  "required": ["version", "business", "mood", "layout", "photo", "sections"],
  "properties": {
    "version": { "type": "integer", "const": 1 },
    "business": { "type": "object", "additionalProperties": false, "required": ["kind", "name", "what", "area"],
      "properties": {
        "kind": { "type": "string", "enum": ["clinic", "cafe", "salon", "trades", "restaurant", "boutique", "other"] },
        "name": { "type": "string", "description": "The business's name if the visitor gave one, otherwise an empty string. At most 40 characters." },
        "what": { "type": "string", "description": "What the business is, in a few words, e.g. 'Turkish bakery'. At most 60 characters." },
        "area": { "type": "string", "description": "Where it is, e.g. 'Walthamstow', or an empty string. At most 40 characters." } } },
    "mood": { "type": "string", "enum": ["calm", "bold", "classic", "fresh"] },
    "layout": { "type": "string", "enum": ["split", "story", "full"] },
    "photo": { "type": "string", "enum": ["clinic", "cafe", "salon", "trades", "restaurant", "boutique", "none"] },
    "sections": { "type": "array", "minItems": 1, "description": "4 to 10 sections in page order, starting with menu_bar then hero.",
      "items": { "anyOf": [
        { "$ref": "#/$defs/menu_bar" }, { "$ref": "#/$defs/hero" }, { "$ref": "#/$defs/heading" }, { "$ref": "#/$defs/text" },
        { "$ref": "#/$defs/buttons" }, { "$ref": "#/$defs/picture" }, { "$ref": "#/$defs/round_photo" }, { "$ref": "#/$defs/cards" },
        { "$ref": "#/$defs/gallery" }, { "$ref": "#/$defs/video" }, { "$ref": "#/$defs/map" }, { "$ref": "#/$defs/contact_form" },
        { "$ref": "#/$defs/price_list" }, { "$ref": "#/$defs/booking" }, { "$ref": "#/$defs/hours" }, { "$ref": "#/$defs/contact" },
        { "$ref": "#/$defs/reviews" } ] } }
  },
  "$defs": {
    "align": { "type": "string", "enum": ["left", "centre"] },
    "menu_bar": { "type": "object", "additionalProperties": false, "required": ["type", "logo", "links", "button"], "properties": {
      "type": { "type": "string", "const": "menu_bar" }, "logo": { "type": "string", "enum": ["mark", "none"] },
      "links": { "type": "array", "items": { "type": "string" }, "description": "Up to 5 short menu links." },
      "button": { "type": "string" } } },
    "hero": { "type": "object", "additionalProperties": false, "required": ["type", "variant", "heading", "text", "button", "link", "picture"], "properties": {
      "type": { "type": "string", "const": "hero" }, "variant": { "type": "string", "enum": ["split", "story", "full", "text"] },
      "heading": { "type": "string" }, "text": { "type": "string" }, "button": { "type": "string" }, "link": { "type": "string" },
      "picture": { "type": "string", "enum": ["photo", "drawing", "none"] } } },
    "heading": { "type": "object", "additionalProperties": false, "required": ["type", "text", "size", "align"], "properties": {
      "type": { "type": "string", "const": "heading" }, "text": { "type": "string" },
      "size": { "type": "string", "enum": ["large", "medium"] }, "align": { "$ref": "#/$defs/align" } } },
    "text": { "type": "object", "additionalProperties": false, "required": ["type", "text", "align"], "properties": {
      "type": { "type": "string", "const": "text" }, "text": { "type": "string" }, "align": { "$ref": "#/$defs/align" } } },
    "buttons": { "type": "object", "additionalProperties": false, "required": ["type", "buttons", "align"], "properties": {
      "type": { "type": "string", "const": "buttons" },
      "buttons": { "type": "array", "minItems": 1, "items": { "type": "object", "additionalProperties": false, "required": ["label", "style"], "properties": {
        "label": { "type": "string" }, "style": { "type": "string", "enum": ["solid", "outline"] } } } },
      "align": { "$ref": "#/$defs/align" } } },
    "picture": { "type": "object", "additionalProperties": false, "required": ["type", "picture", "width", "caption"], "properties": {
      "type": { "type": "string", "const": "picture" }, "picture": { "type": "string", "enum": ["photo", "drawing"] },
      "width": { "type": "string", "enum": ["full", "wide", "half"] }, "caption": { "type": "string" } } },
    "round_photo": { "type": "object", "additionalProperties": false, "required": ["type", "caption"], "properties": {
      "type": { "type": "string", "const": "round_photo" }, "caption": { "type": "string" } } },
    "cards": { "type": "object", "additionalProperties": false, "required": ["type", "cards", "style"], "properties": {
      "type": { "type": "string", "const": "cards" },
      "cards": { "type": "array", "minItems": 1, "items": { "type": "object", "additionalProperties": false, "required": ["title", "text"], "properties": {
        "title": { "type": "string" }, "text": { "type": "string" } } } },
      "style": { "type": "string", "enum": ["plain", "boxed"] } } },
    "gallery": { "type": "object", "additionalProperties": false, "required": ["type", "count", "caption"], "properties": {
      "type": { "type": "string", "const": "gallery" }, "count": { "type": "integer", "enum": [3, 4, 6] }, "caption": { "type": "string" } } },
    "video": { "type": "object", "additionalProperties": false, "required": ["type", "caption"], "properties": {
      "type": { "type": "string", "const": "video" }, "caption": { "type": "string" } } },
    "map": { "type": "object", "additionalProperties": false, "required": ["type", "label"], "properties": {
      "type": { "type": "string", "const": "map" }, "label": { "type": "string" } } },
    "contact_form": { "type": "object", "additionalProperties": false, "required": ["type", "heading", "fields", "button"], "properties": {
      "type": { "type": "string", "const": "contact_form" }, "heading": { "type": "string" },
      "fields": { "type": "array", "minItems": 1, "items": { "type": "string", "enum": ["name", "email", "phone", "message", "date", "party_size"] } },
      "button": { "type": "string" } } },
    "price_list": { "type": "object", "additionalProperties": false, "required": ["type", "variant", "heading", "items"], "properties": {
      "type": { "type": "string", "const": "price_list" }, "variant": { "type": "string", "enum": ["menu", "prices"] }, "heading": { "type": "string" },
      "items": { "type": "array", "minItems": 1, "items": { "type": "object", "additionalProperties": false, "required": ["name", "price", "note"], "properties": {
        "name": { "type": "string" }, "price": { "type": "string", "description": "Only a price the visitor gave, otherwise an empty string." }, "note": { "type": "string" } } } } } },
    "booking": { "type": "object", "additionalProperties": false, "required": ["type", "kind", "heading", "button"], "properties": {
      "type": { "type": "string", "const": "booking" }, "kind": { "type": "string", "enum": ["table", "appointment", "visit", "class", "collection"] },
      "heading": { "type": "string" }, "button": { "type": "string" } } },
    "hours": { "type": "object", "additionalProperties": false, "required": ["type", "heading", "rows"], "properties": {
      "type": { "type": "string", "const": "hours" }, "heading": { "type": "string" },
      "rows": { "type": "array", "minItems": 1, "items": { "type": "object", "additionalProperties": false, "required": ["days", "hours"], "properties": {
        "days": { "type": "string" }, "hours": { "type": "string", "description": "Only hours the visitor gave, otherwise an empty string." } } } } } },
    "contact": { "type": "object", "additionalProperties": false, "required": ["type", "heading", "show"], "properties": {
      "type": { "type": "string", "const": "contact" }, "heading": { "type": "string" },
      "show": { "type": "array", "minItems": 1, "items": { "type": "string", "enum": ["phone", "email", "address", "social"] } } } },
    "reviews": { "type": "object", "additionalProperties": false, "required": ["type", "heading"], "properties": {
      "type": { "type": "string", "const": "reviews" }, "heading": { "type": "string" } } }
  }
}
```

If the API refuses this schema (a 400, or "Schema is too complex for compilation"), the Worker switches to a flat fallback: `sections.items` is one object with `type` (enum of the 17 types) and every field above (strings '' and arrays [] when unused, enums with their first value), all required; it converts each flat section to its canonical shape before applying the caps. The page never sees the flat form.

### 11.6 /brief

Request: POST `{ history: [ { role: 'user'|'assistant', content: string } ] (≤ 16 turns, text only), brief: <the current brief, JSON, ≤ 4 KB> }`. Response: `{ ok: true, brief: Brief }` or `{ ok: false, error: { code, message } }`.

The current brief (kept by the concierge, sent to /concierge and /brief, edited by update_brief and by the visitor):
```
{ business: string, goals: [string], must_haves: [string], look: string, pins: [ { label, note } ], designs: [ { source: 'pick'|'sketch'|'describe', summary } ],
  timing: string, budget: string, notes: [string] }
```
(Pin pictures and design specs stay on the page; only labels, notes and summaries are sent. A name, email address or phone number is never part of it.)

Structured-output schema for /brief:
```json
{
  "type": "object", "additionalProperties": false,
  "required": ["business", "goals", "must_haves", "look", "pins", "timing", "budget", "notes", "summary"],
  "properties": {
    "business": { "type": "string", "description": "What the business is and where, in one sentence. At most 200 characters." },
    "goals": { "type": "array", "items": { "type": "string" }, "description": "What the website must achieve, up to 6, each at most 140 characters." },
    "must_haves": { "type": "array", "items": { "type": "string" }, "description": "Features they asked for, up to 10, each at most 80 characters." },
    "look": { "type": "string", "description": "How it should look, in their words and from their pins and designs. At most 300 characters." },
    "pins": { "type": "array", "items": { "type": "object", "additionalProperties": false, "required": ["label", "note"],
      "properties": { "label": { "type": "string" }, "note": { "type": "string" } } }, "description": "Up to 12, label at most 80 and note at most 200 characters." },
    "timing": { "type": "string", "enum": ["As soon as possible", "In 1 to 3 months", "Just exploring", "Not said"] },
    "budget": { "type": "string", "enum": ["£1,000 to £2,000", "£2,000 to £4,000", "£4,000+", "Not sure yet", "Not said"] },
    "notes": { "type": "array", "items": { "type": "string" }, "description": "Anything else worth knowing, up to 8, each at most 200 characters." },
    "summary": { "type": "string", "description": "A warm, plain summary of the project for the studio, 2 to 4 sentences, at most 600 characters. No prices or timeframes." }
  }
}
```
Caps after parsing: the counts and lengths in the descriptions; the same string cleaning as 11.4; email addresses and phone-like numbers removed everywhere; nothing about price or timeframe invented (the summary never states a price, a duration or a date).

---

## 12. Style frames and the cold critique

Frames: scratch/phase1/frames/hero.html (and hero-v1.html, the first version) and saltmarsh.html; screenshots shot-hero-1440.png, shot-hero-390.png (v1), shot-hero-1440v2.png, shot-hero-390v2.png, shot-saltmarsh-1440.png, shot-saltmarsh-390.png. The sketch in the hero frame is a rough stand-in for the shader (scratch/phase1/gen_sketch.py: Sobel edges and two-angle hatching), not the real thing.

Reviewed cold, as an Awwwards juror, from the screenshots only.

**Hero, first version.** Design 6.5, Usability 6, Creativity 7.5, Content 7.
1. The sketched side of the stage is midnight on midnight: the stage loses its edge and reads as the page itself being scribbled on.
2. The caption, "Build it" and "Another site →" fall below the fold at 1440×900: a visitor doesn't know they can paint or change site.
3. Nothing says the pointer is a brush.
4. Hatching inside small text and double outlines turn the site's buttons and fine print into mush.
5. Headline above a big box is the most familiar hero shape there is; the supporting line floats far from both.
6. The stage crops the site's first screen awkwardly (buttons cut at the bottom).

**Hero, second version** (deep paper, height-limited stage, hint): Design 7.5, Usability 7.5, Creativity 8, Content 7.5. The stage now reads as an object, and the caption row with its controls is on the first screen. Remaining: the crop of a 16 : 10 capture inside a 2.4 : 1 stage (handled by capturing at 1440×600), and the phone caption sits at the fold (handled by a 358 : 470 stage).

**Saltmarsh first screen.** Design 7, Usability 7.5, Creativity 5.5, Content 7.
1. A split hero (text left, photo right) is a template shape; the signature moment has to carry the creativity.
2. The italic word in the accent colour ("Bermondsey") repeats the studio's own "build" device; the concept sites would look like the studio.
3. On a phone the fixed ribbon covers the menu card: against the rule that it never covers content.
4. Two "Book a table" buttons on one laptop screen.
5. The menu card details are good and honest; the photo carries the mood.

Changes made to the plan from the critique:
- The stage's paper is deep midnight; its height is limited so the caption row is on the first screen; a hint names the brush; laptop captures are 1440×600 (sections 3.1, 9).
- The shader hatches only large dark areas, with single-pixel edges and per-site parameters (risk 1).
- The concept sites never use the studio's devices (section 5); Saltmarsh's device is the printed menu card instead of an accent italic.
- The concept ribbon is in the page flow, never fixed (risk 13, section 9).
- Saltmarsh's builder brief asks for a first screen that isn't a plain split: the steam signature at full height with the menu card set over the room's darkness, and one "Book a table" in the menu bar on laptops (the hero's own button only on phones).

---

## 13. Changes to this plan

- 2026-10-13: First version (Phase 1).
