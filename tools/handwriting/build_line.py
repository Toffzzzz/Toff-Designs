"""Build the handwriting opening as ONE smooth SVG path (plus pen-lift subpaths
for dots and crossbars), from the public-domain Hershey "cursive" single-line font.

Usage:  python3 build_line.py            -> writes line-desktop.svg and line-mobile.svg

Everything is configurable in LAYOUTS below. Coordinates are in SVG user units
(the page scales the SVG to the screen width).
"""
import json, math
import numpy as np
from jhf import load

FONT = load('cursive.jhf')

# ---------------------------------------------------------------- layout
LAYOUTS = {
    'desktop': {
        'width': 1440,
        'band': 700,          # vertical space for each phrase + its showcase card
        'top': 520,           # baseline of the first phrase
        'entry_x': 720,       # the line enters at the top centre (continuing from the opening page)
        'word_space': 0.42,   # gap between words, as a fraction of the font's space width
        'lines': [            # (text, scale, align, x) ; align: left/right/center
            ('You plan',               5.6, 'left',   150),
            ('We design',              5.6, 'right', 1290),
            ('We deliver',             5.6, 'left',   150),
            ('So... what will it be?', 4.2, 'center', 720),
        ],
        # showcase cards beside phrases, on the opposite side: (phrase, kind, x, top-offset-from-baseline, w, h)
        'cards': [
            ('You plan',   'plan',     950, -262, 370, 360),
            ('We design',  'bluebird', 120, -262, 370, 360),
            ('We deliver', 'everest',  950, -262, 370, 360),
        ],
        'tail': 420,          # how far the line continues down after the last phrase
        'exit_x': 720,        # where the line leaves at the bottom (centre)
        'stroke': 3.2,
    },
    'mobile': {
        'width': 400,
        'band': 532,
        'top': 300,
        'entry_x': 200,
        'word_space': 0.42,
        'lines': [
            ('You plan',   2.6, 'left', 40),
            ('We design',  2.6, 'left', 40),
            ('We deliver', 2.6, 'left', 40),
            ('So...',      2.6, 'left', 40),
            ('what will',  2.6, 'left', 40),
            ('it be?',     2.6, 'left', 40),
        ],
        'cards': [            # under each phrase; the line runs down the right-hand lane past them
            ('You plan',   'plan',     40, 78, 300, 316),
            ('We design',  'bluebird', 40, 78, 300, 316),
            ('We deliver', 'everest',  40, 78, 300, 316),
        ],
        'lane_x': 380,
        'tail': 300,
        'exit_x': 200,
        'stroke': 2.2,
        'tight': [4, 5],      # these lines follow the previous one closely (same sentence)
        'tight_gap': 0.26,
    },
}

# ---------------------------------------------------------------- glyph helpers
def is_mark(ch, idx, stroke, n):
    xs = [p[0] for p in stroke]; ys = [p[1] for p in stroke]
    diag = math.hypot(max(xs) - min(xs), max(ys) - min(ys))
    if diag <= 3.2:                     # dots (i, ., ?)
        return True
    if ch == 't' and idx == n - 1:      # t crossbar
        return True
    return False

def trim_lead_in(stroke):
    """Drop the little upward hook some capitals start with, so the stroke
    begins at its top point heading right (lets connectors arrive from above)."""
    ys = [p[1] for p in stroke]
    k = ys.index(min(ys))
    return stroke[k:] if 0 < k < len(stroke) * 0.5 else stroke

