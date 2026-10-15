import * as THREE from 'three';

function furCanvas(size, strands, base, range, lenMin, lenMax) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = `rgb(${base},${base},${base})`;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 1200; i++) {
    const v = base + (Math.random() - 0.5) * range * 0.6;
    g.fillStyle = `rgba(${v},${v},${v},0.25)`;
    g.beginPath(); g.arc(Math.random() * size, Math.random() * size, 4 + Math.random() * 14, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < strands; i++) {
    const v = base + (Math.random() - 0.5) * range;
    g.strokeStyle = `rgba(${v},${v},${v},0.9)`;
    g.lineWidth = 0.6 + Math.random() * 1.2;
    const x = Math.random() * size, y = Math.random() * size, len = lenMin + Math.random() * (lenMax - lenMin);
    const bend = (Math.random() - 0.5) * len * 0.5;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + bend, y + len * 0.5, x + bend * 0.4, y + len); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export function makeBearMaterials() {
  const map = furCanvas(512, 26000, 205, 110, 5, 14);
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(4, 4);
  const bump = furCanvas(512, 30000, 128, 200, 4, 12);
  bump.repeat.set(4, 4);
  const furMat = (color, sheen) => new THREE.MeshPhysicalMaterial({
    color, map, bumpMap: bump, bumpScale: 4, roughness: 0.92,
    sheen: 1, sheenColor: new THREE.Color(sheen), sheenRoughness: 0.55,
  });
  return {
    fur: furMat(0x7a4826, 0xd9a46a),
    light: furMat(0xc99a68, 0xffe0b8),
    dark: new THREE.MeshPhysicalMaterial({ color: 0x3b2413, map, roughness: 0.85, sheen: 0.6, sheenColor: new THREE.Color(0x8a6040) }),
  };
}

export function makeBearModel(fur, light, dark, claw) {
  const statue = fur === light;
  const black = statue ? fur : new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.15 });
  const white = statue ? fur : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const ivory = claw || (statue ? fur : new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.4 }));
  const pink = statue ? fur : new THREE.MeshStandardMaterial({ color: 0xc0505a, roughness: 0.5 });
  const root = new THREE.Group();
  const model = new THREE.Group();
  root.add(model);
  const sphGeo = new THREE.SphereGeometry(1, 32, 24);
  const sph = (r, mat, x, y, z, sx = 1, sy = 1, sz = 1, parent) => {
    const m = new THREE.Mesh(sphGeo, mat);
    m.position.set(x, y, z); m.scale.set(r * sx, r * sy, r * sz);
    if (parent) parent.add(m);
    return m;
  };
  const torso = new THREE.Group();
  torso.position.set(0, 1.75, 0);
  model.add(torso);
  sph(1, fur, 0, 0, 0.75, 1.2, 1.08, 1.1, torso);
  sph(1, fur, 0, -0.1, -0.2, 1.15, 1.0, 1.2, torso);
  sph(1, fur, 0, 0.05, -1.05, 1.12, 1.05, 1.0, torso);
  sph(1, fur, 0, 0.62, 0.55, 0.95, 0.7, 0.95, torso);
  sph(1, fur, 0, 0.42, 1.45, 0.75, 0.75, 0.85, torso);
  sph(0.22, fur, 0, 0.3, -2.02, 1, 1, 1, torso);

  const head = new THREE.Group();
  head.position.set(0, 0.65, 2.0);
  torso.add(head);
  sph(0.72, fur, 0, 0, 0, 1.05, 0.95, 1.0, head);
  sph(0.5, fur, 0, 0.24, 0.42, 0.95, 0.38, 0.55, head);
  for (const sd of [-1, 1]) sph(0.38, fur, sd * 0.4, -0.18, 0.18, 1, 0.9, 1, head);
  sph(0.42, light, 0, -0.14, 0.72, 0.82, 0.62, 1.12, head);
  sph(0.15, black, 0, -0.02, 1.16, 1.3, 0.85, 1, head);
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.3, 0.38);
  head.add(jaw);
  sph(0.34, light, 0, -0.04, 0.32, 0.72, 0.42, 1.1, jaw);
  sph(0.2, pink, 0, 0.04, 0.3, 0.8, 0.3, 1.2, jaw);
  for (const sd of [-1, 1]) {
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 8), white);
    fang.position.set(sd * 0.13, 0.08, 0.62);
    jaw.add(fang);
    sph(0.085, black, sd * 0.3, 0.18, 0.62, 1, 1, 0.8, head);
    sph(0.028, white, sd * 0.33, 0.22, 0.69, 1, 1, 1, head);
    sph(0.22, fur, sd * 0.5, 0.6, -0.12, 1, 1, 0.55, head);
    sph(0.13, dark, sd * 0.5, 0.6, -0.04, 1, 1, 0.45, head);
  }

  const legs = [];
  const upperGeo = new THREE.CapsuleGeometry(0.36, 0.55, 8, 16);
  const lowerGeo = new THREE.CapsuleGeometry(0.27, 0.45, 8, 16);
  const clawGeo = new THREE.ConeGeometry(0.04, 0.17, 8).rotateX(Math.PI / 2);
  for (const [x, y, z, front] of [[-0.78, 1.65, 1.0, 1], [0.78, 1.65, 1.0, 1], [-0.82, 1.7, -1.1, 0], [0.82, 1.7, -1.1, 0]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    sph(0.5, fur, 0, -0.1, 0, 0.85, 1.1, front ? 0.95 : 1.05, pivot);
    const upper = new THREE.Mesh(upperGeo, fur);
    upper.position.y = -0.5;
    pivot.add(upper);
    const knee = new THREE.Group();
    knee.position.y = -0.85 - (y - 1.65);
    pivot.add(knee);
    const lower = new THREE.Mesh(lowerGeo, fur);
    lower.position.y = -0.3;
    knee.add(lower);
    const paw = new THREE.Group();
    paw.position.y = -0.65;
    knee.add(paw);
    sph(0.33, dark, 0, -0.02, 0.1, 1, 0.55, 1.25, paw);
    for (let k = 0; k < 4; k++) {
      const c = new THREE.Mesh(clawGeo, ivory);
      c.position.set(-0.18 + k * 0.12, -0.1, 0.5);
      c.rotation.x = 0.35;
      paw.add(c);
    }
    model.add(pivot);
    legs.push({ pivot, knee, paw, front, side: Math.sign(x) });
  }
  const foamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, emissive: 0xdff4ff, emissiveIntensity: 0.15 });
  const foam = [];
  const foamGeo = new THREE.IcosahedronGeometry(0.22, 2);
  for (const [parent, x, y, z, r] of [
    [head, 0, 0.75, -0.05, 1.4], [head, -0.35, 0.6, 0.1, 1.0], [head, 0.38, 0.55, 0.05, 1.0], [head, 0, 0.5, 0.35, 0.9],
    [torso, 0, 1.15, 0.6, 1.6], [torso, -0.5, 1.0, 0.1, 1.3], [torso, 0.5, 1.0, 0.2, 1.3], [torso, 0, 1.05, -0.6, 1.4],
    [torso, -0.9, 0.5, 0.6, 1.1], [torso, 0.9, 0.5, -0.3, 1.1], [torso, 0, -0.6, 1.2, 1.3], [torso, 0.3, -0.85, 0.4, 1.1],
    [torso, -0.3, 0.9, -1.2, 1.0], [torso, 0.6, 0.6, 1.1, 1.0],
  ]) {
    const m = new THREE.Mesh(foamGeo, foamMat);
    m.position.set(x, y, z);
    m.userData.r = r;
    m.scale.setScalar(0.0001);
    m.visible = false;
    parent.add(m);
    foam.push(m);
  }
  model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  root.userData = { model, torso, head, jaw, legs, foam };
  return root;
}

