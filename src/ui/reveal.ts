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

/** Soft vertical drift after reveal — light enough not to fight layout. */
function initPanelDrift() {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-panel]'));
  if (!panels.length) return;

  let ticking = false;

  const update = () => {
    ticking = false;
    const vh = window.innerHeight || 1;
    for (const panel of panels) {
      if (!panel.classList.contains('in-view') || panel.classList.contains('panel-body--work')) {
        panel.style.removeProperty('--panel-drift');
        continue;
      }
      const rect = panel.getBoundingClientRect();
      const mid = rect.top + rect.height * 0.35;
      const progress = (mid - vh * 0.45) / vh;
      const drift = Math.max(-14, Math.min(14, progress * -22));
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

/** Split marked feature copy into per-word spans (left-to-right scroll reveal). */
function prepareFeatureWords() {
  document.querySelectorAll<HTMLElement>('[data-feature-words]').forEach((el) => {
    const words = (el.textContent ?? '').trim().split(/\s+/).filter(Boolean);
    el.textContent = '';
    words.forEach((w) => {
      const span = document.createElement('span');
      span.className = 'feature-word';
      span.setAttribute('data-feature-word', '');
      span.textContent = w;
      el.appendChild(span);
      el.appendChild(document.createTextNode(' '));
    });
  });
}

/** Ease Work card words in from the left, one after another, scrubbed by section scroll. */
function initFeatureScroll() {
  const section = document.getElementById('projects');
  const feature = document.querySelector<HTMLElement>('[data-feature]');
  if (!section || !feature) return;

  const words = Array.from(
    feature.querySelectorAll<HTMLElement>('[data-feature-word]'),
  );
  if (!words.length) return;

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const easeOut = (t: number) => 1 - (1 - t) ** 2.6;

  let targetProgress = 0;
  let smoothProgress = 0;
  let raf = 0;

  const readTarget = () => {
    const vh = window.innerHeight || 1;
    const sRect = section.getBoundingClientRect();
    const travel = Math.max(sRect.height - vh, vh * 0.75);
    targetProgress = clamp01((-sRect.top + vh * 0.05) / travel);
  };

  const paint = () => {
    const n = words.length;
    // Wider slot so each word eases in instead of popping
    const slot = 2.1;
    words.forEach((word, i) => {
      const t = easeOut(clamp01(smoothProgress * (n + slot) - i));
      word.style.setProperty('--feature-t', t.toFixed(4));
    });
  };

  const tick = () => {
    readTarget();
    // Critically-damped-ish follow — smooth even on wheel/trackpad spikes
    smoothProgress += (targetProgress - smoothProgress) * 0.085;
    if (Math.abs(targetProgress - smoothProgress) < 0.0008) {
      smoothProgress = targetProgress;
    }
    paint();
    raf = requestAnimationFrame(tick);
  };

  window.addEventListener(
    'scroll',
    () => {
      readTarget();
    },
    { passive: true },
  );
  window.addEventListener(
    'resize',
    () => {
      readTarget();
    },
    { passive: true },
  );

  readTarget();
  smoothProgress = targetProgress;
  paint();
  raf = requestAnimationFrame(tick);

  // Keep reference so the loop isn't tree-shaken in edge bundlers
  void raf;
}

/** Orchestrated reveal: mask wipe, stagger, then subtle drift. */
export function initReveal() {
  prepareWordSpans();
  prepareProseCopy();
  prepareFeatureWords();
  initSectionNav();

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = document.querySelectorAll('[data-reveal], [data-words], [data-panel]');

  if (prefersReduced) {
    revealEls.forEach((el) => el.classList.add('in-view', 'is-settled'));
    document.querySelectorAll<HTMLElement>('[data-feature-word]').forEach((el) => {
      el.style.setProperty('--feature-t', '1');
    });
    return;
  }

  initPanelDrift();
  initFeatureScroll();

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('in-view');

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
