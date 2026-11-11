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
import vienna from './latitude-places/vienna.json';
import haworth from './latitude-places/haworth.json';
import morioka from './latitude-places/morioka.json';
import reggio from './latitude-places/reggio.json';
import faro from './latitude-places/faro.json';
import { KANAZAWA_INN, type RoomCam } from './latitude-rooms';

// 2026-11-01 ユーザー：小さい町は飲食と器に限らず「その街ならではの産業」で強みのある店を取り上げる（これまでの街も）。
// その店は category 'local' ＋ industry（街の industries の key）。ページは産業ごと（/latitude/places/<街>/<産業の key>。例 /latitude/places/kanazawa/gold-leaf）
export type PlaceCategory = 'local' | 'matcha' | 'sweets' | 'food' | 'coffee' | 'craft';

export type CityPlace = {
  name: string; // 正式な店名（日本語）
  nameEn: string;
  category: PlaceCategory;
  industry?: string; // category が 'local' の時だけ。街の industries の key
  area: string;
  areaEn: string;
  address: string; // 町名まで
  url?: string; // 公式（店のサイト、無ければ公式の Instagram・Facebook）。2026-11-11 公式が見つからない店は書かない（Website を出さず地図だけ）。記事・まとめ・予約サイトは入れない
  what: string; // 何の店か（事実）
  whatEn: string;
  note: string; // 旅人の一言（事実に基づく好み）
  noteEn: string;
  verifiedAt: string; // 編集部が営業を確かめた日
  ad?: boolean;
  // 2026-11-11 街のページの店の地図（components/latitude/CityShopMap.tsx）。[緯度, 経度]。
  // 住所から求める（OSM の Nominatim で店そのものが見つかればその位置、無ければ国土地理院の住所検索で番地・号の位置）。
  // 番地・号まで出ない店は coordsApprox: true（カードに「位置はおおよそ」と出す）。coords の無い店は地図に出ない（リストには出る）
  coords?: [number, number];
  coordsApprox?: boolean;
  // 店からもらった写真だけ（public/latitude/places/<街>/shops/ のファイル名。R2 へ上げる）。公式サイトや Instagram の画像を切り抜いて使わない。
  // 号の場面の写真も入れない（その店の写真に見えるため）。あれば地図の丸の中とカードに出る
  photo?: string;
  // 公式の Instagram（プロフィールか投稿の URL）。url が Instagram の店は書かなくてよい。あれば地図のカードに Instagram の正式な埋めこみを出す
  instagram?: string;
};

// その街ならではの産業（例 金沢の金箔）。key は URL になる（種類の key と 'area' は使わない）
export type CityIndustry = { key: string; en: string; ja: string; about: string; aboutJa: string };

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
  industries?: CityIndustry[]; // 並べる順。街のページでは飲食より先に出す（その街らしさが先に来るように）
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
  // 2026-11-11 店の地図の土台（public/latitude/citymaps/<slug>.json。scripts/latitude-citymap.py で作る）がある街だけ true
  shopMap?: boolean;
  // 深掘りの街だけ：旅人が泊まった宿の部屋の中継ふうの動画（部屋のページは自宅で固定。2026-10-30 ユーザー決定）
  inn?: { cam: RoomCam; title: string; titleJa: string; note: string; noteJa: string };
};

