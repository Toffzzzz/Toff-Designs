# Compliance notes

What the site sends, to whom, and what is still needed before launch. Update this file whenever something starts sending or storing data. The privacy policy draft is in `privacy-policy-draft.md`.

## What leaves the visitor's device

| Part of the site | What is sent | To whom | Stored? | Status |
|---|---|---|---|---|
| Sketch your homepage (AI second look) | Only when the visitor presses "I'm done" and has drawn with the pen: the sketch (the pen lines, as a picture, with their positions), the blocks they placed and the words they typed into them, and the business kind and style picked in the playground. No personal details are asked for. (Round 04: before, it was sent when the visitor paused, and had no blocks or typed words.) | Toff Studio's Cloudflare Worker (`toff-sketch-ai.toffdesigns.workers.dev`, `/read-sketch`), which passes it to Anthropic (Claude) for processing | Not stored by the site or the Worker. Anthropic processes it under its own terms. Cloudflare sees the visitor's IP address; the Worker uses it only for the rate limit (20 requests a minute), keeping just the times of that visitor's last requests and deleting them about a minute after the last one. | **Live** since 2026-10-12 |
| AI assistants demo ("Your website can answer your customers for you") | Each question typed or picked in the demo, the last few turns of that conversation, the made-up business's name and kind, and the facts it has been taught (as edited by the visitor). The demo says "Please don't type personal details". | The same Cloudflare Worker (`/chat`), which passes it to Anthropic (Claude) to be answered | Not stored by the site or the Worker. Anthropic processes it under its own terms. Same IP rate limit as above (sketches and questions share the 20 a minute). | **Live** since Round 04 |
| The six-step enquiry | Nothing | — | No | Demo mode until `legal.privacyPolicyUrl` and `formEndpoint` are set |
| "Plan with us" planner | Nothing (the brief downloads to the visitor's own device) | — | No | Demo mode, same rule as the enquiry |
| Try a look for your business | Nothing | — | The chosen design (and any business name typed) is remembered in the visitor's own browser for that tab only (sessionStorage) | Live |
| Try it tabs | Nothing | — | Which of the four tabs was open is remembered in the visitor's own browser for that tab only (sessionStorage) | Live |
| The Lab's sound switch | Nothing | — | The on/off choice is remembered in the visitor's own browser (localStorage) | Live |
| Your logo in one line | Nothing (the image is turned into a line on the visitor's device) | — | No | Live |

Fonts, scripts and images are all self-hosted; nothing is loaded from other websites, and there are no trackers or cookies.

## The AI features (sketch second look and assistants demo): safeguards

- The Anthropic API key lives only in the Cloudflare Worker's secret `ANTHROPIC_API_KEY`, never in the site's code or in git.
- The Worker only answers this site (`ALLOWED_ORIGIN`). `/read-sketch` only takes PNG sketches; `/chat` takes a question of at most 200 characters, up to 24 facts and the last 6 turns, and answers in at most three short sentences.
- The chat assistant answers only from the facts it is given, says it is an AI, never gives medical advice (the clinic says to call NHS 111 or 999), and ignores attempts to change its rules.
- Rate limit: 20 requests (sketches and chat questions together) per 60 seconds per IP address, enforced by an exact counter in the Worker (a Durable Object per IP), checked before Anthropic on both routes; the 21st gets 429 and never reaches Anthropic. If the counter can't answer, nothing is sent (503). Cloudflare's built-in rate limiter is also bound, but it didn't enforce on this account in testing (2026-10-12). Live check on `/chat` after the Round 04 deploy: the 21st request in a minute got 429.
- The chat demo also asks Claude at most 8 times per page visit, then answers from the facts on the page.
- Anthropic monthly spend limit: $100, with an email alert (set by the owner on 2026-10-12).
- To switch the sketch AI off: delete the `ai: { … }` option from the Draw your site mount in `index.html` (and `assets/studio/site.html`) and push.
- To switch the live chat off: delete `endpoint: '…/chat'` from the `AIAssist.mount(…)` line in `index.html` and push; the demo then answers from its facts on the page.
- Revoking the key at console.anthropic.com stops every call; both demos then quietly fall back to their own answers.

## Still needed before launch

Privacy policy (finish and publish the draft), terms, refund policy, cookie policy, a cookie banner if anything non-essential is ever stored, consent on the enquiry form, business details, a way to ask for data to be deleted, and confirmation of the licence for the example photos in `assets/studio/playground/` (see CREDITS.md).
