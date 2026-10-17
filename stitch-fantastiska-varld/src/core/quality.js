import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const KEY = 'stitch-fantastiska-varld-grafik';
const SLOW_FPS = 40;

function readSetting() {
  const param = new URLSearchParams(location.search).get('grafik');
  if (param === 'enkel' || param === 'fin') {
    try { localStorage.setItem(KEY, param); } catch {}
    return param;
  }
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'enkel' || v === 'fin') return v;
  } catch {}
  return null;
}

const setting = readSetting();
export const LOW = setting === 'enkel';
export const AUTO = setting === null;

export function setGraphics(level) {
  try { localStorage.setItem(KEY, level); } catch {}
  const url = new URL(location.href);
  url.searchParams.delete('grafik');
  location.replace(url);
}

export function watchFrameRate(onSlow) {
  if (!AUTO) return;
  const frames = [];
  let last = 0;
  let skip = 30;
  const tick = (t) => {
    if (document.visibilityState === 'visible' && last) {
      if (skip > 0) skip--;
      else frames.push(t - last);
    }
    last = t;
    if (frames.length < 120) {
      requestAnimationFrame(tick);
      return;
    }
    frames.sort((a, b) => a - b);
    const median = frames[frames.length >> 1];
    if (1000 / median < SLOW_FPS) onSlow();
    else try { localStorage.setItem(KEY, 'fin'); } catch {}
  };
  document.addEventListener('visibilitychange', () => { last = 0; });
  requestAnimationFrame(tick);
}

const SEGMENT_LIMITS = {
  SphereGeometry: { widthSegments: [6, 24], heightSegments: [4, 16] },
  CylinderGeometry: { radialSegments: [5, 12] },
  ConeGeometry: { radialSegments: [4, 12] },
  CircleGeometry: { segments: [8, 40] },
  RingGeometry: { thetaSegments: [8, 32] },
  TorusGeometry: { radialSegments: [4, 6], tubularSegments: [8, 64] },
  CapsuleGeometry: { capSegments: [2, 4], radialSegments: [6, 10] },
  LatheGeometry: { segments: [8, 24] },
  TubeGeometry: { tubularSegments: [8, 24], radialSegments: [4, 6] },
};

const BUILDERS = {
  SphereGeometry: (p) => new THREE.SphereGeometry(p.radius, p.widthSegments, p.heightSegments, p.phiStart, p.phiLength, p.thetaStart, p.thetaLength),
  CylinderGeometry: (p) => new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, p.radialSegments, p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength),
  ConeGeometry: (p) => new THREE.ConeGeometry(p.radius, p.height, p.radialSegments, p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength),
  CircleGeometry: (p) => new THREE.CircleGeometry(p.radius, p.segments, p.thetaStart, p.thetaLength),
  RingGeometry: (p) => new THREE.RingGeometry(p.innerRadius, p.outerRadius, p.thetaSegments, p.phiSegments, p.thetaStart, p.thetaLength),
  TorusGeometry: (p) => new THREE.TorusGeometry(p.radius, p.tube, p.radialSegments, p.tubularSegments, p.arc),
  CapsuleGeometry: (p) => new THREE.CapsuleGeometry(p.radius, p.length, p.capSegments, p.radialSegments),
  LatheGeometry: (p) => new THREE.LatheGeometry(p.points, p.segments, p.phiStart, p.phiLength),
  TubeGeometry: (p) => new THREE.TubeGeometry(p.path, p.tubularSegments, p.radius, p.radialSegments, p.closed),
};

function samePositions(a, b) {
  const pa = a.attributes.position.array, pb = b.attributes.position.array;
  if (pa.length !== pb.length) return false;
  for (let i = 0; i < pa.length; i++) if (Math.abs(pa[i] - pb[i]) > 1e-5) return false;
  return true;
}

const simplerGeometry = new WeakMap();

function simplifyGeometry(geo) {
  if (simplerGeometry.has(geo)) return simplerGeometry.get(geo);
  let result = geo;
  const limits = SEGMENT_LIMITS[geo.type];
  const build = BUILDERS[geo.type];
  if (limits && build && geo.parameters && !geo.morphAttributes.position) {
    const p = { ...geo.parameters };
    let changed = false;
    for (const [k, [min, max]] of Object.entries(limits)) {
      if (p[k] === undefined) continue;
      const next = Math.max(min, Math.min(max, Math.ceil(p[k] / 2)));
      if (next < p[k]) {
        p[k] = next;
        changed = true;
      }
    }
    if (changed && samePositions(geo, build(geo.parameters))) {
      result = build(p);
    }
  }
  simplerGeometry.set(geo, result);
  return result;
}

function simplifyMaterial(m) {
  if (m.isMeshPhysicalMaterial) {
    m.transmission = 0;
    m.clearcoat = 0;
    m.sheen = 0;
    m.iridescence = 0;
  }
  if (m.isMeshStandardMaterial) m.metalness = Math.min(m.metalness, 0.25);
}

export function simplify(root) {
  if (!LOW) return;
  root.traverse((o) => {
    if (o.isMesh && !o.isInstancedMesh && !Array.isArray(o.material)) o.geometry = simplifyGeometry(o.geometry);
    if (o.isMesh || o.isPoints) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(simplifyMaterial);
  });
}

function materialKey(m) {
  return [
    m.type, m.color?.getHex(), m.emissive?.getHex(), m.emissiveIntensity, m.map?.uuid, m.transparent, m.opacity,
    m.side, m.flatShading, m.roughness, m.metalness, m.depthWrite, m.blending, m.alphaTest,
  ].join('|');
}

function prepareForMerge(geo, matrix, withUv) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', geo.attributes.position.clone());
  if (geo.attributes.normal) g.setAttribute('normal', geo.attributes.normal.clone());
  else g.computeVertexNormals();
  if (withUv) {
    const count = geo.attributes.position.count;
    g.setAttribute('uv', geo.attributes.uv ? geo.attributes.uv.clone() : new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  if (geo.index) g.setIndex(geo.index.clone());
  else g.setIndex([...Array(geo.attributes.position.count).keys()]);
  g.applyMatrix4(matrix);
  if (matrix.determinant() < 0) {
    const idx = g.index.array;
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  }
  return g;
}

export function mergeStatic(root, exclude = []) {
  if (!LOW) return;
  const skip = new Set(exclude.filter(Boolean));
  root.updateMatrixWorld(true);
  const toLocal = root.matrixWorld.clone().invert();
  const buckets = new Map();
  const visit = (o) => {
    if (skip.has(o) || !o.visible) return;
    if (
      o !== root && o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && !Array.isArray(o.material) &&
      !o.material.isShaderMaterial && !o.material.vertexColors && !o.geometry.morphAttributes.position
    ) {
      const key = materialKey(o.material);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(o);
    }
    for (const c of o.children) visit(c);
  };
  for (const c of root.children) visit(c);

  const m = new THREE.Matrix4();
  for (const meshes of buckets.values()) {
    if (meshes.length < 2) continue;
    const material = meshes[0].material;
    const withUv = !!material.map;
    const parts = meshes.map((o) => prepareForMerge(o.geometry, m.multiplyMatrices(toLocal, o.matrixWorld), withUv));
    const merged = mergeGeometries(parts);
    if (!merged) continue;
    const combined = new THREE.Mesh(merged, material);
    combined.matrixAutoUpdate = false;
    root.add(combined);
    for (const o of meshes) {
      o.visible = false;
      o.matrixAutoUpdate = false;
    }
  }
}
