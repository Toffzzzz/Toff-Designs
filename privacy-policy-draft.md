# Privacy policy: draft

**Status: draft, not published.** This is the start of the site's privacy policy. It is not linked from the site, and the enquiry stays in demo mode until a finished policy is published and `legal.privacyPolicyUrl` is set in `settings.js`. The owner still needs to add the studio's legal name and contact details, what the enquiry collects and why, how long it is kept, visitors' rights and how to ask for data to be deleted.

## Sketches drawn in "Sketch your homepage"

When you draw in "Sketch your homepage" and pause, your sketch is sent to Anthropic's Claude so it can read what you drew and improve the preview. What is sent:

- the sketch itself: just the pen lines, as a picture, and their positions on the paper;
- the kind of business and the style chosen in "Try a look for your business" (for example "café, calm"), so the preview matches.

No name, email address or other personal details are sent with it, and nothing is sent until you draw.

The sketch goes through a small Cloudflare Worker that Toff Studio runs, which passes it to Anthropic and returns the reading. The site does not store your sketch, and neither does the Worker. Anthropic processes it under its own terms and privacy policy (anthropic.com/legal/privacy).

Like any web server, Cloudflare sees your device's IP address when the sketch is sent. The Worker uses it only to count requests, so that no one can send more than 20 sketches a minute. For that, it keeps the times of your last sketches (not the sketches themselves) for at most about a minute after your last one, then deletes them.

If the Worker can't be reached, your sketch is read by the page itself, on your device, and nothing is sent.
