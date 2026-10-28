/** Pause the dust when the hero is hidden, and add a few pixels of pointer shift on desktop. */
export function initHeroField() {
  const hero = document.getElementById('hero');
  const field = hero?.querySelector<HTMLElement>('.hero-field');
  if (!hero || !field) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const fine = window.matchMedia('(pointer: fine) and (min-width: 768px)');
  let onScreen = true;
  let hidden = document.hidden;

  const sync = () => {
    field.classList.toggle('is-paused', !onScreen || hidden);
  };

  const watch = new IntersectionObserver((entries) => {
    onScreen = entries.some((entry) => entry.isIntersecting);
    sync();
  });
  watch.observe(hero);
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
    sync();
  });

  const onMove = (event: PointerEvent) => {
    if (!fine.matches) return;
    const x = (event.clientX / window.innerWidth - 0.5) * 2;
    const y = (event.clientY / window.innerHeight - 0.5) * 2;
    field.style.setProperty('--mx', x.toFixed(3));
    field.style.setProperty('--my', y.toFixed(3));
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  fine.addEventListener('change', () => {
    if (fine.matches) return;
    field.style.setProperty('--mx', '0');
    field.style.setProperty('--my', '0');
  });
}
