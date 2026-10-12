You're working in my Toff Studio portfolio repo, the folder "toff portfolio" (git repo github.com/Toffzzzz/Toff-Designs). This is Round 04. The files are in ~/Downloads/toff-round-04-files.zip. They were built and tested outside the repo. Your job: put them into the real site exactly as the three preview pages show (site.html, lab.html, 404.html), switch on the live AI for the new chat demo through my Cloudflare Worker, test everything, then commit and push.

What Round 04 adds:
- an "AI assistants" section near the top, which shows off my main selling point: AI chat assistants fine-tuned to a business, plus other AI features, with a demo visitors can play with;
- Draw your site, rebuilt: visitors drag in blocks (menu bar, headings and text they type into, buttons, pictures, maps, forms) or draw with the pen, then press "I'm done" and Claude builds the homepage;
- a much better logo tracer ("Your logo in one line"): logos like Spotify's now come out as clean outlines instead of scribbles;
- the logo drawer on the Lab page too, plus a full-width "There's more in the Lab" section on the main page so people don't miss the Lab;
- a design upgrade based on research into recent Awwwards winners: a large editorial headline, a cream "paper" How it works, a fine paper grain, a gold-line page transition between the main site and the Lab, a skip link, a "This page is closed" 404 page, and a simpler menu;
- a tighter page after a critical review by a juror and a first-time customer: the four hands-on tools now sit in one "Try it" section with tabs (the page went from 18 to 14 laptop screens), unfinished details are hidden from visitors until they're real, the opening's drawn café shows a real photo, and small text is at least 14px.

