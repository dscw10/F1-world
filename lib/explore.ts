/**
 * THE EXPLORER
 *
 * The viewer builds their own query instead of consuming a fixed view: pick
 * something to measure and something to measure it against, and the interface
 * either answers or explains why it can't.
 *
 * Several rules here are carried forward from the August build, each recorded
 * after it went wrong:
 *
 *   - An incompatible pairing is offered and REFUSED WITH A REASON, not
 *     disabled. Disabling a control teaches nothing; a refusal in race terms
 *     teaches the data model.
 *   - Aggregation is part of the query and is shown on the axis, never chosen
 *     silently. "The median lap on softs" and "the best lap on softs" say
 *     different things.
 *   - `best` is not `minimum`. For a lap time the best value is the smallest;
 *     for a stint length it is the largest. Assuming minimum reported the
 *     longest battle of a race as the shortest.
 *   - Ordinal dimensions keep their own order. Sorting compounds by lap time
 *     hides that soft-medium-hard is a scale.
 *   - An axis must not claim work that never happened: where there is one
 *     observation per point, nothing is aggregated and the axis must not say
 *     it was.
 */

import type { DriverCode, Lap, Ms } from './types';
import type { SessionWindow } from './window';
import { median } from './analytics';

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export type DimensionId = 'driver' | 'compound' | 'stint' | 'lap' | 'lapKind';
export type MeasureId = 'lapTime' | 'tyreLife' | 'position' | 'sector1' | 'sector2' | 'sector3';
export type AggregationId = 'median' | 'best' | 'mean' | 'count';

export interface Dimension {
  id: DimensionId;
  label: string;
  /** An ordinal dimension has a meaningful order of its own. */
  ordinal: boolean;
  /** Explicit order for ordinal dimensions, lowest first. */
  order?: string[];
  description: string;
}

export interface Measure {
  id: MeasureId;
  label: string;
  unit: 'time' | 'laps' | 'position';
  /** Which direction is better. This is why `best` is not `minimum`. */
  betterIs: 'lower' | 'higher';
  description: string;
}

export const DIMENSIONS: Dimension[] = [
  { id: 'driver', label: 'Driver', ordinal: false,
    description: 'One row per driver.' },
  { id: 'compound', label: 'Tyre compound', ordinal: true,
    order: ['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'],
    description: 'Soft to hard is a scale, so it keeps its own order.' },
  { id: 'stint', label: 'Stint', ordinal: true,
    description: 'First stint, second stint, and so on.' },
  { id: 'lap', label: 'Lap number', ordinal: true,
    description: 'Across the race, in order.' },
  { id: 'lapKind', label: 'Lap type', ordinal: false,
    description: 'Racing, pit in, pit out, not green.' },
];

export const MEASURES: Measure[] = [
  { id: 'lapTime', label: 'Lap time', unit: 'time', betterIs: 'lower',
    description: 'How long the lap took.' },
  { id: 'sector1', label: 'Sector 1', unit: 'time', betterIs: 'lower',
    description: 'First sector time.' },
  { id: 'sector2', label: 'Sector 2', unit: 'time', betterIs: 'lower',
    description: 'Second sector time.' },
  { id: 'sector3', label: 'Sector 3', unit: 'time', betterIs: 'lower',
    description: 'Third sector time.' },
  { id: 'tyreLife', label: 'Tyre age', unit: 'laps', betterIs: 'higher',
    description: 'Laps on this set of tyres.' },
  { id: 'position', label: 'Position', unit: 'position', betterIs: 'lower',
    description: 'Classified position at the end of the lap.' },
];

export const AGGREGATIONS: { id: AggregationId; label: string }[] = [
  { id: 'median', label: 'Median' },
  { id: 'best', label: 'Best' },
  { id: 'mean', label: 'Mean' },
  { id: 'count', label: 'Count' },
];

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export interface Query {
  dimension: DimensionId;
  measure: MeasureId;
  aggregation: AggregationId;
  /** Restrict to one driver. Null means the whole field. */
  driver: DriverCode | null;
  /** Exclude pit, non-green and inaccurate laps. Almost always wanted. */
  cleanOnly: boolean;
}

export interface QueryPoint {
  key: string;
  label: string;
  value: number | null;
  /** How many observations went into this point. */
  n: number;
}

export type QueryResult =
  | {
      status: 'ok';
      points: QueryPoint[];
      /** What the axis should say. Never claims work that did not happen. */
      axisLabel: string;
      unit: Measure['unit'];
      /** True when every point came from exactly one observation. */
      oneObservationEach: boolean;
      excluded: number;
    }
  | {
      status: 'refused';
      /** Why, in race terms. Never "invalid selection". */
      reason: string;
    };

// ---------------------------------------------------------------------------
// Compatibility
// ---------------------------------------------------------------------------

/**
 * Why a pairing cannot be answered, or null when it can.
 *
 * The August build found an allowed pairing that silently rendered nothing.
 * A refusal has to be a first-class result, not an empty chart.
 */
