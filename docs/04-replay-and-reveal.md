# Replay, and what the viewer is allowed to see

**Written:** 2026-09-07
**Settles:** the build order, and the reveal model. Decided by Chris.

## The decision

**Archive data now; live later.** The product ships against completed races, and
the live transport is added when the rest works.

**But it plays as though live.** A finished race replays in real time, and while
it is playing the viewer sees only what has happened up to their clock. Reaching
the chequered flag unlocks the whole race.

This is not a compromise or a stand-in. It is the same product with a different
clock origin — the mechanism `docs/02-broadcast-sync.md` already required.

---

## 1. Why this is the right order, not just the convenient one

**Windowed replay forces every analytic to be live-ready before live exists.**

A race replayed with a window can only ever see a *prefix* of the data: thirty
laps in, lap 31 has not happened. That is precisely the condition live imposes.
So building this now means:

- Every analytic is written against partial data from the first line, rather
  than retrofitted later. Retrofitting is where a whole-race assumption hides.
- All of it is verifiable, because the race is finished and its real outcome is
  known. A gap computed at lap 30 of the replay can be checked against what the
  gap actually was at lap 30.
- **The live transport becomes a genuine swap** rather than a second
  implementation. The clock changes origin; nothing above it changes.

The alternative — build against whole races, add live afterwards — produces
analytics that quietly assume they can see the end of the race. That assumption
does not announce itself. It surfaces as wrong numbers during the one hour a
year the product is under load.

### The rule this creates

**No analytic may read data later than the clock.** Not "should not" — the
windowed data is the only thing it is given. The window belongs in the transport
layer, alongside the delay buffer, for the same reason: anything that can see
un-shown data will eventually leak it.

---

## 2. What the viewer sees, and when

| State | What is available |
|---|---|
| **Playing** | Everything up to the clock. Nothing after it |
| **Finished** | The whole race. Explorer, full charts, every segment |

The three moments from `context.md` §3 divide along that line: **Glance and
Question live in the windowed state; Dig belongs to the finished state.** That is
also true of a live race, which is the point — the replay is not a different
product.

### Reaching the end without watching two hours

Someone who wants to study Spa 2024 should not have to sit through it. The
recommended answer is **not** a second mode, but a control inside the one model:

- The clock is scrubbable. Drag it forward and more of the race is revealed.
- Drag it to the flag — or press a "jump to the end" control — and the race is
  finished, with everything unlocked.

One concept, one clock, and the fast path to Dig is a single action. **Not yet
ratified**, but recommended, because without it the Dig moment costs two hours.

### Does it stay unlocked?

Recommended: yes. Once a viewer has finished a race, it stays finished for them
— re-watching to re-earn access would be tedious and would punish returning.

With no accounts, that state lives in the browser (`localStorage`), so it is
per-device and can be lost. That is acceptable: the cost of losing it is one
scrub to the end, not lost work. **Open**, but the recommendation is to keep it
simple and not build accounts for this.

---

## 3. Playback speed

Default **1×** — "the same experience" is the whole point, and a race unfolds at
the pace it unfolds.

A speed control is nearly free once the clock is an abstraction, and it is worth
having: it turns a two-hour verification cycle into a two-minute one during
development, and lets a viewer skim a dull stint. Recommended, with 1× as the
default and the current speed always visible.

**Beware:** at high speed the analytics are being asked to recompute far faster
than live ever will. That is a useful stress test and a plausible source of
frames dropped in ways live would not — worth knowing when something looks
wrong at 10× and fine at 1×.

---

## 4. What this defers

Both of the project's blocking decisions move to *later*:

- **The server.** Archive data is static files. A browser can fetch them from
  static hosting directly, so the poller and fan-out in `context.md` §5.2 are
  not needed until live is. That reasoning stays true and stays written down; it
  is simply not now.
- **Whether OpenF1 charges for real-time.** Irrelevant until there is a live
  transport. Historical data from OpenF1 is free, and FastF1 covers the archive
  regardless.

**The rate-limit constraint still applies the moment live arrives.** It is
deferred, not repealed.

---

## 5. What this changes about the build order

Replay stops being a mode added at the end and becomes the spine:

1. Archive pipeline — one race, verified against its real result
2. Analytics — **written against a prefix, never the whole race**
3. Design system as code
4. **The clock and windowed replay**
5. Dashboard, on replayed data
6. Explorer, in the finished state
7. 3D circuit
8. Public readiness — onboarding, phone, the two-hour session
9. *Later:* server, then live transport

Everything from 1 to 8 runs on a race that finished two years ago, with no
server, no live source, and nothing that can rate-limit.
