#!/usr/bin/env python3
"""Put the concept sites' photos in place: python3 tools/add-images.py [--force] [--dry-run] [--source DIR] [--only NAME ...]

The owner makes each photo with its prompt in IMAGE-PROMPTS.md and downloads it into
~/Downloads/toff-round-05-images/, named as IMAGE-PROMPTS.md says (only the name before the
extension matters: saltmarsh-room.png, saltmarsh-room.jpg and saltmarsh-room.webp all match
"saltmarsh-room"; capitals and spaces are forgiven). This script:

  1. finds each expected photo in that folder by its name;
  2. crops it to the right shape (centred, or around the point given below) and resizes it to the
     exact size the page expects, plus the smaller versions for srcset (-1200 and -640 where the
     photo is wider than that; a few photos have their own extra versions, listed below);
  3. saves each as WebP (quality 82) in the right folder (work/<slug>/img/, or
     assets/studio/playground/ for SiteKit's plumber);
  4. never overwrites a file that is already there, unless you add --force;
  5. prints what it did, anything it had to enlarge, and which photos are still missing.

It only writes the picture files. Using a photo on a page is a small HTML change, described for
each photo in IMAGE-PROMPTS.md ("Wiring it in").

Needs Python 3 and Pillow (pip3 install pillow). Nothing is downloaded and nothing is sent anywhere.
"""
import argparse
import os
import re
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit('add-images.py needs Pillow: pip3 install pillow')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SOURCE = os.path.expanduser('~/Downloads/toff-round-05-images')
QUALITY = 82
READABLE = ('.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.bmp', '.gif')

