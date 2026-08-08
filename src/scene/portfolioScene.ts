import * as THREE from 'three';

interface SceneOptions {
  canvas: HTMLCanvasElement | null;
}

type Atmosphere = {
  fog: number;
  exposure: number;
  camZ: number;
  fov: number;
  farOp: number;
  midOp: number;
  nearOp: number;
  brightOp: number;
  brightSize: number;
  dustOp: number;
  meteorMul: number;
  drift: number;
  parallax: number;
  twinkle: number;
  /** Continuous forward travel through the field (0 = idle cruise). */
  thrust: number;
};

/** Same universe — motion/depth shift per section; star density stays constant. */
const STAR_OP = {
  farOp: 0.52,
  midOp: 0.76,
  nearOp: 0.9,
  brightOp: 0.78,
  brightSize: 1.08,
  dustOp: 0.24,
} as const;

const ATMOSPHERES: Record<string, Atmosphere> = {
  hero: {
    fog: 0.0065,
    exposure: 1.05,
    camZ: 9.4,
    fov: 50,
    ...STAR_OP,
    meteorMul: 1.15,
    drift: 0.85,
    parallax: 1.0,
    twinkle: 0.95,
    thrust: 0.5,
  },
  about: {
    fog: 0.0065,
    exposure: 1.05,
    camZ: 7.9,
    fov: 54,
    ...STAR_OP,
    meteorMul: 1.0,
    drift: 1.0,
    parallax: 1.1,
    twinkle: 1.0,
    thrust: 0.7,
  },
  skills: {
    fog: 0.0065,
    exposure: 1.06,
    camZ: 6.5,
    fov: 58,
    ...STAR_OP,
    meteorMul: 0.55,
    drift: 1.2,
    parallax: 1.2,
    twinkle: 1.1,
    thrust: 1.05,
  },
  projects: {
    fog: 0.0065,
    exposure: 1.06,
    camZ: 5.7,
    fov: 60,
    ...STAR_OP,
    meteorMul: 0.7,
    drift: 1.1,
    parallax: 1.22,
    twinkle: 1.05,
    thrust: 0.9,
  },
  value: {
    fog: 0.0065,
    exposure: 1.05,
    camZ: 5.35,
    fov: 57,
    ...STAR_OP,
    meteorMul: 0.9,
    drift: 0.95,
    parallax: 1.12,
    twinkle: 1.0,
    thrust: 0.7,
  },
  contact: {
    fog: 0.0065,
    exposure: 1.05,
    camZ: 5.2,
    fov: 54,
    ...STAR_OP,
    meteorMul: 1.3,
    drift: 0.75,
    parallax: 0.9,
    twinkle: 0.9,
    thrust: 0.4,
  },
};

const SECTION_ORDER = ['hero', 'about', 'skills', 'projects', 'value', 'contact'] as const;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function blendAtmosphere(weights: Record<string, number>): Atmosphere {
  const out: Atmosphere = {
    fog: 0,
    exposure: 0,
    camZ: 0,
    fov: 0,
    farOp: 0,
    midOp: 0,
    nearOp: 0,
    brightOp: 0,
    brightSize: 0,
    dustOp: 0,
    meteorMul: 0,
    drift: 0,
    parallax: 0,
    twinkle: 0,
    thrust: 0,
  };
  let sum = 0;
  for (const id of SECTION_ORDER) {
    const w = weights[id] ?? 0;
    if (w <= 0) continue;
    const a = ATMOSPHERES[id];
    sum += w;
    (Object.keys(out) as Array<keyof Atmosphere>).forEach((k) => {
      out[k] += a[k] * w;
    });
  }
  if (sum <= 0) return { ...ATMOSPHERES.hero };
  (Object.keys(out) as Array<keyof Atmosphere>).forEach((k) => {
    out[k] /= sum;
  });
  return out;
}

function createGlowTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return new THREE.Texture();
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeStarField(
  count: number,
  spread: number,
  size: number,
  color: string,
  opacity: number,
  glow: THREE.Texture,
  minAxis = 0,
) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let x = 0;
    let y = 0;
    let z = 0;
    for (let tries = 0; tries < 12; tries++) {
      const r = 20 + Math.random() * spread;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      x = r * Math.sin(phi) * Math.cos(theta);
      y = r * Math.sin(phi) * Math.sin(theta) * 0.7;
      z = -Math.abs(r * Math.cos(phi)) - 5;
      if (Math.hypot(x, y) >= minAxis) break;
    }
    // Soft push off the view axis if still too central
    const axis = Math.hypot(x, y);
    if (axis < minAxis && axis > 0.001) {
      const s = minAxis / axis;
      x *= s;
      y *= s;
    }
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
    phase[i] = Math.random() * Math.PI * 2;
    speed[i] = 1.2 + Math.random() * 3.8;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));

  const material = new THREE.PointsMaterial({
    color,
    map: glow,
    size,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    material.userData.shader = shader;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aPhase;
        attribute float aSpeed;
        uniform float uTime;`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        float twinkle = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * aSpeed + aPhase), 2.5);
        gl_PointSize *= twinkle;`,
      );
  };
  material.customProgramCacheKey = () => 'twinkle-stars';

  return new THREE.Points(geo, material);
}

function isLiteDevice() {
  return window.matchMedia('(max-width: 720px), (pointer: coarse)').matches;
}

