// Dust & Lead's code-drawn art: a bold cartoon western (the owner's choice, 6 November 2026), saturated
// sunset colours under heavy ink lines. The printed playfield is drawn here unless a painted one is
// loaded (art/README.md); everything on top (rails, ramps, toys, plastics, lights) is always drawn here.
// Nothing in this file touches the physics.

import type { Circle, Flipper } from '../../engine/physics';
import { drawGlow } from '../../engine/fx';
import { art, drawBumper, lift, mix, post, shade, slingshot, sprite, strokePath, wall, type BumperStyle, type WallStyle } from './draw';
import type { LowerSection, P } from './geom';
import type { Sprite } from './table';
import * as L from './dust-layout';

/** What the art reads from the table. */
export interface DustView {
  time: number;
  /** General illumination, 0..1. */
  light: number;
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
  /** The minecart: where it is on the lift (resting at the bottom when no ball is riding). */
  cart(): { x: number; y: number; z: number; busy: boolean };
  /** 0..1, the stagecoach rocking after a ramp. */
  coachRock: number;
}

// ------------------------------------------------------------------ palette

export const C = {
  ink: '#1d1009',
  skyTop: '#3d1e5c',
  skyMid: '#b8303d',
  skyLow: '#f7931e',
  sun: '#ffd23f',
  sunLow: '#ff7a1a',
  sand: '#f6c35b',
  sandDark: '#e39a3a',
  rayA: '#ffd25a',
  rayB: '#f7ab35',
  road: '#c9773a',
  roadDark: '#a1572a',
  wood: '#7a3e1d',
  woodLight: '#a95f2e',
  woodPale: '#d39a5c',
  cream: '#fff1cf',
  turq: '#2ad6c4',
  turqDeep: '#118075',
  turqLit: '#3fffe5',
  red: '#d6342a',
  redDark: '#8e1f18',
  green: '#3f9b3a',
  greenDark: '#22621f',
  mesa: '#c4462b',
  mesaDark: '#7d2a20',
  purple: '#6b2f7d',
  steel: '#59636d',
  chrome: '#dfe4e9',
  brick: '#b5482e',
  gold: '#ffc21a',
};

const INK_W = 2.2;

const RAIL_W: WallStyle = { h: 22, w: 8, side: '#3b4148', top: '#c3cbd2', hi: '#ffffff' };
const WALL_W: WallStyle = { h: 28, w: 10, side: '#2b1a11', top: '#7a3e1d', hi: '#d39a5c' };
const GUIDE_W: WallStyle = { h: 16, w: 5, side: '#3b4148', top: '#c3cbd2', hi: '#ffffff' };

const BARREL: BumperStyle = {
  name: 'barrel',
  base: '#2b1a11',
  body: '#8a4a22',
  cap: '#d6342a',
  art: (g, r, lit) => {
    g.strokeStyle = lit ? '#fff3c4' : '#5e140f';
    g.lineWidth = r * 0.1;
    g.beginPath();
    g.arc(0, 0, r * 0.66, 0, Math.PI * 2);
    g.stroke();
    star(g, 0, 0, r * 0.42, lit ? '#fff7c2' : C.gold, C.ink);
  },
};

// ------------------------------------------------------------------ small helpers

function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, ink?: string, points = 5) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const rr = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  if (ink) {
    g.strokeStyle = ink;
    g.lineWidth = Math.max(1, r * 0.12);
    g.lineJoin = 'round';
    g.stroke();
  }
}

/** Wood-type lettering: a solid drop shadow, an ink outline and the face. */
function title(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, face: string, shadow = C.redDark, angle = 0, maxW?: number) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.font = `900 ${size}px Rockwell, 'Rockwell Extra Bold', 'Roboto Slab', Georgia, serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  const d = Math.max(1.2, size * 0.08);
  g.fillStyle = shadow;
  g.fillText(text, d, d, maxW);
  g.strokeStyle = C.ink;
  g.lineWidth = Math.max(2, size * 0.16);
  g.strokeText(text, 0, 0, maxW);
  g.fillStyle = face;
  g.fillText(text, 0, 0, maxW);
  g.restore();
}

/** Plain small print. */
function print(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, angle = 0, weight = 800) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.font = `${weight} ${size}px "Arial Narrow", "Roboto Condensed", system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(text, 0, 0);
  g.restore();
}

function inked(g: CanvasRenderingContext2D, fill: string, w = INK_W) {
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = C.ink;
  g.lineWidth = w;
  g.lineJoin = 'round';
  g.stroke();
}

function path(g: CanvasRenderingContext2D, pts: P[], closed = true) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  if (closed) g.closePath();
}

/** Seeded random numbers, so the printed art comes out the same every time. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A raised block: drop shadow, side faces, and the lifted top. */
function block(g: CanvasRenderingContext2D, pts: P[], z: number, top: string, side: string) {
  const dz = lift(z);
  g.save();
  g.fillStyle = 'rgba(29,16,9,0.35)';
  path(
    g,
    pts.map(([x, y]) => [x + 5, y + 6] as P),
  );
  g.fill();
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    path(g, [a, b, [b[0], b[1] - dz], [a[0], a[1] - dz]]);
    inked(g, shade(side, b[0] < a[0] ? -0.2 : 0), 1.4);
  }
  path(
    g,
    pts.map(([x, y]) => [x, y - dz] as P),
  );
  inked(g, top, 1.8);
  g.restore();
}

/** Draw `paint` once into a cached canvas covering the table rectangle, then reuse it every frame. */
function cached(g: CanvasRenderingContext2D, key: string, x0: number, y0: number, w: number, h: number, paint: (c: CanvasRenderingContext2D) => void) {
  const c = sprite(`dust:${key}`, w, h, (s) => {
    s.translate(-x0, -y0);
    paint(s);
  });
  g.drawImage(c, x0, y0, w, h);
}

function cactus(g: CanvasRenderingContext2D, x: number, y: number, s: number, flip = 1) {
  g.save();
  g.translate(x, y);
  g.scale(s * flip, s);
  g.lineJoin = 'round';
  g.beginPath();
  g.roundRect(-5, -34, 10, 34, 5);
  g.moveTo(5, -16);
  g.roundRect(4, -16, 12, 7, 3.5);
  g.roundRect(10, -30, 7, 20, 3.5);
  g.roundRect(-16, -22, 12, 7, 3.5);
  g.roundRect(-17, -34, 7, 18, 3.5);
  inked(g, C.green, 1.6 / s);
  g.strokeStyle = C.greenDark;
  g.lineWidth = 1.2 / s;
  g.beginPath();
  g.moveTo(0, -30);
  g.lineTo(0, -3);
  g.stroke();
  g.restore();
}

