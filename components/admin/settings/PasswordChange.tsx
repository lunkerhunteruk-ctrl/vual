'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { Input, Button } from '@/components/ui';

export function PasswordChange() {
  const t = useTranslations('admin.settings');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-6"
    >
      <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-6">
        {t('changePassword')}
      </h3>

      <div className="space-y-4 mb-6">
        <Input
          label={t('currentPassword')}
          type="password"
          placeholder={t('enterPassword')}
        />
        <Input
          label={t('newPassword')}
          type="password"
          placeholder={t('enterPassword')}
        />
        <Input
          label={t('reenterPassword')}
          type="password"
          placeholder={t('enterPassword')}
        />
      </div>

      <div className="flex items-center justify-between">
        <button className="flex items-center gap-1.5 text-sm text-[var(--color-accent)] hover:underline">
          <HelpCircle size={14} />
          {t('forgotPassword')}
        </button>
        <Button variant="primary">
          {t('saveChange')}
        </Button>
      </div>

      <div className="mt-6 pt-6 border-t border-[var(--color-line)]">
        <button className="flex items-center gap-1.5 text-sm text-[var(--color-text-label)] hover:text-[var(--color-accent)] transition-colors">
          <HelpCircle size={14} />
          {t('needHelp')}
        </button>
      </div>
    </motion.div>
  );
}

export default PasswordChange;
