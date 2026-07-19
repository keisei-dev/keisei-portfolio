/** Split flagged paragraphs into per-word spans for a staggered rise-in. */
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

/** Fade/slide (and word-rise) elements in as they enter the viewport. */
export function initReveal() {
  prepareWordSpans();
  initSectionNav();

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = document.querySelectorAll('[data-reveal], [data-words], [data-panel]');

  if (prefersReduced) {
    revealEls.forEach((el) => el.classList.add('in-view'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
  );

  revealEls.forEach((el) => io.observe(el));
}
