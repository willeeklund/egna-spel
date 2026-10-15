import * as THREE from 'three';
import { createStitch } from './models/stitch.js';
import { createRock } from './models/rockFood.js';

const HALF = 0.35;
const RADIUS = 0.42;
const CENTER_Y = HALF + RADIUS;

export class Player {
  constructor(game) {
    this.game = game;
    this.stitch = createStitch();
    this.group = this.stitch.group;
    game.scene.add(this.group);

    const R = game.physics.R;
    const world = game.physics.world;
    this.body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, CENTER_Y, 16));
    this.collider = world.createCollider(R.ColliderDesc.capsule(HALF, RADIUS), this.body);
    this.controller = world.createCharacterController(0.03);
    this.controller.enableAutostep(0.45, 0.25, true);
    this.controller.enableSnapToGround(0.35);
    this.controller.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    this.controller.setApplyImpulsesToDynamicBodies(true);

    this.heading = Math.PI;
    this.vy = 0;
    this.speed = 0;
    this.grounded = true;
    this.frozen = false;
    this.pos = new THREE.Vector3(0, 0, 16);

    this.held = new THREE.Group();
    this.held.position.set(0, 1.25, 0.45);
    this.group.add(this.held);

    this.basket = new THREE.Group();
    const wicker = new THREE.MeshStandardMaterial({ color: 0xff7eb6, roughness: 0.7, side: THREE.DoubleSide });
    const rim = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.24, 20, 1, true), wicker);
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.24, 20), wicker);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -0.12;
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 6, 24), rim);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.12;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 6, 20, Math.PI), rim);
    handle.position.y = 0.12;
    this.basket.add(shell, bottom, lip, handle);
    this.basketItems = new THREE.Group();
    this.basket.add(this.basketItems);
    this.basket.position.set(0.72, 0.42, -0.05);
    this.basket.scale.setScalar(1.5);
    this.basket.visible = false;
    this.group.add(this.basket);
  }

  teleport(p, heading) {
    this.body.setTranslation({ x: p.x, y: p.y + CENTER_Y, z: p.z }, true);
    this.body.setNextKinematicTranslation({ x: p.x, y: p.y + CENTER_Y, z: p.z });
    this.pos.copy(p);
    this.heading = heading;
    this.vy = 0;
    this.speed = 0;
    this.group.position.copy(p);
    this.group.rotation.y = heading;
  }

  forward() {
    return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
  }

  setBasket(items) {
    this.basketItems.clear();
    items.forEach((id, i) => {
      const r = createRock(id, 0.09, i + 3);
      const a = (i / Math.max(1, items.length)) * Math.PI * 2;
      const ring = items.length > 1 ? 0.13 : 0;
      r.position.set(Math.cos(a) * ring, 0.06 + Math.floor(i / 4) * 0.1, Math.sin(a) * ring);
      this.basketItems.add(r);
    });
    this.basket.visible = items.length > 0;
  }

  basketWorld() {
    return this.basket.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.1, 0));
  }

  showHeld(typeId) {
    this.held.clear();
    if (typeId) this.held.add(createRock(typeId, 0.16, 7));
  }

  update(dt, input) {
    const turn = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const move = (input.up ? 1 : 0) - (input.down ? 1 : 0);
    if (this.frozen) {
      this.speed = 0;
    } else {
      this.heading += turn * dt * 2.6;
      const target = move > 0 ? 7.5 : move < 0 ? -3.5 : 0;
      this.speed += (target - this.speed) * Math.min(1, dt * 8);
    }

    const t = this.game.trampolineCheck(this.pos, this.grounded);
    if (t) {
      this.vy = 21;
      this.grounded = false;
    }

    if (!this.frozen && input.jump && this.grounded) {
      this.vy = 11;
      this.grounded = false;
      this.game.audio.jump();
    }
    this.vy -= 30 * dt;
    if (this.vy < -40) this.vy = -40;

    const f = this.forward();
    const desired = { x: f.x * this.speed * dt, y: this.vy * dt, z: f.z * this.speed * dt };
    this.controller.computeColliderMovement(this.collider, desired);
    const mv = this.controller.computedMovement();
    const grounded = this.controller.computedGrounded();
    if (grounded && this.vy < 0) this.vy = 0;
    if (this.vy > 0 && mv.y < desired.y * 0.5) this.vy = 0;
    if (!this.grounded && grounded && this.lastVy < -14) {
      this.game.particles.dust(this.pos.clone().setY(this.pos.y + 0.1), 6, 0xffffff);
    }
    this.grounded = grounded;
    this.lastVy = this.vy;

    const cur = this.body.translation();
    let nx = cur.x + mv.x, ny = cur.y + mv.y, nz = cur.z + mv.z;
    const lim = this.game.walkLimit();
    if (lim) {
      const dx = nx - lim.center.x, dz = nz - lim.center.z;
      const d = Math.hypot(dx, dz);
      if (d > lim.radius) {
        nx = lim.center.x + (dx / d) * lim.radius;
        nz = lim.center.z + (dz / d) * lim.radius;
      }
    }
    if (ny < -20) {
      ny = CENTER_Y + 5;
      nx = 0;
      nz = 16;
    }
    this.body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
    this.pos.set(nx, ny - CENTER_Y, nz);
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.heading;
    this.stitch.update(dt, { speed: this.speed, grounded: this.grounded, vy: this.vy });
  }
}
