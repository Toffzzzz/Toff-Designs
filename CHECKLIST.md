# Quality checklist

Run **every** item at the end of every round. When the owner reports a bug, add a check here that would have caught it. Preview with `python3 tools/serve.py 8000`, then test at **390, 820, 1024 and 1440px** wide (and 1920px for the line joins), screenshotting key moments of each section and looking at them. The automated checks (kept outside the repo, in /tmp/toff-tests/tools) cover most of these: `check-round-03.py`, `check-round-03-features.py` and `check-sketch-ai.py` on `assets/studio/site.html` **and** on `index.html`, `check-style-picker.py` on `assets/enquiry/`, `check-round-02.py` on `assets/handwriting/`, and `node test-sketch-ai-worker.mjs` in ~/Documents/toff-studio-tools/optional-ai/.

## Whole page

- [ ] Scroll the whole page start to finish at 390, 820, 1024 and 1440px; screenshot key moments of every section and check them as a discerning client would: nothing overlapping, cut off or hidden; generous space; calm and premium; gold used sparingly.
- [ ] The opening, handwriting and showcase look and behave exactly like `assets/handwriting/preview.html` (apart from the site's fonts, which the parts take from the CSS variables).
- [ ] The style picker looks and behaves exactly like `assets/enquiry/preview.html`.
- [ ] `index.html` matches `assets/studio/site.html` section for section (same order, stylesheets, scripts and mount code), apart from the real six-step enquiry, What's included and Kind words; `lab.html` matches `assets/studio/lab.html`.
- [ ] The main page loads none of the Lab's effects (buildself, particles, monogram, fluid, sound).
- [ ] "Start a project" is on the first screen at every width; "Plan with us" is the only floating button and covers nothing important.
- [ ] The palette matches DESIGN.md everywhere: no leftover light-page colours, no hard-coded colours in new CSS or JS (only the variables on `:root`, which settings.js overwrites).
- [ ] Lines meet with no gap or jump (opening → handwriting) at 390, 820, 1024, 1440 and 1920px.
- [ ] Nothing reverses, replays, snaps back or freezes half-way when scrolling back up; once something starts drawing it finishes.
- [ ] No pinning anywhere; every section scrolls continuously.
- [ ] The page opens at the very top on a fresh visit, and header links don't add a #fragment to the address.
- [ ] Laptops: drawing starts only when that part is on screen and follows the scroll at a natural pace. Phones: each part plays by itself when it comes into view, in order.
- [ ] Back (with bfcache, without bfcache) and Safari's late scroll restore: you stay in place, what's on screen plays again, what's above plays as you scroll back up (phones: in pen order). Jumping down plays what you land on. Confirm the bfcache case really came from bfcache (`pageshow` with `persisted` true). *(Round 02: the preview server's `no-store` header silently blocked bfcache; tools/serve.py must send `no-cache`.)*
- [ ] Reduced motion (`prefers-reduced-motion: reduce`) shows everything finished: opening, line, pictures, finale heading, fade-ups and picker icons.
- [ ] Pixel checks: no ink appears outside what has been drawn (ink = any pixel clearly different from the page colour).
- [ ] 60fps while animating (median frame under 17.5ms, 95th percentile under 25ms).
- [ ] No console errors, failed requests or 400+ responses, including the favicon, touch icon and preview image.
- [ ] Nothing loaded from other sites (fonts self-hosted, no CDN scripts).
- [ ] Nothing makes the page wider than the screen: `document.documentElement.scrollWidth` equals the window width at 390px. *(Bug, round 01: previews waiting off-screen widened the phone page, which zoomed it out.)*

## Opening, handwriting and showcase

- [ ] The opening plays on load and finishes (sketch → button pressed → full-colour site → line drops to the bottom).
- [ ] The header never covers the opening's headline on load.
- [ ] The handwriting writes "You plan", "We design", "We deliver", "So... what will it be?" in the cursive, each phrase while it's in the middle of the screen (laptops) or as it's reached (phones).
- [ ] The line never crosses a picture; every drawing stays inside its picture, clear of its caption (every point plus half the line width).
- [ ] Pictures have no background boxes and ease in step with their phrases, never ahead and never backwards.
- [ ] Everest ends cool: warm glow gone, cool glow in, 26 °C in icy blue.
- [ ] Bluebird and Everest links open the right sites in a new tab (or Everest shows "Live site coming soon" while `links.everest` is empty, and the style picker shows no "View site" link for it).
- [ ] Phones: pictures sit under their phrases, inside the screen.
- [ ] Undrawn strokes are hidden, never a zero-length dash (it shows as a dot with round ends).

## Not template-looking (DESIGN.md)

- [ ] No label or caption above a heading; no uppercase-with-letter-spacing text on the studio's own pages; no 01/02/03 numbering; no giant numerals.
- [ ] No equal card grids, no stat rows, no slogans, no em dashes in visible text, no stock words (bespoke, seamless, elevate, effortless, world-class) apart from the owner's own wording noted in DECISIONS.md; headings in sentence case without full stops.
- [ ] No glows, halos, backdrop blur, gradient text; buttons and chips 8px corners; nothing pulsing, bouncing or blinking; no three-dot window bars except the opening's drawing of a browser.