export function animateBear(bear, dt, s) {
  const { model, torso, head, jaw, legs } = bear.userData;
  s.phase += dt * (2 + s.speed * 0.9);
  const walk = Math.min(1, s.speed / 6);
  const gait = s.running ? 0.85 : 0.55;
  const k18 = Math.min(1, dt * 18);
  legs.forEach((l, i) => {
    const off = (i === 0 || i === 3) ? 0 : Math.PI;
    const ph = s.phase + off + (l.front ? 0 : 0.35);
    let a = Math.sin(ph) * gait * walk;
    let kn = Math.max(0, -Math.cos(ph)) * (l.front ? 1.1 : 0.8) * walk;
    if (!s.grounded) { a = l.front ? -0.7 : 0.6; kn = l.front ? 0.9 : 0.4; }
    l.pivot.rotation.x = THREE.MathUtils.lerp(l.pivot.rotation.x, a, k18);
    l.knee.rotation.x = THREE.MathUtils.lerp(l.knee.rotation.x, kn, k18);
    l.paw.rotation.x = -(l.pivot.rotation.x + l.knee.rotation.x) * 0.7;
  });
  const now0 = performance.now() / 1000;
  torso.scale.set(1, 1 + Math.sin(now0 * 2.2) * 0.018 * (1 - walk), 1);
  model.rotation.z = Math.sin(s.phase) * 0.035 * walk;
  torso.rotation.y = Math.sin(s.phase) * 0.05 * walk;
  head.rotation.y = Math.sin(now0 * 0.7) * 0.15 * (1 - walk) - torso.rotation.y;
  let jawOpen = 0;
  let pitch = 0, headPitch = 0;
  if (s.hitT > 0) {
    const k = 1 - s.hitT / s.hitDur;
    const swing = k < 0.35 ? -2.4 * (k / 0.35) : -2.4 + (k - 0.35) / 0.65 * 3.0;
    const l = legs[s.hitSide > 0 ? 1 : 0];
    l.pivot.rotation.x = swing;
    l.pivot.rotation.z = -s.hitSide * 0.4 * Math.sin(k * Math.PI);
    l.knee.rotation.x = 0.2;
    pitch = -0.25 * Math.sin(k * Math.PI);
    jawOpen = 0.3 * Math.sin(k * Math.PI);
  } else {
    legs[0].pivot.rotation.z = legs[1].pivot.rotation.z = 0;
  }
  if (s.stompT > 0) {
    const k = 1 - s.stompT / s.stompDur;
    pitch = k < 0.5 ? -0.7 * (k / 0.5) : -0.7 + (k - 0.5) / 0.5 * 0.8;
    legs[0].pivot.rotation.x = legs[1].pivot.rotation.x = pitch * 2.5;
  }
  if (s.roarT > 0) {
    const k = 1 - s.roarT / s.roarDur;
    pitch = -0.3 * Math.sin(Math.min(1, k * 2) * Math.PI * 0.5);
    headPitch = -0.6 * Math.sin(Math.min(1, k * 1.2) * Math.PI);
    jawOpen = 0.6 * Math.sin(Math.min(1, k * 1.1) * Math.PI);
    head.position.x = Math.sin(k * 60) * 0.04;
  } else head.position.x = 0;
  if (s.drinking) {
    pitch = -0.22;
    headPitch = -0.75 + Math.sin(s.phase * 6) * 0.08;
  }
  s.showerBlend = THREE.MathUtils.lerp(s.showerBlend || 0, s.showering ? 1 : 0, Math.min(1, dt * 5));
  const sb = s.showerBlend;
  if (sb > 0.01) {
    const t = s.phase * 0.0 + performance.now() / 1000;
    const th = -0.95 * sb;
    pitch = th;
    const rub = Math.sin(t * 9);
    legs[0].pivot.rotation.x = THREE.MathUtils.lerp(legs[0].pivot.rotation.x, -2.0 + rub * 0.35, sb);
    legs[1].pivot.rotation.x = THREE.MathUtils.lerp(legs[1].pivot.rotation.x, -2.0 - rub * 0.35, sb);
    legs[0].pivot.rotation.z = (0.55 + Math.sin(t * 9 + 1) * 0.35) * sb;
    legs[1].pivot.rotation.z = (-0.55 - Math.sin(t * 9 + 2.5) * 0.35) * sb;
    legs[2].pivot.rotation.x = legs[3].pivot.rotation.x = -th;
    legs[2].knee.rotation.x = legs[3].knee.rotation.x = 0;
    legs[0].knee.rotation.x = THREE.MathUtils.lerp(legs[0].knee.rotation.x, 1.3, sb);
    legs[1].knee.rotation.x = THREE.MathUtils.lerp(legs[1].knee.rotation.x, 1.3, sb);
    jawOpen = (0.15 + Math.max(0, Math.sin(t * 5)) * 0.25) * sb;
    headPitch = (-0.5 + Math.sin(t * 2.5) * 0.15) * sb;
    head.rotation.z = Math.sin(t * 2.5) * 0.25 * sb;
  } else head.rotation.z = 0;
  const P = new THREE.Vector3(0, 0.05, -1.2);
  model.rotation.x = sb > 0.01 ? pitch : THREE.MathUtils.lerp(model.rotation.x, pitch, Math.min(1, dt * 14));
  const c = Math.cos(model.rotation.x), sn = Math.sin(model.rotation.x);
  model.position.set(0, (P.y - (P.y * c - P.z * sn)) * sb, (P.z - (P.y * sn + P.z * c)) * sb);
  const f = s.foam || 0;
  const now = performance.now() / 1000;
  bear.userData.foam.forEach((m, i) => {
    m.visible = f > 0.02;
    m.scale.setScalar(Math.max(0.0001, f * m.userData.r * (0.85 + 0.15 * Math.sin(now * 3 + i))));
  });
  head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, headPitch + Math.sin(s.phase * 0.5) * 0.05, Math.min(1, dt * 10));
  torso.position.y = 1.75 + Math.abs(Math.sin(s.phase)) * 0.08 * walk;
  jaw.rotation.x = THREE.MathUtils.lerp(jaw.rotation.x, jawOpen, Math.min(1, dt * 14));
}
