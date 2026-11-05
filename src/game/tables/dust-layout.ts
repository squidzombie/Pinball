// Dust & Lead playfield geometry, shared by the physics, the art and the measurement scripts.
// Table units: 600 x 1200 (about a millimetre each), ball radius 14 (28 across). Tuned for a 6.5°
// table: the ball flies nearly straight, so every entrance faces the flipper that shoots it.
//
// Left to right: the Railroad lane (left orbit, behind three drop targets), the Gold Mine ramp, the
// Gold Pan and the Jailhouse on the left; Main Street up the middle to High Noon; the Sheriff and
// Hardware building, the barrel pops and the Stagecoach ramp on the right; the Saloon lane (right
// orbit) and the shooter lane up the right side into the saloon, top right, with its own flipper.
// See docs/dust-and-lead/DESIGN.md.

import { arc, offsetPath, smooth, type P } from './geom';

export const CX = 277.5; // flipper centre line
export const BALL_R = 14;

const cumulative = (path: P[]) => {
  const len = [0];
  for (let i = 1; i < path.length; i++) len.push(len[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  return len;
};
export const indexAt = (path: P[], dist: number) => {
  const len = cumulative(path);
  const i = len.findIndex((l) => l >= dist);
  return i < 0 ? path.length - 1 : i;
};
export const pathLength = (path: P[]) => cumulative(path)[path.length - 1];
export const along = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ------------------------------------------------------------------ cabinet and the top arch

/** The cabinet's outer wall: up the left, round the top, down the right to the shooter lane's floor. */
export const OUTER: P[] = [[20, 1240], [20, 80], ...arc(82, 80, 62, Math.PI, Math.PI * 1.5, 10).slice(1), ...arc(518, 80, 62, -Math.PI / 2, 0, 10), [580, 1180]];
export const SHOOTER_FLOOR: P[] = [
  [580, 1180],
  [537, 1180],
];
/**
 * Between the shooter lane and the Saloon lane. At the top it curves left round the Saloon lane,
 * which bends with it into the saloon; the plunge runs on round the outside of the curve, along the
 * top to the saloon doors. (Straight lanes would send balls into the flat top wall and straight back.)
 */
export const BEND = { x: 458, y: 190 };
export const DIVIDER: P[] = [[537, 1240], ...arc(BEND.x, BEND.y, 79, 0, -Math.PI / 2, 12)];
export const SHOOTER = { x: 558.5, y: 1165, minX: 537, maxX: 580, minY: 700 };

/**
 * The saloon doors: two one-way gates across the top. The Railroad lane's run along the top passes
 * the left one going right, the plunge (round the outside of the Saloon lane's bend) passes the
 * right one going left (as does the Saloon lane, through the same gate), and neither lets a ball back
 * out, so whatever comes over the top drops into the saloon. (A single post here bounced every
 * plunge back down the shooter lane; without the gate across the Saloon lane's opening, balls rolled
 * back out down the lane.)
 */
export const DOOR_L: [P, P] = [
  [380, 18],
  [380, 64],
];
/** The right gate also closes the Saloon lane's opening (y 111-158): balls come in, never back out down the lane. */
export const DOOR_R: [P, P] = [
  [458, 158],
  [458, 18],
];

// ------------------------------------------------------------------ Railroad lane (left orbit)

/** The lane's mouth, across which the three drop targets stand. */
export const RR_MOUTH: [P, P] = [
  [20, 604],
  [82, 584],
];
/** Inner wall: from the mouth up the left side, round the top-left corner and along the top to the saloon. */
export const RR_INNER: P[] = [RR_MOUTH[1], [62, 556], [62, 112], ...arc(110, 112, 48, Math.PI, Math.PI * 1.5, 8).slice(1), [380, 64]];
export const RR_DROPS: [P, P][] = [0, 1, 2].map((i) => {
  const t0 = (i * 21 + 1) / 64;
  const t1 = (i * 21 + 20) / 64;
  return [along(RR_MOUTH[0], RR_MOUTH[1], t0), along(RR_MOUTH[0], RR_MOUTH[1], t1)];
});
/** Counts the lane as made, well up the left side. */
export const RR_SWITCH: [P, P] = [
  [20, 300],
  [62, 300],
];

// ------------------------------------------------------------------ the saloon (top right) and its flipper

/** The saloon's left wall stops well above the flipper, so its shots leave freely up and across. */
export const SALOON_LEFT: P[] = [
  [380, 64],
  [380, 130],
];
/** The Saloon lane's inner wall, which is also the saloon's right wall, round into the top arch. */
export const SALOON_RIGHT: P[] = [[490, 640], ...arc(BEND.x, BEND.y, 32, 0, -Math.PI / 2, 8)];
/** The saloon flipper: a right-hand flipper, 75 long, fired by the right button. */
export const UF = { px: 466, py: 282, len: 75, rest: Math.PI - 0.52, up: Math.PI + 0.42 };
/**
 * Guides a ball dropping down the saloon's right wall onto the bat. The lower flippers' guides come in
 * at about 40° and end 11.5 out from the pivot; here the saloon's wall leaves no room for that slant,
 * and a steep guide ending there left a cradled ball balanced on top of the pivot, where flips barely
 * moved it. Ending over the bat instead, the ball cradles on the bat and rolls down it when let go.
 */
export const UF_GUIDE_END: P = [467, 261];
export const SALOON_GUIDE: P[] = [[490, 200], UF_GUIDE_END];
export const SALOON_MOUTH: [P, P] = [
  [490, 640],
  [537, 640],
];
/** Counts the Saloon lane as made, near the top of the lane. */
export const SALOON_SWITCH: [P, P] = [
  [490, 300],
  [537, 300],
];

// ------------------------------------------------------------------ pops (barrels)

export const BUMPER_R = 32;
/** Under the saloon's open left side, 32 units (more than a ball) from every wall around them. */
export const BUMPERS: P[] = [
  [426, 360],
  [426, 458],
];

// ------------------------------------------------------------------ High Noon (top centre)

export const NOON = { x0: 200, x1: 355, y0: 90, y1: 214 };
/** The three windows across the front, left to right. */
export const NOON_WINDOWS: [P, P][] = [
  [
    [218, 214],
    [257, 214],
  ],
  [
    [258, 214],
    [297, 214],
  ],
  [
    [298, 214],
    [337, 214],
  ],
];
/** The side window facing the saloon: Quick Draw. */
export const NOON_SIDE: [P, P] = [
  [355, 206],
  [355, 116],
];
export const NOON_WALLS: P[][] = [
  [
    [218, 214],
    [200, 214],
    [200, 90],
    [355, 90],
    [355, 116],
  ],
  [
    [355, 206],
    [355, 214],
    [337, 214],
  ],
];

// ------------------------------------------------------------------ Sheriff and Hardware

/** One building right of Main Street, its roof peaked so nothing rests on it. */
export const TOWN: P[] = [
  [332, 400],
  [332, 300],
  [347, 284],
  [362, 300],
  [362, 400],
];
export const HARDWARE: [P, P] = [
  [332, 392],
  [332, 308],
];
export const SHERIFF: [P, P] = [
  [334, 400],
  [360, 400],
];

// ------------------------------------------------------------------ Gold Pan (left)

export const PAN = { x: 132, y: 500, r: 62 };
/**
 * Brass pins. Every gap between two pins, or a pin and the wall, is wider than the ball, so nothing
 * can wedge. Measured over 100 drops: Nuggets (middle) 52%, Riches (left) 33%, Extra Ball (right)
 * 15%. The top pin sits between the drop points, never under one, so no ball lands on its crown.
 */
export const PAN_PINS: P[] = [
  [137.5, 478],
  [108, 514],
  [156, 514],
];
/** Where a ball turned off the Gold Mine ramp drops into the pan (x varies a little per ball). */
export const PAN_DROP: P = [133, 455];
export const PAN_PIN_R = 3.5;
/** Cups along the bottom, left to right: Riches, Nuggets, Extra Ball. */
export const PAN_CUPS: P[] = [
  [99, 536],
  [132, 546],
  [165, 536],
];
export const PAN_CUP_R = 14;
/** The dividers' tips are 30 apart: closer than a ball's width, a ball sat on them over the middle cup. */
export const PAN_DIVIDERS: [P, P][] = [
  [
    [115, 534],
    [115, 562],
  ],
  [
    [149, 534],
    [149, 562],
  ],
];
/**
 * A rail over the pan from the Railroad lane's wall to past its top, sloping down to the right: a ball
 * landing on it rolls off onto the pan's right shoulder and away. (Ending on the left shoulder, where
 * the bowl curves up again, it left a ball sitting in the dip.)
 */
export const PAN_ROOF: P[] = [
  [62, 416],
  [170, 440],
];
/** Where the pan lets a ball back onto the playfield, and which way. */
export const PAN_EXIT = { at: [212, 586] as P, v: [110, 240] as P };

// ------------------------------------------------------------------ Jailhouse (scoop, left)

export const JAIL_MOUTH: [P, P] = [
  [158, 742],
  [218, 718],
];
export const JAIL_WALLS: P[] = [JAIL_MOUTH[0], [127, 668], [187, 644], JAIL_MOUTH[1]];
/**
 * Where a ball sits in the cell, and the way out (toward the right flipper). The catch zone fills most
 * of the cell: smaller and off to one side, balls coming in along the right wall slipped past it.
 */
export const JAIL_HOLE: P = [172, 688];
export const JAIL_CATCH_R = 26;
export const JAIL_AXIS: P = [0.387, 0.922];

// ------------------------------------------------------------------ ramps

export interface RampDef {
  id: 'mine' | 'stage';
  path: P[];
  walls: { left: P[]; right: P[] };
  z: number[];
  /** Index from which the shot counts as made. */
  madeAt: number;
  /** Floor-level base: walls block floor balls up to this index. */
  baseTo: number;
  entry: [P, P];
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
    if (landing > 0 && fromEnd < landing) z *= Math.max(0, fromEnd / landing) ** 0.8;
    return z;
  });
}

