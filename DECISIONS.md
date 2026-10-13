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

## 2026-10-12 — Round 04 (owner's decisions)

- 2026-10-12: Round 04: the main page follows `assets/studio/site.html`: top bar, opening, handwriting with the cards, AI assistants (new), Recent work, Try it (new: one section with four tabs: Pick a look, Sketch your homepage, Your logo in one line, Booking and other features), There's more in the Lab (new), How it works, What's included, Kind words, About, the enquiry, the footer. The four tools no longer appear as separate sections. Replaces round 03's section order.
- 2026-10-12: What's included and Kind words stay in their current form, after How it works and before About (owner, Round 04 addition 3).
- 2026-10-12: The AI assistants demo answers live through the Worker's new `/chat` route (Claude Haiku); its header says questions go to Anthropic and aren't stored, and its note asks visitors not to type personal details.
- 2026-10-12: Draw your site is rebuilt around blocks and "I'm done"; its own privacy line ("When you press 'I'm done', your sketch and the words you typed on it are sent to Anthropic's Claude to be read. They aren't stored.") replaces the round 03 AI follow-up's "When you pause…" line, so there is exactly one. Its three files were replaced, not merged (Round 04 addition 2).
- 2026-10-12: The Worker's exact counter (`SKETCH_COUNTER`) guards both `/read-sketch` and `/chat` before Anthropic is called: 20 requests a minute per IP, shared between the two; 429 with CORS over it, 503 if the counter can't answer. The built-in `SKETCH_LIMIT` stays bound; `wrangler.toml` unchanged (Round 04 addition 1).
- 2026-10-12: One switch for unfinished details: `showPlaceholders` in `settings.js` also controls everything marked `data-unfinished` (true: shown; false: hidden); `?unfinished` in the address always shows everything. `showPlaceholders` is now `false` (it was `true` since round 02), so visitors see no "Placeholder" notes and Kind words hides until real quotes are set (Round 04 addition 4).
- 2026-10-12: The opening's drawn site is a café ("Morrow Coffee", made up) with a real photo (`playground-cafe.webp`); the headline is set large with "build" in gold italic.
- 2026-10-12: Top bar links: AI assistants, Work, Try it, How it works, The Lab. Replaces round 03's seven links.
- 2026-10-12: The design upgrade (still paper grain, cream-paper How it works, gold-line page transition, skip link, 404 page, Lab teaser, balanced line breaks) as listed in DESIGN.md under "Round 04 design upgrade".
- 2026-10-12: "Bespoke" doesn't appear anywhere visible; What's included says "Designed from scratch for your business".

## 2026-10-12 — Round 04 (made while building; owner to confirm)

- 2026-10-12: With `showPlaceholders: false`, About stays hidden completely (as decided in round 03, because its text is a placeholder), not just its "Placeholder text" note as in the Round 04 preview. It shows again with `?unfinished`, or once the owner's own About text is in and `showPlaceholders` is true (or the hiding line in `site.js` is removed).
- 2026-10-12: When a detail is filled in via `settings.js` (a timeframe, the email, the privacy policy address), `site.js` removes its `data-unfinished` itself, so nothing needs editing by hand in `index.html`. The price line in How it works has no setting yet: fill it in in `index.html` and remove its `data-unfinished`.
- 2026-10-12: index.html and lab.html preload the woff2 fonts instead of the woff ones (preloading both would download each font twice); the `@font-face` rules in `site.css` list woff2 first, then woff.
- 2026-10-12: Round 04's skip link (`.skip`, "Skip to content", to `#opening`; `#lab` on the Lab) replaces round 03's `.skip-link`, whose CSS was removed from `site.css`; topbar.js now keeps it first in the tab order. Round 04's still grain in `studio.css` replaces the round 02 grain in `site.css` (both styled `body::after`; one copy now).
- 2026-10-12: `lab.js` takes a `logoBase` option (like its `image` option), so lab.html in the site root can load the sample logos from `assets/studio/lab-logos/`.
- 2026-10-12: 404.html uses `site.css` and `settings.js` (colours) like the other root pages, instead of the preview-only `base.css`, with absolute `/Toff-Designs/` paths (no CNAME yet) and `noindex`.
- 2026-10-12: The AI assistants preview in `assets/studio/site.html` stays offline (`{}`, as delivered); only index.html has the live `/chat` endpoint. site.html keeps the sketch AI endpoint, as after the round 03 AI follow-up.

