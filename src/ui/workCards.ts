const DWELL_MS = 4000;

/** One-card slider. Without this script the work list stays a static grid. */
export function initWorkCards() {
  const section = document.getElementById('projects');
  const slider = section?.querySelector<HTMLElement>('.work-slider');
  const viewport = section?.querySelector<HTMLElement>('.work-viewport');
  const list = section?.querySelector<HTMLElement>('.project-list');
  if (!section || !slider || !viewport || !list) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const note = section.querySelector<HTMLElement>('.project-note');
  if (note) {
    const item = document.createElement('li');
    item.appendChild(note);
    list.appendChild(item);
  }

  const realSlides = [...list.children] as HTMLElement[];
  const count = realSlides.length;
  if (count < 2) return;

  realSlides.forEach((slide, i) => {
    const card = slide.querySelector('article') ?? slide;
    card.setAttribute('aria-roledescription', 'slide');
    card.setAttribute('aria-label', `${i + 1} of ${count}`);
  });

  let clone: HTMLElement | null = null;
  if (!reduced) {
    clone = realSlides[0].cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelector('article')?.setAttribute('aria-hidden', 'true');
    list.appendChild(clone);
  }

  section.classList.add('work-carousel');
  slider.setAttribute('role', 'region');
  slider.setAttribute('aria-roledescription', 'carousel');
  slider.setAttribute('aria-label', 'Selected projects');

  const live = document.createElement('div');
  live.className = 'visually-hidden';
  live.setAttribute('aria-live', 'off');
  slider.appendChild(live);

  const controls = document.createElement('div');
  controls.className = 'work-controls';
  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'work-arrow work-arrow--prev';
  prev.setAttribute('aria-label', 'Previous project');
  prev.innerHTML = '<span aria-hidden="true"></span>';
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'work-arrow work-arrow--next';
  next.setAttribute('aria-label', 'Next project');
  next.innerHTML = '<span aria-hidden="true"></span>';
  const dots = document.createElement('div');
  dots.className = 'work-dots';
  dots.setAttribute('role', 'group');
  dots.setAttribute('aria-label', 'Choose a project');
  const dotButtons = realSlides.map((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'work-dot';
    dot.setAttribute('aria-label', `Show project ${i + 1} of ${count}`);
    dot.addEventListener('click', () => go(i, true));
    dots.appendChild(dot);
    return dot;
  });
  controls.append(prev, dots, next);
  slider.appendChild(controls);

  let index = 0;
  let timer = 0;
  let hovering = false;
  let focused = false;
  let onScreen = false;
  let snapLock = false;

  const activeIndex = () => (index >= count ? 0 : index);

  const apply = () => {
    list.style.setProperty('--index', String(index));
    const shown = index === count ? -1 : index;
    realSlides.forEach((slide, i) => {
      const hidden = i !== shown;
      slide.toggleAttribute('inert', hidden);
      slide.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    });
    if (clone) {
      clone.toggleAttribute('inert', true);
      clone.setAttribute('aria-hidden', 'true');
    }
    dotButtons.forEach((dot, i) => {
      if (i === shown) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  };

  const announce = () => {
    live.setAttribute('aria-live', 'polite');
    live.textContent = `Project ${activeIndex() + 1} of ${count}`;
  };

  const canAutoplay = () =>
    !reduced && !hovering && !focused && onScreen && !document.hidden && !snapLock;

  const schedule = () => {
    window.clearTimeout(timer);
    if (!canAutoplay()) return;
    timer = window.setTimeout(() => go(index + 1, false), DWELL_MS);
  };

  const afterMove = () => {
    if (index !== count) {
      schedule();
      return;
    }
    snapLock = true;
    list.classList.add('is-instant');
    index = 0;
    apply();
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        list.classList.remove('is-instant');
        snapLock = false;
        schedule();
      });
    });
  };

  const go = (nextIndex: number, manual: boolean) => {
    window.clearTimeout(timer);
    if (reduced) {
      index = (nextIndex + count) % count;
    } else if (nextIndex > count) {
      index = 1;
    } else {
      index = nextIndex;
    }
    apply();
    if (manual) {
      announce();
      live.setAttribute('aria-live', 'polite');
    } else {
      live.setAttribute('aria-live', 'off');
    }
    if (reduced) schedule();
  };

  const stepPrev = (manual: boolean) => {
    if (!reduced && index === 0) {
      snapLock = true;
      list.classList.add('is-instant');
      index = count;
      apply();
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          list.classList.remove('is-instant');
          snapLock = false;
          go(count - 1, manual);
        });
      });
      return;
    }
    go(index - 1, manual);
  };

  list.addEventListener('transitionend', (event) => {
    if (event.target !== list || event.propertyName !== 'transform' || snapLock) return;
    afterMove();
  });

  prev.addEventListener('click', () => stepPrev(true));
  next.addEventListener('click', () => go(index + 1, true));

  slider.addEventListener('mouseenter', () => {
    hovering = true;
    schedule();
  });
  slider.addEventListener('mouseleave', () => {
    hovering = false;
    schedule();
  });
  slider.addEventListener('focusin', () => {
    focused = true;
    schedule();
  });
  slider.addEventListener('focusout', (event) => {
    const nextFocus = event.relatedTarget;
    if (nextFocus instanceof Node && slider.contains(nextFocus)) return;
    focused = false;
    schedule();
  });

  document.addEventListener('visibilitychange', () => schedule());

  let startX = 0;
  let startY = 0;
  let tracking = false;
  viewport.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;
    tracking = true;
    startX = event.clientX;
    startY = event.clientY;
    viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener('pointerup', (event) => {
    if (!tracking) return;
    tracking = false;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) go(index + 1, true);
    else stepPrev(true);
  });
  viewport.addEventListener('pointercancel', () => {
    tracking = false;
  });

  const observer = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      schedule();
    },
    { threshold: 0.4 },
  );
  observer.observe(slider);

  apply();
  schedule();
}
