import * as THREE from 'three';
import { roadLines, HALF } from './world.js';

const pick = (a) => a[(Math.random() * a.length) | 0];
const SHIRTS = [0xe63946, 0x2a9d8f, 0xffb703, 0x457b9d, 0x9b5de5, 0xf15bb5, 0x00bbf9, 0x06d6a0, 0xff7b00, 0xffffff];
const PANTS = [0x1d3557, 0x3a3a3a, 0x6b4f3a, 0x2a6f97, 0xc9b79c];
const SKIN = [0xf2c9a0, 0xe0ac7e, 0xc68a5c, 0x8d5a3b, 0xffdcb8];
const HAIR = [0x2b1a0e, 0x6b3e1f, 0xe8c36a, 0x111111, 0xb5462a, 0xd8d8d8];
const BALLOONS = [0xff2d55, 0xffd60a, 0x0a84ff, 0x30d158, 0xbf5af2];

const mats = new Map();
const mat = (c, r = 0.75) => {
  const k = `${c}-${r}`;
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r }));
  return mats.get(k);
};
const G = {
  leg: new THREE.CapsuleGeometry(0.09, 0.62, 4, 8),
  torso: new THREE.CapsuleGeometry(0.2, 0.34, 4, 10),
  arm: new THREE.CapsuleGeometry(0.065, 0.48, 4, 8),
  head: new THREE.SphereGeometry(0.16, 14, 10),
  hand: new THREE.SphereGeometry(0.07, 8, 6),
  eye: new THREE.SphereGeometry(0.025, 6, 4),
  balloon: new THREE.SphereGeometry(0.32, 14, 12),
  string: new THREE.CylinderGeometry(0.006, 0.006, 1.2, 3),
  hatBrim: new THREE.CylinderGeometry(0.22, 0.22, 0.04, 14),
  hatTop: new THREE.CylinderGeometry(0.14, 0.14, 0.3, 14),
  cap: new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
};

function makePerson({ rich = false, kid = false } = {}) {
  const shirt = rich ? 0x1a1a2e : pick(SHIRTS);
  const pants = rich ? 0x1a1a2e : pick(PANTS);
  const skin = pick(SKIN);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const mesh = (geo, c, x, y, z, parent = body) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const legs = [-0.11, 0.11].map((x) => {
    const p = new THREE.Group(); p.position.set(x, 0.92, 0); body.add(p);
    mesh(G.leg, pants, 0, -0.45, 0, p);
    return p;
  });
  const torso = mesh(G.torso, shirt, 0, 1.25, 0); torso.scale.set(1.1, 1, 0.75);
  const arms = [-0.29, 0.29].map((x) => {
    const p = new THREE.Group(); p.position.set(x, 1.47, 0); body.add(p);
    mesh(G.arm, shirt, 0, -0.28, 0, p);
    mesh(G.hand, skin, 0, -0.58, 0, p);
    return p;
  });
  mesh(G.head, skin, 0, 1.72, 0);
  mesh(G.eye, 0x111111, -0.06, 1.75, 0.145); mesh(G.eye, 0x111111, 0.06, 1.75, 0.145);
  if (rich) {
    mesh(G.hatBrim, 0x111111, 0, 1.85, 0); mesh(G.hatTop, 0x111111, 0, 2.0, 0);
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 16), mat(0xffd700, 0.2)); chain.rotation.x = Math.PI / 2.4; chain.position.set(0, 1.45, 0.08); body.add(chain);
  } else if (Math.random() < 0.3) mesh(G.cap, pick(SHIRTS), 0, 1.76, 0);
  else { const h = mesh(G.head, pick(HAIR), 0, 1.77, -0.03); h.scale.set(1.05, 0.75, 1.05); }
  let balloon = null;
  if (!rich && Math.random() < (kid ? 0.6 : 0.15)) {
    balloon = new THREE.Group();
    const b = new THREE.Mesh(G.balloon, mat(pick(BALLOONS), 0.25)); b.position.y = 1.3; b.scale.set(1, 1.15, 1); b.castShadow = true;
    const s = new THREE.Mesh(G.string, mat(0xffffff)); s.position.y = 0.6;
    balloon.add(b, s);
    balloon.position.set(0, -0.55, 0);
    arms[1].add(balloon);
  }
  root.scale.setScalar(kid ? 0.62 * 1.3 : 1.3);
  return { root, body, legs, arms, balloon };
}

export class People {
  constructor(game, count = 70) {
    this.game = game;
    this.list = [];
    this.flyingBalloons = [];
    for (let i = 0; i < count; i++) this.spawn();
  }

  randomPath() {
    for (;;) {
      const axis = Math.random() < 0.5 ? 'x' : 'z';
      const line = pick(roadLines);
      const side = Math.random() < 0.5 ? 1 : -1;
      const off = line + side * 9.4;
      if (Math.abs(off) < HALF - 2) return { axis, off };
    }
  }

  spawn(opts = {}, pos = null) {
    const kid = !opts.rich && Math.random() < 0.2;
    const m = makePerson({ ...opts, kid });
    const path = this.randomPath();
    const t = (Math.random() * 2 - 1) * (HALF - 10);
    const p = {
      ...m, kid, rich: !!opts.rich, path, dir: Math.random() < 0.5 ? 1 : -1,
      pos: new THREE.Vector3(), y: 0, vy: 0, heading: 0, state: 'walk', panicT: 0, scaredCd: 0, phase: Math.random() * 6,
      speed: 1.2 + Math.random() * 0.6,
    };
    if (pos) { p.pos.copy(pos).setY(0); p.state = 'panic'; p.panicT = 5; }
    else if (path.axis === 'x') p.pos.set(t, 0, path.off); else p.pos.set(path.off, 0, t);
    this.game.scene.add(p.root);
    this.list.push(p);
    return p;
  }

