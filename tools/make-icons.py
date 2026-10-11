"""Make the favicon, Apple touch icon and link-preview (Open Graph) image.

Usage:  python3 tools/make-icons.py      (needs fonttools, pillow and playwright)

Writes, in the project folder:
  favicon.svg            gold "T" monogram (Cormorant Garamond) on midnight
  favicon.ico            the same, 16/32/48px
  apple-touch-icon.png   180 x 180
  og-image.png           1200 x 630: the monogram and the studio name in cream

The colours and studio name below should match settings.js (colors.bg,
colors.accent, colors.ink, studioName); run this again after changing them.
"""
import asyncio, base64, io, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from PIL import Image
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG, GOLD, CREAM = '#0E1628', '#D8AC5F', '#F1E3C6'
STUDIO = 'Toff Studio'
SERIF = os.path.join(ROOT, 'fonts', 'cormorant-garamond', 'cormorant-garamond-400.woff2')
SERIF_LIGHT = os.path.join(ROOT, 'fonts', 'cormorant-garamond', 'cormorant-garamond-300.woff2')


def glyph_path(font_file, char):
    f = TTFont(font_file)
    gs = f.getGlyphSet(); name = f.getBestCmap()[ord(char)]
    pen = SVGPathPen(gs); gs[name].draw(pen)
    bp = BoundsPen(gs); gs[name].draw(bp)
    return pen.getCommands(), bp.bounds


def monogram_svg(size=64, radius=12, fill_ratio=0.62):
    d, (x0, y0, x1, y1) = glyph_path(SERIF, 'T')
    w, h = x1 - x0, y1 - y0
    s = size * fill_ratio / max(w, h)
    tx = (size - w * s) / 2 - x0 * s
    ty = (size + h * s) / 2 + y0 * s          # font y points up: flip
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">'
            f'<rect width="{size}" height="{size}" rx="{radius}" fill="{BG}"/>'
            f'<path fill="{GOLD}" transform="translate({tx:.2f} {ty:.2f}) scale({s:.5f} {-s:.5f})" d="{d}"/></svg>\n')


def font_face(name, path, weight):
    b64 = base64.b64encode(open(path, 'rb').read()).decode()
    return f"@font-face{{font-family:'{name}';src:url(data:font/woff2;base64,{b64}) format('woff2');font-weight:{weight}}}"


async def render(pg, html, w, h):
    await pg.set_viewport_size({'width': w, 'height': h})
    await pg.set_content(html); await pg.evaluate('document.fonts.ready')
    return await pg.screenshot(type='png')


async def main():
    fav = monogram_svg()
    open(os.path.join(ROOT, 'favicon.svg'), 'w').write(fav)
    square = monogram_svg(radius=0)            # iOS rounds the corners itself
    css = font_face('CG', SERIF, 400) + font_face('CG', SERIF_LIGHT, 300)
    og = f"""<html><head><style>{css}
      html,body{{margin:0;width:1200px;height:630px;background:{BG};}}
      .wrap{{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px}}
      .mono{{width:168px;height:168px}} .mono svg{{width:100%;height:100%;display:block}}
      .name{{font:300 92px/1 'CG';letter-spacing:.02em;color:{CREAM}}}
      .rule{{width:56px;height:1px;background:{GOLD}}}
    </style></head><body><div class="wrap"><div class="mono">{monogram_svg(radius=26)}</div><div class="rule"></div><div class="name">{STUDIO}</div></div></body></html>"""
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        icon = await render(pg, f'<html><body style="margin:0">{square.replace("<svg ", "<svg width=180 height=180 ")}</body></html>', 180, 180)
        open(os.path.join(ROOT, 'apple-touch-icon.png'), 'wb').write(icon)
        big = await render(pg, f'<html><body style="margin:0;background:transparent">{fav.replace("<svg ", "<svg width=256 height=256 ")}</body></html>', 256, 256)
        open(os.path.join(ROOT, 'og-image.png'), 'wb').write(await render(pg, og, 1200, 630))
        await b.close()
    im = Image.open(io.BytesIO(big)).convert('RGBA')
    im.save(os.path.join(ROOT, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
    print('wrote favicon.svg, favicon.ico, apple-touch-icon.png, og-image.png')


asyncio.run(main())
