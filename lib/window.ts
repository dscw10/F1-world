/**
 * THE WINDOW
 *
 * A view of the session up to one moment. This is the only thing analytics and
 * components are ever handed.
 *
 * `CLAUDE.md` states the rule as "no analytic may read data later than the
 * clock". A rule people have to remember is a rule that gets broken on a
 * Friday, so this makes it structural instead: an analytic is given a
 * `SessionWindow` and there is no route from it back to the whole race. The
 * future is not hidden — it is absent.
 *
 * That matters more than it looks. An analytic written against a complete race
 * quietly assumes it can see the end: "the fastest lap" becomes the fastest lap
 * of the whole race rather than the fastest so far, and nothing complains. It
 * looks right in development and is wrong for the entire replay. Building
 * windowed from the start is also what makes the live transport a swap rather
 * than a rewrite — see docs/04-replay-and-reveal.md.
 */

import type {
  DriverCode,
  DriverFrames,
  Lap,
  Ms,
  SessionData,
} from './types';

// ---------------------------------------------------------------------------
// Index — built once per session, so windowing is cheap enough per frame
// ---------------------------------------------------------------------------

export interface SessionIndex {
  readonly data: SessionData;
  /** Laps ordered by when they were COMPLETED, not when they started. */
  readonly lapsByCompletion: readonly Lap[];
  /** Completion times, parallel to `lapsByCompletion`, for binary search. */
  readonly completions: readonly Ms[];
  readonly framesByDriver: ReadonlyMap<DriverCode, DriverFrames>;
}

/**
 * Laps arrive sorted by start time, but a lap becomes *knowable* when it
 * finishes. Sorting by completion is what lets "everything that has happened"
 * be a slice rather than a scan — and a lap that started but has not finished
 * has no time yet, so including it would invent one.
 */
export function buildIndex(data: SessionData): SessionIndex {
  const completed = data.laps
    .filter((l) => l.timeMs !== null)
    .slice()
    .sort((a, b) => (a.startMs + a.timeMs!) - (b.startMs + b.timeMs!));

  return {
    data,
    lapsByCompletion: completed,
    completions: completed.map((l) => l.startMs + l.timeMs!),
    framesByDriver: new Map(data.frames.map((f) => [f.driver, f])),
  };
}

// ---------------------------------------------------------------------------
// Binary search
// ---------------------------------------------------------------------------

