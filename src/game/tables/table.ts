import { Ball, FLOOR, RAMP, RAMP2, World, type Flipper } from '../../engine/physics';
import type { Game } from '../game';
import {
  art,
  drawBall,
  drawFlasherDome,
  drawFlasherLit,
  drawFlasherWash,
  drawFlipper,
  drawLampLit,
  drawLampOff,
  lampLit,
  type Flasher,
  type FlipperStyle,
  type Lamp,
} from './draw';

export const TABLE_W = 600;
export const TABLE_H = 1200;

export interface Shooter {
  x: number;
  y: number;
  minX: number;
  maxX: number;
  minY: number;
}

/** Something with height that has to be depth-sorted against the balls. */
export interface Sprite {
  y: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

export type ShowKind = 'sweepUp' | 'sweepDown' | 'radial' | 'strobe' | 'wipe' | 'chase';

interface LampShow {
  kind: ShowKind;
  t: number;
  dur: number;
  x: number;
  y: number;
}

/** How fast the lights sag and recover in Rage and Blackout. */
const GI_PULSE_HZ = 0.6;
const ATTRACT_SHOWS: ShowKind[] = ['chase', 'sweepUp', 'radial', 'wipe', 'sweepDown', 'strobe'];

export abstract class Table {
  /** Draw every collider and sensor over the art (?debug). */
  static debug = false;
  world = new World();
  lamps: Lamp[] = [];
  flashers: Flasher[] = [];
  flipperL!: Flipper;
  flipperR!: Flipper;
  /** Upper flippers etc., each driven by the left (-1) or right (1) button. */
  extraFlippers: { f: Flipper; side: -1 | 1 }[] = [];
  shooter: Shooter | null = null;
  flipperStyle: FlipperStyle = { body: '#e9e2d0', rubber: '#b3261e' };
  time = 0;
  attract = false;

  /** General illumination, 0 (dark) to 1. */
  gi = 1;
  giTarget = 1;
  /** 0..1: how deep the lights sag in their slow pulse (Rage, Blackout). */
  giPulse = 0;
  private show: LampShow | null = null;
  private attractShow = 0;

  private staticCanvas: HTMLCanvasElement | null = null;
  private rampCanvas: HTMLCanvasElement | null = null;
  private cacheK = 0;
  /**
   * Painted playfield art (art/README.md): the table's whole 600 x 1200 frame, drawn in place of the
   * code's own floor art, under the rails, toys and lights. Null: the code draws the floor.
   */
  floorArt: CanvasImageSource | null = null;

  constructor(public readonly game: Game) {}

  /** Static floor art (rendered once into a cache). Call drawInserts() where the inserts belong. */
  protected abstract drawStatic(ctx: CanvasRenderingContext2D): void;
  /** Ramps / plastics drawn above floor balls (cached). Return false if none. */
  protected drawRamps(_ctx: CanvasRenderingContext2D): boolean {
    return false;
  }
  /** Animated floor-level things (under the lamps and balls). */
  protected drawDynamic(_ctx: CanvasRenderingContext2D) {}
  /** Raised animated things, depth-sorted with the balls. */
  protected sprites(_out: Sprite[]) {}
  /** Animated things above everything. */
  protected drawTop(_ctx: CanvasRenderingContext2D) {}
  /** Height of the surface under a ball (ramps). */
  ballZ(_b: Ball) {
    return 0;
  }

  update(dt: number) {
    this.time += dt;
    this.gi += (this.giTarget - this.gi) * Math.min(1, dt * 6);
    for (const f of this.flashers) f.level = Math.max(0, f.level - dt * 4);
    if (this.show) {
      this.show.t += dt;
      if (this.show.t >= this.show.dur) this.show = null;
    }
    if (this.attract && !this.show) {
      this.attractShow = (this.attractShow + 1) % ATTRACT_SHOWS.length;
      this.lampShow(ATTRACT_SHOWS[this.attractShow], 3.2);
    }
  }

  /** Called every physics substep. */
  substep(_dt: number) {}

