import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  // Working title. The product cannot ship under a name containing "F1" or
  // "Formula 1" — see context.md 8. This is a placeholder, not a decision.
  title: 'Race Replay — foundations',
  description:
    'A free race dashboard that plays a Grand Prix as it happened. In development.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Zoom is left enabled deliberately. Locking it is an accessibility failure,
  // and the primary device is one people hold at arm's length.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
