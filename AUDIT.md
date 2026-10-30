# Cyber Psychosis: audit (30 October 2026)

You asked for an audit of every element, from how it works to how achievable it is, down to each
bumper, plus a check that the modes and rules hang together. This is the report. Everything
under **Changed** is built, tested and in phone build version 20. Everything under **For your
decision** is unchanged and waits for you.

How it was checked:

- **Aimed shots:** every flip timing 2 ms apart off each flipper, from a cradled ball and from a
  ball rolling off the inlane. A share is the fraction of timings that makes the shot
  (`npm run measure windows`).
- **Where the ball goes next:** every aimed flip whose first hit is a given target, followed until
  it reaches a flipper or drains.
- **Natural traffic:** two hours of bot play (about 50 games), counting every hit on every pop,
  sling, lane, target and shot. The bot flips at random, so these counts show how the table feeds
  itself, not how good players aim.
- **Rules:** a full read of the rules code by a separate reviewer, with every suspected problem
  reproduced in a script before it was reported, and checked again here before fixing.
- **Display:** every message in the code checked against the display's width and font.

---

## Changed

### The Breach

**The problem.** The Breach starts every job, yet only 2% of cradled right-flipper timings made
it, against 10–19% for the other main shots. In bot play it was the rarest shot on the table:
once an hour, against 64 for the Black Market.

**The cause.** From a cradle, a flipper doesn't sweep its launch angle smoothly as the timing
changes. Long stretches of timings send the ball at the same angle. On the right flipper about
40 ms of timings leave at about 102°, and none leave between 102.8° and 109.4°. Those 102° balls
all hit the Breach's right post.

**The change.** The right lip of the mouth flares 10 units wider (62 units across, was 52). The
A-C-H bank now starts at the new post and still meets the Black Market wall exactly (44.5 units
long, was 53.6). The left side, the scoop's throat and the flippers are unchanged.

| | Before | After |
|---|---|---|
| Breach, right flipper, cradled / on the move | 2% / 11% | **9% / 13%** |
| Breach, left flipper, on the move | 0% | 3% |
| Breach in bot play | 1 an hour | **12 an hour** |
| Right-flipper hits on A that drain | 5 of 28 | **0 of 24** |
| H, B, the Black Market | unchanged | unchanged |
| Breach kickout | left flipper, 12 of 12 | left flipper, 12 of 12 |

Smaller nudges were tried first (moving the whole Breach 3–6 units, turning it 2° either way). None
helped, because the right flipper's aim from a cradle skips that range wherever the scoop sits.
Turning the A-C-H bank toward the right flipper to help C was also tried: C stayed at 0–1% from the
right flipper, and H collapsed from 16% to 2%, so the bank keeps its angle.

**Also from this round:**

- The two posts at the Breach's mouth count as E and A. The left post had been taking most balls
  aimed at E: fired at every angle from the right flipper, E took 2% before and 11% after.
- Every display message now fits, and the display font has `$` and `%`.

### Rules (all reproduced first; each fix has a test that fails on the old code)

