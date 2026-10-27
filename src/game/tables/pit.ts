import { type Ball, type Circle } from '../../engine/physics';
import { sound } from '../../engine/audio';
import { drawGlow, withAlpha } from '../../engine/fx';
import type { DMD } from '../../engine/dmd';
import type { Game } from '../game';
import { buildLowerSection, poly, type LowerSection, type P } from './geom';
import { neonRail, rng, rubber, strokePath, type Lamp } from './draw';
import { Table, TABLE_H, TABLE_W } from './table';

const RED = '#ff2a3d';
const SODIUM = '#ff9a2a';
const WHITE = '#f4f4f4';
const TEAL = '#29ffc6';
const CX = 300;
const FIGHT_Y = 330;

const WALLS: P[] = [
  [42.5, 1240],
  [42.5, 330],
  [150, 175],
  [450, 175],
  [557.5, 330],
  [557.5, 1240],
];
const JAB: P[] = [
  [62, 500],
  [72, 590],
];
const HOOK: P[] = [
  [538, 500],
  [528, 590],
];
const POSTS: P[] = [
  [140, 340],
  [460, 340],
];
const CROWD: P[] = [
  [160, 690],
  [440, 690],
];

export interface FighterDef {
  name: string;
  hp: number;
  speed: number;
  attackEvery: number;
  color: string;
  skin: string;
  title: string;
}

export const FIGHTERS: FighterDef[] = [
  { name: 'RAZOR', hp: 5, speed: 60, attackEvery: 8, color: '#ff2a3d', skin: '#c98a6a', title: 'STREET BRAWLER' },
  { name: 'BRICK', hp: 8, speed: 90, attackEvery: 6.5, color: '#ffb000', skin: '#8a5a40', title: 'DOCKYARD ENFORCER' },
  { name: 'KINGPIN', hp: 12, speed: 130, attackEvery: 5.5, color: '#b14dff', skin: '#e0b090', title: 'LORD OF THE PIT' },
];

type FState = 'intro' | 'idle' | 'telegraph' | 'strike' | 'stagger' | 'ko' | 'lost';

export class Pit extends Table {
  lower: LowerSection;
  fighter: Circle;
  def: FighterDef = FIGHTERS[0];
  level = 0;
  hp = 5;
  playerHp = 3;
  superMeter = 0;
  state: FState = 'intro';
  private stateT = 0;
  private attackTimer = 0;
  private dir = 1;
  private invuln = 0;
  hitFlash = 0;
  recoil = 0;
  private jabFlash = 0;
  private hookFlash = 0;
  private crowd: Circle[] = [];
  private ended = false;
  /** Seconds left in which a drained ball is re-served. */
  saveTimer = 0;

  constructor(game: Game) {
    super(game);
    const w = this.world;
    this.flipperColor = RED;
    poly(w, WALLS, { restitution: 0.4 });
    this.lower = buildLowerSection(w, CX, () => {
      this.game.addScore(1_010);
      sound.sling();
    });
    this.flipperL = this.lower.left;
    this.flipperR = this.lower.right;

    for (const [x, y] of POSTS) w.circle(x, y, 12, { restitution: 0.7 });
    for (const [x, y] of CROWD) {
      const c = w.circle(x, y, 22, {
        restitution: 0.6,
        kick: 650,
        kickThreshold: 10,
        onHit: () => {
          this.game.addScore(10_000);
          this.game.fx.sparks(c.x, c.y, SODIUM, 8, 350);
          sound.bumper();
        },
      });
      this.crowd.push(c);
    }

    w.seg(JAB[0][0], JAB[0][1], JAB[1][0], JAB[1][1], {
      restitution: 0.4,
      onHit: (h) => h.speed > 90 && this.hitSide('JAB'),
    });
    w.seg(HOOK[0][0], HOOK[0][1], HOOK[1][0], HOOK[1][1], {
      restitution: 0.4,
      onHit: (h) => h.speed > 90 && this.hitSide('HOOK'),
    });

    this.fighter = w.circle(CX, FIGHT_Y, 40, {
      restitution: 0.5,
      kick: 380,
      kickThreshold: 40,
      onHit: (h) => this.hitFighter(h.ball, h.speed),
    });

    const L = (l: Lamp) => this.lamps.push(l);
    L({ kind: 'rect', x: 92, y: 545, w: 14, h: 60, angle: -0.11, color: TEAL, label: '', state: () => (this.jabFlash > 0 ? 1 : 0) });
    L({ kind: 'rect', x: 508, y: 545, w: 14, h: 60, angle: 0.11, color: TEAL, label: '', state: () => (this.hookFlash > 0 ? 1 : 0) });
    for (let i = 0; i < 4; i++)
      L({
        kind: 'tri',
        x: CX - 54 + i * 36,
        y: 800,
        w: 28,
        h: 24,
        color: TEAL,
        state: () => (this.superMeter >= 4 ? 3 : i < this.superMeter ? 1 : 0),
      });
    L({ kind: 'arrow', x: CX, y: 520, w: 40, h: 54, color: RED, state: () => (this.state === 'telegraph' ? 3 : this.state === 'idle' ? 2 : 0) });
  }