def word_strokes(word, first_in_phrase=False):
    """Return (main_polyline, marks) for a word in font units, baseline-relative.
    Letters' non-mark strokes are chained into one continuous polyline; the
    short gaps between a letter's pieces are bridged (they are retrace points
    in the original pen path)."""
    x = 0.0
    chain = []
    marks = []
    for ch in word:
        L, R, S = FONT[ch]
        ox = x - L
        for i, s in enumerate(S):
            if first_in_phrase and ch == word[0] and x == 0.0 and i == 0 and ch in 'YWS':
                s = trim_lead_in(s)
            pts = [(px + ox, py) for px, py in s]
            if is_mark(ch, i, s, len(S)):
                marks.append(pts)
            else:
                chain.append(pts)
        x += R - L
    # join pieces that genuinely meet (tiny gaps are retrace points in the
    # original pen path); lift the pen where they don't, so no stray lines.
    pieces = [list(chain[0])]
    for piece in chain[1:]:
        gap = math.dist(pieces[-1][-1], piece[0])
        if gap <= 3.6:
            pieces[-1].extend(piece)
        else:
            pieces.append(list(piece))
    return pieces, marks, x

# ---------------------------------------------------------------- smoothing
def resample(pts, step):
    pts = np.asarray(pts, float)
    seg = np.hypot(*np.diff(pts, axis=0).T)
    keep = np.concatenate([[True], seg > 1e-9])
    pts = pts[keep]
    if len(pts) < 2:
        return pts
    seg = np.hypot(*np.diff(pts, axis=0).T)
    cum = np.concatenate([[0], np.cumsum(seg)])
    n = max(2, int(cum[-1] / step) + 1)
    t = np.linspace(0, cum[-1], n)
    return np.column_stack([np.interp(t, cum, pts[:, 0]), np.interp(t, cum, pts[:, 1])])

def split_at_cusps(pts, angle_deg=115):
    """Split a polyline where the pen sharply reverses (keeps those corners crisp)."""
    pts = np.asarray(pts, float)
    out, start = [], 0
    for i in range(1, len(pts) - 1):
        a = pts[i] - pts[i - 1]; b = pts[i + 1] - pts[i]
        na, nb = np.hypot(*a), np.hypot(*b)
        if na < 1e-9 or nb < 1e-9:
            continue
        cos = np.dot(a, b) / (na * nb)
        if math.degrees(math.acos(max(-1, min(1, cos)))) > angle_deg:
            out.append(pts[start:i + 1]); start = i
    out.append(pts[start:])
    return [o for o in out if len(o) >= 2]

def smooth(pts, passes=3):
    p = np.asarray(pts, float)
    if len(p) < 4:
        return p
    for _ in range(passes):
        q = p.copy()
        q[1:-1] = 0.25 * p[:-2] + 0.5 * p[1:-1] + 0.25 * p[2:]
        p = q
    return p

def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]; ab = b - a; n = np.hypot(*ab) or 1e-9
    v = pts - a; d = np.abs(ab[0] * v[:, 1] - ab[1] * v[:, 0]) / n
    i = int(d.argmax())
    if d[i] > eps:
        return np.vstack([rdp(pts[:i + 1], eps)[:-1], rdp(pts[i:], eps)])
    return np.vstack([a, b])

def catmull_beziers(P):
    """Centripetal-ish Catmull-Rom -> cubic Bezier segments, handles clamped."""
    P = np.asarray(P, float)
    if len(P) == 2:
        return [(P[0], P[0] + (P[1] - P[0]) / 3, P[1] - (P[1] - P[0]) / 3, P[1])]
    Q = np.vstack([P[0], P, P[-1]])
    segs = []
    for i in range(1, len(Q) - 2):
        p0, p1, p2, p3 = Q[i - 1], Q[i], Q[i + 1], Q[i + 2]
        seg = np.hypot(*(p2 - p1))
        t1 = (p2 - p0) / 6; t2 = (p3 - p1) / 6
        l1, l2 = np.hypot(*t1), np.hypot(*t2)
        if l1 > seg / 2.5: t1 *= (seg / 2.5) / l1
        if l2 > seg / 2.5: t2 *= (seg / 2.5) / l2
        segs.append((p1, p1 + t1, p2 - t2, p2))
    return segs

