// Headless soak test: a bot plays the tables and we watch for physics leaks,
// stuck balls and which shots are actually reachable.
// Usage: npm run sim [-- seconds]
import { Game } from '../src/game/game';
import type { Table } from '../src/game/tables/table';

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

function bot(t: Table) {
  for (const f of [t.flipperL, t.flipperR]) {
    const isLeft = f === t.flipperL;
    const want = t.world.balls.some((b) => {
      if (b.captured || b.y < 960 || b.y > 1110) return false;
      const dx = b.x - f.px;
      return (isLeft ? dx > -20 && dx < 100 : dx < 20 && dx > -100) && b.vy > -100;
    });
    // Random hold variation so shots spread around the table.
    if (want && !f.pressed) {
      f.pressed = true;
      if (t === g.main) g.main.onFlipperPress(isLeft ? -1 : 1);
    } else if (!want && f.pressed && Math.random() < 0.15) f.pressed = false;
  }
}

let leaks = 0;
let time = 0;
let lastBall = g.ball;
let games = 1;
let maxSpeed = 0;
while (time < SECONDS) {
  // plunge when a ball waits in the lane
  if (g.state === 'play' && g.active === g.main && g.ballInShooter()) {
    const b = g.main.world.balls.find((x) => g.main.inShooterLane(x) && x.y > 1100 && x.speed < 5);
    if (b) anyG.fire.call(g, Math.random());
  }
  if (g.state === 'attract') {
    anyG.startGame.call(g);
    games++;
  }
  bot(g.active);
  g.update(DT);
  time += DT;

  for (const b of g.active.world.balls) {
    maxSpeed = Math.max(maxSpeed, b.speed);
    if (Number.isNaN(b.x) || Number.isNaN(b.y)) {
      console.log('NaN ball!');
      process.exit(1);
    }
    const tbl = g.active === g.main ? 'main' : 'pit';
    const out = tbl === 'main' ? b.x < 19 || b.x > 581 || b.y < 15 : b.x < 41 || b.x > 559 || b.y < 170;
    // Floor-layer ball inside the ramp base block or right orbit wall interior
    const inBlock = tbl === 'main' && b.layer === 1 && b.x > 92 && b.x < 143 && b.y > 470 && b.y < 600;
    if (out || inBlock) {
      leaks++;
      if (leaks < 10) console.log(`LEAK ${tbl} at (${b.x.toFixed(1)}, ${b.y.toFixed(1)}) layer ${b.layer} v=(${b.vx.toFixed(0)},${b.vy.toFixed(0)})`);
    }
  }
  if (g.ball !== lastBall) {
    lastBall = g.ball;
  }
}

console.log(`\nSimulated ${SECONDS}s, ${games} games, max speed ${maxSpeed.toFixed(0)}, leaks ${leaks}`);
console.log(`High score: ${g.highScore.toLocaleString()}  current: ${g.score.toLocaleString()}`);
const keys = Object.keys(stats).sort((a, b) => stats[b] - stats[a]);
for (const k of keys) console.log(`  ${stats[k].toString().padStart(5)}  ${k}`);
