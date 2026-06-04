"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { VaultMedia } from "@/lib/daily/types";
import { HlsVideo } from "./HlsVideo";
import { t } from "@/lib/daily/i18n";

interface InteractiveCellProps {
  item: VaultMedia & { locationId: string };
  isVideo: boolean;
  style: React.CSSProperties;
  onImageClick: () => void;
  onVideoClick: () => void;
}

export function InteractiveCell({ item, isVideo, style, onImageClick, onVideoClick }: InteractiveCellProps) {
  const cellRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = cellRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: "50px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVideo) return;
    const el = imgRef.current;
    if (!el) return;

    // Seeded per cell for unique, independent Ken Burns motion
    const seed = style.gridColumn?.toString().charCodeAt(0) || 0;
    const dirs = ["kenBurnsTL", "kenBurnsTR", "kenBurnsBL", "kenBurnsBR"];
    const dir = dirs[seed % dirs.length];
    const duration = 14 + (seed % 9); // 14-22s per leg (slow)
    // Negative delay = start mid-cycle so motion is already underway on load.
    const offset = -((seed * 3.3) % duration);
    // Half the cells start zoomed-in and pull OUT, half start wide and push IN.
    const direction = seed % 2 === 0 ? "alternate-reverse" : "alternate";
    const origins = ["30% 30%", "70% 30%", "30% 70%", "70% 70%", "50% 40%", "40% 60%"];
    const origin = origins[seed % origins.length];

    el.style.transformOrigin = origin;
    el.style.willChange = "transform";
    el.style.animation = `${dir} ${duration}s ease-in-out ${offset}s infinite ${direction}`;

    return () => { el.style.animation = ""; };
  }, [isVideo, style]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 6;
    setTilt({ x, y });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div ref={cellRef} style={style}>
      <div
        className="relative overflow-hidden cursor-pointer group h-full"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(30px)",
          transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
        }}
        onClick={() => isVideo ? onVideoClick() : onImageClick()}
        onMouseMove={!isVideo ? handleMouseMove : undefined}
        onMouseLeave={!isVideo ? handleMouseLeave : undefined}
      >
        {isVideo ? (
          <HlsVideo
            src={item.file}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : item.previewFile ? (
          <div ref={imgRef} className="absolute inset-0">
            <video
              src={item.previewFile}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            ref={imgRef}
            className="absolute inset-[-8px]"
            style={{
              transform: `translate(${tilt.x}px, ${tilt.y}px)`,
              transition: tilt.x || tilt.y ? "transform 0.2s ease-out" : "none",
            }}
          >
            <Image
              src={item.file}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              loading="lazy"
            />
          </div>
        )}
        {!isVideo && (
          <div
            className="absolute inset-0 transition-all duration-300"
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow = `inset 0 0 0 1.5px var(--vault-cyan)`;
              el.dataset.hovered = "true";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow = "none";
              el.dataset.hovered = "";
            }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 flex items-center justify-center pointer-events-none transition-all duration-300"
              style={{ height: 32, background: "rgba(0,0,0,0.45)", transform: "translateY(100%)", bottom: 4 }}
              ref={(el) => {
                if (!el) return;
                const parent = el.parentElement;
                if (!parent) return;
                const show = () => { el.style.transform = "translateY(0)"; };
                const hide = () => { el.style.transform = "translateY(100%)"; };
                parent.addEventListener("mouseenter", show);
                parent.addEventListener("mouseleave", hide);
              }}
            >
              <span className="text-[9px] tracking-[4px] font-light" style={{ color: "#ffffff" }}>
                {t("grid.tryOn")}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
