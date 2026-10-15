import * as THREE from 'three';
import { noise3, rng, std } from '../core/util.js';

export const ROCK_TYPES = [
  { id: 'lava', name: 'Lavasten', price: 2, emoji: '🔥', color: 0x5a2a20, hot: 0xff6a1a, info: 'Varm och krispig!' },
  { id: 'kristall', name: 'Kristallgodis', price: 3, emoji: '💎', color: 0xc9a6ff, info: 'Glittrar i magen!' },
  { id: 'manost', name: 'Månost', price: 1, emoji: '🧀', color: 0xffdf6b, info: 'Med hål från kratrar!' },
  { id: 'meteor', name: 'Meteorbulle', price: 2, emoji: '🍪', color: 0xb07a4f, info: 'Med strössel från rymden!' },
  { id: 'is', name: 'Issten', price: 2, emoji: '🧊', color: 0x9be7ff, info: 'Kall som en komet!' },
  { id: 'regnbage', name: 'Regnbågssten', price: 4, emoji: '🌈', color: 0xffffff, info: 'Smakar alla färger!' },
];

export const rockType = (id) => ROCK_TYPES.find((r) => r.id === id);

function lumpy(radius, seed, detail = 3, amount = 0.25, freq = 1.6) {
  const g = new THREE.IcosahedronGeometry(radius, detail);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const d = noise3(n.x * freq + seed, n.y * freq, n.z * freq) * 0.7 + noise3(n.x * freq * 3, n.y * freq * 3 + seed, n.z * freq * 3) * 0.3;
    v.copy(n).multiplyScalar(radius * (1 - amount / 2 + d * amount));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

const RAINBOW = [0xff5f6d, 0xffa94d, 0xffe066, 0x69db7c, 0x4dabf7, 0x9775fa];

export function createRock(typeId, size = 0.3, seed = 1) {
  const type = rockType(typeId);
  const r = rng(seed * 977 + 13);
  const g = new THREE.Group();
  const s = seed * 1.37;

  if (typeId === 'lava') {
    const geo = lumpy(size, s, 3, 0.35);
    const colors = [];
    const p = geo.attributes.position;
    const dark = new THREE.Color(type.color), hot = new THREE.Color(type.hot);
    for (let i = 0; i < p.count; i++) {
      const n = noise3(p.getX(i) * 9 / size * 0.3 + s, p.getY(i) * 9 / size * 0.3, p.getZ(i) * 9 / size * 0.3);
      const c = Math.abs(n - 0.5) < 0.06 ? hot : dark;
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, emissive: 0xff4a00, emissiveIntensity: 0.25, flatShading: true }));
    g.add(m);
    g.add(new THREE.Mesh(lumpy(size * 0.85, s + 3, 2, 0.2), new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5a00, emissiveIntensity: 1.6 })));
  } else if (typeId === 'kristall') {
    const mat = new THREE.MeshPhysicalMaterial({ color: type.color, roughness: 0.05, metalness: 0.1, clearcoat: 1, emissive: 0x8a5cff, emissiveIntensity: 0.35, flatShading: true });
    g.add(new THREE.Mesh(lumpy(size * 0.5, s, 0, 0.3), std(0x8b7aa8, { flatShading: true })));
    const n = 5 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const h = size * (0.8 + r() * 1.0);
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(size * 0.3, 0), mat);
      c.scale.set(1, h / (size * 0.3), 1);
      c.position.set((r() - 0.5) * size * 0.6, size * 0.2, (r() - 0.5) * size * 0.6);
      c.rotation.set((r() - 0.5) * 1.0, r() * 3, (r() - 0.5) * 1.0);
      g.add(c);
    }
  } else if (typeId === 'manost') {
    const geo = lumpy(size, s, 3, 0.15);
    g.add(new THREE.Mesh(geo, std(type.color, { roughness: 0.7 })));
    const craterMat = std(0xd9a93a, { roughness: 0.9 });
    for (let i = 0; i < 7; i++) {
      const dir = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
      const c = new THREE.Mesh(new THREE.CircleGeometry(size * (0.12 + r() * 0.12), 16), craterMat);
      c.position.copy(dir.clone().multiplyScalar(size * 0.97));
      c.lookAt(dir.clone().multiplyScalar(size * 3));
      g.add(c);
    }
  } else if (typeId === 'meteor') {
    g.add(new THREE.Mesh(lumpy(size, s, 3, 0.2), std(type.color, { roughness: 0.85 })));
    const icing = new THREE.Mesh(lumpy(size * 1.02, s, 3, 0.2), std(0xff9ed2, { roughness: 0.4 }));
    icing.scale.y = 0.55;
    icing.position.y = size * 0.25;
    g.add(icing);
    const sprinkleG = new THREE.CapsuleGeometry(size * 0.025, size * 0.1, 2, 4);
    for (let i = 0; i < 18; i++) {
      const a = r() * Math.PI * 2, b = r() * 0.9;
      const dir = new THREE.Vector3(Math.cos(a) * Math.sin(b), Math.cos(b), Math.sin(a) * Math.sin(b));
      const sp = new THREE.Mesh(sprinkleG, std(RAINBOW[i % RAINBOW.length]));
      sp.position.copy(dir.multiplyScalar(size * 0.95));
      sp.position.y = sp.position.y * 0.6 + size * 0.28;
      sp.rotation.set(r() * 3, r() * 3, r() * 3);
      g.add(sp);
    }
  } else if (typeId === 'is') {
    g.add(new THREE.Mesh(lumpy(size, s, 1, 0.4), new THREE.MeshPhysicalMaterial({ color: type.color, roughness: 0.1, transmission: 0.6, thickness: 0.5, transparent: true, opacity: 0.85, emissive: 0x3ac6ff, emissiveIntensity: 0.2, flatShading: true })));
    g.add(new THREE.Mesh(lumpy(size * 0.5, s + 5, 1, 0.3), std(0xffffff, { emissive: 0xcff4ff, emissiveIntensity: 0.6, flatShading: true })));
  } else {
    const geo = lumpy(size, s, 3, 0.25);
    const colors = [];
    const p = geo.attributes.position;
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const band = Math.floor(((p.getY(i) / size + 1) / 2) * RAINBOW.length * 1.5 + noise3(p.getX(i) * 3, 0, p.getZ(i) * 3) * 2);
      c.set(RAINBOW[((band % RAINBOW.length) + RAINBOW.length) % RAINBOW.length]);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, emissive: 0xffffff, emissiveIntensity: 0.08 })));
  }

  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}