# Every photo IMAGE-PROMPTS.md asks for.
#   name:    the file name to download it as (any image extension)
#   folder:  where the WebP files go, relative to the repo
#   size:    (width, height) of the main file, <name>.webp
#   focus:   (x, y) from 0 to 1: the point kept in the middle when cropping (default the centre)
#   extra:   other files made from the same photo: (file name, width, height[, focus])
#   srcset:  smaller versions to make, by width (default: 1200 and 640, where smaller than the main width)
PHOTOS = [
    # ---------------------------------------------------------------- Saltmarsh
    {'name': 'saltmarsh-hero', 'folder': 'work/saltmarsh/img', 'size': (2400, 1500), 'focus': (0.5, 0.55),
     # the page's hero uses saltmarsh-hero.webp at 1200 wide and saltmarsh-hero-2400.webp for large screens
     'main_as': 'saltmarsh-hero-2400.webp', 'extra': [('saltmarsh-hero.webp', 1200, 750)], 'srcset': [640]},
    {'name': 'saltmarsh-room', 'folder': 'work/saltmarsh/img', 'size': (2400, 1500)},
    {'name': 'saltmarsh-back-room', 'folder': 'work/saltmarsh/img', 'size': (1600, 1000)},
    {'name': 'saltmarsh-dishes-1', 'folder': 'work/saltmarsh/img', 'size': (1200, 1200)},
    {'name': 'saltmarsh-dishes-2', 'folder': 'work/saltmarsh/img', 'size': (1200, 1200)},
    {'name': 'saltmarsh-dishes-3', 'folder': 'work/saltmarsh/img', 'size': (1200, 1200)},
    {'name': 'saltmarsh-dishes-4', 'folder': 'work/saltmarsh/img', 'size': (1200, 1200)},
    {'name': 'saltmarsh-bar', 'folder': 'work/saltmarsh/img', 'size': (1600, 1067)},
    # ---------------------------------------------------------------- Morrow Coffee
    {'name': 'morrow-counter-morning', 'folder': 'work/morrow/img', 'size': (2400, 1500)},
    {'name': 'morrow-long-table', 'folder': 'work/morrow/img', 'size': (1600, 1200)},
    {'name': 'morrow-bench-outside', 'folder': 'work/morrow/img', 'size': (1600, 1200)},
    {'name': 'morrow-dawn-bake', 'folder': 'work/morrow/img', 'size': (1600, 1200)},
    # ---------------------------------------------------------------- Atelier Wren
    {'name': 'aw-hero-chair', 'folder': 'work/atelier-wren/img', 'size': (2400, 3000), 'focus': (0.5, 0.45)},
    {'name': 'aw-look-soft-bob', 'folder': 'work/atelier-wren/img', 'size': (1600, 2000), 'focus': (0.5, 0.4)},
    {'name': 'aw-look-honey-balayage', 'folder': 'work/atelier-wren/img', 'size': (1600, 2000), 'focus': (0.5, 0.4)},
    {'name': 'aw-look-smooth-blow-dry', 'folder': 'work/atelier-wren/img', 'size': (1600, 2000), 'focus': (0.5, 0.4)},
    {'name': 'aw-look-long-layers', 'folder': 'work/atelier-wren/img', 'size': (1600, 2000), 'focus': (0.5, 0.4)},
    {'name': 'aw-look-copper-gloss', 'folder': 'work/atelier-wren/img', 'size': (1600, 2000), 'focus': (0.5, 0.4)},
    {'name': 'aw-look-soft-waves', 'folder': 'work/atelier-wren/img', 'size': (1600, 2000), 'focus': (0.5, 0.4)},
    {'name': 'aw-before', 'folder': 'work/atelier-wren/img', 'size': (2400, 1500)},
    {'name': 'aw-after', 'folder': 'work/atelier-wren/img', 'size': (2400, 1500)},
    {'name': 'aw-stylists-ana', 'folder': 'work/atelier-wren/img', 'size': (1200, 1500), 'focus': (0.5, 0.4)},
    {'name': 'aw-stylists-theo', 'folder': 'work/atelier-wren/img', 'size': (1200, 1500), 'focus': (0.5, 0.4)},
    {'name': 'aw-stylists-isla', 'folder': 'work/atelier-wren/img', 'size': (1200, 1500), 'focus': (0.5, 0.4)},
    {'name': 'aw-stylists-sam', 'folder': 'work/atelier-wren/img', 'size': (1200, 1500), 'focus': (0.5, 0.4)},
    # ---------------------------------------------------------------- Hollis & Pine
    {'name': 'hero-shop-interior', 'folder': 'work/hollis-and-pine/img', 'size': (2400, 1500)},
    {'name': 'hearth-vase-glazes', 'folder': 'work/hollis-and-pine/img', 'size': (2000, 2000)},
    {'name': 'maker-maren-holt', 'folder': 'work/hollis-and-pine/img', 'size': (1600, 2000)},
    {'name': 'field-linen-detail', 'folder': 'work/hollis-and-pine/img', 'size': (1600, 2000)},
    {'name': 'ruth-okafor-knit', 'folder': 'work/hollis-and-pine/img', 'size': (1600, 2000)},
    {'name': 'shopfront', 'folder': 'work/hollis-and-pine/img', 'size': (2000, 1250)},
    # ---------------------------------------------------------------- Hart & Sons Plumbing
    {'name': 'van-street', 'folder': 'work/hart-and-sons/img', 'size': (2400, 1600),
     'extra': [('van-street-phone.webp', 1200, 1500, (0.5, 0.5))]},
    {'name': 'boiler-service', 'folder': 'work/hart-and-sons/img', 'size': (1600, 1200)},
    {'name': 'on-the-day', 'folder': 'work/hart-and-sons/img', 'size': (1600, 1067)},
    {'name': 'hart-family', 'folder': 'work/hart-and-sons/img', 'size': (1200, 1500), 'focus': (0.5, 0.4)},
    # ---------------------------------------------------------------- SiteKit (Design yours), a made-up plumber
    {'name': 'playground-plumber', 'folder': 'assets/studio/playground', 'size': (1200, 751), 'srcset': []},
]


def norm(stem):
    """'Saltmarsh Room (1)' -> 'saltmarsh-room-1'."""
    return re.sub(r'[^a-z0-9]+', '-', stem.lower()).strip('-')


def find_sources(folder):
    found = {}
    if not os.path.isdir(folder):
        return found
    for f in sorted(os.listdir(folder)):
        stem, ext = os.path.splitext(f)
        if ext.lower() in READABLE and not f.startswith('.'):
            found.setdefault(norm(stem), os.path.join(folder, f))
    return found


def cover(img, w, h, focus=(0.5, 0.5)):
    """Crop img to w:h around focus, then resize to exactly w x h. Returns (image, enlarged?)."""
    sw, sh = img.size
    target = w / h
    if sw / sh > target:            # too wide: trim the sides
        cw, ch = round(sh * target), sh
    else:                           # too tall: trim top and bottom
        cw, ch = sw, round(sw / target)
    fx, fy = focus
    left = min(max(round(fx * sw - cw / 2), 0), sw - cw)
    top = min(max(round(fy * sh - ch / 2), 0), sh - ch)
    crop = img.crop((left, top, left + cw, top + ch))
    return crop.resize((w, h), Image.LANCZOS), (cw < w or ch < h)


