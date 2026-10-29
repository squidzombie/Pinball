import { FLOOR, RAMP, LineSensor, ZoneSensor, type Ball, type Segment, type Circle } from '../../engine/physics';
import { sound } from '../../engine/audio';
import { drawGlow, withAlpha } from '../../engine/fx';
import type { DMD } from '../../engine/dmd';
import type { Game } from '../game';
import { fmt, short } from '../format';
import { BurnItDown, JOBS, Riot, type Mode, type Shot, type Switch } from '../modes';
import { arc, buildLowerSection, offsetPath, poly, smooth, type LowerSection, type P } from './geom';
import {
  GUIDE,
  RAIL,
  WALL,
  art,
  box,
  cylinder,
  drawBumper,
  drawShadow,
  hazard,
  lift,
  mix,
  neonTube,
  post,
  rivet,
  rng,
  shade,
  slingshot,
  softShadow,
  splatter,
  sprayText,
  sprite,
  strokePath,
  wall,
  type BumperStyle,
  type Lamp,
  type LampState,
  type WallStyle,
} from './draw';
import { Table, TABLE_H, TABLE_W, type Sprite } from './table';

// Grounded palette: rust, soot, sodium light. Neon only where a sign would be.
const AMBER = '#ffb347';
const MOLTEN = '#ff6a1a';
const HAZARD = '#d9a441';
const NEON_PINK = '#ff2d6f';
const INS = {
  red: '#ff3b2f',
  orange: '#ff8a1f',
  yellow: '#ffd23f',
  green: '#3ddc84',
  blue: '#4d8dff',
  white: '#f4efe6',
  purple: '#b04dff',
};

const CX = 277.5; // playfield center (plunger lane eats the right edge)
const SCOOP = { x: 405, y: 425 };
const LANE_X = [200, 255, 310, 365];
const BUMPERS: P[] = [
  [232, 252],
  [338, 242],
  [285, 334],
];
const FURNACE = { x: 285, y: 290, r: 92 };
const RING = { x: 282, y: 690 };

// Geometry shared by physics and art.
const OUTER: P[] = [[20, 1240], [20, 300], ...arc(300, 300, 280, Math.PI, Math.PI * 2, 56), [580, 1180], [535, 1180]];
const PLUNGER_WALL: P[] = [
  [535, 1240],
  [535, 300],
];
// One-way: normal (dy,-dx) points up-left, so balls only pass from the lane side.
const GATE: P[] = [
  [535, 300],
  [577, 262],
];
const RAMP_BASE: P[] = [
  [95, 612],
  [85, 690],
  [85, 300],
  [128, 390],
  [160, 455],
  [160, 612],
];
/** The H-I-T standups line the right face of the ramp housing. */
const HIT_Y = [468, 506, 544, 582];
const RIGHT_INNER: P[] = [
  [470, 300],
  [470, 690],
  [478, 700],
];
// Kick balls leaving the orbits back into play (and keep them out of the outlanes).
const DEFLECT_L: P[] = [
  [20, 712],
  [56, 758],
];
const DEFLECT_R: P[] = [
  [535, 712],
  [499, 758],
];
const SCOOP_CUP = arc(SCOOP.x, SCOOP.y, 30, Math.PI * 1.08, Math.PI * 1.92, 10);
const RAMP_PATH: P[] = smooth(
  [
    [127.5, 612],
    [127.5, 470],
    [120, 410],
    [96, 372],
    [62, 352],
    [42, 372],
    [44, 420],
    [44, 760],
    [52, 830],
    [93, 885],
  ],
  2,
);
// Wide mouth that narrows as the ramp climbs.
const RAMP_WALLS = offsetPath(
  RAMP_PATH,
  RAMP_PATH.map(([x, y]) => (x > 90 && y < 700 ? 25 + Math.max(0, Math.min(1, (y - 520) / 92)) * 7.5 : 25)),
);
/** Height of the ramp surface at each path point: climbs, crests, runs back over the orbit, drops to the inlane. */
const RAMP_Z: number[] = (() => {
  const len = [0];
  for (let i = 1; i < RAMP_PATH.length; i++) len.push(len[i - 1] + Math.hypot(RAMP_PATH[i][0] - RAMP_PATH[i - 1][0], RAMP_PATH[i][1] - RAMP_PATH[i - 1][1]));
  const total = len[len.length - 1];
  const prof: [number, number][] = [
    [0, 0],
    [0.24, 52],
    [0.4, 66],
    [0.8, 48],
    [1, 0],
  ];
  return len.map((l) => {
    const u = l / total;
    for (let k = 1; k < prof.length; k++) {
      if (u <= prof[k][0]) {
        const [u0, z0] = prof[k - 1];
        const [u1, z1] = prof[k];
        const t = (u - u0) / (u1 - u0);
        return z0 + (z1 - z0) * (t * t * (3 - 2 * t));
      }
    }
    return 0;
  });
})();
/** Where the solid conveyor section hands over to the wireform. */
const RAMP_WIRE_FROM = RAMP_Z.indexOf(Math.max(...RAMP_Z));
const DROP_Y = [566, 608, 650];
/** In/outlane rollovers spell R-I-O-T: [x0, x1] per lane, left to right. */
const ROLL_Y = 910;
const ROLLOVERS: [number, number][] = [
  [20, 75.5],
  [75.5, 112.5],
  [442.5, 479.5],
  [479.5, 535],
];

const SHOT_POS: Record<Shot, P> = {
  leftOrbit: [52, 420],
  ramp: [110, 430],
  hit: [195, 525],
  reactor: [282, 460],
  scoop: [405, 395],
  drops: [430, 620],
  rightOrbit: [502, 420],
};

const CABINET: WallStyle = { h: 44, w: 14, side: '#17120e', top: '#3a2e24', hi: '#7c6650' };
const RUBBER: WallStyle = { h: 14, w: 9, side: '#0b0b0b', top: '#1d1d1d', hi: '#5a5a5a', shadow: 0.5 };
const REACTOR_BUMPER: BumperStyle = {
  name: 'reactor',
  base: '#cfc4aa',
  body: '#a8401a',
  cap: '#c99a2e',
  art: (g, r, lit) => {
    // radiation trefoil, half worn off
    g.fillStyle = lit ? 'rgba(40,20,0,0.85)' : 'rgba(20,12,4,0.8)';
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, r * 0.82, -Math.PI / 2 + (i * Math.PI * 2) / 3 - 0.5, -Math.PI / 2 + (i * Math.PI * 2) / 3 + 0.5);
      g.closePath();
      g.fill();
    }
    g.beginPath();
    g.arc(0, 0, r * 0.18, 0, Math.PI * 2);
    g.fill();
  },
};

interface Drop {
  seg: Segment;
  down: boolean;
  anim: number;
}

export class Foundry extends Table {
  lower: LowerSection;
  bumpers: Circle[] = [];
  drops: Drop[] = [];
  standups: Segment[] = [];
  reactor!: Segment;

  lanes = [false, false, false];
  skillLane = 1;
  skillActive = false;
  skillTimer = 0;
  rampCount = 0;
  meltdownReady = false;
  multiball = false;
  jackpot = 500_000;
  jackpots = 0;
  superLit = false;
  pitLit = false;
  bumperHits = 0;
  bumperLevel = 0;
  comboTimer = 0;
  combo = 0;
  spinnerAngle = 0;
  spinnerVel = 0;
  private spinAccum = 0;
  reactorFlash = 0;
  scoopBall: Ball | null = null;
  private scoopTimer = 0;
  private scoopAction: (() => void) | null = null;
  private dropResetTimer = 0;
  private emberTimer = 0;
  plungerPull = 0;

  // Modes
  hitLit = [false, false, false];
  private hitWobble = [0, 0, 0];
  riotLit = [false, false, false, false];
  jobsLit = 0;
  played = new Set<number>();
  selected = 0;
  /** Seconds left to pick a job while the ball waits in the scoop. */
  selecting = 0;
  job: Mode | null = null;
  jobIndex = -1;
  riot: Mode | null = null;
  wizard: Mode | null = null;
  wizardLit = false;
  modeLevel = 0;
  /** Single-ball play: the clock waits for the ball to reach the playfield after a kickout or plunge. */
  private validated = true;
  private validateT = 0;

