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
