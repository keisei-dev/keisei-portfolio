type HeroWindow = Window & { __heroT?: number; __heroHold?: number | null };

const PULL_UP0 = 0.04;
const PULL_UP1 = 0.28;
const PULL_DOWN0 = 0.78;
const PULL_DOWN1 = 1.12;
const BUCKETS = 8;
const ALPHA_MAX = 0.4;
const TIER_COLOR = ['#c3cad3', '#d5dbe4', '#e3e8ee'];

const smoother = (t: number) => {
  const c = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return c * c * c * (c * (c * 6 - 15) + 10);
};

const COAST_EASE = 0.45;
const COAST_EASE_TOTAL = 1 + (COAST_EASE - 2) / 2 + (1 - 2 * COAST_EASE) / 3 + COAST_EASE / 4;

/** Ease-out whose speed falls more slowly than a cubic, still zero at the end. */
const coastEase = (u: number) => {
  const inv = 1 - u;
  const f = inv * inv * (1 + COAST_EASE * u);
  const uu = u * u;
  const integ =
    u + ((COAST_EASE - 2) / 2) * uu + ((1 - 2 * COAST_EASE) / 3) * uu * u + (COAST_EASE / 4) * uu * uu;
  return { remain: 1 - integ / COAST_EASE_TOTAL, slope: -f / COAST_EASE_TOTAL };
};

const pullOf = (local: number) => {
  if (local <= PULL_UP0) return 0;
  const up = smoother((local - PULL_UP0) / (PULL_UP1 - PULL_UP0));
  const down = smoother((local - PULL_DOWN0) / (PULL_DOWN1 - PULL_DOWN0));
  const pull = up * (1 - down);
  return pull < 0 ? 0 : pull;
};

/**
 * One canvas is the hero dust for the whole visit. Specks swirl toward the
 * headline, then each one coasts to its own home and keeps drifting there.
 */
