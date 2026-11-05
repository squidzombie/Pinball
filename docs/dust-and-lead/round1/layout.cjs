// Dust & Lead, round 1 layout plan. Table units (600 x 1240, ~1 mm). Ball 28 across.
(function (root) {
const circ = (cx, cy, r, n = 24) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * 2 * Math.PI) * r, cy + Math.sin(i / n * 2 * Math.PI) * r]);
const L = {
  // shots: mouth segment [a,b]; the ball must cross it travelling up the table
  shots: [
    { id: 'railroad', name: 'Railroad lane', from: 'right', mouth: [[20, 600], [80, 582]], color: 'steel' },
    { id: 'jail', name: 'Jailhouse', from: 'right', mouth: [[158, 742], [218, 718]], color: 'iron' },
    { id: 'mine', name: 'Gold Mine ramp', from: 'right', mouth: [[160, 318], [214, 318]], color: 'gold' },
    { id: 'noonL', name: 'High Noon (left window)', from: 'both', mouth: [[218, 228], [257, 228]], color: 'red' },
    { id: 'noonC', name: 'High Noon (centre window)', from: 'both', mouth: [[258, 228], [297, 228]], color: 'red' },
    { id: 'noonR', name: 'High Noon (right window)', from: 'both', mouth: [[298, 228], [337, 228]], color: 'red' },
    { id: 'hardware', name: 'Hardware (side target)', from: 'both', mouth: [[318, 300], [318, 400]], color: 'wood' },
    { id: 'sheriff', name: 'Sheriff (front target)', from: 'both', mouth: [[332, 414], [362, 414]], color: 'wood' },
    { id: 'stage', name: 'Stagecoach ramp', from: 'left', mouth: [[321, 619], [379, 631]], color: 'turq' },
    { id: 'saloon', name: 'Saloon lane', from: 'left', mouth: [[490, 640], [535, 640]], color: 'wood' },
  ],
  // floor-level walls the ball can hit (open polylines; closed shapes repeat their first point)
  obstacles: {
    pan: [...circ(122, 502, 64), circ(122, 502, 64)[0]],
    jail: [[158, 742], [127, 668], [187, 644], [218, 718]],
    mineRailL: [[160, 318], [118, 232]],
    mineRailR: [[214, 318], [172, 232]],
    popA: [...circ(418, 336, 28), circ(418, 336, 28)[0]],
    popB: [...circ(452, 414, 28), circ(452, 414, 28)[0]],
    town: [[332, 300], [362, 300], [362, 400], [332, 400], [332, 300]],
    stageRailL: [[321, 619], [339, 531]],
    stageRailR: [[379, 631], [398, 543]],
    noon: [[200, 214], [200, 90], [355, 90], [355, 214], [200, 214]],
    pocket: [[380, 300], [380, 70]],
    saloonWall: [[490, 640], [490, 300]],
  },
};
root.LAYOUT = L;
if (typeof module !== 'undefined') module.exports = L;
})(typeof window !== 'undefined' ? window : globalThis);
