import * as THREE from 'three';
import { createRocketHouse, createParachute } from '../models/rocketHouse.js';

const UP_LIMIT = 170;

export class Rocket {
  constructor(game, cfg, pos, facing) {
    this.game = game;
    this.cfg = cfg;
    this.model = createRocketHouse(cfg);
    this.group = this.model.group;
    this.body = this.model.body;
    this.group.position.copy(pos);
    this.group.rotation.y = facing;
    this.facing = facing;
    game.scene.add(this.group);

    this.parachute = createParachute(cfg.accent);
    this.parachute.position.y = this.model.top;
    this.parachute.scale.setScalar(0.001);
    this.parachute.visible = false;
    this.body.add(this.parachute);

    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    this.flame = new THREE.Mesh(new THREE.ConeGeometry(1.0, 5, 24, 1, true), flameMat);
    this.flame.rotation.x = Math.PI;
    this.flame.position.y = 1.4 - 0.9 - 2.5;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    inner.position.y = -1.0;
    this.flame.add(inner);
    this.flame.visible = false;
    this.body.add(this.flame);

    const R = game.physics.R;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), facing);
    this.rb = game.physics.world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(pos.x, pos.y, pos.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }),
    );
    game.physics.world.createCollider(R.ColliderDesc.cylinder(5.2, 2.7).setTranslation(0, 1.4 + 5.2, 0), this.rb);
    game.physics.world.createCollider(R.ColliderDesc.cuboid(0.85, 0.21, 0.35).setTranslation(0, 0.21, 3.2), this.rb);
    game.physics.world.createCollider(R.ColliderDesc.cuboid(0.8, 0.42, 0.25).setTranslation(0, 0.42, 2.95), this.rb);
    game.physics.world.createCollider(R.ColliderDesc.cuboid(0.8, 0.63, 0.25).setTranslation(0, 0.63, 2.75), this.rb);
    for (const a of [Math.PI / 3, Math.PI, -Math.PI / 3]) {
      game.physics.world.createCollider(
        R.ColliderDesc.cylinder(1.5, 0.5).setTranslation(Math.sin(a) * 4.1, 1.5, Math.cos(a) * 4.1),
        this.rb,
      );
    }

    this.state = 'idle';
    this.t = 0;
    this.y = 0;
    this.vel = 0;
    this.smokeT = Math.random();
    this.basePos = pos.clone();
    this.tmp = new THREE.Vector3();
  }

  get doorPos() {
    return new THREE.Vector3(Math.sin(this.facing) * 4.4, 0, Math.cos(this.facing) * 4.4).add(this.basePos);
  }

  get home() { return this.state === 'idle'; }

  hit() {
    if (this.state !== 'idle') return false;
    this.state = 'shake';
    this.t = 0;
    this.game.audio.whack();
    return true;
  }

  worldNozzle() {
    return this.tmp.set(0, 0.2, 0).applyMatrix4(this.body.matrixWorld);
  }

  update(dt, time) {
    const m = this.model;
    const p = this.game.particles;
    m.beacon.material.emissiveIntensity = Math.sin(time * 4 + this.basePos.x) > 0.3 ? 4 : 0.3;
    this.t += dt;

    this.smokeT -= dt;
    if (this.smokeT < 0 && this.state === 'idle') {
      this.smokeT = 0.6;
      const sp = m.pipe.localToWorld(new THREE.Vector3(0, 1.2, 0));
      p.smoke.emit({ pos: sp, count: 1, color: 0xffffff, size: 0.6, sizeEnd: 2.2, life: 3, vel: { x: 0.3, y: 1.2, z: 0 }, velRandom: 0.2, alpha: 0.5 });
    }

    switch (this.state) {
      case 'idle':
        m.nozzleGlow.material.emissiveIntensity = 0.3;
        break;
      case 'shake': {
        const k = this.t / 1.0;
        this.body.position.x = (Math.random() - 0.5) * 0.12 * k;
        this.body.position.z = (Math.random() - 0.5) * 0.12 * k;
        m.nozzleGlow.material.emissiveIntensity = 0.3 + k * 4;
        if (Math.random() < 0.6) p.dust(this.worldNozzle().clone().setY(0.5), 2);
        if (this.t > 1.0) {
          this.state = 'up';
          this.vel = 2;
          this.t = 0;
          this.flame.visible = true;
          this.body.position.x = this.body.position.z = 0;
          this.game.audio.launch();
          p.dust(this.basePos.clone().setY(0.5), 40);
          this.game.onRocketLaunched(this);
        }
        break;
      }
      case 'up': {
        this.vel += 24 * dt;
        this.y += this.vel * dt;
        this.body.rotation.y += dt * (0.5 + this.vel * 0.03);
        const s = 0.9 + Math.random() * 0.3;
        this.flame.scale.set(s, 0.9 + Math.random() * 0.5, s);
        const nz = this.worldNozzle();
        p.glow.emit({ pos: nz, count: 6, color: [0xffd27a, 0xff8a3d, 0xff5f6d], colorEnd: 0xff3d00, size: 1.4, sizeEnd: 0.2, life: 0.5, vel: { x: 0, y: -12, z: 0 }, velRandom: 2.5 });
        p.smoke.emit({ pos: nz, count: 2, color: 0xffffff, colorEnd: 0xe9d9ff, size: 1.5, sizeEnd: 5, life: 2.2, vel: { x: 0, y: -3, z: 0 }, velRandom: 1.2, drag: 1, alpha: 0.7 });
        if (this.y > UP_LIMIT) {
          this.state = 'away';
          this.t = 0;
          this.flame.visible = false;
        }
        break;
      }
      case 'away':
        if (this.t > 2.5) {
          this.state = 'down';
          this.y = 60;
          this.t = 0;
          this.body.rotation.y = 0;
          this.parachute.visible = true;
          this.game.audio.pop();
        }
        break;
      case 'down': {
        this.y = Math.max(0, this.y - 6 * dt);
        this.parachute.scale.setScalar(Math.min(1, this.t * 1.5) + 0.001);
        this.body.rotation.z = Math.sin(this.t * 1.4) * 0.05;
        this.body.rotation.x = Math.cos(this.t * 1.1) * 0.04;
        if (this.y <= 0) {
          this.state = 'land';
          this.t = 0;
          this.body.rotation.set(0, 0, 0);
          p.dust(this.basePos.clone().setY(0.4), 30);
          this.game.audio.land();
        }
        break;
      }
      case 'land': {
        const k = Math.max(0, 1 - this.t);
        this.parachute.scale.set(k + 0.001, k * 0.5 + 0.001, k + 0.001);
        this.parachute.position.y = m.top - (1 - k) * 2;
        if (this.t > 1) {
          this.parachute.visible = false;
          this.parachute.position.y = m.top;
          this.state = 'idle';
        }
        break;
      }
    }

    this.body.position.y = this.y;
    this.rb.setNextKinematicTranslation({ x: this.basePos.x, y: this.basePos.y + this.y, z: this.basePos.z });
  }
}
