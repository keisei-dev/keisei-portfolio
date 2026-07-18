# Keisei Kondo — Portfolio

Night-drive themed portfolio for a **Full-Stack Developer**.  
A Three.js highway scene runs behind the page; scroll moves you along the road, and the Contact section pulls into a gas-station stop.

**Live feel:** winding night road · luxury coupe · scroll-linked speed · UI motion

---

## Stack

| Layer | Tech |
| --- | --- |
| Build | [Vite](https://vite.dev/) 8 |
| Language | TypeScript |
| 3D | [Three.js](https://threejs.org/) |
| Markup / UI | Semantic HTML, CSS |

---

## Getting started

```bash
# Install dependencies
npm install

# Dev server (http://localhost:5173)
npm run dev

# Production build
npm run build

# Preview the production build
npm run preview

# Type-check only
npm run type-check
```

---

## Project structure

```
vite-project/
├── index.html                 # Page content & sections
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── favicon.svg
└── src/
    ├── main.ts                # Entry: scene + UI wiring
    ├── vite-env.d.ts
    ├── styles/
    │   └── global.css         # Layout, typography, motion
    ├── ui/
    │   └── reveal.ts          # Scroll reveal & word animations
    └── scene/
        └── portfolioScene.ts  # Three.js road / car / station
```

---

## Features

- **3D night drive** — winding road, streetlights, stars, luxury car with clear-coat paint
- **Scroll-driven motion** — road speed follows scroll; Contact section parks at the gas station
- **Speed readout** — live `KM/H` in the header (same role as a clock/timezone chip on other portfolios)
- **UI motion** — section reveals, staggered word rise-ins, skills marquee
- **Accessible basics** — skip link, semantic landmarks, `prefers-reduced-motion` support

---

## Sections

1. **Hero** — name & role  
2. **About** — full-stack focus  
3. **Skills** — HTML, CSS, TypeScript, Node.js, Express, Astro, PostgreSQL, Three.js, Git, GitHub  
4. **Projects** — Interactive Portfolio (+ placeholders)  
5. **Focus** — what I’m building toward  
6. **Contact** — [keisei20001206@gmail.com](mailto:keisei20001206@gmail.com)

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | `tsc` then Vite production build → `dist/` |
| `npm run preview` | Serve the `dist/` build locally |
| `npm run type-check` | TypeScript check without emitting files |

---

## Notes

- Base path is `./` so the build can be hosted from a subdirectory or static host.
- The canvas (`#bg`) is decorative (`aria-hidden`) and does not capture pointer events; content stays left so it doesn’t cover the car.

---

## License

Personal portfolio · © Keisei Kondo
