'use client';

import { useState, useCallback } from 'react';
import { Loader2, Volume2, VolumeX } from 'lucide-react';

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

// Cloudflare Stream iframe embed player.
// Starts muted for autoplay (browser requirement), then shows an unmute overlay.
export function MuxPlayer({
  playbackId,
  title,
  autoPlay = true,
  className = '',
}: StreamPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Always start muted for autoplay

  const subdomain = process.env.NEXT_PUBLIC_CF_STREAM_SUBDOMAIN || 'customer-iachfaxtqeo2l99t';

  // Build iframe embed URL
  const buildUrl = useCallback((muted: boolean) => {
    const params = new URLSearchParams();
    if (autoPlay) params.set('autoplay', 'true');
    if (muted) params.set('muted', 'true');
    params.set('preload', 'auto');
    params.set('loop', 'false');
    params.set('controls', 'false'); // Hide controls — we handle unmute via overlay
    params.set('primaryColor', '#e74c3c');
    return `https://${subdomain}.cloudflarestream.com/${playbackId}/iframe?${params.toString()}`;
  }, [autoPlay, subdomain, playbackId]);

  const handleUnmute = useCallback(() => {
    setIsMuted(false);
    // Iframe src will change, triggering a reload with muted=false + autoplay
  }, []);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-black ${className}`}>
        <p className="text-sm text-white/70 mb-3">配信の読み込みに失敗しました</p>
        <button
          onClick={() => { setError(false); setIsLoading(true); setIsMuted(true); }}
          className="px-4 py-2 text-xs font-medium text-white bg-white/20 rounded-full hover:bg-white/30 transition-colors"
        >
          再接続
        </button>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      <iframe
        src={buildUrl(isMuted)}
        title={title || 'Live Stream'}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className={`w-full h-full border-0 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        style={{ backgroundColor: 'black' }}
        onLoad={() => setIsLoading(false)}
        onError={() => { setError(true); setIsLoading(false); }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
          <Loader2 size={32} className="animate-spin text-white mb-3" />
          <p className="text-xs text-white/70">配信を読み込み中...</p>
        </div>
      )}

      {/* Unmute overlay — shown when playing muted */}
      {!isLoading && isMuted && (
        <button
          onClick={handleUnmute}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2.5 bg-black/70 backdrop-blur-sm rounded-full border border-white/20 text-white text-sm font-medium transition-all hover:bg-black/90 active:scale-95 animate-pulse"
        >
          <VolumeX size={18} />
          タップして音声ON
        </button>
      )}
    </div>
  );
}
