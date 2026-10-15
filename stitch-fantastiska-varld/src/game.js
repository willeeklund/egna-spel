import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Physics } from './core/physics.js';
import { Audio } from './core/audio.js';
import { Particles } from './fx/particles.js';
import { UI } from './ui/ui.js';
import { createSky } from './world/sky.js';
import { createOutdoor, WALK_RADIUS } from './world/outdoor.js';
import { StarField } from './world/stars.js';
import { createHouseInterior } from './interiors/house.js';
import { createShopInterior } from './interiors/shop.js';
import { Player } from './player.js';
import { Creatures } from './world/creatures.js';
import { Quests } from './quests.js';
import { rockType } from './models/rockFood.js';
import { lerpAngle } from './core/util.js';

const CAM_PRESETS = [
  { dist: 8.5, height: 3.6 },
  { dist: 13, height: 6.5 },
  { dist: 5.2, height: 2.2 },
];
const MAX_BACKPACK = 12;
const MAX_CART = 6;
const SAVE_KEY = 'stitch-fantastiska-varld-v1';

export class Game {
  constructor(RAPIER, container, uiRoot) {
    this.started = false;
    this.location = 'outside';
    this.building = null;
    this.busy = false;
    this.stars = 5;
    this.backpack = [];
    this.cart = [];
    this.camPreset = 0;
    this.time = 0;
    this.beam = null;
    this.flying = [];

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.3;
    scene.fog = new THREE.Fog(0xeadcff, 110, 360);

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2500);
    this.camera.position.set(0, 8, 30);

