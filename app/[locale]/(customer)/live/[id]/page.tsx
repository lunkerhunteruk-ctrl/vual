'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ShoppingCart,
  X,
  Send,
  Radio,
  Users,
} from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { MuxPlayer } from '@/components/customer/live';
import { useStream } from '@/lib/hooks/useStreams';
import type { LiveComment } from '@/lib/types';

export default function LiveStreamPage() {
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const streamId = params.id as string;
  const t = useTranslations('customer.live');

  const { stream, isLoading } = useStream(streamId);

  const [showProducts, setShowProducts] = useState(false);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    const comment: LiveComment = {
      id: Date.now().toString(),
      streamId,
      userId: 'me',
      userName: 'You',
      message: newComment,
      createdAt: new Date(),
    };
    setComments(prev => [...prev, comment]);
    setNewComment('');
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 mb-4 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center">
          <Radio size={28} className="text-[var(--color-text-label)]" />
        </div>
        <p className="text-sm font-medium text-[var(--color-title-active)] mb-2">
          配信が見つかりません
        </p>
        <Button variant="ghost" onClick={() => router.push(`/${locale}/live`)}>
          配信一覧に戻る
        </Button>
      </div>
    );
  }

  const hasProducts = stream.products && stream.products.length > 0;
  const isLive = stream.status === 'live';
  const hasPlayback = !!stream.playbackId;

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Video / Thumbnail Area */}
      <div className="absolute inset-0">
        {hasPlayback ? (
          <MuxPlayer
            playbackId={stream.playbackId!}
            title={stream.title}
            autoPlay={isLive}
            muted={isLive}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-gray-900 to-black">
            {stream.thumbnailURL ? (
              <img
                src={stream.thumbnailURL}
                alt={stream.title}
                className="w-full h-full object-cover opacity-50"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Radio size={48} className="text-white/20" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent px-4 pt-4 pb-8">
        <div className="flex items-center justify-between">
          <Link
            href={`/${locale}/live`}
            className="p-2 rounded-full bg-white/10 backdrop-blur-sm"
          >
            <ArrowLeft size={20} className="text-white" />
          </Link>
          <div className="flex-1 mx-3 min-w-0">
            <p className="text-sm font-medium text-white truncate">{stream.title}</p>
            {stream.description && (
              <p className="text-xs text-white/60 truncate">{stream.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isLive && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600 rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                <span className="text-xs font-bold text-white">LIVE</span>
              </div>
            )}
          </div>
        </div>

        {/* Viewer count */}
        {isLive && (
          <div className="flex items-center gap-1.5 mt-3">
            <Users size={12} className="text-white/70" />
            <span className="text-xs text-white/70">
              {stream.viewerCount || 0} 人が視聴中
            </span>
          </div>
        )}
      </div>

      {/* Comments Stream */}
      <div className="absolute left-4 right-16 bottom-24 max-h-60 overflow-y-auto scrollbar-hide">
        <AnimatePresence>
          {comments.slice(-8).map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 mb-3"
            >
              <div className="w-7 h-7 rounded-full bg-white/20 flex-shrink-0 flex items-center justify-center">
                <span className="text-[10px] text-white font-medium">
                  {comment.userName.charAt(0)}
                </span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <p className="text-xs font-medium text-white/80">{comment.userName}</p>
                <p className="text-sm text-white">{comment.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={commentsEndRef} />
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
        </button>
        <button
          onClick={() => inputRef.current?.focus()}
          className="flex flex-col items-center"
        >
          <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm">
            <MessageCircle size={22} className="text-white" />
          </div>
          {comments.length > 0 && (
            <span className="text-[10px] text-white/70 mt-1">{comments.length}</span>
          )}
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
            <span className="text-[10px] text-white/70 mt-1">{stream.products.length}</span>
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
              className="absolute inset-0 bg-black/40 z-20"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md rounded-t-3xl z-30"
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
                {stream.products.map((productId: string) => (
                  <Link
                    key={productId}
                    href={`/${locale}/product/${productId}`}
                    onClick={() => setShowProducts(false)}
                    className="flex items-center gap-4 py-3 border-b border-[var(--color-line)] last:border-0"
                  >
                    <div className="w-16 h-20 bg-[var(--color-bg-element)] rounded-[var(--radius-md)]" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--color-title-active)]">
                        商品を見る
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
