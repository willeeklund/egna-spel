import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { City, PITCH, HALF } from './world.js';
import { Traffic } from './cars.js';
import { People } from './people.js';
import { makeBearMaterials, makeBearModel, animateBear } from './bear.js';
import { makeRatModel, animateRat } from './rat.js';
import { Minimap } from './minimap.js';
import { initAudio, sfx } from './audio.js';
import * as fx from './fx.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xb4d8f5, 170, 600);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.3, 3000);

const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(28), THREE.MathUtils.degToRad(150));
const sky = new Sky();
sky.scale.setScalar(2500);
const su = sky.material.uniforms;
su.turbidity.value = 2;
su.rayleigh.value = 2.2;
su.mieCoefficient.value = 0.004;
su.mieDirectionalG.value = 0.8;
su.sunPosition.value.copy(sunDir);
scene.add(sky);
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
const envSky = new Sky();
envSky.scale.setScalar(100);
Object.assign(envSky.material.uniforms.sunPosition.value, sunDir);
envSky.material.uniforms.turbidity.value = 3;
envSky.material.uniforms.rayleigh.value = 1.2;
envScene.add(envSky);
scene.environment = pmrem.fromScene(envScene).texture;
scene.environmentIntensity = 0.55;

const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6f8f4a, 1.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e0, 3.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;
sc.left = sc.bottom = -90; sc.right = sc.top = 90; sc.near = 1; sc.far = 400;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -25, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.solver.iterations = 8;
const physMat = new CANNON.Material('default');
const bearMat = new CANNON.Material('bear');
world.addContactMaterial(new CANNON.ContactMaterial(physMat, physMat, { friction: 0.4, restitution: 0.15 }));
world.addContactMaterial(new CANNON.ContactMaterial(bearMat, physMat, { friction: 0.0, restitution: 0.0 }));

fx.initFx(scene);
const game = { scene, world, physMat, sfx, makeBearModel, makeRatModel, sunDir };
const city = new City(game);
game.city = city;
const traffic = new Traffic(game, 44);
const people = new People(game, 80);
game.people = people;
world.broadphase.autoDetectAxis();

const bearMats = makeBearMaterials();
const bearModel = makeBearModel(bearMats.fur, bearMats.light, bearMats.dark);
const ratModel = makeRatModel();
ratModel.visible = false;
scene.add(bearModel, ratModel);
const bearOnly = new CANNON.Body({ mass: 500, material: bearMat, fixedRotation: true, linearDamping: 0.0, allowSleep: false });
bearOnly.addShape(new CANNON.Sphere(1.2), new CANNON.Vec3(0, 0, 1.0));
bearOnly.addShape(new CANNON.Sphere(1.2), new CANNON.Vec3(0, 0, -0.9));
const ratBody = new CANNON.Body({ mass: 3, material: bearMat, fixedRotation: true, allowSleep: false });
ratBody.addShape(new CANNON.Sphere(0.15));
ratBody.collisionFilterGroup = 2;
const climb = { active: false, normal: new THREE.Vector3(), grace: 0, mantleT: 0, mantleDir: new THREE.Vector3(), cooldown: 0, blend: 0 };
world.addEventListener('preStep', () => { if (climb.active && who === 'rat') ratBody.force.y += ratBody.mass * 25; });
const rayRes = new CANNON.RaycastResult();
function climbProbe(dir, dy = 0) {
  const p = ratBody.position;
  rayRes.reset();
  world.raycastClosest(new CANNON.Vec3(p.x, p.y + dy, p.z), new CANNON.Vec3(p.x + dir.x * 0.6, p.y + dy, p.z + dir.z * 0.6), { collisionFilterMask: 1, skipBackfaces: true }, rayRes);
  if (!rayRes.hasHit || !rayRes.body?.userData?.climbable) return null;
  const n = rayRes.hitNormalWorld;
  if (Math.abs(n.y) > 0.6) return null;
  return new THREE.Vector3(n.x, 0, n.z).normalize();
}

function ratClimb(dt, move, hasInput, v) {
  climb.cooldown = Math.max(0, climb.cooldown - dt);
  if (climb.mantleT > 0) {
    climb.mantleT -= dt;
    const k = climb.mantleT / 0.25;
    v.y = 0.4 + 1.6 * k;
    v.x = climb.mantleDir.x * 1.8; v.z = climb.mantleDir.z * 1.8;
    return true;
  }
  if (!climb.active) {
    if (!hasInput || climb.cooldown > 0) return false;
    const n = climbProbe(move);
    if (!n || move.dot(n) > -0.4) return false;
    climb.active = true;
    climb.normal.copy(n);
    climb.grace = 0.15;
  }
  const inward = climb.normal.clone().negate();
  const n = climbProbe(inward, 0.05);
  if (n) { climb.normal.lerp(n, Math.min(1, dt * 12)).normalize(); climb.grace = 0.06; }
  else {
    climb.grace -= dt;
    if (climb.grace <= 0) {
      climb.active = false;
      if (v.y > 0.5) { climb.mantleT = 0.25; climb.mantleDir.copy(inward); }
      return climb.mantleT > 0;
    }
  }
  const tangent = new THREE.Vector3(-inward.z, 0, inward.x);
  const up = hasInput ? move.dot(inward) : 0;
  const side = hasInput ? move.dot(tangent) : 0;
  if (up < -0.6 && st.grounded) { climb.active = false; climb.cooldown = 0.4; return false; }
  const speed = st.running ? 3.6 : 2.4;
  const tv = new THREE.Vector3().addScaledVector(inward, 0.8).addScaledVector(tangent, side * speed * 0.7);
  v.x += (tv.x - v.x) * Math.min(1, dt * 14);
  v.z += (tv.z - v.z) * Math.min(1, dt * 14);
  v.y += (up * speed - v.y) * Math.min(1, dt * 12);
  const targetYaw = Math.atan2(inward.x, inward.z);
  let dy = targetYaw - st.yaw;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  st.yaw += dy * Math.min(1, dt * 12);
  return true;
}
const CHAR = {
  bear: { body: bearOnly, model: bearModel, r: 1.2, walk: 9, run: 17, jump: 14, camH: 3.2, zoom: [5, 45], dist: 14, pitch: 0.32, scare: 7, near: 0.3, drink: 5, minCamY: 1.2 },
  rat: { body: ratBody, model: ratModel, r: 0.15, walk: 4, run: 8, jump: 7.5, camH: 0.45, zoom: [0.8, 14], dist: 2.8, pitch: 0.25, scare: 2.5, near: 0.03, drink: 2.4, minCamY: 0.3 },
};
let who = 'bear';
let C = CHAR.bear;
let bearBody = bearOnly;
let bear = bearModel;
let BR = 1.2;
bearBody.position.set(PITCH / 2, BR + 0.5, 8);
world.addBody(bearBody);

