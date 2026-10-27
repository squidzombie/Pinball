import { FLOOR, RAMP, LineSensor, ZoneSensor, type Ball, type Segment, type Circle } from '../../engine/physics';
import { sound } from '../../engine/audio';
import { drawGlow, withAlpha } from '../../engine/fx';
import type { Game } from '../game';
import { arc, buildLowerSection, offsetPath, poly, smooth, type LowerSection, type P } from './geom';
import { hazard, neonRail, rivet, rng, rubber, strokePath, type Lamp } from './draw';
import { Table, TABLE_H, TABLE_W } from './table';

const CYAN = '#00e5ff';
const MAGENTA = '#ff2bd6';
const AMBER = '#ff8c1a';
const YELLOW = '#ffd000';
const GREEN = '#00ff88';
const RED = '#ff3b30';

const CX = 277.5; // playfield center (plunger lane eats the right edge)
const SCOOP = { x: 405, y: 425 };
const LANE_X = [200, 255, 310, 365];
const BUMPERS: P[] = [
  [232, 252],
  [338, 242],
  [285, 334],
];

// Geometry shared by physics and art.
const OUTER: P[] = [[20, 1240], [20, 300], ...arc(300, 300, 280, Math.PI, Math.PI * 2, 56), [580, 1180], [535, 1180]];
const PLUNGER_WALL: P[] = [
  [535, 1240],
  [535, 300],
];
// One-way: normal (dy,-dx) points up-left, so balls only pass from the lane side.
const GATE: P[] = [
  [535, 300],
  [577, 262],
];
const RAMP_BASE: P[] = [
  [95, 612],
  [85, 690],
  [85, 300],
  [128, 390],
  [160, 455],
  [160, 612],
];
const RIGHT_INNER: P[] = [
  [470, 300],
  [470, 690],
  [478, 700],
];
// Kick balls leaving the orbits back into play (and keep them out of the outlanes).
const DEFLECT_L: P[] = [
  [20, 712],
  [56, 758],
];
const DEFLECT_R: P[] = [
  [535, 712],
  [499, 758],
];
const SCOOP_CUP = arc(SCOOP.x, SCOOP.y, 30, Math.PI * 1.08, Math.PI * 1.92, 10);
const RAMP_PATH: P[] = smooth(
  [
    [127.5, 612],
    [127.5, 470],
    [120, 410],
    [96, 372],
    [62, 352],
    [42, 372],
    [44, 420],
    [44, 760],
    [52, 830],
    [93, 885],
  ],
  2,
);
// Wide mouth that narrows as the ramp climbs.
const RAMP_WALLS = offsetPath(
  RAMP_PATH,
  RAMP_PATH.map(([x, y]) => (x > 90 && y < 700 ? 25 + Math.max(0, Math.min(1, (y - 520) / 92)) * 7.5 : 25)),
);
const DROP_Y = [566, 608, 650];

interface Drop {
  seg: Segment;
  down: boolean;
}

export class Foundry extends Table {
  lower: LowerSection;
  bumpers: Circle[] = [];
  drops: Drop[] = [];
  reactor!: Segment;

  lanes = [false, false, false];
  skillLane = 1;
  skillActive = false;
  skillTimer = 0;
  rampCount = 0;
  meltdownReady = false;
  multiball = false;
  jackpot = 500_000;
  jackpots = 0;
  superLit = false;
  pitLit = false;
  bumperHits = 0;
  bumperLevel = 0;
  comboTimer = 0;
  combo = 0;
  spinnerAngle = 0;
  spinnerVel = 0;
  private spinAccum = 0;
  reactorFlash = 0;
  scoopBall: Ball | null = null;
  private scoopTimer = 0;
  private scoopAction: (() => void) | null = null;
  private dropResetTimer = 0;
  private steamTimer = 0;
  plungerPull = 0;

