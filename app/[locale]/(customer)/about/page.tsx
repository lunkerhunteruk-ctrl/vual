'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';

export default function AboutPage() {
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="px-4 py-6 text-center border-b border-[var(--color-line)]">
        <h1 className="text-lg font-medium tracking-[0.15em] text-[var(--color-title-active)] uppercase">
          Our Story
        </h1>
        <div className="w-12 h-0.5 bg-[var(--color-title-active)] mx-auto mt-2" />
      </div>

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-8"
      >
        <p className="text-sm leading-relaxed text-[var(--color-text-body)] mb-6">
          VUAL is a free download UI kit. You can open VUAL - Free Ecommerce UI Kit file by Figma.
        </p>
        <p className="text-sm leading-relaxed text-[var(--color-text-body)]">
          Create stunning shop with bulletproof guidelines and thoughtful components. Its library contains more than 50+ components supporting Light & Dark Mode and 60+ ready to use mobile screens.
        </p>
      </motion.section>

      {/* Image Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 mb-8"
      >
        <div className="aspect-[4/5] bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)] rounded-[var(--radius-lg)]" />
      </motion.section>

      {/* Sign Up Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-4 py-8 text-center"
      >
        <h2 className="text-lg font-medium tracking-[0.15em] text-[var(--color-title-active)] uppercase mb-4">
          Sign Up
        </h2>
        <div className="w-12 h-0.5 bg-[var(--color-title-active)] mx-auto mb-6" />

        <p className="text-sm text-[var(--color-text-body)] mb-6">
          Receive early access to new arrivals, sales, exclusive content, events and much more!
        </p>

        {subscribed ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-emerald-50 text-emerald-700 rounded-[var(--radius-md)] text-sm"
          >
            Thank you for subscribing!
          </motion.div>
        ) : (
          <form onSubmit={handleSubscribe} className="max-w-sm mx-auto">
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full px-4 py-3 pr-12 border border-[var(--color-line)] rounded-[var(--radius-md)] text-sm focus:outline-none focus:border-[var(--color-accent)]"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--color-text-body)] hover:text-[var(--color-accent)] transition-colors"
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}
      </motion.section>
    </div>
  );
}
