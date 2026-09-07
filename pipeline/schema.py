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
