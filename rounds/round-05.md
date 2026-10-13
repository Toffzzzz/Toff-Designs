# Toff Studio, Round 05: the showcase rebuild

You're working in my Toff Studio portfolio repo: the folder "toff portfolio" on my Mac (GitHub: github.com/Toffzzzz/Toff-Designs, live at https://toffzzzz.github.io/Toff-Designs/). This is Round 05, and it works differently from rounds 01 to 04: there is no zip of pre-built files. You design, build, test and review everything yourself, on a new branch, and it only goes live when I reply "ship it". This file is saved in the repo as rounds/round-05.md.

## 1. What this round is for

The portfolio exists to show a potential client everything my studio can make for them. It doesn't impress me yet, and some of it is clutter. Rebuild it into the best work you can produce: Awwwards-level design, new kinds of art and animation, real features that small businesses pay for, live AI that takes actions, and engineering that holds up under inspection (fast, accessible, tested). Use everything Claude Code can do: web research, planning, parallel subagents, a browser you drive and look through, a guard hook, a real test suite, CI and fresh reviewers. This is your chance to show the maximum.

The bar: a café owner, a clinic manager and an Awwwards juror each open the home page. Within ten seconds all three think "I've never seen a small studio do this", and the café owner still finds it calm, clear and easy to use on a phone.

Fewer, bigger, better: not more sections. Everything on the site must do at least one of three jobs:
1. show our work;
2. explain how we work;
3. let a visitor try something they could have on their own site.
Anything that does none of these goes, however clever it is.

## 2. How to run this prompt

1. Read this whole file before you change anything. It's long: read it in chunks, to the last line.
2. Keep a running log in rounds/round-05-log.md. At the end of every phase, append the time, what's done, the test results, what's next and anything open. If you're resuming (after a break, a context compaction or a usage limit), read the log and `git log --oneline -15` first, and carry on from where it stops. Never redo a finished phase.
3. Keep your task list current: one task per phase, ticked off as each one finishes.
4. Work on the branch round-05. Commit at the end of every phase (files added by name), and push the branch, never main, as a backup.
5. Don't stop to ask me what you can decide. Where a choice is mine but has an obvious default, take it and record it in DECISIONS.md under "made while building; owner to confirm". Stop only for: deleting my work, anything that would read, set, rotate or print the API key, a login only I can do, or a failure you can't get round after three honest attempts. Even then, first finish everything that doesn't depend on it, then put the blocker at the top of your report.
6. If the permission checker (auto mode) refuses an action, don't retry it and don't look for another way to do the same thing. Note it in the log, skip whatever depends on it, carry on with the rest, and put it at the top of the report.
7. Run independent work in parallel with subagents: the five concept sites, the Lab pieces, the reviews. They can't see this file, so give each one the relevant appendix, the shared rules and (where it applies) the message API from the plan, word for word.
8. Look at everything you make. Passing checks isn't enough (a stray-dot bug once passed every numeric check). Take viewport screenshots while scrolling at 390, 820, 1024 and 1440px and look at them: tile them into contact sheets for an overview, and open single frames where detail matters. Keep screenshots, contact sheets, recordings and every other scratch file inside the repo in scratch/ (it's gitignored), never in /tmp: reading files outside the repo asks me for permission, and I may not be there to answer. Write test and capture scripts as plain Python with playwright.sync_api. Don't use pytest-playwright or `npx playwright test`: both empty their output folder at the start of every run. If you ever do use one, point its output at scratch/pw-output/.
9. Don't leave long-running background tasks going (a /goal run waits for them to finish). Any script that needs a web server starts its own on a free port and stops it when it's done (in Python, a ThreadingHTTPServer in a thread). If you want a server to look around by hand, start tools/serve.py detached (`nohup python3 tools/serve.py 8000 > scratch/serve.log 2>&1 &`) and check it with `curl -sI http://localhost:8000/`.
10. Quality beats quantity. If usage runs short, finish the current phase properly, commit, update the log and stop with the report, so the next session can carry on from the log.

## 3. Safety rules (these always apply)

- Only change files inside this repo and ~/Documents/toff-studio-tools/. Package-manager and tool folders are fine (pip's user folder, ~/.npm, the Playwright browser cache, Wrangler's settings, temporary folders). Everything else on the Mac is read-only. You may serve and screenshot the Everest folder (~/Downloads/everest-climate-solutions) and the live Bluebird site, but never write, move or delete anything in them.
- Nothing that was in assets/ before this round is ever deleted or moved: anything on the branch backup-before-round-05 stays where it is. Retired files stay in place, unloaded, and are listed as retired in README.md. Files you create this round may be removed or renamed.
- Editing or replacing tracked files in this repo is fine (git and the backup branch keep the old versions). Ask me before deleting a tracked file outside assets/ that this prompt doesn't name.
- git: run git status before you start; never "git add ." or "git add -A" (add files by name after looking at git status); never "git commit -a"; never force-push; never "git reset --hard"; never delete a backup branch.
- My Anthropic API key must never appear in any file, command, log or message. It lives only in the Cloudflare Worker's secret. If you ever see it anywhere, stop and tell me.
- Never invent anything about my studio: no testimonials, reviews, ratings, client names, prices, timeframes, awards, accreditations, statistics or claims. The made-up businesses on the concept sites may have made-up menus and prices, because every page says clearly that they're concepts.
- No AI-generated pictures in place of real people or real premises (me, Bluebird, Everest).
- The Everest link stays "Live site coming soon" while links.everest in settings.js is empty.
- Nothing is loaded from other websites when a page runs: fonts, scripts, models and images are all self-hosted. The only outside requests are the AI features calling my own Worker, and only when a visitor uses them.
- Phase 0 installs a guard hook (.claude/hooks/guard.py) that enforces several of these rules. If it blocks something, read its message and do it the right way. Never edit or disable the hook to get round it.

## 4. Earlier decisions this round replaces

I've agreed all of these, so don't stop to warn me about them (CLAUDE.md would otherwise ask you to). Record each one in DECISIONS.md under "<the date you start> — Round 05 (owner's decisions)", one dated line each, saying what it replaces.

1. Round 02's "no libraries are loaded" → self-hosted libraries are allowed where they earn their place: three.js r186 (the npm package three, 0.186.x) and Rapier (@dimforge/rapier2d-compat or rapier3d-compat, 0.19.x) for the Lab and one concept site, and GSAP 3.15.0 (already in vendor/) if a timeline genuinely needs it. Never Lenis or any other scroll-jacking: scrolling is always the browser's own.
2. Round 03's "the main page never loads the Lab's effects", and my master prompt's rule "showpieces only on a Lab page" → the main page may use WebGL where it shows our work or our process (the hero and the case films). Decoration (floating particles, smoke, glows that do no job) stays banned everywhere. A Lab piece, or a concept site's one named signature moment, isn't decoration. The main page never loads the Lab's pieces.
3. Round 04's section order, the Try it tabs and the four separate tools → the new structure in section 7.
4. Round 04's top-bar links (AI assistants, Work, Try it, How it works, The Lab) → Work, AI, Design yours, The Lab.
5. Round 02's and 04's opening (the drawn Morrow Coffee site in assets/opening/) and the showcase cards beside the phrases (assets/showcase/) → the new hero and work chapter. Everest's cooling picture (from assets/showcase/) stays in use.
6. The six-step enquiry with its style picker (assets/enquiry/) and the "Plan with us" planner as two separate things → one concierge: an AI that takes the brief, keeps the planner's point-and-pin and its brief document, and offers a short form to anyone who prefers one.
7. Round 03's "the planner stays in demo mode" → the concierge talks to Claude through the Worker's /concierge route, with a notice like the AI demo's (questions go to Anthropic and aren't stored; please don't type personal details). Sending an enquiry still stays in demo mode until it can go live.
8. The Sketch lens in the top bar → retired (its files stay, unloaded).
9. Concept studies drawn by MiniSite → five complete concept sites, each a real, finished website for a made-up business.
10. "Delivered parts: don't rewrite or improve them" → you own every file now. Two rules stay: line-data.js and the line SVG/JSON are only ever regenerated with tools/handwriting/build_line.py (never edited by hand), and face-line.svg is never redrawn or retraced.
11. The four phrases "You plan", "We design", "We deliver", "So... what will it be?" → retired: by our own not-AI-made rules they're a slogan triplet. The pen now writes the names of the work and, at the end, "Tell us what you need".
12. Kinetic headings on the main pages → retired (allowed in the Lab).
13. CLAUDE.md's "never delete files inside assets/" → refined: nothing that was in assets/ before a round (anything on that round's backup branch) is ever deleted or moved; files created during the round may be removed or renamed.
14. Tests kept outside the repo → a test suite in tests/, run with `python3 tests/run_all.py` and by GitHub Actions on every push. The older round scripts in /tmp/toff-tests stay as they are; they test retired parts. For this round, "run every CHECKLIST.md item" means the new checklist written in Phase 10.
15. Round 04's "wrangler.toml unchanged" → it may change once, in Phase 11, to add the preview link's address to ALLOWED_ORIGIN, after the Worker folder has been backed up.
16. Pushing main at the end of every round → this round is built on the round-05 branch and goes live only when I reply "ship it" (section 9).

## 5. What still applies

