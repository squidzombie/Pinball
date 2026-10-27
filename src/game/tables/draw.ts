import type { Ball, Flipper } from '../../engine/physics';
import { RAMP } from '../../engine/physics';
import { drawGlow, withAlpha } from '../../engine/fx';
import type { P } from './geom';

export type LampState = 0 | 1 | 2 | 3; // off, on, slow blink, fast blink

export interface Lamp {
  kind: 'arrow' | 'circle' | 'rect' | 'tri';
  x: number;
  y: number;
  w?: number;
  h?: number;
  angle?: number;
  color: string;
  label?: string;
  state: () => LampState;
}

export function lampLit(s: LampState, t: number) {
  return s === 1 || (s === 2 && Math.sin(t * 7) > -0.2) || (s === 3 && Math.sin(t * 22) > 0);
}

export function drawLamp(ctx: CanvasRenderingContext2D, l: Lamp, t: number, forced?: boolean) {
  const lit = forced ?? lampLit(l.state(), t);
  const w = l.w ?? 30;
  const h = l.h ?? 30;
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.rotate(l.angle ?? 0);
  ctx.beginPath();
  if (l.kind === 'arrow') {
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, h * 0.1);
    ctx.lineTo(w * 0.22, h * 0.1);
    ctx.lineTo(w * 0.22, h / 2);
    ctx.lineTo(-w * 0.22, h / 2);
    ctx.lineTo(-w * 0.22, h * 0.1);
    ctx.lineTo(-w / 2, h * 0.1);
    ctx.closePath();
  } else if (l.kind === 'tri') {
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
  } else if (l.kind === 'circle') {
    ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
  } else {
    ctx.roundRect(-w / 2, -h / 2, w, h, 4);
  }
  if (lit) {
    ctx.fillStyle = l.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = withAlpha(l.color, 0.16);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = withAlpha(l.color, 0.45);
    ctx.stroke();
  }
  if (l.label) {
    ctx.rotate(-(l.angle ?? 0));
    ctx.fillStyle = lit ? '#0a0a0a' : withAlpha(l.color, 0.6);
    ctx.font = `800 ${Math.min(h * 0.45, 13)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(l.label, 0, 1);
  }
  ctx.restore();
  if (lit) drawGlow(ctx, l.x, l.y, Math.max(w, h) * 1.3, l.color, 0.7);
}

let ballSprite: HTMLCanvasElement | null = null;
function getBallSprite() {
  if (ballSprite) return ballSprite;
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(36, 32, 4, 48, 48, 48);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.25, '#dfe6ee');
  grad.addColorStop(0.6, '#8a97a6');
  grad.addColorStop(0.9, '#38414d');
  grad.addColorStop(1, '#1b2028');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(48, 48, 47, 0, Math.PI * 2);
  g.fill();
  // neon reflections
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = 'rgba(0,240,255,0.45)';
  g.lineWidth = 6;
  g.beginPath();
  g.arc(48, 48, 38, 0.3, 1.3);
  g.stroke();
  g.strokeStyle = 'rgba(255,40,200,0.35)';
  g.beginPath();
  g.arc(48, 48, 38, 3.5, 4.2);
  g.stroke();
  ballSprite = c;
  return c;
}

export function drawBall(ctx: CanvasRenderingContext2D, b: Ball) {
  const onRamp = b.layer === RAMP;
  const s = onRamp ? 1.15 : 1;
  const r = b.r * s;
  // speed trail
  const sp = b.speed;
  if (sp > 1400 && !b.captured) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(120,220,255,0.25)';
    ctx.lineWidth = r * 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    const k = Math.min(0.03, 60 / sp);
    ctx.lineTo(b.x - b.vx * k, b.y - b.vy * k);
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  const off = onRamp ? 10 : 4;
  ctx.ellipse(b.x + off, b.y + off, r, r * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(getBallSprite(), b.x - r, b.y - r, r * 2, r * 2);
}

export function drawFlipper(ctx: CanvasRenderingContext2D, f: Flipper, color: string) {
  const tx = f.tipX;
  const ty = f.tipY;
  const a = f.angle;
  const nx = -Math.sin(a);
  const ny = Math.cos(a);
  ctx.save();
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  flipperPath(ctx, f.px + 4, f.py + 5, tx + 4, ty + 5, f.r0, f.r1, nx, ny);
  ctx.fill();
  // body
  const g = ctx.createLinearGradient(f.px - nx * f.r0, f.py - ny * f.r0, f.px + nx * f.r0, f.py + ny * f.r0);
  g.addColorStop(0, '#f4f6f8');
  g.addColorStop(1, '#9aa5b1');
  ctx.fillStyle = g;
  flipperPath(ctx, f.px, f.py, tx, ty, f.r0, f.r1, nx, ny);
  ctx.fill();
  // rubber
  ctx.lineWidth = 4;
  ctx.strokeStyle = color;
  ctx.stroke();
  // pivot
  ctx.fillStyle = '#20262e';
  ctx.beginPath();
  ctx.arc(f.px, f.py, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (f.pressed) drawGlow(ctx, (f.px + tx) / 2, (f.py + ty) / 2, 60, color, 0.35);
}

function flipperPath(ctx: CanvasRenderingContext2D, px: number, py: number, tx: number, ty: number, r0: number, r1: number, nx: number, ny: number) {
  const a = Math.atan2(ty - py, tx - px);
  ctx.beginPath();
  ctx.arc(px, py, r0, a + Math.PI / 2, a - Math.PI / 2);
  ctx.lineTo(tx + nx * -r1, ty + ny * -r1);
  ctx.arc(tx, ty, r1, a - Math.PI / 2, a + Math.PI / 2);
  ctx.lineTo(px + nx * r0, py + ny * r0);
  ctx.closePath();
}

export function strokePath(ctx: CanvasRenderingContext2D, pts: P[], closed = false) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (closed) ctx.closePath();
}

/** Metal rail with a neon core — the standard wall look. */
export function neonRail(ctx: CanvasRenderingContext2D, pts: P[], color: string, width = 9, closed = false) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  strokePath(ctx, pts, closed);
  ctx.strokeStyle = '#05070a';
  ctx.lineWidth = width + 6;
  ctx.stroke();
  ctx.strokeStyle = '#3a4452';
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.strokeStyle = '#6c7a8c';
  ctx.lineWidth = width * 0.35;
  ctx.stroke();
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

export function rubber(ctx: CanvasRenderingContext2D, pts: P[], closed = true, color = '#ff6a1a') {
  ctx.save();
  ctx.lineJoin = 'round';
  strokePath(ctx, pts, closed);
  ctx.fillStyle = '#141820';
  if (closed) ctx.fill();
  ctx.strokeStyle = '#0b0b0b';
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.restore();
}

export function hazard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, stripe = 18) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#e8b400';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#111';
  for (let i = -h; i < w + h; i += stripe * 2) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h, y);
    ctx.lineTo(x + i + h + stripe, y);
    ctx.lineTo(x + i + stripe, y + h);
    ctx.fill();
  }
  ctx.restore();
}

export function rivet(ctx: CanvasRenderingContext2D, x: number, y: number, r = 3) {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r);
  g.addColorStop(0, '#9aa6b4');
  g.addColorStop(1, '#2a313b');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Deterministic PRNG so static art is identical every render. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
