# Exporting a race without a computer

**Written:** 2026-09-07
**Settles:** how Chris adds a real race when the only device to hand is an iPad.

## The short version

**Actions tab → "Export a race" → "Run workflow" → fill in the race → Run.**

Five to ten minutes later the real data is committed and the site has
redeployed. No terminal, no Python, no laptop.

## Why this exists

The pipeline needs Python, pandas, scipy and a network route to F1's timing
archive. An iPad has none of those and cannot get them: the App Store terminals
(a-Shell, iSH) either lack the compiled scientific libraries entirely or would
need to build them under emulation, which is not a realistic path.

The way round it is not to run the pipeline locally at all. A GitHub Actions
runner is a full Linux machine with open internet, and it is reachable from any
browser. So the runner does the work and commits the result; the iPad only has
to press a button.

This also happens to solve the sandbox's own problem — the development
environment has no route to F1's servers either.

## What you fill in

| Field | Meaning | Example |
|---|---|---|
| **year** | Season. FastF1 covers 2018 onwards | `2024` |
| **gp** | Grand Prix, by country or round number | `Belgium` or `13` |
| **session** | Which session | `R` race, `Q` qualifying, `S` sprint, `FP1`–`FP3` |
| **max_hz** | Telemetry samples per second per car | `4` |

**Leave `max_hz` at 4.** The app interpolates between samples with a spline, so
a higher rate makes the file bigger without making the replay any smoother. It
is exposed because it is the one knob that trades download size against
fidelity, and it should be a decision rather than a hidden constant.

## What happens

1. The runner installs the pipeline and restores FastF1's download cache.
2. `export_session.py` downloads the session and writes the four artefacts into
   `public/data/<circuit>/`.
3. It **verifies itself** — lap length, altitude range, finishing order against
   the official classification, telemetry coverage, sample ordering.
4. It registers the new race in `public/data/index.json` and makes it the
   default, so the app opens it with no code change.
5. The data is committed to `main`, which triggers the deploy.

The run summary shows the verification report and the file sizes, so you can
read the outcome on the phone or iPad without opening the logs.

## If a gate fails

**The run still commits, and this is deliberate.** A failed gate does not mean
the data is worthless — it means one check did not pass, and the manifest
records which. The app then shows a warning on screen rather than presenting
the figures as sound.

Refusing to publish anything would hide the finding. Publishing quietly would
mislead. Publishing with the failure attached is the honest middle, and it
matches the rule the rest of the project runs on.

## If nothing is written at all

The run fails, loudly, and nothing is committed.

This case is worth knowing about because **FastF1 does not raise when its
downloads fail**. It logs a wall of warnings, returns normally, and leaves an
empty session behind — verified by running the export with no network route:
every fetch failed and `load()` reported success. Left alone, that produces
either a confusing traceback several steps later or, worse, a partial export
that looks like a real race.

So the pipeline checks the session actually loaded before building anything on
it, and says what to try:

```
The session loaded but is empty (no lap data, no drivers, no session start time).

Nothing has been written. Exporting from a half-loaded session would produce a
file that looks like a race and is not one.

FastF1 does not raise when its downloads fail — it warns and carries on — so the
warnings above are the real error. Likely causes:

  * No route to F1's timing servers from this machine.
  * 'Belgum' is not a Grand Prix in 2024. Try the country (Belgium, Monaco) or
    the round number.
  ...
```

A typo in the race name lands here, which is the most likely reason for a
failed run in practice.

## Switching between races

Every export is kept. `public/data/index.json` lists them and names the default,
and the newest real export becomes the default automatically. The synthetic
fixture always sorts last, so it stops being what the site opens the moment a
real race exists.

## One thing to be aware of

This commits F1's telemetry data into a public repository. It is what every
FastF1-based project does and the project is free and non-commercial, which is
the footing `docs/01-live-source-licensing.md` settles on. It is a more visible
act than fetching at runtime, so it is worth stating rather than leaving
implicit.
