import RAPIER from '@dimforge/rapier3d-compat';
import { Game } from './game.js';

async function boot() {
  await RAPIER.init();
  await document.fonts?.ready;
  const game = new Game(RAPIER, document.getElementById('app'), document.getElementById('ui'));
  window.__game = game;
  const loop = () => {
    requestAnimationFrame(loop);
    try {
      game.update();
    } catch (e) {
      console.error(e);
    }
  };
  loop();
  game.ui.ready(() => game.start());
}

boot();
