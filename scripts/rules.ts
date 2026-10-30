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
    ['camLane', 'cam'],
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

/**
 * Launch a ball and follow it: when `arrive` says it has reached the flipper, hold that flipper
 * up as a player catching it would. Reports the shots, the lanes it rolled through, and the catch.
 */
function follow(f: any, [x, y, deg, speed]: number[], flipper: any, arrive: (b: Ball) => boolean, max = 5) {
  const made: string[] = [];
  const lanes: string[] = [];
  for (const name of ['majorShot', 'camLane'] as const) {
    const o = f[name].bind(f);
    f[name] = (...a: unknown[]) => {
      made.push(name === 'camLane' ? 'cam' : String(a[0]));
      return o(...a);
    };
  }
  const ro = f.rollover.bind(f);
  f.rollover = (i: number) => {
    lanes.push(['L-OUT', 'L-IN', 'R-IN', 'R-OUT'][i]);
    return ro(i);
  };
  f.world.balls = [];
  const r = (deg * Math.PI) / 180;
  const b: Ball = f.addBall(x, y, Math.cos(r) * speed, -Math.sin(r) * speed);
  let caught = false;
  let holding = false;
  for (let t = 0; t < max && !caught; t += 1 / 480) {
    if (!holding && b.layer === 1 && arrive(b)) holding = true;
    flipper.pressed = holding;
    f.world.step(1 / 480);
    f.substep(1 / 480);
    caught = holding && b.speed < 5 && f.onHeldFlipper(b);
    if (b.y > 1220) break;
  }
  flipper.pressed = false;
  return { made, lanes, caught };
}

/**
 * A real flip that makes `shot`: cradle the ball, drop the flipper, flip at each timing in turn
 * and keep the launches that make it. Returns the middle one as [x, y, deg, speed].
 */
