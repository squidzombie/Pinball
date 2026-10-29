// Cyber Psychosis art: brutal grey steel and concrete, red as the only real
// colour, hazard yellow where a shot wants attention, and a red neon skull.

import { withAlpha } from '../../engine/fx';
import type { LowerSection, P } from './geom';
import {
  GUIDE,
  art,
  cylinder,
  hazard,
  lift,
  mix,
  neonTube,
  post,
  rivet,
  rng,
  shade,
  slingshot,
  softShadow,
  splatter,
  sprayText,
  sprite,
  strokePath,
  wall,
  type WallStyle,
} from './draw';
import * as L from './psychosis-layout';
import { TABLE_H, TABLE_W } from './table';

export const RED = '#e01e1e';
export const INK = '#c01818';
const HAZ = '#d8b21c';
const COLD = '#cfe0ff';

const CABINET: WallStyle = { h: 46, w: 14, side: '#0e0f11', top: '#2c2f34', hi: '#7a8088' };
const STEEL: WallStyle = { h: 30, w: 10, side: '#15171a', top: '#454a51', hi: '#a8aeb6' };
const RAIL: WallStyle = { h: 22, w: 7, side: '#1c1e22', top: '#6a7078', hi: '#d0d4da' };
const RUBBER: WallStyle = { h: 14, w: 9, side: '#0b0b0b', top: '#1d1d1d', hi: '#5a5a5a', shadow: 0.5 };

// ------------------------------------------------------------------ static

export function paintStatic(ctx: CanvasRenderingContext2D, lower: LowerSection, drawInserts: () => void, drawDomes: () => void) {
  paintCabinet(ctx);
  ctx.save();
  strokePath(ctx, L.OUTER);
  ctx.lineTo(20, 1240);
  ctx.clip();
  paintFloor(ctx);
  paintDecals(ctx);
  paintGI(ctx);
  drawInserts();
  paintLabels(ctx);
  paintRampShadows(ctx);
  paintShooterLane(ctx);
  ctx.restore();

  paintWalls(ctx, lower);
  paintImpound(ctx);
  paintBreach(ctx);
  paintReactor(ctx);
  drawDomes();
  paintApron(ctx);
  paintCameraBodies(ctx);
}

function paintCabinet(ctx: CanvasRenderingContext2D) {
  const R = rng(3);
  const g = ctx.createLinearGradient(0, 0, TABLE_W, 0);
  g.addColorStop(0, '#0d0e10');
  g.addColorStop(0.5, '#1a1c20');
  g.addColorStop(1, '#0d0e10');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TABLE_W, TABLE_H);
  // diamond plate side armour
  for (const x of [0, TABLE_W - 10]) {
    const sg = ctx.createLinearGradient(x, 0, x + 10, 0);
    sg.addColorStop(0, '#3a3d42');
    sg.addColorStop(0.5, '#8a8f96');
    sg.addColorStop(1, '#2a2c30');
    ctx.fillStyle = sg;
    ctx.fillRect(x, 0, 10, TABLE_H);
    for (let y = 30; y < TABLE_H; y += 110) rivet(ctx, x + 5, y, 2.2);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let i = 0; i < 300; i++) ctx.fillRect(R() * TABLE_W, R() * TABLE_H, 1, 1 + R() * 2);
}