## 2026-10-13 — Round 05 (owner's decisions)

- 2026-10-13: Self-hosted libraries are allowed where they earn their place: three.js r186 (npm three 0.186.x) and Rapier (0.19.x compat builds) for the Lab and one concept site, and GSAP 3.15.0 (already in vendor/) if a timeline genuinely needs it. Never Lenis or any other scroll-jacking. Replaces round 02's "no libraries are loaded".
- 2026-10-13: The main page may use WebGL where it shows our work or our process (the hero and the case films). Decoration stays banned everywhere; a Lab piece or a concept site's one named signature moment isn't decoration. The main page never loads the Lab's pieces. Replaces round 03's "the main page never loads the Lab's effects" and the master prompt's "showpieces only on a Lab page".
- 2026-10-13: The home page follows round-05.md section 7. Replaces round 04's section order, the Try it tabs and the four separate tools.
- 2026-10-13: Top-bar links are Work, AI, Design yours, The Lab. Replaces round 04's AI assistants, Work, Try it, How it works, The Lab.
- 2026-10-13: The new hero and work chapter replace round 02's and 04's opening (the drawn Morrow Coffee site in assets/opening/) and the showcase cards beside the phrases (assets/showcase/). Everest's cooling picture (from assets/showcase/) stays in use.
- 2026-10-13: One concierge (an AI that takes the brief, keeps the planner's point-and-pin and its brief document, and offers a short form) replaces the six-step enquiry with its style picker (assets/enquiry/) and the separate "Plan with us" planner.
- 2026-10-13: The concierge talks to Claude through the Worker's /concierge route, with a notice like the AI demo's. Sending an enquiry stays in demo mode until it can go live. Replaces round 03's "the planner stays in demo mode".
- 2026-10-13: The Sketch lens in the top bar is retired (its files stay, unloaded).
- 2026-10-13: Five complete concept sites, each a real, finished website for a made-up business, replace the concept studies drawn by MiniSite.
- 2026-10-13: The studio owns every file now. Two rules stay: line-data.js and the line SVG/JSON are only regenerated with tools/handwriting/build_line.py, and face-line.svg is never redrawn or retraced. Replaces "Delivered parts: don't rewrite or improve them".
- 2026-10-13: The four phrases "You plan", "We design", "We deliver", "So... what will it be?" are retired (a slogan triplet by our own rules). The pen now writes the names of the work and, at the end, "Tell us what you need".
- 2026-10-13: Kinetic headings on the main pages are retired (allowed in the Lab).
- 2026-10-13: Nothing that was in assets/ before a round (anything on that round's backup branch) is ever deleted or moved; files created during the round may be removed or renamed. Refines CLAUDE.md's "never delete files inside assets/".
- 2026-10-13: Tests live in tests/, run with `python3 tests/run_all.py` and by GitHub Actions on every push. The older round scripts in /tmp/toff-tests stay as they are. For this round, "run every CHECKLIST.md item" means the new checklist written in Phase 10. Replaces tests kept outside the repo.
- 2026-10-13: wrangler.toml may change once, in Phase 11, to add the preview link's address to ALLOWED_ORIGIN, after the Worker folder has been backed up. Replaces round 04's "wrangler.toml unchanged".
- 2026-10-13: This round is built on the round-05 branch and goes live only when the owner replies "ship it". Replaces pushing main at the end of every round.

## 2026-10-13 — Round 05 (made while building; owner to confirm)
- 2026-10-13: Hero order: Bluebird Wellness (client), Atelier Wren, Everest Climate Solutions (client, from the local capture), Saltmarsh, Morrow Coffee, Hollis & Pine, Hart & Sons Plumbing; "Another site →" returns to the first after the last. Reason: real client work first, Bluebird's light page gives the biggest dark-to-light change and its line-drawn bird and serif headline survive the sketch (style frame); Atelier Wren next for its large editorial type and photography. Phase 4 may swap 2 and 4 after looking at the real stills.
- 2026-10-13: The laptop stage is 2.4 : 1 so the caption row and its controls are on the first screen; laptop hero screenshots are therefore captured at a 1440×600 viewport (device scale 1.5, 2160×900) instead of 1440×900, so each site lays out its own first screen for that shape. Phone stills: 390×844 captures, cropped to the top 358 : 470.
- 2026-10-13: The stage's paper is deep midnight (#0A101E), not the page colour, so it reads as an object without a border.
- 2026-10-13: A quiet hint sits beside the caption ("Move your pointer over it to paint it in" / "Tap to finish it").
- 2026-10-13: A new token, `--paper-accent` #7E5E24, for gold-ish text on the cream paper (the existing #8F6A2A is 4.1 : 1, so it is kept for lines only).
- 2026-10-13: The concept ribbon is in the page flow at the bottom, never fixed.
- 2026-10-13: The heading of 7.1 point 7 is "How we work"; the concept list's heading is "Concept sites".
- 2026-10-13: The AI demo's business switch is a segmented control labelled Café, Salon, Clinic, Plumber.
- 2026-10-13: /brief returns a ninth field, `summary`, because 7.2 asks the AI to write the brief's summary through /brief.
- 2026-10-13: Made-up details for the concept sites that the AI demo now needs (section 10): Morrow's full menu and drink options, Atelier Wren's four stylists (Ana, Theo, Isla, Sam), the clinic's 30-minute video appointment and 60-minute health check, Hart & Sons' covered postcode districts (W2 to W14) and visit windows.
- 2026-10-13: Lab pieces follow the module contract in section 6.
- 2026-10-13: The shared shell (assets/shared/tokens.css, boot.js, motion.js, shell.js, shell.css) replaces topbar.js, studio.css and the per-page scripts on the new pages. Work Sans and Cormorant Garamond are reused from assets/studio/fonts/ (already credited).
- 2026-10-13: The top bar never hides while scrolling, so "Start a project" is always visible (round 04's decision, which section 6 keeps); settings.js topbar.hideOnScroll can switch hiding on.
- 2026-10-13: The Worker's address moves into settings.js (ai.workerBase); each AI endpoint is derived from it unless set, and '' switches that feature off.
- 2026-10-13: Below 360px wide the top bar's button reads "Enquire" (kept from round 04) because "Start a project" doesn't fit at 320px.
- 2026-10-13: Design yours' "Send this to Toff" uses the outlined secondary button, not gold: the gold solid button stays the top bar's one "Start a project" (overrides the plan's storyboard, screen 8).
- 2026-10-13: Design yours' Describe counts its own 8 live answers per visit, separately from the AI demo and the concierge; /read-sketch stays uncounted, as before. Its time-out uses ai.firstWordTimeoutMs (12 s).
- 2026-10-13: Draw your site (drawsite.js) gained onBuilt/onBusy options so Sketch feeds SiteKit; without them it behaves exactly as before.
- 2026-10-13: The concierge is one component in two places: inline under "Tell us what you need", and as a panel (docked on the right from 1024px, a full-height sheet below). The floating "Plan with us" button never shows on phones on the home page, because content fills the width; "Start a project" in the top bar is always there instead.
- 2026-10-13: The concierge removes emails, phone numbers and stated names from anything sent to the Worker, as a second line of defence, and tells the visitor it did.
- 2026-10-13: The AI demo keeps each business's conversation and frame while switching; the Linden Clinic page is a small calm booking page in system fonts (noindex).
