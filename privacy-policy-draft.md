# Privacy policy: draft

**Status: draft, not published.** This is the start of the site's privacy policy. It is not linked from the site, and the enquiry stays in demo mode until a finished policy is published and `legal.privacyPolicyUrl` is set in `settings.js`. The owner still needs to add the studio's legal name and contact details, what the enquiry collects and why, how long it is kept, visitors' rights and how to ask for data to be deleted.

## Sketches drawn in "Sketch your homepage"

When you press "I'm done" in "Sketch your homepage", your sketch and the words you typed on it are sent to Anthropic's Claude so it can read what you drew and build the preview. What is sent:

- the sketch itself: the pen lines, as a picture, and their positions on the paper;
- the blocks you placed on the paper (menu bar, headings, buttons and so on), with their positions and any words you typed into them;
- the kind of business and the style chosen in "Try a look for your business" (for example "café, calm"), so the preview matches.

No name, email address or other personal details are asked for, and nothing is sent until you press "I'm done" (and only if you drew something with the pen).

The sketch goes through a small Cloudflare Worker that Toff Studio runs, which passes it to Anthropic and returns the reading. The site does not store your sketch, and neither does the Worker. Anthropic processes it under its own terms and privacy policy (anthropic.com/legal/privacy).

Like any web server, Cloudflare sees your device's IP address when the sketch is sent. The Worker uses it only to count requests, so that no one can send more than 20 a minute (sketches and questions to the AI assistants demo together). For that, it keeps the times of your last requests (not their contents) for at most about a minute after your last one, then deletes them.

If the Worker can't be reached, your sketch is read by the page itself, on your device, and nothing is sent.

## Questions typed into the AI assistants demo

When you ask a question in the AI assistants demo ("Your website can answer your customers for you"), it is sent to Anthropic's Claude to be answered. What is sent:

- your question, and the last few questions and answers of that conversation;
- the name and kind of the made-up business you picked, and the facts it has been taught, including any you edited.

The demo asks you not to type personal details. It goes through the same Cloudflare Worker as the sketches, with the same rate limit. Neither the site nor the Worker stores your questions or the answers. Anthropic processes them under its own terms and privacy policy (anthropic.com/legal/privacy).

If the Worker can't be reached, the demo answers from the facts on the page, on your device, and nothing is sent.
