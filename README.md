# Toff Studio portfolio

The website of Toff Studio, a small web design studio in London. Plain HTML, CSS and JavaScript (ES modules), with no build step and no bundler, hosted on GitHub Pages at https://toffzzzz.github.io/Toff-Designs/. Round 05 (the showcase rebuild) was built on the `round-05` branch and goes live only when the owner replies "ship it".

The design values are in DESIGN.md, every decision in DECISIONS.md, the quality checks in CHECKLIST.md, licences in CREDITS.md, what the site sends and to whom in COMPLIANCE.md (with the start of the privacy policy in privacy-policy-draft.md), the photos still wanted for the concept sites in IMAGE-PROMPTS.md, and a ready Awwwards submission in AWWWARDS.md. Hand-over files (screen recordings, contact sheets, Lighthouse summaries, the Awwwards images) go in `handover/`, which is not committed. Each round's full prompt is in `rounds/` (Round 05's plan and log are `rounds/round-05-plan.md` and `rounds/round-05-log.md`).

## The pages

| Address | What it is |
|---|---|
| `index.html` | The home page, in this order: the top bar; the hero ("We sketch it. Then we build it.", with one of our sites drawn as a sketch you paint back to the finished site); Recent work (the pen writes "Bluebird Wellness" and "Everest Climate Solutions" beside each case film) and the five concept sites as an editorial list; the AI chapter ("Your website can answer your customers for you": assistants that act on the business's real site in a frame); Design yours (Pick, Sketch or Describe a site, drawn by SiteKit); the Lab band; How we work on cream paper, with What's included; Kind words and About (hidden until real); Start a project (the pen writes "Tell us what you need" above the concierge); the footer. |
| `work/bluebird/`, `work/everest/` | The two case studies: what the business needed, the sketch, what we built, the highlights as moving captures, and the live site (Everest: "Live site coming soon" until `links.everest` is set). |
| `work/saltmarsh/`, `work/morrow/`, `work/atelier-wren/`, `work/hollis-and-pine/` (with `product.html` and `checkout.html`), `work/hart-and-sons/` | Five complete concept sites for made-up businesses. Each has its own look, one signature moment and working demo features, the concept ribbon at the bottom, and `noindex` so they never turn up in search results. Atelier Wren's lookbook has a page per look in `work/atelier-wren/looks/`. |
| `assets/home/demo/linden.html` | Linden Clinic, a small booking page used only inside the AI demo's frame (`noindex`). |
| `lab.html` | The Lab, an exhibition of eight experiments: Sketch to site, Your initials in liquid gold, A million specks, Shape a vase, Ink that moves, Letters with weight, Your logo in one line, The making of this site. `lab.html#<id>` opens one directly. |
| `404.html` | "This page is closed". GitHub Pages shows it for any address that doesn't exist. It works out its base from the address (`/Toff-Designs/` on GitHub Pages, `/` at the root of a domain), so it keeps working when the site moves to its own domain. |

Old addresses keep working: the home page's old section links (#opening, #ai-assistants, #selected-work, #try-it, #playground, #draw-your-site, #one-line, #what-we-build, #lab-teaser, #how-it-works, #included, #testimonials, #about, #contact, #enquiry) land on the nearest new part, and the Lab's old anchors (#build-itself, #particles-band, #one-line, #liquid-gold, #moving-ink) open the matching piece.

**The `?unfinished` switch:** details that aren't real yet are marked `data-unfinished` and follow `showPlaceholders` in settings.js (now `false`, so they're hidden, as are Kind words and About). Add `?unfinished` to any address (for example http://localhost:8000/?unfinished) to see everything that's still missing.

## Preview it

```
python3 tools/serve.py 8000
```

Then open http://localhost:8000 on the Mac.

**On a phone on the same Wi-Fi:** find the Mac's Wi-Fi address with `ipconfig getifaddr en0` and open `http://<that address>:8000` on the phone. Everything works, but the AI features answer from the page instead of live: the Worker only answers the addresses it knows (the live site and http://localhost:8000), so it refuses the Mac's Wi-Fi address and each demo falls back quietly, as designed.

**`--gzip`:** `python3 tools/serve.py 8000 --gzip` compresses text files (HTML, CSS, JavaScript, JSON, SVG, WebAssembly) the way GitHub Pages does. Use it when measuring page weight or running Lighthouse, so the numbers match the live site.

The server sends `Cache-Control: no-cache` (not `no-store`, which would stop the browser's back/forward cache) and serves the folder on every network interface.

## How the site is built

### Code layout

```
index.html, lab.html, 404.html     the studio's pages
settings.js                        every adjustable value (see "Settings" below)
assets/shared/                     shared by every studio page
  tokens.css                       colours, type, spacing, shape and motion tokens; fonts; base styles; the grain;
                                   the cream paper; the buttons; the gold-line page transition
  boot.js                          straight after settings.js: settings onto the CSS variables, js-motion,
                                   show-unfinished, a fresh visit opens at the top
  motion.js                        the motion rules for every part (ported from the handwriting engine)
  shell.js, shell.css              top bar, phone menu, skip link, footer, floating-button slot, page transitions
  sitekit.js, sitekit.css          SiteKit: draws a small website from a spec (Design yours; Contract B)
  sketch-shader.js                 SketchStage: the hero's WebGL2 sketch, also the Lab's Sketch to site
  embed-api.js                     Contract A: the message API between the AI demo and the sites in its frame
  ribbon.js, ribbon.css            the concept ribbon
assets/home/                       the home page and the case studies
  home.js, home.css                puts the home page together and loads each part when it's near
  hero.js                          the stage, the brush, the auto-paint, "Another site"
  films.js                         the case films (frame sequences)
  concepts.js                      the concept list and its preview window
  agent.js, agent.css              the AI chapter (uses assets/studio/aiassist.js for its on-page answers)
  design-yours.js, .css            Design yours (uses SiteKit; Sketch loads assets/studio/drawsite.js)
  concierge.js, .css               the concierge (uses assets/studio/assistant.js, brief.js, snapshot.js)
  case.js, case.css                the case studies
  demo/linden.*                    the Linden Clinic page for the AI demo's frame
  captures/                        hero screenshots and still sketches, case films, concept previews, the
                                   Lab band still; captures.json lists them (made by tools/capture/)
assets/lab/                        the Lab: lab.js, lab.css, stills/, and one module per piece in pieces/
assets/handwriting/                the handwriting engine (handwriting.js) and its generated line-data.js
assets/studio/                     parts kept from rounds 03 and 04 and loaded from where they are:
                                   aiassist.js, assistant.js, brief.js, snapshot.js, drawsite.js,
                                   inkwriter.js and inkwriter-data.js, oneline.js, the fonts, the case
                                   screenshots and sketches, the playground photos, the Lab's sample logos
assets/everest/                    the air conditioner pictures (Everest's cooling scene on its case study)
work/<slug>/                       each concept site and case study, self-contained (its own css/, js/,
                                   fonts/ and img/)
vendor/three/                      three.js r186 (Hollis & Pine's vase and the Lab only)
vendor/rapier/                     Rapier physics (the Lab's Letters with weight only)
tests/                             the test suite (see "Tests")
tools/                             serve.py, capture scripts, the handwriting builder, add-images.py
```

### What loads when

**Home page.** In the HTML, before anything is drawn: `tokens.css`, `shell.css`, `home.css`, `settings.js`, `boot.js`, two preloaded fonts (Cormorant Garamond and Work Sans), and the hero's still sketch (`fetchpriority="high"`, sized, so nothing shifts). After first paint: `home.js` with the shell, `motion.js`, `hero.js` and `sketch-shader.js` (raw WebGL2), then the first site's finished screenshot as the texture. Then, each when its part is within about one and a half screens: the pen (`handwriting.js` and `line-data.js`, also on the first scroll), the case films and their frames, the concept list's stills (preview frames on first hover), the AI chapter (`agent.js`, `aiassist.js`, and the frame's page 600px ahead), Design yours (`design-yours.js`, SiteKit), the Lab band still, InkWriter for "Tell us what you need", and the concierge (also on the first "Start a project" or the first scroll past the hero). Only when used: `drawsite.js` when Sketch is chosen; `assistant.js`, `brief.js` and `snapshot.js` when the concierge first opens; the Worker only when a visitor asks something. **Never on the home page:** `vendor/three`, `vendor/rapier` or anything in `assets/lab/`.

**Case studies.** `tokens.css`, `shell.css`, `case.css`, `settings.js`, `boot.js` and `case.js`; their screenshots and captures load lazily below the first screen.

**The Lab.** `tokens.css`, `shell.css`, `lab.css`, `settings.js`, `boot.js`, `lab.js` and an import map for three.js. The index shows the stills; a piece's module (`assets/lab/pieces/<id>.js`) is imported only when it is opened, and disposed of when you leave it. three.js loads only for Shape a vase and A million specks; Rapier only for Letters with weight.

**Concept sites.** Each loads only its own CSS, fonts and scripts, plus `assets/shared/ribbon.css` (and `ribbon.js`, `motion.js` or `embed-api.js` where it uses them). Hollis & Pine loads three.js only when the vase comes near. Saltmarsh's steam runs in a worker.

## Settings (settings.js)

Every adjustable value lives in `settings.js`, each with a plain comment. Change it there and nowhere else, then update DESIGN.md to match.

| Setting | What it does | Default |
|---|---|---|
| `topbar.hideOnScroll` | true hides the top bar while scrolling down and brings it back on the way up; false keeps it (and "Start a project") on screen | `false` |
| `studioName` | The studio's name, wherever it's written | `'Toff Studio'` |
| `copyrightYear` | The year in the footer's © line | `2026` |
| `location` | Where the studio is (footer, structured data) | `'London'` |
| `siteUrl` | The site's public address, with the closing slash: canonical links, link previews, JSON-LD and sitemap.xml are built from it. Change it once the studio has its own domain | `'https://toffzzzz.github.io/Toff-Designs/'` |
| `email` | The studio's email, shown in the footer once set | `''` (hidden) |
| `showPlaceholders` | true shows clearly marked placeholders and every `data-unfinished` detail; false hides both with no gaps. `?unfinished` always shows everything | `false` |
| `links.bluebird` | Bluebird Wellness's live site | `'https://toffzzzz.github.io/bluebird-wellness/'` |
| `links.everest` | Everest Climate Solutions' live site; empty shows "Live site coming soon" with no link | `''` |
| `social` | Social links for the footer, e.g. `[{ label: 'Instagram', url: '…' }]`; each appears once filled in | `[]` |
| `legal.privacyPolicyUrl`, `legal.termsUrl`, `legal.cookiesUrl` | The legal pages; each link appears once set. The enquiry can only go live once `privacyPolicyUrl` is set | `''` each |
| `company.name`, `company.number`, `company.address`, `company.vat` | Company details for the footer; each appears once set | `''` each |
| `process.timeframes` | How long each step of How we work takes, in order (Discovery call, Sketch, Build, Launch & care), shown as "How long: …"; empty is hidden | `['', '', '', '']` |
| `testimonials` | Kind words: one real quote per project (`project`, `quote`, `name`, `business`). Never invented; the section stays hidden until one has a quote | Bluebird Wellness and Everest Climate Solutions, both empty |
| `contact.replyTime` | Shown after "We'll reply within", e.g. 'two working days'; empty is hidden | `''` |
| `chatMode` | `'demo'` sends and stores nothing. `'live'` sends enquiries to `formEndpoint`, and only switches on once `legal.privacyPolicyUrl` and `formEndpoint` are both set | `'demo'` |
| `formEndpoint` | Live mode only: the form service's address (e.g. Formspree) | `''` |
| `colors.bg` | The midnight page | `'#0E1628'` |
| `colors.ink` | Cream: lines, links, outlines (change `handwriting.color` with it) | `'#F1E3C6'` |
| `colors.text` | Headings and body text | `'#F6F0E4'` |
| `colors.slate` | Quiet text, placeholders | `'#A7AFC2'` |
| `colors.accent` | Gold: fine rules, the one solid button, selected states, the focus ring | `'#D8AC5F'` |
| `colors.tint` | Raised areas: inputs, chips, a selected choice | `'#1A2541'` |
| `colors.lineShadow` | The gold under-shadow on every line (change `handwriting.shadow.color` with it) | `'rgba(216, 172, 95, 0.38)'` |
| `colors.footer` | Deep midnight: the footer, the AI band, the hero stage's paper | `'#0A101E'` |
| `colors.error` | Form messages when something is missing | `'#F2A7A0'` |
| `colors.hairline` | Fine gold rules | `'rgba(216, 172, 95, 0.22)'` |
| `colors.paper` | The cream-paper section (How we work) | `'#F1EADC'` |
| `colors.paperText` | Text on paper | `'#141C2E'` |
| `colors.paperQuiet` | Quiet text on paper | `'#4C5468'` |
| `colors.paperLine` | Lines on paper only (too light for text) | `'#8F6A2A'` |
| `colors.paperAccent` | Gold-ish text on paper | `'#7E5E24'` |
| `opening.*` | Retired: the round 02 to 04 opening's timings (`sketchSeconds` 2.3, `overlap` 0.45, `pressAt` 0.25, `revealDuration` 1.25, `lineDuration` 0.9). No Round 05 page reads them | as listed |
| `handwriting.color` | The pen's ink (keep the same as `colors.ink`) | `'#F1E3C6'` |
| `handwriting.strokePx` | Line thickness on screen | `{ desktop: 3.2, mobile: 2.6 }` |
| `handwriting.shadow` | The gold under-shadow: colour, how far below the line, how much wider, blur (keep 0) and how far it trails the pen | `{ color: 'rgba(216,172,95,0.30)', offsetPx: 3.5, extraWidthPx: 1.2, blurPx: 0, lag: 0.22 }` |
| `handwriting.writeStart`, `writeEnd` | Laptops: a name starts writing this far down the screen, and has finished by this far (0 top, 1 bottom) | `0.86`, `0.56` |
| `handwriting.tailTip`, `entryTip` | Laptops: where the pen sits while the last line runs down, and while the line runs in from the top | `0.62`, `0.7` |
| `handwriting.ease` | Laptops: how closely the pen follows the scroll, in seconds | `0.12` |
| `handwriting.maxSpeedPx` | Laptops: the pen never draws faster than this many pixels of line a second | `3400` |
| `handwriting.autoSpeedPx` | Parts that draw themselves (coming back, jumps), in pixels a second | `820` |
| `handwriting.phoneSpeedPx` | Phones: pen speed, in pixels a second | `620` |
| `handwriting.phoneTrigger` | Phones (and every part that plays by itself): starts when it reaches this far down the screen | `0.82` |
| `handwriting.breakpoint` | Screens narrower than this many pixels use the phone layout and play parts by themselves | `700` |
| `handwriting.jumpScreens` | A scroll bigger than this many screens at once counts as a jump | `1.2` |
| `handwriting.settleMs` | Wait this long after loading for the browser to restore the scroll position | `450` |
| `handwriting.minLinkScroll` | Laptops: each joining line gets at least this share of the scroll | `0.38` |
| `handwriting.introOnLoad` | false: the first part writes as you scroll to it | `false` |
| `showcase.ease` | Retired: how the round 02 to 04 pictures followed their phrase | `0.28` |
| `stylePicker.drawSeconds` | Retired: the round 02 to 04 style picker's icons | `1.1` |
| `reveal.durationMs`, `reveal.risePx` | Retired: the round 03 and 04 fade-ups (Round 05 uses `motion.revealMs` and `motion.riseMediumPx`) | `600`, `12` |
| `motion.easeOut`, `easeInOut`, `easeIn` | The one family of easings: arriving, moving, leaving | `'cubic-bezier(.22, 1, .36, 1)'`, `'cubic-bezier(.83, 0, .17, 1)'`, `'cubic-bezier(.64, 0, .78, 0)'` |
| `motion.pressMs`, `quickMs`, `baseMs`, `revealMs`, `moveMs`, `lineMs` | Durations: pressed states, hover and chips, menus and panels, fade-ups, large travels, the gold line dropping from the stage | `100`, `180`, `280`, `560`, `900`, `1400` |
| `motion.riseSmallPx`, `riseMediumPx`, `riseLargePx` | Distances things rise into place | `8`, `16`, `32` |
| `motion.staggerLinesMs`, `staggerRowsMs` | Between the headline's lines; between list rows (at most five) | `90`, `60` |
| `hero.idleMs` | If the visitor doesn't paint for this long, a brush paints the site in by itself | `2500` |
| `hero.autoPaintMs` | How long that brush takes | `2000` |
| `hero.doneAt` | Once this share of the stage is painted, the finished site is shown and drawing stops | `0.98` |
| `ai.workerBase` | The Worker's address, without a closing slash | `'https://toff-sketch-ai.toffdesigns.workers.dev'` |
| `ai.chatEndpoint` | Round 04's chat route (no Round 05 page uses it) | `null` (workerBase + `/chat`) |
| `ai.readSketchEndpoint` | Design yours, Sketch: reading the drawing | `null` (workerBase + `/read-sketch`) |
| `ai.agentEndpoint` | The AI demo that acts on the business's site | `null` (workerBase + `/agent`) |
| `ai.conciergeEndpoint` | The concierge ("Plan with us") | `null` (workerBase + `/concierge`) |
| `ai.briefEndpoint` | Writing the brief's summary | `null` (workerBase + `/brief`) |
| `ai.designEndpoint` | Design yours, Describe | `null` (workerBase + `/design`) |
| `ai.maxLiveAnswers` | At most this many live answers per visit, counted separately for the AI demo, the concierge and Describe (a tool round trip is part of one answer) | `8` |
| `ai.firstWordTimeoutMs` | If the first word hasn't arrived after this long, answer from the page instead | `12000` |
| `lab.lowPowerCores` | A device reporting this many processor cores or fewer counts as slower: each Lab piece opens as a still with Play, then runs a lighter version | `4` |
| `lab.lowPowerMemoryGB` | …or this much memory or less (not every browser reports it; Save-Data also counts) | `4` |

Each `ai.*Endpoint` left as `null` becomes `workerBase` plus its route (the small function at the end of settings.js does this). A full address replaces it; `''` switches that feature to answering from the page only.

### Filling in what's missing

| What | Where | Example |
|---|---|---|
| Your email | `email` | `'hello@toffstudio.com'` |
| How long each step takes | `process.timeframes` | `['30 minutes', 'About a week', '3–4 weeks', 'Ongoing']` |
| Reply time | `contact.replyTime` | `'two working days'` |
| A client's quote | `testimonials`: the client's own words in `quote`, their name in `name` | never invented |
| Everest's live site | `links.everest` | `'https://…'` (replaces "Live site coming soon") |
| Legal pages | `legal.privacyPolicyUrl`, `termsUrl`, `cookiesUrl` | `'privacy.html'` |
| Company details | `company.name`, `number`, `address`, `vat` | `name: 'Toff Studio Ltd'` |
| About the studio | the text in `index.html` (`#about`, marked `data-about`); it shows once `showPlaceholders` is true or the hiding is removed in `assets/home/home.js` | your own words |
| Prices | the hidden price line in How we work (`index.html`, `data-unfinished`); fill it in and remove its `data-unfinished` | only when you have prices |
| Your own domain | `siteUrl` | `'https://toffstudio.co.uk/'` |

### Going live with the enquiry

The concierge's contact step and the short form ("Prefer a form? →") are in demo mode (`chatMode: 'demo'`): they send and store nothing and say so. To receive enquiries, set `chatMode: 'live'`, `formEndpoint` and `legal.privacyPolicyUrl`; the enquiry stays in demo mode until both the endpoint and the privacy policy are set. The site also needs the standard pages in COMPLIANCE.md ("Still needed before launch") first.

## How the AI works

All the AI goes through one Cloudflare Worker, `toff-sketch-ai` (https://toff-sketch-ai.toffdesigns.workers.dev), which lives outside the repo in `~/Documents/toff-studio-tools/optional-ai/` with its own tests. The Anthropic API key is only in the Worker's secret, never in the site. Every route uses Claude Haiku 5.5 (`claude-haiku-5-5`) with thinking switched off. The site calls the Worker only when a visitor uses an AI feature, and nothing else on the site talks to another website.

| Route | Used by | What the page sends | Limits | Without it |
|---|---|---|---|---|
| `/agent` | The AI demo (Café, Salon, Clinic, Plumber) | The business key, its facts as the visitor has edited them (up to 24, each label up to 40 and text up to 200 characters), up to 8 messages of the conversation including tool calls and their results, and the question (up to 200 characters). The Worker defines each business's two tools itself and never accepts tools from the page | Streams the answer; up to 600 tokens; at most 3 tool round trips per question, counted as one of 8 live answers per visit; 12 s to the first word; 300 calls a day | The same actions run from on-page rules (`aiassist.js`), with the same confirmation cards, and the header says so |
| `/concierge` | The concierge, inline and in its panel | Up to 16 messages of the conversation (each up to 1,500 characters), the brief so far (up to 4 KB: labels, notes and summaries only, never pictures or contact details), and the studio's facts from settings.js (name, location, timeframes, prices, reply time; empty means not set) | Streams; up to 600 tokens; 8 live answers per visit; 12 s to the first word; 150 calls a day | A scripted version of the same flow on the page (`assistant.js`), and the header says so |
| `/brief` | The concierge's summary at the end | The conversation's text (up to 16 messages) and the brief | Structured output; up to 1,500 tokens; 40 calls a day | The summary is written on the page |
| `/design` | Design yours, Describe | The visitor's sentence (1 to 400 characters) | Structured output (a SiteKit spec); up to 2,000 tokens; 8 live answers per visit; 120 calls a day | `SiteKit.fromWords` picks the closest Pick settings on the page and says so |
| `/read-sketch` | Design yours, Sketch ("I'm done") | The pen lines as a PNG with their positions, the blocks placed and the words typed into them, and the business kind and style chosen | Unchanged since round 04; no daily cap | The page's own instant reading of the blocks |
| `/chat` | Round 04's chat demo (kept on the Worker; no Round 05 page uses it) | The question, the facts and a short history | Unchanged since round 04; no daily cap | |

For every route: the body is at most 32 KB, every field is capped, the call to Anthropic times out after 15 seconds, errors come back as plain JSON (never Anthropic's own error), nothing is logged or stored, and anything that looks like an email address, a phone number or a stated name is replaced with "(removed)" before it reaches Anthropic (the concierge also strips them on the page). Only the live site and http://localhost:8000 are answered (other websites get 403). Every visitor's IP address may make at most 20 requests a minute across every route (an exact counter, `SKETCH_COUNTER`; the 21st gets 429), and each new route has a daily cap per UTC day (see COMPLIANCE.md for the cost arithmetic). The $100 monthly limit on the Anthropic account is the last line of defence.

### Switching the AI off

- **One feature:** set its address in settings.js to `''` and push: `ai.agentEndpoint` (the AI demo), `ai.conciergeEndpoint` (the concierge), `ai.briefEndpoint` (the brief's summary), `ai.designEndpoint` (Describe), `ai.readSketchEndpoint` (Sketch), `ai.chatEndpoint` (round 04's chat). That part then answers from the page, and says so.
- **All of it, from the site:** set `ai.workerBase` to `''` and leave the endpoints as `null`.
- **All of it, at once, without touching the site:** revoke the key at console.anthropic.com (or remove the Worker's secret). Every AI part then falls back quietly to its on-page version.

## Adding photos to the concept sites

The concept sites already look finished without new photos: four of them use one stand-in photo each (from `assets/studio/playground/`), and everything else is drawn in code. `IMAGE-PROMPTS.md` lists every photo that would make them better, each as a ready-to-paste ChatGPT image prompt with its file name, size and folder, and says exactly which `<img>` to change for each one.

1. Make each picture with its prompt and download it into `~/Downloads/toff-round-05-images/`, named as in IMAGE-PROMPTS.md (any image type; the name before the extension is what matters, so `saltmarsh-room.png` matches `saltmarsh-room.webp`).
2. Run `python3 tools/add-images.py` (it needs Pillow: `pip3 install pillow`). It makes WebP files at the right sizes (and the smaller srcset versions), puts each one in the right `work/<slug>/img/` folder, never overwrites an existing file unless you add `--force`, and prints what it did and what's still missing. `--dry-run` shows what it would do without writing anything.
3. Make the page changes IMAGE-PROMPTS.md describes for each photo you added, then look at the page at 390 and 1440.

Never use an AI-made picture for a real person or real premises (the owner, Bluebird, Everest): those need real photos.

### Real photos to ask the clients for

For the case studies (these must be real, never AI-made):

- **Bluebird Wellness:** a photo of the clinic room (about 2400×1600, for `work/bluebird/img/clinic-room.jpg`); a doctor preparing a drip, with their consent (about 1600×2000, `doctor.jpg`); screenshots at 2× (2880×1800 laptop and 1170×2532 phone); a written OK to show the sketch; and a short quote for Kind words if they're happy to give one. Worth telling them: the live Bluebird site still shows "Placeholder" badges on its clinic photos.
- **Everest Climate Solutions:** a fitted unit in a real customer's room, with the customer's permission (about 2400×1600, `work/everest/img/install.jpg`); screenshots at 2×; a written OK to show the sketch; the live address once it's online (for `links.everest`); and a short quote if they're happy to give one. Their local build still has [TODO] placeholders (Who we are, Areas we cover, Certifications, phone and email).

## Tests

```
python3 tests/run_all.py                    every suite
python3 tests/run_all.py --suite hero       one suite (repeat --suite for more)
python3 tests/run_all.py --quiet            only failures and the totals
TOFF_CI=1 python3 tests/run_all.py          as GitHub Actions runs it
```

Plain Python with Playwright's Chromium (`pip3 install playwright pillow numpy`, then `python3 -m playwright install chromium`). It starts its own server (gzip on, the way GitHub Pages serves), runs the suites in order (pages, motion, hero, ai, concepts, lab, a11y, copy, performance), prints "<suite>: N passed / M total" for each and a total, stops the server, and exits with an error if anything failed. Every test blocks or mocks the Worker: nothing calls it for real. `TOFF_CI=1` skips the frame-time and GPU checks, which need a headed browser and a real graphics chip. axe-core is vendored in `tests/vendor/`. CHECKLIST.md says which suite covers which check.

The Worker has its own tests, run in `~/Documents/toff-studio-tools/optional-ai/`: `node test-round-05-routes.mjs`, `node test-sketch-ai-worker.mjs` and `node test-sketch-counter.mjs` (Anthropic is mocked).

## Captures (tools/capture/)

The home page's pictures and moving pictures are made by scripts, so they can be made again after a site changes. Each writes into `scratch/captures/` first (not committed) and copies only the finished files, with stable names, into the site; `--no-copy` leaves them in scratch to look at first. They need Playwright and Pillow.

| Script | What it makes |
|---|---|
| `python3 tools/capture/hero.py [site …]` | The hero's screenshots and still sketches for every site (or the ones named), into `assets/home/captures/hero/`, and the `hero` list in `captures.json`. If you change the first site, change the still in index.html too. |
| `python3 tools/capture/films.py [bluebird] [everest]` | The case films (frame sequences, at most 90 frames and under 2.5 MB each), into `assets/home/captures/films/`. Bluebird is captured from its live site; Everest from `~/Downloads/everest-climate-solutions/dist`, read-only, and skipped if that folder isn't there. |
| `python3 tools/capture/concepts.py [slug …]` | Each concept site's preview (its signature moment, under 600 KB) and stills, into `assets/home/captures/concepts/`. |
| `python3 tools/capture/lab_stills.py [id …]` (`--band` for the band only) | The Lab's stills into `assets/lab/stills/` (with `index.json`) and the home page's Lab band still into `assets/home/captures/`. |
| `python3 tools/capture/making_of.py [--round NN]` | The Making of this site: each round's first screen and a scroll strip, from that round's commit in a temporary git worktree, into `assets/lab/pieces/making/`. |
| `python3 tools/capture/awwwards.py` | The Awwwards submission images (1600×1200) into `handover/awwwards/` (not committed). See AWWWARDS.md. |

## The handwriting

`tools/handwriting/build_line.py` lays out the pen's lines from the public-domain Hershey cursive. The positions are in `LAYOUTS` at the top (bluebird and everest, desktop and mobile). Run `python3 build_line.py` in that folder (it needs numpy), check it prints no WARNING, then copy `line-data.js` and the `line-*.svg/json` files it writes into `assets/handwriting/`. Never edit `line-data.js` or the line SVG/JSON by hand, and never redraw or retrace `assets/face-line.svg`. "Tell us what you need" and the footer signature come from `assets/studio/inkwriter-data.js`.

## Other tools

| Path | What it does |
|---|---|
| `tools/serve.py` | The preview server (`--gzip` for measuring) |
| `tools/add-images.py` | Puts the concept sites' photos in place (see above) |
| `tools/make-icons.py` | Remakes the favicon, touch icon and the home page's link-preview image (needs fonttools, Pillow and Playwright) |
| `tools/handwriting/build_finale.py` | Round 02's finale lines (retired; kept) |
| `.claude/hooks/guard.py` | The guard hook: Claude Code runs it before every command and file write. It blocks an API key in any file or command, "git add ." and friends, force pushes and destructive git, deleting or moving anything that was in assets/ before the round, pushing main before "ship it", and writing outside the repo and its allowed folders |

## Working rules since Round 05

CLAUDE.md still describes the Round 02 to 04 site: rewriting it was refused by the permission checker in Round 05, so these rules are recorded here and in DECISIONS.md until it is updated.

- The studio owns every file; there are no "delivered parts" any more. Two rules stay: `line-data.js` and the line SVG/JSON are only regenerated with `tools/handwriting/build_line.py`, and `assets/face-line.svg` is never redrawn or retraced.
- Nothing that was in `assets/` before a round (anything on that round's `backup-before-round-NN` branch) is ever deleted or moved; files created during the round may be removed or renamed. Retired files stay in place, unloaded, and are listed below.
- The guard hook (`.claude/hooks/guard.py`, wired up in `.claude/settings.json`) enforces the safety rules; never edit or disable it to get round it.
- Each round is built on its own branch and goes live only when the owner replies "ship it": then `.claude/ship-approved` is written, the branch is merged into main with `--no-ff`, the tests run again on main, main is pushed, and the file is deleted.
- "Run every CHECKLIST.md item" means the checklist's current sections (not "Retired in Round 05"); `python3 tests/run_all.py` covers most of them.
- The motion rules and the not-AI-made rules are in DESIGN.md and apply to every page, the concept sites included.

## Retired files (still in the repo, no longer loaded)

Nothing that was in `assets/` before a round is ever deleted or moved. These files stay where they are, but no page loads them any more. Checked on 13 October 2026 by loading every page (home, Lab and each piece, the 404 page, both case studies, every concept page and embed, the Linden page) at 1440 and 390 and recording every file requested, plus reading what each page's scripts load on demand.

| Path | What it was | Replaced by |
|---|---|---|
| `assets/studio/xray.js`, `xray.css` | The Sketch lens in the top bar | Retired (round-05.md section 4) |
| `assets/studio/capabilities.js`, `.css`, `.html` | The "Booking and other features" tab | The real features inside the concept sites |
| `assets/studio/trytabs.js`, `.css`, `.html` | The Try it tabs | Design yours and the Lab |
| `assets/studio/playground.js`, `.css`, `.html` | Pick a look | Design yours, Pick (SiteKit) |
| `assets/studio/minisite.js`, `minisite.css` | MiniSite, the drawn example sites and concept thumbnails | SiteKit and the five concept sites |
| `assets/studio/kinetic.js` | The kinetic headings | Retired on the main pages |
| `assets/studio/topbar.js`, `topbar.css`, `studio.css`, `base.css`, `craft.js`, `craft.css`, `craft.html` | Round 03 and 04's top bar, page styles and footer craft line | `assets/shared/shell.js`, `shell.css`, `tokens.css` |
| `assets/studio/cases.js`, `cases.css`, `cases.html`, `devices.js`, `devices.css` | Round 04's Recent work and its device frames | `assets/home/films.js`, the case studies |
| `assets/studio/process.js`, `process.css`, `process.html` | Round 04's How it works line | How we work in `index.html` and `home.js` |
| `assets/studio/about.html`, `about.css`, `finale.css`, `labteaser.html`, `labteaser.css`, `notfound.css`, `404.html` | Round 04's About, enquiry heading, Lab teaser and 404 styles | The new home page and `404.html` |
| `assets/studio/aiassist.html`, `aiassist.css`, `assistant.css`, `drawsite.html`, `drawsite.css`, `oneline.html`, `oneline.css` | The old demos' markup and styles (their scripts are still loaded) | `agent.css`, `concierge.css`, `design-yours.css`, the Lab's `oneline.css` |
| `assets/studio/buildself.js`, `.css`, `.html` | The Lab's "Watch a section being written" | The making-of piece |
| `assets/studio/lab.js`, `lab.css`, `lab.html`, `lab.html.part`, `particles.js`, `particles.css`, `particles.html`, `monogram.js`, `fluid.js`, `sound.js` | Round 03 and 04's Lab page and its pieces | `assets/lab/` |
| `assets/studio/site.html` | Round 03 and 04's preview of the whole main page | |
| The old aiassist mount (the `AIAssist.mount(…)` line in round 04's index.html) | Round 04's chat demo, live through `/chat` | `assets/home/agent.js` through `/agent` (aiassist.js is still loaded for its on-page answers) |
| `assets/studio/playground/playground-clinic.webp`, `-restaurant`, `-salon`, `-boutique`, `-trades` | Example photos | Loaded only by SiteKit (Design yours) when a business needs one; the four used on concept sites were copied into their `img/` folders |
| `assets/studio/cases/bluebird-phone.webp` | Bluebird's phone screenshot | Used only by the Lab's Sketch to site |
| `assets/enquiry/` (style-picker and its preview) | The six-step enquiry's style picker | The concierge |
| `assets/opening/` | The opening ("From sketch to site", the drawn Morrow Coffee site) | The hero |
| `assets/showcase/` | The pictures beside the four phrases (plan notepad, Bluebird, Everest) | The work chapter and case studies. Everest's cooling picture stays in use: its air conditioner pictures (`assets/everest/ac-*.webp`) drive the cooling scene on the Everest case study |
| `assets/handwriting/line-desktop.svg/json`, `line-mobile.svg/json` | The four phrases' line | The two names (`line-bluebird-*`, `line-everest-*`, built into `line-data.js`; those SVG/JSON files are kept for reference) |
| `assets/handwriting/preview.html`, `other.html` | Round 02's previews (not published) | |
| `assets/finale/finale-data.js` | Round 02's finale lines | |
| `assets/everest/ac-*.png` | PNG copies of the air conditioner pictures | The `.webp` versions beside them |
| `assets/fonts/inter/`, `fonts/inter/`, `fonts/cormorant-garamond/` (apart from `cormorant-garamond-400.woff2`) | Round 01 and 02 fonts | `assets/studio/fonts/`. The Lab's Letters with weight loads `fonts/cormorant-garamond/cormorant-garamond-400.woff2` |
| `assets/styles/placeholder-style.svg`, `assets/face-line.svg` | Round 01's style slots and face drawing | (never redraw or retrace face-line.svg) |
| `site.css`, `site.js` | Round 02 to 04's main stylesheet and script | `assets/shared/` and `assets/home/` |
| `script.js`, `styles.css`, `js/`, `paths/`, `fonts-preview.html`, `tools/build-fonts.mjs`, `tools/svg-fonts/` | Round 01's implementation and its single-line fonts | |
| `vendor/gsap-3.15.0.min.js`, `vendor/lenis-1.3.26.*` | Round 01's libraries (Lenis is never to be used) | |
| `vendor/rapier/rapier3d/` | Rapier 3D, vendored in Round 05 but not used | Letters with weight uses Rapier 2D |
| `vendor/three/addons/controls/OrbitControls.js` | Vendored in Round 05, not used | The vase turns with its own drag code |

`vendor/three/three.webgpu.js` and `three.tsl.js` are loaded only by A million specks, and only where the browser has WebGPU.
