import * as THREE from 'three';
import { std, glow, mesh, noise3, canvasTexture, roundRect } from '../core/util.js';
import { rockType } from '../models/rockFood.js';
import { WALK_RADIUS } from './outdoor.js';
import { LOW } from '../core/quality.js';

function eyes(parent, { x = 0.12, y = 0, z = 0.3, r = 0.1, look = 0.25, pupil = 0.6 } = {}) {
  const white = std(0xffffff, { roughness: 0.2 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x111122, roughness: 0.1, clearcoat: 1 });
  const shine = std(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.8 });
  const list = [];
  for (const side of x === 0 ? [0] : [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(side * x, y, z);
    e.rotation.y = side * look;
    e.add(mesh(new THREE.SphereGeometry(r, 16, 12), white, { shadow: false }));
    e.add(mesh(new THREE.SphereGeometry(r * pupil, 14, 10), black, { z: r * 0.55, shadow: false }));
    e.add(mesh(new THREE.SphereGeometry(r * 0.2, 8, 6), shine, { x: -r * 0.25, y: r * 0.3, z: r * 0.95, shadow: false }));
    parent.add(e);
    list.push(e);
  }
  return list;
}

function fluffy(radius, seed) {
  const g = new THREE.SphereGeometry(radius, 28, 20);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = noise3(v.x * 14 + seed, v.y * 14, v.z * 14);
    v.multiplyScalar(1 + (n - 0.5) * 0.18);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function createPluppModel(color, seed) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const fur = std(color, { roughness: 1 });
  body.add(mesh(fluffy(0.36, seed), fur, { y: 0.38 }));
  body.add(mesh(new THREE.SphereGeometry(0.22, 16, 12), std(0xffffff, { roughness: 1 }), { y: 0.3, z: 0.18, s: [1, 0.9, 0.7] }));
  const blinkers = eyes(body, { x: 0.12, y: 0.48, z: 0.28, r: 0.1 });
  for (const s of [-1, 1]) {
    body.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), std(0xff8fc0), { x: s * 0.22, y: 0.36, z: 0.27, s: [1, 0.6, 0.5], shadow: false }));
    const ear = mesh(new THREE.CapsuleGeometry(0.06, 0.32, 4, 10), fur, { x: s * 0.14, y: 0.82, z: -0.04, rz: s * -0.35 });
    body.add(ear);
    body.add(mesh(new THREE.CapsuleGeometry(0.03, 0.22, 4, 8), std(0xffc4e0), { x: s * 0.145, y: 0.82, z: 0.0, rz: s * -0.35, shadow: false }));
    body.add(mesh(new THREE.SphereGeometry(0.08, 10, 8), fur, { x: s * 0.16, y: 0.06, z: 0.1, s: [1, 0.6, 1.4] }));
  }
  body.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 6), std(0x555577), { y: 0.82, z: 0.05, rx: 0.3 }));
  body.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), glow([0xfff27a, 0x9df2ff, 0xff9de2][seed % 3], 2.5), { y: 0.95, z: 0.09, shadow: false }));
  body.add(mesh(new THREE.SphereGeometry(0.1, 10, 8), std(0xffffff, { roughness: 1 }), { y: 0.3, z: -0.35 }));
  const mouth = mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12, Math.PI), std(0x442233), { y: 0.37, z: 0.34, rz: Math.PI, shadow: false });
  body.add(mouth);
  return { root, body, blinkers };
}

function bubbleTexture(emoji, text) {
  return canvasTexture(256, 200, (ctx) => {
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 8, 8, 240, 150, 50);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ff9de2';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(110, 178, 14, 0, Math.PI * 2);
    ctx.arc(84, 194, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '86px sans-serif';
    ctx.fillText(emoji, 128, text ? 72 : 86);
    if (text) {
      ctx.fillStyle = '#3b2a6b';
      ctx.font = 'bold 30px Fredoka, sans-serif';
      ctx.fillText(text, 128, 134);
    }
  });
}

