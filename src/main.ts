import { initPortfolioScene } from './scene/portfolioScene';

const canvas = document.querySelector<HTMLCanvasElement>('#bg');
const contactSection = document.getElementById('contact');

initPortfolioScene({ canvas, contactSection });
