# Cyber Psychosis — Design

Status: **Phase 1 reviewed.** Your decisions are recorded in section 8. The hotfix for the
problems in section 0 is built and live; everything else here is still design, to be built in
Phases 2–4. Where the target differs from the build, the entry says **(change)**.

The art target is the concept sketch, saved as [`reference/sketch.png`](reference/sketch.png).
The painted-art template and image-generator prompt are in [`art/`](art/).

Measurements come from the headless tools in `scripts/` and the scratch probes used while
writing this: launch-angle sweeps (which angle off each flipper makes which shot), 225
cradle-and-flip trials per flipper, and 12 follow-through runs per shot to see where the ball
goes afterwards.

---

## 0. Problems found, and the hotfix

All but P7 are fixed and live. Each fix was checked with the same 12-run follow-through
simulations before shipping. "Caught" means a player holding the flipper up as the ball arrives
catches it in the cradle.

| # | Problem | Before | Fix (built) | After |
|---|---|---|---|---|
| P1 | The Skyway's wire dropped the ball into the left **outlane**. | Drained 12 of 12. | The wire ends in a straight 70-unit drop inside the inlane, and hands the ball back at the very end, travelling along the wire at no more than 900 u/s. | Left inlane → left flipper 12 of 12; caught 12 of 12. |
| P2 | The Black Market's wire did the same on the right. | Drained 12 of 12. | Same fix on the right. | Right inlane → right flipper 12 of 12; caught 12 of 12. |
| P3 | A ball round the Back Alley fell out through the pops into the right outlane. | Drained 8 of 12. | It now drops down a chute into the Black Market box and rides the market's wire to the right inlane. | Right inlane → right flipper 12 of 12; caught 12 of 12. |
| P4 | Nothing the player could shoot on purpose fed the top flipper, so the Back Alley couldn't be aimed for. | Top flipper fed only by the plunge, Impound releases and strays. | A full-strength duct shot passes a one-way gate, turns under the Impound and lands on the top flipper. | Full-strength duct → top flipper 12 of 12. Caught and cradled there 50 of 50. From the cradle, the Back Alley is one contiguous timing window (flip 0.36–0.41 s after letting the ball roll). |
| P5 | Dead zones: left 60–69° and right 108–120° hit plain walls. | Angle sweeps. | Standups in both: **VENT** on the Reactor's underside and **SAFE** on the machinery edge below the Breach. | VENT takes left shots at 60–68°, SAFE right shots at 110–120°. |
| P6 | No outlane guards. | Wall-hugging balls fell into the outlanes. | Rubber guards and posts back at both side lanes. The right one is shortened so it doesn't clip the Skyway. | Wall-hugging balls stay out (new test). The Skyway window is a full 5° again. The right flipper's centre shot still loses 2 of 12 to the right outlane when a ball ricochets off the drops across to it: normal outlane risk, so the guard isn't meant to stop it. |
| P7 | The palette breaks the art direction: candy mode inserts, additive glows, neon DMD. | Code review. | Phase 3 (art). | Not built yet. |

**Other checks after the hotfix:**
- Rules tests: 130 pass, including new ones for every wire return, catches, duct deliveries,
  guards and the flank targets.
- 500 s soak test: 0 leaks, 0 stuck balls. Ball saves fell from 9–11 in earlier soak runs to 2,
  because shots no longer throw the ball away.

---

## 1. Shot map

The table has two lower flippers and two upper-left flippers. Both upper flippers are on the
left button: the **top flipper** sits under the Impound and the **middle flipper** between the
Skyway deck and the Breach. "Window" is the range of launch angles off the flipper that
makes the shot. A real ramp is usually a 3–5° shot.

