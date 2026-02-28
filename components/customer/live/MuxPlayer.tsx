'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, VolumeX, Volume2 } from 'lucide-react';
import Hls from 'hls.js';

interface StreamPlayerProps {
  playbackId: string;
  title?: string;
  autoPlay?: boolean;
  className?: string;
}

// Direct HLS.js player for Cloudflare Stream.
// Starts muted for autoplay, shows unmute button overlay.
export function MuxPlayer({
  playbackId,
  autoPlay = true,
  className = '',
}: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const subdomain = process.env.NEXT_PUBLIC_CF_STREAM_SUBDOMAIN || 'customer-iachfaxtqeo2l99t';
  const hlsUrl = `https://${subdomain}.cloudflarestream.com/${playbackId}/manifest/video.m3u8`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
      });
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setError(false);
        if (autoPlay) {
          video.play().catch(() => {
            // Autoplay blocked — will show as paused, user taps to play
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            // Retry on network error
            setTimeout(() => hls?.startLoad(), 3000);
          } else {
            setError(true);
            setIsLoading(false);
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        setError(false);
        if (autoPlay) {
          video.play().catch(() => {});
        }
      });
      video.addEventListener('error', () => {
        setError(true);
        setIsLoading(false);
      });
    } else {
      setError(true);
      setIsLoading(false);
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [hlsUrl, autoPlay]);

  const handleUnmute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = false;
      video.play().catch(() => {});
    }
    setIsMuted(false);
  }, []);

  const handleRetry = useCallback(() => {
    setError(false);
    setIsLoading(true);
    setIsMuted(true);
    // Destroy and recreate by changing key — but simpler to just reload HLS
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setError(false);
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) setError(true);
      });
      hlsRef.current = hls;
    } else {
      video.src = hlsUrl;
      video.load();
    }
  }, [hlsUrl]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-black ${className}`}>
        <p className="text-sm text-white/70 mb-3">配信の読み込みに失敗しました</p>
        <button
          onClick={handleRetry}
          className="px-4 py-2 text-xs font-medium text-white bg-white/20 rounded-full hover:bg-white/30 transition-colors"
        >
          再接続
        </button>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        muted
        playsInline
        className="w-full h-full object-contain"
        style={{ backgroundColor: 'black' }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
          <Loader2 size={32} className="animate-spin text-white mb-3" />
          <p className="text-xs text-white/70">配信を読み込み中...</p>
        </div>
      )}

      {/* Unmute button */}
      {!isLoading && isMuted && (
        <button
          onClick={handleUnmute}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2.5 bg-black/70 backdrop-blur-sm rounded-full border border-white/20 text-white text-sm font-medium transition-all hover:bg-black/90 active:scale-95 animate-pulse"
        >
          <VolumeX size={18} />
          タップして音声ON
        </button>
      )}

      {/* Muted indicator (small, after user has unmuted they can tap to re-mute) */}
      {!isLoading && !isMuted && (
        <button
          onClick={() => { if (videoRef.current) videoRef.current.muted = true; setIsMuted(true); }}
          className="absolute bottom-20 left-4 p-2 bg-black/50 rounded-full text-white"
        >
          <Volume2 size={16} />
        </button>
      )}
    </div>
  );
}
