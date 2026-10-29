type Wave = { ax: number; ay: number; freq: number; phase: number };

type DustLayer = {
  el: HTMLElement;
  tile: number;
  vx: number;
  vy: number;
  waves: Wave[];
  originX: number;
  originY: number;
  /** Ease-out quart span. The travel offset is gone, with zero velocity, at this time. */
  span: number;
  twinkle: { period: number; phase: number; lo: number; hi: number };
  /** Opacity at the start of the burst. It decays into the resting twinkle. */
  crest?: number;
  fade?: number;
  crestTau?: number;
  desktopOnly: boolean;
};

/**
 * One clock drives every speck layer. Drift is already running. The entrance
 * is an ease-out quart offset that reaches zero, with zero velocity, at the
 * end of its span, so it joins the drift without a stop or a kink.
 */
export function initHeroField() {
  const hero = document.getElementById('hero');
  const field = hero?.querySelector<HTMLElement>('.hero-field');
  if (!hero || !field) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const dust = (name: string) => field.querySelector<HTMLElement>(`.hero-field__dust--${name}`);
  const far = dust('far');
  const fineDust = dust('fine');
  const mid = dust('mid');
  const near = dust('near');
  if (!far || !fineDust || !mid || !near) return;

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
      span: 0.9,
      twinkle: { period: 14, phase: 0.6, lo: 0.28, hi: 0.32 },
      desktopOnly: false,
    },
    {
      el: fineDust,
      tile: 180,
      vx: 180 / 168,
      vy: -180 / 204,
      waves: [
        { ax: 8, ay: 6, freq: (Math.PI * 2) / 24, phase: 0.2 },
        { ax: -5, ay: 7, freq: (Math.PI * 2) / 39, phase: 1.5 },
      ],
      originX: -72,
      originY: 110,
      span: 0.86,
      twinkle: { period: 16, phase: 0.4, lo: 0.34, hi: 0.38 },
      crest: 1,
      fade: 0.09,
      crestTau: 0.5,
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
      span: 0.98,
      twinkle: { period: 13, phase: 2.4, lo: 0.96, hi: 1 },
      desktopOnly: false,
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
      span: 0.82,
      twinkle: { period: 11, phase: 1.1, lo: 0.96, hi: 1 },
      desktopOnly: false,
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

  /**
   * Remainder of an ease-out quart. Full offset at t = 0, exactly 0 at
   * t >= span, and the derivative is 0 there so the drift takes over cleanly.
   * Initial speed is 4 * distance / span.
   */
  const quartOut = (span: number, t: number) => {
    if (t <= 0) return 1;
    if (t >= span) return 0;
    const u = 1 - t / span;
    const u2 = u * u;
    return u2 * u2;
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
      const entrance = quartOut(layer.span, time);
      x += layer.originX * entrance;
      y += layer.originY * entrance;
      const breath = 0.5 - 0.5 * Math.cos((time / layer.twinkle.period) * Math.PI * 2 + layer.twinkle.phase);
      const rest = layer.twinkle.lo + (layer.twinkle.hi - layer.twinkle.lo) * breath;
      let opacity = rest * (1 - entrance);
      if (layer.crest && layer.fade && layer.crestTau) {
        const fadeIn = 1 - Math.exp(-time / layer.fade);
        const extra = Math.exp(-time / layer.crestTau);
        opacity = (rest + (layer.crest - rest) * extra) * fadeIn;
      }
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
