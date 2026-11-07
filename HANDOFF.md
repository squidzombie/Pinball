# Handoff: building the next Squidzombie table

Written 5 November 2026 by the session that built Cyber Psychosis, for the session that builds
the next table. Read this first, then `README.md`, then skim `DESIGN.md` and `AUDIT.md`.

If "the next table build" turns out to mean the next build of Cyber Psychosis rather than a new
table, everything here still applies except section 12; section 10 lists that table's open
threads.

## 0. The first five minutes

**All the work is on the branch `claude/gifted-dijkstra-sxn6no`, not on `main`.** `main` has only
the very first commit (the old Neon Foundry prototype). This branch is 38 commits ahead and has
never been merged; there is no pull request. Start your branch from it:

```bash
git fetch origin claude/gifted-dijkstra-sxn6no
git checkout -b <your-branch> origin/claude/gifted-dijkstra-sxn6no
npm install
npm test            # expect: 216 passed, 0 failed
npm run build       # typecheck + build into dist/
```

Ask the owner whether they'd like this branch merged into `main` first. Don't open a pull request
unless they ask.

**Before you write any geometry, get four answers from the owner** (section 12 says why):

1. **Which table.** Two themes are set aside, with colour schemes already made in `art/palettes/`:
   - **Toxic Yard** (greens): a post-apocalyptic fallout-shelter vault table.
   - **Oxide** (brown and turquoise): a western table.

   Cyber Psychosis started from the owner's concept sketch (`reference/sketch.png`). Ask whether
   there's one for this table.
2. **The table's slope.** Cyber Psychosis plays far steeper than a real machine (section 5), and
   testers noticed. The new table's layout must be aimed for its own slope, so settle the slope
   before the layout, not after.
3. **How players choose a table:** one app with a table picker, or a separate app per table. The
   App Store Connect app record is already named "SquidZombie Pinball", which suits a collection.
4. **What to reuse:** the same lower playfield block, cabinet and display style, or something new.

## 1. Working with the owner

The owner is squidzombie (GitHub `squidzombie`, site squidzombie.com). They design the tables, play
on an iPhone, paint the art, and ship through TestFlight from their own Mac. They aren't a
developer:
- write in plain words;
- give click-by-click or copy-and-paste steps for anything they do on their Mac;
- when something is technical, say what it means for the game.

**Standing rules they've set:**

- **Don't change the physics feel without asking.** That covers flipper strength and stroke,
  slope and gravity, kick strengths, and the ball. Measure, then propose; they decide.
- **Layout first, then rules, then art.** "Don't start the art pass until I approve this
  layout." Each layout round goes to them for review on the phone link before anything is built
  on it.
- **The art is theirs to paint.** The code draws the toys and lights; they paint the printed
  playfield with the drawing kit (section 8). Don't generate or paint playfield art for them.
- **Do what's asked, and offer extras in one line.** Late in the last session I sent an
  unrequested project zip and a code change along with what they'd asked for, and it confused
  them. Ask before adding deliverables or changing the game in ways they didn't ask for.
- **They like evidence:** "12 of 12 ramp shots return to the flipper" and shot percentages, but
  in a short summary, with the detail in `DESIGN.md`.
- **Every decision they make gets recorded** with its date in `DESIGN.md`'s Decisions section,
  and the open questions are listed for them (as in `AUDIT.md`, "For your decision").

**Tester feedback so far** (build 0.20 on TestFlight): the table "looks boring", which is why the
art kit exists, and "feels too steep", which led to the slope trial.

## 2. What's in the repo

