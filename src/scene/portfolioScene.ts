import * as THREE from 'three';

interface SceneOptions {
  canvas: HTMLCanvasElement | null;
  contactSection: HTMLElement | null;
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
) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // Spherical-ish distribution in front of camera
    const r = 20 + Math.random() * spread;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
    pos[i * 3 + 2] = -Math.abs(r * Math.cos(phi)) - 5;
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

  // Per-star twinkle via size modulation
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

export function initPortfolioScene({ canvas, contactSection }: SceneOptions) {
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor('#000000', 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000000');
  scene.fog = new THREE.FogExp2('#000000', 0.008);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.set(0, 0, 8);

  scene.add(new THREE.AmbientLight('#121212', 0.35));
  const key = new THREE.DirectionalLight('#ffffff', 0.2);
  key.position.set(5, 8, 4);
  scene.add(key);

  // Soft white lights only (no navy cast)
  const lightPrimary = new THREE.PointLight('#ffffff', 1.2, 55, 2.0);
  lightPrimary.position.set(-8, 3, -18);
  scene.add(lightPrimary);
  const lightSecondary = new THREE.PointLight('#e8e8e8', 1.0, 55, 2.0);
  lightSecondary.position.set(9, -2, -16);
  scene.add(lightSecondary);
  const lightSoft = new THREE.PointLight('#d0d0d0', 0.85, 45, 2.2);
  lightSoft.position.set(0, 6, -25);
  scene.add(lightSoft);

  const glow = createGlowTexture();

  // Star layers — neutral white / silver
  const starsFar = makeStarField(2400, 90, 0.16, '#a8a8a8', 0.6, glow);
  const starsMid = makeStarField(1100, 55, 0.32, '#d8d8d8', 0.85, glow);
  const starsNear = makeStarField(280, 35, 0.62, '#ffffff', 1, glow);
  scene.add(starsFar, starsMid, starsNear);
  const starLayers = [starsFar, starsMid, starsNear];

  // Bright accent stars
  const brightCount = 100;
  const brightGeo = new THREE.BufferGeometry();
  const bp = new Float32Array(brightCount * 3);
  const brightPhase = new Float32Array(brightCount);
  const brightSpeed = new Float32Array(brightCount);
  const brightBase = new Float32Array(brightCount * 3);
  for (let i = 0; i < brightCount; i++) {
    bp[i * 3] = (Math.random() - 0.5) * 80;
    bp[i * 3 + 1] = (Math.random() - 0.5) * 50;
    bp[i * 3 + 2] = -20 - Math.random() * 60;
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

  // Subtle dust motes drifting past camera
  const dustCount = 200;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  const dustSpeed = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 20;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
    dustPos[i * 3 + 2] = -2 - Math.random() * 30;
    dustSpeed[i] = 1.5 + Math.random() * 4;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: '#ffffff',
      map: glow,
      size: 0.08,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  scene.add(dust);

  // Occasional shooting stars
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

  const trailLen = 28;
  const shootingStars: ShootingStar[] = [];
  for (let i = 0; i < 3; i++) {
    const trail = new Float32Array(trailLen * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(trail, 3));
    const colors = new Float32Array(trailLen * 3);
    for (let j = 0; j < trailLen; j++) {
      const a = j / (trailLen - 1);
      // Head bright white → soft ice-blue fade
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
      // Occasional: every ~4–14s
      nextMeteor = 4 + Math.random() * 10;
      // Rare double streak
      if (Math.random() < 0.18) nextMeteor = 0.35 + Math.random() * 0.5;
    }

    for (const star of shootingStars) {
      if (!star.active) continue;
      star.age += dt;
      const u = star.age / star.duration;
      // Fade in, hold, fade out
      const fade = u < 0.12 ? u / 0.12 : u > 0.7 ? Math.max(0, 1 - (u - 0.7) / 0.3) : 1;

      star.pos.addScaledVector(star.vel, dt);

      // Shift trail backward, write new head
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

  let scrollBoost = 0;
  let lastY = window.scrollY;
  let mx = 0;
  let my = 0;
  let atContact = false;
  let contactBlend = 0;

  function onScroll() {
    const y = window.scrollY;
    scrollBoost = Math.min(Math.abs(y - lastY) * 0.02, 2.5);
    lastY = y;
    if (!contactSection) return;
    const r = contactSection.getBoundingClientRect();
    atContact = r.top < window.innerHeight * 0.55 && r.bottom > 0;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener(
    'mousemove',
    (e) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    },
    { passive: true },
  );

  const timer = new THREE.Timer();
  timer.connect(document);
  let t = 0;
  const dustAttr = dustGeo.getAttribute('position') as THREE.BufferAttribute;

  function animate(timestamp?: number) {
    requestAnimationFrame(animate);
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 0.05);
    t += dt;

    contactBlend += ((atContact ? 1 : 0) - contactBlend) * 0.035;
    const warp = (0.35 + scrollBoost * 2.2) * (1 - contactBlend * 0.55);
    scrollBoost *= 0.9;

    // Dynamic starfield — multi-axis drift, mouse parallax, twinkle
    const parallaxX = mx * 1.8;
    const parallaxY = -my * 1.2;

    starsFar.rotation.z = t * 0.018;
    starsFar.rotation.y = t * 0.006;
    starsFar.position.x = parallaxX * 0.15 + Math.sin(t * 0.11) * 0.35;
    starsFar.position.y = parallaxY * 0.1 + Math.cos(t * 0.09) * 0.25;

    starsMid.rotation.z = -t * 0.032;
    starsMid.rotation.x = Math.sin(t * 0.07) * 0.04;
    starsMid.position.x = parallaxX * 0.35 + Math.sin(t * 0.17 + 1) * 0.55;
    starsMid.position.y = parallaxY * 0.25 + Math.cos(t * 0.14) * 0.4;

    starsNear.rotation.z = t * 0.045;
    starsNear.rotation.y = -t * 0.02;
    starsNear.position.x = parallaxX * 0.7 + Math.sin(t * 0.22) * 0.8;
    starsNear.position.y = parallaxY * 0.55 + Math.cos(t * 0.19 + 2) * 0.6;
    starsNear.position.z = Math.sin(t * 0.12) * 0.9;

    brightStars.rotation.z = t * 0.02;
    brightStars.position.x = parallaxX * 0.5;
    brightStars.position.y = parallaxY * 0.4;

    // Drift / shimmer bright stars individually
    const bArr = brightAttr.array as Float32Array;
    for (let i = 0; i < brightCount; i++) {
      const ph = brightPhase[i];
      const sp = brightSpeed[i];
      bArr[i * 3] = brightBase[i * 3] + Math.sin(t * sp * 0.35 + ph) * 0.55;
      bArr[i * 3 + 1] = brightBase[i * 3 + 1] + Math.cos(t * sp * 0.28 + ph) * 0.4;
      bArr[i * 3 + 2] = brightBase[i * 3 + 2] + Math.sin(t * 0.4 + ph) * 1.2;
    }
    brightAttr.needsUpdate = true;

    // Push twinkle time into shader uniforms + soft layer pulse
    const layerBaseOp = [0.7, 0.9, 1];
    starLayers.forEach((layer, i) => {
      const mat = layer.material as THREE.PointsMaterial;
      const shader = mat.userData.shader as { uniforms: { uTime: { value: number } } } | undefined;
      if (shader) shader.uniforms.uTime.value = t;
      mat.opacity = layerBaseOp[i] * (0.72 + 0.28 * (0.5 + 0.5 * Math.sin(t * 1.1 + i * 1.7)));
    });
    const bShader = brightMat.userData.shader as
      | { uniforms: { uTime: { value: number } } }
      | undefined;
    if (bShader) bShader.uniforms.uTime.value = t;
    brightMat.opacity = 0.65 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.6));
    brightMat.size = 1.05 + Math.sin(t * 2.1) * 0.25;

    // Dust flying toward / past camera (warp feel on scroll)
    const darr = dustAttr.array as Float32Array;
    for (let i = 0; i < dustCount; i++) {
      const iz = i * 3 + 2;
      darr[iz] += dustSpeed[i] * warp * dt * 2.2;
      if (darr[iz] > 2) {
        darr[i * 3] = (Math.random() - 0.5) * 20;
        darr[i * 3 + 1] = (Math.random() - 0.5) * 14;
        darr[iz] = -30 - Math.random() * 10;
      }
    }
    dustAttr.needsUpdate = true;

    // Camera drift through space
    camera.position.x += (mx * 1.4 - camera.position.x) * 0.03;
    camera.position.y += (-my * 0.7 - camera.position.y) * 0.03;
    camera.position.z = 8 - warp * 0.4 - contactBlend * 1.2;
    camera.lookAt(mx * 0.5, -my * 0.3, -20);

    // Soft pulsing lights
    lightPrimary.intensity = 1.05 + Math.sin(t * 1.1) * 0.25;
    lightSecondary.intensity = 0.9 + Math.sin(t * 0.9 + 1) * 0.2;
    lightSoft.intensity = 0.75 + Math.sin(t * 0.75 + 2) * 0.18;

    updateShootingStars(dt);

    renderer.render(scene, camera);
  }
  animate();

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);
}
