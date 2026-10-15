import * as THREE from 'three';
import { canvasTexture, rng, std, glow, mesh } from '../core/util.js';

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;

const skyFragment = /* glsl */ `
  varying vec3 vDir;
  uniform float uTime;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 horizon = vec3(1.0, 0.86, 0.92);
    vec3 mid = vec3(0.80, 0.74, 1.0);
    vec3 top = vec3(0.48, 0.58, 1.0);
    vec3 col = mix(horizon, mid, smoothstep(-0.1, 0.35, h));
    col = mix(col, top, smoothstep(0.35, 0.95, h));
    float n = fbm(d * 2.5 + vec3(uTime * 0.01, 0.0, 0.0));
    float n2 = fbm(d * 4.0 + vec3(3.1, uTime * 0.008, 1.7));
    col += vec3(1.0, 0.55, 0.85) * smoothstep(0.55, 0.85, n) * 0.25;
    col += vec3(0.45, 0.95, 1.0) * smoothstep(0.6, 0.9, n2) * 0.18;
    vec3 sp = d * 220.0;
    float s = hash(floor(sp));
    float tw = 0.6 + 0.4 * sin(uTime * 2.0 + s * 50.0);
    float star = step(0.9965, s) * tw * smoothstep(0.0, 0.3, h + 0.1);
    vec3 f = fract(sp) - 0.5;
    star *= smoothstep(0.5, 0.1, length(f));
    col = mix(col, vec3(1.0, 1.0, 0.92), star);
    float sun = max(0.0, dot(d, normalize(vec3(0.5, 0.6, 0.3))));
    col += vec3(1.0, 0.92, 0.75) * pow(sun, 12.0) * 0.5;
    gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
  }
`;

