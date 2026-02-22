'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Clock, ArrowRight } from 'lucide-react';
import { Tabs } from '@/components/ui';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  image?: string;
}

const mockPosts: BlogPost[] = [
  {
    id: '1',
    title: 'Spring Collection 2025: Embracing Natural Elegance',
    excerpt: 'Discover our latest collection inspired by the beauty of nature and sustainable fashion.',
    category: 'Collection',
    date: 'Feb 20, 2025',
    readTime: '5 min read',
  },
  {
    id: '2',
    title: 'How to Style Oversized Blazers for Any Occasion',
    excerpt: 'From casual weekends to formal events, learn versatile ways to wear this season\'s must-have piece.',
    category: 'Style Guide',
    date: 'Feb 18, 2025',
    readTime: '4 min read',
  },
  {
    id: '3',
    title: 'Behind the Scenes: Our AI-Powered Virtual Try-On',
    excerpt: 'Take a look at the technology revolutionizing how you shop for clothes online.',
    category: 'Technology',
    date: 'Feb 15, 2025',
    readTime: '6 min read',
  },
  {
    id: '4',
    title: 'Sustainable Fashion: Our Commitment to the Planet',
    excerpt: 'Learn about our eco-friendly practices and sustainable sourcing initiatives.',
    category: 'Sustainability',
    date: 'Feb 12, 2025',
    readTime: '7 min read',
  },
  {
    id: '5',
    title: 'Wardrobe Essentials Every Woman Needs',
    excerpt: 'Build a timeless capsule wardrobe with these must-have pieces.',
    category: 'Style Guide',
    date: 'Feb 10, 2025',
    readTime: '5 min read',
  },
  {
    id: '6',
    title: 'Live Shopping: The Future of E-Commerce',
    excerpt: 'Explore how live commerce is transforming the way we discover and buy fashion.',
    category: 'Technology',
    date: 'Feb 8, 2025',
    readTime: '4 min read',
  },
];

const categories = ['All', 'Collection', 'Style Guide', 'Technology', 'Sustainability'];

export default function BlogPage() {
  const locale = useLocale();
  const t = useTranslations('customer.blog');
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredPosts = activeCategory === 'All'
    ? mockPosts
    : mockPosts.filter(post => post.category === activeCategory);

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="px-4 py-6 text-center border-b border-[var(--color-line)]">
        <h1 className="text-lg font-medium tracking-[0.15em] text-[var(--color-title-active)] uppercase">
          {t('title')}
        </h1>
        <div className="w-12 h-0.5 bg-[var(--color-title-active)] mx-auto mt-2" />
      </div>

      {/* Category Tabs */}
      <div className="px-4 py-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 text-xs font-medium tracking-wide whitespace-nowrap rounded-full transition-colors ${
                activeCategory === category
                  ? 'bg-[var(--color-title-active)] text-white'
                  : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Post */}
      {filteredPosts.length > 0 && (
        <div className="px-4 mb-6">
          <Link href={`/${locale}/blog/${filteredPosts[0].id}`}>
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
              <div className="aspect-[16/9] bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)] rounded-[var(--radius-lg)] mb-4" />
              <span className="inline-block px-2 py-1 mb-2 text-[10px] font-medium tracking-wide text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full uppercase">
                {filteredPosts[0].category}
              </span>
              <h2 className="text-lg font-medium text-[var(--color-title-active)] mb-2 line-clamp-2">
                {filteredPosts[0].title}
              </h2>
              <p className="text-sm text-[var(--color-text-body)] mb-3 line-clamp-2">
                {filteredPosts[0].excerpt}
              </p>
              <div className="flex items-center gap-4 text-xs text-[var(--color-text-label)]">
                <span>{filteredPosts[0].date}</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {filteredPosts[0].readTime}
                </span>
              </div>
            </motion.article>
          </Link>
        </div>
      )}

      {/* Post Grid */}
      <div className="px-4">
        <div className="grid grid-cols-1 gap-6">
          {filteredPosts.slice(1).map((post, index) => (
            <Link key={post.id} href={`/${locale}/blog/${post.id}`}>
              <motion.article
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-4"
              >
                <div className="w-24 h-24 flex-shrink-0 bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)] rounded-[var(--radius-md)]" />
                <div className="flex-1 min-w-0">
                  <span className="inline-block px-2 py-0.5 mb-1.5 text-[9px] font-medium tracking-wide text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full uppercase">
                    {post.category}
                  </span>
                  <h3 className="text-sm font-medium text-[var(--color-title-active)] mb-1 line-clamp-2">
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-label)]">
                    <span>{post.date}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {post.readTime}
                    </span>
                  </div>
                </div>
              </motion.article>
            </Link>
          ))}
        </div>
      </div>

      {/* Load More */}
      <div className="px-4 py-8 text-center">
        <button className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
          {t('loadMore')}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
