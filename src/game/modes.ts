// Mode rules, in the style of a 90s rulesheet. A mode changes what the table
// wants from you: it lights specific shots, runs a clock, and pays its own scaled
// values. The table feeds it shots and switches and asks it which inserts to light.
//
// Cyber Psychosis runs a heist: INFILTRATE, then HACK or ROUTE, then PAYLOAD or
// EXTRACT, which lights BLACKOUT at the Reactor.

import type { Ball } from '../engine/physics';
import { sound } from '../engine/audio';
import type { LampState } from './tables/draw';
import type { Psychosis } from './tables/psychosis';
import { fmt, short } from './format';

export type Shot = 'alley' | 'market' | 'breach' | 'skyway' | 'reactor';
/** The major shots: the two upper flipper shots, then the lower flippers' left to right. */
export const SHOTS: Shot[] = ['alley', 'market', 'breach', 'skyway', 'reactor'];
export const SHOT_NAME: Record<Shot, string> = {
  alley: 'BACK ALLEY',
  market: 'BLACK MARKET',
  breach: 'BREACH',
  skyway: 'SKYWAY',
  reactor: 'REACTOR',
};

/** Minor switches: everything that isn't a shot. */
export type Switch = 'bumper' | 'sling' | 'rollover' | 'spinner' | 'drop' | 'standup';

// Clock conventions borrowed from real machines (see README, "How the clocks work"):
// displayed seconds run a little slow, shots still count for a moment after zero,
// and making progress tops the clock back up.

/** One displayed second lasts this many real seconds (FreeWPC uses ~1.08). */
const PINBALL_SECOND = 1.1;
/** Real seconds after the clock shows 0 during which shots still count. */
export const GRACE = 2;
/** Making progress with less than this on the clock tops it back up to this. */
const REFRESH = 10;
/** Completion bonus per second left on the clock. */
const TIME_BONUS = 100_000;
/** Jobs pay full value for their first PACE_HOLD seconds in play, then drain to PACE_FLOOR over PACE_DRAIN more. */
const PACE_HOLD = 30;
const PACE_DRAIN = 120;
const PACE_FLOOR = 0.5;
/** A lit super jackpot stays lit this long (clock seconds); missed, it needs two more jackpots to relight. */
export const SUPER_TIME = 20;

export abstract class Mode {
  abstract readonly name: string;
  abstract readonly color: string;
  /** Second line of the DMD intro. */
  abstract readonly brief: string;
  /** Seconds on the clock; Infinity for an untimed mode (ends on completion or drain). */
  time = 30;
  timer = 0;
  /** Full scale of the current clock, for the lamp ring. */
  clockMax = 0;
  private grace = GRACE;
  total = 0;
  completed = false;
  /** Multiball modes have no clock and end when the multiball does. */
  multiball = false;
  /** Set when the mode should end, by success or by failure. */
  finished = false;
  /** Seconds this has been in play (the table's clock rules decide when that counts), across balls. */
  elapsed = 0;
  /** A job whose shot values drain the longer it takes: speed pays, but nothing fails. */
  paced = false;

  constructor(
    protected f: Psychosis,
    protected mult: number,
  ) {}

  get timed() {
    return Number.isFinite(this.time);
  }

  /** The clock shows 0 but lit shots still count. */
  get inGrace() {
    return this.timed && this.timer <= 0 && !this.finished;
  }

  start() {
    this.setClock(this.time);
  }

  protected setClock(seconds: number) {
    this.timer = this.clockMax = seconds;
    this.grace = GRACE;
  }

  /**
   * Advance the clock by `dt` real seconds. The table only calls this while the
   * clock should run: a ball is on the playfield, not held, not stuck.
   */
  tick(dt: number) {
    this.elapsed += dt;
    if (!this.timed) return;
    if (this.timer > 0) {
      const before = Math.ceil(this.timer);
      this.timer = Math.max(0, this.timer - dt / PINBALL_SECOND);
      const now = Math.ceil(this.timer);
      if (now !== before) this.onSecond(now);
    } else {
      this.grace -= dt;
      if (this.grace <= 0) this.finished = true;
    }
  }

