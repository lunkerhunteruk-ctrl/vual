'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Stream } from '@cloudflare/stream-react';
import { Volume2, VolumeX } from 'lucide-react';

// ============================================================
// Constants
// ============================================================
const LP_MEDIA_BASE = 'https://lufis.net/vual';

// Hero video — Naica Mine on Cloudflare Stream
const HERO_STREAM_ID = '6ff799cd8547ed733d84ae06e3dc70e2';

// ============================================================
// Locale content
// ============================================================
const CONTENT = {
  ja: {
    manifesto: {
      heading: 'Dressing the world\'s\nuntouchable places.',
      body: 'UKと日本を拠点とするビジュアル・クリエイティブスタジオ。\n最先端のテクノロジーとシネマティックな視点を融合させ、\n現実と非現実の境界を曖昧にする映像体験を構築する。',
    },
    works: {
      sectionLabel: 'Selected Works',
    },
    talent: {
      sectionLabel: 'Entity_01',
    },
    capabilities: {
      sectionLabel: 'Capabilities',
      items: [
        'Art Direction',
        'Cinematic Video Production',
        'High-End Fashion Photography',
        'Entity Design & Management',
      ],
    },
    contact: {
      sectionLabel: 'Contact',
      inquiry: 'For inquiries and commissions',
      bases: 'UK / Japan',
    },
  },
  en: {
    manifesto: {
      heading: 'Dressing the world\'s\nuntouchable places.',
      body: 'A visual creative studio based in the UK and Japan.\nFusing cutting-edge technology with a cinematic eye\nto construct visual experiences that blur the line\nbetween the real and the unreal.',
    },
    works: {
      sectionLabel: 'Selected Works',
    },
    talent: {
      sectionLabel: 'Entity_01',
    },
    capabilities: {
      sectionLabel: 'Capabilities',
      items: [
        'Art Direction',
        'Cinematic Video Production',
        'High-End Fashion Photography',
        'Entity Design & Management',
      ],
    },
    contact: {
      sectionLabel: 'Contact',
      inquiry: 'For inquiries and commissions',
      bases: 'UK / Japan',
    },
  },
} as const;

// ============================================================
// Works data
// ============================================================
// Latest work — displayed full-width at the top of Selected Works
const LATEST_WORK = {
  id: 'naica-mine',
  title: '[ DATA_LOG ]',
  subtitle: '',
  location: 'Naica Mine, Chihuahua, Mexico',
  year: '2026',
  concept: 'LOCATION : NAICA MINE, CHIHUAHUA, MEXICO.\nENVIRONMENT : 50°C / 100% HUMIDITY.\nARCHIVE : BALENCIAGA A/W 2005.',
  conceptJa: 'LOCATION : NAICA MINE, CHIHUAHUA, MEXICO.\nENVIRONMENT : 50°C / 100% HUMIDITY.\nARCHIVE : BALENCIAGA A/W 2005.',
  thumbnail: 'https://customer-iachfaxtqeo2l99t.cloudflarestream.com/6ff799cd8547ed733d84ae06e3dc70e2/thumbnails/thumbnail.jpg?time=30s&width=1280',
  streamId: '6ff799cd8547ed733d84ae06e3dc70e2',
};

