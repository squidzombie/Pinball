// Dust & Lead's code-drawn art, layout round 2: a plain placeholder in the Oxide colours (rust brown
// and turquoise), clear enough to judge the layout on a phone. The art round replaces it; the owner
// paints the playfield itself (art/README.md).

import type { Circle, Flipper } from '../../engine/physics';
import { drawBumper, lift, post, shade, slingshot, strokePath, wall, type BumperStyle, type WallStyle } from './draw';
import type { LowerSection, P } from './geom';
import * as L from './dust-layout';

/** What the art reads from the table. */
export interface DustView {
  time: number;
  drops: { down: boolean; anim: number }[];
  bumpers: Circle[];
  bumperFlash: number[];
  outlaw: number;
  outlawWalk: number;
  doorsSwing: number;
  targetFlash: number[];
  cupFlash: number[];
  panLit: boolean;
  oreCarts: number;
  saloonFlipper: Flipper;
  plungerPull: number;
  lower: LowerSection;
}

// The Oxide scheme (art/palettes/README.md): floor, steel, ink, lights, stripes; plus wood and paper.
const C = {
  floor: '#bb8c63',
  floorDark: '#a5764f',
  dirt: '#c9a079',
  steel: '#8a5a3a',
  ink: '#251812',
  turq: '#3fffe5',
  turqDeep: '#1aa697',
  brass: '#c79f3b',
  wood: '#6b3f25',
  woodLight: '#8c5a37',
  paper: '#efe2c8',
  red: '#b8442b',
};

const RAIL_W: WallStyle = { h: 22, w: 8, side: '#3a2418', top: '#8a5a3a', hi: '#d9b48a' };
const WALL_W: WallStyle = { h: 28, w: 10, side: '#2b1a11', top: '#6b3f25', hi: '#b98a5c' };
const GUIDE_W: WallStyle = { h: 16, w: 5, side: '#3a2418', top: '#a8875e', hi: '#efe2c8' };
const BARREL: BumperStyle = {
  name: 'barrel',
  base: '#2b1a11',
  body: '#7a4a2a',
  cap: '#c79f3b',
  art: (g, r, lit) => {
    g.strokeStyle = lit ? '#fff3c4' : '#3a2418';
    g.lineWidth = r * 0.12;
    g.beginPath();
    g.arc(0, 0, r * 0.62, 0, Math.PI * 2);
    g.stroke();
    star(g, 0, 0, r * 0.32, lit ? '#3fffe5' : '#1aa697');
  },
};

