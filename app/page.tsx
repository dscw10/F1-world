import { SessionLoader } from '@/components/SessionLoader';

/**
 * The dashboard.
 *
 * A server component that renders the client shell. Which race it opens comes
 * from `public/data/index.json`, written by the pipeline — so exporting a new
 * race changes what is shown without touching any source. That is what lets
 * the export run as a GitHub Action and still reach the screen.
 */
export default function Page() {
  return <SessionLoader />;
}
