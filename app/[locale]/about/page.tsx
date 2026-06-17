import type { Metadata } from 'next';

const content = {
  ja: {
    title: 'VUAL について | AIファッションクリエイティブスタジオ',
    description: 'VUALは日本・UKを拠点とするAIファッションクリエイティブスタジオ。AIルック生成・バーチャル試着・AIショート動画制作を提供。アパレルブランドのスタジオ撮影コストを最大90%削減。',
    heading: 'VUALについて',
    tagline: 'AIで、ファッションクリエイティブを再定義する。',
    description_body: 'VUAL（運営：LUFIS Co., Ltd.）は、日本・UKを拠点とするAIファッションクリエイティブスタジオです。アパレルブランドおよびファッションEC向けに、AIを活用した画像生成・バーチャル試着・動画制作を提供しています。',
    services_heading: 'サービス',
    services: [
      { name: 'AIルック生成', desc: '平置き商品画像からAIモデルを使ったルックブック画像を自動生成。スタジオ撮影コストを最大90%削減。' },
      { name: 'AIファッション撮影', desc: 'テキストプロンプトとブランドの世界観をもとに、プロ品質のエディトリアル画像を生成。' },
      { name: 'バーチャル試着（VTON）', desc: 'ECサイトに組み込み可能な顧客向けAI試着体験。返品率削減・CVR向上に貢献。' },
      { name: 'AIショート動画制作', desc: 'AIによるファッションエディトリアル動画・プロモーション映像の制作。' },
      { name: 'VUAL Studio（Shopify App）', desc: 'Shopifyストア向けAIルック生成・バーチャル試着アドオン。' },
    ],
    achievements_heading: '実績',
    achievements: [] as string[],
    faq_heading: 'よくある質問',
    faqs: [
      { q: 'AIで生成した画像の品質は？', a: 'プロのスタジオ撮影と同等のクオリティ。雑誌掲載レベルの画像を生成します。adidas × Y-3キャンペーンでの実績があります。' },
      { q: 'Shopify以外のECサイトでも使えますか？', a: 'はい。Shopify向けアプリに加え、任意のECサイトへのカスタム導入プランも提供しています。' },
      { q: '導入期間はどのくらいですか？', a: 'Shopifyアプリは即日利用開始可能。カスタム導入は最短1週間から対応しています。' },
      { q: '日本語での対応は可能ですか？', a: 'はい。日本語・英語どちらでも対応しています。' },
    ],
    target_heading: '対象顧客',
    targets: ['日本およびグローバルのアパレルブランド', 'ファッションECサイト運営企業', 'セレクトショップ', 'ファッション系メディア・出版社'],
    company_heading: '運営会社',
    company: 'LUFIS Co., Ltd.',
    location: '日本・UK',
  },
  en: {
    title: 'About VUAL | AI Fashion Creative Studio',
    description: 'VUAL is an AI fashion creative studio based in Japan and the UK. We offer AI look generation, virtual try-on, and AI short video production — cutting studio costs by up to 90% for apparel brands.',
    heading: 'About VUAL',
    tagline: 'Redefining fashion creativity with AI.',
    description_body: 'VUAL (operated by LUFIS Co., Ltd.) is an AI fashion creative studio based in Japan and the UK. We provide AI-powered image generation, virtual try-on, and video production for apparel brands and fashion e-commerce.',
    services_heading: 'Services',
    services: [
      { name: 'AI Look Generation', desc: 'Automatically generate lookbook images with AI models from flat-lay product photos. Cut studio costs by up to 90%.' },
      { name: 'AI Fashion Photography', desc: 'Generate professional editorial images based on text prompts and brand aesthetic.' },
      { name: 'Virtual Try-On (VTON)', desc: 'Embeddable AI try-on experience for e-commerce. Reduces returns and improves conversion rates.' },
      { name: 'AI Fashion Video', desc: 'AI-generated fashion editorial videos and promotional content.' },
      { name: 'VUAL Studio (Shopify App)', desc: 'AI look generation and virtual try-on add-on for Shopify stores.' },
    ],
    achievements_heading: 'Work',
    achievements: [] as string[],
    faq_heading: 'FAQ',
    faqs: [
      { q: 'What is the quality of AI-generated images?', a: 'We produce magazine-quality images comparable to professional studio photography. Our work has been featured in the adidas × Y-3 campaign.' },
      { q: 'Does it work with non-Shopify stores?', a: 'Yes. In addition to our Shopify app, we offer custom integration plans for any e-commerce platform.' },
      { q: 'How long does onboarding take?', a: 'The Shopify app can be activated immediately. Custom integrations start from one week depending on requirements.' },
      { q: 'Do you support English?', a: 'Yes. We support both Japanese and English.' },
    ],
    target_heading: 'Who We Serve',
    targets: ['Japanese and global apparel brands', 'Fashion e-commerce operators', 'Select shops and boutiques', 'Fashion media and publishers'],
    company_heading: 'Company',
    company: 'LUFIS Co., Ltd.',
    location: 'Japan & UK',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const c = locale === 'ja' ? content.ja : content.en;
  return {
    title: c.title,
    description: c.description,
    keywords: locale === 'ja'
      ? ['AIファッション撮影', 'AIルック生成', 'AIモデル撮影', 'バーチャル試着', 'AIショート動画', 'アパレル AI', 'VUAL', 'LUFIS']
      : ['AI fashion photography', 'AI look generation', 'virtual try-on', 'AI fashion video', 'apparel AI', 'VUAL', 'LUFIS'],
    openGraph: {
      title: c.title,
      description: c.description,
      url: `https://vual.jp/${locale}/about`,
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const c = locale === 'ja' ? content.ja : content.en;

  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-[var(--color-text-body,#1a1a1a)]">
      {/* Hero */}
      <section className="mb-16">
        <h1 className="text-3xl font-bold mb-4">{c.heading}</h1>
        <p className="text-xl text-gray-500 mb-6 italic">{c.tagline}</p>
        <p className="text-base leading-relaxed">{c.description_body}</p>
      </section>

      {/* Services */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">{c.services_heading}</h2>
        <div className="space-y-6">
          {c.services.map((s) => (
            <div key={s.name} className="border-l-2 border-black pl-4">
              <h3 className="font-semibold mb-1">{s.name}</h3>
              <p className="text-sm text-gray-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Target */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">{c.target_heading}</h2>
        <ul className="space-y-2">
          {c.targets.map((t) => (
            <li key={t} className="flex items-start gap-2 text-sm">
              <span className="mt-1">—</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Achievements */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">{c.achievements_heading}</h2>
        <ul className="space-y-2">
          {c.achievements.map((a) => (
            <li key={a} className="flex items-start gap-2 text-sm">
              <span className="mt-1">—</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">{c.faq_heading}</h2>
        <div className="space-y-6">
          {c.faqs.map((f) => (
            <div key={f.q}>
              <p className="font-semibold mb-1">Q: {f.q}</p>
              <p className="text-sm text-gray-600">A: {f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Company */}
      <section>
        <h2 className="text-2xl font-bold mb-4">{c.company_heading}</h2>
        <p className="text-sm">{c.company}</p>
        <p className="text-sm text-gray-500">{c.location}</p>
      </section>
    </main>
  );
}