function paintFloor(ctx: CanvasRenderingContext2D) {
  const R = rng(17);
  ctx.fillStyle = '#1b1d21';
  ctx.fillRect(0, 0, TABLE_W, TABLE_H);
  // Heavy steel plates, cold and scuffed.
  const PW = 110;
  const PH = 130;
  for (let row = 0; row * PH < TABLE_H; row++)
    for (let col = -1; col * PW < TABLE_W; col++) {
      const x = col * PW + (row % 2 ? 55 : 0);
      const y = row * PH;
      const base = mix('#1e2125', '#383c43', R());
      const pg = ctx.createLinearGradient(x, y, x + PW, y + PH);
      pg.addColorStop(0, shade(base, 0.08));
      pg.addColorStop(1, shade(base, -0.3));
      ctx.fillStyle = pg;
      ctx.fillRect(x, y, PW, PH);
      ctx.globalAlpha = 0.05;
      ctx.strokeStyle = '#e8ecf2';
      for (let i = 0; i < 10; i++) {
        const yy = y + R() * PH;
        ctx.lineWidth = 0.5 + R();
        ctx.beginPath();
        ctx.moveTo(x + R() * 30, yy);
        ctx.lineTo(x + PW - R() * 30, yy + (R() - 0.5) * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(x, y, PW, 2);
      ctx.fillRect(x, y, 2, PH);
      ctx.fillStyle = 'rgba(220,230,245,0.05)';
      ctx.fillRect(x + 2, y + 2, PW - 2, 1);
      for (const [rx, ry] of [
        [x + 8, y + 8],
        [x + PW - 8, y + 8],
        [x + 8, y + PH - 8],
        [x + PW - 8, y + PH - 8],
      ] as P[])
        rivet(ctx, rx, ry, 2.2);
    }

  // Cracked concrete poured over the lower playfield
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(20, 820);
  for (let x = 20; x <= 535; x += 25) ctx.lineTo(x, 805 + Math.sin(x * 0.07) * 14 + R() * 10);
  ctx.lineTo(535, 1200);
  ctx.lineTo(20, 1200);
  ctx.closePath();
  ctx.clip();
  const cg = ctx.createLinearGradient(0, 800, 0, 1200);
  cg.addColorStop(0, '#34353a');
  cg.addColorStop(1, '#222327');
  ctx.fillStyle = cg;
  ctx.fillRect(0, 780, TABLE_W, 420);
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = R() < 0.5 ? `rgba(255,255,255,${R() * 0.06})` : `rgba(0,0,0,${R() * 0.12})`;
    ctx.fillRect(R() * TABLE_W, 790 + R() * 410, 1 + R() * 2.5, 1 + R() * 2.5);
  }
  crackField(ctx, R, 20, 800, 515, 400, 16);
  ctx.restore();
  // jagged edge where the concrete meets the steel
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const R2 = rng(17);
  for (let x = 20; x <= 535; x += 25) ctx.lineTo(x, 805 + Math.sin(x * 0.07) * 14 + R2() * 10);
  ctx.stroke();

  // Grime, oil and scratches
  for (let i = 0; i < 18; i++) {
    const x = R() * TABLE_W;
    const y = R() * TABLE_H;
    const r = 16 + R() * 40;
    const og = ctx.createRadialGradient(x, y, 0, x, y, r);
    og.addColorStop(0, 'rgba(2,2,3,0.5)');
    og.addColorStop(1, 'rgba(2,2,3,0)');
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.5 + R() * 0.5), R() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(230,236,245,0.07)';
  for (let i = 0; i < 320; i++) {
    const x = R() * TABLE_W;
    const y = R() * TABLE_H;
    const a = R() * Math.PI;
    const l = 4 + R() * 26;
    ctx.lineWidth = 0.4 + R() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  // Soot against the walls, vignette
  for (const [wdt, a] of [
    [90, 0.14],
    [55, 0.18],
    [26, 0.25],
  ] as [number, number][]) {
    ctx.save();
    ctx.lineJoin = 'round';
    strokePath(ctx, L.OUTER);
    ctx.strokeStyle = `rgba(0,0,0,${a})`;
    ctx.lineWidth = wdt;
    ctx.stroke();
    ctx.restore();
  }
  const vg = ctx.createRadialGradient(L.CX, 640, 180, L.CX, 640, 820);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, TABLE_W, TABLE_H);

  // The orbit channel floor is grating
  ctx.save();
  strokePath(ctx, L.OUTER.slice(1, 58));
  for (const p of [...L.ALLEY_INNER].reverse()) ctx.lineTo(p[0], p[1]);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, TABLE_W, 320);
  ctx.strokeStyle = 'rgba(160,170,185,0.16)';
  ctx.lineWidth = 1.5;
  for (let a = Math.PI; a <= Math.PI * 2; a += 0.035) {
    ctx.beginPath();
    ctx.moveTo(L.CX + Math.cos(a) * 192, 300 + Math.sin(a) * 192);
    ctx.lineTo(300 + Math.cos(a) * 282, 300 + Math.sin(a) * 282);
    ctx.stroke();
  }
  ctx.restore();
}

