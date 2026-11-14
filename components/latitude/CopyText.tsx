'use client';
import { useState } from 'react';
import { INK } from '@/lib/latitude-theme';

// 2026-11-11 プレス用のページ：紹介文をそのまま貼れるように写すボタン
export default function CopyText({ text, label, done }: { text: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* 写せない時は何もしない（文は画面で選んで写せる） */
        }
      }}
      className="border-b pb-1 text-[12px] uppercase tracking-[0.2em]"
      style={{ color: INK, borderColor: INK }}
    >
      {copied ? done : label}
    </button>
  );
}
