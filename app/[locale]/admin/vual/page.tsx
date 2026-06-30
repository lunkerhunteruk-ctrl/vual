'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { Users, Sparkles, CreditCard, Layers, ChevronDown, ChevronUp, X } from 'lucide-react';

const MONO = "'JetBrains Mono', 'SF Mono', 'Courier New', monospace";

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

interface GrantModal {
  uid: string;
  name: string;
}

type SortKey = 'display_name' | 'type' | 'paid_credits' | 'subscription_credits' | 'published_collections' | 'created_at';

export default function VualAdminPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [grant, setGrant] = useState<GrantModal | null>(null);
  const [grantAmount, setGrantAmount] = useState('');
  const [grantType, setGrantType] = useState<'paid' | 'subscription'>('subscription');
  const [granting, setGranting] = useState(false);

  const firebaseUid = user?.id;

  useEffect(() => {
    if (!firebaseUid) return;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/vual-stats?uid=${firebaseUid}`);
      const d = await res.json();
      if (d.stats) {
        setStats(d.stats);
        setUsers(d.users ?? []);
      }
      setLoading(false);
    })();
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
    // Refresh data
    const res = await fetch(`/api/admin/vual-stats?uid=${firebaseUid}`);
    const d = await res.json();
    if (d.stats) { setStats(d.stats); setUsers(d.users ?? []); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortAsc ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ fontFamily: MONO }}>
        <span className="text-[10px] tracking-[3px]" style={{ color: 'var(--vault-text-dim)' }}>LOADING...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ fontFamily: MONO }}>
      {/* Header */}
      <div>
        <h1 className="text-[11px] tracking-[4px] font-medium" style={{ color: 'var(--vault-text)' }}>VUAL PLATFORM ADMIN</h1>
        <p className="text-[9px] tracking-[2px] mt-1" style={{ color: 'var(--vault-text-dim)' }}>ユーザー・クレジット・コレクション管理</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'TOTAL USERS', value: stats.totalUsers, icon: Users },
            { label: 'STYLISTS', value: stats.stylistCount, icon: Sparkles },
            { label: 'PAID CREDITS', value: stats.totalPaidCredits + stats.totalSubCredits, icon: CreditCard },
            { label: 'PUBLISHED', value: stats.totalPublished, icon: Layers },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded p-4"
              style={{ background: 'var(--vault-border)', border: '1px solid var(--vault-border)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] tracking-[2px]" style={{ color: 'var(--vault-text-dim)' }}>{label}</span>
                <Icon size={12} style={{ color: 'var(--vault-text-dim)' }} />
              </div>
              <div className="text-[20px] font-bold tracking-tight" style={{ color: 'var(--vault-text)' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="名前 / slug で検索"
          className="px-3 py-1.5 text-[10px] tracking-[1px] rounded outline-none flex-1 min-w-[160px]"
          style={{ background: 'var(--vault-border)', color: 'var(--vault-text)', border: '1px solid var(--vault-border)' }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-[10px] tracking-[1px] rounded outline-none"
          style={{ background: 'var(--vault-border)', color: 'var(--vault-text)', border: '1px solid var(--vault-border)' }}
        >
          <option value="">全タイプ</option>
          <option value="general">general</option>
          <option value="stylist">stylist</option>
          <option value="brand">brand</option>
        </select>
        <span className="self-center text-[9px] tracking-[2px]" style={{ color: 'var(--vault-text-dim)' }}>
          {filtered.length} / {users.length}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded" style={{ border: '1px solid var(--vault-border)' }}>
        <table className="w-full text-[9px] tracking-[1px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--vault-border)', background: 'var(--vault-border)' }}>
              {(
                [
                  ['display_name', '名前'],
                  ['type', 'タイプ'],
                  ['paid_credits', 'PAID'],
                  ['subscription_credits', 'SUB'],
                  ['published_collections', 'PUB'],
                  ['created_at', '登録日'],
                ] as [SortKey, string][]
              ).map(([k, label]) => (
                <th
                  key={k}
                  onClick={() => handleSort(k)}
                  className="px-3 py-2 text-left cursor-pointer select-none"
                  style={{ color: 'var(--vault-text-dim)', fontWeight: 500 }}
                >
                  <span className="flex items-center gap-1">{label}<SortIcon k={k} /></span>
                </th>
              ))}
              <th className="px-3 py-2 text-left" style={{ color: 'var(--vault-text-dim)', fontWeight: 500 }}>FREE</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr
                key={u.id}
                style={{
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--vault-border)' : undefined,
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                }}
              >
                <td className="px-3 py-2" style={{ color: 'var(--vault-text)' }}>
                  <div>{u.display_name ?? '—'}</div>
                  <div className="text-[8px]" style={{ color: 'var(--vault-text-dim)' }}>{u.slug}</div>
                </td>
                <td className="px-3 py-2">
                  <span
                    className="px-1.5 py-0.5 rounded-sm text-[8px] tracking-[1px]"
                    style={{
                      background: u.type === 'stylist' ? 'rgba(0,220,180,0.12)' : u.type === 'brand' ? 'rgba(220,180,0,0.12)' : 'rgba(255,255,255,0.06)',
                      color: u.type === 'stylist' ? 'var(--vault-cyan)' : u.type === 'brand' ? '#dbb840' : 'var(--vault-text-dim)',
                    }}
                  >
                    {u.type}
                  </span>
                </td>
                <td className="px-3 py-2 text-center" style={{ color: 'var(--vault-text)' }}>{u.paid_credits}</td>
                <td className="px-3 py-2 text-center" style={{ color: 'var(--vault-text)' }}>{u.subscription_credits}</td>
                <td className="px-3 py-2 text-center" style={{ color: 'var(--vault-text)' }}>{u.published_collections}</td>
                <td className="px-3 py-2" style={{ color: 'var(--vault-text-dim)' }}>
                  {new Date(u.created_at).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit', year: '2-digit' })}
                </td>
                <td className="px-3 py-2 text-center" style={{ color: 'var(--vault-text-dim)' }}>{u.free_tickets}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => setGrant({ uid: u.firebase_uid, name: u.display_name ?? u.slug })}
                    className="px-2 py-1 text-[8px] tracking-[2px] rounded transition-opacity hover:opacity-70"
                    style={{ background: 'var(--vault-cyan)', color: 'var(--vault-bg)' }}
                  >
                    GRANT
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-[9px] tracking-[2px]" style={{ color: 'var(--vault-text-dim)' }}>
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
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', fontFamily: MONO }}
          onClick={() => setGrant(null)}
        >
          <div
            className="w-full max-w-xs rounded-xl p-5 space-y-4"
            style={{ background: 'var(--vault-bg)', border: '1px solid var(--vault-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-[3px]" style={{ color: 'var(--vault-text)' }}>GRANT CREDITS</span>
              <button onClick={() => setGrant(null)} style={{ color: 'var(--vault-text-dim)' }}><X size={14} /></button>
            </div>
            <p className="text-[9px] tracking-[1px]" style={{ color: 'var(--vault-text-dim)' }}>{grant.name}</p>

            <div className="flex gap-2">
              {(['subscription', 'paid'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setGrantType(t)}
                  className="flex-1 py-1.5 text-[9px] tracking-[2px] rounded transition-opacity"
                  style={{
                    background: grantType === t ? 'var(--vault-text)' : 'var(--vault-border)',
                    color: grantType === t ? 'var(--vault-bg)' : 'var(--vault-text-dim)',
                  }}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            <input
              type="number"
              min={1}
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              placeholder="クレジット数"
              className="w-full px-3 py-2 text-[10px] rounded outline-none"
              style={{ background: 'var(--vault-border)', color: 'var(--vault-text)' }}
            />

            <button
              onClick={handleGrant}
              disabled={granting || !grantAmount}
              className="w-full py-2.5 text-[10px] tracking-[3px] rounded transition-opacity hover:opacity-70 disabled:opacity-40"
              style={{ background: 'var(--vault-cyan)', color: 'var(--vault-bg)' }}
            >
              {granting ? '...' : 'GRANT'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
