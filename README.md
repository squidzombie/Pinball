# Squidzombie Pinball

Pinball tables for the [squidzombie.com](https://squidzombie.com) collection. Built as a
web app first (runs in any modern browser, installable on a phone), structured so it can be
wrapped as a native iPhone app later.

## Table 1: Neon Foundry

A grimy industrial table about a foundry run by the Syndicate, with an underground fight
club below it. Rust, soot, sodium light and molten metal, with neon only where a real sign
would be. It's drawn as a tilted 3D cabinet: the playfield leans away from you under an
upright dot-matrix display, and every wall, post, bumper, target and ramp has height.

### Jobs (modes)

Jobs work like the modes on a 90s machine. Light one, start it at the scoop, and the table
changes. Specific shots light in the job's colour, a clock runs (shown on the DMD and in the
ring of lamps on the job board), and the lit shots pay the job's own scaled values.

1. **Light a job**: spell **H-I-T** on the three standups beside the ramp. The first job of each game comes lit.
2. **Start it**: shoot the **scoop**. While the ball is held, the flippers choose which unplayed job to take.
3. **Play it**: hit the lit shots before the clock runs out. Finish the objective for a completion bonus.

| Job | Style | What to shoot |
| --- | --- | --- |
| **Shakedown** | moving target | One lit shot that moves every 4 s. 600K, +300K each. Collect 5 for **PAID IN FULL** (+2.5M). |
| **Hot Metal** | hurry-up | Ramp or right orbit, starting at 5M and cooling toward 1M. Then **pour it** at the scoop for double. |
| **Blood Money** | collect all, **no clock** | All six field shots are lit and each pays once. The payout bleeds away while you aim (1.5M, +250K per shot taken, −25K a second, never below 500K). Take all six for **CLEAN SWEEP** (+5M). Ends on completion or drain. |
| **Blackout** | lights out | The GI goes dark. Chain the orbits, ramp and reactor within 6 s for 1M × chain (up to 5X). |
| **Sabotage** | build & cash | Targets and bumpers build a charge, and the scoop detonates it. Detonate twice for **TOTAL SABOTAGE**. |

#### How the clocks work

The clocks follow conventions taken from real machines' rulesheets and from FreeWPC and the Mission Pinball Framework (open-source pinball control software):

- **Pinball seconds.** Each second on the clock lasts about 1.1 real seconds. Real machines do the same; FreeWPC uses about 1.08.
- **The clock waits** while the ball is held in the scoop (job intros and awards cost no time) and while no ball is on the table. It also waits after a kickout or plunge until the ball hits a playfield switch, for at most 2 s.
- **Stuck balls stop the clock.** If every ball has stopped somewhere other than a held flipper, the clock waits until ball search frees it.
- **Cradling does not stop the clock.**
- **Grace period.** When the clock hits 0, lit shots still count for 2 s, shown by the whole clock ring strobing.
- **Progress keeps you alive.** Collecting a lit shot with under 10 s left tops the clock back up to 10. Spelling H-I-T during a job adds 10 s.
- **Time bonus.** Finishing a job early pays 100K × the seconds left.
- **Warnings.** There's an alarm and a "HURRY UP" message at 10 s, and ticks from 5 down to 1. The lit-shot arrows and the clock ring flash faster under 9, 6 and 3 seconds.

- **RIOT** (lanes): roll the **R-I-O-T** in/outlanes (flippers change the lit lanes) to start a 20-second
  frenzy where every switch scores. It runs alongside a job, and relighting it adds time.
- **BURN IT DOWN** (wizard mode): play all five jobs to light it at the scoop. It's a 4-ball multiball where
  every field shot is a jackpot and collecting all six lights a super jackpot at the scoop. Afterwards the
  job board resets and everything is worth 1.5X more.

### The rest of the Foundry

- **A-M-P lanes**: roll through all three to raise the end-of-ball bonus multiplier (up to 6X). Flippers change the lit lanes.
- **Skill shot**: plunge into the flashing top lane for 250K.
- **Reactor bumpers** over the furnace: every 30 hits overloads the reactor and raises bumper value.
- **Conveyor ramp** (right flipper): 3 ramps light **MELTDOWN**; shoot it again for 3-ball multiball.
  During multiball, the ramp and both orbits score growing **jackpots**; 3 jackpots light the
  **super jackpot** at the scoop.
- **Orbits**: the left orbit (right flipper) and right orbit (left flipper). Major shots made in quick succession build **combos**.
- **Drop targets**: complete the bank to **open the Pit**, then shoot the scoop (not during a job).

**The Pit (lower level)**: an underground street fight.
- The fighter paces across the ring. Hitting him lands punches; knock his health to zero for a K.O.
- **JAB / HOOK** targets charge the **SUPER** meter. A full meter makes your next hit a 3-damage super punch.
- He telegraphs attacks (fists up, **INCOMING!**). Hit him during the wind-up to **COUNTER** for double
  damage. If you don't, you lose a heart and the ball gets knocked back.
- Three opponents: **Razor**, **Brick** and **Kingpin**. Beating Brick earns an extra ball. Draining or
  losing all three hearts sends you back up to the Foundry; it doesn't cost you the ball.

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
npm test           # rule tests for the job / riot / wizard mode system
npm run sim        # headless soak test: a bot plays and checks for physics leaks
npx tsx scripts/shotmap.ts   # which shots each flipper can reach
```

No game engine or runtime dependencies: TypeScript, Canvas 2D and Web Audio.

```
src/
  engine/   physics (custom fixed-step pinball solver), dot-matrix display, synth audio, effects
  game/     game flow, scoring, input, modes (jobs / riot / wizard)
  game/tables/  one file per playfield: geometry + rules + art
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
