# CLAUDE.md

Read `context.md` at the start of every session. It is the source of truth for scope, decisions, and open questions. Update its decision log whenever a decision is made or changed.

## Project

3D spatial F1 telemetry visualisation. Cesium globe, procedurally generated track geometry from real GPS telemetry, replayed session data, atmospheric weather layer. This is a **craft piece** — execution quality is the success criterion.

## Working with me

I am a UX/HMI specialist, not a developer. Therefore:

- Explain what you are about to do before doing it, in plain language.
- When you hit a decision with a visual or interaction consequence, stop and ask. Do not silently pick.
- Do not assume I can debug. If something breaks, diagnose it yourself and explain the cause in one paragraph.
- Prefer boring, well-documented approaches over clever ones.
- Never install a dependency without saying what it does and why the alternative was rejected.

## Hard constraints

- **No live API dependency.** All F1 data is exported offline by the Python pipeline into static JSON. The app must run correctly with no network beyond map tiles.
- **One saturated colour encoding on screen at a time.** Telemetry ribbon and micro-sector delta are mutually exclusive. Weather never uses saturated colour.
- **Weather is atmosphere, not data.** Cloud and rain are synthesised procedurally from scalar values. Do not fetch radar raster tiles. Do not imply spatial precision the source data does not have.
- **Design tokens are law.** No hardcoded colours, spacing, or type sizes in components. If a token is missing, add it to the token file, do not inline a value.
- **Cesium must be dynamically imported with `ssr: false`.** It breaks under Next.js server rendering.

## Stack

Next.js (React) · CesiumJS via resium · Python + FastF1 (offline pipeline) · Open-Meteo Historical Forecast API (cloud/precip) · custom WebGL shader for wind particles.

## Repo layout

```
/pipeline        Python. FastF1 extraction, GeoJSON + replay JSON generation. Never runs at request time.
/public/data     Generated static artefacts, one folder per circuit.
/app             Next.js routes and pages.
/components      React components. Cesium-touching ones are client-only.
/lib             Shared logic: state machine, data loaders, interpolation.
/styles          Design tokens. Single source of truth for colour, type, spacing, motion.
```

## Definition of done for any task

1. It runs.
2. It uses tokens, not literals.
3. `context.md` is updated if a decision changed.
4. You have told me in plain language what changed and what I should look at.
