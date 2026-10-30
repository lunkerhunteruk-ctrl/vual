// LATITUDE — VUAL が街ごとに出している連載（Instagram のリール＋カルーセル）を、サイトで1号ずつ読めるようにするデータ。
// 新しい号は ISSUES に1件足し、public/latitude/<slug>/ に cover.jpg・pages/NN.jpg（動くページは NN.mp4 も）を置く。
// リールは本番では Cloudflare Stream（streamId）。streamId が無い間は public の reel.mp4（git には入れない）で確かめる。
// 公開予約：publishAt（日本時間で書く。例 '2026-10-25T20:00:00+09:00'）を入れた号は、その時刻まで一覧・トップ・サイトマップに出ず、
// 号のページも開けない（URL に ?preview=<LATITUDE_PREVIEW_KEY> を付けた時だけ先に見られる）。時刻を過ぎると数分以内に自動で出る。

export type LatitudeColour = { name: string; hex: string };
export type LatitudeChapter = { no: string; place: string; time: string };
export type LatitudePage = { file: string; video?: string };

// 2026-10-30 ユーザー決定：号の番号をやめ、名前のある6人がそれぞれ旅する形にする（設定書は vault.vual.jp/docs/LATITUDE-CHARACTERS.md）。
// 1本＝「その人の、ある街の、ある月の1日」。人と1日は架空、場所とひとつの事実は本物。
export type LatitudePerson = {
  slug: string;
  name: string;
  home: string; // 例 'Bergen, Norway'
  age: number;
  line: string; // 一行の紹介
  about: string[]; // 旅をする理由・よくやる仕草
  mark: string; // どの旅にも持っている物（服ではない印）
};

export const PEOPLE: LatitudePerson[] = [
  { slug: 'solveig', name: 'Solveig', home: 'Bergen, Norway', age: 27,
    line: 'She records sound for documentaries, and goes north for the wind.',
    about: ['Solveig lives in Bergen, the rainiest city in Norway, and records sound for documentary films: wind, waves, the horn of a ferry.',
      'She travels to islands and coasts. She stops to listen, shields the recorder from the wind with her hand, and never minds the weather.'],
    mark: 'An old palm-sized recorder with a small furry windshield.' },
  { slug: 'klara', name: 'Klára', home: 'Prague, Czechia', age: 24,
    line: 'An architecture student who travels by night train to see buildings.',
    about: ['Klára studies architecture in Prague. She travels on night trains: they are cheap, and she can start walking the moment she arrives in the morning.',
      'She looks up at ceilings, touches walls and railings with her fingertips, and stops to draw a few lines in a small notebook.'],
    mark: 'A small black notebook with a pencil tucked into it.' },
  { slug: 'maeve', name: 'Maeve', home: 'London (born in Ireland)', age: 22,
    line: 'She goes to the places she has read about, by bus and slow train.',
    about: ['Maeve was born in Ireland and lives in east London. She works in a second-hand bookshop and studies at art school in the evenings.',
      'She travels to places she has met in books, staying within Britain and Ireland. She reads by the bus window, gets lost in bookshops, and does not open an umbrella in the rain.'],
    mark: 'The same faded paperback, always.' },
  { slug: 'liv', name: 'Liv', home: 'Gothenburg, Sweden', age: 25,
    line: 'A potter who looks for clay and stone, and swims in cold water wherever she goes.',
    about: ['Liv is a potter in Gothenburg. She travels to look at earth and stone, and in every city she finds a place to swim in the sea or a river, in any season.',
      'She picks up small stones on the shore and keeps them in her pocket, holds hot drinks in both hands, and walks with her hair still wet.'],
    mark: 'A well-used towel in a faded colour, and a stone in her pocket.' },
  { slug: 'helene', name: 'Hélène', home: 'Lyon, France', age: 36,
    line: 'A perfumer who goes south to find where scents begin.',
    about: ['Hélène is a perfumer in Lyon. She travels south, to Italy, Spain and Portugal, to find where scents begin.',
      'She leans close to cups and flowers to smell them, collects matchbooks from bars, and is very good at eating alone.'],
    mark: 'A small brown glass vial, and a stack of matchbooks.' },
  { slug: 'rin', name: 'Rin', home: 'Tokyo, Japan', age: 23,
    line: 'On her days off she goes to see handwork and food, in Japan and across Asia.',
    about: ['Rin lives in Tokyo and is training as a stylist. On her days off she travels in Japan and across Asia to see handwork and to eat.',
      'She eats in concentrated silence, turns bowls over to look at the base, and stretches her legs out once her socks are off at the end of the day.'],
    mark: 'Her own chopsticks, in a slim case.' },
];

