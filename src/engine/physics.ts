// Custom 2D pinball physics. Fixed small timestep, circle balls against
// segments, circles and kinematic flippers. Layers let ramps sit above the floor.

export const FLOOR = 1;
export const RAMP = 2;

export const STEP = 1 / 480;
const MAX_SPEED = 4600;
const BOUNCE_MIN = 60; // impacts slower than this don't bounce (kills jitter)
const HIT_EVENT_MIN = 25;

let nextBallId = 1;

export class Ball {
  id = nextBallId++;
  x: number;
  y: number;
  px: number;
  py: number;
  vx = 0;
  vy = 0;
  r = 14;
  layer = FLOOR;
  captured = false;
  stillTime = 0;
  /** Free-form per-ball flags for table rules (e.g. ramp progress). */
  tags: Record<string, number> = {};

  constructor(x: number, y: number) {
    this.x = this.px = x;
    this.y = this.py = y;
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }
}

export interface Hit {
  ball: Ball;
  speed: number;
  nx: number;
  ny: number;
}

export interface ColliderOpts {
  layers?: number;
  restitution?: number;
  friction?: number;
  kick?: number;
  kickThreshold?: number;
  oneWay?: boolean;
  tag?: string;
  onHit?: (h: Hit) => void;
}

abstract class Collider {
  layers: number;
  restitution: number;
  friction: number;
  kick: number;
  kickThreshold: number;
  enabled = true;
  tag: string;
  onHit?: (h: Hit) => void;
  /** Time since last hit, handy for flashing visuals. */
  lastHit = 999;

  constructor(o: ColliderOpts) {
    this.layers = o.layers ?? FLOOR;
    this.restitution = o.restitution ?? 0.45;
    this.friction = o.friction ?? 0.04;
    this.kick = o.kick ?? 0;
    this.kickThreshold = o.kickThreshold ?? 0;
    this.tag = o.tag ?? '';
    this.onHit = o.onHit;
  }
}

export class Segment extends Collider {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  len2: number;
  /** Unit normal (dy, -dx); the "front" side for one-way gates. */
  nx: number;
  ny: number;
  oneWay: boolean;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;

  constructor(ax: number, ay: number, bx: number, by: number, o: ColliderOpts = {}) {
    super(o);
    this.ax = ax;
    this.ay = ay;
    this.bx = bx;
    this.by = by;
    const dx = bx - ax;
    const dy = by - ay;
    this.len2 = dx * dx + dy * dy || 1e-9;
    const len = Math.sqrt(this.len2);
    this.nx = dy / len;
    this.ny = -dx / len;
    this.oneWay = o.oneWay ?? false;
    this.minX = Math.min(ax, bx);
    this.maxX = Math.max(ax, bx);
    this.minY = Math.min(ay, by);
    this.maxY = Math.max(ay, by);
  }
}

export class Circle extends Collider {
  x: number;
  y: number;
  r: number;
  /** Velocity of a moving circle (e.g. a fighter) so hits carry momentum. */
  vx = 0;
  vy = 0;

  constructor(x: number, y: number, r: number, o: ColliderOpts = {}) {
    super(o);
    this.x = x;
    this.y = y;
    this.r = r;
  }
}

export class Flipper {
  px: number;
  py: number;
  len: number;
  r0: number;
  r1: number;
  restAngle: number;
  upAngle: number;
  angle: number;
  omega = 0;
  pressed = false;
  upSpeed = 30;
  downSpeed = 17;
  restitution = 0.28;
  enabled = true;

  constructor(px: number, py: number, len: number, restAngle: number, upAngle: number, r0 = 13, r1 = 7) {
    this.px = px;
    this.py = py;
    this.len = len;
    this.restAngle = restAngle;
    this.upAngle = upAngle;
    this.angle = restAngle;
    this.r0 = r0;
    this.r1 = r1;
  }

  get tipX() {
    return this.px + Math.cos(this.angle) * this.len;
  }
  get tipY() {
    return this.py + Math.sin(this.angle) * this.len;
  }

  update(dt: number) {
    const target = this.pressed && this.enabled ? this.upAngle : this.restAngle;
    const diff = target - this.angle;
    if (diff === 0) {
      this.omega = 0;
      return;
    }
    const speed = this.pressed ? this.upSpeed : this.downSpeed;
    const stepA = Math.sign(diff) * Math.min(Math.abs(diff), speed * dt);
    this.angle += stepA;
    this.omega = stepA / dt;
  }
}

