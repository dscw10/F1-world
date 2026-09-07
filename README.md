# F1 Live Race Dashboard

A free, live dashboard for a Grand Prix. Follow one driver, interrogate the race
as it happens, and build your own views of the data rather than consuming fixed
ones. The circuit is rendered in 3D for findings that are genuinely spatial.

The measure of success is that real people find it useful during real races.

## Status: definition. There is no code yet.

This repository currently holds documents only. An earlier version of this
project was built during August 2026 but its code was never committed here, and
the project was deliberately restarted on 7 September 2026 with a different
product direction.

**There is nothing to install and nothing to run.** Any instructions you
remember from a previous version of this file described an application that does
not exist in this repository.

## Where things are

| File | What it is |
|---|---|
| `context.md` | **Start here.** Scope, decisions, open questions. The source of truth |
| `CLAUDE.md` | Project instructions, read automatically by Claude Code |
| `docs/01-live-source-licensing.md` | Which data sources exist and what each licence permits. Mostly resolved by dropping the paid tier — read its header |
| `docs/02-broadcast-sync.md` | Time, delay, and the three clock modes |
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

**Open, and top of the list:** whether phone is the primary target. "Second
screen during a race" describes a phone, and it inverts most layout decisions,
so it wants settling before any UI work.

One thing to know early: because the upstream free tier is a few requests per
second, browsers cannot talk to it directly. A small always-on server polls once
and serves every client. This is not a static site.

None of this blocks the build. The archive pipeline, the analytics, the
dashboard, the explorer and the 3D circuit all run on data from a race that
finished two years ago, with no server at all.

This file will describe how to run the thing once there is a thing to run.
