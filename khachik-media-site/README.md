# Khachik Media Site

React + Vite implementation of the Khachik Media portfolio (Figma artboard **1470px**).

## Run

```bash
npm install
npm run dev
```

## Routes

**Light**
- `/` — Home + interactive projects globe
- `/projects` — Filters + horizontal / vertical layout
- `/projects/:slug` — Project detail
- `/about`

**Dark showcase** (same layout, dark tokens — no toggle)
- `/dark`, `/dark/projects`, `/dark/projects/:slug`, `/dark/about`

## Fonts

Figma: **Larsseit** + **Paper Mono**. Self-hosted stand-ins in `public/fonts/` are aliased in `src/styles/fonts.css` (Satoshi → Larsseit, IBM Plex Mono → Paper Mono).

## Notes

- Brand red: `#CD001A`
- Globe sources live under `src/globe/` (embedded on Home only)
