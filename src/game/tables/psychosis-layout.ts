// Cyber Psychosis playfield geometry, shared by the physics and the art.
// Table units: 600 x 1200, ball radius 14. The shooter lane is x 535-580.

import { arc, offsetPath, smooth, type P } from './geom';

export const CX = 277.5; // flipper centre line

// ------------------------------------------------------------------ vectors

export const add = (a: P, b: P, k = 1): P => [a[0] + b[0] * k, a[1] + b[1] * k];
export const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
export const unit = (v: P): P => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};
/** Rotate 90° clockwise on screen. */
export const cw = (v: P): P => [-v[1], v[0]];
const LF: P = [178, 1056]; // lower left flipper pivot

// ------------------------------------------------------------------ cabinet

export const OUTER: P[] = [[20, 1240], [20, 300], ...arc(300, 300, 280, Math.PI, Math.PI * 2, 56), [580, 1180], [535, 1180]];
export const PLUNGER_WALL: P[] = [
  [535, 1240],
  [535, 300],
];
/** One-way: balls only pass from the shooter lane side. */
export const GATE: P[] = [
  [535, 300],
  [577, 262],
];

// ------------------------------------------------------------------ Back Alley orbit

/** Inner wall of the orbit channel over the top; the bumpers sit inside it. */
export const ALLEY_INNER: P[] = arc(CX, 300, 192.5, Math.PI, Math.PI * 2, 48);
/** Left lane inner wall, top piece. Between it and the diverter the lane opens onto the upper flipper. */
export const LEFT_WALL_TOP: P[] = [
  [85, 300],
  [85, 328],
];
export const LEFT_WALL_LOW: P[] = [
  [85, 393],
  [85, 690],
  [95, 700],
];
/** One-way diverter: balls coming down the left lane are turned onto the upper flipper; balls going up pass. */
export const DIVERTER: P[] = [
  [20, 330],
  [85, 392],
];
export const RIGHT_WALL: P[] = [
  [470, 300],
  [470, 620],
  [478, 630],
];
export const DEFLECT_L: P[] = [
  [20, 712],
  [56, 758],
];
export const DEFLECT_R: P[] = [
  [535, 712],
  [499, 758],
];
/** Orbit switches: crossing these upward makes the shot. */
export const ALLEY_L_SENSOR: P[] = [
  [20, 300],
  [85, 300],
];
export const ALLEY_R_SENSOR: P[] = [
  [470, 330],
  [535, 330],
];
export const SPINNER_Y = 470;

// ------------------------------------------------------------------ upper flipper

/** Pivot sits just inside the lane wall so a cradled ball rolls onto the bat, not into a pocket. */
export const UPPER = { x: 93, y: 450, len: 66, rest: 0.6, up: -0.45, r0: 11, r1: 6 };

// ------------------------------------------------------------------ pop bumpers (inside the orbit)

export const BUMPERS: P[] = [
  [350, 165],
  [415, 215],
  [360, 245],
];
export const BUMPER_R = 24;

// ------------------------------------------------------------------ the Impound (ball lock), top-left cabinet corner

/** The cage sits outside the playfield in the cabinet corner; the orbit feeds it. */
export const IMPOUND_BOX: P[] = [
  [26, 28],
  [120, 28],
  [120, 70],
  [66, 132],
  [26, 132],
];
/** Where locked balls sit, first to last. */
export const IMPOUND_SLOTS: P[] = [
  [46, 108],
  [70, 82],
  [96, 54],
];
/** Released balls drop back into the orbit and ride down to the upper flipper. */
export const IMPOUND_EXIT: P = [46, 214];
/** Lock lane the captured ball rolls along from the orbit up into the cage. */
export const IMPOUND_LANE: P[] = [
  [52, 300],
  [38, 238],
  [40, 176],
  [46, 140],
];

// ------------------------------------------------------------------ the Breach: scoop between two standup banks

