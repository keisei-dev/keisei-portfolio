type Wave = { ax: number; ay: number; freq: number; phase: number };

type DustLayer = {
  el: HTMLElement;
  tile: number;
  vx: number;
  vy: number;
  waves: Wave[];
  originX: number;
  originY: number;
  tau: number;
  fade: number;
  twinkle: { period: number; phase: number; lo: number; hi: number };
  desktopOnly: boolean;
};

/**
 * One clock drives every speck layer. The entrance is a critically damped
 * offset (starts at rest, velocity returns to zero) added to a drift that
 * is already running, so nothing has to stop and start.
 */
export function initHeroField() {
  const hero = document.getElementById('hero');
  const field = hero?.querySelector<HTMLElement>('.hero-field');
  if (!hero || !field) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const dust = (name: string) => field.querySelector<HTMLElement>(`.hero-field__dust--${name}`);
  const far = dust('far');
  const mid = dust('mid');
  const near = dust('near');
  if (!far || !mid || !near) return;

  const layers: DustLayer[] = [
    {
      el: far,
      tile: 420,
      vx: -420 / 190,
      vy: 420 / 230,
      waves: [
        { ax: 16, ay: 9, freq: (Math.PI * 2) / 28, phase: 0.4 },
        { ax: 7, ay: 13, freq: (Math.PI * 2) / 43, phase: 2.1 },
      ],
      originX: 64,
      originY: 168,
      tau: 0.72,
      fade: 0.62,
      twinkle: { period: 9.5, phase: 0.6, lo: 0.2, hi: 0.34 },
      desktopOnly: false,
    },
    {
      el: mid,
      tile: 340,
      vx: 340 / 150,
      vy: -340 / 176,
      waves: [
        { ax: -18, ay: 14, freq: (Math.PI * 2) / 19, phase: 1.2 },
        { ax: 9, ay: -11, freq: (Math.PI * 2) / 33, phase: 0.3 },
      ],
      originX: -150,
      originY: 46,
      tau: 0.84,
      fade: 0.74,
      twinkle: { period: 7.2, phase: 2.4, lo: 0.84, hi: 1 },
      desktopOnly: true,
    },
    {
      el: near,
      tile: 240,
      vx: -240 / 124,
      vy: -240 / 148,
      waves: [
        { ax: 22, ay: -16, freq: (Math.PI * 2) / 15, phase: 0.8 },
        { ax: -10, ay: 12, freq: (Math.PI * 2) / 26, phase: 1.7 },
      ],
      originX: 96,
      originY: -132,
      tau: 0.6,
      fade: 0.5,
      twinkle: { period: 5.8, phase: 1.1, lo: 0.88, hi: 1 },
      desktopOnly: true,
    },
  ];

  const fine = window.matchMedia('(pointer: fine) and (min-width: 768px)');
  const desktop = window.matchMedia('(min-width: 768px)');
  let onScreen = true;
  let hidden = document.hidden;
  let raf = 0;
  let running = false;
  let last = 0;
  let time = 0;
  let pointerX = 0;
  let pointerY = 0;
  let followX = 0;
  let followY = 0;
  let shownX = '';
  let shownY = '';

  const wrap = (value: number, size: number) => {
    const m = value % size;
    return m < 0 ? m + size : m;
  };

  /** Critically damped return to zero. Velocity is 0 at t = 0 and again as t grows. */
  const settle = (distance: number, tau: number, t: number) => {
    const k = t / tau;
    return distance * (1 + k) * Math.exp(-k);
  };

  const paint = (dt: number) => {
    const followBlend = 1 - Math.exp(-dt * 5.5);
    followX += (pointerX - followX) * followBlend;
    followY += (pointerY - followY) * followBlend;
    if (fine.matches) {
      const nextX = followX.toFixed(3);
      const nextY = followY.toFixed(3);
      if (nextX !== shownX || nextY !== shownY) {
        shownX = nextX;
        shownY = nextY;
        field.style.setProperty('--mx', nextX);
        field.style.setProperty('--my', nextY);
      }
    }

    const wide = desktop.matches;
    for (const layer of layers) {
      if (layer.desktopOnly && !wide) continue;
      let x = wrap(layer.vx * time, layer.tile);
      let y = wrap(layer.vy * time, layer.tile);
      for (const wave of layer.waves) {
        const angle = time * wave.freq + wave.phase;
        x += wave.ax * Math.sin(angle);
        y += wave.ay * Math.cos(angle);
      }
      x += settle(layer.originX, layer.tau, time);
      y += settle(layer.originY, layer.tau, time);
      const appear = 1 - Math.exp(-time / layer.fade);
      const breath = 0.5 - 0.5 * Math.cos((time / layer.twinkle.period) * Math.PI * 2 + layer.twinkle.phase);
      const opacity = (layer.twinkle.lo + (layer.twinkle.hi - layer.twinkle.lo) * breath) * appear;
      layer.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      layer.el.style.opacity = opacity.toFixed(3);
    }
  };

  const loop = (now: number) => {
    if (!running) return;
    let dt = (now - last) / 1000;
    last = now;
    if (dt < 0) dt = 0;
    else if (dt > 0.05) dt = 0.05;
    time += dt;
    paint(dt);
    raf = requestAnimationFrame(loop);
  };

  const start = () => {
    if (running || !onScreen || hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  };

  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  paint(0);
  start();

  const watch = new IntersectionObserver((entries) => {
    onScreen = entries.some((entry) => entry.isIntersecting);
    if (onScreen) start();
    else stop();
  });
  watch.observe(hero);
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
    if (hidden) stop();
    else start();
  });

  window.addEventListener(
    'pointermove',
    (event) => {
      if (!fine.matches) return;
      pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
    },
    { passive: true },
  );
  fine.addEventListener('change', () => {
    if (fine.matches) return;
    pointerX = 0;
    pointerY = 0;
    followX = 0;
    followY = 0;
    shownX = '0.000';
    shownY = '0.000';
    field.style.setProperty('--mx', '0');
    field.style.setProperty('--my', '0');
  });
}
