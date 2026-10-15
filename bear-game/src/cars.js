import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { roadLines, HALF, bake } from './world.js';

const COLORS = [0xd62828, 0x1d4ed8, 0xf5f5f5, 0x111827, 0xf59e0b, 0x16a34a, 0x9ca3af, 0x7c3aed, 0x0ea5e9, 0xe11d48];
const LANE = 3.5;
const pickOf = (a) => a[(Math.random() * a.length) | 0];

function taper(w, h, d, tx, tz, shiftZ) {
  const g = new THREE.BoxGeometry(w, h, d);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > 0) { p.setX(i, p.getX(i) * tx); p.setZ(i, p.getZ(i) * tz + shiftZ); }
  }
  g.computeVertexNormals();
  return g;
}
const TURN_R = 5;
const lateral = (lane) => lane.line + (lane.axis === 'z' ? -lane.dir : lane.dir) * LANE;
const along = (lane, p) => (lane.axis === 'x' ? p.x : p.z);

export class Traffic {
  constructor(game, count = 42) {
    this.game = game;
    this.cars = [];
    this.glass = new THREE.MeshStandardMaterial({ color: 0x1b2a3a, roughness: 0.05, metalness: 0.8 });
    this.tire = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    this.rim = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.9 });
    this.head = new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffcc, emissiveIntensity: 0.6 });
    this.tail = new THREE.MeshStandardMaterial({ color: 0xaa0000, emissive: 0xff2020, emissiveIntensity: 0.5 });
    this.wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 18).rotateZ(Math.PI / 2);
    this.rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.34, 12).rotateZ(Math.PI / 2);
    const used = new Set();
    for (let i = 0; i < count; i++) {
      let lane;
      do {
        lane = { axis: Math.random() < 0.5 ? 'x' : 'z', line: roadLines[(Math.random() * roadLines.length) | 0], dir: Math.random() < 0.5 ? 1 : -1, t: (Math.random() * 2 - 1) * HALF };
      } while (used.has(`${lane.axis}${lane.line}${lane.dir}${Math.round(lane.t / 20)}`));
      used.add(`${lane.axis}${lane.line}${lane.dir}${Math.round(lane.t / 20)}`);
      const r = Math.random();
      this.cars.push(this.makeCar(lane, r < 0.1 ? 'bus' : r < 0.25 ? 'suv' : r < 0.33 ? 'taxi' : 'car'));
    }
    for (let i = 0; i < 2; i++) this.cars.push(this.makeCar(this.randomLane(), 'police'));
    this.time = 0;
    this.makeLambo();
  }

  buildMesh(kind, color) {
    const paint = new THREE.MeshStandardMaterial({ color });
    const mat = (c) => new THREE.MeshStandardMaterial({ color: c });
    const dark = mat(0x22252a), black = mat(0x0c0c0e), white = mat(0xf4f4f4), plate = mat(0xfafafa), chrome = mat(0xd8dde3);
    const g = new THREE.Group();
    const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
    const box = (w, h, d, m, x, y, z) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z);
    const wheels = (xs, zs, r, y) => {
      for (const z of zs) for (const x of xs) {
        const t = add(this.wheelGeo, this.tire, x, y, z); t.scale.set(1, r / 0.42, r / 0.42);
        const rr = add(this.rimGeo, kind === 'lambo' ? mat(0xffd700) : this.rim, x + Math.sign(x) * 0.01, y, z); rr.scale.set(1, r / 0.42, r / 0.42);
      }
    };
    let half;
    if (kind === 'bus') {
      half = [1.3, 1.6, 5.5];
      box(2.55, 2.4, 11, paint, 0, 1.55, 0);
      box(2.58, 1.0, 9.4, this.glass, 0, 2.25, -0.2);
      box(2.3, 1.5, 0.08, this.glass, 0, 2.05, 5.5);
      box(2.5, 0.25, 10.8, white, 0, 2.85, 0);
      box(1.9, 0.32, 0.06, mat(0xffa500), 0, 2.6, 5.55);
      box(2.6, 0.12, 11.02, white, 0, 1.35, 0);
      box(2.6, 0.35, 0.3, dark, 0, 0.55, 5.5); box(2.6, 0.35, 0.3, dark, 0, 0.55, -5.5);
      box(0.06, 1.9, 1.1, this.glass, -1.29, 1.5, 3.8); box(0.06, 1.9, 1.1, this.glass, -1.29, 1.5, -0.6);
      for (const x of [-0.9, 0.9]) { box(0.4, 0.25, 0.06, this.head, x, 0.85, 5.53); box(0.3, 0.4, 0.06, this.tail, x, 1.0, -5.53); }
      wheels([-1.15, 1.15], [-3.7, 3.6], 0.5, 0.5);
    } else if (kind === 'lambo') {
      half = [1.08, 0.6, 2.35];
      box(2.1, 0.5, 4.7, paint, 0, 0.55, 0).geometry = taper(2.1, 0.5, 4.7, 0.92, 0.9, 0);
      add(taper(2.0, 0.25, 1.6, 0.8, 0.6, -0.3), paint, 0, 0.88, 1.35);
      add(taper(2.0, 0.35, 1.7, 0.85, 0.75, 0.2), paint, 0, 0.95, -1.4);
      const ws = box(1.75, 0.05, 0.85, this.glass, 0, 1.05, 0.55); ws.rotation.x = -0.75;
      box(1.7, 0.1, 1.5, black, 0, 0.82, -0.3);
      box(0.55, 0.55, 0.12, black, -0.42, 1.05, -0.95); box(0.55, 0.55, 0.12, black, 0.42, 1.05, -0.95);
      box(2.1, 0.06, 0.45, black, 0, 1.45, -2.15);
      box(0.08, 0.35, 0.1, black, -0.7, 1.25, -2.1); box(0.08, 0.35, 0.1, black, 0.7, 1.25, -2.1);
      box(0.06, 0.25, 0.9, black, -1.06, 0.6, -0.9); box(0.06, 0.25, 0.9, black, 1.06, 0.6, -0.9);
      for (const x of [-0.7, 0.7]) { box(0.5, 0.08, 0.06, this.head, x, 0.7, 2.36); box(0.55, 0.08, 0.06, this.tail, x, 0.75, -2.36); }
      const suit = mat(0x1a1a2e), skin = mat(0xf2c9a0), gold = mat(0xffd700);
      add(new THREE.CapsuleGeometry(0.22, 0.3, 4, 10), suit, -0.42, 1.25, -0.4);
      add(new THREE.SphereGeometry(0.17, 14, 10), skin, -0.42, 1.68, -0.4);
      box(0.32, 0.07, 0.06, black, -0.42, 1.71, -0.25);
      add(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 14), black, -0.42, 1.82, -0.4);
      add(new THREE.CylinderGeometry(0.13, 0.13, 0.32, 14), black, -0.42, 1.98, -0.4);
      add(new THREE.TorusGeometry(0.14, 0.025, 6, 16).rotateX(Math.PI / 2.4), gold, -0.42, 1.42, -0.32);
      const arm = add(new THREE.CapsuleGeometry(0.06, 0.4, 4, 8), suit, -0.75, 1.65, -0.4); arm.rotation.z = -0.5;
      box(0.25, 0.12, 0.02, mat(0x3fae4a), -0.9, 1.95, -0.4);
      wheels([-0.95, 0.95], [-1.5, 1.45], 0.38, 0.38);
    } else {
      const suv = kind === 'suv', taxi = kind === 'taxi', police = kind === 'police';
      const bh = suv ? 0.85 : 0.62, cy = suv ? 0.5 : 0.42, ch = suv ? 0.75 : 0.62, len = suv ? 4.7 : 4.5;
      const top = cy + bh / 2 + 0.3;
      half = [1.0, (top + ch) / 2, len / 2 + 0.05];
      box(2.0, bh, len, paint, 0, top - bh / 2, 0);
      add(taper(1.86, ch, suv ? 3.0 : 2.4, suv ? 0.92 : 0.86, suv ? 0.9 : 0.72, -0.1), this.glass, 0, top + ch / 2, suv ? -0.45 : -0.2);
      add(taper(1.66, 0.08, suv ? 2.7 : 1.75, 0.98, 0.95, 0), paint, 0, top + ch + 0.02, suv ? -0.5 : -0.3);
      box(2.04, 0.08, len - 0.4, chrome, 0, top - bh + 0.25, 0);
      box(2.06, 0.26, 0.3, dark, 0, cy + 0.1, len / 2 - 0.05); box(2.06, 0.26, 0.3, dark, 0, cy + 0.1, -len / 2 + 0.05);
      box(1.0, 0.22, 0.05, black, 0, top - 0.2, len / 2 + 0.01);
      box(0.6, 0.15, 0.03, plate, 0, cy + 0.1, len / 2 + 0.12); box(0.6, 0.15, 0.03, plate, 0, cy + 0.1, -len / 2 - 0.12);
      box(0.2, 0.13, 0.12, paint, -1.08, top + 0.15, 0.75); box(0.2, 0.13, 0.12, paint, 1.08, top + 0.15, 0.75);
      for (const x of [-0.68, 0.68]) { box(0.42, 0.16, 0.06, this.head, x, top - 0.12, len / 2 + 0.01); box(0.45, 0.15, 0.06, this.tail, x, top - 0.12, -len / 2 - 0.01); }
      if (taxi) { box(0.7, 0.22, 0.3, mat(0xfff4b0), 0, top + ch + 0.17, -0.3); box(2.02, 0.12, len - 0.6, black, 0, top - 0.32, 0); }
      if (police) { box(2.03, 0.22, len - 0.5, mat(0x1f3f8f), 0, top - 0.3, 0); box(2.03, 0.08, len - 0.5, mat(0xffd23f), 0, top - 0.14, 0); box(1.3, 0.08, 0.3, black, 0, top + ch + 0.08, -0.3); }
      this.roofY = top + ch + 0.17 - half[1];
      wheels([-0.92, 0.92], [-len * 0.31, len * 0.32], suv ? 0.46 : 0.4, suv ? 0.46 : 0.4);
    }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.children.forEach((c) => (c.position.y -= half[1]));
    return { g, half };
  }

  makeCar(lane, kind) {
    const color = kind === 'police' ? 0xf4f4f4 : kind === 'bus' ? pickOf([0xd7262e, 0xf2b705, 0x1f6fd1]) : kind === 'lambo' ? 0xffc21a : kind === 'taxi' ? 0xffcc00 : COLORS[(Math.random() * COLORS.length) | 0];
    const { g, half } = this.buildMesh(kind, color);
    const outer = bake(g, { roughness: 0.3, metalness: 0.35 });
    let lights = null;
    if (kind === 'police') {
      lights = [0xff2020, 0x2060ff].map((c, k) => {
        const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.3 });
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.28), m);
        l.position.set(k ? 0.32 : -0.32, this.roofY, -0.3);
        outer.add(l);
        return m;
      });
    }
    this.game.scene.add(outer);
    const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: this.game.physMat, allowSleep: false });
    body.addShape(new CANNON.Box(new CANNON.Vec3(...half)));
    this.game.world.addBody(body);
    const isBus = kind === 'bus', isLambo = kind === 'lambo';
    const car = { kind, color, isPolice: kind === 'police', lights, alertT: 0, mesh: outer, body, half, isBus, isLambo, lane, speed: 0, cruise: isBus ? 8 : isLambo ? 19 : 9 + Math.random() * 6, wrecked: false, wreckT: 0, flipped: false, panic: 0, honkT: 0, brakeT: 0, active: true, aliveT: 0 };
    body.userData = { car };
    this.placeOnLane(car, lane.t);
    return car;
  }

  randomLane() {
    return { axis: Math.random() < 0.5 ? 'x' : 'z', line: roadLines[(Math.random() * roadLines.length) | 0], dir: Math.random() < 0.5 ? 1 : -1, t: (Math.random() * 2 - 1) * HALF };
  }

  makeLambo() {
    const car = this.makeCar(this.randomLane(), 'lambo');
    this.lambo = car;
    this.setActive(car, false);
    this.cars.push(car);
  }

  setActive(car, on) {
    car.active = on;
    car.mesh.visible = on;
    if (on && !this.game.world.bodies.includes(car.body)) this.game.world.addBody(car.body);
    if (!on && this.game.world.bodies.includes(car.body)) this.game.world.removeBody(car.body);
  }

  freeSpot(bearPos, minD, maxD) {
    let lane, t;
    for (let tries = 0; tries < 80; tries++) {
      lane = this.randomLane();
      t = lane.t;
      if (roadLines.some((c) => Math.abs(c - t) < 12)) continue;
      const x = lane.axis === 'z' ? lateral(lane) : t, z = lane.axis === 'z' ? t : lateral(lane);
      const d = Math.hypot(x - bearPos.x, z - bearPos.z);
      if (d < minD || d > maxD) continue;
      if (this.cars.some((o) => o.active && Math.hypot(o.body.position.x - x, o.body.position.z - z) < 12)) continue;
      break;
    }
    return { lane, t };
  }

  spawnLambo(bearPos) {
    const car = this.lambo;
    if (car.active) return false;
    const { lane, t } = this.freeSpot(bearPos, 70, 130);
    car.lane = lane;
    if (car.wrecked) this.unwreck(car);
    this.placeOnLane(car, t);
    car.speed = car.cruise;
    car.aliveT = 0;
    car.flipped = false;
    this.setActive(car, true);
    return true;
  }

  dirVec(lane) {
    return lane.axis === 'x' ? new THREE.Vector3(lane.dir, 0, 0) : new THREE.Vector3(0, 0, lane.dir);
  }

  placeOnLane(car, t) {
    const { lane, body, half } = car;
    const off = lane.axis === 'z' ? -lane.dir * LANE : lane.dir * LANE;
    if (lane.axis === 'z') body.position.set(lane.line + off, half[1] + 0.02, t);
    else body.position.set(t, half[1] + 0.02, lane.line + off);
    const yaw = lane.axis === 'z' ? (lane.dir > 0 ? 0 : Math.PI) : (lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    body.quaternion.setFromEuler(0, yaw, 0);
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
    car.isect = null;
    car.turn = null;
  }

  planIsect(car) {
    const { lane } = car;
    const t = along(lane, car.body.position);
    let c = null;
    for (const r of roadLines) if ((r - t) * lane.dir > 0.5 && (c === null || Math.abs(r - t) < Math.abs(c - t))) c = r;
    if (c === null) { lane.dir = -lane.dir; this.placeOnLane(car, t); return; }
    const opts = [];
    if (c * lane.dir < HALF - 1) opts.push(0, 0);
    for (const d of [1, -1]) if (lane.line * d < HALF - 1) opts.push(d);
    let turnDir = opts[(Math.random() * opts.length) | 0];
    const next = turnDir ? { axis: lane.axis === 'x' ? 'z' : 'x', line: c, dir: turnDir } : null;
    const start = next ? lateral(next) - lane.dir * TURN_R : 0;
    if (next && (start - t) * lane.dir < 0) turnDir = 0;
    car.isect = { c, next: turnDir ? next : null, start };
  }

  beginTurn(car) {
    const { lane } = car;
    const next = car.isect.next;
    const d0 = this.dirVec(lane), d1 = this.dirVec(next);
    const P = lane.axis === 'x' ? new THREE.Vector3(lateral(next), 0, lateral(lane)) : new THREE.Vector3(lateral(lane), 0, lateral(next));
    const center = P.clone().addScaledVector(d0, -TURN_R).addScaledVector(d1, TURN_R);
    car.turn = { d0, d1, center, s: 0, next };
    car.isect = null;
  }

  turnPoint(turn, s) {
    const phi = s * Math.PI / 2;
    return turn.center.clone().addScaledVector(turn.d1, -TURN_R * Math.cos(phi)).addScaledVector(turn.d0, TURN_R * Math.sin(phi));
  }

  wreck(car) {
    if (car.wrecked) return;
    car.wrecked = true;
    car.wreckT = 0;
    const b = car.body;
    b.type = CANNON.Body.DYNAMIC;
    b.mass = car.isBus ? 3000 : 900;
    b.updateMassProperties();
    b.allowSleep = true;
    b.sleepSpeedLimit = 0.3;
    b.linearDamping = 0.05;
    b.angularDamping = 0.15;
    b.wakeUp();
  }

  unwreck(car) {
    const b = car.body;
    b.allowSleep = false;
    b.type = CANNON.Body.KINEMATIC;
    b.mass = 0;
    b.updateMassProperties();
    b.wakeUp();
    car.wrecked = false;
  }

  respawn(car) {
    if (car.isLambo) { this.unwreck(car); this.setActive(car, false); return; }
    const b = car.body;
    b.allowSleep = false;
    b.type = CANNON.Body.KINEMATIC;
    b.mass = 0;
    b.updateMassProperties();
    b.wakeUp();
    car.wrecked = false;
    car.flipped = false;
    car.byVillain = false;
    const { lane, t } = this.freeSpot(this.lastBear || new THREE.Vector3(), 110, 9999);
    car.lane = lane;
    this.placeOnLane(car, t);
    car.speed = car.cruise;
  }

  update(dt, bearPos) {
    this.lastBear = bearPos;
    this.time += dt;
    for (const car of this.cars) {
      if (!car.lights) continue;
      car.alertT = Math.max(0, car.alertT - dt);
      const on = this.game.police?.alert || car.alertT > 0;
      const f = Math.sin(this.time * 14) > 0;
      car.lights[0].emissiveIntensity = on ? (f ? 4 : 0.1) : 0.3;
      car.lights[1].emissiveIntensity = on ? (f ? 0.1 : 4) : 0.3;
    }
    const tmp = new THREE.Vector3();
    for (const car of this.cars) {
      const b = car.body;
      if (!car.active) continue;
      car.aliveT += dt;
      if (car.driven) {
        car.mesh.position.copy(b.position);
        car.mesh.quaternion.copy(b.quaternion);
        continue;
      }
      if (car.wrecked) {
        car.wreckT += dt;
        car.mesh.position.copy(b.position);
        car.mesh.quaternion.copy(b.quaternion);
        tmp.set(b.position.x, 0, b.position.z);
        if (car.wreckT > 25 && tmp.distanceTo(bearPos) > 60) this.respawn(car);
        continue;
      }
      const dir = car.turn ? this.turnPoint(car.turn, Math.min(1, car.turn.s + 0.01)).sub(this.turnPoint(car.turn, car.turn.s)).normalize() : this.dirVec(car.lane);
      let target = car.cruise * (car.panic > 0 ? 2.3 : 1);
      car.panic = Math.max(0, car.panic - dt);
      car.honkT = Math.max(0, car.honkT - dt);
      const pos = tmp.set(b.position.x, 0, b.position.z);
      const blocked = (px, pz, len) => {
        const dx = px - pos.x, dz = pz - pos.z;
        const along = dx * dir.x + dz * dir.z;
        const lat = Math.abs(dx * dir.z - dz * dir.x);
        return along > 0 && along < len && lat < 2.6;
      };
      let stop = false;
      if (car.panic <= 0 && blocked(bearPos.x, bearPos.z, car.half[2] + 7)) {
        stop = true;
        if (car.honkT <= 0) { this.game.sfx.honk(); car.honkT = 2.5; }
      }
      if (!stop && this.game.people) {
        for (const p of this.game.people.list) {
          if (blocked(p.pos.x, p.pos.z, car.half[2] + 5)) { stop = true; break; }
        }
      }
      if (!stop && car.brakeT < 3) {
        for (const o of this.cars) {
          if (o === car || !o.active) continue;
          if (o.driven && !blocked(o.body.position.x, o.body.position.z, car.half[2] + o.half[2] + 4)) continue;
          if (blocked(o.body.position.x, o.body.position.z, car.half[2] + o.half[2] + 4)) { stop = true; break; }
        }
      }
      car.brakeT = stop ? car.brakeT + dt : 0;
      if (car.brakeT > 5) car.brakeT = 0;
      if (stop) target = 0;
      car.speed = THREE.MathUtils.lerp(car.speed, target, Math.min(1, dt * (stop ? 6 : 1.5)));
      if (car.isLambo && car.aliveT > 50 && Math.hypot(b.position.x - bearPos.x, b.position.z - bearPos.z) > 110) { this.setActive(car, false); continue; }
      this.steer(car, dt);
      car.mesh.position.copy(b.position);
      car.mesh.quaternion.copy(b.quaternion);
    }
  }

  steer(car, dt) {
    const b = car.body;
    const step = car.speed * dt;
    if (car.turn) {
      const turn = car.turn;
      turn.s = Math.min(1, turn.s + step / (TURN_R * Math.PI / 2));
      const target = this.turnPoint(turn, turn.s);
      const dt_ = Math.max(dt, 1e-4);
      b.velocity.set((target.x - b.position.x) / dt_, 0, (target.z - b.position.z) / dt_);
      const tan = this.turnPoint(turn, Math.min(1, turn.s + 0.01)).sub(this.turnPoint(turn, Math.max(0, turn.s - 0.01)));
      b.quaternion.setFromEuler(0, Math.atan2(tan.x, tan.z), 0);
      if (turn.s >= 1) {
        car.lane = turn.next;
        car.turn = null;
        const lat = lateral(car.lane);
        if (car.lane.axis === 'x') b.position.z = lat; else b.position.x = lat;
        b.quaternion.setFromEuler(0, Math.atan2(this.dirVec(car.lane).x, this.dirVec(car.lane).z), 0);
      }
      return;
    }
    const dir = this.dirVec(car.lane);
    b.velocity.set(dir.x * car.speed, 0, dir.z * car.speed);
    if (!car.isect) this.planIsect(car);
    const is = car.isect;
    if (!is) return;
    const t = along(car.lane, b.position) + step * car.lane.dir;
    if (is.next) { if ((t - is.start) * car.lane.dir >= 0) this.beginTurn(car); }
    else if ((t - is.c) * car.lane.dir > 0) car.isect = null;
  }
}
