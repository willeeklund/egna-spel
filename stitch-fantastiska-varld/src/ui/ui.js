import * as THREE from 'three';
import { rockType } from '../models/rockFood.js';
import { PALETTES } from '../models/stitch.js';
import { LOW, setGraphics } from '../core/quality.js';

const PROFILE_KEY = 'stitch-fantastiska-varld-profil';

const html = /* html */ `
  <div class="start" id="start">
    <div class="start-card">
      <div class="start-stars">✦ ✧ ✦</div>
      <h1>Stitch<br/><span>fantastiska värld</span></h1>
      <p>Hjälp Stitch att skjuta upp raketer, samla stjärnor och handla god stenmat i de flygande butikerna!</p>
      <div class="profile">
        <label class="name-label">Vad heter din Stitch?
          <input id="nameInput" maxlength="12" autocomplete="off" spellcheck="false" placeholder="Stitch" />
        </label>
        <div class="swatch-title">Välj färg <kbd>←</kbd> <kbd>→</kbd></div>
        <div class="swatches" id="swatches"></div>
      </div>
      <button id="play" class="big-btn" disabled>Laddar…</button>
      <p class="start-hint">Tryck <kbd>Enter</kbd> eller klicka för att börja</p>
      <button id="graphicsToggle" class="graphics-toggle" tabindex="-1"></button>
    </div>
  </div>

  <div class="hud" id="hud">
    <div class="hud-left">
      <div class="pill stars"><span class="icon">⭐</span><span id="starCount">0</span></div>
      <div class="pill backpack" id="backpack"><span class="icon">🎒</span><span id="backpackItems" class="items"></span></div>
      <div class="pill cart hidden" id="cart"><span class="icon">🧺</span><span id="cartItems" class="items"></span></div>
    </div>
    <div class="hud-right">
      <button class="round" id="btnSound" data-key="sound" aria-label="Ljud"><span id="soundIcon">🔊</span><kbd>M</kbd></button>
      <button class="round" id="btnCam" data-key="cam" aria-label="Kamera">🎥<kbd>C</kbd></button>
      <button class="round" id="btnHelp" data-key="help" aria-label="Hjälp">❓<kbd>H</kbd></button>
    </div>
  </div>

  <div class="quest" id="quest">
    <div class="quest-top"><span class="quest-num" id="questNum">Uppdrag 1</span><span class="quest-timer hidden" id="questTimer">⏱️ 40</span></div>
    <div class="quest-main"><span class="quest-icon" id="questIcon">⛲</span><span id="questText"></span></div>
    <div class="quest-bar"><div class="quest-fill" id="questFill"></div><span id="questCount">0/1</span></div>
  </div>
  <div class="celebrate hidden" id="celebrate">
    <div class="cel-card">
      <div class="cel-icon" id="celIcon">🎉</div>
      <div class="cel-title">Uppdrag klart!</div>
      <div class="cel-text" id="celText"></div>
      <div class="cel-reward" id="celReward">+2 ⭐</div>
    </div>
  </div>
  <div class="toast" id="toast"></div>
  <div class="location" id="location"></div>

  <div class="dpad" id="dpad">
    <button data-k="up" data-key="up" class="dir up" aria-label="Framåt">▲<kbd>↑</kbd></button>
    <button data-k="left" data-key="left" class="dir left" aria-label="Vänster">◀<kbd>←</kbd></button>
    <button data-k="right" data-key="right" class="dir right" aria-label="Höger">▶<kbd>→</kbd></button>
    <button data-k="down" data-key="down" class="dir down" aria-label="Bakåt">▼<kbd>↓</kbd></button>
  </div>

  <div class="actions">
    <button class="context hidden" id="btnUse" data-key="use"><span class="ctx-icon" id="useIcon">🚪</span><span id="useLabel">Gå in</span><kbd>E</kbd></button>
    <div class="action-row">
      <button class="act eat empty" id="btnEat" data-key="eat"><span>😋</span><small>Ät</small><kbd>Q</kbd></button>
      <button class="act hit" data-k="hit" data-key="hit" id="btnHit"><span>👊</span><small>Slå</small><kbd>F</kbd></button>
      <button class="act jump" data-k="jump" data-key="jump" id="btnJump"><span>⬆️</span><small>Hoppa</small><kbd>Mellanslag</kbd></button>
    </div>
  </div>

  <div class="bubbles" id="bubbles"></div>
  <div class="fade" id="fade"></div>

  <div class="help hidden" id="help">
    <div class="help-card">
      <h2>Så spelar du</h2>
      <ul>
        <li><b>▲ ▼</b> gå framåt och bakåt</li>
        <li><b>◀ ▶</b> svänga</li>
        <li><b>⬆️ Hoppa</b> hoppa högt!</li>
        <li><b>👊 Slå</b> slå på en raket så flyger den upp! Du kan också sparka bollar och lådor.</li>
        <li><b>Den stora knappen</b> dyker upp när du kan göra något: gå in, handla, betala…</li>
        <li><b>😋 Ät</b> äter en sten från ryggsäcken 🎒. Stenar får du i butikerna, i kylen i husen eller på bordet i husen.</li>
        <li><b>📜 Uppdrag</b> står högst upp. Den gula pilen över Stitch visar vart du ska gå!</li>
        <li><b>🐰 Pluppar</b> hoppar runt – spring ikapp dem så följer de med dig.</li>
        <li><b>👽 Rymdvänner</b> har en pratbubbla med maten de vill ha. Ge dem maten så får du massor av ⭐.</li>
        <li>Samla <b>⭐ stjärnor</b> ute för att kunna handla.</li>
      </ul>
      <table class="keys">
        <tr><td><kbd>↑</kbd> <kbd>↓</kbd> eller <kbd>W</kbd> <kbd>S</kbd></td><td>gå framåt / bakåt</td></tr>
        <tr><td><kbd>←</kbd> <kbd>→</kbd> eller <kbd>A</kbd> <kbd>D</kbd></td><td>svänga</td></tr>
        <tr><td><kbd>Mellanslag</kbd></td><td>hoppa</td></tr>
        <tr><td><kbd>F</kbd></td><td>slå</td></tr>
        <tr><td><kbd>E</kbd> eller <kbd>Enter</kbd></td><td>den stora lila knappen</td></tr>
        <tr><td><kbd>Q</kbd></td><td>äta en sten</td></tr>
        <tr><td><kbd>M</kbd></td><td>ljud av/på</td></tr>
        <tr><td><kbd>C</kbd></td><td>byta kamera</td></tr>
        <tr><td><kbd>H</kbd></td><td>visa/stänga hjälpen</td></tr>
      </table>
      <button class="big-btn" id="helpClose">Okej! <kbd>Enter</kbd></button>
      <button class="reset-btn" id="resetBtn">Börja om från början</button>
    </div>
  </div>
`;

