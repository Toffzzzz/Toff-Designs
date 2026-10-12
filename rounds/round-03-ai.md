This is a follow-up to Round 03 in my Toff Studio portfolio repo (folder "toff portfolio", github.com/Toffzzzz/Toff-Designs). Round 03 must already be finished and pushed. Your job: switch on the optional AI "second look" for the Draw your site section, using Claude Haiku through a small Cloudflare Worker, so my Anthropic API key never appears in the website's code.

SAFETY RULES (these always apply)
- Only work inside the toff portfolio folder and ~/Documents/toff-studio-tools/. Never touch the Everest project folder, the bluebird-wellness folder, or anything else.
- The API key must NEVER be written into any file, commit, command line, log or chat message. The only place it goes is the Cloudflare secret, typed or pasted by me into the terminal prompt that wrangler shows. If you ever see the key in a file or in git, stop and tell me.
- Never "git add ." or "git add -A". Never "git push --force". Before you start, run git status. If anything is uncommitted, show me and stop. Then make a backup branch: git branch backup-before-sketch-ai.
- Nothing else on the site starts sending data. Only the sketch (the pen lines as a picture, with no names, emails or other personal details) goes to the Worker.

STEP 1: DEPLOY THE WORKER
The worker file is ~/Documents/toff-studio-tools/optional-ai/sketch-ai-worker.js (from the Round 03 zip). Read the setup notes at the top of it.
1. In ~/Documents/toff-studio-tools/optional-ai/, create wrangler.toml:
   name = "toff-sketch-ai"
   main = "sketch-ai-worker.js"
   compatibility_date = "2026-10-01"
   [vars]
   ALLOWED_ORIGIN = "https://toffzzzz.github.io, http://localhost:8000"
2. Run: npx wrangler login. It opens a browser. Tell me to log in to Cloudflare, or to make a free account, and wait for me.
3. Run: npx wrangler deploy. Note the address it prints (https://toff-sketch-ai.<something>.workers.dev).
4. Run: npx wrangler secret put ANTHROPIC_API_KEY. Then tell me: "Paste your Anthropic API key into the terminal now and press Enter. It won't show as you paste." Wait for me. Don't type anything into that prompt yourself.
5. Check it works without showing the key: run node test-sketch-ai-worker.mjs (16 checks). Then send one real test request with a tiny PNG and the header Origin: https://toffzzzz.github.io to <worker address>/read-sketch. It should answer 200 with a list of elements. If it answers 401 or 403 from Anthropic, the key is wrong or revoked: tell me and stop. If it answers 503, the secret wasn't saved.

STEP 2: PROTECT MY BILL
These are dashboard settings, so give me exact click-by-click instructions and wait while I do them:
- Cloudflare dashboard → the toff-sketch-ai Worker → Settings: add a rate limiting rule of at most 20 requests per minute per IP address.
- console.anthropic.com → Settings → Limits (or Billing): set a monthly spend limit (I'll choose the amount).

STEP 3: SWITCH IT ON IN THE SITE
- In index.html, where Draw your site is mounted, add the AI option with the worker address:
  DrawSite.mount(document.getElementById('draw-your-site'), { getStyle: ..., ai: { endpoint: 'https://toff-sketch-ai.<something>.workers.dev/read-sketch' } });
  Keep the rest of the mount exactly as it is. The "Write a word: MAP, GALLERY, FORM…" item in the key then appears by itself.
- Do the same in assets/studio/site.html (the preview), so the two stay identical.
- Under the drawing paper, add one quiet line in the same style as the touch tip: "When you pause, your sketch (just the pen lines) is sent to Anthropic’s Claude to be read. It isn’t stored." Show it only when the AI option is on.
- Add the same fact to the privacy policy draft and to COMPLIANCE.md: sketches are sent to Anthropic for processing and not stored by the site.

STEP 4: TEST
Serve the repo (python3 -m http.server 8000) and run:
- python3 /tmp/toff-tests/tools/check-sketch-ai.py http://localhost:8000/assets/studio/site.html (18 checks; it uses a stand-in, so it doesn't spend credit)
- python3 /tmp/toff-tests/tools/check-round-03-features.py http://localhost:8000/index.html
Then test it for real once, in the browser at http://localhost:8000: draw a box with the word MAP written inside it, stop drawing, and wait about 3 seconds. The status line should end "Checked by AI" and a map should appear in the preview. Take a screenshot and look at it. Then turn your network off, or point the endpoint at a wrong address, and check the page still works with the instant reading and shows no errors. Put the right address back afterwards.

STEP 5: COMMIT AND PUSH
Run git status and look at every file. Add only index.html, assets/studio/site.html, the files with the new privacy line, COMPLIANCE.md and the privacy draft, by name. Never add wrangler.toml, .wrangler/, node_modules or anything from ~/Documents/toff-studio-tools. Commit "Draw your site: AI second look via Cloudflare Worker", then git push.

WHEN YOU FINISH, TELL ME
- the Worker address and that the secret is set (never show the key)
- the test results
- the rate limit and spend limit settings I confirmed
- how to switch it off quickly: delete the ai: { … } option from the mount in index.html and push. Even without that, revoking the key at console.anthropic.com stops all calls, and the site quietly falls back to the instant reading.
Don't end with offers or questions unless something is blocking.