function skull(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  // horns
  g.beginPath();
  g.moveTo(-8, -6);
  g.quadraticCurveTo(-30, -6, -36, -20);
  g.quadraticCurveTo(-26, -10, -8, -1);
  g.moveTo(8, -6);
  g.quadraticCurveTo(30, -6, 36, -20);
  g.quadraticCurveTo(26, -10, 8, -1);
  inked(g, C.cream, 1.6);
  // skull
  g.beginPath();
  g.moveTo(-11, -10);
  g.quadraticCurveTo(0, -16, 11, -10);
  g.quadraticCurveTo(13, 4, 6, 18);
  g.quadraticCurveTo(0, 22, -6, 18);
  g.quadraticCurveTo(-13, 4, -11, -10);
  inked(g, C.cream, 1.6);
  g.fillStyle = C.ink;
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.ellipse(sx * 5, -2, 3.2, 4.2, sx * 0.3, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  g.ellipse(-2, 13, 1.2, 2, 0, 0, Math.PI * 2);
  g.ellipse(2, 13, 1.2, 2, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function revolver(g: CanvasRenderingContext2D, x: number, y: number, s: number, angle: number) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.scale(s, s);
  // barrel
  g.beginPath();
  g.roundRect(-4, -5, 52, 8, 2);
  inked(g, '#c7ccd2', 1.6);
  // cylinder
  g.beginPath();
  g.roundRect(-14, -9, 18, 16, 4);
  inked(g, '#9aa2aa', 1.6);
  // grip
  g.beginPath();
  g.moveTo(-14, -2);
  g.lineTo(-34, 4);
  g.quadraticCurveTo(-40, 18, -30, 24);
  g.lineTo(-18, 10);
  g.lineTo(-10, 6);
  g.closePath();
  inked(g, C.woodLight, 1.6);
  // trigger guard
  g.beginPath();
  g.arc(-6, 10, 5, 0, Math.PI);
  g.strokeStyle = C.ink;
  g.lineWidth = 1.6;
  g.stroke();
  g.restore();
}

function locomotive(g: CanvasRenderingContext2D, x: number, y: number) {
  // drawn side-on, nose up the lane (rotated), as printed on the railroad bed
  g.save();
  g.translate(x, y);
  g.rotate(-Math.PI / 2);
  g.lineJoin = 'round';
  // boiler
  g.beginPath();
  g.roundRect(-34, -16, 48, 16, 4);
  inked(g, '#2b2b33', 1.4);
  g.beginPath();
  g.rect(-8, -16, 4, 16);
  g.rect(4, -16, 4, 16);
  g.fillStyle = C.gold;
  g.fill();
  // cab
  g.beginPath();
  g.rect(-50, -24, 18, 24);
  inked(g, C.red, 1.4);
  g.beginPath();
  g.rect(-46, -20, 10, 8);
  g.fillStyle = C.cream;
  g.fill();
  // stack
  g.beginPath();
  g.moveTo(4, -16);
  g.lineTo(0, -28);
  g.lineTo(14, -28);
  g.lineTo(10, -16);
  inked(g, '#2b2b33', 1.4);
  // cowcatcher
  g.beginPath();
  g.moveTo(14, -6);
  g.lineTo(26, 2);
  g.lineTo(14, 2);
  inked(g, C.red, 1.4);
  // wheels
  for (const wx of [-40, -22, 0]) {
    g.beginPath();
    g.arc(wx, 3, wx === -40 ? 7 : 6, 0, Math.PI * 2);
    inked(g, C.red, 1.4);
  }
  g.restore();
}

// ------------------------------------------------------------------ the printed playfield

/** The table's floor outline (the cabinet's inside), for clipping the printed art. */
function floorClip(g: CanvasRenderingContext2D) {
  g.beginPath();
  g.moveTo(20, 1200);
  g.lineTo(20, 80);
  g.arc(82, 80, 62, Math.PI, Math.PI * 1.5);
  g.lineTo(518, 18);
  g.arc(518, 80, 62, -Math.PI / 2, 0);
  g.lineTo(580, 1200);
  g.closePath();
}

const SUN = { x: 277.5, y: 196, r: 128 };
const RAYS = { x: 277.5, y: 912 };
/** The skyline: mesas and buttes across the back of the desert. */
const SKYLINE: P[] = [
  [20, 330],
  [20, 262],
  [48, 256],
  [60, 236],
  [104, 236],
  [116, 258],
  [168, 264],
  [180, 300],
  [222, 304],
  [232, 270],
  [252, 266],
  [260, 286],
  [300, 288],
  [308, 262],
  [334, 258],
  [342, 280],
  [372, 282],
  [388, 238],
  [432, 232],
  [446, 252],
  [500, 256],
  [510, 226],
  [556, 222],
  [580, 240],
  [580, 330],
];

function paintPrinted(g: CanvasRenderingContext2D) {
  g.save();
  floorClip(g);
  g.clip();

  // desert sand under sun rays fanning out from the logo
  g.fillStyle = C.sand;
  g.fillRect(0, 0, 600, 1200);
  const N = 28;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2;
    const a1 = ((i + 0.5) / N) * Math.PI * 2;
    g.beginPath();
    g.moveTo(RAYS.x, RAYS.y);
    g.lineTo(RAYS.x + Math.cos(a0) * 1400, RAYS.y + Math.sin(a0) * 1400);
    g.lineTo(RAYS.x + Math.cos(a1) * 1400, RAYS.y + Math.sin(a1) * 1400);
    g.closePath();
    g.fillStyle = C.rayB;
    g.fill();
  }
  // the rays fade toward the edges into deeper desert
  const vig = g.createRadialGradient(RAYS.x, RAYS.y, 120, RAYS.x, RAYS.y, 760);
  vig.addColorStop(0, 'rgba(255,230,140,0.35)');
  vig.addColorStop(0.6, 'rgba(227,154,58,0)');
  vig.addColorStop(1, 'rgba(160,70,20,0.35)');
  g.fillStyle = vig;
  g.fillRect(0, 0, 600, 1200);

  // the sunset sky across the back, with a striped sun going down behind High Noon
  const sky = g.createLinearGradient(0, 18, 0, 320);
  sky.addColorStop(0, C.skyTop);
  sky.addColorStop(0.45, C.skyMid);
  sky.addColorStop(1, C.skyLow);
  g.fillStyle = sky;
  g.fillRect(0, 0, 600, 330);
  const sunG = g.createLinearGradient(0, SUN.y - SUN.r, 0, SUN.y + SUN.r);
  sunG.addColorStop(0, C.sun);
  sunG.addColorStop(1, C.sunLow);
  g.save();
  g.beginPath();
  g.arc(SUN.x, SUN.y, SUN.r, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = sunG;
  g.fillRect(SUN.x - SUN.r, SUN.y - SUN.r, SUN.r * 2, SUN.r * 2);
  // retro stripes across its lower half
  for (let k = 0; k < 6; k++) {
    const y = SUN.y + 10 + k * 18;
    g.fillStyle = C.skyMid;
    g.fillRect(SUN.x - SUN.r, y, SUN.r * 2, 3 + k * 1.6);
  }
  g.restore();
  // a few birds
  g.strokeStyle = C.ink;
  g.lineWidth = 1.6;
  for (const [bx, by, s] of [
    [150, 160, 1],
    [168, 150, 0.8],
    [420, 190, 0.9],
  ] as const) {
    g.beginPath();
    g.moveTo(bx - 7 * s, by);
    g.quadraticCurveTo(bx - 3 * s, by - 5 * s, bx, by);
    g.quadraticCurveTo(bx + 3 * s, by - 5 * s, bx + 7 * s, by);
    g.stroke();
  }
  // mesas
  path(g, SKYLINE);
  const mesa = g.createLinearGradient(0, 220, 0, 330);
  mesa.addColorStop(0, C.mesa);
  mesa.addColorStop(1, C.mesaDark);
  g.fillStyle = mesa;
  g.fill();
  g.strokeStyle = C.ink;
  g.lineWidth = INK_W;
  g.stroke();
  // strata lines on the mesas
  g.strokeStyle = 'rgba(29,16,9,0.35)';
  g.lineWidth = 1.2;
  for (const y of [272, 292, 312]) {
    g.beginPath();
    g.moveTo(20, y);
    g.lineTo(580, y);
    g.stroke();
  }
  // where the desert meets the mesas
  g.fillStyle = C.sandDark;
  g.fillRect(0, 326, 600, 6);

  // Main Street: a dirt road up the middle, boardwalks either side
  const road: P[] = [
    [206, 800],
    [230, 300],
    [326, 300],
    [350, 800],
  ];
  path(g, road);
  inked(g, C.road);
  g.save();
  path(g, road);
  g.clip();
  const r = rng(7);
  g.fillStyle = 'rgba(120,60,20,0.35)';
  for (let i = 0; i < 260; i++) {
    g.beginPath();
    g.ellipse(200 + r() * 160, 300 + r() * 500, 1 + r() * 2.5, 0.8 + r() * 1.5, 0, 0, Math.PI * 2);
    g.fill();
  }
  // wheel ruts
  g.strokeStyle = C.roadDark;
  g.lineWidth = 3;
  for (const [x0, x1] of [
    [254, 244],
    [302, 312],
  ]) {
    g.beginPath();
    g.moveTo(x0, 300);
    g.lineTo(x1, 800);
    g.stroke();
  }
  g.restore();
  for (const side of [-1, 1]) {
    // boardwalk strips along the road's edges
    const bw: P[] =
      side < 0
        ? [
            [192, 800],
            [218, 300],
            [230, 300],
            [206, 800],
          ]
        : [
            [350, 800],
            [326, 300],
            [338, 300],
            [364, 800],
          ];
    path(g, bw);
    inked(g, C.woodLight, 1.6);
    g.strokeStyle = C.wood;
    g.lineWidth = 1;
    for (let y = 310; y < 800; y += 12) {
      const t = (y - 300) / 500;
      const xa = bw[1][0] + (bw[0][0] - bw[1][0]) * t;
      const xb = bw[2][0] + (bw[3][0] - bw[2][0]) * t;
      g.beginPath();
      g.moveTo(xa, y);
      g.lineTo(xb, y);
      g.stroke();
    }
  }
  title(g, 'MAIN ST.', 278, 640, 13, C.cream, C.roadDark);

  // a turquoise river from the mine down into the Gold Pan's pool
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const river: P[] = [
    [124, 214],
    [110, 260],
    [96, 310],
    [108, 360],
    [120, 410],
    [132, 470],
  ];
  for (const [w, c] of [
    [34, C.ink],
    [29, C.turqDeep],
    [18, C.turq],
    [5, '#bffff6'],
  ] as const) {
    strokePath(g, river);
    g.strokeStyle = c;
    g.lineWidth = w;
    g.stroke();
  }
  g.beginPath();
  g.arc(L.PAN.x, L.PAN.y, L.PAN.r + 18, 0, Math.PI * 2);
  inked(g, C.turqDeep, INK_W);
  g.beginPath();
  g.arc(L.PAN.x, L.PAN.y, L.PAN.r + 11, 0, Math.PI * 2);
  g.fillStyle = C.turq;
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.6)';
  g.lineWidth = 1.4;
  for (const rr of [L.PAN.r + 4, L.PAN.r + 14]) {
    g.beginPath();
    g.arc(L.PAN.x, L.PAN.y, rr, Math.PI * 0.15, Math.PI * 0.55);
    g.stroke();
    g.beginPath();
    g.arc(L.PAN.x, L.PAN.y, rr, Math.PI * 1.1, Math.PI * 1.4);
    g.stroke();
  }
  // gold nuggets in the river
  const rn = rng(3);
  for (let i = 0; i < 14; i++) {
    const p = river[Math.floor(rn() * (river.length - 1))];
    g.beginPath();
    g.ellipse(p[0] + (rn() - 0.5) * 16, p[1] + (rn() - 0.5) * 30, 2.2, 1.6, rn() * 3, 0, Math.PI * 2);
    inked(g, C.gold, 0.8);
  }

  // the railroad bed up the left orbit
  g.fillStyle = '#8f6a4a';
  g.fillRect(20, 100, 42, 500);
  g.fillStyle = 'rgba(29,16,9,0.25)';
  const rg = rng(11);
  for (let i = 0; i < 300; i++) g.fillRect(22 + rg() * 38, 100 + rg() * 500, 1.5, 1.5);
  g.strokeStyle = C.wood;
  g.lineWidth = 5;
  for (let y = 108; y < 590; y += 14) {
    g.beginPath();
    g.moveTo(23, y);
    g.lineTo(59, y);
    g.stroke();
  }
  g.strokeStyle = '#c7ccd2';
  g.lineWidth = 2.6;
  for (const x of [31, 51]) {
    g.beginPath();
    g.moveTo(x, 100);
    g.lineTo(x, 596);
    g.stroke();
  }
  locomotive(g, 41, 420);
  // the top run of the orbit, printed as a dusty trail
  g.fillStyle = 'rgba(143,106,74,0.55)';
  g.fillRect(100, 18, 290, 46);

  // the saloon's plank floor
  g.fillStyle = '#5a2c14';
  g.fillRect(380, 64, 110, 240);
  g.strokeStyle = 'rgba(0,0,0,0.3)';
  g.lineWidth = 1;
  for (let x = 386; x < 490; x += 11) {
    g.beginPath();
    g.moveTo(x, 64);
    g.lineTo(x, 304);
    g.stroke();
  }
  // the barrel yard under the pops: a ring of packed red dirt
  g.beginPath();
  g.ellipse(426, 410, 62, 110, 0, 0, Math.PI * 2);
  inked(g, '#d0612f', INK_W);
  g.strokeStyle = 'rgba(255,220,160,0.5)';
  g.lineWidth = 2;
  g.setLineDash([5, 6]);
  g.beginPath();
  g.ellipse(426, 410, 54, 102, 0, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);

  // the lanes: Saloon lane rope stripes, shooter lane boards
  g.fillStyle = '#6b2f7d';
  g.fillRect(490, 120, 47, 520);
  g.strokeStyle = 'rgba(255,220,255,0.25)';
  g.lineWidth = 2;
  for (let y = 130; y < 640; y += 18) {
    g.beginPath();
    g.moveTo(492, y);
    g.lineTo(535, y + 8);
    g.stroke();
  }
  g.fillStyle = '#3a1d0d';
  g.fillRect(537, 120, 43, 1080);
  g.strokeStyle = C.gold;
  g.lineWidth = 2;
  for (let y = 1060; y > 700; y -= 40) {
    g.beginPath();
    g.moveTo(546, y);
    g.lineTo(558.5, y - 14);
    g.lineTo(571, y);
    g.stroke();
  }
  print(g, 'SKILL SHOT', 558.5, 640, 9, C.gold, -Math.PI / 2);

  // cacti, rocks and a skull on the open desert
  cactus(g, 468, 600, 1.05);
  cactus(g, 44, 690, 0.9, -1);
  cactus(g, 228, 470, 0.7);
  for (const [x, y, rx] of [
    [404, 596, 12],
    [520, 700, 9],
    [60, 650, 8],
    [380, 520, 7],
  ] as const) {
    g.beginPath();
    g.ellipse(x, y, rx, rx * 0.65, 0, 0, Math.PI * 2);
    inked(g, '#a8705a', 1.6);
  }
  skull(g, 404, 540, 0.55);

  // lanes at the bottom: turquoise inlanes, red outlanes
  for (const m of [1, -1]) {
    const X = (dx: number) => L.CX + m * dx;
    const outl: P[] = [
      [m > 0 ? 20 : 537, 820],
      [X(-202), 868],
      [X(-202), 1200],
      [m > 0 ? 20 : 537, 1200],
    ];
    path(g, outl);
    inked(g, C.redDark, 1.6);
    const inl: P[] = [
      [X(-202), 868],
      [X(-165), 850],
      [X(-165), 950],
      [X(-111), 1000],
      [X(-111), 1040],
      [X(-202), 965],
    ];
    path(g, inl);
    inked(g, C.turqDeep, 1.6);
  }

  // the logo: a plank sign with crossed revolvers and a longhorn skull
  revolver(g, 277.5, 912, 1.15, -0.55);
  g.save();
  g.translate(277.5 * 2, 0);
  g.scale(-1, 1);
  revolver(g, 277.5, 912, 1.15, -0.55);
  g.restore();
  const plank: P[] = [
    [184, 898],
    [372, 892],
    [376, 940],
    [180, 946],
  ];
  path(g, plank);
  inked(g, C.woodLight, 2.4);
  g.strokeStyle = C.wood;
  g.lineWidth = 1.2;
  for (const y of [910, 926]) {
    g.beginPath();
    g.moveTo(186, y);
    g.lineTo(372, y - 3);
    g.stroke();
  }
  title(g, 'DUST & LEAD', 278, 918, 30, C.cream, C.red, -0.03, 184);
  skull(g, 277.5, 868, 0.9);
  print(g, '★ A PINBALL TALE OF THE FRONTIER ★', 277.5, 960, 8.5, C.ink);

  // WANTED / DEAD OR ALIVE banner around the poster row
  title(g, 'WANTED', 277.5, 790, 12, C.gold, C.redDark);
  print(g, 'DEAD OR ALIVE', 277.5, 846, 8, C.ink);
  // the poster frames (the lamps sit inside)
  for (const [x, y] of POSTER_SPOTS) {
    g.save();
    g.translate(x, y);
    g.rotate(((x * 7) % 5) * 0.02 - 0.04);
    g.beginPath();
    g.rect(-16, -21, 32, 42);
    inked(g, C.cream, 1.6);
    g.restore();
  }
  // reward ladder backing: a long wooden post up Main Street
  g.beginPath();
  g.roundRect(266, 388, 25, 196, 6);
  inked(g, C.wood, 1.8);
  print(g, 'REWARD', 278.5, 598, 8, C.cream);

  // apron: wooden plaques at the bottom, a rules card on each
  for (const m of [1, -1]) {
    const x0 = m > 0 ? 20 : 580;
    const ap: P[] = [
      [x0, 1146],
      [L.CX - m * 60, 1158],
      [L.CX - m * 60, 1200],
      [x0, 1200],
    ];
    path(g, ap);
    inked(g, C.wood, 2);
    g.beginPath();
    g.roundRect(m > 0 ? 40 : 360, 1162, 160, 32, 3);
    inked(g, C.cream, 1.4);
    if (m > 0) {
      print(g, 'GOLD MINE: 3 CARTS LIGHT THE GOLD PAN', 120, 1171, 6.5, C.ink);
      print(g, 'RAILROAD: DROP ALL 3, THEN RIDE THE RAILS', 120, 1180, 6.5, C.ink);
      print(g, 'SALOON: SHOOT THE OUTLAW FROM THE BAR', 120, 1189, 6.5, C.ink);
    } else {
      print(g, 'SIX OUTLAWS WANTED, DEAD OR ALIVE', 440, 1171, 6.5, C.ink);
      print(g, 'RIDE THEM ALL DOWN TO MEET', 440, 1180, 6.5, C.ink);
      print(g, 'THE LAST ONE AT HIGH NOON', 440, 1189, 6.5, C.ink);
    }
  }
  g.restore();
}

/** Where the six Wanted posters sit: a row across the middle, above the logo. */
export const POSTER_SPOTS: P[] = [0, 1, 2, 3, 4, 5].map((i) => [277.5 + (i - 2.5) * 36, 820] as P);
export const POSTER_NAMES = ['BOUNTY', 'GOLD RUSH', 'TRAIN', 'JAILBREAK', 'STAMPEDE', 'HIGH NOON'];
export const POSTER_COLORS = ['#ff3b2a', '#ffc21a', '#3fffe5', '#ff8a1f', '#c066ff', '#fff3d6'];

// ------------------------------------------------------------------ fixtures: rails, walls, slings, pan

function paintFixtures(g: CanvasRenderingContext2D) {
  // Gold Pan: a brass-rimmed pan sitting in its pool
  g.save();
  g.beginPath();
  g.arc(L.PAN.x, L.PAN.y, L.PAN.r, 0, Math.PI * 2);
  const pan = g.createRadialGradient(L.PAN.x - 18, L.PAN.y - 22, 6, L.PAN.x, L.PAN.y, L.PAN.r);
  pan.addColorStop(0, '#b9a88e');
  pan.addColorStop(0.7, '#6d5d4a');
  pan.addColorStop(1, '#3e3328');
  g.fillStyle = pan;
  g.fill();
  // gold dust in the pan
  const r = rng(5);
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * (L.PAN.r - 10);
    g.fillStyle = r() > 0.5 ? C.gold : '#ffe48a';
    g.fillRect(L.PAN.x + Math.cos(a) * d, L.PAN.y + Math.sin(a) * d, 1.6, 1.6);
  }
  g.restore();
  title(g, 'GOLD PAN', L.PAN.x, L.PAN.y - 38, 9, C.gold, C.ink);
  for (const [x, y] of L.PAN_PINS) post(g, x, y, L.PAN_PIN_R + 0.5, '#5a4a1a', '#ffd76a');
  for (const [a, b] of L.PAN_DIVIDERS) wall(g, [a, b], GUIDE_W);
  ['R', 'N', 'X'].forEach((t, i) => print(g, t, L.PAN_CUPS[i][0], L.PAN_CUPS[i][1] + 15, 7, C.cream));
  const bowl: P[] = [];
  for (let i = 0; i <= 48; i++) bowl.push([L.PAN.x + Math.cos((i / 48) * Math.PI * 2) * L.PAN.r, L.PAN.y + Math.sin((i / 48) * Math.PI * 2) * L.PAN.r]);
  wall(g, bowl, { h: 14, w: 7, side: '#6e4b10', top: '#ffc21a', hi: '#fff4b0' });
  wall(g, L.PAN_ROOF, GUIDE_W);

  // rails and walls
  wall(g, L.OUTER, WALL_W);
  wall(g, L.DIVIDER, RAIL_W);
  wall(g, L.SHOOTER_FLOOR, RAIL_W);
  wall(g, L.RR_INNER, RAIL_W);
  wall(g, L.SALOON_LEFT, RAIL_W);
  wall(g, L.SALOON_RIGHT, RAIL_W);
  wall(g, L.SALOON_GUIDE, GUIDE_W);
  for (const r of L.RAMPS) {
    wall(g, r.walls.left.slice(0, r.baseTo + 1), GUIDE_W);
    wall(g, r.walls.right.slice(0, r.baseTo + 1), GUIDE_W);
    post(g, r.entry[0][0], r.entry[0][1], 4, '#141414', C.gold);
    post(g, r.entry[1][0], r.entry[1][1], 4, '#141414', C.gold);
  }
  post(g, L.RR_MOUTH[1][0], L.RR_MOUTH[1][1], 5, '#141414', C.gold);
  const tipR = L.SALOON_RIGHT[L.SALOON_RIGHT.length - 1];
  post(g, tipR[0], tipR[1], 4);
  const tipD = L.DIVIDER[L.DIVIDER.length - 1];
  post(g, tipD[0], tipD[1], 4);

  // lower playfield: guides, outlane guards and slings with painted plastics
  for (const side of [1, -1]) {
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
    post(g, X(-202), 868, 5, '#141414', C.gold);
  }
  for (const gd of L.OUTLANE_GUARDS) {
    wall(g, gd, RAIL_W);
    post(g, gd[1][0], gd[1][1], 4, '#141414', C.gold);
  }
  for (const tri of SLINGS) {
    slingshot(g, tri, 'rgba(214,52,42,0.92)', C.ink);
    const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
    const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3 - lift(34);
    star(g, cx, cy, 11, C.gold, C.ink);
    // a horseshoe above the star
    g.beginPath();
    g.arc(cx, cy - 20, 6, Math.PI * 0.85, Math.PI * 2.15);
    g.strokeStyle = C.ink;
    g.lineWidth = 4;
    g.stroke();
    g.strokeStyle = '#c7ccd2';
    g.lineWidth = 2.4;
    g.stroke();
  }
}