  constructor(game: Game) {
    super(game);
    const w = this.world;
    this.flipperColor = CYAN;

    poly(w, OUTER, { restitution: 0.4 });
    poly(w, PLUNGER_WALL, { restitution: 0.3 });
    w.seg(GATE[0][0], GATE[0][1], GATE[1][0], GATE[1][1], { oneWay: true, restitution: 0.3 });
    poly(w, RAMP_BASE, { restitution: 0.4 });
    poly(w, RIGHT_INNER, { restitution: 0.4 });
    poly(w, DEFLECT_L, { restitution: 0.6 });
    poly(w, DEFLECT_R, { restitution: 0.6 });
    poly(w, SCOOP_CUP, { restitution: 0.2 });
    for (const x of LANE_X) w.seg(x, 100, x, 160, { restitution: 0.5 });

    // Ramp walls live on the ramp layer only.
    poly(w, RAMP_WALLS.left, { layers: RAMP, restitution: 0.3, friction: 0.02 });
    poly(w, RAMP_WALLS.right, { layers: RAMP, restitution: 0.3, friction: 0.02 });

    this.lower = buildLowerSection(w, CX, () => {
      this.game.addScore(1_010);
      sound.sling();
    });
    this.flipperL = this.lower.left;
    this.flipperR = this.lower.right;

    BUMPERS.forEach(([x, y]) => {
      const c = w.circle(x, y, 26, {
        restitution: 0.6,
        kick: 950,
        kickThreshold: 10,
        onHit: (h) => this.hitBumper(c, h.ball),
      });
      this.bumpers.push(c);
    });

    DROP_Y.forEach((y, i) => {
      const seg = w.seg(455, y, 455, y + 34, {
        restitution: 0.3,
        onHit: (h) => this.hitDrop(i, h.speed),
      });
      this.drops.push({ seg, down: false });
    });

    this.reactor = w.seg(255, 478, 310, 478, {
      restitution: 0.35,
      onHit: (h) => {
        if (h.speed > 90) this.hitReactor();
      },
    });
    w.circle(250, 478, 5, { restitution: 0.6 });
    w.circle(315, 478, 5, { restitution: 0.6 });

    // Sensors
    LANE_X.slice(0, 3).forEach((x, i) => {
      w.lineSensors.push(
        new LineSensor(x, 130, LANE_X[i + 1], 130, (b, dir) => {
          if (dir < 0) this.hitLane(i, b);
        }),
      );
    });
    w.lineSensors.push(new LineSensor(20, 330, 85, 330, (_b, dir) => dir > 0 && this.shot('leftOrbit')));
    w.lineSensors.push(new LineSensor(470, 330, 535, 330, (_b, dir) => dir > 0 && this.shot('rightOrbit')));
    w.lineSensors.push(
      new LineSensor(20, 480, 85, 480, (b) => {
        this.spinnerVel = Math.min(40, this.spinnerVel + b.speed / 120);
      }),
    );
    w.lineSensors.push(
      new LineSensor(95, 612, 160, 612, (b, dir) => {
        if (dir > 0) {
          b.layer = RAMP;
          b.tags.rampMade = 0;
        }
      }),
    );
    w.zones.push(new ZoneSensor(SCOOP.x, SCOOP.y, 18, (b) => this.enterScoop(b)));

    w.force = (b, dt) => {
      if (b.layer !== RAMP) return;
      if (b.x > 78 && b.y > 340 && b.y < 640) b.vy += 1500 * dt;
      else if (b.x < 78 && b.y > 400) b.vy += 500 * dt;
      if (!b.tags.rampMade && b.x < 70 && b.y > 470) {
        b.tags.rampMade = 1;
        this.shot('ramp');
      }
      if (b.y > 866 && b.x < 130) b.layer = FLOOR;
      else if (b.x > 90 && b.y > 618) b.layer = FLOOR;
    };

    this.shooter = { x: 557.5, y: 1165, minX: 536, maxX: 580, minY: 700 };
    this.buildLamps();
  }

