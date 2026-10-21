// LATITUDE — VUAL が街ごとに出している連載（Instagram のリール＋カルーセル）を、サイトで1号ずつ読めるようにするデータ。
// 新しい号は ISSUES に1件足し、public/latitude/<slug>/ に cover.jpg・pages/NN.jpg（動くページは NN.mp4 も）を置く。
// リールは本番では Cloudflare Stream（streamId）。streamId が無い間は public の reel.mp4（git には入れない）で確かめる。
// 公開予約：publishAt（日本時間で書く。例 '2026-10-25T20:00:00+09:00'）を入れた号は、その時刻まで一覧・トップ・サイトマップに出ず、
// 号のページも開けない（URL に ?preview=<LATITUDE_PREVIEW_KEY> を付けた時だけ先に見られる）。時刻を過ぎると数分以内に自動で出る。

export type LatitudeColour = { name: string; hex: string };
export type LatitudeChapter = { no: string; place: string; time: string };
export type LatitudePage = { file: string; video?: string };

export type LatitudeIssue = {
  slug: string;
  no: number;
  latitude: string; // 例 '64.1° N'
  city: string;
  published: string; // YYYY-MM
  line: string; // 号の一行（キャプションの2行目）
  chapters: LatitudeChapter[];
  colours: LatitudeColour[];
  notesTitle: string;
  notes: string[];
  pages: LatitudePage[];
  streamId?: string;
  credits?: string[];
  publishAt?: string; // 公開予約の時刻（無ければすぐ公開）
};

const pages = (n: number, animated: number[] = []): LatitudePage[] =>
  Array.from({ length: n }, (_, i) => {
    const k = String(i + 1).padStart(2, '0');
    return animated.includes(i + 1) ? { file: `${k}.jpg`, video: `${k}.mp4` } : { file: `${k}.jpg` };
  });