const st = {
  yaw: Math.PI, speed: 0, phase: 0, grounded: false, running: false,
  hitT: 0, hitDur: 0.38, hitCd: 0, hitSide: 1,
  stompT: 0, stompDur: 0.45, stompCd: 0, slamming: false,
  roarT: 0, roarDur: 1.4, roarCd: 0,
  airTime: 0, shake: 0,
};

const keys = {};
const drive = { car: null, speed: 0, yaw: 0, steer: 0, crashCd: 0, mouseT: 0, driven: new Set() };
let camYaw = Math.PI, camPitch = 0.32, camDist = 14;
let started = false;
let chosen = 'bear';

function setCharacter(k) {
  const old = bearBody;
  const n = CHAR[k];
  if (old !== n.body) {
    let x = old.position.x, z = old.position.z, y = old.position.y - BR + n.r + 0.1;
    const sc = city.shopCenter;
    if (k === 'bear' && Math.abs(x - sc.x) < 8 && Math.abs(z - sc.z) < 5.5) { x = city.shopDoor.x; z = city.shopDoor.z + 3; y = n.r + 0.5; }
    if (k === 'bear' && y > 3) y = 6;
    n.body.position.set(x, y, z);
    n.body.velocity.set(0, 0, 0);
    if (world.bodies.includes(old)) world.removeBody(old);
    world.addBody(n.body);
  }
  who = k; C = n; bearBody = n.body; BR = n.r;
  bearModel.visible = k === 'bear';
  ratModel.visible = k === 'rat';
  bear = n.model;
  camDist = n.dist; camPitch = n.pitch;
  camera.near = n.near; camera.updateProjectionMatrix();
  game.scareRadius = n.scare;
  st.slamming = false;
  renderMissions();
  renderKeys();
}

window.addEventListener('keydown', (e) => {
  if (!started) return;
  const k = e.key.toLowerCase();
  if (!keys[k]) {
    if (k === 'b') toggleCar();
    if (k === 'h') { if (drive.car) { sfx.honk(); scareAhead(); } else doHit(); }
    if (k === 'f' && !drive.car) doStomp();
    if (k === 'r' && !drive.car) doRoar();
    if (k === ' ' && !drive.car) doJump();
    if (k === 'c') { if (drive.car) exitCar(); setCharacter(who === 'bear' ? 'rat' : 'bear'); banner(who === 'bear' ? '🐻 BJÖRN' : '🐀 RÅTTA', who === 'bear' ? 'Stark och busig!' : 'Liten, snabb och älskar ost!'); }
    if (k === 'm') minimap.toggle();
    if (k === '+' || k === '=') zoom(-1);
    if (k === '-' || k === '_') zoom(1);
  }
  keys[k] = true;
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
canvas.addEventListener('click', () => { if (started && document.pointerLockElement !== canvas) lockPointer(); });
function lockPointer() { try { canvas.requestPointerLock?.()?.catch?.(() => {}); } catch {} }
let dragging = false;
canvas.addEventListener('mousedown', () => (dragging = true));
window.addEventListener('mouseup', () => (dragging = false));
window.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas || dragging) {
    camYaw -= e.movementX * 0.0028;
    if (Math.abs(e.movementX) > 2) drive.mouseT = 1.5;
    camPitch = THREE.MathUtils.clamp(camPitch + e.movementY * 0.0022, -0.15, 1.2);
  }
});
function zoom(dir) { camDist = THREE.MathUtils.clamp(camDist * (dir > 0 ? 1.18 : 1 / 1.18), C.zoom[0], C.zoom[1]); }
window.addEventListener('wheel', (e) => { camDist = THREE.MathUtils.clamp(camDist * (1 + e.deltaY * 0.0012), C.zoom[0], C.zoom[1]); });
document.querySelectorAll('.char').forEach((b) => b.addEventListener('click', () => {
  chosen = b.dataset.char;
  document.querySelectorAll('.char').forEach((x) => x.classList.toggle('sel', x === b));
}));
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById('play').addEventListener('click', () => {
  initAudio();
  started = true;
  setCharacter(chosen);
  document.getElementById('start').classList.add('hidden');
  lockPointer();
});

// ---------- Poäng ----------
let score = 0, chain = 0, lastAward = -10, clock = 0;
const RAT_RANKS = [[0, 'Liten mus'], [1500, 'Busig råtta'], [5000, 'Ostjägare'], [12000, 'Kloakens hjälte'], [25000, 'RÅTTKUNGEN'], [50000, 'Legendarisk superråtta']];
const RANKS = [[0, 'Liten nalle'], [1500, 'Busig björn'], [5000, 'Kvarterets skräck'], [12000, 'Stadens mardröm'], [25000, 'BJÖRNKUNGEN'], [50000, 'Legendarisk megabjörn']];
const MISSIONS = [
  { key: 'car', text: 'Välta 5 bilar', goal: 5 },
  { key: 'trash', text: 'Knuffa 10 soptunnor', goal: 10 },
  { key: 'hydrant', text: 'Spräck 5 brandposter', goal: 5 },
  { key: 'gnome', text: 'Sparka iväg 8 tomtar', goal: 8 },
  { key: 'fence', text: 'Riv 15 staketbitar', goal: 15 },
  { key: 'lamp', text: 'Fäll 6 lyktstolpar', goal: 6 },
  { key: 'scare', text: 'Skräm 10 bilister', goal: 10 },
  { key: 'flip', text: 'Lägg 3 bilar på taket', goal: 3 },
  { key: 'bus', text: 'Välta en buss', goal: 1 },
  { key: 'mailbox', text: 'Slå sönder 8 brevlådor', goal: 8 },
  { key: 'people', text: 'Skräm 15 personer', goal: 15 },
  { key: 'drink', text: 'Drick ur 3 brandposter', goal: 3 },
  { key: 'lambo', text: 'Välta Lamborghinin', goal: 1 },
  { key: 'showerH', text: 'Duscha under en brandpost', goal: 1 },
  { key: 'showerF', text: 'Duscha i fontänen', goal: 1 },
  { key: 'cheese', text: 'Hitta 9 ostbitar i ostbutiken', goal: 9, who: 'rat' },
  { key: 'bigcheese', text: 'Ät jätteosten', goal: 1, who: 'rat' },
  { key: 'statue', text: 'Klättra upp på björnstatyn', goal: 1, who: 'rat' },
  { key: 'ratstatue', text: 'Stå på toppen av musstatyn', goal: 1, who: 'rat' },
  { key: 'ratscare', text: 'Skräm 10 personer', goal: 10, who: 'rat' },
  { key: 'ratdrink', text: 'Drick ur en brandpost', goal: 1, who: 'rat' },
  { key: 'drive', text: 'Kapa 3 olika bilar', goal: 3, who: 'rat' },
  { key: 'drivecrash', text: 'Krocka med 5 bilar', goal: 5, who: 'rat' },
  { key: 'drivebus', text: 'Kör en buss', goal: 1, who: 'rat' },
  { key: 'drivelambo', text: 'Kör Lamborghinin', goal: 1, who: 'rat' },
];
const mine = () => MISSIONS.filter((m) => (m.who || 'bear') === who);
MISSIONS.forEach((m) => (m.n = 0));
const missionList = document.getElementById('mission-list');
function renderMissions() {
  missionList.innerHTML = mine().map((m) => `<li class="${m.n >= m.goal ? 'done' : ''}"><span>${m.text}</span><span class="n">${Math.min(m.n, m.goal)}/${m.goal}</span></li>`).join('');
}
renderMissions();

