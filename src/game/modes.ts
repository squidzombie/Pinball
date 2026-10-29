// Mode ("job") rules, in the style of a 90s rulesheet. A mode changes what the
// table wants from you: it lights specific shots, runs a clock, and pays its own
// scaled values. The Foundry table feeds it shots and switches and asks it which
// inserts to light.

import type { Ball } from '../engine/physics';
import { sound } from '../engine/audio';
import type { LampState } from './tables/draw';
import type { Foundry } from './tables/foundry';
import { fmt, short } from './format';

export type Shot = 'leftOrbit' | 'ramp' | 'hit' | 'reactor' | 'scoop' | 'drops' | 'rightOrbit';
/** Left-to-right order of the shots a mode can light (the scoop starts modes, so it stays free). */
export const FIELD_SHOTS: Shot[] = ['leftOrbit', 'ramp', 'hit', 'reactor', 'drops', 'rightOrbit'];

/** Minor switches: everything that isn't a shot. */
export type Switch = 'bumper' | 'sling' | 'lane' | 'rollover' | 'spinner';

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
  /** Set when the mode should end, by success or by failure. */
  finished = false;

  constructor(
    protected f: Foundry,
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
   * Advance the clock by `dt` real seconds. The Foundry only calls this while the
   * clock should run: a ball is on the playfield, not held, not stuck.
   */
  tick(dt: number) {
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

  /** 0..1 for the lamp ring: time left, or whatever an untimed mode is racing against. */
  meter() {
    return this.timed ? Math.max(0, this.timer) / this.clockMax : 1;
  }

  onShot(_s: Shot, _b?: Ball) {}
  onSwitch(_s: Switch) {}
  lit(_s: Shot): LampState {
    return 0;
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

// ---------------------------------------------------------------- the jobs

/** Moving target: one lit shot that won't sit still. */
class Shakedown extends Mode {
  name = 'SHAKEDOWN';
  color = '#3ddc84';
  brief = 'HIT THE MOVING SHOT';
  time = 40;
  private at = 0;
  private dir = 1;
  private moveT = 4;
  private paid = 0;

  get value() {
    return this.v(600_000 + this.paid * 300_000);
  }

  override start() {
    super.start();
    this.at = Math.floor(Math.random() * FIELD_SHOTS.length);
  }

  override tick(dt: number) {
    super.tick(dt);
    this.moveT -= dt;
    if (this.moveT <= 0) this.move();
  }

  private move() {
    this.moveT = 4;
    if (this.at + this.dir < 0 || this.at + this.dir >= FIELD_SHOTS.length) this.dir *= -1;
    this.at += this.dir;
  }

  override lit(s: Shot): LampState {
    return s === FIELD_SHOTS[this.at] ? 3 : 0;
  }

  override onShot(s: Shot) {
    if (s !== FIELD_SHOTS[this.at]) return;
    this.award(this.value, s, `PAID ${this.paid + 1} OF 5`);
    this.f.hitFx(s, this.color);
    this.paid++;
    this.progress();
    if (this.paid >= 5) return this.complete(this.v(2_500_000), 'PAID IN FULL');
    // Jump somewhere else so it can't be farmed.
    let next = this.at;
    while (next === this.at) next = Math.floor(Math.random() * FIELD_SHOTS.length);
    this.at = next;
    this.moveT = 4;
  }

  status() {
    return `HIT LIT SHOT ${short(this.value)}`;
  }
}

/** Hurry-up: the value cools while you aim, then pour it at the scoop for double. */
class HotMetal extends Mode {
  name = 'HOT METAL';
  color = '#ff7a1a';
  brief = 'RAMP OR RIGHT ORBIT';
  time = 25;
  private phase: 'heat' | 'pour' = 'heat';
  private elapsed = 0;
  private collected = 0;

  get value() {
    return this.v(Math.max(1_000_000, 5_000_000 - this.elapsed * 200_000));
  }

  override tick(dt: number) {
    super.tick(dt);
    if (this.phase === 'heat' && this.timer > 0) this.elapsed += dt;
  }

  override lit(s: Shot): LampState {
    if (this.phase === 'heat') return s === 'ramp' || s === 'rightOrbit' ? 3 : 0;
    return s === 'scoop' ? 3 : 0;
  }

  override onShot(s: Shot) {
    if (this.phase === 'heat' && (s === 'ramp' || s === 'rightOrbit')) {
      this.collected = this.value;
      this.award(this.collected, s);
      this.f.hitFx(s, this.color);
      this.phase = 'pour';
      this.setClock(15);
      this.f.game.show('POUR IT', `SCOOP FOR ${short(this.collected * 2)}`, 2, true);
      sound.siren();
    } else if (this.phase === 'pour' && s === 'scoop') {
      this.f.hitFx(s, this.color);
      this.complete(this.collected * 2, 'POURED');
    }
  }

  status() {
    return this.phase === 'heat' ? `HURRY-UP ${short(this.value)}` : `SCOOP ${short(this.collected * 2)}`;
  }
}

/**
 * Collect every lit shot. No clock: the pressure is the payout bleeding away
 * while you aim. Each shot you take raises what the rest are worth.
 */
class BloodMoney extends Mode {
  name = 'BLOOD MONEY';
  color = '#e0262b';
  brief = 'COLLECT EVERY LIT SHOT';
  time = Infinity;
  private left = new Set<Shot>(FIELD_SHOTS);
  private bled = 0;
  private static START = 1_500_000;
  private static STEP = 250_000;
  private static FLOOR = 500_000;
  /** Value lost per second of play. */
  private static BLEED = 25_000;

  private get base() {
    return BloodMoney.START + (FIELD_SHOTS.length - this.left.size) * BloodMoney.STEP;
  }

  get value() {
    return this.v(Math.max(BloodMoney.FLOOR, this.base - this.bled));
  }

  override tick(dt: number) {
    this.bled += BloodMoney.BLEED * dt;
  }

  override meter() {
    return Math.max(0, (this.base - this.bled - BloodMoney.FLOOR) / (this.base - BloodMoney.FLOOR));
  }

  override lit(s: Shot): LampState {
    return this.left.has(s) ? 2 : 0;
  }

  override onShot(s: Shot) {
    if (!this.left.has(s)) return;
    this.award(this.value, s);
    this.f.hitFx(s, this.color);
    this.left.delete(s);
    sound.award();
    if (this.left.size === 0) this.complete(this.v(5_000_000), 'CLEAN SWEEP');
    else this.f.game.show('BLOOD MONEY', `${this.left.size} TO GO  NEXT ${short(this.value)}`, 1.3);
  }

  status() {
    return `${this.left.size} LEFT  ${short(this.value)}`;
  }
}

/** Lights out. Chain the lit shots in the dark for a growing multiplier. */
class Blackout extends Mode {
  name = 'BLACKOUT';
  color = '#9ec5ff';
  brief = 'CHAIN SHOTS IN THE DARK';
  time = 35;
  private streak = 0;
  private streakT = 0;
  private hits = 0;
  private static LIT: Shot[] = ['leftOrbit', 'ramp', 'reactor', 'rightOrbit'];

  override tick(dt: number) {
    super.tick(dt);
    if (this.streakT > 0) this.streakT -= dt;
  }

  override gi() {
    return 0.08;
  }

  override lit(s: Shot): LampState {
    return Blackout.LIT.includes(s) ? (this.streakT > 0 ? 3 : 2) : 0;
  }

  override onShot(s: Shot) {
    if (!Blackout.LIT.includes(s)) return;
    this.streak = this.streakT > 0 ? Math.min(5, this.streak + 1) : 1;
    this.streakT = 6;
    this.hits++;
    this.progress();
    this.award(this.v(1_000_000 * this.streak), s);
    this.f.hitFx(s, this.color);
    this.f.game.show(`${this.streak}X IN THE DARK`, short(this.v(1_000_000 * this.streak)), 1.2);
    if (this.hits >= 6) this.complete(this.v(3_000_000), 'NO WITNESSES');
  }

  override onSwitch(s: Switch) {
    if (s === 'spinner') this.award(this.v(20_000));
  }

  status() {
    return this.streakT > 0 ? `CHAIN ${this.streak}X  ${Math.ceil(this.streakT)}` : `${6 - this.hits} SHOTS TO GO`;
  }
}

/** Build the charge at the targets, then blow it at the scoop. */
class Sabotage extends Mode {
  name = 'SABOTAGE';
  color = '#ffd23f';
  brief = 'BUILD AT TARGETS, BLOW AT SCOOP';
  time = 40;
  private charge = 1_000_000;
  private blown = 0;

  override lit(s: Shot): LampState {
    if (s === 'scoop') return 3;
    return s === 'hit' || s === 'drops' || s === 'reactor' ? 1 : 0;
  }

  override onShot(s: Shot) {
    if (s === 'scoop') {
      this.award(this.v(this.charge), s, 'DETONATED');
      this.f.hitFx(s, this.color);
      this.f.game.doShake(12);
      this.blown++;
      this.progress();
      this.charge = 1_000_000 + this.blown * 500_000;
      if (this.blown >= 2) this.complete(this.v(3_000_000), 'TOTAL SABOTAGE');
    } else if (s === 'hit' || s === 'drops' || s === 'reactor') {
      this.charge += 250_000;
      this.f.game.fx.popup(...this.f.shotPos(s), `+${short(this.v(250_000))} CHARGE`, this.color, 16);
    }
  }

  override onSwitch(s: Switch) {
    if (s === 'bumper') this.charge += 50_000;
  }

  status() {
    return `SCOOP BLOWS ${short(this.v(this.charge))}`;
  }
}

export interface JobDef {
  name: string;
  /** Label printed on the playfield insert. */
  label: string;
  color: string;
  make: (f: Foundry, mult: number) => Mode;
}

export const JOBS: JobDef[] = [
  { name: 'SHAKEDOWN', label: 'SHAKEDOWN', color: '#3ddc84', make: (f, m) => new Shakedown(f, m) },
  { name: 'HOT METAL', label: 'HOT METAL', color: '#ff7a1a', make: (f, m) => new HotMetal(f, m) },
  { name: 'BLOOD MONEY', label: 'BLOOD $', color: '#e0262b', make: (f, m) => new BloodMoney(f, m) },
  { name: 'BLACKOUT', label: 'BLACKOUT', color: '#9ec5ff', make: (f, m) => new Blackout(f, m) },
  { name: 'SABOTAGE', label: 'SABOTAGE', color: '#ffd23f', make: (f, m) => new Sabotage(f, m) },
];

// ---------------------------------------------------------------- side modes

/** Lane-started frenzy: every switch on the table pays. Runs alongside a job. */
export class Riot extends Mode {
  name = 'RIOT';
  color = '#ff3b2f';
  brief = 'EVERY SWITCH SCORES';
  time = 20;

  override onSwitch(s: Switch) {
    this.award(this.v(s === 'bumper' ? 150_000 : 100_000));
  }

  override onShot(s: Shot) {
    this.award(this.v(250_000), s);
  }

  status() {
    return `RIOT ${Math.ceil(this.timer)}  ${short(this.total)}`;
  }
}

/** Wizard mode: multiball where every shot is a jackpot and the scoop is the super. */
export class BurnItDown extends Mode {
  name = 'BURN IT DOWN';
  color = '#ff5a1a';
  brief = 'EVERY SHOT IS A JACKPOT';
  /** No clock: it lasts as long as the multiball does. */
  time = Infinity;
  private left = new Set<Shot>(FIELD_SHOTS);
  private jp = 2_000_000;

  override lit(s: Shot): LampState {
    if (s === 'scoop') return this.left.size === 0 ? 3 : 0;
    return this.left.has(s) ? 3 : 0;
  }

  override onShot(s: Shot) {
    const g = this.f.game;
    if (s === 'scoop' && this.left.size === 0) {
      const v = this.v(this.jp * 5);
      this.award(v, s, 'SUPER JACKPOT');
      this.f.celebrate(this.color);
      g.doShake(14);
      sound.jackpot();
      this.left = new Set(FIELD_SHOTS);
      return;
    }
    if (!this.left.has(s)) return;
    this.left.delete(s);
    this.award(this.v(this.jp), s, 'JACKPOT');
    this.f.hitFx(s, this.color);
    sound.jackpot();
    this.jp += 500_000;
    if (this.left.size === 0) g.show('SUPER JACKPOT', 'IS LIT AT THE SCOOP', 2, true);
  }

  status() {
    return this.left.size === 0 ? `SUPER ${short(this.v(this.jp * 5))}` : `JACKPOT ${short(this.v(this.jp))}`;
  }
}
