'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Twitter, Instagram, Youtube, Mail, Phone, Clock } from 'lucide-react';
import { useHasBlogPosts, useHasLiveStreams } from '@/lib/hooks';

export function CustomerFooter() {
  const locale = useLocale();
  const t = useTranslations('customer.footer');
  const { hasPosts } = useHasBlogPosts();
  const { hasStreams } = useHasLiveStreams();

  return (
    <footer className="bg-white border-t border-[var(--color-line)] mt-auto">
      <div className="px-6 py-10">
        {/* Social Links */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <a
            href="#"
            className="p-3 rounded-full bg-[var(--color-bg-element)] hover:bg-[var(--color-bg-input)] transition-colors"
            aria-label="Twitter"
          >
            <Twitter size={20} className="text-[var(--color-text-body)]" />
          </a>
          <a
            href="#"
            className="p-3 rounded-full bg-[var(--color-bg-element)] hover:bg-[var(--color-bg-input)] transition-colors"
            aria-label="Instagram"
          >
            <Instagram size={20} className="text-[var(--color-text-body)]" />
          </a>
          <a
            href="#"
            className="p-3 rounded-full bg-[var(--color-bg-element)] hover:bg-[var(--color-bg-input)] transition-colors"
            aria-label="YouTube"
          >
            <Youtube size={20} className="text-[var(--color-text-body)]" />
          </a>
        </div>

        {/* Contact Info */}
        <div className="text-center mb-8">
          <p className="text-sm text-[var(--color-text-body)] mb-2">
            support@vual.design
          </p>
          <p className="text-sm text-[var(--color-text-body)] mb-2">
            +81 90 1234 5678
          </p>
          <p className="text-xs text-[var(--color-text-label)]">
            08:00 - 22:00 - Everyday
          </p>
        </div>

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
          {/* Blog link - only show if there are published posts */}
          {hasPosts && (
            <Link
              href={`/${locale}/blog`}
              className="text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)] transition-colors"
            >
              {t('blog')}
            </Link>
          )}
          {/* Live link - only show if there are live/scheduled streams */}
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
          Copyright© VUAL. {t('allRightsReserved')}
        </p>
      </div>
    </footer>
  );
}

export default CustomerFooter;
