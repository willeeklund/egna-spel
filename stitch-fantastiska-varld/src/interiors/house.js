import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { std, metal, glow, mesh, canvasTexture, signTexture, rng } from '../core/util.js';
import { createRoom } from './room.js';
import { createRock } from '../models/rockFood.js';

export const HOUSE_CENTER = new THREE.Vector3(1000, 0, 0);
const RADIUS = 9;
const HEIGHT = 7;

function woodFloor() {
  const r = rng(11);
  return canvasTexture(1024, 1024, (ctx) => {
    const cols = ['#e8b98a', '#e1ae7d', '#efc699', '#dba774'];
    for (let y = 0; y < 1024; y += 64) {
      let x = -r() * 200;
      while (x < 1024) {
        const w = 180 + r() * 220;
        ctx.fillStyle = cols[Math.floor(r() * cols.length)];
        ctx.fillRect(x, y, w, 64);
        ctx.strokeStyle = 'rgba(120,70,30,0.35)';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, 64);
        ctx.strokeStyle = 'rgba(120,70,30,0.12)';
        ctx.lineWidth = 1.5;
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.moveTo(x, y + 10 + k * 13 + r() * 4);
          ctx.bezierCurveTo(x + w * 0.3, y + 8 + k * 13, x + w * 0.6, y + 16 + k * 13, x + w, y + 10 + k * 13);
          ctx.stroke();
        }
        x += w;
      }
    }
  }, { repeat: [2, 2] });
}

function wallpaper() {
  return canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = 'rgba(255,255,255,0.0)';
    for (let x = 0; x < 512; x += 64) {
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      ctx.fillRect(x, 0, 32, 512);
    }
    ctx.fillStyle = 'rgba(255,214,102,0.9)';
    for (let i = 0; i < 16; i++) {
      const x = (i % 4) * 128 + 64 + (Math.floor(i / 4) % 2) * 32;
      const y = Math.floor(i / 4) * 128 + 64;
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const rr = k % 2 ? 6 : 14;
        const a = (k / 10) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.fill();
      ctx.restore();
    }
  }, { repeat: [10, 2] });
}