export type LatitudeIssue = {
  slug: string;
  person?: string; // PEOPLE の slug
  month?: string; // 描いた月（英語。例 'November'）
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
  previewToken?: string; // 公開前の号を1社だけに見せる鍵（?preview=<これ>）。本番に LATITUDE_PREVIEW_KEY が無くても効く。ほかの号の鍵は渡さずに済む
  capColour?: string; // 読み物の頭の大きな1文字（ドロップキャップ）の色。無ければ墨
  filmOnly?: boolean; // 2026-10-24 ユーザー：カルーセルを整理し終わるまで、リール（と題字・奥付）だけを出す。ページ・読み物・色は隠す。出す時は外して pages を入れる
  // 2026-10-30 検索の入口：題・説明文は検索結果に出る文（その街・その月・何を着るか）。trip はページの下に小さく置く「Notes for the trip」
  // （入口は役立つ情報、ねらいは雑誌として読ませること。ブランド名は書かない。気温は 1991–2020 の平年値）
  seo?: { title: string; description: string; month: string; weather: string; wore: string; season: string };
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
    person: 'solveig',
    month: 'October',
    seo: {
      title: "What to wear in Iceland in October — one day from Reynisfjara to Reykjavík | LATITUDE 64.1° N",
      description: "Iceland in October is around 8°C by day and near 3°C at night, with wind off the sea. One day in long coats, wide trousers and lug-soled boots, from the black beach at Reynisfjara to Harpa at dusk.",
      month: "October",
      weather: "Reykjavík in October averages 7.6°C by day and 2.7°C at night (1991–2020). The south coast is windier.",
      wore: "A long technical coat with a high collar over a grey crew-neck, wide black trousers falling over lug-soled boots; a navy faux-shearling pea coat over a blue shirt; a camel double-faced coat over a brown ribbed zip-neck knit.",
      season: "In September a light shell over a knit is enough. In November, add a hat and gloves; the day is much shorter.",
    },
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
    person: 'klara',
    month: 'October',
    seo: {
      title: "What to wear in Copenhagen in October — one day by the harbour | LATITUDE 55.7° N",
      description: "Copenhagen in October is around 12°C by day and 7°C at night. One day of knitwear, a crisp white collar and wide tweed trousers, from the Black Diamond to the Opera House at dusk.",
      month: "October",
      weather: "Copenhagen in October averages 12.2°C by day and 7.2°C at night (Copenhagen Airport, 1991–2020). Expect wind on the water.",
      wore: "A navy knit with the collar of a white volume-sleeve shirt worn out over it, grey-green tweed trousers with a corduroy band, pointed black boots.",
      season: "In September the shirt and knit alone are enough. In November, add a wool coat; it is about 5°C colder.",
    },
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
    person: 'maeve',
    month: 'November',
    seo: {
      title: "What to wear in London in November — concrete, brick and the river | LATITUDE 51.5° N",
      description: "London in November is around 12°C by day and 4°C at night. One day in a sand coat, a long navy coat and wide trousers, from the National Theatre to Blackfriars Bridge at dusk.",
      month: "November",
      weather: "London in November averages 11.6°C by day and 4.3°C at night (Kew Gardens, 1991–2020). Rain is likely; the light goes before five.",
      wore: "A sand double-cloth coat worn open over a grey V-neck and wide light denim; a charcoal flannel jacket over a striped camp-collar shirt and dark brown pleated trousers with patent loafers; a long navy coat over a camel cardigan buttoned to the top and grey wide trousers.",
      season: "In October a jacket over a knit is enough. In December, wear the long coat and add a scarf.",
    },
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
    pages: pages(18, [5, 9, 11, 13]), // 2026-10-22 18枚・見開き7組（5は地図の上で筆の線が描かれて歩く、9は額の中で動くイラスト、11は油絵の具で枠を描く市場、13は号の色を油絵の具で1色ずつ塗る）
    streamId: '30f4c48d6eb48a19068bc51740d8a23d', // v17（白黒で始まり、大きな緯度が縮む冒頭・LOOK3 の2カットを細い顔の絵に）
    capColour: '#76362c', // Pier Red
    credits: ['Map data © OpenStreetMap contributors'],
  },
  {
    slug: 'edinburgh',
    person: 'liv',
    month: 'October',
    seo: {
      title: "What to wear in Edinburgh in October — from Leith to the Old Town | LATITUDE 55.9° N",
      description: "Edinburgh in late October is around 13°C by day and 7°C at night, and the sun never climbs above about twenty degrees. One day in a flight jacket, a camel coat and soft flats, from Leith to Victoria Street.",
      month: "October",
      weather: "Edinburgh in October averages 13.4°C by day and 6.7°C at night (Royal Botanic Garden, 1991–2020). The wind on Calton Hill and Arthur's Seat is stronger than in the streets.",
      wore: "An olive flight jacket over an oatmeal V-neck and dark brown drawstring trousers; a pale camel double-breasted coat over an ivory cardigan and soft white trousers; a near-black hunting jacket over a charcoal knit and wide glen-check trousers. Flat pointed shoes with socks all day.",
      season: "In September, the jacket alone. In November it drops about 3°C; wear the coat and add a scarf for the hills.",
    },
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
    pages: pages(16, [5]), // 2026-10-22 夜行列車から夜のクロースまで16枚（5は色見本の右で線だけの4ポーズを繰り返す）
    streamId: '32f9348e76c8382e46d1f2e6f187cecb', // v30（左上に LATITUDE と 55.9° N がふわっと出て、列車に入ってすぐ消える冒頭）
    capColour: '#896242', // Camel Gold
    publishAt: '2026-10-23T10:00:00+01:00', // ロンドン号の翌日、イギリス時間（BST）10:00 = 日本時間 18:00
    credits: ['Map data © OpenStreetMap contributors'],
  },
  {
    slug: 'milan',
    person: 'helene',
    month: 'November',
    seo: {
      title: "What to wear in Milan in November — one day from Villa Necchi to the Duomo | LATITUDE 45.5° N",
      description: "Milan in November is around 12°C by day and 5°C at night. One day in an ivory dress, a grey sweater over a pleated skirt and navy satin trousers, from Villa Necchi to the Duomo at dusk.",
      month: "November",
      weather: "Milan in November averages 12.4°C by day and 5.3°C at night (Linate, 1991–2020). Fog is common in the morning.",
      wore: "An ivory wool dress with a small stand collar; a charcoal sweater over a black pleated bell skirt; a navy wool blouse with wide navy satin trousers. Platform shoes with grey socks.",
      season: "In October a knit over the dress is enough. In December it drops to about 7°C by day; add a long coat.",
    },
    no: 5,
    latitude: '45.5° N',
    city: 'Milan',
    published: '2026-10',
    line: 'One day in Milan, from Malpensa at dawn to the Galleria after dark.',
    chapters: [
      { no: 'I', place: 'Villa Necchi', time: '09:30' },
      { no: 'II', place: 'The foundation', time: '14:30' },
      { no: 'III', place: 'The Duomo', time: '16:30' },
      { no: 'IV', place: 'Torre Velasca', time: '17:30' },
    ],
    colours: [
      { name: 'Villa Ivory', hex: '#e5ddd3' },
      { name: 'Pool Blue', hex: '#7da3b0' },
      { name: 'Brera Charcoal', hex: '#303935' },
      { name: 'Gold Leaf', hex: '#d6bd86' },
      { name: 'Velasca Rose', hex: '#837060' },
      { name: 'Navy Dusk', hex: '#04131d' },
      { name: 'Negroni', hex: '#a14209' },
    ],
    notesTitle: 'Rings, marble, gold',
    notes: [
      'Milan is a city of rings. The Duomo stands at the centre; around it ran the old canals of the Navigli, filled in during the 1930s, and further out the Spanish walls. Only to the south-west do the canals still run in the open, from the Darsena basin.',
      'The cathedral was begun in 1386; its facade was finished under Napoleon. Beside it, the Galleria Vittorio Emanuele II opened in 1867 under a dome of iron and glass.',
      'Torre Velasca rose in 1958, its upper floors wider than the shaft below. The orange trams called Ventotto have run since 1928.',
    ],
    pages: pages(20, [2, 3, 5, 18]), // 2026-10-24 章を4つ（III ドゥオーモ・IV トッレ・ヴェラスカ）にして公開。2・3は時刻表がすりガラスの上に浮かぶ、5は地図の上を歩く、18は7色の絵の具
    streamId: '2dbd08206252c18a3a533355430ebd35', // v22（章は場所と時刻・Prism & Motion・電車の環境音・ドゥオーモの衣の差し込み）
    capColour: '#a14209', // Negroni
  },
  {
    slug: 'faro',
    person: 'solveig',
    month: 'November',
    seo: {
      title: "What to wear on Fårö and Gotland in November — from the ferry to the raukar | LATITUDE 57.9° N",
      description: "Fårö in November is around 6°C by day and 3°C at night, with wind from the Baltic. One day in shearling, a long olive coat and wide flannel trousers, from the six-minute ferry to a fire in a fishermen's hut.",
      month: "November",
      weather: "Gotland in November averages 6.3°C by day and 2.5°C at night (Visby, 1991–2020). By half past four it is dark.",
      wore: "A dark brown shearling wrap coat over a powder-blue turtleneck and taupe flannel trousers; a long olive double-faced coat with a draped shawl collar over an oatmeal turtleneck and black trousers; a curly dark shearling coat over an ecru cable knit and black leather trousers. Ankle boots all day.",
      season: "In October a long coat over a knit is enough. In December add a hat; the day is under seven hours.",
    },
    no: 6,
    latitude: '57.9° N',
    city: 'Fårö',
    published: '2026-10',
    line: 'One November day on Fårö, from the six-minute ferry to a fire in a fishermen’s hut.',
    chapters: [
      { no: 'I', place: 'Fårösund', time: '08:40' },
      { no: 'II', place: 'Langhammars', time: '10:15' },
      { no: 'III', place: 'Fårö kyrka', time: '12:40' },
      { no: 'IV', place: 'Holmudden', time: '15:35' },
      { no: 'V', place: 'Helgumannen', time: '16:20' },
    ],
    colours: [
      { name: 'Limestone', hex: '#9d9684' },
      { name: 'Baltic Grey', hex: '#647175' },
      { name: 'Juniper', hex: '#474936' },
      { name: 'Olive Wool', hex: '#786e46' },
      { name: 'Kyrka Roof', hex: '#aa5c40' },
      { name: 'Shearling', hex: '#3e2f26' },
      { name: 'Night Navy', hex: '#12243a' },
    ],
    notesTitle: 'Stone that was a reef',
    notes: [
      'Fårö lies off the northern tip of Gotland. A free car ferry crosses the sound in about six minutes.',
      'Along the shore stand the raukar, pillars of limestone. They are the cores of coral reefs that grew in a warm Silurian sea, more than four hundred million years ago. After the ice age the land rose, the waves cut away the softer rock, and the pillars stayed.',
      'In November the light is short. By half past four, the fishermen’s huts on the shingle are dark.',
    ],
    pages: pages(20, [2, 4, 5, 6]), // 2026-10-26 2は時刻表がすりガラスに浮かぶ、4・5はマティス風のペン画が動く、6は7色を斜めの筆で塗る
    streamId: '48cb26e5fc22a4ee262498f2939c2467', // v24（冒頭の題字を表紙と同じ C の形に：下に太い FÅRÖ。前の v23 は 04c3a84c…）
    capColour: '#aa5c40', // Kyrka Roof
    credits: ['Map data © OpenStreetMap contributors'],
  },
  {
    // 2026-10-27 未公開。TOTEME 本社に No.06 と一緒に聞く時、?preview=<previewToken> 付きのアドレスで先方にだけ見せる。
    // 了解が出たら publishAt を外し（クレジット「Wardrobe courtesy of TOTEME」を足し）、カルーセルができたら filmOnly を外す
    slug: 'klippan',
    person: 'solveig',
    month: 'October',
    no: 7,
    latitude: '56.1° N',
    city: 'Klippan',
    published: '2026-10',
    line: 'One day in Skåne, from the Malmö train to a church built without cutting a single brick.',
    chapters: [
      { no: 'I', place: 'Malmö C', time: '09:10' },
      { no: 'II', place: 'S:t Petri kyrka', time: '11:00' },
      { no: 'III', place: 'Söderåsen', time: '14:30' },
      { no: 'IV', place: 'Lilla Torg', time: '17:30' },
    ],
    colours: [],
    notesTitle: 'Not a single brick cut',
    notes: [
      'St Peter’s Church in Klippan was built by Sigurd Lewerentz between 1962 and 1966. Not one brick was cut to fit; the mortar joints take up the difference.',
      'The window panes are not set in frames. They are clipped to the outside of the wall.',
    ],
    pages: [],
    streamId: '56882efe911faa06428637d7b07173d1', // v11（K5 の曲・最後は LATITUDE → VUAL）
    publishAt: '2099-01-01T00:00:00+09:00',
    previewToken: '9WXITq75DC00xzbo', // TOTEME 用
    filmOnly: true,
  },
];

// 公開予約：今の時刻で出してよい号か
export const isLive = (i: LatitudeIssue, now: number = Date.now()) => !i.publishAt || new Date(i.publishAt).getTime() <= now;
// 2026-10-22 ユーザー指定：一覧・号の帯・トップの列は、新しい号を左（先頭）に並べる
export const liveIssues = (now: number = Date.now()) => ISSUES.filter((i) => isLive(i, now)).sort((a, b) => b.no - a.no);
export const getIssue = (slug: string) => ISSUES.find((i) => i.slug === slug);
export const getPerson = (slug: string) => PEOPLE.find((p) => p.slug === slug);
export const personOf = (i: LatitudeIssue) => (i.person ? getPerson(i.person) : undefined);
export const issuesOf = (person: string, now: number = Date.now()) => liveIssues(now).filter((i) => i.person === person);
// 2026-10-30 号の番号は出さない。見出しは「人 · 月」（例 Klára · November）。no は並べる順にだけ使う
export const issueNo = (i: LatitudeIssue) => [personOf(i)?.name, i.month].filter(Boolean).join(' · ') || `No. ${String(i.no).padStart(2, '0')}`;
export const assetUrl = (i: LatitudeIssue, file: string) => `/latitude/${i.slug}/${file}`;
