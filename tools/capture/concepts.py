"""Concept-site previews for the home page's concept list (Round 05, Phase 4, step 4).

    python3 tools/capture/concepts.py                  all five sites
    python3 tools/capture/concepts.py morrow hart-and-sons
    python3 tools/capture/concepts.py --no-copy        leave everything in scratch/captures/concepts/

For each concept site, about 3.5 seconds of its signature moment as a short WebP frame
sequence at 720 x 450 (the 360 x 225 hover preview at 2x), under 600 KB, plus a still at
720 x 450 and a phone still at 716 x 448 (the 358 x 224 still on phones, at 2x):

    saltmarsh        the steam rising over the hero dish (WebGL)
    morrow           the cup filling as a drink is built (the builder's own controls are used)
    atelier-wren     the before-and-after wipe, dragged across and back
    hollis-and-pine  the three.js vase turning while its glaze changes
    hart-and-sons    the instant price building itself as the four questions are answered

The page runs in Chromium with SwiftShader WebGL and a simulated normal device
(navigator.hardwareConcurrency = 8), on a laptop viewport (1440 x 900) with normal motion.
Time is controlled with Playwright's clock: it is paused once the section is on screen,
then moved forward one frame (1/FPS s) between screenshots, so requestAnimationFrame
animations (the steam, the cup's physics, the vase, the counting prices) come out smooth
however slowly SwiftShader draws. The page is clipped to the signature (a 1.6 : 1 box around
the listed elements) and resized to 720 x 450. If a sequence is over budget, the WebP quality
is lowered and frames are dropped (15, 7.5 or 5 fps), following PLANS, until it fits.

Files: scratch/captures/concepts/<slug>/NNN.webp, <slug>-still.webp, <slug>-phone-still.webp,
copied to assets/home/captures/concepts/<slug>/NNN.webp and assets/home/captures/concepts/,
and the "concepts" section of assets/home/captures/captures.json. Contact sheets:
scratch/captures/sheets/concept-<slug>.png.
"""
import argparse
import io
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from capture_common import (ROOT, SCRATCH, OUT, serve, launch, new_page, png, fonts_and_images,
                            copy_out, update_index, contact_sheet)

FPS = 15
SECONDS = 3.5
BUDGET = 600 * 1000
SIZE = (720, 450)
PHONE_SIZE = (716, 448)
QUALITIES = (80, 74, 68, 62, 56, 50, 45)
HERE = os.path.join(SCRATCH, 'concepts')

# scroll: the element scrolled to the top of the screen (None: the top of the page)
# clip:   elements whose union (made 1.6 : 1, centred) is captured
# steps:  (time in s, action) pairs; an action is JS run in the page, or ('drag', [(t, x 0..1)])
# still:  the time (s) whose frame becomes the still
# css:    a style added for the capture (Morrow: the builder's form is hidden so the cup fills
#         the frame, and the script still uses its controls; Hart & Sons: the sticky top bar,
#         which would cover the first question)
# shrink: the clip box scaled about its centre (to stay inside a wide element)
# min_h:  the box is at least this tall (CSS px) before it is made 1.6 : 1, for a part that grows
#         as the steps play (Hart & Sons' price: 800px from the form's top when finished)
# blur:   a slight Gaussian blur (px) before encoding, for a detailed photo that won't fit otherwise
SITES = {
    'saltmarsh': dict(
        scroll=None, offset=0,
        clip=['.hero'], pad=0, blur=0.5,
        steps=[], still=3.4),
    'morrow': dict(
        scroll='.build__stage', offset=-110,
        clip=['.build__stage'], pad=56,
        css='.build__form, .build__intro { visibility: hidden !important; }',
        steps=[(0.25, "pick('item', 'espresso')"), (1.05, "pick('item', 'latte')"), (1.75, "pick('milk', 'oat')"),
               (2.35, "pick('extra_shots', '1')"), (2.9, "pick('syrup', 'caramel')")],
        still=3.45),
    'atelier-wren': dict(
        scroll='#ba-stage', offset=-60,
        clip=['#ba-stage'], pad=0, shrink=0.8,
        steps=[('drag', [(0.2, 0.5), (1.3, 0.12), (2.7, 0.88), (3.4, 0.55)])],
        still=3.45),
    'hollis-and-pine': dict(
        scroll='#vase', offset=-20,
        clip=['[data-stage]', '[data-glazes]'], pad=24,
        steps=[(0.0, "turn()"), (0.5, "pick('glaze', 'clay')"), (1.6, "pick('glaze', 'oat')"), (2.6, "pick('glaze', 'chalk')")],
        still=1.45),
    'hart-and-sons': dict(
        scroll='.quote__body', offset=-80,
        clip=['.quote__form', '[data-docket]'], pad=16,
        min_h=815, css='.bar { visibility: hidden !important; }',
        steps=[(0.2, "pick('job', 'heating')"), (1.0, "pick('size', 'house')"), (1.8, "pick('soon', 'week')"),
               (2.5, "check('extra', 'co_alarm')")],
        still=3.45),
}

