type Star = {
  ox: number;
  oy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
  speed: number;
  delay: number;
  bright: boolean;
};

/** Shift star cluster so its bounding box is centered in the canvas. */
function centerStars(stars: Star[], width: number, height: number) {
  if (!stars.length) return;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const s of stars) {
    minX = Math.min(minX, s.ox);
    maxX = Math.max(maxX, s.ox);
    minY = Math.min(minY, s.oy);
    maxY = Math.max(maxY, s.oy);
  }
  const dx = width / 2 - (minX + maxX) / 2;
  const dy = height / 2 - (minY + maxY) / 2;
  for (const s of stars) {
    s.ox += dx;
    s.oy += dy;
    s.x = s.ox;
    s.y = s.oy;
  }
}

/**
 * Dense steel-star letterforms — bold uppercase sample for a masculine portfolio read.
 * On narrow viewports, stack as two lines so the title stays readable.
 */
function buildStars(
  text: string,
  width: number,
  height: number,
  dpr: number,
  sparse = false,
): Star[] {
  const sample = document.createElement('canvas');
  const sw = Math.max(2, Math.floor(width * dpr));
  const sh = Math.max(2, Math.floor(height * dpr));
  sample.width = sw;
  sample.height = sh;
  const ctx = sample.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  const stacked = width < 720;
  const lines = stacked ? ['FRONT-END', 'DEVELOPER'] : [text.toUpperCase()];
  // Keep side padding so F/R stems + glow aren't clipped at canvas edges
  const padX = sw * (stacked ? 0.08 : 0.06);
  const padY = sh * (stacked ? 0.1 : 0.06);
  const maxTextW = sw - padX * 2;
  const maxTextH = sh - padY * 2;
  const lineGap = stacked ? 1.08 : 1;

  let fontPx = stacked
    ? Math.min(sw * 0.22, sh * 0.36)
    : Math.min(sw * 0.3, sh * 0.88);

  const applyFont = (size: number) => {
    ctx.font = `${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
    ctx.letterSpacing = `${size * 0.04}px`;
  };

  applyFont(fontPx);
  let widest = 0;
  for (const line of lines) {
    widest = Math.max(widest, ctx.measureText(line).width);
  }
  if (widest > maxTextW) fontPx *= maxTextW / widest;

  applyFont(fontPx);
  const blockH = fontPx * lineGap * lines.length;
  if (blockH > maxTextH) fontPx *= maxTextH / blockH;

  applyFont(fontPx);
  ctx.clearRect(0, 0, sw, sh);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lineHeight = fontPx * lineGap;
  const startY = sh / 2 - (lineHeight * (lines.length - 1)) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, sw / 2, startY + i * lineHeight);
  });

  const { data } = ctx.getImageData(0, 0, sw, sh);
  // Dense on desktop; sparser sampling on lite / mobile devices
  const step = Math.max(2, Math.round(dpr * (sparse ? 3.4 : 1.65)));
  const stars: Star[] = [];

  for (let y = 0; y < sh; y += step) {
    for (let x = 0; x < sw; x += step) {
      const a = data[(y * sw + x) * 4 + 3];
      if (a < 150) continue;
      const jx = (Math.random() - 0.5) * step * 0.4;
      const jy = (Math.random() - 0.5) * step * 0.4;
      const px = (x + jx) / dpr;
      const py = (y + jy) / dpr;
      const bright = Math.random() > (sparse ? 0.94 : 0.88);
      stars.push({
        ox: px,
        oy: py,
        x: px,
        y: py,
        vx: 0,
        vy: 0,
        r: (bright ? 1.35 : 0.7) + Math.random() * (bright ? 1.1 : 0.95),
        phase: Math.random() * Math.PI * 2,
        speed: bright ? 0.8 + Math.random() * 1.4 : 1.6 + Math.random() * 3.4,
        delay: Math.random() * (sparse ? 0.45 : 0.75),
        bright,
      });
    }
  }

  centerStars(stars, width, height);
  return stars;
}

/** Star-filled hero title — cursor repulsion (stars flee, then return). */
export function initHero() {
  const hero = document.querySelector<HTMLElement>('.hero');
  const content = document.querySelector<HTMLElement>('[data-hero]');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-hero-stars]');
  if (!hero || !content || !canvas) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lite = window.matchMedia('(max-width: 720px), (pointer: coarse)').matches;
  const text = 'Front-End Developer';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let stars: Star[] = [];
  let start = performance.now();
  let readyAt = 0;
  let pointerActive = false;
  let pointerX = 0;
  let pointerY = 0;
  let frozen = false;

  const layout = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 2);
    canvas.style.width = '100%';
    canvas.style.height = '';
    const cssW = Math.max(1, canvas.clientWidth || content.clientWidth);
    const cssH = Math.max(1, canvas.clientHeight);
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = buildStars(text, cssW, cssH, dpr, lite);
    frozen = false;
  };

  /** Stars flee the cursor, then spring back home. */
  const updatePhysics = (t: number) => {
    if (prefersReduced || lite) {
      for (const s of stars) {
        s.x = s.ox;
        s.y = s.oy;
      }
      return;
    }

    const radius = 105;
    const radiusSq = radius * radius;
    const maxDist = 48;

    for (const s of stars) {
      if (pointerActive) {
        let dx = s.x - pointerX;
        let dy = s.y - pointerY;
        let distSq = dx * dx + dy * dy;
        if (distSq < 4) {
          dx = Math.cos(s.phase) * 2;
          dy = Math.sin(s.phase) * 2;
          distSq = 4;
        }
        if (distSq < radiusSq) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / radius) * 3.6;
          s.vx += (dx / dist) * force;
          s.vy += (dy / dist) * force;
        }
      }

      // Soft idle shimmer
      const jx = Math.sin(t * (9 + s.speed) + s.phase) * 0.45;
      const jy = Math.cos(t * (11 + s.speed * 0.8) + s.phase) * 0.4;

      s.vx += (s.ox + jx - s.x) * 0.09;
      s.vy += (s.oy + jy - s.y) * 0.09;
      s.vx *= 0.84;
      s.vy *= 0.84;
      s.x += s.vx;
      s.y += s.vy;

      const hx = s.x - s.ox;
      const hy = s.y - s.oy;
      const hd = Math.hypot(hx, hy);
      if (hd > maxDist) {
        const k = maxDist / hd;
        s.x = s.ox + hx * k;
        s.y = s.oy + hy * k;
        s.vx *= 0.4;
        s.vy *= 0.4;
      }
    }
  };

  const draw = (now: number) => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    const t = (now - start) / 1000;
    const appear =
      prefersReduced || frozen ? 1 : Math.min(1, Math.max(0, (now - readyAt) / 1000));

    if (!lite) updatePhysics(t);

    for (const s of stars) {
      const local = Math.min(1, Math.max(0, (appear - s.delay * 0.5) / 0.4));
      if (local <= 0) continue;

      const twinkle =
        prefersReduced || lite
          ? 0.92
          : s.bright
            ? 0.7 + 0.3 * Math.pow(0.5 + 0.5 * Math.sin(t * s.speed + s.phase), 1.6)
            : 0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(t * s.speed * 1.4 + s.phase), 2.4);

      const boost = pointerActive ? 1.12 : 1;
      const alpha = local * twinkle * boost;
      const r = s.r * (0.8 + twinkle * 0.5) * (pointerActive ? 1.06 : 1);
      const core = Math.max(0.55, r * (s.bright ? 0.55 : 0.42));

      // Glow only on bright anchors — skip expensive gradients on lite
      if (s.bright && !lite) {
        const glowR = r * 4.2;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
        g.addColorStop(0, `rgba(255,255,255,${Math.min(1, 0.98 * alpha)})`);
        g.addColorStop(0.28, `rgba(210,220,232,${0.5 * alpha})`);
        g.addColorStop(0.65, `rgba(150,170,195,${0.18 * alpha})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(210,220,232,${(lite ? 0.3 : 0.22) * alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * (lite ? 1.8 : 2.2), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = `rgba(245,248,255,${Math.min(1, alpha)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, core, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  let raf = 0;
  const loop = (now: number) => {
    draw(now);
    // Mobile: play a short intro, then freeze to a static title
    if (lite && readyAt && now - readyAt > 1400) {
      frozen = true;
      draw(now);
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(loop);
  };

  const boot = () => {
    layout();
    if (prefersReduced) {
      hero.classList.add('is-ready');
      readyAt = performance.now();
      frozen = true;
      draw(performance.now());
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hero.classList.add('is-ready');
        readyAt = performance.now();
        start = readyAt;
        raf = requestAnimationFrame(loop);
      });
    });
  };

  if (document.fonts?.ready) {
    document.fonts.ready.then(boot).catch(boot);
  } else {
    boot();
  }

  const setPointer = (e: PointerEvent, active: boolean) => {
    const rect = canvas.getBoundingClientRect();
    pointerX = e.clientX - rect.left;
    pointerY = e.clientY - rect.top;
    pointerActive = active;
  };

  const finePointer = window.matchMedia('(pointer: fine)').matches;
  if (!lite && finePointer) {
    canvas.addEventListener('pointerenter', (e) => setPointer(e, true));
    canvas.addEventListener('pointermove', (e) => setPointer(e, true));
    canvas.addEventListener('pointerleave', () => {
      pointerActive = false;
    });
  }

  let mx = 0;
  let my = 0;
  let tx = 0;
  let ty = 0;
  let pRaf = 0;

  const tick = () => {
    if (!prefersReduced && finePointer) {
      tx += (mx - tx) * 0.06;
      ty += (my - ty) * 0.06;
      content.style.transform = `translate3d(${tx * 8}px, ${ty * 5}px, 0)`;
    }
    pRaf = requestAnimationFrame(tick);
  };

  if (!lite && finePointer) {
    window.addEventListener(
      'mousemove',
      (e) => {
        mx = (e.clientX / window.innerWidth - 0.5) * 2;
        my = (e.clientY / window.innerHeight - 0.5) * 2;
      },
      { passive: true },
    );
    pRaf = requestAnimationFrame(tick);
  }

  const onScroll = () => {
    const hh = hero.offsetHeight || 1;
    const p = Math.min(Math.max(window.scrollY / (hh * 0.65), 0), 1);
    hero.style.setProperty('--hero-leave', String(p));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (raf) cancelAnimationFrame(raf);
      layout();
      if (prefersReduced || lite) {
        frozen = true;
        draw(performance.now());
        return;
      }
      readyAt = performance.now();
      start = readyAt;
      raf = requestAnimationFrame(loop);
    }, 120);
  });

  void raf;
  void pRaf;
}
