import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPerson } from '@/lib/latitude';
import { getRoom, roomsOpen } from '@/lib/latitude-rooms';
import { INK, IssueStrip, PAPER, PublishedBy } from '@/components/latitude/Latitude';
import Room from '@/components/latitude/Room';

// 2026-10-30 LATITUDE の部屋（試作・まず凛だけ）。文字で話せて、話したい人だけ「通話する」で声になる。検索には出さない。

export const metadata: Metadata = { title: 'Room — LATITUDE | VUAL', robots: { index: false, follow: false } };

export default async function LatitudeRoomPage({ params }: { params: Promise<{ locale: string; person: string }> }) {
  const { locale, person } = await params;
  const p = getPerson(person);
  const room = getRoom(person);
  if (!p || !room || !roomsOpen()) notFound();

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <IssueStrip locale={locale} />
      <Room locale={locale} slug={p.slug} name={locale === 'ja' ? room.nameJa : p.name} city={room.city} month={room.month} callSeconds={room.callSeconds} cam={room.cam} />
      <footer className="pb-16 pt-8">
        <PublishedBy locale={locale} />
      </footer>
    </div>
  );
}