// Past works — displayed as grid below
const PAST_WORKS = [
  {
    id: 'eclipse',
    title: 'Eclipse',
    subtitle: '聖域の終焉',
    location: 'Inspired by Mont Saint-Michel, France',
    year: '2026',
    thumbnail: 'https://customer-iachfaxtqeo2l99t.cloudflarestream.com/ddbec5f627e61b18df34e561e0b81bcb/thumbnails/thumbnail.jpg?time=40s&width=1280',
    streamId: 'ddbec5f627e61b18df34e561e0b81bcb',
  },
  {
    id: 'shattered-utopia-vol1',
    title: 'The Shattered Utopia',
    subtitle: 'Vol.1',
    location: 'Buzludzha, Bulgaria',
    year: '2025',
    thumbnail: 'https://customer-iachfaxtqeo2l99t.cloudflarestream.com/368ea2f9115c8d848ce10f6a7e6f2868/thumbnails/thumbnail.jpg?time=15s&width=1280',
    streamId: '368ea2f9115c8d848ce10f6a7e6f2868',
  },
  {
    id: 'shattered-utopia-vol2',
    title: 'The Shattered Utopia',
    subtitle: 'Vol.2',
    location: 'Buzludzha, Bulgaria',
    year: '2025',
    thumbnail: 'https://customer-iachfaxtqeo2l99t.cloudflarestream.com/ad4459ed0dd133140df55ba6f8720509/thumbnails/thumbnail.jpg?time=22.5s&width=1280',
    streamId: 'ad4459ed0dd133140df55ba6f8720509',
  },
];

