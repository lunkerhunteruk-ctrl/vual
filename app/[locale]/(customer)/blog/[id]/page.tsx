'use client';

import { useParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Calendar, Share2, Bookmark, ChevronLeft, ChevronRight, FileX } from 'lucide-react';
import { useBlogPost } from '@/lib/hooks';
import { Skeleton, Button } from '@/components/ui';

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const postId = params.id as string;

  const { post, isLoading, error } = useBlogPost(postId);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen pb-8">
        <div className="px-4 py-3 border-b">
          <Skeleton className="w-16 h-6" />
        </div>
        <Skeleton className="w-full aspect-video" />
        <div className="px-4 py-6 space-y-4">
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-full h-8" />
          <Skeleton className="w-40 h-4" />
          <Skeleton className="w-full h-40" />
        </div>
      </div>
    );
  }

  // Post not found
  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 mb-6 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center mx-auto">
            <FileX size={32} className="text-[var(--color-text-label)]" />
          </div>
          <h1 className="text-lg font-medium text-[var(--color-title-active)] mb-2">
            Post Not Found
          </h1>
          <p className="text-sm text-[var(--color-text-body)] mb-6 max-w-xs">
            This blog post may have been removed or is no longer available.
          </p>
          <Button
            variant="primary"
            leftIcon={<ArrowLeft size={16} />}
            onClick={() => router.push(`/${locale}/blog`)}
          >
            Back to Blog
          </Button>
        </motion.div>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Back Button */}
      <div className="sticky top-14 z-10 bg-white border-b border-[var(--color-line)] px-4 py-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)] transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Blog
        </button>
      </div>

      {/* Cover Image */}
      {post.coverImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="aspect-video bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)]"
        >
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </motion.div>
      )}

      {/* Article Content */}
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 py-6"
      >
        {/* Category */}
        <span className="inline-block px-3 py-1 mb-4 text-xs font-medium tracking-wide text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full uppercase">
          {post.category}
        </span>

        {/* Title */}
        <h1 className="text-2xl font-medium text-[var(--color-title-active)] mb-4">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-[var(--color-text-label)] mb-6 pb-6 border-b border-[var(--color-line)]">
          <span className="flex items-center gap-1.5">
            <Calendar size={14} />
            {formatDate(post.publishedAt || post.createdAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} />
            {post.readTime} min read
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: post.title, url: window.location.href });
              }
            }}
            className="flex items-center gap-2 text-sm text-[var(--color-text-body)] hover:text-[var(--color-accent)] transition-colors"
          >
            <Share2 size={16} />
            Share
          </button>
          <button className="flex items-center gap-2 text-sm text-[var(--color-text-body)] hover:text-[var(--color-accent)] transition-colors">
            <Bookmark size={16} />
            Save
          </button>
        </div>

        {/* Content */}
        <div
          className="prose prose-sm max-w-none text-[var(--color-text-body)]"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </motion.article>

      {/* Navigation */}
      <div className="px-4 py-6 border-t border-[var(--color-line)]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push(`/${locale}/blog`)}
            className="flex items-center gap-2 text-sm text-[var(--color-text-body)] hover:text-[var(--color-accent)] transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Blog
          </button>
        </div>
      </div>
    </div>
  );
}
