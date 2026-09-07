# F1 Live Race Dashboard

A free dashboard that plays a Grand Prix as it happened. Follow one driver,
interrogate the race as it unfolds, and build your own views of the data rather
than consuming fixed ones. The circuit is rendered in 3D for findings that are
genuinely spatial.

It runs on completed races, replayed in real time — while a race is playing you
see only what has happened so far, exactly as you would live. Live data comes
later.

The measure of success is that real people find it useful during real races.

## Status: scaffolded and deploying. The product itself is not built.

The site builds to static files and publishes to GitHub Pages on every push:

**https://dscw10.github.io/F1-world/**

What is deployed today is a **foundations page** — the project's status and the
design tokens rendered on a real screen. It proves the build-and-deploy chain
works and gives the token set somewhere to be argued with. It is scaffolding,
and it says so on the page rather than pretending to be a product.

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

**One-time setup for deploys:** in GitHub → Settings → Pages, set **Source** to
**GitHub Actions**. Until that is done the deploy step fails with a permissions
error, which is expected rather than broken. Full detail in
`docs/05-build-and-deploy.md`.

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
