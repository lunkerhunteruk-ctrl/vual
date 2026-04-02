'use client';

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Sparkles, Camera, ShoppingBag, Zap, Check, ChevronDown } from 'lucide-react';

// ============================================================
// Animation variants (shared with main LP)
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

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } },
};

// ============================================================
// Animated section wrapper
// ============================================================
function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
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
// Language toggle
// ============================================================
function LanguageToggle() {
  const locale = useLocale();
  const otherLocale = locale === 'ja' ? 'en' : 'ja';
  const label = locale === 'ja' ? 'EN' : 'JA';

  return (
    <Link
      href={`/${otherLocale}/shopify`}
      className="fixed top-5 right-5 z-50 px-4 py-2 text-xs font-medium tracking-wider rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-white/80 hover:bg-white/10 hover:text-white transition-all"
    >
      {label}
    </Link>
  );
}

// ============================================================
// Step card for "How it works"
// ============================================================
function StepCard({ number, title, description, icon: Icon }: {
  number: string;
  title: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <motion.div variants={fadeUp} className="flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-5">
        <Icon size={24} className="text-emerald-400" />
      </div>
      <span className="text-xs font-mono text-[#8a7a9b] tracking-widest mb-2">{number}</span>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-[#a89bb8] leading-relaxed max-w-xs">{description}</p>
    </motion.div>
  );
}

// ============================================================
// Pricing card
// ============================================================
function PricingCard({ plan, isPopular }: {
  plan: 'free' | 'starter' | 'growth' | 'pro';
  isPopular?: boolean;
}) {
  const t = useTranslations('shopify.pricing');
  const isFree = plan === 'free';

  return (
    <motion.div
      variants={fadeUp}
      className={`relative p-6 rounded-2xl border backdrop-blur-md transition-all ${
        isPopular
          ? 'border-emerald-400/40 bg-emerald-400/5'
          : 'border-white/10 bg-white/5'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-400 text-black text-xs font-semibold rounded-full">
          {t('popular')}
        </div>
      )}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{t(`${plan}.name`)}</h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-3xl font-bold text-white">${t(`${plan}.price`)}</span>
          {!isFree && <span className="text-sm text-[#8a7a9b]">{t('monthly')}</span>}
        </div>
      </div>
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Check size={14} className="text-emerald-400 shrink-0" />
          <span className="text-[#c8c0d4]">{t(`${plan}.credits`)} {t('points')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Check size={14} className="text-emerald-400 shrink-0" />
          <span className="text-[#c8c0d4]">{t(`${plan}.studio`)} {t('studioGen')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Check size={14} className="text-emerald-400 shrink-0" />
          <span className="text-[#c8c0d4]">{t(`${plan}.tryon`)} {t('tryOns')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Check size={14} className={`shrink-0 ${isFree ? 'text-[#6b5d7b]' : 'text-emerald-400'}`} />
          <span className="text-[#a89bb8]">
            {isFree
              ? t('noOverage')
              : `${t(`${plan}.overage`)} ${t('overage')} ${t('per3pt')}`
            }
          </span>
        </div>
        {isFree && (
          <p className="text-xs text-[#6b5d7b] italic mt-1">{t('free.note')}</p>
        )}
      </div>
      <a
        href="https://apps.shopify.com/"
        target="_blank"
        rel="noopener noreferrer"
        style={isPopular ? { color: '#111', backgroundColor: '#fff' } : undefined}
        className={`block w-full text-center py-3 rounded-full text-sm font-bold transition-all ${
          isPopular
            ? 'hover:opacity-90 shadow-lg shadow-white/10'
            : 'bg-white/15 text-white border border-white/20 hover:bg-white/25'
        }`}
      >
        {t('choosePlan')}
      </a>
    </motion.div>
  );
}

// ============================================================
// Main component
// ============================================================
export default function ShopifyLP() {
  const t = useTranslations('shopify');
  const locale = useLocale();

  return (
    <div
      className="relative bg-[#0d0a12] text-white overflow-x-hidden"
      style={{ '--color-title-active': '#f0edf5', '--color-text-body': '#c8c0d4' } as React.CSSProperties}
    >
      <LanguageToggle />

      {/* ── Aurora background ── */}
      <div className="fixed inset-0 -z-0 overflow-hidden">
        <div className="aurora-blob aurora-purple-1" />
        <div className="aurora-blob aurora-purple-2" />
        <div className="aurora-blob aurora-green-1" />
        <div className="aurora-blob aurora-green-2" />
        <div className="aurora-blob aurora-green-3" />
        <div className="aurora-blob aurora-cyan-1" />
        <div className="aurora-blob aurora-magenta-1" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />
      </div>

      <style>{`
        .aurora-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(130px);
          will-change: transform;
          mix-blend-mode: screen;
        }
        .aurora-purple-1 {
          width: 55vw; height: 55vw;
          top: -10%; left: -10%;
          background: radial-gradient(circle, #9333ea 0%, #6b21a8 35%, transparent 70%);
          animation: aP1 20s ease-in-out infinite;
        }
        .aurora-purple-2 {
          width: 45vw; height: 45vw;
          bottom: 5%; right: -5%;
          background: radial-gradient(circle, #7c3aed 0%, #4c1d95 40%, transparent 70%);
          animation: aP2 26s ease-in-out infinite;
        }
        .aurora-green-1 {
          width: 50vw; height: 50vw;
          top: 15%; right: -10%;
          background: radial-gradient(circle, #14f195 0%, #0ea47a 25%, #064e3b 50%, transparent 72%);
          animation: aG1 22s ease-in-out infinite;
        }
        .aurora-green-2 {
          width: 40vw; height: 40vw;
          bottom: 20%; left: 10%;
          background: radial-gradient(circle, #34d399 0%, #059669 30%, #064e3b 55%, transparent 72%);
          animation: aG2 18s ease-in-out infinite;
        }
        .aurora-green-3 {
          width: 35vw; height: 35vw;
          top: 55%; left: 40%;
          background: radial-gradient(circle, #10b981 0%, #047857 35%, transparent 65%);
          animation: aG3 24s ease-in-out infinite;
        }
        .aurora-cyan-1 {
          width: 38vw; height: 38vw;
          top: 35%; left: -5%;
          background: radial-gradient(circle, #22d3ee 0%, #0891b2 30%, #164e63 55%, transparent 72%);
          animation: aC1 21s ease-in-out infinite;
        }
        .aurora-magenta-1 {
          width: 42vw; height: 42vw;
          top: 60%; right: 10%;
          background: radial-gradient(circle, #e879f9 0%, #a855f7 30%, #581c87 55%, transparent 72%);
          animation: aM1 23s ease-in-out infinite;
        }
        @keyframes aP1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.28; }
          30% { transform: translate(12vw, 10vh) scale(1.2); opacity: 0.42; }
          60% { transform: translate(-8vw, 18vh) scale(0.85); opacity: 0.22; }
        }
        @keyframes aP2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.22; }
          45% { transform: translate(-15vw, -12vh) scale(1.15); opacity: 0.38; }
          75% { transform: translate(5vw, -5vh) scale(0.9); opacity: 0.18; }
        }
        @keyframes aG1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
          35% { transform: translate(-18vw, 8vh) scale(1.25); opacity: 0.38; }
          70% { transform: translate(-8vw, -10vh) scale(0.9); opacity: 0.15; }
        }
        @keyframes aG2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.18; }
          40% { transform: translate(14vw, -14vh) scale(1.15); opacity: 0.35; }
          80% { transform: translate(5vw, 8vh) scale(0.95); opacity: 0.12; }
        }
        @keyframes aG3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; }
          50% { transform: translate(-12vw, 10vh) scale(1.3); opacity: 0.3; }
        }
        @keyframes aC1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.18; }
          33% { transform: translate(10vw, 12vh) scale(1.1); opacity: 0.32; }
          66% { transform: translate(18vw, -5vh) scale(0.85); opacity: 0.12; }
        }
        @keyframes aM1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; }
          40% { transform: translate(-10vw, -15vh) scale(1.2); opacity: 0.3; }
          70% { transform: translate(8vw, 5vh) scale(0.9); opacity: 0.1; }
        }
      `}</style>

      {/* ======== HERO ======== */}
      <section className="relative z-10 pt-32 pb-16 px-6">
        <div className="text-center max-w-4xl mx-auto mb-12">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full border border-white/15 bg-white/5 backdrop-blur-md"
          >
            <Image src="/lp/shopify/shopify-logo.png" alt="Shopify" width={80} height={24} className="h-5 w-auto" />
            <span className="text-sm text-white/80 font-medium">{t('hero.badge')}</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight whitespace-pre-line mb-6"
          >
            {t('hero.title')}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-lg sm:text-xl text-[#a89bb8] max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            {t('hero.subtitle')}
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col items-center gap-3"
          >
            <a
              href="https://apps.shopify.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#111', backgroundColor: '#fff' }} className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold rounded-full hover:opacity-90 transition-all shadow-lg shadow-white/10"
            >
              {t('hero.cta')}
              <ArrowRight size={18} />
            </a>
            <span className="text-sm text-[#6b5d7b]">{t('hero.ctaSub')}</span>
          </motion.div>
        </div>

        {/* Featured video */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 1, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="max-w-5xl mx-auto rounded-2xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-sm shadow-2xl shadow-black/50"
        >
          <div className="relative aspect-video">
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="w-full h-full object-cover"
              src="/lp/shopify/hero.mp4"
            />
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="flex justify-center mt-12"
        >
          <ChevronDown size={24} className="text-white/30 animate-bounce" />
        </motion.div>
      </section>

      {/* ======== STUDIO SECTION ======== */}
      <AnimatedSection className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="mb-16">
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
              <span className="text-xs font-mono text-[#8a7a9b] tracking-widest">{t('studio.label')}</span>
              <span className="px-3 py-1 text-xs font-medium rounded-full border border-emerald-400/30 text-emerald-400 bg-emerald-400/5">
                {t('studio.badge')}
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t('studio.title')}
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-[#a89bb8] max-w-2xl leading-relaxed">
              {t('studio.description')}
            </motion.p>
          </div>

          {/* Screenshot */}
          <motion.div variants={scaleIn} className="mb-16 rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm">
            <div className="relative aspect-video">
              <Image
                src="/lp/shopify/studio.png"
                alt="VUAL Studio - Look Creation"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 80vw"
              />
            </div>
          </motion.div>

          {/* 3 steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <motion.div key={n} variants={fadeUp} className="text-center md:text-left">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 border border-white/10 text-emerald-400 text-sm font-bold mb-4">
                  {n}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{t(`studio.step${n}`)}</h3>
                <p className="text-sm text-[#a89bb8] leading-relaxed">{t(`studio.step${n}desc`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ======== RESULT SCREENSHOT ======== */}
      <AnimatedSection className="relative z-10 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={scaleIn} className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm">
            <div className="relative aspect-video">
              <Image
                src="/lp/shopify/result.png"
                alt="VUAL Studio - Generated Result"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 80vw"
              />
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ======== VTON SECTION ======== */}
      <AnimatedSection className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="mb-16">
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
              <span className="text-xs font-mono text-[#8a7a9b] tracking-widest">{t('tryon.label')}</span>
              <span className="px-3 py-1 text-xs font-medium rounded-full border border-purple-400/30 text-purple-400 bg-purple-400/5">
                {t('tryon.badge')}
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t('tryon.title')}
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-[#a89bb8] max-w-2xl leading-relaxed">
              {t('tryon.description')}
            </motion.p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Screenshot */}
            <motion.div variants={scaleIn} className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm">
              <div className="relative aspect-[4/3]">
                <Image
                  src="/lp/shopify/tryon.png"
                  alt="Virtual Try-On"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </motion.div>

            {/* Stats & features */}
            <div className="space-y-8">
              {/* Stats */}
              <motion.div variants={fadeUp} className="grid grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl border border-white/10 bg-white/5">
                  <p className="text-3xl font-bold text-emerald-400">{t('tryon.stat1value')}{t('tryon.stat1suffix')}</p>
                  <p className="text-sm text-[#a89bb8] mt-1">{t('tryon.stat1')}</p>
                </div>
                <div className="p-5 rounded-2xl border border-white/10 bg-white/5">
                  <p className="text-3xl font-bold text-purple-400">{t('tryon.stat2value')}{t('tryon.stat2suffix')}</p>
                  <p className="text-sm text-[#a89bb8] mt-1">{t('tryon.stat2')}</p>
                </div>
              </motion.div>

              {/* Feature list */}
              <motion.div variants={fadeUp} className="space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-emerald-400" />
                    </div>
                    <span className="text-sm text-[#c8c0d4]">{t(`tryon.feature${n}`)}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ======== HOW IT WORKS ======== */}
      <AnimatedSection className="relative z-10 py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-white mb-16">
            {t('how.title')}
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <StepCard number="01" title={t('how.step1')} description={t('how.step1desc')} icon={ShoppingBag} />
            <StepCard number="02" title={t('how.step2')} description={t('how.step2desc')} icon={Sparkles} />
            <StepCard number="03" title={t('how.step3')} description={t('how.step3desc')} icon={Zap} />
          </div>
        </div>
      </AnimatedSection>

      {/* ======== PRICING ======== */}
      <AnimatedSection className="relative z-10 py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t('pricing.title')}</h2>
            <p className="text-lg text-[#a89bb8]">{t('pricing.subtitle')}</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <PricingCard plan="free" />
            <PricingCard plan="starter" />
            <PricingCard plan="growth" isPopular />
            <PricingCard plan="pro" />
          </div>
        </div>
      </AnimatedSection>

      {/* ======== FINAL CTA ======== */}
      <AnimatedSection className="relative z-10 py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-white mb-6">
            {t('cta.title')}
          </motion.h2>
          <motion.p variants={fadeUp} className="text-lg text-[#a89bb8] mb-10 leading-relaxed">
            {t('cta.description')}
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col items-center gap-4">
            <a
              href="https://apps.shopify.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#111', backgroundColor: '#fff' }} className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold rounded-full hover:opacity-90 transition-all shadow-lg shadow-white/10"
            >
              {t('cta.button')}
              <ArrowRight size={18} />
            </a>
            <Link
              href={`/${locale}`}
              className="text-sm text-[#8a7a9b] hover:text-white transition-colors"
            >
              {t('cta.learnMore')}
            </Link>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ======== FOOTER ======== */}
      <footer className="relative z-10 py-12 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-[#6b5d7b]">
              <span>{t('footer.powered')}</span>
              <span className="font-semibold text-white">VUAL</span>
            </div>
            <span className="text-[#2a2035]">|</span>
            <Image src="/lp/shopify/shopify-logo.png" alt="Shopify" width={80} height={24} className="h-4 w-auto opacity-60" />
          </div>
          <div className="flex items-center gap-6 text-sm text-[#6b5d7b]">
            <Link href={`/${locale}/apps/vual/terms`} className="hover:text-white transition-colors">
              {t('footer.terms')}
            </Link>
            <Link href={`/${locale}/apps/vual/privacy`} className="hover:text-white transition-colors">
              {t('footer.privacy')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
