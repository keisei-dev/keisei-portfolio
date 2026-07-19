/** Split flagged paragraphs into per-word spans for a masked rise-in. */
function prepareWordSpans() {
  document.querySelectorAll<HTMLElement>('[data-words]').forEach((el) => {
    const words = (el.textContent ?? '').trim().split(/\s+/);
    el.textContent = '';
    words.forEach((w, i) => {
      const word = document.createElement('span');
      word.className = 'word';
      const inner = document.createElement('span');
      inner.className = 'word-inner';
      inner.style.setProperty('--i', String(i));
      inner.textContent = w;
      word.appendChild(inner);
      el.appendChild(word);
      el.appendChild(document.createTextNode(' '));
    });
  });
}

/** Index highlight phrases for staggered underline draws. */
function prepareProseCopy() {
  document.querySelectorAll<HTMLElement>('[data-prose-copy]').forEach((root) => {
    root.querySelectorAll<HTMLElement>('.hl').forEach((hl, i) => {
      hl.style.setProperty('--hl', String(i));
    });
  });
}

/** Highlight the nav link for the section currently in view. */
function initSectionNav() {
  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('.site-nav a[href^="#"]'),
  );
  const sections = links
    .map((link) => {
      const id = link.getAttribute('href')?.slice(1);
      const el = id ? document.getElementById(id) : null;
      return el ? { link, el } : null;
    })
    .filter((item): item is { link: HTMLAnchorElement; el: HTMLElement } => item !== null);

  if (!sections.length) return;

  const setActive = (id: string) => {
    sections.forEach(({ link, el }) => {
      link.classList.toggle('is-active', el.id === id);
    });
  };

  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]?.target instanceof HTMLElement) {
        setActive(visible[0].target.id);
      }
    },
    { threshold: [0.35, 0.55], rootMargin: '-18% 0px -35% 0px' },
  );

  sections.forEach(({ el }) => io.observe(el));
}

/** Soft scroll drift inside revealed panels — keeps the page feeling alive. */
function initPanelDrift() {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-panel]'));
  if (!panels.length) return;

  let ticking = false;

  const update = () => {
    ticking = false;
    const vh = window.innerHeight || 1;
    for (const panel of panels) {
      if (!panel.classList.contains('in-view')) {
        panel.style.removeProperty('--panel-drift');
        continue;
      }
      const rect = panel.getBoundingClientRect();
      const mid = rect.top + rect.height * 0.35;
      const progress = (mid - vh * 0.45) / vh;
      const drift = Math.max(-18, Math.min(18, progress * -28));
      panel.style.setProperty('--panel-drift', `${drift.toFixed(2)}px`);
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
}

/** Orchestrated reveal: mask wipe, stagger, then subtle drift. */
export function initReveal() {
  prepareWordSpans();
  prepareProseCopy();
  initSectionNav();

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = document.querySelectorAll('[data-reveal], [data-words], [data-panel]');

  if (prefersReduced) {
    revealEls.forEach((el) => el.classList.add('in-view'));
    return;
  }

  initPanelDrift();

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('in-view');

        // Stagger direct reveal children inside a panel for a cascade
        if (el instanceof HTMLElement && el.hasAttribute('data-panel')) {
          const kids = el.querySelectorAll<HTMLElement>('[data-reveal], [data-words]');
          kids.forEach((kid, i) => {
            if (!kid.style.getPropertyValue('--reveal-delay')) {
              kid.style.setProperty('--reveal-delay', `${0.08 + i * 0.07}s`);
            }
          });
          window.setTimeout(() => el.classList.add('is-settled'), 1100);
        }

        io.unobserve(el);
      });
    },
    { threshold: 0.18, rootMargin: '0px 0px -10% 0px' },
  );

  revealEls.forEach((el) => io.observe(el));
}
