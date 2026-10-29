// Fully synthesized SFX + a tiny step sequencer for music. No audio files needed.

type Wave = OscillatorType;

interface Track {
  bpm: number;
  bass: (number | null)[]; // midi notes per 16th, null = rest
  lead?: (number | null)[];
  kick: string; // 'x' = hit, per 16th
  snare: string;
  hat: string;
  drive: number; // bass distortion amount
  cutoff: number;
}

const TRACKS: Record<string, Track> = {
  main: {
    bpm: 112,
    bass: [28, null, 28, 40, null, 28, 31, null, 28, null, 28, 40, null, 33, 31, null],
    lead: [null, null, null, null, 64, null, null, 67, null, null, 71, null, null, 69, null, null],
    kick: 'x...x...x...x...',
    snare: '....x.......x...',
    hat: '..x...x...x...x.',
    drive: 8,
    cutoff: 520,
  },
  multiball: {
    bpm: 128,
    bass: [28, 28, 40, 28, 31, 31, 43, 31, 26, 26, 38, 26, 33, 33, 45, 35],
    lead: [64, null, 67, 71, 76, null, 71, 67, 62, null, 66, 69, 74, null, 69, 66],
    kick: 'x...x...x...x...',
    snare: '....x.......x.x.',
    hat: 'x.xxx.xxx.xxx.xx',
    drive: 14,
    cutoff: 900,
  },
  mode: {
    bpm: 120,
    bass: [26, null, 26, 26, 38, null, 26, null, 29, null, 29, 41, null, 31, 33, null],
    lead: [null, null, 62, null, null, 65, null, null, 69, null, 68, null, 65, null, null, null],
    kick: 'x...x...x...x...',
    snare: '....x.......x..x',
    hat: 'x.x.x.x.x.x.x.xx',
    drive: 18,
    cutoff: 700,
  },
  blackout: {
    bpm: 96,
    bass: [24, null, null, null, null, null, 24, null, 27, null, null, null, 26, null, null, null],
    kick: 'x.......x..x....',
    snare: '........x.......',
    hat: '..x...x...x...x.',
    drive: 4,
    cutoff: 300,
  },
  wizard: {
    bpm: 144,
    bass: [28, 28, 40, 28, 31, 31, 43, 31, 33, 33, 45, 33, 35, 35, 47, 38],
    lead: [76, 74, 71, 74, 76, null, 79, 76, 81, null, 79, 76, 74, null, 71, 69],
    kick: 'x.x.x.x.x.x.x.x.',
    snare: '....x.......x...',
    hat: 'xxxxxxxxxxxxxxxx',
    drive: 30,
    cutoff: 1400,
  },
  pit: {
    bpm: 140,
    bass: [33, null, 33, 33, 45, null, 33, null, 36, null, 36, 48, null, 34, 35, null],
    lead: [null, null, null, null, null, null, null, null, 69, 72, 69, null, 68, null, null, null],
    kick: 'x..x..x...x..x..',
    snare: '....x.......x...',
    hat: 'xxxxxxxxxxxxxxxx',
    drive: 30,
    cutoff: 1100,
  },
};

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class Sound {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private music!: GainNode;
  private noiseBuf!: AudioBuffer;
  muted = false;
  private track: Track | null = null;
  private trackName = '';
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(ctx.destination);
      this.sfx = ctx.createGain();
      this.sfx.gain.value = 0.9;
      this.sfx.connect(this.master);
      this.music = ctx.createGain();
      this.music.gain.value = 0.32;
      this.music.connect(this.master);
      const len = ctx.sampleRate;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.02);
  }

  private tone(freq: number, dur: number, type: Wave, vol: number, slideTo?: number, delay = 0, dest?: AudioNode) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest ?? this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, freq: number, type: BiquadFilterType = 'bandpass', q = 1, delay = 0, dest?: AudioNode) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest ?? this.sfx);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  flipper() {
    this.noise(0.05, 0.35, 2400, 'bandpass', 0.8);
    this.tone(110, 0.07, 'square', 0.12, 45);
  }
  flipperDown() {
    this.noise(0.03, 0.12, 1400, 'bandpass', 1);
  }
  bumper() {
    this.tone(180 + Math.random() * 30, 0.14, 'square', 0.16, 720);
    this.noise(0.08, 0.3, 3000, 'highpass', 0.7);
  }
  sling() {
    this.tone(260, 0.08, 'sawtooth', 0.12, 120);
    this.noise(0.05, 0.25, 1800, 'bandpass', 1);
  }
  wall(speed: number) {
    const v = Math.min(0.18, speed / 9000);
    if (v > 0.02) this.noise(0.04, v, 900, 'bandpass', 2);
  }
  target() {
    this.tone(880, 0.08, 'square', 0.1, 660);
    this.noise(0.04, 0.2, 2600, 'bandpass', 2);
  }
  drop() {
    this.tone(140, 0.18, 'sawtooth', 0.16, 50);
    this.noise(0.12, 0.25, 600, 'lowpass', 1);
  }
  lane() {
    this.tone(1320, 0.1, 'triangle', 0.12);
    this.tone(1760, 0.12, 'triangle', 0.1, undefined, 0.06);
  }
  spinner() {
    this.tone(2200 + Math.random() * 300, 0.03, 'square', 0.04);
  }
  ramp() {
    for (let i = 0; i < 5; i++) this.tone(440 * Math.pow(1.26, i), 0.09, 'square', 0.08, undefined, i * 0.05);
  }
  orbit() {
    this.tone(300, 0.35, 'sawtooth', 0.1, 1400);
  }
  scoop() {
    this.tone(90, 0.3, 'sine', 0.3, 40);
    this.noise(0.25, 0.2, 400, 'lowpass', 1);
  }
  eject() {
    this.noise(0.08, 0.35, 900, 'bandpass', 1);
    this.tone(70, 0.12, 'sine', 0.3, 40);
  }
  launch(power: number) {
    this.noise(0.15, 0.2 + power * 0.3, 700, 'bandpass', 0.7);
    this.tone(60, 0.2, 'sine', 0.3, 30);
  }
  plungerPull() {
    this.noise(0.05, 0.06, 4000, 'highpass', 1);
  }
  drain() {
    this.tone(220, 0.9, 'sawtooth', 0.14, 40);
    this.tone(110, 0.9, 'square', 0.08, 30);
  }
  ballSave() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, 'square', 0.08, undefined, i * 0.07));
  }
  award() {
    [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.15, 'square', 0.09, undefined, i * 0.06));
  }
  jackpot() {
    for (let i = 0; i < 8; i++) this.tone(523 * Math.pow(1.122, i), 0.12, 'sawtooth', 0.09, undefined, i * 0.05);
    this.noise(0.6, 0.2, 5000, 'highpass', 0.5, 0.35);
  }
  siren() {
    for (let i = 0; i < 4; i++) this.tone(500, 0.28, 'sawtooth', 0.09, 1100, i * 0.3);
  }
  punch(big = false) {
    this.noise(0.12, big ? 0.6 : 0.4, 300, 'lowpass', 1);
    this.tone(big ? 70 : 110, 0.18, 'sine', 0.45, 35);
    this.noise(0.05, 0.3, 3500, 'highpass', 1);
  }
  hurt() {
    this.tone(160, 0.35, 'sawtooth', 0.18, 50);
    this.noise(0.3, 0.3, 500, 'lowpass', 1);
  }
  warn() {
    this.tone(880, 0.1, 'square', 0.08);
    this.tone(660, 0.1, 'square', 0.08, undefined, 0.12);
  }
  ko() {
    this.punch(true);
    for (let i = 0; i < 3; i++) this.tone(196, 0.5, 'square', 0.08, 98, 0.15 + i * 0.12);
  }
  descend() {
    this.tone(600, 1.0, 'sawtooth', 0.1, 60);
    this.noise(1.0, 0.18, 300, 'lowpass', 1);
  }
  ascend() {
    this.tone(80, 0.9, 'sawtooth', 0.1, 700);
  }
  modeStart() {
    this.tone(55, 0.6, 'sawtooth', 0.22, 40);
    this.noise(0.5, 0.3, 200, 'lowpass', 1);
    [196, 247, 294, 392].forEach((f, i) => this.tone(f, 0.18, 'square', 0.08, undefined, 0.15 + i * 0.09));
  }
  modeEnd(completed: boolean) {
    if (completed) [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.16, 'square', 0.08, undefined, i * 0.07));
    else [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.2, 'sawtooth', 0.08, undefined, i * 0.1));
  }
  tick() {
    this.tone(1500, 0.03, 'square', 0.05);
  }

  playMusic(name: string | null) {
    if (name === this.trackName) return;
    this.trackName = name ?? '';
    this.track = name ? TRACKS[name] : null;
    this.step = 0;
    if (!this.ctx) return;
    this.nextTime = this.ctx.currentTime + 0.05;
    if (this.track && this.timer === null) {
      this.timer = window.setInterval(() => this.schedule(), 40);
    } else if (!this.track && this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private schedule() {
    const ctx = this.ctx;
    const tr = this.track;
    if (!ctx || !tr) return;
    const stepDur = 60 / tr.bpm / 4;
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.02;
    while (this.nextTime < ctx.currentTime + 0.15) {
      const i = this.step % 16;
      const when = this.nextTime - ctx.currentTime;
      const bn = tr.bass[i];
      if (bn !== null) this.bassNote(mtof(bn), stepDur * 1.6, when, tr);
      const ln = tr.lead?.[i];
      if (ln != null && Math.floor(this.step / 16) % 2 === 1) this.tone(mtof(ln), stepDur * 1.8, 'square', 0.035, undefined, when, this.music);
      if (tr.kick[i] === 'x') this.tone(150, 0.16, 'sine', 0.55, 40, when, this.music);
      if (tr.snare[i] === 'x') this.noise(0.14, 0.28, 1800, 'bandpass', 0.6, when, this.music);
      if (tr.hat[i] === 'x') this.noise(0.03, 0.08, 8000, 'highpass', 1, when, this.music);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private bassNote(freq: number, dur: number, delay: number, tr: Track) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    const ws = ctx.createWaveShaper();
    ws.curve = driveCurve(tr.drive);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 6;
    f.frequency.setValueAtTime(tr.cutoff * 2.2, t);
    f.frequency.exponentialRampToValueAtTime(tr.cutoff * 0.5, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(ws).connect(f).connect(g).connect(this.music);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}

const curves = new Map<number, Float32Array<ArrayBuffer>>();
function driveCurve(k: number) {
  let c = curves.get(k);
  if (!c) {
    c = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * 2 - 1;
      c[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    curves.set(k, c);
  }
  return c;
}

export const sound = new Sound();
