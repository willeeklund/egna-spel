let ctx, master, noiseBuf;
const last = {};

export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.45;
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function throttle(key, ms) {
  const now = performance.now();
  if (last[key] && now - last[key] < ms) return true;
  last[key] = now;
  return false;
}

function env(gain, t, attack, dur, peak) {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function noise(dur, { freq = 1000, type = 'lowpass', gain = 0.4, q = 1, attack = 0.005, delay = 0 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  env(g, t, attack, dur, gain);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random()); src.stop(t + dur + 0.05);
}

function tone(f0, f1, dur, { type = 'sine', gain = 0.3, attack = 0.005, delay = 0 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain();
  env(g, t, attack, dur, gain);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

let fountainGain;
function ensureFountain() {
  if (fountainGain || !ctx) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf; src.loop = true;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
  const bp = ctx.createBiquadFilter(); bp.type = 'peaking'; bp.frequency.value = 2500; bp.gain.value = 6;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.35;
  const lg = ctx.createGain(); lg.gain.value = 0.02;
  fountainGain = ctx.createGain(); fountainGain.gain.value = 0;
  const wob = ctx.createGain(); wob.gain.value = 0.06;
  lfo.connect(lg).connect(wob.gain);
  src.connect(hp).connect(bp).connect(wob).connect(fountainGain).connect(master);
  src.start(); lfo.start();
}

let engine;
function ensureEngine() {
  if (engine || !ctx) return;
  const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
  const o2 = ctx.createOscillator(); o2.type = 'square';
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; f.Q.value = 3;
  const g = ctx.createGain(); g.gain.value = 0;
  const g2 = ctx.createGain(); g2.gain.value = 0.4;
  o1.connect(f); o2.connect(g2).connect(f); f.connect(g).connect(master);
  o1.start(); o2.start();
  engine = { o1, o2, f, g };
}

export const sfx = {
  engine(on, speed = 0, turbo = false) {
    ensureEngine();
    if (!engine) return;
    const t = ctx.currentTime;
    const rpm = 45 + Math.abs(speed) * 4.5 + (turbo ? 25 : 0);
    engine.o1.frequency.setTargetAtTime(rpm, t, 0.08);
    engine.o2.frequency.setTargetAtTime(rpm * 0.5, t, 0.08);
    engine.f.frequency.setTargetAtTime(300 + Math.abs(speed) * 40, t, 0.1);
    engine.g.gain.setTargetAtTime(on ? 0.11 : 0, t, 0.15);
  },
  door() { tone(180, 90, 0.12, { type: 'square', gain: 0.15 }); noise(0.08, { freq: 800, gain: 0.3, delay: 0.02 }); },
  skid() { if (!throttle('skid', 300)) noise(0.4, { freq: 1800, type: 'bandpass', gain: 0.18, q: 6 }); },
  fountainVolume(v) {
    ensureFountain();
    if (fountainGain) fountainGain.gain.setTargetAtTime(v * 2.2, ctx.currentTime, 0.2);
  },
  swing() { noise(0.18, { freq: 1800, type: 'bandpass', gain: 0.25, attack: 0.05 }); },
  hit() {
    if (throttle('hit', 50)) return;
    tone(160, 45, 0.25, { gain: 0.8 });
    noise(0.15, { freq: 900, gain: 0.45 });
  },
  crash() {
    if (throttle('crash', 70)) return;
    noise(0.7, { freq: 2500, type: 'highpass', gain: 0.25 });
    noise(0.35, { freq: 500, gain: 0.5 });
    tone(110, 35, 0.4, { type: 'triangle', gain: 0.5 });
  },
  wood() {
    if (throttle('wood', 60)) return;
    tone(320, 120, 0.12, { type: 'triangle', gain: 0.4 });
    noise(0.12, { freq: 1400, type: 'bandpass', gain: 0.3, q: 3 });
  },
  metal() {
    if (throttle('metal', 60)) return;
    tone(900, 600, 0.35, { type: 'square', gain: 0.08 });
    tone(1350, 1100, 0.3, { type: 'sine', gain: 0.15 });
    noise(0.1, { freq: 3000, type: 'highpass', gain: 0.2 });
  },
  splash() { if (!throttle('splash', 220)) noise(0.3, { freq: 700 + Math.random() * 500, type: 'bandpass', gain: 0.3, q: 1.2 }); },
  rumble() {
    tone(60, 25, 2.5, { gain: 0.9, attack: 0.1 });
    noise(2.8, { freq: 180, gain: 1.0, attack: 0.15 });
    noise(1.5, { freq: 2200, type: 'highpass', gain: 0.15, delay: 0.3 });
  },
  stomp() {
    tone(90, 22, 0.9, { gain: 1.0 });
    noise(0.8, { freq: 260, gain: 0.8, attack: 0.01 });
    noise(0.4, { freq: 2000, type: 'highpass', gain: 0.12, delay: 0.05 });
  },
  roar() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(95, t);
    o.frequency.linearRampToValueAtTime(130, t + 0.3);
    o.frequency.linearRampToValueAtTime(70, t + 1.4);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 28;
    const lg = ctx.createGain(); lg.gain.value = 18;
    lfo.connect(lg).connect(o.frequency);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + 0.12);
    g.gain.setValueAtTime(0.7, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    o.connect(f).connect(g).connect(master);
    o.start(t); lfo.start(t); o.stop(t + 1.6); lfo.stop(t + 1.6);
    noise(1.4, { freq: 450, gain: 0.5, attack: 0.1, q: 2 });
  },
  honk() {
    if (throttle('honk', 250)) return;
    tone(392, 392, 0.35, { type: 'square', gain: 0.07 });
    tone(494, 494, 0.35, { type: 'square', gain: 0.07 });
  },
  alarm() {
    if (throttle('alarm', 400)) return;
    for (let i = 0; i < 6; i++) tone(i % 2 ? 700 : 950, i % 2 ? 700 : 950, 0.14, { type: 'square', gain: 0.06, delay: i * 0.16 });
  },
  jump() { tone(180, 360, 0.18, { type: 'triangle', gain: 0.25 }); },
  land() { if (!throttle('land', 150)) tone(120, 50, 0.15, { gain: 0.4 }); },
  ding(n = 0) {
    if (throttle('ding', 70)) return;
    const b = 660 * Math.pow(1.06, Math.min(n, 12));
    tone(b, b * 1.5, 0.15, { gain: 0.18 });
  },
  water() { noise(1.2, { freq: 3500, type: 'highpass', gain: 0.15, attack: 0.05 }); },
  scream() {
    if (throttle('scream', 350)) return;
    const f = 500 + Math.random() * 300;
    tone(f, f * 1.6, 0.25, { type: 'triangle', gain: 0.12 });
    tone(f * 1.6, f * 1.2, 0.45, { type: 'triangle', gain: 0.1, delay: 0.25 });
  },
  gulp() {
    if (throttle('gulp', 250)) return;
    tone(320, 140, 0.12, { gain: 0.35 });
    tone(260, 120, 0.1, { gain: 0.25, delay: 0.13 });
  },
  cash() {
    [1318, 1568, 2093, 2637].forEach((f, i) => tone(f, f, 0.18, { type: 'square', gain: 0.06, delay: i * 0.07 }));
    noise(0.4, { freq: 6000, type: 'highpass', gain: 0.1, delay: 0.2 });
  },
  squeak() {
    if (throttle('squeak', 120)) return;
    tone(2200, 3200, 0.08, { type: 'sine', gain: 0.18 });
    tone(2600, 3600, 0.1, { type: 'sine', gain: 0.15, delay: 0.1 });
  },
  chomp() {
    for (let i = 0; i < 3; i++) noise(0.06, { freq: 1500, type: 'bandpass', gain: 0.35, q: 2, delay: i * 0.11 });
  },
  bubble() {
    if (throttle('bubble', 90)) return;
    const f = 900 + Math.random() * 900;
    tone(f, f * 1.8, 0.06, { gain: 0.08 });
  },
  hum() {
    if (throttle('hum', 1800)) return;
    const notes = [392, 440, 494, 440, 392, 330];
    notes.forEach((f, i) => tone(f * 0.5, f * 0.5, 0.22, { type: 'triangle', gain: 0.12, delay: i * 0.24, attack: 0.03 }));
  },
  mission() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.25, { type: 'triangle', gain: 0.3, delay: i * 0.11 }));
  },
};
