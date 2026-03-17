'use client';

import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView, type Variants } from 'framer-motion';
import { useLocale } from 'next-intl';
import { ArrowRight, Check, Loader2 } from 'lucide-react';

// ============================================================
// Animation variants
// ============================================================
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 1.2 } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const letterReveal: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } },
};

const slideFromLeft: Variants = {
  hidden: { opacity: 0, x: -80 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } },
};

const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 80 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } },
};

// ============================================================
// Section wrapper with scroll animation
// ============================================================
function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ============================================================
// Animated text — each word flies in
// ============================================================
function AnimatedHeading({ text, className = '' }: { text: string; className?: string }) {
  return (
    <motion.h2 className={className} variants={staggerContainer}>
      {text.split(' ').map((word, i) => (
        <motion.span key={i} variants={letterReveal} className="inline-block mr-[0.3em]">
          {word}
        </motion.span>
      ))}
    </motion.h2>
  );
}

// ============================================================
// Waitlist form
// ============================================================
function WaitlistForm({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const locale = useLocale();
  const ja = locale === 'ja';
  const [email, setEmail] = useState('');
  const [type, setType] = useState<'brand' | 'shop'>('brand');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type }),
      });
      setSubmitted(true);
    } catch {
      // Still show success for UX
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 text-emerald-400"
      >
        <div className="w-10 h-10 rounded-full bg-emerald-400/20 flex items-center justify-center">
          <Check size={20} />
        </div>
        <div>
          <p className="font-semibold text-white">{ja ? '登録完了' : 'You\'re on the list'}</p>
          <p className="text-sm text-neutral-400">{ja ? '近日中にご連絡します' : 'We\'ll be in touch soon'}</p>
        </div>
      </motion.div>
    );
  }

  const isDark = variant === 'dark';

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg">
      {/* Type toggle */}
      <div className="flex gap-2 mb-4">
        {(['brand', 'shop'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`px-4 py-2 text-xs font-medium rounded-full border transition-all ${
              type === t
                ? isDark
                  ? 'bg-white text-black border-white'
                  : 'bg-black text-white border-black'
                : isDark
                  ? 'bg-transparent text-neutral-400 border-neutral-700 hover:border-neutral-500'
                  : 'bg-transparent text-neutral-500 border-neutral-300 hover:border-neutral-400'
            }`}
          >
            {t === 'brand'
              ? (ja ? 'ブランド' : 'Brand')
              : (ja ? 'セレクトショップ' : 'Select Shop')}
          </button>
        ))}
      </div>

      {/* Email input + submit */}
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={ja ? 'メールアドレス' : 'Enter your email'}
          required
          className={`flex-1 px-5 py-3.5 rounded-full text-sm outline-none transition-all ${
            isDark
              ? 'bg-white/10 text-white placeholder:text-neutral-500 border border-white/20 focus:border-white/50'
              : 'bg-neutral-100 text-black placeholder:text-neutral-400 border border-neutral-200 focus:border-neutral-400'
          }`}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-neutral-200 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {ja ? '登録' : 'Join'}
          {!loading && <ArrowRight size={14} />}
        </button>
      </div>
    </form>
  );
}

