# Cyber Psychosis — Design

Status: **second layout round built for your review (30 October 2026).** The fan from the first
round now has an upper playfield, **THE VAULT**, in the old dead area at the top left, with its
own pair of small flippers. The Skyway is rerouted to make room, the Impound is a cage over the
orbit, and three security cameras pan over the CAM lanes. Hitting the vault's three tumblers in
the order of a random code cracks it open and starts **VAULT MULTIBALL**. The geometry, its measurements and this
document are done. **Rules beyond the cameras, the back door and the vault, and the art pass,
haven't started.** The phone build is this layout (version 19; the fan is version 5 in its
history). Where
the rule sheet differs from the code, the entry says **(change)**; nearly all of those come with
Phase 4.

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

## 0. The layout revisions (30 October 2026)

### Fourteenth round: spell B-R-E-A-C-H once, then each row has a key

You didn't want to spell B-R-E-A-C-H before every job. Now each row of the heist map has its own
key:

- **Row 1, Infiltrate:** spell B-R-E-A-C-H to break in (BROKEN IN), then shoot the Breach.
  Nothing comes lit at the start of a game any more. Until you break in, the display's bottom
  right says SPELL BREACH.
- **Row 2, Hack or Route:** **CAMERAS DOWN** (all three CAM lanes), once Infiltrate is finished.
- **Row 3, Payload or Extract:** expose the **Reactor** (all three drop targets down), once Hack
  or Route is finished. It still lights the lock as well.
