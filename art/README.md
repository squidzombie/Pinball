# Art for Cyber Psychosis

The painted playfield replaces the procedural static art (DESIGN.md, section 7, option B). This
folder holds the templates the art must line up with, and the prompt for generating it.

## Files

| File | What it is |
|---|---|
| `template/playfield-template.png` / `.svg` | **The master template.** Every collision shape, lane, gate, ramp entrance, target, switch, flipper and insert, labelled, on a 25-unit grid. |
| `template/playfield-lineart.png` / `.svg` | Floor-level structure only, no labels or grid. Use it as the structure guide (ControlNet lineart or canny, or an image reference) for the base layer. |
| `template/overlay-template.png` / `.svg` | The ramps, wires and Black Market box at the positions the game draws them, over their floor footprints. |
| `template/overlay-lineart.png` / `.svg` | The same, outlines only, on a transparent background. The structure guide for the overlay layer. |
| `template/inserts.json` | Every insert (lamp): id, shape, centre, size and rotation in table units, plus the centre in pixels. |
| `template/gaps.json` | Every place the ball has to fit through, with the clearance (the template draws a ball to scale at each). |
| `PROMPT.md` | Image-generator prompts for both layers, negative prompt, settings and a checklist. **Out of date:** it describes the layout before the fan revision, and will be rebuilt from the final template. |

All of these come from the live physics world. **Regenerate them with `npm run template`
after any geometry change**; never edit them by hand.

## Coordinates

- The table is 600 × 1200 units. The art is delivered at **3 px per unit: 1800 × 3600**.
- One unit is about a millimetre on a real machine; the ball is 28 units across.
- The x axis runs left to right; y runs top (back of the cabinet) to bottom (the flippers).
- The image frame is exactly the template's frame: nothing extra outside it.

## What goes where

**`art/playfield.png`, the base layer.** Opaque, 1800 × 3600. Everything at floor level:

- concrete, grime, plates, grates, stencils and painted arrows
- the bases and sides of the solid structures (grey on the template)
- the in/outlane guides, the slings' plastic and frames
- the mode map plates, the skull and the apron
- **all inserts, unlit** (dull dirty red glass), exactly at their template outlines
- shadows cast by the ramps

It must **not** contain the ball, the flippers, the drop targets, the standup faces, the
captive ball, the pop bumper caps, the spinner flag, the camera's beam or any lit light. The
code draws those so they can move and light up.

**`art/overlay.png`, the overlay layer.** Transparent, 1800 × 3600. Only what the ball passes
under:

- the Skyway deck, its lane walls and the wireform down the left (it crosses over the Black
  Market's climb, so the Skyway is on top there)
- the Black Market ramp, its box and the wireform down the right
- the Back Alley's loop chute into the box

Draw these at their **overlay template** positions, not the floor footprint. The game draws
anything raised half a unit up the screen per unit of height, and the overlay template has
already applied that.

## Checking the art

1. Put the template over the art at 50% opacity, at the same size. Walls, lane edges, the
   flipper bases and every insert outline should sit on the painted features.
2. Look for the small things first: the CAM lane posts and the two one-way gates at either end
   of them, the Back Alley's mouth, the Breach throat, the pop exit chute and its gate, the
   Reactor funnel, the inlane/outlane guides, and the Skyway lane by the shooter lane.
3. Small misses get fixed in code in Phase 3: press **D** in the game to show the collision
   geometry over the art and move the collision to fit. Big misses mean regenerate.