  constructor(game: Game) {
    super(game);
    const w = this.world;
    this.flipperStyle = { body: '#e9e2d0', rubber: '#b3261e' };

    poly(w, OUTER, { restitution: 0.4 });
    poly(w, PLUNGER_WALL, { restitution: 0.3 });
    w.seg(GATE[0][0], GATE[0][1], GATE[1][0], GATE[1][1], { oneWay: true, restitution: 0.3 });
    poly(w, RAMP_BASE.slice(0, 5), { restitution: 0.4 });
    w.seg(160, 455, 160, HIT_Y[0], { restitution: 0.4 });
    for (let i = 0; i < 3; i++) {
      this.standups.push(
        w.seg(160, HIT_Y[i], 160, HIT_Y[i + 1], {
          restitution: 0.35,
          onHit: (h) => h.speed > 70 && this.hitStandup(i),
        }),
      );
    }
    w.seg(160, HIT_Y[3], 160, 612, { restitution: 0.4 });
    poly(w, RIGHT_INNER, { restitution: 0.4 });
    poly(w, DEFLECT_L, { restitution: 0.6 });
    poly(w, DEFLECT_R, { restitution: 0.6 });
    poly(w, SCOOP_CUP, { restitution: 0.2 });
    for (const x of LANE_X) w.seg(x, 100, x, 160, { restitution: 0.5 });

    // Ramp walls live on the ramp layer only.
    poly(w, RAMP_WALLS.left, { layers: RAMP, restitution: 0.3, friction: 0.02 });
    poly(w, RAMP_WALLS.right, { layers: RAMP, restitution: 0.3, friction: 0.02 });

    this.lower = buildLowerSection(w, CX, () => {
      this.game.addScore(1_010);
      this.sw('sling');
      sound.sling();
    });
    this.flipperL = this.lower.left;
    this.flipperR = this.lower.right;

    BUMPERS.forEach(([x, y]) => {
      const c = w.circle(x, y, 26, {
        restitution: 0.6,
        kick: 950,
        kickThreshold: 10,
        onHit: (h) => this.hitBumper(c, h.ball),
      });
      this.bumpers.push(c);
    });

    DROP_Y.forEach((y, i) => {
      const seg = w.seg(455, y, 455, y + 34, {
        restitution: 0.3,
        onHit: (h) => this.hitDrop(i, h.speed),
      });
      this.drops.push({ seg, down: false, anim: 0 });
    });

    this.reactor = w.seg(255, 478, 310, 478, {
      restitution: 0.35,
      onHit: (h) => {
        if (h.speed > 90) this.hitReactor();
      },
    });
    w.circle(250, 478, 5, { restitution: 0.6 });
    w.circle(315, 478, 5, { restitution: 0.6 });

    // Sensors
    LANE_X.slice(0, 3).forEach((x, i) => {
      w.lineSensors.push(
        new LineSensor(x, 130, LANE_X[i + 1], 130, (b, dir) => {
          if (dir < 0) this.hitLane(i, b);
        }),
      );
    });
    ROLLOVERS.forEach(([x0, x1], i) => {
      w.lineSensors.push(
        new LineSensor(x0, ROLL_Y, x1, ROLL_Y, (_b, dir) => {
          if (dir < 0) this.rollover(i);
        }),
      );
    });
    w.lineSensors.push(new LineSensor(20, 330, 85, 330, (b, dir) => dir > 0 && this.shot('leftOrbit', b)));
    w.lineSensors.push(new LineSensor(470, 330, 535, 330, (b, dir) => dir > 0 && this.shot('rightOrbit', b)));
    w.lineSensors.push(
      new LineSensor(20, 480, 85, 480, (b) => {
        this.spinnerVel = Math.min(40, this.spinnerVel + b.speed / 120);
      }),
    );
    w.lineSensors.push(
      new LineSensor(95, 612, 160, 612, (b, dir) => {
        if (dir > 0) {
          b.layer = RAMP;
          b.tags.rampMade = 0;
        }
      }),
    );
    w.zones.push(new ZoneSensor(SCOOP.x, SCOOP.y, 18, (b) => this.enterScoop(b)));

    w.force = (b, dt) => {
      if (b.layer !== RAMP) return;
      if (b.x > 78 && b.y > 340 && b.y < 640) b.vy += 1500 * dt;
      else if (b.x < 78 && b.y > 400) b.vy += 500 * dt;
      if (!b.tags.rampMade && b.x < 70 && b.y > 470) {
        b.tags.rampMade = 1;
        this.shot('ramp', b);
      }
      if (b.y > 866 && b.x < 130) b.layer = FLOOR;
      else if (b.x > 90 && b.y > 618) b.layer = FLOOR;
    };

    this.shooter = { x: 557.5, y: 1165, minX: 536, maxX: 580, minY: 700 };
    this.flashers = [
      { x: 96, y: 112, r: 11, z: 40, color: AMBER, level: 0 },
      { x: 504, y: 112, r: 11, z: 40, color: AMBER, level: 0 },
      { x: 122, y: 470, r: 10, z: 10, color: INS.yellow, level: 0 },
      { x: 405, y: 390, r: 10, z: 30, color: INS.red, level: 0 },
      { x: 476, y: 548, r: 9, z: 34, color: INS.white, level: 0 },
    ];
    this.buildLamps();
  }

  // ---------------------------------------------------------------- lamps

  private buildLamps() {
    const L = (l: Lamp) => this.lamps.push(l);
    const tint = (s: Shot, base: string) => () => this.modeFor(s)?.color ?? this.riot?.color ?? base;

    // A-M-P top lanes
    ['A', 'M', 'P'].forEach((label, i) =>
      L({
        kind: 'circle',
        x: (LANE_X[i] + LANE_X[i + 1]) / 2,
        y: 182,
        w: 24,
        color: INS.yellow,
        label,
        state: () => (this.lanes[i] ? 1 : this.skillActive && this.skillLane === i ? 3 : 0),
      }),
    );
    // Reactor (bumper) level
    for (let i = 0; i < 4; i++)
      L({ kind: 'circle', x: 246 + i * 24, y: 400, w: 12, color: INS.orange, state: () => (i < this.bumperLevel ? 1 : 0) });

    // Shot arrows: one RGB arrow per shot (mode colour), plus jackpot lamps on the multiball shots.
    const arrow = (s: Shot, x: number, y: number, angle = 0, base: string = INS.white) =>
      L({ kind: 'arrow', x, y, w: 28, h: 38, angle, color: base, tint: tint(s, base), state: () => this.shotLamp(s) });
    const jp = (x: number, y: number) =>
      L({ kind: 'circle', x, y, w: 17, color: INS.red, label: 'JP', labelSize: 7, state: () => (this.multiball && !this.wizard ? 2 : 0) });
    arrow('leftOrbit', 52, 645);
    jp(52, 603);
    arrow('ramp', 127.5, 668);
    jp(127.5, 630);
    for (let i = 0; i < 3; i++)
      L({ kind: 'circle', x: 110.5 + i * 17, y: 705, w: 11, color: INS.orange, state: () => (this.meltdownReady ? 3 : i < this.rampCount % 3 ? 1 : 0) });
    arrow('hit', 210, 525, -Math.PI / 2, INS.white);
    ['H', 'I', 'T'].forEach((label, i) =>
      L({
        kind: 'shield',
        x: 182,
        y: (HIT_Y[i] + HIT_Y[i + 1]) / 2,
        w: 20,
        h: 24,
        color: INS.red,
        label,
        state: () => (this.hitLit[i] ? 1 : 0),
      }),
    );
    arrow('reactor', 282, 530);
    arrow('scoop', SCOOP.x, 475);
    const plaque = (label: string, y: number, color: string, state: () => LampState) =>
      L({ kind: 'rect', x: SCOOP.x, y, w: 54, h: 15, color, label, labelSize: 8, state });
    plaque('START JOB', 506, INS.white, () => (this.selecting > 0 ? 3 : this.jobsLit > 0 && this.canStartMode() && this.unplayedLeft() ? 2 : 0));
    plaque('THE PIT', 525, INS.red, () => (this.pitLit && !this.job ? 2 : 0));
    plaque('SUPER JP', 544, INS.yellow, () => (this.superLit ? 3 : 0));
    plaque('BURN IT', 563, INS.orange, () => (this.wizardLit ? 3 : this.wizard ? 1 : 0));
    // Pit fighters beaten
    ['R', 'B', 'K'].forEach((label, i) =>
      L({
        kind: 'circle',
        x: 452,
        y: 470 + i * 24,
        w: 15,
        color: INS.purple,
        label,
        labelSize: 8,
        state: () => (i < this.game.pitLevel ? 1 : i === this.game.pitLevel % 3 && this.pitLit ? 2 : 0),
      }),
    );
    arrow('drops', 421, 626, Math.PI / 2, INS.white);
    DROP_Y.forEach((y, i) => L({ kind: 'rect', x: 438, y: y + 17, w: 8, h: 26, color: INS.yellow, state: () => (this.drops[i].down ? 1 : 0) }));
    arrow('rightOrbit', 502, 645);
    jp(502, 603);

    // Job ring: five plaques on an arc, the wizard star in the middle, the mode clock around it.
    JOBS.forEach((j, i) => {
      const a = Math.PI * (1.12 + 0.19 * i);
      L({
        kind: 'rect',
        x: RING.x + Math.cos(a) * 100,
        y: RING.y + Math.sin(a) * 100,
        w: 62,
        h: 19,
        angle: a + Math.PI / 2,
        color: j.color,
        label: j.label,
        labelSize: 9.5,
        labelTurns: true,
        state: () =>
          this.jobIndex === i ? 3 : this.selecting > 0 && this.selected === i ? 3 : this.played.has(i) ? 1 : this.jobsLit > 0 && this.nextJob() === i ? 2 : 0,
      });
    });
    L({ kind: 'star', x: RING.x, y: RING.y, w: 46, color: INS.orange, state: () => (this.wizard ? 3 : this.wizardLit ? 2 : 0) });
    const DOTS = 20;
    for (let i = 0; i < DOTS; i++) {
      const a = -Math.PI / 2 + (i / DOTS) * Math.PI * 2;
      L({
        kind: 'circle',
        x: RING.x + Math.cos(a) * 60,
        y: RING.y + Math.sin(a) * 60,
        w: 8,
        color: INS.white,
        tint: () => (this.job ?? this.riot)?.color ?? INS.white,
        state: () => {
          const m = this.job ?? this.riot;
          if (!m) return 0;
          // Last chance: the whole ring strobes while shots still count at zero.
          if (m.inGrace) return 4;
          const left = Math.ceil(m.meter() * DOTS);
          return i < left ? (m.timed ? this.urgency(m, 1) : 1) : 0;
        },
      });
    }

    // Bonus multiplier
    [2, 3, 4, 5, 6].forEach((n, i) =>
      L({ kind: 'circle', x: CX - 80 + i * 40, y: 826, w: 26, color: INS.green, label: `${n}X`, state: () => (this.game.bonusMult >= n ? 1 : 0) }),
    );
    // R-I-O-T rollovers
    ['R', 'I', 'O', 'T'].forEach((label, i) =>
      L({
        kind: 'circle',
        x: (ROLLOVERS[i][0] + ROLLOVERS[i][1]) / 2,
        y: 945,
        w: 22,
        color: INS.red,
        label,
        state: () => (this.riot ? 2 : this.riotLit[i] ? 1 : 0),
      }),
    );
    L({
      kind: 'rect',
      x: CX,
      y: 1128,
      w: 96,
      h: 22,
      color: INS.orange,
      label: 'SHOOT AGAIN',
      state: () => (this.game.ballSave > 0 ? (this.game.ballSave < 3 ? 3 : 2) : this.game.extraBalls > 0 ? 1 : 0),
    });
  }

