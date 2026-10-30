import { FLOOR, RAMP, RAMP2, Flipper, LineSensor, ZoneSensor, type Ball, type Circle, type Segment } from '../../engine/physics';
import { sound } from '../../engine/audio';
import { drawGlow } from '../../engine/fx';
import type { DMD } from '../../engine/dmd';
import type { Game } from '../game';
import { fmt, short } from '../format';
import { Blackout, MODES, Rage, type Mode, type ModeDef, type Shot, type Switch } from '../modes';
import { buildLowerSection, insidePoly, poly, type LowerSection, type P } from './geom';
import { drawBallAt, type Lamp, type LampState } from './draw';
import * as L from './psychosis-layout';
import { drawDrop, drawImpound, drawReactorEye, drawSpinner, drawStandup, drawTank, paintDynamic, paintRamps, paintStatic } from './psychosis-art';
import { Table, type Sprite } from './table';

const INS = {
  red: '#ff2a2a',
  orange: '#ff8a1f',
  yellow: '#ffd23f',
  white: '#f2f0ec',
  cyan: '#7fd8ff',
  green: '#3dff8a',
};

/** Where each shot's popups and glows appear. */
const SHOT_POS: Record<Shot, P> = {
  alley: L.along(L.ALLEY_SWITCH[0], L.ALLEY_SWITCH[1], 0.5),
  market: L.MARKET.path[0],
  breach: L.BREACH,
  skyway: [512, 620],
  reactor: L.REACTOR.pos(50),
};

/** Ramp layer for each ramp: the Black Market crosses above the Skyway's footprint, so it gets its own. */
const RAMP_LAYER = [RAMP, RAMP2];
/** Everything a ball's `tags.ramp` can point at (1-based): the two ramps, then the Back Alley's exit chute. */
const RAMP_DEFS = [...L.RAMPS, L.ALLEY_EXIT];
const EXIT_RAMP = RAMP_DEFS.length;
/** Normal of the shooter gate, pointing up out of the shooter lane. */
const GATE_N: P = (() => {
  const [[ax, ay], [bx, by]] = L.GATE;
  const l = Math.hypot(bx - ax, by - ay);
  return [(by - ay) / l, -(bx - ax) / l];
})();

interface Drop {
  seg: Segment;
  down: boolean;
  anim: number;
}

type Multiball = 'impound' | 'payload' | 'blackout' | 'vault' | null;

/** After CAMERAS DOWN, the cameras stay dark (and the lanes blink) this long before the lanes reset. */
const CAMERAS_DOWN_TIME = 6;
/** How long CAMERAS DOWN holds the back door open. */
const BACK_DOOR_TIME = 20;
/** Balls the vault lets out when cracked (one, as an add-a-ball, during another multiball), and the most on the table. */
const VAULT_BALLS = 3;
const MAX_BALLS = 4;
/** Where the cracked vault lets its balls out: in front of the middle tumbler, rolling down the deck. */
const HATCH_OUT: P = (() => {
  const [a, b] = L.TUMBLERS[1];
  const d = L.unit(L.sub(b, a));
  return L.add(L.along(a, b, 0.5), [-d[1], d[0]], L.BALL_R + 6);
})();
const HATCH_DIR: P = L.unit(L.sub(HATCH_OUT, L.along(L.TUMBLERS[1][0], L.TUMBLERS[1][1], 0.5)));

const ITEMS = [
  { key: 'time', label: 'TIME', name: '+15 SECONDS', price: 30_000 },
  { key: 'save', label: 'SAVE', name: 'BALL SAVE', price: 50_000 },
  { key: 'lock', label: 'LOCK', name: 'LIGHT LOCK', price: 40_000 },
  { key: 'tenx', label: '10X', name: 'NEXT SHOT 10X', price: 75_000 },
  { key: 'xball', label: 'X-BALL', name: 'EXTRA BALL', price: 200_000 },
] as const;
type ItemKey = (typeof ITEMS)[number]['key'];

export class Psychosis extends Table {
  lower: LowerSection;
  /** The Back Alley diverter at the right end of the CAM lanes; disabled while the loop is held open. */
  diverter: Segment;
  /** Held open (combos, some modes): the Back Alley loops round to the Black Market's wire. */
  alleyLoopOpen = false;
  /** The back door on the orbit into the upper playfield, and how long it stays open. */
  backDoor: Segment[] = [];
  doorDeflector!: Segment;
  doorOpen = 0;
  bumpers: Circle[] = [];
  drops: Drop[] = [];
  standups: Segment[] = [];
  /** SAFE (under the Breach) and VENT (under the Reactor). */
  flanks: Segment[] = [];
  /** The three standups at the back of the upper playfield. */
  tumblers: Segment[] = [];
  private tumblerFlash = [0, 0, 0];
  /** The vault's combination (tumbler indices, in the order to hit them; a new one after every crack), and how many are in. */
  code = [0, 1, 2];
  tumblersIn = 0;
  /** Balls still to come out of the cracked vault, the clock to the next, and how long its hatch stays open. */
  private hatchQueue = 0;
  private hatchT = 0;
  hatchOpen = 0;
  vaultJp = 1_000_000;
  private flankFlash = [0, 0];
  private camFlash = [0, 0, 0];
  /** The CAM lanes that are lit (each one's camera is knocked out), and the CAMERAS DOWN timer. */
  camLit = [false, false, false];
  camerasDown = 0;
  /** Captive ball in the Reactor channel: position along the axis and speed. */
  captive: { c: Circle; s: number; v: number };
  private coreFlash = 0;

  // basic shots
  comboTimer = 0;
  combo = 0;
  spinnerAngle = 0;
  spinnerVel = 0;
  private spinAccum = 0;
  breachBall: Ball | null = null;
  private breachTimer = 0;
  private standupWobble = [0, 0, 0, 0, 0, 0];
  plungerPull = 0;
  private skillT = 0;
  private skillArmed = false;
  reactorHeat = 0;

  // lock & multiball
  lockLit = false;
  locked: Ball[] = [];
  private locking: { b: Ball; t: number; slot: number } | null = null;
  private releaseQueue = 0;
  private releaseT = 0;
  multiball: Multiball = null;
  private jp = 1_000_000;
  private jackpots = 0;
  impoundSuper = false;

  // the heist
  letters = [false, false, false, false, false, false];
  modesLit = 0;
  played = new Set<ModeDef['key']>();
  completed = new Set<ModeDef['key']>();
  selecting = 0;
  selected = 0;
  mode: Mode | null = null;
  modeKey: ModeDef['key'] | null = null;
  rage: Mode | null = null;
  wizard: Mode | null = null;
  blackoutLit = false;
  level = 0;
  rageLit = [false, false, false, false];
  private validated = true;
  private validateT = 0;

  /** Delayed actions (drop resets, follow-up messages). */
  private timers: { t: number; fn: () => void }[] = [];

  // black market
  cash = 0;
  private offerIdx = 0;
  private offerT = 0;
  private xballBought = false;

