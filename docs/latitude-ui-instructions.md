# LATITUDE UI 改善 指示書

作成: 2026-11-14 ／ 対象: `vual.jp/latitude` 以下すべて
基準にしたコード: `origin/main` の `6a110e6`（行番号はこの時点のもの。ずれていたら近くを探す）

この指示書は、実装する人（AI）が**判断せずに手を動かせる**ように書いてある。
迷ったら勝手に決めず、オーナーに聞くこと。

## いまの状態（2026-11-15）

**main に入って、vual.jp に公開済み**

| 段階 | 中身 | main のコミット |
|---|---|---|
| ① 基礎直し | ①-1〜①-6 | `6bc55bd` まで |
| ② 街のページ（前半） | ②-1〜②-4、②-9 | `7caaa5d` まで |
| ② 街のページ（後半） | ②-5〜②-8 | `b080174` まで |
| ③-3 検索 | `/latitude/places` の頭の検索欄 | `3911c3d` まで |
| ③-2 保存と共有、③-1 現在地 | `/latitude/saved`、地図の「現在地」 | `c96f7a3` まで |
| ③-5 の一部 | 写真を外すコマンド、外した記録、連絡先の1文 | `f2565ba` まで |

**残っているもの**

- **実機での確認**（iPhone / Android）。本物の GPS、共有の画面、Safari での明朝体。まだ誰も見ていない。
- **③-6 営業時間などのデータ**（編集の作業。入れ物は ②-4 で用意済み）。
- **③-4 中国語・韓国語**（別に計画を立てる）。
- **③-5 の残り**: 写真の出どころの URL の記録が無い。公式サイトの写真を取りこんだスクリプトが、どのリポジトリにも無い。
- **写真を本当に消す動き**（`scripts/latitude-photo-takedown.mjs --yes`）は、まだ一度も実行していない。初めて使う時は、`--yes` なしで中身を確かめてから。
- 小さな残り: 金沢で最初の店まで 5.3画面（目標は5）／長崎などピンが固まった街は2回押し／幅320でトップが少し横にはみ出す／号のページの「凛に聞く」には質問の例が無い／日本のページの検索向けの説明文には、まだ58の町名が並んでいる。

**分かったこと（次に触る人へ）**

- 店の id は英語の店名から作る（`placeAnchor`）。英語の店名を変えると、検索の飛び先・保存した店・共有リンクからその店が外れる。
- 店の写真の対応表（`lib/latitude-shop-photos.json`）は日本語の店名が鍵。店名を変えると写真が外れる。
- 手元の AI の鍵では「凛に聞く」の返事が返らない（502）。返事は本番で確かめる。

---

## 0. 最初に読むこと

### 0-1. 目的

LATITUDE は中身（編集部が確かめた店、1日の回り方、何を着るか）は強い。
弱いのは「旅先でスマホ片手に使う道具」としての使いやすさ。
**雑誌の見た目は変えずに**、字・ボタン・たどり着きやすさを直す。

判断に迷ったときの優先順位:
1. 訪日客がスマホで使いやすいか
2. 日本人が Google マップより便利と感じるか
3. 雑誌としての静けさを壊していないか

### 0-2. 作業の決まり

1. **`origin/main` から新しいブランチを切る**。手元の `fix/admin-api-auth` は main より90コミット古く、未コミットの変更が多い。そこでは作業しない。worktree を使うのが安全。
2. この指示書は main に入っていない（未コミット）。worktree で作業するときは、このファイルを読める場所に置いてから始める。
3. Vercel の Preview ビルドは環境変数の不足で落ちる。確認は `npm run dev`（`http://localhost:3000/ja/latitude`）で行う。
4. **push・main へのマージは、オーナーの許可をもらってから**。
5. 段階（①②③）ごとにブランチと PR を分ける。1つの直しごとに小さくコミットする。
6. `app/layout.tsx` と `app/globals.css` は VUAL 全体に効く。指示にある所以外は触らない。
7. `app/api/ai/gemini-image/prompt-builder.ts` は触らない（別リポジトリの VAULT が使っている）。

### 0-3. 覆してはいけない、過去の決定

コードの中に日付つきのコメントで残っている、オーナーの決定。**直しのついでに戻さないこと。**

| 決定 | 場所 |
|---|---|
| 店と回り方は**横に流す**（「縦スクロールが多すぎる」から） | `HScroller.tsx`、`CityPlaces.tsx` の `PlaceRow` |
| スマホで**6人の名前が1行**に収まる | `app/[locale]/latitude/page.tsx` の People |
| People / Places は**カプセル形のトグル** | `Latitude.tsx` の `PeoplePlacesToggle` |
| トップの Places は号のある街だけ並べ、残りは数を1行で | `app/[locale]/latitude/page.tsx` |
| 日本は号のある町だけ行で出し、ほかは「旅人のおすすめの町」にしまう | `PlaceLists.tsx` |
| 回り方では「旅人がその店に行った」と書かない（「近くの、おすすめ」） | `CityGuideExtras.tsx` |
| 編集長のページへの入口は「この雑誌について」の1か所だけ | トップの footer |
| **字は全部サーバーで描く**（検索と AI のチャットが読む）。隠しても HTML には残す | 各所 |

### 0-3b. 2026-11-14 に変わった決定：店の写真

**前の決まり**: 店の写真は、店からもらったものだけ。
**新しい方針（オーナー決定 2026-11-14）**: 店の写真を使う。**店から苦情が来たときだけ、その写真の使用をすぐに止める。**

コードのコメント（`lib/latitude-places.ts` の `photo` の説明、`CityPlaces.tsx` の「店の写真は載せない決まり」）は古い決まりのまま。実装するときに、日付を付けて新しい方針に書き直すこと。
やり方は ③-5 に書いてある。

変わらない決まり:
- **号の場面（AI で作った旅人の写真）を、店の写真として使わない**。その店で撮ったように見えてしまうため。
- 写真を加工して別物にしない（透かしやロゴを消さない、AI で描き足さない）。

### 0-4. 作ってはいけないもの

