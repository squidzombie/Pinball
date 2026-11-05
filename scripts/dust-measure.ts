// Dust & Lead's layout measurements, against the owner's bar (HANDOFF.md section 6).
// Usage: npx tsx scripts/dust-measure.ts [section]   sections: windows, saloon, ramps, orbits, plunge, pops, jail, pan
// SLOPE=9 measures at another slope (the table is built for 6.5°).
import { Game } from '../src/game/game';
import { FLOOR, gravityAt, type Ball, type Flipper } from '../src/engine/physics';
import * as L from '../src/game/tables/dust-layout';
import type { DustAndLead } from '../src/game/tables/dust';

/* eslint-disable @typescript-eslint/no-explicit-any */
const only = process.argv[2];
const g = new Game('dust');
const m = g.main as DustAndLead;
const mm = m as any;
if (process.env.SLOPE) m.world.gravity = gravityAt(Number(process.env.SLOPE));
(g as any).startGame();
const w = m.world;
const STEP = 1 / 480;

// ---------------------------------------------------------------- what a ball reaches

let events: string[] = [];
const wrap = (name: string, label: (a: any[]) => string) => {
  const orig = mm[name].bind(mm);
  mm[name] = (...a: any[]) => {
    events.push(label(a));
    return orig(...a);
  };
};
wrap('made', (a) => a[0]);
wrap('hitDrop', (a) => `drop${a[0] + 1}`);
wrap('intoCup', (a) => ['riches', 'nuggets', 'extra'][a[1]]);
m.bumpers.forEach((c) => {
  const orig = c.onHit!;
  c.onHit = (h) => {
    events.push('pop');
    orig(h);
  };
});
/** Major shots outrank the targets a ball brushed on the way. */
const MAJOR = new Set(['railroad', 'mine', 'pan', 'jail', 'stage', 'saloon']);
const TARGET = new Set(['noon', 'quickdraw', 'hardware', 'sheriff', 'drop1', 'drop2', 'drop3']);
const firstOf = (ev: string[]) => ev.find((e) => MAJOR.has(e)) ?? ev.find((e) => TARGET.has(e)) ?? ev[0];

function reset() {
  w.balls = [];
  m.trips = [];
  for (const f of m.flippers()) {
    f.pressed = false;
    f.angle = f.restAngle;
    f.omega = 0;
  }
  m.drops.forEach((d) => {
    d.down = false;
    d.seg.enabled = true;
  });
  mm.counts = {};
  m.oreCarts = 0;
  events = [];
}
function step(until: () => boolean, max: number) {
  for (let t = 0; t < max; t += STEP) {
    w.step(STEP);
    m.substep(STEP);
    m.update(STEP);
    if (until()) return t;
  }
  return max;
}
/** Distance from a ball to a flipper's bat (pivot to tip). */
function toBat(b: Ball, f: Flipper) {
  const ax = f.tipX - f.px;
  const ay = f.tipY - f.py;
  const t = Math.max(0, Math.min(1, ((b.x - f.px) * ax + (b.y - f.py) * ay) / (ax * ax + ay * ay)));
  return Math.hypot(b.x - (f.px + ax * t), b.y - (f.py + ay * t));
}
/**
 * Where a ball ends up once it heads back down: a lower flipper (it comes within reach of the bat,
 * so a player could flip it), an outlane, or straight down the middle out of reach (drain).
 */
