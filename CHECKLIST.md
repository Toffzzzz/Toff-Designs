# Quality checklist

Run **every** item at the end of every round. When the owner reports a bug, add a check here that would have caught it, and a test for it in tests/ where a test can catch it.

How each item is checked is written at the end of its line:

- **suite name** (for example *pages*): the test suite in `tests/`, run with `python3 tests/run_all.py` (every suite) or `python3 tests/run_all.py --suite pages` (one). It starts its own server and blocks or mocks the Worker.
- **Lighthouse**: `npx lighthouse` against `python3 tools/serve.py <port> --gzip`, one page at a time, desktop and mobile.
- **screenshots**: viewport frames taken while scrolling, at 390, 820, 1024 and 1440px (and a quick pass at 320 and 2560), tiled into contact sheets in scratch/ and looked at.
- **by hand**: a person (or the lead) tries it.

## Pages

- [ ] Every page (home, Lab, 404, both case studies, all five concept sites with their inner pages, the Linden Clinic page) loads at 390 and 1440 with no console errors, no failed requests and no responses of 400 or above, icons included. *pages*
- [ ] Nothing is requested from other websites (fonts, scripts, models and images are self-hosted). *pages*
- [ ] No sideways scrolling at 320 and 390px. *pages*
- [ ] One h1 per page; a title, a description and link-preview tags (og:title, og:description, og:image) on every page. *pages*
- [ ] Every internal link resolves; external links that open a new tab carry rel="noopener". *pages*
- [ ] The old addresses land on the nearest new part: the home page's #main, #opening, #ai-assistants, #selected-work, #try-it, #playground, #draw-your-site, #one-line, #what-we-build, #lab-teaser, #how-it-works, #included, #testimonials, #about, #contact and #enquiry, and the Lab's #build-itself, #particles-band, #one-line, #liquid-gold and #moving-ink. *pages*
- [ ] The 404 page works at a made-up address under /Toff-Designs/ and at the root of a domain (it works out its base from the address), and reads well as plain text if its styles fail. *pages*
- [ ] The home page is at most 12 laptop screens (1440×900) long with Kind words and About hidden. *pages*
- [ ] Canonical links, JSON-LD and sitemap.xml come from `siteUrl` in settings.js. *pages*
- [ ] Every page looks deliberate at 320, 390, 820, 1024, 1440 and 2560px: nothing overlapping, cut off or hidden behind the top bar or the concierge button; generous space; calm and premium; gold used sparingly. *screenshots*

## Motion

- [ ] Laptops: scroll-driven parts start only on screen and only ever move forward; scrolling down and back up reverses nothing. *motion*
- [ ] Phones: each part plays by itself when reached, and once started always finishes. *motion*
- [ ] Nothing is pinned: nothing but the top bar and the concierge button is fixed or sticky while its section scrolls past. *motion*
- [ ] A fresh visit opens at the top; in-page links add no #fragment. *motion*
- [ ] Back with and without bfcache (Playwright's default --disable-back-forward-cache removed, channel "chromium", go_back with wait_until "commit", and pageshow's persisted confirmed): you stay in place, what's on screen plays again, what's above plays as you scroll back up. Safari's late scroll restore is waited for (handwriting.settleMs). *motion*
- [ ] Jumping down (a section link, a scrollbar drag) plays what you land on. *motion*
- [ ] Reduced motion shows everything finished, with no animation, on every page including the concept sites and the Lab (a still with Play). *motion*
- [ ] Pixel checks find no ink outside what has been drawn (the pen, the drop line, the process line). *motion*
- [ ] Automatic motion stops for good when the visitor takes over; nothing advances by itself; anything that moves by itself for more than five seconds has a pause control. *lab*, *hero*, by hand
- [ ] Motion looks natural, never rushed, at every width, in the two screen recordings (laptop and phone). *screenshots*

## Hero

