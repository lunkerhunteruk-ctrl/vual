'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { MessageCircle, Phone, Twitter, Instagram, Youtube, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui';

export default function ContactPage() {
  const locale = useLocale();

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="px-4 py-6 text-center border-b border-[var(--color-line)]">
        <h1 className="text-lg font-medium tracking-[0.15em] text-[var(--color-title-active)] uppercase">
          Contact Us
        </h1>
        <div className="w-12 h-0.5 bg-[var(--color-title-active)] mx-auto mt-2" />
      </div>

      {/* Chat Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-8"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center">
            <MessageCircle size={28} className="text-[var(--color-accent)]" />
          </div>
        </div>
        <p className="text-sm text-[var(--color-text-body)] text-center mb-6">
          Need an ASAP answer? Contact us via chat, 24/7! For existing furniture orders, please call us.
        </p>
        <div className="flex justify-center">
          <Button variant="inverse">
            Chat With Us
          </Button>
        </div>
      </motion.section>

      {/* Divider */}
      <div className="px-4">
        <div className="border-t border-[var(--color-line)]" />
      </div>

      {/* Text Us Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 py-8"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center">
            <Phone size={28} className="text-[var(--color-accent)]" />
          </div>
        </div>
        <p className="text-sm text-[var(--color-text-body)] text-center mb-6">
          You can text us at 800-309-2622 — or click on the "text us" link below on your mobile device. Please allow the system to acknowledge a simple greeting (even "Hi" will do!) before providing your question/ order details. Consent is not required for any purchase. Message and data rates may apply. Text messaging may not be available via all carriers.
        </p>
        <div className="flex justify-center">
          <Button variant="inverse">
            Text Us
          </Button>
        </div>
      </motion.section>

      {/* Divider */}
      <div className="px-4">
        <div className="border-t border-[var(--color-line)]" />
      </div>

      {/* Social Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-4 py-8"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center">
            <ExternalLink size={28} className="text-[var(--color-accent)]" />
          </div>
        </div>
        <p className="text-sm text-[var(--color-text-body)] text-center mb-6">
          To send us a private or direct message, like @Open Fashion on Facebook or follow us on Twitter. We'll get back to you ASAP.
        </p>
        <div className="flex justify-center gap-6">
          <a
            href="#"
            className="w-10 h-10 rounded-full border border-[var(--color-line)] flex items-center justify-center hover:bg-[var(--color-bg-element)] transition-colors"
          >
            <Twitter size={18} className="text-[var(--color-text-body)]" />
          </a>
          <a
            href="#"
            className="w-10 h-10 rounded-full border border-[var(--color-line)] flex items-center justify-center hover:bg-[var(--color-bg-element)] transition-colors"
          >
            <Instagram size={18} className="text-[var(--color-text-body)]" />
          </a>
          <a
            href="#"
            className="w-10 h-10 rounded-full border border-[var(--color-line)] flex items-center justify-center hover:bg-[var(--color-bg-element)] transition-colors"
          >
            <Youtube size={18} className="text-[var(--color-text-body)]" />
          </a>
        </div>
      </motion.section>
    </div>
  );
}