function glorp() {
  const g = new THREE.Group();
  const skin = std(0x7ee081, { roughness: 0.35 });
  const body = mesh(new THREE.SphereGeometry(0.75, 32, 24), skin, { y: 0.75, s: [1, 0.95, 0.9] });
  g.add(body);
  g.add(mesh(new THREE.SphereGeometry(0.55, 24, 16), std(0xc8f7b5), { y: 0.6, z: 0.3, s: [1, 0.9, 0.6] }));
  const e = eyes(g, { x: 0, y: 1.05, z: 0.55, r: 0.28, pupil: 0.55 });
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), skin, { x: s * 0.3, y: 1.65, rz: s * -0.4 }));
    g.add(mesh(new THREE.SphereGeometry(0.09, 10, 8), glow(0xffe066, 2), { x: s * 0.42, y: 1.93, shadow: false }));
    g.add(mesh(new THREE.CapsuleGeometry(0.1, 0.35, 4, 8), skin, { x: s * 0.8, y: 0.7, rz: s * 0.9 }));
    g.add(mesh(new THREE.SphereGeometry(0.17, 12, 8), skin, { x: s * 0.3, y: 0.1, z: 0.15, s: [1, 0.5, 1.4] }));
  }
  g.add(mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 16, Math.PI), std(0x2a4a2a), { y: 0.62, z: 0.66, rz: Math.PI, shadow: false }));
  for (let i = 0; i < 5; i++) g.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), std(0x56c25e), { x: Math.sin(i * 1.7) * 0.6, y: 0.9 + Math.cos(i * 2.3) * 0.3, z: -0.4, shadow: false }));
  return { group: g, eyes: e, height: 2.1 };
}

function bibbi() {
  const g = new THREE.Group();
  const skin = std(0xff9ecf, { roughness: 0.5 });
  g.add(mesh(new THREE.CapsuleGeometry(0.42, 0.5, 8, 16), skin, { y: 0.75 }));
  g.add(mesh(new THREE.CylinderGeometry(0.43, 0.5, 0.45, 24), std(0x7a5cff, { roughness: 0.6 }), { y: 0.55 }));
  for (let i = 0; i < 6; i++) g.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), glow(0xfff27a, 1.5), { x: Math.sin(i) * 0.47, y: 0.62, z: Math.cos(i) * 0.47, shadow: false }));
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.7, 12), skin, { y: 1.55 }));
  const head = new THREE.Group();
  head.position.y = 2.0;
  head.add(mesh(new THREE.SphereGeometry(0.38, 24, 16), skin, { s: [1.15, 0.9, 1] }));
  const e = eyes(head, { x: 0.16, y: 0.05, z: 0.3, r: 0.1 });
  e.push(...eyes(head, { x: 0, y: 0.22, z: 0.3, r: 0.09 }));
  head.add(mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 12, Math.PI), std(0x8a2a5a), { y: -0.14, z: 0.33, rz: Math.PI, shadow: false }));
  for (const s of [-1, 1]) head.add(mesh(new THREE.ConeGeometry(0.08, 0.3, 8), std(0xffd166), { x: s * 0.28, y: 0.35, rz: s * -0.5 }));
  g.add(head);
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.CapsuleGeometry(0.07, 0.5, 4, 8), skin, { x: s * 0.5, y: 0.85, rz: s * 0.4 }));
    g.add(mesh(new THREE.CapsuleGeometry(0.1, 0.25, 4, 8), skin, { x: s * 0.2, y: 0.15 }));
  }
  return { group: g, eyes: e, head, height: 2.7 };
}