export function initHeroField() {
  const hero = document.getElementById('hero');
  const field = hero?.querySelector<HTMLElement>('.hero-field');
  if (!hero || !field) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointerFine = window.matchMedia('(pointer: fine) and (min-width: 768px)');
  const heroWindow = window as HeroWindow;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-field__burst';
  canvas.setAttribute('aria-hidden', 'true');
  field.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    canvas.remove();
    return;
  }

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
  let cssW = 0;
  let cssH = 0;
  let dpr = 1;
  let count = 0;
  let farN = 0;
  let midN = 0;

  let homeX = new Float32Array(0);
  let homeY = new Float32Array(0);
  let spawnX = new Float32Array(0);
  let spawnY = new Float32Array(0);
  let nx = new Float32Array(0);
  let ny = new Float32Array(0);
  let vx = new Float32Array(0);
  let vy = new Float32Array(0);
  let ox = new Float32Array(0);
  let oy = new Float32Array(0);
  let gain = new Float32Array(0);
  let attract = new Float32Array(0);
  let delay = new Float32Array(0);
  let returnAt = new Float32Array(0);
  let returnDur = new Float32Array(0);
  let departX = new Float32Array(0);
  let departY = new Float32Array(0);
  let coastOn = new Uint8Array(0);
  let base = new Float32Array(0);
  let size = new Float32Array(0);
  let phase = new Float32Array(0);
  let spin = new Float32Array(0);
  let spinAmp = new Float32Array(0);
  let freq = new Float32Array(0);
  let freq2 = new Float32Array(0);
  let ampX = new Float32Array(0);
  let ampY = new Float32Array(0);
  let twAmp = new Float32Array(0);
  let twFreq = new Float32Array(0);
  let shift = new Float32Array(0);
  let drawX = new Float32Array(0);
  let drawY = new Float32Array(0);
  let drawS = new Float32Array(0);
  let drawA = new Float32Array(0);
  let order = new Int32Array(0);
  const counts = new Int32Array(BUCKETS);
  const starts = new Int32Array(BUCKETS);
  const cursor = new Int32Array(BUCKETS);

  const rand = (() => {
    let x = 0x5eed1e >>> 0;
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
    homeX = new Float32Array(n);
    homeY = new Float32Array(n);
    spawnX = new Float32Array(n);
    spawnY = new Float32Array(n);
    nx = new Float32Array(n);
    ny = new Float32Array(n);
    vx = new Float32Array(n);
    vy = new Float32Array(n);
    ox = new Float32Array(n);
    oy = new Float32Array(n);
    gain = new Float32Array(n);
    attract = new Float32Array(n);
    delay = new Float32Array(n);
    returnAt = new Float32Array(n);
    returnDur = new Float32Array(n);
    departX = new Float32Array(n);
    departY = new Float32Array(n);
    coastOn = new Uint8Array(n);
    base = new Float32Array(n);
    size = new Float32Array(n);
    phase = new Float32Array(n);
    spin = new Float32Array(n);
    spinAmp = new Float32Array(n);
    freq = new Float32Array(n);
    freq2 = new Float32Array(n);
    ampX = new Float32Array(n);
    ampY = new Float32Array(n);
    twAmp = new Float32Array(n);
    twFreq = new Float32Array(n);
    shift = new Float32Array(n);
    drawX = new Float32Array(n);
    drawY = new Float32Array(n);
    drawS = new Float32Array(n);
    drawA = new Float32Array(n);
    order = new Int32Array(n);
  };

  const seed = (n: number) => {
    count = n;
    farN = Math.round(n * 0.62);
    midN = farN + Math.round(n * 0.3);
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
      const cell = pick[i];
      const col = cell % cols;
      const row = (cell / cols) | 0;
      const px = (col + 0.5 + (rand() - 0.5) * 0.92) / cols;
      const py = (row + 0.5 + (rand() - 0.5) * 0.92) / rows;
      nx[i] = px < 0 ? px + 1 : px > 1 ? px - 1 : px;
      ny[i] = py < 0 ? py + 1 : py > 1 ? py - 1 : py;
      spawnX[i] = nx[i];
      spawnY[i] = ny[i];
      const tier = i < farN ? 0 : i < midN ? 1 : 2;
      const hx = rand();
      const hy = tier === 0 ? rand() : 0.3 + 0.7 * Math.pow(rand(), 0.4);
      homeX[i] = hx < 0.02 ? 0.02 : hx > 0.98 ? 0.98 : hx;
      homeY[i] = hy < 0.02 ? 0.02 : hy > 0.98 ? 0.98 : hy;
      const mag = Math.min(1.6, Math.sqrt(-2 * Math.log(Math.max(1e-4, rand()))));
      const ang = rand() * Math.PI * 2;
      ox[i] = Math.cos(ang) * mag;
      oy[i] = Math.sin(ang) * mag;
      phase[i] = rand() * Math.PI * 2;
      spin[i] = rand() < 0.5 ? -1 : 1;
      spinAmp[i] = 0.4 + rand() * 0.55;
      const involved = rand() > 0.16;
      attract[i] = involved ? 0.74 + rand() * 0.22 : 0.14 + rand() * 0.2;
      if (tier === 0) {
        gain[i] = 0.72 + rand() * 0.12;
        delay[i] = rand() * 0.12;
        base[i] = 0.16 + rand() * 0.12;
        size[i] = 1;
        ampX[i] = 0.006 + rand() * 0.006;
        ampY[i] = 0.004 + rand() * 0.005;
        freq[i] = (Math.PI * 2) / (26 + rand() * 18);
        twAmp[i] = 0.16;
        shift[i] = 0.003;
        attract[i] *= 0.9;
      } else if (tier === 1) {
        gain[i] = 0.96 + rand() * 0.1;
        delay[i] = rand() * 0.07;
        base[i] = (0.26 + rand() * 0.12) * (0.58 + 0.42 * homeY[i]);
        size[i] = 1;
        ampX[i] = 0.01 + rand() * 0.008;
        ampY[i] = 0.007 + rand() * 0.006;
        freq[i] = (Math.PI * 2) / (18 + rand() * 12);
        twAmp[i] = 0.08;
        shift[i] = 0.006;
      } else {
        gain[i] = 1.08 + rand() * 0.12;
        delay[i] = rand() * 0.04;
        base[i] = (0.34 + rand() * 0.1) * (0.66 + 0.34 * homeY[i]);
        size[i] = 2;
        ampX[i] = 0.014 + rand() * 0.01;
        ampY[i] = 0.01 + rand() * 0.008;
        freq[i] = (Math.PI * 2) / (14 + rand() * 8);
        twAmp[i] = 0.05;
        shift[i] = 0.01;
      }
      freq2[i] = freq[i] * (0.63 + rand() * 0.3);
      twFreq[i] = (Math.PI * 2) / (9 + rand() * 8);
      returnAt[i] = 0.64 + rand() * 0.22;
      returnDur[i] = 1.012 + rand() * 0.261;
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
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (count === 0) {
      const narrow = cssW < 768;
      const target = Math.round((cssW * cssH) / (narrow ? 82 : 110));
      const capCount = narrow ? 6400 : 18000;
      const floor = narrow ? 900 : 2400;
      seed(Math.max(floor, Math.min(capCount, target)));
    }
  };

  const drawRange = (from: number, to: number) => {
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

  const placeDraw = (i: number, pull: number, focusX: number, focusY: number) => {
    const breath = 0.5 + 0.5 * Math.cos(time * twFreq[i] + phase[i]);
    const twinkle = 1 - twAmp[i] + twAmp[i] * breath;
    const focusDist = Math.sqrt((nx[i] - focusX) ** 2 + ((ny[i] - focusY) * 1.35) ** 2);
    const nearFocus = focusDist >= 0.28 ? 0 : 1 - focusDist / 0.28;
    let alpha = base[i] * twinkle * (0.96 + 0.04 * pull + 0.08 * nearFocus * pull);
    if (alpha < 0.035 || nx[i] < -0.04 || nx[i] > 1.04 || ny[i] < -0.04 || ny[i] > 1.04) {
      drawA[i] = 0;
      return;
    }
    if (alpha > ALPHA_MAX) alpha = ALPHA_MAX;
    drawX[i] = Math.round(nx[i] * cssW * dpr);
    drawY[i] = Math.round(ny[i] * cssH * dpr);
    drawS[i] = Math.max(1, Math.round(size[i] * dpr));
    drawA[i] = alpha;
  };

  const paint = (dt: number) => {
    const followBlend = dt > 0 ? 1 - Math.exp(-dt * 5.5) : 0;
    followX += (pointerX - followX) * followBlend;
    followY += (pointerY - followY) * followBlend;
    const narrow = cssW < 768;
    const lean = pointerFine.matches ? 1 : 0;
    const focusX = (narrow ? 0.5 : 0.3) + followX * 0.016 * lean;
    const focusY = (narrow ? 0.4 : 0.46) + followY * 0.01 * lean;
    const rx = narrow ? 0.16 : 0.14;
    const ry = narrow ? 0.1 : 0.085;
    const step = dt > 0 ? dt : 0;

    const coastHome = (i: number, uRaw: number, hx: number, hy: number, idleVx: number, idleVy: number) => {
      const u = uRaw >= 1 ? 1 : uRaw;
      const inv = 1 - u;
      const shaped = coastEase(u);
      if (coastOn[i] === 0) {
        const div = shaped.remain > 0.25 ? shaped.remain : 1;
        departX[i] = (nx[i] - hx) / div;
        departY[i] = (ny[i] - hy) / div;
        coastOn[i] = 1;
      }
      const remain = shaped.remain;
      const dRemain = shaped.slope / returnDur[i];
      const arc = u * u * inv * inv;
      const dArc = (2 * u * inv * (inv - u)) / returnDur[i];
      const len = Math.hypot(departX[i], departY[i]) + 1e-4;
      const sx = (-departY[i] / len) * spin[i];
      const sy = (departX[i] / len) * spin[i];
      const amp = 0.72 * spinAmp[i];
      const aimX = hx + departX[i] * remain + sx * amp * arc;
      const aimY = hy + departY[i] * remain + sy * amp * arc;
      const chase = 2 + 8 * u * u;
      const wantX = idleVx + departX[i] * dRemain + sx * amp * dArc + (aimX - nx[i]) * chase;
      const wantY = idleVy + departY[i] * dRemain + sy * amp * dArc + (aimY - ny[i]) * chase;
      let dvx = wantX - vx[i];
      let dvy = wantY - vy[i];
      const dv = Math.hypot(dvx, dvy);
      const cap = 7.5 * step;
      if (dv > cap && cap > 0) {
        const scale = cap / dv;
        dvx *= scale;
        dvy *= scale;
      } else if (cap === 0) {
        dvx = 0;
        dvy = 0;
      }
      vx[i] += dvx;
      vy[i] += dvy;
      nx[i] += vx[i] * step;
      ny[i] += vy[i] * step;
    };

    for (let i = 0; i < count; i += 1) {
      const local = time - delay[i];
      const pull = pullOf(local);
      const uRaw = (time - returnAt[i]) / returnDur[i];
      if (uRaw > 0) {
        const ang1 = time * freq[i] + phase[i];
        const ang2 = time * freq2[i] + phase[i] * 1.6;
        const hx = homeX[i] + Math.sin(ang1) * ampX[i] + followX * shift[i] * lean;
        const hy = homeY[i] + Math.cos(ang2) * ampY[i] + followY * shift[i] * 0.7 * lean;
        const idleVx = Math.cos(ang1) * ampX[i] * freq[i];
        const idleVy = -Math.sin(ang2) * ampY[i] * freq2[i];
        coastHome(i, uRaw, hx, hy, idleVx, idleVy);
        const remain = uRaw >= 1 ? 0 : (1 - uRaw) * (1 - uRaw) * (1 - uRaw);
        placeDraw(i, pull * remain, focusX, focusY);
        continue;
      }
      const ret = smoother((time - returnAt[i]) / returnDur[i]);
      const gather = pull * (1 - ret);
      const g = gain[i];
      const ang1 = time * freq[i] + phase[i];
      const ang2 = time * freq2[i] + phase[i] * 1.6;
      const hx = homeX[i] + Math.sin(ang1) * ampX[i] + followX * shift[i] * lean;
      const hy = homeY[i] + Math.cos(ang2) * ampY[i] + followY * shift[i] * 0.7 * lean;
      const idleVx = Math.cos(ang1) * ampX[i] * freq[i];
      const idleVy = -Math.sin(ang2) * ampY[i] * freq2[i];

      const gx = focusX + ox[i] * rx;
      const gy = focusY + oy[i] * ry;
      let goalX = spawnX[i] + (gx - spawnX[i]) * attract[i];
      let goalY = spawnY[i] + (gy - spawnY[i]) * attract[i];
      if (goalX < 0.03) goalX = 0.03;
      else if (goalX > 0.97) goalX = 0.97;
      if (goalY < 0.03) goalY = 0.03;
      else if (goalY > 0.97) goalY = 0.97;
      const dx = goalX - nx[i];
      const dy = goalY - ny[i];
      const dist = Math.sqrt(dx * dx + dy * dy) + 1e-4;
      const falloff = smoother((dist - 0.05) / 0.14);
      const inv = 1 / dist;
      const strength = gather * 6.4 * g * falloff;
      const swirl = gather * 1.45 * spinAmp[i] * spin[i] * falloff;

      const hdx = hx - nx[i];
      const hdy = hy - ny[i];
      const hdist = Math.sqrt(hdx * hdx + hdy * hdy) + 1e-4;
      const hFall = hdist / (hdist + 0.06);
      const hInv = 1 / hdist;
      const hStrength = ret * 12 * g * hFall;
      const curl = gather + ret * (1 - ret) * 1.6;
      const tt = time * 0.4 + phase[i] * 0.15;
      const n1 = Math.sin(nx[i] * 2.3 + phase[i] + tt);
      const n2 = Math.cos(ny[i] * 2.05 - tt * 0.72);
      const n3 = Math.sin((nx[i] + ny[i]) * 1.5 + tt * 0.24);
      const flow = curl * g * (0.45 + 0.55 * Math.max(falloff, hFall));
      const arc = ret * (1 - ret) * 2.4 * spin[i] * spinAmp[i];
      const ax =
        dx * inv * strength -
        dy * inv * swirl +
        hdx * hInv * hStrength -
        hdy * hInv * arc +
        (n2 * 0.65 + n3 * 0.35) * flow;
      const ay =
        dy * inv * strength +
        dx * inv * swirl +
        hdy * hInv * hStrength +
        hdx * hInv * arc +
        (-n1 * 0.65 + n3 * 0.3) * flow;

      vx[i] += ax * step;
      vy[i] += ay * step;
      const brake = gather > 0.2 && ret < 0.2 ? 1 - falloff : 0;
      const settle = ret > 0.82 ? (1 - hFall) * ret : 0;
      const damp = 5.8 + 6.2 * Math.max(brake, settle);
      const keep = Math.exp(-damp * step);
      const vTargetX = ret * idleVx;
      const vTargetY = ret * idleVy;
      vx[i] = vTargetX + (vx[i] - vTargetX) * keep;
      vy[i] = vTargetY + (vy[i] - vTargetY) * keep;
      const speed = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
      if (speed > 1.05) {
        const limit = 1.05 / speed;
        vx[i] *= limit;
        vy[i] *= limit;
      }
      nx[i] += vx[i] * step;
      ny[i] += vy[i] * step;
      placeDraw(i, gather, focusX, focusY);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let tier = 0; tier < 3; tier += 1) {
      const from = tier === 0 ? 0 : tier === 1 ? farN : midN;
      const to = tier === 0 ? farN : tier === 1 ? midN : count;
      ctx.fillStyle = TIER_COLOR[tier];
      drawRange(from, to);
    }
    ctx.globalAlpha = 1;
  };

  const drawSettled = () => {
    const lean = pointerFine.matches ? 1 : 0;
    for (let i = 0; i < count; i += 1) {
      nx[i] = homeX[i] + followX * shift[i] * lean;
      ny[i] = homeY[i] + followY * shift[i] * 0.7 * lean;
      vx[i] = 0;
      vy[i] = 0;
      placeDraw(i, 0, 0.3, 0.46);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let tier = 0; tier < 3; tier += 1) {
      const from = tier === 0 ? 0 : tier === 1 ? farN : midN;
      const to = tier === 0 ? farN : tier === 1 ? midN : count;
      ctx.fillStyle = TIER_COLOR[tier];
      drawRange(from, to);
    }
    ctx.globalAlpha = 1;
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
    if (running || !onScreen || hidden || reduced) return;
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
  document.documentElement.classList.add('field-live');
  if (reduced) {
    drawSettled();
    return;
  }
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
    fit();
    if (reduced) drawSettled();
    else if (!running) paint(0);
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
}
