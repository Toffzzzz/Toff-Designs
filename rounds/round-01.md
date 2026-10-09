ROUND 01 — TOFF STUDIO PORTFOLIO: BUILD THE WHOLE SITE

Follow every numbered step in order. Do everything yourself and only ask me if you genuinely can't continue.

STANDING RULES (this round and all future rounds)
- Never delete, move, rename or overwrite anything in my Everest project folder, my bluebird-wellness folder, or anywhere outside the toff-portfolio folder, except the specific files this prompt tells you to create or update in ~/.claude/. Treat everything else on my Mac as read-only.
- Never delete files inside toff-portfolio/assets. Copied or processed files go in their own subfolders.
- If any step would delete or overwrite something, stop and tell me first.

1. GET THE FILES
- In ~/Downloads, find toff-round-01-files.zip. Unzip it into a temporary folder.
- After you've copied its contents (step 2), move the zip (don't delete it) into ~/Downloads/toff-rounds-done/ (create that folder if needed).

2. SET UP THE PROJECT FOLDER
- Look in my home folder (up to 4 levels deep, skip Library, node_modules and hidden folders) for a folder called toff-portfolio.
  - If exactly one exists, use it. If several, ask me which.
  - If none: find my bluebird-wellness folder the same way and create toff-portfolio next to it (same parent folder). If bluebird-wellness can't be found, create ~/Documents/toff-portfolio.
