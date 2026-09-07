> **ARCHIVED 2026-09-07. Do not treat this as current.**
>
> This is the original `context.md` from the August 2026 build, preserved
> verbatim. That build's code was never committed to this repository and the
> project has been restarted clean, with a different product direction (a live
> race dashboard rather than a post-race craft piece). See the root
> `context.md` for what is actually true now.
>
> It is kept because the decision log below contains ~171 entries of hard-won
> findings — several of which cost days to discover and are still binding on
> any future build. The ones that survive the restart are carried forward,
> curated, into `context.md` §11. This file is the unabridged source.
>
> Sections describing Cesium build configuration, the npm audit assessment, and
> specific files under `/app`, `/lib`, `/pipeline` and `/docs` refer to code
> that does not exist. Read them as history, not instructions.

---

# F1 Spatial Telemetry Platform — Project Context

**Status:** Paused on code — stepping back to product definition (WP0). See `docs/`.
**Last updated:** 8 Aug 2026

> **Read `docs/01-data-inventory.md` and `docs/02-use-cases.md` before planning
> any new feature.** Two things in the sections below are now out of date and
> are corrected there: DRS no longer exists in 2026, and the competitive floor
> moved when Apple TV shipped a free Driver Tracker.
**Owner:** Chris
**Purpose of this file:** single source of truth for what this project is, how it's structured, what's decided, and what's still open. Update it whenever a decision changes.

---

## 1. What this is

An interactive 3D visualisation of Formula 1 data rendered on a geospatial globe. Circuits are *procedurally generated* from real GPS telemetry rather than hand-modelled. Car positions, spatial performance analytics, and meteorological layers are composited on top.

**Framing decision:** this is a **craft / portfolio piece**. Analytical insight is a welcome by-product, not the success criterion. Success is measured by execution quality — the fidelity of the geometry, the smoothness of the transitions, and the restraint of the UI. This changes the priority order: WP7 (design language) is promoted to a first-class deliverable, and anything that adds engineering risk without adding visual craft is cut.

The differentiator is **spatial encoding**: data that is normally read as 2D line charts is instead read as geometry in space — height, colour, and position on the actual racing line.

## 2. Tech stack

| Layer | Choice | Role |
|---|---|---|
| App framework | Next.js (React) | Routing, state, static data serving |
| Geospatial engine | CesiumJS via `resium` | Globe, terrain, extrusion, time-dynamic entities |
| Session data | Python + FastF1 | Track geometry, replay data, **and** trackside weather, exported offline |
| Cloud & precipitation | Open-Meteo Historical Forecast API | Cloud cover, rain intensity — free, no key |
| Weather vector | `cesium-wind` / custom shader | WebGL particle system for wind vanes |

**Scope:** all circuits is the end goal. **Spa is the MVP.** The pipeline generalises — FastF1 covers every circuit from 2018 onward, so scaling is a data and asset problem, not a new-code problem. The only genuinely per-circuit engineering is georeferencing validation and any terrain oddities.

**Cut from v1:** the OpenF1 live proxy. With replay as the default, the entire live pipeline (CORS proxy, rate limiting, session-availability handling, polling) can be deferred. FastF1 already exports every position sample for a completed session. This removes the single largest source of engineering risk and demo fragility — a portfolio piece must work on demand, not only on a race weekend.

## 3. Work packages

Vertical slice first: one circuit, one session, end-to-end, before any breadth.

### WP0 — Craft brief (do this before any code)
Not a JTBD statement — a **visual and interaction brief**.
- Reference imagery and a stated aesthetic position
- The three-tier state model: **Globe → Circuit → Entity (car/sector)**, including return paths
- Named "hero moment": the single transition or view the piece is built around
- Target device and viewport (desktop-first)
- **Done when:** a one-page state diagram and a mood/reference board exist.

### WP1 — Core engine
Scaffold Next.js, mount Cesium, globe rendering with terrain and controlled camera.
- Cesium asset/token config under Next.js — dynamic import with `ssr: false`, copy Cesium static assets in the build step. This is the classic first blocker.
- Camera constraint layer: min/max zoom, tilt limits, damping
- **Done when:** globe loads, terrain visible, camera can't be flown into nonsense states.

### WP2 — Data pipeline (offline, Python)
FastF1 → one session → two static artefacts:
1. **Track geometry:** reference lap → X/Y/Z array → GeoJSON LineString
2. **Replay data:** all drivers, full session, timestamped positions + speed/throttle/brake, as static JSON
- Georeferencing check: FastF1 telemetry is circuit-local, needs transform to real lon/lat
- Smoothing/resampling of noisy GPS
- Consider decimating the replay file — full session at full rate is large; target a size that loads fast
- **Done when:** both files exist for one circuit and plot correctly on a 2D map.

### WP3 — Geometry generation
Load GeoJSON into Cesium, extrude with `CorridorGraphics`.
- Track width, terrain draping vs clamping, z-fighting against terrain
- Start/finish marker, sector boundaries as derived geometry
- **Done when:** a solid, navigable 3D track sits correctly at the right place and scale.

### WP4 — Replay engine
Feed the static replay JSON into `SampledPositionProperty`, bound to Cesium's `Clock`.
- Interpolation (~3.7 Hz source → 60 fps render)
- Timeline scrubber, play/pause, speed control
- **Done when:** the full grid moves smoothly around the track against a scrubable timeline.

### WP5 — Spatial analytics
- **Telemetry ribbon:** corridor extruded above the track, Z = speed, colour = throttle/brake
- **Micro-sector delta:** track chunked into segments, coloured by driver-vs-driver delta
- **Done when:** both are togglable and legible without a legend-heavy UI.

### WP6 — Weather layers (persistent, not gated)
Weather is reclassified from *data layer* to **atmosphere**. It coexists with everything else, so it must occupy a different visual register. Sources are tiered — see §6.
- Wind vane / particle field driven by FastF1 trackside wind direction + speed
- Cloud cover and precipitation intensity from Open-Meteo, driving a synthesised sky
- Optional: real historical radar raster from OpenWeather Weather Maps 2.0 (paid)
- **Done when:** weather reads as environment, never competes with the analytics layers for attention, and can still be dismissed.

### WP7 — Design language (promoted: co-equal deliverable)
- Type scale, spacing, colour tokens, motion curves
- Contrast strategy for UI over a variable-luminance 3D scene
- Transition choreography — easing, duration, what fades vs what moves
- **Done when:** a documented token set is applied consistently across every state.

### WP8 — Performance, deploy, hardening
Frame budget, tile caching, loading/empty states, deployed public build.

## 4. Dependency order

```
WP0 ─┬─> WP1 ──> WP3 ──> WP5 ──┐
     └─> WP2 ────┴──> WP4 ─────┼──> WP7 ──> WP8
                     WP6 ──────┘
```
WP2 runs fully in parallel with WP1 — separate language, separate machine.

## 5. Historical weather data — sources and honest limits

All three requested channels (wind direction/speed, cloud cover, rain) are obtainable for any past session. They come from three different places, at three different resolutions.

| Channel | Source | Resolution | Cost |
|---|---|---|---|
| Wind direction (0–359°), wind speed, rainfall (bool), air/track temp, humidity, pressure | **FastF1 `session.weather_data`** — official F1 trackside feed | 1 sample per minute, at the circuit | Free, already in the pipeline |
| Cloud cover (total/low/mid/high), precipitation mm, wind at multiple altitudes | **Open-Meteo Historical Forecast API** | Hourly, ~11 km grid, coverage from ~2021–22 | Free, no API key |
| Long-range archive (pre-2021 races) | **Open-Meteo / ERA5 reanalysis** | Hourly, ~25 km grid (ERA5-Land ~9 km), from 1940 | Free |
| Actual radar/cloud raster imagery | **OpenWeather Weather Maps 2.0**, `tm=` timestamp param | 10-minute steps, archive from March 2019 | Paid tier |

**Recommended combination:** FastF1 for trackside truth (it is the only source measured *at* the circuit, and it is the correct driver for the wind vanes), Open-Meteo for cloud cover and precipitation intensity (FastF1 has no cloud channel at all — only a rain boolean).

**The honest limitation, and it is a design constraint not a bug:** Spa is ~7 km end to end. Every gridded weather source puts the entire circuit inside one or two cells. There is no real spatial variation in the data across the track. You cannot truthfully render a rain front sweeping up through Eau Rouge — that information does not exist in any free dataset at that scale.

This forces an explicit decision about the piece's relationship to truth:
- **Wind vanes are defensible.** A single measured vector, advected as a particle field across the circuit, is physically reasonable and directly measured.
- **Cloud and rain are interpretation.** Any spatial texture is synthesised from a scalar. That is legitimate for a craft piece, but should be stated in the UI rather than implied as data.

Suggested treatment: drive a procedural sky/cloud shader from the scalar cloud-cover value rather than fetching real raster tiles. It looks better, costs nothing, scales to all circuits, and is more honest than a low-res raster pretending to be local detail.

## 6. Layer coexistence model

Since weather is always available alongside other layers, collisions are resolved by **depth plane**, not by toggling:

| Plane | Owner | Visual channel |
|---|---|---|
| Sky / atmosphere | Weather (cloud, wind particles) | Low-contrast, desaturated, motion only |
| Air (above track) | Telemetry ribbon | Height + saturated colour |
| Ground (track surface) | Micro-sector delta | Surface colour only |

Rule: **one saturated encoding at a time.** Ribbon and micro-sector both use saturated colour, so they remain mutually exclusive. Weather never uses saturated colour, so it composites with either.

## 7. Key risks

| Risk | Why it bites | Mitigation |
|---|---|---|
| Georeferencing FastF1 data | Telemetry is circuit-local coordinates, not WGS84 | Validate against satellite imagery early, in WP2 |
| Cesium + Next.js build config | Cesium expects its own static asset paths; SSR breaks it | Dynamic import `ssr: false`, asset copy in build |
| Replay file size | Full session, 20 cars, high rate = heavy payload | Decimate and/or chunk by stint; measure in WP2 |
| Occlusion | Ribbon hides the track at low camera angles | Constrain camera tilt when ribbon is active |
| Weather washing out the scene | Raster sits over the whole viewport | Opacity ceiling + desaturation, enforced in tokens |
| Portfolio pieces drifting scope | No external deadline | One circuit, one session, ship it |

