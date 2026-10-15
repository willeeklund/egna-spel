import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Fountain } from './fountain.js';
import { Pond } from './pond.js';
import { Tunnel, HOLE } from './tunnel.js';
import * as fx from './fx.js';

const HOUSE = { Villa: { hp: 3, pts: 300 }, Hyreshus: { hp: 5, pts: 500 }, Skyskrapa: { hp: 6, pts: 800 } };
const RUBBLE = [0x9a9a9a, 0x7d7d7d, 0xb5a58f, 0x6b6e72];

export const PITCH = 70;
export const ROAD = 14;
export const N = 3;
export const HALF = (N + 0.5) * PITCH;
export const roadLines = [];
for (let i = -N - 1; i <= N; i++) roadLines.push((i + 0.5) * PITCH);

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const std = (color, roughness = 0.8, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function speckle(g, w, h, n, colors) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = pick(colors);
    g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}

function windowTex(base, glass, frame) {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 600, ['rgba(0,0,0,0.06)', 'rgba(255,255,255,0.06)']);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) {
      const px = 7 + x * 30, py = 8 + y * 31;
      g.fillStyle = frame; g.fillRect(px - 2, py - 2, 26, 26);
      const grad = g.createLinearGradient(px, py, px + 22, py + 22);
      grad.addColorStop(0, glass[0]); grad.addColorStop(1, glass[1]);
      g.fillStyle = grad; g.fillRect(px, py, 22, 22);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(px + 2, py + 2, 6, 18);
    }
  });
}

function makeTextures() {
  return {
    office: [
      windowTex('#9fb3c4', ['#2f7fd6', '#bfe2ff'], '#5f7488'),
      windowTex('#1f8a8a', ['#2fc0c0', '#c8fff6'], '#136060'),
      windowTex('#2f4f8f', ['#3f7fe0', '#a8d4ff'], '#1d3260'),
      windowTex('#d9b25a', ['#c88a1a', '#ffe7a8'], '#8a6a20'),
      windowTex('#3f8f5a', ['#3fbf7a', '#c8ffd8'], '#22603a'),
      windowTex('#c9cdd2', ['#3f6f9e', '#9fd0f5'], '#8a9099'),
    ],
    apartment: [
      windowTex('#c4512f', ['#3f88d0', '#cde7ff'], '#fff3e0'),
      windowTex('#f2c14e', ['#3f88d0', '#cde7ff'], '#ffffff'),
      windowTex('#ec8ca6', ['#3f88d0', '#d8ecff'], '#ffffff'),
      windowTex('#7cc6a4', ['#2f78c0', '#d8ecff'], '#ffffff'),
      windowTex('#6aa6e0', ['#2a5f9a', '#d8ecff'], '#ffffff'),
      windowTex('#f08a3c', ['#3f88d0', '#d8ecff'], '#fff3e0'),
    ],
    road: canvasTex(128, 512, (g, w, h) => {
      g.fillStyle = '#4a4d52'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 4000, ['#3f4246', '#55585d', '#5e6166', '#46494d']);
      g.fillStyle = '#f2f2f2';
      g.fillRect(w / 2 - 2, 0, 4, h * 0.55);
      g.fillRect(6, 0, 3, h); g.fillRect(w - 9, 0, 3, h);
    }),
    grass: canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#5fb83f'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 9000, ['#52a836', '#6cc64a', '#4f9e35', '#7fd458']);
    }),
    paving: canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#b9b5ad'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 1500, ['#aaa69e', '#c6c2ba']);
      g.strokeStyle = '#9d9991'; g.lineWidth = 2;
      for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); }
    }),
  };
}

const bakedMats = new Map();
function bakedMat(roughness, metalness) {
  const key = `${roughness}-${metalness}`;
  if (!bakedMats.has(key)) bakedMats.set(key, new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness }));
  return bakedMats.get(key);
}

export function bake(group, { roughness = 0.6, metalness = 0.1 } = {}) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const geos = [];
  const m = new THREE.Matrix4();
  group.traverse((o) => {
    if (!o.isMesh) return;
    m.multiplyMatrices(inv, o.matrixWorld);
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(m);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
    const c = o.material.color.clone();
    const e = o.material.emissive;
    if (e && o.material.emissiveIntensity > 0.3 && e.r + e.g + e.b > 0.3) c.lerp(e, 0.5).multiplyScalar(1.4);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    geos.push(g);
  });
  const mesh = new THREE.Mesh(mergeGeometries(geos), bakedMat(roughness, metalness));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const out = new THREE.Group();
  out.add(mesh);
  return out;
}

