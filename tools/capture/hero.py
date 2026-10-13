"""Hero captures for the home page's sketch stage (Round 05, Phase 4, steps 1 and 2).

    python3 tools/capture/hero.py                    every site, in the hero's order
    python3 tools/capture/hero.py saltmarsh morrow   only these (the index keeps the others)
    python3 tools/capture/hero.py --no-copy          leave everything in scratch/captures/hero/

For each site, in SITES order (rounds/round-05-plan.md section 9, with Everest moved to the end
during integration, 2026-10-13, because its first screen is nearly empty):

  1. Screenshots of its first screen
       laptop: a 1440 x 600 viewport at device scale 1.5 -> 2160 x 900 (the stage is 2.4 : 1)
       phone:  390 x 844 at device scale 2, cropped to the top 358 : 470 (390 x 512 CSS px)
               and saved at 716 x 940 (the stage is 358 x 470 CSS px)
     The concept sites are served from this repo with reduced motion (they then show their
     finished state at once); the live Bluebird site lets its opening drawing play and is
     captured once the screen has stopped changing (retried once). Everest is served
     read-only from ~/Downloads/everest-climate-solutions/dist (its own finished build;
     nothing is built or written there) and skipped if that folder doesn't exist.
  2. Still sketches: assets/shared/sketch-shader.js (SketchStage) draws each screenshot with an
     empty mask in Chromium (SwiftShader WebGL), at the stage's own CSS size and each device
     scale, through tools/capture/sketch.html. These are the stage's first paint and the
     no-WebGL fallback.

Files (scratch/captures/hero/, then copied to assets/home/captures/hero/):
  <id>-laptop-site.webp (2160 x 900), -site-1968.webp, -site-1312.webp
  <id>-laptop-sketch.webp (2160 x 900), -sketch-1968.webp, -sketch-1312.webp
  <id>-phone-site.webp (716 x 940), -site-358.webp
  <id>-phone-sketch.webp (716 x 940), -sketch-358.webp
and the "hero" section of assets/home/captures/captures.json. Contact sheet:
scratch/captures/sheets/hero.png.
"""
import argparse
import base64
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from capture_common import (ROOT, SCRATCH, EVEREST_DIR, serve, launch, new_page, shot, png, wait_settled,
                            save_webp, copy_out, update_index, contact_sheet, bluebird_url)

SITES = [
    # id, name, kind, where. This list is the hero's order ("Another site →" goes down it).
    # Everest is last: its first screen is nearly empty (just its logo, before its own intro plays).
    ('bluebird', 'Bluebird Wellness', 'client', 'live'),
    ('atelier-wren', 'Atelier Wren', 'concept', 'work'),
    ('saltmarsh', 'Saltmarsh', 'concept', 'work'),
    ('morrow', 'Morrow Coffee', 'concept', 'work'),
    ('hollis-and-pine', 'Hollis & Pine', 'concept', 'work'),
    ('hart-and-sons', 'Hart & Sons Plumbing', 'concept', 'work'),
    ('everest', 'Everest Climate Solutions', 'client', 'everest'),
]
QUALITY = 80
LAPTOP = dict(view=(1440, 600), scale=1.5, size=(2160, 900), stage_css=1312, widths=(1312, 1968))
PHONE = dict(view=(390, 844), scale=2, crop_css=(390, 512), size=(716, 940), stage_css=358, widths=(358,))
HERE = os.path.join(SCRATCH, 'hero')


def caption(name, kind):
    return f'{name}, a client’s site' if kind == 'client' else f'{name}, a concept site'


def first_screen(browser, url, dev, phone, live, local_only):
    """Returns the screenshot (PIL) of the first screen, or raises if it never settles."""
    w, h = dev['view']
    for attempt in (1, 2):
        ctx, page = new_page(browser, w, h, dev['scale'], phone=phone, reduced=not live, local_only=local_only)
        try:
            page.goto(url, wait_until='load', timeout=60000)
            page.evaluate('window.scrollTo(0, 0)')
            ok = wait_settled(page, min_wait=6000 if live else 1800, timeout=25000)
            page.evaluate('window.scrollTo(0, 0)')
            if ok or attempt == 2:
                if not ok:
                    print('    WARNING: the screen kept changing; captured anyway')
                img = shot(page)
                return img
            print('    the screen kept changing, retrying once')
        finally:
            ctx.close()


def sketch(browser, base, src_url, css_w, css_h, scale):
    ctx, page = new_page(browser, round(css_w) + 1, round(css_h) + 1, scale)
    try:
        page.goto(f'{base}/tools/capture/sketch.html?w={css_w}&h={css_h}')
        page.wait_for_function('window.__ready')
        if not page.evaluate('window.__supported'):
            raise SystemExit('WebGL2 is not available in this Chromium: cannot draw the sketches')
        return png(base64.b64decode(page.evaluate('(s) => window.__make(s)', src_url)))
    finally:
        ctx.close()


