'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowLeft, Bell, Package, Sparkles, Radio, Tag, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

interface NotificationCategory {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultEnabled: boolean;
}

const categories: NotificationCategory[] = [
  {
    key: 'order_status',
    label: '注文ステータス更新',
    description: '注文確認、発送、配達のお知らせ',
    icon: <Package size={20} />,
    defaultEnabled: true,
  },
  {
    key: 'new_products',
    label: '新商品入荷',
    description: 'フォローしているブランドの新商品',
    icon: <ShoppingBag size={20} />,
    defaultEnabled: true,
  },
  {
    key: 'live_streams',
    label: 'ライブ配信開始',
    description: 'ショップのライブ配信が始まったとき',
    icon: <Radio size={20} />,
    defaultEnabled: true,
  },
  {
    key: 'promotions',
    label: 'セール・プロモーション',
    description: 'セール情報やクーポンのお知らせ',
    icon: <Tag size={20} />,
    defaultEnabled: false,
  },
  {
    key: 'tryon_results',
    label: '試着結果完了',
    description: 'バーチャル試着の結果が完了したとき',
    icon: <Sparkles size={20} />,
    defaultEnabled: true,
  },
];

const STORAGE_KEY = 'vual-notification-prefs';

export default function NotificationSettingsPage() {
  const locale = useLocale();
  const router = useRouter();
  const { customer } = useAuthStore();

  const [settings, setSettings] = useState<Record<string, boolean>>({});

  // Load saved preferences
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch {
        initDefaults();
      }
    } else {
      initDefaults();
    }
  }, []);

  const initDefaults = () => {
    const defaults: Record<string, boolean> = {};
    categories.forEach(cat => {
      defaults[cat.key] = cat.defaultEnabled;
    });
    setSettings(defaults);
  };

  const toggleSetting = (key: string) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const isLineConnected = !!customer?.lineUserId;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-14 z-10 bg-white/95 backdrop-blur-md border-b border-[var(--color-line)]">
        <div className="flex items-center gap-3 px-4 h-12">
          <button onClick={() => router.back()}>
            <ArrowLeft size={20} className="text-[var(--color-title-active)]" />
          </button>
          <h1 className="text-base font-semibold text-[var(--color-title-active)]">
            通知設定
          </h1>
        </div>
      </div>

      <div className="px-4 py-6">
        {/* LINE Connection Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl mb-6 ${
            isLineConnected
              ? 'bg-green-50 border border-green-200'
              : 'bg-amber-50 border border-amber-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <Bell size={20} className={isLineConnected ? 'text-green-600' : 'text-amber-600'} />
            <div>
              <p className={`text-sm font-medium ${isLineConnected ? 'text-green-800' : 'text-amber-800'}`}>
                {isLineConnected
                  ? 'LINE通知が有効です'
                  : 'LINE連携が必要です'}
              </p>
              <p className={`text-xs mt-0.5 ${isLineConnected ? 'text-green-600' : 'text-amber-600'}`}>
                {isLineConnected
                  ? 'プッシュ通知を受け取れます'
                  : 'LINE LIFFからログインすると通知を受け取れます'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Category Toggles */}
        <div className="space-y-1">
          {categories.map((cat, index) => (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between py-4 border-b border-[var(--color-line)] last:border-0"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-[var(--color-text-label)]">{cat.icon}</div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-title-active)]">
                    {cat.label}
                  </p>
                  <p className="text-xs text-[var(--color-text-label)] mt-0.5">
                    {cat.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting(cat.key)}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  settings[cat.key]
                    ? 'bg-[var(--color-accent)]'
                    : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    settings[cat.key] ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Info */}
        <p className="text-xs text-[var(--color-text-label)] mt-6 text-center">
          通知はLINEの公式アカウント経由で送信されます。
          LINEアプリの設定からも通知を管理できます。
        </p>
      </div>
    </div>
  );
}