function realShot(side: 'left' | 'right', shot: Shot): number[] {
  const { f } = newGame();
  const found: number[][] = [];
  const fl = side === 'left' ? f.flipperL : f.flipperR;
  const start = side === 'left' ? [93, 900] : [462, 900];
  for (let delay = 0.3; delay < 0.9; delay += 0.002) {
    f.world.balls = [];
    const b: Ball = f.addBall(start[0], start[1], 0, 100);
    fl.pressed = true;
    for (let t = 0; t < 2; t += 1 / 480) f.world.step(1 / 480);
    fl.pressed = false;
    let got: number[] | null = null;
    for (let t = 0; t < 1.5 && !got; t += 1 / 480) {
      if (t > delay + 0.03) fl.pressed = true;
      f.world.step(1 / 480);
      if (fl.pressed && b.vy < 0 && b.y < 1000 && b.speed > 1200) got = [b.x, b.y, (Math.atan2(-b.vy, b.vx) * 180) / Math.PI, b.speed];
    }
    fl.pressed = false;
    if (got && launch(f, got[0], got[1], got[2], got[3], 4).made.includes(shot)) found.push(got);
  }
  if (!found.length) throw new Error(`no ${side} flip makes the ${shot}`);
  // the middle of the window, not its weakest edge
  return found[Math.floor(found.length / 2)];
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
  check('10X is on the menu but not sold until its rule is built', !f.itemAvailable('tenx'));
  while (f.offer()?.key !== 'save') f.offerIdx++;
  f.rampMade('market', b);
  check('buying a BALL SAVE', g.ballSave >= 15);
  check('...costs $50K plus what the ramp earned', f.cash === 1_000_000 - 50_000 + 5_000, `${f.cash}`);
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
  // Every plunge from half strength up comes round the arch and drops into a CAM lane.
  let ok = 0;
  for (let i = 0; i < 6; i++) {
    const { g, f } = newGame();
    const lanes: number[] = [];
    const o = f.camLane.bind(f);
    f.camLane = (k: number) => (lanes.push(k), o(k));
    f.world.balls = [];
    f.addBall(557.5, 1165);
    for (let t = 0; t < 0.4; t += 1 / 480) f.world.step(1 / 480);
    (g as any).fire(0.5 + i * 0.1);
    for (let t = 0; t < 4 && !lanes.length; t += 1 / 480) f.world.step(1 / 480);
    if (lanes.length) ok++;
  }
  check('a plunge from 50% to 100% drops into the CAM lanes', ok === 6, `${ok}/6`);
}
{
  // A weak plunge either falls back to the plunger or, once past the shooter gate, drops into
  // the chute to the right inlane: it never sits in the corner above the gate.
  const stuck: string[] = [];
  for (let i = 0; i <= 20; i++) {
    const { g, f } = newGame();
    f.world.balls = [];
    const b: Ball = f.addBall(557.5, 1165);
    for (let t = 0; t < 0.4; t += 1 / 480) f.world.step(1 / 480);
    const pull = 0.34 + i * 0.004;
    (g as any).fire(pull);
    for (let t = 0; t < 5; t += 1 / 480) {
      f.world.step(1 / 480);
      f.substep(1 / 480);
    }
    if (b.y < 300) stuck.push(`${pull.toFixed(3)} at (${b.x.toFixed(0)},${b.y.toFixed(0)})`);
  }
  check('a weak plunge never sticks above the shooter gate', stuck.length === 0, stuck.join(', '));
}
{
  // The Back Alley: up the left orbit, over the top and into the CAM lanes...
  const shot = realShot('right', 'alley');
  const { f } = newGame();
  const r = launch(f, shot[0], shot[1], shot[2], shot[3], 4);
  check('the right flipper shoots the Back Alley into the CAM lanes', r.made.includes('alley') && r.made.includes('cam'), r.made.join());
  // ...or, with the loop held open, round the top and down the right leg to the right inlane.
  const { f: f2 } = newGame();
  f2.alleyLoopOpen = true;
  f2.update(1 / 60);
  const r2 = follow(f2, shot, f2.flipperR, (b) => b.y > 880 && b.x > 425, 15);
  // (a slow one drops into the CAM lanes on the way and comes out of the pops into the same inlane)
  check('with the loop held open it comes back to the right inlane', r2.lanes.includes('R-IN') && !r2.lanes.some((l) => l.endsWith('OUT')), `${r2.made.join()} ${r2.lanes.join()}`);
}
{
  // The back door: open, it turns the Back Alley into the upper playfield instead of the top.
  const shot = realShot('right', 'alley');
  const { f } = newGame();
  f.doorOpen = 10;
  f.update(1 / 60);
  const ups: string[] = [];
  const o = f.upperIn.bind(f);
  f.upperIn = () => (ups.push('in'), o());
  const r = launch(f, shot[0], shot[1], shot[2], shot[3], 2);
  check('with the back door open, the Back Alley goes into the upper playfield', ups.length === 1 && !r.made.includes('alley'), r.made.join());
  check('...and the door shuts behind it', f.doorOpen === 0);
}
{
  // The upper playfield: a ball nobody flips drains out the side to the right inlane.
  const { f } = newGame();
  const lanes: string[] = [];
  const o = f.rollover.bind(f);
  f.rollover = (k: number) => (lanes.push(['L-OUT', 'L-IN', 'R-IN', 'R-OUT'][k]), o(k));
  f.world.balls = [];
  f.addBall(80, L.UPPER_LANE_TOP_Y - 20, 100, -600);
  for (let t = 0; t < 8 && !lanes.length; t += 1 / 480) {
    f.world.step(1 / 480);
    f.update(1 / 480);
  }
  check('the upper playfield drains out the side to the right inlane', lanes[0] === 'R-IN', lanes.join());
}
{
  // Cameras: each lane or the bumper under it knocks one out; all three is CAMERAS DOWN, which opens the vault.
  const { g, f } = newGame();
  park(f);
  f.camLane(0);
  f.hitBumper(f.bumpers[1], f.world.balls[0]);
  check('a lane and a bumper knock out their cameras', f.cams[0] > 0 && f.cams[2] > 0 && f.cams[1] === 0);
  f.hitBumper(f.bumpers[2], f.world.balls[0]);
  check('all three out is CAMERAS DOWN, and it opens the back door', f.camerasDown > 0 && f.doorOpen > 0);
  run(g, 25);
  check('the cameras come back and the door shuts again', f.cams.every((c: number) => c === 0) && f.doorOpen === 0);
}
{
  // The vault's combination: its three tumblers in the code's (random) order crack it; a wrong one starts it over.
  const { g, f } = newGame();
  park(f);
  const [a, b, c] = f.code;
  check('the code is the three tumblers in some order', [...f.code].sort().join() === '0,1,2', f.code.join());
  f.hitTumbler(a);
  f.hitTumbler(c);
  check('a tumbler out of order starts the combination over', f.tumblersIn === 0 && !f.multiball);
  f.hitTumbler(b);
  f.hitTumbler(c);
  check("...so the last two on their own don't open the vault", f.tumblersIn === 0 && !f.multiball);
  f.hitTumbler(a);
  f.hitTumbler(a);
  check("hitting the code's first tumbler again just starts over from it", f.tumblersIn === 1);
  f.hitTumbler(b);
  f.hitTumbler(c);
  check('the whole code in order cracks the vault: VAULT MULTIBALL', f.multiball === 'vault');
  check('...and the vault picks a new code', f.code.join() !== [a, b, c].join() && [...f.code].sort().join() === '0,1,2', f.code.join());
  check('...with three balls on their way out of its hatch', g.ballsInPlay === 4, `${g.ballsInPlay}`);
  const deck = (b: Ball) => b.x > L.UPPER_LANE_X[1] && b.x < 265 && b.y < L.UPPER_FLIPPER.y;
  let seen = 0;
  for (let t = 0; t < 4; t += 1 / 60) {
    g.update(1 / 60);
    seen = Math.max(seen, f.world.balls.filter((b: Ball) => !b.captured && deck(b)).length);
  }
  check('...that drop out onto the vault deck', f.world.balls.filter((b: Ball) => !b.captured).length === 3 && seen >= 1, `${seen}`);
  check('the back door stays open in vault multiball', f.doorOpen > 0);
  const jp = f.vaultJp;
  const s0 = g.score;
  f.upperOut('top');
  check('out the vault top is the vault jackpot, and it rises', g.score - s0 >= jp && f.vaultJp > jp);
}
{
  // The balls out of the safe, with nobody flipping, drain out the side to the right inlane.
  const { f } = newGame();
  f.world.balls = [];
  const lanes: string[] = [];
  const o = f.rollover.bind(f);
  f.rollover = (k: number) => (lanes.push(['L-OUT', 'L-IN', 'R-IN', 'R-OUT'][k]), o(k));
  for (const k of [...f.code]) f.hitTumbler(k);
  for (let t = 0; t < 15 && lanes.length < 3; t += 1 / 480) {
    f.world.step(1 / 480);
    f.substep(1 / 480);
    f.update(1 / 480);
  }
  check('all three balls out of the vault come down the right inlane', lanes.length === 3 && lanes.every((l) => l === 'R-IN'), lanes.join());
  // In another multiball, cracking the vault adds one ball.
  const h = newGame();
  park(h.f);
  h.f.multiball = 'impound';
  for (const k of [...h.f.code]) h.f.hitTumbler(k);
  check('cracked during another multiball, the vault adds one ball', h.f.multiball === 'impound' && h.g.ballsInPlay === 2, `${h.g.ballsInPlay}`);
  // Every crack picks a new code, so over a few cracks the order keeps changing.
  const seen = new Set<string>();
  let repeats = 0;
  for (let k = 0; k < 12; k++) {
    const before = h.f.code.join();
    seen.add(before);
    h.f.multiball = 'impound';
    h.f.world.balls = [];
    h.f.hatchQueue = 0;
    h.f.hatchOpen = 0;
    for (const i of [...h.f.code]) h.f.hitTumbler(i);
    if (h.f.code.join() === before) repeats++;
  }
  check('the code changes after every crack, and varies', repeats === 0 && seen.size >= 3, `${seen.size} codes, ${repeats} repeats`);
}

