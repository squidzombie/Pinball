// Render an SVG or HTML file to a PNG of the given size.
const { chromium } = require('playwright');
(async () => {
  const [src, out, w, h] = [process.env.SRC, process.env.OUT, +process.env.W, +(process.env.H || process.env.W)];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.goto('file://' + src, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts && document.fonts.ready);
  await p.waitForTimeout(300);
  await p.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h } });
  await b.close();
})();
