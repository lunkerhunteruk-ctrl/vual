'use client';

import { useState } from 'react';

interface StreamPlayerProps {
  playbackId: string;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

// Uses Cloudflare Stream iframe embed player for maximum compatibility.
// File kept as MuxPlayer.tsx to avoid breaking imports.
export function MuxPlayer({
  playbackId,
  title,
  autoPlay = true,
  muted = true,
  className = '',
}: StreamPlayerProps) {
  const [error, setError] = useState(false);

  // Cloudflare Stream iframe embed URL
  const params = new URLSearchParams();
  if (autoPlay) params.set('autoplay', 'true');
  if (muted) params.set('muted', 'true');
  params.set('preload', 'auto');
  params.set('loop', 'false');
  params.set('controls', 'true');

  const subdomain = process.env.NEXT_PUBLIC_CF_STREAM_SUBDOMAIN || 'customer-iachfaxtqeo2l99t';
  const embedUrl = `https://${subdomain}.cloudflarestream.com/${playbackId}/iframe?${params.toString()}`;

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-black ${className}`}>
        <p className="text-sm text-white/70">配信の読み込みに失敗しました</p>
      </div>
    );
  }

  return (
    <iframe
      src={embedUrl}
      title={title || 'Live Stream'}
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className={`w-full h-full border-0 ${className}`}
      style={{ backgroundColor: 'black' }}
      onError={() => setError(true)}
    />
  );
}