console.log('Flash safety');
{
  // Nothing that lights or darkens the whole table flashes more than 3 times a second
  // (fast full-screen flashing can trigger seizures).
  const { g, f } = newGame();
  park(f);
  f.gi = 1;
  f.giPulse = 0.55;
  const samples: number[] = [];
  for (let t = 0; t < 10; t += 1 / 1000) {
    f.time += 1 / 1000;
    samples.push(f.light);
  }
  // a dip is the light falling through halfway between its highest and lowest
  const lo = Math.min(...samples);
  const mid = (Math.max(...samples) + lo) / 2;
  const dips = samples.filter((l, i) => i > 0 && samples[i - 1] >= mid && l < mid).length;
  check('in Rage the lights pulse slowly and shallowly, never flicker', dips / 10 <= 3 && lo > 0.8, `${(dips / 10).toFixed(1)} dips a second, down to ${lo.toFixed(2)}`);
  f.lampShow('strobe', 4);
  let toggles = 0;
  let was = f.forced(f.lamps[0], 0);
  for (let t = 0; t < 4; t += 1 / 1000) {
    f.show.t += 1 / 1000;
    const on = f.forced(f.lamps[0], 0);
    if (on !== was) toggles++;
    was = on;
  }
  check('the all-lamps strobe show stays under 3 flashes a second', toggles / 2 / 4 <= 3, `${(toggles / 8).toFixed(1)} a second`);
  g.doFlash('#ffffff', 0.5);
  g.flash.a = 0;
  g.doFlash('#ffffff', 0.5);
  const again = g.flash.a;
  run(g, 0.5);
  g.doFlash('#ffffff', 0.5);
  check('whole-screen flashes come at most one every 0.4 s', again === 0 && g.flash.a > 0);
}
{
  // Wire returns: each drops into its inlane (never the outlane) and a held flipper catches it.
  const cases: [string, 'left' | 'right', Shot, 'L' | 'R', string][] = [
    ['Skyway', 'left', 'skyway', 'L', 'L-IN'],
    ['Black Market (left flipper)', 'left', 'market', 'R', 'R-IN'],
    ['Black Market (right flipper)', 'right', 'market', 'R', 'R-IN'],
  ];
  for (const [name, side, s, lane, rollover] of cases) {
    const shot = realShot(side, s);
    const { f } = newGame();
    const fl = lane === 'L' ? f.flipperL : f.flipperR;
    const r = follow(f, shot, fl, (b) => b.y > 880 && (lane === 'L' ? b.x < 130 : b.x > 425));
    check(`the ${name} returns down the ${lane === 'L' ? 'left' : 'right'} inlane`, r.made.includes(s) && r.lanes.includes(rollover) && !r.lanes.some((l) => l.endsWith('OUT')), `${r.made.join()} ${r.lanes.join()}`);
    check(`...where a held flipper catches it`, r.caught);
  }
}
{
  // The pops: a ball dropped through each CAM lane leaves by the exit lane into the right inlane.
  const ends: string[] = [];
  for (let i = 0; i < 3; i++) {
    const { f } = newGame();
    const lanes: string[] = [];
    const o = f.rollover.bind(f);
    f.rollover = (k: number) => (lanes.push(['L-OUT', 'L-IN', 'R-IN', 'R-OUT'][k]), o(k));
    f.world.balls = [];
    const [x0, x1] = L.CAM_LANES[i];
    f.addBall((x0 + x1) / 2, 70, 0, 200);
    for (let t = 0; t < 15 && !lanes.length; t += 1 / 480) {
      f.world.step(1 / 480);
      f.update(1 / 480);
    }
    ends.push(lanes[0] ?? 'stuck');
  }
  check('the pops send every ball out to the right inlane', ends.every((e) => e === 'R-IN'), ends.join());
}
{
  // An Impound release rolls back down the Skyway's wire to the left inlane.
  const { g, f } = newGame();
  f.world.balls = [];
  const b: Ball = f.addBall(0, 0);
  f.removeBall(b);
  f.locked = [b];
  f.releaseQueue = 1;
  const lanes: string[] = [];
  const o = f.rollover.bind(f);
  f.rollover = (k: number) => (lanes.push(['L-OUT', 'L-IN', 'R-IN', 'R-OUT'][k]), o(k));
  for (let t = 0; t < 4 && !lanes.length; t += 1 / 60) g.update(1 / 60);
  check('an Impound release comes down the Skyway wire to the left inlane', lanes[0] === 'L-IN', lanes.join());
}
{
  // Guards: a ball rolling down either side wall is turned away from the outlane.
  for (const [x, side] of [
    [34, 'L-OUT'],
    [522, 'R-OUT'],
  ] as const) {
    const { f } = newGame();
    const lanes: string[] = [];
    const o = f.rollover.bind(f);
    f.rollover = (i: number) => {
      lanes.push(['L-OUT', 'L-IN', 'R-IN', 'R-OUT'][i]);
      return o(i);
    };
    f.world.balls = [];
    f.addBall(x, 680, 0, 300);
    for (let t = 0; t < 1.5; t += 1 / 480) f.world.step(1 / 480);
    check(`the ${side === 'L-OUT' ? 'left' : 'right'} guard keeps a wall-hugging ball out of the outlane`, !lanes.includes(side), lanes.join());
  }
}
{
  // SAFE and VENT: a switch with Black Market cash.
  const { g, f } = newGame();
  park(f);
  const s0 = g.score;
  const c0 = f.cash;
  f.hitFlank(0);
  f.hitFlank(1);
  check('SAFE and VENT pay 25K and $10K each', g.score - s0 === 50_000 && f.cash - c0 >= 20_000, `${g.score - s0} $${f.cash - c0}`);
}
{
  // The Back Alley diverter: closed unless the loop is held open.
  const { f } = newGame();
  f.update(1 / 60);
  check('the Back Alley diverter is closed by default', f.diverter.enabled);
  f.alleyLoopOpen = true;
  f.update(1 / 60);
  check('...and drops out of the way when the loop is held open', !f.diverter.enabled);
}

console.log('Flippers');
{
  // A cradled ball must roll down the bat when the flipper drops (it once wedged against the pivot).
  const { f } = newGame();
  f.world.zones = [];
  for (const [name, fl, x0, y0] of [
    ['left', f.flipperL, 120, 990],
    ['right', f.flipperR, 435, 990],
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
