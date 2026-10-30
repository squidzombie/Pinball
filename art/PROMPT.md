# Image-generator prompt: Cyber Psychosis playfield

> **Out of date (30 October 2026).** This prompt describes the layout before the fan revision
> (upper flippers, duct, machinery). Don't generate from it. It will be rebuilt from the final
> template in `template/` once the new layout is approved.

Two layers, generated separately with the same style: the **base** (`art/playfield.png`) and the
**overlay** (`art/overlay.png`). See `art/README.md` for what belongs in each.

## How to run it

Exact geometry matters more than anything here: the ball collides with the walls in the
template, so the painted walls must sit on them.

- **Best: a generator with structure guidance** (Stable Diffusion XL or Flux with ControlNet
  Lineart or Canny, or a similar "structure reference").
  - Structure input: `template/playfield-lineart.png`, at a strong weight (0.8–1.0) for the
    whole run.
  - Style reference: `../reference/sketch.png`, if the tool takes one.
  - Generate at 1:2 (for example 1024 × 2048 or 1152 × 2304), then upscale to exactly
    1800 × 3600 with no cropping.
- **Also good: paint over the template** in an image editor that has generative fill. Work
  region by region on top of `template/playfield-template.png`, then hide the template.
- **Avoid tools that can't take a structure input** for the final art. They'll match the look
  but not the geometry. They're fine for exploring style.
- Turn off any "enhance", "zoom out" or automatic reframing. The frame must stay exactly the
  template's frame.

## Base layer prompt

> Straight-down orthographic top view of a pinball playfield, flat technical illustration,
> no perspective, no camera tilt, the playfield fills the entire frame edge to edge, portrait
> 1:2. A weathered, hand-inked industrial machine on a light bone and pale concrete base, like
> a pen-and-ink engineering illustration with light grey wash. Cracked concrete slabs with
> slab joints, oil stains and grime building up in corners, along rails and around posts;
> worn, lighter scuffed paths where balls roll: down the inlanes, under the flippers, up the
> centre and the shooter lane.
>
> Heavy dark graphite ink outlines on every edge, varied line weight, heavier on outer edges;
> shading by cross-hatching and diagonal pen lines, not gradients; rivets along plate edges,
> hex bolts, panel seams, weld lines, small conduits and pipes routed between the features. No
> empty floor: dead space filled with flat floor plates, grates, cable trays and junction
> boxes.
>
> Desaturated steel greys with darker edges. Muted, chipped hazard-yellow and black stripes,
> painted and matte. A deep signal red used only for the light inserts, a few key labels and
> painted arrows. All light inserts unlit: dull, dirty red glass set flush in the floor.
> Stencil lettering, slightly worn.
>
> Features, matching the guide exactly:
> - **Top left:** a riveted steel lock box with a porthole window and a red warning triangle,
>   stencilled IMPOUND, with machinery beside it.
> - **Across the top right:** a steel gutter lane looping round three pop bumper bases on a
>   ribbed steel deck, stencilled BACK ALLEY.
> - **Left side:** a narrow grated duct lane.
> - **Centre left:** two armoured kite-shaped steel blast shields either side of a narrow
>   channel, and a vault-door scoop housing with a dark throat at the channel's top,
>   stencilled BREACH.
> - **Centre right:** a round reactor housing with hazard banding and a concentric red eye,
>   with yellow chevron floor plates in front of it.
> - **Centre:** a tree of five dark stencilled steel plates joined by inked pipe lines,
>   reading INFILTRATE, HACK, ROUTE, PAYLOAD, EXTRACT, and a larger red-bordered plate below
>   reading BLACKOUT.
> - **Bottom centre, between the flippers:** plain concrete with hazard stripes down the drain.
>   (Out of date: the skull was replaced by a top-down brain under the mode map.)
> - **Bottom corners:** angled steel apron plates with mesh grilles.
> - **Lower sides:** triangular slingshot frames with red lamp lenses, and steel inlane and
>   outlane rails.
> - **Right edge:** a narrow shooter lane stencilled SKILL SHOT.
>
> Leave flat, clear floor where the flippers sit and for the ramp shadows.

## Overlay layer prompt

Use `template/overlay-lineart.png` as the structure input. Generate on a plain flat white
background, then cut it out to transparency (or use a tool that outputs alpha directly).

> Straight-down orthographic top view, same hand-inked industrial illustration style, on a
> plain flat white background, nothing else in the frame. Only these raised parts:
> - a wide brushed and worn steel ramp deck on trusses with visible side walls, riveted lips
>   and SKYWAY stencilled in dark ink with red chevron arrows; a worn steel wireform of thin
>   rods continuing down the left side
> - a narrower steel ramp climbing into a raised steel dealer's box with shutters and a
>   hand-painted BLACK MARKET sign, and a thin steel-rod wireform down the right side
> - a short steel chute into the back of that box
>
> Heavy ink outlines, cross-hatched undersides, small cast shadows under the wireform rods.

## Negative prompt (both layers)

> perspective, vanishing point, camera tilt, 3/4 view, isometric, cabinet, backbox, people,
> hands, ball, pinball, flippers, glowing lights, neon, bloom, lens flare, glow, light rays,
> dark background, night, black floor, saturated colours, green, cyan, blue, purple, pink,
> orange, candy colours, gradients, airbrush, smooth vector, 3D render, plastic, glossy,
> photo, text labels, annotations, arrows with captions, watermark, signature, border, frame,
> cropped, extra elements outside the frame

## Checklist before handing the art over

- Exactly 1800 × 3600 px, PNG. The overlay has transparency.
- No perspective: straight walls on the template are straight in the art.
- With the template on top at 50%, walls, lane edges, flipper bases and insert outlines line up.
- Inserts are unlit dull red glass, at their outlines; nothing is glowing.
- No ball, flippers, drop target faces, standups, bumper caps or captive ball drawn in.
- No labels or annotations from the template carried into the art.
- Colours: bone and concrete, graphite ink, steel greys, muted hazard yellow, deep red only.
