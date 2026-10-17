import RAPIER from '@dimforge/rapier3d-compat';
import { Game } from './game.js';
import { startUpdateCheck } from './updateCheck.js';
import { setGraphics, watchFrameRate } from './core/quality.js';

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
  watchFrameRate(() => setGraphics('enkel'));
  game.ui.ready((profile) => game.start(profile));
}

startUpdateCheck();
boot();
