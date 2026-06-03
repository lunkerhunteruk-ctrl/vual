"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { VaultMedia, VaultEntity } from "@/lib/daily/types";
import { useVaultStore } from "@/lib/daily/store";
import { AuthModal } from "./AuthModal";
import { CreditSheet } from "./CreditSheet";
import { t } from "@/lib/daily/i18n";
import { applyFilmEffects } from "@/lib/daily/film-effects";
import { ShuffleText } from "./ShuffleText";
import { decrementInjection, lookFileToId, getInjectionInfo } from "@/lib/daily/injection-count";
import { saveGenerationRecord } from "@/lib/daily/generations";

interface ImplantModalProps {
  image: (VaultMedia & { locationId: string }) | null;
  entities: VaultEntity[];
  themeCity?: string;
  totalLooks?: number;
  onClose: () => void;
}

type ModalState = "select" | "implanting" | "result";

const INJECT_STEPS = [
  "ANALYZING",
  "STYLING",
  "COMPOSING",
  "FINALIZING",
];

export function ImplantModal({ image, entities, themeCity, totalLooks, onClose }: ImplantModalProps) {
  const [state, setState] = useState<ModalState>("select");
  const [selectedEntity, setSelectedEntity] = useState<VaultEntity | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const [showCredits, setShowCredits] = useState(false);
  const [height, setHeight] = useState(170);
  const [previewEntity, setPreviewEntity] = useState<VaultEntity | null>(null);
  const [sceneRemaining, setSceneRemaining] = useState<number | null>(null);
  const [sceneInitial, setSceneInitial] = useState<number>(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const user = useVaultStore((s) => s.user);
  const canGenerate = useVaultStore((s) => s.canGenerate);
  const incrementGeneration = useVaultStore((s) => s.incrementGeneration);
  const totalRemaining = useVaultStore((s) => s.totalRemaining);
  const freeRemaining = useVaultStore((s) => s.freeRemaining);
  const addPoints = useVaultStore((s) => s.addPoints);

  useEffect(() => {
    if (image) {
      const lookId = lookFileToId(image.file);
      getInjectionInfo(lookId).then(({ remaining, initial }) => {
        setSceneRemaining(remaining);
        setSceneInitial(initial);
      });
    }
  }, [image]);

  if (!image) return null;

  const sceneCorrupted = sceneRemaining !== null && sceneRemaining <= 0;

  const handleImplant = async () => {
    if (!selectedEntity && !userPhoto) return;

    if (!canGenerate()) {
      if (!user) {
        setShowAuth(true);
      } else {
        setShowCredits(true);
      }
      return;
    }

    setState("implanting");
    setError(null);

    const stepAnimation = (async () => {
      for (let i = 0; i < INJECT_STEPS.length - 1; i++) {
        setCurrentStep(i);
        await new Promise((r) => setTimeout(r, 1200 + Math.random() * 600));
      }
    })();

    try {
      let entityImage: string;
      if (userPhoto) {
        entityImage = userPhoto;
      } else if (selectedEntity) {
        entityImage = selectedEntity.referenceUrl;
        if (!entityImage.startsWith("data:")) {
          const res = await fetch(entityImage);
          const blob = await res.blob();
          entityImage = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } else {
        return;
      }

      const res = await fetch("/api/daily/implant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityImage,
          lookFile: image.file,
          height,
        }),
      });

      const data = await res.json();

      await stepAnimation;
      setCurrentStep(INJECT_STEPS.length - 1);
      await new Promise((r) => setTimeout(r, 500));

      if (data.success && data.resultImage) {
        const dateMatch = image.file.match(/(\d{2})-(\d{2})-(\d{4})/);
        const filmDate = dateMatch ? `${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3].slice(2)}` : "";
        const city = themeCity || "VAULT";

        const isFreeGeneration = freeRemaining() > 0;

        let lot: string;
        if (isFreeGeneration) {
          lot = "SAMPLE — 000/000";
        } else {
          const editionNum = sceneInitial - (sceneRemaining ?? sceneInitial) + 1;
          lot = `${String(editionNum).padStart(3, "0")}/${String(sceneInitial).padStart(3, "0")}`;
        }

        const withEffects = await applyFilmEffects(data.resultImage, {
          title: `${city}  ${filmDate}`,
          lot,
        });
        setState("result");
        setResultUrl(withEffects);
        incrementGeneration();

        if (!isFreeGeneration) {
          const lookId = lookFileToId(image.file);
          const newRemaining = await decrementInjection(lookId);
          setSceneRemaining(newRemaining);
          addPoints(10);
        }

        if (user) {
          fetch("/api/daily/generations/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageDataUrl: withEffects,
              userId: user.id,
              lookFile: image.file,
              city,
            }),
          })
            .then((r) => r.json())
            .then((saveData) => {
              if (saveData.success && saveData.imageUrl) {
                saveGenerationRecord({
                  userId: user.id,
                  imageUrl: saveData.imageUrl,
                  lookFile: image.file,
                  city,
                }).catch(() => {});
              }
            })
            .catch(() => {});
        }
      } else {
        setError(data.error || "Generation failed");
        setState("select");
      }
    } catch (err) {
      await stepAnimation;
      console.error("IMPLANT error:", err);
      setError(t("implant.connectionError"));
      setState("select");
    }
  };

  const handleExport = async () => {
    if (!resultUrl) return;
    try {
      const fileName = `vault-inject-${Date.now()}.jpg`;
      const [header, b64] = resultUrl.split(",");
      const mime = header?.match(/:(.*?);/)?.[1] || "image/jpeg";
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      const file = new File([blob], fileName, { type: mime });

      if (navigator.share && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        try {
          await navigator.share({ files: [file] });
          return;
        } catch {
          // fall through
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  const handleUserPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUserPhoto(reader.result as string);
      setSelectedEntity(null);
    };
    reader.readAsDataURL(file);
  };

  const handleClose = () => {
    setState("select");
    setSelectedEntity(null);
    setUserPhoto(null);
    setCurrentStep(0);
    setResultUrl(null);
    onClose();
  };

  const remaining = totalRemaining();

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-8"
        onClick={handleClose}
      >
        <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "color-mix(in srgb, var(--vault-bg) 80%, transparent)" }} />

        <div
          className="relative w-full max-w-lg max-h-[80vh] rounded-2xl overflow-y-auto animate-slide-up"
          style={{ background: "var(--vault-bg)", border: "1px solid var(--vault-border)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full" style={{ background: "var(--vault-border)" }} />
          </div>

          <div
            className="relative w-full select-none"
            style={{ aspectRatio: image.aspect.replace(":", "/") }}
          >
            {state === "implanting" ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-6 relative overflow-hidden">
                <div className="absolute inset-0 inject-noise" />
                <div className="absolute inset-0 inject-scanlines" />
                <div className="absolute inset-0 inject-glitch" />

                <div className="relative z-10 text-left space-y-3 px-8">
                  {INJECT_STEPS.map((step, i) => (
                    <p
                      key={step}
                      className="text-[11px] tracking-[3px] font-light transition-all duration-300"
                      style={{
                        color: i <= currentStep ? "var(--vault-cyan)" : "rgba(255,255,255,0.08)",
                        opacity: i <= currentStep ? 1 : 0.3,
                        textShadow: i === currentStep ? "0 0 10px var(--vault-cyan), 0 0 30px var(--vault-cyan)" : "none",
                      }}
                    >
                      {i < currentStep ? "■" : i === currentStep ? "▸" : "·"} {step}
                    </p>
                  ))}
                </div>

                {userPhoto ? (
                  <div className="relative z-10">
                    <p className="text-[14px] tracking-[8px] font-light" style={{ color: "var(--vault-cyan)" }}>
                      PROCESSING
                    </p>
                  </div>
                ) : (
                  <p className="relative z-10 text-[12px] tracking-[6px] font-light inject-flicker"
                     style={{ color: "var(--vault-cyan)" }}>
                    PROCESSING
                  </p>
                )}
              </div>
            ) : resultUrl?.startsWith("data:") ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resultUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  draggable={false}
                />
                <div className="absolute inset-0" onContextMenu={(e) => e.preventDefault()} />
              </>
            ) : (
              <Image
                src={resultUrl || image.file}
                alt=""
                fill
                className="object-cover"
              />
            )}
          </div>

          <div className="p-6 space-y-6" onClick={() => setPreviewEntity(null)}>
            {state === "select" && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex-1" />
                  <div className="flex items-center gap-3">
                    {sceneCorrupted ? (
                      <span className="text-[9px] tracking-[2px] font-light text-red-500/50">SOLD OUT</span>
                    ) : (
                      <>
                        <span className="text-[9px] tracking-[2px] font-light text-white/20">TRIES LEFT</span>
                        <span className="text-[24px] font-light tabular-nums" style={{ color: "var(--vault-cyan)", opacity: 0.6 }}>
                          {sceneRemaining ?? "—"}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex-1 flex justify-end">
                    <button onClick={handleClose} className="w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer" style={{ border: "1px solid var(--vault-border)" }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" stroke="var(--vault-text-dim)" strokeWidth="1.5" fill="none">
                        <path d="M1 1l8 8M9 1l-8 8" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] tracking-[4px] text-white/40 font-light mb-3">HEIGHT</p>
                  <div className="flex items-center gap-4">
                    <input type="range" min={150} max={190} step={1} value={height} onChange={(e) => setHeight(parseInt(e.target.value))}
                      className="flex-1 h-[2px] appearance-none bg-white/10 rounded-full accent-[var(--vault-cyan)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--vault-cyan)]" />
                    <span className="text-[13px] tracking-[2px] text-white/60 font-light w-14 text-right">{height}cm</span>
                  </div>
                </div>

                <div className="relative">
                  <p className="text-[10px] tracking-[4px] text-white/40 font-light mb-3">SELECT ENTITY</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 relative">
                    {entities.map((entity) => (
                      <button
                        key={entity.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEntity(entity);
                          setUserPhoto(null);
                          setPreviewEntity(entity);
                        }}
                        onMouseEnter={() => { if (!("ontouchstart" in window)) setPreviewEntity(entity); }}
                        onMouseLeave={() => { if (!("ontouchstart" in window)) setPreviewEntity(null); }}
                        className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden border-2 transition-colors"
                        style={{ borderColor: selectedEntity?.id === entity.id ? "var(--vault-cyan)" : "rgba(255,255,255,0.1)" }}
                      >
                        <Image src={entity.thumbnailUrl} alt={entity.name} width={48} height={48} className="object-cover w-full h-full" />
                      </button>
                    ))}
                  </div>

                  {previewEntity && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-10 pointer-events-none">
                      <div className="w-32 rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-black" style={{ aspectRatio: "3/4" }}>
                        <Image src={previewEntity.referenceUrl} alt={previewEntity.name} width={128} height={171} className="object-cover w-full h-full" />
                      </div>
                      <p className="text-center text-[9px] tracking-[2px] text-white/40 font-light mt-1">{previewEntity.name}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-[1px] bg-white/10" />
                  <span className="text-[10px] tracking-[2px] text-white/20">or</span>
                  <div className="flex-1 h-[1px] bg-white/10" />
                </div>

                <label className="flex items-center justify-center gap-2 py-3 border border-white/10 rounded-lg cursor-pointer hover:border-white/25 transition-colors">
                  <span className="text-[11px] tracking-[3px] text-white/50 font-light">
                    {userPhoto ? t("implant.photoLoaded") : typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? t("implant.selfie") : t("implant.yourPhoto")}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    {...(typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? { capture: "user" as const } : {})}
                    onChange={handleUserPhoto}
                    className="hidden"
                  />
                </label>

                {error && (
                  <p className="text-[11px] tracking-[1px] text-red-400/80 font-light text-center">{error}</p>
                )}

                {sceneCorrupted ? (
                  <div className="w-full py-4 text-center">
                    <p className="text-[13px] tracking-[6px] font-light text-red-500/60">SOLD OUT</p>
                    <p className="text-[9px] tracking-[2px] text-white/15 font-light mt-2">THIS LOOK IS NO LONGER AVAILABLE</p>
                  </div>
                ) : userPhoto ? (
                  <button onClick={handleImplant} className="w-full py-4 inject-warning-pulse transition-all duration-300 cursor-pointer" style={{ background: "linear-gradient(135deg, #cc2020 0%, #991010 100%)" }}>
                    <div className="pointer-events-none">
                      <ShuffleText lines={["READY TO TRY ON"]} startDelay={0} shuffleDuration={600} stagger={25} glowColor="#ff4444" fontSize="12px" letterSpacing="4px" />
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={handleImplant}
                    disabled={!selectedEntity}
                    className="w-full py-4 text-[13px] tracking-[6px] font-light transition-all duration-300 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                    style={{
                      background: selectedEntity ? "linear-gradient(135deg, var(--vault-cyan) 0%, #0088aa 100%)" : "rgba(255,255,255,0.05)",
                      color: selectedEntity ? "#000" : "rgba(255,255,255,0.2)",
                    }}
                  >
                    TRY ON
                  </button>
                )}
              </>
            )}

            {state === "result" && (
              <div className="flex gap-3">
                <button onClick={handleExport} className="flex-1 py-3 text-[11px] tracking-[4px] font-light border border-[var(--vault-cyan)]/30 hover:border-[var(--vault-cyan)]/60 text-[var(--vault-cyan)] transition-colors cursor-pointer">
                  EXPORT
                </button>
                <button
                  onClick={() => { setResultUrl(null); setState("select"); }}
                  className="flex-1 py-3 text-[11px] tracking-[4px] font-light border border-white/10 hover:border-white/30 text-white/30 hover:text-white/50 transition-colors cursor-pointer"
                >
                  RE-TRY
                </button>
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          @keyframes slide-up {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          .animate-slide-up { animation: slide-up 0.3s ease-out; }
          @keyframes noise {
            0%, 100% { background-position: 0 0; }
            10% { background-position: -5% -10%; }
            20% { background-position: -15% 5%; }
            30% { background-position: 7% -25%; }
            40% { background-position: -5% 25%; }
            50% { background-position: -15% 10%; }
            60% { background-position: 15% 0%; }
            70% { background-position: 0% 15%; }
            80% { background-position: 3% -10%; }
            90% { background-position: -10% 10%; }
          }
          .inject-noise {
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E");
            animation: noise 0.15s infinite steps(5);
            opacity: 0.6;
            mix-blend-mode: overlay;
          }
          @keyframes scanlines {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
          }
          .inject-scanlines {
            background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 212, 255, 0.03) 2px, rgba(0, 212, 255, 0.03) 4px);
            animation: scanlines 3s linear infinite;
          }
          @keyframes glitch {
            0%, 95%, 100% { opacity: 0; }
            96% { opacity: 1; transform: translateX(-20px); clip-path: inset(20% 0 60% 0); background: rgba(0, 212, 255, 0.08); }
            97% { opacity: 1; transform: translateX(15px); clip-path: inset(50% 0 20% 0); background: rgba(0, 212, 255, 0.05); }
            98% { opacity: 0; }
          }
          .inject-glitch { animation: glitch 2s infinite; }
          @keyframes flicker {
            0%, 100% { opacity: 1; }
            5% { opacity: 0.2; }
            10% { opacity: 1; }
            50% { opacity: 0.8; }
            55% { opacity: 0.3; }
            57% { opacity: 1; }
          }
          .inject-flicker { animation: flicker 1.5s infinite; }
          @keyframes warning-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
          .inject-warning-pulse { animation: warning-pulse 2s ease-in-out infinite; }
        `}</style>
      </div>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />
      <CreditSheet open={showCredits} onClose={() => setShowCredits(false)} />
    </>
  );
}
