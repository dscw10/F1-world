'use client';

/**
 * The order of the race at this moment.
 *
 * Every row is a 44 px touch target and tapping one selects that driver, which
 * is the whole driver-centric premise: the dashboard reorients around whoever
 * you pick.
 *
 * Absence is rendered as absence. A car with no completed lap has no lap time,
 * and that shows as an em dash rather than as 0:00.000, which would be the
 * fastest lap of the race.
 */

import type { Driver, DriverCode } from '@/lib/types';
import type { Standing } from '@/lib/analytics';
import { formatGap, formatLapTime } from '@/lib/clock';
import styles from './dashboard.module.css';

interface Props {
  rows: Standing[];
  drivers: Driver[];
  selected: DriverCode | null;
  onSelect: (driver: DriverCode) => void;
}

export function Standings({ rows, drivers, selected, onSelect }: Props) {
  const byCode = new Map(drivers.map((d) => [d.code, d]));

  if (rows.length === 0) {
    return (
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Order</h2>
        <p className={styles.empty}>
          The race has not started. Press play, or drag the clock forward.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.panelTitle}>
        Order
        <span className={styles.panelMeta}>Gap to leader</span>
      </h2>
      <ol className={styles.standings}>
        {rows.map((row) => {
          const d = byCode.get(row.driver);
          const isSelected = row.driver === selected;
          return (
            <li key={row.driver}>
              <button
                type="button"
                className={`${styles.standingRow} ${isSelected ? styles.standingRowSelected : ''}`}
                onClick={() => onSelect(row.driver)}
                aria-pressed={isSelected}
              >
                <span className={`${styles.pos} mono`}>{row.position}</span>
                <span
                  className={styles.teamStripe}
                  style={{ background: d?.teamColour ?? 'var(--fg-muted)' }}
                  aria-hidden="true"
                />
                <span className={styles.code}>{row.driver}</span>
                <span className={`${styles.gap} mono`}>
                  {row.position === 1
                    ? 'Leader'
                    : row.lapped
                      // A lap is not a number of seconds. Saying "+1 lap"
                      // rather than a time keeps the two kinds of gap from
                      // being read as the same quantity.
                      ? `+${row.laps === 0 ? 1 : 1} lap`
                      : formatGap(row.gapToLeaderMs)}
                </span>
                <span className={`${styles.lastLap} mono`}>
                  {formatLapTime(row.lastLapMs)}
                </span>
                <span className={styles.tyre}>
                  {row.compound ? (
                    <span
                      className={styles.compound}
                      data-compound={row.compound.toLowerCase()}
                      title={`${row.compound}, ${row.tyreLife ?? '?'} laps`}
                    >
                      {row.compound.slice(0, 1)}
                      <span className={`${styles.tyreAge} mono`}>{row.tyreLife ?? '—'}</span>
                    </span>
                  ) : (
                    <span className={styles.tyreAge}>—</span>
                  )}
                </span>
                {row.inPitCycle && <span className={styles.pitFlag}>PIT</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