- Copy face-line.svg from the zip into toff-portfolio/assets/.
- Make toff-portfolio a git repository if it isn't one, with a .gitignore for macOS files and node_modules.
- Save this whole prompt as toff-portfolio/rounds/round-01.md.
- Create toff-portfolio/CLAUDE.md containing THE CONCEPT, GLOBAL LOOK, GLOBAL MOTION RULES, SETTINGS and STANDING RULES from this prompt, written as permanent instructions for future sessions. Also tell future sessions to read DESIGN.md, DECISIONS.md and CHECKLIST.md before making changes.
- Create toff-portfolio/DESIGN.md: the exact design values for this site (colours and where each is used, fonts per phrase and for body text, stroke width, shadow offset/blur/opacity/delay, spacing scale, animation speeds, breakpoints, and the motion rules). Keep it in sync with settings.js: whenever a value changes in either, update the other.
- Create toff-portfolio/DECISIONS.md: a dated log of design decisions. Start it with the decisions in this prompt (one line each, with the reason where given). In every future round, add a line for each new decision I make. Never remove old lines; if a decision changes, add a new line saying what it replaces. Before changing anything, check DECISIONS.md and warn me if a request contradicts an earlier decision.
- Create toff-portfolio/CHECKLIST.md: the quality checks to run at the end of every round, starting with everything in step 5 (FINAL CHECKS). In every future round, run every item, and whenever I report a bug, add a check that would have caught it.
- Create or update my personal file ~/.claude/CLAUDE.md with a section headed "My website standards (all projects)". If the file already exists, back it up to ~/.claude/CLAUDE.md.backup first (only if that backup doesn't already exist), keep everything already in it, and only add or update that section. Include:
  - Process: I work in rounds; each round gives one complete prompt plus a zip of files in ~/Downloads; copy files in, then move the zip into a "rounds-done" folder in Downloads. Give explicit file-handling steps; never replace a whole folder; warn me before anything is deleted or overwritten.
  - Content: never invent business content, prices or health claims; use the client's own wording; real photos for real premises and people, never AI images in their place.
  - Motion: Apple-level smoothness on laptop and especially phones; on laptops animations are driven by scrolling, on phones they play by themselves when reached; once played they never reverse when scrolling up; no pinning sections unless a prompt explicitly allows it; animations start only when their section is on screen, at natural speed.
  - Look: no visible borders or boxes around pictures; calm, spacious, premium; consistent corner rounding; WCAG AA contrast.
  - Usability: ease of use on phones in every change; nothing hidden behind floating buttons; keyboard accessible; reduced-motion support.
  - Every public site needs: privacy policy, terms, refund policy, cookie policy, cookie banner, form consents, no unnecessary data, third-party SDK audit, no dark patterns, no hidden fees, no fake reviews, no unsupported claims, alt text, colour contrast, keyboard navigation, business details, age consent for children's data, unsubscribe links, licensed fonts and images, data deletion requests. Until these exist, forms run in demo mode and send nothing.
  - Before finishing any round: test at 390px and 1440px, screenshot and check the work yourself, fix problems, then report back in plain English.

3. FIND MY EVEREST PROJECT
- Search my home folder (up to 4 levels deep, skip Library, node_modules and hidden folders) for a folder whose name contains "everest" (any capitalisation) and contains an index.html.
- If several match, pick the one containing the AC unit / room temperature 32°C → 26°C animation. If none match, search my home folder for HTML or JS files containing "ROOM TEMPERATURE" or a 32 → 26 countdown.
- Only ask me if you still can't find it. Tell me which folder you used.

4. BUILD THE SITE
Plain HTML, CSS and JavaScript, hosted later on GitHub Pages. You may use GSAP with ScrollTrigger (from cdnjs or included locally) and Lenis for smooth scrolling. Build the WHOLE site now, but work through the sections IN ORDER: finish, test and screenshot each section at 1440px and 390px wide before starting the next. Fix any problem before moving on.

THE CONCEPT
One continuous ink line runs through the entire page, like a single pen that never lifts. It writes four phrases, flows into drawings of my website styles, and ends with a chat box where the visitor tells me what they need. Everything is driven by scrolling.

GLOBAL LOOK
- Background: warm off-white #F7F5F0. Line: deep ink navy #1F3A5F. Same stroke thickness throughout, round ends and joins.
- Every drawn line has a shadow: a copy in soft grey, about 2–3px below, slightly blurred and semi-transparent, drawn a tiny moment behind the main line, so it looks like natural ink on paper. Subtle and realistic, never like a duplicate line.
- A small studio name mark top left ("Toff Studio" for now), always visible and unobtrusive.
- Calm, spacious, premium. Lots of empty space.

GLOBAL MOTION RULES (every section)
- Laptops/desktops: animations are driven by scrolling, at a smooth, natural speed, never rushed, starting only when that part is on screen.
- Phones: each part plays by itself when it comes into view, at a natural speed.
- Once something has drawn or played, it never reverses or replays when scrolling back up; it stays on its final state. Coming back to the page from another page may reset it.
- Scrolling is continuous everywhere EXCEPT the finale (Section 5), which may pin briefly while it plays. Keep that one pin smooth.
- The page always opens at the very top.
- If the visitor has "reduce motion" turned on, show every section finished, with no animation.

SETTINGS
Put every adjustable value in one file, settings.js: studio name, colours, stroke width, shadow offset/blur/opacity, the font for each phrase, drawing speeds, section order, which style sections are shown, links, email, and whether the chat box is live or demo. I must be able to change any of these without touching other code.

SECTION 1: THE HANDWRITING OPENING
- Four phrases, starting top left and moving down and to the right in a zigzag, all joined by the one continuous line (it leaves the end of one phrase and flows in a natural curve to the start of the next):
  1. "You plan"
  2. "WE DESIGN" (capitals)
  3. "We deliver"
  4. "So... what will it be?"
- Each phrase is drawn like a real pen: letter by letter, left to right, each stroke in the direction a hand would draw it. Dots on i's and crosses on t's come just after their word. Do NOT animate font outlines (that traces each letter's edge twice and looks wrong).
- Use SINGLE-LINE (single-stroke) fonts such as the Hershey and EMS fonts from Inkscape's Hershey Text extension, converted to SVG paths. Confirm each font's licence allows commercial web use and record it in CREDITS.md.
- Fonts:
  1. "You plan": flowing single-line cursive, like the handwriting on lemonade.com/giveback-2019 (EMS Allure)
  2. "WE DESIGN": single-line sans capitals, wide letter spacing, like an architect's lettering (Hershey Sans 1-stroke)
  3. "We deliver": single-line serif italic (Hershey Serif Medium Italic)
  4. "So... what will it be?": relaxed, friendly single-line handwriting (choose the best casual script available)
- Also create fonts-preview.html showing all four phrases in every available single-line font, labelled, so I can swap choices later in settings.js. Don't wait for me; build with the choices above.
- Phones: phrases stack vertically, still joined by the line, larger relative to the screen.
- The phrases also exist as real text for screen readers and search engines (visually hidden heading); the SVG is decorative.

SECTION 2: STYLE ONE (BLUEBIRD WELLNESS)
- Use assets/face-line.svg exactly as provided. It is already traced as single pen strokes; do not redraw, retrace or replace it with an image. You may scale it and restyle its stroke colour/width/shadow to match the global settings, but keep every path's shape.
- face-main is the continuous line: it enters at the top centre and leaves at the bottom centre. Connect it seamlessly to the line coming from Section 1 (top) and the line going to Section 3 (bottom), so the whole page is one unbroken line.
- face-main draws top to bottom in one stroke. Each other path (eyebrow, eye, nostril, lip-1 to lip-3, jaw) draws left to right at the moment face-main reaches its height (its data-y attribute), so the details appear as the pen passes them.
- All strokes get the same grey shadow as the rest of the site.
- Beside it (left on laptop, below on phone), a caption: "Bluebird Wellness" / "Doctor-led IV clinic, London" / "View the live site →" linking to https://toffzzzz.github.io/bluebird-wellness/ (new tab).

SECTION 3: STYLE TWO (EVEREST CLIMATE SOLUTIONS)
- Use the Everest folder from step 3.
- Find the air-conditioning animation on the Everest site: the AC unit whose flap opens while the room temperature counts down from 32°C to 26°C, with the background changing from peach to cream and the number from orange to brown.
- COPY that animation as faithfully as possible: the same images, animation code and logic, timings, easing, colours, fonts and layout. Do not rebuild or approximate it. Adapt only what's needed to work here (file paths, clashing class names, fitting into this page's scroll system).
- Copy every image it uses into assets/everest/ (copy only; never change anything in the Everest folder).
- Keep the global motion rules: scroll-driven on laptop, plays by itself on phone, never reverses once played.
- The continuous line from Section 2 flows into this section and ends where the AC unit appears, then continues from below it towards the next section.
- Caption: "Everest Climate Solutions" / "Air conditioning installation" / "View the live site →". If the Everest folder is a git repo with a GitHub Pages site, use that live URL; otherwise put a placeholder in settings.js and hide the link until I add it.
- In README.md, list exactly which Everest files you copied and what you changed.

SECTION 4: MORE STYLES (PLACEHOLDERS)
- Two more style slots after Everest, same structure (artwork, caption, link), switched off in settings.js. When off, they don't appear and the line flows straight from Section 3 to Section 5.
- In README.md, explain exactly what files and settings switch one on.

SECTION 5: FINALE
- After the last style, small previews of each style (the finished face, the AC unit at 26°C, any extra styles) slide in from the left and right and meet in a neat row in the centre.
- The row then shrinks and moves up to the top of the screen, where it stays.
- In the middle of the screen, "Tell us what you need" is written by the same continuous line in the friendly script from phrase 4, so the pen finishes here.
- A full-width rounded chat box rises from the bottom: a large text box with placeholder "A website for my clinic, with online booking…", a send button, a short privacy note and a consent tick box.
- This section may pin while it plays (the only one that does). On phones: previews in a smaller row or 2×2 grid, and the chat box sits comfortably above the keyboard when typing.
- settings.js has chatMode: "demo" or "live".
  - demo (default): on send, show "Thanks! We'll be in touch soon." and send nothing anywhere. Show a small note "Demo: please don't enter personal details yet".
  - live: send the message to my email via a simple form service (e.g. Formspree, endpoint in settings.js). Only allow live mode once a privacy policy link is set in settings.js.

FOOTER
- Studio name, email (placeholder in settings.js, hidden until filled), and "© 2026 Toff Studio".

FILES
- index.html, styles.css, script.js, settings.js, CLAUDE.md, DESIGN.md, DECISIONS.md, CHECKLIST.md, CREDITS.md, README.md, fonts-preview.html, a folder for generated SVG paths, and rounds/.

5. FINAL CHECKS
- Scroll the whole page start to finish at 1440px and 390px; screenshot key moments of each section and check them yourself.
- Confirm: the line is continuous from the first phrase to the final heading; every letter draws in natural pen order with no outline double-tracing; the face matches face-line.svg exactly; the AC animation matches the Everest original; nothing reverses when scrolling up; only the finale pins; reduced-motion shows everything finished; captions and links work; the chat box works in demo mode and sends nothing; nothing overlaps on phone; colour contrast passes WCAG AA; keyboard navigation works.
- Run every item in CHECKLIST.md.
- Fix anything that fails and re-check.
- Make sure DESIGN.md matches settings.js and DECISIONS.md is up to date.
- Commit everything to git: "Round 01: full site build".

6. OPEN IT FOR ME
- Start a local web server in the background from the toff-portfolio folder on port 8000 (e.g. python3 -m http.server 8000) and leave it running.
- Open http://localhost:8000 in my default browser.
- Find my Mac's Wi-Fi address (e.g. ipconfig getifaddr en0) and give me the exact link to type on my phone on the same Wi-Fi.

7. REPORT BACK
In plain English, short and clear:
- Where the project folder is and which Everest folder you used
- What you built in each section, and anything you couldn't do or had to approximate
- What you added to ~/.claude/CLAUDE.md
- The laptop and phone links
- A numbered list of anything you need from me
