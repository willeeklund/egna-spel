import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { HALF } from './world.js';
import { FLOOR, HOLE } from './tunnel.js';
import * as fx from './fx.js';

const TRIES = [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8, 2.6, -2.6];
const groundY = (x, z) => (Math.abs(x - Math.round(x / 70 - 0.5) * 70 - 35) > 7 && Math.abs(z - Math.round(z / 70 - 0.5) * 70 - 35) > 7 ? 0.2 : 0);
const rampY = (x) => FLOOR + THREE.MathUtils.clamp((x - 9) / (HOLE.x1 - 9), 0, 1) * (0.2 - FLOOR);
const rnd = (a, b) => a + Math.random() * (b - a);

const KINDS = {
  bear: { name: 'Skurk-Bruno', walk: 6.5, flee: 10.5, chase: 11, catchR: 2.3, reach: 2.6, scale: 0.9, tagY: 5.6, tag: [5, 1.25] },
  rat: { name: 'Skurk-Rut', walk: 3.2, flee: 5.3, chase: 5.6, catchR: 0.9, reach: 0.8, scale: 1, tagY: 0.7, tag: [1.5, 0.38] },
};

function nameTag(text) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(30,0,0,.65)';
  g.beginPath(); g.roundRect(4, 6, 248, 52, 20); g.fill();
  g.fillStyle = '#ff5a4a'; g.font = 'bold 34px "Luckiest Guy", Impact, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(`🦹 ${text}`, 128, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false }));
}

export class Villains {
  constructor(game, models) {
    this.game = game;
    this.models = models;
    this.list = [];
    const kinds = Math.random() < 0.5 ? ['bear', 'rat'] : [Math.random() < 0.5 ? 'bear' : 'rat'];
    for (const k of kinds) this.list.push(this.make(k));
  }

