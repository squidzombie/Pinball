# Dust & Lead: design

The second Squidzombie table, a western. Started 5 November 2026 from the owner's concept sketch,
[`reference/dust-and-lead-sketch.webp`](../../reference/dust-and-lead-sketch.webp).

Layout round 2 is built and playable (no scoring yet). Order of work, as for Cyber Psychosis: layout rounds on a phone link until
the owner approves one, then the rule sheet, then code, then the toys and lights, then the drawing
kit for the owner's painted playfield.

**Phone links:**
- Art round 1 (and layout round 2), playable: https://claude.ai/artifact/JzoEhP414h7DFHdZ3hEWim
- Layout round 1, the plan: https://claude.ai/artifact/DwDXUXjypRkmGgczSxHwK6

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

### 5 November 2026: round 1's questions

The owner handed these to me ("you are welcome to make decisions on these things, be
thoughtful"). Each answer and the reason for it:

1. **The saloon flipper shoots the outlaw: Quick Draw.** High Noon gets a side window facing the
   saloon, and the Sheriff and Hardware building takes the saloon flipper's other shots. Reasons:
   the measurements say the saloon flipper's shots go to High Noon's side wall (49 of 133) and the
   town building (74 of 133), not to the Gold Mine (0), and no rearrangement short of shrinking
   High Noon (the centrepiece) gives it a fair lane to the mine. It also reads well: a gunfight
   from the saloon across the street. The Gold Mine still loops into the saloon (ramp, elevator,
   wire track, saloon flipper), so the "accessible, repeatable shot" from the sketch is kept.
2. **The Stagecoach keeps the long route** up the right, across the back and down the left to the
   left inlane, as sketched. It's the owner's signature toy, it gives the left flipper a ramp that
   feeds itself (a combo loop), and it's raised for nearly all its length, so it costs no floor
   space. The crowding is visual; the art round has to keep the mine corner readable.
3. **The Gold Pan is the Gold Mine's reward.** Every Gold Mine ramp sends an ore cart up; the
   third lights PAN FOR GOLD and the next mine shot drops into the pan. Keeping it on the mine
   means each feature feeds one idea (the Railroad stays Train Robbery's).
4. **The Railroad drop targets block the lane** until all three are down; the open lane is then a
   shot worth making, and the targets reset once it's made. The right flipper's most reliable shot
   (30 of 150) becomes a two-step goal, as on many classic machines.
5. **The six Wanted posters are the six modes:** Bounty, Gold Rush, Train Robbery, Jailbreak and
   Stampede, then High Noon as the finale. The rule sheet comes after the layout is approved.
6. **The name is Dust & Lead,** from the sketch.
7. **Colours start from Oxide** (rust brown and turquoise), set aside for this table in October.

### 6 November 2026: art round 1 (built; for review)

The owner played round 2: the feel and speed are right ("great"), the board is "soooo boring", with
three real machines as the bar (Walking Dead, Big Guns, Aerosmith). Two answers from the owner:
**I design the printed playfield too** (in code; a painting can still replace it with the kit), in a
**bold cartoon western** look: saturated sunset colours under heavy ink lines.

Built in `dust-art.ts`, with no change to the physics (measurements and soak test unchanged):

- **Printed playfield:** a sunset sky with a striped sun going down behind High Noon, red mesas,
  sun rays fanning across the desert from the logo, a dirt Main Street between boardwalks, a
  turquoise river from the mine into the Gold Pan's pool, the railroad bed with a locomotive, cacti
  and a longhorn skull, turquoise inlanes and red outlanes, and the logo on a plank over crossed
  revolvers. Apron cards with the table's story.
- **About 50 inserts:** at every shot an arrow in the shot's colour, a jackpot light and a Wanted
  star; a reward ladder of sheriff's stars up Main Street (2X to 6X); six Wanted posters above the
  logo; ore-cart and PAN lights; TRAIN; Hardware and Sheriff; inlane arrows, outlane SPECIALs,
  the skill shot and Shoot Again. Until the rule sheet they show what the table is doing: an arrow
  flashes when its shot is made, the Railroad lights blink while the lane is open, the ore carts
  count up, the ladder climbs a star for every three shots made in a ball, Shoot Again shows the
  ball save, and the Wanted posters take turns (a preview of the modes).
- **Toys:** High Noon as a false-front building with a clock and porch, the outlaw in its windows;
  the Gold Mine's timber mouth and headframe, its wheel turning while a minecart carries the ball
  up; a brick jail with a barred roof (a held ball shows through the bars); the Sheriff's office
  with its star; a stagecoach on a plastic shelf that rocks after a ramp; red-capped barrel pops;
  a SALOON sign with chasing bulbs; swinging saloon doors.
- **Ramps and light:** the Stagecoach as a chrome wireform, the Gold Mine as a timber trestle, the
  wire track in chrome; five flashers (mine, High Noon, saloon, jail, stagecoach) that fire on their
  shots; warm general illumination under the rails and plastics; painted sling plastics.

### 5 November 2026: layout round 2 (built; for review)

The owner asked me to carry on and make the calls ("be thoughtful"). Each one, and why:

1. **One app, a table picker on the start screen** (decision 3). `src/game/tables/registry.ts`
   lists the tables; Cyber Psychosis is the default and is unchanged: 216 of 216 tests, every
   deterministic measurement identical, a clean soak test. Each table keeps its own high score,
   display colour (Dust & Lead's is Oxide turquoise), painted-art path and attract text.
2. **The lower playfield keeps the proven flippers, slings and lane spacing, and adds outlane
   guards.** "All new" (decision 4) applies to the look; the geometry under the flippers is
   flipper feel and is measured, so I changed it only where a measurement said to. On a 6.5° table
   a rebound keeps its sideways run, and balls rolling down the side walls dropped straight into
   the outlanes. Measured without and with the guards: High Noon and drop target rebounds to an
   outlane 17% and 2%; pop exits 3 of 12 and 0; saloon misses 8 of 12 and 0. A kickback or new
   sling shapes are left as questions below.
3. **The saloon is a hub behind two one-way doors.** The Railroad lane, the plunge and the Saloon
   lane all come in over the top and can't go back out, so every ball that gets there drops onto
   the saloon flipper. (Built with one post, as in round 1's plan, every plunge bounced back down
   the shooter lane.) The Saloon lane and the shooter lane bend left at the top so balls are carried
   round into the saloon; straight, they hit the flat top wall and came back down.
4. **The saloon flipper is 75 long, with the lower flippers' pivot, and its guide ends over the
   bat.** With a steep guide ending by the pivot (the saloon's wall leaves no room for the lower
   flippers' 40° guides), a cradled ball balanced on the pivot and flips barely moved it.
5. **Quick Draw is most of High Noon's right side** (90 tall), since it's the saloon flipper's
   main target.
6. **The Gold Mine and Stagecoach entrances sit on the flippers' measured shot lines** (the mine
   on the right flipper's 99-100° shots, the Stagecoach on the left flipper's 72° line with a
   funnel mouth). The Stagecoach's floor-level foot is short, so it doesn't push rebounds aside.
7. **Gold Pan: three pins and three cups,** placed by measurement: Nuggets 52%, Riches 33%, Extra
   Ball 15% over 100 drops, every gap wider than a ball.
8. **Physics constants that depend on the slope:** plunge 1150-2400 units/s (Cyber Psychosis
   1250-3300; half pull and up reach the saloon), auto-plunge 2150, ramp landing 600 (900 bounced
   balls off the flipper's pivot), pop kick 700 (Cyber Psychosis 900; chosen, not measured
   against 900). Flipper strength and the ramps' climb constant are unchanged.
9. **The Railroad drop targets reset once the lane's been run** and nothing's in their way, and
   every third Gold Mine trip turns the next one into the pan, so both can be seen working before
   there are rules.

## Layout round 2 (5 November 2026): playable

The layout as real geometry and physics at 6.5°, drawn plainly in the Oxide colours: placeholder art
until the owner approves the layout. The display names each shot as it's made. No scoring, modes or
locks yet; the Jailhouse holds a ball for a second and lets it go.

Code: `src/game/tables/dust-layout.ts` (geometry), `dust.ts` (physics and the toys' mechanisms),
`dust-art.ts` (drawing). Tools: `scripts/dust-measure.ts`, `scripts/dust-gaps.ts`, and
`TABLE=dust npm run sim`.

### Measurements (the owner's bar, `HANDOFF.md` section 6)

| Check | Target | Result |
|---|---|---|
| Stagecoach returns to its inlane | 11 of 12, 0 drains | **12 of 12** to the left flipper at 2400 and 3000 units/s; at 1800, 4 made and all 12 to a flipper |
| Gold Mine round trip (lift, wire, saloon) | | **12 of 12**; with the saloon flipper left alone, 12 of 12 then reach a lower flipper |
| Orbits reach the saloon | 11 of 12 | **12 of 12**, both lanes, at 1800, 2400 and 3000 |
| Plunge | 12 of 12 from 50% to 100% | **12 of 12 from 30% to 100%**; under 30% it falls back to the plunger; never stuck |
| Pops exit toward an outlane | at most 1 of 12 | **0 of 12** (about 11 pops a visit) |
| Jailhouse kickout reaches a flipper | 10 of 12 | **12 of 12** |
| Gold Pan exit reaches a flipper | | **24 of 24** (cups: 11 Nuggets, 9 Riches, 4 Extra Ball) |
| Target rebounds | not down the middle | **0 down the middle**; 10 of 537 to an outlane (2%) |
| Saloon misses (not flipped) | | **12 of 12** reach a lower flipper |
| Bot play | 0 leaks, 0 stuck | **0 and 0** in 50 minutes (it found two: balls driving into the mine house, and slipping past the jail's catch; both fixed) |
| Clearances | every gap listed in balls | every gap is wider than a ball (the tightest 1.07, the Gold Pan's middle cup) or closed; `scripts/dust-gaps.ts` |

### Shot map

Every flip timing 2 ms apart, from a cradled ball and from a ball rolling off the inlane, flipper
let go after the stroke as a player does. Share of timings that make the shot (cradle / live):

| Shot | Left flipper | Right flipper |
|---|---|---|
| Saloon lane | 19% / 1% | 7% / 0% |
| Railroad lane (drops down) | 9% / 0% | 19% / 2% |
| Railroad drop targets | 12% / 1% | 21% / 4% |
| High Noon windows | 16% / 5% | 11% / 5% |
| Stagecoach ramp | 9% / 6% | |
| Gold Mine ramp | | 9% / 3% |
| Jailhouse | 5% / 12% | 6% / 3% |
| Sheriff and Hardware | 5% / 7% | 6% / 1% |

Saloon flipper (ball from the wire): Quick Draw 12% / 12% of timings, High Noon 5% / 5%; a third of
flips that send the ball away hit Quick Draw. Unflipped, the ball rolls off into the pops.

Cyber Psychosis for comparison: Skyway 19% / 2%, Black Market 9% / 16%.

### Compromises and questions for the owner

1. **The flippers' favoured angles** (Cyber Psychosis's open question, `AUDIT.md` section 1) shape
   this table too: the left flipper's 70° shots go to the pops rather than the Stagecoach, which
   tops out at 9%. Widening its mouth further didn't help. If you decide to smooth the flippers'
   aim, the shot map changes and I'd re-aim.
2. **Live shots are harder than cradled ones,** most of all the orbits (Saloon lane 1% live). At
   6.5° a ball off the inlane is slow and the timing window is short. Worth feeling on the phone.
3. **How far to take "all new" under the flippers:** a kickback in the left outlane (with the
   Stagecoach feeding the left inlane, it would suit), or new sling shapes, are options. Today it's
   the proven geometry plus the guards.
4. **The Stagecoach wants a firm shot** (about 1850 units/s at its mouth). Short shots roll back
   down to the left flipper (11 of 12 at 1800), so a miss isn't punished.
5. **Pop strength** is 700 against Cyber Psychosis's 900, my guess for a gentler table.
6. **The art is a placeholder.** After the layout's approved: the rule sheet, then the toys and
   lights in code and the drawing kit for your painted playfield.

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
