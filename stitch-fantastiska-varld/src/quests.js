import * as THREE from 'three';

const QUESTS = [
  { id: 'fountain', text: 'Gå till fontänen i mitten', icon: '⛲', event: 'reachFountain', goal: 1, reward: 1, target: () => new THREE.Vector3(0, 0, 0) },
  { id: 'rocket1', text: 'Gå fram till en raket och slå 👊 på den', icon: '🚀', event: 'rocketLaunched', goal: 1, reward: 2, target: (g) => nearestRocket(g) },
  { id: 'stars3', text: 'Samla 3 gyllene stjärnor', icon: '⭐', event: 'starCollected', goal: 3, reward: 2, target: (g) => nearestStar(g) },
  { id: 'plupp1', text: 'Fånga en Plupp – spring ikapp den!', icon: '🐰', event: 'caughtPlupp', goal: 1, reward: 2, target: (g) => g.creatures.nearestPlupp(g.player.pos)?.root.position },
  { id: 'shop', text: 'Åk in i en butik – ställ dig i ljusstrålen', icon: '🛸', event: 'enteredShop', goal: 1, reward: 1, target: (g) => nearestShop(g) },
  { id: 'buy', text: 'Lägg en sten i korgen och betala i kassan', icon: '🧺', event: 'bought', goal: 1, reward: 2, target: (g) => (g.location === 'shop' ? (g.cart.length ? g.shop.kassaPos : null) : nearestShop(g)) },
  { id: 'eat', text: 'Ät en sten – tryck på 😋 Ät', icon: '😋', event: 'ate', goal: 1, reward: 2, target: () => null },
  { id: 'feed1', text: 'Ge mat till en hungrig rymdvän', icon: '🍽️', event: 'gaveFood', goal: 1, reward: 3, target: (g) => g.creatures.wishingFriend(g.player.pos)?.group.position },
  { id: 'bounce', text: 'Studsa 5 gånger på studsmattan', icon: '🎪', event: 'bounce', goal: 5, reward: 3, target: (g) => g.outdoor.trampoline.pos },
  { id: 'hug', text: 'Gå in i Lilos hus och krama Scrump', icon: '🧸', event: 'hug', goal: 1, reward: 2, target: (g) => (g.location === 'house' ? g.house.scrumpPos : g.outdoor.rockets[0].doorPos) },
  { id: 'fridge', text: 'Ät ett mellanmål i ett hus (kylen eller bordet)', icon: '🧊', event: 'ateInHouse', goal: 1, reward: 2, target: (g) => (g.location === 'house' ? g.house.fridgePos : nearestRocket(g)) },
  { id: 'plupp3', text: 'Ha 3 Pluppar som följer efter dig', icon: '🐰', event: 'followers', goal: 3, reward: 4, absolute: true, target: (g) => g.creatures.nearestPlupp(g.player.pos)?.root.position },
  { id: 'allRockets', text: 'Skjut upp alla 5 raketerna', icon: '🚀', event: 'rocketDistinct', goal: 5, reward: 5, target: (g) => nearestRocket(g) },
  { id: 'feed3', text: 'Mata 3 rymdvänner', icon: '🍽️', event: 'gaveFood', goal: 3, reward: 6, target: (g) => g.creatures.wishingFriend(g.player.pos)?.group.position },
  { id: 'race', text: 'Rymdloppet! Skjut upp 3 raketer på 40 sekunder', icon: '⏱️', event: 'rocketLaunched', goal: 3, reward: 8, timed: 40, target: (g) => nearestRocket(g) },
  { id: 'rainbow', text: 'Köp och ät en Regnbågssten', icon: '🌈', event: 'ate:regnbage', goal: 1, reward: 5, target: (g) => (g.location === 'outside' ? nearestShop(g) : null) },
  { id: 'music', text: 'Spela musik i ett hus och dansa', icon: '🎵', event: 'music', goal: 1, reward: 2, target: (g) => (g.location === 'outside' ? nearestRocket(g) : null) },
  { id: 'plupp5', text: 'Ha 5 Pluppar i ett långt Plupp-tåg', icon: '🐰', event: 'followers', goal: 5, reward: 8, absolute: true, target: (g) => g.creatures.nearestPlupp(g.player.pos)?.root.position },
];

