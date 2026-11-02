'use client';

// スタイリスト用：VUAL オリジナルをタップで選んでコーデを組み、送る。2026-11-02
// 作りの考え方（スマホが前提）：
// - 種類ごとに横一列（RIN THREADS STUDIO の「コーデを組む」と同じ）。写真を押す＝選ぶ、右上の小さな丸＝大きく見る
// - 選んだ物は下の帯に順番に並ぶ。帯の写真を押すと外れる
// - 「送る」で確認の画面 → ひとこと（任意）→ 送信。足りない物（靴など）は止めずにやわらかく知らせる
// - 組みかけは端末に残す（閉じても消えない）。送信は同じ番号で何度送っても1件だけ
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Maximize2, X, ArrowRight } from 'lucide-react';
import { GROUP_LABEL, GROUP_ORDER, originalImage, type OriginalGroup, type OriginalItem } from '@/lib/vual-originals';

const PAPER = '#f2eee7';
const INK = '#1e1d1b';
const MUTE = '#78746c';
const LINE = 'rgba(30,29,27,0.14)';
const PHOTO = '#ebebeb'; // 商品写真の背景のグレー（写真のまわりに白い縁が見えないように）
const SERIF = 'var(--font-playfair), "Didot", "Bodoni 72", Georgia, serif';
const MAX = 8;

const T = {
  ja: {
    brand: 'VUAL ORIGINALS',
    for: (n: string) => `${n} さんへ`,
    title: ['一日を、', '組んでください。'],
    lead: 'VUAL のオリジナルの服から、LATITUDE の一日のコーデを組んでください。写真を押すと選べます。',
    brief: '今回のお題',
    howto: ['写真を押す → 選ぶ', '右上の ⤢ → 大きく見る', '下の「送る」→ 届きます'],
    count: (n: number) => `${n}点`,
    trayEmpty: '選んだ服がここに並びます',
    send: '送る',
    max: `選べるのは${MAX}点までです`,
    sheetTitle: 'この組み合わせを送る',
    noteLabel: 'ひとこと（任意）',
    notePlaceholder: '例：コートは前を開けて、肩に落とす。靴下はグレー。朝の駅から夜のバーまで、このまま。',
    hints: { shoes: '靴がまだ入っていません', body: '上の服と下の服（またはワンピース）がまだそろっていません' },
    hintTail: '（このまま送ることもできます）',
    submit: 'この組み合わせを送る',
    sending: '送っています…',
    privacy: '送った内容を見るのは、LATITUDE の編集部だけです。',
    doneTitle: '届きました。',
    doneBody: 'ありがとうございます。見て、こちらから連絡します。',
    again: 'もう一案組む',
    close: '閉じる',
    select: 'この服を選ぶ',
    unselect: '選ぶのをやめる',
    colors: (n: number) => `他に${n}色`,
    otherColors: '色ちがい',
    remove: '外す',
    invalid: 'このリンクは使えません。届いた案内のリンクを、もう一度開いてください。',
    error: 'うまく送れませんでした。少し待って、もう一度「送る」を押してください（同じ内容が2回届くことはありません）。',
    loading: '読み込んでいます…',
    selected: '選んだ服',
  },
  en: {
    brand: 'VUAL ORIGINALS',
    for: (n: string) => `For ${n}`,
    title: ['Style a day.'],
    lead: 'Put together one outfit for a day in LATITUDE, from VUAL’s own pieces. Tap a photo to choose it.',
    brief: 'The brief',
    howto: ['Tap a photo → choose', 'Tap ⤢ → see it large', 'Tap “Send” below → it reaches us'],
    count: (n: number) => `${n}`,
    trayEmpty: 'Your pieces will line up here',
    send: 'Send',
    max: `You can choose up to ${MAX} pieces`,
    sheetTitle: 'Send this outfit',
    noteLabel: 'A note (optional)',
    notePlaceholder: 'e.g. Coat open, slipping off the shoulders. Grey socks. The same from the morning train to the bar at night.',
    hints: { shoes: 'No shoes yet', body: 'No top and bottom (or dress) yet' },
    hintTail: ' — you can still send it.',
    submit: 'Send this outfit',
    sending: 'Sending…',
    privacy: 'Only the LATITUDE editors will see what you send.',
    doneTitle: 'It’s with us.',
    doneBody: 'Thank you. We’ll look at it and get back to you.',
    again: 'Style another',
    close: 'Close',
    select: 'Choose this',
    unselect: 'Remove',
    colors: (n: number) => `+${n} colour${n > 1 ? 's' : ''}`,
    otherColors: 'Other colours',
    remove: 'Remove',
    invalid: 'This link doesn’t work. Please open the link in your invitation again.',
    error: 'We couldn’t send it. Please wait a moment and tap “Send” again (it won’t arrive twice).',
    loading: 'Loading…',
    selected: 'Chosen',
  },
};

