# Toff Studio portfolio

A deep midnight page with cream ink lines and gold details. It opens with a website sketched by hand that turns into the finished thing ("We sketch it. Then we build it."), then one ink line writes "You plan", "We design", "We deliver" and "So... what will it be?" beside pictures of the studio's work. Three short sections follow (How we work, What's included, Kind words), and the page ends with the line writing "Tell us what you need" above a six-step guided enquiry.

Plain HTML, CSS and JavaScript, ready for GitHub Pages (https://toffzzzz.github.io/Toff-Designs/). No build step and no libraries.

## Preview it

```
python3 tools/serve.py 8000
```

Then open http://localhost:8000. Phones on the same Wi-Fi can open `http://<your Mac's Wi-Fi address>:8000` (find it with `ipconfig getifaddr en0`).

The pre-built parts each have a preview: http://localhost:8000/assets/handwriting/preview.html (opening, handwriting and pictures) and http://localhost:8000/assets/enquiry/preview.html (the style picker). These previews stay on your Mac; they aren't published.

## Change things

Everything adjustable is in **`settings.js`**, each value with a comment: studio name, email, location, links, social links, legal pages, company details, process timeframes, testimonials, reply time, the enquiry's mode, colours, and the timings of the opening, handwriting, pictures, picker icons and fade-ups. After changing a value, update DESIGN.md to match.

### Filling in the placeholders

While `showPlaceholders: true`, anything not filled in yet shows a clearly marked placeholder. Fill these in `settings.js`:

| What | Where in settings.js | Example |
|---|---|---|
| Testimonials | `testimonials` → the Bluebird entry and the Everest entry: `quote`, `name` (and `business`) | `quote: 'Our clients love the new site.', name: 'Dr Jane Smith'` |
| Process timeframes | `process.timeframes`: four entries, in order (Discovery call, Sketch, Build, Launch & care) | `['30 minutes', 'About a week', '3–4 weeks', 'Ongoing']` |
| Reply time | `contact.replyTime` | `'two working days'` (shows "We'll reply within two working days.") |
| Your email | `email` | `'hello@toffstudio.com'` |
| Company details | `company`: `name`, `number`, `address`, `vat` (each appears only once set) | `name: 'Toff Studio Ltd'` |
| Legal pages | `legal`: `privacyPolicyUrl`, `termsUrl`, `cookiesUrl` (each link appears only once set) | `'privacy.html'` |
| Everest's live site | `links.everest` | `'https://…'` (replaces "Live site coming soon") |

**Before showing the site to clients or launching:** set `showPlaceholders: false` (anything still missing is then hidden, with no gaps) or fill in every placeholder.

### Going live with the enquiry

The enquiry is in demo mode (`chatMode: 'demo'`): it sends and stores nothing and says so. To receive enquiries, set `chatMode: 'live'`, `formEndpoint` (your form service, e.g. Formspree) and `legal.privacyPolicyUrl`. It stays in demo mode until both the endpoint and the privacy policy are set. The site also needs the standard pages and checks in `~/.claude/CLAUDE.md` (privacy policy, terms, cookie policy, and so on) before launch.

## Files

| Path | What it is |
|---|---|
| `index.html` | The page: header, opening, handwriting and pictures, How we work, What's included, Kind words, the finale and enquiry, footer, and the templates the parts use |
| `site.css` | The main stylesheet: fonts, colours (CSS variables), type, header, sections, enquiry, footer |
| `site.js` | Puts the page together: fills in settings, mounts the parts, header, phone menu, fade-ups, the enquiry |
| `settings.js` | Every adjustable value |
| `assets/opening/` | The opening page "From sketch to site" (delivered in round 02; don't edit) |
| `assets/handwriting/` | The handwriting engine and its line (`line-data.js` is generated; don't edit by hand) |
| `assets/showcase/` | The pictures beside the phrases: plan notepad, Bluebird, Everest (delivered in round 02; don't edit) |
| `assets/enquiry/` | The style picker for the enquiry's "How should it look?" step (delivered in round 02; don't edit) |
| `assets/finale/finale-data.js` | The finale's "So... what will it be?" and "Tell us what you need" lines (generated; don't edit by hand) |
| `fonts/` | Cormorant Garamond and Inter, self-hosted, with their licences |
| `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `og-image.png` | Icons and the link-preview image (made by `tools/make-icons.py`) |
| `tools/handwriting/build_line.py` | Rebuilds the handwriting line. Positions are in `LAYOUTS` at the top; run `python3 build_line.py` in that folder (needs numpy), check it prints no WARNING, then copy `line-data.js` and `line-*.svg/json` into `assets/handwriting/` |
| `tools/handwriting/build_finale.py` | Rebuilds the finale lines into `assets/finale/finale-data.js` (`python3 build_finale.py` in that folder; needs numpy) |
| `tools/handwriting/jhf.py`, `cursive.jhf`, `hershey-licence.txt` | The Hershey cursive font and its acknowledgement |
| `tools/make-icons.py` | Remakes the icons and the preview image (needs fonttools, pillow and playwright) |
| `tools/serve.py` | Local preview server |
| `CLAUDE.md`, `DESIGN.md`, `DECISIONS.md`, `CHECKLIST.md`, `CREDITS.md` | Instructions, design values, decision log, quality checks, licences |
| `rounds/` | Each round's full prompt |

## How it fits together

1. **Opening** (`Opening.mount`): plays once when the page opens; its last line drops to the bottom centre of the screen.
2. **Handwriting** (`Handwriting.mount`): the line carries on from exactly that point and writes the four phrases. Laptops: each phrase writes while it passes the middle of the screen. Phones: each part writes itself when reached.
3. **Showcase** (`Showcase.mount`): each picture's progress *is* its phrase's writing progress, so it eases in step with it. Positions come from the line data, so the line never crosses a picture.
4. **How we work, What's included, Kind words**: headings and text fade up once as they come into view.
5. **Finale**: "So... what will it be?" is shown already written; a second copy of the handwriting engine writes "Tell us what you need" and runs a short tail down into the enquiry.
6. **Enquiry**: six steps, one at a time; step 3 is the style picker (`StylePicker.mount`).

All of them follow the same motion rules: never backwards, no pinning, Back/bfcache/late scroll restore handled, reduced motion shows everything finished.

## No longer used (kept in the project, not loaded)

Round 01's implementation, replaced in round 02:

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