const ENDLESS = [
  (n) => ({ text: `Samla ${n + 3} stjärnor`, icon: '⭐', event: 'starCollected', goal: n + 3, reward: n + 2, target: (g) => nearestStar(g) }),
  (n) => ({ text: `Skjut upp ${n + 2} raketer`, icon: '🚀', event: 'rocketLaunched', goal: n + 2, reward: n + 3, target: (g) => nearestRocket(g) }),
  (n) => ({ text: `Mata ${Math.min(4, n + 1)} rymdvänner`, icon: '🍽️', event: 'gaveFood', goal: Math.min(4, n + 1), reward: 3 * Math.min(4, n + 1) + 2, target: (g) => g.creatures.wishingFriend(g.player.pos)?.group.position }),
  (n) => ({ text: `Fånga ${Math.min(6, n + 2)} Pluppar`, icon: '🐰', event: 'caughtPlupp', goal: Math.min(6, n + 2), reward: n + 4, target: (g) => g.creatures.nearestPlupp(g.player.pos)?.root.position }),
  (n) => ({ text: `Studsa ${n + 5} gånger på studsmattan`, icon: '🎪', event: 'bounce', goal: n + 5, reward: n + 3, target: (g) => g.outdoor.trampoline.pos }),
  (n) => ({ text: `Ät ${Math.min(5, n + 2)} stenar`, icon: '😋', event: 'ate', goal: Math.min(5, n + 2), reward: n + 4, target: () => null }),
  (n) => ({ text: `Rymdloppet: ${Math.min(5, n + 3)} raketer på ${30 + n * 5} sekunder`, icon: '⏱️', event: 'rocketLaunched', goal: Math.min(5, n + 3), reward: 2 * n + 8, timed: 30 + n * 5, target: (g) => nearestRocket(g) }),
];

function nearestRocket(g) {
  if (g.location !== 'outside') return null;
  let best = null, bd = Infinity;
  for (const r of g.outdoor.rockets) {
    if (!r.home) continue;
    const d = r.doorPos.distanceTo(g.player.pos);
    if (d < bd) { bd = d; best = r.doorPos; }
  }
  return best;
}

function nearestShop(g) {
  if (g.location !== 'outside') return null;
  let best = null, bd = Infinity;
  for (const s of g.outdoor.shops) {
    const d = s.pos.distanceTo(g.player.pos);
    if (d < bd) { bd = d; best = s.pos; }
  }
  return best;
}

function nearestStar(g) {
  if (g.location !== 'outside') return null;
  let best = null, bd = Infinity;
  for (const s of g.starField.stars) {
    if (!s.active) continue;
    const d = s.g.position.distanceTo(g.player.pos);
    if (d < bd) { bd = d; best = s.g.position; }
  }
  return best;
}

