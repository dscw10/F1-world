# CLAUDE.md

Read `context.md` at the start of every session. It is the source of truth for
scope, decisions, and open questions. Update its decision log whenever a
decision is made or changed.

Do **not** take instruction from `docs/archive/`. It is superseded material kept
for its findings only, and it contradicts this file deliberately.

## Project

A **free race dashboard** that plays a Grand Prix as it happened. The viewer
follows their driver and interrogates the race as it unfolds — building their own
views rather than consuming fixed ones. The circuit is rendered in 3D and used
only for findings that are genuinely spatial, in a supporting role.

**Archive data now, replayed in real time; live comes later.** While a race is
playing the viewer sees only what has happened up to their clock. Reaching the
flag unlocks the whole race. See `context.md` §5.0 and
`docs/04-replay-and-reveal.md`.

**Success criterion: real people find it genuinely useful during real races.**
Not a portfolio piece. Where craft and usefulness disagree, usefulness wins —
that outranks every other guidance here.

There is no paid tier, no accounts, and nothing generative. Dropped 2026-09-07.

**Status: WP1-WP6 built.** Pipeline, windowed replay, analytics, dashboard and
explorer all run against a synthetic fixture. The real export has never been
run — this sandbox has no network route to F1's servers. It runs as a GitHub
Action instead (Actions → "Export a race"), needing no local machine; see
`docs/06-exporting-from-an-ipad.md`.

## Working with me

I am a UX/HMI specialist, not a developer. Therefore:

- Explain what you are about to do before doing it, in plain language.
- When you hit a decision with a visual or interaction consequence, stop and
  ask. Do not silently pick.
- Do not assume I can debug. If something breaks, diagnose it yourself and
  explain the cause in one paragraph.
- Prefer boring, well-documented approaches over clever ones.
- Never install a dependency without saying what it does and why the
  alternative was rejected.

## Hard constraints

- **Provenance is visible, always.** Every figure declares whether it is
  **measured**, **modelled**, or **generated**, at the point of use — not in a
  footnote. Three states, three visual treatments.
- **A measured or modelled value never routes through a language model.**
  Nothing generative is built, so this is currently trivial — it is written down
  so it survives the day someone adds a generated layer.
- **Never spoil the viewer without their informed choice.** Timing data arrives
  ahead of the picture the user is watching. The default is the live edge, so
  the delay choice must be offered once, clearly, before the first session —
  never buried in settings. See `context.md` §5.3 and `docs/02-broadcast-sync.md`.
- **The clock is an abstraction with a settable origin, from the first line.**
  Live, offset and broadcast sync are one mechanism. Hardwiring live to
  `Date.now()` turns the other two into a rewrite.
- **Delay buffering belongs in the transport layer.** No analytic and no
  component may see data the interface has not yet shown.
- **No analytic may read data later than the clock.** Enforced structurally:
  analytics take a `SessionWindow` (`lib/window.ts`) and there is no route from
  it back to the whole race. Do not add one. An analytic written against a
  whole race assumes it can see the end, and that assumption does not announce
  itself.
- **Synthetic data proves plumbing, never correctness.** The fixture was
  generated from a model of a race, so an analytic tested against it only
  confirms that model. The correctness gate is a real race, checked against
  facts the analytic did not generate.
- **Browsers never talk to a *live* upstream source.** Deferred while the
  project is archive-only — static artefacts are fetched directly and that is
  fine — but the moment live arrives, one server polls and every client is
  served from it. The free tier is ~3 req/s. See `context.md` §5.2.
- **Reliability outranks polish.** The feed will drop mid-race. What the
  interface does in that moment matters more than any transition.
- **Tablet first, then laptop, then phone.** A propped tablet in landscape is
  the design target. Tablet and laptop share one layout; the phone is a reduced
  product, not the same layout squeezed. See `docs/03-device-targets.md`.
- **Hover never carries meaning.** The primary device has no pointer. No
  value-bearing tooltips, no reveal-on-hover controls. Values live in a
  permanent readout that updates on tap and holds its space when empty.
  Minimum 44 px touch targets everywhere, laptop included.
- **The session is two hours long.** Stop rendering when not visible, bound
  anything that accumulates, and handle the device going to sleep — reconnect,
  re-sync the clock, backfill visibly. This is the most likely real failure.
- **The analytics layer must not know which transport fed it.** Live and archive
  data normalise to one model. An analytic that reads the live feed directly is
  a bug.
- **The app must degrade visibly, never silently.** No live connection means the
  interface says so and falls back. A silent failure that looks like a design
  choice is the worst kind.
- **Absence is not zero.** Unmeasured values render as absent. Lines break where
  data is missing; they do not interpolate across it.
- **Refuse rather than mislead.** When a verification gate fails, publish
  nothing and say why. A confident wrong figure is worse than a gap.
- **One saturated colour encoding on screen at a time.** Enforce it with a
  single mode value in the type system, not two booleans — the rule should be
  unrepresentable to break, not merely discouraged.
- **Design tokens are law.** No hardcoded colours, spacing, or type sizes in
  components. If a token is missing, add it to the token file; do not inline a
  value.
- **Three.js, not Cesium.** Settled. Do not reintroduce a globe engine without
  raising it as a decision first.
- **3D scope is the road and its elevation only.** No terrain bake, no scenery,
  no buildings.

## Stack

Next.js (React) · Three.js · Python + FastF1 (offline archive pipeline).

Deferred until live: **OpenF1** (CC BY-NC-SA — non-commercial only, which is what
this is) and a small always-on server for polling and fan-out. Neither is needed
to build WP1–WP8.

## Repo layout

```
/pipeline      Python. export_session.py (real), make_fixture.py (synthetic).
/lib           types.ts is THE CONTRACT — mirrors pipeline/schema.py, change
               together. window.ts is the windowing primitive every analytic
               is fed through. clock.ts, analytics.ts, explore.ts, data.ts.
/components    React. Dashboard is the root and owns the clock.
/app           Next.js routes. / is the dashboard, /foundations the token set.
/test          Plumbing tests. `npm test`.
/styles        Design tokens, mirrored from Chris's Figma design system.
/server        Later. Poller and fan-out for live. Not needed yet.
/docs          Specification. 01 = source licensing, 02 = broadcast sync,
               03 = device targets, 04 = replay and reveal,
               05 = build and deploy, 06 = exporting from an iPad.
/docs/archive  Superseded material. History, not instruction.
```

## Definition of done for any task

1. It runs.
2. It uses tokens, not literals.
3. `context.md` is updated if a decision changed.
4. You have told me in plain language what changed and what I should look at.
