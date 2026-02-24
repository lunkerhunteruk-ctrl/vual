'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui';

interface LineStatus {
  hasToken: boolean;
  lineChannelId: string | null;
  lineBotBasicId: string | null;
  lineConnectedAt: string | null;
}

export default function LineSettingsPage() {
  const [status, setStatus] = useState<LineStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form
  const [channelAccessToken, setChannelAccessToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [showToken, setShowToken] = useState(false);

  // Connected bot info
  const [botName, setBotName] = useState('');
  const [botBasicId, setBotBasicId] = useState('');

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/stores/line');
      const data = await res.json();
      setStatus(data);
      if (data.lineBotBasicId) {
        setBotBasicId(data.lineBotBasicId);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!channelAccessToken.trim()) {
      setError('チャネルアクセストークンを入力してください');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/stores/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelAccessToken: channelAccessToken.trim(),
          channelId: channelId.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setBotName(data.botName || '');
      setBotBasicId(data.botBasicId || '');
      setSuccess(`LINE公式アカウント「${data.botName}」と連携しました`);
      setChannelAccessToken('');
      setChannelId('');
      await fetchStatus();
    } catch {
      setError('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('LINE連携を解除しますか？プッシュ通知が送信できなくなります。')) return;

    setIsDisconnecting(true);
    try {
      await fetch('/api/stores/line', { method: 'DELETE' });
      setStatus(null);
      setBotName('');
      setBotBasicId('');
      setSuccess('LINE連携を解除しました');
      await fetchStatus();
    } catch {
      setError('解除に失敗しました');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const copyFriendUrl = () => {
    const id = botBasicId || status?.lineBotBasicId;
    if (id) {
      navigator.clipboard.writeText(`https://line.me/R/ti/p/${id}`);
      setSuccess('友だち追加URLをコピーしました');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
      </div>
    );
  }

  const isConnected = status?.hasToken;

  return (
    <div className="max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Status Card */}
        <div
          className={`p-6 rounded-xl border mb-6 ${
            isConnected
              ? 'bg-green-50 border-green-200'
              : 'bg-[var(--color-bg-element)] border-[var(--color-line)]'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isConnected ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <MessageCircle size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[var(--color-title-active)]">
                  LINE Messaging API
                </h2>
                {isConnected ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    <CheckCircle2 size={12} />
                    連携済み
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                    未連携
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--color-text-body)] mt-1">
                {isConnected
                  ? 'LINE公式アカウントからプッシュ通知を送信できます'
                  : 'LINE公式アカウントを連携して顧客にプッシュ通知を送信しましょう'}
              </p>
              {isConnected && status?.lineConnectedAt && (
                <p className="text-xs text-[var(--color-text-label)] mt-2">
                  連携日: {new Date(status.lineConnectedAt).toLocaleDateString('ja-JP')}
                </p>
              )}
            </div>
          </div>

          {/* Connected Info */}
          {isConnected && (botBasicId || status?.lineBotBasicId) && (
            <div className="mt-4 pt-4 border-t border-green-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--color-text-label)]">Bot ID（LINE自動割り当て・変更不可）</p>
                  <p className="text-sm font-mono text-[var(--color-title-active)]">
                    {botBasicId || status?.lineBotBasicId}
                  </p>
                </div>
                <button
                  onClick={copyFriendUrl}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                >
                  <Copy size={12} />
                  友だち追加URL
                </button>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-label)]">友だち追加リンク</p>
                <p className="text-sm font-mono text-[var(--color-accent)]">
                  https://line.me/R/ti/p/{botBasicId || status?.lineBotBasicId}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Error / Success Messages */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 size={16} className="text-green-500 shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Setup Form */}
        {!isConnected && (
          <div className="p-6 bg-white border border-[var(--color-line)] rounded-xl">
            <h3 className="text-base font-semibold text-[var(--color-title-active)] mb-4">
              LINE公式アカウントを連携
            </h3>

            {/* Instructions */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-2">設定手順</p>
              <ol className="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
                <li>LINE Official Account Managerで公式アカウントを作成</li>
                <li>設定 → Messaging API を有効化</li>
                <li>LINE Developers Consoleでチャネルアクセストークン（長期）を発行</li>
                <li>発行されたトークンを下のフォームに貼り付けて保存</li>
              </ol>
              <a
                href="https://developers.line.biz/console/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-xs text-blue-600 hover:underline"
              >
                LINE Developers Console
                <ExternalLink size={10} />
              </a>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-title-active)] mb-1.5">
                  チャネルアクセストークン <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={channelAccessToken}
                    onChange={(e) => setChannelAccessToken(e.target.value)}
                    placeholder="チャネルアクセストークン（長期）を貼り付け"
                    className="w-full h-11 px-4 pr-12 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-lg font-mono focus:outline-none focus:border-[var(--color-accent)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-label)]"
                  >
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-title-active)] mb-1.5">
                  チャネルID <span className="text-xs text-[var(--color-text-label)]">(任意)</span>
                </label>
                <input
                  type="text"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  placeholder="Messaging API チャネルID"
                  className="w-full h-11 px-4 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-lg font-mono focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving || !channelAccessToken.trim()}
                className="w-full"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    接続を確認中...
                  </span>
                ) : (
                  '連携する'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Disconnect */}
        {isConnected && (
          <div className="p-6 bg-white border border-[var(--color-line)] rounded-xl">
            <h3 className="text-base font-semibold text-[var(--color-title-active)] mb-2">
              通知の種類
            </h3>
            <p className="text-sm text-[var(--color-text-body)] mb-4">
              以下の通知が顧客のLINEに自動送信されます
            </p>
            <ul className="space-y-2 mb-6">
              {[
                '注文確認・ステータス更新',
                '商品発送通知',
                'ライブ配信開始',
                '新商品入荷',
                'セール・プロモーション',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-[var(--color-text-body)]">
                  <CheckCircle2 size={14} className="text-green-500" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="pt-4 border-t border-[var(--color-line)]">
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
              >
                {isDisconnecting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                LINE連携を解除
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
