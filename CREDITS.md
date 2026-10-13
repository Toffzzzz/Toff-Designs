# Credits and licences

Everything below is licensed for commercial use on a website. Keep this file up to date whenever a font, library or image is added. The licence texts sit beside the files they cover.

## In use (Round 05)

### The studio's fonts (self-hosted in `assets/studio/fonts/`)

| Font | Used for | Copyright and licence | Licence file |
|---|---|---|---|
| **Cormorant Garamond** (variable, 300 to 700, roman and italic, Latin) | Display type on the studio's pages | Copyright 2015 the Cormorant Project Authors (github.com/CatharsisFonts/Cormorant). SIL Open Font License 1.1 | `assets/studio/fonts/OFL-cormorant-garamond.txt` |
| **Work Sans** (variable regular and italic, and bold, Latin) | Text, buttons and labels on the studio's pages | Copyright 2019 The Work Sans Project Authors (github.com/weiweihuanghuang/Work-Sans). SIL Open Font License 1.1 | `assets/studio/fonts/OFL-work-sans.txt` |
| **Inter** (variable, Latin) | Only inside drawn example sites: the websites SiteKit draws in Design yours, and the Everest mock-up on its case study | Copyright 2020 The Inter Project Authors (github.com/rsms/inter). SIL Open Font License 1.1 | `assets/studio/fonts/OFL-inter.txt` |
| **Cormorant Garamond 400** (round 02's woff2, `fonts/cormorant-garamond/`) | The Lab's Letters with weight (the letters' outlines) | As above. SIL Open Font License 1.1 | `fonts/cormorant-garamond/OFL.txt` |

### The concept sites' fonts (self-hosted in each `work/<slug>/fonts/`)

All from the @fontsource npm packages, version 5.3.0, as woff2 Latin subsets. All SIL Open Font License 1.1; none has a Reserved Font Name.

| Site | Font | Copyright | Package | Licence file |
|---|---|---|---|---|
| Saltmarsh | **Fraunces** (variable, with its SOFT and WONK axes) | Copyright 2020 The Fraunces Project Authors (github.com/undercasetype/Fraunces; Undercase Type: Phaedra Charles, Flavia Zimbardi) | @fontsource-variable/fraunces 5.3.0. `fraunces-latin-wght400-600-normal.woff2` is a modified subset (weights 400 to 600) made with fontTools varLib.instancer, which the OFL allows | `work/saltmarsh/fonts/OFL-Fraunces.txt` |
| Saltmarsh | **Schibsted Grotesk** (variable) | Copyright 2023 The Schibsted-Grotesk Project Authors (github.com/schibsted/schibsted-grotesk) | @fontsource-variable/schibsted-grotesk 5.3.0 | `work/saltmarsh/fonts/OFL-Schibsted-Grotesk.txt` |
| Morrow Coffee | **Young Serif** (400) | Copyright 2023 The Young Serif Project Authors (github.com/noirblancrouge/YoungSerif) | @fontsource/young-serif 5.3.0 | `work/morrow/fonts/OFL-young-serif.txt` |
| Morrow Coffee | **Figtree** (variable) | Copyright 2022 The Figtree Project Authors (github.com/erikdkennedy/figtree) | @fontsource-variable/figtree 5.3.0 | `work/morrow/fonts/OFL-figtree.txt` |
| Atelier Wren | **Bodoni Moda** (variable, optical sizes, roman and italic) | Copyright 2020 The Bodoni Moda Project Authors (github.com/indestructible-type/Bodoni; indestructible type*) | @fontsource-variable/bodoni-moda 5.3.0 | `work/atelier-wren/fonts/OFL-BodoniModa.txt` |
| Atelier Wren | **Hanken Grotesk** (variable) | Copyright 2021 The Hanken Grotesk Project Authors (github.com/marcologous/hanken-grotesk; Hanken Design Co.) | @fontsource-variable/hanken-grotesk 5.3.0 | `work/atelier-wren/fonts/OFL-HankenGrotesk.txt` |
| Hollis & Pine | **Albert Sans** (variable) | Copyright 2021 The Albert Sans Project Authors (github.com/usted/Albert-Sans) | @fontsource-variable/albert-sans 5.3.0 | `work/hollis-and-pine/fonts/OFL-albert-sans.txt` |
| Hart & Sons | **Archivo** (variable weight and width) | Copyright 2020 The Archivo Project Authors (github.com/Omnibus-Type/Archivo) | @fontsource-variable/archivo 5.3.0 | `work/hart-and-sons/fonts/OFL-Archivo.txt` |

The Linden Clinic demo page uses the visitor's system fonts.

### The pen: Hershey cursive

The pen's lines (the two clients' names, "Tell us what you need", the footer signature) and the Lab's Ink that moves are drawn from the public-domain Hershey **cursive** single-line font (`tools/handwriting/cursive.jhf`), through `tools/handwriting/build_line.py` (into `assets/handwriting/line-data.js`), `assets/studio/inkwriter-data.js` and `assets/lab/pieces/ink/cursive-data.js`. The acknowledgement must stay with the font data (it is in `tools/handwriting/hershey-licence.txt`, at the top of `cursive-data.js`, and in full under Round 02 below): "The Hershey Fonts were originally created by Dr. A. V. Hershey while working at the U. S. National Bureau of Standards. The format of the Font data in this distribution was originally created by James Hurt, Cognition, Inc."

### Libraries (self-hosted in `vendor/`)

| Library | Version | Licence | Files | Used by |
|---|---|---|---|---|
| **three.js** | r186 (npm `three` 0.186.1) | MIT, "Copyright © 2010-2026 three.js authors" (`vendor/three/LICENSE`) | `three.core.js`, `three.module.js`, `three.webgpu.js`, `three.tsl.js`, minified with esbuild 0.28.2 (no bundling; the `@license` comments kept); addons `controls/OrbitControls.js`, `environments/RoomEnvironment.js`, `geometries/RoundedBoxGeometry.js` | Hollis & Pine's vase; the Lab's Shape a vase and A million specks |
| **Rapier 2D** | @dimforge/rapier2d-compat 0.19.3 (WebAssembly inlined) | Apache License 2.0, "Copyright 2020 Dimforge EURL" (`vendor/rapier/rapier2d/LICENSE`, taken from the rapier.js repository at tag v0.19.3, because the npm package ships none) | `rapier.mjs`, as published | The Lab's Letters with weight |
| **Rapier 3D** | @dimforge/rapier3d-compat 0.19.3 | Apache License 2.0, as above (`vendor/rapier/rapier3d/LICENSE`) | `rapier.mjs`, as published | Not loaded by any page (vendored, kept) |
| **axe-core** | 4.14.0 | Mozilla Public License 2.0, Copyright (c) 2015 - 2026 Deque Systems, Inc. (`tests/vendor/axe-core-LICENSE.txt`) | `tests/vendor/axe.min.js` | The test suite only; never loaded by a page |

GSAP 3.15.0 and Lenis 1.3.26 are still in `vendor/` from Round 01 and are not loaded (see below).

### Algorithms written for this site, after published methods

The Lab's Your initials in liquid gold (`assets/lab/pieces/gold.js`) implements, from the published papers: Stefan Gustavson's anti-aliased edge-distance estimate, the 8SSEDT signed distance transform (Danielsson; Leymarie and Levine) and B-spline bicubic texture sampling (GPU Gems 2, chapter 20). No code was copied.

### Pictures

**Real work (the owner's clients; never AI-made):**

- `assets/studio/cases/bluebird-laptop.webp`, `bluebird-phone.webp`: screenshots of the owner's Bluebird Wellness site.
- `work/bluebird/img/bb-*.webp`: crops of screenshots of the live Bluebird site (its own line drawings).
- `assets/home/captures/hero/bluebird-*.webp`, `assets/home/captures/films/bluebird-*`: screenshots and a scroll capture of the live Bluebird site (https://toffzzzz.github.io/bluebird-wellness/), made by `tools/capture/`.
- `assets/home/captures/hero/everest-*.webp`, `assets/home/captures/films/everest-*`: screenshots and a scroll capture of the Everest Climate Solutions site, from its local finished build (`~/Downloads/everest-climate-solutions/dist`), read-only.
- `assets/everest/ac-closed`, `ac-half`, `ac-open` (`.webp`): the air conditioner pictures from the Everest project, used by the cooling scene on its case study.
- `assets/studio/cases/sketch-bluebird.webp`, `sketch-everest.webp` (and the copies `work/bluebird/img/sketch-bluebird-*.webp`, `work/everest/img/sketch-everest-*.webp`): the pencil sketches shown on the case studies, supplied with the round 03 files. They look generated (photos of a notebook): owner to confirm (DECISIONS.md).
- `assets/face-line.svg`: the Bluebird face drawing, supplied by the owner (round 01).

**Made for this site:**

- The hero's still sketches (`assets/home/captures/hero/*-sketch*.webp`): each screenshot drawn by the site's own sketch shader.
- The concept sites' screenshots and previews (`assets/home/captures/hero/`, `assets/home/captures/concepts/`), the Lab's stills (`assets/lab/stills/`), the Lab band still (`assets/home/captures/lab-band*.webp`) and the making-of captures (`assets/lab/pieces/making/`): captures of this repo's own pages, made by `tools/capture/`.
- Link-preview images (`og-image.png`, `work/*/img/og.jpg`, `work/saltmarsh/img/saltmarsh-share.jpg`, `work/hart-and-sons/img/share.png`), icons (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `work/*/img/icon.svg`) and Morrow's `rule.svg`: made for this site.
- Every illustration on the concept sites (Hart & Sons' copper pipework, the maps, Morrow's cup and hand-drawn accents, Atelier Wren's swatches, Hollis & Pine's product drawings, Saltmarsh's room plan): drawn in code (SVG, canvas, WebGL).
- The Lab's sample logos (`assets/studio/lab-logos/`): made for this site (round 04 files).

**Stand-ins for made-up businesses only:**

- `assets/studio/playground/playground-*.webp` (boutique, café, clinic, restaurant, salon, trades), and the copies in `work/saltmarsh/img/` (restaurant, also as AVIF), `work/morrow/img/` (café, with 640 and 960 versions), `work/atelier-wren/img/` (salon) and `work/hollis-and-pine/img/` (boutique, with a 640 version). Example interiors for the made-up businesses, supplied with the round 03 files; they stand for no real premises or people. They look AI-generated. **Source and licence not stated with the round 03 files: owner to confirm before launch**, and replace them through IMAGE-PROMPTS.md.

## Earlier records (Rounds 01 to 04, unchanged)


## In use (Round 03)

### Text fonts (self-hosted in `assets/studio/fonts/`, delivered with the round 03 files)

- **Work Sans** (regular, italic and bold, Latin), the body font. Copyright 2019 The Work Sans Project Authors (github.com/weiweihuanghuang/Work-Sans), SIL Open Font License 1.1. Licence: `assets/studio/fonts/OFL-work-sans.txt`.
- **Cormorant Garamond** (variable, weights 300–700, roman and italic, Latin), the headings. Copyright 2015 the Cormorant Project Authors, SIL Open Font License 1.1. Licence: `assets/studio/fonts/OFL-cormorant-garamond.txt`. (Replaces the round 02 woff2 files in `fonts/cormorant-garamond/`, which are kept.)
- **Inter** (variable, Latin), only inside the example client sites in the demos. Copyright 2020 The Inter Project Authors, SIL Open Font License 1.1. Licence: `assets/studio/fonts/OFL-inter.txt`.

### Images (in `assets/studio/`, delivered with the round 03 files)

- `cases/bluebird-laptop.webp`, `cases/bluebird-phone.webp`: screenshots of the owner's Bluebird Wellness site.
- `cases/sketch-bluebird.webp`, `cases/sketch-everest.webp`: the pencil sketches shown by the Sketch / Site switch.
- `playground/playground-*.webp` (boutique, café, clinic, restaurant, salon, trades): example interiors for the fictional businesses in the playground, concept studies and demos. They stand for no real premises or people. **Source and licence not stated in the round 03 files: owner to confirm before launch.**
- The pen-written enquiry heading and the footer signature (`inkwriter-data.js`): drawn from the public-domain Hershey cursive (acknowledgement below) by `make_phrases.py`.

## In use (Round 02)

### Handwriting and finale heading: Hershey cursive

The handwriting line ("You plan", "We design", "We deliver", "So... what will it be?") and the finale's "Tell us what you need" are drawn from the public-domain Hershey **cursive** single-line font (`tools/handwriting/cursive.jhf`), converted to pen strokes by `tools/handwriting/build_line.py` and `tools/handwriting/build_finale.py` (into `assets/handwriting/line-data.js` and `assets/finale/finale-data.js`). The acknowledgement below must stay with the font data (it is also in `tools/handwriting/hershey-licence.txt`):

```
USE RESTRICTION:
	This distribution of the Hershey Fonts may be used by anyone for
	any purpose, commercial or otherwise, providing that:
		1. The following acknowledgements must be distributed with
			the font data:
			- The Hershey Fonts were originally created by Dr.
				A. V. Hershey while working at the U. S.
				National Bureau of Standards.
			- The format of the Font data in this distribution
				was originally created by
					James Hurt
					Cognition, Inc.
					900 Technology Park Drive
					Billerica, MA 01821
					(mit-eddie!ci-dandelion!hurt)
		2. The font data in this distribution may be converted into
			any other format *EXCEPT* the format distributed by
			the U.S. NTIS (which organization holds the rights
			to the distribution and use of the font data in that
			particular format). Not that anybody would really
			*want* to use their format... each point is described
			in eight bytes as "xxx yyy:", where xxx and yyy are
			the coordinate values as ASCII numbers.

*PLEASE* be reassured: The legal implications of NTIS' attempt to control
a particular form of the Hershey Fonts *are* troubling. HOWEVER: We have
been endlessly and repeatedly assured by NTIS that they do not care what
we do with our version of the font data, they do not want to know about it,
they understand that we are distributing this information all over the world,
etc etc etc... but because it isn't in their *exact* distribution format, they
just don't care!!! So go ahead and use the data with a clear conscience! (If
```

### Text fonts (self-hosted in `fonts/`)

- **Cormorant Garamond** (weights 300 and 400, 400 italic), Copyright 2015 the Cormorant Project Authors (github.com/CatharsisFonts/Cormorant), SIL Open Font License 1.1. Downloaded from the official Google Fonts repository (github.com/google/fonts, `ofl/cormorantgaramond`), cut to the weights used and to Latin characters, saved as woff2. Licence: `fonts/cormorant-garamond/OFL.txt`.
- **Inter** (weights 400 and 500), Copyright 2020 The Inter Project Authors (github.com/rsms/inter), SIL Open Font License 1.1. Downloaded from the official Google Fonts repository (`ofl/inter`), cut to the weights used and to Latin characters, saved as woff2. Licence: `fonts/inter/OFL.txt`.

### Images

- `assets/showcase/ac-closed.png`, `assets/showcase/ac-open.png`: the air-conditioning unit, from the Everest Climate Solutions site (the owner's client project), supplied with the round 02 files.
- The Bluebird Wellness face drawing inside `assets/showcase/showcase.html` and `assets/enquiry/style-picker.html`: from `assets/face-line.svg`, supplied by the owner (round 01).
- `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `og-image.png`: made for this site by `tools/make-icons.py` from the Cormorant Garamond "T" (SIL Open Font License 1.1).
- The opening sketch, the plan notepad and the style picker icons: drawn for this site (round 02 files).

### Libraries

None. Every script on the page is the site's own; nothing is loaded from other sites.

## No longer used (Round 01; files kept in the project)

### Single-line fonts (the handwriting)

Source: the SVG fonts distributed with **Hershey Text** (Evil Mad Scientist), which ships with Inkscape (`share/extensions/svg_fonts`), and Windell H. Oskay's full collection at https://gitlab.com/oskay/svg-fonts. The original files are in `tools/svg-fonts/`. `tools/build-fonts.mjs` converts them into the stroke data in `paths/fonts/` (each stroke's direction is normalised, and the `…Single` versions have doubled strokes removed; both are permitted derivatives).

#### Used in Round 01

| Used for | Font | Derived from | Licence |
|---|---|---|---|
| Phrase 1 "You plan" | EMS Allure (`EMSAllure`) | Allura, Rob Leuschke, TypeSETit | SIL Open Font License 1.1 |
| Phrase 2 "WE DESIGN" | Hershey Sans 1-stroke (`HersheySans1`) | Hershey fonts, Dr A. V. Hershey | Hershey Fonts licence (below) |
| Phrase 3 "We deliver" | Hershey Serif Medium Italic, single line (`HersheySerifMedItalicSingle`) | Hershey fonts, Dr A. V. Hershey | Hershey Fonts licence (below) |
| Phrase 4 and finale heading | EMS Neato (`EMSNeato`) | Bad Script, Roman Shchyukin (Gaslight) | SIL Open Font License 1.1 |

#### Also available (fonts-preview.html)

All EMS fonts are SIL Open Font License 1.1 derivatives of OFL fonts: EMS Bird (Bilbo), EMS Bird Swash Caps (Bilbo Swash Caps), EMS Brush (Alex Brush), EMS Capitol (Sacramento), EMS Casual Hand (Covered By Your Grace), EMS Decorous Script (Petit Formal Script), EMS Delight (Delius), EMS Delight Swash Caps (Delius Swash Caps), EMS Elfin (Mountains of Christmas), EMS Felix (Felipa), EMS Herculean (Poiret One), EMS Invite (Tangerine), EMS League (League Script), EMS Little Princess (Princess Sofia), EMS Misty Night (Foglihten No03), EMS Nixish and Nixish Italic (Nixie One), EMS Osmotron (Orbitron), EMS Pancakes (Short Stack), EMS Pepita (Pecita), EMS Qwandry (Qwigley), EMS Readability and Readability Italic (Source Sans Pro Light), EMS Society (Mrs Saint Delafield), EMS Space Rocks (Atari Asteroids lettering, as labelled by the distributor; check before commercial use), EMS Swiss (Italianno), EMS Tech (Architects Daughter). Twin Sans (OFL, derived from Hershey Sans). All other Hershey fonts: Hershey Fonts licence.

The OFL text is in `tools/svg-fonts/OFL.txt`. Each font file's own metadata also states its licence and credits.

#### Hershey Fonts licence (required acknowledgement)

The Hershey Fonts may be used by anyone for any purpose, commercial or otherwise, provided that:

- The Hershey Fonts were originally created by Dr. A. V. Hershey while working at the U. S. National Bureau of Standards.
- The format of the Font data in this distribution was originally created by James Hurt, Cognition, Inc., 900 Technology Park Drive, Billerica, MA 01821.

SVG conversion by Windell H. Oskay, www.evilmadscientist.com, from emergent.unpythonic.net/software/hershey via "Hershey Fonts in SVG" by Marty McGuire.

### Text font (Round 01: variable Inter in `assets/fonts/inter/`)

- **Inter** by The Inter Project Authors (Rasmus Andersson), SIL Open Font License 1.1. Self-hosted in `assets/fonts/inter/` (latin variable font, weights 400–600); licence in `assets/fonts/inter/OFL.txt`.

### Libraries (in `vendor/`, copied from the Everest project's node_modules)

- **GSAP 3.15.0**, GreenSock: free under the GSAP Standard "no charge" licence, https://gsap.com/standard-license (commercial use allowed).
- **Lenis 1.3.26**, darkroom.engineering: MIT licence.

### Images and drawings

- `assets/face-line.svg`: the Bluebird Wellness face drawing, supplied by the owner (round 01).
- `assets/everest/ac-closed`, `ac-half`, `ac-open` (`.png` and `.webp`): the air-conditioning unit images from the owner's Everest Climate Solutions project (`public/images/`), copied unchanged.
- `assets/styles/placeholder-style.svg`: placeholder drawing for the extra style slots, made for this site.
