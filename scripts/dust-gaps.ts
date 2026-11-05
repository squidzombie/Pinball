// Dust & Lead clearances: each gap the ball meets, in table units and in balls (28 units).
// A gap is either wider than a ball (with margin) or closed: nothing in between, where a ball could wedge.
// Usage: npx tsx scripts/dust-gaps.ts
import * as L from '../src/game/tables/dust-layout';
import type { P } from '../src/game/tables/geom';

const segDist = (p: P, a: P, b: P) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
};
const polyDist = (p: P, poly: P[]) => Math.min(...poly.slice(1).map((b, i) => segDist(p, poly[i], b)));
const circleTo = (c: P, r: number, poly: P[]) => polyDist(c, poly) - r;
const bowlR = L.PAN.r;
const rows: [string, number][] = [];
const add = (name: string, d: number) => rows.push([name, d]);

const [pA, pB] = L.BUMPERS;
add('Pop to pop', Math.hypot(pA[0] - pB[0], pA[1] - pB[1]) - 2 * L.BUMPER_R);
add('Upper pop to Sheriff & Hardware', circleTo(pA, L.BUMPER_R, L.TOWN));
add('Lower pop to Sheriff & Hardware', circleTo(pB, L.BUMPER_R, L.TOWN));
add('Upper pop to the Saloon lane wall', circleTo(pA, L.BUMPER_R, L.SALOON_RIGHT));
add('Lower pop to the Saloon lane wall', circleTo(pB, L.BUMPER_R, L.SALOON_RIGHT));
const uTip: P = [L.UF.px + Math.cos(L.UF.rest) * L.UF.len, L.UF.py + Math.sin(L.UF.rest) * L.UF.len];
add('Saloon flipper tip (down) to the upper pop', Math.hypot(uTip[0] - pA[0], uTip[1] - pA[1]) - L.BUMPER_R - 7);
add('Saloon flipper pivot to its guide (closed)', segDist([L.UF.px, L.UF.py], L.SALOON_GUIDE[0], L.SALOON_GUIDE[1]) - 13);
add('High Noon to the saloon wall', 380 - L.NOON.x1);
add('High Noon roof to the Railroad lane wall above', L.NOON.y0 - 64);
add('Gold Mine house to the Railroad lane wall', L.MINE_HOUSE.x0 - 62);
add('Gold Mine house to High Noon', L.NOON.x0 - L.MINE_HOUSE.x1);
L.PAN_PINS.forEach((p, i) => add(`Pan pin ${i + 1} to the bowl`, bowlR - Math.hypot(p[0] - L.PAN.x, p[1] - L.PAN.y) - L.PAN_PIN_R));
for (let i = 0; i < L.PAN_PINS.length; i++)
  for (let j = i + 1; j < L.PAN_PINS.length; j++) add(`Pan pins ${i + 1} and ${j + 1}`, Math.hypot(L.PAN_PINS[i][0] - L.PAN_PINS[j][0], L.PAN_PINS[i][1] - L.PAN_PINS[j][1]) - 2 * L.PAN_PIN_R);
add("Pan's middle cup (between the divider tips)", L.PAN_DIVIDERS[1][0][0] - L.PAN_DIVIDERS[0][0][0] - 4);
add('Rail over the pan to the bowl (closed)', Math.min(...[0, 0.25, 0.5, 0.75, 1].map((t) => Math.hypot(...([L.along(L.PAN_ROOF[0], L.PAN_ROOF[1], t)].map((q) => [q[0] - L.PAN.x, q[1] - L.PAN.y])[0] as [number, number])) - bowlR)));
add('Gold Pan to the Railroad lane wall', L.PAN.x - L.PAN.r - 62);
add('Gold Pan to the Jailhouse', Math.min(...L.JAIL_WALLS.map((p) => Math.hypot(p[0] - L.PAN.x, p[1] - L.PAN.y))) - bowlR);
add('Jailhouse mouth', Math.hypot(L.JAIL_MOUTH[0][0] - L.JAIL_MOUTH[1][0], L.JAIL_MOUTH[0][1] - L.JAIL_MOUTH[1][1]));
add('Gold Mine ramp mouth', Math.hypot(L.MINE.entry[0][0] - L.MINE.entry[1][0], L.MINE.entry[0][1] - L.MINE.entry[1][1]) - 8);
add('Stagecoach ramp mouth', Math.hypot(L.STAGE.entry[0][0] - L.STAGE.entry[1][0], L.STAGE.entry[0][1] - L.STAGE.entry[1][1]) - 8);
add('Saloon lane', 537 - 490);
add('Shooter lane', 580 - 537);
add('Railroad lane', 62 - 20);
add('Left outlane guard to the inlane post', Math.hypot(L.OUTLANE_GUARDS[0][1][0] - (L.CX - 202), L.OUTLANE_GUARDS[0][1][1] - 868) - 4 - 5);
add('Right outlane guard to the inlane post', Math.hypot(L.OUTLANE_GUARDS[1][1][0] - (L.CX + 202), L.OUTLANE_GUARDS[1][1][1] - 868) - 4 - 5);
add('Between the saloon doors (where the top drops into the saloon)', L.DOOR_R[0][0] - L.DOOR_L[0][0]);
add('Plunge channel at the right door (top wall to the bend)', L.DIVIDER[L.DIVIDER.length - 1][1] - 18);
add('Town building to Main Street (High Noon front)', L.TOWN[2][1] - L.NOON.y1);

console.log('Gap'.padEnd(52) + 'units'.padStart(7) + '  balls');
for (const [name, d] of rows) {
  const balls = d / 28;
  const flag = d <= 0 ? 'touching' : balls < 1 ? 'closed' : balls < 1.07 ? 'TIGHT' : '';
  console.log(name.padEnd(52) + d.toFixed(1).padStart(7) + '  ' + balls.toFixed(2).padStart(5) + '  ' + flag);
}
