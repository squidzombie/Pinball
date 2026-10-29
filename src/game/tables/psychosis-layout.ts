// Cyber Psychosis playfield geometry, traced from the concept sketch and shared
// by the physics and the art. Table units: 600 x 1240, ball radius 14.
// The shooter lane is x 535-580 and runs all the way up into the Back Alley.

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

// ------------------------------------------------------------------ cabinet

export const LEFT_LOW: P[] = [
  [20, 1240],
  [20, 292],
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
/** One-way: plunged balls pass up into the Back Alley; balls coming down it are turned into the pops. */
export const GATE: P[] = [
  [535, 262],
  [578, 226],
];

// ------------------------------------------------------------------ Back Alley: the loop over the top, round the pops

const ALLEY_PATH = smooth(
  [
    [238, 152],
    [262, 134],
    [284, 112],
    [306, 90],
    [345, 70],
    [400, 60],
    [458, 63],
    [505, 78],
    [538, 105],
    [554, 140],
    [557.5, 180],
    [557.5, 215],
  ],
  2,
);
const alley = offsetPath(ALLEY_PATH, 22);
/** Outer wall: over the top and down into the cabinet's right wall. */
export const ALLEY_OUTER: P[] = [...alley.left, [580, 215]];
/** Inner wall round the pops. It stops short of the gate so balls coming down the right leg drop into the pops. */
export const ALLEY_INNER: P[] = alley.right.slice(0, -1);
export const ALLEY_CENTER = ALLEY_PATH;
/** Mouth of the left leg, facing the top flipper. Crossing it inward makes the shot. */
export const ALLEY_MOUTH: [P, P] = [alley.left[0], alley.right[0]];

// ------------------------------------------------------------------ pop bumpers (in the Back Alley loop)

export const BUMPERS: P[] = [
  [367, 178],
  [426, 144],
  [458, 207],
];
export const BUMPER_R = 27;

// ------------------------------------------------------------------ top-left: the Impound, its flipper, the Black Market flipper

/** The Impound: a steel lock box in the top-left corner with a window onto the locked balls. */
export const IMPOUND_BOX: P[] = [
  [30, 22],
  [178, 22],
  [178, 126],
  [160, 140],
  [42, 140],
  [30, 128],
];
/** Where locked balls sit behind the window, first to last. */
export const IMPOUND_SLOTS: P[] = [
  [74, 104],
  [106, 100],
  [138, 96],
];
/** Released balls drop out of the Impound's front onto the top flipper. */
export const IMPOUND_EXIT: P = [152, 150];
/** Machinery between the Impound and the Back Alley; its underside slopes balls back down. */
export const MACHINE: P[] = [
  [178, 22],
  [alley.left[0][0], 22],
  [alley.left[0][0], alley.left[0][1]],
  [178, 126],
];
/** The left wall above the Black Market flipper and the guide down to the top flipper's pivot. */
export const UPPER_LEFT: P[] = [
  [20, 292],
  [20, 160],
  [34, 140],
  [42, 140],
];
/** Guides run tangent over the flipper pivots so a ball rolls onto the bat instead of sitting in a pocket at the pivot. */
export const TOP_GUIDE: P[] = [
  [34, 140],
  [141, 176],
];
export const TOP_FLIPPER = { x: 150, y: 192, len: 60, rest: 0.48, up: -0.38, r0: 10, r1: 6 };
export const MID_FLIPPER = { x: 212, y: 330, len: 66, rest: 0.38, up: -0.45, r0: 11, r1: 6 };

/** Rubber post right of the Black Market flipper's tip: balls rolling off the top flipper bounce back onto the bat. */
export const MID_POST: P = [302, 318];

/** Everything between the duct and the Breach, under the Black Market flipper. */
export const LEFT_MASS: P[] = [
  [66, 298],
  [203, 315],
  [204, 342],
  [128, 362],
  [83, 441],
  [99, 580],
  [86, 700],
  [66, 640],
];
/**
 * The duct: a lane up the left side under the Skyway's wireform, shot from the right
 * flipper. One-way at the top, so the ball comes back down onto the guide and rolls
 * to the Black Market flipper.
 */
export const DUCT_GATE: P[] = [
  [20, 292],
  [66, 298],
];
export const DUCT_SENSOR: P[] = [
  [20, 420],
  [66, 420],
];

// ------------------------------------------------------------------ the Breach: scoop between two standup banks

export const BREACH: P = [152, 452];
/** Where a right flipper shot leaves the bat on its way to the Breach. */
const BREACH_SHOT: P = [290, 972];
/** Axis from the scoop down the shot line toward the right flipper. */
export const BREACH_AXIS = unit(sub(BREACH_SHOT, BREACH));
const bq = cw(BREACH_AXIS); // left of the axis, looking down it
const bAngle = Math.atan2(BREACH_AXIS[1], BREACH_AXIS[0]);
/** Cup behind the scoop, open down the channel. */
export const BREACH_CUP: P[] = arc(BREACH[0], BREACH[1], 24, bAngle + Math.PI * 0.45, bAngle + Math.PI * 1.55, 12);
const bat = (along: number, side: number): P => add(add(BREACH, BREACH_AXIS, along), bq, side);
/** Bank inner faces run from the cup down to the channel mouth. */
export const BANK_L = { top: BREACH_CUP[0], bottom: bat(172, 41), outer: bat(110, 84), peak: bat(-28, 64) };
export const BANK_R = { top: BREACH_CUP[BREACH_CUP.length - 1], bottom: bat(190, -41), outer: bat(110, -70), peak: bat(-40, -64) };
/** The scoop housing over the cup. */
export const BREACH_BOX: P[] = [BANK_L.peak, [128, 362], [196, 362], BANK_R.peak];
/** Three standups per bank, as fractions along the inner face. Left bank = B R E, right bank = A C H. */
export const STANDUP_T = [0.3, 0.52, 0.74, 0.96];
export const BREACH_LETTERS = ['B', 'R', 'E', 'A', 'C', 'H'];

// ------------------------------------------------------------------ the Reactor: drops guard a captive ball

/** Centre of the drop target line. */
export const REACTOR_MOUTH: P = [402, 600];
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
  /** Housing, bolted to the Skyway lane wall with a roof that sheds balls to the left. */
  shell: [r(0, -32), r(58, -38), r(100, -26), [SKY_LANE_X, 470], [SKY_LANE_X, 640], r(0, 32)] as P[],
  /** Centre of the round housing and its red eye, for the art. */
  eye: r(84, 0),
};
/** Roof over the top of the Skyway lane: balls falling down the right side roll onto the Reactor instead of into the lane. */
export const LANE_ROOF: P[] = [
  [535, 428],
  [SKY_LANE_X, 470],
];
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
 * Skyway: shot from the left flipper up the lane beside the Reactor, then the long
 * deck from the middle right to the upper left, and a wireform back down the left
 * to the left inlane. With the lock lit, the top bend feeds the Impound.
 */