| Shot | Flipper | Window / difficulty | Returns to | Role | Flags |
|---|---|---|---|---|---|
| **Skyway** ramp (up the lane beside the Reactor, deck to the upper left, wire down the left) | Left | 55–60° (5°), **medium**. 17 makes per 225 flips. | Left inlane → left flipper (12/12, catchable). | Impound lock (when lit), mode shot, combo engine, spinner. | Returns to the same flipper, so it's repeatable: lean into it with a "Sky run" combo. |
| **Black Market** ramp (over the pops into the market box, wire down the right) | Middle | About 16% of flip timings, **medium**. 21 per 225. | Right inlane → right flipper (12/12, catchable). | Shop purchase, skill shot, mode shot. | Reached via the duct, so it's a two-step shot: duct, then Black Market. |
| **Back Alley** loop (round the top behind the pops) | Top | One cradle-and-flip timing window, **hard**. 15 per 225 from random flips. | Down a chute into the Black Market box, then the market wire to the right inlane → right flipper (12/12, catchable). | Mode shot, multiball jackpot. | Fed by a full-strength duct shot (and the plunge, Impound releases). |
| **Breach** scoop (between the B-R-E-A-C-H banks) | Right | 102–108° (6.3°), **medium**. 6 per 225. | Ejected down the channel: left flipper 8 of 12, right 4 of 12. | Mode start and selection, Hack brute force, Extract finale, Payload cash-out. | Good cross return (right → left). |
| **Reactor**: 3 drop targets, then the captive ball | Left | 69–74° (5°), **easy–medium**. 11 drop hits per 225. | Rebounds: left 7, right 5. | Drops light the lock; core hits build heat; starts Blackout; super jackpots. | Return is random but safe. |
| **Duct** (lane up the left, under the Skyway wire) | Right | 120–126° (5.5°), **medium**. 19 per 225. | Full strength → top flipper (12/12). Medium → falls back to the middle flipper. Weak → doesn't make it. | The aimed way up to the upper flippers. | Not in the sketch, but the table doesn't flow without it. An unflipped top-flipper ball rolls on to the middle flipper, so one strong duct shot offers both upper shots in turn. |
| **SAFE** standup (machinery edge below the Breach) | Right | 110–120°, **easy**. 15 per 225. | Bounces back. | Hack remote key (section 2). Otherwise 25K + $10K. | New, filling the old right dead zone. |
| **VENT** standup (the Reactor's underside) | Left | 60–68°, **easy**. 14 per 225. | Bounces back. | Hack remote key. Otherwise 25K + $10K. | New, filling the old left dead zone. |
| **Pops** (centre shot into the bumper nest) | Left 77–84°, right 97–100°, **easy** | Mostly back to the flipper that shot it; the right one's ricochets reach the right outlane 2 of 12. | Cash for the Black Market, Rage scoring. | Not a major shot. |
| **Impound lock** | (Skyway when lit) | As Skyway. | Locked ball is held; the next ball is served to the plunger. At multiball the balls drop out onto the top flipper. | Multiball. | Good. |
| **In/outlanes** (R-A-G-E) | — | — | Inlanes feed the flippers; outlanes drain. Guards at the side walls. | Rage, bonus X. | — |
| **Spinner** (Skyway lane) | — | — | — | Small scores, cash. | — |
| **Skill shot** | Plunger | — | Plunge rides the Back Alley onto the top flipper. | 500K for the Black Market within 7 s. | **(change)** Make it two-level, below. |

### Flow and combos

```
left flipper  ── Skyway ──────────────────────────────────────► left inlane ─► left flipper  (repeatable)
left flipper  ── Reactor ─────────────────────────────────────► rebound to either flipper
right flipper ── Breach ──── eject ───────────────────────────► left flipper (mostly)
right flipper ── Duct (strong) ─► top flipper ── Back Alley ──► chute ─► market wire ─► right inlane ─► right flipper
                 Duct (medium) ─┐     └─ not flipped: rolls on ┐
                                └──────────────────────────────► middle flipper ── Black Market ─► right inlane ─► right flipper
```

The designed combo loop: **Duct → (top) Back Alley or (middle) Black Market → right flipper →
Duct again**, and **Skyway → Skyway** on the left. Crossing between the two loops happens
through the Breach (right → left) and the Reactor rebound.

**Skill shot (change).** The plunge comes round the Back Alley onto the top flipper.

- **SUPER SKILL** (1.5M): flip the top flipper straight back round the Back Alley within 3 s.
- **SKILL** (500K + $50K): let the ball roll down to the middle flipper and make the Black
  Market within 7 s.

It teaches both upper-flipper shots on every ball.

---

## 2. Rule sheet

### Core loop

Spell **B-R-E-A-C-H** on the six standups to light the Breach, then shoot the Breach to start
the next job of the heist. The heist map runs **Infiltrate**, then **Hack** or **Route**, then
**Payload** or **Extract**. Each job asks for a different way of shooting: stealth, target
precision, a flowing sequence, build-and-cash multiball, a hurry-up race. Playing a final job
lights **Blackout**, the wizard multiball, at the Reactor. Between jobs:

- knock down the Reactor drops to light the lock and feed the Impound through the Skyway for
  **Impound multiball**
- earn cash from everything and spend it at the **Black Market**
- roll **R-A-G-E** in the lanes for bonus X and a Rage frenzy

Values grow with each pass through the heist.

### Shared mode rules (already built; keep)

- One job at a time. The ball is held in the Breach during the intro, and the clock starts when
  it's ejected.
- Clock conventions (see README): pinball seconds of 1.1 s, a 2 s grace period at zero, progress
  tops the clock up to 10 s, and the clock pauses while the ball is held, stuck or not yet back
  on the playfield. Cradling does not pause it.
- Completion pays the mode's bonus plus 100K per second left. A job that times out still counts
  as **played** and opens the next tier. Only completed jobs count toward Total Blackout.
- If two jobs are available, the flippers choose while the ball sits in the Breach (4 s).
- Draining ends a timed job quietly. Multiball jobs end when the multiball does.

### Infiltrate (first job; comes lit at the start of each game)

- **Starts:** Breach.
- **Lights:** four entry points: Skyway, Black Market, Duct and Reactor **(change: Duct replaces
  the Back Alley)**.
- **Twist:** the security camera watches one of them. That arrow strobes and the camera's beam
  points at it. The camera moves every 3.5 s, and jumps when you make a shot.
- **Scoring:**
  - An unwatched lit shot pays 500K, then 650K, 800K, 950K.
  - Making the watched shot means **SPOTTED**: −5 s, the camera sweeps faster, and every later
    shot pays 100K less.
  - Once all four are made, the camera gives up and the **Breach** lights **GET INSIDE**.
- **Timer:** 45 s.
- **Ends:** success at the Breach (3M + time bonus); failure when the clock runs out.
- **Reward:** the Infiltrate node lights, and Hack and Route open either way.
- **Shooting style:** read the camera and choose the shot, not the fastest one.

### Hack

- **Starts:** Breach.
- **Lights:** a keypad of eight keys, with one flashing at a time:
  - the six Breach standups
  - two remote keys, **SAFE** (right flipper) and **VENT** (left flipper)
- **Scoring:**
  - Each flashing key hit is 250K. Four keys crack a firewall: 1M, then 1.5M, then 2M.
  - Every firewall's code includes one remote key, so cracking it means leaving the Breach
    channel once, for a cross-table shot off the other flipper.
  - After each cracked firewall, the Reactor captive ball lights **BRUTE FORCE** for 10 s. Hit it
    for +2M, and the next firewall needs only two keys **(change)**.
  - Shooting the Breach scoop itself cracks the current firewall at half value.
- **Timer:** 40 s.
- **Ends:** three firewalls means **SYSTEM HACKED** (3M + time); the clock runs out otherwise.
- **Reward:** the Hack node lights, and Payload and Extract open.
- **Shooting style:** precise target work inside the Breach channel, broken up by one remote
  shot per code, with the Reactor as an optional shortcut.

### Route

- **Starts:** Breach.
- **Lights:** only the next shot. **(change)** The order follows the table's returns, so each shot
  sets up the next: **Skyway** (left, returns left) → **Duct** (right, to the middle flipper) →
  **Black Market** (returns right) → **Breach** (ejects left).
- **Scoring:** steps pay 600K, 900K, 1.2M, 1.5M. A lap finished within 15 s of its first shot is
  a **CLEAN RUN** and pays double. Out-of-order shots score nothing for the mode.
- **Timer:** 45 s.
- **Ends:** two laps means **ROUTE SET** (3M + time); the clock runs out otherwise.
- **Reward:** the Route node lights, and Payload and Extract open.
- **Shooting style:** flow, a learnable combo path.

### Payload (2-ball multiball)

- **Starts:** Breach (tier 2). A second ball is auto-plunged and there's a 12 s ball save.
- **Lights:** both ramps.
- **Scoring:**
  - **(change: build-and-cash.)** Each ramp loads a crate. The first crate is worth 1M, and each
    one after it is worth 250K more. Up to five crates show on the DMD.
  - The **Breach** cashes the load: all loaded crates × 1.5. The more you load before cashing,
    the more it pays.
  - Losing a ball before cashing forfeits the uncashed crates.
- **Timer:** none. It ends when the multiball does.
- **Reward:** cashing three or more crates at once completes it. Playing it at all lights Blackout.
- **Shooting style:** risk and greed: how long do you keep loading?

### Extract (hurry-up race)

- **Starts:** Breach (tier 2).
- **Lights:** three legs, one at a time: **Skyway → Black Market → Breach** **(change: Black
  Market replaces the old left alley)**.
- **Scoring:** each leg is a hurry-up that starts at 6M, then 7M, then 8M and drains 200K a second
  down to 1.5M. Hitting it pays the current value and starts the next leg at full value.
- **Timer:** 35 s overall. The hurry-up value is the pressure, the clock is the hard limit.
- **Ends:** all three legs means **EXTRACTED** (4M + time); the clock runs out otherwise.
- **Reward:** the Extract node lights. Playing it lights Blackout.
- **Shooting style:** speed over precision.

### Blackout (wizard mode)

- **Lit when:** Payload or Extract has been played.
- **Starts:** slam the Reactor's captive ball into the core.
- **Setup:**
  - The table dims to a hard-edged work-light look: the inserts stay bright and the floor goes
    to about 55% (see section 5).
  - 3-ball multiball, or 4 balls if all five jobs were completed (**TOTAL BLACKOUT**). 20 s ball
    save.
- **Scoring:**
  - The Skyway, Black Market, Back Alley and Breach are each a jackpot once: 2M, then +500K per
    collected.
  - With all four collected, the drops fall and the captive ball is the **super** (5× the
    current jackpot). The set then relights at +1M.
  - All values × (1 + 0.5 per completed job).
- **Ends:** with the multiball.
- **Reward:** the heist resets at the next level, with values +0.5×.
- **Shooting style:** cover the whole table.

### Impound multiball (change: an upper-flipper multiball, so it plays unlike Blackout)

- **Light the lock:** drops all down (or buy LOCK at the Black Market). The Skyway arrow and the
  Impound's warning triangle light.
- **Lock:** make the Skyway. Its top bend diverts the ball up the wire into the Impound, the drops
  reset, and a new ball is served.
- **Start:** the third lock starts a 3-ball multiball. The balls drop out of the Impound onto the
  top flipper one at a time, with a 12 s ball save.
- **Jackpots:**
  - The **Back Alley** (top flipper) and **Black Market** (middle flipper): 1M, +250K each.
  - The **Duct** relights a collected jackpot, so the right flipper keeps feeding the upper
    flippers.
- **Super:** after four jackpots, **SMASH THE IMPOUND**: make the Skyway for 3× the jackpot.
- **Ends:** at one ball.
- **Shooting style:** upper-flipper play.

### Supporting features

- **B-R-E-A-C-H standups:**
  - A first hit lights its letter (25K); a repeat hit pays 10K.
  - All six light a job (+200K) and reset the letters.
  - During a timed job, completing them adds 10 s and banks the next job.
- **R-A-G-E lanes (the four in/outlanes):** the flippers move the lit letters. Completing R-A-G-E
  raises the bonus X (2× up to 6×) and starts **RAGE**: 20 s where every switch pays 100K, pops
  150K, and major shots 250K. Relighting adds 10 s. It runs alongside jobs.
- **Black Market shop:**
  - Cash: $1K a switch, $2K a pop, $5K a major shot, $500 a spinner turn.
  - The menu (five inserts) rotates every 4 s. Making the Black Market ramp buys the lit item if
    you can afford it; otherwise the DMD shows the price.
  - Items:
    - **TIME:** +15 s, during a timed job only; $30K.
    - **SAVE:** 15 s ball save; $50K.
    - **LOCK:** lights the lock, not during multiball; $40K.
    - **10X:** $75K, replacing today's +1X bonus item. Your next major shot scores ten
      times. Rules:
      - It counts that shot's own score: base value, combo and any mode award the shot pays.
      - It doesn't apply to jackpots, supers, any Blackout scoring, job completion bonuses or
        time bonuses. A jackpot shot uses it up without multiplying.
      - It expires unused after **10 s**. The countdown pauses while the ball is held, like the
        mode clock.
      - While it's active, the DMD shows it (section 6) and the 10X menu insert strobes.
    - **X-BALL:** $200K, once a game.
- **SAFE and VENT:** standups in the old dead zones, SAFE off the right flipper and VENT off
  the left. Their rules job is Hack's remote keys. Otherwise each is a plain switch (25K and
  $10K cash, a little more than most switches).