export function refusalFor(q: Query): string | null {
  if (q.measure === 'position' && q.dimension === 'compound') {
    return 'Position is where a driver was, and a compound is what they were '
      + 'on. Averaging positions across a tyre choice mixes up drivers who '
      + 'were never racing each other.';
  }
  if (q.measure === 'position' && q.aggregation === 'best') {
    return 'The best position is just the highest a driver got, which the '
      + 'order already tells you. Try median position to see where they '
      + 'actually raced.';
  }
  if (q.measure === 'tyreLife' && q.dimension === 'lap') {
    return 'Tyre age against lap number is a sawtooth that resets at every '
      + 'pit stop. Group by stint instead and it becomes readable.';
  }
  if (q.aggregation === 'count' && q.measure !== 'lapTime') {
    return 'Counting only makes sense over laps. Pick lap time, or a different '
      + 'summary.';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

function valueOf(lap: Lap, measure: MeasureId): number | null {
  switch (measure) {
    case 'lapTime': return lap.timeMs;
    case 'sector1': return lap.sectors[0];
    case 'sector2': return lap.sectors[1];
    case 'sector3': return lap.sectors[2];
    case 'tyreLife': return lap.tyreLife;
    case 'position': return lap.position;
  }
}

function keyOf(lap: Lap, dimension: DimensionId): string | null {
  switch (dimension) {
    case 'driver': return lap.driver;
    case 'compound': return lap.compound;
    case 'stint': return lap.stint === null ? null : String(lap.stint);
    case 'lap': return String(lap.lap);
    case 'lapKind': return lap.kind;
  }
}

function aggregate(
  values: number[], agg: AggregationId, measure: Measure,
): number | null {
  if (values.length === 0) return null;
  switch (agg) {
    case 'median': return median(values);
    case 'mean': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'count': return values.length;
    case 'best':
      // `best` is not `minimum`. Which end is best depends on what is being
      // measured, and the measure declares it.
      return measure.betterIs === 'lower'
        ? Math.min(...values)
        : Math.max(...values);
  }
}

export function runQuery(w: SessionWindow, q: Query): QueryResult {
  const refusal = refusalFor(q);
  if (refusal) return { status: 'refused', reason: refusal };

  const measure = MEASURES.find((m) => m.id === q.measure)!;
  const dimension = DIMENSIONS.find((d) => d.id === q.dimension)!;

  let considered = w.laps as Lap[];
  if (q.driver) considered = considered.filter((l) => l.driver === q.driver);
  const beforeClean = considered.length;
  if (q.cleanOnly) considered = considered.filter((l) => l.kind === 'racing');

  const groups = new Map<string, number[]>();
  for (const lap of considered) {
    const key = keyOf(lap, q.dimension);
    const value = valueOf(lap, q.measure);
    // Absence is not zero: a lap with no value contributes nothing rather than
    // dragging an average toward zero.
    if (key === null || value === null) continue;
    const list = groups.get(key) ?? [];
    list.push(value);
    groups.set(key, list);
  }

  if (groups.size === 0) {
    return {
      status: 'refused',
      reason: q.cleanOnly
        ? 'Nothing has happened yet that this could measure. Let the race run '
          + 'further, or turn off "clean laps only" to include pit and '
          + 'safety-car laps.'
        : 'Nothing has happened yet that this could measure. Let the race run '
          + 'a little further.',
    };
  }

  let points: QueryPoint[] = [...groups.entries()].map(([key, values]) => ({
    key,
    label: key,
    value: aggregate(values, q.aggregation, measure),
    n: values.length,
  }));

  // Ordinal dimensions keep their own order; everything else sorts by value,
  // because for those the ordering IS the finding.
  if (dimension.ordinal) {
    if (dimension.order) {
      const rank = new Map(dimension.order.map((v, i) => [v, i]));
      points.sort((a, b) =>
        (rank.get(a.key) ?? 999) - (rank.get(b.key) ?? 999));
    } else {
      points.sort((a, b) => Number(a.key) - Number(b.key));
    }
  } else {
    points.sort((a, b) => {
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      return measure.betterIs === 'lower' ? a.value - b.value : b.value - a.value;
    });
  }

  // An axis must not claim work that never happened. Where each group holds a
  // single observation, nothing was aggregated and the label must not say it
  // was.
  const oneObservationEach = points.every((p) => p.n === 1);
  const axisLabel = q.aggregation === 'count'
    ? 'Laps counted'
    : oneObservationEach
      ? measure.label
      : `${AGGREGATIONS.find((a) => a.id === q.aggregation)!.label} ${measure.label.toLowerCase()}`;

  return {
    status: 'ok',
    points,
    axisLabel,
    unit: q.aggregation === 'count' ? 'laps' : measure.unit,
    oneObservationEach,
    excluded: beforeClean - considered.length,
  };
}