function rugTexture() {
  return canvasTexture(512, 512, (ctx) => {
    const cols = ['#ff9de2', '#ffd166', '#9df2ff', '#c3a6ff', '#b8ffd1', '#ff9de2'];
    for (let i = 0; i < cols.length; i++) {
      ctx.fillStyle = cols[i];
      ctx.beginPath();
      ctx.arc(256, 256, 256 - i * 40, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(256 + Math.cos(a) * 236, 256 + Math.sin(a) * 236, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawing(kind) {
  return canvasTexture(256, 200, (ctx) => {
    ctx.fillStyle = '#fffdf5';
    ctx.fillRect(0, 0, 256, 200);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    if (kind === 0) {
      const figs = [['#3f7fe0', 60], ['#ff5fa2', 120], ['#8b5a2b', 180]];
      for (const [c, x] of figs) {
        ctx.strokeStyle = c;
        ctx.beginPath(); ctx.arc(x, 70, 18, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, 88); ctx.lineTo(x, 140); ctx.moveTo(x - 20, 105); ctx.lineTo(x + 20, 105);
        ctx.moveTo(x, 140); ctx.lineTo(x - 15, 175); ctx.moveTo(x, 140); ctx.lineTo(x + 15, 175); ctx.stroke();
      }
      ctx.fillStyle = '#ff5fa2';
      ctx.font = 'bold 26px Fredoka, sans-serif';
      ctx.fillText('OHANA ♥', 70, 30);
    } else if (kind === 1) {
      ctx.fillStyle = '#7fd8ff';
      ctx.fillRect(0, 120, 256, 80);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.arc(200, 50, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff8a3d';
      ctx.beginPath(); ctx.ellipse(100, 140, 50, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(150, 140); ctx.lineTo(180, 115); ctx.lineTo(180, 165); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(75, 135, 5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#ff8fb8';
      ctx.beginPath(); ctx.moveTo(128, 20); ctx.lineTo(160, 80); ctx.lineTo(160, 160); ctx.lineTo(96, 160); ctx.lineTo(96, 80); ctx.fill();
      ctx.fillStyle = '#7a5cff';
      ctx.beginPath(); ctx.moveTo(96, 130); ctx.lineTo(70, 175); ctx.lineTo(96, 160); ctx.fill();
      ctx.beginPath(); ctx.moveTo(160, 130); ctx.lineTo(186, 175); ctx.lineTo(160, 160); ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.moveTo(110, 165); ctx.lineTo(128, 198); ctx.lineTo(146, 165); ctx.fill();
      ctx.fillStyle = '#9df2ff';
      ctx.beginPath(); ctx.arc(128, 95, 14, 0, Math.PI * 2); ctx.fill();
    }
  });
}

function recordLabel() {
  return canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#2a2a2a';
    for (let r = 20; r < 64; r += 3) { ctx.beginPath(); ctx.arc(64, 64, r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#ff5fa2';
    ctx.beginPath(); ctx.arc(64, 64, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(64, 64, 3, 0, Math.PI * 2); ctx.fill();
  });
}

function scrump() {
  const g = new THREE.Group();
  const cloth = std(0x7c8a6a, { roughness: 1 });
  g.add(mesh(new THREE.SphereGeometry(0.22, 16, 12), cloth, { y: 0.2, s: [1, 1.1, 0.9] }));
  g.add(mesh(new THREE.SphereGeometry(0.2, 16, 12), cloth, { y: 0.52, s: [1.2, 1, 1] }));
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), std(0x111111, { roughness: 0.2 }), { x: s * 0.09, y: 0.56, z: 0.17 }));
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.2, 6), cloth, { x: s * 0.22, y: 0.2, z: 0, rz: s * 1.2 }));
    g.add(mesh(new THREE.ConeGeometry(0.05, 0.15, 6), cloth, { x: s * 0.15, y: 0.72, rz: s * -0.4 }));
  }
  const stitchLine = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 4, 16, Math.PI), std(0x111111));
  stitchLine.position.set(0, 0.46, 0.19);
  stitchLine.rotation.z = Math.PI;
  g.add(stitchLine);
  return g;
}

export function createHouseInterior(game) {
  const C = HOUSE_CENTER;
  const room = createRoom(game, {
    center: C,
    radius: RADIUS,
    height: HEIGHT,
    wallMap: wallpaper(),
    floorMap: woodFloor(),
    wallColor: 0xffd6ea,
    trimColor: 0xd9a978,
    portholes: 6,
  });
  const g = room.group;
  const physics = game.physics;
  const box = (lx, lz, hx, hy, hz, rot = 0, y = hy) => physics.fixedBox({ x: C.x + lx, y, z: C.z + lz }, { x: hx, y: hy, z: hz }, rot);
  const interactables = [];
  const add = (o) => interactables.push({ location: 'house', radius: 2.4, ...o });

  const rug = mesh(new THREE.CircleGeometry(3.2, 64), std(0xffffff, { map: rugTexture(), roughness: 1 }), { y: 0.015, rx: -Math.PI / 2, shadow: false });
  g.add(rug);

  const bed = new THREE.Group();
  const woodMat = std(0xc98b55, { roughness: 0.7 });
  bed.add(mesh(new RoundedBoxGeometry(2.4, 0.5, 3.6, 3, 0.08), woodMat, { y: 0.35 }));
  bed.add(mesh(new RoundedBoxGeometry(2.2, 0.4, 3.4, 4, 0.15), std(0xffffff, { roughness: 0.9 }), { y: 0.78 }));
  const blanketTex = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#7fd8ff';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 30; i++) {
      const x = (i * 53) % 256, y = (i * 97) % 256;
      ctx.beginPath();
      ctx.moveTo(x, y - 10); ctx.bezierCurveTo(x + 14, y - 22, x + 26, y, x, y + 14); ctx.bezierCurveTo(x - 26, y, x - 14, y - 22, x, y - 10);
      ctx.fillStyle = i % 2 ? '#ff9de2' : '#ffffff';
      ctx.fill();
    }
  });
  bed.add(mesh(new RoundedBoxGeometry(2.3, 0.18, 2.3, 4, 0.08), std(0xffffff, { map: blanketTex, roughness: 0.95 }), { y: 1.0, z: 0.6 }));
  bed.add(mesh(new RoundedBoxGeometry(1.5, 0.3, 0.7, 4, 0.14), std(0xfff3c4, { roughness: 0.95 }), { y: 1.1, z: -1.2 }));
  const head = new THREE.Group();
  head.add(mesh(new RoundedBoxGeometry(2.4, 1.8, 0.2, 3, 0.08), woodMat, { y: 0.9 }));
  const starCut = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const rr = k % 2 ? 0.18 : 0.42;
    const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
    if (k === 0) starCut.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else starCut.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  head.add(mesh(new THREE.ShapeGeometry(starCut), glow(0xffd166, 0.8), { y: 1.25, z: 0.11 }));
  head.position.z = -1.85;
  bed.add(head);
  const doll = scrump();
  doll.position.set(0.6, 1.25, -1.0);
  doll.rotation.x = -0.3;
  bed.add(doll);
  const bedAngle = -Math.PI / 2 - 0.5;
  bed.position.set(Math.sin(bedAngle) * 6.6, 0, Math.cos(bedAngle) * 6.6);
  bed.rotation.y = bedAngle + Math.PI;
  g.add(bed);
  box(bed.position.x, bed.position.z, 1.2, 0.6, 1.9, bedAngle + Math.PI);
  add({ pos: room.local(bed.position.x * 0.7, 0, bed.position.z * 0.7), radius: 2.8, icon: '😴', label: () => 'Sov i sängen', action: () => game.sleep() });
  add({ pos: doll.getWorldPosition(new THREE.Vector3()).setY(0), radius: 2.2, icon: '🧸', label: () => 'Krama Scrump', action: () => game.hug(doll) });

  const table = new THREE.Group();
  table.add(mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.1, 40), std(0xffffff, { roughness: 0.4 }), { y: 1.05 }));
  table.add(mesh(new THREE.TorusGeometry(1.2, 0.05, 8, 48), std(0xff9de2), { y: 1.05, rx: Math.PI / 2 }));
  table.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.0, 12), metal(0xd9dde8), { y: 0.5 }));
  table.add(mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.06, 24), metal(0xd9dde8), { y: 0.03 }));
  table.add(mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.04, 24), std(0xffffff), { x: 0.3, y: 1.12 }));
  const snack = createRock('manost', 0.15, 4);
  snack.position.set(0.3, 1.25, 0);
  table.add(snack);
  table.add(mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.22, 16), std(0x7fd8ff), { x: -0.4, y: 1.21, z: 0.3 }));
  table.add(mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 12), std(0x7fd8ff), { x: -0.29, y: 1.21, z: 0.3 }));
  const vase = new THREE.Group();
  vase.add(mesh(new THREE.SphereGeometry(0.14, 16, 12), glow(0xc3a6ff, 0.3), { y: 0.1 }));
  for (let k = 0; k < 3; k++) {
    vase.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 4), std(0x5ccf8a), { y: 0.35, x: (k - 1) * 0.05, rz: (k - 1) * 0.3 }));
    vase.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), glow([0xff9de2, 0xfff27a, 0x9df2ff][k], 1.2), { y: 0.55, x: (k - 1) * 0.12 }));
  }
  vase.position.set(-0.2, 1.1, -0.4);
  table.add(vase);
  const chairMat = std(0x7fd8ff, { roughness: 0.5 });
  for (const s of [-1, 1]) {
    const chair = new THREE.Group();
    chair.add(mesh(new RoundedBoxGeometry(0.8, 0.12, 0.8, 2, 0.05), chairMat, { y: 0.65 }));
    chair.add(mesh(new RoundedBoxGeometry(0.8, 0.8, 0.1, 2, 0.05), chairMat, { y: 1.05, z: -0.38 }));
    for (const lx of [-0.32, 0.32]) for (const lz of [-0.32, 0.32]) chair.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.6, 8), metal(0xd9dde8), { x: lx, y: 0.3, z: lz }));
    chair.position.set(s * 1.7, 0, 0);
    chair.rotation.y = -s * Math.PI / 2;
    table.add(chair);
  }
  const tableAngle = Math.PI / 2 + 0.4;
  table.position.set(Math.sin(tableAngle) * 5.0, 0, Math.cos(tableAngle) * 5.0);
  table.rotation.y = tableAngle;
  g.add(table);
  physics.fixedCylinder({ x: C.x + table.position.x, y: 0.55, z: C.z + table.position.z }, 0.55, 1.25);
  add({
    pos: room.local(table.position.x * 0.62, 0, table.position.z * 0.62),
    radius: 2.2,
    icon: () => (snack.visible ? '🧀' : '🍽️'),
    label: () => (snack.visible ? 'Ät Månosten på bordet' : 'Tallriken är tom'),
    action: () => {
      if (!snack.visible) return game.ui.toast('Tallriken är tom. Kika i kylen 🧊 eller handla i butiken 🛸');
      snack.visible = false;
      game.eatNow('manost', true);
    },
  });

  const cabinet = new THREE.Group();
  cabinet.add(mesh(new RoundedBoxGeometry(1.6, 1.0, 0.9, 2, 0.06), std(0xff9de2, { roughness: 0.5 }), { y: 0.5 }));
  for (const s of [-1, 1]) cabinet.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), metal(0xffd166), { x: s * 0.15, y: 0.5, z: 0.46 }));
  cabinet.add(mesh(new THREE.BoxGeometry(0.02, 0.8, 0.02), std(0xd97bb6), { y: 0.5, z: 0.455 }));
  const player = new THREE.Group();
  player.add(mesh(new RoundedBoxGeometry(1.3, 0.25, 0.8, 2, 0.04), std(0xc98b55), { y: 0.12 }));
  const platter = new THREE.Group();
  platter.add(mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.03, 32), new THREE.MeshStandardMaterial({ map: recordLabel(), roughness: 0.3 })));
  platter.position.set(-0.15, 0.27, 0);
  player.add(platter);
  const arm = new THREE.Group();
  arm.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), metal(0xdddddd), { z: 0.25, rx: Math.PI / 2 }));
  arm.add(mesh(new THREE.BoxGeometry(0.05, 0.03, 0.08), metal(0x888888), { z: 0.5 }));
  arm.position.set(0.4, 0.3, -0.25);
  arm.rotation.y = -0.6;
  player.add(arm);
  player.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12), metal(0x888888), { x: 0.4, y: 0.28, z: -0.25 }));
  for (let k = 0; k < 3; k++) player.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12), std([0xff5fa2, 0x5ff2ff, 0xffd166][k]), { x: 0.2 + k * 0.14, y: 0.26, z: 0.3 }));
  player.position.y = 1.0;
  cabinet.add(player);
  const speaker = new THREE.Group();
  speaker.add(mesh(new RoundedBoxGeometry(0.5, 0.7, 0.4, 2, 0.04), std(0x5a4a7a), { y: 0.35 }));
  speaker.add(mesh(new THREE.CircleGeometry(0.15, 24), std(0x222222), { y: 0.48, z: 0.205 }));
  speaker.add(mesh(new THREE.CircleGeometry(0.08, 24), std(0x222222), { y: 0.2, z: 0.205 }));
  speaker.position.set(1.15, 0, 0);
  cabinet.add(speaker);
  const recAngle = Math.PI + 0.55;
  cabinet.position.set(Math.sin(recAngle) * 8.3, 0, Math.cos(recAngle) * 8.3);
  cabinet.rotation.y = recAngle + Math.PI;
  g.add(cabinet);
  box(cabinet.position.x, cabinet.position.z, 1.1, 0.7, 0.5, recAngle + Math.PI);
  add({
    pos: room.local(Math.sin(recAngle) * 6.6, 0, Math.cos(recAngle) * 6.6),
    icon: '🎵',
    label: () => (game.audio.musicPlaying ? 'Stoppa musiken' : 'Spela musik'),
    action: () => game.toggleMusic(),
  });

  const surf = new THREE.Group();
  const surfTex = canvasTexture(64, 256, (ctx) => {
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(0, 0, 64, 256);
    ctx.fillStyle = '#ff5fa2';
    ctx.fillRect(26, 0, 12, 256);
    ctx.fillStyle = '#5ff2ff';
    ctx.fillRect(0, 120, 64, 16);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(32, 60, 14, 0, Math.PI * 2); ctx.fill();
  });
  surf.add(mesh(new THREE.SphereGeometry(1, 32, 16), std(0xffffff, { map: surfTex, roughness: 0.3 }), { s: [0.38, 1.4, 0.06] }));
  surf.add(mesh(new THREE.ConeGeometry(0.12, 0.25, 3), std(0xff5fa2), { y: -1.1, z: -0.08, rx: Math.PI }));
  const surfAngle = Math.PI / 2 - 0.45;
  surf.position.set(Math.sin(surfAngle) * 8.6, 1.5, Math.cos(surfAngle) * 8.6);
  surf.rotation.set(0, surfAngle + Math.PI, 0.12);
  surf.rotateX(-0.12);
  g.add(surf);

  const uke = new THREE.Group();
  const ukeWood = std(0xd99a5b, { roughness: 0.5 });
  uke.add(mesh(new THREE.SphereGeometry(0.28, 20, 12), ukeWood, { y: 0, s: [1, 1.1, 0.25] }));
  uke.add(mesh(new THREE.SphereGeometry(0.22, 20, 12), ukeWood, { y: 0.32, s: [1, 1, 0.25] }));
  uke.add(mesh(new THREE.CircleGeometry(0.08, 16), std(0x3a2414), { y: 0.18, z: 0.071 }));
  uke.add(mesh(new THREE.BoxGeometry(0.09, 0.6, 0.04), std(0x7a4a24), { y: 0.75 }));
  uke.add(mesh(new THREE.BoxGeometry(0.14, 0.18, 0.05), std(0x7a4a24), { y: 1.12 }));
  for (let k = 0; k < 4; k++) uke.add(mesh(new THREE.CylinderGeometry(0.003, 0.003, 1.0, 3), std(0xffffff), { x: -0.03 + k * 0.02, y: 0.55, z: 0.075, shadow: false }));
  const ukeAngle = Math.PI / 2 + 1.2;
  uke.position.set(Math.sin(ukeAngle) * 8.75, 2.4, Math.cos(ukeAngle) * 8.75);
  uke.rotation.set(0, ukeAngle + Math.PI, 0.3);
  g.add(uke);
  add({ pos: room.local(Math.sin(ukeAngle) * 7.2, 0, Math.cos(ukeAngle) * 7.2), radius: 2.0, icon: '🎸', label: () => 'Spela ukulele', action: () => game.playUkulele(uke) });

  const shelf = new THREE.Group();
  const shelfMat = std(0xffffff, { roughness: 0.6 });
  shelf.add(mesh(new THREE.BoxGeometry(2.0, 2.6, 0.08), shelfMat, { y: 1.3, z: -0.3 }));
  for (const s of [-1, 1]) shelf.add(mesh(new THREE.BoxGeometry(0.08, 2.6, 0.7), shelfMat, { x: s, y: 1.3 }));
  const r = rng(3);
  for (let lvl = 0; lvl < 4; lvl++) {
    shelf.add(mesh(new THREE.BoxGeometry(2.0, 0.06, 0.7), shelfMat, { y: 0.05 + lvl * 0.7 }));
    if (lvl === 3) continue;
    let x = -0.9;
    while (x < 0.8) {
      const w = 0.08 + r() * 0.1;
      const h = 0.4 + r() * 0.2;
      shelf.add(mesh(new THREE.BoxGeometry(w, h, 0.4), std([0xff5fa2, 0x5ff2ff, 0xffd166, 0x9dff7a, 0x7a5cff, 0xff8a3d][Math.floor(r() * 6)]), { x: x + w / 2, y: 0.08 + lvl * 0.7 + h / 2, rz: r() < 0.15 ? 0.2 : 0 }));
      x += w + 0.01;
      if (r() < 0.1) x += 0.2;
    }
  }
  const globe = new THREE.Group();
  globe.add(mesh(new THREE.SphereGeometry(0.25, 20, 14), std(0x7fd8ff)));
  globe.add(mesh(new THREE.TorusGeometry(0.3, 0.02, 6, 20, Math.PI), metal(0xffd166), { rz: 0.4 }));
  globe.position.set(-0.5, 2.43, 0);
  shelf.add(globe);
  const shelfRock = createRock('kristall', 0.18, 9);
  shelfRock.position.set(0.5, 2.3, 0);
  shelf.add(shelfRock);
  const shelfAngle = Math.PI - 0.6;
  shelf.position.set(Math.sin(shelfAngle) * 8.5, 0, Math.cos(shelfAngle) * 8.5);
  shelf.rotation.y = shelfAngle + Math.PI;
  g.add(shelf);
  box(shelf.position.x, shelf.position.z, 1.05, 1.3, 0.4, shelfAngle + Math.PI);

  const fridge = new THREE.Group();
  fridge.add(mesh(new RoundedBoxGeometry(1.2, 2.4, 1.0, 3, 0.12), std(0x9df2ff, { roughness: 0.3 }), { y: 1.2 }));
  fridge.add(mesh(new THREE.BoxGeometry(1.1, 0.03, 0.02), std(0x6ab8d6), { y: 1.55, z: 0.51 }));
  for (const y of [1.0, 2.0]) fridge.add(mesh(new THREE.CapsuleGeometry(0.035, 0.3, 4, 8), metal(0xffffff), { x: 0.42, y, z: 0.55 }));
  const magnets = [0xff5fa2, 0xffd166, 0x7a5cff];
  magnets.forEach((c, k) => fridge.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 12), std(c), { x: -0.3 + k * 0.2, y: 2.0 - k * 0.15, z: 0.51, rx: Math.PI / 2 })));
  const note = mesh(new THREE.PlaneGeometry(0.3, 0.35), std(0xffffff, { map: drawing(1) }), { x: -0.15, y: 1.85, z: 0.515 });
  fridge.add(note);
  const fridgeAngle = -Math.PI / 2 + 0.75;
  fridge.position.set(Math.sin(fridgeAngle) * 8.3, 0, Math.cos(fridgeAngle) * 8.3);
  fridge.rotation.y = fridgeAngle + Math.PI;
  g.add(fridge);
  box(fridge.position.x, fridge.position.z, 0.65, 1.2, 0.55, fridgeAngle + Math.PI);
  let fridgeUsed = false;
  const fridgePos = room.local(Math.sin(fridgeAngle) * 6.8, 0, Math.cos(fridgeAngle) * 6.8);
  add({
    pos: fridgePos,
    icon: '🧊',
    label: () => (fridgeUsed ? 'Kylen är tom' : 'Ät ett mellanmål ur kylen'),
    action: () => {
      if (fridgeUsed) return game.ui.toast('Kylen är tom. Handla stenar i butiken 🛸 eller ät stenen på bordet!');
      fridgeUsed = true;
      game.eatNow(['manost', 'meteor', 'lava', 'is'][Math.floor(Math.random() * 4)], true);
    },
  });

  const frames = [];
  [0, 1, 2].forEach((k) => {
    const a = Math.PI + 1.5 - k * 0.45 + (k > 1 ? -1.6 : 0);
    const f = new THREE.Group();
    f.add(mesh(new THREE.BoxGeometry(1.2, 1.0, 0.06), std([0xffd166, 0xff9de2, 0x7fd8ff][k])));
    f.add(mesh(new THREE.PlaneGeometry(1.0, 0.8), std(0xffffff, { map: drawing(k), roughness: 0.9 }), { z: 0.035, shadow: false }));
    f.position.set(Math.sin(a) * 8.92, 3.6 + (k % 2) * 0.4, Math.cos(a) * 8.92);
    f.rotation.y = a + Math.PI;
    g.add(f);
    frames.push(f);
  });

  const ladder = new THREE.Group();
  const ladMat = metal(0xe6ecf5);
  for (const s of [-1, 1]) ladder.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, HEIGHT, 8), ladMat, { x: s * 0.4, y: HEIGHT / 2 }));
  for (let k = 0; k < 11; k++) ladder.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 8), ladMat, { y: 0.4 + k * 0.6, rz: Math.PI / 2 }));
  const ladAngle = -0.75;
  ladder.position.set(Math.sin(ladAngle) * 8.6, 0, Math.cos(ladAngle) * 8.6);
  ladder.rotation.y = ladAngle + Math.PI;
  g.add(ladder);
  g.add(mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.05, 32), std(0xd9a978), { x: ladder.position.x * 0.97, y: HEIGHT - 0.03, z: ladder.position.z * 0.97 }));

  const plant = new THREE.Group();
  plant.add(mesh(new THREE.CylinderGeometry(0.45, 0.35, 0.7, 20), std(0xffffff), { y: 0.35 }));
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    const leaf = mesh(new THREE.SphereGeometry(0.4, 12, 8), std(0x5ccf8a), { x: Math.cos(a) * 0.35, y: 1.0 + (k % 3) * 0.2, z: Math.sin(a) * 0.35, s: [0.4, 1.1, 0.12], ry: -a, rz: 0.5 });
    plant.add(leaf);
  }
  const plantAngle = 0.75;
  plant.position.set(Math.sin(plantAngle) * 8.2, 0, Math.cos(plantAngle) * 8.2);
  g.add(plant);

  const lamp = new THREE.Group();
  lamp.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), metal(0xffffff), { y: -0.6 }));
  lamp.add(mesh(new THREE.SphereGeometry(0.7, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0xffd166, { side: THREE.DoubleSide }), { y: -1.2 }));
  lamp.add(mesh(new THREE.SphereGeometry(0.3, 16, 12), glow(0xfff2c4, 3), { y: -1.35, shadow: false }));
  lamp.position.y = HEIGHT;
  g.add(lamp);

  const nameSign = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.75), new THREE.MeshBasicMaterial({ transparent: true }));
  nameSign.position.set(0, 4.6, RADIUS - 0.15);
  nameSign.rotation.y = Math.PI;
  g.add(nameSign);

  const light = new THREE.PointLight(0xfff0dd, 0, 30, 1.6);
  light.position.copy(room.local(0, HEIGHT - 1.6, 0));
  game.scene.add(light);
  const light2 = new THREE.PointLight(0xffc4e8, 0, 18, 1.6);
  light2.position.copy(room.local(-4, 3, -3));
  game.scene.add(light2);

  add({ pos: room.doorWorld, radius: 2.2, icon: '🚪', label: () => 'Gå ut', action: () => game.exitBuilding() });

  let musicT = 0;
  return {
    spawn: room.doorWorld.clone().add(new THREE.Vector3(0, 0, -3.2)),
    group: g,
    spawnHeading: Math.PI,
    fridgePos,
    scrumpPos: doll.getWorldPosition(new THREE.Vector3()).setY(0),
    center: C,
    radius: RADIUS,
    interactables,
    setTheme(rocket) {
      room.wallMat.color.set(rocket.cfg.color).lerp(new THREE.Color(0xffffff), 0.45);
      nameSign.material.map = signTexture(`${rocket.cfg.name}s hus`, { w: 512, h: 128, border: '#' + new THREE.Color(rocket.cfg.accent).getHexString() });
      nameSign.material.needsUpdate = true;
      fridgeUsed = false;
      snack.visible = true;
    },
    setLights(on) {
      light.intensity = on ? 14 : 0;
      light2.intensity = on ? 4 : 0;
    },
    update(dt, time) {
      if (game.audio.musicPlaying) {
        platter.rotation.y -= dt * 4;
        musicT -= dt;
        if (musicT < 0 && game.location === 'house') {
          musicT = 0.4;
          const p = cabinet.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.6, 0));
          game.particles.glow.emit({ pos: p, count: 1, color: [0xff5fa2, 0x7a5cff, 0x3fb6c9], size: 0.5, sizeEnd: 0.3, life: 2, vel: { x: 0, y: 1, z: 0 }, velRandom: 0.4 });
        }
      }
      lamp.rotation.z = Math.sin(time * 0.8) * 0.03;
    },
  };
}
