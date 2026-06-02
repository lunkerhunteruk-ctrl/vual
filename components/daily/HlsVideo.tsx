"use client";

import { useRef, useEffect } from "react";
import Hls from "hls.js";

interface HlsVideoProps {
  src: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  controls?: boolean;
  className?: string;
  onClick?: () => void;
}

export function HlsVideo({
  src,
  autoPlay = false,
  loop = false,
  muted = false,
  playsInline = false,
  controls = false,
  className,
  onClick,
}: HlsVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (src.includes(".m3u8")) {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: false });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) video.play().catch(() => {});
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        if (autoPlay) video.play().catch(() => {});
      }
    } else {
      video.src = src;
      if (autoPlay) video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, autoPlay]);

  return (
    <video
      ref={videoRef}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      controls={controls}
      className={className}
      onClick={onClick}
    />
  );
}