const SLINGS: P[][] = [1, -1].map((m) => [
  [L.CX - m * 165, 850],
  [L.CX - m * 165, 950],
  [L.CX - m * 111, 993],
]);

/**
 * The cached floor: printed art (unless a painting replaces it), then the inserts, then the walls,
 * rails and slings that sit on the floor.
 */
export function paintFloor(g: CanvasRenderingContext2D, drawInserts: () => void, printed: boolean) {
  if (printed) paintPrinted(g);
  drawInserts();
  paintFixtures(g);
}

// ------------------------------------------------------------------ ramps, wire, signs (above floor balls)

function chromeRail(g: CanvasRenderingContext2D, pts: P[]) {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [w, c, dy] of [
    [6.5, 'rgba(0,0,0,0.55)', 1.5],
    [4, '#7d8791', 0],
    [2.4, C.chrome, -0.6],
    [0.9, '#ffffff', -1.2],
  ] as const) {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y + dy) : g.moveTo(x, y + dy)));
    g.strokeStyle = c;
    g.lineWidth = w;
    g.stroke();
  }
}

function rampEdges(r: L.RampDef) {
  return {
    l: r.walls.left.map(([x, y], i) => [x, y - lift(r.z[i])] as P),
    rt: r.walls.right.map(([x, y], i) => [x, y - lift(r.z[i])] as P),
  };
}