const keysEl = document.getElementById('keys');
function renderKeys() {
  const list = drive.car
    ? [['W', 'gasa'], ['S', 'broms/back'], ['A/D', 'svänga'], ['Shift', 'TURBO'], ['Space', 'handbroms'], ['H', 'tuta'], ['B', 'hoppa ur']]
    : who === 'rat'
    ? [['B', 'kör bil'], ['WASD', 'spring'], ['Shift', 'rusa'], ['Space', 'hoppa'], ['H', 'bita'], ['R', 'pipa'], ['C', 'bli björn'], ['+/−', 'zooma'], ['M', 'karta']]
    : [['WASD', 'gå'], ['Shift', 'spring'], ['Space', 'hoppa'], ['H', 'slå'], ['F', 'stampa'], ['R', 'vråla'], ['C', 'bli råtta'], ['+/−', 'zooma'], ['M', 'karta']];
  keysEl.innerHTML = list.map(([k, t]) => `<span><b>${k}</b> ${t}</span>`).join('');
}
renderKeys();

const scoreEl = document.getElementById('score');
const rankEl = document.getElementById('rank');
const comboEl = document.getElementById('combo');
const popupsEl = document.getElementById('popups');
const bannerEl = document.getElementById('banner');
const popups = [];
let bannerT = 0;

function popup(text, label, pos, color) {
  const el = document.createElement('div');
  el.className = 'popup';
  el.innerHTML = `<div class="p" ${color ? `style="color:${color}"` : ''}>${text}</div>${label ? `<div class="l">${label}</div>` : ''}`;
  popupsEl.appendChild(el);
  popups.push({ el, pos: pos.clone().add(new THREE.Vector3(0, 2.5, 0)), t: 0 });
}

function banner(title, sub) {
  bannerEl.innerHTML = `${title}<small>${sub}</small>`;
  bannerEl.classList.add('show');
  bannerT = 2.6;
}

function award(pts, label, pos, missionKey) {
  if (clock - lastAward < 2.5) chain++; else chain = 1;
  lastAward = clock;
  const mult = Math.min(5, 1 + Math.floor((chain - 1) / 3));
  const total = pts * mult;
  score += total;
  popup(`+${total}`, label, pos);
  sfx.ding(chain);
  if (missionKey) progress(missionKey, 1);
}

function progress(key, n) {
  const m = MISSIONS.find((x) => x.key === key);
  if (!m || m.n >= m.goal) return;
  m.n += n;
  if (m.n >= m.goal) {
    score += 1000;
    banner('UPPDRAG KLART!', `${m.text} &nbsp;+1000`);
    sfx.mission();
    if (mine().every((x) => x.n >= x.goal)) setTimeout(() => banner('ALLA UPPDRAG KLARA!', who === 'rat' ? 'Du är RÅTTKUNGEN!' : 'Du är BJÖRNKUNGEN!'), 2800);
  }
  renderMissions();
}

// ---------- Handlingar ----------
const tmpV = new THREE.Vector3();
const bearPos = new THREE.Vector3();
const forward = () => new THREE.Vector3(Math.sin(st.yaw), 0, Math.cos(st.yaw));

function hitBody(body, dir, power, up) {
  body.wakeUp();
  const m = body.mass > 500 ? 0.75 : 1;
  body.velocity.set(dir.x * power * m, up * m, dir.z * power * m);
  body.angularVelocity.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 10);
}

function flipCar(car, dir, power, up) {
  const fresh = !car.wrecked;
  traffic.wreck(car);
  hitBody(car.body, dir, power, up);
  car.body.angularVelocity.set(dir.z * 6 + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, -dir.x * 6 + (Math.random() - 0.5) * 3);
  const p = new THREE.Vector3().copy(car.body.position);
  fx.glass(p, 12);
  fx.debris(p, [car.color, 0x222222], 10, 10);
  sfx.crash();
  sfx.alarm();
  if (fresh && car.isLambo) {
    fx.debris(p, [0x3fae4a, 0x2e8b3a, 0xffd700], 40, 14);
    sfx.cash();
    award(1000, 'LAMBORGHINI!', p, 'lambo');
    banner('LAMBORGHINI VÄLT!', 'Den rika personen springer därifrån! +1000');
    people.spawn({ rich: true }, p);
    return;
  }
  if (fresh) {
    if (car.isBus) { award(500, 'Vält en BUSS!', p, 'car'); progress('bus', 1); }
    else award(200, 'Vält en bil!', p, 'car');
  } else award(40, 'Bilen fick mer stryk', p);
}

function ratBite() {
  if (st.hitCd > 0) return;
  st.hitT = 0.3; st.hitCd = 0.35;
  sfx.squeak();
  const f = forward();
  const nose = bearPos.clone().addScaledVector(f, 0.4).setY(bearPos.y + 0.15);
  for (const p of city.props) {
    if (!p.inWorld || p.body.mass > 10) continue;
    tmpV.copy(p.body.position);
    if (tmpV.distanceTo(nose) > 1.0) continue;
    hitBody(p.body, f, 4, 3);
  }
  for (const pp of people.list) {
    if (pp.pos.distanceTo(tmpV.copy(nose).setY(0)) > 1.6) continue;
    people.scare(pp, bearPos, 7);
    sfx.scream();
    award(50, 'EN RÅTTA! AAAH!', pp.pos, 'ratscare');
  }
}

function ratSqueak() {
  if (st.roarCd > 0) return;
  st.roarT = 0.6; st.roarCd = 1.5;
  sfx.squeak(); setTimeout(() => sfx.squeak(), 180);
  fx.shockwave(bearPos, 10, 0xffb0c0);
  let n = 0;
  for (const pp of people.list) {
    if (pp.pos.distanceTo(tmpV.copy(bearPos).setY(0)) < 12 && people.scare(pp, bearPos, 5)) { n++; sfx.scream(); award(30, 'Rädd för råttan!', pp.pos, 'ratscare'); }
  }
  if (n === 0) popup('PIIIP!', '', bearPos, '#ff9ab0');
}

