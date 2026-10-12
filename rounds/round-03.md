You're working in my Toff Studio portfolio repo, the folder "toff portfolio" (git repo github.com/Toffzzzz/Toff-Designs). This is Round 03. The files are in ~/Downloads/toff-round-03-files.zip. They were built and tested outside the repo. Your job is to put them into the real site exactly as the two preview pages show, apply the "doesn't look AI-made" rules below to the whole site, test everything, then commit and push.

SAFETY RULES (these always apply)
- Only work inside the toff portfolio folder. Never delete, move, rename or overwrite anything in the Everest project folder, the bluebird-wellness folder, or anywhere outside toff portfolio.
- Never delete files in toff portfolio/assets. Add or replace files one by one; never replace a whole folder.
- Before deleting or overwriting anything not listed in this prompt, stop and ask me.
- Never run "git add ." or "git add -A". Add files by name. Never "git push --force".
- Before you start: run git status. If anything is uncommitted, show me and stop. Then git pull. Then make a backup branch: git branch backup-before-round-03.
- Everything that could send data stays in demo mode (nothing is sent anywhere) until a privacy policy exists.
- Never invent testimonials, reviews, prices, client names, timeframes or claims. Placeholders stay clearly marked as placeholders.
- No AI-generated images in place of real people or real premises.
- The Everest link stays as "coming soon" with no working link.
- When you've finished with the zip, move it to ~/Downloads/toff-rounds-done/ (create the folder if needed). Don't delete it.

STEP 1: UNPACK AND LOOK AROUND
- Save this whole prompt as rounds/round-03.md, next to round-01.md and round-02.md.
- Unzip into /tmp/toff-round-03 (not into the repo). Read its README.md first: it lists every file and where it goes.
- Check where the Round 02 files actually live in the repo: the opening (opening.html/.css/.js), the handwriting (handwriting.js, line-data.js, preview.html), the showcase cards (showcase.html/.css/.js, ac-open.png, ac-closed.png) and the enquiry (style-picker files, preview.html). The preview pages in the zip expect them in assets/opening/, assets/handwriting/, assets/showcase/ and assets/enquiry/. If any are somewhere else, don't move them. Instead, change the paths in assets/studio/site.html and assets/studio/lab.html (after step 2) to point to where they really are, and copy the round-02-updates files to those real locations. Tell me what you found.

