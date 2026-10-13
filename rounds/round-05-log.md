# Round 05 log

## Phase 0: safety, branch and tools (2026-10-13)

Done:
- git status clean apart from rounds/round-05.md. git pull (up to date), branch backup-before-round-05 created from main, switched to new branch round-05.
- .gitignore extended (.claude/settings.local.json, .claude/ship-approved, .claude/worktrees/, scratch/, handover/, test-results/, .wrangler/, *.zip).
- .claude/hooks/guard.py written from Appendix D (extracted programmatically, byte for byte). Tested: "git add ." exits 2, "git status" exits 0. Then .claude/settings.json written, last.
- Five subagent files written to .claude/agents/ from Appendix E. They don't appear in this session's Agent list, so briefs use the general-purpose agent with the file's instructions pasted at the top.
- Tools: Python 3.12.5 with playwright, pillow, numpy; Node 24.15.0 and npx; Google Chrome installed (Lighthouse can use it); Playwright Chromium 1243 and 1248 in the cache; ffmpeg NOT installed (recordings stay WebM; Playwright's own ffmpeg is only for recording); `npx wrangler whoami`: logged in to Cloudflare.
- Everest local folder ~/Downloads/everest-climate-solutions exists (checked with test -d only).

Refused by the permission checker (auto mode):
- Editing CLAUDE.md (Phase 0 step 6: the refined assets/ rule and the "Round 05 is in progress" line) was refused as "Self-Modification". Not retried; skipped. CLAUDE.md is unchanged. The guard hook and section 3 enforce the refined rule anyway. Owner to make this edit (or allow it) later; Phase 10's CLAUDE.md rewrite depends on it too.

Next: Phase 1 (research, plan, contracts, style frames).

## Phase 1: research, direction and contracts (2026-10-13)

Done (by a subagent; reviewed by the lead, including the style frame scratch/phase1/frames/shot-hero-1440v2.png):
- Current site captured at 390 and 1440 (scratch/phase1/current/sheet-*.png). What works and what doesn't:

Captured with scratch/phase1/capture_current.py (viewport frames while scrolling). Contact sheets: scratch/phase1/current/sheet-index-1440.png, sheet-index-390.png, sheet-lab-1440.png, sheet-lab-390.png.

Measured length: index.html is 13.8 screens at 1440×900 and 16.7 screens at 390×844; lab.html is 5.8 and 6.2.

Works:
- The headline "We sketch it. Then we build it." with "build" in gold italic: the one memorable typographic moment. Keep it, larger.
- The palette holds together; the cream-paper How it works with its torn edge is the only real change of tone and it lands.
- The AI assistants demo has real substance (facts, "From:" sources, editable panel). It is the most convincing part for a business owner.
- The footer signature and the craft line feel personal and true.
- The Lab's liquid-gold T and gold-speck lettering look expensive.

Doesn't work:
- Screens 2 to 5 at 1440 are mostly empty midnight with a thin line and small cards: four screens that show almost nothing. On phones, two consecutive frames are completely empty while the pen hasn't reached them; it reads as a broken page.
- The opening stage is small (about 45% of the width) and draws a mock café, not our work.
- The floating "Plan with us" button sits over text on phones (Recent work, the concept rows).
- Every section has the same shape: heading on the left, paragraph on the right, content below. Section headings are timid (about 40px at 1440).
- Concept studies are cramped thumbnails with cropped headlines; the four tools are hidden behind tabs with small previews.
- "Tell us what you need" is caught half-written ("Tel") when the visitor arrives at a normal pace; a large gap sits above the enquiry.
- The Lab is one long stacked page with no index; the pieces compete with each other.

- Ten Awwwards references researched (plan section 2), storyboard, design system, five art directions, the Lab's exhibition design, technical plan, risks: rounds/round-05-plan.md.
- Contracts written: A (message API, plan section 10) and B (SiteKit spec, /design and /brief schemas, plan section 11). Anthropic structured-output limits checked against the live docs (at most 24 optional parameters, 16 union-type parameters per request; minItems 0 or 1).
- Style frames: hero (1440, 390) and Saltmarsh's first screen; cold critique hero v1 6.5/6/7.5/7, hero v2 7.5/7.5/8/7.5, Saltmarsh 7/7.5/5.5/7. Findings folded into the plan (section 12).
- Worker folder backed up to ~/Documents/toff-studio-tools/optional-ai-backup-2026-10-13/ (Phase 6 step 1, done early).

Next: Phase 2 (foundations). The shader, vendoring and serve.py --gzip were started in parallel during Phase 1.

## Phase 2 (partial) and Phase 6 steps 1 to 5 (2026-10-13)

- Phase 2 done so far (subagents, reviewed by the lead): tools/serve.py --gzip; three.js r186 (0.186.1) and Rapier 2D/3D 0.19.3 vendored (minified with esbuild, licences beside them; note in scratch/phase2-shader/VENDOR-NOTE.md for CREDITS.md); assets/shared/sketch-shader.js (raw WebGL2, mask only grows, 98% done, dispose loses the context; looked at Bluebird, Everest and phone results); assets/shared/embed-api.js (Contract A, 61/61) and ribbon.js/ribbon.css (101/101, axe clean). In progress: tokens/motion/shell, SiteKit.
- Contract A gained the error code `internal`; the Worker's browser-facing API is in plan section 13.
- Worker: backed up to ~/Documents/toff-studio-tools/optional-ai-backup-2026-10-13/. /agent, /concierge, /brief and /design added (claude-haiku-5-5, thinking disabled, prompt caching, tools defined in the Worker, structured output for /brief and /design, daily caps /agent 300, /concierge 150, /brief 40, /design 120 per UTC day in the existing SketchCounter class; worst case $2.62 a day). No new classes or migrations; wrangler.toml unchanged.
- Worker tests: test-round-05-routes.mjs 146/146, test-sketch-ai-worker.mjs 33/33, test-sketch-counter.mjs 12/12.
- Deployed with `npx wrangler deploy` (version 39b20053-dccb-4040-8c48-e5f5e1472c2a). Live checks (Origin https://toffzzzz.github.io): /chat 200 with an answer, /read-sketch 200 with elements (so no rollback); /agent and /concierge 200 streaming text/event-stream; /brief and /design 200 JSON; Origin https://example.com 403; 21 invalid requests within a minute: the first 20 got 400, the 21st 429. Python needed the system certificates (/etc/ssl/cert.pem). The key was never read or printed.
- Phase 3 started: five site-builders running in parallel.
