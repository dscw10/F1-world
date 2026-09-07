# F1 Live Race Dashboard — Project Context

**Owner:** Chris
**Status:** Scaffolded and deploying. Next.js static export → GitHub Pages at
https://dscw10.github.io/F1-world/ . WP3 (design tokens) part-done with
placeholder values. The product itself is not built.
**Last updated:** 7 September 2026

**Purpose of this file:** the single source of truth for what this project is,
what is decided, and what is still open. Read it at the start of every session.
Update the decision log whenever a decision is made or changed.

> **Read §2 before planning anything.** The project changed direction on
> 2026-09-07. Everything written before that date lives in
> `docs/archive/2026-08-build-log.md` and is history, not instruction.

---

## 1. What this is

A **free race dashboard** that plays a Grand Prix as it happened. The viewer
follows their driver and interrogates the race as it unfolds — not a passive
scoreboard, but a surface where they can ask their own questions of the data
while it arrives.

**It runs on completed races for now, replayed in real time; live data comes
later.** While a race is playing the viewer sees only what has happened up to
their clock, exactly as they would live. See §5.0 and
`docs/04-replay-and-reveal.md`.

**Success criterion: real people find it genuinely useful during real races.**
Not a portfolio object, not a technical demonstration. That single choice
outranks everything else in this document, and where craft and usefulness pull
in different directions, usefulness wins.

The distinguishing idea is **"play data engineer"**: the viewer builds their own
view rather than consuming a fixed one. They pick what to measure and what to
measure it against, and the interface answers or explains why it can't. The old
build proved this works (`lib/explore.ts`, a dimension × measure lattice) and
that concept is carried forward.

The circuit is rendered in 3D — the racing line with its real measured elevation
— and used only for findings that are genuinely spatial. It is a supporting
element, not the headline.

### What it is not

- **Not a paid product.** Dropped 2026-09-07. Free, for everyone, no accounts,
  no tiers, no billing.
- **Not a live driver tracker.** Apple TV ships one free, on the same screen as
  the race. Dots moving round a circuit is commodity.
- **Not a craft or portfolio piece.** That was the original framing. The
  execution should still be good, but "it looks beautiful" is not the test.
- **Not a broadcast replacement.** It assumes the viewer is already watching.

---

## 2. How this got here

Two direction changes in one day, both on 2026-09-07. Recorded so nobody has to
reconstruct why the archive disagrees with everything.

**August 2026:** a post-race spatial analysis piece, framed as a craft/portfolio
object. Offline pipeline, static JSON, no network beyond map tiles. Its code was
never committed here and is gone.

**Morning of 2026-09-07:** a live dashboard with a paid AI tier.

**Afternoon of 2026-09-07:** the paid tier dropped. A free public tool.

### What dropping the paid tier fixed

It resolved the single hardest problem in the project. The licensing research
(`docs/01-live-source-licensing.md`) found that legal comfort and product
quality were inversely related: the telemetry the product needs existed only in
sources that forbid **commercial** use.

Remove the commerce and that tension disappears entirely.

| Was blocked | Now |
|---|---|
| OpenF1's CC BY-NC-SA licence forbids commercial use | **Non-commercial is exactly what it permits.** Usable |
| Unknown whether licensed resellers carry telemetry | Irrelevant. Not buying data |
| Needs a solicitor before taking money | No money, no solicitor |
| Auth, billing, accounts, tiers | All gone |

What survives from that research: **trade mark**. F1 enforces its marks, and a
public tool with "F1" in the name is exposed regardless of whether it charges.
See §8.

### What choosing "useful" over "craft" costs

1. **Phone is probably now mandatory.** A second screen during a race is a phone.
   Desktop-first was defensible for a craft piece and is hard to defend here.
2. **A server becomes mandatory.** See §5.2 — this is the largest technical
   consequence and it is not optional.
3. **Reliability outranks polish.** The feed will drop mid-race. What the
   interface does in that moment matters more than any transition.
4. **Onboarding is real work.** Strangers arrive with no context. The delay
   setting in particular has to be explained to someone who has never thought
   about broadcast latency.
5. **The 3D scene is demoted.** Still in scope, still road-and-elevation, but it
   is no longer what the project is built around. A public tool's first job is
   to be legible in five seconds.

### What survives untouched

The analytics are transport-agnostic — micro-sector timing, gap tracking,
pace/degradation modelling, event detection all work on lap and telemetry data
regardless of when it arrived. Chris's *F1 Data Viz Design System* in Figma.
Three.js rather than Cesium. The honesty discipline in §7.

---

## 3. Audience and the job

**Primary:** an engaged fan watching the race, second screen in hand, who
supports a driver and wants to understand what is happening to *them*
specifically — not the leader, not the broadcast's chosen storyline.

