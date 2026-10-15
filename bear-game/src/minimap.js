import { N, PITCH, ROAD, HALF, roadLines } from './world.js';

const E = HALF + 20;
const RES = 768;
const PPM = RES / (2 * E);
const COLORS = { Skyskrapa: '#4f74a8', Hyreshus: '#d9875a', Villa: '#e9b949', Fontän: '#6ec3ff', Ostbutik: '#ffd23f' };

export class Minimap {
  constructor(city, canvas) {
    this.city = city;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.big = false;
    this.bg = document.createElement('canvas');
    this.bg.width = this.bg.height = RES;
    this.drawBackground();
    this.resize();
  }

  toggle() { this.big = !this.big; this.resize(); }

  resize() {
    this.size = this.big ? Math.min(420, window.innerHeight - 140) : 190;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.canvas.width = this.size * dpr;
    this.canvas.height = this.size * dpr;
    this.canvas.style.width = this.canvas.style.height = `${this.size}px`;
  }

  drawBackground() {
    const g = this.bg.getContext('2d');
    const P = (v) => (v + E) * PPM;
    g.fillStyle = '#5fb83f'; g.fillRect(0, 0, RES, RES);
    const B = PITCH - ROAD;
    for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) {
      const kind = this.city.blockKind(i, j);
      g.fillStyle = kind === 'park' ? '#3f9a3a' : kind === 'plaza' ? '#efe3c4' : kind === 'downtown' ? '#b8b4ac' : '#c4c1ba';
      g.fillRect(P(i * PITCH - B / 2), P(j * PITCH - B / 2), B * PPM, B * PPM);
      if (kind === 'villas' || kind === 'apartments') { g.fillStyle = '#6cc64a'; g.fillRect(P(i * PITCH - B / 2 + 3), P(j * PITCH - B / 2 + 3), (B - 6) * PPM, (B - 6) * PPM); }
    }
    g.fillStyle = '#3d4046';
    for (const r of roadLines) {
      g.fillRect(P(-HALF - ROAD / 2), P(r - ROAD / 2), (2 * HALF + ROAD) * PPM, ROAD * PPM);
      g.fillRect(P(r - ROAD / 2), P(-HALF - ROAD / 2), ROAD * PPM, (2 * HALF + ROAD) * PPM);
    }
    for (const b of this.city.buildings) {
      g.fillStyle = COLORS[b.name] || '#999';
      g.fillRect(P(b.min.x), P(b.min.z), (b.max.x - b.min.x) * PPM, (b.max.z - b.min.z) * PPM);
    }
    g.fillStyle = '#4fa8e0';
    g.beginPath(); g.arc(P(PITCH * 2 + 8), P(-PITCH * 2 - 6), 9 * PPM, 0, Math.PI * 2); g.fill();
  }

  draw(player, camYaw, playerYaw, who, lambo) {
    const { ctx, size, dpr } = this;
    const radius = this.big ? E : 130;
    const s = (size / 2) / radius;
    const cx = size / 2, cy = size / 2;
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
    const rx = -fz, rz = fx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, size / 2 - 3, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#4c9a33'; ctx.fillRect(0, 0, size, size);
    const ox = -E - player.x, oz = -E - player.z;
    ctx.setTransform(
      dpr * s * rx / PPM, dpr * -s * fx / PPM,
      dpr * s * rz / PPM, dpr * -s * fz / PPM,
      dpr * (cx + s * (rx * ox + rz * oz)), dpr * (cy - s * (fx * ox + fz * oz)),
    );
    ctx.drawImage(this.bg, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const toScreen = (x, z) => {
      const dx = x - player.x, dz = z - player.z;
      return [cx + s * (dx * rx + dz * rz), cy - s * (dx * fx + dz * fz)];
    };
    const icon = (x, z, emoji, label, clampEdge = false) => {
      let [sx, sy] = toScreen(x, z);
      const ddx = sx - cx, ddy = sy - cy, d = Math.hypot(ddx, ddy), max = size / 2 - 14;
      if (d > max) { if (!clampEdge) return; sx = cx + ddx / d * max; sy = cy + ddy / d * max; }
      ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(emoji, sx, sy);
      if (label) {
        ctx.font = 'bold 11px Nunito, sans-serif';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.fillStyle = '#fff';
        ctx.strokeText(label, sx, sy + 15); ctx.fillText(label, sx, sy + 15);
      }
    };
    const t = this.city.statueTop, shop = this.city.shopCenter;
    icon(t.x, t.z, '⭐', 'TORGET', true);
    icon(shop.x, shop.z, '🧀', who === 'rat' ? 'OSTBUTIK' : '', who === 'rat');
    icon(PITCH * 2, -PITCH * 2, '🌳', 'PARK');
    icon(-PITCH * 2, PITCH * 2, '🌳', 'PARK');
    if (lambo) icon(lambo.x, lambo.z, '💰', '', true);
    const px = Math.sin(playerYaw), pz = Math.cos(playerYaw);
    const ang = Math.atan2(px * rx + pz * rz, px * fx + pz * fz);
    ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.fillStyle = who === 'rat' ? '#ff9ab0' : '#ff6b3d';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7, 7); ctx.lineTo(0, 3); ctx.lineTo(-7, 7); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,210,63,.9)';
    ctx.beginPath(); ctx.arc(cx, cy, size / 2 - 3, 0, Math.PI * 2); ctx.stroke();
    ctx.font = 'bold 12px Nunito, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText('▲', cx, 12);
  }
}