function doHit() {
  if (who === 'rat') return ratBite();
  if (st.hitCd > 0) return;
  st.hitT = st.hitDur; st.hitCd = 0.42; st.hitSide = -st.hitSide;
  sfx.swing();
  setTimeout(() => {
    const f = forward();
    const center = bearPos.clone().addScaledVector(f, 2.8).setY(bearPos.y + 1.2);
    let hitSomething = false;
    for (const p of city.props) {
      if (!p.inWorld) continue;
      tmpV.copy(p.body.position);
      if (tmpV.distanceTo(center) > 3.6) continue;
      hitBody(p.body, f, 20, 9);
      fx.debris(tmpV, p.def.colors, 6, 6);
      sfx[p.def.sound]();
      hitSomething = true;
    }
    for (const car of traffic.cars) {
      if (!car.active) continue;
      tmpV.copy(car.body.position);
      const d = tmpV.clone().sub(center); d.y = 0;
      const reach = car.half[2] * Math.abs(d.clone().normalize().dot(new THREE.Vector3(Math.sin(car.mesh.rotation.y), 0, Math.cos(car.mesh.rotation.y)))) + car.half[0] + 2.4;
      if (d.length() > Math.max(reach, 3.4)) continue;
      flipCar(car, f, car.isBus ? 14 : 18, car.isBus ? 12 : 13);
      hitSomething = true;
    }
    for (const pp of people.list) {
      if (pp.pos.distanceTo(tmpV.copy(center).setY(0)) > 3.8) continue;
      people.scare(pp, bearPos, 9);
      sfx.scream();
      award(50, 'Hoppade av skräck!', pp.pos, 'people');
      hitSomething = true;
    }
    const tip = bearPos.clone().addScaledVector(f, 3.8).setY(1.5);
    for (const b of city.buildings) {
      if (tip.x > b.min.x - 0.6 && tip.x < b.max.x + 0.6 && tip.z > b.min.z - 0.6 && tip.z < b.max.z + 0.6) {
        if (b.glass) { fx.glass(tip, 18); sfx.crash(); award(30, 'Krossade ett fönster!', tip); }
        else { fx.debris(tip, [0xb55b3c, 0xd8d0c0, 0x888888], 10, 6); sfx.hit(); award(15, `Bankade på ${b.name.toLowerCase()}n`, tip); }
        hitSomething = true;
        break;
      }
    }
    if (hitSomething) { sfx.hit(); st.shake = Math.max(st.shake, 0.35); }
    fx.dust(center.setY(0.3), 4, 2);
  }, 120);
}

function shockwave(radius, power) {
  sfx.stomp();
  st.shake = 1;
  fx.shockwave(bearPos, radius);
  fx.dust(bearPos.clone().setY(0.3), 22, 9);
  for (const p of city.props) {
    if (!p.inWorld) continue;
    tmpV.copy(p.body.position);
    const d = tmpV.clone().sub(bearPos); d.y = 0;
    const dist = d.length();
    if (dist > radius) continue;
    const k = 1 - dist / radius;
    d.normalize();
    hitBody(p.body, d, power * (0.4 + k), 6 + 10 * k);
  }
  for (const pp of people.list) {
    if (pp.pos.distanceTo(tmpV.copy(bearPos).setY(0)) < radius && people.scare(pp, bearPos, 6)) { sfx.scream(); award(30, 'Skrämd person!', pp.pos, 'people'); }
  }
  let flips = 0;
  for (const car of traffic.cars) {
    if (!car.active) continue;
    tmpV.copy(car.body.position);
    const d = tmpV.clone().sub(bearPos); d.y = 0;
    const dist = d.length();
    if (dist > radius) continue;
    const k = 1 - dist / radius;
    d.normalize();
    flipCar(car, d, power * 0.6 * (0.4 + k), 8 + 9 * k);
    flips++;
  }
  if (flips >= 2) award(150 * flips, `STAMPKOMBO x${flips}!`, bearPos);
}

function doStomp() {
  if (who === 'rat' || st.stompCd > 0 || st.slamming) return;
  if (!st.grounded) {
    st.slamming = true;
    bearBody.velocity.set(0, -40, 0);
    return;
  }
  st.stompT = st.stompDur; st.stompCd = 1.6;
  setTimeout(() => shockwave(11, 14), 220);
}

function doRoar() {
  if (who === 'rat') return ratSqueak();
  if (st.roarCd > 0) return;
  st.roarT = st.roarDur; st.roarCd = 3;
  sfx.roar();
  fx.shockwave(bearPos, 30, 0xffd23f);
  st.shake = 0.5;
  let n = 0;
  for (const pp of people.list) {
    if (pp.pos.distanceTo(tmpV.copy(bearPos).setY(0)) < 30 && people.scare(pp, bearPos, 3)) { n++; sfx.scream(); award(30, 'Skrämd person!', pp.pos, 'people'); }
  }
  for (const car of traffic.cars) {
    if (!car.active || car.wrecked || car.panic > 0) continue;
    tmpV.copy(car.body.position);
    if (tmpV.distanceTo(bearPos) > 32) continue;
    car.panic = 5;
    n++;
    setTimeout(() => sfx.honk(), 300 + Math.random() * 600);
    award(25, 'Skrämd bilist!', tmpV, 'scare');
  }
  for (const p of city.props) {
    if (!p.inWorld) continue;
    tmpV.copy(p.body.position);
    if (tmpV.distanceTo(bearPos) < 9 && p.body.mass < 20) hitBody(p.body, tmpV.clone().sub(bearPos).setY(0).normalize(), 6, 5);
  }
  if (n === 0) popup('VRÅÅÅL!', '', bearPos, '#ff6b3d');
}

function doJump() {
  if (who === 'rat' && climb.active) {
    climb.active = false; climb.cooldown = 0.5;
    bearBody.velocity.set(climb.normal.x * 3.5, 5, climb.normal.z * 3.5);
    sfx.jump();
    return;
  }
  if (!st.grounded) return;
  bearBody.velocity.y = C.jump;
  st.grounded = false;
  sfx.jump();
}

// ---------- Loop ----------
const cdEl = document.getElementById('cooldowns');
cdEl.innerHTML = ['H', 'F', 'R'].map((k) => `<div><div class="cd" title="${k}"><i id="cd-${k}"></i></div></div>`).join('');
const cdBars = { H: document.getElementById('cd-H'), F: document.getElementById('cd-F'), R: document.getElementById('cd-R') };

const camPos = new THREE.Vector3();
const camTarget = new THREE.Vector3();
let lastT = performance.now();
let wasGrounded = true;
let lamboTimer = 25;
const pick = (a) => a[(Math.random() * a.length) | 0];
game.onScared = (pp) => { sfx.scream(); award(30, 'Skrämd person!', pp.pos, 'people'); };
game.onBalloon = (pos) => award(20, 'Ballongen flög iväg!', pos, null);
let frame = 0;

function checkGrounded() {
  st.grounded = false; st.wall = false; st.wallClimb = false;
  for (const c of world.contacts) {
    if (c.bi !== bearBody && c.bj !== bearBody) continue;
    const other = c.bi === bearBody ? c.bj : c.bi;
    const ny = c.bi === bearBody ? -c.ni.y : c.ni.y;
    if (ny > 0.5) st.grounded = true;
    else if (Math.abs(ny) < 0.5 && other.type === CANNON.Body.STATIC) {
      st.wall = true;
      if (other.userData?.climbable) st.wallClimb = true;
    }
  }
}

