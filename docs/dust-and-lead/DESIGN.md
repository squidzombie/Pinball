# Dust & Lead: design

The second Squidzombie table, a western. Started 5 November 2026 from the owner's concept sketch,
[`reference/dust-and-lead-sketch.webp`](../../reference/dust-and-lead-sketch.webp).

Nothing is built yet. Order of work, as for Cyber Psychosis: layout rounds on a phone link until
the owner approves one, then the rule sheet, then code, then the toys and lights, then the drawing
kit for the owner's painted playfield.

**Phone link:** https://claude.ai/artifact/DwDXUXjypRkmGgczSxHwK6 (layout round 1).

## Decisions

### 5 November 2026: before the first layout

1. **The theme is a western**, from the owner's sketch "Dust & Lead". It is to be totally distinct
   from Cyber Psychosis, but carry over what was learned building it.
2. **Slope: 6.5°**, like a real machine. Cyber Psychosis plays at about 16° and the owner finds
   its ball "too fast". This table's gravity is `gravityAt(6.5)` (about 820 units/s², 41% of
   Cyber Psychosis's) from day one, and every shot is aimed and measured at that slope.
3. **One app with a table picker**, under the existing App Store Connect record "SquidZombie
   Pinball". (Needs the multi-table refactor in `HANDOFF.md` section 4 before any of this table's
   code goes in.)
4. **All new, including the lower playfield.** The standard `buildLowerSection()` block appears in
   round 1 only as a stand-in so the shot measurements are real; round 2 redesigns it. Flipper
   strength, stroke and size stay as they are unless the owner asks (that's flipper feel).
5. **The Cyber Psychosis branch stays unmerged for now.** The owner is still working on that table
   (its slope, and the feedback that it looks plain).
6. **"Too plain" applies here too.** The owner's feedback on Cyber Psychosis is that it's plain.
   This table is designed around moving toys and layered ramps from the first round.

## Layout round 1 (5 November 2026): the sketch to scale

The sketch drawn at true size (600 × 1240 units, ball 28 across) and every shot checked against
measured flipper paths at 6.5°. Source in [`round1/`](round1/): `layout.cjs` is the geometry,
`fan.ts` and `upper.ts` measure the flippers, `gen.cjs` classifies each measured shot and builds
`plan.html` from `plan.template.html`.

```bash
npx tsx docs/dust-and-lead/round1/fan.ts      # lower flippers, empty table, 6.5° (DEG=9 for another slope)
npx tsx docs/dust-and-lead/round1/upper.ts    # the saloon flipper
node docs/dust-and-lead/round1/gen.cjs        # tallies, and rebuilds plan.html
```

### Features (left to right, as in the plan's key)

1. Gold Mine and elevator (top left): the left ramp ends in the mine; a minecart lifts the ball onto
   a wire track across the back into the saloon.
2. Gold Pan (left): bagatelle of brass pins with three cups (Riches, Nuggets, Extra Ball), fed by a
   diverter on the mine ramp.
3. Jailhouse (left, low): scoop and visible three-ball lock.
4. Railroad lane: the left orbit, up the left side and across the top into the saloon. Three drop
   targets across its mouth.
5. High Noon (top centre): three windows, the outlaw moves between them on a timer.
6. Main Street: the open centre shot to High Noon.
7. Sheriff and Hardware: one building, two targets, right of Main Street.
8. Two barrel pops under the saloon.
9. Saloon (top right): the hub. The plunge, both orbits and the mine wire track all enter through
   swinging doors onto a third flipper.
10. Saloon lane: the right orbit into the saloon.
11. Stagecoach ramp: up the right, across the back, down the left to the left inlane.
12. Six Wanted posters (mode lights), three a side.
13. Shooter lane, plunging round the top into the saloon.
14. Flippers, slings and lanes: stand-in.

### Measured reach

Out of 150 flips per lower flipper: a cradled ball, every timing 4 ms apart, on an empty table with
only the plan's walls, taking the first thing each path touches (ball radius included). An early
guide, not the owner's 11-of-12 bar, which is measured once the geometry is real.

| Shot | Left | Right |
|---|---:|---:|
| Railroad lane | 17 | 30 |
| Jailhouse | 11 | 13 |
| Gold Mine ramp | 0 | 12 |
| High Noon (any window) | 28 | 28 |
| Sheriff and Hardware | 12 | 0 |
| Stagecoach ramp | 17 | 11 |
| Saloon lane | 29 | 10 |

Saloon flipper (pivot at (478, 280), 75 long), 133 flips with the ball rolling in down the
saloon's right lane: 74 hit the Sheriff and Hardware building, 49 the side of High Noon, 7 reach a
High Noon window, **0 reach the Gold Mine**.

Each flipper launches between about 59° and 116° (left) and 64° and 121° (right) from a cradle,
bunched at a few angles (the open flipper-aim question from Cyber Psychosis, `AUDIT.md` section 1).

### Changes from the sketch, and why

- **Gold Pan moved left and smaller** (radius 64): in the sketch the right flipper's Gold Mine shot
  passes through it.
- **Railroad lane mouth moved up** to y ≈ 590: at the bottom left neither flipper can reach it.
- **Jailhouse and Stagecoach mouths turned to face their flipper**: facing straight down, their
  side walls stopped most shots (Jailhouse 7 made / 15 blocked before; Stagecoach 4 / 41).
- **Saloon lane mouth moved down to y 640 and the Stagecoach toward the middle**: the left
  flipper's sharpest right-hand shots (the 60° bunch) run along the right wall, and the
  Stagecoach's rail was in their way (Saloon lane 0 from the left flipper before, 29 after).
- **Bank and General Store are art, not targets**: the Gold Mine shot runs where they'd stand.
- **Plunge and both orbits feed the saloon**, so the saloon flipper gets plenty of play.
- **Saloon flipper moved inside the Saloon lane's wall** (pivot (478, 280)) so the lane can run up
  past it. Its inlane-style guide copies the lower flippers' guide-to-pivot spacing (11.5 out,
  16 up); with less, the ball balanced on the pivot and never reached the bat.

### Open questions (asked on the phone link)

1. What should the saloon flipper shoot? As drawn it can't reach the Gold Mine. Options: a High
   Noon side window facing the saloon, or move High Noon higher and smaller to open a lane to the
   mine.
2. Stagecoach return: keep the long route to the left inlane (three tracks stacked at the back,
   crowding the mine corner), or return to the right inlane?
3. What diverts a ball into the Gold Pan? Suggested: completing the Railroad drop targets.
4. Do the Railroad drop targets block the lane until knocked down?
5. Are the six Wanted posters (Bounty, Gold Rush, Train Robbery, Jailbreak, Stampede, High Noon)
   the six modes, with High Noon the finale?
6. Name: "Dust & Lead"?
7. Colours: start from Oxide (`art/palettes/`)?
