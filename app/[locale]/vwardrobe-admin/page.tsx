'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { Users, Sparkles, CreditCard, Layers, ChevronDown, ChevronUp, X } from 'lucide-react';

interface UserRow {
  id: string;
  firebase_uid: string;
  display_name: string | null;
  slug: string;
  type: string;
  paid_credits: number;
  subscription_credits: number;
  free_tickets: number;
  published_collections: number;
  created_at: string;
}

interface Stats {
  totalUsers: number;
  stylistCount: number;
  totalPaidCredits: number;
  totalSubCredits: number;
  totalPublished: number;
}

type SortKey = 'display_name' | 'type' | 'paid_credits' | 'subscription_credits' | 'published_collections' | 'created_at';

export default function VWardrobeAdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [grant, setGrant] = useState<{ uid: string; name: string } | null>(null);
  const [grantAmount, setGrantAmount] = useState('');
  const [grantType, setGrantType] = useState<'paid' | 'subscription'>('subscription');
  const [granting, setGranting] = useState(false);

  const firebaseUid = user?.id;

  const loadData = async (uid: string) => {
    const res = await fetch(`/api/admin/vual-stats?uid=${uid}`);
    const d = await res.json();
    if (d.stats) { setStats(d.stats); setUsers(d.users ?? []); }
  };

  useEffect(() => {
    if (!firebaseUid) return;
    setLoading(true);
    loadData(firebaseUid).finally(() => setLoading(false));
  }, [firebaseUid]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = users
    .filter((u) => {
      const q = filter.toLowerCase();
      const matchText = !q || (u.display_name ?? '').toLowerCase().includes(q) || u.slug.toLowerCase().includes(q);
      const matchType = !typeFilter || u.type === typeFilter;
      return matchText && matchType;
    })
    .sort((a, b) => {
      let av: string | number = a[sortKey] ?? '';
      let bv: string | number = b[sortKey] ?? '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return sortAsc ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
    });

  const handleGrant = async () => {
    if (!grant || !grantAmount || !firebaseUid) return;
    setGranting(true);
    await fetch('/api/admin/vual-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminUid: firebaseUid,
        targetFirebaseUid: grant.uid,
        amount: Number(grantAmount),
        creditType: grantType,
      }),
    });
    setGranting(false);
    setGrant(null);
    setGrantAmount('');
    if (firebaseUid) await loadData(firebaseUid);
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-gray-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '総ユーザー数', value: stats.totalUsers, icon: Users },
            { label: 'スタイリスト', value: stats.stylistCount, icon: Sparkles },
            { label: '付与クレジット合計', value: stats.totalPaidCredits + stats.totalSubCredits, icon: CreditCard },
            { label: '公開コレクション', value: stats.totalPublished, icon: Layers },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500 font-medium">{label}</span>
                <Icon size={14} className="text-gray-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="名前 / slug で検索"
          className="h-10 px-4 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 bg-white flex-1 min-w-[200px] transition-colors"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 px-4 text-sm border border-gray-200 rounded-xl outline-none bg-white transition-colors"
        >
          <option value="">全タイプ</option>
          <option value="general">general</option>
          <option value="stylist">stylist</option>
          <option value="brand">brand</option>
        </select>
        <span className="self-center text-sm text-gray-400">
          {filtered.length} / {users.length} 件
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {(
                [
                  ['display_name', '名前'],
                  ['type', 'タイプ'],
                  ['paid_credits', 'PAID'],
                  ['subscription_credits', 'SUB'],
                  ['published_collections', '公開数'],
                  ['created_at', '登録日'],
                ] as [SortKey, string][]
              ).map(([k, label]) => (
                <th
                  key={k}
                  onClick={() => handleSort(k)}
                  className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700 transition-colors"
                >
                  <span className="flex items-center gap-1">{label}<SortIcon k={k} /></span>
                </th>
              ))}
              <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500">無料</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr
                key={u.id}
                className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none' }}
              >
                <td className="px-5 py-4">
                  <div className="font-medium text-gray-900">{u.display_name ?? '—'}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{u.slug}</div>
                </td>
                <td className="px-5 py-4">
                  <span
                    className="inline-block px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: u.type === 'stylist' ? '#ecfdf5' : u.type === 'brand' ? '#fefce8' : '#f3f4f6',
                      color: u.type === 'stylist' ? '#059669' : u.type === 'brand' ? '#ca8a04' : '#6b7280',
                    }}
                  >
                    {u.type}
                  </span>
                </td>
                <td className="px-5 py-4 text-center font-medium text-gray-900">{u.paid_credits}</td>
                <td className="px-5 py-4 text-center font-medium text-gray-900">{u.subscription_credits}</td>
                <td className="px-5 py-4 text-center font-medium text-gray-900">{u.published_collections}</td>
                <td className="px-5 py-4 text-sm text-gray-500">
                  {new Date(u.created_at).toLocaleDateString('ja-JP', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                </td>
                <td className="px-5 py-4 text-center text-sm text-gray-400">{u.free_tickets}</td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => setGrant({ uid: u.firebase_uid, name: u.display_name ?? u.slug })}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors"
                  >
                    付与
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">
                  ユーザーが見つかりません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Grant Modal */}
      {grant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setGrant(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">クレジット付与</h2>
              <button onClick={() => setGrant(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-500">{grant.name}</p>

            <div className="flex gap-2">
              {(['subscription', 'paid'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setGrantType(t)}
                  className="flex-1 py-2 text-sm font-medium rounded-lg border transition-colors"
                  style={{
                    background: grantType === t ? '#111' : 'white',
                    color: grantType === t ? 'white' : '#6b7280',
                    borderColor: grantType === t ? '#111' : '#e5e7eb',
                  }}
                >
                  {t === 'subscription' ? 'サブスク' : 'PAID'}
                </button>
              ))}
            </div>

            <input
              type="number"
              min={1}
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              placeholder="クレジット数を入力"
              className="w-full h-11 px-4 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors"
            />

            <button
              onClick={handleGrant}
              disabled={granting || !grantAmount}
              className="w-full h-11 text-sm font-medium rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              {granting ? '付与中...' : '付与する'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
