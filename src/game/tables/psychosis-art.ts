// Cyber Psychosis art, after the concept sketch: pale cracked concrete drawn in
// ink, heavy steel with rivets and highlights, brass pipes, glossy red lights,
// and hazard stripes in a muted ochre. Everything is outlined like a pen drawing.

import { drawGlow, withAlpha } from '../../engine/fx';
import { offsetPath, type LowerSection, type P } from './geom';
import { art, drawBallAt, lift, mix, rng, shade, softShadow, sprite, strokePath } from './draw';
import * as L from './psychosis-layout';
import { TABLE_H, TABLE_W } from './table';

// ------------------------------------------------------------------ palette

export const INK = '#2a2622';
const PAPER = '#d8cfbd';
const STEEL_L = '#dcd9d1';
const STEEL = '#a8a69f';
const STEEL_D = '#67665f';
const STEEL_DD = '#3e3d38';
const RED = '#d22a1f';
const RED_D = '#7a130e';
const HAZ = '#c79f3b';
const BRASS = '#b88f4e';
const PLAQUE = '#2f2d2b';
const FONT = '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif';

// ------------------------------------------------------------------ pen-and-steel helpers

function inkLine(ctx: CanvasRenderingContext2D, w = 1.4, a = 0.9) {
  ctx.strokeStyle = withAlpha(INK, a);
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

function centroid(pts: P[]): P {
  return [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
}

function bounds(pts: P[]) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/** A rivet head: grey dome with an ink rim. */
function rivet(ctx: CanvasRenderingContext2D, x: number, y: number, r = 2) {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r);
  g.addColorStop(0, '#f4f4f2');
  g.addColorStop(0.6, STEEL);
  g.addColorStop(1, STEEL_D);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  inkLine(ctx, 0.7, 0.8);
  ctx.stroke();
}

/** Hex bolt head. */
function bolt(ctx: CanvasRenderingContext2D, x: number, y: number, r = 3.5) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  g.addColorStop(0, STEEL_L);
  g.addColorStop(1, STEEL_D);
  ctx.fillStyle = g;
  ctx.fill();
  inkLine(ctx, 0.8);
  ctx.stroke();
  ctx.fillStyle = withAlpha(INK, 0.6);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

let hatchTile: { k: number; pat: CanvasPattern } | null = null;
/** A fine diagonal pen-hatch pattern for cast shadows. */
function hatchFill(ctx: CanvasRenderingContext2D): CanvasPattern | string {
  if (typeof document === 'undefined') return 'rgba(40,30,20,0.2)';
  if (!hatchTile || hatchTile.k !== art.k) {
    const k = art.k;
    const c = document.createElement('canvas');
    const n = Math.max(4, Math.round(4 * k));
    c.width = c.height = n;
    const g = c.getContext('2d')!;
    g.strokeStyle = 'rgba(42,38,34,0.42)';
    g.lineWidth = Math.max(1, 0.6 * k);
    g.beginPath();
    g.moveTo(-1, n + 1);
    g.lineTo(n + 1, -1);
    g.stroke();
    const pat = ctx.createPattern(c, 'repeat')!;
    pat.setTransform(new DOMMatrix().scale(1 / k));
    hatchTile = { k, pat };
  }
  return hatchTile.pat;
}

/** Brushed steel fill for a region. */
function steelGrad(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, base = STEEL) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, mix(base, '#ffffff', 0.45));
  g.addColorStop(0.45, base);
  g.addColorStop(1, shade(base, -0.28));
  return g;
}

/** Pen hatching inside the current clip: parallel strokes at an angle. */
function hatch(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, gap = 4, angle = -0.8, a = 0.25, w = 0.7) {
  ctx.save();
  inkLine(ctx, w, a);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const d = Math.hypot(x1 - x0, y1 - y0);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  ctx.beginPath();
  for (let k = -d; k < d; k += gap) {
    ctx.moveTo(cx + c * -d - s * k, cy + s * -d + c * k);
    ctx.lineTo(cx + c * d - s * k, cy + s * d + c * k);
  }
  ctx.stroke();
  ctx.restore();
}

/** Ochre and black stripes inside the current clip. */
function stripes(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w = 9, seed = 1) {
  const R = rng(seed);
  ctx.fillStyle = HAZ;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.fillStyle = '#25211d';
  const h = y1 - y0;
  for (let i = x0 - h - w * 2; i < x1 + h; i += w * 2) {
    ctx.beginPath();
    ctx.moveTo(i, y1);
    ctx.lineTo(i + h, y0);
    ctx.lineTo(i + h + w, y0);
    ctx.lineTo(i + w, y1);
    ctx.fill();
  }
  // worn edges
  for (let i = 0; i < ((x1 - x0) * h) / 30; i++) {
    ctx.fillStyle = R() < 0.5 ? withAlpha(PAPER, 0.5) : 'rgba(40,30,20,0.35)';
    ctx.fillRect(x0 + R() * (x1 - x0), y0 + R() * h, 0.8 + R() * 2.5, 0.6 + R() * 1.5);
  }
}

/** Hazard band clipped to a polygon at height z. */
function hazardIn(ctx: CanvasRenderingContext2D, pts: P[], z = 0, w = 8, seed = 1) {
  const b = bounds(pts);
  const lz = lift(z);
  ctx.save();
  strokePath(ctx, pts, true, lz);
  ctx.clip();
  stripes(ctx, b.x0 - 4, b.y0 - lz - 4, b.x1 + 4, b.y1 - lz + 4, w, seed);
  ctx.restore();
  ctx.save();
  strokePath(ctx, pts, true, lz);
  inkLine(ctx, 1);
  ctx.stroke();
  ctx.restore();
}

/**
 * An extruded steel block: shadow, side band, lit top, then ink on every edge
 * a pen would draw: the base silhouette, the vertical corners and the top outline.
 */
function block(ctx: CanvasRenderingContext2D, pts: P[], z: number, top = STEEL, side = STEEL_D, rivets = true) {
  const lz = lift(z);
  softShadow(ctx, 7, 4, 6, 'rgba(40,30,20,0.35)', () => {
    strokePath(ctx, pts, true);
    ctx.fill();
  });
  // pen-hatched cast shadow
  const off = Math.min(12, 4 + z * 0.2);
  strokePath(
    ctx,
    pts.map(([x, y]) => [x + off * 0.7, y + off] as P),
    true,
  );
  ctx.fillStyle = hatchFill(ctx);
  ctx.fill();
  strokePath(ctx, pts, true);
  ctx.fillStyle = shade(side, -0.3);
  ctx.fill();
  inkLine(ctx, 1.4);
  ctx.stroke();
  const steps = Math.max(2, Math.ceil(lz / 1.2));
  for (let i = 1; i <= steps; i++) {
    strokePath(ctx, pts, true, (lz * i) / steps);
    ctx.fillStyle = mix(shade(side, -0.35), side, i / steps);
    ctx.fill();
  }
  inkLine(ctx, 1);
  ctx.beginPath();
  for (const [x, y] of pts) {
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - lz);
  }
  ctx.stroke();
  const b = bounds(pts);
  strokePath(ctx, pts, true, lz);
  ctx.fillStyle = steelGrad(ctx, b.x0, b.y0 - lz, b.x1, b.y1 - lz, top);
  ctx.fill();
  inkLine(ctx, 1.9);
  ctx.stroke();
  // bevel highlight just inside the top edge
  ctx.save();
  strokePath(ctx, pts, true, lz);
  ctx.clip();
  strokePath(ctx, pts, true, lz - 1.2);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
  // inset panel and pen shading on the top, darker toward its lower edge
  const c = centroid(pts);
  const inset = pts.map(([x, y]) => {
    const dx = c[0] - x;
    const dy = c[1] - y;
    const l = Math.hypot(dx, dy) || 1;
    const d = Math.min(7, l * 0.25);
    return [x + (dx / l) * d, y + (dy / l) * d] as P;
  });
  ctx.save();
  strokePath(ctx, inset, true, lz);
  inkLine(ctx, 0.7, 0.35);
  ctx.stroke();
  strokePath(ctx, pts, true, lz);
  ctx.clip();
  hatch(ctx, b.x0, b.y1 - lz - (b.y1 - b.y0) * 0.35, b.x1, b.y1 - lz, 3.2, -0.85, 0.12, 0.6);
  ctx.restore();
  if (rivets) {
    for (const [x, y] of pts) {
      const dx = c[0] - x;
      const dy = c[1] - y;
      const l = Math.hypot(dx, dy) || 1;
      if (l < 14) continue;
      rivet(ctx, x + (dx / l) * 6, y + (dy / l) * 6 - lz, 1.7);
    }
  }
}

