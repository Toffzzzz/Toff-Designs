"""Case films for the home page's Work section (Round 05, Phase 4, step 3).

    python3 tools/capture/films.py                   Bluebird (live) and Everest (local, if present)
    python3 tools/capture/films.py bluebird          only one site
    python3 tools/capture/films.py --no-copy         leave everything in scratch/captures/films/

(2026-10-13, integration: END is a selector- or heading-based stop point per site; HIDE holds CSS
applied only while a site is captured; a frame that shows "Placeholder", "[TODO]" or "Upgrade to Pro"
on screen stops the run.)

Each site is scrolled smoothly from the very top to the bottom (or to END, below), like a visitor would
(small wheel steps with short pauses, so its own scroll-driven drawing plays as it goes), at
a laptop viewport (1440 x 900) and a phone viewport (390 x 844, a phone with touch). A frame
is taken at evenly spaced points down the page: at most 90 frames per sequence.

The frames are sized to fit the drawn screens on the home page (laptop 1280 x 800, phone
390 x 844 or larger) and saved as WebP. Each sequence must stay under 2.5 MB: the script
lowers the WebP quality step by step (85 down to 50) and then the size, until it fits.

Bluebird is the live site (links.bluebird in settings.js), with normal motion: its line
drawing plays as it scrolls. Everest is served read-only from
~/Downloads/everest-climate-solutions/dist (its finished build; nothing is built or written
there) and skipped if that folder doesn't exist.

Files (scratch/captures/films/<site>-<device>/NNN.webp, then copied to
assets/home/captures/films/<site>-<device>/NNN.webp, 001 first), the "films" section of
assets/home/captures/captures.json, and contact sheets in scratch/captures/sheets/.
"""
import argparse
import io
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from capture_common import (ROOT, SCRATCH, EVEREST_DIR, serve, launch, new_page, shot, wait_settled,
                            copy_out, update_index, contact_sheet, bluebird_url)

FRAMES = 90
BUDGET = 2.45 * 1000 * 1000       # bytes per sequence (under 2.5 MB, with a little room)
DEVICES = {
    # viewport, device scale, phone?, the frame size to aim for (largest first)
    'laptop': dict(view=(1440, 900), scale=1, phone=False, sizes=[(1280, 800), (1152, 720), (1024, 640)]),
    'phone': dict(view=(390, 844), scale=2, phone=True, sizes=[(585, 1266), (468, 1013), (390, 844)]),
}
QUALITIES = (82, 76, 70, 64, 58, 52)

# Where each film stops (JS returning a scroll position; None: the very bottom of the page).
# stop_before(...) ends the film with the first element that matches still just below the screen,
# so nothing of it shows in the last frame. It is found by a CSS selector, or failing that by its
# heading's text, so the stop point follows the live page if its sections change height.
def stop_before(selector, heading_text):
    return ("(() => { let a = document.querySelector(%r); "
            "if (!a) { const h = [...document.querySelectorAll('h1,h2,h3')].find((e) => "
            "e.textContent.replace(/\\s+/g, ' ').trim().startsWith(%r)); a = h && (h.closest('section') || h); } "
            "return a ? Math.max(0, Math.floor(a.getBoundingClientRect().top + scrollY - innerHeight)) : null; })()"
            % (selector, heading_text))


