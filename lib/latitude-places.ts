// 2026-10-30 LATITUDE の街のページ（/latitude/places/<city>）。旅人がその街で過ごした1日と、旅人のおすすめの店。
// 店は「編集部が実在と営業を確かめた物だけ」（vault.vual.jp/outputs/rin-room-kanazawa-20261030/PLACES-KANAZAWA.json が元）。
// 同じ一覧を部屋の会話（凛が名前を出してよい店）にも使う。褒めてよい・けなさない・号で行っていない店に「行った」とは書かない。
// 店の写真はAIで作らない（実物と違う店を見せない）。載せる写真は、旅人の号の場面だけ。
// 広告の店を載せる時は ad: true にして、広告だと分かる印を出す。

// 店の一覧は lib/latitude-places/<city>.json（部屋の会話の設定 vault.vual.jp/tools/rin-call-agent.cjs も同じファイルを読む）
import kanazawa from './latitude-places/kanazawa.json';
import london from './latitude-places/london.json';
import copenhagen from './latitude-places/copenhagen.json';
import milan from './latitude-places/milan.json';
import edinburgh from './latitude-places/edinburgh.json';
import reykjavik from './latitude-places/reykjavik.json';
import { KANAZAWA_INN, type RoomCam } from './latitude-rooms';

export type PlaceCategory = 'matcha' | 'sweets' | 'food' | 'coffee' | 'craft';

export type CityPlace = {
  name: string; // 正式な店名（日本語）
  nameEn: string;
  category: PlaceCategory;
  area: string;
  areaEn: string;
  address: string; // 町名まで
  url: string; // 公式
  what: string; // 何の店か（事実）
  whatEn: string;
  note: string; // 旅人の一言（事実に基づく好み）
  noteEn: string;
  verifiedAt: string; // 編集部が営業を確かめた日
  ad?: boolean;
};

export type LatitudeCity = {
  slug: string;
  name: string; // 英字
  nameJa: string;
  latitude: string; // '36.6° N'
  country: string;
  countryJa: string;
  countryCode?: string; // 検索エンジン向けの住所の国（ISO 3166-1）。無ければ 'JP'
  person: string; // その街を旅した人（PEOPLE の slug）
  issue?: string; // 公開した号の slug（まだなら無し）
  coords?: [number, number]; // 2026-11-01「その街のいま」の天気を取る座標。無ければ lib/latitude-map.ts の PLACES（issue か slug）
  intro: string;
  introJa: string;
  images: { file: string; alt: string; altJa: string }[]; // public/latitude/places/<slug>/ の号の場面
  // 種類の見出しの横に置く号の場面（「凛の1日から」と添える。店の行には置かない＝その店の写真に見せない）
  categoryImages?: Partial<Record<PlaceCategory, { file: string; alt: string; altJa: string }>>;
  places: CityPlace[];
  // この季節にこの街で何を着るか（号の服＝VUAL オリジナル。旅人の一言つき）。2026-10-30 ユーザー指定：AI のチャットにない「旅の服」を見せる
  wear?: {
    season: string; seasonJa: string;
    // 2026-11-01 号の服が VUAL のオリジナルか（無ければ true）。実在ブランドの服で撮った号は false にして「服はすべて VUAL のオリジナル」を出さない（ブランド名も書かない）
    vualOriginals?: boolean;
    facts: { en: string; ja: string }[]; // 気温・日の入り・足元など、号を作る時に調べた事実
    looks: { time: string; image: string; items: string; itemsJa: string; note: string; noteJa: string }[];
  };
  // 旅人の1日の回り方（号の順番）。near は、その場所の近くにある一覧の店（店の name）。旅人がその店に行ったとは書かない
  route?: { time: string; place: string; placeJa: string; what: string; whatJa: string; image?: string; near?: string[] }[];
  // 深掘りの街だけ：旅人が泊まった宿の部屋の中継ふうの動画（部屋のページは自宅で固定。2026-10-30 ユーザー決定）
  inn?: { cam: RoomCam; title: string; titleJa: string; note: string; noteJa: string };
};

export const CATEGORY_LABEL: Record<PlaceCategory, { en: string; ja: string }> = {
  matcha: { en: 'Matcha', ja: '抹茶' },
  sweets: { en: 'Sweets', ja: '甘味' },
  food: { en: 'To eat', ja: 'ごはん' },
  coffee: { en: 'Coffee', ja: 'コーヒー' },
  craft: { en: 'Vessels', ja: '器' },
};