- The brand: Toff Studio, London. Midnight & Gold: midnight #0E1628 page, cream ink #F1E3C6, text #F6F0E4, slate #A7AFC2, gold #D8AC5F, tint #1A2541, deep midnight #0A101E for the footer, and the gold under-shadow under every line. Cormorant Garamond (light, never bold) for display and Work Sans for text, both self-hosted. The one-line ink pen. The headline "We sketch it. Then we build it." with "build" in gold italic. The cream-paper section with the torn edge, the still paper grain, the gold-line page transition, the skip link, the "This page is closed" 404 page and the craft line in the footer. You may refine sizes, spacing and the type scale; keep the palette and the two fonts on the studio's own pages.
- The motion rules (CLAUDE.md, DESIGN.md), on every page including the concept sites: laptops are driven by scrolling at a natural speed, starting only once that part is on screen; phones play each part by itself when it's reached; nothing reverses, replays, snaps back or freezes half-way; once something starts it finishes; no pinning (the content always moves with the scroll: a fixed background that changes is fine, a section that stops is not); Back, bfcache and Safari's late scroll restore are handled; a fresh visit opens at the top; reduced motion shows everything finished. New, for the interactive pieces: anything that answers the pointer or a finger isn't a "replay"; any automatic motion stops for good the moment the visitor takes over; nothing advances by itself (no carousels); anything that moves by itself for more than five seconds has a pause control (WCAG 2.2.2).
- The not-AI-made rules (DESIGN.md "Not template-looking", summarised here; the ai-tells-auditor in Appendix E has the full list): no labels above headings, no spaced-out capitals, no 01/02/03, no equal card grids or stat rows on the studio's pages, no slogans, stock words or em dashes in visible text, sentence-case headings without full stops, no glows, blur, halos or gradient text, 8px corners on buttons and chips, no decorative motion, no fake window chrome, varied rhythm. The concept sites follow them too, except that a shop may have a product grid.
- UK English, in plain, specific sentences a person would say.
- No prices for the studio anywhere. The enquiry's budget ranges stay. The hidden price line in How it works stays hidden until I set prices.
- showPlaceholders, data-unfinished and ?unfinished keep working as now. Kind words and About stay hidden until they're real.
- Every adjustable value lives in settings.js, with a plain comment, and DESIGN.md matches it.
- Anything that would send an enquiry stays in demo mode until chatMode is 'live' and formEndpoint and legal.privacyPolicyUrl are both set (as now).
- WCAG 2.2 AA on every page.

## 6. The verdict on the current site

Keep and improve:
- the AI assistants demo (the strongest thing on the site);
- the handwriting engine, InkWriter and the footer signature;
- the Bluebird and Everest work, and Everest's cooling picture;
- How it works on cream paper, What's included (its six items word for word) and the process line;
- the craft line, the top bar's always-visible "Start a project", the skip link, the 404 page, the view-transition line, the settings and the unfinished switch;
- the Worker, with its exact rate limit (SKETCH_COUNTER);
- brief.js (the brief document with its generative cover) and snapshot.js (pictures for pins);
- the playground and Draw your site, merged into one tool;
- the logo tracer, moved to the Lab.