export const BREACH: P = [196, 520];
/** Where a fast right flipper shot leaves the bat on its way to the Breach. */
const BREACH_SHOT: P = [305, 972];
/** Axis from the scoop down the shot line toward the right flipper. */
export const BREACH_AXIS = unit(sub(BREACH_SHOT, BREACH));
const bq = cw(BREACH_AXIS); // points left of the axis, looking down it (toward the left bank)
const bAngle = Math.atan2(BREACH_AXIS[1], BREACH_AXIS[0]);
/** Cup behind the scoop, open toward the right flipper. */
export const BREACH_CUP: P[] = arc(BREACH[0], BREACH[1], 24, bAngle + Math.PI * 0.45, bAngle + Math.PI * 1.55, 12);
const at = (along: number, side: number): P => add(add(BREACH, BREACH_AXIS, along), bq, side);
/** Bank inner faces run from the cup down to the funnel mouth. */
export const BANK_L = { top: BREACH_CUP[0], bottom: at(104, 38), outer: at(88, 70) };
export const BANK_R = { top: BREACH_CUP[BREACH_CUP.length - 1], bottom: at(104, -38), outer: at(88, -62) };
/** Three standups per bank, as fractions along the inner face. Left bank = B R E, right bank = A C H. */
export const STANDUP_T = [0.22, 0.47, 0.72, 0.97];
export const BREACH_LETTERS = ['B', 'R', 'E', 'A', 'C', 'H'];

// ------------------------------------------------------------------ the Reactor: drops guard a captive ball

export const REACTOR_MOUTH: P = [390, 610];
/** From the mouth up toward the core (away from the left flipper). */
export const REACTOR_AXIS = unit(sub(REACTOR_MOUTH, LF));
export const REACTOR_PERP = cw(REACTOR_AXIS); // across the lane, pointing right-down
const r = (along: number, side: number): P => add(add(REACTOR_MOUTH, REACTOR_AXIS, along), REACTOR_PERP, side);
export const REACTOR = {
  mouthL: r(0, -32),
  mouthR: r(0, 32),
  /** Funnel narrows to the captive ball channel. */
  channelL0: r(34, -17),
  channelR0: r(34, 17),
  channelL1: r(104, -17),
  channelR1: r(104, 17),
  /** Lip that keeps the captive ball in: opening narrower than a ball. */
  lipL: r(34, -9),
  lipR: r(34, 9),
  core: r(118, 0),
  coreR: 24,
  /** Captive ball travel along the axis: resting on the lip .. touching the core. */
  restS: 34 + 10.7,
  topS: 104 - 14,
  pos: (s: number): P => r(s, 0),
  /** Outer shell, bolted to the right wall with a sloped roof so nothing settles between them. */
  shell: [r(0, -32), r(110, -30), r(132, -12), [470, 466], [470, 526], r(110, 30), r(0, 32)] as P[],
};
/** The three drop targets across the funnel mouth. */
export const DROPS: [P, P][] = [0, 1, 2].map((i) => [r(0, -32 + (64 / 3) * i), r(0, -32 + (64 / 3) * (i + 1))]);

// ------------------------------------------------------------------ ramps

export interface RampDef {
  id: 'skyway' | 'market';
  path: P[];
  walls: { left: P[]; right: P[] };
  z: number[];
  /** Index from which the shot counts as made. */
  madeAt: number;
  /** Index from which the ramp is a wireform (art). */
  wireFrom: number;
  /** Floor-level base: walls block floor balls up to this index. */
  baseTo: number;
  /** Entry line across the mouth. */
  entry: [P, P];
}