type Lang = keyof typeof T;
type Draft = { selected: string[]; note: string; requestId?: string };

export default function StylistPicker({ locale, inviteKey }: { locale: Lang; inviteKey: string }) {
  const t = T[locale];
  const [state, setState] = useState<'loading' | 'ready' | 'invalid'>('loading');
  const [name, setName] = useState('');
  const [brief, setBrief] = useState('');
  const [items, setItems] = useState<OriginalItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [requestId, setRequestId] = useState<string | undefined>();
  const [viewing, setViewing] = useState<OriginalItem | null>(null);
  const [sheet, setSheet] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState('');
  const [sendError, setSendError] = useState('');
  const draftKey = `vual-stylist-draft:${inviteKey}`;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!inviteKey) { setState('invalid'); return; }
    fetch(`/api/stylist/session?key=${encodeURIComponent(inviteKey)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const d = await r.json();
        setName(d.name); setBrief(d.brief); setItems(d.items); setState('ready');
        try {
          const saved = JSON.parse(localStorage.getItem(draftKey) || 'null') as Draft | null;
          if (saved) {
            const ids = new Set((d.items as OriginalItem[]).map((i) => i.id));
            setSelected(saved.selected.filter((s) => ids.has(s)));
            setNote(saved.note || '');
            setRequestId(saved.requestId);
          }
        } catch { /* 端末に残せない時は残さない */ }
      })
      .catch(() => setState('invalid'));
  }, [inviteKey, draftKey]);

  useEffect(() => {
    if (state !== 'ready') return;
    try { localStorage.setItem(draftKey, JSON.stringify({ selected, note, requestId } satisfies Draft)); } catch { /* 同上 */ }
  }, [selected, note, requestId, state, draftKey]);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const families = useMemo(() => {
    const m = new Map<string, OriginalItem[]>();
    items.forEach((i) => m.set(i.family, [...(m.get(i.family) || []), i]));
    return m;
  }, [items]);
  const groups = useMemo(
    () => GROUP_ORDER.map((g) => ({ g, list: items.filter((i) => i.group === g) })).filter((x) => x.list.length),
    [items],
  );

  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }, []);

  const toggle = useCallback((id: string) => {
    setRequestId(undefined); // 中身が変わったら、別の送信として扱う
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= MAX) { flash(t.max); return cur; }
      return [...cur, id];
    });
  }, [flash, t.max]);

  const chosen = selected.map((id) => byId.get(id)).filter(Boolean) as OriginalItem[];
  const hints = useMemo(() => {
    const gs = new Set(chosen.map((c) => c.group));
    const h: string[] = [];
    if (chosen.length && !gs.has('dress') && !((gs.has('tops') || gs.has('cardigan')) && gs.has('bottoms'))) h.push(t.hints.body);
    if (chosen.length && !gs.has('shoes')) h.push(t.hints.shoes);
    return h;
  }, [chosen, t.hints]);

  async function send() {
    if (sending || !selected.length) return;
    setSending(true); setSendError('');
    const id = requestId || crypto.randomUUID();
    setRequestId(id);
    try {
      const r = await fetch('/api/stylist/looks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: inviteKey, requestId: id, items: selected, note }),
      });
      if (!r.ok) throw new Error();
      setDone(true);
      setSelected([]); setNote(''); setRequestId(undefined);
    } catch {
      setSendError(t.error);
    } finally {
      setSending(false);
    }
  }

  const jump = (g: OriginalGroup) => document.getElementById(`row-${g}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const otherLang = locale === 'ja' ? 'en' : 'ja';

  if (state !== 'ready') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-8 text-center" style={{ background: PAPER, color: INK }}>
        <p className="max-w-sm text-[15px] leading-relaxed">{state === 'loading' ? t.loading : t.invalid}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh]" style={{ background: PAPER, color: INK, paddingBottom: 'calc(132px + env(safe-area-inset-bottom))' }}>
      {/* 上の帯：名前と言語、種類へ飛ぶ */}
      <header className="sticky top-0 z-30 border-b backdrop-blur" style={{ background: 'rgba(242,238,231,0.94)', borderColor: LINE }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-3 md:px-8">
          <span className="text-[11px] uppercase tracking-[0.35em]">{t.brand}</span>
          <a href={`/${otherLang}/stylist?key=${encodeURIComponent(inviteKey)}`} className="text-[10px] uppercase tracking-[0.25em]" style={{ color: MUTE }}>
            {otherLang}
          </a>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2.5 md:px-8" style={{ scrollbarWidth: 'none' }}>
          {groups.map(({ g, list }) => (
            <button key={g} onClick={() => jump(g)} className="shrink-0 rounded-full border px-3 py-1.5 text-[12px]" style={{ borderColor: LINE }}>
              {GROUP_LABEL[g][locale]} <span style={{ color: MUTE }}>{list.length}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* はじめの説明とお題 */}
      <section className="mx-auto max-w-6xl px-4 pb-5 pt-6 md:px-8 md:pt-12">
        {name && <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>{t.for(name)}</p>}
        <h1 className="mt-2 text-[30px] leading-[1.25] md:text-[48px]" style={{ fontFamily: SERIF }}>{t.title.map((l, i) => <span key={i} className="block">{l}</span>)}</h1>
        <p className="mt-2.5 max-w-xl text-[14px] leading-relaxed md:text-[15px]">{t.lead}</p>
        {brief && (
          <div className="mt-4 max-w-xl border-l-2 pl-4" style={{ borderColor: INK }}>
            <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>{t.brief}</p>
            <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed">{brief}</p>
          </div>
        )}
        <ol className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12px]" style={{ color: MUTE }}>
          {t.howto.map((h, i) => <li key={i}>{i + 1}. {h}</li>)}
        </ol>
      </section>

      {/* 種類ごとに横一列 */}
      {groups.map(({ g, list }) => (
        <section key={g} id={`row-${g}`} className="scroll-mt-28 pb-7">
          <div className="mx-auto flex max-w-6xl items-baseline justify-between px-4 pb-2.5 md:px-8">
            <h2 className="text-[20px] md:text-[24px]" style={{ fontFamily: SERIF }}>{GROUP_LABEL[g][locale]}</h2>
            <span className="text-[11px]" style={{ color: MUTE }}>{t.count(list.length)}</span>
          </div>
          <div className="flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 md:scroll-px-8 md:px-8 lg:px-[max(2rem,calc((100vw-72rem)/2+2rem))]" style={{ scrollbarWidth: 'none' }}>
            {list.map((item) => {
              const n = selected.indexOf(item.id);
              const on = n >= 0;
              const others = (families.get(item.family)?.length || 1) - 1;
              return (
                <div key={item.id} className="relative w-[42vw] max-w-[200px] shrink-0 snap-start md:w-[180px]">
                  <button
                    onClick={() => toggle(item.id)}
                    aria-pressed={on}
                    aria-label={`${item.name} ${item.color}`}
                    className="block w-full text-left"
                  >
                    <div className="relative overflow-hidden" style={{ aspectRatio: '1 / 1', background: PHOTO, outline: on ? `2px solid ${INK}` : 'none', outlineOffset: on ? '-2px' : 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={originalImage(item.card)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      {on && (
                        <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-medium" style={{ background: INK, color: PAPER }}>
                          {n + 1}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 text-[12px] leading-snug">{item.name}</p>
                    <p className="mt-0.5 text-[11px]" style={{ color: MUTE }}>
                      {item.color}{others > 0 && <span> · {t.colors(others)}</span>}
                    </p>
                  </button>
                  <button
                    onClick={() => setViewing(item)}
                    aria-label={`${item.name}を大きく見る`}
                    className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ background: 'rgba(242,238,231,0.92)', boxShadow: `0 0 0 1px ${LINE}` }}
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* 下の帯：選んだ物と「送る」 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t" style={{ background: 'rgba(242,238,231,0.97)', borderColor: LINE, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:px-8">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {chosen.length === 0 && <p className="py-4 text-[12px]" style={{ color: MUTE }}>{t.trayEmpty}</p>}
            {chosen.map((c) => (
              <button key={c.id} onClick={() => toggle(c.id)} aria-label={`${c.name}を${t.remove}`} className="relative h-14 w-14 shrink-0 overflow-hidden" style={{ background: PHOTO }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={originalImage(c.card)} alt="" className="h-full w-full object-cover" />
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: INK, color: PAPER }}>
                  <X size={10} />
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => { setDone(false); setSendError(''); setSheet(true); }}
            disabled={!chosen.length}
            className="flex shrink-0 items-center gap-2 px-5 py-3.5 text-[12px] uppercase tracking-[0.25em] transition-opacity disabled:opacity-30"
            style={{ background: INK, color: PAPER }}
          >
            {t.send}{chosen.length > 0 && <span className="tracking-normal">{chosen.length}</span>}<ArrowRight size={14} />
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed inset-x-0 z-50 flex justify-center px-4" style={{ bottom: 'calc(96px + env(safe-area-inset-bottom))' }}>
          <p className="px-4 py-2.5 text-[12px]" style={{ background: INK, color: PAPER }}>{toast}</p>
        </div>
      )}

      {/* 大きく見る */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: PAPER }} role="dialog" aria-modal="true">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[11px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>{GROUP_LABEL[viewing.group][locale]}</span>
            <button onClick={() => setViewing(null)} aria-label={t.close} className="flex h-10 w-10 items-center justify-center"><X size={20} /></button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-4" style={{ background: PHOTO }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={originalImage(viewing.large)} alt={viewing.name} className="max-h-full max-w-full object-contain" />
          </div>
          <div className="mx-auto w-full max-w-xl px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4">
            <p className="text-[18px] leading-snug" style={{ fontFamily: SERIF }}>{viewing.name}</p>
            <p className="mt-1 text-[12px]" style={{ color: MUTE }}>{viewing.color}</p>
            {(families.get(viewing.family)?.length || 0) > 1 && (
              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: MUTE }}>{t.otherColors}</p>
                <div className="mt-1.5 flex gap-2 overflow-x-auto">
                  {families.get(viewing.family)!.map((v) => (
                    <button key={v.id} onClick={() => setViewing(v)} className="h-14 w-14 shrink-0 overflow-hidden" style={{ background: PHOTO, outline: v.id === viewing.id ? `2px solid ${INK}` : 'none', outlineOffset: '-2px' }} aria-label={v.color}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={originalImage(v.card)} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => { toggle(viewing.id); setViewing(null); }}
              className="mt-4 flex w-full items-center justify-center gap-2 py-4 text-[12px] uppercase tracking-[0.25em]"
              style={selected.includes(viewing.id) ? { boxShadow: `inset 0 0 0 1px ${INK}`, color: INK } : { background: INK, color: PAPER }}
            >
              {selected.includes(viewing.id) ? t.unselect : <><Check size={14} />{t.select}</>}
            </button>
          </div>
        </div>
      )}

      {/* 送る前の確認／送った後 */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" style={{ background: 'rgba(30,29,27,0.45)' }} onClick={() => !sending && setSheet(false)}>
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-5" style={{ background: PAPER }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="flex items-center justify-between">
              <h3 className="text-[22px]" style={{ fontFamily: SERIF }}>{done ? t.doneTitle : t.sheetTitle}</h3>
              <button onClick={() => setSheet(false)} disabled={sending} aria-label={t.close} className="flex h-10 w-10 items-center justify-center"><X size={20} /></button>
            </div>
            {done ? (
              <>
                <p className="mt-3 text-[14px] leading-relaxed">{t.doneBody}</p>
                <button onClick={() => { setSheet(false); setDone(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="mt-6 w-full py-4 text-[12px] uppercase tracking-[0.25em]" style={{ background: INK, color: PAPER }}>
                  {t.again}
                </button>
              </>
            ) : (
              <>
                <p className="mt-3 text-[10px] uppercase tracking-[0.25em]" style={{ color: MUTE }}>{t.selected} · {chosen.length}</p>
                <ul className="mt-2 grid grid-cols-4 gap-2">
                  {chosen.map((c) => (
                    <li key={c.id}>
                      <div className="overflow-hidden" style={{ aspectRatio: '1 / 1', background: PHOTO }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={originalImage(c.card)} alt="" className="h-full w-full object-cover" />
                      </div>
                      <p className="mt-1 line-clamp-2 text-[10px] leading-tight">{c.name}</p>
                    </li>
                  ))}
                </ul>
                {hints.length > 0 && (
                  <p className="mt-4 text-[12px] leading-relaxed" style={{ color: MUTE }}>{hints.join('。')}{t.hintTail}</p>
                )}
                <label className="mt-5 block text-[10px] uppercase tracking-[0.25em]" style={{ color: MUTE }} htmlFor="stylist-note">{t.noteLabel}</label>
                <textarea
                  id="stylist-note"
                  value={note}
                  onChange={(e) => { setNote(e.target.value); setRequestId(undefined); }}
                  rows={4}
                  maxLength={2000}
                  placeholder={t.notePlaceholder}
                  className="mt-2 w-full resize-none border bg-white px-3 py-2.5 text-[16px] leading-relaxed outline-none md:text-[14px]"
                  style={{ borderColor: LINE }}
                />
                {sendError && <p className="mt-3 text-[12px] leading-relaxed" style={{ color: '#8a2b22' }}>{sendError}</p>}
                <button onClick={send} disabled={sending} className="mt-5 flex w-full items-center justify-center gap-2 py-4 text-[12px] uppercase tracking-[0.25em] disabled:opacity-50" style={{ background: INK, color: PAPER }}>
                  {sending ? t.sending : <>{t.submit}<ArrowRight size={14} /></>}
                </button>
                <p className="mt-3 text-center text-[11px]" style={{ color: MUTE }}>{t.privacy}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