HELPERS = r"""
window.__cap = {
  pick(name, value) {
    const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (!el) throw new Error('no input ' + name + '=' + value);
    (el.closest('label') || el).click();
  },
  check(name, value) { this.pick(name, value); },
  turn() {   // Hollis & Pine: "Turn it once" (stops the automatic turn first if it is running)
    const b = document.querySelector('[data-turn]');
    if (/stop/i.test(b.textContent)) b.click();
    b.click();
  },
};
"""


def clip_box(page, selectors, pad, shrink=1, min_h=0):
    r = page.evaluate('''(sels) => {
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const s of sels) { const el = document.querySelector(s); if (!el) throw new Error('missing ' + s);
            const r = el.getBoundingClientRect(); x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top);
            x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); }
        return [x0, y0, x1, y1, innerWidth, innerHeight]; }''', selectors)
    x0, y0, x1, y1, vw, vh = r
    x0, y0, x1, y1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
    y1 = max(y1, y0 + min_h)
    w, h = x1 - x0, y1 - y0
    ratio = SIZE[0] / SIZE[1]
    if w / h > ratio:
        h = w / ratio
    else:
        w = h * ratio
    w, h = min(w * shrink, vw), min(h * shrink, vh)
    if w / h > ratio:
        w = h * ratio
    else:
        h = w / ratio
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    x = min(max(0, cx - w / 2), vw - w)
    y = min(max(0, cy - h / 2), vh - h)
    return {'x': round(x, 2), 'y': round(y, 2), 'width': round(w, 2), 'height': round(h, 2)}


def record(browser, base, slug, cfg):
    from PIL import Image
    ctx, page = new_page(browser, 1440, 900, 1, clock=True)
    try:
        page.add_init_script(HELPERS)
        page.goto(f'{base}/work/{slug}/', wait_until='load', timeout=60000)
        fonts_and_images(page)
        if cfg.get('css'):
            page.add_style_tag(content=cfg['css'])
        page.wait_for_timeout(1500)
        if cfg['scroll']:
            page.evaluate('([s, o]) => { const el = document.querySelector(s); '
                          'window.scrollTo(0, el.getBoundingClientRect().top + scrollY + o); }',
                          [cfg['scroll'], cfg['offset']])
        page.wait_for_timeout(2500)          # real time: the section's own fade-ins and loading finish
        fonts_and_images(page)
        clip = clip_box(page, cfg['clip'], cfg['pad'], cfg.get('shrink', 1), cfg.get('min_h', 0))
        now = page.evaluate('Date.now()')
        page.clock.pause_at(now + 200)
        page.clock.run_for(200)
        page.wait_for_timeout(300)
        scale = SIZE[0] / clip['width']
        events = sorted([(t, a) for t, a in cfg['steps'] if t != 'drag'])
        drag = next((a for t, a in cfg['steps'] if t == 'drag'), None)
        if drag:
            box = page.evaluate('(s) => { const r = document.querySelector(s).getBoundingClientRect(); '
                                'return [r.left, r.top, r.width, r.height]; }', cfg['clip'][0])
            gx, gy, gw, gh = box
            page.mouse.move(gx + gw * drag[0][1], gy + gh * 0.55)
            page.mouse.down()
        frames, still = [], None
        n = round(SECONDS * FPS)
        for k in range(n):
            t = k / FPS
            while events and events[0][0] <= t:
                page.evaluate(f'window.__cap.{events.pop(0)[1]}')
            if drag:
                # piecewise linear, eased between keyframes
                for (t0, a0), (t1, a1) in zip(drag, drag[1:]):
                    if t0 <= t <= t1:
                        u = (t - t0) / (t1 - t0)
                        u = u * u * (3 - 2 * u)
                        page.mouse.move(gx + gw * (a0 + (a1 - a0) * u), gy + gh * 0.55)
                        break
            page.clock.run_for(round(1000 / FPS))
            page.wait_for_timeout(60)        # let the compositor present the new frame
            img = png(page.screenshot(type='png', clip=clip))
            frames.append(img.resize(SIZE, Image.LANCZOS))
            if still is None and t >= cfg['still'] - 1e-6:
                still = png(page.screenshot(type='png', clip=clip))
        if drag:
            page.mouse.up()
        if still is None:
            still = png(page.screenshot(type='png', clip=clip))
        return frames, still, clip, scale
    finally:
        ctx.close()