- **店の事実を推測で書かない**。営業時間・定休日・予約・支払い方法などは、データに無ければ出さない。
- 既にある日本語・英語の文章を書き換えない。新しく足す文言は、この指示書に書いてあるものだけ。
- 新しいライブラリを足さない（地図ライブラリも使っていない。今の作りのまま）。

### 0-5. 直すたびに確認すること

1. `npx tsc --noEmit` と `npm run lint` が通る。
2. ブラウザで**スマホ幅 375×812** と **PC幅 1440×900** の両方を見る。日本語版と英語版の両方。
3. 見るページ（最低限）:
   - `/ja/latitude`、`/en/latitude`
   - `/ja/latitude/places`、`/en/latitude/places/japan`
   - `/ja/latitude/places/kanazawa`、`/en/latitude/places/kanazawa`（映像・回り方・ルート作成がある、いちばん長い街）
   - `/en/latitude/places/takayama`（映像のない町）
   - `/en/latitude/places/kanazawa/food`
   - `/en/latitude/kanazawa`（号）、`/en/latitude/people/rin`
4. 下の「計測スクリプト」をブラウザのコンソールで流し、数字を PR に書く。

#### 計測スクリプト

```js
(() => {
  const m = new Map(); let total = 0;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) {
    const t = n.textContent.trim(); if (!t) continue;
    const el = n.parentElement; const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const k = Math.round(parseFloat(getComputedStyle(el).fontSize));
    m.set(k, (m.get(k) || 0) + t.length); total += t.length;
  }
  const pct = (max) => (100 * [...m].filter(([k]) => k <= max).reduce((s, [, v]) => s + v, 0) / total).toFixed(1) + '%';
  const taps = [...document.querySelectorAll('a,button,summary')].filter((e) => e.getBoundingClientRect().height > 0);
  const low = taps.filter((e) => e.getBoundingClientRect().height < 44);
  return {
    lang: document.documentElement.lang,
    screens: (document.documentElement.scrollHeight / innerHeight).toFixed(1),
    'text<=10px': pct(10), 'text<=12px': pct(12),
    taps: taps.length, 'taps<44px': low.length,
    lowExamples: low.slice(0, 15).map((e) => (e.textContent.trim().slice(0, 18) || e.getAttribute('aria-label')) + ' ' + Math.round(e.getBoundingClientRect().height)),
  };
})();
```

#### いまの数字（2026-11-14、スマホ幅375）

| ページ | 12px以下の字 | 押せる所のうち32px未満 | 長さ |
|---|---|---|---|
| トップ（英語） | 約45% | 61のうち46 | 3.5画面 |
| 金沢の街案内（英語） | 約32% | 296のうち265 | 14.8画面（最初の店は7.9画面め） |
| 号・金沢（英語） | 43% | 63のうち23 | 7.9画面 |
| 日本（英語） | 30% | 276のうち205 | 6.9画面 |

---

## ① 基礎直し（見た目の印象は変えない）

合格の目安（スマホ幅、上の確認ページすべてで）:
- `<html lang>` が `ja` / `en` で入っている
- 10px以下の字が 0%（地図の緯度の目盛りだけ例外）
- 11px以下の字が 5% 未満（2026-11-14 訂正：はじめ「12px以下が15%未満」と書いたが、英語のラベルを12pxと決めたこの指示書自身と矛盾していた）
- 高さ44px未満の押せる所が、地図のピンと本文中のリンクを除いて 0
  （2026-11-14 追記：①-5 の一覧にもれがあった。道しるべ、回り方の「地図で見る ↑」「号を読む →」、「もう一度見る」、トップの「地図で見る →」と「ほか…の街の案内」、人物ページの町名、地図の種類の切り替え、People / Places の左右。これらも同じやり方で広げる）

### ①-1. ページの言語を指定する

**なぜ**: いま `<html>` に言語の指定がない。中国語圏のスマホで漢字が中国の字形になるおそれがあり、読み上げや自動翻訳も誤る。

**どこ**: `app/layout.tsx` 95行め `<html suppressHydrationWarning>`

**どうする**:
- `RootLayout` を `async` にし、`generateMetadata` と同じく `headers()` の `x-next-intl-locale` を読む。
- `<html lang={locale === 'en' ? 'en' : 'ja'} suppressHydrationWarning>` にする。
- ほかの行は触らない。

**確認**: `curl -s localhost:3000/en/latitude | grep -o '<html[^>]*>'` が `lang="en"`、`/ja/` が `lang="ja"`。VUAL のトップ（`/ja`、`/en`）と `/ja/admin` も崩れていないこと。

### ①-2. 色と書体を1か所にまとめる

**なぜ**: 灰色 `#78746c` が9ファイルに直書きされ（墨と紙の色も含めると16ファイル）、明朝の指定も5ファイルにばらばらにある。1か所にしないと直しもれが出る。

**どうする**:
1. `lib/latitude-theme.ts` を新しく作る（`'use client'` を付けない、ただの定数）。
   ```ts
   export const PAPER = '#f2eee7';
   export const INK = '#1e1d1b';
   export const MUTE = '#5f5b54'; // 旧 #78746c。紙の色との濃淡差 4.0 → 5.8
   const JA_MINCHO = '"Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "Noto Serif JP", "Noto Serif CJK JP"';
   export const SERIF = `var(--font-playfair), "Didot", "Bodoni 72", Georgia, ${JA_MINCHO}, serif`;
   export const MINCHO = `${JA_MINCHO}, serif`;
   ```
2. `components/latitude/Latitude.tsx` 10〜13行めの定数を消し、`export { PAPER, INK, MUTE, SERIF, MINCHO } from '@/lib/latitude-theme';` にする（ほかのファイルの import を壊さないため）。
3. 次のファイルの直書き（`#78746c` `#1e1d1b` `#f2eee7`）を、`@/lib/latitude-theme` からの import に替える:
   `HScroller.tsx` `TrackLink.tsx` `CopyText.tsx` `RoomChat.tsx` `RoomCam.tsx` `AskTraveller.tsx` `TravellerMap.tsx` `RouteBuilderPanel.tsx` `PlacesMap.tsx` `PagesViewer.tsx` `HiddenBits.tsx` `CityShopMap.tsx` `CityRouteMap.tsx` `CityLocator.tsx`、`app/[locale]/latitude/[slug]/page.tsx`、`[slug]/notes/page.tsx`
