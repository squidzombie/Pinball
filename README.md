# Squidzombie Pinball

Pinball tables for the [squidzombie.com](https://squidzombie.com) collection. Built as a
web app first (runs in any modern browser, installable on a phone), structured so it can be
wrapped as a native iPhone app later.

## Table 1: Neon Foundry

An industrial cyberpunk table with a second, underground level.

**The Foundry (main playfield)**
- **A-M-P lanes**: roll through all three to raise the end-of-ball bonus multiplier (up to 6X). Flippers change the lit lanes.
- **Skill shot**: plunge into the flashing top lane for 250K.
- **Reactor bumpers**: every 30 hits overloads the reactor and raises bumper value.
- **Conveyor ramp** (right flipper): 3 ramps light **MELTDOWN**; shoot it again for 3-ball multiball.
  During multiball, the ramp and both orbits score growing **jackpots**; 3 jackpots light the
  **super jackpot** at the scoop.
- **Orbits**: the left orbit (right flipper) and right orbit (left flipper). Major shots made in quick succession build **combos**.
- **Drop targets**: complete the bank to **open the Pit**, then shoot the scoop.

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

## Development

```bash
npm install
npm run dev        # local dev server (also reachable from your phone on the same Wi-Fi)
npm run build      # typecheck + production build into dist/
npm run sim        # headless soak test: a bot plays and checks for physics leaks
npx tsx scripts/shotmap.ts   # which shots each flipper can reach
```

No game engine or runtime dependencies: TypeScript, Canvas 2D and Web Audio.

```
src/
  engine/   physics (custom fixed-step pinball solver), dot-matrix display, synth audio, effects
  game/     game flow, scoring, input
  game/tables/  one file per playfield: geometry + rules + art
```

The physics runs at 480 Hz with layered collision so ramps can pass over the floor, and kinematic
flippers transfer real surface velocity to the ball. All art and sound is generated in code. There
are no asset files yet, so swapping in real artwork later is straightforward.

## Putting it on squidzombie.com

`npm run build` produces a static `dist/` folder with relative paths. Upload its contents to any
folder on the site (for example `squidzombie.com/pinball/`) and link to it.

## Getting it onto the iPhone

1. **Now**: open the site in Safari, then Share → *Add to Home Screen*. It launches full-screen like an app.
2. **App Store**: wrap the same `dist/` build with [Capacitor](https://capacitorjs.com/) to produce a native
   Xcode project (`npx cap add ios`). That requires a Mac with Xcode and an Apple Developer account.