  constructor(game: Game) {
    super(game);
    const w = this.world;
    this.flipperStyle = { body: '#f2f0ec', rubber: '#c41a1a', ink: '#2a2622' };

    // Cabinet, shooter lane and the arch: the Back Alley orbit up the left, over the top, the plunge down the right
    poly(w, L.LEFT_LOW, { restitution: 0.4 });
    poly(w, L.RIGHT_WALL, { restitution: 0.4 });
    poly(w, L.SHOOTER_FLOOR, { restitution: 0.2 });
    poly(w, L.PLUNGER_WALL, { restitution: 0.3 });
    w.seg(L.GATE[0][0], L.GATE[0][1], L.GATE[1][0], L.GATE[1][1], { oneWay: true, restitution: 0.3 });
    poly(w, L.ARCH_OUTER, { restitution: 0.35, friction: 0.02 });
    for (const part of L.ARCH_INNER_L_PARTS) poly(w, part, { restitution: 0.35, friction: 0.02 });
    // The back door into the upper playfield: shut, it's orbit wall; open, a deflector turns the Back Alley into it
    this.backDoor = poly(w, L.BACK_DOOR, { restitution: 0.35, friction: 0.02 });
    this.doorDeflector = w.seg(L.BACK_DOOR_DEFLECTOR[0][0], L.BACK_DOOR_DEFLECTOR[0][1], L.BACK_DOOR_DEFLECTOR[1][0], L.BACK_DOOR_DEFLECTOR[1][1], { restitution: 0.3, friction: 0.02 });
    this.doorDeflector.enabled = false;
    w.seg(L.UPPER_EXIT_FLAP[0][0], L.UPPER_EXIT_FLAP[0][1], L.UPPER_EXIT_FLAP[1][0], L.UPPER_EXIT_FLAP[1][1], { oneWay: true, restitution: 0.3 });
    poly(w, L.ARCH_INNER_NEST, { restitution: 0.35, friction: 0.02 });
    poly(w, L.ARCH_INNER_R, { restitution: 0.35, friction: 0.02 });
    poly(w, L.ORBIT_FLARE, { restitution: 0.4 });
    w.circle(L.ORBIT_POST[0], L.ORBIT_POST[1], 5, { restitution: 0.6 });

    // CAM lanes: rubber-capped posts and guides, a one-way gate at each end of the row
    for (const [a, b] of L.LANE_GUIDES) {
      w.circle(a[0], a[1], L.LANE_POST_R, { restitution: 0.6 });
      w.seg(a[0], a[1], b[0], b[1], { restitution: 0.4 });
    }
    w.seg(L.LEFT_GATE[0][0], L.LEFT_GATE[0][1], L.LEFT_GATE[1][0], L.LEFT_GATE[1][1], { oneWay: true, restitution: 0.3 });
    this.diverter = w.seg(L.DIVERTER[0][0], L.DIVERTER[0][1], L.DIVERTER[1][0], L.DIVERTER[1][1], { oneWay: true, restitution: 0.3 });

    // The pop nest and its exit lane down between the Reactor and the Skyway
    poly(w, L.NEST_LEFT, { restitution: 0.35 });
    poly(w, L.NEST_FLOOR, { restitution: 0.35 });
    poly(w, L.NEST_RIGHT, { restitution: 0.35 });
    // soft walls in the exit lane so a ball leaves its chute dropping straight
    poly(w, L.EXIT_LANE_L, { restitution: 0.15 });
    poly(w, L.EXIT_LANE_R, { restitution: 0.15 });
    w.seg(L.EXIT_GATE[0][0], L.EXIT_GATE[0][1], L.EXIT_GATE[1][0], L.EXIT_GATE[1][1], { oneWay: true, restitution: 0.3 });

    // Guards at the side lanes
    for (const g of [L.GUARD_L, L.GUARD_R]) {
      poly(w, g, { restitution: 0.6 });
      w.circle(g[1][0], g[1][1], 4, { restitution: 0.6 });
    }
    // Side targets: SAFE left of the Breach, VENT on the Reactor's right flank
    [L.SAFE, L.VENT].forEach(([a, b], i) => {
      this.flanks.push(w.seg(a[0], a[1], b[0], b[1], { restitution: 0.35, onHit: (h) => h.speed > 70 && this.hitFlank(i) }));
    });
    poly(w, L.BANK_R_WALL, { restitution: 0.4 });

    // The upper playfield: its entrance lane, gate, guides, drain, the tumblers and two half-size flippers
    poly(w, L.UPPER_LANE_WALL, { restitution: 0.35, friction: 0.02 });
    w.seg(L.UPPER_GATE[0][0], L.UPPER_GATE[0][1], L.UPPER_GATE[1][0], L.UPPER_GATE[1][1], { oneWay: true, restitution: 0.3 });
    poly(w, L.UPPER_GUIDE_L, { restitution: 0.3 });
    poly(w, L.UPPER_GUIDE_R, { restitution: 0.3 });
    poly(w, L.UPPER_DRAIN_FLOOR, { restitution: 0.3 });
    poly(w, L.UPPER_DRAIN_ROOF, { restitution: 0.3 });
    poly(w, [L.TUMBLER_BLOCK[1], ...L.TUMBLER_BLOCK.slice(2)], { restitution: 0.35 });
    poly(w, [L.TUMBLER_BLOCK[L.TUMBLER_BLOCK.length - 1], L.TUMBLER_BLOCK[0]], { restitution: 0.35 });
    L.TUMBLERS.forEach(([a, b], i) => {
      this.tumblers.push(w.seg(a[0], a[1], b[0], b[1], { restitution: 0.35, onHit: (h) => h.speed > 60 && this.hitTumbler(i) }));
    });

    // Breach: cup, throat, and the two standup banks either side of the mouth
    poly(w, L.BREACH_CUP, { restitution: 0.25 });
    poly(w, L.BREACH_THROAT.left, { restitution: 0.3 });
    poly(w, L.BREACH_THROAT.right, { restitution: 0.3 });
    for (const p of L.BREACH_MOUTH) w.circle(p[0], p[1], 3, { restitution: 0.4 });
    L.STANDUPS.forEach(([a, b], idx) => {
      this.standups.push(w.seg(a[0], a[1], b[0], b[1], { restitution: 0.35, onHit: (h) => h.speed > 70 && this.hitStandup(idx) }));
    });
    w.zones.push(new ZoneSensor(L.BREACH[0], L.BREACH[1], 18, (b) => this.enterBreach(b)));

    // Reactor: housing, funnel, captive ball channel, drop targets across the mouth
    const R = L.REACTOR;
    poly(w, L.MARKET_LIP, { restitution: 0.4 });
    poly(w, [R.mouthR, L.VENT[0]], { restitution: 0.4 });
    poly(w, [L.VENT[1], L.EXIT_LANE_L[L.EXIT_LANE_L.length - 1]], { restitution: 0.4 });
    poly(w, [R.mouthL, R.channelL0, R.lipL], { restitution: 0.3 });
    poly(w, [R.mouthR, R.channelR0, R.lipR], { restitution: 0.3 });
    poly(w, [R.channelL0, R.channelL1, R.channelR1, R.channelR0], { restitution: 0.3 });
    L.DROPS.forEach(([a, b], i) => {
      const seg = w.seg(a[0], a[1], b[0], b[1], { restitution: 0.3, onHit: (h) => this.hitDrop(i, h.speed) });
      this.drops.push({ seg, down: false, anim: 0 });
    });
    const cp = R.pos(R.restS);
    const cap = w.circle(cp[0], cp[1], 14, {
      restitution: 0.15,
      onHit: (h) => {
        // Equal masses: the captive ball takes most of the hit along its channel.
        const along = -(h.nx * L.REACTOR_AXIS[0] + h.ny * L.REACTOR_AXIS[1]);
        if (along > 0.2) this.captive.v = Math.max(this.captive.v, h.speed * along * 0.95);
      },
    });
    this.captive = { c: cap, s: R.restS, v: 0 };

    // Ramps: their walls live on their own layer; their foot blocks the floor.
    L.RAMPS.forEach((r, idx) => {
      const layer = RAMP_LAYER[idx];
      for (const part of r === L.MARKET ? L.MARKET_OUTER : [r.walls.left]) poly(w, part, { layers: layer, restitution: 0.3, friction: 0.02 });
      poly(w, r.walls.right, { layers: layer, restitution: 0.3, friction: 0.02 });
      poly(w, r.walls.left.slice(0, r.baseTo + 1), { restitution: 0.35 });
      poly(w, r.walls.right.slice(0, r.baseTo + 1), { restitution: 0.35 });
      const bl = r.walls.left[r.baseTo];
      const br = r.walls.right[r.baseTo];
      w.seg(bl[0], bl[1], br[0], br[1], { restitution: 0.35 });
      const [ea, eb] = r.entry;
      const nx = eb[1] - ea[1];
      const ny = -(eb[0] - ea[0]);
      const inward = nx * (r.path[1][0] - r.path[0][0]) + ny * (r.path[1][1] - r.path[0][1]) > 0 ? 1 : -1;
      w.lineSensors.push(
        new LineSensor(
          ea[0],
          ea[1],
          eb[0],
          eb[1],
          (b, dir) => {
            if (dir === inward && b.layer === FLOOR) {
              b.layer = layer;
              b.tags.ramp = idx + 1;
              b.tags.ri = 0;
              b.tags.made = 0;
            } else if (dir !== inward && b.tags.ramp === idx + 1) {
              b.layer = FLOOR;
              b.tags.ramp = 0;
            }
          },
          FLOOR | layer,
        ),
      );
    });

    // Back Alley loop: a ball falling down the right leg drops into the chute to the market's wire.
    poly(w, L.CHUTE.left, { layers: RAMP2, restitution: 0.3, friction: 0.02 });
    poly(w, L.CHUTE.right, { layers: RAMP2, restitution: 0.3, friction: 0.02 });
    const [ca, cb] = L.CHUTE.entry;
    w.lineSensors.push(
      new LineSensor(ca[0], ca[1], cb[0], cb[1], (b, dir) => {
        if (dir < 0 && b.layer === FLOOR) this.intoChute(b);
      }),
    );

    this.lower = buildLowerSection(w, L.CX, () => {
      this.game.addScore(1_010);
      this.sw('sling');
      sound.sling();
    });
    this.flipperL = this.lower.left;
    this.flipperR = this.lower.right;
    const U = L.UPPER_FLIPPER;
    for (const [side, x] of [
      [-1, U.xl],
      [1, U.xr],
    ] as const) {
      const f = side < 0 ? new Flipper(x, U.y, U.len, U.rest, U.up, U.r0, U.r1) : new Flipper(x, U.y, U.len, Math.PI - U.rest, Math.PI - U.up, U.r0, U.r1);
      w.flippers.push(f);
      this.extraFlippers.push({ f, side });
    }

    L.BUMPERS.forEach(([x, y]) => {
      const c = w.circle(x, y, L.BUMPER_R, { restitution: 0.6, kick: 900, kickThreshold: 10, onHit: (h) => this.hitBumper(c, h.ball) });
      this.bumpers.push(c);
    });

    // Sensors
    const line = (pts: P[], fn: (b: Ball, dir: number) => void, layers = FLOOR) =>
      w.lineSensors.push(new LineSensor(pts[0][0], pts[0][1], pts[1][0], pts[1][1], fn, layers));
    // The Back Alley counts once a ball is over the top, heading for the CAM lanes.
    line(L.ALLEY_SWITCH, (b, dir) => dir > 0 && this.alley(b));
    line(L.UPPER_SWITCH, (_b, dir) => dir > 0 && this.upperIn());
    line([L.BACK_DOOR[0], L.BACK_DOOR[L.BACK_DOOR.length - 1]], (_b, dir) => dir < 0 && this.upperIn());
    line(L.UPPER_EXIT_SWITCH, (_b, dir) => dir > 0 && this.upperOut('top'));
    line(L.UPPER_DRAIN_SWITCH, (_b, dir) => dir > 0 && this.upperOut('drain'));
    L.CAM_LANES.forEach(([x0, x1], i) =>
      line(
        [
          [x0 + L.LANE_POST_R, L.CAM_Y],
          [x1 - L.LANE_POST_R, L.CAM_Y],
        ],
        (_b, dir) => dir < 0 && this.camLane(i),
      ),
    );
    line(
      [
        [L.SKY_LANE_X, 650],
        [535, 650],
      ],
      (b) => (this.spinnerVel = Math.min(40, this.spinnerVel + b.speed / 120)),
      FLOOR | RAMP,
    );
    L.ROLLOVERS.forEach(([x0, x1], i) =>
      line(
        [
          [x0, L.ROLL_Y],
          [x1, L.ROLL_Y],
        ],
        (_b, dir) => dir < 0 && this.rollover(i),
      ),
    );

    w.force = (b, dt) => this.rampForce(b, dt);

    this.shooter = { x: 557.5, y: 1165, minX: 536, maxX: 580, minY: 700 };
    this.flashers = [
      // a beacon on the Impound cage, one on the A-C-H bank's backing, the Reactor's eye, and one on the vault's tumbler block
      { x: L.IMPOUND_BOX[1][0], y: L.IMPOUND_BOX[1][1], r: 7, z0: 40, z: 47, color: INS.red, level: 0 },
      { x: 540, y: 400, r: 11, z: 70, color: INS.yellow, level: 0 },
      { x: L.BANK_R_BACK[0], y: L.BANK_R_BACK[1], r: 8, z0: 28, z: 36, color: INS.red, level: 0 },
      { x: L.REACTOR.eye[0], y: L.REACTOR.eye[1], r: 12, z0: 34, z: 36, color: INS.red, level: 0 },
      { x: L.TUMBLER_TOP[0], y: L.TUMBLER_TOP[1], r: 9, z0: 24, z: 33, color: INS.orange, level: 0 },
    ];
    this.buildLamps();
  }

