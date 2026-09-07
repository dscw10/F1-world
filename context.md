# F1 Live Race Dashboard — Project Context

**Owner:** Chris
**Status:** Definition. No code exists. Restarted clean 2026-09-07.
**Last updated:** 7 September 2026

**Purpose of this file:** the single source of truth for what this project is,
what is decided, and what is still open. Read it at the start of every session.
Update the decision log whenever a decision is made or changed.

> **Read §2 before planning anything.** The project changed direction on
> 2026-09-07. Everything written before that date lives in
> `docs/archive/2026-08-build-log.md` and is history, not instruction.

---

## 1. What this is

A **live race dashboard**. During a Grand Prix, a viewer follows their driver
and interrogates the race as it happens — not a passive scoreboard, but a
surface where they can ask their own questions of the data while it arrives.

Two things distinguish it:

**"Play data engineer."** The viewer builds their own view rather than
consuming a fixed one. They pick what to measure and what to measure it
against, and the interface answers or explains why it can't. The old build
proved this idea works (`lib/explore.ts`, a dimension × measure lattice) — that
concept is carried forward.

**A paid AI tier.** Generated analysis and forecasting, sitting above the free
measured layer. Speculation the deterministic engine cannot produce: what a
strategy is likely to yield, where a race is heading, what a driver's pace
implies.

The circuit is rendered in 3D — the racing line with its real measured
elevation — and used for findings that are genuinely spatial. Nothing else.

### What it is not

- Not a live driver tracker. Apple TV ships one free, on the same screen as the
  race. Dots moving round a circuit is commodity and is not the product.
- Not a post-race craft piece. That was the previous direction. See §2.
- Not a broadcast replacement. It assumes the viewer is already watching.

---

## 2. The pivot, and what it costs

On 2026-09-07 the project restarted with a different product. This section
exists so nobody has to reconstruct why the archive disagrees with everything.

**Previous direction (Aug 2026):** a post-race spatial analysis piece, framed as
a craft/portfolio object. Offline Python pipeline, static JSON, no network
beyond map tiles. Its code was never committed here and is gone.

**New direction:** a live, in-race product with a commercial tier.

### The four constraints this reverses

| Was | Now |
|---|---|
| **No live API dependency.** All data exported offline into static JSON | Live data is a first-class transport. The offline path survives as the fallback and the year-round product |
| **Portfolio piece; analytical insight a by-product** | A product with paying users. Insight is the thing being sold |
| **No language model anywhere; the site writes itself** | Partly reversed. Measured facts stay deterministic; a model handles the speculative tier only. See §6 |
| **Weather is atmosphere, not data** | Unchanged in spirit, but weather is currently out of scope entirely |

### What the reversal costs, stated plainly

1. **Demos on demand.** Live was cut in August precisely to protect this: a
   piece that only works during a race weekend cannot be shown on a Tuesday.
   There are ~24 race Sundays a year. Mitigated by §5's two-transport model, and
   that mitigation is the main reason to adopt it.
2. **Failure modes you do not control.** A live source can rate-limit, change
   shape mid-season, or go down during the one hour that matters. Post-race data
   cannot.
3. **A legal surface.** Charging for analysis derived from F1 timing data is a
   commercial question, not just a technical one. Open, unresolved — see §8.
4. **Broadcast delay.** The hardest *design* problem in the pivot, and it is
   yours. See §5.3.

### What survives untouched

The analytics are transport-agnostic. Micro-sector timing, gap tracking,
pace/degradation modelling and event detection all operate on lap and telemetry
data regardless of whether it arrived four days ago or four seconds ago. The old
log said as much: *"Live remains a later transport layer, not a rewrite."*

Also surviving: Chris's *F1 Data Viz Design System* (in Figma — the only built
artefact from the previous attempt that still exists), the decision to render in
Three.js rather than Cesium, and the honesty discipline in §7.

---

## 3. Audience and the job

**Primary:** an engaged fan watching the race, second screen in hand, who
supports a driver and wants to understand what is happening to *them*
specifically — not the leader, not the broadcast's chosen storyline.

The broadcast shows one car at a time and chooses which. This shows the viewer's
car all the time, and lets them ask why it is where it is.

**Secondary:** the fan who wants to argue. Every claim needs to be checkable and
shareable, or the product has no word of mouth.

**Not the audience:** teams, journalists on deadline, or anyone needing
regulatory-grade accuracy.