# Bluebird stops just before "In clinic, or at your door." (#how-it-works): from there on the live
# site's photos still carry "Placeholder" badges. Everest stops once its intro (the room cooling
# from 32 to 18 °C) and the services are done, just before the About section, whose text in the
# local build is still marked [TODO].
END = {
    'bluebird': stop_before('#how-it-works', 'In clinic, or at your door'),
    'everest': "(() => { const a = document.querySelector('#about'); "
               "return a ? Math.round(a.getBoundingClientRect().top + scrollY - innerHeight + 100) : null; })()",
}
# CSS applied to a site only while it is captured. Bluebird: its "Upgrade to Pro" chips (a.pro-chip,
# the clinic's own links to the Pro version of a treatment, beside some prices) are hidden at the
# lead's request. Delete the entry to show them again.
HIDE = {
    'bluebird': '.pro-chip { display: none !important; }',
}
# Any frame that shows one of these words in a visible element is reported (and the run fails),
# so a film never shows a placeholder, or anything hidden above, from the live site.
FORBIDDEN = ('Placeholder', '[TODO]', 'Upgrade to Pro')
FORBIDDEN_JS = """(words) => [...document.querySelectorAll('body *')].filter((e) => {
    if (e.children.length > 1) return false;
    const t = (e.textContent || '').trim();
    if (!t || t.length > 40 || !words.some((w) => t.includes(w))) return false;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth
      && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
  }).map((e) => (e.textContent || '').trim())"""
FILMS = os.path.join(SCRATCH, 'films')


def scroll_y(page):
    return page.evaluate('Math.round(window.scrollY)')


def scroll_by(page, dy, step=50, pause=45):
    """Wheel steps like a trackpad, so smooth-scroll libraries and scroll-driven drawing follow."""
    target = scroll_y(page) + dy
    left = dy
    while left > 0:
        d = min(step, left)
        page.mouse.wheel(0, d)
        page.wait_for_timeout(pause)
        left -= d
    # wait for any smooth scrolling to arrive; fall back to scrollTo if wheel was ignored
    for _ in range(20):
        y0 = scroll_y(page)
        page.wait_for_timeout(60)
        if scroll_y(page) == y0:
            break
    if abs(scroll_y(page) - target) > 4:
        page.evaluate(f'window.scrollTo(0, {target})')
        page.wait_for_timeout(120)


def record(browser, url, dev, local_only, hold, end=None, hide=None):
    """Returns the list of PIL frames from top to bottom."""
    w, h = dev['view']
    ctx, page = new_page(browser, w, h, dev['scale'], phone=dev['phone'], reduced=False, local_only=local_only)
    try:
        page.goto(url, wait_until='load', timeout=60000)
        if hide:
            page.add_style_tag(content=hide)
        page.evaluate('window.scrollTo(0, 0)')
        wait_settled(page, min_wait=5000, timeout=20000)
        page.mouse.move(w / 2, h / 2)
        frames, bad = [], []
        total = page.evaluate('document.documentElement.scrollHeight - innerHeight')
        for k in range(FRAMES):
            # the page can grow as it reveals itself: aim at the current bottom
            total = page.evaluate('document.documentElement.scrollHeight - innerHeight')
            if end:
                total = min(total, page.evaluate(end) or total)
            target = round(total * k / (FRAMES - 1))
            dy = target - scroll_y(page)
            if dy > 0:
                scroll_by(page, dy)
            page.wait_for_timeout(hold)
            frames.append(shot(page))
            seen = page.evaluate(FORBIDDEN_JS, list(FORBIDDEN))
            if seen:
                bad.append((k + 1, scroll_y(page), seen[:3]))
        # the last frame: wait for anything still drawing at the bottom to finish
        wait_settled(page, min_wait=800, timeout=8000)
        frames[-1] = shot(page)
        print(f'    {len(frames)} frames, page {total + h}px tall, ended at {scroll_y(page)}')
        if bad:
            for n, y, seen in bad:
                print(f'    WARNING: frame {n:03d} (scrolled to {y}) shows {seen}')
            raise SystemExit('a frame shows placeholder text: move END for this site up')
        return frames
    finally:
        ctx.close()


