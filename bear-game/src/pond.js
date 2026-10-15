import * as THREE from 'three';

const RIPPLES = 6;
export const POND_Y = 0.26;

export class Pond {
  constructor(scene, x, z, r, sunDir) {
    this.center = new THREE.Vector3(x, 0, z);
    this.r = r;
    this.next = 0;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    scene.add(group);

    const bottom = new THREE.Mesh(new THREE.CircleGeometry(r + 0.3, 48), new THREE.MeshStandardMaterial({ color: 0x1f4f3a, roughness: 1 }));
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = 0.215;
    bottom.receiveShadow = true;
    group.add(bottom);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9a958c, roughness: 0.9, flatShading: true });
    const stoneGeo = new THREE.DodecahedronGeometry(0.5, 0);
    const n = Math.round(r * 5);
    const stones = new THREE.InstancedMesh(stoneGeo, stoneMat, n);
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.1;
      const s = 0.6 + Math.random() * 0.5;
      m.compose(new THREE.Vector3(Math.cos(a) * (r + 0.35), 0.22, Math.sin(a) * (r + 0.35)), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, 0)), new THREE.Vector3(s, s * 0.45, s));
      stones.setMatrixAt(i, m);
    }
    stones.castShadow = stones.receiveShadow = true;
    group.add(stones);

    const padMat = new THREE.MeshStandardMaterial({ color: 0x3f9a3a, roughness: 0.7, side: THREE.DoubleSide });
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffb6d5, roughness: 0.6 });
    this.pads = [];
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2, d = r * (0.35 + Math.random() * 0.55);
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.55 + Math.random() * 0.3, 14, 0.4, Math.PI * 2 - 0.5), padMat);
      pad.rotation.x = -Math.PI / 2;
      pad.rotation.z = Math.random() * 6;
      pad.position.set(Math.cos(a) * d, POND_Y + 0.015, Math.sin(a) * d);
      if (i % 3 === 0) {
        const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), flowerMat);
        fl.position.set(0, 0, 0.1);
        pad.add(fl);
      }
      group.add(pad);
      this.pads.push({ pad, base: pad.position.clone(), phase: Math.random() * 6 });
    }

    const reedMat = new THREE.MeshStandardMaterial({ color: 0x4f7a2a, roughness: 0.9 });
    const reedGeo = new THREE.CylinderGeometry(0.03, 0.05, 1.6, 5).translate(0, 0.8, 0);
    const reeds = new THREE.InstancedMesh(reedGeo, reedMat, 40);
    for (let i = 0; i < 40; i++) {
      const a = 2.2 + (i / 40) * 1.6 + Math.random() * 0.1, d = r - 0.6 + Math.random() * 0.4;
      m.compose(new THREE.Vector3(Math.cos(a) * d, 0.2, Math.sin(a) * d), new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3)), new THREE.Vector3(1, 0.7 + Math.random() * 0.6, 1));
      reeds.setMatrixAt(i, m);
    }
    reeds.castShadow = true;
    group.add(reeds);

    this.uniforms = {
      uTime: { value: 0 },
      uSun: { value: sunDir.clone().normalize() },
      uR: { value: r },
      uRip: { value: Array.from({ length: RIPPLES }, () => new THREE.Vector4(0, 0, -99, 0)) },
    };
    const water = new THREE.Mesh(new THREE.CircleGeometry(r, 72), new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */`
        varying vec3 vWorld;
        varying vec2 vLocal;
        void main() {
          vLocal = position.xy * vec2(1.0, -1.0);
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */`
        uniform float uTime, uR;
        uniform vec3 uSun;
        uniform vec4 uRip[${RIPPLES}];
        varying vec3 vWorld;
        varying vec2 vLocal;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vnoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
        }
        void main() {
          vec2 p = vLocal;
          vec2 g = vec2(cos(p.x * 0.9 + uTime * 0.8) * 0.012, cos(p.y * 1.1 - uTime * 0.7) * 0.012);
          g += vec2(cos((p.x + p.y) * 2.3 + uTime * 1.5), cos((p.x - p.y) * 2.1 - uTime * 1.3)) * 0.008;
          float ring = 0.0;
          for (int i = 0; i < ${RIPPLES}; i++) {
            vec4 rp = uRip[i];
            float age = uTime - rp.z;
            if (age < 0.0 || age > 3.0) continue;
            vec2 dv = p - rp.xy;
            float d = max(length(dv), 0.001);
            float front = age * 2.6;
            float env = exp(-pow((d - front) * 2.2, 2.0)) * (1.0 - age / 3.0) * rp.w;
            float ph = (d - front) * 9.0;
            g += dv / d * cos(ph) * env * 0.12;
            ring += env * max(0.0, sin(ph)) * 0.5;
          }
          vec3 n = normalize(vec3(-g.x * 3.0, 1.0, -g.y * 3.0));
          vec3 V = normalize(cameraPosition - vWorld);
          float fres = 0.06 + 0.94 * pow(1.0 - max(dot(n, V), 0.0), 4.0);
          vec3 R = reflect(-V, n);
          float spec = pow(max(dot(R, uSun), 0.0), 200.0) * 2.5 + pow(max(dot(R, uSun), 0.0), 25.0) * 0.12;
          float r = length(p);
          vec3 deep = vec3(0.09, 0.32, 0.36), shallow = vec3(0.28, 0.6, 0.55);
          vec3 base = mix(deep, shallow, smoothstep(uR * 0.4, uR, r));
          base += pow(vnoise(p * 1.7 + vec2(uTime * 0.3, -uTime * 0.2)) * vnoise(p * 2.1 - uTime * 0.25), 2.0) * 0.18;
          vec3 col = mix(base, vec3(0.75, 0.87, 0.98), fres) + spec;
          float foam = smoothstep(uR - 0.35, uR, r) * (0.4 + 0.4 * vnoise(p * 6.0 + uTime));
          col = mix(col, vec3(1.0), clamp(foam + ring, 0.0, 0.8));
          gl_FragColor = vec4(col, 0.82 + fres * 0.15);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    water.rotation.x = -Math.PI / 2;
    water.position.y = POND_Y;
    water.renderOrder = 1;
    group.add(water);
  }

  ripple(x, z, strength, time) {
    const r = this.uniforms.uRip.value[this.next];
    r.set(x - this.center.x, z - this.center.z, time, strength);
    this.next = (this.next + 1) % RIPPLES;
  }

  contains(p, margin = 0) {
    return Math.hypot(p.x - this.center.x, p.z - this.center.z) < this.r - margin && p.y > -0.5 && p.y < 0.8;
  }

  update(time) {
    this.uniforms.uTime.value = time;
    for (const { pad, base, phase } of this.pads) {
      pad.position.y = base.y + Math.sin(time * 1.3 + phase) * 0.01;
      pad.position.x = base.x + Math.sin(time * 0.4 + phase) * 0.08;
    }
  }
}
