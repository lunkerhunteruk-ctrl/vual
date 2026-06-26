'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useVaultStore } from '@/lib/daily/store';
import { signInWithGoogle } from '@/lib/daily/auth';
import Link from 'next/link';

interface Look {
  id: string;
  image_url: string;
  created_at: string;
}

export default function MyLooksPage() {
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const user = useVaultStore((s) => s.user);
  const setUser = useVaultStore((s) => s.setUser);

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
          const { fetchCreditsFromSupabase } = await import('@/lib/daily/auth');
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
        }
        fetchLooks(firebaseUser.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (look: Look) => {
    if (!user) return;
    if (!confirm('このルックを削除しますか？')) return;
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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-medium tracking-widest uppercase text-zinc-400">My Vault</h1>
          <p className="text-xs text-zinc-600 mt-0.5">保存したルック</p>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <Link
              href="../generate"
              className="text-xs px-3 py-1.5 border border-zinc-700 rounded-sm text-zinc-300 hover:border-zinc-400 transition-colors"
            >
              + 新規生成
            </Link>
          ) : (
            <button
              onClick={() => signInWithGoogle().then((u) => u && setUser(u))}
              className="text-xs px-3 py-1.5 border border-zinc-700 rounded-sm text-zinc-300 hover:border-zinc-400 transition-colors"
            >
              ログイン
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Not logged in */}
        {!user && !loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-zinc-500 text-sm">ログインして保存したルックを見る</p>
            <button
              onClick={() => signInWithGoogle().then((u) => u && setUser(u))}
              className="text-xs px-4 py-2 border border-zinc-700 rounded-sm text-zinc-300 hover:border-zinc-400 transition-colors"
            >
              Googleでログイン
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-5 h-5 border border-zinc-600 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && user && looks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-zinc-500 text-sm">まだルックが保存されていません</p>
            <Link
              href="../generate"
              className="text-xs px-4 py-2 border border-zinc-700 rounded-sm text-zinc-300 hover:border-zinc-400 transition-colors"
            >
              ルックを生成する
            </Link>
          </div>
        )}

        {/* Grid */}
        {!loading && looks.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {looks.map((look) => (
              <div key={look.id} className="group relative space-y-2">
                <div className="aspect-[3/4] bg-zinc-900 rounded-sm overflow-hidden relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={look.image_url}
                    alt="look"
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay buttons */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                    <button
                      onClick={() => handleDownload(look)}
                      className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white backdrop-blur-sm transition-colors"
                    >
                      DL
                    </button>
                    <button
                      onClick={() => handleDelete(look)}
                      disabled={deleting === look.id}
                      className="text-xs px-2 py-1 bg-red-900/60 hover:bg-red-800/80 rounded-sm text-red-300 backdrop-blur-sm transition-colors disabled:opacity-50"
                    >
                      {deleting === look.id ? '...' : '削除'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-zinc-600">{formatDate(look.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
