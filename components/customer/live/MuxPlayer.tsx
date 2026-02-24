'use client';

import { useRef, useEffect, useState } from 'react';
import { getPlaybackUrl, getThumbnailUrl } from '@/lib/mux';

interface MuxPlayerProps {
  playbackId: string;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export function MuxPlayer({
  playbackId,
  title,
  autoPlay = true,
  muted = true,
  className = '',
  onPlay,
  onPause,
  onEnded,
}: MuxPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playbackUrl = getPlaybackUrl(playbackId);
  const posterUrl = getThumbnailUrl(playbackId, { width: 1280 });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Use HLS.js for browsers that don't natively support HLS
    let hls: any = null;

    const initPlayer = async () => {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari natively supports HLS
        video.src = playbackUrl;
      } else {
        // Use HLS.js for other browsers
        try {
          const Hls = (await import('hls.js')).default;
          if (Hls.isSupported()) {
            hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
            });
            hls.loadSource(playbackUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.ERROR, (_: any, data: any) => {
              if (data.fatal) {
                setError('配信の読み込みに失敗しました');
              }
            });
          } else {
            setError('お使いのブラウザではライブ配信を再生できません');
          }
        } catch {
          // hls.js not available, try native
          video.src = playbackUrl;
        }
      }
    };

    initPlayer();

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [playbackUrl]);

  const handlePlay = () => {
    setIsPlaying(true);
    onPlay?.();
  };

  const handlePause = () => {
    setIsPlaying(false);
    onPause?.();
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-black ${className}`}>
        <p className="text-sm text-white/70">{error}</p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay={autoPlay}
      muted={muted}
      playsInline
      controls
      poster={posterUrl}
      title={title}
      className={`w-full h-full object-contain ${className}`}
      onPlay={handlePlay}
      onPause={handlePause}
      onEnded={onEnded}
    />
  );
}
