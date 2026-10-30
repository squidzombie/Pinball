// 128x32 dot-matrix display, the classic pinball score screen.

export const DMD_W = 128;
export const DMD_H = 32;

const G: Record<string, string> = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
  B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.###.|#...#|#....|#....|#....|#...#|.###.',
  D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####',
  F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.####',
  H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '###|.#.|.#.|.#.|.#.|.#.|###',
  J: '..###|...#.|...#.|...#.|#..#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
  L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
  N: '#...#|#...#|##..#|#.#.#|#..##|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
  R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.',
  T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.',
  X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
  Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  '0': '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
  '1': '.#.|##.|.#.|.#.|.#.|.#.|###',
  '2': '.###.|#...#|....#|...#.|..#..|.#...|#####',
  '3': '####.|....#|....#|.###.|....#|....#|####.',
  '4': '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
  '5': '#####|#....|####.|....#|....#|#...#|.###.',
  '6': '..##.|.#...|#....|####.|#...#|#...#|.###.',
  '7': '#####|....#|...#.|..#..|.#...|.#...|.#...',
  '8': '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  '9': '.###.|#...#|#...#|.####|....#|...#.|.##..',
  ' ': '...|...|...|...|...|...|...',
  '!': '#|#|#|#|#|.|#',
  '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
  '.': '.|.|.|.|.|.|#',
  ',': '..|..|..|..|..|.#|#.',
  ':': '.|#|.|.|.|#|.',
  '-': '....|....|....|####|....|....|....',
  '+': '.....|..#..|..#..|#####|..#..|..#..|.....',
  "'": '#|#|.|.|.|.|.',
  '/': '....#|....#|...#.|..#..|.#...|#....|#....',
  '>': '.#...|..#..|...#.|....#|...#.|..#..|.#...',
  '<': '...#.|..#..|.#...|#....|.#...|..#..|...#.',
  '*': '.....|#.#.#|.###.|#####|.###.|#.#.#|.....',
  '@': '.....|.#.#.|#####|#####|.###.|..#..|.....',
  '=': '.....|.....|#####|.....|#####|.....|.....',
  '$': '..#..|.####|#.#..|.###.|..#.#|####.|..#..',
  '%': '##..#|##.#.|...#.|..#..|.#...|.#.##|#..##',
};

const GLYPHS: Record<string, boolean[][]> = {};
for (const [ch, def] of Object.entries(G)) {
  GLYPHS[ch] = def.split('|').map((row) => [...row].map((c) => c === '#'));
}

export interface TextOpts {
  sx?: number;
  sy?: number;
  align?: 'left' | 'center' | 'right';
  level?: number;
}

export class DMD {
  buf = new Uint8Array(DMD_W * DMD_H);
  private img: ImageData | null = null;
  private small: HTMLCanvasElement | null = null;
  private mask: HTMLCanvasElement | null = null;
  private maskKey = '';
  color: [number, number, number] = [255, 140, 26];

  clear() {
    this.buf.fill(0);
  }

  set(x: number, y: number, level = 3) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= DMD_W || y >= DMD_H) return;
    const i = y * DMD_W + x;
    if (level > this.buf[i]) this.buf[i] = level;
  }

  rect(x: number, y: number, w: number, h: number, level = 3, fill = true) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) if (fill || i === 0 || j === 0 || i === w - 1 || j === h - 1) this.set(x + i, y + j, level);
  }

  measure(text: string, sx = 1) {
    let w = 0;
    for (const ch of text.toUpperCase()) {
      const g = GLYPHS[ch] ?? GLYPHS[' '];
      w += (g[0].length + 1) * sx;
    }
    return Math.max(0, w - sx);
  }

  text(text: string, x: number, y: number, o: TextOpts = {}) {
    const sx = o.sx ?? 1;
    const sy = o.sy ?? sx;
    const level = o.level ?? 3;
    const w = this.measure(text, sx);
    let cx = o.align === 'center' ? Math.round(x - w / 2) : o.align === 'right' ? x - w : x;
    for (const ch of text.toUpperCase()) {
      const g = GLYPHS[ch] ?? GLYPHS[' '];
      for (let gy = 0; gy < 7; gy++)
        for (let gx = 0; gx < g[gy].length; gx++)
          if (g[gy][gx]) for (let py = 0; py < sy; py++) for (let px = 0; px < sx; px++) this.set(cx + gx * sx + px, y + gy * sy + py, level);
      cx += (g[0].length + 1) * sx;
    }
  }

  /** Draw text using the biggest scale that fits the given width. */
  fitText(text: string, x: number, y: number, maxW: number, maxScale = 2, o: TextOpts = {}) {
    for (let s = maxScale; s >= 1; s--) {
      if (this.measure(text, s) <= maxW) {
        this.text(text, x, y, { ...o, sx: s, sy: Math.max(s, o.sy ?? s) });
        return s;
      }
    }
    this.text(text, x, y, { ...o, sx: 1, sy: o.sy ?? 1 });
    return 1;
  }

  bar(x: number, y: number, w: number, h: number, frac: number, level = 3) {
    this.rect(x, y, w, h, 1, false);
    const fw = Math.round((w - 2) * Math.max(0, Math.min(1, frac)));
    this.rect(x + 1, y + 1, fw, h - 2, level, true);
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pxScale: number) {
    if (!this.small) {
      this.small = document.createElement('canvas');
      this.small.width = DMD_W;
      this.small.height = DMD_H;
    }
    const sctx = this.small.getContext('2d')!;
    if (!this.img) this.img = sctx.createImageData(DMD_W, DMD_H);
    const d = this.img.data;
    const [r, g, b] = this.color;
    const lv = [0.07, 0.35, 0.65, 1];
    for (let i = 0; i < this.buf.length; i++) {
      const k = lv[this.buf[i]];
      d[i * 4] = r * k;
      d[i * 4 + 1] = g * k;
      d[i * 4 + 2] = b * k;
      d[i * 4 + 3] = 255;
    }
    sctx.putImageData(this.img, 0, 0);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.small, x, y, w, h);
    // Soft bloom.
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35;
    ctx.filter = 'blur(3px)';
    ctx.drawImage(this.small, x, y, w, h);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.getMask(w * pxScale, h * pxScale), x, y, w, h);
    ctx.restore();
  }

  /** Black sheet with round holes, laid over the scaled pixels to make dots. */
  private getMask(pw: number, ph: number) {
    pw = Math.max(1, Math.round(pw));
    ph = Math.max(1, Math.round(ph));
    const key = `${pw}x${ph}`;
    if (this.mask && this.maskKey === key) return this.mask;
    const c = document.createElement('canvas');
    c.width = pw;
    c.height = ph;
    const m = c.getContext('2d')!;
    m.fillStyle = '#000';
    m.fillRect(0, 0, pw, ph);
    m.globalCompositeOperation = 'destination-out';
    const cw = pw / DMD_W;
    const chh = ph / DMD_H;
    const rad = Math.min(cw, chh) * 0.42;
    for (let j = 0; j < DMD_H; j++)
      for (let i = 0; i < DMD_W; i++) {
        m.beginPath();
        m.arc((i + 0.5) * cw, (j + 0.5) * chh, rad, 0, Math.PI * 2);
        m.fill();
      }
    this.mask = c;
    this.maskKey = key;
    return c;
  }
}
