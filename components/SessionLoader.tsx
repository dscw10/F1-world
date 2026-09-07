'use client';

/**
 * Loads a session and hands it to the dashboard.
 *
 * The three states are explicit and each says something true. "Degrade
 * visibly, never silently" applies hardest here: a failed fetch that renders
 * an empty dashboard looks like a race in which nothing happened, which is a
 * far worse outcome than an error message.
 */

import { useEffect, useState } from 'react';
import type { SessionData } from '@/lib/types';
import { loadIndex, loadSession, SessionLoadError } from '@/lib/data';
import { Dashboard } from './Dashboard';
import styles from './dashboard.module.css';

type State =
  | { status: 'loading' }
  | { status: 'ready'; data: SessionData }
  | { status: 'error'; message: string };

export function SessionLoader({ sessionId }: { sessionId?: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    // Which race to open comes from the index the pipeline writes, so a new
    // export appears without a code change. An explicit `sessionId` overrides
    // it, which is what a per-race URL will use later.
    (async () => {
      let id = sessionId;
      if (!id) {
        const index = await loadIndex();
        if (!index.default) {
          throw new SessionLoadError(
            'No sessions have been exported yet.',
          );
        }
        id = index.default;
      }
      return loadSession(id);
    })()
      .then((data) => { if (!cancelled) setState({ status: 'ready', data }); })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof SessionLoadError
          ? err.message
          : 'Something went wrong loading the session.';
        setState({ status: 'error', message });
      });
    return () => { cancelled = true; };
  }, [sessionId]);

  if (state.status === 'loading') {
    return (
      <div className={styles.centred}>
        <div className={styles.centredInner}>
          <p className={styles.errorBody}>Loading the session&hellip;</p>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className={styles.centred}>
        <div className={styles.centredInner}>
          <h1 className={styles.errorTitle}>No session data</h1>
          <p className={styles.errorBody}>
            The replay needs an exported session, and this build could not read
            one. Nothing is being shown rather than showing an empty race.
          </p>
          <p className={styles.errorDetail}>{state.message}</p>
          <p className={styles.errorDetail}>
            Run the <strong>Export a race</strong> workflow on GitHub, or{' '}
            <code>npm run fixture</code> locally for the development fixture.
          </p>
        </div>
      </div>
    );
  }

  return <Dashboard data={state.data} />;
}
