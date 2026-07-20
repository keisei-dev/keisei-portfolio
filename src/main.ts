import './styles/global.css';
import { initPortfolioScene } from './scene/portfolioScene';
import { initReveal } from './ui/reveal';
import { initCursor } from './ui/cursor';
import { initNav } from './ui/nav';
import { initHero } from './ui/hero';

const canvas = document.querySelector<HTMLCanvasElement>('#bg');

initPortfolioScene({ canvas });
initHero();
initReveal();
initCursor();
initNav();
