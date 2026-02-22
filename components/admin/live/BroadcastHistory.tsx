'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Play, Calendar, Clock, Eye } from 'lucide-react';

interface Broadcast {
  id: string;
  title: string;
  date: string;
  duration: string;
  views: number;
  thumbnail: string;
}

const mockBroadcasts: Broadcast[] = [
  { id: '1', title: 'Summer Collection Launch', date: '2025-01-02', duration: '1h 24m', views: 2340, thumbnail: '' },
  { id: '2', title: 'New Year Special Sale', date: '2025-01-01', duration: '45m', views: 1890, thumbnail: '' },
  { id: '3', title: 'Winter Essentials Showcase', date: '2024-12-28', duration: '1h 10m', views: 3120, thumbnail: '' },
  { id: '4', title: 'Holiday Gift Guide', date: '2024-12-24', duration: '55m', views: 2780, thumbnail: '' },
];

export function BroadcastHistory() {
  const t = useTranslations('admin.live');

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
                Broadcast
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-[var(--color-text-label)] uppercase">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  Date
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
            {mockBroadcasts.map((broadcast) => (
              <tr
                key={broadcast.id}
                className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-bg-element)] transition-colors"
              >
                <td className="py-3 px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-10 bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)] rounded-[var(--radius-sm)] flex items-center justify-center">
                      <Play size={14} className="text-[var(--color-text-label)]" />
                    </div>
                    <span className="text-sm font-medium text-[var(--color-title-active)]">
                      {broadcast.title}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2 text-sm text-[var(--color-text-body)]">
                  {broadcast.date}
                </td>
                <td className="py-3 px-2 text-sm text-[var(--color-text-body)]">
                  {broadcast.duration}
                </td>
                <td className="py-3 px-2 text-sm font-medium text-[var(--color-title-active)]">
                  {broadcast.views.toLocaleString()}
                </td>
                <td className="py-3 px-2">
                  <button className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-input)] transition-colors">
                    <Play size={16} className="text-[var(--color-accent)]" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

export default BroadcastHistory;
