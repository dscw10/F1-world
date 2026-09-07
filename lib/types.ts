/**
 * THE DATA CONTRACT
 *
 * The single agreement between the Python pipeline and the app. If this file
 * and `pipeline/schema.py` disagree, the app breaks in ways that look like
 * analysis bugs. Change them together.
 *
 * ---------------------------------------------------------------------------
 * TIME
 * ---------------------------------------------------------------------------
 * Every time in this contract is `Ms`: an integer count of milliseconds since
 * the session started (lights out), where t = 0 is that instant.
 *
 * This exists because of a bug family that cost the August build three separate
 * data layers. FastF1 hands back three different kinds of time — `LapTime` and
 * `LapStartTime` are *durations* (`timedelta64`), `LapStartDate` is a
 * *timestamp* (`datetime64`), and `t0_date` and `session_start_time` are two
 * different origins (when the timing feed started vs when the race did). They
 * are trivially mixed up and nothing complains; the numbers just come out
 * wrong. So the pipeline resolves all of it once, at the boundary, and
 * everything downstream sees one unambiguous integer.
 *
 * Anything time-like arriving from FastF1 should be assumed to be a duration
 * until proven otherwise.
 *
 * ---------------------------------------------------------------------------
 * SPACE
 * ---------------------------------------------------------------------------
 * `x` and `y` are metres in a circuit-local frame — not latitude and longitude.
 * `z` is metres above sea level, taken directly from the car. FastF1's
 * telemetry `Z / 10` is *already* metres ASL; adding a circuit datum on top
 * floats the whole track into the sky, which is what happened in August.
 *
 * ---------------------------------------------------------------------------
 * WINDOWING
 * ---------------------------------------------------------------------------
 * Every time-ordered array is sorted ascending, so "everything up to the clock"
 * is a slice rather than a filter. That is what makes the windowed replay in
 * `docs/04-replay-and-reveal.md` cheap enough to do on every frame — and it is
 * why no analytic ever needs to see the whole race to compute a moment in it.
 */

/** Milliseconds since the session started. Integer. */
export type Ms = number;

/** A three-character driver code, e.g. `HAM`. The key used everywhere. */
export type DriverCode = string;

/** Where a number came from. Rendered at the point of use, never a footnote. */
export type Provenance = 'measured' | 'modelled' | 'generated';

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export interface Driver {
  code: DriverCode;
  /** Racing number, as a string because it is an identifier, not a quantity. */
  number: string;
  fullName: string;
  team: string;
  /** Team colour as `#rrggbb`, from the feed. Identity, never magnitude. */
  teamColour: string;
}

/**
 * What the export checked about itself. The pipeline refuses to publish a
 * figure it cannot stand behind, so these carry the reasons.
 */
export interface VerificationReport {
  /** False means at least one gate failed. The app must say so on screen. */
  passed: boolean;
  checks: VerificationCheck[];
}

export interface VerificationCheck {
  name: string;
  passed: boolean;
  /** Human-readable finding, e.g. "finishing order matches official result". */
  detail: string;
}

export interface Manifest {
  /** Bumped when this contract changes shape. The app refuses mismatches. */
  schemaVersion: number;

  circuitId: string;
  circuitName: string;
  eventName: string;
  year: number;
  /** `R` for race, `Q` qualifying, and so on. */
  session: string;

  /** ISO 8601 instant that t = 0 corresponds to. For display only. */
  sessionStart: string;
  /** Total session length. The replay clock runs 0 → this. */
  durationMs: Ms;

  drivers: Driver[];

  provenance: {
    source: string;
    generatedAt: string;
    /**
     * True for the development fixture. Drives an on-screen warning, so
     * invented data can never be mistaken for a real race.
     */
    synthetic: boolean;
    notes: string;
  };

  verification: VerificationReport;
}

// ---------------------------------------------------------------------------
// Laps
// ---------------------------------------------------------------------------

/** Why a lap is not a clean racing lap. Absence is not zero — see §7. */
export type LapKind = 'racing' | 'pit-in' | 'pit-out' | 'not-green' | 'inaccurate';

export interface Lap {
  driver: DriverCode;
  /** 1-based. */
  lap: number;
  /** When the lap began. Sorting key. */
  startMs: Ms;
  /** Lap duration. Null where the feed never produced one — not zero. */
  timeMs: Ms | null;
  /** Classified position at the end of this lap. Null if unknown. */
  position: number | null;

  compound: string | null;
  /** Laps on this set of tyres at the start of this lap. */
  tyreLife: number | null;
  stint: number | null;

  kind: LapKind;
  /** Raw track status string from the feed, kept for auditing. */
  trackStatus: string;

  /** Sector times. Null entries are absent, not zero. */
  sectors: [Ms | null, Ms | null, Ms | null];
}

// ---------------------------------------------------------------------------
// Frames — the big one, stored columnar
// ---------------------------------------------------------------------------

/**
 * Position and telemetry samples for one driver, as parallel arrays.
 *
 * Columnar because the August build measured it: the same data as an array of
 * objects was 13.3 MB, almost all of it repeated JSON keys across 155,810
 * samples. Columnar took it to 5.8 MB raw, 1.5 MB gzipped.
 *
 * Every array has the same length as `t`, and `t` is sorted ascending.
 */
export interface DriverFrames {
  driver: DriverCode;
  /** Sample times. Sorted ascending. The slice index for windowing. */
  t: Ms[];
  /** Circuit-local metres. */
  x: number[];
  y: number[];
  /** Metres above sea level, from the car. */
  z: number[];
  /** km/h. */
  speed: number[];
  /** 0–100. */
  throttle: number[];
  /** 0 or 1. Discrete in the source, so never interpolated. */
  brake: number[];
  gear: number[];
  /**
   * Cumulative distance covered in the session, metres.
   *
   * Measured, not derived — FastF1 carries it as a telemetry channel. It is
   * what makes a running order possible at every instant rather than only at
   * lap boundaries: rank by distance covered and an on-track overtake shows
   * the moment it happens, instead of waiting for the next start/finish
   * crossing. Distance modulo the lap length is also where the car is on the
   * lap, which is cheaper and more accurate than projecting x/y onto the line.
   */
  distance: number[];
}

// ---------------------------------------------------------------------------
// Circuit
// ---------------------------------------------------------------------------

export interface Corner {
  /** Corner number from the feed. */
  number: number;
  /** Optional suffix where a circuit has 2A / 2B. */
  letter: string | null;
  /**
   * Editorial name — "Eau Rouge". Kept separate from the number because the
   * number is measured and the name is a choice.
   */
  name: string | null;
  /** Distance along the lap, metres from the start line. */
  distanceM: number;
  x: number;
  y: number;
}

/**
 * The racing line, as a closed ring of samples in circuit-local metres.
 * Derived from a real fast lap, so it is a measured line rather than a
 * drawn one.
 */
export interface Circuit {
  id: string;
  name: string;
  /** Measured length of the exported line. Not the official circuit length. */
  lapLengthM: number;
  line: {
    x: number[];
    y: number[];
    z: number[];
    /** Cumulative distance from the start line, metres. Sorted ascending. */
    distance: number[];
  };
  corners: Corner[];
}

// ---------------------------------------------------------------------------
// The bundle
// ---------------------------------------------------------------------------

/** Everything one exported session contains, as the app holds it in memory. */
export interface SessionData {
  manifest: Manifest;
  circuit: Circuit;
  laps: Lap[];
  frames: DriverFrames[];
}

/** The contract version this build of the app understands. */
export const SCHEMA_VERSION = 2;
