import * as THREE from 'three';
import { LOW } from '../core/quality.js';

const vertex = /* glsl */ `
  attribute float pSize;
  attribute float pAlpha;
  attribute vec3 pColor;
  varying float vAlpha;
  varying vec3 vColor;
  uniform float uPixelRatio;
  void main() {
    vAlpha = pAlpha;
    vColor = pColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = pSize * uPixelRatio * (420.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  uniform float uSoft;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, uSoft, d) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

class ParticleSystem {
  constructor(scene, max, blending, soft) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.p = [];
    for (let i = 0; i < max; i++) this.p.push({ life: 0 });
    this.cursor = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('pColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('pSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('pAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { uPixelRatio: { value: LOW ? 1 : Math.min(window.devicePixelRatio, 2) }, uSoft: { value: soft } },
      transparent: true,
      depthWrite: false,
      blending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  emit(o) {
    const count = LOW ? Math.floor((o.count ?? 1) * 0.4 + Math.random()) : o.count ?? 1;
    const c = new THREE.Color();
    for (let n = 0; n < count; n++) {
      const p = this.p[this.cursor];
      this.cursor = (this.cursor + 1) % this.max;
      const spread = o.spread ?? 0;
      p.x = o.pos.x + (Math.random() - 0.5) * spread;
      p.y = o.pos.y + (Math.random() - 0.5) * spread;
      p.z = o.pos.z + (Math.random() - 0.5) * spread;
      const vr = o.velRandom ?? 1;
      const v = o.vel ?? { x: 0, y: 0, z: 0 };
      p.vx = v.x + (Math.random() - 0.5) * 2 * vr;
      p.vy = v.y + (Math.random() - 0.5) * 2 * vr;
      p.vz = v.z + (Math.random() - 0.5) * 2 * vr;
      p.maxLife = p.life = (o.life ?? 1) * (0.7 + Math.random() * 0.6);
      p.size0 = o.size ?? 0.5;
      p.size1 = o.sizeEnd ?? p.size0;
      p.gravity = o.gravity ?? 0;
      p.drag = o.drag ?? 0;
      const colors = Array.isArray(o.color) ? o.color : [o.color ?? 0xffffff];
      c.set(colors[Math.floor(Math.random() * colors.length)]);
      p.r = c.r; p.g = c.g; p.b = c.b;
      if (o.colorEnd !== undefined) {
        const ce = new THREE.Color(o.colorEnd);
        p.r1 = ce.r; p.g1 = ce.g; p.b1 = ce.b;
      } else {
        p.r1 = p.r; p.g1 = p.g; p.b1 = p.b;
      }
      p.alpha0 = o.alpha ?? 1;
    }
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      const p = this.p[i];
      if (p.life <= 0) {
        this.alpha[i] = 0;
        this.size[i] = 0;
        continue;
      }
      p.life -= dt;
      p.vy -= p.gravity * dt;
      const dr = Math.max(0, 1 - p.drag * dt);
      p.vx *= dr; p.vy *= dr; p.vz *= dr;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const t = 1 - Math.max(0, p.life) / p.maxLife;
      this.pos[i * 3] = p.x;
      this.pos[i * 3 + 1] = p.y;
      this.pos[i * 3 + 2] = p.z;
      this.col[i * 3] = p.r + (p.r1 - p.r) * t;
      this.col[i * 3 + 1] = p.g + (p.g1 - p.g) * t;
      this.col[i * 3 + 2] = p.b + (p.b1 - p.b) * t;
      this.size[i] = p.size0 + (p.size1 - p.size0) * t;
      this.alpha[i] = p.alpha0 * Math.min(1, (1 - t) * 3) * Math.min(1, t * 12 + 0.2);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.pColor.needsUpdate = true;
    this.geo.attributes.pSize.needsUpdate = true;
    this.geo.attributes.pAlpha.needsUpdate = true;
  }
}

export class Particles {
  constructor(scene) {
    this.glow = new ParticleSystem(scene, 4000, THREE.AdditiveBlending, 0.0);
    this.smoke = new ParticleSystem(scene, 2000, THREE.NormalBlending, 0.15);
  }

  sparkle(pos, color = [0xfff27a, 0xff9de2, 0x9df2ff], count = 20, speed = 3) {
    this.glow.emit({ pos, count, color, size: 0.35, sizeEnd: 0.05, life: 0.8, velRandom: speed, gravity: 2, drag: 1.5 });
  }

  hearts(pos) {
    this.glow.emit({ pos, count: 14, color: [0xff5fa2, 0xff9dd0], size: 0.5, sizeEnd: 0.1, life: 1.2, vel: { x: 0, y: 2, z: 0 }, velRandom: 1, drag: 1 });
  }

  dust(pos, count = 20, color = 0xf3e6ff) {
    this.smoke.emit({ pos, count, color, size: 1.2, sizeEnd: 3, life: 1.4, velRandom: 3, vel: { x: 0, y: 0.8, z: 0 }, drag: 2.5, alpha: 0.6, spread: 2 });
  }

  update(dt) {
    this.glow.update(dt);
    this.smoke.update(dt);
  }
}