def poly_to_beziers(pts, scale, offset):
    """Font-unit polyline -> list of smooth cubic Bezier segments in page units."""
    pts = np.asarray(pts, float) * scale + offset
    segs = []
    for part in split_at_cusps(pts):
        r = resample(part, 1.2)
        s = smooth(r, passes=max(6, int(scale * 5)))
        s[0], s[-1] = part[0], part[-1]      # keep cusp positions exact
        simp = rdp(s, 0.35)
        segs.extend(catmull_beziers(simp))
    return segs

# ---------------------------------------------------------------- connectors
def tangent_out(segs):
    segs = [g for g in segs if not isinstance(g[0], str)]
    p0, c1, c2, p3 = segs[-1]
    d = p3 - c2
    if np.hypot(*d) < 1e-6: d = p3 - p0
    return d / np.hypot(*d)

def tangent_in(segs):
    p0, c1, c2, p3 = segs[0]
    d = c1 - p0
    if np.hypot(*d) < 1e-6: d = p3 - p0
    return d / np.hypot(*d)

def connector(a, ta, b, tb, k=0.42):
    """Gentle cubic from point a (leaving along ta) to b (arriving along tb).
    The exit handle is short so the line doesn't overshoot; the arrival handle
    is long so the line settles calmly into the next phrase."""
    d = np.hypot(*(b - a)); dy = abs(b[1] - a[1])
    h1 = min(0.28 * d, 150)
    h2 = min(0.55 * d, 0.6 * dy + 80)
    c1 = a + ta * h1; c2 = b - tb * h2
    W = CURRENT_WIDTH[0]
    c1[0] = min(max(c1[0], 14), W - 14); c2[0] = min(max(c2[0], 14), W - 14)
    return [(a, c1, c2, b)]

def route(points, t_start, t_end, k_start=0.3, k_end=0.5):
    """Smooth curve through waypoints (Catmull-Rom / Hermite), leaving along t_start and
    arriving along t_end, so it joins the letters without corners."""
    P = [np.asarray(p, float) for p in points]
    n = len(P)
    M = []
    for i in range(n):
        if i == 0:
            M.append(np.asarray(t_start) * np.hypot(*(P[1] - P[0])) * k_start * 3)
        elif i == n - 1:
            M.append(np.asarray(t_end) * np.hypot(*(P[-1] - P[-2])) * k_end * 3)
        else:
            M.append((P[i + 1] - P[i - 1]) / 2)
    W = CURRENT_WIDTH[0]
    segs = []
    for i in range(n - 1):
        c1 = P[i] + M[i] / 3; c2 = P[i + 1] - M[i + 1] / 3
        c1[0] = min(max(c1[0], 14), W - 14); c2[0] = min(max(c2[0], 14), W - 14)
        segs.append((P[i], c1, c2, P[i + 1]))
    return segs

def word_bridge(a, ta, b, tb):
    d = np.hypot(*(b - a))
    return [(a, a + ta * d * 0.35, b - tb * d * 0.35, b)]

# ---------------------------------------------------------------- build
CURRENT_WIDTH = [1440]
CARD_RECTS = {}

