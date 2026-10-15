import * as THREE from 'three';
import { makePerson } from './people.js';
import { HALF } from './world.js';

const MAX = 4;
const GIVE_UP = 40;
const TRIES = [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8, 2.6, -2.6];

export const stars = (h) => (h >= 14 ? 3 : h >= 7 ? 2 : h >= 2.5 ? 1 : 0);

const groundY = (x, z) => (Math.abs(x - Math.round(x / 70 - 0.5) * 70 - 35) > 7 && Math.abs(z - Math.round(z / 70 - 0.5) * 70 - 35) > 7 ? 0.2 : 0);

export class Police {
  constructor(game) {
    this.game = game;
    this.officers = [];
    this.sirenT = 0;
    this.sirenHigh = false;
    this.alert = false;
  }

  blocked(x, z) {
    return this.game.people.blockedAt(x, z);
  }

  spawnPos(near, vel) {
    const sp = vel ? Math.hypot(vel.x, vel.z) : 0;
    const ahead = (x, z) => sp > 2 && ((x - near.x) * vel.x + (z - near.z) * vel.z) / (sp * Math.hypot(x - near.x, z - near.z) || 1) > 0.2;
    let best = null, bd = 110;
    for (const c of this.game.traffic.cars) {
      if (!c.isPolice || !c.active || c.wrecked || c.driven) continue;
      const d = Math.hypot(c.body.position.x - near.x, c.body.position.z - near.z);
      if (d > 15 && d < bd && !ahead(c.body.position.x, c.body.position.z)) { bd = d; best = c; }
    }
    if (best) {
      best.alertT = 4;
      const p = best.body.position;
      for (const [dx, dz] of [[2.6, 0], [-2.6, 0], [0, 2.6], [0, -2.6]]) if (!this.blocked(p.x + dx, p.z + dz)) return new THREE.Vector3(p.x + dx, 0, p.z + dz);
    }
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = 45 + Math.random() * 15;
      const x = near.x + Math.cos(a) * r, z = near.z + Math.sin(a) * r;
      if (Math.abs(x) < HALF && Math.abs(z) < HALF && !this.blocked(x, z) && (i > 30 || !ahead(x, z))) return new THREE.Vector3(x, 0, z);
    }
    return new THREE.Vector3(THREE.MathUtils.clamp(near.x + 50, -HALF, HALF), 0, near.z);
  }

  spawn(target) {
    const m = makePerson({ police: true });
    const o = { ...m, pos: this.spawnPos(target.pos, target.vel), heading: 0, phase: Math.random() * 6, target, state: 'chase', t: 0, stunT: 0, lostT: 0, last: target.pos.clone(), y: 0, vy: 0, leaveT: 0 };
    this.game.scene.add(m.root);
    this.officers.push(o);
    return o;
  }

  remove(o) {
    this.game.scene.remove(o.root);
    this.officers.splice(this.officers.indexOf(o), 1);
  }

  stun(pos, radius, dur, push = 6) {
    let n = 0;
    for (const o of this.officers) {
      if (o.state === 'stunned' || o.state === 'leave') continue;
      const d = Math.hypot(o.pos.x - pos.x, o.pos.z - pos.z);
      if (d > radius) continue;
      o.state = 'stunned';
      o.stunT = dur;
      o.vy = push;
      o.away = new THREE.Vector3(o.pos.x - pos.x, 0, o.pos.z - pos.z).normalize().multiplyScalar(push * 0.8);
      n++;
    }
    return n;
  }

  step(o, goal, speed, dt) {
    const dx = goal.x - o.pos.x, dz = goal.z - o.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) return 0;
    const a0 = Math.atan2(dx, dz);
    const len = Math.min(d, speed * dt);
    for (const da of TRIES) {
      const a = a0 + da;
      const nx = o.pos.x + Math.sin(a) * len, nz = o.pos.z + Math.cos(a) * len;
      if (this.blocked(nx, nz)) continue;
      o.pos.x = nx; o.pos.z = nz;
      let dh = a - o.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      o.heading += dh * Math.min(1, dt * 10);
      return speed;
    }
    return 0;
  }

  update(dt, suspects, viewer) {
    for (const s of suspects) {
      const need = s.caught ? 0 : stars(s.heat);
      const have = this.officers.filter((o) => o.target === s && o.state !== 'leave').length;
      if (need > have && this.officers.length < MAX && (this.spawnCd = (this.spawnCd || 0) - dt) <= 0) {
        this.spawn(s);
        this.spawnCd = 1.2;
      }
    }
    let nearest = Infinity;
    for (let i = this.officers.length - 1; i >= 0; i--) {
      const o = this.officers[i];
      const s = o.target;
      o.t += dt;
      let spd = 0;
      if (o.state === 'stunned') {
        o.stunT -= dt;
        o.pos.addScaledVector(o.away, dt);
        o.away.multiplyScalar(1 - Math.min(1, dt * 4));
        if (o.stunT <= 0) o.state = 'chase';
      } else if (o.state === 'leave') {
        o.leaveT += dt;
        const away = new THREE.Vector3(o.pos.x * 2 - s.pos.x, 0, o.pos.z * 2 - s.pos.z);
        spd = this.step(o, away, 3, dt);
        if (o.leaveT > 6) { this.remove(o); continue; }
      } else {
        const d = Math.hypot(s.pos.x - o.pos.x, s.pos.z - o.pos.z);
        const sees = !s.hidden && !s.caught && d < 70;
        if (sees) { o.last.copy(s.pos); o.lostT = 0; } else o.lostT += dt;
        if (o.lostT > 6 || o.t > GIVE_UP || s.caught || stars(s.heat) === 0) { o.state = 'leave'; o.leaveT = 0; }
        else {
          spd = this.step(o, o.last, s.chaseSpeed, dt);
          if (sees && s.catchable && d < s.catchR) {
            s.onCaught(o);
            for (const p of this.officers) if (p.target === s) { p.state = 'leave'; p.leaveT = 0; }
          }
        }
        if (o.state === 'chase') nearest = Math.min(nearest, Math.hypot(viewer.x - o.pos.x, viewer.z - o.pos.z));
      }
      this.animate(o, dt, spd, viewer);
    }
    this.alert = this.officers.some((o) => o.state === 'chase');
    if (nearest < 90) {
      this.sirenT -= dt;
      if (this.sirenT <= 0) {
        this.sirenT = 0.55;
        this.sirenHigh = !this.sirenHigh;
        this.game.sfx.siren(this.sirenHigh, 1 - nearest / 90);
      }
    }
  }

  animate(o, dt, spd, viewer) {
    o.vy -= 20 * dt;
    o.y = Math.max(0, o.y + o.vy * dt);
    if (o.y === 0) o.vy = 0;
    o.root.position.set(o.pos.x, o.y + groundY(o.pos.x, o.pos.z), o.pos.z);
    o.root.rotation.y = o.heading;
    o.root.visible = Math.hypot(viewer.x - o.pos.x, viewer.z - o.pos.z) < 140;
    if (!o.root.visible) return;
    if (o.state === 'stunned') {
      o.body.rotation.x = THREE.MathUtils.lerp(o.body.rotation.x, -1.45, Math.min(1, dt * 10));
      o.body.position.y = 0.25;
      o.arms[0].rotation.set(Math.PI - 0.5, 0, -0.6);
      o.arms[1].rotation.set(Math.PI - 0.5, 0, 0.6);
      return;
    }
    o.body.rotation.x = THREE.MathUtils.lerp(o.body.rotation.x, spd > 4 ? 0.2 : 0, Math.min(1, dt * 8));
    o.body.position.y = 0;
    o.phase += dt * Math.max(spd, 0.5) * 2.2;
    const sw = Math.sin(o.phase) * Math.min(1, spd / 2) * 0.9;
    o.legs[0].rotation.x = sw; o.legs[1].rotation.x = -sw;
    if (o.state === 'chase' && spd > 0) {
      o.arms[0].rotation.set(-sw * 0.9, 0, 0);
      o.arms[1].rotation.set(-1.4 + Math.sin(o.phase * 2) * 0.1, 0, 0);
    } else {
      o.arms[0].rotation.set(-sw * 0.6, 0, 0);
      o.arms[1].rotation.set(sw * 0.6, 0, 0);
    }
  }
}