  private onSecond(s: number) {
    if (s === 10) {
      sound.hurry();
      this.f.game.show('HURRY UP', `${this.name}  10 SECONDS`, 0.9);
    } else if (s > 0 && s <= 5) {
      sound.tick();
    } else if (s === 0) {
      this.f.music(); // mode music cuts out for the grace period
    }
  }

  /** Progress keeps a timed mode alive: top the clock up and rescue it from grace. */
  protected progress() {
    if (!this.timed) return;
    const wasGrace = this.inGrace;
    if (this.timer < REFRESH) this.timer = REFRESH;
    this.clockMax = Math.max(this.clockMax, this.timer);
    this.grace = GRACE;
    if (wasGrace) this.f.music();
  }

  addTime(seconds: number) {
    if (!this.timed) return;
    const wasGrace = this.inGrace;
    this.timer += seconds;
    this.clockMax = Math.max(this.clockMax, this.timer);
    this.grace = GRACE;
    if (wasGrace) this.f.music();
  }

  /** 1 for a fresh job, falling to PACE_FLOOR the longer it takes (1 for anything not paced). */
  get pace() {
    if (!this.paced) return 1;
    return Math.max(PACE_FLOOR, 1 - (Math.max(0, this.elapsed - PACE_HOLD) / PACE_DRAIN) * (1 - PACE_FLOOR));
  }

  /**
   * The ball was lost mid-job. The job carries on with the next ball, but the step in progress
   * starts over; returns what restarted, for the display ('' if nothing did).
   */
  onBallLost(): string {
    return '';
  }

  /** 0..1 for the lamp ring: time left, or whatever an untimed mode is racing against. */
  meter() {
    return this.timed ? Math.max(0, this.timer) / this.clockMax : 1;
  }

  onShot(_s: Shot, _b?: Ball) {}
  onSwitch(_s: Switch) {}
  /** A Breach standup, 0-5 (B R E A C H). */
  onStandup(_i: number) {}
  lit(_s: Shot): LampState {
    return 0;
  }
  /** Colour a lit shot's arrow takes; defaults to the mode's colour. */
  tint(_s: Shot) {
    return this.color;
  }
  litStandup(_i: number): LampState {
    return 0;
  }
  /** Multiball modes keep the Reactor's drop targets down while they want the captive ball. */
  wantsDropsDown() {
    return false;
  }
  /** Bottom DMD line while running. */
  abstract status(): string;
  /** General illumination this mode wants. */
  gi() {
    return 1;
  }

  protected v(n: number) {
    return Math.round((n * this.mult) / 1000) * 1000;
  }

  /** A job's value: scaled like `v`, and by its pace. */
  protected pv(n: number) {
    return this.v(n * this.pace);
  }

  protected award(n: number, s?: Shot, big?: string) {
    const g = this.f.game;
    const p = s ? this.f.shotPos(s) : undefined;
    this.total += n;
    g.addScore(n, p?.[0], p?.[1]);
    if (big) g.show(big, fmt(n), 1.6, true);
  }

  protected complete(bonus: number, title: string) {
    const secs = this.timed ? Math.ceil(Math.max(0, this.timer)) : 0;
    const tb = this.v(TIME_BONUS * secs);
    this.award(bonus + tb);
    this.completed = true;
    this.finished = true;
    this.f.game.show(title, tb ? `+${short(bonus)}  TIME +${short(tb)}` : `+${fmt(bonus)}`, 2.4, true);
    this.f.celebrate(this.color);
    sound.jackpot();
  }
}

// ---------------------------------------------------------------- the heist

/** Stealth: the cameras sweep the shots. Make the ones they aren't watching, then breach. */
class Infiltrate extends Mode {
  name = 'INFILTRATE';
  color = '#7fd8ff';
  brief = 'AVOID THE CAMERAS';
  // No clock: a job lasts until you finish it (or drain), and only a finished job opens the next.
  time = Infinity;
  paced = true;
  private sneak = new Set<Shot>(['alley', 'market', 'skyway', 'reactor']);
  /** The shot the cameras are watching right now. */
  watched: Shot | null = null;
  private sweepT = 0;
  private spotted = 0;

  override start() {
    super.start();
    this.sweep();
  }