- **Reactor:**
  - Each drop is 25K, and the full bank 150K. Clearing the bank lights the lock (when it can be
    lit) and exposes the captive ball.
  - A core hit raises **heat** (250K + 50K per heat level) and resets the drops after 1.2 s,
    unless a multiball wants them down. The eye glows hotter with heat.
  - **(change)** Heat 6 lights an extra ball at the Breach.
- **Bonus:** every major shot adds 1/20 of its value, every job adds 1/20 of its total, and
  BREACH and RAGE letters add a little. The total is multiplied by the bonus X at drain and lost
  on tilt.
- **Extra ball:** from the Black Market (once), Reactor heat 6 (once), or completing Blackout.
  Only one can be lit at a time.
- **Combos:** major shots within 3.5 s: 2-way 100K, 3-way 250K, 4-way 500K, 5+ 1M.
  **(change)** Named combos: **SKY RUN** (Skyway ×3) and **DEAD DROP** (Duct → Black Market in
  one flow) each add 500K.
- **Ball save:** 12 s at ball start, 12 s at multiball starts, 20 s for Blackout.
- **Tilt:** nudging fills a tilt meter. Past the warning level the DMD shows DANGER; past the limit the ball is lost along with its bonus.

---

## 3. Scoring table

Bumpers should be noise next to shots, and shots noise next to jobs and jackpots. A full
bumper-bashing ball (about 100 pops) is worth about 100K. One job is 7–20M.

