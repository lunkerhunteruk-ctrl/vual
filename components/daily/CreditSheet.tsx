"use client";

import { useState } from "react";
import { CREDIT_PACKS, CreditPack } from "@/lib/daily/credits";
import { useVaultStore } from "@/lib/daily/store";
import { t } from "@/lib/daily/i18n";

interface CreditSheetProps {
  open: boolean;
  onClose: () => void;
}

export function CreditSheet({ open, onClose }: CreditSheetProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const user = useVaultStore((s) => s.user);

  if (!open || !user) return null;

  const handlePurchase = async (pack: CreditPack) => {
    setLoading(pack.slug);
    try {
      const res = await fetch("/api/daily/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packSlug: pack.slug,
          userId: user.id,
          email: user.email,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL:", data.error);
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg bg-[#0d0d0d] border-t border-white/10 rounded-t-2xl p-6 space-y-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pb-1">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-[16px] tracking-[5px] font-light text-white/90">
            GET CREDITS
          </h2>
          <p className="text-[10px] tracking-[2px] text-white/30 font-light">
            1 credit = 1 IMPLANT generation
          </p>
        </div>

        <div className="space-y-3">
          {CREDIT_PACKS.map((pack) => (
            <button
              key={pack.slug}
              onClick={() => handlePurchase(pack)}
              disabled={loading !== null}
              className="w-full flex items-center justify-between p-4 border border-white/10 rounded-xl hover:border-white/25 transition-colors disabled:opacity-50"
            >
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] text-white/80 font-light">
                    {pack.name}
                  </span>
                  {pack.discount && (
                    <span className="text-[9px] tracking-[1px] px-2 py-0.5 rounded-full bg-[var(--vault-cyan)]/10 text-[var(--vault-cyan)]">
                      {pack.discount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-white/30 font-light">
                  ¥{pack.unitPrice}{t("credits.perGeneration")}
                </span>
              </div>
              <span className="text-[16px] text-white/70 font-light">
                {loading === pack.slug ? "..." : `¥${pack.priceJpy.toLocaleString()}`}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 text-[10px] tracking-[3px] text-white/20 hover:text-white/40 transition-colors font-light"
        >
          CLOSE
        </button>

        <style jsx>{`
          @keyframes slide-up {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          .animate-slide-up {
            animation: slide-up 0.3s ease-out;
          }
        `}</style>
      </div>
    </div>
  );
}
