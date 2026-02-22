'use client';

import { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Bell,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ShoppingCart,
  X,
  Send,
  Radio,
  Calendar,
} from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { useStreams } from '@/lib/hooks';

interface Comment {
  id: string;
  userName: string;
  avatar: string;
  message: string;
}

export default function LivePage() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('customer.live');

  // Fetch real streams from Firestore (live or scheduled)
  const { streams, isLoading } = useStreams();

  // Filter to only show live or scheduled streams
  const activeStreams = useMemo(() =>
    streams.filter(s => s.status === 'live' || s.status === 'scheduled'),
    [streams]
  );

  const currentStream = activeStreams[0]; // Show the first active stream

  const [showProducts, setShowProducts] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSendComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now().toString(),
        userName: 'You',
        avatar: '',
        message: newComment,
      };
      setComments(prev => [...prev, comment]);
      setNewComment('');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  // Empty state - no live or scheduled streams
  if (!currentStream) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 mb-6 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center mx-auto">
            <Radio size={32} className="text-[var(--color-text-label)]" />
          </div>
          <h1 className="text-lg font-medium text-[var(--color-title-active)] mb-2">
            {t('noStreams') || 'No Live Streams'}
          </h1>
          <p className="text-sm text-[var(--color-text-body)] mb-6 max-w-xs">
            {t('noStreamsDescription') || 'There are no live streams at the moment. Check back soon for upcoming events.'}
          </p>
          <Button
            variant="primary"
            leftIcon={<ArrowLeft size={16} />}
            onClick={() => router.push(`/${locale}`)}
          >
            {t('backToHome') || 'Back to Home'}
          </Button>
        </motion.div>

        {/* Show upcoming scheduled streams if any */}
        {activeStreams.filter(s => s.status === 'scheduled').length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 w-full max-w-sm"
          >
            <h2 className="text-sm font-medium text-[var(--color-title-active)] mb-4 text-center">
              {t('upcomingStreams') || 'Upcoming Streams'}
            </h2>
            <div className="space-y-3">
              {activeStreams.filter(s => s.status === 'scheduled').map(stream => (
                <div
                  key={stream.id}
                  className="p-4 bg-[var(--color-bg-element)] rounded-[var(--radius-lg)]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={14} className="text-[var(--color-accent)]" />
                    <span className="text-xs text-[var(--color-accent)]">
                      {stream.scheduledAt?.toLocaleDateString()} at {stream.scheduledAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-[var(--color-title-active)]">
                    {stream.title}
                  </h3>
                  {stream.description && (
                    <p className="text-xs text-[var(--color-text-body)] mt-1 line-clamp-2">
                      {stream.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  // Stream products (array of product IDs)
  const hasProducts = currentStream.products && currentStream.products.length > 0;

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Video Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black">
        {currentStream.thumbnailURL && (
          <img
            src={currentStream.thumbnailURL}
            alt={currentStream.title}
            className="w-full h-full object-cover opacity-50"
          />
        )}
      </div>

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent px-4 pt-4 pb-8">
        <div className="flex items-center justify-between">
          <Link
            href={`/${locale}`}
            className="p-2 rounded-full bg-white/10 backdrop-blur-sm"
          >
            <ArrowLeft size={20} className="text-white" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20" />
            <div>
              <p className="text-sm font-medium text-white">{currentStream.title}</p>
              <span className="inline-block px-2 py-0.5 text-[10px] bg-[var(--color-accent)] text-white rounded-full">
                Live
              </span>
            </div>
          </div>
          <button className="p-2 rounded-full bg-white/10 backdrop-blur-sm">
            <Bell size={20} className="text-white" />
          </button>
        </div>

        {/* Live Badge */}
        <div className="flex items-center gap-3 mt-4">
          {currentStream.status === 'live' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600 rounded-full">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              <span className="text-xs font-medium text-white">LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 rounded-full">
              <Calendar size={12} className="text-white" />
              <span className="text-xs font-medium text-white">SCHEDULED</span>
            </div>
          )}
          <span className="text-xs text-white/70">
            {currentStream.viewerCount || 0} watching
          </span>
        </div>
      </div>

      {/* Comments Stream */}
      <div className="absolute left-4 right-16 bottom-24 max-h-60 overflow-y-auto">
        <AnimatePresence>
          {comments.slice(-5).map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 mb-3"
            >
              <div className="w-7 h-7 rounded-full bg-white/20 flex-shrink-0" />
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <p className="text-xs font-medium text-white/80">{comment.userName}</p>
                <p className="text-sm text-white">{comment.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Right Side Actions */}
      <div className="absolute right-4 bottom-40 flex flex-col gap-4">
        <button
          onClick={() => setIsLiked(!isLiked)}
          className="flex flex-col items-center"
        >
          <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm">
            <Heart
              size={22}
              className={isLiked ? 'fill-red-500 text-red-500' : 'text-white'}
            />
          </div>
          <span className="text-[10px] text-white/70 mt-1">0</span>
        </button>
        <button className="flex flex-col items-center">
          <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm">
            <MessageCircle size={22} className="text-white" />
          </div>
          <span className="text-[10px] text-white/70 mt-1">{comments.length}</span>
        </button>
        <button className="flex flex-col items-center">
          <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm">
            <Share2 size={22} className="text-white" />
          </div>
        </button>
        <button className="flex flex-col items-center">
          <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm">
            <Bookmark size={22} className="text-white" />
          </div>
        </button>
        {hasProducts && (
          <button
            onClick={() => setShowProducts(true)}
            className="flex flex-col items-center"
          >
            <div className="p-2 rounded-full bg-[var(--color-accent)]">
              <ShoppingCart size={22} className="text-white" />
            </div>
            <span className="text-[10px] text-white/70 mt-1">{currentStream.products.length}</span>
          </button>
        )}
      </div>

      {/* Comment Input */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
            placeholder={t('typeSomething')}
            className="w-full h-11 px-4 pr-12 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          <button
            onClick={handleSendComment}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2"
          >
            <Send size={18} className="text-white/70" />
          </button>
        </div>
      </div>

      {/* Products Sheet */}
      <AnimatePresence>
        {showProducts && hasProducts && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProducts(false)}
              className="absolute inset-0 bg-black/40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md rounded-t-3xl"
            >
              <div className="flex items-center justify-center py-3">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>
              <div className="flex items-center justify-between px-4 pb-4">
                <h3 className="text-lg font-medium text-[var(--color-title-active)]">
                  {t('products')}
                </h3>
                <button onClick={() => setShowProducts(false)}>
                  <X size={24} className="text-[var(--color-text-label)]" />
                </button>
              </div>

              <div className="px-4 pb-8 max-h-80 overflow-y-auto">
                {currentStream.products.map((productId: string) => (
                  <Link
                    key={productId}
                    href={`/${locale}/product/${productId}`}
                    onClick={() => setShowProducts(false)}
                    className="flex items-center gap-4 py-3 border-b border-[var(--color-line)] last:border-0"
                  >
                    <div className="w-16 h-20 bg-[var(--color-bg-element)] rounded-[var(--radius-md)]" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--color-title-active)]">
                        View Product
                      </p>
                    </div>
                    <Button variant="primary" size="sm">
                      {t('buyNow')}
                    </Button>
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
