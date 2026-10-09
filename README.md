# Toff Studio portfolio

One continuous ink line runs down the whole page, like a pen that never lifts. It writes four phrases, draws the studio's website styles (Bluebird Wellness, Everest Climate Solutions), and finishes by writing "Tell us what you need" above a chat box.

Plain HTML, CSS and JavaScript, ready for GitHub Pages. No build step.

## Preview it

```
python3 tools/serve.py 8000
```

Then open http://localhost:8000. Phones on the same Wi-Fi can open `http://<your Mac's Wi-Fi address>:8000` (find it with `ipconfig getifaddr en0`). `python3 -m http.server 8000` also works, but its short connection queue sometimes drops files when a browser asks for several at once.

## Change things

Everything adjustable is in **`settings.js`**: studio name, email, colours, stroke width, shadow, the font and size of each phrase, drawing speeds, section order, which styles are shown, links, Everest temperatures and colours, finale timings, and the chat box mode. Each value has a comment. After changing one, update DESIGN.md to match.

To choose different handwriting, open **http://localhost:8000/fonts-preview.html**: every phrase in every single-line font, labelled with the id to paste into `settings.js`. "Draw them all" replays the pen order.

## Files

| Path | What it is |
|---|---|
| `index.html` | The page, plus templates for the style sections and finale previews |
| `styles.css` | All styles (the Everest part is copied from the Everest site, see below) |
| `settings.js` | Every adjustable value |
| `script.js` | The continuous line: layout, timeline, the pen clock, finale, chat box |
| `js/handwriting.js` | Lays out text in a single-line font as pen strokes |
| `js/everest-ac.js` | The Everest air-conditioning animation (copied, see below) |
| `paths/fonts/` | Generated stroke data for each single-line font (one file per font) |
| `tools/build-fonts.mjs` | Rebuilds `paths/fonts/` from `tools/svg-fonts/` (`node tools/build-fonts.mjs`) |
| `tools/svg-fonts/` | The original Hershey and EMS SVG fonts and their licence |
| `tools/serve.py` | Local preview server |
| `assets/face-line.svg` | The Bluebird face, single pen strokes (used exactly as supplied) |
| `assets/everest/` | AC unit images copied from the Everest project |
| `assets/styles/placeholder-style.svg` | Placeholder drawing for the extra style slots |
| `assets/fonts/inter/` | Inter, self-hosted |
| `vendor/` | GSAP 3.15.0 and Lenis 1.3.26 (local copies) |
| `fonts-preview.html` | Every phrase in every single-line font |
| `CLAUDE.md`, `DESIGN.md`, `DECISIONS.md`, `CHECKLIST.md`, `CREDITS.md` | Instructions, design values, decision log, quality checks, licences |
| `rounds/` | Each round's full prompt |

## How the line works

`script.js` lays everything out on one timeline in "pen-seconds": every letter stroke, joining line, drawing stroke, the Everest animation and the finale steps, each at a natural speed from `settings.js`. A single pen clock moves along it:

- **Laptops/desktops:** scrolling sets where the clock should be. Each part is placed on the scroll so it draws while it's on screen; the clock follows smoothly and never runs faster than `speeds.maxCatchUp` × natural speed.
- **Phones and touch tablets:** each part plays by itself, at natural speed, once it comes into view.
- **Never backwards:** the clock only moves forward, so nothing un-draws when scrolling up. If someone scrolls very fast, parts already scrolled off the top are completed at once.
- **Reduced motion:** everything is drawn finished; no smooth scrolling and no pin.

Each section has two SVG layers the size of the section: the grey shadow (offset, blurred and trailing the pen by `shadow.delay`) and the ink. Joining lines leave each section's bottom edge exactly where the next section's line begins, so the line is unbroken. Only the finale pins (CSS `position: sticky`, laptops only).

## Everest Climate Solutions: what was copied and what changed

Source folder: `~/Downloads/everest-climate-solutions` (read only; nothing there was changed).

**Copied unchanged**