  private buildLamps() {
    const L = (l: Lamp) => this.lamps.push(l);
    ['A', 'M', 'P'].forEach((label, i) =>
      L({
        kind: 'circle',
        x: (LANE_X[i] + LANE_X[i + 1]) / 2,
        y: 182,
        w: 24,
        color: CYAN,
        label,
        state: () => (this.lanes[i] ? 1 : this.skillActive && this.skillLane === i ? 3 : 0),
      }),
    );
    L({ kind: 'arrow', x: 52, y: 640, w: 30, h: 40, color: MAGENTA, state: () => (this.multiball ? 3 : this.comboTimer > 0 ? 2 : 0) });
    L({ kind: 'arrow', x: 127.5, y: 665, w: 30, h: 40, color: CYAN, state: () => (this.meltdownReady ? 3 : this.multiball ? 3 : 0) });
    for (let i = 0; i < 3; i++)
      L({ kind: 'circle', x: 110.5 + i * 17, y: 703, w: 11, color: CYAN, state: () => (this.meltdownReady || i < this.rampCount % 3 ? 1 : 0) });
    L({ kind: 'circle', x: 282, y: 520, w: 26, color: YELLOW, label: 'R', state: () => (this.reactorFlash > 0 ? 1 : 0) });
    L({
      kind: 'arrow',
      x: SCOOP.x,
      y: 490,
      w: 30,
      h: 40,
      color: RED,
      label: 'PIT',
      state: () => (this.superLit ? 3 : this.pitLit && !this.multiball ? 2 : 0),
    });
    L({ kind: 'arrow', x: 502, y: 640, w: 30, h: 40, color: MAGENTA, state: () => (this.multiball ? 3 : this.comboTimer > 0 ? 2 : 0) });
    DROP_Y.forEach((y, i) => L({ kind: 'rect', x: 436, y: y + 17, w: 8, h: 26, color: YELLOW, state: () => (this.drops[i].down ? 1 : 0) }));
    [2, 3, 4, 5, 6].forEach((n, i) =>
      L({ kind: 'circle', x: CX - 80 + i * 40, y: 800, w: 28, color: GREEN, label: `${n}X`, state: () => (this.game.bonusMult >= n ? 1 : 0) }),
    );
    L({
      kind: 'rect',
      x: CX,
      y: 1128,
      w: 96,
      h: 22,
      color: AMBER,
      label: 'SHOOT AGAIN',
      state: () => (this.game.ballSave > 0 ? (this.game.ballSave < 3 ? 3 : 2) : this.game.extraBalls > 0 ? 1 : 0),
    });
  }

  // ---------------------------------------------------------------- rules

  resetForBall() {
    this.skillLane = Math.floor(Math.random() * 3);
    this.skillActive = true;
    this.skillTimer = 0;
    this.combo = 0;
    this.comboTimer = 0;
  }

  resetForGame() {
    this.lanes = [false, false, false];
    this.rampCount = 0;
    this.meltdownReady = false;
    this.multiball = false;
    this.superLit = false;
    this.pitLit = false;
    this.bumperHits = 0;
    this.bumperLevel = 0;
    this.jackpot = 500_000;
    for (const d of this.drops) {
      d.down = false;
      d.seg.enabled = true;
    }
  }

  onFlipperPress(side: -1 | 1) {
    // Lane change, like a real table.
    const l = this.lanes;
    this.lanes = side < 0 ? [l[1], l[2], l[0]] : [l[2], l[0], l[1]];
    if (this.skillActive && this.game.ballInShooter()) this.skillLane = (this.skillLane + (side < 0 ? 2 : 1)) % 3;
  }

  private hitLane(i: number, b: Ball) {
    const g = this.game;
    if (this.skillActive) {
      this.skillActive = false;
      if (i === this.skillLane) {
        g.addScore(250_000, b.x, b.y);
        g.show('SKILL SHOT', '250,000', 2);
        sound.award();
        g.doFlash(CYAN, 0.35);
      }
    }
    if (!this.lanes[i]) {
      this.lanes[i] = true;
      g.addScore(10_000, b.x, b.y + 30);
      g.addBonus(1_000);
      sound.lane();
    } else {
      g.addScore(2_000);
    }
    if (this.lanes.every(Boolean)) {
      this.lanes = [false, false, false];
      if (g.bonusMult < 6) {
        g.bonusMult++;
        g.show('BONUS X' + g.bonusMult, 'AMP LANES COMPLETE', 1.6);
      } else {
        g.show('AMP MAXED', '100,000', 1.4);
      }
      g.addScore(100_000);
      sound.award();
    }
  }

