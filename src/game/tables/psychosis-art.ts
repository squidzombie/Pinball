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

/** A vertical cylinder from z0 to z1 with a lit top, in ink. */
function can(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, z0: number, z1: number, side = STEEL, top: string | null = STEEL_L) {
  const y0 = y - lift(z0);
  const y1 = y - lift(z1);
  // The table is drawn in oblique projection: a horizontal circle stays a circle, just lifted.
  const ry = r;
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
  paintVault(ctx);
  drawInserts();
  paintRampShadows(ctx);
  ctx.restore();

  paintLanes(ctx, lower);
  paintImpoundAndMachines(ctx);
  paintLeftMass(ctx);
  paintBreach(ctx);
  paintReactor(ctx);
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
  // the round deck under the pops, under the CAM lanes
  const [nx, ny] = L.BUMPERS[2];
  ctx.save();
  strokePath(ctx, L.NEST_AREA, true);
  ctx.fillStyle = '#a7a49b';
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(40,36,30,0.22)';
  ctx.lineWidth = 0.8;
  for (let r = 40; r < 260; r += 18) {
    ctx.beginPath();
    ctx.arc(nx, ny - 60, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(nx + Math.cos(a) * 40, ny - 60 + Math.sin(a) * 40);
    ctx.lineTo(nx + Math.cos(a) * 260, ny - 60 + Math.sin(a) * 260);
    ctx.stroke();
  }
  ctx.restore();
  // the Back Alley orbit floor: brushed steel trough up the left and over the top
  const ch = [...L.ARCH_OUTER.slice(0, -1), ...L.ARCH_INNER.slice().reverse()];
  plate(ch, '#b9b5ac', 4, false);
  // diamond plates beside the slings
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
  // shooter lane: SKILL SHOT, the arrows up it
  label(ctx, 'SKILL', 557.5, 1004, 10, 0, INK);
  label(ctx, 'SHOT', 557.5, 1016, 10, 0, INK);
  for (const y of [900, 1062]) paintedArrow(ctx, 557.5, y, 46, -Math.PI / 2, y > 1000 ? withAlpha(INK, 0.6) : RED, 2.5);
  // BACK ALLEY lettering up the orbit, and arrows round it
  const P0 = L.ARCH_PATH;
  const at = (f: number) => P0[Math.round((P0.length - 1) * f)];
  const ang = (f: number) => {
    const a = at(f - 0.02);
    const b = at(f + 0.02);
    return Math.atan2(b[1] - a[1], b[0] - a[0]);
  };
  label(ctx, 'BACK ALLEY', at(0.3)[0], at(0.3)[1], 11, ang(0.3));
  for (const f of [0.42, 0.55]) paintedArrow(ctx, at(f)[0], at(f)[1], 24, ang(f), RED, 2.4);
  // the Breach: its name on the scoop
  const ba = L.BREACH_AXIS;
  const lp = L.add(L.BREACH, ba, 30);
  label(ctx, 'BREACH', lp[0], lp[1], 9, Math.atan2(ba[1], ba[0]) - Math.PI / 2);
  // RAGE and bonus labels
  label(ctx, 'BONUS', L.CX, 968, 7.5, 0, withAlpha(INK, 0.7), 800);
}

/**
 * The upper playfield: a dark tread-plate deck with a safe dial painted on it, and the raised
 * block the three tumbler targets sit on.
 */
function paintVault(ctx: CanvasRenderingContext2D) {
  const area = L.UPPER_AREA;
  const b = bounds(area);
  ctx.save();
  strokePath(ctx, area, true);
  ctx.fillStyle = '#8b8982';
  ctx.fill();
  ctx.clip();
  hatch(ctx, b.x0, b.y0, b.x1, b.y1, 7, 0.8, 0.16, 0.7);
  hatch(ctx, b.x0, b.y0, b.x1, b.y1, 7, -0.8, 0.16, 0.7);
  // the dial: rings, numbered ticks and a red index at the top
  const [cx, cy] = [182, 262];
  ctx.fillStyle = withAlpha('#2a2826', 0.22);
  ctx.beginPath();
  ctx.arc(cx, cy, 62, 0, Math.PI * 2);
  ctx.fill();
  for (const [r, w, a] of [
    [62, 2.2, 0.75],
    [50, 1, 0.55],
    [28, 1.6, 0.7],
    [12, 1, 0.55],
  ] as const) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    inkLine(ctx, w, a);
    ctx.stroke();
  }
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 - Math.PI / 2;
    const r0 = i % 5 ? 56 : 51;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * 61, cy + Math.sin(a) * 61);
    inkLine(ctx, i % 5 ? 0.8 : 1.4, 0.7);
    ctx.stroke();
    if (i % 10 === 0) label(ctx, String(i * 2.5), cx + Math.cos(a) * 42, cy + Math.sin(a) * 42, 7, 0, withAlpha(INK, 0.75), 800);
  }
  // spokes of the handle
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12);
    ctx.lineTo(cx + Math.cos(a) * 28, cy + Math.sin(a) * 28);
    inkLine(ctx, 2.4, 0.55);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 72);
  ctx.lineTo(cx + 5, cy - 72);
  ctx.lineTo(cx, cy - 63);
  ctx.closePath();
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.restore();
  strokePath(ctx, area, true);
  inkLine(ctx, 1.6);
  ctx.stroke();
  label(ctx, 'THE VAULT', cx + 2, 336, 9, 0, withAlpha(INK, 0.8), 900);
  // the tumbler block: its name along the front, the vault's hatch on top
  block(ctx, L.TUMBLER_BLOCK, 24, '#8f8d86', STEEL_D);
  const [a, c] = [L.TUMBLERS[0][0], L.TUMBLERS[2][1]];
  label(ctx, 'TUMBLERS 1 · 2 · 3', (a[0] + c[0]) / 2, (a[1] + c[1]) / 2 - 9 - lift(24), 6.5, Math.atan2(c[1] - a[1], c[0] - a[0]), INK, 900);
  const [hx, hy, hw, hh] = VAULT_HATCH;
  const y = hy - lift(24);
  ctx.beginPath();
  ctx.roundRect(hx - hw / 2, y - hh / 2, hw, hh, 3);
  ctx.fillStyle = steelGrad(ctx, hx - hw / 2, y - hh / 2, hx + hw / 2, y + hh / 2, '#b9b7b0');
  ctx.fill();
  inkLine(ctx, 1.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(hx - hw / 2 + 3, y - hh / 2 + 3, hw - 6, hh - 6, 2);
  inkLine(ctx, 0.7, 0.5);
  ctx.stroke();
  for (const dy of [-hh / 4, hh / 4]) {
    ctx.beginPath();
    ctx.roundRect(hx - hw / 2 - 2, y + dy - 3, 4, 6, 1);
    ctx.fillStyle = STEEL_D;
    ctx.fill();
    inkLine(ctx, 0.8);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(hx + 3, y, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#3a3835';
  ctx.fill();
  inkLine(ctx, 1);
  ctx.stroke();
  for (let k = 0; k < 8; k++) {
    const an = (k / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(hx + 3 + Math.cos(an) * 4, y + Math.sin(an) * 4);
    ctx.lineTo(hx + 3 + Math.cos(an) * 6, y + Math.sin(an) * 6);
    ctx.strokeStyle = '#d6d3cb';
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
}

/** The vault's hatch on top of the tumbler block: centre x, y (on the floor) and its size. */
const VAULT_HATCH = [180, 122, 30, 24] as const;

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
  rail(ctx, L.ARCH_OUTER, 30, 9);
  // the orbit's inner wall, with a gap for the back door (drawn live, since it opens)
  for (const part of L.ARCH_INNER_L_PARTS) rail(ctx, part, 26, 8);
  for (const p of [L.BACK_DOOR[0], L.BACK_DOOR[L.BACK_DOOR.length - 1]]) can(ctx, p[0], p[1], 5, 0, 28, STEEL_D, STEEL);
  rail(ctx, L.ARCH_INNER_R, 26, 8);
  rail(ctx, L.ORBIT_FLARE, 26, 8);
  can(ctx, L.ORBIT_POST[0], L.ORBIT_POST[1], 6, 0, 18, '#36322e', '#5a554f');
  rail(ctx, L.LEFT_LOW, 30, 9);
  rail(ctx, L.RIGHT_WALL, 30, 9);
  rail(ctx, L.PLUNGER_WALL, 24, 7);
  // one-way gates: light steel flaps
  for (const gate of [L.GATE, L.LEFT_GATE, L.DIVERTER, L.EXIT_GATE]) rail(ctx, gate, 10, 4, '#e8e4dc');
  // CAM lane guides with rubber-capped posts
  for (const [a, b] of L.LANE_GUIDES) {
    rail(ctx, [a, b], 16, 5);
    can(ctx, a[0], a[1], L.LANE_POST_R, 0, 18, '#36322e', '#5a554f');
  }
  // the pop nest's walls and its exit lane
  for (const wall of [L.NEST_LEFT, L.NEST_FLOOR, L.NEST_RIGHT, L.EXIT_LANE_L, L.EXIT_LANE_R]) rail(ctx, wall, 22, 7);
  for (const wall of [L.BANK_R_WALL, L.MARKET_LIP]) rail(ctx, wall, 20, 6);
  // the upper playfield's walls and gates
  for (const wall of [L.UPPER_LANE_WALL, L.UPPER_GUIDE_L, L.UPPER_GUIDE_R, L.UPPER_DRAIN_FLOOR, L.UPPER_DRAIN_ROOF, L.ARCH_INNER_NEST]) rail(ctx, wall, 20, 6);
  for (const gate of [L.UPPER_GATE, L.UPPER_EXIT_FLAP]) rail(ctx, gate, 10, 4, '#e8e4dc');
  // rubber guards at the side lanes
  for (const g of [L.GUARD_L, L.GUARD_R]) {
    rail(ctx, g, 14, 8, '#3a3633');
    can(ctx, g[1][0], g[1][1], 5, 0, 18, '#36322e', '#5a554f');
    bolt(ctx, g[1][0], g[1][1] - lift(18), 2.6);
  }
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

/** The Impound: a raised steel cage over the orbit lane, beside the Skyway's turn down the left. */
function paintImpoundAndMachines(ctx: CanvasRenderingContext2D) {
  const H = 40;
  const lh = lift(H);
  const box = L.IMPOUND_BOX;
  // four legs down to the floor either side of the orbit lane
  for (const [x, y] of box) can(ctx, x, y, 3.5, 0, H, STEEL_D, STEEL);
  // the cage floor the balls sit on, seen through the bars, and its frame
  strokePath(ctx, box, true, lh);
  ctx.fillStyle = '#2b2825';
  ctx.fill();
  inkLine(ctx, 2.2);
  ctx.stroke();
  strokePath(ctx, box, true, lh);
  ctx.strokeStyle = '#a7aaac';
  ctx.lineWidth = 1.2;
  ctx.stroke();
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

/** Ground nothing rolls on (under the ramps' climb): a low steel deck, hatched. */
function paintLeftMass(ctx: CanvasRenderingContext2D) {
  for (const area of [L.SEALED, L.BEHIND_SKYWAY]) {
    block(ctx, area, 14, '#8a8983', STEEL_DD, false);
    const lz = lift(14);
    const b = bounds(area);
    ctx.save();
    strokePath(ctx, area, true, lz);
    ctx.clip();
    hatch(ctx, b.x0, b.y0 - lz, b.x1, b.y1 - lz, 4, -0.7, 0.18, 0.6);
    ctx.restore();
  }
}

/** The Breach: the scoop, its throat, and steel backing behind the two standup banks. */
function paintBreach(ctx: CanvasRenderingContext2D) {
  const [bx, by] = L.BREACH;
  // backing plates behind B-R-E and A-C-H
  for (const [a, b] of [L.BANK_L, L.BANK_R]) {
    const d = L.unit(L.sub(b, a));
    const back: P = [d[1], -d[0]];
    const toward = L.sub(a === L.BANK_L[0] ? L.RF : L.LF, a);
    const n: P = back[0] * toward[0] + back[1] * toward[1] > 0 ? [-back[0], -back[1]] : back;
    block(ctx, [a, b, L.add(b, n, 12), L.add(a, n, 12)], 28, '#9c9a93', STEEL_D, false);
  }
  rail(ctx, L.BREACH_THROAT.left, 26, 6);
  rail(ctx, L.BREACH_THROAT.right, 26, 6);
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

/** The Reactor: a round drum round the core, with the funnel and channel cut into its front. Its red eye is a sprite so it can glow. */
function paintReactor(ctx: CanvasRenderingContext2D) {
  const R = L.REACTOR;
  const [ex, ey] = R.eye;
  const z = 34;
  const lz = lift(z);
  const rr = 46;
  // the drum, with a hazard band round its top
  can(ctx, ex, ey, rr, 0, z, '#9d9c96', null);
  ctx.beginPath();
  ctx.arc(ex, ey - lz, rr, 0, Math.PI * 2);
  ctx.fillStyle = steelGrad(ctx, ex - rr, ey - lz - rr, ex + rr, ey - lz + rr, '#b9b8b1');
  ctx.fill();
  inkLine(ctx, 1.5);
  ctx.stroke();
  ctx.save();
  ctx.lineWidth = 7;
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = HAZ;
  ctx.beginPath();
  ctx.arc(ex, ey - lz, rr - 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineDashOffset = 6;
  ctx.strokeStyle = '#25211d';
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(ex, ey - lz, rr - 10, 0, Math.PI * 2);
  inkLine(ctx, 1, 0.7);
  ctx.stroke();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    rivet(ctx, ex + Math.cos(a) * (rr - 13), ey - lz + Math.sin(a) * (rr - 13), 1.5);
  }
  // the funnel behind the drops and the channel up to the core, dark, on the floor
  ctx.fillStyle = '#2a2724';
  strokePath(ctx, [R.mouthL, R.channelL0, R.channelL1, R.channelR1, R.channelR0, R.mouthR], true);
  ctx.fill();
  inkLine(ctx, 1.2);
  ctx.stroke();
  rail(ctx, [R.mouthL, R.channelL0, R.channelL1], 20, 5);
  rail(ctx, [R.mouthR, R.channelR0, R.channelR1], 20, 5);
  label(ctx, 'REACTOR', ex, ey - lz - rr - 6, 12, 0, INK);
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

/** Brackets on the top rail for the three cameras; their heads are drawn live so they can pan. */
function paintCameraBody(ctx: CanvasRenderingContext2D) {
  for (const [x, y] of L.CAMERAS) {
    can(ctx, x, y, 3, 0, CAM_Z - 6, STEEL_D, STEEL);
    bolt(ctx, x, y, 2.4);
  }
}

// ------------------------------------------------------------------ ramps (drawn over floor balls)

export function paintRamps(ctx: CanvasRenderingContext2D) {
  paintSkyway(ctx);
  paintAlleyChute(ctx);
  paintMarket(ctx);
}

/** The Back Alley's exit: a short steel chute from the right leg down into the market box. */
function paintAlleyChute(ctx: CanvasRenderingContext2D) {
  const r = L.ALLEY_EXIT;
  const head = 5;
  const left = L.CHUTE.left[0][0];
  const right = L.CHUTE.right[0][0];
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < head; i++) ctx.lineTo(left, r.path[i][1] - zAt(r, i));
  for (let i = head - 1; i >= 0; i--) ctx.lineTo(right, r.path[i][1] - zAt(r, i));
  ctx.closePath();
  ctx.fillStyle = '#a9a69e';
  ctx.fill();
  inkLine(ctx, 1.4);
  ctx.stroke();
  ctx.restore();
  for (const x of [left, right]) {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < head; i++) ctx.lineTo(x, r.path[i][1] - zAt(r, i) - lift(10));
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4.4;
    ctx.stroke();
    ctx.strokeStyle = STEEL_L;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();
  }
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
  const [mx, my] = centroid(L.MARKET_BOX);
  label(ctx, 'BLACK', mx, my - 8 - lz, 13, 0, INK);
  label(ctx, 'MARKET', mx, my + 6 - lz, 13, 0, INK);
  wireform(ctx, r, end - 1);
}

// ------------------------------------------------------------------ dynamic and sprites

const CAM_Z = 30;

/** A rail without its cast shadow, cheap enough to draw every frame, with hazard dashes on top. */
function liveRail(ctx: CanvasRenderingContext2D, pts: P[], h: number, w: number) {
  const lh = lift(h);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  strokePath(ctx, pts);
  ctx.lineWidth = w + 2.6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  const steps = Math.max(2, Math.ceil(lh / 2));
  for (let i = 1; i < steps; i++) {
    strokePath(ctx, pts, false, (lh * i) / steps);
    ctx.lineWidth = w;
    ctx.strokeStyle = mix(STEEL_DD, STEEL_D, i / steps);
    ctx.stroke();
  }
  strokePath(ctx, pts, false, lh);
  ctx.lineWidth = w + 2.6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = w;
  ctx.strokeStyle = HAZ;
  ctx.stroke();
  ctx.setLineDash([4, 4]);
  ctx.lineCap = 'butt';
  ctx.lineWidth = w * 0.7;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}

/**
 * The three security cameras pan their red beams down the table; a knocked-out camera hangs
 * dark. In Infiltrate the middle one tracks the watched shot. Also the back door's deflector
 * when it's open, and the plunger.
 */
export function paintDynamic(ctx: CanvasRenderingContext2D, t: number, cams: boolean[], target: P | null, pull: number, doorOpen: boolean, hatch: number) {
  L.CAMERAS.forEach(([cx, cy], i) => {
    const down = !cams[i];
    const ox = cx;
    const oy = cy - lift(CAM_Z);
    const aim = target && i === 1 ? target : ([cx + Math.sin(t * 0.55 + i * 2.1) * 170, 470 + Math.cos(t * 0.4 + i) * 90] as P);
    const a = down ? Math.PI / 2 + 0.9 : Math.atan2(aim[1] - oy, aim[0] - ox);
    if (!down) {
      const len = Math.hypot(aim[0] - ox, aim[1] - oy) + 30;
      const spread = target && i === 1 ? 0.06 : 0.09;
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, len);
      g.addColorStop(0, withAlpha(RED, target && i === 1 ? 0.32 : 0.15));
      g.addColorStop(1, withAlpha(RED, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(a - spread) * len, oy + Math.sin(a - spread) * len);
      ctx.lineTo(ox + Math.cos(a + spread) * len, oy + Math.sin(a + spread) * len);
      ctx.closePath();
      ctx.fill();
      if (target && i === 1) drawGlow(ctx, target[0], target[1], 40, RED, 0.35 + 0.25 * Math.sin(t * 9));
    }
    // the head: a small box with its lens toward the beam
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.roundRect(-6, -6, 20, 12, 2.5);
    ctx.fillStyle = steelGrad(ctx, -6, -6, 14, 6, down ? '#8d9092' : '#c9cbcc');
    ctx.fill();
    inkLine(ctx, 1.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(15, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#1b1a19';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    lens(ctx, ox - 2, oy - 3, 2.4, down ? 0 : 0.6 + 0.4 * Math.sin(t * 5 + i));
  });
  // the back door: shut in the orbit's inner wall, or swung across the orbit as a deflector
  liveRail(ctx, doorOpen ? L.BACK_DOOR_DEFLECTOR : L.BACK_DOOR, 26, 7);
  // the vault's hatch, swung open with gold light inside while it lets balls out
  if (hatch > 0) {
    const [hx, hy, hw, hh] = VAULT_HATCH;
    const y = hy - lift(24);
    const x0 = hx - hw / 2;
    ctx.beginPath();
    ctx.roundRect(x0, y - hh / 2, hw, hh, 3);
    const g = ctx.createRadialGradient(hx, y, 1, hx, y, hw * 0.7);
    g.addColorStop(0, '#fff3b0');
    g.addColorStop(0.35, '#e0a830');
    g.addColorStop(1, '#2a1c08');
    ctx.fillStyle = g;
    ctx.fill();
    inkLine(ctx, 1.6);
    ctx.stroke();
    // the door, turning on its hinges at the left edge
    const dw = hw * (1 - 0.85 * hatch);
    ctx.beginPath();
    ctx.moveTo(x0, y - hh / 2);
    ctx.lineTo(x0 - dw * 0.35, y - hh / 2 - 6 * hatch);
    ctx.lineTo(x0 - dw * 0.35, y + hh / 2 - 6 * hatch);
    ctx.lineTo(x0, y + hh / 2);
    ctx.closePath();
    ctx.fillStyle = '#a9a7a0';
    ctx.fill();
    inkLine(ctx, 1.2);
    ctx.stroke();
    drawGlow(ctx, hx, y, 34, '#ffc94a', 0.55 * hatch + 0.15 * Math.sin(t * 14));
  }
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

const TANK_H = 26;

/** Industrial pop bumper: a riveted tank with a domed cap and a red lens. */
export function drawTank(ctx: CanvasRenderingContext2D, x: number, y: number, r0: number, hit: number) {
  const lit = hit > 0;
  const skirt = L.BUMPER_SKIRT_R;
  const pad = skirt + 10;
  const w = pad * 2;
  const h = pad * 2 + lift(TANK_H);
  const c = sprite(`tank:${r0}:${lit}`, w, h, (g) => {
    const X = pad;
    const Y = h - pad;
    // contact shadow and the steel skirt on the floor, so it sits on the deck
    softShadow(g, 4, 2, 6, 'rgba(40,30,20,0.45)', () => {
      g.beginPath();
      g.arc(X + 2, Y + 2, skirt, 0, Math.PI * 2);
      g.fill();
    });
    can(g, X, Y, skirt, 0, 3, STEEL_DD, '#5d6064');
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rivet(g, X + Math.cos(a) * (skirt - 3.5), Y - lift(3) + Math.sin(a) * (skirt - 3.5), 1.2);
    }
    // the ring the ball hits, then the drum, then its cap
    can(g, X, Y, r0, 3, 10, '#2f2c29', '#4a4743');
    can(g, X, Y, r0 - 6, 10, TANK_H, '#b3b6b8', null);
    const cy = Y - lift(TANK_H);
    const dg = g.createRadialGradient(X - r0 * 0.3, cy - r0 * 0.3, 0, X, cy, r0 - 6);
    dg.addColorStop(0, '#f4f5f5');
    dg.addColorStop(0.55, '#bfc2c4');
    dg.addColorStop(1, '#7c8084');
    g.fillStyle = dg;
    g.beginPath();
    g.arc(X, cy, r0 - 6, 0, Math.PI * 2);
    g.fill();
    inkLine(g, 1.3);
    g.stroke();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      rivet(g, X + Math.cos(a) * (r0 - 11), cy + Math.sin(a) * (r0 - 11), 1.3);
    }
    g.beginPath();
    g.arc(X, cy, r0 * 0.42, 0, Math.PI * 2);
    g.fillStyle = '#3a3734';
    g.fill();
    inkLine(g, 1, 0.8);
    g.stroke();
    lens(g, X, cy, r0 * 0.3, lit ? 1 : 0.25);
  });
  const cw = c.width / art.k;
  const ch = c.height / art.k;
  const thump = hit * 1.5;
  ctx.drawImage(c, x - pad, y - (ch - pad) + thump, cw, ch);
  if (lit) drawGlow(ctx, x, y - lift(TANK_H), r0 * (0.7 + hit * 0.8), RED, 0.25 + hit * 0.5);
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

/** Locked balls in the Impound cage, behind its bars. */
export function drawImpound(ctx: CanvasRenderingContext2D, locked: number, t: number) {
  const H = 40;
  const lh = lift(H);
  for (let i = 0; i < locked; i++) {
    const [x, y] = L.IMPOUND_SLOTS[i];
    drawBallAt(ctx, x, y, H);
  }
  // bars over the cage, with a glint sliding down them
  const box = L.IMPOUND_BOX;
  const [x0, y0] = box[0];
  const [x1, y1] = box[2];
  ctx.save();
  ctx.lineCap = 'round';
  for (let x = x0 + 6; x < x1 - 8; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x, y0 - lh + 2);
    ctx.lineTo(x, y1 - lh - 2);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.strokeStyle = '#c9cccd';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  const gy = y0 - lh + ((t * 40) % (y1 - y0 + 40)) - 20;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0 + 2, gy + 10);
  ctx.lineTo(x1 - 2, gy - 10);
  ctx.stroke();
  ctx.restore();
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
