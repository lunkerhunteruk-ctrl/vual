'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Mail, Phone, MessageCircle, ChevronRight, Instagram, Twitter, Youtube } from 'lucide-react';
import { useStoreContext } from '@/lib/store/store-context';

export default function ContactPage() {
  const locale = useLocale();
  const { store } = useStoreContext();
  const [lineBotId, setLineBotId] = useState<string | null>(null);

  const contactEmail = store?.contactEmail;
  const contactPhone = store?.contactPhone;

  // Fetch LINE bot ID for friend add button
  useEffect(() => {
    fetch('/api/stores/line')
      .then(res => res.json())
      .then(data => {
        if (data.lineBotBasicId) setLineBotId(data.lineBotBasicId);
      })
      .catch(() => {});
  }, []);

  const socialLinks = [
    { url: store?.socialInstagram, icon: Instagram, label: 'Instagram', color: 'text-pink-600' },
    { url: store?.socialTwitter, icon: Twitter, label: 'X (Twitter)', color: 'text-gray-800' },
    { url: store?.socialYoutube, icon: Youtube, label: 'YouTube', color: 'text-red-600' },
  ].filter(l => l.url);

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="px-4 py-6 text-center border-b border-[var(--color-line)]">
        <h1 className="text-lg font-medium tracking-[0.1em] text-[var(--color-title-active)]">
          {locale === 'ja' ? 'お問い合わせ' : 'Contact Us'}
        </h1>
        <div className="w-12 h-0.5 bg-[var(--color-title-active)] mx-auto mt-2" />
      </div>

      {/* LINE Friend Add */}
      {lineBotId && (
        <section className="px-4 pt-6">
          <a
            href={`https://line.me/R/ti/p/${lineBotId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-[var(--radius-lg)] text-white"
            style={{ backgroundColor: '#06C755' }}
          >
            <MessageCircle size={24} />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {locale === 'ja' ? 'LINEでお問い合わせ' : 'Contact via LINE'}
              </p>
              <p className="text-xs opacity-80">
                {locale === 'ja' ? '友だち追加してメッセージを送れます' : 'Add as friend to send messages'}
              </p>
            </div>
            <ChevronRight size={18} className="opacity-80" />
          </a>
        </section>
      )}

      {/* Contact Info */}
      {(contactEmail || contactPhone) && (
        <section className="px-4 py-6">
          <h2 className="text-sm font-medium text-[var(--color-title-active)] mb-4">
            {locale === 'ja' ? '連絡先' : 'Contact Info'}
          </h2>
          <div className="space-y-3">
            {contactEmail && (
              <a
                href={`mailto:${contactEmail}`}
                className="flex items-center gap-3 p-3 bg-[var(--color-bg-element)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-input)] transition-colors"
              >
                <Mail size={18} className="text-[var(--color-accent)] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[var(--color-text-label)]">
                    {locale === 'ja' ? 'メール' : 'Email'}
                  </p>
                  <p className="text-sm text-[var(--color-text-body)]">{contactEmail}</p>
                </div>
              </a>
            )}
            {contactPhone && (
              <a
                href={`tel:${contactPhone.replace(/\s/g, '')}`}
                className="flex items-center gap-3 p-3 bg-[var(--color-bg-element)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-input)] transition-colors"
              >
                <Phone size={18} className="text-[var(--color-accent)] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[var(--color-text-label)]">
                    {locale === 'ja' ? '電話' : 'Phone'}
                  </p>
                  <p className="text-sm text-[var(--color-text-body)]">{contactPhone}</p>
                </div>
              </a>
            )}
          </div>
        </section>
      )}

      {/* Social Links */}
      {socialLinks.length > 0 && (
        <section className="px-4 py-6 border-t border-[var(--color-line)]">
          <h2 className="text-sm font-medium text-[var(--color-title-active)] text-center mb-4">
            {locale === 'ja' ? 'ソーシャルメディア' : 'Follow Us'}
          </h2>
          <div className="flex items-center justify-center gap-4">
            {socialLinks.map(({ url, icon: Icon, label, color }) => (
              <a
                key={label}
                href={url!}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-full bg-[var(--color-bg-element)] hover:bg-[var(--color-bg-input)] transition-colors"
                aria-label={label}
              >
                <Icon size={20} className={color} />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!lineBotId && !contactEmail && !contactPhone && socialLinks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Mail size={48} className="text-[var(--color-text-label)] mb-4" />
          <p className="text-sm text-[var(--color-text-label)]">
            {locale === 'ja' ? '連絡先情報は準備中です' : 'Contact information coming soon'}
          </p>
        </div>
      )}
    </div>
  );
}
