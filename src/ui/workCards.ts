const CARD_SCROLL_VH = 0.8;

/**
 * Desktop: pin Work and map vertical scroll to a horizontal card track.
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
  let ticking = false;

  const stride = () => {
    const items = slides();
    if (items.length < 2) return items[0]?.offsetWidth || 1;
    return items[1].offsetLeft - items[0].offsetLeft;
  };

  const maxShift = () => Math.max(0, list.scrollWidth - viewport.clientWidth);

  const setProgressLabel = (index: number) => {
    const total = slides().length;
    const n = Math.min(total, Math.max(1, index + 1));
    progress.textContent = `${n} / ${total}`;
  };

  const sizeCards = () => {
    const width = viewport.clientWidth;
    const card = Math.min(720, width * 0.8);
    const pad = Math.max(0, (width - card) / 2);
    list.style.paddingInline = `${pad}px`;
    slides().forEach((slide) => {
      slide.style.flexBasis = `${card}px`;
      slide.style.width = `${card}px`;
    });
  };

  const clearCardSize = () => {
    list.style.paddingInline = '';
    slides().forEach((slide) => {
      slide.style.flexBasis = '';
      slide.style.width = '';
    });
  };

  const measureDesktop = () => {
    sizeCards();
    const travel = maxShift();
    const step = stride();
    const cards = step > 0 ? travel / step : slides().length - 1;
    const distance = Math.max(window.innerHeight, cards * CARD_SCROLL_VH * window.innerHeight);
    section.style.height = `${window.innerHeight + distance}px`;
  };

  const scrollProgress = () => {
    const range = section.offsetHeight - window.innerHeight;
    if (range <= 0) return 0;
    const scrolled = Math.min(Math.max(-section.getBoundingClientRect().top, 0), range);
    return scrolled / range;
  };

  const paintDesktop = () => {
    const shift = scrollProgress() * maxShift();
    list.style.transform = `translate3d(${-shift}px, 0, 0)`;
    const step = stride();
    setProgressLabel(step > 0 ? Math.round(shift / step) : 0);
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
    setProgressLabel(best);
  };

  const applyMode = () => {
    const mobile = mobileQuery.matches;
    section.classList.toggle('work-scroll', !mobile);
    section.classList.toggle('work-snap', mobile);
    list.style.transform = '';
    if (mobile) {
      clearCardSize();
      section.style.height = '';
      paintSnap();
      return;
    }
    measureDesktop();
    paintDesktop();
  };

  let snapTimer = 0;
  let snapping = false;

  const snapToCard = () => {
    if (snapping || mobileQuery.matches) return;
    const travel = maxShift();
    const step = stride();
    if (travel <= 0 || step <= 0) return;
    const shift = scrollProgress() * travel;
    const index = Math.round(shift / step);
    const progress = Math.min(1, (index * step) / travel);
    const range = section.offsetHeight - window.innerHeight;
    const top = section.getBoundingClientRect().top + window.scrollY + progress * range;
    if (Math.abs(window.scrollY - top) < 3) return;
    snapping = true;
    window.scrollTo({ top, behavior: 'smooth' });
    window.setTimeout(() => {
      snapping = false;
    }, 450);
  };

  const onScroll = () => {
    if (mobileQuery.matches || snapping) return;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (!mobileQuery.matches) paintDesktop();
      });
    }
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(snapToCard, 140);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', applyMode, { passive: true });
  viewport.addEventListener('scroll', () => {
    if (mobileQuery.matches) paintSnap();
  }, { passive: true });
  mobileQuery.addEventListener('change', applyMode);

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

    const travel = maxShift();
    const origin = items[0]?.offsetLeft ?? 0;
    const targetShift = Math.min(Math.max(0, (slide as HTMLElement).offsetLeft - origin), travel);
    const progress = travel > 0 ? targetShift / travel : 0;
    const range = section.offsetHeight - window.innerHeight;
    const top = section.getBoundingClientRect().top + window.scrollY + progress * range;
    window.scrollTo({ top, behavior: 'auto' });
  });

  applyMode();
}
