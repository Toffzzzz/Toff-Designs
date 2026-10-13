"""The Awwwards submission images (Round 05, Phase 10). Re-runnable.

    python3 tools/capture/awwwards.py              every image
    python3 tools/capture/awwwards.py home-ai lab  only the shots whose names contain these words

awwwards.com's FAQ (checked 2026-10-13) asks for a main thumbnail of 1600 x 1200 px, and gives
1600 x 1200 as the ideal size for the extra images too. So every image here is 1600 x 1200:

  laptop shots   the page at a 1600 x 1200 viewport (device scale 1), so each image is the real
                 screen, not a scaled one;
  the phone set  three phone screens (390 x 844 at device scale 3) side by side on the studio's
                 midnight, at 1600 x 1200; the single phone screens are kept too, at 1170 x 2532,
                 in mobile/.

The repo is served read-only on a free port (capture_common.serve) and every request to another
website is blocked, so the AI parts show their on-page answers and nothing is sent anywhere.
WebGL is SwiftShader. Files go to handover/awwwards/ (gitignored; nothing here is committed):

  01-home-hero.jpg (the thumbnail), 02-home-work.jpg, ... , 15-phones.jpg, mobile/*.png

and a contact sheet, handover/awwwards/sheet.jpg, to look at them all at once.
"""
import argparse
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from playwright.sync_api import sync_playwright  # noqa: E402

import capture_common as cc  # noqa: E402

ROOT = cc.ROOT
OUT = os.path.join(ROOT, 'handover', 'awwwards')
W, H = 1600, 1200
MIDNIGHT = (14, 22, 40)

HERO_READY = "() => { const s = window.__home && window.__home.hero && window.__home.hero.state(); return !!(s && s.ready); }"


def scroll_to(page, selector, offset=0, step=140, pause=35):
    """Scroll down to an element the way a visitor would (small steps), so the scroll-driven parts
    (the pen, the films, the process line) draw on the way. offset: px of the element left above the top bar."""
    target = page.evaluate(
        "([s, o]) => { const e = document.querySelector(s); if (!e) return null;"
        " const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) || 64;"
        " return Math.max(0, e.getBoundingClientRect().top + scrollY - bar - 12 + o); }", [selector, offset])
    if target is None:
        raise RuntimeError('no element ' + selector)
    y = page.evaluate('scrollY')
    while y < target:
        y = min(target, y + step)
        page.mouse.wheel(0, step)
        page.wait_for_timeout(pause)
    # The page above keeps growing as its parts load near the screen: land on the element again until it stays put
    for _ in range(6):
        t = page.evaluate(
            "([s, o]) => { const e = document.querySelector(s);"
            " const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) || 64;"
            " return Math.max(0, e.getBoundingClientRect().top + scrollY - bar - 12 + o); }", [selector, offset])
        page.evaluate('(y) => window.scrollTo(0, y)', t)
        page.wait_for_timeout(600)
        if abs(t - target) < 2:
            break
        target = t
    page.wait_for_timeout(1500)


def save(img, name):
    path = os.path.join(OUT, name)
    img.convert('RGB').save(path, 'JPEG', quality=92, optimize=True, progressive=True)
    print(f'  saved {os.path.relpath(path, ROOT)}  {img.size[0]} x {img.size[1]}')
    return path


def laptop(browser, base, path):
    ctx, page = cc.new_page(browser, W, H)
    page.goto(base + path, wait_until='load')
    cc.fonts_and_images(page)
    return ctx, page


# ------------------------------------------------------------------------------------------ the shots
def shot_home_hero(browser, base):
    """The thumbnail: the hero half painted, sketch on the right, the finished site on the left."""
    ctx, page = laptop(browser, base, '/')
    try:
        page.wait_for_function(HERO_READY, timeout=20000)
    except Exception:
        print('  (the hero did not report ready; taking it as it is)')
    box = page.locator('[data-hero-stage]').bounding_box()
    if box:
        rows = 16                               # close, overlapping strokes, so the painted half has no gaps
        for r in range(rows):
            y = box['y'] + box['height'] * (0.02 + 0.96 * r / (rows - 1))
            xs = [box['x'] + box['width'] * f for f in (0.01, 0.5)]
            if r % 2:
                xs.reverse()
            page.mouse.move(xs[0], y)
            page.mouse.move(xs[1], y, steps=22)
            page.wait_for_timeout(30)
        page.mouse.move(box['x'] + box['width'] * 0.5, box['y'] + box['height'] + 40)
    page.wait_for_timeout(700)
    img = cc.shot(page)
    ctx.close()
    return img


def home_section(selector, offset=0, before=None):
    def run(browser, base):
        ctx, page = laptop(browser, base, '/')
        page.wait_for_timeout(1200)
        scroll_to(page, selector, offset)
        if before:
            before(page)
        cc.wait_settled(page, min_wait=800, timeout=12000)
        img = cc.shot(page)
        ctx.close()
        return img
    return run


def hover_concept(page):
    rows = page.locator('#concepts a')
    if rows.count():
        b = rows.nth(0).bounding_box()
        if b:
            page.mouse.move(b['x'] + b['width'] * 0.8, b['y'] + b['height'] / 2, steps=8)
            page.wait_for_timeout(2500)


