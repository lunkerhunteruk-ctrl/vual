'use client';

import { useLocale } from 'next-intl';
import { Instagram, Twitter, Youtube, MessageCircle } from 'lucide-react';
import { useStoreContext } from '@/lib/store/store-context';

export default function AboutPage() {
  const locale = useLocale();
  const { store } = useStoreContext();

  const shopName = store?.name || 'Shop';

  const socialLinks = [
    { url: store?.socialInstagram, icon: Instagram, label: 'Instagram', color: 'text-pink-600' },
    { url: store?.socialTwitter, icon: Twitter, label: 'X (Twitter)', color: 'text-gray-800' },
    { url: store?.socialYoutube, icon: Youtube, label: 'YouTube', color: 'text-red-600' },
    { url: store?.socialLine, icon: MessageCircle, label: 'LINE', color: 'text-green-600' },
  ].filter(l => l.url);

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="px-4 py-6 text-center border-b border-[var(--color-line)]">
        <h1 className="text-lg font-medium tracking-[0.1em] text-[var(--color-title-active)]">
          {shopName}{locale === 'ja' ? 'について' : ` About`}
        </h1>
        <div className="w-12 h-0.5 bg-[var(--color-title-active)] mx-auto mt-2" />
      </div>

      {/* Logo */}
      {store?.logoUrl && (
        <div className="flex justify-center px-4 py-8">
          <div className="w-32 h-32 rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-line)] bg-white flex items-center justify-center">
            <img src={store.logoUrl} alt={shopName} className="w-full h-full object-contain" />
          </div>
        </div>
      )}

      {/* Description */}
      <section className="px-4 py-6">
        {store?.description ? (
          <p className="text-sm leading-relaxed text-[var(--color-text-body)] whitespace-pre-line">
            {store.description}
          </p>
        ) : (
          <p className="text-sm text-[var(--color-text-label)] text-center py-8">
            {locale === 'ja' ? '準備中です' : 'Coming soon'}
          </p>
        )}
      </section>

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
    </div>
  );
}
