'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, Star, MessageSquare, ThumbsUp, ThumbsDown, MoreHorizontal, Check, X, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/admin/dashboard';
import { useReviews } from '@/lib/hooks';

type ReviewStatus = 'pending' | 'approved' | 'rejected';

const statusColors: Record<ReviewStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
};

type TabFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function ProductReviewsPage() {
  const t = useTranslations('admin.products');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { reviews, isLoading, error, approveReview, rejectReview, deleteReview } = useReviews();

  const tabCounts = useMemo(() => ({
    all: reviews.length,
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length,
  }), [reviews]);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: t('allReviews'), count: tabCounts.all },
    { key: 'pending', label: t('pending'), count: tabCounts.pending },
    { key: 'approved', label: t('approved'), count: tabCounts.approved },
    { key: 'rejected', label: t('rejected'), count: tabCounts.rejected },
  ];

  const filteredReviews = useMemo(() => {
    let result = reviews;
    if (activeTab !== 'all') {
      result = result.filter(r => r.status === activeTab);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.productName.toLowerCase().includes(query) ||
        r.customerName.toLowerCase().includes(query) ||
        r.comment.toLowerCase().includes(query)
      );
    }
    return result;
  }, [reviews, activeTab, searchQuery]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  const handleApprove = async (id: string) => {
    try {
      await approveReview(id);
    } catch (err) {
      console.error('Failed to approve review:', err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectReview(id);
    } catch (err) {
      console.error('Failed to reject review:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('confirmDeleteReview'))) {
      try {
        await deleteReview(id);
      } catch (err) {
        console.error('Failed to delete review:', err);
      }
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('totalReviews')}
          value={reviews.length.toString()}
          change={{ value: '15%', isPositive: true }}
          icon={MessageSquare}
        />
        <StatCard
          title={t('avgRating')}
          value={avgRating}
          icon={Star}
        />
        <StatCard
          title={t('pendingReviews')}
          value={tabCounts.pending.toString()}
          subtitle={t('needsReview')}
          icon={ThumbsUp}
        />
        <StatCard
          title={t('rejectedReviews')}
          value={tabCounts.rejected.toString()}
          icon={ThumbsDown}
        />
      </div>

      {/* Reviews Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)]"
      >
        {/* Tabs and Search */}
        <div className="p-4 border-b border-[var(--color-line)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors ${
                    activeTab === tab.key
                      ? 'bg-[var(--color-title-active)] text-white'
                      : 'text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)]'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          <div className="relative max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchReviews')}
              className="w-full h-10 pl-9 pr-4 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-sm text-[var(--color-text-label)]">{t('noReviews')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-line)] bg-[var(--color-bg-element)]">
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    {t('product')}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    {t('customer')}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    {t('rating')}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    {t('review')}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    {t('date')}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    {t('status')}
                  </th>
                  <th className="w-32 py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredReviews.map((review) => (
                  <tr
                    key={review.id}
                    className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-bg-element)] transition-colors"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-[var(--color-title-active)]">
                      {review.productName}
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                      {review.customerName}
                    </td>
                    <td className="py-3 px-4">
                      {renderStars(review.rating)}
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--color-text-body)] max-w-xs truncate">
                      {review.comment}
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                      {formatDate(review.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[review.status]}`}>
                        {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {review.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(review.id)}
                              className="p-1.5 rounded-[var(--radius-sm)] hover:bg-emerald-50 transition-colors"
                            >
                              <Check size={14} className="text-emerald-600" />
                            </button>
                            <button
                              onClick={() => handleReject(review.id)}
                              className="p-1.5 rounded-[var(--radius-sm)] hover:bg-red-50 transition-colors"
                            >
                              <X size={14} className="text-red-500" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(review.id)}
                          className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors"
                        >
                          <MoreHorizontal size={14} className="text-[var(--color-text-label)]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}
