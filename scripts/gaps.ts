// Clearances on the Cyber Psychosis playfield: every place the ball has to fit through.
// Gaps are surface to surface (ball radius 14, so a ball needs 28).
// Used by the art template (which draws a ball at each gap) and printed by `npm run template`.
import { FLOOR, type Circle, type Flipper, type Segment, type World } from '../src/engine/physics';
import * as L from '../src/game/tables/psychosis-layout';
import type { P } from '../src/game/tables/geom';

export interface Gap {
  name: string;
  a: P;
  b: P;
  gap: number;
}

function closestOnSeg(p: P, a: P, b: P): P {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return [a[0] + dx * t, a[1] + dy * t];
}
const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Closest pair of points between two polylines (checked from both sides' vertices). */
function polyGap(p: P[], q: P[]): [P, P] {
  let best: [P, P] = [p[0], q[0]];
  let bd = Infinity;
  const test = (from: P[], to: P[], flip: boolean) => {
    for (const v of from)
      for (let i = 0; i < to.length - 1; i++) {
        const c = closestOnSeg(v, to[i], to[i + 1]);
        const d = dist(v, c);
        if (d < bd) {
          bd = d;
          best = flip ? [c, v] : [v, c];
        }
      }
  };
  test(p, q, false);
  test(q, p, true);
  return best;
}

export function measureGaps(t: { world: World; bumpers: Circle[]; captive: { c: Circle }; extraFlippers: { f: Flipper }[] }): Gap[] {
  const w = t.world;
  const out: Gap[] = [];
  const push = (name: string, a: P, b: P, minus = 0) => out.push({ name, a, b, gap: dist(a, b) - minus });
  const R = L.BUMPER_R;
  const pops = t.bumpers;
  const pairs: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 2],
  ];
  for (const [i, j] of pairs) {
    const a = pops[i];
    const b = pops[j];
    const u: P = [(b.x - a.x) / dist([a.x, a.y], [b.x, b.y]), (b.y - a.y) / dist([a.x, a.y], [b.x, b.y])];
    push(`Pop ${i + 1}–${j + 1}`, [a.x + u[0] * R, a.y + u[1] * R], [b.x - u[0] * R, b.y - u[1] * R]);
  }
  // each pop to the nearest floor wall or post
  pops.forEach((c, i) => {
    let best: [P, P] | null = null;
    let bd = Infinity;
    const centre: P = [c.x, c.y];
    for (const s of w.segments as Segment[]) {
      if (!(s.layers & FLOOR) || !s.enabled) continue;
      const q = closestOnSeg(centre, [s.ax, s.ay], [s.bx, s.by]);
      const d = dist(centre, q);
      if (d < bd) {
        bd = d;
        best = [centre, q];
      }
    }
    for (const o of w.circles) {
      if (o === c || pops.includes(o) || o === t.captive.c) continue;
      const d = dist(centre, [o.x, o.y]) - o.r;
      if (d < bd) {
        bd = d;
        const u: P = [(o.x - c.x) / (d + o.r), (o.y - c.y) / (d + o.r)];
        best = [centre, [o.x - u[0] * o.r, o.y - u[1] * o.r]];
      }
    }
    const [p, q] = best!;
    const u: P = [(q[0] - p[0]) / bd, (q[1] - p[1]) / bd];
    push(`Pop ${i + 1}–nearest wall`, [p[0] + u[0] * R, p[1] + u[1] * R], q);
  });
  // CAM lanes, between the rubber-capped posts and over them
  for (let i = 0; i < 3; i++) {
    const a = L.LANE_POSTS[i];
    const b = L.LANE_POSTS[i + 1];
    push(`CAM ${i + 1} lane, post to post`, [a[0] + L.LANE_POST_R, a[1]], [b[0] - L.LANE_POST_R, b[1]]);
  }
  L.LANE_POSTS.forEach((p, i) => {
    const [, q] = polyGap([p], L.ARCH_OUTER);
    const u: P = [(q[0] - p[0]) / dist(p, q), (q[1] - p[1]) / dist(p, q)];
    push(`Arch over lane post ${i + 1}`, [p[0] + u[0] * L.LANE_POST_R, p[1] + u[1] * L.LANE_POST_R], q);
  });
  push('Pop nest exit', L.NEST_EXIT[0], L.NEST_EXIT[1]);
  const [ea, eb] = polyGap(L.EXIT_LANE_L, L.EXIT_LANE_R);
  push('Pop exit lane, narrowest', ea, eb);
  push('Pop exit gate', L.EXIT_GATE[0], L.EXIT_GATE[1]);
  const [ta, tb] = polyGap(L.BREACH_THROAT.left, L.BREACH_THROAT.right);
  push('Breach throat, narrowest', ta, tb);
  push('Breach mouth, post to post', L.BREACH_MOUTH[0], L.BREACH_MOUTH[1], 6);
  const leg = L.ARCH_INNER_L.slice(0, 8);
  const [oa, ob] = polyGap(leg, L.ARCH_OUTER.slice(0, 20));
  push('Back Alley orbit lane', oa, ob);
  push('Black Market mouth', L.MARKET.entry[0], L.MARKET.entry[1]);
  push('H to the Black Market wall (should be 0)', L.BANK_R[1], L.MARKET_LEFT_BASE[0]);
  push('Upper playfield lane', [L.UPPER_LANE_X[0], 450], [L.UPPER_LANE_X[1], 450]);
  push('Upper playfield gate', L.UPPER_GATE[0], L.UPPER_GATE[1]);
  const [ul, ur] = [t.extraFlippers[0].f, t.extraFlippers[1].f];
  push('Upper flippers, tip to tip at rest', [ul.tipX + ul.r1, ul.tipY], [ur.tipX - ur.r1, ur.tipY]);
  const [da, db] = polyGap(L.UPPER_DRAIN_FLOOR.slice(2), L.UPPER_DRAIN_ROOF);
  push('Upper playfield drain lane, narrowest', da, db);
  push('Upper playfield top exit', [L.UPPER_EXIT_X[0], 130], [L.UPPER_EXIT_X[1], 130]);
  const [ka, kb] = polyGap([L.TUMBLER_BLOCK[0]], L.ARCH_INNER_L);
  push('Tumblers to the orbit wall', ka, kb);
  push('Skyway mouth (above the flare)', L.SKYWAY.walls.left[4], L.SKYWAY.walls.right[4]);
  push('Reactor funnel (drops down)', L.REACTOR.mouthL, L.REACTOR.mouthR);
  return out;
}
