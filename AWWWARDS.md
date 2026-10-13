# Awwwards submission

Everything needed to submit the site to awwwards.com, ready to paste. Submit only after the site is live (after "ship it"), from the live address.

## What awwwards.com asks for (checked 13 October 2026)

From its FAQ (awwwards.com/faqs/): the main image thumbnail is **1600 × 1200 px**, and 1600 × 1200 is also the ideal size for any extra images; you can choose which parts of the site to show, and videos are "highly recommended". Collaborators are credited by their Awwwards username in "Additional credits", in the first step of the form. The form itself (the website's details, then review and checkout) is only visible once signed in, so its exact fields weren't seen; the answers below cover the usual ones. A standard submission is paid (the price is on awwwards.com/submit/).

## The submission

**Website address:** https://toffzzzz.github.io/Toff-Designs/ (or the studio's own domain, once `siteUrl` in settings.js has changed)

**Title:** Toff Studio

**Short description** (about 300 characters):

> A small web design studio in London. Every site starts as a pencil sketch: paint one of our sites back from its sketch, watch an AI assistant take an order on a café's real website, design your own in three ways, and open five complete concept sites built for businesses we made up.

**Longer description** (if the form has room):

> Toff Studio's portfolio is something you use rather than read. The first screen draws one of our sites as a pen-and-pencil sketch in a WebGL shader, and your pointer paints the finished site back in. The pen then writes our clients' names beside films of their real sites. Five concept sites (a restaurant, a café, a hair studio, a shop and a plumber) each have their own art direction and one signature moment, from steam rising off a dish to a vase drawn live in three.js. The AI chapter shows an assistant acting on those real sites: filling a basket, holding an appointment, requesting a visit. Design yours turns a sentence or a sketch into a website, and a concierge turns a conversation into a brief. Everything is self-hosted, keyboard accessible and tested, and it respects reduced motion.

**Tags:** Portfolio, Web design studio, Agency, WebGL, Interaction design, AI, Storytelling, Typography, Animation, Dark, Minimal, Small business

**Technologies** (if asked): HTML, CSS, JavaScript (ES modules, no build step), WebGL2, three.js r186, WebGPU (A million specks, where supported), Rapier, View Transitions API, Cloudflare Workers, the Claude API (Anthropic), Playwright (tests)

**Category:** Design agencies / Portfolio (whichever the form offers)

**Country:** United Kingdom

**Credits line:**

> Design and development: Toff Studio, London.

Add the owner's own Awwwards username under "Additional credits". If you'd like to say how it was built, a true optional line is: "Built with Claude Code."

## Which pages to show

In this order (the first image is the thumbnail):

| Image | Page | What it shows |
|---|---|---|
| `01-home-hero.jpg` | Home, first screen | The headline and the stage half painted: the sketch on one side, the finished site on the other. **The thumbnail.** |
| `02-home-work.jpg` | Home, Recent work | The pen writing "Bluebird Wellness" beside the case film |
| `03-home-concepts.jpg` | Home, Concept sites | The editorial list, with a site's preview window |
| `04-home-ai.jpg` | Home, AI | The assistant beside the café's real site in its frame |
| `05-home-design-yours.jpg` | Home, Design yours | Pick, Sketch, Describe and the laptop and phone preview |
| `06-home-how-we-work.jpg` | Home, How we work | The cream-paper section with its process line |
| `07-concept-saltmarsh.jpg` | work/saltmarsh/ | The steam over the hero dish, the menu card |
| `08-concept-morrow.jpg` | work/morrow/ | Build your drink |
| `09-concept-atelier-wren.jpg` | work/atelier-wren/ | The editorial first screen |
| `10-concept-hollis-and-pine.jpg` | work/hollis-and-pine/ | The vase in 3D |
| `11-concept-hart-and-sons.jpg` | work/hart-and-sons/ | The instant quote |
| `12-lab-index.jpg` | lab.html | The Lab as a gallery wall |
| `13-lab-gold.jpg` | lab.html#gold | Your initials in liquid gold |
| `14-case-bluebird.jpg` | work/bluebird/ | A case study |
| `15-phones.jpg` | Home and Saltmarsh on a phone | Three phone screens side by side |

All are 1600 × 1200 JPEGs in `handover/awwwards/` (not committed). The single phone screens (1170 × 2532) are in `handover/awwwards/mobile/`, and `handover/awwwards/sheet.jpg` shows everything at once. To make them again after a change: `python3 tools/capture/awwwards.py` (or, for some only, `python3 tools/capture/awwwards.py home-ai lab`). The screenshots are taken with the Worker blocked, so nothing is sent anywhere: the AI demo shows its opening exchanges, which are written into the page.

**Video:** use the two screen recordings in `handover/` (the home page on a laptop and on a phone), trimmed to the hero being painted, the pen writing, the AI acting on the café's site and a concept site's signature moment.

## Before submitting

- The site is live and every test suite passes on main.
- The legal pages, the real email address and company details are in place (COMPLIANCE.md); jurors and visitors will look at the footer.
- `links.everest` is set if the Everest site is live by then.
- The images are made again from the live version (`python3 tools/capture/awwwards.py` on main) and looked at.
- Lighthouse on the live home page: performance TO FILL (desktop) / TO FILL (mobile), accessibility TO FILL, best practices TO FILL, SEO TO FILL.
- The final cold review: design-critic TO FILL for Design, Usability, Creativity and Content.
