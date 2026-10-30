// Layout measurements for the fan layout: where every shot goes and how wide each window is.
// Usage: npm run measure [-- section]   sections: windows, ramps, alley, plunge, pops, breach, gaps
//
// Launches come from real flips: a ball is cradled, dropped and flipped at many delays, and
// each launch (point, angle, speed) is recorded. Windows then sweep the launch angle in 0.25°
// steps from the nearest real launch. "Arrives" means where the ball reaches the flipper line
// (y 1040): on a flipper, between the flipper tips (centre drain), or down an outlane.
import { Game } from '../src/game/game';
import { FLOOR, type Ball, type Flipper } from '../src/engine/physics';
import * as L from '../src/game/tables/psychosis-layout';
import { measureGaps } from './gaps';

/* eslint-disable @typescript-eslint/no-explicit-any */
const only = process.argv[2];
const want = (s: string) => !only || only === s;
const g = new Game();
(g as any).startGame();
const m = g.main as any;
const w = m.world;
const DT = 1 / 480;

// ------------------------------------------------------------------ event log

let ev: string[] = [];
const log = (k: string) => {
  if (ev[ev.length - 1] !== k) ev.push(k);
};
const wrap = (name: string, label: (a: any[]) => string | null) => {
  const orig = m[name].bind(m);
  m[name] = (...a: any[]) => {
    const k = label(a);
    if (k) log(k);
    return orig(...a);
  };
};
wrap('majorShot', (a) => String(a[0]));
wrap('hitBumper', () => 'pop');
wrap('hitDrop', (a) => (!m.drops[a[0]].down && a[1] >= 45 ? `drop${a[0] + 1}` : null));
wrap('hitStandup', (a) => `letter ${L.BREACH_LETTERS[a[0]]}`);
wrap('hitFlank', (a) => (a[0] === 0 ? 'SAFE' : 'VENT'));
wrap('camLane', (a) => `CAM${a[0] + 1}`);
wrap('rollover', (a) => ['L-OUT', 'L-IN', 'R-IN', 'R-OUT'][a[0]]);
const sling = w.segments.filter((s: any) => s.tag === 'sling');
for (const s of sling) {
  const o = s.onHit;
  s.onHit = (h: any) => {
    if (h.speed >= 110) log('sling');
    o?.(h);
  };
}
const gate = w.segments.find((s: any) => s.oneWay && Math.abs(s.ay - L.EXIT_BOTTOM) < 1 && Math.abs(s.by - L.EXIT_BOTTOM) < 1);
gate.onHit = () => log('exit gate');

function reset(dropsDown = false) {
  w.balls = [];
  m.breachBall = null;
  m.locking = null;
  m.lockLit = false;
  m.alleyLoopOpen = false;
  m.drops.forEach((d: any) => {
    d.down = dropsDown;
    d.seg.enabled = !dropsDown;
  });
  m.timers = [];
  ev = [];
  for (const f of [m.flipperL, m.flipperR]) {
    f.pressed = false;
    f.angle = f.restAngle;
  }
}

function step(b?: Ball) {
  w.step(DT);
  m.substep(DT);
  m.update(DT);
  if (b && m.breachBall === b) m.breachTimer = Math.min(m.breachTimer, 0.01);
}

/** Distance from a ball to a flipper's bat (pivot to tip). */
function batDist(b: Ball, f: Flipper) {
  const ax = f.tipX - f.px;
  const ay = f.tipY - f.py;
  const t = Math.max(0, Math.min(1, ((b.x - f.px) * ax + (b.y - f.py) * ay) / (ax * ax + ay * ay)));
  return Math.hypot(b.x - (f.px + ax * t), b.y - (f.py + ay * t));
}
/** Follow a ball until it reaches a flipper, drains between them, or goes down an outlane. */
function arrive(b: Ball, max = 10): string {
  for (let t = 0; t < max; t += DT) {
    step(b);
    if (ev.includes('L-OUT') || ev.includes('R-OUT')) return 'OUTLANE';
    if (b.layer === FLOOR && !b.captured && b.y > 950) {
      if (batDist(b, m.flipperL) < 30) return 'left flipper';
      if (batDist(b, m.flipperR) < 30) return 'right flipper';
    }
    if (b.y > 1120) return 'CENTRE DRAIN';
  }
  return 'still in play';
}