  private hitBumper(c: Circle, b: Ball) {
    const g = this.game;
    this.skillActive = false;
    this.bumperHits++;
    g.addScore(5_000 + this.bumperLevel * 2_500);
    g.addBonus(200);
    g.fx.sparks(c.x - (c.x - b.x) * 0.5, c.y - (c.y - b.y) * 0.5, CYAN, 10, 450);
    g.doShake(2);
    sound.bumper();
    if (this.bumperHits % 30 === 0) {
      this.bumperLevel++;
      g.addScore(200_000);
      g.show('REACTOR OVERLOAD', 'BUMPERS UP', 1.6);
      g.doFlash(CYAN, 0.4);
      sound.award();
    }
  }

  private hitDrop(i: number, speed: number) {
    const d = this.drops[i];
    if (d.down || speed < 45) return;
    const g = this.game;
    d.down = true;
    d.seg.enabled = false;
    g.addScore(25_000, 440, DROP_Y[i] + 17);
    g.addBonus(2_000);
    g.fx.sparks(455, DROP_Y[i] + 17, YELLOW, 14, 350);
    sound.drop();
    if (this.drops.every((x) => x.down)) {
      g.addScore(100_000);
      if (!this.pitLit) {
        this.pitLit = true;
        g.show('THE PIT IS OPEN', 'SHOOT THE SCOOP', 2.2, true);
        sound.siren();
      } else {
        g.show('TARGETS COMPLETE', '100,000', 1.4);
        sound.award();
      }
      this.dropResetTimer = 1.5;
    }
  }

  private hitReactor() {
    const g = this.game;
    this.reactorFlash = 0.4;
    this.jackpot += 25_000;
    g.addScore(15_000, 282, 500);
    g.addBonus(1_000);
    g.fx.sparks(282, 478, YELLOW, 10, 300);
    sound.target();
  }

  private shot(kind: 'ramp' | 'leftOrbit' | 'rightOrbit' | 'scoop') {
    const g = this.game;
    this.skillActive = false;
    if (this.comboTimer > 0) {
      this.combo++;
      const val = this.combo * 50_000;
      g.addScore(val);
      g.show(`${this.combo + 1}-WAY COMBO`, val.toLocaleString('en-US'), 1.3);
    } else {
      this.combo = 0;
    }
    this.comboTimer = 3.5;

    if (kind === 'ramp') {
      g.addScore(75_000, 70, 420);
      g.addBonus(5_000);
      sound.ramp();
      if (this.multiball) {
        this.awardJackpot();
      } else if (this.meltdownReady) {
        this.startMultiball();
      } else {
        this.rampCount++;
        if (this.rampCount % 3 === 0) {
          this.meltdownReady = true;
          g.show('MELTDOWN READY', 'SHOOT THE RAMP', 2, true);
          sound.siren();
        } else if (this.combo === 0) {
          g.show('CONVEYOR RAMP', `${this.rampCount % 3} OF 3`, 1.2);
        }
      }
    } else if (kind === 'leftOrbit' || kind === 'rightOrbit') {
      g.addScore(50_000, kind === 'leftOrbit' ? 52 : 502, 360);
      g.addBonus(2_000);
      sound.orbit();
      if (this.multiball) this.awardJackpot();
    }
  }

  private startMultiball() {
    const g = this.game;
    this.meltdownReady = false;
    this.multiball = true;
    this.jackpots = 0;
    this.superLit = false;
    g.show('MELTDOWN', 'MULTIBALL', 3, true);
    g.doFlash(MAGENTA, 0.6);
    g.doShake(8);
    sound.siren();
    sound.playMusic('multiball');
    g.ballSave = Math.max(g.ballSave, 15);
    g.queueLaunches(2);
  }

  endMultiball() {
    if (!this.multiball) return;
    this.multiball = false;
    this.superLit = false;
    this.game.show('MULTIBALL OVER', `JACKPOT ${this.jackpot.toLocaleString('en-US')}`, 1.8);
    sound.playMusic('main');
  }

