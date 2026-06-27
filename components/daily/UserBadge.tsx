"use client";

import { useState, useRef, useEffect } from "react";
import { useVaultStore } from "@/lib/daily/store";
import { signOutVault } from "@/lib/daily/auth";
import { AuthModal } from "./AuthModal";
import { CreditSheet } from "./CreditSheet";
import { MyVault } from "./MyVault";

export function UserBadge() {
  const [open, setOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [showMyVault, setShowMyVault] = useState(false);
  const [isLight, setIsLight] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const user = useVaultStore((s) => s.user);
  const setUser = useVaultStore((s) => s.setUser);
  const freeRemaining = useVaultStore((s) => s.freeRemaining);
  const paidCredits = useVaultStore((s) => s.paidCredits);
  const totalRemaining = useVaultStore((s) => s.totalRemaining);
  const points = useVaultStore((s) => s.points);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Detect theme from .daily-vault wrapper
  useEffect(() => {
    const check = () => {
      const wrapper = document.querySelector(".daily-vault");
      setIsLight(wrapper?.getAttribute("data-theme") === "light");
    };
    check();
    const observer = new MutationObserver(check);
    const wrapper = document.querySelector(".daily-vault");
    if (wrapper) observer.observe(wrapper, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const free = freeRemaining();

  // Theme-aware colors
  const t = isLight
    ? { bg: "#f5f3ef", text: "#1a1a1a", dim: "rgba(0,0,0,0.45)", border: "rgba(0,0,0,0.08)", cyan: "#c9a84c", cyanDim: "#c9a84c30", gold: "#c9a84c" }
    : { bg: "#0a0a0a", text: "#e0e0e0", dim: "rgba(255,255,255,0.45)", border: "rgba(255,255,255,0.08)", cyan: "#00d4ff", cyanDim: "#00d4ff40", gold: "#c9a84c" };

  return (
    <>
      <div className="fixed top-5 right-5 z-50" ref={menuRef}>
        <button
          onClick={() => (user ? setOpen(!open) : setShowAuth(true))}
          className="w-9 h-9 rounded-full overflow-hidden border transition-colors flex items-center justify-center"
          style={{
            borderColor: t.border,
            backgroundColor: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.05)",
          }}
        >
          {user?.photoURL ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={user.photoURL}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={t.dim}
              strokeWidth="1.5"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4.418 3.582-7 8-7s8 2.582 8 7" />
            </svg>
          )}
        </button>

        {open && user && (
          <div className="absolute top-12 right-0 w-56 rounded-xl p-4 space-y-4 shadow-2xl" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
            <div className="space-y-1">
              <p className="text-[12px] font-light truncate" style={{ color: t.text }}>
                {user.displayName || user.email}
              </p>
              <p className="text-[10px] font-light truncate" style={{ color: t.dim }}>
                {user.email}
              </p>
            </div>

            <div className="h-[1px]" style={{ background: t.border }} />

            <div className="space-y-2">
              <p className="text-[10px] tracking-[3px] font-light" style={{ color: t.dim }}>
                CREDITS
              </p>
              <div className="flex justify-between text-[11px] font-light">
                <span style={{ color: t.dim }}>{navigator.language.startsWith("ja") ? "今日のフリー" : "Today's Free"}</span>
                <span style={{ color: free > 0 ? t.cyan : t.dim }}>
                  {free} / 5
                </span>
              </div>
              <div className="flex justify-between text-[11px] font-light">
                <span style={{ color: t.dim }}>Paid</span>
                <span style={{ color: paidCredits > 0 ? t.cyan : t.dim }}>
                  {paidCredits}
                </span>
              </div>
            </div>

            <div className="flex justify-between text-[11px] font-light">
              <span style={{ color: t.dim }}>{navigator.language.startsWith("ja") ? "ポイント" : "Points"}</span>
              <span style={{ color: points > 0 ? t.gold : t.dim }}>
                {points} pt
              </span>
            </div>

            <button
              onClick={() => { setOpen(false); setShowMyVault(true); }}
              className="w-full py-2.5 text-[10px] tracking-[3px] font-light rounded-lg transition-colors"
              style={{ border: `1px solid ${t.border}`, color: t.dim }}
            >
              MY WARDROBE
            </button>

            <button
              onClick={() => { setOpen(false); setShowCredits(true); }}
              className="w-full py-2.5 text-[10px] tracking-[3px] font-light rounded-lg transition-colors"
              style={{ border: `1px solid ${t.cyanDim}`, color: t.cyan }}
            >
              + BUY CREDITS
            </button>

            <div className="h-[1px]" style={{ background: t.border }} />

            <button
              onClick={async () => {
                await signOutVault();
                setUser(null);
                setOpen(false);
              }}
              className="w-full text-left text-[10px] tracking-[2px] transition-colors font-light"
              style={{ color: t.dim }}
            >
              SIGN OUT
            </button>
          </div>
        )}
      </div>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />
      <CreditSheet open={showCredits} onClose={() => setShowCredits(false)} />
      <MyVault open={showMyVault} onClose={() => setShowMyVault(false)} />
    </>
  );
}