function sign(g: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, h: number, face: string, letters: string, angle = 0) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
  g.beginPath();
  g.roundRect(-w / 2, -h / 2, w, h, 3);
  inked(g, face, 2);
  g.restore();
  title(g, text, x, y + 0.5, h * 0.62, letters, C.ink, angle, w - 8);
}

export function paintRamps(g: CanvasRenderingContext2D, drawDomes: () => void) {
  g.save();
  // the mine's wire track, highest of all
  const wire = L.WIRE.map(([x, y], i) => [x, y - lift(L.WIRE_Z.from + ((L.WIRE_Z.to - L.WIRE_Z.from) * i) / (L.WIRE.length - 1))] as P);
  chromeRail(
    g,
    wire.map(([x, y]) => [x, y - 4] as P),
  );
  chromeRail(
    g,
    wire.map(([x, y]) => [x, y + 4] as P),
  );

  // the mine's headframe: a timber tower over the shaft, a wheel on top (it turns: paintTop)
  const [lx, ly] = L.LIFT.to;
  const top = ly - lift(L.LIFT.z1) - 6;
  g.lineCap = 'round';
  for (const [w, c] of [
    [6, C.ink],
    [3.6, C.woodLight],
  ] as const) {
    g.strokeStyle = c;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(lx - 16, L.LIFT.from[1] - 2);
    g.lineTo(lx - 8, top);
    g.moveTo(lx + 16, L.LIFT.from[1] - 2);
    g.lineTo(lx + 8, top);
    for (let y = L.LIFT.from[1] - 16; y > top + 6; y -= 16) {
      const t = (L.LIFT.from[1] - y) / (L.LIFT.from[1] - top);
      const hw = 16 - 8 * t;
      g.moveTo(lx - hw, y);
      g.lineTo(lx + hw, y - 12);
    }
    g.stroke();
  }

  // Gold Mine ramp: a timber trestle with plank decking
  {
    const { l, rt } = rampEdges(L.MINE);
    const a = L.MINE.baseTo;
    g.beginPath();
    g.moveTo(l[a][0], l[a][1]);
    for (let i = a + 1; i < l.length; i++) g.lineTo(l[i][0], l[i][1]);
    for (let i = rt.length - 1; i >= a; i--) g.lineTo(rt[i][0], rt[i][1]);
    g.closePath();
    inked(g, C.woodPale, 2);
    g.strokeStyle = C.wood;
    g.lineWidth = 1.4;
    for (let i = a; i < l.length; i += 2) {
      g.beginPath();
      g.moveTo(l[i][0], l[i][1]);
      g.lineTo(rt[i][0], rt[i][1]);
      g.stroke();
    }
    // trestle legs down to the floor
    for (let i = a + 3; i < l.length; i += 5) {
      for (const [e, w] of [
        [l, L.MINE.walls.left],
        [rt, L.MINE.walls.right],
      ] as const) {
        g.beginPath();
        g.moveTo(e[i][0], e[i][1]);
        g.lineTo(w[i][0], w[i][1]);
        g.strokeStyle = C.ink;
        g.lineWidth = 4;
        g.stroke();
        g.strokeStyle = C.wood;
        g.lineWidth = 2.4;
        g.stroke();
      }
    }
    for (const e of [l, rt]) {
      g.beginPath();
      e.slice(a).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.strokeStyle = C.ink;
      g.lineWidth = 5;
      g.stroke();
      g.strokeStyle = C.wood;
      g.lineWidth = 3;
      g.stroke();
    }
  }
  sign(g, 'GOLD MINE', 222, 316 - lift(46), 64, 16, C.gold, C.red, -0.2);

  // Stagecoach: a chrome wireform with turquoise risers
  {
    const { l, rt } = rampEdges(L.STAGE);
    const a = L.STAGE.baseTo;
    g.strokeStyle = 'rgba(42,214,196,0.9)';
    g.lineWidth = 2;
    for (let i = a + 2; i < l.length; i += 4) {
      g.beginPath();
      g.moveTo(l[i][0], l[i][1]);
      g.lineTo(rt[i][0], rt[i][1]);
      g.stroke();
    }
    // risers down to the floor every so often
    g.strokeStyle = 'rgba(29,16,9,0.6)';
    g.lineWidth = 2;
    for (let i = a + 6; i < l.length - 6; i += 12) {
      const p = L.STAGE.path[i];
      g.beginPath();
      g.moveTo(p[0], p[1]);
      g.lineTo(p[0], p[1] - lift(L.STAGE.z[i]));
      g.stroke();
    }
    chromeRail(g, l.slice(a));
    chromeRail(g, rt.slice(a));
  }
  sign(g, 'STAGECOACH', 366, 604 - lift(40), 76, 16, C.turq, C.cream, 0.28);

  // the saloon's sign over the bar, with a row of bulbs
  sign(g, 'SALOON', 434, 146 - lift(70), 82, 22, C.red, C.gold);
  drawDomes();
  g.restore();
}