  private awardJackpot() {
    const g = this.game;
    g.addScore(this.jackpot);
    g.show('JACKPOT', this.jackpot.toLocaleString('en-US'), 2, true);
    g.doFlash(YELLOW, 0.6);
    g.doShake(6);
    sound.jackpot();
    this.jackpot += 100_000;
    this.jackpots++;
    if (this.jackpots >= 3 && !this.superLit) {
      this.superLit = true;
      g.show('SUPER JACKPOT', 'IS LIT AT THE SCOOP', 2.2, true);
    }
  }

  private enterScoop(b: Ball) {
    if (b.captured || this.scoopBall || (b.tags.scoopIgnore ?? 0) > this.time) return;
    if (b.speed > 2300) return;
    const g = this.game;
    b.captured = true;
    b.x = SCOOP.x;
    b.y = SCOOP.y;
    b.vx = b.vy = 0;
    this.scoopBall = b;
    sound.scoop();
    this.shot('scoop');

    if (this.multiball && this.superLit) {
      const v = this.jackpot * 3;
      g.addScore(v);
      g.show('SUPER JACKPOT', v.toLocaleString('en-US'), 2.5, true);
      g.doFlash(YELLOW, 0.9);
      g.doShake(12);
      sound.jackpot();
      this.superLit = false;
      this.jackpots = 0;
      this.holdScoop(1.5);
    } else if (this.pitLit && g.canEnterPit()) {
      this.pitLit = false;
      this.scoopBall = null;
      g.enterPit(b);
    } else {
      g.addScore(30_000, SCOOP.x, SCOOP.y - 40);
      this.holdScoop(0.9);
    }
  }

  private holdScoop(t: number, then?: () => void) {
    this.scoopTimer = t;
    this.scoopAction = then ?? null;
  }

  /** Put a ball in the scoop and kick it out shortly (returning from the Pit). */
  spawnInScoop(delay = 1.2) {
    const b = this.addBall(SCOOP.x, SCOOP.y);
    b.captured = true;
    this.scoopBall = b;
    this.holdScoop(delay);
    return b;
  }

  private ejectScoop() {
    const b = this.scoopBall;
    if (!b) return;
    this.scoopBall = null;
    b.captured = false;
    b.tags.scoopIgnore = this.time + 0.6;
    // Aim down toward the left flipper with a little randomness.
    const a = Math.atan2(530, -230) + (Math.random() - 0.5) * 0.12;
    b.vx = Math.cos(a) * 640;
    b.vy = Math.sin(a) * 640;
    b.y += 6;
    sound.eject();
    this.game.fx.sparks(SCOOP.x, SCOOP.y + 10, AMBER, 12, 300);
    this.game.doShake(3);
  }

  override update(dt: number) {
    super.update(dt);
    if (this.comboTimer > 0) this.comboTimer -= dt;
    if (this.reactorFlash > 0) this.reactorFlash -= dt;
    if (this.skillActive && !this.game.ballInShooter()) {
      this.skillTimer += dt;
      if (this.skillTimer > 4) this.skillActive = false;
    }
    if (this.scoopBall && this.scoopTimer > 0) {
      this.scoopTimer -= dt;
      if (this.scoopTimer <= 0) {
        const act = this.scoopAction;
        this.scoopAction = null;
        if (act) act();
        this.ejectScoop();
      }
    }
    if (this.dropResetTimer > 0) {
      this.dropResetTimer -= dt;
      if (this.dropResetTimer <= 0) {
        for (const d of this.drops) {
          d.down = false;
          d.seg.enabled = true;
        }
        sound.drop();
      }
    }
    // Spinner
    if (this.spinnerVel > 0.05) {
      this.spinnerAngle += this.spinnerVel * dt * Math.PI * 2;
      this.spinAccum += this.spinnerVel * dt;
      while (this.spinAccum >= 1) {
        this.spinAccum -= 1;
        this.game.addScore(2_500);
        sound.spinner();
      }
      this.spinnerVel *= 1 - 1.4 * dt;
    }
    // Ambient steam from the vents
    this.steamTimer -= dt;
    if (this.steamTimer <= 0) {
      this.steamTimer = 0.12;
      this.game.fx.steam(500, 1090, -0.3, -1);
      if (Math.random() < 0.5) this.game.fx.steam(55, 1090, 0.3, -1);
    }
  }

