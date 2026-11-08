# Globe section

A recreation of the Griflan Labs hero: project thumbnails plastered onto a huge
sphere with a latitude/longitude lattice, scroll or drag to spin, a slow idle
drift, hover highlight, and click-to-open project panels.

Stack: Vite + React 18 + TypeScript + Three.js via React Three Fiber (WebGL).
No Tailwind, no GSAP — one CSS file and one damping function.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle in dist/
```

## Where things live

| File | What it does |
| --- | --- |
| `src/GlobeSection.tsx` | The section: header, canvas, readouts, ticker, tooltip, overlay. Drop this into any React app. |
| `src/globe/config.ts` | Every tunable: tile size, cluster grid, sphere radius vs viewport, lattice spacing, motion speeds, colours. |
| `src/globe/layout.ts` | Places clusters on a wrapped grid in surface units (arc length). |
| `src/globe/geometry.ts` | Surface units → sphere; builds curved tile patches and the lattice lines. |
| `src/globe/atlas.ts` | One canvas texture atlas for all tiles. Draws placeholder art, swaps in real images when `project.images` is set. |
| `src/globe/shaders.ts` | Tile + lattice GLSL: fade toward the silhouette, hover/dim. |
| `src/globe/GlobeScene.tsx` | R3F scene: wheel/drag input, damping, idle drift, raycast hover/click. |
| `src/ui/*` | Header chrome, ticker, project overlay (plain React + CSS). |
| `src/data/projects.ts` | Project list, palettes, ticker copy. |
| `src/data/content.ts` | Header copy. |

## Using real thumbnails

Add `images` (up to 6 URLs) to a project in `src/data/projects.ts`:

```ts
{ slug: 'acme', name: 'Acme', category: 'SaaS', tagline: '…',
  images: ['/thumbs/acme-1.jpg', '/thumbs/acme-2.jpg', /* … */] }
```

Placeholder art renders immediately; real images are drawn into the atlas as
they load. Remote images need CORS headers (`crossOrigin = "anonymous"`).

## Tuning the look

In `src/globe/config.ts`:

- `radiusVw` / `radiusVh` — how big the sphere is relative to the viewport.
  Smaller = more curvature and a closer horizon at the top.
- `panDefault` — how far above the equator the viewport sits (0 = equator centred).
- `gridCols` / `pitchX` — how many clusters wrap around; also sets the radius.
- `pitchY` / `gridRows` — row spacing and how far the band reaches toward the poles.
- `latticeStepDeg`, `latticeAlpha` — the netting.
- `driftRadPerSec`, `wheelSens`, `dragSens`, `damping` — motion feel.

## Accessibility

The canvas is decorative; an `sr-only` list of projects is rendered alongside it.
The ticker animation stops under `prefers-reduced-motion`.
