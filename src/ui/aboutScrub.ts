import { onPageScroll, pageScrollY } from './smoothScroll';

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Brighten About words and draw hairlines from scroll position.
 * Measures once per resize. Reads Lenis scroll, not layout, on each frame.
 */
export function initAboutScrub() {
  const root = document.querySelector<HTMLElement>('[data-about-scrub]');
  const copy = root?.querySelector<HTMLElement>('[data-about-copy]');
  if (!root || !copy) return;

  const nodes: Text[] = [];
  const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node instanceof Text && node.textContent?.trim()) nodes.push(node);
  }
  for (const node of nodes) {
    const parts = (node.textContent ?? '').split(/(\s+)/);
    const frag = document.createDocumentFragment();
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        frag.append(part);
        continue;
      }
      const word = document.createElement('span');
      word.className = 'about-word';
      word.textContent = part;
      frag.append(word);
    }
    node.replaceWith(frag);
  }

  const words = [...copy.querySelectorAll<HTMLElement>('.about-word')];
  const setSettled = () => {
    words.forEach((word) => word.style.setProperty('--w', '1'));
    root.style.setProperty('--draw-x', '1');
    root.style.setProperty('--draw-y', '1');
  };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !words.length) {
    setSettled();
    return;
  }

  let wordTops: number[] = [];
  let rootTop = 0;
  let rootHeight = 1;
  let vh = window.innerHeight || 1;

  const measure = () => {
    const scroll = pageScrollY();
    vh = window.innerHeight || 1;
    const rootRect = root.getBoundingClientRect();
    rootTop = rootRect.top + scroll;
    rootHeight = Math.max(rootRect.height, 1);
    wordTops = words.map((word) => word.getBoundingClientRect().top + scroll);
  };

  const paint = (scroll: number) => {
    const lineStart = rootTop - vh * 0.78;
    const lineEnd = rootTop + rootHeight * 0.15 - vh * 0.42;
    const line = clamp01((scroll - lineStart) / Math.max(1, lineEnd - lineStart));
    root.style.setProperty('--draw-x', line.toFixed(3));
    root.style.setProperty('--draw-y', clamp01((line - 0.08) / 0.92).toFixed(3));

    words.forEach((word, i) => {
      const top = wordTops[i] ?? rootTop;
      const start = top - vh * 0.86;
      const end = top - vh * 0.46;
      const t = clamp01((scroll - start) / Math.max(1, end - start));
      word.style.setProperty('--w', t.toFixed(3));
    });
  };

  let resizeTimer = 0;
  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      measure();
      paint(pageScrollY());
    }, 80);
  };

  measure();
  paint(pageScrollY());
  onPageScroll(paint);
  window.addEventListener('resize', onResize, { passive: true });
  document.fonts?.ready.then(() => {
    measure();
    paint(pageScrollY());
  });
}