export class Quests {
  constructor(game, saved = {}) {
    this.game = game;
    this.index = saved.index ?? 0;
    this.endlessN = saved.endlessN ?? 0;
    this.completed = saved.completed ?? 0;
    this.progress = 0;
    this.timer = 0;
    this.launched = new Set();
    this.current = null;
    this.load();

    const mat = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffb000, emissiveIntensity: 1.2, roughness: 0.3 });
    const shape = new THREE.Shape();
    shape.moveTo(-0.25, -0.6);
    shape.lineTo(0.25, -0.6);
    shape.lineTo(0.25, 0.1);
    shape.lineTo(0.6, 0.1);
    shape.lineTo(0, 0.85);
    shape.lineTo(-0.6, 0.1);
    shape.lineTo(-0.25, 0.1);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 });
    geo.rotateX(Math.PI / 2);
    this.arrow = new THREE.Mesh(geo, mat);
    this.arrow.visible = false;
    game.scene.add(this.arrow);

    this.beacon = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.9, 14, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    beam.position.y = 7;
    this.beacon.add(beam);
    this.marker = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 16), mat);
    this.marker.rotation.x = Math.PI;
    this.beacon.add(this.marker);
    this.beacon.visible = false;
    game.scene.add(this.beacon);
  }

  load() {
    const def = this.index < QUESTS.length ? QUESTS[this.index] : ENDLESS[this.endlessN % ENDLESS.length](Math.floor(this.endlessN / ENDLESS.length) + 1);
    this.current = def;
    this.progress = 0;
    this.timer = 0;
    this.launched = new Set();
    this.refreshUI();
  }

  save() {
    return { index: this.index, endlessN: this.endlessN, completed: this.completed };
  }

  refreshUI() {
    const q = this.current;
    this.game.ui.setQuest({
      number: this.completed + 1,
      icon: q.icon,
      text: q.text,
      progress: this.progress,
      goal: q.goal,
      timeLeft: q.timed && this.timer > 0 ? Math.ceil(this.timer) : q.timed ? q.timed : null,
      timerRunning: q.timed && this.timer > 0,
    });
  }

  onEvent(type, data = {}) {
    const q = this.current;
    if (!q || this.celebrating) return;
    if (type === 'rocketLaunched' && q.event === 'rocketDistinct') {
      this.launched.add(data.rocket);
      this.progress = this.launched.size;
    } else if (q.absolute && q.event === type) {
      this.progress = data.count;
    } else if (q.event === type || (type === 'ate' && q.event === `ate:${data.id}`)) {
      if (q.timed && this.timer <= 0) this.timer = q.timed;
      this.progress++;
    } else return;
    if (this.progress >= q.goal) this.complete();
    else this.refreshUI();
  }

  complete() {
    const q = this.current;
    const g = this.game;
    this.celebrating = true;
    this.progress = q.goal;
    this.refreshUI();
    g.addStars(q.reward);
    g.audio.fanfare();
    g.ui.celebrate(q.icon, q.text, q.reward);
    for (let i = 0; i < 4; i++) {
      setTimeout(() => g.particles.sparkle(g.player.group.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random(), (Math.random() - 0.5) * 3)), [0xff5fa2, 0xffd166, 0x5ff2ff, 0x9dff7a], 40, 5), i * 200);
    }
    this.completed++;
    if (this.index < QUESTS.length) this.index++;
    else this.endlessN++;
    setTimeout(() => {
      this.celebrating = false;
      this.load();
      g.saveGame();
      const q2 = this.current;
      if (q2.absolute && q2.event === 'followers') this.onEvent('followers', { count: g.creatures.followers.length });
    }, 2800);
  }

  update(dt) {
    const q = this.current;
    const g = this.game;
    if (q.timed && this.timer > 0 && !this.celebrating) {
      const before = Math.ceil(this.timer);
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = 0;
        this.progress = 0;
        g.audio.sad();
        g.ui.toast('Tiden tog slut! Försök igen ⏱️', 3000);
        this.refreshUI();
      } else if (Math.ceil(this.timer) !== before) this.refreshUI();
    }
    if (q.event === 'reachFountain' && g.location === 'outside' && Math.hypot(g.player.pos.x, g.player.pos.z) < 6.5) this.onEvent('reachFountain');

    const target = !this.celebrating && q.target ? q.target(g) : null;
    const p = g.player.group.position;
    const t = performance.now() / 1000;
    if (target && !g.busy) {
      const dist = Math.hypot(target.x - p.x, target.z - p.z);
      this.beacon.visible = true;
      this.beacon.position.set(target.x, target.y || 0, target.z);
      this.marker.position.y = 3.6 + Math.abs(Math.sin(t * 3)) * 0.8;
      this.marker.rotation.y = t * 2;
      this.arrow.visible = dist > 3.5;
      if (this.arrow.visible) {
        const yaw = Math.atan2(target.x - p.x, target.z - p.z);
        const pulse = 2.0 + Math.sin(t * 6) * 0.25;
        this.arrow.position.set(p.x + Math.sin(yaw) * pulse, p.y + 0.3, p.z + Math.cos(yaw) * pulse);
        this.arrow.rotation.y = yaw;
      }
    } else {
      this.arrow.visible = false;
      this.beacon.visible = false;
    }
  }
}

