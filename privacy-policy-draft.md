# Privacy policy: draft

**Status: draft, not published.** This is the start of the site's privacy policy. It is not linked from the site, and every form and enquiry stays in demo mode until a finished policy is published and `legal.privacyPolicyUrl` is set in `settings.js`. The owner still needs to add the studio's legal name and contact details, what the enquiry collects and why (once it goes live), how long it is kept, visitors' rights and how to ask for data to be deleted. COMPLIANCE.md has the technical detail behind each section.

## The short version

This site doesn't use cookies, trackers, analytics or adverts, and it loads nothing from other websites: its fonts, code and pictures are all stored with the site. The only time anything you do leaves your device is when you use one of the AI features described below, and then only what's listed there. None of it is stored by Toff Studio.

## The AI features

Several parts of the site use an AI, Anthropic's Claude, to answer you. Each one says so where you use it. When you use one, what you type goes through a small Cloudflare Worker that Toff Studio runs, which passes it to Anthropic and sends back the answer. Neither the site nor the Worker stores what you typed or the answers, and the Worker keeps no record of them. Anthropic processes them under its own terms and privacy policy (anthropic.com/legal/privacy).

Please don't type personal details into any of them. As a precaution, the Worker replaces anything that looks like an email address, a phone number or a name with "(removed)" before it reaches Anthropic.

### The assistants demo ("Your website can answer your customers for you")

When you ask the demo a question, it sends: your question; the last few messages of that conversation, including what the assistant did on the demo website beside it (for example, holding an appointment in the name "Guest"); and the name, kind and taught facts of the made-up business you picked, including any facts you edited. The businesses are made up, and nothing is booked or ordered for real.

### The studio's assistant ("Plan with us")

When you talk to the studio's assistant, it sends: the conversation (up to the last 16 messages); the brief it is building for you (your business, goals, the features you want, the look, your notes on anything you pointed at, the designs you sent, timing and budget range), but never pictures and never contact details; and a few facts about the studio. When you finish, the conversation and the brief are sent once more so the AI can write the brief's summary.

The assistant never asks for your name, email address or phone number. Those go into a separate contact step at the end, which is never sent to the AI. While the site is in demo mode, that step sends nothing at all; this policy will say what happens to it once enquiries go live. "Download your brief" makes the document on your device; nothing is sent.

### Design yours

- **Describe:** when you press "Show me", the sentence or two you typed is sent so the AI can sketch a website from it.
- **Sketch:** when you press "I'm done" (and only if you drew with the pen), your sketch is sent: the pen lines as a picture with their positions, the blocks you placed and any words you typed into them, and the kind of business and style you chose.
- **Pick** sends nothing.

### If the AI can't be reached

Every AI feature also works without the Worker: it answers from the page itself, on your device, and says so. Nothing is sent in that case.

### How many questions, and your IP address

Like any web server, Cloudflare sees your device's IP address when one of these requests is sent. The Worker uses it only to count requests, so that no one can send more than 20 a minute. For that, it keeps the times of your recent requests (not their contents) for about a minute after the last one, then deletes them. Each AI feature also stops answering live after 8 answers in one visit.

## Things your browser keeps

The site keeps a few small things in your own browser, never on a server:

- for this tab only (cleared when you close it): how many live AI answers you've used this visit, your choices in Design yours, and anything you did on a concept site (a basket, a booking, a chosen time);
- until you clear it: whether you switched the Lab's sound on.

## The concept sites

The five concept sites (Saltmarsh, Morrow Coffee, Atelier Wren, Hollis & Pine and Hart & Sons Plumbing) are made-up businesses. Their bookings, orders, baskets, checkouts, gift cards and quote forms are demonstrations: nothing is booked, ordered, charged or sent, and they keep their state only in your browser tab.

## The Lab

Everything in the Lab happens on your device. A screenshot you drop into "Sketch to site" never leaves it, and saved pictures download straight to your device.

## Enquiries

Still to be written by the owner before enquiries go live: what the contact step and the enquiry form collect (name, email, phone if given, and the brief), why, where they are sent (the form service), how long they are kept, who can see them, and how to ask for them to be deleted.
