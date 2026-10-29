import { Flipper, World, type ColliderOpts, type Segment } from '../../engine/physics';

export type P = [number, number];

export function arc(cx: number, cy: number, r: number, a0: number, a1: number, n: number): P[] {
  const pts: P[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

export function poly(world: World, pts: P[], o: ColliderOpts = {}, closed = false): Segment[] {
  const out: Segment[] = [];
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    out.push(world.seg(a[0], a[1], b[0], b[1], o));
  }
  return out;
}

/** Offset a center path into two parallel walls (for ramps / lanes). */
export function offsetPath(pts: P[], hw: number | number[]): { left: P[]; right: P[] } {
  const left: P[] = [];
  const right: P[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[Math.min(pts.length - 1, i + 1)];
    let tx = p1[0] - p0[0];
    let ty = p1[1] - p0[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    const w = typeof hw === 'number' ? hw : hw[i];
    left.push([pts[i][0] + ty * w, pts[i][1] - tx * w]);
    right.push([pts[i][0] - ty * w, pts[i][1] + tx * w]);
  }
  return { left, right };
}

/** Smooth a polyline with Chaikin corner cutting. */
export function smooth(pts: P[], iterations = 2): P[] {
  let cur = pts;
  for (let k = 0; k < iterations; k++) {
    const next: P[] = [cur[0]];
    for (let i = 0; i < cur.length - 1; i++) {
      const [ax, ay] = cur[i];
      const [bx, by] = cur[i + 1];
      next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
      next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    next.push(cur[cur.length - 1]);
    cur = next;
  }
  return cur;
}

export interface LowerSection {
  left: Flipper;
  right: Flipper;
  slingL: Segment;
  slingR: Segment;
  /** Geometry for drawing. */
  guides: P[][];
  slings: P[][];
}

/**
 * Standard flipper/sling/inlane/outlane block, mirrored around cx.
 * Outer walls are expected at cx ± 257.5.
 */
export function buildLowerSection(world: World, cx: number, onSling: (side: -1 | 1) => void): LowerSection {
  const guides: P[][] = [];
  const slings: P[][] = [];
  const kickers: Segment[] = [];
  for (const m of [1, -1] as const) {
    const X = (dx: number) => cx + m * dx;
    const guide: P[] = [
      [X(-202), 868],
      [X(-202), 965],
      [X(-111), 1040],
    ];
    poly(world, guide, { restitution: 0.3 });
    guides.push(guide);

    const A: P = [X(-165), 850];
    const B: P = [X(-165), 950];
    const C: P = [X(-111), 993];
    world.seg(A[0], A[1], B[0], B[1], { restitution: 0.5 });
    world.seg(B[0], B[1], C[0], C[1], { restitution: 0.5 });
    const k = world.seg(A[0], A[1], C[0], C[1], {
      restitution: 0.55,
      kick: 700,
      kickThreshold: 110,
      tag: 'sling',
      onHit: (h) => {
        if (h.speed >= 110) onSling(m === 1 ? -1 : 1);
      },
    });
    kickers.push(k);
    slings.push([A, B, C]);
  }
  // Pivots sit low enough under the inlane guides that a cradled ball rolls
  // down the bat when the flipper drops (at 1050 it wedged against the pivot).
  const left = new Flipper(cx - 99.5, 1056, 88, 0.52, -0.42);
  const right = new Flipper(cx + 99.5, 1056, 88, Math.PI - 0.52, Math.PI + 0.42);
  world.flippers.push(left, right);
  return { left, right, slingL: kickers[0], slingR: kickers[1], guides, slings };
}
