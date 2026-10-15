import * as THREE from 'three';
import { std, metal, glow, glass, mesh, signTexture, canvasTexture } from '../core/util.js';

const BASE = 1.4;
const PROFILE = [
  [0.0, 0], [1.7, 0], [2.3, 0.5], [2.6, 1.5], [2.72, 3], [2.72, 5.6], [2.6, 7.2],
  [2.25, 8.6], [1.7, 9.8], [1.05, 10.8], [0.45, 11.5], [0.0, 11.8],
];
const SPLIT = 7.2;

export function radiusAt(y) {
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [r0, y0] = PROFILE[i];
    const [r1, y1] = PROFILE[i + 1];
    if (y >= y0 && y <= y1) return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
  }
  return 0;
}

function lathe(points, mat, segments = 64) {
  const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);
  return mesh(g, mat);
}

function onSurface(obj, angle, y, out = 0) {
  const r = radiusAt(y) + out;
  obj.position.set(Math.sin(angle) * r, y + BASE, Math.cos(angle) * r);
  obj.rotation.y = angle;
  return obj;
}

function finShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(0, 3.6);
  s.quadraticCurveTo(0.6, 2.6, 1.7, 1.2);
  s.quadraticCurveTo(2.2, 0.4, 2.1, -1.3);
  s.lineTo(1.6, -1.4);
  s.quadraticCurveTo(1.2, -0.3, 0, 0);
  return s;
}

function curtainTexture(color) {
  return canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(0, 0, 128, 128);
    const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 70);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,200,120,0.2)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.quadraticCurveTo(40, 50, 18, 128); ctx.lineTo(0, 128); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(128, 0); ctx.quadraticCurveTo(88, 50, 110, 128); ctx.lineTo(128, 128); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < 4; i++) ctx.fillRect(4 + i * 4, 0, 1.5, 128);
    for (let i = 0; i < 4; i++) ctx.fillRect(110 + i * 4, 0, 1.5, 128);
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(0, 0, 128, 8);
  });
}

function matTexture() {
  return canvasTexture(256, 128, (ctx) => {
    ctx.fillStyle = '#c58b4a';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#a06a32';
    ctx.lineWidth = 3;
    for (let i = 0; i < 256; i += 8) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke(); }
    ctx.fillStyle = '#fff4dd';
    ctx.font = 'bold 34px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VÄLKOMMEN', 128, 64);
  });
}

