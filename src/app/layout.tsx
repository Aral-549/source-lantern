import type { Metadata } from 'next';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/500.css';
import '@fontsource/gochi-hand/400.css';
import './globals.css';
import './readability.css';
import './research-interactions.css';
import './workspace-polish.css';
import './anara-workspace.css';

export const metadata: Metadata = {
  title: 'Source Lantern — See what your sources leave out',
  description: 'An evidence-first research workspace for comparing sources, finding potential gaps, and deciding what to verify next.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
