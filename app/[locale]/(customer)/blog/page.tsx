'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clock, ArrowRight, ArrowLeft, Loader2, FileText } from 'lucide-react';
import { useBlogPosts, useBlogCategories } from '@/lib/hooks';
import { Button } from '@/components/ui';
import type { BlogPost } from '@/lib/types';

export default function BlogPage() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('customer.blog');
  const [activeCategory, setActiveCategory] = useState('All');

  const { posts, isLoading, hasMore, loadMore } = useBlogPosts({ isPublished: true });
  const { categories: blogCategories } = useBlogCategories();

  const categories = ['All', ...blogCategories];

  const filteredPosts = useMemo(() => {
    if (activeCategory === 'All') return posts;
    return posts.filter(post => post.category === activeCategory);
  }, [posts, activeCategory]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  // Show empty state if no posts
  if (!isLoading && posts.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 mb-6 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center mx-auto">
            <FileText size={32} className="text-[var(--color-text-label)]" />
          </div>
          <h1 className="text-lg font-medium text-[var(--color-title-active)] mb-2">
            No Blog Posts Yet
          </h1>
          <p className="text-sm text-[var(--color-text-body)] mb-6 max-w-xs">
            Check back soon for updates on our latest collections, style guides, and more.
          </p>
          <Button
            variant="primary"
            leftIcon={<ArrowLeft size={16} />}
            onClick={() => router.push(`/${locale}`)}
          >
            Back to Home
          </Button>
        </motion.div>
      </div>
    );
  }

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

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
        </div>
      ) : (
        <>
          {/* Featured Post */}
          {filteredPosts.length > 0 && (
            <div className="px-4 mb-6">
              <Link href={`/${locale}/blog/${filteredPosts[0].id}`}>
                <motion.article
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative"
                >
                  <div className="aspect-[16/9] bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)] rounded-[var(--radius-lg)] mb-4 overflow-hidden">
                    {filteredPosts[0].coverImage && (
                      <img
                        src={filteredPosts[0].coverImage}
                        alt={filteredPosts[0].title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
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
                    <span>{formatDate(filteredPosts[0].createdAt)}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {filteredPosts[0].readTime} min read
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
                    <div className="w-24 h-24 flex-shrink-0 bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)] rounded-[var(--radius-md)] overflow-hidden">
                      {post.coverImage && (
                        <img
                          src={post.coverImage}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="inline-block px-2 py-0.5 mb-1.5 text-[9px] font-medium tracking-wide text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full uppercase">
                        {post.category}
                      </span>
                      <h3 className="text-sm font-medium text-[var(--color-title-active)] mb-1 line-clamp-2">
                        {post.title}
                      </h3>
                      <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-label)]">
                        <span>{formatDate(post.createdAt)}</span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {post.readTime} min read
                        </span>
                      </div>
                    </div>
                  </motion.article>
                </Link>
              ))}
            </div>
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="px-4 py-8 text-center">
              <button
                onClick={loadMore}
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]"
              >
                {t('loadMore')}
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Empty filtered state */}
          {filteredPosts.length === 0 && posts.length > 0 && (
            <div className="px-4 py-20 text-center">
              <p className="text-sm text-[var(--color-text-label)]">
                No posts in this category
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