  // ---------------------------------------------------------------- lamps

  private buildLamps() {
    const lamp = (l: Lamp) => this.lamps.push(l);
    const dirAngle = (d: P) => Math.atan2(d[0], -d[1]);

    // Every major shot gets the same stack, lined up on the way in: an arrow pointing at the
    // shot, then its jackpot insert, then its mode light.
    const stack = (s: Shot, at: P, d: P, gaps: [number, number, number] = [46, 78, 104]) => {
      const p = (k: number): P => [at[0] - d[0] * gaps[k], at[1] - d[1] * gaps[k]];
      const [a, j, m] = [p(0), p(1), p(2)];
      lamp({ id: `arrow:${s}`, kind: 'arrow', x: a[0], y: a[1], w: 26, h: 34, angle: dirAngle(d), color: INS.white, tint: () => this.shotTint(s), state: () => this.shotLamp(s) });
      lamp({ id: `jackpot:${s}`, kind: 'circle', x: j[0], y: j[1], w: 17, color: INS.red, label: 'JP', labelSize: 7, state: () => (this.jpLit(s) ? 3 : 0) });
      lamp({ id: `mode:${s}`, kind: 'circle', x: m[0], y: m[1], w: 12, color: INS.white, tint: () => this.modeFor(s)?.tint(s) ?? INS.white, state: () => (this.modeFor(s) ? this.shotLamp(s) : 0) });
    };
    const fromRF: P = [330, 1030];
    const am = L.along(L.ALLEY_MOUTH[0], L.ALLEY_MOUTH[1], 0.5);
    stack('alley', am, L.unit(L.sub(am, fromRF)), [44, 76, 102]);
    const bm = L.along(L.BREACH_MOUTH[0], L.BREACH_MOUTH[1], 0.5);
    stack('breach', bm, [-L.BREACH_AXIS[0], -L.BREACH_AXIS[1]]);
    const mm = L.MARKET.path[0];
    stack('market', mm, L.unit(L.sub(mm, [L.CX, 1040])));
    stack('reactor', L.REACTOR_MOUTH, L.REACTOR_AXIS, [44, 70, 92]);
    // The Skyway's stack sits out in front of its mouth like the others; the lock insert is just inside the lane.
    const sm: P = [512.5, 712];
    stack('skyway', sm, L.unit(L.sub(sm, [300, 1000])), [40, 70, 94]);
    lamp({ id: 'lock:skyway', kind: 'rect', x: 512.5, y: 684, w: 34, h: 12, color: INS.orange, label: 'LOCK', labelSize: 7.5, state: () => (this.lockLit ? 3 : 0) });

    // SAFE and VENT inserts in front of their targets
    [L.SAFE, L.VENT].forEach(([a, b], i) => {
      const mid = L.along(a, b, 0.5);
      let n = L.unit([b[1] - a[1], -(b[0] - a[0])]);
      const toward = L.sub(i === 0 ? L.RF : L.LF, mid);
      if (n[0] * toward[0] + n[1] * toward[1] < 0) n = [-n[0], -n[1]];
      lamp({ id: i === 0 ? 'flank:safe' : 'flank:vent', kind: 'circle', x: mid[0] + n[0] * 17, y: mid[1] + n[1] * 17, w: 13, color: INS.red, label: i === 0 ? 'S' : 'V', labelSize: 8, state: () => (this.flankFlash[i] > 0 ? 3 : 0) });
    });

    // B-R-E-A-C-H: a row of inserts in front of each bank, each pointing at its own standup
    L.STANDUPS.forEach(([a, b], idx) => {
      const mid = L.along(a, b, 0.5);
      const n = L.unit(L.sub(idx < 3 ? L.RF_BAT : L.LF_BAT, mid));
      const at = L.add(mid, n, 19);
      lamp({
        id: `letter:${L.BREACH_LETTERS[idx]}`,
        kind: 'tri',
        x: at[0],
        y: at[1],
        w: 14,
        h: 13,
        angle: dirAngle([-n[0], -n[1]]),
        color: INS.red,
        tint: () => (this.mode?.litStandup(idx) ? this.mode.color : INS.red),
        label: L.BREACH_LETTERS[idx],
        labelSize: 7.5,
        state: () => this.mode?.litStandup(idx) || (this.letters[idx] ? 1 : 0),
      });
    });

    // CAM 1-3: a light in each top lane
    L.CAM_LANES.forEach(([x0, x1], i) =>
      lamp({ id: `cam:${i + 1}`, kind: 'circle', x: (x0 + x1) / 2, y: 113, w: 15, color: INS.red, label: String(i + 1), labelSize: 8, state: () => (this.camFlash[i] > 0 ? 3 : this.camerasDown > 0 ? 2 : this.camLit[i] ? 1 : 0) }),
    );

    // The tumblers' lights, in front of each standup, pointing at it
    L.TUMBLERS.forEach(([a, b], i) => {
      const mid = L.along(a, b, 0.5);
      const n = L.unit([-(b[1] - a[1]), b[0] - a[0]]);
      const at = L.add(mid, n, 17);
      lamp({ id: `tumbler:${i + 1}`, kind: 'tri', x: at[0], y: at[1], w: 14, h: 12, angle: dirAngle([-n[0], -n[1]]), color: INS.red, label: String(i + 1), labelSize: 6, state: () => (this.tumblerFlash[i] > 0 || this.hatchOpen > 0 ? 3 : this.code.indexOf(i) < this.tumblersIn ? 1 : this.code[this.tumblersIn] === i ? 2 : 0) });
    });
    // The vault jackpot, on the way out of its top
    lamp({ id: 'jackpot:vault', kind: 'circle', x: (L.UPPER_EXIT_X[0] + L.UPPER_EXIT_X[1]) / 2, y: 150, w: 15, color: INS.yellow, label: 'JP', labelSize: 6.5, state: () => (this.multiball === 'vault' ? 3 : 0) });
    // The upper playfield's way in: an arrow up its lane
    lamp({ id: 'arrow:upper', kind: 'arrow', x: (L.UPPER_LANE_X[0] + L.UPPER_LANE_X[1]) / 2, y: L.UPPER_LANE_MOUTH_Y - 34, w: 22, h: 30, angle: 0, color: INS.white, state: () => (this.doorOpen > 0 ? 2 : 0) });

    // Reactor drop lamps
    const ra = L.REACTOR_AXIS;
    L.DROPS.forEach(([a, b], i) => {
      const m: P = [(a[0] + b[0]) / 2 - ra[0] * 15, (a[1] + b[1]) / 2 - ra[1] * 15];
      lamp({ id: `drop:${i + 1}`, kind: 'rect', x: m[0], y: m[1], w: 16, h: 7, angle: Math.atan2(ra[0], -ra[1]), color: INS.yellow, state: () => (this.drops[i].down ? 1 : 0) });
    });
    // Lock: the warning triangle on the Impound
    const [ix0, iy0] = L.IMPOUND_BOX[0];
    const [ix1] = L.IMPOUND_BOX[1];
    lamp({ id: 'lock:impound', kind: 'rect', x: (ix0 + ix1) / 2 + 2, y: iy0 - 38, w: 28, h: 11, color: INS.red, label: 'IMPOUND', labelSize: 5.5, state: () => (this.lockLit ? 3 : this.multiball === 'impound' ? 2 : 0) });

    // Black Market menu, under the market's stack: the item on offer blinks; the one you can afford is solid
    ITEMS.forEach((it, i) =>
      lamp({
        id: `shop:${it.key}`,
        kind: 'rect',
        x: 210 + i * 25,
        y: 664,
        w: 23,
        h: 12,
        color: INS.yellow,
        label: it.label,
        labelSize: 6.5,
        state: () => (this.offer()?.key === it.key ? (this.cash >= it.price ? 3 : 2) : 0),
      }),
    );

    // The heist map
    const plaque = (k: ModeDef['key'], p: P) => {
      const def = MODES.find((m) => m.key === k)!;
      lamp({ id: `map:${k}`, kind: 'rect', x: p[0], y: p[1], w: 74, h: 20, color: def.color, label: def.name, labelSize: 9.5, labelOff: '#e6e1d6', state: () => this.mapLamp(def) });
      lamp({ id: `map:${k}:dome`, kind: 'circle', x: p[0], y: p[1] - 17, w: 11, color: INS.white, state: () => (this.modeKey === def.key ? 3 : this.completed.has(def.key) ? 1 : 0) });
    };
    plaque('infiltrate', L.MAP.infiltrate);
    plaque('hack', L.MAP.hack);
    plaque('route', L.MAP.route);
    plaque('payload', L.MAP.payload);
    plaque('extract', L.MAP.extract);
    lamp({
      id: 'map:blackout',
      kind: 'shield',
      x: L.MAP.blackout[0],
      y: L.MAP.blackout[1],
      w: 86,
      h: 26,
      color: INS.red,
      label: 'BLACKOUT',
      labelSize: 11,
      labelOff: '#f0b0a8',
      state: () => (this.wizard ? 3 : this.blackoutLit ? 2 : 0),
    });
    // Junction lights on the map: they show how many modes are lit
    const nodes: P[] = [
      [L.CX, L.MAP.infiltrate[1] - 44],
      [L.CX - 62, L.MAP.hack[1] - 42],
      [L.CX + 62, L.MAP.route[1] - 42],
      [L.CX, (L.MAP.hack[1] + L.MAP.payload[1]) / 2 - 12],
    ];
    nodes.forEach(([x, y], i) => lamp({ id: `map:node:${i + 1}`, kind: 'circle', x, y, w: 13, color: INS.red, state: () => (i < this.modesLit ? 2 : this.blackoutLit ? 1 : 0) }));
    // Bonus multiplier and R-A-G-E
    [2, 3, 4, 5, 6].forEach((n, i) =>
      lamp({ id: `bonus:${n}x`, kind: 'circle', x: L.CX - 64 + i * 32, y: 952, w: 17, color: INS.red, label: `${n}X`, labelSize: 7, state: () => (this.game.bonusMult >= n ? 1 : 0) }),
    );
    ['R', 'A', 'G', 'E'].forEach((label, i) =>
      lamp({
        id: `rage:${label}`,
        kind: 'tri',
        x: (L.ROLLOVERS[i][0] + L.ROLLOVERS[i][1]) / 2,
        y: 868,
        w: 22,
        h: 19,
        color: INS.red,
        label,
        labelSize: 8,
        state: () => (this.rage ? 2 : this.rageLit[i] ? 1 : 0),
      }),
    );
    lamp({
      id: 'shoot-again',
      kind: 'rect',
      x: L.CX,
      y: 1128,
      w: 96,
      h: 22,
      color: INS.red,
      label: 'SHOOT AGAIN',
      state: () => (this.game.ballSave > 0 ? (this.game.ballSave < 3 ? 3 : 2) : this.game.extraBalls > 0 ? 1 : 0),
    });
  }

