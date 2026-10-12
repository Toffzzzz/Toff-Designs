# Toff Studio portfolio

A deep midnight page with cream ink lines and gold details. It opens with a website sketched by hand that turns into the finished thing ("We sketch it. Then we build it."), then one ink line writes "You plan", "We design", "We deliver" and "So... what will it be?" beside pictures of the studio's work. Then: Recent work (Bluebird, Everest and three concept studies), Things we can build into your site (working demos), Try a look for your business (the playground), Sketch your homepage, Your logo drawn in one continuous line, How it works, What's included, Kind words, About the studio, and a six-step enquiry under a pen-written "Tell us what you need". A slim top bar has "Start a project" from the first screen; "Plan with us" is a demo planner in the corner.

The Lab (`lab.html`) holds the showpiece experiments, kept off the main page on purpose.

Plain HTML, CSS and JavaScript, ready for GitHub Pages (https://toffzzzz.github.io/Toff-Designs/). No build step and no libraries.

## Preview it

```
python3 tools/serve.py 8000
```

Then open http://localhost:8000. Phones on the same Wi-Fi can open `http://<your Mac's Wi-Fi address>:8000` (find it with `ipconfig getifaddr en0`).

The pre-built parts each have a preview: http://localhost:8000/assets/handwriting/preview.html (opening, handwriting and pictures) and http://localhost:8000/assets/enquiry/preview.html (the style picker). These two stay on your Mac; they aren't published. The Round 03 previews, http://localhost:8000/assets/studio/site.html (the whole main page as designed) and http://localhost:8000/assets/studio/lab.html, are kept in the repo because the tests and later rounds use them.

## Change things

Everything adjustable is in **`settings.js`**, each value with a comment: studio name, email, location, links, social links, legal pages, company details, process timeframes, testimonials, reply time, the enquiry's mode, colours, and the timings of the opening, handwriting, pictures, picker icons and fade-ups. After changing a value, update DESIGN.md to match.

### Filling in the placeholders

While `showPlaceholders: true`, anything not filled in yet shows a clearly marked placeholder. Fill these in `settings.js`:

| What | Where in settings.js | Example |
|---|---|---|
| Testimonials | `testimonials` → the Bluebird entry and the Everest entry: `quote`, `name` (and `business`) | `quote: 'Our clients love the new site.', name: 'Dr Jane Smith'` |
| How it works timeframes | `process.timeframes`: four entries, in order (Discovery call, Sketch, Build, Launch & care); shown as "How long: …" | `['30 minutes', 'About a week', '3–4 weeks', 'Ongoing']` |
| Reply time | `contact.replyTime` | `'two working days'` (shows "We'll reply within two working days.") |
| Your email | `email` | `'hello@toffstudio.com'` |
| About the studio | the text in `index.html` (`#about`) and `assets/studio/about.html`; then remove its "Placeholder text" note | |
| Company details | `company`: `name`, `number`, `address`, `vat` (each appears only once set) | `name: 'Toff Studio Ltd'` |
| Legal pages | `legal`: `privacyPolicyUrl`, `termsUrl`, `cookiesUrl` (each link appears only once set) | `'privacy.html'` |
| Everest's live site | `links.everest` | `'https://…'` (replaces "Live site coming soon") |

**Before showing the site to clients or launching:** set `showPlaceholders: false` (anything still missing is then hidden, with no gaps) or fill in every placeholder.

### Going live with the enquiry

The enquiry and the "Plan with us" planner are in demo mode (`chatMode: 'demo'`): they send and store nothing and say so. To receive enquiries, set `chatMode: 'live'`, `formEndpoint` (your form service, e.g. Formspree) and `legal.privacyPolicyUrl`. It stays in demo mode until both the endpoint and the privacy policy are set. The site also needs the standard pages and checks in `~/.claude/CLAUDE.md` (privacy policy, terms, cookie policy, and so on) before launch.

## Files

| Path | What it is |
|---|---|
| `index.html` | The main page, in the order of `assets/studio/site.html`, with the real six-step enquiry, the footer, the templates the parts use, and the short script that mounts the Round 03 sections |
| `lab.html` | The Lab: the showpiece experiments (from `assets/studio/lab.html`) |
| `site.css` | The main stylesheet: fonts (Work Sans, Cormorant Garamond, Inter for the example sites), colours (CSS variables), What's included, Kind words, the enquiry, the footer, and small "Not template-looking" corrections to the delivered parts |
| `site.js` | Fills in settings, mounts the opening and the handwriting, in-page links, fade-ups, the enquiry; also fills the Lab's footer |
| `settings.js` | Every adjustable value |
| `assets/opening/` | The opening page "From sketch to site" (delivered in round 02, updated in round 03; don't edit) |
| `assets/handwriting/` | The handwriting engine and its line (`line-data.js` is generated; don't edit by hand) |
| `assets/showcase/` | The pictures beside the phrases: plan notepad, Bluebird, Everest (delivered in round 02, updated in round 03; don't edit) |
| `assets/enquiry/` | The style picker for the enquiry's "How should it look?" step, with the playground's "Your design" choice (delivered; don't edit) |
| `assets/studio/` | Round 03's parts (delivered and tested; don't edit): top bar, Recent work, demos, playground, Sketch your homepage, logo in one line, How it works, About, planner, Sketch lens, pen-written heading and signature, the Lab's experiments, fonts, screenshots and example photos. `site.html` and `lab.html` are the previews; `base.css` is for the previews only |
| `assets/finale/finale-data.js` | Round 02's finale lines (no longer loaded; kept) |
| `fonts/` | Round 02's Cormorant Garamond and Inter woff2 files (no longer loaded; the site now uses `assets/studio/fonts/`) |
| `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `og-image.png` | Icons and the link-preview image (made by `tools/make-icons.py`) |
| `tools/handwriting/build_line.py` | Rebuilds the handwriting line. Positions are in `LAYOUTS` at the top; run `python3 build_line.py` in that folder (needs numpy), check it prints no WARNING, then copy `line-data.js` and `line-*.svg/json` into `assets/handwriting/` |
| `tools/handwriting/build_finale.py` | Rebuilds the finale lines into `assets/finale/finale-data.js` (`python3 build_finale.py` in that folder; needs numpy) |
| `tools/handwriting/jhf.py`, `cursive.jhf`, `hershey-licence.txt` | The Hershey cursive font and its acknowledgement |
| `tools/make-icons.py` | Remakes the icons and the preview image (needs fonttools, pillow and playwright) |
| `tools/serve.py` | Local preview server |
| `CLAUDE.md`, `DESIGN.md`, `DECISIONS.md`, `CHECKLIST.md`, `CREDITS.md` | Instructions, design values, decision log, quality checks, licences |
| `rounds/` | Each round's full prompt |

## How it fits together

1. **Opening** (`Opening.mount`, from site.js): plays once when the page opens; its last line drops to the bottom centre of the screen.
2. **Handwriting** (`Handwriting.mount`): the line carries on from exactly that point and writes the four phrases. Laptops: each phrase writes while it passes the middle of the screen. Phones: each part writes itself when reached.
3. **Showcase** (`Showcase.mount`): each picture's progress *is* its phrase's writing progress, so it eases in step with it.
4. **Round 03 sections** (the script at the bottom of `index.html`, as in the preview): Cases, Capabilities, Playground, DrawSite, OneLine, Process, InkWriter (enquiry heading and footer signature), Kinetic (headings), TopBar, XRay (Sketch lens), Assistant ("Plan with us").
5. **What's included, Kind words**: items and quotes fade up once as they come into view.
6. **Enquiry** (site.js): six steps, one at a time; step 3 is the style picker (`StylePicker.mount`), which also takes a design sent from the playground ("Send this to Toff").

All of them follow the same motion rules: never backwards, no pinning, Back/bfcache/late scroll restore handled, reduced motion shows everything finished.

## Tests

The tests that came with each round live outside the repo (in /tmp/toff-tests/tools): `check-round-03.py`, `check-round-03-features.py` and `check-sketch-ai.py` (run against `assets/studio/site.html` or `index.html`), `check-style-picker.py` (`assets/enquiry/`) and `check-round-02.py` (`assets/handwriting/`). They need `pip3 install playwright pillow` and `python3 -m playwright install chromium`.

## No longer used (kept in the project, not loaded)

Round 02's finale line (`assets/finale/finale-data.js`) and woff2 fonts (`fonts/`) were replaced in round 03. Round 01's implementation, replaced in round 02:

| Path | What it was |
|---|---|
| `script.js` | Round 01's line, timeline, pen clock, finale and chat box |
| `styles.css` | Round 01's stylesheet |
| `js/handwriting.js` | Round 01's single-line font layout code (the old EMS/Hershey phrase drawing) |
| `js/everest-ac.js` | Round 01's Everest air-conditioning section |
| `paths/fonts/` | Round 01's stroke data for the EMS and Hershey single-line fonts |
| `tools/build-fonts.mjs`, `tools/svg-fonts/` | Rebuilt `paths/fonts/` |
| `fonts-preview.html` | Every round 01 phrase in every single-line font |
| `vendor/` | GSAP 3.15.0 and Lenis 1.3.26 (no libraries are loaded now) |
| `assets/face-line.svg` | The Bluebird face as Round 01's separate style section (the same drawing is now inside the Bluebird picture) |
| `assets/everest/` | The AC images for Round 01's Everest section (kept; the pictures now use `assets/showcase/ac-*.png`) |
| `assets/styles/placeholder-style.svg` | Round 01's extra style slots |
| `assets/fonts/inter/` | Round 01's variable Inter (now `fonts/inter/`) |
