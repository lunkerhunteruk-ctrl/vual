'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Play, Calendar, Eye } from 'lucide-react';
import type { LiveStream } from '@/lib/types';

interface StreamCardProps {
  stream: LiveStream;
  featured?: boolean;
}

export function StreamCard({ stream, featured = false }: StreamCardProps) {
  const locale = useLocale();

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (featured) {
    return (
      <Link href={`/${locale}/live/${stream.id}`}>
        <motion.div
          whileTap={{ scale: 0.98 }}
          className="relative aspect-video rounded-[var(--radius-lg)] overflow-hidden bg-black"
        >
          {stream.thumbnailURL ? (
            <img src={stream.thumbnailURL} alt={stream.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* LIVE Badge */}
          {stream.status === 'live' && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-red-600 rounded-full">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              <span className="text-xs font-bold text-white">LIVE</span>
            </div>
          )}

          {/* Viewer count */}
          {stream.status === 'live' && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/50 rounded-full">
              <Eye size={12} className="text-white" />
              <span className="text-xs text-white">{stream.viewerCount || 0}</span>
            </div>
          )}

          {/* Info */}
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-base font-semibold text-white mb-1">{stream.title}</h3>
            {stream.description && (
              <p className="text-xs text-white/70 line-clamp-1">{stream.description}</p>
            )}
          </div>

          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play size={24} className="text-white ml-1" />
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link href={`/${locale}/live/${stream.id}`}>
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="flex gap-3 p-3 rounded-[var(--radius-lg)] hover:bg-[var(--color-bg-element)] transition-colors"
      >
        <div className="relative w-28 h-20 rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-element)] shrink-0">
          {stream.thumbnailURL ? (
            <img src={stream.thumbnailURL} alt={stream.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <Play size={20} className="text-[var(--color-text-label)]" />
            </div>
          )}
          {stream.status === 'live' && (
            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-600 rounded text-[8px] font-bold text-white">
              LIVE
            </div>
          )}
          {stream.status === 'scheduled' && (
            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-600 rounded text-[8px] font-bold text-white">
              予定
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-[var(--color-title-active)] line-clamp-2 mb-1">
            {stream.title}
          </h3>
          <p className="text-xs text-[var(--color-text-label)]">
            {stream.status === 'scheduled' && stream.scheduledAt
              ? formatDate(stream.scheduledAt)
              : stream.status === 'ended' && stream.endedAt
              ? formatDate(stream.endedAt)
              : stream.status === 'live'
              ? `${stream.viewerCount || 0} 人が視聴中`
              : ''
            }
          </p>
        </div>
      </motion.div>
    </Link>
  );
}