  start(level: number) {
    this.level = level;
    this.def = FIGHTERS[level % FIGHTERS.length];
    const cycle = Math.floor(level / FIGHTERS.length);
    this.hp = this.def.hp + cycle * 4;
    this.playerHp = 3;
    this.superMeter = 0;
    this.state = 'intro';
    this.stateT = 1.6;
    this.attackTimer = this.def.attackEvery;
    this.fighter.x = CX;
    this.fighter.enabled = true;
    this.ended = false;
    this.world.balls = [];
    for (const z of this.world.zones) z.inside.clear();
    this.serve();
    this.saveTimer = 10;
    this.game.show(`ROUND ${level + 1}`, `VS ${this.def.name}`, 2, true);
  }

  get maxHp() {
    return this.def.hp + Math.floor(this.level / FIGHTERS.length) * 4;
  }

  /** Hold a ball at the top-left until the round starts (or briefly, on a save). */
  private serve() {
    const b = this.addBall(110, 255);
    b.captured = true;
  }

  private release() {
    for (const b of this.world.balls) {
      if (!b.captured) continue;
      b.captured = false;
      b.vx = 280;
      b.vy = 60;
    }
  }

  /** Re-serve a drained ball early in the fight. */
  trySave() {
    if (this.saveTimer <= 0 || this.state === 'ko' || this.state === 'lost') return false;
    this.saveTimer = 0;
    this.serve();
    this.serveT = 0.8;
    return true;
  }
  private serveT = 0;

  /** Ball drained mid-fight. Returns false if the fight was already over. */
  forfeit() {
    if (this.state === 'ko' || this.state === 'lost') return false;
    this.state = 'lost';
    this.ended = true;
    return true;
  }

  private hitSide(which: 'JAB' | 'HOOK') {
    if (this.state === 'ko' || this.state === 'lost') return;
    if (which === 'JAB') this.jabFlash = 0.4;
    else this.hookFlash = 0.4;
    this.game.addScore(25_000);
    sound.target();
    if (this.superMeter < 4) {
      this.superMeter++;
      if (this.superMeter === 4) {
        this.game.show('SUPER READY', 'HIT HIM!', 1.5);
        sound.award();
      }
    }
  }

  private hitFighter(b: Ball, speed: number) {
    const g = this.game;
    if (this.state === 'ko' || this.state === 'lost' || this.state === 'intro') return;
    if (this.invuln > 0 || speed < 120) return;
    let dmg = 1;
    let label = 'HIT';
    if (this.superMeter >= 4) {
      dmg = 3;
      this.superMeter = 0;
      label = 'SUPER PUNCH';
    }
    if (this.state === 'telegraph') {
      dmg *= 2;
      label = 'COUNTER!';
      this.attackTimer = this.def.attackEvery;
    }
    this.hp = Math.max(0, this.hp - dmg);
    this.invuln = 0.25;
    this.hitFlash = 0.2;
    this.recoil = 1;
    const pts = 50_000 * dmg * (this.level + 1);
    g.addScore(pts, this.fighter.x, FIGHT_Y - 70);
    g.fx.popup(this.fighter.x + (Math.random() - 0.5) * 60, FIGHT_Y - 20, label === 'HIT' ? `-${dmg}` : label, label === 'HIT' ? WHITE : '#ffe14d', label === 'HIT' ? 26 : 30);
    g.fx.sparks((b.x + this.fighter.x) / 2, (b.y + FIGHT_Y) / 2, WHITE, 16, 500);
    g.doShake(dmg > 1 ? 9 : 4);
    sound.punch(dmg > 1);
    if (dmg > 1) g.doFlash(WHITE, 0.35);

    if (this.hp <= 0) {
      this.state = 'ko';
      this.stateT = 2.4;
      this.fighter.enabled = false;
      const bonus = 1_000_000 * (this.level + 1);
      g.addScore(bonus);
      g.addBonus(50_000);
      g.show('K.O.!', `${this.def.name} DOWN  +${bonus.toLocaleString('en-US')}`, 2.6, true);
      g.slowmo(0.9);
      g.doFlash(WHITE, 0.8);
      sound.ko();
      // Freeze the ball so it doesn't drain during the celebration.
      for (const ball of this.world.balls) {
        ball.captured = true;
        ball.vx = ball.vy = 0;
      }
    } else {
      this.state = 'stagger';
      this.stateT = 0.45;
    }
  }

