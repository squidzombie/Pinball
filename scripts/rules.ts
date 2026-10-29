// Rule tests: drive the Foundry's switches directly and check the mode system.
// Usage: npm test
import { Game } from '../src/game/game';
import type { Ball } from '../src/engine/physics';

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
  let b: Ball = f.world.balls[0];
  if (!b) b = f.addBall(280, 760);
  b.x = 280;
  b.y = 760;
  b.vx = b.vy = 0;
  b.captured = true;
  return b;
}

/** Put the (parked) ball into the scoop as if it had just been shot there. */
function shootScoop(f: any): Ball {
  const b: Ball = f.world.balls[0] ?? f.addBall(405, 425);
  b.captured = false;
  b.tags.scoopIgnore = 0;
  f.enterScoop(b);
  return b;
}

/** Shoot the scoop and let it resolve (selection, intro and eject). */
function scoop(g: Game, f: any, choose?: (f: any) => void) {
  shootScoop(f);
  choose?.(f);
  for (let t = 0; t < 10 && f.scoopBall; t += 1 / 60) g.update(1 / 60);
  park(f);
}

const JOB_NAMES = ['SHAKEDOWN', 'HOT METAL', 'BLOOD MONEY', 'BLACKOUT', 'SABOTAGE'];

function startJob(name: string) {
  const { g, f } = newGame();
  park(f);
  scoop(g, f, (ff) => {
    for (let i = 0; i < 5 && JOB_NAMES[ff.selected] !== name; i++) ff.onFlipperPress(1);
  });
  return { g, f };
}


console.log('Mode start & selection');
{
  const { g, f } = newGame();
  check('first job comes lit', f.jobsLit === 1);
  park(f);
  const b = shootScoop(f);
  check('scoop opens job selection', f.selecting > 0);
  check('ball held while selecting', f.scoopBall === b);
  f.onFlipperPress(1);
  check('right flipper moves selection', f.selected === 1, `selected ${f.selected}`);
  f.onFlipperPress(-1);
  f.onFlipperPress(-1);
  check('left flipper wraps', f.selected === 4, `selected ${f.selected}`);
  run(g, 4.2);
  check('selection times out into the job', f.job?.name === 'SABOTAGE', f.job?.name);
  check('job consumes the lit start', f.jobsLit === 0);
  const t0 = f.job.timer;
  run(g, 1);
  check('clock frozen during the intro hold', f.job.timer === t0);
  for (let t = 0; t < 3 && f.scoopBall; t += 1 / 60) g.update(1 / 60);
  check('ball kicked out after intro', f.scoopBall === null);
  park(f);
  run(g, 1);
  check('clock runs once the ball is in play', f.job.timer < t0);
  run(g, 45);
  check('job ends when the clock runs out', f.job === null);
  check('played job is marked', f.played.has(4));
}

console.log('H-I-T targets');
{
  const { f } = newGame();
  f.jobsLit = 0;
  f.hitStandup(0);
  f.hitStandup(1);
  check('two letters lit', f.hitLit.filter(Boolean).length === 2);
  f.hitStandup(2);
  check('H-I-T lights a job', f.jobsLit === 1);
  check('letters reset', f.hitLit.every((x: boolean) => !x));
}

console.log('SHAKEDOWN');
{
  const { g, f } = startJob('SHAKEDOWN');
  check('started', f.job?.name === 'SHAKEDOWN', f.job?.name);
  const lit = () => ['leftOrbit', 'ramp', 'hit', 'reactor', 'drops', 'rightOrbit'].find((s) => f.job.lit(s));
  check('exactly one shot lit', ['leftOrbit', 'ramp', 'hit', 'reactor', 'drops', 'rightOrbit'].filter((s) => f.job.lit(s)).length === 1);
  const before = g.score;
  f.event(lit());
  check('lit shot pays 600K', g.score - before === 600_000, `${g.score - before}`);
  const s1 = g.score;
  f.event(lit());
  check('second pays 900K', g.score - s1 === 900_000, `${g.score - s1}`);
  const unlit = ['leftOrbit', 'ramp', 'hit', 'reactor', 'drops', 'rightOrbit'].find((s) => !f.job.lit(s))!;
  const s2 = f.job.total;
  f.event(unlit);
  check('unlit shot pays nothing to the mode', f.job.total === s2);
  const firstAt = lit();
  run(g, 4.1);
  check('lit shot moves on its own', lit() !== firstAt);
  for (let i = 0; i < 3; i++) f.event(lit());
  run(g, 0.1);
  check('five collections complete it', f.job === null && f.played.has(0));
}

console.log('HOT METAL');
{
  const { g, f } = startJob('HOT METAL');
  check('started', f.job?.name === 'HOT METAL', f.job?.name);
  check('ramp + right orbit lit', f.job.lit('ramp') && f.job.lit('rightOrbit') && !f.job.lit('scoop'));
  run(g, 5);
  const v = f.job.value;
  check('hurry-up cools', v < 5_000_000 && v >= 3_900_000, `${v}`);
  const s0 = g.score;
  f.event('ramp');
  check('collect pays the hurry-up value', g.score - s0 === v, `${g.score - s0} vs ${v}`);
  check('scoop lit to pour', f.job.lit('scoop') && !f.job.lit('ramp'));
  const s1 = g.score;
  shootScoop(f);
  check('pour pays double', g.score - s1 >= v * 2, `${g.score - s1}`);
  run(g, 0.1);
  check('completed', f.job === null && f.played.has(1));
}