function planetTexture(stops, bands = 14, seed = 3) {
  const r = rng(seed);
  return canvasTexture(512, 256, (ctx) => {
    for (let y = 0; y < 256; y += 2) {
      const t = y / 256;
      const i = Math.floor(t * bands + Math.sin(t * 30) * 0.5);
      ctx.fillStyle = stops[((i % stops.length) + stops.length) % stops.length];
      ctx.fillRect(0, y, 512, 2);
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.08})`;
      ctx.beginPath();
      ctx.ellipse(r() * 512, r() * 256, 20 + r() * 80, 2 + r() * 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,120,140,0.6)';
    ctx.beginPath();
    ctx.ellipse(330, 160, 30, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function ringTexture() {
  return canvasTexture(512, 16, (ctx) => {
    for (let x = 0; x < 512; x++) {
      const t = x / 512;
      const a = (0.3 + 0.7 * Math.abs(Math.sin(t * 40))) * Math.sin(t * Math.PI);
      ctx.fillStyle = `rgba(${255 - t * 40},${220 - t * 60},${255},${a})`;
      ctx.fillRect(x, 0, 1, 16);
    }
  });
}

function spaceWhale() {
  const g = new THREE.Group();
  const skin = std(0x8fb8ff, { roughness: 0.5 });
  const belly = std(0xe8f1ff, { roughness: 0.5 });
  g.add(mesh(new THREE.SphereGeometry(4, 32, 24), skin, { s: [1, 0.8, 2.0], shadow: false }));
  g.add(mesh(new THREE.SphereGeometry(3.6, 32, 24), belly, { y: -0.9, z: 0.4, s: [0.95, 0.6, 1.85], shadow: false }));
  const tail = new THREE.Group();
  tail.add(mesh(new THREE.ConeGeometry(1.5, 5, 16), skin, { z: -2, rx: -Math.PI / 2, shadow: false }));
  for (const s of [-1, 1]) tail.add(mesh(new THREE.SphereGeometry(1.6, 16, 12), skin, { x: s * 1.8, z: -4.5, s: [1.6, 0.25, 0.9], shadow: false }));
  tail.position.z = -7;
  g.add(tail);
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.SphereGeometry(1.4, 16, 12), skin, { x: s * 4, y: -1, z: 1.5, s: [1.8, 0.25, 0.9], rz: s * -0.3, shadow: false }));
    g.add(mesh(new THREE.SphereGeometry(0.45, 16, 12), std(0x1b2048, { roughness: 0.1 }), { x: s * 2.9, y: 0.6, z: 5.5, shadow: false }));
    g.add(mesh(new THREE.SphereGeometry(0.15, 8, 6), std(0xffffff), { x: s * 3.05, y: 0.8, z: 5.85, shadow: false }));
    g.add(mesh(new THREE.SphereGeometry(0.4, 12, 8), std(0xffa6c9), { x: s * 3.0, y: -0.3, z: 6.0, s: [1, 0.6, 0.3], shadow: false }));
  }
  for (let i = 0; i < 6; i++) g.add(mesh(new THREE.SphereGeometry(0.35, 12, 8), glow(0xfff27a, 2), { x: (i % 2 ? 1 : -1) * 1.2, y: 2.7, z: 3 - i * 1.6, shadow: false }));
  return { group: g, tail };
}

export function createSky(scene) {
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
    uniforms: { uTime: { value: 0 } },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 64, 32), skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  scene.add(sky);

  const far = new THREE.Group();
  scene.add(far);

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(70, 64, 32),
    new THREE.MeshStandardMaterial({ map: planetTexture(['#ffc2d9', '#ffd9b8', '#f4b8ff', '#ffe9f2', '#d9b8ff'], 16, 5), roughness: 0.8, fog: false }),
  );
  planet.position.set(-260, 170, -420);
  planet.rotation.z = 0.35;
  far.add(planet);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(95, 150, 128, 1),
    new THREE.MeshBasicMaterial({ map: ringTexture(), transparent: true, side: THREE.DoubleSide, fog: false, depthWrite: false }),
  );
  const ringUv = ring.geometry.attributes.uv;
  const ringPos = ring.geometry.attributes.position;
  for (let i = 0; i < ringUv.count; i++) {
    const r = Math.hypot(ringPos.getX(i), ringPos.getY(i));
    ringUv.setXY(i, (r - 95) / 55, 0.5);
  }
  ring.position.copy(planet.position);
  ring.rotation.set(-Math.PI / 2 + 0.35, 0.2, 0.35);
  far.add(ring);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(28, 48, 24),
    new THREE.MeshStandardMaterial({ map: planetTexture(['#bff7ea', '#a8e6ff', '#d4fff4'], 8, 9), roughness: 0.9, fog: false }),
  );
  moon.position.set(330, 120, -260);
  far.add(moon);

  const small = new THREE.Mesh(
    new THREE.SphereGeometry(14, 32, 16),
    new THREE.MeshStandardMaterial({ color: 0xffe28a, emissive: 0xffc94d, emissiveIntensity: 0.4, roughness: 0.6, fog: false }),
  );
  small.position.set(160, 230, 380);
  far.add(small);

  const whale = spaceWhale();
  whale.group.scale.setScalar(1.4);
  scene.add(whale.group);

  const comets = [];
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0, 1.2, 40, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    );
    c.visible = false;
    scene.add(c);
    comets.push({ mesh: c, t: 5 + i * 7 });
  }

  function update(dt, time, camera) {
    skyMat.uniforms.uTime.value = time;
    sky.position.copy(camera.position);
    far.position.set(camera.position.x, 0, camera.position.z);
    planet.rotation.y += dt * 0.02;
    moon.rotation.y += dt * 0.03;

    const wa = time * 0.04;
    whale.group.position.set(Math.cos(wa) * 140, 70 + Math.sin(time * 0.3) * 6, Math.sin(wa) * 140);
    whale.group.rotation.y = -wa;
    whale.group.rotation.z = Math.sin(time * 0.5) * 0.08;
    whale.tail.rotation.x = Math.sin(time * 1.5) * 0.25;

    for (const c of comets) {
      c.t -= dt;
      if (c.t < 0 && !c.mesh.visible) {
        c.mesh.visible = true;
        c.life = 0;
        const a = Math.random() * Math.PI * 2;
        c.start = new THREE.Vector3(Math.cos(a) * 400, 260 + Math.random() * 100, Math.sin(a) * 400);
        c.dir = new THREE.Vector3(-Math.cos(a) + (Math.random() - 0.5), -0.4, -Math.sin(a) + (Math.random() - 0.5)).normalize();
        c.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.dir.clone().negate());
      }
      if (c.mesh.visible) {
        c.life += dt;
        c.mesh.position.copy(c.start).addScaledVector(c.dir, c.life * 300);
        c.mesh.material.opacity = Math.sin(Math.min(1, c.life / 1.5) * Math.PI) * 0.9;
        if (c.life > 1.5) {
          c.mesh.visible = false;
          c.t = 6 + Math.random() * 10;
        }
      }
    }
  }

  return { update };
}