  /** The running mode that currently wants shot `s`, if any. */
  private modeFor(s: Shot): Mode | null {
    if (this.wizard?.lit(s)) return this.wizard;
    if (this.job?.lit(s)) return this.job;
    return null;
  }

  /** Lamps flash faster as a clock runs down (thresholds after FreeWPC's lamp timers). */
  private urgency(m: Mode, base: LampState): LampState {
    if (!m.timed) return base;
    if (m.inGrace || m.timer < 3) return 4;
    if (m.timer < 6) return 3;
    if (m.timer < 9) return Math.max(base, 2) as LampState;
    return base;
  }

  private shotLamp(s: Shot): LampState {
    const m = this.modeFor(s);
    if (m) return this.urgency(m, m.lit(s));
    if (this.riot) return 2;
    if (s === 'ramp' && this.meltdownReady) return 3;
    if (s === 'scoop') return this.superLit || this.wizardLit || (this.jobsLit > 0 && this.canStartMode()) ? 2 : this.pitLit ? 2 : 0;
    if ((s === 'leftOrbit' || s === 'rightOrbit') && this.comboTimer > 0) return 2;
    return 0;
  }

  shotPos(s: Shot): P {
    return SHOT_POS[s];
  }

  // ---------------------------------------------------------------- rules

  resetForBall() {
    this.skillLane = Math.floor(Math.random() * 3);
    this.skillActive = true;
    this.skillTimer = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.selecting = 0;
    this.lampShow('sweepUp', 1.2);
  }

  resetForGame() {
    this.lanes = [false, false, false];
    this.rampCount = 0;
    this.meltdownReady = false;
    this.multiball = false;
    this.superLit = false;
    this.pitLit = false;
    this.bumperHits = 0;
    this.bumperLevel = 0;
    this.jackpot = 500_000;
    for (const d of this.drops) {
      d.down = false;
      d.seg.enabled = true;
    }
    this.hitLit = [false, false, false];
    this.riotLit = [false, false, false, false];
    this.played.clear();
    this.selected = 0;
    this.job = null;
    this.jobIndex = -1;
    this.riot = null;
    this.wizard = null;
    this.wizardLit = false;
    this.modeLevel = 0;
    // The first job comes lit so a new player sees the scoop flashing.
    this.jobsLit = 1;
  }

  onFlipperPress(side: -1 | 1) {
    if (this.selecting > 0) {
      this.selected = this.nextJob(this.selected, side);
      sound.tick();
      return;
    }
    // Lane change, like a real table.
    const rot = <T>(l: T[]) => (side < 0 ? [...l.slice(1), l[0]] : [l[l.length - 1], ...l.slice(0, -1)]);
    this.lanes = rot(this.lanes);
    this.riotLit = rot(this.riotLit);
    if (this.skillActive && this.game.ballInShooter()) this.skillLane = (this.skillLane + (side < 0 ? 2 : 1)) % 3;
  }

  /** Feed a shot to the running modes. */
  private event(s: Shot, b?: Ball) {
    this.validated = true;
    this.job?.onShot(s, b);
    this.wizard?.onShot(s, b);
    this.riot?.onShot(s, b);
  }

  private sw(s: Switch) {
    this.validated = true;
    this.job?.onSwitch(s);
    this.wizard?.onSwitch(s);
    this.riot?.onSwitch(s);
  }

  private hitLane(i: number, b: Ball) {
    const g = this.game;
    this.sw('lane');
    if (this.skillActive) {
      this.skillActive = false;
      if (i === this.skillLane) {
        g.addScore(250_000, b.x, b.y);
        g.show('SKILL SHOT', '250,000', 2);
        sound.award();
        this.flashAll(0.8);
      }
    }
    if (!this.lanes[i]) {
      this.lanes[i] = true;
      g.addScore(10_000, b.x, b.y + 30);
      g.addBonus(1_000);
      sound.lane();
    } else {
      g.addScore(2_000);
    }
    if (this.lanes.every(Boolean)) {
      this.lanes = [false, false, false];
      if (g.bonusMult < 6) {
        g.bonusMult++;
        g.show('BONUS X' + g.bonusMult, 'AMP LANES COMPLETE', 1.6);
      } else {
        g.show('AMP MAXED', '100,000', 1.4);
      }
      g.addScore(100_000);
      this.flash(0);
      this.flash(1);
      sound.award();
    }
  }

  private rollover(i: number) {
    const g = this.game;
    this.sw('rollover');
    g.addScore(5_000);
    if (!this.riotLit[i]) {
      this.riotLit[i] = true;
      g.addScore(20_000);
      g.addBonus(1_000);
      sound.lane();
    }
    if (this.riotLit.every(Boolean)) {
      this.riotLit = [false, false, false, false];
      this.startRiot();
    }
  }

  private hitStandup(i: number) {
    const g = this.game;
    this.hitWobble[i] = 1;
    this.event('hit');
    g.fx.sparks(162, (HIT_Y[i] + HIT_Y[i + 1]) / 2, INS.red, 8, 300);
    sound.target();
    if (!this.hitLit[i]) {
      this.hitLit[i] = true;
      g.addScore(25_000, 190, (HIT_Y[i] + HIT_Y[i + 1]) / 2);
      g.addBonus(1_500);
    } else {
      g.addScore(5_000);
    }
    if (this.hitLit.every(Boolean)) {
      this.hitLit = [false, false, false];
      if (this.job?.timed) this.job.addTime(10);
      if (this.unplayedLeft()) {
        this.jobsLit++;
        g.show('JOB LIT', this.job ? (this.job.timed ? '+10 SECONDS ON THE CLOCK' : 'FINISH THIS ONE FIRST') : 'SHOOT THE SCOOP', 2, true);
        this.flash(3);
        sound.award();
      } else {
        g.addScore(500_000);
        g.show('H-I-T COMPLETE', '500,000', 1.5);
      }
    }
  }

  private hitBumper(c: Circle, b: Ball) {
    const g = this.game;
    this.skillActive = false;
    this.bumperHits++;
    this.sw('bumper');
    g.addScore(5_000 + this.bumperLevel * 2_500);
    g.addBonus(200);
    g.fx.sparks(c.x - (c.x - b.x) * 0.5, c.y - (c.y - b.y) * 0.5, AMBER, 10, 450);
    g.doShake(2);
    sound.bumper();
    if (this.bumperHits % 30 === 0) {
      this.bumperLevel = Math.min(4, this.bumperLevel + 1);
      g.addScore(200_000);
      g.show('REACTOR OVERLOAD', 'BUMPERS UP', 1.6);
      this.flash(0);
      this.flash(1);
      sound.award();
    }
  }

  private hitDrop(i: number, speed: number) {
    const d = this.drops[i];
    if (d.down || speed < 45) return;
    const g = this.game;
    d.down = true;
    d.seg.enabled = false;
    this.event('drops');
    g.addScore(25_000, 440, DROP_Y[i] + 17);
    g.addBonus(2_000);
    g.fx.sparks(455, DROP_Y[i] + 17, INS.yellow, 14, 350);
    this.flash(4, 0.6);
    sound.drop();
    if (this.drops.every((x) => x.down)) {
      g.addScore(100_000);
      if (!this.pitLit) {
        this.pitLit = true;
        g.show('THE PIT IS OPEN', this.job ? 'AFTER THIS JOB' : 'SHOOT THE SCOOP', 2.2, true);
        sound.siren();
      } else {
        g.show('TARGETS COMPLETE', '100,000', 1.4);
        sound.award();
      }
      this.dropResetTimer = 1.5;
    }
  }