const hintEl = document.getElementById('hint');
const yawOf = (q) => 2 * Math.atan2(q.y, q.w);

function nearestCar(maxD = 4.5) {
  let best = null, bd = maxD;
  for (const car of traffic.cars) {
    if (!car.active || car.driven) continue;
    const d = Math.hypot(car.body.position.x - bearPos.x, car.body.position.z - bearPos.z) - car.half[0];
    if (d < bd) { bd = d; best = car; }
  }
  return best;
}

function toggleCar() {
  if (drive.car) return exitCar();
  if (who !== 'rat') { popup('För stor för bilen!', 'Byt till råttan med C', bearPos, '#ff6b3d'); return; }
  const car = nearestCar();
  if (car) enterCar(car);
}

function enterCar(car) {
  const b = car.body;
  const yaw = car.wrecked ? st.yaw : yawOf(b.quaternion);
  if (car.wrecked) traffic.unwreck(car);
  b.position.y = car.half[1] + 0.02;
  b.quaternion.setFromEuler(0, yaw, 0);
  b.velocity.set(0, 0, 0);
  b.angularVelocity.set(0, 0, 0);
  car.driven = true;
  car.flipped = false;
  drive.car = car;
  drive.speed = car.wrecked ? 0 : car.speed * 0.5;
  drive.yaw = yaw;
  climb.active = false; climb.mantleT = 0;
  ratBody.type = CANNON.Body.KINEMATIC;
  ratBody.collisionResponse = false;
  ratBody.velocity.set(0, 0, 0);
  camYaw = yaw;
  sfx.door();
  setTimeout(() => sfx.honk(), 250);
  const name = car.isLambo ? 'LAMBORGHININ' : car.isBus ? 'BUSSEN' : 'BILEN';
  popup('Brum brum!', `Råttan kapade ${name.toLowerCase()}!`, bearPos, '#ffd23f');
  if (!drive.driven.has(car)) { drive.driven.add(car); award(car.isLambo ? 500 : car.isBus ? 300 : 100, `Kapade ${name.toLowerCase()}!`, bearPos, 'drive'); }
  if (car.isLambo) progress('drivelambo', 1);
  if (car.isBus) progress('drivebus', 1);
  renderKeys();
}

function exitCar() {
  const car = drive.car;
  if (!car) return;
  const b = car.body;
  car.driven = false;
  traffic.wreck(car);
  b.velocity.set(Math.sin(drive.yaw) * drive.speed, 0, Math.cos(drive.yaw) * drive.speed);
  const side = new THREE.Vector3(Math.cos(drive.yaw), 0, -Math.sin(drive.yaw));
  ratBody.type = CANNON.Body.DYNAMIC;
  ratBody.collisionResponse = true;
  ratBody.position.set(b.position.x + side.x * (car.half[0] + 0.6), b.position.y + car.half[1] + 0.3, b.position.z + side.z * (car.half[0] + 0.6));
  ratBody.velocity.set(side.x * 2, 3, side.z * 2);
  drive.car = null;
  sfx.engine(false);
  sfx.door();
  renderKeys();
}

function scareAhead() {
  const f = new THREE.Vector3(Math.sin(drive.yaw), 0, Math.cos(drive.yaw));
  for (const pp of people.list) {
    const d = pp.pos.clone().sub(bearPos); d.y = 0;
    if (d.length() < 14 && d.normalize().dot(f) > 0.5 && people.scare(pp, bearPos, 6)) { sfx.scream(); award(30, 'Tut tut!', pp.pos, 'ratscare'); }
  }
}

function driveUpdate(dt) {
  const car = drive.car, b = car.body;
  const thr = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
  const steerIn = (keys.a || keys.arrowleft ? 1 : 0) - (keys.d || keys.arrowright ? 1 : 0);
  const turbo = !!keys.shift;
  const hand = !!keys[' '];
  const power = car.isLambo ? 1.6 : car.isBus ? 0.65 : 1;
  const maxF = (turbo ? 30 : 20) * (car.isLambo ? 1.45 : car.isBus ? 0.75 : 1);
  if (thr > 0) drive.speed += (drive.speed < 0 ? 28 : 12 * power * (turbo ? 1.5 : 1)) * dt;
  else if (thr < 0) drive.speed -= (drive.speed > 0 ? 28 : 9) * dt;
  else drive.speed *= 1 - Math.min(1, dt * 0.7);
  if (hand) { drive.speed *= 1 - Math.min(1, dt * 2.2); if (Math.abs(drive.speed) > 8 && steerIn) sfx.skid(); }
  drive.speed = THREE.MathUtils.clamp(drive.speed, -9, maxF);
  drive.steer += (steerIn - drive.steer) * Math.min(1, dt * 6);
  const grip = Math.min(1, Math.abs(drive.speed) / 5);
  const turn = drive.steer * grip * (car.isBus ? 0.9 : 1.5) * Math.sign(drive.speed || 1) * (hand ? 1.7 : 1);
  drive.yaw += turn * dt;
  const f = new THREE.Vector3(Math.sin(drive.yaw), 0, Math.cos(drive.yaw));
  const step = drive.speed * dt;
  const nose = new THREE.Vector3(b.position.x, 1, b.position.z).addScaledVector(f, (car.half[2] + 0.3) * Math.sign(drive.speed || 1) + step);
  let blockedBy = null;
  for (const bx of city.buildings) {
    if (nose.x > bx.min.x - 0.2 && nose.x < bx.max.x + 0.2 && nose.z > bx.min.z - 0.2 && nose.z < bx.max.z + 0.2) { blockedBy = bx; break; }
  }
  if (Math.abs(nose.x) > HALF + 9 || Math.abs(nose.z) > HALF + 9) blockedBy = { name: 'Kant' };
  drive.crashCd = Math.max(0, drive.crashCd - dt);
  if (blockedBy) {
    if (Math.abs(drive.speed) > 7 && drive.crashCd <= 0) {
      drive.crashCd = 1;
      sfx.crash();
      st.shake = Math.min(1, Math.abs(drive.speed) / 20);
      fx.debris(nose, [car.color, 0x888888], 10, 6);
      if (blockedBy.glass) fx.glass(nose, 14);
      award(40, 'KRASCH!', nose);
    }
    drive.speed = -drive.speed * 0.25;
  }
  for (const o of traffic.cars) {
    if (o === car || !o.active) continue;
    const d = Math.hypot(o.body.position.x - b.position.x, o.body.position.z - b.position.z);
    if (d > car.half[2] + o.half[2] * 0.7) continue;
    const rel = new THREE.Vector3(o.body.position.x - b.position.x, 0, o.body.position.z - b.position.z).normalize();
    if (rel.dot(f) * Math.sign(drive.speed) < 0.2) continue;
    if (Math.abs(drive.speed) > 5 || o.wrecked) {
      const fresh = !o.wrecked;
      flipCar(o, rel.multiplyScalar(Math.sign(drive.speed)), Math.abs(drive.speed) * 0.8 + 4, 5 + Math.abs(drive.speed) * 0.25);
      if (fresh) progress('drivecrash', 1);
      st.shake = 0.6;
      drive.speed *= 0.55;
    }
  }
  for (const pp of people.list) {
    const d = pp.pos.clone().sub(b.position); d.y = 0;
    if (d.length() < 6 && Math.abs(drive.speed) > 3 && d.normalize().dot(f) * Math.sign(drive.speed) > 0.4 && people.scare(pp, bearPos, 8)) { sfx.scream(); award(30, 'Hoppade undan!', pp.pos, 'ratscare'); }
  }
  b.wakeUp();
  b.velocity.set(f.x * drive.speed, 0, f.z * drive.speed);
  b.position.y = car.half[1] + 0.02;
  b.quaternion.setFromEuler(0, drive.yaw, 0);
  b.angularVelocity.set(0, 0, 0);
  const roof = car.isBus ? 1.6 : car.isLambo ? 0.75 : 1.65;
  ratBody.position.set(b.position.x + f.x * (car.isLambo ? -0.4 : 0.1), roof + 0.17 + Math.abs(Math.sin(clock * 20)) * 0.01 * Math.abs(drive.speed) / 10, b.position.z + f.z * (car.isLambo ? -0.4 : 0.1));
  ratBody.velocity.set(0, 0, 0);
  st.yaw = drive.yaw;
  st.speed = 0;
  sfx.engine(true, drive.speed, turbo && thr > 0);
  if (turbo && thr > 0 && Math.random() < dt * 30) fx.dust(new THREE.Vector3(b.position.x, 0.3, b.position.z).addScaledVector(f, -car.half[2] - 0.3), 1, 1, 0.3);
  if (Math.abs(drive.speed) > 4 && Math.abs(drive.steer) > 0.6 && (hand || Math.abs(drive.speed) > 18) && Math.random() < dt * 25) fx.dust(new THREE.Vector3(b.position.x, 0.2, b.position.z).addScaledVector(f, -car.half[2]), 1, 0.5, 0.35);
}

