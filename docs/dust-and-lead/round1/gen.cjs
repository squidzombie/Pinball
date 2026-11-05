// Classify every measured flipper shot against the round-1 layout, trim each path where it
// first touches something, and bake the result into the plan page.
const fs = require('fs');
const L = require('./layout.cjs');
const fan = require('./fan-6.5.json');
// the saloon flipper was measured at (510, 272); the plan puts it at (478, 280)
const upper = require('./upper-6.5.json').map((o) => ({ ...o, path: o.path.map(([x, y]) => [x - 32, y + 8]) }));

const R = 14;
const X = (p, q, r, s) => {
  const d1 = [q[0] - p[0], q[1] - p[1]], d2 = [s[0] - r[0], s[1] - r[1]];
  const den = d1[0] * d2[1] - d1[1] * d2[0];
  if (!den) return null;
  const t = ((r[0] - p[0]) * d2[1] - (r[1] - p[1]) * d2[0]) / den;
  const u = ((r[0] - p[0]) * d1[1] - (r[1] - p[1]) * d1[0]) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
};

function classify(path, { upperFlipper = false } = {}) {
  const obst = Object.entries(L.obstacles).filter(([k]) => !(upperFlipper && k === 'pocket'));
  const extra = upperFlipper ? [['noonSide', [[369, 214], [369, 70]]], ['mineSide', [[214, 318], [180, 248]]]] : [];
  for (let i = 1; i < path.length; i++) {
    const p = path[i - 1], q = path[i];
    if (!upperFlipper && q[1] > p[1]) return { k: 'fell', n: i };
    const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * R, ny = (dx / l) * R;
    const lines = [[p, q], [[p[0] + nx, p[1] + ny], [q[0] + nx, q[1] + ny]], [[p[0] - nx, p[1] - ny], [q[0] - nx, q[1] - ny]]];
    let hit = null;
    for (const [k, s] of extra) { const t = X(p, q, s[0], s[1]); if (t !== null && (!hit || t < hit.t)) hit = { t, k }; }
    for (const s of L.shots) { const t = X(p, q, s.mouth[0], s.mouth[1]); if (t !== null && (!hit || t < hit.t)) hit = { t, k: s.id }; }
    for (const [k, poly] of obst)
      for (let j = 0; j < poly.length - 1; j++)
        for (const [lp, lq] of upperFlipper ? [[p, q]] : lines) {
          const t = X(lp, lq, poly[j], poly[j + 1]);
          if (t !== null && (!hit || t < hit.t - 1e-9)) hit = { t, k: 'blocked:' + k };
        }
    if (hit) return { k: hit.k, n: i, end: [Math.round(p[0] + (q[0] - p[0]) * hit.t), Math.round(p[1] + (q[1] - p[1]) * hit.t)] };
    if (q[1] < 30) return { k: 'wall', n: i };
    if (!upperFlipper && (q[0] < 34 || q[0] > 521)) return { k: 'wall', n: i };
    if (upperFlipper && q[1] > 330 && q[0] > 370) return { k: 'pops', n: i };
  }
  return { k: 'fell', n: path.length - 1 };
}

const out = { left: [], right: [], upper: [] };
const tally = { left: {}, right: {}, upper: {} };
const add = (side, path, opts) => {
  const c = classify(path, opts);
  const pts = path.slice(0, c.n);
  if (c.end) pts.push(c.end);
  const k = c.k.startsWith('blocked:') ? 'x' : c.k;
  out[side].push([k, pts.flat()]);
  tally[side][c.k] = (tally[side][c.k] || 0) + 1;
};
for (const s of fan.shots.filter((s) => s.start === 'cradle')) add(s.side, s.path);
for (const s of upper) add('upper', s.path, { upperFlipper: true });

for (const side of Object.keys(tally))
  console.log(side, out[side].length, Object.entries(tally[side]).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));

const tpl = fs.readFileSync(__dirname + '/plan.template.html', 'utf8');
const data = `const LAYOUT = ${JSON.stringify(L)};\nconst SHOTS = ${JSON.stringify(out)};\nconst TALLY = ${JSON.stringify(tally)};`;
fs.writeFileSync(__dirname + '/plan.html', tpl.replace('/*DATA*/', data));
console.log('page bytes', fs.statSync(__dirname + '/plan.html').size);
