# Art for Cyber Psychosis

## Painting the playfield

The game draws its playfield art in code. Paint your own and the game uses it instead. Your picture
becomes the printed playfield, and the game draws the rails, ramps, toys and lights on top of it,
the way they're mounted on a real machine.

### The kit (`kit/`)

| File | What it is |
|---|---|
| `kit/Cyber-Psychosis-Playfield.psd` | The canvas, with guide layers. Opens in Procreate, Photoshop, Affinity Photo, Krita, Pixelmator and most other painting apps. |
| `kit/layers/*.png` | The same layers as separate pictures, for apps that don't open PSD files. |
| `kit/guide-preview.png` | The guides over grey, half size, just to look at. |

The layers, top to bottom:

| Layer | What it's for |
|---|---|
| **Guide: labels** | The name of every shot and feature, and the playfield's edge (dashed). |
| **Guide: the game draws this on top** | Everything the game draws over your art: walls, rails, ramps, bumpers, targets, flippers, the apron and every light. It's rendered from the game itself, so it matches exactly. |
| **PAINT THE PLAYFIELD HERE** | An empty layer for your painting. Add as many layers as you like, as long as they're below the two guides. |
| Reference: the current look | Hidden. The table as the code draws it now, for comparison or to trace. |
| Background (grey) | Hide it, or paint over it. |

### Painting

- **Keep the canvas 1800 × 3600** (3 pixels per table unit). Any size works as long as it's
  exactly twice as tall as it is wide, such as 3600 × 7200, but there's no benefit on a phone.
- **Paint the whole canvas, edge to edge.** Outside the dashed playfield edge is the cabinet's
  steel, so it never shows.
- **Your art replaces** the concrete, the steel floor plates, the brain, the heist map's links,
  the hazard stripes, the words painted on the floor (BREACH, SKILL SHOT…) and the vault's floor
  with its safe dial. Paint your own versions of any of those you want.
- **The game keeps drawing everything in the "on top" guide.** The solid ramps hide what's under
  them; the wire ramps show it. Paint under them anyway, because the edges show.
- **Don't paint the lights.** The game draws every light's glass and lights it up. Framing them
  (a ring, a panel, an arrow pointing in) looks great.
- **The table is tilted on the phone,** so the top looks smaller and further away. Bold shapes and
  strong contrast read better than fine detail, especially near the top.

### Seeing it in the game

1. **Export** a PNG of the whole canvas with the guides (and the grey background, if you didn't
   paint over it) hidden. A JPEG works too and makes the app smaller.
2. **Try it on the computer, without saving anything:** double-click **`Preview in Browser.command`**
   in the project folder. The game opens in your browser. Drag your picture onto it and it becomes
   the playfield straight away. Drop a new version whenever you like. Add `?noart` to the address to
   compare with the old look, or `?debug` to see the physics outlines over your art.
3. **Make it the game's art:** save it in the project as **`public/art/playfield.png`** (or
   `playfield.jpg`). Every version of the game uses it from then on: the browser preview, the
   phone link, and the app. For the app, double-click `Open in Xcode.command` to rebuild it, then
   run it on your phone or archive it for TestFlight.

To go back to the code's own art, delete or rename `public/art/playfield.png`.

The phone on the same Wi-Fi can play the preview too. The Terminal window shows a **Network**
address, such as `http://192.168.1.20:5173`; open that in Safari.

## Coordinates

- The table is 600 × 1200 units. The art is 3 pixels per unit: 1800 × 3600.
- One unit is about a millimetre on a real machine; the ball is 28 units across.
- x runs left to right; y runs from the top (the back of the cabinet) to the flippers.

## Rebuilding the kit

If the layout changes, rebuild the guides so they match. You need the dev server running
(`npm run dev`), Playwright with Chromium, and Python with Pillow, NumPy and psd-tools:

```bash
OUT=/tmp/kit node art/kit/tools/render-guides.cjs
python3 art/kit/tools/build-kit.py /tmp/kit art/kit
```

The labels' positions are listed in `build-kit.py`; move any that the new layout puts in the
wrong place.

## Other folders

| Folder | What it is |
|---|---|
| `template/` | Technical templates from the physics: every collision shape, lane, gate, switch and insert outline, on a grid, plus `inserts.json` (every light's shape and position) and `gaps.json` (every clearance). Regenerate with `npm run template` after any geometry change. |
| `palettes/` | Colour-scheme previews of the current table. |
| `app/` | The app icon and launch screen. |
| `PROMPT.md` | An image-generator prompt from an earlier plan to generate the whole table, walls included. Out of date, and replaced by painting the playfield as above. |
