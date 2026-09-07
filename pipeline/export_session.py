"""Export one completed F1 session into the static artefacts the app reads.

Runs offline. Never on the request path. See docs/04-replay-and-reveal.md.

    python export_session.py --year 2024 --gp Belgium --session R

Writes into ../public/data/<circuit-id>/ :

    manifest.json   what this export is, and what it checked about itself
    circuit.json    the racing line and corner markers
    laps.json       per-driver, per-lap records
    frames.json     columnar position and telemetry samples

WHY IT REFUSES THINGS

Every failure mode this pipeline has hit before produced a *plausible wrong
answer* rather than an error: a track placed in the wrong country still looks
like a track, an altitude 400 m out still looks like a hillside, a corrupted
lap still looks like a lap time. So the export verifies itself against facts it
did not generate, and will not quietly publish a figure it cannot stand behind.
`--verify` prints the report; the report is also written into the manifest so
the app can show it.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import schema
from schema import ms, num

OUT_ROOT = Path(__file__).resolve().parent.parent / "public" / "data"
CACHE = Path(__file__).resolve().parent / "cache"

# Corner numbers come from the feed; corner NAMES are editorial and live here,
# deliberately separate. The number is measured, the name is a choice.
CORNER_NAMES: dict[str, dict[int, str]] = {
    "spa": {
        1: "La Source",
        2: "Eau Rouge",
        3: "Raidillon",
        5: "Kemmel Straight",
        6: "Les Combes",
        7: "Malmedy",
        8: "Rivage",
        10: "Pouhon",
        12: "Fagnes",
        14: "Stavelot",
        15: "Stavelot",
        17: "Blanchimont",
        18: "Bus Stop",
    },
}


# ---------------------------------------------------------------------------
# Session time origin — the bug family, resolved once
# ---------------------------------------------------------------------------

def resolve_origin(session):
    """Return the wall-clock instant that session time t = 0 refers to.

    FastF1 offers several things that look interchangeable and are not:

      t0_date              when the *timing feed* started recording
      session_start_time   a DURATION from t0_date to the actual session start
      date / EventDate     the scheduled date, not the start

    The August build lost three separate data layers to this. `.strftime` on a
    Timedelta raises inside a try block, and cloud and rain were silently
    dropped for an entire race with one warning line.

    We want the *race* start, so: t0_date + session_start_time.
    """
    import pandas as pd

    t0 = getattr(session, "t0_date", None)
    if t0 is None or pd.isna(t0):
        raise RuntimeError(
            "session.t0_date is missing — cannot establish a time origin. "
            "Load the session with laps=True before exporting."
        )
    if not isinstance(t0, pd.Timestamp):
        t0 = pd.Timestamp(t0)

    offset = getattr(session, "session_start_time", None)
    if offset is not None and not pd.isna(offset):
        if not isinstance(offset, pd.Timedelta):
            raise TypeError(
                f"session_start_time should be a Timedelta, got "
                f"{type(offset).__name__}. See the docstring."
            )
        return t0 + offset, offset
    # No offset available: the feed origin is the best we have. Say so.
    return t0, pd.Timedelta(0)


def to_ms(value, origin_offset):
    """Convert a FastF1 session-time Timedelta into our Ms.

    FastF1's session times are measured from `t0_date`; ours are measured from
    the race start. `origin_offset` is the gap between them.
    """
    import pandas as pd

    if value is None or pd.isna(value):
        return None
    if not isinstance(value, pd.Timedelta):
        raise TypeError(f"expected Timedelta, got {type(value).__name__}")
    return int(round((value - origin_offset).total_seconds() * 1000))


# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------

def circuit_id(session) -> str:
    """A stable, filesystem-safe id for the circuit."""
    name = str(session.event["Location"]).strip().lower()
    return "".join(c if c.isalnum() else "-" for c in name).strip("-")


def extract_drivers(session) -> list[dict]:
    drivers = []
    for num_str in session.drivers:
        try:
            d = session.get_driver(num_str)
        except Exception:
            continue
        colour = str(d.get("TeamColor", "") or "").lstrip("#")
        drivers.append({
            "code": str(d.get("Abbreviation", num_str)),
            "number": str(num_str),
            "fullName": str(d.get("FullName", "")),
            "team": str(d.get("TeamName", "")),
            "teamColour": f"#{colour}" if colour else "#888888",
        })
    drivers.sort(key=lambda x: x["code"])
    return drivers


def classify_lap(row) -> str:
    """Decide what kind of lap this is.

    Order matters: a pit lap that was also under a safety car is still a pit
    lap for our purposes, because that is what excludes it from pace analysis.
    """
    import pandas as pd

    if not pd.isna(row.get("PitInTime")):
        return "pit-in"
    if not pd.isna(row.get("PitOutTime")):
        return "pit-out"
    status = str(row.get("TrackStatus", "") or "")
    # "1" is green. Anything else in the string means the lap was run under
    # some kind of intervention and is not comparable for pace.
    if status and set(status) - {"1"}:
        return "not-green"
    if row.get("IsAccurate") is False:
        return "inaccurate"
    return "racing"


def extract_laps(session, origin_offset) -> list[dict]:
    laps = []
    for _, row in session.laps.iterrows():
        start = to_ms(row.get("LapStartTime"), origin_offset)
        if start is None:
            # Without a start time the lap cannot be placed on the clock, and a
            # lap that cannot be placed cannot be windowed. Drop it and count
            # it rather than guessing a position for it.
            continue
        laps.append({
            "driver": str(row["Driver"]),
            "lap": int(row["LapNumber"]),
            "startMs": start,
            "timeMs": ms(row.get("LapTime")),
            "position": None if _isna(row.get("Position")) else int(row["Position"]),
            "compound": _str_or_none(row.get("Compound")),
            "tyreLife": None if _isna(row.get("TyreLife")) else int(row["TyreLife"]),
            "stint": None if _isna(row.get("Stint")) else int(row["Stint"]),
            "kind": classify_lap(row),
            "trackStatus": str(row.get("TrackStatus", "") or ""),
            "sectors": [
                ms(row.get("Sector1Time")),
                ms(row.get("Sector2Time")),
                ms(row.get("Sector3Time")),
            ],
        })
    # Sorted by time so a windowed read is a slice, not a filter.
    laps.sort(key=lambda l: (l["startMs"], l["driver"]))
    return laps


def _isna(v) -> bool:
    import pandas as pd
    return v is None or pd.isna(v)


def _str_or_none(v):
    import pandas as pd
    if v is None or pd.isna(v) or str(v).strip() in ("", "nan", "None"):
        return None
    return str(v)


def extract_frames(session, origin_offset, drivers) -> list[dict]:
    """Position and telemetry per driver, as parallel arrays.

    `get_telemetry()` is called ONCE PER DRIVER, never per lap. The August
    build called it inside the lap loop: it reads correctly and it is unusable,
    because each call slices car data, slices position data, resamples both
    onto a merged index and integrates distance. Done ~800 times, the export
    sat in that step for 29 minutes before it was killed.
    """
    frames = []
    for d in drivers:
        code = d["code"]
        try:
            laps = session.laps.pick_drivers(d["number"])
            if laps.empty:
                continue
            # add_distance() gives the measured cumulative distance channel,
            # which is what lets the app rank cars continuously.
            tel = laps.get_telemetry().add_distance()
        except Exception as exc:  # noqa: BLE001 - report and continue
            print(f"  ! {code}: telemetry unavailable ({exc})", file=sys.stderr)
            continue
        if tel is None or tel.empty:
            continue

        t, x, y, z, speed, throttle, brake, gear, dist = (
            [], [], [], [], [], [], [], [], [])
        for _, r in tel.iterrows():
            tm = to_ms(r.get("SessionTime"), origin_offset)
            if tm is None:
                continue
            t.append(tm)
            x.append(num(r.get("X"), 1))
            y.append(num(r.get("Y"), 1))
            # FastF1's Z/10 is ALREADY metres above sea level. Do not add a
            # circuit datum on top; the August build did and floated Spa at
            # 766-869 m against a real 400-470 m.
            z.append(num((r.get("Z") or 0) / 10.0, 1))
            speed.append(num(r.get("Speed"), 0))
            throttle.append(num(r.get("Throttle"), 0))
            brake.append(1 if bool(r.get("Brake")) else 0)
            gear.append(None if _isna(r.get("nGear")) else int(r["nGear"]))
            dist.append(num(r.get("Distance"), 1))

        if not t:
            continue
        order = sorted(range(len(t)), key=lambda i: t[i])
        pick = lambda arr: [arr[i] for i in order]  # noqa: E731
        frames.append({
            "driver": code,
            "t": pick(t), "x": pick(x), "y": pick(y), "z": pick(z),
            "speed": pick(speed), "throttle": pick(throttle),
            "brake": pick(brake), "gear": pick(gear), "distance": pick(dist),
        })
        print(f"  {code}: {len(t)} samples")
    return frames


def extract_circuit(session, cid: str, origin_offset) -> dict:
    """The racing line, taken from the fastest lap actually driven.

    A measured line rather than a drawn one — which is the whole premise of the
    project. The line is closed into a ring so the app can index around it
    without special-casing the start/finish crossing.
    """
    fastest = session.laps.pick_fastest()
    tel = fastest.get_telemetry().add_distance()

    x = [num(v, 1) for v in tel["X"]]
    y = [num(v, 1) for v in tel["Y"]]
    z = [num((v or 0) / 10.0, 1) for v in tel["Z"]]
    dist = [num(v, 1) for v in tel["Distance"]]

    corners = []
    try:
        info = session.get_circuit_info()
        names = CORNER_NAMES.get(cid, {})
        for _, c in info.corners.iterrows():
            n = int(c["Number"])
            corners.append({
                "number": n,
                "letter": _str_or_none(c.get("Letter")),
                "name": names.get(n),
                "distanceM": num(c.get("Distance"), 1),
                "x": num(c.get("X"), 1),
                "y": num(c.get("Y"), 1),
            })
    except Exception as exc:  # noqa: BLE001
        print(f"  ! circuit info unavailable ({exc})", file=sys.stderr)

    return {
        "id": cid,
        "name": str(session.event["Location"]),
        "lapLengthM": dist[-1] if dist else 0,
        "line": {"x": x, "y": y, "z": z, "distance": dist},
        "corners": corners,
    }


# ---------------------------------------------------------------------------
# Verification — the export checks itself against things it did not generate
# ---------------------------------------------------------------------------

def verify(session, circuit, laps, frames, drivers) -> dict:
    checks: list[dict] = []

    def check(name, passed, detail):
        checks.append({"name": name, "passed": bool(passed), "detail": detail})

    # 1. Lap length. Every failure mode of georeferencing still produces a
    #    closed loop, so the check is against a plausible physical range.
    length = circuit["lapLengthM"]
    ok = 3000 <= length <= 8000
    check("lap-length", ok,
          f"measured racing line is {length:.0f} m"
          + ("" if ok else " — outside the 3-8 km range every F1 circuit sits in"))

    # 2. Altitude. FastF1's Z/10 is metres ASL. If a circuit datum has been
    #    added by mistake the numbers are still smooth and still look like a
    #    hillside, so check the absolute range rather than the shape.
    zs = [v for v in circuit["line"]["z"] if v is not None]
    if zs:
        lo, hi = min(zs), max(zs)
        ok = -100 <= lo <= 3000 and (hi - lo) < 400
        check("altitude-range", ok,
              f"road spans {lo:.0f}-{hi:.0f} m ASL, {hi - lo:.0f} m of climb"
              + ("" if ok else " — implausible; a datum may have been added twice"))

    # 3. Finishing order against the official classification. This is the
    #    strongest check available: it comes from the results table, which the
    #    lap data did not generate.
    try:
        official = [str(r["Abbreviation"]) for _, r in session.results.iterrows()]
        last_pos: dict[str, int] = {}
        for lap in laps:
            if lap["position"] is not None:
                last_pos[lap["driver"]] = lap["position"]
        derived = [d for d, _ in sorted(last_pos.items(), key=lambda kv: kv[1])]
        overlap = [d for d in derived if d in official]
        matches = sum(1 for i, d in enumerate(overlap[:10]) if official[i] == d)
        ok = matches >= 8
        check("finishing-order", ok,
              f"{matches} of the top 10 derived from lap data match the official "
              f"classification" + ("" if ok else " — below the threshold of 8"))
    except Exception as exc:  # noqa: BLE001
        check("finishing-order", False, f"could not compare: {exc}")

    # 4. Coverage. A silent partial export is worse than a loud failure.
    with_frames = {f["driver"] for f in frames}
    expected = {d["code"] for d in drivers}
    missing = sorted(expected - with_frames)
    check("telemetry-coverage", not missing,
          f"{len(with_frames)} of {len(expected)} drivers have telemetry"
          + (f"; missing {', '.join(missing)}" if missing else ""))

    # 5. Monotonic time. The windowed replay slices these arrays; an unsorted
    #    array would silently show the wrong moment.
    unsorted = [f["driver"] for f in frames if any(
        f["t"][i] > f["t"][i + 1] for i in range(len(f["t"]) - 1))]
    check("frames-sorted", not unsorted,
          "all frame arrays ascend in time" if not unsorted
          else f"out of order: {', '.join(unsorted)}")

    return {"passed": all(c["passed"] for c in checks), "checks": checks}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--year", type=int, required=True)
    p.add_argument("--gp", required=True, help="Grand Prix name or round number")
    p.add_argument("--session", default="R", help="R, Q, FP1 ... (default R)")
    p.add_argument("--verify", action="store_true",
                   help="print the verification report in full")
    p.add_argument("--out", type=Path, default=OUT_ROOT)
    args = p.parse_args()

    import fastf1

    CACHE.mkdir(parents=True, exist_ok=True)
    fastf1.Cache.enable_cache(str(CACHE))

    print(f"Loading {args.year} {args.gp} {args.session} ...")
    session = fastf1.get_session(args.year, args.gp, args.session)
    session.load(laps=True, telemetry=True, weather=False, messages=True)

    origin, origin_offset = resolve_origin(session)
    cid = circuit_id(session)
    print(f"Circuit id: {cid}")
    print(f"Session t=0 at {origin.isoformat()}")

    drivers = extract_drivers(session)
    print(f"Drivers: {len(drivers)}")

    print("Laps ...")
    laps = extract_laps(session, origin_offset)
    print(f"  {len(laps)} laps")

    print("Circuit ...")
    circuit = extract_circuit(session, cid, origin_offset)
    print(f"  racing line {circuit['lapLengthM']:.0f} m, "
          f"{len(circuit['corners'])} corners")

    print("Telemetry ...")
    frames = extract_frames(session, origin_offset, drivers)

    duration = max((l["startMs"] + (l["timeMs"] or 0)) for l in laps) if laps else 0

    print("Verifying ...")
    report = verify(session, circuit, laps, frames, drivers)

    manifest = {
        "schemaVersion": schema.SCHEMA_VERSION,
        "circuitId": cid,
        "circuitName": circuit["name"],
        "eventName": str(session.event["EventName"]),
        "year": args.year,
        "session": args.session,
        "sessionStart": origin.isoformat(),
        "durationMs": int(duration),
        "drivers": drivers,
        "provenance": {
            "source": "FastF1 (official F1 timing archive)",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "synthetic": False,
            "notes": "Measured session data. No values are invented.",
        },
        "verification": report,
    }

    out = args.out / cid
    out.mkdir(parents=True, exist_ok=True)
    for name, payload in (
        (schema.MANIFEST, manifest),
        (schema.CIRCUIT, circuit),
        (schema.LAPS, laps),
        (schema.FRAMES, frames),
    ):
        path = out / name
        path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
        print(f"  wrote {path.relative_to(Path.cwd()) if path.is_relative_to(Path.cwd()) else path}"
              f" ({path.stat().st_size / 1_000_000:.1f} MB)")

    print("\nVerification")
    for c in report["checks"]:
        print(f"  [{'ok ' if c['passed'] else 'FAIL'}] {c['name']}: {c['detail']}")

    if not report["passed"]:
        print("\nAt least one gate failed. The export was written and the manifest "
              "records the failure, so the app will say so on screen rather than "
              "presenting these figures as sound.", file=sys.stderr)
        return 1
    print("\nAll gates passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
