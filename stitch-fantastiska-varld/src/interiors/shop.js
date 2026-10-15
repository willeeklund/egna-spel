import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { std, metal, glow, mesh, canvasTexture, signTexture, roundRect } from '../core/util.js';
import { createRoom } from './room.js';
import { createRock, ROCK_TYPES, rockType } from '../models/rockFood.js';
import { createStitch } from '../models/stitch.js';

export const SHOP_CENTER = new THREE.Vector3(2000, 0, 0);
const RADIUS = 12;
const HEIGHT = 6;

function tileFloor() {
  return canvasTexture(512, 512, (ctx) => {
    const cols = ['#fff6fb', '#e9f7ff'];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      ctx.fillStyle = cols[(x + y) % 2];
      ctx.fillRect(x * 64, y * 64, 64, 64);
      ctx.strokeStyle = 'rgba(160,140,200,0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x * 64, y * 64, 64, 64);
    }
    ctx.fillStyle = 'rgba(255,157,226,0.5)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(32 + (i * 149) % 512, 32 + (i * 211) % 512, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { repeat: [6, 6] });
}

function panelWall() {
  return canvasTexture(512, 256, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = 'rgba(120,110,160,0.25)';
    ctx.lineWidth = 3;
    for (let x = 0; x < 512; x += 128) {
      roundRect(ctx, x + 6, 6, 116, 244, 14);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(120,110,160,0.35)';
    for (let x = 0; x < 512; x += 128) for (const y of [16, 240]) for (const dx of [16, 112]) {
      ctx.beginPath();
      ctx.arc(x + dx, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { repeat: [12, 1] });
}

function priceTag(type) {
  return canvasTexture(512, 200, (ctx) => {
    roundRect(ctx, 6, 6, 500, 188, 40);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#' + new THREE.Color(type.color === 0xffffff ? 0xff5fa2 : type.color).getHexString();
    ctx.stroke();
    ctx.fillStyle = '#3b2a6b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 62px Fredoka, sans-serif';
    ctx.fillText(`${type.emoji} ${type.name}`, 256, 72);
    ctx.font = 'bold 54px Fredoka, sans-serif';
    ctx.fillStyle = '#ff5fa2';
    ctx.fillText(`${type.price} ⭐`, 256, 145);
  });
}

function registerScreen(text) {
  return canvasTexture(256, 128, (ctx) => {
    ctx.fillStyle = '#123a2a';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#7dffb0';
    ctx.font = 'bold 54px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 66);
  });
}

function posterTexture(title, sub, bg) {
  return canvasTexture(256, 360, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 360);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 54px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 128, 80);
    ctx.font = 'bold 30px Fredoka, sans-serif';
    sub.split('\n').forEach((l, i) => ctx.fillText(l, 128, 150 + i * 40));
    ctx.font = '90px sans-serif';
    ctx.fillText('🪨', 128, 320);
  });
}

function shelfUnit(type, accent, seedBase) {
  const g = new THREE.Group();
  const frame = std(accent, { roughness: 0.4 });
  const white = std(0xffffff, { roughness: 0.5 });
  g.add(mesh(new THREE.BoxGeometry(2.8, 3.0, 0.1), white, { y: 1.5, z: -0.45 }));
  for (const s of [-1, 1]) g.add(mesh(new RoundedBoxGeometry(0.12, 3.1, 1.0, 2, 0.04), frame, { x: s * 1.42, y: 1.55 }));
  for (let lvl = 0; lvl < 3; lvl++) {
    const y = 0.35 + lvl * 0.95;
    g.add(mesh(new THREE.BoxGeometry(2.8, 0.07, 0.95), white, { y }));
    g.add(mesh(new THREE.BoxGeometry(2.8, 0.12, 0.03), frame, { y: y + 0.02, z: 0.48 }));
    for (let k = 0; k < 4; k++) {
      const rock = createRock(type.id, 0.22, seedBase + lvl * 7 + k);
      rock.userData.stock = true;
      rock.position.set(-1.0 + k * 0.67, y + 0.25, 0.05 + (k % 2) * 0.1);
      rock.rotation.y = k;
      g.add(rock);
    }
    const mini = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), new THREE.MeshBasicMaterial({ map: signTexture(`${type.price}⭐`, { w: 128, h: 40, font: 'bold 28px Fredoka, sans-serif', border: null, bg: '#fff27a' }) }));
    mini.position.set(1.0, y + 0.02, 0.5);
    g.add(mini);
  }
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.95), new THREE.MeshBasicMaterial({ map: priceTag(type), toneMapped: false }));
  tag.position.set(0, 3.45, -0.3);
  g.add(tag);
  g.add(mesh(new THREE.BoxGeometry(2.9, 0.15, 1.0), frame, { y: 3.05 }));
  return g;
}

