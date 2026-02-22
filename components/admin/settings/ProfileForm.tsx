'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Upload, Camera, Instagram, Twitter, Facebook } from 'lucide-react';
import { Input, Button } from '@/components/ui';

export function ProfileForm() {
  const t = useTranslations('admin.settings');
  const [avatarUrl, setAvatarUrl] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-6"
    >
      <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-6">
        {t('profileUpdate')}
      </h3>

      {/* Avatar Section */}
      <div className="flex items-start gap-6 mb-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-medium text-[var(--color-text-label)]">AD</span>
            )}
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-[var(--color-accent)] rounded-full flex items-center justify-center text-white">
            <Camera size={14} />
          </button>
        </div>
        <div>
          <h4 className="font-medium text-[var(--color-title-active)] mb-1">Profile Photo</h4>
          <p className="text-sm text-[var(--color-text-label)] mb-3">
            Upload a new avatar. JPG, GIF or PNG. Max 2MB.
          </p>
          <Button variant="secondary" size="sm" leftIcon={<Upload size={14} />}>
            {t('uploadNew')}
          </Button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Input label={t('firstName')} placeholder="Enter first name" defaultValue="Admin" />
        <Input label={t('lastName')} placeholder="Enter last name" defaultValue="User" />
        <Input label={t('email')} type="email" placeholder="Enter email" defaultValue="admin@vual.com" />
        <Input label={t('phoneNumber')} type="tel" placeholder="Enter phone number" defaultValue="+1 234 567 8901" />
        <Input label={t('dateOfBirth')} type="date" />
        <Input label={t('location')} placeholder="Enter location" defaultValue="Tokyo, Japan" />
      </div>

      {/* Biography */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-[var(--color-text-body)] mb-1.5">
          {t('biography')}
        </label>
        <textarea
          rows={4}
          placeholder={t('enterBiography')}
          className="w-full px-4 py-2.5 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
        />
      </div>

      {/* Linked Accounts */}
      <div className="mb-8">
        <h4 className="text-sm font-medium text-[var(--color-text-body)] mb-4">
          {t('linkedAccounts')}
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-[var(--color-bg-element)] rounded-[var(--radius-md)]">
            <div className="flex items-center gap-3">
              <Instagram size={20} className="text-pink-600" />
              <span className="text-sm text-[var(--color-text-body)]">Instagram</span>
            </div>
            <Button variant="ghost" size="sm">Connect</Button>
          </div>
          <div className="flex items-center justify-between p-4 bg-[var(--color-bg-element)] rounded-[var(--radius-md)]">
            <div className="flex items-center gap-3">
              <Twitter size={20} className="text-blue-500" />
              <span className="text-sm text-[var(--color-text-body)]">Twitter</span>
            </div>
            <Button variant="ghost" size="sm">Connect</Button>
          </div>
          <div className="flex items-center justify-between p-4 bg-[var(--color-bg-element)] rounded-[var(--radius-md)]">
            <div className="flex items-center gap-3">
              <Facebook size={20} className="text-blue-700" />
              <span className="text-sm text-[var(--color-text-body)]">Facebook</span>
            </div>
            <Button variant="ghost" size="sm">Connect</Button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button variant="primary" size="lg">
          {t('saveChanges')}
        </Button>
      </div>
    </motion.div>
  );
}

export default ProfileForm;