/** A raised steel rail along a path, in ink. */
function rail(ctx: CanvasRenderingContext2D, pts: P[], h = 22, w = 7, top = STEEL_L, closed = false) {
  const lh = lift(h);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  softShadow(ctx, 4, 3, 4, 'rgba(40,30,20,0.35)', () => {
    strokePath(ctx, pts, closed);
    ctx.lineWidth = w + 2;
    ctx.stroke();
  });
  ctx.save();
  ctx.translate(4, 6);
  strokePath(ctx, pts, closed);
  ctx.lineWidth = w + 6;
  ctx.strokeStyle = hatchFill(ctx);
  ctx.stroke();
  ctx.restore();
  // ink silhouette first so it rims the body
  strokePath(ctx, pts, closed);
  ctx.lineWidth = w + 2.6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  const steps = Math.max(2, Math.ceil(lh / 1.2));
  for (let i = 0; i <= steps; i++) {
    strokePath(ctx, pts, closed, (lh * i) / steps);
    ctx.lineWidth = w + 2.6;
    ctx.strokeStyle = INK;
    if (i === steps) ctx.stroke();
    ctx.lineWidth = w;
    ctx.strokeStyle = mix(STEEL_DD, STEEL_D, i / steps);
    ctx.stroke();
  }
  strokePath(ctx, pts, closed, lh);
  ctx.lineWidth = w;
  ctx.strokeStyle = top;
  ctx.stroke();
  strokePath(ctx, pts, closed, lh + w * 0.22);
  ctx.lineWidth = Math.max(1, w * 0.3);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.stroke();
  ctx.restore();
}

/** A pipe at height z: dark rim, body, highlight, ink outline. */
function pipe(ctx: CanvasRenderingContext2D, pts: P[], r = 4, z = 8, color = STEEL) {
  const dy = lift(z);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  softShadow(ctx, 3, 2, 3, 'rgba(40,30,20,0.4)', () => {
    strokePath(ctx, pts);
    ctx.lineWidth = r * 2;
    ctx.stroke();
  });
  strokePath(ctx, pts, false, dy);
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 2 + 2;
  ctx.stroke();
  ctx.strokeStyle = shade(color, -0.35);
  ctx.lineWidth = r * 2;
  ctx.stroke();
  strokePath(ctx, pts, false, dy + r * 0.25);
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 1.2;
  ctx.stroke();
  strokePath(ctx, pts, false, dy + r * 0.5);
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = Math.max(0.8, r * 0.35);
  ctx.stroke();
  ctx.restore();
}

/** A vertical cylinder from z0 to z1 with a lit top, in ink. */
function can(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, z0: number, z1: number, side = STEEL, top: string | null = STEEL_L) {
  const y0 = y - lift(z0);
  const y1 = y - lift(z1);
  const ry = r * 0.5;
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, shade(side, -0.45));
  g.addColorStop(0.3, mix(side, '#ffffff', 0.4));
  g.addColorStop(0.6, side);
  g.addColorStop(1, shade(side, -0.55));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y0, r, ry, 0, 0, Math.PI);
  ctx.lineTo(x - r, y1);
  ctx.ellipse(x, y1, r, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  inkLine(ctx, 1.1);
  ctx.stroke();
  if (top) {
    const tg = ctx.createRadialGradient(x - r * 0.3, y1 - ry * 0.4, 0, x, y1, r);
    tg.addColorStop(0, '#ffffff');
    tg.addColorStop(1, top);
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.ellipse(x, y1, r, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

/** A glossy red lens. */
function lens(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, lit = 0.3) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 0, x, y, r);
  g.addColorStop(0, mix('#ff9a8a', '#ffffff', lit * 0.6));
  g.addColorStop(0.35, mix(RED, '#ff5a40', lit));
  g.addColorStop(1, RED_D);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  inkLine(ctx, 1);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.16, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

/** Bold condensed label, like the sketch's hand lettering. */
function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, angle = 0, color = INK, weight = 900) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** A painted red arrow on a surface. */
function paintedArrow(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, angle: number, color = RED, w = 3) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-len / 2, 0);
  ctx.lineTo(len / 2 - w * 2, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len / 2 + w, 0);
  ctx.lineTo(len / 2 - w * 2.6, -w * 2);
  ctx.lineTo(len / 2 - w * 2.6, w * 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ static playfield

export function paintStatic(ctx: CanvasRenderingContext2D, lower: LowerSection, drawInserts: () => void, drawDomes: () => void) {
  paintCabinet(ctx);
  ctx.save();
  ctx.beginPath();
  ctx.rect(20, 18, 560, TABLE_H);
  ctx.clip();
  paintFloor(ctx);
  paintFloorPlates(ctx);
  paintMap(ctx);
  paintSkull(ctx);
  paintFloorMarks(ctx);
  drawInserts();
  paintRampShadows(ctx);
  ctx.restore();

  paintLanes(ctx, lower);
  paintImpoundAndMachines(ctx);
  paintLeftMass(ctx);
  paintBreach(ctx);
  paintReactor(ctx);
  paintPopsBase(ctx);
  drawDomes();
  paintApron(ctx);
  paintCameraBody(ctx);
  paintGrain(ctx);
}

/** Fine pencil grain over everything, so steel and concrete read as one drawing. */
function paintGrain(ctx: CanvasRenderingContext2D) {
  const R = rng(77);
  ctx.save();
  for (let i = 0; i < 9000; i++) {
    const x = R() * TABLE_W;
    const y = R() * TABLE_H;
    const a = -0.9 + (R() - 0.5) * 0.5;
    const l = 1.5 + R() * 4;
    ctx.strokeStyle = R() < 0.7 ? `rgba(40,34,28,${0.05 + R() * 0.08})` : `rgba(255,252,245,${0.05 + R() * 0.1})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  ctx.restore();
}

function paintCabinet(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#8f9396';
  ctx.fillRect(0, 0, TABLE_W, TABLE_H);
  const R = rng(3);
  // side rails of the cabinet: heavy steel with bolts
  for (const x0 of [0, 580]) {
    ctx.fillStyle = steelGrad(ctx, x0, 0, x0 + 20, 0, '#a2a6a9');
    ctx.fillRect(x0, 0, 20, TABLE_H);
    inkLine(ctx, 1.4);
    ctx.strokeRect(x0 + 0.7, -2, 18.6, TABLE_H + 4);
    for (let y = 40; y < TABLE_H; y += 110) bolt(ctx, x0 + 10, y + R() * 6, 3.4);
  }
  // back panel above the playfield
  ctx.fillStyle = steelGrad(ctx, 0, 0, 0, 22, '#9a9ea1');
  ctx.fillRect(20, 0, 560, 20);
  inkLine(ctx, 1.4);
  ctx.beginPath();
  ctx.moveTo(20, 19.5);
  ctx.lineTo(580, 19.5);
  ctx.stroke();
}

/** Irregular concrete slabs, cracks, stains and pen texture. */
function paintFloor(ctx: CanvasRenderingContext2D) {
  const R = rng(11);
  ctx.fillStyle = PAPER;
  ctx.fillRect(20, 18, 560, TABLE_H);
  // tonal variation: slightly darker toward the edges and under the upper structures
  const vg = ctx.createRadialGradient(300, 760, 120, 300, 700, 720);
  vg.addColorStop(0, 'rgba(255,253,248,0.35)');
  vg.addColorStop(0.6, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(70,60,45,0.22)');
  ctx.fillStyle = vg;
  ctx.fillRect(20, 18, 560, TABLE_H);
  const tg = ctx.createLinearGradient(0, 18, 0, 760);
  tg.addColorStop(0, 'rgba(70,58,44,0.2)');
  tg.addColorStop(1, 'rgba(70,58,44,0)');
  ctx.fillStyle = tg;
  ctx.fillRect(20, 18, 560, 760);
  // stains
  for (let i = 0; i < 70; i++) {
    const x = 20 + R() * 560;
    const y = 18 + R() * TABLE_H;
    const r = 8 + R() * 46;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = R() < 0.7;
    g.addColorStop(0, dark ? `rgba(95,85,70,${0.05 + R() * 0.09})` : `rgba(255,255,250,${0.08 + R() * 0.1})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // speckle
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = R() < 0.6 ? `rgba(60,52,42,${0.1 + R() * 0.2})` : `rgba(255,255,255,${0.2 + R() * 0.3})`;
    ctx.fillRect(20 + R() * 560, 18 + R() * TABLE_H, 0.6 + R() * 0.9, 0.6 + R() * 0.9);
  }
  // slab joints: a jittered grid of long ruled lines, the way the sketch blocks out the concrete
  inkLine(ctx, 0.9, 0.38);
  const joint = (x0: number, y0: number, x1: number, y1: number) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    const n = 6;
    for (let i = 1; i <= n; i++) ctx.lineTo(x0 + ((x1 - x0) * i) / n + (R() - 0.5) * 2, y0 + ((y1 - y0) * i) / n + (R() - 0.5) * 2);
    ctx.stroke();
  };
  for (let y = 120; y < TABLE_H; y += 95 + R() * 60) joint(20, y + (R() - 0.5) * 40, 580, y + (R() - 0.5) * 60);
  for (let x = 90; x < 580; x += 80 + R() * 70) joint(x + (R() - 0.5) * 30, 18, x + (R() - 0.5) * 80, TABLE_H);
  // diagonal rays from the centre, like the sketch's construction lines
  inkLine(ctx, 0.6, 0.18);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(L.CX + Math.cos(a) * 60, 800 + Math.sin(a) * 60);
    ctx.lineTo(L.CX + Math.cos(a) * 520, 800 + Math.sin(a) * 520);
    ctx.stroke();
  }
  // cracks
  for (let i = 0; i < 46; i++) {
    let x = 20 + R() * 560;
    let y = 18 + R() * TABLE_H;
    let a = R() * Math.PI * 2;
    inkLine(ctx, 0.5 + R() * 0.7, 0.3 + R() * 0.35);
    ctx.beginPath();
    ctx.moveTo(x, y);
    const n = 4 + Math.floor(R() * 9);
    for (let k = 0; k < n; k++) {
      a += (R() - 0.5) * 1.3;
      x += Math.cos(a) * (5 + R() * 13);
      y += Math.sin(a) * (5 + R() * 13);
      ctx.lineTo(x, y);
      if (R() < 0.2) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a + 1.2) * 8, y + Math.sin(a + 1.2) * 8);
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  }
}

