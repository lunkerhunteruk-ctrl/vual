// 2026-10-30 LATITUDE の部屋。旅人と文字で話せて、話したい人は自分から「通話する」を押した時だけ声で話す（ElevenAgents）。
// 会話の設定（人物・声・決まり）は ElevenLabs 側にあり、vault.vual.jp/tools/rin-call-agent.cjs で作る・直す（人物の説明は vault の config/rin-call-agent-prompt.md）。
// まず凛だけ。公開は LATITUDE_ROOMS=open の時だけ（手元の試作では開く）。登録者だけに出す仕組みは、メールの登録先を決めてから足す。

// 部屋の中継ふうの動画。from〜to は日本の時刻（時。0:00 をまたぐ時は from > to）。reactions を使うのは、反応の動画と光が合う場面だけ
export type RoomCam = {
  base: string; // 動画の置き場所（手元は public、本番は R2）
  slots: { from: number; to: number; clip: string; reactions?: boolean }[];
  reactions: { enter?: string; call?: string };
};

// 金沢の宿の部屋（凛は浴衣。場面の一覧は vault の outputs/rin-room-kanazawa-20261030/SCENES.md）。金沢のページにも小さく流す
export const KANAZAWA_INN: RoomCam = {
  base: '/latitude/rooms/rin-kanazawa/',
  slots: [
    { from: 6.5, to: 11, clip: 'M2.mp4' },
    { from: 11, to: 16.5, clip: 'D1.mp4' },
    { from: 16.5, to: 19, clip: 'E3.mp4' },
    { from: 19, to: 24, clip: 'N1.mp4', reactions: true },
    { from: 0, to: 6.5, clip: 'L1.mp4', reactions: true },
  ],
  reactions: { enter: 'R1.mp4', call: 'R2.mp4' }, // 入った時の反応は R1a の 5.5〜8秒（最初と最後のコマを固定して作り直した物）
};

// 凛の東京の自宅（2026-10-30 ユーザー決定：部屋は自宅で固定。家の服。場面と指示文は vault の outputs/rin-room-tokyo-20261030/）
export const TOKYO_HOME: RoomCam = {
  base: '/latitude/rooms/rin-tokyo/',
  slots: [
    { from: 6.5, to: 10, clip: 'M2.mp4' }, // 朝ごはん
    { from: 10, to: 13, clip: 'D1.mp4' }, // シャツにスチーム（6.5秒から歩き出すので0〜6秒）
    { from: 13, to: 16.5, clip: 'D2.mp4' }, // 裾にまち針
    { from: 16.5, to: 19, clip: 'E1.mp4', reactions: true }, // 器の底
    { from: 19, to: 24, clip: 'N1.mp4', reactions: true }, // 足を伸ばしてスマホ（後半で姿勢が変わるので0〜4.5秒）
    { from: 0, to: 6.5, clip: 'L1.mp4' }, // 布団でひざを抱える
  ],
  reactions: { enter: 'R1.mp4', call: 'R2.mp4' }, // 顔を上げるのは R1 の5.5〜8秒（最初と最後のコマを固定）。夕方の灯りで撮ったので夕方と夜だけ使う
};

export type LatitudeRoom = {
  person: string; // PEOPLE の slug
  nameJa: string; // 日本語の画面で出す名前
  city: string; // いまいる所（地図の最後の場所に合わせる）
  month: string;
  textAgentId: string;
  callAgentId: string;
  callSeconds: number; // 1回の通話の長さ（会話設定の max_duration_seconds と同じ）
  callsPerDay: number; // 1人1日の通話の回数
  textPerDay: number; // 1人1日の、文字の部屋に入る回数
  cam?: RoomCam;
};

export const ROOMS: LatitudeRoom[] = [
  {
    person: 'rin',
    nameJa: '凛',
    city: 'Tokyo',
    month: 'November',
    textAgentId: 'agent_7901m65xnakse66s2ve1330w12av',
    callAgentId: 'agent_9601m65swfnhe8ztv973cy31vrar',
    callSeconds: 300,
    callsPerDay: 2,
    textPerDay: 40,
    cam: TOKYO_HOME,
  },
];

export const getRoom = (person: string) => ROOMS.find((r) => r.person === person);

export const roomsOpen = () => process.env.NODE_ENV !== 'production' || process.env.LATITUDE_ROOMS === 'open';
