/** Professional custom cursor: blend-mode ring + magnetic hover. */
export function initCursor() {
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!finePointer || reducedMotion) return;

  document.documentElement.classList.add('has-custom-cursor');

  const root = document.createElement('div');
  root.className = 'cursor';
  root.setAttribute('aria-hidden', 'true');

  const ring = document.createElement('div');
  ring.className = 'cursor__ring';
  const dot = document.createElement('div');
  dot.className = 'cursor__dot';
  root.append(ring, dot);
  document.body.append(root);

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let rx = mx;
  let ry = my;
  let dx = mx;
  let dy = my;
  let visible = false;
  let hovering = false;
  let pressed = false;
  let magnetX = 0;
  let magnetY = 0;

  const interactiveSelector =
    'a, button, .cta, .tag, .contact-link, input, textarea, summary, [role="button"], .hero-star-title';

  const setVisible = (on: boolean) => {
    visible = on;
    root.classList.toggle('is-visible', on);
  };

  window.addEventListener(
    'mousemove',
    (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!visible) setVisible(true);

      const el = e.target instanceof Element ? e.target.closest(interactiveSelector) : null;
      hovering = !!el;
      root.classList.toggle('is-hover', hovering);

      if (el instanceof HTMLElement) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        // Soft magnetic pull toward interactive centers
        magnetX = (cx - mx) * 0.18;
        magnetY = (cy - my) * 0.18;
      } else {
        magnetX = 0;
        magnetY = 0;
      }
    },
    { passive: true },
  );

  window.addEventListener('mousedown', () => {
    pressed = true;
    root.classList.add('is-down');
  });
  window.addEventListener('mouseup', () => {
    pressed = false;
    root.classList.remove('is-down');
  });
  document.addEventListener('mouseleave', () => setVisible(false));
  document.addEventListener('mouseenter', () => setVisible(true));

  function tick() {
    const tx = mx + magnetX;
    const ty = my + magnetY;

    // Dot: snappy
    dx += (tx - dx) * 0.45;
    dy += (ty - dy) * 0.45;
    // Ring: heavier lag for dynamism
    rx += (tx - rx) * (hovering ? 0.22 : 0.12);
    ry += (ty - ry) * (hovering ? 0.22 : 0.12);

    const scale = pressed ? 0.75 : hovering ? 1.55 : 1;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${scale})`;
    dot.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%) scale(${pressed ? 0.5 : 1})`;

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
