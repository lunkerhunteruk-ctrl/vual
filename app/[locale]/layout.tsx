import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { locales, Locale } from '@/i18n';
import { resolveStore, STORE_SLUG_COOKIE } from '@/lib/store-resolver';
import { StoreProvider } from '@/components/providers/StoreProvider';
import { ToastContainer } from '@/components/ui/Toast';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages();
  const store = await resolveStore();
  const cookieStore = await cookies();
  const isRootDomain = !cookieStore.get(STORE_SLUG_COOKIE)?.value;

  return (
    <NextIntlClientProvider messages={messages}>
      <StoreProvider store={store} isRootDomain={isRootDomain}>
        {children}
        <ToastContainer />
      </StoreProvider>
    </NextIntlClientProvider>
  );
}