// ------------------------------------------------------------------ toys and buildings (depth-sorted)

const NOON_FRONT: P[] = [
  [200, 214],
  [200, 168],
  [212, 168],
  [212, 156],
  [244, 156],
  [244, 146],
  [311, 146],
  [311, 156],
  [343, 156],
  [343, 168],
  [355, 168],
  [355, 214],
];

function paintNoon(g: CanvasRenderingContext2D) {
  const N = L.NOON;
  block(
    g,
    [
      [N.x0, N.y0],
      [N.x1, N.y0],
      [N.x1, N.y1],
      [N.x0, N.y1],
    ],
    40,
    '#7a2b1c',
    C.redDark,
  );
  // shingles on the roof
  g.strokeStyle = 'rgba(0,0,0,0.3)';
  g.lineWidth = 1;
  for (let y = N.y0 - lift(40) + 8; y < N.y1 - lift(40); y += 9) {
    g.beginPath();
    g.moveTo(N.x0 + 2, y);
    g.lineTo(N.x1 - 2, y);
    g.stroke();
  }
  // the Quick Draw window down the right side of the roof
  g.fillStyle = C.turqDeep;
  g.fillRect(N.x1 - 9, L.NOON_SIDE[1][1] - lift(40), 6, L.NOON_SIDE[0][1] - L.NOON_SIDE[1][1]);
  print(g, 'QUICK DRAW', N.x1 - 6, (L.NOON_SIDE[0][1] + L.NOON_SIDE[1][1]) / 2 - lift(40), 6.5, C.cream, Math.PI / 2);
  // the false front: planks, trim, a sign and the clock
  path(g, NOON_FRONT);
  inked(g, C.red, 2.4);
  g.save();
  path(g, NOON_FRONT);
  g.clip();
  g.strokeStyle = 'rgba(0,0,0,0.22)';
  g.lineWidth = 1;
  for (let x = 206; x < 355; x += 8) {
    g.beginPath();
    g.moveTo(x, 140);
    g.lineTo(x, 214);
    g.stroke();
  }
  g.restore();
  g.beginPath();
  g.roundRect(222, 160, 111, 20, 2);
  inked(g, C.cream, 1.8);
  title(g, 'HIGH NOON', 277.5, 170.5, 13, C.red, C.gold);
  // pediment and clock
  path(g, [
    [252, 146],
    [277.5, 124],
    [303, 146],
  ]);
  inked(g, C.redDark, 2);
  g.beginPath();
  g.arc(277.5, 136, 10, 0, Math.PI * 2);
  inked(g, C.cream, 1.6);
  g.strokeStyle = C.ink;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(277.5, 136);
  g.lineTo(277.5, 128.5);
  g.moveTo(277.5, 136);
  g.lineTo(277.5, 129.5);
  g.stroke();
  // porch posts between the windows
  for (const x of [204, 216, 257.5, 297.5, 339, 351]) {
    g.beginPath();
    g.rect(x - 2, 186, 4, 28);
    inked(g, C.woodPale, 1);
  }
  g.beginPath();
  g.rect(200, 183, 155, 4);
  inked(g, C.wood, 1.2);
}