  private mapLamp(def: ModeDef): LampState {
    if (this.modeKey === def.key) return 3;
    if (this.selecting > 0) return this.available()[this.selected] === def ? 3 : this.available().includes(def) ? 2 : this.played.has(def.key) ? 1 : 0;
    if (this.played.has(def.key)) return 1;
    return this.modesLit > 0 && this.available().includes(def) ? 2 : 0;
  }

  /** Lamps flash faster as a clock runs down. */
  private urgency(m: Mode, base: LampState): LampState {
    if (!m.timed) return base;
    if (m.inGrace || m.timer < 3) return 4;
    if (m.timer < 6) return 3;
    if (m.timer < 9) return Math.max(base, 2) as LampState;
    return base;
  }

  /** The running mode that wants shot `s`, if any. */
  private modeFor(s: Shot): Mode | null {
    if (this.wizard?.lit(s)) return this.wizard;
    if (this.mode?.lit(s)) return this.mode;
    return null;
  }

  shotLamp(s: Shot): LampState {
    const m = this.modeFor(s);
    if (m) return this.urgency(m, m.lit(s));
    if (this.multiball === 'impound' && (this.jpLit(s) || (s === 'reactor' && this.impoundSuper))) return 3;
    if (this.rage) return 2;
    if (s === 'market' && this.skillT > 0) return 4;
    if (s === 'breach') return this.modesLit > 0 && this.canStartMode() && this.available().length ? 2 : 0;
    if (s === 'reactor') return this.blackoutLit && this.canStartMode() ? 3 : this.dropsDown() ? 2 : 0;
    if (s === 'skyway') return this.lockLit ? 2 : this.comboTimer > 0 ? 2 : 0;
    if (s === 'alley') return this.doorOpen > 0 ? 3 : this.comboTimer > 0 ? 2 : 0;
    if (s === 'market') return this.offer() && this.cash >= this.offer()!.price ? 2 : 0;
    return 0;
  }

  private shotTint(s: Shot) {
    const m = this.modeFor(s);
    if (m) return m.tint(s);
    if (s === 'reactor' && this.blackoutLit) return INS.red;
    if (s === 'skyway' && this.lockLit) return INS.orange;
    if (s === 'market' && this.skillT > 0) return INS.red;
    return this.rage?.color ?? INS.white;
  }

  private jpLit(s: Shot) {
    return this.multiball === 'impound' && !this.impoundSuper && s !== 'reactor';
  }

  shotPos(s: Shot): P {
    return SHOT_POS[s];
  }

  private later(seconds: number, fn: () => void) {
    this.timers.push({ t: seconds, fn });
  }

  // ---------------------------------------------------------------- game flow hooks

  resetForBall() {
    this.doorOpen = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.selecting = 0;
    this.breachBall = null;
    this.locking = null;
    this.releaseQueue = 0;
    this.hatchQueue = 0;
    this.hatchOpen = 0;
    this.camLit = [false, false, false];
    this.camerasDown = 0;
    this.multiball = null;
    this.impoundSuper = false;
    this.lampShow('sweepUp', 1.2);
  }

  resetForGame() {
    this.letters = [false, false, false, false, false, false];
    this.rageLit = [false, false, false, false];
    this.played.clear();
    this.completed.clear();
    this.mode = null;
    this.modeKey = null;
    this.rage = null;
    this.wizard = null;
    this.blackoutLit = false;
    this.level = 0;
    this.modesLit = 1; // the first mode comes lit so new players see the Breach flash
    this.lockLit = false;
    this.locked = [];
    this.multiball = null;
    this.tumblersIn = 0;
    this.newCode();
    this.cash = 0;
    this.xballBought = false;
    this.reactorHeat = 0;
    this.jp = 1_000_000;
    for (const d of this.drops) {
      d.down = false;
      d.seg.enabled = true;
    }
  }

  armSkillShot() {
    this.skillArmed = true;
  }

  /** The ball has just been plunged: it rides the Back Alley round to the top flipper. */
  onPlunge() {
    if (!this.skillArmed) return;
    this.skillArmed = false;
    this.skillT = 7;
  }

  onFlipperPress(side: -1 | 1) {
    if (this.selecting > 0) {
      const n = this.available().length;
      this.selected = (this.selected + side + n) % n;
      sound.tick();
      return;
    }
    // Lane change, like a real table: the lit R-A-G-E letters and CAM lanes shift that way.
    const l = this.rageLit;
    this.rageLit = side < 0 ? [...l.slice(1), l[0]] : [l[l.length - 1], ...l.slice(0, -1)];
    this.rotateCamLanes(side);
  }

  // ---------------------------------------------------------------- switches

  /** Feed a major shot to the running modes. */
  private event(s: Shot, b?: Ball) {
    this.validated = true;
    this.cash += 5_000;
    this.mode?.onShot(s, b);
    this.wizard?.onShot(s, b);
    this.rage?.onShot(s, b);
  }

  private sw(s: Switch) {
    this.validated = true;
    this.cash += s === 'bumper' ? 2_000 : 1_000;
    this.mode?.onSwitch(s);
    this.wizard?.onSwitch(s);
    this.rage?.onSwitch(s);
  }

  private comboShot() {
    const g = this.game;
    if (this.comboTimer > 0) {
      this.combo++;
      const val = this.combo * 50_000;
      g.addScore(val);
      if (!this.mode) g.show(`${this.combo + 1}-WAY COMBO`, fmt(val), 1.2);
    } else {
      this.combo = 0;
    }
    this.comboTimer = 3.5;
  }

  private majorShot(s: Shot, base: number, b?: Ball) {
    const g = this.game;
    this.comboShot();
    const [x, y] = SHOT_POS[s];
    g.addScore(base, x, y);
    g.addBonus(base / 20);
    this.event(s, b);
    if (this.multiball === 'impound' && this.jpLit(s)) this.impoundJackpot(s);
  }

  /** Round the Back Alley, behind the pops. */
  private alley(b: Ball) {
    sound.orbit();
    this.flash(4, 0.7);
    this.flash(0, 0.5);
    this.majorShot('alley', 75_000, b);
  }

  /** SAFE or VENT: an ordinary switch for now; Hack will use them as remote keys. */
  private hitFlank(i: number) {
    this.flankFlash[i] = 0.5;
    this.sw('standup');
    const [a, b] = i === 0 ? L.SAFE : L.VENT;
    const x = (a[0] + b[0]) / 2;
    const y = (a[1] + b[1]) / 2;
    this.game.addScore(25_000, x, y);
    this.cash += 10_000;
    this.game.fx.sparks(x, y, INS.red, 8, 300);
    sound.target();
  }

