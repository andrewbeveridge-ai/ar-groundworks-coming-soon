# Brand Imagery — Arch City Property Care

The site ships **logo-driven**, not photo-driven. Real brand logo assets are
used throughout (header, footer, hero, feature cards); there are no stock photos
and no fake testimonials.

## Live brand assets (in use)

| Asset                         | Used for                          | Source                |
|-------------------------------|-----------------------------------|-----------------------|
| `assets/brand/logo-horizontal-web.png` | Header lockup              | `logo-horizontal.png` |
| `assets/brand/logo-reversed-web.png`   | Footer + About (on forest) | `logo-reversed.png`   |
| `assets/brand/logo-stacked-web.png`    | Hero / feature badges      | `logo-stacked.png`    |
| `assets/og-share.png` (1200×630)       | Social share card          | `logo-stacked.png`    |
| `favicon-32 / 180 / 512 / .ico`        | Favicons / touch icon      | `badge-circle.png`    |

The `*-web.png` files are trimmed + quantized derivatives of the full-resolution
source logos in `assets/brand/` (kept for future high-res use). Regenerate with
the Pillow script in the build history if the source logos change.

## Optional future photography

If real job photos are added later, drop them into hero/feature/service blocks at
a fixed aspect ratio (use `.ph-16x9` / `.ph-4x3` containers) so there is **no
layout shift**. Until then the branded logo cards stand in.

- `yard-sign.png` (in `assets/brand/`) is the physical yard-sign artwork — handy
  reference for tone, not used on the site directly.
- `design.html`'s real before/after render is gated on **KB-09** (portfolio
  piece #1) — the same gate that unlocks `/design.html` indexing.
