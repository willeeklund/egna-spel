import * as THREE from 'three';

export class Physics {
  constructor(RAPIER) {
    this.R = RAPIER;
    this.world = new RAPIER.World({ x: 0, y: -30, z: 0 });
    this.dynamic = [];
  }

  fixedBox(pos, half, rotY = 0) {
    const R = this.R;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    const body = this.world.createRigidBody(
      R.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }),
    );
    this.world.createCollider(R.ColliderDesc.cuboid(half.x, half.y, half.z).setFriction(0.8), body);
    return body;
  }

  fixedCylinder(pos, halfHeight, radius) {
    const R = this.R;
    const body = this.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z));
    this.world.createCollider(R.ColliderDesc.cylinder(halfHeight, radius), body);
    return body;
  }

  ringWall(center, radius, height, segments = 32, thickness = 0.5) {
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const seg = (2 * Math.PI * radius) / segments;
      const p = new THREE.Vector3(
        center.x + Math.sin(a) * (radius + thickness),
        center.y + height / 2,
        center.z + Math.cos(a) * (radius + thickness),
      );
      this.fixedBox(p, { x: seg / 2 + 0.2, y: height / 2, z: thickness }, a);
    }
  }

  kinematic(pos, colliderDesc) {
    const R = this.R;
    const body = this.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(pos.x, pos.y, pos.z));
    const collider = this.world.createCollider(colliderDesc, body);
    return { body, collider };
  }

  dynamicBall(obj, radius, { restitution = 0.7, density = 0.6 } = {}) {
    const R = this.R;
    const body = this.world.createRigidBody(
      R.RigidBodyDesc.dynamic().setTranslation(obj.position.x, obj.position.y, obj.position.z).setLinearDamping(0.3).setAngularDamping(0.4),
    );
    this.world.createCollider(R.ColliderDesc.ball(radius).setRestitution(restitution).setDensity(density).setFriction(0.6), body);
    const entry = { body, obj, home: obj.position.clone(), radius };
    this.dynamic.push(entry);
    return entry;
  }

  dynamicBox(obj, half, { restitution = 0.2, density = 0.8 } = {}) {
    const R = this.R;
    const body = this.world.createRigidBody(
      R.RigidBodyDesc.dynamic().setTranslation(obj.position.x, obj.position.y, obj.position.z).setLinearDamping(0.2).setAngularDamping(0.3),
    );
    this.world.createCollider(R.ColliderDesc.cuboid(half.x, half.y, half.z).setRestitution(restitution).setDensity(density), body);
    const entry = { body, obj, home: obj.position.clone(), radius: Math.max(half.x, half.z) };
    this.dynamic.push(entry);
    return entry;
  }

  step(dt) {
    this.world.timestep = Math.min(Math.max(dt, 1 / 144), 1 / 30);
    this.world.step();
    for (const d of this.dynamic) {
      const t = d.body.translation();
      if (t.y < -30) {
        d.body.setTranslation({ x: d.home.x, y: d.home.y + 4, z: d.home.z }, true);
        d.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        d.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        continue;
      }
      const r = d.body.rotation();
      d.obj.position.set(t.x, t.y, t.z);
      d.obj.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }
}