  private hitReactor() {
    const g = this.game;
    this.reactorFlash = 0.4;
    this.jackpot += 25_000;
    this.event('reactor');
    g.addScore(15_000, 282, 500);
    g.addBonus(1_000);
    g.fx.sparks(282, 478, INS.yellow, 10, 300);
    sound.target();
  }

  private comboShot() {
    const g = this.game;
    this.skillActive = false;
    if (this.comboTimer > 0) {
      this.combo++;
      const val = this.combo * 50_000;
      g.addScore(val);
      g.show(`${this.combo + 1}-WAY COMBO`, fmt(val), 1.3);
    } else {
      this.combo = 0;
    }
    this.comboTimer = 3.5;
  }

  private shot(kind: 'ramp' | 'leftOrbit' | 'rightOrbit', b?: Ball) {
    const g = this.game;
    this.comboShot();
    this.event(kind, b);
    if (kind === 'ramp') {
      g.addScore(75_000, 70, 420);
      g.addBonus(5_000);
      this.flash(2);
      sound.ramp();
      if (this.multiball) {
        if (!this.wizard) this.awardJackpot();
      } else if (this.meltdownReady) {
        this.startMultiball();
      } else {
        this.rampCount++;
        if (this.rampCount % 3 === 0) {
          this.meltdownReady = true;
          g.show('MELTDOWN READY', 'SHOOT THE RAMP', 2, true);
          sound.siren();
        } else if (this.combo === 0 && !this.job) {
          g.show('CONVEYOR RAMP', `${this.rampCount % 3} OF 3`, 1.2);
        }
      }
    } else {
      g.addScore(50_000, kind === 'leftOrbit' ? 52 : 502, 360);
      g.addBonus(2_000);
      this.flash(kind === 'leftOrbit' ? 0 : 1, 0.7);
      sound.orbit();
      if (this.multiball && !this.wizard) this.awardJackpot();
    }
  }

  private startMultiball() {
    const g = this.game;
    this.meltdownReady = false;
    this.multiball = true;
    this.jackpots = 0;
    this.superLit = false;
    g.show('MELTDOWN', 'MULTIBALL', 3, true);
    g.doFlash(MOLTEN, 0.5);
    g.doShake(8);
    this.lampShow('strobe', 1.2);
    this.flashAll();
    sound.siren();
    g.ballSave = Math.max(g.ballSave, 15);
    g.queueLaunches(2);
    this.music();
  }

  endMultiball() {
    if (!this.multiball) return;
    this.multiball = false;
    this.superLit = false;
    if (this.wizard) {
      const w = this.wizard;
      this.wizard = null;
      this.game.show('THE FOUNDRY BURNS', `TOTAL ${fmt(w.total)}`, 3, true);
      // Back to the start of the job board, with everything worth more.
      this.played.clear();
      this.modeLevel++;
      this.jobsLit = Math.max(this.jobsLit, 1);
      this.selected = 0;
    } else {
      this.game.show('MULTIBALL OVER', `JACKPOT ${fmt(this.jackpot)}`, 1.8);
    }
    this.music();
  }

  private awardJackpot() {
    const g = this.game;
    g.addScore(this.jackpot);
    g.show('JACKPOT', fmt(this.jackpot), 2, true);
    g.doFlash(INS.yellow, 0.5);
    g.doShake(6);
    this.flashAll(0.8);
    sound.jackpot();
    this.jackpot += 100_000;
    this.jackpots++;
    if (this.jackpots >= 3 && !this.superLit) {
      this.superLit = true;
      g.show('SUPER JACKPOT', 'IS LIT AT THE SCOOP', 2.2, true);
    }
  }

  // ---------------------------------------------------------------- modes

  get modeMult() {
    return 1 + this.modeLevel * 0.5;
  }

  canStartMode() {
    return !this.job && !this.wizard && !this.multiball;
  }

  unplayedLeft() {
    return this.played.size < JOBS.length;
  }

  /** Next unplayed job from `from`, stepping in `dir` (0 = `from` itself if free). */
  nextJob(from = this.selected, dir = 0) {
    const n = JOBS.length;
    if (dir === 0 && !this.played.has(from)) return from;
    const step = dir === 0 ? 1 : dir;
    for (let k = 1; k <= n; k++) {
      const i = (((from + step * k) % n) + n) % n;
      if (!this.played.has(i)) return i;
    }
    return from;
  }

  private beginSelect() {
    this.selected = this.nextJob();
    this.selecting = 4;
    this.holdScoop(Infinity);
    sound.warn();
  }

  private startJob(i: number) {
    const g = this.game;
    this.selecting = 0;
    this.jobsLit = Math.max(0, this.jobsLit - 1);
    this.played.add(i);
    this.jobIndex = i;
    this.selected = i;
    this.job = JOBS[i].make(this, this.modeMult);
    this.job.start();
    g.show(this.job.name, this.job.brief, 2.4, true);
    this.lampShow('radial', 1.4, SCOOP.x, SCOOP.y);
    this.flashAll();
    g.doFlash(this.job.color, 0.3);
    sound.modeStart();
    // Intro plays while the ball is held; the clock starts once it's kicked out.
    this.holdScoop(2.2);
    this.music();
  }

  private endJob(quiet = false) {
    const j = this.job;
    if (!j) return;
    const g = this.game;
    this.job = null;
    this.jobIndex = -1;
    g.addBonus(Math.round(j.total / 20));
    if (!quiet) {
      g.show(j.completed ? `${j.name} DONE` : `${j.name} OVER`, `TOTAL ${fmt(j.total)}`, 2.4, true);
      sound.modeEnd(j.completed);
    }
    if (!this.unplayedLeft() && !this.wizard) {
      this.wizardLit = true;
      if (!quiet) g.show('BURN IT DOWN', 'IS LIT AT THE SCOOP', 2.8, true);
    }
    this.music();
  }

  private startRiot() {
    const g = this.game;
    if (this.riot) {
      this.riot.addTime(10);
      g.show('RIOT EXTENDED', '+10 SECONDS', 1.5, true);
      sound.award();
      return;
    }
    this.riot = new Riot(this, this.modeMult);
    this.riot.start();
    g.show('RIOT!', this.riot.brief, 2, true);
    this.lampShow('strobe', 0.8);
    this.flashAll();
    sound.siren();
  }

  private endRiot(quiet = false) {
    const r = this.riot;
    if (!r) return;
    this.riot = null;
    if (!quiet) this.game.show('RIOT OVER', `TOTAL ${fmt(r.total)}`, 1.8);
  }

  private startWizard() {
    const g = this.game;
    this.wizardLit = false;
    this.wizard = new BurnItDown(this, this.modeMult);
    this.wizard.start();
    this.multiball = true;
    this.meltdownReady = false;
    g.show('BURN IT DOWN', 'TORCH THE FOUNDRY', 3, true);
    g.doFlash(MOLTEN, 0.7);
    g.doShake(10);
    this.lampShow('strobe', 2);
    this.flashAll();
    sound.siren();
    g.ballSave = Math.max(g.ballSave, 20);
    g.queueLaunches(3);
    this.music();
  }

  /** Ball over or tilt: everything timed stops. */
  endModes(quiet = false) {
    this.endJob(quiet);
    this.endRiot(quiet);
    this.selecting = 0;
  }

  music() {
    const j = this.job;
    const jobMusic = j && !j.inGrace ? (j.name === 'BLACKOUT' ? 'blackout' : 'mode') : 'main';
    sound.playMusic(this.wizard ? 'wizard' : this.multiball ? 'multiball' : jobMusic);
  }

  /** Feedback for a mode collecting a shot. */
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

  // ---------------------------------------------------------------- scoop

  private enterScoop(b: Ball) {
    if (b.captured || this.scoopBall || (b.tags.scoopIgnore ?? 0) > this.time) return;
    if (b.speed > 2300) return;
    const g = this.game;
    b.captured = true;
    b.x = SCOOP.x;
    b.y = SCOOP.y;
    b.vx = b.vy = 0;
    this.scoopBall = b;
    sound.scoop();
    this.comboShot();
    this.flash(3, 0.8);

    if (this.modeFor('scoop')) {
      this.event('scoop', b);
      this.holdScoop(1.2);
      return;
    }
    this.riot?.onShot('scoop', b);
    if (this.multiball && this.superLit) {
      const v = this.jackpot * 3;
      g.addScore(v);
      g.show('SUPER JACKPOT', fmt(v), 2.5, true);
      g.doFlash(INS.yellow, 0.8);
      g.doShake(12);
      this.celebrate(INS.yellow);
      sound.jackpot();
      this.superLit = false;
      this.jackpots = 0;
      this.holdScoop(1.5);
    } else if (this.wizardLit && this.canStartMode()) {
      this.startWizard();
      this.holdScoop(2.5);
    } else if (this.jobsLit > 0 && this.canStartMode() && this.unplayedLeft()) {
      this.beginSelect();
    } else if (this.pitLit && !this.job && g.canEnterPit()) {
      this.pitLit = false;
      this.scoopBall = null;
      g.enterPit(b);
    } else {
      g.addScore(30_000, SCOOP.x, SCOOP.y - 40);
      this.holdScoop(0.9);
    }
  }