### The three moments the product must serve

| Moment | Effort the viewer will spend | What the interface owes them |
|---|---|---|
| **Glance** | Two seconds, during a DRS-free straight | One state, unambiguous: is my driver's race going well or badly, and what changed |
| **Question** | Thirty seconds, during a safety car | An answer to one specific question they formed themselves |
| **Dig** | Minutes, after the flag or between sessions | The full explorer, the charts, the spatial layers |

These are the same three journeys the previous build identified (Catch up,
Interrogate, Settle), re-cut for a live context. They differ by available
attention, which is what should decide layout priority.

---

## 4. Scope

### In

- One race weekend, live, end to end
- Driver-centric framing: pick a driver, the whole dashboard reorients
- The explorer — viewer-built queries over the available measures
- 3D circuit: racing line and real measured elevation, segment colouring
- Post-race mode on the same data model
- AI tier: generated analysis and forecasting, labelled as such
- Chris's design system, applied throughout

### Out (for now)

- Weather of any kind. Removed in the previous build and not reinstated
- Terrain, forest, buildings, scenery. Largest and riskiest body of work in the
  old build and still unfinished when it stopped. Explicitly cut
- All circuits. One circuit proves it; breadth is a data problem, later
- Mobile. Desktop and tablet first — though "second screen" makes phone support
  a much stronger candidate than it was, and this should be revisited early
- Historical archive browsing across seasons

### Later, deliberately

- Season-wide and multi-race comparison
- Native/mobile second-screen app
- Additional circuits

---

## 5. Data

This is the section the pivot rewrote, and the one with the most unresolved
questions in it.

### 5.1 Two transports, one model

The recommendation, not yet ratified:

```
                 ┌── live transport (race day) ──┐
                 │                               ├──> normalised session model ──> analytics ──> UI
                 └── archive transport (FastF1) ─┘
```

The analytics layer must not know which transport fed it. This is what makes the
product exist year-round, keeps it demonstrable, and means live outages degrade
to "the data has stopped" rather than "the app is broken."

**Build the archive transport first.** It is testable, repeatable, and does not
require a race to be running. Every analytic can be verified against a race
whose real outcome is already known — which is exactly how the previous build
caught its worst bugs.

### 5.2 Candidate live sources — researched 2026-09-07, still unresolved

Full findings and sourcing in `docs/01-live-source-licensing.md`. Summary:

| Source | Terms | Live | Telemetry | Paid product allowed |
|---|---|---|---|---|
| **OpenF1** | CC BY-NC-SA 4.0 | Yes | Yes | **No** — NonCommercial *and* ShareAlike |
| **FastF1** | MIT — the *software*, not the data | Recorder only | Yes | Software yes, data no |
| **jolpica-f1** | Apache 2.0 | No | No | Not a live source |
| **F1 official stream** | F1's own terms | Yes | Yes | **No** without a licence |
| **Sportmonks** | Commercial, ~€79/mo | Yes | Depth unverified | Yes |
| **Hyprace** | Commercial, from ~$7.99/mo | Partial | No | Yes |

**The finding that matters:** legal comfort and product quality are inversely
related. The high-rate telemetry this product is built on — position at ~10 Hz,
speed, throttle, brake — exists in depth only in the sources that forbid
commercial use. The sources you can straightforwardly pay for and resell supply
timing and classification, which is roughly what Apple TV already gives away.

So licensing is not a formality to clear on the way to building. It partly
determines what the product can be.

**Load-bearing unknown:** whether any commercially licensed provider sells
telemetry at the depth the analytics need. If not, the option of buying a clean
licence and keeping the product intact does not exist. Both providers offer free
tiers, so this is an afternoon's work and should happen before any other
licensing effort.

### 5.3 Broadcast delay — decided

Timing data reaches a client at or before the moment the viewer sees the action
on television, and streaming viewers are further behind again. Left alone, the
dashboard spoils its own user during the event it exists to enhance.

**Decided 2026-09-07 (Chris).** Three modes on one mechanism — a clock with a
variable time origin. Detail in `docs/02-broadcast-sync.md`.

| Mode | Time origin | Pausable | Default |
|---|---|---|---|
| **Live edge** | Wall clock, zero offset | No | **Yes** |
| **Offset** | Wall clock minus a user-set delay | No | — |
| **Broadcast sync** | A moment the user marks | **Yes** | — |

