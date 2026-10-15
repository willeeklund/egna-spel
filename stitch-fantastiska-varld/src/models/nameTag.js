import * as THREE from 'three';
import { roundRect } from '../core/util.js';

export function createNameTag(name, color = '#3f7fe0') {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 72;
  const ctx = c.getContext('2d');
  ctx.font = 'bold 40px Fredoka, sans-serif';
  const w = Math.min(244, ctx.measureText(name).width + 44);
  roundRect(ctx, (256 - w) / 2, 6, w, 60, 30);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = '#3b2a6b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 128, 38);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, toneMapped: false }));
  sprite.scale.set(1.6, 0.45, 1);
  sprite.position.y = 2.25;
  sprite.renderOrder = 5;
  return sprite;
}
