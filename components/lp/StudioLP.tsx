'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Stream } from '@cloudflare/stream-react';
import { Volume2, VolumeX } from 'lucide-react';
import { sampleEntities } from '@/lib/daily/sample';

// ============================================================
// Constants
// ============================================================
const LP_MEDIA_BASE = 'https://lufis.net/vual';

// Hero video — Naica Mine on Cloudflare Stream
const HERO_STREAM_ID = 'ddbec5f627e61b18df34e561e0b81bcb'; // Eclipse — The End of Sanctuary

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
      sectionLabel: 'Immersive Try-On',
      heading: 'Step Into the World',
      subtitle: 'Wear the story. Become the editorial.',
      body: 'ECサイトでも、ブランドのイメージサイトでも。\n一瞬で埋め込んで、これまでにない全く新しい体験を顧客に。',
    },
    capabilities: {
      sectionLabel: 'Capabilities',
      items: [
        'Art Direction',
        'Cinematic Video Production',
        'High-End Fashion Photography',
        'Immersive Virtual Try-On',
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
      sectionLabel: 'Immersive Try-On',
      heading: 'Step Into the World',
      subtitle: 'Wear the story. Become the editorial.',
      body: 'From e-commerce to brand storefronts — embed it in an instant and give your audience an entirely new way to experience your collection.',
    },
    capabilities: {
      sectionLabel: 'Capabilities',
      items: [
        'Art Direction',
        'Cinematic Video Production',
        'High-End Fashion Photography',
        'Immersive Virtual Try-On',
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
  id: 'galleria-borghese',
  title: 'Galleria Borghese',
  subtitle: '',
  location: 'Galleria Borghese, Rome',
  year: '2026',
  concept: '',
  conceptJa: '',
  thumbnail: 'https://customer-iachfaxtqeo2l99t.cloudflarestream.com/3741d143827003bb2e685515e084a7b4/thumbnails/thumbnail.jpg?time=5s&width=1280',
  streamId: '3741d143827003bb2e685515e084a7b4',
};

// Past works — displayed as grid below
const PAST_WORKS = [
  {
    id: 'eclipse',
    title: 'Eclipse',
    subtitle: 'The End of Sanctuary',
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
    year: '2026',
    thumbnail: 'https://customer-iachfaxtqeo2l99t.cloudflarestream.com/368ea2f9115c8d848ce10f6a7e6f2868/thumbnails/thumbnail.jpg?time=15s&width=1280',
    streamId: '368ea2f9115c8d848ce10f6a7e6f2868',
  },
  {
    id: 'shattered-utopia-vol2',
    title: 'The Shattered Utopia',
    subtitle: 'Vol.2',
    location: 'Buzludzha, Bulgaria',
    year: '2026',
    thumbnail: 'https://customer-iachfaxtqeo2l99t.cloudflarestream.com/ad4459ed0dd133140df55ba6f8720509/thumbnails/thumbnail.jpg?time=22.5s&width=1280',
    streamId: 'ad4459ed0dd133140df55ba6f8720509',
  },
  {
    id: 'cern',
    title: 'CERN',
    subtitle: '',
    location: 'CERN, Geneva, Switzerland',
    year: '2026',
    thumbnail: 'https://customer-iachfaxtqeo2l99t.cloudflarestream.com/3cee1988832aa59aa8ad52c945f0b323/thumbnails/thumbnail.jpg?time=5s&width=1280',
    streamId: '3cee1988832aa59aa8ad52c945f0b323',
  },
  {
    id: 'naica-mine',
    title: 'Naica Mine',
    subtitle: '',
    location: 'Naica Mine, Chihuahua, Mexico',
    year: '2026',
    thumbnail: 'https://customer-iachfaxtqeo2l99t.cloudflarestream.com/6ff799cd8547ed733d84ae06e3dc70e2/thumbnails/thumbnail.jpg?time=30s&width=1280',
    streamId: '6ff799cd8547ed733d84ae06e3dc70e2',
  },
];

// Reels / vertical works — 9:16, displayed in a dedicated vertical grid
const REELS_WORKS = [
  {
    id: 'galleria-borghese-cinema',
    title: 'Galleria Borghese',
    subtitle: 'Cinema',
    location: 'Galleria Borghese, Rome',
    year: '2026',
    thumbnail: 'https://customer-iachfaxtqeo2l99t.cloudflarestream.com/198dcebeb51d412961aff963c8052222/thumbnails/thumbnail.jpg?time=3s&height=1280',
    streamId: '198dcebeb51d412961aff963c8052222',
  },
  {
    id: 'maunsell-forts-catwalk',
    title: 'Maunsell Forts',
    subtitle: 'Catwalk',
    location: 'Maunsell Forts, UK',
    year: '2026',
    thumbnail: 'https://customer-iachfaxtqeo2l99t.cloudflarestream.com/8ca78e8b48e2b8090f974ff684fe5515/thumbnails/thumbnail.jpg?time=3s&height=1280',
    streamId: '8ca78e8b48e2b8090f974ff684fe5515',
  },
  {
    id: 'maunsell-forts-cinema',
    title: 'Maunsell Forts',
    subtitle: 'Cinema',
    location: 'Maunsell Forts, UK',
    year: '2026',
    thumbnail: 'https://customer-iachfaxtqeo2l99t.cloudflarestream.com/82c09d7465c242255ef10a5f0e352c1d/thumbnails/thumbnail.jpg?time=3s&height=1280',
    streamId: '82c09d7465c242255ef10a5f0e352c1d',
  },
  {
    id: 'shibuya-laundromat',
    title: 'Shibuya Laundromat',
    subtitle: 'Catwalk',
    location: 'Shibuya, Tokyo',
    year: '2026',
    thumbnail: 'https://customer-iachfaxtqeo2l99t.cloudflarestream.com/73f7ebc4c2b631e5fa56f49a19de01f8/thumbnails/thumbnail.jpg?time=3s&height=1280',
    streamId: '73f7ebc4c2b631e5fa56f49a19de01f8',
  },
  {
    id: 'cyber-neon',
    title: 'Cyber Neon',
    subtitle: 'Cinema',
    location: 'Tokyo',
    year: '2026',
    thumbnail: 'https://customer-iachfaxtqeo2l99t.cloudflarestream.com/c0ed0a6f04f09505b37b5c45c37c006e/thumbnails/thumbnail.jpg?time=3s&height=1280',
    streamId: 'c0ed0a6f04f09505b37b5c45c37c006e',
  },
];

// ============================================================
// Talent data
// ============================================================
const TALENT = {
  name: 'RIN',
  height: '175cm',
  measurements: 'B80 / W59 / H86',
  // 6 looks for the Mondrian grid. Order matches TALENT_CELLS (16:9, 9:16, 4:3,
  // 1:1, 3:4, 3:4). `src` = AR grid image, `modal` = preview shown when the
  // try-on modal opens, `lookFile` = R2 look image the implant API resolves the
  // recipe/garments from. All hosted on the vault R2 bucket.
  images: [
    {
      src: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/vault/collections/05-06-2026_cs-rin/look1.jpg',
      modal: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/vault/collections/05-06-2026_cs-rin/modal1.jpg',
      lookFile: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/vault/collections/05-06-2026_cs-rin/look1.jpg',
    },
    {
      src: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/vault/collections/05-06-2026_cs-rin/look2.jpg',
      modal: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/vault/collections/05-06-2026_cs-rin/modal2.jpg',
      lookFile: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/vault/collections/05-06-2026_cs-rin/look2.jpg',
    },
    {
      src: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/vault/collections/05-06-2026_cs-rin/look3.jpg',
      modal: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/vault/collections/05-06-2026_cs-rin/modal3.jpg',
      lookFile: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/vault/collections/05-06-2026_cs-rin/look3.jpg',
    },
    {
      src: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/vault/collections/05-06-2026_cs-rin/look4.jpg',
      modal: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/vault/collections/05-06-2026_cs-rin/modal4.jpg',
      lookFile: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/vault/collections/05-06-2026_cs-rin/look4.jpg',
    },
    {
      src: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/vault/collections/05-06-2026_cs-rin/look5.jpg',
      modal: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/vault/collections/05-06-2026_cs-rin/modal5.jpg',
      lookFile: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/vault/collections/05-06-2026_cs-rin/look5.jpg',
    },
    {
      src: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/vault/collections/05-06-2026_cs-rin/look6.jpg',
      modal: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/vault/collections/05-06-2026_cs-rin/modal6.jpg',
      lookFile: 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/vault/collections/05-06-2026_cs-rin/look6.jpg',
    },
  ],
};

// Staggered Mondrian cell placements (same layout as the demo Experience grid).
// 12-col grid, row height = 1 col width * 4/3. Order: 16:9, 9:16, 4:3, 1:1, 3:4, 3:4.
const TALENT_CELLS = [
  { colStart: 6, colEnd: 11, rowStart: 1, rowEnd: 3 },
  { colStart: 8, colEnd: 13, rowStart: 3, rowEnd: 9 },
  { colStart: 1, colEnd: 8, rowStart: 5, rowEnd: 9 },
  { colStart: 1, colEnd: 6, rowStart: 1, rowEnd: 5 },
  { colStart: 11, colEnd: 13, rowStart: 1, rowEnd: 3 },
  { colStart: 6, colEnd: 8, rowStart: 3, rowEnd: 5 },
];

// Per-cell independent Ken Burns (zoom + pan, ping-pong), seeded by index.
const TALENT_KB_DIRS = ['kenBurnsTL', 'kenBurnsTR', 'kenBurnsBL', 'kenBurnsBR'];
function talentKenBurns(i: number): React.CSSProperties {
  const dir = TALENT_KB_DIRS[i % TALENT_KB_DIRS.length];
  const duration = 14 + ((i * 5) % 9);
  const offset = -((i * 3.3) % duration);
  const direction = i % 2 === 0 ? 'alternate-reverse' : 'alternate';
  return {
    animation: `${dir} ${duration}s ease-in-out ${offset}s infinite ${direction}`,
    willChange: 'transform',
  };
}

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
  // Unified video modal: holds a streamId + orientation so both the vertical
  // reels (9:16) and the horizontal gallery videos (16:9) open the same way.
  const [activeVideo, setActiveVideo] = useState<{ streamId: string; vertical: boolean } | null>(null);

  return (
    <section className="relative py-24 md:py-40">
      <div className="mx-auto" style={{ paddingLeft: 'clamp(2rem, 16vw, 24rem)', paddingRight: 'clamp(2rem, 16vw, 24rem)' }}>
        <SectionLabel>{t.works.sectionLabel}</SectionLabel>

        {/* Latest work — full width */}
        <motion.div
          ref={latestRef}
          initial="hidden"
          animate={latestInView ? 'visible' : 'hidden'}
          variants={stagger}
          className="mb-24 md:mb-40"
        >
          <LatestWorkCard
            work={LATEST_WORK}
            locale={locale}
            onOpenVideo={(streamId) => setActiveVideo({ streamId, vertical: false })}
          />
        </motion.div>

        {/* Past works label */}
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-8">
          Past Works
        </p>

        {/* Past works — 2-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PAST_WORKS.map((work) => (
            <PastWorkCard
              key={work.id}
              work={work}
              onOpenVideo={(streamId) => setActiveVideo({ streamId, vertical: false })}
            />
          ))}
        </div>

        {/* Reels / vertical works */}
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-8 mt-24 md:mt-40">
          Reels — Vertical
        </p>
        <div className="grid grid-cols-5 gap-2 md:gap-4">
          {REELS_WORKS.map((work) => (
            <VerticalWorkCard key={work.id} work={work} onOpen={() => setActiveVideo({ streamId: work.streamId, vertical: true })} />
          ))}
        </div>
      </div>

      {/* Video modal — same centered modal for both vertical reels and
          horizontal gallery videos. Aspect-correct sizing per orientation. */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(13, 10, 18, 0.5)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
          onClick={() => setActiveVideo(null)}
        >
          <button
            onClick={() => setActiveVideo(null)}
            className="absolute top-5 right-5 z-10 w-10 h-10 rounded-full border border-white/25 flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
          <div
            className="relative bg-black rounded-sm overflow-hidden works-stream-container"
            style={
              activeVideo.vertical
                ? { height: 'min(85vh, calc(95vw * 16 / 9))', width: 'min(calc(85vh * 9 / 16), 95vw)' }
                : { width: 'min(90vw, calc(85vh * 16 / 9))', height: 'min(calc(90vw * 9 / 16), 85vh)' }
            }
            onClick={(e) => e.stopPropagation()}
          >
            <Stream src={activeVideo.streamId} autoplay controls muted={false} loop={false} responsive={false} />
          </div>
        </div>
      )}
    </section>
  );
}

