import { Game } from './game/game';
import { bindInput } from './game/input';
import { sound } from './engine/audio';
import './style.css';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: false })!;
const game = new Game();
bindInput(game, canvas);

let cw = 0;
let ch = 0;
let dpr = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cw = window.innerWidth;
  ch = window.innerHeight;
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  canvas.style.width = `${cw}px`;
  canvas.style.height = `${ch}px`;
}
window.addEventListener('resize', resize);
resize();

const muteBtn = document.getElementById('mute') as HTMLButtonElement | null;
muteBtn?.addEventListener('click', () => {
  sound.unlock();
  sound.setMuted(!sound.muted);
  muteBtn.textContent = sound.muted ? '🔇' : '🔊';
});

let last = performance.now();
function frame(now: number) {
  const dt = (now - last) / 1000;
  last = now;
  game.update(dt);
  game.render(ctx, cw, ch, dpr);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Expose for debugging in the console.
(window as unknown as { game: Game }).game = game;
