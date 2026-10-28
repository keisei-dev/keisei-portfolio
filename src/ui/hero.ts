type Dot = {
  x: number;
  y: number;
  r: number;
  base: number;
  phase: number;
  speed: number;
  vx: number;
  vy: number;
  tone: string;
};

/**
 * Sparse 2D dust behind the hero. No libraries, no WebGL.
 * Pauses when the tab or the hero is hidden. One static frame if motion is reduced.
 */
export function initHero() {
  const hero = document.getElementById('hero');
  const canvas = hero?.querySelector<HTMLCanvasElement>('[data-hero-dust]');
  if (!hero || !canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;

  let dots: Dot[] = [];
  let width = 1;
  let height = 1;
  let raf = 0;
  let running = false;
  let onScreen = true;
  let pageHidden = document.hidden;
  let mx = 0;
  let my = 0;
  let px = 0;
  let py = 0;

  const layout = () => {
    width = Math.max(1, hero.clientWidth);
    height = Math.max(1, hero.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.max(40, Math.min(150, Math.round((width * height) / 17000)));
    dots = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.35 + Math.random() * 1.15,
      base: 0.12 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.35 + Math.random() * 1.05,
      vx: (Math.random() - 0.5) * 0.06,
      vy: 0.012 + Math.random() * 0.04,
      tone: Math.random() > 0.7 ? '#b7b7bc' : '#f3f3f4',
    }));
  };

  const draw = (now: number) => {
    ctx.clearRect(0, 0, width, height);
    px += (mx - px) * 0.045;
    py += (my - py) * 0.045;
    const t = now * 0.001;
    for (const dot of dots) {
      if (!reduced) {
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (dot.x < -4) dot.x = width + 4;
        else if (dot.x > width + 4) dot.x = -4;
        if (dot.y > height + 4) dot.y = -4;
      }
      const twinkle = reduced ? 1 : 0.62 + 0.38 * Math.sin(t * dot.speed + dot.phase);
      const depth = dot.r / 1.5;
      ctx.globalAlpha = Math.max(0, Math.min(1, dot.base * twinkle));
      ctx.fillStyle = dot.tone;
      ctx.beginPath();
      ctx.arc(dot.x + px * 8 * depth, dot.y + py * 5 * depth, dot.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const loop = (now: number) => {
    if (!running) return;
    draw(now);
    raf = requestAnimationFrame(loop);
  };

  const start = () => {
    if (running || reduced || !onScreen || pageHidden) return;
    running = true;
    raf = requestAnimationFrame(loop);
  };

  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  layout();
  if (reduced) draw(0);
  else start();

  if (fine && !reduced) {
    hero.addEventListener(
      'pointermove',
      (event) => {
        mx = (event.clientX / Math.max(1, width) - 0.5) * 2;
        my = (event.clientY / Math.max(1, height) - 0.5) * 2;
      },
      { passive: true },
    );
  }

  document.addEventListener('visibilitychange', () => {
    pageHidden = document.hidden;
    if (pageHidden) stop();
    else start();
  });

  const watch = new IntersectionObserver((entries) => {
    onScreen = entries.some((entry) => entry.isIntersecting);
    if (onScreen) start();
    else stop();
  });
  watch.observe(hero);

  let resizeTimer = 0;
  const observer = new ResizeObserver(() => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      layout();
      if (reduced || !running) draw(performance.now());
    }, 80);
  });
  observer.observe(hero);
}
