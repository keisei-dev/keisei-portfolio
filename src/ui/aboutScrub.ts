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
  type Line = { el: HTMLElement; indices: number[] };
  const lines: Line[] = [];
  let wordTops: number[] = [];
  let fracs: number[] = [];
  let rootTop = 0;
  let rootHeight = 1;
  let vh = window.innerHeight || 1;

  const wordWindow = (top: number, frac: number) => {
    const start0 = top - vh * 0.88;
    const end0 = top - vh * 0.4;
    const span = Math.max(1, end0 - start0);
    const start = start0 + frac * span * 0.72;
    const end = start + span * 0.42;
    return { start, end };
  };

  const measure = () => {
    const scroll = pageScrollY();
    vh = window.innerHeight || 1;
    const rootRect = root.getBoundingClientRect();
    rootTop = rootRect.top + scroll;
    rootHeight = Math.max(rootRect.height, 1);
    const copyRect = copy.getBoundingClientRect();
    wordTops = [];
    fracs = [];

    const groups: number[][] = [];
    words.forEach((word, i) => {
      const rect = word.getBoundingClientRect();
      wordTops[i] = rect.top + scroll;
      const last = groups[groups.length - 1];
      const prev = last ? words[last[last.length - 1]].getBoundingClientRect().top : 0;
      if (!last || Math.abs(rect.top - prev) > 4) groups.push([i]);
      else last.push(i);
    });

    while (lines.length < groups.length) {
      const el = document.createElement('span');
      el.className = 'about-underline';
      el.setAttribute('aria-hidden', 'true');
      copy.append(el);
      lines.push({ el, indices: [] });
    }
    while (lines.length > groups.length) lines.pop()?.el.remove();

    groups.forEach((indices, i) => {
      const firstRect = words[indices[0]].getBoundingClientRect();
      const lastRect = words[indices[indices.length - 1]].getBoundingClientRect();
      const width = Math.max(1, lastRect.right - firstRect.left);
      indices.forEach((index) => {
        const rect = words[index].getBoundingClientRect();
        fracs[index] = clamp01((rect.left - firstRect.left) / width);
      });
      const el = lines[i].el;
      lines[i].indices = indices;
      el.style.left = `${(firstRect.left - copyRect.left).toFixed(1)}px`;
      el.style.width = `${width.toFixed(1)}px`;
      el.style.top = `${(lastRect.bottom - copyRect.top - 1).toFixed(1)}px`;
    });
  };

  const setSettled = () => {
    words.forEach((word) => word.style.setProperty('--w', '1'));
    lines.forEach((line) => line.el.style.setProperty('--u', '1'));
    root.style.setProperty('--draw-x', '1');
    root.style.setProperty('--draw-y', '1');
  };

  if (!words.length) return;
  measure();

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setSettled();
    return;
  }

  const paint = (scroll: number) => {
    const lineStart = rootTop - vh * 0.78;
    const lineEnd = rootTop + rootHeight * 0.15 - vh * 0.42;
    const line = clamp01((scroll - lineStart) / Math.max(1, lineEnd - lineStart));
    root.style.setProperty('--draw-x', line.toFixed(3));
    root.style.setProperty('--draw-y', clamp01((line - 0.08) / 0.92).toFixed(3));

    words.forEach((word, i) => {
      const { start, end } = wordWindow(wordTops[i] ?? rootTop, fracs[i] ?? 0);
      const t = clamp01((scroll - start) / Math.max(1, end - start));
      word.style.setProperty('--w', t.toFixed(3));
    });

    lines.forEach((row) => {
      const first = row.indices[0] ?? 0;
      const last = row.indices[row.indices.length - 1] ?? first;
      const a = wordWindow(wordTops[first] ?? rootTop, 0);
      const b = wordWindow(wordTops[last] ?? rootTop, fracs[last] ?? 1);
      const u = clamp01((scroll - a.start) / Math.max(1, b.end - a.start));
      row.el.style.setProperty('--u', u.toFixed(3));
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
