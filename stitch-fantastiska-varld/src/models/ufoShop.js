import * as THREE from 'three';
import { std, metal, glow, glass, mesh, signTexture, canvasTexture, roundRect } from '../core/util.js';
import { createRock } from './rockFood.js';

export const UFO_HEIGHT = 6.5;

function lathe(points, mat, segments = 64) {
  return mesh(new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments), mat);
}

function beamMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uColor;
      void main() {
        float rings = 0.55 + 0.45 * sin(vUv.y * 40.0 + uTime * 6.0);
        float stripes = 0.8 + 0.2 * sin(vUv.x * 60.0 - uTime * 2.0);
        float fade = smoothstep(0.0, 0.25, vUv.y) * (0.5 + 0.5 * vUv.y);
        gl_FragColor = vec4(uColor * rings * stripes, 0.32 * fade);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

function menuTexture(lines) {
  return canvasTexture(256, 384, (ctx) => {
    ctx.fillStyle = '#2f3b2f';
    ctx.fillRect(0, 0, 256, 384);
    ctx.strokeStyle = '#c69a5b';
    ctx.lineWidth = 16;
    ctx.strokeRect(0, 0, 256, 384);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MENY', 128, 56);
    ctx.font = '24px Fredoka, sans-serif';
    lines.forEach((l, i) => {
      ctx.fillStyle = ['#ffd166', '#ff8fc0', '#9df2ff', '#b7f7a5', '#ffb37a'][i % 5];
      ctx.fillText(l, 128, 110 + i * 48);
    });
  });
}

function cartModel() {
  const g = new THREE.Group();
  const wire = metal(0xdde3ee, { roughness: 0.3 });
  const gridTex = canvasTexture(64, 64, (ctx) => {
    ctx.clearRect(0, 0, 64, 64);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    for (let i = 0; i <= 64; i += 16) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 64); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(64, i); ctx.stroke();
    }
  }, { repeat: [3, 2] });
  const gm = new THREE.MeshStandardMaterial({ map: gridTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.8, roughness: 0.3 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.8), gm);
  box.position.y = 0.95;
  box.castShadow = true;
  g.add(box);
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), std(0xff5fa2), { x: -0.75, y: 1.45, rz: Math.PI / 2, rx: Math.PI / 2 }));
  for (const sx of [-0.5, 0.5]) for (const sz of [-0.3, 0.3]) {
    g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 6), wire, { x: sx, y: 0.35, z: sz }));
    g.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 12), std(0x333344), { x: sx, y: 0.09, z: sz, rx: Math.PI / 2 }));
  }
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), wire, { x: -0.68, y: 1.25, z: 0.38, rz: -0.6 }));
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), wire, { x: -0.68, y: 1.25, z: -0.38, rz: -0.6 }));
  return g;
}