  // ---------------------------------------------------------------- art

  protected override drawStatic(ctx: CanvasRenderingContext2D) {
    const R = rng(7);
    ctx.fillStyle = '#030406';
    ctx.fillRect(0, 0, TABLE_W, TABLE_H);

    ctx.save();
    strokePath(ctx, OUTER);
    ctx.lineTo(20, 1240);
    ctx.clip();

    // Steel floor
    const bg = ctx.createLinearGradient(0, 0, 0, TABLE_H);
    bg.addColorStop(0, '#121821');
    bg.addColorStop(0.5, '#0c1118');
    bg.addColorStop(1, '#090c11');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, TABLE_W, TABLE_H);

    // Brushed metal streaks
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#9fb3c8';
    for (let i = 0; i < 260; i++) {
      const y = R() * TABLE_H;
      const x = R() * TABLE_W;
      ctx.lineWidth = R() * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 40 + R() * 120, y + (R() - 0.5) * 3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Plates with seams and rivets
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 2;
    for (let y = 0; y < TABLE_H; y += 150)
      for (let x = (y / 150) % 2 ? -60 : 0; x < TABLE_W; x += 120) {
        ctx.strokeRect(x, y, 120, 150);
        ctx.strokeStyle = 'rgba(140,170,200,0.06)';
        ctx.strokeRect(x + 2, y + 2, 116, 146);
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        rivet(ctx, x + 8, y + 8, 2.5);
        rivet(ctx, x + 112, y + 8, 2.5);
        rivet(ctx, x + 8, y + 142, 2.5);
        rivet(ctx, x + 112, y + 142, 2.5);
      }

    // Circuit traces
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 26; i++) {
      let x = 40 + R() * 480;
      let y = 200 + R() * 850;
      const col = R() < 0.5 ? CYAN : MAGENTA;
      ctx.strokeStyle = withAlpha(col, 0.13);
      ctx.fillStyle = withAlpha(col, 0.3);
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        const len = 20 + R() * 60;
        const dir = Math.floor(R() * 4);
        if (dir === 0) x += len;
        else if (dir === 1) x -= len;
        else if (dir === 2) y += len;
        else {
          x += len * 0.7;
          y -= len * 0.7;
        }
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Reactor decal under the bumpers
    ctx.save();
    ctx.translate(285, 278);
    for (let r = 130; r > 20; r -= 22) {
      ctx.strokeStyle = withAlpha(CYAN, 0.05 + (130 - r) / 1400);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = withAlpha(YELLOW, 0.08);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 120, i * ((Math.PI * 2) / 3) - 0.5, i * ((Math.PI * 2) / 3) + 0.5);
      ctx.fill();
    }
    ctx.restore();

    // Logo
    ctx.save();
    ctx.translate(CX + 10, 655);
    ctx.rotate(-0.08);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 64px "Arial Black", Impact, system-ui, sans-serif';
    ctx.shadowColor = MAGENTA;
    ctx.shadowBlur = 24;
    ctx.strokeStyle = MAGENTA;
    ctx.lineWidth = 3;
    ctx.strokeText('NEON', 0, -34);
    ctx.shadowColor = CYAN;
    ctx.font = '900 46px "Arial Black", Impact, system-ui, sans-serif';
    ctx.strokeStyle = CYAN;
    ctx.strokeText('FOUNDRY', 0, 22);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillText('FOUNDRY', 0, 22);
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillStyle = withAlpha(AMBER, 0.7);
    ctx.fillText('SECTOR 9 · HEAVY INDUSTRY · NO EXIT', 0, 62);
    ctx.restore();

