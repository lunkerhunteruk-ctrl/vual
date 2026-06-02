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

  const free = freeRemaining();

  return (
    <>
      <div className="fixed top-5 right-5 z-50" ref={menuRef}>
        <button
          onClick={() => (user ? setOpen(!open) : setShowAuth(true))}
          className="w-9 h-9 rounded-full overflow-hidden border transition-colors flex items-center justify-center"
          style={{
            borderColor: "var(--vault-border, rgba(255,255,255,0.2))",
            backgroundColor: "var(--vault-surface, rgba(255,255,255,0.05))",
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
              stroke="var(--vault-text-dim, rgba(150,150,150,0.6))"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4.418 3.582-7 8-7s8 2.582 8 7" />
            </svg>
          )}
        </button>

        {open && user && (
          <div className="absolute top-12 right-0 w-56 rounded-xl p-4 space-y-4 shadow-2xl" style={{ background: "var(--vault-bg)", border: "1px solid var(--vault-border)" }}>
            <div className="space-y-1">
              <p className="text-[12px] font-light truncate" style={{ color: "var(--vault-text)" }}>
                {user.displayName || user.email}
              </p>
              <p className="text-[10px] font-light truncate" style={{ color: "var(--vault-text-dim)" }}>
                {user.email}
              </p>
            </div>

            <div className="h-[1px]" style={{ background: "var(--vault-border)" }} />

            <div className="space-y-2">
              <p className="text-[10px] tracking-[3px] font-light" style={{ color: "var(--vault-text-dim)" }}>
                CREDITS
              </p>
              <div className="flex justify-between text-[11px] font-light">
                <span style={{ color: "var(--vault-text-dim)" }}>{navigator.language.startsWith("ja") ? "今日のフリー" : "Today's Free"}</span>
                <span style={{ color: free > 0 ? "var(--vault-cyan)" : "var(--vault-text-dim)" }}>
                  {free} / 5
                </span>
              </div>
              <div className="flex justify-between text-[11px] font-light">
                <span style={{ color: "var(--vault-text-dim)" }}>Paid</span>
                <span style={{ color: paidCredits > 0 ? "var(--vault-cyan)" : "var(--vault-text-dim)" }}>
                  {paidCredits}
                </span>
              </div>
            </div>

            <div className="flex justify-between text-[11px] font-light">
              <span style={{ color: "var(--vault-text-dim)" }}>{navigator.language.startsWith("ja") ? "ポイント" : "Points"}</span>
              <span style={{ color: points > 0 ? "var(--vault-gold)" : "var(--vault-text-dim)" }}>
                {points} pt
              </span>
            </div>

            <button
              onClick={() => { setOpen(false); setShowMyVault(true); }}
              className="w-full py-2.5 text-[10px] tracking-[3px] font-light rounded-lg transition-colors"
              style={{ border: "1px solid var(--vault-border)", color: "var(--vault-text-dim)" }}
            >
              MY VAULT
            </button>

            <button
              onClick={() => { setOpen(false); setShowCredits(true); }}
              className="w-full py-2.5 text-[10px] tracking-[3px] font-light rounded-lg transition-colors"
              style={{ border: "1px solid var(--vault-cyan-dim)", color: "var(--vault-cyan)" }}
            >
              + BUY CREDITS
            </button>

            <div className="h-[1px]" style={{ background: "var(--vault-border)" }} />

            <button
              onClick={async () => {
                await signOutVault();
                setUser(null);
                setOpen(false);
              }}
              className="w-full text-left text-[10px] tracking-[2px] transition-colors font-light"
              style={{ color: "var(--vault-text-dim)" }}
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