## 8. Open decisions

**Closed on 2026-08-08:**

- [x] ~~The named "hero moment"~~ — all four are being built. See §11.
- [x] ~~Colour system~~ — split: team liveries for car identity, one perceptually uniform ramp (viridis) for magnitude.
- [x] ~~Whether synthesised cloud/rain is labelled as interpretation in the UI~~ — yes. `weather.json` carries a `provenance.disclosure` sentence, rendered in the control panel. `manifest.provenance.synthetic` triggers a placeholder warning.
- [x] ~~Which session at Spa~~ — deferred by making the pipeline circuit- and session-agnostic. `export_session.py` takes `--year --gp --session`, so the choice is now a command-line argument rather than an architectural commitment.

**Reopened 2026-08-08 — see `docs/02-use-cases.md`:**

- [ ] **Which product this is.** Post-race analysis, live companion, or strategy
      explainer. They share a pipeline and a design system but not a UI.
      Recommendation is post-race analysis; the decision is Chris's.
- [ ] **Whether replay stays the headline.** Apple TV now gives away a live
      Driver Tracker free, on the same screen as the race. "Watch dots go round
      a circuit" is no longer differentiated. The argument for moving the centre
      of gravity from replay to analysis is in `docs/02-use-cases.md` §6.

**Still open:**

- [ ] Whether the four hero transitions all survive review, or one gets promoted and the others demoted to supporting moves. Building all four is a deliberate deferral, not a decision. See §11.
- [ ] Which session actually ships as the default demo. Needs a look at real data.
- [ ] Whether the placeholder Spa outline gets replaced or kept as an offline fallback.
- [ ] Whether the micro-sector delta layer is worth building, now that the ribbon carries the core idea.
- [ ] Real measured frame rate with 20 cars and a full-lap ribbon. The FPS readout exists; the number does not yet.

## 8b. Repo layout as built

```
/app                  Next.js routes. Server components only; they render the client shell.
/components           React. Scene.tsx is the Cesium root; /layers are scene layers; /ui is DOM chrome.
/lib                  types.ts (the pipeline↔app contract), state-machine.ts, camera.ts,
                      cesium-config.ts, data-loader.ts, interpolation.ts
/styles               tokens.ts + tokens.css (mirrored), globals.css
/pipeline             export_session.py (real data), make_placeholder.py (test data), README.md
/public/data/<id>/    manifest.json, track.geojson, replay.json, weather.json
/scripts              copy-cesium-assets.mjs — runs automatically before dev and build
/types                Ambient declarations for CSS imports
/.claude/agents       The four project subagents, moved here from the repo root
/docs                 Product definition. Written before further code.
```

### `/docs` contents

| File | What it settles |
|---|---|
| `01-data-inventory.md` | Every available channel, its rate and coverage; what is derivable and at what confidence; what cannot be done honestly. Includes the 2026 DRS removal |
| `02-use-cases.md` | Audiences, jobs to be done, what spatial encoding earns, the three-way product fork and a recommendation |
| `03-design-system.md` | ⚠️ **Superseded.** Described a Figma draft that has been replaced by Chris's own *F1 Data Viz Design System*. Kept only for the reasoning behind the radio-control and provenance decisions, which still stand |
| `04-race-events.md` | **The current direction.** Race event detection: what can be found automatically, how reliably, and how graphs and the circuit divide the work |
| `05-driver-comparison.md` | The first screen built in Chris's real design system — Hamilton vs Russell, 2024 Belgian GP |
| `06-real-data-setup.md` | **How to replace every illustrative number with real data.** Why the sandbox cannot fetch it, and the two ways round that |
| `07-driver-colour-rule.md` | Driver identity colour in comparison mode, and the measured contrast and collision findings behind it |
| `08-first-real-export.md` | **What real data exposed about the detector.** Three problems synthetic data could never have surfaced |
| `09-user-journeys.md` | **The three journeys the site must serve**, and the IA that falls out of them |
| `10-site-design.md` | The three screens built against those journeys, in Chris's design system, on real data |
| `11-narrative-without-an-llm.md` | **How the site writes itself for any race.** Corpus percentiles, template NLG, and a page that shrinks to fit the race |
| `12-cinematic-3d-spec.md` | The 3D scene: terrain, segments, highlight anatomy, depth devices, camera, degradation. Companion to the Figma spec pages |
| `13-dropping-cesium.md` | **Recommendation: replace Cesium with Three.js and a baked heightmap.** 4.7 MB to 150 KB, no token, no runtime tile requests |
| `14-fidelity-and-scale.md` | How far the Three.js scene can go, the fidelity ladder with payload costs, and what adding every circuit actually takes |
| `16-benchmark.md` | **What everyone else produces after a race.** The seven standard charts, which of them we have, where we already beat the field, and where we are behind |
| `15-accurate-scenery.md` | **Trees placed from satellite land cover, not from hand-drawn polygons.** ESA WorldCover at 10 m, the independent cross-check that catches a misplaced raster, and building height provenance |

## 9. Build setup — agents and tooling

Development runs in **Claude Code**, driven from `CLAUDE.md` (project instructions, read automatically) and `context.md` (scope and decisions).

Four project subagents live in `.claude/agents/`:

| Agent | Owns | Maps to |
|---|---|---|
| `telemetry-pipeline` | Python, FastF1, georeferencing, static exports | WP2 |
| `cesium-engine` | Globe, extrusion, replay entities, camera, wind shader | WP1, WP3, WP4, WP6 |
| `design-system` | Tokens, type, colour, motion, UI copy | WP7 |
| `visual-qa` | Read-only visual review against craft criteria | Gate on every WP |

Built-in Explore and Plan agents handle codebase search and planning; no custom agent needed for those.

