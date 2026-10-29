// Visual juice: cached glow sprites, particles, floating score popups.

const glowCache = new Map<string, HTMLCanvasElement>();

/** Soft radial glow sprite, drawn with 'lighter' compositing. */
export function glowSprite(color: string): HTMLCanvasElement {
  let c = glowCache.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, color);
  grad.addColorStop(0.25, withAlpha(color, 0.55));
  grad.addColorStop(1, withAlpha(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  glowCache.set(color, c);
  return c;
}

export function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1) {
  if (alpha <= 0.01) return;
  const prevOp = ctx.globalCompositeOperation;
  const prevA = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = prevA;
  ctx.globalCompositeOperation = prevOp;
}

export function withAlpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  drag: number;
  grav: number;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  size: number;
}

export class FX {
  particles: Particle[] = [];
  popups: Popup[] = [];

  sparks(x: number, y: number, color: string, n = 12, speed = 400, size = 3) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0,
        max: 0.25 + Math.random() * 0.35,
        color,
        size: size * (0.5 + Math.random()),
        drag: 3,
        grav: 600,
      });
    }
  }

  steam(x: number, y: number, dirX: number, dirY: number) {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 8,
      y,
      vx: dirX * (30 + Math.random() * 40) + (Math.random() - 0.5) * 20,
      vy: dirY * (30 + Math.random() * 40),
      life: 0,
      max: 1.2 + Math.random() * 0.8,
      color: '#8fa8c0',
      size: 10 + Math.random() * 10,
      drag: 0.5,
      grav: 0,
    });
  }

  /** Glowing ember drifting up off molten metal. */
  ember(x: number, y: number) {
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 30,
      vy: -20 - Math.random() * 40,
      life: 0,
      max: 0.8 + Math.random() * 1.2,
      color: Math.random() < 0.7 ? '#ff8a2a' : '#ffd27a',
      size: 1.2 + Math.random() * 1.6,
      drag: 0.4,
      grav: -15,
    });
  }

  popup(x: number, y: number, text: string, color = '#ffffff', size = 22) {
    this.popups.push({ x, y, text, color, life: 0, size });
  }

  update(dt: number) {
    for (const p of this.particles) {
      p.life += dt;
      p.vx *= 1 - p.drag * dt;
      p.vy *= 1 - p.drag * dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    for (const p of this.popups) {
      p.life += dt;
      p.y -= 40 * dt;
    }
    this.popups = this.popups.filter((p) => p.life < 1.1);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of this.particles) {
      const k = 1 - p.life / p.max;
      if (p.grav === 0) {
        // steam: soft grey puffs
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.12 * k;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.6 - k * 0.6), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = k;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of this.popups) {
      const k = p.life / 1.1;
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      const s = p.size * (k < 0.1 ? 0.6 + k * 4 : 1);
      ctx.font = `900 ${s}px "Arial Black", Impact, system-ui, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.restore();
  }
}
