/**
 * ANALYTICS
 *
 * Every function here takes a `SessionWindow` and nothing else. It cannot see
 * past the clock because it is not given anything past the clock.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS AND IS NOT VERIFIED
 * ---------------------------------------------------------------------------
 * These are developed against the synthetic fixture, which proves they RUN and
 * that the plumbing is sound. That is not the same as proving they are RIGHT.
 * The fixture was generated from a model of how a race behaves, so testing an
 * analytic against it only asks whether it agrees with that model, and it
 * always will — the August build recorded this after a synthetic test confirmed
 * a detector's assumptions back to it.
 *
 * The correctness gate is the real 2024 Belgian Grand Prix, against facts these
 * functions did not generate: the official finishing order, Hamilton's 0.526 s
 * margin, Russell's one-stop and disqualification. Until that export exists,
 * treat every number below as plumbing rather than as analysis.
 */

import type { DriverCode, Lap, Ms } from './types';
import type { SessionWindow } from './window';

// ---------------------------------------------------------------------------
// Standings
// ---------------------------------------------------------------------------

export interface Standing {
  position: number;
  driver: DriverCode;
  /** Laps completed at this moment. */
  laps: number;
  /** Most recent completed lap time. Null before the first is finished. */
  lastLapMs: Ms | null;
  /** Gap to the leader. Null for the leader, and when it cannot be measured. */
  gapToLeaderMs: Ms | null;
  /** Gap to the car ahead. Null for the leader. */
  gapToAheadMs: Ms | null;
  /** True when this car is a lap or more behind — the gap is then not a time. */
  lapped: boolean;
  compound: string | null;
  tyreLife: number | null;
  /** True if the driver's most recent lap involved the pit lane. */
  inPitCycle: boolean;
}

/**
 * The order of the race at this moment.
 *
 * Gaps are measured AT A MOMENT, never lap-against-lap. Once a car has been
 * lapped, comparing its lap N to the leader's lap N compares two different
 * points in the race — the August build recorded this and it is the single
 * easiest way to produce a confident wrong number here.
 *
 * So: rank by laps completed, then by when that lap was completed. The gap
 * between two cars on the same lap is the difference in when they crossed the
 * line. Between cars on different laps it is not a time at all, and is
 * reported as `lapped` with a null gap rather than as a number that would look
 * like seconds.
 */
export function standings(w: SessionWindow): Standing[] {
  // Latest completed lap per driver, for tyre and lap-time detail. `w.laps` is
  // in completion order, so the last write wins and is the most recent.
  const latest = new Map<DriverCode, Lap>();
  for (const lap of w.laps) latest.set(lap.driver, lap);

  // The running order comes from DISTANCE COVERED, not from completed laps.
  // Ranking by lap count only changes the order when someone crosses the
  // start line, so an overtake into turn one would not appear until a lap
  // later — and for the whole of lap one there would be no order at all,
  // which leaves the Glance moment with nothing to show.
  // Built from everyone with telemetry, not only cars currently on track. A
  // car that has taken the flag is not "somewhere on the circuit" any more,
  // but it is still classified — and reading the order from live positions
  // alone made the entire classification vanish at the chequered flag.
  const rows = w.classified()
    .map((driver) => ({
      driver,
      distance: w.progress(driver) ?? 0,
      lapsDone: w.lapCount(driver),
      lap: latest.get(driver) ?? null,
    }))
    // A driver who has not started yet sits behind everyone who has.
    .filter((r) => r.distance > 0 || r.lapsDone > 0 || w.nowMs === 0)
    .sort((a, b) => b.distance - a.distance);

  const leader = rows[0];

  return rows.map((r, i) => {
    const ahead = i > 0 ? rows[i - 1] : null;
    // A car is lapped when it is a full lap of distance behind. Comparing lap
    // counts alone misreads the moment either side of the start line.
    const lapped = leader ? (leader.distance - r.distance) >= lapLengthOf(w) : false;
    const gapAheadLapped = ahead
      ? (ahead.distance - r.distance) >= lapLengthOf(w) : false;

    return {
      position: i + 1,
      driver: r.driver,
      laps: r.lapsDone,
      lastLapMs: r.lap?.timeMs ?? null,
      // Gaps stay a difference in TIME at the line, measured at a moment.
      // Distance orders the field; it does not convert into seconds, because
      // two cars at different speeds are not the same number of seconds apart
      // as they are metres apart.
      gapToLeaderMs: i === 0 || lapped ? null
        : timeGap(w, leader.driver, r.driver),
      gapToAheadMs: !ahead || gapAheadLapped ? null
        : timeGap(w, ahead.driver, r.driver),
      lapped,
      compound: r.lap?.compound ?? null,
      tyreLife: r.lap?.tyreLife ?? null,
      inPitCycle: r.lap?.kind === 'pit-in' || r.lap?.kind === 'pit-out',
    };
  });
}

