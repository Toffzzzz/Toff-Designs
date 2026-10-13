# Compliance notes

What the site sends, to whom, what it keeps, and what is still needed before launch. Update this file whenever something starts sending or storing data. The privacy policy draft is in `privacy-policy-draft.md`.

## The short version

- Everything the site needs is self-hosted: fonts, scripts, libraries (three.js, Rapier), 3D code, pictures and captures. No page requests anything from another website when it loads or runs. There are no trackers, no analytics, no adverts and no cookies.
- The only outside requests are to Toff Studio's own Cloudflare Worker, and only when a visitor uses an AI feature (asks the AI demo something, talks to the concierge, describes or sketches a site in Design yours). The Worker passes the request to Anthropic (Claude) and returns the answer.
- Nothing a visitor types into an AI feature is stored by the site or by the Worker, and nothing is logged.
- Every form and enquiry is in demo mode: it sends and stores nothing until `chatMode` is `'live'` and both `formEndpoint` and `legal.privacyPolicyUrl` are set in settings.js.
- The concept sites are made-up businesses. Their bookings, orders, baskets and checkouts are demos: they send nothing and keep their state only in the visitor's own browser tab (sessionStorage).

## What leaves the visitor's device

| Part of the site | What is sent | To whom | Stored? | Status |
|---|---|---|---|---|
| The AI demo ("Your website can answer your customers for you"), route `/agent` | Only when the visitor asks something: the made-up business's key (café, salon, clinic or plumber), the facts it has been taught (as edited by the visitor, up to 24), up to 8 messages of that conversation including the actions the assistant took on the demo site and their results, and the question (up to 200 characters). Bookings are held in the name "Guest"; no action takes a name, email address, phone number or symptom. The demo asks visitors not to type personal details | Toff Studio's Cloudflare Worker (`toff-sketch-ai.toffdesigns.workers.dev`), which passes it to Anthropic (Claude) to be answered | Not stored by the site or the Worker. Anthropic processes it under its own terms | Live (Worker deployed 2026-10-13) |
| The concierge ("Plan with us" and the inline one under "Tell us what you need"), route `/concierge` | Only when the visitor writes to it: up to 16 messages of the conversation, the brief built so far (at most 4 KB: business, goals, must-haves, look, labels and notes of pins, short summaries of designs, timing, budget range, notes; never pictures, never contact details), and the studio's facts from settings.js (name, location, timeframes, prices, reply time, or that they aren't set). Its header says it's an AI, that questions go to Anthropic and aren't stored, and asks visitors not to type personal details | The same Worker, then Anthropic | Not stored by the site or the Worker | Live |
| The brief's summary, route `/brief` | When the visitor finishes with the concierge: the conversation's text (up to 16 messages) and the brief | The same Worker, then Anthropic | Not stored | Live |
| Design yours, Describe, route `/design` | When the visitor presses "Show me": the sentence or two they typed (up to 400 characters) | The same Worker, then Anthropic | Not stored | Live |
| Design yours, Sketch, route `/read-sketch` | When the visitor presses "I'm done" and has drawn with the pen: the sketch (the pen lines as a picture, with their positions), the blocks they placed and the words typed into them, and the business kind and style chosen | The same Worker, then Anthropic | Not stored | Live since 2026-10-12 (unchanged) |
| Round 04's chat demo, route `/chat` | No Round 05 page uses it; the route stays on the Worker, unchanged | | | Kept |
| The concierge's contact step and the short form ("Prefer a form? →") | Nothing: name, email and phone (optional) are never sent to the AI, and are sent nowhere at all until the enquiry is live | | No | Demo mode until `chatMode` is 'live' and `formEndpoint` and `legal.privacyPolicyUrl` are set |
| "Download your brief" | Nothing: the brief document is made on the visitor's device and downloads to it | | No | Live |
| Pointing at the page ("I want this") | Nothing: the snapshot of the pointed-at part is made on the device and stays in the brief on the page | | No | Live |
| The Lab's Sketch to site | Nothing: a screenshot dropped in never leaves the device | | No | Live |
| The Lab's other pieces and Your logo in one line | Nothing: everything is drawn on the device ("Save a product shot" and "save the sketch" download a picture to the device) | | No | Live |
| The concept sites' features (table booking, private dining enquiry, gift vouchers, order ahead, loyalty card, salon booking, gift card, shop, basket, checkout preview, instant quote, postcode check, booking a visit) | Nothing. Each says so where it matters ("A demo: nothing is booked or charged") | | Only in the visitor's own browser tab (sessionStorage), cleared when the tab closes | Demo |

### What the browser keeps

| Where | What | How long |
|---|---|---|
| sessionStorage (this tab only) | How many live answers the AI demo, the concierge and Describe have used this visit; Design yours' Pick choices; the concept sites' baskets, bookings, holds and choices | Until the tab is closed |
| localStorage | The Lab's sound switch (on or off, `toff-sound`) | Until the visitor clears it |

No cookies are set by the site.

## How the AI is protected

All AI goes through one Cloudflare Worker, `toff-sketch-ai`, kept outside the repo in `~/Documents/toff-studio-tools/optional-ai/` with its own tests.

