"use client";

interface LightboxModalProps {
  src: string | null;
  onClose: () => void;
}

export function LightboxModal({ src, onClose }: LightboxModalProps) {
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 backdrop-blur-md vault-overlay" />

      <div
        className="relative max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="max-w-full max-h-[90vh] object-contain"
        />

        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
          style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <svg width="12" height="12" viewBox="0 0 10 10" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" fill="none">
            <path d="M1 1l8 8M9 1l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
