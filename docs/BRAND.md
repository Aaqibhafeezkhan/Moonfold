# Moonfold brand

Status: direction chosen in Phase 0 (2026-10-16). The full icon set and wiring into the apps are
Phase 1 work. The owner can override the choice; the concepts stay in the repo until then.

## Mark: the folded moon

A full moon disc whose right cap is folded over along a straight crease. The fold leaves a
crescent on the outside and a lighter folded flap on the inside. One shape carries both ideas:
a moon phase, and a page folding over to continue on the other side (the handoff).

Geometry (all derived in `assets/brand/*.svg`, generated from one parametric model):

- Disc radius R, crease at x = 0.22 R from the centre (vertical before rotation).
- Folding the cap across the crease reflects its arc onto a second circle of radius R centred
  at x = 0.44 R. The crescent is the disc minus that circle; the flap is the lens between the
  reflected arc and the crease.
- The mark is rotated -32 degrees and centred on its rotated bounding box, not on the disc centre.

Files:

| File                                        | Use                                                          |
| ------------------------------------------- | ------------------------------------------------------------ |
| `assets/brand/moonfold-mark.svg`            | Full-colour mark, transparent background                     |
| `assets/brand/moonfold-app-icon.svg`        | Rounded-square app icon master (1024)                        |
| `assets/brand/moonfold-mark-mono.svg`       | Single-colour black (macOS template tray, favicons on light) |
| `assets/brand/moonfold-mark-mono-light.svg` | Single-colour white (dark surfaces)                          |
| `assets/brand/concepts/*.svg`               | The three Phase 0 concepts, kept for the record              |

The single-colour version separates crescent and flap with a gap along the fold arc instead of a
second colour, so it survives 16 px and template rendering.

## Concepts considered

| Concept          | Idea                                           | Verdict                                                    |
| ---------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| A. Folded moon   | Moon disc with its cap folded over             | **Chosen.** Distinct silhouette, legible at 16 px.         |
| B. Turning phase | Half disc plus a page-turn half ellipse        | Rejected: reads as a generic half-moon or pill.            |
| C. Relay ribbon  | One stroke arcs into a crescent then folds out | Rejected: reads as a power or refresh icon at small sizes. |

Each concept was rendered at 256, 128, 32 and 16 px on light and dark backgrounds and checked by
eye before choosing.

## Palette

| Token     | Hex       | Use                             |
| --------- | --------- | ------------------------------- |
| Ink 900   | `#0A0E26` | Icon background (bottom-right)  |
| Ink 700   | `#1B2254` | Icon background (top-left)      |
| Amber 400 | `#F4B740` | Crescent, the one signal accent |
| Amber 100 | `#FFE2A3` | Folded flap                     |
| Amber 700 | `#C8891C` | Crease line                     |

Contrast: Amber 400 on Ink 900 is about 10.6:1 and Amber 100 on Ink 900 about 15:1 (WCAG
relative luminance), both well above AA for text and UI. The palette avoids black and white only,
clay orange and near-black cube looks used by other agent brands (BUILD-PLAN section 6).

## Wordmark

Phase 1: set "Moonfold" in an open-licensed typeface (SIL OFL, for example Inter or Geist) and
convert to outlines, so no font file ships with the logo.

## Clearance

- The mark is drawn from scratch from the geometry above; no third-party artwork was traced.
- Reverse image search of the final mark: **not done yet** (needs an upload to a search service).
  Do it in Phase 1 before the icon ships and record the result here.