function makeRamp(id: RampDef['id'], ctrl: P[], hw: (s: number) => [number, number], anchors: [number, number][], landing: number, made: number, base: number): RampDef {
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
  return { id, path, walls, z: profile(path, anchors, landing), madeAt: indexAt(path, made), baseTo: indexAt(path, base), entry: [walls.left[0], walls.right[0]] };
}

/**
 * Gold Mine: from the right flipper, a short climb up the left to the mine's mouth. The mouth sits on
 * the right flipper's 99-100° shots, with its right post clear of the 97° line to High Noon's left
 * window (measured: it was 2° too far left, and made 2% of cradle flips; here 9%). The ball goes no
 * further on the ramp: the mine takes it (minecart up the elevator, wire track to the saloon).
 */
export const MINE = makeRamp(
  'mine',
  [
    [206, 336],
    [196, 308],
    [178, 278],
    [156, 250],
    [134, 224],
    [118, 208],
  ],
  (s) => [21 + 9 * Math.max(0, 1 - s / 40), 21 + 9 * Math.max(0, 1 - s / 40)],
  [
    [0, 0],
    [60, 22],
    [150, 46],
  ],
  0,
  110,
  36,
);
/** Where a ball turned into the Gold Pan leaves the ramp. */
export const MINE_DIVERT_AT = indexAt(MINE.path, 70);

