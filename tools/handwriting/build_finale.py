"""Build the finale heading in the same Hershey cursive as the handwriting line.

Usage:  python3 build_finale.py        (needs numpy; run from this folder)
Writes: ../../assets/finale/finale-data.js

Two pieces, both made with build_line.py's own functions (build_line.py itself is
not changed):
  - the reprise: "So... what will it be?", shown already written (no animation)
  - the line:    "Tell us what you need", drawn by the handwriting engine
                 (assets/handwriting/handwriting.js), then a short tail down
                 towards the enquiry.
Both use the same width as the handwriting layouts (1440 laptop, 400 phone), so
they scale exactly like the handwriting line. The reprise sits on top of the
line's empty top area (same coordinates); the line's top space gives the engine
a calm writing window on laptops.

Everything adjustable is in LAYOUTS below.
"""
import json, os
import build_line as B

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'finale', 'finale-data.js')

LAYOUTS = {
    'desktop': {
        'reprise': {'width': 1440, 'band': 230, 'top': 200, 'entry_x': None, 'word_space': 0.42,
                    'lines': [('So... what will it be?', 3.6, 'center', 720)],
                    'tail': 0, 'exit_x': 720, 'stroke': 3.2},
        'line':    {'width': 1440, 'band': 230, 'top': 430, 'entry_x': None, 'word_space': 0.42,
                    'lines': [('Tell us what you need', 4.2, 'center', 720)],
                    'tail': 190, 'exit_x': 720, 'stroke': 3.2},
    },
    'mobile': {
        'reprise': {'width': 400, 'band': 110, 'top': 110, 'entry_x': None, 'word_space': 0.42,
                    'lines': [('So... what will', 2.0, 'left', 24), ('it be?', 2.0, 'left', 24)],
                    'tight': [1], 'tight_gap': 1.0, 'tail': 0, 'exit_x': 200, 'stroke': 2.2},
        'line':    {'width': 400, 'band': 122, 'top': 380, 'entry_x': None, 'word_space': 0.42,
                    'lines': [('Tell us what', 2.3, 'left', 24), ('you need', 2.3, 'left', 24)],
                    'tight': [1], 'tight_gap': 1.0, 'tail': 130, 'exit_x': 200, 'stroke': 2.2},
    },
}


def strokes_in_pen_order(main, marks, upto=None):
    """The same ordering as build_line.write(): main strokes, with each dot or
    crossbar inserted (as its own pen stroke) right after the stroke it belongs to."""
    if upto is not None:
        main = main[:upto]
    mark_at = {}
    for ms, idx in marks:
        mark_at.setdefault(idx, []).append(ms)
    items, seg_to_item = [], {}
    for i, seg in enumerate(main):
        seg_to_item[i] = len(items)
        items.append(seg)
        for ms in mark_at.get(i + 1, []):
            items.append(('M', ms[0][0]))
            items.extend(ms)
            items.append(('M', seg[3] if not isinstance(seg[0], str) else seg[1]))
    seg_to_item[len(main)] = len(items)
    strokes, cur, cum = [], [], [0.0]
    for it in items:
        if isinstance(it[0], str):
            if cur: strokes.append(cur)
            cur = []
            cum.append(cum[-1]); continue
        cur.append(it)
        cum.append(cum[-1] + B.bez_len(it))
    if cur: strokes.append(cur)
    return strokes, cum, seg_to_item


def svg_for(cfg, name, strokes, height):
    ds = [B.seg_d(st) for st in strokes]
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {cfg["width"]} {height:.0f}" '
            f'data-layout="{name}" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">\n'
            f'  <g class="hw-shadow">\n' + ''.join(f'    <path d="{d}"/>\n' for d in ds) + '  </g>\n'
            f'  <g class="hw-ink">\n' + ''.join(f'    <path d="{d}"/>\n' for d in ds) + '  </g>\n</svg>\n')


def build_piece(key, cfg, keep_tail):
    B.LAYOUTS[key] = cfg                       # in memory only
    cfg, main, marks, ranges, height, cards = B.build(key)
    upto = None if keep_tail else ranges[-1][1]
    strokes, cum, seg_to_item = strokes_in_pen_order(main, marks, upto)
    total = cum[-1]
    phrases = []
    for (a, b, by, sc), line in zip(ranges, cfg['lines']):
        ia, ib = seg_to_item[a], seg_to_item[b]
        phrases.append({'text': line[0], 'startFrac': round(cum[ia] / total, 5), 'endFrac': round(cum[ib] / total, 5),
                        'baseline': round(by, 1), 'capTop': round(by - 13 * sc, 1), 'descBottom': round(by + 22 * sc, 1)})
    if not keep_tail:
        height = max(p['descBottom'] for p in phrases) + 12
    return cfg, strokes, phrases, total, height


def main():
    line_data, reprise = {}, {}
    for name, pieces in LAYOUTS.items():
        rc, rs, rph, rt, rh = build_piece('finale-reprise-' + name, pieces['reprise'], keep_tail=False)
        lc, ls, lph, lt, lh = build_piece('finale-line-' + name, pieces['line'], keep_tail=True)
        if rh > lph[0]['capTop'] - 20:
            print(f'WARNING {name}: the reprise overlaps "{lph[0]["text"]}"')
        if any(p['descBottom'] > lh for p in lph):
            print(f'WARNING {name}: the line runs past the bottom of its picture')
        reprise[name] = {'svg': svg_for(rc, name, rs, rh), 'height': round(rh)}
        meta = {'layout': name, 'width': lc['width'], 'height': round(lh), 'strokePx': lc['stroke'],
                'totalLength': round(lt, 1), 'phrases': lph, 'cards': []}
        line_data[name] = {'svg': svg_for(lc, name, ls, lh), 'meta': meta}
        print(name, 'reprise height', round(rh), '| line length', round(lt), 'height', round(lh))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        f.write('/* Generated by tools/handwriting/build_finale.py — do not edit by hand. */\n')
        f.write('window.FINALE_LINE_DATA = ' + json.dumps(line_data, separators=(',', ':')) + ';\n')
        f.write('window.FINALE_REPRISE = ' + json.dumps(reprise, separators=(',', ':')) + ';\n')
    print('wrote', os.path.normpath(OUT))


if __name__ == '__main__':
    main()
