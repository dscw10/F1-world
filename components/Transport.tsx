'use client';

/**
 * The clock controls.
 *
 * This is where "it plays as though live" becomes something you can touch:
 * play, scrub, change speed, and jump to the flag — which is the fast path to
 * the finished state where the whole race unlocks
 * (docs/04-replay-and-reveal.md).
 *
 * Everything here is sized for a fingertip. The scrubber in particular is a
 * native range input rather than a custom drag handler, because the native one
 * already handles touch, pointer, keyboard and assistive technology correctly,
 * and a hand-rolled one would have to earn all of that back.
 */

import type { ClockState } from '@/lib/clock';
import { SPEEDS, formatElapsed } from '@/lib/clock';
import styles from './dashboard.module.css';

interface Props {
  state: ClockState;
  durationMs: number;
  finished: boolean;
  onToggle: () => void;
  onSeek: (ms: number) => void;
  onSeekToEnd: () => void;
  onSpeed: (speed: number) => void;
}

export function Transport({
  state, durationMs, finished, onToggle, onSeek, onSeekToEnd, onSpeed,
}: Props) {
  const pct = durationMs > 0 ? (state.nowMs / durationMs) * 100 : 0;

  return (
    <div className={styles.transport}>
      <button
        type="button"
        className={styles.playButton}
        onClick={onToggle}
        aria-label={state.playing ? 'Pause' : 'Play'}
      >
        {state.playing ? (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" fill="currentColor" />
            <rect x="14" y="5" width="4" height="14" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M7 4l13 8-13 8z" fill="currentColor" />
          </svg>
        )}
      </button>

      <span className={`${styles.elapsed} mono`}>
        {formatElapsed(state.nowMs)}
      </span>

      <div className={styles.scrubWrap}>
        <input
          type="range"
          className={styles.scrub}
          min={0}
          max={durationMs}
          step={100}
          value={state.nowMs}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label="Race position"
          aria-valuetext={formatElapsed(state.nowMs)}
          style={{ ['--pct' as string]: `${pct}%` }}
        />
      </div>

      <span className={`${styles.elapsed} ${styles.duration} mono`}>
        {formatElapsed(durationMs)}
      </span>

      <div className={styles.speeds} role="group" aria-label="Playback speed">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className={`${styles.speedButton} ${state.speed === s ? styles.speedActive : ''}`}
            onClick={() => onSpeed(s)}
            aria-pressed={state.speed === s}
          >
            {s}&times;
          </button>
        ))}
      </div>

      {/* The fast path to Dig. Without it, studying a race costs two hours —
          see docs/04 §2. Once finished, it has nothing left to do. */}
      <button
        type="button"
        className={styles.endButton}
        onClick={onSeekToEnd}
        disabled={finished}
      >
        {finished ? 'At the flag' : 'Skip to the flag'}
      </button>
    </div>
  );
}
