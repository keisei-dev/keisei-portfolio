import 'lenis/dist/lenis.css';
import { initPortfolioScene } from './scene/portfolioScene';
import { initReveal } from './ui/reveal';
import { initCursor } from './ui/cursor';
import { initHero } from './ui/hero';
import { initSmoothScroll } from './ui/smoothScroll';
import { initWorkCards } from './ui/workCards';

const canvas = document.querySelector<HTMLCanvasElement>('#bg');

initSmoothScroll();
initPortfolioScene({ canvas });
initHero();
initReveal();
initWorkCards();
initCursor();