The broadcast shows one car at a time and chooses which. This shows the viewer's
car all the time, and lets them ask why it is where it is.

**Secondary:** the fan who wants to argue. Every claim must be checkable and
shareable, or a free tool has no way to spread.

**Not the audience:** teams, journalists on deadline, anyone needing
regulatory-grade accuracy.

### The three moments the product must serve

| Moment | Effort the viewer will spend | What the interface owes them |
|---|---|---|
| **Glance** | Two seconds, mid-lap | One state, unambiguous: is my driver's race going well or badly, and what changed |
| **Question** | Thirty seconds, during a safety car | An answer to one specific question they formed themselves |
| **Dig** | Minutes, after the flag | The explorer, the charts, the spatial layers |

They differ by available attention, which is what should decide layout priority.
**Glance is the one that decides whether anybody comes back**, and it is the one
most likely to be under-served while the explorer gets the attention.

---

## 4. Scope

### In

- One race, replayed in real time, end to end
- Driver-centric framing: pick a driver, the whole dashboard reorients
- The explorer — viewer-built queries over the available measures
- Windowed replay: while playing, nothing later than the clock is visible.
  Reaching the flag unlocks the whole race
- 3D circuit: racing line, real elevation, segment colouring — supporting role
- **Tablet first, then laptop, then phone** — see §4b and `docs/03-device-targets.md`
- **Graceful degradation when the feed drops.** Not a polish item
- Onboarding sufficient for a stranger, including the delay setting
- Chris's design system, applied throughout

### Out

- **The paid tier, and generated AI content.** The three-tier provenance model
  is kept so a generated layer can be added later without rework, but nothing
  generative is built. See §6
- Accounts, auth, billing
- Weather of any kind
- Terrain, forest, buildings, scenery
- All circuits. One proves it; breadth is a data problem, later
- Historical archive browsing across seasons

### Later, deliberately

- A generated/forecast layer, if the measured product earns it
- Season-wide and multi-race comparison
- Additional circuits

## 4b. Device targets — decided

**Tablet → laptop → phone.** Decided 2026-09-07 (Chris). Detail in
`docs/03-device-targets.md`.

A propped-up tablet in landscape, beside the television, is the real
second-screen posture. Tablet and laptop are near-neighbours (~1024–1440 logical
px, landscape) and share one layout. **The phone is the outlier** and is treated
as a reduced product rather than the same layout squeezed.

Three consequences that are not obvious:

**1. Hover is gone.** The primary device has no pointer. Nothing may depend on
hover — no tooltips carrying values, no reveal-on-hover controls. This
contradicts an inherited finding ("the hover target is the column, not the
mark"), whose insight survives and whose mechanism does not: the target is still
far larger than the mark, but sized for a fingertip, and **the value readout is
permanent rather than summoned**. A tooltip has no good touch equivalent, so the
reading occupies fixed space in the layout and updates on tap. That costs space a
tooltip does not — which is part of why the phone is reduced.

**2. A race is two hours.** An unusually long session for a web page, and it
surfaces problems a short one never does: thermal throttling and battery drain
from sustained WebGL, unbounded memory growth that appears ninety minutes in, and
— most likely of all — **the device going to sleep**. A tablet propped beside a
television locks itself; on wake the connection is dead and the clock has
drifted. This happens to every user, not a few, and at exactly the moment they
look back at the screen. Reconnect, re-sync, backfill, visibly.

**3. The phone is a glance device.** Of §3's three moments it serves Glance
fully, Question partially, and Dig not at all. The explorer and the 3D scene need
room to be usable, and fitting them onto a phone would cost the tablet layout
that most people will actually use.

---

## 5. Data and delivery

### 5.0 Archive now, live later — and it plays as though live

**Decided 2026-09-07 (Chris).** Detail in `docs/04-replay-and-reveal.md`.

The product ships against completed races. A finished race replays in real time,
and while it plays the viewer sees only what has happened up to their clock.
Reaching the chequered flag unlocks the whole race.

**This is the right order, not merely the convenient one.** A windowed replay can
only ever see a *prefix* of the race — thirty laps in, lap 31 has not happened —
which is exactly the condition live imposes. So every analytic is written against
partial data from the first line, and all of it is verifiable, because the race
is finished and its real outcome is known. When live arrives it is a genuine
transport swap rather than a second implementation.

The alternative — build against whole races, add live afterwards — produces
analytics that quietly assume they can see the end. That assumption does not
announce itself; it surfaces as wrong numbers during the one hour a year the
product is under load.

**The rule this creates: no analytic may read data later than the clock.** Not
"should not" — the windowed data is the only thing it is given. The window lives
in the transport layer beside the delay buffer, for the same reason.

| State | Available | Moments served (§3) |
|---|---|---|
| **Playing** | Everything up to the clock | Glance, Question |
| **Finished** | The whole race | Dig |

Recommended and not yet ratified: the clock is scrubbable, so dragging to the
flag is the fast path to the finished state — one concept rather than a second
"study" mode. Default playback 1×, with a speed control. Finished state persists
per-device in `localStorage`; losing it costs one scrub, not real work.

**What this defers:** the server (§5.2) and everything about real-time access.
Archive data is static files a browser can fetch from static hosting. Deferred,
not repealed — the rate limit applies the moment live arrives.

### 5.1 Two transports, one model

```
              ┌── live transport (race day) ──┐
              │                               ├──> normalised session model ──> analytics ──> UI
              └── archive transport (FastF1) ─┘
```

The analytics layer must not know which transport fed it. This is what lets the
product work year-round, keeps it demonstrable, and means a live outage degrades
to "the data has stopped" rather than "the app is broken."

**Build the archive transport first.** It is testable and repeatable without a
race running, and every analytic can be verified against a race whose real
outcome is already known — which is how the previous build caught its worst bugs.

### 5.2 One server polls; every browser is served from it — DEFERRED

**Not needed until live arrives (§5.0).** Archive data is static files served
from static hosting. Kept in full because every word of it becomes true again the
moment a live transport is added.

**When live arrives, this is the largest technical consequence of building a
public tool, and it is not optional.**

OpenF1's free tier is roughly **3 requests/second and 30 requests/minute**
**[unverified — see `docs/01`]**. Browsers talking to the source directly means
the whole audience shares that budget: a handful of concurrent viewers exhausts
it, and a popular race would be hammering a volunteer-run free service with no
SLA. That is both a technical failure and a bad-citizen problem.

So:

```
  source ──> [ one poller ]  ──> normalised model ──> [ fan-out to N browsers ]
              once per tick                            SSE or WebSocket
```

Consequences to design around:

- **This is not a static site.** Something has to stay running during a race.
  Hosting, cost and uptime become real questions — see §8.
- **The delay buffer lives here**, in the transport, which is where §5.3 already
  put it. One mechanism serves both needs.
- **The poller is a single point of failure** for every connected viewer. It has
  to reconnect on its own and the UI has to say what is happening when it can't.
- **Cache and replay from the server, not the client.** A viewer who opens the
  page on lap 40 needs the first 39 laps, and must not fetch them from the
  source.
- **Real-time access may cost money.** OpenF1 reportedly gates live data behind
  a paid subscription — live meaning 30 minutes either side of a session
  **[unverified]**. Paying them for access is entirely compatible with
  non-commercial use; it is a running cost, not a licensing problem.

### 5.3 Broadcast delay — decided

Timing data reaches a client at or before the moment the viewer sees the action
on television, and streaming viewers are further behind again. Left alone, the
dashboard spoils its own user during the event it exists for.

**Decided 2026-09-07 (Chris).** Three modes on one mechanism — a clock with a
variable time origin. Detail in `docs/02-broadcast-sync.md`.

| Mode | Time origin | Pausable | Default |
|---|---|---|---|
| **Live edge** | Wall clock, zero offset | No | **Yes** |
| **Offset** | Wall clock minus a user-set delay | No | — |
| **Broadcast sync** | A moment the user marks | **Yes** | — |

Offset is set by a calibration gesture — the user taps when they see the lights
go out — rather than by understanding a number. **Broadcast sync** replays a
finished session as though live, started when the user's own broadcast starts and
pausable when they pause their television.

**Broadcast sync is architecture, not an accommodation.** Same clock, different
origin — nearly free *if the clock is an abstraction from the start*, a rewrite
if live is hardwired to the wall clock. It makes the live UI testable without
waiting for a race, and it is the only mode in which pause is possible.

**Defaulting to zero is a deliberate exception to the never-spoil rule**,
resolved as *never spoil the viewer without their informed choice*. For a public
tool this is heavier than it was: strangers arrive knowing nothing about
broadcast latency, so the choice must be offered once, clearly, in language that
assumes no prior understanding — never buried in settings.

### 5.4 What can be measured, and at what confidence

Carried forward from the previous build's data inventory, still true:

- **DRS does not exist in 2026.** Removed by the current regulations and
  replaced by active aero plus Manual Override, a boost available *anywhere* on
  the lap. Any `DRS` channel is valid for 2018–2025 only.
- Gaps must be measured **at a moment**, never lap-against-lap. Once a car is
  lapped, its lap N and the leader's lap N are different points in the race.
- Raw lap times across a race compare fuel loads as much as pace — roughly
  0.03 s/lap/kg against a ~110 kg start. Fuel correction is required for any
  pace claim.
- Tyre degradation is a curve over stint age with no location on the circuit. It
  is a chart, not a track encoding.

---

## 6. Provenance — three tiers, two of them built

The previous build's rule was *no language model anywhere*, and the reasoning was
sound: facts generated from corpus percentiles are deterministic and checkable.

**Nothing generative is being built.** But the three-tier model is kept, because
it costs nothing now and prevents a rewrite later.

| Tier | Produced by | Built? |
|---|---|---|
| **Measured** | Directly from the feed | Yes |
| **Modelled** | Deterministic code — degradation fits, undercut windows, percentiles | Yes |
| **Generated** | A language model | **No. Reserved** |

**The binding rule stands: a measured or modelled value never routes through a
language model.** With nothing generative built this is trivially satisfied; it
is written down so it survives the day someone adds a generated layer.

Every figure declares its tier at the point of use. With two tiers in play that
distinction still matters — a modelled undercut window and a measured lap time
are not the same kind of claim, and a free public tool that blurs them is
misleading strangers rather than misleading its author.

---

## 7. Standing principles

**Honesty about provenance.** Every figure can say where it came from and how
much to trust it, visibly, at the point of use.

**Absence is not zero.** Unmeasured values render as absent. Lines break where
data is missing rather than interpolating across it.

**Refuse rather than mislead.** When a verification gate fails, publish nothing
and say why. A confident wrong figure is worse than a gap.

**Degrade visibly.** A silent failure that looks like a design choice is the
worst kind — and on a public tool, the one that loses people permanently.

**One saturated colour encoding at a time.** Enforced by the type system — one
mode value, not two booleans.

**Design tokens are law.** No hardcoded colour, spacing or type size in a
component.

**Copy conventions rather than invent better ones.** Team colours, teammates
separated by line style, a dot on a pit lap. Fluency beats novelty — and on a
public tool, an unfamiliar convention is a bounce.

---

## 8. Open decisions

**Nothing is blocking the build.** Archive-first (§5.0) removed the last two
blockers by deferring them with the live transport.

**Deferred with live, not resolved:**

- [ ] Where the server runs and what it costs (§5.2). Needed when live arrives,
      not before
- [ ] Whether OpenF1 charges for real-time access. Irrelevant until there is a
      live transport; historical data is free

**Closed 2026-09-07:**

- [x] ~~Whether a paid tier is viable~~ — no paid tier. Dropped
- [x] ~~Which live source~~ — **OpenF1**, subject to verifying the two points
      above. Non-commercial use is what its CC BY-NC-SA licence permits, and it
      carries the telemetry the product needs
- [x] ~~The broadcast-delay stance~~ — three modes, live edge default. §5.3
- [x] ~~Which device is primary~~ — **tablet, then laptop, then phone.** §4b
- [x] ~~Whether to wait for live data~~ — **no. Archive first, replayed in real
      time.** §5.0
- [x] ~~Whether a replay reveals the whole race~~ — **windowed while playing,
      unlocked at the flag.** §5.0

**Still open:**

- [ ] **The name.** Cannot contain "F1" or "Formula 1" — trade mark survives the
      drop of the paid tier, and F1 enforces it against free creators too. This
      repository is called `F1-world`
- [ ] Whether the two-transport model is ratified (§5.1). Recommended
- [ ] Which race is the development target. The 2024 Belgian GP was a strong
      test case in the previous build — divergent teammate strategies, a
      one-stop that leads at the flag, a disqualification
- [ ] Whether the explorer's query lattice is right for a windowed context,
      where data is arriving rather than complete
- [ ] Whether the clock is scrubbable, making "drag to the flag" the fast path
      to the finished state. Recommended — without it, Dig costs two hours
- [ ] Whether finished state persists per-device in `localStorage`. Recommended
- [ ] Whether the phone gets a genuinely different, simpler screen or the same
      one with sections collapsed. The first is better and costs more
- [ ] Tablet portrait: recommended as the landscape panels stacked in priority
      order, not a distinct design. Unsettled
- [ ] Whether ShareAlike attaches if exported data is committed to the repo.
      Querying an API is not obviously "Adapted Material"; shipping their data
      might be. Worth an hour before committing any cached export
- [ ] Real measured frame rate with 20 cars on screen. Never recorded

---

## 9. Architecture

Nothing is built. This is intent, not description.

```
/app           Next.js routes.                              EXISTS
/styles        tokens.css (source of truth), globals.css.   EXISTS
/docs          Specification.                               EXISTS
/.github       Build-and-deploy workflow.                   EXISTS
/pipeline      Python. Archive extraction via FastF1 → normalised JSON.
/components    React. /scene is the Three.js scene; /ui is DOM chrome.
/lib           types.ts (the data contract), analytics, explorer, clock.
/server        Later. Poller and fan-out for live only.
/docs/archive  Superseded material, kept verbatim.
```

**Stack as built:** Node 22 · Next 16.3 · React 19.2 · TypeScript 7. Static
export (`output: 'export'`), no server. See `docs/05-build-and-deploy.md`.

**Rendering: Three.js, not Cesium.** Carried forward. Cesium cost 4.7 MB of
JavaScript, an account token and runtime tile requests for one job.

**3D scope: road and elevation only.** No terrain bake, no scenery. The car's own
altitude is more accurate than any public elevation model.

---

## 10. Work packages

| WP | What | Done when |
|---|---|---|
| **WP0** | Product brief: screens, the three moments, onboarding | The design questions in §8 are answered |
| **WP1** | Archive pipeline. FastF1 → normalised session model, one race | A known race exports and its finishing order, gaps and lap times match the official result |
| **WP2** | Analytics: gaps, micro-sectors, pace/degradation, event detection — **each written against a prefix, never the whole race** | Each verified against the real outcome, *and* each produces the right answer when given only the first N laps |
| **WP3** | Design system as code, from Chris's Figma system | Every token referenced by name; none inlined. **Part-done** — structure built, values are placeholders pending the Figma file |
| **WP4** | **The clock and windowed replay** | A finished race plays at 1×, nothing later than the clock is reachable, and the flag unlocks the whole race |
| **WP5** | The dashboard on replayed data, driver-centric | Each of §3's three moments is served, Glance first |
| **WP6** | The explorer, in the finished state | A viewer builds a query nobody anticipated and gets a correct answer or an explained refusal |
| **WP7** | 3D circuit: racing line, elevation, segment colour | Recognisable, every metre addressable |
| **WP8** | Public readiness: onboarding, the phone layout, the two-hour session | A stranger on a tablet understands what they are looking at; the page survives two hours and a device sleep |
| **WP9** | *Later:* server — poller, fan-out, cache, delay buffer | Many browsers served from one upstream connection |
| **WP10** | *Later:* live transport behind the same model | Runs live with no analytics change, degrades visibly when the feed stops |

WP1–WP8 need no race, no server, and no live source. That is the point of the
ordering: everything runs on a race that finished two years ago, and nothing can
rate-limit it.

---
## 11. Findings carried forward

From the abandoned build. The code is gone; these cost real time to discover and
are binding on anything new. The unabridged log is in
`docs/archive/2026-08-build-log.md`.

**On trusting data:**

- **Anything time-like from FastF1 is a duration until proven otherwise.** This
  family of bug silently destroyed three separate data layers. `t0_date` (when
  the timing feed started) and `session_start_time` (an offset to the actual
  start) are different origins and must never be mixed.
- **FastF1's telemetry `Z / 10` is already metres above sea level.** Adding a
  circuit datum on top floats the whole track.
- **A wrong result looks exactly like a right one.** Georeferencing, altitude
  datums, and elevation rasters all fail *silently and convincingly*. Each needs
  an independent cross-check against a different source, and the export must
  refuse to publish below a stated threshold.
- **Correlation, not offset, catches a broken elevation model.** A bad export's
  median offset read as a mild datum discrepancy; its correlation against the
  measured road was −0.41 — where the road climbed, the model descended.
- **Never resample elevation tiles as an image.** Terrarium packs height as a
  base-256 number across R, G and B; interpolating the channels independently
  invents cliffs. Decode to metres first.
- **Published figures settle questions the data cannot.** Two minutes checking
  Spa's real low point prevented discarding the one correct dataset.
- **Don't guess between two disagreeing sources — add a third.**

**On statistics:**

- **Use a robust spread (MAD), not standard deviation.** One driver's worn-tyre
  laps are legitimate outliers that inflated a spread from 0.17 s to 1.20 s and
  made a detector find nothing at all.
- **`best` is not `minimum`.** Smallest for a lap time, largest for a battle
  length. Getting this wrong reports the longest battle as the shortest.
- **Track evolution must be removed as a field-wide trend** before comparing
  compounds, or the fit reports the hard tyre as faster than the soft.
- **Correct the cause, not the symptom.** One fix for bad telemetry worked
  perfectly and discarded 60% of the race.
- **A detector that only sees change never sees persistence.** The entire story
  of the 2024 Belgian GP — a 34-lap one-stop — produced no event at all.

**On interfaces:**

- **"No data" needs a reason, and there is more than one.** Published, withheld
  because we disbelieve it, and never measured by design are three different
  states and a dash reads as a bug.
- **Zero is an absence, not a low value on a ramp.** Leave it unpainted.
- **Order by what separates, not by sequence.** Lap order hid that some segments
  cover the whole field within 0.11 s while others spread it by a second.
- **The target must be far larger than the mark.** A 2 px dot is not a pointer
  target — and on the primary device there is no pointer at all. The original
  finding said "the hover target is the column, not the mark"; on touch the
  insight holds and the mechanism does not. See §4b.
- **Bars start at zero; boxes and scatters do not.**
- **An axis must not claim work that never happened.** Don't label an
  aggregation where there is one observation per point.

**On engineering:**

- **In React, an effect fires because something rendered, not because something
  happened.** Any effect with an expensive, animated or stateful side effect
  must derive the transition itself. This bug took three attempts to fix.
- **Sixty frames a second of camera position has no business being React state.**
- **Clamp, never modulo, when resolving an index into a closed ring.**
- **Round coordinates before testing containment, not after.**
- **On a non-200, read the body before raising.** The server usually explains
  itself there.
- **Repeated per-item work that reads correctly can still be unusable.** A
  telemetry call inside a lap loop turned a two-second operation into 29 minutes.

---

## 12. Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-09-07 | **Restarted clean. The August build's code is gone and is not being recovered** | It was never committed to this repository. Deliberate restart rather than reconstruction |
| 2026-09-07 | **Product changed to a live race dashboard with a paid AI tier** | Chris's call. Reverses the no-live-dependency constraint and the portfolio framing. Consequences recorded in §2 rather than discovered later |
| 2026-09-07 | Original `context.md` archived verbatim rather than edited | It had accumulated three contradictory directions in one file — §2 specified Cesium while the log recorded its removal; the hard constraints protected a weather layer that had been deleted. Anyone reading top-down built the wrong thing. Splitting history from instruction fixes that without losing 171 entries |
| 2026-09-07 | **Recommended: two transports, one analytics model** | The analytics are transport-agnostic, so live is a data source rather than a rewrite. Preserves the demonstrable-on-any-day property that live otherwise destroys, and lets every analytic be verified against a race whose outcome is already known. **Not yet ratified** |
| 2026-09-07 | The no-language-model rule is narrowed, not abandoned | Measured and modelled values never route through generation; a model may discuss them but never compute or restate them. Preserves the checkability the product is sold on while allowing the forecasting tier |
| 2026-09-07 | 3D scope fixed at road and elevation only | Chris's call. Cuts terrain, forest and buildings — the largest and least load-bearing body of work in the old build, and still unfinished when it stopped |
| 2026-09-07 | Three.js retained over Cesium | Carried forward. Cesium cost 4.7 MB, an account token and runtime tile requests for one job. Nothing in the new direction changes that |
| 2026-09-07 | Weather stays cut | Removed in August as unsuited to an analysis tool. A live dashboard has a stronger case for it than the analysis piece did, but not one strong enough to reinstate now |
| 2026-09-07 | Broadcast delay recorded as a first-class design problem, not an implementation detail | A live dashboard reveals events before its own user's television shows them. It can make the product unpleasant to use during the exact event it exists for |
| 2026-09-07 | **Live-source licensing researched. No option is both unrestricted and rich enough** | OpenF1 is CC BY-NC-SA 4.0 — NonCommercial *and* ShareAlike, verified at source — so it cannot carry a paid tier as licensed. FastF1 is MIT, but that licenses the client, not the data it fetches. The commercial resellers permit selling and may not carry telemetry. See `docs/01-live-source-licensing.md` |
| 2026-09-07 | **Recorded: legal comfort and product quality are inversely related here** | The ~10 Hz telemetry the explorer and every spatial layer depend on exists in depth only in the sources that forbid commercial use. The sources that can be bought and resold carry timing and classification — roughly what Apple TV already gives away free. Licensing is therefore a product question, not a formality |
| 2026-09-07 | Licensing decision deferred to WP7/WP9, and the build is not waiting for it | WP1–WP6 run entirely on archive data for a finished race with nothing being sold, so they carry no commercial exposure. Deciding later means deciding with evidence about whether the product is worth licensing, which is also a better negotiating position |
| 2026-09-07 | **Recorded: F1's rights claim is broader than the law may support, and it does not matter much** | *BHB v William Hill* held that database right does not subsist where investment went into creating the contents rather than obtaining them — which is F1's own fact pattern. But contract binds regardless of IP, trade mark is clear-cut, and "contestable" means an argument a solo product cannot afford to have. Recorded so nobody re-derives it as a green light |
| 2026-09-07 | **Broadcast delay: three modes on one clock. Live edge is the default** | Chris's call. Live edge (zero offset), user-set offset, and broadcast sync. Offset is set by tapping when the lights go out rather than by understanding a number |
| 2026-09-07 | **Broadcast sync is treated as architecture, not an accommodation** | It is the same clock with a user-marked origin instead of the wall clock, so it is nearly free *if the clock is an abstraction from the start* and a rewrite if live is hardwired to the wall clock. It returns the demonstrable-on-any-day property the live pivot cost, makes the live UI testable without waiting for a race, and is the only mode in which pause is possible |
| 2026-09-07 | Defaulting to zero delay is a deliberate exception to the never-spoil rule | The constraint becomes *never spoil the viewer without their informed choice*, which puts a hard requirement on onboarding: the delay choice is presented once, clearly, before the first session, never buried in settings |
| 2026-09-07 | Delay buffering lives in the transport layer, below the analytics | An analytic that can see data the interface has not yet shown will eventually leak it |
| 2026-09-07 | Recorded: the product cannot ship under a name containing "F1" | Trade mark is the clearest exposure of the three and F1 actively enforces it against creators. This repository is called `F1-world` |
| 2026-09-07 | **The paid tier is dropped. Free public tool** | Chris's call. It resolves the hardest problem in the project rather than deferring it: the licensing research found that the telemetry the product needs exists only in sources forbidding *commercial* use, so removing the commerce removes the conflict entirely |
| 2026-09-07 | **Live source settled: OpenF1** | Its CC BY-NC-SA licence permits exactly what this now is — non-commercial use — and it carries the telemetry the analytics and spatial layers depend on. Two things still to verify: whether real-time access carries a subscription fee, and whether ShareAlike attaches to committed exports |
| 2026-09-07 | **Success criterion: real people find it useful during real races**, not execution quality | Chris's call, and it outranks everything else in the document. Where craft and usefulness disagree, usefulness wins. This demotes the 3D scene from headline to supporting element and promotes reliability, onboarding and phone support above polish |
| 2026-09-07 | **A server is now mandatory, and this is the largest technical consequence of going public** | OpenF1's free tier is ~3 req/s. Browsers talking to the source directly means the whole audience shares that budget — a handful of concurrent viewers exhausts it, and a popular race would be hammering a volunteer-run free service with no SLA. One poller, fan-out to many clients. The project stops being a static site |
| 2026-09-07 | The delay buffer and the poller are the same layer | Both need to sit between the source and every client, and both must be invisible to the analytics. One mechanism, already required by the delay decision, now also required by the rate limit |
| 2026-09-07 | **Generated content cut; the three-tier provenance model kept** | Chris's call. Nothing generative is built, but measured/modelled/generated survives as a type distinction so a generated layer can be added later without rework. The rule that a measured or modelled value never routes through a language model is written down now, while it is trivially satisfied, so it survives the day someone adds one |
| 2026-09-07 | Provenance still matters with only two tiers in play | A modelled undercut window and a measured lap time are not the same kind of claim. On a free public tool, blurring them misleads strangers rather than misleading its author |
| 2026-09-07 | Recorded: trade mark survives the drop of the paid tier | The commercial exposure went away with the commerce; the naming exposure did not. F1 enforces its marks against free creators too |
| 2026-09-07 | Phone raised to the top open decision rather than decided | "Second screen during a race" describes a phone, and the success criterion is now real in-race use — but it inverts most layout decisions, and layout is Chris's |
| 2026-09-07 | **Device order decided: tablet, then laptop, then phone** | Chris's call, and better than the recommendation it replaced. A propped tablet in landscape is the actual second-screen posture and it gives room for a real layout rather than a compromise. Tablet and laptop are near-neighbours and share one layout; the phone is the outlier |
| 2026-09-07 | **Hover cannot carry meaning, and an inherited finding had to be amended** | The primary device has no pointer. "The hover target is the column, not the mark" was right and pointer-shaped: the insight — target far larger than the mark — survives, the mechanism does not. Consequence: **the value readout is permanent rather than summoned**, occupying fixed layout space and updating on tap, because a tooltip has no good touch equivalent |
| 2026-09-07 | **A race is two hours, which is an unusual session length for a web page** | It surfaces problems a short session never does: thermal throttling and battery drain from sustained WebGL, memory growth that appears ninety minutes in, and device sleep. On the primary device none of this is optimisation — it is whether the thing works |
| 2026-09-07 | **Device sleep is the most likely real-world failure and is designed for, not tested for** | A tablet propped beside a television locks itself. On wake the connection is dead and the clock has drifted, possibly by an hour. It happens to every user rather than a few, and at exactly the moment they look back at the screen. Reconnect, re-sync the clock, backfill, visibly |
| 2026-09-07 | The phone is a reduced product, not a scaled one | It serves Glance fully, Question partially and Dig not at all. Fitting the explorer onto a phone produces a control surface too fiddly to use one-thumbed while watching something else, and the effort would come out of the layout most people actually use |
| 2026-09-07 | Minimum 44 px touch targets everywhere, laptop included | A pointer can hit a large target; a finger cannot hit a small one. Sizing for the weaker input costs the stronger one nothing |
| 2026-09-07 | **Archive data first; live deferred. But it plays as though live** | Chris's call, and the right order rather than the convenient one: a windowed replay can only see a prefix of the race, which is exactly the condition live imposes. Every analytic is therefore written live-ready from the first line and verified against a race whose real outcome is known. Live becomes a transport swap instead of a second implementation |
| 2026-09-07 | **No analytic may read data later than the clock** | Not a guideline — the windowed data is the only thing it is given. The window lives in the transport layer beside the delay buffer, because anything that can see un-shown data will eventually leak it. Building against whole races produces analytics that quietly assume they can see the end, and that assumption surfaces as wrong numbers during the one hour a year the product is under load |
| 2026-09-07 | **A replay is windowed while playing and fully unlocked at the flag** | Chris's call. Mirrors how a real race works, so the replay is not a different product, and it maps cleanly onto the three moments: Glance and Question are windowed, Dig belongs to the finished state |
| 2026-09-07 | The server is deferred, not repealed | Archive data is static files a browser can fetch from static hosting, so the poller and fan-out are not needed until live is. Every word of §5.2 becomes true again the moment live arrives, so it is kept in full rather than deleted |
| 2026-09-07 | **Nothing is blocking the build any more** | The last two blockers — where the server runs and whether OpenF1 charges for real-time — were both about live, and both moved to later with it |
| 2026-09-07 | **Site scaffolded: Next.js static export to GitHub Pages, deployed by Actions on every push** | Follows directly from archive-first — with no live feed there is nothing to poll, so nothing needs to keep running. Free, no uptime to manage, cannot be rate-limited. The iteration cycle is push, two minutes, look at the URL |
| 2026-09-07 | **Two archive constraints are dead and the workarounds must not return** | "Never upgrade to Next 16, it breaks the `@/` alias" was true only while the alias was webpack config for Cesium; the alias now comes from tsconfig and Turbopack reads it natively. "Pin TypeScript to ^5.7" was a Next 15 limit. Built and type-checked on Next 16.3 with TS 7. `npm install` also reports 0 vulnerabilities, so the whole npm-audit assessment in the archive is moot |
| 2026-09-07 | The base path is read from the repository name at build time, never hardcoded | GitHub Pages serves a project repo from a sub-path, and getting it wrong produces a page that loads with every asset 404ing — which reads as broken CSS rather than wrong paths. Deriving it also means renaming the repository fixes itself, which matters because the name has to change |
| 2026-09-07 | `public/.nojekyll` committed deliberately | Pages runs Jekyll, Jekyll ignores directories starting with an underscore, and Next puts everything in `_next`. Same symptom as the base-path bug, different cause, equally silent |
| 2026-09-07 | Token values are placeholders, structured to Chris's system but not taken from it | The ramp shape, the 8-hue categorical palette, the sequential ramp, the 16px floor and the mono telemetry stack all follow what the archive records. The numbers are mine and are marked as such on the page. One edit to `styles/tokens.css` replaces them everywhere |
| 2026-09-07 | The first page is scaffolding and says so on itself | It renders the tokens so WP3 has a feedback loop, and states the project status. A placeholder that looks finished invites the wrong conversation |
| 2026-09-07 | Enabling GitHub Pages cannot be automated from the workflow — tried and rejected | `configure-pages` accepts `enablement: true`, but with the workflow's own token it fails with "Create Pages site failed. Resource not accessible by integration". Removed rather than left in, so the log carries one clear error instead of two. Recorded so it is not retried |

---

## 13. Working agreement

Chris is a UX/HMI specialist, not a developer. Therefore:

- Explain what you are about to do, in plain language, before doing it.
- When a decision has a visual or interaction consequence, stop and ask. Do not
  silently pick.
- Do not assume Chris can debug. Diagnose it yourself and explain the cause in
  one paragraph.
- Prefer boring, well-documented approaches over clever ones.
- Never add a dependency without saying what it does and why the alternative was
  rejected.

### Definition of done for any task

1. It runs.
2. It uses tokens, not literals.
3. `context.md` is updated if a decision changed.
4. Chris has been told, in plain language, what changed and what to look at.
