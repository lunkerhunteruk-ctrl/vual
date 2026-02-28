'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
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

// HLS.js player for Cloudflare Stream live playback.
// Starts muted for autoplay, shows unmute button for user interaction.
export function MuxPlayer({
  playbackId,
  title,
  autoPlay = true,
  muted: initialMuted = true,
  className = '',
  onPlay,
  onPause,
  onEnded,
}: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(initialMuted);

  const subdomain = process.env.NEXT_PUBLIC_CF_STREAM_SUBDOMAIN || 'customer-iachfaxtqeo2l99t';
  const hlsUrl = `https://${subdomain}.cloudflarestream.com/${playbackId}/manifest/video.m3u8`;

  const cleanup = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const initPlayer = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    cleanup();
    setError(null);
    setIsLoading(true);

    // Native HLS support (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        if (autoPlay) video.play().catch(() => {});
      }, { once: true });
      video.addEventListener('error', () => {
        retryTimerRef.current = setTimeout(initPlayer, 3000);
      }, { once: true });
      return;
    }

    // HLS.js
    if (!Hls.isSupported()) {
      setError('お使いのブラウザはライブ配信の再生に対応していません');
      setIsLoading(false);
      return;
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 30,
      maxBufferLength: 10,
      maxMaxBufferLength: 30,
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 6,
      manifestLoadingRetryDelay: 2000,
      manifestLoadingMaxRetry: 10,
      levelLoadingRetryDelay: 2000,
      levelLoadingMaxRetry: 10,
    });

    hlsRef.current = hls;

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setIsLoading(false);
      if (autoPlay) video.play().catch(() => {});
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.destroy();
          hlsRef.current = null;
          retryTimerRef.current = setTimeout(initPlayer, 3000);
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          setError('配信の読み込みに失敗しました');
          setIsLoading(false);
        }
      }
    });

    hls.loadSource(hlsUrl);
    hls.attachMedia(video);
  }, [hlsUrl, autoPlay, cleanup]);

  useEffect(() => {
    initPlayer();
    return cleanup;
  }, [initPlayer, cleanup]);

  // Sync muted state to video element
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const newMuted = !isMuted;
    video.muted = newMuted;
    setIsMuted(newMuted);
  }, [isMuted]);

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        muted={isMuted}
        playsInline
        title={title}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        className="w-full h-full object-contain"
        style={{ backgroundColor: 'black' }}
      />

      {/* Mute/Unmute button — always visible */}
      {!isLoading && !error && (
        <button
          onClick={toggleMute}
          className="absolute top-4 right-4 p-2.5 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors z-10"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      )}

      {/* Tap to unmute banner — shown when muted */}
      {!isLoading && !error && isMuted && (
        <button
          onClick={toggleMute}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-2 z-10 animate-pulse"
        >
          <VolumeX size={14} />
          タップして音声ON
        </button>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
          <Loader2 size={32} className="animate-spin text-white mb-3" />
          <p className="text-xs text-white/70">配信を読み込み中...</p>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
          <p className="text-sm text-white/70 mb-3">{error}</p>
          <button
            onClick={initPlayer}
            className="px-4 py-2 text-xs font-medium text-white bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            再接続
          </button>
        </div>
      )}
    </div>
  );
}
