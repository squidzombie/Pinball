// Dust & Lead: the western table. Layout round 2 (docs/dust-and-lead/DESIGN.md): the geometry and
// its physics at a 6.5° slope, the toys' mechanisms, and plain drawing. No scoring or modes yet; the
// display names each shot as it's made so the layout can be tried.

import { FLOOR, RAMP, RAMP2, Flipper, LineSensor, ZoneSensor, gravityAt, type Ball, type Circle, type Segment } from '../../engine/physics';
import { sound } from '../../engine/audio';
import type { DMD } from '../../engine/dmd';
import type { Game } from '../game';
import { buildLowerSection, poly, type LowerSection, type P } from './geom';
import * as L from './dust-layout';
import { POSTER_COLORS, POSTER_NAMES, POSTER_SPOTS, paintDynamic, paintFloor, paintRamps, paintTop, spriteList, type DustView } from './dust-art';
import type { Lamp, LampState } from './draw';
import { Table, type Sprite } from './table';

export const DUST_SLOPE = 6.5;

/** Ramp gravity, as on Cyber Psychosis: a real ramp's climb and descent in these units. */
const RAMP_G = 7000;
const RAMP_LAYER = [RAMP, RAMP2];

/** The shots the display names, in the order the layout lists them. */
export type DustShot = 'railroad' | 'mine' | 'pan' | 'jail' | 'noon' | 'quickdraw' | 'hardware' | 'sheriff' | 'stage' | 'saloon';
export const SHOT_NAME: Record<DustShot, string> = {
  railroad: 'RAILROAD',
  mine: 'GOLD MINE',
  pan: 'GOLD PAN',
  jail: 'JAILHOUSE',
  noon: 'HIGH NOON',
  quickdraw: 'QUICK DRAW',
  hardware: 'HARDWARE',
  sheriff: 'SHERIFF',
  stage: 'STAGECOACH',
  saloon: 'SALOON',
};

/** Which shots each Wanted poster's mode will use (a preview until the rule sheet). */
const WANTED_SHOTS: DustShot[][] = [['jail', 'noon'], ['mine', 'pan'], ['railroad', 'saloon'], ['jail', 'railroad'], ['stage', 'saloon'], ['noon', 'mine', 'stage']];

interface Drop {
  seg: Segment;
  down: boolean;
  anim: number;
}

/** A ball the table is carrying: up the mine and along the wire, into the pan, or held in a cup or the jail. */
interface Trip {
  b: Ball;
  kind: 'mine' | 'pan' | 'cup' | 'jail';
  t: number;
  /** Where the trip started (the pan drop). */
  from?: P;
  z0?: number;
  /** Which pan cup. */
  cup?: number;
}

const MINE_LIFT_S = 1.0;
const WIRE_SPEED = 620;
const PAN_DROP_S = 0.35;
const CUP_HOLD_S = 0.7;
const JAIL_HOLD_S = 1.0;
const JAIL_EJECT = 520;

export class DustAndLead extends Table implements DustView {
  multiball: string | null = null;
  lower: LowerSection;
  saloonFlipper: Flipper;
  bumpers: Circle[] = [];
  bumperFlash = [0, 0];
  drops: Drop[] = [];
  trips: Trip[] = [];
  /** Which High Noon window the outlaw stands in (0..2), and how far he's walked toward the next. */
  outlaw = 1;
  outlawWalk = 0;
  private outlawDir = 1;
  private outlawT = 0;
  doorsSwing = 0;
  /** Flashes on each target as it's hit: windows 0-2, side window 3, Hardware 4, Sheriff 5. */
  targetFlash = [0, 0, 0, 0, 0, 0];
  cupFlash = [0, 0, 0];
  /** Gold Mine trips since the pan last took a ball: the third turns the next into the pan. */
  oreCarts = 0;
  get panLit() {
    return this.oreCarts >= 3;
  }
  /** What was made last, for the display. */
  private last: { name: string; t: number } | null = null;
  /** When each shot was last made (its arrow flashes), and how many this ball (the reward ladder). */
  private madeAt: Partial<Record<DustShot, number>> = {};
  private madeThisBall = 0;
  /** 0..1: the stagecoach toy rocks after a ramp. */
  coachRock = 0;
  private counts: Partial<Record<DustShot, number>> = {};
  /** Balls just let out of the jail, ignored by its hole for a moment. */
  private jailIgnore = new Map<number, number>();

