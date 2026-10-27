import type { Game } from './game';
import { sound } from '../engine/audio';

const LEFT = new Set(['KeyZ', 'ShiftLeft', 'ArrowLeft', 'KeyA']);
const RIGHT = new Set(['Slash', 'ShiftRight', 'ArrowRight', 'KeyL']);
const PLUNGER = new Set(['Space', 'ArrowDown', 'Enter', 'NumpadEnter']);

export function bindInput(game: Game, canvas: HTMLCanvasElement) {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) {
      if (LEFT.has(e.code) || RIGHT.has(e.code) || PLUNGER.has(e.code)) e.preventDefault();
      return;
    }
    if (LEFT.has(e.code)) game.setFlipper(-1, true);
    else if (RIGHT.has(e.code)) game.setFlipper(1, true);
    else if (PLUNGER.has(e.code)) {
      if (game.state === 'play') game.setPlunger(true);
      else game.start();
    } else if (e.code === 'KeyX' || e.code === 'KeyN') game.nudge();
    else if (e.code === 'KeyM') sound.setMuted(!sound.muted);
    else if (e.code === 'KeyP' || e.code === 'Escape') game.togglePause();
    else if (e.code === 'KeyS') game.start();
    else return;
    e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    if (LEFT.has(e.code)) game.setFlipper(-1, false);
    else if (RIGHT.has(e.code)) game.setFlipper(1, false);
    else if (PLUNGER.has(e.code)) game.setPlunger(false);
  });

  // Touch / mouse: left half = left flipper, right half = right flipper.
  // While a ball waits in the shooter lane, the right half pulls the plunger.
  const active = new Map<number, 'L' | 'R' | 'P'>();
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    sound.unlock();
    if (game.paused) {
      game.togglePause();
      return;
    }
    if (game.state !== 'play') {
      game.start();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const right = e.clientX - rect.left > rect.width / 2;
    if (right && game.ballInShooter() && game.active === game.main) {
      active.set(e.pointerId, 'P');
      game.setPlunger(true);
    } else {
      active.set(e.pointerId, right ? 'R' : 'L');
      game.setFlipper(right ? 1 : -1, true);
    }
  });
  const release = (e: PointerEvent) => {
    const what = active.get(e.pointerId);
    if (!what) return;
    active.delete(e.pointerId);
    if (what === 'P') game.setPlunger(false);
    else if (![...active.values()].includes(what)) game.setFlipper(what === 'L' ? -1 : 1, false);
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Shake the phone to nudge.
  let lastShake = 0;
  window.addEventListener('devicemotion', (e) => {
    const a = e.acceleration;
    if (!a || a.x === null || a.y === null) return;
    const mag = Math.hypot(a.x, a.y ?? 0, a.z ?? 0);
    if (mag > 18 && performance.now() - lastShake > 600) {
      lastShake = performance.now();
      game.nudge();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === 'play' && !game.paused) game.togglePause();
  });
}
