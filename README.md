# Stormriders — static site

Plain HTML/CSS/JS rebuild of the former Framer site (stormriders.be). No build step, no dependencies.

## Run locally
    python3 -m http.server 8765
    open http://localhost:8765/

## Structure
- Every live URL is a folder with an `index.html` (e.g. `/events/bkwave-26/`), so existing links keep working on any static host.
- `assets/css/style.css` — shared design tokens and components (header, footer, buttons, cards, rules, wedges, lightbox).
- `assets/css/<page>.css` — page-specific styles (`home`, `event` for all event/results pages, `events`, `bkcrash`, `geschiedenis`, `over-ons`, `rulez`, `media`, `blog`, `post`).
- `assets/js/main.js` — header on scroll, mobile menu, scroll reveal, desktop-only hero video, photo lightbox (`data-lightbox`).
- `assets/img`, `assets/video`, `assets/icons` — media (still named by their original Framer hash).

Header and footer markup is repeated in each page; change it everywhere when editing navigation.
# stormriders
