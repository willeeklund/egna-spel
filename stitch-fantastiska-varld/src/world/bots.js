import * as THREE from 'three';
import { createStitch, PALETTES } from '../models/stitch.js';
import { createNameTag } from '../models/nameTag.js';
import { createRock } from '../models/rockFood.js';
import { WALK_RADIUS } from './outdoor.js';
import { LOW } from '../core/quality.js';

const ROSTER = [
  { name: 'Kiki', palette: 'rosa' },
  { name: 'Momo', palette: 'lila' },
  { name: 'Zigge', palette: 'grön' },
  { name: 'Pip', palette: 'orange' },
  { name: 'Luna', palette: 'turkos' },
];

const GOALS = [
  ['star', 3], ['plupp', 2.5], ['rocket', 1.6], ['trampoline', 1.6], ['shop', 1.2], ['house', 1.0],
  ['friend', 1.5], ['ball', 1.5], ['player', 1.0], ['fountain', 1.0], ['wander', 0.8],
];

const LINES = {
  rocket: ['Wiii! 🚀', 'Titta vad högt!', 'Hej då raket!'],
  star: ['En stjärna! ⭐', 'Jippi!', 'Min stjärna!'],
  plupp: ['Plupp plupp!', 'Kom hit lilla Plupp!', 'Så gosig! 🐰'],
  trampoline: ['Wiiiii!', 'Högre!', 'Boing boing!'],
  eat: ['Mums! 😋', 'Krispigt!', 'Stenar är bäst!'],
  friend: ['Hej kompis!', 'Aloha!', 'Vill du leka?'],
  ball: ['Mål! ⚽', 'Pang!', 'Iväg med dig!'],
  tagged: ['Hihi!', 'Aloha!', 'Kul att ses!', 'Ohana! 💙'],
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class Bots {
  constructor(game, playerPalette, playerName) {
    this.game = game;
    this.playerName = playerName;
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.lastBotRocket = -100;
    this.time = 0;
    const R = game.physics.R;
    const used = new Set([playerPalette]);
    this.bots = ROSTER.slice(0, LOW ? 2 : ROSTER.length).map((r, i) => {
      let palette = r.palette;
      if (used.has(palette)) palette = Object.keys(PALETTES).find((k) => !used.has(k) && !ROSTER.some((o) => o.palette === k));
      used.add(palette);
      const stitch = createStitch({ palette });
      stitch.group.add(createNameTag(r.name, PALETTES[palette].css));
      const held = new THREE.Group();
      held.position.set(0, 1.25, 0.45);
      stitch.group.add(held);
      const a = (i / ROSTER.length) * Math.PI * 2 + 0.5;
      const pos = new THREE.Vector3(Math.sin(a) * 13, 0, Math.cos(a) * 13);
      stitch.group.position.copy(pos);
      this.group.add(stitch.group);
      const body = game.physics.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(pos.x, 0.77, pos.z));
      game.physics.world.createCollider(R.ColliderDesc.capsule(0.35, 0.42), body);
      return {
        name: r.name, palette, stitch, group: stitch.group, held, body, pos,
        heading: Math.random() * Math.PI * 2, speed: 0, y: 0, vy: 0,
        goal: null, waypoints: [], hidden: false, timer: 1 + i * 0.7,
        rocketCooldown: 20 + i * 8, playerCooldown: 10 + i * 6, bestDist: Infinity, stuck: 0, hopT: 3 + Math.random() * 5,
      };
    });
    this.group.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      if (o.geometry.boundingSphere.radius < 0.3) o.castShadow = false;
    });
  }

  interactables() {
    return this.bots.map((b) => ({
      location: 'outside',
      pos: b.pos,
      radius: 2.2,
      icon: '👋',
      label: () => `Säg hej till ${b.name}`,
      enabled: () => !b.hidden,
      action: () => this.greet(b),
    }));
  }

  greet(b) {
    const g = this.game;
    b.stitch.wave(1.6);
    g.player.stitch.wave(1.2);
    b.heading = Math.atan2(g.player.pos.x - b.pos.x, g.player.pos.z - b.pos.z);
    g.audio.yay();
    g.particles.sparkle(b.pos.clone().setY(1.4), [0xff5fa2, 0xffd166, 0x5ff2ff], 24, 3);
    this.say(b, `${pick(LINES.tagged)} Hej ${this.playerName}!`, 2200);
    if (b.goal && b.goal.type !== 'shop' && b.goal.type !== 'house') this.setGoal(b, { type: 'idle', until: 2.0 });
  }

  say(b, text, ms = 1800) {
    if (b.hidden || this.game.location !== 'outside') return;
    if (b.pos.distanceTo(this.game.player.pos) > 22) return;
    this.game.ui.say(() => b.group.position.clone().add(new THREE.Vector3(0, 2.7, 0)), text, ms);
  }

  setVisible(v) {
    this.group.visible = v;
  }

  blocked(x, z, target) {
    if (Math.hypot(x, z) > WALK_RADIUS - 0.8) return true;
    if (Math.hypot(x, z) < 4.4) return true;
    for (const o of this.game.outdoor.obstacles) {
      if (o.r >= 10 && o.x === 0 && o.z === 0) continue;
      if (target && Math.hypot(target.x - o.x, target.z - o.z) < o.r + 0.5) continue;
      if (Math.hypot(x - o.x, z - o.z) < o.r * 0.8 + 0.3) return true;
    }
    return false;
  }

  lineClear(a, b, target) {
    const d = a.distanceTo(b);
    const n = Math.ceil(d / 0.8);
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (this.blocked(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, target)) return false;
    }
    return true;
  }

  route(from, to) {
    if (this.lineClear(from, to, to)) return [to.clone()];
    const R = 12.5;
    const a0 = Math.atan2(from.x, from.z);
    const a1 = Math.atan2(to.x, to.z);
    let da = a1 - a0;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    const steps = Math.max(1, Math.ceil(Math.abs(da) / 0.4));
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (da * i) / steps;
      pts.push(new THREE.Vector3(Math.sin(a) * R, 0, Math.cos(a) * R));
    }
    pts.push(to.clone());
    return pts;
  }

  setGoal(b, goal) {
    b.goal = goal;
    b.goalT = 0;
    b.bestDist = Infinity;
    b.stuck = 0;
    b.waypoints = goal.target ? this.route(b.pos, goal.target) : [];
  }

  chooseGoal(b) {
    const g = this.game;
    const o = g.outdoor;
    const options = GOALS.filter(([type]) => {
      if (type === 'rocket') return b.rocketCooldown <= 0 && this.time - this.lastBotRocket > 18 && !g.quests?.current?.timed && o.rockets.some((r) => r.home && !this.claimed(r));
      if (type === 'player') return b.playerCooldown <= 0 && g.location === 'outside';
      if (type === 'star') return g.starField.stars.some((s) => s.active && !this.claimed(s));
      return true;
    });
    const total = options.reduce((s, [, w]) => s + w, 0);
    let roll = Math.random() * total;
    let type = 'wander';
    for (const [t, w] of options) {
      roll -= w;
      if (roll <= 0) { type = t; break; }
    }
    const near = (list, posOf) => list.reduce((best, it) => (!best || posOf(it).distanceTo(b.pos) < posOf(best).distanceTo(b.pos) ? it : best), null);

    if (type === 'star') {
      const s = near(g.starField.stars.filter((s) => s.active && !this.claimed(s)), (s) => s.g.position);
      return this.setGoal(b, { type, ref: s, target: s.g.position.clone().setY(0) });
    }
    if (type === 'rocket') {
      const r = near(o.rockets.filter((r) => r.home && !this.claimed(r)), (r) => r.doorPos);
      return this.setGoal(b, { type, ref: r, target: r.doorPos });
    }
    if (type === 'plupp') {
      const free = g.creatures.plupps.filter((p) => p.state === 'wander');
      if (free.length) return this.setGoal(b, { type, ref: pick(free), chase: true, until: 14 });
    }
    if (type === 'trampoline') {
      const t = o.trampoline.pos;
      const dir = b.pos.clone().sub(t).setY(0).normalize();
      return this.setGoal(b, { type, target: t.clone().addScaledVector(dir, 3.2) });
    }
    if (type === 'shop') {
      const s = pick(o.shops);
      return this.setGoal(b, { type, ref: s, target: s.pos.clone() });
    }
    if (type === 'house') {
      const r = pick(o.rockets.filter((r) => r.home));
      if (r) return this.setGoal(b, { type, ref: r, target: r.doorPos });
    }
    if (type === 'friend') return this.setGoal(b, { type, ref: pick(g.creatures.friends), chase: true, until: 16 });
    if (type === 'ball') {
      const k = pick(o.kickables);
      return this.setGoal(b, { type, ref: k, chase: true, until: 14 });
    }
    if (type === 'player') {
      b.playerCooldown = 50 + Math.random() * 30;
      return this.setGoal(b, { type, chase: true, until: 15 });
    }
    if (type === 'fountain') {
      const a = Math.random() * Math.PI * 2;
      return this.setGoal(b, { type, target: new THREE.Vector3(Math.sin(a) * 6, 0, Math.cos(a) * 6) });
    }
    const spot = o.randomFree(1, 12, WALK_RADIUS - 3, 0) || new THREE.Vector3(0, 0, 14);
    return this.setGoal(b, { type: 'wander', target: spot });
  }

  claimed(ref) {
    return this.bots.some((b) => b.goal && b.goal.ref === ref);
  }

  chaseTarget(b) {
    const goal = b.goal;
    const g = this.game;
    if (goal.type === 'plupp') return goal.ref.root.position;
    if (goal.type === 'friend') return goal.ref.group.position;
    if (goal.type === 'ball') {
      const t = goal.ref.body.translation();
      return new THREE.Vector3(t.x, 0, t.z);
    }
    if (goal.type === 'player') return g.location === 'outside' ? g.player.pos : null;
    return null;
  }

  arrived(b) {
    const g = this.game;
    const goal = b.goal;
    switch (goal.type) {
      case 'star':
        if (g.starField.take(goal.ref) && Math.random() < 0.5) this.say(b, pick(LINES.star));
        return this.setGoal(b, { type: 'idle', until: 0.8 + Math.random() });
      case 'rocket': {
        const r = goal.ref;
        b.heading = Math.atan2(r.basePos.x - b.pos.x, r.basePos.z - b.pos.z);
        b.stitch.punch();
        if (r.hit(b)) {
          this.lastBotRocket = this.time;
          b.rocketCooldown = 60 + Math.random() * 40;
          this.say(b, pick(LINES.rocket));
        }
        return this.setGoal(b, { type: 'watch', until: 3 });
      }
      case 'plupp':
        g.particles.hearts(goal.ref.root.position.clone().setY(0.9));
        goal.ref.panic = 0;
        goal.ref.wait = 2;
        b.stitch.wave(1);
        this.say(b, pick(LINES.plupp));
        return this.setGoal(b, { type: 'idle', until: 2 });
      case 'trampoline':
        b.bounces = 3 + Math.floor(Math.random() * 3);
        b.vy = 10;
        b.jumpFrom = b.pos.clone();
        b.jumpTo = g.outdoor.trampoline.pos.clone();
        b.jumpT = 0;
        return this.setGoal(b, { type: 'bouncing' });
      case 'shop':
        b.beamT = 0;
        return this.setGoal(b, { type: 'beaming' });
      case 'house':
        g.audioAt(b.pos, () => g.audio.door(), 30);
        this.hide(b, 10 + Math.random() * 10, { type: 'exitHouse', ref: goal.ref });
        return;
      case 'friend':
        b.heading = Math.atan2(goal.ref.group.position.x - b.pos.x, goal.ref.group.position.z - b.pos.z);
        b.stitch.wave(1.5);
        goal.ref.happy = 1.4;
        this.say(b, pick(LINES.friend));
        return this.setGoal(b, { type: 'idle', until: 2.2 });
      case 'ball': {
        const k = goal.ref;
        const t = k.body.translation();
        const dir = new THREE.Vector3(t.x - b.pos.x, 0, t.z - b.pos.z).normalize();
        const m = k.body.mass();
        b.stitch.punch();
        k.body.applyImpulse({ x: dir.x * 8 * m, y: 5 * m, z: dir.z * 8 * m }, true);
        g.audioAt(b.pos, () => g.audio.whack(), 30);
        if (Math.random() < 0.5) this.say(b, pick(LINES.ball));
        return this.setGoal(b, { type: 'idle', until: 1.2 });
      }
      case 'player':
        b.heading = Math.atan2(g.player.pos.x - b.pos.x, g.player.pos.z - b.pos.z);
        b.stitch.wave(2);
        this.say(b, `Hej ${this.playerName}! ${pick(['Vill du leka?', 'Har du fångat någon Plupp?', 'Har du sett raketerna?', 'Aloha!'])}`, 2600);
        return this.setGoal(b, { type: 'idle', until: 2.5 });
      case 'fountain':
        return this.setGoal(b, { type: 'idle', until: 2 + Math.random() * 3, hop: true });
      default:
        return this.setGoal(b, { type: 'idle', until: 1 + Math.random() * 2 });
    }
  }

  hide(b, seconds, after) {
    b.hidden = true;
    b.group.visible = false;
    b.hideT = seconds;
    b.after = after;
    b.body.setNextKinematicTranslation({ x: b.pos.x, y: -60, z: b.pos.z });
    this.setGoal(b, { type: 'hidden' });
  }

  reappear(b) {
    const g = this.game;
    const after = b.after;
    b.hidden = false;
    b.group.visible = true;
    b.y = 0;
    b.vy = 0;
    if (after.type === 'exitHouse') {
      const r = after.ref;
      const out = new THREE.Vector3(Math.sin(r.facing), 0, Math.cos(r.facing));
      b.pos.copy(r.doorPos).addScaledVector(out, 0.8);
      b.heading = r.facing;
      this.setGoal(b, { type: 'idle', until: 1 });
    } else {
      const s = after.ref;
      const toC = s.pos.clone().negate().setY(0).normalize();
      b.pos.copy(s.pos).addScaledVector(toC, 3.4);
      b.heading = Math.atan2(toC.x, toC.z);
      g.particles.sparkle(b.pos.clone().setY(1), s.cfg.beamColor, 20, 2);
      const rock = pick(['lava', 'manost', 'meteor', 'kristall', 'is', 'regnbage']);
      b.eatRock = rock;
      this.setGoal(b, { type: 'eating', until: 2.6 });
    }
  }

  update(dt, time) {
    this.time += dt;
    const g = this.game;
    const pp = g.player.pos;
    const visibleOutside = g.location === 'outside';

    for (const b of this.bots) {
      b.rocketCooldown -= dt;
      b.playerCooldown -= dt;
      const goal = b.goal;
      let moveTarget = null;
      let targetSpeed = 0;

      if (!goal) {
        b.timer -= dt;
        if (b.timer <= 0) this.chooseGoal(b);
      } else if (goal.type === 'hidden') {
        b.hideT -= dt;
        if (b.hideT <= 0) this.reappear(b);
        continue;
      } else if (goal.type === 'idle' || goal.type === 'watch') {
        b.goalT += dt;
        if (goal.type === 'watch' && goal.ref) b.heading = Math.atan2(goal.ref.basePos.x - b.pos.x, goal.ref.basePos.z - b.pos.z);
        if (goal.hop && b.y === 0 && Math.random() < dt * 0.8) b.vy = 9;
        if (b.goalT > goal.until) b.goal = null;
      } else if (goal.type === 'eating') {
        if (b.goalT === 0) {
          b.held.clear();
          b.held.add(createRock(b.eatRock, 0.16, 5));
          b.stitch.eat();
        }
        b.goalT += dt;
        if (b.goalT > 1.2 && b.held.children.length) {
          b.held.clear();
          g.particles.hearts(b.pos.clone().setY(2));
          this.say(b, pick(LINES.eat));
          g.audioAt(b.pos, () => g.audio.crunch(), 25);
        }
        if (b.goalT > goal.until) b.goal = null;
      } else if (goal.type === 'beaming') {
        b.beamT += dt;
        const s = b.goal && this.lastShopFor(b);
        b.y = b.beamT * b.beamT * 2.2;
        b.heading += dt * 6;
        g.particles.glow.emit({ pos: b.pos.clone().setY(b.y + 0.8), count: 1, color: 0xff9de2, size: 0.3, sizeEnd: 0.05, life: 0.8, velRandom: 1 });
        if (b.beamT > 1.2) this.hide(b, 12 + Math.random() * 10, { type: 'exitShop', ref: s });
      } else if (goal.type === 'bouncing') {
        b.jumpT += dt;
        const t = g.outdoor.trampoline;
        if (b.jumpTo) {
          const k = Math.min(1, b.jumpT / 0.7);
          b.pos.lerpVectors(b.jumpFrom, b.jumpTo, k);
        }
        b.vy -= 30 * dt;
        b.y += b.vy * dt;
        const onTramp = Math.hypot(b.pos.x - t.pos.x, b.pos.z - t.pos.z) < t.radius;
        if (onTramp && b.vy < 0 && b.y <= t.top) {
          b.y = t.top;
          if (b.bounces > 0) {
            b.bounces--;
            b.vy = 18 + Math.random() * 3;
            g.audioAt(b.pos, () => g.audio.boing(), 35);
            if (Math.random() < 0.35) this.say(b, pick(LINES.trampoline), 900);
          } else {
            const dir = b.pos.clone().sub(t.pos).setY(0);
            if (dir.lengthSq() < 0.01) dir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
            dir.normalize();
            b.jumpFrom = b.pos.clone();
            b.jumpTo = t.pos.clone().addScaledVector(dir, 3.4);
            b.jumpT = 0;
            b.vy = 9;
            b.leaving = true;
          }
        } else if (b.jumpT > 0.7 && !b.leaving) {
          b.jumpTo = null;
        }
        if (b.leaving && b.y <= 0 && b.vy < 0) {
          b.y = 0;
          b.vy = 0;
          b.leaving = false;
          b.jumpTo = null;
          this.setGoal(b, { type: 'idle', until: 1 });
        }
      } else if (goal.chase) {
        b.goalT += dt;
        const ct = this.chaseTarget(b);
        if (!ct || b.goalT > goal.until) {
          b.goal = null;
          b.timer = 0.5;
        } else {
          const reach = goal.type === 'player' ? 2.4 : goal.type === 'friend' ? 2.0 : 1.2;
          if (Math.hypot(ct.x - b.pos.x, ct.z - b.pos.z) < reach) this.arrived(b);
          else {
            moveTarget = ct;
            targetSpeed = goal.type === 'plupp' ? 6.2 : 5.2;
          }
        }
      } else if (b.waypoints.length) {
        const wp = b.waypoints[0];
        const d = Math.hypot(wp.x - b.pos.x, wp.z - b.pos.z);
        const last = b.waypoints.length === 1;
        if (d < (last ? 0.6 : 1.2)) {
          b.waypoints.shift();
          b.bestDist = Infinity;
          if (!b.waypoints.length) this.arrived(b);
        } else {
          moveTarget = wp;
          targetSpeed = 5.2;
          if (d < b.bestDist - 0.3) {
            b.bestDist = d;
            b.stuck = 0;
          } else {
            b.stuck += dt;
            if (b.stuck > 2.5) {
              b.goal = null;
              b.timer = 0.3;
            }
          }
          if (goal.type === 'star' && !goal.ref.active) {
            b.goal = null;
            b.timer = 0.2;
          }
          if ((goal.type === 'rocket' || goal.type === 'house') && !goal.ref.home) {
            b.goal = null;
            b.timer = 0.2;
          }
        }
      } else if (goal) {
        b.goal = null;
      }

      if (moveTarget) {
        const desired = Math.atan2(moveTarget.x - b.pos.x, moveTarget.z - b.pos.z);
        const finalTarget = goal?.target || moveTarget;
        let chosen = null;
        for (const off of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6]) {
          const a = desired + off;
          const nx = b.pos.x + Math.sin(a) * 0.9;
          const nz = b.pos.z + Math.cos(a) * 0.9;
          if (!this.blocked(nx, nz, finalTarget)) {
            chosen = a;
            break;
          }
        }
        if (chosen === null) chosen = desired;
        let dh = chosen - b.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        b.heading += dh * Math.min(1, dt * 8);
        const toPlayer = Math.hypot(pp.x - b.pos.x, pp.z - b.pos.z);
        if (visibleOutside && toPlayer < 1.1 && goal?.type !== 'player') targetSpeed *= 0.2;
      }
      b.speed += (targetSpeed - b.speed) * Math.min(1, dt * 6);
      if (b.speed > 0.05) {
        b.pos.x += Math.sin(b.heading) * b.speed * dt;
        b.pos.z += Math.cos(b.heading) * b.speed * dt;
      }

      for (const o of this.bots) {
        if (o === b || o.hidden) continue;
        const dx = b.pos.x - o.pos.x, dz = b.pos.z - o.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.001 && d < 1.0) {
          b.pos.x += (dx / d) * (1.0 - d) * 0.5;
          b.pos.z += (dz / d) * (1.0 - d) * 0.5;
        }
      }
      if (visibleOutside) {
        const dx = b.pos.x - pp.x, dz = b.pos.z - pp.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.001 && d < 0.95) {
          b.pos.x += (dx / d) * (0.95 - d);
          b.pos.z += (dz / d) * (0.95 - d);
        }
      }

      if (goal?.type !== 'bouncing' && goal?.type !== 'beaming') {
        b.hopT -= dt;
        if (b.hopT < 0 && b.y === 0 && b.speed > 2) {
          b.hopT = 4 + Math.random() * 8;
          b.vy = 9;
        }
        if (b.y > 0 || b.vy > 0) {
          b.vy -= 30 * dt;
          b.y = Math.max(0, b.y + b.vy * dt);
          if (b.y === 0) b.vy = 0;
        }
      }

      b.group.position.set(b.pos.x, b.y, b.pos.z);
      b.group.rotation.y = b.heading;
      b.stitch.update(dt, { speed: b.speed, grounded: b.y <= (goal?.type === 'bouncing' ? g.outdoor.trampoline.top : 0) + 0.01, vy: b.vy });
      b.body.setNextKinematicTranslation({ x: b.pos.x, y: b.y + 0.77, z: b.pos.z });
    }
  }

  lastShopFor(b) {
    let best = null, bd = Infinity;
    for (const s of this.game.outdoor.shops) {
      const d = Math.hypot(s.pos.x - b.pos.x, s.pos.z - b.pos.z);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
}
