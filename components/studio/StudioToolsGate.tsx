'use client';

import React, { useEffect, useState } from 'react';

const PASSCODE = process.env.NEXT_PUBLIC_STUDIO_TOOLS_PASSCODE || 'vual-studio';
const STORAGE_KEY = 'studio-tools-unlocked';

/**
 * Lightweight passcode gate for Studio Tools (internal production tool).
 * - Stores unlock state in sessionStorage so the passcode is only asked once per session.
 * - The same passcode is sent to the API as a header (x-studio-passcode) — see route handlers.
 * NOTE: this is a soft gate to keep the tool/prompts private, not hardened auth.
 */
export function StudioToolsGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === PASSCODE) {
      setUnlocked(true);
    }
    setReady(true);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === PASSCODE) {
      sessionStorage.setItem(STORAGE_KEY, PASSCODE);
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (!ready) return null;

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#0d0a12] flex items-center justify-center px-6">
        <form onSubmit={submit} className="w-full max-w-xs text-center">
          <p className="text-[11px] tracking-[0.35em] uppercase text-white/40 mb-8">
            Studio Tools
          </p>
          <input
            type="password"
            autoFocus
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(false);
            }}
            placeholder="Passcode"
            className="w-full bg-transparent border-b border-white/20 text-white text-center text-sm tracking-widest py-3 outline-none focus:border-white/60 transition-colors placeholder:text-white/25"
          />
          {error && (
            <p className="text-[10px] tracking-wider text-red-400/80 mt-4">Incorrect passcode</p>
          )}
          <button
            type="submit"
            className="mt-8 w-full border border-white/20 text-white/70 text-[11px] tracking-[0.3em] uppercase py-3 hover:bg-white/5 hover:border-white/40 transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
