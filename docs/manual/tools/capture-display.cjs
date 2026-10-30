// Usage: OUT=<dir> node docs/manual/tools/capture-display.cjs   (needs the dev server on port 5173)
// Display screens for the manual: real messages from the game, clipped to the dot-matrix display.
const { chromium } = require('playwright');
const OUT = process.env.OUT;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  await p.goto('http://localhost:5173/');
  await p.waitForTimeout(1000);
  const box = await p.evaluate(() => { const c = [...document.querySelectorAll('canvas')].sort((a, b) => a.height - b.height)[0]; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  const snap = async (name, wait = 300) => { await p.waitForTimeout(wait); await p.screenshot({ path: `${OUT}/${name}.png`, clip: box }); };
  await snap('attract', 200);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(3500);
  const park = `const f = window.game.main; const ball = f.world.balls[0]; if (ball) { ball.x = 300; ball.y = 700; ball.vx = 0; ball.vy = 0; ball.captured = true; }`;
  await p.evaluate(park + '; window.game.msg = null;');
  await snap('status');
  const msg = async (name, l1, l2) => { await p.evaluate(([a, c]) => window.game.show(a, c, 5, true), [l1, l2]); await snap(name, 1000); };
  await msg('broken-in', 'BROKEN IN', 'INFILTRATE IS LIT');
  await msg('cameras-down', 'CAMERAS DOWN', 'BACK DOOR OPEN');
  await msg('reactor', 'REACTOR EXPOSED', 'LOCK LIT AT THE SKYWAY');
  await msg('vault', 'THE VAULT', 'CODE 3-1-2');
  await msg('vault-cracked', 'VAULT CRACKED', 'VAULT MULTIBALL');
  await msg('breach-jp', 'BREACH JACKPOT LIT', '1,000,000');
  await msg('blackout', 'BLACKOUT', 'EVERY SHOT A JACKPOT');
  await msg('shop', 'BLACK MARKET', 'RAGE COSTS $60K');
  await msg('locked', 'BALL 3 LOCKED', 'IMPOUND BREAKOUT!');
  await msg('spotted', 'SPOTTED!', 'SHOTS PAY 100K LESS');
  // the selection screen: Infiltrate done, Hack/Route lit, ball in the Breach
  await p.evaluate(() => { const f = window.game.main; f.played.add('infiltrate'); f.completed.add('infiltrate'); f.brokenIn = true; f.rowLit[1] = true; window.game.msg = null; const ball = f.world.balls[0]; ball.captured = false; ball.vx = ball.vy = 0; ball.tags.scoopIgnore = 0; f.enterBreach(ball); window.game.msg = null; });
  await snap('choose', 400);
  // a running job
  await p.waitForTimeout(4500);
  await p.evaluate(park + '; window.game.msg = null;');
  await snap('job', 300);
  await b.close();
})();
