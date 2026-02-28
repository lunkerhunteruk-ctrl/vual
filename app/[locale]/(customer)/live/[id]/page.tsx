'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ShoppingBag,
  ShoppingCart,
  X,
  Send,
  Radio,
  Users,
  Package,
} from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { MuxPlayer } from '@/components/customer/live';
import { useCartStore } from '@/lib/store/cart';
import type { LiveComment, LiveStream } from '@/lib/types';

interface StreamProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  imageUrl?: string | null;
}

export default function LiveStreamPage() {
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const streamId = params.id as string;
  const t = useTranslations('customer.live');

  const addItem = useCartStore((s) => s.addItem);

  // Real-time Firestore listener for stream data
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!streamId || !db) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'streams', streamId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStream({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            scheduledAt: data.scheduledAt?.toDate(),
            startedAt: data.startedAt?.toDate(),
            endedAt: data.endedAt?.toDate(),
          } as LiveStream);
        } else {
          setStream(null);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Stream listener error:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [streamId]);

  const [showProducts, setShowProducts] = useState(false);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [addedToCart, setAddedToCart] = useState<Set<string>>(new Set());
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

  const handleAddToCart = (product: StreamProduct) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      currency: product.currency || 'jpy',
      image: product.imageUrl || undefined,
    });
    setAddedToCart(prev => new Set(prev).add(product.id));
    setTimeout(() => {
      setAddedToCart(prev => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 2000);
  };

  const handleBuyNow = (product: StreamProduct) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      currency: product.currency || 'jpy',
      image: product.imageUrl || undefined,
    });
    setShowProducts(false);
    router.push(`/${locale}/cart`);
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'jpy' || !currency) {
      return `¥${price.toLocaleString()}`;
    }
    return `$${price.toLocaleString()}`;
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

  // Products are stored as objects — real-time updated via onSnapshot
  const products: StreamProduct[] = (stream.products || []).map((p: any) =>
    typeof p === 'string' ? { id: p, name: '', price: 0, currency: 'jpy' } : p
  );
  const hasProducts = products.length > 0;
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
              <ShoppingBag size={22} className="text-white" />
            </div>
            <span className="text-[10px] text-white/70 mt-1">{products.length}</span>
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

      {/* Products Bottom Sheet — shows ~2 items, scrollable */}
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
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-30"
              style={{ maxHeight: '40vh' }}
            >
              {/* Handle bar */}
              <div className="flex items-center justify-center py-3">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3">
                <h3 className="text-base font-semibold text-[var(--color-title-active)]">
                  Products
                  <span className="ml-2 text-xs font-normal text-[var(--color-text-label)]">
                    {products.length}
                  </span>
                </h3>
                <button
                  onClick={() => setShowProducts(false)}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X size={20} className="text-[var(--color-text-label)]" />
                </button>
              </div>

              {/* Product List — scrollable */}
              <div className="px-5 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(40vh - 72px)' }}>
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0"
                  >
                    {/* Product Image */}
                    {product.imageUrl ? (
                      <Link
                        href={`/${locale}/product/${product.id}`}
                        onClick={() => setShowProducts(false)}
                        className="shrink-0"
                      >
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-14 h-[70px] object-cover rounded-lg bg-gray-100"
                        />
                      </Link>
                    ) : (
                      <div className="w-14 h-[70px] bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                        <Package size={18} className="text-gray-300" />
                      </div>
                    )}

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/${locale}/product/${product.id}`}
                        onClick={() => setShowProducts(false)}
                      >
                        <p className="text-sm font-medium text-[var(--color-title-active)] line-clamp-1">
                          {product.name || '商品を見る'}
                        </p>
                      </Link>
                      <p className="text-sm font-semibold text-[var(--color-accent)] mt-0.5">
                        {formatPrice(product.price, product.currency)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleAddToCart(product)}
                        className={`p-2 rounded-full border transition-colors ${
                          addedToCart.has(product.id)
                            ? 'bg-green-50 border-green-300 text-green-600'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <ShoppingCart size={16} />
                      </button>

                      <button
                        onClick={() => handleBuyNow(product)}
                        className="px-3 py-1.5 bg-[var(--color-accent)] text-white text-xs font-medium rounded-full hover:opacity-90 transition-opacity whitespace-nowrap"
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
