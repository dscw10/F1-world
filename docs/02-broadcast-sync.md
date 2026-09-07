# Time, delay, and broadcast sync

**Written:** 2026-09-07
**Settles:** the delay stance from `context.md` §8. Decided by Chris.
**Status:** decided in principle, detail open.

## The problem

Timing data reaches a client at or before the moment the viewer sees the
corresponding action on television, and streaming viewers are further behind
again. A live dashboard therefore reveals events before its own user's screen
shows them. A pass, a crash or a retirement arrives as a spoiler in the exact
moment the product exists to enhance.

## The decision

Three modes, built on **one mechanism**.

| Mode | Time origin | Pausable | Default |
|---|---|---|---|
| **Live edge** | Wall clock, zero offset | No | **Yes** |
| **Offset** | Wall clock minus a user-set delay | No | — |
| **Broadcast sync** | A moment the user marks | **Yes** | — |

### Live edge (default)

Offset zero. Data as fast as it arrives. Correct for anyone at the circuit, on a
low-latency feed, or who does not care about being ahead.

### Offset

The user dials in a delay to match their broadcast. Set either as a number, or —
better — by a calibration gesture: **the user taps when they see the lights go
out**, and the offset is computed from the difference. Same gesture, no number
to understand.

### Broadcast sync

The session has finished. The recorded data replays as though live, and the user
starts it at the moment their own broadcast starts. They can pause when they
pause their television.

## Why broadcast sync is worth more than it looks

It was proposed as an accommodation for people watching late. It is
architecturally the most valuable of the three.

**It is not a third mode.** It is the same clock with a different origin — wall
clock for live, a user-marked instant for sync. One implementation, one code
path. If the clock is built as an abstraction from the start, sync is nearly
free; if live is hardwired to `Date.now()`, retrofitting it is a rewrite.

**It gives back what the pivot to live cost.** `context.md` §2 records that
going live sacrifices the demonstrable-on-any-day property. Broadcast sync
returns it: any past race can be played as though it were happening now. The
product becomes showable on a Tuesday, in a portfolio, to a customer, in a test —
with the live interface, not a degraded one.

**It makes the live UI testable without a race.** Otherwise the live half of the
product can only be exercised roughly twenty-four times a year, on a schedule
nobody controls. That is a miserable way to build and an impossible way to debug.

**It may serve more people than live does.** Timezone races, recorded viewing,
catching up next morning. A significant share of the audience never watches
live, and for all of them the live edge is useless and broadcast sync is exactly
right.

**Pause only works here.** You cannot pause a live feed. Sync owns its clock, so
it can.

## Consequences to design for

**Pausing during a live session is coherent — allow it.** Pause at the live edge
and you become a delayed viewer by however long you paused. That is the same
mental model, and it means live and offset are really one mode with a variable
lag rather than two things.

**Default zero means the product spoils people by default.** This is a real
tension with the hard constraint in `CLAUDE.md` ("never spoil the viewer's
broadcast"), and it is resolved deliberately rather than ignored: the constraint
becomes *never spoil the viewer without their informed choice*. That places a
requirement on onboarding — **the delay choice must be presented once, clearly,
before the first session**, not buried in a settings panel. If a user is spoiled
without having been offered the setting, the product broke its own rule.

**The mode must be legible while running.** Someone who set an offset three
weeks ago and forgot needs to be able to tell at a glance why the numbers
disagree with their screen. A visible, quiet indicator of which clock is running
and how far behind it is.

**Data arriving is not the same as data being shown.** With any offset, the
application holds data it is not yet displaying. The buffer belongs in the
transport layer, below the analytics, so no analytic and no component ever needs
to know about delay. An analytic that can see un-displayed data will eventually
leak it.

## Open

- The measured size of broadcast delay across common providers. Must be
  established empirically during a real session, not asserted.
- Whether the calibration gesture is the primary way to set an offset or a
  convenience alongside a numeric control.
- Whether events and continuous state should be tiered differently — gaps and
  tyre age updating freely while passes and incidents are held. Not needed if
  the offset applies uniformly, and uniform is simpler; revisit only if uniform
  proves unsatisfying in use.
- Whether broadcast sync should be offered for *any* past race, which makes it a
  replay product in its own right and a plausible free tier.