function zoop() {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.y = 0.7;
  g.add(inner);
  const skin = std(0xb18cff, { roughness: 0.3 });
  inner.add(mesh(new THREE.SphereGeometry(0.6, 32, 24), skin, { y: 0.4, s: [1, 1.1, 1] }));
  for (let i = 0; i < 10; i++) inner.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), std(0xd9c4ff), { x: Math.sin(i * 2.4) * 0.45, y: 0.6 + Math.cos(i * 1.3) * 0.25, z: -0.3 + Math.sin(i) * 0.1, shadow: false }));
  const e = eyes(inner, { x: 0.2, y: 0.45, z: 0.5, r: 0.14 });
  inner.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), std(0x5a2a8a), { y: 0.2, z: 0.57, s: [1.4, 0.7, 0.5], shadow: false }));
  const tentacles = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const t = new THREE.Group();
    t.position.set(Math.sin(a) * 0.35, 0, Math.cos(a) * 0.35);
    t.rotation.y = a;
    for (let k = 0; k < 4; k++) t.add(mesh(new THREE.SphereGeometry(0.11 - k * 0.02, 10, 8), skin, { y: -k * 0.15, z: k * 0.05, shadow: false }));
    inner.add(t);
    tentacles.push(t);
  }
  inner.add(mesh(new THREE.TorusGeometry(0.5, 0.04, 8, 32), glow(0x5ff2ff, 1.5), { y: 1.15, rx: Math.PI / 2, shadow: false }));
  return { group: g, eyes: e, inner, tentacles, height: 2.4 };
}

function mojo() {
  const g = new THREE.Group();
  const shell = std(0xffa94d, { roughness: 0.3, metalness: 0.3 });
  g.add(mesh(new THREE.SphereGeometry(0.6, 32, 24), shell, { y: 0.85 }));
  g.add(mesh(new THREE.TorusGeometry(0.6, 0.06, 8, 32), std(0xffffff), { y: 0.85, rx: Math.PI / 2 }));
  const screen = mesh(new THREE.SphereGeometry(0.45, 24, 16, -0.9, 1.8, 0.9, 1.0), std(0x1b2048, { roughness: 0.1 }), { y: 0.85, z: 0.18 });
  g.add(screen);
  const e = [];
  for (const s of [-1, 1]) {
    const eye = mesh(new THREE.CapsuleGeometry(0.05, 0.08, 4, 8), glow(0x7af0ff, 2.5), { x: s * 0.15, y: 1.0, z: 0.6, shadow: false });
    g.add(eye);
    e.push(eye);
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8), std(0x9aa3b8, { metalness: 0.6 }), { x: s * 0.28, y: 0.2 }));
    g.add(mesh(new THREE.SphereGeometry(0.14, 12, 8), std(0x7a5cff), { x: s * 0.28, y: 0.02, z: 0.06, s: [1, 0.5, 1.4] }));
    g.add(mesh(new THREE.CapsuleGeometry(0.06, 0.35, 4, 8), std(0x9aa3b8, { metalness: 0.6 }), { x: s * 0.68, y: 0.8, rz: s * 0.5 }));
  }
  g.add(mesh(new THREE.TorusGeometry(0.1, 0.02, 6, 12, Math.PI), glow(0x7af0ff, 2), { y: 0.78, z: 0.6, rz: Math.PI, shadow: false }));
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6), std(0x9aa3b8), { y: 1.6 }));
  const prop = new THREE.Group();
  prop.position.y = 1.78;
  for (let i = 0; i < 3; i++) prop.add(mesh(new THREE.BoxGeometry(0.7, 0.02, 0.12), std([0xff5fa2, 0xffd166, 0x5ff2ff][i]), { ry: (i / 3) * Math.PI, shadow: false }));
  g.add(prop);
  g.add(mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.15, 20), std(0xff5fa2), { y: 1.42 }));
  return { group: g, eyes: e, prop, height: 2.3 };
}