  private sweep() {
    const left = [...this.sneak].filter((s) => s !== this.watched);
    this.watched = this.sneak.size > 1 && left.length ? left[Math.floor(Math.random() * left.length)] : null;
    this.sweepT = 3.5;
  }

  override tick(dt: number) {
    super.tick(dt);
    this.sweepT -= dt;
    if (this.sweepT <= 0) this.sweep();
  }

  override lit(s: Shot): LampState {
    if (this.sneak.has(s)) return s === this.watched ? 4 : 2;
    return s === 'breach' && this.sneak.size === 0 ? 3 : 0;
  }

  override tint(s: Shot) {
    return s === this.watched ? '#ff2020' : this.color;
  }

  override onShot(s: Shot) {
    const g = this.f.game;
    if (s === 'breach' && this.sneak.size === 0) {
      this.f.hitFx(s, this.color);
      return this.complete(this.pv(3_000_000), 'YOU ARE INSIDE');
    }
    if (!this.sneak.has(s)) return;
    if (s === this.watched) {
      this.spotted++;
      g.show('SPOTTED!', 'SHOTS PAY 100K LESS', 1.4, true);
      g.doFlash('#ff2020', 0.4);
      sound.alarm();
      this.sweep();
      return;
    }
    const v = this.pv(Math.max(200_000, 500_000 + (4 - this.sneak.size) * 150_000 - this.spotted * 100_000));
    this.award(v, s);
    this.f.hitFx(s, this.color);
    this.sneak.delete(s);
    this.progress();
    if (this.sneak.size === 0) {
      this.watched = null;
      g.show('NO ONE SAW YOU', 'SHOOT THE BREACH', 2, true);
      sound.siren();
    } else {
      g.show('SNUCK PAST', `${this.sneak.size} TO GO  ${short(v)}`, 1.2);
      // the camera gives up on the last one
      if (this.watched === null || this.sneak.size === 1) this.sweep();
    }
  }

  status() {
    return this.sneak.size ? `SNEAK PAST ${this.sneak.size} MORE` : 'SHOOT THE BREACH';
  }
}

/** The six Breach standups become a keypad: hit the flashing one, four to a code. */
class Hack extends Mode {
  name = 'HACK';
  color = '#3dff8a';
  brief = 'HIT THE FLASHING KEYS';
  time = Infinity;
  paced = true;
  private code: number[] = [];
  private pos = 0;
  private cracked = 0;

  override start() {
    super.start();
    this.newCode();
  }

  private newCode() {
    this.code = [];
    for (let i = 0; i < 4; i++) {
      let k = Math.floor(Math.random() * 6);
      while (k === this.code[i - 1]) k = Math.floor(Math.random() * 6);
      this.code.push(k);
    }
    this.pos = 0;
  }

  override litStandup(i: number): LampState {
    return i === this.code[this.pos] ? 3 : 0;
  }

  override lit(s: Shot): LampState {
    return s === 'breach' ? 2 : 0;
  }

  override onStandup(i: number) {
    if (i !== this.code[this.pos]) return;
    this.pos++;
    this.award(this.pv(250_000), 'breach');
    sound.tick();
    if (this.pos >= this.code.length) this.crack();
  }

  override onShot(s: Shot) {
    // Brute force: the Breach itself cracks the whole code.
    if (s === 'breach') this.crack();
  }

  private crack() {
    this.cracked++;
    const v = this.pv(1_500_000 * this.cracked);
    this.award(v, 'breach');
    this.f.hitFx('breach', this.color);
    this.progress();
    if (this.cracked >= 3) return this.complete(this.pv(3_000_000), 'SYSTEM HACKED');
    this.f.game.show(`CODE ${this.cracked} CRACKED`, short(v), 1.4, true);
    sound.award();
    this.newCode();
  }

  override onBallLost() {
    if (this.pos === 0) return '';
    this.pos = 0;
    return 'THIS CODE STARTS OVER';
  }

  status() {
    return `CODE ${this.cracked + 1} OF 3  KEY ${this.pos + 1}/4`;
  }
}

