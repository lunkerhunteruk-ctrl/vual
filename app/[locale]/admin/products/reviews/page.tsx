'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, Star, MessageSquare, ThumbsUp, ThumbsDown, MoreHorizontal, Check, X } from 'lucide-react';
import { StatCard } from '@/components/admin/dashboard';

type ReviewStatus = 'pending' | 'approved' | 'rejected';

interface Review {
  id: string;
  productName: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
  status: ReviewStatus;
  helpful: number;
}

const mockReviews: Review[] = [
  { id: '1', productName: 'Oversized Blazer', customerName: 'John Doe', rating: 5, comment: 'Excellent quality and perfect fit!', date: '2025-01-15', status: 'approved', helpful: 12 },
  { id: '2', productName: 'Silk Dress', customerName: 'Jane Smith', rating: 4, comment: 'Beautiful dress, slightly smaller than expected.', date: '2025-01-14', status: 'pending', helpful: 5 },
  { id: '3', productName: 'Wool Cardigan', customerName: 'Mike Johnson', rating: 5, comment: 'So warm and cozy! Love it.', date: '2025-01-13', status: 'approved', helpful: 8 },
  { id: '4', productName: 'Leather Bag', customerName: 'Sarah Williams', rating: 3, comment: 'Good quality but strap could be longer.', date: '2025-01-12', status: 'pending', helpful: 3 },
  { id: '5', productName: 'Cotton T-Shirt', customerName: 'Tom Brown', rating: 1, comment: 'Poor quality, fell apart after one wash.', date: '2025-01-11', status: 'rejected', helpful: 0 },
];

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

  const tabCounts = useMemo(() => ({
    all: mockReviews.length,
    pending: mockReviews.filter(r => r.status === 'pending').length,
    approved: mockReviews.filter(r => r.status === 'approved').length,
    rejected: mockReviews.filter(r => r.status === 'rejected').length,
  }), []);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: t('allReviews'), count: tabCounts.all },
    { key: 'pending', label: t('pending'), count: tabCounts.pending },
    { key: 'approved', label: t('approved'), count: tabCounts.approved },
    { key: 'rejected', label: t('rejected'), count: tabCounts.rejected },
  ];

  const filteredReviews = useMemo(() => {
    let result = mockReviews;
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
  }, [activeTab, searchQuery]);

  const avgRating = (mockReviews.reduce((sum, r) => sum + r.rating, 0) / mockReviews.length).toFixed(1);

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

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('totalReviews')}
          value={mockReviews.length.toString()}
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
                    {review.date}
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
                          <button className="p-1.5 rounded-[var(--radius-sm)] hover:bg-emerald-50 transition-colors">
                            <Check size={14} className="text-emerald-600" />
                          </button>
                          <button className="p-1.5 rounded-[var(--radius-sm)] hover:bg-red-50 transition-colors">
                            <X size={14} className="text-red-500" />
                          </button>
                        </>
                      )}
                      <button className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors">
                        <MoreHorizontal size={14} className="text-[var(--color-text-label)]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