/** Number of leading entries in `sorted` that are <= `value`. */
function countAtOrBefore(sorted: readonly number[], value: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// ---------------------------------------------------------------------------
// Car state
// ---------------------------------------------------------------------------

export interface CarState {
  driver: DriverCode;
  x: number;
  y: number;
  z: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number | null;
  /** Cumulative metres covered. The basis of a continuous running order. */
  distance: number;
}

/**
 * Interpolate between samples with a Catmull-Rom spline.
 *
 * Linear interpolation is the obvious choice and it is visibly wrong: at 2 Hz
 * on a 5.4 km lap the samples are ~60 m apart, so a car crossing an apex cuts
 * the corner in a straight chord and appears to drive across the grass. The
 * August build hit the same thing and recorded the other half of the lesson —
 * that reaching for a higher-degree polynomial overshoots on hairpins and
 * throws the car off the track entirely.
 *
 * Catmull-Rom passes exactly through every measured sample and stays local to
 * the four points around it, so it curves without inventing an excursion.
 */
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

function smooth(arr: readonly number[], i: number, t: number): number {
  const n = arr.length;
  const p0 = arr[Math.max(0, i - 1)];
  const p1 = arr[i];
  const p2 = arr[Math.min(n - 1, i + 1)];
  const p3 = arr[Math.min(n - 1, i + 2)];
  return catmullRom(p0, p1, p2, p3, t);
}

/**
 * Where a car was at `nowMs`.
 *
 * Returns null before the car's first sample and after its last — an absent
 * car renders as absent rather than frozen at the start line, because "absence
 * is not zero" applies to position as much as to a number.
 */
export function carStateAt(
  frames: DriverFrames,
  nowMs: Ms,
): CarState | null {
  const t = frames.t;
  if (t.length === 0 || nowMs < t[0] || nowMs > t[t.length - 1]) return null;

  const idx = Math.max(0, countAtOrBefore(t, nowMs) - 1);
  const next = Math.min(t.length - 1, idx + 1);
  const span = t[next] - t[idx];
  const frac = span > 0 ? (nowMs - t[idx]) / span : 0;

  return {
    driver: frames.driver,
    x: smooth(frames.x, idx, frac),
    y: smooth(frames.y, idx, frac),
    z: smooth(frames.z, idx, frac),
    // Speed and throttle are continuous but noisy; linear is honest here and
    // does not invent a peak between two samples.
    speed: frames.speed[idx] + (frames.speed[next] - frames.speed[idx]) * frac,
    throttle: frames.throttle[idx],
    // Brake and gear are DISCRETE in the source. Interpolating them would
    // produce a half-pressed brake pedal, which never happened.
    brake: frames.brake[idx],
    gear: frames.gear[idx] ?? null,
    distance: frames.distance[idx]
      + (frames.distance[next] - frames.distance[idx]) * frac,
  };
}

// ---------------------------------------------------------------------------
// The window
// ---------------------------------------------------------------------------

export interface SessionWindow {
  /** The moment this window is a view of. */
  readonly nowMs: Ms;
  /** True once the clock has reached the end and the whole race is unlocked. */
  readonly finished: boolean;

  /** Every lap COMPLETED at or before `nowMs`, in completion order. */
  readonly laps: readonly Lap[];

  /** Where every car is now. Cars with no sample here are simply absent. */
  cars(): CarState[];
  /** Where one car is now, or null. */
  car(driver: DriverCode): CarState | null;

  /** The most recent completed lap for a driver, or null. */
  lastLap(driver: DriverCode): Lap | null;
  /** How many laps a driver has completed. */
  lapCount(driver: DriverCode): number;
  /**
   * How far a driver has got, in metres.
   *
   * Deliberately NOT the same question as `car()`. A car that has finished,
   * retired or has no sample at this instant is not on track — `car()` rightly
   * returns null — but it has still covered the distance it covered, and it
   * still holds its place in the order. Conflating the two made the whole
   * classification disappear at the chequered flag, which is precisely the
   * moment it matters most.
   *
   * Null only when the driver has no telemetry at all.
   */
  progress(driver: DriverCode): number | null;

  /** Every driver with telemetry, whether or not they are on track now. */
  classified(): DriverCode[];
}

export function windowAt(index: SessionIndex, nowMs: Ms): SessionWindow {
  const clamped = Math.max(0, Math.min(nowMs, index.data.manifest.durationMs));
  const count = countAtOrBefore(index.completions, clamped);
  const laps = index.lapsByCompletion.slice(0, count);

  // Last lap per driver, computed once for the window rather than per lookup.
  const last = new Map<DriverCode, Lap>();
  const counts = new Map<DriverCode, number>();
  for (const lap of laps) {
    last.set(lap.driver, lap);
    counts.set(lap.driver, (counts.get(lap.driver) ?? 0) + 1);
  }

  return {
    nowMs: clamped,
    finished: clamped >= index.data.manifest.durationMs,
    laps,
    cars() {
      const out: CarState[] = [];
      for (const frames of index.framesByDriver.values()) {
        const s = carStateAt(frames, clamped);
        if (s) out.push(s);
      }
      return out;
    },
    car(driver) {
      const frames = index.framesByDriver.get(driver);
      return frames ? carStateAt(frames, clamped) : null;
    },
    lastLap: (driver) => last.get(driver) ?? null,
    lapCount: (driver) => counts.get(driver) ?? 0,
    progress(driver) {
      const frames = index.framesByDriver.get(driver);
      if (!frames || frames.t.length === 0) return null;
      // Before the car's first sample it has covered nothing; after its last,
      // it holds whatever it covered. Clamping rather than returning null is
      // what keeps a finished car in the classification.
      if (clamped < frames.t[0]) return 0;
      const end = frames.t[frames.t.length - 1];
      if (clamped >= end) return frames.distance[frames.distance.length - 1];
      return carStateAt(frames, clamped)?.distance ?? null;
    },
    classified: () => [...index.framesByDriver.keys()],
  };
}
