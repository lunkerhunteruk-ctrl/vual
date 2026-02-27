'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Radio, Calendar, Loader2 } from 'lucide-react';
import { Input, Button } from '@/components/ui';

interface StreamSettingsProps {
  onGoLive: (title: string) => void;
  onEndStream: () => void;
  isLive: boolean;
  isConnecting?: boolean;
  streamTitle: string;
  onTitleChange: (title: string) => void;
}

export function StreamSettings({
  onGoLive,
  onEndStream,
  isLive,
  isConnecting = false,
  streamTitle,
  onTitleChange,
}: StreamSettingsProps) {
  const t = useTranslations('admin.live');
  const locale = useLocale();
  const [scheduleMode, setScheduleMode] = useState(false);

  const handleGoLive = () => {
    if (!streamTitle.trim()) return;
    onGoLive(streamTitle.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
    >
      <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-4">
        {t('streamSettings')}
      </h3>

      <div className="space-y-4 mb-6">
        <Input
          label={t('streamTitle')}
          placeholder={t('enterStreamTitle')}
          value={streamTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          disabled={isLive}
        />

        {scheduleMode && !isLive && (
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('date')} type="date" />
            <Input label={t('time')} type="time" />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {isLive ? (
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            leftIcon={<Radio size={18} />}
            onClick={onEndStream}
          >
            {t('endStream')}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={isConnecting ? <Loader2 size={18} className="animate-spin" /> : <Radio size={18} />}
            onClick={handleGoLive}
            disabled={!streamTitle.trim() || isConnecting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isConnecting
              ? (locale === 'ja' ? '接続中...' : 'Connecting...')
              : t('goLive')
            }
          </Button>
        )}

        {!isLive && !isConnecting && (
          <Button
            variant="secondary"
            size="md"
            fullWidth
            leftIcon={<Calendar size={16} />}
            onClick={() => setScheduleMode(!scheduleMode)}
          >
            {t('scheduleForLater')}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export default StreamSettings;
