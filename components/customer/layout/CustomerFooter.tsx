'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Twitter, Instagram, Youtube } from 'lucide-react';
import { useHasBlogPosts, useHasLiveStreams } from '@/lib/hooks';
import { useStoreContext } from '@/lib/store/store-context';

export function CustomerFooter() {
  const locale = useLocale();
  const t = useTranslations('customer.footer');
  const { store } = useStoreContext();
  const { hasPosts } = useHasBlogPosts();
  const { hasStreams } = useHasLiveStreams();

  const hasSocial = store?.socialTwitter || store?.socialInstagram || store?.socialYoutube;
  const hasContact = store?.contactEmail || store?.contactPhone;

  return (
    <footer className="bg-white border-t border-[var(--color-line)] mt-auto">
      <div className="px-6 py-10">
        {/* Social Links */}
        {hasSocial && (
          <div className="flex items-center justify-center gap-4 mb-8">
            {store?.socialTwitter && (
              <a
                href={store.socialTwitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-full bg-[var(--color-bg-element)] hover:bg-[var(--color-bg-input)] transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={20} className="text-[var(--color-text-body)]" />
              </a>
            )}
            {store?.socialInstagram && (
              <a
                href={store.socialInstagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-full bg-[var(--color-bg-element)] hover:bg-[var(--color-bg-input)] transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} className="text-[var(--color-text-body)]" />
              </a>
            )}
            {store?.socialYoutube && (
              <a
                href={store.socialYoutube}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-full bg-[var(--color-bg-element)] hover:bg-[var(--color-bg-input)] transition-colors"
                aria-label="YouTube"
              >
                <Youtube size={20} className="text-[var(--color-text-body)]" />
              </a>
            )}
          </div>
        )}

        {/* Contact Info */}
        {hasContact && (
          <div className="text-center mb-8">
            {store?.contactEmail && (
              <p className="text-sm text-[var(--color-text-body)] mb-2">
                {store.contactEmail}
              </p>
            )}
            {store?.contactPhone && (
              <p className="text-sm text-[var(--color-text-body)] mb-2">
                {store.contactPhone}
              </p>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="w-12 h-px bg-[var(--color-line)] mx-auto mb-8" />

        {/* Links */}
        <nav className="flex items-center justify-center gap-6 mb-8">
          <Link
            href={`/${locale}/about`}
            className="text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)] transition-colors"
          >
            {t('about')}
          </Link>
          <Link
            href={`/${locale}/contact`}
            className="text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)] transition-colors"
          >
            {t('contact')}
          </Link>
          {hasPosts && (
            <Link
              href={`/${locale}/blog`}
              className="text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)] transition-colors"
            >
              {t('blog')}
            </Link>
          )}
          {hasStreams && (
            <Link
              href={`/${locale}/live`}
              className="text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)] transition-colors"
            >
              {t('live')}
            </Link>
          )}
        </nav>

        {/* Copyright */}
        <p className="text-center text-xs text-[var(--color-text-label)]">
          Copyright© {store?.name || 'VUAL'}. {t('allRightsReserved')}
        </p>
      </div>
    </footer>
  );
}

export default CustomerFooter;