| Item | Now | Proposed |
|---|---:|---:|
| Pop bumper | 5,000 | 1,000 (+$2K) |
| Slingshot | 1,010 | 110 |
| Spinner, per turn | 2,500 | 1,500 |
| RAGE lane: unlit / lighting a letter / completing | 5K / 25K / – | 5K / 25K / 250K |
| BREACH standup: repeat / lighting a letter / completing | 5K / 25K / – | 10K / 25K / 200K |
| Drop target / full bank | 25K / 100K | 25K / 150K |
| Duct | 25K | 25K |
| Skyway | 75K | 100K |
| Black Market | 100K | 150K |
| Back Alley | 75K | 150K |
| Breach (no job running) | 25K | 50K |
| Reactor core | 100K + 50K/heat | 250K + 50K/heat |
| Combos | 50K × n | 100K / 250K / 500K / 1M |
| Skill / super skill | 500K / – | 500K / 1.5M |
| Infiltrate | 0.5–0.95M a shot, 3M finish | same |
| Hack | 250K keys, 1.5/3/4.5M codes, 3M finish | 250K keys, 1/1.5/2M firewalls, +2M brute force, 3M finish |
| Route | 0.6–2.4M steps, 3M finish | 0.6–1.5M steps, ×2 clean run, 3M finish |
| Payload | 1.5M + 250K ramps, super 3× | crates 1M + 250K, cash ×1.5 |
| Extract | 6M / 7M / 8M draining 200K/s, 4M finish | same |
| Impound jackpot / super | 1M + 250K / 3× | same |
| Blackout jackpot / super | 2M + 500K / 5×, × job multiplier | same |
| Time bonus | 100K a second | same |