function paintMine(g: CanvasRenderingContext2D) {
  const H = L.MINE_HOUSE;
  block(
    g,
    [
      [H.x0, H.y0],
      [H.x1, H.y0],
      [H.x1, H.y1],
      [H.x0, H.y1],
    ],
    36,
    '#8f949a',
    C.wood,
  );
  // corrugated tin roof
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.lineWidth = 1.2;
  for (let x = H.x0 + 4; x < H.x1; x += 5) {
    g.beginPath();
    g.moveTo(x, H.y0 - lift(36) + 2);
    g.lineTo(x, H.y1 - lift(36) - 2);
    g.stroke();
  }
  // the mine's mouth on the front face, timber framed
  const y1 = H.y1;
  const y0 = H.y1 - lift(36);
  g.beginPath();
  g.rect(H.x0, y0, H.x1 - H.x0, y1 - y0);
  inked(g, C.wood, 1.6);
  g.beginPath();
  g.moveTo(102, y1);
  g.lineTo(102, y0 + 6);
  g.quadraticCurveTo(118, y0 - 2, 134, y0 + 6);
  g.lineTo(134, y1);
  g.closePath();
  inked(g, '#140b06', 1.6);
  g.strokeStyle = C.woodLight;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(100, y1);
  g.lineTo(100, y0 + 4);
  g.lineTo(136, y0 + 4);
  g.lineTo(136, y1);
  g.stroke();
  // a lantern by the mouth
  g.beginPath();
  g.arc(92, y0 + 8, 3, 0, Math.PI * 2);
  inked(g, '#ffe08a', 1);
}