4. `MINCHO` を自前で定義している5ファイルから定義を消し、import に替える:
   `app/[locale]/latitude/page.tsx`（35行め）、`press/page.tsx`、`about/page.tsx`、`editor/page.tsx`、`[slug]/notes/page.tsx`。
   `[slug]/page.tsx` 265行めの直書きの明朝も `MINCHO` に替える。
5. `Latitude.tsx` の `IssueStrip`、号のリンクの `opacity: on ? 1 : 0.8` を消す（灰色がさらに薄くなっているため）。

**確認**: `grep -rn "78746c" components/latitude app lib` が `latitude-theme.ts` のコメント1行だけ。地図（トップ・場所・街）の線や点が濃くなりすぎていないか目で見る。濃すぎる線があれば、その線だけ元の色を `const LINE_MUTE = '#78746c'` として残す。

**やらないこと**: 日本語の Web フォント（Noto Serif JP など）の読み込みは、ページが重くなるのでここではしない。Android で明朝にならないのは既知。入れるかどうかはオーナーに聞く。

### ①-3. 小さい見出し（ラベル）を読める大きさにする

**なぜ**: 10px・字間0.3〜0.35em のラベルが121か所ある。日本語だと字がばらけて読めない。

**どうする**:
1. `app/globals.css` の最後に、LATITUDE 用のクラスを足す（`lat-` で始まる名前だけ）。
   ```css
   /* LATITUDE の小さい見出し。英語は大文字で字間を広く、日本語は少し大きく字間を詰める */
   .lat-label { font-size: 12px; line-height: 1.5; letter-spacing: 0.2em; text-transform: uppercase; }
   .lat-label:lang(ja) { font-size: 13px; letter-spacing: 0.08em; }
   ```
2. `Latitude.tsx` の `SectionLabel`（204〜210行め）を `className="lat-label mb-8"` にする。これで全ページの見出しが直る。
3. 同じ役目のラベルを `lat-label` に替える（`text-[10px] uppercase tracking-[0.3em]` などを消して `lat-label` に）:
   - `places/[city]/page.tsx`: 道しるべ（181・189行め）、国名（197行め）、「地区から」（293行め）、見る所の種類と地区（312行め）
   - `CityPlaces.tsx`: 地区名（60・190行め）、「〇〇ならでは」（36・170行め）、「凛の1日から」（48・213行め）
   - `CityGuideExtras.tsx`: ①②③の小見出し（175・191・199行め）、回り方の見出し（69行め）、時刻（38行め）
   - `PlaceLists.tsx`: 30・46行め
   - `Latitude.tsx`: `MoreIssues`、`Palette`、`PublishedBy`、`NewsletterSignup` の小見出し
4. 日本語のページでも英語のまま出しているラベル（`People` `Places` `Where they are` `More issues` `Published by` `Notes` など）には、その要素に `lang="en"` を付ける。そうしないと日本語用の字間になる。

### ①-4. 残りの小さい字を、対応表で大きくする

`components/latitude/` と `app/[locale]/latitude/` の中だけ。`lat-label` に替えた所は対象外。

| いま | 直したあと | 備考 |
|---|---|---|
| `text-[8px]` `text-[9px]` | `text-[11px]` | 地図の上の字など |
| `text-[10px]` | `text-[12px]` | |
| `text-[11px]` | `text-[12px]` | 写真の説明など文章のものは `text-[13px]` |
| `text-[12px]`（文章） | `text-[13px]` | 注意書き・出典 |
| `text-[13px]` | `text-[14px]` | |
| `text-[14px]`（説明文） | `text-[15px]` | 店の説明 `what` は `text-[16px]` |
| `text-[15px]`（凛のひとこと） | `text-[16px]` | |
| `tracking-[0.3em]` `[0.35em]` `[0.4em]` `[0.5em]` | `tracking-[0.2em]` | 小さい字に付いているものだけ |
| `tracking-[0.25em]` `[0.28em]` `[0.24em]` `[0.22em]` | `tracking-[0.18em]` | 同上 |

**例外（変えない）**:
- 表紙の大きな数字や題（`text-[40px]` 以上）と、その字間。
- トップの `LATITUDE` の題の `letterSpacing: '0.12em'`。
- 地図の緯度の目盛り（`30° N` など）。

**個別に気をつける所**:
- トップの6人の名前（`page.tsx` の `text-[10px] ... tracking-[0.16em]`）: `text-[12px] tracking-[0.06em]` にし、**スマホ幅375で1行に収まること**を確かめる。収まらなければ `text-[11px]`。
- `IssueStrip` の帯: `Latitude` と号のリンクは `text-[12px] tracking-[0.18em]`、`JA / EN` は `text-[12px]`。
- `PeoplePlacesToggle`: `h-[26px] w-[168px]` → `h-[34px] w-[184px]`、字は `text-[11px] tracking-[0.18em]`。形（カプセル・すりガラスのつまみ）は変えない。帯の高さが変わるので、ほかのページの `scroll-mt-20` `scroll-mt-24` で見出しが帯に隠れないか確かめる。
- カードの幅は変えない（`lib/latitude-card.ts`）。字が大きくなってカードが縦に伸びるのは構わない。

**確認**: `grep -rcE "text-\[(7|8|9|10)px\]" components/latitude "app/[locale]/latitude"` が、例外を除いて 0。

### ①-5. 押す所を、指で押せる大きさにする

**なぜ**: 金沢のページで、押せる所296個のうち265個が32px未満。店カードのリンクは高さ15px。

**考え方**: 見た目の字は小さいままでよい。**押せる範囲だけ**を高さ44pxに広げる。

