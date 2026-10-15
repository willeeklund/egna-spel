import * as THREE from 'three';

export function makeRatModel(fur, pink, dark) {
  fur ??= new THREE.MeshStandardMaterial({ color: 0x8a8580, roughness: 0.9 });
  pink ??= new THREE.MeshStandardMaterial({ color: 0xf2a0a8, roughness: 0.6 });
  dark ??= new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.25 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const root = new THREE.Group();
  const model = new THREE.Group();
  root.add(model);
  const sph = (r, mat, x, y, z, sx = 1, sy = 1, sz = 1, parent = model) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    parent.add(m);
    return m;
  };
  const torso = new THREE.Group();
  torso.position.y = 0.17;
  model.add(torso);
  sph(1, fur, 0, 0, 0, 0.15, 0.13, 0.26, torso);
  sph(1, fur, 0, 0.02, -0.12, 0.16, 0.14, 0.17, torso);
  const head = new THREE.Group();
  head.position.set(0, 0.04, 0.25);
  torso.add(head);
  sph(0.1, fur, 0, 0, 0, 1, 0.95, 1.1, head);
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.16, 14).rotateX(Math.PI / 2), fur);
  snout.position.set(0, -0.02, 0.13);
  head.add(snout);
  sph(0.022, pink, 0, -0.02, 0.21, 1, 1, 1, head);
  for (const s of [-1, 1]) {
    sph(0.022, dark, s * 0.055, 0.03, 0.07, 1, 1, 1, head);
    sph(0.008, white, s * 0.06, 0.04, 0.088, 1, 1, 1, head);
    const ear = sph(0.065, fur, s * 0.07, 0.09, -0.02, 1, 1, 0.35, head);
    ear.rotation.y = s * 0.3;
    const inner = sph(0.045, pink, s * 0.072, 0.09, -0.005, 1, 1, 0.3, head);
    inner.rotation.y = s * 0.3;
    for (const a of [-0.25, 0, 0.25]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.16, 3), dark);
      w.rotation.z = Math.PI / 2 + a * s;
      w.position.set(s * 0.08, -0.02, 0.17);
      head.add(w);
    }
  }
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.16, -0.36), new THREE.Vector3(0, 0.12, -0.5), new THREE.Vector3(0.05, 0.06, -0.65), new THREE.Vector3(-0.04, 0.04, -0.8),
  ]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.014, 6), pink);
  model.add(tail);
  const legs = [];
  for (const [x, z, front] of [[-0.09, 0.13, 1], [0.09, 0.13, 1], [-0.1, -0.15, 0], [0.1, -0.15, 0]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.13, z);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.07, 4, 8), fur);
    leg.position.y = -0.06;
    const paw = sph(0.03, pink, 0, -0.12, 0.015, 1, 0.5, 1.4, pivot);
    pivot.add(leg, paw);
    model.add(pivot);
    legs.push({ pivot, front });
  }
  model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  root.userData = { model, torso, head, legs, tail };
  return root;
}

export function animateRat(rat, dt, s) {
  const { model, torso, head, legs, tail } = rat.userData;
  s.phase += dt * (s.climbing ? 4 + (s.climbSpeed || 0) * 6 : 6 + s.speed * 4);
  const walk = Math.min(1, s.speed / 2);
  legs.forEach((l, i) => {
    const off = (i === 0 || i === 3) ? 0 : Math.PI;
    let a = Math.sin(s.phase + off) * 0.9 * walk;
    if (!s.grounded && !s.climbing) a = l.front ? -0.8 : 0.7;
    if (s.climbing) a = Math.sin(s.phase + off) * 0.7 * Math.min(1, (s.climbSpeed || 0) / 1.5 + 0.15) - (l.front ? 0.5 : -0.2);
    l.pivot.rotation.x = THREE.MathUtils.lerp(l.pivot.rotation.x, a, Math.min(1, dt * 20));
  });
  let pitch = -1.45 * (s.climbBlend || 0);
  let headPitch = Math.sin(s.phase * 0.7) * 0.06;
  if (s.hitT > 0) { const k = 1 - s.hitT / s.hitDur; head.position.z = 0.25 + Math.sin(k * Math.PI) * 0.08; pitch = 0.15 * Math.sin(k * Math.PI); }
  else head.position.z = 0.25;
  if (s.roarT > 0) { headPitch = -0.6; head.position.x = Math.sin(s.roarT * 80) * 0.01; } else head.position.x = 0;
  if (s.drinking) headPitch = -0.7;
  if (s.eatT > 0) { headPitch = 0.3 + Math.sin(s.eatT * 40) * 0.15; }
  model.rotation.x = s.climbBlend > 0.001 ? pitch : THREE.MathUtils.lerp(model.rotation.x, pitch, Math.min(1, dt * 12));
  head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, headPitch, Math.min(1, dt * 12));
  tail.rotation.y = Math.sin(s.phase * 0.5) * 0.3;
  torso.position.y = 0.17 + Math.abs(Math.sin(s.phase)) * 0.015 * walk;
}
