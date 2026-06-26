'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useVaultStore } from '@/lib/daily/store';
import { signInWithGoogle, fetchCreditsFromSupabase } from '@/lib/daily/auth';
import { ThemeToggle } from '@/components/daily/ThemeToggle';
import { WardrobeUserBadge } from '@/components/wardrobe/UserBadge';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Look {
  id: string;
  image_url: string;
  created_at: string;
}

const MONO = "'JetBrains Mono', 'SF Mono', 'Courier New', monospace";

export default function MyLooksPage() {
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const user = useVaultStore((s) => s.user);
  const setUser = useVaultStore((s) => s.setUser);
  const syncFromFirestore = useVaultStore((s) => s.syncFromFirestore);
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ja';

  const fetchLooks = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/my/looks?uid=${uid}`);
      const data = await res.json();
      setLooks(data.looks ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!user) {
          const credits = await fetchCreditsFromSupabase(firebaseUser.uid);
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || undefined,
            paidCredits: credits?.paidCredits ?? 0,
            freeUsed: credits?.freeUsed ?? 0,
            points: 0,
            createdAt: new Date(),
          });
          if (credits) syncFromFirestore(credits.paidCredits, credits.freeUsed, credits.freeResetDate);
        }
        fetchLooks(firebaseUser.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (look: Look) => {
    if (!user || !confirm('このルックを削除しますか？')) return;
    setDeleting(look.id);
    try {
      await fetch(`/api/my/looks/${look.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUid: user.id }),
      });
      setLooks((prev) => prev.filter((l) => l.id !== look.id));
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = (look: Look) => {
    const a = document.createElement('a');
    a.href = look.image_url;
    a.download = `look-${look.id.slice(0, 8)}.jpg`;
    a.target = '_blank';
    a.click();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div
      className="daily-vault min-h-screen"
      data-theme="light"
      style={{ background: 'var(--vault-bg)', color: 'var(--vault-text)', fontFamily: MONO }}
    >
      {/* Fixed nav */}
      <WardrobeUserBadge />

      <Link
        href={`/${locale}/daily`}
        className="fixed top-5 left-5 z-50 text-[10px] tracking-[3px] font-light transition-opacity hover:opacity-60"
        style={{ color: 'var(--vault-text-dim)' }}
      >
        ← GRID
      </Link>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <ThemeToggle />
      </div>

      {/* Generate FAB */}
      <Link
        href={`/${locale}/my/generate`}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 text-[10px] tracking-[3px] font-light transition-opacity hover:opacity-70"
        style={{
          background: 'var(--vault-text)',
          color: 'var(--vault-bg)',
        }}
      >
        ＋ GENERATE
      </Link>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 pt-24 pb-32 space-y-12">

        {/* Page title */}
        <div className="space-y-1">
          <p className="text-[10px] tracking-[4px] font-light" style={{ color: 'var(--vault-text-dim)' }}>
            MY WARDROBE
          </p>
          <h1 className="text-[13px] font-light" style={{ color: 'var(--vault-text)' }}>
            保存したルック
          </h1>
        </div>

        {/* Not logged in */}
        {!user && !loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <p className="text-[11px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>
              LOGIN TO VIEW YOUR WARDROBE
            </p>
            <button
              onClick={() => signInWithGoogle().then((u) => u && setUser(u))}
              className="px-6 py-3 text-[10px] tracking-[3px] font-light transition-opacity hover:opacity-70"
              style={{ border: '1px solid var(--vault-border)', color: 'var(--vault-text)' }}
            >
              SIGN IN WITH GOOGLE
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div
              className="w-4 h-4 rounded-full border border-t-transparent animate-spin"
              style={{ borderColor: 'var(--vault-text-dim)', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {/* Empty */}
        {!loading && user && looks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <p className="text-[11px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>
              NO LOOKS SAVED YET
            </p>
            <Link
              href={`/${locale}/my/generate`}
              className="px-6 py-3 text-[10px] tracking-[3px] font-light transition-opacity hover:opacity-70"
              style={{ border: '1px solid var(--vault-border)', color: 'var(--vault-text)' }}
            >
              GENERATE YOUR FIRST LOOK
            </Link>
          </div>
        )}

        {/* Grid */}
        {!loading && looks.length > 0 && (
          <div className="grid grid-cols-3 gap-[2px]">
            {looks.map((look) => (
              <div key={look.id} className="group">
                <div className="aspect-[3/4] relative overflow-hidden" style={{ background: 'var(--vault-border)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={look.image_url} alt="look" className="w-full h-full object-cover" />
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end gap-[2px] p-2"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }}
                  >
                    <button
                      onClick={() => handleDownload(look)}
                      className="flex-1 py-1.5 text-[9px] tracking-[2px] text-white transition-opacity hover:opacity-70"
                      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
                    >
                      DL
                    </button>
                    <button
                      onClick={() => handleDelete(look)}
                      disabled={deleting === look.id}
                      className="flex-1 py-1.5 text-[9px] tracking-[2px] text-white transition-opacity hover:opacity-70 disabled:opacity-40"
                      style={{ background: 'rgba(180,0,0,0.3)', backdropFilter: 'blur(8px)' }}
                    >
                      {deleting === look.id ? '...' : 'DEL'}
                    </button>
                  </div>
                </div>
                <p className="text-[9px] tracking-[2px] mt-1" style={{ color: 'var(--vault-text-dim)' }}>
                  {formatDate(look.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