1. **店カードの行動**（いちばん大事）
   - `lib/latitude-theme.ts` に足す:
     ```ts
     export const ACTION = 'inline-flex min-h-[44px] items-center text-[12px] uppercase tracking-[0.18em] underline-offset-4 hover:underline';
     export const ACTION_MAIN = 'inline-flex min-h-[44px] items-center border px-4 text-[12px] uppercase tracking-[0.18em]';
     ```
   - `TrackLink.tsx`、`HScroller.tsx` の `ShowOnMap`、`AskTraveller.tsx` の `AskAboutButton` の className を `ACTION` にする。`TrackLink` に `main?: boolean` を足し、true なら `ACTION_MAIN`（枠の色は `INK`）。
   - `CityPlaces.tsx` の行動の並び（`PlaceRow` 200〜205行め、`PlaceGroup` 67〜71行め）:
     - 親の `<p>` から `text-[10px] uppercase tracking-[0.3em]` と `gap-y-*` を外し、`gap-x-5 gap-y-0` にする。
     - 順番を **Google マップ（`main`）→ 公式サイト → 地図で見る → 凛に聞く** にする。旅先でいちばん押すのは道案内だから。
   - `places/[city]/page.tsx` の「見る所」（316〜320行め）も同じ形にする。
2. **上の帯**（`Latitude.tsx` の `IssueStrip`）
   - 号のリンク: `FadeScroller` の `py-3` を外し、各 `Link` に `inline-flex min-h-[44px] items-center` を付ける。
   - `Latitude` のリンクと `JA` `EN`: `inline-flex min-h-[44px] items-center`、`JA` `EN` は `px-2` も。
3. **一覧のリンク**
   - `PlaceLists.tsx` の `Rows`（街の名前・「街の案内」・「凛の1日」）と、`details` の中の町の名前: 各リンクに `inline-flex min-h-[44px] items-center`。行の `py-4` は `py-1` に減らして、行の高さが増えすぎないようにする。
   - トップの People と Places の名前（`page.tsx`）: 各 `Link` に `inline-flex min-h-[44px] items-center`。`gap-y-2` は `gap-y-0` に。
   - `CityPlaces.tsx` の `CategoryLinks` `AreaLinks`、`PlaceRow` の「すべて見る →」も同じ。
   - `Latitude.tsx` の `PublishedBy` の2つのリンクも同じ。
4. **ルート作成のパネル**（`RouteBuilderPanel.tsx`）
   - `btn` の `min-h-[42px]` → `min-h-[44px]`
   - 外す「×」（87行め）`h-[30px] w-[28px]` → `h-[40px] w-[40px]`
   - 「名前から選ぶ」（137行め）と、その中の行（148行め）`min-h-[36px]` → `min-h-[44px]`
5. **「凛に聞く」の窓**（`AskTraveller.tsx` 60行め）: 「閉じる」に `inline-flex min-h-[44px] items-center px-2`。
6. **地図のピン**（`CityShopMap.tsx` 727行め付近と772行め付近の、店と地点のボタン）
   - 指で触る画面だけ、押せる範囲を上下左右に8pxずつ広げる。ボタンに `[@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:-inset-2 [@media(pointer:coarse)]:before:content-['']` を足す（ボタンが `relative` か `absolute` であることを確かめる）。
   - **ピンの見た目の大きさは変えない**。
   - 東茶屋街のようにピンが固まっている所で、隣の店が誤って選ばれないか、スマホ幅で5回ずつ押して確かめる。誤るようなら `-inset-1` に減らす。

### ①-6. 小さな不具合

1. **「凛に聞く」ボタンが字に重なる**（`AskTraveller.tsx` 39〜45行め）
   スマホでは顔だけの丸いボタンにする。`<span>` の文字に `hidden md:inline` を付け、ボタンに `aria-label={ja ? \`${name}に聞く\` : \`Ask ${name}\`}` を付ける。スマホのときの余白は `p-1.5`（丸）、`md:` 以上は今のまま（`md:py-2 md:pl-2 md:pr-5`）。丸は直径48px以上にする。
2. **地図の端で、店の名前が重なる**（`CityShopMap.tsx` 716〜720行め・764〜767行めの、画面の外にある店を端に出す所）
   スマホでは字（「地区 · 0.0 km」）を出さず、点だけにする。字の `<span>` に `hidden md:inline` を付ける。`aria-label` はそのまま残す。
3. **カテゴリ別ページの最初の写真が遅れて出る**（`CityPlaces.tsx` の `PlaceGroup` 47行め）
   `loading="lazy"` を外し、`<figure>` に `style={{ background: '#e6e2da' }}` を足す（読み込み中の空白を紙より少し濃い色に）。

---

## ② 街のページの組み替え

①は 2026-11-14 に main に入り、公開済み（`6bc55bd`）。オーナーに決めてもらう4点も決まった（この章の最後）。

進める順: **前半**＝街のページ（②-1・②-2・②-3・②-4・②-9）→ **後半**＝入口と地図と会話（②-5・②-6・②-7・②-8）。

**前半は 2026-11-14 に main に入った（`7caaa5d`）。** 金沢・スマホ幅で、最初の店は 8.1 → 5.3 画面め。「5画面め以内」には届いていないが、目次から1回で店に飛べるので、映像は縮めないことにした。残りは後半の4つ。

> 注意：main には別の作業（名所・店の写真）が同じ日に何度も入っている。始める前と push の前に、必ず `git fetch` して main の上に乗せ直すこと。

合格の目安（金沢・スマホ幅）:
- 最初の店カードが、いまの7.9画面めから **5画面め以内** に来る
- ページのどこにいても、1回押せば「店」「地図」に飛べる
- 英語版の店カードに、日本語の店名と住所が出ている

### ②-1. 街のページに、上に張りつく目次を付ける

**なぜ**: 横に流す形は残す（過去の決定）。そのかわり、長いページの中を1回で飛べるようにする。

**どこ**: `app/[locale]/latitude/places/[city]/page.tsx`。新しい部品 `components/latitude/CityJumpNav.tsx`（`'use client'`）。

