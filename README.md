# Keisei Kondo — Portfolio

Space-themed portfolio for a **Full-Stack Developer**.  
A Three.js starfield runs behind the page; the hero title is drawn as twinkling stars, and sections use scroll-driven motion with a glossy navy UI.

**Live feel:** black space · shooting stars · star-text hero · hamburger nav · scroll reveals

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
    │   ├── hero.ts            # Star-title canvas, parallax, entrance
    │   ├── nav.ts             # Hamburger menu
    │   ├── reveal.ts          # Scroll reveal & word animations
    │   └── cursor.ts          # Custom cursor
    └── scene/
        └── portfolioScene.ts  # Three.js starfield / shooting stars
```

---

## Features

- **3D space background** — layered twinkling stars, dust warp on scroll, occasional shooting stars
- **Star-text hero** — “Full-Stack Developer” rendered as constellation particles
- **Hamburger navigation** — About / Skills / Projects / Focus / Contact
- **UI motion** — blur-to-sharp section reveals, staggered word rise-ins, skills marquee
- **Glossy navy accents** — buttons and lead copy on a black space base
- **Accessible basics** — skip link, semantic landmarks, `prefers-reduced-motion` support

---

## Sections

1. **Hero** — role (star text), short pitch, CTAs  
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
- The canvas (`#bg`) is decorative (`aria-hidden`) and does not capture pointer events.

---

## License

Personal portfolio · © Keisei Kondo
