# Cyber Psychosis — Design

Status: **layout revision built for your review (30 October 2026).** The table is now a classic
fan with only the two lower flippers. The geometry, its measurements and this document are done;
**no rules or art work has started.** The live phone build is still the hotfix build (version 4)
until you approve this layout. Where the rule sheet differs from the code, the entry says
**(change)**; nearly all of those come with Phase 4.

The art target is the concept sketch, saved as [`reference/sketch.png`](reference/sketch.png).
The art template is in [`art/template/`](art/template/), regenerated from the new layout. The
image-generator prompt in `art/PROMPT.md` still describes the old layout; it will be rebuilt from
the final template once you approve it.

Measurements come from `npm run measure` ([`scripts/measure.ts`](scripts/measure.ts)): every
flip timing 2 ms apart off each flipper, from a cradled ball and from a ball rolling straight off
the inlane, each launch followed to see what it reaches; and 12-run follow-throughs for every
shot. `npm run template` regenerates the template and prints every clearance. Ball diameter is
**28 units** (1 unit ≈ 1 mm).

---

## 0. The layout revision (30 October 2026)

**Removed:**
- both upper flippers (top and middle), with their guides, gate and post
- the duct, absorbed into the Back Alley orbit
- the machinery block and the left mass
- the turbine (it may come back as background art only)
- the 12-light mode clock row
- the skill-shot insert in the shooter lane (the skill shot moves to the CAM lanes)

**Added or rebuilt:**
- **Back Alley** is a left orbit, with a diverter that can hold the loop open.
- **CAM 1–3** are top lanes between two one-way gates, with rubber-capped posts and a light in
  each.
- **The pop nest** is enclosed under the lanes. Its bumpers are 2.6 balls across (3.0 with the
  skirt), with every gap at least 1.5 balls. It has one exit lane to the right inlane.
- **The Breach** is a scoop between two standup banks: B-R-E faces the right flipper and A-C-H
  faces the left.
- **The Black Market** is now the centre ramp.
- **The Reactor** moved left.
- **VENT** is on the Reactor's right flank, and **SAFE** is on the orbit's inner wall.
- **The Impound** releases balls back down the Skyway's wire.
- **Light stacks:** every major shot gets an arrow, a jackpot light and a mode light in one line.
- **10X:** the shop's bonus light is now labelled 10X.

