'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, Camera, Instagram, Twitter, Youtube, MessageCircle, Loader2, CheckCircle2, Store } from 'lucide-react';
import { Input, Button } from '@/components/ui';

export function ProfileForm() {
  const t = useTranslations('admin.settings');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialTwitter, setSocialTwitter] = useState('');
  const [socialYoutube, setSocialYoutube] = useState('');
  const [socialLine, setSocialLine] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load store profile
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/stores/profile');
        const data = await res.json();
        if (res.ok) {
          setName(data.name || '');
          setDescription(data.description || '');
          setLogoUrl(data.logoUrl || '');
          setContactEmail(data.contactEmail || '');
          setContactPhone(data.contactPhone || '');
          setSocialInstagram(data.socialInstagram || '');
          setSocialTwitter(data.socialTwitter || '');
          setSocialYoutube(data.socialYoutube || '');
          setSocialLine(data.socialLine || '');
        }
      } catch {
        setError('読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'logos');

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setLogoUrl(data.url);
      }
    } catch {
      setError('ロゴのアップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  // Save profile
  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch('/api/stores/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          logoUrl,
          contactEmail,
          contactPhone,
          socialInstagram,
          socialTwitter,
          socialYoutube,
          socialLine,
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError('保存に失敗しました');
      }
    } catch {
      setError('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-6">
      {/* Logo Section */}
      <div className="flex items-start gap-6 mb-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-[var(--radius-md)] bg-[var(--color-bg-element)] flex items-center justify-center overflow-hidden border border-[var(--color-line)]">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Store size={32} className="text-[var(--color-text-label)]" />
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-[var(--color-accent)] rounded-full flex items-center justify-center text-white"
          >
            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          </button>
        </div>
        <div>
          <h4 className="font-medium text-[var(--color-title-active)] mb-1">{t('shopLogo')}</h4>
          <p className="text-sm text-[var(--color-text-label)] mb-3">
            {t('logoUploadHint')}
          </p>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Upload size={14} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {logoUrl ? t('changeLogo') : t('uploadLogo')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleLogoUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Shop Name */}
      <div className="mb-6">
        <Input
          label={t('shopName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ショップ名を入力"
        />
      </div>

      {/* Description */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[var(--color-text-body)] mb-1.5">
          {t('shopDescription')}
        </label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('enterShopDescription')}
          className="w-full px-4 py-2.5 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
        />
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Input
          label={t('contactEmail')}
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="info@example.com"
        />
        <Input
          label={t('contactPhone')}
          type="tel"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          placeholder="+81 90 1234 5678"
        />
      </div>

      {/* Social Links */}
      <div className="mb-8">
        <h4 className="text-sm font-medium text-[var(--color-text-body)] mb-4">
          {t('socialLinks')}
        </h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Instagram size={20} className="text-pink-600 flex-shrink-0" />
            <input
              type="url"
              value={socialInstagram}
              onChange={(e) => setSocialInstagram(e.target.value)}
              placeholder="https://instagram.com/yourshop"
              className="flex-1 px-4 py-2.5 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div className="flex items-center gap-3">
            <Twitter size={20} className="text-gray-800 flex-shrink-0" />
            <input
              type="url"
              value={socialTwitter}
              onChange={(e) => setSocialTwitter(e.target.value)}
              placeholder="https://x.com/yourshop"
              className="flex-1 px-4 py-2.5 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div className="flex items-center gap-3">
            <Youtube size={20} className="text-red-600 flex-shrink-0" />
            <input
              type="url"
              value={socialYoutube}
              onChange={(e) => setSocialYoutube(e.target.value)}
              placeholder="https://youtube.com/@yourshop"
              className="flex-1 px-4 py-2.5 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div className="flex items-center gap-3">
            <MessageCircle size={20} className="text-green-600 flex-shrink-0" />
            <input
              type="url"
              value={socialLine}
              onChange={(e) => setSocialLine(e.target.value)}
              placeholder="https://line.me/R/ti/p/@yourshop"
              className="flex-1 px-4 py-2.5 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-green-50 text-green-600 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} />
          {t('saved')}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button variant="primary" size="lg" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
          {t('saveChanges')}
        </Button>
      </div>
    </div>
  );
}

export default ProfileForm;
