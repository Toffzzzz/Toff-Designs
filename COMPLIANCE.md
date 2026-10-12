# Compliance notes

What the site sends, to whom, and what is still needed before launch. Update this file whenever something starts sending or storing data. The privacy policy draft is in `privacy-policy-draft.md`.

## What leaves the visitor's device

| Part of the site | What is sent | To whom | Stored? | Status |
|---|---|---|---|---|
| Sketch your homepage (AI second look) | The sketch (just the pen lines, as a picture, with their positions) and the business kind and style picked in the playground. No personal details. | Toff Studio's Cloudflare Worker (`toff-sketch-ai.toffdesigns.workers.dev`), which passes it to Anthropic (Claude) for processing | Not stored by the site or the Worker. Anthropic processes it under its own terms. Cloudflare sees the visitor's IP address; the Worker uses it only for the rate limit (20 sketches a minute), keeping just the times of that visitor's last sketches and deleting them about a minute after the last one. | **Live** since 2026-10-12 |
| The six-step enquiry | Nothing | — | No | Demo mode until `legal.privacyPolicyUrl` and `formEndpoint` are set |
| "Plan with us" planner | Nothing (the brief downloads to the visitor's own device) | — | No | Demo mode, same rule as the enquiry |
| Try a look for your business | Nothing | — | The chosen design (and any business name typed) is remembered in the visitor's own browser for that tab only (sessionStorage) | Live |
| The Lab's sound switch | Nothing | — | The on/off choice is remembered in the visitor's own browser (localStorage) | Live |
| Your logo in one line | Nothing (the image is turned into a line on the visitor's device) | — | No | Live |

Fonts, scripts and images are all self-hosted; nothing is loaded from other websites, and there are no trackers or cookies.

## The AI second look: safeguards

- The Anthropic API key lives only in the Cloudflare Worker's secret `ANTHROPIC_API_KEY`, never in the site's code or in git.
- The Worker only answers this site (`ALLOWED_ORIGIN`), and only takes PNG sketches.
- Rate limit: 20 sketches per 60 seconds per IP address, enforced by an exact counter in the Worker (a Durable Object per IP); the 21st gets 429 and never reaches Anthropic. If the counter can't answer, the sketch isn't sent. Cloudflare's built-in rate limiter is also bound, but it didn't enforce on this account in testing (2026-10-12).
- Anthropic monthly spend limit: $100, with an email alert (set by the owner on 2026-10-12).
- To switch it off: delete the `ai: { … }` option from the Draw your site mount in `index.html` (and `assets/studio/site.html`) and push. Revoking the key at console.anthropic.com also stops every call; the site then quietly uses its own instant reading.

## Still needed before launch

Privacy policy (finish and publish the draft), terms, refund policy, cookie policy, a cookie banner if anything non-essential is ever stored, consent on the enquiry form, business details, a way to ask for data to be deleted, and confirmation of the licence for the example photos in `assets/studio/playground/` (see CREDITS.md).