/** Plot the escape: four shots in order, twice, through both upper flippers. */
class Route extends Mode {
  name = 'ROUTE';
  color = '#ffd23f';
  brief = 'SHOTS IN ORDER, TWICE';
  time = Infinity;
  paced = true;
  private seq: Shot[] = ['skyway', 'alley', 'market', 'reactor'];
  private step = 0;
  private laps = 0;

  override lit(s: Shot): LampState {
    return s === this.seq[this.step] ? 3 : 0;
  }

  override onShot(s: Shot) {
    if (s !== this.seq[this.step]) return;
    this.award(this.pv(600_000 * (this.step + 1) + this.laps * 500_000), s);
    this.f.hitFx(s, this.color);
    this.step++;
    this.progress();
    if (this.step < this.seq.length) return;
    this.step = 0;
    this.laps++;
    if (this.laps >= 2) return this.complete(this.pv(3_000_000), 'ESCAPE ROUTE SET');
    this.award(this.pv(2_500_000));
    this.f.game.show('ROUTE PLOTTED', 'ONE MORE LAP', 1.6, true);
    sound.award();
  }

  override onBallLost() {
    if (this.step === 0) return '';
    this.step = 0;
    return 'THIS LAP STARTS OVER';
  }

  status() {
    return `NEXT ${SHOT_NAME[this.seq[this.step]]}`;
  }
}

/** Multiball: bust the payload out. Ramps are jackpots; the Reactor is the super. */
class Payload extends Mode {
  name = 'PAYLOAD';
  color = '#ff8a1f';
  brief = 'RAMPS FOR JACKPOTS';
  time = Infinity;
  multiball = true;
  private jp = 1_500_000;
  private count = 0;
  private superLit = false;
  private superT = 0;

  override tick(dt: number) {
    super.tick(dt);
    if (!this.superLit) return;
    this.superT -= dt;
    if (this.superT > 0) return;
    // Missed: two more ramp jackpots relight it.
    this.superLit = false;
    this.count = 1;
    this.f.game.show('SUPER JACKPOT LOST', '2 JACKPOTS RELIGHT IT', 1.8, true);
    sound.warn();
  }

  override lit(s: Shot): LampState {
    if (s === 'skyway' || s === 'market') return 3;
    return s === 'reactor' && this.superLit ? 4 : 0;
  }

  override wantsDropsDown() {
    return this.superLit;
  }

  override onShot(s: Shot) {
    const g = this.f.game;
    if ((s === 'skyway' || s === 'market') && !this.superLit) {
      this.award(this.v(this.jp), s, 'JACKPOT');
      this.f.hitFx(s, this.color);
      sound.jackpot();
      this.jp += 250_000;
      if (++this.count >= 3) {
        this.superLit = true;
        this.superT = SUPER_TIME;
        g.show('SUPER JACKPOT', 'IS LIT AT THE REACTOR', 2, true);
      }
    } else if (s === 'reactor' && this.superLit) {
      this.award(this.v(this.jp * 3), s, 'SUPER JACKPOT');
      this.f.celebrate(this.color);
      sound.jackpot();
      this.completed = true;
      this.superLit = false;
      this.count = 0;
    }
  }

  status() {
    return this.superLit ? `SUPER ${Math.ceil(this.superT)}  REACTOR` : `JACKPOT ${short(this.v(this.jp))}`;
  }
}

/** Hurry-up getaway: three legs in order, each worth a value that bleeds away. */
class Extract extends Mode {
  name = 'EXTRACT';
  color = '#f4efe6';
  brief = 'SKYWAY  MARKET  BREACH';
  time = Infinity;
  private legs: Shot[] = ['skyway', 'market', 'breach'];
  private leg = 0;
  private legT = 0;

  get value() {
    return this.v(Math.max(1_500_000, 6_000_000 + this.leg * 1_000_000 - this.legT * 200_000));
  }

  override tick(dt: number) {
    super.tick(dt);
    if (this.timer > 0) this.legT += dt;
  }

  override lit(s: Shot): LampState {
    return s === this.legs[this.leg] ? 3 : 0;
  }

  override onBallLost() {
    if (this.legT === 0) return '';
    this.legT = 0;
    return 'THIS LEG STARTS OVER';
  }

