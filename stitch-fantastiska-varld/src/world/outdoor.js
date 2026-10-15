import * as THREE from 'three';
import { std, metal, glow, mesh, canvasTexture, signTexture, rng, noise3, starShape } from '../core/util.js';
import { Rocket } from './rocket.js';
import { createUfoShop, UFO_HEIGHT } from '../models/ufoShop.js';

export const ISLAND_RADIUS = 62;
export const WALK_RADIUS = 56.5;

const ROCKETS = [
  { name: 'Lilo', color: 0xff8fb8, accent: 0x7a5cff, windowTint: '#ffd166' },
  { name: 'Nani', color: 0x7fd8ff, accent: 0xff6f91, windowTint: '#ff8fc0' },
  { name: 'Jumba', color: 0xffd36e, accent: 0x3fb68b, windowTint: '#9df2ff' },
  { name: 'Pleakley', color: 0xb9f27c, accent: 0xff8a3d, windowTint: '#c3a6ff' },
  { name: 'Ängel', color: 0xd7b8ff, accent: 0xff4fa0, windowTint: '#fff27a' },
];

const SHOPS = [
  { name: 'STENBUTIKEN', color: 0xf3c6ff, accent: 0xff5fa2, beamColor: 0xff9de2, menu: ['Lavasten 2⭐', 'Månost 1⭐', 'Meteorbulle 2⭐', 'Issten 2⭐'], displayRocks: ['lava', 'manost', 'meteor', 'kristall'] },
  { name: 'KRISTALLKIOSKEN', color: 0xbff7ea, accent: 0x3fb6c9, beamColor: 0x7af0ff, menu: ['Kristallgodis 3⭐', 'Regnbågssten 4⭐', 'Issten 2⭐', 'Månost 1⭐'], displayRocks: ['kristall', 'regnbage', 'is', 'meteor'] },
];

function groundTexture() {
  const r = rng(42);
  return canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = '#97dfbb';
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = r() < 0.5 ? 'rgba(60,150,110,0.22)' : 'rgba(255,255,255,0.2)';
      const s = 1 + r() * 3;
      ctx.fillRect(r() * 1024, r() * 1024, s, s);
    }
    const flowerCols = ['#ff9de2', '#fff27a', '#9df2ff', '#c3a6ff', '#ffffff'];
    for (let i = 0; i < 260; i++) {
      const x = r() * 1024, y = r() * 1024;
      ctx.fillStyle = flowerCols[Math.floor(r() * flowerCols.length)];
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { repeat: [10, 10] });
}

function plazaTexture() {
  return canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = '#f6efff';
    ctx.fillRect(0, 0, 1024, 1024);
    const cx = 512, cy = 512;
    const rings = 9;
    const cols = ['#efe3ff', '#ffe6f2', '#e3f6ff', '#fff6d6'];
    for (let ring = 0; ring < rings; ring++) {
      const r0 = 60 + ring * 50, r1 = r0 + 48;
      const n = 8 + ring * 6;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2 + ring * 0.2, a1 = ((i + 1) / n) * Math.PI * 2 + ring * 0.2;
        ctx.beginPath();
        ctx.arc(cx, cy, r1, a0, a1);
        ctx.arc(cx, cy, r0, a1, a0, true);
        ctx.closePath();
        ctx.fillStyle = cols[(i + ring) % cols.length];
        ctx.fill();
        ctx.strokeStyle = '#d4c4ef';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#ffd166';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * 470, cy + Math.sin(a) * 470);
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const rr = k % 2 ? 9 : 22;
        const aa = (k / 10) * Math.PI * 2;
        ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
      }
      ctx.fill();
      ctx.restore();
    }
  });
}

function stripedTexture(c1, c2, n = 6) {
  return canvasTexture(256, 128, (ctx) => {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? c1 : c2;
      ctx.fillRect((i * 256) / n, 0, 256 / n + 1, 128);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(64, 64, 14, 0, Math.PI * 2);
    ctx.arc(192, 64, 14, 0, Math.PI * 2);
    ctx.fill();
  });
}

