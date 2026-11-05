// The saloon flipper alone: a ball rolls down the pocket's right lane onto it and it flips at
// every timing. Pivot here is (510, 272); gen.js shifts the paths to the plan's (478, 280).
import { World, Ball, Flipper, gravityAt, STEP } from '../../../src/engine/physics';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE = dirname(fileURLToPath(import.meta.url));
const out: any[] = [];
for (let delay = 0; delay < 0.8; delay += 0.004) {
  const w = new World(); w.gravity = gravityAt(6.5);
  w.seg(535, 0, 535, 400); w.seg(380, 40, 535, 40);
  w.seg(535, 190, 521.5, 256); // guide down into the crook by the pivot
  const f = new Flipper(510, 272, 75, Math.PI - 0.52, Math.PI + 0.42); w.flippers.push(f);
  const b = new Ball(519, 120); w.balls.push(b);
  let t = 0;
  while (b.y < 236 && t < 5) { w.step(STEP); t += STEP; }
  t = 0;
  while (t < delay) { w.step(STEP); t += STEP; }
  f.pressed = true; t = 0;
  const path: number[][] = []; let left = false;
  while (t < 1.5) { w.step(STEP); t += STEP;
    if (!left && b.x < 430) left = true;
    if (left && Math.round(t / STEP) % 8 === 0) path.push([Math.round(b.x), Math.round(b.y)]);
    if (b.x < 40 || b.y > 1100 || b.y < 40) break; }
  if (path.length > 1) out.push({ delay, path, speed: Math.round(b.speed) });
}
writeFileSync(join(HERE, 'upper-6.5.json'), JSON.stringify(out));
const at = (p: number[][], X: number) => { for (let i = 1; i < p.length; i++) if (p[i - 1][0] >= X && p[i][0] < X) return p[i][1]; return null; };
for (const X of [380, 300, 230, 180]) {
  const ys = out.map((o) => at(o.path, X)).filter((y) => y !== null) as number[];
  const h: Record<number, number> = {}; ys.forEach((y) => { const k = Math.floor(y / 25) * 25; h[k] = (h[k] ?? 0) + 1; });
  console.log('x=' + X, 'n', ys.length, 'of', out.length, Object.entries(h).map(([k, v]) => `${k}:${v}`).join(' '));
}
