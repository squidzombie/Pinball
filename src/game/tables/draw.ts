import type { Ball, Flipper } from '../../engine/physics';
import { drawGlow, withAlpha } from '../../engine/fx';
import type { P } from './geom';

// The playfield is painted as an oblique 3/4 view: anything with height is
// lifted up the screen by HK per unit (the CSS tilt in main.ts adds the
// perspective). Physics stays flat; only the drawing knows about height.

export const HK = 0.5;
export const lift = (z: number) => z * HK;

/** Device pixels per table unit of the canvas being painted. Shadows and sprites need it. */
export const art = { k: 1 };

// ------------------------------------------------------------------ colour

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const hex2 = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');

export function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = rgbOf(a);
  const [r2, g2, b2] = rgbOf(b);
  return `#${hex2(r1 + (r2 - r1) * t)}${hex2(g1 + (g2 - g1) * t)}${hex2(b1 + (b2 - b1) * t)}`;
}

/** f < 0 darkens toward black, f > 0 lightens toward white. */
export const shade = (c: string, f: number) => (f < 0 ? mix(c, '#000000', -f) : mix(c, '#ffffff', f));

// ------------------------------------------------------------------ sprites

const sprites = new Map<string, HTMLCanvasElement>();
let spriteK = 0;

/** A cached offscreen canvas of w x h table units, painted once per resolution. */
export function sprite(key: string, w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) {
  if (spriteK !== art.k) {
    sprites.clear();
    spriteK = art.k;
  }
  let c = sprites.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * art.k));
  c.height = Math.max(1, Math.ceil(h * art.k));
  const g = c.getContext('2d')!;
  g.scale(art.k, art.k);
  paint(g);
  sprites.set(key, c);
  return c;
}

let shadowSprite: HTMLCanvasElement | null = null;
/** Soft contact shadow, cheap enough to draw every frame. */
export function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.55) {
  if (!shadowSprite) {
    shadowSprite = document.createElement('canvas');
    shadowSprite.width = shadowSprite.height = 64;
    const g = shadowSprite.getContext('2d')!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(0.5, 'rgba(0,0,0,0.6)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
  }
  const pa = ctx.globalAlpha;
  ctx.globalAlpha = pa * a;
  ctx.drawImage(shadowSprite, x - rx, y - ry, rx * 2, ry * 2);
  ctx.globalAlpha = pa;
}

/**
 * Blurred drop shadow of whatever `draw` fills or strokes, for static art.
 * The shape is drawn far off-canvas and only its shadow is moved back.
 */
export function softShadow(ctx: CanvasRenderingContext2D, blur: number, dx: number, dy: number, color: string, draw: () => void) {
  const OFF = 5000;
  ctx.save();
  ctx.translate(-OFF, 0);
  ctx.shadowColor = color;
  ctx.shadowBlur = blur * art.k;
  ctx.shadowOffsetX = (OFF + dx) * art.k;
  ctx.shadowOffsetY = dy * art.k;
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  draw();
  ctx.restore();
}

// ------------------------------------------------------------------ paths

export function strokePath(ctx: CanvasRenderingContext2D, pts: P[], closed = false, dy = 0) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1] - dy);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1] - dy);
  if (closed) ctx.closePath();
}

// ------------------------------------------------------------------ walls

export interface WallStyle {
  /** Height in table units (≈ mm). */
  h: number;
  /** Thickness of the wall top. */
  w: number;
  side: string;
  top: string;
  /** Bright edge along the top. */
  hi?: string;
  shadow?: number;
}

export const RAIL: WallStyle = { h: 22, w: 8, side: '#2a2d31', top: '#6f767e', hi: '#c4cad0' };
export const WALL: WallStyle = { h: 30, w: 12, side: '#1a1715', top: '#3b342e', hi: '#7a6a5a' };
export const GUIDE: WallStyle = { h: 18, w: 6, side: '#33373c', top: '#8a9198', hi: '#dfe4e8' };