**MCP servers:** none are required. Two earn their place once building starts — a docs-lookup server (Cesium's API is large and moves between versions) and a browser-automation server (lets an agent screenshot the running canvas and see its own output, which matters disproportionately on a visual project). Add them when the friction appears, not before.

## 10. Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-08-07 | Procedural track generation over 3D models | Scales to all circuits, geometry tied to real data |
| 2026-08-07 | Static GeoJSON build artefact | Keeps Python off the request path |
| 2026-08-07 | Framed as craft/portfolio piece | Promotes design language to co-equal deliverable |
| 2026-08-07 | Replay-first; live OpenF1 cut from v1 | Removes largest engineering risk; demo must work on demand |
| 2026-08-07 | Weather reclassified as persistent atmosphere | Coexists with all layers; resolved by depth plane, not toggling |
| 2026-08-07 | All circuits is the target; Spa is the MVP | Pipeline generalises; only georeferencing is per-circuit work |
| 2026-08-07 | Weather sourced FastF1 + Open-Meteo, not OpenF1/GFS | Free, no key, and FastF1 is measured at the circuit itself |
| 2026-08-07 | Procedural sky shader instead of radar raster tiles | Gridded weather has no sub-circuit spatial detail; synthesising is cheaper, scales, and is more honest |
| 2026-08-07 | Four project subagents, no MCP servers at start | Split by ownership boundary, not by task; add tooling when friction appears |
| 2026-08-08 | Colour split: liveries for identity, viridis ramp for magnitude | Each channel does one job. Interpolating a livery would imply a magnitude that does not exist; using a ramp for identity would imply an ordering that does not exist |
| 2026-08-08 | Pipeline is circuit- and session-agnostic from day one | Adding a circuit is a data edit (one `CircuitRef` entry), not a code change. This also removed the need to commit to a Spa session before seeing real data |
| 2026-08-08 | Cesium Ion token optional, with an OpenStreetMap fallback | Nothing is a hard blocker on a token. Without one, terrain flattens and the UI says so — degradation is visible rather than silent |
| 2026-08-08 | Analytics layer modelled as one enum field, not two booleans | The "one saturated encoding at a time" rule becomes unrepresentable to break, rather than merely discouraged. The UI control is a radio group for the same reason |
| 2026-08-08 | Camera flights bracket themselves with FLIGHT_STARTED/ENDED, and the reducer refuses transitions mid-flight | Overlapping `flyTo` calls leave the camera in an undefined state. This makes button-mashing a no-op instead of a bug |
| 2026-08-08 | Explicit webpack alias for `@/...` in next.config.mjs | Next.js did not infer the alias from tsconfig `paths` in this setup — verified by removing it and watching every import fail. tsconfig keeps the alias for the type checker; both must be updated together |
| 2026-08-08 | Weather brightness applied to the imagery layer, not the globe | Cesium's `Globe` has no brightness property. Overcast is rendered as reduced brightness *and* reduced saturation on the base imagery, which satisfies the achromatic rule by removing colour rather than adding any |
| 2026-08-08 | Ribbon built as strided wall segments (stride 8), not one mesh | A Cesium wall takes one material, so colour cannot vary along a single mesh. Stride 8 is the point where the entity count stops threatening frame rate |
| 2026-08-08 | Position interpolation capped at Lagrange degree 2 | Linear makes cars cut across apexes in visible chords. Degree 3+ overshoots on hairpins and throws cars off the track surface |
| 2026-08-08 | Placeholder dataset committed, flagged `synthetic: true` | Lets the render path be proven before a multi-minute FastF1 download. The flag drives an on-screen warning, so it can never be mistaken for real data |
| 2026-08-08 | Accept 3 high-severity npm advisories; do NOT run `npm audit fix --force` | Both packages are unreachable in this app's threat model, and the "fix" is a Next.js major-version bump that would break the build. See §13 |
| 2026-08-08 | Alias `cesium$` to the prebuilt `Build/Cesium/index.js` bundle | Cesium's ESM entry point fans out to ~1,400 source modules that webpack must parse individually. The prebuilt bundle is one file. Cold compile went from minutes to ~21s. See §14 |
| 2026-08-08 | Viewer constructed with `baseLayer: false` | Cesium otherwise builds a default Ion imagery layer during construction, before our code runs, which requests Ion with its shared demo token and warns in console. Now exactly one imagery layer is added, chosen by whether a token exists |
| 2026-08-08 | The opening shot is `setView`, not `flyTo` | On load there is nothing to animate from — flying from Cesium's default Pacific view spends the first three seconds on a meaningless movement. It also keeps the first interaction off the flight-completion path entirely. See §15 |
| 2026-08-08 | Every camera flight settles on `cancel` as well as `complete`, with a watchdog | A lost completion callback does not degrade the interface, it locks it. Engineered out rather than tested for. See §15 |
| 2026-08-08 | Missing-terrain state is shown in the panel, not just the console | A console warning is not an interface. If elevation is absent the person looking at the scene is told, and told what to do |
| 2026-08-08 | Paused code, returned to WP0 product definition | Three build sessions produced a working scene with no agreed reason to exist. The craft brief was never written; §5 of `docs/02-use-cases.md` is the fork it should have resolved |
| 2026-08-08 | Recorded: DRS was removed by the 2026 regulations | Replaced by active aero (X/Z mode) and Manual Override — a 1-second electrical boost available **anywhere** on the lap. The `DRS` telemetry channel is valid only for 2018–2025. Also makes the 1-second rule a spatial fact rather than a set of detection lines |
| 2026-08-08 | Recorded: the competitive floor moved | Apple TV's 2026 F1 coverage ships a free live Driver Tracker with gaps and battles. Position visualisation is now commodity; lap/stint timing analysis is not |
| 2026-08-09 | **Product decided: post-race spatial analysis** | Richest data, no live failure modes, demos on demand — the property that made live get cut in the first place. Live remains a later transport layer, not a rewrite |
| 2026-08-09 | **Modelled values are allowed, with assumptions on screen** | Extends the honesty rule already applied to synthesised weather. Degradation curves and undercut windows are in; each carries its stated assumption, filter and uncertainty band |
| 2026-08-09 | Design system built in Figma, on real variables and text styles | 3 variable collections, 55 variables, 10 text styles, 7 components, 3 screens. Mirrors `styles/tokens.ts` so the two can be kept in step. See `docs/03-design-system.md` |
| 2026-08-09 | Analysis picker changed from horizontal segmented control to a vertical radio list | Three labels overflowed a 264px panel, and the layer count is growing to five. Still a radio group, so the one-saturated-encoding rule stays structurally unbreakable |
| 2026-08-09 | Every analysis layer declares Measured or Modelled in the picker itself | The provenance distinction is visible at the point of choosing, not in a footnote afterwards. Requires a `provenance` field on the analysis registry in code |
| 2026-08-09 | Tyre degradation is a chart, not a track encoding | It is a curve over stint age with no location on the circuit. The project's own test applies: if a bar chart reads as well, it does not belong in the 3D scene. What *is* spatial — where the worn tyre costs time — goes on the track |
| 2026-08-09 | **The product is race event detection.** The tool explains what happened, rather than offering an instrument | Every earlier version was "here is a track, poke at it", which nobody needs on a Tuesday. A ranked feed of detected moments gives the piece a reason to exist, solves the 20-car noise problem, and is where the spatial encoding genuinely earns its place. See `docs/04-race-events.md` |
| 2026-08-09 | Chris's *F1 Data Viz Design System* is the source of truth, not `styles/tokens.ts` | It is a fuller system: neutral 0–950 ramp, racing red brand, an 8-hue categorical data-viz palette, light/dark semantic tokens, WCAG 2.2 AA throughout, 16px minimum body. My earlier Figma draft and the current code tokens both conflict with it and must be replaced |
| 2026-08-09 | Pipeline now exports `laps.json` and `events.json` | The prerequisite named in `02-use-cases.md` §7. Per-lap timing, compounds, stints, pit windows, track status, race control — plus a ranked event feed |
| 2026-08-09 | Strong-stint detection uses a robust spread (MAD), not standard deviation | Caught in testing and would have been invisible on real data: a one-stopper's worn-tyre laps are legitimate outliers that inflate an ordinary standard deviation from ~0.17s to 1.20s. Since the threshold is a multiple of the spread, one driver's old tyres raised the bar for everyone and the detector found nothing at all |
| 2026-08-09 | **Demo session fixed: 2024 Belgian Grand Prix, Race** | Best strategy story available — Russell one-stops from sixth, leads at the flag on 26-lap-old tyres, is disqualified for a car 1.5 kg underweight. Divergent teammate strategies make it the ideal driver-comparison test |
| 2026-08-09 | Comparison mode assigns driver identity from the categorical data-viz palette, not liveries | Hamilton and Russell are teammates: livery colour cannot separate them. The consequence is better than the workaround — those two hues then become the ends of every diverging scale on screen, so blue-means-Hamilton is learned once and holds everywhere. No abstract cool/warm ramp to decode |
| 2026-08-09 | 15 text styles added to Chris's design system, transcribed from its own Typography page | The system documented a type scale but never created it as styles. Five mono styles added on top, because telemetry numerals jitter horizontally in a proportional face as they update |
| 2026-08-09 | Recorded finding: no on-track pass between Hamilton and Russell all race | Every position change came through the pit cycle. A tool that only detected overtakes would have reported nothing and concluded the race was dull — the absence is the story, and the detector has to be able to say so |
| 2026-08-09 | **Driver colour: team colour for the first driver; team colour for the second unless same constructor, then a neutral** | Chris's rule. Identity beats palette control. Implemented as `comparison/driver-a`, `comparison/driver-b`, `comparison/level` semantic tokens, so components reference a role and nothing downstream knows F1 has teams. 11 team primitives added for the 2026 grid |
| 2026-08-09 | Cadillac needs a lightened variant for use on dark | Their navy scores 1.39:1 against neutral/950, failing the system's own 3:1 non-text contrast rule. Recorded as `team/cadillac-on-dark` rather than lightened at the call site, so the exception lives in the system rather than hidden in code |
| 2026-08-09 | Recorded: two team pairs are perceptually unusable together | Audi vs Haas (ΔE 6.5, both silver) and Red Bull vs Racing Bulls (ΔE 18.4, both blue — and sister teams, so a likely comparison). 53 of 55 pairs are fine. A ΔE < 25 fallback is specified but not yet built |
| 2026-08-09 | **Surroundings added: buildings, forest, water and roads from OpenStreetMap** | Terrain alone gives a road on a hill — accurate and anonymous. What makes Spa read as Spa is the forest it is cut through and the pit complex on the straight. `features.py` fetches once offline via Overpass, simplifies, and projects into the same local metres the track uses so the browser does no projection maths. ~12 KB gzipped |
| 2026-08-09 | Tree positions are scattered in the pipeline, not the browser | Deterministic, so the scene does not shimmer between reloads, and a few thousand positions ship smaller than the polygons plus a point-in-polygon test in JavaScript. Rendered as one `InstancedMesh` — the entire forest is a single draw call |
| 2026-08-09 | Round coordinates BEFORE testing polygon containment | Testing the unrounded point and storing the rounded one lets a tree near an edge round its way outside the wood — invisible in a test, visible as a tree in the middle of the track |
| 2026-08-09 | **Trees are placed from satellite land cover, not from OSM polygons** | An OSM `landuse=forest` outline is accurate at its boundary and invented inside it — at Spa the polygons around Les Combes and Pouhon enclose the run-off and the spectator banking, and the old scatter planted a wood on both. `canopy.py` fetches ESA WorldCover (10 m, from Sentinel-1 and Sentinel-2, CC-BY, no key) and places a tree only on a pixel the satellite classified as canopy. The polygon scatter survives as a labelled fallback. See `docs/15-accurate-scenery.md` |
| 2026-08-09 | A raster fetched with the wrong bounding box is a picture of the wrong place, and looks fine | The same silent-failure class as the altitude datum and the mixed time origins. `agreement_with_polygons()` cross-checks the WorldCover raster against the OSM woods — a completely independent source and request — and the export refuses to be quiet below 35% agreement. Expect 60–90%, because OSM polygons are drawn generously |
| 2026-08-09 | What is measured is the canopy, not the trunk | A 10 m pixel says there is canopy here; which point inside it a tree stands on is still chosen by the pipeline, and the output says so. Per-crown accuracy exists — Meta/WRI's 1 m canopy height model — but needs a GDAL-backed COG reader for trees that are six pixels tall on screen. Not built |
| 2026-08-09 | OSM building footprints were never the problem; the heights were | Footprints are traced from aerial imagery and beat both Google's and Microsoft's open datasets in Belgium. But OSM usually has no height, and the 8 m fallback was indistinguishable from a survey — a skyline of guesses looked exactly as confident as a skyline of measurements. Every building now carries `heightBasis` of `surveyed` / `storeys` / `assumed`, and assumed ones must render differently |
| 2026-08-09 | The land cover raster also classifies the ground, free | Forest, grass, built-up and water at 10 m. The ground around the circuit can be tinted from measurement rather than from an invented palette, so it stops being a guess as well. Written to `landcover.json` |
| 2026-08-10 | **Never resample terrarium tiles as an image. Decode to metres first, then average** | The first real terrain export was garbage and looked like a hillside. `Image.LANCZOS` interpolates R, G and B independently, but terrarium packs elevation as a base-256 number across those three channels — so two pixels either side of the 512 m contour, (129,255,0) and (130,1,0), average to (129,128,0), which decodes to **384 m**. Spa's hillside spans that contour. Result: a 344 m cliff over 500 m of the Ardennes, and Les Combes reading 46 m BELOW Stavelot. LANCZOS also rings, inventing terrain away from any boundary |
| 2026-08-10 | Correlation, not offset, is the statistic that catches a broken DEM | The bad export's median offset was +24 m, which reads as a mild datum discrepancy and would have been shipped. Its correlation against the measured road was **−0.41** — where the road climbed, the DEM descended. `terrain.verify_against_track()` now reports both, and the export refuses to be quiet below r = 0.75. The car's own altitude along 7 km of road running through the middle of the DEM is the independent check that was sitting there unused |
| 2026-08-10 | A square grid over a rectangular box gives rectangular cells | The box was 4439 x 2772 m rendered into 128x128: 35 m cells one way, 22 m the other, while the metadata reported a single `resolutionM: 35`. Any renderer trusting it would stretch the hillside 1.6x. The box is now squared in metres before fetching, and `stepM` is exported per axis |
| 2026-08-10 | On a non-200, read the BODY before raising | Overpass rejected the first run with a bare `406 Client Error` because `raise_for_status()` threw before anything read the response, and Overpass explains itself in the body. Now: a descriptive User-Agent (the default `python-requests` is what the filtering exists to stop), a plain-text body, three mirrors in turn, and the actual error text reported for each |
| 2026-08-10 | **Third FastF1 duration-vs-timestamp bug: `session_start_time` is a Timedelta** | `.strftime` on it raised inside a `try`, so cloud and rain were silently dropped for the entire race with one warning line. Timestamps now come from `t0_date`, `date` or `EventDate`, tested against a Timedelta masquerading as each. This family of bug has now cost three separate data layers; anything time-like from FastF1 should be assumed to be a duration until proven otherwise |
| 2026-08-10 | Overpass and the weather fetch are fixed; **terrain is still wrong and is now an open question, not a bug with a known cause** | Second run: 380 buildings and 91 woods fetched, cloud data restored. Terrain still scores r = −0.433 against the road. Four things have each been independently cleared — the road's altitudes (match published figures at four points), the track's position (`verify_spa.png` is unmistakably Spa; OSM's Tribune Raidillon lands 43 m from Raidillon), `bake()` itself (reproduces a synthetic elevation function to within a metre), and the box bounds (arithmetic checked by hand). The disagreement is ~0 m down the west of the circuit and grows to +137 m across the south |
| 2026-08-10 | **Published figures settled a question the data alone could not** | I had assumed Spa's low point was Eau Rouge and was ready to doubt the telemetry. It is Stavelot/Turn 15 at 373 m, with Eau Rouge's floor at 390 m and Les Combes highest at 470 m. The export reads 365.5, 391.8 and 467.8. Looking it up took two minutes and prevented discarding the one dataset that was right |
| 2026-08-10 | Do not guess between two disagreeing sources — add a third | `diagnose_terrain.py` samples the road, the baked terrarium tiles and Open-Meteo's Copernicus GLO-90 at the same points, then compares the two rasters across the whole box and prints the disagreement as a map. Whichever way it lands, it is an answer rather than another hypothesis |
| 2026-08-10 | z13 is the highest zoom terrarium tiles exist at — z14+ returns 404 by design | Removes "the tiles are too coarse" as a hypothesis and as a fix. The first version of the diagnostic re-baked at z14 and z15, which would have spent Chris's time collecting two 404s |
| 2026-08-10 | **Gaps are the second analysis layer: the race's continuous state, not its events** | The detector answers "what happened"; `gaps.py` answers "what was happening". A one-second gap held for fifteen laps is not an event and it is most of what people watch. Built from `laps.json` alone — no telemetry, no fetch — so it was verifiable against the real race immediately: finishing order matches and Hamilton's margin comes out at 0.526 s against the official 0.526 s |
| 2026-08-10 | Every gap is measured at a MOMENT, never lap-against-lap | Once a car has been lapped, comparing its lap N to the leader's lap N compares two different points in the race. Gaps are taken at the instant the leader completed each lap. Pit laps are flagged rather than removed, because the pit-cycle swing is sometimes exactly what you want to look at |
| 2026-08-10 | **Micro-sectors are the layer that makes the circuit an instrument** | Three official sectors average away the thing worth seeing — losing two tenths in Pouhon and taking one and a half back through Blanchimont reads as "sector two, +0.05". `microsectors.py` times all 24 non-wrapping segments per driver per lap from the telemetry Distance channel. This is the layer the one-saturated-encoding rule was being held in reserve for |
| 2026-08-10 | Segment crossings are interpolated, and the difference is measurable | At ~10 Hz and 300 km/h consecutive samples are 8 m apart. Measured against a synthetic constant-speed lap, interpolating the crossing gives a worst error of 0.3 ms; taking the nearest sample gives 113 ms — larger than most of the differences the layer exists to show. The partition also sums correctly: the 24 segment times add to the span of the whole to within 2 ms |
| 2026-08-10 | Micro-sectors exclude rather than estimate, and count what they excluded | In-laps, out-laps, anything not fully green, laps FastF1 marks inaccurate, and the segment that wraps start/finish — whose time spans two laps of telemetry and would look exactly as right when wrong. "We timed N of M laps" is itself a fact the interface should be able to state |
| 2026-08-13 | **`get_telemetry()` belongs outside the lap loop, not inside it** | The first micro-sector build called it per lap. It reads correctly and it is unusable: each call slices car data, slices position data, resamples both onto a merged index and integrates distance — a second or two, done 800 times. The export sat in that step for 29 minutes before it was killed. One merge per driver is the same data, the same accuracy, and 20 merges instead of 800. Laps are then sliced out by session time, with lap distance taken as the running distance minus its value at the lap's start |
| 2026-08-13 | **Micro-sectors ran clean and were wrong: five corrupted laps set the "fastest here" figure for six of 24 segments** | The Bus Stop chicane came out at 155 m in 1.935 s — 288 km/h through a chicane — and La Source at 177 km/h through a hairpin. Every individual number looked like a lap time and the export reported success. The tell was that errors came in PAIRS: Bus Stop 2.67 s too short and Turn 19 0.80 s too long, Turn 8 too short and Pouhon too long. A boundary landing in the wrong place, not a bad lap |
| 2026-08-13 | **Two hypotheses about the micro-sector corruption were wrong, and the third came from an independent measurement rather than a third guess** | "The feed rewinds the Distance channel" fired on ZERO laps. "There is a hole in the samples" caught the bad laps at a 50 m threshold and 501 innocent ones with them; at 200 m it caught nothing. Neither the SHAPE of the telemetry nor the SUMMARY separates them — five drivers were corrupted on the same lap, so the bad value has company and is neither an outlier nor a cliff. The timing feed's own sector times are a second, independent measurement of the same laps; reading the same boundaries out of the telemetry gives a residual that is constant on a healthy lap and is not on a corrupted one. Compared against each driver's own median residual with MAD, for the same reason the pace model uses it |
| 2026-08-13 | **The cross-check worked: 18 laps rejected, 23 of 24 segments now physically sensible** | La Source 135 km/h through the hairpin, Bus Stop 167 km/h, Eau Rouge 321 km/h flat out. One segment still flagged and withheld. Coverage 716 of 841 laps. Stopped tuning there — the gate publishes what it believes and says why for what it does not |
| 2026-08-13 | Analysis panels are ordered by what separates drivers, not by lap order | The finding IS the ordering: Eau Rouge, Raidillon and Turn 4 cover the whole field within 0.11 s because they are flat out and everyone is equal, while La Source and the Bus Stop spread it by over a second. Lap order hides that completely |
| 2026-08-13 | "No data" needs a reason, and there is more than one reason | A dash reads as a bug. Three states, each distinguishable in the list: published, withheld because we disbelieve it, and never timed by design (the segment crossing the start line). Found by a test asserting the withheld segments sort last, which failed because the untimed one sorts there too |
| 2026-08-13 | No chart library for the gap chart | It is a polyline and two axes. A dependency would cost more than it saves and would fight the token set. Lines BREAK where a driver has no classified lap rather than leaping the gap, because interpolating across absent data is the chart equivalent of inventing it |
| 2026-08-13 | A wrong figure is withheld, not fixed in place, while the cause is still open | `lib/microsectors.ts` publishes the median for every segment but withholds the BEST wherever the export flagged it, and says why on screen. 21 of 24 segments still show everything. Same discipline as the terrain gate: 24 segments of good data should not be thrown away over 3 bad numbers, and 3 bad numbers should not be published to keep the set tidy |
| 2026-08-13 | **Check the cause, not the symptom: the first fix threw away 60% of the race** | Rejecting a lap when the hole left behind exceeded 50 m worked — zero warnings, every segment speed physically sensible — but cost 501 of 841 laps, because real telemetry has legitimate sampling gaps far larger than one sample's worth. Testing for the REWIND itself is exact and non-destructive: a car cannot travel backwards, so sub-metre wobble is noise and a step of hundreds of metres is unambiguous. Threshold set by what is physically possible rather than by tuning against an outcome |
| 2026-08-13 | One rejection counter is not enough to debug a rejection | "501 laps rejected" gave no way to distinguish an over-tight threshold from a genuinely broken feed. Now counted separately as `distanceRewind`, `distanceGap` and `shortLap`, and reported separately |
| 2026-08-13 | Cause: dropping non-advancing distance samples turned a small telemetry resync into a hole in the lap | The Distance channel steps backwards where the feed resynchronises — on lap 16, straight after a yellow. The filter dropped every sample from the backward step until distance recovered, deleting a stretch of circuit. Segment boundaries falling inside it snapped to the wrong crossing. A hole is now grounds for REJECTING the lap (`MAX_SAMPLE_GAP_M`), not for patching over it, and the lap must also reach 97% of the modelled lap length |
| 2026-08-13 | **A minimum is the statistic most exposed to a single bad lap, so the output now checks itself** | Per-lap sums were healthy — the deficit matched the untimed wrapping segment almost exactly — so a totals check would have passed. What fails is the extreme. `_warnings()` flags any segment whose best is more than 30% quicker than the field median through the same stretch. Generic: it knows nothing about telemetry glitches, only that a corner taken 57% quicker than anyone manages did not happen. It fires on Bus Stop and stays quiet on Eau Rouge, which is genuinely that tight |
| 2026-08-13 | A step that can take minutes must print per driver, flushed | Twenty-nine minutes of silence is indistinguishable from a hang, and `Tee-Object` buffers, so nothing reached the log either. Progress is now a callback the export supplies |
| 2026-08-13 | The vectorised time conversion is cross-checked against the export's own on every driver | Converting `SessionTime` in bulk is far faster than calling the helper per sample, but it reintroduces exactly the duration-versus-timestamp risk that has already cost this pipeline three data layers. The first sample of every driver's block is converted both ways and the build ABORTS on disagreement rather than exporting drift |
| 2026-08-10 | **The explorer's guidance is a type system, not a tutorial** | Chris asked for "Tableau but more tailored and guided". A general pivot builder will plot average tyre age against circuit gradient: a real number, over a set that does not exist. So every field declares the GRAIN it is measured at, those grains form a roll-up lattice, and a crossing is refused when no common grain exists — the same move as the analytics radio group, where the illegal state is unrepresentable rather than merely discouraged. The refusal explains itself in terms of the race, not the schema |
| 2026-08-13 | **The interface is no longer locked to dark, and the theme needs no JavaScript to resolve** | Three token layers: primitives that never change (the viridis ramp, team liveries, spacing, type), semantic tokens that do (background, surface, line, text, accent, and the scene's ground and road), and aliases pointing the old names at the semantic layer — so a light theme required no component changes at all. `:root` carries light, `[data-theme="dark"]` overrides it, and a media query scoped to `:root:not([data-theme])` applies dark ONLY where no explicit choice exists. Preference, then choice, resolved entirely in CSS |
| 2026-08-13 | A livery is an identity and a ramp is a measurement, so neither themes | Ferrari red is Ferrari red on paper or on screen, and viridis encodes magnitude — restyling either would change what a chart MEANS. Asserted by a test that fails if any `--ramp-*` or `--diverge-*` appears inside a theme block |
| 2026-08-13 | **The 3D scene reads its palette out of the resolved CSS rather than keeping a copy** | Three.js needs numbers and CSS needs strings, and the obvious fix — a palette in TypeScript — is a second source of truth that diverges the first time one is edited. `lib/theme.ts` reads the computed values off the document, so the scene inherits any future theme for free and a theme change is a rebuild with different numbers rather than a branch inside the renderer |
| 2026-08-13 | Paper mode inverts the scene rather than putting a dark viewport on a light page | Light ground, dark road, and the lamps turned down — a pale ground bounces far more light, so the same intensities blow out to white. `--scene-light` and `--scene-ambient` are tokens for exactly this reason |
| 2026-08-13 | **The app finally shows the story the pipeline has been writing since the narrative engine was built** | `page.json` — a headline, a standfirst and seven ranked facts, all generated without a language model — existed for days and nothing rendered it. It now leads: masthead first, then the race trace, then the circuit, then the explorer last. Every fact displays the BASIS for its ranking, because "96th percentile of 40 races" and "heuristic threshold, only 1 race on record" are different claims and must not look alike |
| 2026-08-13 | Four tabs instead of one long scroll | A tab list is an explicit statement about what matters most; a stack of panels in a scrolling rail is an accident of the order they were built in |
| 2026-08-13 | The weather layer is removed | Specified before the project became an analysis tool. Cloud synthesised from an 11 km grid cell is atmosphere on a piece that is now about measurement, and it was the one layer whose honesty caveat was longer than its payload. The pipeline still exports `weather.json`; nothing fetches or renders it |
| 2026-08-13 | **Benchmarked against the standard post-race set, and the biggest gap was the race trace** | Seven charts appear after every Grand Prix across Reddit race threads, Substack analysts and the FastF1 ecosystem. They are the benchmark because they are the shared vocabulary — a reader already knows how to read them, so a new chart has to earn its place against them. We had three of the seven. See `docs/16-benchmark.md` |
| 2026-08-13 | **Race trace built. It reproduces the official 0.526 s margin exactly** | Cumulative race time against a virtual car at the field median (109.02 s at Spa), so the zero line IS that car and a climbing line is gaining on it. Three projections — field average, leader, chosen driver. Verified independently: the winning margin comes out at +0.526 s against an official 0.526 s, and a pit stop reads as a 5.3–5.6 s dip, which is right for Spa |
| 2026-08-13 | Elapsed time comes from `lapStart + lapTime`, never a running sum | A summation silently loses a lap wherever one is missing and every later value inherits the error. Two absolute fields keep a gap as a gap |
| 2026-08-13 | Copy the conventions rather than invent better ones | Team colours, teammates separated by solid and dashed rather than two similar hues, a dot on a pit lap, a star on the fastest lap, safety-car laps shaded. A reader who knows race traces should not have to learn ours. Driver labels sit at the right-hand end of each line rather than in a legend block, because the eye is already at the end of the line it is following |
| 2026-08-13 | **The explorer was pooling pit laps with racing laps** | `laps.json` holds every lap — pit in-laps, out-laps, safety-car laps, laps the feed marked inaccurate — and the explorer used all of them. Serious F1 analysis discards them before saying anything about pace, and the micro-sector pipeline already did. The median barely moved (0.08–0.13 s), which is exactly why it survived; `spread` was catastrophic, ranging over 27 s of pit stops, and `best` and `mean` were both distorted. 734 of 840 laps are clean |
| 2026-08-13 | **Fuel-corrected lap time added, because raw lap times across a race compare fuel loads** | A car starts ~110 kg heavy and loses ~0.03 s/lap/kg. Measured on the real race: the median lap-3-to-lap-42 swing is 2.47 s raw and −0.46 s corrected, so almost the whole early-to-late trend was fuel. What remains is degradation net of track evolution. Modelled, and labelled so — real fuel loads are never published. Same constant as the pipeline's pace model, so the two cannot drift |
| 2026-08-13 | Box plots, because a median cannot tell a quick-and-erratic driver from a slow-and-metronomic one | The most common chart in F1 analysis is a box of each driver's clean lap times, and it earns that place. Tukey fences at 1.5 IQR, outliers drawn individually rather than absorbed — in a race an outlier is usually a specific event worth noticing |
| 2026-08-13 | Ordinal dimensions keep their own order; everything else sorts by value | Sorting compounds by lap time hides that soft-medium-hard is a scale. Sorting segments by value IS the finding. One rule cannot serve both, so the catalogue names the ordinal ones |
| 2026-08-13 | **An axis must not claim work that never happened** | When both fields share the query's grain there is one observation per point and nothing is aggregated, yet the axis still read "median Lap time". The label now names the aggregation only when one occurred |
| 2026-08-13 | Chart axes: measured margins, nice ticks, and labels that are dropped rather than truncated | The left margin is computed from the widest tick label actually rendered, not guessed. Tick steps are 1, 2 or 5 times a power of ten — dividing a range by a fixed count produces labels like 107.3166. Category labels rotate when they will not fit and then thin out; a chart of "Turn 4 t…" and "Turn 4 …" is worse than one with half the labels |
| 2026-08-13 | The hover target is the column, not the mark | A 2 px scatter dot is not a pointer target. Each point owns a band of the plot and the nearest is picked, so hovering never requires precision. The tooltip states how many observations made the number, because "median 108.3 s" from four laps and from four hundred are different claims |
| 2026-08-13 | Bars start at zero; boxes and scatters do not | A bar measured from a non-zero baseline exaggerates every difference. A lap-time axis starting at zero wastes 99% of the plot. The rule differs by mark because the mark means different things |
| 2026-08-13 | The wide panel moves the chart rather than duplicating it | Two copies of the same figure at different sizes reads as two findings. Opening the panel under the map hides the rail's copy |
| 2026-08-13 | **The circuit is now a display surface, and the track is a chart type rather than a feature** | `lib/track-paint.ts` is the single place that decides what colour each stretch of track is. Six modes: where the lap is won, two-driver delta, passes, gradient, the explorer's current result, and off. Any query the explorer expresses at SEGMENT grain renders onto the circuit from code that already exists, so every segment-grain field added later inherits a spatial rendering for free |
| 2026-08-13 | The one-saturated-encoding rule is kept by the type, not by discipline | `PaintMode` is a single value, so "field spread AND the driver delta at once" is unrepresentable. Same move as the analytics radio group and the field-grain lattice. Selection BRIGHTENS whatever colour a segment already has rather than giving it a hue of its own — selection is an affordance, and a second hue would be a second encoding competing with the first |
| 2026-08-13 | Twenty-four bands, never a gradient along the lap | Colour is applied per segment because segments are what we measure. A smooth ramp would imply we know the value at every metre. The banding is both the honest rendering and the thing that makes the boundaries — real, named places — legible |
| 2026-08-13 | **Zero is an absence, not a low value on a ramp** | Six of 24 stretches saw a pass; the other eighteen are left UNPAINTED rather than coloured at the bottom of the scale, so "nothing happened here" cannot read as "a little happened here". 10 of the 15 located passes were on the Kemmel straight |
| 2026-08-13 | Speed as ribbon height was considered and rejected | It is the most beautiful option and the vertical channel is already carrying elevation, which at Spa IS the circuit's identity. Two encodings on one channel makes both unreadable — already a stated rule, and this is the case it was written for |
| 2026-08-13 | Scene and analysis are a 50:50 grid, not a rail floated over a picture | The analysis stopped being a sidebar the moment it carried charts. `--split-scene` and `--split-panel` are declared as a pair so they cannot drift apart, and the scene now gets the aspect ratio it actually has rather than assuming the full viewport |
| 2026-08-13 | **The explorer is built, and the type system had to be made real rather than merely described** | `lib/explore.ts` extracts observations keyed by what they are observations OF, rolls them up to the common grain and aggregates. A test crosses all 342 ordered pairs of usable fields and asserts that the chip state the interface shows matches what the engine actually does — if those two ever disagreed, the lattice would be decoration |
| 2026-08-13 | Found by that test: an allowed pairing that silently rendered nothing | Stint x Gap to leader was permitted by the lattice and produced an empty chart, because `gaps.json` and `microsectors.json` carry no stint number, so their observations had no `stint` on the key to group by. Only `laps.json` knows the lap-to-stint mapping, so it is joined in during extraction. An allowed-but-empty result is worse than a refusal, because it looks like an answer |
| 2026-08-13 | **`best` is not `minimum`** | For a lap time the best value is the smallest; for a battle length it is the largest. The longest battle of the race came out as seven laps when it was fourteen — plausible, wrong, and invisible to anyone who did not already know the race. Every measure offering `best` must now declare `lowerIsBetter`, asserted by a test that parses the catalogue. Tyre age lost its `best` entirely: the "best" tyre age is not a meaningful quantity, and offering it would force an arbitrary answer to which way it points |
| 2026-08-13 | Aggregation is part of the query and shown on the axis, never chosen silently | The median lap on softs says something about race pace; the best lap on softs says something about one lap in clear air. A tool that quietly picks `mean` hides the most important decision in the chart |
| 2026-08-13 | An incompatible field is dimmed but still droppable | Disabling the control teaches nothing. Dropping it answers with the reason, in race terms, which teaches the data model. Chips are also buttons, because drag-and-drop that cannot be driven from a keyboard is an interaction available to some people and not others |
| 2026-08-10 | A measure with no compatible partner is worse than no measure | The first catalogue offered "Battle length" and then refused every follow-up, because nothing else was measured per battle. Caught by a test asserting no field is a dead end. Fixed by adding the chaser and defender dimensions, which is what the field always needed to be usable |
| 2026-08-10 | **Cesium is gone. The app renders in Three.js.** | `next.config.mjs` drops from eighty lines of workarounds to one alias; the prebuild asset copy, the `CESIUM_BASE_URL` env var, the exact-match `cesium$` alias and the explicit ESM module rule are all deleted. Engine ~4.7 MB to ~150 KB, no token, no runtime tile requests. `resium` and `cesium` removed from `package.json`; `three` added |
| 2026-08-10 | Sixty frames a second of camera position has no business being React state | The Cesium Descend button took three attempts to fix because the camera effect responded to STATE rather than to transitions: Strict Mode's double render started two flights and the second one's cancel cleared a lock the first still held. In the port React owns four things — selected segment, exaggeration, terrain verdict, mount — and the camera pose lives in a ref mutated in the animation loop. A flight also clears itself on the frame it finishes rather than in a callback the engine might not call |
| 2026-08-10 | OrbitControls was rejected in favour of ~40 lines of orbit maths | OrbitControls owns the camera and fights anything else that moves it, so every guided flight would have to disable it, tween, then resync its internal spherical state. Chris asked for free orbit AND composed flights AND a Reframe button; those are three verbs on one object, and they only compose if there is a single source of truth for where the camera is |
| 2026-08-10 | **A wrong hillside is worse than no hillside, so the app refuses one** | `lib/terrain.ts` gates on `verification.correlation >= 0.75` and falls back to the datum plane with an on-screen reason. Gating on the offset instead would have passed the broken export, whose median offset was a mild-looking +24 m. A heightmap with no verification block is also refused, because that means it predates the check and we have exactly one example of what those look like |
| 2026-08-10 | **Found by porting: the wrapping segment's indices were wrong, and distance coverage said 100%** | `_slice_indices` picked the right SET of indices for a segment straddling start/finish but built the list in ascending array order, so the pit straight came out as `startIndex 0, endIndex 763` — the whole lap — with `wrapsStartFinish: false`, `elevationChangeM: 0.0` and `gradientPercent: 0.0`, because its "start" and "end" were the same closed-ring point. The self-check measured coverage in METRES and reported 100%. The renderer highlights by INDEX. Fixed, and `_index_coverage()` now checks the partition the way the scene reads it — for points in no segment and points in more than one, because those are opposite failures |
| 2026-08-10 | Clamp, never modulo, when resolving a geometry index | The ring's closing coordinate has index `count`, and `count % count` is 0, which silently turns "ends at the finish line" into "ends at the start line" and collapses a segment to one vertex |
| 2026-08-10 | **A second DEM source is built and ready behind `--dem copernicus`** | When the machinery is provably correct and the answer is still wrong, the input is wrong, and the only fix is a different input. `bake_open_meteo()` returns the identical output shape and the identical bounding box as the tile bake, so it is a genuine drop-in. Costs ~41 requests instead of 6 and gives a 64 grid at ~69 m per cell rather than 128 at 35 m — acceptable, because terrain is scenery and the road is the measurement |
| 2026-08-10 | OSM has no building heights at all for Spa: 380 of 380 assumed | Every building in the scene would be an 8 m box wearing the confidence of a survey. This is exactly what `heightBasis` was added to expose, and it means the skyline must be rendered as scenery — dimmer and flatter — not as geometry |
| 2026-08-09 | A globe needs two scenes, not one | Earth's radius is 6,371,000 m and a kerb is 0.1 m; float32 cannot hold both, and circuit-scale positions jitter visibly in globe coordinates. Two scenes cross-faded during the descent costs fifteen lines and makes the descent a designed cut rather than ten seconds of a dot growing |
| 2026-08-09 | Fidelity stops at rung 5 — no aerial imagery, no LiDAR | Imagery competes with the data layers for attention, and desaturating it enough to behave makes it equivalent to a matte surface at 20x the payload. LiDAR is 1–2 m where it exists and 30 m where it does not, so half the calendar would look markedly better than the other half. Kerbs and run-off (rung 8) are the next thing worth adding |
| 2026-08-09 | Whole calendar is ~6 MB of static scene data | ~250 KB gzipped per circuit excluding replay. Adding a circuit is one `CircuitRef` row and one location-string mapping; everything else derives. Do Monza next — flat, fast, in a park — precisely because it is the opposite of Spa |
| 2026-08-09 | **Recommend dropping Cesium for Three.js plus a baked heightmap** | Cesium was carrying exactly one job that mattered — terrain elevation — for 4.7 MB of JavaScript, an account, a token and runtime streaming. `terrain.py` fetches it once offline from AWS Terrain Tiles (public, no key): 2 tiles, 128×128 grid, 35 m per cell, ~16 KB gzipped, zero runtime requests. Engine drops to ~150 KB. See `docs/13-dropping-cesium.md` |
| 2026-08-09 | Satellite imagery is a loss worth taking | A photographic hillside competes with the data layers for attention, and the project's rule is that one saturated encoding owns the screen at a time. Matte shaded terrain is the right treatment, not a compromise |
| 2026-08-09 | Terrain is scenery; the road is measurement | The racing line's elevation comes from the car and is far more accurate than any DEM. 30 m terrain resolution is not a limitation — finer would be false precision — and the split should stay visible in the code |
| 2026-08-09 | Prototype confirmed the exported data needs no format changes for Three.js | A working scene from the real Spa export: vertex-colour highlighting on one mesh (matching the "material swap on a pre-built primitive" rule), rising wall legible from any angle, camera flights to the computed segment framings |
| 2026-08-09 | **Circuits are modelled programmatically on terrain, and every metre is addressable** | `segments.py` partitions any circuit into named segments from FastF1 corner markers plus the racing line — 19 corners and 6 straights at Spa, 100% lap coverage, zero overlaps. Each carries a geometry index range and a camera framing computed from its own size and direction, so "click anything, fly there, highlight it" needs no hand-authored view per circuit |
| 2026-08-09 | Segments must be a PARTITION, not a set of regions | Two bugs: corners 106 m apart (Eau Rouge/Raidillon) overlapped when placed at apex ± 120 m; and where they overlapped the "gap to next corner" went negative, which modulo the lap length became a 6,809 m straight covering nearly the whole circuit that every lookup resolved to. Boundaries now sit at midpoints between apexes, and sub-threshold gaps are closed — coverage went 93.6% to 100% |
| 2026-08-09 | Every located pass now carries a `segmentId` | A corner name is for the reader; a segment id is for the renderer. This is the contract that lets anything on the page highlight a piece of track |
| 2026-08-09 | The highlight wall is a marker at a constant 60 m, never data-bound | Height is already spoken for — the telemetry ribbon encodes speed as height, and two things on one channel makes both unreadable. The wall exists because a flat highlight vanishes edge-on and a vertical one does not |
| 2026-08-09 | Vertical exaggeration capped at 1.4x, easing to 1.0 below 800 m camera height | A 100 m climb over 7 km is a 1.4% slope and reads as flat from above. Exaggeration makes gradient visible at distance and disappears before anyone is close enough to notice. Beyond 1.4 Eau Rouge becomes a ski jump and it stops being a real place |
| 2026-08-09 | **The Figma file is now a complete developer specification** | Five pages: Start here, Foundations, Screens, and three spec pages covering the 3D scene, interaction and motion, and the data contract. Real file sizes, real JSON shapes, routing, budgets, accessibility and build order |
| 2026-08-09 | **The site now writes itself. No language model anywhere** | Facts with context beat prose: "34 laps on one set of hards, longer than 96% of stints on record" is generated, deterministic, and more useful than the hand-written headline because it answers the question the prose only implied. See `docs/11-narrative-without-an-llm.md` |
| 2026-08-09 | A corpus of past races replaces hand-set thresholds | Every threshold in the detector was a number somebody chose while looking at one race. Each export now appends a feature row to `public/data/corpus.json`, and metrics are expressed as percentiles against history. It self-corrects as it grows and needs no re-tuning |
| 2026-08-09 | Percentiles are withheld below five races and flagged provisional below twenty | The system reports "heuristic threshold — only 1 race on record, too few to rank" and carries that string into the page, so the interface can caveat it. It never fabricates a percentile it cannot support |
| 2026-08-09 | The headline is SELECTED, not written — whichever fact is most unusual leads | That single mechanism removes the need for editorial judgement per race |
| 2026-08-09 | The page shrinks to fit the race | Modules declare what they need to be worth showing. On a processional race the strategy and circuit sections vanish and two facts clear the threshold instead of seven. On a race with no passing the generated headline is "Nobody passed anybody" — honest, and interesting without being told to be |
| 2026-08-09 | A retirement is not a strategy | Zhou retired on lap 5 with zero stops, turning a genuine 1-to-3 stop spread into a reported 0-to-3. Strategy statistics now only count drivers who completed 90% of the distance |
| 2026-08-09 | One editorial slot per race, clearly labelled | Russell's disqualification is in a stewards' document, not the timing data. `page.json` carries an optional human-written note rendered distinctly — keeping the measured/authored line visible, exactly as the project already does for measured/modelled |
| 2026-08-09 | ML earns its place in percentile modelling, not in sentence generation | The corpus *is* the model. Race-archetype clustering is worth adding at ~100 races. Generating the prose with a model would make the copy better and the provenance worse, and provenance is what this project has that others do not |
| 2026-08-09 | **Three user journeys defined, and the IA falls out of them:** Catch up, Interrogate, Settle | They differ by *effort the visitor will spend*, which is the axis that decides layout — Journey 1 must work doing nothing, Journey 3 needs controls. One page cannot serve both. Nav is Story / Circuit / Compare. See `docs/09-user-journeys.md` |
| 2026-08-09 | Three site screens built on real 2024 Belgian GP data | Race Overview, Moment Detail, Driver Comparison. Every figure exported from the pipeline, none invented. See `docs/10-site-design.md` |
| 2026-08-09 | The race identity lives in the nav as a CONTROL, not a title | It names one race today and does nothing. Extending to a season means it opens a picker and every route gains a race segment — and nothing below the header changes shape. That is the whole reason for putting it there before it is needed |
| 2026-08-09 | Race Overview leads with the story and states the twist | No layer picker above the fold. The headline says Russell won and was disqualified; withholding it to preserve a reveal would be designing for drama rather than for the reader |
| 2026-08-09 | Comparison finding: Hamilton quicker on mediums by 0.372s, Russell quicker on hards by 0.094s | The headline "Hamilton 0.062s quicker overall" hides the argument. Russell being the better of the two on hards is precisely why the one-stop was viable for him and would not have been for Hamilton. The breakdown is where the answer is |
| 2026-08-09 | Circuit projections must derive their frame from the geometry's aspect ratio | Spa is 1.60:1; projecting it into a 520×560 box filled 472×296 and left the rest empty, so the circuit read as small and incidental on the one screen where it is the point |
| 2026-08-09 | **Overtakes are now located on the circuit.** All 15 on-track passes at Spa resolved, in 0.4s | Projects both cars onto the racing line, tracks the signed along-lap gap, and takes the sign change as the pass. This is the claim the whole spatial premise rests on — "Hamilton passed Leclerc on lap 3" is what every timing screen says; "at Raidillon on lap 3" is not |
| 2026-08-09 | Along-lap differences must be wrapped into ±half a lap | Without it every start/finish crossing reads as an overtake, and there are twenty of those per lap. B's position is also interpolated in wrapped space, or a crossing between two samples lands halfway around the circuit |
| 2026-08-09 | The located passes validate the projection independently | 12 of 15 fall in the Kemmel/Les Combes zone, which is exactly where Spa overtaking happens, and six are at Les Combes itself. Even spread around the lap would have meant the projection was wrong despite producing plausible numbers. This is now a test assertion |
| 2026-08-09 | Corner numbers come from FastF1; corner NAMES are editorial and kept separate | FastF1 supplies numbers and distance from the line. Names live in a table in `export_session.py` so the data/editorial line stays visible. Passes with no corner within 250 m are described as "between X and Y" rather than as a bare distance — three of the fifteen were on the Kemmel straight, where "at 1,386 m" is correct and useless |
| 2026-08-09 | `replay.json` is now columnar — 13.3 MB to 5.8 MB raw, 1.5 MB gzipped | Almost all the weight was repeated JSON keys across 155,810 frames. Delta-encoded integers would reach 0.9 MB gzipped, but gzip already removes most of what delta encoding removes and that last 0.6 MB would cost a custom decoder in the browser. Format is versioned so a stale file fails loudly instead of rendering an empty track |
| 2026-08-09 | **Detector rebuilt on a degradation baseline.** 120 events to 45; Russell's one-stop now ranks near the top; pit noise 97 to 15 net outcomes | New `pace.py` fits a degradation curve per compound and a field-wide track-evolution trend, then measures every lap as a residual. "Fast" now means fast for that tyre at that age. Validated against the real race |
| 2026-08-09 | Track evolution must be removed as a field-wide trend | The first fit gave HARD a *faster* base lap than SOFT, which is impossible. Compound usage correlates with race phase — hards mostly ran late on a rubbered-in track — so the model was crediting the tyre for the circuit improving. Removing the trend also absorbs error in the fuel convention, making the model less sensitive to an assumption we cannot verify |
| 2026-08-09 | Detection moved off the live FastF1 session onto the exported lap data | Makes detection re-runnable and testable without re-downloading, and means the detector can be iterated on in the sandbox against real data |
| 2026-08-09 | Defence needs two filters or it fires on everything | First run produced 27, mostly cars merely running in order. Now requires the car behind to be genuinely quicker on the pace model (a train is not a battle) and excludes the opening laps (the whole field runs nose to tail at the start). Down to 8, all real |
| 2026-08-09 | Significance must be position-weighted, and length terms capped | Every long stint hit 100, so a 32-lap stint in P12 tied with the one that won the race. Length makes a stint notable; position makes it matter |
| 2026-08-09 | **The synthetic test was worse than useless and has been replaced** | It generated fake data from the same assumptions the detector used, so it could only confirm them — it passed happily while the detector was reporting tyre age as driving skill. The regression test now asserts facts about the real 2024 Belgian GP taken from the result, not from the detector's own output |
| 2026-08-09 | **Full real export succeeded — 2024 Belgian GP.** 841 laps, 54 stints, 21 race control messages, 120 events. Strategies and finishing order verified correct against the real race | The pipeline is sound. See `docs/08-first-real-export.md` |
| 2026-08-09 | Detector finding: 97 of 120 events are pit-cycle bookkeeping | End-of-lap position "changes" every time the leader pits and changes back after. Four fifths of the feed is noise. A position change is only interesting if it survives the whole pit cycle |
| 2026-08-09 | Detector finding: "strong stints" were measuring tyre age, not pace | Six stints flagged at 1.5–1.8 s/lap faster than the field, which should have been suspicious on its face. Tyre age on a single lap spanned 1 to 16 laps, so the field median compares fresh rubber against worn. The degradation model must become the BASELINE everything else is measured against, not a separate feature |
| 2026-08-09 | Detector finding: it only sees change, never persistence | Russell's 34-lap one-stop — the entire story of the race — produces no event. Long stints, held positions, diverging strategies and gap trends are all invisible. Most of what makes a race interesting is a state that persists when it should not have |
| 2026-08-09 | `replay.json` is 13.3 MB and needs shrinking before the app can load it | Sample rate is fine; the cost is JSON verbosity. Coordinate precision, integer altitudes and positional arrays should get it under 3 MB without touching the data |
| 2026-08-09 | **Real Spa geometry exported and validated.** 764 points, 6942.9 m lap, 102 m climb, centre within 0.02 km of reference | Racing line measures 0.9% under the official 7004 m, which is expected — the official figure is the centreline and this is the line the car actually drove. Georeferencing confirmed visually against satellite imagery |
| 2026-08-09 | FastF1's telemetry `Z / 10` is ALREADY metres above sea level — do not add a circuit datum | The pipeline added `base_altitude` on top, floating Spa at 766–869 m against a real 372–468 m. The tell was that the *climb* was right (102 m) while the absolute was wrong by exactly the 401 m datum — the signature of double-counting. Would have put the whole circuit 400 m above the Cesium terrain, and the terrain provider would have been blamed |
| 2026-08-09 | Export now sanity-checks its own altitude and position against known circuit figures | Both georeferencing and altitude failures are silent — a wrongly placed track still looks like a perfectly good racetrack. The export now prints its altitude range and distance from the reference point, and complains loudly past a threshold |
| 2026-08-09 | FastF1 has two time origins and they must never be mixed | `t0_date` is when the timing feed started; `session_start_time` is the offset to when the race actually started, typically minutes later. Every `Time`-like column is measured from the first. The replay used one origin and the lap/weather/event data the other, so the timeline and the replay would have drifted apart with no error raised. All exports now normalise to `t = 0` at session start; durations are deliberately left alone |
| 2026-08-09 | Any `.ps1` file written for this project must be ASCII-only | Windows PowerShell 5.1 reads `.ps1` as ANSI unless it carries a UTF-8 BOM. A single em dash in a comment became mojibake and broke string parsing, producing errors that pointed at unrelated lines |
| 2026-08-09 | On a diverging scale the midpoint must be the darkest point | First attempt picked the same-team neutral for maximum lightness separation from the team colour, which put it two steps from the midpoint — so "driver B faster" and "level" were indistinguishable on track and half the scale stopped working. Both ends must separate from the midpoint before they separate from each other |

---

## 11. Hero moments — all four, and the risk in that

Asked to pick one, the answer was all of them. That is a legitimate position for a
craft piece with no external deadline, and the architecture now supports it: the
state machine names five transitions and `lib/camera.ts` gives each its own
choreography and duration token.

The four, and where each lives:

| Moment | State pair | Where it is implemented |
|---|---|---|
| Globe → Circuit descent | `globe->circuit` | `flyToCircuit`, using `pitchAdjustHeight` so the horizon rotates into view during the fall |
| Ribbon rise at a corner | `circuit->entity` (corner) | `flyToCorner` + `RibbonLayer` |
| Lock-on to a moving car | `circuit->entity` (car) | `trackEntity`, via Cesium's `trackedEntity` |
| Weather sweep | ambient, all tiers | `WeatherLayer` |

**The recorded risk:** four hero moments is the same as none. A hero moment is
what the piece is *built around*, and four things cannot each be the thing
everything else serves. Building all four is the right call now — they share
almost all their machinery, so the marginal cost is low, and choosing on screen
beats choosing on paper. But the choice is deferred, not made. Once there is
real data, one of these should be promoted and the other three demoted to
supporting moves.

Current implicit default: the **Globe → Circuit descent**, because it is the
only one that runs unprompted on load and it has the longest duration token.

---

## 12. Known gaps in the current build

Honest list, so none of these are rediscovered as surprises:

1. **No real data yet.** The pipeline is written and documented but has never
   been run against the F1 archive. Georeferencing in particular is unproven —
   `--verify` exists precisely because that transform fails silently.
2. **The placeholder Spa is 4.4 km; the real circuit is 7.0 km.** The outline is
   a hand-traced approximation for testing geometry, not a scale model.
3. ~~**The production bundle has not been built end to end.**~~ **Resolved
   2026-08-08.** `next build` now completes from a cold cache in ~43s, compile
   step ~21s. See §14 for what was wrong.
4. **Barely anything has been seen on screen.** First run happened 2026-08-08
   and surfaced two blocking bugs (§15). No visual QA pass has happened yet;
   every visual claim in the code comments is still reasoned, not observed.
5. **Micro-sector delta is a UI option with no layer behind it.** Selecting it
   currently turns the ribbon off and draws nothing.
6. **The wind particle shader does not exist.** Weather is scene-level
   atmosphere only. `windDirection` / `windSpeed` are carried through the data
   contract and unused.
7. **Frame rate is measured but never yet read.** The readout is in the panel;
   no number has been recorded.
8. **Desktop only.** No responsive work has been done, per the brief.

---

## 13. The npm audit warning — assessed, and deliberately not acted on

`npm install` reports **3 high severity vulnerabilities** and suggests
`npm audit fix --force`. **Do not run that command.** What it actually does is
install Next.js 16, a major version bump, in which Turbopack replaces webpack
as the default bundler. The `@/...` import alias this project depends on is
declared as webpack configuration, so Turbopack would not see it and every
import in the app would fail to resolve. The "fix" breaks the build.

### What the three advisories are

| Package | Advisories | What it is | Reachable here? |
|---|---|---|---|
| `postcss` (via `next`) | GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849, GHSA-fxqj-rqcc-2cmp | XSS via unescaped `</style>` in stringify output; path traversal via attacker-controlled `sourceMappingURL` in CSS comments | **No.** postcss runs at build time on CSS in this repo. Every stylesheet here is authored by us. The attacks require feeding it hostile CSS |
| `sharp` (via `next`) | GHSA-f88m-g3jw-g9cj | Inherited libvips CVEs in image decoding | **No.** This app uses `next/image` nowhere and serves no user-supplied images. sharp is installed as a Next dependency and never invoked |

### Why it cannot be fixed within Next 15

Next.js 15 pins `postcss` at 8.4.31 internally; the patched release is 8.5.26.
No 15.x release — including the current 15.5.23 — bumps it. There is no
in-major upgrade path, which is why npm's only offer is the breaking one.

### When to revisit

At **WP8 (deploy)**, not before. Moving to Next 16 means porting the import
alias to Turbopack's `resolveAlias` and re-verifying the Cesium build, which is
real work that should not happen before anything has been looked at on screen.
If the piece is deployed publicly, redo this assessment — the reasoning above
rests on the app serving no untrusted input, and a public deployment does not
change that, but it deserves a second look rather than an assumption.

**Verified by:** `npm audit` output read in full, `npm view next@15 dependencies.postcss`
confirming the pin, and a build test confirming Next does not resolve the alias
from `tsconfig` paths with or without `baseUrl`.

---

## 14. Why the first compile took minutes, and what fixed it

**Symptom:** `npm run dev` sat on "Compiling..." for minutes on a cold cache.
Not a hang — genuinely that much work.

**Cause:** `import * as Cesium from 'cesium'` resolves, in ESM, to
`cesium/Source/Cesium.js`, which re-exports from `@cesium/engine` and
`@cesium/widgets`. Those are shipped as **~1,400 individual ES module files**
(1,346 + 54 by count). Webpack had to read, parse, transform through SWC, and
source-map every one before it could serve a single page.

**Fix:** alias the bare `cesium` specifier to `cesium/Build/Cesium/index.js` —
the same library, pre-bundled by Cesium's own build into one 4.7 MB ESM file
with identical named exports. One file to parse instead of 1,400.

**Measured:** cold `next build` went from exceeding several minutes to
**21s compile / 43s total**. Client bundle: 107 kB First Load JS for the route.

### Three details that each broke it once, kept as comments in `next.config.mjs`

1. **The alias key must be `cesium$`, not `cesium`.** Webpack treats an
   un-suffixed key as a *prefix*, so it also rewrote
   `cesium/Build/Cesium/Widgets/widgets.css` (imported by `globals.css`) and
   that failed to resolve. The `$` forces an exact match.
2. **The bundle must be declared `type: 'javascript/esm'`.** It uses
   `import.meta`, and because the alias bypasses Cesium's `exports` map,
   webpack's module-type inference lands on ambiguous and errors with
   "Cannot use 'import.meta' outside a module".
3. **`index.cjs` is not a substitute.** The CommonJS build has unresolvable
   internal relative requires (`./punycode`, `./SecondLevelDomains` from
   urijs). It fails differently and worse.

### The trade, stated

The prebuilt bundle cannot be tree-shaken. In exchange for the compile time, the
whole of Cesium ships to the browser. This costs nothing real here:
`import * as Cesium` was already defeating tree-shaking, and Cesium's own build
has done the pruning that matters.

### Note on TypeScript version

Next.js 15 does not support TypeScript 7 — it needs the JavaScript compiler API
that the TS7 native compiler does not provide. `package.json` pins
`typescript@^5.7.0` for this reason. If a future change bumps TypeScript past 5,
Next must move to 16.2.11 or later at the same time.

---

## 15. First run — two blocking bugs, found 2026-08-08

The first time the app was opened in a browser, two things were wrong. Both are
fixed. Both are worth recording because the second one is a class of bug this
architecture will keep producing if it is not understood.

### 15.1 Cesium warned about a missing Ion token even with the fallback in place

**Symptom:** console message telling the user to assign
`Cesium.Ion.defaultAccessToken`, despite the app being designed to run happily
without one.

**Cause:** the fallback logic was correct but ran too late. Cesium's `Viewer`
constructor builds a default base imagery layer from Ion world imagery *during
construction*, before any of our configuration code executes. That request uses
Cesium's shared demo token and triggers the warning.

**Fix:** construct the viewer with `baseLayer: false`. It then starts with no
imagery at all, and `Scene` adds exactly one layer — Ion imagery if a token
exists, OpenStreetMap if not. Without a token, no Ion request is ever made.

**Also changed:** the absence of terrain is now stated in the control panel
rather than only in the console. A console warning is not an interface.

### 15.2 The Descend button did nothing

**Symptom:** clicking Descend had no visible effect.

**Cause:** the state machine refuses transitions while `inFlight` is true, and
the button is disabled by the same flag. On load the camera performed an
animated flight to the orbital view, which set `inFlight`. The flag is cleared
by the flight's completion callback — and Cesium does **not** call `complete`
when a flight is interrupted; it calls `cancel`, which nothing was listening
for. React's Strict Mode runs effects twice in development, so the first
flight was routinely cancelled by the second. `inFlight` stuck true, and the
entire interface locked with no way out.

**The general lesson:** `inFlight` is a lock. Anything that can fail to release
a lock will eventually lock the application, and "the camera finished moving"
is not a reliable event — flights get cancelled by newer flights every time a
user retargets quickly.

**Fixed in three layers, defence in depth:**

1. **The opening shot is no longer a flight.** `setGlobeView` places the camera
   instantly. There is nothing to animate from on load, and flying from
   Cesium's default view of the Pacific spent the piece's first three seconds
   on a movement that means nothing. This also takes the first interaction off
   the flight-completion path entirely — the most important fix, because it
   removes the failure from the moment it does most damage.
2. **Every flight settles on `cancel` as well as `complete`.** `lib/camera.ts`
   now exposes a single `onSettled` callback wired to both, documented as "the
   camera is no longer under automated control", not "the camera arrived".
3. **A watchdog.** `Scene` clears the lock after the longest flight duration
   plus a margin, and on unmount, whatever Cesium reports.

**Rule going forward:** if a future feature adds a camera movement, it must
route through `lib/camera.ts` and settle through `onSettled`. A `flyTo` called
directly from a component will reintroduce this bug.

---

## 16. Second run — three more, found 2026-08-08

### 16.1 The Descend button STILL did nothing — the real root cause

15.2 treated a symptom. The actual fault was structural: **the camera effect
responded to state, when it should respond to transitions.**

An effect keyed on state re-runs for reasons that are not transitions. React's
Strict Mode runs every effect twice in development, and resium rebuilds the
underlying Cesium viewer when it does. Each spurious run started a camera
flight, and a flight sets the lock that disables the button. The instant-first-
placement fix from 15.2 helped the very first pass and then the second pass
started a flight anyway.

**Fix:** `Scene` now records *what the camera last acted on, and on which
viewer instance*, and compares before acting:

| Situation | Response |
|---|---|
| same viewer, same destination | do nothing — this was not a transition |
| same viewer, new destination | a real transition. Animate |
| new viewer | the scene was rebuilt underneath us. Place instantly |

That third row is why `setCircuitView` exists alongside `setGlobeView`: a viewer
rebuilt while the user is already at the Circuit tier needs placing, not flying.

**The general principle, worth keeping:** in React, an effect fires because
something *rendered*, not because something *happened*. Any effect with a side
effect that is expensive, animated, or stateful needs to derive the transition
itself rather than assume its own invocation is one.

### 16.2 A featureless blue globe

**Symptom:** the globe rendered as a plain blue sphere with no land.

**Cause:** two compounding faults. `IonImageryProvider.fromAssetId(2)` is Bing
Maps Aerial — a **legacy** asset that Cesium replaced with Cesium World Imagery
(asset 3812). New Ion accounts may not have asset 2 at all, so the request
failed. It then fell through to the OpenStreetMap fallback, which also did not
appear. And because the viewer is built with `baseLayer: false` (see 15.1),
"no imagery" means an untextured sphere rather than a degraded map.

**Fix:** use `createWorldImageryAsync()`, the documented helper that always
resolves to whatever Cesium currently considers world imagery, instead of a
hardcoded asset number that rots when they renumber. Imagery loading now also
logs loudly on failure — with `baseLayer: false`, a silent imagery failure
looks like a design choice, which is the worst kind of bug.

### 16.3 The Ion token was never being read — `.env.local.txt`

**Symptom:** token pasted correctly, warning persisted.

**Cause:** the file was named **`.env.local.txt`**. Windows Notepad appends
`.txt` to files saved without an explicit "All Files" type, and Explorer hides
known extensions so it looks correct. Next.js reads `.env.local` and nothing
else, so the token was invisible.

**Fix:** renamed. Also found `.env.local.example` containing a live token.

**`.gitignore` hardened as a result.** The old patterns (`.env.local`,
`.env*.local`) matched neither of those files, so a working Ion token would
have been committed. Replaced with `.env*` plus `!.env.example` — ignore
everything, re-allow only the template. **A secrets rule that only catches the
filenames you predicted is not a rule.**

**Left in place for Chris to remove:** `.env.local.example` still exists and
still contains a live token. It is now git-ignored so it cannot leak, but it
should be deleted, and if that token was ever committed or shared it should be
revoked and reissued from the Ion dashboard.
