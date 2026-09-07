"""Generate a SYNTHETIC session, structurally identical to a real export.

    python make_fixture.py

Writes into ../public/data/fixture/ with `provenance.synthetic: true`, which
drives an on-screen warning so this can never be mistaken for a real race.

---------------------------------------------------------------------------
WHAT THIS IS FOR, AND WHAT IT MUST NEVER BE USED FOR
---------------------------------------------------------------------------

FOR: developing and proving the *rendering and plumbing* — that the clock
windows correctly, that the replay is smooth, that the dashboard lays out, that
the explorer refuses impossible queries. None of that needs a real race, and
waiting for one would mean building the whole app blind.

NEVER FOR: deciding whether an analytic is CORRECT.

The August build learned this the expensive way and wrote it down:

    "The synthetic test was worse than useless and has been replaced. It
     generated fake data from the same assumptions the detector used, so it
     could only confirm them."

That is the trap: this file invents laps from a model of how a race behaves,
and an analytic tested against it is only being asked whether it agrees with
that model. It always will. The gap-to-leader calculation could be off by a
lap and this fixture would applaud.

The correctness gate for every analytic is the REAL 2024 Belgian Grand Prix,
against facts the analytic did not generate: the official finishing order,
Hamilton's 0.526 s winning margin, Russell leading at the flag on a one-stop
and then being disqualified. See docs/04-replay-and-reveal.md.
"""

from __future__ import annotations

import json
import math
import random
from datetime import datetime, timezone
from pathlib import Path

import schema

OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "fixture"

SEED = 20240728  # deterministic, so the scene does not shimmer between runs
LAPS = 12
DRIVERS = [
    ("VER", "1", "Max Verstappen", "Red Bull Racing", "#3671C6"),
    ("NOR", "4", "Lando Norris", "McLaren", "#FF8000"),
    ("LEC", "16", "Charles Leclerc", "Ferrari", "#E8002D"),
    ("PIA", "81", "Oscar Piastri", "McLaren", "#FF8000"),
    ("SAI", "55", "Carlos Sainz", "Ferrari", "#E8002D"),
    ("RUS", "63", "George Russell", "Mercedes", "#27F4D2"),
    ("HAM", "44", "Lewis Hamilton", "Mercedes", "#27F4D2"),
    ("PER", "11", "Sergio Perez", "Red Bull Racing", "#3671C6"),
    ("ALO", "14", "Fernando Alonso", "Aston Martin", "#229971"),
    ("STR", "18", "Lance Stroll", "Aston Martin", "#229971"),
]

SAMPLE_HZ = 2.0          # real position data is ~3.7 Hz; 2 keeps the fixture small
BASE_LAP_MS = 92_000     # a plausible lap
PIT_LOSS_MS = 22_000

# The shape below is scaled to this length. It matters that the fixture is
# physically plausible: the real export refuses a racing line outside 3-8 km,
# and a fixture that could not pass the gates the real data must pass would be
# testing the app against conditions that can never occur.
TARGET_LAP_M = 5_400


# ---------------------------------------------------------------------------
# The circuit shape
# ---------------------------------------------------------------------------

# Control points tracing a plausible circuit: a long main straight along the
# bottom, a fast right-hander complex, a slow infield section, a hairpin, and a
# quick sweeping return. Hand-placed rather than generated from trigonometry,
# because a superposition of sine waves makes a blob and the track map is the
# surface the Glance moment depends on — it has to read as a road in about two
# seconds.
CONTROL = [
    (-900, -560),   # start/finish, on the main straight
    (-200, -600),
    (400, -580),
    (900, -500),
    (1230, -270),   # turn 1, fast right
    (1180, 60),
    (900, 250),
    (520, 300),     # infield
    (300, 520),
    (520, 760),
    (880, 820),     # hairpin apex
    (700, 1000),
    (250, 980),
    (-250, 800),
    (-620, 560),    # long sweeper back
    (-880, 240),
    (-1010, -120),
    (-1010, -400),
]