    // Inlane/outlane floor markings
    ctx.fillStyle = withAlpha(RED, 0.18);
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(48, 1010);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('DANGER', 0, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(507, 1010);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('DANGER', 0, 0);
    ctx.restore();

    // Apron
    const ap = ctx.createLinearGradient(0, 1100, 0, 1200);
    ap.addColorStop(0, '#1a2029');
    ap.addColorStop(1, '#0b0e13');
    ctx.fillStyle = ap;
    ctx.beginPath();
    ctx.moveTo(20, 1110);
    ctx.lineTo(CX - 60, 1150);
    ctx.lineTo(CX + 60, 1150);
    ctx.lineTo(535, 1110);
    ctx.lineTo(535, 1200);
    ctx.lineTo(20, 1200);
    ctx.fill();
    hazard(ctx, 20, 1176, 515, 24);
    ctx.fillStyle = '#c9d4e0';
    ctx.font = '800 11px system-ui, sans-serif';
    ctx.fillText('SQUIDZOMBIE PINBALL', 112, 1160);
    ctx.fillText('NEON FOUNDRY', 445, 1160);

    // Steam vents
    for (const vx of [55, 500]) {
      ctx.fillStyle = '#05070a';
      ctx.fillRect(vx - 18, 1092, 36, 10);
      ctx.strokeStyle = '#4a5666';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(vx - 15 + i * 7.5, 1093);
        ctx.lineTo(vx - 15 + i * 7.5, 1101);
        ctx.stroke();
      }
    }

    // Plunger lane
    ctx.fillStyle = '#07090c';
    ctx.fillRect(535, 300, 45, 880);
    hazard(ctx, 538, 1060, 40, 110, 12);
    ctx.save();
    ctx.translate(558, 780);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = withAlpha(CYAN, 0.35);
    ctx.font = '800 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('L A U N C H', 0, 6);
    ctx.restore();

    // Ramp base shadow + scoop
    ctx.fillStyle = '#05070a';
    strokePath(ctx, RAMP_BASE, true);
    ctx.fill();

    const sg = ctx.createRadialGradient(SCOOP.x, SCOOP.y, 2, SCOOP.x, SCOOP.y, 22);
    sg.addColorStop(0, '#000');
    sg.addColorStop(0.75, '#05070a');
    sg.addColorStop(1, '#3a2010');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(SCOOP.x, SCOOP.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3e4652';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(SCOOP.x + i * 7, SCOOP.y - 18);
      ctx.lineTo(SCOOP.x + i * 7, SCOOP.y + 18);
      ctx.stroke();
    }
    ctx.restore();

    // Walls
    neonRail(ctx, OUTER, CYAN);
    neonRail(ctx, PLUNGER_WALL, CYAN);
    neonRail(ctx, GATE, AMBER, 5);
    neonRail(ctx, RAMP_BASE, MAGENTA, 9, true);
    neonRail(ctx, RIGHT_INNER, MAGENTA);
    neonRail(ctx, DEFLECT_L, AMBER, 7);
    neonRail(ctx, DEFLECT_R, AMBER, 7);
    neonRail(ctx, SCOOP_CUP, AMBER, 7);
    for (const x of LANE_X)
      neonRail(
        ctx,
        [
          [x, 100],
          [x, 160],
        ],
        CYAN,
        7,
      );
    for (const g of this.lower.guides) neonRail(ctx, g, CYAN, 8);
    for (const s of this.lower.slings) rubber(ctx, s, true, AMBER);

