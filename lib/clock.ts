/**
 * THE CLOCK
 *
 * One mechanism, three origins. `CLAUDE.md` makes this a hard constraint, and
 * the reason is worth restating: hardwiring "now" to `Date.now()` turns the
 * other two modes into a rewrite rather than a configuration.
 *
 *   replay          the user owns the origin. Play, pause, scrub, change speed.
 *                   This is the whole product today.
 *   broadcast-sync  the same as replay, with the origin set to the moment the
 *                   user's own broadcast started. Already possible: it is
 *                   `start()` called at the right instant.
 *   live            the origin is the wall clock, optionally minus an offset
 *                   the viewer sets. Not built. It is a different `originMs`,
 *                   nothing more.
 *
 * The clock deliberately does NOT live in React state. Sixty updates a second
 * of a number that only the scene cares about would re-render the whole tree,
 * and the August build spent three attempts on a camera bug caused by exactly
 * that. Subscribers opt in.
 */

import type { Ms } from './types';

export type ClockMode = 'replay' | 'live';

export interface ClockState {
  /** Position on the session timeline. */
  nowMs: Ms;
  playing: boolean;
  /** 1 = real time. The default, because "the same experience" is the point. */
  speed: number;
  mode: ClockMode;
}

export type ClockListener = (state: ClockState) => void;

export interface Clock {
  getState(): ClockState;
  /** Subscribe to changes. Returns an unsubscribe function. */
  subscribe(fn: ClockListener): () => void;

  play(): void;
  pause(): void;
  toggle(): void;
  /** Jump to a position. Clamped to the session. */
  seek(ms: Ms): void;
  /** Jump to the end — the fast path to the finished, fully unlocked state. */
  seekToEnd(): void;
  setSpeed(speed: number): void;

  /** Advance the clock. Called once per animation frame by the host. */
  tick(wallMs: number): void;
  /** Stop and release. */
  dispose(): void;
}

export const SPEEDS = [1, 2, 5, 10, 30] as const;

export function createClock(durationMs: Ms): Clock {
  let nowMs = 0;
  let playing = false;
  let speed = 1;
  const mode: ClockMode = 'replay';

  /** Wall-clock time of the previous tick, or null when not running. */
  let lastWall: number | null = null;
  const listeners = new Set<ClockListener>();

  const state = (): ClockState => ({ nowMs, playing, speed, mode });

  function emit() {
    const s = state();
    for (const fn of listeners) fn(s);
  }

  function clamp(v: number): number {
    return Math.max(0, Math.min(v, durationMs));
  }

  return {
    getState: state,

    subscribe(fn) {
      listeners.add(fn);
      fn(state());
      return () => listeners.delete(fn);
    },

    play() {
      if (playing) return;
      // At the end, pressing play restarts rather than doing nothing — a dead
      // button is indistinguishable from a broken one.
      if (nowMs >= durationMs) nowMs = 0;
      playing = true;
      lastWall = null;   // the next tick establishes the baseline
      emit();
    },

    pause() {
      if (!playing) return;
      playing = false;
      lastWall = null;
      emit();
    },

    toggle() {
      if (playing) this.pause();
      else this.play();
    },

    seek(ms) {
      nowMs = clamp(ms);
      emit();
    },

    seekToEnd() {
      nowMs = durationMs;
      playing = false;
      lastWall = null;
      emit();
    },

    setSpeed(next) {
      speed = Math.max(0.1, next);
      emit();
    },

    tick(wallMs) {
      if (!playing) return;
      if (lastWall === null) {
        // First tick after play, or after the tab was hidden. Establish the
        // baseline without advancing: otherwise the clock jumps forward by
        // however long the page was backgrounded, which on a two-hour session
        // left on a sleeping tablet is the whole race.
        lastWall = wallMs;
        return;
      }
      const elapsed = wallMs - lastWall;
      lastWall = wallMs;

      // A large gap means the page was not being animated — a hidden tab, a
      // locked device. Treat it as a pause rather than a fast-forward. See
      // docs/03-device-targets.md: the device going to sleep is the most
      // likely real-world failure, and it must not silently skip the race.
      if (elapsed > 1000) return;

      nowMs = clamp(nowMs + elapsed * speed);
      if (nowMs >= durationMs) {
        nowMs = durationMs;
        playing = false;
        lastWall = null;
      }
      emit();
    },

    dispose() {
      playing = false;
      lastWall = null;
      listeners.clear();
    },
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** `1:32.104` — a lap time. Null renders as an em dash, never as zero. */
export function formatLapTime(ms: Ms | null): string {
  if (ms === null || !Number.isFinite(ms)) return '—';
  const total = ms / 1000;
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return m > 0
    ? `${m}:${s.toFixed(3).padStart(6, '0')}`
    : s.toFixed(3);
}

/** `+1.204` — a gap. Null renders as an em dash. */
export function formatGap(ms: Ms | null): string {
  if (ms === null || !Number.isFinite(ms)) return '—';
  if (ms === 0) return '—';
  return `+${(ms / 1000).toFixed(3)}`;
}

/** `18:42` — elapsed session time. */
export function formatElapsed(ms: Ms): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}
