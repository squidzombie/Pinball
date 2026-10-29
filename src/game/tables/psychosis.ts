import { FLOOR, RAMP, RAMP2, Flipper, LineSensor, ZoneSensor, type Ball, type Circle, type Segment } from '../../engine/physics';
import { sound } from '../../engine/audio';
import { drawGlow } from '../../engine/fx';
import type { DMD } from '../../engine/dmd';
import type { Game } from '../game';
import { fmt, short } from '../format';
import { Blackout, MODES, Rage, type Mode, type ModeDef, type Shot, type Switch } from '../modes';
import { buildLowerSection, poly, type LowerSection, type P } from './geom';
import { drawBallAt, lift, type Lamp, type LampState } from './draw';
import * as L from './psychosis-layout';
import { drawDrop, drawImpound, drawReactorEye, drawSpinner, drawStandup, drawTank, drawTurbine, paintDynamic, paintRamps, paintStatic } from './psychosis-art';
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
  alley: [400, 58],
  market: L.MARKET.path[0],
  breach: L.BREACH,
  skyway: [512, 620],
  reactor: L.REACTOR.pos(50),
};

/** Ramp layer for each ramp: the Black Market crosses above the Skyway's footprint, so it gets its own. */
const RAMP_LAYER = [RAMP, RAMP2];

interface Drop {
  seg: Segment;
  down: boolean;
  anim: number;
}

type Multiball = 'impound' | 'payload' | 'blackout' | null;

const ITEMS = [
  { key: 'time', label: 'TIME', name: '+15 SECONDS', price: 30_000 },
  { key: 'save', label: 'SAVE', name: 'BALL SAVE', price: 50_000 },
  { key: 'lock', label: 'LOCK', name: 'LIGHT LOCK', price: 40_000 },
  { key: 'bonus', label: '+1X', name: 'BONUS +1X', price: 60_000 },
  { key: 'xball', label: 'X-BALL', name: 'EXTRA BALL', price: 200_000 },
] as const;
type ItemKey = (typeof ITEMS)[number]['key'];

export class Psychosis extends Table {
  lower: LowerSection;
  /** Upper left flippers: the top one under the Impound shoots the Back Alley, the middle one the Black Market. */
  topFlipper: Flipper;
  midFlipper: Flipper;
  bumpers: Circle[] = [];
  drops: Drop[] = [];
  standups: Segment[] = [];
  /** Captive ball in the Reactor channel: position along the axis and speed. */
  captive: { c: Circle; s: number; v: number };
  private coreFlash = 0;

  // basic shots
  comboTimer = 0;
  combo = 0;
  spinnerAngle = 0;
  spinnerVel = 0;
  private spinAccum = 0;
  turbineAngle = 0;
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

    // Cabinet, shooter lane and the Back Alley loop
    poly(w, L.LEFT_LOW, { restitution: 0.4 });
    poly(w, L.RIGHT_WALL, { restitution: 0.4 });
    poly(w, L.SHOOTER_FLOOR, { restitution: 0.2 });
    poly(w, L.PLUNGER_WALL, { restitution: 0.3 });
    w.seg(L.GATE[0][0], L.GATE[0][1], L.GATE[1][0], L.GATE[1][1], { oneWay: true, restitution: 0.3 });
    poly(w, L.ALLEY_OUTER, { restitution: 0.35, friction: 0.02 });
    poly(w, L.ALLEY_INNER, { restitution: 0.35, friction: 0.02 });

    // Top left: Impound, machinery, the guides down to both upper flippers
    poly(w, L.IMPOUND_BOX, { restitution: 0.3 }, true);
    poly(w, L.MACHINE, { restitution: 0.3 }, true);
    poly(w, L.UPPER_LEFT, { restitution: 0.3 });
    poly(w, L.TOP_GUIDE, { restitution: 0.25 });
    poly(w, L.LEFT_MASS, { restitution: 0.35 }, true);
    w.seg(L.DUCT_GATE[0][0], L.DUCT_GATE[0][1], L.DUCT_GATE[1][0], L.DUCT_GATE[1][1], { oneWay: true, restitution: 0.25 });