const FRIENDS = [
  { name: 'Glorp', make: glorp, lines: ['Blubb blubb!', 'Jag älskar stenar!', 'Har du sett en Plupp?'] },
  { name: 'Bibbi', make: bibbi, lines: ['Hej Stitch!', 'Mitt hals är jättelång!', 'Raketer är så roliga!'] },
  { name: 'Zoop', make: zoop, lines: ['Zoop zoop!', 'Jag kan sväva!', 'Ohana betyder familj!'] },
  { name: 'Mojo', make: mojo, lines: ['Bip bop!', 'Jag är en robot-alien!', 'Mina batterier är tomma… nej, magen!'] },
];

function butterfly(color) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.15, 0.25, 0.45, 0.3, 0.4, 0.05);
  s.bezierCurveTo(0.45, -0.15, 0.2, -0.3, 0, 0);
  const wingMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
  const wings = [];
  for (const side of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.ShapeGeometry(s, 10), wingMat);
    w.scale.x = side;
    const pivot = new THREE.Group();
    pivot.add(w);
    pivot.rotation.x = -Math.PI / 2;
    const flap = new THREE.Group();
    flap.add(pivot);
    g.add(flap);
    wings.push({ flap, side });
  }
  g.add(mesh(new THREE.CapsuleGeometry(0.02, 0.14, 4, 6), std(0x332244), { rx: Math.PI / 2, shadow: false }));
  return { group: g, wings };
}

