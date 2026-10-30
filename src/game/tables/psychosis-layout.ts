// Cyber Psychosis playfield geometry, shared by the physics, the art and the art template.
// Table units: 600 x 1240, ball radius 14 (diameter 28).
//
// A classic fan: every major shot is made from the two lower flippers. Left to right:
// Back Alley (left orbit), SAFE, Breach (scoop between two standup banks), Black Market
// (centre ramp), the pop exit, Reactor (drops and captive ball), VENT, Skyway (right ramp).
// Over the top: the orbit/plunger arch, three CAM lanes and the pop nest under them.

import { arc, offsetPath, smooth, type P } from './geom';

export const CX = 277.5; // flipper centre line
export const BALL_R = 14;

// ------------------------------------------------------------------ vectors

export const add = (a: P, b: P, k = 1): P => [a[0] + b[0] * k, a[1] + b[1] * k];
export const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
export const unit = (v: P): P => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};
/** Rotate 90° clockwise on screen. */
export const cw = (v: P): P => [-v[1], v[0]];
export const along = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** Lower flipper pivots. */
export const LF: P = [178, 1056];
export const RF: P = [377, 1056];

function cumulative(path: P[]) {
  const len = [0];
  for (let i = 1; i < path.length; i++) len.push(len[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  return len;
}

function indexAt(path: P[], dist: number) {
  const len = cumulative(path);
  const i = len.findIndex((l) => l >= dist);
  return i < 0 ? path.length - 1 : i;
}

function nearestIndex(path: P[], p: P) {
  let best = 0;
  for (let i = 1; i < path.length; i++) if (Math.hypot(path[i][0] - p[0], path[i][1] - p[1]) < Math.hypot(path[best][0] - p[0], path[best][1] - p[1])) best = i;
  return best;
}

/** Where a polyline crosses the vertical line x (first crossing), as [segment index, point]. */
function crossX(path: P[], x: number): [number, P] {
  for (let i = 0; i < path.length - 1; i++) {
    const [a, b] = [path[i], path[i + 1]];
    if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) {
      const t = (x - a[0]) / (b[0] - a[0]);
      return [i, [x, a[1] + (b[1] - a[1]) * t]];
    }
  }
  throw new Error(`path never crosses x=${x}`);
}

// ------------------------------------------------------------------ cabinet

export const LEFT_LOW: P[] = [
  [20, 1240],
  [20, 650],
];
export const RIGHT_WALL: P[] = [
  [580, 1180],
  [580, 200],
];
export const SHOOTER_FLOOR: P[] = [
  [580, 1180],
  [535, 1180],
];
export const PLUNGER_WALL: P[] = [
  [535, 1240],
  [535, 262],
];
/** One-way at the top of the shooter lane: plunged balls pass up onto the arch. */
export const GATE: P[] = [
  [535, 262],
  [578, 226],
];

// ------------------------------------------------------------------ the arch: Back Alley orbit up the left, over the top, plunger down the right

/**
 * Centre line of the orbit lane, clockwise: up the left side from the Back Alley's mouth,
 * round the top over the CAM lanes, down the right leg into the top of the shooter lane.
 * The plunge runs it the other way.
 */
export const ARCH_PATH = smooth(
  [
    [42, 650],
    [42, 420],
    [42, 300],
    [46, 240],
    [60, 185],
    [86, 136],
    [124, 96],
    [172, 66],
    [228, 49],
    [285, 43],
    [350, 46],
    [410, 51],
    [460, 57],
    [500, 67],
    [532, 90],
    [550, 120],
    [557.5, 165],
    [557.5, 215],
  ],
  2,
);
const arch = offsetPath(ARCH_PATH, 22);
/** Outer wall: the cabinet's left side, the top arch and the right leg. */
export const ARCH_OUTER: P[] = [...arch.left, [580, 215]];
/** The orbit's full inner line, open over the CAM lanes (for drawing the lane floor). */
export const ARCH_INNER: P[] = arch.right;

/** CAM 1-3: rollover lanes under the top of the arch, between rubber-capped guide posts. */
export const LANE_POST_X = [306, 356, 406, 456];
export const LANE_POST_R = 5;
export const LANE_BOTTOM = 124;
const innerAt = (x: number) => crossX(arch.right, x);
const outerAt = (x: number) => crossX(arch.left, x);
export const LANE_POSTS: P[] = LANE_POST_X.map((x) => innerAt(x)[1]);
/** Lane guides from each post down to the nest. */
export const LANE_GUIDES: [P, P][] = LANE_POSTS.map((p) => [p, [p[0], LANE_BOTTOM]]);
/** [x0, x1] of each CAM lane, left to right, and the height of their rollover switches. */
export const CAM_LANES: [number, number][] = [0, 1, 2].map((i) => [LANE_POST_X[i], LANE_POST_X[i + 1]]);
export const CAM_Y = 98;

/** Inner wall of the orbit: from the Back Alley's mouth up round the top-left to the CAM 1 post. */
export const ARCH_INNER_L: P[] = (() => {
  const [i, p] = innerAt(LANE_POST_X[0]);
  return [...arch.right.slice(0, i + 1), p];
})();
/** Inner wall from the CAM 3 post round the top right and down the right leg to the shooter gate. */
export const ARCH_INNER_R: P[] = (() => {
  const [i, p] = innerAt(LANE_POST_X[3]);
  return [p, ...arch.right.slice(i + 1), [535.5, 262]];
})();
/** Post at the foot of the orbit's inner wall; the wall flares out to it, widening the mouth. */
export const ORBIT_POST: P = [80, 692];
export const ORBIT_FLARE: P[] = [arch.right[0], ORBIT_POST];

/**
 * One-way gate at the CAM 1 end: a Back Alley shot passes over the lanes; a plunge that
 * overshoots them bounces off it and drops into a lane.
 */
export const LEFT_GATE: P[] = [outerAt(LANE_POST_X[0])[1], LANE_POSTS[0]];
/**
 * The Back Alley diverter at the CAM 3 end: one-way, so the plunge passes it into the
 * lanes, but a Back Alley shot bounces off it and drops into a lane. Held open (for
 * combos and some modes) it lets the shot loop all the way round and down the right leg.
 */
export const DIVERTER: P[] = [LANE_POSTS[3], outerAt(LANE_POST_X[3])[1]];
/**
 * The Back Alley switch, at the top of the arch just before the CAM lanes: crossed clockwise, the
 * shot is made. From here the top run slopes gently down to the lanes, so a ball that crosses it
 * always reaches them; the plunge, coming the other way, climbs it and slows into the lanes.
 */
export const ALLEY_SWITCH: [P, P] = [outerAt(LANE_POST_X[0] - 24)[1], innerAt(LANE_POST_X[0] - 24)[1]];
/** Mouth of the orbit, facing the right flipper. */
export const ALLEY_MOUTH: [P, P] = [[20, ORBIT_POST[1]], ORBIT_POST];

// ------------------------------------------------------------------ the pop nest under the CAM lanes

export const BUMPERS: P[] = [
  [343, 205],
  [457, 205],
  [400, 304],
];
/** Collision ring; the drawn skirt is a little wider (about three balls across). */
export const BUMPER_R = 36;
export const BUMPER_SKIRT_R = 42;

/** Left wall of the nest, from the arch down to its floor. */
export const NEST_LEFT: P[] = [innerAt(265)[1], [265, 330]];
/** The nest's floor slopes down to the right, to the exit. */
export const NEST_FLOOR: P[] = [
  [265, 330],
  [440, 420],
];
/** The nest's one exit, at the bottom right, over the exit lane. */
export const NEST_EXIT: [P, P] = [
  [440, 420],
  [490, 415],
];
/** Floor of the nest's right side, from the shooter lane wall down to the exit. */
export const NEST_RIGHT: P[] = [
  [535, 350],
  [490, 415],
];
/** The whole nest, for drawing its deck: under the lanes, between its walls, down to the exit. */
export const NEST_AREA: P[] = [innerAt(265)[1], ...arch.right.filter((p) => p[0] > 265), [535.5, 262], ...NEST_RIGHT, NEST_EXIT[0], NEST_FLOOR[0]];

// ------------------------------------------------------------------ the Reactor: drops guard a captive ball

/** Centre of the drop target line. */
export const REACTOR_MOUTH: P = [352, 560];
/** From the drops up toward the core (away from the left flipper). */
export const REACTOR_AXIS = unit(sub(REACTOR_MOUTH, LF));
export const REACTOR_PERP = cw(REACTOR_AXIS); // across the lane, pointing right-down
const r = (along: number, side: number): P => add(add(REACTOR_MOUTH, REACTOR_AXIS, along), REACTOR_PERP, side);
/** The Skyway's entry lane runs up the Reactor's right side. */
export const SKY_LANE_X = 490;
export const REACTOR = {
  mouthL: r(0, -32),
  mouthR: r(0, 32),
  /** Funnel narrows to the captive ball channel. */
  channelL0: r(19.5, -17),
  channelR0: r(19.5, 17),
  channelL1: r(70, -17),
  channelR1: r(70, 17),
  /** Lip that keeps the captive ball in: opening narrower than a ball. */
  lipL: r(19.5, -9),
  lipR: r(19.5, 9),
  core: r(84, 0),
  coreR: 20,
  /** Captive ball travel along the axis: resting on the lip .. touching the core. */
  restS: 19.5 + 10.7,
  topS: 84 - 20 - 14,
  pos: (s: number): P => r(s, 0),
  /** The round housing, for the art. */
  shell: [r(0, -32), r(58, -38), r(100, -26), r(108, 30), r(40, 48), r(0, 32)] as P[],
  /** Centre of the round housing and its red eye, for the art. */
  eye: r(84, 0),
};
/** The three drop targets across the funnel mouth. */
export const DROPS: [P, P][] = [0, 1, 2].map((i) => [r(0, -32 + (64 / 3) * i), r(0, -32 + (64 / 3) * (i + 1))]);

// ------------------------------------------------------------------ the pop exit lane, between the Reactor and the Skyway

export const EXIT_X: [number, number] = [440, SKY_LANE_X];
export const EXIT_BOTTOM = 628;
/**
 * The lane narrows at the bottom into a short chute centred over the right inlane, so a ball
 * leaving the pops drops straight into the inlane, clear of the slingshot's top corner.
 */
const CHUTE_X: [number, number] = [445, 475];
/** Left wall of the exit lane: the Reactor housing's right side. */
export const EXIT_LANE_L: P[] = [NEST_EXIT[0], [EXIT_X[0], 520], [CHUTE_X[0], 565], [CHUTE_X[0], EXIT_BOTTOM]];
/** Right wall: beside the Skyway's lane. */
export const EXIT_LANE_R: P[] = [NEST_EXIT[1], [EXIT_X[1], 520], [CHUTE_X[1], 565], [CHUTE_X[1], EXIT_BOTTOM]];
/** One-way gate at the bottom of the exit lane: balls leave the pops through it; shots from below bounce off. */
export const EXIT_GATE: P[] = [
  [CHUTE_X[1], EXIT_BOTTOM],
  [CHUTE_X[0], EXIT_BOTTOM],
];
/** VENT: a standup on the Reactor's right flank, facing the left flipper. */
const VENT_SPAN: [P, P] = [r(0, 32), [CHUTE_X[0], EXIT_BOTTOM]];
export const VENT: [P, P] = [along(VENT_SPAN[0], VENT_SPAN[1], 0.12), along(VENT_SPAN[0], VENT_SPAN[1], 0.82)];
// ------------------------------------------------------------------ the Breach: scoop between two standup banks

/** The scoop's cup. */
export const BREACH: P = [150, 462];
/** Axis out of the scoop toward the right flipper, where the shot comes from. */
export const BREACH_AXIS = unit(sub([330, 1030], BREACH));
const bq = cw(BREACH_AXIS); // to the screen-left of the axis looking out
const bAngle = Math.atan2(BREACH_AXIS[1], BREACH_AXIS[0]);
const bAt = (out: number, side: number): P => add(add(BREACH, BREACH_AXIS, out), bq, side);
/** Cup at the back of the scoop, open toward the mouth. */
export const BREACH_CUP: P[] = arc(BREACH[0], BREACH[1], 23, bAngle + Math.PI * 0.5, bAngle + Math.PI * 1.5, 12);
/** The scoop throat: walls from the cup to the mouth, funnelling out at the lip. */
export const BREACH_THROAT = {
  left: [BREACH_CUP[0], bAt(26, 22), bAt(44, 29)] as P[],
  right: [BREACH_CUP[BREACH_CUP.length - 1], bAt(26, -22), bAt(44, -29)] as P[],
};
/** Mouth of the scoop: [screen-left post, screen-right post]. */
export const BREACH_MOUTH: [P, P] = [bAt(44, 29), bAt(44, -29)];
export const BANK_LEN = 48;
/** A standup bank facing `toward`, running from `start` away from the scoop (side -1 = left, +1 = right). */
function bank(start: P, toward: P, side: number): [P, P] {
  const n = unit(sub(toward, start));
  // along the face, away from the scoop
  const t: P = side < 0 ? [-n[1], n[0]] : [n[1], -n[0]];
  return [start, add(start, t, BANK_LEN)];
}
/**
 * Each bank faces the opposite flipper: B-R-E the right flipper's pivot, A-C-H the middle of the
 * left flipper's bat. Measured so that a hit comes back onto a flipper, not down the middle.
 */
export const RF_BAT: P = [377, 1056];
export const LF_BAT: P = [217, 1066];
/** B-R-E: left of the mouth, faces the right flipper. Runs from the mouth outward. */
export const BANK_L: [P, P] = bank(BREACH_MOUTH[0], RF_BAT, -1);
/** A-C-H: right of the mouth, faces the left flipper. Runs from the mouth outward. */
export const BANK_R: [P, P] = bank(BREACH_MOUTH[1], LF_BAT, 1);
/** Six standups: B R E (outer to inner on the left bank), A C H (inner to outer on the right). */
export const STANDUPS: [P, P][] = [
  ...[2, 1, 0].map((k) => [along(BANK_L[0], BANK_L[1], k / 3), along(BANK_L[0], BANK_L[1], (k + 1) / 3)].reverse() as [P, P]),
  ...[0, 1, 2].map((k) => [along(BANK_R[0], BANK_R[1], k / 3), along(BANK_R[0], BANK_R[1], (k + 1) / 3)] as [P, P]),
];
export const BREACH_LETTERS = ['B', 'R', 'E', 'A', 'C', 'H'];

/** Wall from the end of the B-R-E bank back to the orbit's inner wall. */
export const SAFE_WALL: P[] = [BANK_L[1], [64, 584]];
/**
 * SAFE: a standup on the playfield face of the orbit's inner wall, below the B-R-E bank,
 * where right flipper shots at about 113-119° would otherwise hit plain wall.
 */
export const SAFE: [P, P] = [
  [68, 590],
  [68, 646],
];

// ------------------------------------------------------------------ the Impound, top left inside the orbit

export const IMPOUND_BOX: P[] = [
  [150, 96],
  [244, 78],
  [244, 186],
  [112, 186],
  [112, 140],
];
/** Where locked balls sit behind the window, first to last. */
export const IMPOUND_SLOTS: P[] = [
  [148, 150],
  [180, 150],
  [212, 150],
];

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
  /** Index where a lit lock diverts the ball (Skyway only). */
  divertAt?: number;
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

/**
 * Skyway: shot from the left flipper up the lane beside the Reactor, then a deck across
 * under the pop nest (over the Black Market's climb) and up to the Impound, and a
 * wireform down the left to the left inlane. With the lock lit, the top bend feeds the Impound.
 */
export const SKYWAY = makeRamp(
  'skyway',
  [
    [512.5, 712],
    [512.5, 640],
    [512.5, 570],
    [510, 528],
    [500, 496],
    [480, 474],
    [448, 462],
    [400, 458],
    [330, 456],
    [272, 450],
    [234, 430],
    [207, 400],
    [187, 364],
    [168, 328],
    [146, 298],
    [116, 278],
    [86, 276],
    [62, 292],
    [48, 324],
    [43, 364],
    [42, 420],
    [42, 680],
    [48, 740],
    [66, 780],
    [88, 806],
    [94, 836],
    [94, 906],
  ],
  // flares on the Reactor side only: the right wall is the shooter lane's
  (s) => [22.5 + 10 * Math.max(0, 1 - s / 45), 22.5],
  [
    [0, 0],
    [120, 26],
    [260, 52],
    [420, 64],
    [640, 66],
    [800, 60],
    [1200, 40],
  ],
  140,
  600,
  780,
  200,
);
SKYWAY.divertAt = nearestIndex(SKYWAY.path, [100, 276]);
/** The shot counts once the ball is over the top, at the bend into the Impound. */
SKYWAY.madeAt = SKYWAY.divertAt - 3;

/**
 * Black Market: the centre ramp, from either flipper. Straight up under the Skyway, right
 * along the bottom of the pop nest into the market box over the shooter lane, and a
 * wireform down the right to the right inlane.
 */
export const MARKET = makeRamp(
  'market',
  [
    [CX - 6, 498],
    [CX - 6, 468],
    [276, 444],
    [294, 424],
    [320, 412],
    [370, 410],
    [440, 410],
    [495, 413],
    [530, 426],
    [550, 448],
    [557.5, 480],
    [557.5, 690],
    [550, 750],
    [524, 786],
    [480, 808],
    [462, 836],
    [461, 906],
  ],
  (s) => {
    const w = 22 + 6 * Math.max(0, 1 - s / 30);
    return [w, w];
  },
  [
    [0, 0],
    [60, 28],
    [140, 50],
    [300, 62],
    [500, 54],
    [850, 40],
  ],
  130,
  300,
  360,
  58,
);

export const RAMPS = [SKYWAY, MARKET];

/** Where a wireform hands the ball back to the floor: its last segment, already inside the inlane. */
export const RAMP_LANDING = 2;
/** Dropping off the wire into the inlane soaks up energy: the ball leaves along the wire at no more than this. */
export const LANDING_SPEED = 900;

/** Closes the gap between the A-C-H bank and the Black Market's mouth. */
export const BANK_R_WALL: P[] = [BANK_R[1], MARKET.walls.left[0]];
/** The Black Market's right lip, which is also the Reactor housing's left side. */
export const MARKET_LIP: P[] = [MARKET.walls.right[0], REACTOR.mouthL];

/**
 * Back Alley loop: with the diverter open, the shot comes round the top and down the right
 * leg into a chute that drops it onto the Black Market's wire to the right inlane. A weak
 * plunge that falls back from the top takes the same way. The plunge goes up the leg on the
 * floor and never meets it.
 */
const CHUTE_TOP = 205;
const CHUTE_L = 535.5;
const CHUTE_R = 579.5;
const mergeAt = MARKET.path.findIndex((p) => p[1] >= 470 && p[0] > 555);
export const ALLEY_EXIT: RampDef = (() => {
  const head: P[] = [
    [557.5, CHUTE_TOP],
    [557.5, 270],
    [557.5, 340],
    [557.5, 410],
  ];
  const path = [...head, ...MARKET.path.slice(mergeAt)];
  const zm = MARKET.z[mergeAt];
  const z = [...head.map((_, i) => (zm * i) / head.length), ...MARKET.z.slice(mergeAt)];
  return { id: 'market', path, walls: { left: [], right: [] }, z, madeAt: Infinity, wireFrom: 0, baseTo: 0, entry: [head[0], head[0]] };
})();
/** The chute's walls, and the crossing line at its top that hands a falling ball to it. */
export const CHUTE = {
  entry: [
    [CHUTE_L, CHUTE_TOP],
    [CHUTE_R, CHUTE_TOP],
  ] as [P, P],
  left: [
    [CHUTE_L, CHUTE_TOP],
    [CHUTE_L, 306],
  ] as P[],
  right: [
    [CHUTE_R, CHUTE_TOP],
    [CHUTE_R, MARKET.path[mergeAt][1]],
  ] as P[],
};
/** The market ramp's outer wall, cut where it would cross the chute: [up to the chute, below the merge]. */
export const MARKET_OUTER: [P[], P[]] = (() => {
  const w = MARKET.walls.left;
  const inside = (p: P) => p[0] > CHUTE_L && p[1] < MARKET.path[mergeAt][1] && p[1] > CHUTE_TOP;
  const first = w.findIndex(inside);
  let last = first;
  while (last + 1 < w.length && inside(w[last + 1])) last++;
  const a = w[first - 1];
  const b = w[first];
  const t = (CHUTE_L - a[0]) / (b[0] - a[0]);
  const cut: P = [CHUTE_L, a[1] + (b[1] - a[1]) * t];
  return [
    [...w.slice(0, first), cut],
    [[CHUTE_R, MARKET.path[mergeAt][1]], ...w.slice(last + 1)],
  ];
})();

/** Guards at both side lanes: rubber deflectors that turn balls rolling down the walls away from the outlanes. */
export const GUARD_L: P[] = [
  [20, 712],
  [56, 758],
];
export const GUARD_R: P[] = [
  [535, 712],
  [510, 744],
];

/** Wire lane from the Skyway's top bend up into the Impound, for the lock animation. */
export const IMPOUND_LANE: P[] = [SKYWAY.path[SKYWAY.divertAt!], [112, 240], [128, 196], [138, 168]];

/** The Black Market box: the raised platform over the shooter lane where the ramp turns down. */
export const MARKET_BOX: P[] = [
  [488, 384],
  [580, 384],
  [580, 486],
  [534, 486],
  [500, 452],
];

// ------------------------------------------------------------------ sealed areas (nothing rolls there; the art fills them)

/**
 * Everything between the orbit, the fan and the nest that no ball reaches: under the
 * Skyway's climb and the Black Market's turn. The Impound and the Reactor housing sit in it.
 */
export const SEALED: P[] = [
  ...ARCH_INNER_L.filter((p) => p[0] < 265 && p[1] < 584),
  innerAt(265)[1],
  ...NEST_LEFT.slice(1),
  ...NEST_FLOOR.slice(1),
  ...EXIT_LANE_L.slice(1),
  VENT[1],
  VENT[0],
  REACTOR.mouthR,
  REACTOR.channelR0,
  REACTOR.channelR1,
  REACTOR.channelL1,
  REACTOR.channelL0,
  REACTOR.mouthL,
  ...MARKET_LIP.slice().reverse().slice(1),
  ...MARKET.walls.right.slice(1, MARKET.baseTo + 1),
  ...MARKET.walls.left.slice(0, MARKET.baseTo + 1).reverse(),
  BANK_R[1],
  BANK_R[0],
  ...BREACH_THROAT.right.slice().reverse(),
  ...BREACH_CUP.slice().reverse(),
  ...BREACH_THROAT.left,
  BANK_L[1],
  SAFE_WALL[1],
];
/** Under the Skyway's bend and the market box, right of the exit lane. */
export const BEHIND_SKYWAY: P[] = [NEST_RIGHT[0], NEST_RIGHT[1], ...EXIT_LANE_R.slice(1), [SKY_LANE_X, EXIT_BOTTOM], [SKY_LANE_X, SKYWAY.walls.left[SKYWAY.baseTo][1]], SKYWAY.walls.right[SKYWAY.baseTo]];

// ------------------------------------------------------------------ lower playfield

/** Mode map inserts in the centre: a tree from INFILTRATE down to BLACKOUT. */
export const MAP = {
  infiltrate: [CX, 736] as P,
  hack: [CX - 62, 800] as P,
  route: [CX + 62, 800] as P,
  payload: [CX - 62, 862] as P,
  extract: [CX + 62, 862] as P,
  blackout: [CX, 914] as P,
};

/** In/outlane rollovers spell R-A-G-E: [x0, x1] per lane, left to right. */
export const ROLL_Y = 910;
export const ROLLOVERS: [number, number][] = [
  [20, 75.5],
  [75.5, 112.5],
  [442.5, 479.5],
  [479.5, 535],
];

/** Security camera on the cabinet's top right corner. */
export const CAMERAS: P[] = [[562, 30]];