function crateTexture() {
  return canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#9fb3ff';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#6d7fe0';
    ctx.lineWidth = 18;
    ctx.strokeRect(9, 9, 238, 238);
    ctx.beginPath(); ctx.moveTo(18, 18); ctx.lineTo(238, 238); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RYMD', 128, 110);
    ctx.fillText('POST', 128, 160);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(200, 60, 18, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function createOutdoor(game) {
  const { scene, physics } = game;
  const root = new THREE.Group();
  scene.add(root);
  const r = rng(7);
  const obstacles = [];
  const paths = [];

  const ground = mesh(new THREE.CircleGeometry(ISLAND_RADIUS, 128), new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.95 }), { rx: -Math.PI / 2, shadow: false });
  root.add(ground);
  physics.fixedBox({ x: 0, y: -0.5, z: 0 }, { x: 70, y: 0.5, z: 70 });

  const underGeo = new THREE.ConeGeometry(ISLAND_RADIUS, 48, 96, 12, true);
  const up = underGeo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < up.count; i++) {
    v.fromBufferAttribute(up, i);
    const k = (v.y + 24) / 48;
    const n = noise3(v.x * 0.08, v.y * 0.08, v.z * 0.08);
    const scale = 1 + (n - 0.5) * 0.35 * (1 - k * 0.6);
    up.setXYZ(i, v.x * scale, v.y, v.z * scale);
  }
  underGeo.computeVertexNormals();
  const under = mesh(underGeo, std(0xb9a3e6, { roughness: 0.9, flatShading: true }), { y: -24.05, rx: Math.PI, shadow: false });
  root.add(under);
  root.add(mesh(new THREE.TorusGeometry(ISLAND_RADIUS - 0.2, 0.6, 12, 160), std(0xa58fdc, { roughness: 0.9 }), { rx: Math.PI / 2, y: -0.25, shadow: false }));

  const rimRock = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), std(0xc9b6f2, { flatShading: true, roughness: 0.9 }), 140);
  const d = new THREE.Object3D();
  for (let i = 0; i < 140; i++) {
    const a = (i / 140) * Math.PI * 2 + r() * 0.03;
    const rr = ISLAND_RADIUS - 0.8 + r() * 1.5;
    d.position.set(Math.sin(a) * rr, -0.1 + r() * 0.3, Math.cos(a) * rr);
    d.rotation.set(r() * 3, r() * 3, r() * 3);
    d.scale.setScalar(0.6 + r() * 0.9);
    d.updateMatrix();
    rimRock.setMatrixAt(i, d.matrix);
  }
  rimRock.castShadow = true;
  rimRock.receiveShadow = true;
  root.add(rimRock);

  const plaza = mesh(new THREE.CircleGeometry(10, 96), new THREE.MeshStandardMaterial({ map: plazaTexture(), roughness: 0.6 }), { rx: -Math.PI / 2, y: 0.02, shadow: false });
  root.add(plaza);
  root.add(mesh(new THREE.TorusGeometry(10, 0.18, 8, 128), std(0xd4c4ef), { rx: Math.PI / 2, y: 0.03, shadow: false }));
  obstacles.push({ x: 0, z: 0, r: 10.5 });

  const fountain = new THREE.Group();
  const fountainMat = std(0xffffff, { roughness: 0.3 });
  const lathe = (pts, mat) => mesh(new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 64), mat);
  fountain.add(lathe([[0, 0], [3.6, 0], [3.8, 0.2], [3.8, 0.85], [3.5, 0.95], [3.3, 0.9], [3.3, 0.35], [0, 0.35]], fountainMat));
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x8fe3ff, emissive: 0x3ac6ff, emissiveIntensity: 0.35, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85 });
  const water = mesh(new THREE.CircleGeometry(3.3, 64), waterMat, { y: 0.7, rx: -Math.PI / 2, shadow: false });
  fountain.add(water);
  fountain.add(lathe([[0, 0], [0.7, 0], [0.5, 0.4], [0.35, 1.8], [1.4, 2.0], [1.5, 2.2], [1.3, 2.3], [0.3, 2.25], [0.25, 3.0], [0, 3.0]], std(0xfbe3ff, { roughness: 0.3 })));
  fountain.add(mesh(new THREE.CircleGeometry(1.3, 48), waterMat, { y: 2.22, rx: -Math.PI / 2, shadow: false }));
  const starTop = mesh(new THREE.ExtrudeGeometry(starShape(0.8, 0.36), { depth: 0.25, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06 }), metal(0xffd166, { emissive: 0xffb000, emissiveIntensity: 0.5 }), { y: 3.9 });
  fountain.add(starTop);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    fountain.add(mesh(new THREE.SphereGeometry(0.12, 8, 6), glow([0xff9de2, 0x9df2ff, 0xfff27a][i % 3], 2), { x: Math.sin(a) * 3.55, y: 0.95, z: Math.cos(a) * 3.55, shadow: false }));
  }
  root.add(fountain);
  physics.fixedCylinder({ x: 0, y: 0.47, z: 0 }, 0.47, 3.8);
  physics.fixedCylinder({ x: 0, y: 1.5, z: 0 }, 1.5, 0.6);

  const SLOTS = 7;
  const rockets = [];
  const shops = [];
  let ri = 0, si = 0;
  for (let i = 0; i < SLOTS; i++) {
    const a = (i / SLOTS) * Math.PI * 2 + 0.2;
    const isShop = i === 2 || i === 5;
    const rad = isShop ? 34 : 31;
    const pos = new THREE.Vector3(Math.sin(a) * rad, 0, Math.cos(a) * rad);
    const facing = Math.atan2(-pos.x, -pos.z);
    if (isShop) {
      const cfg = SHOPS[si++];
      const shop = createUfoShop(cfg);
      shop.group.position.copy(pos);
      shop.group.rotation.y = facing;
      root.add(shop.group);
      for (const f of shop.legFeet) {
        const wp = f.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), facing).add(pos);
        physics.fixedCylinder({ x: wp.x, y: 2.5, z: wp.z }, 2.5, 0.55);
      }
      physics.fixedCylinder({ x: pos.x, y: UFO_HEIGHT + 0.2, z: pos.z }, 1.0, 6.2);
      shops.push({ ...shop, cfg, pos, facing, phase: r() * 10 });
      obstacles.push({ x: pos.x, z: pos.z, r: 7.5 });
    } else {
      const cfg = { ...ROCKETS[ri], number: ri + 1 };
      ri++;
      const rocket = new Rocket(game, cfg, pos, facing);
      rockets.push(rocket);
      obstacles.push({ x: pos.x, z: pos.z, r: 6.5 });
    }
    const dir = pos.clone().normalize();
    const start = dir.clone().multiplyScalar(10);
    const end = dir.clone().multiplyScalar(rad - (isShop ? 2.5 : 4.5));
    paths.push({ start, end });
  }

  const stoneMat = std(0xf2ebff, { roughness: 0.7 });
  const stoneG = new THREE.CylinderGeometry(0.75, 0.8, 0.12, 14);
  const stones = [];
  for (const p of paths) {
    const len = p.start.distanceTo(p.end);
    const n = Math.floor(len / 1.6);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const pos = p.start.clone().lerp(p.end, t);
      const side = new THREE.Vector3(-p.end.z, 0, p.end.x).normalize().multiplyScalar(Math.sin(i * 1.7) * 0.35);
      stones.push(pos.add(side));
    }
  }
  const stoneInst = new THREE.InstancedMesh(stoneG, stoneMat, stones.length);
  stones.forEach((s, i) => {
    d.position.set(s.x, 0.04, s.z);
    d.rotation.set(0, r() * 3, 0);
    d.scale.set(0.9 + r() * 0.3, 1, 0.9 + r() * 0.3);
    d.updateMatrix();
    stoneInst.setMatrixAt(i, d.matrix);
  });
  stoneInst.receiveShadow = true;
  root.add(stoneInst);

  const distToPath = (x, z) => {
    let best = Infinity;
    const p = new THREE.Vector3(x, 0, z);
    for (const s of paths) {
      const ab = s.end.clone().sub(s.start);
      const t = THREE.MathUtils.clamp(p.clone().sub(s.start).dot(ab) / ab.lengthSq(), 0, 1);
      best = Math.min(best, s.start.clone().addScaledVector(ab, t).distanceTo(p));
    }
    return best;
  };

  const free = (x, z, rad = 1, pathMargin = 2) => {
    if (Math.hypot(x, z) > WALK_RADIUS - rad) return false;
    for (const o of obstacles) if (Math.hypot(x - o.x, z - o.z) < o.r + rad) return false;
    return distToPath(x, z) > pathMargin + rad;
  };

  const randomFree = (rad, minR = 11, maxR = WALK_RADIUS - 1, pathMargin = 2) => {
    for (let k = 0; k < 200; k++) {
      const a = r() * Math.PI * 2;
      const rr = minR + r() * (maxR - minR);
      const x = Math.sin(a) * rr, z = Math.cos(a) * rr;
      if (free(x, z, rad, pathMargin)) return new THREE.Vector3(x, 0, z);
    }
    return null;
  };

  const lampPole = metal(0xf5f0ff, { roughness: 0.3 });
  const lampOrbs = [];
  for (const p of paths) {
    for (const t of [0.3, 0.75]) {
      for (const s of [-1, 1]) {
        if (t === 0.75 && s === 1) continue;
        const pos = p.start.clone().lerp(p.end, t);
        const side = new THREE.Vector3(-p.end.z, 0, p.end.x).normalize().multiplyScalar(s * 1.9);
        pos.add(side);
        const lamp = new THREE.Group();
        lamp.add(mesh(new THREE.CylinderGeometry(0.25, 0.32, 0.25, 12), lampPole, { y: 0.12 }));
        lamp.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 10), lampPole, { y: 1.7 }));
        const curl = new THREE.TorusGeometry(0.35, 0.05, 8, 24, Math.PI * 1.3);
        lamp.add(mesh(curl, lampPole, { y: 3.35, x: 0.35, rz: -0.2 }));
        const orbMat = glow([0xfff2b0, 0xffc4e8, 0xc4f4ff][lampOrbs.length % 3], 2.2);
        const orb = mesh(new THREE.SphereGeometry(0.28, 20, 14), orbMat, { x: 0.7, y: 3.1, shadow: false });
        lamp.add(orb);
        lamp.add(mesh(new THREE.ConeGeometry(0.3, 0.2, 16), lampPole, { x: 0.7, y: 3.42 }));
        lamp.position.copy(pos);
        lamp.rotation.y = Math.atan2(-side.x, -side.z) + Math.PI / 2;
        root.add(lamp);
        lampOrbs.push(orbMat);
        physics.fixedCylinder({ x: pos.x, y: 1.6, z: pos.z }, 1.6, 0.15);
        obstacles.push({ x: pos.x, z: pos.z, r: 0.6 });
      }
    }
  }

  const benchMat = std(0xffb3d1, { roughness: 0.6 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4 + 0.2;
    const bench = new THREE.Group();
    for (let k = 0; k < 3; k++) bench.add(mesh(new THREE.BoxGeometry(2.2, 0.08, 0.18), benchMat, { y: 0.55, z: -0.25 + k * 0.22 }));
    for (let k = 0; k < 2; k++) bench.add(mesh(new THREE.BoxGeometry(2.2, 0.16, 0.06), benchMat, { y: 0.85 + k * 0.22, z: -0.42, rx: -0.15 }));
    for (const s of [-1, 1]) {
      bench.add(mesh(new THREE.TorusGeometry(0.3, 0.05, 8, 16, Math.PI), metal(0xbfc6d9), { x: s * 0.9, y: 0.25, rx: 0, ry: Math.PI / 2 }));
      bench.add(mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), metal(0xbfc6d9), { x: s * 0.95, y: 0.5, z: -0.42 }));
    }
    bench.position.set(Math.sin(a) * 8.5, 0, Math.cos(a) * 8.5);
    bench.rotation.y = a + Math.PI;
    root.add(bench);
    physics.fixedBox({ x: bench.position.x, y: 0.35, z: bench.position.z }, { x: 1.1, y: 0.35, z: 0.4 }, a);
    obstacles.push({ x: bench.position.x, z: bench.position.z, r: 1.4 });
  }

  const sign = new THREE.Group();
  sign.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.4, 10), std(0x8b5a2b), { y: 1.7 }));
  const arrowDefs = [
    { text: 'Stenbutiken', target: shops[0].pos, col: '#ff5fa2' },
    { text: 'Kristallkiosken', target: shops[1].pos, col: '#3fb6c9' },
    { text: 'Studsmattan', target: null, col: '#7a5cff' },
  ];
  sign.position.set(7.2, 0, -6.2);
  root.add(sign);
  physics.fixedCylinder({ x: sign.position.x, y: 1.7, z: sign.position.z }, 1.7, 0.15);

  const trampPos = randomFree(3, 14, 22, 2.5) || new THREE.Vector3(15, 0, 4);
  arrowDefs[2].target = trampPos;
  arrowDefs.forEach((ad, i) => {
    const tex = signTexture(ad.text + ' ➜', { w: 512, h: 110, border: ad.col, font: 'bold 52px Fredoka, sans-serif' });
    const arrow = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.06), [std(0xffffff), std(0xffffff), std(0xffffff), std(0xffffff), std(0xffffff, { map: tex }), std(0xffffff, { map: tex })]);
    arrow.position.y = 3.0 - i * 0.6;
    const dir = ad.target.clone().sub(sign.position);
    const ang = Math.atan2(dir.x, dir.z) - Math.PI / 2;
    const holder = new THREE.Group();
    holder.rotation.y = ang;
    arrow.position.x = 1.1;
    holder.add(arrow);
    arrow.castShadow = true;
    sign.add(holder);
  });

  const tramp = new THREE.Group();
  const frame = metal(0x7a5cff, { roughness: 0.3, metalness: 0.4 });
  tramp.add(mesh(new THREE.TorusGeometry(2.3, 0.14, 12, 64), frame, { y: 0.9, rx: Math.PI / 2 }));
  const padCols = [0xff5fa2, 0xffd166, 0x5ff2ff, 0x9dff7a];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    tramp.add(mesh(new THREE.TorusGeometry(2.3, 0.2, 10, 12, Math.PI / 4.5), std(padCols[i % 4]), { y: 0.92, rx: Math.PI / 2, rz: a }));
  }
  const matTex = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#2a2350';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 6;
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.arc(128, 128, k * 36, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#ff5fa2';
    ctx.beginPath(); ctx.arc(128, 128, 20, 0, Math.PI * 2); ctx.fill();
  });
  const trampMat = mesh(new THREE.CircleGeometry(2.05, 48), std(0xffffff, { map: matTex, roughness: 0.8 }), { y: 0.88, rx: -Math.PI / 2 });
  tramp.add(trampMat);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    tramp.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), metal(0xdddddd), { x: Math.sin(a) * 2.18, y: 0.89, z: Math.cos(a) * 2.18, rz: Math.PI / 2, ry: a + Math.PI / 2, shadow: false }));
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    tramp.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 8), frame, { x: Math.sin(a) * 2.3, y: 0.45, z: Math.cos(a) * 2.3 }));
  }
  tramp.position.copy(trampPos);
  root.add(tramp);
  physics.fixedCylinder({ x: trampPos.x, y: 0.45, z: trampPos.z }, 0.45, 2.4);
  obstacles.push({ x: trampPos.x, z: trampPos.z, r: 3 });

  const flora = new THREE.Group();
  root.add(flora);
  const canopyCols = [0xffb3d9, 0xb3e5ff, 0xfff0a3, 0xd9c2ff, 0xb8ffd1];
  for (let i = 0; i < 16; i++) {
    const p = randomFree(2.2, 12);
    if (!p) continue;
    const tree = new THREE.Group();
    const h = 4 + r() * 3;
    const lean = new THREE.Vector3((r() - 0.5) * 1.5, 0, (r() - 0.5) * 1.5);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(lean.x * 0.3, h * 0.35, lean.z * 0.3),
      new THREE.Vector3(-lean.x * 0.2, h * 0.7, -lean.z * 0.2),
      new THREE.Vector3(lean.x, h, lean.z),
    ]);
    tree.add(mesh(new THREE.TubeGeometry(curve, 24, 0.22, 10), std(0xf2d7ff, { roughness: 0.7 })));
    for (let k = 0; k < 6; k++) {
      const pt = curve.getPoint(k / 6);
      tree.add(mesh(new THREE.TorusGeometry(0.24, 0.04, 6, 16), std(0xff9de2), { x: pt.x, y: pt.y, z: pt.z, rx: Math.PI / 2 }));
    }
    const top = curve.getPoint(1);
    const col = canopyCols[i % canopyCols.length];
    const canopyMat = std(col, { roughness: 0.5 });
    const sizes = [1.6, 1.2, 1.1, 0.9];
    sizes.forEach((s, k) => {
      const off = k === 0 ? new THREE.Vector3() : new THREE.Vector3(Math.sin(k * 2.1) * 1.1, -0.3 + k * 0.2, Math.cos(k * 2.1) * 1.1);
      tree.add(mesh(new THREE.SphereGeometry(s, 24, 16), canopyMat, { x: top.x + off.x, y: top.y + off.y + 0.6, z: top.z + off.z }));
    });
    const dotMat = glow(0xffffff, 1.2);
    for (let k = 0; k < 12; k++) {
      const dir = new THREE.Vector3(r() - 0.5, r() * 0.8, r() - 0.5).normalize();
      tree.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), dotMat, { x: top.x + dir.x * 1.62, y: top.y + 0.6 + dir.y * 1.62, z: top.z + dir.z * 1.62, shadow: false }));
    }
    tree.position.copy(p);
    tree.rotation.y = r() * 6;
    flora.add(tree);
    physics.fixedCylinder({ x: p.x, y: 1.5, z: p.z }, 1.5, 0.35);
    obstacles.push({ x: p.x, z: p.z, r: 2.2 });
  }

  const mushrooms = [];
  for (let i = 0; i < 22; i++) {
    const p = randomFree(0.8, 11);
    if (!p) continue;
    const m = new THREE.Group();
    const s = 0.5 + r() * 0.9;
    m.add(mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.8, 12), std(0xfff6e6), { y: 0.4 }));
    const capCol = [0xff7eb6, 0x7ad8ff, 0xc38bff, 0xffb35c][i % 4];
    const capMat = std(capCol, { emissive: capCol, emissiveIntensity: 0.35, roughness: 0.4 });
    m.add(mesh(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), capMat, { y: 0.75, s: [1, 0.7, 1] }));
    m.add(mesh(new THREE.CircleGeometry(0.5, 24), std(0xfff0f6), { y: 0.75, rx: Math.PI / 2 }));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + r();
      const b = 0.3 + r() * 0.8;
      const dir = new THREE.Vector3(Math.cos(a) * Math.sin(b), Math.cos(b) * 0.7, Math.sin(a) * Math.sin(b));
      m.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), glow(0xffffff, 1.5), { x: dir.x * 0.5, y: 0.75 + dir.y * 0.5, z: dir.z * 0.5, shadow: false }));
    }
    m.scale.setScalar(s);
    m.position.copy(p);
    flora.add(m);
    mushrooms.push({ m, phase: r() * 6 });
    obstacles.push({ x: p.x, z: p.z, r: 0.8 });
  }

  const crystalG = new THREE.CylinderGeometry(0, 0.35, 1.6, 6);
  const crystalCols = [0xff9de2, 0x9df2ff, 0xc3a6ff, 0xfff27a];
  for (let i = 0; i < 18; i++) {
    const p = randomFree(1.2, 11);
    if (!p) continue;
    const c = new THREE.Group();
    const col = crystalCols[i % crystalCols.length];
    const mat = new THREE.MeshPhysicalMaterial({ color: col, emissive: col, emissiveIntensity: 0.45, roughness: 0.1, clearcoat: 1, flatShading: true });
    const n = 3 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const s = 0.5 + r() * 0.9;
      const cr = mesh(crystalG, mat, { x: (r() - 0.5) * 0.9, y: 0.6 * s, z: (r() - 0.5) * 0.9, rx: (r() - 0.5) * 0.8, rz: (r() - 0.5) * 0.8, s });
      c.add(cr);
    }
    c.add(mesh(new THREE.DodecahedronGeometry(0.5, 0), std(0xbfaee0, { flatShading: true }), { y: 0.1, s: [1.3, 0.5, 1.3] }));
    c.position.copy(p);
    flora.add(c);
    physics.fixedCylinder({ x: p.x, y: 0.6, z: p.z }, 0.6, 0.6);
    obstacles.push({ x: p.x, z: p.z, r: 1.2 });
  }

  for (let i = 0; i < 12; i++) {
    const p = randomFree(0.8, 11);
    if (!p) continue;
    const pts = [];
    const turns = 2.5;
    for (let k = 0; k <= 40; k++) {
      const t = k / 40;
      const a = t * Math.PI * 2 * turns;
      const rad = 0.35 * (1 - t * 0.7);
      pts.push(new THREE.Vector3(Math.cos(a) * rad, t * 2.2, Math.sin(a) * rad));
    }
    const sp = new THREE.Group();
    const col = [0x5ccf8a, 0x3fb6c9, 0x8a6cff][i % 3];
    sp.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.06, 8), std(col)));
    sp.add(mesh(new THREE.SphereGeometry(0.16, 12, 8), glow(0xfff27a, 2), { x: pts[40].x, y: pts[40].y, z: pts[40].z, shadow: false }));
    for (let k = 0; k < 3; k++) sp.add(mesh(new THREE.SphereGeometry(0.25, 12, 8), std(col), { x: Math.sin(k * 2.1) * 0.3, y: 0.05, z: Math.cos(k * 2.1) * 0.3, s: [1.4, 0.3, 0.7], ry: k * 2.1 }));
    sp.position.copy(p);
    flora.add(sp);
    obstacles.push({ x: p.x, z: p.z, r: 0.8 });
  }

  const tuftCount = 2600;
  const bladeG = new THREE.ConeGeometry(0.06, 0.45, 4);
  bladeG.translate(0, 0.22, 0);
  const tufts = new THREE.InstancedMesh(bladeG, std(0xffffff, { roughness: 0.8 }), tuftCount);
  const tc = new THREE.Color();
  const tuftCols = [0x8fe0b0, 0x7ad6a8, 0xa6ecc4, 0xb3e6ff, 0xd6c2ff];
  let placed = 0;
  for (let k = 0; k < tuftCount * 3 && placed < tuftCount; k++) {
    const a = r() * Math.PI * 2;
    const rr = Math.sqrt(r()) * (ISLAND_RADIUS - 2);
    const x = Math.sin(a) * rr, z = Math.cos(a) * rr;
    if (rr < 10.5 || distToPath(x, z) < 1.1) continue;
    let blocked = false;
    for (const o of obstacles) if (o.r > 5 && Math.hypot(x - o.x, z - o.z) < o.r - 2) blocked = true;
    if (blocked) continue;
    d.position.set(x, 0, z);
    d.rotation.set((r() - 0.5) * 0.5, r() * 6, (r() - 0.5) * 0.5);
    d.scale.setScalar(0.6 + r() * 0.9);
    d.updateMatrix();
    tufts.setMatrixAt(placed, d.matrix);
    tufts.setColorAt(placed, tc.set(tuftCols[Math.floor(r() * tuftCols.length)]));
    placed++;
  }
  tufts.count = placed;
  tufts.receiveShadow = true;
  root.add(tufts);

  const fencePosts = 96;
  const postInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.12, 1.2, 8), std(0xffffff), fencePosts);
  const capInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 10, 8), glow(0xff9de2, 2), fencePosts);
  for (let i = 0; i < fencePosts; i++) {
    const a = (i / fencePosts) * Math.PI * 2;
    d.position.set(Math.sin(a) * 58, 0.6, Math.cos(a) * 58);
    d.rotation.set(0, 0, 0);
    d.scale.setScalar(1);
    d.updateMatrix();
    postInst.setMatrixAt(i, d.matrix);
    d.position.y = 1.25;
    d.updateMatrix();
    capInst.setMatrixAt(i, d.matrix);
    if (i % 2) capInst.setColorAt(i, tc.set(0x9df2ff));
    else capInst.setColorAt(i, tc.set(0xfff27a));
  }
  postInst.castShadow = true;
  root.add(postInst, capInst);
  root.add(mesh(new THREE.TorusGeometry(58, 0.05, 6, 256), glow(0xffc4e8, 1.2), { y: 1.0, rx: Math.PI / 2, shadow: false }));
  root.add(mesh(new THREE.TorusGeometry(58, 0.05, 6, 256), glow(0xc4f4ff, 1.2), { y: 0.55, rx: Math.PI / 2, shadow: false }));

  const asteroids = [];
  const astMat = std(0xc9b6f2, { flatShading: true, roughness: 0.9 });
  for (let i = 0; i < 22; i++) {
    const g = new THREE.Group();
    const s = 1 + r() * 4;
    const geo = new THREE.IcosahedronGeometry(s, 1);
    const pp = geo.attributes.position;
    for (let k = 0; k < pp.count; k++) {
      v.fromBufferAttribute(pp, k);
      v.multiplyScalar(0.8 + noise3(v.x + i, v.y, v.z) * 0.4);
      pp.setXYZ(k, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    g.add(mesh(geo, astMat, { shadow: false }));
    if (r() < 0.6) {
      const col = crystalCols[i % 4];
      const cm = glow(col, 0.8, { flatShading: true });
      for (let k = 0; k < 3; k++) g.add(mesh(crystalG, cm, { y: s * 0.7, x: (k - 1) * s * 0.25, rz: (k - 1) * 0.4, s: s * 0.5, shadow: false }));
    }
    const a = r() * Math.PI * 2;
    const rad = 78 + r() * 50;
    g.position.set(Math.sin(a) * rad, -12 + r() * 40, Math.cos(a) * rad);
    root.add(g);
    asteroids.push({ g, a, rad, y: g.position.y, speed: 0.01 + r() * 0.02, spin: (r() - 0.5) * 0.4, phase: r() * 6 });
  }

  const ballTex = [stripedTexture('#ff5fa2', '#ffffff'), stripedTexture('#5ff2ff', '#7a5cff'), stripedTexture('#ffd166', '#ff8a3d'), stripedTexture('#9dff7a', '#3fb68b')];
  const kickables = [];
  for (let i = 0; i < 7; i++) {
    const p = randomFree(1, 11, 26);
    if (!p) continue;
    const ball = mesh(new THREE.SphereGeometry(0.6, 32, 20), std(0xffffff, { map: ballTex[i % 4], roughness: 0.35 }));
    ball.position.set(p.x, 0.7, p.z);
    root.add(ball);
    kickables.push(physics.dynamicBall(ball, 0.6, { restitution: 0.8, density: 0.4 }));
  }
  const crateMat = std(0xffffff, { map: crateTexture(), roughness: 0.7 });
  for (let i = 0; i < 6; i++) {
    const p = randomFree(1, 11, 30);
    if (!p) continue;
    const crate = mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), crateMat);
    crate.position.set(p.x, 0.6 + (i % 3 === 2 ? 1.2 : 0), p.z);
    root.add(crate);
    kickables.push(physics.dynamicBox(crate, { x: 0.55, y: 0.55, z: 0.55 }, { density: 0.5 }));
  }

  function update(dt, time) {
    starTop.rotation.y = time * 1.2;
    starTop.position.y = 3.9 + Math.sin(time * 2) * 0.1;
    water.material.emissiveIntensity = 0.3 + Math.sin(time * 3) * 0.08;
    if (Math.random() < 0.7) {
      const a = Math.random() * Math.PI * 2;
      game.particles.glow.emit({
        pos: { x: 0, y: 3.1, z: 0 },
        vel: { x: Math.sin(a) * 1.6, y: 4.5, z: Math.cos(a) * 1.6 },
        velRandom: 0.3,
        gravity: 9,
        color: [0x9df2ff, 0xc4f4ff, 0xffffff, 0xff9de2],
        size: 0.32,
        sizeEnd: 0.15,
        life: 1.1,
        count: 2,
      });
    }
    for (const s of shops) {
      s.sign.rotation.y = time * 0.5;
      s.saucer.position.y = UFO_HEIGHT + Math.sin(time * 1.2 + s.phase) * 0.12;
      s.saucer.rotation.y = Math.sin(time * 0.3 + s.phase) * 0.05;
      s.beamMat.uniforms.uTime.value = time;
      s.lights.forEach((m, i) => (m.emissiveIntensity = Math.sin(time * 6 - i * 0.6) > 0 ? 3 : 0.5));
      if (Math.random() < 0.5) {
        const a = Math.random() * Math.PI * 2;
        const rr = Math.random() * 1.8;
        game.particles.glow.emit({
          pos: { x: s.pos.x + Math.sin(a) * rr, y: 0.2, z: s.pos.z + Math.cos(a) * rr },
          vel: { x: 0, y: 2.5, z: 0 },
          velRandom: 0.2,
          color: s.cfg.beamColor,
          size: 0.25,
          sizeEnd: 0.05,
          life: 2,
        });
      }
    }
    for (const m of mushrooms) m.m.children[1].material.emissiveIntensity = 0.3 + Math.sin(time * 2 + m.phase) * 0.15;
    for (const a of asteroids) {
      a.a += dt * a.speed;
      a.g.position.set(Math.sin(a.a) * a.rad, a.y + Math.sin(time * 0.5 + a.phase) * 1.5, Math.cos(a.a) * a.rad);
      a.g.rotation.y += dt * a.spin;
      a.g.rotation.x += dt * a.spin * 0.5;
    }
  }

  return { root, rockets, shops, trampoline: { pos: trampPos, radius: 2.05, top: 0.9 }, kickables, randomFree, free, obstacles, update };
}
