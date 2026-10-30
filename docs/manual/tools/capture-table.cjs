// Usage: OUT=<dir> node docs/manual/tools/capture-table.cjs   (needs the dev server on port 5173)
// Full-table flat render for the manual (lit, mid-game), cropped exactly to the table.
const { chromium } = require('playwright');
const OUT = process.env.OUT;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 700, height: 1400 }, deviceScaleFactor: 3 });
  await p.goto('http://localhost:5173/?flat');
  await p.waitForTimeout(900);
  await p.keyboard.press('Enter');
  await p.addStyleTag({ content: '#mute, #speed { display: none !important; }' });
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    const g = window.game, f = g.main;
    for (let i = 0; i < 6; i++) f.hitStandup(i);   // broken in: Infiltrate and the Breach lit
    f.hitStandup(0); f.hitStandup(1);
    f.rageLit = [true, false, true, false];
    f.camLit = [true, false, false];
    f.lockLit = true;
    const ball = f.world.balls[0];
    ball.x = 557.5; ball.y = 1160; ball.vx = 0; ball.vy = 0; ball.captured = true; // ball waiting in the shooter lane
    g.msg = null;
  });
  await p.waitForTimeout(2800);
  const r = await p.evaluate(() => { const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.height - a.height)[0]; const q = c.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; });
  console.log(JSON.stringify(r));
  const k = r.w / 600;
  await p.screenshot({ path: `${OUT}/table-flat.png`, clip: { x: r.x, y: r.y, width: 600 * k, height: 1200 * k } });
  await b.close();
})();
