'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Play, Calendar, Clock, Eye, Loader2 } from 'lucide-react';
import { useStreams } from '@/lib/hooks/useStreams';

export function BroadcastHistory() {
  const t = useTranslations('admin.live');

  // Fetch ended streams (past broadcasts)
  const { streams, isLoading } = useStreams({ status: 'ended', limit: 10 });

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  const formatDuration = (minutes: number | undefined) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
    >
      <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-4">
        {t('pastBroadcasts')}
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-line)]">
              <th className="text-left py-3 px-2 text-xs font-medium text-[var(--color-text-label)] uppercase">
                {t('broadcast')}
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-[var(--color-text-label)] uppercase">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  {t('date')}
                </div>
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-[var(--color-text-label)] uppercase">
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  {t('duration')}
                </div>
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-[var(--color-text-label)] uppercase">
                <div className="flex items-center gap-1">
                  <Eye size={12} />
                  {t('views')}
                </div>
              </th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-10 text-center">
                  <Loader2 size={20} className="animate-spin mx-auto text-[var(--color-text-label)]" />
                </td>
              </tr>
            ) : streams.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-[var(--color-text-label)]">
                  {t('noPastBroadcasts')}
                </td>
              </tr>
            ) : (
              streams.map((stream) => (
                <tr
                  key={stream.id}
                  className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-bg-element)] transition-colors"
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-10 bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)] rounded-[var(--radius-sm)] flex items-center justify-center overflow-hidden">
                        {stream.thumbnailURL ? (
                          <img src={stream.thumbnailURL} alt={stream.title} className="w-full h-full object-cover" />
                        ) : (
                          <Play size={14} className="text-[var(--color-text-label)]" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-[var(--color-title-active)]">
                        {stream.title}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-sm text-[var(--color-text-body)]">
                    {formatDate(stream.endedAt || stream.startedAt)}
                  </td>
                  <td className="py-3 px-2 text-sm text-[var(--color-text-body)]">
                    {formatDuration(stream.duration)}
                  </td>
                  <td className="py-3 px-2 text-sm font-medium text-[var(--color-title-active)]">
                    {stream.peakViewerCount?.toLocaleString() || '0'}
                  </td>
                  <td className="py-3 px-2">
                    <button className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-input)] transition-colors">
                      <Play size={16} className="text-[var(--color-accent)]" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

export default BroadcastHistory;
