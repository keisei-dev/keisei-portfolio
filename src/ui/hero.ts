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

/** Sample text pixels into twinkling star particles for the hero title. */
function buildStars(text: string, width: number, height: number, dpr: number): Star[] {
  const sample = document.createElement('canvas');
  const sw = Math.max(2, Math.floor(width * dpr));
  const sh = Math.max(2, Math.floor(height * dpr));
  sample.width = sw;
  sample.height = sh;
  const ctx = sample.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  let fontPx = Math.min(sw * 0.145, sh * 0.7);
  ctx.font = `600 ${fontPx}px "Space Grotesk", system-ui, sans-serif`;
  const maxTextW = sw * 0.94;
  const measured = ctx.measureText(text).width;
  if (measured > maxTextW) fontPx *= maxTextW / measured;

  ctx.clearRect(0, 0, sw, sh);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${fontPx}px "Space Grotesk", system-ui, sans-serif`;
  ctx.fillText(text, sw / 2, sh / 2);

  const { data } = ctx.getImageData(0, 0, sw, sh);
  const step = Math.max(2, Math.round(dpr * 2.2));
  const stars: Star[] = [];

  for (let y = 0; y < sh; y += step) {
    for (let x = 0; x < sw; x += step) {
      const a = data[(y * sw + x) * 4 + 3];
      if (a < 140) continue;
      const jx = (Math.random() - 0.5) * step * 0.55;
      const jy = (Math.random() - 0.5) * step * 0.55;
      const px = (x + jx) / dpr;
      const py = (y + jy) / dpr;
      stars.push({
        ox: px,
        oy: py,
        x: px,
        y: py,
        vx: 0,
        vy: 0,
        r: (0.55 + Math.random() * 1.35) * (a / 255),
        phase: Math.random() * Math.PI * 2,
        speed: 1.4 + Math.random() * 3.2,
        delay: Math.random() * 0.9,
      });
    }
  }

  centerStars(stars, width, height);
  return stars;
}

/** Dynamic hero: star-title with cursor repulsion, entrance, parallax. */
export function initHero() {
  const hero = document.querySelector<HTMLElement>('.hero');
  const content = document.querySelector<HTMLElement>('[data-hero]');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-hero-stars]');
  if (!hero || !content || !canvas) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const text = 'Full-Stack Developer';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let stars: Star[] = [];
  let start = performance.now();
  let readyAt = 0;

  // Cursor scatter field — particles burst away like elementary particles
  let pointerX = 0;
  let pointerY = 0;
  let pointerActive = false;

  const layout = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = '100%';
    canvas.style.height = '';
    const cssW = Math.max(1, canvas.clientWidth || content.clientWidth);
    const cssH = Math.max(1, canvas.clientHeight);
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = buildStars(text, cssW, cssH, dpr);
  };

  /** Sharp Coulomb-like repulsion: particles fly apart from the cursor. */
  const updatePhysics = () => {
    if (prefersReduced) return;

    const radius = 95;
    const radiusSq = radius * radius;
    const maxDist = 55;

    for (const s of stars) {
      if (pointerActive) {
        let dx = s.x - pointerX;
        let dy = s.y - pointerY;
        let distSq = dx * dx + dy * dy;

        // Avoid singularity — jitter if sitting on the cursor
        if (distSq < 4) {
          const a = s.phase;
          dx = Math.cos(a) * 2;
          dy = Math.sin(a) * 2;
          distSq = 4;
        }

        if (distSq < radiusSq) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          // Inverse-square kick: close particles explode outward hard
          const strength = (1 / (dist * 0.08 + 0.35)) * 2.8;
          // Tiny random scatter so paths feel particle-like
          const jitter = (s.phase % 1) * 0.35 - 0.175;
          s.vx += nx * strength + -ny * jitter;
          s.vy += ny * strength + nx * jitter;
        }
      }

      // Weak restore — stay scattered while hovering, snap back when leaving
      const restore = pointerActive ? 0.012 : 0.07;
      const drag = pointerActive ? 0.92 : 0.86;
      s.vx += (s.ox - s.x) * restore;
      s.vy += (s.oy - s.y) * restore;
      s.vx *= drag;
      s.vy *= drag;

      s.x += s.vx;
      s.y += s.vy;

      const hx = s.x - s.ox;
      const hy = s.y - s.oy;
      const hd = Math.hypot(hx, hy);
      if (hd > maxDist) {
        const k = maxDist / hd;
        s.x = s.ox + hx * k;
        s.y = s.oy + hy * k;
        s.vx *= 0.35;
        s.vy *= 0.35;
      }
    }
  };

  const draw = (now: number) => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    const t = (now - start) / 1000;
    const appear = prefersReduced ? 1 : Math.min(1, Math.max(0, (now - readyAt) / 1100));

    updatePhysics();

    for (const s of stars) {
      const local = Math.min(1, Math.max(0, (appear - s.delay * 0.55) / 0.45));
      if (local <= 0) continue;

      const twinkle = prefersReduced
        ? 0.85
        : 0.4 + 0.6 * Math.pow(0.5 + 0.5 * Math.sin(t * s.speed + s.phase), 2.4);

      const displace = Math.hypot(s.x - s.ox, s.y - s.oy);
      const scatter = Math.min(1, displace / 22);
      const alpha = local * twinkle * (1 + scatter * 0.25);
      const r = s.r * (0.7 + twinkle * 0.5) * (1 + scatter * 0.2);
      const glowR = r * (2.8 + scatter * 1.6);

      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
      g.addColorStop(0, `rgba(255,255,255,${Math.min(1, 0.95 * alpha)})`);
      g.addColorStop(0.3, `rgba(210,225,255,${0.38 * alpha})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, alpha)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(0.35, r * 0.42), 0, Math.PI * 2);
      ctx.fill();
    }
  };

  let raf = 0;
  const loop = (now: number) => {
    draw(now);
    raf = requestAnimationFrame(loop);
  };

  const boot = () => {
    layout();
    if (prefersReduced) {
      hero.classList.add('is-ready');
      readyAt = performance.now();
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

  canvas.addEventListener('pointerenter', (e) => setPointer(e, true));
  canvas.addEventListener('pointermove', (e) => setPointer(e, true));
  canvas.addEventListener('pointerleave', () => {
    pointerActive = false;
  });

  // Light mouse parallax on content
  let mx = 0;
  let my = 0;
  let tx = 0;
  let ty = 0;
  let pRaf = 0;

  const tick = () => {
    if (!prefersReduced) {
      tx += (mx - tx) * 0.06;
      ty += (my - ty) * 0.06;
      content.style.transform = `translate3d(${tx * 14}px, ${ty * 10}px, 0)`;
    }
    pRaf = requestAnimationFrame(tick);
  };

  window.addEventListener(
    'mousemove',
    (e) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    },
    { passive: true },
  );
  pRaf = requestAnimationFrame(tick);

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
      layout();
      if (prefersReduced) draw(performance.now());
    }, 120);
  });

  void raf;
  void pRaf;
}