Retire from the home page (the files stay in assets/, unloaded, and are listed as retired in README.md):
- the Sketch lens (xray.js): confusing, and it takes the top bar's space;
- the "Booking and other features" tab (capabilities.js): generic tiles; the real versions now live inside the concept sites;
- the logo tracer (it moves to the Lab), the Try it tab container (trytabs.js), the separate planner and six-step form with its style picker (assets/enquiry/), the opening (assets/opening/), the showcase cards (assets/showcase/, apart from Everest's cooling picture), the MiniSite concept thumbnails, the kinetic headings and the four phrases.

Retire from the Lab page: "Watch a section being written" (buildself.js); the new making-of piece replaces it.

New or rebuilt: the hero, the work chapter with its case films and case-study pages, five concept sites, the AI chapter (assistants that act), the Design yours tool, the concierge, the Lab as an exhibition, and the making-of piece.

## 7. The new site

Pages (folders with an index.html give clean addresses on GitHub Pages; every path inside them is relative):
- index.html: the home page, the story.
- work/bluebird/ and work/everest/: case studies.
- work/saltmarsh/, work/morrow/, work/atelier-wren/, work/hollis-and-pine/, work/hart-and-sons/: five complete concept sites (Appendix A). They carry `<meta name="robots" content="noindex">`, so made-up businesses never turn up in search results.
- lab.html: the Lab, rebuilt as an exhibition (Appendix B). Keep this address; I've shared it.
- 404.html: "This page is closed". It must work both under /Toff-Designs/ (GitHub Pages) and at the root of a domain (the preview link now, my own domain later). It's served at whatever made-up address was asked for, so relative paths can't work: it works out its base at run time from location.pathname (/Toff-Designs/ when the address starts with it, otherwise /) and loads its styles, fonts and links from there, and it still reads well as plain text if that fails.
- Old addresses keep working: the home page's old section links (#main, #opening, #ai-assistants, #selected-work, #try-it, #playground, #draw-your-site, #one-line, #what-we-build, #lab-teaser, #how-it-works, #included, #testimonials, #about, #contact, #enquiry) and the Lab's (#build-itself, #particles-band, #one-line, #liquid-gold, #moving-ink) land on the nearest new part.

Code layout: shared code in assets/shared/ (tokens, motion, SiteKit, the sketch shader, view transitions, the concept ribbon); the home page's new parts in assets/home/; the Lab in assets/lab/, with one module per piece in assets/lab/pieces/; each concept site inside its own folder; libraries in vendor/ (three/, rapier/); tests in tests/; capture scripts in tools/capture/. Parts you keep (aiassist.js, drawsite.js, brief.js, snapshot.js, inkwriter.js, oneline.js and so on) are loaded from where they are now: don't move or copy them; change them in place where needed. Plain HTML, CSS and JavaScript with ES modules (and an import map wherever three.js is used): no bundler, and no build step is needed to serve the site.

### 7.1 The home page (index.html), in this order: at most 12 laptop screens at 1440×900

1. **Top bar.** "Toff Studio" on the left; Work · AI · Design yours · The Lab; and "Start a project" (the one gold button), which opens the concierge. Phones: the name, "Start a project" and Menu. No Sketch lens. Links jump straight to their section, land just below the bar and add no #fragment (as now).

2. **Hero: "We sketch it. Then we build it."** The headline (large, rising line by line once, "build" in gold italic) and the supporting line ("A small web design studio in London. Every site starts as a pencil sketch, and can come with its own AI assistant."), above a large stage. On the stage is one of our sites, rendered live as a pen-and-pencil sketch in cream ink on midnight paper. On a laptop the pointer is a brush: wherever it passes, the finished, full-colour site is painted in, with an ink-bleed edge. If the visitor doesn't paint, after about 2.5 seconds a brush paints it in by itself in about 2 seconds. On phones it plays by itself when it comes into view (painting with a finger would fight scrolling, so the stage keeps touch-action: pan-y), and a tap finishes it. "Another site →", a quiet text button, swaps in the next site as a sketch, ready to paint; nothing ever advances by itself. A caption under the stage always says which site it is and whether it's client work or a concept ("Bluebird Wellness, a client's site" / "Saltmarsh, a concept site"). Choose the order that shows the effect best, starting with one of the strongest; Everest only if it was captured from its local folder (Phase 4).
   How it works: one WebGL2 fragment shader (assets/shared/sketch-shader.js, built in Phase 2; the Lab's first piece reuses it) draws from the site's screenshot (Phase 4). Edges (Sobel on luminance and colour) become ink lines; darker areas get cross-hatching at two angles; a slow, low-frequency wobble makes it look hand-drawn; a fine paper grain sits over it. A reveal mask in a render target takes the brush's soft, velocity-sized splats and spreads a little at its edges with noise, like ink bleeding. The mask only ever grows. Once it's more than 98% covered, show the plain finished screenshot and stop rendering. A thin, crisp gold line may trace the moving edge of the reveal (no glow, no blur).
   Fast first paint: the stage reserves its aspect ratio (no layout shift) and shows a pre-rendered still of the sketch (Phase 4, loaded with fetchpriority="high" at the stage's size) until WebGL is ready. Textures are WebP, at most 2560px wide. Without WebGL2, the still sketch cross-fades into the finished screenshot. With reduced motion or Save-Data, the finished screenshot is shown and nothing moves. The stage is role="img" with a label that names the site shown; keyboard users finish the painting with a "Build it" text button beside it (the stage itself takes no keys).
   When the painting finishes, the gold line drops from the bottom centre of the stage into the next chapter, as the opening's line does now.

3. **Work: "Recent work".**
   - The pen (the handwriting engine) carries on from the hero and writes "Bluebird Wellness" in the cursive as you reach it, and later "Everest Climate Solutions". These names are long for the cursive: break them across two lines with a pen lift where they don't fit (always on phones), at a size that stays legible. Lay it out through LAYOUTS in tools/handwriting/build_line.py (it must print no WARNING; it writes its output in tools/handwriting/, which you then copy into assets/handwriting/), never by editing line-data.js. The pen never crosses a picture or text.
   - Bluebird case film: a large laptop and phone, with the real Bluebird site playing its own line-drawing story on their screens (Phase 4's frame sequences). On laptops scrolling moves it forward (and only ever forward); on phones it plays once by itself. Beside it: what the clinic needed and what we built (the five "What we built" points, as prose or a short list), "Visit the live site" (new tab) and "Read the case study →" (work/bluebird/).
   - Everest case film: the same, from frames captured from the local Everest folder if it exists; otherwise the existing mock-up and the cooling picture (32 → 26 °C). "Live site coming soon", with no link, and "Read the case study →".
   - Concept sites: a heading and one line (for example: five complete websites for businesses we made up, each built around something a real one could use), then an editorial list of five rows. Each row has the name large in the serif, the kind of business and the area, the signature in a few words, and "Open the site →". On a laptop, hovering or focusing a row shows a preview window of that site's signature moment (Phase 4's short frame sequence), following the pointer within the row. On phones, a still sits under each name. Opening a site uses the gold-line page transition.

4. **AI: "Your website can answer your customers for you"** (keep the heading), with a second line saying it can also do things: take an order, find a free time, book a visit. The current demo, rebuilt around action:
   - The four made-up businesses stay (Linden Clinic, Morrow Coffee, Atelier Wren, Hart & Sons Plumbing, with their facts from aiassist.js), with the opening exchanges already shown as now, suggestion chips, and the editable "What it's been taught" panel (every answer names the facts it used; after an edit, "Ask that again").
   - Beside the chat, the business's real website runs in a phone-sized frame: the concept site itself (work/morrow/?embed=order, work/atelier-wren/?embed=booking, work/hart-and-sons/?embed=visit, which show just that part, without the ribbon or menu), and for Linden Clinic a small built-in page (assets/home/demo/linden.html, noindex). When the assistant acts, it acts on that real site through the small message API each of those pages exposes (Phase 1 defines it): the café's basket fills and a collection time is set, the salon's calendar shows a held appointment, the plumber's visit request appears with its price from the list. The chat shows a small confirmation card ("Held for 10 minutes: cut and finish, Thursday 6pm with Ana"). The frame loads only when the section is near.
   - Answers stream in word by word (no bouncing dots). Ask in Spanish and it answers in Spanish, from the same facts.
   - Live through the Worker's new /agent route (Appendix C). Without it, the same actions run from on-page rules, and the header says so plainly (as now). At most 8 live answers per visit (as now; a tool round trip is part of the same answer), with a 12-second time-out until the first streamed word. The clinic never gives medical advice (it offers to book, NHS 111, or 999). It never asks for personal details; a held booking is in the name "Guest".
   - Keep the "Other AI we build" list, tightened, and "Ask us about an assistant →", which opens the concierge on that topic.

5. **Design yours: "See your business as a website"** (or a better heading; sentence case, no full stop). One tool with three ways in, as a segmented control: Pick (the playground's business, mood, layout and name), Sketch (Draw your site's blocks and pen, with "I'm done") and Describe (a sentence or two, such as "A Turkish bakery in Walthamstow, warm and modern, with our hours and a map"). One preview, on a laptop and a phone, drawn by one renderer: SiteKit (assets/shared/sitekit.js). SiteKit replaces MiniSite and Draw your site's own builder, and understands every section type both used: menu bar, logo, menu links, hero variants, headings, text, buttons, pictures, round photo, cards, gallery, video, map, contact form, menu or price list, booking, hours, contact, and a reviews section (shown as an empty, clearly labelled space for the business's own reviews, never sample reviews). Describe goes to the Worker's /design route (structured output, Appendix C); offline, it picks the closest Pick settings from the words. Sketch keeps /read-sketch exactly as it works now. "Send this to Toff" adds the design to the concierge's brief. Sketch's code loads only when Sketch is chosen.

6. **The Lab: "There's more in the Lab"** (keep): one wide still made from the new pieces (Phase 7), the eight titles as links, and "Open the Lab →".

7. **How we work, on cream paper:** the process line through Discovery call, Sketch, Build, and Launch & care (their texts word for word, with timeframes from settings.js as now), What's included beside it (its six items word for word), and "Every project is quoted personally after a short call." The hidden price line stays hidden.

8. **Kind words and About:** the same mechanism, hidden until real.

9. **Start a project:** the pen writes "Tell us what you need" (InkWriter, as now), and under it the concierge appears inline (the same component as the floating one; the floating button hides while this one is on screen). "Prefer a form? →" shows a short form instead (what your business does, what you need, timing, budget range, name, email, phone (optional), consent), in demo mode until the enquiry is live.

10. **Footer:** as now (signature, "Start a project →", Email, Privacy policy, the Lab, the craft line, ©), with "Plan it with our helper" opening the concierge, and links to the two case studies.

### 7.2 The concierge (assets/home/concierge.js)

- One floating button in the bottom-right corner ("Plan with us"), the only floating control on the page, with assistant.js's hide rules: hidden over the hero, the footer, the AI demo, the Design yours controls and the inline concierge, while a dialog is open, and wherever it would cover text or a control. On phones it opens as a full-height sheet.
- Its header says plainly that it's an AI, that questions go to Anthropic to be answered and aren't stored, and asks visitors not to type personal details (like the AI demo's).
- It opens with: "Hello. I'm the studio's assistant, an AI. Tell me a little about your business and what you'd like your website to do, and I'll put together a brief for Toff. You can also point at anything on this site and say 'I want this'." Chips: A new website · A redesign · An AI assistant · Just looking.
- One short question at a time, in plain human words, with no filler ("Lovely!", "Great question!"). It shows our work as cards when the look comes up, can open Design yours with a preset, starts point-and-pin (assistant.js's, with snapshot.js pictures), and fills in a brief beside the chat as it goes (business, goals, must-haves, look, pins, designs, timing, budget range, notes), one field at a time. The visitor can edit the brief directly.
- It never asks for or sends a name, email address or phone number. Those go into a short contact step at the end, which is never sent to the AI and is only sent anywhere once the enquiry is live (demo until then, as now).
- It never quotes a price or a timeframe unless settings.js has one ("Every project is quoted personally after a short call"), never claims to be a person, and politely keeps to the visitor's website.
- At the end: a summary, "Download your brief" (brief.js, with its generative cover; the AI writes the summary through /brief), then the contact step.
- Live through /concierge (Appendix C). Offline, a scripted version of the same flow, built from assistant.js, so it always works.

### 7.3 The case studies (work/bluebird/, work/everest/)

Each tells the project in order: what the business needed, the sketch (assets/studio/cases/sketch-*.webp), what we built, the highlights as moving captures (Phase 4), and a way to see it ("Visit the live site" for Bluebird; "Live site coming soon" for Everest). Use only facts already in this repo (the case lists in index.html, DESIGN.md and the Everest lines in DECISIONS.md): no metrics, no quotes, no invented results. Only real pictures of these two projects (screenshots and captures, never AI-made ones). The same look and shell as the home page.

### 7.4 Craft: what separates good from exceptional

- Type: proper quotes and apostrophes (’ “ ”), a non-breaking space before units (32 °C), tabular numerals for prices and times, text-wrap: balance on headings and pretty on paragraphs, no lonely last words, comfortable line lengths at every width.
- Motion: one family of easings across the site; durations that grow with distance; nothing linear in the interface; staggers only where they mean something; every animation can be interrupted; 60 frames a second.
- States: hover effects only inside @media (hover: hover); a visible focus ring; pressed and disabled states (a disabled button says why, beside it); loading states that keep the layout still; empty and error states in plain words. Every action answers within 100 ms.
- Pictures: width and height set, srcset and sizes, decoding="async", lazy below the fold, crops chosen for phones as well as laptops.
- Both a 320px phone and a 2560px screen look deliberate.
- Search and sharing: a title, description and link-preview image for every page; canonical addresses, JSON-LD for the studio (an Organization, area served London, no address) and for the case studies, and sitemap.xml, all built from one setting, siteUrl in settings.js (https://toffzzzz.github.io/Toff-Designs/ for now). A robots.txt only works at the root of a domain, so leave it until the site has its own; the noindex tags keep the concept sites out of search.

## 8. Phases

### Phase 0: safety, branch and tools
If the branch round-05 already exists, you're resuming: switch to it, read rounds/round-05-log.md, stop only for uncommitted changes the log doesn't explain, and carry on from the first unfinished phase.
1. Run git status. Apart from rounds/round-05.md (this file, which I copied in) and anything under .claude/, if anything is uncommitted, show me and stop. If rounds/round-05.md isn't there, stop and tell me.
2. git pull, then `git branch backup-before-round-05`, then `git switch -c round-05`.
3. Add to .gitignore: .claude/settings.local.json, .claude/ship-approved, .claude/worktrees/, scratch/, handover/, test-results/, .wrangler/ and *.zip.
4. Install the guard, in this order. First write .claude/hooks/guard.py exactly as in Appendix D, and test it: write a payload file such as {"tool_name": "Bash", "tool_input": {"command": "git add ."}, "cwd": "<repo path>"} into scratch/ and run `python3 .claude/hooks/guard.py < scratch/payload.json` (it must exit 2), then the same with "git status" (it must exit 0). Only then write .claude/settings.json, last, exactly as in Appendix D. If .claude/settings.json already exists, add the hooks block to it without removing anything; leave .claude/settings.local.json alone. If writing the settings file is refused, tell me in one line and carry on without the hook; the rules still apply.
5. Write the five subagent files from Appendix E into .claude/agents/. If they don't appear in your Agent tool's list in this session, use the general-purpose subagent instead and paste the file's instructions at the top of each brief.
6. In CLAUDE.md, change the standing rule "Never delete files inside `assets/`" to this round's refined rule (section 4, item 13) now, and add one line at the top: "Round 05 is in progress: see rounds/round-05.md and rounds/round-05-log.md." Everything else in CLAUDE.md is rewritten in Phase 10.
7. Check your tools without installing system software: python3 (with playwright, pillow and numpy), node and npx, ffmpeg (optional), Google Chrome (Lighthouse needs Chrome; if it isn't installed, point CHROME_PATH at Playwright's Chromium), and `npx wrangler whoami` (am I logged in to Cloudflare?). Install Python and npm packages as needed (pip3 install …, or npm inside a temporary folder for vendoring). Note in the log what's there and what isn't.
8. Create rounds/round-05-log.md and your task list.
Commit: "Round 05, phase 0: guard hook, subagents, log".

### Phase 1: research, direction and contracts
1. Screenshot the current site (index.html and lab.html) at 390 and 1440 as viewport frames while scrolling, and note in the log what works and what doesn't.
2. Research what wins now: the most recent Awwwards Sites of the Day and Sites of the Month, and studio portfolios that won in 2025 and 2026 (search the web and read the pages). Pick ten references. For each, write one line on what it does well and the principle we'll borrow. Never the look itself: nothing is copied.
3. Write rounds/round-05-plan.md: the home page's storyboard, screen by screen at 1440 and 390; the design system (type scale, spacing, grid, colour tokens, and motion tokens: durations, easings, distances); each concept site's art direction (palette, fonts, one sentence of mood, its signature moment); the Lab's exhibition design; the technical plan (what loads when, and the budgets); and the risks, each with how you'll handle it.
4. In the same plan, write the two contracts everything else depends on: (a) the message API between the AI demo and the pages in its frame (action names, argument names and types, result and error shapes; the allowed origin; for Morrow, Atelier Wren, Hart & Sons and the Linden Clinic page); (b) SiteKit's spec schema (moods, section types and their fields), which /design must return. These are pasted word for word into the site briefs and the Worker.
5. Before building pages, make two quick static style frames (the hero at 1440 and 390, and one concept site's first screen), screenshot them, have the design-critic review them cold, and adjust the plan.
Commit.

### Phase 2: foundations
1. assets/shared/tokens.css: every colour, size, space, radius and motion value as custom properties (written from settings.js where they apply), the base type, focus styles, the paper grain, the cream-paper section, and the view-transition line (cross-document @view-transition, keeping the current fallback).
2. assets/shared/motion.js: one small module that every page uses for the motion rules: starts when on screen, high-water-mark progress on laptops (never backwards), plays by itself on phones, reduced motion, Back, bfcache and late restore, jump detection. Port the logic from the handwriting engine rather than inventing a second version.
3. The top bar, the footer and the page shell, shared by the home page, the case studies and the Lab.
4. assets/shared/sitekit.js (SiteKit), to the schema from Phase 1, tested on its own.
5. assets/shared/sketch-shader.js: the hero's shader (7.1 point 2), tested on its own against one existing screenshot (assets/studio/cases/bluebird-laptop.webp).
6. assets/shared/ribbon.js: the concept ribbon (Appendix A).
7. Add a --gzip option to tools/serve.py that compresses text files the way GitHub Pages does, so page weight and Lighthouse are measured fairly.
8. Vendor three.js r186 and Rapier: install the npm packages in a temporary folder and copy in only the files you'll load, with their licence files, recording versions and licences in CREDITS.md. three.js r186 ships no minified builds, so minify each file you copy, in the temporary folder (`npx esbuild <file> --minify --outfile=<file>.tmp && mv <file>.tmp <file>`: esbuild can't write over its own input; without bundling it keeps the ./three.core.js imports and the @license comment): build/three.core.js and build/three.module.js, and, if they're used, build/three.webgpu.js, build/three.tsl.js and the specific addons from examples/jsm/. Keep the build files side by side; the import map maps "three", "three/webgpu", "three/tsl" and "three/addons/".
9. Update settings.js (new settings, each with a comment, including siteUrl and the AI endpoints) and DESIGN.md to match.
Commit.

### Phase 3: the five concept sites, in parallel
Spawn five site-builder subagents at once, one per site, each with Appendix A's shared rules and its own brief word for word, its art direction from the plan, and (for Morrow, Atelier Wren and Hart & Sons) the message API. Each works only in its own folder. While they work, back up and extend the Worker (Phase 6, steps 1 to 3), which doesn't touch the repo. When the sites come back, open each one yourself at 390 and 1440, try every feature end to end, run Lighthouse on each (one at a time), and fix or send back anything below the bar.
Commit each site separately: "Round 05: concept site <name>".

### Phase 4: captures (the pictures and moving pictures the home page needs)
Write the capture scripts in tools/capture/ (committed: they're reusable). They write into scratch/captures/; copy only the final files, with stable names, into assets/home/captures/ (committed). Never write scratch files under assets/.
1. Hero screenshots: the first screen of each concept site and of the live Bluebird site (after its opening drawing has finished), at 1440×900 with a device scale of 1.5 (2160px wide) for laptops and at 390×844 with a device scale of 2 for the phone version of the stage, as WebP at about quality 80. Everest: check whether ~/Downloads/everest-climate-solutions exists with Bash only (`test -d ~/Downloads/everest-climate-solutions`), never with the file tools (reading outside the repo would ask me for permission). If it does, the capture script serves it read-only from its own folder on another port and captures it too, without writing anything inside it or running any build there.
2. Pre-rendered still sketches: run the shader from Phase 2 in Playwright with an empty mask and save each sketch as a WebP (the fallback, and the first paint).
3. Case films: the Bluebird site (live) and Everest (local, if present) scrolled smoothly at 1440 and 390, captured as frame sequences of at most 90 frames each, WebP, under 2.5 MB per sequence, loaded only when the section is near.
4. Concept-site previews: three or four seconds of each site's signature moment as a short WebP frame sequence (no video files: Playwright's Chromium can't play H.264), under 600 KB each, plus a still.
Commit.

### Phase 5: the home page
Build index.html and assets/home/ as described in 7.1 and 7.2, loading the parts you keep from where they are now. Check each chapter at 390, 820, 1024 and 1440 as you finish it. The home page loads no Lab code and no three.js. If you have capacity, start Phase 7's subagents while you build this. Commit after each chapter.

### Phase 6: the AI (the Worker and the wiring)
Steps 1 to 3 may already be done from Phase 3.
1. Before changing anything, copy ~/Documents/toff-studio-tools/optional-ai/ to ~/Documents/toff-studio-tools/optional-ai-backup-<date>/. Then read the deployed worker, wrangler.toml and both test files. Don't change how /read-sketch and /chat behave.
2. Add /agent, /concierge, /brief and /design as described in Appendix C, sharing the existing origin check and exact counter. Add no new Durable Object classes or migrations (they would stop a rollback).
3. Write test-round-05-routes.mjs (Anthropic mocked, as in Appendix C) and run it together with the two existing test files: all of them must pass.
4. Deploy: `npx wrangler deploy`. If the deploy is refused or fails, don't stop: the site works with its offline fallbacks. Carry on, and put the exact command in the report.
5. After every deploy: check /chat and /read-sketch live straight away (one small request each, with the header Origin: https://toffzzzz.github.io). If either fails, run `npx wrangler rollback --message "Round 05 auto-rollback"` at once, check again, and say so in the report (if the rollback waits for a confirmation it can't get, stop it and put the exact command in the report). Then one tiny live request to each new route; check that Origin: https://example.com gets 403; and that the 21st request within a minute gets 429 (the counter counts every request after the origin check and before validation, so send requests that fail validation and nothing is spent). Never print the key.
6. Wire the site to the routes (the endpoints live in settings.js), with time-outs and quiet fallbacks.
7. Update COMPLIANCE.md and privacy-policy-draft.md: each route, what it sends, and that nothing is stored.
Commit the site's changes. Never commit anything from ~/Documents/toff-studio-tools.

### Phase 7: the Lab, in parallel
Build the exhibition shell yourself (Appendix B), then spawn site-builder subagents for the pieces, two or three pieces each, with Appendix B word for word. Review every piece at 390 and 1440, on a simulated normal device. Make the Lab's still for the home page's band. Commit.

### Phase 8: the case studies and the making-of
Build work/bluebird/ and work/everest/ (7.3), and the making-of piece (Appendix B, piece 8). Commit.

### Phase 9: quality: test, measure, review, fix
1. Make the link-preview images (1200×630) for every page now that every page exists.
2. Write the test suite (Appendix F) and run it until everything passes.
3. Run Lighthouse yourself, one page at a time, against tools/serve.py --gzip (`npx lighthouse`, desktop and mobile): index.html, every concept site and lab.html. Meet the budgets in Appendix F.
4. Take screenshots of every section of every page at 390, 820, 1024 and 1440 (viewport frames while scrolling), a quick pass at 320 and 2560, and two short screen recordings of the home page (laptop and phone) with Playwright. Playwright records WebM: convert them to MP4 with ffmpeg if it's installed, otherwise leave them as WebM (they open in Chrome). Look at all of them.
5. In parallel, run the fresh reviews. The reviewers see screenshots and the visible text, never the code: design-critic, first-time-visitor and ai-tells-auditor; and a11y-perf-auditor, which runs its tools. Fix everything real they find, then run the tests and the reviews again. At most three review rounds: stop when the design-critic scores at least 8 out of 10 for Design, Usability, Creativity and Content, the first-time visitor knows what to do on every screen, and the auditor finds no template tells, or after the third round; anything still short goes in the report with the reviewers' notes.
Commit.

### Phase 10: write it down
- DESIGN.md: the new design system. Keep the older sections under a "History" heading, and keep the Not template-looking list, with this round's additions.
- DECISIONS.md: this round's decisions (section 4, and everything you decided while building).
- CHECKLIST.md: the new checks; move the old ones under "Retired in Round 05".
- CLAUDE.md: the new concept, the code layout, the motion and not-AI-made rules, that you own the code, the refined assets/ rule, the guard hook, the tests, and the "ship it" rule.
- README.md: how the site is built, how to preview it (on the laptop, and on a phone on the same Wi-Fi), every setting, how the AI works and how to switch each part off, how to add photos, how to run the tests, and the retired files.
- COMPLIANCE.md, privacy-policy-draft.md and CREDITS.md (every font, library and image, with its licence and version).
- IMAGE-PROMPTS.md, for the concept sites only: every photo that would make them better, each as a ready-to-paste ChatGPT prompt (cinematic, in that site's art direction), with the exact file name, size and folder. Add tools/add-images.py, which takes them from ~/Downloads/toff-round-05-images/, makes WebP at the right sizes and puts each in place; the sites already have tasteful fallbacks without them. For the two case studies, list instead the real photos to ask the clients for.
- AWWWARDS.md: a ready submission (title, short description, tags, which pages to show, the credits line), with the screenshots it needs at the sizes awwwards.com asks for now (look them up), saved in handover/awwwards/.
Commit.

### Phase 11: preview, CI, hand-over
1. A preview link I can open on my phone, if `npx wrangler whoami` shows I'm logged in: export the published files with `mkdir -p scratch/dist && git archive round-05 | tar -x -C scratch/dist` and delete .claude, .github, tests, tools, rounds and the markdown files from that copy; create the Cloudflare Pages project "toff-studio" once (`npx wrangler pages project create toff-studio --production-branch main`; if that name is taken, "toff-studio-portfolio"); run `npx wrangler pages deploy scratch/dist --project-name <name> --branch round-05`. The preview's address is the branch alias https://round-05.<project>.pages.dev, not the one-off hash address that is also printed. Add exactly that origin to ALLOWED_ORIGIN in the Worker's wrangler.toml, redeploy the Worker (with the checks in Phase 6 step 5), run the Worker tests again, then open the preview with Playwright and check that every page loads with no errors. If any step is refused or fails, skip the preview and say so.
2. Put the hand-over files in handover/ (in the repo folder, gitignored): the two screen recordings, a contact sheet of every page at 390 and 1440, the Lighthouse summaries and the Awwwards images.
3. CI, last: .github/workflows/checks.yml runs the test suite on every push (Playwright with Chromium on Ubuntu; it starts its own server; skip the frame-time and GPU checks there with an environment variable). First push the branch with everything else, then commit the workflow on its own and push again. If GitHub refuses that last push because the token can't change workflows, leave the commit unpushed and tell me to run `gh auth refresh -s workflow` and then `git push`. If the push works, check that the run passes (gh run list and gh run view, if gh is logged in; otherwise say so).
4. Write the final report (section 10). Don't merge into main.

## 9. "Ship it"

Only when I reply "ship it":
1. Run git status (it must be clean), `git switch main`, `git pull`.
2. Write today's date and my words into .claude/ship-approved. The guard only lets main be pushed when this file exists (it's in .gitignore).
3. `git merge --no-ff round-05 -m "Round 05: the showcase rebuild"`, then run the test suite once more, on main. If anything fails, don't push: fix it on round-05 first.
4. `git push origin main`, then delete .claude/ship-approved. After two minutes, open https://toffzzzz.github.io/Toff-Designs/, the Lab, one concept site and a made-up address (for the 404 page) with Playwright, and check that each loads with no errors.
5. Tell me it's live, and remind me that GitHub Pages takes a minute or two and to refresh with Cmd + Shift + R (on an iPhone, close the tab and reopen it).

## 10. When you finish, tell me

- What you built, page by page, a few lines each, and what you cut.
- Every file added, changed and retired (retired: still in assets/, no longer loaded).
- The test results (every suite, passed / total), the Lighthouse scores, and the reviewers' final scores.
- The AI: what's deployed, each route answering, /chat and /read-sketch still working, other websites refused and the rate limit still on (never show the key), or the one command to run if the deploy was refused.
- The preview link (if you made one), the branch, and how to see it on my Mac: `python3 tools/serve.py 8000`, then http://localhost:8000. On my phone, http://<the Mac's Wi-Fi address>:8000, where the AI demos fall back because the Worker only answers known addresses.
- Where the hand-over files are (handover/ in the repo folder). The copy of this prompt that's kept is rounds/round-05.md.
- Anything you couldn't do exactly as asked, every action the permission checker refused, and what you did instead.
- What I still need to give you, most important first: a real email address, my rough prices and timeframes, the privacy policy, my own About text and a photo, a quote from the Bluebird client if they're happy to give one, the Everest live address once it's online, the photos in IMAGE-PROMPTS.md, real photos for the case studies, and a domain.
- How to switch each AI feature off quickly.
- That to put it live, I just reply "ship it".
Don't end with offers or questions unless something is blocking.

Definition of done (all of these, measured):
- every test suite passes (Appendix F), and the Worker's three test files pass;
- the Lighthouse budgets in Appendix F are met;
- the reviews have run (at most three rounds), with the design-critic at 8 or more in all four categories, the first-time visitor never lost and no template tells, or the remaining gaps listed in the report;
- every page looks right at 320, 390, 820, 1024, 1440 and 2560px, in screenshots you've looked at;
- the home page is at most 12 laptop screens long;
- with the Worker unreachable, every AI feature still works from its fallback, with no errors;
- nothing on the site claims anything about the studio that isn't true.

---

## Appendix A: the concept sites

Shared rules for every concept site (give these to each site-builder word for word):
- Work only inside work/<slug>/ (its pages, CSS, JS, fonts/ and img/). You may read assets/shared/ and vendor/ and load them by relative path, but don't change them (tell the lead what you need in your report). Never touch anything else in the repo. Screenshots and scratch files go in scratch/<slug>/.
- It must look and work like a premium client site we'd be proud to hand over: built for phones first, fast, accessible (WCAG 2.2 AA), with a distinctive art direction that is neither Midnight & Gold nor a template. Its own palette and font pairing: fonts under the SIL Open Font License, self-hosted as woff2 (from the @fontsource npm packages, installed in a temporary folder, or the google/fonts repository on GitHub), with their licence files in fonts/ and a credits line for each in your report.
- At least five sections, a working menu and footer, one signature moment (the kind of art or animation named in the brief), and the working features in the brief. Features are demos: they send nothing and store nothing beyond sessionStorage, and say so in one quiet line where it matters ("A demo: nothing is booked or charged").
- Honest: no reviews, testimonials, star ratings, awards, accreditations, guarantees or "years in business". Made-up menus and prices are fine. The business's own phone numbers only from Ofcom's range for drama (020 7946 0000 to 020 7946 0999); real emergency numbers stay real (999, NHS 111, and the gas emergency line 0800 111 999). Email addresses at .example (for example hello@saltmarsh.example). Keep every fact the AI demo already uses for that business (its hours, prices and rules in assets/studio/aiassist.js) exactly the same.
- The concept ribbon (assets/shared/ribbon.js) at the bottom of every page: "A concept site by Toff Studio. Saltmarsh is made up." and "Back to Toff Studio" (../../). It never covers content or controls, and it's reachable by keyboard. With ?embed=<feature> in the address, the page shows just that feature, and the ribbon and the menu are hidden (the AI demo shows it in a frame).
- Morrow Coffee, Atelier Wren and Hart & Sons: implement the message API from the plan exactly (same-origin messages only, only the listed actions, every argument checked, a result or error message for each). The site's own interface updates exactly as if the visitor had done it.
- Pictures: copy the site's one existing photo from assets/studio/playground/ into img/ (copy, never move): Saltmarsh playground-restaurant.webp, Morrow playground-cafe.webp, Atelier Wren playground-salon.webp, Hollis & Pine playground-boutique.webp. Hart & Sons has none: playground-trades.webp shows an air conditioner (Everest's trade, not plumbing), so don't use it. Everything else is made in code in the site's own style: SVG illustration, CSS, canvas, WebGL or 3D. No grey boxes and no "image here". List in your report the photos you'd add (subject, file name, size) for IMAGE-PROMPTS.md.
- The motion rules and the not-AI-made rules apply (a shop may have a product grid).
- Budgets: under 400 KB transferred (compressed) before interaction (a 3D or WebGL module may load on demand after that); no console errors, no failed requests, nothing from other websites, and no sideways scrolling at 320px. Don't run Lighthouse yourself: the lead runs it on each site, one at a time (performance at least 95 on desktop and 90 on mobile; accessibility and best practices 100; SEO 100 apart from the indexing check, which noindex fails on purpose).
- A title, a description, link-preview tags, one h1, and `<meta name="robots" content="noindex">`.
- Test it yourself: screenshots at 390, 820, 1024 and 1440 (viewport frames while scrolling; look at every one), each feature end to end by keyboard and by touch, and axe (no serious or critical issues). Start your own web server inside your test script and stop it at the end. Report what you built, the files, the checks and their results, the photos you'd add, and anything you're unsure of.

1. **Saltmarsh** (work/saltmarsh/): a seasonal restaurant in Bermondsey. Existing lines: "Seasonal cooking in a small Bermondsey dining room." and "A short menu that changes with the coast and the market, and a wine list worth lingering over." Existing details to keep: dinner Tuesday to Saturday, Sunday lunch, private dining in a back room that seats twelve, and walk-ins welcome at the bar. Mood: bold.
   Look: dark and warm, like a candlelit room and a printed menu card; an expressive display serif with a sturdy grotesk.
   Signature (a shader): heat and steam rising off the hero dish: a WebGL distortion over the photo with soft, slow wisps, running only while it's on screen; reduced motion shows it still.
   Features: table booking (a party of 1 to 8, the next 30 days, dinner and Sunday lunch times, closed days greyed out, special requests, and a confirmation card with a reference); the menu, with filters for vegetarian, vegan and gluten-free and an allergen key; a private dining enquiry; a gift voucher picker.

2. **Morrow Coffee** (work/morrow/): a neighbourhood café at 14 Elm Row, Hackney. Existing lines: "Slow mornings, very good coffee." and "Single-origin espresso, bread baked at dawn and a long table by the window." The AI demo's facts stay exactly the same: weekdays 7.30am to 4pm, weekends 8.30am to 4pm; flat white £3.40, pastries from £2.80 (cardamom bun £3.20), sourdough toast £4.50; oat, almond and soy milk at no extra cost; a gluten-free brownie; the kitchen uses nuts; 24 seats inside and a bench outside; dogs welcome; no bookings. Mood: calm.
   Look: warm, light and friendly: cream, coffee and a terracotta accent; a soft serif or a friendly grotesk, with hand-drawn accents in its own line style.
   Signature (2D physics): build your drink: a cup in cross-section that fills with layers (espresso, milk, foam, syrup) which slosh and settle with spring physics as you choose the size, milk, shots and syrup, while the price updates.
   Features: order ahead (collection times within today's hours, a basket, "pay when you collect"); open or closed right now, from London time and the hours; a loyalty card that stamps; how to find us, on a small map drawn in its own line style.

3. **Atelier Wren** (work/atelier-wren/): a four-chair hair studio in Marylebone. Existing lines: "Hair, cut and coloured with care." and "A quiet, four-chair studio for precise cuts and colour that grows out beautifully." The AI demo's facts stay exactly the same: open Tuesday, Wednesday and Friday 9am to 6pm, Thursday 9am to 8pm, Saturday 9am to 5pm, closed Sunday and Monday; cut and finish from £58, full colour from £85, blow-dry £35; 24 hours' notice to cancel or move; a patch test at least 48 hours before a first colour. Mood: classic.
   Look: an editorial fashion magazine: cream and black with one muted rose; a high-contrast serif and large, confident type.
   Signature (transitions): a lookbook where a picture flows into its detail page and back with shared-element View Transitions, and a before-and-after with a soft-edged wipe you drag (or move with the arrow keys).
   Features: booking (service, then stylist, then day and time, with each service's length and price); the price list; the patch-test rule shown wherever colour is booked; a gift card.

4. **Hollis & Pine** (work/hollis-and-pine/): clothing and ceramics from small makers, in Islington. Existing lines: "Clothing and ceramics from small makers." and "Natural-fibre clothing and hand-thrown ceramics from small makers we know by name." Mood: fresh.
   Look: Scandinavian calm: white, sage and clay, generous space, a clean humanist sans.
   Signature (real-time 3D): a ceramic vase drawn live with three.js r186. Its shape is made in code from a profile curve (a lathe); glazes switch between matte, satin, gloss and speckled, with physically based materials and soft studio lighting; drag to turn it. It turns slowly once when it first appears, then waits for the visitor. It loads only when it's near.
   Features: the shop (filters by category, colour and price), a product page (colour, size, quantity), a basket drawer that remembers its contents during the visit, and a checkout preview (address with validation, the order summary, "A concept: nothing is charged").

5. **Hart & Sons Plumbing** (work/hart-and-sons/): a plumbing and heating firm in west London. The AI demo's facts stay exactly the same: they cover west London from Paddington out to Ealing; Monday to Saturday 8am to 6pm, emergency call-outs only on Sunday; a boiler service is £95; an emergency call-out is £120, then £60 an hour; a quote visit is free; anyone who smells gas calls the gas emergency line first. Mood: practical.
   Look: bold, trustworthy and easy to scan: charcoal, off-white and one copper accent; a sturdy grotesk with large numerals. With no photo yet, it leads with type and code-made illustration (copper pipework drawn as line art suits it).
   Signature (data and SVG): an instant quote: four questions (the job, the size of the home, how soon, extras) and a price range that builds itself line by line, with the call-out fee shown up front; and a map of the area it covers that draws itself in line, with a postcode check against the covered postcode districts (a list in the code, no outside service).
   Features: book a visit (a day, and a morning or afternoon window); the emergency call-out line, with its fee shown; questions and answers; what happens on the day (not as a numbered list).

## Appendix B: the Lab

The exhibition (lab.html and assets/lab/):
- The index is a list of large titles, like a gallery wall, each with one line on what it is and what it's good for. Hovering over or focusing a title shows its still; on phones the still sits under the title. No card grid.
- Each piece opens full-screen at lab.html#<id>, with a quiet caption (its title, how it's made in one sentence, and "Good for: …"), previous and next, arrow keys, swipe on phones, and Escape or "All experiments" to go back to the index. Opening the Lab with #<id> goes straight to that piece.
- One piece runs at a time. Each is its own ES module (assets/lab/pieces/<id>.js), loaded with import() when it's opened and fully disposed of when it's left: animation frames cancelled, listeners removed, the WebGL or WebGPU context released (WEBGL_lose_context), memory freed. Visiting all eight in a row must leave no contexts behind.
- A pause button on anything that moves by itself. Sound stays off until it's turned on (as now). Reduced motion: a still, with a "Play" button. Low-powered devices get a still or a lighter version; in tests, simulate a normal device (set navigator.hardwareConcurrency to 8 in an init script) rather than weakening the rule.
- Every piece works by touch, and by keyboard where that makes sense, and has a text description for screen readers.

The pieces:
1. **Sketch to site** (#sketch): the hero's shader as a toy. Drop in a screenshot of any website (it never leaves the device) or pick one of ours, watch it become a sketch, paint it back, and save the sketch. Good for: showing a redesign.
2. **Your initials in liquid gold** (#gold): type up to three letters and they're cast in molten gold: a 2D distance field of the letters made on the device, ray-marched as a rounded extrusion, with a slow liquid ripple, a procedural studio environment and real reflections. It turns to face the pointer. Good for: jewellers and luxury brands.
3. **A million specks** (#specks): up to a million gold specks (WebGPU compute with three.js's WebGPURenderer and TSL; where WebGPU isn't available, a WebGL2 version with fewer) that form the name you type, then a laptop, a phone and the Toff T. The pointer or a finger pushes them. Good for: launches and events.
4. **Shape a vase** (#vase): draw half of a vase's outline with the pen and it turns into a 3D vase (the same lathe as Hollis & Pine); choose a glaze; "Save a product shot" downloads a PNG. Good for: makers and shops.
5. **Ink that moves** (#ink): the fluid simulation, sharper and richer; type your name and the pen writes it into the ink. Good for: artisans and studios.
6. **Letters with weight** (#weight): type a word and its letters drop, stack and can be thrown (Rapier physics, self-hosted WebAssembly); on a phone, tilt it to tip them (on iPhone, ask for motion permission with a button). Good for: playful brands.
7. **Your logo in one line** (#oneline): the existing tracer (oneline.js) in the new presentation. Good for: brand moments.
8. **The making of this site** (#making): a timeline across Rounds 01 to 05. For each round, find its commit in the git history, check it out into a temporary worktree in scratch/worktrees/, let the capture script serve it, and capture its first screen at 1440 and 390 and a short scroll strip; then remove the worktree (`git worktree remove`). Scrub through the rounds, with one line for each from rounds/*.md and DECISIONS.md. Good for: showing a client how a site grows.

Old anchors: #build-itself → #making, #particles-band → #specks, #one-line → #oneline, #liquid-gold → #gold, #moving-ink → #ink.

## Appendix C: the Worker (~/Documents/toff-studio-tools/optional-ai/: outside the repo, never committed)

- Back it up first (Phase 6, step 1). Keep /read-sketch and /chat exactly as they behave now (their existing tests must still pass unchanged), the origin check (403 for other websites) and the exact counter SKETCH_COUNTER (20 requests a minute per IP address across every route, counting every request after the origin check and before validation; 429 with CORS headers when over; 503 if the counter can't answer).
- A daily cap as well, so a stranger faking the Origin header can't run up the bill: extend the existing SKETCH_COUNTER class (no new class, no migration) so that an instance with a fixed name per route counts that route's calls per UTC day, and refuse with 429 above a cap (constants in the code, chosen so the worst case stays under about $3 a day; write them in COMPLIANCE.md). The $100 monthly limit on my Anthropic account stays as the last line of defence.
- New routes, all POST with a JSON body:
  - **/agent**: the AI assistants demo, with actions. Body: { business (clinic, cafe, salon or trades), facts (up to 24 { label, text }), history (up to 8 turns, including tool calls and results), question (up to 200 characters) }. The Worker defines each business's tools itself, to the message API from the plan, and never accepts tool definitions from the browser: café add_to_order and set_collection_time; salon find_free_times and hold_booking; clinic find_free_times and book_appointment; trades request_visit and quote_from_list. It streams server-sent events back (text as it's written, and tool calls with their input). The browser carries out each tool call on the page in the frame and sends the result back as a tool_result in its next request.
  - **/concierge**: the studio's assistant. Body: { history (up to 16 turns), brief (the current brief as JSON, at most 4 KB), studio (the facts from settings.js: what's set and what isn't) }. Its system prompt and tools live in the Worker: show_work, open_design_tool, start_pointing, update_brief (one field per call), finish. It streams. Its system prompt holds 7.2's rules.
  - **/brief**: the conversation and the brief in; a tidy brief out, as JSON matching a fixed schema (business, goals, must_haves, look, pins, timing, budget, notes), through structured output.
  - **/design**: a sentence or two in (at most 400 characters); a SiteKit spec out, as JSON matching the schema from the plan, through structured output.
- Models and thinking (checked against Anthropic's documentation in October 2026): use claude-haiku-5-5 for all four routes. Haiku 5.5 and Sonnet 5.5 think by default (adaptive thinking), and thinking tokens count toward max_tokens, so on every Haiku route send "thinking": { "type": "disabled" } (Haiku 5.5 accepts it at its default effort, medium, or anything up to high). Only if a side-by-side test shows Haiku's /design specs are clearly weaker, use claude-sonnet-5-5 for /design: it always thinks ("disabled" is refused), so send "output_config": { "effort": "low", … } and max_tokens of about 8,000, and give /design its own, lower daily cap. If thinking is ever on while tools are in use, send each thinking block back complete and unchanged (type, thinking and signature, even when the thinking text is empty), keep the message history append-only, and never drop empty blocks.
- Other API facts, from the same check: POST https://api.anthropic.com/v1/messages with the headers x-api-key, anthropic-version: 2023-06-01 and content-type: application/json. A tool is { name, description, input_schema }. A tool call comes back as a tool_use block (id, name, input) with stop_reason "tool_use"; the answer goes back in the next user message as a tool_result block (tool_use_id, content), placed first. Sonnet 5.5 and Opus 5.5 refuse a forced tool_choice ("any" or "tool") with a 400; use auto. Structured output needs no beta header: "output_config": { "format": { "type": "json_schema", "schema": … } }, with additionalProperties: false on every object; it doesn't support minLength, maxLength, minimum, maximum, multipleOf or maxItems (minItems only 0 or 1), so enforce those caps in the Worker after parsing. Streaming: "stream": true, with the events message_start, content_block_start, content_block_delta (text_delta and input_json_delta), content_block_stop, message_delta and message_stop. Prompt caching: cache_control { "type": "ephemeral" } on the system prompt and tools (cached from 512 tokens on Haiku 5.5 and Sonnet 5.5). Prices per million tokens: Haiku 5.5 $0.10 in and $0.50 out; Sonnet 5.5 $2 in and $10 out. If anything here disagrees with what the API actually does, the API wins: check the docs and note it in the log.
- Every route: a body of at most 32 KB, caps on every field, max_tokens capped (600 for /agent and /concierge, 1,500 for /brief and 2,000 for /design on Haiku), a 15-second time-out on the call to Anthropic, clean JSON errors (never Anthropic's raw error), nothing logged or stored, and the key only ever read from the secret.
- Tests, in test-round-05-routes.mjs with Anthropic mocked (any fake key in tests is a plain string such as TEST-KEY-NOT-REAL): each route's normal case; streaming passed through; tool calls out and tool results back in; a tool the business doesn't have refused; oversized and malformed input refused; other websites refused; the 21st request in a minute refused; the daily cap refused; an Anthropic error turned into a clean error; thinking disabled on every Haiku request; and no response or log line containing the key. Run it together with test-sketch-ai-worker.mjs and test-sketch-counter.mjs.

## Appendix D: the guard hook (write guard.py first, test it, then settings.json last)

.claude/hooks/guard.py:

```python
#!/usr/bin/env python3
"""Toff Studio guard: a Claude Code PreToolUse hook.

Claude Code runs this before every Bash, Write, Edit, MultiEdit and NotebookEdit call
(see .claude/settings.json). Exit code 0 lets the call run; exit code 2 blocks it, and
the message on stderr is shown to Claude. It enforces the repo's standing rules:

  1. An Anthropic API key never appears in a file, a command or a log.
  2. Files are added to git by name: no "git add .", "-A", "--all", "*", ":/" or "-u",
     and no "git commit -a".
  3. No force pushes and no destructive git (reset --hard, clean -f, checkout/restore of
     everything, stash drop/clear, branch -D, deleting remote branches).
  4. Nothing that was in assets/ before this round is deleted or moved (CLAUDE.md).
     "Before this round" means on the latest backup-before-round-NN branch (or, if
     there is none, tracked in HEAD). Files created since then may be removed.
  5. Pushing main (which publishes the live site) only after the owner has said
     "ship it": the file .claude/ship-approved must exist.
  6. Files are only written inside this repo, ~/Documents/toff-studio-tools, a
     ~/Downloads/toff-... folder, a temporary folder or ~/.claude (so never in the
     Bluebird or Everest folders).

Python 3.9 compatible (the Mac's built-in python3). It never blocks on a payload it
can't read: Claude Code must keep working if anything here goes wrong.
"""
import json
import os
import re
import shlex
import subprocess
import sys

KEY_RE = re.compile(r"sk-ant-[A-Za-z0-9_\-]{8,}")
GIT_GLOBAL_WITH_VALUE = {"-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path"}
ASSET_MSG = ("files that were in assets/ before this round are never deleted or moved (CLAUDE.md). Stop loading a "
             "retired file instead and list it as retired in README.md. (Files you created this round may be removed.)")


def block(msg):
    sys.stderr.write("Blocked by .claude/hooks/guard.py: " + msg + "\n")
    sys.exit(2)


def segments(cmd):
    """Split a shell command on unquoted ; & | and newlines (quote-aware)."""
    out, cur, quote, i = [], [], None, 0
    while i < len(cmd):
        ch = cmd[i]
        if quote:
            cur.append(ch)
            if ch == "\\" and quote == '"' and i + 1 < len(cmd):
                cur.append(cmd[i + 1])
                i += 1
            elif ch == quote:
                quote = None
        elif ch in ("'", '"'):
            quote = ch
            cur.append(ch)
        elif ch == "\\" and i + 1 < len(cmd):
            cur.append(ch)
            cur.append(cmd[i + 1])
            i += 1
        elif ch in ";&|\n":
            out.append("".join(cur))
            cur = []
        else:
            cur.append(ch)
        i += 1
    out.append("".join(cur))
    return [s.strip() for s in out if s.strip()]


def words(segment):
    try:
        return shlex.split(segment, posix=True)
    except ValueError:
        return segment.split()


def strip_prefixes(w):
    """Drop leading env assignments and wrappers such as sudo, env, command, time, nohup."""
    i = 0
    while i < len(w):
        t = w[i]
        if re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", t) or t in ("sudo", "env", "command", "time", "nohup", "exec", "builtin", "("):
            i += 1
            continue
        break
    return w[i:]


def git_parts(w):
    """For a git command, return (subcommand, args, -C directory or None); otherwise None."""
    if not w or os.path.basename(w[0]) != "git":
        return None
    i, cwd_override = 1, None
    while i < len(w) and w[i].startswith("-"):
        opt = w[i]
        if opt in GIT_GLOBAL_WITH_VALUE:
            if opt == "-C" and i + 1 < len(w):
                cwd_override = w[i + 1]
            i += 2
            continue
        i += 1
    if i >= len(w):
        return None
    return w[i], w[i + 1:], cwd_override


def short_flags(args):
    out = set()
    for a in args:
        if a.startswith("-") and not a.startswith("--") and len(a) > 1:
            out.update(a[1:])
    return out


def resolve(path, cwd):
    path = os.path.expanduser(path)
    if not os.path.isabs(path):
        path = os.path.join(cwd, path)
    return os.path.normpath(path)


def inside(path, root):
    root = os.path.normpath(root)
    return path == root or path.startswith(root + os.sep)


def current_branch(cwd):
    try:
        out = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=cwd,
                             capture_output=True, text=True, timeout=5)
        return out.stdout.strip()
    except Exception:
        return ""


def baseline(project):
    """The latest backup-before-round-NN branch, or HEAD if there is none."""
    try:
        out = subprocess.run(["git", "for-each-ref", "--format=%(refname:short)", "refs/heads/backup-before-round-*"],
                             cwd=project, capture_output=True, text=True, timeout=5).stdout.split()
    except Exception:
        out = []
    rounds = []
    for name in out:
        m = re.search(r"round-(\d+)$", name)
        if m:
            rounds.append((int(m.group(1)), name))
    return max(rounds)[1] if rounds else "HEAD"


def protected_asset(path, project):
    """True if path is inside assets/ and it (or anything under it) existed before this round."""
    if not inside(path, os.path.join(project, "assets")):
        return False
    rel = os.path.relpath(path, project).replace(os.sep, "/")
    if any(c in rel for c in "*?[{"):
        return True                     # a pattern we can't resolve safely: protect
    try:
        r = subprocess.run(["git", "ls-tree", "-r", "--name-only", baseline(project), "--", rel],
                           cwd=project, capture_output=True, text=True, timeout=5)
    except Exception:
        return True
    if r.returncode != 0:
        return True                     # can't tell: protect
    return bool(r.stdout.strip())


def check_git(sub, args, cwd, project):
    flags = short_flags(args)
    longs = {a.split("=", 1)[0] for a in args if a.startswith("--")}
    plain = [a for a in args if not a.startswith("-")]

    if sub == "add":
        if any(a in (".", "./", "*", ":/", ":/*", "-A", "--all", "-u", "--update") for a in args) or "A" in flags or "u" in flags:
            block("files are added by name only (never 'git add .', '-A', '--all', '*', ':/' or '-u'). "
                  "Run git status, look at every file, then add the ones you mean by name.")
    elif sub == "commit":
        if "a" in flags or "--all" in longs:
            block("never 'git commit -a'. Add files by name, then commit.")
    elif sub == "push":
        if ("f" in flags or longs & {"--force", "--force-with-lease", "--force-if-includes", "--mirror", "--delete", "--prune"}
                or any(a.startswith("+") or a.startswith(":") for a in plain)):
            block("no force pushes and no deleting remote branches.")
        refspecs = plain[1:]
        to_main = "--all" in longs or any(re.search(r"(^|:)(refs/heads/)?main$", r) for r in refspecs)
        if not refspecs and current_branch(cwd) == "main":
            to_main = True
        if to_main and not os.path.exists(os.path.join(project, ".claude", "ship-approved")):
            block("pushing main publishes the live site. Only after the owner has replied 'ship it': write the date "
                  "and the owner's words into .claude/ship-approved, then push again. Until then push your working branch.")
    elif sub == "reset":
        if "--hard" in longs:
            block("no 'git reset --hard'. Ask the owner first.")
    elif sub == "clean":
        if "f" in flags or "--force" in longs:
            block("no 'git clean -f'. Ask the owner first.")
    elif sub in ("checkout", "restore"):
        if any(a in (".", "./", ":/", "*") for a in args):
            block("no discarding every change at once. Restore single files by name, and only your own changes.")
    elif sub == "stash":
        if plain[:1] and plain[0] in ("drop", "clear"):
            block("no 'git stash drop' or 'git stash clear'.")
    elif sub == "branch":
        deleting = "D" in flags or "d" in flags or "--delete" in longs
        if "D" in flags or (deleting and any(p.startswith("backup-") for p in plain)):
            block("branches aren't force-deleted, and backup branches are always kept. Ask the owner first.")
    elif sub in ("rm", "mv"):
        sources = plain[:-1] if sub == "mv" and len(plain) > 1 else plain
        if any(protected_asset(resolve(a, cwd), project) for a in sources):
            block(ASSET_MSG)


def check_bash(cmd, cwd, project):
    for seg in segments(cmd):
        w = strip_prefixes(words(seg))
        if not w:
            continue
        prog = os.path.basename(w[0])
        if prog == "cd":
            if len(w) > 1 and not w[1].startswith("-"):
                cwd = resolve(w[1], cwd)
            continue
        g = git_parts(w)
        if g:
            sub, args, cwd_override = g
            check_git(sub, args, resolve(cwd_override, cwd) if cwd_override else cwd, project)
            continue
        if prog in ("rm", "unlink", "rmdir", "mv", "srm", "shred", "trash"):
            targets = [a for a in w[1:] if not a.startswith("-")]
            if prog == "mv" and len(targets) > 1:
                targets = targets[:-1]          # the sources; the last word is the destination
            if any(protected_asset(resolve(a, cwd), project) for a in targets):
                block(ASSET_MSG)
        if prog == "find" and ("-delete" in w or "-exec" in w or "-execdir" in w):
            roots = []
            for a in w[1:]:
                if a.startswith("-") or a in ("(", "!"):
                    break                           # the expression starts here
                roots.append(resolve(a, cwd))
            roots = roots or [cwd]
            assets = os.path.join(project, "assets")
            # a root inside assets that holds original files, or a root (like the repo itself) that contains assets/
            if any(protected_asset(r, project) or (inside(assets, r) and protected_asset(assets, project)) for r in roots):
                block("no bulk deleting or rewriting anywhere that holds files that were in assets/ before this round. "
                      "Run it on a narrower folder (for example scratch/ or a folder you created this round).")


def check_write(path, cwd, project):
    if not path:
        return
    p = resolve(path, cwd)
    home = os.path.expanduser("~")
    allowed = [project, os.path.join(home, "Documents", "toff-studio-tools"), os.path.join(home, ".claude"),
               "/tmp", "/private/tmp", "/var/folders", "/private/var/folders"]
    if os.environ.get("TMPDIR"):
        allowed.append(os.environ["TMPDIR"])
    downloads = os.path.join(home, "Downloads")
    toff_download = inside(p, downloads) and os.path.relpath(p, downloads).split(os.sep)[0].startswith("toff-")
    if not toff_download and not any(inside(p, os.path.normpath(r)) for r in allowed):
        block("files are only written inside this repo, ~/Documents/toff-studio-tools, ~/Downloads/toff-…, a temporary folder "
              "or ~/.claude (the Bluebird and Everest folders, and everything else on the Mac, are read-only). Write it inside the repo "
              "(scratch files go in scratch/).")


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    if not isinstance(data, dict):
        sys.exit(0)
    tool = data.get("tool_name") or ""
    inp = data.get("tool_input") or {}
    cwd = data.get("cwd") or os.getcwd()
    project = os.environ.get("CLAUDE_PROJECT_DIR") or cwd

    if KEY_RE.search(json.dumps(inp)):
        block("this contains something that looks like an Anthropic API key. The key lives only in the Cloudflare "
              "Worker's secret: never in a file, a command, a log or a message.")
    if tool == "Bash":
        check_bash(inp.get("command") or "", cwd, project)
    elif tool in ("Write", "Edit", "MultiEdit"):
        check_write(inp.get("file_path"), cwd, project)
    elif tool == "NotebookEdit":
        check_write(inp.get("notebook_path"), cwd, project)
    sys.exit(0)


if __name__ == "__main__":
    main()
```

.claude/settings.json:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Write|Edit|MultiEdit|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "test -f \"$CLAUDE_PROJECT_DIR/.claude/hooks/guard.py\" || exit 0; python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/guard.py\""
          }
        ]
      }
    ]
  }
}
```

## Appendix E: the subagents (write each file exactly, into .claude/agents/)

.claude/agents/site-builder.md:

```markdown
---
name: site-builder
description: Senior creative developer for the Toff Studio portfolio. Builds one self-contained part (a concept site in work/<slug>/, or Lab pieces in assets/lab/pieces/) from a complete brief, tests it with real screenshots, and reports back. Use for round 05's parallel build phases.
model: inherit
---
You are a senior creative developer at Toff Studio, a small web design studio in London. You build one part of the studio's portfolio from the brief you're given, to a standard an Awwwards jury would notice and a small business owner would pay for.

How you work:
- Read the brief to the end first. Work only in the folder it names. You may read shared code (assets/shared/, vendor/) but don't change it: ask the lead for changes in your report.
- Plain HTML, CSS and JavaScript (ES modules), no bundler, everything self-hosted.
- Design first: decide the art direction from the brief and write it as a short comment at the top of your main CSS file. Then build in passes: structure; layout at 390 and 1440; type and colour; the signature moment; the features; motion; polish.
- Look at your work. Write a Playwright (Python) script that starts its own web server for the repo on a free port (a ThreadingHTTPServer in a thread), takes viewport screenshots while scrolling at 390, 820, 1024 and 1440, and stops the server when it's done. Save everything in scratch/<your part>/ inside the repo, never in /tmp, and open the screenshots. Use plain Python with playwright.sync_api, not pytest-playwright or `npx playwright test` (they empty their output folder on every run). Fix whatever looks wrong before you report. Numeric checks are not enough.
- Don't leave background tasks or servers running when you finish, and don't run Lighthouse (the lead runs it, one page at a time).
- Accessibility and performance are part of the job: WCAG 2.2 AA, full keyboard use, reduced motion, and the budgets in the brief.
- The motion rules: on laptops, scroll-driven parts start only when on screen and only ever move forward; on phones they play by themselves when reached; nothing reverses, replays, snaps back or freezes; no pinning; reduced motion shows everything finished; automatic motion stops for good when the visitor takes over.
- Never: add files to the repo outside your folder (apart from scratch/<your part>/; npm installs for fonts or libraries happen in a temporary folder), delete or move anything you didn't create, run git commands, invent reviews or claims, load anything from another website at run time, or write an API key anywhere.
- Your report: what you built (sections, features, signature moment), the files, the checks you ran and their results, where your screenshots are, the photos you'd add (subject, file name, size), credits lines for fonts and libraries, and anything you're unsure of. Precise and brief.
```

.claude/agents/design-critic.md:

```markdown
---
name: design-critic
description: A demanding Awwwards juror and art director who reviews screenshots of the Toff Studio site cold, scores it and lists the fixes that matter most. Use after a build pass, giving it only screenshots and the visible text, never code.
tools: Read, Glob
model: inherit
---
You are an Awwwards juror and a senior art director who has judged hundreds of studio portfolios. You're reviewing a small London web studio's site from screenshots only (viewport frames taken while scrolling, at phone and laptop sizes) and its visible text. You haven't seen how it was made, and you don't care.

Score it out of 10 for Design, Usability, Creativity and Content, as Awwwards does, with one sentence for each score. Then list the ten most important problems, most important first, each with: where it is (the screenshot's file name and the part of it), what's wrong, and exactly what to change.

Look for: weak hierarchy; cramped or dead space; inconsistent spacing or type; anything that looks templated or AI-made; effects that don't earn their place; unclear next steps; things cut off, overlapping or hidden behind fixed elements; weak phone layouts; low contrast; anything a business owner would find confusing.

Praise only what is genuinely exceptional, in one line at the end. Be specific and blunt: vague notes about taste are useless.
```

.claude/agents/first-time-visitor.md:

```markdown
---
name: first-time-visitor
description: A non-technical small business owner seeing the Toff Studio site for the first time. Reviews screenshots and says what they understand, what confuses them and whether they'd get in touch. Use after a build pass.
tools: Read, Glob
model: inherit
---
You own a small business in London (choose one at the start and stay in character: a café, a hair salon or a physiotherapy clinic), and you're looking for someone to make your website. You aren't technical. You're looking at a web studio's site as screenshots (phone first, then laptop), in order, as if you were scrolling.

For each screen, say in a sentence or two what you think it's telling you, whether you know what to do next, and anything confusing, too clever or hard to read.

Then answer, plainly and as yourself: What does this studio do? Would you trust them with your business? What would stop you getting in touch? What did you like most? Which screen would you show a friend?
```

.claude/agents/ai-tells-auditor.md:

```markdown
---
name: ai-tells-auditor
description: Finds anything on the Toff Studio site that looks AI-generated or template-made, from screenshots and visible text. Use after a build pass.
tools: Read, Glob
model: inherit
---
You audit websites for the tells that make design-literate visitors think "AI made this" or "template". You're given screenshots (phone and laptop) and the visible text of each page.

Check every screenshot and every line against this list, and report each hit with the screenshot's file name, where it is and how to fix it:
1. Labels or eyebrows above headings; a heading that repeats its label.
2. Spaced-out capital labels (uppercase with letter-spacing).
3. 01 / 02 / 03 numbering without a real sequence; giant numerals.
4. Identical card grids (icon, heading, text, three or four in a row); symmetrical triptychs.
5. Hero metric rows (a big number, a small label, repeated).
6. Slogans and forced contrasts ("Not X. Y.", "Build faster. Ship smarter."), slogan triplets, stock words (bespoke, seamless, elevate, effortless, world-class, supercharge, unlock, delve, crafted), em dashes, full stops on headings, chirpy filler.
7. Glows, radial halos, glassmorphism, backdrop blur, gradient text, neon, decorative grid backgrounds, floating particles, a hairline border with a big soft shadow, thick side-stripe borders.
8. Decorative motion: pulsing, bouncing, blinking, marquees, elastic easing, images that zoom on hover.
9. Fake window chrome (three dots) on anything that isn't a drawing of a window.
10. Every section the same shape (heading, paragraph, grid).
11. Effects with no job: they don't show the work, explain the process or let the visitor try something.
12. Pill-shaped buttons mixed with square ones; too many colours; colour bands that change every section.

Don't flag these: they're deliberate, and they do a job. The Lab page's experiments (particles, liquid gold, moving ink and the rest are the exhibits); each concept site's one named signature moment (for example the restaurant's steam, the vase in 3D); a shop's product grid; the case studies' device frames showing real screenshots. Do flag any of those things if they appear anywhere else, purely as decoration.

End with a verdict: how human-made it looks, out of 10, and the three changes that would raise that score most.
```

.claude/agents/a11y-perf-auditor.md:

```markdown
---
name: a11y-perf-auditor
description: Checks the Toff Studio site's accessibility and speed with real tools (axe, Lighthouse, Playwright) and reports each problem with the file and the fix. Use in the quality phase.
tools: Read, Glob, Grep, Bash
model: inherit
---
You check web pages for accessibility (WCAG 2.2 AA) and performance with tools, not guesses. Serve the repo yourself with compression, the way GitHub Pages does: start `python3 tools/serve.py <a free port> --gzip` detached (nohup … &), note its process id, and stop it when you finish. Keep everything you write in scratch/audit/ inside the repo.

Run: axe-core in Playwright on every page you're given, at 390 and 1440; a keyboard pass (Tab through everything: the order, a visible focus ring, no traps, Escape on dialogs and menus); computed colour contrast for every text style; tap-target sizes on phones; reduced motion; Lighthouse (npx lighthouse, desktop and mobile, one page at a time; if Chrome isn't installed, set CHROME_PATH to Playwright's Chromium) for performance, accessibility, best practices and SEO (the concept sites fail the indexing check on purpose, because they're noindex); and what loads before any interaction (compressed bytes, requests, JavaScript), the largest contentful paint element, and the sources of layout shift.

Don't change any site files. Report each problem with the page, the element (a selector), the rule or metric, the measured value and the target, and the exact fix (the file, and what to change). Order them by impact. Put the scores and a one-line summary at the top.
```

## Appendix F: tests and budgets

`python3 tests/run_all.py` (plain Python with playwright.sync_api, no pytest-playwright) starts its own web server, runs every suite, prints "<suite>: N passed / M total" for each and a total, stops the server, and exits with an error if anything fails. Every test blocks (or mocks) the Worker's address, except the few live checks in Phase 6.
- **pages**: every page loads at 390 and 1440 with no console errors, no failed requests or responses of 400 and above (icons included), nothing from other websites, and no sideways scrolling at 320 and 390; one h1; a title, description and link-preview tags; every internal link resolves; external links open safely (rel="noopener"); the old addresses in section 7 land on the right part.
- **motion**: on laptops, scroll-driven parts start only on screen and only ever move forward (scroll down, then up: nothing reverses); on phones they play by themselves; nothing is pinned (nothing but the top bar, the concierge button and the concept ribbon is fixed or sticky while its section scrolls past); a fresh visit opens at the top; Back with and without bfcache, tested properly (Playwright switches bfcache off by default and the old headless browser never uses it, so remove the default argument --disable-back-forward-cache, launch with channel "chromium", call go_back with wait_until "commit", and confirm the restore really came from bfcache with pageshow's persisted); reduced motion shows everything finished; pixel checks find no ink outside what has been drawn.
- **hero**: painting increases the revealed area and never decreases it; it finishes by itself; "Another site" swaps without errors; with WebGL switched off, the still sketch turns into the finished screenshot; reduced motion shows the finished site; the still sketch is requested with fetchpriority="high"; the home page requests nothing from vendor/three or assets/lab.
- **ai**: with the Worker blocked, every AI feature answers from the page and says so; with a mocked stream, a tool call changes the page in the frame and shows its card; the message API ignores other origins and unknown actions; the concierge never sends a name, email address or phone number to the Worker (inspect every request); the brief downloads; Design yours works in all three modes, and Describe falls back offline; live answers stop after 8 per visit.
- **concepts**: each site's features work end to end; the ribbon is on every page and hidden with ?embed; no reviews or ratings; every phone number is in the drama range or one of 999, 111 and 0800 111 999.
- **lab**: every piece opens, runs, pauses and is disposed of (after visiting all eight, no WebGL contexts are left beyond the current one); deep links and the old anchors work; the low-power fallback shows when hardwareConcurrency is 2.
- **a11y**: axe on every page (no serious or critical issues); the keyboard reaches every control in a sensible order, with a visible focus ring; computed contrast passes AA; tap targets are at least 44px on phones; every image has alt text and every canvas a text alternative.
- **copy**: no em dashes in visible text; no stock words (bespoke, seamless, elevate, effortless, world-class, supercharge, unlock, delve, crafted); no uppercase text with letter-spacing on the studio's pages; no full stops at the end of headings.
- **performance** (skipped in CI): in a headed browser on the Mac, so the real graphics chip is used, the median frame is under 17.5 ms and the 95th percentile under 25 ms while the hero paints and the case films play; page weight (compressed) is within the budgets below.

Budgets (measured compressed, through tools/serve.py --gzip):
- The home page before any interaction: at most 900 KB on a laptop and 700 KB on a phone, with at most 150 KB of JavaScript. Everything else loads when it's near or when it's used.
- Lighthouse: performance at least 95 on desktop and 90 on mobile; accessibility and best practices 100; SEO 100 (on the concept sites, apart from the indexing check, which noindex fails on purpose); largest contentful paint under 2 seconds on desktop and 2.5 seconds on mobile, whichever element it is; layout shift under 0.02.