const tally = (xs: string[]) => {
  const c: Record<string, number> = {};
  for (const x of xs) c[x] = (c[x] ?? 0) + 1;
  return Object.entries(c)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${v}× ${k}`)
    .join(', ');
};

// ------------------------------------------------------------------ real flips

interface Flip {
  feed: 'cradle' | 'live';
  delay: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  s: number;
  k: string;
}
const SHOTS = ['alley', 'breach', 'market', 'skyway', 'reactor'];
/** The first shot made, else the first target or the first wall the ball meets. */
function follow(b: Ball, max = 3): string {
  let firstHit = '';
  for (let t = 0; t < max; t += DT) {
    const vx = b.vx;
    const vy = b.vy;
    step(b);
    const shot = ev.find((e) => SHOTS.includes(e));
    if (shot) return shot;
    if (!firstHit && ev.length) firstHit = ev[0];
    if (!firstHit && (vx * b.vx + vy * b.vy) / (Math.hypot(vx, vy) * Math.hypot(b.vx, b.vy) + 1e-9) < 0.9) firstHit = `wall ${Math.round(b.x / 10) * 10},${Math.round(b.y / 10) * 10}`;
    if (firstHit && t > 0.8 && b.y > 700 && b.vy > 0) break;
    if (b.y > 1220) break;
  }
  return firstHit || 'nothing';
}
/** Flip at every timing (2 ms apart) and record each launch and what it reached. */
function sweep(f: Flipper, start: [number, number], feed: 'cradle' | 'live', dropsDown = false): Flip[] {
  const out: Flip[] = [];
  const [d0, d1] = feed === 'cradle' ? [0.3, 0.9] : [0.4, 0.8];
  for (let delay = d0; delay < d1; delay += 0.002) {
    reset(dropsDown);
    const b = m.addBall(start[0], start[1], 0, 100);
    if (feed === 'cradle') {
      f.pressed = true;
      for (let t = 0; t < 2; t += DT) w.step(DT);
      f.pressed = false;
    }
    let got: Omit<Flip, 'k'> | null = null;
    for (let t = 0; t < 1.5 && !got; t += DT) {
      if (t > delay + (feed === 'cradle' ? 0.03 : 0)) f.pressed = true;
      w.step(DT);
      // launched: leaving the bat upward, still within its reach
      if (f.pressed && b.vy < 0 && b.y < 1000 && b.speed > 1200 && Math.hypot(b.x - f.px, b.y - f.py) <= f.len + 60)
        got = { feed, delay, x: b.x, y: b.y, vx: b.vx, vy: b.vy, a: (Math.atan2(-b.vy, b.vx) * 180) / Math.PI, s: b.speed };
    }
    if (!got) continue;
    reset(dropsDown);
    const k = follow(m.addBall(got.x, got.y, got.vx, got.vy));
    out.push({ ...got, k });
  }
  return out;
}
/** Re-launch a recorded flip, nudged by `da` degrees. */
function relaunch(fl: Flip, da = 0): Ball {
  const r = ((fl.a + da) * Math.PI) / 180;
  return m.addBall(fl.x, fl.y, Math.cos(r) * fl.s, -Math.sin(r) * fl.s);
}
/** n launches that made shot k, spread over the window (repeated with small nudges if there are fewer). */
function pick(flips: Flip[], k: string, n = 12): [Flip, number][] {
  const ok = flips.filter((f) => f.k === k).sort((p, q) => p.a - q.a);
  if (!ok.length) return [];
  return Array.from({ length: n }, (_, i) => [ok[Math.floor((i * ok.length) / n)], ok.length >= n ? 0 : ((i % 3) - 1) * 0.1]);
}

// ------------------------------------------------------------------ report

const out: string[] = [];
const say = (s = '') => {
  out.push(s);
  console.log(s);
};

say(`Ball diameter: ${L.BALL_R * 2} units. Pop bumper ring: ${L.BUMPER_R * 2} units across (${((L.BUMPER_R * 2) / 28).toFixed(1)} balls), skirt ${L.BUMPER_SKIRT_R * 2} (${((L.BUMPER_SKIRT_R * 2) / 28).toFixed(1)} balls).`);

const F: Record<string, Flip[]> = {};
if (want('windows') || want('ramps') || want('alley') || want('breach')) {
  F.left = [...sweep(m.flipperL, [93, 900], 'cradle'), ...sweep(m.flipperL, [93, 900], 'live')];
  F.right = [...sweep(m.flipperR, [462, 900], 'cradle'), ...sweep(m.flipperR, [462, 900], 'live')];
  F.leftDown = [...sweep(m.flipperL, [93, 900], 'cradle', true), ...sweep(m.flipperL, [93, 900], 'live', true)];
}
const group = (k: string) => (k.startsWith('wall') ? 'wall' : k.startsWith('letter') ? `letter ${k.slice(-1)}` : k.startsWith('drop') ? k : k);

if (want('windows')) {
  say('\n## Shot windows from real flips');
  say('Every flip timing 2 ms apart, from a cradled ball and from a ball rolling straight off the inlane.');
  say('Share = how many of those timings make it (cradle / live). Angles = launch angles of the flips that make it.');
  for (const [side, label] of [
    ['left', 'Left flipper, drops up'],
    ['leftDown', 'Left flipper, drops down'],
    ['right', 'Right flipper'],
  ]) {
    const fl = F[side];
    const nC = fl.filter((f) => f.feed === 'cradle').length;
    const nL = fl.filter((f) => f.feed === 'live').length;
    say(`\n${label} (${nC} cradle timings, ${nL} live; launch angles ${Math.min(...fl.map((f) => f.a)).toFixed(1)}°–${Math.max(...fl.map((f) => f.a)).toFixed(1)}°):`);
    const keys = [...new Set(fl.map((f) => group(f.k)))];
    const rows = keys.map((k) => {
      const hit = fl.filter((f) => group(f.k) === k);
      const c = hit.filter((f) => f.feed === 'cradle').length;
      const l = hit.length - c;
      const as = hit.map((f) => f.a);
      return { k, c, l, lo: Math.min(...as), hi: Math.max(...as), n: hit.length };
    });
    rows.sort((p, q) => (p.lo + p.hi) / 2 - (q.lo + q.hi) / 2);
    for (const r of rows) {
      if (r.k === 'wall' || r.k === 'nothing') continue;
      const star = SHOTS.includes(r.k) ? '★ ' : '  ';
      say(`  ${star}${r.k.padEnd(10)} ${String(Math.round((100 * r.c) / nC)).padStart(3)}% / ${String(Math.round((100 * r.l) / nL)).padStart(3)}%   ${r.lo.toFixed(1).padStart(6)}°–${r.hi.toFixed(1).padStart(6)}°`);
    }
    const wall = rows.find((r) => r.k === 'wall');
    if (wall) say(`    walls/posts  ${Math.round((100 * wall.c) / nC)}% / ${Math.round((100 * wall.l) / nL)}%`);
    if (process.env.WALLS) say(`      where: ${tally(fl.filter((f) => f.k.startsWith('wall')).map((f) => f.k.slice(5)))}`);
  }
}

function trials(name: string, flips: Flip[], k: string, check: (b: Ball) => string, setup?: () => void) {
  const res: string[] = [];
  const picks = pick(flips, k);
  if (!picks.length) return say(`${name.padEnd(40)} never made`);
  for (const [fl, da] of picks) {
    reset();
    setup?.();
    res.push(check(relaunch(fl, da)));
  }
  const as = picks.map(([f]) => f.a);
  say(`${name} (launches ${Math.min(...as).toFixed(1)}°–${Math.max(...as).toFixed(1)}°): ${tally(res)}`);
  return res;
}

if (want('ramps')) {
  say('\n## Ramp returns (12 launches that make each ramp, followed to the flipper line)');
  for (const [shot, side, inlane] of [
    ['skyway', 'left', 'L-IN'],
    ['market', 'left', 'R-IN'],
    ['market', 'right', 'R-IN'],
  ] as const) {
    trials(`${shot} from the ${side} flipper`, F[side], shot, (b) => {
      const end = arrive(b);
      const made = ev.includes(shot) ? '' : 'not made, ';
      const lane = ev.includes(inlane) ? `${inlane}` : (ev.find((e) => /-(IN|OUT)$/.test(e)) ?? 'no inlane');
      return `${made}${lane} → ${end}`;
    });
  }
}

if (want('alley')) {
  say('\n## Back Alley (12 launches that make it)');
  trials('loop closed', F.right, 'alley', (b) => {
    for (let t = 0; t < 4 && !ev.some((e) => e.startsWith('CAM')); t += DT) step(b);
    return ev.some((e) => e.startsWith('CAM')) ? 'top lanes' : `missed (${ev.join('>') || 'nothing'})`;
  });
  // Flips that go up the orbit but don't make it over the top: where do they come back to?
  const up = F.right.filter((f) => f.k !== 'alley' && f.k.startsWith('wall') && f.a > 118);
  const back: string[] = [];
  for (const fl of up) {
    reset();
    const b = relaunch(fl);
    let rose = false;
    for (let t = 0; t < 1.2; t += DT) {
      step(b);
      if (b.x < 70 && b.y < 500) rose = true;
    }
    if (rose) back.push(arrive(b));
  }
  say(`up the orbit but short of the top (${back.length} flips): ${tally(back) || 'none'}`);
  trials(
    'loop held open',
    F.right,
    'alley',
    (b) => {
      const end = arrive(b);
      return `${ev.filter((e) => /-(IN|OUT)$|CAM/.test(e)).join('>') || 'no lane'} → ${end}`;
    },
    () => (m.alleyLoopOpen = true),
  );
}

if (want('plunge') || want('pops')) {
  say('\n## Plunge (12 pulls from 50% to 100%) and what the pops do with it');
  const plunges: string[] = [];
  const popsOut: string[] = [];
  const hits: number[] = [];
  const times: number[] = [];
  for (let i = 0; i < 12; i++) {
    reset();
    const pull = 0.5 + (0.5 * i) / 11;
    const b = m.addBall(557.5, 1165);
    for (let t = 0; t < 0.4; t += DT) w.step(DT);
    (g as any).fire(pull);
    let tIn = -1;
    let tOut = -1;
    for (let t = 0; t < 12; t += DT) {
      step(b);
      if (tIn < 0 && ev.some((e) => e.startsWith('CAM'))) tIn = t;
      if (tIn >= 0 && b.y > L.EXIT_BOTTOM + 10) {
        tOut = t;
        break;
      }
      if (b.y > 1220 || ev.includes('R-IN') || ev.includes('R-OUT')) break;
    }
    const lane = ev.find((e) => e.startsWith('CAM'));
    plunges.push(lane ? `top lanes (${lane})` : `missed: ${ev.join('>') || 'fell back'}`);
    if (tIn >= 0 && tOut >= 0) {
      hits.push(ev.filter((e) => e === 'pop').length);
      times.push(tOut - tIn);
      popsOut.push(arrive(b));
    } else if (tIn >= 0) popsOut.push('never left the nest in 12 s');
  }
  say(`Plunge reaches the top lanes: ${tally(plunges)}`);
  if (want('pops')) {
    say(`Pops, per visit: ${hits.length} visits, bumper hits avg ${(hits.reduce((a, b) => a + b, 0) / Math.max(1, hits.length)).toFixed(1)} (min ${Math.min(...hits)}, max ${Math.max(...hits)}), time in the nest avg ${(times.reduce((a, b) => a + b, 0) / Math.max(1, times.length)).toFixed(1)} s (min ${Math.min(...times).toFixed(1)}, max ${Math.max(...times).toFixed(1)})`);
    say(`Pops, where the ball goes after the exit: ${tally(popsOut)}`);
  }
  for (const [label, speed] of [['auto-launch (multiball / ball save)', 3150]] as const) {
    reset();
    const b = m.addBall(557.5, 1165);
    for (let t = 0; t < 0.4; t += DT) w.step(DT);
    b.vy = -speed;
    for (let t = 0; t < 4 && !ev.some((e) => e.startsWith('CAM')); t += DT) step(b);
    say(`${label}: ${ev.find((e) => e.startsWith('CAM')) ? 'top lanes' : 'missed'}`);
  }
}

if (want('breach')) {
  say('\n## Breach kickout (12 ejects)');
  const res: string[] = [];
  for (let i = 0; i < 12; i++) {
    reset();
    m.modesLit = 0;
    const b = m.addBall(L.BREACH[0], L.BREACH[1]);
    m.enterBreach(b);
    m.ejectBreach();
    ev = [];
    res.push(arrive(b));
  }
  say(tally(res));
  say('\n## Breach targets: where the ball goes after hitting each standup (every flip whose first hit is that standup)');
  for (const side of ['left', 'right'] as const) {
    const after: Record<string, string[]> = {};
    for (const fl of F[side]) {
      if (!fl.k.startsWith('letter')) continue;
      reset();
      const b = relaunch(fl);
      for (let t = 0; t < 1 && !ev.length; t += DT) step(b);
      (after[fl.k] ??= []).push(arrive(b));
    }
    for (const [k, v] of Object.entries(after).sort()) say(`  from the ${side} flipper, ${k}: ${tally(v)}`);
  }
}

if (want('gaps')) {
  say('\n## Clearances (surface to surface; a ball needs 28)');
  for (const gp of measureGaps(m)) say(`  ${gp.name.padEnd(34)} ${gp.gap.toFixed(1).padStart(6)}  ${(gp.gap / 28).toFixed(2)} balls`);
}