function paintTown(g: CanvasRenderingContext2D) {
  block(g, L.TOWN, 40, '#5c6f8f', '#3d4e6a');
  // a ridge line down the roof
  g.strokeStyle = C.ink;
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(347, 284 - lift(40));
  g.lineTo(347, 400 - lift(40));
  g.stroke();
  print(g, 'HARDWARE', 339, 344 - lift(40), 6.5, C.cream, -Math.PI / 2);
  // the Sheriff's false front, star badge on it
  const f: P[] = [
    [330, 400],
    [330, 368],
    [337, 368],
    [337, 362],
    [355, 362],
    [355, 368],
    [364, 368],
    [364, 400],
  ];
  path(g, f);
  inked(g, '#e8d3a6', 2);
  star(g, 347, 384, 9, C.gold, C.ink);
  print(g, 'SHERIFF', 347, 369, 6, C.ink);
}

function paintJail(g: CanvasRenderingContext2D) {
  const [m0, a, b, m1] = L.JAIL_WALLS;
  const z = 26;
  const dz = lift(z);
  // three brick walls (the front is the open mouth)
  g.fillStyle = 'rgba(29,16,9,0.35)';
  path(g, [a, b, m1, m0].map(([x, y]) => [x + 5, y + 6] as P));
  g.fill();
  for (const [p, q] of [
    [m0, a],
    [a, b],
    [b, m1],
  ] as [P, P][]) {
    path(g, [p, q, [q[0], q[1] - dz], [p[0], p[1] - dz]]);
    inked(g, C.brick, 1.4);
  }
  // the barred roof: an iron frame with bars, so a ball inside shows through
  const top = [m0, a, b, m1].map(([x, y]) => [x, y - dz] as P);
  path(g, top);
  g.fillStyle = 'rgba(40,30,25,0.35)';
  g.fill();
  g.strokeStyle = '#151210';
  g.lineWidth = 3;
  for (let i = 1; i < 7; i++) {
    const t = i / 7;
    const f = L.along(top[0], top[3], t);
    const k = L.along(top[1], top[2], t);
    g.beginPath();
    g.moveTo(f[0], f[1]);
    g.lineTo(k[0], k[1]);
    g.stroke();
  }
  path(g, top);
  g.strokeStyle = C.ink;
  g.lineWidth = 3;
  g.stroke();
  g.strokeStyle = '#6a6e73';
  g.lineWidth = 1.6;
  g.stroke();
  sign(g, 'JAIL', (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - dz - 6, 40, 14, C.cream, C.red, -0.39);
}

function paintCoach(g: CanvasRenderingContext2D, rock: number, t: number) {
  // on its own plastic shelf beside the Stagecoach ramp, rocking after a ramp
  const x = 456;
  const y = 548;
  const dz = lift(48);
  g.save();
  g.fillStyle = 'rgba(29,16,9,0.3)';
  g.beginPath();
  g.ellipse(x + 4, y + 6, 34, 12, 0, 0, Math.PI * 2);
  g.fill();
  // the plastic shelf
  g.beginPath();
  g.ellipse(x, y - dz + 8, 36, 13, 0, 0, Math.PI * 2);
  g.fillStyle = 'rgba(63,255,229,0.35)';
  g.fill();
  g.strokeStyle = 'rgba(29,16,9,0.6)';
  g.lineWidth = 1.4;
  g.stroke();
  g.translate(x, y - dz);
  g.rotate(Math.sin(t * 22) * rock * 0.08);
  // wheels
  for (const wx of [-20, 18]) {
    g.beginPath();
    g.arc(wx, 4, 9, 0, Math.PI * 2);
    inked(g, C.gold, 1.6);
    g.strokeStyle = C.ink;
    g.lineWidth = 1;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      g.beginPath();
      g.moveTo(wx, 4);
      g.lineTo(wx + Math.cos(a) * 8, 4 + Math.sin(a) * 8);
      g.stroke();
    }
  }
  // body
  g.beginPath();
  g.moveTo(-26, -2);
  g.lineTo(-22, -24);
  g.lineTo(22, -24);
  g.lineTo(26, -2);
  g.quadraticCurveTo(0, 4, -26, -2);
  inked(g, C.red, 1.8);
  g.beginPath();
  g.rect(-14, -20, 12, 10);
  g.rect(4, -20, 12, 10);
  g.fillStyle = '#ffe08a';
  g.fill();
  g.strokeStyle = C.ink;
  g.lineWidth = 1.2;
  g.stroke();
  // luggage on the roof
  g.beginPath();
  g.roundRect(-16, -32, 18, 8, 2);
  inked(g, C.woodLight, 1.2);
  g.beginPath();
  g.roundRect(4, -30, 12, 6, 2);
  inked(g, C.turq, 1.2);
  print(g, 'U.S. MAIL', 0, -5, 5.5, C.gold);
  g.restore();
}

/** The buildings and toys, each depth-sorted with the balls at its front edge. */
export function spriteList(v: DustView, out: Sprite[]) {
  out.push({ y: L.NOON.y1, draw: (g) => cached(g, 'noon', 190, 50, 175, 170, paintNoon) });
  out.push({ y: L.NOON.y1 + 0.5, draw: (g) => paintOutlaw(g, v) });
  out.push({ y: L.MINE_HOUSE.y1, draw: (g) => cached(g, 'mine', 64, 60, 100, 150, paintMine) });
  out.push({ y: 400, draw: (g) => cached(g, 'town', 322, 250, 52, 160, paintTown) });
  out.push({ y: 742, draw: (g) => cached(g, 'jail', 116, 610, 120, 140, paintJail) });
  out.push({ y: 560, draw: (g) => paintCoach(g, v.coachRock, v.time) });
  v.bumpers.forEach((c, i) => out.push({ y: c.y, draw: (g) => drawBumper(g, c.x, c.y, c.r, BARREL, v.bumperFlash[i], C.turqLit) }));
}