/** Lap length, taken from the most recent completed lap distance available. */
function lapLengthOf(w: SessionWindow): number {
  // Cached per window: every row asks for it.
  const cached = (w as unknown as { __lapLen?: number }).__lapLen;
  if (cached !== undefined) return cached;
  let len = Number.POSITIVE_INFINITY;
  for (const driver of w.classified()) {
    const laps = w.lapCount(driver);
    const dist = w.progress(driver);
    if (laps > 0 && dist !== null) len = Math.min(len, dist / laps);
  }
  const value = Number.isFinite(len) ? len : Number.POSITIVE_INFINITY;
  (w as unknown as { __lapLen?: number }).__lapLen = value;
  return value;
}

/**
 * Time gap between two cars, measured at the line rather than derived from
 * the distance between them.
 *
 * Both cars' most recent crossing of the same lap number is compared. Where
 * they are not on a comparable lap the answer is null rather than a plausible
 * number — the August build's rule that a gap is measured at a MOMENT and
 * never lap-against-lap.
 */
function timeGap(
  w: SessionWindow, ahead: DriverCode, behind: DriverCode,
): Ms | null {
  const aheadLap = w.lastLap(ahead);
  const behindLap = w.lastLap(behind);
  if (!aheadLap || !behindLap) return null;
  if (aheadLap.lap !== behindLap.lap) return null;
  const aEnd = aheadLap.startMs + (aheadLap.timeMs ?? 0);
  const bEnd = behindLap.startMs + (behindLap.timeMs ?? 0);
  const gap = bEnd - aEnd;
  return gap >= 0 ? gap : null;
}

// ---------------------------------------------------------------------------
// Pace
// ---------------------------------------------------------------------------

/**
 * Laps that are comparable for pace.
 *
 * Excluding rather than adjusting, and counting what was excluded, because
 * "we timed N of M laps" is itself a fact the interface should be able to
 * state. Pit laps, laps not run under green, and laps the feed marked
 * inaccurate all describe something other than how quick the car is.
 */
export function cleanLaps(w: SessionWindow, driver?: DriverCode): Lap[] {
  return w.laps.filter((l) =>
    l.kind === 'racing' &&
    l.timeMs !== null &&
    (driver === undefined || l.driver === driver));
}

/** Median — robust to the one slow lap that would drag a mean around. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Median absolute deviation — a spread that outliers cannot inflate.
 *
 * Recorded in the August build after a real failure: a one-stopper's worn-tyre
 * laps are legitimate outliers, and they pushed an ordinary standard deviation
 * from 0.17 s to 1.20 s. Because the detector's threshold was a multiple of the
 * spread, one driver's old tyres raised the bar for the whole field and the
 * detector found nothing at all.
 */
export function mad(values: number[]): number | null {
  const m = median(values);
  if (m === null) return null;
  return median(values.map((v) => Math.abs(v - m)));
}

export interface PaceSummary {
  driver: DriverCode;
  /** Median of clean laps. Null when there are none yet. */
  medianMs: Ms | null;
  /** Best clean lap so far. "Best" is smallest for a lap time — see below. */
  bestMs: Ms | null;
  /** Robust spread. A low value is a metronomic driver. */
  spreadMs: Ms | null;
  /** How many laps went into this. */
  counted: number;
  /** How many were excluded, and therefore how much to trust the above. */
  excluded: number;
}