  constructor(game: Game) {
    super(game);
    const w = this.world;
    w.gravity = gravityAt(DUST_SLOPE);
    this.flipperStyle = { body: '#efe2c8', rubber: '#9a3a1e', ink: '#251812' };
    // At 6.5° the plunge needs far less than Cyber Psychosis's: full pull still reaches the saloon
    // with room to spare, and half pull clears the top.
    this.autoLaunchSpeed = 2150;

    // Cabinet, shooter lane, the arch and the saloon doors
    poly(w, L.OUTER, { restitution: 0.35, friction: 0.02 });
    poly(w, L.SHOOTER_FLOOR, { restitution: 0.2 });
    poly(w, L.DIVIDER, { restitution: 0.3, friction: 0.02 });
    const end = L.DIVIDER[L.DIVIDER.length - 1];
    w.circle(end[0], end[1], 4, { restitution: 0.4 });
    for (const [a, b] of [L.DOOR_L, L.DOOR_R]) w.seg(a[0], a[1], b[0], b[1], { oneWay: true, restitution: 0.3 });

    // Railroad lane (left orbit) and its drop targets
    poly(w, L.RR_INNER, { restitution: 0.35, friction: 0.02 });
    w.circle(L.RR_MOUTH[1][0], L.RR_MOUTH[1][1], 5, { restitution: 0.6 });
    L.RR_DROPS.forEach(([a, b], i) => {
      const seg = w.seg(a[0], a[1], b[0], b[1], { restitution: 0.3, onHit: (h) => this.hitDrop(i, h.speed) });
      this.drops.push({ seg, down: false, anim: 0 });
    });

    // The saloon: its walls, the guide onto the flipper, the flipper
    poly(w, L.SALOON_LEFT, { restitution: 0.3 });
    poly(w, L.SALOON_RIGHT, { restitution: 0.35, friction: 0.02 });
    const tip = L.SALOON_RIGHT[L.SALOON_RIGHT.length - 1];
    w.circle(tip[0], tip[1], 4, { restitution: 0.4 });
    poly(w, L.SALOON_GUIDE, { restitution: 0.3 });
    this.saloonFlipper = new Flipper(L.UF.px, L.UF.py, L.UF.len, L.UF.rest, L.UF.up);
    w.flippers.push(this.saloonFlipper);
    this.extraFlippers.push({ f: this.saloonFlipper, side: 1 });

    // The Gold Mine's house: solid (the ramp passes over its front at height; floor balls under the ramp
    // used to roll straight into it)
    const H = L.MINE_HOUSE;
    poly(
      w,
      [
        [H.x0, H.y0],
        [H.x1, H.y0],
        [H.x1, H.y1],
        [H.x0, H.y1],
      ],
      { restitution: 0.35 },
      true,
    );

    // Pops
    L.BUMPERS.forEach(([x, y], i) => {
      const c = w.circle(x, y, L.BUMPER_R, {
        restitution: 0.6,
        kick: 700,
        kickThreshold: 10,
        onHit: () => {
          this.bumperFlash[i] = 1;
          sound.bumper();
        },
      });
      this.bumpers.push(c);
    });

    // High Noon: the building, its three windows and the side window
    for (const part of L.NOON_WALLS) poly(w, part, { restitution: 0.35 });
    L.NOON_WINDOWS.forEach(([a, b], i) => w.seg(a[0], a[1], b[0], b[1], { restitution: 0.35, onHit: (h) => h.speed > 70 && this.hitWindow(i) }));
    w.seg(L.NOON_SIDE[0][0], L.NOON_SIDE[0][1], L.NOON_SIDE[1][0], L.NOON_SIDE[1][1], { restitution: 0.35, onHit: (h) => h.speed > 70 && this.hitTarget(3, 'quickdraw') });

    // Sheriff and Hardware
    poly(w, [L.HARDWARE[1], ...L.TOWN.slice(2), L.SHERIFF[1]], { restitution: 0.35 });
    w.seg(L.HARDWARE[0][0], L.HARDWARE[0][1], L.HARDWARE[1][0], L.HARDWARE[1][1], { restitution: 0.35, onHit: (h) => h.speed > 70 && this.hitTarget(4, 'hardware') });
    w.seg(L.TOWN[0][0], L.TOWN[0][1], L.HARDWARE[0][0], L.HARDWARE[0][1], { restitution: 0.35 });
    w.seg(L.SHERIFF[0][0], L.SHERIFF[0][1], L.SHERIFF[1][0], L.SHERIFF[1][1], { restitution: 0.35, onHit: (h) => h.speed > 70 && this.hitTarget(5, 'sheriff') });
    w.seg(L.SHERIFF[0][0], L.SHERIFF[0][1], L.TOWN[0][0], L.TOWN[0][1], { restitution: 0.35 });
    w.seg(L.SHERIFF[1][0], L.SHERIFF[1][1], L.TOWN[4][0], L.TOWN[4][1], { restitution: 0.35 });

    // Gold Pan: a closed bowl (the ramp drops balls in, the cups let them out), its pins and cups
    const bowl: P[] = [];
    for (let i = 0; i <= 40; i++) bowl.push([L.PAN.x + Math.cos((i / 40) * Math.PI * 2) * L.PAN.r, L.PAN.y + Math.sin((i / 40) * Math.PI * 2) * L.PAN.r]);
    poly(w, bowl, { restitution: 0.3 });
    for (const [x, y] of L.PAN_PINS) w.circle(x, y, L.PAN_PIN_R, { restitution: 0.5 });
    for (const [a, b] of L.PAN_DIVIDERS) {
      w.seg(a[0], a[1], b[0], b[1], { restitution: 0.3 });
      w.circle(a[0], a[1], 2, { restitution: 0.4 });
    }
    poly(w, L.PAN_ROOF, { restitution: 0.3 });
    L.PAN_CUPS.forEach(([x, y], i) => w.zones.push(new ZoneSensor(x, y, L.PAN_CUP_R, (b) => this.intoCup(b, i))));

    // Jailhouse scoop
    poly(w, L.JAIL_WALLS, { restitution: 0.25 });
    w.zones.push(new ZoneSensor(L.JAIL_HOLE[0], L.JAIL_HOLE[1], L.JAIL_CATCH_R, (b) => this.intoJail(b)));

    // Ramps: walls on their own layer, the foot blocks the floor, the entry line lifts the ball onto it
    L.RAMPS.forEach((r, idx) => {
      const layer = RAMP_LAYER[idx];
      poly(w, r.walls.left, { layers: layer, restitution: 0.3, friction: 0.02 });
      poly(w, r.walls.right, { layers: layer, restitution: 0.3, friction: 0.02 });
      poly(w, r.walls.left.slice(0, r.baseTo + 1), { restitution: 0.35 });
      poly(w, r.walls.right.slice(0, r.baseTo + 1), { restitution: 0.35 });
      const bl = r.walls.left[r.baseTo];
      const br = r.walls.right[r.baseTo];
      w.seg(bl[0], bl[1], br[0], br[1], { restitution: 0.35 });
      w.circle(r.entry[0][0], r.entry[0][1], 4, { restitution: 0.5 });
      w.circle(r.entry[1][0], r.entry[1][1], 4, { restitution: 0.5 });
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

    // Lower playfield: the proven flippers, slings and lanes (round 2 keeps them; see DESIGN.md)
    this.lower = buildLowerSection(w, L.CX, () => sound.sling());
    for (const gd of L.OUTLANE_GUARDS) {
      poly(w, gd, { restitution: 0.3 });
      w.circle(gd[1][0], gd[1][1], 4, { restitution: 0.5 });
    }
    this.flipperL = this.lower.left;
    this.flipperR = this.lower.right;

    // Switches
    const line = (pts: [P, P], fn: (b: Ball, dir: number) => void, layers = FLOOR) => w.lineSensors.push(new LineSensor(pts[0][0], pts[0][1], pts[1][0], pts[1][1], fn, layers));
    line(L.RR_SWITCH, (_b, dir) => dir > 0 && this.made('railroad'));
    line(L.SALOON_SWITCH, (_b, dir) => dir > 0 && this.made('saloon'));
    line(L.DOOR_L, () => (this.doorsSwing = 1));
    line(L.DOOR_R, () => (this.doorsSwing = 1));

    w.force = (b, dt) => this.rampForce(b, dt);
    this.shooter = { ...L.SHOOTER };

    this.flashers = [
      { x: 140, y: 100, r: 6, z: 50, z0: 36, color: '#ff3b2a', level: 0 }, // the mine house
      { x: 349, y: 96, r: 6, z: 58, z0: 40, color: '#ffd23f', level: 0 }, // High Noon's roof
      { x: 478, y: 70, r: 6, z: 46, color: '#ff3b2a', level: 0 }, // the saloon
      { x: 192, y: 650, r: 5, z: 34, z0: 26, color: '#ff3b2a', level: 0 }, // the jail
      { x: 490, y: 540, r: 6, z: 62, z0: 48, color: '#3fffe5', level: 0 }, // the stagecoach's shelf
    ];
    this.buildLamps();
  }

  // ---------------------------------------------------------------- inserts (no rules yet: they show what the table is doing)

  private buildLamps() {
    const lamp = (l: Lamp) => this.lamps.push(l);
    const dirAngle = (d: P) => Math.atan2(d[0], -d[1]);
    const unit = (v: P): P => {
      const l = Math.hypot(v[0], v[1]) || 1;
      return [v[0] / l, v[1] / l];
    };
    const flashing = (s: DustShot) => this.time - (this.madeAt[s] ?? -9) < 1.2;
    /** An arrow pointing at the shot, a jackpot light behind it and a Wanted light behind that, in the shot's colour. */
    const stack = (s: DustShot, mouth: P, from: P, color: string, label: string, gaps: number[], base: () => LampState) => {
      const d = unit([mouth[0] - from[0], mouth[1] - from[1]]);
      const at = (k: number): P => [mouth[0] - d[0] * gaps[k], mouth[1] - d[1] * gaps[k]];
      const [a, j, m] = [at(0), at(1), at(2)];
      lamp({ id: `arrow:${s}`, kind: 'arrow', x: a[0], y: a[1], w: 26, h: 34, angle: dirAngle(d), color, label, labelSize: 6.5, labelTurns: true, state: () => (flashing(s) ? 3 : base()) });
      lamp({ id: `jackpot:${s}`, kind: 'circle', x: j[0], y: j[1], w: 16, color: '#ff3b2a', label: 'JP', labelSize: 6.5, state: () => (flashing(s) ? 3 : 0) });
      if (gaps[2] !== undefined)
        lamp({ id: `wanted:${s}`, kind: 'star', x: m[0], y: m[1], w: 18, color: '#fff3d6', tint: () => POSTER_COLORS[this.featured()], state: () => (WANTED_SHOTS[this.featured()].includes(s) ? 2 : 0) });
    };
    const RF: P = [346, 1040];
    const LF: P = [240, 1061];
    stack('railroad', L.along(L.RR_MOUTH[0], L.RR_MOUTH[1], 0.5), RF, '#3fffe5', 'RAIL', [44, 70, 94], () => (this.drops.every((d) => d.down) ? 2 : 0));
    stack('mine', L.MINE.path[0], RF, '#ffc21a', 'MINE', [48, 74, 98], () => (this.panLit ? 2 : 1));
    stack('jail', L.along(L.JAIL_MOUTH[0], L.JAIL_MOUTH[1], 0.5), [L.JAIL_HOLE[0] + L.JAIL_AXIS[0] * 200, L.JAIL_HOLE[1] + L.JAIL_AXIS[1] * 200], '#ff8a1f', 'JAIL', [36, 60], () => 1);
    stack('noon', [277.5, 214], [277.5, 1000], '#fff3d6', 'NOON', [70, 96, 120], () => 1);
    stack('stage', L.STAGE.path[0], LF, '#c066ff', 'STAGE', [46, 72, 96], () => 1);
    stack('saloon', L.along(L.SALOON_MOUTH[0], L.SALOON_MOUTH[1], 0.5), LF, '#ff3b2a', 'SALOON', [44, 70, 94], () => 1);
    lamp({ id: 'target:hardware', kind: 'circle', x: 316, y: 350, w: 14, color: '#3fffe5', label: 'H', labelSize: 7, state: () => (this.targetFlash[4] > 0 ? 3 : 1) });
    lamp({ id: 'target:sheriff', kind: 'circle', x: 347, y: 416, w: 14, color: '#3fffe5', label: 'S', labelSize: 7, state: () => (this.targetFlash[5] > 0 ? 3 : 1) });
    // ore carts toward the Gold Pan, and the pan itself
    [0, 1, 2].forEach((i) =>
      lamp({ id: `ore:${i + 1}`, kind: 'circle', x: 190 - i * 9, y: 368 + i * 22, w: 13, color: '#ffc21a', label: String(i + 1), labelSize: 7, state: () => (this.oreCarts > i ? 1 : 0) }),
    );
    lamp({ id: 'pan', kind: 'rect', x: 205, y: 452, w: 30, h: 13, color: '#ffc21a', label: 'PAN', labelSize: 7.5, state: () => (this.panLit ? 3 : 0) });
    lamp({ id: 'train', kind: 'rect', x: 41, y: 520, w: 30, h: 13, angle: -Math.PI / 2, color: '#3fffe5', label: 'TRAIN', labelSize: 7, labelTurns: true, state: () => (this.drops.every((d) => d.down) ? 2 : 0) });
    // the reward ladder up Main Street: a sheriff's star for every three shots made this ball
    ['2X', '3X', '4X', '5X', '6X'].forEach((t, i) =>
      lamp({ id: `reward:${t}`, kind: 'star', x: 278.5, y: 564 - i * 40, w: 30, color: '#ffc21a', label: t, labelSize: 7, state: () => (this.madeThisBall >= (i + 1) * 3 ? 1 : this.madeThisBall >= i * 3 ? 2 : 0) }),
    );
    // the six Wanted posters: one at a time comes up wanted (a preview of the modes to come)
    POSTER_SPOTS.forEach(([x, y], i) =>
      lamp({ id: `poster:${i}`, kind: 'rect', x, y: y + 4, w: 26, h: 28, color: POSTER_COLORS[i], label: POSTER_NAMES[i], labelSize: 4.6, state: () => (this.featured() === i ? 2 : 0) }),
    );
    // lanes: inlane arrows, outlane SPECIAL lights, the skill shot and Shoot Again
    for (const m of [1, -1]) {
      lamp({ id: `inlane:${m}`, kind: 'arrow', x: L.CX - m * 183.5, y: 915, w: 16, h: 22, angle: Math.PI, color: '#3fffe5', state: () => 1 });
      lamp({ id: `outlane:${m}`, kind: 'rect', x: L.CX - m * 230, y: 935, w: 13, h: 34, color: '#ff3b2a', label: 'SPECIAL', labelSize: 5, state: () => 0 });
    }
    lamp({ id: 'skill', kind: 'arrow', x: L.SHOOTER.x, y: 1110, w: 22, h: 30, color: '#ffc21a', state: () => (this.world.balls.some((b) => this.inShooterLane(b)) ? 3 : 0) });
    lamp({ id: 'shoot-again', kind: 'shield', x: L.CX, y: 1148, w: 46, h: 30, color: '#ff3b2a', label: 'SHOOT AGAIN', labelSize: 5.5, state: () => (this.game.ballSave > 0 ? 2 : 0) });
  }

  /** The Wanted poster lit up (the modes come with the rule sheet; for now they take turns). */
  featured() {
    return Math.floor(this.time / 8) % 6;
  }

  /** Where the minecart is: under a riding ball, rolling back down, or waiting at the bottom. */
  cart() {
    const rest = { x: L.LIFT.from[0], y: L.LIFT.from[1], z: L.LIFT.z0, busy: false };
    const tr = this.trips.find((t) => t.kind === 'mine');
    if (!tr) return rest;
    if (tr.t < MINE_LIFT_S) return { x: tr.b.x, y: tr.b.y, z: tr.b.tags.tripZ ?? L.LIFT.z0, busy: true };
    const u = Math.min(1, (tr.t - MINE_LIFT_S) / 0.8);
    const p = L.along(L.LIFT.to, L.LIFT.from, u);
    return { x: p[0], y: p[1], z: L.LIFT.z1 + (L.LIFT.z0 - L.LIFT.z1) * u, busy: u < 1 };
  }

  /** At 6.5° a soft pull still drops back to the plunger; half pull and up reach the saloon. */
  override plungeSpeed(pull: number) {
    return 1150 + pull * 1250;
  }

  // ---------------------------------------------------------------- the display's shot names

  private made(s: DustShot) {
    this.counts[s] = (this.counts[s] ?? 0) + 1;
    this.madeAt[s] = this.time;
    this.madeThisBall++;
    const fl: Record<DustShot, number> = { mine: 0, pan: 0, noon: 1, quickdraw: 1, hardware: 1, sheriff: 1, saloon: 2, railroad: 2, jail: 3, stage: 4 };
    this.flash(fl[s], 1);
    if (s === 'stage') this.coachRock = 1;
    if (s === 'stage' || s === 'mine') sound.ramp();
    else if (s === 'railroad' || s === 'saloon') sound.orbit();
    else if (s === 'jail') sound.scoop();
    this.last = { name: SHOT_NAME[s], t: this.time };
  }

  private hitWindow(i: number) {
    this.targetFlash[i] = 1;
    sound.target();
    this.made('noon');
  }

  private hitTarget(i: number, s: DustShot) {
    this.targetFlash[i] = 1;
    sound.target();
    this.made(s);
  }

  private hitDrop(i: number, speed: number) {
    const d = this.drops[i];
    if (d.down || speed < 60) return;
    d.down = true;
    d.seg.enabled = false;
    sound.drop();
    if (this.drops.every((x) => x.down)) this.last = { name: 'RAILROAD OPEN', t: this.time };
  }

  /** Stand the drops back up once the lane has been run and no ball is in their way. */
  private resetDropsWhenClear() {
    if (!this.drops.every((d) => d.down) || !(this.counts.railroad ?? 0)) return;
    const [a, b] = L.RR_MOUTH;
    const mid = L.along(a, b, 0.5);
    if (this.world.balls.some((x) => Math.hypot(x.x - mid[0], x.y - mid[1]) < 70)) return;
    this.counts.railroad = 0;
    for (const d of this.drops) {
      d.down = false;
      d.seg.enabled = true;
      d.anim = 1;
    }
  }

  // ---------------------------------------------------------------- the toys' mechanisms

  private carry(b: Ball, kind: Trip['kind'], extra: Partial<Trip> = {}) {
    b.captured = true;
    b.vx = 0;
    b.vy = 0;
    this.trips.push({ b, kind, t: 0, ...extra });
  }

  private release(b: Ball, at: P, v: P) {
    b.captured = false;
    b.layer = FLOOR;
    b.tags.ramp = 0;
    b.tags.tripZ = 0;
    b.x = b.px = at[0];
    b.y = b.py = at[1];
    b.vx = v[0];
    b.vy = v[1];
    b.stillTime = 0;
  }

  private intoMine(b: Ball) {
    this.made('mine');
    this.oreCarts++;
    b.layer = RAMP2;
    b.tags.ramp = 0;
    this.carry(b, 'mine');
    sound.eject();
  }

  private intoPan(b: Ball) {
    this.made('pan');
    this.oreCarts = 0;
    const z0 = this.ballZ(b);
    b.tags.ramp = 0;
    this.carry(b, 'pan', { from: [b.x, b.y], z0 });
  }

  private intoCup(b: Ball, i: number) {
    if (b.captured) return;
    this.cupFlash[i] = 1;
    b.x = L.PAN_CUPS[i][0];
    b.y = L.PAN_CUPS[i][1];
    this.carry(b, 'cup', { cup: i });
    this.last = { name: ['RICHES', 'NUGGETS', 'EXTRA BALL'][i], t: this.time };
  }

  private intoJail(b: Ball) {
    if (b.captured || (this.jailIgnore.get(b.id) ?? 0) > this.time) return;
    this.made('jail');
    b.x = L.JAIL_HOLE[0];
    b.y = L.JAIL_HOLE[1];
    this.carry(b, 'jail');
  }

  private updateTrips(dt: number) {
    for (const tr of this.trips) {
      tr.t += dt;
      const b = tr.b;
      if (tr.kind === 'mine') {
        if (tr.t < MINE_LIFT_S) {
          // the minecart: into the mouth, then up the shaft
          const u = tr.t / MINE_LIFT_S;
          const p = L.along(L.LIFT.from, L.LIFT.to, u);
          b.x = p[0];
          b.y = p[1];
          b.tags.tripZ = L.LIFT.z0 + (L.LIFT.z1 - L.LIFT.z0) * u;
        } else {
          // along the wire to the saloon
          const s = (tr.t - MINE_LIFT_S) * WIRE_SPEED;
          const total = L.pathLength(L.WIRE);
          if (s >= total) {
            this.release(b, L.WIRE_DROP.at, L.WIRE_DROP.v);
            tr.t = -1;
            continue;
          }
          const i = L.indexAt(L.WIRE, s);
          b.x = L.WIRE[i][0];
          b.y = L.WIRE[i][1];
          b.tags.tripZ = L.WIRE_Z.from + (L.WIRE_Z.to - L.WIRE_Z.from) * (s / total);
        }
      } else if (tr.kind === 'pan') {
        const u = Math.min(1, tr.t / PAN_DROP_S);
        const into: P = [L.PAN_DROP[0] - 6 + (b.id % 5) * 3, L.PAN_DROP[1]];
        const p = L.along(tr.from!, into, u);
        b.x = p[0];
        b.y = p[1];
        b.tags.tripZ = (tr.z0 ?? 0) * (1 - u) + 30 * Math.sin(u * Math.PI);
        if (u >= 1) {
          // a little sideways drift, so a ball never balances on the top pin's crown
          this.release(b, into, [(Math.random() - 0.5) * 40, 40]);
          tr.t = -1;
        }
      } else if (tr.kind === 'cup' && tr.t >= CUP_HOLD_S) {
        this.release(b, L.PAN_EXIT.at, L.PAN_EXIT.v);
        sound.eject();
        tr.t = -1;
      } else if (tr.kind === 'jail' && tr.t >= JAIL_HOLD_S) {
        const a = Math.atan2(L.JAIL_AXIS[1], L.JAIL_AXIS[0]) + (Math.random() - 0.5) * 0.08;
        this.jailIgnore.set(b.id, this.time + 0.6);
        this.release(b, L.JAIL_HOLE, [Math.cos(a) * JAIL_EJECT, Math.sin(a) * JAIL_EJECT]);
        sound.eject();
        this.game.doShake(3);
        tr.t = -1;
      }
    }
    this.trips = this.trips.filter((t) => t.t >= 0 && this.world.balls.includes(t.b));
  }

  // ---------------------------------------------------------------- physics hooks

  /** Ramp gravity: the climb slows a ball down, the descent speeds it up. */
  private rampForce(b: Ball, dt: number) {
    const idx = (b.tags.ramp ?? 0) - 1;
    if (b.layer === FLOOR || idx < 0 || b.captured) return;
    const r = L.RAMPS[idx];
    const path = r.path;
    let i = b.tags.ri ?? 0;
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
    b.vx -= (tx / len) * slope * RAMP_G * dt;
    b.vy -= (ty / len) * slope * RAMP_G * dt;
    if (r === L.MINE) {
      if (this.panLit && i >= L.MINE_DIVERT_AT) this.intoPan(b);
      else if (i >= path.length - 2) this.intoMine(b);
      return;
    }
    if (!b.tags.made && i >= r.madeAt) {
      b.tags.made = 1;
      this.made('stage');
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
    }
  }

  override ballZ(b: Ball) {
    if (b.captured) return b.tags.tripZ ?? 0;
    const idx = (b.tags.ramp ?? 0) - 1;
    if (idx < 0) return 0;
    return L.RAMPS[idx].z[b.tags.ri ?? 0] ?? 0;
  }

  override update(dt: number) {
    super.update(dt);
    this.updateTrips(dt);
    this.resetDropsWhenClear();
    this.doorsSwing = Math.max(0, this.doorsSwing - dt * 1.6);
    this.coachRock = Math.max(0, this.coachRock - dt * 0.8);
    for (let i = 0; i < this.bumperFlash.length; i++) this.bumperFlash[i] = Math.max(0, this.bumperFlash[i] - dt * 4);
    for (let i = 0; i < this.targetFlash.length; i++) this.targetFlash[i] = Math.max(0, this.targetFlash[i] - dt * 2);
    for (let i = 0; i < 3; i++) this.cupFlash[i] = Math.max(0, this.cupFlash[i] - dt * 1.2);
    for (const d of this.drops) d.anim = Math.max(0, d.anim - dt * 3);
    // The outlaw walks window to window: a pause in each, then a short walk.
    this.outlawT += dt;
    if (this.outlawWalk > 0) {
      this.outlawWalk = Math.min(1, this.outlawWalk + dt * 1.5);
      if (this.outlawWalk >= 1) {
        this.outlaw += this.outlawDir;
        this.outlawWalk = 0;
        this.outlawT = 0;
        if (this.outlaw === 0 || this.outlaw === 2) this.outlawDir = -this.outlawDir;
      }
    } else if (this.outlawT > 2.4) this.outlawWalk = 0.001;
  }

  // ---------------------------------------------------------------- game flow (no rules yet)

  get releasing() {
    return 0;
  }
  resetForGame() {
    this.oreCarts = 0;
    this.counts = {};
    this.last = null;
    for (const d of this.drops) {
      d.down = false;
      d.seg.enabled = true;
    }
  }
  resetForBall() {
    this.madeThisBall = 0;
    this.trips = [];
  }
  armSkillShot() {}
  onPlunge() {}
  onFlipperPress(_side: -1 | 1) {}
  ballLost() {}
  ballHeld() {
    return this.trips.length > 0;
  }
  endModes(_quiet = false) {}
  endMultiball() {}
  music() {}

  drawDMD(d: DMD) {
    const g = this.game;
    const last = this.last && this.time - this.last.t < 2.5 ? this.last.name : null;
    if (last) {
      d.fitText(last, 64, 6, 124, 2, { align: 'center' });
      d.text('LAYOUT PREVIEW', 64, 24, { align: 'center', level: 1 });
      return;
    }
    d.text(`BALL ${g.ball}`, 2, 1, { level: 2 });
    d.text(this.panLit ? 'PAN LIT' : `ORE ${this.oreCarts}/3`, 126, 1, { align: 'right', level: 2 });
    d.fitText('DUST & LEAD', 64, 11, 124, 2, { align: 'center' });
  }

  // ---------------------------------------------------------------- drawing (dust-art.ts)

  protected override drawStatic(ctx: CanvasRenderingContext2D) {
    if (this.floorArt) ctx.drawImage(this.floorArt, 0, 0, 600, 1200);
    paintFloor(ctx, () => this.drawInserts(ctx), !this.floorArt);
  }
  protected override drawRamps(ctx: CanvasRenderingContext2D) {
    paintRamps(ctx, () => this.drawFlasherDomes(ctx));
    return true;
  }
  protected override drawDynamic(ctx: CanvasRenderingContext2D) {
    paintDynamic(ctx, this);
  }
  protected override sprites(out: Sprite[]) {
    spriteList(this, out);
  }
  protected override drawTop(ctx: CanvasRenderingContext2D) {
    paintTop(ctx, this);
  }
}