**どうする**:
- 各 `<section>` に id と `scroll-mt-28` を付ける: `#day`（1日をなぞる）、`#map`（地図）、`#shops`（店）、`#sights`（見る所）、`#wear`（何を着るか）。
- `<header>` のすぐ下に目次を置く。`sticky top-[45px]`（上の帯のすぐ下。帯の実際の高さに合わせる）、背景は帯と同じ `rgba(242,238,231,0.92)` とぼかし、下に細い線。
- 中身は横に並ぶリンク。スマホでは横に流れてよい（`overflow-x-auto`、スクロールバーは隠す）。各リンクは `ACTION`。
- その街に無いものは出さない（映像のない町は「1日をなぞる」を出さない、など）。
- いま見ている所のリンクを `INK`、ほかを `MUTE` にする（`IntersectionObserver`）。
- リンクは普通の `<a href="#shops">`。JavaScript が動かなくても飛べること。

**文言**:

| id | 日本語 | 英語 |
|---|---|---|
| `#day` | 凛の1日 | Rin's day |
| `#map` | 地図 | Map |
| `#shops` | 店 | Shops |
| `#sights` | 見る所 | Sights |
| `#wear` | 何を着るか | What to wear |

（「凛」「Rin」は、その街の旅人の名前 `who` を入れる）

### ②-2. 街のページの順番を入れ替える

**いまの順**: 頭 → 1日をなぞる（映像・地図・回り方）→ 地元の名所 → 店の地図 → 1日の写真の帯 → 宿の部屋 → 何を着るか → 店 → 見る所

**直したあとの順**: 頭 → 目次 → 1日をなぞる → 店の地図 → **店** → 見る所 → 何を着るか → 地元の名所 → 宿の部屋

- `places/[city]/page.tsx` の `return` の中で、`<section>` のかたまりを並べ替えるだけ。中身は変えない。
- 「店の地図」と「店」を隣にするのは、カードの「地図で見る」と地図の「リストで見る ↓」で行き来するから。
- **1日の写真の帯**（245〜263行め、`c.images` を横に並べる所）: 回り方のカードがある街（`hasDayRoute(c)` が true）では出さない。同じ写真が回り方・帯・何を着るかの3回出ているため。帯の下にある「凛の金沢の1日 →」のリンクは、「1日をなぞる」の節の最後に移して残す。回り方のない街では、今までどおり帯を出す。

### ②-3. 店カードに、日本語の店名と住所を出す

**なぜ**: 英語版には日本語の店名も住所も出ていない。看板と見比べられず、タクシーでも見せられない。データ（`x.name` `x.address`）には既にある。

**どこ**: `CityPlaces.tsx` の `PlaceRow`（194行めの店名の下）と `PlaceGroup`（56〜59行めの店名の下）。`CityShopMap.tsx` の下から出るカード（922行め付近）も同じ形に。

**どうする**:
- **英語版だけ**、店名のすぐ下に日本語の店名を1行: `<p lang="ja" className="mt-1 text-[14px]" style={{ color: MUTE }}>{x.name}</p>`。`x.name === x.nameEn` のときは出さない。
- **両方の言語で**、説明文の下に住所を1行: `text-[13px]`、色は `MUTE`、`lang="ja"`。右に「コピー」（`CopyText.tsx` を使う。使い方はそのファイルを読む）。
- 住所の文言は足さない（ラベルなしで住所だけ）。コピーのボタンは 日本語「コピー」、英語「Copy」。
- `ShopPin` 型（`CityShopMap.tsx`）に `nameJa?: string` と `address?: string` を足し、`places/[city]/page.tsx` の `pins` を作る所（80〜101行め）で渡す。

### ②-4. 店の項目を増やせる形にする（中身は入れない）

**なぜ**: 営業時間・予約・支払いは、訪日客がいちばん知りたいこと。ただし今のデータには無く、説明文に混ざっている。

**どうする**:
- `lib/latitude-places.ts` の `CityPlace` に、あってもなくてもよい項目を足す:
  ```ts
  hours?: { en: string; ja: string };   // 例「10:00–17:00」
  closed?: { en: string; ja: string };  // 例「水曜」
  reserve?: 'required' | 'recommended' | 'no'; // 予約
  cashOnly?: boolean;
  ```
- カードでは、**データがある項目だけ**を住所の上に1行で出す（`text-[13px]`）。無ければ何も出さない。
- **データは入れない**。入れるのは編集部が公式サイトで確かめてから（別の作業）。推測で入れたら事故になる。

**文言**:

| 項目 | 日本語 | 英語 |
|---|---|---|
| `reserve: 'required'` | 予約が必要 | Reservation required |
| `reserve: 'recommended'` | 予約がおすすめ | Reservation recommended |
| `reserve: 'no'` | 予約不可 | No reservations |
| `cashOnly` | 現金のみ | Cash only |
| `closed` | 休み：〇〇 | Closed: 〇〇 |

### ②-5. トップに、日本の街案内への大きな入口を置く

**なぜ**: いちばん役に立つ「日本の55の町の案内」が、12pxの灰色の1行になっている。

**どこ**: `app/[locale]/latitude/page.tsx` の `<header>`。Places の `<nav>` の中の、いまの「ほか、日本の55の街の案内 →」のリンク。

**どうする**:
- その1行を、枠つきのボタン1つに替える（`NewsletterSignup` のボタンと同じ形: `border px-5 py-3`、字は `lat-label`、色は `INK`）。行き先は `/${locale}/latitude/places/japan`。
- 海外の街があるときは、今までどおりの小さい1行を下に残す（行き先は `/latitude/places`）。
- 号のある街の名前の並びは、そのまま（過去の決定）。

**文言**（数は今のコードと同じく計算で出す）:
- 日本語: `日本の{n}の町の案内を見る　→`
- 英語: `City guides to {n} towns in Japan  →`
- `n` は日本の街の合計（号のある街も含む）。

### ②-6. 日本のページの頭を短くする