- [ ] Painting increases the revealed area and never decreases it. *hero*
- [ ] If the visitor doesn't paint, it finishes by itself (after hero.idleMs, in about hero.autoPaintMs); on phones it plays by itself and a tap finishes it. *hero*
- [ ] "Another site →" swaps in the next site without errors, and the caption says which site it is and whether it's a client's site or a concept. *hero*
- [ ] With WebGL switched off, the still sketch turns into the finished screenshot. *hero*
- [ ] Reduced motion (and Save-Data) shows the finished site. *hero*
- [ ] The still sketch is requested with fetchpriority="high", and the stage reserves its size (no layout shift). *hero*
- [ ] The stage is role="img" with a label naming the site, takes no keys, and "Build it" finishes it from the keyboard. *hero*
- [ ] The home page requests nothing from vendor/three, vendor/rapier or assets/lab. *hero*
- [ ] The sketch reads as a hand drawing (no mush in small text, no double outlines) for every site in the list. *screenshots*

## AI

- [ ] With the Worker blocked, every AI feature (the AI demo, the concierge, Design yours' Describe and Sketch) answers from the page and says so, with no errors. *ai*
- [ ] With a mocked stream, a tool call changes the site in the frame and shows its confirmation card. *ai*
- [ ] The message API ignores other origins and unknown actions, and checks every argument. *ai*
- [ ] The concierge never sends a name, email address or phone number to the Worker (every request inspected). *ai*
- [ ] The brief downloads. *ai*
- [ ] Design yours works in all three ways (Pick, Sketch, Describe), and Describe falls back offline. *ai*
- [ ] Live answers stop after ai.maxLiveAnswers (8) per visit, for each of the AI demo, the concierge and Describe. *ai*
- [ ] Every AI part shows its notice: it's an AI, questions go to Anthropic and aren't stored, please don't type personal details. *ai*, *screenshots*
- [ ] The Worker's own tests pass: `node test-round-05-routes.mjs`, `node test-sketch-ai-worker.mjs` and `node test-sketch-counter.mjs` in ~/Documents/toff-studio-tools/optional-ai/. *by hand*
- [ ] After every Worker deploy: /chat and /read-sketch answer (one small request each, with Origin https://toffzzzz.github.io); each new route answers once; Origin https://example.com gets 403; the 21st request in a minute gets 429 (send requests that fail validation, so nothing is spent). Never print the key. *by hand*
- [ ] The clinic never gives medical advice (it offers to book, NHS 111 or 999) and never asks for personal details. *ai*, by hand once live

## Concepts

- [ ] Each concept site's features work end to end, by mouse, keyboard and touch (Saltmarsh: booking, menu filters, private dining, vouchers; Morrow: build your drink, order ahead, open now, loyalty card; Atelier Wren: lookbook, before-and-after, booking with the patch-test rule, gift card; Hollis & Pine: shop filters, product page, basket, checkout preview; Hart & Sons: instant quote, postcode check, book a visit). *concepts*
- [ ] The concept ribbon is on every page, in the page flow, reachable by keyboard, and hidden with ?embed. *concepts*
- [ ] No reviews, testimonials, ratings, awards, accreditations, guarantees or "years in business". *concepts*
- [ ] Every phone number is in the drama range (020 7946 0000 to 0999) or one of 999, 111 and 0800 111 999. *concepts*
- [ ] Every concept page carries `<meta name="robots" content="noindex">`. *concepts*
- [ ] The facts the AI demo uses (hours, prices, rules) are exactly the same on the concept sites and in assets/studio/aiassist.js. *ai*, *concepts*
- [ ] Each site has its own art direction, none uses the studio's devices, and its signature moment runs only while on screen. *screenshots*

## Lab

- [ ] Every piece opens, runs, pauses and is disposed of; after visiting all eight, no WebGL contexts are left beyond the current one. *lab*
- [ ] lab.html#<id> opens straight to that piece, and the old anchors land on theirs. *lab*
- [ ] With hardwareConcurrency at 2, each piece opens as a still with Play. *lab*
- [ ] The index shows each title, its one line and its still; arrow keys move between pieces and Escape goes back. *lab*
- [ ] Sound stays off until turned on. *lab*
- [ ] Every piece works by touch, and by keyboard where that makes sense, and has a text description for screen readers. *lab*, *a11y*

## Accessibility

- [ ] axe finds no serious or critical issues on any page, at 390 and 1440. *a11y*
- [ ] The keyboard reaches every control in a sensible order, with a visible focus ring; dialogs and the phone menu trap focus, close with Escape and return focus. *a11y*
- [ ] Computed contrast passes WCAG 2.2 AA for every piece of text (4.5 : 1, large text 3 : 1). *a11y*
- [ ] Tap targets are at least 44px on phones. *a11y*
- [ ] Every image has alt text (decorative ones empty alt), and every canvas a text alternative. *a11y*
- [ ] Lighthouse accessibility is 100 on every page. *Lighthouse*

## Copy

- [ ] No em dashes in visible text. *copy*
- [ ] No stock words (bespoke, seamless, elevate, effortless, world-class, supercharge, unlock, delve, crafted). *copy*
- [ ] No uppercase text with letter-spacing on the studio's pages. *copy*
- [ ] No full stops at the end of headings; headings in sentence case. *copy*
- [ ] No labels above headings, no 01/02/03 numbering, no equal card grids or stat rows on the studio's pages, no slogans, no glows, blur or gradient text, no fake window chrome, no decorative motion. *screenshots* (the ai-tells-auditor review)
- [ ] UK English, plain and specific; proper quotes and apostrophes; a non-breaking space before units (32 °C). *copy*, *screenshots*

## Performance

- [ ] The median frame is under 17.5 ms and the 95th percentile under 25 ms while the hero paints and the case films play (headed browser on the Mac, real graphics chip; skipped with TOFF_CI). *performance*
- [ ] The home page before any interaction is at most 900 KB on a laptop and 700 KB on a phone (compressed), with at most 150 KB of JavaScript. *performance*
- [ ] Each concept site is under 400 KB before interaction. *performance*
- [ ] Lighthouse: performance at least 95 on desktop and 90 on mobile; accessibility and best practices 100; SEO 100 (on the concept sites apart from the indexing check, which noindex fails on purpose); largest contentful paint under 2 s on desktop and 2.5 s on mobile; layout shift under 0.02. Home page, every concept site and the Lab. *Lighthouse*
- [ ] Each case film is under 2.5 MB and loads only when near; each concept preview is under 600 KB and loads on first hover. *performance*

## Safety and content

- [ ] Nothing on the site claims anything about the studio that isn't true: no testimonials, reviews, ratings, client names, prices, timeframes, awards, accreditations, statistics or results. *by hand*
- [ ] No studio prices anywhere; the enquiry's budget ranges are the only amounts; the hidden price line in How we work stays hidden. *copy*, by hand
- [ ] No AI-made pictures of the owner, Bluebird or Everest; the case studies use only real screenshots and captures. *by hand*
- [ ] Kind words and About stay hidden until real; showPlaceholders, data-unfinished and ?unfinished work as before. *pages*
- [ ] Every form and enquiry stays in demo mode until chatMode is 'live' and formEndpoint and legal.privacyPolicyUrl are both set; the concierge's contact step is never sent to the AI. *ai*
- [ ] The concept sites store nothing beyond sessionStorage and send nothing. *concepts*
- [ ] The Everest link says "Live site coming soon" while links.everest is empty. *pages*
- [ ] The Anthropic API key appears in no file, command, log or message (the guard hook blocks it). *by hand*
- [ ] Every font, library and image is in CREDITS.md with its licence and version. *by hand*
- [ ] DESIGN.md matches settings.js and tokens.css; DECISIONS.md has a line for every decision made this round. *by hand*
- [ ] COMPLIANCE.md and privacy-policy-draft.md describe every AI route and what it sends. *by hand*

## Release

- [ ] `python3 tests/run_all.py` passes every suite on the branch, and again on main after the merge. *all suites*
- [ ] The GitHub Actions run (.github/workflows/checks.yml, TOFF_CI=1) passes on the pushed branch. *by hand* (gh run list)
- [ ] git status is clean; files were added by name (never "git add ."); no zips, scratch, handover or test output committed. *by hand*
- [ ] Nothing that was in assets/ before the round was deleted or moved (compare with the backup-before-round-NN branch). *by hand*
- [ ] main is pushed only after the owner has replied "ship it" (.claude/ship-approved, then deleted). *by hand*
- [ ] After going live: the home page, the Lab, one concept site and a made-up address (the 404 page) load on https://toffzzzz.github.io/Toff-Designs/ with no errors. *by hand*
- [ ] **Before launch:** the legal pages, a real email address, the privacy policy, company details and the enquiry going live, as listed in COMPLIANCE.md. *by hand*

# Retired in Round 05

The checks below are the Round 01 to 04 checklist, kept unchanged for the record. They test parts Round 05 retired (the opening, the four phrases, the showcase pictures, the Try it tabs, the six-step enquiry, the Sketch lens, round 04's top bar); the scripts they name stay in /tmp/toff-tests and test retired parts.

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
- [ ] Sketch your homepage with the AI on: a box with MAP written in it becomes a map, the status ends "Checked by AI", the privacy line shows under the paper; with the Worker unreachable the instant reading stays and nothing breaks. The Worker refuses the 21st sketch in a minute (429). Run `node test-sketch-ai-worker.mjs`. *(Round 03 AI follow-up: Cloudflare's built-in rate limiter silently never blocked on the live Worker; always test the live limit, not just the local one.)*
- [ ] The Lab: solid top bar, a way back, each effect stops off screen, low-powered devices get plain fallbacks, sound is off until turned on.

## Round 04

- [ ] AI assistants: each business and its chips answer; editing a taught fact changes the next answer; with the Worker on, the header says questions go to Anthropic and answers come from Claude (live test once: Café, "Do you have oat milk?" names "Milk and allergies"); with the Worker blocked it answers from the facts and says so, with no errors.
- [ ] Try it: four tabs (arrow keys, Home, End); links to #playground, #draw-your-site, #one-line, #what-we-build and "Open in the playground" open the right tab first and never scroll to a hidden tool; no tool appears twice on the page.
- [ ] Draw your site: blocks drag and tap in, headings keep their typed text exactly; nothing is built until "I'm done"; exactly one privacy line under the paper, shown only with the AI on.
- [ ] The Worker: `node test-sketch-ai-worker.mjs` and `node test-sketch-counter.mjs` pass; after deploying, the 21st request in a minute to `/chat` gets 429 (send empty questions so Anthropic isn't called) and another website's Origin gets 403.
- [ ] Unfinished details: with `showPlaceholders: false` no `data-unfinished` item, "Placeholder" note or empty Kind words shows; `?unfinished` shows them all; filling a value in settings.js shows it without `?unfinished`.
- [ ] 404.html: every path is absolute (`/Toff-Designs/…` while there's no CNAME), `noindex`, and it renders fully at a made-up address two folders deep.
- [ ] The Lab: the logo drawer's four sample logos load from the site root; "One line" in its top bar; the gold-line transition between the main site and the Lab (none with reduced motion).

## What's included, Kind words

- [ ] Items and quotes fade up once when they come into view (600ms, 12px, no bounce) and never replay while on the page.
- [ ] No studio prices anywhere on the site (the enquiry's budget ranges are the only amounts; the hidden price line in How it works stays hidden until the owner sets real prices). The made-up businesses in the opening drawing and the AI assistants demo may show their own prices (owner, Round 04).
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