function fate(b: Ball, max = 10): string {
  let out = 'none';
  const trail: string[] = [];
  step(() => {
    if (process.env.WHERE === '2') {
      trail.push(`(${b.x.toFixed(0)},${b.y.toFixed(0)})`);
      if (trail.length > 400) trail.shift();
    }
    if (!w.balls.includes(b)) return true;
    if (b.captured || b.layer !== FLOOR) return false;
    for (const f of [m.flipperL, m.flipperR]) {
      if (b.vy > -50 && toBat(b, f) < f.r0 + b.r + 8) {
        out = f === m.flipperL ? 'left flipper' : 'right flipper';
        return true;
      }
    }
    if (b.x > L.SHOOTER.minX && b.y > 300) {
      out = 'shooter lane';
      return true;
    }
    if (b.y > 1000 && b.vy > 0 && (b.x < L.CX - 202 || b.x > L.CX + 202)) {
      out = process.env.WHERE ? `outlane@${Math.round(b.x)}` : 'outlane';
      return true;
    }
    if (b.y > 1150) {
      out = process.env.WHERE ? `drain@${Math.round(b.x)},${Math.round(b.y)}` : 'drain';
      if (process.env.WHERE === '2') console.log('DRAIN TRAIL', trail.filter((_, i) => i % 25 === 0).slice(-12).join(' '));
      return true;
    }
    if (b.stillTime > 3) {
      out = `stuck at (${b.x.toFixed(0)}, ${b.y.toFixed(0)})`;
      return true;
    }
    return false;
  }, max);
  return out;
}
const tally = (xs: string[]) => {
  const c: Record<string, number> = {};
  for (const x of xs) c[x] = (c[x] ?? 0) + 1;
  return Object.entries(c)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${v}× ${k}`)
    .join(', ');
};
const pct = (n: number, d: number) => `${Math.round((100 * n) / d)}%`.padStart(4);
const section = (name: string) => !only || only === name;

// ---------------------------------------------------------------- shot windows

/** Flip a ball off `f` at every timing; returns what each timing reached first. */
function sweep(f: Flipper, start: () => Ball, live: boolean, holdFirst: boolean) {
  const res: string[] = [];
  for (let delay = 0; delay < 0.7; delay += 0.002) {
    reset();
    const b = start();
    if (holdFirst) {
      f.pressed = true;
      step(() => b.speed < 3 && m.onHeldFlipper(b), 5);
      f.pressed = false;
    }
    const t0 = live ? step(() => b.y > f.py - 70, 4) : 0;
    void t0;
    let t = 0;
    step(() => (t += STEP) >= delay + (live ? 0 : 0.03), 2);
    // flip, and let go after the stroke as a player does
    f.pressed = true;
    let held = 0;
    step(() => {
      held += STEP;
      if (held > 0.25) f.pressed = false;
      return events.length > 0 || b.y > 1210 || (held > 0.6 && b.vy > 0 && b.y > f.py - 60) || !w.balls.includes(b);
    }, 3.5);
    // a target was hit first: carry on until a major shot or until it comes back down
    if (events.length && !events.some((e) => MAJOR.has(e)) && w.balls.includes(b)) {
      const before = b.y;
      void before;
      step(() => events.some((e) => MAJOR.has(e)) || b.y > 1210 || (b.vy > 0 && b.y > 700) || !w.balls.includes(b), 3);
    }
    const first = firstOf(events) ?? (b.y > 1210 ? 'drain' : 'nothing');
    res.push(first);
    // after a target, where does the ball come back to?
    if (TARGET.has(first) && w.balls.includes(b)) {
      for (const x of m.flippers()) x.pressed = false;
      const fz = fate(b, 8);
      const key = first.startsWith('drop') ? 'drops' : first;
      (rebounds[key] ??= []).push(fz);
    }
  }
  return res;
}
const rebounds: Record<string, string[]> = {};
function report(name: string, cradle: string[], live: string[]) {
  const keys = [...new Set([...cradle, ...live])].sort((a, b) => cradle.filter((x) => x === b).length + live.filter((x) => x === b).length - cradle.filter((x) => x === a).length - live.filter((x) => x === a).length);
  console.log(`\n${name} (${cradle.length} cradle timings, ${live.length} live)`);
  for (const k of keys) {
    const c = cradle.filter((x) => x === k).length;
    const l = live.filter((x) => x === k).length;
    console.log(`  ${MAJOR.has(k) ? '★' : ' '} ${k.padEnd(12)} ${pct(c, cradle.length)} / ${pct(l, live.length)}`);
  }
}

if (section('windows')) {
  console.log('## Shot windows from real flips (6.5°)');
  console.log('Every flip timing 2 ms apart, from a cradled ball and from a ball rolling off the inlane. Share of timings: cradle / live. ★ = a major shot.');
  const left = () => m.addBall(93, 900, 0, 60);
  const right = () => m.addBall(462, 900, 0, 60);
  if (process.env.SIDE !== 'right') report('Left flipper, drops up', sweep(m.flipperL, left, false, true), sweep(m.flipperL, left, true, false));
  if (process.env.SIDE !== 'left') report('Right flipper, drops up', sweep(m.flipperR, right, false, true), sweep(m.flipperR, right, true, false));
  const showRebounds = () => {
    console.log('\nWhere target hits come back to (every flip above that hit a target first):');
    for (const [k, v] of Object.entries(rebounds)) console.log(`  ${k.padEnd(10)} (${v.length}): ${tally(v)}`);
  };
  if (process.env.QUICK) {
    showRebounds();
    process.exit(0);
  }
  const dropsDown = () => m.drops.forEach((d) => ((d.down = true), (d.seg.enabled = false)));
  const rDown = () => {
    dropsDown();
    return right();
  };
  const lDown = () => {
    dropsDown();
    return left();
  };
  report('Right flipper, Railroad open', sweep(m.flipperR, rDown, false, true), sweep(m.flipperR, rDown, true, false));
  report('Left flipper, Railroad open', sweep(m.flipperL, lDown, false, true), sweep(m.flipperL, lDown, true, false));
  showRebounds();
}

if (section('saloon')) {
  console.log('\n## The saloon flipper');
  const f = m.saloonFlipper;
  const drop = () => m.addBall(L.WIRE_DROP.at[0], L.WIRE_DROP.at[1], L.WIRE_DROP.v[0], L.WIRE_DROP.v[1]);
  const run = (cradle: boolean) => {
    const res: string[] = [];
    for (let delay = 0; delay < 0.7; delay += 0.002) {
      reset();
      const b = drop();
      if (cradle) {
        f.pressed = true;
        step(() => b.speed < 3 && m.onHeldFlipper(b), 5);
        f.pressed = false;
      }
      let t = 0;
      step(() => (t += STEP) >= delay + (cradle ? 0.02 : 0), 2);
      f.pressed = true;
      step(() => events.length > 0 || b.y > 600, 3);
      res.push(firstOf(events) ?? (b.y > 600 ? 'fell out' : process.env.WHERE ? `nothing@${Math.round(b.x / 20) * 20},${Math.round(b.y / 20) * 20}${m.onHeldFlipper(b) ? 'c' : ''}` : 'nothing'));
    }
    return res;
  };
  report('Saloon flipper, ball from the wire', run(true), run(false));
  const fates: string[] = [];
  for (let i = 0; i < 12; i++) {
    reset();
    const b = m.addBall(L.WIRE_DROP.at[0] + (i - 6) * 0.5, L.WIRE_DROP.at[1], L.WIRE_DROP.v[0], L.WIRE_DROP.v[1]);
    const r = fate(b, 12);
    fates.push(`${r}${events.includes('pop') ? ' via pops' : ''}`);
  }
  console.log(`Not flipped (12): ${tally(fates)}`);
}

if (section('ramps')) {
  console.log('\n## Ramps');
  // Stagecoach: a ball fed up the mouth at shot speeds; where it lands
  for (const [name, r] of [['Stagecoach', L.STAGE] as const]) {
    for (const speed of [1800, 2400, 3000]) {
      const fates: string[] = [];
      let made = 0;
      for (let i = 0; i < 12; i++) {
        reset();
        const [a, b2] = [r.path[0], r.path[3]];
        const dx = b2[0] - a[0];
        const dy = b2[1] - a[1];
        const l = Math.hypot(dx, dy);
        const ball = m.addBall(a[0] - (dx / l) * 30 + (i - 6) * 0.6, a[1] - (dy / l) * 30, (dx / l) * speed, (dy / l) * speed);
        const res = fate(ball, 10);
        if (events.includes('stage')) made++;
        fates.push(res);
      }
      console.log(`${name} at ${speed}: made ${made}/12; then ${tally(fates)}`);
    }
  }
  // Gold Mine: up the ramp, the lift and the wire, into the saloon
  {
    const fates: string[] = [];
    let made = 0;
    for (let i = 0; i < 12; i++) {
      reset();
      const r = L.MINE;
      const [a, b2] = [r.path[0], r.path[3]];
      const dx = b2[0] - a[0];
      const dy = b2[1] - a[1];
      const l = Math.hypot(dx, dy);
      const sp = 1400 + i * 100;
      const ball = m.addBall(a[0] - (dx / l) * 30, a[1] - (dy / l) * 30, (dx / l) * sp, (dy / l) * sp);
      step(() => events.includes('mine') || ball.y > 700, 3);
      if (events.includes('mine')) made++;
      // through the lift and along the wire into the saloon, then left alone
      fates.push(fate(ball, 14) + (events.includes('pop') ? ' via pops' : ''));
    }
    console.log(`Gold Mine from 1400 to 2500 units/s: made ${made}/12; then (saloon flipper not used) ${tally(fates)}`);
  }
  // weakest speeds that make each ramp
  for (const r of [L.MINE, L.STAGE]) {
    let lo = 0;
    for (let sp = 600; sp <= 3200; sp += 50) {
      reset();
      const [a, b2] = [r.path[0], r.path[3]];
      const dx = b2[0] - a[0];
      const dy = b2[1] - a[1];
      const l = Math.hypot(dx, dy);
      const ball = m.addBall(a[0] - (dx / l) * 30, a[1] - (dy / l) * 30, (dx / l) * sp, (dy / l) * sp);
      const fails: string[] = [];
      step(() => events.includes(r.id) || (ball.layer === FLOOR && ball.y > a[1] + 40), 6);
      if (events.includes(r.id)) {
        lo = sp;
        break;
      }
      void fails;
    }
    console.log(`${r.id}: slowest ball that makes it ${lo} units/s`);
  }
}

if (section('orbits')) {
  console.log('\n## Orbits (both end in the saloon)');
  for (const [name, at, dir] of [
    ['Railroad lane', L.along(L.RR_MOUTH[0], L.RR_MOUTH[1], 0.5), [-0.35, -0.94]],
    ['Saloon lane', L.along(L.SALOON_MOUTH[0], L.SALOON_MOUTH[1], 0.5), [0.0, -1]],
  ] as const) {
    for (const speed of [1800, 2400, 3000]) {
      const res: string[] = [];
      for (let i = 0; i < 12; i++) {
        reset();
        m.drops.forEach((d) => ((d.down = true), (d.seg.enabled = false)));
        const b = m.addBall(at[0] - dir[0] * -10 + (i - 6) * 0.5, at[1] + 20, dir[0] * speed, dir[1] * speed);
        const inSaloon = () => b.x > 380 && b.x < 490 && b.y > 160 && b.y < 300;
        step(() => inSaloon() || b.y > 900, 4);
        res.push(inSaloon() ? 'into the saloon' : 'fell back');
      }
      console.log(`${name} at ${speed}: ${tally(res)}`);
    }
  }
}

if (section('plunge')) {
  console.log('\n## Plunge');
  for (let pull = 0; pull <= 1.0001; pull += 0.1) {
    const res: string[] = [];
    for (let i = 0; i < 12; i++) {
      reset();
      const b = m.addBall(L.SHOOTER.x, L.SHOOTER.y);
      step(() => b.speed < 2, 2);
      b.vy = -m.plungeSpeed(pull) * (1 + (i - 6) * 0.002);
      // into the saloon proper: dropped inside, below the top run
      const inSaloon = () => b.x > 380 && b.x < 490 && b.y > 160 && b.y < 300;
      step(() => inSaloon() || (b.y > 1100 && b.vy > 0 && b.x > 537) || b.stillTime > 3, 6);
      res.push(inSaloon() ? 'saloon' : b.stillTime > 3 ? `stuck (${b.x.toFixed(0)},${b.y.toFixed(0)})` : 'back to the plunger');
    }
    console.log(`  pull ${Math.round(pull * 100)}%`.padEnd(12) + `${m.plungeSpeed(pull).toFixed(0)} u/s: ${tally(res)}`);
  }
}

if (section('pops')) {
  console.log('\n## Pops');
  // balls rolling off the saloon flipper's tip (a missed saloon shot) and left alone
  const fates: string[] = [];
  let pops = 0;
  let time = 0;
  for (let i = 0; i < 12; i++) {
    reset();
    const b = m.addBall(400 + (i - 6) * 1.5, 300, -40, 80);
    let t = 0;
    let lastPop = 0;
    const r = fate(b, 12);
    step(() => true, 0);
    pops += events.filter((e) => e === 'pop').length;
    t = events.length;
    void t;
    void lastPop;
    fates.push(r);
  }
  void time;
  console.log(`A ball rolling off the saloon flipper (12): ${pops / 12} pops each; then ${tally(fates)}`);
}

if (section('jail')) {
  console.log('\n## Jailhouse kickout');
  const fates: string[] = [];
  for (let i = 0; i < 12; i++) {
    reset();
    const b = m.addBall(L.JAIL_HOLE[0] + 20, L.JAIL_HOLE[1] + 40, -0.387 * 600, -0.922 * 600);
    step(() => m.trips.length > 0, 2);
    fates.push(fate(b, 10));
  }
  console.log(`12 kickouts: ${tally(fates)}`);
}

if (section('pan')) {
  console.log('\n## Gold Pan');
  const cups: string[] = [];
  const fates: string[] = [];
  let maxT = 0;
  for (let i = 0; i < 24; i++) {
    reset();
    m.oreCarts = 3;
    const r = L.MINE;
    const [a, b2] = [r.path[0], r.path[3]];
    const dx = b2[0] - a[0];
    const dy = b2[1] - a[1];
    const l = Math.hypot(dx, dy);
    const sp = 1500 + i * 40;
    const ball = m.addBall(a[0] - (dx / l) * 30, a[1] - (dy / l) * 30, (dx / l) * sp, (dy / l) * sp);
    // count the ball's first id-based offset in the drop so runs differ
    (ball as any).id = 100 + i;
    const t = step(() => events.some((e) => e === 'riches' || e === 'nuggets' || e === 'extra'), 15);
    maxT = Math.max(maxT, t);
    cups.push(events.find((e) => e === 'riches' || e === 'nuggets' || e === 'extra') ?? `none (ball at ${ball.x.toFixed(0)}, ${ball.y.toFixed(0)})`);
    fates.push(fate(ball, 10));
  }
  console.log(`24 balls into the pan: ${tally(cups)}; longest ${maxT.toFixed(1)} s to a cup`);
  console.log(`Out of the pan: ${tally(fates)}`);
}
