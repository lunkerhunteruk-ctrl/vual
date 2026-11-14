'use client';
import Link from 'next/link';
import { useState } from 'react';
import { INK, MUTE, SERIF } from '@/components/latitude/Latitude';
import RoomCam from '@/components/latitude/RoomCam';
import RoomChat, { type ChatStage } from '@/components/latitude/RoomChat';
import type { RoomCam as Cam } from '@/lib/latitude-rooms';
import { latAsset } from '@/lib/latitude-assets';

// 2026-10-30 LATITUDE の部屋。上に部屋の中継ふうの動画、下に旅人との会話（RoomChat）。
// 声で話すのは、自分から「通話する」を押して、もう一度確かめた人だけ（思い切って話したい人にしぼるため・声の料金は通話中だけ）。

export default function Room({ locale, slug, name, city, month, callSeconds, cam }: { locale: string; slug: string; name: string; city: string; month: string; callSeconds: number; cam?: Cam }) {
  const ja = locale === 'ja';
  const [stage, setStage] = useState<ChatStage>('outside');
  const [entered, setEntered] = useState(false);

  return (
    <main className="mx-auto flex max-w-2xl flex-col px-4 pb-10 pt-12 md:px-8 md:pt-20">
      <p className="text-[12px] uppercase tracking-[0.2em] [&:lang(ja)]:tracking-[0.08em]" style={{ color: MUTE }}>
        Latitude&nbsp;&nbsp;·&nbsp;&nbsp;{ja ? '部屋' : 'Her room'}
      </p>
      <div className="mt-5 flex items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={latAsset(`people/${slug}.jpg`)} alt="" width={64} height={64} className="h-16 w-16 rounded-full object-cover" />
        <div>
          <h1 className="text-[48px] leading-none md:text-[64px]" style={{ fontFamily: SERIF, fontWeight: 400 }}>
            <Link href={`/${locale}/latitude/people/${slug}`} style={{ color: INK }}>{name}</Link>
          </h1>
          <p className="mt-2 text-[12px] uppercase tracking-[0.2em]">{city}&nbsp;&nbsp;·&nbsp;&nbsp;{month}</p>
        </div>
      </div>
      <p className="mt-6 text-[13px] leading-relaxed" style={{ color: MUTE }}>
        {ja
          ? `${name}はAIです。話した文字は、直すために30日だけ残します。声は残しません。`
          : `${name} is an AI. What you type or say is kept as text for 30 days to improve her, then deleted. Audio is not kept. She answers in English here, and in Japanese on the Japanese page.`}
      </p>

      {cam && (
        <div className="mt-8 w-full overflow-hidden" style={{ aspectRatio: '4 / 5', maxHeight: '62vh' }}>
          <RoomCam cam={cam} reaction={stage === 'call' || stage === 'calling' ? 'call' : entered ? 'enter' : null} fallback={ja ? '戸は開いています。' : 'The door is open.'} />
        </div>
      )}

      <RoomChat locale={locale} slug={slug} name={name} callSeconds={callSeconds}
        context={`The visitor is on your room page, watching you at home in your room in ${city}.`}
        onStage={(s, j) => { setStage(s); setEntered(j); }} />
    </main>
  );
}
