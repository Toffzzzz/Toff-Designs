# Toff Studio portfolio: design values

The exact values used by the site (Round 02: Midnight & Gold). **Keep this file and `settings.js` in sync:** whenever a value changes in one, update the other. The colours are defined on `:root` in `site.css` and overwritten from `settings.js` (`colors`) when the page loads. Round 01's values (light page, navy ink) are in git history and on the `backup-before-round-02` branch.

## Colours

| Name | CSS variable | Value | Where it's used | settings.js |
|---|---|---|---|---|
| Midnight | `--bg` | `#0E1628` | The whole page, the header, the phone menu | `colors.bg` |
| Cream ink | `--ink` | `#F1E3C6` | Every drawn line, links, outlines, the quotes, footer text | `colors.ink` |
| Text | `--text` | `#F6F0E4` | Headings and body text | `colors.text` |
| Slate | `--slate` | `#A7AFC2` | Quiet text, descriptions, placeholders, fine outlines (40%) | `colors.slate` |
| Gold | `--accent` | `#D8AC5F` | Small labels, numerals, fine rules, the one solid button, selected states, "Placeholder" tags | `colors.accent` |
| Tint | `--tint` | `#1A2541` | Raised areas: inputs, choice buttons, a selected picker card | `colors.tint` |
| Gold under-shadow | `--line-shadow` | `rgba(216, 172, 95, 0.38)` | The shadow under every line (opening sketch, showcase drawings, picker icons) | `colors.lineShadow` |
| Deep midnight | `--bg-deep` | `#0A101E` | The footer (the only change of shade), with a fine gold rule above it | `colors.footer` |
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

Self-hosted in `fonts/` (SIL Open Font License, see CREDITS.md).

| Text | Font | Size |
|---|---|---|
| Display (phone menu links) | Cormorant Garamond 300 | clamp(40px, 6vw, 84px), line-height 1.05 |
| Opening headline "We sketch it. Then we build it." | Cormorant Garamond 400 (from `opening.css`, as delivered) | clamp(34px, 5.2vw, 64px) |
| Section headings | Cormorant Garamond 300 | clamp(30px, 3.6vw, 48px), line-height 1.1 |
| Quotes ("Kind words") | Cormorant Garamond 300, cream | clamp(28px, 3.4vw, 44px) |
| Process numerals 01–04 | Cormorant Garamond 300, gold, lining figures | clamp(52px, 5vw, 72px) |
| Enquiry questions | Cormorant Garamond 400 | clamp(28px, 4vw, 40px) |
| Body | Inter 400 | 17px, line-height 1.6 |
| Small labels | Inter 500, uppercase, letter-spacing .18em, gold | 11.5px |
| "Placeholder" tag | Inter 500, uppercase, letter-spacing .18em, gold | 11px |
| Buttons | Inter 500 | 15px (header button 14px) |
| Handwriting, finale heading | Hershey cursive (single line), built into `assets/handwriting/line-data.js` and `assets/finale/finale-data.js` | Laptop: 5.6 (phrases 1–3), 4.2 (phrase 4 and "Tell us what you need"), 3.6 (reprise) font units per unit on a 1440-wide drawing. Phone: 2.6 (handwriting), 2.3 ("Tell us what you need"), 2.0 (reprise) on a 400-wide drawing |

Cormorant Garamond is never bold. Text columns are no wider than about 60 characters (`--measure`).

## Lines

| Value | Setting |
|---|---|
| Handwriting and finale stroke: 3.2px laptops, 2.6px phones, round ends and joins | `handwriting.strokePx` |
| Gold under-shadow: 3.5px below, 1.2px wider, no blur, trails the pen by 0.22s | `handwriting.shadow` |
| Opening sketch, showcase drawings, picker icons: their own stroke widths with `drop-shadow(0 2.5px 1.1px var(--line-shadow))` (as delivered) | `assets/*/…css` |
| Undrawn strokes are hidden (`visibility: hidden`), never a zero-length dash | — |

## Layout and spacing

- Page gutter: clamp(20px, 6vw, 96px). Content width: 1200px. The handwriting, showcase and finale heading run full width.
- Space between sections: 144px on laptops, 88px on phones (`--section-space`).
- Header: 64px tall (58px on phones), the page colour, no border or shadow; hides when scrolling down, returns when scrolling up. Header links land 40px below it.
- Corner radius: 12px everywhere (`--radius`): buttons, inputs, choices, focus rings on cards. The style picker's cards are 16px (its own stylesheet).
- One solid button style (gold, midnight text, 12px radius, at least 48px tall): "Start a project", the enquiry's Continue and Send. Every other action is a text link with an arrow.

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
| Fade-ups in How we work, What's included, Kind words: 600ms, 12px rise, once | | `reveal` |

## Breakpoints

- **Phones:** narrower than 700px (`handwriting.breakpoint`): phone layouts of the opening and the line, pictures under their phrases, Menu link instead of the header links, parts play by themselves.
- **Laptops/desktops:** 700px and wider: scroll-driven. Process steps: 2 × 2 from 700 to 1023px, four in a row from 1024px.

## Motion rules

- Laptops: driven by scrolling at a natural speed, starting only when on screen. Phones: each part plays by itself when it comes into view.
- Never reverses, replays, snaps back or freezes half-way while on the page; once something starts drawing, it finishes.
- Coming back (Back/Forward with or without bfcache, Safari's late scroll restore): you stay where you were, what's on screen plays again, what's above plays as you scroll back up. Jumping down plays what you land on.
- No pinning anywhere. The page opens at the top on a fresh visit (header links don't add a #fragment to the address).
- Reduced motion: everything shown finished, no animation.
