type Wave = { ax: number; ay: number; freq: number; phase: number };

type DustLayer = {
  el: HTMLElement;
  tile: number;
  vx: number;
  vy: number;
  waves: Wave[];
  twinkle: { period: number; phase: number; lo: number; hi: number };
  desktopOnly: boolean;
};

type HeroWindow = Window & { __heroT?: number; __heroHold?: number | null };

const DUST_IN = 1.02;
const DUST_SPAN = 0.58;
const BURST_END = 1.78;
const PULL_UP0 = 0.04;
const PULL_UP1 = 0.28;
const PULL_DOWN0 = 0.78;
const PULL_DOWN1 = 1.12;
const FADE_SPAN = 0.48;
const BUCKETS = 8;
const ALPHA_MAX = 0.52;
const TIER_COLOR = ['#aeb8c4', '#d4dae3', '#e6ebf1'];

const smoother = (t: number) => {
  const c = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return c * c * c * (c * (c * 6 - 15) + 10);
};

const pullOf = (local: number) => {
  if (local <= PULL_UP0) return 0;
  const up = smoother((local - PULL_UP0) / (PULL_UP1 - PULL_UP0));
  const down = smoother((local - PULL_DOWN0) / (PULL_DOWN1 - PULL_DOWN0));
  const pull = up * (1 - down);
  return pull < 0 ? 0 : pull;
};