**なぜ**: 1画面めが58の町名の羅列で、地図と月の絞り込みが2画面めにある。

**どこ**: `components/latitude/CountryPlacesPage.tsx` 53〜65行めの `<header>` と、`countryMetadata`。

**どうする**:
- 頭の文章から町名の羅列を外し、1〜2文にする。町名は下の一覧（`CountryCityList`）に全部あるので、検索や AI が読む字は減らない。
- `<title>` も同じ理由で短くする（いまは600字を超えている）。
- `header` の下の余白 `pb-10 md:pb-14` を `pb-6 md:pb-10` に詰める。

**文言**（日本のとき。ほかの国は今のまま）:
- 頭の文章・日本語: `旅人が1日を過ごした町と、旅人のおすすめの町。東京や京都の先にある、ものづくりの町を{n}。地図か、下の一覧から選べます。`
- 頭の文章・英語: `Towns where a LATITUDE traveller spent a day, and towns with their picks: {n} craft towns beyond Tokyo and Kyoto. Choose one on the map or from the list below.`
- title・日本語: `日本——ものづくりの町{n}の案内 | LATITUDE`
- title・英語: `Japan — city guides to {n} craft towns | LATITUDE`

> この文言はオーナーが 2026-11-14 に了承した（0-4「文章を書き換えない」の例外）。

### ②-7. 「凛に聞く」を、すぐ聞ける形にする

**なぜ**: いまは「戸は開いています」→「話しかける」→ 約4秒待つ → 入力、と3段ある。何を聞けるかも分からない。

**どこ**: `components/latitude/RoomChat.tsx`（`compact` のとき。225〜262行め付近）、`AskTraveller.tsx`。宿の部屋のページ（`compact` でないとき）は変えない。

**どうする**:
- 街のページ（`compact`）では、窓を開いたらすぐ会話を始める（「話しかける」を押したのと同じ処理を、開いたときに1回だけ走らせる）。
- 入力欄の上に、質問の例を3つ、押せる形で出す（`ACTION` に枠を付けたもの）。押すとその文が送られる。1回何か送ったら例は消す。
- 入力欄の `placeholder` を替える。
- AI への指示（`context` や API）は触らない。

**文言**（〇〇は街の名前）:

| | 日本語 | 英語 |
|---|---|---|
| 例1 | 〇〇で朝ごはんはどこ？ | Where should I have breakfast in 〇〇? |
| 例2 | 雨の日はどう回る？ | What would you do on a rainy day? |
| 例3 | 半日しかないなら？ | What if I only have half a day? |
| placeholder | 店や回り方を聞く | Ask about a place or a route |

### ②-8. 地図で、固まっているピンを選べるようにする

**なぜ**: ①の計測で分かったこと。金沢の地図を全体で見ているとき、39個のピンのうち13個は、**まん中を押しても別の店が選ばれる**（ひがし茶屋街などでピンが重なっているため）。押せる範囲を広げても直らず、むしろ少し悪くなる（広げない 26/39、4px 24/39、8px 21/39）。

**どこ**: `components/latitude/CityShopMap.tsx`

**どうする**:
- 全体が見えているときに、ピンが重なっている所を押したら、**店を選ばずに、まずその一帯へ寄る**。寄ってピンが離れたら、次の1回で店を選べる。
- 「重なっている」の目安は、押した点から半径22px以内にピンが2つ以上あること。
- 1つしか無い所は、今までどおり1回で店を選ぶ。
- 寄ったあとは、すでにある「← 全体へ」で戻れる。

**合格の目安**: 金沢で、39個すべてが2回以内の操作で正しく選べる。

### ②-9. 回り方の地点にも、その1か所だけの Google マップを付ける

**なぜ**: 2026-11-14 に本番で確かめた。店（金沢36軒）と見る所（6か所）には、1か所だけを Google マップで開くリンクが全部に付いていて、正しい店のページが開く。ところが**回り方のカード（鼓門・近江町市場・鈴木大拙館など）には付いていない**。あるのは「1日の道をまるごと開く」リンクだけ。「ここだけ行きたい」ができない。

**どこ**: `components/latitude/CityGuideExtras.tsx` の `CityRoute`（各地点のカード）

**どうする**:
- 位置のある地点（`r.coords` がある）のカードに、「Google マップ」のリンクを1つ足す。形は `ACTION`（枠なし。枠つきは「1日の道をまるごと開く」に取っておく）。
- 行き先は、店と同じ作り方: `https://www.google.com/maps/search/?api=1&query=` に `r.gmaps ?? \`${r.placeJa} ${c.nameJa}\`` を入れる（`googleDirectionsUrl` と同じ言葉を使う）。
- 位置のない地点（宿など）には付けない。
- 新しい窓で開く（`target="_blank" rel="noopener noreferrer"`）。

**文言**: 日本語「Google マップ」／英語「Google Maps」（店カードと同じ）

### ②のオーナーの決定（2026-11-14）

1. ②-2: 回り方のある街では、1日の写真の帯を**出さない**。
2. ②-6: 日本のページの文章と title を、上の文言に**替えてよい**。
3. ②-7: 質問の例は**任せる**（上の文言で進める）。
4. ②-3: 住所は**日本語版にも出す**。ただし見にくくならないこと（1行、13px、灰色。店名や説明より目立たせない）。

---

## ③ 機能の追加

②が main に入ってから。**どれも、始める前にオーナーに「やる・やらない」を聞く。** 1つずつ別のブランチで。

### ③の進め方（2026-11-14 オーナー「③も進めて」）

- **今回やる**: ③-3（検索）、③-2（保存と共有）、③-1（現在地）。
- **次に回す**: ③-5 の残り（店カードの写真・出どころの記録・止めるコマンド）。連絡先のアドレスをオーナーに確かめてから。
- **やらない**: ③-4（別に計画）、③-6（編集部の作業）。
- 新しく足す文言は、下の各項目の「文言」に書いたものだけ。足りない文言が出たら、いちばん近い形で仮に入れ、報告に書く。
- 新しいライブラリは足さない。位置も保存した店も、**サーバーへ送らない**（計測の `track()` に店名や位置を入れない。「保存した」「現在地を押した」という回数だけなら可）。
- 字はサーバーで描く決まり（0-3）はそのまま。今回足すのは、押した後にだけ出る表示なので、クライアントの小さな部品で足す。店カードの今ある字を、クライアント側の描画に変えないこと。

