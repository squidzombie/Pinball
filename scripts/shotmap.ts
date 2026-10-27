// Which shots can each flipper make? Rolls a ball down an inlane, flips at
// varying delays and records the first feature it reaches.
import { Game } from '../src/game/game';

const g = new Game();
const m = g.main as unknown as Record<string, (...a: unknown[]) => unknown>;
(g as unknown as { startGame: () => void }).startGame();
let first = '';
const note = (k: string) => {
  if (!first) first = k;
};
for (const name of ['shot', 'hitDrop', 'hitReactor', 'enterScoop', 'hitBumper', 'hitLane']) {
  const orig = m[name].bind(g.main);
  m[name] = (...a: unknown[]) => {
    note(name === 'shot' ? String(a[0]) : name);
    return orig(...a);
  };
}
const w = g.main.world;
const step = (f: () => boolean, max = 3) => {
  for (let t = 0; t < max && !f(); t += 1 / 480) w.step(1 / 480);
};
for (const side of ['left', 'right'] as const) {
  const res: Record<string, number> = {};
  const f = side === 'left' ? g.main.flipperL : g.main.flipperR;
  for (let delay = 0; delay < 0.45; delay += 0.002) {
    g.main.world.balls = [];
    first = '';
    const x = side === 'left' ? 93 : 555 - 93;
    const b = g.main.addBall(x, 900, 0, 200);
    // cradle
    f.pressed = true;
    step(() => b.speed < 2 && b.y > 990, 4);
    // release, then flip after the delay
    f.pressed = false;
    let t = 0;
    step(() => {
      t += 1 / 480;
      if (t >= delay + 0.03) f.pressed = true;
      return !!first || b.y > 1220;
    }, 4);
    f.pressed = false;
    step(() => f.angle === f.restAngle, 1);
    const k = first || (b.y >= 1220 ? 'drain' : 'none');
    res[k] = (res[k] ?? 0) + 1;
  }
  console.log(side, res);
}