  /**
   * A CAM lane under the top of the arch. Only rolling through a lane lights it, and a lit lane
   * means the camera above it is knocked out. All three lit at once is CAMERAS DOWN.
   */
  private camLane(i: number) {
    const g = this.game;
    this.sw('rollover');
    const [x, y] = [(L.CAM_LANES[i][0] + L.CAM_LANES[i][1]) / 2, L.CAM_Y];
    this.camFlash[i] = 0.6;
    sound.lane();
    if (this.camerasDown > 0 || this.camLit[i]) {
      g.addScore(5_000, x, y);
      return;
    }
    this.camLit[i] = true;
    g.addScore(25_000, x, y);
    sound.tick();
    if (this.camLit.every(Boolean)) this.camerasDownAward();
  }

  /** Lane change: a flipper button shifts the lit CAM lanes one place that way (and round the end). */
  private rotateCamLanes(side: -1 | 1) {
    if (this.camerasDown > 0) return;
    const l = this.camLit;
    this.camLit = side < 0 ? [l[1], l[2], l[0]] : [l[2], l[0], l[1]];
  }

  /** All three cameras knocked out: the back door opens. The lanes reset once the cameras come back. */
  private camerasDownAward() {
    const g = this.game;
    this.camerasDown = CAMERAS_DOWN_TIME;
    g.addScore(100_000);
    this.cash += 25_000;
    g.show('CAMERAS DOWN', 'BACK DOOR OPEN', 1.6, true);
    // For now the back door opens for the next Back Alley shot (the full rule comes with Phase 4).
    this.doorOpen = BACK_DOOR_TIME;
    this.flash(4, 0.8);
    sound.award();
  }

  /** The ball has gone into the upper playfield: up its lane, or through the back door off the Back Alley. */
  private upperIn() {
    if (this.multiball !== 'vault') this.doorOpen = 0;
    if (this.multiball !== 'vault') this.game.show('THE VAULT', `CODE ${this.codeText()}`, 1.6);
    this.sw('rollover');
    this.game.addScore(50_000, L.UPPER_LANE_X[0] + 18, L.UPPER_LANE_TOP_Y);
    this.flash(0, 0.6);
    sound.orbit();
  }

  /** Out of the upper playfield: up through the flap into the arch, or down its drain. */
  private upperOut(way: 'top' | 'drain') {
    if (way === 'top' && this.multiball === 'vault') this.vaultJackpot();
    if (way === 'top') {
      this.sw('rollover');
      this.game.addScore(100_000, (L.UPPER_EXIT_X[0] + L.UPPER_EXIT_X[1]) / 2, 110);
      this.flash(0, 0.8);
      sound.ramp();
    } else sound.lane();
  }

  /**
   * The tumblers: three standups at the back of the upper playfield, and the vault's combination.
   * Hit them in the code's order to crack the vault. A wrong one starts the combination over.
   */
  private hitTumbler(i: number) {
    const g = this.game;
    this.tumblerFlash[i] = 0.6;
    this.sw('standup');
    const [x, y] = L.along(L.TUMBLERS[i][0], L.TUMBLERS[i][1], 0.5);
    g.fx.sparks(x, y, INS.red, 8, 300);
    if (this.hatchOpen > 0) {
      g.addScore(25_000, x, y);
      sound.target();
    } else if (i === this.code[this.tumblersIn]) {
      this.tumblersIn++;
      if (this.tumblersIn === 3) this.crackVault();
      else {
        g.addScore(50_000 * this.tumblersIn, x, y);
        g.show(`TUMBLER ${i + 1}`, `NEXT: TUMBLER ${this.code[this.tumblersIn] + 1}`, 1.2);
        sound.target();
      }
    } else {
      // A wrong tumbler starts the combination over; if it was the code's first, that counts as the start.
      this.tumblersIn = i === this.code[0] ? 1 : 0;
      g.addScore(10_000, x, y);
      g.show('WRONG COMBINATION', `CODE ${this.codeText()}`, 1.4);
      sound.warn();
    }
  }

  /** A new random combination, never the same as the last one. */
  private newCode() {
    const old = this.code.join();
    do {
      const c = [0, 1, 2];
      for (let k = 2; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        [c[k], c[j]] = [c[j], c[k]];
      }
      this.code = c;
    } while (this.code.join() === old);
  }

  codeText() {
    return this.code.map((i) => i + 1).join('-');
  }

  /** The combination is in: the vault's hatch opens and balls drop out onto its deck. */
  private crackVault() {
    const g = this.game;
    this.tumblersIn = 0;
    this.newCode();
    g.addScore(1_000_000);
    const room = Math.max(0, MAX_BALLS - this.world.balls.length - this.releasing);
    if (!this.multiball) {
      this.multiball = 'vault';
      this.vaultJp = 1_000_000;
      this.hatchQueue = Math.min(VAULT_BALLS, room);
      g.grantBallSave(12);
      g.show('VAULT CRACKED', 'VAULT MULTIBALL', 2.4, true);
      sound.siren();
      this.music();
    } else {
      this.hatchQueue = Math.min(1, room);
      g.show('VAULT CRACKED', this.hatchQueue ? 'ADD-A-BALL' : fmt(1_000_000), 2, true);
      sound.award();
    }
    this.hatchT = 0.7;
    this.hatchOpen = 1.2;
    g.doFlash(INS.yellow, 0.5);
    this.lampShow('strobe', 1.2);
    this.flash(4, 1);
  }

  /** In vault multiball, shooting a ball out the vault's top pays the vault jackpot. */
  private vaultJackpot() {
    const g = this.game;
    g.addScore(this.vaultJp);
    g.show('VAULT JACKPOT', fmt(this.vaultJp), 1.8, true);
    g.fx.sparks((L.UPPER_EXIT_X[0] + L.UPPER_EXIT_X[1]) / 2, 120, INS.yellow, 18, 520);
    sound.jackpot();
    this.vaultJp += 250_000;
  }


  private rampMade(s: 'skyway' | 'market', b: Ball) {
    const g = this.game;
    sound.ramp();
    this.flash(s === 'skyway' ? 3 : 1, 0.8);
    if (s === 'market' && this.skillT > 0) {
      this.skillT = 0;
      g.addScore(500_000);
      this.cash += 50_000;
      g.show('SKILL SHOT', '500,000  +$50K', 2, true);
      sound.award();
      this.flashAll();
    }
    this.majorShot(s, s === 'skyway' ? 75_000 : 100_000, b);
    if (s === 'market') this.blackMarket();
  }

  private hitStandup(i: number) {
    const g = this.game;
    this.standupWobble[i] = 1;
    this.sw('standup');
    this.mode?.onStandup(i);
    sound.target();
    const [px, py] = L.along(L.STANDUPS[i][0], L.STANDUPS[i][1], 0.5);
    g.fx.sparks(px, py, INS.red, 8, 300);
    if (!this.letters[i]) {
      this.letters[i] = true;
      g.addScore(25_000, px, py);
      g.addBonus(1_500);
    } else {
      g.addScore(5_000);
    }
    if (this.letters.every(Boolean)) {
      this.letters = [false, false, false, false, false, false];
      if (this.mode?.timed) this.mode.addTime(10);
      this.modesLit++;
      g.show('BREACH LIT', this.mode ? (this.mode.timed ? '+10 SECONDS ON THE CLOCK' : 'FINISH THIS FIRST') : 'SHOOT THE BREACH', 2, true);
      this.flash(2);
      sound.award();
    }
  }

  private hitBumper(c: Circle, b: Ball) {
    const g = this.game;
    this.sw('bumper');
    g.addScore(5_000);
    g.addBonus(200);
    g.fx.sparks(c.x - (c.x - b.x) * 0.5, c.y - (c.y - b.y) * 0.5, INS.red, 10, 450);
    g.doShake(2);
    sound.bumper();
  }

  private hitDrop(i: number, speed: number) {
    const d = this.drops[i];
    if (d.down || speed < 45) return;
    const g = this.game;
    d.down = true;
    d.seg.enabled = false;
    this.sw('drop');
    g.addScore(25_000, L.DROPS[i][0][0], L.DROPS[i][0][1]);
    g.addBonus(2_000);
    g.fx.sparks(L.DROPS[i][0][0], L.DROPS[i][0][1], INS.yellow, 14, 350);
    sound.drop();
    if (this.dropsDown()) {
      g.addScore(100_000);
      this.flash(3, 0.8);
      if (!this.lockLit && this.locked.length < 3 && !this.multiball) {
        this.lockLit = true;
        g.show('REACTOR EXPOSED', 'LOCK IS LIT AT THE SKYWAY', 2, true);
      } else {
        g.show('REACTOR EXPOSED', 'HIT THE CORE', 1.6, true);
      }
      sound.siren();
    }
  }

  dropsDown() {
    return this.drops.every((d) => d.down);
  }

  private resetDrops() {
    for (const d of this.drops) {
      d.down = false;
      d.seg.enabled = true;
    }
    sound.drop();
  }

  /** The captive ball slammed the core. */
  private reactorHit() {
    const g = this.game;
    this.coreFlash = 1;
    this.flash(3);
    g.doShake(6);
    sound.punch(true);
    if (this.blackoutLit && this.canStartMode()) return this.startBlackout();
    if (this.multiball === 'impound' && this.impoundSuper) {
      const v = this.jp * 3;
      g.addScore(v);
      g.show('SUPER JACKPOT', fmt(v), 2.4, true);
      this.celebrate(INS.orange);
      sound.jackpot();
      this.impoundSuper = false;
      this.jackpots = 0;
    }
    this.reactorHeat++;
    this.majorShot('reactor', 100_000 + this.reactorHeat * 50_000);
    if (!this.mode && !this.wizard) g.show('REACTOR HEAT ' + this.reactorHeat, fmt(100_000 + this.reactorHeat * 50_000), 1.4);
    if (!this.wantsDropsDown()) this.later(1.2, () => !this.wantsDropsDown() && this.resetDrops());
  }

