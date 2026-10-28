# Keisei Kondo — Portfolio

Space-themed portfolio for a **Full-Stack Developer**, built with **Astro**, **React**, **TypeScript**, and **Three.js**.

A black starfield runs behind the page. The hero title (“Full-Stack Developer”) is drawn as twinkling star particles that scatter when you hover. Sections use scroll-driven motion with a glossy navy UI.

**Positioning:** Vancouver · open to full-time roles from January 2027

**Resume:** [/Keisei_Kondo_Resume.pdf](https://keisei-portfolio.vercel.app/Keisei_Kondo_Resume.pdf)

**Live site:** [keisei-portfolio.vercel.app](https://keisei-portfolio.vercel.app)

**Live feel:** black space · shooting stars · star-text hero · particle scatter · hamburger nav · scroll reveals

---

## Stack

| Layer | Tech |
| --- | --- |
| Framework | [Astro](https://astro.build/) + [React](https://react.dev/) islands |
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
    │   └── index.astro           # Page markup
    ├── components/
    │   ├── SiteNav.tsx           # Hamburger nav (React island)
    │   ├── SkillsTags.tsx        # Skills grouped like the resume
    │   ├── WorkProjects.astro    # Resume project cards
    │   └── ContactSignal.tsx     # Email CTA with signal pulse
    ├── main.ts                   # Entry: scene + UI wiring
    ├── styles/
    │   ├── global.css            # @import barrel
    │   └── partials/             # Section styles
    ├── ui/
    │   ├── hero.ts               # Star-title canvas + hover scatter
    │   ├── reveal.ts             # Scroll reveal & feature word scrub
    │   └── cursor.ts             # Custom cursor
    └── scene/
        └── portfolioScene.ts     # Three.js starfield / shooting stars
```

---

## Features

- **Astro + React** — static-first page with interactive islands
- **3D space background** — layered twinkling stars, dust on scroll, occasional shooting stars
- **Star-text hero** — constellation title; particles scatter away from the cursor
- **Hamburger navigation** — About / Skills / Work / Value / Contact
- **UI motion** — blur-to-sharp reveals, staggered word rise-ins, skills marquee, scroll-scrubbed work copy
- **Contact signal CTA** — pulse / streak hover on the email action
- **Glossy navy accents** — CTAs and lead copy on a black base
- **Accessible basics** — skip link, semantic landmarks, `prefers-reduced-motion` support

---

## Sections

1. **Hero** — Full-Stack Developer (star text), short pitch, contact / work / resume · open from Jan 2027 · Vancouver  
2. **About** — CICCC web development student; full-stack TypeScript  
3. **Skills** — languages, frontend, backend, database, and tools from the resume  
4. **Work** — Trim Team Booking App, Unsplash Landing Page Recreation, Player Performance Explorer, Real-Time Chat App, plus this site  
5. **Value** — team Git/GitHub work, open to full-time roles from January 2027  
6. **Contact**
   - Email: [keisei20001206@gmail.com](mailto:keisei20001206@gmail.com)
   - LinkedIn: [keisei-kondo](https://www.linkedin.com/in/keisei-kondo-0bab093a3)
   - GitHub: [keisei-dev](https://github.com/keisei-dev)
   - Resume: [/Keisei_Kondo_Resume.pdf](/Keisei_Kondo_Resume.pdf)

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