export const CITIES: LatitudeCity[] = [
  {
    slug: 'kanazawa',
    name: 'Kanazawa',
    nameJa: '金沢',
    latitude: '36.6° N',
    country: 'Ishikawa, Japan',
    countryJa: '石川県',
    person: 'rin',
    intro: 'Rin spent one day here in November: the morning train, the market, a garden of still water, the teahouse lanes at dusk, and a night by the Asano river.',
    introJa: '凛が11月に1日を過ごした街。朝の新幹線で着いて、市場、水の庭、夕暮れの茶屋街、夜は浅野川のそばの宿。',
    images: [
      { file: 'gate.jpg', alt: 'Rin under the wooden Tsuzumi gate in the morning', altJa: '朝、鼓門の木組みの下の凛' },
      { file: 'water.jpg', alt: 'A small figure at the edge of a still water garden', altJa: '水鏡の庭のふちに立つ凛' },
      { file: 'garden.jpg', alt: 'Rin under the straw ropes of the yukitsuri', altJa: '雪吊りの縄の下の凛' },
      { file: 'chaya.jpg', alt: 'Rin walking the teahouse lane at dusk', altJa: '夕暮れの茶屋街を歩く凛' },
      { file: 'river.jpg', alt: 'The Asano river at the blue hour', altJa: '浅野川の夕暮れ' },
    ],
    categoryImages: {
      food: { file: 'crab.jpg', alt: 'From Rin\'s day: crab at a wooden counter', altJa: '凛の1日から：木のカウンターで蟹' },
    },
    places: kanazawa as CityPlace[],
    wear: {
      season: 'Late November',
      seasonJa: '11月の終わり',
      facts: [
        { en: 'Around 15°C by day and 8°C at night; colder after dark.', ja: '昼は15℃前後、夜は8℃前後。日が落ちると一気に冷える。' },
        { en: 'The sun sets at about 16:40.', ja: '日の入りは16時40分ごろ。' },
        { en: 'Stone paving in the teahouse streets, often wet.', ja: '茶屋街は石畳。濡れていることが多い。' },
        { en: 'Shoes come off at inns and in many tatami rooms.', ja: '宿や座敷では靴を脱ぐ。' },
      ],
      looks: [
        { time: '08:15', image: 'gate.jpg',
          items: 'A black leather long coat, a grey cashmere shirt, taupe flannel trousers, black patent loafers.',
          itemsJa: '黒い革のロングコート、グレーのカシミヤのシャツ、トープのフランネルのパンツ、黒いエナメルのローファー。',
          note: 'The train is warm and the station is cold. A coat you can open.', noteJa: '新幹線は暖かくて、駅は寒い。前を開けられるコートでいい。' },
        { time: '11:20', image: 'water.jpg',
          items: 'A long shearling gilet over a grey knit with full sleeves, a black knit dress, lug-sole boots.',
          itemsJa: 'シアリングの袖なしの長いジレ、袖がふくらんだグレーのニット、黒いニットのワンピース、厚い底のブーツ。',
          note: 'Midday is mild. No sleeves on the outer layer, so the arms stay free.', noteJa: '昼はゆるむ。上は袖なしにして、腕は軽くしておく。' },
        { time: '16:25', image: 'chaya.jpg',
          items: 'A hooded olive long coat, a flecked turtleneck, white barrel trousers, flat shoes with socks.',
          itemsJa: 'オリーブのフード付きのロングコート、まだらのタートルニット、白い丸みのあるパンツ、靴下にフラットな靴。',
          note: 'After dark, a hood. Shoes that come off easily, for the inn.', noteJa: '暗くなったらフード。宿で脱ぐから、すぐ脱げる靴。' },
      ],
    },
    route: [
      { time: '08:43', place: 'Kanazawa Station, Tsuzumi Gate', placeJa: '金沢駅・鼓門', what: 'Off the morning train, under the wooden gate.', whatJa: '朝の新幹線で着いて、木の門の下を歩く。', image: 'gate.jpg' },
      { time: '09:40', place: 'Omicho Market', placeJa: '近江町市場', what: 'Stopping at the crabs on ice.', whatJa: '氷の上の香箱蟹の前で立ち止まる。', image: 'market.jpg', near: ['市場めし あまつぼ'] },
      { time: '11:20', place: 'D.T. Suzuki Museum', placeJa: '鈴木大拙館', what: 'Sitting by the water mirror garden.', whatJa: '水鏡の庭のそばに座って、水面を見る。', image: 'water.jpg', near: ['能作（金沢漆器）', '金澤屋珈琲店 本店'] },
      { time: '14:10', place: 'Kenrokuen', placeJa: '兼六園', what: 'Looking up at the straw ropes of the yukitsuri.', whatJa: '雪吊りの縄を見上げる。', image: 'garden.jpg', near: ['兼六園茶屋 見城亭 カフェ'] },
      { time: '16:25', place: 'Higashi Chaya', placeJa: 'ひがし茶屋街', what: 'The lanterns come on along the stone lane.', whatJa: '灯りがともり始めた石畳を歩く。', image: 'chaya.jpg', near: ['森八 Matcha Cafe ひがし三番丁店', '一笑', '久連波', '縁煌'] },
      { time: '17:10', place: 'Asano River, Kazuemachi', placeJa: '浅野川・主計町', what: 'Sitting on the stone steps by the river, heels out of her shoes.', whatJa: '川べりの石段に座って、靴のかかとを少し浮かせる。', image: 'steps.jpg', near: ['いち凛', 'なべ・割烹 太郎', 'まゆ月 くらがり坂'] },
      { time: '19:30', place: 'The inn', placeJa: '宿', what: 'Socks off, legs stretched out on the tatami.', whatJa: '畳の部屋で靴下を脱いで、足を伸ばす。' },
    ],
    inn: {
      cam: KANAZAWA_INN,
      title: "Rin's inn in Kanazawa",
      titleJa: '凛の金沢の宿',
      note: 'The room by the Asano river where she stayed. It follows the time in Japan.',
      noteJa: '浅野川のそばの、凛が泊まった宿の部屋。日本の時刻に合わせて動いています。',
    },
  },
  // 2026-11-01 海外の5号の街。日本語のページが本命（docs/LATITUDE-CITY-GUIDE.md「誰に向けて書くか」）。
  // 写真は号の元の静止画（data/latitude-recipes/<号>/scenes/）から切り出した物。号の服は実在ブランドの物なので vualOriginals: false（ブランド名は書かない）
  {
    slug: 'london',
    name: 'London',
    nameJa: 'ロンドン',
    latitude: '51.5° N',
    country: 'England, United Kingdom',
    countryJa: 'イギリス',
    countryCode: 'GB',
    person: 'maeve',
    issue: 'london',
    intro: "Maeve spent one November day here: tea at a South Bank café, the concrete of the National Theatre, the brick of the Barbican, a bus over London Bridge, the iron of Blackfriars at dusk, and the Millennium Bridge at night.",
    introJa: 'メイヴが11月に1日を過ごした街。サウスバンクのカフェで紅茶、ナショナル・シアターのコンクリート、バービカンのレンガ、ロンドン橋を渡るバス、夕方のブラックフライアーズ橋の鉄、夜のミレニアム・ブリッジ。',
    images: [
      { file: 'nt.jpg', alt: 'Maeve leaning on the concrete of the National Theatre', altJa: 'ナショナル・シアターのコンクリートにもたれるメイヴ' },
      { file: 'barbican.jpg', alt: 'Maeve crouching on the brick of the Barbican highwalks', altJa: 'バービカンの空中歩廊のレンガにしゃがむメイヴ' },
      { file: 'bus.jpg', alt: 'Maeve on the top deck of a bus over London Bridge', altJa: 'ロンドン橋を渡るバスの2階に立つメイヴ' },
      { file: 'columns.jpg', alt: 'Maeve by the red columns at Blackfriars', altJa: 'ブラックフライアーズの赤い柱のそばのメイヴ' },
      { file: 'bridge.jpg', alt: "Maeve on the Millennium Bridge at night, St Paul's behind", altJa: '夜のミレニアム・ブリッジを歩くメイヴ。奥にセント・ポール大聖堂' },
    ],
    categoryImages: {
      food: { file: 'breakfast.jpg', alt: "From Maeve's day: tea and a full breakfast at a café", altJa: 'メイヴの1日から：カフェで紅茶と朝ごはん' },
    },
    places: london as CityPlace[],
    wear: {
      season: 'November',
      seasonJa: '11月',
      vualOriginals: false,
      facts: [
        { en: 'Around 12°C by day and 4°C at night (Kew Gardens, 1991–2020 averages).', ja: '昼は12℃前後、夜は4℃前後（キュー・ガーデン、1991〜2020年の平年値）。' },
        { en: 'Rain is likely, and the light goes before five.', ja: '雨になりやすい。5時前には暗くなる。' },
        { en: 'In October a jacket over a knit is enough. In December, the long coat and a scarf.', ja: '10月ならニットにジャケットで足りる。12月はロングコートにマフラー。' },
      ],
      looks: [
        { time: '09:10', image: 'terraces.jpg',
          items: 'A sand double-cloth coat worn open over a grey V-neck, wide light denim, black boots.',
          itemsJa: 'サンドベージュのダブルクロスのコートを前を開けて、グレーのVネック、ゆるい淡いデニム、黒いブーツ。',
          note: 'The river is cold in the morning. A coat you can open by noon.', noteJa: '朝の川べりは冷える。昼には前を開けられるコート。' },
        { time: '13:15', image: 'bus.jpg',
          items: 'A charcoal flannel jacket over a striped camp-collar shirt, dark brown pleated trousers, black patent loafers with grey socks.',
          itemsJa: 'チャコールのフランネルのジャケット、ストライプの開襟シャツ、こげ茶のタックパンツ、グレーの靴下に黒いエナメルのローファー。',
          note: 'Buses and markets are warm inside. A jacket, not a coat.', noteJa: 'バスも市場も、中は暖かい。昼はコートでなく、ジャケット。' },
        { time: '16:40', image: 'columns.jpg',
          items: 'A long navy coat over a camel cardigan buttoned to the top, grey wide trousers, a soft black leather bag.',
          itemsJa: 'ひざ下までの紺のコート、上までボタンを留めたキャメルのカーディガン、グレーのワイドパンツ、やわらかい黒い革のバッグ。',
          note: 'By the river after dark, a coat that falls past the knee.', noteJa: '暗くなってからの川べりは、ひざ下までのコート。' },
      ],
    },
    route: [
      { time: '08:15', place: 'A café on the South Bank', placeJa: 'サウスバンクのカフェ', what: 'Tea first, then breakfast.', whatJa: '先に紅茶。それから朝ごはん。', image: 'breakfast.jpg' },
      { time: '09:10', place: 'National Theatre', placeJa: 'ナショナル・シアター', what: 'Leaning on the board-marked concrete.', whatJa: '木の型の跡が残るコンクリートの壁にもたれる。', image: 'nt.jpg', near: ['Lasdun', 'The Anchor & Hope'] },
      { time: '12:30', place: 'Barbican', placeJa: 'バービカン', what: 'Crouching on the dark brick of the highwalks.', whatJa: '空中歩廊の暗いレンガの上にしゃがむ。', image: 'barbican.jpg', near: ['Sessions Arts Club', 'Prufrock Coffee', 'The Quality Chop House'] },
      { time: '13:15', place: 'A bus over London Bridge', placeJa: 'ロンドン橋を渡るバス', what: 'Standing on the top deck.', whatJa: '2階建てバスの上の階に立つ。', image: 'bus.jpg' },
      { time: '13:40', place: 'A covered market in Southwark', placeJa: 'サザークの屋根つきの市場', what: 'Lunch in brown paper, under an iron roof.', whatJa: '鉄の屋根の下で、茶色い紙に包んだ昼ごはん。', image: 'market.jpg', near: ['José', 'Pizarro', 'London Glassblowing'] },
      { time: '16:40', place: 'Blackfriars Bridge', placeJa: 'ブラックフライアーズ橋', what: 'Under the bridge, by the red columns of the old railway bridge.', whatJa: '橋の下、古い鉄道橋の赤い柱のそばに立つ。', image: 'columns.jpg', near: ['Wagumi'] },
      { time: '18:30', place: 'The pub', placeJa: 'パブ', what: 'A pint of bitter at the bar.', whatJa: 'カウンターでビターを1パイント。', image: 'pub.jpg' },
      { time: '21:30', place: 'Millennium Bridge', placeJa: 'ミレニアム・ブリッジ', what: "Walking toward St Paul's.", whatJa: 'セント・ポール大聖堂へ向かって橋を歩く。', image: 'bridge.jpg' },
    ],
  },
  {
    slug: 'copenhagen',
    name: 'Copenhagen',
    nameJa: 'コペンハーゲン',
    latitude: '55.7° N',
    country: 'Denmark',
    countryJa: 'デンマーク',
    countryCode: 'DK',
    person: 'klara',
    issue: 'copenhagen',
    intro: 'Klára spent one October day here, all of it by the harbour: a canal in Christianshavn in the morning, the black granite of the library, the oak deck of the playhouse, a small ferry at sunset, and the opera roof at dusk.',
    introJa: 'クラーラが10月に1日を過ごした街。ずっと港のそば。朝はクリスチャンハウンの運河、図書館の黒い花崗岩、劇場のオークのデッキ、日の入りの小さな渡し船、夕暮れのオペラハウスの屋根。',
    images: [
      { file: 'canal.jpg', alt: 'Klára with a bicycle by a canal in Christianshavn', altJa: 'クリスチャンハウンの運河で、自転車を押すクラーラ' },
      { file: 'diamond.jpg', alt: 'Klára leaning on the black granite of the Black Diamond', altJa: 'ブラック・ダイヤモンドの黒い花崗岩にもたれるクラーラ' },
      { file: 'playhouse.jpg', alt: 'Klára on the oak deck of the Royal Playhouse', altJa: '王立劇場のオークのデッキに立つクラーラ' },
      { file: 'ferry.jpg', alt: 'Klára on a harbour ferry after sunset', altJa: '日の入りのあと、港の渡し船に乗るクラーラ' },
      { file: 'opera.jpg', alt: 'Klára walking under the roof of the Opera House at dusk', altJa: '夕暮れのオペラハウスの屋根の下を歩くクラーラ' },
    ],
    categoryImages: {
      food: { file: 'lunch.jpg', alt: "From Klára's day: smørrebrød at lunch", altJa: 'クラーラの1日から：昼のスモーブロー' },
    },
    places: copenhagen as CityPlace[],
    wear: {
      season: 'October',
      seasonJa: '10月',
      vualOriginals: false,
      facts: [
        { en: 'Around 12°C by day and 7°C at night (Copenhagen Airport, 1991–2020 averages).', ja: '昼は12℃前後、夜は7℃前後（コペンハーゲン空港、1991〜2020年の平年値）。' },
        { en: 'Expect wind on the water.', ja: '水の上は風がある。' },
        { en: 'In September the shirt and knit alone are enough. In November add a wool coat; it is about 5°C colder.', ja: '9月ならシャツとニットだけで足りる。11月はウールのコートを足す。5℃ほど寒くなる。' },
      ],
      looks: [
        { time: '09:40', image: 'diamond.jpg',
          items: 'A navy knit with the white collar of a volume-sleeve shirt worn out over it, grey-green tweed trousers with a corduroy band, pointed black boots.',
          itemsJa: '紺のニットの上に、袖のふくらんだ白いシャツの襟を出して、コーデュロイの帯が入ったグレーグリーンのツイードのパンツ、先のとがった黒いブーツ。',
          note: 'A morning of walking from the station. Boots, and a collar that shows.', noteJa: '駅から朝じゅう歩く。足元はブーツ、襟は見せる。' },
        { time: '12:30', image: 'playhouse.jpg',
          items: 'A shaggy camel hand-knit over a long champagne satin skirt, ivory flat shoes with grey socks.',
          itemsJa: '毛足の長いキャメルの手編みのニットに、シャンパンベージュのサテンのロングスカート、グレーの靴下に生成りのフラットシューズ。',
          note: 'Noon on the deck is mild. One thick knit is enough.', noteJa: '昼のデッキはおだやか。厚いニット1枚でいい。' },
        { time: '18:15', image: 'opera.jpg',
          items: 'A dark brown leather jacket over a cream shaggy knit, charcoal wide trousers, ivory flat shoes.',
          itemsJa: 'こげ茶の革のジャケット、クリーム色の毛足の長いニット、チャコールのワイドパンツ、生成りのフラットシューズ。',
          note: 'On the ferry after sunset, leather keeps the wind out.', noteJa: '日の入りのあとの渡し船は、革で風を止める。' },
      ],
    },
    route: [
      { time: '08:30', place: 'A canal in Christianshavn', placeJa: 'クリスチャンハウンの運河', what: 'Stopping on the cobbles with a bicycle.', whatJa: '自転車を押して、石畳で立ち止まる。', image: 'canal.jpg', near: ['Lars Rank Keramik', 'Christianshavns Færgecafé'] },
      { time: '09:40', place: 'The Black Diamond', placeJa: 'ブラック・ダイヤモンド（王立図書館）', what: 'Leaning on the black granite by the water.', whatJa: '水辺の黒い花崗岩にもたれる。', image: 'diamond.jpg', near: ['Conditori La Glace', 'Studio Arhoj', 'Restaurant Schønnemann'] },
      { time: '12:30', place: 'Royal Playhouse', placeJa: '王立劇場（プレイハウス）', what: 'Sitting on the oak deck over the water.', whatJa: '水の上に張り出したオークのデッキに座る。', image: 'deck.jpg', near: ['Prolog Coffee (Papirøen)', 'Barr'] },
      { time: '13:00', place: 'A cellar lunch room', placeJa: '半地下の昼ごはんの店', what: 'Smørrebrød on a white tablecloth.', whatJa: '白いテーブルクロスで、スモーブロー。', image: 'lunch.jpg' },
      { time: '17:30', place: 'A harbour ferry', placeJa: '港の渡し船', what: 'Crossing the inner harbour just after sunset.', whatJa: '日の入りのすぐあと、港を渡る。', image: 'ferry.jpg' },
      { time: '18:15', place: 'Opera House', placeJa: 'オペラハウス', what: 'Walking under the roof as the last light catches it.', whatJa: '最後の光が当たる屋根の下を歩く。', image: 'opera.jpg', near: ['POPL'] },
      { time: '20:30', place: 'Dinner in an old warehouse', placeJa: '古い倉庫の店で夕ごはん', what: 'Candles, a heavy oak table, a glass of wine.', whatJa: 'ろうそくと厚いオークの机で、ワインを一杯。', image: 'dinner.jpg' },
    ],
  },
  {
    slug: 'milan',
    name: 'Milan',
    nameJa: 'ミラノ',
    latitude: '45.5° N',
    country: 'Lombardy, Italy',
    countryJa: 'イタリア',
    countryCode: 'IT',
    person: 'helene',
    issue: 'milan',
    intro: 'Hélène spent one November day here: the garden pool of Villa Necchi in the morning, an old tram, saffron risotto, an art foundation in the south of the city, the roof of the Duomo, and Torre Velasca at dusk.',
    introJa: 'エレーヌが11月に1日を過ごした街。朝はネッキ邸の庭のプール、古い路面電車、サフランのリゾット、街の南の美術の財団、ドゥオーモの屋上、夕暮れのトッレ・ヴェラスカ。',
    images: [
      { file: 'villa.jpg', alt: 'Hélène by the garden pool of Villa Necchi', altJa: 'ネッキ邸の庭のプールのそばのエレーヌ' },
      { file: 'tram.jpg', alt: 'Hélène standing in an old wooden tram', altJa: '古い木の路面電車に立つエレーヌ' },
      { file: 'foundation.jpg', alt: 'Hélène walking across the courtyard of an art foundation', altJa: '美術の財団の中庭を歩くエレーヌ' },
      { file: 'duomo.jpg', alt: 'Hélène on the roof terraces of the Duomo', altJa: 'ドゥオーモの屋上のテラスのエレーヌ' },
      { file: 'galleria.jpg', alt: 'Hélène walking through the Galleria at night', altJa: '夜のガッレリアを歩くエレーヌ' },
    ],
    categoryImages: {
      food: { file: 'risotto.jpg', alt: "From Hélène's day: risotto alla milanese", altJa: 'エレーヌの1日から：ミラノ風リゾット' },
    },
    places: milan as CityPlace[],
    wear: {
      season: 'November',
      seasonJa: '11月',
      vualOriginals: false,
      facts: [
        { en: 'Around 12°C by day and 5°C at night (Linate, 1991–2020 averages).', ja: '昼は12℃前後、夜は5℃前後（リナーテ、1991〜2020年の平年値）。' },
        { en: 'Fog is common in the morning.', ja: '朝は霧が出やすい。' },
        { en: 'In October a knit over the dress is enough. In December it drops to about 7°C by day; add a long coat.', ja: '10月ならワンピースにニットで足りる。12月は昼でも7℃ほど。ロングコートを足す。' },
      ],
      looks: [
        { time: '09:30', image: 'villa.jpg',
          items: 'An ivory wool dress with a small stand collar, platform shoes with grey socks.',
          itemsJa: '小さな立ち襟の、生成りのウールのワンピース。グレーの靴下に厚底の靴。',
          note: 'One long dress for the morning garden. Nothing else to fuss with.', noteJa: '朝の庭には、長いワンピース1枚。ほかは足さない。' },
        { time: '14:30', image: 'foundation.jpg',
          items: 'A charcoal sweater gathered at the waist with a ring, a black pleated bell skirt, platform shoes.',
          itemsJa: 'ウエストをリングで寄せたチャコールのセーター、黒いプリーツのベルスカート、厚底の靴。',
          note: 'Among pale factory walls, grey sits right.', noteJa: '白っぽい工場の壁の中では、グレーがなじむ。' },
        { time: '17:30', image: 'velasca.jpg',
          items: 'A navy wool blouse with a stand collar, wide navy satin trousers, platform shoes.',
          itemsJa: '立ち襟の紺のウールのブラウスに、紺のサテンのワイドパンツ、厚底の靴。',
          note: 'Navy from top to toe for the evening. The satin catches the lamps.', noteJa: '夕方からは上下とも紺。サテンが灯りを拾う。' },
      ],
    },
    route: [
      { time: '09:30', place: 'Villa Necchi', placeJa: 'ネッキ邸（ヴィッラ・ネッキ・カンピーリオ）', what: 'Sitting on the travertine edge of the garden pool.', whatJa: '庭のプールの、トラバーチンのふちに座る。', image: 'villa.jpg', near: ['Coffee Studio 7Gr.', 'Orsonero Coffee'] },
      { time: '14:30', place: 'The foundation', placeJa: '街の南の美術の財団', what: 'Walking across the courtyard of an old distillery.', whatJa: '古い蒸留所の中庭を歩く。', image: 'foundation.jpg', near: ['Trippa', 'Un Posto a Milano', 'Signor Lievito', 'Trattoria del Pescatore'] },
      { time: '16:30', place: 'The Duomo', placeJa: 'ドゥオーモ', what: 'On the roof terraces, a hand on the marble.', whatJa: '屋上のテラスで、大理石に手を置く。', image: 'duomo.jpg', near: ['Luini', 'Laboratorio Paravicini'] },
      { time: '17:30', place: 'Torre Velasca', placeJa: 'トッレ・ヴェラスカ', what: 'Plain plates set out on a table at the foot of the tower.', whatJa: '塔のふもとで、店先の机に並んだ白い器を手に取る。', image: 'velasca.jpg' },
    ],
  },
  {
    slug: 'edinburgh',
    name: 'Edinburgh',
    nameJa: 'エジンバラ',
    latitude: '55.9° N',
    country: 'Scotland, United Kingdom',
    countryJa: 'イギリス・スコットランド',
    countryCode: 'GB',
    person: 'liv',
    issue: 'edinburgh',
    intro: 'Liv spent one late-October day here: off the sleeper train at dawn, the sandstone quay at Leith, the unfinished columns on Calton Hill, the wind on Arthur\'s Seat, Victoria Street as the lamps came on, and a stone close at night.',
    introJa: 'リヴが10月の終わりに1日を過ごした街。夜行列車で夜明けに着いて、リースの砂岩の岸壁、カールトン・ヒルの未完成の柱、アーサーズ・シートの風、灯りのつき始めたヴィクトリア・ストリート、夜の石の小路（クロース）。',
    images: [
      { file: 'shore.jpg', alt: 'Liv on the quay at The Shore, Leith', altJa: 'リースのショアの岸壁に立つリヴ' },
      { file: 'calton.jpg', alt: 'Liv between the columns on Calton Hill', altJa: 'カールトン・ヒルの柱のあいだのリヴ' },
      { file: 'arthurs-seat.jpg', alt: "Liv on Arthur's Seat", altJa: 'アーサーズ・シートに立つリヴ' },
      { file: 'victoria.jpg', alt: 'Liv on Victoria Street at dusk', altJa: '夕暮れのヴィクトリア・ストリートのリヴ' },
      { file: 'close.jpg', alt: 'Liv walking down a stone close at night', altJa: '夜の石の小路を下りるリヴ' },
    ],
    places: edinburgh as CityPlace[],
    wear: {
      season: 'Late October',
      seasonJa: '10月の終わり',
      vualOriginals: false,
      facts: [
        { en: 'Around 13°C by day and 7°C at night (Royal Botanic Garden, 1991–2020 averages).', ja: '昼は13℃前後、夜は7℃前後（王立植物園、1991〜2020年の平年値）。' },
        { en: "The wind on Calton Hill and Arthur's Seat is stronger than in the streets.", ja: 'カールトン・ヒルとアーサーズ・シートは、街なかより風が強い。' },
        { en: 'In late October the sun never climbs above about twenty degrees.', ja: '10月の終わり、太陽は20度ほどまでしか上がらない。' },
        { en: 'In September, the jacket alone. In November it drops about 3°C; wear the coat and add a scarf for the hills.', ja: '9月ならジャケットだけ。11月は3℃ほど下がる。丘へはコートにマフラー。' },
      ],
      looks: [
        { time: '08:30', image: 'shore.jpg',
          items: 'An olive flight jacket over an oatmeal V-neck, dark brown drawstring trousers, flat pointed shoes with socks.',
          itemsJa: 'オリーブのフライトジャケット、オートミールのVネック、こげ茶のひものパンツ、靴下に先のとがったフラットシューズ。',
          note: 'Morning at the port: a short jacket, sleeves pushed up.', noteJa: '朝の港は、短いジャケットの袖をまくって。' },
        { time: '11:50', image: 'calton.jpg',
          items: 'A pale camel double-breasted coat worn open over an ivory cardigan and soft white trousers.',
          itemsJa: '淡いキャメルのダブルのコートを前を開けて、生成りのカーディガン、やわらかい白いパンツ。',
          note: 'Up the hill, a long coat. The wind is stronger at the top.', noteJa: '丘には長いコート。上は風が強い。' },
        { time: '14:40', image: 'arthurs-seat.jpg',
          items: 'A near-black hunting jacket over a charcoal knit and wide glen-check trousers.',
          itemsJa: '黒に近いハンティングジャケット、チャコールのニット、グレンチェックのワイドパンツ。',
          note: 'On the old volcano, a jacket you can zip.', noteJa: '古い火山の上は、ファスナーを閉められる上着。' },
        { time: '17:30', image: 'victoria.jpg',
          items: 'A golden camel double-breasted coat over a dark burgundy silk shirt and dark brown wide trousers.',
          itemsJa: '黄みのあるキャメルのダブルのコート、深いボルドーのシルクのシャツ、こげ茶のワイドパンツ。',
          note: 'When the lamps come on, the coat can stay open.', noteJa: '灯りがつく頃は、コートの前を開けたままでいい。' },
      ],
    },
    route: [
      { time: '07:10', place: 'The sleeper train from London', placeJa: 'ロンドンからの夜行列車', what: 'Tea in the cabin as the train reaches Scotland.', whatJa: 'スコットランドに入った寝台で、紅茶を一杯。', image: 'train.jpg' },
      { time: '08:30', place: 'The Shore, Leith', placeJa: 'リースのショア', what: 'At the edge of the quay, under the sandstone warehouses.', whatJa: '砂岩の倉庫の前、岸壁のふちに立つ。', image: 'shore.jpg', near: ['Williams & Johnson Coffee Co.', 'Fishers in Leith', 'Restaurant Martin Wishart', 'Cyan Clayworks'] },
      { time: '11:50', place: 'Calton Hill', placeJa: 'カールトン・ヒル', what: 'Arms up between the unfinished columns.', whatJa: '未完成の柱のあいだで、両腕を上げる。', image: 'calton.jpg', near: ["L'Escargot Bleu"] },
      { time: '13:00', place: 'A pub in the Old Town', placeJa: 'オールドタウンのパブ', what: 'A small whisky by the window.', whatJa: '窓ぎわで、小さなグラスのウイスキー。', image: 'pub.jpg' },
      { time: '14:40', place: "Arthur's Seat", placeJa: 'アーサーズ・シート', what: 'Wind on the edge of an old volcano.', whatJa: '古い火山のふちで、風を受ける。', image: 'arthurs-seat.jpg', near: ['Wedgwood the Restaurant'] },
      { time: '17:30', place: 'Victoria Street', placeJa: 'ヴィクトリア・ストリート', what: 'Stopping on the wet cobbles as the shop windows light up.', whatJa: '店の窓に灯りがともる、濡れた石畳で立ち止まる。', image: 'victoria.jpg', near: ['Whirlybird', "Mary's Milk Bar", 'Timberyard'] },
      { time: '21:30', place: 'A close in the Old Town', placeJa: 'オールドタウンの小路（クロース）', what: 'Down the wet stone steps under one lantern.', whatJa: 'ひとつの灯りの下、濡れた石段を下りる。', image: 'close.jpg' },
    ],
  },
  {
    slug: 'reykjavik',
    name: 'Reykjavík',
    nameJa: 'レイキャビク',
    latitude: '64.1° N',
    country: 'Iceland',
    countryJa: 'アイスランド',
    countryCode: 'IS',
    person: 'solveig',
    issue: 'iceland',
    intro: 'Solveig spent one October day in Iceland: the black beach at Reynisfjara at first light, the old harbour of Reykjavík at noon, and the glass of Harpa at dusk.',
    introJa: 'ソルヴェイが10月に過ごしたアイスランドの1日。朝は南の海岸、レイニスフィヤラの黒い浜。昼はレイキャビクの旧港、夕暮れはハルパのガラスの中。',
    images: [
      { file: 'beach.jpg', alt: 'Solveig on the basalt above the black beach at Reynisfjara', altJa: 'レイニスフィヤラの黒い浜の上、玄武岩に立つソルヴェイ' },
      { file: 'columns.jpg', alt: 'A small figure at the foot of the basalt columns', altJa: '玄武岩の柱のふもとに座るソルヴェイ' },
      { file: 'harbour.jpg', alt: 'Solveig at the old harbour of Reykjavík', altJa: 'レイキャビクの旧港のソルヴェイ' },
      { file: 'harpa.jpg', alt: 'Solveig and her reflection in the glass of Harpa', altJa: 'ハルパのガラスに映るソルヴェイ' },
      { file: 'harpa-floor.jpg', alt: 'Solveig sitting on the floor inside Harpa', altJa: 'ハルパの中で床に座るソルヴェイ' },
    ],
    places: reykjavik as CityPlace[],
    wear: {
      season: 'October',
      seasonJa: '10月',
      vualOriginals: false,
      facts: [
        { en: 'Reykjavík averages about 8°C by day and 3°C at night (1991–2020).', ja: 'レイキャビクは昼8℃前後、夜3℃前後（1991〜2020年の平年値）。' },
        { en: 'The south coast is windier.', ja: '南の海岸は、さらに風が強い。' },
        { en: 'In September a light shell over a knit is enough. In November add a hat and gloves; the day is much shorter.', ja: '9月ならニットに薄い上着で足りる。11月は帽子と手袋を足す。日がずっと短くなる。' },
      ],
      looks: [
        { time: '07:40', image: 'beach.jpg',
          items: 'A long khaki technical coat closed to the high collar, wide black trousers, lug-soled boots.',
          itemsJa: '高い襟まで閉めた、カーキの長い機能素材のコート、黒いワイドパンツ、厚い底のブーツ。',
          note: 'The wind is loud on the black beach. Close it to the chin.', noteJa: '黒い浜は風の音が大きい。襟の上まで閉める。' },
        { time: '12:15', image: 'rope.jpg',
          items: 'A navy pea coat with a faux-shearling yoke, buttoned up, over a blue shirt; black boots.',
          itemsJa: '胸にボアの付いた紺のピーコートをボタンを全部留めて、青いシャツ、黒いブーツ。',
          note: 'At the harbour, everything buttoned. The blue collar is the only colour.', noteJa: '港ではボタンを全部留める。色は青い襟だけ。' },
        { time: '17:50', image: 'harpa.jpg',
          items: 'A camel double-faced coat over a brown ribbed zip-neck knit, cream wide trousers.',
          itemsJa: 'キャメルのダブルフェイスのコート、茶色いリブのジップのニット、クリーム色のワイドパンツ。',
          note: 'Inside the glass it is quiet and warm. Camel for the dusk.', noteJa: 'ガラスの中は静かで暖かい。夕暮れには、キャメル。' },
      ],
    },
    route: [
      { time: '07:40', place: 'Reynisfjara', placeJa: 'レイニスフィヤラ（南の海岸）', what: 'On the basalt columns above the black beach.', whatJa: '黒い浜を見下ろす、玄武岩の柱の上に立つ。', image: 'beach.jpg' },
      { time: '12:15', place: 'Reykjavík Harbour', placeJa: 'レイキャビクの旧港', what: 'One boot on an iron bollard by the fishing boats.', whatJa: '漁船のそば、鉄の係船柱にブーツを片方のせる。', image: 'harbour.jpg', near: ['Kaffivagninn', 'Ísbúðin Valdís', 'La Primavera', 'Omnom Chocolate'] },
      { time: '17:50', place: 'Harpa', placeJa: 'ハルパ', what: 'Inside the glass, facing her own reflection.', whatJa: 'ガラスの中で、自分の映りこみと向き合う。', image: 'harpa.jpg', near: ['Hnoss Bistro', 'Kaffi Ó-le'] },
    ],
  },
];

