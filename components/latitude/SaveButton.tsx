'use client';
import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { ACTION, ACTION_MAIN, INK, TAP_INLINE } from '@/lib/latitude-theme';
import { addSaved, encodeShare, isSaved, savedServerSnapshot, savedSnapshot, subscribeSaved, toggleSaved } from '@/lib/latitude-saved';
import { track } from '@/lib/latitude-track';

// 2026-11-14 ③-2 店カードの「保存」と、保存した店への入口。保存は端末の中だけ（lib/latitude-saved.ts）。
// サーバーで描く時は「保存」のまま（保存したかは端末にしか無いので、読みこんでから「保存済み ✓」に替わる）。
// 記録（track）は「保存した」という回数だけ。店の名前・id は送らない

export const useSaved = () => useSyncExternalStore(subscribeSaved, savedSnapshot, savedServerSnapshot);

export function SaveButton({ city, id, ja, className }: { city: string; id: string; ja: boolean; className?: string }) {
  const list = useSaved();
  const on = isSaved(list, city, id);
  return (
    <button type="button" aria-pressed={on}
      onClick={() => { if (toggleSaved(city, id) && !on) track('saved'); }}
      className={`${ACTION} cursor-pointer ${className ?? ''}`} style={{ color: INK }}>
      {on ? (ja ? '保存済み ✓' : 'Saved ✓') : (ja ? '保存' : 'Save')}
    </button>
  );
}

// 「保存した店（n）　→」。1軒以上ある時だけ出す（無ければ何も描かない）
export function SavedLink({ locale, className }: { locale: string; className?: string }) {
  const n = useSaved().length;
  if (!n) return null;
  const ja = locale === 'ja';
  // className は外の段落に（無い時は段落ごと描かないので、余白も出ない）
  return (
    <p className={className}>
      <Link href={`/${locale}/latitude/saved`}
        className={`${TAP_INLINE} text-[12px] uppercase tracking-[0.2em] underline-offset-4 hover:underline [&:lang(ja)]:tracking-[0.08em]`}
        style={{ color: INK }}>
        {ja ? `保存した店（${n}）　→` : `Saved places (${n})  →`}
      </Link>
    </p>
  );
}

// 保存した店の一覧の「外す」
export function RemoveSaved({ city, id, ja }: { city: string; id: string; ja: boolean }) {
  return (
    <button type="button" onClick={() => toggleSaved(city, id)} className={`${ACTION} cursor-pointer`} style={{ color: INK }}>
      {ja ? '外す' : 'Remove'}
    </button>
  );
}

// 共有されたリンクの店を、自分の一覧に足す（同じ店は足さない）。足した後は「保存済み ✓」
export function AddShared({ items, ja }: { items: { c: string; id: string }[]; ja: boolean }) {
  const list = useSaved();
  const all = items.length > 0 && items.every((x) => isSaved(list, x.c, x.id));
  return (
    <button type="button" disabled={all} onClick={() => { if (addSaved(items) > 0) track('saved'); }}
      className={`${ACTION_MAIN} cursor-pointer disabled:cursor-default`} style={{ color: INK, borderColor: INK }}>
      {all ? (ja ? '保存済み ✓' : 'Saved ✓') : (ja ? '自分の一覧に保存' : 'Save these to my list')}
    </button>
  );
}

// 「この一覧を共有」：URL は街の slug と店の id だけ。navigator.share があればそれで、無ければリンクをコピー
export function ShareSaved({ locale }: { locale: string }) {
  const ja = locale === 'ja';
  const list = useSaved();
  const [copied, setCopied] = useState(false);
  if (!list.length) return null;
  const share = async () => {
    const url = `${location.origin}/${locale}/latitude/saved?s=${encodeURIComponent(encodeShare(list))}`;
    const title = ja ? '保存した店' : 'Saved places';
    try {
      if (navigator.share) { await navigator.share({ title, url }); track('shared'); return; }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return; // 共有の画面を閉じただけ
    }
    try { await navigator.clipboard.writeText(url); setCopied(true); track('shared'); setTimeout(() => setCopied(false), 2400); } catch { /* 写せない時は何もしない */ }
  };
  return (
    <button type="button" onClick={share} className={`${ACTION_MAIN} cursor-pointer`} style={{ color: INK, borderColor: INK }}>
      {copied ? (ja ? 'リンクをコピーしました ✓' : 'Link copied ✓') : (ja ? 'この一覧を共有' : 'Share this list')}
    </button>
  );
}
