#!/usr/bin/env python3
"""Write sitemap.xml from settings.js siteUrl (round-05.md 7.4: search files are built from one setting).

Usage: python3 tools/build_sitemap.py
Lists the studio's own pages only. The concept sites carry noindex, so they're left out on purpose.
Run it again whenever siteUrl changes (for example when the site moves to its own domain).
"""
import datetime, os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PAGES = ['', 'work/bluebird/', 'work/everest/', 'lab.html']

def site_url():
    s = open(os.path.join(ROOT, 'settings.js'), encoding='utf-8').read()
    m = re.search(r"siteUrl\s*:\s*['\"]([^'\"]+)['\"]", s)
    if not m:
        raise SystemExit('settings.js has no siteUrl')
    return m.group(1).rstrip('/') + '/'

def main():
    base, today = site_url(), datetime.date.today().isoformat()
    rows = ''.join(f'  <url><loc>{base}{p}</loc><lastmod>{today}</lastmod></url>\n' for p in PAGES)
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + rows + '</urlset>\n'
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write(xml)
    print('sitemap.xml written for', base, '(%d pages)' % len(PAGES))

if __name__ == '__main__':
    main()