Typical game targets: a beginner scores 1–3M, someone who plays a couple of jobs and one
multiball 10–20M, and a Blackout game 50M+.

---

## 4. Art direction

**Target:** the reference sketch, a weathered, hand-inked technical illustration of a real
machine on a light bone and concrete base. Not clean vector, not neon, not dark.

### Palette tokens

All art reads from one table of named tokens, and nothing else is allowed. **No green, cyan,
amber, orange or other candy colours anywhere,** including mode inserts. Modes are told apart
by name, DMD and which shots light, not by colour.

| Token | Hex | Use |
|---|---|---|
| `BONE` | `#e8e4da` | lightest concrete, worn ball paths |
| `CONCRETE` | `#d6d0c2` | base floor |
| `CONCRETE_DEEP` | `#bdb6a7` | stains, buildup, slab joints |
| `GRIME` | `#6b5f4f` | multiply-blend grime layer |
| `INK` | `#2a2826` | all outlines and lettering |
| `GRAPHITE` | `#55514b` | hatching, secondary lines |
| `STEEL_HI` | `#d4d3cd` | top edges, rod highlights |
| `STEEL` | `#a8a7a1` | plate tops |
| `STEEL_MID` | `#8a8983` | ramp beds, canisters |
| `STEEL_DARK` | `#605f5a` | side faces |
| `STEEL_DEEP` | `#3b3a37` | recesses, under-ramp |
| `HAZARD` | `#c9a227` | painted stripes, chipped, matte |
| `SIGNAL_RED` | `#b3261e` | key labels, bumper caps, painted arrows |
| `GLASS_OFF` | `#5a1d17` | unlit insert: dull, dirty red glass |
| `GLASS_ON` | `#e2503f` | lit insert |
| `GLASS_HOT` | `#ffb3a3` | small hot spot at a lit insert's centre |
| `CREAM` | `#ece3cf` | flipper plastic |
| `RUBBER` | `#2b2826` | rubbers, rings |
| `BRASS` | `#9c7c45` | a few conduits only, as in the sketch (optional) |

### Line style

- Every element is outlined in `INK`: the outer silhouette at about 2.2 px, inner edges 1.2 px,
  detail 0.8 px. Strokes vary slightly (wobble, taper), the way a pen does.
- Shading is **hatching**, not gradients: 0.6 px lines at 3–4 px spacing, cross-hatched for the
  deepest areas (ramp undersides, recesses, the drain throat, slingshot sides). No soft drop
  shadows; cast shadows are hatched too.
- Mechanical detail everywhere: rivets along plate edges and ramp walls, hex bolts on posts,
  panel seams, weld lines, small conduits and pipes routed between features.

### Surface

- A grime layer (multiply): low-contrast noise, uneven stains, darker buildup in corners,
  against rails and walls, and around posts and bumpers.
- Worn ball paths: lighter scuffed bands where balls travel (the inlanes to the flippers, under
  the flippers, the shooter lane, the centre channel, ramp entrances, the Breach channel).