export function createUfoShop({ name, color, accent, beamColor, menu, displayRocks }) {
  const g = new THREE.Group();
  const saucer = new THREE.Group();
  saucer.position.y = UFO_HEIGHT;
  g.add(saucer);

  const hullMat = metal(color, { roughness: 0.3, metalness: 0.6 });
  const accMat = std(accent, { roughness: 0.3, metalness: 0.3 });
  const chrome = metal(0xe6ecf5);

  saucer.add(lathe([[0, -1.3], [1.4, -1.25], [2.2, -1.1], [3.8, -0.65], [5.4, -0.15], [6.1, 0.1]], hullMat));
  saucer.add(lathe([[6.1, 0.1], [6.2, 0.25], [6.05, 0.4], [4.6, 0.85], [3.2, 1.2], [2.9, 1.25], [0, 1.25]], accMat));
  saucer.add(mesh(new THREE.TorusGeometry(6.15, 0.2, 12, 96), chrome, { y: 0.25, rx: Math.PI / 2 }));
  saucer.add(mesh(new THREE.TorusGeometry(3.85, 0.08, 8, 64), chrome, { y: -0.62, rx: Math.PI / 2 }));
  saucer.add(mesh(new THREE.TorusGeometry(2.25, 0.08, 8, 64), chrome, { y: -1.08, rx: Math.PI / 2 }));

  const lights = [];
  const lightG = new THREE.SphereGeometry(0.17, 12, 8);
  const palette = [0xff5fa2, 0xffe066, 0x5ff2ff, 0x9dff7a, 0xc38bff];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const m = glow(palette[i % palette.length], 2.5);
    const l = mesh(lightG, m, { x: Math.sin(a) * 6.33, y: 0.25, z: Math.cos(a) * 6.33, shadow: false });
    saucer.add(l);
    lights.push(m);
  }

  const winG = new THREE.CapsuleGeometry(0.16, 0.4, 4, 8);
  const winMat = glow(0x9df8ff, 1.4);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const w = mesh(winG, winMat, { x: Math.sin(a) * 4.3, y: 0.92, z: Math.cos(a) * 4.3, shadow: false });
    w.rotation.set(Math.PI / 2, 0, 0);
    const holder = new THREE.Group();
    holder.rotation.y = a;
    holder.add(w);
    w.position.set(0, 0.92, 4.3);
    w.rotation.set(Math.PI / 2 - 0.35, 0, Math.PI / 2);
    saucer.add(holder);
  }

  const dome = mesh(new THREE.SphereGeometry(2.9, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), glass(0xd6f3ff, 0.28), { y: 1.25, shadow: false });
  saucer.add(dome);
  saucer.add(mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.2, 48), std(0xffffff, { roughness: 0.5 }), { y: 1.3 }));
  for (let i = 0; i < displayRocks.length; i++) {
    const a = (i / displayRocks.length) * Math.PI * 2;
    const rock = createRock(displayRocks[i], 0.55, i + 3);
    rock.position.set(Math.sin(a) * 1.4, 1.95, Math.cos(a) * 1.4);
    saucer.add(rock);
    saucer.add(mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.5, 16), std(0xffe6f3), { x: rock.position.x, y: 1.6, z: rock.position.z }));
  }
  saucer.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.6, 8), chrome, { y: 3.3 + 1.25 }));
  saucer.add(mesh(new THREE.SphereGeometry(0.2, 16, 12), glow(0xfff27a, 3), { y: 6.2 }));

  const signTex = signTexture(name, { w: 1024, h: 220, bg: '#fff7fb', fg: '#6b2fa3', border: '#' + new THREE.Color(accent).getHexString(), font: 'bold 120px Fredoka, sans-serif' });
  const sign = new THREE.Group();
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.35 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(6, 1.3, 0.15), [chrome, chrome, chrome, chrome, signMat, signMat]);
  board.castShadow = true;
  sign.add(board);
  for (let i = 0; i < 14; i++) {
    const x = -2.8 + (i / 13) * 5.6;
    for (const y of [-0.72, 0.72]) {
      sign.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), glow(palette[i % palette.length], 3), { x, y, z: 0, shadow: false }));
    }
  }
  sign.position.y = 5.3;
  saucer.add(sign);

  const hatch = mesh(new THREE.CircleGeometry(1.35, 48), glow(beamColor, 2.5), { y: -1.31, rx: Math.PI / 2, shadow: false });
  saucer.add(hatch);
  const beamH = UFO_HEIGHT - 1.3;
  const beamMat = beamMaterial(beamColor);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 2.4, beamH, 48, 1, true), beamMat);
  beam.position.y = beamH / 2;
  g.add(beam);
  const pad = mesh(new THREE.RingGeometry(1.9, 2.4, 48), glow(beamColor, 2), { y: 0.03, rx: -Math.PI / 2, shadow: false });
  g.add(pad);
  const padInner = mesh(new THREE.CircleGeometry(1.9, 48), new THREE.MeshStandardMaterial({ color: beamColor, emissive: beamColor, emissiveIntensity: 0.4, transparent: true, opacity: 0.5 }), { y: 0.025, rx: -Math.PI / 2, shadow: false });
  g.add(padInner);

  const legMat = metal(0xb9c2d3);
  const legFeet = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const top = new THREE.Vector3(Math.sin(a) * 3.6, UFO_HEIGHT - 0.6, Math.cos(a) * 3.6);
    const foot = new THREE.Vector3(Math.sin(a) * 5.2, 0.25, Math.cos(a) * 5.2);
    const mid = top.clone().lerp(foot, 0.5);
    const len = top.distanceTo(foot);
    const leg = mesh(new THREE.CylinderGeometry(0.16, 0.22, len, 12), legMat);
    leg.position.copy(mid);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(foot).normalize());
    g.add(leg);
    const piston = mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.2, 12), accMat);
    piston.position.copy(top.clone().lerp(foot, 0.3));
    piston.quaternion.copy(leg.quaternion);
    g.add(piston);
    g.add(mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.25, 20), legMat, { x: foot.x, y: 0.12, z: foot.z }));
    g.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), glow(0xff5fa2, 2), { x: piston.position.x, y: piston.position.y + 0.7, z: piston.position.z, shadow: false }));
    legFeet.push(foot);
  }

  const deco = new THREE.Group();
  g.add(deco);
  const aframe = new THREE.Group();
  const menuMat = new THREE.MeshStandardMaterial({ map: menuTexture(menu), roughness: 0.9 });
  for (const s of [-1, 1]) {
    const board2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.05), [std(0xc69a5b), std(0xc69a5b), std(0xc69a5b), std(0xc69a5b), menuMat, menuMat]);
    board2.position.set(0, 0.65, s * 0.2);
    board2.rotation.x = s * 0.18;
    board2.castShadow = true;
    aframe.add(board2);
  }
  aframe.position.set(3.0, 0, 3.4);
  aframe.rotation.y = -0.5;
  deco.add(aframe);

  const cart = cartModel();
  cart.position.set(-3.2, 0, 3.0);
  cart.rotation.y = 0.6;
  deco.add(cart);

  const crate = new THREE.Group();
  const wood = std(0xd19a5b, { roughness: 0.9 });
  for (let i = 0; i < 4; i++) {
    crate.add(mesh(new THREE.BoxGeometry(1.2, 0.12, 0.05), wood, { y: 0.12 + i * 0.16, z: 0.5 }));
    crate.add(mesh(new THREE.BoxGeometry(1.2, 0.12, 0.05), wood, { y: 0.12 + i * 0.16, z: -0.5 }));
    crate.add(mesh(new THREE.BoxGeometry(0.05, 0.12, 1.0), wood, { x: 0.6, y: 0.12 + i * 0.16 }));
    crate.add(mesh(new THREE.BoxGeometry(0.05, 0.12, 1.0), wood, { x: -0.6, y: 0.12 + i * 0.16 }));
  }
  crate.add(mesh(new THREE.BoxGeometry(1.2, 0.05, 1.0), wood, { y: 0.05 }));
  for (let i = 0; i < 7; i++) {
    const rock = createRock(displayRocks[i % displayRocks.length], 0.22, i + 20);
    rock.position.set(-0.35 + (i % 3) * 0.35, 0.68 + Math.floor(i / 3) * 0.12, -0.25 + (i % 2) * 0.4);
    crate.add(rock);
  }
  crate.position.set(4.2, 0, 1.2);
  crate.rotation.y = 0.3;
  deco.add(crate);

  const neon = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 0.7),
    new THREE.MeshBasicMaterial({
      map: canvasTexture(256, 80, (ctx) => {
        roundRect(ctx, 4, 4, 248, 72, 30);
        ctx.fillStyle = '#ff4fa0';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 46px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ÖPPET!', 128, 42);
      }),
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );
  neon.position.set(0, UFO_HEIGHT - 1.9, 2.0);
  g.add(neon);

  return { group: g, saucer, lights, sign, beam, beamMat, hatch, legFeet };
}