def variant(path, w, h):
    from PIL import Image
    return Image.open(path).convert('RGB').resize((w, h), Image.LANCZOS)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('only', nargs='*', help='site ids to capture (default: all)')
    ap.add_argument('--no-copy', action='store_true')
    a = ap.parse_args()
    from playwright.sync_api import sync_playwright

    os.makedirs(HERE, exist_ok=True)
    have_everest = os.path.isdir(os.path.join(EVEREST_DIR, 'dist'))
    if not have_everest:
        print('Everest: ~/Downloads/everest-climate-solutions/dist not found, skipped')
    live = bluebird_url()
    made = {}
    with serve(ROOT) as base, sync_playwright() as p:
        ev = serve(os.path.join(EVEREST_DIR, 'dist')) if have_everest else None
        ev_base = ev.__enter__() if ev else None
        browser = launch(p)
        try:
            for sid, name, kind, where in SITES:
                if a.only and sid not in a.only:
                    continue
                if where == 'everest' and not have_everest:
                    continue
                url = {'live': live, 'work': f'{base}/work/{sid}/', 'everest': f'{ev_base}/'}[where]
                print(f'{name}: {url}')
                files = {}
                # 1. screenshots
                img = first_screen(browser, url, LAPTOP, False, where == 'live', where == 'work')
                files['laptop-site'] = save_webp(img, f'{HERE}/{sid}-laptop-site.webp', QUALITY, LAPTOP['size'])
                img = first_screen(browser, url, PHONE, True, where == 'live', where == 'work')
                cw, ch = PHONE['crop_css']
                img = img.crop((0, 0, cw * PHONE['scale'], ch * PHONE['scale']))
                files['phone-site'] = save_webp(img, f'{HERE}/{sid}-phone-site.webp', QUALITY, PHONE['size'])
                # 2. sketches, at the stage's CSS size and each device scale
                for dev, tag in ((LAPTOP, 'laptop'), (PHONE, 'phone')):
                    W, H = dev['size']
                    css_w = dev['stage_css']
                    css_h = round(css_w * H / W, 3)
                    src_url = f'{base}/scratch/captures/hero/{sid}-{tag}-site.webp'
                    s = sketch(browser, base, src_url, css_w, css_h, W / css_w)
                    files[f'{tag}-sketch'] = save_webp(s, f'{HERE}/{sid}-{tag}-sketch.webp', QUALITY, (W, H))
                    for w in dev['widths']:
                        h = round(w * H / W)
                        s = sketch(browser, base, src_url, css_w, css_h, w / css_w)
                        files[f'{tag}-sketch-{w}'] = save_webp(s, f'{HERE}/{sid}-{tag}-sketch-{w}.webp', QUALITY, (w, h))
                        files[f'{tag}-site-{w}'] = save_webp(variant(files[f'{tag}-site'], w, h),
                                                             f'{HERE}/{sid}-{tag}-site-{w}.webp', QUALITY)
                for k, f in sorted(files.items()):
                    print(f'    {os.path.basename(f)} {os.path.getsize(f) // 1024} KB')
                made[sid] = files
        finally:
            browser.close()
            if ev:
                ev.__exit__(None, None, None)

    contact_sheet([f for sid in made for f in (made[sid]['laptop-site'], made[sid]['laptop-sketch'])],
                  os.path.join(SCRATCH, 'sheets', 'hero-laptop.png'), 2000, 2)
    contact_sheet([f for sid in made for f in (made[sid]['phone-site'], made[sid]['phone-sketch'])],
                  os.path.join(SCRATCH, 'sheets', 'hero-phone.png'), 1600, 6)
    if a.no_copy:
        return

    # Copy and index (sites not captured this run keep their earlier entries).
    import json
    idx_path = os.path.join(ROOT, 'assets', 'home', 'captures', 'captures.json')
    old = {}
    if os.path.exists(idx_path):
        with open(idx_path, encoding='utf-8') as fh:
            old = {e['id']: e for e in json.load(fh).get('hero', [])}
    hero = []
    for sid, name, kind, where in SITES:
        if sid not in made:
            if sid in old and not (where == 'everest' and not have_everest):
                hero.append(old[sid])
            continue
        entry = {'id': sid, 'name': name, 'kind': kind, 'caption': caption(name, kind)}
        for dev, tag in ((LAPTOP, 'laptop'), (PHONE, 'phone')):
            W, H = dev['size']
            entry[tag] = {}
            for part in ('site', 'sketch'):
                main_url = copy_out(made[sid][f'{tag}-{part}'], f'hero/{sid}-{tag}-{part}.webp')
                srcset = []
                for w in dev['widths']:
                    u = copy_out(made[sid][f'{tag}-{part}-{w}'], f'hero/{sid}-{tag}-{part}-{w}.webp')
                    srcset.append(f'{u} {w}w')
                srcset.append(f'{main_url} {W}w')
                entry[tag][part] = {'src': main_url, 'srcset': ', '.join(srcset), 'w': W, 'h': H}
        hero.append(entry)
    update_index('hero', hero)
    print(f'Indexed {len(hero)} hero sites in assets/home/captures/captures.json')


if __name__ == '__main__':
    main()