function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, angle = 0) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.font = `900 ${size}px Rockwell, 'Roboto Slab', Georgia, serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(text, 0, 0);
  g.restore();
}

/** A raised block: floor-level outline, lifted top, visible front face. */
function block(g: CanvasRenderingContext2D, pts: P[], z: number, top: string, side: string) {
  const dz = lift(z);
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.35)';
  strokePath(g, pts.map(([x, y]) => [x + 4, y + 5] as P), true);
  g.fill();
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.lineTo(b[0], b[1] - dz);
    g.lineTo(a[0], a[1] - dz);
    g.closePath();
    g.fillStyle = shade(side, b[0] < a[0] ? -0.25 : 0);
    g.fill();
  }
  strokePath(g, pts, true, dz);
  g.fillStyle = top;
  g.fill();
  g.strokeStyle = C.ink;
  g.lineWidth = 1.5;
  g.stroke();
  g.restore();
}

function rect(x0: number, y0: number, x1: number, y1: number): P[] {
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

// ------------------------------------------------------------------ the floor and everything fixed

export function paintStatic(g: CanvasRenderingContext2D, floor: boolean) {
  if (floor) {
    // planks
    g.fillStyle = C.floor;
    g.fillRect(0, 0, 600, 1200);
    for (let x = 20; x < 580; x += 26) {
      g.fillStyle = (x / 26) % 2 < 1 ? 'rgba(80,40,15,0.06)' : 'rgba(255,230,190,0.05)';
      g.fillRect(x, 0, 26, 1200);
      g.fillStyle = 'rgba(60,30,10,0.25)';
      g.fillRect(x, 0, 1, 1200);
    }
    // Main Street: a dirt road up the middle with wheel ruts
    g.fillStyle = C.dirt;
    g.beginPath();
    g.moveTo(222, 800);
    g.lineTo(232, 214);
    g.lineTo(326, 214);
    g.lineTo(336, 800);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(90,50,20,0.35)';
    g.lineWidth = 2;
    for (const x of [258, 300]) {
      g.beginPath();
      g.moveTo(x - 4, 790);
      g.lineTo(x, 220);
      g.stroke();
    }
    label(g, 'MAIN STREET', 279, 760, 13, 'rgba(60,30,12,0.65)');
    // the railroad up the left orbit
    g.strokeStyle = 'rgba(60,30,12,0.55)';
    g.lineWidth = 5;
    for (let y = 130; y < 560; y += 16) {
      g.beginPath();
      g.moveTo(24, y);
      g.lineTo(58, y);
      g.stroke();
    }
    g.strokeStyle = '#5c5048';
    g.lineWidth = 2.5;
    for (const x of [31, 51]) {
      g.beginPath();
      g.moveTo(x, 130);
      g.lineTo(x, 560);
      g.stroke();
    }
    // the title, low in the middle
    label(g, 'DUST & LEAD', 277.5, 905, 26, 'rgba(37,24,18,0.75)');
    label(g, 'A FRONTIER TABLE', 277.5, 930, 10, 'rgba(37,24,18,0.6)');
    // Wanted posters
    for (const [x, y] of L.POSTERS) {
      g.save();
      g.translate(x, y);
      g.fillStyle = C.paper;
      g.fillRect(-15, -21, 30, 42);
      g.strokeStyle = C.ink;
      g.lineWidth = 1.5;
      g.strokeRect(-15, -21, 30, 42);
      label(g, 'WANTED', 0, -14, 6.5, C.ink);
      g.fillStyle = 'rgba(37,24,18,0.25)';
      g.fillRect(-9, -9, 18, 14);
      g.restore();
    }
  }

  // the shooter lane floor and plunger housing
  g.fillStyle = 'rgba(37,24,18,0.35)';
  g.fillRect(537, 140, 43, 1040);

  // Gold Pan: the bowl, its brass pins and cups
  g.save();
  g.beginPath();
  g.arc(L.PAN.x, L.PAN.y, L.PAN.r, 0, Math.PI * 2);
  g.fillStyle = '#4a3a2c';
  g.fill();
  const grad = g.createRadialGradient(L.PAN.x - 15, L.PAN.y - 20, 5, L.PAN.x, L.PAN.y, L.PAN.r);
  grad.addColorStop(0, '#9b8a73');
  grad.addColorStop(1, '#4f4337');
  g.beginPath();
  g.arc(L.PAN.x, L.PAN.y, L.PAN.r - 5, 0, Math.PI * 2);
  g.fillStyle = grad;
  g.fill();
  g.restore();
  label(g, 'GOLD PAN', L.PAN.x, L.PAN.y - 44, 9, C.paper);
  for (const [x, y] of L.PAN_PINS) post(g, x, y, L.PAN_PIN_R + 0.5, '#5a4a1a', C.brass);
  for (const [a, b] of L.PAN_DIVIDERS) wall(g, [a, b], GUIDE_W);

  // walls and rails
  wall(g, L.OUTER, WALL_W);
  wall(g, L.DIVIDER, RAIL_W);
  wall(g, L.SHOOTER_FLOOR, RAIL_W);
  wall(g, L.RR_INNER, RAIL_W);
  wall(g, L.SALOON_LEFT, RAIL_W);
  wall(g, L.SALOON_RIGHT, RAIL_W);
  wall(g, L.SALOON_GUIDE, GUIDE_W);
  wall(g, L.PAN_ROOF, GUIDE_W);
  const bowl: P[] = [];
  for (let i = 0; i <= 48; i++) bowl.push([L.PAN.x + Math.cos((i / 48) * Math.PI * 2) * L.PAN.r, L.PAN.y + Math.sin((i / 48) * Math.PI * 2) * L.PAN.r]);
  wall(g, bowl, { h: 14, w: 6, side: '#3a2418', top: C.brass, hi: '#fff0b8' });
  // ramps' floor-level feet
  for (const r of L.RAMPS) {
    wall(g, r.walls.left.slice(0, r.baseTo + 1), GUIDE_W);
    wall(g, r.walls.right.slice(0, r.baseTo + 1), GUIDE_W);
  }
  post(g, L.RR_MOUTH[1][0], L.RR_MOUTH[1][1], 5);

  // the saloon: a plank floor inside
  g.fillStyle = 'rgba(70,35,15,0.35)';
  g.fillRect(381, 66, 108, 200);
  label(g, 'SALOON', 434, 160, 13, C.paper);

  // Jailhouse: a stone cell with bars across the back
  block(g, L.JAIL_WALLS, 20, '#77706a', '#4c4640');
  g.save();
  strokePath(g, L.JAIL_WALLS, true, lift(20));
  g.fillStyle = '#3a322c';
  g.fill();
  // iron bars across the cell, front to back
  const [m0, a0, b0, m1] = L.JAIL_WALLS;
  g.strokeStyle = '#151210';
  g.lineWidth = 2.5;
  for (let i = 1; i < 7; i++) {
    const t = i / 7;
    const f = L.along(m0, m1, t);
    const k = L.along(a0, b0, t);
    g.beginPath();
    g.moveTo(f[0], f[1] - lift(20));
    g.lineTo(k[0], k[1] - lift(20));
    g.stroke();
  }
  g.restore();
  label(g, 'JAIL', 172, 760, 11, C.ink, -0.39);

  // the mine house and its shaft
  block(g, rect(L.MINE_HOUSE.x0, L.MINE_HOUSE.y0, L.MINE_HOUSE.x1, L.MINE_HOUSE.y1), 40, C.woodLight, C.wood);
  label(g, 'GOLD MINE', (L.MINE_HOUSE.x0 + L.MINE_HOUSE.x1) / 2, L.MINE_HOUSE.y0 + 18 - lift(40), 10, C.paper);
  g.fillStyle = '#140c08';
  g.fillRect(104, 186 - lift(40), 30, 18);

  // High Noon's building (the windows and the outlaw are drawn live)
  block(g, rect(L.NOON.x0, L.NOON.y0, L.NOON.x1, L.NOON.y1), 44, C.woodLight, C.wood);
  label(g, 'HIGH NOON', 277.5, 116 - lift(44), 12, C.paper);
  // the clock
  g.beginPath();
  g.arc(277.5, 148 - lift(44), 15, 0, Math.PI * 2);
  g.fillStyle = C.paper;
  g.fill();
  g.strokeStyle = C.ink;
  g.lineWidth = 2;
  g.stroke();
  g.beginPath();
  g.moveTo(277.5, 148 - lift(44));
  g.lineTo(277.5, 137 - lift(44));
  g.moveTo(277.5, 148 - lift(44));
  g.lineTo(277.5, 140 - lift(44));
  g.stroke();

  // Sheriff and Hardware
  block(g, L.TOWN, 36, C.woodLight, C.wood);
  label(g, 'SHERIFF', 347, 344 - lift(36), 7.5, C.paper, -Math.PI / 2);

  // lower playfield: slings and lane guides
  const lw = (side: number) => {
    const X = (dx: number) => L.CX + side * dx;
    wall(
      g,
      [
        [X(-202), 868],
        [X(-202), 965],
        [X(-111), 1040],
      ],
      RAIL_W,
    );
    post(g, X(-202), 868, 5);
  };
  lw(1);
  lw(-1);
  for (const gd of L.OUTLANE_GUARDS) {
    wall(g, gd, RAIL_W);
    post(g, gd[1][0], gd[1][1], 4);
  }
  for (const tri of L_SLINGS) slingshot(g, tri, 'rgba(199,159,59,0.55)', C.ink);
}

const L_SLINGS: P[][] = [1, -1].map((m) => [
  [L.CX - m * 165, 850],
  [L.CX - m * 165, 950],
  [L.CX - m * 111, 993],
]);

// ------------------------------------------------------------------ ramps (above floor balls)

function rampDeck(g: CanvasRenderingContext2D, r: L.RampDef, deck: string | null, rail: string, from = 0) {
  const lw = r.walls.left.map(([x, y], i) => [x, y - lift(r.z[i])] as P);
  const rw = r.walls.right.map(([x, y], i) => [x, y - lift(r.z[i])] as P);
  const a = Math.max(from, 1);
  if (deck) {
    g.beginPath();
    g.moveTo(lw[a][0], lw[a][1]);
    for (let i = a + 1; i < lw.length; i++) g.lineTo(lw[i][0], lw[i][1]);
    for (let i = rw.length - 1; i >= a; i--) g.lineTo(rw[i][0], rw[i][1]);
    g.closePath();
    g.fillStyle = deck;
    g.fill();
  }
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const w of [lw, rw]) {
    g.beginPath();
    g.moveTo(w[a][0], w[a][1]);
    for (let i = a + 1; i < w.length; i++) g.lineTo(w[i][0], w[i][1]);
    g.strokeStyle = 'rgba(0,0,0,0.45)';
    g.lineWidth = 6;
    g.stroke();
    g.strokeStyle = rail;
    g.lineWidth = 3.5;
    g.stroke();
  }
  // ties across the wireform
  g.strokeStyle = rail;
  g.lineWidth = 2;
  for (let i = a; i < lw.length; i += 6) {
    g.beginPath();
    g.moveTo(lw[i][0], lw[i][1]);
    g.lineTo(rw[i][0], rw[i][1]);
    g.stroke();
  }
}

export function paintRamps(g: CanvasRenderingContext2D) {
  g.save();
  // the mine's wire track, highest of all
  const wire = L.WIRE.map(([x, y], i) => [x, y - lift(L.WIRE_Z.from + ((L.WIRE_Z.to - L.WIRE_Z.from) * i) / (L.WIRE.length - 1))] as P);
  for (const off of [-9, 9]) {
    g.beginPath();
    wire.forEach(([x, y], i) => (i ? g.lineTo(x, y + off * 0.5) : g.moveTo(x, y + off * 0.5)));
    g.strokeStyle = 'rgba(0,0,0,0.4)';
    g.lineWidth = 4.5;
    g.stroke();
    g.strokeStyle = '#d8d2c4';
    g.lineWidth = 2.5;
    g.stroke();
  }
  // the elevator shaft: a timber tower at the mine's mouth
  const [lx, ly] = L.LIFT.to;
  g.strokeStyle = C.wood;
  g.lineWidth = 3;
  for (const dx of [-12, 12]) {
    g.beginPath();
    g.moveTo(lx + dx, L.LIFT.from[1]);
    g.lineTo(lx + dx, ly - lift(L.LIFT.z1));
    g.stroke();
  }
  for (let y = L.LIFT.from[1]; y > ly - lift(L.LIFT.z1); y -= 14) {
    g.beginPath();
    g.moveTo(lx - 12, y);
    g.lineTo(lx + 12, y - 10);
    g.stroke();
  }
  // Gold Mine ramp: a timber deck
  rampDeck(g, L.MINE, 'rgba(140,90,55,0.85)', '#c79f3b', L.MINE.baseTo);
  // Stagecoach: a turquoise wireform
  rampDeck(g, L.STAGE, 'rgba(63,255,229,0.10)', '#3fd6c0', L.STAGE.baseTo);
  label(g, 'STAGECOACH', 470, 520 - lift(50), 10, C.paper, -0.5);
  g.restore();
}

// ------------------------------------------------------------------ live things

export function paintDynamic(g: CanvasRenderingContext2D, v: DustView) {
  // drop targets
  L.RR_DROPS.forEach(([a, b], i) => {
    const d = v.drops[i];
    g.save();
    g.lineCap = 'round';
    if (d.down) {
      g.strokeStyle = 'rgba(37,24,18,0.6)';
      g.lineWidth = 4;
      strokePath(g, [a, b]);
      g.stroke();
    } else {
      const dz = lift(16);
      g.fillStyle = C.red;
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.lineTo(b[0], b[1] - dz);
      g.lineTo(a[0], a[1] - dz);
      g.closePath();
      g.fill();
      g.strokeStyle = C.paper;
      g.lineWidth = 2;
      strokePath(g, [a, b], false, dz);
      g.stroke();
    }
    g.restore();
  });
  // Gold Pan cups
  L.PAN_CUPS.forEach(([x, y], i) => {
    g.beginPath();
    g.arc(x, y + 4, 9, 0, Math.PI * 2);
    g.fillStyle = v.cupFlash[i] > 0 ? `rgba(255,214,90,${0.4 + v.cupFlash[i] * 0.6})` : 'rgba(30,20,12,0.6)';
    g.fill();
  });
  // the lit pan: a glow on the mine ramp's mouth
  if (v.panLit && Math.floor(v.time * 2.5) % 2 === 0) {
    g.beginPath();
    g.arc(L.MINE.path[0][0], L.MINE.path[0][1] + 18, 10, 0, Math.PI * 2);
    g.fillStyle = C.brass;
    g.fill();
  }
  // plunger spring
  const py = 1180 + v.plungerPull * 28;
  g.fillStyle = '#8a8178';
  g.fillRect(L.SHOOTER.x - 6, py, 12, 1200 - py + 20);
  g.fillStyle = C.paper;
  g.fillRect(L.SHOOTER.x - 9, py - 4, 18, 6);
}

/** High Noon's windows and outlaw (depth-sorted at the building's front), and the saloon doors on top. */
export function paintTop(g: CanvasRenderingContext2D, v: DustView, which: 'noon' | 'top') {
  if (which === 'noon') {
    const z = lift(26);
    const pos = v.outlaw + (v.outlawWalk > 0 ? (v.outlaw === 2 ? -1 : v.outlaw === 0 ? 1 : 0) * v.outlawWalk : 0);
    L.NOON_WINDOWS.forEach(([a, b], i) => {
      const lit = v.targetFlash[i] > 0;
      g.fillStyle = lit ? `rgba(255,236,170,${0.6 + v.targetFlash[i] * 0.4})` : '#2a1a10';
      g.fillRect(a[0] + 3, a[1] - z - 2, b[0] - a[0] - 6, z - 2);
      g.strokeStyle = C.paper;
      g.lineWidth = 2;
      g.strokeRect(a[0] + 3, a[1] - z - 2, b[0] - a[0] - 6, z - 2);
    });
    // the outlaw: hat, head, shoulders, standing in a window
    const wx = 237.5 + pos * 40;
    const wy = 214 - z;
    g.fillStyle = C.ink;
    g.beginPath();
    g.arc(wx, wy + 3, 4.5, 0, Math.PI * 2);
    g.fill();
    g.fillRect(wx - 9, wy - 3, 18, 2.5);
    g.fillRect(wx - 4.5, wy - 7, 9, 5);
    g.beginPath();
    g.moveTo(wx - 9, wy + 14);
    g.lineTo(wx - 6, wy + 8);
    g.lineTo(wx + 6, wy + 8);
    g.lineTo(wx + 9, wy + 14);
    g.fill();
    // the side window toward the saloon
    const [sa, sb] = L.NOON_SIDE;
    g.fillStyle = v.targetFlash[3] > 0 ? `rgba(63,255,229,${0.5 + v.targetFlash[3] * 0.5})` : '#1aa697';
    g.fillRect(sa[0] - 4, sb[1] - lift(30), 6, sa[1] - sb[1]);
    return;
  }
  // target flashes on the town building
  if (v.targetFlash[4] > 0) {
    g.fillStyle = `rgba(63,255,229,${v.targetFlash[4]})`;
    g.fillRect(L.HARDWARE[1][0] - 4, L.HARDWARE[1][1], 5, L.HARDWARE[0][1] - L.HARDWARE[1][1]);
  }
  if (v.targetFlash[5] > 0) {
    g.fillStyle = `rgba(63,255,229,${v.targetFlash[5]})`;
    g.fillRect(L.SHERIFF[0][0], L.SHERIFF[0][1] - 3, L.SHERIFF[1][0] - L.SHERIFF[0][0], 5);
  }
  // pops
  v.bumpers.forEach((c, i) => drawBumper(g, c.x, c.y, c.r, BARREL, v.bumperFlash[i], '#3fffe5'));
  // swinging saloon doors, one on each gate: hinged at the top, swinging when a ball comes through
  const swing = Math.sin(v.time * 16) * v.doorsSwing * 0.6;
  g.save();
  for (const [[x, y0], [, y1]] of [L.DOOR_L, [L.DOOR_R[1], L.DOOR_R[0]]] as [P, P][]) {
    const h = Math.min(46, y1 - y0);
    g.save();
    g.translate(x, y0 + 2);
    g.transform(1, 0, Math.sin(swing), 1, 0, 0);
    g.fillStyle = 'rgba(199,159,59,0.85)';
    g.fillRect(-3, 0, 6, h);
    g.strokeStyle = C.ink;
    g.lineWidth = 1;
    g.strokeRect(-3, 0, 6, h);
    for (let yy = 6; yy < h - 2; yy += 8) {
      g.beginPath();
      g.moveTo(-3, yy);
      g.lineTo(3, yy);
      g.stroke();
    }
    g.restore();
  }
  g.restore();
}