| # | What was wrong | Now |
|---|---|---|
| 1 | **A tilt during the Breach's job choice held the ball forever; the game locked up.** | The ball is let go. |
| 2 | **A tilted ball still played the rules.** A job could start and carry into the next ball. Finishing R-A-G-E started RAGE and raised the bonus X. A third lock started Impound multiball on dead flippers. Letters, keys, tumblers and cash all counted. | The physics carries on but no rule does. RAGE ends with the ball. |
| 3 | A tilt didn't void Payload (a finished Payload still counted and lit Blackout). A tilt in Blackout still stepped the heist up. | A tilt voids Payload like any other job. A tilt in Blackout restarts the heist without the step up (it must restart, or Blackout could never be lit again). |
| 4 | With the back door open, a Back Alley shot went into the vault without counting as the Back Alley. For a whole vault multiball, Route could be stuck on NEXT BACK ALLEY. | It counts as the Back Alley, then goes in. |
| 5 | `<JOB> CONTINUES` was overwritten by `BALL n` in the same frame, so it was never seen. | It follows `BALL n`. |
| 6 | Messages replaced in the same frame: a finished job's title and bonus by `DONE / TOTAL`, the Impound super by `REACTOR HEAT`, and any jackpot, skill shot or job message on the Black Market ramp by the shop's price. | Each is shown in turn, or the lesser one is skipped. |
| 7 | The ball save ran down while the ball was held in the Breach (a plunge straight into a job choice left 6 of 12 s), and ignored the speed setting. | It waits while the ball is held, and follows the speed setting. |
| 8 | RAGE paid 100K per spinner turn. One Skyway shot spins it 8–15 times, so it paid up to 1.5M, against 250K for a shot. A spinner turn also earned $1.5K, not the designed $500. | The spinner is out of RAGE, and earns $500 a turn. |
| 9 | A drain didn't restart Extract's leg in progress, unlike every other job's current step. | It does: the leg's hurry-up starts again at full value. |
| 10 | Cracking the vault while balls were queued for the plunger could put 5 balls in play. | The 4-ball limit holds. |
| 11 | `MULTIBALL OVER` and `VAULT CLOSED` showed the next jackpot's value. | They show what the multiball paid. |
| 12 | The lock lights stayed lit during other multiballs, when nothing can lock. | They go out. |
| 13 | Payload's and Blackout's jackpot shots never lit their JP lights, and the Reactor's JP light could never light. | They light, and the Reactor's lights for every super. |
| 14 | RAGE forced every arrow to a slow blink, hiding a lit Blackout, and blinked all four R-A-G-E letters, hiding which were lit. | Bigger states win. Lit letters stay solid and the unlit ones blink. |
| 15 | The map's fourth junction light could never light. | The junction lights now show how far into the heist you are, and blink while Blackout is lit. |
| 16 | A key earned during a job said `SHOOT THE BREACH`, when the Breach can't start it yet. | It says `AFTER THIS JOB` or `AFTER THE MULTIBALL`. |
| 17 | Job status hid the Impound or vault jackpot, and RAGE hid `SHOTS PAY n%`. | The job screen's bottom line takes turns with them. |

The README had fallen behind the code in a dozen places: reactor heat, Route's values, which jobs
"speed pays" applies to, message names, the diverter, the step-up after Blackout, the Impound's
jackpot carrying over and its locked balls being used by other multiballs. It's corrected.

Tests: 216 rule checks (was 194). The soak test runs clean (no leaks, nothing stuck).

---

## For your decision

### 1. The flippers' aim from a cradle (this is flipper feel, so it's yours)

From a cradle, each flipper's launch angle jumps between a few favoured angles. These are the
stretches of timing that all give the same angle:

| Flipper | Favoured angles |
|---|---|
| Right | 102°, 109°, 124° |
| Left | 55°, 70°, 77° |

Big gaps in between can't be reached from a cradle at all (right flipper: 102.8–109.4° and
119.2–123.7°). Shots that sit on a favoured angle are easy: the Skyway (19%) and the Back Alley
(10%). Shots in a gap are nearly impossible from a cradle:

- letters R, E and C;
- the vault lane (1%);
- the Breach, before this round.

Live shots and rebounds still reach them, so the table plays. Real flippers sweep the angle
smoothly as the ball rolls down the bat.

**Proposal:** look into why the angle jumps (most likely the ball briefly leaving the bat as the
flipper drops) and smooth it. That would change how the flippers feel, so I haven't touched it.

### 2. The drop targets feed the right outlane

Hit from the left flipper, drop 1 sends the ball into the right outlane 24% of the time and drop 2
34% of the time. These are the drops you must clear for the lock and for Payload or Extract. In bot
play the right outlane drains about 3.5 balls for every one down the left. Its other feeders are
the left slingshot (20% of the hits measured) and SAFE (17%).

**Options:**

- angle the drop bank a few degrees so rebounds come back to the left flipper;
- move the right outlane's post in (real cabinets have adjustable outlane posts);
- leave it as the table's danger zone (the manual warns about it).

### 3. Smaller design questions

| | Today | Question |
|---|---|---|
| The Back Alley's diverter | Built into the layout, never used by any rule. | Use it (for example, hold the loop open during Route, or for a few seconds after a combo, as DESIGN.md proposed), or remove it. |
| Locked balls | Payload and Blackout use balls waiting in the Impound first, emptying the lock (as a physical lock would). | Keep, or make the lock virtual so progress survives. |
| TOTAL BLACKOUT | Once Blackout is lit, any core hit with no job running starts it. To finish all five jobs first you must stay off the core, even though exposing the core is also the key to the last row. | Keep as a risk, or start Blackout from a deliberate shot (for example, the Breach) instead. |
| Skill shot after a lock | Every ball served after a lock gets a fresh skill shot (500K and $50K), but no ball save. | Keep (common on real tables), or skill shot only on new balls. |
| The step-up after Blackout | Raises jobs, RAGE and Blackout by 0.5X. Impound, vault, Breach jackpots, shots and CAMERAS DOWN don't scale. | Scale more of it? |
| SAFE and VENT | Plain targets: 25K and $10K. DESIGN.md proposes making them Hack's remote keys. | Build that? |
| The 10X item | On the menu, never sold. | Build the rule (DESIGN.md has it) or take it off the menu. |