// ============================================================
// Talent data
// ============================================================
const TALENT = {
  name: 'RIN',
  height: '175cm',
  measurements: 'B80 / W59 / H86',
  images: [
    { src: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/lp/entity/01.jpg', logRight: '[ SYNC: //unverified.vual.jp ]' },
    { src: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/lp/entity/02.jpg', logRight: '[ MNT: //unverified.vual.jp/dump/ ]' },
    { src: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/lp/entity/03.jpg', logRight: '[ NODE: unverified.vual.jp ]' },
    { src: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/lp/entity/04.jpg', logRight: '[ OUT: //unverified.vual.jp ]' },
  ],
};

// ============================================================
// Animation variants
// ============================================================
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 1, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 1.2, ease: 'easeOut' as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

const lineReveal = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1, transition: { duration: 1.2, ease: [0.25, 0.1, 0.25, 1] as const } },
};

// ============================================================
// Reusable components
// ============================================================

function SectionLabel({ children }: { children: React.ReactNode }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  return (
    <motion.p
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={fadeIn}
      className="text-[11px] tracking-[0.35em] uppercase text-white/40 mb-12"
    >
      {children}
    </motion.p>
  );
}

function Divider() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={lineReveal}
      className="w-full h-px bg-white/10 origin-left"
    />
  );
}

// ============================================================
// HERO
// ============================================================
function HeroSection() {
  const ref = useRef(null);
  const [muted, setMuted] = useState(true);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  // Mute when scrolled away
  useEffect(() => {
    return scrollYProgress.on('change', (v) => {
      if (v > 0.5 && !muted) setMuted(true);
    });
  }, [scrollYProgress, muted]);

  return (
    <section ref={ref} className="relative h-screen w-full overflow-hidden">
      {/* Video background — Cloudflare Stream, covers viewport with no black bars */}
      <motion.div style={{ scale }} className="absolute inset-0">
        <div className="absolute inset-0 overflow-hidden hero-stream-cover">
          <Stream
            src={HERO_STREAM_ID}
            autoplay
            muted={muted}
            loop
            controls={false}
            responsive={false}
          />
        </div>
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/20" />
      </motion.div>

      {/* Logo — bottom left */}
      <motion.div
        style={{ opacity }}
        className="absolute bottom-16 left-8 md:left-12 z-10"
      >
        <motion.h1
          initial={{ opacity: 0, letterSpacing: '0.6em' }}
          animate={{ opacity: 1, letterSpacing: '0.35em' }}
          transition={{ duration: 2, ease: [0.25, 0.1, 0.25, 1], delay: 0.5 }}
          className="text-3xl md:text-5xl font-light text-white"
          style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
        >
          VUAL
        </motion.h1>
      </motion.div>

      {/* Sound toggle */}
      <button
        onClick={() => setMuted(!muted)}
        className="absolute bottom-10 right-6 z-20 p-2 text-white/40 hover:text-white/80 transition-colors duration-300"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3"
      >
        <span className="text-[10px] tracking-[0.3em] uppercase text-white/40">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-px h-8 bg-white/30"
        />
      </motion.div>
    </section>
  );
}

// ============================================================
// MANIFESTO
// ============================================================
function ManifestoSection({ locale }: { locale: string }) {
  const t = CONTENT[locale as keyof typeof CONTENT] || CONTENT.en;
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-32">
      <motion.div
        ref={ref}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        variants={stagger}
        className="max-w-3xl mx-auto text-center"
      >
        <motion.h2
          variants={fadeUp}
          className="text-3xl md:text-5xl lg:text-6xl font-light leading-[1.3] tracking-wide text-white/90 whitespace-pre-line mb-12"
          style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
        >
          {t.manifesto.heading}
        </motion.h2>
        <motion.div variants={lineReveal} className="w-16 h-px bg-white/20 mx-auto mb-12 origin-center" />
        <motion.p
          variants={fadeUp}
          className="text-sm md:text-base leading-[2.2] text-white/50 whitespace-pre-line tracking-wide"
          style={{ fontFamily: locale === 'ja' ? "'Noto Sans JP', sans-serif" : 'var(--font-inter), sans-serif' }}
        >
          {t.manifesto.body}
        </motion.p>
      </motion.div>
    </section>
  );
}

// ============================================================
// SELECTED WORKS
// ============================================================
function WorksSection({ locale }: { locale: string }) {
  const t = CONTENT[locale as keyof typeof CONTENT] || CONTENT.en;
  const latestRef = useRef(null);
  const latestInView = useInView(latestRef, { once: true, margin: '-100px' });

  return (
    <section className="relative py-24 md:py-40">
      <div className="px-6 md:px-16 max-w-7xl mx-auto">
        <SectionLabel>{t.works.sectionLabel}</SectionLabel>

        {/* Latest work — full width */}
        <motion.div
          ref={latestRef}
          initial="hidden"
          animate={latestInView ? 'visible' : 'hidden'}
          variants={stagger}
          className="mb-24 md:mb-40"
        >
          <LatestWorkCard work={LATEST_WORK} locale={locale} />
        </motion.div>

        {/* Past works label */}
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-8">
          Past Works
        </p>

        {/* Past works — 2-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PAST_WORKS.map((work) => (
            <PastWorkCard key={work.id} work={work} />
          ))}
        </div>
      </div>
    </section>
  );
}

// Latest work — full-width hero card
function LatestWorkCard({ work, locale }: { work: typeof LATEST_WORK; locale: string }) {
  const [playing, setPlaying] = useState(false);
  const imgRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: imgRef, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-3%', '3%']);

  return (
    <div>
      {/* Full-width video/thumbnail */}
      <motion.div
        ref={imgRef}
        variants={fadeIn}
        className="relative aspect-video overflow-hidden rounded-sm mb-8"
      >
        {work.streamId && playing ? (
          <div className="absolute inset-0 bg-black overflow-hidden works-stream-container">
            <Stream
              src={work.streamId}
              autoplay
              controls
              muted={false}
              loop={false}
              responsive={false}
            />
          </div>
        ) : (
          <>
            <motion.div style={{ y }} className="absolute inset-0">
              {work.thumbnail ? (
                <img src={work.thumbnail} alt={work.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              )}
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            {work.streamId && (
              <button
                onClick={() => setPlaying(true)}
                className="absolute inset-0 z-10 flex items-center justify-center group cursor-pointer"
              >
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border border-white/30 flex items-center justify-center bg-black/20 backdrop-blur-sm group-hover:bg-white/10 transition-colors duration-300">
                  <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8 md:w-10 md:h-10 ml-1">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                </div>
              </button>
            )}
          </>
        )}
      </motion.div>

      {/* Text below */}
      <motion.div variants={fadeUp} className="max-w-2xl">
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/30 mb-3">
          {work.location} — {work.year}
        </p>
        <h3
          className="text-3xl md:text-5xl font-light text-white/90 mb-2"
          style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
        >
          {work.title}
        </h3>
        {work.subtitle && (
          <p className="text-lg font-light text-white/50 mb-6"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontStyle: 'italic' }}>
            {work.subtitle}
          </p>
        )}
        <p className="text-sm leading-[1.9] text-white/40"
          style={{ fontFamily: locale === 'ja' ? "'Noto Sans JP', sans-serif" : 'var(--font-inter), sans-serif' }}>
          {locale === 'ja' ? work.conceptJa : work.concept}
        </p>
      </motion.div>
    </div>
  );
}

// Past work — compact grid card
function PastWorkCard({ work }: { work: typeof PAST_WORKS[0] }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={fadeIn}
    >
      <div className="relative aspect-video overflow-hidden rounded-sm mb-4">
        {work.streamId && playing ? (
          <div className="absolute inset-0 bg-black overflow-hidden works-stream-container">
            <Stream
              src={work.streamId}
              autoplay
              controls
              muted={false}
              loop={false}
              responsive={false}
            />
          </div>
        ) : (
          <>
            {work.thumbnail ? (
              <img src={work.thumbnail} alt={work.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            {work.streamId && (
              <button
                onClick={() => setPlaying(true)}
                className="absolute inset-0 z-10 flex items-center justify-center group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center bg-black/20 backdrop-blur-sm group-hover:bg-white/10 transition-colors duration-300">
                  <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 ml-0.5">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                </div>
              </button>
            )}
          </>
        )}
      </div>
      <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-1">
        {work.location} — {work.year}
      </p>
      <h4 className="text-base font-light text-white/70" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
        {work.title} {work.subtitle && <span className="text-white/40 italic">{work.subtitle}</span>}
      </h4>
    </motion.div>
  );
}

// Old WorkCard removed — replaced by LatestWorkCard + PastWorkCard above

// ============================================================
// TALENT / RIN
// ============================================================
function TalentSection({ locale }: { locale: string }) {
  const t = CONTENT[locale as keyof typeof CONTENT] || CONTENT.en;
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="relative py-24 md:py-40">
      <div className="px-6 md:px-16 max-w-7xl mx-auto">
        <SectionLabel>{t.talent.sectionLabel}</SectionLabel>

        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={stagger}
          className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start"
        >
          {/* Left: Name & stats */}
          <div className="col-span-1 md:col-span-4">
            <motion.h3
              variants={fadeUp}
              className="text-6xl md:text-8xl font-light text-white/90 mb-8"
              style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontStyle: 'italic' }}
            >
              {TALENT.name}
            </motion.h3>
            <motion.div variants={fadeUp} className="space-y-2 text-[11px] tracking-[0.2em] text-white/30 uppercase">
              <p>{TALENT.height}</p>
              <p>{TALENT.measurements}</p>
            </motion.div>
          </div>

          {/* Right: Photo grid */}
          <motion.div variants={fadeUp} className="col-span-1 md:col-span-8">
            <div className="grid grid-cols-2 gap-3">
              {TALENT.images.map((item, i) => (
                <div key={i} className="relative aspect-[3/4] overflow-hidden rounded-sm">
                  <img
                    src={item.src}
                    alt={`${TALENT.name} ${i + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Hidden log link — blends with existing log bar */}
                  <a
                    href="https://unverified.vual.jp"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      position: 'absolute',
                      bottom: '2.8%',
                      right: '3%',
                      fontFamily: "'SF Mono', 'Menlo', 'Consolas', monospace",
                      fontSize: '7px',
                      letterSpacing: '0.5px',
                      color: 'rgba(255,255,255,0.55)',
                      textDecoration: 'none',
                      pointerEvents: 'auto',
                      zIndex: 10,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.logRight}
                  </a>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
// CAPABILITIES
// ============================================================
function CapabilitiesSection({ locale }: { locale: string }) {
  const t = CONTENT[locale as keyof typeof CONTENT] || CONTENT.en;
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="relative py-24 md:py-40">
      <div className="px-6 md:px-16 max-w-3xl mx-auto">
        <SectionLabel>{t.capabilities.sectionLabel}</SectionLabel>

        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={stagger}
          className="space-y-0"
        >
          {t.capabilities.items.map((item, i) => (
            <motion.div key={i} variants={fadeUp}>
              <div className="py-6 md:py-8 flex items-center justify-between group cursor-default">
                <span
                  className="text-lg md:text-2xl font-light text-white/70 group-hover:text-white/90 transition-colors duration-500"
                  style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
                >
                  {item}
                </span>
                <span className="text-[10px] tracking-[0.2em] text-white/20">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <Divider />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
// CONTACT
// ============================================================
function ContactSection({ locale }: { locale: string }) {
  const t = CONTENT[locale as keyof typeof CONTENT] || CONTENT.en;
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="relative py-32 md:py-48">
      <div className="px-6 md:px-16 max-w-3xl mx-auto text-center">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={stagger}
        >
          <SectionLabel>{t.contact.sectionLabel}</SectionLabel>

          <motion.p
            variants={fadeUp}
            className="text-[11px] tracking-[0.2em] uppercase text-white/30 mb-6"
          >
            {t.contact.inquiry}
          </motion.p>

          <motion.a
            variants={fadeUp}
            href="mailto:studio@vual.jp"
            className="text-xl md:text-2xl font-light text-white/80 hover:text-white transition-colors duration-500 block mb-16"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            studio@vual.jp
          </motion.a>

          {/* Social links */}
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-8 mb-16">
            <a
              href="https://www.instagram.com/sachio_kawasaki/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] tracking-[0.2em] text-white/30 hover:text-white/60 transition-colors duration-500"
            >
              @sachio_kawasaki
            </a>
            <span className="text-white/10">|</span>
            <a
              href="https://www.instagram.com/rin.vual/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] tracking-[0.2em] text-white/30 hover:text-white/60 transition-colors duration-500"
            >
              @rin.vual
            </a>
          </motion.div>

          {/* Bases */}
          <motion.p
            variants={fadeUp}
            className="text-[11px] tracking-[0.3em] text-white/20 uppercase"
          >
            {t.contact.bases}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
// Language Toggle
// ============================================================
function LanguageToggle() {
  const locale = useLocale();
  const otherLocale = locale === 'ja' ? 'en' : 'ja';

  return (
    <Link
      href={`/${otherLocale}`}
      className="fixed top-6 right-6 z-50 text-[11px] tracking-[0.2em] uppercase text-white/40 hover:text-white/70 transition-colors duration-500 mix-blend-difference"
    >
      {otherLocale === 'ja' ? 'JA' : 'EN'}
    </Link>
  );
}

// ============================================================
// Main component
// ============================================================
export function StudioLP() {
  const locale = useLocale();

  return (
    <div className="relative bg-[#0d0a12] text-white selection:bg-white/20">
      {/* Aurora background — fixed behind all content */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="slp-blob slp-purple-1" />
        <div className="slp-blob slp-purple-2" />
        <div className="slp-blob slp-green-1" />
        <div className="slp-blob slp-green-2" />
        <div className="slp-blob slp-green-3" />
        <div className="slp-blob slp-cyan-1" />
        <div className="slp-blob slp-magenta-1" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />
      </div>
      <style>{`
        .slp-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(130px);
          will-change: transform;
          mix-blend-mode: screen;
        }
        .slp-purple-1 {
          width: 55vw; height: 55vw;
          top: -10%; left: -10%;
          background: radial-gradient(circle, #9333ea 0%, #6b21a8 35%, transparent 70%);
          animation: slpP1 20s ease-in-out infinite;
        }
        .slp-purple-2 {
          width: 45vw; height: 45vw;
          bottom: 5%; right: -5%;
          background: radial-gradient(circle, #7c3aed 0%, #4c1d95 40%, transparent 70%);
          animation: slpP2 26s ease-in-out infinite;
        }
        .slp-green-1 {
          width: 50vw; height: 50vw;
          top: 15%; right: -10%;
          background: radial-gradient(circle, #14f195 0%, #0ea47a 25%, #064e3b 50%, transparent 72%);
          animation: slpG1 22s ease-in-out infinite;
        }
        .slp-green-2 {
          width: 40vw; height: 40vw;
          bottom: 20%; left: 10%;
          background: radial-gradient(circle, #34d399 0%, #059669 30%, #064e3b 55%, transparent 72%);
          animation: slpG2 18s ease-in-out infinite;
        }
        .slp-green-3 {
          width: 35vw; height: 35vw;
          top: 55%; left: 40%;
          background: radial-gradient(circle, #10b981 0%, #047857 35%, transparent 65%);
          animation: slpG3 24s ease-in-out infinite;
        }
        .slp-cyan-1 {
          width: 38vw; height: 38vw;
          top: 35%; left: -5%;
          background: radial-gradient(circle, #22d3ee 0%, #0891b2 30%, #164e63 55%, transparent 72%);
          animation: slpC1 21s ease-in-out infinite;
        }
        .slp-magenta-1 {
          width: 42vw; height: 42vw;
          top: 60%; right: 10%;
          background: radial-gradient(circle, #e879f9 0%, #a855f7 30%, #581c87 55%, transparent 72%);
          animation: slpM1 23s ease-in-out infinite;
        }
        @keyframes slpP1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.28; }
          30% { transform: translate(12vw, 10vh) scale(1.2); opacity: 0.42; }
          60% { transform: translate(-8vw, 18vh) scale(0.85); opacity: 0.22; }
        }
        @keyframes slpP2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.22; }
          45% { transform: translate(-15vw, -12vh) scale(1.15); opacity: 0.38; }
          75% { transform: translate(5vw, -5vh) scale(0.9); opacity: 0.18; }
        }
        @keyframes slpG1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
          35% { transform: translate(-18vw, 8vh) scale(1.25); opacity: 0.38; }
          70% { transform: translate(-8vw, -10vh) scale(0.9); opacity: 0.15; }
        }
        @keyframes slpG2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.18; }
          40% { transform: translate(14vw, -14vh) scale(1.15); opacity: 0.35; }
          80% { transform: translate(5vw, 8vh) scale(0.95); opacity: 0.12; }
        }
        @keyframes slpG3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; }
          50% { transform: translate(-12vw, 10vh) scale(1.3); opacity: 0.3; }
        }
        @keyframes slpC1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.18; }
          33% { transform: translate(10vw, 12vh) scale(1.1); opacity: 0.32; }
          66% { transform: translate(18vw, -5vh) scale(0.85); opacity: 0.12; }
        }
        @keyframes slpM1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; }
          40% { transform: translate(-10vw, -15vh) scale(1.2); opacity: 0.3; }
          70% { transform: translate(8vw, 5vh) scale(0.9); opacity: 0.1; }
        }

        /* Force Cloudflare Stream iframe to cover viewport — no black bars on any screen ratio */
        .hero-stream-cover iframe {
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          min-width: 100% !important;
          min-height: 100% !important;
          /* On portrait screens (mobile), width must be tall enough to cover viewport height */
          width: max(100%, calc(100vh * 16 / 9)) !important;
          height: max(100%, calc(100vw * 9 / 16)) !important;
          border: none !important;
          object-fit: cover !important;
        }
        /* Works section Stream player */
        .works-stream-container iframe {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          border: none !important;
        }
      `}</style>

      <LanguageToggle />
      <HeroSection />
      <Divider />
      <ManifestoSection locale={locale} />
      <Divider />
      <WorksSection locale={locale} />
      <Divider />
      <TalentSection locale={locale} />
      <Divider />
      <CapabilitiesSection locale={locale} />
      <Divider />
      <ContactSection locale={locale} />

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-[10px] tracking-[0.2em] text-white/15">
          &copy; 2025 VUAL Studio
        </p>
      </footer>
    </div>
  );
}
