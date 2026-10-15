export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicTimer = null;
    this.scale = 1;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, delay = 0, attack = 0.005 } = {}) {
    if (!this.ctx || this.scale <= 0.01) return;
    vol *= this.scale;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(dur, { vol = 0.3, freq = 1000, q = 1, type = 'lowpass', delay = 0, sweepTo = null } = {}) {
    if (!this.ctx || this.scale <= 0.01) return;
    vol *= this.scale;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  jump() { this.tone(300, 0.25, { type: 'sine', slide: 500, vol: 0.25 }); }
  boing() {
    this.tone(160, 0.5, { type: 'sine', slide: 600, vol: 0.35 });
    this.tone(320, 0.4, { type: 'triangle', slide: 900, vol: 0.12, delay: 0.03 });
  }
  punch() {
    this.noise(0.12, { vol: 0.35, freq: 1800, type: 'bandpass', q: 0.8 });
    this.tone(120, 0.15, { type: 'sine', slide: -60, vol: 0.4 });
  }
  whack() {
    this.noise(0.2, { vol: 0.5, freq: 900, type: 'bandpass', q: 1.2 });
    this.tone(90, 0.3, { type: 'square', slide: -40, vol: 0.2 });
  }
  launch() {
    this.noise(3.2, { vol: 0.5, freq: 200, sweepTo: 2500, type: 'lowpass' });
    this.tone(60, 3, { type: 'sawtooth', slide: 120, vol: 0.12, attack: 0.3 });
  }
  land() { this.noise(0.6, { vol: 0.3, freq: 400, type: 'lowpass' }); }
  coin() {
    this.tone(988, 0.1, { type: 'square', vol: 0.12 });
    this.tone(1319, 0.3, { type: 'square', vol: 0.12, delay: 0.08 });
  }
  pop() { this.tone(600, 0.12, { type: 'sine', slide: 400, vol: 0.25 }); }
  crunch() {
    for (let i = 0; i < 5; i++) this.noise(0.08, { vol: 0.4, freq: 2500 + Math.random() * 1500, type: 'bandpass', q: 2, delay: i * 0.13 });
  }
  chaChing() {
    this.noise(0.15, { vol: 0.25, freq: 6000, type: 'highpass' });
    this.tone(1568, 0.15, { type: 'triangle', vol: 0.2, delay: 0.1 });
    this.tone(2093, 0.5, { type: 'triangle', vol: 0.2, delay: 0.2 });
  }
  whoosh() { this.noise(0.6, { vol: 0.3, freq: 300, sweepTo: 3000, type: 'bandpass', q: 1 }); }
  door() {
    this.tone(500, 0.15, { type: 'sine', vol: 0.2 });
    this.tone(750, 0.25, { type: 'sine', vol: 0.2, delay: 0.12 });
  }
  sad() {
    this.tone(400, 0.25, { type: 'triangle', vol: 0.2, slide: -100 });
    this.tone(300, 0.4, { type: 'triangle', vol: 0.2, slide: -100, delay: 0.22 });
  }
  yay() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.18, delay: i * 0.09 }));
  }
  fanfare() {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => {
      this.tone(f, i === 6 ? 0.7 : 0.18, { type: 'square', vol: 0.09, delay: i * 0.11 });
      this.tone(f / 2, 0.2, { type: 'triangle', vol: 0.12, delay: i * 0.11 });
    });
  }
  snore() { this.noise(1.4, { vol: 0.15, freq: 300, sweepTo: 150, type: 'lowpass' }); }

  get musicPlaying() { return !!this.musicTimer; }

  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const C = 261.63;
    const st = (n) => C * Math.pow(2, n / 12);
    const melody = [7, 9, 12, 9, 7, 4, 7, null, 5, 7, 9, 7, 5, 2, 4, null, 7, 9, 12, 14, 12, 9, 7, 4, 5, 4, 2, 4, 0, null, 0, null];
    const bass = [0, 0, 5, 5, 7, 7, 0, 0];
    const beat = 0.2;
    let step = 0;
    const tick = () => {
      const n = melody[step % melody.length];
      if (n !== null) {
        this.tone(st(n), 0.35, { type: 'triangle', vol: 0.16 });
        this.tone(st(n + 12), 0.15, { type: 'sine', vol: 0.04 });
      }
      if (step % 4 === 0) this.tone(st(bass[(step / 4) % bass.length] - 12), 0.6, { type: 'sine', vol: 0.22 });
      if (step % 2 === 1) this.noise(0.05, { vol: 0.06, freq: 8000, type: 'highpass' });
      step++;
    };
    tick();
    this.musicTimer = setInterval(tick, beat * 1000);
  }

  stopMusic() {
    clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}
