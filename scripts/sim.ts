// Headless soak test: a bot plays the table and we watch for physics leaks
// (balls escaping or ending up inside solid structures) and stuck balls.
// Usage: npm run sim [-- seconds]
import { Game } from '../src/game/game';
import { FLOOR } from '../src/engine/physics';
import type { Table } from '../src/game/tables/table';
import * as L from '../src/game/tables/psychosis-layout';
import type { P } from '../src/game/tables/geom';

const SECONDS = Number(process.argv[2] ?? 600);
const DT = 1 / 60;

const g = new Game();
const anyG = g as unknown as Record<string, (...a: unknown[]) => void>;
const stats: Record<string, number> = {};
const bump = (k: string) => (stats[k] = (stats[k] ?? 0) + 1);

// Count events by wrapping game methods.
const origShow = g.show.bind(g);
g.show = (l1: string, l2?: string, dur?: number, big?: boolean) => {
  bump('msg:' + l1.replace(/[0-9]+/g, '#'));
  origShow(l1, l2, dur, big);
};

anyG.startGame.call(g);

// Floor balls must never be inside these.
const inside = (p: P, poly: P[]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
/** Distance from p to the polygon's outline: a ball deep inside a solid has leaked. */
const depth = (p: P, poly: P[]) => {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j];
    const [bx, by] = poly[i];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy || 1)));
    d = Math.min(d, Math.hypot(p[0] - ax - dx * t, p[1] - ay - dy * t));
  }
  return d;
};
// the sealed outline goes round the Reactor's funnel: with the drops down a ball may run up to the captive ball
const SOLIDS: [string, P[]][] = [
  ['sealed', L.SEALED],
  ['behind skyway', L.BEHIND_SKYWAY],
  ...L.RAMPS.map((r) => [`${r.id}-foot`, [...r.walls.left.slice(0, r.baseTo + 1), ...r.walls.right.slice(0, r.baseTo + 1).reverse()]] as [string, P[]]),
];
const inSolid = (p: P) => SOLIDS.find(([, poly]) => inside(p, poly) && depth(p, poly) > 6);

const held = new Map<object, number>();
const rest = new Map<object, number>();
function bot(t: Table) {
  const all = [
    { f: t.flipperL, left: true, zone: (b: { x: number; y: number }) => b.y > 960 && b.y < 1110 && b.x - t.flipperL.px > -20 && b.x - t.flipperL.px < 100 },
    { f: t.flipperR, left: false, zone: (b: { x: number; y: number }) => b.y > 960 && b.y < 1110 && t.flipperR.px - b.x > -20 && t.flipperR.px - b.x < 100 },
  ];
  for (const { f, left, zone } of all) {
    // Like a player, cradle briefly, then drop the flipper long enough for the ball to roll into a flip.
    held.set(f, f.pressed ? (held.get(f) ?? 0) + DT : 0);
    rest.set(f, Math.max(0, (rest.get(f) ?? 0) - DT));
    if ((held.get(f) ?? 0) > 1 + Math.random()) {
      f.pressed = false;
      rest.set(f, 0.25 + Math.random() * 0.4);
      continue;
    }
    if ((rest.get(f) ?? 0) > 0) continue;
    const want = t.world.balls.some((b) => !b.captured && zone(b) && b.vy > -100);
    if (want && !f.pressed) {
      f.pressed = true;
      if (f === t.flipperL || f === t.flipperR) g.main.onFlipperPress(left ? -1 : 1);
    } else if (!want && f.pressed && Math.random() < 0.15) f.pressed = false;
  }
}

let leaks = 0;
let time = 0;
let games = 1;
let maxSpeed = 0;
let stuck = 0;
while (time < SECONDS) {
  // plunge when a ball waits in the lane
  if (g.state === 'play' && g.ballInShooter()) {
    const b = g.main.world.balls.find((x) => g.main.inShooterLane(x) && x.y > 1100 && x.speed < 5);
    if (b) anyG.fire.call(g, Math.random());
  }
  if (g.state === 'attract') {
    anyG.startGame.call(g);
    games++;
  }
  bot(g.main);
  g.update(DT);
  time += DT;

  for (const b of g.main.world.balls) {
    maxSpeed = Math.max(maxSpeed, b.speed);
    if (Number.isNaN(b.x) || Number.isNaN(b.y)) {
      console.log('NaN ball!');
      process.exit(1);
    }
    if (b.stillTime > 3.9 && !b.captured && !g.main.inShooterLane(b) && !g.main.onHeldFlipper(b)) {
      stuck++;
      if (stuck < 8) console.log(`STUCK at (${b.x.toFixed(1)}, ${b.y.toFixed(1)}) layer ${b.layer}`);
    }
    const out = b.x < 19 || b.x > 581 || b.y < 15;
    const solid = b.layer === FLOOR && !b.captured ? inSolid([b.x, b.y]) : undefined;
    if (out || solid) {
      leaks++;
      if (leaks < 10) console.log(`LEAK ${solid?.[0] ?? 'out'} at (${b.x.toFixed(1)}, ${b.y.toFixed(1)}) layer ${b.layer} v=(${b.vx.toFixed(0)},${b.vy.toFixed(0)})`);
    }
  }
}

console.log(`\nSimulated ${SECONDS}s, ${games} games, max speed ${maxSpeed.toFixed(0)}, leaks ${leaks}, stuck ${stuck}`);
console.log(`High score: ${g.highScore.toLocaleString()}  current: ${g.score.toLocaleString()}`);
const keys = Object.keys(stats).sort((a, b) => stats[b] - stats[a]);
for (const k of keys) console.log(`  ${stats[k].toString().padStart(5)}  ${k}`);
