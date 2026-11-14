'use client';
import { useState, type CSSProperties } from 'react';
import { INK } from '@/lib/latitude-theme';

// 2026-11-11 プレス用のページ：紹介文をそのまま貼れるように写すボタン
// 2026-11-14 店カードの住所の「コピー」にも使う。className・style を渡すと見た目を替えられる（渡さなければプレス用のまま）
export default function CopyText({ text, label, done, className, style }: { text: string; label: string; done: string; className?: string; style?: CSSProperties }) {
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
      className={className ?? 'border-b pb-1 text-[12px] uppercase tracking-[0.2em] [&:lang(ja)]:tracking-[0.08em]'}
      style={style ?? { color: INK, borderColor: INK }}
    >
      {copied ? done : label}
    </button>
  );
}