- Paper and concrete grain over everything, so no surface is perfectly flat.
- All of this is rendered once into the static layer, not per frame.

### Density

No empty floor. The sketch fills every area the ball can't reach with machinery. The current
build has large bare areas (see the assessment below). These get filled with flat, low detail,
so the ball still reads on top of it: floor plates, grates, cable trays, junction boxes, conduit,
stencils. Raised machinery goes only in solid regions.

### Feature identities

One machine, with each part distinct:

- **Impound:** a riveted steel lock box with a porthole window, three chrome balls visible
  behind bars, a red warning triangle and a stencilled IMPOUND. A wire runs up from the Skyway
  bend into it.
- **Skyway:** a wide steel trough on trusses, with visible side walls, a riveted lip, SKYWAY
  stencilled in ink and red chevron arrows. A worn steel wireform runs down the left.
- **Black Market:** a raised dealer's cabinet with shutters and a hand-painted BLACK MARKET
  sign. The shop menu sits on a dark plate under it.
- **Breach:** two armoured kite-shaped blast shields carrying red keypad standups, and a
  vault-door housing with a red-lit throat. BREACH is stencilled down the channel above a chevron
  plate.
- **Reactor:** a round drum with hazard banding and a concentric red eye. The three red drop
  targets are its blast doors, with yellow chevron floor plates in front.
- **Back Alley:** a grimy steel gutter with grating, oil stains, BACK ALLEY stencilled with
  arrows, and the camera mounted over it.
- **Pops:** three industrial canisters (ribbed, riveted, red lens caps) on a ribbed steel deck,
  with pipes between them.
- **Drain and skull:** a faded, half-worn stencil skull on dark plates. Hazard stripes run down
  the drain throat, and the apron has mesh grilles.

### Typography

Stencil lettering for labels (an OFL stencil face, bundled), hand-lettered small rules text, and
both worn: knocked-out letters, chipped edges, slight misregistration.

### Honest assessment of the current build

| Region | Where it misses |
|---|---|
| Overall | Reads as a clean vector illustration: gradients for shading, even line weights, almost no hatching, soft blurred shadows. The light palette is right; the hand-drawn feel isn't. |
| Lighting | The whole-table GI dimming overlay, additive (`lighter`) glows on lamps, bumpers, flashers and the camera beam, and large flasher washes. All banned by the direction. |
| Mode map | Candy-coloured plaques (cyan, green, amber, orange, white). Should be dark stencilled plates with one small red light each. |
| Top left (Impound, top flipper) | The Impound is close but flat-shaded, and its window is empty unless balls are locked. The machinery block is a plain box. The area under the top flipper is a bare diamond plate. |
| Top right (Back Alley, pops) | The pop deck is a bare grid. The canisters are small and glossy, without ribs. The Black Market wire crosses the pops and adds clutter. The camera beam is a red glow. |
| Skyway | A plain light band with thin rails and sparse legs. It needs trusses, a riveted lip and a hatched underside. The left wireform is bright white. |
| Left column (duct, machinery) | The machinery is one big flat slab with a few pipes. The duct grate is fine. |
| Breach | Shapes are right; surfaces are gradient-filled. The red scoop glow is too big and too bright. |
| Centre channel | Bare concrete with stray plates and a floating shop plaque. The red painted arrows look random. |
| Reactor | The housing polygon is awkward, the funnel reads as a black gap, and the eye glows. |
| Lower playfield | Slings are flat grey triangles. Inlane rails are clean tubes. The skull is a crisp vector graphic on a grey plate (should be faded and worn). The apron and shooter lane are plain. |
| Flippers | Close (cream with a red edge and ink outline), but too glossy. |
| DMD | Crisp, saturated neon red. |

---

## 5. Lighting and feedback

### Light model

The table is a **well-lit workshop**. Lights are physical inserts under red glass:

- **Unlit:** `GLASS_OFF`, dull and dirty, with grime over it.
- **Lit:** `GLASS_ON` with a `GLASS_HOT` centre and a tight glow of **6 px at most**.
- No light spills across the playfield, and there is no coloured GI. Flasher domes brighten in
  place with the same 6 px limit.
- There are only two global light changes:
  - **Blackout:** the floor art and plain steel dim to about 55% for the length of the
    multiball. The ball, the flippers and every lit insert stay at full brightness and
    readable; the ball keeps its hard highlight and dark outline. Lighting returns to normal
    the moment Blackout ends: multiball over, drain or tilt.
  - **The bonus count:** the floor dims to about 70%.

Lamp states: off, on, slow blink (available), fast blink (hurry, under 6 s), strobe (super, last
chance, under 3 s or in grace).

### Inserts

