'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';

// 2026-11-14 ユーザー：英語と日本語を切り替えても、いま見ているページのまま（場所の地図で日本へ寄ったあと、世界地図に戻らない）。
// href は読み込んだ時のページ（検索エンジン用・JS が無い時）。押した時は、その時のアドレス（地図が書き換えた /places/japan など、? と # も）の言葉だけを入れ替える。
export default function LocaleLink({ to, href, style, children }: { to: 'ja' | 'en'; href: string; style?: CSSProperties; children: ReactNode }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      hrefLang={to}
      style={style}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        const { pathname, search, hash } = window.location;
        if (!/^\/(ja|en)(\/|$)/.test(pathname)) return;
        e.preventDefault();
        router.push(pathname.replace(/^\/(ja|en)(?=\/|$)/, `/${to}`) + search + hash);
      }}
    >
      {children}
    </Link>
  );
}
