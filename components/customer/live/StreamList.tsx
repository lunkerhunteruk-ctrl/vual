'use client';

import { useMemo } from 'react';
import { Radio, Calendar, Film } from 'lucide-react';
import type { LiveStream } from '@/lib/types';
import { StreamCard } from './StreamCard';

interface StreamListProps {
  streams: LiveStream[];
  isLoading: boolean;
}

export function StreamList({ streams, isLoading }: StreamListProps) {
  const liveStreams = useMemo(() => streams.filter(s => s.status === 'live'), [streams]);
  const scheduledStreams = useMemo(() => streams.filter(s => s.status === 'scheduled'), [streams]);
  const endedStreams = useMemo(() => streams.filter(s => s.status === 'ended'), [streams]);

  if (isLoading) {
    return (
      <div className="space-y-6 px-4">
        <div className="animate-pulse aspect-video bg-gray-200 rounded-xl" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-28 h-20 bg-gray-200 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-16 h-16 mb-4 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center">
          <Radio size={28} className="text-[var(--color-text-label)]" />
        </div>
        <p className="text-sm font-medium text-[var(--color-title-active)] mb-1">
          配信はまだありません
        </p>
        <p className="text-xs text-[var(--color-text-label)] text-center">
          ライブ配信が始まるとここに表示されます
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live Now */}
      {liveStreams.length > 0 && (
        <section className="px-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <h2 className="text-sm font-semibold text-[var(--color-title-active)]">
              配信中
            </h2>
          </div>
          <div className="space-y-3">
            {liveStreams.map((stream, index) => (
              <StreamCard key={stream.id} stream={stream} featured={index === 0} />
            ))}
          </div>
        </section>
      )}

      {/* Scheduled */}
      {scheduledStreams.length > 0 && (
        <section className="px-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-blue-500" />
            <h2 className="text-sm font-semibold text-[var(--color-title-active)]">
              配信予定
            </h2>
          </div>
          <div className="space-y-1">
            {scheduledStreams.map(stream => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        </section>
      )}

      {/* Past Streams */}
      {endedStreams.length > 0 && (
        <section className="px-4">
          <div className="flex items-center gap-2 mb-3">
            <Film size={14} className="text-[var(--color-text-label)]" />
            <h2 className="text-sm font-semibold text-[var(--color-title-active)]">
              過去の配信
            </h2>
          </div>
          <div className="space-y-1">
            {endedStreams.map(stream => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