  blockedAt(x, z) {
    for (const b of this.game.city.buildings) {
      if (x > b.min.x - 0.4 && x < b.max.x + 0.4 && z > b.min.z - 0.4 && z < b.max.z + 0.4) return true;
    }
    return Math.abs(x) > HALF + 8 || Math.abs(z) > HALF + 8;
  }

  scare(p, from, jump = 0) {
    const fresh = p.scaredCd <= 0;
    p.state = 'panic';
    p.panicT = 4 + Math.random() * 2;
    if (jump && p.y <= 0.01) p.vy = jump;
    p.scaredCd = 8;
    if (p.balloon) this.releaseBalloon(p);
    return fresh;
  }

  releaseBalloon(p) {
    const b = p.balloon;
    p.balloon = null;
    const wp = new THREE.Vector3();
    b.getWorldPosition(wp);
    b.removeFromParent();
    b.position.copy(wp);
    b.scale.setScalar(p.kid ? 0.62 * 1.3 : 1.3);
    this.game.scene.add(b);
    this.flyingBalloons.push({ b, t: 0, drift: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5) });
    this.game.onBalloon?.(wp);
  }

  update(dt, bearPos) {
    const tmp = new THREE.Vector3();
    for (const p of this.list) {
      p.scaredCd = Math.max(0, p.scaredCd - dt);
      const toBear = tmp.set(p.pos.x - bearPos.x, 0, p.pos.z - bearPos.z);
      const dist = toBear.length();
      if (bearPos.y > -0.8 && p.state !== 'panic' && dist < (this.game.scareRadius ?? 7)) {
        if (this.scare(p, bearPos, 4)) this.game.onScared?.(p);
      }
      let vx = 0, vz = 0, spd = 0;
      if (p.state === 'panic') {
        p.panicT -= dt;
        toBear.normalize();
        spd = p.rich ? 7.5 : 6.2;
        vx = toBear.x * spd; vz = toBear.z * spd;
        if (p.panicT <= 0) p.state = 'return';
      } else if (p.state === 'return') {
        const target = p.path.axis === 'x' ? new THREE.Vector3(p.pos.x, 0, p.path.off) : new THREE.Vector3(p.path.off, 0, p.pos.z);
        const d = target.sub(p.pos); d.y = 0;
        if (d.length() < 0.3) p.state = 'walk';
        else { d.normalize(); spd = 2.2; vx = d.x * spd; vz = d.z * spd; }
      } else {
        spd = p.speed;
        const along = p.path.axis === 'x' ? p.pos.x : p.pos.z;
        if (along * p.dir > HALF - 8) p.dir = -p.dir;
        if (p.path.axis === 'x') vx = p.dir * spd; else vz = p.dir * spd;
      }
      if (spd > 0) {
        const nx = p.pos.x + vx * dt, nz = p.pos.z + vz * dt;
        if (!this.blockedAt(nx, nz)) { p.pos.x = nx; p.pos.z = nz; }
        else if (!this.blockedAt(nx, p.pos.z)) p.pos.x = nx;
        else if (!this.blockedAt(p.pos.x, nz)) p.pos.z = nz;
        const h = Math.atan2(vx, vz);
        let dh = h - p.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
        p.heading += dh * Math.min(1, dt * 10);
      }
      p.vy -= 20 * dt;
      p.y = Math.max(0, p.y + p.vy * dt);
      if (p.y === 0) p.vy = 0;
      const ground = Math.abs(p.pos.x - Math.round(p.pos.x / 70 - 0.5) * 70 - 35) > 7 && Math.abs(p.pos.z - Math.round(p.pos.z / 70 - 0.5) * 70 - 35) > 7 ? 0.2 : 0;
      p.root.position.set(p.pos.x, p.y + ground, p.pos.z);
      p.root.rotation.y = p.heading;
      const visible = dist < 140;
      p.root.visible = visible;
      if (!visible) continue;
      p.phase += dt * spd * 3.2;
      const sw = Math.sin(p.phase) * Math.min(1, spd / 2) * 0.7;
      p.legs[0].rotation.x = sw; p.legs[1].rotation.x = -sw;
      if (p.state === 'panic') {
        p.arms[0].rotation.set(Math.PI - 0.3 + Math.sin(p.phase * 2) * 0.3, 0, -0.3);
        p.arms[1].rotation.set(Math.PI - 0.3 - Math.sin(p.phase * 2) * 0.3, 0, 0.3);
        p.body.rotation.x = 0.25;
      } else {
        p.arms[0].rotation.set(-sw * 0.8, 0, 0);
        p.arms[1].rotation.set(p.balloon ? -0.4 : sw * 0.8, 0, 0);
        p.body.rotation.x = 0;
      }
    }
    for (let i = this.flyingBalloons.length - 1; i >= 0; i--) {
      const f = this.flyingBalloons[i];
      f.t += dt;
      f.b.position.y += dt * 3;
      f.b.position.addScaledVector(f.drift, dt);
      f.b.rotation.z = Math.sin(f.t * 2) * 0.2;
      if (f.t > 15) { this.game.scene.remove(f.b); this.flyingBalloons.splice(i, 1); }
    }
  }
}
