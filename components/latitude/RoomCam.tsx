'use client';
import { useEffect, useRef, useState } from 'react';
import { INK, MUTE, SERIF } from '@/lib/latitude-theme';
import type { RoomCam as Cam } from '@/lib/latitude-rooms';

// 2026-10-30 部屋の中継ふうの動画。日本の時刻で場面を選ぶので、同じ時刻に開いた人は同じ凛を見る。
// 8秒の動画を2つの <video> で交互に流し、終わる少し前に次をふわっと重ねる（つなぎ目で止まらないように）。
// reaction：部屋に入った時（enter）は1回だけ、通話中（call）は終わるまで、その動画に切り替える。夜の光で撮った反応は夜の場面の時だけ使う。

const FADE = 0.8; // 秒
const jstHour = () => {
  const d = new Date(Date.now() + 9 * 3600e3);
  return d.getUTCHours() + d.getUTCMinutes() / 60;
};
const jstClock = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(11, 16);

function slotNow(cam: Cam) {
  const h = jstHour();
  return cam.slots.find((s) => (s.from <= s.to ? h >= s.from && h < s.to : h >= s.from || h < s.to)) ?? cam.slots[0];
}

export default function RoomCam({ cam, reaction, fallback }: { cam: Cam; reaction: 'enter' | 'call' | null; fallback: string }) {
  const a = useRef<HTMLVideoElement>(null);
  const b = useRef<HTMLVideoElement>(null);
  const [front, setFront] = useState<'a' | 'b'>('a');
  const [clock, setClock] = useState('');
  const [slot, setSlot] = useState(() => slotNow(cam));
  const [failed, setFailed] = useState(false);

  // いま流す動画：反応が使える場面なら反応、それ以外は時間の場面
  const react = reaction && cam.reactions[reaction] && slot.reactions ? cam.reactions[reaction] : null;
  const src = `${cam.base}${react ?? slot.clip}`;
  const loop = !react || reaction === 'call';

  useEffect(() => {
    const id = setInterval(() => { setClock(jstClock()); setSlot(slotNow(cam)); }, 15000);
    setClock(jstClock());
    return () => clearInterval(id);
  }, [cam]);

  // 新しい動画は、裏の <video> に入れてから重ねて切り替える
  useEffect(() => {
    const back = front === 'a' ? b.current : a.current;
    const cur = front === 'a' ? a.current : b.current;
    if (!back || !cur) return;
    if (cur.getAttribute('src') === src) return;
    if (!cur.getAttribute('src')) {
      // 最初の1本：時刻から位置を決める（みんなが同じ所を見る）
      cur.src = src;
      cur.addEventListener('loadedmetadata', () => { cur.currentTime = (Date.now() / 1000) % Math.max(1, cur.duration - FADE); cur.play().catch(() => {}); }, { once: true });
      return;
    }
    back.src = src;
    back.currentTime = 0;
    back.play().catch(() => {});
    setFront(front === 'a' ? 'b' : 'a');
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  // 終わる少し前に、同じ動画（反応が1回きりなら時間の場面）を裏から重ねる
  useEffect(() => {
    const cur = front === 'a' ? a.current : b.current;
    const back = front === 'a' ? b.current : a.current;
    if (!cur || !back) return;
    const onTime = () => {
      if (!cur.duration || cur.currentTime < cur.duration - FADE) return;
      cur.removeEventListener('timeupdate', onTime);
      back.src = loop ? src : `${cam.base}${slot.clip}`;
      back.currentTime = 0;
      back.play().catch(() => {});
      setFront(front === 'a' ? 'b' : 'a');
    };
    cur.addEventListener('timeupdate', onTime);
    return () => cur.removeEventListener('timeupdate', onTime);
  }, [front, src, loop, cam.base, slot.clip]);

  if (failed) return <div className="flex h-full items-center justify-center text-[14px]" style={{ color: MUTE, fontFamily: SERIF }}>{fallback}</div>;

  const v = (ref: React.RefObject<HTMLVideoElement | null>, on: boolean) => (
    <video ref={ref} muted playsInline preload="auto" onError={() => setFailed(true)} aria-hidden="true"
      className="absolute inset-0 h-full w-full object-cover" style={{ opacity: on ? 1 : 0, transition: `opacity ${FADE}s ease` }} />
  );
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: INK }}>
      {v(a, front === 'a')}
      {v(b, front === 'b')}
      <span className="absolute bottom-3 right-3 text-[11px] uppercase tracking-[0.2em] tabular-nums" style={{ color: 'rgba(242,238,231,0.8)' }}>
        ● Live&nbsp;&nbsp;{clock} JST
      </span>
    </div>
  );
}
