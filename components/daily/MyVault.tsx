"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getUserGenerations, VaultGeneration } from "@/lib/daily/generations";
import { useVaultStore } from "@/lib/daily/store";

interface MyVaultProps {
  open: boolean;
  onClose: () => void;
}

export function MyVault({ open, onClose }: MyVaultProps) {
  const [generations, setGenerations] = useState<VaultGeneration[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<VaultGeneration | null>(null);
  const user = useVaultStore((s) => s.user);

  useEffect(() => {
    if (open && user) {
      setLoading(true);
      getUserGenerations(user.id)
        .then(setGenerations)
        .finally(() => setLoading(false));
    }
  }, [open, user]);

  if (!open) return null;

  const handleExport = (gen: VaultGeneration) => {
    const a = document.createElement("a");
    a.href = gen.imageUrl;
    a.download = `vault-${Date.now()}.jpg`;
    a.target = "_blank";
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "color-mix(in srgb, var(--vault-bg) 80%, transparent)" }} />

      <div
        className="relative w-full max-w-lg max-h-[85vh] rounded-t-2xl overflow-hidden animate-slide-up"
        style={{ background: "var(--vault-bg)", borderTop: "1px solid var(--vault-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--vault-border)" }} />
        </div>

        <div className="flex items-center justify-between px-5 pb-4">
          <div>
            <p className="text-[11px] tracking-[5px] font-light" style={{ color: "var(--vault-text-dim)" }}>
              MY VAULT
            </p>
            <p className="text-[9px] tracking-[2px] font-light mt-1" style={{ color: "var(--vault-text-dim)" }}>
              {generations.length} {generations.length === 1 ? "GENERATION" : "GENERATIONS"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer"
            style={{ border: "1px solid var(--vault-border)" }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" stroke="var(--vault-text-dim)" strokeWidth="1.5" fill="none">
              <path d="M1 1l8 8M9 1l-8 8" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-8" style={{ maxHeight: "calc(85vh - 80px)" }}>
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-5 h-5 border border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : generations.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[11px] tracking-[3px] font-light" style={{ color: "var(--vault-text-dim)" }}>
                NO GENERATIONS YET
              </p>
              <p className="text-[9px] font-light mt-2" style={{ color: "var(--vault-text-dim)" }}>
                {navigator.language.startsWith("ja")
                  ? "試着すると自動的に保存されます"
                  : "Your generations will be saved automatically"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-[2px]">
              {generations.map((gen) => (
                <div
                  key={gen.id}
                  className="relative aspect-[3/4] cursor-pointer overflow-hidden group"
                  onClick={() => setSelected(gen)}
                >
                  <Image
                    src={gen.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 250px"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-end justify-center">
                    <p
                      className="text-[8px] tracking-[2px] font-light mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ color: "#ffffff" }}
                    >
                      {gen.city}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div className="absolute inset-0 bg-black/80" />
          <div className="relative max-w-[90vw] max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.imageUrl}
              alt=""
              className="max-w-full max-h-[85vh] object-contain"
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <button
                onClick={() => handleExport(selected)}
                className="px-6 py-2 text-[9px] tracking-[3px] font-light border border-white/20 rounded-full text-white/70 hover:border-white/40 transition-colors backdrop-blur-sm bg-black/30"
              >
                EXPORT
              </button>
              <button
                onClick={() => setSelected(null)}
                className="px-6 py-2 text-[9px] tracking-[3px] font-light border border-white/20 rounded-full text-white/70 hover:border-white/40 transition-colors backdrop-blur-sm bg-black/30"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
