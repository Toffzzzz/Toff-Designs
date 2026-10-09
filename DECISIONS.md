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
