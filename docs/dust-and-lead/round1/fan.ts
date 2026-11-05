// Flipper reach on an empty table: standard lower section, outer walls only.
import { World, Ball, gravityAt, STEP } from '../../../src/engine/physics';
import { buildLowerSection } from '../../../src/game/tables/geom';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE = dirname(fileURLToPath(import.meta.url));

const DEG = Number(process.env.DEG ?? 6.5);
const CX = 277.5;
const out: any = { deg: DEG, shots: [] };
for (const side of ['left', 'right'] as const) {
  for (const start of ['cradle', 'inlane'] as const) {
    for (let delay = 0; delay < 0.6; delay += 0.004) {
      const w = new World();
      w.gravity = gravityAt(DEG);
      // open box: side walls and top only
      w.seg(20, 0, 20, 1240); w.seg(535, 0, 535, 1240); w.seg(20, 18, 535, 18);
      const ls = buildLowerSection(w, CX, () => {});
      const f = side === 'left' ? ls.left : ls.right;
      const x0 = side === 'left' ? 93 : 462;
      const b = new Ball(x0, 900); w.balls.push(b);
      let t = 0;
      if (start === 'cradle') {
        f.pressed = true;
        while (t < 4 && !(b.speed < 2 && b.y > 990)) { w.step(STEP); t += STEP; }
        f.pressed = false; t = 0;
        while (t < delay + 0.03) { w.step(STEP); t += STEP; }
      } else {
        // ball rolls off the inlane; flip `delay` after it passes y 960
        while (b.y < 960 && t < 4) { w.step(STEP); t += STEP; }
        t = 0;
        while (t < delay) { w.step(STEP); t += STEP; }
      }
      f.pressed = true;
      const path: number[][] = [];
      let left = false; t = 0; let launch: any = null;
      while (t < 2) {
        w.step(STEP); t += STEP;
        if (!left && b.y < f.py - 60) { left = true; launch = { vx: b.vx, vy: b.vy, x: b.x, y: b.y }; }
        if (left && Math.round(t / STEP) % 8 === 0) path.push([Math.round(b.x), Math.round(b.y)]);
        if (b.y < 40 || b.y > 1240 || (left && b.vy > 0)) break;
      }
      if (!launch) continue;
      const ang = Math.atan2(-launch.vy, launch.vx) * 180 / Math.PI;
      out.shots.push({ side, start, delay: +delay.toFixed(3), speed: Math.round(Math.hypot(launch.vx, launch.vy)), ang: +ang.toFixed(1), end: [Math.round(b.x), Math.round(b.y)], path });
    }
  }
}
writeFileSync(join(HERE, `fan-${DEG}.json`), JSON.stringify(out));
for (const side of ['left', 'right']) for (const start of ['cradle', 'inlane']) {
  const s = out.shots.filter((x: any) => x.side === side && x.start === start);
  const angs = s.map((x: any) => x.ang).sort((a: number, b: number) => a - b);
  const sp = s.map((x: any) => x.speed);
  const hist: Record<string, number> = {};
  s.forEach((x: any) => { const k = Math.round(x.ang / 5) * 5; hist[k] = (hist[k] ?? 0) + 1; });
  console.log(side, start, 'n', s.length, 'angle', angs[0], '→', angs[angs.length - 1], 'speed', Math.min(...sp), '-', Math.max(...sp));
  console.log('  by 5°:', Object.entries(hist).sort((a, b) => +a[0] - +b[0]).map(([k, v]) => `${k}:${v}`).join(' '));
}