def encode(frames, outdir, sizes):
    """Writes the frames as WebP, tuning quality and then size to fit BUDGET. Returns (paths, size, q, bytes)."""
    from PIL import Image
    for size in sizes:
        resized = [f.resize(size, Image.LANCZOS) if f.size != size else f for f in frames]
        for q in QUALITIES:
            blobs = []
            for f in resized:
                b = io.BytesIO()
                f.save(b, 'WEBP', quality=q, method=6)
                blobs.append(b.getvalue())
            total = sum(len(b) for b in blobs)
            if total <= BUDGET:
                if os.path.isdir(outdir):
                    shutil.rmtree(outdir)          # scratch only: an earlier run's frames
                os.makedirs(outdir)
                paths = []
                for i, b in enumerate(blobs, 1):
                    p = os.path.join(outdir, f'{i:03d}.webp')
                    with open(p, 'wb') as fh:
                        fh.write(b)
                    paths.append(p)
                return paths, size, q, total
            print(f'    {size[0]}x{size[1]} q{q}: {total / 1e6:.2f} MB, too big')
    raise SystemExit('could not fit the budget')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('only', nargs='*', help='bluebird and/or everest (default: both)')
    ap.add_argument('--no-copy', action='store_true')
    a = ap.parse_args()
    from playwright.sync_api import sync_playwright

    have_everest = os.path.isdir(os.path.join(EVEREST_DIR, 'dist'))
    if not have_everest:
        print('Everest: ~/Downloads/everest-climate-solutions/dist not found, skipped')
    sites = [s for s in ('bluebird', 'everest') if (not a.only or s in a.only) and (s != 'everest' or have_everest)]
    made = {}
    with sync_playwright() as p:
        ev = serve(os.path.join(EVEREST_DIR, 'dist')) if 'everest' in sites else None
        ev_base = ev.__enter__() if ev else None
        browser = launch(p)
        try:
            for site in sites:
                url = bluebird_url() if site == 'bluebird' else f'{ev_base}/'
                made[site] = {}
                for tag, dev in DEVICES.items():
                    print(f'{site} {tag}: {url}')
                    frames = record(browser, url, dev, local_only=False, hold=380 if dev['phone'] else 220, end=END[site], hide=HIDE.get(site))
                    outdir = os.path.join(FILMS, f'{site}-{tag}')
                    paths, size, q, total = encode(frames, outdir, dev['sizes'])
                    print(f'    saved {len(paths)} frames at {size[0]}x{size[1]}, quality {q}: {total / 1e6:.2f} MB')
                    made[site][tag] = dict(paths=paths, w=size[0], h=size[1], q=q, bytes=total)
                    pick = paths[::max(1, len(paths) // 24)]
                    contact_sheet(pick, os.path.join(SCRATCH, 'sheets', f'film-{site}-{tag}.png'),
                                  2000 if tag == 'laptop' else 2400, 6 if tag == 'laptop' else 12)
        finally:
            browser.close()
            if ev:
                ev.__exit__(None, None, None)
    if a.no_copy:
        return

    import json
    idx_path = os.path.join(ROOT, 'assets', 'home', 'captures', 'captures.json')
    films = {}
    if os.path.exists(idx_path):
        with open(idx_path, encoding='utf-8') as fh:
            films = json.load(fh).get('films', {})
    if not have_everest:
        films.pop('everest', None)
    for site, devs in made.items():
        films[site] = {}
        for tag, m in devs.items():
            dst = os.path.join(ROOT, 'assets', 'home', 'captures', 'films', f'{site}-{tag}')
            if os.path.isdir(dst):        # only ever this script's own frames from an earlier run
                for n in os.listdir(dst):
                    if n.endswith('.webp') and n[:3].isdigit():
                        os.remove(os.path.join(dst, n))
            urls = [copy_out(pth, f'films/{site}-{tag}/{os.path.basename(pth)}') for pth in m['paths']]
            films[site][tag] = {'frames': urls, 'w': m['w'], 'h': m['h'], 'bytes': m['bytes']}
    update_index('films', films)
    print('Indexed films:', ', '.join(f'{s} {t}' for s in films for t in films[s]))


if __name__ == '__main__':
    main()