| Insert | Meaning | States |
|---|---|---|
| Shot arrows (Skyway, Black Market, Back Alley, Breach, Reactor, Duct) | Something to collect there: a job shot, jackpot, lock or affordable purchase. | Slow = available, fast = under 6 s, strobe = super or grace. The watched shot in Infiltrate strobes. |
| JP lamps (one per shot) | Jackpot lit there in a multiball. | Fast blink. |
| B-R-E-A-C-H letters (6) | Letters spelled. In Hack, the flashing key. | On = spelled, fast = the key to hit. |
| Drop lamps (3) | Drop is down. | On. |
| LOCK (Skyway lane) and the Impound triangle | Lock lit; Impound multiball running. | Fast = lock lit, slow = multiball. |
| Black Market menu (5) | The item on offer. | Slow = on offer, can't afford; fast = on offer, can afford. |
| Mode map nodes (one small red light per job, plus Blackout) | Heist progress. | Off = closed, slow = available next, fast = running, on = completed, strobe = choosing. |
| Mode clock bar (12) | Time left in the running job. | Fills down; flashes faster under 9, 6 and 3 s; strobes in grace. |
| Bonus X (2×–6×) | Bonus multiplier. | On. |
| R-A-G-E (4) | Lane letters. | On = lit; all slow-blink during Rage. |
| SKILL (shooter lane) | Skill shot armed. | Fast until the plunge, then for 7 s. |
| SAFE and VENT inserts | Hack remote keys. | Fast when the flashing key is that remote key; a short flash on any hit. |
| Duct arrow | An upper-flipper shot is wanted (Back Alley or Black Market lit). | Slow. |
| 10X (Black Market menu) | 10X bought and waiting to be used. | Strobe until used or expired. |
| SHOOT AGAIN | Ball save running, or extra ball banked. | Slow = save, fast = save ending, on = extra ball. |

### Feedback moments

| Moment | Table | DMD | Sound |
|---|---|---|---|
| Job start | Ball held 2.2 s; a lamp sweep from the Breach; the job's shots light. | Title card with a wipe-in, then the one-line brief. | Job sting. |
| Lit shot made | The insert pops, flashers near the shot fire once, sparks. | Value, small. | Shot sound plus an award blip. |
| Jackpot | Flashers at the shot; 3 px screen shake. | JACKPOT with the value counting up. | Jackpot hit. |
| Super jackpot | All flashers; 6 px shake. | A burst animation, then the value. | Bigger jackpot hit. |
| Multiball start | Lamp strobe; balls drop from the Impound one at a time. | Animated card (IMPOUND BREAKOUT, PAYLOAD, BLACKOUT). | Siren, then multiball music. |
| Job done or over | — | Summary card: "HACK DONE 7.3M" or "ROUTE OVER 2.1M". | Rising or falling sting. |
| Drain | Lamps fade to 70%. | Bonus count: one line per category, then × bonus X, then the total. | Drain thud, count ticks. |
| Ball saved | SHOOT AGAIN flashes. | BALL SAVED. | Save chime. |
| Tilt warning / tilt | Lamps flicker / go out. | DANGER / TILT. | Buzzer. |
| Extra ball, skill shot | Flashers. | Card. | Award. |

---

## 6. DMD

**Style.** A 128 × 32 dot matrix in **warm amber** (dots around `#e8842e`, unlit dots dark brown),
worn and slightly dirty:

- uneven brightness and a few dim or dead dots
- a faint grime and scratch overlay on the glass
- soft dot edges, but no bloom beyond about one dot
- a riveted steel bezel matching the cabinet

**(decided)** This replaces today's crisp neon red. Amber matches the warm workshop; red stays
reserved for the table's lights.

**10X indicator.** While 10X is active, the top-right corner shows an inverted **10X** box with
the seconds left, on every screen including job screens, where the timer moves left to make
room. When it's used, a one-second card shows **10X** and the multiplied value; when it expires,
**10X GONE**.

**Normal play.**
- Score, large.
- BALL *n*, bottom left.
- Bottom right rotates through what's lit: BREACH LIT, LOCK LIT, BLACKOUT LIT, the
  B-R-E-A-C-H progress (B R E _ _ _), R-A-G-E progress, cash.
- LAUNCH blinks while a ball waits in the shooter lane.

**In a job.** Name top left, seconds top right (blinking in the last 6 and in grace), score in the
middle, and a job-specific bottom line:

