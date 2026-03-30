import { useTranslations } from 'next-intl';

export default function ShopifyTermsPage() {
  const t = useTranslations('shopify.terms');

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{t('title')}</h1>
        <p className="text-sm text-zinc-500 mb-12">{t('lastUpdated')}</p>

        <div className="space-y-10 text-sm leading-relaxed text-zinc-700">
          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('acceptance.heading')}</h2>
            <p>{t('acceptance.body')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('service.heading')}</h2>
            <p>{t('service.body')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('credits.heading')}</h2>
            <p>{t('credits.body')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('content.heading')}</h2>
            <p>{t('content.body')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('ip.heading')}</h2>
            <p>{t('ip.body')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('liability.heading')}</h2>
            <p>{t('liability.body')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('termination.heading')}</h2>
            <p>{t('termination.body')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('governing.heading')}</h2>
            <p>{t('governing.body')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('contact.heading')}</h2>
            <p>{t('contact.body')}</p>
            <div className="mt-3 text-zinc-600">
              <p>LUFIS Co., Ltd.</p>
              <p>1-1-22, Tokuyoshi-minami, Kokuraminami-ku, Kitakyushu, Fukuoka, Japan</p>
              <p>info@lufis.co.jp</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
