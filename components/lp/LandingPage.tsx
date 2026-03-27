'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence, type Variants } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { ArrowRight, Check, Loader2 } from 'lucide-react';

// ============================================================
// Slideshow image paths helper
// ============================================================
function buildImagePaths(folder: string, count = 10) {
  const paths: string[] = [];
  for (let i = 0; i < count; i++) {
    const num = String(i + 1).padStart(2, '0');
    paths.push(`/lp/${folder}/${num}.jpg`);
    paths.push(`/lp/${folder}/${num}.png`);
  }
  return paths;
}

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

// Apple-style counter animation
function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1800;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4); // ease-out quart
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, value]);

  return <span ref={ref}>{display}{suffix}</span>;
}

// ============================================================
// Image slideshow — crossfade loop (reusable)
// ============================================================
function ImageSlideshow({ folder, fallbackLabel, contain }: { folder: string; fallbackLabel: string; contain?: boolean }) {
  const [images, setImages] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const candidates = buildImagePaths(folder);

  // Check which images actually exist
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing: string[] = [];
      for (const src of candidates) {
        try {
          const res = await fetch(src, { method: 'HEAD' });
          if (res.ok) existing.push(src);
        } catch { /* skip */ }
      }
      if (!cancelled) setImages(existing);
    })();
    return () => { cancelled = true; };
  }, [folder]);

  // Auto-advance every 4s
  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-sm text-[#6b5d7b] tracking-widest font-mono">{fallbackLabel}</p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={images[current]}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
        className="absolute inset-0"
      >
        <Image
          src={images[current]}
          alt={`${folder} ${current + 1}`}
          fill
          className={contain ? 'object-contain' : 'object-cover'}
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={current === 0}
        />
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================
// Video showcase — main player + thumbnail selector
// ============================================================
const LP_MEDIA_BASE = 'https://lufis.net/vual';

const VIDEO_ITEMS = Array.from({ length: 5 }, (_, i) => {
  const num = String(i + 1).padStart(2, '0');
  return {
    video: `${LP_MEDIA_BASE}/videos/${num}.mp4`,
    thumb: `${LP_MEDIA_BASE}/videos/${num}.jpg`,
  };
});

function VideoShowcase() {
  const items = VIDEO_ITEMS;
  const [active, setActive] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [playerH, setPlayerH] = useState(0);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.7);
  const [showControls, setShowControls] = useState(false);
  const [showMobileIcon, setShowMobileIcon] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window);
  }, []);

  // Track main player height
  useEffect(() => {
    if (!playerRef.current) return;
    const ro = new ResizeObserver(([e]) => setPlayerH(e.contentRect.height));
    ro.observe(playerRef.current);
    return () => ro.disconnect();
  }, []);

  // Sync muted/volume to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
      videoRef.current.volume = volume;
    }
  }, [muted, volume]);

  // Play new video when active changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.muted = muted;
      videoRef.current.volume = volume;
      videoRef.current.play().catch(() => {});
    }
  }, [active, items]);

  const toggleMute = () => {
    setMuted((m) => !m);
    if (isTouchDevice) {
      setShowMobileIcon(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setShowMobileIcon(false), 1200);
    }
  };

  if (items.length === 0) {
    return (
      <div className="relative aspect-video max-w-4xl mx-auto overflow-hidden bg-[#15101e]/40 backdrop-blur-sm">
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-[#6b5d7b] tracking-widest font-mono">VIDEO SHOWREEL</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex gap-3 items-start">
      {/* Main player — film frame AR (2084:1420) */}
      <div
        ref={playerRef}
        className="relative overflow-hidden group"
        style={{ aspectRatio: '2084 / 1420', width: 'min(56rem, 80vw)' }}
        onMouseEnter={() => !isTouchDevice && setShowControls(true)}
        onMouseLeave={() => !isTouchDevice && setShowControls(false)}
        onClick={() => isTouchDevice && toggleMute()}
      >
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="none"
          className="absolute inset-0 w-full h-full object-cover"
          src={items[active].video}
        />

        {/* PC: Volume controls on hover */}
        <div
          className={`absolute bottom-3 right-3 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 transition-opacity duration-300 ${
            showControls && !isTouchDevice ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <button onClick={toggleMute} className="text-white/90 hover:text-white">
            {muted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              if (v > 0 && muted) setMuted(false);
              if (v === 0) setMuted(true);
            }}
            className="w-20 h-1 accent-white cursor-pointer"
          />
        </div>

        {/* Mobile: tap icon feedback */}
        <div
          className={`absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-500 ${
            showMobileIcon ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="bg-black/50 backdrop-blur-sm rounded-full p-4">
            {muted ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Thumbnail column — 5 thumbs fit player height exactly, 6+ scrolls */}
      {items.length > 1 && (() => {
        const GAP = 8;
        const VISIBLE = 5;
        const AR = 2084 / 1420;
        // 5 × thumbH + 4 × gap = playerH → thumbH = (playerH - 4*gap) / 5 → thumbW = thumbH * AR
        const thumbW = playerH > 0
          ? (playerH - (VISIBLE - 1) * GAP) * AR / VISIBLE
          : 160;
        return (
          <div
            className="shrink-0 overflow-y-auto overflow-x-hidden scrollbar-hide"
            style={{ width: thumbW, height: playerH || undefined }}
          >
            <div className="flex flex-col" style={{ gap: GAP }}>
              {items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`relative shrink-0 overflow-hidden transition-all ${
                    i === active
                      ? 'opacity-100 ring-1 ring-white/60'
                      : 'opacity-35 hover:opacity-70'
                  }`}
                  style={{ width: thumbW, aspectRatio: '2084 / 1420' }}
                >
                  <video
                    muted
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 w-full h-full object-cover"
                    src={`${item.video}#t=1`}
                  />
                </button>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

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
  const t = useTranslations('lp.waitlist');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState<'brand' | 'shop'>('brand');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !company) return;
    setLoading(true);
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company, type }),
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
          <p className="font-semibold text-white">{t('successTitle')}</p>
          <p className="text-sm text-[#a89bb8]">{t('successMessage')}</p>
        </div>
      </motion.div>
    );
  }

  const isDark = variant === 'dark';

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg">
      {/* Type toggle */}
      <div className="flex gap-2 mb-4">
        {(['brand', 'shop'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setType(v)}
            className={`px-4 py-2 text-xs font-medium rounded-full border transition-all ${
              type === v
                ? isDark
                  ? 'bg-white text-black border-white'
                  : 'bg-black text-white border-black'
                : isDark
                  ? 'bg-transparent text-[#a89bb8] border-[#2a2035] hover:border-[#3d2e50]'
                  : 'bg-transparent text-[#8a7a9b] border-neutral-300 hover:border-neutral-400'
            }`}
          >
            {t(v)}
          </button>
        ))}
      </div>

      {/* Company name */}
      <input
        type="text"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        placeholder={t('companyPlaceholder')}
        required
        className={`w-full px-5 py-3.5 rounded-full text-sm outline-none transition-all mb-2 ${
          isDark
            ? 'bg-white/10 text-white placeholder:text-[#8a7a9b] border border-white/20 focus:border-white/50'
            : 'bg-neutral-100 text-black placeholder:text-[#a89bb8] border border-neutral-200 focus:border-neutral-400'
        }`}
      />

      {/* Email input + submit */}
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('placeholder')}
          required
          className={`flex-1 px-5 py-3.5 rounded-full text-sm outline-none transition-all ${
            isDark
              ? 'bg-white/10 text-white placeholder:text-[#8a7a9b] border border-white/20 focus:border-white/50'
              : 'bg-neutral-100 text-black placeholder:text-[#a89bb8] border border-neutral-200 focus:border-neutral-400'
          }`}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-neutral-200 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {t('submit')}
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
      className="group relative p-8 rounded-3xl border border-[#2a2035]/60 bg-[#15101e]/40 backdrop-blur-md hover:border-[#3d2e50] transition-all duration-500"
    >
      <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`} />
      <div className="relative">
        <span className="text-xs font-mono text-[#8a7a9b] tracking-widest">{number}</span>
        <h3 className="text-xl font-semibold text-white mt-3 mb-3">{title}</h3>
        <p className="text-sm text-[#a89bb8] leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

// ============================================================
// UI slideshow — dashboard screenshots
// ============================================================
const UI_SCREENS = ['/lp/ui/01.png', '/lp/ui/02.png', '/lp/ui/03.png'];

function UISlideshow() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % UI_SCREENS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={UI_SCREENS[current]}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <Image
            src={UI_SCREENS[current]}
            alt={`VUAL UI ${current + 1}`}
            fill
            className="object-cover object-top"
            sizes="(max-width: 768px) 100vw, 80vw"
          />
        </motion.div>
      </AnimatePresence>
      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {UI_SCREENS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === current ? 'bg-white scale-110' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </>
  );
}

// ============================================================
// Statement section — typewriter reveal
// ============================================================
function StatementSection({ line1, line2 }: { line1: string; line2: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [displayedChars1, setDisplayedChars1] = useState(0);
  const [displayedChars2, setDisplayedChars2] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (!isInView) return;
    let i = 0;
    const speed = 40;
    const total1 = line1.length;
    const total2 = line2.length;

    const interval = setInterval(() => {
      i++;
      if (i <= total1) {
        setDisplayedChars1(i);
      } else if (i <= total1 + 10) {
        // pause between lines
      } else if (i <= total1 + 10 + total2) {
        setDisplayedChars2(i - total1 - 10);
      } else {
        clearInterval(interval);
        setTimeout(() => setShowCursor(false), 1500);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [isInView, line1, line2]);

  const done = displayedChars2 >= line2.length;

  return (
    <section ref={ref} className="relative z-10 py-20 md:py-28 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Invisible full text to reserve exact layout height */}
        <div className="relative">
          <div aria-hidden className="invisible">
            <p className="text-2xl md:text-4xl lg:text-[2.8rem] font-bold tracking-tight leading-[1.4]">{line1}</p>
            <p className="text-lg md:text-2xl mt-8 leading-relaxed font-light">{line2}</p>
          </div>
          {/* Visible typed text layered on top */}
          <div className="absolute inset-0">
            <p className="text-2xl md:text-4xl lg:text-[2.8rem] font-bold tracking-tight leading-[1.4] text-white">
              {line1.slice(0, displayedChars1)}
              {displayedChars1 > 0 && !done && displayedChars2 === 0 && showCursor && (
                <span className="inline-block w-[3px] h-[1em] bg-white/80 ml-0.5 animate-pulse align-baseline" />
              )}
            </p>
            <p className="text-lg md:text-2xl text-[#b8adc8] mt-8 leading-relaxed font-light">
              {line2.slice(0, displayedChars2)}
              {displayedChars2 > 0 && !done && showCursor && (
                <span className="inline-block w-[2px] h-[1em] bg-[#b8adc8]/80 ml-0.5 animate-pulse align-baseline" />
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Language toggle (JA / EN)
// ============================================================
function LanguageToggle() {
  const locale = useLocale();
  const isJa = locale === 'ja';

  const toggle = () => {
    const newLocale = isJa ? 'en' : 'ja';
    const path = window.location.pathname.replace(`/${locale}`, `/${newLocale}`);
    window.location.href = path;
  };

  return (
    <button
      onClick={toggle}
      className="fixed top-5 right-5 z-50 flex items-center gap-0.5 px-1 py-1 rounded-full border border-white/15 bg-white/5 backdrop-blur-md text-[11px] font-medium tracking-wide transition-all hover:border-white/30"
    >
      <span className={`px-2.5 py-1 rounded-full transition-all ${isJa ? 'bg-white/15 text-white' : 'text-white/40'}`}>
        JA
      </span>
      <span className={`px-2.5 py-1 rounded-full transition-all ${!isJa ? 'bg-white/15 text-white' : 'text-white/40'}`}>
        EN
      </span>
    </button>
  );
}

// ============================================================
// Main LP Component
// ============================================================
export function VualLandingPage() {
  const t = useTranslations('lp');
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <div className="relative bg-[#0d0a12] text-white overflow-x-hidden" style={{ '--color-title-active': '#f0edf5', '--color-text-body': '#c8c0d4' } as React.CSSProperties}>
      {/* Language toggle — fixed top-right */}
      <LanguageToggle />

      {/* Aurora background — fixed behind all content */}
      <div className="fixed inset-0 -z-0 overflow-hidden">
        {/* Purple / violet blobs */}
        <div className="aurora-blob aurora-purple-1" />
        <div className="aurora-blob aurora-purple-2" />
        {/* Green / teal blobs (Solana-inspired) */}
        <div className="aurora-blob aurora-green-1" />
        <div className="aurora-blob aurora-green-2" />
        <div className="aurora-blob aurora-green-3" />
        {/* Cyan / turquoise accent */}
        <div className="aurora-blob aurora-cyan-1" />
        {/* Deep magenta / pink accent */}
        <div className="aurora-blob aurora-magenta-1" />
        {/* Noise overlay for texture */}
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

        /* ── Purple blobs ── */
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

        /* ── Green / teal blobs (Solana) ── */
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

        /* ── Cyan accent ── */
        .aurora-cyan-1 {
          width: 38vw; height: 38vw;
          top: 35%; left: -5%;
          background: radial-gradient(circle, #22d3ee 0%, #0891b2 30%, #164e63 55%, transparent 72%);
          animation: aC1 21s ease-in-out infinite;
        }

        /* ── Magenta accent ── */
        .aurora-magenta-1 {
          width: 42vw; height: 42vw;
          top: 60%; right: 10%;
          background: radial-gradient(circle, #e879f9 0%, #a855f7 30%, #581c87 55%, transparent 72%);
          animation: aM1 23s ease-in-out infinite;
        }

        /* ── Keyframes ── */
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
      <section ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background video (16:9, film frame included) */}
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="absolute inset-0"
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
            src={`${LP_MEDIA_BASE}/hero.mp4`}
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d0a12]/60 via-[#0d0a12]/40 to-[#0d0a12]/90 z-10" />
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
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-300/10 bg-purple-300/5 backdrop-blur-sm mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-neutral-300 tracking-wide">
              {t('hero.badge')}
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
            className="text-lg md:text-2xl text-neutral-300 max-w-2xl mx-auto mb-12 leading-relaxed font-light"
          >
            {t('hero.tagline')}
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

      {/* ======== STATEMENT — typewriter between hero and 01 ======== */}
      <StatementSection
        line1={t('hero.subtitle')}
        line2={t('hero.features')}
      />

      {/* ======== UI SHOWCASE ======== */}
      <AnimatedSection className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={scaleIn}
            className="relative aspect-[16/10] rounded-xl overflow-hidden border border-[#2a2035]/60 shadow-2xl shadow-black/40"
          >
            <UISlideshow />
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ======== AI LOOKBOOK & EDITORIAL ======== */}
      <AnimatedSection className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <motion.span
                variants={fadeUp}
                className="inline-block text-xs font-mono text-[#8a7a9b] tracking-[0.3em] uppercase"
              >
                01
              </motion.span>

              {/* Apple-style headline: words clip-reveal staggered */}
              <motion.h2
                className="text-4xl md:text-5xl font-bold tracking-tight mt-4 mb-6 leading-[1.1]"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
              >
                {t('lookbook.heading').split(' ').map((word, i) => (
                  <span key={i} className="inline-block overflow-hidden mr-[0.25em]">
                    <motion.span
                      className="inline-block"
                      variants={{
                        hidden: { y: '100%', opacity: 0 },
                        visible: {
                          y: '0%',
                          opacity: 1,
                          transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
                        },
                      }}
                    >
                      {word}
                    </motion.span>
                  </span>
                ))}
              </motion.h2>

              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
                }}
                className="text-[#a89bb8] leading-relaxed text-base mb-10"
              >
                {t('lookbook.description')}
              </motion.p>

              {/* Apple-style stats — count up with stagger */}
              <motion.div
                variants={staggerContainer}
                className="flex gap-10"
              >
                {[
                  { value: 95, suffix: '%', label: t('lookbook.costReduction') },
                  { value: 100, suffix: 'x', label: t('lookbook.fasterProduction') },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    variants={{
                      hidden: { opacity: 0, y: 40, scale: 0.8 },
                      visible: {
                        opacity: 1, y: 0, scale: 1,
                        transition: { duration: 0.8, delay: 0.6 + i * 0.15, ease: [0.16, 1, 0.3, 1] },
                      },
                    }}
                  >
                    <p className="text-5xl md:text-6xl font-bold text-white tracking-tight">
                      <CountUp value={stat.value} suffix={stat.suffix} />
                    </p>
                    <p className="text-sm text-[#8a7a9b] mt-2 tracking-wide">{stat.label}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Lookbook slideshow */}
            <motion.div
              variants={{
                hidden: { opacity: 0, scale: 0.92, x: 60 },
                visible: {
                  opacity: 1, scale: 1, x: 0,
                  transition: { duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#15101e]/40 backdrop-blur-sm border border-[#2a2035]/60"
            >
              <ImageSlideshow folder="lookbook" fallbackLabel="LOOKBOOK DEMO" />
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* ======== VIRTUAL TRY-ON ======== */}
      <AnimatedSection className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Try-on slideshow */}
            <motion.div variants={scaleIn} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#15101e]/40 backdrop-blur-sm border border-[#2a2035]/60 order-2 md:order-1">
              <ImageSlideshow folder="tryon" fallbackLabel="VTON DEMO" />
            </motion.div>

            <div className="order-1 md:order-2">
              <motion.span variants={fadeUp} className="text-xs font-mono text-[#8a7a9b] tracking-[0.3em] uppercase">
                02
              </motion.span>
              <AnimatedHeading
                text={t('tryOn.heading')}
                className="text-4xl md:text-5xl font-bold tracking-tight mt-4 mb-6 leading-[1.1]"
              />
              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
                }}
                className="text-[#a89bb8] leading-relaxed text-base mb-10"
              >
                {t('tryOn.description')}
              </motion.p>
              <motion.div variants={staggerContainer} className="flex gap-10">
                {[
                  { value: 40, prefix: '-', suffix: '%', label: t('tryOn.returnReduction') },
                  { value: 25, prefix: '+', suffix: '%', label: t('tryOn.cvrIncrease') },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    variants={{
                      hidden: { opacity: 0, y: 40, scale: 0.8 },
                      visible: {
                        opacity: 1, y: 0, scale: 1,
                        transition: { duration: 0.8, delay: 0.6 + i * 0.15, ease: [0.16, 1, 0.3, 1] },
                      },
                    }}
                  >
                    <p className="text-5xl md:text-6xl font-bold text-white tracking-tight">
                      {stat.prefix}<CountUp value={stat.value} suffix={stat.suffix} />
                    </p>
                    <p className="text-sm text-[#8a7a9b] mt-2 tracking-wide">{stat.label}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ======== AI VIDEO ======== */}
      <AnimatedSection className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <motion.span variants={fadeUp} className="text-xs font-mono text-[#8a7a9b] tracking-[0.3em] uppercase">
            03
          </motion.span>
          <AnimatedHeading
            text={t('video.heading')}
            className="text-4xl md:text-5xl font-bold tracking-tight mt-4 mb-6 leading-[1.1] max-w-3xl mx-auto"
          />
          <motion.p variants={fadeUp} className="text-[#a89bb8] leading-relaxed text-base mb-12 max-w-2xl mx-auto">
            {t('video.description')}
          </motion.p>

          {/* Video showcase with thumbnail selector */}
          <motion.div variants={scaleIn}>
            <VideoShowcase />
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ======== LINE LIVE COMMERCE ======== */}
      <AnimatedSection className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <motion.span variants={fadeUp} className="text-xs font-mono text-[#8a7a9b] tracking-[0.3em] uppercase">
                04
              </motion.span>
              <AnimatedHeading
                text={t('live.heading')}
                className="text-4xl md:text-5xl font-bold tracking-tight mt-4 mb-6 leading-[1.1]"
              />
              <motion.p variants={fadeUp} className="text-[#a89bb8] leading-relaxed text-base mb-8">
                {t('live.description')}
              </motion.p>
            </div>

            <motion.div variants={scaleIn} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#0d0a12] border border-[#2a2035]/60">
              <ImageSlideshow folder="live" fallbackLabel="LIVE DEMO" contain />
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* ======== NETWORK — Brand × Shop ======== */}
      <AnimatedSection className="relative z-10 py-32 px-6">
        <div className="relative max-w-6xl mx-auto text-center">
          <motion.span variants={fadeUp} className="text-xs font-mono text-[#8a7a9b] tracking-[0.3em] uppercase">
            05
          </motion.span>
          <AnimatedHeading
            text={t('network.heading')}
            className="text-4xl md:text-5xl font-bold tracking-tight mt-4 mb-6 leading-[1.1] max-w-3xl mx-auto"
          />
          <motion.div variants={fadeUp} className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-400/20 bg-purple-400/5 text-xs text-purple-300 tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              Coming Soon
            </span>
          </motion.div>
          <motion.p variants={fadeUp} className="text-[#a89bb8] leading-relaxed text-base mb-16 max-w-2xl mx-auto">
            {t('network.description')}
          </motion.p>

          {/* Network visual */}
          <motion.div variants={staggerContainer} className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <FeatureCard
              number="05-A"
              title={t('network.exhibitionTitle')}
              description={t('network.exhibitionDesc')}
              gradient="bg-gradient-to-br from-blue-500/5 to-transparent"
            />
            <FeatureCard
              number="05-B"
              title={t('network.outreachTitle')}
              description={t('network.outreachDesc')}
              gradient="bg-gradient-to-br from-purple-500/5 to-transparent"
            />
            <FeatureCard
              number="05-C"
              title={t('network.orderTitle')}
              description={t('network.orderDesc')}
              gradient="bg-gradient-to-br from-emerald-500/5 to-transparent"
            />
            <FeatureCard
              number="05-D"
              title={t('network.prAgentTitle')}
              description={t('network.prAgentDesc')}
              gradient="bg-gradient-to-br from-amber-500/5 to-transparent"
            />
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ======== ALL-IN-ONE ======== */}
      <AnimatedSection className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <motion.span variants={fadeUp} className="text-xs font-mono text-[#8a7a9b] tracking-[0.3em] uppercase">
            06
          </motion.span>
          <AnimatedHeading
            text={t('allInOne.heading')}
            className="text-4xl md:text-5xl font-bold tracking-tight mt-4 mb-6 leading-[1.1] max-w-3xl mx-auto"
          />
          <motion.p variants={fadeUp} className="text-[#a89bb8] leading-relaxed text-base mb-16 max-w-2xl mx-auto">
            {t('allInOne.description')}
          </motion.p>

          <motion.div variants={staggerContainer} className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {t('allInOne.items').split(',').map((item) => (
              <motion.div
                key={item}
                variants={fadeUp}
                className="py-4 px-3 rounded-xl border border-[#2a2035]/60 bg-[#15101e]/30 backdrop-blur-sm text-sm text-neutral-300 hover:border-[#3d2e50] hover:bg-[#1a1025]/40 transition-all"
              >
                {item}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ======== FOUNDER ======== */}
      <AnimatedSection className="relative z-10 py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <motion.div
              variants={scaleIn}
              className="shrink-0 w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border border-[#2a2035]/60"
            >
              <Image
                src="/lp/founder-bw.jpeg"
                alt={t('founder.name')}
                width={144}
                height={144}
                className="w-full h-full object-cover"
              />
            </motion.div>
            <div>
              <motion.p variants={fadeUp} className="text-lg font-semibold text-white">
                {t('founder.name')}
              </motion.p>
              <motion.p variants={fadeUp} className="text-xs text-[#8a7a9b] tracking-wide mt-1 mb-4">
                {t('founder.role')}
              </motion.p>
              <motion.p variants={fadeUp} className="text-sm text-[#a89bb8] leading-relaxed">
                {t('founder.bio')}
              </motion.p>
              <motion.div variants={fadeUp} className="flex gap-4 mt-4">
                <a href="https://www.threads.net/@sachio_kawasaki" target="_blank" rel="noopener" className="text-xs text-[#8a7a9b] hover:text-white transition-colors">
                  Threads @sachio_kawasaki
                </a>
              </motion.div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ======== FINAL CTA ======== */}
      <section className="relative z-10 py-32 px-6 overflow-hidden">

        <AnimatedSection className="relative max-w-3xl mx-auto text-center">
          <AnimatedHeading
            text={t('cta.heading')}
            className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]"
          />
          <motion.p variants={fadeUp} className="text-[#a89bb8] text-base mb-12 leading-relaxed">
            {t('cta.description')}
          </motion.p>
          <motion.div variants={fadeUp} className="flex justify-center">
            <WaitlistForm />
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ======== FOOTER ======== */}
      <footer className="relative z-10 border-t border-[#2a2035]/40 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Top row: logo + links */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold tracking-tighter" style={{ fontFamily: 'var(--font-playfair)' }}>
                VUAL
              </span>
              <span className="text-xs text-[#6b5d7b]">
                © {new Date().getFullYear()} All rights reserved.
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a href="https://instagram.com/sachio_kawasaki" target="_blank" rel="noopener" className="text-xs text-[#8a7a9b] hover:text-white transition-colors">
                Instagram
              </a>
              <a href="https://x.com/VUAL_fashion" target="_blank" rel="noopener" className="text-xs text-[#8a7a9b] hover:text-white transition-colors">
                X
              </a>
              <img src="/lp/powered-by-stripe.svg" alt="Powered by Stripe" className="h-[22px] opacity-60 hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Company info */}
          <div className="grid md:grid-cols-2 gap-8 text-[11px] text-[#6b5d7b] leading-relaxed tracking-wide">
            <div>
              <p className="font-medium text-[#8a7a9b] mb-1">LUFIS Co., Ltd.</p>
              <p>1-1-22, Tokuyoshi-minami, Kokuraminami-ku, Kitakyusyushi, Fukuokaken, Japan</p>
              <p>+81 50 6867 2592 · info@lufis.co.jp</p>
            </div>
            <div>
              <p className="font-medium text-[#8a7a9b] mb-1">LUFIS UK Co., Ltd.</p>
              <p>124 City Road, London, EC1V 2NX, United Kingdom</p>
              <p>+44 74 5512 7722 · info@lufis.co.jp</p>
            </div>
          </div>
          <div className="mt-6 text-[11px] text-[#6b5d7b] tracking-wide">
            SaaS Development & MVP Engineering — <a href="mailto:info@lufis.co.jp" className="text-[#8a7a9b] hover:text-white transition-colors">info@lufis.co.jp</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
