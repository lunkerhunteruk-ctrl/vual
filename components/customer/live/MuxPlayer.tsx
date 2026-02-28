'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, VolumeX, Volume2 } from 'lucide-react';

declare global {
  interface Window {
    Stream?: (iframe: HTMLIFrameElement) => any;
  }
}

interface StreamPlayerProps {
  playbackId: string;
  title?: string;
  autoPlay?: boolean;
  className?: string;
  onMutedChange?: (muted: boolean) => void;
  hideUnmuteButton?: boolean;
}

// Cloudflare Stream iframe player with SDK-based mute control.
export function MuxPlayer({
  playbackId,
  title,
  autoPlay = true,
  className = '',
  onMutedChange,
  hideUnmuteButton = false,
}: StreamPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const sdkLoadedRef = useRef(false);

  const subdomain = process.env.NEXT_PUBLIC_CF_STREAM_SUBDOMAIN || 'customer-iachfaxtqeo2l99t';

  const params = new URLSearchParams();
  if (autoPlay) params.set('autoplay', 'true');
  params.set('muted', 'true'); // Always start muted for autoplay
  params.set('preload', 'auto');
  params.set('loop', 'false');
  params.set('controls', 'false'); // We provide our own unmute button
  params.set('primaryColor', '#e74c3c');

  const embedUrl = `https://${subdomain}.cloudflarestream.com/${playbackId}/iframe?${params.toString()}`;

  // Load Cloudflare Stream SDK
  useEffect(() => {
    if (sdkLoadedRef.current || window.Stream) {
      sdkLoadedRef.current = true;
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://embed.cloudflarestream.com/embed/sdk.latest.js';
    script.async = true;
    script.onload = () => { sdkLoadedRef.current = true; };
    document.head.appendChild(script);
  }, []);

  // Initialize player once iframe loads
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);

    // Try to init SDK player with retries
    const tryInit = (attempts: number) => {
      if (attempts <= 0 || !iframeRef.current) return;
      if (window.Stream) {
        try {
          playerRef.current = window.Stream(iframeRef.current);
        } catch (e) {
          console.warn('Stream SDK init error:', e);
        }
      } else {
        setTimeout(() => tryInit(attempts - 1), 500);
      }
    };
    tryInit(10); // Try up to 5 seconds
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;

    if (playerRef.current) {
      try {
        playerRef.current.muted = newMuted;
        if (!newMuted) {
          playerRef.current.play();
        }
      } catch (e) {
        console.warn('Mute toggle error:', e);
      }
    }

    setIsMuted(newMuted);
    onMutedChange?.(newMuted);
  }, [isMuted, onMutedChange]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-black ${className}`}>
        <p className="text-sm text-white/70 mb-3">配信の読み込みに失敗しました</p>
        <button
          onClick={() => { setError(false); setIsLoading(true); playerRef.current = null; }}
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
        ref={iframeRef}
        src={embedUrl}
        title={title || 'Live Stream'}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className={`w-full h-full border-0 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        style={{ backgroundColor: 'black' }}
        onLoad={handleIframeLoad}
        onError={() => { setError(true); setIsLoading(false); }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
          <Loader2 size={32} className="animate-spin text-white mb-3" />
          <p className="text-xs text-white/70">配信を読み込み中...</p>
        </div>
      )}

      {/* Mute toggle button — always visible */}
      {!isLoading && (
        <button
          onClick={toggleMute}
          className={`absolute bottom-24 left-4 z-20 flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-medium transition-all active:scale-95 ${
            isMuted
              ? 'bg-red-600/90 backdrop-blur-sm animate-pulse'
              : 'bg-black/50 backdrop-blur-sm'
          }`}
        >
          {isMuted ? (
            <>
              <VolumeX size={16} />
              タップして音声ON
            </>
          ) : (
            <Volume2 size={16} />
          )}
        </button>
      )}
    </div>
  );
}
