'use client';

import { ChevronLeft, Globe } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

export default function SettingsPage() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${locale}/mypage`}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-element)] transition-colors"
        >
          <ChevronLeft size={20} className="text-[var(--color-title-active)]" />
        </Link>
        <h1 className="text-lg font-semibold text-[var(--color-title-active)]">
          {locale === 'ja' ? '設定' : 'Settings'}
        </h1>
      </div>

      {/* Language */}
      <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-lg)] overflow-hidden">
        <div className="px-4 py-3.5">
          <div className="flex items-center gap-3 mb-3">
            <Globe size={20} className="text-[var(--color-text-body)]" />
            <span className="text-sm text-[var(--color-title-active)]">
              {locale === 'ja' ? '言語' : 'Language'}
            </span>
          </div>
          <div className="flex gap-2 ml-8">
            <button
              onClick={() => switchLocale('ja')}
              className={`px-4 py-2 text-sm rounded-[var(--radius-md)] transition-colors ${
                locale === 'ja'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'border border-[var(--color-line)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)]'
              }`}
            >
              日本語
            </button>
            <button
              onClick={() => switchLocale('en')}
              className={`px-4 py-2 text-sm rounded-[var(--radius-md)] transition-colors ${
                locale === 'en'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'border border-[var(--color-line)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)]'
              }`}
            >
              English
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