### ③-1. 現在地から近い順

**文言**

| 所 | 日本語 | 英語 |
|---|---|---|
| ボタン | `現在地` | `My location` |
| 出している間のボタン | `現在地を消す` | `Hide my location` |
| ボタンの下の1行（出している間） | `位置はこの画面の中だけで使い、どこにも送りません。` | `Your location stays on this device. It is not sent anywhere.` |
| 店カードの距離 | `ここから約350m` / `ここから約1.2km` | `About 350 m from you` / `About 1.2 km from you` |
| 近い順の見出し | `ここから近い順` | `Nearest to you` |
| 20km以上離れている | `この街の近くにいるときに使えます。` | `This works when you are near this town.` |
| 位置が取れない・断られた | `現在地を使えませんでした。端末の設定で位置情報を許可すると使えます。` | `Could not get your location. Allow location access in your device settings to use this.` |

- 距離の丸め: 1km 未満は 50m 刻み、1km 以上は 0.1km 刻み。
- 位置が取れたら、地図の下に「ここから近い順」で近い5軒（店名・種類・距離）を出す。押すと、その店が地図で選ばれる。
- 横に流す店カードの並び順は変えない（編集部の順）。距離を1行足すだけ。
- 位置はページを離れたら忘れる（`localStorage` にも入れない）。

- 街のページの地図に「現在地」のボタンを1つ足す。押したときだけ位置を聞く（ページを開いただけでは聞かない）。
- 位置が取れたら、地図に自分の点を出し、店のカードに「ここから約〇m」を出す。位置はどこにも送らず、保存もしない。
- その街から20km以上離れているときは、点を出さずに「この街の近くにいるときに使えます」と出す。
- 道の距離は計算しない（直線の距離で「約」と書く）。
- 触るファイル: `CityShopMap.tsx`。新しい部品は `components/latitude/` に。

### ③-2. 行きたい店の保存と共有

- 店カードに「保存」を足す。保存先は端末の中（`localStorage`）。ログインは使わない。
- `/latitude/saved` のページで、保存した店を街ごとに並べる。「Google マップで開く」と「共有」（`navigator.share`、無ければリンクをコピー）。
- 共有は、店の id を URL に並べるだけ（サーバーには何も置かない）。
- `localStorage` が使えない端末でも、ページは普通に出ること。

**文言**

| 所 | 日本語 | 英語 |
|---|---|---|
| 店カードのボタン | `保存` → 押した後 `保存済み ✓` | `Save` → `Saved ✓` |
| 保存した店への入口（1軒以上あるときだけ出す） | `保存した店（3）　→` | `Saved places (3)  →` |
| ページの題 | `保存した店` | `Saved places` |
| 題の下の1行 | `保存はこの端末の中だけです。ログインは要りません。` | `Saved on this device only. No account needed.` |
| 何も無いとき | `まだ保存した店はありません。街の案内で、店の「保存」を押すとここに並びます。` | `Nothing saved yet. Tap Save on a shop in a city guide and it will appear here.` |
| 店ごと | `Google マップ` / `外す` | `Google Maps` / `Remove` |
| 共有のボタン | `この一覧を共有` | `Share this list` |
| コピーした後 | `リンクをコピーしました ✓` | `Link copied ✓` |
| 共有されたリンクで開いたとき | 題 `共有された店の一覧`、ボタン `自分の一覧に保存` | `A shared list of places` / `Save these to my list` |

- 入口を置く所: 街のページの店の節の見出しの近く、地図のカード、`/latitude/places` の頭。上の帯（`IssueStrip`）には足さない（狭いスマホで収まらなくなる）。
- `/latitude/saved` は検索エンジンに載せない（`robots: noindex`）。中身は端末ごとに違うため。
- 共有の URL に入れるのは、街の slug と店の id だけ。データに無い id は黙って飛ばす。
- 保存の入れ物の鍵は1つ（例 `latitude:saved:v1`）。壊れた中身を読んでも落ちないこと。
- 店の並びは、街ごと・保存した順。店ごとに、店名（英語版では日本語の店名も）、種類・地区、住所（コピーつき。②-3 の部品を使う）、その店だけの Google マップ。

### ③-3. 検索

- `/latitude/places` の頭に、街と店の名前で探す欄を1つ。
- 探す元は、ビルドのときに作る小さな JSON（街の名前、店の名前の日本語と英語、種類、地区、街の slug）。外の検索サービスは使わない。
- 入力欄の字は16px以上（iPhone で勝手に拡大されないように）。

**文言**

| 所 | 日本語 | 英語 |
|---|---|---|
| 入力欄（ラベルと薄い字） | `街や店の名前で探す` | `Search towns and shops` |
| 結果の見出し | `街` / `店` | `Towns` / `Shops` |
| 見つからない | `見つかりませんでした。` | `No matches.` |
| 消すボタン | `消す` | `Clear` |

- 日本語版でも英語の名前で、英語版でも日本語の名前で見つかること（訪日客が看板の字を写して探す。日本人がローマ字で探す）。ひらがな・カタカナ、全角・半角、大文字・小文字の違いは同じものとして扱う。
- 結果は、街を先に、店を後に。店は「店名・種類・街の名前」。多いときは街5つ・店10軒まで。
- 店を押すと、その街のページの、その店のカードへ飛ぶ（カードに飛び先の印が無ければ足す。張りつく帯に隠れないこと）。
- 探す元の JSON は、入力欄に初めて触ったときに読む（ページを開いただけでは読まない）。大きさを報告に書く。
- キーボードで使えること（上下で選ぶ、Enter で開く、Esc で消す）。結果の行は高さ44px以上。

### ③-4. 中国語・韓国語（大きい作業。別に計画を立てる）

