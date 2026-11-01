'use client';
import { useEffect, useRef, useState } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { INK, MUTE, SERIF } from '@/components/latitude/Latitude';
import { track } from '@/lib/latitude-track';

// 2026-10-30 旅人との会話（文字＋自分から押した時だけの通話）。部屋のページと、街のページの「凛に聞く」の両方で使う。
// 入口は /api/latitude/room（署名つき・1人1日の回数あり）。会話の設定は ElevenLabs 側（vault.vual.jp/tools/rin-call-agent.cjs）。
// context：会話が始まったら旅人にだけ伝える「いま見ているページ」。ask：外から渡された質問（店の「この店について聞く」）。

export type ChatStage = 'outside' | 'entering' | 'text' | 'confirm' | 'calling' | 'call';
type Line = { who: 'her' | 'you' | 'note'; text: string; call?: boolean };

const LINE = 'rgba(30,29,27,0.14)';
const SANS = 'var(--font-inter), "Helvetica Neue", Arial, sans-serif';
const noTags = (s: string) => s.replace(/\[[^\]]*\]\s*/g, '').trim();
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

type Props = {
  locale: string;
  slug: string;
  name: string;
  callSeconds: number;
  context?: string;
  ask?: { text: string; n: number } | null;
  compact?: boolean; // 街のページの小さな窓で使う時
  autoEnter?: boolean; // 開いたらすぐ文字の会話を始める
  onStage?: (stage: ChatStage, justEntered: boolean) => void;
};

export default function RoomChat(props: Props) {
  return (
    <ConversationProvider>
      <ChatInner {...props} />
    </ConversationProvider>
  );
}

