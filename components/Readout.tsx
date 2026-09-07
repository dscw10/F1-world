'use client';

/**
 * The permanent value display.
 *
 * This exists because the primary device has no pointer. A tooltip has no good
 * touch equivalent, so instead of summoning values on hover the reading lives
 * in a fixed place and updates on tap — and it holds its space when there is
 * nothing selected, so nothing reflows underneath the finger that just tapped.
 * See docs/03-device-targets.md §1.
 *
 * Every figure declares whether it is measured or modelled at the point of
 * use, not in a footnote.
 */

import type { Driver } from '@/lib/types';
import type { PaceSummary, Standing, Stint } from '@/lib/analytics';
import type { CarState } from '@/lib/window';
import { formatGap, formatLapTime } from '@/lib/clock';
import styles from './dashboard.module.css';

interface Props {
  row: Standing | null;
  paceSummary: PaceSummary | null;
  stints: Stint[];
  car: CarState | null;
  driver: Driver | null;
  finished: boolean;
}

function Figure({
  label, value, provenance = 'measured', note,
}: {
  label: string;
  value: string;
  provenance?: 'measured' | 'modelled';
  note?: string;
}) {
  return (
    <div className={styles.figure}>
      <span className={styles.figureLabel}>
        {label}
        <span
          className={styles.provenanceDotSmall}
          data-provenance={provenance}
          title={provenance === 'measured'
            ? 'Measured — straight from the timing data'
            : 'Modelled — computed, with assumptions'}
          aria-label={provenance}
        />
      </span>
      <span className={`${styles.figureValue} mono`}>{value}</span>
      {note && <span className={styles.figureNote}>{note}</span>}
    </div>
  );
}

export function Readout({ row, paceSummary, stints, car, driver, finished }: Props) {
  return (
    <div className={styles.readout}>
      <div className={styles.readoutHead}>
        {driver ? (
          <>
            <span
              className={styles.readoutStripe}
              style={{ background: driver.teamColour }}
              aria-hidden="true"
            />
            <span className={styles.readoutName}>{driver.fullName}</span>
            <span className={styles.readoutTeam}>{driver.team}</span>
          </>
        ) : (
          <span className={styles.readoutName}>Select a driver</span>
        )}
      </div>

      <div className={styles.figures}>
        <Figure
          label="Position"
          value={row ? `P${row.position}` : '—'}
        />
        <Figure
          label="Gap to leader"
          value={row?.position === 1 ? 'Leader' : formatGap(row?.gapToLeaderMs ?? null)}
        />
        <Figure
          label="Last lap"
          value={formatLapTime(row?.lastLapMs ?? null)}
        />
        <Figure
          label="Speed"
          value={car ? `${Math.round(car.speed)} km/h` : '—'}
        />
        <Figure
          label="Median pace"
          value={formatLapTime(paceSummary?.medianMs ?? null)}
          provenance="modelled"
          note={paceSummary && paceSummary.counted > 0
            ? `${paceSummary.counted} clean of ${paceSummary.counted + paceSummary.excluded}`
            : undefined}
        />
        <Figure
          label="Best so far"
          value={formatLapTime(paceSummary?.bestMs ?? null)}
          note={finished ? 'final' : 'so far'}
        />
        <Figure
          label="Tyre"
          value={row?.compound ? `${row.compound}` : '—'}
          note={row?.tyreLife !== null && row?.tyreLife !== undefined
            ? `${row.tyreLife} laps` : undefined}
        />
        <Figure
          label="Stints"
          value={stints.length ? String(stints.length) : '—'}
          note={stints.length
            ? stints.map((s) => `${s.laps}`).join(' + ')
            : undefined}
        />
      </div>
    </div>
  );
}
