// Screenshots for the colour-scheme previews: the phone view in a lit mid-game state, and a flat
// close-up of the Breach, the heist map and the brain. Needs Playwright with Chromium, and the
// dev server running (npm run dev, on port 5173).
// Usage: OUT=<dir> node art/palettes/capture.cjs   (writes phone.png and close.png)
const { chromium } = require('playwright');
const OUT = process.env.OUT || '.';
const URL = process.env.URL || 'http://localhost:5173/';

(async () => {
  const b = await chromium.launch();
  const setup = () => {
    const g = window.game, f = g.main;
    for (let n = 0; n < 2; n++) for (let i = 0; i < 6; i++) f.hitStandup(i); // broken in, and a Breach jackpot lit
    f.hitStandup(0); f.hitStandup(1); f.hitStandup(4); // B, R and C lit
    f.rageLit = [true, false, true, false];
    f.camLit = [true, false, false];
    f.lockLit = true;
    const ball = f.world.balls[0];
    ball.x = 300; ball.y = 700; ball.vx = 0; ball.vy = 0; ball.captured = true;
    g.msg = null;
  };
  const open = async (viewport, query) => {
    const p = await b.newPage({ viewport, deviceScaleFactor: 3 });
    await p.goto(URL + query);
    await p.waitForTimeout(900);
    await p.keyboard.press('Enter');
    await p.waitForTimeout(1500);
    await p.evaluate(setup);
    await p.waitForTimeout(2600); // let the score popups fade
    return p;
  };

  // The phone, tilted: what you play
  let p = await open({ width: 390, height: 844 }, '');
  await p.screenshot({ path: `${OUT}/phone.png` });
  await p.close();

  // Flat close-up, in table units
  p = await open({ width: 700, height: 1300 }, '?flat');
  const r = await p.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.height - a.height)[0];
    const q = c.getBoundingClientRect();
    return { x: q.x, y: q.y, w: q.width };
  });
  const k = r.w / 600;
  const [x0, y0, x1, y1] = [40, 380, 560, 980];
  await p.screenshot({ path: `${OUT}/close.png`, clip: { x: r.x + x0 * k, y: r.y + y0 * k, width: (x1 - x0) * k, height: (y1 - y0) * k } });
  await b.close();
})();