    // Breach: cup, the scoop housing, and two banks of standups
    poly(w, L.BREACH_CUP, { restitution: 0.25 });
    poly(w, [L.BANK_L.bottom, L.BANK_L.outer, ...L.BREACH_BOX, L.BANK_R.outer, L.BANK_R.bottom], { restitution: 0.4 });
    [L.BANK_L, L.BANK_R].forEach((bank, side) => {
      const at = (t: number): P => [bank.top[0] + (bank.bottom[0] - bank.top[0]) * t, bank.top[1] + (bank.bottom[1] - bank.top[1]) * t];
      const T = L.STANDUP_T;
      poly(w, [bank.top, at(T[0])], { restitution: 0.4 });
      for (let i = 0; i < 3; i++) {
        const a = at(T[i]);
        const b = at(T[i + 1]);
        const idx = side * 3 + i;
        this.standups.push(w.seg(a[0], a[1], b[0], b[1], { restitution: 0.35, onHit: (h) => h.speed > 70 && this.hitStandup(idx) }));
      }
      poly(w, [at(T[3]), bank.bottom], { restitution: 0.4 });
    });
    w.zones.push(new ZoneSensor(L.BREACH[0], L.BREACH[1], 18, (b) => this.enterBreach(b)));

    // Reactor: shell, funnel, captive ball channel, drop targets across the mouth
    const R = L.REACTOR;
    poly(w, R.shell, { restitution: 0.4 });
    poly(w, [R.mouthL, R.channelL0, R.lipL], { restitution: 0.3 });
    poly(w, [R.mouthR, R.channelR0, R.lipR], { restitution: 0.3 });
    poly(w, [R.channelL0, R.channelL1, R.channelR1, R.channelR0], { restitution: 0.3 });
    w.seg(L.SKY_LANE_X, 640, L.SKY_LANE_X, 672, { restitution: 0.35 });
    poly(w, L.LANE_ROOF, { restitution: 0.35 });
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
      poly(w, r.walls.left, { layers: layer, restitution: 0.3, friction: 0.02 });
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

    this.lower = buildLowerSection(w, L.CX, () => {
      this.game.addScore(1_010);
      this.sw('sling');
      sound.sling();
    });
    this.flipperL = this.lower.left;
    this.flipperR = this.lower.right;
    const mk = (U: typeof L.TOP_FLIPPER) => {
      const f = new Flipper(U.x, U.y, U.len, U.rest, U.up, U.r0, U.r1);
      w.flippers.push(f);
      this.extraFlippers.push({ f, side: -1 });
      return f;
    };
    this.topFlipper = mk(L.TOP_FLIPPER);
    this.midFlipper = mk(L.MID_FLIPPER);
    w.circle(L.MID_POST[0], L.MID_POST[1], 6, { restitution: 0.6 });

    L.BUMPERS.forEach(([x, y]) => {
      const c = w.circle(x, y, L.BUMPER_R, { restitution: 0.6, kick: 900, kickThreshold: 10, onHit: (h) => this.hitBumper(c, h.ball) });
      this.bumpers.push(c);
    });