/** Steel deck plates bolted to the concrete where the sketch has them. */
function paintFloorPlates(ctx: CanvasRenderingContext2D) {
  const plate = (pts: P[], tone = '#a7aaac', seed = 1, rivets = true) => {
    const R = rng(seed);
    const b = bounds(pts);
    ctx.save();
    strokePath(ctx, pts, true);
    ctx.fillStyle = steelGrad(ctx, b.x0, b.y0, b.x1, b.y1, tone);
    ctx.fill();
    ctx.clip();
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.08 + R() * 0.12})`;
      ctx.lineWidth = 0.6;
      const y = b.y0 + R() * (b.y1 - b.y0);
      ctx.beginPath();
      ctx.moveTo(b.x0, y);
      ctx.lineTo(b.x1, y + (R() - 0.5) * 6);
      ctx.stroke();
    }
    hatch(ctx, b.x0, b.y0, b.x1, b.y1, 5, -0.9, 0.08);
    ctx.restore();
    strokePath(ctx, pts, true);
    inkLine(ctx, 1.1, 0.8);
    ctx.stroke();
    if (rivets) {
      const c = centroid(pts);
      for (const [x, y] of pts) {
        const dx = c[0] - x;
        const dy = c[1] - y;
        const l = Math.hypot(dx, dy) || 1;
        rivet(ctx, x + (dx / l) * 7, y + (dy / l) * 7, 1.6);
      }
    }
  };
  // the round deck under the pops, inside the Back Alley
  ctx.save();
  strokePath(ctx, L.ALLEY_INNER);
  ctx.lineTo(535, 300);
  ctx.lineTo(300, 300);
  ctx.closePath();
  ctx.fillStyle = '#a7a49b';
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(40,36,30,0.22)';
  ctx.lineWidth = 0.8;
  for (let r = 40; r < 220; r += 18) {
    ctx.beginPath();
    ctx.arc(418, 182, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(418 + Math.cos(a) * 40, 182 + Math.sin(a) * 40);
    ctx.lineTo(418 + Math.cos(a) * 220, 182 + Math.sin(a) * 220);
    ctx.stroke();
  }
  ctx.restore();
  // Back Alley channel floor: brushed steel trough
  const ch = [...L.ALLEY_OUTER.slice(0, -1), ...L.ALLEY_INNER.slice().reverse()];
  plate(ch, '#b9b5ac', 4, false);
  // diamond plates beside the slings and under the upper flippers
  plate(
    [
      [22, 150],
      [130, 176],
      [120, 290],
      [22, 290],
    ],
    '#9b988f',
    7,
  );
  plate(
    [
      [124, 1120],
      [214, 1170],
      [214, 1200],
      [22, 1200],
      [22, 1080],
    ],
    '#97948b',
    8,
  );
  plate(
    [
      [431, 1120],
      [341, 1170],
      [341, 1200],
      [533, 1200],
      [533, 1080],
    ],
    '#97948b',
    9,
  );
  // triangular plates and a grate either side of the centre channel
  plate(
    [
      [262, 610],
      [300, 590],
      [292, 650],
    ],
    '#9d9a91',
    13,
  );
  plate(
    [
      [334, 640],
      [366, 626],
      [372, 676],
      [342, 690],
    ],
    '#9d9a91',
    14,
  );
  plate(
    [
      [112, 760],
      [150, 744],
      [160, 800],
      [120, 812],
    ],
    '#9d9a91',
    15,
  );
  plate(
    [
      [404, 752],
      [442, 740],
      [452, 790],
      [414, 802],
    ],
    '#9d9a91',
    16,
  );
  // dark plate behind the skull
  plate(
    [
      [210, 960],
      [345, 960],
      [345, 1120],
      [210, 1120],
    ],
    '#86837b',
    10,
  );
  // shooter lane trough
  plate(
    [
      [536, 290],
      [579, 290],
      [579, 1200],
      [536, 1200],
    ],
    '#b6b2a9',
    12,
    false,
  );
}

/** The heist map: dark plaques on pipe links, from INFILTRATE down to BLACKOUT. */
function paintMap(ctx: CanvasRenderingContext2D) {
  const M = L.MAP;
  const spineTop: P = [L.CX, M.infiltrate[1] + 10];
  const mid: P = [L.CX, (M.hack[1] + M.payload[1]) / 2 - 12];
  const links: [P, P][] = [
    [
      [L.CX, M.infiltrate[1] - 56],
      [L.CX, M.infiltrate[1] - 22],
    ],
    [spineTop, [M.hack[0], M.hack[1] - 40]],
    [spineTop, [M.route[0], M.route[1] - 40]],
    [
      [M.hack[0], M.hack[1] - 40],
      [M.hack[0], M.hack[1] - 22],
    ],
    [
      [M.route[0], M.route[1] - 40],
      [M.route[0], M.route[1] - 22],
    ],
    [spineTop, mid],
    [mid, [M.payload[0], M.payload[1] - 22]],
    [mid, [M.extract[0], M.extract[1] - 22]],
    [M.hack, M.payload],
    [M.route, M.extract],
    [mid, [L.CX, M.blackout[1] - 22]],
    [M.payload, [M.blackout[0] - 30, M.blackout[1]]],
    [M.extract, [M.blackout[0] + 30, M.blackout[1]]],
  ];
  ctx.save();
  ctx.lineCap = 'round';
  for (const [a, b] of links) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.strokeStyle = '#5d5a56';
    ctx.lineWidth = 3.4;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
  // plaques: a dark steel frame with a dome on top, the lamp insert sits inside
  const plaque = (p: P, w: number, h: number, red = false) => {
    const [x, y] = p;
    softShadow(ctx, 5, 2, 3, 'rgba(30,20,10,0.45)', () => {
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - h / 2, w, h, 6);
      ctx.fill();
    });
    ctx.beginPath();
    ctx.arc(x, y - h / 2, 11, Math.PI, 0);
    ctx.fillStyle = PLAQUE;
    ctx.fill();
    inkLine(ctx, 1.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 6);
    ctx.fillStyle = PLAQUE;
    ctx.fill();
    ctx.strokeStyle = red ? RED : '#6b6864';
    ctx.lineWidth = 2;
    ctx.stroke();
    inkLine(ctx, 1);
    ctx.stroke();
  };
  for (const k of ['infiltrate', 'hack', 'route', 'payload', 'extract'] as const) plaque(M[k], 84, 28);
  plaque(M.blackout, 96, 34, true);
  label(ctx, 'THE HEIST', L.CX, M.infiltrate[1] - 66, 8, 0, withAlpha(INK, 0.7), 800);
}

/** The big grey stencil skull between the flippers, as in the sketch. */
function paintSkull(ctx: CanvasRenderingContext2D) {
  const x = L.CX;
  const y = 1015;
  ctx.save();
  ctx.translate(x, y);
  const s = 1.05;
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-50, -40);
  ctx.quadraticCurveTo(-52, -78, 0, -82);
  ctx.quadraticCurveTo(52, -78, 50, -40);
  ctx.lineTo(46, -6);
  ctx.lineTo(32, 6);
  ctx.lineTo(28, 54);
  ctx.lineTo(-28, 54);
  ctx.lineTo(-32, 6);
  ctx.lineTo(-46, -6);
  ctx.closePath();
  const outline = new Path2D();
  outline.moveTo(-50, -40);
  outline.quadraticCurveTo(-52, -78, 0, -82);
  outline.quadraticCurveTo(52, -78, 50, -40);
  outline.lineTo(46, -6);
  outline.lineTo(32, 6);
  outline.lineTo(28, 54);
  outline.lineTo(-28, 54);
  outline.lineTo(-32, 6);
  outline.lineTo(-46, -6);
  outline.closePath();
  ctx.fillStyle = 'rgba(178,176,170,0.85)';
  ctx.fill(outline);
  ctx.save();
  ctx.clip(outline);
  hatch(ctx, -60, -90, 60, 60, 3.5, -0.9, 0.16);
  ctx.restore();
  inkLine(ctx, 1.6, 0.7);
  ctx.stroke(outline);
  // eye sockets: angry slants
  ctx.fillStyle = 'rgba(42,38,34,0.85)';
  for (const m of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(m * 6, -30);
    ctx.lineTo(m * 40, -42);
    ctx.lineTo(m * 36, -18);
    ctx.lineTo(m * 12, -12);
    ctx.closePath();
    ctx.fill();
  }
  // nose
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(7, 4);
  ctx.lineTo(-7, 4);
  ctx.closePath();
  ctx.fill();
  // long teeth
  ctx.strokeStyle = 'rgba(42,38,34,0.8)';
  ctx.lineWidth = 2;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 7, 14);
    ctx.lineTo(i * 7.5, 52);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-26, 30);
  ctx.lineTo(26, 30);
  ctx.stroke();
  ctx.restore();
  // hazard stripes down to the drain
  ctx.save();
  ctx.beginPath();
  ctx.rect(236, 1080, 84, 60);
  ctx.clip();
  stripes(ctx, 236, 1080, 320, 1140, 9, 21);
  ctx.restore();
  inkLine(ctx, 1);
  ctx.strokeRect(236, 1080, 84, 60);
}

/** Painted arrows, chevrons and stencils on the concrete. */
function paintFloorMarks(ctx: CanvasRenderingContext2D) {
  // red painted arrows toward the shots, like the sketch
  paintedArrow(ctx, 205, 384, 46, -0.62);
  paintedArrow(ctx, 260, 640, 40, -1.85);
  paintedArrow(ctx, 440, 690, 40, -2.05);
  // yellow chevrons in front of the drops
  const ra = L.REACTOR_AXIS;
  const perp = L.REACTOR_PERP;
  for (let i = 0; i < 3; i++) {
    const c = L.add(L.add(L.REACTOR_MOUTH, ra, -30), perp, -22 + i * 22);
    const p = L.add(c, ra, -14);
    ctx.save();
    ctx.translate(p[0], p[1]);
    ctx.rotate(Math.atan2(ra[1], ra[0]));
    ctx.beginPath();
    ctx.rect(-10, -9, 20, 18);
    ctx.clip();
    stripes(ctx, -12, -11, 12, 11, 4, 30 + i);
    ctx.restore();
    ctx.save();
    ctx.translate(p[0], p[1]);
    ctx.rotate(Math.atan2(ra[1], ra[0]));
    inkLine(ctx, 1);
    ctx.strokeRect(-10, -9, 20, 18);
    ctx.restore();
  }
  // Skyway lane: name
  label(ctx, 'SKYWAY', 512.5, 728, 9, 0, withAlpha(INK, 0.75), 900);
  // shooter lane: SKILL SHOT, the arrows up it
  label(ctx, 'SKILL', 557.5, 1004, 10, 0, INK);
  label(ctx, 'SHOT', 557.5, 1016, 10, 0, INK);
  for (const y of [900, 1062]) paintedArrow(ctx, 557.5, y, 46, -Math.PI / 2, y > 1000 ? withAlpha(INK, 0.6) : RED, 2.5);
  // the duct: a grate up the left side
  ctx.save();
  ctx.beginPath();
  ctx.rect(22, 300, 44, 400);
  ctx.clip();
  ctx.fillStyle = '#9da0a2';
  ctx.fillRect(22, 300, 44, 400);
  inkLine(ctx, 0.9, 0.55);
  for (let y = 300; y < 700; y += 7) {
    ctx.beginPath();
    ctx.moveTo(22, y);
    ctx.lineTo(66, y + 3);
    ctx.stroke();
  }
  ctx.restore();
  label(ctx, 'DUCT', 43, 470, 9, -Math.PI / 2, withAlpha(INK, 0.8));
  paintedArrow(ctx, 43, 560, 40, -Math.PI / 2, RED, 2.5);
  // BACK ALLEY lettering along the loop
  const P0 = L.ALLEY_CENTER;
  const at = (f: number) => P0[Math.round((P0.length - 1) * f)];
  const ang = (f: number) => {
    const a = at(f - 0.03);
    const b = at(f + 0.03);
    return Math.atan2(b[1] - a[1], b[0] - a[0]);
  };
  label(ctx, 'BACK ALLEY', at(0.72)[0], at(0.72)[1], 12, ang(0.72));
  paintedArrow(ctx, at(0.5)[0], at(0.5)[1], 30, ang(0.5) + Math.PI, RED, 2.6);
  paintedArrow(ctx, at(0.9)[0], at(0.9)[1], 26, ang(0.9), RED, 2.6);
  // the Breach channel: name and the chevron sign pointing down it
  const ba = L.BREACH_AXIS;
  const bAng = Math.atan2(ba[1], ba[0]) - Math.PI / 2;
  const lp = L.add(L.BREACH, ba, 36);
  label(ctx, 'BREACH', lp[0], lp[1], 12, bAng);
  const sp = L.add(L.BREACH, ba, 196);
  ctx.save();
  ctx.translate(sp[0], sp[1]);
  ctx.rotate(bAng);
  ctx.beginPath();
  ctx.moveTo(-12, -18);
  ctx.lineTo(12, -18);
  ctx.lineTo(12, 10);
  ctx.lineTo(0, 22);
  ctx.lineTo(-12, 10);
  ctx.closePath();
  ctx.fillStyle = PLAQUE;
  ctx.fill();
  inkLine(ctx, 1);
  ctx.stroke();
  ctx.strokeStyle = '#ece8df';
  ctx.lineWidth = 2.2;
  for (const yy of [-8, 2, 12]) {
    ctx.beginPath();
    ctx.moveTo(-7, yy - 4);
    ctx.lineTo(0, yy + 2);
    ctx.lineTo(7, yy - 4);
    ctx.stroke();
  }
  ctx.restore();
  // RAGE and bonus labels
  label(ctx, 'BONUS', L.CX, 968, 7.5, 0, withAlpha(INK, 0.7), 800);
  ctx.beginPath();
  ctx.roundRect(252, 527, 133, 32, 5);
  ctx.fillStyle = withAlpha(PLAQUE, 0.85);
  ctx.fill();
  inkLine(ctx, 1);
  ctx.stroke();
  label(ctx, 'BLACK MARKET', 318, 534, 7.5, 0, '#ece8df', 900);
}

/** Ramps cast a pencil-hatched shadow on the concrete below them. */
function paintRampShadows(ctx: CanvasRenderingContext2D) {
  for (const r of L.RAMPS) {
    const a = r.baseTo;
    const b = r.wireFrom;
    const shadow = new Path2D();
    for (let i = a; i <= b; i++) shadow.lineTo(r.walls.left[i][0] + 8, r.walls.left[i][1] + 10);
    for (let i = b; i >= a; i--) shadow.lineTo(r.walls.right[i][0] + 8, r.walls.right[i][1] + 10);
    shadow.closePath();
    ctx.save();
    ctx.fillStyle = 'rgba(70,58,42,0.16)';
    ctx.fill(shadow);
    ctx.clip(shadow);
    const bb = bounds([...r.walls.left.slice(a, b + 1), ...r.walls.right.slice(a, b + 1)]);
    hatch(ctx, bb.x0, bb.y0, bb.x1 + 10, bb.y1 + 12, 3.2, -0.9, 0.22, 0.6);
    ctx.restore();
  }
}

/** Cabinet walls, the loop, the shooter lane, lower guides and slings. */
function paintLanes(ctx: CanvasRenderingContext2D, lower: LowerSection) {
  rail(ctx, L.ALLEY_OUTER, 30, 9);
  rail(ctx, L.ALLEY_INNER, 26, 8);
  rail(ctx, L.LEFT_LOW, 30, 9);
  rail(ctx, L.RIGHT_WALL, 30, 9);
  rail(ctx, L.PLUNGER_WALL, 24, 7);
  rail(ctx, L.GATE, 18, 4, '#e8e4dc');
  rail(ctx, L.UPPER_LEFT, 28, 8);
  rail(ctx, L.TOP_GUIDE, 16, 6);
  rail(ctx, L.DUCT_GATE, 10, 4, '#e8e4dc');
  rail(ctx, L.LANE_ROOF, 22, 7);
  rail(
    ctx,
    [
      [L.SKY_LANE_X, 640],
      [L.SKY_LANE_X, 672],
    ],
    22,
    7,
  );
  // ramp feet: the lane walls up to where the ramp lifts off
  for (const r of L.RAMPS) {
    rail(ctx, r.walls.left.slice(0, r.baseTo + 1), 20, 6);
    rail(ctx, r.walls.right.slice(0, r.baseTo + 1), 20, 6);
  }
  // inlane guides: steel rails with bolts
  for (const g of lower.guides) {
    rail(ctx, g, 20, 7);
    for (const [x, y] of g) bolt(ctx, x, y - lift(20), 3);
  }
  // rollover slots in the in/outlanes
  for (const [x0, x1] of L.ROLLOVERS) {
    const x = (x0 + x1) / 2;
    ctx.beginPath();
    ctx.roundRect(x - 4, L.ROLL_Y + 14, 8, 34, 4);
    ctx.fillStyle = '#1f1c19';
    ctx.fill();
    inkLine(ctx, 1);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(x - 6.5, L.ROLL_Y + 11.5, 13, 39, 6);
    ctx.stroke();
  }
  // slingshots: angular steel frames with a red lamp lens inside
  for (const tri of lower.slings) sling(ctx, tri);
  // rubber post by the Black Market flipper
  can(ctx, L.MID_POST[0], L.MID_POST[1], 6, 0, 14, '#2d2a27', '#55504a');
  rivet(ctx, L.MID_POST[0], L.MID_POST[1] - lift(14), 2.4);
}

function sling(ctx: CanvasRenderingContext2D, tri: P[]) {
  const z = 26;
  const c = centroid(tri);
  const grow = (d: number) =>
    tri.map(([x, y]) => {
      const l = Math.hypot(x - c[0], y - c[1]) || 1;
      return [x + ((x - c[0]) / l) * d, y + ((y - c[1]) / l) * d] as P;
    });
  // rubber band round the posts
  ctx.save();
  strokePath(ctx, grow(4), true, lift(8));
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7.5;
  ctx.stroke();
  ctx.strokeStyle = '#2f2b28';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
  block(ctx, grow(-3), z, '#a19f98', STEEL_D, false);
  // red lamp lens set in the plate, with its brass bezel
  const lz = lift(z);
  const [x, y] = c;
  ctx.save();
  ctx.translate(x, y - lz);
  const a = Math.atan2(tri[2][1] - tri[0][1], tri[2][0] - tri[0][0]);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = BRASS;
  ctx.fill();
  inkLine(ctx, 1);
  ctx.stroke();
  const g = ctx.createLinearGradient(-15, 0, 15, 0);
  g.addColorStop(0, RED_D);
  g.addColorStop(0.5, '#ff6a50');
  g.addColorStop(1, RED_D);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  for (const [px, py] of tri) {
    can(ctx, px, py, 5, 0, 18, '#36322e', '#5a554f');
    bolt(ctx, px, py - lift(18), 2.6);
  }
}

/** The Impound lock box, its machinery neighbour and the pipes around them. */
function paintImpoundAndMachines(ctx: CanvasRenderingContext2D) {
  // pipes along the back wall first
  pipe(
    ctx,
    [
      [24, 300],
      [24, 150],
      [36, 128],
      [36, 24],
    ],
    4.5,
    10,
    BRASS,
  );
  pipe(
    ctx,
    [
      [190, 24],
      [190, 60],
      [214, 80],
      [214, 118],
    ],
    3.5,
    30,
    STEEL,
  );
  block(ctx, L.MACHINE, 40, '#8e8c85', STEEL_DD, true);
  // machinery top: a transformer, a gauge and a hazard plate
  const mz = lift(40);
  ctx.save();
  ctx.beginPath();
  ctx.rect(184, 30 - mz, 40, 18);
  ctx.clip();
  stripes(ctx, 184, 30 - mz, 224, 48 - mz, 5, 41);
  ctx.restore();
  inkLine(ctx, 1);
  ctx.strokeRect(184, 30 - mz, 40, 18);
  can(ctx, 202, 86, 10, 40, 58, '#8c9093', '#c9cccd');
  ctx.beginPath();
  ctx.arc(196, 108 - mz, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#ece8df';
  ctx.fill();
  inkLine(ctx, 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(196, 108 - mz);
  ctx.lineTo(200, 103 - mz);
  ctx.strokeStyle = RED;
  ctx.stroke();

  // the Impound box
  const H = 44;
  const lh = lift(H);
  block(ctx, L.IMPOUND_BOX, H, '#a09e97', STEEL_D, true);
  label(ctx, 'IMPOUND', 112, 44 - lh, 17, 0, INK);
  // window onto the locked balls, set in the box's top face
  ctx.beginPath();
  ctx.roundRect(52, 82 - lh, 108, 40, 12);
  ctx.fillStyle = '#1d1b19';
  ctx.fill();
  inkLine(ctx, 1.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(48, 78 - lh, 116, 48, 15);
  ctx.strokeStyle = '#6e7276';
  ctx.lineWidth = 2;
  ctx.stroke();
  for (const [x, y] of L.IMPOUND_SLOTS) {
    ctx.beginPath();
    ctx.arc(x, y - lh - 2, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#2b2825';
    ctx.fill();
  }
  // lock wire from the Skyway's bend up into the box
  const lane = offsetPath(L.IMPOUND_LANE, 8);
  for (const side of [lane.left, lane.right]) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath();
    side.forEach(([x, y], i) => {
      const z = 60 - (i / (side.length - 1)) * 10;
      if (i) ctx.lineTo(x, y - lift(z));
      else ctx.moveTo(x, y - lift(z));
    });
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.4;
    ctx.stroke();
    ctx.strokeStyle = '#e8e9ea';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }
}

/** Machinery packed between the duct and the Breach, as in the sketch. */
function paintLeftMass(ctx: CanvasRenderingContext2D) {
  block(ctx, L.LEFT_MASS, 34, '#85847e', STEEL_DD, true);
  const lz = lift(34);
  // hatched shading over the machinery top
  ctx.save();
  strokePath(ctx, L.LEFT_MASS, true, lz);
  ctx.clip();
  hatch(ctx, 60, 280 - lz, 210, 700 - lz, 3, -0.7, 0.22, 0.6);
  can(ctx, 112, 430, 12, 34, 52, '#9a9993', '#c8c6bf');
  can(ctx, 92, 640, 10, 34, 50, '#9a9993', '#c8c6bf');
  ctx.restore();
  pipe(
    ctx,
    [
      [170, 345],
      [140, 352],
      [118, 380],
    ],
    3.4,
    40,
    BRASS,
  );
  pipe(
    ctx,
    [
      [78, 340],
      [92, 360],
      [92, 520],
      [86, 600],
    ],
    4,
    34,
    BRASS,
  );
  pipe(
    ctx,
    [
      [120, 330],
      [104, 380],
      [104, 560],
    ],
    3,
    36,
    STEEL,
  );
  can(ctx, 150, 336, 9, 34, 46, '#8c9093', '#c9cccd');
  bolt(ctx, 150, 336 - lift(46), 3);
  for (let y = 400; y < 640; y += 48) rivet(ctx, 78, y - lz, 1.8);
}

/** The Breach: scoop housing and two kite banks of riveted steel. */
function paintBreach(ctx: CanvasRenderingContext2D) {
  const z = 34;
  const lz = lift(z);
  // the solid structure the banks and housing stand on
  block(ctx, L.BREACH_BOX, 16, '#7f7e78', STEEL_DD, false);
  for (const bank of [L.BANK_L, L.BANK_R]) {
    const pts: P[] = [bank.peak, bank.top, bank.bottom, bank.outer];
    block(ctx, pts, z, '#9c9a93', STEEL_D, true);
    // hazard band toward the bottom of each bank
    const mid = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    hazardIn(ctx, [mid(bank.top, bank.bottom, 0.72), bank.bottom, mid(bank.outer, bank.bottom, 0.25), mid(bank.outer, bank.bottom, 0.0)], z, 5, 50);
    // a seam down the middle of the plate
    ctx.beginPath();
    ctx.moveTo(bank.peak[0], bank.peak[1] - lz);
    ctx.lineTo((bank.bottom[0] + bank.outer[0]) / 2, (bank.bottom[1] + bank.outer[1]) / 2 - lz);
    inkLine(ctx, 0.8, 0.5);
    ctx.stroke();
  }
  // scoop housing: a compact box over the cup, between the banks' tops
  const [bx, by] = L.BREACH;
  const housing: P[] = [
    [bx - 27, 362],
    [bx + 28, 362],
    [bx + 30, by - 14],
    [bx - 29, by - 14],
  ];
  block(ctx, housing, z + 10, '#8f8e88', STEEL_DD, true);
  const hz = lift(z + 10);
  // grille on the housing top
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(bx - 18, 370 - hz, 36, 26, 4);
  ctx.fillStyle = '#2a2724';
  ctx.fill();
  inkLine(ctx, 1);
  ctx.stroke();
  ctx.strokeStyle = '#8e9194';
  ctx.lineWidth = 1.2;
  for (let x = bx - 15; x < bx + 18; x += 5) {
    ctx.beginPath();
    ctx.moveTo(x, 373 - hz);
    ctx.lineTo(x, 393 - hz);
    ctx.stroke();
  }
  ctx.restore();
  lens(ctx, bx, 410 - hz, 6, 0.4);
  // the cup
  rail(ctx, L.BREACH_CUP, 26, 6);
  // scoop hole with the red light glowing in it
  const g = ctx.createRadialGradient(bx, by, 2, bx, by, 20);
  g.addColorStop(0, '#ff6a4a');
  g.addColorStop(0.35, RED);
  g.addColorStop(0.8, '#3a0a08');
  g.addColorStop(1, '#1a1210');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(bx, by, 17, 0, Math.PI * 2);
  ctx.fill();
  inkLine(ctx, 1.2);
  ctx.stroke();
}

/** The Reactor housing; its red eye is a sprite so it can glow. */
function paintReactor(ctx: CanvasRenderingContext2D) {
  const R = L.REACTOR;
  const z = 36;
  const lz = lift(z);
  block(ctx, R.shell, z, '#97958e', STEEL_D, true);
  // hazard rim round the top
  ctx.save();
  strokePath(ctx, R.shell, true, lz);
  ctx.clip();
  strokePath(ctx, R.shell, true, lz);
  ctx.lineWidth = 9;
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = HAZ;
  ctx.stroke();
  ctx.lineDashOffset = 6;
  ctx.strokeStyle = '#25211d';
  ctx.stroke();
  ctx.restore();
  // the round reactor drum the eye sits in
  const [ex, ey] = R.eye;
  can(ctx, ex + 4, ey + 18, 44, z, z + 10, '#9d9c96', null);
  ctx.beginPath();
  ctx.ellipse(ex + 4, ey + 18 - lift(z + 10), 44, 30, 0, 0, Math.PI * 2);
  ctx.fillStyle = steelGrad(ctx, ex - 40, ey - 40, ex + 48, ey + 40, '#b9b8b1');
  ctx.fill();
  inkLine(ctx, 1.5);
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.lineWidth = 7;
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = HAZ;
  ctx.beginPath();
  ctx.ellipse(ex + 4, ey + 18 - lift(z + 10), 40, 26.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineDashOffset = 6;
  ctx.strokeStyle = '#25211d';
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(ex, ey - lz, 33, 0, Math.PI * 2);
  ctx.fillStyle = steelGrad(ctx, ex - 33, ey - lz - 33, ex + 33, ey - lz + 33, '#9a9ea1');
  ctx.fill();
  inkLine(ctx, 1.4);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    rivet(ctx, ex + Math.cos(a) * 29, ey - lz + Math.sin(a) * 29, 1.6);
  }
  // the channel the captive ball runs in, and the funnel behind the drops
  ctx.fillStyle = '#24211e';
  strokePath(ctx, [R.channelL0, R.channelL1, R.channelR1, R.channelR0], true);
  ctx.fill();
  strokePath(ctx, [R.mouthL, R.channelL0, R.channelR0, R.mouthR], true);
  ctx.fillStyle = '#3a3632';
  ctx.fill();
  rail(ctx, [R.mouthL, R.channelL0, R.channelL1], 24, 5);
  rail(ctx, [R.mouthR, R.channelR0, R.channelR1], 24, 5);
  label(ctx, 'REACTOR', ex + 4, ey - lz - 44, 13, 0, INK);
  pipe(
    ctx,
    [
      [488, 500],
      [470, 520],
      [470, 560],
    ],
    3.5,
    36,
    BRASS,
  );
}

/** Pipework and posts round the pop bumpers. */
function paintPopsBase(ctx: CanvasRenderingContext2D) {
  pipe(
    ctx,
    [
      [L.BUMPERS[0][0] + 20, L.BUMPERS[0][1] + 10],
      [L.BUMPERS[2][0] - 20, L.BUMPERS[2][1] - 4],
    ],
    3.2,
    14,
    STEEL,
  );
  pipe(
    ctx,
    [
      [L.BUMPERS[1][0] + 18, L.BUMPERS[1][1] + 16],
      [L.BUMPERS[2][0] + 4, L.BUMPERS[2][1] - 22],
    ],
    3.2,
    18,
    BRASS,
  );
  // small steel posts topped with balls, like the sketch's decorations
  for (const [x, y] of [
    [508, 168],
    [330, 250],
  ] as P[]) {
    can(ctx, x, y, 4, 0, 26, STEEL_D, null);
    drawBallAt(ctx, x, y, 26 + 9);
  }
}

function paintApron(ctx: CanvasRenderingContext2D) {
  const lh = lift(12);
  // angled steel plates at the bottom corners with mesh grilles
  for (const m of [1, -1]) {
    const X = (dx: number) => L.CX + m * dx;
    const pts: P[] = [
      [X(-257.5), 1110],
      [X(-112), 1176],
      [X(-112), 1200],
      [X(-257.5), 1200],
    ];
    block(ctx, pts, 12, '#8f8d86', STEEL_DD, true);
    ctx.save();
    const gx = Math.min(X(-240), X(-180));
    ctx.beginPath();
    ctx.rect(gx, 1150 - lh, 60, 40);
    ctx.clip();
    ctx.fillStyle = '#4a4d50';
    ctx.fillRect(gx, 1150 - lh, 60, 40);
    ctx.strokeStyle = 'rgba(220,220,220,0.5)';
    ctx.lineWidth = 0.7;
    for (let k = -60; k < 100; k += 4) {
      ctx.beginPath();
      ctx.moveTo(gx + k, 1150 - lh);
      ctx.lineTo(gx + k + 40, 1190 - lh);
      ctx.moveTo(gx + k + 40, 1150 - lh);
      ctx.lineTo(gx + k, 1190 - lh);
      ctx.stroke();
    }
    ctx.restore();
    inkLine(ctx, 1);
    ctx.strokeRect(gx, 1150 - lh, 60, 40);
  }
}

function paintCameraBody(ctx: CanvasRenderingContext2D) {
  const [x, y] = L.CAMERAS[0];
  const z = 60;
  const lz = lift(z);
  can(ctx, x + 6, y, 4, 0, z - 4, STEEL_D, null);
  ctx.save();
  ctx.translate(x, y - lz);
  ctx.rotate(0.55);
  ctx.beginPath();
  ctx.roundRect(-24, -8, 34, 16, 3);
  ctx.fillStyle = steelGrad(ctx, -24, -8, 10, 8, '#c9cbcc');
  ctx.fill();
  inkLine(ctx, 1.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-30, -10, 8, 20, 2);
  ctx.fillStyle = '#6e7276';
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-31, 0, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#1b1a19';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ ramps (drawn over floor balls)

export function paintRamps(ctx: CanvasRenderingContext2D) {
  paintSkyway(ctx);
  paintMarket(ctx);
}

const zAt = (r: L.RampDef, i: number) => lift(r.z[Math.min(r.z.length - 1, i)]);

/** Fill the ramp bed between its walls from index a to b. */
function bed(ctx: CanvasRenderingContext2D, r: L.RampDef, a: number, b: number, color: string) {
  ctx.beginPath();
  for (let i = a; i <= b; i++) ctx.lineTo(r.walls.left[i][0], r.walls.left[i][1] - zAt(r, i));
  for (let i = b; i >= a; i--) ctx.lineTo(r.walls.right[i][0], r.walls.right[i][1] - zAt(r, i));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  inkLine(ctx, 1.4);
  ctx.stroke();
}

function sideWall(ctx: CanvasRenderingContext2D, r: L.RampDef, side: P[], a: number, b: number, h = 12) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = (dz: number) => {
    ctx.beginPath();
    for (let i = a; i <= b; i++) ctx.lineTo(side[i][0], side[i][1] - zAt(r, i) - dz);
  };
  for (let k = 0; k <= 4; k++) {
    path((lift(h) * k) / 4);
    ctx.strokeStyle = k === 4 ? STEEL_L : mix(STEEL_DD, STEEL_D, k / 4);
    ctx.lineWidth = k === 4 ? 4 : 4.5;
    ctx.stroke();
  }
  path(lift(h));
  inkLine(ctx, 1.2);
  ctx.stroke();
  path(lift(h) + 1.2);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** Support legs from the floor up to the ramp bed, braced in pairs. */
function legs(ctx: CanvasRenderingContext2D, r: L.RampDef, from: number, to: number, every: number) {
  for (let i = from; i < to; i += every) {
    const [lx, ly] = r.walls.left[i];
    const [rx, ry] = r.walls.right[i];
    const top = r.z[i] - 2;
    if (top >= 18) {
      ctx.beginPath();
      ctx.moveTo(lx, ly - lift(top) + 3);
      ctx.lineTo(rx, ry - 2);
      ctx.moveTo(rx, ry - lift(top) + 3);
      ctx.lineTo(lx, ly - 2);
      inkLine(ctx, 1.6, 0.7);
      ctx.stroke();
      ctx.strokeStyle = STEEL_D;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    for (const side of [r.walls.left, r.walls.right]) {
      const [x, y] = side[i];
      const top = r.z[i] - 2;
      if (top < 10) continue;
      ctx.fillStyle = STEEL_D;
      ctx.fillRect(x - 3, y - lift(top), 6, lift(top));
      inkLine(ctx, 1);
      ctx.strokeRect(x - 3, y - lift(top), 6, lift(top));
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(x - 2, y - lift(top), 1.2, lift(top));
      bolt(ctx, x, y - 1, 2.6);
    }
  }
}

function wireform(ctx: CanvasRenderingContext2D, r: L.RampDef, from: number, to = r.path.length) {
  const n = Math.min(to, r.path.length);
  const rails: P[][] = [offsetPath(r.path, 13).left, offsetPath(r.path, 13).right, offsetPath(r.path, 9).left, offsetPath(r.path, 9).right];
  const zOff = [6, 6, -3, -3];
  rails.forEach((side, k) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = from; i < n; i++) ctx.lineTo(side[i][0], side[i][1] - zAt(r, i) - lift(zOff[k]));
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.6;
    ctx.stroke();
    ctx.strokeStyle = '#eceeef';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  });
  // hoops
  for (let i = from; i < n - 2; i += 3) {
    const [lx, ly] = rails[0][i];
    const [rx, ry] = rails[1][i];
    const z = zAt(r, i);
    ctx.beginPath();
    ctx.moveTo(lx, ly - z - lift(6));
    ctx.quadraticCurveTo((lx + rx) / 2, (ly + ry) / 2 - z + lift(6), rx, ry - z - lift(6));
    inkLine(ctx, 2.6);
    ctx.stroke();
    ctx.strokeStyle = '#d8dadb';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

function paintSkyway(ctx: CanvasRenderingContext2D) {
  const r = L.SKYWAY;
  const end = r.wireFrom;
  legs(ctx, r, r.baseTo + 4, end, 7);
  // steel deck with plate seams
  bed(ctx, r, 0, end, '#b3b0a8');
  ctx.save();
  inkLine(ctx, 0.8, 0.45);
  for (let i = 4; i < end; i += 4) {
    const [lx, ly] = r.walls.left[i];
    const [rx, ry] = r.walls.right[i];
    ctx.beginPath();
    ctx.moveTo(lx, ly - zAt(r, i));
    ctx.lineTo(rx, ry - zAt(r, i));
    ctx.stroke();
  }
  ctx.restore();
  sideWall(ctx, r, r.walls.left, 0, end);
  sideWall(ctx, r, r.walls.right, 0, end);
  for (let i = 3; i < end; i += 3)
    for (const side of [r.walls.left, r.walls.right]) {
      const [x, y] = side[i];
      rivet(ctx, x, y - zAt(r, i) - lift(12), 1.3);
    }
  // name and arrows along the deck
  const deckA = r.path[Math.round(r.path.length * 0.26)];
  const deckB = r.path[Math.round(r.path.length * 0.3)];
  const ang = Math.atan2(deckB[1] - deckA[1], deckB[0] - deckA[0]) + Math.PI;
  const mi = Math.round(r.path.length * 0.3);
  const mid = r.path[mi];
  label(ctx, 'SKYWAY', mid[0], mid[1] - zAt(r, mi), 20, ang);
  for (const f of [0.2, 0.4]) {
    const i = Math.round(r.path.length * f);
    paintedArrow(ctx, r.path[i][0], r.path[i][1] - zAt(r, i), 26, ang + Math.PI, RED, 2.6);
  }
  wireform(ctx, r, end - 1);
}

function paintMarket(ctx: CanvasRenderingContext2D) {
  const r = L.MARKET;
  const end = r.wireFrom;
  // a short steel entry ramp, then wire over the pops so the bumpers show through
  const lip = r.baseTo + 4;
  legs(ctx, r, lip, end, 6);
  bed(ctx, r, 0, lip, '#ada9a1');
  sideWall(ctx, r, r.walls.left, 0, lip, 10);
  sideWall(ctx, r, r.walls.right, 0, lip, 10);
  wireform(ctx, r, lip, end + 1);
  // the market box: a raised steel platform where the ramp turns down the right side
  const z = 70;
  const lz = lift(z);
  block(
    ctx,
    L.MARKET_BOX.map(([x, y]) => [x, y - lift(z - 26)] as P),
    26,
    '#a6a49d',
    STEEL_D,
    true,
  );
  label(ctx, 'BLACK', 524, 330 - lz, 15, 0, INK);
  label(ctx, 'MARKET', 524, 346 - lz, 15, 0, INK);
  paintedArrow(ctx, 548, 370 - lz, 22, 0.9, RED, 2.6);
  wireform(ctx, r, end - 1);
}

// ------------------------------------------------------------------ dynamic and sprites

/** Security camera sweep and the plunger. */
export function paintDynamic(ctx: CanvasRenderingContext2D, t: number, target: P | null, pull: number) {
  const [cx, cy] = L.CAMERAS[0];
  const ox = cx - 22;
  const oy = cy - lift(60) + 12;
  const sweep = target ?? ([L.CX + Math.sin(t * 0.5) * 200, 520 + Math.cos(t * 0.37) * 160] as P);
  const a = Math.atan2(sweep[1] - oy, sweep[0] - ox);
  const len = Math.hypot(sweep[0] - ox, sweep[1] - oy) + 40;
  const spread = target ? 0.07 : 0.12;
  const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, len);
  g.addColorStop(0, withAlpha(RED, target ? 0.34 : 0.16));
  g.addColorStop(1, withAlpha(RED, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(ox + Math.cos(a - spread) * len, oy + Math.sin(a - spread) * len);
  ctx.lineTo(ox + Math.cos(a + spread) * len, oy + Math.sin(a + spread) * len);
  ctx.closePath();
  ctx.fill();
  if (target) drawGlow(ctx, target[0], target[1], 40, RED, 0.35 + 0.25 * Math.sin(t * 9));
  // plunger: spring, rod and knob
  const py = 1180 + pull * 50;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  for (let i = 0; i <= 14; i++) ctx.lineTo(i % 2 ? 564 : 551, py + 6 + (i / 14) * (1236 - py - 6));
  ctx.stroke();
  ctx.strokeStyle = '#c7cacc';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = steelGrad(ctx, 549, py - 4, 566, py + 4, '#c9cbcc');
  ctx.fillRect(549.5, py - 4 - lift(10), 16, 8 + lift(10));
  inkLine(ctx, 1.2);
  ctx.strokeRect(549.5, py - 4 - lift(10), 16, 8 + lift(10));
}

const TANK_H = 44;

/** Industrial pop bumper: a riveted tank with a domed cap and a red lens. */
export function drawTank(ctx: CanvasRenderingContext2D, x: number, y: number, r0: number, hit: number) {
  const lit = hit > 0;
  const r = r0 + 3;
  const pad = r + 12;
  const w = pad * 2;
  const h = pad * 2 + lift(TANK_H + 16);
  const c = sprite(`tank:${r}:${lit}`, w, h, (g) => {
    const X = pad;
    const Y = h - pad;
    softShadow(g, 8, 4, 6, 'rgba(40,30,20,0.5)', () => {
      g.beginPath();
      g.ellipse(X + 4, Y + 4, r + 8, (r + 8) * 0.6, 0, 0, Math.PI * 2);
      g.fill();
    });
    can(g, X, Y, r + 7, 0, 5, STEEL_DD, '#6e7276');
    can(g, X, Y, r, 5, TANK_H, '#b3b6b8', null);
    // rivet bands
    for (const z of [12, TANK_H - 8]) {
      const yy = Y - lift(z);
      g.beginPath();
      g.ellipse(X, yy, r, r * 0.5, 0, 0, Math.PI);
      inkLine(g, 1, 0.7);
      g.stroke();
      for (let i = 1; i < 8; i++) {
        const a = (i / 8) * Math.PI;
        rivet(g, X + Math.cos(a) * r * 0.98, yy + Math.sin(a) * r * 0.49, 1.3);
      }
    }
    // weld streak in brass
    g.strokeStyle = withAlpha(BRASS, 0.6);
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(X - r * 0.5, Y - lift(16));
    g.lineTo(X - r * 0.45, Y - lift(TANK_H - 10));
    g.stroke();
    // domed cap
    const cy = Y - lift(TANK_H);
    const dg = g.createRadialGradient(X - r * 0.35, cy - r * 0.55, 0, X, cy - r * 0.15, r * 1.1);
    dg.addColorStop(0, '#ffffff');
    dg.addColorStop(0.4, '#c4c7c9');
    dg.addColorStop(1, '#6d7175');
    g.fillStyle = dg;
    g.beginPath();
    g.ellipse(X, cy, r, r * 0.5, 0, 0, Math.PI);
    g.bezierCurveTo(X - r, cy - r * 0.9, X + r, cy - r * 0.9, X + r, cy);
    g.closePath();
    g.fill();
    inkLine(g, 1.3);
    g.stroke();
    g.beginPath();
    g.ellipse(X, cy, r, r * 0.5, 0, 0, Math.PI * 2);
    inkLine(g, 0.9, 0.6);
    g.stroke();
    lens(g, X, cy - r * 0.38, r * 0.34, lit ? 1 : 0.25);
    g.beginPath();
    g.arc(X, cy - r * 0.38, r * 0.46, 0, Math.PI * 2);
    inkLine(g, 1, 0.7);
    g.stroke();
  });
  const cw = c.width / art.k;
  const ch = c.height / art.k;
  const thump = hit * 2;
  ctx.drawImage(c, x - pad, y - (ch - pad) + thump, cw, ch);
  if (lit) drawGlow(ctx, x, y - lift(TANK_H) - r * 0.38, r * (1.6 + hit * 1.6), RED, 0.3 + hit * 0.6);
}

/** A thin standing target from a to b: front face, lit top, ink edges. */
function slab(ctx: CanvasRenderingContext2D, a: P, b: P, thick: number, z: number, top: string, side: string) {
  const lz = lift(z);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  const nx = (-dy / l) * (thick / 2);
  const ny = (dx / l) * (thick / 2);
  const q: P[] = [
    [a[0] + nx, a[1] + ny],
    [b[0] + nx, b[1] + ny],
    [b[0] - nx, b[1] - ny],
    [a[0] - nx, a[1] - ny],
  ];
  ctx.fillStyle = side;
  ctx.beginPath();
  for (const [x, y] of q) ctx.lineTo(x, y);
  for (const [x, y] of [...q].reverse()) ctx.lineTo(x, y - lz);
  ctx.fill();
  inkLine(ctx, 1);
  ctx.stroke();
  ctx.fillStyle = top;
  ctx.beginPath();
  q.forEach(([x, y]) => ctx.lineTo(x, y - lz));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** Red drop target with a dark arrow printed on it; `anim` 1 when fully down. */
export function drawDrop(ctx: CanvasRenderingContext2D, a: P, b: P, anim: number) {
  const z = 26 * (1 - anim);
  if (z < 1) return;
  slab(ctx, a, b, 7, z, '#e2443a', '#8e1a14');
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const lz = lift(z);
  ctx.fillStyle = 'rgba(40,10,8,0.6)';
  ctx.beginPath();
  ctx.moveTo(mx, my - lz * 0.85);
  ctx.lineTo(mx + 3.5, my - lz * 0.35);
  ctx.lineTo(mx - 3.5, my - lz * 0.35);
  ctx.closePath();
  ctx.fill();
}

/** Red standup on a Breach bank. */
export function drawStandup(ctx: CanvasRenderingContext2D, a: P, b: P, lit: boolean) {
  slab(ctx, a, b, 6, 24, lit ? '#ff7262' : '#c8281e', lit ? '#b0281e' : '#6a120e');
  if (lit) drawGlow(ctx, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - lift(24), 16, RED, 0.5);
}

/** The Reactor's red eye: concentric rings, hotter with heat, white-hot when it fires. */
export function drawReactorEye(ctx: CanvasRenderingContext2D, heat: number, glow: number) {
  const [x, y0] = L.REACTOR.eye;
  const y = y0 - lift(36);
  const hot = Math.max(heat * 0.6, glow);
  const c = sprite(`eye:${Math.round(hot * 10)}`, 64, 64, (g) => {
    const X = 32;
    const Y = 32;
    for (let i = 0; i < 4; i++) {
      const rr = 25 - i * 5;
      g.beginPath();
      g.arc(X, Y, rr, 0, Math.PI * 2);
      g.fillStyle = i % 2 ? '#4a4d50' : '#2a2826';
      g.fill();
      inkLine(g, 1, 0.8);
      g.stroke();
    }
    const eg = g.createRadialGradient(X, Y, 0, X, Y, 12);
    eg.addColorStop(0, mix('#ff8a70', '#ffffff', hot));
    eg.addColorStop(0.45, mix(RED, '#ff5030', hot));
    eg.addColorStop(1, RED_D);
    g.fillStyle = eg;
    g.beginPath();
    g.arc(X, Y, 11, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.beginPath();
    g.ellipse(X - 4, Y - 4, 3.5, 2, -0.5, 0, Math.PI * 2);
    g.fill();
  });
  ctx.drawImage(c, x - 32, y - 32, 64, 64);
  if (hot > 0.05) drawGlow(ctx, x, y, 30 + hot * 40, RED, 0.2 + hot * 0.7);
}

/** Locked balls behind the Impound's window. */
export function drawImpound(ctx: CanvasRenderingContext2D, locked: number, t: number) {
  const lh = lift(44);
  for (let i = 0; i < locked; i++) {
    const [x, y] = L.IMPOUND_SLOTS[i];
    drawBallAt(ctx, x, y - 2, 44);
  }
  // window glass with a glint crossing it
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(52, 82 - lh, 108, 40, 12);
  ctx.clip();
  ctx.fillStyle = 'rgba(200,220,230,0.08)';
  ctx.fillRect(52, 82 - lh, 108, 40);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  const sweep = 52 + ((t * 30) % 160) - 30;
  ctx.beginPath();
  ctx.moveTo(sweep, 122 - lh);
  ctx.lineTo(sweep + 30, 82 - lh);
  ctx.stroke();
  ctx.restore();
}

/** The turbine on the shooter lane wall, spinning faster when things get hot. */
export function drawTurbine(ctx: CanvasRenderingContext2D, angle: number) {
  const [x, y0] = L.TURBINE;
  const z = 30;
  const y = y0 - lift(z);
  can(ctx, x, y0, 20, 0, z, '#9da1a4', null);
  ctx.beginPath();
  ctx.ellipse(x, y, 20, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#3a3734';
  ctx.fill();
  inkLine(ctx, 1.2);
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.5);
  for (let i = 0; i < 6; i++) {
    const a = angle + (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17);
    ctx.lineTo(Math.cos(a + 0.4) * 15, Math.sin(a + 0.4) * 15);
    ctx.closePath();
    ctx.fillStyle = '#c9cccd';
    ctx.fill();
    inkLine(ctx, 1.4);
    ctx.stroke();
  }
  ctx.restore();
  bolt(ctx, x, y, 3.4);
}

/** Spinner flag across the Skyway lane. */
export function drawSpinner(ctx: CanvasRenderingContext2D, a: number) {
  const z = 30;
  const wy = 650 - lift(z);
  const x0 = L.SKY_LANE_X;
  const x1 = 535;
  ctx.fillStyle = STEEL_D;
  ctx.fillRect(x0, wy - 2, x1 - x0, 3);
  inkLine(ctx, 1);
  ctx.strokeRect(x0, wy - 2, x1 - x0, 3);
  const Lf = 16;
  const reach = Lf * Math.sin(a) + lift(Lf * Math.cos(a));
  const face = Math.cos(a);
  ctx.fillStyle = face > 0 ? mix('#8c9093', '#f2f2f0', face) : mix('#55595d', '#9a9ea1', -face);
  ctx.fillRect(x0 + 4, Math.min(wy, wy + reach), x1 - x0 - 8, Math.abs(reach) + 1);
  ctx.strokeRect(x0 + 4, Math.min(wy, wy + reach), x1 - x0 - 8, Math.abs(reach) + 1);
  ctx.fillStyle = RED;
  ctx.fillRect(x0 + 6, wy + reach / 2 - 1, x1 - x0 - 12, 2);
}