export const ISSUES: LatitudeIssue[] = [
  {
    slug: 'iceland',
    no: 1,
    latitude: '64.1° N',
    city: 'Iceland',
    published: '2026-10',
    line: 'A black beach at 07:40, a harbour at noon, glass at dusk.',
    chapters: [
      { no: 'I', place: 'Reynisfjara', time: '07:40' },
      { no: 'II', place: 'Reykjavík Harbour', time: '12:15' },
      { no: 'III', place: 'Harpa', time: '17:50' },
    ],
    colours: [
      { name: 'Overcast', hex: '#c8d5e4' },
      { name: 'North Atlantic', hex: '#8ba2b5' },
      { name: 'Basalt', hex: '#252f35' },
      { name: 'Moss', hex: '#444c3c' },
      { name: 'Harbour Red', hex: '#600e03' },
      { name: 'Harpa Glass', hex: '#132f3d' },
    ],
    notesTitle: 'The black beach',
    notes: [
      'Reynisfjara is black because it was once fire. Lava met the North Atlantic, shattered into glassy grains, and the sea has been grinding them finer ever since.',
      'Behind the sand rises a wall of basalt columns: six-sided pillars that formed as a thick flow of lava cooled slowly and cracked, the way mud splits in the sun. Offshore stand the Reynisdrangar stacks, what is left of a headland the waves have not yet taken.',
      "In Reykjavík the same geometry comes indoors. The glass skin of Harpa, the concert hall on the harbour, was made with the artist Olafur Eliasson, its cells drawn from the island's basalt.",
    ],
    pages: pages(9, [7]),
    streamId: 'a2bf5a9ef215e16d1906c6a2199241fa',
  },
  {
    slug: 'copenhagen',
    no: 2,
    latitude: '55.7° N',
    city: 'Copenhagen',
    published: '2026-10',
    line: 'Black granite at 09:40, an oak deck at noon, the opera roof at dusk.',
    chapters: [
      { no: 'I', place: 'The Black Diamond', time: '09:40' },
      { no: 'II', place: 'Royal Playhouse', time: '12:30' },
      { no: 'III', place: 'Opera House', time: '18:15' },
    ],
    colours: [
      { name: 'Black Granite', hex: '#10130f' },
      { name: 'Green Glass', hex: '#3c524b' },
      { name: 'Dusk Water', hex: '#2c4b63' },
      { name: 'Harbour', hex: '#b6bbb8' },
      { name: 'Oak Deck', hex: '#cfc3b9' },
      { name: 'Mohair', hex: '#c09774' },
      { name: 'Opera Gold', hex: '#cb7025' },
    ],
    notesTitle: "At the water's edge",
    notes: [
      "Copenhagen spends its days at the water's edge. The Black Diamond, the 1999 extension of the Royal Library, is clad in polished black granite and leans toward the harbour, so the water moves across its face.",
      'A little to the north, the Royal Playhouse lays a long oak deck over the water. Across the harbour, the Opera House holds its roof far out over the forecourt, and at dusk its underside catches the last low light.',
    ],
    pages: pages(19, [10]), // 2026-10-21 旅の1日を追う19枚に（10は動くページ）
    streamId: 'f6eb75a65e74cc751cba8874a37dab62', // v27b（ラスト手前にオペラの空撮）
    credits: ['Map data © OpenStreetMap contributors'],
  },
  {
    slug: 'london',
    no: 3,
    latitude: '51.5° N',
    city: 'London',
    published: '2026-10',
    line: 'Concrete at 09:10, brick at noon, iron over the river at dusk.',
    chapters: [
      { no: 'I', place: 'National Theatre', time: '09:10' },
      { no: 'II', place: 'Barbican', time: '12:30' },
      { no: 'III', place: 'Blackfriars Bridge', time: '16:40' },
    ],
    colours: [
      { name: 'Navy Coat', hex: '#101822' },
      { name: 'Blackfriars Iron', hex: '#49463a' },
      { name: 'Thames', hex: '#7d7860' },
      { name: 'Concrete', hex: '#c0cad2' },
      { name: 'Camel', hex: '#b7a88f' },
      { name: 'Pier Red', hex: '#76362c' },
      { name: 'Barbican Brick', hex: '#4b332e' },
    ],
    notesTitle: 'Concrete, brick, iron',
    notes: [
      "London keeps its grey in three materials. On the South Bank, Denys Lasdun's National Theatre, opened in 1976, steps down toward the river in terraces of board-marked concrete, the grain of the timber moulds still printed in the walls.",
      'A short walk north, the Barbican Estate was built between 1965 and 1976 on ground bombed in the war: towers, raised walkways and podiums paved in dark brick.',
      'Back at the water, Blackfriars Bridge has carried the road on wrought-iron arches since 1869. Beside it stand rows of red columns, the piers of an older railway bridge, left in the river when the bridge itself was taken down.',
      'Years ago, as a student in London, I heard Music for 18 Musicians at the Barbican. The pulse is still in these walls.', // 2026-10-21 編集者本人の記憶（事実）
    ],
    pages: pages(18, [8]), // 2026-10-21 旅の1日を追う18枚に（8は動くページ）
    streamId: '460e485d748479bb46ff6349fee8705d',
    publishAt: '2026-10-22T10:00:00+01:00', // ロンドン時間（BST）10:00 = 日本時間 18:00
    credits: ['Map data © OpenStreetMap contributors'],
  },
];

// 公開予約：今の時刻で出してよい号か
export const isLive = (i: LatitudeIssue, now: number = Date.now()) => !i.publishAt || new Date(i.publishAt).getTime() <= now;
export const liveIssues = (now: number = Date.now()) => ISSUES.filter((i) => isLive(i, now));
export const getIssue = (slug: string) => ISSUES.find((i) => i.slug === slug);
export const issueNo = (i: LatitudeIssue) => `No. ${String(i.no).padStart(2, '0')}`;
export const assetUrl = (i: LatitudeIssue, file: string) => `/latitude/${i.slug}/${file}`;