  private wantsDropsDown() {
    return !!(this.mode?.wantsDropsDown() || this.wizard?.wantsDropsDown() || this.impoundSuper);
  }

  private rollover(i: number) {
    const g = this.game;
    this.sw('rollover');
    g.addScore(5_000);
    if (!this.rageLit[i]) {
      this.rageLit[i] = true;
      g.addScore(20_000);
      g.addBonus(1_000);
      sound.lane();
    }
    if (this.rageLit.every(Boolean)) {
      this.rageLit = [false, false, false, false];
      if (g.bonusMult < 6) g.bonusMult++;
      this.startRage();
    }
  }

  // ---------------------------------------------------------------- Breach scoop

  private enterBreach(b: Ball) {
    if (b.captured || this.breachBall || (b.tags.scoopIgnore ?? 0) > this.time) return;
    if (b.speed > 2300) return;
    b.captured = true;
    b.x = L.BREACH[0];
    b.y = L.BREACH[1];
    b.vx = b.vy = 0;
    this.breachBall = b;
    sound.scoop();
    this.flash(2, 0.8);

    if (this.modeFor('breach')) {
      this.majorShot('breach', 25_000, b);
      return this.holdBreach(1.2);
    }
    this.majorShot('breach', 25_000, b);
    if (this.modesLit > 0 && this.canStartMode() && this.available().length) {
      if (this.available().length > 1) {
        this.selected = 0;
        this.selecting = 4;
        this.holdBreach(Infinity);
        sound.warn();
      } else {
        this.startMode(this.available()[0]);
      }
      return;
    }
    this.holdBreach(0.8);
  }

  private holdBreach(t: number) {
    this.breachTimer = t;
  }

  private ejectBreach() {
    const b = this.breachBall;
    if (!b) return;
    this.breachBall = null;
    b.captured = false;
    b.tags.scoopIgnore = this.time + 0.6;
    const a = Math.atan2(L.BREACH_AXIS[1], L.BREACH_AXIS[0]) + (Math.random() - 0.5) * 0.1;
    b.vx = Math.cos(a) * 560;
    b.vy = Math.sin(a) * 560;
    this.validated = false;
    this.validateT = this.time;
    sound.eject();
    this.game.fx.sparks(b.x, b.y, INS.white, 12, 300);
    this.flash(2, 0.6);
    this.game.doShake(3);
  }

  // ---------------------------------------------------------------- modes

  get modeMult() {
    return 1 + this.level * 0.5;
  }

  canStartMode() {
    return !this.mode && !this.wizard && !this.multiball;
  }

  /** Modes the heist map allows right now. */
  available(): ModeDef[] {
    const open = (tier: number) => tier === 0 || (tier === 1 ? this.played.has('infiltrate') : this.played.has('hack') || this.played.has('route'));
    return MODES.filter((m) => !this.played.has(m.key) && open(m.tier));
  }

  private startMode(def: ModeDef) {
    const g = this.game;
    this.selecting = 0;
    this.modesLit = Math.max(0, this.modesLit - 1);
    this.modeKey = def.key;
    this.mode = def.make(this, this.modeMult);
    this.mode.start();
    g.show(this.mode.name, this.mode.brief, 2.4, true);
    this.lampShow('radial', 1.4, L.BREACH[0], L.BREACH[1]);
    this.flashAll();
    g.doFlash(this.mode.color, 0.3);
    sound.modeStart();
    if (this.mode.multiball) {
      this.multiball = 'payload';
      this.addBalls(2);
      g.grantBallSave(12);
    }
    // Intro plays while the ball is held; the clock starts once it's kicked out.
    this.holdBreach(2.2);
    this.music();
  }

  private endMode(quiet = false) {
    const m = this.mode;
    if (!m || !this.modeKey) return;
    const g = this.game;
    const def = MODES.find((d) => d.key === this.modeKey)!;
    this.played.add(def.key);
    if (m.completed) this.completed.add(def.key);
    this.mode = null;
    this.modeKey = null;
    g.addBonus(Math.round(m.total / 20));
    if (!quiet) {
      g.show(m.completed ? `${m.name} DONE` : `${m.name} OVER`, `TOTAL ${fmt(m.total)}`, 2.4, true);
      sound.modeEnd(m.completed);
    }
    if (def.tier === 2 && !this.wizard && !this.blackoutLit) {
      this.blackoutLit = true;
      if (!quiet) this.later(2.4, () => g.show('BLACKOUT IS LIT', 'OVERLOAD THE REACTOR', 2.8, true));
    }
    this.music();
  }

  private startRage() {
    const g = this.game;
    if (this.rage) {
      this.rage.addTime(10);
      g.show('RAGE EXTENDED', '+10 SECONDS', 1.5, true);
      sound.award();
      return;
    }
    this.rage = new Rage(this, this.modeMult);
    this.rage.start();
    g.show('RAGE!', `${this.rage.brief}  BONUS ${g.bonusMult}X`, 2, true);
    this.lampShow('strobe', 0.8);
    this.flashAll();
    sound.siren();
  }

  private endRage(quiet = false) {
    const r = this.rage;
    if (!r) return;
    this.rage = null;
    if (!quiet) this.game.show('RAGE OVER', `TOTAL ${fmt(r.total)}`, 1.8);
  }

  private startBlackout() {
    const g = this.game;
    this.blackoutLit = false;
    const mult = this.modeMult * (1 + 0.5 * this.completed.size);
    this.wizard = new Blackout(this, mult);
    this.wizard.start();
    this.multiball = 'blackout';
    const total = this.completed.size >= MODES.length ? 4 : 3;
    this.addBalls(total);
    g.grantBallSave(20);
    g.show(this.completed.size >= MODES.length ? 'TOTAL BLACKOUT' : 'BLACKOUT', 'EVERY SHOT IS A JACKPOT', 3, true);
    g.doFlash(INS.red, 0.7);
    g.doShake(10);
    this.lampShow('strobe', 2);
    this.flashAll();
    sound.siren();
    this.music();
  }

  /** Ball over or tilt: everything timed stops. */
  endModes(quiet = false) {
    if (this.mode && !this.mode.multiball) this.endMode(quiet);
    this.endRage(quiet);
    this.selecting = 0;
  }

  music() {
    const m = this.mode;
    const modeMusic = m && !m.inGrace ? 'mode' : 'main';
    sound.playMusic(this.wizard ? 'blackout' : this.multiball ? 'multiball' : modeMusic);
  }

  hitFx(s: Shot, color: string) {
    const [x, y] = SHOT_POS[s];
    this.game.fx.sparks(x, y, color, 18, 520);
    this.lampShow('radial', 0.7, x, y);
    const near = this.flashers.reduce((best, f, i) => (Math.hypot(f.x - x, f.y - y) < Math.hypot(this.flashers[best].x - x, this.flashers[best].y - y) ? i : best), 0);
    this.flash(near);
  }

  celebrate(color: string) {
    this.lampShow('strobe', 1.2);
    this.flashAll();
    this.game.doFlash(color, 0.45);
  }

  // ---------------------------------------------------------------- lock & multiball

  /** A lit lock diverts a Skyway ball up the wire into the Impound. */
  private lockBall(b: Ball) {
    const g = this.game;
    b.captured = true;
    b.vx = b.vy = 0;
    this.lockLit = false;
    this.locking = { b, t: 0, slot: this.locked.length };
    // The drops come back up: each lock has to be earned.
    this.later(1, () => !this.wantsDropsDown() && this.dropsDown() && this.resetDrops());
    sound.scoop();
    this.flash(0);
    g.show(`BALL ${this.locked.length + 1} LOCKED`, this.locked.length + 1 < 3 ? 'IN THE IMPOUND' : 'IMPOUND BREAKOUT!', 1.8, true);
  }

  private canLock() {
    return this.lockLit && !this.multiball && this.locked.length < 3 && !this.locking;
  }

  /** Locked balls already on their way out of the Impound. */
  get releasing() {
    return Math.min(this.releaseQueue, this.locked.length) + this.hatchQueue;
  }

  /** Put `total` balls in play, using locked balls first. */
  private addBalls(total: number) {
    const onTable = this.world.balls.filter((b) => !b.captured || b === this.breachBall).length;
    let need = Math.max(0, total - onTable);
    const fromLock = Math.min(need, this.locked.length);
    this.releaseQueue += fromLock;
    need -= fromLock;
    if (need > 0) this.game.queueLaunches(need);
  }

  private startImpoundMultiball() {
    const g = this.game;
    this.multiball = 'impound';
    this.jackpots = 0;
    this.impoundSuper = false;
    this.releaseQueue += this.locked.length;
    g.grantBallSave(12);
    g.doFlash(INS.orange, 0.5);
    this.lampShow('strobe', 1.2);
    this.flashAll();
    sound.siren();
    this.music();
  }

  private impoundJackpot(s: Shot) {
    const g = this.game;
    g.addScore(this.jp);
    g.show('JACKPOT', fmt(this.jp), 1.8, true);
    this.hitFx(s, INS.orange);
    sound.jackpot();
    this.jp += 250_000;
    if (++this.jackpots >= 4) {
      this.impoundSuper = true;
      g.show('SUPER JACKPOT', 'IS LIT AT THE REACTOR', 2.2, true);
    }
  }

