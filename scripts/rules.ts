// Rule tests: drive Cyber Psychosis's switches directly and check the heist.
// Usage: npm test
import { Game } from '../src/game/game';
import { RAMP, type Ball } from '../src/engine/physics';
import { SHOTS, type Shot } from '../src/game/modes';
import * as L from '../src/game/tables/psychosis-layout';

/* eslint-disable @typescript-eslint/no-explicit-any */
let failures = 0;
let passes = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) passes++;
  else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? `  (${detail})` : ''}`);
  }
}

function newGame() {
  const g = new Game();
  (g as any).startGame();
  const f = g.main as any;
  return { g, f };
}

function run(g: Game, seconds: number) {
  for (let t = 0; t < seconds; t += 1 / 60) g.update(1 / 60);
}

/** Park the ball mid-table, frozen, so the mode clock runs but nothing drains. */
function park(f: any): Ball {
  let b: Ball = f.world.balls.find((x: Ball) => x !== f.breachBall);
  if (!b) b = f.addBall(280, 760);
  b.x = 280;
  b.y = 760;
  b.vx = b.vy = 0;
  b.captured = true;
  return b;
}

/** Put the (parked) ball into the Breach as if it had just been shot there. */
function shootBreach(f: any): Ball {
  const b: Ball = f.world.balls[0] ?? f.addBall(196, 520);
  b.captured = false;
  b.vx = b.vy = 0;
  b.tags.scoopIgnore = 0;
  f.enterBreach(b);
  return b;
}

/** Let the Breach kick the ball out, then park it before it can drain. */
function waitEject(g: Game, f: any) {
  for (let t = 0; t < 10 && f.breachBall; t += 1 / 60) g.update(1 / 60);
  park(f);
}

/** Shoot the Breach and let it resolve (selection, intro and eject). */
function breach(g: Game, f: any, choose?: (f: any) => void) {
  shootBreach(f);
  choose?.(f);
  waitEject(g, f);
}

const PREREQ: Record<string, string[]> = {
  infiltrate: [],
  hack: ['infiltrate'],
  route: ['infiltrate'],
  payload: ['infiltrate', 'hack'],
  extract: ['infiltrate', 'route'],
};

/** A new game with the heist map open far enough, then start mode `key` at the Breach. */
function startMode(key: string) {
  const { g, f } = newGame();
  for (const k of PREREQ[key]) f.played.add(k);
  f.modesLit = 1;
  park(f);
  breach(g, f, (ff) => {
    for (let i = 0; i < 5 && ff.selecting > 0 && ff.available()[ff.selected].key !== key; i++) ff.onFlipperPress(1);
  });
  return { g, f };
}

/** Put a ball on the Skyway just short of its top bend, where a lit lock diverts it. */
function skywayToBend(f: any, b: Ball) {
  const i = L.SKYWAY.divertAt!;
  [b.x, b.y] = L.SKYWAY.path[i];
  b.captured = false;
  b.layer = RAMP;
  b.tags = { ramp: 1, ri: i - 1, made: 1 };
  f.rampForce(b, 1 / 480);
}

/** Launch a ball and step the physics; returns the shots and switches it made, in order. */
function launch(f: any, x: number, y: number, deg: number, speed: number, seconds: number, watch?: (b: Ball) => void) {
  const made: string[] = [];
  for (const [name, label] of [
    ['majorShot', ''],
    ['duct', 'duct'],
    ['hitBumper', 'bumper'],
  ] as const) {
    const o = f[name].bind(f);
    f[name] = (...a: unknown[]) => {
      made.push(label || String(a[0]));
      return o(...a);
    };
  }
  f.world.balls = [];
  const r = (deg * Math.PI) / 180;
  const b: Ball = f.addBall(x, y, Math.cos(r) * speed, -Math.sin(r) * speed);
  for (let t = 0; t < seconds; t += 1 / 480) {
    f.world.step(1 / 480);
    f.substep(1 / 480);
    watch?.(b);
  }
  return { made, b };
}

const lit = (f: any, s: Shot) => f.mode?.lit(s) ?? 0;
const litShots = (f: any) => SHOTS.filter((s) => lit(f, s));

console.log('The Breach starts the heist');
{
  const { g, f } = newGame();
  check('first mode comes lit', f.modesLit === 1);
  check('Breach arrow flashes', f.shotLamp('breach') === 2);
  check('only INFILTRATE is open', f.available().map((m: any) => m.key).join() === 'infiltrate');
  park(f);
  const b = shootBreach(f);
  check('one choice: no selection, straight in', f.selecting <= 0 && f.mode?.name === 'INFILTRATE', f.mode?.name);
  check('mode consumes the lit start', f.modesLit === 0);
  check('ball held for the intro', f.breachBall === b);
  const t0 = f.mode.timer;
  run(g, 1);
  check('clock frozen during the intro hold', f.mode.timer === t0);
  for (let t = 0; t < 3 && f.breachBall; t += 1 / 60) g.update(1 / 60);
  check('ball kicked out after the intro', f.breachBall === null);
  park(f);
  run(g, 1);
  check('clock waits for the ball to reach the playfield', f.mode.timer === t0);
  run(g, 1.5);
  check('...but no more than 2 s', f.mode.timer < t0);
  const t1 = f.mode.timer;
  run(g, 11);
  check('pinball seconds run slow (11 real s ≈ 10 on the clock)', t1 - f.mode.timer < 10.5 && t1 - f.mode.timer > 9.5, `${(t1 - f.mode.timer).toFixed(2)}`);
  run(g, 60);
  check('mode ends when the clock runs out', f.mode === null);
  check('played but not completed', f.played.has('infiltrate') && !f.completed.has('infiltrate'));
  check('HACK and ROUTE open up', f.available().map((m: any) => m.key).join() === 'hack,route');
}

console.log('B-R-E-A-C-H standups');
{
  const { g, f } = newGame();
  f.modesLit = 0;
  f.hitStandup(0);
  f.hitStandup(1);
  check('two letters lit', f.letters.filter(Boolean).length === 2);
  const s0 = g.score;
  f.hitStandup(1);
  check('a lit letter pays only 5K', g.score - s0 === 5_000, `${g.score - s0}`);
  for (let i = 2; i < 6; i++) f.hitStandup(i);
  check('B-R-E-A-C-H lights a mode', f.modesLit === 1);
  check('letters reset', f.letters.every((x: boolean) => !x));
}

console.log('Mode selection');
{
  const { g, f } = newGame();
  f.played.add('infiltrate');
  f.modesLit = 1;
  park(f);
  const b = shootBreach(f);
  check('two choices open the selection', f.selecting > 0 && f.available().length === 2);
  check('ball held while choosing', f.breachBall === b);
  f.onFlipperPress(1);
  check('right flipper moves the selection', f.selected === 1);
  f.onFlipperPress(1);
  check('...and wraps', f.selected === 0);
  f.onFlipperPress(-1);
  run(g, 4.2);
  check('selection times out into the chosen mode', f.mode?.name === 'ROUTE', f.mode?.name);
  check('tier 2 stays shut until a tier 1 mode is played', !f.available().some((m: any) => m.tier === 2));
}

console.log('INFILTRATE');
{
  const { g, f } = startMode('infiltrate');
  const m = f.mode;
  check('four sneak shots lit, Breach dark', litShots(f).length === 4 && !lit(f, 'breach'), litShots(f).join());
  check('the camera watches one of them (strobing)', !!m.watched && lit(f, m.watched) === 4);
  const t0 = m.timer;
  const a0 = m.total;
  f.event(m.watched);
  check('making the watched shot gets you SPOTTED: -5 s, no award', m.timer < t0 - 4.9 && m.total === a0, `${t0.toFixed(1)} -> ${m.timer.toFixed(1)}`);
  let first = true;
  while (litShots(f).length && litShots(f).some((s) => s !== 'breach')) {
    const s = litShots(f).find((x) => lit(f, x) === 2);
    if (!s) break;
    const before = m.total;
    f.event(s);
    if (first) check('sneaking past pays 400K after being spotted once', m.total - before === 400_000, `${m.total - before}`);
    first = false;
  }
  check('all four lights the Breach', lit(f, 'breach') === 3 && litShots(f).length === 1);
  run(g, 1);
  const secs = Math.ceil(m.timer);
  const before = m.total;
  shootBreach(f);
  check('the Breach completes it: 3M + 100K a second left', m.total - before === 3_000_000 + secs * 100_000, `${m.total - before} with ${secs}s`);
  waitEject(g, f);
  check('completed', f.mode === null && f.completed.has('infiltrate'));
}

console.log('HACK');
{
  const { g, f } = startMode('hack');
  const m = f.mode;
  check('started', m?.name === 'HACK', m?.name);
  const key = () => m.code[m.pos];
  check('exactly one key flashing', [0, 1, 2, 3, 4, 5].filter((i) => m.litStandup(i)).length === 1);
  const wrong = [0, 1, 2, 3, 4, 5].find((i) => i !== key())!;
  const a0 = m.total;
  f.hitStandup(wrong);
  check('a wrong key does nothing', m.total === a0);
  for (let i = 0; i < 4; i++) f.hitStandup(key());
  check('four keys crack the first code (4x250K + 1.5M)', m.total - a0 === 2_500_000, `${m.total - a0}`);
  const a1 = m.total;
  shootBreach(f);
  check('the Breach brute-forces a whole code (3M)', m.total - a1 === 3_000_000, `${m.total - a1}`);
  waitEject(g, f);
  for (let i = 0; i < 4; i++) f.hitStandup(key());
  run(g, 0.1);
  check('third code completes it', f.mode === null && f.completed.has('hack'));
}

console.log('ROUTE');
{
  const { g, f } = startMode('route');
  const m = f.mode;
  check('started', m?.name === 'ROUTE', m?.name);
  check('only the Skyway lit first', litShots(f).join() === 'skyway');
  const a0 = m.total;
  f.event('market');
  check('out-of-order shots do nothing', m.total === a0);
  const order: Shot[] = ['skyway', 'alley', 'market', 'reactor'];
  for (const s of order) f.event(s);
  check('one lap pays 0.6+1.2+1.8+2.4M + 2.5M', m.total - a0 === 8_500_000, `${m.total - a0}`);
  for (const s of order) f.event(s);
  run(g, 0.1);
  check('second lap completes it', f.mode === null && f.completed.has('route'));
}

console.log('PAYLOAD (multiball)');
{
  const { g, f } = startMode('payload');
  const m = f.mode;
  check('started', m?.name === 'PAYLOAD', m?.name);
  check('it is a multiball with no clock', f.multiball === 'payload' && !m.timed);
  check('a second ball joins', f.world.balls.length + (g as any).launchQueue >= 2, `balls ${f.world.balls.length}`);
  check('both ramps lit', lit(f, 'skyway') === 3 && lit(f, 'market') === 3);
  const a0 = m.total;
  f.event('skyway');
  f.event('market');
  f.event('skyway');
  check('ramp jackpots climb (1.5M+1.75M+2M)', m.total - a0 === 5_250_000, `${m.total - a0}`);
  run(g, 0.1);
  check('super lit at the Reactor, drops come down for it', lit(f, 'reactor') === 4 && f.dropsDown());
  const a1 = m.total;
  f.event('reactor');
  check('super pays 3x the jackpot', m.total - a1 === 6_750_000, `${m.total - a1}`);
  f.endMultiball();
  check('mode ends with the multiball', f.mode === null && f.played.has('payload') && f.completed.has('payload'));
  check('finishing a tier 2 mode lights BLACKOUT', f.blackoutLit);
}

console.log('EXTRACT');
{
  const { g, f } = startMode('extract');
  const m = f.mode;
  check('started', m?.name === 'EXTRACT', m?.name);
  check('first leg is the Skyway', litShots(f).join() === 'skyway');
  f.sw('sling');
  const v0 = m.value;
  run(g, 5);
  check('the payout bleeds away while you run', m.value < v0 && m.value > v0 - 1_200_000, `${v0} -> ${m.value}`);
  const a0 = m.total;
  const v = m.value;
  f.event('skyway');
  check('a leg pays its current value', m.total - a0 === v, `${m.total - a0} vs ${v}`);
  check('next leg: the Black Market, worth more', litShots(f).join() === 'market' && m.value > v);
  f.event('market');
  shootBreach(f);
  waitEject(g, f);
  check('three legs complete it', f.mode === null && f.completed.has('extract'));
  check('BLACKOUT lit', f.blackoutLit && f.shotLamp('reactor') === 3);
}

console.log('BLACKOUT (wizard)');
{
  const { g, f } = newGame();
  park(f).captured = false; // the ball that just hit the Reactor
  f.blackoutLit = true;
  f.played.add('infiltrate');
  f.completed.add('infiltrate');
  f.reactorHit();
  check('the Reactor starts BLACKOUT', f.wizard?.name === 'BLACKOUT');
  check('3-ball multiball', f.multiball === 'blackout' && (g as any).launchQueue === 2, `queue ${(g as any).launchQueue}`);
  run(g, 1);
  check('the lights go out', f.giTarget < 0.2 && f.gi < 0.3, `gi ${f.gi.toFixed(2)}`);
  const w = f.wizard;
  const a0 = w.total;
  f.event('skyway');
  check('every shot is a jackpot (2M at 1.5x for one completed mode)', w.total - a0 === 3_000_000, `${w.total - a0}`);
  for (const s of ['alley', 'breach', 'market'] as Shot[]) f.event(s);
  run(g, 0.1);
  check('all four light the super at the Reactor', w.lit('reactor') === 4 && f.dropsDown());
  f.endMultiball();
  check('BLACKOUT ends with the multiball', f.wizard === null);
  check('the heist starts over a level up', f.played.size === 0 && f.level === 1 && f.modesLit >= 1);
  check('values scale up', f.modeMult === 1.5);
}
{
  const { f } = newGame();
  park(f).captured = false;
  for (const k of ['infiltrate', 'hack', 'route', 'payload', 'extract']) {
    f.played.add(k);
    f.completed.add(k);
  }
  f.blackoutLit = true;
  f.reactorHit();
  check('a perfect heist makes it TOTAL BLACKOUT: 4 balls', f.wizard && (f.game as any).launchQueue === 3, `queue ${(f.game as any).launchQueue}`);
}

console.log('Reactor, lock and Impound multiball');
{
  const { g, f } = newGame();
  const b = park(f);
  b.captured = false;
  f.world.gravity = 0;
  for (let i = 0; i < 3; i++) f.hitDrop(i, 100);
  check('drops down light the lock', f.lockLit && f.dropsDown());
  skywayToBend(f, b);
  check('the Skyway feeds the lit lock', f.locking?.b === b && !f.lockLit);
  run(g, 1.6);
  check('ball rolls into the Impound', f.locked.length === 1 && !f.world.balls.includes(b));
  check('a new ball is served to the plunger', g.ballInShooter());
  check('drops reset for the next lock', !f.dropsDown());
  for (let n = 0; n < 2; n++) {
    const nb = park(f);
    nb.captured = false;
    for (let i = 0; i < 3; i++) f.hitDrop(i, 100);
    skywayToBend(f, nb);
    run(g, 1.6);
  }
  check('third lock starts Impound multiball', f.multiball === 'impound', `${f.multiball} locked ${f.locked.length}`);
  run(g, 3);
  check('the Impound lets all three balls out', f.locked.length === 0 && f.world.balls.length >= 3, `balls ${f.world.balls.length}`);
  const s0 = g.score;
  f.majorShot('skyway', 0);
  check('jackpot at the Skyway (1M)', g.score - s0 === 1_000_000, `${g.score - s0}`);
  for (const s of ['market', 'alley', 'breach'] as Shot[]) f.majorShot(s, 0);
  run(g, 0.1);
  check('four jackpots light the super at the Reactor', f.impoundSuper && f.dropsDown() && f.shotLamp('reactor') === 3);
  const s1 = g.score;
  f.reactorHit();
  check('super pays 3x the jackpot', g.score - s1 >= 6_000_000, `${g.score - s1}`);
  f.world.gravity = 2000;
}

console.log('Black Market');
{
  const { g, f } = newGame();
  const b = park(f);
  f.sw('bumper');
  f.sw('sling');
  check('switches pay cash', f.cash === 3_000, `${f.cash}`);
  const o0 = f.offer()?.key;
  run(g, 4.1);
  check('the offer rotates', f.offer()?.key !== o0);
  check('more time is only on offer during a timed mode', f.itemAvailable('time') === false);
  f.cash = 10_000;
  const it = f.offer();
  f.rampMade('market', b);
  check('too poor: nothing bought', f.cash > 0 && f.offer()?.key === it.key);
  f.cash = 1_000_000;
  while (f.offer()?.key !== 'bonus') f.offerIdx++;
  const m0 = g.bonusMult;
  f.rampMade('market', b);
  check('buying BONUS +1X', g.bonusMult === m0 + 1);
  check('...costs $60K plus what the ramp earned', f.cash === 1_000_000 - 60_000 + 5_000, `${f.cash}`);
  while (f.offer()?.key !== 'xball') f.offerIdx++;
  f.rampMade('market', b);
  check('extra ball bought once', g.extraBalls === 1 && !f.itemAvailable('xball'));
}

console.log('Skill shot');
{
  const { g, f } = newGame();
  check('armed at ball start', f.skillArmed);
  (g as any).fire(0.8);
  check('plunging lights the Black Market', f.skillT > 6 && f.shotLamp('market') === 4);
  const s0 = g.score;
  f.rampMade('market', f.world.balls[0]);
  check('making it pays 500K (and $50K the Black Market can spend at once)', g.score - s0 >= 600_000, `${g.score - s0}`);
  check('one shot only', f.skillT <= 0);
}

console.log('RAGE');
{
  const { g, f } = newGame();
  park(f);
  for (let i = 0; i < 4; i++) f.rollover(i);
  check('R-A-G-E starts RAGE', f.rage?.name === 'RAGE');
  check('...and bumps the bonus multiplier', g.bonusMult === 2);
  const s0 = g.score;
  f.sw('sling');
  check('every switch pays 100K', g.score - s0 === 100_000, `${g.score - s0}`);
  for (let i = 0; i < 4; i++) f.rollover(i);
  check('relighting extends it', f.rage.timer > 25);
  run(g, 45);
  check('RAGE times out', f.rage === null);
  f.rageLit = [true, false, false, false];
  f.onFlipperPress(1);
  check('lane change rotates the letters', f.rageLit[1] && !f.rageLit[0]);
}

console.log('Clock rules');
{
  const { g, f } = startMode('route');
  const m = f.mode;
  f.sw('sling'); // any playfield switch validates
  const t0 = m.timer;
  run(g, 0.5);
  check('a playfield switch starts the clock at once', m.timer < t0);
  // Cradle: a free, motionless ball on a held flipper keeps the clock running and isn't ball-searched.
  const b: Ball = f.world.balls[0];
  f.flipperL.pressed = true;
  for (let t = 0; t < 0.2; t += 1 / 60) g.update(1 / 60);
  const lf = f.flipperL;
  b.x = lf.px + Math.cos(lf.angle) * 30;
  b.y = lf.py + Math.sin(lf.angle) * 30 - 22;
  b.vx = b.vy = 0;
  b.captured = false;
  const tc = m.timer;
  run(g, 6);
  check('cradling does not stop the clock', m.timer < tc - 4, `${tc.toFixed(1)} -> ${m.timer.toFixed(1)}`);
  check('a cradled ball is not ball-searched', f.onHeldFlipper(b) && b.vy > -600, `vy ${b.vy.toFixed(0)}`);
  f.flipperL.pressed = false;
  park(f);
  // A stuck ball (not cradled) stops the clock.
  b.captured = false;
  f.world.gravity = 0;
  b.x = 300;
  b.y = 640;
  b.vx = b.vy = 0;
  run(g, 2);
  const ts = m.timer;
  run(g, 1.5);
  check('a stuck ball stops the clock', m.timer === ts);
  f.world.gravity = 2000;
  park(f);
  // Grace and refresh.
  m.timer = 0.5;
  run(g, 1);
  check('clock reaches zero but the mode is still running (grace)', f.mode?.inGrace === true);
  f.event(litShots(f)[0]);
  check('a lit shot in grace counts and tops the clock up to 10', f.mode && !m.inGrace && m.timer >= 9.9, `${m.timer}`);
  m.timer = 0.2;
  run(g, 3);
  check('grace runs out after ~2 s', f.mode === null);
}
{
  const { g, f } = startMode('route');
  f.sw('sling');
  run(g, 1);
  const before = f.mode.timer;
  for (let i = 0; i < 6; i++) f.hitStandup(i);
  check('B-R-E-A-C-H during a mode adds 10 s', f.mode.timer > before + 9.9, `${before.toFixed(1)} -> ${f.mode.timer.toFixed(1)}`);
  check('...and banks the next mode', f.modesLit === 1);
}

console.log('Priorities');
{
  const { g, f } = startMode('hack');
  f.modesLit = 1;
  shootBreach(f);
  check('no second mode while one runs', f.mode?.name === 'HACK' && f.selecting <= 0);
  waitEject(g, f);
  (g as any).endBall();
  check('draining ends the mode quietly', f.mode === null && f.played.has('hack'));
}

console.log('Ball count');
{
  const { g, f } = newGame();
  park(f).captured = false;
  f.locked = [f.addBall(46, 108), f.addBall(70, 82)];
  for (const b of f.locked) f.removeBall(b);
  f.addBalls(3);
  check('a multiball takes locked balls first', f.releaseQueue === 2 && (g as any).launchQueue === 0, `release ${f.releaseQueue} launch ${(g as any).launchQueue}`);
  check('balls waiting in the Impound count as in play', g.ballsInPlay === 3, `${g.ballsInPlay}`);
}

console.log('Ball flow');
{
  // A plunge rides the Back Alley round the top and drops onto the top flipper.
  const { g, f } = newGame();
  f.world.balls = [];
  const b: Ball = f.addBall(557.5, 1165);
  (g as any).fire(0.8);
  let near = Infinity;
  for (let t = 0; t < 2; t += 1 / 480) {
    f.world.step(1 / 480);
    const tf = f.topFlipper;
    near = Math.min(near, Math.hypot(b.x - (tf.px + tf.tipX) / 2, b.y - (tf.py + tf.tipY) / 2));
  }
  check('a plunge comes round the Back Alley onto the top flipper', near < 30, `closest ${near.toFixed(0)}`);
}
{
  // Right flipper up the duct: the ball comes back down onto the Black Market flipper's guide.
  const { f } = newGame();
  let top = Infinity;
  const { made, b } = launch(f, 241, 972, 123, 2600, 1.6, (ball) => (top = Math.min(top, ball.y)));
  check('the right flipper makes the duct', made.includes('duct'), made.join());
  check('...which climbs to the upper flippers', top < 260, `top ${top.toFixed(0)}`);
  check('...and drops back down to the Black Market flipper', b.y > 260 && b.y < 345 && b.x < 270, `at (${b.x.toFixed(0)},${b.y.toFixed(0)})`);
}
{
  const { f } = newGame();
  check('the top flipper shoots the Back Alley', launch(f, 225, 166, 57, 2030, 1.2).made.includes('alley'));
}
{
  const { f } = newGame();
  check('the middle flipper shoots the Black Market', launch(f, 284, 284, 64, 1900, 1.2).made.includes('market'));
}
{
  const { f } = newGame();
  check('the left flipper shoots the Skyway', launch(f, 320, 972, 56, 2950, 1.6).made.includes('skyway'));
}

console.log('Flippers');
{
  // A cradled ball must roll down the bat when the flipper drops (it once wedged against the pivot).
  const { f } = newGame();
  f.world.zones = [];
  for (const [name, fl, x0, y0] of [
    ['left', f.flipperL, 120, 990],
    ['right', f.flipperR, 435, 990],
    ['top', f.topFlipper, 152, 150],
    ['Black Market', f.midFlipper, 232, 300],
  ] as const) {
    f.world.balls = [];
    const b: Ball = f.addBall(x0, y0);
    fl.pressed = true;
    for (let t = 0; t < 3; t += 1 / 480) f.world.step(1 / 480);
    check(`${name}: ball settles into the cradle`, b.speed < 5 && f.onHeldFlipper(b), `speed ${b.speed.toFixed(1)} at (${b.x.toFixed(0)},${b.y.toFixed(0)})`);
    const [cx, cy] = [b.x, b.y];
    fl.pressed = false;
    for (let t = 0; t < 1; t += 1 / 480) f.world.step(1 / 480);
    check(`${name}: dropping the flipper rolls it off the bat`, Math.hypot(b.x - cx, b.y - cy) > 30, `moved ${Math.hypot(b.x - cx, b.y - cy).toFixed(1)}`);
  }
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
