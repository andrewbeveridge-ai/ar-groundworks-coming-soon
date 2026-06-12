# Photo Placeholders — Arch City Property Care

Every image on the site ships as a **branded-graphic placeholder** (charcoal block,
logo mark, tagline, slot label) — never stock. Each placeholder:

- carries `class="photo-placeholder" data-slot="SLOTNAME"` with a fixed aspect ratio
  (so a real photo drops in 1:1 with no layout shift),
- is preceded by an HTML comment `<!-- PHOTO-SLOT: SLOTNAME | WxH | swap with real photo -->`,
- has a row in this file.

**Swap pass:** `grep -rn "PHOTO-SLOT" .` to find every slot to replace.

| Slot               | Ratio     | Page(s)                | KB-03 shot (intended)                    | Status      |
|--------------------|-----------|------------------------|------------------------------------------|-------------|
| hero-truck-trailer | 1600×900  | Home                   | Truck + trailer, loaded, hero shot       | placeholder |
| about-vehicle-1    | 1200×900  | About                  | The rig / vehicle, detail                | placeholder |
| about-vehicle-2    | 1200×900  | About                  | Vehicle ready to work                    | placeholder |
| action-jobsite     | 1600×900  | Home / About / Services| Owner working a job site (action)        | placeholder |
| service-haul       | 800×600   | Home / Services        | Material delivery & spreading            | placeholder |
| service-cleanup    | 800×600   | Home / Services        | Debris removal / hauling / cleanup       | placeholder |
| service-lawn       | 800×600   | Services               | Lawn / light landscaping (coming soon)   | placeholder |
| design-sample      | 800×600   | Home / Services / design| AI Landscape Design before/after render | placeholder |
| og-share           | 1200×630  | meta (all pages)       | Brand social share card                  | placeholder (SVG — replace with PNG/JPG) |

## Notes

- `og-share` currently ships as `assets/og-share.svg`. Most social crawlers prefer
  PNG/JPG. When a real share card exists, save `assets/og-share.png` (1200×630) and
  update the `og:image` paths in each page `<head>`.
- `design-sample` real swap is gated on KB-09 portfolio piece #1 — the same gate that
  unlocks `/design.html` indexing.