  endMultiball() {
    const kind = this.multiball;
    if (!kind) return;
    this.multiball = null;
    this.impoundSuper = false;
    const g = this.game;
    if (kind === 'payload') {
      if (this.mode) this.mode.finished = true;
      this.endMode();
    } else if (kind === 'blackout') {
      const w = this.wizard!;
      this.wizard = null;
      g.show('LIGHTS OUT', `TOTAL ${fmt(w.total)}`, 3, true);
      // The heist starts over, worth more.
      this.played.clear();
      this.completed.clear();
      this.level++;
      this.modesLit = Math.max(this.modesLit, 1);
    } else if (kind === 'vault') {
      this.doorOpen = 0;
      g.show('VAULT CLOSED', `JACKPOT ${fmt(this.vaultJp)}`, 1.8);
    } else {
      g.show('MULTIBALL OVER', `JACKPOT ${fmt(this.jp)}`, 1.8);
    }
    if (!this.wantsDropsDown() && this.dropsDown()) this.resetDrops();
    this.music();
  }

  // ---------------------------------------------------------------- black market

  private itemAvailable(k: ItemKey) {
    switch (k) {
      case 'time':
        return !!this.mode?.timed;
      case 'save':
        return this.game.ballSave <= 0;
      case 'lock':
        return !this.lockLit && this.locked.length < 3 && !this.multiball;
      case 'tenx':
        return false; // 10X comes with the rules (Phase 4); until then the shop skips it
      case 'xball':
        return !this.xballBought;
    }
  }

  /** The item the Black Market is offering right now. */
  offer() {
    const avail = ITEMS.filter((it) => this.itemAvailable(it.key));
    return avail.length ? avail[this.offerIdx % avail.length] : null;
  }

  private blackMarket() {
    const g = this.game;
    const it = this.offer();
    if (!it) return;
    if (this.cash < it.price) {
      g.show('BLACK MARKET', `${it.name} COSTS $${short(it.price)}`, 1.6);
      return;
    }
    this.cash -= it.price;
    sound.award();
    this.flash(1);
    switch (it.key) {
      case 'time':
        this.mode?.addTime(15);
        break;
      case 'save':
        g.grantBallSave(15);
        break;
      case 'lock':
        this.lockLit = true;
        break;
      case 'tenx':
        break;
      case 'xball':
        this.xballBought = true;
        g.extraBalls++;
        break;
    }
    g.show('BOUGHT', it.name, 1.8, true);
    this.offerIdx++;
    this.offerT = 4;
  }

  // ---------------------------------------------------------------- physics hooks

  /** Ramp gravity: the climb slows a ball down, the descent speeds it up. */
  private rampForce(b: Ball, dt: number) {
    const idx = (b.tags.ramp ?? 0) - 1;
    if (b.layer === FLOOR || idx < 0) return;
    const r = RAMP_DEFS[idx];
    const path = r.path;
    let i = b.tags.ri ?? 0;
    // walk the nearest path index (balls move a few units per step)
    const d2 = (k: number) => (path[k][0] - b.x) ** 2 + (path[k][1] - b.y) ** 2;
    while (i + 1 < path.length && d2(i + 1) < d2(i)) i++;
    while (i > 0 && d2(i - 1) < d2(i)) i--;
    b.tags.ri = i;
    const j = Math.min(path.length - 1, i + 1);
    const k = j === i ? i - 1 : i;
    const tx = path[j][0] - path[k][0];
    const ty = path[j][1] - path[k][1];
    const len = Math.hypot(tx, ty) || 1;
    const slope = (r.z[j] - r.z[k]) / len;
    const G = 7000;
    b.vx -= (tx / len) * slope * G * dt;
    b.vy -= (ty / len) * slope * G * dt;
    if (!b.tags.made && i >= r.madeAt) {
      b.tags.made = 1;
      this.rampMade(r.id, b);
    }
    if (r.divertAt !== undefined && i >= r.divertAt && !b.tags.diverted) {
      b.tags.diverted = 1;
      if (this.canLock()) this.lockBall(b);
    }
    if (i >= path.length - L.RAMP_LANDING) {
      // Off the wire and down the inlane, moving the way the wire was pointing.
      const n = path.length;
      const dx = path[n - 1][0] - path[n - 3][0];
      const dy = path[n - 1][1] - path[n - 3][1];
      const dl = Math.hypot(dx, dy) || 1;
      const sp = Math.min(L.LANDING_SPEED, Math.max(0, (b.vx * dx + b.vy * dy) / dl));
      b.vx = (dx / dl) * sp;
      b.vy = (dy / dl) * sp;
      b.layer = FLOOR;
      b.tags.ramp = 0;
      b.tags.diverted = 0;
    }
  }

  override ballZ(b: Ball) {
    const idx = (b.tags.ramp ?? 0) - 1;
    if (idx < 0) return 0;
    return RAMP_DEFS[idx].z[b.tags.ri ?? 0] ?? 0;
  }

  /** Off the floor and into the chute down the right leg to the market's wire. */
  private intoChute(b: Ball) {
    b.layer = RAMP2;
    b.tags.ramp = EXIT_RAMP;
    b.tags.ri = 0;
    b.tags.made = 1;
  }

  override substep(dt: number) {
    // A weak plunge that clears the shooter gate but falls back short of the chute's entry would
    // sit in the corner between the gate and the orbit's wall: it drops into the chute instead.
    const [ga] = L.GATE;
    for (const b of this.world.balls) {
      if (b.layer !== FLOOR || b.vy <= 0 || b.x < L.CHUTE.entry[0][0] || b.y < L.CHUTE.entry[0][1] || b.y > ga[1]) continue;
      if ((b.x - ga[0]) * GATE_N[0] + (b.y - ga[1]) * GATE_N[1] > 0) this.intoChute(b);
    }
    // Captive ball: rolls up its channel when hit, back down under gravity.
    const cap = this.captive;
    const R = L.REACTOR;
    if (cap.v !== 0 || cap.s > R.restS) {
      cap.v -= 1800 * dt;
      cap.s += cap.v * dt;
      if (cap.s >= R.topS) {
        if (cap.v > 300) this.reactorHit();
        cap.s = R.topS;
        cap.v = -cap.v * 0.35;
      }
      if (cap.s <= R.restS) {
        cap.s = R.restS;
        cap.v = 0;
      }
      const p = R.pos(cap.s);
      cap.c.x = p[0];
      cap.c.y = p[1];
      cap.c.vx = L.REACTOR_AXIS[0] * cap.v;
      cap.c.vy = L.REACTOR_AXIS[1] * cap.v;
    }
  }

  /** Mode clocks follow FreeWPC's rules: see README, "How the clocks work". */
  private clockRunning() {
    const g = this.game;
    if (g.state !== 'play' || g.tilted) return false;
    if (this.breachBall || this.locking) return false;
    const inPlay = this.world.balls.filter((b) => !this.inShooterLane(b));
    if (inPlay.length === 0) return false;
    if (inPlay.length === 1 && !this.validated && this.time - this.validateT < 2) return false;
    const free = inPlay.filter((b) => !b.captured);
    if (free.length > 0 && free.every((b) => b.stillTime > 1.5 && !this.onHeldFlipper(b))) return false;
    return true;
  }