    // Shooter lane floor
    ctx.fillStyle = '#20262e';
    ctx.fillRect(535, 1180, 45, 8);
  }

  protected override drawRamps(ctx: CanvasRenderingContext2D) {
    const { left, right } = RAMP_WALLS;
    const body: P[] = [...left, ...[...right].reverse()];
    ctx.save();
    // drop shadow
    ctx.translate(6, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    strokePath(ctx, body, true);
    ctx.fill();
    ctx.restore();

    ctx.save();
    strokePath(ctx, body, true);
    const g = ctx.createLinearGradient(0, 340, 0, 900);
    g.addColorStop(0, withAlpha(CYAN, 0.28));
    g.addColorStop(1, withAlpha(CYAN, 0.14));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    // chevrons along the path
    ctx.strokeStyle = withAlpha('#ffffff', 0.18);
    ctx.lineWidth = 3;
    for (let i = 3; i < RAMP_PATH.length - 2; i += 3) {
      const [x, y] = RAMP_PATH[i];
      const [x2, y2] = RAMP_PATH[i + 1];
      const a = Math.atan2(y2 - y, x2 - x);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(-6, -12);
      ctx.lineTo(4, 0);
      ctx.lineTo(-6, 12);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    neonRail(ctx, left, CYAN, 6);
    neonRail(ctx, right, CYAN, 6);
    // flap at the entrance
    ctx.fillStyle = '#3a4452';
    ctx.fillRect(95, 608, 65, 6);
    ctx.fillStyle = CYAN;
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(44, 600);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = withAlpha('#ffffff', 0.5);
    ctx.fillText('CONVEYOR', 0, 4);
    ctx.restore();
    return true;
  }

  protected override drawDynamic(ctx: CanvasRenderingContext2D) {
    const t = this.time;

    // Bumpers
    for (const c of this.bumpers) {
      const hit = Math.max(0, 1 - c.lastHit / 0.18);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(c.x + 4, c.y + 6, c.r + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c232d';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = hit > 0 ? '#ffffff' : CYAN;
      ctx.stroke();
      const cg = ctx.createRadialGradient(c.x - 6, c.y - 6, 2, c.x, c.y, c.r);
      cg.addColorStop(0, hit > 0 ? '#ffffff' : '#c8faff');
      cg.addColorStop(0.5, hit > 0 ? CYAN : '#1690a8');
      cg.addColorStop(1, '#0a2a33');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r - 6, 0, Math.PI * 2);
      ctx.fill();
      // hazard ring
      ctx.strokeStyle = withAlpha(YELLOW, 0.8);
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = t * 20;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r - 1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      drawGlow(ctx, c.x, c.y, c.r * (2 + hit * 2), CYAN, 0.35 + hit * 0.8 + Math.sin(t * 3 + c.x) * 0.08);
      if (hit > 0) {
        ctx.strokeStyle = withAlpha('#ffffff', hit * 0.8);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r + 10 + (1 - hit) * 26, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Drop targets
    this.drops.forEach((d, i) => {
      const y = DROP_Y[i];
      if (d.down) {
        ctx.fillStyle = '#05070a';
        ctx.fillRect(452, y, 8, 34);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(452, y + 4, 14, 34);
        ctx.fillStyle = YELLOW;
        ctx.fillRect(447, y, 12, 34);
        hazard(ctx, 447, y + 12, 12, 10, 4);
        drawGlow(ctx, 450, y + 17, 26, YELLOW, 0.25);
      }
    });

    // Reactor standup
    const rf = Math.max(0, this.reactorFlash / 0.4);
    ctx.fillStyle = rf > 0 ? '#ffffff' : YELLOW;
    ctx.fillRect(256, 471, 53, 10);
    ctx.fillStyle = '#111';
    ctx.font = '900 8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('REACTOR', 282.5, 479);
    drawGlow(ctx, 282, 476, 40 + rf * 30, YELLOW, 0.3 + rf);

    // Spinner
    const sw = Math.abs(Math.cos(this.spinnerAngle));
    ctx.fillStyle = '#2a323d';
    ctx.fillRect(22, 476, 61, 8);
    ctx.fillStyle = sw > 0.5 ? '#d8e2ee' : '#7a8696';
    ctx.fillRect(24, 480 - 9 * sw, 57, 18 * sw + 1);
    ctx.fillStyle = MAGENTA;
    ctx.fillRect(24, 479, 57, 2);

    // Scoop light
    if (this.pitLit || this.superLit) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 6);
      drawGlow(ctx, SCOOP.x, SCOOP.y, 50, this.superLit ? YELLOW : RED, 0.4 + pulse * 0.5);
    }

    // Plunger
    const py = 1180 + this.plungerPull * 50;
    ctx.fillStyle = '#5a6676';
    ctx.fillRect(552, py - 2, 11, 8);
    ctx.strokeStyle = '#8a97a6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const coils = 7;
    for (let i = 0; i <= coils * 2; i++) {
      const yy = py + 6 + (i / (coils * 2)) * (1236 - py - 6);
      ctx.lineTo(i % 2 ? 562 : 553, yy);
    }
    ctx.stroke();
  }

  get plungerTop() {
    return 1180 + this.plungerPull * 50;
  }
}
