"""The Lab's stills, and the home page's Lab band still (Round 05, Phase 7). Re-runnable.

    python3 tools/capture/lab_stills.py              every piece that exists, then the band
    python3 tools/capture/lab_stills.py gold vase    only these pieces, then the band
    python3 tools/capture/lab_stills.py --band       only recompose the band from the stills on disk
    python3 tools/capture/lab_stills.py --no-copy    leave everything in scratch/captures/lab/ to look at first

(Moved here from scratch/lab-shell/capture_stills.py during integration, 2026-10-13, so it can be re-run;
it now writes into scratch/captures/lab/ first and copies the finished files out, like the other capture
scripts, and also makes the band's 1312px variant for the home page's srcset.)

Each piece is opened through lab.html?capture#<id> at 1440x900 (a normal device: hardwareConcurrency 8;
SwiftShader WebGL; nothing is loaded from anywhere but this repo), left until it looks its best (per-piece
waits and gestures below), its controls are hidden (anything that isn't the artwork), and the screen is
saved as <id>.webp, 960x600, WebP quality 80. index.json lists the stills that exist (lab.js shows only
those; the others get a title-only panel).

The band (2624x720, the home page's Lab band at 2x, shown at 1312x360) is three stills in a row on the
page colour, in the Lab's order, preferring pieces with stills; lab-band-1312.webp is the same at 1x.

Files: scratch/captures/lab/<id>.webp, index.json, lab-band.webp, lab-band-1312.webp; then copied to
assets/lab/stills/ (the stills and index.json) and assets/home/captures/ (the band). With --band, the band
is made from the stills already in assets/lab/stills/.
"""
import io
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from capture_common import ROOT, SCRATCH, serve, launch, new_page

ORDER = ['sketch', 'gold', 'specks', 'vase', 'ink', 'weight', 'oneline', 'making']
HERE = os.path.join(SCRATCH, 'lab')
STILLS = os.path.join(ROOT, 'assets', 'lab', 'stills')
BAND_DIR = os.path.join(ROOT, 'assets', 'home', 'captures')
BG = (14, 22, 40)   # --bg #0E1628
# where each tile is cut from its still (0 = left edge, 1 = right edge)
ANCHOR = {'sketch': 0.14, 'gold': 0.78, 'ink': 0.42, 'specks': 0.3, 'oneline': 0.95, 'weight': 0.4}

# How long to let each piece settle (ms) before the shot
WAIT = {'sketch': 2600, 'gold': 5000, 'specks': 11000, 'vase': 5000, 'ink': 11000, 'weight': 5500, 'oneline': 9000, 'making': 3000}

HIDE_CONTROLS = r"""
() => {
  const m = document.querySelector('.lab-mount'); if (!m) return 0;
  const vw = innerWidth * innerHeight, big = (e) => { const r = e.getBoundingClientRect(); return r.width * r.height >= vw * 0.3; };
  const art = [...m.querySelectorAll('canvas, svg, img, video')].filter(big);
  let n = 0;
  m.querySelectorAll('*').forEach((e) => {
    if (e.matches('canvas, svg, img, video, link, style') || e.closest('svg') && e.tagName !== 'svg') return;
    if (art.some((a) => e.contains(a))) return;
    e.style.visibility = 'hidden'; n++;
  });
  return n;
}
"""


def wait_phase(pg, timeout=30000):
    """Waits until the Lab has finished opening (or failing to open) the piece it was asked for."""
    pg.wait_for_function("() => { const s = window.__lab && window.__lab.state(); "
                         "return s && !s.busy && s.want === s.shown && s.phase !== 'loading'; }", timeout=timeout)
    return pg.evaluate("() => window.__lab.state()")


def gesture(pg, pid):
    if pid == 'sketch':
        # paint the salon photo back, in loose zigzags over the right of the page, so the still shows
        # sketch and site side by side
        x0, y0, w, h = pg.evaluate("(() => { const r = document.querySelector('.sk-canvas').getBoundingClientRect(); "
                                   "return [r.left, r.top, r.width, r.height]; })()")
        pg.mouse.move(x0 + w * 0.98, y0 + h * 0.02)
        rows = 7
        for r in range(rows + 1):
            y = y0 + h * (0.04 + 0.92 * r / rows)
            xa, xb = (x0 + w * 0.97, x0 + w * 0.62) if r % 2 == 0 else (x0 + w * 0.62, x0 + w * 0.97)
            pg.mouse.move(xa, y, steps=4)
            pg.mouse.move(xb, y + h * 0.05, steps=24)
        pg.wait_for_timeout(1800)


