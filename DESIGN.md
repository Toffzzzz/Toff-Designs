# Toff Studio portfolio: design values

The exact values used by the site. **Keep this file and `settings.js` in sync:** whenever a value changes in one, update the other. (`styles.css` holds fallbacks for the colour, stroke and shadow values; script.js overwrites them from settings.js at load.)

## Colours

| Name | Value | Where it's used | settings.js |
|---|---|---|---|
| Page | `#F7F5F0` | Page background, textarea background, the Everest room's final colour | `colors.background` |
| Ink | `#1F3A5F` | The line, studio mark, headings, links, Send button | `colors.ink` |
| Text | `#1F3A5F` | Body text | `colors.text` |
| Muted | `#5A6472` | Captions' subtitles, privacy note, scroll cue, placeholder (5.5:1 on Page) | `colors.muted` |
| Shadow | `#7D838C` | The grey copy under every drawn line | `colors.shadow` |
| Focus | `#1F3A5F` | Keyboard focus ring | `colors.focus` |
| Chat box | `#FFFEFB` | Chat box surface (styles.css) | — |
| Error | `#9C2B1F` | Chat form error message (styles.css) | — |

Everest animation colours (copied from the Everest site; used only in that section and its preview):

| Name | Value | Where it's used | settings.js |
|---|---|---|---|
| Heat peach | `#FBE3D0` | The room at the start of the AC animation | `everest.colors.warmBackground` |
| Near-neutral | `#F8F4F1` | Passed through halfway while cooling | `everest.colors.neutralBackground` |
| Cool | `#F7F5F0` | The room at the end (original: `#F6F9FD`; changed to the page colour) | `everest.colors.coolBackground` |
| Terracotta | `#B4532A` | The number at 32°C | `everest.colors.warmNumber` |
| Everest Deep Blue | `#0F2E5A` | The number at 18°C, the preview's temperature | `everest.colors.coolNumber` |
| Everest Slate | `#4B607D` | "Room temperature" / "Just right" label, preview's "Just right" | `everest.colors.label` |

## Typography

| Text | Font | Size | settings.js |
|---|---|---|---|
| Phrase 1 "You plan" | EMS Allure (single line) | 1.25 × phrase size | `phrases[0]` |
| Phrase 2 "WE DESIGN" | Hershey Sans 1-stroke, letter spacing 0.22em | 0.95 × | `phrases[1]` |
| Phrase 3 "We deliver" | Hershey Serif Medium Italic, single-line version (doubled strokes removed) | 0.95 × | `phrases[2]` |
| Phrase 4 "So... what will it be?" | EMS Neato (single line) | 1.0 × | `phrases[3]` |
| Finale "Tell us what you need" | Same as phrase 4 (EMS Neato) | finale size 1.0 | `finale.font`, `finale.size` |
| Body, captions, chat box | Inter 400 / 500 / 600 (self-hosted) | 17px body (16px phones) | — |
| Style titles | Inter 600 | clamp(26px, 2.4vw, 34px), −0.025em | — |
| Everest number | Inter 600, tabular figures | clamp(80px, min(13vw, 20svh), 180px), −0.045em | — |

Phrase size ("1 ×"): laptops clamp(58px, 7.2vw, 124px) per em; phones min(17vw, 84px), always shrunk to fit the screen. Phrase 4 wraps onto two lines on phones. Finale heading: laptops clamp(46px, 5.2vw, 92px); phones min(13vw, 58px).

## The line

| Value | Setting | settings.js |
|---|---|---|
| Stroke width | 2.6px everywhere, round caps and joins | `stroke.width` |
| Shadow offset | 0px across, 2.5px down | `shadow.offsetX`, `shadow.offsetY` |
| Shadow blur | 1.1px | `shadow.blur` |
| Shadow opacity | 0.32 | `shadow.opacity` |
| Shadow delay | 0.09s behind the line while it draws (catches up when the pen stops) | `shadow.delay` |

## Spacing scale

4, 8, 12, 16, 24, 32, 48, 64, 96px (`--space-*` in styles.css). Page gutter: clamp(20px, 6vw, 96px). Content width: 1200px. Corner radius: 24px for boxes (chat box), pills for buttons and the studio mark.

## Animation speeds (settings.js `speeds`, `everest`, `finale`)

| What | Value |
|---|---|
| Writing letters | 8 em of pen travel per second |
| Joining lines | 0.95 screen heights per second |
| Style drawings (the face) | 0.5 screen heights per second |
| Small strokes of a drawing | 0.9 screen heights per second |
| Pause between strokes / words | 0.035s / 0.14s |
| Laptops: scroll per second of sideways drawing | 0.16 screen heights |
| Laptops: where the pen draws | 0.62 of the screen height from the top |
| Laptops: each phrase is written while it moves from | 66% to 30% down the screen |
| Laptops: fastest catch-up | 1.8 × natural speed |
| Everest AC animation | 7s on phones; 0.6 screen heights of scrolling on laptops |
| Everest internal phases (original) | intro 0–0.06, cooling 0.06–0.85, "Just right" 0.85–0.88 |
| Everest flap | half open at 27°C, open at 22°C, crossfade 0.03 |
| Finale | previews slide in 1.6s, row up 1.2s, chat box rises 0.9s |
| Finale pin (laptops only) | 2.2 screen heights |
| Finale row final size | 0.42 of its big size |
| Captions | fade and rise 14px over 900ms, once |

## Breakpoints

- **Phones:** 767px wide and below (`breakpoints.phone`). Phone layout; animations play by themselves; no pin.
- **Touch tablets** (no hover, coarse pointer): laptop layout, but animations play by themselves and the finale doesn't pin.
- **Laptops/desktops:** above 767px with a mouse or trackpad: scroll-driven; the finale pins.

## Motion rules

- Laptops: everything is driven by scrolling at a smooth, natural speed, never rushed (never faster than 1.8 × natural), starting only when that part is on screen.
- Phones: each part plays by itself when it comes into view, at natural speed.
- Nothing ever reverses or replays when scrolling back up. Coming back from another page reloads it at the top.
- Only the finale pins (laptops only).
- The page always opens at the very top.
- Reduced motion: every section shown finished, no animation, no pin, no smooth scrolling.