export class Creatures {
  constructor(game, outdoor) {
    this.game = game;
    this.outdoor = outdoor;
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.tmp = new THREE.Vector3();

    const pluppCols = [0xffc4e0, 0xc4e8ff, 0xfff0a3, 0xd9c2ff, 0xb8ffd1, 0xffd0b0, 0xffffff, 0xa6f0ff];
    this.plupps = pluppCols.map((c, i) => {
      const m = createPluppModel(c, i + 1);
      const p = this.spot(1, 14) || new THREE.Vector3(i * 3, 0, 20);
      m.root.position.copy(p);
      this.group.add(m.root);
      return { ...m, state: 'wander', target: p.clone(), hop: Math.random() * 6, speed: 0, cooldown: 0, blink: Math.random() * 3, panic: 0 };
    });
    this.followers = [];

    this.friends = FRIENDS.map((f, i) => {
      const model = f.make();
      const home = this.spot(2.5, 14, 44) || new THREE.Vector3(10 + i * 4, 0, -10);
      model.group.position.copy(home);
      this.group.add(model.group);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ depthWrite: false }));
      sprite.scale.set(1.4, 1.1, 1);
      sprite.position.y = model.height + 0.7;
      model.group.add(sprite);
      const friend = { ...f, ...model, home, target: home.clone(), wish: null, wishTimer: 0, sprite, t: Math.random() * 10, happy: 0, chatCooldown: 0, fed: 0 };
      this.newWish(friend, true);
      return friend;
    });

    const bfCols = [0xff9de2, 0x9df2ff, 0xfff27a, 0xc3a6ff, 0xb8ffd1];
    this.butterflies = [];
    for (let i = 0; i < (LOW ? 5 : 14); i++) {
      const b = butterfly(bfCols[i % bfCols.length]);
      const home = this.spot(0.5, 11) || new THREE.Vector3(i, 0, 15);
      home.y = 1.2 + Math.random() * 1.5;
      b.group.position.copy(home);
      this.group.add(b.group);
      this.butterflies.push({ ...b, home, phase: Math.random() * 10, speed: 0.6 + Math.random() * 0.6, scare: 0 });
    }
  }

  spot(rad, minR = 11, maxR = WALK_RADIUS - 2) {
    return this.outdoor.randomFree(rad, minR, maxR, -50);
  }

  walkable(x, z, rad = 0.5) {
    return Math.hypot(x, z) < WALK_RADIUS - 1 && this.outdoor.free(x, z, rad, -50);
  }

  interactables() {
    return this.friends.map((f) => ({
      location: 'outside',
      pos: f.group.position,
      radius: 2.8,
      icon: () => (f.wish && this.game.backpack.includes(f.wish) ? rockType(f.wish).emoji : '💬'),
      label: () => {
        if (!f.wish) return `Prata med ${f.name}`;
        const t = rockType(f.wish);
        return this.game.backpack.includes(f.wish) ? `Ge ${t.name} till ${f.name}` : `${f.name} vill ha ${t.name}`;
      },
      action: () => this.talk(f),
    }));
  }

  newWish(f, first = false) {
    const pool = first ? ['manost', 'manost', 'lava', 'meteor'] : ['manost', 'lava', 'meteor', 'is', 'kristall', 'regnbage'];
    f.wish = pool[Math.floor(Math.random() * pool.length)];
    f.sprite.material.map = bubbleTexture(rockType(f.wish).emoji, 'Mums?');
    f.sprite.material.needsUpdate = true;
    f.sprite.visible = true;
  }

  talk(f) {
    const g = this.game;
    const head = () => f.group.position.clone().add(new THREE.Vector3(0, f.height + 0.4, 0));
    if (!f.wish) {
      g.ui.say(head, f.lines[Math.floor(Math.random() * f.lines.length)], 2000);
      return;
    }
    const t = rockType(f.wish);
    const idx = g.backpack.indexOf(f.wish);
    if (idx === -1) {
      g.audio.pop();
      g.ui.say(head, `Jag är så hungrig! Kan du ge mig ${t.emoji}?`, 2600);
      g.ui.toast(`${f.name} vill ha ${t.emoji} ${t.name}. Köp den i en butik 🛸`, 3500);
      return;
    }
    g.backpack.splice(idx, 1);
    g.ui.setBackpack(g.backpack);
    const reward = t.price * 2 + 1;
    g.addStars(reward);
    g.audio.crunch();
    setTimeout(() => g.audio.yay(), 500);
    g.particles.hearts(head());
    g.particles.sparkle(head(), [0xffd166, 0xff5fa2, 0x5ff2ff], 40, 4);
    g.ui.say(head, `Mums! Tack Stitch! +${reward} ⭐`, 2600);
    g.player.stitch.wave(1.2);
    f.happy = 2.5;
    f.fed++;
    f.wish = null;
    f.sprite.material.map = bubbleTexture('💖', null);
    f.sprite.material.needsUpdate = true;
    f.wishTimer = 25 + Math.random() * 15;
    g.emit('gaveFood', { name: f.name });
  }

  nearestPlupp(pos) {
    let best = null, bd = Infinity;
    for (const p of this.plupps) {
      if (p.state === 'follow' || p.state === 'caught') continue;
      const d = p.root.position.distanceTo(pos);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  wishingFriend(pos) {
    let best = null, bd = Infinity;
    for (const f of this.friends) {
      if (!f.wish) continue;
      const has = this.game.backpack.includes(f.wish);
      const d = f.group.position.distanceTo(pos) - (has ? 1000 : 0);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }

  releaseFollowers() {
    for (const p of this.followers) {
      p.state = 'wander';
      p.cooldown = 4;
      p.target.copy(this.spot(1, 14) || p.root.position);
    }
    if (this.followers.length) this.game.ui.toast('Plupparna hoppade hem 🐰', 2000);
    const had = this.followers.length;
    this.followers = [];
    if (had) this.game.emit('followers', { count: 0 });
  }

  setVisible(v) {
    this.group.visible = v;
  }

  update(dt, time, active) {
    const g = this.game;
    const pp = g.player.pos;

    for (const p of this.plupps) {
      const pos = p.root.position;
      p.blink -= dt;
      const bl = p.blink < 0.12 ? 0.1 : 1;
      if (p.blink < 0) p.blink = 2 + Math.random() * 3;
      for (const e of p.blinkers) e.scale.y = bl;
      p.cooldown = Math.max(0, p.cooldown - dt);
      const dist = Math.hypot(pos.x - pp.x, pos.z - pp.z);

      let goal = null;
      let speed = 0;
      if (p.state === 'caught') {
        p.t = (p.t || 0) + dt;
        p.root.rotation.y += dt * 14;
        p.body.position.y = Math.abs(Math.sin(p.t * 10)) * 0.6;
        if (p.t > 0.9) {
          p.state = 'follow';
          p.t = 0;
          this.followers.push(p);
          g.emit('followers', { count: this.followers.length });
        }
        continue;
      } else if (p.state === 'follow') {
        const idx = this.followers.indexOf(p);
        if (idx === -1) {
          p.state = 'wander';
          continue;
        }
        const lead = idx === 0 ? g.player.group.position : this.followers[idx - 1].root.position;
        const d = Math.hypot(lead.x - pos.x, lead.z - pos.z);
        if (d > 1.3) {
          goal = lead;
          speed = Math.min(9, d * 3);
        }
        if (d > 15) pos.set(lead.x, lead.y, lead.z);
      } else {
        if (active && dist < 1.3 && p.cooldown <= 0) {
          p.state = 'caught';
          p.t = 0;
          g.audio.tone(900, 0.12, { type: 'sine', slide: 600, vol: 0.25 });
          g.audio.tone(1300, 0.15, { type: 'sine', slide: 400, vol: 0.2, delay: 0.1 });
          g.particles.hearts(pos.clone().setY(1));
          g.addStars(1);
          g.ui.say(() => p.root.position.clone().setY(1.6), ['Iiih! Du fångade mig!', 'Plupp plupp!', 'Jag följer med dig!'][Math.floor(Math.random() * 3)], 1600);
          g.emit('caughtPlupp', {});
          continue;
        }
        if (active && dist < 6 && p.cooldown <= 0) {
          p.panic = 1.2;
        }
        p.panic = Math.max(0, p.panic - dt);
        if (p.panic > 0) {
          const away = this.tmp.set(pos.x - pp.x, 0, pos.z - pp.z).normalize();
          const zig = Math.sin(time * 5 + p.hop) * 0.7;
          away.applyAxisAngle(new THREE.Vector3(0, 1, 0), zig);
          goal = pos.clone().addScaledVector(away, 3);
          speed = 5.6;
          if (!this.walkable(goal.x, goal.z)) {
            away.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
            goal = pos.clone().addScaledVector(away, 3);
          }
        } else {
          if (Math.hypot(pos.x - p.target.x, pos.z - p.target.z) < 0.5) {
            p.target.copy(this.spot(1, 11) || pos);
            p.wait = 1 + Math.random() * 3;
          }
          if (p.wait > 0) p.wait -= dt;
          else {
            goal = p.target;
            speed = 1.8;
          }
        }
      }

      if (goal) {
        const dx = goal.x - pos.x, dz = goal.z - pos.z;
        const len = Math.hypot(dx, dz) || 1;
        const nx = pos.x + (dx / len) * speed * dt;
        const nz = pos.z + (dz / len) * speed * dt;
        if (p.state === 'follow' || this.walkable(nx, nz)) {
          pos.x = nx;
          pos.z = nz;
        } else p.target.copy(this.spot(1, 11) || pos);
        const yaw = Math.atan2(dx, dz);
        p.root.rotation.y += Math.atan2(Math.sin(yaw - p.root.rotation.y), Math.cos(yaw - p.root.rotation.y)) * Math.min(1, dt * 10);
        p.hop += dt * (6 + speed * 1.5);
        p.body.position.y = Math.abs(Math.sin(p.hop)) * (0.25 + speed * 0.05);
      } else {
        p.hop += dt * 2;
        p.body.position.y = 0;
        p.body.scale.y = 1 + Math.sin(p.hop * 2) * 0.03;
      }
      pos.y = p.state === 'follow' ? g.player.group.position.y : 0;
    }

    for (const f of this.friends) {
      f.t += dt;
      const pos = f.group.position;
      const dist = Math.hypot(pos.x - pp.x, pos.z - pp.z);
      if (!f.wish) {
        f.wishTimer -= dt;
        if (f.wishTimer < 22) f.sprite.visible = false;
        if (f.wishTimer <= 0) this.newWish(f);
      }
      f.sprite.position.y = f.height + 0.7 + Math.sin(f.t * 2) * 0.1;
      f.chatCooldown -= dt;
      if (active && dist < 5 && f.chatCooldown <= 0) {
        f.chatCooldown = 25;
        g.ui.say(() => f.group.position.clone().add(new THREE.Vector3(0, f.height + 0.4, 0)), f.wish ? `Hej! Jag vill ha ${rockType(f.wish).emoji}` : f.lines[Math.floor(Math.random() * f.lines.length)], 2200);
      }
      let yawGoal = null;
      if (f.happy > 0) {
        f.happy -= dt;
        f.group.rotation.y += dt * 8;
        f.group.position.y = Math.abs(Math.sin(f.t * 9)) * 0.5;
      } else if (dist < 4) {
        yawGoal = Math.atan2(pp.x - pos.x, pp.z - pos.z);
        f.group.position.y = 0;
      } else {
        if (Math.hypot(pos.x - f.target.x, pos.z - f.target.z) < 0.4) {
          f.wait = 2 + Math.random() * 4;
          const a = Math.random() * Math.PI * 2;
          const tx = f.home.x + Math.sin(a) * 4, tz = f.home.z + Math.cos(a) * 4;
          if (this.walkable(tx, tz, 1.5)) f.target.set(tx, 0, tz);
          else f.target.copy(f.home);
        }
        if (f.wait > 0) f.wait -= dt;
        else {
          const dx = f.target.x - pos.x, dz = f.target.z - pos.z;
          const len = Math.hypot(dx, dz) || 1;
          pos.x += (dx / len) * 1.2 * dt;
          pos.z += (dz / len) * 1.2 * dt;
          yawGoal = Math.atan2(dx, dz);
        }
        f.group.position.y = Math.abs(Math.sin(f.t * 5)) * 0.06;
      }
      if (yawGoal !== null) f.group.rotation.y += Math.atan2(Math.sin(yawGoal - f.group.rotation.y), Math.cos(yawGoal - f.group.rotation.y)) * Math.min(1, dt * 4);
      const blink = (f.t % 3.5) < 0.12 ? 0.1 : 1;
      for (const e of f.eyes) e.scale.y = blink;
      if (f.head) f.head.rotation.z = Math.sin(f.t * 1.3) * 0.15;
      if (f.inner) f.inner.position.y = 0.7 + Math.sin(f.t * 2) * 0.15;
      if (f.tentacles) f.tentacles.forEach((t, i) => (t.rotation.x = Math.sin(f.t * 3 + i) * 0.3));
      if (f.prop) f.prop.rotation.y += dt * 12;
    }

    for (const b of this.butterflies) {
      b.phase += dt * b.speed;
      const dist = b.group.position.distanceTo(pp);
      if (active && dist < 3) b.scare = 2;
      b.scare = Math.max(0, b.scare - dt);
      const target = this.tmp.set(
        b.home.x + Math.sin(b.phase) * 2.5,
        b.home.y + Math.sin(b.phase * 2.3) * 0.5 + b.scare * 2.5,
        b.home.z + Math.cos(b.phase * 0.8) * 2.5,
      );
      const prev = b.group.position.clone();
      b.group.position.lerp(target, Math.min(1, dt * 2));
      const d = b.group.position.clone().sub(prev);
      if (d.lengthSq() > 1e-6) b.group.rotation.y = Math.atan2(d.x, d.z);
      const flap = Math.sin(time * (18 + b.scare * 10) + b.phase) * 0.9;
      for (const w of b.wings) w.flap.rotation.z = w.side * flap;
    }
  }
}