| Job | Bottom line |
|---|---|
| Infiltrate | SNEAK 2 MORE · CAM ON SKYWAY |
| Hack | FIREWALL 2/3 · KEY 3/4 (then BRUTE FORCE 8 while it's lit) |
| Route | NEXT DUCT 900K · LAP 1 |
| Payload | CRATES 3 · BREACH CASHES 4.5M |
| Extract | BLACK MARKET 6.4M ▼ |
| Blackout | JACKPOTS 2/4 · 3.0M |
| Impound multiball | JACKPOT 1.25M · SUPER AT SKYWAY |
| Rage (alternates with the job's line) | RAGE 14 · 2.1M |

**Animations:**
- job title cards
- jackpot and super bursts
- multiball cards
- the shop screen when the Black Market is made: item, price, then BOUGHT or COSTS $X
- the bonus count
- attract pages: logo, high score, rules tips

---

## 7. Rendering approach

### Option A: keep everything procedural (today)

- **Pros:** exact fit to the collision geometry, no assets, resolution-independent, easy to move
  things.
- **Cons:** reaching the sketch's hand-drawn density in code is slow, and it tends to look like
  vector art (the current miss).

**Decision: B, painted art.** The template images and the image-generator prompt are in
[`art/`](art/) (see `art/README.md`). Option C stays documented here as the fallback, not built.

### Option B: painted playfield image plus dynamic elements in code (chosen)

- **Static background:** `art/playfield.png`, a clean, unannotated top-down version of the
  sketch. All floor-level art: concrete, grime, plates, stencils, unlit inserts, the skull, the
  apron, the bases of raised parts.
- **Overlay layer:** `art/overlay.png`, a transparent PNG of everything the ball passes *under*:
  the Skyway deck and wire, the Black Market ramp, box and wire, the Back Alley's outer lip if
  wanted. The ball is depth-sorted between the two layers, and drawn on top when it's on a ramp.
- **Drawn in code:**
  - the ball
  - flippers (cream, red stripe, ink outline)
  - drop targets, standups and the captive ball
  - bumper canister caps and their hit flash
  - lit inserts (unlit inserts come from the background art)
  - flashers, the camera beam (thin), the spinner, the plunger, the turbine
- **Pros:** hits the look exactly; the art iterates independently of the code; cheap to render.
- **Cons and risks:**
  - The image must match the table's coordinate frame: 600 × 1200 units, delivered at 3 px per
    unit (1800 × 3600). It must be straight top-down with no perspective, because the CSS tilt
    supplies that. The sketch is in slight perspective with labels, so it can't be used directly.
  - Collision has to be fitted to the art (the Phase 3 debug toggle), and every geometry change
    means re-checking the shots. I'd keep the current, tuned shot geometry and have the art
    follow it where possible.
  - Raised parts (bumpers, posts, targets, the Breach banks, the Reactor drum) need either an
    upward shift baked into the art matching our projection, or sprites drawn in code, so the
    ball goes behind them correctly. The simplest rule: the background holds floor-level art
    only, and anything taller than about 10 mm is a sprite or lives on the overlay.
  - Light positions must match the art exactly, so we export an insert position list from
    `table.ts` for the artist.

### Option C (fallback, documented only): a much stronger procedural pass, pre-rendered once

Jittered ink strokes, hatching instead of gradients, grime and wear layers, and stencil fonts,
all baked into the static canvas. No assets needed, but it's the most code and will still be a
step short of a real illustration.

### Assets for B

1. `art/playfield.png`: 1800 × 3600, top-down, clean (no labels or arrows), unlit inserts,
   no ball and no flippers, framed to the table rectangle.
2. `art/overlay.png`: same size, transparent, ramps and wires only.
3. Optional: sprite sheets for the pop canister, drop target face, standup face and flipper.
   Otherwise I draw these in code to match.

The templates in `art/template/` are generated from the live physics world, so they show
exactly where every wall, lane, ramp entrance and insert is. Regenerate them with
`npm run template` after any geometry change.

---

## 8. Decisions (29 October 2026)

1. **Ramp drains: hotfix now.** Done and live; results in section 0.
2. **Back Alley: option (a).** It exits onto the Black Market wire to the right flipper, and a
   full-strength duct shot reaches the top flipper. Both are built and confirmed by simulation
   (section 0, P3 and P4).
3. **Dead-zone targets: added, as Hack's remote keys.** This fits the rule sheet better than
   cash: it makes Hack a cross-table mode, not just shooting inside the Breach channel. Outside
   Hack they're plain switches that pay a little cash. Built as switches; the Hack role comes
   with Hack in Phase 4.
4. **10X: next major shot ×10.** It expires after 10 s, and doesn't apply to jackpots or
   Blackout scoring; it's shown on the DMD while active (sections 2 and 6).
5. **Rendering: painted art (B).** Template images and prompt prepared in `art/`. The
   procedural fallback is documented, not built.
6. **DMD: warm amber.**
7. **Blackout: dim the floor.** The ball, flippers and lit inserts stay fully readable, and
   lighting returns to normal when the mode ends (section 5).