| Path | What it is |
|---|---|
| `src/engine/` | Table-independent: `physics.ts` (2D pinball solver), `dmd.ts` (128 × 32 dot-matrix display), `audio.ts` (synthesised sound and music), `fx.ts` (particles, glows) |
| `src/game/game.ts` | Game flow: attract, three balls, ball save (12 s), plunger, tilt, bonus, high score, display messages, the speed setting |
| `src/game/modes.ts` | The `Mode` base class and Cyber Psychosis's jobs, RAGE and Blackout |
| `src/game/input.ts` | Keyboard, touch halves, shake to nudge |
| `src/game/format.ts` | Score formatting |
| `src/game/tables/table.ts` | The `Table` base class: world, lamps, GI, flashers, render pipeline and cache, painted floor art |
| `src/game/tables/draw.ts` | Drawing primitives in fake 3D: walls, rails, posts, bumpers, flippers, slings, lamps, flashers, ball |
| `src/game/tables/geom.ts` | Geometry helpers, and `buildLowerSection()`: the standard flippers, slings, inlanes and outlanes |
| `src/game/tables/psychosis-layout.ts` | Cyber Psychosis's geometry: every wall, lane, target and ramp path, as data |
| `src/game/tables/psychosis.ts` | Cyber Psychosis itself: colliders and sensors built from the layout, switch handlers, rules, lamps, multiballs, physics hooks |
| `src/game/tables/psychosis-art.ts` | Its code-drawn art |
| `src/main.ts` | Page set-up: canvases, the CSS-tilted cabinet view, buttons, painted-art loading, the frame loop |
| `index.html`, `src/style.css` | The page and the start screen (Cyber Psychosis's title, controls and rules summary) |
| `scripts/` | `rules.ts` (`npm test`), `sim.ts` (`npm run sim`), `measure.ts` (`npm run measure`), `shotmap.ts`, `template.ts` (`npm run template`), `gaps.ts`, and `single-file.py` (the phone-link page) |
| `DESIGN.md` | The design record: layout rounds 1–15, shot map, measurements, rule sheet, scoring, art direction, decisions |
| `AUDIT.md` | The 30 October audit of every element and rule, with the owner's open decisions |
| `docs/manual/` | The game manual, a 20-page booklet styled after a real cabinet's, as HTML and PDF, with the tools that make it |
| `docs/MAC-SETUP.md`, `docs/TESTFLIGHT.md` | The owner's Mac and TestFlight guides |
| `art/kit/` | The playfield drawing kit (PSD and PNG guide layers) and the tools that build it |
| `art/template/` | Technical templates from the physics: every collider, lane and insert, plus `inserts.json` and `gaps.json` |
| `art/palettes/` | Six colour-scheme previews of Cyber Psychosis, including the two set aside for future tables |
| `art/app/` | The app icon (the table's brain) and launch screen |
| `art/PROMPT.md` | Out of date: an abandoned plan to generate the art with an image model |
| `reference/sketch.png` | The owner's concept sketch for Cyber Psychosis |
| `ios/`, `capacitor.config.ts` | The iPhone app (Capacitor 8.5.3, Swift Package Manager) |
| `public/` | Icons, web manifest, and `public/art/` for a painted playfield |
| `Open in Xcode.command`, `Preview in Browser.command` | The owner's double-click scripts on the Mac |

There are no runtime dependencies and no game engine: TypeScript, Canvas 2D and Web Audio, built
with Vite.

## 3. How a table is made (Cyber Psychosis as the example)

**Coordinates.** A table is 600 × 1200 units, and one unit is about a millimetre (real playfields
are 514 mm wide). x runs left to right and y from the back of the cabinet down to the flippers.
- The playfield floor is x 20–580 from y 18 down; outside that is cabinet.
- The ball is 28 units across (`BALL_R = 14`).
- The flippers' centre line is `CX = 277.5`, and the shooter lane is on the right.
- Lower flippers are 88 units long, pivoting at y 1056; `buildLowerSection()` places them.

**Three files per table:**

1. **`<table>-layout.ts`**: pure geometry and constants: polylines (`P[]`), arcs, target
   positions, ramp paths with a height (`z`) at every point, insert positions. No game logic. The
   tests and measurement scripts import it directly.
2. **`<table>.ts`**: a class extending `Table`.
   - The constructor turns the layout into colliders (`poly()`, `world.seg()`,
     `world.circle()`) with `onHit` handlers.
   - It adds `LineSensor`s (rollovers, ramp entries and exits, gates) and `ZoneSensor`s (scoops,
     locks), and builds the lamps.
   - The rest is rules: switches call shot and switch handlers, which feed the modes.
   - Physics hooks: `world.force` for per-ball forces (ramp slopes) and `substep()` every physics
     step.
3. **`<table>-art.ts`**: the code-drawn art, called from the table's render hooks:

   | Hook | What it draws |
   |---|---|
   | `drawStatic` | the floor, cached once; this is what a painted playfield replaces |
   | `drawRamps` | ramps and plastics over the floor, cached |
   | `drawDynamic` | animated floor-level things |
   | `sprites` | raised moving things, depth-sorted with the balls |
   | `drawTop` | anything over everything |

**What `Game` calls on its table** (the table's de facto interface, in `game.ts`):
- the world and balls: `world`, `addBall`, `shooter`, `inShooterLane`, `flippers`,
  `onHeldFlipper`, `update`, `render`;
- the game flow: `resetForGame`, `resetForBall`, `armSkillShot`, `onPlunge`, `onFlipperPress`,
  `ballLost`, `ballHeld`, `releasing`, `plungerPull`;
- modes and multiballs: `endModes`, `endMultiball`, `multiball`;
- sound and display: `music`, `drawDMD`, `attract`.

**Physics** (`src/engine/physics.ts`):
- A fixed 480 Hz step, with balls as circles against segments, circles and kinematic flippers.
  Flippers turn at 30 rad/s up and 17 rad/s down, and pass on real surface velocity.
- Colliders take `layers`, `restitution`, `friction`, `kick` and `kickThreshold` (slings and
  bumpers), `oneWay` (gates), `tag` and `onHit`.
- **Layers** (`FLOOR`, `RAMP`, `RAMP2`) let ramps pass over the floor. A ball's layer changes at
  a ramp's entry line sensor.
- Ramps get their climb and descent from their `z` profile through the table's `rampForce`,
  which uses a constant of 7000 that matches real ramps.
- `ball.captured` freezes a ball (held in a scoop or lock).
- Speed is capped at 4600 units/s.

**Rendering.** Physics is flat 2D:
- `lift(z) = z × 0.5` fakes height in an oblique projection, and the CSS 3D tilt in `main.ts`
  adds perspective.
- Light is layered: general illumination (`gi`), insert lamps with lamp shows, and flashers.
- **Flash safety:** nothing that lights or darkens a large part of the screen flashes more than
  3 times a second. `rules.ts` has a "Flash safety" test.

**Modes.** `Mode` (in `modes.ts`) lights shots, pays scaled values and runs a clock that follows
FreeWPC and Mission Pinball Framework conventions:
- one "pinball second" lasts 1.1 real seconds;
- shots still count for a 2 s grace after zero;
- the clock waits while a ball is held, while no ball is on the table, and while every ball is
  stuck.

The heist's jobs are untimed. `README.md` documents all of it.

## 4. Cyber Psychosis is hard-wired in; a second table needs a small refactor first

| Where | What's specific to Cyber Psychosis |
|---|---|
| `src/game/game.ts` | `main: Psychosis`, `new Psychosis(this)`, the high-score key `sz-pinball.cyber-psychosis.high`, and the display colour `dmd.color = [255, 52, 36]` |
| `src/game/modes.ts` | The `Shot` names, and `Mode`'s constructor takes a `Psychosis` |
| `index.html` | Title, start screen copy, rules summary and the manual link |
| `vite.config.ts` | `MANUAL` points at Cyber Psychosis's PDF |
| `scripts/*.ts` | All import `psychosis-layout`; `rules.ts` tests Cyber Psychosis's rules |
| `art/kit/tools/` | `build-kit.py`'s label list; `render-guides.cjs` renders `window.game.main` |
| `capacitor.config.ts`, `ios/` | App name "Cyber Psychosis", bundle ID `com.squidzombie.cyberpsychosis`, the brain icon |

**A suggested path** (agree it with the owner):
1. Add a small table registry. Each entry gives an id, a title, the table class, its display
   colour, its high-score key, its gravity, its manual and its start-screen copy.
2. Make `Game` build its table from the registry.
3. Type `Mode` against an interface instead of `Psychosis`.
4. Give each table its own folder of scripts, or make the scripts take a table id.

Do it in small steps, with Cyber Psychosis unchanged at each one: `npm test` stays at 216/216,
`npm run sim` shows no leaks or stuck balls, and `npm run measure` gives the same shot windows.
Keep its localStorage keys (`speed`, `pitch` and the high score) so players keep their scores.

The iPhone app's bundle ID can't change for the existing App Store Connect record. Players never
see it, so a multi-table app can keep `com.squidzombie.cyberpsychosis`, but the app name and icon
would change. That's the owner's call (section 0, question 3).

## 5. The slope: the most important physics finding

The table's pull down the playfield is `GRAVITY = 2000` units/s² (`physics.ts`).
- **Compared with a real ball rolling down a real table, that's about 16°.** Real tables sit at
  6–7°, about 835 units/s² in these units.
- The rest is close to real: the ramps' climb constant, and the flippers' length and speed.
- So the ball drops from the top to the flippers in 1.0 s, where a real table takes about 1.6 s.
  That's what testers call "too steep".

**What happened in the last session:**
1. A trial of 85% pull was too small a change ("didn't feel much different").
2. The phone link now has a trial ° button that gives 16°, 12°, 9° and 6.5°, which pull 100%,
   75%, 57% and 41% (`gravityAt(deg)` in `physics.ts`).
3. The button only exists in trial builds, `VITE_SLOPE=6.5 npm run build`, which always start at
   the slope they were built for. Normal builds and the app play at 16° exactly as before.
4. **On 7 November the owner chose 6.5° for Cyber Psychosis,** to match Dust & Lead, which they
   find plays much better. The phone link plays at 6.5° with the layout unchanged; re-aiming the
   shots for it comes next.

**Why the layout depends on it.** With a weaker pull the ball flies straighter, so shots aimed at
16° miss. Cyber Psychosis's shots at 6.5° with the layout unchanged (`SLOPE=6.5 npm run measure`;
cradled / live share of flip timings):

| Shot | 16° | 6.5° |
|---|---|---|
| Skyway (left) | 19% / 2% | 0% / 1%: the one shot that's lost |
| Breach (right / left) | 9% / 13%, 0% / 3% | 1% / 1%, 3% / 14%: it moves to the left flipper |
| Black Market (left / right) | 9% / 16%, 12% / 4% | 18% / 24%, 15% / 13% |
| Back Alley (right) | 10% / 4% | 18% / 1% |
| Reactor (left) | 10% / 10% | 7% / 10% |
| Vault lane (right) | 1% / 0% | 1% / 1% |

Ramp returns, the plunge, the pops and the Breach's kickout all still meet the bar, and bot play
finds no leaks or stuck balls.

**Measure at the slope you play.** The measuring scripts flip within time windows; a gentler
table needs longer ones, since the ball rolls down the bat more slowly. `scripts/measure.ts` now
stretches every timing by `sqrt(GRAVITY / gravity)`, so its 16° results are unchanged. Before that
fix it reported the Back Alley and the Skyway as impossible at 6.5°, which was wrong for the
Back Alley; figures this session gave for 12° and 9° came from the old windows too.

**For the new table:**
- Agree the slope first.
- Set it as that table's gravity from day one.
- Tune every shot at that gravity.

Anything that fakes gravity by hand must scale with `world.gravity / GRAVITY`, or it breaks at
other slopes. Two examples:
- Cyber Psychosis's captive ball (`substep`);
- its Back Alley chute, which climbs while running down the table: at 4.5° balls rolled back out
  of its top until it was scaled.

**The other open physics question.** From a cradle, each flipper's launch angle jumps between a
few favoured angles instead of sweeping smoothly (`AUDIT.md`, section 1). That will affect any
table built on this engine. It's flipper feel, so it's the owner's decision; they haven't made
it.

## 6. The quality bar: the owner's thresholds

These come from `DESIGN.md`'s measurements table, and the owner set them. Hold a new layout to the
same bar before you show it:

| Check | Target |
|---|---|
| Each ramp returns to its inlane | at least 11 of 12 made shots, 0 drains |
| Orbit reaches the top lanes | at least 11 of 12 |
| Plunge reaches the top lanes | 12 of 12 from 50% to 100% pull; no pull strength leaves the ball stuck |
| Pop bumper nest exits toward an outlane | at most 1 of 12 |
| Pops | busy for a few seconds, never trapped |
| Scoop kickout reaches a flipper | at least 10 of 12 |
| Target rebounds | not down the middle |
| Upper playfield drain reaches a flipper | 12 of 12 |
| Bot play | 0 leaks and 0 stuck balls in long runs |
| Clearances | every gap listed in balls (28 units); the template draws a ball at each |

**How the numbers are made** (`scripts/measure.ts`):
- every flip timing 2 ms apart, from a cradled ball and from a ball rolling off the inlane, each
  followed to see what it hits;
- 12-run follow-throughs for each shot.

`DESIGN.md` section 1 and `AUDIT.md` show how results are reported to the owner.

**Tools:**
- `npm test`: rule tests, 216 checks. Every rule has one, and every bug fix starts with a test
  that fails on the old code.
- `npm run sim [seconds]`: a random bot plays and reports leaks and stuck balls. It's random, so
  compare runs statistically, not by diff. `SLOPE=9` plays at another slope.
- `npm run measure [section]`: the sections are windows, ramps, alley, plunge, pops, breach,
  upper and gaps. `SLOPE=9` measures at another slope.
- `npx tsx scripts/shotmap.ts` and `npm run template`.

**In the browser:** `?debug` draws every collider and sensor, `?flat` gives the flat view,
`?noart` ignores a painted playfield, and `window.game` exposes the game for Playwright.

## 7. Rule conventions worth carrying over

These are Cyber Psychosis's, and the owner chose them over 15 design rounds (`DESIGN.md`, section 0
and Decisions):
- Modes work like a 90s machine's. You light one with a key and start it at a scoop. It lights its
  own shots in its colour and pays scaled values.
- Jobs have no clock; you must finish one to move on. They carry over a lost ball, but the step in
  progress starts over.
- Only one mode is timed, and its clock follows the conventions in section 3.
- One extra ball a game from each source. Skill shot on the plunge.
- Lane change on the flipper buttons, as on real machines.
- A wizard mode at the end, after which the cycle restarts with values stepped up.

## 8. Art

There are two layers, as on a real machine:

1. **The printed playfield,** painted by the owner. If `public/art/playfield.png` (or `.jpg`)
   exists, it replaces the table's `drawStatic` floor art, drawn over the whole 600 × 1200 frame
   (1800 × 3600 pixels). Without one, the code's own floor art draws. You can try a painting by
   dropping it on the game in a browser.
2. **Everything on top,** drawn in code: rails, walls, ramps, toys, the apron and every light.

**The drawing kit** is in `art/kit/`; `art/README.md` explains it.
- It's a layered PSD (it opens in Procreate and Photoshop) with guides rendered from the game, so
  they line up exactly.
- To rebuild it: run `art/kit/tools/render-guides.cjs`, with the dev server running, then
  `build-kit.py`. That needs Python with Pillow, NumPy and psd-tools 1.23.1, which isn't a repo
  dependency.
- **For a new table:** point the renderer at that table and write its label list.
- The PSD is 31 MB, so don't regenerate it casually: every version stays in git history.

**Colour schemes:** see `art/palettes/README.md`. It has swatches for Toxic Yard and Oxide.

**The owner's current art work:** they're painting Cyber Psychosis's playfield with the kit. When
they send a picture, it goes in `public/art/playfield.png`. Check that nothing important sits
under a rail or light, and that the lights still read on top of it.

## 9. Shipping

**Web.** `npm run build` makes a static `dist/` with relative paths, which can be hosted in any
folder (squidzombie.com/pinball/, for example).

**The phone link.** This is how the owner reviews each round: a private claude.ai artifact.
- Cyber Psychosis's is https://claude.ai/artifact/JEd3eHXwEfU7TAvfDxrBJQ. It currently holds the
  slope-trial build at 9°.
- Build it like this, then publish `page.html` with `dist/manual.pdf` beside it as `manual.pdf`:
  ```bash
  npm run build && python3 scripts/single-file.py dist page.html
  ```
- **Give a new table its own artifact,** and leave this one to Cyber Psychosis unless the owner
  says otherwise.
- The single-file page loads only `manual.pdf` and an optional `art/playfield.png` (or `.jpg`),
  both from the artifact's own host. A missing playfield is a harmless 404.

**iPhone (TestFlight).** The owner does this on their Mac; you can't build iOS in a Linux
container.
- Version 0.20 (1) is live for the internal group "Pinball Testers" in the App Store Connect app
  "SquidZombie Pinball".
- They double-click `Open in Xcode.command`, choose Product, Archive, then Distribute App to App
  Store Connect. `docs/MAC-SETUP.md` and `docs/TESTFLIGHT.md` cover it click by click.
- Each upload needs a higher build number.
- The app is a Capacitor shell around `dist/`. One app-local plugin, `ManualPlugin` in
  `ios/App/App/SceneDelegate.swift`, opens the manual PDF in iOS's QuickLook viewer.

**Manual.** `docs/manual/README.md` has the steps that rebuild its pictures and PDF. Its text is
written by hand from the code, so any rule change means editing `index.html`.

## 10. Cyber Psychosis: open threads (not part of a new table unless asked)

- **The slope** (section 5): waiting for the owner to pick one; then re-aim the shots for it.
- **The painted playfield:** waiting for the owner's art.
- **`AUDIT.md`, "For your decision":**
  1. flipper aim from a cradle;
  2. the drop targets feed the right outlane;
  3. smaller questions: the unused Back Alley diverter, locked balls taken by other multiballs,
     the path to TOTAL BLACKOUT, the skill shot after a lock, what the step-up after Blackout
     scales, SAFE and VENT as Hack keys, and the 10X item.
- **Rules not built yet** (`DESIGN.md` and `README.md`):
  - the 10X shop item is listed but never sold;
  - the skill shot should move to the blinking CAM lane;
  - the Back Alley diverter is never used.
- **Code tidy-up,** with no effect on play: `AUDIT.md` section 5 lists the unused code.

## 11. Gotchas

- **The dev server** is `npm run dev` (Vite with `--host`, port 5173). In a cloud container it
  stops between commands; start it detached:
  `(setsid nohup npx vite --port 5173 > vite.log 2>&1 < /dev/null &)`, then check it with curl.
- **Don't `pkill -f` a pattern that matches your own command line;** it kills your shell.
- **Playwright with Chromium** is preinstalled in these containers. The manual, kit and icon tools
  all use it.
- **New localStorage keys:** give a new table its own high-score key, and don't reuse `speed` or
  `pitch` for anything else.
- **Keep model names out of the repo:** commits, code, docs.
- **Tests come before every rules fix.** In the audit each fix came with a test that failed on the
  old code. Keep that habit.
- **Two names you'll see:** "Foundry" and "the Pit" were earlier prototype tables, now removed.
  The phone link's page file is still called `neon-foundry.html` for that reason.

## 12. A suggested plan for the next table

This is the order Cyber Psychosis went in, minus its detours. Show the owner each phase on a phone
link before starting the next.

1. **Decisions** (section 0): theme and sketch, slope, one app or separate apps, what to reuse.
   Record them in a new design document for the table (a section of `DESIGN.md`, or its own file).
2. **Refactor for multiple tables** (section 4), with Cyber Psychosis unchanged: tests, sim and
   measurements identical.
3. **Layout:** geometry in the new layout file at the agreed gravity.
   - Show it with plain placeholder drawing.
   - Measure everything against section 6's bar.
   - Report the shot map, clearances and compromises plainly.
   - Then wait for approval.
4. **Rules:** the rule sheet first, for the owner to approve, then the code with a test for every
   rule.
5. **Toys and lights in code,** plus the drawing kit for the new table, so the owner can paint
   its playfield.
6. **The manual, the app** (icon, start screen, table picker if chosen), **and TestFlight.**
