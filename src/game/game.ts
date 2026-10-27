import { STEP, type Ball } from '../engine/physics';
import { sound } from '../engine/audio';
import { DMD } from '../engine/dmd';
import { FX } from '../engine/fx';
import { Foundry } from './tables/foundry';
import { Pit } from './tables/pit';
import { TABLE_H, TABLE_W, type Table } from './tables/table';

export type GameState = 'attract' | 'play' | 'bonus' | 'over';

export const VIEW_W = TABLE_W;
export const DMD_H_PX = 150;
export const TABLE_Y = 160;
export const VIEW_H = TABLE_Y + TABLE_H;

const BALLS_PER_GAME = 3;
const BALL_SAVE_SECONDS = 12;
const HS_KEY = 'sz-pinball.neon-foundry.high';

interface Message {
  l1: string;
  l2: string;
  t: number;
  dur: number;
  big: boolean;
}

interface Transition {
  t: number;
  dur: number;
  down: boolean;
  mid: () => void;
  midDone: boolean;
}

const fmt = (n: number) => n.toLocaleString('en-US');
const short = (n: number) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`);

export class Game {
  fx = new FX();
  dmd = new DMD();
  main: Foundry;
  pit: Pit;
  active: Table;
  state: GameState = 'attract';
  paused = false;

  score = 0;
  lastScore = 0;
  ball = 1;
  extraBalls = 0;
  bonus = 0;
  bonusMult = 1;
  ballSave = 0;
  private ballSaveArmed = false;
  pitLevel = 0;
  tilted = false;
  private tiltMeter = 0;
  private nudgeCooldown = 0;

  shake = 0;
  flash = { color: '#ffffff', a: 0 };
  private slowT = 0;
  private acc = 0;
  private msg: Message | null = null;
  private transition: Transition | null = null;
  private launchQueue = 0;
  private launchDelay = 0;
  private autoLaunch: { ball: Ball; t: number }[] = [];
  private plungerHeld = false;
  private plungerPull = 0;
  private stateT = 0;
  private bonusTotal = 0;
  highScore = 0;
  private newHigh = false;
  time = 0;

  constructor() {
    this.main = new Foundry(this);
    this.pit = new Pit(this);
    this.active = this.main;
    this.main.attract = true;
    try {
      this.highScore = Number(localStorage.getItem(HS_KEY)) || 0;
    } catch {
      this.highScore = 0;
    }
  }

  // ------------------------------------------------------------ public API used by tables

  addScore(n: number, x?: number, y?: number) {
    if (this.state !== 'play' || this.tilted) return;
    this.score += n;
    if (x !== undefined && y !== undefined) this.fx.popup(x, y, short(n), '#ffffff', n >= 100_000 ? 24 : 18);
  }

  addBonus(n: number) {
    if (this.state === 'play' && !this.tilted) this.bonus += n;
  }

  show(l1: string, l2 = '', dur = 1.6, big = false) {
    this.msg = { l1, l2, t: 0, dur, big };
  }

  doShake(a: number) {
    this.shake = Math.max(this.shake, a);
  }

  doFlash(color: string, a: number) {
    this.flash = { color, a: Math.max(this.flash.a, a) };
  }

  slowmo(seconds: number) {
    this.slowT = seconds;
  }

  ballInShooter() {
    return this.main.world.balls.some((b) => this.main.inShooterLane(b));
  }

  queueLaunches(n: number) {
    this.launchQueue += n;
    this.launchDelay = Math.max(0, Math.min(this.launchDelay, 0.6));
  }

  canEnterPit() {
    return !this.main.multiball && !this.tilted && this.main.world.balls.length === 1 && this.launchQueue === 0 && this.autoLaunch.length === 0;
  }

  enterPit(ball: Ball) {
    sound.descend();
    this.show('DESCENDING', 'TO THE PIT', 1.6, true);
    this.startTransition(true, () => {
      this.main.removeBall(ball);
      this.pit.start(this.pitLevel);
      this.active = this.pit;
      this.dmd.color = [255, 60, 70];
      sound.playMusic('pit');
    });
  }

  exitPit(won: boolean) {
    sound.ascend();
    this.startTransition(false, () => {
      this.pit.world.balls = [];
      this.active = this.main;
      this.dmd.color = [255, 140, 26];
      sound.playMusic('main');
      if (won) {
        this.pitLevel++;
        if (this.pitLevel === 2) {
          this.extraBalls++;
          this.show('EXTRA BALL', 'EARNED IN THE PIT', 2.5, true);
          sound.award();
        } else {
          this.show('VICTORY', 'RETURNING TO THE FOUNDRY', 1.8);
        }
      } else {
        this.show('FIGHT LOST', 'LIGHT THE PIT AGAIN', 1.8);
      }
      this.main.spawnInScoop(1.4);
    });
  }

  // ------------------------------------------------------------ input

  start() {
    sound.unlock();
    if (this.state === 'attract' || (this.state === 'over' && this.stateT > 1.5)) this.startGame();
  }

  setFlipper(side: -1 | 1, down: boolean) {
    sound.unlock();
    const playing = this.state === 'play' && !this.tilted && !this.transition;
    const f = side < 0 ? this.active.flipperL : this.active.flipperR;
    if (down && !playing) return;
    if (down && !f.pressed) {
      sound.flipper();
      if (this.active === this.main) this.main.onFlipperPress(side);
    } else if (!down && f.pressed) {
      sound.flipperDown();
    }
    f.pressed = down;
  }

  setPlunger(down: boolean) {
    sound.unlock();
    if (this.state !== 'play') {
      if (down) this.start();
      return;
    }
    if (down) {
      this.plungerHeld = true;
    } else if (this.plungerHeld) {
      this.plungerHeld = false;
      this.fire(this.plungerPull);
      this.plungerPull = 0;
    }
  }

  nudge() {
    if (this.state !== 'play' || this.tilted || this.nudgeCooldown > 0 || this.transition) return;
    this.nudgeCooldown = 0.6;
    this.tiltMeter += 1;
    this.doShake(7);
    for (const b of this.active.world.balls) {
      if (b.captured || this.active.inShooterLane(b)) continue;
      b.vy -= 280;
      b.vx += (Math.random() - 0.5) * 260;
    }
    if (this.tiltMeter > 3.6) {
      this.tilted = true;
      this.flipperRelease();
      this.show('TILT', 'BALL LOST', 3, true);
      sound.drain();
    } else if (this.tiltMeter > 2.4) {
      this.show('DANGER', 'TILT WARNING', 1.2, true);
      sound.warn();
    }
  }

  togglePause() {
    if (this.state === 'play') this.paused = !this.paused;
  }

  // ------------------------------------------------------------ flow

  private startGame() {
    this.state = 'play';
    this.score = 0;
    this.ball = 1;
    this.extraBalls = 0;
    this.bonusMult = 1;
    this.pitLevel = 0;
    this.newHigh = false;
    this.main.attract = false;
    this.main.resetForGame();
    this.fx.particles = [];
    this.startBall();
    this.show('NEON FOUNDRY', 'BALL 1', 2);
  }

  private startBall() {
    this.state = 'play';
    this.active = this.main;
    this.dmd.color = [255, 140, 26];
    this.main.world.balls = [];
    this.pit.world.balls = [];
    this.bonus = 0;
    this.tilted = false;
    this.tiltMeter = 0;
    this.ballSave = 0;
    this.ballSaveArmed = true;
    this.launchQueue = 0;
    this.autoLaunch = [];
    this.main.resetForBall();
    this.main.multiball = false;
    this.flipperRelease();
    this.main.addBall(this.main.shooter!.x, this.main.shooter!.y);
    sound.playMusic('main');
  }

  private fire(pull: number) {
    let fired = false;
    for (const b of this.main.world.balls) {
      if (this.active === this.main && this.main.inShooterLane(b) && b.y > 1100 && b.speed < 80) {
        b.vy = -(1250 + pull * 2050);
        b.vx = 0;
        fired = true;
      }
    }
    if (fired) {
      sound.launch(pull);
      if (this.ballSaveArmed) {
        this.ballSaveArmed = false;
        this.ballSave = BALL_SAVE_SECONDS;
      }
    }
  }

  private flipperRelease() {
    for (const t of [this.main, this.pit]) {
      t.flipperL.pressed = false;
      t.flipperR.pressed = false;
    }
  }

  private onDrain(table: Table) {
    if (table === this.pit) {
      if (this.pit.trySave()) {
        this.show('SAVED', 'THE CROWD THROWS YOU BACK IN', 1.6);
        sound.ballSave();
      } else if (this.pit.forfeit()) {
        this.show('DOWN THE DRAIN', 'FIGHT LOST', 1.6);
        sound.drain();
        this.exitPit(false);
      }
      return;
    }
    const remaining = this.main.world.balls.length + this.launchQueue;
    if (!this.tilted && this.ballSave > 0) {
      this.show('BALL SAVED', '', 1.5, true);
      sound.ballSave();
      this.queueLaunches(1);
      return;
    }
    if (remaining === 0) {
      this.endBall();
    } else if (remaining === 1 && this.main.multiball) {
      this.main.endMultiball();
    }
  }

  private endBall() {
    this.main.endMultiball();
    this.state = 'bonus';
    this.stateT = 0;
    this.bonusTotal = this.tilted ? 0 : this.bonus * this.bonusMult;
    this.flipperRelease();
    sound.drain();
    sound.playMusic(null);
  }

  private afterBonus() {
    this.score += this.bonusTotal;
    if (this.extraBalls > 0) {
      this.extraBalls--;
      this.startBall();
      this.show('SHOOT AGAIN', `BALL ${this.ball}`, 2, true);
      return;
    }
    this.ball++;
    if (this.ball > BALLS_PER_GAME) {
      this.gameOver();
    } else {
      this.startBall();
      this.show(`BALL ${this.ball}`, '', 1.6);
    }
  }

  private gameOver() {
    this.state = 'over';
    this.stateT = 0;
    this.lastScore = this.score;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.newHigh = true;
      try {
        localStorage.setItem(HS_KEY, String(this.score));
      } catch {
        /* storage unavailable */
      }
      sound.jackpot();
    }
  }

  private startTransition(down: boolean, mid: () => void) {
    this.flipperRelease();
    this.transition = { t: 0, dur: 1.5, down, mid, midDone: false };
  }

  // ------------------------------------------------------------ update

  update(rawDt: number) {
    const dt = Math.min(rawDt, 0.05);
    this.time += dt;
    if (this.paused) return;

    this.shake *= Math.pow(0.004, dt);
    if (this.shake < 0.2) this.shake = 0;
    this.flash.a = Math.max(0, this.flash.a - dt * 2.2);
    if (this.msg) {
      this.msg.t += dt;
      if (this.msg.t > this.msg.dur) this.msg = null;
    }
    this.nudgeCooldown -= dt;
    this.tiltMeter = Math.max(0, this.tiltMeter - dt * 0.4);
    this.stateT += dt;

    let ts = 1;
    if (this.slowT > 0) {
      this.slowT -= dt;
      ts = 0.3;
    }
    const sdt = dt * ts;

    if (this.plungerHeld) this.plungerPull = Math.min(1, this.plungerPull + dt / 0.8);
    this.main.plungerPull = this.plungerPull;

    if (this.transition) {
      const tr = this.transition;
      tr.t += dt;
      if (!tr.midDone && tr.t >= tr.dur / 2) {
        tr.midDone = true;
        tr.mid();
      }
      if (tr.t >= tr.dur) this.transition = null;
    } else if (this.state === 'play' || this.state === 'bonus') {
      this.stepPhysics(sdt);
      this.updatePlay(dt);
    }

    this.active.update(sdt);
    this.fx.update(sdt);

    if (this.state === 'bonus' && this.stateT > 3) this.afterBonus();
    if (this.state === 'over' && this.stateT > 7) {
      this.state = 'attract';
      this.main.attract = true;
    }
  }

  private stepPhysics(dt: number) {
    const t = this.active;
    this.acc += dt;
    let n = 0;
    while (this.acc >= STEP && n < 40) {
      t.world.step(STEP);
      t.substep(STEP);
      this.acc -= STEP;
      n++;
    }
    if (n >= 40) this.acc = 0;

    const drained = t.world.balls.filter((b) => b.y > TABLE_H + 35 || b.x < -50 || b.x > TABLE_W + 50 || b.y < -100);
    for (const b of drained) {
      t.removeBall(b);
      this.onDrain(t);
    }
  }

  private updatePlay(dt: number) {
    if (this.state !== 'play') return;
    if (this.active === this.main && this.ballSave > 0 && !this.ballInShooter()) this.ballSave = Math.max(0, this.ballSave - dt);

    // Auto-plunger for multiball / ball saves.
    if (this.launchQueue > 0 && this.active === this.main) {
      this.launchDelay -= dt;
      const laneBusy = this.main.world.balls.some((b) => this.main.inShooterLane(b) && b.y > 1000);
      if (this.launchDelay <= 0 && !laneBusy) {
        this.launchQueue--;
        this.launchDelay = 1.0;
        const b = this.main.addBall(this.main.shooter!.x, this.main.shooter!.y);
        this.autoLaunch.push({ ball: b, t: 0.45 });
      }
    }
    for (const a of this.autoLaunch) {
      a.t -= dt;
      if (a.t <= 0) {
        a.ball.vy = -3150;
        sound.launch(0.9);
      }
    }
    this.autoLaunch = this.autoLaunch.filter((a) => a.t > 0);

    // Ball search: free stuck balls.
    for (const b of this.active.world.balls) {
      if (b.stillTime > 4 && !b.captured && !this.active.inShooterLane(b)) {
        b.stillTime = 0;
        b.vy = -700;
        b.vx = (Math.random() - 0.5) * 600;
        this.doShake(4);
      }
    }
  }

  // ------------------------------------------------------------ render

  render(ctx: CanvasRenderingContext2D, cw: number, ch: number, dpr: number) {
    const scale = Math.min(cw / VIEW_W, ch / VIEW_H);
    const ox = (cw - VIEW_W * scale) / 2;
    const oy = (ch - VIEW_H * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw * dpr, ch * dpr);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, ox * dpr, oy * dpr);
    const k = scale * dpr;

    // DMD
    ctx.fillStyle = '#0b0b0d';
    ctx.fillRect(0, 0, VIEW_W, DMD_H_PX);
    this.renderDMD();
    this.dmd.render(ctx, 8, 6, VIEW_W - 16, DMD_H_PX - 12, k);

    // Table
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, TABLE_Y, TABLE_W, TABLE_H);
    ctx.clip();
    const sx = (Math.random() - 0.5) * this.shake;
    const sy = (Math.random() - 0.5) * this.shake;
    ctx.translate(sx, TABLE_Y + sy);
    this.active.render(ctx, k);
    this.fx.draw(ctx);

    if (this.flash.a > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.flash.a * 0.5;
      ctx.fillStyle = this.flash.color;
      ctx.fillRect(-20, -20, TABLE_W + 40, TABLE_H + 40);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    if (this.transition) this.renderTransition(ctx);
    if (this.state === 'attract') this.renderAttract(ctx);
    if (this.paused) this.renderBanner(ctx, 'PAUSED', 'P / tap to resume');
    ctx.restore();
  }

  private renderTransition(ctx: CanvasRenderingContext2D) {
    const tr = this.transition!;
    const p = tr.t / tr.dur;
    const cover = p < 0.5 ? p * 2 : (1 - p) * 2; // 0 -> 1 -> 0
    const e = cover * cover * (3 - 2 * cover);
    const h = TABLE_H * e;
    ctx.fillStyle = '#050507';
    if (tr.down) ctx.fillRect(0, 0, TABLE_W, h);
    else ctx.fillRect(0, TABLE_H - h, TABLE_W, h);
    // grate bars
    ctx.fillStyle = '#1b1f26';
    for (let x = 10; x < TABLE_W; x += 40) {
      if (tr.down) ctx.fillRect(x, 0, 14, h);
      else ctx.fillRect(x, TABLE_H - h, 14, h);
    }
    ctx.fillStyle = tr.down ? '#ff2a3d' : '#00e5ff';
    ctx.fillRect(0, tr.down ? h - 6 : TABLE_H - h, TABLE_W, 6);
    if (e > 0.6) {
      ctx.globalAlpha = (e - 0.6) / 0.4;
      this.renderBanner(ctx, tr.down ? 'THE PIT' : 'THE FOUNDRY', tr.down ? 'UNDERGROUND FIGHT CLUB' : 'BACK TO THE SURFACE', true);
      ctx.globalAlpha = 1;
    }
  }

  private renderAttract(ctx: CanvasRenderingContext2D) {
    const a = 0.5 + 0.5 * Math.sin(this.time * 3);
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(0, 0, TABLE_W, TABLE_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 64px "Arial Black", Impact, system-ui, sans-serif';
    ctx.shadowColor = '#ff2bd6';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('NEON', TABLE_W / 2, 420);
    ctx.shadowColor = '#00e5ff';
    ctx.font = '900 54px "Arial Black", Impact, system-ui, sans-serif';
    ctx.fillText('FOUNDRY', TABLE_W / 2, 485);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.4 + a * 0.6;
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.fillStyle = '#ffd000';
    ctx.fillText('TAP OR PRESS ENTER TO PLAY', TABLE_W / 2, 600);
    ctx.globalAlpha = 1;
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.fillStyle = '#c9d4e0';
    const lines = [
      'FLIPPERS  ·  Z / ← / left Shift   and   / / → / right Shift',
      'PLUNGER  ·  hold Space or ↓, release to launch',
      'NUDGE  ·  X        MUTE  ·  M        PAUSE  ·  P',
      'TOUCH  ·  left / right half of the screen',
    ];
    lines.forEach((l, i) => ctx.fillText(l, TABLE_W / 2, 680 + i * 28));
  }

  private renderBanner(ctx: CanvasRenderingContext2D, title: string, sub: string, red = false) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 520, TABLE_W, 150);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 60px "Arial Black", Impact, system-ui, sans-serif';
    ctx.shadowColor = red ? '#ff2a3d' : '#00e5ff';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#fff';
    ctx.fillText(title, TABLE_W / 2, 575);
    ctx.shadowBlur = 0;
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillStyle = red ? '#ff9a2a' : '#c9d4e0';
    ctx.fillText(sub, TABLE_W / 2, 635);
  }

  private renderDMD() {
    const d = this.dmd;
    d.clear();
    const m = this.msg;
    if (m && this.state !== 'attract') {
      const inv = m.big && Math.floor(m.t * 8) % 2 === 0 && m.t < 0.8;
      if (inv) d.rect(0, 0, 128, 32, 1);
      if (m.big) d.rect(0, 0, 128, 32, 2, false);
      if (m.l2) {
        d.fitText(m.l1, 64, 2, 124, 2, { align: 'center' });
        d.fitText(m.l2, 64, 22, 124, 1, { align: 'center', level: 2 });
      } else {
        d.fitText(m.l1, 64, 9, 124, 2, { align: 'center' });
      }
      return;
    }
    if (this.state === 'attract') {
      const page = Math.floor(this.time / 3) % (this.lastScore ? 4 : 3);
      if (page === 0) {
        d.fitText('NEON FOUNDRY', 64, 3, 126, 2, { align: 'center' });
        d.text('SQUIDZOMBIE PINBALL', 64, 22, { align: 'center', level: 2 });
      } else if (page === 1) {
        d.fitText('PRESS START', 64, 3, 126, 2, { align: 'center' });
        d.text('TAP OR PRESS ENTER', 64, 22, { align: 'center', level: 2 });
      } else if (page === 2) {
        d.text('HIGH SCORE', 64, 2, { align: 'center', level: 2 });
        d.fitText(fmt(this.highScore), 64, 13, 124, 2, { align: 'center' });
      } else {
        d.text('LAST GAME', 64, 2, { align: 'center', level: 2 });
        d.fitText(fmt(this.lastScore), 64, 13, 124, 2, { align: 'center' });
      }
      return;
    }
    if (this.state === 'bonus') {
      d.text(this.tilted ? 'TILTED' : 'END OF BALL BONUS', 64, 1, { align: 'center', level: 2 });
      d.text(`${fmt(this.bonus)} X ${this.bonusMult}`, 64, 11, { align: 'center' });
      const shown = Math.floor(this.bonusTotal * Math.min(1, this.stateT / 1.8));
      d.fitText(fmt(shown), 64, 21, 124, 1, { align: 'center' });
      return;
    }
    if (this.state === 'over') {
      d.text(this.newHigh ? 'NEW HIGH SCORE!' : 'GAME OVER', 64, 2, { align: 'center', level: Math.floor(this.time * 4) % 2 ? 3 : 2 });
      d.fitText(fmt(this.score), 64, 13, 124, 2, { align: 'center' });
      return;
    }
    if (this.active === this.pit) {
      this.pit.drawDMD(d, this.score);
      return;
    }
    d.fitText(fmt(this.score), 64, 3, 126, 2, { align: 'center' });
    d.text(`BALL ${this.ball}`, 1, 24, { level: 2 });
    const f = this.main;
    const status = f.multiball
      ? `JP ${short(f.jackpot)}`
      : f.meltdownReady
        ? 'MELTDOWN'
        : f.pitLit
          ? 'PIT OPEN'
          : this.ballSave > 0 && !this.ballInShooter()
            ? 'SAVE'
            : `${this.bonusMult}X`;
    d.text(status, 127, 24, { align: 'right', level: 2 });
    if (this.ballInShooter()) d.text('LAUNCH', 64, 24, { align: 'center', level: Math.floor(this.time * 3) % 2 ? 3 : 1 });
  }
}