export class UI {
  constructor(root) {
    root.innerHTML = html;
    this.$ = (id) => root.querySelector('#' + id);
    this.input = { up: false, down: false, left: false, right: false, jump: false, hit: false, use: false, eat: false };
    this.bubbles = [];
    this.toastTimer = null;
    this.helpOpen = false;
    this.onSound = null;
    this.onCam = null;

    const MIN_MOVE_MS = 350;
    const hold = (el, key) => {
      const isDir = ['up', 'down', 'left', 'right'].includes(key);
      let downAt = 0;
      let releaseTimer = null;
      const on = (e) => {
        e.preventDefault();
        el.setPointerCapture?.(e.pointerId);
        clearTimeout(releaseTimer);
        downAt = performance.now();
        this.input[key] = true;
        el.classList.add('pressed');
      };
      const off = (e) => {
        e.preventDefault();
        if (!el.classList.contains('pressed')) return;
        el.classList.remove('pressed');
        if (!isDir) return;
        const left = MIN_MOVE_MS - (performance.now() - downAt);
        if (left > 0) releaseTimer = setTimeout(() => (this.input[key] = false), left);
        else this.input[key] = false;
      };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('lostpointercapture', off);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    };
    root.querySelectorAll('[data-k]').forEach((el) => hold(el, el.dataset.k));
    root.querySelectorAll('button').forEach((b) => b.setAttribute('tabindex', '-1'));

    const actions = {
      use: () => (this.input.use = true),
      eat: () => (this.input.eat = true),
      sound: () => this.onSound?.(),
      cam: () => this.onCam?.(),
      help: () => this.toggleHelp(),
    };
    for (const [key, fn] of Object.entries(actions)) {
      const el = root.querySelector(`[data-key="${key}"]`);
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.classList.add('pressed');
        fn();
      });
      el.addEventListener('pointerup', () => el.classList.remove('pressed'));
      el.addEventListener('pointerleave', () => el.classList.remove('pressed'));
    }
    this.$('helpClose').addEventListener('click', () => this.toggleHelp(false));
    this.$('resetBtn').addEventListener('click', () => {
      if (confirm('Vill du börja om från början? Alla stjärnor och uppdrag försvinner.')) this.onReset?.();
    });

    const flash = (key, on) => {
      const el = root.querySelector(`[data-key="${key}"]`);
      if (el) el.classList.toggle('pressed', on);
    };
    const keymap = {
      ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      Space: 'jump', KeyF: 'hit', KeyE: 'use', Enter: 'use', NumpadEnter: 'use', KeyQ: 'eat',
      KeyM: 'sound', KeyC: 'cam', KeyH: 'help',
    };
    const held = ['up', 'down', 'left', 'right'];
    window.addEventListener('keydown', (e) => {
      const start = this.$('start');
      if (start && !start.classList.contains('gone')) {
        const typing = e.target && e.target.tagName === 'INPUT';
        if (e.code === 'Enter' || e.code === 'NumpadEnter' || (e.code === 'Space' && !typing)) {
          e.preventDefault();
          this.$('play').click();
        } else if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && !(typing && e.target.value)) {
          e.preventDefault();
          this.cyclePalette(e.code === 'ArrowLeft' ? -1 : 1);
        }
        return;
      }
      if (this.helpOpen) {
        if (['Escape', 'Enter', 'NumpadEnter', 'Space', 'KeyH'].includes(e.code)) {
          e.preventDefault();
          this.toggleHelp(false);
        }
        return;
      }
      const k = keymap[e.code];
      if (!k) return;
      e.preventDefault();
      flash(k, true);
      if (e.repeat && !held.includes(k)) return;
      if (actions[k]) actions[k]();
      else this.input[k] = true;
    });
    window.addEventListener('keyup', (e) => {
      const k = keymap[e.code];
      if (!k) return;
      flash(k, false);
      if (held.includes(k)) this.input[k] = false;
    });
    window.addEventListener('blur', () => {
      for (const k of held) this.input[k] = false;
    });
  }

  toggleHelp(open = !this.helpOpen) {
    this.helpOpen = open;
    this.$('help').classList.toggle('hidden', !open);
    if (open) for (const k of ['up', 'down', 'left', 'right']) this.input[k] = false;
  }

  consume(key) {
    const v = this.input[key];
    this.input[key] = false;
    return v;
  }

  loadProfile() {
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null') || {};
    } catch {
      return {};
    }
  }

  cyclePalette(dir) {
    const keys = Object.keys(PALETTES);
    const i = keys.indexOf(this.palette);
    this.selectPalette(keys[(i + dir + keys.length) % keys.length]);
  }

  selectPalette(key) {
    this.palette = key;
    this.$('swatches').querySelectorAll('button').forEach((b) => b.classList.toggle('selected', b.dataset.p === key));
  }

  ready(onPlay) {
    const profile = this.loadProfile();
    const input = this.$('nameInput');
    input.value = profile.name || '';
    const sw = this.$('swatches');
    for (const [key, p] of Object.entries(PALETTES)) {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.dataset.p = key;
      b.style.setProperty('--c', p.css);
      b.title = p.name;
      b.setAttribute('tabindex', '-1');
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.selectPalette(key);
      });
      sw.appendChild(b);
    }
    this.selectPalette(PALETTES[profile.palette] ? profile.palette : 'blå');

    const gfx = this.$('graphicsToggle');
    gfx.textContent = LOW ? '🐢 Enkel grafik – tryck för fin' : '✨ Fin grafik – tryck för enkel';
    gfx.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      setGraphics(LOW ? 'fin' : 'enkel');
    });

    const btn = this.$('play');
    btn.disabled = false;
    btn.textContent = 'Spela! 🚀';
    btn.addEventListener('click', () => {
      const name = input.value.trim() || 'Stitch';
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, palette: this.palette })); } catch {}
      input.blur();
      this.$('start').classList.add('gone');
      setTimeout(() => this.$('start').remove(), 800);
      onPlay({ name, palette: this.palette });
    });
  }

  setStars(n) {
    const el = this.$('starCount');
    el.textContent = n;
    el.parentElement.classList.remove('bump');
    void el.parentElement.offsetWidth;
    el.parentElement.classList.add('bump');
  }

  setBackpack(items) {
    this.$('backpackItems').innerHTML = items.length ? items.map((id) => `<span>${rockType(id).emoji}</span>`).join('') : '<em>tom</em>';
    const eat = this.$('btnEat');
    const wasEmpty = eat.classList.contains('empty');
    eat.classList.toggle('empty', items.length === 0);
    if (wasEmpty && items.length) {
      eat.classList.remove('wiggle');
      void eat.offsetWidth;
      eat.classList.add('wiggle');
    }
  }

  setQuest({ number, icon, text, progress, goal, timeLeft, timerRunning }) {
    this.$('questNum').textContent = `📜 Uppdrag ${number}`;
    this.$('questIcon').textContent = icon;
    this.$('questText').textContent = text;
    this.$('questCount').textContent = `${progress}/${goal}`;
    this.$('questFill').style.width = `${(progress / goal) * 100}%`;
    const t = this.$('questTimer');
    t.classList.toggle('hidden', timeLeft === null);
    t.classList.toggle('running', !!timerRunning);
    if (timeLeft !== null) t.textContent = `⏱️ ${timeLeft} s`;
  }

  celebrate(icon, text, reward) {
    const el = this.$('celebrate');
    this.$('celIcon').textContent = icon;
    this.$('celText').textContent = text;
    this.$('celReward').textContent = `+${reward} ⭐`;
    el.classList.remove('hidden', 'show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this.celTimer);
    this.celTimer = setTimeout(() => el.classList.add('hidden'), 2700);
  }

  setCart(items, visible) {
    this.$('cart').classList.toggle('hidden', !visible);
    this.$('cartItems').innerHTML = items.length ? items.map((id) => `<span>${rockType(id).emoji}</span>`).join('') : '<em>tom</em>';
  }

  setContext(item) {
    const b = this.$('btnUse');
    if (!item) {
      b.classList.add('hidden');
      return;
    }
    b.classList.remove('hidden');
    this.$('useIcon').textContent = typeof item.icon === 'function' ? item.icon() : item.icon;
    this.$('useLabel').textContent = item.label();
  }

  setSound(on) { this.$('soundIcon').textContent = on ? '🔊' : '🔇'; }

  setLocation(text) {
    const el = this.$('location');
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  toast(text, ms = 2600) {
    const el = this.$('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  say(getPos, text, ms = 2200) {
    const el = document.createElement('div');
    el.className = 'bubble-anchor';
    el.style.display = 'none';
    const inner = document.createElement('div');
    inner.className = 'bubble';
    inner.textContent = text;
    el.appendChild(inner);
    this.$('bubbles').appendChild(el);
    const b = { el, getPos, until: performance.now() + ms };
    this.bubbles.push(b);
    return b;
  }

  updateBubbles(camera, w, h) {
    const now = performance.now();
    const v = new THREE.Vector3();
    this.bubbles = this.bubbles.filter((b) => {
      if (now > b.until) {
        b.el.classList.add('out');
        setTimeout(() => b.el.remove(), 300);
        return false;
      }
      v.copy(b.getPos()).project(camera);
      const visible = v.z < 1;
      b.el.style.display = visible ? 'block' : 'none';
      b.el.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
      return true;
    });
  }

  fade(mid, { hold = 150, dur = 450 } = {}) {
    const el = this.$('fade');
    el.style.transitionDuration = dur + 'ms';
    el.classList.add('on');
    return new Promise((res) => {
      setTimeout(async () => {
        await mid?.();
        setTimeout(() => {
          el.classList.remove('on');
          res();
        }, hold);
      }, dur);
    });
  }
}
