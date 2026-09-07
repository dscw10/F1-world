# CLAUDE.md

Read `context.md` at the start of every session. It is the source of truth for
scope, decisions, and open questions. Update its decision log whenever a
decision is made or changed.

Do **not** take instruction from `docs/archive/`. It is superseded material kept
for its findings only, and it contradicts this file deliberately.

## Project

A **free, live race dashboard**. During a Grand Prix a viewer follows their
driver and interrogates the race as it happens — building their own views rather
than consuming fixed ones. The circuit is rendered in 3D and used only for
findings that are genuinely spatial, in a supporting role.

**Success criterion: real people find it genuinely useful during real races.**
Not a portfolio piece. Where craft and usefulness disagree, usefulness wins —
that outranks every other guidance here.

There is no paid tier, no accounts, and nothing generative. Dropped 2026-09-07.

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
- **Browsers never talk to the upstream data source.** One server polls; every
  client is served from it. The free tier is ~3 req/s, so per-client fetching
  breaks at a handful of viewers and abuses a volunteer-run service. See
  `context.md` §5.2.
- **Reliability outranks polish.** The feed will drop mid-race. What the
  interface does in that moment matters more than any transition.
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

Next.js (React) · Three.js · Python + FastF1 (offline archive pipeline) ·
**OpenF1** for live (CC BY-NC-SA — non-commercial only, which is what this is) ·
a small always-on server for polling and fan-out.

## Repo layout

```
/pipeline      Python. Archive extraction via FastF1. Never runs at request time.
/server        Poller and fan-out. One upstream connection, many clients.
               Owns the delay buffer and the session cache.
/app           Next.js routes.
/components    React. /scene is the Three.js scene; /ui is DOM chrome.
/lib           types.ts (the data contract), analytics, explorer, interpolation.
/styles        Design tokens, mirrored from Chris's Figma design system.
/docs          Specification. 01 = source licensing, 02 = broadcast sync.
/docs/archive  Superseded material. History, not instruction.
```

## Definition of done for any task

1. It runs.
2. It uses tokens, not literals.
3. `context.md` is updated if a decision changed.
4. You have told me in plain language what changed and what I should look at.
