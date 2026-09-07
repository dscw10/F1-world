'use client';

/**
 * The dashboard.
 *
 * Owns the clock and derives a window from it on every animation frame. The
 * window is the only thing handed to anything else, so nothing below this
 * point can see past the clock.
 *
 * ---------------------------------------------------------------------------
 * WHY THE CLOCK IS NOT REACT STATE
 * ---------------------------------------------------------------------------
 * The clock advances up to sixty times a second. Putting that in `useState`
 * re-renders the whole tree at 60 Hz for a number most of the tree does not
 * care about. Worse, it makes every effect keyed on it fire sixty times a
 * second — and the August build spent three attempts on a camera bug caused by
 * exactly that, before recording the general principle: in React an effect
 * fires because something *rendered*, not because something *happened*.
 *
 * So the clock lives outside React, and this component subscribes to it and
 * re-renders at a rate a person can actually read: the scene needs 60 fps, a
 * standings table does not.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SessionData, DriverCode } from '@/lib/types';
import type { ClockState } from '@/lib/clock';
import { createClock } from '@/lib/clock';
import { buildIndex, windowAt } from '@/lib/window';
import { standings, pace, stints } from '@/lib/analytics';
import { TrackMap } from './TrackMap';
import { Standings } from './Standings';
import { Transport } from './Transport';
import { Readout } from './Readout';
import { Explorer } from './Explorer';
import styles from './dashboard.module.css';

/** How often the panels refresh. The map follows the clock; text does not
 *  need to, and updating a table sixty times a second is unreadable anyway. */
const PANEL_HZ = 10;

export function Dashboard({ data }: { data: SessionData }) {
  const index = useMemo(() => buildIndex(data), [data]);
  const duration = data.manifest.durationMs;

  const clock = useMemo(() => createClock(duration), [duration]);
  const [clockState, setClockState] = useState<ClockState>(() => clock.getState());
  const [nowMs, setNowMs] = useState(0);
  const [selected, setSelected] = useState<DriverCode | null>(null);

  // Drive the clock from the animation loop, and throttle what React sees.
  const lastPanel = useRef(0);
  useEffect(() => {
    let raf = 0;
    const loop = (t: number) => {
      clock.tick(t);
      const s = clock.getState();
      // The map wants every frame; the panels do not.
      if (t - lastPanel.current > 1000 / PANEL_HZ) {
        lastPanel.current = t;
        setNowMs(s.nowMs);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [clock]);

  useEffect(() => clock.subscribe(setClockState), [clock]);

  // Stop animating when the page is not visible. A two-hour session on a
  // propped-up tablet will be backgrounded, and rendering to a hidden tab is
  // pure battery and heat. See docs/03-device-targets.md.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && clock.getState().playing) clock.pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [clock]);

  useEffect(() => () => clock.dispose(), [clock]);

  const window_ = useMemo(() => windowAt(index, nowMs), [index, nowMs]);
  const rows = useMemo(() => standings(window_), [window_]);
  const cars = useMemo(() => window_.cars(), [window_]);

  // Default to the leader so the first Glance has something in it, but never
  // override a choice the viewer has made.
  useEffect(() => {
    if (selected === null && rows.length > 0) setSelected(rows[0].driver);
  }, [rows, selected]);

  const selectedRow = rows.find((r) => r.driver === selected) ?? null;
  const selectedPace = useMemo(
    () => (selected ? pace(window_, selected) : null),
    [window_, selected],
  );
  const selectedStints = useMemo(
    () => (selected ? stints(window_, selected) : []),
    [window_, selected],
  );

  const onSelect = useCallback((d: DriverCode) => setSelected(d), []);

  const synthetic = data.manifest.provenance.synthetic;
  const verificationFailed = !data.manifest.verification.passed;

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <div className={styles.identity}>
          <h1 className={styles.eventName}>{data.manifest.eventName}</h1>
          <p className={styles.eventMeta}>
            {data.manifest.circuitName} · {data.manifest.year}
          </p>
        </div>

        {/* Provenance at the point of use. A generated race must never be
            mistakable for a measured one. */}
        {synthetic && (
          <p className={styles.syntheticBadge} role="status">
            <strong>Invented data.</strong> Every figure on this page was
            generated to develop the interface. Nothing here happened.
          </p>
        )}
        {!synthetic && verificationFailed && (
          <p className={styles.warnBadge} role="status">
            <strong>This export failed its own checks.</strong> Some figures may
            be wrong; see the manifest.
          </p>
        )}
      </header>

      <main className={styles.grid}>
        <section className={styles.mapPanel} aria-label="Circuit">
          <TrackMap
            circuit={data.circuit}
            cars={cars}
            drivers={data.manifest.drivers}
            selected={selected}
            onSelect={onSelect}
          />
          <Readout
            row={selectedRow}
            paceSummary={selectedPace}
            stints={selectedStints}
            car={selected ? window_.car(selected) : null}
            driver={data.manifest.drivers.find((d) => d.code === selected) ?? null}
            finished={window_.finished}
          />
        </section>

        <aside className={styles.sidePanel}>
          <Standings
            rows={rows}
            drivers={data.manifest.drivers}
            selected={selected}
            onSelect={onSelect}
          />
        </aside>
      </main>

      {/* The Dig moment. While the race is playing, "the median lap on hards"
          has an answer that changes under you; at the flag it is settled. This
          is the reveal rule from docs/04 made visible: reaching the end
          unlocks the whole race. */}
      {window_.finished && (
        <Explorer window_={window_} manifest={data.manifest} selected={selected} />
      )}

      <footer className={styles.bottomBar}>
        <Transport
          state={clockState}
          durationMs={duration}
          finished={window_.finished}
          onToggle={() => clock.toggle()}
          onSeek={(ms) => { clock.seek(ms); setNowMs(ms); }}
          onSeekToEnd={() => { clock.seekToEnd(); setNowMs(duration); }}
          onSpeed={(s) => clock.setSpeed(s)}
        />
      </footer>
    </div>
  );
}