def build(name):
    cfg = LAYOUTS[name]
    CURRENT_WIDTH[0] = cfg['width']
    CARD_RECTS.clear()
    main = []           # list of bezier segments for the single continuous stroke
    marks = []          # list of (bezier segs, length position index) -> pen lifts
    phrase_ranges = []  # index range of segments per phrase (for phone autoplay)
    y = cfg['top']
    tight = set(cfg.get('tight', []))
    prev_end = None
    for li, (text, sc, align, ax) in enumerate(cfg['lines']):
        if li > 0:
            y += cfg['band'] * (cfg.get('tight_gap', 0.32) if li in tight else 1.0)
        words = text.split(' ')
        built = []; x = 0.0; space = (FONT[' '][1] - FONT[' '][0]) * cfg.get('word_space', 0.75)
        for wi_, w in enumerate(words):
            pieces, mk, adv = word_strokes(w, first_in_phrase=(wi_ == 0))
            built.append((pieces, mk, x)); x += adv + space
        width = (x - space) * sc
        if align == 'left': x0 = ax
        elif align == 'right': x0 = ax - width
        else: x0 = ax - width / 2
        for (cp, kind, cx, cdy, cw, ch) in cfg.get('cards', []):
            if cp == text:
                CARD_RECTS[li] = (cx, y + cdy, cw, ch, kind, text)
        start_index = len(main)
        line_segs_first = None
        for wi, (pieces, mk, wx) in enumerate(built):
            off = np.array([x0 + wx * sc, y])
            segs = poly_to_beziers(pieces[0], sc, off)
            extra = [poly_to_beziers(pc, sc, off) for pc in pieces[1:]]
            if line_segs_first is None:
                line_segs_first = segs
                if prev_end is not None and li in tight:
                    # same sentence wrapping onto a new line: lift the pen, like real handwriting
                    main.append(('M', segs[0][0]))
                elif prev_end is not None:
                    a, ta = prev_end
                    b = segs[0][0]; tin = tangent_in(segs)
                    pre = b - tin * 9 * sc          # approach along the letter's own direction
                    prev_card = CARD_RECTS.get(li - 1)
                    if cfg.get('lane_x') is not None and prev_card is not None:
                        # phones: down the right-hand lane past the card, then under it to the next phrase
                        lx = cfg['lane_x']; cb = prev_card[1] + prev_card[3]
                        wps = [a, (lx, a[1] + 34), (lx, cb + 8), ((lx + pre[0]) / 2, cb + 40), pre]
                    else:
                        # laptops: drop below the descenders on the phrase's own side, cross between
                        # the cards, and come down into the next phrase from above
                        wps = [a, (a[0] + 40, a[1] + 27 * sc), (pre[0], pre[1] - 110), pre]
                    main.extend(route(wps, ta, tin))
                    main.extend([(pre, pre + tin * 3 * sc, b - tin * 3 * sc, b)])
                elif cfg.get('entry_x') is not None:
                    # the line enters from the top centre and settles into the first letter
                    b = segs[0][0]; tin = tangent_in(segs)
                    pre = b - tin * 9 * sc
                    top_pt = np.array([cfg['entry_x'], 0.0])
                    main.extend(connector(top_pt, np.array([0, 1.0]), pre, tin))
                    main.extend([(pre, pre + tin * 3 * sc, b - tin * 3 * sc, b)])
                start_index = len(main)      # the phrase's handwriting starts here
            else:
                # pen lift between words (calmer and easier to read than a joining swirl)
                main.append(('M', segs[0][0]))
            main.extend(segs)
            for ex in extra:
                main.append(('M', ex[0][0]))
                main.extend(ex)
            for m in mk:
                xs = [p[0] for p in m]; ys = [p[1] for p in m]
                if math.hypot(max(xs) - min(xs), max(ys) - min(ys)) <= 3.2:
                    # a dot: draw as a tiny stroke so the round pen cap makes a proper dot
                    c = np.array([sum(xs) / len(xs), sum(ys) / len(ys)]) * sc + off
                    ms = [(c - [0.6, 0], c - [0.2, 0], c + [0.2, 0], c + [0.6, 0])]
                else:
                    ms = poly_to_beziers(m, sc, off)
                marks.append((ms, len(main)))
        prev_end = (main[-1][3], tangent_out(main))
        phrase_ranges.append((start_index, len(main), y, sc))
    # tail: down to the exit point at the bottom centre
    bottom = np.array([cfg['exit_x'], y + cfg['tail']])
    a, ta = prev_end
    main.extend(route([a, (a[0] + 30, a[1] + 26 * sc), bottom], ta, np.array([0, 1.0])))
    height = bottom[1]
    # safety check: the line must never pass through a showcase card (16 units of clearance)
    bad = 0
    for seg in main:
        if isinstance(seg[0], str): continue
        p0, c1, c2, p3 = [np.asarray(v, float) for v in seg]
        for t in np.linspace(0, 1, 12):
            pt = (1-t)**3*p0 + 3*(1-t)**2*t*c1 + 3*(1-t)*t**2*c2 + t**3*p3
            for (cx, cy, cw, ch, kind, txt) in CARD_RECTS.values():
                if cx - 16 < pt[0] < cx + cw + 16 and cy - 16 < pt[1] < cy + ch + 16:
                    bad += 1
    if bad:
        print(f'WARNING {name}: the line passes through a card at {bad} sample points')
    cards = [{'phrase': txt, 'kind': kind, 'x': round(cx, 1), 'y': round(cy, 1), 'w': cw, 'h': ch}
             for (cx, cy, cw, ch, kind, txt) in CARD_RECTS.values()]
    return cfg, main, marks, phrase_ranges, height, cards

