# CLAUDE.md

Read `context.md` at the start of every session. It is the source of truth for
scope, decisions, and open questions. Update its decision log whenever a
decision is made or changed.

Do **not** take instruction from `docs/archive/`. It is superseded material kept
for its findings only, and it contradicts this file deliberately.

## Project

A **live F1 race dashboard**. During a Grand Prix a viewer follows their driver
and interrogates the race as it happens — building their own views rather than
consuming fixed ones. A paid tier adds AI-generated analysis and forecasting
above the free measured layer. The circuit is rendered in 3D and used only for
findings that are genuinely spatial.

**Status: nothing is built.** The August 2026 build's code was never committed
and the project restarted clean on 2026-09-07. Anything describing existing
files is describing intent.

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
- **A measured or modelled value never routes through a language model.** A
  model may discuss those numbers; it may never compute or restate them. This
  is what the product's checkability rests on.
- **Never spoil the viewer's broadcast.** Timing data arrives ahead of the
  picture the user is watching. Nothing in the interface may reveal an event
  before their screen does. See `context.md` §5.3 — the stance is still open,
  but the constraint is not.
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

Next.js (React) · Three.js · Python + FastF1 (offline archive pipeline) · live
transport **undecided** — see `context.md` §5.2, and do not pick one
unilaterally.

## Repo layout

```
/pipeline      Python. Archive extraction via FastF1. Never runs at request time.
/ingest        Live transport. Normalises the live feed into the pipeline's model.
/app           Next.js routes.
/components    React. /scene is the Three.js scene; /ui is DOM chrome.
/lib           types.ts (the data contract), analytics, explorer, interpolation.
/styles        Design tokens, mirrored from Chris's Figma design system.
/docs          Specification.
/docs/archive  Superseded material. History, not instruction.
```

## Definition of done for any task

1. It runs.
2. It uses tokens, not literals.
3. `context.md` is updated if a decision changed.
4. You have told me in plain language what changed and what I should look at.
