# Squidzombie Pinball

Pinball tables for the [squidzombie.com](https://squidzombie.com) collection. Built as a
web app first (runs in any modern browser, installable on a phone), structured so it can be
wrapped as a native iPhone app later.

## Table 1: Cyber Psychosis

An industrial cyberpunk heist, laid out and coloured after the concept sketch: pale cracked
concrete and heavy riveted steel drawn in ink, brass pipes, glossy red lights, hazard stripes in
muted ochre, and a grey stencil skull between the flippers. It's drawn as a tilted 3D cabinet:
the playfield leans away from you under an upright dot-matrix display, and every wall, post,
bumper, target and ramp has height.

### The playfield

A classic fan shot from the two flippers, plus a small upper playfield at the top left. Left to
right:

- **Back Alley** (right flipper): the left orbit. It runs up the left side and over the top arch
  into the three **CAM** lanes. A diverter can hold the loop open, so the ball comes all the way
  round, down a chute onto the Black Market's wire, and back to the right flipper.
- **The vault lane** (right flipper): a narrow lane up the left side into **THE VAULT**, the
  upper playfield. It's the hardest shot on the table.
- **SAFE**: a standup on the vault lane's wall.
- **The Breach** (right flipper): a scoop between two banks of three standups that spell
  **B-R-E-A-C-H**, each bank angled at the opposite flipper.
- **Black Market** (either flipper): the centre ramp. It runs under the Skyway into the market box
  over the shooter lane, then a wireform takes it down the right side to the right inlane.
- **The Reactor** (left flipper): a captive ball behind three drop targets. Knock the drops down
  and slam the captive ball into the core. **VENT** is a standup on its right flank.
- **Skyway** (left flipper): up the lane beside the shooter lane (past its spinner), straight
  across above the Breach, then down the left side on a wireform to the left inlane.
- **CAM 1–3 and the pops**: three top lanes, fed by the plunge and the Back Alley, drop into three
  industrial pop bumpers in their own nest. The nest's one exit lane drops the ball into the right
  inlane.
- **The cameras**: three security cameras pan over the CAM lanes. Rolling through a lane lights
  it and knocks out the camera above it; the flipper buttons shift the lit lanes left and right,
  as they do R-A-G-E. Light all three for **CAMERAS DOWN**, which opens the **back door** in the
  Back Alley's wall for 20 s.
- **THE VAULT**: the upper playfield, with two small flippers on the main buttons and three
  tumbler targets. Get in up the vault lane, or through the open back door with a Back Alley
  shot. Leave out the top into the CAM lanes, or past its flippers and out the side to the right
  flipper.
- **Cracking the vault**: hit the three tumblers in the order of the code. The code is random
  and changes after every crack; the display shows it (as CODE 3-1-2, say) and the next tumbler's
  light blinks. A wrong one starts the combination over. The vault's hatch opens and three balls
  drop out for **VAULT MULTIBALL** (four in play): every ball shot out the vault's top is a
  jackpot, and the back door stays open so the Back Alley feeds the vault.
- **The Impound**: a three-ball lock, a cage over the orbit on the left. The Skyway feeds it when
  the lock is lit, and at multiball the balls roll back down the Skyway's wire.
- **R-A-G-E**: the in/outlanes. The flippers move the lit lanes. Finish R-A-G-E on a gutter lane
  (an outlane) and RAGE saves that ball.

The shot map, measurements and the rules still to build for this layout are in
[`DESIGN.md`](DESIGN.md).

### The heist (modes)

Modes (jobs) work like the modes on a 90s machine. Light one, start it at the Breach, and the table
changes. Specific shots light in the job's colour, and the lit shots pay the job's own scaled values.
**Jobs have no clock**: a job lasts until you finish it, and you can't move on until you do. Speed
still pays: a job's shots are worth full value for its first 30 s in play, then drain to half over
the next two minutes (the display shows SHOTS PAY 75%, for example).

1. **Light a job**: spell **B-R-E-A-C-H** on the standups. The first one of each game comes lit.
2. **Start it**: shoot the **Breach**. If the map offers two jobs, the flippers choose while the ball is held.
3. **Finish it**: hit the lit shots until the objective is done.
4. **Lose the ball** and the job carries on with the next ball (JOB CONTINUES), but the step you
   were in the middle of starts over: Route's current lap, Hack's current code. Multiballs don't
   carry over: if **Payload**'s multiball ends before its super jackpot, the job fails, doesn't
   count, and the Breach relights so you can start it again from the beginning. A tilt ends a job
   the same way.

The heist map runs **INFILTRATE**, then **HACK** or **ROUTE**, then **PAYLOAD** or **EXTRACT**. Each
row opens only once you've *finished* a job in the row above. Finishing Payload or Extract lights
**BLACKOUT** at the Reactor.

| Job | What to shoot |
| --- | --- |
| **Infiltrate** | Sneak past the cameras. The Back Alley, Black Market, Skyway and Reactor are lit, and the camera watches one of them (strobing red). Make the others: 500K, +150K each. Make the watched one and you're **SPOTTED** (no award, and every later shot pays 100K less). Then shoot the Breach to get **INSIDE** (+3M). |
| **Hack** | The Breach standups become a keypad. Hit the flashing key, four to a code, 250K a key. Codes pay 1.5M, 3M and 4.5M. Shooting the Breach brute-forces a whole code. Three codes and you've **HACKED** it (+3M). |
| **Route** | Plot the escape: Skyway, Back Alley, Black Market, Reactor, in order, twice. 600K a step, rising. **ROUTE SET** (+3M). |
| **Payload** | 2-ball multiball. Both ramps are jackpots (1.5M, +250K each). Three jackpots light the super at the Reactor (3× the jackpot) for 20 s; collecting it finishes the job. Miss it and two more jackpots relight it. The drop targets fall by themselves to let you at it. |
| **Extract** | The getaway: Skyway, Black Market, Breach, in order. Each leg starts at 6M (+1M a leg) and bleeds 200K a second while you aim, down to 1.5M. **EXTRACTED** (+4M). |

#### RAGE's clock

RAGE (below) is the one timed mode. Its clock follows conventions from real machines' rulesheets
and from FreeWPC and the Mission Pinball Framework (open-source pinball control software):

- **Pinball seconds.** Each second on the clock lasts about 1.1 real seconds. Real machines do the same; FreeWPC uses about 1.08.
- **The clock waits** while the ball is held in the Breach, while a ball rolls into the Impound, and while no ball is on the table. It also waits after a kickout or plunge until the ball hits a playfield switch, for at most 2 s.
- **Stuck balls stop the clock.** If every ball has stopped somewhere other than a held flipper, the clock waits until ball search frees it.
- **Cradling does not stop the clock.**
- **Grace period.** When the clock hits 0, RAGE keeps scoring for 2 s.

#### Blackout (wizard mode)

Play a final mode (Payload or Extract) to light **BLACKOUT**, then slam the Reactor's captive
ball into the core. The lights die and it's a 3-ball multiball where the Skyway, Black Market,
Back Alley and Breach are each a jackpot (2M, +500K each). Collect all four to light the super
at the Reactor (5× the jackpot). Every completed mode makes Blackout worth +0.5X, and completing
all five makes it **TOTAL BLACKOUT** with a fourth ball. Afterwards the heist starts over, and
everything is worth 0.5X more.

### The rest of the table

- **The Reactor**: knock down the three drops to expose the core and light the lock. Each time the
  captive ball hits the core, **reactor heat** goes up (100K, +50K a level) and the drops reset.
- **The Impound** (ball lock): with the lock lit, make the Skyway and its top bend diverts the
  ball up a wire into the cage. Lock three for **Impound multiball**: the balls roll back down the
  Skyway's wire to the left flipper, and the Skyway, Black Market, Back Alley and Breach are
  jackpots (1M, +250K each).
  Four jackpots light the super jackpot at the Reactor (3× the jackpot) for 20 s; miss it and two
  more jackpots relight it.
- **The Black Market**: switches earn cash ($1K, bumpers $2K) and major shots $5K. The menu under
  the Black Market's lights rotates every 4 s, and making the Black Market ramp buys whatever is on
  offer if you can afford it: **RAGE** ($60K: starts RAGE, or adds 10 s to it), **ball save** ($50K),
  **light lock** ($40K) or an **extra ball** ($200K, once a game). The **10X** item (next shot ×10)
  is on the menu but not sold until its rule is built.
- **RAGE**: roll the **R-A-G-E** lanes to raise the bonus multiplier (up to 6X) and start a 20 s
  frenzy where every switch pays 100K (bumpers 150K) and every shot 250K. It runs alongside a mode,
  and relighting it adds 10 s.
- **Skill shot**: make the Black Market within 7 seconds of the plunge for 500K and $50K. (The plunge
  now drops into the CAM lanes; a skill shot through the blinking lane replaces this when the rules
  are updated.)
- **Combos**: major shots within 3.5 s of each other build combos (50K × the combo).

### Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Left flipper | `Z`, `←`, left `Shift` | left half of screen |
| Right flipper | `/`, `→`, right `Shift` | right half of screen |
| Plunger | hold `Space` / `↓` / `Enter`, release | hold right half while ball is in the lane |
| Start | `Enter` | tap |
| Nudge | `X` | shake the phone |
| Mute / Pause | `M` / `P` | 🔊 button |
| Flat / tilted view | `V` (or add `?flat` to the URL) | |
| Game speed (100% / 90% / 80%) | | the % button next to 🔊 |

## Development

```bash
npm install
npm run dev        # local dev server (also reachable from your phone on the same Wi-Fi)
npm run build      # typecheck + production build into dist/
npm test           # rule tests for the heist, multiballs, Black Market, RAGE and its clock
npm run sim        # headless soak test: a bot plays and checks for physics leaks
npx tsx scripts/shotmap.ts   # which shots each flipper can reach
npm run measure    # layout measurements: shot windows, returns, pops, Breach, clearances
npm run template   # regenerate the art templates in art/template from the physics
```

No game engine or runtime dependencies: TypeScript, Canvas 2D and Web Audio.

```
src/
  engine/   physics (custom fixed-step pinball solver), dot-matrix display, synth audio, effects
  game/     game flow, scoring, input, modes (the heist / RAGE / Blackout)
  game/tables/  per table: layout geometry, rules and art (psychosis-layout.ts, psychosis.ts, psychosis-art.ts)
```

The physics runs at 480 Hz with layered collision so ramps can pass over the floor, and kinematic
flippers transfer real surface velocity to the ball. Physics is flat 2D. The renderer fakes height
with an oblique 3/4 projection (`lift()` in `draw.ts`), and the CSS 3D tilt in `main.ts` supplies the
perspective. Raised objects are depth-sorted against the ball, and the lighting is layered:
general illumination (which modes can dim or slowly pulse), insert lamps with lamp shows, and flashers.
Nothing that lights or darkens a large part of the screen flashes more than 3 times a second.
All art and sound is generated in code. There are no asset files yet, so swapping in real artwork
later is straightforward.

## Putting it on squidzombie.com

`npm run build` produces a static `dist/` folder with relative paths. Upload its contents to any
folder on the site (for example `squidzombie.com/pinball/`) and link to it.

## Getting it onto the iPhone

1. **Now**: open the site in Safari, then Share → *Add to Home Screen*. It launches full-screen like an app.
2. **App Store**: wrap the same `dist/` build with [Capacitor](https://capacitorjs.com/) to produce a native
   Xcode project (`npx cap add ios`). That requires a Mac with Xcode and an Apple Developer account.
