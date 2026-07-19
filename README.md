# Keisei Kondo — Portfolio

Space-themed portfolio for a **Full-Stack Developer**, built with **Astro**, **TypeScript**, and **Three.js**.

A black starfield runs behind the page. The hero title (“Full-Stack Developer”) is drawn as twinkling star particles that scatter when you hover. Sections use scroll-driven motion with a glossy navy UI.

**Live feel:** black space · shooting stars · star-text hero · particle scatter · hamburger nav · scroll reveals

---

## Stack

| Layer | Tech |
| --- | --- |
| Framework | [Astro](https://astro.build/) |
| Language | TypeScript |
| 3D | [Three.js](https://threejs.org/) |
| Markup / UI | Semantic HTML, CSS |

---

## Getting started

```bash
# Install dependencies
npm install

# Dev server (http://localhost:4321)
npm run dev

# Production build → dist/
npm run build

# Preview the production build
npm run preview

# Type-check
npm run type-check
```

---

## Project structure

```
keisei-portfolio/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   └── favicon.svg
└── src/
    ├── pages/
    │   └── index.astro        # Page markup
    ├── main.ts                # Entry: scene + UI wiring
    ├── styles/
    │   └── global.css         # Layout, typography, motion
    ├── ui/
    │   ├── hero.ts            # Star-title canvas + hover scatter
    │   ├── nav.ts             # Hamburger menu
    │   ├── reveal.ts          # Scroll reveal & word animations
    │   └── cursor.ts          # Custom cursor
    └── scene/
        └── portfolioScene.ts  # Three.js starfield / shooting stars
```

---

## Features

- **Astro** — static-first page with client TypeScript modules
- **3D space background** — layered twinkling stars, dust on scroll, occasional shooting stars
- **Star-text hero** — constellation title; particles scatter away from the cursor
- **Hamburger navigation** — About / Skills / Projects / Focus / Contact
- **UI motion** — blur-to-sharp reveals, staggered word rise-ins, skills marquee
- **Glossy navy accents** — CTAs and lead copy on a black base
- **Contact links** — email, LinkedIn, GitHub
- **Accessible basics** — skip link, semantic landmarks, `prefers-reduced-motion` support

---

## Sections

1. **Hero** — role (star text), short pitch, CTAs  
2. **About** — full-stack focus  
3. **Skills** — HTML, CSS, TypeScript, Node.js, Express, Astro, PostgreSQL, Three.js, Git, GitHub  
4. **Projects** — Interactive Portfolio (Astro · Three.js) + placeholders  
5. **Focus** — what I’m building toward  
6. **Contact**
   - Email: [keisei20001206@gmail.com](mailto:keisei20001206@gmail.com)
   - LinkedIn: [keisei-kondo](https://www.linkedin.com/in/keisei-kondo-0bab093a3)
   - GitHub: [keisei-dev](https://github.com/keisei-dev)

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Astro dev server with HMR |
| `npm run build` | Astro production build → `dist/` |
| `npm run preview` | Serve the `dist/` build locally |
| `npm run type-check` | TypeScript check (`tsc --noEmit`) |

---

## Notes

- Set `base` in `astro.config.mjs` if you deploy into a subdirectory.
- The canvas (`#bg`) is decorative (`aria-hidden`) and does not capture pointer events.

---

## License

Personal portfolio · © Keisei Kondo
