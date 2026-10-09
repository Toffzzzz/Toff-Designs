# Quality checklist

Run **every** item at the end of every round. When the owner reports a bug, add a check here that would have caught it. Preview with `python3 tools/serve.py 8000`, then test at **1440 × 900** (laptop) and **390 × 844** (phone, touch), screenshotting key moments of each section and looking at them.

## Whole page

- [ ] Scroll the whole page start to finish at 1440px and 390px; screenshot key moments of every section and check them.
- [ ] The line is continuous from the first phrase to the final heading: no gaps or jumps where sections meet (check in reduced motion, where everything is drawn).
- [ ] Nothing reverses or replays when scrolling back up (scroll to the bottom, scroll back up, everything stays drawn).
- [ ] Only the finale pins, and only on laptops; every other section scrolls continuously.
- [ ] The page opens at the very top, even after reloading partway down.
- [ ] Reduced motion (`prefers-reduced-motion: reduce`) shows every section finished, with no animation and no pin.
- [ ] Laptops: drawing starts only when that part is on screen and happens in the middle of the screen, not at the top edge.
- [ ] Phones: each part plays by itself when it comes into view, in order.
- [ ] No console errors at either width.
- [ ] Nothing makes the page wider than the screen: `document.documentElement.scrollWidth` equals the window width at 390px. *(Bug, round 01: previews waiting off-screen widened the phone page, which zoomed it out.)*

## Section 1: phrases

- [ ] Every letter draws in natural pen order, left to right, with no outline double-tracing (no letter drawn as two parallel lines). *(Round 01: Hershey "medium" fonts double their strokes; use the `…Single` versions.)*
- [ ] i/j dots and t crosses come just after their word.
- [ ] The joining line leaves each phrase heading downwards and never crosses back over the letters.
- [ ] Phones: phrases stack vertically, fit the screen width, and play as they come into view. *(Bug, round 01: start positions were counted twice, so phrases only played after scrolling past them.)*
- [ ] The hidden heading contains all four phrases as real text.

## Styles

- [ ] The face matches `assets/face-line.svg` exactly (same path data, only scaled/restyled); features draw left to right as the main line passes their height.
- [ ] The AC animation matches the Everest original: 32°C → 18°C in whole degrees, peach → page colour, terracotta → Deep Blue, flap closed → half (27°C) → open (22°C), "Room temperature" → "Just right".
- [ ] The line ends at the top of the AC unit and continues from below the readout.
- [ ] Captions and links work; links open in a new tab; the Everest link stays hidden until a URL is set.
- [ ] Phones: the line never crosses a caption (it runs down the right margin beside it).
- [ ] With `style3`/`style4` switched on (`show: true`), they appear, draw and join the line, and appear in the finale; with them off, the line flows straight from Everest to the finale.

## Finale and chat box

- [ ] Previews slide in, meet in a row, shrink to the top; the line writes "Tell us what you need" without crossing the previews; the chat box rises.
- [ ] Phones: previews in a small row (2) or 2 × 2 grid (3–4); the chat box stays above the keyboard while typing.
- [ ] Demo mode: empty message and missing consent show friendly errors; a valid send shows "Thanks! We'll be in touch soon." and **no network request is made**.
- [ ] Demo note "Demo: please don't enter personal details yet" is shown while in demo mode.
- [ ] Live mode cannot switch on without `chat.privacyPolicyUrl` and `chat.formEndpoint`.

## Accessibility

- [ ] Colour contrast passes WCAG AA (text 4.5:1, large text 3:1) for every text colour, including the placeholder and the Everest number on peach.
- [ ] Keyboard: Tab reaches the skip link, studio mark, every caption link, textarea, consent box and Send, in order, with a visible focus ring; the skip link finishes the finale and focuses the message box.
- [ ] Images have alt text (decorative ones have empty alt); SVG drawings are aria-hidden.
- [ ] Tap targets are at least 44px tall on phones.

## Privacy and files

- [ ] The page makes no requests to third parties (fonts and libraries are self-hosted).
- [ ] Every font and library licence is recorded in CREDITS.md.
- [ ] DESIGN.md matches settings.js; DECISIONS.md has a line for every decision made this round.
- [ ] Nothing outside this folder was changed; nothing in `assets/` was deleted.
- [ ] Commit everything with the round's message.
