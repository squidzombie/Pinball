// Renders the drawing kit's guide layers from the running game (npm run dev, port 5173):
//   on-top-black.png / on-top-white.png: the whole table drawn over solid black and solid white art,
//     in the same instant (build-kit.py turns the pair into a transparent "what the game draws on
//     top" layer);
//   reference.png: the table with the code's own floor art, for reference.
// All at the art's size: 1800 x 3600, 3 pixels per table unit.
// Usage: OUT=<dir> node art/kit/tools/render-guides.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const out = process.env.OUT || '.';
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 700, height: 1400 } });
  await p.goto((process.env.URL || 'http://localhost:5173/') + '?flat&noart');
  await p.waitForTimeout(900);
  await p.keyboard.press('Enter'); // a fresh game: no lamp show, nearly every light off
  await p.waitForTimeout(800);
  const shots = await p.evaluate(() => {
    const t = window.game.main;
    t.world.balls = [];
    const solid = (color) => {
      const c = document.createElement('canvas');
      c.width = 600;
      c.height = 1200;
      const x = c.getContext('2d');
      x.fillStyle = color;
      x.fillRect(0, 0, 600, 1200);
      return c;
    };
    const draw = (art) => {
      t.setFloorArt(art);
      const c = document.createElement('canvas');
      c.width = 1800;
      c.height = 3600;
      const x = c.getContext('2d');
      x.setTransform(3, 0, 0, 3, 0, 0);
      t.render(x, 3);
      return c.toDataURL('image/png');
    };
    // all three in one go, so the moving parts are in the same place in each
    return { black: draw(solid('#000')), white: draw(solid('#fff')), reference: draw(null) };
  });
  for (const [name, url] of Object.entries(shots)) {
    const file = name === 'reference' ? 'reference.png' : `on-top-${name}.png`;
    fs.writeFileSync(path.join(out, file), Buffer.from(url.split(',')[1], 'base64'));
  }
  await b.close();
})();
