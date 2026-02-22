'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Radio, Calendar } from 'lucide-react';
import { Input, Select, Button } from '@/components/ui';

const categoryOptions = [
  { value: 'fashion', label: 'Fashion' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'accessories', label: 'Accessories' },
];

interface StreamSettingsProps {
  onGoLive: () => void;
  isLive: boolean;
}

export function StreamSettings({ onGoLive, isLive }: StreamSettingsProps) {
  const t = useTranslations('admin.live');
  const [scheduleMode, setScheduleMode] = useState(false);

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
        />
        <Select
          label={t('streamCategory')}
          options={categoryOptions}
          placeholder={t('selectCategory')}
        />

        {scheduleMode && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('date')}
              type="date"
            />
            <Input
              label={t('time')}
              type="time"
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          variant={isLive ? 'secondary' : 'primary'}
          size="lg"
          fullWidth
          leftIcon={<Radio size={18} />}
          onClick={onGoLive}
          className={isLive ? '' : 'bg-red-600 hover:bg-red-700'}
        >
          {isLive ? t('endStream') : t('goLive')}
        </Button>

        {!isLive && (
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