  lampShow(kind: ShowKind, dur = 1, x = TABLE_W / 2, y = 600) {
    this.show = { kind, t: 0, dur, x, y };
  }

  flash(i: number, level = 1) {
    const f = this.flashers[i];
    if (f) f.level = Math.max(f.level, level);
  }

  flashAll(level = 1) {
    for (let i = 0; i < this.flashers.length; i++) this.flash(i, level);
  }

  /** Every flipper on one side (or all of them). */
  flippers(side?: -1 | 1): Flipper[] {
    const out: Flipper[] = [];
    if (side !== 1) out.push(this.flipperL);
    if (side !== -1) out.push(this.flipperR);
    for (const x of this.extraFlippers) if (side === undefined || x.side === side) out.push(x.f);
    return out;
  }

  /** Ball resting on (or rolling along) a flipper that's being held up: a cradle. */
  onHeldFlipper(b: Ball) {
    for (const f of this.flippers()) {
      if (!f.pressed) continue;
      const ax = f.tipX - f.px;
      const ay = f.tipY - f.py;
      const t = Math.max(0, Math.min(1, ((b.x - f.px) * ax + (b.y - f.py) * ay) / (ax * ax + ay * ay)));
      if (Math.hypot(b.x - (f.px + ax * t), b.y - (f.py + ay * t)) < f.r0 + b.r + 6) return true;
    }
    return false;
  }

  inShooterLane(b: Ball) {
    const s = this.shooter;
    return !!s && b.x > s.minX && b.x < s.maxX && b.y > s.minY;
  }

  addBall(x: number, y: number, vx = 0, vy = 0) {
    const b = new Ball(x, y);
    b.vx = vx;
    b.vy = vy;
    this.world.balls.push(b);
    return b;
  }

  removeBall(b: Ball) {
    this.world.balls = this.world.balls.filter((x) => x !== b);
    for (const z of this.world.zones) z.inside.delete(b.id);
  }

  invalidate() {
    this.staticCanvas = null;
    this.rampCanvas = null;
  }

  /** Use a painted playfield, or null for the code's own floor art. */
  setFloorArt(img: CanvasImageSource | null) {
    this.floorArt = img;
    this.invalidate();
  }

  protected drawInserts(ctx: CanvasRenderingContext2D) {
    for (const l of this.lamps) drawLampOff(ctx, l);
  }

  protected drawFlasherDomes(ctx: CanvasRenderingContext2D) {
    for (const f of this.flashers) drawFlasherDome(ctx, f);
  }

  private cache(k: number, fn: (ctx: CanvasRenderingContext2D) => boolean | void): HTMLCanvasElement | null {
    const c = document.createElement('canvas');
    c.width = Math.ceil(TABLE_W * k);
    c.height = Math.ceil(TABLE_H * k);
    const ctx = c.getContext('2d')!;
    ctx.scale(k, k);
    const used = fn(ctx);
    return used === false ? null : c;
  }

  /**
   * Effective light level. With `giPulse` set (Rage, Blackout) the lights sag and recover in a
   * slow, shallow pulse, never a flicker: anything that changes the brightness of the whole table
   * stays under 3 flashes a second, since fast full-screen flashing can trigger seizures.
   */
  get light() {
    let l = this.gi;
    if (this.giPulse > 0) l *= 1 - this.giPulse * 0.25 * (0.5 - 0.5 * Math.cos(this.time * Math.PI * 2 * GI_PULSE_HZ));
    return l;
  }

  private forced(l: Lamp, i: number): boolean | undefined {
    const s = this.show;
    if (!s) return undefined;
    const p = s.t / s.dur;
    switch (s.kind) {
      case 'sweepUp': {
        const band = TABLE_H * (1.15 - p * 1.3);
        return Math.abs(l.y - band) < 110;
      }
      case 'sweepDown': {
        const band = TABLE_H * (-0.15 + p * 1.3);
        return Math.abs(l.y - band) < 110;
      }
      case 'wipe': {
        const band = TABLE_W * (-0.2 + ((p * 2) % 1) * 1.4);
        return Math.abs(l.x - band) < 70;
      }
      case 'radial': {
        const d = Math.hypot(l.x - s.x, l.y - s.y);
        const r = p * 900;
        return d < r && d > r - 160;
      }
      case 'strobe':
        // every light at once, so held to 2.5 flashes a second (see `light`)
        return Math.floor(s.t * 5) % 2 === 0;
      case 'chase':
        return Math.sin(s.t * 6 - i * 0.55) > 0.4;
    }
  }