## Round 03 sections

- [ ] Recent work: Bluebird links to its live site; Everest says "Live site coming soon" with no link; Sketch / Site switch works; the concept studies are marked Concept.
- [ ] The demos, the playground, Sketch your homepage, the logo in one line, How it works, the Sketch lens and the planner work by keyboard and touch; nothing in them sends data (the planner and the bookings are demos).
- [ ] The Lab: solid top bar, a way back, each effect stops off screen, low-powered devices get plain fallbacks, sound is off until turned on.

## What's included, Kind words

- [ ] Items and quotes fade up once when they come into view (600ms, 12px, no bounce) and never replay while on the page.
- [ ] No prices anywhere on the site (the enquiry's budget ranges are the only amounts).
- [ ] Placeholders are clearly marked (a quiet italic "Placeholder" note) and none is a made-up quote, name or timeframe.
- [ ] With `showPlaceholders: false`, every unfilled item is hidden with no gaps (a section with nothing filled in is hidden completely); each placeholder disappears as soon as its real value is set in settings.js.
- [ ] **BEFORE LAUNCH: set `showPlaceholders` to `false` or fill in every placeholder.**

## Enquiry

- [ ] "Tell us what you need" is written once in flat ink (no canvas behind it) when it comes into view; a greyed-out Continue has its note beside it ("Pick one to continue", or "Add a sentence to continue" on step 1).
- [ ] The enquiry works start to finish in demo mode, keyboard only, for each of the style choices (and "Your design" sent from the playground): Continue disabled until answered; "Plan it yourself" notes appear in the summary; switching away from it drops the notes; Back keeps every answer.
- [ ] The style picker's icons draw once when the step appears and don't replay.
- [ ] Demo mode sends and stores nothing (no requests, no storage, no cookies) and shows "Preview: please don't enter personal details yet."
- [ ] Live mode can't switch on until both `legal.privacyPolicyUrl` and `formEndpoint` are set.
- [ ] Phones: the field you're typing in stays clear of the keyboard.

## Accessibility

- [ ] Only one h1 exposed to screen readers (the opening's; the example sites' own h1s sit inside role="img" or aria-hidden parts); the hidden handwriting heading is an h2.
- [ ] Colour contrast computed from the real rendered colours passes WCAG AA (4.5:1, large text 3:1) for every piece of text, including placeholders, errors and the enquiry's thank-you.
- [ ] Keyboard: the skip link (first), the top bar's links, picture links, every demo and enquiry control and the phone menu are reachable, with a visible cream or gold focus outline; Escape closes the menu and focus returns to "Menu".
- [ ] Images have alt text (decorative ones have empty alt); drawings are aria-hidden; the phrases and the finale heading exist as real (visually hidden) text.
- [ ] Tap targets are at least 44px tall on phones.

## Top bar

- [ ] Over the opening: only the name, the Sketch lens and "Start a project"; once scrolled: solid, with the section links and exactly one marked as "you are here". 801–1000px: the name hides and everything fits on one line. Phones: name, "Start a project", Menu.
- [ ] Links land just below the bar (never under it) and add no #fragment to the address.

## Privacy and files

- [ ] Fonts are self-hosted and every font and licence is recorded in CREDITS.md.
- [ ] Favicon (SVG and ICO), apple-touch icon (180 × 180) and Open Graph image (1200 × 630) load; title, description and theme-color #0E1628 are set.
- [ ] DESIGN.md matches settings.js; DECISIONS.md has a line for every decision made this round.
- [ ] Nothing outside this folder was changed; nothing in `assets/` was deleted.
- [ ] Look at every file in `git status` before committing (never `git add .`; no zips, previews, `__pycache__` or `node_modules`).

## Retired in Round 02 (kept for the record; these parts no longer exist)

- Round 02's header (hides on the way down, returns on the way up, full-screen phone menu) and the finale's "So... what will it be?" reprise with the handwriting engine writing "Tell us what you need" (replaced in round 03 by the top bar and the pen-written heading).
- Section 1 (Round 01 fonts): every letter draws in natural pen order with no outline double-tracing *(Round 01: Hershey "medium" fonts double their strokes; use the `…Single` versions)*; i/j dots and t crosses come just after their word; the joining line leaves each phrase heading downwards; phones: phrases stack vertically *(Bug, round 01: start positions were counted twice, so phrases only played after scrolling past them)*. Replaced by the delivered cursive line, which the delivered checks cover.
- Styles: the face matches `assets/face-line.svg` exactly (now drawn inside the Bluebird picture, as delivered); the AC animation matches the Everest original (32 → 18 °C; now 32 → 26 °C in the Everest picture); the line ends at the top of the AC unit; phones: the line never crosses a caption; `style3`/`style4` switch on and off.
- Finale and chat box: previews slide in and shrink to the top; phones: previews in a row or grid; the chat box's friendly errors and "Thanks! We'll be in touch soon." (replaced by the guided enquiry checks above).
- Only the finale pins, and only on laptops (replaced by: no pinning anywhere).
- The page opens at the very top, even after reloading partway down (still true for fresh visits and reloads; Back/Forward now keep the visitor's place, as the master prompt asks).