/**
 * One clock drives the settled dust and a short reload gesture. Specks of
 * three depths ease toward a loose point with inertia and a curl field, then
 * fade out as the drifting dust fades in.
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
      twinkle: { period: 16, phase: 0.4, lo: 0.34, hi: 0.38 },
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
      twinkle: { period: 11, phase: 1.1, lo: 0.96, hi: 1 },
      desktopOnly: false,
    },
  ];

  const pointerFine = window.matchMedia('(pointer: fine) and (min-width: 768px)');
  const desktop = window.matchMedia('(min-width: 768px)');
  const heroWindow = window as HeroWindow;
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
  let cssW = 0;
  let cssH = 0;
  let dpr = 1;
  let burstDone = false;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-field__burst';
  canvas.setAttribute('aria-hidden', 'true');
  field.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    canvas.remove();
    burstDone = true;
  }

  let count = 0;
  let farN = 0;
  let midN = 0;
  let x0 = new Float32Array(0);
  let y0 = new Float32Array(0);
  let nx = new Float32Array(0);
  let ny = new Float32Array(0);
  let vx = new Float32Array(0);
  let vy = new Float32Array(0);
  let ox = new Float32Array(0);
  let oy = new Float32Array(0);
  let mass = new Float32Array(0);
  let attract = new Float32Array(0);
  let delay = new Float32Array(0);
  let base = new Float32Array(0);
  let size = new Float32Array(0);
  let phase = new Float32Array(0);
  let spin = new Float32Array(0);
  let spinAmp = new Float32Array(0);
  let gain = new Float32Array(0);
  let fadeAt = new Float32Array(0);
  let driftX = new Float32Array(0);
  let driftY = new Float32Array(0);
  let drawX = new Float32Array(0);
  let drawY = new Float32Array(0);
  let drawS = new Float32Array(0);
  let drawA = new Float32Array(0);
  let order = new Int32Array(0);
  const counts = new Int32Array(BUCKETS);
  const starts = new Int32Array(BUCKETS);
  const cursor = new Int32Array(BUCKETS);

  const rand = (() => {
    let x = 0xc0ffee >>> 0;
    return () => {
      x ^= x << 13;
      x >>>= 0;
      x ^= x >> 17;
      x >>>= 0;
      x ^= x << 5;
      x >>>= 0;
      return x / 4294967296;
    };
  })();

  const alloc = (n: number) => {
    x0 = new Float32Array(n);
    y0 = new Float32Array(n);
    nx = new Float32Array(n);
    ny = new Float32Array(n);
    vx = new Float32Array(n);
    vy = new Float32Array(n);
    ox = new Float32Array(n);
    oy = new Float32Array(n);
    mass = new Float32Array(n);
    attract = new Float32Array(n);
    delay = new Float32Array(n);
    base = new Float32Array(n);
    size = new Float32Array(n);
    phase = new Float32Array(n);
    spin = new Float32Array(n);
    spinAmp = new Float32Array(n);
    gain = new Float32Array(n);
    fadeAt = new Float32Array(n);
    driftX = new Float32Array(n);
    driftY = new Float32Array(n);
    drawX = new Float32Array(n);
    drawY = new Float32Array(n);
    drawS = new Float32Array(n);
    drawA = new Float32Array(n);
    order = new Int32Array(n);
  };

  const seed = (n: number) => {
    count = n;
    farN = Math.round(n * 0.72);
    midN = farN + Math.round(n * 0.22);
    alloc(n);
    const aspect = cssW / Math.max(1, cssH);
    const cols = Math.max(8, Math.round(Math.sqrt(n * aspect)));
    const rows = Math.max(8, Math.ceil(n / cols));
    const cells = cols * rows;
    const pick = new Uint32Array(cells);
    for (let i = 0; i < cells; i += 1) pick[i] = i;
    for (let i = cells - 1; i > 0; i -= 1) {
      const j = (rand() * (i + 1)) | 0;
      const swap = pick[i];
      pick[i] = pick[j];
      pick[j] = swap;
    }
    for (let i = 0; i < n; i += 1) {
      const cell = pick[i % cells];
      const col = cell % cols;
      const row = (cell / cols) | 0;
      const px = (col + 0.5 + (rand() - 0.5) * 0.9) / cols;
      const py = (row + 0.5 + (rand() - 0.5) * 0.9) / rows;
      x0[i] = px < 0 ? px + 1 : px > 1 ? px - 1 : px;
      y0[i] = py < 0 ? py + 1 : py > 1 ? py - 1 : py;
      nx[i] = x0[i];
      ny[i] = y0[i];
      const mag = Math.min(1.7, Math.sqrt(-2 * Math.log(Math.max(1e-4, rand()))));
      const ang = rand() * Math.PI * 2;
      ox[i] = Math.cos(ang) * mag;
      oy[i] = Math.sin(ang) * mag;
      const tier = i < farN ? 0 : i < midN ? 1 : 2;
      if (tier === 0) {
        mass[i] = 1.38 + rand() * 0.28;
        base[i] = 0.18 + rand() * 0.16;
        gain[i] = 0.78 + rand() * 0.12;
        delay[i] = rand() * 0.1;
        size[i] = 1;
      } else if (tier === 1) {
        mass[i] = 1.02 + rand() * 0.16;
        base[i] = 0.32 + rand() * 0.14;
        gain[i] = 1 + rand() * 0.1;
        delay[i] = rand() * 0.06;
        size[i] = 1;
      } else {
        mass[i] = 0.86 + rand() * 0.1;
        base[i] = 0.42 + rand() * 0.12;
        gain[i] = 1.12 + rand() * 0.12;
        delay[i] = rand() * 0.04;
        size[i] = 2;
      }
      const involved = rand() > 0.18;
      attract[i] = involved ? 0.78 + rand() * 0.2 : 0.12 + rand() * 0.18;
      if (tier === 0) attract[i] *= 0.92;
      phase[i] = rand() * Math.PI * 2;
      spin[i] = rand() < 0.5 ? -1 : 1;
      spinAmp[i] = 0.45 + rand() * 0.55;
      fadeAt[i] = 1.05 + rand() * 0.16;
      driftX[i] = (rand() - 0.42) * 0.014 * gain[i];
      driftY[i] = (rand() - 0.5) * 0.012 * gain[i];
    }
  };

  const fit = () => {
    const rect = field.getBoundingClientRect();
    const nextW = Math.max(1, Math.round(rect.width));
    const nextH = Math.max(1, Math.round(rect.height));
    const cap = nextW < 768 ? 1.5 : 2;
    const nextDpr = Math.min(cap, Math.max(1, window.devicePixelRatio || 1));
    if (nextW === cssW && nextH === cssH && nextDpr === dpr && count > 0) return;
    cssW = nextW;
    cssH = nextH;
    dpr = nextDpr;
    if (!burstDone && ctx) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    if (count === 0) {
      const narrow = cssW < 768;
      const target = Math.round((cssW * cssH) / (narrow ? 520 : 820));
      const capCount = narrow ? 780 : 1700;
      const floor = narrow ? 480 : 1100;
      seed(Math.max(floor, Math.min(capCount, target)));
    }
  };

  const wrap = (value: number, span: number) => {
    const m = value % span;
    return m < 0 ? m + span : m;
  };

  const dustReveal = () => {
    if (burstDone || !ctx) return 1;
    return smoother((time - DUST_IN) / DUST_SPAN);
  };

  const paintDust = (reveal: number) => {
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
      const breath = 0.5 - 0.5 * Math.cos((time / layer.twinkle.period) * Math.PI * 2 + layer.twinkle.phase);
      const rest = layer.twinkle.lo + (layer.twinkle.hi - layer.twinkle.lo) * breath;
      layer.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      layer.el.style.opacity = (rest * reveal).toFixed(3);
    }
  };

  const drawRange = (from: number, to: number) => {
    if (!ctx) return;
    counts.fill(0);
    for (let i = from; i < to; i += 1) {
      const alpha = drawA[i];
      if (alpha <= 0) continue;
      const bucket = Math.min(BUCKETS - 1, ((alpha / ALPHA_MAX) * BUCKETS) | 0);
      counts[bucket] += 1;
    }
    let run = 0;
    for (let b = 0; b < BUCKETS; b += 1) {
      starts[b] = run;
      cursor[b] = run;
      run += counts[b];
    }
    for (let i = from; i < to; i += 1) {
      const alpha = drawA[i];
      if (alpha <= 0) continue;
      const bucket = Math.min(BUCKETS - 1, ((alpha / ALPHA_MAX) * BUCKETS) | 0);
      order[cursor[bucket]] = i;
      cursor[bucket] += 1;
    }
    for (let b = 0; b < BUCKETS; b += 1) {
      const n = counts[b];
      if (n === 0) continue;
      ctx.globalAlpha = ((b + 0.5) / BUCKETS) * ALPHA_MAX;
      const at = starts[b];
      for (let j = 0; j < n; j += 1) {
        const i = order[at + j];
        ctx.fillRect(drawX[i], drawY[i], drawS[i], drawS[i]);
      }
    }
  };

  const paintBurst = (dt: number) => {
    if (!ctx || burstDone) return;
    if (time >= BURST_END) {
      burstDone = true;
      canvas.remove();
      ctx.globalAlpha = 1;
      return;
    }
    const narrow = cssW < 768;
    const lean = pointerFine.matches ? 1 : 0;
    const focusX = (narrow ? 0.5 : 0.3) + followX * 0.016 * lean;
    const focusY = (narrow ? 0.4 : 0.46) + followY * 0.01 * lean;
    const rx = narrow ? 0.12 : 0.09;
    const ry = narrow ? 0.075 : 0.055;
    const step = dt > 0 ? dt : 0;

    for (let i = 0; i < count; i += 1) {
      const local = time - delay[i];
      const pull = pullOf(local);
      const fade = 1 - smoother((time - fadeAt[i]) / FADE_SPAN);
      const gx = focusX + ox[i] * rx;
      const gy = focusY + oy[i] * ry;
      let goalX = x0[i] + (gx - x0[i]) * attract[i];
      let goalY = y0[i] + (gy - y0[i]) * attract[i];
      if (goalX < 0.04) goalX = 0.04;
      else if (goalX > 0.96) goalX = 0.96;
      if (goalY < 0.04) goalY = 0.04;
      else if (goalY > 0.96) goalY = 0.96;

      const dx = goalX - nx[i];
      const dy = goalY - ny[i];
      const dist = Math.sqrt(dx * dx + dy * dy) + 1e-4;
      const falloff = smoother((dist - 0.055) / 0.12);
      const inv = 1 / dist;
      const g = gain[i];
      const strength = pull * 6.8 * g * falloff;
      const swirl = pull * 1.6 * spinAmp[i] * spin[i] * falloff;
      const release = smoother((local - PULL_DOWN0) / (PULL_DOWN1 - PULL_DOWN0));
      const away = release * (0.85 / mass[i]) * g;
      const fx = nx[i] - focusX;
      const fy = ny[i] - focusY;
      const fl = Math.sqrt(fx * fx + fy * fy) + 0.08;
      const tt = time * 0.42 + phase[i] * 0.15;
      const n1 = Math.sin(nx[i] * 2.4 + phase[i] + tt);
      const n2 = Math.cos(ny[i] * 2.1 - tt * 0.75);
      const n3 = Math.sin((nx[i] + ny[i]) * 1.6 + tt * 0.22);
      const flow = (0.28 + 0.45 * pull) * g;
      const ax =
        dx * inv * strength -
        dy * inv * swirl +
        (fx / fl) * away +
        (n2 * 0.7 + n3 * 0.35) * flow;
      const ay =
        dy * inv * strength +
        dx * inv * swirl +
        (fy / fl) * away +
        (-n1 * 0.7 + n3 * 0.3) * flow;

      vx[i] += ax * step;
      vy[i] += ay * step;
      const keep = Math.exp(-(8.2 + 5 * (1 - falloff)) * step);
      vx[i] = driftX[i] + (vx[i] - driftX[i]) * keep;
      vy[i] = driftY[i] + (vy[i] - driftY[i]) * keep;
      const speed = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
      if (speed > 0.95) {
        const limit = 0.95 / speed;
        vx[i] *= limit;
        vy[i] *= limit;
      }
      nx[i] += vx[i] * step;
      ny[i] += vy[i] * step;

      const focusDist = Math.sqrt((nx[i] - focusX) ** 2 + ((ny[i] - focusY) * 1.35) ** 2);
      const nearFocus = focusDist >= 0.24 ? 0 : 1 - focusDist / 0.24;
      const alpha = fade <= 0 ? 0 : base[i] * (0.86 + 0.12 * pull + 0.34 * nearFocus * pull) * fade;
      if (alpha < 0.04 || nx[i] < -0.04 || nx[i] > 1.04 || ny[i] < -0.04 || ny[i] > 1.04) {
        drawA[i] = 0;
        continue;
      }
      drawX[i] = Math.round(nx[i] * cssW * dpr);
      drawY[i] = Math.round(ny[i] * cssH * dpr);
      drawS[i] = Math.max(1, Math.round(size[i] * dpr));
      drawA[i] = alpha > ALPHA_MAX ? ALPHA_MAX : alpha;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let tier = 0; tier < 3; tier += 1) {
      const from = tier === 0 ? 0 : tier === 1 ? farN : midN;
      const to = tier === 0 ? farN : tier === 1 ? midN : count;
      ctx.fillStyle = TIER_COLOR[tier];
      if (tier > 0) {
        ctx.globalAlpha = 0.11;
        const trail = 0.014 * dpr;
        for (let i = from; i < to; i += 1) {
          if (drawA[i] <= 0) continue;
          const sp2 = vx[i] * vx[i] + vy[i] * vy[i];
          if (sp2 < 0.014) continue;
          ctx.fillRect(
            Math.round(drawX[i] - vx[i] * cssW * trail),
            Math.round(drawY[i] - vy[i] * cssH * trail),
            drawS[i],
            drawS[i],
          );
        }
      }
      drawRange(from, to);
    }
    ctx.globalAlpha = 1;
  };

  const paint = (dt: number) => {
    const followBlend = 1 - Math.exp(-dt * 5.5);
    followX += (pointerX - followX) * followBlend;
    followY += (pointerY - followY) * followBlend;
    if (pointerFine.matches) {
      const nextX = followX.toFixed(3);
      const nextY = followY.toFixed(3);
      if (nextX !== shownX || nextY !== shownY) {
        shownX = nextX;
        shownY = nextY;
        field.style.setProperty('--mx', nextX);
        field.style.setProperty('--my', nextY);
      }
    }
    if (!burstDone) fit();
    paintDust(dustReveal());
    paintBurst(dt);
  };

  const loop = (now: number) => {
    if (!running) return;
    heroWindow.__heroT = time;
    const holdAt = heroWindow.__heroHold;
    if (typeof holdAt === 'number' && time >= holdAt) {
      last = now;
      paint(0);
      raf = requestAnimationFrame(loop);
      return;
    }
    let dt = (now - last) / 1000;
    last = now;
    if (dt < 0) dt = 0;
    else if (dt > 0.05) dt = 0.05;
    if (typeof holdAt === 'number' && time + dt > holdAt) dt = holdAt - time;
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

  fit();
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
  window.addEventListener('resize', () => {
    if (!burstDone) fit();
  });

  window.addEventListener(
    'pointermove',
    (event) => {
      if (!pointerFine.matches) return;
      pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
    },
    { passive: true },
  );
  pointerFine.addEventListener('change', () => {
    if (pointerFine.matches) return;
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
