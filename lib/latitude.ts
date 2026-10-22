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
  capColour?: string; // 読み物の頭の大きな1文字（ドロップキャップ）の色。無ければ墨
  recipe?: string; // 2026-10-22 体験（顔を入れてその服の世界に入る）用のレシピの目印。data/latitude-recipes/<slug>/recipe.json（ページ→LOOK・服の写真・場所・フィルム）
};

const pages = (n: number, animated: number[] = []): LatitudePage[] =>
  Array.from({ length: n }, (_, i) => {
    const k = String(i + 1).padStart(2, '0');
    return animated.includes(i + 1) ? { file: `${k}.jpg`, video: `${k}.mp4` } : { file: `${k}.jpg` };
  });

export const ISSUES: LatitudeIssue[] = [
  {
    slug: 'iceland',
    recipe: 'data/latitude-recipes/iceland/recipe.json',
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
    recipe: 'data/latitude-recipes/copenhagen/recipe.json',
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
      'At art school in London there was a girl from Copenhagen who studied graphic design. I hope she is well, somewhere out there in this city.', // 2026-10-21 編集者本人の記憶（名前は出さない）
    ],
    pages: pages(19, [10]), // 2026-10-21 旅の1日を追う19枚に（10は動くページ）
    streamId: 'f6eb75a65e74cc751cba8874a37dab62', // v27b（ラスト手前にオペラの空撮）
    credits: ['Map data © OpenStreetMap contributors'],
  },
  {
    slug: 'london',
    recipe: 'data/latitude-recipes/london/recipe.json',
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
      'London was my city for about seven years, when I was a fashion student. I lived all over it, north, south, east and west, one neighbourhood after another. I rarely go back now, but one memory has stayed: hearing Music for 18 Musicians at the Barbican. The pulse is still in these walls.', // 2026-10-22 編集者本人の記憶（事実）：ファッションの学生として約7年・東西南北に住んだ・今はあまり行かない
    ],
    pages: pages(19, [3, 10, 12, 13]), // 2026-10-22 19枚（3は地図の上で筆の線が描かれて歩く、10は額の中で動くイラスト、12は Concrete の油絵の具で枠を描く市場、13は色見本の右で線だけの4ポーズを繰り返す）
    streamId: '30f4c48d6eb48a19068bc51740d8a23d', // v17（白黒で始まり、大きな緯度が縮む冒頭・LOOK3 の2カットを細い顔の絵に）
    capColour: '#76362c', // Pier Red
    credits: ['Map data © OpenStreetMap contributors'],
  },
  {
    slug: 'edinburgh',
    no: 4,
    latitude: '55.9° N',
    city: 'Edinburgh',
    published: '2026-10',
    line: 'Sandstone at 08:30, wind on an old volcano at 14:40, lamps in the Old Town by 17:30.',
    chapters: [
      { no: 'I', place: 'The Shore, Leith', time: '08:30' },
      { no: 'II', place: 'Calton Hill', time: '11:50' },
      { no: 'III', place: "Arthur's Seat", time: '14:40' },
      { no: 'IV', place: 'Victoria Street', time: '17:30' },
    ],
    colours: [
      { name: 'Crag Black', hex: '#13191d' },
      { name: 'Moor Grass', hex: '#6d5e39' },
      { name: 'Victoria Teal', hex: '#457f8f' },
      { name: 'Haar', hex: '#dae7f1' },
      { name: 'Leith Sandstone', hex: '#d6bd9d' },
      { name: 'Camel Gold', hex: '#896242' },
      { name: 'Lamp Amber', hex: '#c2853f' },
    ],
    notesTitle: 'Stone, sea, an old volcano',
    notes: [
      "Edinburgh is built on old volcanoes and the sea. The day starts at Leith, the city's port on the Firth of Forth, where sandstone warehouses still line the quay of the Water of Leith.",
      'Calton Hill stands above the end of Princes Street. Its National Monument, begun in the 1820s to copy the Parthenon, was left with twelve columns when the money ran out.',
      "Across the valley, Arthur's Seat rises out of Holyrood Park: the remains of a volcano, with the long cliff of Salisbury Crags at its side.",
      'By the time the Old Town lamps come on, the sun has long gone. In late October it never climbs higher than about twenty degrees.',
    ],
    pages: pages(16), // 2026-10-22 夜行列車から夜のクロースまで16枚
    streamId: '3d9411b6caaa3452ed7144df3a8b4ac6', // v26（環境音だけ・-15 LUFS）
    capColour: '#896242', // Camel Gold
    publishAt: '2026-10-23T10:00:00+01:00', // ロンドン号の翌日、イギリス時間（BST）10:00 = 日本時間 18:00
    credits: ['Map data © OpenStreetMap contributors'],
  },
];

// 公開予約：今の時刻で出してよい号か
export const isLive = (i: LatitudeIssue, now: number = Date.now()) => !i.publishAt || new Date(i.publishAt).getTime() <= now;
// 2026-10-22 ユーザー指定：一覧・号の帯・トップの列は、新しい号を左（先頭）に並べる
export const liveIssues = (now: number = Date.now()) => ISSUES.filter((i) => isLive(i, now)).sort((a, b) => b.no - a.no);
export const getIssue = (slug: string) => ISSUES.find((i) => i.slug === slug);
export const issueNo = (i: LatitudeIssue) => `No. ${String(i.no).padStart(2, '0')}`;
export const assetUrl = (i: LatitudeIssue, file: string) => `/latitude/${i.slug}/${file}`;
