import { initPortfolioScene } from './scene/portfolioScene';
import { initReveal } from './ui/reveal';
import { initCursor } from './ui/cursor';
import { initHero } from './ui/hero';

const canvas = document.querySelector<HTMLCanvasElement>('#bg');

initPortfolioScene({ canvas });
initHero();
initReveal();
initCursor();