Offset is set by a calibration gesture — the user taps when they see the lights
go out — rather than by understanding a number. **Broadcast sync** replays a
finished session as though live, started when the user's own broadcast starts
and pausable when they pause their television.

**Broadcast sync is architecturally load-bearing, not an accommodation.** It is
the same clock with a different origin, so it costs almost nothing *if the clock
is an abstraction from the start* — and it returns the demonstrable-on-any-day
property that §2 records the live pivot as having cost. It also makes the live UI
testable without waiting for a race, which is otherwise possible about
twenty-four times a year.

**The cost of defaulting to zero, stated:** the product spoils people by default.
This is a deliberate exception to the never-spoil constraint, resolved as *never
spoil the viewer without their informed choice*. It places a hard requirement on
onboarding — the delay choice is presented once, clearly, before the first
session, never buried in settings.

**Buffering belongs in the transport layer, below the analytics.** No analytic
and no component may see data the interface is not yet showing.

### 5.4 What can be measured, and at what confidence

Carried forward from the previous build's data inventory, still true:

- **DRS does not exist in 2026.** Removed by the current regulations and
  replaced by active aero plus Manual Override, a boost available *anywhere* on
  the lap. Any `DRS` channel is valid for 2018–2025 only. This makes overtaking
  a spatial question rather than a matter of detection lines.
- Gaps must be measured **at a moment**, never lap-against-lap. Once a car is
  lapped, its lap N and the leader's lap N are different points in the race.
- Raw lap times across a race compare fuel loads as much as pace. A car starts
  ~110 kg heavy at roughly 0.03 s/lap/kg. Fuel correction is required for any
  pace claim.
- Tyre degradation is a curve over stint age with no location on the circuit.
  It is a chart, not a track encoding.

---

## 6. The AI tier

The previous build's rule was *no language model anywhere*, and the reasoning
was sound: facts generated from corpus percentiles are deterministic, checkable,
and cannot hallucinate. That rule is **narrowed, not abandoned.**

### The split

| Tier | Produced by | Can it be wrong? |
|---|---|---|
| **Measured** | Directly from the feed | Only if the feed is wrong |
| **Modelled** | Deterministic code — degradation fits, undercut windows, percentiles | Yes, and it states its assumptions |
| **Generated** | A language model | Yes, and it is speculation by construction |

**The binding rule: a measured or modelled value never routes through a language
model.** A model may *discuss* those values; it may never be the thing that
computes or restates them. The moment a number's provenance runs through
generation, the product's central claim — that it is checkable — is gone.

### Consequences to design for

- Generated content must be visually distinct at a glance, not footnoted.
- A forecast must carry what it was conditioned on, so a wrong one can be
  understood rather than merely disbelieved.
- The free tier must stand alone. If the measured product is only coherent with
  the AI layer switched on, the AI layer is compensating for a thin product.

### Open

Which model, hosted where, at what per-user cost, and whether inference happens
per-request or on a schedule shared across users. Untouched — see §8.

---

## 7. Standing principles

These survived the pivot intact and are binding regardless of direction.

**Honesty about provenance.** Every figure on screen can say where it came from
and how much to trust it. Measured, modelled, generated — visible at the point
of use, not in a footnote.

**Absence is not zero.** A value that was never measured is rendered as absent,
not as the bottom of a scale. Lines break where data is missing rather than
interpolating across it.

**Refuse rather than mislead.** When a verification gate fails, publish nothing
and say why. A wrong figure presented confidently is worse than a gap. The
previous build's terrain and micro-sector gates are the model for this.

**One saturated colour encoding at a time.** Enforced by the type system — a
single mode value, not two booleans — so the rule is unrepresentable to break
rather than merely discouraged.

**Design tokens are law.** No hardcoded colour, spacing or type size in a
component. If a token is missing, add it to the token file.

**Copy conventions rather than invent better ones.** Team colours, teammates
separated by line style, a dot on a pit lap. Fluency beats novelty.

---

## 8. Open decisions

Ordered by how much they block.

**Blocking the live half:**

- [ ] **Whether any licensed provider sells telemetry at the depth we need.**
      The load-bearing unknown. Both Sportmonks and Hyprace offer free tiers, so
      this is an afternoon's work and it collapses or confirms two of the four
      options below. **Do this first**
