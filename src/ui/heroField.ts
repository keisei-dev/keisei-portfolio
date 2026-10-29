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

const LEAD = 0.34;
const DUST_IN = 1.55;
const DUST_DONE = 2.55;
const BURST_END = 2.85;
const BUCKETS = 8;

/**
 * One clock drives the settled dust and the reload burst. The burst is its
 * own canvas: a full field gathers into a cloud, holds, then scatters. The
 * dust underneath fades in during the scatter and keeps drifting after.
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
  } else {
    ctx.fillStyle = '#dfe3e9';
  }

  let count = 0;
  let x0 = new Float32Array(0);
  let y0 = new Float32Array(0);
  let ox = new Float32Array(0);
  let oy = new Float32Array(0);
  let ang = new Float32Array(0);
  let dist = new Float32Array(0);
  let size = new Float32Array(0);
  let base = new Float32Array(0);
  let delay = new Float32Array(0);
  let gatherDur = new Float32Array(0);
  let holdDur = new Float32Array(0);
  let disperseDur = new Float32Array(0);
  let freq = new Float32Array(0);
  let phase = new Float32Array(0);
  let curl = new Float32Array(0);
  let drawX = new Float32Array(0);
  let drawY = new Float32Array(0);
  let drawS = new Float32Array(0);
  let drawA = new Float32Array(0);
  let order = new Int32Array(0);
  const counts = new Int32Array(BUCKETS);
  const starts = new Int32Array(BUCKETS);
  const cursor = new Int32Array(BUCKETS);

  const rand = (() => {
    let x = 0xa11ce >>> 0;
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

  const seed = (n: number) => {
    count = n;
    x0 = new Float32Array(n);
    y0 = new Float32Array(n);
    ox = new Float32Array(n);
    oy = new Float32Array(n);
    ang = new Float32Array(n);
    dist = new Float32Array(n);
    size = new Float32Array(n);
    base = new Float32Array(n);
    delay = new Float32Array(n);
    gatherDur = new Float32Array(n);
    holdDur = new Float32Array(n);
    disperseDur = new Float32Array(n);
    freq = new Float32Array(n);
    phase = new Float32Array(n);
    curl = new Float32Array(n);
    drawX = new Float32Array(n);
    drawY = new Float32Array(n);
    drawS = new Float32Array(n);
    drawA = new Float32Array(n);
    order = new Int32Array(n);
    for (let i = 0; i < n; i += 1) {
      x0[i] = rand();
      y0[i] = rand();
      const mag = Math.sqrt(-2 * Math.log(Math.max(1e-4, rand())));
      const spin = rand() * Math.PI * 2;
      ox[i] = Math.cos(spin) * mag;
      oy[i] = Math.sin(spin) * mag;
      ang[i] = Math.atan2(oy[i], ox[i]) + (rand() - 0.5) * 1.15;
      dist[i] = 0.42 + rand() * 0.72;
      size[i] = 2 + Math.pow(rand(), 0.8) * 4;
      base[i] = 0.2 + Math.pow(rand(), 0.6) * 0.7;
      delay[i] = rand() * 0.16;
      gatherDur[i] = 0.7 + rand() * 0.22;
      holdDur[i] = 0.28 + rand() * 0.12;
      disperseDur[i] = 1.0 + rand() * 0.24;
      freq[i] = 2.2 + rand() * 3.4;
      phase[i] = rand() * Math.PI * 2;
      curl[i] = 8 + rand() * 26;
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
      ctx.fillStyle = '#dfe3e9';
    }
    if (count === 0) {
      const narrow = cssW < 768;
      const target = Math.round((cssW * cssH) / (narrow ? 280 : 400));
      seed(Math.max(700, Math.min(narrow ? 1200 : 3400, target)));
    }
  };

  const wrap = (value: number, span: number) => {
    const m = value % span;
    return m < 0 ? m + span : m;
  };

  const dustReveal = () => {
    if (burstDone || !ctx) return 1;
    if (time <= DUST_IN) return 0;
    if (time >= DUST_DONE) return 1;
    const u = 1 - (time - DUST_IN) / (DUST_DONE - DUST_IN);
    const u2 = u * u;
    return 1 - u2 * u2;
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

  const paintBurst = () => {
    if (!ctx || burstDone) return;
    if (time >= BURST_END) {
      burstDone = true;
      canvas.remove();
      return;
    }
    const narrow = cssW < 768;
    const focusX = narrow ? 0.5 : 0.34;
    const focusY = narrow ? 0.47 : 0.5;
    const rx = narrow ? 0.1 : 0.062;
    const ry = narrow ? 0.05 : 0.038;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    for (let i = 0; i < count; i += 1) {
      const local = time - LEAD - delay[i];
      const tx = focusX + ox[i] * rx;
      const ty = focusY + oy[i] * ry;
      let nx = x0[i];
      let ny = y0[i];
      let alpha = base[i];
      let env = 0.35;
      if (local <= 0) {
        env = 0.55;
      } else if (local < gatherDur[i]) {
        const k = local / gatherDur[i];
        const e = k * k;
        nx = x0[i] + (tx - x0[i]) * e;
        ny = y0[i] + (ty - y0[i]) * e;
        alpha = Math.min(1, base[i] * (0.8 + 0.7 * e));
        env = 1 - e * 0.65;
      } else if (local < gatherDur[i] + holdDur[i]) {
        nx = tx;
        ny = ty;
        alpha = Math.min(1, base[i] * 1.55);
        env = 0.22;
      } else {
        const k = (local - gatherDur[i] - holdDur[i]) / disperseDur[i];
        if (k >= 1) {
          drawA[i] = 0;
          continue;
        }
        const inv = 1 - k;
        const e = 1 - inv * inv * inv;
        const ex = tx + Math.cos(ang[i]) * dist[i];
        const ey = ty + Math.sin(ang[i]) * dist[i];
        nx = tx + (ex - tx) * e;
        ny = ty + (ey - ty) * e;
        alpha = base[i] * Math.pow(1 - k, 0.55);
        env = 0.8 * (1 - e);
      }
      const wobble = Math.sin(time * freq[i] + phase[i]) * curl[i] * env;
      nx += wobble / cssW;
      ny += Math.cos(time * freq[i] * 0.8 + phase[i]) * curl[i] * 0.7 * env / cssH;
      if (alpha < 0.04) {
        drawA[i] = 0;
        continue;
      }
      drawX[i] = Math.round(nx * cssW * dpr);
      drawY[i] = Math.round(ny * cssH * dpr);
      drawS[i] = Math.max(1, Math.round(size[i] * dpr));
      drawA[i] = alpha;
      alive += 1;
    }
    if (alive === 0) return;
    counts.fill(0);
    for (let i = 0; i < count; i += 1) {
      const alpha = drawA[i];
      if (alpha <= 0) continue;
      const bucket = Math.min(BUCKETS - 1, (alpha * BUCKETS) | 0);
      counts[bucket] += 1;
    }
    let run = 0;
    for (let b = 0; b < BUCKETS; b += 1) {
      starts[b] = run;
      cursor[b] = run;
      run += counts[b];
    }
    for (let i = 0; i < count; i += 1) {
      const alpha = drawA[i];
      if (alpha <= 0) continue;
      const bucket = Math.min(BUCKETS - 1, (alpha * BUCKETS) | 0);
      order[cursor[bucket]] = i;
      cursor[bucket] += 1;
    }
    for (let b = 0; b < BUCKETS; b += 1) {
      const n = counts[b];
      if (n === 0) continue;
      ctx.globalAlpha = (b + 0.5) / BUCKETS;
      const from = starts[b];
      for (let j = 0; j < n; j += 1) {
        const i = order[from + j];
        ctx.fillRect(drawX[i], drawY[i], drawS[i], drawS[i]);
      }
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
    paintBurst();
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
