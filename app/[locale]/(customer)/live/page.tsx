'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Radio } from 'lucide-react';
import { StreamList } from '@/components/customer/live';
import { useStreams } from '@/lib/hooks';
import { useStoreContext } from '@/lib/store/store-context';

export default function LivePage() {
  const t = useTranslations('customer.live');
  const store = useStoreContext((s) => s.store);
  const { streams, isLoading } = useStreams({ shopId: store?.id || undefined, status: 'live', realtime: true });

  return (
    <div className="min-h-screen pb-4">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <Radio size={20} className="text-[var(--color-accent)]" />
          <h1 className="text-lg font-semibold text-[var(--color-title-active)]">
            {t('title') || 'ライブ'}
          </h1>
        </motion.div>
      </div>

      {/* Stream List */}
      <StreamList streams={streams} isLoading={isLoading} />
    </div>
  );
}
