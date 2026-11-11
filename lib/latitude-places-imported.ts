// 自動で作るファイル（scripts/latitude-import-city.py）。手で直さない：文は data/latitude-import/<町>.json を直して、台本を回し直す。
// 号のない町の「街の案内」。店は編集部が2026年の営業を確かめた物（keep）だけ。凛のおすすめで、凛が訪ねたとは書かない。
import type { CityPlace, CitySight, LatitudeCity } from './latitude-places';
import hagiPlaces from './latitude-places/hagi.json';
import hagiSights from './latitude-sights/hagi.json';
import hakodatePlaces from './latitude-places/hakodate.json';
import hakodateSights from './latitude-sights/hakodate.json';
import takayamaPlaces from './latitude-places/takayama.json';
import takayamaSights from './latitude-sights/takayama.json';

export const IMPORTED_CITIES: LatitudeCity[] = [
  {
    slug: "hagi",
    name: "Hagi",
    nameJa: "萩",
    latitude: "34.4° N",
    country: "Yamaguchi, Japan",
    countryJa: "山口県",
    person: "rin",
    coords: [34.4135, 131.4015],
    intro: "A former castle town of the Mori lords on the Sea of Japan. Hagi-yaki kilns, yakinuki kamaboko makers, and sweets and coffee in the old castle town and the port quarter of Hamasaki, as Rin's picks.",
    introJa: "日本海に面した、毛利家の城下町だった町。萩焼の窯元と、焼き抜き蒲鉾の店、城下町と港町・浜崎の甘味と喫茶を、凛のおすすめで。",
    images: [],
    locator: {"en": "On the Sea of Japan coast · a town on a river delta", "ja": "日本海側・川にはさまれた三角州の町"},
    industries: [
      {"key": "hagi-yaki", "en": "Hagi-yaki pottery", "ja": "萩焼", "about": "Hagi-yaki began with the kilns of the Mori domain about four hundred years ago and is a nationally designated traditional craft. The soft clay takes in tea and sake, so a piece changes colour and character as it is used.", "aboutJa": "萩焼は、萩藩・毛利家の御用窯から始まり、400年ほど続く焼き物で、国の伝統的工芸品。土がやわらかく水を吸うので、使ううちに茶や酒がしみて、色や表情が変わっていく。"},
      {"key": "yakinuki-kamaboko", "en": "Yakinuki kamaboko fish cake", "ja": "焼き抜きかまぼこ", "about": "Hagi's yakinuki kamaboko is not steamed but roasted slowly from beneath its wooden board, mostly from lizardfish (eso). It comes out firmer and more fish-flavoured than steamed kamaboko.", "aboutJa": "萩の焼き抜き蒲鉾は、蒸さずに、板の下からじっくり焼いて仕上げる。主な魚はエソ。蒸した蒲鉾より弾力が強く、魚の味が濃い。"},
    ],
    shopMap: true,
    routeBuilder: true,
    places: hagiPlaces as CityPlace[],
    sights: hagiSights as CitySight[],
  },
  {
    slug: "hakodate",
    name: "Hakodate",
    nameJa: "函館",
    latitude: "41.8° N",
    country: "Hokkaido, Japan",
    countryJa: "北海道",
    person: "rin",
    coords: [41.7645, 140.716],
    intro: "A town of slopes and a harbour. Shops in old merchant houses and storehouses in the Seibu district, and coffee and chocolate around Goryokaku — Rin’s picks.",
    introJa: "坂と港の町。古い商家や蔵を生かした西部地区の店と、五稜郭のまわりの喫茶とショコラを、凛のおすすめで。",
    images: [],
    locator: {"en": "At the southern tip of the island, on the Tsugaru Strait", "ja": "島の南の端・津軽海峡に面した港町"},
    industries: [
      {"key": "treaty-port-charcuterie", "en": "Hams and sausages", "ja": "ハムとソーセージ", "about": "In 1925 Carl Raymon, a master butcher born in Bohemia, opened a ham shop in front of Hakodate station. After the war he started again beside his house in Motomachi. A Hakodate company still makes hams and sausages by his German methods, and his old factory site in Motomachi holds a shop and a small museum.", "aboutJa": "1925年、ボヘミア生まれの食肉加工のマイスター、カール・レイモンが函館駅前にハムの店を開いた。戦後は元町の自宅の横で作りを再開した。その製法はいまも函館の会社が受け継ぎ、元町の工場の跡には店と歴史展示館がある。"},
    ],
    shopMap: true,
    routeBuilder: true,
    places: hakodatePlaces as CityPlace[],
    sights: hakodateSights as CitySight[],
  },
  {
    slug: "takayama",
    name: "Takayama",
    nameJa: "高山",
    latitude: "36.1° N",
    country: "Gifu, Japan",
    countryJa: "岐阜県",
    person: "rin",
    coords: [36.14073, 137.25953],
    intro: "A town in the Hida mountains on the Miyagawa river. Shunkei lacquer and solid-wood furniture, the sake brewers of the old merchant streets, then coffee, bread and soba: Rin's picks.",
    introJa: "飛騨の山あい、宮川のほとりの町。春慶塗と木の家具、古い町並みの造り酒屋、それから喫茶とパンとそばを、凛のおすすめで。",
    images: [],
    locator: {"en": "In the Hida mountains · on the Miyagawa river", "ja": "飛騨の山あい・宮川のほとり"},
    industries: [
      {"key": "hida-woodwork", "en": "Hida woodwork and lacquer", "ja": "飛騨の木工・漆器", "about": "Hida Shunkei is a lacquerware brushed with clear amber urushi so the grain of the wood shows through; it is a nationally designated traditional craft. Furniture makers such as Nissin Mokko, founded in 1946, still make solid-wood chairs and tables in Takayama.", "aboutJa": "飛騨春慶は、透けた琥珀色の漆を塗って木目を見せる漆器で、国の伝統的工芸品。高山では、1946年創業の日進木工などの家具の会社が、いまも無垢材の椅子やテーブルを作る。"},
      {"key": "sake-brewing", "en": "Sake brewing", "ja": "飛騨高山の酒造り", "about": "In the old merchant streets of Sanmachi, sake breweries founded between the late Edo period and the Meiji era still brew, marked by balls of cedar hung under the eaves. They use local Hidahomare rice and brew through the cold Hida winter.", "aboutJa": "三町の古い町並みには、江戸の末から明治に始まった造り酒屋が今も残り、軒先に杉の葉の玉「酒ばやし」が下がる。地元の酒米ひだほまれを使い、飛騨の寒い冬に仕込む。"},
    ],
    shopMap: true,
    routeBuilder: true,
    places: takayamaPlaces as CityPlace[],
    sights: takayamaSights as CitySight[],
  },
];