/** A wall with visible height: extruded strokes for the body, then the lit top. */
export function wall(ctx: CanvasRenderingContext2D, pts: P[], s: WallStyle, closed = false) {
  const lh = lift(s.h);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  softShadow(ctx, 5, 3, 4, `rgba(0,0,0,${s.shadow ?? 0.7})`, () => {
    strokePath(ctx, pts, closed);
    ctx.lineWidth = s.w + 2;
    ctx.stroke();
  });
  const steps = Math.max(2, Math.ceil(lh / 1.1));
  ctx.lineWidth = s.w;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    strokePath(ctx, pts, closed, lh * t);
    ctx.strokeStyle = mix(shade(s.side, -0.5), s.side, t);
    ctx.stroke();
  }
  strokePath(ctx, pts, closed, lh);
  ctx.strokeStyle = s.top;
  ctx.stroke();
  if (s.hi) {
    ctx.save();
    ctx.translate(-s.w * 0.15, -s.w * 0.2);
    strokePath(ctx, pts, closed, lh);
    ctx.lineWidth = Math.max(1, s.w * 0.28);
    ctx.strokeStyle = withAlpha(s.hi, 0.75);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** Glass neon tube mounted at height z. Neon is an accent, so it's used sparingly. */
export function neonTube(ctx: CanvasRenderingContext2D, pts: P[], color: string, z = 14, width = 3.5, closed = false) {
  const dy = lift(z);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // standoff shadow + the light it throws on the floor
  softShadow(ctx, 12, 0, dy, withAlpha(color, 0.55), () => {
    strokePath(ctx, pts, closed, dy);
    ctx.lineWidth = width * 2;
    ctx.stroke();
  });
  ctx.shadowColor = color;
  ctx.shadowBlur = 14 * art.k;
  strokePath(ctx, pts, closed, dy);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.shadowBlur = 0;
  strokePath(ctx, pts, closed, dy);
  ctx.strokeStyle = mix(color, '#ffffff', 0.7);
  ctx.lineWidth = width * 0.4;
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ solids

/** Vertical cylinder from height z0 to z1. `top` null leaves it open. */
export function cylinder(g: CanvasRenderingContext2D, x: number, y: number, r: number, z0: number, z1: number, side: string, top: string | CanvasGradient | null) {
  const y0 = y - lift(z0);
  const y1 = y - lift(z1);
  const gr = g.createLinearGradient(x - r, 0, x + r, 0);
  gr.addColorStop(0, shade(side, -0.55));
  gr.addColorStop(0.32, shade(side, 0.22));
  gr.addColorStop(0.62, side);
  gr.addColorStop(1, shade(side, -0.65));
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(x + r, y1);
  g.lineTo(x + r, y0);
  g.arc(x, y0, r, 0, Math.PI);
  g.lineTo(x - r, y1);
  g.closePath();
  g.fill();
  if (top) {
    g.fillStyle = top;
    g.beginPath();
    g.arc(x, y1, r, 0, Math.PI * 2);
    g.fill();
  }
}

/** Metal post with a black rubber ring, as found all over a real playfield. */
export function post(g: CanvasRenderingContext2D, x: number, y: number, r = 5, rubber = '#141414', cap = '#9aa1a8') {
  drawShadowStatic(g, x + 2, y + 3, r + 6, r + 4);
  cylinder(g, x, y, r + 3.5, 6, 14, rubber, shade(rubber, 0.25));
  cylinder(g, x, y, r * 0.55 + 1, 14, 26, '#7d858d', null);
  const tg = g.createRadialGradient(x - 1, y - lift(26) - 1, 0, x, y - lift(26), r * 0.8 + 1.5);
  tg.addColorStop(0, '#ffffff');
  tg.addColorStop(1, cap);
  cylinder(g, x, y, r * 0.8 + 1.5, 26, 28, shade(cap, -0.3), tg);
}

export function drawShadowStatic(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.6) {
  softShadow(g, 6, 0, 0, `rgba(0,0,0,${a})`, () => {
    g.beginPath();
    g.ellipse(x, y, rx * 0.8, ry * 0.8, 0, 0, Math.PI * 2);
    g.fill();
  });
}

/** Box with its top at height z: front face, then the lit top. */
export function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, z: number, top: string, side: string) {
  const lz = lift(z);
  ctx.fillStyle = side;
  ctx.fillRect(x, y + h - lz, w, lz);
  const g = ctx.createLinearGradient(x, y - lz, x + w, y - lz + h);
  g.addColorStop(0, shade(top, 0.15));
  g.addColorStop(1, shade(top, -0.2));
  ctx.fillStyle = g;
  ctx.fillRect(x, y - lz, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y - lz + 0.5, w - 1, h - 1);
}

// ------------------------------------------------------------------ inserts (lamps)

export type LampState = 0 | 1 | 2 | 3; // off, on, slow blink, fast blink

export interface Lamp {
  kind: 'arrow' | 'circle' | 'rect' | 'tri' | 'star' | 'shield';
  x: number;
  y: number;
  w?: number;
  h?: number;
  angle?: number;
  /** Colour of the plastic insert. */
  color: string;
  /** RGB lamp: the lit colour can follow the game state. */
  tint?: () => string;
  label?: string;
  labelSize?: number;
  /** Rotate the label with the insert instead of keeping it upright. */
  labelTurns?: boolean;
  state: () => LampState;
}

export function lampLit(s: LampState, t: number) {
  return s === 1 || (s === 2 && Math.sin(t * 7) > -0.2) || (s === 3 && Math.sin(t * 22) > 0);
}

function insertPath(g: CanvasRenderingContext2D, kind: Lamp['kind'], w: number, h: number) {
  g.beginPath();
  if (kind === 'arrow') {
    g.moveTo(0, -h / 2);
    g.lineTo(w / 2, h * 0.12);
    g.lineTo(w * 0.24, h * 0.04);
    g.lineTo(w * 0.24, h / 2);
    g.lineTo(-w * 0.24, h / 2);
    g.lineTo(-w * 0.24, h * 0.04);
    g.lineTo(-w / 2, h * 0.12);
    g.closePath();
  } else if (kind === 'tri') {
    g.moveTo(0, -h / 2);
    g.lineTo(w / 2, h / 2);
    g.lineTo(-w / 2, h / 2);
    g.closePath();
  } else if (kind === 'circle') {
    g.arc(0, 0, w / 2, 0, Math.PI * 2);
  } else if (kind === 'star') {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? w * 0.22 : w / 2;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
  } else if (kind === 'shield') {
    g.moveTo(-w / 2, -h / 2);
    g.lineTo(w / 2, -h / 2);
    g.lineTo(w / 2, h * 0.1);
    g.quadraticCurveTo(w / 2, h / 2, 0, h / 2);
    g.quadraticCurveTo(-w / 2, h / 2, -w / 2, h * 0.1);
    g.closePath();
  } else {
    g.roundRect(-w / 2, -h / 2, w, h, Math.min(5, h / 3));
  }
}

function lampSprite(l: Lamp, lit: boolean, color: string) {
  const w = l.w ?? 30;
  const h = l.h ?? w;
  const R = Math.max(w, h);
  // Lit sprites carry their own halo so a lamp costs one blit.
  const S = lit ? R * 2.3 + 8 : R * 1.2 + 8;
  return sprite(`lamp:${l.kind}:${w}:${h}:${l.angle ?? 0}:${l.label ?? ''}:${lit}:${color}`, S, S, (g) => {
    g.translate(S / 2, S / 2);
    if (lit) {
      const hg = g.createRadialGradient(0, 0, R * 0.2, 0, 0, S / 2);
      hg.addColorStop(0, withAlpha(color, 0.45));
      hg.addColorStop(0.45, withAlpha(color, 0.14));
      hg.addColorStop(1, withAlpha(color, 0));
      g.fillStyle = hg;
      g.fillRect(-S / 2, -S / 2, S, S);
    }
    g.save();
    g.rotate(l.angle ?? 0);
    insertPath(g, l.kind, w, h);
    if (lit) {
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) * 0.6);
      gr.addColorStop(0, mix(color, '#ffffff', 0.75));
      gr.addColorStop(0.45, mix(color, '#ffffff', 0.2));
      gr.addColorStop(1, shade(color, -0.15));
      g.fillStyle = gr;
      g.fill();
      g.lineWidth = 1.2;
      g.strokeStyle = withAlpha('#ffffff', 0.55);
      g.stroke();
    } else {
      const gr = g.createRadialGradient(-w * 0.15, -h * 0.2, 0, 0, 0, Math.max(w, h) * 0.6);
      gr.addColorStop(0, shade(color, -0.45));
      gr.addColorStop(1, shade(color, -0.78));
      g.fillStyle = gr;
      g.fill();
      g.lineWidth = 1.6;
      g.strokeStyle = 'rgba(0,0,0,0.75)';
      g.stroke();
      // glossy plastic catches the GI
      g.save();
      g.clip();
      g.fillStyle = 'rgba(255,240,220,0.13)';
      g.beginPath();
      g.ellipse(-w * 0.18, -h * 0.28, w * 0.38, h * 0.2, -0.4, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    g.restore();
    if (l.label) {
      if (l.labelTurns) g.rotate(l.angle ?? 0);
      const size = l.labelSize ?? Math.min(h * 0.48, 13);
      g.font = `800 ${size}px "Arial Narrow", "Roboto Condensed", system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = lit ? 'rgba(20,12,6,0.85)' : withAlpha(mix(color, '#d8c8b0', 0.4), 0.42);
      g.fillText(l.label, 0, l.kind === 'arrow' ? h * 0.18 : 0.5, w * 0.92);
    }
  });
}

function blitLamp(ctx: CanvasRenderingContext2D, l: Lamp, lit: boolean, color: string) {
  const c = lampSprite(l, lit, color);
  const S = c.width / art.k;
  ctx.drawImage(c, l.x - S / 2, l.y - S / 2, S, S);
}

/** Unlit insert, baked into the static playfield. */
export function drawLampOff(ctx: CanvasRenderingContext2D, l: Lamp) {
  blitLamp(ctx, l, false, l.color);
}

export function drawLampLit(ctx: CanvasRenderingContext2D, l: Lamp) {
  blitLamp(ctx, l, true, l.tint ? l.tint() : l.color);
}

// ------------------------------------------------------------------ flashers

export interface Flasher {
  x: number;
  y: number;
  r: number;
  /** Mounting height of the dome. */
  z: number;
  color: string;
  level: number;
}

export function drawFlasherDome(g: CanvasRenderingContext2D, f: Flasher) {
  const y = f.y - lift(f.z);
  drawShadowStatic(g, f.x + 3, f.y + 4, f.r * 1.4, f.r * 1.1);
  cylinder(g, f.x, f.y, f.r + 2, 0, f.z, '#26292d', null);
  const gr = g.createRadialGradient(f.x - f.r * 0.35, y - f.r * 0.4, 0, f.x, y, f.r);
  gr.addColorStop(0, mix(f.color, '#ffffff', 0.35));
  gr.addColorStop(0.35, shade(f.color, -0.35));
  gr.addColorStop(1, shade(f.color, -0.75));
  g.fillStyle = gr;
  g.beginPath();
  g.arc(f.x, y, f.r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.6)';
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath();
  g.ellipse(f.x - f.r * 0.35, y - f.r * 0.45, f.r * 0.32, f.r * 0.18, -0.5, 0, Math.PI * 2);
  g.fill();
}

/** Light thrown onto the playfield (drawn under the balls). */
export function drawFlasherWash(ctx: CanvasRenderingContext2D, f: Flasher) {
  if (f.level <= 0.02) return;
  drawGlow(ctx, f.x, f.y, f.r * 16 * (0.6 + f.level * 0.4), f.color, f.level * 0.55);
}

/** The lit dome itself (drawn on top). */
export function drawFlasherLit(ctx: CanvasRenderingContext2D, f: Flasher) {
  if (f.level <= 0.02) return;
  const y = f.y - lift(f.z);
  const pa = ctx.globalAlpha;
  ctx.globalAlpha = Math.min(1, f.level * 1.3);
  const gr = ctx.createRadialGradient(f.x, y, 0, f.x, y, f.r);
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(0.5, mix(f.color, '#ffffff', 0.5));
  gr.addColorStop(1, f.color);
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.arc(f.x, y, f.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = pa;
  drawGlow(ctx, f.x, y, f.r * 5, f.color, f.level);
}

// ------------------------------------------------------------------ pop bumpers

export interface BumperStyle {
  name: string;
  base: string;
  body: string;
  cap: string;
  /** Printed art on the cap. */
  art?: (g: CanvasRenderingContext2D, r: number, lit: boolean) => void;
}

const BUMPER_H = 40;

function bumperSprite(r: number, st: BumperStyle, lit: boolean) {
  const pad = r + 14;
  const w = pad * 2;
  const h = pad * 2 + lift(BUMPER_H + 4);
  return sprite(`bumper:${st.name}:${r}:${lit}`, w, h, (g) => {
    const x = pad;
    const y = h - pad;
    drawShadowStatic(g, x + 4, y + 6, r + 12, r + 9, 0.75);
    // base plate
    cylinder(g, x, y, r + 10, 0, 4, st.base, shade(st.base, 0.1));
    // translucent body, lit from inside
    const body = lit ? mix(st.body, '#ffffff', 0.35) : st.body;
    cylinder(g, x, y, r - 3, 4, BUMPER_H - 6, body, null);
    // steel skirt ring
    cylinder(g, x, y, r + 2, 12, 18, '#8d949b', '#b8bec4');
    cylinder(g, x, y, r - 3, 18, BUMPER_H - 6, body, null);
    // cap
    const cy = y - lift(BUMPER_H);
    const capC = lit ? mix(st.cap, '#ffffff', 0.45) : st.cap;
    cylinder(g, x, y, r + 4, BUMPER_H - 6, BUMPER_H, shade(capC, -0.25), null);
    const cg = g.createRadialGradient(x - r * 0.3, cy - r * 0.35, 0, x, cy, r + 4);
    cg.addColorStop(0, mix(capC, '#ffffff', lit ? 0.6 : 0.25));
    cg.addColorStop(1, shade(capC, lit ? -0.05 : -0.35));
    g.fillStyle = cg;
    g.beginPath();
    g.arc(x, cy, r + 4, 0, Math.PI * 2);
    g.fill();
    g.save();
    g.translate(x, cy);
    st.art?.(g, r, lit);
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,0.5)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(x, cy, r + 4, 0, Math.PI * 2);
    g.stroke();
    // gloss
    g.fillStyle = 'rgba(255,255,255,0.22)';
    g.beginPath();
    g.ellipse(x - r * 0.35, cy - r * 0.42, r * 0.42, r * 0.2, -0.45, 0, Math.PI * 2);
    g.fill();
  });
}

/** `hit` is 0..1 (1 right after a hit). */
export function drawBumper(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, st: BumperStyle, hit: number, glow: string) {
  const lit = hit > 0;
  const c = bumperSprite(r, st, lit);
  const pad = r + 14;
  const w = c.width / art.k;
  const h = c.height / art.k;
  const thump = hit * 2;
  ctx.drawImage(c, x - pad, y - (h - pad) + thump, w, h);
  if (lit) drawGlow(ctx, x, y - lift(BUMPER_H), r * (2.2 + hit * 1.6), glow, 0.25 + hit * 0.7);
}

// ------------------------------------------------------------------ ball & flippers

function ballSprite() {
  return sprite('ball', 30, 30, (g) => {
    const c = 15;
    const r = 14.6;
    g.save();
    g.beginPath();
    g.arc(c, c, r, 0, Math.PI * 2);
    g.clip();
    // chrome: bright sky above the horizon, dark playfield below
    const lg = g.createLinearGradient(0, c - r, 0, c + r);
    lg.addColorStop(0, '#f4f6f8');
    lg.addColorStop(0.38, '#9aa2aa');
    lg.addColorStop(0.5, '#3a3f45');
    lg.addColorStop(0.56, '#5c544c');
    lg.addColorStop(0.8, '#8a7a68');
    lg.addColorStop(1, '#2a2622');
    g.fillStyle = lg;
    g.fillRect(0, 0, 30, 30);
    // rim falloff
    const rg = g.createRadialGradient(c - 2, c - 3, r * 0.2, c, c, r);
    rg.addColorStop(0, 'rgba(0,0,0,0)');
    rg.addColorStop(0.75, 'rgba(0,0,0,0.12)');
    rg.addColorStop(1, 'rgba(0,0,0,0.7)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 30, 30);
    // warm GI reflected along the bottom edge
    g.strokeStyle = 'rgba(255,170,80,0.35)';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(c, c, r - 2.5, 0.5, 2.6);
    g.stroke();
    g.restore();
    // specular highlight
    const sg = g.createRadialGradient(c - 5, c - 6, 0, c - 5, c - 6, 6);
    sg.addColorStop(0, 'rgba(255,255,255,1)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sg;
    g.beginPath();
    g.arc(c - 5, c - 6, 6, 0, Math.PI * 2);
    g.fill();
  });
}

/** z is the height of whatever the ball rolls on (0 for the floor). */
export function drawBall(ctx: CanvasRenderingContext2D, b: Ball, z = 0) {
  const r = b.r;
  const floorY = b.y - lift(z);
  drawShadow(ctx, b.x + 2.5, floorY + 3, r * 1.05, r * 0.8, 0.7);
  const cy = floorY - lift(r);
  const sp = b.speed;
  if (sp > 1500 && !b.captured) {
    // motion smear
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#c8ccd0';
    ctx.lineWidth = r * 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x, cy);
    const k = Math.min(0.025, 50 / sp);
    ctx.lineTo(b.x - b.vx * k, cy - b.vy * k);
    ctx.stroke();
    ctx.restore();
  }
  ctx.drawImage(ballSprite(), b.x - 15, cy - 15, 30, 30);
}

export interface FlipperStyle {
  body: string;
  rubber: string;
}

export function drawFlipper(ctx: CanvasRenderingContext2D, f: Flipper, st: FlipperStyle) {
  const tx = f.tipX;
  const ty = f.tipY;
  const H = 16;
  const lh = lift(H);
  ctx.save();
  // shadow
  ctx.globalAlpha *= 0.55;
  ctx.fillStyle = '#000';
  flipperPath(ctx, f.px + 3, f.py + 4, tx + 3, ty + 4, f.r0 + 2, f.r1 + 2);
  ctx.fill();
  ctx.globalAlpha /= 0.55;
  // body sides
  for (let i = 0; i < 6; i++) {
    const z = (lh * i) / 6;
    flipperPath(ctx, f.px, f.py - z, tx, ty - z, f.r0, f.r1);
    ctx.fillStyle = mix(shade(st.rubber, -0.6), st.rubber, i / 6);
    ctx.fill();
  }
  // top
  const g = ctx.createLinearGradient(f.px, f.py - lh - f.r0, f.px, f.py - lh + f.r0);
  g.addColorStop(0, mix(f.pressed ? '#ffffff' : st.body, '#ffffff', 0.4));
  g.addColorStop(1, shade(st.body, -0.25));
  flipperPath(ctx, f.px, f.py - lh, tx, ty - lh, f.r0, f.r1);
  ctx.fillStyle = st.rubber;
  ctx.fill();
  flipperPath(ctx, f.px, f.py - lh, tx, ty - lh, f.r0 - 3, f.r1 - 2.5);
  ctx.fillStyle = g;
  ctx.fill();
  // pivot cap
  ctx.fillStyle = '#5a6068';
  ctx.beginPath();
  ctx.arc(f.px, f.py - lh, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c0c6cc';
  ctx.beginPath();
  ctx.arc(f.px - 1, f.py - lh - 1, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function flipperPath(ctx: CanvasRenderingContext2D, px: number, py: number, tx: number, ty: number, r0: number, r1: number) {
  const a = Math.atan2(ty - py, tx - px);
  const nx = -Math.sin(a);
  const ny = Math.cos(a);
  ctx.beginPath();
  ctx.arc(px, py, r0, a + Math.PI / 2, a - Math.PI / 2);
  ctx.lineTo(tx - nx * r1, ty - ny * r1);
  ctx.arc(tx, ty, r1, a - Math.PI / 2, a + Math.PI / 2);
  ctx.lineTo(px + nx * r0, py + ny * r0);
  ctx.closePath();
}

// ------------------------------------------------------------------ slingshots & plastics

/** Rubber band stretched round the sling's three posts, under a printed plastic. */
export function slingshot(g: CanvasRenderingContext2D, tri: P[], plastic: string, ink: string) {
  for (const [x, y] of tri) post(g, x, y, 4);
  g.save();
  g.lineJoin = 'round';
  strokePath(g, tri, true, lift(10));
  g.strokeStyle = '#0c0c0c';
  g.lineWidth = 7;
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.12)';
  g.lineWidth = 1.5;
  g.stroke();
  g.restore();
  plasticPlate(g, insetTri(tri, 7), plastic, ink, 34);
}

function insetTri(tri: P[], d: number): P[] {
  const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
  const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
  return tri.map(([x, y]) => {
    const l = Math.hypot(x - cx, y - cy);
    return [x + ((cx - x) / l) * d, y + ((cy - y) / l) * d] as P;
  });
}

/** Translucent printed plastic mounted on posts at height z. */
export function plasticPlate(g: CanvasRenderingContext2D, pts: P[], color: string, ink: string, z = 34) {
  const dy = lift(z);
  softShadow(g, 8, 4, 6, 'rgba(0,0,0,0.55)', () => {
    strokePath(g, pts, true);
    g.fill();
  });
  g.save();
  strokePath(g, pts, true, dy);
  const minY = Math.min(...pts.map((p) => p[1])) - dy;
  const maxY = Math.max(...pts.map((p) => p[1])) - dy;
  const gr = g.createLinearGradient(0, minY, 0, maxY);
  gr.addColorStop(0, withAlpha(mix(color, '#ffffff', 0.25), 0.92));
  gr.addColorStop(1, withAlpha(shade(color, -0.3), 0.92));
  g.fillStyle = gr;
  g.fill();
  g.clip();
  // printed diagonal stripes, worn
  g.strokeStyle = withAlpha(ink, 0.55);
  g.lineWidth = 5;
  const minX = Math.min(...pts.map((p) => p[0]));
  const maxX = Math.max(...pts.map((p) => p[0]));
  for (let x = minX - 80; x < maxX + 80; x += 16) {
    g.beginPath();
    g.moveTo(x, maxY);
    g.lineTo(x + (maxY - minY), minY);
    g.stroke();
  }
  g.restore();
  g.save();
  strokePath(g, pts, true, dy);
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 1.2;
  g.stroke();
  g.restore();
}

// ------------------------------------------------------------------ textures

export function rivet(ctx: CanvasRenderingContext2D, x: number, y: number, r = 2.5) {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r);
  g.addColorStop(0, '#a49a8e');
  g.addColorStop(1, '#2a2622');
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.arc(x + 0.8, y + 1, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Worn yellow/black hazard stripes. */
export function hazard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, stripe = 14, seed = 1) {
  const R = rng(seed);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#b8901c';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#16130f';
  for (let i = -h; i < w + h; i += stripe * 2) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h, y);
    ctx.lineTo(x + i + h + stripe, y);
    ctx.lineTo(x + i + stripe, y + h);
    ctx.fill();
  }
  // chipped paint
  for (let i = 0; i < (w * h) / 18; i++) {
    ctx.fillStyle = R() < 0.5 ? 'rgba(20,16,12,0.55)' : 'rgba(110,60,25,0.4)';
    ctx.fillRect(x + R() * w, y + R() * h, 1 + R() * 3, 1 + R() * 2);
  }
  ctx.restore();
}

/** Spray-painted stencil/graffiti text with drips. */
export function sprayText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, angle = 0, seed = 3) {
  const R = rng(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.font = `900 ${size}px Impact, "Arial Black", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = withAlpha(color, 0.6);
  ctx.shadowBlur = 3 * art.k;
  ctx.fillStyle = withAlpha(color, 0.78);
  ctx.fillText(text, 0, 0);
  ctx.shadowBlur = 0;
  const w = ctx.measureText(text).width;
  ctx.strokeStyle = withAlpha(color, 0.6);
  for (let i = 0; i < text.length * 0.8; i++) {
    const dx = (R() - 0.5) * w;
    ctx.lineWidth = 0.8 + R() * 1.4;
    ctx.beginPath();
    ctx.moveTo(dx, size * 0.35);
    ctx.lineTo(dx, size * 0.35 + 3 + R() * size * 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

/** Dark-red splatter. */
export function splatter(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed = 5) {
  const R = rng(seed);
  ctx.save();
  ctx.fillStyle = 'rgba(92,8,8,0.75)';
  ctx.beginPath();
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const rr = r * (0.55 + R() * 0.45);
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.fill();
  for (let i = 0; i < 16; i++) {
    const a = R() * Math.PI * 2;
    const d = r * (1 + R() * 1.6);
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 0.8 + R() * r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(160,20,15,0.35)';
  ctx.beginPath();
  ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Deterministic PRNG so static art is identical every render. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
