"""The data contract, Python side.

Mirrors `lib/types.ts`. If the two disagree, the app breaks in ways that look
like analysis bugs rather than plumbing bugs. Change them together.

The one rule worth restating here, because it is the rule this project keeps
learning: every time in the output is an integer count of milliseconds since
the session started. FastF1 hands back durations, timestamps and two different
origins, and mixes them freely. All of that is resolved once, here at the
boundary, so nothing downstream has to know.
"""

from __future__ import annotations

SCHEMA_VERSION = 2

# Filenames written into public/data/<circuitId>/
MANIFEST = "manifest.json"
CIRCUIT = "circuit.json"
LAPS = "laps.json"
FRAMES = "frames.json"

LAP_KINDS = ("racing", "pit-in", "pit-out", "not-green", "inaccurate")


def ms(value) -> int | None:
    """Convert a pandas Timedelta (or NaT) to integer milliseconds.

    Returns None for anything missing. Absence is not zero: a lap with no
    recorded time must render as absent, and turning it into 0 would make it
    the fastest lap of the race.
    """
    import pandas as pd

    if value is None or pd.isna(value):
        return None
    # A Timedelta. Anything else here is a bug worth hearing about, so this
    # deliberately does not try to be clever about timestamps — see the module
    # docstring.
    if not isinstance(value, pd.Timedelta):
        raise TypeError(
            f"expected a Timedelta, got {type(value).__name__}: {value!r}. "
            "Anything time-like from FastF1 is a duration until proven "
            "otherwise; resolve it against the session origin first."
        )
    return int(round(value.total_seconds() * 1000))


def num(value, digits: int = 2):
    """Round a float for output, preserving None rather than coercing to 0."""
    import pandas as pd

    if value is None or pd.isna(value):
        return None
    return round(float(value), digits)


# ---------------------------------------------------------------------------
# The session index
# ---------------------------------------------------------------------------

INDEX = "index.json"


def update_index(data_root, session_id: str, label: str, synthetic: bool,
                 make_default: bool = True) -> dict:
    """Register a session in public/data/index.json.

    The app reads this to find out what exists and which race to open. Without
    it, adding a race would mean editing `app/page.tsx` — which is fine from a
    laptop and impossible from the GitHub website on an iPad.
    """
    import json
    from pathlib import Path

    path = Path(data_root) / INDEX
    index = {"default": None, "sessions": []}
    if path.exists():
        try:
            index = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            pass  # a corrupt index is rebuilt rather than inherited

    sessions = [s for s in index.get("sessions", []) if s.get("id") != session_id]
    sessions.append({"id": session_id, "label": label, "synthetic": synthetic})
    # Real sessions first, then alphabetical, so the fixture sinks to the
    # bottom once a real race exists.
    sessions.sort(key=lambda s: (s["synthetic"], s["label"]))

    default = index.get("default")
    if make_default or default is None:
        default = session_id
    # Never leave the app pointing at a session that is no longer listed.
    if default not in {s["id"] for s in sessions}:
        default = sessions[0]["id"] if sessions else None

    out = {"default": default, "sessions": sessions}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    return out
