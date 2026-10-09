# Credits and licences

Everything below is licensed for commercial use on a website. Keep this file up to date whenever a font, library or image is added.

## Single-line fonts (the handwriting)

Source: the SVG fonts distributed with **Hershey Text** (Evil Mad Scientist), which ships with Inkscape (`share/extensions/svg_fonts`), and Windell H. Oskay's full collection at https://gitlab.com/oskay/svg-fonts. The original files are in `tools/svg-fonts/`. `tools/build-fonts.mjs` converts them into the stroke data in `paths/fonts/` (each stroke's direction is normalised, and the `…Single` versions have doubled strokes removed; both are permitted derivatives).

### In use

| Used for | Font | Derived from | Licence |
|---|---|---|---|
| Phrase 1 "You plan" | EMS Allure (`EMSAllure`) | Allura, Rob Leuschke, TypeSETit | SIL Open Font License 1.1 |
| Phrase 2 "WE DESIGN" | Hershey Sans 1-stroke (`HersheySans1`) | Hershey fonts, Dr A. V. Hershey | Hershey Fonts licence (below) |
| Phrase 3 "We deliver" | Hershey Serif Medium Italic, single line (`HersheySerifMedItalicSingle`) | Hershey fonts, Dr A. V. Hershey | Hershey Fonts licence (below) |
| Phrase 4 and finale heading | EMS Neato (`EMSNeato`) | Bad Script, Roman Shchyukin (Gaslight) | SIL Open Font License 1.1 |

### Also available (fonts-preview.html)

All EMS fonts are SIL Open Font License 1.1 derivatives of OFL fonts: EMS Bird (Bilbo), EMS Bird Swash Caps (Bilbo Swash Caps), EMS Brush (Alex Brush), EMS Capitol (Sacramento), EMS Casual Hand (Covered By Your Grace), EMS Decorous Script (Petit Formal Script), EMS Delight (Delius), EMS Delight Swash Caps (Delius Swash Caps), EMS Elfin (Mountains of Christmas), EMS Felix (Felipa), EMS Herculean (Poiret One), EMS Invite (Tangerine), EMS League (League Script), EMS Little Princess (Princess Sofia), EMS Misty Night (Foglihten No03), EMS Nixish and Nixish Italic (Nixie One), EMS Osmotron (Orbitron), EMS Pancakes (Short Stack), EMS Pepita (Pecita), EMS Qwandry (Qwigley), EMS Readability and Readability Italic (Source Sans Pro Light), EMS Society (Mrs Saint Delafield), EMS Space Rocks (Atari Asteroids lettering, as labelled by the distributor; check before commercial use), EMS Swiss (Italianno), EMS Tech (Architects Daughter). Twin Sans (OFL, derived from Hershey Sans). All other Hershey fonts: Hershey Fonts licence.

The OFL text is in `tools/svg-fonts/OFL.txt`. Each font file's own metadata also states its licence and credits.

### Hershey Fonts licence (required acknowledgement)

The Hershey Fonts may be used by anyone for any purpose, commercial or otherwise, provided that:

- The Hershey Fonts were originally created by Dr. A. V. Hershey while working at the U. S. National Bureau of Standards.
- The format of the Font data in this distribution was originally created by James Hurt, Cognition, Inc., 900 Technology Park Drive, Billerica, MA 01821.

SVG conversion by Windell H. Oskay, www.evilmadscientist.com, from emergent.unpythonic.net/software/hershey via "Hershey Fonts in SVG" by Marty McGuire.

## Text font

- **Inter** by The Inter Project Authors (Rasmus Andersson), SIL Open Font License 1.1. Self-hosted in `assets/fonts/inter/` (latin variable font, weights 400–600); licence in `assets/fonts/inter/OFL.txt`.

## Libraries (in `vendor/`, copied from the Everest project's node_modules)

- **GSAP 3.15.0**, GreenSock: free under the GSAP Standard "no charge" licence, https://gsap.com/standard-license (commercial use allowed).
- **Lenis 1.3.26**, darkroom.engineering: MIT licence.

## Images and drawings

- `assets/face-line.svg`: the Bluebird Wellness face drawing, supplied by the owner (round 01).
- `assets/everest/ac-closed`, `ac-half`, `ac-open` (`.png` and `.webp`): the air-conditioning unit images from the owner's Everest Climate Solutions project (`public/images/`), copied unchanged.
- `assets/styles/placeholder-style.svg`: placeholder drawing for the extra style slots, made for this site.
