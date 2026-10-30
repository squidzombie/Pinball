// Art template: draws the live physics world (every wall, gate, ramp, target, sensor, flipper
// and insert) so painted art can be lined up with the collision geometry exactly.
// Writes SVGs in table units (600 x 1200) plus PNGs at 3 px per unit, and the insert list.
// Usage: npm run template
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Game } from '../src/game/game';
import { FLOOR, RAMP, RAMP2, type Segment } from '../src/engine/physics';
import type { Lamp } from '../src/game/tables/draw';
import { HK } from '../src/game/tables/draw';
import * as L from '../src/game/tables/psychosis-layout';
import type { P } from '../src/game/tables/geom';
import { TABLE_H, TABLE_W } from '../src/game/tables/table';
import { measureGaps } from './gaps';

const OUT = 'art/template';
const SCALE = 3;

/* eslint-disable @typescript-eslint/no-explicit-any */
const game = new Game();
const t = game.main as any;
const w = t.world;

const f1 = (n: number) => Math.round(n * 10) / 10;
const pts = (p: P[]) => p.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const lift = (z: number) => z * HK;

class Svg {
  parts: string[] = [];
  add(s: string) {
    this.parts.push(s);
  }
  line(a: P, b: P, stroke: string, width: number, extra = '') {
    this.add(`<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" ${extra}/>`);
  }
  path(p: P[], stroke: string, width: number, closed = false, fill = 'none', extra = '') {
    const tag = closed ? 'polygon' : 'polyline';
    this.add(`<${tag} points="${pts(p)}" stroke="${stroke}" stroke-width="${width}" fill="${fill}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`);
  }
  circle(x: number, y: number, r: number, stroke: string, width: number, fill = 'none', extra = '') {
    this.add(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" stroke="${stroke}" stroke-width="${width}" fill="${fill}" ${extra}/>`);
  }
  text(s: string, x: number, y: number, size: number, fill: string, anchor = 'middle', extra = '') {
    this.add(`<text x="${f1(x)}" y="${f1(y)}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-family="Arial, Helvetica, sans-serif" font-weight="700" ${extra}>${esc(s)}</text>`);
  }
  doc(bg: string | null) {
    const back = bg ? `<rect x="0" y="0" width="${TABLE_W}" height="${TABLE_H}" fill="${bg}"/>` : '';
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${TABLE_W * SCALE}" height="${TABLE_H * SCALE}" viewBox="0 0 ${TABLE_W} ${TABLE_H}">\n${back}\n${this.parts.join('\n')}\n</svg>\n`;
  }
}

// ------------------------------------------------------------------ what everything is

const C = {
  wall: '#111111',
  oneWay: '#e07000',
  skyway: '#1f6fd6',
  market: '#8a3fd1',
  target: '#d01818',
  sling: '#c0179a',
  sensor: '#1a9a3a',
  solid: '#d9d9d9',
  insert: '#c81e1e',
  flipper: '#6a4a00',
  grid: '#e4e4e4',
  grid100: '#c4c4c4',
  note: '#444444',
  gap: '#0a7f8f',
};

const targets = new Map<Segment, string>();
t.drops.forEach((d: any, i: number) => targets.set(d.seg, `DROP ${i + 1}`));
t.standups.forEach((s: Segment, i: number) => targets.set(s, L.BREACH_LETTERS[i]));
t.flanks.forEach((s: Segment, i: number) => targets.set(s, i === 0 ? 'SAFE' : 'VENT'));
t.tumblers.forEach((s: Segment, i: number) => targets.set(s, `T${i + 1}`));
const slings = new Set<Segment>([t.lower.slingL, t.lower.slingR]);

/** Raised structures nothing rolls through: shaded so the painter knows they're solid. */
const SOLIDS: [string, P[]][] = [
  ['SEALED (NO BALL ACCESS)', L.SEALED],
  ['', L.SEALED_NEST],
  ['', L.BEHIND_SKYWAY],
  ['TUMBLERS', L.TUMBLER_BLOCK],
  ...t.lower.slings.map((s: P[]) => ['', s] as [string, P[]]),
];

/** The ramps a ball can ride, with the layer their walls live on. */
const RAMPS: { name: string; r: L.RampDef; color: string }[] = [
  { name: 'SKYWAY', r: L.SKYWAY, color: C.skyway },
  { name: 'BLACK MARKET', r: L.MARKET, color: C.market },
  { name: 'BACK ALLEY EXIT', r: L.ALLEY_EXIT, color: C.market },
];

function lampOutline(svg: Svg, l: Lamp, stroke: string, width: number, fill = 'none') {
  const lw = l.w ?? 30;
  const lh = l.h ?? lw;
  const tr = `transform="translate(${f1(l.x)} ${f1(l.y)}) rotate(${f1(((l.angle ?? 0) * 180) / Math.PI)})"`;
  let d = '';
  if (l.kind === 'circle') return svg.add(`<circle cx="0" cy="0" r="${f1(lw / 2)}" stroke="${stroke}" stroke-width="${width}" fill="${fill}" ${tr}/>`);
  if (l.kind === 'arrow') d = `M0 ${-lh / 2} L${lw / 2} ${lh * 0.12} L${lw * 0.24} ${lh * 0.04} L${lw * 0.24} ${lh / 2} L${-lw * 0.24} ${lh / 2} L${-lw * 0.24} ${lh * 0.04} L${-lw / 2} ${lh * 0.12} Z`;
  else if (l.kind === 'tri') d = `M0 ${-lh / 2} L${lw / 2} ${lh / 2} L${-lw / 2} ${lh / 2} Z`;
  else if (l.kind === 'shield') d = `M${-lw / 2} ${-lh / 2} L${lw / 2} ${-lh / 2} L${lw / 2} ${lh * 0.1} Q${lw / 2} ${lh / 2} 0 ${lh / 2} Q${-lw / 2} ${lh / 2} ${-lw / 2} ${lh * 0.1} Z`;
  else d = `M${-lw / 2} ${-lh / 2} h${lw} v${lh} h${-lw} Z`;
  svg.add(`<path d="${d}" stroke="${stroke}" stroke-width="${width}" fill="${fill}" stroke-linejoin="round" ${tr}/>`);
}

function flipperOutline(svg: Svg, f: any, angle: number, stroke: string, width: number, fill: string, extra = '') {
  const tx = f.px + Math.cos(angle) * f.len;
  const ty = f.py + Math.sin(angle) * f.len;
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const d = [
    `M${f1(f.px + nx * f.r0)} ${f1(f.py + ny * f.r0)}`,
    `L${f1(tx + nx * f.r1)} ${f1(ty + ny * f.r1)}`,
    `A${f.r1} ${f.r1} 0 0 0 ${f1(tx - nx * f.r1)} ${f1(ty - ny * f.r1)}`,
    `L${f1(f.px - nx * f.r0)} ${f1(f.py - ny * f.r0)}`,
    `A${f.r0} ${f.r0} 0 0 0 ${f1(f.px + nx * f.r0)} ${f1(f.py + ny * f.r0)}`,
    'Z',
  ].join(' ');
  svg.add(`<path d="${d}" stroke="${stroke}" stroke-width="${width}" fill="${fill}" ${extra}/>`);
}

function rampBed(r: L.RampDef, lifted: boolean): P[] {
  const z = (i: number) => (lifted ? lift(r.z[Math.min(i, r.z.length - 1)]) : 0);
  if (r.walls.left.length) {
    return [...r.walls.left.map(([x, y], i) => [x, y - z(i)] as P), ...r.walls.right.map(([x, y], i) => [x, y - z(i)] as P).reverse()];
  }
  // the exit chute has no walls of its own past the merge: outline its head only
  const head = r.path.slice(0, 5);
  return [...head.map(([, y], i) => [L.CHUTE.left[0][0], y - z(i)] as P), ...head.map(([, y], i) => [L.CHUTE.right[0][0], y - z(i)] as P).reverse()];
}

// ------------------------------------------------------------------ drawing passes

function grid(svg: Svg) {
  for (let x = 0; x <= TABLE_W; x += 25) svg.line([x, 0], [x, TABLE_H], x % 100 ? C.grid : C.grid100, x % 100 ? 0.4 : 0.7);
  for (let y = 0; y <= TABLE_H; y += 25) svg.line([0, y], [TABLE_W, y], y % 100 ? C.grid : C.grid100, y % 100 ? 0.4 : 0.7);
  for (let x = 0; x < TABLE_W; x += 100) for (let y = 100; y < TABLE_H; y += 100) svg.text(`${x},${y}`, x + 2, y - 2, 5, '#9a9a9a', 'start');
}

function solids(svg: Svg, labels: boolean) {
  for (const [name, p] of SOLIDS) {
    svg.path(p, 'none', 0, true, C.solid);
    if (labels && name) {
      const cx = p.reduce((a, q) => a + q[0], 0) / p.length;
      const cy = p.reduce((a, q) => a + q[1], 0) / p.length;
      svg.text(name, cx, cy, 7, C.note);
    }
  }
  // the Reactor's funnel and captive ball channel are open: the ball goes in there
  const R = L.REACTOR;
  svg.path([R.mouthL, R.channelL0, R.channelL1, R.channelR1, R.channelR0, R.mouthR], 'none', 0, true, '#ffffff');
}

function walls(svg: Svg, labels: boolean, floorOnly = false) {
  for (const s of w.segments as Segment[]) {
    const a: P = [s.ax, s.ay];
    const b: P = [s.bx, s.by];
    if (targets.has(s)) {
      svg.line(a, b, C.target, 3.2);
      if (labels) svg.text(targets.get(s)!, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 4, 6, C.target);
      continue;
    }
    if (slings.has(s)) {
      svg.line(a, b, C.sling, 2.4);
      continue;
    }
    if (s.oneWay) {
      svg.line(a, b, C.oneWay, 2.2, 'stroke-dasharray="4 2"');
      if (labels) {
        // the ball may pass against the normal (from the far side through to the near side)
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        const ex = -s.nx * 10;
        const ey = -s.ny * 10;
        svg.line([mx - ex, my - ey], [mx + ex, my + ey], C.oneWay, 1.2, 'marker-end="url(#arrow)"');
      }
      continue;
    }
    if (s.layers & FLOOR) svg.line(a, b, C.wall, 1.8);
    else if (!floorOnly && s.layers & RAMP) svg.line(a, b, C.skyway, 1.2);
    else if (!floorOnly && s.layers & RAMP2) svg.line(a, b, C.market, 1.2);
  }
}

function round(svg: Svg, labels: boolean) {
  t.bumpers.forEach((c: any, i: number) => {
    svg.circle(c.x, c.y, c.r, C.target, 1.8, '#f6d0d0');
    if (labels) svg.text(`POP ${i + 1}`, c.x, c.y + 2, 7, C.target);
  });
  const cap = t.captive.c;
  svg.circle(cap.x, cap.y, cap.r, C.wall, 1.2, '#ffffff');
  const R = L.REACTOR;
  const top = R.pos(R.topS);
  svg.line(R.pos(R.restS), top, C.note, 0.8, 'stroke-dasharray="2 2"');
  svg.circle(R.core[0], R.core[1], R.coreR, C.target, 1.4, '#f6d0d0');
  if (labels) {
    svg.text('CAPTIVE', cap.x + 22, cap.y + 2, 5.5, C.note, 'start');
    svg.text('CORE', R.core[0], R.core[1] + 2, 6, C.target);
  }
  for (const c of w.circles) {
    if (t.bumpers.includes(c) || c === cap) continue;
    svg.circle(c.x, c.y, c.r, C.wall, 1.4, '#ffffff');
  }
  for (const z of w.zones) {
    svg.circle(z.x, z.y, z.r, C.sensor, 1.2, 'none', 'stroke-dasharray="3 2"');
    if (labels) svg.text('SCOOP', z.x, z.y + 2, 6, C.sensor);
  }
}

function flippers(svg: Svg, labels: boolean) {
  const names = ['LEFT', 'RIGHT', 'UPPER L', 'UPPER R'];
  [t.flipperL, t.flipperR, ...t.extraFlippers.map((x: any) => x.f)].forEach((f: any, i: number) => {
    flipperOutline(svg, f, f.restAngle, C.flipper, 1.4, '#f3e6c8');
    flipperOutline(svg, f, f.upAngle, C.flipper, 0.9, 'none', 'stroke-dasharray="3 2"');
    if (labels) svg.text(`${names[i]} FLIPPER`, f.px, f.py + f.r0 + 10, 6, C.flipper);
  });
}

function sensors(svg: Svg) {
  for (const s of w.lineSensors) svg.line([s.ax, s.ay], [s.bx, s.by], C.sensor, 1, 'stroke-dasharray="3 2"');
  const tag = (name: string, p: P[], dx = 0, dy = -4) => svg.text(name, (p[0][0] + p[1][0]) / 2 + dx, (p[0][1] + p[1][1]) / 2 + dy, 5.5, C.sensor);
  tag('BACK ALLEY SWITCH', L.ALLEY_SWITCH, -40, 14);
  L.CAM_LANES.forEach(([x0, x1], i) => tag(`CAM ${i + 1}`, [[x0, L.CAM_Y], [x1, L.CAM_Y]], 0, -3));
  tag('SPINNER', [
    [L.SKY_LANE_X, 650],
    [535, 650],
  ]);
  // decorations drawn in code, so the painted art should leave room for them
  for (const [x, y] of L.CAMERAS) svg.circle(x, y, 8, C.note, 0.8, 'none', 'stroke-dasharray="2 2"');
  svg.text('CAMERAS (pan; a pop knocks out the one above it)', L.CAMERAS[1][0], L.CAMERAS[1][1] - 12, 4.5, C.note);
  tag('CHUTE IN', L.CHUTE.entry, 0, -4);
  // the one-way gates
  const gate = (name: string, p: P[], dx: number, dy: number) => svg.text(name, (p[0][0] + p[1][0]) / 2 + dx, (p[0][1] + p[1][1]) / 2 + dy, 5, C.oneWay);
  gate('LEFT GATE', L.LEFT_GATE, -6, 30);
  gate('UPPER GATE', L.UPPER_GATE, 0, -4);
  gate('UPPER EXIT FLAP', L.UPPER_EXIT_FLAP, 0, -6);
  // the vault door: part of the orbit's inner wall; when open it swings across the orbit (dashed)
  svg.path(L.VAULT_DOOR, C.oneWay, 2.4, false, 'none');
  svg.path(L.VAULT_DEFLECTOR, C.oneWay, 1, false, 'none', 'stroke-dasharray="3 2"');
  gate('VAULT DOOR', L.VAULT_DEFLECTOR, 6, -6);
  tag('UPPER PF IN', L.UPPER_SWITCH, 0, 9);
  tag('UPPER EXIT', L.UPPER_EXIT_SWITCH, 0, 9);
  tag('UPPER DRAIN', L.UPPER_DRAIN_SWITCH, 14, 0);
  // the Impound is a raised cage over the orbit lane: the orbit runs under it
  svg.path(L.IMPOUND_BOX, C.skyway, 0.9, true, 'rgba(31,111,214,0.08)', 'stroke-dasharray="3 2"');
  svg.text('IMPOUND', (L.IMPOUND_BOX[0][0] + L.IMPOUND_BOX[1][0]) / 2, L.IMPOUND_BOX[0][1] - 4, 5, C.skyway);
  svg.text('(raised cage)', (L.IMPOUND_BOX[0][0] + L.IMPOUND_BOX[1][0]) / 2, L.IMPOUND_BOX[2][1] + 7, 4, C.skyway);
  gate('DIVERTER', L.DIVERTER, 24, -3);
  gate('(held open: loop)', L.DIVERTER, 30, 4);
  gate('POP EXIT GATE', L.EXIT_GATE, 0, 12);
  gate('SHOOTER GATE', L.GATE, -30, 0);
  L.ROLLOVERS.forEach(([x0, x1], i) => tag(['R', 'A', 'G', 'E'][i], [[x0, L.ROLL_Y], [x1, L.ROLL_Y]], 0, 9));
}

function ramps(svg: Svg, labels: boolean) {
  for (const { name, r, color } of RAMPS) {
    svg.path(r.path, color, 0.8, false, 'none', 'stroke-dasharray="5 3"');
    if (!labels) continue;
    if (r.walls.left.length) {
      svg.line(r.entry[0], r.entry[1], C.sensor, 2.4);
      svg.text(`${name} ENTRANCE`, r.path[0][0], r.path[0][1] + 13, 6.5, C.sensor);
      const m = r.path[Math.min(r.madeAt, r.path.length - 1)];
      svg.circle(m[0], m[1], 3, color, 1.2, color);
      svg.text('MADE', m[0] + 6, m[1] - 4, 5.5, color, 'start');
      const end = r.path[r.path.length - 1];
      svg.text('LANDS', end[0], end[1] - 40, 5.5, color);
      for (let i = 0; i < r.path.length; i += 8) if (r.z[i] > 4) svg.text(`z${Math.round(r.z[i])}`, r.path[i][0], r.path[i][1] + 2, 4.5, color);
    }
  }
  const d = L.SKYWAY.path[L.SKYWAY.divertAt!];
  svg.path(L.IMPOUND_LANE, C.skyway, 0.8, false, 'none', 'stroke-dasharray="2 2"');
  svg.text('LOCK DIVERT', d[0] + 8, d[1] + 14, 5.5, C.skyway, 'start');
}

function inserts(svg: Svg, labels: boolean) {
  for (const l of t.lamps as Lamp[]) {
    lampOutline(svg, l, C.insert, 0.9, labels ? 'rgba(200,30,30,0.12)' : 'none');
    if (labels) svg.text(l.id!, l.x, l.y + (l.h ?? l.w ?? 30) / 2 + 5, 3.6, C.insert);
  }
  if (!labels) return;
  for (const [i, f] of (t.flashers as any[]).entries()) {
    svg.circle(f.x, f.y - lift(f.z), f.r, C.oneWay, 0.9, 'none', 'stroke-dasharray="1.5 1.5"');
    svg.text(`FLASHER ${i + 1}`, f.x, f.y - lift(f.z) - f.r - 2, 4.5, C.oneWay);
  }
}

/** A ball drawn to scale at every place it has to fit through, with the clearance. */
const GAPS = measureGaps(t);
function gapMarks(svg: Svg) {
  for (const g of GAPS) {
    const m: P = [(g.a[0] + g.b[0]) / 2, (g.a[1] + g.b[1]) / 2];
    svg.line(g.a, g.b, C.gap, 0.9);
    svg.circle(m[0], m[1], L.BALL_R, C.gap, 0.8, 'rgba(10,127,143,0.10)');
    svg.text(`${Math.round(g.gap)}`, m[0], m[1] + 2, 5.5, C.gap);
  }
}

function legend(svg: Svg) {
  const x = 26;
  let y = 1146;
  svg.add(`<rect x="${x - 4}" y="${y - 8}" width="236" height="70" fill="#ffffff" stroke="#999" stroke-width="0.6"/>`);
  const item = (color: string, label: string, dash = '') => {
    svg.line([x, y], [x + 16, y], color, 2, dash ? `stroke-dasharray="${dash}"` : '');
    svg.text(label, x + 20, y + 2, 5.5, '#222', 'start');
    y += 8;
  };
  item(C.wall, 'floor wall: the ball collides with it');
  item(C.oneWay, 'one-way gate: the arrow shows the way through', '4 2');
  item(C.skyway, 'Skyway ramp walls and path');
  item(C.market, 'Black Market ramp and Back Alley chute');
  item(C.target, 'target face: drops, standups, SAFE, VENT, pops');
  item(C.sensor, 'switch or sensor line', '3 2');
  item(C.insert, 'insert (lamp) outline, id below it; see inserts.json');
  svg.circle(x + 8, y, 4, C.gap, 0.8, 'rgba(10,127,143,0.10)');
  svg.text('ball to scale (28 across) at each gap; number = clearance in units', x + 20, y + 2, 5.5, '#222', 'start');
}

// ------------------------------------------------------------------ the files

const defs = `<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.oneWay}"/></marker></defs>`;

function annotated() {
  const s = new Svg();
  s.add(defs);
  grid(s);
  solids(s, true);
  ramps(s, true);
  walls(s, true);
  round(s, true);
  flippers(s, true);
  sensors(s);
  inserts(s, true);
  gapMarks(s);
  legend(s);
  s.text('CYBER PSYCHOSIS · PLAYFIELD TEMPLATE · 600 × 1200 units · 1 unit = 3 px', 300, 12, 7, '#222');
  return s.doc('#ffffff');
}

/** Clean floor-level line art: a control image for the base layer. */
function lineartFloor() {
  const s = new Svg();
  solids(s, false);
  walls(s, false, true);
  round(s, false);
  for (const f of [t.flipperL, t.flipperR, ...t.extraFlippers.map((x: any) => x.f)]) flipperOutline(s, f, f.restAngle, '#000', 1.2, 'none');
  inserts(s, false);
  return s.doc('#ffffff');
}

/** Ramps and wires where the renderer draws them: lifted up the screen by half their height. */
function overlay(labels: boolean) {
  const s = new Svg();
  for (const { name, r, color } of RAMPS) {
    if (labels) s.path(rampBed(r, false), '#9a9a9a', 0.8, true, 'none', 'stroke-dasharray="3 3"');
    s.path(rampBed(r, true), labels ? color : '#000', 1.4, true, labels ? 'rgba(120,120,255,0.12)' : 'none');
    if (labels && r.walls.left.length) {
      const wf = r.path[r.wireFrom];
      s.text(`${name}: wireform from here`, wf[0] + 6, wf[1] - lift(r.z[r.wireFrom]) - 4, 5.5, color, 'start');
    }
  }
  const box = L.MARKET_BOX.map(([x, y]) => [x, y - lift(70)] as P);
  s.path(box, labels ? C.market : '#000', 1.4, true, labels ? 'rgba(138,63,209,0.15)' : 'none');
  if (labels) {
    s.text('BLACK MARKET BOX (top at z70)', 500, 372 - lift(70), 6, C.market, 'end');
    s.text('OVERLAY: ramps, wires and the market box at their drawn positions. Dashed grey = floor footprint.', 300, 12, 6, '#222');
    s.text(`Raised things are drawn ${HK} units up the screen per unit of height.`, 300, 21, 6, '#222');
  }
  return s.doc(labels ? '#ffffff' : null);
}

function insertList() {
  return (t.lamps as Lamp[]).map((l) => ({
    id: l.id,
    kind: l.kind,
    x: f1(l.x),
    y: f1(l.y),
    w: l.w ?? 30,
    h: l.h ?? l.w ?? 30,
    angleDeg: f1(((l.angle ?? 0) * 180) / Math.PI),
    label: l.label ?? null,
    px: { x: Math.round(l.x * SCALE), y: Math.round(l.y * SCALE) },
  }));
}

mkdirSync(OUT, { recursive: true });
const files: [string, string, boolean][] = [
  ['playfield-template', annotated(), false],
  ['playfield-lineart', lineartFloor(), false],
  ['overlay-template', overlay(true), false],
  ['overlay-lineart', overlay(false), true],
];
for (const [name, svg] of files) writeFileSync(`${OUT}/${name}.svg`, svg);
writeFileSync(`${OUT}/inserts.json`, JSON.stringify(insertList(), null, 1) + '\n');
writeFileSync(`${OUT}/gaps.json`, JSON.stringify(GAPS.map((g) => ({ name: g.name, gap: f1(g.gap), a: g.a.map(f1), b: g.b.map(f1) })), null, 1) + '\n');
console.log('Clearances (ball needs 28):');
for (const g of GAPS) console.log(`  ${g.name.padEnd(34)} ${g.gap.toFixed(1).padStart(6)}  ${(g.gap / 28).toFixed(2)} balls`);
console.log(`wrote ${files.length} SVGs and inserts.json (${t.lamps.length} inserts) to ${OUT}/`);

// PNGs at 3 px per unit, if a Playwright Chromium is available on this machine.
try {
  const require = createRequire(import.meta.url);
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: TABLE_W * SCALE, height: TABLE_H * SCALE } });
  for (const [name, svg, transparent] of files) {
    await page.setContent(`<html><body style="margin:0;background:${transparent ? 'transparent' : '#fff'}">${svg.replace(/^<\?xml[^>]*>\n/, '')}</body></html>`);
    await page.screenshot({ path: `${OUT}/${name}.png`, omitBackground: transparent, clip: { x: 0, y: 0, width: TABLE_W * SCALE, height: TABLE_H * SCALE } });
  }
  await browser.close();
  console.log(`rendered ${files.length} PNGs at ${TABLE_W * SCALE} x ${TABLE_H * SCALE}`);
} catch (e) {
  console.log('PNGs skipped (Playwright not available); open the SVGs in a browser instead.', (e as Error).message.split('\n')[0]);
}