export const SKYWAY = makeRamp(
  'skyway',
  [
    [512.5, 712],
    [512.5, 640],
    [512.5, 560],
    [510, 498],
    [498, 462],
    [474, 438],
    [436, 410],
    [330, 352],
    [220, 296],
    [130, 252],
    [98, 238],
    [70, 238],
    [52, 256],
    [43, 290],
    [42, 330],
    [42, 690],
    [48, 770],
    [62, 836],
    [93, 885],
  ],
  // flares on the Reactor side only: the right wall is the shooter lane's
  (s) => [22.5 + 12 * Math.max(0, 1 - s / 45), 22.5],
  [
    [0, 0],
    [120, 26],
    [250, 50],
    [420, 62],
    [640, 68],
    [760, 64],
    [1100, 40],
  ],
  140,
  640,
  700,
  200,
);
SKYWAY.divertAt = indexAt(SKYWAY.path, 700);

/** Black Market: shot from the upper flipper, over the pops into the market box on the right, wireform down to the right inlane. */
export const MARKET = makeRamp(
  'market',
  [
    [298, 238],
    [310, 214],
    [330, 200],
    [360, 200],
    [395, 214],
    [432, 238],
    [470, 268],
    [505, 302],
    [532, 338],
    [550, 378],
    [557, 425],
    [557, 760],
    [548, 828],
    [512, 868],
    [466, 888],
  ],
  (s) => {
    const w = 22 + 6 * Math.max(0, 1 - s / 30);
    return [w, w];
  },
  [
    [0, 0],
    [60, 30],
    [160, 58],
    [330, 66],
    [600, 56],
    [900, 44],
  ],
  130,
  330,
  380,
  60,
);

export const RAMPS = [SKYWAY, MARKET];

/** Wire lane from the Skyway's top bend up into the Impound, for the lock animation. */
export const IMPOUND_LANE: P[] = [SKYWAY.path[SKYWAY.divertAt!], [56, 230], [50, 176], [56, 140]];

/** The Black Market box: the elevated platform where the ramp turns down the right side. */
export const MARKET_BOX: P[] = [
  [462, 296],
  [574, 296],
  [574, 400],
  [520, 400],
  [462, 352],
];

// ------------------------------------------------------------------ lower playfield

/** Mode map inserts in the centre: a tree from INFILTRATE down to BLACKOUT. */
export const MAP = {
  infiltrate: [CX, 712] as P,
  hack: [CX - 62, 778] as P,
  route: [CX + 62, 778] as P,
  payload: [CX - 62, 842] as P,
  extract: [CX + 62, 842] as P,
  blackout: [CX, 894] as P,
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
/** Turbine on the shooter lane wall where the sketch has its skill shot wheel. */
export const TURBINE: P = [522, 770];