The earlier ramp-drain hotfix (Skyway and Black Market wires into the inlanes, guards, the Back
Alley chute) is kept and re-measured below. Its record is in the git history ("Hotfix: ramps
return to the inlanes…").

---

## 1. Shot map

Left to right across the fan:

```
 Back Alley  SAFE   B-R-E  BREACH  A-C-H   BLACK MARKET   REACTOR   VENT  pop exit  SKYWAY
 (orbit)                   scoop           (centre ramp)  drops +                 (right ramp)
                                                          captive
 ◄────────── right flipper ──────────────► ◄─ both ─► ◄────────── left flipper ─────────────►
```

Over the top: the orbit arch, the three CAM lanes between a one-way gate (left) and the Back
Alley diverter (right), and the pop nest under them.

**How to read the numbers.** "Share" is the share of flip timings that make the shot, from a
cradled ball / from a ball rolling straight off the inlane. "Angles" are the launch angles of
the flips that make it (0° = right, 90° = straight up). The old layout, measured the same way:
Skyway 7.5%, Breach 2.7%, Reactor drops 4.9%.

| Shot | Flipper | Angles | Share | Returns to | Role |
|---|---|---|---|---|---|
| **Back Alley** (left orbit, over the top) | Right | 122.8–124.8° | 10% / 2% | **Loop closed:** into the CAM lanes 12/12, then through the pops to the right flipper. **Loop held open:** round the top and down the right leg into the chute, onto the Black Market wire, to the right inlane. 12/12 back to the right flipper (6 loop all the way; 6 slower ones drop into the lanes and come out of the pops). | Mode shot, Impound jackpot, feeds the CAM lanes. |
| **SAFE** (standup on the orbit's inner wall) | Right | 114.5–117.7° | 2% / 1% | Bounces back. | Hack remote key. |
| **B-R-E** standups (face the right flipper) | Right | B 109.2–110.1°, R 106°, E rarely | B 12% / 1%, R about 1% | Rebound: 0 down the middle; 1 of 18 to an outlane. | Letters. |
| **Breach** scoop | Right | 101.6–102.7° | 2% / 11% | Kickout: left flipper 12/12. | Starts and selects jobs; mode shot. |
| **A-C-H** standups (face the left flipper) | Right; left (live) | A 98.5–102°, C 98.6–99.4° (right); 88.9–91° (left) | A 5% / 5%, C 0% / 7% (right); 0% / 16% (left) | Rebound: 0 down the middle; 3 of 36 to an outlane (all off A from the right flipper). | Letters. |
| **Black Market** (centre ramp) | **Both** | Left 83.5–87.5°, right 92.5–96.4° | Left 14% / 18%, right 12% / 16% | Right inlane → right flipper: 12/12 from each flipper. | Shop, mode shot, jackpot. |
| **Reactor**: 3 drops, then the captive ball | Left (right, live only) | Drops 77.2–81.5°; captive ball (drops down) from 77.4° | Drops 25% / 24%; captive ball 10% / 10% | Rebounds to either flipper. | Lights the lock; heat; starts Blackout; super jackpots. |
| **VENT** (the Reactor's right flank) | Left | 68.9–74.7° | 13% / 8% | Bounces back. | Hack remote key. |
| Pop exit gate | Left | about 65.5° | 1% / 0% | Bounces back (one-way, exit only). | — |
| **Skyway** (right ramp, deck to the upper left, wire down the left) | Left | 55.3–57.2° | 11% / 2% | Left inlane → left flipper 12/12. | Lock (divert to the Impound), mode shot, jackpot, spinner. |
| **CAM 1–3** top lanes | Plunge, Back Alley, the pops | — | — | Into the pops. | Bonus X, pop value, skill shot, "cameras down". |
| **Pops** (only from the lanes) | — | — | — | Out of the exit lane into the right inlane, right flipper 12/12. | Cash, Rage. |

**Flags:**
- **The Breach is the narrowest shot by far.** Its window is 1.1° off a cradle and it takes 2%
  of cradled flips, against 10–14% for the other major shots (11% of live flips). The scoop
  rejects anything arriving over 2,300 u/s, and cradled flips are faster than that. The old
  Breach was the same (6 per 225 flips). It's narrow and skillful as asked, but much harder
  than the rest. The speed limit isn't what decides it: of 134 cradled flips, only 4 reach the
  cup at all (3 are caught). Few right-flipper flips land on the mouth, and A and the mouth's
  posts take the near misses. A wider throat doesn't help either. At 50 and 56 units (against
  44), cradled flips rose to 5% but flips off the inlane fell to 1–3%, so I kept 44. If you
  want it easier, the real lever is moving the scoop up to 2° clockwise, toward the right
  flipper's busiest angles, at the expense of the A standup.
- **SAFE gets few flips** (2%), even though its 3.2° window is as wide as the others. The right
  flipper rarely launches at 114–118° from a cradle.
- **No two shots' windows overlap.** Each shot's approach is clear. One overlap of *paths* is
  unavoidable: the Skyway's deck passes over the Black Market's climb (compromise 1).
- **Posts.** About a third of the left flipper's cradled flips first hit a post or wall: mostly
  the Black Market's right lip (23 flips), and the Skyway's mouth or the right side of its lane
  (11 bounce back out). About half of the right flipper's do: mostly the Black Market's left
  post (24), the Breach mouth's posts (19), and the cabinet wall just below the orbit mouth
  (11). Those are the edges between shots.

### Flow and combos

```
left flipper  ── Skyway ─────────────────────────────────► left inlane ─► left flipper   (repeatable)
left flipper  ── Black Market ───────────────────────────► right inlane ─► right flipper
right flipper ── Black Market ───────────────────────────► right inlane ─► right flipper (repeatable)
right flipper ── Back Alley (loop closed) ─► CAM lanes ─► pops ─► exit lane ─► right inlane ─► right flipper
right flipper ── Back Alley (loop open) ─► chute ─► Black Market wire ─► right inlane ─► right flipper
right flipper ── Breach ── kickout ──────────────────────► left flipper
left flipper  ── Reactor ── rebound ─────────────────────► either flipper
```

Two loops: **Skyway → Skyway** on the left, and **Black Market / Back Alley → right flipper** on
the right. The Breach crosses right to left; the Black Market crosses left to right.

### Measurements (all thresholds you set)

| Check | Target | Result |
|---|---|---|
| Skyway reaches its inlane | ≥ 11/12, 0 drains | **12/12** left inlane → left flipper, 0 drains |
| Black Market reaches its inlane | ≥ 11/12, 0 drains | **12/12** from the left flipper and **12/12** from the right, right inlane → right flipper, 0 drains |
| Back Alley reaches the top lanes | ≥ 11/12 | **12/12** (loop closed). Held open: 12/12 back to the right flipper. Of 134 cradled flips, 12 more go up the orbit but fall back short of the top (the switch doesn't count them): 9 come back to the left flipper, 2 to the right, 1 to an outlane. |
| Plunge reaches the top lanes | 12/12 | **12/12** at 50–100% pull; the auto-launch too. At 45% it doesn't clear the top and drops into the Back Alley chute to the right inlane; much weaker than that and it falls back to the plunger. |
| Pop nest exits toward an outlane | ≤ 1/12 | **0/12**: all 12 visits leave by the exit lane into the right inlane and reach the right flipper. |
| Pop nest: bumper hits and time | Busy for a few seconds, never trapped | 12 plunges: **4.2 hits** a visit on average (1–15) and **3.2 s** in the nest (1.1–9.4 s). Stress test of 72 visits (36 plunges and 36 balls dropped into the lanes at assorted speeds): no ball trapped, **median 2.3 s**, 90% out within 4.7 s, longest 9.9 s. |
| Breach kickout reaches a flipper | ≥ 10/12 | **12/12**, all to the left flipper. |
| Breach target rebounds | Not down the middle | **0 down the middle** from any standup. 4 of 54 standup hits reach an outlane: 3 off A from fast right-flipper flips, 1 off B. |
| Leaks and stuck balls | — | 600 s soak test: 0 leaks, 0 stuck. Rules tests: 128 pass (ball-flow tests rewritten for the fan). |

**Pop bumpers.** The old bumpers were 54 units across (1.9 balls) with 14–17 unit gaps, narrower
than the ball. The new ones are 72 across at the ring (2.6 balls), and the drawn skirt is 84
(3.0 balls).

**Clearances**, surface to surface. The template draws a ball to scale at each one.

| Gap | Units | Balls |
|---|---:|---:|
| Pop 1–2 / 1–3 / 2–3 | 42.0 / 42.2 / 42.2 | 1.50 / 1.51 / 1.51 |
| Pop 1 / 2 / 3 to the nearest wall or post | 42.0 / 42.5 / 48.9 | 1.50 / 1.52 / 1.75 |
| CAM 1 / 2 / 3 lane, post to post | 40.1 / 40.2 / 40.5 | 1.43–1.45 |
| Arch lane over each lane post | 39.0 | 1.39 |
| Pop nest exit | 50.2 | 1.79 |
| Pop exit chute and gate | **30.0** | **1.07** (on purpose: a tight chute drops the ball straight into the right inlane, clear of the slingshot's top corner, which kicks balls into the outlane) |
| Breach throat / mouth | 44.0 / 52.0 | 1.57 / 1.86 |
| Back Alley orbit lane | 44.0 | 1.57 |
| Black Market mouth | 56.0 | 2.00 |
| Skyway mouth | 45.0 | 1.61 |
| Reactor funnel (drops down) | 64.0 | 2.29 |

### Compromises and open questions

1. **The Skyway crosses over the Black Market.** The crossing is forced: the Skyway goes from
   the right side to the left inlane, and the Black Market from the centre to the right inlane.
   The Skyway's deck passes about 40 units above the Black Market's climb, just past its
   entrance, so you shoot the Black Market under a bridge. *Alternative:* swap the two returns
   (Skyway to the right inlane, Black Market to the left) and the crossing disappears.
2. **The dead centre is weak in this physics.** A cradled ball leaves the left flipper at
   42–84° and the right at 96–138°. Shots straight up the middle (85–95°) come only from
   flipping a ball near the pivot as it rolls off the inlane, and those are slower. The Black
   Market still works from both flippers (12–18% of flips each), because each flipper's steepest
   shots meet at the centre. But it sits at the edge of each flipper's range, which is why it's
   6 units left of the centre line (that balances the two). *Alternative:* lengthen the flipper
   stroke so the centre is in range. That changes the flipper feel, so I haven't touched it.
3. **More sealed floor.** 18% of the playfield is ground no ball reaches (grey on the template),
   against 13% for the old machinery, banks and housings. It's the ground under the two ramps:
   under the Skyway's climb to the Impound (upper left) and under the Black Market's turn (centre
   right). The Impound, the Reactor housing and the Black Market box sit in it, so the art can
   fill it with those rather than with machinery.
4. **The pop exit is a one-way gate between VENT and the Skyway.** It's a small dead spot: 1% of
   left flips, around 65°. *Alternative:* leave it open as a "pop lane" shot up into the pops.
5. **The CAM lanes sit between the bumpers, not over their centres.** Lanes centred over the top
   two bumpers trapped balls in a loop: up a lane off the bumper, between the two gates, and
   back down onto the same bumper. Offset by about 25 units, nothing is trapped in 72 visits.
6. **The Breach is much narrower than the other shots.** See the flags above.
7. **SAFE is on the orbit's inner wall,** a vertical face, so hits are glancing (like the old
   SAFE on the machinery edge). Between the B-R-E bank and the orbit there's no room for a
   target facing the flipper.
8. **The Back Alley switch is at the top of the arch,** just before the CAM lanes, so a made
   Back Alley always reaches the lanes. Weak orbits that fall back don't count.
9. **With the loop held open, slow Back Alley shots still drop into the CAM lanes.** They come
   back to the right flipper through the pops instead of round the loop.
10. **A weak plunge (about 45%) drops into the Back Alley chute** to the right inlane instead of
    falling back to the plunger.
11. **The Impound lock is animated.** As before, the ball rides a short wire from the Skyway's
    top bend into the box. At multiball, the balls drop back onto the Skyway's wire, one every
    0.9 s, to the left inlane.
12. **The mode map moved down 24 units,** to make room for the Black Market menu under its light
    stack.
13. **The in-game drawing is only patched,** so it shows the new geometry in the old procedural
    style. It's not the art pass.
14. **Still in the code until Phase 4:**
    - The shop's 10X light is labelled, but the item isn't sold yet.
    - The old skill shot (Black Market within 7 s of the plunge) still works.
    - The CAM lanes are plain switches.
    - The diverter can be held open from code, but no rule opens it yet.

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

**(change) Each job uses its own set of shots** (rechecked for the fan):

| Job | Shots | Style |
|---|---|---|
| Infiltrate | Skyway, Black Market, Back Alley, Reactor in any order (one is watched), then the Breach | Choose |
| Hack | The six B-R-E-A-C-H standups, SAFE, VENT (Reactor for brute force) | Precision |
| Route | Skyway → Black Market → Back Alley (loop held open) → Breach, in order | Flow |
| Payload | Skyway and Black Market load; the Breach cashes | Greed |
| Extract | Back Alley → Reactor → Skyway, as hurry-ups | Speed |

Infiltrate and Route share four shots but play differently: free choice under the camera
against one fixed loop. Payload and Extract, the two tier-2 jobs, now share only the Skyway
(Extract used to repeat Payload's ramps and Breach).

### Shared mode rules (already built; keep)

- One job at a time. The ball is held in the Breach during the intro, and the clock starts when
  it's ejected.
- Clock conventions (see README): pinball seconds of 1.1 s, a 2 s grace period at zero, progress
  tops the clock up to 10 s, and the clock pauses while the ball is held, stuck or not yet back
  on the playfield. Cradling does not pause it.
- **(change)** The 12-light clock bar is gone. The time shows on the DMD, and the lit shots'
  arrows blink faster as it runs out (section 5).
- Completion pays the mode's bonus plus 100K per second left. A job that times out still counts
  as **played** and opens the next tier. Only completed jobs count toward Total Blackout.
- If two jobs are available, the flippers choose while the ball sits in the Breach (4 s).
- Draining ends a timed job quietly. Multiball jobs end when the multiball does.

### Infiltrate (first job; comes lit at the start of each game)

- **Starts:** Breach.
- **Lights:** four entry points: Skyway, Black Market, Back Alley and Reactor.
- **Cameras down (change):** completing the three CAM lanes adds 8 s and blinds the camera for 8 s
  (no watched shot).
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
  sets up the next:
  1. **Skyway** (left flipper, returns left).
  2. **Black Market** (from the left flipper, returns right).
  3. **Back Alley** (right flipper). Route holds the loop open, so it returns right.
  4. **Breach** (right flipper, ejects left back to the Skyway).
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
- **Lights:** three legs, one at a time: **Back Alley → Reactor → Skyway** **(change, so Extract
  doesn't repeat Payload's shots)**. The getaway runs out the back, blows the Reactor (the drops
  drop for this leg, and the captive ball is the shot), and escapes over the Skyway.
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

### Impound multiball (change: reworked around the fan)

- **Light the lock:** knock all the drops down (or buy LOCK at the Black Market). The Skyway arrow
  and the Impound's warning triangle light.
- **Lock:** make the Skyway. Its top bend diverts the ball up the wire into the Impound, the drops
  reset, and a new ball is served.
- **Start:** the third lock starts a 3-ball multiball with a 12 s ball save. The balls drop back
  onto the Skyway's wire one at a time and roll down to the left inlane.
- **Jackpots:**
  - **Skyway**, **Black Market** and **Back Alley**: 1M, +250K each.
  - The Back Alley loop is held open for the multiball, so it comes straight back to the right
    flipper.
  - A collected jackpot relights after the other two are collected.
- **Super:** with all three collected, the **Breach** lights **SUPER JACKPOT** (3× the jackpot).
  The ball is held 1 s, then kicked to the left flipper, and the three jackpots relight.
- **Ends:** at one ball.
- **Shooting style:** both ramps and the orbit, then the scoop. Compare Blackout, which adds the
  Reactor.

### Supporting features

- **B-R-E-A-C-H standups:**
  - A first hit lights its letter (25K); a repeat hit pays 10K.
  - All six light a job (+200K) and reset the letters.
  - During a timed job, completing them adds 10 s and banks the next job.
- **CAM 1–3 top lanes (change):**
  - **Fed by:** the plunge, the Back Alley, and balls the pops kick back up.
  - **Lane change:** either flipper button moves the lit lanes, the same as R-A-G-E.
  - **First pass:** 5K a lane, 25K for lighting one.
  - **All three lit: CAMERAS DOWN.** This pays 100K, advances the bonus X (2× up to 6×) and
    raises the pop value by 1K (to 5K at most, for the ball). The lanes reset.
  - **During Infiltrate:** cameras down also adds time (above).
- **Skill shot (change; replaces today's):**
  - On the plunge, one CAM lane blinks, and the flippers move it.
  - Rolling through the blinking lane is a **SKILL SHOT**: 500K + $50K.
  - After a skill shot, making the Black Market within 5 s is a **SUPER SKILL**: 1.5M. The ball
    comes out of the pops onto the right flipper, so the Black Market is the natural next shot.
  - The old skill shot (Black Market within 7 s of any plunge) goes.
- **R-A-G-E lanes (the four in/outlanes):** the flippers move the lit letters. Completing R-A-G-E
  starts **RAGE**: 20 s where every switch pays 100K, pops 150K, and major shots 250K.
  Relighting adds 10 s. It runs alongside jobs. **(change)** R-A-G-E no longer advances the
  bonus X; the CAM lanes do, as on a classic table.
- **The Back Alley diverter:**
  - Normally closed: the Back Alley drops into the CAM lanes.
  - **Held open:** during Route, during Impound multiball, and for 4 s after any combo shot. The
    Back Alley then loops round to the right inlane.
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
- **SAFE and VENT:** side standups, SAFE off the right flipper (on the orbit's inner wall) and
  VENT off the left (the Reactor's right flank). Their rules job is Hack's remote keys. Otherwise
  each is a plain switch (25K and $10K cash, a little more than most switches).
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
  **(change)** Named combos each add 500K:
  - **SKY RUN:** Skyway ×3.
  - **DEAD DROP:** Back Alley (looping, since a combo holds the diverter open) → Black Market.
- **Ball save:** 12 s at ball start, 12 s at multiball starts, 20 s for Blackout.
- **Tilt:** nudging fills a tilt meter. Past the warning level the DMD shows DANGER; past the limit the ball is lost along with its bonus.

---

## 3. Scoring table

Bumpers should be noise next to shots, and shots noise next to jobs and jackpots. A full
bumper-bashing ball (about 100 pops) is worth about 100K. One job is 7–20M.

| Item | Now | Proposed |
|---|---:|---:|
| Pop bumper | 5,000 | 1,000, +1K per cameras down to 5K (+$2K) |
| Slingshot | 1,010 | 110 |
| Spinner, per turn | 2,500 | 1,500 |
| RAGE lane: unlit / lighting a letter / completing | 5K / 25K / – | 5K / 25K / 250K |
| BREACH standup: repeat / lighting a letter / completing | 5K / 25K / – | 10K / 25K / 200K |
| Drop target / full bank | 25K / 100K | 25K / 150K |
| CAM lane: unlit / lighting / cameras down | – | 5K / 25K / 100K |
| Skyway | 75K | 100K |
| Black Market | 100K | 150K |
| Back Alley | 75K | 150K |
| Breach (no job running) | 25K | 50K |
| Reactor core | 100K + 50K/heat | 250K + 50K/heat |
| Combos | 50K × n | 100K / 250K / 500K / 1M |
| Skill / super skill (CAM lane, then Black Market) | 500K / – | 500K / 1.5M |
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
  behind bars, a red warning triangle and a stencilled IMPOUND. It stands in the sealed yard
  under the Skyway's climb, top left inside the orbit. A wire runs up from the Skyway's top bend
  into it.
- **Skyway:** a wide steel trough on trusses, with visible side walls, a riveted lip, SKYWAY
  stencilled in ink and red chevron arrows. A worn steel wireform runs down the left.
- **Black Market:** the centre ramp, under the Skyway's bridge, climbing into a raised dealer's
  cabinet over the shooter lane (shutters, a hand-painted BLACK MARKET sign). The shop menu sits on
  a dark plate under the ramp's light stack.
- **Breach:** a vault-door scoop with a red-lit throat, between two armoured banks of three red
  keypad standups: B-R-E angled toward the right flipper, A-C-H toward the left. Each letter's
  light sits right in front of its standup, pointing at it.
- **Reactor:** a round drum with hazard banding and a concentric red eye. The three red drop
  targets are its blast doors, with yellow chevron floor plates in front.
- **Back Alley:** a grimy steel gutter up the left side and over the top arch, with grating, oil
  stains, BACK ALLEY stencilled with arrows, and the camera mounted over the top right.
- **CAM 1–3:** three rollover lanes under the arch with rubber-capped posts, each with a small
  camera icon and a red light.
- **Pops:** three industrial canisters (ribbed, riveted, red lens caps), about three balls
  across, on a ribbed steel deck in their own walled nest, with pipes between them.
- **Drain and skull:** a faded, half-worn stencil skull on dark plates. Hazard stripes run down
  the drain throat, and the apron has mesh grilles.

### Typography

Stencil lettering for labels (an OFL stencil face, bundled), hand-lettered small rules text, and
both worn: knocked-out letters, chipped edges, slight misregistration.

### Honest assessment of the current build

(Written before the fan layout. The machinery block, duct and upper flippers it mentions are
gone; the rest still applies until the art pass.)

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
| Light stack, one per major shot (Skyway, Black Market, Back Alley, Breach, Reactor): arrow, JP and mode light in a line on the shot's approach, the arrow nearest the shot and pointing at it | **Arrow:** something to collect there (job shot, lock, affordable purchase). **JP:** a jackpot is lit there. **Mode light:** the running job wants this shot (in the job's colour). | Arrow: slow = available, fast = under 6 s, strobe = super or grace; the watched shot in Infiltrate strobes. JP: fast. Mode light: follows the arrow while a job wants the shot. |
| B-R-E-A-C-H letters (6, one in front of each standup, pointing at it) | Letters spelled. In Hack, the flashing key. | On = spelled, fast = the key to hit. |
| Drop lamps (3) | Drop is down. | On. |
| LOCK (Skyway lane) and the Impound triangle | Lock lit; Impound multiball running. | Fast = lock lit, slow = multiball. |
| Black Market menu (5) | The item on offer. | Slow = on offer, can't afford; fast = on offer, can afford. |
| Mode map nodes (one small red light per job, plus Blackout) | Heist progress. | Off = closed, slow = available next, fast = running, on = completed, strobe = choosing. |
| CAM 1–3 (one in each top lane) | Lane lit. During the skill shot, the blinking lane is the target. | On = lit; fast = the skill-shot lane. |
| Bonus X (2×–6×) | Bonus multiplier. | On. |
| R-A-G-E (4) | Lane letters. | On = lit; all slow-blink during Rage. |
| SAFE and VENT inserts | Hack remote keys. | Fast when the flashing key is that remote key; a short flash on any hit. |
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
| Route | NEXT BACK ALLEY 900K · LAP 1 |
| Payload | CRATES 3 · BREACH CASHES 4.5M |
| Extract | REACTOR 6.4M ▼ |
| Blackout | JACKPOTS 2/4 · 3.0M |
| Impound multiball | JACKPOT 1.25M · SUPER AT BREACH |
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
  The Skyway crosses over the Black Market, so the overlay must show the Skyway's deck above the
  Black Market's climb where they cross.
- **Drawn in code:**
  - the ball
  - flippers (cream, red stripe, ink outline)
  - drop targets, standups and the captive ball
  - bumper canister caps and their hit flash
  - lit inserts (unlit inserts come from the background art)
  - flashers, the camera beam (thin), the spinner and the plunger
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

## 8. Decisions

### 30 October 2026: layout revision (built, waiting for your review)

You asked for a classic fan in the spirit of Medieval Madness and Attack from Mars. How each
point landed:

1. **Upper flippers: both removed.** The Black Market works as a centre shot from the lower
   flippers: 12–18% of flips from each, 12/12 returns. It's off the dead centre for a physics
   reason (compromise 2). No upper flipper kept.
2. **The fan:** Back Alley, SAFE, the Breach between its banks, Black Market, Reactor, VENT,
   Skyway, all as specified. One forced overlap: the Skyway crosses over the Black Market
   (compromise 1).
3. **Top lanes:** CAM 1–3 above the pops. They're fed by the plunge (12/12) and the Back Alley
   (12/12). Lane change works on either flipper button, and also moves R-A-G-E. The bonus X,
   pop value, skill shot and cameras-down rules are in section 2 (Phase 4).
4. **Pop nest:** enclosed, bumpers 2.6 balls across (3.0 with the skirt), every gap at least
   1.5 balls, one exit to the right flipper (12/12, 0 outlanes), never trapped. The template
   shows a ball to scale at every gap.
5. **Breach banks:** B-R-E and A-C-H flank the mouth, each facing the opposite flipper, with
   the letters right in front. No hit goes down the middle. The scoop is narrow, and flagged as
   the narrowest shot.
6. **Clean-up:**
   - Machinery, turbine and clock row cut.
   - The shop's bonus light is the 10X item, now labelled 10X.
   - Light stacks on all five major shots.
   - Kept: the mode map, BREACH, RAGE, bonus X, shoot again, flashers and the Impound.
7. **Rules knock-on:** in section 2, marked (change). They cover Impound multiball, the Back
   Alley jackpot, each job's shot set, Route, Extract, Infiltrate's cameras down, the CAM lanes,
   the new skill shot, R-A-G-E, the diverter, combos, the 10X item and the inserts.
8. **Measurements:** section 1. All thresholds met.
9. **Art:** not started. The template is regenerated; the prompt waits for your approval.

Decision 2 below (the duct to the top flipper) is superseded by this layout.

### 29 October 2026

1. **Ramp drains: hotfix now.** Done and live; results in section 0.
2. **Back Alley: option (a).** It exits onto the Black Market wire to the right flipper, and a
   full-strength duct shot reaches the top flipper. *(Superseded on 30 October: the duct and
   upper flippers are gone; the Back Alley's open loop still uses the chute onto the Black
   Market wire.)*
3. **Dead-zone targets: added, as Hack's remote keys.** This fits the rule sheet better than
   cash: it makes Hack a cross-table mode, not just shooting inside the Breach channel. Outside
   Hack they're plain switches that pay a little cash. Built as switches; the Hack role comes
   with Hack in Phase 4.
4. **10X: next major shot ×10.** It expires after 10 s, and doesn't apply to jackpots or
   Blackout scoring; it's shown on the DMD while active (sections 2 and 6).
5. **Rendering: painted art (B).** Template images and prompt prepared in `art/` (the template
   is now regenerated for the fan layout; the prompt will be rebuilt after you approve it). The
   procedural fallback is documented, not built.
6. **DMD: warm amber.**
7. **Blackout: dim the floor.** The ball, flippers and lit inserts stay fully readable, and
   lighting returns to normal when the mode ends (section 5).