function ChatInner({ locale, slug, name, callSeconds, context, ask, compact, autoEnter, onStage }: Props) {
  const ja = locale === 'ja';
  const [stage, setStage] = useState<ChatStage>('outside');
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState('');
  const [left, setLeft] = useState(callSeconds);
  const [justEntered, setJustEntered] = useState(false); // 入った直後だけ、部屋の凛が顔を上げる
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const pending = useRef<string | null>(null); // 会話が始まったら送る質問
  const listRef = useRef<HTMLDivElement>(null);
  const add = (l: Line) => setLines((xs) => [...xs, l]);

  const conv = useConversation({
    onMessage: ({ message, role }) => {
      const text = noTags(message);
      if (!text) return;
      if (role !== 'agent' && stageRef.current === 'text') return; // 文字で送った物は、送った時に自分で出している
      if (role !== 'agent') track('msg', { person: slug, mode: 'call' });
      add({ who: role === 'agent' ? 'her' : 'you', text, call: stageRef.current === 'call' });
    },
    onDisconnect: (d) => {
      // 凛が自分から切った時（断ったあとも性的な話を続けられた時）は、そう出す
      const byHer = d.reason === 'agent';
      if (stageRef.current === 'call' || stageRef.current === 'calling') {
        add({ who: 'note', text: byHer ? (ja ? `${name}が通話を切りました。` : `${name} hung up.`) : ja ? '通話が終わりました。' : 'The call has ended.' });
        setStage('outside');
      } else if (stageRef.current === 'text') {
        if (byHer) add({ who: 'note', text: ja ? `${name}は話をやめました。` : `${name} ended the conversation.` });
        setStage('outside');
      }
    },
    onError: () => add({ who: 'note', text: ja ? 'つながりが切れました。もう一度入ってください。' : 'The line dropped. Please come in again.' }),
  });

  useEffect(() => { onStage?.(stage, justEntered); }, [stage, justEntered]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [lines]);

  // 通話の残り時間（終わりは会話設定の側でも切れる）
  useEffect(() => {
    if (stage !== 'call') return;
    setLeft(callSeconds);
    const t0 = Date.now();
    const id = setInterval(() => {
      const l = callSeconds - Math.floor((Date.now() - t0) / 1000);
      setLeft(l);
      if (l <= 0) conv.endSession();
    }, 500);
    return () => clearInterval(id);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const ticket = async (mode: 'text' | 'call') => {
    const r = await fetch(`/api/latitude/room?person=${slug}&mode=${mode}&page=${encodeURIComponent(location.pathname)}`, { cache: 'no-store' });
    if (r.status === 429) throw new Error(ja ? '今日はここまで。また明日。' : 'That is all for today. Come back tomorrow.');
    if (!r.ok) throw new Error(ja ? 'いまは話せません。少しあとで。' : 'She cannot talk right now. Try again later.');
    return r.json();
  };

  // 英語のページから入った人には、凛が英語で迎えて英語で話す（通話は聞き取りも英語になる）
  const lang = ja ? undefined : { agent: { language: 'en' as const, firstMessage: "It's Rin. What's up?" } };

  // 文字のチャットは、サイトが Gemini で返す（/api/latitude/chat）。鍵が無い間は ElevenLabs の文字の会話を使う
  const viaSite = useRef(false);
  const history = useRef<{ role: 'user' | 'her'; text: string }[]>([]);
  const session = useRef('');
  const [thinking, setThinking] = useState(false);

  const askSite = async (t: string) => {
    history.current.push({ role: 'user', text: t });
    setThinking(true);
    try {
      const r = await fetch('/api/latitude/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person: slug, messages: history.current, context, lang: ja ? 'ja' : 'en', session: session.current }),
      });
      if (r.status === 429) throw new Error(ja ? '今日はここまで。また明日。' : 'That is all for today. Come back tomorrow.');
      if (!r.ok) throw new Error(ja ? 'いまは返事ができません。少しあとで。' : 'She cannot answer right now. Try again later.');
      const { reply, end } = await r.json();
      history.current.push({ role: 'her', text: reply });
      add({ who: 'her', text: reply });
      if (end) { add({ who: 'note', text: ja ? `${name}は話をやめました。` : `${name} ended the conversation.` }); setStage('outside'); }
    } catch (e) {
      history.current.pop();
      add({ who: 'note', text: (e as Error).message });
    } finally {
      setThinking(false);
    }
  };

  const sendText = (t: string) => {
    if (viaSite.current) askSite(t);
    else conv.sendUserMessage(t);
    add({ who: 'you', text: t });
    track('msg', { person: slug, mode: 'text' });
  };

  const enter = async () => {
    if (stageRef.current !== 'outside') return;
    setStage('entering');
    // Gemini で返せるなら、ElevenLabs につながずに入る（最初の一言は画面で出す）
    const ready = await fetch(`/api/latitude/chat?person=${slug}`, { cache: 'no-store' }).then((r) => r.json()).then((d) => !!d.ready).catch(() => false);
    if (ready) {
      viaSite.current = true;
      session.current = Math.random().toString(36).slice(2, 12);
      const hello = ja ? '凛だよ。今日はどうしたの？' : "It's Rin. What's up?";
      history.current = [{ role: 'her', text: hello }];
      add({ who: 'her', text: hello });
      setStage('text');
      setJustEntered(true);
      setTimeout(() => setJustEntered(false), 8000);
      if (pending.current) { const t = pending.current; pending.current = null; setTimeout(() => sendText(t), 300); }
      return;
    }
    viaSite.current = false;
    try {
      const { signedUrl } = await ticket('text');
      conv.startSession({
        signedUrl,
        textOnly: true,
        overrides: lang,
        onConnect: () => {
          setStage('text');
          setJustEntered(true);
          setTimeout(() => setJustEntered(false), 8000);
          if (context) conv.sendContextualUpdate(context);
          if (pending.current) { const t = pending.current; pending.current = null; setTimeout(() => sendText(t), 400); }
        },
      });
    } catch (e) {
      add({ who: 'note', text: (e as Error).message });
      setStage('outside');
    }
  };

  // 外から質問が来たら、会話中ならそのまま送り、まだなら入ってから送る
  useEffect(() => {
    if (!ask) return;
    if (stageRef.current === 'text') sendText(ask.text);
    else if (stageRef.current === 'outside') { pending.current = ask.text; enter(); }
  }, [ask?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (autoEnter) enter(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t || stage !== 'text') return;
    sendText(t);
    setDraft('');
  };

  const call = async () => {
    setStage('calling');
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true }); // マイクの許可は、ここで初めて聞く
    } catch {
      add({ who: 'note', text: ja ? 'マイクが使えないので、通話できません。' : 'No microphone, so the call cannot start.' });
      setStage('outside');
      return;
    }
    try {
      const { conversationToken } = await ticket('call');
      add({ who: 'note', text: ja ? '通話を始めます。' : 'Calling.' });
      conv.startSession({ conversationToken, connectionType: 'webrtc', overrides: lang && { agent: { ...lang.agent, firstMessage: `[dryly] ${lang.agent.firstMessage}` } }, onConnect: () => { setStage('call'); if (context) conv.sendContextualUpdate(context); } });
    } catch (e) {
      add({ who: 'note', text: (e as Error).message });
      setStage('outside');
    }
  };

  // 通話の入口は、部屋に入るのと同じ大きさの黒いボタン（声で話したい人が迷わないように、こちらを主に見せる）
  const CallButton = () => (
    <button onClick={() => { if (conv.status === 'connected') conv.endSession(); setStage('confirm'); }}
      className="border px-6 py-3 text-[11px] uppercase tracking-[0.3em]" style={{ borderColor: INK, background: INK, color: '#f2eee7' }}>
      {ja ? `${name}と通話する` : `Call ${name}`}
    </button>
  );

  return (
    <div className="flex flex-col">
      <div ref={listRef} className={`flex flex-col gap-5 overflow-y-auto border-y py-6 ${compact ? 'max-h-[44vh] min-h-[140px]' : 'mt-8 max-h-[52vh] min-h-[220px]'}`}
        style={{ borderColor: LINE }} aria-live="polite">
        {lines.length === 0 && stage === 'outside' && (
          <p className="m-auto text-[14px]" style={{ color: MUTE, fontFamily: SERIF }}>{ja ? '戸は開いています。' : 'The door is open.'}</p>
        )}
        {lines.map((l, k) =>
          l.who === 'note' ? (
            <p key={k} className="text-center text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>{l.text}</p>
          ) : (
            <div key={k} className={`flex max-w-[85%] flex-col gap-1 ${l.who === 'you' ? 'self-end items-end' : 'self-start'}`}>
              <span className="text-[9px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>
                {l.who === 'her' ? name : ja ? 'あなた' : 'You'}{l.call ? ` · ${ja ? '通話' : 'call'}` : ''}
              </span>
              <p className={l.who === 'her' ? (compact ? 'text-[17px] leading-relaxed' : 'text-[19px] leading-relaxed') : 'text-[15px] leading-relaxed'}
                style={{ fontFamily: l.who === 'her' ? SERIF : SANS, color: l.who === 'her' ? INK : '#3d3a35' }}>
                {l.text}
              </p>
            </div>
          ),
        )}
        {(stage === 'entering' || thinking) && <p className="text-[12px]" style={{ color: MUTE }}>…</p>}
      </div>

      {/* 下の操作：入る → 文字で話す → 通話は自分から（もう一度確かめる） */}
      <div className="mt-6 flex flex-col gap-4">
        {(stage === 'outside' || stage === 'entering') && (
          <div className="flex flex-wrap gap-3">
            <button onClick={enter} disabled={stage === 'entering'} className="border px-6 py-3 text-[11px] uppercase tracking-[0.3em] disabled:opacity-40"
              style={{ borderColor: INK, color: INK }}>
              {compact ? (ja ? '話しかける' : 'Talk to her') : ja ? '部屋に入る' : 'Enter her room'}&nbsp;&nbsp;→
            </button>
            {stage === 'outside' && <CallButton />}
          </div>
        )}

        {stage === 'text' && (
          <form onSubmit={send} className="flex items-end gap-3">
            <label htmlFor="room-draft" className="sr-only">{ja ? 'メッセージ' : 'Message'}</label>
            <textarea id="room-draft" value={draft} onChange={(e) => { setDraft(e.target.value); conv.sendUserActivity(); }} rows={1} maxLength={400}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) send(e); }}
              placeholder={ja ? '何か話す' : 'Say something'} className="min-w-0 flex-1 resize-none border-b bg-transparent py-2 text-[16px] outline-none"
              style={{ borderColor: INK, color: INK, fontFamily: SANS }} />
            <button type="submit" className="pb-2 text-[11px] uppercase tracking-[0.3em]" style={{ color: INK }}>{ja ? '送る' : 'Send'}</button>
          </form>
        )}

        {stage === 'text' && <div><CallButton /></div>}

        {stage === 'confirm' && (
          <div className="flex flex-col gap-4 border p-5" style={{ borderColor: INK }}>
            <p className="text-[18px]" style={{ fontFamily: SERIF }}>{ja ? `${name}と、声で話しますか。` : `Talk to ${name} out loud?`}</p>
            <ul className="flex flex-col gap-1 text-[13px] leading-relaxed" style={{ color: '#3d3a35' }}>
              <li>{ja ? '・マイクを使います。' : '· Your microphone will be used.'}</li>
              <li>{ja ? `・1回${callSeconds / 60}分まで。1日2回まで。` : `· Up to ${callSeconds / 60} minutes a call, twice a day.`}</li>
              <li>{ja ? `・${name}はAIです。声は残さず、文字だけを30日残します。` : `· ${name} is an AI. Audio is not kept; the text is kept for 30 days.`}</li>
            </ul>
            <div className="flex gap-6">
              <button onClick={call} className="border px-6 py-3 text-[11px] uppercase tracking-[0.3em]" style={{ borderColor: INK, background: INK, color: '#f2eee7' }}>
                {ja ? '通話を始める' : 'Start the call'}
              </button>
              <button onClick={() => setStage('outside')} className="text-[11px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>
                {ja ? 'やめる' : 'Not now'}
              </button>
            </div>
          </div>
        )}

        {(stage === 'calling' || stage === 'call') && (
          <div className="flex items-center justify-between gap-4 border p-5" style={{ borderColor: INK }}>
            <div className="flex items-center gap-4">
              <span className={`h-3 w-3 rounded-full ${conv.isSpeaking ? 'motion-safe:animate-ping' : ''}`} style={{ background: INK, opacity: stage === 'call' ? 1 : 0.3 }} />
              <div>
                <p className="text-[18px]" style={{ fontFamily: SERIF }}>
                  {stage === 'calling' ? (ja ? 'つないでいます' : 'Connecting') : conv.isSpeaking ? (ja ? `${name}が話しています` : `${name} is talking`) : (ja ? '聞いています' : 'Listening')}
                </p>
                {stage === 'call' && <p className="mt-1 text-[10px] uppercase tracking-[0.3em] tabular-nums" style={{ color: MUTE }}>{ja ? '残り' : 'Left'} {clock(left)}</p>}
              </div>
            </div>
            <button onClick={() => conv.endSession()} className="border px-5 py-3 text-[11px] uppercase tracking-[0.3em]" style={{ borderColor: INK, color: INK }}>
              {ja ? '切る' : 'Hang up'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
