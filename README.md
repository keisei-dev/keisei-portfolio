# Keisei Kondo

Portfolio for a Full-Stack Developer. A dark, type-led page with a 2D canvas particle hero, a project stack, and scroll-driven sections.

**Live:** [keisei-portfolio.vercel.app](https://keisei-portfolio.vercel.app)

This site is a work in progress. The notes below describe what is on the page today.

## Features

- 2D canvas particle hero. Specks gather toward the headline, then each one travels to its own place in the background and keeps a slow drift.
- Auto-rotating project card stack on wide screens, with tabs for the four Work projects. Hidden under 960px.
- Numbered sections: 01 About, 02 Skills, 03 Work, 04 Contact. The header links stay plain: about, skills, work, contact.
- Scroll-pinned horizontal Work track on desktop. On a phone the same cards swipe sideways.
- About text that brightens with scroll, with hairlines and an underline under each line.
- `prefers-reduced-motion` support. The hero draws its settled field once, and the scroll motion stays still.
- Responsive layout from a phone width up to a desktop.

## Tech stack

| Layer | Tech |
| --- | --- |
| Framework | [Astro](https://astro.build/) 5, static output |
| UI | [React](https://react.dev/) 19 islands |
| Language | TypeScript |
| Scroll | [Lenis](https://github.com/darkroomengineering/lenis) on desktop |
| Type | Inter Tight and IBM Plex Mono, via Fontsource |
| Icons | [simple-icons](https://simpleicons.org/) for the skill marks |
| Hero | 2D canvas (`CanvasRenderingContext2D`) |

## Project structure

```
keisei-portfolio/
├── astro.config.mjs          # site URL, React integration
├── package.json
├── tsconfig.json
├── public/
│   ├── favicon.svg
│   ├── og.png
│   ├── Keisei_Kondo_Resume.pdf
│   └── dust-*.svg            # static hero fallback when JS is off
└── src/
    ├── pages/index.astro     # the page
    ├── main.ts               # starts scroll, hero, About, and Work
    ├── components/
    │   ├── SiteNav.tsx
    │   ├── SkillsTags.tsx
    │   └── WorkProjects.astro
    ├── styles/
    │   ├── global.css
    │   └── partials/
    └── ui/
        ├── heroField.ts      # particle field
        ├── heroDeck.ts       # project card stack
        ├── aboutScrub.ts     # About scroll reveal
        ├── workCards.ts      # pinned Work track
        ├── smoothScroll.ts   # Lenis
        └── reveal.ts
```

## Getting started

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # writes dist/
npm run preview    # serves dist/
npm run type-check
```

## Deployment

The site is hosted on [Vercel](https://vercel.com). The GitHub repository is connected, so pushes deploy on their own. Production is [keisei-portfolio.vercel.app](https://keisei-portfolio.vercel.app). Pull requests get a preview URL.

## Status

Still in progress. Layout, motion, and copy can change as the page is refined.