  render(ctx: CanvasRenderingContext2D, k: number) {
    art.k = k;
    if (k !== this.cacheK || !this.staticCanvas) {
      this.cacheK = k;
      this.staticCanvas = this.cache(k, (c) => this.drawStatic(c));
      this.rampCanvas = this.cache(k, (c) => this.drawRamps(c));
    }
    ctx.drawImage(this.staticCanvas!, 0, 0, TABLE_W, TABLE_H);
    this.drawDynamic(ctx);

    const light = this.light;
    if (light < 0.995) {
      ctx.fillStyle = `rgba(2,2,3,${(1 - light) * 0.82})`;
      ctx.fillRect(0, 0, TABLE_W, TABLE_H);
    }

    const t = this.time;
    this.lamps.forEach((l, i) => {
      const f = this.forced(l, i);
      if (f ?? lampLit(l.state(), t)) drawLampLit(ctx, l);
    });
    for (const f of this.flashers) drawFlasherWash(ctx, f);

    // Raised objects fade into the dark when the GI drops.
    const dim = 0.25 + 0.75 * light;
    ctx.globalAlpha = dim;
    for (const f of this.flippers()) drawFlipper(ctx, f, this.flipperStyle);
    const list: Sprite[] = [];
    this.sprites(list);
    for (const b of this.world.balls) if (b.layer === FLOOR) list.push({ y: b.y, draw: (c) => this.drawBallLit(c, b, 0, dim) });
    list.sort((a, b) => a.y - b.y);
    for (const s of list) s.draw(ctx);
    if (this.rampCanvas) ctx.drawImage(this.rampCanvas, 0, 0, TABLE_W, TABLE_H);
    ctx.globalAlpha = 1;
    for (const b of this.world.balls) if (b.layer !== FLOOR) drawBall(ctx, b, this.ballZ(b));
    ctx.globalAlpha = dim;
    this.drawTop(ctx);
    ctx.globalAlpha = 1;
    for (const f of this.flashers) drawFlasherLit(ctx, f);
    if (Table.debug) this.drawColliders(ctx);
  }

  private drawColliders(ctx: CanvasRenderingContext2D) {
    const w = this.world;
    ctx.save();
    ctx.lineWidth = 1.5;
    for (const s of w.segments) {
      if (!s.enabled) continue;
      ctx.strokeStyle = s.oneWay ? '#ffe000' : s.layers & RAMP2 ? '#40a0ff' : s.layers & RAMP ? (s.layers & FLOOR ? '#ffffff' : '#ff40ff') : '#00ffff';
      ctx.beginPath();
      ctx.moveTo(s.ax, s.ay);
      ctx.lineTo(s.bx, s.by);
      ctx.stroke();
    }
    ctx.strokeStyle = '#00ff60';
    for (const l of w.lineSensors) {
      ctx.beginPath();
      ctx.moveTo(l.ax, l.ay);
      ctx.lineTo(l.bx, l.by);
      ctx.stroke();
    }
    for (const z of w.zones) {
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#ff8000';
    for (const c of w.circles) {
      if (!c.enabled) continue;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const f of w.flippers) {
      ctx.beginPath();
      ctx.moveTo(f.px, f.py);
      ctx.lineTo(f.tipX, f.tipY);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Balls never fade with the GI; they'd vanish in a blackout. */
  private drawBallLit(ctx: CanvasRenderingContext2D, b: Ball, z: number, dim: number) {
    ctx.globalAlpha = 1;
    drawBall(ctx, b, z);
    ctx.globalAlpha = dim;
  }
}