export const getCity = (slug: string) => CITIES.find((c) => c.slug === slug);

// 地区のページ（/latitude/places/<city>/area/<地区>）は、店が AREA_MIN 軒以上ある地区だけ作る（1〜2軒のページは中身が薄く、検索で逆効果のため）。
// 足りない地区は、店が増えた時に自動でページができる。地区の名前は店の areaEn から作る（同じ地区は同じ表記にそろえる）。
export const AREA_MIN = 4;
// 2026-11-01 北欧の字（ø・æ・ð・þ）は NFKD で分解されないので先に置きかえる（Nørrebro → norrebro。消すと n-rrebro になる）
const LETTERS: Record<string, string> = { 'ø': 'o', 'æ': 'ae', 'ð': 'd', 'þ': 'th', 'ß': 'ss', 'œ': 'oe', 'ł': 'l' };
export const slugify = (t: string) => t.toLowerCase().replace(/[øæðþßœł]/g, (ch) => LETTERS[ch]).normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const areaSlug = (areaEn: string) => slugify(areaEn);
export function areasOf(c: LatitudeCity) {
  const m = new Map<string, { slug: string; name: string; nameEn: string; places: CityPlace[] }>();
  for (const x of c.places) {
    const slug = areaSlug(x.areaEn);
    const a = m.get(slug) ?? { slug, name: x.area, nameEn: x.areaEn, places: [] };
    a.places.push(x);
    m.set(slug, a);
  }
  return [...m.values()].filter((a) => a.places.length >= AREA_MIN).sort((a, b) => b.places.length - a.places.length);
}
