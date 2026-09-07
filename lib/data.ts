/**
 * Loading a session in the browser.
 *
 * The artefacts are static files under /public/data/<id>/, so this is four
 * fetches and no server. That is the whole point of the archive-first decision
 * in context.md §5.0.
 */

import { SCHEMA_VERSION, type SessionData } from './types';

/**
 * GitHub Pages serves this repo from a sub-path, and `fetch` is NOT rewritten
 * by Next the way `next/link` and asset URLs are. A bare `/data/...` resolves
 * against the domain root, 404s, and the page renders an empty dashboard with
 * no error — which reads as "there is no data" rather than "the path is
 * wrong". Same class of failure as the CSS one in docs/05.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export class SessionLoadError extends Error {
  constructor(message: string, readonly cause_?: unknown) {
    super(message);
    this.name = 'SessionLoadError';
  }
}

async function getJson<T>(path: string): Promise<T> {
  const url = `${BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new SessionLoadError(`Could not reach ${url}`, err);
  }
  if (!res.ok) {
    throw new SessionLoadError(`${url} returned ${res.status}`);
  }
  try {
    return (await res.json()) as T;
  } catch (err) {
    throw new SessionLoadError(`${url} was not valid JSON`, err);
  }
}

/**
 * Load one session.
 *
 * Everything is fetched in parallel — they are independent files and the
 * largest is the only one that matters for perceived speed.
 */
export async function loadSession(sessionId: string): Promise<SessionData> {
  const dir = `/data/${sessionId}`;
  const [manifest, circuit, laps, frames] = await Promise.all([
    getJson<SessionData['manifest']>(`${dir}/manifest.json`),
    getJson<SessionData['circuit']>(`${dir}/circuit.json`),
    getJson<SessionData['laps']>(`${dir}/laps.json`),
    getJson<SessionData['frames']>(`${dir}/frames.json`),
  ]);

  // A schema mismatch means the pipeline and the app disagree about what the
  // fields mean. Carrying on would produce plausible wrong numbers, which is
  // the failure mode this project keeps recording. Refuse instead.
  if (manifest.schemaVersion !== SCHEMA_VERSION) {
    throw new SessionLoadError(
      `This session was exported with schema v${manifest.schemaVersion}, but ` +
      `this build reads v${SCHEMA_VERSION}. Re-run the pipeline.`,
    );
  }

  return { manifest, circuit, laps, frames };
}
