// Which shots can each flipper make? Feeds a ball to a flipper, cradles it,
// flips at varying delays and records the first feature it reaches.
// Usage: npx tsx scripts/shotmap.ts
import { Game } from '../src/game/game';
import type { Flipper } from '../src/engine/physics';

/* eslint-disable @typescript-eslint/no-explicit-any */
const g = new Game();
const m = g.main as any;
(g as any).startGame();
m.world.zones.forEach((z: any) => (z.enabled = true));
// A shot that is made outranks the targets it brushed on the way.
let first = '';
const rank = (k: string) => ['', 'bumper', 'standup', 'drop'].indexOf(k) + 1 || 5;
const note = (k: string) => {
  if (rank(k) > rank(first)) first = k;
};
const wrap = (name: string, label?: (a: unknown[]) => string) => {
  const orig = m[name].bind(m);
  m[name] = (...a: unknown[]) => {
    note(label ? label(a) : name);
    return orig(...a);
  };
};
wrap('majorShot', (a) => String(a[0]));
wrap('hitStandup', () => 'standup');
wrap('hitDrop', () => 'drop');
wrap('hitBumper', () => 'bumper');
wrap('enterBreach', () => 'breach');
wrap('duct', () => 'duct');

const w = m.world;
const step = (f: () => boolean, max = 3) => {
  for (let t = 0; t < max && !f(); t += 1 / 480) w.step(1 / 480);
};

function map(name: string, f: Flipper, start: () => [number, number]) {
  const res: Record<string, number> = {};
  for (let delay = 0; delay < 0.9; delay += 0.004) {
    w.balls = [];
    m.drops.forEach((d: any) => {
      d.down = false;
      d.seg.enabled = true;
    });
    first = '';
    const [x, y] = start();
    const b = m.addBall(x, y, 0, 100);
    f.pressed = true;
    step(() => b.speed < 2 && m.onHeldFlipper(b), 4);
    f.pressed = false;
    let t = 0;
    step(() => {
      t += 1 / 480;
      if (t >= delay + 0.03) f.pressed = true;
      return rank(first) > 4 || b.y > 1220;
    }, 4);
    f.pressed = false;
    step(() => f.angle === f.restAngle, 1);
    const k = first || (b.y >= 1220 ? 'drain' : 'none');
    res[k] = (res[k] ?? 0) + 1;
    // breach/ lock captures hold the ball: release for the next run
    m.breachBall = null;
  }
  const sorted = Object.entries(res).sort((a, b) => b[1] - a[1]);
  console.log(name.padEnd(6), sorted.map(([k, v]) => `${k} ${v}`).join(', '));
}

map('left', m.flipperL, () => [93, 900]);
map('right', m.flipperR, () => [462, 900]);
map('top', m.topFlipper, () => [152, 150]);
map('mid', m.midFlipper, () => [225, 290]);
