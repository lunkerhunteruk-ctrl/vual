'use client';

// 管理画面：スタイリストの招待リンクを作る・止める／送られてきたコーデを見る。2026-11-02
// 招待リンクは vwardrobe.com/<ja|en>/stylist?key=…（ログインなしで開ける。止めると開けなくなる）
import { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { originalImage } from '@/lib/vual-originals';

interface Invite { key: string; name: string; brief: string; active: boolean; createdAt: string | null }
interface LookItem { id: string; name: string; color: string; group: string; card: string }
interface Look { id: string; inviteKey: string; stylistName: string; items: LookItem[]; note: string; status: 'new' | 'seen' | 'picked'; createdAt: string | null }

const SITE = 'https://vwardrobe.com';
const link = (key: string, lang: 'ja' | 'en') => `${SITE}/${lang}/stylist?key=${key}`;
const when = (s: string | null) => (s ? new Date(s).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
// 管理者のログインの合言葉を付けて API を呼ぶ
async function adminFetch(url: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('ログインが必要です');
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  return fetch(url, { ...options, headers });
}
const STATUS = { new: '新着', seen: '見た', picked: '候補' } as const;

export default function StylistsAdminPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [looks, setLooks] = useState<Look[]>([]);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await adminFetch('/api/admin/stylists');
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setInvites(d.invites); setLooks(d.looks); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : '読み込めませんでした'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const r = await adminFetch('/api/admin/stylists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, brief }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setName(''); setBrief(''); await load();
    } catch (e) { setError(e instanceof Error ? e.message : '作れませんでした'); } finally { setBusy(false); }
  }
  async function patch(body: object) {
    const r = await adminFetch('/api/admin/stylists', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) setError((await r.json()).error || '更新できませんでした');
    await load();
  }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(text); setTimeout(() => setCopied(''), 1600); } catch { /* 手で選んでコピーしてもらう */ }
  }
  const nameOf = (key: string) => invites.find((i) => i.key === key)?.name;

  return (
    <div className="mx-auto max-w-5xl space-y-10 text-gray-900">
      <div>
        <h1 className="text-xl font-semibold">スタイリスト</h1>
        <p className="mt-1 text-sm text-gray-500">招待リンクを作って送ると、VUAL オリジナルでコーデを組んで送ってもらえます。</p>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold">招待を作る</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名前（例：山田 花子）" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={2} placeholder="お題（任意）例：ハワース、11月、荒野と風。朝の汽車から夜の宿まで、1日1コーデ。" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <button onClick={create} disabled={!name.trim() || busy} className="mt-3 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-40">{busy ? '作っています…' : '招待リンクを作る'}</button>
      </section>

      <section>
        <h2 className="text-base font-semibold">招待（{invites.length}）</h2>
        <ul className="mt-3 divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
          {invites.length === 0 && <li className="p-4 text-sm text-gray-500">まだありません</li>}
          {invites.map((i) => (
            <li key={i.key} className="flex flex-wrap items-start gap-3 p-4">
              <div className="min-w-[180px] flex-1">
                <p className="text-sm font-medium">{i.name} {!i.active && <span className="ml-1 text-xs text-gray-400">止めています</span>}</p>
                {i.brief && <p className="mt-1 whitespace-pre-line text-xs text-gray-500">{i.brief}</p>}
                <p className="mt-1 text-xs text-gray-400">{when(i.createdAt)} ・ 届いた {looks.filter((l) => l.inviteKey === i.key).length}件</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['ja', 'en'] as const).map((lang) => (
                  <button key={lang} onClick={() => copy(link(i.key, lang))} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs">
                    {copied === link(i.key, lang) ? 'コピーしました' : `リンクをコピー（${lang === 'ja' ? '日本語' : '英語'}）`}
                  </button>
                ))}
                <a href={link(i.key, 'ja')} target="_blank" rel="noopener" className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs">開く</a>
                <button onClick={() => patch({ key: i.key, active: !i.active })} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-500">{i.active ? '止める' : '戻す'}</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold">届いたコーデ（{looks.length}）</h2>
        <div className="mt-3 space-y-4">
          {looks.length === 0 && <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">まだ届いていません</p>}
          {looks.map((l) => (
            <article key={l.id} className="rounded-xl border border-gray-200 bg-white p-4" style={{ borderColor: l.status === 'new' ? '#111' : undefined }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{nameOf(l.inviteKey) || l.stylistName} <span className="ml-2 text-xs font-normal text-gray-400">{when(l.createdAt)}</span></p>
                <div className="flex gap-1.5">
                  {(Object.keys(STATUS) as (keyof typeof STATUS)[]).map((s) => (
                    <button key={s} onClick={() => patch({ lookId: l.id, status: s })} className={`rounded-full px-3 py-1 text-xs ${l.status === s ? 'bg-gray-900 text-white' : 'border border-gray-300 text-gray-500'}`}>{STATUS[s]}</button>
                  ))}
                </div>
              </div>
              <ul className="mt-3 flex flex-wrap gap-3">
                {l.items.map((it) => (
                  <li key={it.id} className="w-24">
                    <div className="aspect-square border border-gray-200 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={originalImage(it.card)} alt="" className="h-full w-full object-contain p-1" />
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-tight">{it.name}</p>
                    <p className="text-[10px] text-gray-400">{it.color}</p>
                  </li>
                ))}
              </ul>
              {l.note && <p className="mt-3 whitespace-pre-line text-sm text-gray-700">{l.note}</p>}
              <p className="mt-2 select-all text-[11px] text-gray-400">{l.items.map((it) => it.id).join(' ')}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