| From (Everest) | To (here) |
|---|---|
| `public/images/ac-closed.png`, `ac-closed.webp` | `assets/everest/` |
| `public/images/ac-half.png`, `ac-half.webp` | `assets/everest/` |
| `public/images/ac-open.png`, `ac-open.webp` | `assets/everest/` |
| `node_modules/gsap/dist/gsap.min.js` (3.15.0) | `vendor/gsap-3.15.0.min.js` |
| `node_modules/lenis/dist/lenis.min.js`, `lenis.css` (1.3.26) | `vendor/lenis-1.3.26.min.js`, `vendor/lenis-1.3.26.css` |

**Copied and adapted**

| From (Everest) | To (here) | What changed |
|---|---|---|
| `index.html`: the cool scene's AC unit (three stacked `<picture>`s) and temperature readout; the overview's `.unit-final` and `.readout-small` | `index.html` templates `#tpl-everest` and `#tpl-preview-everest` | Classes prefixed `ev-` to avoid clashes; image paths point to `assets/everest/`; the logo, service cards, dots and overview text are not copied. |
| `src/scripts/coolScene.js` | `js/everest-ac.js` | Kept: phases, `seg`/`fade`/`move` helpers, power2 easing, colour blending (warm → neutral → cool), flap crossfades at 27°C/22°C, whole-degree countdown, label swap, the unit and readout fading in and rising 24px. Changed: a plain script reading `settings.js` (`everest`) instead of an ES module with its own SETTINGS; driven by this page's pen clock as `render(progress)` (0 → 1 = the original's 0 → 0.88) instead of its own pinned ScrollTrigger; never reverses; the background is set on `.ev-room` (a soft-edged band behind the section) instead of the pinned stage; card deck, snapping, logo, overview move and debug readout removed. |
| `src/styles/cool-scene.css` | `styles.css` ("Everest" section) | Same unit size, drop shadow, readout sizes, letter-spacing, tabular figures and "°C" placement. Changed: `ev-` prefixes; the unit width is also limited to its column (`100%`); the room background lives on `.ev-room`. |
| `src/styles/tokens.css` values | `settings.js` (`everest.colors`) and `styles.css` | Deep Blue `#0F2E5A`, Slate `#4B607D` and Inter. The room's final colour is this page's `#F7F5F0` instead of Everest's `#F6F9FD`. |

The brief describes the countdown as 32 → 26°C, but the Everest code counts 32 → 18°C, so 18°C is kept. To end at a different temperature, change `everest.temperature.to` in `settings.js` (the flap opens fully at 22°C, so keep `to` below that, or move `everest.flap.open` too).

The Everest live-site link is hidden: the Everest folder is a git repository with no GitHub remote, so there's no live URL yet. Add it as `styles.everest.url` in `settings.js` and the link appears.

## Switching on an extra style slot (Section 4)

Two slots, `style3` and `style4`, are ready and switched off. To switch one on:

1. **Artwork:** make a single-stroke SVG in the same format as `assets/face-line.svg` and save it in `assets/styles/` (for example `assets/styles/my-client.svg`):
   - one path whose `id` ends in `-main`: the continuous line, entering at the top centre and leaving at the bottom centre, drawn top to bottom;
   - every other path draws left to right and has `data-y` (the height at which it starts drawing, in the SVG's own units).
   Until you have one, the slots use `assets/styles/placeholder-style.svg`.
2. **settings.js** → `styles.style3` (or `style4`): set `show: true`, `artwork: 'assets/styles/my-client.svg'`, `title`, `subtitle`, and `url` (leave `url: ''` to hide the link).
3. Optional: reorder `sectionOrder` to change where it appears.

Nothing else needs touching: the section, its caption, its place in the line and its finale preview are built automatically. When `show` is `false`, the slot isn't shown and the line flows straight from the section before it to the finale.

## The chat box

- **Demo (default, `chat.mode: 'demo'`):** pressing Send shows "Thanks! We'll be in touch soon." and sends nothing anywhere. A note asks visitors not to enter personal details yet.
- **Live (`chat.mode: 'live'`):** sends the message to your form service (e.g. Formspree) at `chat.formEndpoint`. Live mode stays off (the box behaves as the demo) until both `chat.formEndpoint` and `chat.privacyPolicyUrl` are set.

Before going live, the site also needs the standard legal pages and checks listed in `~/.claude/CLAUDE.md` (privacy policy, terms, cookie policy, and so on).

## Rebuilding the font data

Only needed if you add or change files in `tools/svg-fonts/`:

```
node tools/build-fonts.mjs
```
