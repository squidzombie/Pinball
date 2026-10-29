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

export abstract class Mode {
  abstract readonly name: string;
  abstract readonly color: string;
  /** Second line of the DMD intro. */
  abstract readonly brief: string;
  /** Seconds on the clock. */
  time = 30;
  timer = 0;
  total = 0;
  completed = false;
  /** Set when the mode should end, by success or by failure. */
  finished = false;

  constructor(
    protected f: Foundry,
    protected mult: number,
  ) {}

  start() {
    this.timer = this.time;
  }

  /** Called only while the mode clock runs (no ball held in the scoop or lane). */
  tick(dt: number) {
    const before = Math.ceil(this.timer);
    this.timer -= dt;
    const now = Math.ceil(this.timer);
    if (now !== before && now <= 5 && now > 0) sound.tick();
    if (this.timer <= 0) this.finished = true;
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
    this.award(bonus);
    this.completed = true;
    this.finished = true;
    this.f.game.show(title, `+${fmt(bonus)}`, 2.4, true);
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
    if (this.phase === 'heat') this.elapsed += dt;
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
      this.timer = 15;
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

/** Collect every lit shot; each one you take makes the rest worth more. */
class BloodMoney extends Mode {
  name = 'BLOOD MONEY';
  color = '#e0262b';
  brief = 'COLLECT EVERY LIT SHOT';
  time = 45;
  private left = new Set<Shot>(FIELD_SHOTS);

  get value() {
    return this.v(750_000 + (FIELD_SHOTS.length - this.left.size) * 250_000);
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
  time = Infinity;
  private left = new Set<Shot>(FIELD_SHOTS);
  private jp = 2_000_000;

  override tick() {
    // No clock: it lasts as long as the multiball does.
  }

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
