ROUND 02 — TOFF STUDIO PORTFOLIO: MIDNIGHT & GOLD, OPENING PAGE, HANDWRITING WITH SHOWCASE, PREMIUM BOUTIQUE FINISH, GUIDED ENQUIRY WITH STYLE PICKER, AND MY STUDIO STANDARDS

Follow every numbered step in order. Do everything yourself and only ask me if you genuinely can't continue. All STANDING RULES in toff-portfolio/CLAUDE.md still apply.

GOAL: the site must feel like an expensive, premium, boutique studio with real wow factor: a deep midnight page with cream ink lines and gold details, calm and confident, with very few words and lots of space. It must also win clients: make it easy to understand what I do, see proof, and start a project.

1. GET STARTED
- Find my toff-portfolio folder (search my home folder up to 4 levels deep, skip Library, node_modules and hidden folders). Run git status there to confirm you're in the right repo.
- Read CLAUDE.md, DESIGN.md, DECISIONS.md and CHECKLIST.md first.
- Save this whole prompt as rounds/round-02.md.
- Commit the current state ("Before round 02"), then create a backup branch called backup-before-round-02.

2. GET THE FILES
- In ~/Downloads, find toff-round-02-files.zip and unzip it into a temporary folder. Read its README.md.
- Copy its opening/ contents into toff-portfolio/assets/opening/, handwriting/ into toff-portfolio/assets/handwriting/, showcase/ into toff-portfolio/assets/showcase/, enquiry/ into toff-portfolio/assets/enquiry/, and tools/ into toff-portfolio/tools/handwriting/. Say exactly which files you added or replaced.
- Copy tools/handwriting/check-round-02.py to /tmp/check-round-02.py and tools/handwriting/check-style-picker.py to /tmp/check-style-picker.py (test scripts stay outside the repo), then delete both from the repo copy.
- Move the zip (don't delete it) into ~/Downloads/toff-rounds-done/.

3. WHAT THESE FILES ARE
- Everything is already styled in the Midnight & Gold palette (step 4) and reads the site's CSS variables.
- assets/opening/: a finished, tested opening page, "From sketch to site". The eyebrow "Toff Studio · Bespoke web design" and the headline "We sketch it. Then we build it." fade in; a browser window (a phone on phones) draws itself in cream ink and a website is sketched inside it; the sketched button is pressed and colour spreads from it, turning the sketch into a finished, light, full-colour website (it keeps its own light colours on purpose: it's a client's site); then one line drops to the bottom of the screen.
- assets/handwriting/: the calm handwriting section. Its line enters at the top centre where the opening's line ends, and writes "You plan", "We design", "We deliver", "So... what will it be?".
- assets/showcase/: three pictures beside the phrases, with no background boxes, each easing in step with its phrase: "You plan" → a plan notepad whose checklist ticks itself; "We design" → Bluebird Wellness (its line-drawn face draws itself; links to the live site); "We deliver" → Everest Climate Solutions (the AC opens, a warm orange glow turns into a cool blue one and 32°C counts down to an icy-blue 26°C; links to the live site). Numbered gold labels ("01 — Your brief", "02 — Selected work", "03 — Selected work"). On phones each sits under its phrase. Positions come from line-data.js and the line never crosses a picture. Every drawing stays inside its own picture and never runs into the caption under it.
- assets/enquiry/: the style picker for the guided enquiry's "How should it look?" step (see step 10): "Like Bluebird", "Like Everest" and "Plan it yourself", each with a small ink-line icon that draws itself once. assets/enquiry/preview.html shows it as one enquiry step, exactly as it should look.
- Every line (handwriting, sketch, drawings, icons) has the same gold under-shadow.
- They passed 177/177 browser checks (opening, handwriting, showcase) and 92/92 (style picker) at 320, 390, 820, 1024 and 1440px before delivery.
- assets/handwriting/preview.html shows the opening, handwriting and showcase together exactly as they should look (palette and paper grain included). Open both previews through the local server before you start.
- DO NOT rewrite, redraw, re-trace or "improve" these files, and never edit line-data.js or the SVG/JSON files by hand. If the line or picture positions must change, edit LAYOUTS at the top of tools/handwriting/build_line.py, run it (python3 build_line.py, needs numpy), check it prints no WARNING, and copy the regenerated line-data.js and line-*.svg/json into assets/handwriting/. Match the site's look only through CSS variables, not by editing the JS.

4. PREMIUM FOUNDATIONS: MIDNIGHT & GOLD (do this before installing the files, so they pick it up)
- Fonts, self-hosted (download from the official Google Fonts GitHub repository, convert to woff2 with fonttools if needed, put licences in fonts/ and CREDITS.md; nothing loaded from other sites):
  - Cormorant Garamond (weights 300 and 400, plus 400 italic) for headings and the large display text. Light weight, very large, generous spacing. Never bold.
  - Inter (400 and 500) for body text, labels and buttons.
- Define these CSS variables on :root (the opening, showcase and style picker use them):
  --bg: #0E1628 (midnight page) · --ink: #F1E3C6 (cream: lines, links, outlines) · --text: #F6F0E4 (headings and body text) · --slate: #A7AFC2 (quiet text) · --accent: #D8AC5F (gold: small labels, numbers, fine rules, the main button, selected states) · --tint: #1A2541 (raised areas such as a selected choice or an input) · --line-shadow: rgba(216, 172, 95, 0.38) (the gold under-shadow on every line) · --radius: 12px · --serif: "Cormorant Garamond", Georgia, serif · --sans: Inter, -apple-system, sans-serif.
  Set html and body background to var(--bg) and text to var(--text). Contrast (checked): text 15.9:1, ink 14.2:1, slate 8.2:1, gold 8.6:1 on the page; slate 6.9:1 on --tint; midnight text on gold 8.6:1. Re-check every pair you add and record the ratios in DESIGN.md.
- Paper grain: copy the body::after paper-grain rule from assets/handwriting/preview.html into the site's main stylesheet exactly as it is (faint light specks on the dark page; keep its opacity at .07).
- Type scale: display headings clamp(40px, 6vw, 84px), line-height 1.05, weight 300; section headings clamp(30px, 3.6vw, 48px), weight 300; body 17px, line-height 1.6; small labels 11–12px, uppercase, letter-spacing .18em, in --accent. Text columns no wider than about 60 characters. Lots of space: at least 120px between sections on laptops and 72px on phones.
- One solid button style (gold background, midnight text, 12px radius) used only for "Start a project" and the enquiry's Continue/Send. Every other action is a text link with an arrow, in --ink or --accent.
- The whole site sits on the midnight page. The footer is the only change of shade: a slightly deeper #0A101E with a fine gold rule above it. No other colour bands.
- Favicon: a "T" monogram in the serif, gold on midnight (SVG favicon plus a 180×180 apple-touch icon).

5. PLACEHOLDERS (for now)
- Add showPlaceholders: true to settings.js, with the comment "Shows clearly marked placeholders for anything not filled in yet. Set to false before showing the site to clients or launching: anything still missing is then hidden."
- While it's true, every item below that I haven't filled in shows a placeholder instead of being hidden: testimonials (step 9), the process timeframes (step 9), the reply time (step 10) and my email (step 11). As soon as I set a real value in settings.js, it replaces its placeholder.
- Every placeholder must be obviously a placeholder: shown in --slate, with a tiny gold "Placeholder" tag (11px, uppercase, letter-spacing .18em), and worded so nobody could mistake it for real content. A placeholder testimonial is never a made-up quote or name: it reads "A short quote from Bluebird Wellness will go here." with "Client name · Bluebird Wellness" underneath.
- Legal links (privacy, terms, cookies) and company details stay hidden until they exist, whatever this setting says.
- When it's false, every unfilled item is hidden with no gaps left behind (a section whose items are all unfilled is hidden completely).

6. HEADER
- Minimal and premium: "Toff Studio" wordmark in the serif (cream) on the left; on the right, Work, Process, Contact as quiet text links and a small gold "Start a project" button that scrolls to the enquiry.
- It sits on the midnight page with no border or shadow (give it the page colour as its background so content never shows through it); it slides up out of view when scrolling down and slides back when scrolling up (never covering the opening's headline on load). Phones: the wordmark and a "Menu" link that opens a calm full-screen midnight menu.
- Header links land just below the header. Keyboard accessible with visible focus (a cream or gold outline); Escape closes the phone menu.

7. INSTALL THE OPENING PAGE
- Make it the very first section of the home page, directly under the header. Paste the markup from assets/opening/opening.html, link assets/opening/opening.css in the <head>, load assets/opening/opening.js at the end of <body>, and call: Opening.mount(document.getElementById('opening'))
- The opening's <h1> is the page's only h1. Change any other h1 (including the handwriting's hidden heading) to h2.
- Remove any other hero/intro the site had, and list what you removed.

8. INSTALL THE HANDWRITING AND SHOWCASE, AND REMOVE THE OLD STYLE SECTIONS
- Remove the current handwriting implementation (the old EMS-font paths and their drawing code). Stop loading those files and list them in README.md as no longer used (don't delete them).
- Directly below the opening page (no gap, padding or margin between them), add exactly this structure, full width with no side padding:
  <div class="hw-wrap" id="work"><div id="hw"></div><div class="sc-layer" id="showcase"></div></div>
- Paste the <template> blocks from assets/showcase/showcase.html once inside <body>, and link assets/showcase/showcase.css in the <head>.
- Load, in this order, as normal script tags in the page (not fetched later): assets/handwriting/line-data.js, assets/handwriting/handwriting.js, assets/showcase/showcase.js. Then:
  Handwriting.mount(document.getElementById('hw'), { basePath: 'assets/handwriting/', introOnLoad: false, ...settings.handwriting })
    .then(function (hw) { Showcase.mount(document.getElementById('showcase'), hw, { assetBase: 'assets/showcase/', links: settings.links }); });
- Links: in settings.js, set links.bluebird to https://toffzzzz.github.io/bluebird-wellness/ and links.everest to the Everest site's live address. Find it from my Everest project folder (search my home folder for a folder whose name contains "everest" with an index.html; read its git remote: github.com/<user>/<repo> with GitHub Pages is https://<user>.github.io/<repo>/). Check the address actually loads before using it. If you can't confirm it, leave links.everest empty: the picture then shows "Live site coming soon" instead of a dead link, and the style picker shows no "View site" link for Everest. Tell me which you did.
- Put the handwriting options in settings.js under "handwriting" (color, strokePx, shadow, writeStart, writeEnd, tailTip, ease, maxSpeedPx, autoSpeedPx, phoneSpeedPx, phoneTrigger, breakpoint, jumpScreens, settleMs, minLinkScroll, introOnLoad: false, entryTip) with the defaults from the top of handwriting.js (color '#F1E3C6' and shadow.color 'rgba(216,172,95,0.30)' match the palette), and the opening's options (sketchSeconds, overlap, pressAt, revealDuration, lineDuration) under "opening", each with a plain-English comment. Note in DESIGN.md that the handwriting colour lives in settings.js and must change together with --ink and --line-shadow.
- Keep the visually hidden heading (as an h2): "You plan. We design. We deliver. So... what will it be?"
- The engines handle opening at the top on a fresh visit, Back/Forward, bfcache and Safari's late scroll restore. Remove any other code on the site that forces the page to the top or sets history.scrollRestoration, so they don't fight.
- The sites now appear beside the phrases, so remove the old separate style sections (the Bluebird face section and the Everest AC section from Round 01), the extra style placeholder slots, and the finale's "previews slide into a row" step. Stop loading their files and list them in README.md as no longer used (don't delete them; keep the copied Everest assets).

9. NEW SECTIONS THAT WIN CLIENTS (after the handwriting, before the enquiry; calm, premium, few words)
- The handwriting line ends at the bottom centre of its section. Each following section starts below it with generous space. The continuous line does not need to run through these sections; it returns in the finale (step 10).
- "How we work" (id="process"): a small gold label "Process", a serif heading "Four quiet steps.", then four steps in a row on laptops (stacked on phones), each with a large thin gold serif numeral (01–04), a short title and one line:
  01 Discovery call: "We learn your business, your customers and what success looks like."
  02 Sketch: "We draw your site by hand first, so you see it before it's built."
  03 Build: "Bespoke, fast, beautiful on every phone, tested line by line."
  04 Launch & care: "We launch it, host it and keep it looking its best."
  Each step's timeframe comes from settings.js (process.timeframes, empty by default). While empty, it shows a placeholder timeframe (step 5); never invent one.
- "What's included" (id="included"): a two-column list on laptops (one on phones) of short items with a fine gold rule before each: Bespoke design, never a template · Built for phones first · Hosting and care · Privacy, cookie and legal pages · Search-engine basics · Your own domain and email set up. No prices anywhere on the site. Below it, a quiet line: "Every project is quoted personally after a short call." with a "Start a project →" link to the enquiry.
- "Kind words" (id="testimonials"): a single large cream serif quote at a time (Bluebird, then Everest) with the person's name and business in small gold caps. Real testimonials come only from settings.js (a testimonials list, one entry per project with quote, name and business, empty by default). Never invent quotes. While an entry is empty, it shows its placeholder (step 5). Tell me exactly where to paste the real quotes.
- Headings and text in these sections fade up gently once when they come into view (600ms, 12px rise, no bounce), never replaying while on the page; reduced motion shows them at once. No pinning.

10. THE FINALE: A GUIDED ENQUIRY (id="contact")
- "Tell us what you need" written by the same kind of cream ink line in the same cursive as the handwriting (use the handwriting engine or the same single-line font and drawing rules: smooth curves, pen order, never reversing, same gold under-shadow), with "So... what will it be?" just above it already written by the handwriting section.
- Below it, replace the plain chat box with a short guided enquiry that feels like a premium intake: one question at a time, a small gold "Step N of 6" label, the question in the serif, and a fine progress line (look at assets/enquiry/preview.html for how a step should look):
  1) What does your business do? (short text)
  2) What do you need? (choices: A new website · A redesign · Website and ongoing care · Something else)
  3) How should it look? Hint: "Pick one of our sites as a starting point, or tell us your own idea." Use the style picker:
     paste the <template> from assets/enquiry/style-picker.html once inside <body>, link assets/enquiry/style-picker.css in the <head>, load assets/enquiry/style-picker.js, and mount it into this step:
     StylePicker.mount(stepElement, { links: settings.links, onChange: function (v) { /* v = { style: 'bluebird' | 'everest' | 'own' | null, notes: '' } */ } })
     Continue stays disabled until a style is picked. "Plan it yourself" opens an optional text box; its notes are only kept when that choice is picked. The icons draw themselves once when the step appears (if the step is shown by your code rather than by scrolling, call picker.play() when it appears), never replay, and show finished with reduced motion. Don't redraw the icons or change the picker's code; style it only through the CSS variables.
  4) When would you like it? (choices: As soon as possible · In 1–3 months · Just exploring)
  5) Budget range (choices: £1,000–£2,000 · £2,000–£4,000 · £4,000+ · Not sure yet)
  6) Your name, email and (optional) phone, with a consent tick box linking to the privacy policy.
  Choice buttons and inputs follow the picker's look: --tint background, a fine slate outline, gold outline when selected or focused. A quiet "← Back" link on every step after the first keeps earlier answers (including the style choice and its notes).
  Then a calm thank-you: "Thank you. We'll be in touch personally.", plus a short summary of their answers including their starting point ("Starting point: Bluebird's style", "Starting point: Everest's style" or "Starting point: your own idea", with their notes if any). Below that: "We'll reply within" + contact.replyTime from settings.js (empty by default; a placeholder while empty, step 5).
