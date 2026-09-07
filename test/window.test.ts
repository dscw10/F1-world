/**
 * Tests for the windowing primitive and the clock.
 *
 * WHAT THESE PROVE: that the window never reveals the future, that it grows
 * monotonically, that interpolation stays inside the measured data, and that
 * the clock does not skip time when a device sleeps. That is plumbing, and
 * plumbing is exactly what the synthetic fixture can honestly test.
 *
 * WHAT THESE DO NOT PROVE: that any analytic is correct. The fixture was
 * generated from a model of a race, so an analytic checked against it is only
 * being asked whether it agrees with that model. See pipeline/make_fixture.py.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

import type { SessionData } from '../lib/types';
import { buildIndex, windowAt, carStateAt } from '../lib/window';
import { standings, pace, raceTrace, stints, median, mad } from '../lib/analytics';
import { createClock, formatLapTime, formatGap } from '../lib/clock';

const DIR = join(process.cwd(), 'public', 'data', 'fixture');
const read = (f: string) => JSON.parse(readFileSync(join(DIR, f), 'utf8'));

const data: SessionData = {
  manifest: read('manifest.json'),
  circuit: read('circuit.json'),
  laps: read('laps.json'),
  frames: read('frames.json'),
};

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL ${name}`);
    console.log(`       ${(err as Error).message.split('\n')[0]}`);
  }
}

console.log('\nwindow');

const index = buildIndex(data);
const duration = data.manifest.durationMs;

test('index sorts laps by completion, not by start', () => {
  const c = index.completions;
  for (let i = 1; i < c.length; i++) assert.ok(c[i] >= c[i - 1]);
});

test('index excludes laps with no time — a lap without a time is not a fact', () => {
  assert.ok(index.lapsByCompletion.every((l) => l.timeMs !== null));
});

test('a window never contains a lap completed after the clock', () => {
  for (const frac of [0, 0.1, 0.25, 0.5, 0.75, 0.99, 1]) {
    const now = Math.floor(duration * frac);
    const w = windowAt(index, now);
    for (const lap of w.laps) {
      assert.ok(lap.startMs + lap.timeMs! <= now,
        `lap ${lap.driver} #${lap.lap} leaked at t=${now}`);
    }
  }
});

test('windows grow monotonically — later never contains fewer laps', () => {
  let prev = -1;
  for (let f = 0; f <= 1.0001; f += 0.05) {
    const n = windowAt(index, Math.floor(duration * f)).laps.length;
    assert.ok(n >= prev, `shrank from ${prev} to ${n}`);
    prev = n;
  }
});

test('the window at t=0 is empty — no race has happened yet', () => {
  assert.equal(windowAt(index, 0).laps.length, 0);
});

test('the window at the end holds every completed lap', () => {
  const w = windowAt(index, duration);
  assert.equal(w.laps.length, index.lapsByCompletion.length);
  assert.equal(w.finished, true);
});

test('seeking past the end clamps rather than overflowing', () => {
  const w = windowAt(index, duration * 10);
  assert.equal(w.nowMs, duration);
});

test('negative time clamps to zero', () => {
  assert.equal(windowAt(index, -50_000).nowMs, 0);
});

console.log('\ninterpolation');

const frames = data.frames[0];

test('interpolated position stays within the measured bounds', () => {
  const xs = frames.x, ys = frames.y;
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  // A spline can overshoot; the point of Catmull-Rom is that it does not run
  // away. Allow a small margin, but nothing like a car leaving the circuit.
  const mx = (maxX - minX) * 0.05;
  const my = (maxY - minY) * 0.05;
  for (let i = 0; i < 400; i++) {
    const t = frames.t[0] + (frames.t[frames.t.length - 1] - frames.t[0]) * (i / 400);
    const s = carStateAt(frames, t)!;
    assert.ok(s.x >= minX - mx && s.x <= maxX + mx, `x ran away: ${s.x}`);
    assert.ok(s.y >= minY - my && s.y <= maxY + my, `y ran away: ${s.y}`);
  }
});

test('interpolation passes exactly through measured samples', () => {
  for (const i of [0, 5, 100, frames.t.length - 1]) {
    const s = carStateAt(frames, frames.t[i])!;
    assert.ok(Math.abs(s.x - frames.x[i]) < 0.01, `sample ${i} x drifted`);
    assert.ok(Math.abs(s.y - frames.y[i]) < 0.01, `sample ${i} y drifted`);
  }
});

test('a car outside its sample range is absent, not frozen at the origin', () => {
  assert.equal(carStateAt(frames, frames.t[0] - 1), null);
  assert.equal(carStateAt(frames, frames.t[frames.t.length - 1] + 1), null);
});

test('brake stays discrete — never a half-pressed pedal', () => {
  for (let i = 0; i < 200; i++) {
    const t = frames.t[0] + (frames.t[frames.t.length - 1] - frames.t[0]) * (i / 200);
    const s = carStateAt(frames, t)!;
    assert.ok(s.brake === 0 || s.brake === 1, `brake was ${s.brake}`);
  }
});

console.log('\nanalytics plumbing');

test('standings are a contiguous 1..N with no gaps', () => {
  const s = standings(windowAt(index, duration));
  assert.deepEqual(s.map((r) => r.position), s.map((_, i) => i + 1));
});

test('the leader has no gap to the leader', () => {
  const s = standings(windowAt(index, duration));
  assert.equal(s[0].gapToLeaderMs, null);
  assert.equal(s[0].gapToAheadMs, null);
});

test('a lapped car reports no gap — a lap is not a number of seconds', () => {
  const s = standings(windowAt(index, duration));
  for (const row of s) {
    if (row.lapped) assert.equal(row.gapToLeaderMs, null);
  }
});

test('standings show the grid at t=0 rather than nothing', () => {
  // Ranking by distance covered means the field is ordered from the first
  // instant. Ranking by completed laps would leave the Glance moment with an
  // empty panel for the whole of lap one.
  const s = standings(windowAt(index, 0));
  assert.ok(s.length > 0, 'no order at the start');
});

test('the classification survives the chequered flag', () => {
  // A finished car has no telemetry sample any more, so reading the order from
  // live positions alone made every row vanish at exactly the moment the
  // result matters. Progress and on-track position are different questions.
  const w = windowAt(index, duration);
  const s = standings(w);
  assert.equal(s.length, data.manifest.drivers.length,
    `only ${s.length} classified at the flag`);
  assert.equal(w.cars().length, 0,
    'the fixture ends with no car on track — that is what made this fail');
});

test('the running order changes between lap boundaries, not only at them', () => {
  // The point of ranking by distance: an overtake shows when it happens.
  const seen = new Set<string>();
  for (let f = 0.05; f < 1; f += 0.02) {
    seen.add(standings(windowAt(index, Math.floor(duration * f)))
      .map((r) => r.driver).join(','));
  }
  assert.ok(seen.size > 3,
    `the order only took ${seen.size} distinct states across the race`);
});

test('pace counts what it excluded, so the interface can say so', () => {
  const p = pace(windowAt(index, duration), data.manifest.drivers[0].code);
  assert.ok(p.counted > 0);
  assert.ok(p.excluded > 0, 'the fixture has pit laps; they must be excluded');
  assert.equal(p.counted + p.excluded,
    windowAt(index, duration).laps.filter(
      (l) => l.driver === data.manifest.drivers[0].code).length);
});

test('median and MAD handle the empty case without inventing zero', () => {
  assert.equal(median([]), null);
  assert.equal(mad([]), null);
  assert.equal(median([3, 1, 2]), 2);
});

test('MAD is not inflated by an outlier the way a deviation would be', () => {
  const tight = [100, 101, 99, 100, 102];
  const withOutlier = [...tight, 400];
  const a = mad(tight)!;
  const b = mad(withOutlier)!;
  assert.ok(b < a * 3, `MAD moved from ${a} to ${b} — not robust`);
});

test('the race trace breaks rather than leaping an absent lap', () => {
  const { traces } = raceTrace(windowAt(index, duration));
  assert.ok(traces.length > 0);
  for (const t of traces) {
    const laps = t.points.map((p) => p.lap);
    assert.deepEqual(laps, [...laps].sort((a, b) => a - b));
  }
});

test('stints are found and ordered', () => {
  const s = stints(windowAt(index, duration), data.manifest.drivers[0].code);
  assert.ok(s.length >= 2, 'the fixture pits once, so there are two stints');
  assert.ok(s[0].fromLap < s[1].fromLap);
});

console.log('\nclock');

test('a new clock starts at zero and paused', () => {
  const c = createClock(duration);
  assert.equal(c.getState().nowMs, 0);
  assert.equal(c.getState().playing, false);
});

test('the first tick after play establishes a baseline without jumping', () => {
  const c = createClock(duration);
  c.play();
  c.tick(1_000_000);
  assert.equal(c.getState().nowMs, 0, 'the clock jumped on its first tick');
});

test('a long gap is treated as a pause, not a fast-forward', () => {
  // The tablet slept for ten minutes. The race must not skip ten minutes.
  const c = createClock(duration);
  c.play();
  c.tick(0);
  c.tick(600_000);
  assert.equal(c.getState().nowMs, 0, 'a sleeping device skipped the race');
});

test('speed multiplies elapsed time', () => {
  const c = createClock(duration);
  c.play();
  c.setSpeed(10);
  c.tick(0);
  c.tick(100);
  assert.equal(c.getState().nowMs, 1000);
});

test('the clock stops at the end rather than running past it', () => {
  const c = createClock(10_000);
  c.seek(9_900);
  c.play();
  c.tick(0);
  c.tick(500);
  assert.equal(c.getState().nowMs, 10_000);
  assert.equal(c.getState().playing, false);
});

test('play at the end restarts — a dead button reads as a broken one', () => {
  const c = createClock(10_000);
  c.seekToEnd();
  c.play();
  assert.equal(c.getState().nowMs, 0);
  assert.equal(c.getState().playing, true);
});

test('seekToEnd reaches the finished state in one action', () => {
  const c = createClock(duration);
  c.seekToEnd();
  assert.equal(windowAt(index, c.getState().nowMs).finished, true);
});

test('subscribers are notified immediately on subscribe', () => {
  const c = createClock(duration);
  let seen = false;
  c.subscribe(() => { seen = true; });
  assert.equal(seen, true);
});

console.log('\nformatting');

test('a null time renders as an em dash, never as zero', () => {
  assert.equal(formatLapTime(null), '—');
  assert.equal(formatGap(null), '—');
});

test('lap times format as m:ss.mmm', () => {
  assert.equal(formatLapTime(92_104), '1:32.104');
  assert.equal(formatLapTime(45_500), '45.500');
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