### 4. Mild unevenness (fine as it is; listed so nothing is hidden)

- **Pop bumpers:** in bot play the top-left pop takes 650 hits an hour, the top-right 420 and the
  lower one 145.
- **Inlanes:** the right inlane gets about 7 times the left's traffic, because the Black Market,
  the pops and the Back Alley all return there and only the Skyway returns left. R-A-G-E relies on
  the lane change, as on a real table.
- **CAM lanes:** CAM 1 gets about twice the plunges of CAM 2 or 3 (the lane change makes up for
  it).
- **The Vault:**
  - the upper left flipper reaches tumbler 1 (11% of cradled flips) and tumbler 3 (6%); the upper
    right flipper reaches tumbler 2 (13%);
  - the upper right flipper also sends 59% of cradled flips down the Vault's drain;
  - unaimed, tumblers 2 and 3 are rare.
- **Letter C** is the hardest letter: 10% on the move from the left flipper (off the Skyway's
  return), and not from a cradle. Bot play hits it about 3 times an hour, against 13–48 for the
  others.

### 5. Code tidy-up (no effect on play)

The review listed unused code you can delete when convenient:

- the time-bonus branch of a job's completion;
- `Mode.progress()`, `meter()` and `clockMax`;
- the timed branch of the lamp urgency;
- `Game.slowmo`;
- `Blackout.completed`;
- Extract's always-true clock check;
- the `played` set, which always equals `completed`.

---

## The measurements

### Aimed shots after this round (cradled / on the move)

| Left flipper | | Right flipper | |
|---|---|---|---|
| Skyway | 19% / 2% | Black Market | 12% / 4% |
| Black Market | 9% / 16% | Back Alley | 10% / 4% |
| Reactor core (drops down) | 10% / 10% | The Breach | 9% / 13% |
| Drop 1 / drop 2 | 13% / 11%, 12% / 12% | Vault lane | 1% / 0% |
| Drop 3 (once drop 2 is down) | 11% | H / A / B | 15/11, 9/11, 6/0 |
| VENT | 13% / 5% | SAFE | 7% / 2% |
| H / C / A | 0/5, 0/10, 0/10 | | |
| The Breach | 0% / 3% | | |

### Where the ball goes after a target (aimed flips that hit it first)

| Target | Drains |
|---|---|
| Drop 1, from the left flipper | 24% (right outlane) |
| Drop 2, from the left flipper | 34% (right outlane) |
| Drop 1, from the right flipper | 25% (left outlane) |
| Left slingshot, from the left flipper | 20% |
| SAFE | 17% |
| B | 25% (8 hits measured) |
| A from the right flipper | 0% (was 18%) |
| H, C, VENT, drop 2 from the right flipper | 0–4% |

### Bot play per hour (before → after this round)

| Shot | | Letter | | Lane | |
|---|---|---|---|---|---|
| Black Market | 64 → 41 | B | 30 → 32 | R (left outlane) | 27 → 22 |
| Skyway | 27 → 30 | R | 51 → 48 | A (left inlane) | 35 → 37 |
| Back Alley | 20 → 21 | E | 26 → 13 | G (right inlane) | 264 → 219 |
| Breach | 1 → 12 | A | 25 → 15 | E (right outlane) | 92 → 95 |
| Reactor core | 6 → 9 | C | 7 → 3 | | |
| | | H | 41 → 46 | | |

Pops 651 / 421 / 145 an hour; slings 356 left, 268 right; spinner 400 turns; SAFE and VENT 73 each;
CAM lanes 232 / 107 / 129.

### Clearances

Every gap is at least 1.07 balls. The tightest are:

- the pop exit lane and gate (30 units);
- the vault lane (31.4);
- the upper flippers' tip gap (34.6).

The Breach's mouth is now 2.21 balls wide and its throat 1.57. H meets the Black Market wall exactly.