def _catmull(p0, p1, p2, p3, t):
    """One Catmull-Rom segment. Passes exactly through p1 and p2."""
    t2, t3 = t * t, t * t * t
    return 0.5 * (
        2 * p1
        + (-p0 + p2) * t
        + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
        + (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    )


def _shape(samples: int):
    """The closed circuit outline, as `samples` points around the ring."""
    n = len(CONTROL)
    per = max(2, samples // n)
    pts = []
    for i in range(n):
        p0 = CONTROL[(i - 1) % n]
        p1 = CONTROL[i]
        p2 = CONTROL[(i + 1) % n]
        p3 = CONTROL[(i + 2) % n]
        for k in range(per):
            t = k / per
            pts.append((
                _catmull(p0[0], p1[0], p2[0], p3[0], t),
                _catmull(p0[1], p1[1], p2[1], p3[1], t),
            ))
    pts.append(pts[0])          # close the ring
    return pts


def _elevation(u: float) -> float:
    """Height at fraction `u` around the lap. One long climb and fall."""
    a = u * 2 * math.pi
    return 420 + 55 * math.sin(a - 0.6) + 18 * math.sin(3 * a)


# Built once and shared, so the racing line and the car positions are
# guaranteed to come from the same geometry. Scaling the line but not the
# frames put every car 1.5x off the road the first time this was rendered.
_SAMPLES = 900
_RAW = _shape(_SAMPLES)


def _raw_length() -> float:
    return sum(
        math.hypot(_RAW[i + 1][0] - _RAW[i][0], _RAW[i + 1][1] - _RAW[i][1])
        for i in range(len(_RAW) - 1)
    )


SCALE = TARGET_LAP_M / _raw_length()


def circuit_point(u: float) -> tuple[float, float, float]:
    """Position at fraction `u` (0-1) around the lap, in SCALED local metres.

    This is the single source of position for both the racing line and the
    cars. Anything that needs a point on the circuit must come through here.
    """
    u = u % 1.0
    idx = u * (len(_RAW) - 1)
    i = int(idx)
    frac = idx - i
    x0, y0 = _RAW[i]
    x1, y1 = _RAW[min(i + 1, len(_RAW) - 1)]
    return (
        (x0 + (x1 - x0) * frac) * SCALE,
        (y0 + (y1 - y0) * frac) * SCALE,
        _elevation(u),
    )


def build_circuit() -> dict:
    n = _SAMPLES
    xs, ys, zs, dist = [], [], [], []
    total = 0.0
    px = py = None
    for i in range(n + 1):           # +1 closes the ring
        x, y, z = circuit_point(i / n)
        if px is not None:
            total += math.hypot(x - px, y - py)
        px, py = x, y
        xs.append(round(x, 1))
        ys.append(round(y, 1))
        zs.append(round(z, 1))
        dist.append(round(total, 1))

    corners = []
    for k, (frac, name) in enumerate([
        (0.06, "Turn 1"), (0.17, "The Esses"), (0.29, "Infield Left"),
        (0.41, "Hairpin"), (0.52, "Exit Right"), (0.64, "Long Sweeper"),
        (0.78, "Double Left"), (0.92, "Final Corner"),
    ], start=1):
        x, y, _ = circuit_point(frac)
        corners.append({
            "number": k,
            "letter": None,
            "name": name,
            "distanceM": round(total * frac, 1),
            "x": round(x, 1),
            "y": round(y, 1),
        })

    return {
        "id": "fixture",
        "name": "Synthetic Circuit",
        "lapLengthM": round(total, 1),
        "line": {"x": xs, "y": ys, "z": zs, "distance": dist},
        "corners": corners,
    }


# ---------------------------------------------------------------------------
# The race
# ---------------------------------------------------------------------------

def build(rng: random.Random):
    circuit = build_circuit()
    lap_len = circuit["lapLengthM"]

    # Each driver gets a base pace and a tyre-degradation slope.
    pace = {}
    for i, (code, *_rest) in enumerate(DRIVERS):
        pace[code] = {
            "base": BASE_LAP_MS + i * 260 + rng.uniform(-120, 120),
            "deg": rng.uniform(45, 110),      # ms lost per lap of tyre age
            "pit_on": rng.choice([5, 6, 7]),  # lap the stop happens
        }

    laps: list[dict] = []
    frames: list[dict] = []

    for grid, (code, number, full, team, colour) in enumerate(DRIVERS):
        p = pace[code]
        # Every car is on track from t = 0, as it is on a real grid. The
        # earlier version staggered them in TIME, which made the order fill in
        # over the first ten seconds and read like a bug. Grid advantage is a
        # head start in DISTANCE along the straight, ~8 m per row.
        t = 0.0
        covered = (len(DRIVERS) - 1 - grid) * 8.0
        tyre_age = 0
        stint = 1
        compound = "MEDIUM"

        ft, fx, fy, fz, fsp, fth, fbr, fg, fd = (
            [], [], [], [], [], [], [], [], [])

        for lap_no in range(1, LAPS + 1):
            duration = p["base"] + p["deg"] * tyre_age + rng.uniform(-350, 350)
            kind = "racing"
            if lap_no == p["pit_on"]:
                duration += PIT_LOSS_MS
                kind = "pit-in"
            elif lap_no == p["pit_on"] + 1:
                kind = "pit-out"

            laps.append({
                "driver": code,
                "lap": lap_no,
                "startMs": int(t),
                "timeMs": int(duration),
                "position": None,          # filled in below, from the clock
                "compound": compound,
                "tyreLife": tyre_age,
                "stint": stint,
                "kind": kind,
                "trackStatus": "1",
                "sectors": [
                    int(duration * 0.31),
                    int(duration * 0.42),
                    int(duration - int(duration * 0.31) - int(duration * 0.42)),
                ],
            })

            # Samples around this lap. Position is derived from cumulative
            # DISTANCE rather than from a lap fraction, so where a car is drawn
            # and how far it has got can never disagree — they are the same
            # number.
            steps = max(2, int(duration / 1000 * SAMPLE_HZ))
            for s in range(steps):
                frac = s / steps
                here = covered + frac * lap_len
                u = (here / lap_len) % 1.0
                x, y, z = circuit_point(u)
                ft.append(int(t + frac * duration))
                fx.append(round(x, 1))
                fy.append(round(y, 1))
                fz.append(round(z, 1))
                # Speed from how fast the lap distance is being covered, shaped
                # so corners are slower than straights.
                shape = 0.55 + 0.45 * abs(math.sin(u * 2 * math.pi * 2 + 0.4))
                fsp.append(round(lap_len / (duration / 1000) * 3.6 * shape, 0))
                fth.append(round(100 * shape, 0))
                fbr.append(1 if shape < 0.68 else 0)
                fg.append(max(1, min(8, int(shape * 8) + 1)))
                fd.append(round(here, 1))

            covered += lap_len
            t += duration
            if lap_no == p["pit_on"]:
                tyre_age, stint, compound = 0, stint + 1, "HARD"
            else:
                tyre_age += 1

        frames.append({
            "driver": code, "t": ft, "x": fx, "y": fy, "z": fz,
            "speed": fsp, "throttle": fth, "brake": fbr, "gear": fg,
            "distance": fd,
        })

    # Positions: at the moment each driver completes a lap, rank everyone by
    # how far through the race they are. Measured at a MOMENT, never
    # lap-against-lap — once a car is lapped those are different points in the
    # race. Same rule as the real pipeline.
    laps.sort(key=lambda l: (l["startMs"], l["driver"]))
    progress: dict[str, tuple[int, int]] = {}   # driver -> (lap, finish time)
    for lap in laps:
        end = lap["startMs"] + (lap["timeMs"] or 0)
        progress[lap["driver"]] = (lap["lap"], end)
        ranked = sorted(progress.items(), key=lambda kv: (-kv[1][0], kv[1][1]))
        for pos, (drv, _) in enumerate(ranked, start=1):
            if drv == lap["driver"]:
                lap["position"] = pos

    duration_ms = max(l["startMs"] + (l["timeMs"] or 0) for l in laps)

    manifest = {
        "schemaVersion": schema.SCHEMA_VERSION,
        "circuitId": "fixture",
        "circuitName": "Synthetic Circuit",
        "eventName": "Development Fixture",
        "year": 2024,
        "session": "R",
        "sessionStart": "2024-07-28T13:00:00+00:00",
        "durationMs": int(duration_ms),
        "drivers": [
            {"code": c, "number": n, "fullName": f, "team": tm, "teamColour": col}
            for (c, n, f, tm, col) in DRIVERS
        ],
        "provenance": {
            "source": "make_fixture.py — generated, not measured",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "synthetic": True,
            "notes": (
                "Every value here is invented. It exists to develop the "
                "rendering and the replay clock before a real export exists. "
                "It must never be used to decide whether an analytic is "
                "correct — it was generated from the same assumptions an "
                "analytic would be tested against, so it can only agree."
            ),
        },
        "verification": {
            "passed": True,
            "checks": [{
                "name": "synthetic",
                "passed": True,
                "detail": "Generated fixture. No verification is meaningful: "
                          "there is nothing independent to check against.",
            }],
        },
    }
    return manifest, circuit, laps, frames


def main() -> int:
    rng = random.Random(SEED)
    manifest, circuit, laps, frames = build(rng)

    OUT.mkdir(parents=True, exist_ok=True)
    for name, payload in (
        (schema.MANIFEST, manifest),
        (schema.CIRCUIT, circuit),
        (schema.LAPS, laps),
        (schema.FRAMES, frames),
    ):
        path = OUT / name
        path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
        print(f"  {name:16} {path.stat().st_size / 1024:8.1f} KB")

    total = sum(len(f["t"]) for f in frames)
    print(f"\n{len(manifest['drivers'])} drivers, {LAPS} laps, "
          f"{len(laps)} lap records, {total} samples, "
          f"{manifest['durationMs'] / 60000:.1f} minutes")
    print("Flagged synthetic: the app will say so on screen.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