- [ ] **Which live source.** Researched 2026-09-07 (`docs/01-live-source-licensing.md`).
      OpenF1 is CC BY-NC-SA — non-commercial and ShareAlike — so it cannot carry a
      paid tier without a negotiated licence. FastF1's MIT licence covers the
      software, not the data. The licensed resellers permit commerce but may not
      carry telemetry. No option is both free of restriction and rich enough yet
- [ ] **Whether a paid tier on F1-derived data is viable at all**, and under
      which of the four routes. Needs a solicitor before money changes hands —
      the five questions to put to them are in `docs/01-live-source-licensing.md` §6
- [x] ~~**The broadcast-delay stance.**~~ **Decided 2026-09-07.** Three modes on
      one clock: live edge (default, zero offset), user-set offset, and broadcast
      sync. See §5.3 and `docs/02-broadcast-sync.md`

**Blocking the build order:**

- [ ] **Whether the two-transport model is adopted** (§5.1). Recommended.
      If rejected, the project is live-only and stops being demonstrable
- [ ] **Which race is the development target.** The previous build used the 2024
      Belgian GP and found it a strong test case — divergent teammate
      strategies, a one-stop that leads at the flag, a disqualification
- [ ] **Whether phone is a first-class target.** "Second screen" implies a phone
      far more than the old desktop-first brief did
- [ ] **The product's name.** It cannot contain "F1" or "Formula 1" if it is
      sold — F1 enforces this against creators, and trade mark is far more
      clear-cut than database right. Cheap to change now; expensive later.
      This repository is currently called `F1-world`

**Blocking the AI tier:**

- [ ] Model, hosting, and per-user cost (§6)
- [ ] What is actually free and what is paid, and whether the free tier stands
      up alone

**Still open from before, still relevant:**

- [ ] Whether the explorer's query lattice is the right shape for a live
      context, where the data is arriving rather than complete
- [ ] Real measured frame rate with 20 cars on screen. Never recorded

---

## 9. Architecture

Nothing is built. This is the intended shape, not a description.

```
/pipeline      Python. Archive extraction via FastF1 → normalised JSON.
               Offline, never on the request path.
/ingest        (new) Live transport. Normalises the live feed into the same
               model the pipeline emits. Source undecided — see §5.2.
/app           Next.js routes.
/components    React. /scene is the Three.js scene; /ui is DOM chrome.
/lib           types.ts (the data contract), analytics, explorer, interpolation.
/styles        Design tokens, mirrored from Chris's Figma system.
/docs          Specification. Written before the code it describes.
/docs/archive  Superseded material, kept verbatim.
```

**Rendering: Three.js, not Cesium.** Carried forward from the previous build and
not up for reconsideration without a reason. Cesium cost 4.7 MB of JavaScript, an
account token, and runtime tile requests, for exactly one job that mattered.

**3D scope: road and elevation only.** The racing line, its measured altitude,
and per-segment colouring. No terrain bake, no scenery. The car's own altitude is
more accurate than any public elevation model anyway.

---

## 10. Work packages

Order reflects the two-transport recommendation. If that is rejected, WP1 and
WP2 swap and the project loses its offline fallback.

| WP | What | Done when |
|---|---|---|
| **WP0** | **This document, plus the product brief.** The live/paid direction turned into a specification: screens, the three moments, the delay stance | A brief exists that answers §8's blocking decisions |
| **WP1** | Archive transport. FastF1 → normalised session model, one race | A known race exports and its finishing order, gaps and lap times match the official result |
| **WP2** | Analytics on that model: gaps, micro-sectors, pace/degradation, event detection | Each verified against the real race outcome |
| **WP3** | Design system as code. Tokens from Chris's Figma system | Every token referenced by name; none inlined |
| **WP4** | The dashboard, driver-centric, on archive data | The three moments of §3 are each served |
| **WP5** | The explorer | A viewer builds a query the product's authors did not anticipate, and gets a correct answer or an explained refusal |
| **WP6** | 3D circuit: racing line, elevation, segment colour | The circuit is recognisable and every metre is addressable |
| **WP7** | Live transport, behind the same model | The dashboard runs live with no analytics change, and degrades visibly when the feed stops |
| **WP8** | The delay stance, implemented | Nothing spoils the viewer's broadcast |
| **WP9** | AI tier, auth, billing | Generated content is distinguishable at a glance from measured |

WP1–WP6 need no race to be running. That is the point of the ordering.

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
- **The hover target is the column, not the mark.** A 2 px dot is not a pointer
  target.
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
