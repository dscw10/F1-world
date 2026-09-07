'use client';

/**
 * The explorer — the "play data engineer" surface.
 *
 * Belongs to the Dig moment, so it only opens once the race is finished. While
 * a race is playing, the question "what was the median lap on hards" has an
 * answer that changes under you; at the flag it is settled.
 *
 * The chart is hand-drawn SVG. No chart library: this is a set of bars, two
 * axes and a baseline, and a dependency would cost more than it saves and
 * would fight the token set for control of colour and type.
 */

import { useMemo, useState } from 'react';
import type { DriverCode, Manifest } from '@/lib/types';
import type { SessionWindow } from '@/lib/window';
import {
  AGGREGATIONS, DIMENSIONS, MEASURES,
  runQuery, type Query,
} from '@/lib/explore';
import { formatLapTime } from '@/lib/clock';
import styles from './explorer.module.css';

interface Props {
  window_: SessionWindow;
  manifest: Manifest;
  selected: DriverCode | null;
}

function formatValue(value: number, unit: string): string {
  if (unit === 'time') return formatLapTime(value);
  if (unit === 'position') return `P${value.toFixed(0)}`;
  return value.toFixed(value % 1 === 0 ? 0 : 1);
}

export function Explorer({ window_, manifest, selected }: Props) {
  const [query, setQuery] = useState<Query>({
    dimension: 'driver',
    measure: 'lapTime',
    aggregation: 'median',
    driver: null,
    cleanOnly: true,
  });

  const result = useMemo(() => runQuery(window_, query), [window_, query]);
  const set = <K extends keyof Query>(k: K, v: Query[K]) =>
    setQuery((q) => ({ ...q, [k]: v }));

  const colourOf = useMemo(() => {
    const m = new Map(manifest.drivers.map((d) => [d.code, d.teamColour]));
    return (key: string) => m.get(key) ?? 'var(--accent)';
  }, [manifest]);

  return (
    <section className={styles.explorer} aria-label="Explore the data">
      <header className={styles.head}>
        <h2 className={styles.title}>Ask your own question</h2>
        <p className={styles.subtitle}>
          Pick something to measure and something to measure it against. If the
          two do not go together, it will say why.
        </p>
      </header>

      <div className={styles.controls}>
        <label className={styles.control}>
          <span className={styles.controlLabel}>Measure</span>
          <select
            value={query.measure}
            onChange={(e) => set('measure', e.target.value as Query['measure'])}
          >
            {MEASURES.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </label>

        <label className={styles.control}>
          <span className={styles.controlLabel}>Summarised by</span>
          <select
            value={query.aggregation}
            onChange={(e) => set('aggregation', e.target.value as Query['aggregation'])}
          >
            {AGGREGATIONS.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </label>

        <label className={styles.control}>
          <span className={styles.controlLabel}>Grouped by</span>
          <select
            value={query.dimension}
            onChange={(e) => set('dimension', e.target.value as Query['dimension'])}
          >
            {DIMENSIONS.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </label>

        <label className={styles.control}>
          <span className={styles.controlLabel}>Driver</span>
          <select
            value={query.driver ?? ''}
            onChange={(e) => set('driver', e.target.value || null)}
          >
            <option value="">Whole field</option>
            {manifest.drivers.map((d) => (
              <option key={d.code} value={d.code}>{d.code}</option>
            ))}
          </select>
        </label>

        <label className={`${styles.control} ${styles.checkControl}`}>
          <input
            type="checkbox"
            checked={query.cleanOnly}
            onChange={(e) => set('cleanOnly', e.target.checked)}
          />
          <span>Clean laps only</span>
        </label>

        {selected && query.driver !== selected && (
          <button
            type="button"
            className={styles.quickButton}
            onClick={() => set('driver', selected)}
          >
            Just {selected}
          </button>
        )}
      </div>

      {result.status === 'refused' ? (
        // A refusal, not a disabled control and not an empty chart. It says
        // what is wrong in race terms and suggests what would work.
        <div className={styles.refusal} role="status">
          <strong>That pairing will not answer.</strong>
          <p>{result.reason}</p>
        </div>
      ) : (
        <Chart
          points={result.points}
          axisLabel={result.axisLabel}
          unit={result.unit}
          colourOf={query.dimension === 'driver' ? colourOf : () => 'var(--accent)'}
          excluded={result.excluded}
          oneObservationEach={result.oneObservationEach}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

function Chart({
  points, axisLabel, unit, colourOf, excluded, oneObservationEach,
}: {
  points: { key: string; label: string; value: number | null; n: number }[];
  axisLabel: string;
  unit: string;
  colourOf: (key: string) => string;
  excluded: number;
  oneObservationEach: boolean;
}) {
  const withValues = points.filter((p) => p.value !== null);
  const max = Math.max(...withValues.map((p) => p.value!), 0);
  const min = Math.min(...withValues.map((p) => p.value!), max);

  // Bars start at zero — a bar measured from a non-zero baseline exaggerates
  // every difference. But a lap-time axis from zero wastes 99% of the plot,
  // so for times the bars are drawn from a floor and SAID to be, rather than
  // quietly cropped.
  const zeroBased = unit !== 'time';
  const floor = zeroBased ? 0 : min - (max - min) * 0.15;
  const span = max - floor || 1;

  return (
    <div className={styles.chart}>
      <div className={styles.chartHead}>
        <span className={styles.axisLabel}>{axisLabel}</span>
        <span className={styles.chartMeta}>
          {oneObservationEach && 'one lap each · '}
          {excluded > 0 && `${excluded} laps excluded`}
        </span>
      </div>

      <ol className={styles.bars}>
        {points.map((p) => {
          const pct = p.value === null ? 0 : ((p.value - floor) / span) * 100;
          return (
            <li key={p.key} className={styles.barRow}>
              <span className={styles.barLabel}>{p.label}</span>
              <span className={styles.barTrack}>
                {p.value === null ? (
                  // Absence is not zero. A missing value is stated, not drawn
                  // as a bar of length nothing.
                  <span className={styles.barAbsent}>not measured</span>
                ) : (
                  <span
                    className={styles.bar}
                    style={{ width: `${Math.max(pct, 1)}%`, background: colourOf(p.key) }}
                  />
                )}
              </span>
              <span className={`${styles.barValue} mono`}>
                {p.value === null ? '—' : formatValue(p.value, unit)}
              </span>
              <span className={styles.barN}>{p.n === 1 ? '' : `${p.n} laps`}</span>
            </li>
          );
        })}
      </ol>

      {!zeroBased && (
        <p className={styles.axisNote}>
          Bars start at {formatValue(floor, unit)}, not zero — a lap-time axis
          from zero would leave every bar the same length.
        </p>
      )}
    </div>
  );
}