export const CATEGORY_LABEL: Record<PlaceCategory, { en: string; ja: string }> = {
  local: { en: 'Made here', ja: 'この街の仕事' },
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
    shopMap: true,
    industries: [
      { key: "gold-leaf", en: "Gold leaf", ja: "金箔", about: "Kanazawa makes over 99% of Japan's gold leaf, according to Ishikawa Prefecture. Gold the size of a ten-yen coin is beaten out to about the area of four tatami mats.", aboutJa: "石川県によると、全国の金箔の99％以上が金沢で作られる。10円玉ほどの金を、畳4枚ほどの広さまで打ち延ばす。" },
      { key: "kaga-yuzen", en: "Kaga yuzen dyeing", ja: "加賀友禅", about: "Kaga yuzen is Kanazawa's hand-painted silk dyeing, a nationally designated traditional craft of Ishikawa, known for patterns drawn from flowers, plants and landscapes in many colours. Working dye studios still operate in the city.", aboutJa: "金沢の、絹に手で模様を描いて染める技法。石川県の国指定の伝統的工芸品で、草花や風景など自然を描いた模様と、多くの色を使うのが特徴。市内にはいまも染めの工房がある。" },
    ],
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
  // 2026-11-07 盛岡（凛・号 morioka・2026年11月24日・くもりで乾いた冷たい日）。服はすべて VUAL のオリジナル（1日1コーデ）。
  // 店は vault.vual.jp outputs/vual-rin-morioka-20261101/places（agy で集め → Haiku が公式で確かめ → 迷った店を Sonnet が見直し。最終15軒）。
  // 写真は号の静止画（リールの R01〜R11・カルーセルの K01）を 9:16 に切った物。店の名前・看板の字の出る絵は使っていない。
  // 回り方の時刻はリールの章とカルーセルの時刻（II 紺屋町はリールの 10:30）。気温は気象庁の盛岡の 1991–2020 平年値
  {
    slug: 'morioka',
    name: 'Morioka',
    nameJa: '盛岡',
    latitude: '39.7° N',
    country: 'Iwate, Japan',
    countryJa: '岩手県',
    person: 'rin',
    issue: 'morioka',
    intro: 'Rin spent one cold, grey November day here: off the morning train, Mount Iwate from the Kaiun bridge, salmon in the river below the bronze finials of Kaminohashi, iron kettles in Konyacho, jajamen at noon, a café window over the Nakatsu river, and the same bridge again at night.',
    introJa: '凛が11月の、くもりの冷たい1日を過ごした街。朝の新幹線で着いて、開運橋から岩手山。上の橋の青銅の擬宝珠の下の川に鮭。紺屋町の鉄瓶、昼のじゃじゃ麺、中津川に面した喫茶店の窓。夜にもう一度、同じ橋へ。',
    images: [
      { file: 'bridge.jpg', alt: 'Rin on the Kaiun bridge in the morning, Mount Iwate at the end of the river', altJa: '朝の開運橋の凛。川の先に岩手山' },
      { file: 'kaminohashi.jpg', alt: 'Rin by a bronze finial on the Kaminohashi bridge', altJa: '上の橋の青銅の擬宝珠のそばの凛' },
      { file: 'konyacho.jpg', alt: 'Rin walking past iron kettles on the shopfronts of Konyacho', altJa: '紺屋町の店先の鉄瓶の前を歩く凛' },
      { file: 'cafe.jpg', alt: 'Rin at a café window over the Nakatsu river, a cup in both hands', altJa: '中津川に面した喫茶店の窓ぎわで、カップを両手で包む凛' },
      { file: 'night.jpg', alt: 'Rin on the Kaminohashi bridge at night, a hand on the wooden rail', altJa: '夜の上の橋で、木の欄干に手を置く凛' },
    ],
    categoryImages: {
      food: { file: 'jajamen.jpg', alt: 'From Rin\'s day: jajamen at a counter', altJa: '凛の1日から：カウンターでじゃじゃ麺' },
      coffee: { file: 'cafe.jpg', alt: 'From Rin\'s day: a cup by the window', altJa: '凛の1日から：窓ぎわのカップ' },
    },
    places: morioka as CityPlace[],
    industries: [
      { key: "nambu-tekki", en: "Nambu ironware", ja: "南部鉄器", about: "Nambu ironware is cast iron from Morioka and Oshu in Iwate, a nationally designated traditional craft. In Morioka it goes back to the seventeenth century, when the Nambu domain brought kettle makers to its castle town; workshops in Konyacho still cast kettles by hand.", aboutJa: "南部鉄器は、岩手の盛岡と奥州で作られる鋳物で、国の伝統的工芸品。盛岡では17世紀、南部藩が城下に釜師を招いたのが始まりとされる。紺屋町には、いまも手で鉄瓶を鋳る工房がある。" },
      { key: "morioka-three-noodles", en: "Morioka's three noodles", ja: "盛岡の三つの麺", about: "Morioka is known for three noodles: wanko soba, mouthfuls of soba poured into your bowl one after another; reimen, a firm cold noodle in beef broth, first served here in 1954; and jajamen, flat noodles with meat miso, finished with chitantan, an egg soup made in the dish you ate from.", aboutJa: "盛岡には三つの麺がある。お椀に次々とそばが入るわんこそば、1954年にこの街で始まった、こしの強い盛岡冷麺、肉みそをのせた平たい麺のじゃじゃ麺。じゃじゃ麺は、食べ終えた皿に卵を溶いて、チータンタンにして締める。" },
      { key: "katazome", en: "Stencil dyeing", ja: "型染め", about: "In Zaimokucho a dye house still makes Nambu kodai katazome: cloth dyed through cut paper stencils, with patterns that go back to the samurai of the Nambu domain.", aboutJa: "材木町では、いまも染元が南部古代型染を作る。切り抜いた型紙を通して布を染める技法で、文様は南部藩の武士の時代にさかのぼる。" },
    ],
    wear: {
      season: 'Late November',
      seasonJa: '11月の終わり',
      facts: [
        { en: 'Around 11°C by day and 2°C at night, with about 86 mm of rain (Morioka, 1991–2020 averages).', ja: '昼は11℃前後、夜は2℃前後。雨は月に86ミリほど（盛岡、1991〜2020年の平年値）。' },
        { en: 'A little snow can fall late in the month. The sun sets at about 16:15.', ja: '月の終わりには、雪が少し降ることもある。日の入りは16時15分ごろ。' },
        { en: 'In October a knit and a light jacket are enough; it is about 18°C by day. In December it is about 4.5°C by day and snow begins to lie; add gloves, a scarf and shoes with grip.', ja: '10月ならニットに軽い上着で足りる。昼は18℃ほど。12月は昼でも4.5℃ほどで、雪が積もり始める。手袋とマフラー、すべりにくい靴を足す。' },
      ],
      looks: [
        { time: '08:16', image: 'train.jpg',
          items: 'A dark charcoal wool shirt jacket with silver snaps and a large black curly shearling collar, turned up; a grey marl crew-neck knit, long taupe flannel barrel trousers, black suede kitten-heel ankle boots, a dark brown suede satchel.',
          itemsJa: '銀のスナップに、黒い巻き毛の大きなシアリングの襟のチャコールのウールのシャツジャケット。襟は立てて。グレーの丸首ニット、長めのトープのフランネルの丸いパンツ、黒いスエードの細いヒールのショートブーツ、こげ茶のスエードの鞄。',
          note: 'Off the train, the collar goes up to the chin.', noteJa: '新幹線を降りたら、襟をあごまで立てる。' },
        { time: '10:45', image: 'kettle.jpg',
          items: 'Inside the shop, the jacket open and the collar down over the shoulders; the knit, with its pointed hem, left out.',
          itemsJa: '店の中では、上着の前を開けて、襟は肩に広げる。とがった裾のニットは外に出したまま。',
          note: 'Indoors, open the front. The knit stays out.', noteJa: '店の中では前を開ける。ニットの裾は出したまま。' },
        { time: '15:00', image: 'cafe.jpg',
          items: 'In the café, the jacket off on the chair; the grey knit on its own.',
          itemsJa: '喫茶店では、上着を脱いで椅子に。グレーのニット一枚。',
          note: 'One jacket for the whole day. Under it, one knit is enough.', noteJa: '上着は一日これ一枚。下はニット一枚で足りる。' },
      ],
    },
    route: [
      { time: '08:16', place: 'Morioka Station', placeJa: '盛岡駅', what: 'Off the morning train from Tokyo.', whatJa: '東京からの朝の新幹線で着く。', image: 'train.jpg', near: ['盛楼閣', '東家 盛岡駅前店', 'KANEIRI STANDARD STORE 盛岡店'] },
      { time: '08:30', place: 'Kaiun Bridge', placeJa: '開運橋', what: 'Mount Iwate at the end of the river.', whatJa: '川の先に岩手山。', image: 'bridge.jpg', near: ['pono books & time', 'Some Blue Coffee'] },
      { time: '08:50', place: 'I Kaminohashi', placeJa: 'I 上の橋', what: 'Looking down at the river beside the bronze finials.', whatJa: '青銅の擬宝珠のそばで、川を見下ろす。', image: 'kaminohashi.jpg' },
      { time: '09:40', place: 'The castle walls', placeJa: '盛岡城跡の石垣', what: 'Under the stone walls of the castle, where no keep stands.', whatJa: '天守のない城跡の、石垣の下。', near: ['食道園'] },
      { time: '10:30', place: 'II Konyacho', placeJa: 'II 紺屋町', what: 'Past the shopfronts of the old street, fingertips brushing an iron kettle.', whatJa: '古い通りの店先を歩く。指先が鉄瓶にふれる。', image: 'konyacho.jpg', near: ['釜定', '老舗 白沢せんべい店', 'shop+space ひめくり', 'cafe & grocery NOOK', 'クラムボン'] },
      { time: '10:45', place: 'An ironware shop', placeJa: '鉄器の店', what: 'Lifting a cold iron kettle with both hands.', whatJa: '冷たい鉄瓶を、両手で持ち上げる。', image: 'kettle.jpg' },
      { time: '12:50', place: 'Jajamen', placeJa: 'じゃじゃ麺', what: 'Jajamen, then an egg stirred into what is left: chitantan.', whatJa: 'じゃじゃ麺。残りに卵を溶いて、チータンタン。', image: 'jajamen.jpg' },
      { time: '13:50', place: 'The riverbed', placeJa: '河原', what: 'On the stones below Kaminohashi, salmon in the shallows.', whatJa: '上の橋の下手の河原。浅瀬に鮭。', image: 'salmon.jpg' },
      { time: '15:00', place: 'III Nakatsu River', placeJa: 'III 中津川', what: 'A window seat in a café over the river, the jacket off.', whatJa: '川に面した喫茶店の窓ぎわ。上着を脱ぐ。', image: 'cafe.jpg' },
      { time: '16:25', place: 'Out of the café', placeJa: '店の外へ', what: 'Out as the lamps come on, the collar held to her throat.', whatJa: '街灯がつき始めたころ、襟をのどへ寄せて店を出る。', image: 'door.jpg' },
      { time: '17:50', place: 'Konyacho, after dark', placeJa: '夜の紺屋町', what: 'Back along the old street after dark.', whatJa: '暗くなった古い通りを戻る。' },
      { time: '18:20', place: 'IV Kaminohashi', placeJa: 'IV 上の橋', what: 'The same bridge at night, a hand on the wooden rail.', whatJa: '夜、同じ橋。木の欄干に手を置く。', image: 'night.jpg' },
    ],
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
    industries: [
      { key: "antiquarian-books", en: "Antiquarian books and bookshops", ja: "古書と本屋", about: "London has long been the centre of British publishing and the rare-book trade. Cecil Court, Bloomsbury and Mayfair still hold dealers with long histories, such as Sotheran's (1761) and Maggs (1850s).", aboutJa: "ロンドンは長くイギリスの出版と古書の商いの中心だった。セシル・コート、ブルームズベリー、メイフェアには、1761年からのソザランズや1850年代からのマッグズのような古い店がいまも残る。" },
      { key: "bespoke-tailoring", en: "Bespoke tailoring and London makers", ja: "仕立てと手仕事の店", about: "Savile Row in Mayfair has been the street of bespoke tailors since the 19th century, and nearby old makers of hats and umbrellas still make and repair by hand on their own premises.", aboutJa: "メイフェアのサヴィル・ロウは19世紀から仕立て屋の通り。近くには、帽子や傘をいまも店の工房で手で作り、直す古い店が残る。" },
    ],
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
    industries: [
      { key: "danish-modern-furniture", en: "Danish modern furniture", ja: "デンマーク・モダンの家具", about: "Danish modern furniture took shape in Copenhagen: Kaare Klint began teaching furniture design at the Royal Danish Academy in 1924, and from 1927 to 1966 the city's Cabinetmakers' Guild held a yearly exhibition where architects and cabinetmakers showed new pieces together. The city still has the makers' showrooms and dealers in original pieces from that time.", aboutJa: "デンマーク・モダンの家具は、コペンハーゲンで形になった。1924年に王立芸術アカデミーでカーレ・クリントが家具の授業を始め、1927年から1966年まで、市の家具職人組合が毎年展示会を開いて、建築家と職人が新しい家具を一緒に見せた。いまも街には、作り手の展示室と、当時の家具を扱う店が残る。" },
    ],
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
    industries: [
      { key: "artistic-perfumery", en: "Artistic perfumery", ja: "香水", about: "Milan hosts Esxence, the international fair of artistic perfumery, every year (its 16th edition was in June 2026). The city has several perfumeries that specialise in niche houses.", aboutJa: "ミラノでは毎年、ニッチな香水の国際見本市「エクセンス」がひらかれる（2026年6月で16回目）。ニッチな香水を専門に扱う店もいくつもある。" },
      { key: "design-furniture", en: "Design furniture", ja: "デザインの家具", about: "Every April Milan holds the Salone del Mobile furniture fair and Design Week, and galleries and showrooms across the city sell 20th-century and contemporary furniture and objects all year.", aboutJa: "ミラノでは毎年4月に家具見本市サローネ・デル・モービレとデザインウィークがひらかれる。街のギャラリーや店は、20世紀からいまの家具と器を一年中売っている。" },
    ],
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
    industries: [
      { key: "scottish-textiles", en: "Tweed, knitwear & kiltmaking", ja: "ツイード・ニット・キルト", about: "Scotland's tweed, tartan and knitwear are known worldwide, and Edinburgh still has kiltmakers, tailors and knitters who cut, sew and knit in the city — one kiltmaker has been here since 1868.", aboutJa: "スコットランドのツイードやタータン、ニットは世界に知られる。エディンバラにはいまも、街の中で布を裁ち、縫い、編むキルト職人や仕立て屋、ニットの工房がある。1868年から続くキルトの店もある。" },
      { key: "whisky", en: "Scotch whisky", ja: "スコッチ・ウイスキー", about: "Leith, Edinburgh's port, was long a centre for storing, blending and bottling Scotch whisky; at one point it is said to have had about a hundred bonded warehouses. Independent bottlers and a new distillery on the quay keep the trade in the city.", aboutJa: "エディンバラの港町リースは、長くスコッチ・ウイスキーを寝かせ、混ぜ合わせ、瓶に詰める場所だった。一時は保税倉庫が100ほどあったとされる。いまも独立系のボトラーや、岸壁の新しい蒸留所がその仕事を続ける。" },
    ],
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
    industries: [
      { key: "record-shops", en: "Record shops", ja: "レコード店", about: "Reykjavík's music scene, from the Sugarcubes onward, is served by small record shops that are often also labels and venues. Smekkleysa (Bad Taste) has run its label since 1986 and 12 Tónar since 1998.", aboutJa: "シュガーキューブス以来のレイキャビクの音楽を、小さなレコード店が支える。店がレーベルやライブの場を兼ねる事が多い。スメクレイサは1986年から、12トゥナルは1998年からレーベルを続ける。" },
      { key: "icelandic-wool", en: "Icelandic wool", ja: "アイスランドの羊毛", about: "Icelandic sheep grow a two-layer fleece, a long water-shedding outer coat and a soft inner one, spun into lopi yarn. The lopapeysa, the round-yoke sweater knitted from it, is still hand-knitted in Iceland.", aboutJa: "アイスランドの羊の毛は、雨をはじく長い外毛と、やわらかい内毛の二層になっている。これを紡いだ糸がロピで、丸ヨークのセーター、ロパペイサは今も国内で手編みされる。" },
    ],
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
  // 2026-11-01 ウィーン（クラーラ・号 vienna）。1日＝1コーデで、服はすべて VUAL のオリジナル。写真は号の静止画（vault.vual.jp outputs/vual-vienna-20261029/stills と data/latitude-recipes/vienna/scenes）を 9:16 に切った物。
  // 回り方の時刻は号の章とカルーセルの時刻。号に書いてある事だけ。
  {
    slug: 'vienna',
    name: 'Vienna',
    nameJa: 'ウィーン',
    latitude: '48.2° N',
    country: 'Austria',
    countryJa: 'オーストリア',
    countryCode: 'AT',
    person: 'klara',
    issue: 'vienna',
    intro: "Klára spent one grey November day here: off the night train at the Hauptbahnhof, Gumpendorfer Strasse in the morning, Otto Wagner's pavilions on Karlsplatz and his Postal Savings Bank, the Ringstrasse at dusk, a tram, and a small bar of onyx and mirrors off Kärntner Strasse at night.",
    introJa: 'クラーラが11月の灰色の1日を過ごした街。夜行列車で中央駅に着いて、朝のグンペンドルファー通り、カールス広場のオットー・ワーグナーの駅舎と、彼の郵便貯金局。夕暮れのリンク通り、路面電車、夜はケルントナー通りから入った、オニキスと鏡の小さなバー。',
    images: [
      { file: 'cafe.jpg', alt: 'Klára passing the window of an old coffee house on Gumpendorfer Strasse', altJa: 'グンペンドルファー通りの古いカフェの窓の前を歩くクラーラ' },
      { file: 'karlsplatz.jpg', alt: "Klára walking past Otto Wagner's pavilion on Karlsplatz", altJa: 'カールス広場のオットー・ワーグナーの駅舎の前を歩くクラーラ' },
      { file: 'postsparkasse.jpg', alt: 'Klára under the glass ceiling of the Postal Savings Bank', altJa: '郵便貯金局のガラスの天井の下に立つクラーラ' },
      { file: 'passage.jpg', alt: 'Klára in a narrow stone passage at night', altJa: '夜の石の細い抜け道のクラーラ' },
      { file: 'bar.jpg', alt: 'Klára in a small bar under a wall of onyx', altJa: 'オニキスの壁の下、小さなバーのクラーラ' },
    ],
    places: vienna as CityPlace[],
    industries: [
      { key: "glass-porcelain-silver", en: "Glass, porcelain and silver", ja: "ガラス・磁器・銀器", about: "Vienna's old court suppliers still make glass, porcelain and silver by hand in the city. Designers of the Wiener Werkstätte era such as Josef Hoffmann and Adolf Loos designed pieces for these workshops.", aboutJa: "宮廷に納めていた工房が、いまも市内でガラス・磁器・銀器を手で作る。ヨーゼフ・ホフマンやアドルフ・ロースなど、ウィーン工房の時代の建築家がこうした工房のために器をデザインした。" },
      { key: "leather-hats-shoes", en: "Leather goods, hats and shoes", ja: "革小物・帽子・靴", about: "Small family workshops in Vienna have made shoes, hats and leather goods by hand for generations, some since the time they supplied the imperial court.", aboutJa: "ウィーンでは、靴・帽子・革小物を手で作る家族の工房が何代も続く。宮廷に納めていた時代からの店もある。" },
    ],
    wear: {
      season: 'November',
      seasonJa: '11月',
      facts: [
        { en: 'Around 9.5°C by day and 5°C at night, with about 40 mm of rain (Innere Stadt, 1991–2020 averages).', ja: '昼は9.5℃前後、夜は5℃前後。雨は月に40ミリほど（インネレ・シュタット、1991〜2020年の平年値）。' },
        { en: 'Skies are often grey, and the sun sets soon after four.', ja: '空は灰色の日が多い。日の入りは4時を少し過ぎたころ。' },
        { en: 'In October a knit and a light coat are enough; it is about 15°C by day. In December it drops to about 5°C by day; add gloves and a hat.', ja: '10月ならニットに軽いコートで足りる。昼は15℃ほど。12月は昼でも5℃ほどになるので、手袋と帽子を足す。' },
      ],
      looks: [
        { time: '08:40', image: 'train.jpg',
          items: 'Under the coat: an off-white turtleneck, a dark brown croc-embossed skirt that narrows at the hem, black tights.',
          itemsJa: 'コートの下は、生成りのタートルネックに、すそへ細くなるこげ茶の型押しのスカート、黒いタイツ。',
          note: 'On the night train the coat comes off. Under it, one knit and one skirt.', noteJa: '夜行列車ではコートを脱ぐ。下はニットとスカートだけ。' },
        { time: '09:00', image: 'cafe.jpg',
          items: 'A long dark brown hooded shearling coat, closed from hem to chin; black suede platform ankle boots, an olive-brown suede top-handle bag.',
          itemsJa: 'こげ茶のフード付きの長いシアリングのコートを、すそからあごまで閉じて。黒いスエードの厚底のショートブーツ、オリーブブラウンのスエードの手提げ。',
          note: 'A grey day. Close it to the chin and walk.', noteJa: '灰色の日。あごまで閉めて歩く。' },
        { time: '17:10', image: 'tram.jpg',
          items: 'The same coat with the hood up.',
          itemsJa: '同じコートで、フードをかぶる。',
          note: 'After dark, the hood. One coat for the whole day.', noteJa: '暗くなったらフード。一日、コートは一枚でいい。' },
      ],
    },
    route: [
      { time: '08:40', place: 'Hauptbahnhof', placeJa: '中央駅', what: 'Off the night train in the morning.', whatJa: '夜行列車で、朝に着く。', image: 'train.jpg', near: ['Café Goldegg'] },
      { time: '09:00', place: 'I Gumpendorfer Strasse', placeJa: 'I グンペンドルファー通り', what: 'Past the window of an old coffee house.', whatJa: '古いカフェの窓の前を通る。', image: 'cafe.jpg', near: ['Café Sperl', 'Gastwirtschaft Steman'] },
      { time: '10:40', place: 'Karlsplatz', placeJa: 'カールス広場', what: "Past Otto Wagner's pavilion of green iron, marble and gold sunflowers.", whatJa: 'オットー・ワーグナーの、緑の鉄と大理石と金のひまわりの駅舎の前を歩く。', image: 'karlsplatz.jpg', near: ['Café Museum', 'Vollpension', 'Feinedinge*'] },
      { time: '12:30', place: 'A sausage stand', placeJa: 'ソーセージの屋台', what: 'Lunch standing up.', whatJa: '昼は立って食べる。', near: ['Bitzinger Würstelstand Albertina'] },
      { time: '14:20', place: 'Postal Savings Bank', placeJa: '郵便貯金局', what: 'Under the glass ceiling of the banking hall.', whatJa: '窓口の広間の、ガラスの天井の下に立つ。', image: 'postsparkasse.jpg', near: ['Café Prückel'] },
      { time: '15:20', place: 'Michaelerplatz', placeJa: 'ミヒャエラー広場', what: 'Leaning on the railing in the square.', whatJa: '広場の柵に手をかける。', image: 'michaelerplatz.jpg', near: ['Demel', "R. Horn's Wien", 'Scheer', 'Zum Schwarzen Kameel'] },
      { time: '16:00', place: 'II Ringstrasse', placeJa: 'II リンク通り', what: 'Along the tram lines as the lamps come on.', whatJa: '灯りがつき始めた、路面電車の線路ぞいを歩く。', image: 'ring.jpg' },
      { time: '17:10', place: 'The tram', placeJa: '路面電車', what: 'Hood up, by a red tram.', whatJa: 'フードをかぶって、赤い路面電車のそばに立つ。', image: 'tram.jpg' },
      { time: '21:40', place: 'III Kärntner Durchgang', placeJa: 'III ケルントナー・ドゥルヒガング', what: 'Down a narrow passage off Kärntner Strasse.', whatJa: 'ケルントナー通りから、細い抜け道に入る。', image: 'passage.jpg', near: ['J. & L. Lobmeyr', 'Wiener Porzellanmanufaktur Augarten'] },
      { time: '22:40', place: 'A small bar', placeJa: '小さなバー', what: 'Onyx above the door, mirrors on the walls.', whatJa: '戸の上にオニキス、壁には鏡。', image: 'bar.jpg' },
      { time: '23:20', place: 'The hotel', placeJa: 'ホテル', what: 'Boots off in the room.', whatJa: '部屋で、ブーツを脱ぐ。' },
    ],
  },
  // 2026-11-01 ハワース（メイヴ・号 haworth）。小さな村なので、店は村と、メイヴが乗ったワース・ヴァレー線の沿線（キースリー・オクセンホープ）から。服はすべて VUAL のオリジナル。
  // 写真は号の静止画（vault.vual.jp outputs/vual-maeve-20261031/stills と data/latitude-recipes/haworth/scenes）を 9:16 に切った物。駅（字の入った看板）と墓地（墓石の刻字）の絵は使っていない
  {
    slug: 'haworth',
    name: 'Haworth',
    nameJa: 'ハワース',
    latitude: '53.8° N',
    country: 'West Yorkshire, England',
    countryJa: 'イギリス・ウェスト・ヨークシャー',
    countryCode: 'GB',
    person: 'maeve',
    issue: 'haworth',
    intro: 'Maeve spent one November Saturday here, in a west wind: the valley line from Keighley, the steep cobbles of Main Street, the churchyard by the Brontë parsonage, the moor to Top Withens, and a fire at the inn.',
    introJa: 'メイヴが11月の土曜日を過ごした村。強い西風の日。キースリーからの谷の鉄道、急な石畳のメイン・ストリート、ブロンテ家の牧師館の隣の墓地、荒野を歩いてトップ・ウィゼンズまで。最後は宿の暖炉のそば。',
    images: [
      { file: 'train.jpg', alt: 'Maeve by the window of a carriage on the Worth Valley line', altJa: 'ワース・ヴァレー線の客車の窓ぎわのメイヴ' },
      { file: 'main-street.jpg', alt: 'Maeve buttoning her coat on the cobbles of Main Street', altJa: 'メイン・ストリートの石畳で、コートのボタンを留めるメイヴ' },
      { file: 'moor.jpg', alt: 'A small figure crossing the heather on the moor', altJa: '荒野のヒースを横切るメイヴ' },
      { file: 'withens.jpg', alt: 'Maeve in the doorway of the ruin at Top Withens', altJa: 'トップ・ウィゼンズの廃屋の戸口に立つメイヴ' },
      { file: 'fire.jpg', alt: 'Maeve by the fire at the inn', altJa: '宿の暖炉のそばのメイヴ' },
    ],
    places: haworth as CityPlace[],
    industries: [
      { key: "bookshops", en: "Bookshops", ja: "本屋", about: "Haworth is the village where the Brontë sisters lived and wrote. The literary visitors who come for them keep independent bookshops going on Main Street, among them a second-hand dealer trading since 1988.", aboutJa: "ブロンテ姉妹が暮らし、小説を書いた村。姉妹を目当てに来る人に支えられ、メイン・ストリートに個人の本屋が続く。1988年からの古本屋もある。" },
      { key: "brewing", en: "Brewing", ja: "ビール醸造", about: "Timothy Taylor's has brewed cask ale in Keighley, where the Worth Valley line begins, since 1858, and at Knowle Spring since 1863. The family brewery's pubs run up the valley to Haworth's Main Street.", aboutJa: "ワース・ヴァレー線の起点キースリーで、ティモシー・テイラーが1858年からカスクエールを造る。1863年からはノウル・スプリングの醸造所で。この醸造所のパブが、谷を上ってハワースのメイン・ストリートまで続く。" },
    ],
    wear: {
      season: 'November',
      seasonJa: '11月',
      facts: [
        { en: 'At Bingley, the nearest long record, November averages 8.5°C by day and 3.5°C at night, with about 110 mm of rain (1991–2020).', ja: 'いちばん近いビングリーの観測では、11月は昼8.5℃前後、夜3.5℃前後。雨は月に110ミリほど（1991〜2020年の平年値）。' },
        { en: 'On the moor the wind is stronger, and the light goes around four.', ja: '荒野は村より風が強い。4時ごろには暗くなる。' },
        { en: 'In October a jacket over a knit is enough; it is about 12°C by day. In December it is about 6°C by day; add a scarf and gloves for the moor.', ja: '10月ならニットにジャケットで足りる。昼は12℃ほど。12月は昼でも6℃ほど。荒野へはマフラーと手袋を足す。' },
      ],
      looks: [
        { time: '09:25', image: 'main-street.jpg',
          items: 'A long black leather coat with a stand collar, buttoned to the top; taupe flannel barrel trousers, black patent penny loafers with black socks.',
          itemsJa: '立ち襟の黒い革のロングコートを、いちばん上まで留めて。トープのフランネルの丸いシルエットのパンツ、黒い靴下に黒いエナメルのペニーローファー。',
          note: 'The wind comes up the hill. Button it to the collar.', noteJa: '風が坂を上がってくる。襟まで留める。' },
        { time: '13:10', image: 'reading.jpg',
          items: 'Out of the wind, the coat open over a grey cashmere shirt; an olive-brown suede top-handle bag.',
          itemsJa: '風のあたらない所では、コートの前を開けて。中はグレーのカシミヤのシャツ。オリーブブラウンのスエードの手提げ。',
          note: 'Behind a wall on the moor, the coat can open.', noteJa: '荒野でも、壁の陰ならコートを開けられる。' },
        { time: '16:20', image: 'fire.jpg',
          items: 'By the fire, the same coat worn open.',
          itemsJa: '暖炉のそばでは、同じコートを開けたまま。',
          note: 'One coat for the train, the moor and the inn.', noteJa: '列車も、荒野も、宿も、このコート一枚。' },
      ],
    },
    route: [
      { time: '08:40', place: 'The valley line', placeJa: '谷の鉄道（ワース・ヴァレー線）', what: 'By the window of an old carriage, up the valley from Keighley.', whatJa: 'キースリーから谷を上る、古い客車の窓ぎわ。', image: 'train.jpg', near: ['The Old Parcels Office', "Taylor's on the Green", 'The Boltmakers Arms'] },
      { time: '09:05', place: 'Haworth station', placeJa: 'ハワース駅', what: 'Off the train at the line\'s headquarters.', whatJa: 'この鉄道の本部がある駅で降りる。', near: ['The Royal Oak'] },
      { time: '09:25', place: 'Main Street', placeJa: 'メイン・ストリート', what: 'Up the steep cobbles, buttoning the coat.', whatJa: 'コートのボタンを留めながら、急な石畳を上る。', image: 'main-street.jpg', near: ['Hatchard & Daughters', 'Wave of Nostalgia', "Mrs Beighton's Sweet Shop", 'Hunters of Haworth', 'The Fleece Inn', 'Pavé Charcuterie and Bistro'] },
      { time: '09:50', place: 'I Churchyard', placeJa: 'I 墓地', what: 'Among the flat gravestones beside the parsonage.', whatJa: '牧師館の隣、平らに並ぶ墓石のあいだ。' },
      { time: '12:30', place: 'II The moor', placeJa: 'II 荒野', what: 'Across the heather in the west wind.', whatJa: '西風の中、ヒースの荒野を横切る。', image: 'moor.jpg' },
      { time: '13:10', place: 'Top Withens', placeJa: 'トップ・ウィゼンズ', what: 'A book open, her back to the ruined wall.', whatJa: '廃屋の壁に背をあずけて、本を開く。', image: 'reading.jpg' },
      { time: '16:00', place: 'III The inn', placeJa: 'III 宿', what: 'Through the old door as the light goes.', whatJa: '暗くなるころ、古い戸を開ける。', image: 'inn.jpg' },
      { time: '16:20', place: 'By the fire', placeJa: '暖炉のそば', what: 'Standing by the fire, the coat still on.', whatJa: 'コートを着たまま、暖炉のそばに立つ。', image: 'fire.jpg' },
    ],
  },
  // 2026-11-09 店は agy（Gemini 3.8 Flash）で集めて確かめ、Haiku が迷った店と抜き取りを確認。文は AG の Sonnet の下書き（vault outputs/latitude-places-20261109）
  {
    slug: 'reggio',
    name: 'Reggio Calabria',
    nameJa: 'レッジョ・カラブリア',
    latitude: '38.1° N',
    country: 'Calabria, Italy',
    countryJa: 'イタリア・カラブリア',
    countryCode: 'IT',
    person: 'helene',
    issue: 'reggio',
    coords: [38.11, 15.65],
    intro: 'Hélène spent one dry, sunny November day here, in a sea wind: the bergamot groves of the Ionian coast, the coast train, a bar at lunchtime, the seafront on the Strait of Messina, and a quiet room at night.',
    introJa: 'エレーヌが11月の晴れた乾いた日を過ごした街。海風の日。イオニア海側のベルガモット畑、海沿いの列車、昼のバー、メッシーナ海峡に面した海岸通り。夜は静かな部屋で。',
    images: [
      { file: 'station.jpg', alt: 'Hélène on the platform at Bova Marina, the train leaving behind her', altJa: 'ボーヴァ・マリーナの駅のホームのエレーヌ。後ろを列車が出ていく' },
      { file: 'grove.jpg', alt: 'Hélène choosing a bergamot from a harvest crate in the grove', altJa: 'ベルガモット畑で、収穫箱の実を選ぶエレーヌ' },
      { file: 'bar.jpg', alt: 'Hélène at the counter of an old bar on Corso Garibaldi', altJa: 'コルソ・ガリバルディの古いバールのカウンターのエレーヌ' },
      { file: 'lungomare.jpg', alt: 'Hélène on the seafront at sunset, Sicily across the strait', altJa: '日没の海岸通りのエレーヌ。海峡の向こうにシチリア' },
      { file: 'room.jpg', alt: 'Hélène sitting on the edge of the bed, one boot off', altJa: 'ベッドの端に座るエレーヌ。ブーツを片方脱いで' },
    ],
    places: reggio as CityPlace[],
    industries: [
      { key: "bergamot", en: "Bergamot", ja: "ベルガモット", about: "Bergamot, the citrus behind Earl Grey tea and many perfumes, is grown almost only on a short strip of coast in the province of Reggio Calabria. The city has a museum of bergamot, and shops and bars that cook and brew with it.", aboutJa: "紅茶のアールグレイや、多くの香水の元になる柑橘。ほとんどが、レッジョ・カラブリア県の短い海沿いの帯でだけ育つ。街にはベルガモットの博物館があり、店やバーもこの実を料理や酒に使う。" },
    ],
  },
  // 2026-11-09 店は agy（Gemini 3.8 Flash）で集めて確かめ、Haiku が迷った店と抜き取りを確認。文は AG の Sonnet の下書き（vault outputs/latitude-places-20261109）
  {
    slug: 'faro',
    name: 'Fårö',
    nameJa: 'フォーレ島',
    latitude: '57.9° N',
    country: 'Gotland, Sweden',
    countryJa: 'スウェーデン・ゴットランド',
    countryCode: 'SE',
    person: 'solveig',
    issue: 'faro',
    intro: 'Solveig spent one November day here, in the wind from the Baltic: the six-minute ferry from Fårösund, the limestone raukar at Langhammars, Fårö church, Holmudden, and a fire in a fishermen\'s hut at Helgumannen.',
    introJa: 'ソルヴェイが11月の1日を過ごした島。バルト海からの風の日。フォーレスンドから6分のフェリー、ラングハンマルスの石灰岩の岩柱、フォーレ教会、ホルムッデン。最後は、ヘルグマンネンの漁師小屋の火のそば。',
    images: [
      { file: 'bun.jpg', alt: 'Solveig with a cardamom bun by the ferry at Fårösund', altJa: 'フォーレスンドのフェリーのそばで、カルダモンのパンを持つソルヴェイ' },
      { file: 'rauk.jpg', alt: 'Solveig sitting by a limestone rauk at Langhammars', altJa: 'ラングハンマルスの石灰岩の岩柱のそばに座るソルヴェイ' },
      { file: 'sheep.jpg', alt: 'Solveig by a stone wall with sheep', altJa: '石垣のそばで羊と並ぶソルヴェイ' },
      { file: 'cafe.jpg', alt: 'Solveig with a cup of coffee at a window table', altJa: '窓ぎわの席でコーヒーを持つソルヴェイ' },
      { file: 'fire.jpg', alt: 'Solveig feeding the stove in the fishermen\'s hut at Helgumannen', altJa: 'ヘルグマンネンの漁師小屋で、ストーブに薪をくべるソルヴェイ' },
    ],
    places: faro as CityPlace[],
    industries: [
      { key: "gotland-food", en: "Gotland food", ja: "ゴットランドの郷土食", about: "Gotland saffron pancake (saffranspannkaka) is baked with milk and rice and served with salmbär, a dewberry jam. The cottage café in the Bunge open-air museum serves it.", aboutJa: "ゴットランドのサフランパンケーキは、牛乳と米で焼き、サルムベリ（ブラックベリーの仲間）のジャムを添える。ブンゲ野外博物館の中の小屋のカフェで出している。" },
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

// 2026-11-01 店の並びの「節」。その街ならではの産業（industries の順）を先に、そのあと飲食と器の種類。
// 節の key がそのまま種類のページの URL（/latitude/places/<街>/<key>）になる。
// 産業ごとにページを分けるのは、「金沢 金箔」「ウィーン 帽子」のように産業の名前で調べる人が多く、1ページ1つの言葉の方が検索で合うため。
export const CATEGORY_ORDER: Exclude<PlaceCategory, 'local'>[] = ['matcha', 'sweets', 'food', 'coffee', 'craft'];
const RESERVED = new Set<string>([...CATEGORY_ORDER, 'local', 'area']);
export type PlaceSection = {
  key: string;
  kind: 'industry' | 'category';
  category: PlaceCategory;
  label: { en: string; ja: string };
  about?: { en: string; ja: string };
  items: CityPlace[];
};
export function sectionsOf(c: LatitudeCity, places: CityPlace[] = c.places): PlaceSection[] {
  const out: PlaceSection[] = [];
  const known = new Set<string>();
  for (const ind of c.industries ?? []) {
    if (RESERVED.has(ind.key)) continue; // 種類や地区のページと URL がぶつかる key は使わない
    known.add(ind.key);
    const items = places.filter((x) => x.category === 'local' && x.industry === ind.key);
    if (items.length) out.push({ key: ind.key, kind: 'industry', category: 'local', label: { en: ind.en, ja: ind.ja }, about: { en: ind.about, ja: ind.aboutJa }, items });
  }
  // 産業が書かれていない local の店（念のため）は「この街の仕事」にまとめる
  const rest = places.filter((x) => x.category === 'local' && !known.has(x.industry ?? ''));
  if (rest.length) out.push({ key: 'local', kind: 'category', category: 'local', label: CATEGORY_LABEL.local, items: rest });
  for (const k of CATEGORY_ORDER) {
    const items = places.filter((x) => x.category === k);
    if (items.length) out.push({ key: k, kind: 'category', category: k, label: CATEGORY_LABEL[k], items });
  }
  return out;
}
export const getSection = (c: LatitudeCity, key: string) => sectionsOf(c).find((s) => s.key === key);
