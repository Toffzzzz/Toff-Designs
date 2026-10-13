"""Captures for the Lab piece "The making of this site" (lab.html#making).

    python3 tools/capture/making_of.py                 every round, 01 to 05
    python3 tools/capture/making_of.py --round 05      only round 05 (the current working tree)
    python3 tools/capture/making_of.py --round 02 --round 03

For each round it checks out that round's commit into a temporary git worktree
(scratch/worktrees/making-rNN), serves it read-only on a free port with a
ThreadingHTTPServer in a thread (every old round is plain static files: nothing is
built), opens it in Chromium with Playwright, waits for the opening to settle and
captures:

    rNN-laptop.webp           the first screen at 1440 x 900 (saved at 1.5x: 2160 x 1350)
    rNN-phone.webp            the first screen at 390 x 844 (saved at 2x: 780 x 1688)
    rNN-laptop-strip-K.webp   K = 1..4, a short scroll strip at 1440 x 900 (saved at 960 x 600)
    rNN-phone-strip-K.webp    K = 1..4, the same at 390 x 844 (saved at 1.5x: 585 x 1266)

Everything is written into scratch/making/captures/ first, then copied with these
stable names into assets/lab/pieces/making/ (the piece loads them by name). The
worktree is removed again with `git worktree remove` when the round is done, even if
the capture fails. Round 05 has no commit: it serves the repo as it stands.

Nothing is ever written into a worktree or into the repo apart from the files in
assets/lab/pieces/making/. Requests to other websites are blocked, so a capture
never depends on the network.
"""
import argparse
import functools
import http.server
import io
import json
import os
import shutil
import socket
import subprocess
import sys
import threading
import time
from contextlib import contextmanager

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCRATCH = os.path.join(ROOT, 'scratch', 'making', 'captures')
WORKTREES = os.path.join(ROOT, 'scratch', 'worktrees')
OUT = os.path.join(ROOT, 'assets', 'lab', 'pieces', 'making')

QUALITY = 78          # WebP quality
STRIP = 4             # frames in each scroll strip

# Which commit stands for each finished round, and how to capture it.
#   commit: the commit checked out into a worktree (None: the working tree as it is now)
#   motion: 'reduce' captures with prefers-reduced-motion (every round since 01 then shows its
#           finished state at once); 'normal' lets the opening play and waits `settle` seconds.
#   strip:  where the strip's frames sit, as fractions of the page's scrollable height
# Why these commits: see the comments, and the Lab piece's notes in assets/lab/pieces/making.js.
ROUNDS = {
    # "Round 01: full site build". The next two commits only add .nojekyll and round-02.md.
    '01': dict(commit='1a4f898', motion='reduce', settle=2.5, strip=(0.18, 0.4, 0.62, 0.84)),
    # "change 2" wires the Midnight & Gold files (added in 9b35e1d) into index.html; it is
    # the last commit before round 03's files arrive.
    '02': dict(commit='6653e27', motion='reduce', settle=2.5, strip=(0.18, 0.4, 0.62, 0.84)),
    # Round 03 with its AI follow-up (the Worker and the privacy line), the state round 04 began from.
    '03': dict(commit='41fcc52', motion='reduce', settle=2.5, strip=(0.18, 0.4, 0.62, 0.84)),
    # "Round 04: AI assistants, Draw your site with I'm done, ...", the last commit before round 05.
    '04': dict(commit='a5e4bc9', motion='reduce', settle=2.5, strip=(0.18, 0.4, 0.62, 0.84)),
    # Round 05: the repo's working tree as it stands (re-run with --round 05 when the home page is done).
    '05': dict(commit=None, motion='reduce', settle=3.5, strip=(0.18, 0.4, 0.62, 0.84)),
}

LAPTOP = dict(width=1440, height=900, scale=2, save=(2160, 1350), strip_save=(960, 600))
PHONE = dict(width=390, height=844, scale=2, save=(780, 1688), strip_save=(585, 1266))

INIT = r"""
Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
try { sessionStorage.clear(); localStorage.clear(); } catch (e) {}
"""


class Quiet(http.server.SimpleHTTPRequestHandler):
    """Read-only static files (GET and HEAD only; SimpleHTTPRequestHandler never writes)."""

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


Quiet.extensions_map = dict(Quiet.extensions_map, **{'.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.webp': 'image/webp'})


class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True
    request_queue_size = 128   # like tools/serve.py: the default 5 drops connections when a page loads many files at once


@contextmanager
def serve(directory):
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
    s.close()
    httpd = Server(('127.0.0.1', port), functools.partial(Quiet, directory=directory))
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    try:
        yield f'http://127.0.0.1:{port}'
    finally:
        httpd.shutdown()
        httpd.server_close()


def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True)


@contextmanager
def worktree(rid, commit):
    """Checks out `commit` into scratch/worktrees/making-rNN and always removes it again."""
    if commit is None:
        yield ROOT
        return
    os.makedirs(WORKTREES, exist_ok=True)
    path = os.path.join(WORKTREES, f'making-r{rid}')
    rel = os.path.relpath(path, ROOT)
    if os.path.exists(path):
        r = git('worktree', 'remove', rel)
        if r.returncode:
            sys.exit(f'{rel} is left over from an earlier run and could not be removed: {r.stderr.strip()}')
    r = git('worktree', 'add', '--detach', rel, commit)
    if r.returncode:
        sys.exit(f'git worktree add failed for round {rid}: {r.stderr.strip()}')
    try:
        yield path
    finally:
        r = git('worktree', 'remove', rel)
        if r.returncode:
            print(f'  WARNING: git worktree remove {rel} failed: {r.stderr.strip()}')
        else:
            print(f'  removed worktree {rel}')