function crackField(ctx: CanvasRenderingContext2D, R: () => number, x0: number, y0: number, w: number, h: number, n: number) {
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  for (let i = 0; i < n; i++) {
    let x = x0 + R() * w;
    let y = y0 + R() * h;
    ctx.lineWidth = 0.8 + R() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 7; k++) {
      x += (R() - 0.5) * 46;
      y += (R() - 0.4) * 34;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function paintDecals(ctx: CanvasRenderingContext2D) {
  // Heist map plate with circuit traces linking the modes
  const M = L.MAP;
  ctx.save();
  ctx.fillStyle = 'rgba(8,9,11,0.7)';
  ctx.beginPath();
  ctx.roundRect(L.CX - 118, 640, 236, 256, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(224,30,30,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const link = (a: P, b: P) => {
    ctx.strokeStyle = 'rgba(224,30,30,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,120,110,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  link(M.infiltrate, M.hack);
  link(M.infiltrate, M.route);
  link(M.hack, M.payload);
  link(M.hack, M.extract);
  link(M.route, M.payload);
  link(M.route, M.extract);
  link(M.payload, M.blackout);
  link(M.extract, M.blackout);
  for (const p of [M.hack, M.route, M.payload, M.extract]) {
    ctx.fillStyle = '#2a0606';
    ctx.beginPath();
    ctx.arc(p[0], p[1], 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Chevrons pointing into the shots
  chevrons(ctx, add(L.REACTOR_MOUTH, L.REACTOR_AXIS, -70), L.REACTOR_AXIS, 3);
  chevrons(ctx, add(L.BREACH, L.BREACH_AXIS, 172), [-L.BREACH_AXIS[0], -L.BREACH_AXIS[1]], 3);

  // Stencils and graffiti
  stencil(ctx, 'SECTOR 9', 52, 500, 12, -Math.PI / 2, 0.22);
  stencil(ctx, 'BACK ALLEY', 502, 690, 11, -Math.PI / 2, 0.3, HAZ);
  stencil(ctx, 'NO WITNESSES', L.CX, 1012, 11, 0, 0.0);
  stencil(ctx, 'DANGER', 48, 1010, 12, -Math.PI / 2, 0.3, RED);
  stencil(ctx, 'DANGER', 507, 1010, 12, -Math.PI / 2, 0.3, RED);
  sprayText(ctx, 'FLATLINE', 276, 590, 15, '#b81818', -0.18, 4);
  sprayText(ctx, 'NO GHOSTS', 430, 700, 11, '#cfd4da', -0.35, 8);
  splatter(ctx, 228, 470, 8, 6);
  splatter(ctx, 360, 640, 5, 12);
  paintSkull(ctx, L.CX, 1018);
}

function add(a: P, b: P, k = 1): P {
  return [a[0] + b[0] * k, a[1] + b[1] * k];
}

function chevrons(ctx: CanvasRenderingContext2D, at: P, dir: P, n: number) {
  ctx.save();
  ctx.translate(at[0], at[1]);
  ctx.rotate(Math.atan2(dir[1], dir[0]));
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? '#16130c' : withAlpha(HAZ, 0.75);
    ctx.beginPath();
    const x = i * 13;
    ctx.moveTo(x - 6, -14);
    ctx.lineTo(x + 6, 0);
    ctx.lineTo(x - 6, 14);
    ctx.lineTo(x - 12, 14);
    ctx.lineTo(x, 0);
    ctx.lineTo(x - 12, -14);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function stencil(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, angle: number, a: number, color = '#d8dce2') {
  if (a <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.font = `800 ${size}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = withAlpha(color, a);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** Stencilled cyber skull between the flippers. The neon outline is drawn live. */
function paintSkull(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(210,214,220,0.16)';
  skullPath(ctx);
  ctx.fill('evenodd');
  ctx.restore();
}

export function skullPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  // cranium + jaw
  ctx.moveTo(-26, 4);
  ctx.bezierCurveTo(-30, -26, -14, -36, 0, -36);
  ctx.bezierCurveTo(14, -36, 30, -26, 26, 4);
  ctx.lineTo(18, 12);
  ctx.lineTo(18, 24);
  ctx.lineTo(-18, 24);
  ctx.lineTo(-18, 12);
  ctx.closePath();
  // eyes
  ctx.moveTo(-6, -12);
  ctx.lineTo(-18, -16);
  ctx.lineTo(-16, -4);
  ctx.closePath();
  ctx.moveTo(6, -12);
  ctx.lineTo(18, -16);
  ctx.lineTo(16, -4);
  ctx.closePath();
  // nose
  ctx.moveTo(0, -2);
  ctx.lineTo(-4, 6);
  ctx.lineTo(4, 6);
  ctx.closePath();
}

function paintGI(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pool = (x: number, y: number, r: number, a: number, c = COLD) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, withAlpha(c, a));
    g.addColorStop(1, withAlpha(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  pool(139, 925, 100, 0.09);
  pool(416, 925, 100, 0.09);
  pool(94, 880, 55, 0.07);
  pool(461, 880, 55, 0.07);
  pool(350, 210, 120, 0.08);
  pool(L.CX, 770, 160, 0.05);
  pool(L.BREACH[0], L.BREACH[1], 70, 0.1, RED);
  pool(L.REACTOR.core[0], L.REACTOR.core[1], 90, 0.1, RED);
  pool(160, 205, 70, 0.06, '#ff8a1f');
  ctx.restore();
}

function paintLabels(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = (t: string, x: number, y: number, size = 8, color = '#c8ccd2', angle = 0) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.font = `800 ${size}px "Arial Narrow", system-ui, sans-serif`;
    ctx.fillStyle = withAlpha(color, 0.75);
    ctx.fillText(t, 0, 0);
    ctx.restore();
  };
  label('THE HEIST', L.CX, 650, 9, RED);
  label('BONUS', L.CX, 940, 8);
  label('BLACK MARKET', 446, 372, 7.5, HAZ);
  label('LOCK', 52, 528, 7.5);
  label('SPINNER', 502, 500, 7);
  ctx.restore();
}

function paintRampShadows(ctx: CanvasRenderingContext2D) {
  for (const r of L.RAMPS) {
    const body: P[] = [...r.walls.left, ...[...r.walls.right].reverse()];
    softShadow(ctx, 14, 10, 14, 'rgba(0,0,0,0.5)', () => {
      strokePath(ctx, body, true);
      ctx.fill();
    });
    // The ramp's foot sits in permanent shade
    const foot: P[] = [...r.walls.left.slice(0, r.baseTo + 1), ...r.walls.right.slice(0, r.baseTo + 1).reverse()];
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    strokePath(ctx, foot, true);
    ctx.fill();
  }
}

function paintShooterLane(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#0e0f11';
  ctx.fillRect(535, 300, 45, 880);
  hazard(ctx, 538, 1060, 40, 110, 12, 2);
  stencil(ctx, 'L A U N C H', 558, 800, 15, -Math.PI / 2, 0.3, RED);
}

function paintWalls(ctx: CanvasRenderingContext2D, lower: LowerSection) {
  wall(ctx, L.ALLEY_INNER, STEEL);
  wall(ctx, L.LEFT_WALL_TOP, STEEL);
  wall(ctx, L.LEFT_WALL_LOW, STEEL);
  wall(ctx, L.RIGHT_WALL, STEEL);
  wall(ctx, L.DIVERTER, { ...RAIL, w: 5 });
  wall(ctx, L.DEFLECT_L, RUBBER);
  wall(ctx, L.DEFLECT_R, RUBBER);
  for (const p of [L.DEFLECT_L[1], L.DEFLECT_R[1]]) post(ctx, p[0], p[1], 4);
  for (const g of lower.guides) wall(ctx, g, GUIDE);
  for (const s of lower.slings) slingshot(ctx, s, '#7a0c0c', '#120404');
  // Ramp feet: steel walls up to where the ramp lifts off the floor
  for (const r of L.RAMPS) {
    wall(ctx, r.walls.left.slice(0, r.baseTo + 1), { ...STEEL, h: 18 });
    wall(ctx, r.walls.right.slice(0, r.baseTo + 1), { ...STEEL, h: 18 });
  }
  wall(ctx, L.PLUNGER_WALL, RAIL);
  wall(ctx, L.GATE, { ...GUIDE, w: 4, h: 26 });
  wall(ctx, L.OUTER, CABINET);
  // Pipes riding the cabinet wall
  pipe(ctx, [
    [30, 760],
    [30, 1060],
  ]);
  pipe(ctx, [
    [526, 760],
    [526, 1040],
  ]);
}

function pipe(ctx: CanvasRenderingContext2D, pts: P[]) {
  ctx.save();
  ctx.lineCap = 'round';
  const dy = lift(10);
  strokePath(ctx, pts, false, dy);
  ctx.strokeStyle = '#111215';
  ctx.lineWidth = 9;
  ctx.stroke();
  strokePath(ctx, pts, false, dy);
  ctx.strokeStyle = '#4a4e55';
  ctx.lineWidth = 6;
  ctx.stroke();
  strokePath(ctx, pts, false, dy + 1.5);
  ctx.strokeStyle = 'rgba(220,228,240,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/** Extruded polygon block with a lit top. */
function block(ctx: CanvasRenderingContext2D, pts: P[], h: number, side: string, top: string) {
  const lh = lift(h);
  softShadow(ctx, 8, 4, 6, 'rgba(0,0,0,0.7)', () => {
    strokePath(ctx, pts, true);
    ctx.fill();
  });
  const steps = Math.ceil(lh / 1.2);
  for (let i = 0; i <= steps; i++) {
    strokePath(ctx, pts, true, (lh * i) / steps);
    ctx.fillStyle = mix(shade(side, -0.5), side, i / steps);
    ctx.fill();
  }
  strokePath(ctx, pts, true, lh);
  ctx.fillStyle = top;
  ctx.fill();
  ctx.strokeStyle = 'rgba(210,218,228,0.35)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function paintImpound(ctx: CanvasRenderingContext2D) {
  const H = 36;
  const lh = lift(H);
  block(ctx, L.IMPOUND_BOX, H, '#1a1c20', '#2c2f35');
  // grille over the lock trough: you see the balls through the bars
  ctx.save();
  strokePath(ctx, L.IMPOUND_BOX, true, lh);
  ctx.clip();
  ctx.fillStyle = '#060607';
  strokePath(ctx, L.IMPOUND_BOX.map(([x, y]) => [x * 0.86 + 159 * 0.14, y * 0.86 + 203 * 0.14] as P), true, lh);
  ctx.fill();
  ctx.restore();
  // lock lane mouth
  ctx.strokeStyle = '#4a4e55';
  ctx.lineWidth = 3;
  strokePath(ctx, L.IMPOUND_LANE, false, lift(20));
  ctx.stroke();
  // sign
  ctx.save();
  ctx.translate(166, 252 - lh);
  ctx.rotate(-0.68);
  ctx.fillStyle = '#d8dce2';
  ctx.font = '900 11px Impact, "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('IMPOUND', 18, 8);
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(-28, 10);
  ctx.lineTo(-22, 0);
  ctx.lineTo(-16, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The Impound's front bars, drawn over locked balls (cached sprite). */
export function impoundBars(ctx: CanvasRenderingContext2D) {
  const lh = lift(36);
  const c = sprite('impound-bars', TABLE_W, 300, (g) => {
    g.save();
    strokePath(g, L.IMPOUND_BOX, true, lh);
    g.clip();
    g.strokeStyle = '#7a8088';
    g.lineWidth = 2.5;
    for (let k = -60; k < 120; k += 11) {
      g.beginPath();
      g.moveTo(100 + k, 150 - lh);
      g.lineTo(160 + k, 260 - lh);
      g.stroke();
    }
    g.restore();
  });
  ctx.drawImage(c, 0, 0, TABLE_W, 300);
}

function paintBreach(ctx: CanvasRenderingContext2D) {
  for (const bank of [L.BANK_L, L.BANK_R]) {
    const pts: P[] = [bank.top, bank.bottom, bank.outer];
    block(ctx, pts, 30, '#17191c', '#2e3238');
    // hazard edge on top
    ctx.save();
    strokePath(ctx, pts, true, lift(30));
    ctx.clip();
    const minX = Math.min(...pts.map((p) => p[0]));
    const minY = Math.min(...pts.map((p) => p[1])) - lift(30);
    hazard(ctx, minX - 4, minY + 70, 60, 14, 6, 7);
    ctx.restore();
  }
  wall(ctx, L.BREACH_CUP, RAIL);
  // scoop hole
  const [x, y] = L.BREACH;
  const g = ctx.createRadialGradient(x, y, 2, x, y, 20);
  g.addColorStop(0, '#000');
  g.addColorStop(0.7, '#060607');
  g.addColorStop(1, '#3a0a0a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x + L.BREACH_AXIS[0] * 60, y + L.BREACH_AXIS[1] * 60);
  ctx.rotate(Math.atan2(L.BREACH_AXIS[1], L.BREACH_AXIS[0]) - Math.PI / 2);
  ctx.font = '900 14px Impact, "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(232,230,226,0.8)';
  ctx.fillText('BREACH', 0, 0);
  ctx.restore();
}

function paintReactor(ctx: CanvasRenderingContext2D) {
  const R = L.REACTOR;
  block(ctx, R.shell, 34, '#15171a', '#2a2d33');
  const lh = lift(34);
  // the channel the captive ball runs in
  ctx.save();
  ctx.fillStyle = '#050506';
  strokePath(ctx, [R.channelL0, R.channelL1, R.channelR1, R.channelR0], true);
  ctx.fill();
  strokePath(ctx, [R.mouthL, R.channelL0, R.channelR0, R.mouthR], true);
  ctx.fillStyle = '#0c0d0f';
  ctx.fill();
  ctx.restore();
  // hazard bands on the shell top
  ctx.save();
  strokePath(ctx, R.shell, true, lh);
  ctx.clip();
  ctx.strokeStyle = withAlpha(HAZ, 0.6);
  ctx.lineWidth = 3;
  strokePath(ctx, R.shell, true, lh);
  ctx.stroke();
  ctx.restore();
  wall(ctx, [R.mouthL, R.channelL0, R.channelL1], { ...RAIL, h: 26 });
  wall(ctx, [R.mouthR, R.channelR0, R.channelR1], { ...RAIL, h: 26 });
  ctx.save();
  const lbl = add(R.mouthR, L.REACTOR_PERP, 26);
  ctx.translate(lbl[0], lbl[1]);
  ctx.rotate(Math.atan2(L.REACTOR_AXIS[1], L.REACTOR_AXIS[0]));
  ctx.font = '900 12px Impact, "Arial Black", sans-serif';
  ctx.fillStyle = 'rgba(232,230,226,0.75)';
  ctx.fillText('REACTOR', 0, 0);
  ctx.restore();
}

function paintApron(ctx: CanvasRenderingContext2D) {
  const pts: P[] = [
    [20, 1110],
    [L.CX - 60, 1150],
    [L.CX + 60, 1150],
    [535, 1110],
    [535, 1200],
    [20, 1200],
  ];
  const lh = lift(16);
  softShadow(ctx, 10, 0, -4, 'rgba(0,0,0,0.8)', () => {
    strokePath(ctx, pts, true, lh);
    ctx.fill();
  });
  for (let i = 0; i <= 8; i++) {
    strokePath(ctx, pts, true, (lh * i) / 8);
    ctx.fillStyle = mix('#0b0c0e', '#26292e', i / 8);
    ctx.fill();
  }
  ctx.save();
  strokePath(ctx, pts, true, lh);
  const ag = ctx.createLinearGradient(0, 1100, 0, 1200);
  ag.addColorStop(0, '#34383e');
  ag.addColorStop(1, '#17191c');
  ctx.fillStyle = ag;
  ctx.fill();
  ctx.clip();
  hazard(ctx, 20, 1182 - lh, 515, 18, 14, 5);
  const card = (x: number, y: number, lines: string[]) => {
    ctx.fillStyle = '#d6d8dc';
    ctx.beginPath();
    ctx.roundRect(x, y, 150, 36, 3);
    ctx.fill();
    ctx.fillStyle = '#121316';
    ctx.font = '800 6.3px "Arial Narrow", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, x + 5, y + 3.5 + i * 8, 140));
  };
  card(42, 1145 - lh, ['SPELL B-R-E-A-C-H  ·  LIGHT A MODE', 'BREACH SCOOP  ·  START THE HEIST', 'R-A-G-E LANES  ·  RAGE FRENZY', 'PAYLOAD/EXTRACT  ·  LIGHT BLACKOUT']);
  card(366, 1145 - lh, ['DROPS DOWN  ·  LIGHT LOCK', 'LEFT ALLEY  ·  LOCK IN THE IMPOUND', 'BLACK MARKET  ·  SPEND YOUR CASH', 'REACTOR  ·  START BLACKOUT']);
  ctx.restore();
  for (const x of [30, 525]) rivet(ctx, x, 1150 - lh, 2.5);
}

function paintCameraBodies(ctx: CanvasRenderingContext2D) {
  for (const [x, y] of L.CAMERAS) {
    const aim = Math.atan2(560 - y, L.CX - x);
    ctx.save();
    ctx.translate(x, y - lift(50));
    ctx.rotate(aim);
    ctx.fillStyle = '#0c0d0f';
    ctx.fillRect(-14, -9, 30, 18);
    ctx.fillStyle = '#5a5e64';
    ctx.fillRect(-12, -7, 26, 14);
    ctx.fillStyle = '#1a1c20';
    ctx.beginPath();
    ctx.arc(16, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    cylinder(ctx, x, y, 3, 0, 50, '#3a3d42', null);
  }
}

// ------------------------------------------------------------------ ramps (cached, above floor balls)

export function paintRamps(ctx: CanvasRenderingContext2D) {
  for (const r of L.RAMPS) paintRamp(ctx, r, r.id === 'skyway' ? RED : HAZ, r.id === 'skyway' ? 'SKYWAY' : 'BLACK MARKET');
}

function paintRamp(ctx: CanvasRenderingContext2D, r: L.RampDef, accent: string, name: string) {
  const { left, right } = r.walls;
  const n = r.path.length;
  const dz = (i: number) => lift(r.z[i]);
  const at = (p: P, i: number): P => [p[0], p[1] - dz(i)];

  // supports down to the floor
  for (let i = 4; i < n - 3; i += 6) {
    if (r.z[i] < 14) continue;
    for (const side of [left[i], right[i]]) {
      const h = dz(i);
      ctx.fillStyle = '#2a2c30';
      ctx.fillRect(side[0] - 2, side[1] - h, 4, h);
      ctx.fillStyle = 'rgba(220,228,240,0.25)';
      ctx.fillRect(side[0] - 2, side[1] - h, 1.2, h);
    }
  }
  // solid section: brushed steel bed with a painted accent stripe
  for (let i = 0; i < r.wireFrom; i++) {
    const q = [at(left[i], i), at(left[i + 1], i + 1), at(right[i + 1], i + 1), at(right[i], i)];
    ctx.beginPath();
    q.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    const c = mix('#2c2f34', '#4a4e55', i / r.wireFrom);
    ctx.fillStyle = c;
    ctx.fill();
    ctx.strokeStyle = c;
    ctx.lineWidth = 1;
    ctx.stroke();
    // centre stripe
    const a = at(r.path[i], i);
    const b = at(r.path[i + 1], i + 1);
    ctx.strokeStyle = withAlpha(accent, 0.55);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  // name painted along the bed
  const mid = Math.floor(r.wireFrom * 0.55);
  const p0 = at(r.path[mid], mid);
  const p1 = at(r.path[mid + 1], mid + 1);
  ctx.save();
  ctx.translate(p0[0], p0[1]);
  let ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
  if (Math.cos(ang) < 0) ang += Math.PI;
  ctx.rotate(ang);
  ctx.font = '900 13px Impact, "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(10,10,12,0.75)';
  ctx.fillText(name, 0, 0);
  ctx.restore();
  // wireform: rails you can see the floor through
  ctx.lineCap = 'round';
  for (const [path, off, up] of [
    [left, 0.35, 0],
    [right, 0.35, 0],
    [left, 1, 14],
    [right, 1, 14],
  ] as [P[], number, number][]) {
    const pts = r.path.map((c, i) => [c[0] + (path[i][0] - c[0]) * off, c[1] + (path[i][1] - c[1]) * off - dz(i) - lift(up)] as P).slice(r.wireFrom - 1);
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.lineWidth = 4.5;
    strokePath(ctx, pts);
    ctx.stroke();
    ctx.strokeStyle = '#d4d8de';
    ctx.lineWidth = 2;
    strokePath(ctx, pts);
    ctx.stroke();
  }
  for (let i = r.wireFrom; i < n - 1; i += 3) {
    const a = at(left[i], i);
    const b = at(right[i], i);
    ctx.strokeStyle = '#9aa0a8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1] - lift(14));
    ctx.lineTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(b[0], b[1] - lift(14));
    ctx.stroke();
  }
  // steel side walls on the solid section
  for (const side of [left, right]) {
    const H = 18;
    const seg = side.slice(0, r.wireFrom + 1);
    for (let s = 0; s <= 7; s++) {
      const pts = seg.map((p, i) => [p[0], p[1] - dz(i) - lift((H * s) / 7)] as P);
      ctx.strokeStyle = s === 7 ? '#dfe3e8' : mix('#111215', '#4e535a', s / 7);
      ctx.lineWidth = s === 7 ? 3 : 5.5;
      ctx.lineJoin = 'round';
      strokePath(ctx, pts);
      ctx.stroke();
    }
    // red running light along the Skyway edge
    if (r.id === 'skyway') neonTube(ctx, seg.map((p, i) => [p[0], p[1] - dz(i)] as P), RED, 20, 1.6);
  }
  // entrance lip
  const [ea, eb] = r.entry;
  ctx.strokeStyle = '#6a6e74';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(ea[0], ea[1]);
  ctx.lineTo(eb[0], eb[1]);
  ctx.stroke();
}

// ------------------------------------------------------------------ live

/** Camera LEDs, and the red sweep cones (aimed at a watched shot in Infiltrate). */
export function paintCameras(ctx: CanvasRenderingContext2D, t: number, target: P | null) {
  L.CAMERAS.forEach(([x, y], i) => {
    const cy = y - lift(50);
    const on = Math.sin(t * 3 + i) > 0;
    if (on) {
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.arc(x + (i ? -8 : 8), cy - 6, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    const aimAt: P = target ?? [L.CX + Math.sin(t * 0.6 + i * 2) * 160, 560 + Math.cos(t * 0.4 + i) * 120];
    const a = Math.atan2(aimAt[1] - cy, aimAt[0] - x);
    const d = Math.hypot(aimAt[0] - x, aimAt[1] - cy);
    const spread = target ? 0.1 : 0.07;
    const g = ctx.createRadialGradient(x, cy, 0, x, cy, d + 40);
    const alpha = target ? 0.22 : 0.06;
    g.addColorStop(0, withAlpha(RED, alpha));
    g.addColorStop(1, withAlpha(RED, 0));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, cy);
    ctx.arc(x, cy, d + 40, a - spread, a + spread);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
  // the skull's neon outline flickers like a cheap sign
  const flick = Math.sin(t * 41) * Math.sin(t * 3.1) > 0.9 ? 0.2 : 1;
  ctx.globalAlpha = flick;
  ctx.drawImage(skullNeon(), L.CX - 50, 1018 - 50, 100, 100);
  ctx.globalAlpha = 1;
}

function skullNeon() {
  return sprite('skull-neon', 100, 100, (g) => {
    g.translate(50, 50);
    g.lineJoin = 'round';
    g.shadowColor = RED;
    g.shadowBlur = 12 * art.k;
    g.strokeStyle = RED;
    g.lineWidth = 2.4;
    skullPath(g);
    g.stroke();
    g.shadowBlur = 0;
    g.strokeStyle = '#ffb0a8';
    g.lineWidth = 0.9;
    skullPath(g);
    g.stroke();
  });
}

