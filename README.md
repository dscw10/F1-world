# F1 Live Race Dashboard

A free dashboard that plays a Grand Prix as it happened. Follow one driver,
interrogate the race as it unfolds, and build your own views of the data rather
than consuming fixed ones. The circuit is rendered in 3D for findings that are
genuinely spatial.

It runs on completed races, replayed in real time — while a race is playing you
see only what has happened so far, exactly as you would live. Live data comes
later.

The measure of success is that real people find it useful during real races.

## Status: the replay works, on invented data

**https://dscw10.github.io/F1-world/**

A race plays in real time. The order, gaps, tyres and pace all update as it
runs, and nothing later than the clock is reachable. Reach the flag and the
explorer opens, where you can ask your own questions of the race.

**Every figure is invented.** The page says so. This sandbox has no network
route to F1's servers, so the data is a synthetic fixture and the real export
has never been run — see `pipeline/README.md` for what that takes.

`/foundations` shows the design token set on a real screen.

An earlier version of this project was built during August 2026, but its code
was never committed here and the project was deliberately restarted on
7 September 2026 with a different direction.

## Running it

Needs [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
npm run dev          # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server, hot reload |
| `npm run build` | Production build into `./out` |
| `npm run typecheck` | Type check without building |
| `npm test` | Windowing, clock and analytics plumbing tests |
| `npm run fixture` | Regenerate the synthetic development session |

Deploys happen automatically on every push to the development branch. GitHub
Pages is enabled with **Source: GitHub Actions**; see
`docs/05-build-and-deploy.md` if a run ever fails at the Pages step.

## Where things are

| File | What it is |
|---|---|
| `context.md` | **Start here.** Scope, decisions, open questions. The source of truth |
| `CLAUDE.md` | Project instructions, read automatically by Claude Code |
| `docs/01-live-source-licensing.md` | Which data sources exist and what each licence permits. Mostly resolved by dropping the paid tier — read its header |
| `docs/02-broadcast-sync.md` | Time, delay, and the three clock modes |
| `docs/03-device-targets.md` | Tablet first, then laptop, then phone — and what that rules out |
| `docs/04-replay-and-reveal.md` | Archive-first, windowed replay, and why that order de-risks live |
| `docs/05-build-and-deploy.md` | How the site builds and publishes, and two failure modes designed out |
| `pipeline/README.md` | How to export a real race, and what the export refuses to publish |
| `docs/archive/2026-08-build-log.md` | The abandoned build's log, verbatim. History, not instruction — it describes Cesium, a weather layer and a post-race framing, all of which are superseded |

The findings worth keeping from that archive are carried forward, curated, into
`context.md` §11.

## What is decided, and what is not

Decided: free, no paid tier, no accounts, nothing generative. Live data comes
from OpenF1, whose non-commercial licence permits exactly this. Rendering is
Three.js, and the 3D scene covers the racing line and its elevation, in a
supporting role. Broadcast delay is handled by three clock modes, defaulting to
the live edge, with a broadcast-sync mode that replays a finished race in step
with the viewer's own screen.

Also decided: **tablet first, then laptop, then phone** — a propped tablet in
landscape is the second-screen posture. That rules out hover as a way of
carrying meaning, since the primary device has no pointer, and it makes the
two-hour session length a real design problem rather than an optimisation.

**Nothing is currently blocking the build.** The two open questions — where a
server runs and whether OpenF1 charges for real-time access — were both about
live, and both moved to later with it. Archive data is static files, so no
server is needed yet.

## A note on the name

The product cannot ship under a name containing "F1" or "Formula 1". Trade mark
is the clearest legal exposure here and F1 enforces it against free projects
too. `Race Replay` is a working title on the deployed page, and the repository
name still needs changing. The deploy reads the repository name at build time,
so renaming it will not break the site.
