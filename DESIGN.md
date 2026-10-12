# Toff Studio portfolio: design values

The exact values used by the site (Round 02: Midnight & Gold; Round 03: Work Sans, the top bar, the portfolio sections and the Lab). **Keep this file and `settings.js` in sync:** whenever a value changes in one, update the other. The colours are defined on `:root` in `site.css` and overwritten from `settings.js` (`colors`) when the page loads. Round 01's values (light page, navy ink) are in git history and on the `backup-before-round-02` branch.

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