def launch(p):
    return p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'])


def new_page(browser, dev, motion):
    phone = dev is PHONE
    ctx = browser.new_context(viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dev['scale'],
                              is_mobile=phone, has_touch=phone,
                              reduced_motion='reduce' if motion == 'reduce' else 'no-preference')
    ctx.add_init_script(INIT)
    # Never depend on the network: only the local server answers.
    ctx.route('**/*', lambda route: route.continue_() if route.request.url.startswith('http://127.0.0.1') or route.request.url.startswith('data:') or route.request.url.startswith('blob:') else route.abort())
    page = ctx.new_page()
    return ctx, page


def scroll_to(page, y, motion):
    """Scrolls like a visitor would (in steps), so scroll-driven parts draw on the way down."""
    cur = page.evaluate('window.scrollY')
    step = 140 if motion == 'normal' else 600
    while abs(y - cur) > 1:
        cur = cur + max(-step, min(step, y - cur))
        page.evaluate(f'window.scrollTo(0, {cur})')
        page.wait_for_timeout(60 if motion == 'normal' else 30)
    page.wait_for_timeout(900 if motion == 'normal' else 450)
    settle_images(page)


def settle_images(page, timeout=6000):
    """Waits until every picture on screen has loaded (lazy images arrive after the scroll)."""
    try:
        page.wait_for_function('''() => [...document.images].every((im) => {
            const r = im.getBoundingClientRect();
            const on = r.bottom > 0 && r.top < innerHeight && r.width > 0;
            return !on || im.complete;
        })''', timeout=timeout)
    except Exception:
        pass
    page.wait_for_timeout(300)


def shot(page):
    from PIL import Image
    return Image.open(io.BytesIO(page.screenshot(type='png'))).convert('RGB')


def save_webp(img, size, name, outdir):
    from PIL import Image
    if img.size != size:
        img = img.resize(size, Image.LANCZOS)
    path = os.path.join(outdir, name)
    img.save(path, 'WEBP', quality=QUALITY, method=6)
    return path


def capture_round(browser, base, rid, cfg, outdir):
    files = []
    for dev, tag in ((LAPTOP, 'laptop'), (PHONE, 'phone')):
        ctx, page = new_page(browser, dev, cfg['motion'])
        try:
            page.goto(base + '/index.html', wait_until='load', timeout=60000)
            try:
                page.evaluate('document.fonts && document.fonts.ready')
            except Exception:
                pass
            page.evaluate('window.scrollTo(0, 0)')
            page.wait_for_timeout(int(cfg['settle'] * 1000))
            if cfg['motion'] == 'normal':
                # nudge, so anything waiting for the first scroll starts, then come back to the top
                page.mouse.wheel(0, 40)
                page.wait_for_timeout(600)
                page.evaluate('window.scrollTo(0, 0)')
                page.wait_for_timeout(1200)
            settle_images(page)
            files.append(save_webp(shot(page), dev['save'], f'r{rid}-{tag}.webp', outdir))
            total = page.evaluate('Math.max(0, document.documentElement.scrollHeight - innerHeight)')
            for k, f in enumerate(cfg['strip'][:STRIP], 1):
                scroll_to(page, int(total * f), cfg['motion'])
                files.append(save_webp(shot(page), dev['strip_save'], f'r{rid}-{tag}-strip-{k}.webp', outdir))
            print(f'  {tag}: page {total + dev["height"]}px tall')
        finally:
            ctx.close()
    return files


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--round', action='append', choices=sorted(ROUNDS), help='capture only this round (repeatable)')
    ap.add_argument('--no-copy', action='store_true', help='leave the captures in scratch/making/captures/ only')
    a = ap.parse_args()
    rounds = a.round or sorted(ROUNDS)
    from playwright.sync_api import sync_playwright

    os.makedirs(SCRATCH, exist_ok=True)
    made = []
    with sync_playwright() as p:
        browser = launch(p)
        try:
            for rid in rounds:
                cfg = ROUNDS[rid]
                print(f'Round {rid}: {cfg["commit"] or "working tree"}')
                with worktree(rid, cfg['commit']) as root, serve(root) as base:
                    made += capture_round(browser, base, rid, cfg, SCRATCH)
        finally:
            browser.close()

    if not a.no_copy:
        os.makedirs(OUT, exist_ok=True)
        for f in made:
            shutil.copyfile(f, os.path.join(OUT, os.path.basename(f)))
    sizes = {os.path.basename(f): os.path.getsize(f) for f in made}
    with open(os.path.join(SCRATCH, 'last-run.json'), 'w') as fh:
        json.dump({'rounds': rounds, 'when': time.strftime('%Y-%m-%d %H:%M'), 'sizes': sizes}, fh, indent=1)
    all_out = [os.path.join(OUT, n) for n in os.listdir(OUT)] if os.path.isdir(OUT) else []
    total = sum(os.path.getsize(f) for f in all_out if f.endswith('.webp'))
    print(f'Wrote {len(made)} files ({sum(sizes.values()) / 1024:.0f} KB); assets/lab/pieces/making/ now holds {total / 1024:.0f} KB of captures.')
    left = [l for l in git('worktree', 'list').stdout.splitlines() if 'making-r' in l]
    if left:
        print('WARNING: worktrees left behind:\n  ' + '\n  '.join(left))


if __name__ == '__main__':
    main()