STEP 2: COPY THE FILES (add or replace, one by one)
- studio/* → assets/studio/ (a new folder; create it), including fonts/, cases/ and playground/.
- round-02-updates/opening/opening.html and opening.css → assets/opening/ (replace), or wherever step 1 found the opening.
- round-02-updates/showcase/showcase.html and showcase.css → assets/showcase/ (replace), or wherever step 1 found the showcase.
- enquiry/* → assets/enquiry/ (replace), or wherever step 1 found the enquiry.
- optional-ai/ must NOT go in the repo. Copy it to ~/Documents/toff-studio-tools/optional-ai/.
- tools/ must NOT go in the repo. Copy it to /tmp/toff-tests/.

STEP 3: THE MAIN PAGE (index.html)
Open assets/studio/site.html. It is the main page, exactly as it should look and behave. Make index.html match it:
- Sections in this order: top bar, opening, handwriting with the cards, Recent work, Things we can build into your site, Try a look for your business, Sketch your homepage, Your logo drawn in one continuous line, How it works, About the studio, the enquiry, the footer. Where index.html already has one of these, update it in place to match. Don't build a second copy.
- "How it works" (assets/studio/process.html) replaces the old Process section, the one with the "—— PROCESS" label, "Four quiet steps." and the 01 / 02 / 03 / 04 numerals. If my old step descriptions differ from process.html, use the ones in process.html. The "How long: to be added" placeholders stay.
- Load the same stylesheets and scripts, in the same order, with the same mount code as the bottom of site.html. Adjust the paths for index.html, which sits two folders up.
- The main page must NOT load buildself, particles, monogram, fluid or sound. Those effects live only on the Lab page.
- The real enquiry (all six steps) stays as it is. site.html only previews step 3. Take these from it: the pen-written heading in flat ink (no fluid or smoke behind it), and "Pick one to continue" next to a disabled Continue button.
- Footer: match site.html (signature, "Start a project →", "Plan it with our helper", Email, Privacy policy, the Lab link and the craft line). If site-config.js (or wherever my contact details live) already has my real email address, show it. Otherwise keep the visible "Placeholder" note. Privacy policy says "coming soon" until it exists.
- The top bar: the Toff Studio name on the left, then the section links, the Sketch lens switch and "Start a project". Over the opening it shows only the name, the lens and the button. On tablets the lens becomes an icon (and the name hides between 801 and 1000px so everything fits on one line). On phones it shows the name, "Start a project" and a Menu button. The menu lists every section, with the Sketch lens at the bottom. Links land just below the bar, and exactly one link is marked as "you are here".
- "Plan with us" is the only floating button.

STEP 4: THE LAB PAGE (lab.html, new)
Create lab.html in the repo root from assets/studio/lab.html, adjusting the paths. It holds the showpiece experiments: the section that writes itself, the gold-speck lettering, the liquid gold T, the moving ink, and the optional sound. It has the same top bar (solid from the start) and a footer with a link back. It is linked from the main page's top bar ("Lab") and footer. Give it its own <title> and meta description.

STEP 5: FONT
The body font becomes Work Sans (self-hosted, in assets/studio/fonts, with OFL-work-sans.txt). Copy the three Work Sans @font-face rules from assets/studio/base.css into the site's main stylesheet and set the site-wide sans-serif variable to "Work Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif. Cormorant Garamond stays for headings. Inter stays only for the example client sites inside the demos (minisite moods). Add the licence to CREDITS.md.

STEP 6: MAKE SURE NOTHING LOOKS AI-MADE (the whole site, including sections from earlier rounds)
A reviewer found these template tells. Remove every one of them, anywhere on the site:
1. No small label above a heading: no eyebrows like "—— PROCESS" or "INCLUDED", no tiny caption above an h2. A section starts with its heading.
2. No spaced-out capital labels (text-transform: uppercase with letter-spacing) anywhere on my own pages. Placeholder and Concept notes are quiet italic serif notes in sentence case, not badges.
3. No 01 / 02 / 03 numbering unless it's a real sequence the visitor needs, and never giant numerals.
4. No identical card grids that give everything equal weight (icon, heading and text, three or four in a row). Use asymmetry: one large and two small, uneven columns, prose lists.
5. No "hero metric" stat rows. The page-speed numbers appear once, as the footer's sentence.
6. Copy: no slogans or forced contrast ("X, not Y.", "Small on purpose.", "Four quiet steps."), no stock words (bespoke, seamless, elevate, effortless, world-class), no em dashes in visible text, and no heading that repeats its label ("INCLUDED / What's included."). Headings are plain, specific statements in sentence case, without full stops.
7. No glows, halos, glassmorphism or backdrop blur, gradient text, or neon. No hairline border combined with a big soft shadow on the same element.
8. Buttons and chips use small 8px corners, not pills. Only true circles (the phone planner button, dots) are round.
9. No decorative motion: nothing pulsing, bouncing or blinking (the code editor on the Lab keeps a steady caret).
10. No fake window chrome (the three macOS dots) on my own panels. The opening's sketch of a browser keeps its dots, because it is a drawing of a browser.
11. Vary the rhythm: not every section is heading, paragraph, grid. Use split intros (heading left, text right), different spacing and full-width moments.
"What's included" section (from an earlier round): keep its items word for word, but remove its label and any checkmark or icon grid. Give it a plain heading and lay the items out as a two-column list of short sentences (on phones, one column).
List every change you made under these rules in DESIGN.md, in a section called "Not template-looking".

STEP 7: TEST (everything must pass before you commit)
Serve the repo locally: python3 -m http.server 8000 (in the repo folder, in the background). Then run:
- python3 /tmp/toff-tests/tools/check-round-03.py http://localhost:8000/assets/studio/site.html
- python3 /tmp/toff-tests/tools/check-round-03-features.py http://localhost:8000/assets/studio/site.html (this also tests lab.html next to it)
- python3 /tmp/toff-tests/tools/check-sketch-ai.py http://localhost:8000/assets/studio/site.html
- python3 /tmp/toff-tests/tools/check-style-picker.py http://localhost:8000/assets/enquiry/ (likewise, the folder with the enquiry's preview.html)
- python3 /tmp/toff-tests/tools/check-round-02.py http://localhost:8000/assets/handwriting/ (use the folder where Round 02's handwriting preview.html really lives)
- node ~/Documents/toff-studio-tools/optional-ai/test-sketch-ai-worker.mjs
If Playwright isn't installed: pip3 install playwright, then python3 -m playwright install chromium.
These test the preview pages. Then check the real index.html and lab.html the same way: point check-round-03-features.py at http://localhost:8000/index.html (it finds lab.html next to it by itself), and fix anything that fails. If a test fails because index.html legitimately differs (for example the real six-step enquiry instead of the step 3 preview), say which check and why, and don't weaken any other check.
Then take screenshots of index.html and lab.html at 390, 820, 1024 and 1440px, every section, and look at every one yourself:
- nothing overlaps, is cut off or is covered by the top bar or the planner button;
- no AI-template tell from step 6 is left anywhere;
- "Start a project" is visible on the first screen at every width.

STEP 8: COMMIT AND PUSH
Run git status and look at every file. Add only the files you changed or created, by name (rounds/round-03.md, index.html, lab.html, the assets/studio, assets/opening, assets/showcase and assets/enquiry files, the stylesheet, DESIGN.md, README.md, CREDITS.md). Never add zips, node_modules, screenshots or test output. Commit with the message "Round 03: portfolio sections, Lab page, calmer not-template look", then git push. Move the zip to ~/Downloads/toff-rounds-done/.

WHEN YOU FINISH, TELL ME
- what you changed, file by file (added, replaced, untouched)
- the test results (every script, passed / total)
- anything you couldn't do exactly as asked, and what you did instead
- what I still need to give you: my real email, the privacy policy, the real About text, the "How long" timeframes, real screenshots of Everest when it's live
- the live links: https://toffzzzz.github.io/Toff-Designs/ and the /lab.html page. Remind me that GitHub Pages takes a minute or two and to refresh with Cmd + Shift + R (on an iPhone, close the tab and reopen it).
Don't end with offers or questions unless something is blocking.

AFTER THIS ROUND IS PUSHED
Go straight on to the AI follow-up I gave you before (switching on the AI second look through the Cloudflare Worker). Start it from its own first step: git status and its backup branch.
