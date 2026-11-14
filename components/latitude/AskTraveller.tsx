'use client';
import { useEffect, useState } from 'react';
import { INK, MUTE, PAPER, SERIF } from '@/lib/latitude-theme';
import RoomChat from '@/components/latitude/RoomChat';
import { track } from '@/lib/latitude-track';
import { latAsset } from '@/lib/latitude-assets';

// 2026-10-30 街のページの「凛に聞く」。画面の下にいつも小さく出し、押すとその場で会話の窓が開く（部屋へ移らない）。
// 店の「この店について聞く」（AskAboutButton）は、window の 'latitude:ask' で質問を渡し、窓を開いて送る。

export function AskAboutButton({ text, label, shop, person }: { text: string; label: string; shop: string; person: string }) {
  return (
    <button type="button" onClick={() => { track('ask_shop', { shop, person }); window.dispatchEvent(new CustomEvent('latitude:ask', { detail: text })); }}
      className="text-[10px] uppercase tracking-[0.3em] underline-offset-4 hover:underline" style={{ color: INK }}>
      {label}
    </button>
  );
}

export default function AskTraveller({ locale, slug, name, callSeconds, context }: { locale: string; slug: string; name: string; callSeconds: number; context: string }) {
  const ja = locale === 'ja';
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // 一度開いたら会話を保ったまま、閉じても消さない
  const [ask, setAsk] = useState<{ text: string; n: number } | null>(null);

  useEffect(() => {
    const on = (e: Event) => {
      setOpen(true);
      setMounted(true);
      setAsk((a) => ({ text: (e as CustomEvent<string>).detail, n: (a?.n ?? 0) + 1 }));
    };
    window.addEventListener('latitude:ask', on);
    return () => window.removeEventListener('latitude:ask', on);
  }, []);

  return (
    <>
      {!open && (
        <button onClick={() => { setOpen(true); setMounted(true); track('ask_open', { person: slug }); }}
          className="fixed z-40 flex items-center gap-3 py-2 pl-2 pr-5 shadow-[0_6px_24px_rgba(30,29,27,0.18)]"
          style={{ right: 'max(16px, env(safe-area-inset-right, 0px))', bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', background: INK, color: PAPER }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={latAsset(`people/${slug}.jpg`)} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
          <span className="text-[11px] uppercase tracking-[0.3em]">{ja ? `${name}に聞く` : `Ask ${name}`}</span>
        </button>
      )}
      {mounted && (
        <div role="dialog" aria-label={ja ? `${name}との会話` : `Talk with ${name}`} hidden={!open}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto border-t px-4 pb-6 pt-4 shadow-[0_-8px_30px_rgba(30,29,27,0.15)] md:inset-x-auto md:bottom-6 md:right-6 md:w-[420px] md:border md:px-6"
          style={{ background: PAPER, borderColor: 'rgba(30,29,27,0.2)', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex items-center justify-between gap-4 pb-3">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={latAsset(`people/${slug}.jpg`)} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
              <div>
                <p className="text-[22px] leading-none" style={{ fontFamily: SERIF }}>{name}</p>
                <p className="mt-1 text-[10px] leading-snug" style={{ color: MUTE }}>{ja ? `${name}はAIです。文字は30日だけ残します。` : `${name} is an AI. Text is kept for 30 days.`}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>{ja ? '閉じる' : 'Close'}</button>
          </div>
          <RoomChat locale={locale} slug={slug} name={name} callSeconds={callSeconds} context={context} ask={ask} compact />
        </div>
      )}
    </>
  );
}
