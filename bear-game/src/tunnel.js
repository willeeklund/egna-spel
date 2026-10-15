import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export const HOLE = { x0: 9, x1: 25, z0: -2.5, z1: 2.5 };
export const FLOOR = -6.5;
const CEIL = -1.5, R = 9, TOP = 0.2;

function tex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function boxGeo(w, h, d, tile = 2) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile);
  }
  return g;
}

function paw(g, x, y, s, color) {
  g.fillStyle = color;
  g.beginPath(); g.ellipse(x, y + s * 0.25, s * 0.55, s * 0.45, 0, 0, Math.PI * 2); g.fill();
  for (const [dx, dy] of [[-0.6, -0.35], [-0.22, -0.68], [0.22, -0.68], [0.6, -0.35]]) {
    g.beginPath(); g.ellipse(x + dx * s, y + dy * s, s * 0.17, s * 0.22, dx * 0.6, 0, Math.PI * 2); g.fill();
  }
}

export class Tunnel {
  constructor(city) {
    this.city = city;
    this.open = false;
    this.ceil = CEIL;
    this.angle = 0;
    this.hatchPos = new THREE.Vector3((HOLE.x0 + HOLE.x1) / 2, 0, (HOLE.z0 + HOLE.z1) / 2);
    const scene = city.scene;

    const brickTex = tex(128, 128, (g, w, h) => {
      g.fillStyle = '#5a3a2a'; g.fillRect(0, 0, w, h);
      for (let r = 0; r < 8; r++) for (let c = -1; c < 4; c++) {
        const x = c * 32 + (r % 2) * 16, y = r * 16;
        const v = 120 + Math.random() * 50;
        g.fillStyle = `rgb(${v + 40},${v * 0.55},${v * 0.4})`;
        g.fillRect(x + 1, y + 1, 30, 14);
      }
    });
    const stoneTex = tex(128, 128, (g, w, h) => {
      g.fillStyle = '#6d6a64'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const v = 95 + Math.random() * 35;
        g.fillStyle = `rgb(${v},${v * 0.97},${v * 0.92})`;
        g.fillRect(i * 32 + 2, j * 32 + 2, 28, 28);
      }
    });
    const plankTex = tex(128, 128, (g, w, h) => {
      for (let i = 0; i < 4; i++) {
        const v = 90 + Math.random() * 30;
        g.fillStyle = `rgb(${v + 30},${v * 0.7},${v * 0.4})`;
        g.fillRect(0, i * 32, w, 32);
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, i * 32, w, 2);
      }
    });
    const brick = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.9 });
    const stone = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.95 });
    const planks = new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.85 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a4a28, roughness: 0.8 });
    const gold = city.m.gold;

    const solid = (x0, x1, y0, y1, z0, z1, mat, { phys = true, tile = 2, shadow = true } = {}) => {
      const m = new THREE.Mesh(boxGeo(x1 - x0, y1 - y0, z1 - z0, tile), mat);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      m.castShadow = shadow; m.receiveShadow = true;
      city.batch(m);
      if (phys) city.addStatic(m.position.x, m.position.y, m.position.z, (x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2);
      return m;
    };

    solid(-R, HOLE.x1, FLOOR - 1, FLOOR, -R, R, stone, { tile: 3 });
    solid(-R - 1, R, CEIL, CEIL + 0.6, -R - 1, R + 1, planks, { phys: false, tile: 3 });
    solid(-R - 1, -R, FLOOR, CEIL, -R - 1, R + 1, brick);
    solid(-R, R, FLOOR, CEIL, R, R + 1, brick);
    solid(-R, R, FLOOR, CEIL, -R - 1, -R, brick);
    solid(R, R + 1, FLOOR, CEIL, -R, HOLE.z0, brick);
    solid(R, R + 1, FLOOR, CEIL, HOLE.z1, R, brick);
    solid(R, HOLE.x1, FLOOR, TOP - 0.01, HOLE.z1, HOLE.z1 + 1, brick);
    solid(R, HOLE.x1, FLOOR, TOP - 0.01, HOLE.z0 - 1, HOLE.z0, brick);
    solid(HOLE.x1, HOLE.x1 + 1, FLOOR, TOP - 0.01, HOLE.z0 - 1, HOLE.z1 + 1, brick);
    for (const z of [-R + 0.3, R - 0.3]) for (let x = -R + 3; x < R; x += 6) solid(x - 0.2, x + 0.2, FLOOR, CEIL, z - 0.3, z + 0.3, wood, { phys: false, tile: 1 });

    const dx = HOLE.x1 - R, dy = TOP - FLOOR;
    const STEPS = 20, run = dx / STEPS, rise = dy / STEPS;
    for (let i = 0; i < STEPS; i++) {
      const top = FLOOR + (i + 0.5) * rise;
      solid(R + i * run, R + (i + 1) * run, FLOOR - 0.5, top, HOLE.z0, HOLE.z1, stone, { phys: false, tile: 1.5 });
    }
    const ang = Math.atan2(dy, dx), L = Math.hypot(dx, dy);
    const ramp = new CANNON.Body({ mass: 0, material: city.mat, type: CANNON.Body.STATIC });
    ramp.addShape(new CANNON.Box(new CANNON.Vec3(L / 2 + 0.3, 0.3, (HOLE.z1 - HOLE.z0) / 2)));
    ramp.position.set((R + HOLE.x1) / 2 + Math.sin(ang) * 0.3, (FLOOR + TOP) / 2 - Math.cos(ang) * 0.3, 0);
    ramp.quaternion.setFromEuler(0, 0, ang);
    city.world.addBody(ramp);

    this.buildFurniture(solid, wood, gold);
    this.buildSigns(scene);

    for (const x of [-4, 4]) {
      const lamp = new THREE.PointLight(0xffb45a, 14, 18, 1.5);
      lamp.position.set(x, CEIL - 1.2, 0);
      scene.add(lamp);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffa040, emissiveIntensity: 2.5 }));
      bulb.position.copy(lamp.position).y += 0.15;
      scene.add(bulb);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1), wood);
      chain.position.set(x, CEIL - 0.5, 0);
      scene.add(chain);
    }

    this.hatchBody = city.addStatic(this.hatchPos.x, TOP / 2, this.hatchPos.z, (HOLE.x1 - HOLE.x0) / 2, TOP / 2, (HOLE.z1 - HOLE.z0) / 2);
    const hatchTex = tex(512, 80, (g, w, h) => {
      for (let i = 0; i < 16; i++) {
        const v = 110 + Math.random() * 30;
        g.fillStyle = `rgb(${v + 20},${v * 0.68},${v * 0.38})`;
        g.fillRect(i * 32, 0, 32, h);
        g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(i * 32, 0, 2, h);
      }
      g.strokeStyle = '#3a3a3a'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
      paw(g, w / 2, h / 2, 26, 'rgba(40,20,10,.75)');
    }, false);
    const leafMat = new THREE.MeshStandardMaterial({ map: hatchTex, roughness: 0.8 });
    const hw = (HOLE.z1 - HOLE.z0) / 2, len = HOLE.x1 - HOLE.x0;
    this.leaves = [1, -1].map((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(this.hatchPos.x, TOP + 0.01, s > 0 ? HOLE.z1 : HOLE.z0);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, hw), [wood, wood, leafMat, wood, wood, wood]);
      leaf.position.set(0, 0.06, -s * hw / 2);
      if (s < 0) leaf.rotation.y = Math.PI;
      leaf.castShadow = leaf.receiveShadow = true;
      pivot.add(leaf);
      scene.add(pivot);
      return { pivot, s };
    });

    const earth = (x0, x1, y0, y1, z0, z1) => city.camBoxes.push({ min: new THREE.Vector3(x0, y0, z0), max: new THREE.Vector3(x1, y1, z1) });
    earth(-R, R, CEIL, TOP, -R, R);
    earth(-40, -R, -30, 0, -40, 40);
    earth(-R, 40, -30, 0, R, 40);
    earth(-R, 40, -30, 0, -40, -R);
    earth(R, 40, -30, 0, HOLE.z1, R);
    earth(R, 40, -30, 0, -R, HOLE.z0);
    earth(HOLE.x1, 40, -30, 0, HOLE.z0, HOLE.z1);
    earth(-40, 40, -30, FLOOR, -40, 40);
    for (let i = 0; i < 4; i++) {
      const x0 = R + i * dx / 4;
      earth(x0, x0 + dx / 4, -30, FLOOR + (i / 4) * dy - 0.3, HOLE.z0, HOLE.z1);
    }
  }

  buildFurniture(solid, wood, gold) {
    const y = FLOOR;
    const red = new THREE.MeshStandardMaterial({ color: 0xb8323a, roughness: 0.95 });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), new THREE.MeshStandardMaterial({ color: 0x8e2a3a, roughness: 1 }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(-1, y + 0.02, 2.5);
    rug.receiveShadow = true;
    this.city.batch(rug);

    solid(-5, 2, y, y + 1.1, 6.6, 8.4, red, { tile: 1 });
    solid(-5, 2, y + 1.1, y + 2.6, 8.0, 8.9, red, { tile: 1 });
    solid(-5.8, -5, y, y + 1.8, 6.6, 8.9, red, { tile: 1 });
    solid(2, 2.8, y, y + 1.8, 6.6, 8.9, red, { tile: 1 });
    solid(-3, 0.5, y + 0.9, y + 1.1, 3, 4.6, wood, { tile: 1 });
    for (const [x, z] of [[-2.8, 3.2], [0.3, 3.2], [-2.8, 4.4], [0.3, 4.4]]) solid(x - 0.1, x + 0.1, y, y + 0.9, z - 0.1, z + 0.1, wood, { phys: false, tile: 1 });

    solid(-7.8, -5.2, y, y + 1.5, -7.8, -6.2, wood, { tile: 1 });
    const lid = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.15, 1.6), wood);
    lid.position.set(-6.5, y + 2.1, -8.0);
    lid.rotation.x = -1.2;
    lid.castShadow = true;
    this.city.batch(lid);
    const coin = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 12);
    for (let k = 0; k < 70; k++) {
      const m = new THREE.Mesh(coin, gold);
      const inChest = k < 30;
      const a = Math.random() * Math.PI * 2, r = Math.random() * (inChest ? 0.6 : 1.8);
      m.position.set(inChest ? -6.5 + (Math.random() - 0.5) * 2.2 : -5 + Math.cos(a) * r, inChest ? y + 1.5 + Math.random() * 0.2 : y + 0.04 + (1.8 - r) * 0.25 * Math.random(), inChest ? -7 + (Math.random() - 0.5) * 1.2 : -4.8 + Math.sin(a) * r);
      m.rotation.set((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6);
      m.castShadow = true;
      this.city.batch(m);
    }

    const barrel = new THREE.CylinderGeometry(0.75, 0.75, 1.8, 14);
    for (const [x, z] of [[7.4, -7.4], [5.8, -7.6], [7.5, -5.8], [-7.4, 7.4]]) {
      const m = new THREE.Mesh(barrel, wood);
      m.position.set(x, y + 0.9, z);
      m.castShadow = m.receiveShadow = true;
      this.city.batch(m);
      this.city.addStatic(x, y + 0.9, z, 0.7, 0.9, 0.7);
    }
  }

  buildSigns(scene) {
    const add = (t, w, h, x, y, z, ry) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
      m.position.set(x, y, z);
      m.rotation.y = ry;
      scene.add(m);
    };
    const sign = tex(1024, 192, (g, w, h) => {
      g.fillStyle = '#3b2412'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = '#ffd23f'; g.font = 'bold 84px "Luckiest Guy", Impact, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('BJÖRNLIGANS GÖMSTÄLLE', w / 2, h / 2 + 6);
      paw(g, 70, h / 2 + 4, 40, '#ffd23f'); paw(g, w - 70, h / 2 + 4, 40, '#ffd23f');
    }, false);
    add(sign, 10, 1.9, -R + 0.05, FLOOR + 3.4, 0, Math.PI / 2);

    const poster = (title, emoji, who) => tex(256, 340, (g, w, h) => {
      g.fillStyle = '#f2e2b8'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#5a2a10'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 44px Impact, sans-serif'; g.fillText('EFTERLYST', w / 2, 44);
      g.font = '130px sans-serif'; g.fillText(emoji, w / 2, 170);
      g.font = 'bold 26px Impact, sans-serif'; g.fillText(title, w / 2, 280);
      g.font = '20px sans-serif'; g.fillText(who, w / 2, 315);
    }, false);
    add(poster('STADENS BUSIGASTE', '🐻', 'Belöning: 1 000 000 kr'), 1.6, 2.1, -3, FLOOR + 3, -R + 0.05, 0);
    add(poster('SNABBASTE RÅTTAN', '🐀', 'Belöning: en jätteost'), 1.6, 2.1, 0, FLOOR + 3, -R + 0.05, 0);
  }

  onHatch(p) {
    return !this.open && p.x > HOLE.x0 - 1.5 && p.x < HOLE.x1 + 1.5 && p.z > HOLE.z0 - 2 && p.z < HOLE.z1 + 2 && p.y > -0.5 && p.y < 1.5;
  }

  inside(p) {
    return p.y < -0.8 && p.x > -R - 1 && p.x < HOLE.x1 + 1 && Math.abs(p.z) < R + 1;
  }

  inRoom(p) {
    return p.y < CEIL - 1 && Math.abs(p.x) < R && Math.abs(p.z) < R;
  }

  openHatch() {
    if (this.open) return false;
    this.open = true;
    this.city.world.removeBody(this.hatchBody);
    return true;
  }

  update(dt) {
    const target = this.open ? 1.95 : 0;
    if (this.angle === target) return;
    this.angle = Math.min(target, this.angle + dt * 2.5);
    for (const { pivot, s } of this.leaves) pivot.rotation.x = s * this.angle;
  }
}