  private strike() {
    const g = this.game;
    this.playerHp--;
    sound.hurt();
    g.doShake(14);
    g.doFlash(RED, 0.55);
    g.fx.popup(CX, 700, 'OUCH!', RED, 34);
    for (const b of this.world.balls) {
      if (b.y < 800 && !b.captured) {
        b.vy = Math.max(b.vy, 0) + 900;
        b.vx += (Math.random() - 0.5) * 600;
      }
    }
    if (this.playerHp <= 0) {
      g.show('KNOCKED OUT', 'BACK TO THE FOUNDRY', 2.2, true);
      this.state = 'lost';
      this.stateT = 1.8;
      for (const b of this.world.balls) b.captured = true;
    } else {
      g.show('YOU GOT HIT', `${this.playerHp} HEALTH LEFT`, 1.4);
    }
  }

  override update(dt: number) {
    super.update(dt);
    if (this.jabFlash > 0) this.jabFlash -= dt;
    if (this.hookFlash > 0) this.hookFlash -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    this.recoil *= 1 - 8 * dt;
    this.stateT -= dt;
    if (this.state !== 'intro' && this.saveTimer > 0) this.saveTimer -= dt;
    if (this.serveT > 0) {
      this.serveT -= dt;
      if (this.serveT <= 0) this.release();
    }

    switch (this.state) {
      case 'intro':
        if (this.stateT <= 0) {
          this.state = 'idle';
          this.release();
        }
        break;
      case 'idle':
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
          this.state = 'telegraph';
          this.stateT = 1.5;
          sound.warn();
          this.game.show('INCOMING!', 'HIT HIM TO COUNTER', 1.5);
        }
        break;
      case 'telegraph':
        if (Math.floor(this.stateT * 6) !== Math.floor((this.stateT + dt) * 6)) sound.tick();
        if (this.stateT <= 0) {
          this.state = 'strike';
          this.stateT = 0.4;
          this.strike();
        }
        break;
      case 'strike':
        if (this.stateT <= 0 && this.playerHp > 0) {
          this.state = 'idle';
          this.attackTimer = this.def.attackEvery;
        }
        break;
      case 'stagger':
        if (this.stateT <= 0) this.state = this.attackTimer <= 0 ? 'telegraph' : 'idle';
        break;
      case 'ko':
        if (this.stateT <= 0 && !this.ended) {
          this.ended = true;
          this.game.exitPit(true);
        }
        break;
      case 'lost':
        if (this.stateT <= 0 && !this.ended) {
          this.ended = true;
          this.game.exitPit(false);
        }
        break;
    }
  }

  override substep(dt: number) {
    const f = this.fighter;
    const moving = this.state === 'idle' || this.state === 'telegraph';
    if (moving) {
      const sp = this.def.speed * (this.state === 'telegraph' ? 0.4 : 1);
      f.x += this.dir * sp * dt;
      if (f.x > 410) this.dir = -1;
      if (f.x < 190) this.dir = 1;
      f.vx = this.dir * sp;
    } else {
      f.vx = 0;
    }
  }

  /** Draw the fight HUD on the DMD. */
  drawDMD(d: DMD, score: number) {
    d.text('YOU', 1, 0);
    for (let i = 0; i < 3; i++) d.text('@', 20 + i * 7, 0, { level: i < this.playerHp ? 3 : 1 });
    d.text(this.def.name, 127, 0, { align: 'right' });
    d.bar(1, 9, 40, 5, this.playerHp / 3);
    d.bar(70, 9, 57, 5, this.hp / this.maxHp);
    d.text('VS', 56, 8, { align: 'center', level: 2 });
    d.fitText(score.toLocaleString('en-US'), 64, 17, 126, 2, { align: 'center' });
  }

  // ---------------------------------------------------------------- art

  protected override drawStatic(ctx: CanvasRenderingContext2D) {
    const R = rng(42);
    ctx.fillStyle = '#020203';
    ctx.fillRect(0, 0, TABLE_W, TABLE_H);
    this.drawBackWall(ctx);
    ctx.save();
    strokePath(ctx, WALLS, true);
    ctx.clip();

    // Wet concrete
    const bg = ctx.createRadialGradient(CX, 500, 50, CX, 600, 700);
    bg.addColorStop(0, '#2a2526');
    bg.addColorStop(1, '#0d0b0c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, TABLE_W, TABLE_H);
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '0,0,0'},${R() * 0.06})`;
      ctx.fillRect(R() * TABLE_W, R() * TABLE_H, 2 + R() * 3, 2 + R() * 3);
    }
    // Cracks
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 10; i++) {
      let x = R() * TABLE_W;
      let y = 200 + R() * 900;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (R() - 0.5) * 50;
        y += (R() - 0.3) * 40;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Puddles with neon reflections
    for (const [x, y, rx, ry, col] of [
      [150, 880, 70, 22, RED],
      [430, 460, 60, 18, SODIUM],
      [300, 980, 50, 14, TEAL],
    ] as [number, number, number, number, string][]) {
      ctx.fillStyle = 'rgba(5,6,10,0.75)';
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = withAlpha(col, 0.25);
      ctx.fillRect(x - rx * 0.6, y - ry, rx * 0.25, ry * 2);
      ctx.fillRect(x + rx * 0.1, y - ry, rx * 0.1, ry * 2);
      ctx.restore();
    }

    // Ring markings
    ctx.strokeStyle = withAlpha(WHITE, 0.16);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(CX, 560, 180, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = withAlpha(RED, 0.25);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(CX, 560, 168, 0, Math.PI * 2);
    ctx.stroke();

    // Graffiti
    ctx.save();
    ctx.translate(CX, 600);
    ctx.rotate(-0.12);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 92px "Arial Black", Impact, system-ui, sans-serif';
    ctx.fillStyle = withAlpha(RED, 0.18);
    ctx.fillText('THE PIT', 4, 4);
    ctx.shadowColor = RED;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = withAlpha(RED, 0.75);
    ctx.lineWidth = 3;
    ctx.strokeText('THE PIT', 0, 0);
    ctx.shadowBlur = 0;
    ctx.font = '700 16px "Courier New", monospace';
    ctx.fillStyle = withAlpha(SODIUM, 0.6);
    ctx.fillText('NO RULES · NO REFS · NO WAY OUT', 0, 62);
    ctx.restore();

    // Chain-link fence along the top
    ctx.strokeStyle = 'rgba(160,170,180,0.18)';
    ctx.lineWidth = 1.2;
    for (let x = -200; x < 800; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 175);
      ctx.lineTo(x + 105, 280);
      ctx.moveTo(x + 105, 175);
      ctx.lineTo(x, 280);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 175, TABLE_W, 105);
    // crowd silhouettes behind the fence
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    for (let x = 60; x < 560; x += 26 + R() * 10) {
      const h = 18 + R() * 16;
      ctx.beginPath();
      ctx.arc(x, 200 - h + 30, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - 11, 200 - h + 38, 22, 40);
    }

    // Sodium lights
    drawGlowStatic(ctx, 60, 340, 200, SODIUM, 0.25);
    drawGlowStatic(ctx, 540, 340, 200, SODIUM, 0.25);
    drawGlowStatic(ctx, CX, 200, 260, RED, 0.18);

    // Apron
    ctx.fillStyle = '#100c0d';
    ctx.beginPath();
    ctx.moveTo(42, 1110);
    ctx.lineTo(CX - 60, 1150);
    ctx.lineTo(CX + 60, 1150);
    ctx.lineTo(558, 1110);
    ctx.lineTo(558, 1200);
    ctx.lineTo(42, 1200);
    ctx.fill();
    ctx.fillStyle = withAlpha(RED, 0.8);
    ctx.font = '800 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('UNDERGROUND FIGHT CLUB', CX, 1182);
    ctx.fillStyle = withAlpha(TEAL, 0.6);
    ctx.fillText('JAB', 92, 490);
    ctx.fillText('HOOK', 508, 490);
    ctx.fillText('SUPER', CX, 776);
    ctx.restore();

    neonRail(ctx, WALLS, RED);
    for (const g of this.lower.guides) neonRail(ctx, g, SODIUM, 8);
    for (const s of this.lower.slings) rubber(ctx, s, true, RED);
    for (const [x, y] of POSTS) {
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = SODIUM;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    for (const seg of [JAB, HOOK]) {
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      strokePath(ctx, seg);
      ctx.stroke();
      ctx.strokeStyle = TEAL;
      ctx.lineWidth = 8;
      ctx.stroke();
    }
  }

  /** Brick wall above the cage, where the fight card hangs. */
  private drawBackWall(ctx: CanvasRenderingContext2D) {
    const R = rng(9);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(TABLE_W, 0);
    ctx.lineTo(TABLE_W, 330);
    ctx.lineTo(557.5, 330);
    ctx.lineTo(450, 175);
    ctx.lineTo(150, 175);
    ctx.lineTo(42.5, 330);
    ctx.lineTo(0, 330);
    ctx.closePath();
    ctx.clip();
    for (let row = 0; row * 22 < 340; row++) {
      for (let x = row % 2 ? -25 : 0; x < TABLE_W; x += 50) {
        const v = 18 + R() * 16;
        ctx.fillStyle = `rgb(${v + 22},${v * 0.55},${v * 0.5})`;
        ctx.fillRect(x + 1, row * 22 + 1, 48, 20);
      }
    }
    const shade = ctx.createLinearGradient(0, 0, 0, 330);
    shade.addColorStop(0, 'rgba(0,0,0,0.25)');
    shade.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, TABLE_W, 330);
    drawGlowStatic(ctx, CX, 90, 240, RED, 0.22);
    // Sign board
    ctx.fillStyle = 'rgba(5,5,8,0.85)';
    ctx.fillRect(110, 22, 380, 128);
    ctx.strokeStyle = '#2a1a1c';
    ctx.lineWidth = 4;
    ctx.strokeRect(110, 22, 380, 128);
    ctx.restore();
  }

  protected override drawDynamic(ctx: CanvasRenderingContext2D) {
    const t = this.time;
    // Fight card
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const flicker = Math.sin(t * 37) > 0.97 ? 0.4 : 1;
    ctx.globalAlpha = flicker;
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillStyle = SODIUM;
    ctx.fillText(`ROUND ${this.level + 1}  ·  TONIGHT ONLY`, CX, 44);
    ctx.font = '900 46px "Arial Black", Impact, system-ui, sans-serif';
    ctx.shadowColor = this.def.color;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = this.def.color;
    ctx.lineWidth = 2.5;
    ctx.strokeText(this.def.name, CX, 90);
    ctx.shadowBlur = 0;
    ctx.font = '700 14px "Courier New", monospace';
    ctx.fillStyle = withAlpha(WHITE, 0.75);
    ctx.fillText(this.def.title, CX, 130);
    ctx.restore();

    for (const c of this.crowd) {
      const hit = Math.max(0, 1 - c.lastHit / 0.18);
      ctx.fillStyle = '#1a1214';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hit > 0 ? WHITE : SODIUM;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = hit > 0 ? WHITE : '#5a2a10';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r - 8, 0, Math.PI * 2);
      ctx.fill();
      drawGlow(ctx, c.x, c.y, c.r * 2.5, SODIUM, 0.3 + hit);
    }
    if (this.jabFlash > 0) drawGlow(ctx, 67, 545, 60, TEAL, this.jabFlash * 2);
    if (this.hookFlash > 0) drawGlow(ctx, 533, 545, 60, TEAL, this.hookFlash * 2);
    this.drawPlayerHp(ctx, t);
  }

  protected override drawTop(ctx: CanvasRenderingContext2D) {
    this.drawFighter(ctx, this.time);
  }

  private drawPlayerHp(ctx: CanvasRenderingContext2D, t: number) {
    for (let i = 0; i < 3; i++) {
      const x = CX - 30 + i * 30;
      const y = 1132;
      const on = i < this.playerHp;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(0.9, 0.9);
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.bezierCurveTo(-16, -4, -8, -14, 0, -6);
      ctx.bezierCurveTo(8, -14, 16, -4, 0, 8);
      ctx.fillStyle = on ? RED : 'rgba(255,42,61,0.15)';
      ctx.fill();
      ctx.restore();
      if (on) drawGlow(ctx, x, y, 22, RED, 0.4 + 0.2 * Math.sin(t * 4 + i));
    }
  }

  private drawFighter(ctx: CanvasRenderingContext2D, t: number) {
    if (this.state === 'lost' && this.playerHp <= 0 && this.stateT < 0) return;
    const d = this.def;
    const f = this.fighter;
    const ko = this.state === 'ko';
    const tele = this.state === 'telegraph';
    const strike = this.state === 'strike';
    const bob = Math.sin(t * 8) * 3;
    const x = f.x + (Math.random() - 0.5) * this.recoil * 10;
    const y = FIGHT_Y - this.recoil * 14 + (ko ? Math.min(1, (2.4 - this.stateT) * 2) * 30 : 0);

    ctx.save();
    if (ko) ctx.globalAlpha = Math.max(0.25, this.stateT / 2.4);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(x + 8, FIGHT_Y + 34, 56, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(x, y);
    if (ko) ctx.rotate(Math.min(1.3, (2.4 - this.stateT) * 2.5) * (this.dir || 1) * 0.6);
    const flash = this.hitFlash > 0;
    // Torso
    ctx.fillStyle = flash ? WHITE : '#1d1a22';
    ctx.beginPath();
    ctx.moveTo(-50, -10 + bob);
    ctx.quadraticCurveTo(0, -36 + bob, 50, -10 + bob);
    ctx.lineTo(34, 36);
    ctx.lineTo(-34, 36);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = d.color;
    ctx.lineWidth = 3;
    ctx.stroke();
    // Neon tattoos / jacket seams
    ctx.strokeStyle = withAlpha(d.color, 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-30, -8 + bob);
    ctx.lineTo(-12, 20);
    ctx.moveTo(30, -8 + bob);
    ctx.lineTo(12, 20);
    ctx.stroke();
    // Head
    ctx.fillStyle = flash ? WHITE : d.skin;
    ctx.beginPath();
    ctx.arc(0, -34 + bob, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(0, -40 + bob, 20, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    // Visor
    ctx.fillStyle = tele ? '#ffffff' : d.color;
    ctx.fillRect(-15, -38 + bob, 30, 6);
    // Fists
    const fistY = tele ? -40 + Math.sin(t * 30) * 3 : strike ? 46 : -2 + Math.sin(t * 8 + 1) * 4;
    const fistX = strike ? 22 : 46;
    for (const s of [-1, 1]) {
      ctx.fillStyle = flash ? WHITE : d.color;
      ctx.beginPath();
      ctx.arc(s * fistX, fistY + bob, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (tele) drawGlow(ctx, s * fistX, fistY, 40, RED, 0.6);
    }
    ctx.restore();

    if (tele) drawGlow(ctx, x, y, 110, RED, 0.25 + 0.25 * Math.sin(t * 25));
    if (ko) return;
    // Health bar
    const bw = 96;
    const frac = this.hp / this.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x - bw / 2 - 2, FIGHT_Y - 90, bw + 4, 12);
    ctx.fillStyle = frac > 0.5 ? '#3dff6e' : frac > 0.25 ? '#ffd000' : RED;
    ctx.fillRect(x - bw / 2, FIGHT_Y - 88, bw * frac, 8);
    ctx.fillStyle = WHITE;
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.name, x, FIGHT_Y - 96);
    if (tele) {
      ctx.font = '900 30px "Arial Black", Impact, sans-serif';
      ctx.fillStyle = RED;
      ctx.fillText('!', x + 64, FIGHT_Y - 40);
    }
  }
}

function drawGlowStatic(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, withAlpha(col, a));
  g.addColorStop(1, withAlpha(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
