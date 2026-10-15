import * as THREE from 'three';
import { starShape } from '../core/util.js';

export class StarField {
  constructor(game, outdoor, count = 14) {
    this.game = game;
    this.outdoor = outdoor;
    const geo = new THREE.ExtrudeGeometry(starShape(0.45, 0.2), { depth: 0.14, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
    geo.center();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffb000, emissiveIntensity: 0.7, metalness: 0.6, roughness: 0.25 });
    const haloTex = new THREE.CanvasTexture((() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,240,170,0.9)');
      g.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      return c;
    })());
    this.stars = [];
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      g.add(m);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.scale.setScalar(1.8);
      g.add(halo);
      game.scene.add(g);
      const s = { g, m, active: false, timer: 0, phase: Math.random() * 6, baseY: 1 };
      this.place(s);
      this.stars.push(s);
    }
  }

  place(s) {
    const p = this.outdoor.randomFree(0.6, 11, 54, 0) || new THREE.Vector3(5, 0, 12);
    s.baseY = 1.1 + Math.random() * 1.3;
    s.g.position.set(p.x, s.baseY, p.z);
    s.g.visible = true;
    s.active = true;
  }

  update(dt, time, playerPos, outdoors) {
    for (const s of this.stars) {
      if (!s.active) {
        s.timer -= dt;
        if (s.timer <= 0) this.place(s);
        continue;
      }
      s.m.rotation.y = time * 2.5 + s.phase;
      s.g.position.y = s.baseY + Math.sin(time * 2 + s.phase) * 0.15;
      if (!outdoors) continue;
      const dx = playerPos.x - s.g.position.x;
      const dy = playerPos.y + 0.8 - s.g.position.y;
      const dz = playerPos.z - s.g.position.z;
      if (dx * dx + dz * dz < 1.4 && Math.abs(dy) < 1.3) {
        s.active = false;
        s.g.visible = false;
        s.timer = 15 + Math.random() * 10;
        this.game.particles.sparkle(s.g.position, [0xfff27a, 0xffd34d, 0xffffff], 30, 4);
        this.game.audio.coin();
        this.game.addStars(1);
        this.game.emit('starCollected');
      }
    }
  }
}