function cumulative(path: P[]) {
  const len = [0];
  for (let i = 1; i < path.length; i++) len.push(len[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  return len;
}

/** Height profile from [distance, height] anchors measured from the mouth, falling to 0 over `landing` at the end. */
function profile(path: P[], anchors: [number, number][], landing: number) {
  const len = cumulative(path);
  const total = len[len.length - 1];
  return len.map((s) => {
    let z = anchors[anchors.length - 1][1];
    for (let k = 1; k < anchors.length; k++) {
      if (s <= anchors[k][0]) {
        const [s0, z0] = anchors[k - 1];
        const [s1, z1] = anchors[k];
        const t = (s - s0) / (s1 - s0);
        z = z0 + (z1 - z0) * (t * t * (3 - 2 * t));
        break;
      }
    }
    const fromEnd = total - s;
    if (fromEnd < landing) z *= Math.max(0, fromEnd / landing) ** 0.8;
    return z;
  });
}

function indexAt(path: P[], dist: number) {
  const len = cumulative(path);
  return Math.max(0, len.findIndex((l) => l >= dist));
}

/** `hw` gives the [left, right] half widths at a distance along the path, so a mouth can flare into a funnel. */
function makeRamp(id: RampDef['id'], ctrl: P[], hw: (s: number) => [number, number], anchors: [number, number][], landing: number, made: number, wire: number, base: number): RampDef {
  const path = smooth(ctrl, 2);
  const widths = cumulative(path).map(hw);
  const walls = {
    left: offsetPath(
      path,
      widths.map((w) => w[0]),
    ).left,
    right: offsetPath(
      path,
      widths.map((w) => w[1]),
    ).right,
  };
  const z = profile(path, anchors, landing);
  return {
    id,
    path,
    walls,
    z,
    madeAt: indexAt(path, made),
    wireFrom: indexAt(path, wire),
    baseTo: indexAt(path, base),
    entry: [walls.left[0], walls.right[0]],
  };
}

/** Skyway: shot from the left flipper at mid-right, sweeps up to the top left, wireform back to the left inlane. */
export const SKYWAY = makeRamp(
  'skyway',
  [
    [345, 470],
    [352, 430],
    [354, 395],
    [347, 364],
    [330, 338],
    [302, 318],
    [264, 306],
    [220, 300],
    [170, 298],
    [130, 298],
    [96, 302],
    [70, 316],
    [54, 342],
    [50, 390],
    [50, 760],
    [58, 830],
    [93, 885],
  ],
  // the left side flares to catch the steeper shots off the left flipper
  (s) => [25 + 18 * Math.max(0, 1 - s / 70), 25 + 6 * Math.max(0, 1 - s / 30)],
  [
    [0, 0],
    [60, 24],
    [130, 44],
    [320, 64],
    [420, 66],
    [700, 52],
  ],
  130,
  330,
  360,
  105,
);

/** Black Market: shot straight up from the upper flipper, arcs over the top, wireform down the right side to the right inlane. */
export const MARKET = makeRamp(
  'market',
  [
    [179, 246],
    [184, 214],
    [196, 180],
    [220, 150],
    [256, 126],
    [302, 112],
    [352, 106],
    [402, 110],
    [448, 128],
    [486, 162],
    [506, 214],
    [507, 300],
    [503, 400],
    [503, 760],
    [496, 830],
    [461, 885],
  ],
  (s) => {
    const w = 22 + 24 * Math.max(0, 1 - s / 38);
    return [w, w];
  },
  [
    [0, 0],
    [50, 30],
    [120, 56],
    [260, 64],
    [500, 56],
    [900, 46],
  ],
  130,
  260,
  300,
  60,
);

export const RAMPS = [SKYWAY, MARKET];

// ------------------------------------------------------------------ lower playfield

/** Mode map inserts in the centre. */
export const MAP = {
  infiltrate: [CX, 668] as P,
  hack: [CX - 64, 728] as P,
  route: [CX + 64, 728] as P,
  payload: [CX - 64, 792] as P,
  extract: [CX + 64, 792] as P,
  blackout: [CX, 850] as P,
};

/** In/outlane rollovers spell R-A-G-E: [x0, x1] per lane, left to right. */
export const ROLL_Y = 910;
export const ROLLOVERS: [number, number][] = [
  [20, 75.5],
  [75.5, 112.5],
  [442.5, 479.5],
  [479.5, 535],
];

/** Security cameras on the cabinet corners. */
export const CAMERAS: P[] = [[560, 46]];
