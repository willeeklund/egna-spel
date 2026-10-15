import * as THREE from 'three';
import { std, metal, mesh, canvasTexture, rng } from '../core/util.js';

export function spaceViewTexture(seed = 1) {
  const r = rng(seed);
  return canvasTexture(256, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#7f9cff');
    g.addColorStop(0.6, '#c9b8ff');
    g.addColorStop(1, '#ffd6e8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(255,255,240,${0.4 + r() * 0.6})`;
      ctx.beginPath();
      ctx.arc(r() * 256, r() * 256, r() * 1.8 + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    const px = 60 + r() * 140, py = 60 + r() * 100;
    ctx.fillStyle = ['#ffc2d9', '#bff7ea', '#ffe28a'][seed % 3];
    ctx.beginPath();
    ctx.arc(px, py, 26 + r() * 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(px, py, 60, 12, -0.3, 0, Math.PI * 2);
    ctx.stroke();
  });
}

export function createRoom(game, { center, radius, height, wallMap, floorMap, wallColor = 0xffffff, trimColor = 0xd9b38c, portholes = 6, doorAngle = 0 }) {
  const { physics } = game;
  const group = new THREE.Group();
  group.position.copy(center);
  game.scene.add(group);

  const floor = mesh(new THREE.CircleGeometry(radius + 0.2, 96), new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.6 }), { rx: -Math.PI / 2, shadow: false });
  group.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ map: wallMap, color: wallColor, roughness: 0.8, side: THREE.BackSide });
  const wall = mesh(new THREE.CylinderGeometry(radius, radius, height, 96, 1, true), wallMat, { y: height / 2, shadow: false });
  group.add(wall);

  const trimMat = std(trimColor, { roughness: 0.6, side: THREE.BackSide });
  group.add(mesh(new THREE.CylinderGeometry(radius - 0.05, radius - 0.05, 1.1, 96, 1, true), trimMat, { y: 0.55, shadow: false }));
  group.add(mesh(new THREE.TorusGeometry(radius - 0.08, 0.06, 8, 128), std(0xffffff), { y: 1.12, rx: Math.PI / 2, shadow: false }));
  group.add(mesh(new THREE.TorusGeometry(radius - 0.1, 0.15, 8, 128), std(0xffffff), { y: height - 0.1, rx: Math.PI / 2, shadow: false }));

  const ceilingMat = std(0xfff8ff, { roughness: 0.9 });
  group.add(mesh(new THREE.CircleGeometry(radius + 0.2, 96), ceilingMat, { y: height, rx: Math.PI / 2, shadow: false }));

  const chrome = metal(0xe6ecf5);
  for (let i = 0; i < portholes; i++) {
    const a = doorAngle + Math.PI / portholes + (i / portholes) * Math.PI * 2;
    const ph = new THREE.Group();
    ph.add(mesh(new THREE.TorusGeometry(0.7, 0.12, 12, 32), chrome, { shadow: false }));
    const view = new THREE.MeshBasicMaterial({ map: spaceViewTexture(i + 1) });
    ph.add(mesh(new THREE.CircleGeometry(0.66, 32), view, { z: -0.05, shadow: false }));
    for (let k = 0; k < 8; k++) {
      const ba = (k / 8) * Math.PI * 2;
      ph.add(mesh(new THREE.SphereGeometry(0.05, 6, 4), chrome, { x: Math.cos(ba) * 0.72, y: Math.sin(ba) * 0.72, z: 0.1, shadow: false }));
    }
    ph.position.set(Math.sin(a) * (radius - 0.06), height * 0.5, Math.cos(a) * (radius - 0.06));
    ph.rotation.y = a + Math.PI;
    group.add(ph);
  }

  physics.fixedBox({ x: center.x, y: -0.5, z: center.z }, { x: radius + 2, y: 0.5, z: radius + 2 });
  physics.fixedBox({ x: center.x, y: height + 0.5, z: center.z }, { x: radius + 2, y: 0.5, z: radius + 2 });
  physics.ringWall(center, radius, height, 40, 0.5);

  const door = new THREE.Group();
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-0.8, 0);
  doorShape.lineTo(0.8, 0);
  doorShape.lineTo(0.8, 2.0);
  doorShape.absarc(0, 2.0, 0.8, 0, Math.PI, false);
  doorShape.lineTo(-0.8, 0);
  door.add(mesh(new THREE.ShapeGeometry(doorShape, 24), std(0xffd6a5, { roughness: 0.6 }), { z: 0.02, shadow: false }));
  const frame = new THREE.Shape();
  frame.moveTo(-1.0, 0);
  frame.lineTo(1.0, 0);
  frame.lineTo(1.0, 2.0);
  frame.absarc(0, 2.0, 1.0, 0, Math.PI, false);
  frame.lineTo(-1.0, 0);
  frame.holes.push(doorShape);
  door.add(mesh(new THREE.ExtrudeGeometry(frame, { depth: 0.1, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03 }), chrome, { shadow: false }));
  door.add(mesh(new THREE.SphereGeometry(0.09, 12, 8), metal(0xffd166), { x: 0.5, y: 1.1, z: 0.1 }));
  door.add(mesh(new THREE.TorusGeometry(0.3, 0.05, 8, 24), chrome, { y: 2.0, z: 0.06 }));
  door.add(mesh(new THREE.CircleGeometry(0.28, 24), new THREE.MeshBasicMaterial({ map: spaceViewTexture(9) }), { y: 2.0, z: 0.04 }));
  const exitSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.4),
    new THREE.MeshBasicMaterial({
      map: canvasTexture(256, 86, (ctx) => {
        ctx.fillStyle = '#3fd67a';
        ctx.fillRect(0, 0, 256, 86);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 50px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('UT ➜', 128, 46);
      }),
      toneMapped: false,
    }),
  );
  exitSign.position.set(0, 3.2, 0.05);
  door.add(exitSign);
  door.position.set(Math.sin(doorAngle) * (radius - 0.12), 0, Math.cos(doorAngle) * (radius - 0.12));
  door.rotation.y = doorAngle + Math.PI;
  group.add(door);

  const doorWorld = new THREE.Vector3(Math.sin(doorAngle) * (radius - 1.2), 0, Math.cos(doorAngle) * (radius - 1.2)).add(center);

  return { group, wallMat, doorWorld, local: (x, y, z) => new THREE.Vector3(x, y, z).add(center) };
}