export class LineSensor {
  layers: number;
  /** dir: +1 when crossing toward the segment's normal side, -1 otherwise. */
  constructor(
    public ax: number,
    public ay: number,
    public bx: number,
    public by: number,
    public onCross: (ball: Ball, dir: number) => void,
    layers = FLOOR,
  ) {
    this.layers = layers;
  }
}

export class ZoneSensor {
  inside = new Set<number>();
  enabled = true;
  constructor(
    public x: number,
    public y: number,
    public r: number,
    public onEnter: (ball: Ball) => void,
    public layers = FLOOR,
    public onExit?: (ball: Ball) => void,
  ) {}
}

function resolve(
  b: Ball,
  nx: number,
  ny: number,
  pen: number,
  svx: number,
  svy: number,
  e: number,
  fr: number,
  kick: number,
  kickTh: number,
): number {
  b.x += nx * pen;
  b.y += ny * pen;
  const rvx = b.vx - svx;
  const rvy = b.vy - svy;
  const vn = rvx * nx + rvy * ny;
  if (vn >= 0) return -1;
  const impact = -vn;
  const ee = impact < BOUNCE_MIN ? 0 : e;
  let nvx = rvx - (1 + ee) * vn * nx;
  let nvy = rvy - (1 + ee) * vn * ny;
  if (fr > 0 && impact > BOUNCE_MIN) {
    const tx = -ny;
    const ty = nx;
    const vt = nvx * tx + nvy * ty;
    nvx -= vt * fr * tx;
    nvy -= vt * fr * ty;
  }
  if (kick > 0 && impact >= kickTh) {
    nvx += nx * kick;
    nvy += ny * kick;
  }
  b.vx = nvx + svx;
  b.vy = nvy + svy;
  return impact;
}

export class World {
  segments: Segment[] = [];
  circles: Circle[] = [];
  flippers: Flipper[] = [];
  lineSensors: LineSensor[] = [];
  zones: ZoneSensor[] = [];
  balls: Ball[] = [];
  gravity = 2000;
  /** Extra per-ball forces (ramp slopes, magnets...). */
  force?: (b: Ball, dt: number) => void;

  seg(ax: number, ay: number, bx: number, by: number, o?: ColliderOpts) {
    const s = new Segment(ax, ay, bx, by, o);
    this.segments.push(s);
    return s;
  }

  circle(x: number, y: number, r: number, o?: ColliderOpts) {
    const c = new Circle(x, y, r, o);
    this.circles.push(c);
    return c;
  }

  step(dt: number) {
    for (const f of this.flippers) f.update(dt);
    for (const s of this.segments) s.lastHit += dt;
    for (const c of this.circles) c.lastHit += dt;

    for (const b of this.balls) {
      b.px = b.x;
      b.py = b.y;
      if (b.captured) continue;
      b.vy += this.gravity * dt;
      if (this.force) this.force(b, dt);
      const damp = 1 - 0.12 * dt;
      b.vx *= damp;
      b.vy *= damp;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > MAX_SPEED) {
        b.vx *= MAX_SPEED / sp;
        b.vy *= MAX_SPEED / sp;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }

    for (const b of this.balls) if (!b.captured) this.collide(b);
    this.ballBall();

    for (const b of this.balls) {
      if (b.captured) continue;
      for (const s of this.lineSensors) if (s.layers & b.layer) this.checkLine(s, b);
      for (const z of this.zones) {
        if (!z.enabled) continue;
        const inside = (z.layers & b.layer) !== 0 && (b.x - z.x) ** 2 + (b.y - z.y) ** 2 < z.r * z.r;
        const was = z.inside.has(b.id);
        if (inside && !was) {
          z.inside.add(b.id);
          z.onEnter(b);
        } else if (!inside && was) {
          z.inside.delete(b.id);
          z.onExit?.(b);
        }
      }
      if (Math.hypot(b.vx, b.vy) < 8) b.stillTime += dt;
      else b.stillTime = 0;
    }
  }