  private holdScoop(t: number, then?: () => void) {
    this.scoopTimer = t;
    this.scoopAction = then ?? null;
  }

  /** Put a ball in the scoop and kick it out shortly (returning from the Pit). */
  spawnInScoop(delay = 1.2) {
    const b = this.addBall(SCOOP.x, SCOOP.y);
    b.captured = true;
    this.scoopBall = b;
    this.holdScoop(delay);
    return b;
  }

  private ejectScoop() {
    const b = this.scoopBall;
    if (!b) return;
    this.scoopBall = null;
    b.captured = false;
    b.tags.scoopIgnore = this.time + 0.6;
    this.validated = false;
    this.validateT = this.time;
    // Aim down toward the left flipper with a little randomness.
    const a = Math.atan2(530, -230) + (Math.random() - 0.5) * 0.12;
    b.vx = Math.cos(a) * 640;
    b.vy = Math.sin(a) * 640;
    b.y += 6;
    sound.eject();
    this.game.fx.sparks(SCOOP.x, SCOOP.y + 10, AMBER, 12, 300);
    this.flash(3, 0.6);
    this.game.doShake(3);
  }

  // ---------------------------------------------------------------- update

  override update(dt: number) {
    super.update(dt);
    const g = this.game;
    if (this.comboTimer > 0) this.comboTimer -= dt;
    if (this.reactorFlash > 0) this.reactorFlash -= dt;
    for (let i = 0; i < 3; i++) this.hitWobble[i] = Math.max(0, this.hitWobble[i] - dt * 4);
    for (const d of this.drops) d.anim += ((d.down ? 1 : 0) - d.anim) * Math.min(1, dt * 18);
    if (this.skillActive && !g.ballInShooter()) {
      this.skillTimer += dt;
      if (this.skillTimer > 4) this.skillActive = false;
    }

    if (g.ballInShooter() && this.world.balls.length === 1) {
      this.validated = false;
      this.validateT = this.time;
    }

    // Job selection while the ball waits in the scoop.
    if (this.selecting > 0) {
      this.selecting -= dt;
      if (this.selecting <= 0) this.startJob(this.selected);
    }

    // Mode clocks only run while the ball is in play.
    if (this.clockRunning()) {
      this.job?.tick(dt);
      this.riot?.tick(dt);
    }
    if (this.job?.finished) this.endJob();
    if (this.riot?.finished) this.endRiot();

    this.giTarget = g.tilted ? 0 : g.state === 'bonus' ? 0.35 : this.attract ? 0.9 : (this.job?.gi() ?? 1);
    this.giFlicker = this.riot ? 0.55 : 0;

    if (this.scoopBall && this.scoopTimer > 0 && this.selecting <= 0) {
      this.scoopTimer -= dt;
      if (this.scoopTimer <= 0) {
        const act = this.scoopAction;
        this.scoopAction = null;
        if (act) act();
        this.ejectScoop();
      }
    }
    if (this.dropResetTimer > 0) {
      this.dropResetTimer -= dt;
      if (this.dropResetTimer <= 0) {
        for (const d of this.drops) {
          d.down = false;
          d.seg.enabled = true;
        }
        sound.drop();
      }
    }
    // Spinner
    if (this.spinnerVel > 0.05) {
      this.spinnerAngle += this.spinnerVel * dt * Math.PI * 2;
      this.spinAccum += this.spinnerVel * dt;
      while (this.spinAccum >= 1) {
        this.spinAccum -= 1;
        g.addScore(2_500);
        this.sw('spinner');
        sound.spinner();
      }
      this.spinnerVel *= 1 - 1.4 * dt;
    }
    // Embers off the furnace, smoke from the vents
    this.emberTimer -= dt;
    if (this.emberTimer <= 0) {
      this.emberTimer = 0.09;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * FURNACE.r * 0.9;
      g.fx.ember(FURNACE.x + Math.cos(a) * r, FURNACE.y + Math.sin(a) * r);
      if (Math.random() < 0.35) g.fx.steam(Math.random() < 0.5 ? 55 : 500, 1090, 0, -1);
    }
  }

  /**
   * When mode clocks tick. Following FreeWPC's defaults, the clock stops while:
   * - any ball is held in the scoop (intros and awards don't cost time);
   * - no ball is on the table (single ball waiting at the plunger, or a relaunch);
   * - after a kickout or plunge, until the ball hits a playfield switch (2 s at most);
   * - every ball on the table is stuck (what ball search is for).
   * Cradling the ball does not stop the clock.
   */
  private clockRunning() {
    const g = this.game;
    if (g.state !== 'play' || g.tilted || g.transitioning || g.active !== this) return false;
    if (this.scoopBall) return false;
    const inPlay = this.world.balls.filter((b) => !this.inShooterLane(b));
    if (inPlay.length === 0) return false;
    if (inPlay.length === 1 && !this.validated && this.time - this.validateT < 2) return false;
    const free = inPlay.filter((b) => !b.captured);
    if (free.length > 0 && free.every((b) => b.stillTime > 1.5 && !this.onHeldFlipper(b))) return false;
    return true;
  }

  // ---------------------------------------------------------------- DMD

  drawDMD(d: DMD) {
    const g = this.game;
    const t = this.time;
    if (this.selecting > 0) {
      d.text('CHOOSE YOUR JOB', 64, 0, { align: 'center', level: 2 });
      d.fitText(JOBS[this.selected].name, 64, 9, 108, 2, { align: 'center' });
      const blink = Math.floor(t * 4) % 2 ? 3 : 1;
      d.text('<', 3, 12, { level: blink });
      d.text('>', 125, 12, { align: 'right', level: blink });
      d.text(`FLIPPERS CHANGE  ${Math.ceil(this.selecting)}`, 64, 25, { align: 'center', level: 2 });
      return;
    }
    const m = this.wizard ?? this.job ?? this.riot;
    if (m) {
      d.text(m.name, 1, 0, { level: 3 });
      if (m.timed) {
        const secs = Math.max(0, Math.ceil(m.timer));
        const blink = m.inGrace ? Math.floor(t * 10) % 2 : m.timer < 6 && Math.floor(t * 6) % 2;
        d.text(String(secs), 127, 0, { align: 'right', level: blink ? 1 : 3 });
      }
      d.fitText(fmt(g.score), 64, 9, 126, 2, { align: 'center' });
      let status = m.status();
      if (this.riot && m !== this.riot && Math.floor(t / 2) % 2 === 1) status = this.riot.status();
      d.text(status, 64, 25, { align: 'center', level: 2 });
      return;
    }
    d.fitText(fmt(g.score), 64, 3, 126, 2, { align: 'center' });
    d.text(`BALL ${g.ball}`, 1, 24, { level: 2 });
    const status = this.multiball
      ? `JP ${short(this.jackpot)}`
      : this.wizardLit
        ? 'BURN IT DOWN'
        : this.meltdownReady
          ? 'MELTDOWN'
          : this.jobsLit > 0 && this.unplayedLeft()
            ? 'JOB LIT'
            : this.pitLit
              ? 'PIT OPEN'
              : g.ballSave > 0 && !g.ballInShooter()
                ? 'SAVE'
                : `${g.bonusMult}X`;
    d.text(status, 127, 24, { align: 'right', level: 2 });
    if (g.ballInShooter()) d.text('LAUNCH', 64, 24, { align: 'center', level: Math.floor(t * 3) % 2 ? 3 : 1 });
  }

  // ---------------------------------------------------------------- art

  override ballZ(b: Ball) {
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < RAMP_PATH.length; i++) {
      const d = (RAMP_PATH[i][0] - b.x) ** 2 + (RAMP_PATH[i][1] - b.y) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return RAMP_Z[best];
  }

  protected override drawStatic(ctx: CanvasRenderingContext2D) {
    this.paintCabinet(ctx);
    ctx.save();
    strokePath(ctx, OUTER);
    ctx.lineTo(20, 1240);
    ctx.clip();
    this.paintFloor(ctx);
    this.paintFurnace(ctx);
    this.paintDecals(ctx);
    this.paintGI(ctx);
    this.drawInserts(ctx);
    this.paintLabels(ctx);
    this.paintRampShadow(ctx);
    this.paintShooterLane(ctx);
    ctx.restore();

    this.paintWalls(ctx);
    this.drawFlasherDomes(ctx);
    this.paintApron(ctx);
  }