- LATITUDE の字は、コードの中で `ja ? 日本語 : 英語` と2択で書いてある（数百か所）。店のデータも `what` / `whatEn` の2つ。3つめの言語を足すには、この形ごと作り直す必要がある。
- 対応する言語の一覧（`@/i18n` の `locales`）は VUAL 全体のものなので、LATITUDE だけ増やす方法から決める。
- 翻訳は、店名と地名の読みを間違えると実害が出る。機械訳のまま出さない。
- **この指示書では着手しない。** やるなら、まず「どの言語を・どのページから」をオーナーと決める。

### ③-5. 店の写真（方針は 0-3b）

> **2026-11-14 追記：一部は別の作業で main に入っている**（`b0d8855`）。公式サイトの共有用の写真を204軒ぶん取りこみ、**地図のカード**に「写真：公式サイトより」と添えて出している。写真の対応表は `lib/latitude-shop-photos.json`（街 → 店名 → ファイル名）。
> **まだ無いもの**: ①横に流す店カード（`PlaceRow`）とカテゴリ別・地区別の行（`PlaceGroup`）に写真を出す ②出どころの URL の記録（いまの対応表にはファイル名しか無い） ③すぐ止めるコマンドと、止めた店の記録 ④ページ下の、店からの連絡先の1文。
> 下の「データ」の形は、いまある `lib/latitude-shop-photos.json` に合わせて考え直すこと（`CityPlace` に項目を足すより、対応表に出どころを足すほうが小さい直しで済む）。

**なぜ**: 旅行者は写真で店を選ぶ。字だけのカードは、ほかのガイドに比べていちばん弱い所。

#### どの写真を使うか

- **店の公式のものだけ**: 公式サイト、公式の Instagram など、店が自分で出している写真。
- **使わないもの**: 口コミサイト、個人のブログ、Google マップに客が投稿した写真、新聞や雑誌の写真。これらは撮った人が店ではないので、「店から苦情が来たら止める」では片づかない。
- まず使うのは、**公式サイトが共有用に出している写真**（リンクを貼ったときに出る画像。`og:image`）。回り方の地点では、すでにこの方法で写真を出している（main の `6a110e6`）。同じやり方・同じスクリプトを店にも広げる。
- 公式の Instagram がある店は、すでにある正式な埋めこみ（`instagram` の項目）も使える。

#### データ

`lib/latitude-places.ts` の `CityPlace` に足す:
```ts
photo?: string;        // すでにある。public/latitude/places/<街>/shops/ のファイル名
photoSource?: string;  // その写真があったページの URL（必ず書く）
photoCheckedAt?: string; // 写真を取った日
```
- `photoSource` の無い写真は出さない（苦情が来たとき、どこの写真か分からないと困るため）。
- 写真の下に小さく出どころを書く: 日本語「写真：店の公式サイトより」／英語 `Photo: from the shop's official site`。`photoSource` へのリンクにする。

#### どこに出すか

- 街のページの店カード（`CityPlaces.tsx` の `PlaceRow`）: カードのいちばん上に、横4:縦3で。写真の無い店は今までどおり字だけ（空の枠を出さない）。
- カテゴリ別・地区別のページ（`PlaceGroup`）: 店名の左か上に小さく。
- 地図のカード（`CityShopMap.tsx`）: すでに `photo` があれば出る作りになっている。
- 写真には `width` `height` を付け、画面の外のものは `loading="lazy"`。読み込みのあとで画面がずれないこと。
- 検索エンジン向けのデータ（`PlacesJsonLd`）には、写真を入れない。

#### 苦情が来たとき、すぐ止める手順（必ず用意する）

1. その店の `photo` `photoSource` `photoCheckedAt` を JSON から消す。
2. 置き場（R2 と `public/latitude/places/<街>/shops/`）からファイルを消す。JSON から消しただけでは、画像の URL を直接開くとまだ見えるため。
3. main に入れて公開する。
4. `docs/latitude-photo-takedowns.md` に、日付・店名・だれから・何と言われたかを1行残す。**その店の写真は二度と取りこまない**（スクリプトがこのファイルを読んで、載っている店を飛ばすようにする）。

この手順を1つのコマンドでできるスクリプト（`scripts/latitude-photo-takedown.mjs <街> <店名>`）を作る。

#### 店からの連絡先

各街のページの下の注意書き（「凛は架空の旅人です…」の段）に1文足す:
- 日本語: `写真の掲載を止めたいお店の方は、editor@vual.jp までご連絡ください。すぐに外します。`
- 英語: `If you are the shop and would like a photo removed, write to editor@vual.jp and we will take it down at once.`

> 連絡先のアドレスは `editor@vual.jp` でよい（オーナー確認 2026-11-14）。

### ③-6. 営業時間などのデータ

- コードではなく、編集部の作業。
- ②-4 で入れ物だけ用意してある。公式サイトで確かめた店から順に入れる。推測で入れない。

---

## 付録: 調べて分かったこと（直さないもの）

次の3つは、最初の点検で「不具合かも」と見えたが、調べたら不具合ではなかった。**直さない。**

- ルート作成で店を押したのに地区名（Omicho）が出た → 押したのは店ではなく「凛の1日の地点」（近江町）だった。正しい動き。
- カテゴリ別ページの大きな空白 → 写真の読み込み待ちだった（①-6の3で軽くする）。
- トップの地図に日本が映らない → スマホでは地図が横に流れる作りで、最初の位置がヨーロッパ。横に動かせば日本が出る。変えるかどうかはオーナー次第（6人のうち5人がヨーロッパにいるため、今の位置にも理由がある）。

## 付録: 良い所（壊さないこと）

- 店の一覧に、検索エンジン向けのデータ（`PlacesJsonLd`）が正しく入っている。
- 日本語版と英語版が互いを指している（`alternates`）。
- 読み込みのあとで画面がずれない（ずれの計測値 0）。写真の `width` `height` を消さないこと。
- 地図で店を押すと、下からカードが出る。この動きは良い。