  make(kind) {
    const K = KINDS[kind];
    const { bearMats, makeBearModel, makeRatModel } = this.models;
    const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, side: THREE.DoubleSide });
    let model, mask;
    if (kind === 'bear') {
      const fur = bearMats.fur.clone(); fur.color.set(0x55565e);
      const light = bearMats.light.clone(); light.color.set(0x9a9aa2);
      const dark = bearMats.dark.clone(); dark.color.set(0x222226);
      model = makeBearModel(fur, light, dark);
      mask = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.26, 24, 1, true, -0.42 * Math.PI, 0.84 * Math.PI), black);
      mask.position.set(0, 0.2, 0);
    } else {
      model = makeRatModel(new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.9 }));
      mask = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.035, 16, 1, true, -0.42 * Math.PI, 0.84 * Math.PI), black);
      mask.position.set(0, 0.03, 0);
    }
    model.userData.head.add(mask);
    model.scale.setScalar(K.scale);
    const tag = nameTag(K.name);
    tag.position.y = K.tagY / K.scale;
    tag.scale.set(K.tag[0] / K.scale, K.tag[1] / K.scale, 1);
    model.add(tag);
    this.game.scene.add(model);
    let body = null;
    if (kind === 'bear') {
      body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: this.game.physMat });
      body.addShape(new CANNON.Sphere(1.1));
      this.game.world.addBody(body);
    }
    const v = {
      kind, K, name: K.name, model, body,
      pos: new THREE.Vector3(), y: 0, heading: 0, state: 'gone', goneT: 1 + Math.random() * 4, t: 0,
      goal: null, prop: null, actT: 0, stunT: 0, hideT: 0, path: null,
      heat: 0, hidden: false, caught: false, catchable: true, catchR: K.catchR, chaseSpeed: K.chase,
      anim: { phase: 0, speed: 0, running: false, grounded: true, hitT: 0, hitDur: 0.38, hitSide: 1, stompT: 0, stompDur: 0.45, roarT: 0, roarDur: 1.4, drinking: false, showering: false, showerBlend: 0, foam: 0, climbing: false, climbSpeed: 0, climbBlend: 0, eatT: 0, yaw: 0 },
    };
    v.onCaught = () => this.caught(v);
    model.visible = false;
    return v;
  }

  blocked(x, z) {
    return this.game.people.blockedAt(x, z);
  }

  spawnNear(v, p) {
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2, r = rnd(45, 70);
      const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
      if (Math.abs(x) < HALF - 4 && Math.abs(z) < HALF - 4 && !this.blocked(x, z)) { v.pos.set(x, 0, z); return; }
    }
    v.pos.set(THREE.MathUtils.clamp(p.x + 50, -HALF + 4, HALF - 4), 0, p.z);
  }

  caught(v) {
    v.caught = true;
    v.state = 'gone';
    v.goneT = 30;
    v.heat = 0;
    v.model.visible = false;
    this.game.onVillainCaught?.(v);
  }

  hitAt(center, radius, dir) {
    const out = [];
    for (const v of this.list) {
      if (v.state === 'gone' || v.state === 'stunned') continue;
      if (Math.hypot(v.pos.x - center.x, v.pos.z - center.z) > radius + (v.kind === 'bear' ? 1 : 0)) continue;
      v.state = 'stunned';
      v.stunT = 2.5;
      v.push = dir.clone().setY(0).normalize().multiplyScalar(v.kind === 'bear' ? 8 : 4);
      out.push(v);
    }
    return out;
  }

  move(v, goal, speed, dt, free = false) {
    const dx = goal.x - v.pos.x, dz = goal.z - v.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) return 0;
    const a0 = Math.atan2(dx, dz);
    const len = Math.min(d, speed * dt);
    for (const da of free ? [0] : TRIES) {
      const a = a0 + da;
      const nx = v.pos.x + Math.sin(a) * len, nz = v.pos.z + Math.cos(a) * len;
      if (!free && this.blocked(nx, nz)) continue;
      v.pos.x = nx; v.pos.z = nz;
      let dh = a - v.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      v.heading += dh * Math.min(1, dt * 8);
      return speed;
    }
    return 0;
  }

  pickProp(v, player) {
    let best = null, bd = Infinity;
    for (const p of this.game.city.props) {
      if (!p.inWorld || p.knocked) continue;
      if (v.kind === 'rat' && p.body.mass > 30) continue;
      const dp = Math.hypot(p.body.position.x - player.x, p.body.position.z - player.z);
      if (dp > 40) continue;
      const d = Math.hypot(p.body.position.x - v.pos.x, p.body.position.z - v.pos.z) + Math.random() * 15;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  act(v) {
    const g = this.game;
    const p = v.prop;
    v.anim.hitT = v.anim.hitDur;
    v.anim.hitSide = -v.anim.hitSide;
    const f = new THREE.Vector3(Math.sin(v.heading), 0, Math.cos(v.heading));
    if (p && !p.knocked) {
      p.knocked = true;
      if (p.def.spray) { p.spray = 14; g.sfx.water(); }
      p.body.wakeUp();
      const pow = v.kind === 'bear' ? 16 : 5;
      p.body.velocity.set(f.x * pow, v.kind === 'bear' ? 8 : 3, f.z * pow);
      p.body.angularVelocity.set(rnd(-8, 8), rnd(-4, 4), rnd(-8, 8));
      fx.debris(new THREE.Vector3().copy(p.body.position), p.def.colors, 6, 5);
      g.sfx[p.def.sound]?.();
      v.heat = Math.min(20, v.heat + (v.kind === 'bear' ? 2.2 : 1.6));
    }
    if (v.kind === 'bear') {
      for (const car of g.traffic.cars) {
        if (!car.active || car.wrecked || car.driven) continue;
        if (Math.hypot(car.body.position.x - v.pos.x, car.body.position.z - v.pos.z) > 4.5) continue;
        g.traffic.wreck(car);
        car.byVillain = true;
        car.body.velocity.set(f.x * 12, 10, f.z * 12);
        car.body.angularVelocity.set(f.z * 6, rnd(-2, 2), -f.x * 6);
        g.sfx.crash();
        v.heat = Math.min(20, v.heat + 3);
        break;
      }
    }
    for (const pp of g.people.list) {
      if (Math.hypot(pp.pos.x - v.pos.x, pp.pos.z - v.pos.z) < (v.kind === 'bear' ? 8 : 3)) {
        if (g.people.scare(pp, v.pos, 4)) v.heat = Math.min(20, v.heat + 0.5);
      }
    }
    if (v.kind === 'rat') g.sfx.squeak();
  }

  nearestCop(v) {
    let best = null, bd = 30;
    for (const o of this.game.police.officers) {
      if (o.target !== v || o.state !== 'chase') continue;
      const d = Math.hypot(o.pos.x - v.pos.x, o.pos.z - v.pos.z);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  tunnelPath(inward) {
    const room = new THREE.Vector3(rnd(-5, 3), 0, rnd(-5, 5));
    const pts = [new THREE.Vector3(HOLE.x1 + 3, 0, 0), new THREE.Vector3(HOLE.x1 - 0.5, 0, 0), new THREE.Vector3(8, 0, 0), room];
    return inward ? pts : pts.reverse();
  }

  update(dt, player) {
    const tunnel = this.game.city.tunnel;
    for (const v of this.list) {
      v.t += dt;
      v.heat = Math.max(0, v.heat - dt * (v.hidden ? 1.5 : 0.3));
      v.anim.hitT = Math.max(0, v.anim.hitT - dt);
      if (v.state === 'gone') {
        v.goneT -= dt;
        if (v.body && this.game.world.bodies.includes(v.body)) this.game.world.removeBody(v.body);
        if (v.goneT <= 0) {
          this.spawnNear(v, player);
          v.caught = false;
          v.hidden = false;
          v.state = 'roam';
          v.inTun = false;
          v.prop = null;
          v.model.visible = true;
          if (v.body) this.game.world.addBody(v.body);
        }
        continue;
      }
      let spd = 0;
      if (v.state === 'stunned') {
        v.stunT -= dt;
        v.pos.addScaledVector(v.push, dt);
        v.push.multiplyScalar(1 - Math.min(1, dt * 4));
        if (this.blocked(v.pos.x, v.pos.z)) v.pos.addScaledVector(v.push, -dt);
        if (v.stunT <= 0) { v.state = 'flee'; v.fleeT = 3; v.fleeFrom = player.clone(); }
      } else if (v.state === 'path') {
        const wp = v.path[0];
        spd = this.move(v, wp, v.K.flee, dt, v.inTun);
        if (Math.hypot(wp.x - v.pos.x, wp.z - v.pos.z) < 0.3) {
          v.path.shift();
          if (v.pathIn && v.path.length === 3) v.inTun = true;
          if (!v.pathIn && !v.path.length) v.inTun = false;
          if (!v.path.length) {
            if (v.pathIn) { v.state = 'hide'; v.hideT = rnd(12, 18); } else v.state = 'roam';
          }
        }
      } else if (v.state === 'hide') {
        v.hideT -= dt;
        if (v.hideT <= 0) { v.state = 'path'; v.pathIn = false; v.path = this.tunnelPath(false); }
      } else {
        const cop = this.nearestCop(v);
        if (cop) {
          const toHatch = Math.hypot(HOLE.x1 + 3 - v.pos.x, v.pos.z);
          if (tunnel.open && toHatch < 70) { v.state = 'path'; v.pathIn = true; v.path = this.tunnelPath(true); continue; }
          const away = new THREE.Vector3(v.pos.x - cop.pos.x, 0, v.pos.z - cop.pos.z).normalize().multiplyScalar(20).add(v.pos);
          away.x = THREE.MathUtils.clamp(away.x, -HALF + 5, HALF - 5);
          away.z = THREE.MathUtils.clamp(away.z, -HALF + 5, HALF - 5);
          spd = this.move(v, away, v.K.flee, dt);
        } else if (v.state === 'flee') {
          v.fleeT -= dt;
          const away = new THREE.Vector3(v.pos.x - v.fleeFrom.x, 0, v.pos.z - v.fleeFrom.z).normalize().multiplyScalar(20).add(v.pos);
          spd = this.move(v, away, v.K.flee, dt);
          if (v.fleeT <= 0) v.state = 'roam';
        } else {
          if (Math.hypot(v.pos.x - player.x, v.pos.z - player.z) > 90) this.spawnNear(v, player);
          if (!v.prop || v.prop.knocked || !v.prop.inWorld) v.prop = this.pickProp(v, player);
          if (v.actT > 0) v.actT -= dt;
          else if (v.prop) {
            const pp = v.prop.body.position;
            const d = Math.hypot(pp.x - v.pos.x, pp.z - v.pos.z);
            if (d < v.K.reach) { this.act(v); v.actT = 1.2; v.prop = null; }
            else spd = this.move(v, pp, v.K.walk, dt);
          } else {
            v.goal ??= new THREE.Vector3(player.x + rnd(-30, 30), 0, player.z + rnd(-30, 30));
            spd = this.move(v, v.goal, v.K.walk * 0.7, dt);
            if (spd === 0 || Math.hypot(v.goal.x - v.pos.x, v.goal.z - v.pos.z) < 1) v.goal = null;
          }
        }
      }
      v.y = v.inTun ? (v.pos.x > 9 ? rampY(v.pos.x) : FLOOR) : groundY(v.pos.x, v.pos.z);
      v.hidden = v.y < -0.8;
      v.catchable = !v.hidden && v.state !== 'path';
      v.model.position.set(v.pos.x, v.y, v.pos.z);
      v.model.rotation.y = v.heading;
      v.model.rotation.z = v.state === 'stunned' ? THREE.MathUtils.lerp(v.model.rotation.z, 1.3, Math.min(1, dt * 8)) : THREE.MathUtils.lerp(v.model.rotation.z, 0, Math.min(1, dt * 8));
      if (v.body) v.body.position.set(v.pos.x, v.y + 1.2, v.pos.z);
      const a = v.anim;
      a.speed = spd;
      a.running = spd > v.K.walk + 0.5;
      a.yaw = v.heading;
      v.model.visible = Math.hypot(v.pos.x - player.x, v.pos.z - player.z) < 150;
      if (v.model.visible) (v.kind === 'bear' ? this.models.animateBear : this.models.animateRat)(v.model, dt, a);
    }
  }
}