/**
 * Stagecoach: from the left flipper (its mouth on the 72° line, funnelled to take the 69-77° shots),
 * up past the pops, up the right side over the Saloon lane,
 * across the back over the arch and down the left side to the left inlane.
 */
export const STAGE = makeRamp(
  'stage',
  [
    [364, 640],
    [368, 585],
    [362, 548],
    [378, 516],
    [408, 494],
    [452, 478],
    [490, 460],
    [508, 428],
    [513, 380],
    [513, 200],
    [510, 130],
    [497, 88],
    [470, 58],
    [420, 40],
    [300, 37],
    [150, 37],
    [96, 44],
    [62, 66],
    [44, 104],
    [40, 170],
    [40, 560],
    [44, 690],
    [56, 762],
    [76, 812],
    [92, 846],
    [94, 892],
  ],
  (s) => [20 + 14 * Math.max(0, 1 - s / 45), 20 + 14 * Math.max(0, 1 - s / 45)],
  [
    [0, 0],
    [150, 24],
    [320, 40],
    [1000, 44],
    [1500, 38],
    [1950, 24],
  ],
  130,
  700,
  40,
);
export const RAMPS = [MINE, STAGE];
/** The last few path points are the landing, where the ball drops off the wire onto the floor. */
export const RAMP_LANDING = 2;
/** Off a ramp into an inlane. Cyber Psychosis's 900 suits its steep table; here it bounced off the flipper's pivot. */
export const LANDING_SPEED = 600;

// ------------------------------------------------------------------ the mine's elevator and wire track

/** The minecart's shaft, at the mine's mouth: the ball rides up it, then onto the wire. */
export const MINE_HOUSE = { x0: 72, x1: 152, y0: 88, y1: 200 };
export const LIFT: { from: P; to: P; z0: number; z1: number } = { from: [118, 204], to: [98, 120], z0: 46, z1: 120 };
/** The wire track from the top of the lift across the back into the saloon (drawn, and the ball follows it). */
export const WIRE: P[] = smooth(
  [
    [98, 120],
    [112, 92],
    [170, 80],
    [300, 78],
    [372, 80],
    [410, 94],
    [436, 116],
  ],
  2,
);
export const WIRE_Z = { from: 120, to: 60 };
/** Where the wire drops a ball into the saloon, and how fast: a ball's width clear of the right gate. */
export const WIRE_DROP: { at: P; v: P } = { at: [438, 124], v: [0, 150] };

// ------------------------------------------------------------------ the lower playfield

/**
 * Outlane guards: an angled wall above each outlane turns a ball coming down the side of the table
 * into the inlane. On a 6.5° table a rebound keeps its sideways run far longer than on a steep one,
 * and balls that ended up running down a side wall dropped straight into the outlane. Measured
 * without them: 17% of High Noon and drop target rebounds, 3 of 12 pop exits and 8 of 12 saloon
 * misses reached an outlane; with them 2%, 0 and 0. The outlanes stay open to balls crossing from
 * the middle, as from the slings.
 */
export const OUTLANE_GUARDS: P[][] = [
  [
    [20, 740],
    [62, 800],
  ],
  [
    [537, 740],
    [495, 800],
  ],
];

// ------------------------------------------------------------------ Wanted posters (inserts; no rules yet)

/** Three a side, mirrored about the flippers' centre line, clear of the outlane guards. */
export const POSTERS: P[] = [
  [95, 662],
  [95, 716],
  [95, 770],
  [2 * CX - 95, 662],
  [2 * CX - 95, 716],
  [2 * CX - 95, 770],
];
