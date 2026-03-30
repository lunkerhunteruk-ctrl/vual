import { useTranslations } from 'next-intl';

export default function ShopifyPrivacyPage() {
  const t = useTranslations('shopify.privacy');

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{t('title')}</h1>
        <p className="text-sm text-zinc-500 mb-12">{t('lastUpdated')}</p>

        <div className="space-y-10 text-sm leading-relaxed text-zinc-700">
          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('intro.heading')}</h2>
            <p>{t('intro.body')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('dataCollected.heading')}</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t('dataCollected.item1')}</li>
              <li>{t('dataCollected.item2')}</li>
              <li>{t('dataCollected.item3')}</li>
              <li>{t('dataCollected.item4')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('purpose.heading')}</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t('purpose.item1')}</li>
              <li>{t('purpose.item2')}</li>
              <li>{t('purpose.item3')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('thirdParty.heading')}</h2>
            <p>{t('thirdParty.body')}</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>{t('thirdParty.item1')}</li>
              <li>{t('thirdParty.item2')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('retention.heading')}</h2>
            <p>{t('retention.body')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('customerData.heading')}</h2>
            <p>{t('customerData.body')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('rights.heading')}</h2>
            <p>{t('rights.body')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('security.heading')}</h2>
            <p>{t('security.body')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('changes.heading')}</h2>
            <p>{t('changes.body')}</p>
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
