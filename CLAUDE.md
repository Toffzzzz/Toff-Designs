# Toff Studio portfolio: instructions for every session

This is the Toff Studio portfolio site: plain HTML, CSS and JavaScript, to be hosted on GitHub Pages. It is built in rounds. Each round's full prompt is saved in `rounds/`.

## Before changing anything

1. Read **DESIGN.md** (exact design values), **DECISIONS.md** (dated log of every design decision) and **CHECKLIST.md** (quality checks).
2. Check the request against DECISIONS.md. If it contradicts an earlier decision, warn the owner before acting.
3. Every new decision the owner makes goes into DECISIONS.md as a new dated line. Never remove old lines; if a decision changes, add a line saying what it replaces.
4. Whenever a value changes in `settings.js` or DESIGN.md, update the other so they match.
5. At the end of every round, run every item in CHECKLIST.md. When the owner reports a bug, add a check that would have caught it.
6. Save each round's prompt as `rounds/round-NN.md`.

## Standing rules

- Never delete, move, rename or overwrite anything in the Everest project folder, the bluebird-wellness folder, or anywhere outside this project folder, except files a round explicitly says to create or update in `~/.claude/`. Treat everything else on the Mac as read-only.
- Never delete files inside `assets/`. Copied or processed files go in their own subfolders.
- If any step would delete or overwrite something, stop and tell the owner first.

## The concept (updated in round 02; see DECISIONS.md)

The page opens with a website sketched by hand in cream ink that turns into the finished, full-colour site ("We sketch it. Then we build it."). One ink line then drops from it and writes four phrases ("You plan", "We design", "We deliver", "So... what will it be?") beside pictures of the studio's work, followed by How we work, What's included and Kind words. The line returns in the finale to write "Tell us what you need" above a six-step guided enquiry. Laptops: driven by scrolling.

## Global look (Midnight & Gold, round 02)

- The whole site is dark: midnight #0E1628 page; cream #F1E3C6 lines and links; text #F6F0E4; slate #A7AFC2 for quiet text; gold #D8AC5F for small labels, numerals, fine rules, the one solid button and selected states; tint #1A2541 for raised areas. The footer (#0A101E, fine gold rule above) is the only change of shade. Exact values and contrast ratios are in DESIGN.md.
- Every line has the same gold under-shadow (about 3.5px below); don't blur long lines that redraw every frame. The same stroke thickness throughout, with round ends and joins.
- Cormorant Garamond (light, never bold) for headings and display text; Inter for text, labels and buttons; both self-hosted in `fonts/`. A faint paper grain over the page.
- Minimal header: "Toff Studio" wordmark, Work, Process, Contact and a gold "Start a project" button; hides when scrolling down, returns when scrolling up; a full-screen menu on phones.
- Calm, spacious, premium, few words. No prices on the site. No colours hard-coded outside the CSS variables (which settings.js overwrites).

## Global motion rules (every section)

- Laptops/desktops: animations are driven by scrolling, at a smooth, natural speed, never rushed, starting only when that part is on screen.
- Phones: each part plays by itself when it comes into view, at a natural speed.
- Never reverses, replays, snaps back or freezes half-way while on the page; once something starts drawing itself it always finishes.
- Coming back via Back/Forward (with or without bfcache, and with Safari's late scroll restore) keeps your place: what's on screen plays again, what's above plays as you scroll back up. Jumping down plays what you land on.
- No pinning anywhere (round 02 replaced the finale's pin).
- A fresh visit opens at the very top.
- If the visitor has "reduce motion" turned on, show everything finished, with no animation.

## Settings

Every adjustable value lives in one file, `settings.js`: studio name, email, links, placeholders switch, testimonials, timeframes, reply time, legal pages, company details, enquiry mode, colours, and the opening, handwriting, picture, picker and fade-up timings. The owner must be able to change any of these without touching other code. Never hard-code one of these values anywhere else. The handwriting colour (`handwriting.color`, `handwriting.shadow.color`) must change together with `--ink` and `--line-shadow`.

## How the site is built (short version; README.md has the detail)

- `index.html` + `site.css` + `site.js` put the page together; `site.js` mounts the pre-built parts and fills in what comes from settings.js.
- The opening (`assets/opening/`), handwriting engine and line (`assets/handwriting/`), showcase pictures (`assets/showcase/`) and style picker (`assets/enquiry/`) were delivered finished and tested. Don't rewrite, redraw, re-trace or "improve" them; match the site's look only through CSS variables. Never edit `line-data.js` or the line SVG/JSON by hand: change `LAYOUTS` in `tools/handwriting/build_line.py`, run it (no WARNING), and copy the outputs into `assets/handwriting/`.
- The finale's lines come from `tools/handwriting/build_finale.py` (into `assets/finale/finale-data.js`), using build_line.py's own functions.
- Round 01's files (`script.js`, `styles.css`, `js/`, `paths/`, `vendor/`, `fonts-preview.html`) are no longer loaded; README.md lists them. Never redraw or retrace `face-line.svg`.
- Preview locally with `python3 tools/serve.py 8000`.
