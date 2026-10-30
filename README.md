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
- **The cameras**: three security cameras pan over the CAM lanes. A lane, or the pop bumper below
  it, knocks its camera out for 12 s. Knock out all three at once for **CAMERAS DOWN**, which
  opens the **vault door** in the Back Alley's wall for 20 s.
- **THE VAULT**: the upper playfield, with two small flippers on the main buttons and three
  tumbler targets. Get in up the vault lane, or through the open vault door with a Back Alley
  shot. Leave out the top into the CAM lanes, or past its flippers and out the side to the right
  flipper.
- **The Impound**: a three-ball lock, a cage over the orbit on the left. The Skyway feeds it when
  the lock is lit, and at multiball the balls roll back down the Skyway's wire.
- **R-A-G-E**: the in/outlanes. The flippers move the lit lanes.

The shot map, measurements and the rules still to build for this layout are in
[`DESIGN.md`](DESIGN.md).

### The heist (modes)

Modes work like the modes on a 90s machine. Light one, start it at the Breach, and the table
changes. Specific shots light in the mode's colour, a clock runs on the DMD, and the lit shots pay
the mode's own scaled values.

1. **Light a mode**: spell **B-R-E-A-C-H** on the standups. The first one of each game comes lit.
2. **Start it**: shoot the **Breach**. If the map offers two modes, the flippers choose while the ball is held.
3. **Play it**: hit the lit shots before the clock runs out. Finish the objective for a completion bonus.

The heist map runs **INFILTRATE**, then **HACK** or **ROUTE**, then **PAYLOAD** or **EXTRACT**.
Playing a final mode lights **BLACKOUT** at the Reactor.

| Mode | Clock | What to shoot |
| --- | --- | --- |
| **Infiltrate** | 45 s | Sneak past the cameras. The Back Alley, Black Market, Skyway and Reactor are lit, and the camera watches one of them (strobing red). Make the others: 500K, +150K each. Make the watched one and you're **SPOTTED** (−5 s, and every later shot pays 100K less). Then shoot the Breach to get **INSIDE** (+3M). |
| **Hack** | 40 s | The Breach standups become a keypad. Hit the flashing key, four to a code, 250K a key. Codes pay 1.5M, 3M and 4.5M. Shooting the Breach brute-forces a whole code. Three codes and you've **HACKED** it (+3M). |
| **Route** | 45 s | Plot the escape: Skyway, Back Alley, Black Market, Reactor, in order, twice. 600K a step, rising. **ROUTE SET** (+3M). |
| **Payload** | none, 2-ball multiball | Both ramps are jackpots (1.5M, +250K each). Three jackpots light the super at the Reactor (3× the jackpot). The drop targets fall by themselves to let you at it. Ends with the multiball. |
| **Extract** | 35 s | The getaway: Skyway, Black Market, Breach, in order. Each leg starts at 6M (+1M a leg) and bleeds 200K a second while you aim, down to 1.5M. **EXTRACTED** (+4M). |

#### How the clocks work

The clocks follow conventions taken from real machines' rulesheets and from FreeWPC and the Mission Pinball Framework (open-source pinball control software):

- **Pinball seconds.** Each second on the clock lasts about 1.1 real seconds. Real machines do the same; FreeWPC uses about 1.08.
- **The clock waits** while the ball is held in the Breach (mode intros and awards cost no time), while a ball rolls into the Impound, and while no ball is on the table. It also waits after a kickout or plunge until the ball hits a playfield switch, for at most 2 s.
- **Stuck balls stop the clock.** If every ball has stopped somewhere other than a held flipper, the clock waits until ball search frees it.
- **Cradling does not stop the clock.**
- **Grace period.** When the clock hits 0, lit shots still count for 2 s, shown by the lit arrows strobing.
- **Progress keeps you alive.** Collecting a lit shot with under 10 s left tops the clock back up to 10. Spelling B-R-E-A-C-H during a mode adds 10 s (and banks the next mode).
- **Time bonus.** Finishing a mode early pays 100K × the seconds left.
- **Warnings.** There's an alarm and a "HURRY UP" message at 10 s, and ticks from 5 down to 1. The lit-shot arrows flash faster under 9, 6 and 3 seconds.

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
  Four jackpots light the super jackpot at the Reactor (3× the jackpot).
- **The Black Market**: switches earn cash ($1K, bumpers $2K) and major shots $5K. The menu under
  the Black Market's lights rotates every 4 s, and making the Black Market ramp buys whatever is on
  offer if you can afford it: **+15 seconds** ($30K, during a timed mode), **ball save** ($50K),
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

## Development

```bash
npm install
npm run dev        # local dev server (also reachable from your phone on the same Wi-Fi)
npm run build      # typecheck + production build into dist/
npm test           # rule tests for the heist, multiballs, Black Market, RAGE and the clocks
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
general illumination (which modes can dim or flicker), insert lamps with lamp shows, and flashers.
All art and sound is generated in code. There are no asset files yet, so swapping in real artwork
later is straightforward.

## Putting it on squidzombie.com

`npm run build` produces a static `dist/` folder with relative paths. Upload its contents to any
folder on the site (for example `squidzombie.com/pinball/`) and link to it.

## Getting it onto the iPhone

1. **Now**: open the site in Safari, then Share → *Add to Home Screen*. It launches full-screen like an app.
2. **App Store**: wrap the same `dist/` build with [Capacitor](https://capacitorjs.com/) to produce a native
   Xcode project (`npx cap add ios`). That requires a Mac with Xcode and an Apple Developer account.