SAFETY RULES (these always apply)
- Only work inside the toff portfolio folder and ~/Documents/toff-studio-tools/. Never delete, move, rename or overwrite anything in the Everest project folder, the bluebird-wellness folder, or anywhere else.
- Never delete files in toff portfolio/assets. Add or replace files one by one; never replace a whole folder.
- Before deleting or overwriting anything not listed in this prompt, stop and ask me.
- Never run "git add ." or "git add -A". Add files by name. Never "git push --force".
- My Anthropic API key must NEVER be written into any file, commit, command line, log or chat message. It lives only in the Cloudflare secret. If you ever see it in a file or in git, stop and tell me.
- Never invent testimonials, reviews, prices, client names, timeframes or claims for my studio. Placeholders stay clearly marked as placeholders. (The prices in the AI demo belong to clearly made-up businesses; that's fine.)
- No AI-generated images in place of real people or real premises.
- The Everest link stays as "coming soon" with no working link.
- When you've finished with the zip, move it to ~/Downloads/toff-rounds-done/ (create the folder if needed). Don't delete it.

STEP 0: BEFORE YOU START
- If the AI follow-up from last time (rounds/round-03-ai.md: Worker, spend limit, rate limit, switching on the sketch AI) isn't finished and pushed, tell me what's left and finish it first, from its own first step.
- Run git status. If anything is uncommitted, show me and stop. Then git pull. Then make a backup branch: git branch backup-before-round-04.
- Save this whole prompt as rounds/round-04.md, next to the other rounds.

STEP 1: UNPACK AND LOOK AROUND
- Unzip into /tmp/toff-round-04 (not into the repo). Read its README.md first. It lists every file, and marks which are NEW and which CHANGED since Round 03.
- Work out how the real index.html loads the studio sections now. In Round 03 you rebuilt index.html from assets/studio/site.html (with site.css, site.js and settings.js). Does it load the assets/studio files one by one, or did you bundle or copy them into site.css / site.js? Apply Round 04 the same way, so there is only one copy of each piece. Tell me what you found.

STEP 2: COPY THE FILES
- NEW files in studio/ → add to assets/studio/ (including the lab-logos/ folder and lab-teaser.webp).
- CHANGED files in studio/ → for each one, compare the repo's current file with the Round 03 version (in ~/Downloads/toff-rounds-done/toff-round-03-files.zip, folder studio/). If the repo file is still identical to Round 03, replace it with the Round 04 file. If you edited it during Round 03, merge: keep your Round 03 fixes and add the Round 04 changes. List which files you merged and how.
- round-02-updates/opening/opening.html, opening.css and opening.js → wherever the opening really lives (assets/opening/ unless you found otherwise in Round 03). round-02-updates/showcase/showcase.html and showcase.css → wherever the showcase cards live. enquiry/style-picker.css → wherever the enquiry lives. Same compare-then-replace-or-merge rule.
- fonts: add the new .woff2 files next to the .woff files in assets/studio/fonts/. In the site's own @font-face rules (the ones you copied from base.css in Round 03), list the woff2 first, as base.css now does: src: url("…woff2") format("woff2"), url("…woff") format("woff"). Add the two <link rel="preload" … as="font" type="font/woff2" crossorigin> lines from the <head> of site.html to index.html and lab.html, with the paths adjusted.
- cloudflare-worker/ must NOT go in the repo (see step 6).
- tools/ must NOT go in the repo. Copy it to /tmp/toff-tests/ (including tools/logos/).

STEP 3: THE MAIN PAGE (index.html)
Make index.html match assets/studio/site.html. Update sections in place; don't build second copies.
- Sections in this order: top bar, opening, handwriting with the cards, AI assistants (NEW, aiassist.html), Recent work, Try it (NEW, trytabs.html: one section whose four tab panels hold, in this order, Try a look (playground.html), Sketch your homepage (drawsite.html), Your logo in one line (oneline.html) and Booking and other features (capabilities.html)), There's more in the Lab (NEW, labteaser.html, with {LAB} replaced by the Lab's address), How it works, About the studio, the enquiry (the real six steps, unchanged), the footer. The four tools must not also appear as separate sections; move the existing ones into the tab panels exactly as site.html shows.
- At the very top of <body>, before everything else: <a class="skip" href="#opening">Skip to content</a> and <div class="vt-rule" aria-hidden="true"></div>, exactly as in site.html. In the <head>, the one-line script that adds show-unfinished when the address has ?unfinished (also as in site.html).
- Unfinished details: anything marked data-unfinished stays hidden from visitors (the "How long" notes, the price line in How it works, the "Placeholder text" note in About, the footer's email and privacy lines). As each becomes real, fill it in and remove its data-unfinished attribute. If site-config.js / settings.js already holds my real email address, show it in the footer and remove data-unfinished from that line. Adding ?unfinished to the address shows everything that is still hidden, so I can check what's missing.
- Load the new stylesheets and scripts (aiassist.css, labteaser.css, trytabs.css, aiassist.js, trytabs.js) in the same order as site.html, with paths adjusted for index.html.
- Mount code: match the bottom of site.html, with these real settings:
  - AIAssist.mount(document.getElementById('ai-assistants'), { endpoint: 'https://toff-sketch-ai.toffdesigns.workers.dev/chat' }). That switches the chat demo to live answers from Claude. Its header then says the questions go to Anthropic and aren't stored.
  - DrawSite keeps its ai: { endpoint: '…/read-sketch' } option from the AI follow-up. Draw your site now has its own built-in privacy line under the paper ("When you press 'I'm done', your sketch and the words you typed on it are sent to Anthropic's Claude to be read. They aren't stored."). If the AI follow-up added a separate line ("When you pause, your sketch…"), remove that old line so there's only one.
  - TryTabs.mount(document.getElementById('try-it')) right after Opening.mount, before the other sections are mounted, so links into a tab open it first.
  - Opening.mount(…, { photo: 'assets/studio/playground/playground-cafe.webp' }) (the path from index.html to that picture) so the drawn café shows a real photo.
  - Top bar links: AI assistants, Work, Try it, How it works, The Lab (exactly as in site.html).
  - Assistant (the "Plan with us" planner): hideOver: ['#opening', '.ft', '.aa-demo', '#contact', '.pg-controls', '.dr-paper'], so the planner button steps aside over the chat demo, the enquiry and the tools' controls.
- The page still must NOT load buildself, particles, monogram, fluid or sound.
- The 3b leftover: if "Bespoke design, never a template" (or the word "bespoke") still appears anywhere visible, change it to "Designed from scratch for your business".

STEP 4: THE LAB PAGE (lab.html in the repo root)
Make it match assets/studio/lab.html:
- the skip link (href="#lab") and the vt-rule div at the top of <body>;
- the new logo drawer section (from oneline.html) after the gold specks, loading oneline.css and oneline.js, with lab.js mounting it with the four sample logos in assets/studio/lab-logos/ (adjust the paths in lab.js if the Lab page isn't in the same folder as the logos);
- "One line" in its top bar, as lab.js does.

STEP 5: THE 404 PAGE (404.html in the repo root, new)
Create 404.html from assets/studio/404.html. GitHub Pages shows it for any address that doesn't exist, at any depth, so every stylesheet, script and link in it must use an absolute path. If the repo has no CNAME file (a custom domain), the site lives under /Toff-Designs/, so use paths like /Toff-Designs/assets/studio/studio.css and links to /Toff-Designs/ and /Toff-Designs/lab.html. If there is a CNAME file, use paths starting with /. Give it the noindex meta tag: <meta name="robots" content="noindex">.

STEP 6: THE CLOUDFLARE WORKER (new /chat route)
- The new worker is in /tmp/toff-round-04/cloudflare-worker/sketch-ai-worker.js. It keeps /read-sketch (now also told about the blocks the visitor placed) and adds /chat for the AI assistants demo. Its rate limit uses a binding called SKETCH_LIMIT.
- In ~/Documents/toff-studio-tools/optional-ai/, compare the new file with the deployed one. Keep any fixes you made last time, and keep wrangler.toml as it is. If your rate-limit binding has a different name from SKETCH_LIMIT, change the name in the worker code, not in wrangler.toml. Then copy in test-sketch-ai-worker.mjs and run it: node test-sketch-ai-worker.mjs (33 checks).
- Deploy: npx wrangler deploy (the secret stays as it is; don't touch it).
- Test once for real, without showing the key: POST to https://toff-sketch-ai.toffdesigns.workers.dev/chat with the header Origin: https://toffzzzz.github.io and this body:
  {"business":"Morrow Coffee","kind":"a neighbourhood café","facts":[{"label":"Opening hours","text":"Saturday and Sunday: 8.30am to 4pm"}],"history":[],"question":"Are you open on Sunday?"}
  It should answer 200 with a short "reply" and "sources": ["Opening hours"]. If it answers 401 or 403 from Anthropic, the key is wrong or revoked: tell me and stop. Also send the same request with Origin: https://example.com. It must be refused (403).
- Add to COMPLIANCE.md and to the privacy policy draft: questions typed into the AI assistants demo are sent to Anthropic to be answered and aren't stored by the site; the demo tells visitors not to type personal details. (The sketch line from last time stays.)

STEP 7: WRITE IT DOWN
- In DESIGN.md add a section "Round 04 design upgrade". List: the large headline that rises line by line with "build" in gold italic; the café in the opening drawing; the AI assistants band in a deeper ink; How it works on cream paper with a torn edge; the still paper grain; the gold-line page transition between the main site and the Lab (CSS View Transitions; switched off for reduced motion); the skip link; the 404 page; the Lab teaser; the simpler menu; balanced line breaks (text-wrap). Under the existing "Not template-looking" section, add the copy changes: no "X, not Y" lines, and "Studies we designed for made-up businesses…". Also list: the four tools grouped into the Try it tabs; the small "Recent work" / "Your brief" labels removed from the handwriting cards; the softer AC glow; no studio caption under 14px.
- In README.md, add the AI assistants demo, the Try it tabs, the 404 page and the ?unfinished switch to the list of what's on the site.

STEP 8: TEST (everything must pass before you commit)
Serve the repo locally: python3 -m http.server 8000 (in the repo folder, in the background). Then run:
- python3 /tmp/toff-tests/tools/check-round-04.py http://localhost:8000/assets/studio/site.html (60 checks; it finds lab.html and 404.html next to it, and the test logos in tools/logos)
- python3 /tmp/toff-tests/tools/check-round-03.py http://localhost:8000/assets/studio/site.html (202)
- python3 /tmp/toff-tests/tools/check-round-03-features.py http://localhost:8000/assets/studio/site.html (330)
- python3 /tmp/toff-tests/tools/check-sketch-ai.py http://localhost:8000/assets/studio/site.html (20)
- python3 /tmp/toff-tests/tools/check-style-picker.py http://localhost:8000/assets/enquiry/ (119; use the folder where the enquiry preview really lives)
- python3 /tmp/toff-tests/tools/check-round-02.py http://localhost:8000/assets/handwriting/ (177; use the folder where Round 02's handwriting preview really lives)
- node ~/Documents/toff-studio-tools/optional-ai/test-sketch-ai-worker.mjs (33)
If Playwright isn't installed: pip3 install playwright, then python3 -m playwright install chromium.
These test the preview pages. Then check the real pages:
- point check-round-03-features.py at http://localhost:8000/index.html, as last time;
- point check-round-04.py at http://localhost:8000/index.html. It looks for lab.html and 404.html next to index.html, which is right for the repo root.
The tests never really call the AI. They block the Worker's address, so nothing is spent, and the pages fall back to their own answers. That's also a test of the fallback. Fix anything that fails. If a check fails because index.html legitimately differs, say which check and why, and don't weaken any other check.
Then test the live AI for real once in the browser at http://localhost:8000:
- In the AI assistants demo, pick Café and ask "Do you have oat milk?". The answer should come from Claude and name "Milk and allergies". Edit the Sunday hours to "Closed" and ask "Are you open on Sunday?". The answer should say closed.
- In Draw your site, add a Heading block, type "Fresh bread every morning", draw a box and write MAP in it, then press "I'm done". The status should start "Built by Claude", with a map in the preview and your heading exactly as typed.
- Take a screenshot of both and look at them.
Then take screenshots of index.html, lab.html and 404.html at 390, 820, 1024 and 1440px, every section, and look at every one yourself:
- nothing overlaps, is cut off or is covered by the top bar or the planner button;
- no template tell from the Round 03 list is left anywhere;
- "Start a project" is visible on the first screen at every width;
- no sideways scrolling at 320px.

STEP 9: COMMIT AND PUSH
Run git status and look at every file. Add only the files you changed or created, by name: rounds/round-04.md, index.html, lab.html, 404.html, the assets/studio files (including lab-logos/, lab-teaser.webp and the new fonts/*.woff2), the opening, showcase and enquiry files, site.css / site.js if you bundled, DESIGN.md, README.md, COMPLIANCE.md and the privacy draft. Never add zips, node_modules, wrangler.toml, .wrangler/, screenshots or test output. Commit with the message "Round 04: AI assistants, Draw your site with I'm done, better logo tracer, Lab teaser, design upgrade", then git push. Move the zip to ~/Downloads/toff-rounds-done/.

WHEN YOU FINISH, TELL ME
- what you changed, file by file (added, replaced, merged, untouched)
- the test results (every script, passed / total), and the two live tests (chat and sketch)
- the Worker: deployed, /chat answering, other websites refused, rate limit still on (never show the key)
- anything you couldn't do exactly as asked, and what you did instead
- what I still need to give you, most important first: a real email address (until then the site has no way for anyone to reach me except the demo enquiry and planner, which send nothing), rough prices and timeframes for the hidden price line and the "How long" notes, the privacy policy, a photo of me and my own About text, a quote from the Bluebird client if they're happy to give one, real Everest screenshots when it's live, and a domain name (with the decision on making the repo private)
- the live links: https://toffzzzz.github.io/Toff-Designs/, /lab.html, and a made-up address such as /Toff-Designs/nothing-here to see the 404 page. Remind me that GitHub Pages takes a minute or two and to refresh with Cmd + Shift + R (on an iPhone, close the tab and reopen it).
- how to switch the live chat off quickly: remove endpoint: '…/chat' from the AIAssist.mount line in index.html and push. The demo then answers from its facts again. Revoking the key at console.anthropic.com also stops every call, and both demos quietly fall back.
Don't end with offers or questions unless something is blocking.

## Additions (after Step 0 report)

(Step 0 found the AI follow-up's last six files uncommitted. The owner approved committing and pushing them as "Round 03 AI follow-up: show the privacy line, record decisions" before Round 04 started.)

1. Worker rate limit. Keep your SKETCH_COUNTER Durable Object (the exact 20-per-minute counter per IP, refusing with 503 if the counter can't answer). Merge it into the new sketch-ai-worker.js so it guards BOTH /read-sketch and the new /chat route, before Anthropic is called, with 429 + CORS headers when over the limit. Keep the built-in SKETCH_LIMIT binding as it is. Keep wrangler.toml as it is. Make sure the new tests (33 checks) and your counter tests all pass, then deploy. After deploying, check the live limit on /chat too: the 21st request within a minute from one IP must get 429.

2. Draw your site. The Round 04 drawsite.js, drawsite.css and drawsite.html already show and hide their own privacy line (".dr-ai-privacy", new wording "When you press 'I'm done'…") together with the "Write a word" key item. So replace those three files with the Round 04 versions instead of merging. Then remove the old "When you pause, your sketch…" line from index.html and assets/studio/site.html, so there's exactly one privacy line, the new one.

3. Keep "What's included" and "Kind words". They exist only in the real index.html, so they're missing from site.html's order. Keep both, in their current form, placed after How it works and before About. Everything else follows the order in Step 3.

4. One switch for unfinished details. Round 04 hides anything marked data-unfinished, and shows it with ?unfinished. Tie that to the existing showPlaceholders setting in settings.js, so there's only one switch:
   - showPlaceholders: true shows the data-unfinished items as well as the existing placeholders;
   - showPlaceholders: false hides both.
   - ?unfinished still shows everything, for me.
   Set showPlaceholders to false now, so visitors no longer see "Placeholder" notes or empty Kind words; the section hides until real quotes are set. List in your final report everything that's now hidden and waiting for me.
