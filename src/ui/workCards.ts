import { onPageScroll, pageScrollY, refreshScrollBounds, scrollPageTo } from './smoothScroll';

const CARD_SCROLL_VH = 0.8;

type Metrics = {
  sectionTop: number;
  range: number;
  maxShift: number;
  stride: number;
  cardWidth: number;
  pad: number;
  viewportWidth: number;
};

/**
 * Desktop: pin Work and map vertical scroll to a horizontal card track.
 * The track reads the smooth-scroll value directly. It never calls scrollTo.
 * Phones: a native sideways row with scroll-snap.
 * Reduced motion and no JS leave the readable grid in place.
 */
export function initWorkCards() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const section = document.getElementById('projects');
  const viewport = section?.querySelector<HTMLElement>('.work-viewport');
  const list = section?.querySelector<HTMLElement>('.project-list');
  const body = section?.querySelector<HTMLElement>('.panel-body--work');
  if (!section || !viewport || !list || !body) return;

  const note = section.querySelector<HTMLElement>('.project-note');
  if (note && note.parentElement !== list) {
    const item = document.createElement('li');
    item.appendChild(note);
    list.appendChild(item);
  }

  const slides = () => [...list.children] as HTMLElement[];
  if (slides().length < 2) return;

  const progress = document.createElement('p');
  progress.className = 'work-progress';
  progress.setAttribute('aria-hidden', 'true');
  const lead = section.querySelector('.lead');
  lead?.insertAdjacentElement('afterend', progress);

  const mobileQuery = window.matchMedia('(max-width: 767px)');
  let cards: HTMLElement[] = [];
  let metrics: Metrics = {
    sectionTop: 0,
    range: 1,
    maxShift: 0,
    stride: 1,
    cardWidth: 0,
    pad: 0,
    viewportWidth: 1,
  };
  let labelIndex = -1;

  const setProgressLabel = (index: number) => {
    if (index === labelIndex) return;
    labelIndex = index;
    const total = cards.length;
    const n = Math.min(total, Math.max(1, index + 1));
    progress.textContent = `${n} / ${total}`;
  };

  const clearCardMotion = () => {
    list.style.transform = '';
    for (const slide of cards) {
      slide.style.transform = '';
      slide.style.opacity = '';
    }
  };

  const sizeCards = () => {
    const width = viewport.clientWidth;
    const card = Math.min(720, width * 0.8);
    const pad = Math.max(0, (width - card) / 2);
    list.style.paddingInline = `${pad}px`;
    cards.forEach((slide) => {
      slide.style.flexBasis = `${card}px`;
      slide.style.width = `${card}px`;
    });
    return { width, card, pad };
  };

  const clearCardSize = () => {
    list.style.paddingInline = '';
    cards.forEach((slide) => {
      slide.style.flexBasis = '';
      slide.style.width = '';
    });
  };

  const measure = () => {
    cards = slides();
    if (mobileQuery.matches) {
      clearCardSize();
      clearCardMotion();
      section.style.height = '';
      labelIndex = -1;
      return;
    }
    const { width, card, pad } = sizeCards();
    const stride =
      cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : card || 1;
    const maxShift = Math.max(0, list.scrollWidth - width);
    const steps = stride > 0 ? maxShift / stride : cards.length - 1;
    const distance = Math.max(window.innerHeight, steps * CARD_SCROLL_VH * window.innerHeight);
    section.style.height = `${window.innerHeight + distance}px`;
    metrics = {
      sectionTop: section.offsetTop,
      range: Math.max(1, section.offsetHeight - window.innerHeight),
      maxShift,
      stride: stride || 1,
      cardWidth: card,
      pad,
      viewportWidth: width,
    };
    refreshScrollBounds();
  };

  const paint = (scrollY: number) => {
    if (mobileQuery.matches) return;
    const scrolled = Math.min(Math.max(scrollY - metrics.sectionTop, 0), metrics.range);
    const progress = metrics.range > 0 ? scrolled / metrics.range : 0;
    const shift = progress * metrics.maxShift;
    list.style.transform = `translate3d(${-shift}px, 0, 0)`;

    const center = metrics.viewportWidth * 0.5;
    const reach = metrics.stride;
    for (let i = 0; i < cards.length; i++) {
      const cardCenter = metrics.pad + metrics.cardWidth * 0.5 + i * reach - shift;
      const t = Math.min(1, Math.abs(cardCenter - center) / reach);
      const eased = t * t * (3 - 2 * t);
      const scale = 1 - 0.06 * eased;
      const opacity = 1 - 0.5 * eased;
      cards[i].style.transform = `translate3d(0, 0, 0) scale(${scale})`;
      cards[i].style.opacity = String(opacity);
    }
    setProgressLabel(Math.round(shift / reach));
  };

  const paintSnap = () => {
    const items = slides();
    const center = viewport.scrollLeft + viewport.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    items.forEach((slide, i) => {
      const mid = slide.offsetLeft + slide.offsetWidth / 2;
      const dist = Math.abs(mid - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    cards = items;
    labelIndex = -1;
    setProgressLabel(best);
  };

  const applyMode = () => {
    const mobile = mobileQuery.matches;
    section.classList.toggle('work-scroll', !mobile);
    section.classList.toggle('work-snap', mobile);
    if (mobile) {
      measure();
      paintSnap();
      return;
    }
    measure();
    paint(pageScrollY());
  };

  let resizeTimer = 0;
  const scheduleMeasure = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(applyMode, 80);
  };

  onPageScroll(paint);
  window.addEventListener('resize', scheduleMeasure, { passive: true });
  const observer = new ResizeObserver(scheduleMeasure);
  observer.observe(viewport);
  mobileQuery.addEventListener('change', applyMode);
  viewport.addEventListener(
    'scroll',
    () => {
      if (mobileQuery.matches) paintSnap();
    },
    { passive: true },
  );

  list.addEventListener('focusin', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const slide = target.closest('li');
    if (!slide || !list.contains(slide)) return;
    const items = slides();
    const index = items.indexOf(slide as HTMLElement);
    if (index < 0) return;

    if (mobileQuery.matches) {
      slide.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'auto' });
      return;
    }

    const origin = items[0]?.offsetLeft ?? 0;
    const targetShift = Math.min(
      Math.max(0, (slide as HTMLElement).offsetLeft - origin),
      metrics.maxShift,
    );
    const next = metrics.maxShift > 0 ? targetShift / metrics.maxShift : 0;
    scrollPageTo(metrics.sectionTop + next * metrics.range);
  });

  applyMode();
}