  private paintCabinet(ctx: CanvasRenderingContext2D) {
    const R = rng(3);
    const g = ctx.createLinearGradient(0, 0, TABLE_W, 0);
    g.addColorStop(0, '#1a110b');
    g.addColorStop(0.5, '#2a1c12');
    g.addColorStop(1, '#1a110b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, TABLE_W, TABLE_H);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i < 140; i++) {
      const x = R() * TABLE_W;
      ctx.lineWidth = 0.5 + R() * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + (R() - 0.5) * 20, 400, x + (R() - 0.5) * 20, 800, x + (R() - 0.5) * 10, TABLE_H);
      ctx.stroke();
    }
    // steel side armour
    for (const x of [0, TABLE_W - 9]) {
      const sg = ctx.createLinearGradient(x, 0, x + 9, 0);
      sg.addColorStop(0, '#3a3836');
      sg.addColorStop(0.5, '#8a8682');
      sg.addColorStop(1, '#2a2826');
      ctx.fillStyle = sg;
      ctx.fillRect(x, 0, 9, TABLE_H);
      for (let y = 30; y < TABLE_H; y += 120) rivet(ctx, x + 4.5, y, 2.2);
    }
  }

  private paintFloor(ctx: CanvasRenderingContext2D) {
    const R = rng(7);
    ctx.fillStyle = '#1d1a17';
    ctx.fillRect(0, 0, TABLE_W, TABLE_H);

    // Riveted steel plates, each a slightly different age.
    const PW = 100;
    const PH = 120;
    for (let row = 0; row * PH < TABLE_H; row++)
      for (let col = -1; col * PW < TABLE_W; col++) {
        const x = col * PW + (row % 2 ? 50 : 0);
        const y = row * PH;
        const base = mix('#1b1916', '#35312c', R());
        const pg = ctx.createLinearGradient(x, y, x + PW, y + PH);
        pg.addColorStop(0, shade(base, 0.06));
        pg.addColorStop(1, shade(base, -0.25));
        ctx.fillStyle = pg;
        ctx.fillRect(x, y, PW, PH);
        // brushed grain
        ctx.globalAlpha = 0.05;
        ctx.strokeStyle = '#d8d0c4';
        for (let i = 0; i < 9; i++) {
          const yy = y + R() * PH;
          ctx.lineWidth = 0.6 + R();
          ctx.beginPath();
          ctx.moveTo(x + R() * 30, yy);
          ctx.lineTo(x + PW - R() * 30, yy + (R() - 0.5) * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x, y, PW, 2);
        ctx.fillRect(x, y, 2, PH);
        ctx.fillStyle = 'rgba(255,230,200,0.05)';
        ctx.fillRect(x + 2, y + 2, PW - 2, 1);
        for (const [rx, ry] of [
          [x + 8, y + 8],
          [x + PW - 8, y + 8],
          [x + 8, y + PH - 8],
          [x + PW - 8, y + PH - 8],
          [x + PW / 2, y + 8],
        ] as P[]) {
          rivet(ctx, rx, ry, 2.3);
          if (R() < 0.35) this.rustStreak(ctx, rx, ry + 2, 15 + R() * 55, 1 + R() * 2.5);
        }
      }

    // Rust blooms
    for (let i = 0; i < 34; i++) {
      const x = R() * TABLE_W;
      const y = R() * TABLE_H;
      const r = 12 + R() * 48;
      for (let k = 0; k < 7; k++) {
        const ox = x + (R() - 0.5) * r;
        const oy = y + (R() - 0.5) * r;
        const rr = r * (0.3 + R() * 0.6);
        const rg = ctx.createRadialGradient(ox, oy, 0, ox, oy, rr);
        const col = R() < 0.5 ? '#7a3814' : R() < 0.5 ? '#5a2a10' : '#9a5228';
        rg.addColorStop(0, withAlpha(col, 0.22 + R() * 0.22));
        rg.addColorStop(1, withAlpha(col, 0));
        ctx.fillStyle = rg;
        ctx.fillRect(ox - rr, oy - rr, rr * 2, rr * 2);
      }
      ctx.fillStyle = 'rgba(140,70,30,0.35)';
      for (let k = 0; k < 30; k++) ctx.fillRect(x + (R() - 0.5) * r * 1.4, y + (R() - 0.5) * r * 1.4, 1 + R() * 2, 1 + R() * 2);
    }

    // Oil stains
    for (let i = 0; i < 14; i++) {
      const x = R() * TABLE_W;
      const y = R() * TABLE_H;
      const r = 14 + R() * 36;
      const og = ctx.createRadialGradient(x, y, 0, x, y, r);
      og.addColorStop(0, 'rgba(4,3,2,0.55)');
      og.addColorStop(0.7, 'rgba(4,3,2,0.3)');
      og.addColorStop(1, 'rgba(4,3,2,0)');
      ctx.fillStyle = og;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.5 + R() * 0.5), R() * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Scratches
    ctx.strokeStyle = 'rgba(230,215,195,0.07)';
    for (let i = 0; i < 260; i++) {
      const x = R() * TABLE_W;
      const y = R() * TABLE_H;
      const a = R() * Math.PI;
      const l = 4 + R() * 26;
      ctx.lineWidth = 0.4 + R() * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }

    // Soot builds up against the walls
    for (const [wdt, a] of [
      [90, 0.12],
      [55, 0.16],
      [26, 0.22],
    ] as [number, number][]) {
      ctx.save();
      ctx.lineJoin = 'round';
      strokePath(ctx, OUTER);
      ctx.strokeStyle = `rgba(0,0,0,${a})`;
      ctx.lineWidth = wdt;
      ctx.stroke();
      ctx.restore();
    }
    const vg = ctx.createRadialGradient(CX, 640, 180, CX, 640, 820);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, TABLE_W, TABLE_H);

    // Diamond tread plate where the flippers live
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(20, 1000);
    ctx.lineTo(535, 1000);
    ctx.lineTo(535, 1200);
    ctx.lineTo(20, 1200);
    ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(20, 1000, 515, 200);
    for (let y = 1004; y < 1200; y += 12)
      for (let x = 24 + ((y / 12) % 2) * 9; x < 535; x += 18) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(((y / 12) % 2 ? 1 : -1) * 0.7);
        ctx.fillStyle = 'rgba(200,190,175,0.1)';
        ctx.fillRect(-5, -1.2, 10, 2.4);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-5, 1.2, 10, 1);
        ctx.restore();
      }
    ctx.restore();
  }

  private rustStreak(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, w: number) {
    const g = ctx.createLinearGradient(x, y, x, y + len);
    g.addColorStop(0, 'rgba(130,60,20,0.5)');
    g.addColorStop(1, 'rgba(130,60,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w * 0.2, y + len);
    ctx.lineTo(x - w * 0.2, y + len);
    ctx.fill();
  }

  private paintFurnace(ctx: CanvasRenderingContext2D) {
    const { x, y, r } = FURNACE;
    const R = rng(21);
    // hazard collar
    ctx.save();
    ctx.lineWidth = 12;
    ctx.strokeStyle = HAZARD;
    ctx.beginPath();
    ctx.arc(x, y, r + 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = '#15120e';
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    // molten metal
    const mg = ctx.createRadialGradient(x - 10, y - 8, 0, x, y, r);
    mg.addColorStop(0, '#fff1c2');
    mg.addColorStop(0.22, '#ffbe5c');
    mg.addColorStop(0.5, '#ff6a1a');
    mg.addColorStop(0.8, '#a32c08');
    mg.addColorStop(1, '#2a0802');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // slag crust floating on it
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    for (let i = 0; i < 46; i++) {
      const a = R() * Math.PI * 2;
      const d = Math.sqrt(R()) * r;
      const cx = x + Math.cos(a) * d;
      const cy = y + Math.sin(a) * d;
      const s = 5 + R() * 16;
      ctx.fillStyle = `rgba(${30 + R() * 30},${10 + R() * 10},4,${0.45 + R() * 0.35})`;
      ctx.beginPath();
      for (let k = 0; k < 7; k++) {
        const aa = (k / 7) * Math.PI * 2;
        const rr = s * (0.5 + R() * 0.5);
        ctx.lineTo(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr * 0.8);
      }
      ctx.fill();
    }
    ctx.restore();
    // grate over the pit
    ctx.save();
    ctx.lineCap = 'round';
    for (const [wdt, col] of [
      [7, '#0d0b09'],
      [2, '#5a524a'],
    ] as [number, string][]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = wdt;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16);
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        ctx.stroke();
      }
      for (const rr of [16, 42, 68]) {
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
    // steel rim with bolts
    softShadow(ctx, 6, 0, 2, 'rgba(0,0,0,0.8)', () => {
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.lineWidth = 10;
    const rg = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    rg.addColorStop(0, '#6a625a');
    rg.addColorStop(1, '#25211d');
    ctx.strokeStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      rivet(ctx, x + Math.cos(a) * (r + 4), y + Math.sin(a) * (r + 4), 2);
    }
  }

  private paintDecals(ctx: CanvasRenderingContext2D) {
    // Job board: an iron plate behind the ring of job inserts
    const { x, y } = RING;
    ctx.save();
    const pg = ctx.createRadialGradient(x, y - 20, 10, x, y, 116);
    pg.addColorStop(0, '#2c2722');
    pg.addColorStop(1, '#14110e');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(x, y, 114, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = withAlpha(HAZARD, 0.35);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 108, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      rivet(ctx, x + Math.cos(a) * 110, y + Math.sin(a) * 110, 2);
    }
    // clock face ticks
    ctx.strokeStyle = 'rgba(217,164,65,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 70, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    this.paintLogoBoard(ctx);

    // Stencils and graffiti
    this.stencil(ctx, 'SECTOR 9', 52, 540, 13, -Math.PI / 2, 0.22);
    this.stencil(ctx, 'LINE 3', 502, 560, 13, -Math.PI / 2, 0.22);
    this.stencil(ctx, 'DANGER', 48, 1010, 12, -Math.PI / 2, 0.3, INS.red);
    this.stencil(ctx, 'DANGER', 507, 1010, 12, -Math.PI / 2, 0.3, INS.red);
    sprayText(ctx, 'PAY OR BLEED', 432, 318, 14, '#b3261e', -Math.PI / 2 + 0.08, 4);
    sprayText(ctx, 'NO MERCY', CX, 1012, 15, '#d8cfc0', 0.06, 8);
    sprayText(ctx, 'KINGPIN LIES', 502, 430, 12, '#d9a441', -Math.PI / 2, 9);
    splatter(ctx, 380, 452, 9, 6);
    splatter(ctx, 436, 402, 5, 12);
    splatter(ctx, 164, 640, 6, 17);
  }

  private stencil(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, angle: number, a: number, color = '#d8cfc0') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.font = `800 ${size}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = withAlpha(color, a);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  /** Painted FOUNDRY lettering under a pink neon "Neon": the one real neon sign on the table. */
  private paintLogoBoard(ctx: CanvasRenderingContext2D) {
    const x = CX;
    const y = 905;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.05);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(-104, -42, 208, 86, 10);
    ctx.fill();
    ctx.font = '900 44px Impact, "Arial Black", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#3a2a1c';
    ctx.fillText('FOUNDRY', 2, 22);
    ctx.fillStyle = '#c9b89a';
    ctx.fillText('FOUNDRY', 0, 20);
    // wear the paint
    const R = rng(13);
    ctx.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 320; i++) {
      ctx.fillStyle = R() < 0.6 ? 'rgba(30,24,18,0.7)' : 'rgba(120,60,25,0.5)';
      ctx.fillRect(-100 + R() * 200, -2 + R() * 44, 1 + R() * 4, 1 + R() * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  private neonPath(ctx: CanvasRenderingContext2D) {
    ctx.font = 'italic 700 40px "Snell Roundhand", "Brush Script MT", "Segoe Script", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  }

  private paintGI(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pool = (x: number, y: number, r: number, a: number, c = AMBER) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, withAlpha(c, a));
      g.addColorStop(1, withAlpha(c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    pool(139, 925, 100, 0.13);
    pool(416, 925, 100, 0.13);
    pool(94, 880, 55, 0.1);
    pool(461, 880, 55, 0.1);
    pool(282, 140, 130, 0.08);
    pool(FURNACE.x, FURNACE.y, 190, 0.16, MOLTEN);
    pool(405, 445, 70, 0.07);
    pool(CX, 1010, 140, 0.05);
    pool(52, 640, 70, 0.05);
    pool(502, 640, 70, 0.05);
    ctx.restore();
  }

  private paintLabels(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = (t: string, x: number, y: number, size = 8, color = '#cbbfa8', angle = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.font = `800 ${size}px "Arial Narrow", system-ui, sans-serif`;
      ctx.fillStyle = withAlpha(color, 0.7);
      ctx.fillText(t, 0, 0);
      ctx.restore();
    };
    label('REACTOR', 282, 556, 8);
    label('MELTDOWN', 127.5, 722, 7.5);
    label('BONUS', CX, 848, 8);
    label('BURN IT DOWN', RING.x, 722, 8, AMBER);
    label('JOBS', RING.x, 778, 10, HAZARD);
    label('SPINNER', 52, 506, 7);
    label('THE PIT', 452, 456, 7, INS.purple);
    ctx.restore();
  }

  private paintRampShadow(ctx: CanvasRenderingContext2D) {
    const { left, right } = RAMP_WALLS;
    const body: P[] = [...left, ...[...right].reverse()];
    softShadow(ctx, 14, 10, 14, 'rgba(0,0,0,0.5)', () => {
      strokePath(ctx, body, true);
      ctx.fill();
    });
    // the floor under the ramp entrance is always in shade
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    strokePath(ctx, RAMP_BASE, true);
    ctx.fill();
  }

  private paintShooterLane(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#100e0c';
    ctx.fillRect(535, 300, 45, 880);
    ctx.save();
    ctx.beginPath();
    ctx.rect(535, 300, 45, 880);
    ctx.clip();
    for (let y = 304; y < 1180; y += 12)
      for (let x = 539 + ((y / 12) % 2) * 9; x < 580; x += 18) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(((y / 12) % 2 ? 1 : -1) * 0.7);
        ctx.fillStyle = 'rgba(200,190,175,0.09)';
        ctx.fillRect(-5, -1.2, 10, 2.4);
        ctx.restore();
      }
    ctx.restore();
    hazard(ctx, 538, 1060, 40, 110, 12, 2);
    this.stencil(ctx, 'L A U N C H', 558, 800, 15, -Math.PI / 2, 0.3, HAZARD);
  }

  private paintWalls(ctx: CanvasRenderingContext2D) {
    wall(ctx, RAMP_BASE, WALL);
    wall(ctx, RIGHT_INNER, WALL);
    wall(ctx, SCOOP_CUP, RAIL);
    wall(ctx, DEFLECT_L, RUBBER);
    wall(ctx, DEFLECT_R, RUBBER);
    for (const p of [DEFLECT_L[1], DEFLECT_R[1]]) post(ctx, p[0], p[1], 4);
    for (const x of LANE_X) {
      wall(
        ctx,
        [
          [x, 100],
          [x, 160],
        ],
        GUIDE,
      );
      post(ctx, x, 160, 4);
    }
    for (const g of this.lower.guides) wall(ctx, g, GUIDE);
    for (const s of this.lower.slings) slingshot(ctx, s, '#8a2a14', '#1a0e08');
    post(ctx, 250, 478, 4);
    post(ctx, 315, 478, 4);
    wall(ctx, PLUNGER_WALL, RAIL);
    wall(ctx, GATE, { ...GUIDE, w: 4, h: 26 });
    wall(ctx, OUTER, CABINET);
    // A little neon: the ramp entrance has a red tube over the mouth.
    neonTube(
      ctx,
      [
        [96, 606],
        [159, 606],
      ],
      NEON_PINK,
      34,
      3,
    );
  }

  private paintApron(ctx: CanvasRenderingContext2D) {
    const pts: P[] = [
      [20, 1110],
      [CX - 60, 1150],
      [CX + 60, 1150],
      [535, 1110],
      [535, 1200],
      [20, 1200],
    ];
    const lh = lift(16);
    softShadow(ctx, 10, 0, -4, 'rgba(0,0,0,0.8)', () => {
      strokePath(ctx, pts, true, lh);
      ctx.fill();
    });
    for (let i = 0; i <= 8; i++) {
      strokePath(ctx, pts, true, (lh * i) / 8);
      ctx.fillStyle = mix('#0e0c0a', '#2a2420', i / 8);
      ctx.fill();
    }
    ctx.save();
    strokePath(ctx, pts, true, lh);
    const ag = ctx.createLinearGradient(0, 1100, 0, 1200);
    ag.addColorStop(0, '#3a3430');
    ag.addColorStop(1, '#1c1916');
    ctx.fillStyle = ag;
    ctx.fill();
    ctx.clip();
    hazard(ctx, 20, 1182 - lh, 515, 18, 14, 5);
    // instruction cards
    const card = (x: number, y: number, lines: string[]) => {
      ctx.fillStyle = '#d8cdb6';
      ctx.beginPath();
      ctx.roundRect(x, y, 150, 36, 3);
      ctx.fill();
      ctx.fillStyle = '#1a1410';
      ctx.font = '800 6.3px "Arial Narrow", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      lines.forEach((l, i) => ctx.fillText(l, x + 5, y + 3.5 + i * 8, 140));
    };
    card(42, 1145 - lh, ['SPELL H-I-T  ·  LIGHT A JOB', 'SHOOT SCOOP  ·  START JOB', 'R-I-O-T LANES  ·  RIOT FRENZY', 'ALL 5 JOBS  ·  BURN IT DOWN']);
    card(366, 1145 - lh, ['3 RAMPS  ·  MELTDOWN MULTIBALL', 'DROP TARGETS  ·  OPEN THE PIT', 'A-M-P LANES  ·  BONUS X', 'BEAT BRICK  ·  EXTRA BALL']);
    ctx.restore();
    for (const x of [30, 525]) rivet(ctx, x, 1150 - lh, 2.5);
  }

  protected override drawRamps(ctx: CanvasRenderingContext2D) {
    const { left, right } = RAMP_WALLS;
    const n = RAMP_PATH.length;
    const dz = (i: number) => lift(RAMP_Z[i]);
    const at = (p: P, i: number): P => [p[0], p[1] - dz(i)];
    const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

    // supports down to the floor
    for (let i = 4; i < n - 3; i += 6) {
      if (RAMP_Z[i] < 14) continue;
      for (const side of [left[i], right[i]]) {
        const h = dz(i);
        ctx.fillStyle = '#3a3430';
        ctx.fillRect(side[0] - 2, side[1] - h, 4, h);
        ctx.fillStyle = 'rgba(255,240,220,0.22)';
        ctx.fillRect(side[0] - 2, side[1] - h, 1.2, h);
      }
    }

    // conveyor section: steel bed with rollers every few units
    for (let i = 0; i < RAMP_WIRE_FROM; i++) {
      const q = [at(left[i], i), at(left[i + 1], i + 1), at(right[i + 1], i + 1), at(right[i], i)];
      ctx.beginPath();
      q.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      const c = mix('#2a2622', '#3e3832', i / RAMP_WIRE_FROM);
      ctx.fillStyle = c;
      ctx.fill();
      ctx.strokeStyle = c;
      ctx.lineWidth = 1;
      ctx.stroke();
      const segLen = Math.hypot(RAMP_PATH[i + 1][0] - RAMP_PATH[i][0], RAMP_PATH[i + 1][1] - RAMP_PATH[i][1]);
      const rollers = Math.max(1, Math.round(segLen / 8));
      for (let r = 0; r < rollers; r++) {
        const t = r / rollers;
        const a = lerp(q[0], q[1], t);
        const b = lerp(q[3], q[2], t);
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1] + 1.5);
        ctx.lineTo(b[0], b[1] + 1.5);
        ctx.stroke();
        ctx.strokeStyle = '#8a8178';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,235,210,0.45)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1] - 0.6);
        ctx.lineTo(b[0], b[1] - 0.6);
        ctx.stroke();
      }
    }
    // wireform return: rails you can see the floor through
    ctx.lineCap = 'round';
    for (const [path, off] of [
      [left, 0.35],
      [right, 0.35],
      [left, 1],
      [right, 1],
    ] as [P[], number][]) {
      const pts = RAMP_PATH.map((c, i) => [c[0] + (path[i][0] - c[0]) * off, c[1] + (path[i][1] - c[1]) * off - dz(i) - (off === 1 ? lift(14) : 0)] as P).slice(RAMP_WIRE_FROM - 1);
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.lineWidth = 4.5;
      strokePath(ctx, pts);
      ctx.stroke();
      ctx.strokeStyle = '#cfc8be';
      ctx.lineWidth = 2;
      strokePath(ctx, pts);
      ctx.stroke();
    }
    // wire hoops tying the rails together
    for (let i = RAMP_WIRE_FROM; i < n - 1; i += 3) {
      const a = at(left[i], i);
      const b = at(right[i], i);
      ctx.strokeStyle = '#9a948c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1] - lift(14));
      ctx.lineTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(b[0], b[1] - lift(14));
      ctx.stroke();
    }
    // steel side walls on the conveyor section
    for (const side of [left, right]) {
      const H = 18;
      const seg = side.slice(0, RAMP_WIRE_FROM + 1);
      for (let s = 0; s <= 7; s++) {
        const pts = seg.map((p, i) => [p[0], p[1] - dz(i) - lift((H * s) / 7)] as P);
        ctx.strokeStyle = s === 7 ? '#d8d0c4' : mix('#1c1916', '#5a524a', s / 7);
        ctx.lineWidth = s === 7 ? 3 : 5.5;
        ctx.lineJoin = 'round';
        strokePath(ctx, pts);
        ctx.stroke();
      }
    }
    // entrance flap
    const fy = 612 - dz(0);
    ctx.fillStyle = '#5a524a';
    ctx.fillRect(95, fy - 4, 65, 5);
    hazard(ctx, 97, fy - 3, 61, 3, 5, 9);
    ctx.save();
    ctx.translate(127.5, 520 - lift(30));
    ctx.font = '800 9px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(217,164,65,0.75)';
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('CONVEYOR', 0, 3);
    ctx.restore();
    return true;
  }

  protected override drawDynamic(ctx: CanvasRenderingContext2D) {
    const t = this.time;
    // The furnace breathes.
    const pulse = 0.5 + 0.3 * Math.sin(t * 2.3) + 0.2 * Math.sin(t * 7.1);
    drawGlow(ctx, FURNACE.x, FURNACE.y, FURNACE.r * 1.15, MOLTEN, 0.16 + pulse * 0.14);

    // The neon sign flickers now and then.
    const flick = Math.sin(t * 43) * Math.sin(t * 2.9) > 0.92 ? 0.25 : 1;
    const neon = sprite('neon-sign', 240, 90, (g) => {
      this.neonPath(g);
      g.translate(120, 40);
      g.rotate(-0.05);
      g.shadowColor = NEON_PINK;
      g.shadowBlur = 18 * art.k;
      g.lineWidth = 3.4;
      g.strokeStyle = NEON_PINK;
      g.strokeText('Neon', 0, -14);
      g.shadowBlur = 6 * art.k;
      g.lineWidth = 1.3;
      g.strokeStyle = '#ffe0ea';
      g.strokeText('Neon', 0, -14);
    });
    ctx.globalAlpha = flick;
    ctx.drawImage(neon, CX - 120, 905 - 40, 240, 90);
    ctx.globalAlpha = 1;
    drawGlow(ctx, CX, 892, 70, NEON_PINK, 0.25 * flick);

    // Scoop interior lights up when it has something to give.
    if (this.shotLamp('scoop')) {
      const c = this.modeFor('scoop')?.color ?? (this.superLit ? INS.yellow : this.pitLit && !this.jobsLit ? INS.red : INS.white);
      drawGlow(ctx, SCOOP.x, SCOOP.y, 40, c, 0.35 + 0.3 * Math.sin(t * 6));
    }

    // Plunger
    const py = 1180 + this.plungerPull * 50;
    ctx.strokeStyle = '#8a8680';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const coils = 7;
    for (let i = 0; i <= coils * 2; i++) {
      const yy = py + 6 + (i / (coils * 2)) * (1236 - py - 6);
      ctx.lineTo(i % 2 ? 563 : 552, yy);
    }
    ctx.stroke();
    cylinder(ctx, 557.5, py + 2, 6, 0, 12, '#6a625a', '#b8b0a6');
  }

  protected override sprites(out: Sprite[]) {
    // Pop bumpers
    for (const c of this.bumpers) {
      const hit = Math.max(0, 1 - c.lastHit / 0.18);
      out.push({ y: c.y, draw: (ctx) => drawBumper(ctx, c.x, c.y, c.r, REACTOR_BUMPER, hit, AMBER) });
    }
    // Drop targets sink into the floor
    this.drops.forEach((d, i) => {
      const y = DROP_Y[i];
      const z = 26 * (1 - d.anim);
      out.push({
        y: y + 34,
        draw: (ctx) => {
          if (z < 1) return;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(458, y + 3, 6, 34);
          box(ctx, 448, y, 12, 34, z, '#d9a441', '#8a6420');
          hazard(ctx, 448, y + 10 - lift(z), 12, 12, 4, i + 3);
        },
      });
    });
    // H-I-T standups
    for (let i = 0; i < 3; i++) {
      const y0 = HIT_Y[i] + 3;
      const y1 = HIT_Y[i + 1] - 3;
      const wob = Math.sin(this.time * 60) * this.hitWobble[i] * 1.5;
      out.push({
        y: y1,
        draw: (ctx) => {
          box(ctx, 160 + wob, y0, 7, y1 - y0, 24, this.hitLit[i] ? '#f4efe6' : '#c9bfae', '#6a625a');
          ctx.font = '900 11px Impact, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#b3261e';
          ctx.fillText('HIT'[i], 163.5 + wob, (y0 + y1) / 2 - lift(24));
        },
      });
    }
    // Reactor standup
    const rf = Math.max(0, this.reactorFlash / 0.4);
    out.push({
      y: 480,
      draw: (ctx) => {
        box(ctx, 257, 473, 51, 7, 24, rf > 0 ? '#fff6dc' : '#d9a441', '#6a4a18');
        ctx.fillStyle = '#1a120a';
        ctx.font = '900 7px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('REACTOR', 282.5, 476.5 - lift(24) + 4);
        if (rf > 0) drawGlow(ctx, 282, 470, 40 + rf * 30, INS.yellow, rf);
      },
    });
  }

  protected override drawTop(ctx: CanvasRenderingContext2D) {
    // Spinner flag hanging from its wire across the left orbit.
    const wy = 480 - lift(34);
    const a = this.spinnerAngle;
    const L = 18;
    const reach = L * Math.sin(a) + lift(L * Math.cos(a));
    ctx.fillStyle = '#25221f';
    ctx.fillRect(20, wy - 2, 66, 3);
    const face = Math.cos(a);
    ctx.fillStyle = face > 0 ? mix('#5a544e', '#d8d0c4', face) : mix('#3a3632', '#7a746c', -face);
    ctx.fillRect(24, Math.min(wy, wy + reach), 57, Math.abs(reach) + 1);
    ctx.fillStyle = '#b3261e';
    ctx.fillRect(24, wy + reach / 2 - 1, 57, 2);
    drawShadow(ctx, 52, 486, 30, 5, 0.3);
  }
}
