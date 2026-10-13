# Stormriders — static site

Plain HTML/CSS/JS. No framework, no dependencies, no build step needed to deploy: upload the folder as-is.

## Run locally
    python3 -m http.server 8765
    open http://localhost:8765/

## Versions
- `v1-framer-copy` (git tag) — the 1:1 copy of the old Framer site. Go back with `git checkout v1-framer-copy`.
- `redesign` branch — the cleaned-up redesign.

## Structure
- Every URL is a folder with an `index.html` (e.g. `/events/bkwave-26/`), so old links keep working.
- `assets/css/style.css` — the design system: tokens (colors, type scale, spacing), and every shared component.
- `assets/css/<page>.css` — only layout that is unique to that page.
- `assets/js/main.js` — header, mobile menu, scroll reveal, hero video, live wind widget, event status, lightbox, partner marquee.
- `partials/` — header, footer and icon sprite. **Edit these, never the copies inside the pages.**
- `404.html` — "page not found" (uses root-absolute links).

## Editing the header, footer or icons
1. Edit the file in `partials/`.
2. Run `node tools/sync-partials.mjs` — it copies the partial into every page between the
   `<!-- partial:… -->` markers, fixes relative paths and marks the current menu item.

## Components (in style.css)
| Need | Use |
|---|---|
| Section title | `.sh` → `.sh__text` (`.eyebrow` + `.h2` + `.sh__lead`) + optional `.link-arrow` |
| Button | `.btn` (red) · `.btn--dark` · `.btn--light` · `.btn--ghost` · `.btn--sm` |
| Event / post tile | `.card` (+ `.card--feature`, `.card--short`) inside `.card-grid` |
| Photo gallery | `.photo-grid` with `data-lightbox` (each `<a href="big.jpg"><img></a>`) |
| Results | `.ranking` (+ `.ranking-group` for several categories) |
| Practical info | `<dl class="info-grid">` |
| Key facts in a hero | `<dl class="facts">` |
| Section backgrounds | `.section` + `.section--dark` / `--mist` / `--red`, `.cut` for the diagonal top edge, `.grain` for texture |
| Fade-in on scroll | add `.reveal` |

## Live bits
- **Event status**: `<span data-window="2026-09-01/2026-10-31" data-live-label="Waiting period loopt">fallback</span>`
  shows "Start over X dagen", "Waiting period loopt · nog X dagen" or "Afgelopen" automatically.
  Update the dates when a new edition is announced.
- **Live wind**: any element with `data-wind` (see the home hero) fills itself from Open-Meteo (free, no key) for De Haan.