  private collide(b: Ball) {
    const r = b.r;
    for (const s of this.segments) {
      if (!s.enabled || !(s.layers & b.layer)) continue;
      if (b.x < s.minX - r || b.x > s.maxX + r || b.y < s.minY - r || b.y > s.maxY + r) continue;
      const abx = s.bx - s.ax;
      const aby = s.by - s.ay;
      let t = ((b.x - s.ax) * abx + (b.y - s.ay) * aby) / s.len2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cx = s.ax + abx * t;
      const cy = s.ay + aby * t;
      const dx = b.x - cx;
      const dy = b.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r * r) continue;
      let nx: number;
      let ny: number;
      const d = Math.sqrt(d2);
      if (d < 1e-6) {
        nx = s.nx;
        ny = s.ny;
      } else {
        nx = dx / d;
        ny = dy / d;
      }
      if (s.oneWay) {
        const side = (b.x - s.ax) * s.nx + (b.y - s.ay) * s.ny;
        if (side < 0) continue;
        if (b.vx * nx + b.vy * ny >= 0) continue;
      }
      const impact = resolve(b, nx, ny, r - d, 0, 0, s.restitution, s.friction, s.kick, s.kickThreshold);
      if (impact > HIT_EVENT_MIN) {
        s.lastHit = 0;
        s.onHit?.({ ball: b, speed: impact, nx, ny });
      }
    }

    for (const c of this.circles) {
      if (!c.enabled || !(c.layers & b.layer)) continue;
      const dx = b.x - c.x;
      const dy = b.y - c.y;
      const rr = r + c.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 1e-6;
      const nx = dx / d;
      const ny = dy / d;
      const impact = resolve(b, nx, ny, rr - d, c.vx, c.vy, c.restitution, c.friction, c.kick, c.kickThreshold);
      if (impact > HIT_EVENT_MIN) {
        c.lastHit = 0;
        c.onHit?.({ ball: b, speed: impact, nx, ny });
      }
    }

    if (b.layer & FLOOR) {
      for (const f of this.flippers) this.collideFlipper(b, f);
    }
  }

  private collideFlipper(b: Ball, f: Flipper) {
    const tx = f.tipX;
    const ty = f.tipY;
    const abx = tx - f.px;
    const aby = ty - f.py;
    const len2 = abx * abx + aby * aby;
    let t = ((b.x - f.px) * abx + (b.y - f.py) * aby) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const rad = f.r0 + (f.r1 - f.r0) * t;
    const cx = f.px + abx * t;
    const cy = f.py + aby * t;
    const dx = b.x - cx;
    const dy = b.y - cy;
    const rr = rad + b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr) return;
    const d = Math.sqrt(d2) || 1e-6;
    const nx = dx / d;
    const ny = dy / d;
    // Surface velocity of the rotating flipper at the contact point.
    const qx = cx + nx * rad - f.px;
    const qy = cy + ny * rad - f.py;
    const svx = -f.omega * qy;
    const svy = f.omega * qx;
    resolve(b, nx, ny, rr - d, svx, svy, f.restitution, 0.02, 0, 0);
  }

  private ballBall() {
    const bs = this.balls;
    for (let i = 0; i < bs.length; i++) {
      const a = bs[i];
      if (a.captured) continue;
      for (let j = i + 1; j < bs.length; j++) {
        const b = bs[j];
        if (b.captured || a.layer !== b.layer) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const rr = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 < 1e-9) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;
        const pen = (rr - d) / 2;
        a.x -= nx * pen;
        a.y -= ny * pen;
        b.x += nx * pen;
        b.y += ny * pen;
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn < 0) {
          const imp = (-(1 + 0.9) * vn) / 2;
          a.vx -= imp * nx;
          a.vy -= imp * ny;
          b.vx += imp * nx;
          b.vy += imp * ny;
        }
      }
    }
  }

  private checkLine(s: LineSensor, b: Ball) {
    const ex = s.bx - s.ax;
    const ey = s.by - s.ay;
    const s0 = ex * (b.py - s.ay) - ey * (b.px - s.ax);
    const s1 = ex * (b.y - s.ay) - ey * (b.x - s.ax);
    if ((s0 < 0 && s1 < 0) || (s0 > 0 && s1 > 0) || s0 === s1) return;
    if (s0 === 0 && s1 === 0) return;
    const u = s0 / (s0 - s1);
    const ix = b.px + (b.x - b.px) * u;
    const iy = b.py + (b.y - b.py) * u;
    const t = ((ix - s.ax) * ex + (iy - s.ay) * ey) / (ex * ex + ey * ey);
    if (t < 0 || t > 1) return;
    // cross(e, p) < 0 means p is on the (dy, -dx) normal side.
    s.onCross(b, s1 < s0 ? 1 : -1);
  }
}
