"""Shared helpers for the home page's capture scripts (Round 05, Phase 4).

Used by tools/capture/hero.py, films.py and concepts.py; not run on its own.

    serve(directory)          a read-only ThreadingHTTPServer on a free port, in a thread
                              (context manager; yields the base URL and always shuts it down)
    launch(p)                 Chromium with SwiftShader WebGL and hidden scrollbars
    new_page(browser, ...)    a fresh context and page (viewport, scale, phone, reduced motion,
                              a simulated normal device: navigator.hardwareConcurrency = 8)
    wait_settled(page)        fonts loaded, pictures on screen loaded, and the screen no longer
                              changing between two screenshots
    save_webp(img, path, ...) Pillow WebP (method 6), never wider than 2560px
    update_index(section, v)  writes one section of captures.json (in scratch/captures/ and,
                              when copying, in assets/home/captures/)
    copy_out(src, rel)        copies a final file from scratch/captures/ to assets/home/captures/

Everything is written into scratch/captures/ first; only finished files are copied, with
stable names, into assets/home/captures/. Nothing is ever written anywhere else, and the
folders that are served (the repo, the Everest folder) are only ever read.
"""
import functools
import http.server
import io
import json
import os
import shutil
import socket
import threading
import time
from contextlib import contextmanager

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCRATCH = os.path.join(ROOT, 'scratch', 'captures')
OUT = os.path.join(ROOT, 'assets', 'home', 'captures')
OUT_URL = 'assets/home/captures'          # the same folder, relative to the site root
INDEX = 'captures.json'

BLUEBIRD_URL = None                       # read from settings.js (links.bluebird) by bluebird_url()
EVEREST_DIR = os.path.expanduser('~/Downloads/everest-climate-solutions')

GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
           '--ignore-gpu-blocklist', '--hide-scrollbars']

INIT = r"""
Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
"""

# Hides the concept ribbon (it sits in the page flow at the bottom, but never let it show)
# and any cookie or consent banner a live site might put up.
HIDE_CSS = """
.toff-ribbon, [data-toff-ribbon], #cookie-banner, .cookie-banner, [class*="cookie-banner"],
[id*="cookie-banner"], [class*="consent-banner"], [id*="consent"] [role="dialog"] { display: none !important; }
html { scrollbar-width: none !important; }
::-webkit-scrollbar { display: none !important; }
"""


class Quiet(http.server.SimpleHTTPRequestHandler):
    """Static files, GET and HEAD only. SimpleHTTPRequestHandler never writes to disk."""

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


Quiet.extensions_map = dict(Quiet.extensions_map, **{
    '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm',
    '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json'})


@contextmanager
def serve(directory):
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
    s.close()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Quiet, directory=directory))
    httpd.daemon_threads = True
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    try:
        yield f'http://127.0.0.1:{port}'
    finally:
        httpd.shutdown()
        httpd.server_close()


def bluebird_url():
    """links.bluebird from settings.js (the one place the address lives)."""
    import re
    with open(os.path.join(ROOT, 'settings.js'), encoding='utf-8') as fh:
        m = re.search(r"bluebird:\s*'([^']+)'", fh.read())
    if not m:
        raise SystemExit('settings.js has no links.bluebird address')
    return m.group(1)


def launch(p):
    return p.chromium.launch(args=GL_ARGS)


def new_page(browser, w, h, scale=1, phone=False, reduced=False, local_only=True, clock=False):
    """local_only: block every request that isn't to 127.0.0.1 (the concept sites load nothing
    from elsewhere; a live site needs the network, so pass False for it)."""
    ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=scale,
                              is_mobile=phone, has_touch=phone,
                              reduced_motion='reduce' if reduced else 'no-preference')
    ctx.add_init_script(INIT)
    ctx.add_init_script('(() => { const s = () => { const st = document.createElement("style");'
                        ' st.textContent = ' + json.dumps(HIDE_CSS) + '; document.documentElement.appendChild(st); };'
                        ' if (document.documentElement) s(); else document.addEventListener("DOMContentLoaded", s); })();')
    if local_only:
        ctx.route('**/*', lambda route: route.continue_()
                  if route.request.url.startswith(('http://127.0.0.1', 'data:', 'blob:')) else route.abort())
    page = ctx.new_page()
    if clock:
        page.clock.install()
    return ctx, page


