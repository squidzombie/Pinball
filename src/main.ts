import { Capacitor, registerPlugin } from '@capacitor/core';
import { Game } from './game/game';
import { bindInput } from './game/input';
import { sound } from './engine/audio';
import { TABLE_H, TABLE_W, Table } from './game/tables/table';
import './style.css';

// The playfield canvas is tilted away from the player with a CSS 3D transform,
// like looking down a real cabinet. The DMD sits upright above it in the backbox.
// Tall phone screens get a shallower tilt so the table fills the height.
const TILT_MAX = (30 * Math.PI) / 180;
const TILT_MIN = (20 * Math.PI) / 180;
/** Camera distance, in table heights. Smaller = stronger perspective. */
const CAMERA = 1.7;
const DMD_ASPECT = 4;

const tableCanvas = document.getElementById('table') as HTMLCanvasElement;
const dmdCanvas = document.getElementById('dmd') as HTMLCanvasElement;
const overlay = document.getElementById('overlay') as HTMLDivElement;
const muteBtn = document.getElementById('mute') as HTMLButtonElement | null;
const speedBtn = document.getElementById('speed') as HTMLButtonElement | null;
// The app, and any touch-first phone or tablet, shows the touch controls on the start screen; a
// computer shows the keys.
const native = Capacitor.isNativePlatform();
if (native || matchMedia('(hover: none) and (pointer: coarse)').matches) document.documentElement.classList.add('touch');

// The game manual. In the app it opens in iOS's own document viewer (a link would replace the game,
// with no way back); on the web the link opens the PDF in a new tab.
const Manual = registerPlugin<{ show(): Promise<void> }>('Manual');
document.getElementById('manual')?.addEventListener('click', (e) => {
  if (!native) return;
  e.preventDefault();
  void Manual.show().catch(() => {});
});

const tctx = tableCanvas.getContext('2d', { alpha: false })!;
const dctx = dmdCanvas.getContext('2d', { alpha: false })!;
const game = new Game();

const params = new URLSearchParams(location.search);
let tilted = !params.has('flat');
Table.debug = params.has('debug');
let dpr = 1;
let tableW = 0;
let dmdW = 0;
let dmdH = 0;

function safeInsets() {
  const probe = document.getElementById('safe')!;
  const cs = getComputedStyle(probe);
  return { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 };
}

function layout() {
  // 2× is sharp on a phone; 3× screens would draw over twice the pixels each frame for little gain.
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = window.innerWidth;
  const safe = safeInsets();
  const MARGIN = 6;
  const ch = window.innerHeight - safe.top - safe.bottom - MARGIN * 2;
  const aspect = TABLE_H / TABLE_W;
  const cam = CAMERA * aspect; // in table widths
  const dmdRel = 1 / DMD_ASPECT;
  const gap = 0.025;
  /** Visible playfield height per unit of table width at a given tilt. */
  const proj = (t: number) => aspect * Math.cos(t) * (cam / (cam + aspect * Math.sin(t)));
  let tilt = TILT_MAX;
  while (tilted && tilt > TILT_MIN && dmdRel + gap + proj(tilt - 0.01) <= ch / cw) tilt -= 0.01;
  const projH = tilted ? proj(tilt) : aspect;
  const W = Math.floor(Math.min(cw, ch / (dmdRel + gap + projH)));
  const top = safe.top + MARGIN + Math.max(0, (ch - W * (dmdRel + gap + projH)) / 2);
  const left = Math.round((cw - W) / 2);

  dmdW = W;
  dmdH = Math.round(W * dmdRel);
  Object.assign(dmdCanvas.style, { left: `${left}px`, top: `${top}px`, width: `${dmdW}px`, height: `${dmdH}px` });
  dmdCanvas.width = Math.round(dmdW * dpr);
  dmdCanvas.height = Math.round(dmdH * dpr);

  tableW = W;
  const H = W * aspect;
  const bottom = top + W * (dmdRel + gap + projH);
  Object.assign(tableCanvas.style, {
    left: `${left}px`,
    top: `${bottom - H}px`,
    width: `${W}px`,
    height: `${H}px`,
    transform: tilted ? `perspective(${cam * W}px) rotateX(${tilt}rad)` : 'none',
  });
  tableCanvas.width = Math.round(W * dpr);
  tableCanvas.height = Math.round(H * dpr);

  // Mute sits in the gap above the backbox if there is one, else in the corner.
  if (muteBtn) muteBtn.style.top = top - safe.top >= 46 ? `${safe.top + 6}px` : '';
  if (speedBtn) speedBtn.style.top = muteBtn?.style.top ?? '';

  // The overlay covers the visible (projected) playfield.
  Object.assign(overlay.style, { left: `${left}px`, top: `${top + W * (dmdRel + gap)}px`, width: `${W}px`, height: `${W * projH}px` });
}
window.addEventListener('resize', layout);
layout();

bindInput(game, () => {
  tilted = !tilted;
  layout();
});

muteBtn?.addEventListener('click', () => {
  sound.unlock();
  sound.setMuted(!sound.muted);
  muteBtn.textContent = sound.muted ? '🔇' : '🔊';
});

// Game speed: 100%, 90% or 80%, remembered on this device.
const SPEEDS = [1, 0.9, 0.8];
function setSpeed(s: number) {
  game.speed = s;
  if (speedBtn) speedBtn.textContent = `${Math.round(s * 100)}%`;
}
try {
  const saved = Number(localStorage.getItem('speed'));
  if (SPEEDS.includes(saved)) setSpeed(saved);
} catch {
  // no storage (private window): stay at 100%
}
speedBtn?.addEventListener('click', () => {
  const next = SPEEDS[(SPEEDS.indexOf(game.speed) + 1) % SPEEDS.length];
  setSpeed(next);
  try {
    localStorage.setItem('speed', String(next));
  } catch {
    // not remembered, but still applied
  }
});

let overlayMode = '';
function updateOverlay() {
  const mode = game.state === 'attract' ? 'attract' : game.paused ? 'paused' : '';
  if (mode === overlayMode) return;
  overlayMode = mode;
  overlay.className = mode;
}

let last = performance.now();
function frame(now: number) {
  const dt = (now - last) / 1000;
  last = now;
  game.update(dt);
  game.renderTable(tctx, (tableW * dpr) / TABLE_W);
  game.renderDMD(dctx, dmdW, dmdH, dpr);
  updateOverlay();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Expose for debugging in the console.
(window as unknown as { game: Game }).game = game;
