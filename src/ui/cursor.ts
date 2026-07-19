/** Custom cursor: snappy ring + dot, light hover scale (no magnet lag). */
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

  const interactiveSelector =
    'a, button, .cta, .tag, .contact-link, input, textarea, summary, [role="button"]';

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
    // Near-instant follow — avoids the heavy laggy feel
    dx += (mx - dx) * 0.65;
    dy += (my - dy) * 0.65;
    rx += (mx - rx) * 0.42;
    ry += (my - ry) * 0.42;

    const scale = pressed ? 0.75 : hovering ? 1.35 : 1;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${scale})`;
    dot.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%) scale(${pressed ? 0.5 : 1})`;

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