  override onShot(s: Shot) {
    if (s !== this.legs[this.leg]) return;
    this.award(this.value, s);
    this.f.hitFx(s, this.color);
    this.leg++;
    this.legT = 0;
    this.progress();
    if (this.leg >= this.legs.length) return this.complete(this.v(4_000_000), 'EXTRACTED');
    this.f.game.show('KEEP MOVING', `${SHOT_NAME[this.legs[this.leg]]}  ${short(this.value)}`, 1.4, true);
    sound.siren();
  }

  status() {
    return `${SHOT_NAME[this.legs[this.leg]]} ${short(this.value)}`;
  }
}

export interface ModeDef {
  key: 'infiltrate' | 'hack' | 'route' | 'payload' | 'extract';
  name: string;
  /** 0: first, 1: needs a tier-0 mode played, 2: needs a tier-1 mode played. */
  tier: 0 | 1 | 2;
  color: string;
  make: (f: Psychosis, mult: number) => Mode;
}

export const MODES: ModeDef[] = [
  { key: 'infiltrate', name: 'INFILTRATE', tier: 0, color: '#7fd8ff', make: (f, m) => new Infiltrate(f, m) },
  { key: 'hack', name: 'HACK', tier: 1, color: '#3dff8a', make: (f, m) => new Hack(f, m) },
  { key: 'route', name: 'ROUTE', tier: 1, color: '#ffd23f', make: (f, m) => new Route(f, m) },
  { key: 'payload', name: 'PAYLOAD', tier: 2, color: '#ff8a1f', make: (f, m) => new Payload(f, m) },
  { key: 'extract', name: 'EXTRACT', tier: 2, color: '#f4efe6', make: (f, m) => new Extract(f, m) },
];

// ---------------------------------------------------------------- side modes

/** Lane-started frenzy: every switch on the table pays. Runs alongside a mode. */
export class Rage extends Mode {
  name = 'RAGE';
  color = '#ff4a1f';
  brief = 'EVERY SWITCH SCORES';
  time = 20;

  override onSwitch(s: Switch) {
    // Not the spinner: one Skyway shot spins it 8-15 times, which would pay over 1M.
    if (s === 'spinner') return;
    this.award(this.v(s === 'bumper' ? 150_000 : 100_000));
  }

  override onShot(s: Shot) {
    this.award(this.v(250_000), s);
  }

  status() {
    return `RAGE ${Math.ceil(this.timer)}  ${short(this.total)}`;
  }
}

/**
 * The finale: overload the Reactor. GI dies, it's a multiball, and every major
 * shot is a jackpot. Collect them all to light the super at the Reactor.
 */
export class Blackout extends Mode {
  name = 'BLACKOUT';
  color = '#ff2020';
  brief = 'EVERY SHOT A JACKPOT';
  /** No clock: it lasts as long as the multiball does. */
  time = Infinity;
  multiball = true;
  private left = new Set<Shot>(SHOTS.filter((s) => s !== 'reactor'));
  private jp = 2_000_000;

  override gi() {
    return 0.06;
  }

  override lit(s: Shot): LampState {
    if (s === 'reactor') return this.left.size === 0 ? 4 : 0;
    return this.left.has(s) ? 3 : 0;
  }

  override wantsDropsDown() {
    return this.left.size === 0;
  }

  override onShot(s: Shot) {
    const g = this.f.game;
    if (s === 'reactor' && this.left.size === 0) {
      this.award(this.v(this.jp * 5), s, 'SUPER JACKPOT');
      this.f.celebrate(this.color);
      g.doShake(14);
      sound.jackpot();
      this.completed = true;
      this.left = new Set(SHOTS.filter((x) => x !== 'reactor'));
      return;
    }
    if (!this.left.has(s)) return;
    this.left.delete(s);
    this.award(this.v(this.jp), s, 'JACKPOT');
    this.f.hitFx(s, this.color);
    sound.jackpot();
    this.jp += 500_000;
    if (this.left.size === 0) g.show('SUPER JACKPOT', 'OVERLOAD THE REACTOR', 2, true);
  }

  status() {
    return this.left.size === 0 ? `SUPER ${short(this.v(this.jp * 5))}` : `JACKPOT ${short(this.v(this.jp))}`;
  }
}