export class City {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.world = game.world;
    this.mat = game.physMat;
    this.tex = makeTextures();
    this.buildings = [];
    this.props = [];
    this.chunks = [];
    this.collapsing = [];
    this.ruins = [];
    this.templates = {};
    this.buildMaterials();
    this.buildPropTemplates();
    this.buildGround();
    this.buildBlocks();
    this.buildStreetProps();
    this.buildOutskirts();
    this.buildBounds();
    this.buildFlowers();
    this.flushBatch();
    this.camBoxes.push(...this.buildings.filter((b) => !b.noCam));
  }

  batch(obj) {
    obj.updateMatrixWorld(true);
    this.batches ??= new Map();
    obj.traverse((o) => {
      if (!o.isMesh) return;
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      const key = o.material.uuid + (o.castShadow ? 's' : '');
      if (!this.batches.has(key)) this.batches.set(key, { mat: o.material, cast: o.castShadow, geos: [] });
      this.batches.get(key).geos.push(g);
    });
  }

  flushBatch() {
    for (const { mat, cast, geos } of this.batches.values()) {
      const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
      mesh.castShadow = cast;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }
    this.batches.clear();
  }

  buildMaterials() {
    this.m = {
      concrete: std(0xc4c1ba, 0.9),
      roof: std(0x6b6e72, 0.9),
      roofTop: std(0x55585c, 0.85),
      trunk: std(0x6b4a2b, 1),
      leaf: [std(0x3f8f3a, 0.9, 0, { flatShading: true }), std(0x4fa043, 0.9, 0, { flatShading: true }), std(0x2f7a35, 0.9, 0, { flatShading: true })],
      villaWalls: [0xf6d55c, 0xe8735a, 0x6fb3e8, 0xfff5e0, 0x8fd18a, 0xf59ac0, 0xc0392b, 0xf4a340, 0xb48ee0].map((c) => std(c, 0.85)),
      villaRoofs: [0x8a2f1f, 0x3c3f45, 0x1f4f8a, 0x2e6b3a, 0x5a2f22].map((c) => std(c, 0.8)),
      winBlue: std(0x9fd3ff, 0.1, 0.4, { emissive: 0x24476b, emissiveIntensity: 0.25 }),
      white: std(0xffffff, 0.7),
      door: std(0x6d3f22, 0.7),
      water: std(0x4fa8e0, 0.05, 0.2),
      stone: std(0x9e9a93, 0.9),
      gold: std(0xe0b33a, 0.3, 0.9),
      flowers: [0xff3b5c, 0xffd23f, 0xff7ad9, 0x9b59ff, 0xffffff, 0xff8a1f].map((c) => std(c, 0.7, 0, { flatShading: true })),
      stem: std(0x2f8a2a, 0.9),
      awnings: [0xe63946, 0x2a9d8f, 0xf4a261, 0x457b9d, 0xffb703, 0x9b5de5].map((c) => std(c, 0.8)),
    };
  }

  addStatic(x, y, z, hx, hy, hz, rotY = 0) {
    const b = new CANNON.Body({ mass: 0, material: this.mat, type: CANNON.Body.STATIC });
    b.addShape(new CANNON.Box(new CANNON.Vec3(hx, hy, hz)));
    b.position.set(x, y, z);
    if (rotY) b.quaternion.setFromEuler(0, rotY, 0);
    this.world.addBody(b);
    return b;
  }

  addBuilding(x, z, w, h, d, materials, opts = {}) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, materials);
    mesh.position.set(x, 0.2 + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    const body = this.addStatic(x, 0.2 + h / 2, z, w / 2, h / 2, d / 2);
    const b = this.house({ min: new THREE.Vector3(x - w / 2, 0, z - d / 2), max: new THREE.Vector3(x + w / 2, h + 0.2, z + d / 2), name: opts.name || 'Hus', glass: !!opts.glass }, [mesh], body);
    b.tint = materials.filter((m) => m !== this.m.roofTop);
    b.chunkMat = materials[0];
    return b;
  }

  house(b, meshes, body) {
    const def = HOUSE[b.name];
    Object.assign(b, { meshes, body, hp: def.hp, maxHp: def.hp, pts: def.pts, shakeT: 0 });
    this.buildings.push(b);
    return b;
  }

  damageBuilding(b, amount = 1) {
    if (!b.maxHp || b.hp <= 0) return null;
    b.hp -= amount;
    b.shakeT = 0.35;
    const k = Math.max(0, b.hp) / b.maxHp;
    for (const m of b.tint || []) m.color.setScalar(0.45 + 0.55 * k);
    if (b.hp > 0) return { left: b.hp };
    this.collapse(b);
    return { collapsed: true, pts: b.pts };
  }

  collapse(b) {
    this.world.removeBody(b.body);
    this.buildings.splice(this.buildings.indexOf(b), 1);
    const ci = this.camBoxes.indexOf(b);
    if (ci >= 0) this.camBoxes.splice(ci, 1);
    this.mapDirty = true;
    const w = b.max.x - b.min.x, d = b.max.z - b.min.z, h = b.max.y;
    const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
    this.collapsing.push({ b, t: 0, h, cx, cz, w, d, base: b.meshes.map((m) => m.position.clone()) });
    this.game.sfx.rumble();
    this.game.sfx.crash();
    const size = THREE.MathUtils.clamp(Math.min(w, d) / 5, 0.8, 2.6);
    for (let i = 0; i < 16; i++) {
      const s = size * rnd(0.6, 1.2);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(s, s * rnd(0.5, 1), s), Math.random() < 0.5 ? b.chunkMat : std(pick(RUBBLE), 0.9));
      mesh.castShadow = true;
      const p = new THREE.Vector3(cx + rnd(-w / 2, w / 2), rnd(1, Math.min(h, 18)), cz + rnd(-d / 2, d / 2));
      mesh.position.copy(p);
      this.scene.add(mesh);
      const body = new CANNON.Body({ mass: 40, material: this.mat });
      body.addShape(new CANNON.Box(new CANNON.Vec3(s / 2, s * 0.35, s / 2)));
      body.position.set(p.x, p.y, p.z);
      const out = new THREE.Vector3(p.x - cx, 0, p.z - cz).normalize();
      body.velocity.set(out.x * rnd(4, 10), rnd(3, 9), out.z * rnd(4, 10));
      body.angularVelocity.set(rnd(-5, 5), rnd(-5, 5), rnd(-5, 5));
      body.allowSleep = true;
      this.world.addBody(body);
      this.chunks.push({ mesh, body, t: 0 });
    }
    const pile = new THREE.Group();
    for (let i = 0; i < 40; i++) {
      const s = rnd(0.6, 2.4);
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, s * rnd(0.3, 0.6), s * rnd(0.6, 1.2)), std(pick(RUBBLE), 0.9));
      const rx = rnd(-0.5, 0.5), rz = rnd(-0.5, 0.5);
      m.position.set(cx + rx * w, 0.2 + rnd(0, 0.5) * (1 - Math.max(Math.abs(rx), Math.abs(rz)) * 1.6), cz + rz * d);
      m.rotation.set(rnd(-0.3, 0.3), rnd(0, 3), rnd(-0.3, 0.3));
      pile.add(m);
    }
    const rubble = bake(pile, { roughness: 0.95, metalness: 0 });
    rubble.visible = false;
    this.scene.add(rubble);
    this.collapsing.at(-1).rubble = rubble;
  }

  rebuild(r) {
    const { b } = r;
    b.hp = b.maxHp;
    b.shakeT = 0;
    for (const m of b.tint || []) m.color.setScalar(1);
    b.meshes.forEach((m, j) => { m.visible = true; m.rotation.x = m.rotation.z = 0; m.position.copy(r.base[j]).y -= r.h + 2; });
    this.world.addBody(b.body);
    this.buildings.push(b);
    if (!b.noCam) this.camBoxes.push(b);
    this.mapDirty = true;
    this.scene.remove(r.rubble);
    r.rubble.children[0].geometry.dispose();
    r.riseT = 0;
    this.game.sfx.rumble();
  }

  blockedByMover(b, movers) {
    return movers.some((p) => p.x > b.min.x - 1.5 && p.x < b.max.x + 1.5 && p.z > b.min.z - 1.5 && p.z < b.max.z + 1.5 && p.y < b.max.y);
  }

  update(dt, movers = []) {
    for (let i = this.ruins.length - 1; i >= 0; i--) {
      const r = this.ruins[i];
      if (r.riseT === undefined) {
        r.wait -= dt;
        if (r.wait > 0) continue;
        if (this.blockedByMover(r.b, movers)) { r.wait = 1; continue; }
        this.rebuild(r);
      }
      r.riseT += dt;
      const k = Math.min(1, r.riseT / 1.8);
      const e = 1 - (1 - k) * (1 - k);
      r.b.meshes.forEach((m, j) => m.position.set(r.base[j].x, r.base[j].y - (r.h + 2) * (1 - e), r.base[j].z));
      if (Math.random() < dt * 25) fx.dust(new THREE.Vector3(r.cx + rnd(-r.w / 2, r.w / 2), 0.5, r.cz + rnd(-r.d / 2, r.d / 2)), 2, 3, 1.8);
      if (k >= 1) this.ruins.splice(i, 1);
    }
    for (const b of this.buildings) {
      if (!(b.shakeT > 0)) continue;
      b.shakeT = Math.max(0, b.shakeT - dt);
      const a = b.shakeT * 0.6;
      for (const m of b.meshes) { m.rotation.z = Math.sin(b.shakeT * 70) * a * 0.02; m.rotation.x = Math.cos(b.shakeT * 60) * a * 0.015; }
    }
    for (let i = this.collapsing.length - 1; i >= 0; i--) {
      const c = this.collapsing[i];
      c.t += dt;
      const k = Math.min(1, c.t / 2.6);
      const drop = (c.h + 2) * k * k;
      c.b.meshes.forEach((m, j) => {
        m.position.set(c.base[j].x + (Math.random() - 0.5) * 0.4, c.base[j].y - drop, c.base[j].z + (Math.random() - 0.5) * 0.4);
        m.rotation.z = Math.sin(c.t * 9) * 0.02;
      });
      if (Math.random() < dt * 30) {
        const side = Math.random() < 0.5;
        const px = c.cx + (side ? (Math.random() < 0.5 ? -1 : 1) * c.w / 2 : rnd(-c.w / 2, c.w / 2));
        const pz = c.cz + (side ? rnd(-c.d / 2, c.d / 2) : (Math.random() < 0.5 ? -1 : 1) * c.d / 2);
        fx.dust(new THREE.Vector3(px, 0.5, pz), 3, 4, 2.2);
      }
      if (k >= 1) {
        for (const m of c.b.meshes) m.visible = false;
        c.rubble.visible = true;
        fx.dust(new THREE.Vector3(c.cx, 1, c.cz), 30, Math.max(c.w, c.d) * 0.7, 2.5);
        this.collapsing.splice(i, 1);
        this.ruins.push({ ...c, wait: rnd(20, 25) - 2.6 });
      }
    }
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const ch = this.chunks[i];
      ch.t += dt;
      ch.mesh.position.copy(ch.body.position);
      ch.mesh.quaternion.copy(ch.body.quaternion);
      if (ch.t > 30) {
        this.scene.remove(ch.mesh);
        this.world.removeBody(ch.body);
        this.chunks.splice(i, 1);
      }
    }
  }

  windowMats(texSet, w, h, d) {
    const base = pick(texSet);
    const side = (len) => {
      const t = base.clone();
      t.needsUpdate = true;
      t.repeat.set(Math.max(1, Math.round(len / 12)), Math.max(1, Math.round(h / 28 * 2) / 2));
      return std(0xffffff, 0.55, 0.1, { map: t });
    };
    const sx = side(d), sz = side(w);
    return [sx, sx, this.m.roofTop, this.m.roofTop, sz, sz];
  }

  slabAround(x0, x1, z0, z1, y0, y1, h) {
    const box = (a0, a1, b0, b1) => this.addStatic((a0 + a1) / 2, (y0 + y1) / 2, (b0 + b1) / 2, (a1 - a0) / 2, (y1 - y0) / 2, (b1 - b0) / 2);
    box(x0, h.x0, z0, z1);
    box(h.x1, x1, z0, z1);
    box(h.x0, h.x1, z0, h.z0);
    box(h.x0, h.x1, h.z1, z1);
  }

  holeShape(x0, x1, z0, z1, h) {
    const rect = (a0, a1, b0, b1, P) => new P([new THREE.Vector2(a0, -b0), new THREE.Vector2(a1, -b0), new THREE.Vector2(a1, -b1), new THREE.Vector2(a0, -b1)]);
    const s = rect(x0, x1, z0, z1, THREE.Shape);
    s.holes.push(rect(h.x0, h.x1, h.z0, h.z1, THREE.Path));
    return s;
  }

  buildGround() {
    const grass = this.tex.grass.clone(); grass.needsUpdate = true; grass.repeat.set(1 / 12, 1 / 12);
    const groundGeo = new THREE.ShapeGeometry(this.holeShape(-1200, 1200, -1200, 1200, HOLE));
    groundGeo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(groundGeo, std(0xffffff, 1, 0, { map: grass, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 }));
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.slabAround(-1200, 1200, -1200, 1200, -1.5, 0, HOLE);

    const len = 2 * HALF + ROAD;
    for (const axis of ['x', 'z']) {
      for (const r of roadLines) {
        const t = this.tex.road.clone(); t.needsUpdate = true; t.repeat.set(1, len / 14);
        const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD, len), std(0xffffff, 0.92, 0, { map: t }));
        road.rotation.x = -Math.PI / 2;
        if (axis === 'x') { road.rotation.z = Math.PI / 2; road.position.set(0, 0.03, r); }
        else road.position.set(r, 0.036, 0);
        road.receiveShadow = true;
        this.scene.add(road);
      }
    }
    const squares = [];
    for (const a of roadLines) for (const b of roadLines) {
      const g = new THREE.PlaneGeometry(ROAD, ROAD);
      g.rotateX(-Math.PI / 2);
      g.translate(a, 0.042, b);
      squares.push(g);
    }
    const isect = new THREE.Mesh(mergeGeometries(squares), std(0x4a4d52, 0.95));
    isect.receiveShadow = true;
    this.scene.add(isect);

    const stripes = [];
    for (const a of roadLines) for (const b of roadLines) {
      for (const [dx, dz, rot] of [[0, ROAD / 2 + 2, 0], [0, -ROAD / 2 - 2, 0], [ROAD / 2 + 2, 0, 1], [-ROAD / 2 - 2, 0, 1]]) {
        for (let k = -2; k <= 2; k++) {
          const g = new THREE.PlaneGeometry(rot ? 2.6 : 1, rot ? 1 : 2.6);
          g.rotateX(-Math.PI / 2);
          g.translate(a + dx + (rot ? 0 : k * 2.2), 0.048, b + dz + (rot ? k * 2.2 : 0));
          stripes.push(g);
        }
      }
    }
    const zebra = new THREE.Mesh(mergeGeometries(stripes), std(0xf4f4f4, 0.8));
    zebra.receiveShadow = true;
    this.scene.add(zebra);
  }

  blockKind(i, j) {
    const ring = Math.max(Math.abs(i), Math.abs(j));
    if (i === 0 && j === 0) return 'plaza';
    if ((i === 2 && j === -2) || (i === -2 && j === 2)) return 'park';
    if (ring <= 1) return 'downtown';
    if (ring === 2) return 'apartments';
    return 'villas';
  }

  buildBlocks() {
    const B = PITCH - ROAD;
    const pav = this.tex.paving.clone(); pav.needsUpdate = true; pav.repeat.set(B / 4, B / 4);
    const pavMat = std(0xffffff, 0.9, 0, { map: pav });
    const lawn = this.tex.grass.clone(); lawn.needsUpdate = true; lawn.repeat.set(8, 8);
    const lawnMat = std(0xffffff, 1, 0, { map: lawn });
    for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) {
      const cx = i * PITCH, cz = j * PITCH;
      const kind = this.blockKind(i, j);
      if (kind === 'plaza') {
        const ptex = this.tex.paving.clone(); ptex.needsUpdate = true; ptex.repeat.set(1 / 4, 1 / 4);
        const geo = new THREE.ExtrudeGeometry(this.holeShape(cx - B / 2, cx + B / 2, cz - B / 2, cz + B / 2, HOLE), { depth: 0.2, bevelEnabled: false });
        geo.rotateX(-Math.PI / 2);
        const top = new THREE.Mesh(geo, std(0xffffff, 0.9, 0, { map: ptex }));
        top.castShadow = top.receiveShadow = true;
        this.scene.add(top);
        this.slabAround(cx - B / 2, cx + B / 2, cz - B / 2, cz + B / 2, 0, 0.2, HOLE);
      } else {
        const base = new THREE.Mesh(new THREE.BoxGeometry(B, 0.2, B), kind === 'downtown' ? pavMat : this.m.concrete);
        base.position.set(cx, 0.1, cz);
        this.batch(base);
        this.addStatic(cx, 0.1, cz, B / 2, 0.1, B / 2);
      }
      if (kind === 'villas' || kind === 'park' || kind === 'apartments') {
        const lot = new THREE.Mesh(new THREE.PlaneGeometry(B - 6, B - 6), lawnMat);
        lot.rotation.x = -Math.PI / 2;
        lot.position.set(cx, 0.205, cz);
        this.batch(lot);
      }
      this[kind](cx, cz);
    }
  }

  downtown(cx, cz) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const w = rnd(15, 21), d = rnd(15, 21), h = rnd(28, 95);
      const x = cx + sx * 12.5, z = cz + sz * 12.5;
      const b = this.addBuilding(x, z, w, h, d, this.windowMats(this.tex.office, w, h, d), { name: 'Skyskrapa', glass: true });
      if (Math.random() < 0.5) {
        const top = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 4, d * 0.5), this.m.roof);
        top.position.set(x, 0.2 + h + 2, z);
        top.castShadow = true;
        this.scene.add(top);
        b.meshes.push(top);
      }
    }
    for (let k = 0; k < 3; k++) this.spawnProp(pick(['crate', 'crate', 'cone', 'trash']), cx + rnd(-3, 3), cz + rnd(-26, 26), rnd(0, 6));
  }

  apartments(cx, cz) {
    const along = Math.random() < 0.5;
    for (const s of [-1, 1]) {
      const w = along ? 44 : 15, d = along ? 15 : 44, h = rnd(12, 22);
      const x = cx + (along ? 0 : s * 13), z = cz + (along ? s * 13 : 0);
      const b = this.addBuilding(x, z, w, h, d, this.windowMats(this.tex.apartment, w, h, d), { name: 'Hyreshus' });
      const awnings = new THREE.Group();
      for (const fs of [-1, 1]) for (let k = -1; k <= 1; k++) {
        const aw = new THREE.Mesh(new THREE.BoxGeometry(along ? 6 : 1.8, 0.18, along ? 1.8 : 6), pick(this.m.awnings));
        aw.castShadow = true;
        if (along) { aw.position.set(x + k * 13, 3.6, z + fs * (d / 2 + 0.9)); aw.rotation.x = fs * 0.35; }
        else { aw.position.set(x + fs * (w / 2 + 0.9), 3.6, z + k * 13); aw.rotation.z = -fs * 0.35; }
        awnings.add(aw);
      }
      const baked = bake(awnings, { roughness: 0.8, metalness: 0 });
      this.scene.add(baked);
      b.meshes.push(baked);
    }
    for (let k = 0; k < 3; k++) this.tree(cx + (along ? rnd(-20, 20) : rnd(-2, 2)), cz + (along ? rnd(-2, 2) : rnd(-20, 20)));
    this.spawnProp('bench', cx + (along ? 8 : 0), cz + (along ? 0 : 8), along ? 0 : Math.PI / 2);
  }

  villas(cx, cz) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const qx = cx + sx * 12.5, qz = cz + sz * 12.5;
      this.villa(qx, qz - sz * 1.5, sz);
      const fz = cz + sz * 24.6;
      for (const fx of [-7.5, 7.5]) this.spawnProp('fence', qx + fx, fz, 0);
      this.spawnProp('mailbox', qx + 3.2, fz - sz * 0.2, sz > 0 ? 0 : Math.PI);
      this.spawnProp('gnome', qx + rnd(-8, 8), qz + sz * 7 + rnd(-1, 1), rnd(0, 6));
      if (Math.random() < 0.6) this.tree(qx + sx * 9, qz - sz * 8);
      if (Math.random() < 0.35) this.spawnProp('trash', qx - sx * 9, qz + sz * 5, 0);
      this.flowerBed(qx - 6, qz + sz * 9, 7, 1.4);
      this.flowerBed(qx + 6, qz + sz * 9, 7, 1.4);
    }
  }

  villa(x, z, facing) {
    const w = rnd(10, 12), d = rnd(8, 9), h = rnd(4.2, 5.5);
    const wall = pick(this.m.villaWalls);
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall);
    body.position.y = h / 2;
    const roofGeo = new THREE.ConeGeometry(1, 1, 4, 1);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, pick(this.m.villaRoofs));
    roof.scale.set((w + 1.2) / Math.SQRT2, rnd(3, 4.2), (d + 1.2) / Math.SQRT2);
    roof.position.y = h + roof.scale.y / 2;
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.5, 0.8), this.m.stone);
    chimney.position.set(w * 0.25, h + 1.8, -d * 0.15);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.3, 0.15), this.m.door);
    door.position.set(0, 1.15, d / 2 + 0.05);
    g.add(body, roof, chimney, door);
    for (const side of [1, -1]) for (const wx of [-w * 0.3, w * 0.3]) {
      if (side === 1 && Math.abs(wx) < 1.5) continue;
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.12), this.m.winBlue);
      win.position.set(wx, h * 0.55, side * (d / 2 + 0.04));
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.7, 0.08), this.m.white);
      frame.position.copy(win.position); frame.position.z -= side * 0.03;
      g.add(frame, win);
    }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const out = bake(g, { roughness: 0.75, metalness: 0.05 });
    const mat = out.children[0].material = out.children[0].material.clone();
    out.position.set(x, 0.2, z);
    if (facing < 0) out.rotation.y = Math.PI;
    this.scene.add(out);
    const phys = this.addStatic(x, 0.2 + h / 2, z, w / 2, h / 2, d / 2);
    const b = this.house({ min: new THREE.Vector3(x - w / 2, 0, z - d / 2), max: new THREE.Vector3(x + w / 2, h + 3, z + d / 2), name: 'Villa', glass: false }, [out], phys);
    b.tint = [mat];
    b.chunkMat = wall;
  }

  park(cx, cz) {
    this.ponds ??= [];
    this.ponds.push(new Pond(this.scene, cx + 8, cz - 6, 9, this.game.sunDir));
    for (let k = 0; k < 14; k++) {
      const x = cx + rnd(-24, 24), z = cz + rnd(-24, 24);
      if (Math.hypot(x - cx - 8, z - cz + 6) < 11) continue;
      this.tree(x, z);
    }
    for (let k = 0; k < 5; k++) this.spawnProp('bench', cx - 12 + k * 5, cz + 12, 0);
    for (let k = 0; k < 4; k++) this.spawnProp('gnome', cx + rnd(-20, 0), cz + rnd(-20, 5), rnd(0, 6));
    for (let k = 0; k < 6; k++) this.flowerBed(cx + rnd(-22, 22), cz + rnd(-22, 22), 4, 4);
    this.spawnProp('trash', cx - 16, cz + 10, 0);
    this.spawnProp('trash', cx + 14, cz + 12, 0);
  }

  plaza(cx, cz) {
    this.fountain = new Fountain(this.scene, cx, cz, this.game.sunDir);
    this.camBoxes ??= [];
    this.tunnel = new Tunnel(this);
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.4, 2.4), this.m.stone);
    pedestal.position.set(cx, 2.3, cz);
    pedestal.castShadow = pedestal.receiveShadow = true;
    this.scene.add(pedestal);
    const yaw = 0.6;
    const statue = this.game.makeBearModel(this.m.gold, this.m.gold, this.m.gold);
    statue.scale.setScalar(0.75);
    statue.position.set(cx, 4, cz);
    statue.rotation.y = yaw;
    const silver = std(0xe8ecf2, 0.2, 0.95);
    const ratStatue = this.game.makeRatModel(silver, silver, silver);
    ratStatue.scale.setScalar(3.2);
    ratStatue.position.set(0, 3.12, 0.35);
    ratStatue.rotation.y = 0.5;
    statue.add(ratStatue);
    statue.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.scene.add(statue);

    const climb = (b) => { b.userData = { climbable: true }; return b; };
    const SEG = 24;
    for (let i = 0; i < SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      const len = (2 * Math.PI * 7.0) / SEG / 2 + 0.08;
      climb(this.addStatic(cx + Math.cos(a) * 7.0, 0.76, cz + Math.sin(a) * 7.0, 0.4, 0.56, len, -a));
    }
    const floor = new CANNON.Body({ mass: 0, material: this.mat });
    floor.addShape(new CANNON.Cylinder(6.65, 6.65, 0.45, 32));
    floor.position.set(cx, 0.6, cz);
    this.world.addBody(floor);
    climb(this.addStatic(cx, 2.3, cz, 1.2, 1.7, 1.2));
    const off = new THREE.Vector3(0, 1.43, 0.36).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    climb(this.addStatic(cx + off.x, 5.18, cz + off.z, 0.94, 1.18, 1.75, yaw));
    this.statueTop = new THREE.Vector3(cx, 6.1, cz);
    statue.updateMatrixWorld(true);
    const S = 3.2 * 0.75;
    const rc = ratStatue.localToWorld(new THREE.Vector3(0, 0.17, -0.04));
    const ryaw = yaw + 0.5;
    climb(this.addStatic(rc.x, rc.y, rc.z, 0.15 * S, 0.17 * S, 0.27 * S, ryaw));
    this.ratStatueTop = new THREE.Vector3(rc.x, rc.y + 0.17 * S, rc.z);
    this.buildings.push({ min: new THREE.Vector3(cx - 7.4, 0, cz - 7.4), max: new THREE.Vector3(cx + 7.4, 1.3, cz + 7.4), name: 'Fontän', glass: false, noCam: true });

    for (let a = 0; a < 8; a++) {
      const ang = a / 8 * Math.PI * 2;
      const x = cx + Math.cos(ang) * 15, z = cz + Math.sin(ang) * 15;
      if (z < cz - 12 || a === 0) continue;
      this.spawnProp(a % 2 ? 'bench' : 'lamp', x, z, -ang + Math.PI / 2);
    }
    for (let k = 0; k < 6; k++) this.spawnProp('cone', cx + rnd(-20, 20), cz + rnd(20, 25), 0);
    for (let k = 0; k < 4; k++) this.spawnProp('crate', cx - 20 + (k % 2) * 1.1, cz - 20, 0, k < 2 ? 0 : 1.05);
    this.cheeseShop(cx, cz - 21);
  }

  cheeseShop(cx, cz) {
    const W = 14, D = 9, H = 5, T = 0.3, y0 = 0.2;
    const zf = cz + D / 2, zb = cz - D / 2;
    const wallMat = std(0xffe9a8, 0.85), trim = std(0xc0392b, 0.7), roofMat = std(0xb03a2e, 0.8);
    this.camBoxes ??= [];
    const wall = (x, y, z, w, h, d, mat = wallMat, shadow = true) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = shadow; m.receiveShadow = true;
      this.scene.add(m);
      this.addStatic(x, y, z, w / 2, h / 2, d / 2);
      this.camBoxes.push({ min: new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2), max: new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2) });
      return m;
    };
    const hx = cx + 3, hw = 0.8, hh = 0.7;
    wall(cx, y0 + H / 2, zb + T / 2, W, H, T);
    wall(cx - W / 2 + T / 2, y0 + H / 2, cz, T, H, D);
    wall(cx + W / 2 - T / 2, y0 + H / 2, cz, T, H, D);
    const lw = (hx - hw / 2) - (cx - W / 2), rw = (cx + W / 2) - (hx + hw / 2);
    wall(cx - W / 2 + lw / 2, y0 + H / 2, zf - T / 2, lw, H, T);
    wall(cx + W / 2 - rw / 2, y0 + H / 2, zf - T / 2, rw, H, T);
    wall(hx, y0 + hh + (H - hh) / 2, zf - T / 2, hw, H - hh, T);
    wall(cx, y0 + H + 0.15, cz, W + 0.6, 0.3, D + 0.6, roofMat, false);
    this.buildings.push({ min: new THREE.Vector3(cx - W / 2, 0, zb), max: new THREE.Vector3(cx + W / 2, H, zf), name: 'Ostbutik', glass: false, noCam: true });

    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; this.scene.add(m); return m; };
    const floorTex = canvasTex(64, 64, (g) => { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#f5f0e6' : '#2f4f6f'; g.fillRect(i * 32, j * 32, 32, 32); } });
    floorTex.repeat.set(W / 2, D / 2);
    floorTex.magFilter = THREE.NearestFilter;
    const floor = add(new THREE.PlaneGeometry(W - 0.6, D - 0.6), std(0xffffff, 0.6, 0, { map: floorTex }), cx, y0 + 0.01, cz);
    floor.rotation.x = -Math.PI / 2;
    const sign = canvasTex(512, 96, (g, w, h) => {
      g.fillStyle = '#c0392b'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffd23f'; g.font = 'bold 64px "Luckiest Guy", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('🧀 OSTBUTIK 🧀', w / 2, h / 2 + 4);
    });
    sign.wrapS = sign.wrapT = THREE.ClampToEdgeWrapping;
    add(new THREE.BoxGeometry(8, 1.4, 0.2), [trim, trim, trim, trim, std(0xffffff, 0.5, 0, { map: sign }), trim], cx, y0 + H - 0.9, zf + 0.12);
    const glassMat = std(0xbfe6ff, 0.05, 0.3, { transparent: true, opacity: 0.35 });
    for (const x of [cx - 4.5, cx + 0.6]) {
      add(new THREE.BoxGeometry(3, 2, 0.06), glassMat, x, y0 + 1.9, zf + 0.02);
      add(new THREE.BoxGeometry(3.3, 0.15, 0.25), trim, x, y0 + 0.85, zf + 0.1);
    }
    add(new THREE.BoxGeometry(1.4, 2.6, 0.1), std(0x6d3f22, 0.7), cx - 1.6, y0 + 1.3, zf + 0.05);
    const stripes = canvasTex(64, 16, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#ffd23f'; g.fillRect(i * 8, 0, 8, 16); } });
    stripes.repeat.set(4, 1);
    const awning = add(new THREE.BoxGeometry(W, 0.1, 1.8), std(0xffffff, 0.8, 0, { map: stripes }), cx, y0 + 3.4, zf + 0.9);
    awning.rotation.x = 0.3;
    add(new THREE.TorusGeometry(0.45, 0.07, 8, 20, Math.PI), std(0x5a3a1e, 0.9), hx, y0 + 0.28, zf + 0.04);
    const holeSign = canvasTex(128, 48, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#333'; g.font = 'bold 30px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🐭 IN', w / 2, h / 2); });
    add(new THREE.BoxGeometry(0.6, 0.22, 0.03), std(0xffffff, 0.6, 0, { map: holeSign }), hx, y0 + 1.1, zf + 0.03);

    const wood = std(0x9b6a3c, 0.8);
    for (const [sy, x0, x1] of [[0.8, -6.5, 6.5], [1.55, -6.5, 2], [2.3, -6.5, -2.5]]) {
      const w = x1 - x0, mx = cx + (x0 + x1) / 2;
      add(new THREE.BoxGeometry(w, 0.08, 1.0), wood, mx, y0 + sy, zb + 0.8);
      this.addStatic(mx, y0 + sy, zb + 0.8, w / 2, 0.04, 0.5);
    }
    add(new THREE.BoxGeometry(4, 1.0, 1.2), std(0x7a4a28, 0.8), cx - 3, y0 + 0.5, cz + 1.8);
    this.addStatic(cx - 3, y0 + 0.5, cz + 1.8, 2, 0.5, 0.6);
    add(new THREE.BoxGeometry(2, 0.6, 1.5), wood, cx + 2.5, y0 + 0.3, cz);
    this.addStatic(cx + 2.5, y0 + 0.3, cz, 1, 0.3, 0.75);
    const lamp = new THREE.PointLight(0xffe2a0, 6, 14, 1.5);
    lamp.position.set(cx, y0 + 4.2, cz);
    this.scene.add(lamp);

    const cheeseMat = std(0xffc928, 0.45, 0, { emissive: 0x6a4a00, emissiveIntensity: 0.35 });
    const pie = (r, h, angle) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.absarc(0, 0, r, 0, angle, false);
      shape.lineTo(0, 0);
      const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 24 });
      g.rotateX(-Math.PI / 2);
      g.computeBoundingBox();
      const off = g.boundingBox.getCenter(new THREE.Vector3());
      g.translate(-off.x, -off.y, -off.z);
      g.userData = { off, r, h, angle };
      return g;
    };
    const wedge = pie(0.45, 0.3, Math.PI / 2.6);
    const holeMat = std(0xd9a514, 0.6);
    const holeGeo = new THREE.SphereGeometry(1, 10, 8);
    this.cheeses = [];
    const cheese = (x, y, z, big = false) => {
      const geo = big ? pie(0.75, 0.55, Math.PI * 1.7) : wedge;
      const m = add(geo, cheeseMat, x, y + (big ? 0.3 : 0.18), z);
      const { off, r, h, angle } = geo.userData;
      for (let i = 0; i < (big ? 10 : 4); i++) {
        const hole = new THREE.Mesh(holeGeo, holeMat);
        const a = angle * rnd(0.2, 0.8), rr = r * rnd(0.35, 0.8);
        hole.scale.set(1, 0.3, 1).multiplyScalar(big ? rnd(0.05, 0.09) : rnd(0.03, 0.05));
        hole.position.set(rr * Math.cos(a) - off.x, h + 0.02 - off.y, -rr * Math.sin(a) - off.z);
        m.add(hole);
      }
      this.cheeses.push({ mesh: m, base: m.position.y, big, taken: false });
    };
    cheese(cx - 5, y0 + 0.84, zb + 0.8); cheese(cx - 1, y0 + 0.84, zb + 0.8); cheese(cx + 4, y0 + 0.84, zb + 0.8);
    cheese(cx - 3, y0 + 1.59, zb + 0.8); cheese(cx + 1, y0 + 1.59, zb + 0.8);
    cheese(cx - 3.5, y0 + 2.34, zb + 0.8);
    cheese(cx - 3.5, y0 + 1.0, cz + 1.8); cheese(cx + 2.5, y0 + 0.6, cz);
    cheese(cx + 5.5, y0, cz + 3.2);
    cheese(cx - 5, y0 + 2.34, zb + 0.8, true);
    this.shopDoor = new THREE.Vector3(hx, 0, zf + 1);
    this.shopCenter = new THREE.Vector3(cx, 0, cz);
  }

  flowerBed(x, z, w, d) {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, d), std(0x5a3a22, 1));
    bed.position.set(x, 0.27, z);
    this.batch(bed);
    this.flowers ??= [];
    const ci = (Math.random() * this.m.flowers.length) | 0;
    for (let i = 0; i < w * d * 1.5; i++) {
      const c = Math.random() < 0.7 ? ci : (Math.random() * this.m.flowers.length) | 0;
      this.flowers.push({ x: x + rnd(-w / 2 + 0.2, w / 2 - 0.2), y: rnd(0.5, 0.7), z: z + rnd(-d / 2 + 0.2, d / 2 - 0.2), c, rot: rnd(0, 6), alive: true });
    }
  }

  buildFlowers() {
    const list = this.flowers || [];
    const bloomGeo = new THREE.IcosahedronGeometry(0.18, 0);
    const stemGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 5).translate(0, 0.5, 0);
    const counts = this.m.flowers.map(() => 0);
    for (const f of list) f.i = counts[f.c]++;
    this.bloomMeshes = this.m.flowers.map((mat, c) => new THREE.InstancedMesh(bloomGeo, mat, Math.max(1, counts[c])));
    this.stemMesh = new THREE.InstancedMesh(stemGeo, this.m.stem, Math.max(1, list.length));
    this.flowerGrid = new Map();
    list.forEach((f, k) => {
      f.k = k;
      this.setFlower(f, false);
      const key = `${Math.floor(f.x / 4)},${Math.floor(f.z / 4)}`;
      if (!this.flowerGrid.has(key)) this.flowerGrid.set(key, []);
      this.flowerGrid.get(key).push(f);
    });
    for (const m of [...this.bloomMeshes, this.stemMesh]) { m.receiveShadow = true; this.scene.add(m); }
  }

  setFlower(f, broken) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    if (broken) {
      e.set(Math.PI / 2 - 0.15, f.rot, 0, 'YXZ');
      m.compose(new THREE.Vector3(f.x, 0.36, f.z), q.setFromEuler(e), new THREE.Vector3(1, f.y - 0.3, 1));
      this.stemMesh.setMatrixAt(f.k, m);
      const tip = new THREE.Vector3(0, 1, 0).applyQuaternion(q).multiplyScalar(f.y - 0.3);
      m.compose(new THREE.Vector3(f.x + tip.x, 0.38, f.z + tip.z), q.setFromEuler(e.set(0, f.rot, 0)), new THREE.Vector3(1.3, 0.25, 1.3));
    } else {
      m.compose(new THREE.Vector3(f.x, 0.33, f.z), q.identity(), new THREE.Vector3(1, f.y - 0.33, 1));
      this.stemMesh.setMatrixAt(f.k, m);
      m.compose(new THREE.Vector3(f.x, f.y, f.z), q.setFromEuler(e.set(0, f.rot, 0)), new THREE.Vector3(1, 1, 1));
    }
    this.bloomMeshes[f.c].setMatrixAt(f.i, m);
    this.stemMesh.instanceMatrix.needsUpdate = true;
    this.bloomMeshes[f.c].instanceMatrix.needsUpdate = true;
  }

  trample(pos, r) {
    if (!this.flowerGrid || pos.y > 1.2 || pos.y < -0.5) return 0;
    let n = 0;
    for (let gx = Math.floor((pos.x - r) / 4); gx <= Math.floor((pos.x + r) / 4); gx++) {
      for (let gz = Math.floor((pos.z - r) / 4); gz <= Math.floor((pos.z + r) / 4); gz++) {
        for (const f of this.flowerGrid.get(`${gx},${gz}`) || []) {
          if (!f.alive || Math.hypot(f.x - pos.x, f.z - pos.z) > r) continue;
          f.alive = false;
          this.setFlower(f, true);
          fx.debris(new THREE.Vector3(f.x, f.y, f.z), [this.m.flowers[f.c].color.getHex(), 0x2f8a2a], 4, 3);
          n++;
        }
      }
    }
    return n;
  }

  tree(x, z, collide = true) {
    if (!this.templates.tree) {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 3.2, 8), this.m.trunk);
      trunk.position.y = 1.6;
      g.add(trunk);
      for (const [px, py, pz, r] of [[0, 4.2, 0, 2.2], [0.9, 3.6, 0.4, 1.6], [-0.8, 3.7, -0.5, 1.6], [0, 5.4, 0, 1.5]]) {
        const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), this.m.leaf[0]);
        leaf.position.set(px, py, pz);
        g.add(leaf);
      }
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      this.templates.tree = g;
    }
    const t = this.templates.tree.clone();
    const leafMat = pick(this.m.leaf);
    t.children.forEach((c, i) => { if (i > 0) c.material = leafMat; });
    t.position.set(x, 0.2, z);
    t.rotation.y = Math.random() * 6;
    t.scale.setScalar(rnd(0.85, 1.3));
    this.batch(t);
    if (collide) this.addStatic(x, 1.8, z, 0.45, 1.6, 0.45);
  }

  buildOutskirts() {
    for (let k = 0; k < 260; k++) {
      const a = Math.random() * Math.PI * 2;
      const r = rnd(HALF + 16, HALF + 150);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.max(Math.abs(x), Math.abs(z)) < HALF + 14) continue;
      this.tree(x, z, false);
    }
  }

  buildBounds() {
    const L = HALF + 12;
    for (const [x, z, hx, hz] of [[L, 0, 1, L], [-L, 0, 1, L], [0, L, L, 1], [0, -L, L, 1]]) this.addStatic(x, 10, z, hx, 10, hz);
  }

  buildStreetProps() {
    const near = (t) => roadLines.some((r) => Math.abs(t - r) < 12);
    for (const axis of ['x', 'z']) for (const r of roadLines) for (const s of [-1, 1]) {
      const off = r + s * 8.6;
      if (Math.abs(off) > HALF) continue;
      let slot = 0;
      for (let t = -HALF + 14; t < HALF - 10; t += 16) {
        if (near(t)) continue;
        slot++;
        let type;
        if (slot % 3 === 0) type = 'lamp';
        else {
          const roll = Math.random();
          type = roll < 0.25 ? 'trash' : roll < 0.4 ? 'hydrant' : roll < 0.52 ? 'bench' : roll < 0.6 ? 'cone' : null;
        }
        if (!type) continue;
        const rot = axis === 'z' ? (s > 0 ? -Math.PI / 2 : Math.PI / 2) : (s > 0 ? Math.PI : 0);
        const x = axis === 'z' ? off : t;
        const z = axis === 'z' ? t : off;
        this.spawnProp(type, x, z, rot);
      }
    }
  }

  buildPropTemplates() {
    const M = {
      green: std(0x8d939b, 0.6, 0.3), darkGreen: std(0x5c6168, 0.6, 0.3),
      red: std(0xd8322a, 0.5, 0.3), hydrant: std(0xff1010, 0.4, 0.1), hydrantCap: std(0xffffff, 0.5), yellow: std(0xf2c230, 0.6),
      wood: std(0xa8743f, 0.85), darkMetal: std(0x3a3d42, 0.5, 0.7),
      blue: std(0x2e6fd1, 0.5), white: std(0xf7f7f2, 0.7), skin: std(0xf2c9a0, 0.7),
      orange: std(0xff6a1a, 0.6), lamp: std(0xfff6d0, 0.3, 0, { emissive: 0xfff2b0, emissiveIntensity: 0.4 }),
      brown: std(0x5a3a1e, 0.8),
    };
    const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
    const make = (...children) => { const g = new THREE.Group(); g.add(...children); g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; };

    this.propDefs = {
      trash: { name: 'Soptunna', pts: 50, mission: 'trash', mass: 15, half: [0.45, 0.6, 0.45], colors: [0x8d939b, 0x6b5a3a, 0xdddddd], sound: 'metal',
        build: () => make(mesh(new THREE.CylinderGeometry(0.42, 0.36, 1.1, 14), M.green, 0, -0.05), mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.12, 14), M.darkGreen, 0, 0.55)) },
      hydrant: { name: 'Brandpost', pts: 75, mission: 'hydrant', mass: 35, half: [0.38, 0.6, 0.38], colors: [0xff1010, 0x6ec3ff], sound: 'metal', spray: true,
        build: () => make(mesh(new THREE.CylinderGeometry(0.28, 0.33, 1.05, 14), M.hydrant, 0, -0.07), mesh(new THREE.SphereGeometry(0.3, 14, 10), M.hydrant, 0, 0.45), mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 10).rotateZ(Math.PI / 2), M.hydrant, 0, 0.1), mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 14), M.hydrant, 0, -0.55), mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8), M.hydrantCap, 0, 0.76)) },
      mailbox: { name: 'Brevlåda', pts: 50, mission: 'mailbox', mass: 10, half: [0.3, 0.65, 0.3], colors: [0x2e6fd1, 0xffffff, 0xa8743f], sound: 'metal',
        build: () => make(mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), M.wood, 0, -0.15), mesh(new THREE.BoxGeometry(0.5, 0.4, 0.6), M.blue, 0, 0.45), mesh(new THREE.BoxGeometry(0.05, 0.3, 0.08), M.red, 0.28, 0.55)) },
      bench: { name: 'Parkbänk', pts: 60, mission: 'bench', mass: 40, half: [1.1, 0.45, 0.35], colors: [0xa8743f, 0x3a3d42], sound: 'wood',
        build: () => make(mesh(new THREE.BoxGeometry(2.2, 0.1, 0.6), M.wood, 0, 0), mesh(new THREE.BoxGeometry(2.2, 0.5, 0.08), M.wood, 0, 0.3, -0.3), mesh(new THREE.BoxGeometry(0.1, 0.45, 0.6), M.darkMetal, -0.95, -0.22), mesh(new THREE.BoxGeometry(0.1, 0.45, 0.6), M.darkMetal, 0.95, -0.22)) },
      lamp: { name: 'Lyktstolpe', pts: 100, mission: 'lamp', mass: 60, half: [0.25, 3, 0.25], colors: [0x3a3d42, 0xfff6d0], sound: 'metal',
        build: () => make(mesh(new THREE.CylinderGeometry(0.1, 0.16, 6, 10), M.darkMetal, 0, 0), mesh(new THREE.BoxGeometry(0.15, 0.15, 1.2), M.darkMetal, 0, 2.9, 0.5), mesh(new THREE.BoxGeometry(0.45, 0.2, 0.7), M.lamp, 0, 2.8, 1.0), mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.3, 10), M.darkMetal, 0, -2.85)) },
      gnome: { name: 'Trädgårdstomte', pts: 80, mission: 'gnome', mass: 4, half: [0.25, 0.42, 0.25], colors: [0xd8322a, 0x2e6fd1, 0xffffff], sound: 'wood',
        build: () => make(mesh(new THREE.CylinderGeometry(0.15, 0.24, 0.4, 10), M.blue, 0, -0.2), mesh(new THREE.SphereGeometry(0.15, 10, 8), M.skin, 0, 0.08), mesh(new THREE.ConeGeometry(0.17, 0.4, 10), M.red, 0, 0.36), mesh(new THREE.ConeGeometry(0.12, 0.22, 8).rotateX(Math.PI), M.white, 0, -0.02, 0.1)) },
      fence: { name: 'Staket', pts: 40, mission: 'fence', mass: 15, half: [1.5, 0.55, 0.08], colors: [0xffffff, 0xf0e6d6], sound: 'wood',
        build: () => {
          const parts = [new THREE.BoxGeometry(3, 0.1, 0.06).translate(0, 0.15, 0), new THREE.BoxGeometry(3, 0.1, 0.06).translate(0, -0.25, 0)];
          for (let k = 0; k < 8; k++) parts.push(new THREE.BoxGeometry(0.16, 1.05, 0.08).translate(-1.35 + k * 0.385, 0, 0.03));
          return make(mesh(mergeGeometries(parts), M.white));
        } },
      crate: { name: 'Trälåda', pts: 30, mission: 'crate', mass: 8, half: [0.5, 0.5, 0.5], colors: [0xa8743f, 0x5a3a1e], sound: 'wood',
        build: () => make(mesh(new THREE.BoxGeometry(1, 1, 1), M.wood), mesh(new THREE.BoxGeometry(1.02, 0.12, 1.02), M.brown, 0, 0.3), mesh(new THREE.BoxGeometry(1.02, 0.12, 1.02), M.brown, 0, -0.3)) },
      cone: { name: 'Trafikkon', pts: 20, mission: 'cone', mass: 2, half: [0.25, 0.38, 0.25], colors: [0xff6a1a, 0xffffff], sound: 'wood',
        build: () => make(mesh(new THREE.ConeGeometry(0.24, 0.72, 14), M.orange, 0, 0.02), mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.1, 14), M.white, 0, 0.0), mesh(new THREE.BoxGeometry(0.55, 0.05, 0.55), M.orange, 0, -0.36)) },
    };
    for (const k in this.propDefs) this.templates[k] = bake(this.propDefs[k].build(), { roughness: 0.55, metalness: 0.05 });
  }

  spawnProp(type, x, z, rotY = 0, yExtra = 0) {
    const def = this.propDefs[type];
    const mesh = this.templates[type].clone();
    const [hx, hy, hz] = def.half;
    const y = 0.2 + hy + yExtra;
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    this.scene.add(mesh);
    const body = new CANNON.Body({ mass: def.mass, material: this.mat, allowSleep: true, sleepSpeedLimit: 0.4, sleepTimeLimit: 0.6, linearDamping: 0.05, angularDamping: 0.1 });
    body.addShape(new CANNON.Box(new CANNON.Vec3(hx, hy, hz)));
    body.position.set(x, y, z);
    body.quaternion.setFromEuler(0, rotY, 0);
    body.sleep();
    const prop = { type, def, mesh, body, knocked: false, inWorld: false, origin: new THREE.Vector3(x, 0.4, z), spray: 0 };
    body.userData = { prop };
    this.props.push(prop);
    return prop;
  }
}