def seg_d(segs, start_with_move=True):
    out = []
    for i, (p0, c1, c2, p3) in enumerate(segs):
        if i == 0 and start_with_move:
            out.append(f"M{p0[0]:.1f},{p0[1]:.1f}")
        out.append(f"C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p3[0]:.1f},{p3[1]:.1f}")
    return ' '.join(out)

def bez_len(seg, n=40):
    p0, c1, c2, p3 = [np.asarray(v, float) for v in seg]
    t = np.linspace(0, 1, n + 1)[:, None]
    pts = (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * c1 + 3 * (1 - t) * t ** 2 * c2 + t ** 3 * p3
    return float(np.hypot(*np.diff(pts, axis=0).T).sum())

def write(name):
    cfg, main, marks, ranges, height, cards = build(name)
    # Order everything in pen order: main strokes, with each dot / crossbar
    # inserted (as a pen-lift subpath) right after the stroke it belongs to.
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
    # split into pen strokes (subpaths) in drawing order; each becomes its own
    # <path> so drawing works identically in every browser (no reliance on how a
    # browser dashes across pen lifts).
    strokes, cur, cum = [], [], [0.0]
    for it in items:
        if isinstance(it[0], str):
            if cur: strokes.append(cur)
            cur = []
            cum.append(cum[-1]); continue
        cur.append(it)
        cum.append(cum[-1] + bez_len(it))
    if cur: strokes.append(cur)
    total = cum[-1]
    stroke_d = [seg_d(st) for st in strokes]
    phrases = []
    for (a, b, by, sc), line in zip(ranges, cfg['lines']):
        ia, ib = seg_to_item[a], seg_to_item[b]
        # handwriting portion of each phrase (its incoming connector is excluded)
        phrases.append({'text': line[0], 'startFrac': round(cum[ia] / total, 5), 'endFrac': round(cum[ib] / total, 5),
                        'baseline': round(by, 1), 'capTop': round(by - 13 * sc, 1), 'descBottom': round(by + 22 * sc, 1)})
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {cfg["width"]} {height:.0f}" '
           f'data-layout="{name}" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">\n'
           f'  <g class="hw-shadow">\n' + ''.join(f'    <path d="{d}"/>\n' for d in stroke_d) + '  </g>\n'
           f'  <g class="hw-ink">\n' + ''.join(f'    <path d="{d}"/>\n' for d in stroke_d) + '  </g>\n</svg>\n')
    open(f'line-{name}.svg', 'w').write(svg)
    meta = {'layout': name, 'width': cfg['width'], 'height': round(height), 'strokePx': cfg['stroke'],
            'totalLength': round(total, 1), 'phrases': phrases, 'cards': cards}
    json.dump(meta, open(f'line-{name}.json', 'w'), indent=1)
    print(name, 'items', len(items), 'length', round(total), 'height', round(height))

def write_data_js():
    data = {}
    for n in LAYOUTS:
        data[n] = {'svg': open(f'line-{n}.svg').read(), 'meta': json.load(open(f'line-{n}.json'))}
    with open('line-data.js', 'w') as f:
        f.write('/* Generated by build_line.py — do not edit by hand. */\n')
        f.write('window.HANDWRITING_DATA = ' + json.dumps(data, separators=(',', ':')) + ';\n')
    print('wrote line-data.js')

if __name__ == '__main__':
    for n in LAYOUTS:
        write(n)
    write_data_js()