export function pace(w: SessionWindow, driver: DriverCode): PaceSummary {
  const all = w.laps.filter((l) => l.driver === driver);
  const clean = all.filter((l) => l.kind === 'racing' && l.timeMs !== null);
  const times = clean.map((l) => l.timeMs!);

  return {
    driver,
    medianMs: median(times),
    // `best` is not `minimum` in general — for a battle length the best value
    // is the largest. For a lap time it happens to be the smallest, and this
    // is written out rather than assumed so the distinction survives being
    // copied into the next analytic.
    bestMs: times.length ? Math.min(...times) : null,
    spreadMs: mad(times),
    counted: times.length,
    excluded: all.length - times.length,
  };
}

// ---------------------------------------------------------------------------
// Race trace
// ---------------------------------------------------------------------------

export interface TracePoint {
  lap: number;
  /** Seconds ahead of (positive) or behind (negative) the reference car. */
  deltaMs: Ms;
}

export interface DriverTrace {
  driver: DriverCode;
  points: TracePoint[];
}

/**
 * Cumulative race time against a virtual car running at the field's median
 * lap, so the zero line is "an average race" and divergence from it is the
 * story.
 *
 * Elapsed time comes from `lapStart + lapTime`, never a running sum. A
 * summation silently loses a lap wherever one is missing and every later value
 * inherits the error; two absolute values cannot drift.
 *
 * Lines BREAK where a driver has no classified lap rather than leaping the
 * gap, because interpolating across absent data is the chart equivalent of
 * inventing it.
 */
export function raceTrace(w: SessionWindow): {
  reference: Ms | null;
  traces: DriverTrace[];
} {
  const clean = cleanLaps(w);
  const reference = median(clean.map((l) => l.timeMs!));
  if (reference === null) return { reference: null, traces: [] };

  const byDriver = new Map<DriverCode, Lap[]>();
  for (const lap of w.laps) {
    if (lap.timeMs === null) continue;
    const list = byDriver.get(lap.driver) ?? [];
    list.push(lap);
    byDriver.set(lap.driver, list);
  }

  const traces: DriverTrace[] = [];
  for (const [driver, laps] of byDriver) {
    laps.sort((a, b) => a.lap - b.lap);
    const points: TracePoint[] = [];
    for (const lap of laps) {
      const elapsed = lap.startMs + lap.timeMs! - laps[0].startMs;
      const expected = reference * lap.lap;
      points.push({ lap: lap.lap, deltaMs: expected - elapsed });
    }
    traces.push({ driver, points });
  }
  traces.sort((a, b) => a.driver.localeCompare(b.driver));
  return { reference, traces };
}

// ---------------------------------------------------------------------------
// Stints
// ---------------------------------------------------------------------------

export interface Stint {
  driver: DriverCode;
  stint: number;
  compound: string | null;
  fromLap: number;
  toLap: number;
  laps: number;
  medianMs: Ms | null;
}

/** Tyre stints so far. Open stints are included — they are the current one. */
export function stints(w: SessionWindow, driver?: DriverCode): Stint[] {
  const groups = new Map<string, Lap[]>();
  for (const lap of w.laps) {
    if (driver !== undefined && lap.driver !== driver) continue;
    if (lap.stint === null) continue;
    const key = `${lap.driver}#${lap.stint}`;
    const list = groups.get(key) ?? [];
    list.push(lap);
    groups.set(key, list);
  }

  const out: Stint[] = [];
  for (const laps of groups.values()) {
    laps.sort((a, b) => a.lap - b.lap);
    const racing = laps.filter((l) => l.kind === 'racing' && l.timeMs !== null);
    out.push({
      driver: laps[0].driver,
      stint: laps[0].stint!,
      compound: laps[0].compound,
      fromLap: laps[0].lap,
      toLap: laps[laps.length - 1].lap,
      laps: laps.length,
      medianMs: median(racing.map((l) => l.timeMs!)),
    });
  }
  out.sort((a, b) => a.driver.localeCompare(b.driver) || a.stint - b.stint);
  return out;
}