// Latest work — full-width hero card
function LatestWorkCard({ work, locale, onOpenVideo }: { work: typeof LATEST_WORK; locale: string; onOpenVideo: (streamId: string) => void }) {
  const imgRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: imgRef, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-3%', '3%']);

  return (
    <div>
      {/* Full-width video/thumbnail */}
      <motion.div
        ref={imgRef}
        variants={fadeIn}
        className="group relative aspect-video overflow-hidden rounded-sm mb-8"
      >
        <motion.div style={{ y }} className="absolute inset-0">
          {work.thumbnail ? (
            <img src={work.thumbnail} alt={work.title} className="absolute inset-0 w-full h-full object-cover gallery-zoom" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
          )}
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent transition-colors duration-500 group-hover:from-black/20" />
        {work.streamId && (
          <button
            onClick={() => onOpenVideo(work.streamId)}
            className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer"
          >
            <div className="gallery-zoom-btn w-20 h-20 md:w-24 md:h-24 rounded-full border border-white/30 flex items-center justify-center bg-black/20 backdrop-blur-sm group-hover:bg-white/10 group-hover:border-white/60">
              <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8 md:w-10 md:h-10 ml-1">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
          </button>
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
function PastWorkCard({ work, onOpenVideo }: { work: typeof PAST_WORKS[0]; onOpenVideo: (streamId: string) => void }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={fadeIn}
    >
      <div className="group relative aspect-video overflow-hidden rounded-sm mb-4">
        {work.thumbnail ? (
          <img src={work.thumbnail} alt={work.title} className="absolute inset-0 w-full h-full object-cover gallery-zoom" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent transition-colors duration-500 group-hover:from-black/10" />
        {work.streamId && (
          <button
            onClick={() => onOpenVideo(work.streamId)}
            className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer"
          >
            <div className="gallery-zoom-btn w-12 h-12 rounded-full border border-white/30 flex items-center justify-center bg-black/20 backdrop-blur-sm group-hover:bg-white/10 group-hover:border-white/60">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 ml-0.5">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
          </button>
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

// Vertical (9:16) reel card — clickable thumbnail; playback opens a fullscreen modal
function VerticalWorkCard({ work, onOpen }: { work: typeof REELS_WORKS[0]; onOpen: () => void }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={fadeIn}
    >
      <button
        onClick={onOpen}
        className="relative aspect-[9/16] w-full overflow-hidden rounded-sm mb-3 block group cursor-pointer"
      >
        {work.thumbnail ? (
          <img src={work.thumbnail} alt={work.title} className="absolute inset-0 w-full h-full object-cover gallery-zoom" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent transition-colors duration-500 group-hover:from-black/20" />
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="gallery-zoom-btn shrink-0 aspect-square w-11 rounded-full border border-white/40 flex items-center justify-center bg-black/30 backdrop-blur-sm group-hover:bg-white/10 group-hover:border-white/70">
            <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4 ml-0.5 shrink-0">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
        </div>
      </button>
      <p className="text-[9px] tracking-[0.2em] uppercase text-white/30 mb-1">
        {work.location} — {work.year}
      </p>
      <h4 className="text-sm font-light text-white/70 leading-snug" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
        {work.title}
      </h4>
      {work.subtitle && (
        <p className="text-xs italic text-white/40 mt-0.5" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          {work.subtitle}
        </p>
      )}
    </motion.div>
  );
}

// Old WorkCard removed — replaced by LatestWorkCard + PastWorkCard above

// ============================================================
// GLASS ARROW — liquid-glass carousel nav button (refraction + glow)
// ============================================================
function GlassArrow({ dir, onClick }: { dir: 'left' | 'right'; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={dir === 'left' ? 'Previous' : 'Next'}
      className="relative w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center text-lg overflow-hidden"
      style={{
        color: 'rgba(255,255,255,0.85)',
        border: `1px solid ${hover ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)'}`,
        background: hover
          ? 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.08))'
          : 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow:
          'inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.25)',
        transform: hover ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease, border-color 0.3s ease',
      }}
    >
      {/* Top highlight (soft glass) */}
      <span
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: '50%',
          borderRadius: '50% 50% 0 0',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.22), transparent)',
        }}
      />
      <span className="relative">{dir === 'left' ? '‹' : '›'}</span>
    </button>
  );
}

// ============================================================
// TRY-ON MODAL — credit-free virtual try-on for the RIN grid.
// Shows the sample preview (modal image), lets the visitor either upload a
// face or pick one of the model lineup, then calls the same /api/daily/implant
// endpoint the daily experience uses. No auth, no credits, no Firestore.
// ============================================================
type TryOnLook = { src: string; modal: string; lookFile: string };

const TRYON_STEPS = ['ANALYZING', 'STYLING', 'COMPOSING', 'FINALIZING'];

function TryOnModal({ look, onClose }: { look: TryOnLook; onClose: () => void }) {
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<(typeof sampleEntities)[number] | null>(null);
  const [height, setHeight] = useState(170);
  const [state, setState] = useState<'select' | 'implanting' | 'result'>('select');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUserPhoto(reader.result as string);
      setSelectedEntity(null);
    };
    reader.readAsDataURL(file);
  };

  const toDataUrl = async (url: string): Promise<string> => {
    if (url.startsWith('data:')) return url;
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
  };

  const handleGenerate = async () => {
    if (!userPhoto && !selectedEntity) return;
    setState('implanting');
    setError(null);

    const steps = (async () => {
      for (let i = 0; i < TRYON_STEPS.length - 1; i++) {
        setStepIdx(i);
        await new Promise((r) => setTimeout(r, 1200 + Math.random() * 600));
      }
    })();

    try {
      const entityImage = userPhoto || (await toDataUrl(selectedEntity!.referenceUrl));
      const res = await fetch('/api/daily/implant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityImage, lookFile: look.lookFile, height }),
      });
      const data = await res.json();
      await steps;
      if (!res.ok || !data.success) throw new Error(data.error || 'Generation failed');
      setResultUrl(data.resultImage);
      setStepIdx(TRYON_STEPS.length - 1);
      setState('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setState('select');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(13, 10, 18, 0.5)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-10 w-10 h-10 rounded-full border border-white/25 flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors"
        aria-label="Close"
      >
        ✕
      </button>

      <div
        className="relative bg-[#0d0a12] rounded-sm overflow-hidden w-full max-w-md max-h-[92vh] overflow-y-auto border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Preview image (sample) or generated result */}
        <div className="relative w-full bg-black" style={{ aspectRatio: '3/4' }}>
          <img
            src={state === 'result' && resultUrl ? resultUrl : look.modal}
            alt="Try-on preview"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {state === 'implanting' && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <p className="text-[10px] tracking-[0.4em] text-white/70 font-light">{TRYON_STEPS[stepIdx]}</p>
            </div>
          )}
        </div>

        <div className="p-5">
          {state === 'result' ? (
            <div className="flex flex-col gap-3">
              <p className="text-[10px] tracking-[0.3em] text-white/40 uppercase">Your Look</p>
              {resultUrl && (
                <a
                  href={resultUrl}
                  download="vual-tryon.jpg"
                  className="text-center text-[11px] tracking-[0.2em] uppercase border border-white/30 text-white/80 py-3 hover:bg-white/10 transition-colors"
                >
                  Download
                </a>
              )}
              <button
                onClick={() => { setState('select'); setResultUrl(null); }}
                className="text-center text-[11px] tracking-[0.2em] uppercase text-white/50 py-2 hover:text-white/80 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Face upload */}
              <p className="text-[10px] tracking-[0.4em] text-white/40 font-light mb-3">YOUR FACE</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center gap-3 mb-5 p-2 border border-white/15 rounded-sm hover:border-white/30 transition-colors"
              >
                <span className="w-12 h-12 rounded-full overflow-hidden border-2 flex-shrink-0 flex items-center justify-center bg-white/5"
                  style={{ borderColor: userPhoto ? 'var(--vault-cyan, #22d3ee)' : 'rgba(255,255,255,0.1)' }}>
                  {userPhoto ? (
                    <img src={userPhoto} alt="you" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white/40 text-lg">+</span>
                  )}
                </span>
                <span className="text-[11px] tracking-[0.2em] text-white/50 uppercase">
                  {userPhoto ? 'Photo selected' : 'Upload a selfie'}
                </span>
              </button>

              {/* Model lineup */}
              <p className="text-[10px] tracking-[0.4em] text-white/40 font-light mb-3">OR SELECT MODEL</p>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
                {sampleEntities.map((entity) => (
                  <button
                    key={entity.id}
                    onClick={() => { setSelectedEntity(entity); setUserPhoto(null); }}
                    className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden border-2 transition-colors"
                    style={{ borderColor: selectedEntity?.id === entity.id ? 'var(--vault-cyan, #22d3ee)' : 'rgba(255,255,255,0.1)' }}
                  >
                    <img src={entity.thumbnailUrl} alt={entity.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              {/* Height */}
              <div className="flex items-center gap-3 mb-5">
                <span className="text-[10px] tracking-[0.3em] text-white/40 uppercase">Height</span>
                <input
                  type="range" min={150} max={195} value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="flex-1 accent-white"
                />
                <span className="text-[12px] text-white/60 w-12 text-right">{height}cm</span>
              </div>

              {error && <p className="text-[11px] text-red-400/80 mb-3">{error}</p>}

              <button
                onClick={handleGenerate}
                disabled={!userPhoto && !selectedEntity}
                className="w-full text-center text-[11px] tracking-[0.3em] uppercase py-4 border border-white/30 text-white/90 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Try It On
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TALENT / RIN
// ============================================================
function TalentSection({ locale }: { locale: string }) {
  const t = CONTENT[locale as keyof typeof CONTENT] || CONTENT.en;
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  // activeLook is a GLOBAL index into TALENT.images (spans all pages).
  const [activeLook, setActiveLook] = useState<number | null>(null);

  // Split looks into pages of 6 (one Mondrian grid each). New pages appear
  // automatically as TALENT.images grows.
  const PER_PAGE = TALENT_CELLS.length; // 6
  const pageCount = Math.max(1, Math.ceil(TALENT.images.length / PER_PAGE));
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(0); // slide direction: 1 = next, -1 = prev

  const goTo = (next: number) => {
    const clamped = (next + pageCount) % pageCount;
    setDir(next > page || (page === pageCount - 1 && clamped === 0) ? 1 : -1);
    setPage(clamped);
  };

  return (
    <section className="relative py-24 md:py-40">
      <div className="mx-auto" style={{ paddingLeft: 'clamp(2rem, 8vw, 12rem)', paddingRight: 'clamp(2rem, 8vw, 12rem)' }}>
        <SectionLabel>{t.talent.sectionLabel}</SectionLabel>

        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={stagger}
        >
          {/* Top row: heading/subtitle (left) + description (right) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-end mb-20 md:mb-28">
            <div className="col-span-1 md:col-span-7">
              <motion.h3
                variants={fadeUp}
                className="text-4xl md:text-6xl font-light text-white/90 mb-4 leading-[1.1]"
                style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
              >
                {t.talent.heading}
              </motion.h3>
              <motion.p
                variants={fadeUp}
                className="text-lg md:text-xl font-light italic text-white/55"
                style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
              >
                {t.talent.subtitle}
              </motion.p>
            </div>
            <motion.p
              variants={fadeUp}
              className="col-span-1 md:col-span-5 text-sm md:text-base leading-[1.9] text-white/40 whitespace-pre-line"
              style={{ fontFamily: locale === 'ja' ? "'Noto Sans JP', sans-serif" : 'var(--font-inter), sans-serif' }}
            >
              {t.talent.body}
            </motion.p>
          </div>

          {/* Bottom: wide Mondrian carousel — arrows flank the grid so their
              space is reserved even on a single page; the grid width stays
              constant when a 2nd page (and the arrows) appear. */}
          <motion.div variants={fadeUp} className="relative flex items-center gap-6 md:gap-12">
            {/* Left arrow rail (space always reserved) */}
            <div className="flex-shrink-0 w-9 md:w-11 flex items-center justify-center">
              {pageCount > 1 && <GlassArrow dir="left" onClick={() => goTo(page - 1)} />}
            </div>

            <div className="relative overflow-hidden flex-1 min-w-0">
              <AnimatePresence initial={false} mode="popLayout" custom={dir}>
                <motion.div
                  key={page}
                  custom={dir}
                  variants={{
                    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ x: { type: 'spring', stiffness: 260, damping: 32 }, opacity: { duration: 0.3 } }}
                  drag={pageCount > 1 ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.18}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -80) goTo(page + 1);
                    else if (info.offset.x > 80) goTo(page - 1);
                  }}
                  className="grid w-full"
                  style={{
                    gap: '6px',
                    gridTemplateColumns: 'repeat(12, 1fr)',
                    gridTemplateRows: 'repeat(8, 1fr)',
                    aspectRatio: '12 / 10.667',
                  }}
                >
                  {TALENT_CELLS.map((cell, c) => {
                    const globalIdx = page * PER_PAGE + c;
                    const item = TALENT.images[globalIdx];
                    return (
                      <button
                        key={c}
                        onClick={() => item && setActiveLook(globalIdx)}
                        disabled={!item}
                        className="relative overflow-hidden rounded-sm group cursor-pointer disabled:cursor-default"
                        style={{
                          gridColumn: `${cell.colStart} / ${cell.colEnd}`,
                          gridRow: `${cell.rowStart} / ${cell.rowEnd}`,
                        }}
                      >
                        {item ? (
                          <img
                            src={item.src}
                            alt={`${TALENT.name} ${globalIdx + 1}`}
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                            style={talentKenBurns(c)}
                            draggable={false}
                          />
                        ) : (
                          <div
                            className="absolute inset-0"
                            style={{ background: 'linear-gradient(135deg, #1a1626 0%, #0d0a12 100%)', ...talentKenBurns(c) }}
                          />
                        )}
                        {item && (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                            <span className="text-[9px] tracking-[0.3em] uppercase text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 border border-white/40 px-3 py-1.5">
                              Try On
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right arrow rail (space always reserved) */}
            <div className="flex-shrink-0 w-9 md:w-11 flex items-center justify-center">
              {pageCount > 1 && <GlassArrow dir="right" onClick={() => goTo(page + 1)} />}
            </div>
          </motion.div>

          {/* Dots indicator (only when multiple pages) */}
          {pageCount > 1 && (
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-2 mt-8">
              {Array.from({ length: pageCount }).map((_, p) => (
                <button
                  key={p}
                  onClick={() => goTo(p)}
                  aria-label={`Page ${p + 1}`}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: p === page ? 24 : 6,
                    backgroundColor: p === page ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)',
                  }}
                />
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Try-on modal — credit-free, model lineup + face upload, daily implant API */}
      {activeLook !== null && TALENT.images[activeLook] && (
        <TryOnModal
          look={TALENT.images[activeLook]}
          onClose={() => setActiveLook(null)}
        />
      )}
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

  // Always open at the top (the fullscreen hero), ignoring browser scroll restoration.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="studio-lp relative bg-[#0d0a12] text-white selection:bg-white/20">
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
        /* Override the global dark heading color — this LP is dark-themed. */
        .studio-lp h1, .studio-lp h2, .studio-lp h3,
        .studio-lp h4, .studio-lp h5, .studio-lp h6 {
          color: rgba(255, 255, 255, 0.9) !important;
        }
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
          &copy; 2026 VUAL Studio
        </p>
      </footer>
    </div>
  );
}