export function createRocketHouse({ color, accent, name, number, windowTint = '#ff8fc0' }) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);

  const main = std(color, { roughness: 0.35, metalness: 0.15 });
  const acc = std(accent, { roughness: 0.35, metalness: 0.15 });
  const chrome = metal(0xdfe6f0);
  const darkMetal = metal(0x5a6274, { roughness: 0.4 });

  const lower = PROFILE.filter(([, y]) => y <= SPLIT);
  const upper = PROFILE.filter(([, y]) => y >= SPLIT);
  const bodyMesh = lathe(lower, main);
  bodyMesh.position.y = BASE;
  body.add(bodyMesh);
  const nose = lathe(upper, acc);
  nose.position.y = BASE;
  body.add(nose);

  const rivetG = new THREE.SphereGeometry(0.045, 6, 4);
  const rivets = new THREE.InstancedMesh(rivetG, chrome, 3 * 48);
  let ri = 0;
  const dummy = new THREE.Object3D();
  for (const y of [1.0, 3.2, SPLIT]) {
    const r = radiusAt(y);
    body.add(mesh(new THREE.TorusGeometry(r + 0.02, 0.07, 10, 64), y === SPLIT ? chrome : acc, { y: y + BASE, rx: Math.PI / 2 }));
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      dummy.position.set(Math.sin(a) * (r + 0.07), y + BASE + 0.13, Math.cos(a) * (r + 0.07));
      dummy.updateMatrix();
      rivets.setMatrixAt(ri++, dummy.matrix);
    }
  }
  body.add(rivets);

  const stripe = std(0xffffff, { roughness: 0.4 });
  body.add(mesh(new THREE.CylinderGeometry(2.735, 2.735, 0.35, 64, 1, true), stripe, { y: BASE + 4.6 }));
  body.add(mesh(new THREE.CylinderGeometry(2.736, 2.736, 0.12, 64, 1, true), acc, { y: BASE + 4.6 }));

  const frameG = new THREE.TorusGeometry(0.5, 0.1, 12, 32);
  const winLights = [];
  const curtain = curtainTexture(windowTint);
  const windowMat = new THREE.MeshStandardMaterial({ map: curtain, emissive: 0xffd28a, emissiveMap: curtain, emissiveIntensity: 0.6, roughness: 0.2 });
  winLights.push(windowMat);
  const windows = [[Math.PI * 0.66, 5.6], [-Math.PI * 0.66, 5.6], [Math.PI, 5.6], [0, 6.3], [Math.PI * 0.33, 8.2], [-Math.PI * 0.33, 8.2], [Math.PI, 8.4]];
  for (const [a, y] of windows) {
    const w = new THREE.Group();
    const face = new THREE.Group();
    face.add(mesh(frameG, chrome));
    face.add(mesh(new THREE.CircleGeometry(0.46, 32), windowMat, { z: -0.02, shadow: false }));
    face.add(mesh(new THREE.CircleGeometry(0.46, 32), glass(0xddf4ff, 0.25), { z: 0.03, shadow: false }));
    for (let i = 0; i < 8; i++) {
      const ba = (i / 8) * Math.PI * 2;
      face.add(mesh(rivetG, chrome, { x: Math.cos(ba) * 0.5, y: Math.sin(ba) * 0.5, z: 0.09, shadow: false }));
    }
    face.rotation.x = -Math.atan2(radiusAt(y - 0.3) - radiusAt(y + 0.3), 0.6);
    w.add(face);
    onSurface(w, a, y, 0.02);
    body.add(w);
  }

  const door = new THREE.Group();
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-0.65, 0);
  doorShape.lineTo(0.65, 0);
  doorShape.lineTo(0.65, 1.7);
  doorShape.absarc(0, 1.7, 0.65, 0, Math.PI, false);
  doorShape.lineTo(-0.65, 0);
  const frameShape = new THREE.Shape();
  frameShape.moveTo(-0.85, -0.05);
  frameShape.lineTo(0.85, -0.05);
  frameShape.lineTo(0.85, 1.7);
  frameShape.absarc(0, 1.7, 0.85, 0, Math.PI, false);
  frameShape.lineTo(-0.85, -0.05);
  frameShape.holes.push(doorShape);
  door.add(mesh(new THREE.ExtrudeGeometry(frameShape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }), chrome, { z: -0.05 }));
  const doorPanel = mesh(new THREE.ExtrudeGeometry(doorShape, { depth: 0.08, bevelEnabled: false }), acc, { z: -0.02 });
  door.add(doorPanel);
  door.add(mesh(new THREE.TorusGeometry(0.26, 0.05, 8, 24), chrome, { y: 1.75, z: 0.08 }));
  door.add(mesh(new THREE.CircleGeometry(0.24, 24), windowMat, { y: 1.75, z: 0.065, shadow: false }));
  door.add(mesh(new THREE.SphereGeometry(0.08, 12, 8), metal(0xffd166), { x: 0.42, y: 1.0, z: 0.12 }));
  door.add(mesh(new THREE.BoxGeometry(0.5, 0.06, 0.04), chrome, { y: 0.7, z: 0.08 }));
  door.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), glow(0xff4d6d, 1.5), { x: 0.95, y: 1.2, z: 0.12, rx: Math.PI / 2 }));
  door.add(mesh(new THREE.BoxGeometry(0.14, 0.2, 0.03), chrome, { x: 0.95, y: 1.2, z: 0.09 }));
  door.position.set(0, BASE - 0.15, 2.6);
  body.add(door);

  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 0.45),
    new THREE.MeshStandardMaterial({ map: signTexture(`${name}s hus`, { w: 512, h: 128, border: '#' + new THREE.Color(accent).getHexString() }), roughness: 0.5 }),
  );
  plate.position.set(0, BASE + 2.85, radiusAt(2.85) + 0.06);
  body.add(plate);
  const num = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 32),
    new THREE.MeshStandardMaterial({ map: signTexture(String(number), { w: 128, h: 128, font: 'bold 80px Fredoka, sans-serif', border: '#ffd166' }) }),
  );
  num.position.set(1.25, BASE + 1.6, 2.33);
  num.rotation.y = 0.5;
  body.add(num);

  const stepMat = std(0xe8e2f5, { roughness: 0.8 });
  body.add(mesh(new THREE.BoxGeometry(1.7, 0.42, 0.7), stepMat, { y: 0.21, z: 3.2 }));
  body.add(mesh(new THREE.BoxGeometry(1.6, 0.42, 0.5), stepMat, { y: 0.63, z: 2.95 }));
  body.add(mesh(new THREE.BoxGeometry(1.6, 0.42, 0.5), stepMat, { y: 1.05, z: 2.75 }));
  body.add(mesh(new THREE.PlaneGeometry(1.3, 0.6), std(0xffffff, { map: matTexture() }), { y: 0.02, z: 4.0, rx: -Math.PI / 2 }));
  for (const side of [-1, 1]) {
    body.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 8), chrome, { x: side * 0.85, y: 1.1, z: 3.1, rx: 0.5 }));
  }

  const finMat = acc;
  const finG = new THREE.ExtrudeGeometry(finShape(), { depth: 0.22, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3 });
  finG.translate(0, 0, -0.11);
  const fins = [];
  for (const a of [Math.PI / 3, Math.PI, -Math.PI / 3]) {
    const fin = new THREE.Group();
    const f = mesh(finG, finMat);
    f.rotation.y = -Math.PI / 2;
    fin.add(f);
    fin.add(mesh(new THREE.SphereGeometry(0.12, 12, 8), glow(0xfff27a, 2), { y: 1.25, z: 1.75 }));
    fin.add(mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.15, 16), darkMetal, { y: 0.08 - BASE + 0.03, z: 1.85 }));
    const stripeFin = mesh(new THREE.BoxGeometry(0.26, 0.12, 1.3), stripe, { y: 1.8, z: 0.95, rx: -0.75 });
    fin.add(stripeFin);
    fin.position.set(Math.sin(a) * 2.4, BASE, Math.cos(a) * 2.4);
    fin.rotation.y = a;
    body.add(fin);
    fins.push(fin);
  }

  const nozzle = lathe([[0.9, 0], [1.1, -0.3], [1.35, -0.9], [1.25, -0.95], [1.0, -0.4], [0.8, -0.05]], darkMetal, 32);
  nozzle.position.y = BASE;
  body.add(nozzle);
  const nozzleGlow = mesh(new THREE.CircleGeometry(1.0, 32), glow(0xff8a3d, 0.3), { y: BASE - 0.5, rx: Math.PI / 2, shadow: false });
  body.add(nozzleGlow);

  const top = BASE + 11.8;
  body.add(mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.4, 8), chrome, { y: top + 0.6 }));
  const beacon = mesh(new THREE.SphereGeometry(0.16, 16, 12), glow(0xff3b6b, 3));
  beacon.position.y = top + 1.35;
  body.add(beacon);
  body.add(mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 24), chrome, { y: top + 0.9, rx: Math.PI / 2 }));

  const dish = new THREE.Group();
  dish.add(mesh(new THREE.SphereGeometry(0.6, 24, 12, 0, Math.PI * 2, 0, 0.9), std(0xffffff, { side: THREE.DoubleSide, roughness: 0.3 }), { rx: Math.PI / 2 }));
  dish.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), chrome, { z: 0.25, rx: Math.PI / 2 }));
  dish.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), glow(0x7af0ff, 2), { z: 0.55 }));
  dish.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), chrome, { z: -0.3, rx: Math.PI / 2 }));
  onSurface(dish, Math.PI * 0.8, 9.0, 0.5);
  dish.rotation.x = -0.6;
  body.add(dish);

  const pipe = new THREE.Group();
  pipe.add(mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.0, 12), darkMetal, { y: 0.5 }));
  pipe.add(mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.18, 12), darkMetal, { y: 1.05 }));
  onSurface(pipe, -Math.PI * 0.75, 9.3, -0.1);
  body.add(pipe);

  const deco = new THREE.Group();
  g.add(deco);
  const mailbox = new THREE.Group();
  mailbox.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8), std(0x8b5a2b), { y: 0.55 }));
  const box = new THREE.Group();
  box.add(mesh(new THREE.BoxGeometry(0.4, 0.3, 0.6), acc, { y: 0 }));
  box.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 16), acc, { y: 0.15, rx: Math.PI / 2 }));
  box.add(mesh(new THREE.BoxGeometry(0.03, 0.35, 0.08), std(0xff3b3b), { x: 0.22, y: 0.25, z: -0.1 }));
  box.position.y = 1.2;
  mailbox.add(box);
  mailbox.position.set(-2.4, 0, 4.4);
  deco.add(mailbox);

  const pot = new THREE.Group();
  pot.add(lathe([[0.0, 0], [0.32, 0], [0.42, 0.5], [0.46, 0.55], [0.0, 0.55]], std(0xe07a5f), 20));
  pot.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 20), std(0x6b4226), { y: 0.5 }));
  const stemMat = std(0x5ccf8a);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(Math.cos(a) * 0.15, 0.9, Math.sin(a) * 0.15),
      new THREE.Vector3(Math.cos(a) * 0.3, 1.2 + i * 0.1, Math.sin(a) * 0.3),
    ]);
    pot.add(mesh(new THREE.TubeGeometry(curve, 12, 0.03, 6), stemMat));
    const p = curve.getPoint(1);
    pot.add(mesh(new THREE.SphereGeometry(0.1, 12, 8), glow([0xff7eb6, 0x9df2ff, 0xfff27a, 0xc3a6ff][i], 1.5), { x: p.x, y: p.y, z: p.z }));
  }
  pot.position.set(1.6, 0, 3.9);
  deco.add(pot);

  return { group: g, body, beacon, nozzleGlow, winLights, fins, top, pipe };
}

export function createParachute(color) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(4, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2.4);
  const colors = [];
  const c1 = new THREE.Color(color), c2 = new THREE.Color(0xffffff);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getZ(i), pos.getX(i));
    const seg = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 12);
    const c = seg % 2 ? c1 : c2;
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const canopy = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 }));
  canopy.position.y = 3;
  canopy.castShadow = true;
  g.add(canopy);
  const lines = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = 4 * Math.sin(Math.PI / 2.4);
    const y = 3 + 4 * Math.cos(Math.PI / 2.4);
    lines.push(0, 0, 0, Math.cos(a) * r, y, Math.sin(a) * r);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x555577 })));
  return g;
}