- Demo mode by default (settings.js chatMode: "demo"): it sends and stores nothing, with a small note "Preview: please don't enter personal details yet." Live mode only once a privacy policy link is set, sending all six answers (including style and notes) to my email through a form service (endpoint in settings.js).
- Fully keyboard accessible, labelled for screen readers, comfortable above the phone keyboard.

11. FOOTER
- Deeper midnight (#0A101E) with a fine gold rule above it; cream text. "Toff Studio" in the serif, a short line "Bespoke websites, sketched by hand and built to last.", my email (from settings.js; a placeholder while empty, step 5), "London", social links only if set, legal links (privacy, terms, cookies) that stay hidden until those pages exist with no gaps, "© 2026 Toff Studio", and company details only when set in settings.js.

12. APPLY MY STUDIO STANDARDS TO THE WHOLE SITE
These come from my master prompt and override anything in Round 01 that disagrees:
- Two deliberate exceptions for this site: the whole site is dark (the master prompt's "at most one dark area" doesn't apply), and the soft Everest glow is intended. Everything else in the master prompt applies.
- No pinning anywhere. Nothing loaded from other sites (self-host or remove any CDN scripts such as GSAP or Lenis, with licences in CREDITS.md).
- Every animated part follows the same motion rules: never reverses, replays, snaps back or freezes half-way; once something starts drawing itself it always finishes; whatever is on screen at load plays at a natural pace; coming back via Back (with or without bfcache, and with Safari's late scroll restore) keeps your place, replays what's on screen, and what's above plays as you scroll back up; jumping down plays what you land on; reduced motion shows everything finished.
- Every line has the same gold under-shadow as the handwriting (var(--line-shadow), about 3.5px below). Don't blur long lines that redraw every frame. No colours hard-coded in new CSS or JS: use the variables.
- Never use a zero-length stroke dash to hide a line (with round line ends it shows as a dot). Hide undrawn strokes instead.
- Every drawing stays inside its own picture area: never let a line run past its SVG's viewBox into text below it.
- Copy tone everywhere: short, confident, warm, no exclamation marks, no jargon, no claims I can't back up.
- Open Graph link-preview image (1200×630, midnight with the gold "T" monogram and "Toff Studio" in cream), page title, description and theme-color #0E1628.

13. CREDITS AND RECORDS
- Add to CREDITS.md: the Hershey cursive font acknowledgement from tools/handwriting/hershey-licence.txt (it must stay with the font); Cormorant Garamond and Inter licences; ac-closed.png / ac-open.png come from the Everest Climate Solutions site.
- Add to DECISIONS.md (dated today): "Round 02: Midnight & Gold palette (midnight #0E1628 page, cream #F1E3C6 lines with a gold under-shadow, gold #D8AC5F details and main button), whole site dark, footer slightly deeper. Cormorant Garamond light for display, Inter for text, paper grain, minimal hide-on-scroll header, no prices on the site (quoted after a call). Opening page 'From sketch to site' (assets/opening). Handwriting replaced with a pre-built, tested calm line (assets/handwriting). Showcase pictures beside the phrases with no background boxes, easing in step with their phrases (assets/showcase): You plan → plan notepad; We design → Bluebird (link); We deliver → Everest (link; warm glow turns cool, 32 → 26 °C). Old separate style sections and finale previews removed. New sections: How we work, What's included, Kind words. Clearly marked placeholders (showPlaceholders) for testimonials, timeframes, reply time and email until real ones are set; never invented content. Finale is a six-step guided enquiry with a style picker (Like Bluebird / Like Everest / Plan it yourself; assets/enquiry), demo until a privacy policy exists. Master-prompt standards adopted (no pinning, nothing from other sites, Back/bfcache/late-restore behaviour everywhere), with two deliberate exceptions: dark site and the Everest glow."
- Add to CHECKLIST.md: the opening, handwriting and showcase look and behave exactly like assets/handwriting/preview.html; the style picker looks and behaves exactly like assets/enquiry/preview.html; the palette matches DESIGN.md everywhere (no leftover light-page colours, no hard-coded colours); lines meet with no gap or jump (opening → handwriting) at 390/820/1024/1440/1920px; the line never crosses a picture; every drawing stays inside its picture, clear of its caption; pictures have no background boxes and ease in step with their phrases; Bluebird and Everest links open the right sites in a new tab (or Everest shows "Live site coming soon"); only one h1; fonts self-hosted; WCAG AA for every text colour; no prices anywhere; placeholders are clearly marked and none is a made-up quote, name or timeframe; with showPlaceholders false every unfilled item is hidden with no gaps; BEFORE LAUNCH: set showPlaceholders to false or fill in every placeholder; the enquiry works start to finish in demo mode (including all three style choices, notes, and Back keeping answers) and sends nothing; header hides on scroll down and returns on scroll up; no pinning; nothing from other sites; Back/bfcache/late-restore behaviour; pixel checks for stray marks; no 404s including favicon; 60fps.

14. CHECKS
- Run python3 /tmp/check-round-02.py http://localhost:8000/assets/handwriting/ against the standalone preview and confirm 177/177 still pass. Run python3 /tmp/check-style-picker.py http://localhost:8000/assets/enquiry/ and confirm 92/92 pass.
- Then write site-wide Playwright checks (kept in /tmp, not the repo) and run them until all pass at 390, 820, 1024 and 1440px: everything in CHECKLIST.md; no console errors, failed requests or 400+ responses; nothing from other sites; no sideways scrolling; opens at the top; the opening plays on load and finishes; pictures ease in step with their phrases and never cross the line; every drawing's points (plus half its line width) stay inside its picture and above its caption; links work, open in a new tab and are reachable by keyboard; the header behaves; each new section's fade-up plays once; contrast computed from the real rendered colours passes WCAG AA for every piece of text; placeholders show with showPlaceholders true and disappear (with no gaps) when it's false, and each disappears as soon as its real value is set; the enquiry works start to finish in demo mode with keyboard only, for each of the three style choices (Continue disabled until one is picked; "Plan it yourself" notes appear in the summary; switching away from it drops the notes; Back keeps every answer); the style picker's icons draw once when the step appears and don't replay; Back returns to the same place (test with bfcache: launch Chromium with ignore_default_args=["--disable-back-forward-cache"] and channel="chromium", go_back with wait_until="commit", and confirm pageshow persisted is true; and without bfcache); late scroll restore; jumps; reduced motion; nothing reverses scrolling back up; no pinning; 60fps while animating; pixel checks that no ink appears outside what has been drawn (detect ink as any pixel clearly different from the page colour, not by looking for a particular colour).
- Compare the site with assets/handwriting/preview.html and assets/enquiry/preview.html side by side at 1440px and 390px (screenshots at load, after the opening finishes, at several scroll positions, and on the enquiry's style step). Fix the integration, not the engines, if they differ.
- Take screenshots of every section at 390, 820, 1024 and 1440px and look at them yourself as if you were a discerning client: nothing overlapping, cut off or hidden; generous space; it feels dramatic, calm, expensive and premium; gold is used sparingly; placeholders look deliberate and tidy, not broken. Fix anything that looks cramped, busy or cheap.
- Look at every file in git status before committing (never git add .; no zips, previews, __pycache__ or node_modules). Commit "Round 02: Midnight & Gold boutique site with opening, handwriting, showcase, placeholders and guided enquiry with style picker", and push if a GitHub remote exists.

15. OPEN IT FOR ME
- Make sure the local server is running on port 8000 from the toff-portfolio folder (start it in the background if not), open http://localhost:8000 in my browser, and give me the phone link (from ipconfig getifaddr en0).

16. REPORT BACK
In plain English, short and clear:
- What you installed, built and removed
- How the opening, handwriting, showcase, new sections and enquiry (including the style picker) fit together
- Whether the Everest link is live or "coming soon", and why
- A list of every placeholder currently showing, and exactly where in settings.js I paste the real testimonials, reply time, process timeframes, my email and company details, plus how to turn placeholders off
- Test results (how many checks passed in each suite), and anything that didn't match the previews and how you fixed it
- Anything you couldn't do exactly as asked and what you did instead
- The laptop and phone links
