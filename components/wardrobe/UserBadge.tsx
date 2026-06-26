'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useVaultStore } from '@/lib/daily/store';
import { signOutVault } from '@/lib/daily/auth';
import { AuthModal } from '@/components/daily/AuthModal';
import { CreditSheet } from '@/components/daily/CreditSheet';

export function WardrobeUserBadge() {
  const [open, setOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const user = useVaultStore((s) => s.user);
  const setUser = useVaultStore((s) => s.setUser);
  const freeRemaining = useVaultStore((s) => s.freeRemaining);
  const paidCredits = useVaultStore((s) => s.paidCredits);
  const totalRemaining = useVaultStore((s) => s.totalRemaining);
  const points = useVaultStore((s) => s.points);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Detect theme from .my-wardrobe wrapper
  useEffect(() => {
    const check = () => {
      const wrapper = document.querySelector('.my-wardrobe');
      setIsDark(!wrapper?.hasAttribute('data-theme'));
    };
    check();
    const observer = new MutationObserver(check);
    const wrapper = document.querySelector('.my-wardrobe');
    if (wrapper) observer.observe(wrapper, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const free = freeRemaining();
  const total = totalRemaining();

  const t = isDark
    ? { bg: '#0a0a0a', text: '#e0e0e0', dim: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.08)', accent: '#ffffff', accentDim: 'rgba(255,255,255,0.15)' }
    : { bg: '#ffffff', text: '#111111', dim: 'rgba(0,0,0,0.4)', border: 'rgba(0,0,0,0.1)', accent: '#111111', accentDim: 'rgba(0,0,0,0.08)' };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => (user ? setOpen(!open) : setShowAuth(true))}
          className="w-8 h-8 rounded-full overflow-hidden border flex items-center justify-center transition-opacity hover:opacity-70"
          style={{ borderColor: t.border, backgroundColor: t.accentDim }}
        >
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.dim} strokeWidth="1.5">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4.418 3.582-7 8-7s8 2.582 8 7" />
            </svg>
          )}
        </button>

        {open && user && (
          <div
            className="absolute top-10 right-0 w-52 rounded-lg p-4 space-y-3 shadow-xl z-50"
            style={{ background: t.bg, border: `1px solid ${t.border}` }}
          >
            {/* User info */}
            <div className="space-y-0.5">
              <p className="text-xs font-medium truncate" style={{ color: t.text }}>{user.displayName || user.email}</p>
              <p className="text-[10px] truncate" style={{ color: t.dim }}>{user.email}</p>
            </div>

            <div style={{ height: 1, background: t.border }} />

            {/* Credits */}
            <div className="space-y-1.5">
              <p className="text-[9px] tracking-widest font-medium" style={{ color: t.dim }}>CREDITS</p>
              <div className="flex justify-between text-[11px]">
                <span style={{ color: t.dim }}>フリー (本日)</span>
                <span style={{ color: free > 0 ? t.text : t.dim }}>{free} / 3</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span style={{ color: t.dim }}>合計残り</span>
                <span style={{ color: total > 0 ? t.text : t.dim }}>{total}</span>
              </div>
              {points > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span style={{ color: t.dim }}>ポイント</span>
                  <span style={{ color: t.dim }}>{points} pt</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <button
              onClick={() => { setOpen(false); router.push('looks'); }}
              className="w-full py-2 text-[10px] tracking-widest rounded-sm transition-colors"
              style={{ border: `1px solid ${t.border}`, color: t.dim }}
            >
              MY WARDROBE
            </button>

            <button
              onClick={() => { setOpen(false); setShowCredits(true); }}
              className="w-full py-2 text-[10px] tracking-widest rounded-sm transition-colors"
              style={{ border: `1px solid ${t.border}`, color: t.text }}
            >
              + クレジット購入
            </button>

            <div style={{ height: 1, background: t.border }} />

            <button
              onClick={async () => { await signOutVault(); setUser(null); setOpen(false); }}
              className="w-full text-left text-[10px] tracking-widest transition-opacity hover:opacity-60"
              style={{ color: t.dim }}
            >
              SIGN OUT
            </button>
          </div>
        )}
      </div>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />
      <CreditSheet open={showCredits} onClose={() => setShowCredits(false)} />
    </>
  );
}