def ai_ready(page):
    try:
        page.wait_for_function("() => { const e = document.querySelector('[data-mount=agent]'); const a = e && e.__agent;"
                               " if (!a) return false; const s = a.state(); return s.frames[s.key] === 'ready'; }", timeout=20000)
    except Exception:
        print('  (the AI demo frame did not report ready)')
    page.wait_for_timeout(800)


def page_at(path, selector=None, offset=0, wait=2500):
    def run(browser, base):
        ctx, page = laptop(browser, base, path)
        page.wait_for_timeout(wait)
        if selector:
            scroll_to(page, selector, offset)
        cc.wait_settled(page, min_wait=600, timeout=12000)
        img = cc.shot(page)
        ctx.close()
        return img
    return run


def lab_piece(pid, wait=6000):
    def run(browser, base):
        ctx, page = laptop(browser, base, '/lab.html#' + pid)
        page.wait_for_timeout(wait)
        img = cc.shot(page)
        ctx.close()
        return img
    return run


def phones(browser, base):
    """Three phone screens side by side, and each one on its own in mobile/."""
    from PIL import Image
    os.makedirs(os.path.join(OUT, 'mobile'), exist_ok=True)
    plan = [('home-hero', '/', None), ('home-ai', '/', '#ai'), ('saltmarsh', '/work/saltmarsh/', None)]
    screens = []
    for name, path, sel in plan:
        ctx, page = cc.new_page(browser, 390, 844, scale=3, phone=True)
        page.goto(base + path, wait_until='load')
        cc.fonts_and_images(page)
        page.wait_for_timeout(2500)
        if sel:
            scroll_to(page, sel, step=120)
            if sel == '#ai':
                ai_ready(page)
        page.wait_for_timeout(3500)          # phones play each part by itself when reached
        img = cc.shot(page)
        p = os.path.join(OUT, 'mobile', name + '.png')
        img.save(p, 'PNG', optimize=True)
        print(f'  saved {os.path.relpath(p, ROOT)}  {img.size[0]} x {img.size[1]}')
        screens.append(img)
        ctx.close()
    canvas = Image.new('RGB', (W, H), MIDNIGHT)
    ph = 1040                                  # phone height on the canvas
    pw = round(ph * 390 / 844)
    gap = (W - 3 * pw) // 4
    radius = 36
    from PIL import ImageDraw
    for i, s in enumerate(screens):
        s = s.resize((pw, ph), Image.LANCZOS)
        mask = Image.new('L', (pw, ph), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, pw - 1, ph - 1), radius=radius, fill=255)
        canvas.paste(s, (gap + i * (pw + gap), (H - ph) // 2), mask)
    return canvas


SHOTS = [
    ('01-home-hero.jpg', shot_home_hero),
    ('02-home-work.jpg', home_section('#work')),
    ('03-home-concepts.jpg', home_section('#concepts', before=hover_concept)),
    ('04-home-ai.jpg', home_section('#ai', before=ai_ready)),
    ('05-home-design-yours.jpg', home_section('#design-yours')),
    ('06-home-how-we-work.jpg', home_section('#how-we-work')),
    ('07-concept-saltmarsh.jpg', page_at('/work/saltmarsh/', wait=4000)),
    ('08-concept-morrow.jpg', page_at('/work/morrow/', '#build')),
    ('09-concept-atelier-wren.jpg', page_at('/work/atelier-wren/')),
    ('10-concept-hollis-and-pine.jpg', page_at('/work/hollis-and-pine/', '#vase', wait=2500)),
    ('11-concept-hart-and-sons.jpg', page_at('/work/hart-and-sons/', '#quote')),
    ('12-lab-index.jpg', page_at('/lab.html')),
    ('13-lab-gold.jpg', lab_piece('gold')),
    ('14-case-bluebird.jpg', page_at('/work/bluebird/')),
    ('15-phones.jpg', phones),
]


def contact_sheet(paths):
    from PIL import Image
    if not paths:
        return
    tw, th, cols, pad = 400, 300, 4, 12
    rows = (len(paths) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (tw + pad) + pad, rows * (th + pad) + pad), (30, 30, 30))
    for i, p in enumerate(paths):
        im = Image.open(p).convert('RGB').resize((tw, th), Image.LANCZOS)
        sheet.paste(im, (pad + (i % cols) * (tw + pad), pad + (i // cols) * (th + pad)))
    out = os.path.join(OUT, 'sheet.jpg')
    sheet.save(out, 'JPEG', quality=85)
    print(f'contact sheet: {os.path.relpath(out, ROOT)}')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('only', nargs='*', help='only shots whose file names contain these words')
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    todo = [s for s in SHOTS if not args.only or any(w in s[0] for w in args.only)]
    done, failed = [], []
    with cc.serve(ROOT) as base, sync_playwright() as p:
        browser = cc.launch(p)
        try:
            for name, fn in todo:
                print(name)
                try:
                    img = fn(browser, base)
                    if img.size != (W, H):
                        img = img.resize((W, H))
                    done.append(save(img, name))
                except Exception as e:  # noqa: BLE001  (one failed shot shouldn't stop the rest)
                    print(f'  FAILED: {type(e).__name__}: {e}')
                    failed.append(name)
        finally:
            browser.close()
    contact_sheet([os.path.join(OUT, n) for n, _ in SHOTS if os.path.exists(os.path.join(OUT, n))])
    print(f'\n{len(done)} image(s) made in {os.path.relpath(OUT, ROOT)}/' + (f'; failed: {", ".join(failed)}' if failed else ''))
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
