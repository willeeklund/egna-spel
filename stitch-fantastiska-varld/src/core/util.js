import * as THREE from 'three';

export function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...opts });
}

export function metal(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.85, ...opts });
}

export function glow(color, intensity = 2, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.4,
    ...opts,
  });
}

export function glass(color = 0xbfe8ff, opacity = 0.35) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.05,
    metalness: 0,
    transparent: true,
    opacity,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    depthWrite: false,
  });
}

export function mesh(geo, mat, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, shadow = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  if (typeof s === 'number') m.scale.setScalar(s);
  else m.scale.set(s[0], s[1], s[2]);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

export function noise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
  const lerp = (a, b, t) => a + (b - a) * t;
  const n = (a, b, c) => hash3(ix + a, iy + b, iz + c);
  return lerp(
    lerp(lerp(n(0, 0, 0), n(1, 0, 0), ux), lerp(n(0, 1, 0), n(1, 1, 0), ux), uy),
    lerp(lerp(n(0, 0, 1), n(1, 0, 1), ux), lerp(n(0, 1, 1), n(1, 1, 1), ux), uy),
    uz,
  );
}

export function canvasTexture(w, h, draw, { repeat = null, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  return tex;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function signTexture(text, {
  w = 512, h = 128, bg = '#ffffff', fg = '#3b2a6b', border = '#ff7eb6', font = 'bold 64px Fredoka, Arial Rounded MT Bold, sans-serif', sub = null,
} = {}) {
  return canvasTexture(w, h, (ctx) => {
    roundRect(ctx, 6, 6, w - 12, h - 12, Math.min(40, h / 3));
    ctx.fillStyle = bg;
    ctx.fill();
    if (border) {
      ctx.lineWidth = 10;
      ctx.strokeStyle = border;
      ctx.stroke();
    }
    ctx.fillStyle = fg;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, sub ? h * 0.4 : h / 2 + 4);
    if (sub) {
      ctx.font = font.replace(/\d+px/, `${Math.round(h * 0.18)}px`);
      ctx.fillText(sub, w / 2, h * 0.75);
    }
  });
}

export function starShape(outer = 1, inner = 0.45, points = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

export function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