function rayBox(o, d, mn, mx) {
  let t0 = 0, t1 = Infinity;
  for (const a of ['x', 'y', 'z']) {
    if (Math.abs(d[a]) < 1e-8) { if (o[a] < mn[a] || o[a] > mx[a]) return Infinity; continue; }
    let ta = (mn[a] - o[a]) / d[a], tb = (mx[a] - o[a]) / d[a];
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    if (t0 > t1) return Infinity;
  }
  return t0;
}

function camClip(from, to) {
  const dir = to.clone().sub(from);
  const len = dir.length();
  if (len < 1e-3) return false;
  dir.divideScalar(len);
  let best = len;
  for (const b of city.camBoxes) {
    if (from.x > b.min.x && from.x < b.max.x && from.y > b.min.y && from.y < b.max.y && from.z > b.min.z && from.z < b.max.z) continue;
    const t = rayBox(from, dir, b.min, b.max);
    if (t < best) best = t;
  }
  if (best >= len) return false;
  to.copy(from).addScaledVector(dir, Math.max(0.15, best - 0.2));
  return true;
}

function update(dt) {
  clock += dt;
  let ix = 0, iz = 0;
  if (started) {
    if (keys.w || keys.arrowup) iz += 1;
    if (keys.s || keys.arrowdown) iz -= 1;
    if (keys.a || keys.arrowleft) ix += 1;
    if (keys.d || keys.arrowright) ix -= 1;
    if (keys.q) camYaw += dt * 2.2;
    if (keys.e) camYaw -= dt * 2.2;
  }
  st.running = !!keys.shift;
  if (drive.car) driveUpdate(dt);
  else {
  const maxSpeed = st.running ? C.run : C.walk;
  const fwdC = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
  const rightC = new THREE.Vector3(fwdC.z, 0, -fwdC.x);
  const move = fwdC.multiplyScalar(iz).addScaledVector(rightC, ix);
  const hasInput = move.lengthSq() > 0;
  if (hasInput) {
    move.normalize();
    const targetYaw = Math.atan2(move.x, move.z);
    let dy = targetYaw - st.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    st.yaw += dy * Math.min(1, dt * 10);
  }
  const v = bearBody.velocity;
  const ctrl = st.grounded || st.climbing ? 10 : 3;
  const tx = hasInput ? move.x * maxSpeed : 0;
  const tz = hasInput ? move.z * maxSpeed : 0;
  v.x += (tx - v.x) * Math.min(1, dt * ctrl);
  v.z += (tz - v.z) * Math.min(1, dt * ctrl);
  bearBody.quaternion.setFromEuler(0, st.yaw, 0);
  const climbing = who === 'rat' && ratClimb(dt, move, hasInput, v);
  st.climbing = climbing && climb.active;
  st.climbSpeed = Math.abs(v.y);
  if (!climbing && who === 'rat' && st.wall && !st.wallClimb && st.grounded && hasInput && v.y < 1) v.y = 4.2;
  }

  st.hitT = Math.max(0, st.hitT - dt);
  st.hitCd = Math.max(0, st.hitCd - dt);
  st.stompT = Math.max(0, st.stompT - dt);
  st.stompCd = Math.max(0, st.stompCd - dt);
  st.roarT = Math.max(0, st.roarT - dt);
  st.roarCd = Math.max(0, st.roarCd - dt);

  bearPos.set(bearBody.position.x, bearBody.position.y - BR, bearBody.position.z);
  traffic.update(dt, bearPos);
  people.update(dt, bearPos);
  if (started) {
    lamboTimer -= dt;
    if (lamboTimer <= 0 && !traffic.lambo.active) {
      if (traffic.spawnLambo(bearPos)) {
        banner('💰 EN JÄTTERIK PERSON! 💰', 'i en Lamborghini! Vält den för 1000 poäng!');
        sfx.cash();
        setTimeout(() => sfx.honk(), 600);
      }
      lamboTimer = 60 + Math.random() * 30;
    }
  }
  world.step(1 / 60, dt, 2);
  checkGrounded();
  if (drive.car) st.grounded = true;
  if (who === 'rat' && !drive.car && started) {
    const near = nearestCar(3.5);
    hintEl.classList.toggle('show', !!near);
    if (near) hintEl.innerHTML = `Tryck <b>B</b> för att hoppa in i ${near.isLambo ? 'Lamborghinin' : near.isBus ? 'bussen' : 'bilen'}!`;
  } else hintEl.classList.remove('show');

  if (st.grounded && !wasGrounded) {
    if (st.slamming && who === 'bear') {
      st.slamming = false;
      st.stompCd = 1.6;
      bearPos.set(bearBody.position.x, bearBody.position.y - BR, bearBody.position.z);
      shockwave(18, 22);
      popup('MEGASTAMP!', '', bearPos, '#ff6b3d');
    } else if (st.airTime > 0.4) { sfx.land(); fx.dust(bearPos.clone().setY(0.3), 8, 4); }
  }
  st.airTime = st.grounded ? 0 : st.airTime + dt;
  wasGrounded = st.grounded;

  bearPos.set(bearBody.position.x, bearBody.position.y - BR, bearBody.position.z);
  bear.position.copy(bearPos);
  bear.rotation.y = st.yaw;
  climb.blend += ((who === 'rat' && climb.active ? 1 : 0) - climb.blend) * Math.min(1, dt * 10);
  st.climbBlend = climb.blend;
  if (who === 'rat' && climb.blend > 0.001) {
    bear.position.addScaledVector(climb.normal, -0.13 * climb.blend);
    bear.position.y += 0.12 * climb.blend;
  }
  st.speed = drive.car ? 0 : Math.hypot(bearBody.velocity.x, bearBody.velocity.z);
  if (who === 'rat') animateRat(bear, dt, st); else animateBear(bear, dt, st);
  st.eatT = Math.max(0, (st.eatT || 0) - dt);
  for (const ch of city.cheeses) {
    if (ch.taken) continue;
    ch.mesh.rotation.y += dt * 1.5;
    ch.mesh.position.y = ch.base + Math.sin(clock * 3 + ch.base * 7) * 0.05;
    if (who !== 'rat') continue;
    tmpV.copy(bearBody.position);
    if (tmpV.distanceTo(ch.mesh.position) < (ch.big ? 1.0 : 0.5)) {
      ch.taken = true;
      ch.mesh.visible = false;
      st.eatT = 0.6;
      sfx.chomp();
      fx.debris(ch.mesh.position, [0xffc928, 0xffe27a], 8, 3);
      if (ch.big) { award(1000, 'JÄTTEOSTEN!', ch.mesh.position, 'bigcheese'); banner('🧀 JÄTTEOSTEN! 🧀', 'Mums! +1000'); }
      else award(100, pick(['Ost!', 'Mums, ost!', 'Nam nam!']), ch.mesh.position, 'cheese');
    }
  }
  if (who === 'rat' && !st.statueDone) {
    const t = city.statueTop;
    if (bearBody.position.y > t.y - 0.2 && Math.hypot(bearBody.position.x - t.x, bearBody.position.z - t.z) < 3) {
      st.statueDone = true;
      award(500, 'Toppen av björnstatyn!', bearPos, 'statue');
      banner('🏆 PÅ BJÖRNSTATYN!', 'Nu ända upp på musstatyn!');
    }
  }
  if (who === 'rat' && !st.ratStatueDone && st.grounded) {
    const t = city.ratStatueTop;
    if (bearBody.position.y > t.y && Math.hypot(bearBody.position.x - t.x, bearBody.position.z - t.z) < 0.9) {
      st.ratStatueDone = true;
      award(1000, 'Toppen av musstatyn!', bearPos, 'ratstatue');
      banner('👑 HÖGST UPP!', 'Björnen och råttan, stadens hjältar!');
      fx.shockwave(bearPos, 3, 0xffd23f);
    }
  }

  for (const p of city.props) {
    const b = p.body;
    if (!p.inWorld || b.sleepState === CANNON.Body.SLEEPING) continue;
    p.mesh.position.copy(b.position);
    p.mesh.quaternion.copy(b.quaternion);
    if (!p.knocked) {
      const upY = 1 - 2 * (b.quaternion.x * b.quaternion.x + b.quaternion.z * b.quaternion.z);
      if (b.velocity.length() > 3 || upY < 0.6) {
        p.knocked = true;
        tmpV.copy(b.position);
        if (tmpV.distanceTo(bearPos) < 45) {
          award(p.def.pts, p.def.name + '!', tmpV, p.def.mission);
          if (p.def.spray) { p.spray = 14; sfx.water(); }
        }
      }
    }
  }
  st.drinking = false;
  let shower = false;
  for (const p of city.props) {
    if (p.spray > 0) {
      p.spray -= dt;
      for (let k = 0; k < 2; k++) fx.water(p.origin);
      const dx = bearPos.x - p.origin.x, dz = bearPos.z - p.origin.z;
      const d2 = dx * dx + dz * dz;
      if (who === 'bear' && d2 < 2.4 * 2.4 && st.speed < 3 && st.grounded) { shower = true; st.showerKind = 'hydrant'; }
      else if (d2 < C.drink * C.drink && st.speed < C.walk * 0.4 && st.grounded) {
        st.drinking = true;
        st.drinkSpot = p;
      }
    }
  }
  {
    const fc = city.fountain.center;
    const fdist = Math.hypot(bearPos.x - fc.x, bearPos.z - fc.z);
    if (who === 'bear' && fdist > 1.2 && fdist < 3.8 && bearPos.y < 1.3 && st.speed < 3 && st.grounded) { shower = true; st.showerKind = 'fountain'; }
  }
  if (shower && !st.showering && clock - (st.lastShower || -99) > 4) progress(st.showerKind === 'fountain' ? 'showerF' : 'showerH', 1);
  if (shower) st.lastShower = clock;
  st.showering = shower;
  st.foam = THREE.MathUtils.clamp((st.foam || 0) + dt * (shower ? 0.45 : -0.12), 0, 1);
  if (shower) {
    st.drinking = false;
    st.showerT = (st.showerT || 0) + dt;
    if (Math.random() < dt * 14) fx.bubbles(bearPos.clone().add(new THREE.Vector3(0, 2.8, 0)).addScaledVector(forward(), 0.6), 1, 2.2);
    if (Math.random() < dt * 8) sfx.bubble();
    if (Math.random() < dt * 20) fx.splash(bearPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 4.2, (Math.random() - 0.5) * 1.5)).addScaledVector(forward(), 0.5), 0.8);
    if (st.showerT > 0.9) {
      st.showerT = 0;
      sfx.hum();
      award(15, pick(['Skrubb skrubb!', 'Tvålar in sig!', 'Schamponerar pälsen!', 'La la la 🎵', 'Tvättar armhålorna!', 'Ren björn!']), bearPos.clone().add(new THREE.Vector3(0, 2, 0)));
    }
  }
  if (st.drinking) {
    const p = st.drinkSpot;
    st.yaw += Math.atan2(Math.sin(Math.atan2(p.origin.x - bearPos.x, p.origin.z - bearPos.z) - st.yaw), Math.cos(Math.atan2(p.origin.x - bearPos.x, p.origin.z - bearPos.z) - st.yaw)) * Math.min(1, dt * 6);
    st.drinkT = (st.drinkT || 0) + dt;
    if (st.drinkT > 0.7) {
      st.drinkT = 0;
      sfx.gulp();
      award(10, pick(['Glunk glunk!', 'Slurp!', 'Mmm, vatten!', 'Glugg!']), bearPos);
      if (who === 'rat') progress('ratdrink', 1);
      else if (!p.drunk) { p.drunk = true; progress('drink', 1); }
    }
  }
  for (const car of traffic.cars) {
    if (!car.active || !car.wrecked || car.flipped) continue;
    const q = car.body.quaternion;
    const upY = 1 - 2 * (q.x * q.x + q.z * q.z);
    if (upY < -0.5 && car.body.velocity.length() < 2) {
      car.flipped = true;
      tmpV.copy(car.body.position);
      award(300, 'Bil på taket!', tmpV, 'flip');
    }
  }
  fx.updateFx(dt);
  city.fountain.update(clock);
  const fd = Math.hypot(bearPos.x - city.fountain.center.x, bearPos.z - city.fountain.center.z);
  sfx.fountainVolume(started ? THREE.MathUtils.clamp(1 - (fd - 6) / 45, 0, 1) : 0);
  if (fd < 6.5 && bearPos.y < 1.2 && st.speed > 1 && Math.random() < dt * 12) fx.splash(bearPos.clone().setY(1.08), who === 'rat' ? 0.4 : 1.4);
  if ((frame++ & 7) === 0) {
    for (const p of city.props) {
      const dx = p.mesh.position.x - bearPos.x, dz = p.mesh.position.z - bearPos.z;
      const d2 = dx * dx + dz * dz;
      p.mesh.visible = d2 < 150 * 150;
      if (!p.inWorld && d2 < 45 * 45) { world.addBody(p.body); p.inWorld = true; }
      else if (p.inWorld && d2 > 60 * 60 && p.body.sleepState === CANNON.Body.SLEEPING) { world.removeBody(p.body); p.inWorld = false; }
    }
  }

  drive.mouseT = Math.max(0, drive.mouseT - dt);
  if (drive.car) {
    if (drive.mouseT <= 0) { let d = drive.yaw - camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); camYaw += d * Math.min(1, dt * 3); }
    camTarget.lerp(tmpV.set(drive.car.body.position.x, 1.8, drive.car.body.position.z), Math.min(1, dt * 12));
  } else camTarget.lerp(tmpV.copy(bearPos).add(new THREE.Vector3(0, C.camH, 0)), Math.min(1, dt * 12));
  const cp = Math.cos(camPitch), sp = Math.sin(camPitch);
  const cd = drive.car ? (drive.car.isBus ? 16 : 10) + Math.abs(drive.speed) * 0.12 : camDist;
  const desired = new THREE.Vector3(-Math.sin(camYaw) * cp * cd, sp * cd + (drive.car ? 1 : C.camH * 0.45), -Math.cos(camYaw) * cp * cd).add(camTarget);
  desired.y = Math.max(desired.y, bearPos.y + C.minCamY);
  if (camClip(camTarget, desired)) camPos.copy(desired);
  else camPos.lerp(desired, Math.min(1, dt * 8));
  camera.position.copy(camPos);
  if (st.shake > 0) {
    camera.position.add(new THREE.Vector3((Math.random() - .5), (Math.random() - .5), (Math.random() - .5)).multiplyScalar(st.shake * 0.8));
    st.shake = Math.max(0, st.shake - dt * 2.5);
  }
  camera.lookAt(camTarget);

  sun.position.copy(bearPos).addScaledVector(sunDir, 200);
  sun.target.position.copy(bearPos);

  updateUI(dt);
}

