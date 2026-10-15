import * as THREE from 'three';
import { FLOOR } from './tunnel.js';

const particles = [];
const MAX = 500;
const box = new THREE.BoxGeometry(1, 1, 1);
const ball = new THREE.IcosahedronGeometry(0.5, 1);
const mats = {
  dust: new THREE.MeshStandardMaterial({ color: 0xd9c9a8, roughness: 1 }),
  water: new THREE.MeshStandardMaterial({ color: 0x6ec3ff, roughness: 0.1, metalness: 0.1, emissive: 0x1a4a7a, emissiveIntensity: 0.4 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.05, metalness: 0.6 }),
};
const debrisMats = new Map();
function debrisMat(color) {
  if (!debrisMats.has(color)) debrisMats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  return debrisMats.get(color);
}

let scene;
const rings = [];
export function initFx(s) { scene = s; }

function spawn(geo, mat, pos, vel, size, life, opts = {}) {
  if (particles.length >= MAX) {
    const old = particles.shift();
    scene.remove(old.mesh);
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  mesh.scale.setScalar(size);
  mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
  mesh.castShadow = !!opts.shadow;
  scene.add(mesh);
  particles.push({ mesh, vel, life, maxLife: life, size, gravity: opts.gravity ?? 25, grow: opts.grow ?? 0, spin: opts.spin ?? 6, floor: opts.floor ?? true, floorY: pos.y < -0.8 ? FLOOR + 0.1 : 0.1 });
}

const tmp = new THREE.Vector3();

export function debris(pos, colors, count = 12, power = 8) {
  for (let i = 0; i < count; i++) {
    const c = colors[(Math.random() * colors.length) | 0];
    const v = new THREE.Vector3((Math.random() - 0.5) * power, Math.random() * power * 0.9 + 3, (Math.random() - 0.5) * power);
    spawn(box, debrisMat(c), tmp.copy(pos).add(new THREE.Vector3((Math.random() - .5), Math.random(), (Math.random() - .5))), v, 0.15 + Math.random() * 0.25, 1.4 + Math.random(), { shadow: true });
  }
}

export function dust(pos, count = 10, spread = 3, size = 1) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = new THREE.Vector3(Math.cos(a) * spread, Math.random() * 2, Math.sin(a) * spread);
    spawn(ball, mats.dust, tmp.copy(pos).add(new THREE.Vector3(Math.cos(a) * 0.5, 0.3, Math.sin(a) * 0.5)), v, (0.6 + Math.random() * 0.6) * size, 0.9 + Math.random() * 0.4, { gravity: -1, grow: 1.5, spin: 1 });
  }
}

export function glass(pos, count = 14) {
  for (let i = 0; i < count; i++) {
    const v = new THREE.Vector3((Math.random() - 0.5) * 10, Math.random() * 7 + 2, (Math.random() - 0.5) * 10);
    spawn(box, mats.glass, pos, v, 0.12 + Math.random() * 0.18, 1.5, {});
  }
}

export function water(pos) {
  const v = new THREE.Vector3((Math.random() - 0.5) * 2.5, 13 + Math.random() * 4, (Math.random() - 0.5) * 2.5);
  spawn(ball, mats.water, pos, v, 0.25 + Math.random() * 0.2, 1.8, { gravity: 18, spin: 0 });
}

const bubbleMats = [0xffffff, 0xffd6f0, 0xd6f0ff, 0xe8ffd6].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.55, emissive: c, emissiveIntensity: 0.25 }));
const bubbleGeo = new THREE.SphereGeometry(0.5, 14, 10);
export function bubbles(pos, count = 2, spread = 1.2) {
  for (let i = 0; i < count; i++) {
    const v = new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.6 + Math.random() * 1.2, (Math.random() - 0.5) * 1.2);
    const p = pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread, Math.random() * spread * 0.6, (Math.random() - 0.5) * spread));
    spawn(bubbleGeo, bubbleMats[(Math.random() * bubbleMats.length) | 0], p, v, 0.08 + Math.random() * 0.18, 1.6 + Math.random() * 1.4, { gravity: -0.6, spin: 0.5, floor: false, grow: 0.3 });
  }
}

export function splash(pos, power = 1) {
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = new THREE.Vector3(Math.cos(a) * 1.5 * power, (2 + Math.random() * 2) * power, Math.sin(a) * 1.5 * power);
    spawn(ball, mats.water, pos, v, (0.05 + Math.random() * 0.06) * power, 0.5, { gravity: 12, spin: 0, floor: false });
  }
}

export function shockwave(pos, radius, color = 0xfff1c4) {
  const geo = new THREE.RingGeometry(0.8, 1, 48);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.copy(pos); m.position.y = pos.y < -0.8 ? pos.y + 0.3 : 0.3;
  scene.add(m);
  rings.push({ m, t: 0, dur: 0.5, radius });
}

export function updateFx(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); continue; }
    p.vel.y -= p.gravity * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    if (p.floor && p.mesh.position.y < p.floorY) {
      p.mesh.position.y = p.floorY;
      p.vel.y *= -0.3; p.vel.x *= 0.6; p.vel.z *= 0.6;
    }
    p.mesh.rotation.x += p.spin * dt;
    p.mesh.rotation.z += p.spin * dt;
    const k = p.life / p.maxLife;
    const s = p.size * (1 + p.grow * (1 - k)) * Math.min(1, k * 3);
    p.mesh.scale.setScalar(Math.max(0.001, s));
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.t += dt;
    const k = r.t / r.dur;
    if (k >= 1) { scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); rings.splice(i, 1); continue; }
    r.m.scale.setScalar(1 + k * r.radius);
    r.m.material.opacity = 0.8 * (1 - k);
  }
}
