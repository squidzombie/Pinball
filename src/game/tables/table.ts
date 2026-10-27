import { Ball, FLOOR, RAMP, World, type Flipper } from '../../engine/physics';
import type { Game } from '../game';
import { drawBall, drawFlipper, drawLamp, type Lamp } from './draw';

export const TABLE_W = 600;
export const TABLE_H = 1200;

export interface Shooter {
  x: number;
  y: number;
  minX: number;
  maxX: number;
  minY: number;
}

export abstract class Table {
  world = new World();
  lamps: Lamp[] = [];
  flipperL!: Flipper;
  flipperR!: Flipper;
  shooter: Shooter | null = null;
  flipperColor = '#00e5ff';
  time = 0;
  attract = false;

  private staticCanvas: HTMLCanvasElement | null = null;
  private rampCanvas: HTMLCanvasElement | null = null;
  private cacheK = 0;

  constructor(protected game: Game) {}

  /** Static floor art (rendered once into a cache). */
  protected abstract drawStatic(ctx: CanvasRenderingContext2D): void;
  /** Ramps / plastics drawn above floor balls (cached). Return false if none. */
  protected drawRamps(_ctx: CanvasRenderingContext2D): boolean {
    return false;
  }
  /** Animated things under the balls. */
  protected drawDynamic(_ctx: CanvasRenderingContext2D) {}
  /** Animated things above everything. */
  protected drawTop(_ctx: CanvasRenderingContext2D) {}

  update(dt: number) {
    this.time += dt;
  }

  /** Called every physics substep. */
  substep(_dt: number) {}

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

  private cache(k: number, fn: (ctx: CanvasRenderingContext2D) => boolean | void): HTMLCanvasElement | null {
    const c = document.createElement('canvas');
    c.width = Math.ceil(TABLE_W * k);
    c.height = Math.ceil(TABLE_H * k);
    const ctx = c.getContext('2d')!;
    ctx.scale(k, k);
    const used = fn(ctx);
    return used === false ? null : c;
  }

  render(ctx: CanvasRenderingContext2D, k: number) {
    if (k !== this.cacheK || !this.staticCanvas) {
      this.cacheK = k;
      this.staticCanvas = this.cache(k, (c) => this.drawStatic(c));
      this.rampCanvas = this.cache(k, (c) => this.drawRamps(c));
    }
    ctx.drawImage(this.staticCanvas!, 0, 0, TABLE_W, TABLE_H);
    const t = this.time;
    this.lamps.forEach((l, i) => {
      const forced = this.attract ? Math.sin(t * 5 - i * 0.6) > 0.3 : undefined;
      drawLamp(ctx, l, t, forced);
    });
    this.drawDynamic(ctx);
    drawFlipper(ctx, this.flipperL, this.flipperColor);
    drawFlipper(ctx, this.flipperR, this.flipperColor);
    for (const b of this.world.balls) if (b.layer === FLOOR) drawBall(ctx, b);
    if (this.rampCanvas) ctx.drawImage(this.rampCanvas, 0, 0, TABLE_W, TABLE_H);
    for (const b of this.world.balls) if (b.layer === RAMP) drawBall(ctx, b);
    this.drawTop(ctx);
  }
}
