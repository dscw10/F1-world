# The pipeline

Turns a completed F1 session into the static files the app reads. Runs offline,
never at request time.

## Why you have to run this, and I could not

The development sandbox this was written in has no network route to F1's timing
servers — `livetiming.formula1.com`, `ergast.com` and `api.jolpi.ca` are all
blocked. So the pipeline is written, type-checked and reasoned against FastF1's
real API, but it has **never been run against a real session**.

That is a meaningful gap and it is stated rather than glossed over. The August
build hit the same wall and recorded it. Expect the first real run to surface
something; that is what `--verify` is for.

## The easy way: run it on GitHub

You do not need any of the setup below. **Actions → "Export a race" → "Run
workflow"** runs this pipeline on a GitHub runner and commits the result. It
works from any browser, including on an iPad. See
`docs/06-exporting-from-an-ipad.md`.

The rest of this page is for running it locally.

## Setup

Needs Python 3.11 or newer.

```bash
cd pipeline
python -m venv .venv
# macOS / Linux:
source .venv/bin/activate
# Windows PowerShell:
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

## Export a real session

```bash
python export_session.py --year 2024 --gp Belgium --session R --verify
```

The first run downloads from the F1 archive and takes several minutes. It caches
into `pipeline/cache/`, so later runs are fast. That folder is git-ignored — it
is large and entirely reproducible.

Output goes to `public/data/<circuit-id>/`, and the export registers itself in
`public/data/index.json` as the new default. **No source edit is needed** — the
app reads that index at runtime, which is what lets the whole thing run as a
GitHub Action.

### It checks itself, and it will tell you if it failed

Every failure mode this pipeline has hit before produced a **plausible wrong
answer** rather than an error. A track placed in the wrong country still looks
like a track. An altitude 400 m out still looks like a hillside. A corrupted lap
still looks like a lap time.

So the export verifies itself against facts it did not generate:

| Check | What it catches |
|---|---|
| `lap-length` | A racing line outside 3–8 km. Every F1 circuit is in that range |
| `altitude-range` | A circuit datum added on top of an altitude that already included it — the exact bug that floated Spa 400 m into the sky |
| `finishing-order` | Laps that do not reconstruct the official classification. The strongest check available, because the results table did not come from the lap data |
| `telemetry-coverage` | A silently partial export |
| `frames-sorted` | Out-of-order samples, which would make the replay show the wrong moment |

If a gate fails, the export still writes — but the manifest records the failure
and **the app says so on screen** rather than presenting the figures as sound.
Exit code is 1.

## The development fixture

```bash
python make_fixture.py
```

Generates a synthetic session into `public/data/fixture/`, flagged
`synthetic: true` so the app shows a warning. It exists so the interface can be
built before a real export exists.

**It must never be used to decide whether an analytic is correct.** It was
generated from a model of how a race behaves, so an analytic tested against it
is only being asked whether it agrees with that model — and it always will. The
August build recorded this after a synthetic test spent its life confirming a
detector's own assumptions back to it.

The correctness gate is a real race, against facts the analytics did not
generate.

## Files

| File | What it does |
|---|---|
| `schema.py` | The data contract, Python side. Mirrors `lib/types.ts` — change them together |
| `export_session.py` | The real export, with its verification gates |
| `make_fixture.py` | The synthetic development session |

## The one rule that keeps biting

**Anything time-like from FastF1 is a duration until proven otherwise.**

`LapTime` and `LapStartTime` are `timedelta64`. `LapStartDate` is `datetime64`.
`t0_date` is when the timing feed started; `session_start_time` is an offset
from that to when the race actually started. They are trivially mixed up, and
nothing complains — the numbers just come out wrong.

This family of bug cost the August build three separate data layers, once
silently dropping cloud and rain for an entire race behind a single warning
line. All of it is resolved once, in `resolve_origin()`, so everything
downstream sees one unambiguous integer count of milliseconds from lights out.
