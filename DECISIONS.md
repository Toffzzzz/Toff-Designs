# Design decisions

A dated log. One line per decision, with the reason where given. Never remove lines; if a decision changes, add a new line saying what it replaces. Check this file before every change and warn the owner if a request contradicts it.

## 2026-10-09 — Round 01 (owner's decisions)

- 2026-10-09: The concept: one continuous ink line runs through the whole page like a pen that never lifts; it writes four phrases, flows into drawings of the studio's website styles, and ends with a chat box.
- 2026-10-09: Plain HTML, CSS and JavaScript, hosted on GitHub Pages; GSAP and Lenis allowed.
- 2026-10-09: Background warm off-white #F7F5F0; line deep ink navy #1F3A5F; the same stroke thickness throughout with round ends and joins.
- 2026-10-09: Every drawn line has a soft grey shadow, about 2–3px below, slightly blurred, semi-transparent and a moment behind the line, so it looks like ink on paper, never a duplicate line.
- 2026-10-09: Small studio name mark top left ("Toff Studio" for now), always visible and unobtrusive.
- 2026-10-09: Calm, spacious, premium, with lots of empty space.
- 2026-10-09: Laptops: animations driven by scrolling at natural speed, starting only when on screen. Phones: each part plays by itself when it comes into view.
- 2026-10-09: Nothing reverses or replays when scrolling back up; coming back from another page may reset it.
- 2026-10-09: Scrolling is continuous everywhere except the finale, which may pin briefly while it plays.
- 2026-10-09: The page always opens at the very top.
- 2026-10-09: Reduced motion shows every section finished, with no animation.
- 2026-10-09: Every adjustable value lives in settings.js so it can be changed without touching other code.
- 2026-10-09: Four phrases, zigzagging down and to the right from the top left, joined by the line: "You plan", "WE DESIGN" (capitals), "We deliver", "So... what will it be?".
- 2026-10-09: Phrases are drawn like a real pen, letter by letter, left to right; dots on i's and crosses on t's come just after their word; never animate font outlines (they trace each letter twice and look wrong).
- 2026-10-09: Single-line fonts (Hershey and EMS from Inkscape's Hershey Text); licences must allow commercial web use and are recorded in CREDITS.md.
- 2026-10-09: Phrase fonts: 1 EMS Allure (flowing cursive, like lemonade.com/giveback-2019); 2 Hershey Sans 1-stroke, wide letter spacing (architect's lettering); 3 Hershey Serif Medium Italic; 4 the best relaxed, friendly casual script available.
- 2026-10-09: fonts-preview.html shows all phrases in every single-line font so fonts can be swapped later in settings.js.
- 2026-10-09: Phones: phrases stack vertically, still joined by the line, larger relative to the screen.
- 2026-10-09: The phrases also exist as real text (visually hidden heading); the SVG is decorative.
- 2026-10-09: Style one is Bluebird Wellness, drawn from assets/face-line.svg exactly as provided (scaled and restyled only, never redrawn); face-main is part of the continuous line; each feature draws left to right as face-main reaches its data-y.
- 2026-10-09: Bluebird caption beside the drawing (left on laptop, below on phone): "Bluebird Wellness" / "Doctor-led IV clinic, London" / "View the live site →" to https://toffzzzz.github.io/bluebird-wellness/ in a new tab.
- 2026-10-09: Style two is Everest Climate Solutions: the AC-unit animation copied as faithfully as possible from the Everest site (same images, code, timings, easing, colours, fonts, layout), adapted only to fit this page.
- 2026-10-09: The line flows into the Everest section, ends where the AC unit appears, and continues from below it.
- 2026-10-09: Everest caption: "Everest Climate Solutions" / "Air conditioning installation" / "View the live site →"; the link stays hidden until a live URL is set in settings.js (no GitHub Pages site exists yet).
- 2026-10-09: Two more style slots after Everest, same structure, switched off in settings.js; when off they don't appear and the line flows straight on.
- 2026-10-09: Finale: previews of each style slide in from left and right into a row, which shrinks and moves to the top; the line writes "Tell us what you need" in phrase 4's script, so the pen finishes there; a full-width rounded chat box rises from the bottom with a large text box, Send button, short privacy note and consent tick box.
- 2026-10-09: Phones: finale previews in a small row or 2×2 grid; the chat box sits comfortably above the keyboard while typing.
- 2026-10-09: The chat box is in demo mode by default: it shows "Thanks! We'll be in touch soon.", sends nothing, and shows "Demo: please don't enter personal details yet". Live mode (a form service such as Formspree) is only allowed once a privacy policy link is set.
- 2026-10-09: Footer: studio name, email (hidden until set) and "© 2026 Toff Studio".

## 2026-10-09 — Round 01 (made while building; owner to confirm)

- 2026-10-09: Phrase 4 and the finale heading use EMS Neato (based on Bad Script). Reason: the most relaxed, friendly single-line hand among the 41 fonts; easy to change in settings.js.
- 2026-10-09: "We deliver" uses a single-line version of Hershey Serif Medium Italic (HersheySerifMedItalicSingle) with the font's doubled "weight" strokes removed. Reason: the original draws thick parts as two parallel strokes, which looks like the outline double-tracing the owner ruled out. The original font is still available in fonts-preview.html.
- 2026-10-09: The Everest animation counts 32°C → 18°C, as the Everest site actually does (with the flap opening at 27°C and 22°C). Reason: the brief described 32 → 26°C, but the only copy of the animation on this Mac counts to 18°C, and the brief says copy it faithfully. The end temperature is one setting (everest.temperature.to).
- 2026-10-09: The Everest room ends on the page colour #F7F5F0 instead of the Everest site's blue-white #F6F9FD. Reason: so the room cools back into this page without a visible box; the peach start and terracotta → Deep Blue number are unchanged.
- 2026-10-09: The Everest scroll story's other parts (logo, service cards, overview) are not copied. Reason: only the AC animation was asked for.
- 2026-10-09: On laptops the Everest animation is not pinned (as it was on the Everest site); it plays across 0.6 screen heights of scrolling. Reason: only the finale may pin.
- 2026-10-09: The finale pins only on laptops/desktops. On phones and touch tablets it plays by itself without pinning. Reason: pinning while something plays by itself would freeze the visitor's scrolling.
- 2026-10-09: Inter is used for all ordinary text (captions, chat box, footer) and is self-hosted. Reason: it's the Everest animation's font, so one font family covers the page; self-hosting avoids sending visitors' data to Google.
- 2026-10-09: GSAP 3.15.0 and Lenis 1.3.26 are included locally in vendor/ (copied from the Everest project). Reason: no third-party requests, and the same versions as the Everest original.
- 2026-10-09: A small "Scroll" cue sits at the bottom of the first screen until the visitor scrolls. Reason: on laptops nothing draws until scrolling starts, so the first screen would otherwise look empty.
- 2026-10-09: The studio mark sits on a soft pill of the page colour. Reason: captions and drawings scroll underneath it and would otherwise clash with it, especially on phones.
- 2026-10-09: Captions fade and rise in when the pen reaches their drawing, once. Reason: keeps the reveal in step with the line; the text is always in the page for screen readers and search engines.

## 2026-10-09 — Round 02 (owner's decisions)

- 2026-10-09: Round 02: Midnight & Gold palette (midnight #0E1628 page, cream #F1E3C6 lines with a gold under-shadow, gold #D8AC5F details and main button), whole site dark, footer slightly deeper. Cormorant Garamond light for display, Inter for text, paper grain, minimal hide-on-scroll header, no prices on the site (quoted after a call). Opening page 'From sketch to site' (assets/opening). Handwriting replaced with a pre-built, tested calm line (assets/handwriting). Showcase pictures beside the phrases with no background boxes, easing in step with their phrases (assets/showcase): You plan → plan notepad; We design → Bluebird (link); We deliver → Everest (link; warm glow turns cool, 32 → 26 °C). Old separate style sections and finale previews removed. New sections: How we work, What's included, Kind words. Clearly marked placeholders (showPlaceholders) for testimonials, timeframes, reply time and email until real ones are set; never invented content. Finale is a six-step guided enquiry with a style picker (Like Bluebird / Like Everest / Plan it yourself; assets/enquiry), demo until a privacy policy exists. Master-prompt standards adopted (no pinning, nothing from other sites, Back/bfcache/late-restore behaviour everywhere), with two deliberate exceptions: dark site and the Everest glow.
- 2026-10-09: Replaces Round 01's warm off-white #F7F5F0 page, navy #1F3A5F line and soft grey line shadow (Midnight & Gold above).
- 2026-10-09: Replaces Round 01's "the finale may pin briefly": no pinning anywhere.
- 2026-10-09: Replaces Round 01's "GSAP and Lenis allowed": no libraries are loaded (vendor/ is no longer used).
- 2026-10-09: Replaces Round 01's four mixed single-line fonts (EMS Allure, Hershey Sans, Hershey Serif Italic, EMS Neato) and zigzag layout: one calm Hershey cursive line ("You plan", "We design", "We deliver", "So... what will it be?"), entering at the top centre where the opening's line ends.
- 2026-10-09: Replaces Round 01's Bluebird face section, Everest AC section (32 → 18 °C), two extra style slots, finale previews row and plain chat box: the sites now appear beside the phrases; the finale is the guided enquiry.
- 2026-10-09: Replaces Round 01's always-visible "Toff Studio" mark on a pill: the "Toff Studio" wordmark sits in the new header.
- 2026-10-09: The opening page is the first thing on the page; its h1 is the only h1.
- 2026-10-09: Links: Bluebird https://toffzzzz.github.io/bluebird-wellness/; Everest from its live address once confirmed, otherwise "Live site coming soon".

## 2026-10-09 — Round 02 (made while building; owner to confirm)

- 2026-10-09: The Everest link is left empty, so its picture says "Live site coming soon" and the style picker shows no "View site" link for it. Reason: the Everest folder (~/Downloads/everest-climate-solutions) is a git repository with no remote, so there's no live address to confirm; the likely GitHub Pages addresses return 404.
- 2026-10-09: The finale shows "So... what will it be?" already written (a static copy in the same cursive, ink and gold under-shadow, a little smaller), with "Tell us what you need" written below it by the same handwriting engine, then a short tail down into the enquiry. Reason: the round asks for "So... what will it be?" just above the finale heading, but the new sections sit between the handwriting and the finale, so the handwriting's own copy is far above it. Both are generated from the same Hershey cursive by tools/handwriting/build_finale.py (assets/finale/finale-data.js).
- 2026-10-09: On phones the finale reads "So... what will / it be?" (size 2.0) and "Tell us what / you need" (size 2.3), smaller than the handwriting's 2.6 so the words fit a 390px screen; the stroke stays the same thickness everywhere.
- 2026-10-09: "Kind words" shows the quotes one after another down the page (Bluebird, then Everest, the second set to the right), not as a rotating carousel. Reason: a carousel would replay and move by itself, against the motion rules; each quote is still shown on its own, large.
- 2026-10-09: Placeholder wording: "Timeframe to be added", "A short quote from … will go here." / "Client name · …", "We'll reply within [reply time to be added]", "Email address to be added", each with a small gold "Placeholder" tag.
- 2026-10-09: "What's included" has the small label "Included" and the heading "What's included."
- 2026-10-09: Enquiry: step 1 hint "A sentence or two is plenty." (example "For example: a bakery in Hackney"); step 6 question "How can we reach you?"; Continue stays disabled until steps 1–5 are answered (as the round asks for step 3); step 6 checks name, email and the consent tick when Send is pressed and says what's missing. The consent tick reads "I agree to Toff Studio using these details to reply to my enquiry." and links to the privacy policy once it exists. The thank-you also says "This was a preview: nothing has been sent." while in demo mode.
- 2026-10-09: Header links jump straight to their section (no smooth scrolling, so the line engines draw what you land on), land 40px below the header, keep the header showing, and don't add a #fragment to the address (so a reload still opens at the top). "Work" goes to the handwriting, "Contact" and "Start a project" to the finale.
- 2026-10-09: The phone menu and header switch at 700px, the same breakpoint as the opening and the handwriting.
- 2026-10-09: The opening's headline keeps the size and weight it was delivered with (Cormorant Garamond 400, up to 64px) so it matches the preview; the display size (up to 84px, weight 300) is used for the phone menu links.
- 2026-10-09: Fonts are cut down to Latin characters (with £, €, arrows and typographic punctuation) and saved as woff2 in fonts/; Inter 400 and 500 replace Round 01's variable Inter in assets/fonts/inter/ (kept, no longer used).
- 2026-10-09: The previews delivered with the round files (assets/handwriting/preview.html, assets/handwriting/other.html, assets/enquiry/preview.html) stay in the project for testing but are not published (listed in .gitignore).
- 2026-10-09: The page's new stylesheet and script are site.css and site.js; Round 01's styles.css and script.js are kept but no longer loaded.
- 2026-10-09: The preview server (tools/serve.py) now sends `Cache-Control: no-cache` instead of `no-store`. Reason: `no-store` stopped Chrome restoring the page from the back/forward cache when fonts and the favicon were loaded, so Back behaved differently on your Mac than on GitHub Pages (which sends `max-age=600`). `no-cache` still checks for fresh copies every time.

## 2026-10-12 — Round 03 (owner's decisions)

- 2026-10-12: Round 03: the main page follows `assets/studio/site.html` exactly: top bar, opening, handwriting with the cards, Recent work, Things we can build into your site, Try a look for your business, Sketch your homepage, Your logo drawn in one continuous line, How it works, About the studio, the enquiry, the footer. "Plan with us" (demo planner) is the only floating button. A separate Lab page (`lab.html`) holds the showpiece experiments (a section that writes itself, gold-speck lettering, liquid gold T, moving ink, optional sound); the main page never loads them.
- 2026-10-12: Replaces Round 02's Process section ("Process" label, "Four quiet steps.", 01–04 numerals): How it works, one hand-drawn line through the four steps, with process.html's step descriptions and "How long: to be added" until the timeframes are set.
- 2026-10-12: Replaces Round 02's hide-on-scroll header and full-screen phone menu: the slim top bar (Toff Studio, section links, Sketch lens, "Start a project"; Menu on phones with every section and the lens at the bottom). "Start a project" is on the first screen at every width.
- 2026-10-12: Replaces Round 02's Inter body text: Work Sans (self-hosted). Cormorant Garamond stays for headings; Inter only inside the example client sites.
- 2026-10-12: Replaces Round 02's finale (the static "So... what will it be?" reprise and the handwriting engine writing "Tell us what you need"): the enquiry heading is pen-written once in flat ink (no fluid or smoke behind it), with "Pick one to continue" beside a greyed-out Continue.
- 2026-10-12: Replaces Round 02's footer (studio name, strapline, email, location): the footer of site.html (signature, "Start a project →", "Plan it with our helper", Email, Privacy policy "coming soon", the Lab, and the craft line with this page's real load time, weight and London time).
- 2026-10-12: The "doesn't look AI-made" rules apply to the whole site: no labels above headings, no spaced-out capitals, no 01/02/03 numbering or giant numerals, no equal card grids, no stat rows, no slogans, stock words or em dashes, no glows or blur, 8px corners on buttons and chips, no decorative motion, no fake window chrome, varied rhythm. Every change is listed in DESIGN.md ("Not template-looking"). Replaces Round 02's "small gold labels" and "Placeholder" capitals tags, and the 12px corner radius.
- 2026-10-12: What's included keeps its six items word for word, without its label or any marker, under a plain heading, as a two-column list (one column on phones).
- 2026-10-12: The optional AI second look for Sketch your homepage stays off; its Cloudflare Worker lives outside the repo in ~/Documents/toff-studio-tools/optional-ai/.

## 2026-10-12 — Round 03 (made while building; owner to confirm)

- 2026-10-12: What's included and Kind words stay on the main page, after How it works and before About (the round's section list doesn't name them, but neither is to be removed; About's own note says it follows "the process / included sections"). Kind words' heading is now a normal section heading.
- 2026-10-12: "Bespoke design, never a template" stays word for word in What's included, as the round asks, although "bespoke" and the "X, never Y" pattern are on the rule list. Owner to decide whether to reword it.
- 2026-10-12: Page title and description no longer say "Bespoke websites, sketched by hand": they now use the opening's own line ("A small web design studio in London. Every site starts as a pencil sketch") and About's "built from scratch for the business it belongs to".
- 2026-10-12: Cormorant Garamond now loads as the variable font from `assets/studio/fonts/` (300–700) instead of the three round 02 woff2 files, so the kinetic headings can thicken smoothly as in the preview. The old files are kept in `fonts/`.
- 2026-10-12: In-page links (top bar, menu, footer, "Start a project") keep Round 02's behaviour: they jump straight there, land 12px below the top bar and add no #fragment to the address.
- 2026-10-12: "How it works" timeframes still come from `settings.js` (`process.timeframes`), shown as "How long: …"; the other placeholders (About text, "How long", email) hide with `showPlaceholders: false`, and About hides completely because its text is a placeholder.
- 2026-10-12: The note beside a greyed-out Continue reads "Add a sentence to continue" on step 1 (a text box) and "Pick one to continue" on the choice steps.
- 2026-10-12: The planner ("Plan with us") stays in demo mode and only goes live under the same rule as the enquiry (chatMode 'live', form endpoint and privacy policy all set).
- 2026-10-12: The footer keeps a small "© 2026 Toff Studio, London" line and the company details (hidden until set), since every public site needs business details.
- 2026-10-12: lab.js takes the café photo's path as an option, so lab.html in the site root can load it (the preview is unchanged).
- 2026-10-12: The six example photos in `assets/studio/playground/` show fictional businesses only; their source and licence weren't stated with the round files (CREDITS.md), so the owner should confirm them before launch.

## 2026-10-12 — Round 03 AI follow-up (owner's decisions)

- 2026-10-12: Sketch your homepage gets the AI second look: Claude Haiku through the Cloudflare Worker `toff-sketch-ai` (https://toff-sketch-ai.toffdesigns.workers.dev/read-sketch). The API key lives only in the Worker's secret. Only the sketch (pen lines as a picture, plus the playground's business kind and style) is sent; nothing else on the site sends data. A quiet line under the paper says so, shown only while the AI is on. Replaces Round 03's "the optional AI second look stays off".
- 2026-10-12: Protecting the bill: Anthropic monthly spend limit $100 with an email alert (set by the owner); at most 20 sketches per 60 seconds per IP address, blocked before Anthropic is called (429), so the site falls back to its instant reading.
- 2026-10-12: What's included: "Bespoke design, never a template" becomes "Designed from scratch for your business". Replaces Round 03's "keep it word for word"; the other five items stay word for word.
- 2026-10-12: The privacy wording lives in `privacy-policy-draft.md` (not published) and `COMPLIANCE.md` (what the site sends, to whom, what is stored).

## 2026-10-12 — Round 03 AI follow-up (made while building; owner to confirm)

- 2026-10-12: Cloudflare's built-in rate limiter (`SKETCH_LIMIT`) never refused a request on the live Worker in testing (it does locally), so on the owner's choice an exact sliding-window counter (`SKETCH_COUNTER`, a Durable Object per IP) enforces the limit; the built-in one stays bound in case it starts working. If the counter can't answer, the sketch isn't sent (503) rather than risking the bill.
- 2026-10-12: The privacy line under the paper is shown and hidden by Draw your site itself (`drawsite.js`), together with the "Write a word" key item, so it can never show without the AI on or be missing with it on.
- 2026-10-12: Kind words keeps its two clearly marked placeholders (a quiet italic "Placeholder" note, "A short quote from … will go here.", "Client name, …") rather than hiding the section, until real quotes are set in `settings.js`; none is a made-up quote.