    this.hemi = new THREE.HemisphereLight(0xeae6ff, 0xffd9ec, 0.85);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1e0, 2.1);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -38;
    sc.right = sc.top = 38;
    sc.near = 1;
    sc.far = 160;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    scene.add(this.sun, this.sun.target);
    this.sunOffset = new THREE.Vector3(35, 60, 22);

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.5, 1.0);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.physics = new Physics(RAPIER);
    this.audio = new Audio();
    this.particles = new Particles(scene);
    this.ui = new UI(uiRoot);

    this.sky = createSky(scene);
    this.outdoor = createOutdoor(this);
    this.starField = new StarField(this, this.outdoor);
    this.house = createHouseInterior(this);
    this.shop = createShopInterior(this);
    this.player = new Player(this);
    this.player.teleport(new THREE.Vector3(0, 0, 15), Math.PI);
    this.creatures = new Creatures(this, this.outdoor);
    const saved = this.loadGame();
    if (saved) {
      this.stars = saved.stars ?? this.stars;
      this.backpack = saved.backpack ?? [];
    }
    this.quests = new Quests(this, saved?.quests);

    scene.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || !o.castShadow) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      const s = o.getWorldScale(new THREE.Vector3());
      if (o.geometry.boundingSphere.radius * Math.max(s.x, s.y, s.z) < 0.3) o.castShadow = false;
    });

    this.interactables = [...this.house.interactables, ...this.shop.interactables, ...this.creatures.interactables()];
    for (const r of this.outdoor.rockets) {
      this.interactables.push({
        location: 'outside',
        pos: r.doorPos,
        radius: 2.4,
        icon: '🚪',
        label: () => `Gå in i ${r.cfg.name}s hus`,
        enabled: () => r.home,
        action: () => this.enterHouse(r),
      });
    }
    for (const s of this.outdoor.shops) {
      this.interactables.push({
        location: 'outside',
        pos: s.pos.clone(),
        radius: 2.3,
        icon: '🛸',
        label: () => `Åk in i ${s.cfg.name.charAt(0) + s.cfg.name.slice(1).toLowerCase()}`,
        action: () => this.enterShop(s),
      });
    }

    this.ui.onSound = () => {
      this.audio.setMuted(!this.audio.muted);
      this.ui.setSound(!this.audio.muted);
    };
    this.ui.onCam = () => {
      this.camPreset = (this.camPreset + 1) % CAM_PRESETS.length;
      this.ui.toast(['🎥 Vanlig kamera', '🎥 Långt bort', '🎥 Nära Stitch'][this.camPreset], 1200);
    };

    this.ui.onReset = () => {
      try { localStorage.removeItem(SAVE_KEY); } catch {}
      this.noSave = true;
      location.reload();
    };

    this.ui.setStars(this.stars);
    this.ui.setBackpack(this.backpack);
    this.applyLocation();
    this.snapCamera();

    window.addEventListener('resize', () => this.resize());
    this.clock = new THREE.Clock();
    this.lastContextLabel = '';
  }

  start() {
    this.started = true;
    this.audio.init();
    this.ui.setLocation('Stitch fantastiska värld');
    setTimeout(() => {
      this.player.stitch.wave(2);
      this.ui.say(() => this.headPos(), 'Aloha! Jag är Stitch! 👋', 3000);
    }, 900);
    setTimeout(() => this.ui.toast('Följ den gula pilen 💛 och klara uppdragen högst upp!', 4500), 4200);
    setInterval(() => this.saveGame(), 5000);
    window.addEventListener('beforeunload', () => this.saveGame());
  }

  emit(type, data) {
    this.quests?.onEvent(type, data);
  }

  loadGame() {
    try {
      return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    } catch {
      return null;
    }
  }

  saveGame() {
    if (this.noSave || !this.started) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ stars: this.stars, backpack: this.backpack, quests: this.quests.save() }));
    } catch {}
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  headPos() {
    return this.player.group.position.clone().add(new THREE.Vector3(0, 2.1, 0));
  }

  addStars(n) {
    this.stars += n;
    this.ui.setStars(this.stars);
  }

  walkLimit() {
    if (this.location === 'house') return { center: this.house.center, radius: this.house.radius - 0.7 };
    if (this.location === 'shop') return { center: this.shop.center, radius: this.shop.radius - 0.7 };
    return { center: new THREE.Vector3(), radius: WALK_RADIUS };
  }

  trampolineCheck(pos, grounded) {
    if (this.location !== 'outside' || !grounded) return false;
    const t = this.outdoor.trampoline;
    if (Math.hypot(pos.x - t.pos.x, pos.z - t.pos.z) < t.radius && pos.y > t.top - 0.25) {
      this.audio.boing();
      this.particles.sparkle(pos.clone().setY(pos.y + 0.3), [0xff5fa2, 0xffd166, 0x5ff2ff], 25, 3);
      if (Math.random() < 0.4) this.ui.say(() => this.headPos(), ['Wiiii!', 'Högre!', 'Boing!'][Math.floor(Math.random() * 3)], 900);
      this.emit('bounce');
      return true;
    }
    return false;
  }

  applyLocation() {
    const loc = this.location;
    const out = loc === 'outside';
    this.outdoor.root.visible = out;
    for (const r of this.outdoor.rockets) r.group.visible = out;
    for (const s of this.starField.stars) s.g.parent && (s.g.visible = out && s.active);
    this.creatures.setVisible(out);
    if (!out) this.creatures.releaseFollowers();
    this.house.group.visible = loc === 'house';
    this.shop.group.visible = loc === 'shop';
    this.house.setLights(loc === 'house');
    this.shop.setLights(loc === 'shop');
    this.sun.intensity = out ? 2.1 : 0;
    this.hemi.intensity = out ? 0.85 : 0.45;
    this.scene.fog.near = out ? 110 : 1000;
    this.scene.fog.far = out ? 360 : 2000;
    this.ui.setCart(this.cart, loc === 'shop');
  }

  snapCamera() {
    const p = CAM_PRESETS[this.camPreset];
    const f = this.player.forward();
    const target = this.player.pos.clone().add(new THREE.Vector3(0, 1.4, 0));
    this.camera.position.copy(target).addScaledVector(f, -p.dist).add(new THREE.Vector3(0, p.height, 0));
    this.clampCamera(this.camera.position);
    this.camera.lookAt(target);
    this.camYaw = this.player.heading;
  }

  clampCamera(pos) {
    const lim = this.location === 'house' ? this.house : this.location === 'shop' ? this.shop : null;
    if (!lim) {
      pos.y = Math.max(pos.y, 0.6);
      return;
    }
    const dx = pos.x - lim.center.x, dz = pos.z - lim.center.z;
    const d = Math.hypot(dx, dz);
    const max = lim.radius - 0.6;
    if (d > max) {
      pos.x = lim.center.x + (dx / d) * max;
      pos.z = lim.center.z + (dz / d) * max;
    }
    pos.y = THREE.MathUtils.clamp(pos.y, 0.8, (lim === this.house ? 7 : 6) - 0.5);
  }

  updateCamera(dt) {
    const p = CAM_PRESETS[this.camPreset];
    const indoor = this.location !== 'outside';
    const dist = indoor ? Math.min(p.dist, 5.5) : p.dist;
    const height = indoor ? Math.min(p.height, 3.2) : p.height;
    this.camYaw = lerpAngle(this.camYaw ?? this.player.heading, this.player.heading, Math.min(1, dt * 3));
    const f = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    const target = this.player.pos.clone().add(new THREE.Vector3(0, 1.4, 0));
    if (this.beam) target.y = this.beam.base.y + 1.4;
    const desired = target.clone().addScaledVector(f, -dist).add(new THREE.Vector3(0, height, 0));
    this.clampCamera(desired);
    this.camera.position.lerp(desired, Math.min(1, dt * 6));
    if (this.shake > 0) {
      this.shake -= dt;
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.4;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.4;
    }
    const look = target.clone().addScaledVector(f, 2.0);
    this.camera.lookAt(look);
  }

  nearestInteractable() {
    let best = null, bestD = Infinity;
    const p = this.player.pos;
    for (const it of this.interactables) {
      if (it.location !== this.location) continue;
      if (it.enabled && !it.enabled()) continue;
      const d = Math.hypot(p.x - it.pos.x, p.z - it.pos.z);
      if (d < it.radius && d < bestD) {
        best = it;
        bestD = d;
      }
    }
    return best;
  }

  punch() {
    this.player.stitch.punch();
    this.audio.punch();
    const p = this.player.pos;
    const f = this.player.forward();
    if (this.location === 'outside') {
      let best = null, bestD = Infinity;
      for (const r of this.outdoor.rockets) {
        const d = Math.hypot(p.x - r.basePos.x, p.z - r.basePos.z);
        if (d < 7.6 && d < bestD) {
          best = r;
          bestD = d;
        }
      }
      if (best) {
        if (best.hit()) {
          this.ui.say(() => this.headPos(), 'Hej då raket! 🚀', 1600);
          this.particles.sparkle(p.clone().addScaledVector(f, 1).setY(p.y + 1.2), [0xffffff, 0xffd166], 15, 3);
          this.shake = 0.5;
        } else {
          this.ui.toast('Den raketen är redan på väg! 🚀', 1500);
        }
        return;
      }
      for (const k of this.outdoor.kickables) {
        const t = k.body.translation();
        const dx = t.x - p.x, dz = t.z - p.z;
        const d = Math.hypot(dx, dz);
        if (d < 2.4) {
          const mass = k.body.mass();
          const dir = new THREE.Vector3(dx, 0, dz).normalize().lerp(f, 0.5).normalize();
          k.body.applyImpulse({ x: dir.x * 9 * mass, y: 6 * mass, z: dir.z * 9 * mass }, true);
          k.body.applyTorqueImpulse({ x: (Math.random() - 0.5) * mass, y: (Math.random() - 0.5) * mass, z: (Math.random() - 0.5) * mass }, true);
          this.audio.whack();
          this.particles.sparkle(new THREE.Vector3(t.x, t.y, t.z), [0xffffff, 0xffd166], 12, 2);
        }
      }
    }
  }

  onRocketLaunched(rocket) {
    this.addStars(1);
    this.ui.toast(`Wiii! ${rocket.cfg.name}s raket flyger! +1 ⭐`);
    this.shake = 1.2;
    this.emit('rocketLaunched', { rocket: rocket.cfg.name });
  }

  enterHouse(rocket) {
    if (this.busy) return;
    this.busy = true;
    this.audio.door();
    this.ui.fade(() => {
      this.location = 'house';
      this.building = rocket;
      this.house.setTheme(rocket);
      this.player.teleport(this.house.spawn, this.house.spawnHeading);
      this.applyLocation();
      this.snapCamera();
    }).then(() => {
      this.busy = false;
      this.ui.setLocation(`${rocket.cfg.name}s hus`);
      this.emit('enteredHouse');
      setTimeout(() => this.ui.toast('Tips: Gå till kylen 🧊 eller bordet 🍽️ för att äta något!', 3500), 1500);
    });
  }

  enterShop(shop) {
    if (this.busy) return;
    this.busy = true;
    this.player.frozen = true;
    this.audio.whoosh();
    this.beam = { t: 0, base: this.player.pos.clone(), shop };
  }

  updateBeam(dt) {
    const b = this.beam;
    b.t += dt;
    const g = this.player.group;
    const center = b.shop.pos;
    g.position.x += (center.x - g.position.x) * Math.min(1, dt * 4);
    g.position.z += (center.z - g.position.z) * Math.min(1, dt * 4);
    g.position.y = b.base.y + b.t * b.t * 2.2;
    g.rotation.y += dt * 6;
    this.player.stitch.update(dt, { speed: 0, grounded: false, vy: 3 });
    this.particles.glow.emit({ pos: g.position.clone().setY(g.position.y + 0.8), count: 2, color: b.shop.cfg.beamColor, size: 0.3, sizeEnd: 0.05, life: 0.8, velRandom: 1.2 });
    if (b.t > 1.1 && !b.fading) {
      b.fading = true;
      this.ui.fade(() => {
        this.beam = null;
        this.location = 'shop';
        this.building = b.shop;
        this.shop.setTheme(b.shop);
        this.player.frozen = false;
        this.player.teleport(this.shop.spawn, this.shop.spawnHeading);
        this.applyLocation();
        this.snapCamera();
      }).then(() => {
        this.busy = false;
        this.ui.setLocation(b.shop.cfg.name);
        this.emit('enteredShop');
        setTimeout(() => this.ui.say(() => this.shop.cashierHead(), 'Aloha! Välkommen! 🌺', 2500), 300);
        this.shop.cashier.wave(2);
      });
    }
  }

  exitBuilding() {
    if (this.busy) return;
    if (this.location === 'shop' && this.cart.length) {
      this.cart = [];
      this.ui.setCart(this.cart, true);
      this.player.setBasket([]);
      this.shop.restock();
      this.ui.toast('Du glömde betala! Stenarna ställdes tillbaka på hyllan.');
    }
    this.busy = true;
    this.audio.door();
    const b = this.building;
    const wasShop = this.location === 'shop';
    if (this.location === 'house' && this.audio.musicPlaying) this.audio.stopMusic();
    this.ui.fade(() => {
      this.location = 'outside';
      if (wasShop) {
        const toCenter = b.pos.clone().negate().normalize();
        this.player.teleport(b.pos.clone().addScaledVector(toCenter, 3.4), Math.atan2(toCenter.x, toCenter.z));
      } else {
        this.player.teleport(b.doorPos.clone().add(new THREE.Vector3(Math.sin(b.facing), 0, Math.cos(b.facing)).multiplyScalar(0.8)), b.facing);
      }
      this.building = null;
      this.applyLocation();
      this.snapCamera();
    }).then(() => (this.busy = false));
  }

  cartTotal() {
    return this.cart.reduce((s, id) => s + rockType(id).price, 0);
  }

  addToCart(id, source) {
    const t = rockType(id);
    if (this.cart.length >= MAX_CART) {
      this.audio.sad();
      return this.ui.toast('Korgen är full! Gå till kassan 💳');
    }
    const rock = this.shop.takeRock(source);
    if (!rock) {
      this.audio.sad();
      return this.ui.toast(`Hyllan med ${t.name} är tom! Kom tillbaka senare.`);
    }
    this.cart.push(id);
    this.audio.pop();
    const start = rock.getWorldPosition(new THREE.Vector3());
    const fly = rock.clone();
    fly.position.copy(start);
    fly.quaternion.copy(rock.getWorldQuaternion(new THREE.Quaternion()));
    rock.visible = false;
    this.scene.add(fly);
    this.particles.sparkle(start, undefined, 14, 1.5);
    this.flying.push({ obj: fly, start, t: 0, done: () => {
      this.player.setBasket(this.cart);
      this.particles.sparkle(this.player.basketWorld(), [0xffd166, 0xff5fa2, 0xffffff], 12, 1.5);
      this.audio.tone(1200, 0.08, { type: 'sine', vol: 0.15 });
    } });
    this.ui.setCart(this.cart, true);
    this.ui.toast(`${t.emoji} ${t.name} i korgen! ${t.info}`, 2000);
  }

  updateFlying(dt) {
    this.flying = this.flying.filter((f) => {
      f.t += dt / 0.6;
      const k = Math.min(1, f.t);
      const end = this.player.basketWorld();
      const e = k * k * (3 - 2 * k);
      f.obj.position.lerpVectors(f.start, end, e);
      f.obj.position.y += Math.sin(k * Math.PI) * 1.2;
      f.obj.scale.setScalar(1 - k * 0.55);
      f.obj.rotation.y += dt * 10;
      if (k >= 1) {
        this.scene.remove(f.obj);
        f.done();
        return false;
      }
      return true;
    });
  }

  checkout() {
    const head = () => this.shop.cashierHead();
    this.shop.cashier.wave(1.5);
    if (!this.cart.length) {
      this.audio.yay();
      return this.ui.say(head, ['Aloha! 👋', 'Ohana betyder familj! 💙', 'Vill du ha en sten? 🪨'][Math.floor(Math.random() * 3)], 2200);
    }
    const total = this.cartTotal();
    if (this.stars < total) {
      this.audio.sad();
      this.ui.say(head, 'Oj! Du behöver fler ⭐', 2200);
      return this.ui.toast(`Du har ${this.stars} ⭐ men det kostar ${total} ⭐. Samla stjärnor ute!`, 3500);
    }
    const space = MAX_BACKPACK - this.backpack.length;
    if (space <= 0) {
      this.audio.sad();
      return this.ui.toast('Ryggsäcken är full! Ät lite stenar först 😋');
    }
    const bought = this.cart.slice(0, space);
    const cost = bought.reduce((s, id) => s + rockType(id).price, 0);
    this.stars -= cost;
    this.ui.setStars(this.stars);
    this.backpack.push(...bought);
    this.cart = [];
    this.player.setBasket([]);
    this.ui.setCart(this.cart, true);
    this.ui.setBackpack(this.backpack);
    this.audio.chaChing();
    this.particles.sparkle(head(), [0xffd166, 0xff5fa2, 0x5ff2ff], 30, 3);
    this.ui.say(head, 'Tack! Mahalo! 🌺', 2200);
    this.ui.toast(`Du köpte ${bought.length} ${bought.length === 1 ? 'sten' : 'stenar'} för ${cost} ⭐. Tryck 😋 Ät (Q) för att äta, eller ge dem till en rymdvän!`, 4000);
    this.emit('bought');
    this.saveGame();
  }

  giveRock(id, msg) {
    if (this.backpack.length >= MAX_BACKPACK) return this.ui.toast('Ryggsäcken är full!');
    this.backpack.push(id);
    this.ui.setBackpack(this.backpack);
    this.audio.coin();
    this.ui.toast(`${msg} ${rockType(id).emoji}`);
  }

  eat() {
    if (this.eating) return;
    if (!this.backpack.length) {
      this.audio.sad();
      this.ui.toast('Ryggsäcken 🎒 är tom! Köp stenar i en butik 🛸, eller ät ur kylen 🧊 i ett hus.', 3800);
      return;
    }
    const id = this.backpack.shift();
    this.ui.setBackpack(this.backpack);
    this.eatNow(id, false);
  }

  eatNow(id, inHouse) {
    if (this.eating) return;
    this.eating = true;
    this.player.showHeld(id);
    this.player.stitch.eat();
    this.audio.crunch();
    setTimeout(() => {
      this.eating = false;
      this.player.showHeld(null);
      const mouth = this.player.group.position.clone().add(new THREE.Vector3(0, 1.0, 0)).addScaledVector(this.player.forward(), 0.5);
      this.particles.hearts(this.headPos());
      const fx = {
        lava: () => {
          this.particles.glow.emit({ pos: mouth, count: 40, color: [0xffd27a, 0xff8a3d, 0xff3d00], size: 0.6, sizeEnd: 0.1, life: 0.8, vel: this.player.forward().multiplyScalar(7), velRandom: 1 });
          return 'Hett! 🔥 Mums!';
        },
        kristall: () => { this.particles.sparkle(this.headPos(), [0xc9a6ff, 0xffffff, 0x9df2ff], 40, 4); return 'Det glittrar! ✨'; },
        manost: () => 'Ostigt gott! 🧀',
        meteor: () => { this.particles.sparkle(mouth, [0xff5f6d, 0xffe066, 0x69db7c, 0x4dabf7], 25, 2); return 'Krispigt strössel! 🍪'; },
        is: () => { this.particles.glow.emit({ pos: this.headPos(), count: 30, color: [0xffffff, 0x9be7ff], size: 0.3, life: 1.5, velRandom: 2, gravity: 1 }); return 'Brrr! Kallt! 🥶'; },
        regnbage: () => { this.particles.sparkle(this.headPos(), [0xff5f6d, 0xffa94d, 0xffe066, 0x69db7c, 0x4dabf7, 0x9775fa], 60, 5); return 'Alla färger! 🌈'; },
      };
      this.ui.say(() => this.headPos(), fx[id](), 2000);
      this.audio.yay();
      this.emit('ate', { id });
      if (inHouse) this.emit('ateInHouse', { id });
    }, 1200);
  }

  sleep() {
    if (this.busy) return;
    this.busy = true;
    this.player.frozen = true;
    this.audio.snore();
    this.ui.toast('Zzz… 💤', 2000);
    this.ui.fade(() => new Promise((res) => setTimeout(res, 1600)), { dur: 900, hold: 200 }).then(() => {
      this.busy = false;
      this.player.frozen = false;
      this.player.stitch.wave(1.5);
      this.ui.say(() => this.headPos(), 'God morgon! ☀️', 2200);
      this.audio.yay();
    });
  }

  hug(doll) {
    this.audio.yay();
    this.particles.hearts(doll.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.6, 0)));
    this.particles.hearts(this.headPos());
    this.ui.say(() => this.headPos(), 'Scrump! ♥', 1800);
    if (this.building?.cfg.name === 'Lilo') this.emit('hug');
  }

  toggleMusic() {
    if (this.audio.musicPlaying) {
      this.audio.stopMusic();
      this.ui.toast('Musiken stoppad', 1200);
    } else {
      this.audio.startMusic();
      this.ui.say(() => this.headPos(), 'Dansa! 🕺', 1800);
      this.emit('music');
    }
  }

  playUkulele(uke) {
    const chords = [[0, 4, 7, 12], [5, 9, 12, 17], [7, 11, 14, 19], [0, 4, 7, 12]];
    chords.forEach((ch, ci) => ch.forEach((n, i) => this.audio.tone(261.63 * Math.pow(2, n / 12), 0.6, { type: 'triangle', vol: 0.12, delay: ci * 0.45 + i * 0.03 })));
    const p = uke.getWorldPosition(new THREE.Vector3());
    this.particles.glow.emit({ pos: p, count: 12, color: [0xff5fa2, 0xffd166, 0x5ff2ff], size: 0.4, life: 1.6, vel: { x: 0, y: 1.2, z: 0 }, velRandom: 0.8 });
    this.player.stitch.wave(1.8);
    this.ui.say(() => this.headPos(), '♪ Aloha-ha! ♪', 1800);
  }

  update() {
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.time += dt;
    const input = this.ui.input;

    if (this.started) {
      if (this.beam) {
        this.updateBeam(dt);
      } else {
        this.player.update(dt, this.busy ? {} : input);
      }
      if (!this.busy) {
        if (this.ui.consume('hit')) this.punch();
        if (this.ui.consume('eat')) this.eat();
        const item = this.nearestInteractable();
        if (this.ui.consume('use') && item) item.action();
        const label = item ? (typeof item.icon === 'function' ? item.icon() : item.icon) + item.label() : '';
        if (label !== this.lastContextLabel) {
          this.lastContextLabel = label;
          this.ui.setContext(item);
        }
      } else {
        this.ui.consume('hit');
        this.ui.consume('use');
        this.ui.consume('eat');
        if (this.lastContextLabel) {
          this.lastContextLabel = '';
          this.ui.setContext(null);
        }
      }
      this.ui.consume('jump');
    } else {
      this.player.stitch.update(dt, { speed: 0, grounded: true });
    }

    for (const r of this.outdoor.rockets) r.update(dt, this.time);
    if (this.location === 'outside') {
      this.outdoor.update(dt, this.time);
      this.creatures.update(dt, this.time, this.started && !this.busy);
    }
    if (this.started) this.quests.update(dt);
    if (this.flying.length) this.updateFlying(dt);
    this.starField.update(dt, this.time, this.player.pos, this.location === 'outside' && this.started);
    if (this.location === 'house') this.house.update(dt, this.time);
    if (this.location === 'shop') this.shop.update(dt, this.time, this.player.pos);
    this.physics.step(dt);
    this.particles.update(dt);
    this.sky.update(dt, this.time, this.camera);

    if (this.started) this.updateCamera(dt);
    else {
      const a = this.time * 0.08;
      this.camera.position.set(Math.sin(a) * 40, 16, Math.cos(a) * 40);
      this.camera.lookAt(0, 4, 0);
    }

    this.sun.target.position.copy(this.player.pos);
    this.sun.position.copy(this.player.pos).add(this.sunOffset);
    this.ui.updateBubbles(this.camera, window.innerWidth, window.innerHeight);
    this.composer.render();
  }
}