export function initPortfolioScene({ canvas }: SceneOptions) {
  if (!canvas) return;

  const lite = isLiteDevice();
  const maxDpr = lite ? 1.25 : 2;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor('#000000', 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000000');
  scene.fog = new THREE.FogExp2('#000000', 0.008);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.set(0, 0, 9.4);

  scene.add(new THREE.AmbientLight('#121212', lite ? 0.55 : 0.35));
  const key = new THREE.DirectionalLight('#ffffff', lite ? 0.28 : 0.2);
  key.position.set(5, 8, 4);
  scene.add(key);

  const lightPrimary = new THREE.PointLight('#ffffff', 1.2, 55, 2.0);
  lightPrimary.position.set(-8, 3, -18);
  scene.add(lightPrimary);
  const lightSecondary = new THREE.PointLight('#e8e8e8', 1.0, 55, 2.0);
  lightSecondary.position.set(9, -2, -16);
  if (!lite) scene.add(lightSecondary);
  const lightSoft = new THREE.PointLight('#d0d0d0', 0.85, 45, 2.2);
  lightSoft.position.set(0, 6, -25);
  if (!lite) scene.add(lightSoft);

  const glow = createGlowTexture();

  const starsFar = makeStarField(lite ? 800 : 2400, 90, 0.15, '#a8a8a8', 0.5, glow, 8);
  const starsMid = makeStarField(lite ? 260 : 780, 55, 0.28, '#d8d8d8', 0.72, glow, 12);
  const starsNear = makeStarField(lite ? 70 : 170, 35, 0.52, '#ffffff', 0.88, glow, 16);
  scene.add(starsFar, starsMid, starsNear);
  const starLayers = [starsFar, starsMid, starsNear];

  const brightCount = lite ? 22 : 60;
  const brightGeo = new THREE.BufferGeometry();
  const bp = new Float32Array(brightCount * 3);
  const brightPhase = new Float32Array(brightCount);
  const brightSpeed = new Float32Array(brightCount);
  const brightBase = new Float32Array(brightCount * 3);
  for (let i = 0; i < brightCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 14 + Math.random() * 32;
    bp[i * 3] = Math.cos(ang) * rad;
    bp[i * 3 + 1] = Math.sin(ang) * rad * 0.65;
    bp[i * 3 + 2] = -22 - Math.random() * 55;
    brightBase[i * 3] = bp[i * 3];
    brightBase[i * 3 + 1] = bp[i * 3 + 1];
    brightBase[i * 3 + 2] = bp[i * 3 + 2];
    brightPhase[i] = Math.random() * Math.PI * 2;
    brightSpeed[i] = 2 + Math.random() * 5;
  }
  brightGeo.setAttribute('position', new THREE.BufferAttribute(bp, 3));
  brightGeo.setAttribute('aPhase', new THREE.BufferAttribute(brightPhase, 1));
  brightGeo.setAttribute('aSpeed', new THREE.BufferAttribute(brightSpeed, 1));
  const brightMat = new THREE.PointsMaterial({
    color: '#ffffff',
    map: glow,
    size: 1.25,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  brightMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    brightMat.userData.shader = shader;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aPhase;
        attribute float aSpeed;
        uniform float uTime;`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        float twinkle = 0.2 + 0.8 * pow(0.5 + 0.5 * sin(uTime * aSpeed + aPhase), 3.0);
        gl_PointSize *= twinkle;`,
      );
  };
  brightMat.customProgramCacheKey = () => 'twinkle-bright';
  const brightStars = new THREE.Points(brightGeo, brightMat);
  scene.add(brightStars);
  const brightAttr = brightGeo.getAttribute('position') as THREE.BufferAttribute;

  const dustCount = lite ? 36 : 120;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  const dustSpeed = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 4.5 + Math.random() * 10;
    dustPos[i * 3] = Math.cos(ang) * rad;
    dustPos[i * 3 + 1] = Math.sin(ang) * rad * 0.75;
    dustPos[i * 3 + 2] = -2 - Math.random() * 40;
    dustSpeed[i] = 2 + Math.random() * 6;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: '#ffffff',
    map: glow,
    size: 0.08,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // Sparse streaks — subtle speed cue only
  const streakCount = lite ? 0 : 24;
  const streakGeo = new THREE.BufferGeometry();
  const streakPos = new Float32Array(streakCount * 3);
  const streakSpeed = new Float32Array(streakCount);
  for (let i = 0; i < streakCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 5.5 + Math.random() * 9;
    streakPos[i * 3] = Math.cos(ang) * rad;
    streakPos[i * 3 + 1] = Math.sin(ang) * rad * 0.7;
    streakPos[i * 3 + 2] = -4 - Math.random() * 36;
    streakSpeed[i] = 8 + Math.random() * 14;
  }
  streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
  const streakMat = new THREE.PointsMaterial({
    color: '#e8eef8',
    map: glow,
    size: 0.22,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const streaks = new THREE.Points(streakGeo, streakMat);
  if (streakCount > 0) scene.add(streaks);

  type ShootingStar = {
    line: THREE.Line;
    head: THREE.Points;
    active: boolean;
    age: number;
    duration: number;
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    trail: Float32Array;
  };

  const trailLen = lite ? 12 : 28;
  const shootingStars: ShootingStar[] = [];
  const shootingBudget = lite ? 1 : 3;
  for (let i = 0; i < shootingBudget; i++) {
    const trail = new Float32Array(trailLen * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(trail, 3));
    const colors = new Float32Array(trailLen * 3);
    for (let j = 0; j < trailLen; j++) {
      const a = j / (trailLen - 1);
      colors[j * 3] = 0.7 + a * 0.3;
      colors[j * 3 + 1] = 0.8 + a * 0.2;
      colors[j * 3 + 2] = 0.95 + a * 0.05;
    }
    lineGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const line = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    line.visible = false;
    scene.add(line);

    const headGeo = new THREE.BufferGeometry();
    headGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
    const head = new THREE.Points(
      headGeo,
      new THREE.PointsMaterial({
        color: '#ffffff',
        map: glow,
        size: 1.4,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    );
    head.visible = false;
    scene.add(head);

    shootingStars.push({
      line,
      head,
      active: false,
      age: 0,
      duration: 1,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      trail,
    });
  }

  let nextMeteor = 2.5 + Math.random() * 3;
  let meteorMul = 1;

  function spawnShootingStar(star: ShootingStar) {
    const fromLeft = Math.random() > 0.45;
    star.pos.set(
      fromLeft ? -18 - Math.random() * 10 : 18 + Math.random() * 10,
      6 + Math.random() * 14,
      -22 - Math.random() * 28,
    );
    star.vel.set(
      (fromLeft ? 1 : -1) * (14 + Math.random() * 10),
      -(6 + Math.random() * 7),
      2 + Math.random() * 4,
    );
    star.age = 0;
    star.duration = 0.85 + Math.random() * 0.55;
    star.active = true;
    star.line.visible = true;
    star.head.visible = true;
    for (let j = 0; j < trailLen; j++) {
      star.trail[j * 3] = star.pos.x;
      star.trail[j * 3 + 1] = star.pos.y;
      star.trail[j * 3 + 2] = star.pos.z;
    }
    (star.line.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  function updateShootingStars(dt: number) {
    nextMeteor -= dt;
    if (nextMeteor <= 0) {
      const idle = shootingStars.find((s) => !s.active);
      if (idle) spawnShootingStar(idle);
      nextMeteor = (lite ? 10 : 4) + Math.random() * (lite ? 14 : 10);
      nextMeteor *= meteorMul;
      if (!lite && Math.random() < 0.18 / Math.max(meteorMul, 0.4)) {
        nextMeteor = 0.35 + Math.random() * 0.5;
      }
    }

    for (const star of shootingStars) {
      if (!star.active) continue;
      star.age += dt;
      const u = star.age / star.duration;
      const fade = u < 0.12 ? u / 0.12 : u > 0.7 ? Math.max(0, 1 - (u - 0.7) / 0.3) : 1;

      star.pos.addScaledVector(star.vel, dt);

      for (let j = 0; j < trailLen - 1; j++) {
        star.trail[j * 3] = star.trail[(j + 1) * 3];
        star.trail[j * 3 + 1] = star.trail[(j + 1) * 3 + 1];
        star.trail[j * 3 + 2] = star.trail[(j + 1) * 3 + 2];
      }
      const tip = (trailLen - 1) * 3;
      star.trail[tip] = star.pos.x;
      star.trail[tip + 1] = star.pos.y;
      star.trail[tip + 2] = star.pos.z;
      (star.line.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;

      const headPos = star.head.geometry.getAttribute('position') as THREE.BufferAttribute;
      headPos.setXYZ(0, star.pos.x, star.pos.y, star.pos.z);
      headPos.needsUpdate = true;

      (star.line.material as THREE.LineBasicMaterial).opacity = 0.85 * fade;
      (star.head.material as THREE.PointsMaterial).opacity = fade;
      (star.head.material as THREE.PointsMaterial).size = 1.1 + fade * 0.6;

      if (u >= 1) {
        star.active = false;
        star.line.visible = false;
        star.head.visible = false;
      }
    }
  }

  const sectionEls = SECTION_ORDER.map((id) => ({
    id,
    el: document.getElementById(id),
  })).filter((s): s is { id: (typeof SECTION_ORDER)[number]; el: HTMLElement } => !!s.el);

  const sectionWeights: Record<string, number> = Object.fromEntries(
    SECTION_ORDER.map((id) => [id, id === 'hero' ? 1 : 0]),
  );
  let targetAtmo = { ...ATMOSPHERES.hero };
  let atmo = { ...ATMOSPHERES.hero };

  function measureSections() {
    const vh = window.innerHeight || 1;
    let bestId: (typeof SECTION_ORDER)[number] = 'hero';
    let bestScore = -1;
    for (const { id, el } of sectionEls) {
      const r = el.getBoundingClientRect();
      const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      const ratio = visible / Math.min(r.height || 1, vh);
      const center = (r.top + r.bottom) / 2;
      const centerBias = 1 - Math.min(1, Math.abs(center - vh * 0.42) / (vh * 0.55));
      const score = ratio * 0.65 + centerBias * 0.35;
      sectionWeights[id] = Math.max(0, score);
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }
    for (const id of SECTION_ORDER) {
      sectionWeights[id] =
        id === bestId ? Math.max(sectionWeights[id], 0.55) : sectionWeights[id] * 0.45;
    }
    targetAtmo = blendAtmosphere(sectionWeights);
  }

  let scrollBoost = 0;
  let scrollImpulse = 0;
  let lastY = window.scrollY;
  let mx = 0;
  let my = 0;
  let smx = 0;
  let smy = 0;
  let travel = 0;
  let speedSmoothed = ATMOSPHERES.hero.thrust;
  let surgeSmoothed = 0;
  let fovSmoothed = ATMOSPHERES.hero.fov;

  function onScroll() {
    const y = window.scrollY;
    const dy = Math.abs(y - lastY);
    // Soft impulse — animate loop blends this in over time
    scrollImpulse = Math.min(scrollImpulse + dy * 0.016, 2.0);
    lastY = y;
    measureSections();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  if (!lite) {
    window.addEventListener(
      'mousemove',
      (e) => {
        mx = (e.clientX / window.innerWidth - 0.5) * 2;
        my = (e.clientY / window.innerHeight - 0.5) * 2;
      },
      { passive: true },
    );
  }
  measureSections();

  const timer = new THREE.Timer();
  timer.connect(document);
  let t = 0;
  let frame = 0;
  let lastFrameMs = 0;
  const minFrameMs = lite ? 1000 / 30 : 0;
  const dustAttr = dustGeo.getAttribute('position') as THREE.BufferAttribute;
  const streakAttr = streakGeo.getAttribute('position') as THREE.BufferAttribute;

  function animate(timestamp?: number) {
    requestAnimationFrame(animate);
    if (document.hidden) return;
    const now = timestamp ?? performance.now();
    if (lite && now - lastFrameMs < minFrameMs) return;
    lastFrameMs = now;
    frame += 1;

    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 0.05);
    t += dt;

    const ease = 1 - Math.exp(-dt * 1.9);
    (Object.keys(atmo) as Array<keyof Atmosphere>).forEach((k) => {
      atmo[k] = lerp(atmo[k], targetAtmo[k], ease);
    });
    meteorMul = atmo.meteorMul;

    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.density = atmo.fog;
    }
    renderer.toneMappingExposure = atmo.exposure;

    // Smooth scroll energy
    scrollBoost = lerp(scrollBoost, scrollImpulse, 1 - Math.exp(-dt * 5));
    scrollImpulse *= Math.exp(-dt * 3.8);
    scrollBoost *= Math.exp(-dt * 1.9);

    const speedTarget = atmo.thrust + scrollBoost * 0.7;
    speedSmoothed = lerp(speedSmoothed, speedTarget, 1 - Math.exp(-dt * 2.4));
    const speed = speedSmoothed;
    const warp = (0.5 + speed * 0.95) * (0.8 + atmo.drift * 0.35);
    travel += warp * dt * 11;

    smx = lerp(smx, mx, 1 - Math.exp(-dt * 4));
    smy = lerp(smy, my, 1 - Math.exp(-dt * 4));

    dustMat.opacity = atmo.dustOp * (1.25 + Math.min(speed, 1.5) * 0.22);
    if (streakCount > 0) {
      streakMat.opacity = Math.min(0.42, 0.1 + speed * 0.16);
      streakMat.size = 0.14 + speed * 0.07;
    }

    const parallaxX = smx * 1.5 * atmo.parallax;
    const parallaxY = -smy * 1.0 * atmo.parallax;
    const drift = atmo.drift;
    const rush = 0.65 + speed * 0.65;

    // Hemisphere faces -Z only — never accumulate pitch or the sky empties to black.
    // Forward feel = continuous Z-roll + bounded X sway + dust rushing at camera.
    const roll = travel * 0.00085;
    const pitch = Math.sin(travel * 0.022) * 0.22 * rush + Math.sin(t * 0.09) * 0.04;
    const yaw = Math.sin(travel * 0.014) * 0.1 * rush;
    const breath = Math.sin(travel * 0.014) * 0.45 + Math.sin(t * 0.07) * 0.15;
    const swayX = Math.sin(t * 0.06) * 0.35 * drift;
    const swayY = Math.cos(t * 0.05) * 0.28 * drift;
    const approach = 1 + speed * 0.08;

    starsFar.rotation.z = t * 0.01 * drift + roll * 0.45;
    starsFar.rotation.y = t * 0.004 * drift + yaw * 0.35;
    starsFar.rotation.x = pitch * 0.45;
    starsFar.position.x = parallaxX * 0.1 + swayX * 0.2;
    starsFar.position.y = parallaxY * 0.07 + swayY * 0.15;
    starsFar.position.z = breath * 0.25;
    starsFar.scale.setScalar(1 + speed * 0.015 + breath * 0.012);

    starsMid.rotation.z = -t * 0.016 * drift - roll * 0.95;
    starsMid.rotation.y = yaw * 0.65 + Math.sin(t * 0.04) * 0.01 * drift;
    starsMid.rotation.x = pitch * 0.75;
    starsMid.position.x = parallaxX * 0.28 + swayX * 0.35;
    starsMid.position.y = parallaxY * 0.18 + swayY * 0.28;
    starsMid.position.z = breath * 0.55;
    starsMid.scale.setScalar((1 + speed * 0.04 + breath * 0.03) * (0.98 + approach * 0.02));

    starsNear.rotation.z = t * 0.022 * drift + roll * 1.35;
    starsNear.rotation.y = -t * 0.01 * drift + yaw;
    starsNear.rotation.x = pitch;
    starsNear.position.x = parallaxX * 0.5 + swayX * 0.55;
    starsNear.position.y = parallaxY * 0.38 + swayY * 0.42;
    starsNear.position.z = breath * 0.95;
    starsNear.scale.setScalar((1 + speed * 0.08 + breath * 0.05) * (0.96 + approach * 0.05));

    brightStars.rotation.z = t * 0.014 * drift + roll * 0.8;
    brightStars.rotation.y = yaw * 0.8;
    brightStars.rotation.x = pitch * 0.85;
    brightStars.position.x = parallaxX * 0.38 + swayX * 0.4;
    brightStars.position.y = parallaxY * 0.28 + swayY * 0.32;
    brightStars.position.z = breath * 0.7;
    brightStars.scale.setScalar(1 + speed * 0.055 + breath * 0.035);

    // Bright-star CPU path is expensive — skip every other frame on lite devices
    if (!lite || frame % 2 === 0) {
      const bArr = brightAttr.array as Float32Array;
      for (let i = 0; i < brightCount; i++) {
        const ph = brightPhase[i];
        const sp = brightSpeed[i];
        bArr[i * 3] = brightBase[i * 3] + Math.sin(t * sp * 0.15 + ph) * 0.28 * drift;
        bArr[i * 3 + 1] = brightBase[i * 3 + 1] + Math.cos(t * sp * 0.12 + ph) * 0.22 * drift;
        bArr[i * 3 + 2] =
          brightBase[i * 3 + 2] +
          Math.sin(travel * 0.035 + ph) * 2.2 * rush +
          Math.sin(t * 0.16 + ph) * 0.4 * drift;
      }
      brightAttr.needsUpdate = true;
    }

    const layerTargetOp = [atmo.farOp, atmo.midOp, atmo.nearOp];
    starLayers.forEach((layer, i) => {
      const mat = layer.material as THREE.PointsMaterial;
      const shader = mat.userData.shader as { uniforms: { uTime: { value: number } } } | undefined;
      if (shader) shader.uniforms.uTime.value = t * atmo.twinkle;
      const pulse =
        0.78 + 0.22 * (0.5 + 0.5 * Math.sin(t * 0.48 * atmo.twinkle + i * 1.7));
      mat.opacity = layerTargetOp[i] * pulse;
    });
    const bShader = brightMat.userData.shader as
      | { uniforms: { uTime: { value: number } } }
      | undefined;
    if (bShader) bShader.uniforms.uTime.value = t * atmo.twinkle;
    brightMat.opacity =
      atmo.brightOp * (0.7 + 0.3 * (0.5 + 0.5 * Math.sin(t * 0.6 * atmo.twinkle)));
    brightMat.size = atmo.brightSize + Math.sin(t * 0.85) * 0.16 + speed * 0.05;

    // Strong toward-camera flow + outer flare
    const darr = dustAttr.array as Float32Array;
    const dustRush = warp * dt * (3.4 + speed * 2.4);
    for (let i = 0; i < dustCount; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;
      darr[iz] += dustSpeed[i] * dustRush;
      const nearness = Math.max(0, Math.min(1, (darr[iz] + 38) / 42));
      const flare = 1 + dt * nearness * (0.7 + speed * 0.45);
      darr[ix] *= flare;
      darr[iy] *= flare;
      if (darr[iz] > 3) {
        const ang = Math.random() * Math.PI * 2;
        const rad = 2.4 + Math.random() * 5.5;
        darr[ix] = Math.cos(ang) * rad;
        darr[iy] = Math.sin(ang) * rad * 0.75;
        darr[iz] = -42 - Math.random() * 14;
      }
    }
    dustAttr.needsUpdate = true;

    if (streakCount > 0) {
      const sarr = streakAttr.array as Float32Array;
      const streakRush = warp * dt * (4.5 + speed * 3.2);
      for (let i = 0; i < streakCount; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;
        sarr[iz] += streakSpeed[i] * streakRush * 0.07;
        const nearness = Math.max(0, Math.min(1, (sarr[iz] + 36) / 40));
        const flare = 1 + dt * nearness * (1.0 + speed * 0.55);
        sarr[ix] *= flare;
        sarr[iy] *= flare;
        if (sarr[iz] > 4) {
          const ang = Math.random() * Math.PI * 2;
          const rad = 3.2 + Math.random() * 6;
          sarr[ix] = Math.cos(ang) * rad;
          sarr[iy] = Math.sin(ang) * rad * 0.7;
          sarr[iz] = -40 - Math.random() * 16;
        }
      }
      streakAttr.needsUpdate = true;
    }

    const targetFov = atmo.fov + scrollBoost * 1.8 + speed * 2.4;
    fovSmoothed = lerp(fovSmoothed, targetFov, 1 - Math.exp(-dt * 2.6));
    camera.fov = fovSmoothed;
    camera.updateProjectionMatrix();

    const surgeTarget = warp * 0.55 + scrollBoost * 0.35 + speed * 0.12;
    surgeSmoothed = lerp(surgeSmoothed, surgeTarget, 1 - Math.exp(-dt * 2.8));
    const camX = smx * 1.2 * atmo.parallax + Math.sin(t * 0.12) * 0.06 * drift;
    const camY = -smy * 0.55 * atmo.parallax + Math.cos(t * 0.1) * 0.04 * drift;
    camera.position.x += (camX - camera.position.x) * (1 - Math.exp(-dt * 3.2));
    camera.position.y += (camY - camera.position.y) * (1 - Math.exp(-dt * 3.2));
    camera.position.z += (atmo.camZ - surgeSmoothed - camera.position.z) * (1 - Math.exp(-dt * 2.8));
    camera.lookAt(smx * 0.3 * atmo.parallax, -smy * 0.18 * atmo.parallax, -28 - speed * 4);

    lightPrimary.intensity = 1.05 + Math.sin(t * 0.55) * 0.35 + speed * 0.06;
    if (!lite) {
      lightSecondary.intensity = 0.9 + Math.sin(t * 0.42 + 1) * 0.28;
      lightSoft.intensity = 0.75 + Math.sin(t * 0.35 + 2) * 0.22;
    }

    updateShootingStars(dt);

    renderer.render(scene, camera);
  }
  animate();

  function onResize() {
    const nextLite = isLiteDevice();
    const nextDpr = Math.min(window.devicePixelRatio || 1, nextLite ? 1.25 : 2);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(nextDpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    measureSections();
  }
  window.addEventListener('resize', onResize);
}