- **The key:** the Anthropic API key lives only in the Worker's secret `ANTHROPIC_API_KEY`, never in the site's code, in git, in a log or in a message. The guard hook in `.claude/hooks/guard.py` blocks anything that looks like a key.
- **Which websites:** the Worker answers only https://toffzzzz.github.io and http://localhost:8000 (`ALLOWED_ORIGIN` in its wrangler.toml); anything else gets 403. A phone previewing the site over Wi-Fi is refused too, so the demos answer from the page there.
- **Model:** Claude Haiku 5.5 (`claude-haiku-5-5`) on every new route, with thinking switched off. The tools the AI may use are defined in the Worker for each business; tool definitions from the browser are never accepted.
- **What the AI may say:** the assistants answer only from the facts they're given, say they're an AI, and ignore attempts to change their rules. The clinic never gives medical advice (it offers to book, NHS 111, or 999 in an emergency). The concierge never asks for a name, email address or phone number, never quotes a price or a timeframe that isn't in settings.js ("Every project is quoted personally after a short call"), and never claims to be a person. /design and /brief never invent prices or opening hours.
- **Contact details removed twice:** the concierge removes anything that looks like an email address, a phone number or a stated name before a request leaves the page, and the Worker replaces any it still finds with "(removed)" before anything reaches Anthropic.
- **Size limits:** every request body is at most 32 KB, every field is capped (questions 200 characters, facts 24, history 8 or 16 messages, the brief 4 KB, Describe 400 characters), and each answer is capped (600 tokens for /agent and /concierge, 1,500 for /brief, 2,000 for /design). The call to Anthropic times out after 15 seconds. Errors come back as plain JSON, never Anthropic's own error text.
- **Nothing stored:** the Worker keeps no requests and no answers, and logs nothing about them.
- **Per visitor:** at most 20 requests a minute per IP address across every route, enforced by an exact counter in the Worker (`SKETCH_COUNTER`, a Durable Object per IP address), checked before anything is sent to Anthropic. The 21st gets 429 and never reaches Anthropic. If the counter can't answer, nothing is sent (503). For this, Cloudflare sees the visitor's IP address and the counter keeps only the times of that address's recent requests (not their contents), for about a minute after the last one. Cloudflare's built-in rate limiter (`SKETCH_LIMIT`) is also bound.
- **Per visit, on the page:** at most 8 live answers each for the AI demo, the concierge and Describe (a whole answer with its actions counts as one); then the page answers by itself.
- **Per day:** each new route has a cap on calls per UTC day, counted in the same counter class (no new class, no migration). Above the cap the Worker answers 429 and the page answers by itself.
- **Per month:** the Anthropic account's $100 monthly spend limit, with an email alert (set by the owner on 2026-10-12), is the last line of defence.

### The daily caps and what they could cost

Worst case per call, at Haiku 5.5 prices ($0.10 per million input tokens, $0.50 per million output tokens). Input: a body is at most 32,768 bytes, so at most 32,768 tokens come from the visitor, and the Worker's own system prompt, tools and schema add under 4,000; call it 37,000 tokens, priced as a cache write ($0.125 per million): $0.004625. /design forwards only the visitor's sentence (at most 400 characters), so its input is at most 4,400 tokens: $0.00055. Output: `max_tokens` × $0.50 per million (thinking is off, so that is all of it).

| Route | Calls a day (UTC) | Worst case per call | Worst case a day |
|---|---|---|---|
| /agent | 300 | $0.004625 + 600 out ($0.0003) = $0.004925 | $1.48 |
| /concierge | 150 | $0.004625 + 600 out ($0.0003) = $0.004925 | $0.74 |
| /brief | 40 | $0.004625 + 1,500 out ($0.00075) = $0.005375 | $0.22 |
| /design | 120 | $0.00055 + 2,000 out ($0.001) = $0.00155 | $0.19 |
| **Total** | | | **$2.62 a day** (under the $3 target) |

Real calls are far smaller (a few thousand tokens), so a real day costs a small fraction of that. /read-sketch and /chat have no daily cap (unchanged since round 04), only the 20-a-minute limit per visitor.

### Switching the AI off

- One feature: set its address in settings.js to `''` (`ai.agentEndpoint`, `ai.conciergeEndpoint`, `ai.briefEndpoint`, `ai.designEndpoint`, `ai.readSketchEndpoint`, `ai.chatEndpoint`) and push. That part answers from the page and says so.
- Everything from the site: set `ai.workerBase` to `''`.
- Everything at once, without touching the site: revoke the key at console.anthropic.com. Every AI part falls back quietly.

## Self-hosting audit (third-party code and requests)

| What | Where it comes from | Sends anything? |
|---|---|---|
| Fonts (Cormorant Garamond, Work Sans, Inter, and each concept site's own) | Self-hosted woff2 files in the repo | No |
| three.js r186 | `vendor/three/` | No |
| Rapier 2D 0.19.3 (WebAssembly inlined in the file) | `vendor/rapier/rapier2d/` | No |
| axe-core 4.14.0 | `tests/vendor/`, used only by the tests, never by a page | No |
| The Cloudflare Worker | Toff Studio's own; called only when a visitor uses an AI feature | Yes, as described above |
| Anthropic (Claude) | Reached only through the Worker, never from the visitor's browser | Processes the AI requests above |

The `pages` test suite fails if any page requests anything from another website (it blocks the Worker).

## Still needed before launch

Privacy policy (finish and publish the draft), terms, refund policy, cookie policy (a cookie banner only if anything non-essential is ever stored), consent on the enquiry form before it goes live, business details (company name, number and address), a real email address, a way to ask for data to be deleted, age consent if children's data could ever be collected, unsubscribe links if any emails are sent, and confirmation of the licence for the example photos in `assets/studio/playground/` (CREDITS.md). The concept sites' stand-in photos look AI-made; they show made-up businesses only and are to be replaced (IMAGE-PROMPTS.md).