/** The three windows (lit when hit) and the outlaw walking between them. */
function paintOutlaw(g: CanvasRenderingContext2D, v: DustView) {
  L.NOON_WINDOWS.forEach(([a, b], i) => {
    const lit = v.targetFlash[i];
    g.beginPath();
    g.rect(a[0] + 4, 190, b[0] - a[0] - 8, 20);
    inked(g, lit > 0 ? mix('#3a1d0d', '#fff0a0', lit) : '#3a1d0d', 1.6);
    g.strokeStyle = C.cream;
    g.lineWidth = 1.4;
    g.strokeRect(a[0] + 6, 192, b[0] - a[0] - 12, 16);
  });
  const step = v.outlawWalk > 0 ? (v.outlaw === 2 ? -1 : v.outlaw === 0 ? 1 : 0) * v.outlawWalk : 0;
  const pos = v.outlaw + step;
  const wx = 237.5 + pos * 40;
  const wy = 206;
  const bob = v.outlawWalk > 0 ? Math.abs(Math.sin(v.outlawWalk * Math.PI * 3)) * 1.5 : 0;
  g.save();
  g.translate(wx, wy - bob);
  // poncho and shoulders
  g.beginPath();
  g.moveTo(-10, 4);
  g.lineTo(-6, -5);
  g.lineTo(6, -5);
  g.lineTo(10, 4);
  g.closePath();
  inked(g, C.red, 1.2);
  // head
  g.beginPath();
  g.arc(0, -8, 3.8, 0, Math.PI * 2);
  inked(g, '#e7b07a', 1);
  // hat
  g.beginPath();
  g.ellipse(0, -11, 9, 2.2, 0, 0, Math.PI * 2);
  inked(g, C.ink, 1);
  g.beginPath();
  g.roundRect(-4, -17, 8, 6, 2);
  inked(g, C.ink, 1);
  // bandana
  g.fillStyle = C.ink;
  g.fillRect(-3.5, -7, 7, 2.4);
  g.restore();
}

// ------------------------------------------------------------------ live floor things and lights

/** General illumination: warm bulbs under the plastics and rails. */
const GI: P[] = [
  [26, 220],
  [26, 520],
  [70, 700],
  [112, 840],
  [166, 1000],
  [442, 840],
  [388, 1000],
  [484, 700],
  [494, 300],
  [494, 560],
  [200, 226],
  [355, 226],
  [380, 120],
  [150, 210],
  [250, 640],
  [310, 640],
];

export function paintDynamic(g: CanvasRenderingContext2D, v: DustView) {
  for (const [x, y] of GI) drawGlow(g, x, y, 46, '#ffcf8a', 0.28 * v.light);
  // drop targets
  L.RR_DROPS.forEach(([a, b], i) => {
    const d = v.drops[i];
    g.save();
    g.lineCap = 'round';
    if (d.down) {
      g.strokeStyle = 'rgba(29,16,9,0.7)';
      g.lineWidth = 4;
      strokePath(g, [a, b]);
      g.stroke();
    } else {
      const dz = lift(16);
      path(g, [a, b, [b[0], b[1] - dz], [a[0], a[1] - dz]]);
      inked(g, ['#ff3b2a', C.gold, C.turq][i], 1.4);
      print(g, 'TRN'[i], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - dz / 2, 6.5, C.ink, -0.31);
    }
    g.restore();
  });
  // Gold Pan cups
  L.PAN_CUPS.forEach(([x, y], i) => {
    if (v.cupFlash[i] > 0) drawGlow(g, x, y + 2, 26, C.gold, v.cupFlash[i]);
  });
  // plunger
  const py = 1180 + v.plungerPull * 28;
  g.fillStyle = '#8a8178';
  g.fillRect(L.SHOOTER.x - 6, py, 12, 1200 - py + 20);
  g.beginPath();
  g.roundRect(L.SHOOTER.x - 9, py - 4, 18, 6, 2);
  inked(g, C.red, 1);
}

/** The minecart, the headframe's wheel, the saloon doors and the target flashes: over everything. */
export function paintTop(g: CanvasRenderingContext2D, v: DustView) {
  // headframe wheel, turning while the cart rides
  const [lx, ly] = L.LIFT.to;
  const cart = v.cart();
  const wy = ly - lift(L.LIFT.z1) - 10;
  g.save();
  g.translate(lx, wy);
  g.rotate(cart.busy ? v.time * 6 : 0);
  g.beginPath();
  g.arc(0, 0, 9, 0, Math.PI * 2);
  inked(g, '#2e2a26', 1.6);
  g.strokeStyle = '#c7ccd2';
  g.lineWidth = 1.4;
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI;
    g.beginPath();
    g.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
    g.lineTo(-Math.cos(a) * 8, -Math.sin(a) * 8);
    g.stroke();
  }
  g.restore();
  // the minecart: a bucket around the lower half of the ball it carries
  const cy = cart.y - lift(cart.z);
  g.beginPath();
  g.moveTo(cart.x - 16, cy - 2);
  g.lineTo(cart.x + 16, cy - 2);
  g.lineTo(cart.x + 12, cy + 12);
  g.lineTo(cart.x - 12, cy + 12);
  g.closePath();
  inked(g, '#6d4a2a', 1.6);
  g.fillStyle = C.gold;
  if (!cart.busy) {
    g.beginPath();
    g.ellipse(cart.x, cy - 2, 13, 4, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = '#c7ccd2';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(cart.x - 15, cy + 2);
  g.lineTo(cart.x + 15, cy + 2);
  g.stroke();

  // target flashes on the town building
  if (v.targetFlash[4] > 0) drawGlow(g, L.HARDWARE[0][0], 350, 34, C.turqLit, v.targetFlash[4]);
  if (v.targetFlash[5] > 0) drawGlow(g, 347, 400, 34, C.turqLit, v.targetFlash[5]);
  if (v.targetFlash[3] > 0) drawGlow(g, L.NOON.x1, 160 - lift(40), 40, C.turqLit, v.targetFlash[3]);

  // swinging saloon doors on both gates
  const swing = Math.sin(v.time * 16) * v.doorsSwing * 0.6;
  for (const [[x, y0], [, y1]] of [L.DOOR_L, [L.DOOR_R[1], L.DOOR_R[0]]] as [P, P][]) {
    const h = Math.min(44, y1 - y0);
    g.save();
    g.translate(x, y0 + 2);
    g.transform(1, 0, Math.sin(swing), 1, 0, 0);
    g.beginPath();
    g.rect(-3.5, 0, 7, h);
    inked(g, C.gold, 1.2);
    g.strokeStyle = C.ink;
    g.lineWidth = 1;
    for (let yy = 6; yy < h - 2; yy += 7) {
      g.beginPath();
      g.moveTo(-3.5, yy);
      g.lineTo(3.5, yy);
      g.stroke();
    }
    g.restore();
  }
  // the saloon sign's bulbs chase
  for (let k = 0; k < 9; k++) {
    const on = Math.floor(v.time * 6 + k) % 3 === 0;
    const bx = 434 - 36 + k * 9;
    const by = 146 - lift(70) - 14;
    g.beginPath();
    g.arc(bx, by, 2, 0, Math.PI * 2);
    g.fillStyle = on ? '#fff3b0' : '#8a6a2a';
    g.fill();
    if (on) drawGlow(g, bx, by, 7, C.gold, 0.8);
  }
  void art;
}