console.log('BLOOD MONEY');
{
  const { g, f } = startJob('BLOOD MONEY');
  check('started', f.job?.name === 'BLOOD MONEY', f.job?.name);
  const shots = ['leftOrbit', 'ramp', 'hit', 'reactor', 'drops', 'rightOrbit'];
  check('all six lit', shots.every((s) => f.job.lit(s)));
  const s0 = g.score;
  f.event('ramp');
  f.event('ramp');
  check('a shot only pays once', g.score - s0 === 750_000, `${g.score - s0}`);
  check('collected shot goes dark', !f.job.lit('ramp'));
  const s1 = g.score;
  f.event('hit');
  check('values climb', g.score - s1 === 1_000_000, `${g.score - s1}`);
  for (const s of ['leftOrbit', 'reactor', 'drops', 'rightOrbit']) f.event(s);
  run(g, 0.1);
  check('clean sweep completes it', f.job === null && f.played.has(2));
}

console.log('BLACKOUT');
{
  const { g, f } = startJob('BLACKOUT');
  check('started', f.job?.name === 'BLACKOUT', f.job?.name);
  run(g, 1);
  check('lights go out', f.giTarget < 0.2 && f.gi < 0.3, `gi ${f.gi.toFixed(2)}`);
  const s0 = g.score;
  f.event('leftOrbit');
  f.event('ramp');
  f.event('rightOrbit');
  check('chained shots multiply (1M+2M+3M)', g.score - s0 === 6_000_000, `${g.score - s0}`);
  run(g, 7);
  const s1 = g.score;
  f.event('reactor');
  check('chain resets after a gap', g.score - s1 === 1_000_000, `${g.score - s1}`);
}

console.log('SABOTAGE');
{
  const { g, f } = startJob('SABOTAGE');
  check('started', f.job?.name === 'SABOTAGE', f.job?.name);
  f.hitStandup(0);
  f.hitDrop(0, 100);
  f.hitReactor();
  const s0 = f.job.total;
  shootScoop(f);
  check('scoop detonates the charge (1M + 3x250K)', f.job.total - s0 === 1_750_000, `${f.job.total - s0}`);
  run(g, 2);
  park(f);
  shootScoop(f);
  run(g, 0.1);
  check('second detonation completes it', f.job === null && f.played.has(4));
}

console.log('RIOT');
{
  const { g, f } = newGame();
  park(f);
  for (let i = 0; i < 4; i++) f.rollover(i);
  check('R-I-O-T starts a riot', f.riot?.name === 'RIOT');
  const s0 = g.score;
  f.sw('sling');
  check('every switch pays 100K', g.score - s0 === 100_000, `${g.score - s0}`);
  for (let i = 0; i < 4; i++) f.rollover(i);
  check('relighting extends it', f.riot.timer > 25);
  run(g, 35);
  check('riot times out', f.riot === null);
  f.riotLit = [true, false, false, false];
  f.onFlipperPress(1);
  check('lane change rotates letters', f.riotLit[1] && !f.riotLit[0]);
}

console.log('Priorities');
{
  const { g, f } = startJob('SHAKEDOWN');
  f.pitLit = true;
  shootScoop(f);
  check('no trip to the Pit mid-job', g.active === g.main);
  run(g, 2);
  park(f);
  (g as any).endBall();
  check('draining ends the job quietly', f.job === null);
}

console.log('BURN IT DOWN (wizard)');
{
  const { g, f } = newGame();
  park(f);
  for (let i = 0; i < 5; i++) {
    f.jobsLit = 1;
    scoop(g, f, (ff) => (ff.selected = ff.nextJob()));
    check(`job ${i + 1} started`, !!f.job, `played ${[...f.played]}`);
    f.job.finished = true;
    run(g, 0.1);
  }
  check('all five played lights the wizard', f.wizardLit);
  shootScoop(f);
  check('scoop starts BURN IT DOWN', f.wizard?.name === 'BURN IT DOWN');
  check('wizard is a multiball', f.multiball && (g as any).launchQueue === 3);
  const s0 = g.score;
  f.event('ramp');
  check('every shot is a jackpot (2M)', g.score - s0 === 2_000_000, `${g.score - s0}`);
  for (const s of ['leftOrbit', 'hit', 'reactor', 'drops', 'rightOrbit']) f.event(s);
  check('super lit after all six', !!f.wizard.lit('scoop'));
  f.endMultiball();
  check('wizard ends with the multiball', f.wizard === null);
  check('board resets at a higher level', f.played.size === 0 && f.modeLevel === 1 && f.jobsLit >= 1);
  check('values scale up', f.modeMult === 1.5);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
