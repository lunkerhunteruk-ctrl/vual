import type { Metadata } from 'next';
import { StudioToolsGate } from '@/components/studio/StudioToolsGate';

// Internal production tool — keep it out of search engines.
export const metadata: Metadata = {
  title: 'Studio Tools',
  robots: { index: false, follow: false },
};

export default function StudioToolsLayout({ children }: { children: React.ReactNode }) {
  return <StudioToolsGate>{children}</StudioToolsGate>;
}