def capture(ids):
    from PIL import Image
    from playwright.sync_api import sync_playwright
    os.makedirs(HERE, exist_ok=True)
    made = []
    with serve(ROOT) as base, sync_playwright() as p:
        b = launch(p)
        try:
            for pid in ids:
                if not os.path.exists(os.path.join(ROOT, 'assets', 'lab', 'pieces', pid + '.js')):
                    print(f'{pid}: no module yet, skipped')
                    continue
                errs = []
                ctx, pg = new_page(b, 1440, 900)
                pg.on('pageerror', lambda e: errs.append(f'[pageerror] {e}'))
                pg.on('console', lambda m: errs.append(f'[{m.type}] {m.text}') if m.type == 'error' else None)
                try:
                    pg.goto(f'{base}/lab.html?capture#{pid}')
                    st = wait_phase(pg, 90000)
                    if st['phase'] != 'ready':
                        print(f'{pid}: {st["phase"]}, skipped')
                        continue
                    if pid == 'ink':   # the pen has finished writing the name
                        try:
                            pg.wait_for_function("() => [...document.querySelectorAll('.lab-mount [aria-live]')]"
                                                 ".some((n) => /^Written/.test(n.textContent))", timeout=60000)
                        except Exception:
                            print('ink: pen not finished in 60 s')
                        pg.wait_for_timeout(600)
                    else:
                        pg.wait_for_timeout(WAIT.get(pid, 4000))
                    gesture(pg, pid)
                    pg.evaluate(HIDE_CONTROLS)
                    pg.wait_for_timeout(200)
                    im = Image.open(io.BytesIO(pg.screenshot())).convert('RGB').resize((960, 600), Image.LANCZOS)
                    out = os.path.join(HERE, pid + '.webp')
                    im.save(out, 'WEBP', quality=80, method=6)
                    made.append(pid)
                    print(f'{pid}: saved ({os.path.getsize(out) // 1024} KB)', [e for e in errs if 'GPU stall' not in e][:3])
                finally:
                    ctx.close()
        finally:
            b.close()
    return made


def write_index(folder):
    have = [i for i in ORDER if os.path.exists(os.path.join(folder, i + '.webp'))]
    with open(os.path.join(folder, 'index.json'), 'w') as f:
        json.dump({'about': 'Written by tools/capture/lab_stills.py. Only the stills listed here are shown; '
                            'the rest get a title-only panel.', 'stills': have}, f, indent=1)
        f.write('\n')
    return have


def band(folder, have, out_dir):
    """2624x720: three stills in a row on the page colour, 32px apart, 24px corners (12px at 1x), each
    cropped from its still at ANCHOR; and the same at 1312x360."""
    from PIL import Image, ImageDraw
    pick = [i for i in ['sketch', 'gold', 'oneline', 'ink', 'specks', 'weight', 'vase', 'making'] if i in have][:3]
    if not pick:
        print('band: no stills yet')
        return []
    W, H, gap, rad = 2624, 720, 32, 24
    n = len(pick)
    tw = (W - gap * (n - 1)) // n
    out = Image.new('RGB', (W, H), BG)
    x = 0
    for pid in pick:
        im = Image.open(os.path.join(folder, pid + '.webp')).convert('RGB')
        k = max(tw / im.width, H / im.height)
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        left = round((im.width - tw) * ANCHOR.get(pid, 0.5))
        top = 0 if pid == 'sketch' else (im.height - H) // 2
        tile = im.crop((left, top, left + tw, top + H))
        mask = Image.new('L', (tw, H), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, tw - 1, H - 1), rad, fill=255)
        out.paste(tile, (x, 0), mask)
        x += tw + gap
    os.makedirs(out_dir, exist_ok=True)
    big = os.path.join(out_dir, 'lab-band.webp')
    small = os.path.join(out_dir, 'lab-band-1312.webp')
    out.save(big, 'WEBP', quality=80, method=6)
    out.resize((1312, 360), Image.LANCZOS).save(small, 'WEBP', quality=82, method=6)
    print(f'band: {", ".join(pick)} -> {os.path.relpath(big, ROOT)} ({os.path.getsize(big) // 1024} KB), '
          f'{os.path.basename(small)} ({os.path.getsize(small) // 1024} KB)')
    return [big, small]


def main():
    args = sys.argv[1:]
    no_copy = '--no-copy' in args
    if '--band' in args:
        band(STILLS, write_index(STILLS), BAND_DIR)
        return
    made = capture([a for a in args if a in ORDER] or ORDER)
    # the band from the new stills, plus any older ones not re-captured this run
    os.makedirs(HERE, exist_ok=True)
    for pid in ORDER:
        src = os.path.join(STILLS, pid + '.webp')
        if pid not in made and os.path.exists(src):
            shutil.copyfile(src, os.path.join(HERE, pid + '.webp'))
    have = write_index(HERE)
    bands = band(HERE, have, HERE)
    if no_copy:
        print(f'Left in {os.path.relpath(HERE, ROOT)}/ (--no-copy)')
        return
    os.makedirs(STILLS, exist_ok=True)
    for pid in made:
        shutil.copyfile(os.path.join(HERE, pid + '.webp'), os.path.join(STILLS, pid + '.webp'))
    shutil.copyfile(os.path.join(HERE, 'index.json'), os.path.join(STILLS, 'index.json'))
    for f in bands:
        shutil.copyfile(f, os.path.join(BAND_DIR, os.path.basename(f)))
    print(f'Copied {len(made)} stills to assets/lab/stills/ and the band to assets/home/captures/')


if __name__ == '__main__':
    main()
