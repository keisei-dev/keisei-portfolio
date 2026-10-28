const ROTATE_MS = 4200;

/** Tabs, caption, and auto-rotation for the hero project stack. */
export function initHeroDeck() {
  const deck = document.querySelector<HTMLElement>('[data-hero-deck]');
  if (!deck) return;

  const tabs = [...deck.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const underline = deck.querySelector<HTMLElement>('[data-deck-underline]');
  const host = deck.querySelector<HTMLElement>('[data-deck-host]');
  const kicker = deck.querySelector<HTMLElement>('[data-deck-kicker]');
  const title = deck.querySelector<HTMLElement>('[data-deck-title]');
  const copy = deck.querySelector<HTMLElement>('[data-deck-copy]');
  const link = deck.querySelector<HTMLAnchorElement>('[data-deck-link]');
  const panel = deck.querySelector<HTMLElement>('#deck-panel');
  if (!tabs.length || !host || !kicker || !title || !copy || !link || !panel) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = Math.max(0, tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true'));
  let timer = 0;
  let paused = false;
  let swapTimer = 0;

  const placeUnderline = () => {
    const tab = tabs[index];
    if (!underline || !tab) return;
    underline.style.setProperty('--ux', `${tab.offsetLeft}px`);
    underline.style.setProperty('--uw', `${tab.offsetWidth}px`);
  };

  const show = (next: number, animate: boolean) => {
    index = (next + tabs.length) % tabs.length;
    const tab = tabs[index];
    tabs.forEach((item, i) => {
      const on = i === index;
      item.setAttribute('aria-selected', on ? 'true' : 'false');
      item.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', tab.id);

    const apply = () => {
      host.textContent = tab.dataset.host ?? '';
      kicker.textContent = tab.dataset.kicker ?? '';
      title.textContent = tab.dataset.title ?? '';
      copy.textContent = tab.dataset.copy ?? '';
      link.href = tab.dataset.href ?? '#';
      link.textContent = tab.dataset.label ?? 'Open';
    };

    window.clearTimeout(swapTimer);
    if (!animate || reduced) {
      deck.classList.remove('is-swap');
      apply();
    } else {
      deck.classList.add('is-swap');
      swapTimer = window.setTimeout(() => {
        apply();
        deck.classList.remove('is-swap');
      }, 160);
    }
    placeUnderline();
  };

  const stop = () => {
    window.clearInterval(timer);
    timer = 0;
  };

  const start = () => {
    if (reduced || paused || timer) return;
    timer = window.setInterval(() => show(index + 1, true), ROTATE_MS);
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', (event) => {
      show(i, true);
      stop();
      paused = event.detail === 0;
      if (!paused) start();
    });
    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const dir = event.key === 'ArrowRight' ? 1 : -1;
      show(index + dir, true);
      tabs[index]?.focus();
      paused = true;
      stop();
    });
  });

  deck.addEventListener('pointerenter', () => {
    paused = true;
    stop();
  });
  deck.addEventListener('pointerleave', () => {
    paused = false;
    start();
  });
  deck.addEventListener('focusin', () => {
    paused = true;
    stop();
  });
  deck.addEventListener('focusout', () => {
    paused = deck.matches(':focus-within');
    if (!paused) start();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  show(index, false);
  window.addEventListener('resize', placeUnderline, { passive: true });
  start();
}
