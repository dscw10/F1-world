import { SessionLoader } from '@/components/SessionLoader';

/**
 * The dashboard.
 *
 * A server component that renders the client shell. The session is fetched in
 * the browser rather than baked in at build time, so swapping which race is
 * shown is a data change rather than a rebuild — and so the same page will
 * serve a live transport later without restructuring.
 *
 * `fixture` is the synthetic development session. Replace with the exported
 * circuit id (`spa`, and so on) once a real export exists.
 */
export default function Page() {
  return <SessionLoader sessionId="fixture" />;
}