def outputs_for(p):
    """[(file name, w, h, focus)] for one photo entry."""
    w, h = p['size']
    focus = p.get('focus', (0.5, 0.5))
    main = p.get('main_as', p['name'] + '.webp')
    out = [(main, w, h, focus)]
    for e in p.get('extra', []):
        out.append((e[0], e[1], e[2], e[3] if len(e) > 3 else focus))
    for sw in p.get('srcset', [1200, 640]):
        if sw < w:
            out.append((f"{p['name']}-{sw}.webp", sw, round(sw * h / w), focus))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--source', default=DEFAULT_SOURCE, help='folder the photos were downloaded into (default: %(default)s)')
    ap.add_argument('--force', action='store_true', help='replace files that are already in place')
    ap.add_argument('--dry-run', action='store_true', help='say what would happen, write nothing')
    ap.add_argument('--only', nargs='+', metavar='NAME', help='only these photos (names as in IMAGE-PROMPTS.md)')
    args = ap.parse_args()

    wanted = PHOTOS
    if args.only:
        names = {norm(n) for n in args.only}
        wanted = [p for p in PHOTOS if p['name'] in names]
        unknown = names - {p['name'] for p in PHOTOS}
        if unknown:
            print('Not a photo IMAGE-PROMPTS.md asks for: ' + ', '.join(sorted(unknown)))

    sources = find_sources(args.source)
    if not os.path.isdir(args.source):
        print(f'The folder {args.source} does not exist yet. Make it, download the photos into it, and run this again.')
    print(('Dry run: nothing will be written.\n' if args.dry_run else '') + f'Looking in {args.source}\n')

    made, kept, enlarged, missing = [], [], [], []
    for p in wanted:
        src = sources.get(p['name'])
        if not src:
            missing.append(p)
            continue
        try:
            img = Image.open(src)
            img = ImageOps.exif_transpose(img).convert('RGB')
        except Exception as e:  # noqa: BLE001  (a broken download should not stop the rest)
            print(f"  {p['name']}: could not read {os.path.basename(src)} ({e}); skipped")
            missing.append(p)
            continue
        folder = os.path.join(ROOT, p['folder'])
        print(f"{p['name']}  ({os.path.basename(src)}, {img.size[0]} x {img.size[1]})")
        for fname, w, h, focus in outputs_for(p):
            dest = os.path.join(folder, fname)
            rel = os.path.relpath(dest, ROOT)
            if os.path.exists(dest) and not args.force:
                print(f'  kept      {rel} (already there; --force replaces it)')
                kept.append(rel)
                continue
            out, up = cover(img, w, h, focus)
            if up:
                enlarged.append(f'{rel} ({w} x {h} from {img.size[0]} x {img.size[1]})')
            if args.dry_run:
                print(f'  would make {rel}  {w} x {h}' + ('  (enlarged)' if up else ''))
                continue
            os.makedirs(folder, exist_ok=True)
            out.save(dest, 'WEBP', quality=QUALITY, method=6)
            print(f'  made      {rel}  {w} x {h}, {os.path.getsize(dest) // 1024} KB' + ('  (enlarged)' if up else ''))
            made.append(rel)

    print()
    print(f'{len(made)} file(s) {"would be " if args.dry_run else ""}made, {len(kept)} kept as they were.')
    if enlarged:
        print('\nEnlarged, because the download was smaller than the page needs (a larger original would look sharper):')
        for e in enlarged:
            print('  ' + e)
    if missing:
        print(f'\nStill missing ({len(missing)}): download each into {args.source} with this name (any image type):')
        for p in missing:
            print(f"  {p['name']}  ({p['size'][0]} x {p['size'][1]}, for {p['folder']}/)")
    else:
        print('\nEvery photo you named is in place.' if args.only else '\nEvery photo asked for is in place.')
    if made and not args.dry_run:
        print('\nNext: make the page changes in IMAGE-PROMPTS.md ("Wiring it in") for the photos you added, then look at each page at 390 and 1440.')


if __name__ == '__main__':
    main()
