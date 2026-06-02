"use client";

import { HlsVideo } from "./HlsVideo";

interface VideoModalProps {
  src: string | null;
  onClose: () => void;
}

export function VideoModal({ src, onClose }: VideoModalProps) {
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-10 w-9 h-9 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      <div onClick={(e) => e.stopPropagation()}>
        <HlsVideo
          src={src}
          autoPlay
          controls
          playsInline
          className="max-h-[90vh] max-w-[90vw] object-contain"
        />
      </div>
    </div>
  );
}