const minimap = new Minimap(city, document.getElementById('minimap'));
let shownScore = 0;
const lamboEl = document.getElementById('lambo');
const lamboArrow = document.getElementById('lambo-arrow');
const lamboText = document.getElementById('lambo-text');
function updateUI(dt) {
  shownScore += (score - shownScore) * Math.min(1, dt * 8);
  if (Math.abs(score - shownScore) < 1) shownScore = score;
  scoreEl.textContent = Math.round(shownScore).toLocaleString('sv-SE');
  const ranks = who === 'rat' ? RAT_RANKS : RANKS;
  let rank = ranks[0][1];
  for (const [min, name] of ranks) if (score >= min) rank = name;
  rankEl.textContent = rank;
  const mult = Math.min(5, 1 + Math.floor((chain - 1) / 3));
  const comboText = clock - lastAward < 2.5 && mult > 1 ? `KOMBO x${mult}!` : '';
  if (comboEl.textContent !== comboText) {
    comboEl.textContent = comboText;
    comboEl.classList.remove('pop'); void comboEl.offsetWidth; comboEl.classList.add('pop');
  }
  cdBars.H.style.transform = `scaleX(${1 - st.hitCd / 0.42})`;
  cdBars.F.style.transform = `scaleX(${1 - st.stompCd / 1.6})`;
  cdBars.R.style.transform = `scaleX(${1 - st.roarCd / 3})`;

  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i];
    p.t += dt;
    if (p.t > 1.4) { p.el.remove(); popups.splice(i, 1); continue; }
    const s = p.pos.clone().add(new THREE.Vector3(0, p.t * 2.5, 0)).project(camera);
    if (s.z > 1) { p.el.style.display = 'none'; continue; }
    p.el.style.display = '';
    p.el.style.left = `${(s.x * 0.5 + 0.5) * window.innerWidth}px`;
    p.el.style.top = `${(-s.y * 0.5 + 0.5) * window.innerHeight}px`;
    const sc = p.t < 0.15 ? 0.5 + p.t / 0.15 * 0.7 : 1.2 - Math.min(0.2, (p.t - 0.15));
    p.el.style.transform = `translate(-50%,-50%) scale(${sc})`;
    p.el.style.opacity = String(Math.min(1, (1.4 - p.t) / 0.4));
  }
  const lambo = traffic.lambo;
  const lamboShow = lambo.active && !lambo.wrecked;
  lamboEl.classList.toggle('show', lamboShow);
  if (lamboShow) {
    const vx = lambo.body.position.x - bearPos.x, vz = lambo.body.position.z - bearPos.z;
    const fx_ = Math.sin(camYaw), fz_ = Math.cos(camYaw);
    const ang = Math.atan2(vx * -fz_ + vz * fx_, vx * fx_ + vz * fz_);
    lamboArrow.style.transform = `rotate(${ang}rad)`;
    lamboText.textContent = `💰 Lamborghini ${Math.round(Math.hypot(vx, vz))} m`;
  }
  minimap.draw(bearPos, camYaw, st.yaw, who, lamboShow ? lambo.body.position : null);
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) bannerEl.classList.remove('show'); }
}

camTarget.copy(bearBody.position);
camPos.set(bearBody.position.x, 8, bearBody.position.z - 14);
function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.__game = { drive, enterNearest: () => { const c = nearestCar(50); if (c) enterCar(c); return !!c; }, setCamYaw: (v) => (camYaw = v), get body() { return bearBody; }, get who() { return who; }, people, setLambo: (v) => (lamboTimer = v), st, bearBody, city, traffic, world, renderer, scene, camera, get score() { return score; } };