# (keep every Nth frame, qualities to try): tried in order until the sequence fits BUDGET.
PLANS = [(1, (80, 72, 64, 58)), (2, (80, 72, 64, 58, 52, 46)), (3, (72, 64, 56, 48))]


def encode(frames, outdir, blur=0):
    from PIL import ImageFilter
    if blur:
        frames = [f.filter(ImageFilter.GaussianBlur(blur)) for f in frames]
    for step, qualities in PLANS:
        seq = frames[::step]
        for q in qualities:
            blobs = []
            for f in seq:
                b = io.BytesIO()
                f.save(b, 'WEBP', quality=q, method=6)
                blobs.append(b.getvalue())
            total = sum(len(b) for b in blobs)
            if total <= BUDGET:
                if os.path.isdir(outdir):
                    shutil.rmtree(outdir)   # scratch only
                os.makedirs(outdir)
                paths = []
                for i, b in enumerate(blobs, 1):
                    p = os.path.join(outdir, f'{i:03d}.webp')
                    with open(p, 'wb') as fh:
                        fh.write(b)
                    paths.append(p)
                return paths, FPS / step, q, total
            print(f'    q{q} at {FPS / step:g} fps: {total / 1000:.0f} KB, too big')
    raise SystemExit('could not fit the budget')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('only', nargs='*', help='site slugs (default: all five)')
    ap.add_argument('--no-copy', action='store_true')
    a = ap.parse_args()
    from PIL import Image
    from playwright.sync_api import sync_playwright

    made = {}
    with serve(ROOT) as base, sync_playwright() as p:
        browser = launch(p)
        try:
            for slug, cfg in SITES.items():
                if a.only and slug not in a.only:
                    continue
                print(slug)
                frames, still, clip, scale = record(browser, base, slug, cfg)
                outdir = os.path.join(HERE, slug)
                paths, fps, q, total = encode(frames, outdir, cfg.get('blur', 0))
                print(f'    clip {clip}, {len(paths)} frames at {fps:g} fps, quality {q}: {total / 1000:.0f} KB')
                still_p = os.path.join(HERE, f'{slug}-still.webp')
                still.convert('RGB').resize(SIZE, Image.LANCZOS).save(still_p, 'WEBP', quality=82, method=6)
                phone_p = os.path.join(HERE, f'{slug}-phone-still.webp')
                still.convert('RGB').resize(PHONE_SIZE, Image.LANCZOS).save(phone_p, 'WEBP', quality=82, method=6)
                made[slug] = dict(paths=paths, fps=fps, bytes=total, still=still_p, phone=phone_p)
                contact_sheet(paths[::max(1, len(paths) // 16)] + [still_p],
                              os.path.join(SCRATCH, 'sheets', f'concept-{slug}.png'), 2000, 4)
        finally:
            browser.close()
    if a.no_copy:
        return

    idx_path = os.path.join(OUT, 'captures.json')
    concepts = {}
    if os.path.exists(idx_path):
        with open(idx_path, encoding='utf-8') as fh:
            concepts = json.load(fh).get('concepts', {})
    for slug, m in made.items():
        dst = os.path.join(OUT, 'concepts', slug)
        if os.path.isdir(dst):          # only ever this script's own frames from an earlier run
            for n in os.listdir(dst):
                if n.endswith('.webp') and n[:3].isdigit():
                    os.remove(os.path.join(dst, n))
        urls = [copy_out(pth, f'concepts/{slug}/{os.path.basename(pth)}') for pth in m['paths']]
        concepts[slug] = {
            'frames': urls, 'w': SIZE[0], 'h': SIZE[1], 'fps': m['fps'], 'bytes': m['bytes'],
            'still': {'src': copy_out(m['still'], f'concepts/{slug}-still.webp'), 'w': SIZE[0], 'h': SIZE[1]},
            'phoneStill': {'src': copy_out(m['phone'], f'concepts/{slug}-phone-still.webp'),
                           'w': PHONE_SIZE[0], 'h': PHONE_SIZE[1]},
        }
    order = [s for s in SITES if s in concepts]
    update_index('concepts', {s: concepts[s] for s in order})
    print('Indexed concepts:', ', '.join(order))


if __name__ == '__main__':
    main()
