"use client";

import { useState, useEffect } from "react";
import { signInWithGoogle } from "@/lib/daily/auth";
import { useVaultStore } from "@/lib/daily/store";
import { t } from "@/lib/daily/i18n";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLight, setIsLight] = useState(false);
  const setUser = useVaultStore((s) => s.setUser);

  useEffect(() => {
    const wrapper = document.querySelector(".daily-vault");
    setIsLight(wrapper?.getAttribute("data-theme") === "light");
    const observer = new MutationObserver(() => {
      setIsLight(wrapper?.getAttribute("data-theme") === "light");
    });
    if (wrapper) observer.observe(wrapper, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  if (!open) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        setUser(user);
        onSuccess();
      }
    } catch (err) {
      console.error("Sign-in error:", err);
      setError(t("auth.error"));
    } finally {
      setLoading(false);
    }
  };

  const bg = isLight ? "#f5f3ef" : "#0d0d0d";
  const borderCol = isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
  const title = isLight ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.9)";
  const sub = isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)";
  const benefit = isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";
  const accent = isLight ? "#c9a84c" : "#00d4ff";
  const closeCol = isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)";
  const closeHover = isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.4)";
  const backdrop = isLight ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.7)";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: backdrop }} />

      <div
        className="relative w-full max-w-sm mx-6 rounded-2xl p-8 space-y-6"
        style={{ background: bg, border: `1px solid ${borderCol}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center space-y-2">
          <h2 className="text-[18px] tracking-[6px] font-light" style={{ color: title }}>
            JOIN VAULT
          </h2>
          <p className="text-[11px] tracking-[2px] font-light leading-relaxed" style={{ color: sub }}>
            {t("auth.subtitle")}
          </p>
        </div>

        <div className="space-y-2 py-2">
          {[
            t("auth.benefit1"),
            t("auth.benefit2"),
            t("auth.benefit3"),
          ].map((b) => (
            <div key={b} className="flex items-center gap-3">
              <span className="text-[10px]" style={{ color: accent }}>+</span>
              <span className="text-[11px] tracking-[1px] font-light" style={{ color: benefit }}>
                {b}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-4 flex items-center justify-center gap-3 rounded-lg transition-colors disabled:opacity-50"
          style={{
            background: isLight ? "#000" : "#fff",
            color: isLight ? "#fff" : "#000",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
            <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
          </svg>
          <span className="text-[13px] tracking-[2px] font-medium">
            {loading ? t("auth.signingIn") : t("auth.signInButton")}
          </span>
        </button>

        {error && (
          <p className="text-[11px] text-red-400/80 text-center">{error}</p>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 text-[10px] tracking-[3px] transition-colors font-light"
          style={{ color: closeCol }}
          onMouseEnter={(e) => { e.currentTarget.style.color = closeHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = closeCol; }}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