export function createShopInterior(game) {
  const C = SHOP_CENTER;
  const room = createRoom(game, {
    center: C,
    radius: RADIUS,
    height: HEIGHT,
    wallMap: panelWall(),
    floorMap: tileFloor(),
    wallColor: 0xf3e6ff,
    trimColor: 0xff9de2,
    portholes: 8,
  });
  const g = room.group;
  const physics = game.physics;
  const interactables = [];
  const add = (o) => interactables.push({ location: 'shop', radius: 2.4, ...o });
  const box = (lx, lz, hx, hy, hz, rot = 0) => physics.fixedBox({ x: C.x + lx, y: hy, z: C.z + lz }, { x: hx, y: hy, z: hz }, rot);

  const ringLight = mesh(new THREE.TorusGeometry(RADIUS - 0.4, 0.08, 8, 128), glow(0xff9de2, 2.5), { y: HEIGHT - 0.6, rx: Math.PI / 2, shadow: false });
  g.add(ringLight);
  g.add(mesh(new THREE.SphereGeometry(2.4, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), glow(0xffe6f6, 0.35, { side: THREE.BackSide }), { y: HEIGHT - 0.05, rx: Math.PI, s: [1, 0.22, 1], shadow: false }));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 24), glow(0xfff3d6, 0.8), { x: Math.sin(a) * 6.5, y: HEIGHT - 0.05, z: Math.cos(a) * 6.5, shadow: false }));
  }

  const shelves = [];
  const types = ROCK_TYPES;
  const accents = [0xff5fa2, 0x7a5cff, 0xffb000, 0x3fb68b, 0x3fb6c9, 0xff8a3d];
  types.forEach((type, i) => {
    const a = Math.PI * 0.42 + (i / types.length) * Math.PI * 1.45;
    const unit = shelfUnit(type, accents[i], i * 31 + 5);
    unit.position.set(Math.sin(a) * (RADIUS - 1.0), 0, Math.cos(a) * (RADIUS - 1.0));
    unit.rotation.y = a + Math.PI;
    g.add(unit);
    box(unit.position.x, unit.position.z, 1.45, 1.6, 0.55, a + Math.PI);
    const front = new THREE.Vector3(Math.sin(a) * (RADIUS - 2.6), 0, Math.cos(a) * (RADIUS - 2.6)).add(C);
    shelves.push({ unit, type });
    add({
      pos: front,
      radius: 1.9,
      icon: type.emoji,
      label: () => `Lägg ${type.name} i korgen (${type.price}⭐)`,
      action: () => game.addToCart(type.id, unit),
    });
  });

  const island = new THREE.Group();
  island.add(mesh(new RoundedBoxGeometry(3.2, 0.9, 1.8, 3, 0.1), std(0xff9de2, { roughness: 0.4 }), { y: 0.45 }));
  island.add(mesh(new RoundedBoxGeometry(3.0, 0.1, 1.6, 2, 0.04), std(0xffffff), { y: 0.95 }));
  const pile = [];
  let seed = 200;
  for (let lvl = 0; lvl < 3; lvl++) {
    const n = 3 - lvl;
    for (let x = 0; x < n * 2; x++) for (let z = 0; z < n; z++) {
      const rock = createRock('manost', 0.24, seed++);
      rock.userData.stock = true;
      rock.position.set((x - n + 0.5) * 0.45, 1.2 + lvl * 0.38, (z - (n - 1) / 2) * 0.48);
      island.add(rock);
      pile.push(rock);
    }
  }
  const sale = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: signTexture('REA!', { w: 256, h: 128, bg: '#ff4fa0', fg: '#ffffff', border: '#fff27a', font: 'bold 72px Fredoka, sans-serif' }), side: THREE.DoubleSide, toneMapped: false }));
  sale.position.set(0, 2.9, 0);
  island.add(sale);
  island.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.1, 4), metal(0xdddddd), { y: 4.4 }));
  island.position.set(-1.5, 0, -2.0);
  g.add(island);
  box(island.position.x, island.position.z, 1.6, 0.9, 0.9);
  add({ pos: room.local(-1.5, 0, -0.4), radius: 1.6, icon: '🧀', label: () => 'Lägg Månost i korgen (REA 1⭐)', action: () => game.addToCart('manost', island) });

  const counter = new THREE.Group();
  counter.add(mesh(new RoundedBoxGeometry(4.2, 1.1, 1.2, 3, 0.08), std(0x7fd8ff, { roughness: 0.35 }), { y: 0.55 }));
  counter.add(mesh(new RoundedBoxGeometry(4.3, 0.08, 1.3, 2, 0.03), std(0xffffff, { roughness: 0.25 }), { y: 1.12 }));
  const beltTex = canvasTexture(64, 64, (ctx) => {
    ctx.fillStyle = '#333344';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#444458';
    ctx.fillRect(0, 0, 64, 8);
  }, { repeat: [1, 6] });
  const belt = mesh(new THREE.PlaneGeometry(0.7, 2.2), std(0xffffff, { map: beltTex, roughness: 0.8 }), { x: -0.9, y: 1.17, rx: -Math.PI / 2, rz: Math.PI / 2, shadow: false });
  counter.add(belt);
  const reg = new THREE.Group();
  reg.add(mesh(new RoundedBoxGeometry(0.9, 0.35, 0.7, 2, 0.05), std(0xfff3fa), { y: 0.17 }));
  const screenMat = new THREE.MeshBasicMaterial({ map: registerScreen('0 ⭐'), toneMapped: false });
  const screen = new THREE.Group();
  screen.add(mesh(new RoundedBoxGeometry(0.7, 0.4, 0.06, 2, 0.02), std(0xfff3fa)));
  screen.add(mesh(new THREE.PlaneGeometry(0.6, 0.3), screenMat, { z: 0.035, shadow: false }));
  screen.position.set(0, 0.65, -0.15);
  screen.rotation.x = -0.2;
  reg.add(screen);
  reg.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), std(0xcccccc), { y: 0.4, z: -0.15 }));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    reg.add(mesh(new RoundedBoxGeometry(0.12, 0.04, 0.1, 1, 0.02), std(c === 3 ? 0xff5fa2 : 0xffffff), { x: -0.22 + c * 0.15, y: 0.36, z: 0.05 + r * 0.12 - 0.12 }));
  }
  reg.add(mesh(new THREE.BoxGeometry(0.85, 0.1, 0.6), std(0xe6d9f2), { y: 0.02, z: 0.1 }));
  reg.position.set(1.1, 1.16, 0);
  reg.rotation.y = Math.PI;
  counter.add(reg);
  const candy = new THREE.Group();
  candy.add(mesh(new THREE.BoxGeometry(0.9, 1.2, 0.4), std(0xffffff), { y: 0.6 }));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    candy.add(mesh(new THREE.SphereGeometry(0.08, 10, 8), glow([0xff5fa2, 0xfff27a, 0x9df2ff, 0x9dff7a][c], 0.6), { x: -0.3 + c * 0.2, y: 0.3 + r * 0.35, z: 0.2 }));
  }
  candy.position.set(-2.6, 0, 0.5);
  counter.add(candy);
  const bagStack = new THREE.Group();
  for (let k = 0; k < 4; k++) bagStack.add(mesh(new THREE.BoxGeometry(0.5, 0.02, 0.35), std(0xffd6a5), { y: k * 0.025 }));
  bagStack.position.set(1.8, 1.17, 0.3);
  counter.add(bagStack);
  const cashier = createStitch({ cashier: true });
  cashier.group.position.set(0.8, 0.55, -1.2);
  cashier.group.scale.setScalar(1.15);
  counter.add(cashier.group);
  counter.add(mesh(new RoundedBoxGeometry(1.2, 0.55, 1.0, 2, 0.06), std(0xffd166, { roughness: 0.5 }), { x: 0.8, y: 0.275, z: -1.2 }));
  const kassaSign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.55), new THREE.MeshBasicMaterial({ map: signTexture('KASSA', { w: 256, h: 88, bg: '#fff27a', fg: '#6b2fa3', border: '#ff5fa2', font: 'bold 54px Fredoka, sans-serif' }), side: THREE.DoubleSide, toneMapped: false }));
  kassaSign.position.set(0, 3.6, 0);
  counter.add(kassaSign);
  counter.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.3, 4), metal(0xdddddd), { y: 4.9 }));
  const counterAngle = 0.62;
  counter.position.set(Math.sin(counterAngle) * 7.0, 0, Math.cos(counterAngle) * 7.0);
  counter.rotation.y = counterAngle + Math.PI;
  g.add(counter);
  box(counter.position.x, counter.position.z, 2.15, 0.6, 0.65, counterAngle + Math.PI);
  const cashierBehind = new THREE.Vector3(0.8, 0, -1.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), counterAngle + Math.PI).add(counter.position);
  physics.fixedCylinder({ x: C.x + cashierBehind.x, y: 0.8, z: C.z + cashierBehind.z }, 0.8, 0.5);
  const kassaFront = new THREE.Vector3(Math.sin(counterAngle) * 5.3, 0, Math.cos(counterAngle) * 5.3).add(C);
  add({
    pos: kassaFront,
    radius: 2.4,
    icon: '💳',
    label: () => (game.cart.length ? `Betala ${game.cartTotal()} ⭐` : 'Säg hej till Stitch'),
    action: () => game.checkout(),
  });

  const posters = [
    ['NYHET!', 'Regnbågssten\nsmakar alla\nfärger!', '#7a5cff'],
    ['MUMS!', 'Lavasten är\nvarma och\nkrispiga', '#ff8a3d'],
    ['TIPS', 'Samla stjärnor\nute för att\nhandla!', '#3fb68b'],
  ];
  posters.forEach(([t, s, bg], i) => {
    const a = [1.7, 3.21, -0.8][i];
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.0), new THREE.MeshStandardMaterial({ map: posterTexture(t, s, bg), roughness: 0.8 }));
    p.position.set(Math.sin(a) * (RADIUS - 0.08), 2.5, Math.cos(a) * (RADIUS - 0.08));
    p.rotation.y = a + Math.PI;
    g.add(p);
  });

  const basketStack = new THREE.Group();
  for (let k = 0; k < 4; k++) {
    const b = mesh(new THREE.CylinderGeometry(0.4, 0.32, 0.35, 16, 1, true), std(0xff5fa2, { side: THREE.DoubleSide }), { y: 0.2 + k * 0.12 });
    basketStack.add(b);
  }
  basketStack.add(mesh(new THREE.TorusGeometry(0.4, 0.03, 6, 20, Math.PI), std(0xffffff), { y: 0.75, ry: 0.4 }));
  basketStack.position.set(Math.sin(-0.4) * 9.5, 0, Math.cos(-0.4) * 9.5);
  g.add(basketStack);

  const planterA = new THREE.Group();
  planterA.add(mesh(new THREE.CylinderGeometry(0.5, 0.4, 0.8, 16), std(0xffffff), { y: 0.4 }));
  for (let k = 0; k < 5; k++) planterA.add(mesh(new THREE.SphereGeometry(0.25, 10, 8), glow([0xff9de2, 0x9df2ff, 0xfff27a][k % 3], 0.5), { x: Math.sin(k) * 0.25, y: 1.0 + k * 0.12, z: Math.cos(k) * 0.25 }));
  planterA.position.set(Math.sin(-0.25) * 10.5, 0, Math.cos(-0.25) * 10.5);
  g.add(planterA);

  const nameSign = new THREE.Mesh(new THREE.PlaneGeometry(5, 1), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false }));
  nameSign.position.set(0, 4.3, -RADIUS + 0.15);
  g.add(nameSign);

  const light = new THREE.PointLight(0xffffff, 0, 40, 1.4);
  light.position.copy(room.local(0, HEIGHT - 1, 0));
  game.scene.add(light);
  const light2 = new THREE.PointLight(0xffc4e8, 0, 25, 1.6);
  light2.position.copy(room.local(4, 3, 4));
  game.scene.add(light2);

  add({ pos: room.doorWorld, radius: 2.2, icon: '🚪', label: () => 'Gå ut', action: () => game.exitBuilding() });

  const tmp = new THREE.Vector3();
  let lastTotal = -1;
  return {
    spawn: room.doorWorld.clone().add(new THREE.Vector3(0, 0, -4.5)),
    group: g,
    spawnHeading: Math.PI,
    kassaPos: kassaFront,
    center: C,
    radius: RADIUS,
    interactables,
    cashier,
    cashierHead() { return cashier.head.getWorldPosition(tmp).add(new THREE.Vector3(0, 0.7, 0)); },
    takeRock(source) {
      let best = null;
      const wp = new THREE.Vector3();
      let bestY = -Infinity;
      source.traverse((o) => {
        if (!o.userData.stock || !o.visible) return;
        const y = o.getWorldPosition(wp).y + Math.random() * 0.01;
        if (y > bestY) { bestY = y; best = o; }
      });
      return best;
    },
    restock() {
      g.traverse((o) => {
        if (o.userData.stock) o.visible = true;
      });
    },
    setTheme(shop) {
      this.restock();
      nameSign.material.map = signTexture(shop.cfg.name, { w: 1024, h: 200, bg: '#fff7fb', fg: '#6b2fa3', border: '#' + new THREE.Color(shop.cfg.accent).getHexString(), font: 'bold 110px Fredoka, sans-serif' });
      nameSign.material.needsUpdate = true;
      ringLight.material.color.set(shop.cfg.beamColor);
      ringLight.material.emissive.set(shop.cfg.beamColor);
    },
    setLights(on) {
      light.intensity = on ? 16 : 0;
      light2.intensity = on ? 5 : 0;
    },
    update(dt, time, playerPos) {
      beltTex.offset.y = (beltTex.offset.y + dt * 0.4) % 1;
      cashier.update(dt, { speed: 0, grounded: true });
      const cw = cashier.group.getWorldPosition(tmp);
      const target = Math.atan2(playerPos.x - cw.x, playerPos.z - cw.z) - (counterAngle + Math.PI);
      cashier.group.rotation.y += (target - cashier.group.rotation.y) * Math.min(1, dt * 3);
      const total = game.cartTotal();
      if (total !== lastTotal) {
        lastTotal = total;
        screenMat.map = registerScreen(`${total} ⭐`);
        screenMat.needsUpdate = true;
      }
      sale.rotation.y = Math.sin(time) * 0.3;
    },
  };
}
