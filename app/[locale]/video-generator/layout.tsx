import type { Metadata } from 'next';

/**
 * Route-scoped metadata so the Video Generator can be installed as a standalone
 * Dock app (Safari "Add to Dock" / Chrome "Install") with its own name and icon,
 * without affecting the rest of the VUAL site.
 */
export const metadata: Metadata = {
  title: 'Video Generator',
  manifest: '/video-generator.webmanifest',
  icons: {
    icon: '/video-generator-icon.png',
    apple: '/video-generator-icon-180.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Video Generator',
    statusBarStyle: 'black-translucent',
  },
};

export default function VideoGeneratorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