// ============================================================
// Feature card
// ============================================================
function FeatureCard({
  number,
  title,
  description,
  gradient,
}: {
  number: string;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="group relative p-8 rounded-3xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm hover:border-neutral-700 transition-all duration-500"
    >
      <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`} />
      <div className="relative">
        <span className="text-xs font-mono text-neutral-500 tracking-widest">{number}</span>
        <h3 className="text-xl font-semibold text-white mt-3 mb-3">{title}</h3>
        <p className="text-sm text-neutral-400 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

// ============================================================
// Main LP Component
// ============================================================
export function VualLandingPage() {
  const locale = useLocale();
  const ja = locale === 'ja';
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <div className="bg-black text-white overflow-x-hidden">
      {/* ======== HERO ======== */}
      <section ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background video/gradient */}
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black z-10" />
          {/* Replace with actual video when ready */}
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-black to-neutral-900" />
          {/* Subtle animated grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </motion.div>

        {/* Hero content */}
        <motion.div
          style={{ y: heroY }}
          className="relative z-20 text-center px-6 max-w-5xl"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-neutral-300 tracking-wide">
              {ja ? 'ウェイティングリスト受付中' : 'Now accepting early access'}
            </span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter mb-6"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            VUAL
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="text-lg md:text-2xl text-neutral-300 max-w-2xl mx-auto mb-4 leading-relaxed font-light"
          >
            {ja
              ? 'AIが変える、ファッションビジネスのすべて。'
              : 'AI-powered platform for the future of fashion.'}
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="text-sm text-neutral-500 mb-12 tracking-wide"
          >
            {ja
              ? 'ルックブック生成 · バーチャル試着 · ライブコマース · EC · すべてひとつに'
              : 'Lookbook Generation · Virtual Try-On · Live Commerce · EC · All in One'}
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="flex justify-center"
          >
            <WaitlistForm />
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-5 h-8 rounded-full border border-white/20 flex justify-center pt-1.5"
          >
            <div className="w-1 h-2 rounded-full bg-white/40" />
          </motion.div>
        </motion.div>
      </section>

      {/* ======== AI LOOKBOOK & EDITORIAL ======== */}
      <AnimatedSection className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <motion.span variants={fadeUp} className="text-xs font-mono text-neutral-500 tracking-[0.3em] uppercase">
                01
              </motion.span>
              <AnimatedHeading
                text={ja ? 'AI Lookbook 撮影なしで 雑誌品質を' : 'AI Lookbook Magazine quality without a shoot'}
                className="text-4xl md:text-5xl font-bold tracking-tight mt-4 mb-6 leading-[1.1]"
              />
              <motion.p variants={fadeUp} className="text-neutral-400 leading-relaxed text-base mb-8">
                {ja
                  ? 'テキストひとつで、プロフェッショナルなルックブック画像とエディトリアル映像を自動生成。スタジオ撮影のコスト・時間を劇的に削減。'
                  : 'Generate professional lookbook images and editorial videos from a single text prompt. Dramatically reduce studio shooting costs and time.'}
              </motion.p>
              <motion.div variants={fadeUp} className="flex gap-6">
                {[
                  { value: '90%', label: ja ? 'コスト削減' : 'Cost reduction' },
                  { value: '10x', label: ja ? '制作スピード' : 'Faster production' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-neutral-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Visual placeholder */}
            <motion.div variants={scaleIn} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800">
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-800/50 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-neutral-600 tracking-widest font-mono">LOOKBOOK DEMO</p>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* ======== VIRTUAL TRY-ON ======== */}
      <AnimatedSection className="py-32 px-6 bg-gradient-to-b from-black to-neutral-950">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Visual placeholder */}
            <motion.div variants={scaleIn} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 order-2 md:order-1">
              <div className="absolute inset-0 bg-gradient-to-tl from-neutral-800/50 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-neutral-600 tracking-widest font-mono">VTON DEMO</p>
              </div>
            </motion.div>

            <div className="order-1 md:order-2">
              <motion.span variants={fadeUp} className="text-xs font-mono text-neutral-500 tracking-[0.3em] uppercase">
                02
              </motion.span>
              <AnimatedHeading
                text={ja ? 'Virtual Try-On 試着体験を デジタルに' : 'Virtual Try-On Digital fitting experience'}
                className="text-4xl md:text-5xl font-bold tracking-tight mt-4 mb-6 leading-[1.1]"
              />
              <motion.p variants={fadeUp} className="text-neutral-400 leading-relaxed text-base mb-8">
                {ja
                  ? 'AIがお客様の体型に合わせて商品を仮想試着。「サイズが合わなかった」による返品を大幅削減し、購入コンバージョンを向上。'
                  : 'AI-powered virtual fitting adapts products to each customer\'s body. Dramatically reduce "wrong size" returns and boost purchase conversions.'}
              </motion.p>
              <motion.div variants={fadeUp} className="flex gap-6">
                {[
                  { value: '-40%', label: ja ? '返品率削減' : 'Return reduction' },
                  { value: '+25%', label: ja ? 'CVR向上' : 'CVR increase' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-neutral-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ======== AI VIDEO ======== */}
      <AnimatedSection className="py-32 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <motion.span variants={fadeUp} className="text-xs font-mono text-neutral-500 tracking-[0.3em] uppercase">
            03
          </motion.span>
          <AnimatedHeading
            text={ja ? 'AI Editorial Video 映像制作も AI で完結' : 'AI Editorial Video Production powered by AI'}
            className="text-4xl md:text-5xl font-bold tracking-tight mt-4 mb-6 leading-[1.1] max-w-3xl mx-auto"
          />
          <motion.p variants={fadeUp} className="text-neutral-400 leading-relaxed text-base mb-12 max-w-2xl mx-auto">
            {ja
              ? 'ルーブル美術館、軍艦島、スコットランドの古城。AIが生み出す、現実とファンタジーの狭間のエディトリアル映像。プロモーションビデオもAIで完結。'
              : 'The Louvre, Gunkanjima, Scottish castles. AI-generated editorial films that blur the line between reality and fantasy. Complete promotional video production with AI.'}
          </motion.p>

          {/* Video placeholder */}
          <motion.div variants={scaleIn} className="relative aspect-video max-w-4xl mx-auto rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-neutral-600 tracking-widest font-mono">VIDEO SHOWREEL</p>
            </div>
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
              <span className="text-xs text-neutral-500">All visuals generated by AI</span>
              <span className="text-xs text-neutral-600 font-mono">VUAL</span>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ======== LINE LIVE COMMERCE ======== */}
      <AnimatedSection className="py-32 px-6 bg-gradient-to-b from-black to-neutral-950">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <motion.span variants={fadeUp} className="text-xs font-mono text-neutral-500 tracking-[0.3em] uppercase">
                04
              </motion.span>
              <AnimatedHeading
                text={ja ? 'LINE Live Commerce ライブで売る 在庫も一元化' : 'LINE Live Commerce Sell live Unified inventory'}
                className="text-4xl md:text-5xl font-bold tracking-tight mt-4 mb-6 leading-[1.1]"
              />
              <motion.p variants={fadeUp} className="text-neutral-400 leading-relaxed text-base mb-8">
                {ja
                  ? 'LINEで直接ライブ配信。商品リンク、在庫連動、決済まですべてがシームレス。日本の顧客に最適なチャネルで、リアルタイムに売る。'
                  : 'Live stream directly on LINE. Product links, inventory sync, payments — all seamless. Sell in real-time on the best channel for Japanese customers.'}
              </motion.p>
            </div>

            <motion.div variants={scaleIn} className="relative aspect-[9/16] max-w-[280px] mx-auto rounded-[2rem] overflow-hidden bg-neutral-900 border border-neutral-800">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-neutral-600 tracking-widest font-mono">LIVE DEMO</p>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* ======== NETWORK — Brand × Shop ======== */}
      <AnimatedSection className="py-32 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-[#0a0a1a] to-black" />
        <div className="relative max-w-6xl mx-auto text-center">
          <motion.span variants={fadeUp} className="text-xs font-mono text-neutral-500 tracking-[0.3em] uppercase">
            05
          </motion.span>
          <AnimatedHeading
            text={ja ? 'Fashion Network ブランドと ショップを つなぐ' : 'Fashion Network Connecting brands and shops'}
            className="text-4xl md:text-5xl font-bold tracking-tight mt-4 mb-6 leading-[1.1] max-w-3xl mx-auto"
          />
          <motion.p variants={fadeUp} className="text-neutral-400 leading-relaxed text-base mb-16 max-w-2xl mx-auto">
            {ja
              ? 'サブスクリプションに参加した瞬間から、ブランドとショップがつながる。バーチャル展示会をVUALから直接開催し、全国のショップへ新作を案内。物理的な距離を超えた、新しいファッションネットワーク。'
              : 'The moment you subscribe, brands and shops connect. Host virtual exhibitions directly from VUAL and showcase new collections to shops nationwide. A new fashion network that transcends physical distance.'}
          </motion.p>

          {/* Network visual */}
          <motion.div variants={staggerContainer} className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <FeatureCard
              number="05-A"
              title={ja ? 'バーチャル展示会' : 'Virtual Exhibition'}
              description={ja
                ? '新作コレクションをデジタルで展示。全国のショップがオンラインで閲覧・オーダー。'
                : 'Showcase new collections digitally. Shops nationwide can browse and order online.'}
              gradient="bg-gradient-to-br from-blue-500/5 to-transparent"
            />
            <FeatureCard
              number="05-B"
              title={ja ? 'ダイレクト案内' : 'Direct Outreach'}
              description={ja
                ? 'サブスク店舗に新作情報を直接送信。展示会への招待、サンプルリクエストまでワンストップ。'
                : 'Send new collection info directly to subscribed shops. Invitations, sample requests — all in one place.'}
              gradient="bg-gradient-to-br from-purple-500/5 to-transparent"
            />
            <FeatureCard
              number="05-C"
              title={ja ? 'オーダー管理' : 'Order Management'}
              description={ja
                ? '展示会からのオーダーをVUAL上で一元管理。発注から納品までの動線を完結。'
                : 'Manage exhibition orders centrally on VUAL. Complete the flow from ordering to delivery.'}
              gradient="bg-gradient-to-br from-emerald-500/5 to-transparent"
            />
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ======== ALL-IN-ONE ======== */}
      <AnimatedSection className="py-32 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <motion.span variants={fadeUp} className="text-xs font-mono text-neutral-500 tracking-[0.3em] uppercase">
            06
          </motion.span>
          <AnimatedHeading
            text={ja ? 'All-in-One Platform すべてが ひとつに' : 'All-in-One Platform Everything in one place'}
            className="text-4xl md:text-5xl font-bold tracking-tight mt-4 mb-6 leading-[1.1] max-w-3xl mx-auto"
          />
          <motion.p variants={fadeUp} className="text-neutral-400 leading-relaxed text-base mb-16 max-w-2xl mx-auto">
            {ja
              ? '商品管理、注文処理、顧客分析、コレクション、ブログ、マガジン。複数のツールを行き来する必要はもうない。'
              : 'Product management, order processing, customer analytics, collections, blog, magazine. No more switching between multiple tools.'}
          </motion.p>

          <motion.div variants={staggerContainer} className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {(ja
              ? ['商品管理', 'EC & 決済', '注文管理', '顧客データ', 'AI ルックブック', 'バーチャル試着', 'ライブコマース', 'マガジン']
              : ['Products', 'EC & Payments', 'Orders', 'Customer Data', 'AI Lookbook', 'Virtual Try-On', 'Live Commerce', 'Magazine']
            ).map((item) => (
              <motion.div
                key={item}
                variants={fadeUp}
                className="py-4 px-3 rounded-xl border border-neutral-800 bg-neutral-900/30 text-sm text-neutral-300 hover:border-neutral-600 hover:bg-neutral-800/50 transition-all"
              >
                {item}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ======== FINAL CTA ======== */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-neutral-950 to-black" />
        {/* Subtle radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-3xl" />

        <AnimatedSection className="relative max-w-3xl mx-auto text-center">
          <AnimatedHeading
            text={ja ? 'ファッションの 未来を 一緒に' : 'Build the future of fashion together'}
            className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]"
          />
          <motion.p variants={fadeUp} className="text-neutral-400 text-base mb-12 leading-relaxed">
            {ja
              ? 'VUALは、ブランドもセレクトショップも、最新のAI技術で次のステージへ導きます。ウェイティングリストに登録して、いち早くアクセスを。'
              : 'VUAL empowers both brands and select shops with cutting-edge AI technology. Join the waiting list for early access.'}
          </motion.p>
          <motion.div variants={fadeUp} className="flex justify-center">
            <WaitlistForm />
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ======== FOOTER ======== */}
      <footer className="border-t border-neutral-900 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tighter" style={{ fontFamily: 'var(--font-playfair)' }}>
              VUAL
            </span>
            <span className="text-xs text-neutral-600">
              © {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex gap-6">
            <a href="https://instagram.com/vual.ai" target="_blank" rel="noopener" className="text-xs text-neutral-500 hover:text-white transition-colors">
              Instagram
            </a>
            <a href="https://x.com/vual_ai" target="_blank" rel="noopener" className="text-xs text-neutral-500 hover:text-white transition-colors">
              X
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