def png(b):
    from PIL import Image
    return Image.open(io.BytesIO(b)).convert('RGB')


def shot(page, **kw):
    return png(page.screenshot(type='png', **kw))


def fonts_and_images(page, timeout=8000):
    try:
        page.evaluate('document.fonts && document.fonts.ready.then(() => true)')
    except Exception:
        pass
    try:
        page.wait_for_function('''() => [...document.images].every((im) => {
            const r = im.getBoundingClientRect();
            const on = r.bottom > 0 && r.top < innerHeight && r.width > 0;
            return !on || (im.complete && im.naturalWidth > 0);
        })''', timeout=timeout)
    except Exception:
        pass


def wait_settled(page, min_wait=1500, still_for=2, gap=700, timeout=20000, clip=None):
    """Waits min_wait ms, then until `still_for` screenshots in a row (gap ms apart) are identical.
    Returns True if the screen settled within `timeout`, False if it kept changing."""
    from PIL import ImageChops
    fonts_and_images(page)
    page.wait_for_timeout(min_wait)
    t0 = time.time()
    prev = shot(page, clip=clip) if clip else shot(page)
    same = 0
    while (time.time() - t0) * 1000 < timeout:
        page.wait_for_timeout(gap)
        cur = shot(page, clip=clip) if clip else shot(page)
        diff = ImageChops.difference(prev, cur).getbbox()
        same = same + 1 if diff is None else 0
        if same >= still_for:
            return True
        prev = cur
    return False


def save_webp(img, path, quality=80, size=None, max_w=2560):
    from PIL import Image
    img = img.convert('RGB')
    if size and img.size != tuple(size):
        img = img.resize(tuple(size), Image.LANCZOS)
    if img.width > max_w:
        img = img.resize((max_w, round(img.height * max_w / img.width)), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, 'WEBP', quality=quality, method=6)
    return path


def copy_out(src, rel):
    """scratch/captures/<...> -> assets/home/captures/<rel>; returns the site-root URL."""
    dst = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(src, dst)
    return f'{OUT_URL}/{rel}'


def update_index(section, value, copy=True):
    """Replaces one top-level section (hero, films or concepts) of captures.json."""
    os.makedirs(SCRATCH, exist_ok=True)
    data = {}
    for d in (OUT, SCRATCH):
        p = os.path.join(d, INDEX)
        if os.path.exists(p):
            with open(p, encoding='utf-8') as fh:
                data = json.load(fh)
            break
    data = {'about': ('What tools/capture/ made for the home page (Round 05, Phase 4). URLs are relative '
                      'to the site root; w and h are each file\'s pixel size. Re-run tools/capture/hero.py, '
                      'films.py or concepts.py to remake a section.'),
            'hero': data.get('hero', []), 'films': data.get('films', {}), 'concepts': data.get('concepts', {})}
    data[section] = value
    text = json.dumps(data, indent=1, ensure_ascii=False) + '\n'
    with open(os.path.join(SCRATCH, INDEX), 'w', encoding='utf-8') as fh:
        fh.write(text)
    if copy:
        os.makedirs(OUT, exist_ok=True)
        with open(os.path.join(OUT, INDEX), 'w', encoding='utf-8') as fh:
            fh.write(text)


def contact_sheet(files, out, width=1600, cols=4, label=True):
    """Tiles pictures into one PNG for looking at by eye."""
    from PIL import Image, ImageDraw
    ims = [Image.open(f).convert('RGB') for f in files]
    if not ims:
        return None
    cw = width // cols
    ims = [i.resize((cw, max(1, round(i.height * cw / i.width)))) for i in ims]
    rows = [ims[k:k + cols] for k in range(0, len(ims), cols)]
    H = sum(max(i.height for i in r) + 4 for r in rows)
    sheet = Image.new('RGB', (width, H), (70, 70, 70))
    d = ImageDraw.Draw(sheet)
    y = 0
    n = 0
    for r in rows:
        for j, i in enumerate(r):
            sheet.paste(i, (j * cw, y))
            if label:
                d.text((j * cw + 6, y + 4), os.path.basename(files[n]), fill=(255, 0, 140))
            n += 1
        y += max(i.height for i in r) + 4
    os.makedirs(os.path.dirname(out), exist_ok=True)
    sheet.save(out)
    return out
