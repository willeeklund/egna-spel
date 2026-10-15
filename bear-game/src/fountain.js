import * as THREE from 'three';

const G = 9.81;
export const WATER_Y = 1.05;
export const INNER_R = 6.6;

const NOISE = /* glsl */`
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}`;

function stoneTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#b9b2a6'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) {
    const v = 150 + Math.random() * 60;
    g.fillStyle = `rgba(${v},${v - 6},${v - 14},0.35)`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  g.strokeStyle = 'rgba(90,85,78,0.5)'; g.lineWidth = 2;
  for (let x = 0; x <= 256; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
  for (let y = 0; y <= 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export class Fountain {
  constructor(scene, cx, cz, sunDir) {
    this.center = new THREE.Vector3(cx, 0, cz);
    this.group = new THREE.Group();
    this.group.position.set(cx, 0, cz);
    scene.add(this.group);

    const tex = stoneTexture();
    tex.repeat.set(12, 1);
    const stone = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, roughness: 0.85 });
    const profile = [
      [0, 0.62], [INNER_R - 0.2, 0.62], [INNER_R, 0.75], [INNER_R, 1.25], [INNER_R + 0.15, 1.32],
      [7.25, 1.32], [7.4, 1.25], [7.4, 0.35], [7.6, 0.2],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const basin = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), stone);
    basin.castShadow = basin.receiveShadow = true;
    this.group.add(basin);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(INNER_R - 0.1, 64), new THREE.MeshStandardMaterial({ color: 0x5f8f98, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.63;
    floor.receiveShadow = true;
    this.group.add(floor);

    this.jets = [];
    const N = 12;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const start = dir.clone().multiplyScalar(6.75).setY(1.36);
      const end = dir.clone().multiplyScalar(2.1).setY(WATER_Y);
      const H = 2.1;
      const vy = Math.sqrt(2 * G * H);
      const tUp = vy / G;
      const tDown = Math.sqrt(2 * (start.y + H - end.y) / G);
      const T = tUp + tDown;
      const vel = dir.clone().multiplyScalar(-start.distanceTo(new THREE.Vector3(end.x, start.y, end.z)) / T).setY(vy);
      this.jets.push({ start, end, vel, T });
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.14, 10), new THREE.MeshStandardMaterial({ color: 0xb08d3a, metalness: 0.9, roughness: 0.3 }));
      nozzle.position.copy(start).setY(1.33);
      this.group.add(nozzle);
    }

    this.uniforms = {
      uTime: { value: 0 },
      uSun: { value: sunDir.clone().normalize() },
      uSky: { value: new THREE.Color(0xbfe0ff) },
      uDeep: { value: new THREE.Color(0x1d6f86) },
      uShallow: { value: new THREE.Color(0x4fb7c9) },
      uImpacts: { value: this.jets.map((j) => new THREE.Vector2(j.end.x, j.end.z)) },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.5) },
    };

    const water = new THREE.Mesh(new THREE.CircleGeometry(INNER_R + 0.02, 96), new THREE.ShaderMaterial({
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
        uniform float uTime;
        uniform vec3 uSun, uSky, uDeep, uShallow;
        uniform vec2 uImpacts[${N}];
        varying vec3 vWorld;
        varying vec2 vLocal;
        ${NOISE}
        vec2 grad(vec2 p) {
          vec2 g = vec2(cos(p.x * 1.6 + uTime * 1.2) * 1.6 * 0.012, cos(p.y * 1.9 - uTime * 1.05) * 1.9 * 0.012);
          g += vec2(cos((p.x + p.y) * 3.1 + uTime * 2.1), cos((p.x + p.y) * 3.1 + uTime * 2.1)) * 3.1 * 0.006;
          g += vec2(cos(p.x * 5.3 - p.y * 2.2 - uTime * 2.7) * 5.3, -cos(p.x * 5.3 - p.y * 2.2 - uTime * 2.7) * 2.2) * 0.003;
          for (int i = 0; i < ${N}; i++) {
            vec2 dv = p - uImpacts[i];
            float d = max(length(dv), 0.001);
            float ph = d * 11.0 - uTime * 9.0;
            float k = 0.022 * exp(-d * 1.4) * (11.0 * cos(ph) - 1.4 * sin(ph));
            g += k * dv / d;
          }
          return g;
        }
        void main() {
          vec2 p = vLocal;
          vec2 g = grad(p);
          vec3 n = normalize(vec3(-g.x * 3.0, 1.0, -g.y * 3.0));
          vec3 V = normalize(cameraPosition - vWorld);
          float fres = 0.08 + 0.92 * pow(1.0 - max(dot(n, V), 0.0), 4.0);
          vec3 R = reflect(-V, n);
          float spec = pow(max(dot(R, uSun), 0.0), 220.0) * 3.0 + pow(max(dot(R, uSun), 0.0), 30.0) * 0.15;
          float r = length(p);
          vec3 base = mix(uShallow, uDeep, 0.35 + 0.4 * smoothstep(${INNER_R.toFixed(1)}, 0.0, r));
          float caustic = pow(vnoise(p * 3.0 + vec2(uTime * 0.6, -uTime * 0.4)) * vnoise(p * 3.7 - uTime * 0.5), 2.0);
          base += caustic * 0.25;
          vec3 col = mix(base, uSky, fres) + spec;
          float foam = 0.0;
          float fn = 0.55 + 0.45 * vnoise(p * 14.0 + uTime * 6.0);
          for (int i = 0; i < ${N}; i++) {
            float d = length(p - uImpacts[i]);
            foam += smoothstep(0.55, 0.0, d) * fn;
            foam += smoothstep(0.08, 0.0, abs(d - fract(uTime * 0.9 + float(i) * 0.37) * 1.4)) * 0.25 * smoothstep(1.4, 0.2, d);
          }
          foam += smoothstep(${(INNER_R - 0.25).toFixed(2)}, ${INNER_R.toFixed(2)}, r) * 0.35;
          col = mix(col, vec3(1.0), clamp(foam, 0.0, 0.85));
          gl_FragColor = vec4(col, clamp(0.78 + fres * 0.2 + foam * 0.2, 0.0, 1.0));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    water.rotation.x = -Math.PI / 2;
    water.position.y = WATER_Y;
    water.renderOrder = 1;
    this.group.add(water);

    const tubes = this.jets.map((j) => {
      const pts = [];
      for (let k = 0; k <= 40; k++) {
        const t = (k / 40) * j.T;
        pts.push(j.start.clone().addScaledVector(j.vel, t).add(new THREE.Vector3(0, -0.5 * G * t * t, 0)));
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.05, 10, false);
    });
    const jetMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */`
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vW;
        void main() {
          vUv = uv;
          vN = normalize(mat3(modelMatrix) * normal);
          vec4 w = modelMatrix * vec4(position, 1.0);
          vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */`
        uniform float uTime;
        uniform vec3 uSun;
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vW;
        ${NOISE}
        void main() {
          float flow = vnoise(vec2(vUv.x * 60.0 - uTime * 14.0, vUv.y * 8.0));
          float flow2 = vnoise(vec2(vUv.x * 140.0 - uTime * 22.0, vUv.y * 16.0));
          vec3 V = normalize(cameraPosition - vW);
          vec3 n = normalize(vN);
          float fres = pow(1.0 - abs(dot(n, V)), 2.0);
          float spec = pow(max(dot(reflect(-V, n), uSun), 0.0), 60.0);
          float a = (0.28 + 0.4 * flow + 0.25 * flow2) * (0.45 + fres * 0.8);
          a *= smoothstep(0.0, 0.04, vUv.x) * (1.0 - 0.6 * smoothstep(0.75, 1.0, vUv.x));
          vec3 col = mix(vec3(0.72, 0.87, 0.98), vec3(1.0), flow2 * 0.7 + fres * 0.4) + spec * 0.8;
          gl_FragColor = vec4(col, clamp(a, 0.0, 0.9));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const jetsMesh = new THREE.Mesh(mergeTubes(tubes), jetMat);
    jetsMesh.renderOrder = 2;
    this.group.add(jetsMesh);

    const starts = [], vels = [], durs = [], phases = [], sizes = [];
    const push = (s, v, d, size) => { starts.push(s.x, s.y, s.z); vels.push(v.x, v.y, v.z); durs.push(d); phases.push(Math.random()); sizes.push(size); };
    for (const j of this.jets) {
      for (let k = 0; k < 70; k++) {
        const jit = new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.5);
        push(j.start, j.vel.clone().add(jit), j.T * (0.95 + Math.random() * 0.15), 0.03 + Math.random() * 0.05);
      }
      for (let k = 0; k < 45; k++) {
        const a = Math.random() * Math.PI * 2, sp = 0.4 + Math.random() * 1.3, up = 1.2 + Math.random() * 2.2;
        push(j.end.clone().add(new THREE.Vector3(Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15)), new THREE.Vector3(Math.cos(a) * sp, up, Math.sin(a) * sp), (2 * up) / G, 0.025 + Math.random() * 0.04);
      }
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(starts, 3));
    pg.setAttribute('aVel', new THREE.Float32BufferAttribute(vels, 3));
    pg.setAttribute('aDur', new THREE.Float32BufferAttribute(durs, 1));
    pg.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
    pg.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    pg.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, 0), 9);
    const drops = new THREE.Points(pg, new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */`
        uniform float uTime, uPixelRatio;
        attribute vec3 aVel;
        attribute float aDur, aPhase, aSize;
        varying float vAlpha;
        void main() {
          float t = fract(uTime / aDur + aPhase) * aDur;
          vec3 p = position + aVel * t + vec3(0.0, -0.5 * ${G.toFixed(2)} * t * t, 0.0);
          vAlpha = (p.y < ${WATER_Y.toFixed(2)} - 0.02) ? 0.0 : 0.85 * smoothstep(0.0, 0.08, t);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPixelRatio * 900.0 / -mv.z;
        }`,
      fragmentShader: /* glsl */`
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.15, d) * vAlpha;
          vec3 col = mix(vec3(0.8, 0.92, 1.0), vec3(1.0), smoothstep(0.3, 0.0, length(c - vec2(-0.12, -0.12))));
          gl_FragColor = vec4(col, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    drops.renderOrder = 3;
    this.group.add(drops);
  }

  update(time) {
    this.uniforms.uTime.value = time;
  }
}

function mergeTubes(geos) {
  const pos = [], nor = [], uv = [], idx = [];
  let off = 0;
  for (const g of geos) {
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
    uv.push(...g.attributes.uv.array);
    for (const i of g.index.array) idx.push(i + off);
    off += g.attributes.position.count;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  m.setIndex(idx);
  return m;
}