- **Blackout:** unchanged, lit by finishing Payload or Extract. Afterwards the heist starts over
  with Infiltrate lit (you're still inside), and the other rows need their keys again.
- **Starting a job uses up its row's light,** so the second job in a row needs the key again. A
  key earned while a job runs lights the rest of its row for afterwards. A job that ends
  unfinished (a tilt, or Payload losing its multiball) relights its row.
- **Spelling B-R-E-A-C-H again** lights a **Breach jackpot**: 1M, plus 250K for each one already
  collected. Spell it twice before collecting and the two add up. The third spelling (the second
  after breaking in) also lights an **extra ball** at the Breach, one a game. The Breach's JP light
  blinks while either is lit, and the display says BREACH JP or EXTRA BALL LIT. Any Breach shot
  collects them; if a job then starts, it waits until the award has been on the display.
- **E can be hit now.** The scoop's left post juts 3 units in front of E's face, and a ball
  centred within about 10 units of it touched the post first. That left only a third of E: 2% of
  aimed right-flipper shots, against 11–12% for R and B. With spelling now the way into the heist,
  the two mouth posts count as the letters beside them (E and A). Nothing moved and the physics
  is unchanged (the Breach still takes the same 16% of those shots); E is now 11%.

### Thirteenth round: a brain instead of the skull

- **The skull and the dark plate behind it are gone.** Between the flippers is plain concrete,
  with the bonus lights (2X–6X), the BONUS label and the hazard stripes down the drain.
- **A top-down brain** now sits under the heist map, front up the table. Every job plaque and
  light (INFILTRATE through BLACKOUT, and the red dots on the links) is inside it; the map's
  steel links run over it like implants. No light moved. It clears the shop row above it, the
  bonus lights below it and the slingshots at its sides.

### Twelfth round: a little balance, and solid targets

You found the Black Market noticeably easier than the far-side shots, and asked for "both a
little": the Black Market a bit harder, the sides a bit easier.

- **What the numbers show.** On a held ball, the side shots aren't hard at all: the Skyway is the
  easiest shot on the table (19%), because a late flip off a cradle launches at 54–57°, right at
  its window. On a **moving** ball, almost every flip goes up the middle (72–93° off the left
  flipper, 87–105° off the right). Only about 4 in 100 reach either far side. That's real
  pinball: a cross-table shot off a moving ball needs a late, well-timed flip; the easy way is
  to catch the ball first. So widening the side shots' openings can only help a little. A
  wider Skyway funnel was measured and changed nothing, so the Skyway is left as it was.
- **Black Market a little harder:** its mouth is 53 units, down from 56 (narrowed on the side
  away from H). Left flipper 9% / 16% (was 14% / 18%), right 12% / 5% (was 11% / 12%).
- **Back Alley a little easier:** the post at the foot of the orbit's inner wall moved 12 units
  right, widening the orbit's mouth. Moving-ball shots doubled: 4% (was 2%); held 10% as before.
- **Returns unchanged:** both ramps 12/12 to a flipper; the Back Alley 12/12 to the top lanes,
  12/12 into the vault with the back door open, 12/12 round the loop. Of 13 flips that go up
  the orbit but fall back, all reach a flipper.
- **Cost:** the vault lane, already the hardest shot, loses its one moving-ball hit in 100 (now
  0%; held 1% as before).
- **Solid targets:** the B-R-E-A-C-H standups, the tumblers, SAFE and VENT, and the drop targets
  are drawn as solid blocks: shaded front, ends and top, with a bevel so the ends show. The
  block sits behind the target's face, so the ball still touches the front where the physics
  has it. Drawing only.

### Eleventh round: jobs survive a drain, speed pays, timed supers, RAGE in the shop

- **A drain pauses a job instead of failing it.** It carries on with the next ball (JOB
  CONTINUES), and only the step you were in the middle of starts over: Route's current lap,
  Hack's current code. Infiltrate keeps the shots you've snuck past; Extract keeps its finished
  legs. Three balls (plus saves) to get through the whole map is still the challenge.
- **Multiballs don't carry over.** Payload's multiball ending before its super still fails the
  job, which is retried from scratch at the Breach. A tilt ends a job the same way.
- **Speed pays.** Infiltrate's, Hack's and Route's values hold for 30 s of play, then drain to
  half over two minutes. The display shows SHOTS PAY 75%, for example. This replaces the old
  time bonus as the reward for a quick job.
- **Timed super jackpots.** The Impound's and Payload's super jackpots stay lit for 20 s. Missed,
  the drop targets come back up and two more jackpots relight it.
- **RAGE in the shop.** The dead TIME item is now RAGE ($60K): it starts RAGE, or adds 10 s.

### Tenth round: jobs have no clock, and you must finish each one

- **Jobs have no clock.** A job lasts until you finish it. Only a finished job counts: it lights
  its node on the map and opens the next row. Lose the ball first (or, for Payload, the
  multiball before its super jackpot) and the job fails: it doesn't count, and the Breach
  relights so you can start it again from the beginning. Blackout lights only when Payload or
  Extract is *finished*.
- Infiltrate's SPOTTED no longer costs 5 s. It pays nothing, and every later shot pays 100K less.
- No time bonus on completion. The shop's TIME item (+15 s) is never offered now, so its light
  stays dark.
- **RAGE keeps its 20 s clock**, the one timed mode left.
- **The Black Market's drawing now matches its wall.** The ninth round trimmed the wall's corner
  beside H for the ball, but the ramp's drawing still started 5 units in front of H, so the
  picture still showed a lip. Both now start flush with H.

### Ninth round: H can be hit

You found H impossible to hit: the Black Market's left wall came down beside it with a corner
poking out below the targets, and a short wall joined the two. Measured, every right-flipper shot
aimed between the Black Market and C (about 96.5–98.5°) hit that corner instead: H got 0% of
right-flipper flips and 1% of left. Now the A-C-H bank runs right up to the Black Market's wall
(53.6 units instead of 44, so A, C and H are each about 20% wider), and the wall's bottom is
trimmed to meet it flush.

- **H:** 16% of cradled right-flipper flips and 10% of moving-ball flips (from 0%), and 8% of
  moving-ball left-flipper flips (from 1%). Every hit on H comes back to a flipper.
- **A** also gained: 5% / 7% from the right flipper (was 5% / 0%) and 5% of moving-ball flips from the left.
- **Cost:** the Black Market from the right flipper drops from 12% / 16% to 11% / 12%. H's window
  now meets the Black Market's, so the edge of one is the edge of the other. From the left
  flipper it's unchanged (14% / 18%), and both still return 12/12.

### Eighth round: a gutter that finishes R-A-G-E saves the ball

You pointed out that two of R-A-G-E's letters sit over the gutters (the outlanes), which end
the ball. Lane change means you can spell it all on the two inlanes, but now the gutters have a
reward too: if the letter that **finishes** R-A-G-E is collected on a gutter, RAGE starts and
that ball is saved (BALL SAVED, RAGE SAVED IT) and launched back into play. A gutter that lights
any other letter loses the ball as usual. Only that ball is saved, not any other ball draining
at the same moment. The start screen says so too.

### Seventh round: the flipper buttons change lanes, not the pops

- **Correction to the sixth round:** I had the pop bumpers shifting the lit CAM lanes. You meant
  the flipper buttons. Now the pops don't touch the lanes at all. A lane lights only when the
  ball rolls through it, and only the left and right flipper buttons shift the lit lanes, left
  and right, the same way they already shift R-A-G-E.
- **The start screen's rules** are rewritten as four plain steps: B-R-E-A-C-H, the Reactor and
  lock, the lanes, and the vault. They fit on a small phone.

### Sixth round: CAM lanes like a real table, and a smoother frame

- **CAM lanes light only when the ball rolls through them.** The pop bumpers no longer light them.
  Each pop bumper hit shifts the lit lanes one place to the right (and from the right end round
  to the left), like a lane change on a real table. (Corrected in the seventh round: the flipper
  buttons do this, not the pops.) A lit lane is a knocked-out camera, so the
  dark camera moves with it. Light all three for **CAMERAS DOWN** (back door open); the lanes
  reset once the cameras come back on, and at each new ball. Lit lanes no longer time out. The
  flipper buttons still only move R-A-G-E.
- **Frame rate.** You couldn't tell if the ball was too fast or the frame rate was poor. Measured
  on a phone-sized screen with the processor slowed 4× (an approximation; a real phone's graphics
  chip is faster):
  - Drawing the table now takes about a third less time than in version 5, even with the vault
    and three cameras. Before this round it took about a quarter more: the three camera beams
    were redrawn as large gradients every frame. They're now plain layered cones, and the
    cameras' heads and the back door are cached images.
  - The table is drawn at up to 2× the screen's pixel density instead of 2.5×. That's about a
    third fewer pixels each frame, and still sharp on a phone.
  - A fast ball moves more than its own width between frames, which reads as stutter even at a
    steady 60 frames a second. It now leaves a faint smear back to where it was last frame,
    which also bridges a late frame.
- **Speed.** The ball also *is* fast. The table's gravity is about 2.5× a real machine's (a real
  table tilted 6.5°), so balls fall about 1.6× faster than on a real machine. Shots leave the
  flippers at real-table speeds. The physics is unchanged. Instead, a **speed button** (next to
  mute) sets the whole game to 100%, 90% or 80%. It's remembered on the device, and it slows
  the ball, the flippers and the clocks evenly, so every shot and measurement stays the same,
  just slower. At 80%, a fall takes about 1.25× as long as on a real table. If you settle on a
  speed, it can become the default.

### Fourth round: a random code, and no more strobing

- **The vault's code is random.** Every new game, and every time the vault is cracked, the three
  tumblers get a new order (never the same as the last one). The tumbler lights are numbered 1–3,
  and the code shows on the display, as **CODE 3-1-2** for example:
  - when a ball goes into the vault, under THE VAULT;
  - on the display's bottom line while a ball is in the vault;
  - after a wrong tumbler, under WRONG COMBINATION.
  The lights still guide you: tumblers already in are lit, and the next one blinks.
- **The whole-table strobing is gone.** You saw the table flash light and dark like a strobe
  light. There were three causes, all fixed:
  - **Rage** (and, more faintly, Blackout) flickered the table's lighting: down to 59% in bursts,
    about 4 times a second on average and faster within each burst. Now the lights sag and
    recover in one slow, shallow pulse, 0.6 times a second and never below 86%.
  - **The "strobe" lamp show** at multiball starts and other big moments blinked every light on
    the table 6 times a second. It now blinks 2.5 times a second.
  - **The full-screen colour flash** on big events could fire several times in quick succession.
    Now there's at most one every 0.4 s, and it's a third dimmer.
  The rule from now on: nothing that lights or darkens a large part of the screen flashes more
  than 3 times a second. That's the usual safety limit for flashing content, since fast
  full-screen flashing can trigger seizures. Rules tests check all three. Single small inserts
  can still blink fast; that's normal pinball and only covers a small area.

### Third round: the vault's combination and VAULT MULTIBALL

Your idea: the three tumblers at the top of the vault are a combination. Hit them in order, 1
then 2 then 3, and the vault opens and extra balls drop out as a multiball. As built:

- **The combination:** tumbler 1 (left), then 2, then 3. The lights in front of them show where
  you are: done ones lit, the next one blinking. A tumbler out of order is **WRONG
  COMBINATION** and starts it over (tumbler 1 out of order counts as a fresh start). (Fourth
  round: the order is now random, a new code after every crack.)
- **Cracked:** the vault's hatch, on top of the tumbler block, swings open with gold light
  inside, and three balls drop out onto the vault's deck one after the other: **VAULT
  MULTIBALL**, with four balls in play. (Two in the third round; three since the fifth.) Rules
  are in section 2.
- **Renamed:** the door in the Back Alley's wall is now the **back door**, so "the vault opens"
  only ever means the hatch. (The tumbler block isn't called a safe, because SAFE is already the
  standup on the vault lane's wall.)

### Second round: the upper playfield, the cameras and a visual clean-up

You said the top left still felt dead, and asked for its own small game up there. You also
flagged the pop bumpers, the lights, the Reactor and the camera. What changed:

- **THE VAULT (upper playfield)** fills the old sealed yard between the orbit, the Breach and the
  pops. Details are at the end of section 1.
  - **Ways in:** a lane up the left side beside the B-R-E bank, through a one-way gate. Or the
    **back door**: a stretch of the orbit's inner wall that swings across the orbit, so a Back
    Alley shot goes straight in.
  - **Inside:** two half-size flippers on the main buttons, and three **tumbler** standups on a
    raised block at the back. (Third round: the tumblers are now the vault's combination.)
  - **Ways out:** out the top through a one-way flap into the arch, then the CAM lanes. Or down
    past its flippers, out the side along under the pops, into the pop exit lane and the right
    inlane.
- **Cameras:** three, one over each CAM lane, panning their beams down the table. A CAM lane or
  the pop bumper below it knocks that camera out for 12 s. With all three out at once: **CAMERAS
  DOWN**, which opens the back door for 20 s. (Since the seventh round, only the lanes knock
  cameras out, and the flipper buttons shift them.)
- **The Skyway** now runs straight across above the Breach and down the left side, instead of
  climbing through the top left. It's easier: 19% of cradled flips, up from 11%.
- **The Impound** is a raised cage over the orbit lane on the left, with a red beacon. The ball
  you circled in green was a locked ball: the old box art was drawn at stale coordinates.
- **SAFE** moved onto the face of the vault lane's wall, below the B-R-E bank.
- **Visual fixes:**
  - The pop bumpers are redrawn as round canisters whose tops match the table's perspective.
  - The bars between them are gone.
  - The Reactor is a round drum with its eye in the middle.
  - The flashers stand on things: the Impound cage, the A-C-H bank and the tumbler block. Before,
    they were posts in the middle of lanes.
  - The SKYWAY floor label that sat under the Black Market's wire is gone.
- **A dead spot fixed:** a weak plunge (about 37–40%) could clear the shooter gate and then sit in
  the corner above it until the ball search kicked it. It now drops into the chute to the right
  inlane, like a looped Back Alley shot. A rules test covers it.

### First round: the fan

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
 Back Alley  VAULT  SAFE  B-R-E  BREACH  A-C-H   BLACK MARKET   REACTOR   VENT  pop exit  SKYWAY
 (orbit)     lane                 scoop           (centre ramp)  drops +                 (right ramp)
                                                                 captive
 ◄────────── right flipper ──────────────► ◄─ both ─► ◄────────── left flipper ─────────────►
```

Over the top: the orbit arch, the three CAM lanes between a one-way gate (left) and the Back
Alley diverter (right), and the pop nest under them. Top left, inside the orbit: THE VAULT, the
upper playfield.

**How to read the numbers.** "Share" is the share of flip timings that make the shot, from a
cradled ball / from a ball rolling straight off the inlane. "Angles" are the launch angles of
the flips that make it (0° = right, 90° = straight up). The old layout, measured the same way:
Skyway 7.5%, Breach 2.7%, Reactor drops 4.9%.

| Shot | Flipper | Angles | Share | Returns to | Role |
|---|---|---|---|---|---|
| **Back Alley** (left orbit, over the top) | Right | 119.7–124.8° | 10% / 4% | **Loop closed:** into the CAM lanes 12/12, then through the pops to the right flipper. **Loop held open:** round the top and down the right leg into the chute, onto the Black Market wire, to the right inlane. 12/12 back to the right flipper (2 loop all the way; 10 slower ones drop into the lanes and come out of the pops). **Back door open:** 12/12 into the upper playfield. | Mode shot, Impound jackpot, feeds the CAM lanes and the vault. |
| **Vault lane** (up the left into the upper playfield) | Right | about 116° | 1% / 0% | Through the upper playfield and out (below). | The way into THE VAULT. |
| **SAFE** (standup on the vault lane's wall) | Right | 109.2–112.7° | 7% / 2% | Bounces back. | Hack remote key. |
| **B-R-E** standups (face the right flipper) | Right | B 109.4–109.7°, R 106°, E rarely | B 6% / 0%, R about 1% | Rebound: 0 down the middle; 2 of 9 to an outlane. | Letters. |
| **Breach** scoop | Right | 101.6–102.7° | 2% / 11% | Kickout: left flipper 12/12. | Starts and selects jobs; mode shot. |
| **A-C-H** standups (face the left flipper; the bank runs right up to the Black Market's wall) | Right; left (live) | Right: H 95.5–98.6°, C 98.6–99.4°, A 98.5–102°. Left: 87.8–90.9° | Right: H 16% / 10%, C 0% / 5%, A 5% / 7%. Left: about 22% live (H 8%, C 9%, A 5%) | Rebound: 0 down the middle; 3 of 73 to an outlane (all off A from the right flipper). H sends every hit back to a flipper. | Letters. |
| **Black Market** (centre ramp; mouth 53, was 56) | **Both** | Left 83.5–87.5°, right 92.6–96.5° | Left 9% / 16%, right 12% / 5% | Right inlane → right flipper: 12/12 from each flipper. | Shop, mode shot, jackpot. |
| **Reactor**: 3 drops, then the captive ball | Left (right, live only) | Drops 77.2–81.5°; captive ball (drops down) from 77.4° | Drops 25% / 24%; captive ball 10% / 10% | Rebounds to either flipper. | Lights the lock; heat; starts Blackout; super jackpots. |
| **VENT** (the Reactor's right flank) | Left | 67.3–74.7° | 13% / 8% | Bounces back. | Hack remote key. |
| Pop exit gate | Left | 62.3–63.9° | 1% / 1% | Bounces back (one-way, exit only). | — |
| **Skyway** (right ramp, deck straight across above the Breach, wire down the left) | Left | 54.7–57.2° | 19% / 2% | Left inlane → left flipper 12/12. | Lock (divert to the Impound), mode shot, jackpot, spinner. |
| **CAM 1–3** top lanes | Plunge, Back Alley, the vault's top exit, the pops | — | — | Into the pops. | Each knocks out the camera above it; bonus X, pop value, skill shot. |
| **Tumblers** (3 standups in the vault) | The upper flippers | — | — | Back down to the upper flippers. | The vault's combination: the three in the code's (random) order start VAULT MULTIBALL. |
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
- **The vault lane is the hardest shot on the table** (1% of flips). The right flipper rarely
  launches at 116–118°. That's why the back door exists: when the cameras are down, the Back
  Alley (10%) feeds the vault instead.
- **No two major shots' windows overlap.** Each shot's approach is clear. From the right
  flipper, the H standup's window (95.5–98.6°) touches the Black Market's (to 96.4°): which one
  you hit at the edge depends on where the ball leaves the flipper. One overlap of *paths* is
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
right flipper ── vault lane, or Back Alley with the door open ─► THE VAULT
                 ├─ out the top ─► arch ─► CAM lanes ─► pops ─► right flipper
                 └─ past its flippers ─► side drain ─► pop exit lane ─► right inlane ─► right flipper
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
| Back Alley reaches the top lanes | ≥ 11/12 | **12/12** (loop closed). Held open: 12/12 back to the right flipper. Back door open: 12/12 into the upper playfield. Of 134 cradled flips, 12 more go up the orbit but fall back short of the top (the switch doesn't count them): 7 come back to the left flipper, 5 to the right. |
| Plunge reaches the top lanes | 12/12 | **12/12** at 50–100% pull; the auto-launch too. At about 37–50% it clears the shooter gate but not the top, and drops into the Back Alley chute to the right inlane. Weaker than that, it falls back to the plunger. No pull strength leaves it stuck (tested from 0 to 100%, and finely around the gate). |
| Pop nest exits toward an outlane | ≤ 1/12 | **0/12**: all 12 visits leave by the exit lane into the right inlane and reach the right flipper. |
| Pop nest: bumper hits and time | Busy for a few seconds, never trapped | 12 plunges: **3.1 hits** a visit on average (1–6) and **3.1 s** in the nest (1.1–5.7 s). Stress test from the first round (the nest hasn't changed), 72 visits: no ball trapped, median 2.3 s, 90% out within 4.7 s, longest 9.9 s. |
| Breach kickout reaches a flipper | ≥ 10/12 | **12/12**, all to the left flipper. |
| Breach target rebounds | Not down the middle | **0 down the middle** from any standup. 5 of 82 standup hits reach an outlane: 3 off A and 2 off B, all from the right flipper. All 40 hits on H come back to a flipper. |
| Upper playfield drain reaches a flipper | 12/12 | **12/12** down the side drain to the right flipper (12 balls dropped in, nobody flipping; 1.9 s inside). |
| Upper playfield with a player flipping | Playable, never trapped | 12 balls: **7.0 s** inside on average and **3.3 tumbler hits**. 5 go out the top (2 drop into a CAM lane, 3 roll on round the arch), 6 down the side drain, all to the right flipper. The twelfth sat cradled on the right upper flipper, which the test player held for 30 s. From a cradle, the left upper flipper reaches the tumblers (34 of 150 timings) and the top exit (9); the right one mostly tumbler 2. |
| Leaks and stuck balls | — | Four 600 s bot runs: 0 leaks, 0 stuck. Rules tests: 135 pass. |

**Pop bumpers.** The old bumpers were 54 units across (1.9 balls) with 14–17 unit gaps, narrower
than the ball. The new ones are 72 across at the ring (2.6 balls), and the drawn skirt is 84
(3.0 balls).

**Clearances**, surface to surface. The template draws a ball to scale at each one.

| Gap | Units | Balls |
|---|---:|---:|
| Pop 1–2 / 1–3 / 2–3 | 42.0 / 42.2 / 42.2 | 1.50 / 1.51 / 1.51 |
| Pop 1 / 2 / 3 to the nearest wall or post | 42.0 / 42.5 / 48.9 | 1.50 / 1.52 / 1.75 |
| CAM 1 / 2 / 3 lane, post to post | 40.0 / 40.1 / 40.4 | 1.43–1.44 |
| Arch lane over each lane post | 44.0 | 1.57 (the posts sit lower now, so slow balls roll over CAM 1's) |
| Pop nest exit | 50.2 | 1.79 |
| Pop exit chute and gate | **30.0** | **1.07** (on purpose: a tight chute drops the ball straight into the right inlane, clear of the slingshot's top corner, which kicks balls into the outlane) |
| Breach throat / mouth | 44.0 / 52.0 | 1.57 / 1.86 |
| Back Alley orbit lane | 44.0 | 1.57 |
| Black Market mouth | 53.0 | 1.89 (narrowed from 56 on its right side, twelfth round) |
| H to the Black Market's wall | 0.1 | 0 (flush on purpose: no corner beside H) |
| Skyway mouth | 45.0 | 1.61 |
| Vault lane / its gate | 31.4 / 31.8 | 1.12 / 1.14 (narrow, but it's a straight lane) |
| Upper flippers, tip to tip at rest | 34.6 | 1.24 |
| Upper playfield side drain, narrowest | 34.2 | 1.22 |
| Upper playfield top exit | 43.0 | 1.54 |
| Tumbler block to the orbit wall | 49.8 | 1.78 |
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
3. **Sealed floor is down to 8%** of the playfield (grey on the template), from 18% in the first
   round and 13% on the old layout. The upper playfield took over the old sealed yard. What's
   left:
   - under the Black Market's turn: 5.4%
   - behind the Skyway's mouth: 1.1%
   - the tumbler block: 1.0%
   - the wedge between the pop floor and the upper playfield's drain: 0.7%
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
10. **A weak plunge (about 37–50%) drops into the Back Alley chute** to the right inlane instead
    of falling back to the plunger.
11. **The Impound lock is animated.** The ball rides a short wire from the Skyway's turn down the
    left up into the cage. At multiball, the balls drop back onto the Skyway's wire, one every
    0.9 s, to the left inlane.
12. **The mode map moved down 24 units,** to make room for the Black Market menu under its light
    stack.
13. **The in-game drawing is still procedural.** This round redrew the bumpers, Reactor,
    cameras, Impound and vault, but it isn't the art pass.
14. **Still in the code until Phase 4:**
    - The shop's 10X light is labelled, but the item isn't sold yet.
    - The old skill shot (Black Market within 7 s of the plunge) still works.
    - The CAM lanes are plain switches.
    - The diverter can be held open from code, but no rule opens it yet.
    - CAMERAS DOWN only opens the back door for 20 s.
15. **The upper flippers flip with the main ones,** on the same buttons, as on real tables.
    Flipping for the lower flippers also flips the vault's, which mostly doesn't matter, since
    they're out of reach.
16. **The vault's top exit can miss the CAM lanes.** A ball that leaves the top slowly rolls round
    the arch instead (3 of 12 in the test above) and comes down the right leg to the right
    flipper. It's still a safe return.
17. **The combination is hard, on purpose.** From a cradle on the vault's flippers, tumbler 1 is
    mostly a left-flipper shot (17 of 150 timings), tumbler 2 a right-flipper shot (20 of 150)
    and tumbler 3 a left-flipper shot again (9 of 150). The test bot, flipping at random, never
    cracked it in 30 minutes. It did hit WRONG COMBINATION a few times. A stress run that cracked
    the vault every 30 s (about 20 four-ball multiballs in 10 minutes) had no stuck
    balls and no leaks.
### The upper playfield: THE VAULT (built)

Your idea from the first round: turn the dead yard in the upper left into its own small game,
with its own flippers, a way out the side and maybe one out the top. As built:

- **Size:** about 170 × 290 units (8.5% of the playfield), inside the orbit, from the top arch
  down to just above the Breach.
- **Ways in:**
  - **The vault lane:** up the left side beside the B-R-E bank (31 units wide), through a sloped
    one-way gate at the top. From the right flipper, 116–118°, 1% of flips: the hardest shot on
    the table.
  - **The back door:** a 90-unit stretch of the orbit's inner wall, hazard-striped. When it's
    open, it swings across the orbit lane, so a Back Alley shot goes straight in (12/12).
    CAMERAS DOWN opens it for 20 s. Going in closes it.
- **Inside:**
  - **Two half-size flippers** (44 units, half the main ones) at the bottom. They're on
    the main buttons.
  - **Three tumbler standups** on a raised block at the back, under the arch, with the vault's
    hatch on top of the block. There's a painted safe dial on the deck.
- **Ways out:**
  - **Out the top:** between the tumbler block and the pop nest's wall, over a one-way flap into
    the arch. The ball rolls right into the CAM lanes and the pops (or on round the arch), then
    to the right flipper. 100K.
  - **Out the side:** past the upper flippers, down a drain lane under the pop nest's floor, into
    the pop exit lane, the right inlane and the right flipper (12/12).
- **What moved to make room:** the Skyway now runs straight across above the Breach and down the
  left, and the Impound is a cage over the orbit lane beside it. SAFE moved onto the vault
  lane's wall.
- **Phone view:** the vault is in the smallest part of the tilted view. Its art is bold: a dark
  tread-plate deck, a big safe dial, a hazard-striped door.
- **Cracking the vault (third round):** the tumblers in the code's order crack it, and three balls drop
  out of its hatch onto the deck for VAULT MULTIBALL (section 2). With nobody flipping, both drain out the
  side to the right inlane (a rules test checks this).

---

## 2. Rule sheet

### Core loop

Spell **B-R-E-A-C-H** on the six standups to break in, then shoot the Breach to start the first
job of the heist, **Infiltrate**. After that each row of the map has its own key (built,
fourteenth round): **CAMERAS DOWN** lights **Hack** or **Route**, and exposing the **Reactor**
(all three drops down) lights **Payload** or **Extract**. Later spellings of B-R-E-A-C-H light a
Breach jackpot, and the third spelling an extra ball. Each job asks for a different way of shooting: stealth, target
precision, a flowing sequence, build-and-cash multiball, a hurry-up race. Finishing a final job
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

- One job at a time. The ball is held in the Breach during the intro.
- **No clock (built, tenth round):** a job lasts until you finish it. Only a **finished** job
  counts: it lights its node and opens the next row of the map, so you can't move on until
  you've finished it.
- **A drain pauses a job (built, eleventh round).** It carries on with the next ball (JOB
  CONTINUES on the display), but the step in progress starts over: Route's current lap, Hack's
  current code. Infiltrate keeps the shots you've snuck past, and Extract its finished legs.
- **Multiballs don't carry over.** If Payload's multiball ends before its super jackpot, the job
  fails: it doesn't count, and its row relights so you can start it again from scratch. A
  tilt ends any job the same way.
- **Keys (built, fourteenth round):** starting a job uses up its row's light, so the second job
  in a row needs the row's key again. A key earned while a job runs lights the rest of its row
  for afterwards.
- **Speed pays (built, eleventh round):** Infiltrate's, Hack's and Route's values hold for their
  first 30 s in play (clock rules: not while the ball is held or stuck), then drain to half over
  the next 120 s. The display alternates SHOTS PAY n%. Extract has its own drain (below).
- Completion pays the job's bonus (no time bonus any more). Completed jobs also count toward
  Total Blackout.
- If two jobs are available, the flippers choose while the ball sits in the Breach (4 s).
- RAGE is the only timed mode; its clock conventions are in the README.

### Infiltrate (first job; lit by spelling B-R-E-A-C-H)

- **Starts:** Breach.
- **Lights:** four entry points: Skyway, Black Market, Back Alley and Reactor.
- **Cameras down (change):** completing the three CAM lanes adds 8 s and blinds the camera for 8 s
  (no watched shot).
- **Twist:** the security camera watches one of them. That arrow strobes and the camera's beam
  points at it. The camera moves every 3.5 s, and jumps when you make a shot.
- **Scoring:**
  - An unwatched lit shot pays 500K, then 650K, 800K, 950K.
  - Making the watched shot means **SPOTTED**: no award, the camera sweeps faster, and every
    later shot pays 100K less.
  - Once all four are made, the camera gives up and the **Breach** lights **GET INSIDE**.
- **Timer:** none.
- **Ends:** success at the Breach (3M). A drain pauses it; the shots you've snuck past stay.
- **Reward:** the Infiltrate node lights, and CAMERAS DOWN now lights Hack or Route.
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
- **Timer:** none.
- **Ends:** three firewalls means **SYSTEM HACKED** (3M). A drain pauses it; the code in progress starts over.
- **Reward:** the Hack node lights, and exposing the Reactor now lights Payload or Extract.
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
- **Timer:** none.
- **Ends:** two laps means **ROUTE SET** (3M). A drain pauses it; the lap in progress starts over.
- **Reward:** the Route node lights, and exposing the Reactor now lights Payload or Extract.
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
- **Reward:** cashing three or more crates at once completes it (built today: collecting the super
  jackpot at the Reactor, lit for 20 s after three jackpots; missed, two more jackpots relight
  it). Only finishing it lights Blackout; losing the multiball first fails it, and its row
  relights.
- **Shooting style:** risk and greed: how long do you keep loading?

### Extract (hurry-up race)

- **Starts:** Breach (tier 2).
- **Lights:** three legs, one at a time: **Back Alley → Reactor → Skyway** **(change, so Extract
  doesn't repeat Payload's shots)**. The getaway runs out the back, blows the Reactor (the drops
  drop for this leg, and the captive ball is the shot), and escapes over the Skyway.
- **Scoring:** each leg is a hurry-up that starts at 6M, then 7M, then 8M and drains 200K a second
  down to 1.5M. Hitting it pays the current value and starts the next leg at full value.
- **Timer:** none. The bleeding hurry-up value is the pressure.
- **Ends:** all three legs means **EXTRACTED** (4M). A drain pauses it; finished legs stay.
- **Reward:** the Extract node lights. Finishing it lights Blackout.
- **Shooting style:** speed over precision.

### Blackout (wizard mode)

- **Lit when:** Payload or Extract has been finished.
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
  **(Built today:** four jackpots light the super at the **Reactor** for **20 s**; missed, two
  more jackpots relight it.)
- **Ends:** at one ball.
- **Shooting style:** both ramps and the orbit, then the scoop. Compare Blackout, which adds the
  Reactor.

### Vault multiball (new; built)

- **Start:** crack the vault. Hit its three tumblers in the order of the code.
  - **The code** is a random order of tumblers 1–3, for example 3-1-2. A new one is picked for
    every game and after every crack, never the same as the last. It shows on the display when a
    ball goes into the vault, on the bottom line while a ball is in there, and after a wrong
    tumbler. The tumbler lights show progress: in = on, next = slow blink.
  - The first tumbler pays 50K, the second 100K, and cracking the vault pays 1M.
  - A tumbler out of order pays 10K, shows **WRONG COMBINATION** and starts the combination
    over. If it was the code's first tumbler, that counts as the new start.
  - Progress carries over from ball to ball. It resets at a new game.
- **Balls:** three drop out of the vault's hatch onto its deck, 0.9 s apart, for four in play,
  with 12 s of ball save. The player can play them with the vault's flippers, or let them drain
  out the side to the right flipper.
- **Jackpot:** each ball shot out of the vault's top pays the **VAULT JACKPOT**: 1M, +250K each
  time. A JP light by the top exit strobes.
- **The back door stays open** for the whole multiball. A Back Alley shot goes straight back into
  the vault, which makes a loop: right flipper, Back Alley, vault, out the top for the jackpot,
  CAM lanes, pops, right flipper.
- **During another multiball** (Impound, Payload or Blackout), cracking the vault is an
  **ADD-A-BALL**: one ball drops out. The table holds at most 4 balls, so with 4 already in play
  the crack pays only the 1M.
- **Ends:** at one ball, with **VAULT CLOSED**; the back door shuts.
- **Shooting style:** play the vault's flippers like a small table. The first jackpot is a
  flipper shot inside the vault; the later ones come round through the Back Alley.

### Supporting features

- **B-R-E-A-C-H standups:**
  - A first hit lights its letter (25K); a repeat hit pays 10K.
  - All six reset the letters (+200K proposed; nothing today). **Built, fourteenth round:** the
    first time each game they **break in** and light Infiltrate. After that each spelling lights
    a **Breach jackpot** (1M, +250K for each collected; they add up), and the third spelling
    also lights an **extra ball** at the Breach (one a game).
  - The two posts at the scoop's mouth count as E and A (they were shadowing E).
- **CAM 1–3 top lanes and the security cameras (built):** three cameras pan over the three
  lanes.
  - **Fed by:** the plunge, the Back Alley, the vault's top exit, and balls the pops kick back
    up.
  - **Lighting:** only rolling through a lane lights it: 25K, or 5K if it's already lit. A lit
    lane is a knocked-out camera: its beam goes dark and its head drops.
  - **Lane change:** the left and right flipper buttons shift the lit lanes one place that way
    (round the end), together with R-A-G-E, and the dark cameras move with them. The pop bumpers
    don't affect the lanes.
  - **All three lit: CAMERAS DOWN**, worth 100K and $25K. The cameras stay dark and the lanes
    blink for 6 s, then the lanes reset. The back door opens for 20 s. Once Infiltrate is
    finished, it also lights Hack or Route (built, fourteenth round).
  - Lit lanes don't time out. They reset at each new ball.
  - In Infiltrate, the middle camera tracks the watched shot.
  - **(change, Phase 4):** CAMERAS DOWN also advances the bonus X (2× up to 6×) and raises the
    pop value by 1K (to 5K at most, for the ball). During Infiltrate it also adds time
    (above).
- **Skill shot (change; replaces today's):**
  - On the plunge, one CAM lane blinks, and the flippers move it.
  - Rolling through the blinking lane is a **SKILL SHOT**: 500K + $50K.
  - After a skill shot, making the Black Market within 5 s is a **SUPER SKILL**: 1.5M. The ball
    comes out of the pops onto the right flipper, so the Black Market is the natural next shot.
  - The old skill shot (Black Market within 7 s of any plunge) goes.
- **R-A-G-E lanes (the four in/outlanes):** the flippers move the lit letters. Completing R-A-G-E
  starts **RAGE**: 20 s where every switch pays 100K, pops 150K, and major shots 250K.
  **Finishing it on a gutter (built):** if the last letter is lit by a ball rolling down an
  outlane, that ball is saved when it drains and launched back into play. A gutter that lights
  any other letter loses the ball as usual.
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
    - **RAGE (built, eleventh round; replaces TIME):** starts RAGE, or adds 10 s if it's
      running; $60K. Unlike completing R-A-G-E, it doesn't raise the bonus multiplier.
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
    lit) and exposes the captive ball. Once Hack or Route is finished, it also lights Payload or
    Extract (built, fourteenth round).
  - A core hit raises **heat** (250K + 50K per heat level) and resets the drops after 1.2 s,
    unless a multiball wants them down. The eye glows hotter with heat.
  - **(change)** Heat 6 lights an extra ball at the Breach.
- **Bonus:** every major shot adds 1/20 of its value, every job adds 1/20 of its total, and
  BREACH and RAGE letters add a little. The total is multiplied by the bonus X at drain and lost
  on tilt.
- **Extra ball:** from the Black Market (once), the third B-R-E-A-C-H (built), Reactor
  heat 6 (once), or completing Blackout.
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
| Breach jackpot (each B-R-E-A-C-H after the first) | 1M + 250K each collected | same |
| Drop target / full bank | 25K / 100K | 25K / 150K |
| CAM lane: unlit / lighting / cameras down | – | 5K / 25K / 100K |
| Skyway | 75K | 100K |
| Black Market | 100K | 150K |
| Back Alley | 75K | 150K |
| Breach (no job running) | 25K | 50K |
| Reactor core | 100K + 50K/heat | 250K + 50K/heat |
| Combos | 50K × n | 100K / 250K / 500K / 1M |
| Job shot values over time (built) | full for 30 s of play, then down to 50% over 2 min | same |
| Black Market RAGE item (built) | $60K: starts RAGE or adds 10 s | same |
| Skill / super skill (CAM lane, then Black Market) | 500K / – | 500K / 1.5M |
| Infiltrate | 0.5–0.95M a shot, 3M finish | same |
| Hack | 250K keys, 1.5/3/4.5M codes, 3M finish | 250K keys, 1/1.5/2M firewalls, +2M brute force, 3M finish |
| Route | 0.6–2.4M steps, 3M finish | 0.6–1.5M steps, ×2 clean run, 3M finish |
| Payload | 1.5M + 250K ramps, super 3× | crates 1M + 250K, cash ×1.5 |
| Extract | 6M / 7M / 8M draining 200K/s, 4M finish | same |
| Impound jackpot / super | 1M + 250K / 3× | same |
| Vault: way in / out the top | 50K / 100K | same |
| Vault tumbler: 1 / 2 / cracked / out of order | 50K / 100K / 1M / 10K | same |
| Vault jackpot (out the top in vault multiball) | 1M + 250K | same |
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

- **Impound:** a raised steel cage on four legs over the orbit lane on the left, with a red
  beacon on its corner and three chrome balls visible behind its bars. A wire runs up into it
  from the Skyway's turn down the left.
- **THE VAULT (upper playfield):** a dark tread-plate deck with a big painted safe dial, the
  raised tumbler block at the back with its three red standups, and a hazard-striped back door
  in the orbit's wall.
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
  stains, BACK ALLEY stencilled with arrows, and three cameras on the top rail over the CAM
  lanes.
- **CAM 1–3:** three rollover lanes under the arch with rubber-capped posts, each with a small
  camera icon and a red light.
- **Pops:** three industrial canisters (ribbed, riveted, red lens caps), about three balls
  across, on a ribbed steel deck in their own walled nest. No pipes between them (you found
  them confusing).
- **The brain (thirteenth round; replaces the skull):** a top-down brain under the heist map,
  front up the table: two pale grey hemispheres with only a hint of pink (toned down at your
  request, same brightness), a dark fissure, folds in pen with soft
  grooves and lit crests, darker toward the rim, on a hatched shadow. Every job plaque and light
  of the map sits inside it, with the map's links running over it like implants.
- **Drain:** plain concrete between the flippers (the skull and its plate are gone), with the
  bonus lights, hazard stripes down the drain throat, and mesh grilles on the apron.

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
| Lower playfield | Slings are flat grey triangles. Inlane rails are clean tubes. The skull is gone (thirteenth round); the brain under the heist map is the centrepiece. The apron and shooter lane are plain. |
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

**Flash safety.** Nothing that lights or darkens a large part of the screen flashes more than 3
times a second: fast full-screen flashing can trigger seizures. That covers:
- the GI: in Rage and Blackout it pulses slowly (0.6 a second, never below 86%), never flickers;
- lamp shows that light every insert at once: the strobe show blinks 2.5 times a second;
- the full-screen colour flash: at most one every 0.4 s.
Single inserts may blink faster, since each covers only a small area. Rules tests check all of
this.

### Inserts

| Insert | Meaning | States |
|---|---|---|
| Light stack, one per major shot (Skyway, Black Market, Back Alley, Breach, Reactor): arrow, JP and mode light in a line on the shot's approach, the arrow nearest the shot and pointing at it | **Arrow:** something to collect there (job shot, lock, affordable purchase). **JP:** a jackpot is lit there. **Mode light:** the running job wants this shot (in the job's colour). | Arrow: slow = available, fast = under 6 s, strobe = super or grace; the watched shot in Infiltrate strobes. JP: fast. Mode light: follows the arrow while a job wants the shot. |
| B-R-E-A-C-H letters (6, one in front of each standup, pointing at it) | Letters spelled. In Hack, the flashing key. | On = spelled, fast = the key to hit. |
| Drop lamps (3) | Drop is down. | On. |
| LOCK (Skyway lane) and the IMPOUND light | Lock lit; Impound multiball running. | Fast = lock lit, slow = multiball. |
| Tumblers 1–3 (one in front of each, pointing at it) | The vault's combination. | On = in; slow = the next one to hit; fast = just hit, and all three while the vault's hatch is open. |
| Vault JP (by the vault's top exit) | Vault jackpot lit. | Fast during vault multiball. |
| Vault lane arrow | Back door open. | Slow while it's open. |
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
| Multiball start | Lamp strobe (2.5 a second); balls drop from the Impound or the vault one at a time. | Animated card (IMPOUND BREAKOUT, PAYLOAD, BLACKOUT). | Siren, then multiball music. |
| Job done or over | — | Summary card: "HACK DONE 7.3M" or "ROUTE OVER 2.1M". | Rising or falling sting. |
| Drain | Lamps fade to 70%. | Bonus count: one line per category, then × bonus X, then the total. | Drain thud, count ticks. |
| Ball saved | SHOOT AGAIN flashes. | BALL SAVED. | Save chime. |
| Tilt warning / tilt | Lamps go out. | DANGER / TILT. | Buzzer. |
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
- Bottom right rotates through what's lit: BREACH LIT, EXTRA BALL LIT, BREACH JP, LOCK LIT,
  BLACKOUT LIT, SPELL BREACH (until you break in), the B-R-E-A-C-H progress (B R E _ _ _), R-A-G-E progress, cash.
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
  sketch. All floor-level art: concrete, grime, plates, stencils, unlit inserts, the brain under
  the heist map, the apron, the bases of raised parts.
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

### 30 October 2026: colour schemes compared

Five alternate colour schemes were previewed on the current table (recoloured screenshots, in
[`art/palettes/`](art/palettes/)). **The current scheme stays.** Two of the alternates are set
aside for future tables: **Toxic Yard** (green) for a post-apocalyptic fallout-shelter vault
table, and **Oxide** (brown and turquoise) for a western.

### 30 October 2026, fourteenth round: the keys (built)

You'd rather not have to spell B-R-E-A-C-H before every job: spell it once to break in, and let
other triggers light the later jobs. Built as proposed (the details are in section 0):

- **Row 1, INFILTRATE:** spell B-R-E-A-C-H, then shoot the Breach: breaking in. The only time you
  have to spell it (Infiltrate would no longer come lit at the start).
- **Row 2, HACK or ROUTE:** lit by **CAMERAS DOWN** (all three CAM lanes): security is blind, go
  deeper.
- **Row 3, PAYLOAD or EXTRACT:** lit by exposing the **Reactor** (all three drop targets down),
  as a second reward for the shot that lights the lock. (Cracking the vault was considered, but
  its random code makes it too hard a gate.)
- **BLACKOUT:** as now, lit by finishing Payload or Extract.
- **Spelling B-R-E-A-C-H after that** becomes a reward, not a gate: a Breach jackpot (1M, +250K
  each collected), and the third spelling also lights an extra ball. One a game, so it can't be
  farmed (the proposal said every third spelling; with the cap that is the same thing).
- **E fixed:** the scoop's mouth posts count as E and A. The left post had been taking most shots
  at E (2% of aimed shots, now 11%).
- **Not built:** the simpler alternative, a chain where finishing a job lights the Breach for the
  next. Easier to learn, but the rest of the table would matter less for progress.

### 30 October 2026, thirteenth round: the brain (built)

1. **Skull and plate removed;** a top-down brain sits under the heist map, with every map light
   inside it. Lights unchanged.

### 30 October 2026, twelfth round: balance and solid targets (built)

1. **Black Market a little harder** (mouth 56 → 53), **Back Alley a little easier** (orbit post
   moved 12 right; moving-ball shots 2% → 4%). The Skyway is unchanged: widening it didn't help,
   because moving balls rarely launch that far across.
2. **Targets drawn as solid blocks.**
3. **Open:** if the far sides should be easier still on a moving ball, the remaining levers
   change the flippers' feel (for example a longer stroke), so they're yours to call.

### 30 October 2026, ninth to eleventh rounds (built)

1. **H can be hit:** the A-C-H bank runs flush to the Black Market's wall (ninth), and the
   ramp's drawing matches (tenth).
2. **Jobs have no clock** and only a finished job opens the next row (tenth).
3. **A drain pauses a job;** only the step in progress restarts. Multiballs don't carry over:
   Payload still fails if its multiball ends before the super (eleventh).
4. **Speed pays:** job values drain to half after 30 s of play (eleventh).
5. **Timed supers:** 20 s for the Impound's and Payload's super jackpots (eleventh).
6. **RAGE replaces TIME** in the Black Market (eleventh).
7. **Still open:** the shot balance (Black Market against the far sides), and whether to redraw
   the targets as solid blocks.

### 30 October 2026, eighth round: R-A-G-E gutter save (built)

1. **Finishing R-A-G-E on a gutter saves that ball.** Any other letter on a gutter doesn't.
2. **Open:** should the gutters also stay protected for the rest of RAGE mode (the fuller
   version of option 2)? Not built, since you described only the finishing-letter save.

### 30 October 2026, seventh round: lane change on the flipper buttons (built)

1. **The CAM lanes shift only with the flipper buttons**, like R-A-G-E. The pop bumpers don't
   touch them. (The sixth round wrongly had the pops shift them.)
2. **The start screen explains the rules** in four plain steps.

### 30 October 2026, sixth round: CAM lanes, frame rate, speed (built)

1. **CAM lanes light only from the ball rolling through them.** Pop bumper hits shift the lit
   lanes (and the knocked-out cameras) one to the right. All three lit is CAMERAS DOWN.
2. **Smoother frames:** the camera beams are cheap to draw again, the table is drawn at up to 2×
   pixel density, and a fast ball leaves a faint smear between frames.
3. **Speed:** the physics is unchanged, but a button next to mute sets the game to 100%, 90% or
   80%. **Open:** try 90% and 80%. If one feels right, it can become the default.

### 30 October 2026, fourth round: random code, no strobing (built)

1. **The vault's code changes every time:** a random order of the three tumblers, new every game
   and after every crack, shown on the display and by the tumbler lights.
2. **Whole-table strobing removed:** Rage's lighting flicker, the 6-a-second lamp strobe show and
   back-to-back screen flashes. Large-area flashing now stays under 3 a second (section 5).
3. **Physics unchanged.**
4. **Open:** should CAMERAS DOWN do more than open the back door?

Fifth round (same day): **the vault gives three balls**, not two, so VAULT MULTIBALL is a
4-ball multiball, the biggest on the table (Impound and Blackout are 3-ball). A stress run that
cracked the vault every 30 s had no stuck balls and no leaks.

### 30 October 2026, third round: the vault's combination (built)

1. **The tumblers are the vault's combination:** 1, then 2, then 3. A wrong one starts it over.
2. **Cracking it starts VAULT MULTIBALL:** two balls (three since the fifth round) drop out of the
   vault's hatch onto its deck.
   Out the vault's top is the jackpot, and the back door stays open so the Back Alley feeds the
   vault. During another multiball it's an add-a-ball. The rules are in section 2.
3. **The door off the Back Alley is renamed the back door.**
4. **Physics unchanged.**
5. **Open:**
   - Should the combination stay 1-2-3, or change each time? (Answered: random, fourth round.)
   - Is two extra balls the right size? (Answered: three, fifth round.)
   - Should CAMERAS DOWN do more than open the back door?

### 30 October 2026, second round: the upper playfield (built, waiting for your review)

1. **Upper playfield: built** as THE VAULT, with its own flippers, a way out the side and one out
   the top. Section 0 has the summary and section 1 the details. The lane in is very hard (1%),
   so the back door off the Back Alley is the main way in.
2. **Skyway: rerouted** straight across above the Breach and down the left. It now takes 19% of
   cradled flips.
3. **Cameras:** three side by side over the CAM lanes. Knocking out all three (with the lanes or
   the pops below) opens the back door.
4. **Visual fixes:** pop bumpers, the bars between them, the Reactor, the flashers and the
   Impound, as listed in section 0.
5. **The ball you circled** was an Impound lock. The Impound is now a cage you can see into.
6. **Physics feel unchanged.** Flippers, gravity and bumpers are untouched. The one physics
   change is the weak-plunge fix (section 0), which only affects a ball that used to get stuck.
7. **Open:** the vault's rules (since settled: third round), and whether CAMERAS DOWN should do
   more than open the door.
8. **Art:** still waiting for your approval of the layout. The template is regenerated.

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
10. **Next (proposed by you):** a mini-playfield in the upper-left dead area, with its own
    flippers. Written up at the end of section 1, to build after you've tested the fan layout.

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