  override update(dt: number) {
    super.update(dt);
    const g = this.game;
    if (this.comboTimer > 0) this.comboTimer -= dt;
    if (this.coreFlash > 0) this.coreFlash = Math.max(0, this.coreFlash - dt * 3);
    if (this.skillT > 0) this.skillT -= dt;
    for (let i = 0; i < 6; i++) this.standupWobble[i] = Math.max(0, this.standupWobble[i] - dt * 4);
    for (let i = 0; i < 2; i++) this.flankFlash[i] = Math.max(0, this.flankFlash[i] - dt);
    for (let i = 0; i < 3; i++) this.camFlash[i] = Math.max(0, this.camFlash[i] - dt);
    for (let i = 0; i < 3; i++) this.tumblerFlash[i] = Math.max(0, this.tumblerFlash[i] - dt);
    if (this.camerasDown > 0) {
      this.camerasDown = Math.max(0, this.camerasDown - dt);
      if (this.camerasDown === 0) this.camLit = [false, false, false];
    }
    this.diverter.enabled = !this.alleyLoopOpen;
    // In vault multiball the back door stays open, so the Back Alley feeds the vault.
    this.doorOpen = this.multiball === 'vault' ? Math.max(this.doorOpen, 1) : Math.max(0, this.doorOpen - dt);
    for (const s of this.backDoor) s.enabled = this.doorOpen <= 0;
    this.doorDeflector.enabled = this.doorOpen > 0;
    for (const d of this.drops) d.anim += ((d.down ? 1 : 0) - d.anim) * Math.min(1, dt * 18);
    for (const x of this.timers) x.t -= dt;
    const due = this.timers.filter((x) => x.t <= 0);
    this.timers = this.timers.filter((x) => x.t > 0);
    for (const x of due) x.fn();

    if (g.ballInShooter() && this.world.balls.length === 1) {
      this.validated = false;
      this.validateT = this.time;
    }

    // Choosing a mode while the ball waits in the Breach.
    if (this.selecting > 0) {
      this.selecting -= dt;
      if (this.selecting <= 0) this.startMode(this.available()[this.selected]);
    }

    if (this.clockRunning()) {
      this.mode?.tick(dt);
      this.rage?.tick(dt);
      this.wizard?.tick(dt);
    }
    if (this.mode?.finished && !this.mode.multiball) this.endMode();
    if (this.rage?.finished) this.endRage();

    // Drops come down on their own when a multiball wants the captive ball.
    if (this.wantsDropsDown() && !this.dropsDown())
      for (const d of this.drops) {
        d.down = true;
        d.seg.enabled = false;
      }

    this.giTarget = g.tilted ? 0 : g.state === 'bonus' ? 0.35 : this.attract ? 0.9 : (this.wizard?.gi() ?? this.mode?.gi() ?? 1);
    this.giPulse = this.rage ? 0.55 : this.wizard ? 0.3 : 0;

    if (this.breachBall && this.breachTimer > 0 && this.selecting <= 0) {
      this.breachTimer -= dt;
      if (this.breachTimer <= 0) this.ejectBreach();
    }

    // Ball rolling up the wire into the Impound.
    if (this.locking) {
      const lk = this.locking;
      lk.t += dt / 0.8;
      const pts = [...L.IMPOUND_LANE, L.IMPOUND_SLOTS[lk.slot]];
      const u = Math.min(1, lk.t) * (pts.length - 1);
      const k = Math.min(pts.length - 2, Math.floor(u));
      const f = u - k;
      lk.b.x = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f;
      lk.b.y = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f;
      if (lk.t >= 1) {
        this.locking = null;
        this.removeBall(lk.b);
        this.locked.push(lk.b);
        if (this.locked.length >= 3) this.startImpoundMultiball();
        else if (this.world.balls.length === 0) g.serveBall();
      }
    }
    // Balls dropping out of the cracked vault's hatch onto its deck, one at a time.
    if (this.hatchQueue > 0) {
      this.hatchOpen = Math.max(this.hatchOpen, 1);
      this.hatchT -= dt;
      const clear = !this.world.balls.some((b) => Math.hypot(b.x - HATCH_OUT[0], b.y - HATCH_OUT[1]) < 2 * L.BALL_R + 4);
      if (this.hatchT <= 0 && clear) {
        this.hatchT = 0.9;
        this.hatchQueue--;
        this.addBall(HATCH_OUT[0], HATCH_OUT[1], HATCH_DIR[0] * 220, HATCH_DIR[1] * 220);
        this.game.fx.sparks(HATCH_OUT[0], HATCH_OUT[1], INS.yellow, 14, 380);
        sound.eject();
        this.flash(4, 0.8);
      }
    } else this.hatchOpen = Math.max(0, this.hatchOpen - dt);
    // Balls dropping out of the Impound back onto the Skyway's wire, down to the left inlane.
    if (this.releaseQueue > 0 && this.locked.length > 0) {
      this.releaseT -= dt;
      if (this.releaseT <= 0) {
        this.releaseT = 0.9;
        this.releaseQueue--;
        const b = this.locked.pop()!;
        const path = L.SKYWAY.path;
        const i = L.SKYWAY.divertAt! + 2;
        const d = L.unit(L.sub(path[i + 1], path[i]));
        b.captured = false;
        b.layer = RAMP_LAYER[0];
        b.tags = { ramp: 1, ri: i, made: 1, diverted: 1 };
        b.x = path[i][0];
        b.y = path[i][1];
        b.vx = d[0] * 250;
        b.vy = d[1] * 250;
        this.world.balls.push(b);
        sound.eject();
        this.flash(0, 0.7);
      }
    } else if (this.locked.length === 0) {
      this.releaseQueue = 0;
    }

    // Black Market menu rotation
    this.offerT -= dt;
    if (this.offerT <= 0) {
      this.offerT = 4;
      this.offerIdx++;
    }

    // Spinner in the Skyway lane
    if (this.spinnerVel > 0.05) {
      this.spinnerAngle += this.spinnerVel * dt * Math.PI * 2;
      this.spinAccum += this.spinnerVel * dt;
      while (this.spinAccum >= 1) {
        this.spinAccum -= 1;
        g.addScore(2_500);
        this.cash += 500;
        this.sw('spinner');
        sound.spinner();
      }
      this.spinnerVel *= 1 - 1.4 * dt;
    }
  }

  // ---------------------------------------------------------------- DMD

  drawDMD(d: DMD) {
    const g = this.game;
    const t = this.time;
    if (this.selecting > 0) {
      const av = this.available();
      d.text('CHOOSE YOUR PATH', 64, 0, { align: 'center', level: 2 });
      d.fitText(av[this.selected].name, 64, 9, 108, 2, { align: 'center' });
      const blink = Math.floor(t * 4) % 2 ? 3 : 1;
      d.text('<', 3, 12, { level: blink });
      d.text('>', 125, 12, { align: 'right', level: blink });
      d.text(`FLIPPERS CHANGE  ${Math.ceil(this.selecting)}`, 64, 25, { align: 'center', level: 2 });
      return;
    }
    const m = this.wizard ?? this.mode ?? this.rage;
    if (m) {
      d.text(m.name, 1, 0, { level: 3 });
      if (m.timed) {
        const secs = Math.max(0, Math.ceil(m.timer));
        const blink = m.inGrace ? Math.floor(t * 10) % 2 : m.timer < 6 && Math.floor(t * 6) % 2;
        d.text(String(secs), 127, 0, { align: 'right', level: blink ? 1 : 3 });
      }
      d.fitText(fmt(g.score), 64, 9, 126, 2, { align: 'center' });
      let status = m.status();
      if (this.rage && m !== this.rage && Math.floor(t / 2) % 2 === 1) status = this.rage.status();
      d.text(status, 64, 25, { align: 'center', level: 2 });
      return;
    }
    d.fitText(fmt(g.score), 64, 3, 126, 2, { align: 'center' });
    d.text(`BALL ${g.ball}`, 1, 24, { level: 2 });
    const status = this.multiball === 'vault'
      ? `VAULT ${short(this.vaultJp)}`
      : this.multiball
      ? this.impoundSuper
        ? 'SUPER LIT'
        : `JP ${short(this.jp)}`
      : this.blackoutLit
        ? 'BLACKOUT LIT'
        : this.world.balls.some((b) => b.layer === FLOOR && insidePoly([b.x, b.y], L.UPPER_AREA))
        ? `CODE ${this.codeText()}`
        : this.modesLit > 0 && this.available().length
          ? 'BREACH LIT'
          : this.lockLit
            ? 'LOCK LIT'
            : g.ballSave > 0 && !g.ballInShooter()
              ? 'SAVE'
              : `$${short(this.cash)}`;
    d.text(status, 127, 24, { align: 'right', level: 2 });
    if (g.ballInShooter()) d.text('LAUNCH', 64, 24, { align: 'center', level: Math.floor(t * 3) % 2 ? 3 : 1 });
  }

  // ---------------------------------------------------------------- drawing

  protected override drawStatic(ctx: CanvasRenderingContext2D) {
    paintStatic(ctx, this.lower, () => this.drawInserts(ctx), () => this.drawFlasherDomes(ctx));
  }

  protected override drawRamps(ctx: CanvasRenderingContext2D) {
    paintRamps(ctx);
    return true;
  }

  protected override drawDynamic(ctx: CanvasRenderingContext2D) {
    paintDynamic(ctx, this.time, this.camLit.map((lit) => !lit && this.camerasDown <= 0), this.cameraTarget(), this.plungerPull, this.doorOpen > 0, Math.min(1, this.hatchOpen * 3));
    // The Breach glows when it has something to give.
    if (this.shotLamp('breach')) drawGlow(ctx, L.BREACH[0], L.BREACH[1], 36, this.shotTint('breach'), 0.35 + 0.3 * Math.sin(this.time * 6));
  }

  /** Where the security camera is looking (a watched shot in Infiltrate, else a lazy sweep). */
  private cameraTarget(): P | null {
    const w = (this.mode as { watched?: Shot | null } | null)?.watched;
    return w ? SHOT_POS[w] : null;
  }

  protected override sprites(out: Sprite[]) {
    for (const c of this.bumpers) {
      const hit = Math.max(0, 1 - c.lastHit / 0.18);
      out.push({ y: c.y, draw: (ctx) => drawTank(ctx, c.x, c.y, c.r, hit) });
    }
    // Drop targets sink into the floor
    this.drops.forEach((d, i) => {
      const [a, b] = L.DROPS[i];
      out.push({ y: Math.max(a[1], b[1]), draw: (ctx) => drawDrop(ctx, a, b, d.anim) });
    });
    // Breach standups
    this.standups.forEach((s, i) => {
      const wob = Math.sin(this.time * 60) * this.standupWobble[i] * 1.5;
      const lit = this.letters[i] || !!this.mode?.litStandup(i);
      out.push({ y: Math.max(s.ay, s.by), draw: (ctx) => drawStandup(ctx, [s.ax + wob, s.ay], [s.bx + wob, s.by], lit) });
    });
    this.tumblers.forEach((s, i) => {
      out.push({ y: Math.max(s.ay, s.by), draw: (ctx) => drawStandup(ctx, [s.ax, s.ay], [s.bx, s.by], this.tumblerFlash[i] > 0) });
    });
    this.flanks.forEach((s, i) => {
      out.push({ y: Math.max(s.ay, s.by), draw: (ctx) => drawStandup(ctx, [s.ax, s.ay], [s.bx, s.by], this.flankFlash[i] > 0) });
    });
    // Captive ball and the Reactor's eye
    const cap = this.captive.c;
    out.push({ y: cap.y, draw: (ctx) => drawBallAt(ctx, cap.x, cap.y) });
    const eye = L.REACTOR.eye;
    out.push({
      y: eye[1] + 30,
      draw: (ctx) => {
        const heat = Math.min(1, this.reactorHeat / 8);
        const glow = Math.max(this.coreFlash, this.blackoutLit ? 0.5 + 0.5 * Math.sin(this.time * 8) : 0);
        drawReactorEye(ctx, heat, glow);
      },
    });
    out.push({ y: L.IMPOUND_BOX[2][1], draw: (ctx) => drawImpound(ctx, this.locked.length, this.time) });
  }

  protected override drawTop(ctx: CanvasRenderingContext2D) {
    drawSpinner(ctx, this.spinnerAngle);
  }
}
