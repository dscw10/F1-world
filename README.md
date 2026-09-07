# F1 Live Race Dashboard

A live dashboard for a Grand Prix. Follow one driver, interrogate the race as it
happens, and build your own views of the data rather than consuming fixed ones.
A paid tier adds generated analysis and forecasting above the free measured
layer. The circuit is rendered in 3D and used for findings that are genuinely
spatial.

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
| `docs/archive/2026-08-build-log.md` | The abandoned build's log, verbatim. History, not instruction — it describes Cesium, a weather layer and a post-race framing, all of which are superseded |

The findings worth keeping from that archive are carried forward, curated, into
`context.md` §11.

## What is decided, and what is not

Decided: the product is a live race dashboard; rendering is Three.js; the 3D
scene covers the racing line and its real elevation and nothing else; measured
figures never route through a language model.

**Not decided, and blocking:** which live data source to use, whether a paid
tier on F1-derived data is commercially viable, and how the interface avoids
spoiling the viewer's broadcast. These are in `context.md` §8 and need answering
before the live half of the product can be built.

This file will describe how to run the thing once there is a thing to run.
