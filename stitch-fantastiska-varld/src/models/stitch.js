import * as THREE from 'three';
import { std, mesh, signTexture } from '../core/util.js';

export const PALETTES = {
  blå: { name: 'Blå', body: 0x3f7fe0, dark: 0x2a4fa8, light: 0x9cc8ff, ear: 0xff8fc0, css: '#3f7fe0' },
  rosa: { name: 'Rosa', body: 0xff8fc8, dark: 0xd9579a, light: 0xffd6ec, ear: 0xc04a8a, css: '#ff8fc8' },
  lila: { name: 'Lila', body: 0x9a6cff, dark: 0x6a42d1, light: 0xd9c9ff, ear: 0xff8fc0, css: '#9a6cff' },
  grön: { name: 'Grön', body: 0x4fc98a, dark: 0x2c9560, light: 0xc0f2d6, ear: 0xffb3d1, css: '#4fc98a' },
  orange: { name: 'Orange', body: 0xff9a4d, dark: 0xd96a1f, light: 0xffd8b8, ear: 0xff7eb6, css: '#ff9a4d' },
  gul: { name: 'Gul', body: 0xffd34d, dark: 0xd9a21c, light: 0xfff2c2, ear: 0xff8fc0, css: '#f2c230' },
  turkos: { name: 'Turkos', body: 0x3fc9d6, dark: 0x22939e, light: 0xc2f4f8, ear: 0xff8fc0, css: '#3fc9d6' },
};
const NAVY = 0x1a2350;

function earGeometry(notched) {
  const s = new THREE.Shape();
  s.moveTo(0, -0.14);
  s.bezierCurveTo(0.28, -0.2, 0.62, -0.12, 0.8, 0.02);
  if (notched) {
    s.lineTo(0.66, 0.06);
    s.lineTo(0.7, 0.1);
    s.lineTo(0.55, 0.12);
    s.lineTo(0.6, 0.17);
  }
  s.bezierCurveTo(0.5, 0.24, 0.22, 0.24, 0, 0.14);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 16 });
}

function innerEarGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0.05, -0.07);
  s.bezierCurveTo(0.3, -0.12, 0.55, -0.06, 0.68, 0.03);
  s.bezierCurveTo(0.45, 0.14, 0.22, 0.14, 0.05, 0.08);
  s.closePath();
  return new THREE.ShapeGeometry(s, 16);
}

function claws(parent, n, y, z, spread, len = 0.07) {
  const m = std(0xf2f0e8, { roughness: 0.3 });
  const g = new THREE.ConeGeometry(0.02, len, 6);
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * spread;
    parent.add(mesh(g, m, { x, y, z, rx: Math.PI / 2 }));
  }
}