    // Sensors
    const line = (pts: P[], fn: (b: Ball, dir: number) => void, layers = FLOOR) =>
      w.lineSensors.push(new LineSensor(pts[0][0], pts[0][1], pts[1][0], pts[1][1], fn, layers));
    // The Back Alley counts once a ball is over the top heading clockwise (plunges go the other way).
    const top = L.ALLEY_CENTER[Math.round(L.ALLEY_CENTER.length * 0.45)];
    line(
      [
        [top[0], top[1] - 26],
        [top[0], top[1] + 26],
      ],
      (b, dir) => dir > 0 && this.alley(b),
    );
    line(L.DUCT_SENSOR, (_b, dir) => dir > 0 && this.duct());
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
      { x: 186, y: 30, r: 10, z: 46, color: INS.red, level: 0 },
      { x: 520, y: 300, r: 11, z: 70, color: INS.yellow, level: 0 },
      { x: L.BREACH[0], y: 366, r: 9, z: 40, color: INS.red, level: 0 },
      { x: L.REACTOR.eye[0], y: L.REACTOR.eye[1], r: 12, z: 36, color: INS.red, level: 0 },
      { x: 312, y: 112, r: 9, z: 46, color: INS.orange, level: 0 },
    ];
    this.buildLamps();
  }

  // ---------------------------------------------------------------- lamps

  private buildLamps() {
    const lamp = (l: Lamp) => this.lamps.push(l);
    const arrow = (s: Shot, x: number, y: number, angle: number) =>
      lamp({ kind: 'arrow', x, y, w: 26, h: 36, angle, color: INS.white, tint: () => this.shotTint(s), state: () => this.shotLamp(s) });
    const jp = (s: Shot, x: number, y: number) =>
      lamp({ kind: 'circle', x, y, w: 15, color: INS.red, label: 'JP', labelSize: 7, state: () => (this.jpLit(s) ? 3 : 0) });
    const dirAngle = (d: P) => Math.atan2(d[0], -d[1]);

    // Back Alley: in front of its mouth, pointing up the left leg
    const am = L.ALLEY_MOUTH;
    const amc: P = [(am[0][0] + am[1][0]) / 2, (am[0][1] + am[1][1]) / 2];
    const ad = L.unit(L.sub(L.ALLEY_CENTER[3], L.ALLEY_CENTER[0]));
    arrow('alley', amc[0] - ad[0] * 36, amc[1] - ad[1] * 36, dirAngle(ad));
    jp('alley', amc[0] - ad[0] * 36 + 22, amc[1] - ad[1] * 36 + 8);
    // Black Market: in front of its mouth
    const m0 = L.MARKET.path[0];
    const md = L.unit(L.sub(L.MARKET.path[2], m0));
    arrow('market', m0[0] - md[0] * 44, m0[1] - md[1] * 44, dirAngle(md));
    jp('market', m0[0] - md[0] * 44 + 24, m0[1] - md[1] * 44 + 4);
    // Skyway: up the lane beside the Reactor
    arrow('skyway', 512, 676, 0);
    jp('skyway', 512, 634);
    const ba = L.BREACH_AXIS;
    arrow('breach', L.BREACH[0] + ba[0] * 150, L.BREACH[1] + ba[1] * 150, dirAngle([-ba[0], -ba[1]]));
    jp('breach', L.BREACH[0] + ba[0] * 70, L.BREACH[1] + ba[1] * 70);
    const ra = L.REACTOR_AXIS;
    arrow('reactor', L.REACTOR_MOUTH[0] - ra[0] * 74, L.REACTOR_MOUTH[1] - ra[1] * 74, dirAngle(ra));

    // B-R-E-A-C-H letters beside their standups, on the channel floor
    [L.BANK_L, L.BANK_R].forEach((bank, side) => {
      for (let i = 0; i < 3; i++) {
        const t = (L.STANDUP_T[i] + L.STANDUP_T[i + 1]) / 2;
        const p: P = [bank.top[0] + (bank.bottom[0] - bank.top[0]) * t, bank.top[1] + (bank.bottom[1] - bank.top[1]) * t];
        const toAxis = side === 0 ? L.cw([-ba[0], -ba[1]]) : L.cw(ba);
        const idx = side * 3 + i;
        lamp({
          kind: 'circle',
          x: p[0] + toAxis[0] * 10,
          y: p[1] + toAxis[1] * 10,
          w: 13,
          color: INS.red,
          tint: () => (this.mode?.litStandup(idx) ? this.mode.color : INS.red),
          label: L.BREACH_LETTERS[idx],
          labelSize: 9,
          state: () => this.mode?.litStandup(idx) || (this.letters[idx] ? 1 : 0),
        });
      }
    });

    // Reactor drop lamps
    L.DROPS.forEach(([a, b], i) => {
      const m: P = [(a[0] + b[0]) / 2 - ra[0] * 15, (a[1] + b[1]) / 2 - ra[1] * 15];
      lamp({ kind: 'rect', x: m[0], y: m[1], w: 16, h: 7, angle: Math.atan2(ra[0], -ra[1]), color: INS.yellow, state: () => (this.drops[i].down ? 1 : 0) });
    });
    // Lock: the warning triangle on the Impound, and the lit-lock insert on the Skyway lane
    lamp({ kind: 'tri', x: 56, y: 56 - lift(36), w: 16, h: 14, color: INS.red, state: () => (this.lockLit ? 3 : this.multiball === 'impound' ? 2 : 0) });
    lamp({ kind: 'rect', x: 512, y: 594, w: 38, h: 13, color: INS.orange, label: 'LOCK', labelSize: 8, state: () => (this.lockLit ? 3 : 0) });

    // Black Market menu: the item on offer blinks; the one you can afford is solid
    ITEMS.forEach((it, i) =>
      lamp({
        kind: 'rect',
        x: 268 + i * 25,
        y: 548,
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
      lamp({ kind: 'rect', x: p[0], y: p[1], w: 74, h: 20, color: def.color, label: def.name, labelSize: 9.5, labelOff: '#e6e1d6', state: () => this.mapLamp(def) });
      lamp({ kind: 'circle', x: p[0], y: p[1] - 17, w: 11, color: INS.white, state: () => (this.modeKey === def.key ? 3 : this.completed.has(def.key) ? 1 : 0) });
    };
    plaque('infiltrate', L.MAP.infiltrate);
    plaque('hack', L.MAP.hack);
    plaque('route', L.MAP.route);
    plaque('payload', L.MAP.payload);
    plaque('extract', L.MAP.extract);
    lamp({
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
    nodes.forEach(([x, y], i) => lamp({ kind: 'circle', x, y, w: 13, color: INS.red, state: () => (i < this.modesLit ? 2 : this.blackoutLit ? 1 : 0) }));
    // mode clock: a bar of lamps under the map
    for (let i = 0; i < 12; i++)
      lamp({
        kind: 'rect',
        x: L.CX - 66 + i * 12,
        y: 928,
        w: 9,
        h: 6,
        color: INS.white,
        tint: () => (this.mode ?? this.rage)?.color ?? INS.white,
        state: () => {
          const m = this.mode ?? this.rage;
          if (!m || !m.timed) return 0;
          if (m.inGrace) return 4;
          return i < Math.ceil(m.meter() * 12) ? this.urgency(m, 1) : 0;
        },
      });

    // Bonus multiplier and R-A-G-E
    [2, 3, 4, 5, 6].forEach((n, i) =>
      lamp({ kind: 'circle', x: L.CX - 64 + i * 32, y: 952, w: 17, color: INS.red, label: `${n}X`, labelSize: 7, state: () => (this.game.bonusMult >= n ? 1 : 0) }),
    );
    ['R', 'A', 'G', 'E'].forEach((label, i) =>
      lamp({
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
    lamp({ kind: 'tri', x: 557.5, y: 960, w: 24, h: 21, color: INS.red, state: () => (this.skillT > 0 || this.skillArmed ? 3 : 0) });
    lamp({
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
    if (s === 'alley') return this.comboTimer > 0 ? 2 : 0;
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
    this.combo = 0;
    this.comboTimer = 0;
    this.selecting = 0;
    this.breachBall = null;
    this.locking = null;
    this.releaseQueue = 0;
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
    // Lane change, like a real table.
    const l = this.rageLit;
    this.rageLit = side < 0 ? [...l.slice(1), l[0]] : [l[l.length - 1], ...l.slice(0, -1)];
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

  /** Up the duct to the upper flippers. */
  private duct() {
    this.sw('rollover');
    this.game.addScore(25_000, 43, 420);
    sound.lane();
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
    const bank = i < 3 ? L.BANK_L : L.BANK_R;
    const t = (L.STANDUP_T[i % 3] + L.STANDUP_T[(i % 3) + 1]) / 2;
    const px = bank.top[0] + (bank.bottom[0] - bank.top[0]) * t;
    const py = bank.top[1] + (bank.bottom[1] - bank.top[1]) * t;
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
    return Math.min(this.releaseQueue, this.locked.length);
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
      case 'bonus':
        return this.game.bonusMult < 6;
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
      case 'bonus':
        g.bonusMult++;
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
    const r = L.RAMPS[idx];
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
    if (i >= path.length - 4) {
      b.layer = FLOOR;
      b.tags.ramp = 0;
      b.tags.diverted = 0;
    }
  }

  override ballZ(b: Ball) {
    const idx = (b.tags.ramp ?? 0) - 1;
    if (idx < 0) return 0;
    return L.RAMPS[idx].z[b.tags.ri ?? 0] ?? 0;
  }

  override substep(dt: number) {
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
    for (const d of this.drops) d.anim += ((d.down ? 1 : 0) - d.anim) * Math.min(1, dt * 18);
    for (const x of this.timers) x.t -= dt;
    const due = this.timers.filter((x) => x.t <= 0);
    this.timers = this.timers.filter((x) => x.t > 0);
    for (const x of due) x.fn();
    this.turbineAngle += dt * (this.rage ? 9 : this.mode ? 4 : 1.2);

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
    this.giFlicker = this.rage ? 0.55 : this.wizard ? 0.3 : 0;

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
    // Balls dropping out of the Impound onto the top flipper.
    if (this.releaseQueue > 0 && this.locked.length > 0) {
      this.releaseT -= dt;
      if (this.releaseT <= 0) {
        this.releaseT = 0.9;
        this.releaseQueue--;
        const b = this.locked.pop()!;
        b.captured = false;
        b.layer = FLOOR;
        b.tags = {};
        b.x = L.IMPOUND_EXIT[0];
        b.y = L.IMPOUND_EXIT[1];
        b.vx = -20 + Math.random() * 20;
        b.vy = 120;
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
    const status = this.multiball
      ? this.impoundSuper
        ? 'SUPER LIT'
        : `JP ${short(this.jp)}`
      : this.blackoutLit
        ? 'BLACKOUT LIT'
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
    paintDynamic(ctx, this.time, this.cameraTarget(), this.plungerPull);
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
    out.push({ y: 150, draw: (ctx) => drawImpound(ctx, this.locked.length, this.time) });
    out.push({ y: L.TURBINE[1] + 20, draw: (ctx) => drawTurbine(ctx, this.turbineAngle) });
  }

  protected override drawTop(ctx: CanvasRenderingContext2D) {
    drawSpinner(ctx, this.spinnerAngle);
  }
}
