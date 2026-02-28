'use client';

import { useState, useRef, useCallback } from 'react';
import { Stream, type StreamPlayerApi } from '@cloudflare/stream-react';
import { Loader2, VolumeX, Volume2 } from 'lucide-react';

interface StreamPlayerProps {
  playbackId: string;
  title?: string;
  autoPlay?: boolean;
  className?: string;
}

// Cloudflare Stream React component player.
// Starts muted for autoplay, with a custom unmute button.
export function MuxPlayer({
  playbackId,
  title,
  autoPlay = true,
  className = '',
}: StreamPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const streamRef = useRef<StreamPlayerApi>(undefined);
  const customerCode = (process.env.NEXT_PUBLIC_CF_STREAM_SUBDOMAIN || 'customer-iachfaxtqeo2l99t').replace(/^customer-/, '');

  const toggleMute = useCallback(() => {
    const player = streamRef.current;
    if (player) {
      const newMuted = !isMuted;
      player.muted = newMuted;
      if (!newMuted) {
        player.volume = 1;
        player.play();
      }
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-black ${className}`}>
        <p className="text-sm text-white/70 mb-3">配信の読み込みに失敗しました</p>
        <button
          onClick={() => { setError(false); setIsLoading(true); }}
          className="px-4 py-2 text-xs font-medium text-white bg-white/20 rounded-full hover:bg-white/30 transition-colors"
        >
          再接続
        </button>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      {/* Full-screen cover: iframe fills entire screen, slight crop allowed */}
      <div className={`absolute inset-0 [&>iframe]:!w-full [&>iframe]:!h-full [&>iframe]:!object-cover ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        <Stream
          src={playbackId}
          streamRef={streamRef}
          customerCode={customerCode}
          autoplay={autoPlay}
          muted
          controls={false}
          preload="auto"
          primaryColor="#e74c3c"
          title={title || 'Live Stream'}
          onCanPlay={() => { setIsLoading(false); setError(false); }}
          onError={() => { setError(true); setIsLoading(false); }}
        />
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10">
          <Loader2 size={32} className="animate-spin text-white mb-3" />
          <p className="text-xs text-white/70">配信を読み込み中...</p>
        </div>
      )}

      {/* Mute toggle button */}
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