export function createStitch({ cashier = false, palette = 'blå' } = {}) {
  const P = PALETTES[palette] || PALETTES.blå;
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);

  const blue = std(P.body, { roughness: 0.75 });
  const dark = std(P.dark, { roughness: 0.8 });
  const light = std(P.light, { roughness: 0.75 });
  const pink = std(P.ear, { roughness: 0.6, side: THREE.DoubleSide });
  const navy = std(NAVY, { roughness: 0.3 });
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0f24, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02 });
  const white = std(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 });

  const torso = new THREE.Group();
  torso.position.y = 0.62;
  rig.add(torso);
  torso.add(mesh(new THREE.SphereGeometry(0.42, 32, 24), blue, { s: [1, 1.08, 0.9] }));
  torso.add(mesh(new THREE.SphereGeometry(0.34, 32, 24), light, { z: 0.13, y: -0.04, s: [0.95, 1.05, 0.75] }));
  torso.add(mesh(new THREE.SphereGeometry(0.43, 24, 12, 0, Math.PI * 2, 0, 0.9), dark, { rx: -1.9, y: 0.02, s: [0.98, 1.06, 0.92] }));
  const spikeG = new THREE.ConeGeometry(0.05, 0.14, 8);
  for (let i = 0; i < 3; i++) torso.add(mesh(spikeG, dark, { y: 0.25 - i * 0.16, z: -0.37 + i * 0.01, rx: -Math.PI / 2 - 0.4 }));
  torso.add(mesh(new THREE.SphereGeometry(0.08, 16, 12), blue, { y: -0.3, z: -0.36, s: [1, 1, 1.4] }));

  if (cashier) {
    const apron = std(0xff6fae, { roughness: 0.9, side: THREE.DoubleSide });
    torso.add(mesh(new THREE.CylinderGeometry(0.44, 0.46, 0.5, 32, 1, true, -1.1, 2.2), apron, { y: -0.05 }));
    torso.add(mesh(new THREE.CircleGeometry(0.08, 24), std(0xffffff), { x: 0.16, y: 0.12, z: 0.41, ry: 0.35 }));
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.09), new THREE.MeshBasicMaterial({ map: signTexture('STITCH', { w: 256, h: 88, font: 'bold 44px Fredoka, sans-serif', border: '#3f7fe0' }) }));
    badge.position.set(-0.15, 0.14, 0.4);
    badge.rotation.y = -0.35;
    torso.add(badge);
  }

  const head = new THREE.Group();
  head.position.y = 1.08;
  rig.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.46, 40, 32), blue, { s: [1.25, 0.95, 1.0] }));
  head.add(mesh(new THREE.SphereGeometry(0.47, 32, 12, 0, Math.PI * 2, 0, 0.75), dark, { rx: -0.35, s: [1.24, 0.95, 1.0] }));
  head.add(mesh(new THREE.SphereGeometry(0.46, 32, 24), light, { y: -0.12, z: 0.2, s: [0.85, 0.5, 0.6] }));

  const eyes = [];
  for (const side of [-1, 1]) {
    head.add(mesh(new THREE.SphereGeometry(0.17, 24, 16), light, { x: side * 0.22, y: 0.07, z: 0.33, s: [1.1, 1.05, 0.6] }));
    const eye = new THREE.Group();
    eye.position.set(side * 0.22, 0.07, 0.38);
    eye.rotation.y = side * 0.35;
    eye.add(mesh(new THREE.SphereGeometry(0.135, 24, 16), eyeMat, { s: [1, 1.12, 0.55] }));
    eye.add(mesh(new THREE.SphereGeometry(0.035, 12, 8), white, { x: side * -0.04, y: 0.05, z: 0.065, shadow: false }));
    eye.add(mesh(new THREE.SphereGeometry(0.016, 8, 6), white, { x: side * 0.03, y: -0.04, z: 0.07, shadow: false }));
    head.add(eye);
    eyes.push(eye);
  }

  head.add(mesh(new THREE.SphereGeometry(0.12, 24, 16), navy, { y: -0.06, z: 0.44, s: [1.35, 0.9, 0.9] }));
  head.add(mesh(new THREE.SphereGeometry(0.025, 8, 6), white, { x: 0.05, y: -0.02, z: 0.54, shadow: false }));
  const mouth = mesh(new THREE.TorusGeometry(0.15, 0.018, 8, 24, Math.PI), navy, { y: -0.17, z: 0.37, rz: Math.PI, rx: 0.25, s: [1.2, 0.6, 1] });
  head.add(mouth);
  const tooth = new THREE.ConeGeometry(0.018, 0.04, 6);
  for (const side of [-1, 1]) head.add(mesh(tooth, std(0xffffff), { x: side * 0.1, y: -0.2, z: 0.39, rx: Math.PI }));

  const tuftG = new THREE.ConeGeometry(0.04, 0.16, 8);
  for (let i = -1; i <= 1; i++) head.add(mesh(tuftG, dark, { x: i * 0.06, y: 0.45, z: -0.02, rz: -i * 0.4, rx: -0.2 }));
  const antG = new THREE.CylinderGeometry(0.012, 0.012, 0.12, 6);
  for (const side of [-1, 1]) {
    head.add(mesh(antG, dark, { x: side * 0.09, y: 0.42, z: 0.18, rz: side * -0.4, rx: 0.4 }));
    head.add(mesh(new THREE.SphereGeometry(0.025, 8, 6), dark, { x: side * 0.115, y: 0.47, z: 0.2 }));
  }

  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.48, 0.14, -0.05);
    const ear = new THREE.Group();
    const outer = mesh(earGeometry(side === -1), blue);
    const inner = mesh(innerEarGeometry(), pink, { z: 0.065, shadow: false });
    ear.add(outer, inner);
    if (side === -1) ear.scale.x = -1;
    ear.rotation.z = side * -0.25;
    ear.rotation.y = side * 0.25;
    pivot.add(ear);
    head.add(pivot);
    ears.push({ pivot, side });
  }

  if (cashier) {
    const capMat = std(0xff6fae, { roughness: 0.8 });
    head.add(mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.12, 24), capMat, { y: 0.43 }));
    head.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24, 1, false, -Math.PI / 2, Math.PI), capMat, { y: 0.38, z: 0.12 }));
    head.add(mesh(new THREE.SphereGeometry(0.035, 12, 8), std(0xffffff), { y: 0.5 }));
  }

  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.38, 0.82, 0.04);
    const upper = mesh(new THREE.CapsuleGeometry(0.085, 0.26, 6, 12), blue, { y: -0.17 });
    shoulder.add(upper);
    const hand = new THREE.Group();
    hand.position.y = -0.36;
    hand.add(mesh(new THREE.SphereGeometry(0.1, 16, 12), blue, { s: [1, 0.9, 1.1] }));
    hand.add(mesh(new THREE.SphereGeometry(0.06, 12, 8), light, { z: 0.05, y: -0.02, s: [1, 0.7, 0.6] }));
    claws(hand, 3, -0.06, 0.08, 0.04);
    shoulder.add(hand);
    shoulder.rotation.z = side * 0.25;
    rig.add(shoulder);
    arms.push({ shoulder, side, hand });
  }

  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.2, 0.34, 0);
    hip.add(mesh(new THREE.CapsuleGeometry(0.12, 0.1, 6, 12), blue, { y: -0.12 }));
    const foot = mesh(new THREE.SphereGeometry(0.13, 16, 12), blue, { y: -0.27, z: 0.06, s: [1, 0.55, 1.45] });
    hip.add(foot);
    hip.add(mesh(new THREE.SphereGeometry(0.08, 12, 8), light, { y: -0.3, z: 0.08, s: [1, 0.3, 1.3] }));
    claws(hip, 3, -0.3, 0.24, 0.05, 0.06);
    rig.add(hip);
    legs.push({ hip, side });
  }

  let t = Math.random() * 10;
  let walkPhase = 0;
  let blinkTimer = 2;
  let punchT = 0;
  let waveT = 0;
  let eatT = 0;
  let squash = 0;
  let wasGrounded = true;

  function update(dt, { speed = 0, grounded = true, vy = 0 } = {}) {
    t += dt;
    const moving = Math.min(1, Math.abs(speed) / 6);
    walkPhase += dt * (4 + Math.abs(speed) * 1.6) * (moving > 0.05 ? 1 : 0);
    const sw = Math.sin(walkPhase) * moving;

    if (grounded && !wasGrounded) squash = 1;
    wasGrounded = grounded;
    squash = Math.max(0, squash - dt * 4);

    const breathe = Math.sin(t * 2.2) * 0.015;
    rig.position.y = grounded ? Math.abs(Math.sin(walkPhase)) * 0.08 * moving : 0;
    rig.scale.set(1 + squash * 0.15, 1 - squash * 0.15 + breathe, 1 + squash * 0.15);

    for (const l of legs) {
      l.hip.rotation.x = grounded ? sw * 0.7 * l.side : -0.5;
    }
    for (const a of arms) {
      a.shoulder.rotation.x = grounded ? -sw * 0.8 * a.side : -2.4;
      a.shoulder.rotation.z = a.side * (grounded ? 0.25 : 0.7);
    }

    if (punchT > 0) {
      punchT -= dt;
      const p = Math.sin((1 - punchT / 0.35) * Math.PI);
      arms[1].shoulder.rotation.x = -1.5 * p - 0.2;
      arms[1].shoulder.rotation.z = 0.1;
      rig.rotation.y = -0.3 * p;
    } else rig.rotation.y = 0;

    if (waveT > 0) {
      waveT -= dt;
      arms[0].shoulder.rotation.x = 0;
      arms[0].shoulder.rotation.z = -2.6 + Math.sin(t * 14) * 0.35;
    }

    if (eatT > 0) {
      eatT -= dt;
      for (const a of arms) {
        a.shoulder.rotation.x = -2.0 + Math.sin(t * 18) * 0.15;
        a.shoulder.rotation.z = -a.side * 0.5;
      }
      head.rotation.x = Math.sin(t * 18) * 0.08;
      mouth.scale.y = 0.6 + Math.abs(Math.sin(t * 18)) * 1.2;
    } else {
      head.rotation.x = vy > 2 ? -0.2 : 0;
      mouth.scale.y = 0.6;
    }

    head.rotation.z = Math.sin(t * 1.3) * 0.04 + sw * 0.05;
    head.rotation.y = Math.sin(t * 0.7) * 0.08;
    for (const e of ears) {
      const flop = Math.sin(t * 3 + e.side) * 0.06 + (grounded ? 0 : 0.5) + Math.abs(sw) * 0.15;
      e.pivot.rotation.z = e.side * flop;
      e.pivot.rotation.x = Math.sin(t * 1.7 + e.side * 2) * 0.05;
    }

    blinkTimer -= dt;
    const blink = blinkTimer < 0.12 ? 0.1 : 1;
    if (blinkTimer < 0) blinkTimer = 2 + Math.random() * 3;
    for (const e of eyes) e.scale.y = blink;
  }

  return {
    group: root,
    update,
    punch() { punchT = 0.35; },
    wave(d = 1.5) { waveT = d; },
    eat() { eatT = 1.2; },
    head,
  };
}
