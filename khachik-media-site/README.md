# Khachik Media Site

Pixel-oriented React + Vite rebuild of the **newer (right-side)** Figma frames for Khachik Media.

## Run

```bash
cd khachik-media-site
npm install
npm run dev
```

Open the local URL Vite prints (e.g. `http://127.0.0.1:5180`).

## Routes

**Light (white)**
- `/` — Loader → Home (globe slot is a placeholder; `griflan-globe-section` is not wired)
- `/projects` — Category filters + horizontal / vertical layout toggle
- `/projects/:slug` — Project detail
- `/about` — About

**Dark showcase** (same layout, Figma dark colors — no toggle UI)
- `/dark`
- `/dark/projects`
- `/dark/projects/:slug`
- `/dark/about`

**Start a project** — Contact modal (UI only)

## Fonts

Figma uses **Larsseit** + **Paper Mono**. Self-hosted stand-ins are aliased to those family names in [`src/styles/fonts.css`](src/styles/fonts.css) (Satoshi → Larsseit, IBM Plex Mono → Paper Mono). To use the real licensed fonts, replace the files in `public/fonts/` and keep the same `@font-face` family names.

## Notes

- Artboard is **1470px**, soft-scaled to fit smaller viewports.
- Brand red: `#ea1414`
- Do not edit `../griflan-globe-section`
