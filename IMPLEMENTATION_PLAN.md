# VUAL - High-End AI Fashion VTON & Live Commerce SaaS

## プロジェクト概要

アパレル小売店向けB2B2C SaaSプラットフォーム。AIによるVTON（バーチャル試着）とライブコマース機能を提供。

**ターゲット:**
- B2B: アパレル小売店（ショップスタッフが商品撮影→AI生成）
- B2C: 顧客（LINE LIFFアプリでルック閲覧・ライブ視聴・決済）

---

## 技術スタック

| 領域 | 技術 |
|------|------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, Framer Motion |
| Database/Auth/Storage | Firebase (Firestore, Auth, Cloud Storage) |
| Payment | Stripe (Checkout API) |
| AI Stage 1 | Google Vertex AI (Gemini 2.5 Flash Lite) |
| AI Stage 2 | Vertex AI VTON / Imagen |
| Live Streaming | Mux API |
| Hosting | Vercel |

---

## 実装フェーズ

### Phase 1: 基礎インフラ構築

#### 1.1 Next.js プロジェクトセットアップ
```
/Users/mari/Desktop/vual/
├── app/
│   ├── layout.tsx          # ルートレイアウト
│   ├── page.tsx            # Customer Storefront
│   ├── live/
│   │   └── page.tsx        # ライブコマース視聴
│   └── admin/
│       ├── layout.tsx      # Admin専用レイアウト
│       ├── page.tsx        # ダッシュボード
│       ├── products/
│       │   └── add/page.tsx
│       ├── studio/
│       │   └── page.tsx    # AI Studio
│       └── live/
│           └── page.tsx    # 配信管理
├── components/
│   ├── ui/                 # 共通UIコンポーネント
│   ├── customer/           # 顧客向けコンポーネント
│   └── admin/              # 管理画面コンポーネント
├── lib/
│   ├── firebase.ts
│   ├── stripe.ts
│   └── ai/
│       ├── gemini.ts
│       └── vton.ts
├── styles/
│   └── themes.css          # CSS変数によるテーマ定義
└── public/
```

#### 1.2 Tailwind + CSS Variables テーマアーキテクチャ

4つのテーマプリセット（`data-theme`属性で切替）:

1. **theme-modern**: モード系（純白/漆黒、シャープ、Inter、エレクトリックブルー）
2. **theme-organic**: ナチュラル系（アイボリー、優しい角丸、セージグリーン）
3. **theme-street**: ストリート系（純白+太枠、直角、レッド、ブルータリズム）
4. **theme-elegant**: フェミニン系（ベージュ白、優美な角丸、明朝体、ダスティピンク）

**CSS変数設計:**
```css
:root {
  --color-bg-primary: ...
  --color-bg-secondary: ...
  --color-text-primary: ...
  --color-accent: ...
  --radius-default: ...
  --font-heading: ...
  --font-body: ...
}
```

#### 1.3 共通コンポーネント
- Button（アクセントカラー、ホバーエフェクト）
- Card（極細ボーダー、余白重視）
- Modal（Framer Motionアニメーション）
- Loading（パルス/スケルトン）

---

### Phase 2: Customer LIFF App（顧客向け）

#### 2.1 顧客向け画面群（参考画像に基づく完全仕様）

**共通ヘッダー構成:**
```
┌─────────────────────────────────────┐
│  ☰    [VUAL / Shop Logo]    🔍  🛒  │
└─────────────────────────────────────┘
```
- 左: ハンバーガーメニュー
- 中央: ショップロゴ（テーマにより可変）
- 右: 検索アイコン、カートアイコン（バッジ付き）

---

**2.1.1 Home / Storefront (`app/page.tsx`)**
```
┌─────────────────────────────────────┐
│  ☰      [SHOP LOGO]       🔍  🛒   │
├─────────────────────────────────────┤
│                                     │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   │    HERO IMAGE               │   │
│   │    (Full-width, AI Look)    │   │
│   │                             │   │
│   │   ┌───────────────────┐     │   │
│   │   │ EXPLORE COLLECTION │    │   │ ← CTAボタン
│   │   └───────────────────┘     │   │
│   └─────────────────────────────┘   │
│                                     │
│   N E W   A R R I V A L             │ ← レタースペーシング
│   ─────────────────────             │
│                                     │
│   [All] [Apparel] [Dress] [Bag]...  │ ← カテゴリタブ（横スクロール）
│                                     │
│   ┌───────┐  ┌───────┐              │
│   │       │  │       │              │ ← 2カラムグリッド
│   │ img   │  │ img   │  ♡          │
│   │       │  │       │              │
│   └───────┘  └───────┘              │
│   Brand Name  Brand Name            │
│   Product     Product               │
│   $120        $120                  │ ← アクセントカラー
│                                     │
│   Explore More →                    │
│                                     │
│   ═══════════════════════════════   │
│   C O L L E C T I O N S             │
│   ┌─────────────────────────────┐   │
│   │  Collection Hero Image      │   │
│   │  "October Collection"       │   │
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**実装コンポーネント:**
- `CustomerHeader`: 共通ヘッダー
- `HeroSection`: フルwidth画像 + オーバーレイテキスト + CTAボタン
- `CategoryTabs`: 横スクロール可能なタブ（アクティブ時アンダーライン）
- `ProductGrid`: 2カラム商品グリッド
- `ProductCard`: 画像 + ハート + ブランド名 + 商品名 + 価格
- `CollectionBanner`: コレクション紹介セクション

---

**2.1.2 Category / 商品一覧 (`app/category/[slug]/page.tsx`)**
```
┌─────────────────────────────────────┐
│  ☰      [SHOP LOGO]       🔍  🛒   │
├─────────────────────────────────────┤
│  4500 APPAREL      New ▼  ⊞  ☰    │ ← 件数、ソート、表示切替
│                                     │
│  [Women ×] [All apparel ×]          │ ← フィルタータグ（削除可能）
│                                     │
│   ┌───────┐  ┌───────┐              │
│   │       │  │       │              │
│   │ img   │  │ img   │  ♡          │
│   └───────┘  └───────┘              │
│   Brand       Brand                 │
│   Product     Product               │
│   $120        $120                  │
│   ...                               │
│                                     │
│   [1] [2] [3] [4] [5] [>]           │ ← ページネーション
└─────────────────────────────────────┘
```

**リスト表示モード:**
```
│  ┌─────┐ LAMEREI                    │
│  │ img │ Recycle Boucle Knit...     │
│  │     │ $120  ★4.8 Ratings        │
│  └─────┘ Size: [S] [M] [L]     ♡    │
```

**実装コンポーネント:**
- `CategoryHeader`: 件数、ソートドロップダウン、グリッド/リスト切替
- `FilterTags`: アクティブフィルター表示（×で削除）
- `ProductGridView`: 2カラムグリッド表示
- `ProductListView`: 横長カード表示（レーティング、サイズ付き）
- `Pagination`: ページネーションUI

---

**2.1.3 Product Detail (`app/product/[id]/page.tsx`)**
```
┌─────────────────────────────────────┐
│  ←      [SHOP LOGO]       🔍  🛒   │
├─────────────────────────────────────┤
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   │    PRODUCT IMAGE            │   │
│   │    (Swipeable Carousel)     │   │
│   │                             │   │ ← カラー変更で画像切替
│   │              [share] [♡]    │   │
│   └─────────────────────────────┘   │
│         ● ○ ○ ○                     │ ← ドットインジケーター
│                                     │
│   M O H A N                         │ ← ブランド名（レタースペーシング）
│   Recycle Boucle Knit Cardigan Pink │
│                              $120   │ ← アクセントカラー
│                                     │
│   Color  ● ● ○                      │ ← カラースウォッチ
│   Size   [S] [M] [L]                │ ← サイズセレクター
│                                     │
│   ┌─────────────────────────────┐   │
│   │  + ADD TO BASKET        ♡  │   │ ← 黒背景、白文字
│   └─────────────────────────────┘   │
│                                     │
│   M A T E R I A L S            ∨   │ ← アコーディオン
│   ─────────────────────────────     │
│   C A R E                      ∨   │
│   ─────────────────────────────     │
│   🚚 Free Flat Rate Shipping   ∨   │
│   🏷️ COD Policy               ∨   │
│   ↩️ Return Policy             ∨   │
│                                     │
│   ═══════════════════════════════   │
│   Y O U   M A Y   A L S O   L I K E │
│   ┌───────┐  ┌───────┐  ┌───────┐   │
│   │ img   │  │ img   │  │ img   │   │
│   └───────┘  └───────┘  └───────┘   │
└─────────────────────────────────────┘
```

**実装コンポーネント:**
- `ImageCarousel`: スワイプ可能な画像カルーセル + ドットインジケーター
- `ColorSwatches`: カラー選択（選択時ボーダー）
- `SizeSelector`: サイズ選択ボタン群
- `AddToBasketButton`: 黒背景の主要CTAボタン
- `AccordionSection`: 折りたたみ情報セクション
- `RelatedProducts`: 関連商品横スクロール

---

**2.1.4 Cart (`app/cart/page.tsx`)**
```
┌─────────────────────────────────────┐
│  ×                    C A R T       │
├─────────────────────────────────────┤
│                                     │
│  ┌─────┐ LAMEREI                    │
│  │ img │ Recycle Boucle Knit...     │
│  │     │ [-] 1 [+]                  │
│  └─────┘              $120          │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  (Empty state: ハンガーアイコン)     │
│  "You have no items in your         │
│   Shopping Bag."                    │
│                                     │
├─────────────────────────────────────┤
│  T O T A L                   $240   │
│  ┌─────────────────────────────┐    │
│  │  🔒 CHECKOUT                │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

**2.1.5 Checkout (`app/checkout/page.tsx`)**
```
┌─────────────────────────────────────┐
│  ☰      [SHOP LOGO]       🔍  🛒   │
├─────────────────────────────────────┤
│         C H E C K O U T             │
│         ─────────────               │
│                                     │
│  S H I P P I N G   A D D R E S S    │
│  Iris Watson                     >  │
│  606-3727 Ullamcorper. Street       │
│  Roseville NH 11523                 │
│  (786) 713-8616                     │
│                                     │
│  + Add shipping address             │
│                                     │
│  S H I P P I N G   M E T H O D      │
│  [Pickup at store      FREE    ∨]   │
│                                     │
│  P A Y M E N T   M E T H O D        │
│  [Select payment method        ∨]   │
│                                     │
│  ─────────────────────────────────  │
│  [🎫] Add promo code                │
│  [🚚] Delivery              Free    │
│                                     │
├─────────────────────────────────────┤
│  T O T A L                   $240   │
│  ┌─────────────────────────────┐    │
│  │  🔒 PLACE ORDER             │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

**2.1.6 Payment Success Modal**
```
┌─────────────────────────────────────┐
│                                 ×   │
│                                     │
│   P A Y M E N T   S U C C E S S     │
│                                     │
│              ✓                      │ ← チェックアイコン（アニメーション）
│                                     │
│     Your payment was success        │
│     Payment ID 15263541             │
│                                     │
│     ～～～～～～～～～～～            │
│                                     │
│     Rate your purchase              │
│     😐  🙂  😊                       │
│                                     │
│  ┌──────────┐  ┌──────────────┐     │
│  │ SUBMIT   │  │ BACK TO HOME │     │
│  └──────────┘  └──────────────┘     │
└─────────────────────────────────────┘
```

---

**2.1.7 Search (`app/search/page.tsx`)**
```
┌─────────────────────────────────────┐
│  ┌─────────────────────────┐    ×   │
│  │ 🔍 Search items          │       │
│  └─────────────────────────┘        │
│                                     │
│  Recent search                      │
│  [Dress ×] [Collection ×] [Nike ×]  │
│                                     │
│  Popular search terms               │
│  Trend                              │
│  Dress                              │
│  Bag                                │
│  Tshirt                             │
│  Beauty                             │
│  Accessories                        │
└─────────────────────────────────────┘
```

**検索結果:**
```
│  [Dress                    ×] 🔍    │
│                                     │
│  8 RESULT OF DRESS    New ▼  ⊞     │
│  ┌───────┐  ┌───────┐              │
│  │ img   │  │ img   │              │
│  ...                                │
```

---

**2.1.8 Menu Drawer (スライドイン)**
```
┌─────────────────────────────────────┐
│                                 ×   │
├─────────────────────────────────────┤
│  [WOMEN]  [MAN]  [KIDS]             │ ← タブ（アクティブにアンダーライン）
│   ────                              │
│                                     │
│  New                            ∨   │
│  Apparel                        ∨   │
│    ├─ Outer                         │ ← 展開時サブメニュー
│    ├─ Dress                         │
│    ├─ Blouse/Shirt                  │
│    ├─ T-Shirt                       │
│    ├─ Knitwear                      │
│    ├─ Skirt                         │
│    ├─ Pants                         │
│    └─ Denim                         │
│  Bag                            ∨   │
│  Shoes                          ∨   │
│  Beauty                         ∨   │
│  Accessories                    ∨   │
│                                     │
│  📞 (786) 713-8616                  │
│  📍 Store locator                   │
│                                     │
│  [𝕏] [📷] [▶️]                      │ ← SNSアイコン
└─────────────────────────────────────┘
```

---

**2.1.9 Blog / Lookbook (`app/blog/page.tsx`)**

**Grid View:**
```
│         B L O G                     │
│         ─────                       │
│  [Fashion] [Promo] [Policy] [Look]  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  BLOG IMAGE                 │ 🔖 │
│  │  "2021 STYLE GUIDE:         │    │
│  │   THE BIGGEST FALL TRENDS"  │    │
│  └─────────────────────────────┘    │
│  #Fashion  #Tips        4 days ago  │
```

**List View:**
```
│  ┌─────┐ 2021 STYLE GUIDE:          │
│  │ img │ THE BIGGEST FALL TRENDS    │
│  │     │ The excitement of fall...  │
│  └─────┘ 4 days ago                 │
```

---

**2.1.10 Collection Detail (`app/collection/[slug]/page.tsx`)**
```
┌─────────────────────────────────────┐
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   │   COLLECTION HERO           │   │
│   │                             │   │
│   │   "October"                 │   │
│   │   "COLLECTION"              │   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
│  ┌───────┐  ┌───────┐               │
│  │ img   │  │ img   │               │
│  ...                                │
└─────────────────────────────────────┘
```

**BLACK COLLECTION（ダークテーマ）:**
```
┌─────────────────────────────────────┐
│  ██████████████████████████████████ │
│  █                                █ │
│  █   01  BLACK COLLECTION         █ │ ← ナンバリング表示
│  █                                █ │
│  ██████████████████████████████████ │
│  █                                █ │
│  █   02  HAE BY HAEKIM            █ │
│  █                                █ │
│  ██████████████████████████████████ │
```

---

**2.1.11 Static Pages**

**Our Story (`app/about/page.tsx`):**
- テキストコンテンツ
- 画像
- SIGN UPセクション（メール入力フォーム）

**Contact Us (`app/contact/page.tsx`):**
- 「CHAT WITH US」ボタン
- 「TEXT US」ボタン
- SNSリンク

**404 Page (`app/not-found.tsx`):**
- ハンガーアイコン
- 「PAGE NOT FOUND」
- 「← HOME PAGE」ボタン

---

**共通フッター構成:**
```
┌─────────────────────────────────────┐
│           [𝕏] [📷] [▶️]             │
│                                     │
│         support@shop.design         │
│           +60 825 876               │
│       08:00 - 22:00 - Everyday      │
│           ─────────                 │
│                                     │
│      About   Contact   Blog         │
│                                     │
│   Copyright© Shop. All Rights.      │
└─────────────────────────────────────┘
```

#### 2.2 ライブコマース視聴画面 (`app/live/page.tsx`)
**参考画像に基づくUI仕様:**

```
┌─────────────────────────────────────┐
│  <  [avatar] Shop_Name    [bell]   │  ← ヘッダー（半透明オーバーレイ）
│      [Clothes]                      │  ← カテゴリタグ（アクセントカラー）
│                                     │
│                                     │
│    ┌─────────────────────────┐     │
│    │                         │     │
│    │   フルスクリーン        │     │
│    │   ライブ動画            │     │
│    │                         │     │
│    │                         │     │
│    └─────────────────────────┘     │
│                                     │
│  [avatar] Name              [♡♡]   │  ← コメントストリーム
│           Text Text...      [♥]    │
│  [avatar] Name              [+]    │
│           Text Text...      [→]    │
│  [avatar] Name              [🔖]   │  ← 右サイドバー: リアクション
│           Text Text...      [•••]  │
│                                     │
│  ┌─────────────────────────┐ [💬] │
│  │ Type Something...        │       │  ← コメント入力
│  └─────────────────────────┘       │
└─────────────────────────────────────┘
```

**Product Sheet（下部スライドアップ）:**
```
┌─────────────────────────────────────┐
│          ═══════                    │  ← ドラッグハンドル
│  Products                      ✕    │
├─────────────────────────────────────┤
│  [img] Product_Name    [🛒] [Buy Now]│
│        $12                          │
│  [img] Product_Name    [🛒] [Buy Now]│
│        $12                          │
│  [img] Product_Name    [🛒] [Buy Now]│
│        $12                          │
│  ...                                │
└─────────────────────────────────────┘
```

**実装コンポーネント:**
- `LiveHeader`: 戻るボタン、ショップ情報、通知ベル
- `LivePlayer`: フルスクリーン動画（playsinline、Mux統合）
- `CommentStream`: リアルタイムコメント表示（Framer Motionでフェードイン）
- `ReactionBar`: 右サイドバーのリアクションボタン群
- `CommentInput`: 下部コメント入力フィールド
- `ProductSheet`: Glassmorphism効果のスライドアップパネル
- `ProductRow`: サムネイル、商品名、価格、カート、Buy Nowボタン
- Stripe Checkoutワンタップ決済

---

### Phase 3: Shop Admin Web App（店舗管理）

**参考画像に基づく完全仕様 + VUAL Design System適用**

#### 3.0 i18n (Internationalization) Setup

```
npm install next-intl
```

**ディレクトリ構成:**
```
vual/
├── messages/
│   ├── en.json          # English (Default)
│   └── ja.json          # Japanese
├── i18n.ts              # next-intl configuration
└── middleware.ts        # Locale detection
```

**翻訳辞書構造 (`messages/en.json`):**
```json
{
  "common": {
    "search": "Search",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit"
  },
  "admin": {
    "sidebar": {
      "dashboard": "Dashboard",
      "orders": "Order Management",
      "customers": "Customers",
      ...
    },
    "dashboard": {
      "totalSales": "Total Sales",
      "totalOrders": "Total Orders",
      ...
    }
  },
  "customer": { ... }
}
```

**言語切替UI:**
- Admin: トップナビ右側にドロップダウン（🌐 EN / JA）
- Customer LIFF: メニュードロワー内 + フッターにトグルスイッチ

**対象画面:**
- ✅ Admin画面（全ページ）
- ✅ Customer画面（全ページ：Home, Category, Product, Cart, Checkout, Live, Blog, etc.）

**新言語の追加（拡張性）:**
```
messages/
├── en.json    # English (Default)
├── ja.json    # Japanese
├── fr.json    # French ← 追加するだけ
├── de.json    # German ← 追加するだけ
└── ...
```

追加手順:
1. `messages/[locale].json` を作成（既存JSONをコピーして翻訳）
2. `i18n.ts` の `locales` 配列に追加: `['en', 'ja', 'fr']`
3. 完了 → `/fr/admin`, `/fr/product/1` などが自動で有効化

---

#### 3.1 AdminLayout（共通レイアウト）

**VUAL Design Rules適用:**
- 背景: `#FFFFFF` (純白) / `#F9FAFB` (極薄グレー)
- テキスト: `#111827` (漆黒)
- ボーダー: `1px solid #E5E7EB` (極細)
- シャドウ: 使用禁止（余白で区切る）
- 角丸: `rounded-sm` (2px) / `rounded-md` (4px)
- アクセント: サイドバーのアクティブメニュー、主要ボタンのみ

```
┌──────────────────────────────────────────────────────────────┐
│ ┌────────────┐ ┌──────────────────────────────────────────┐ │
│ │            │ │  Dashboard        [Search...]  🔔 ☀️ 🌐 👤│ │
│ │   V U A L  │ ├──────────────────────────────────────────┤ │
│ │            │ │                                          │ │
│ │ ─────────  │ │                                          │ │
│ │            │ │           CONTENT AREA                   │ │
│ │  Main Menu │ │                                          │ │
│ │            │ │                                          │ │
│ │ ▣ Dashboard│ │                                          │ │
│ │   Orders   │ │                                          │ │
│ │   Customers│ │                                          │ │
│ │   Coupons  │ │                                          │ │
│ │   Trans... │ │                                          │ │
│ │            │ │                                          │ │
│ │ ─────────  │ │                                          │ │
│ │ Product    │ │                                          │ │
│ │ + Add      │ │                                          │ │
│ │   Media    │ │                                          │ │
│ │   List     │ │                                          │ │
│ │            │ │                                          │ │
│ │ ─────────  │ │                                          │ │
│ │ VUAL       │ │                                          │ │
│ │ ✨ Studio  │ │  ← VUALコア機能                          │ │
│ │ 📡 Live    │ │                                          │ │
│ │            │ │                                          │ │
│ │ ─────────  │ │                                          │ │
│ │ Settings   │ │                                          │ │
│ │   Profile  │ │                                          │ │
│ │   Team     │ │                                          │ │
│ │            │ │                                          │ │
│ │ ─────────  │ │                                          │ │
│ │ [Shop]  ↗  │ │                                          │ │
│ │ @user      │ │                                          │ │
│ └────────────┘ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Sidebar Menu Structure:**
```typescript
const menuItems = [
  { section: "Main Menu", items: [
    { icon: "LayoutDashboard", label: "Dashboard", href: "/admin" },
    { icon: "ShoppingCart", label: "Orders", href: "/admin/orders" },
    { icon: "Users", label: "Customers", href: "/admin/customers" },
    { icon: "Ticket", label: "Coupons", href: "/admin/coupons" },
    { icon: "CreditCard", label: "Transactions", href: "/admin/transactions" },
  ]},
  { section: "Product", items: [
    { icon: "Plus", label: "Add Product", href: "/admin/products/add" },
    { icon: "Image", label: "Media", href: "/admin/products/media" },
    { icon: "List", label: "Product List", href: "/admin/products" },
  ]},
  { section: "VUAL", items: [
    { icon: "Sparkles", label: "AI Studio", href: "/admin/studio", highlight: true },
    { icon: "Radio", label: "Live Broadcast", href: "/admin/live", highlight: true },
  ]},
  { section: "Settings", items: [
    { icon: "User", label: "Profile", href: "/admin/settings/profile" },
    { icon: "Users", label: "Team", href: "/admin/settings/team" },
  ]},
];
```

**Top Navigation:**
- 左: ページタイトル（レタースペーシング）
- 中央: 検索バー（"Search products, orders, or customers..."）
- 右: 通知ベル、ダークモード切替、言語切替（🌐）、プロフィールアバター

---

#### 3.2 Dashboard (`/admin`)

```
┌────────────────────────────────────────────────────────────┐
│  D A S H B O A R D                                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Total Sales  │ │ Total Orders │ │ Pending      │       │
│  │              │ │              │ │              │       │
│  │ $350,000     │ │ 10,700       │ │ 509          │       │
│  │ ↑ 10.4%      │ │ ↑ 14.4%      │ │ Cancelled 94 │       │
│  │ Last 7 days  │ │ Last 7 days  │ │ ↓ 14.4%      │       │
│  │     [Details]│ │     [Details]│ │     [Details]│       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                            │
│  ┌────────────────────────────────┐ ┌──────────────────┐  │
│  │ Report for this week          │ │ Real-time Users  │  │
│  │ [This week] [Last week]       │ │                  │  │
│  │                               │ │  21.5K           │  │
│  │  52k    3.5k   2.5k   250k    │ │  Users/minute    │  │
│  │  Cust.  Prod.  Stock  Revenue │ │  ▁▂▃▄▅▆▇█▇▆▅    │  │
│  │                               │ │                  │  │
│  │  ┌─────────────────────────┐  │ │ Sales by Country │  │
│  │  │     📈 Line Chart       │  │ │ 🇺🇸 US    $30k  │  │
│  │  │                         │  │ │ 🇧🇷 Brazil $30k │  │
│  │  │     Sun-Sat weekly      │  │ │ 🇦🇺 Aus.  $25k  │  │
│  │  └─────────────────────────┘  │ │    [View Insight]│  │
│  └────────────────────────────────┘ └──────────────────┘  │
│                                                            │
│  ┌────────────────────────────────┐ ┌──────────────────┐  │
│  │ Recent Transactions   [Filter]│ │ Top Products     │  │
│  │                               │ │ [Search...]      │  │
│  │  No  Customer   Date   Status │ │                  │  │
│  │  1.  #6545     01 Oct  ● Paid │ │ [img] Jacket    │  │
│  │  2.  #5412     01 Oct  ○ Pend │ │       $999.00   │  │
│  │  3.  #6622     01 Oct  ● Paid │ │ [img] Dress     │  │
│  │  ...                  [Detail]│ │       $72.40    │  │
│  └────────────────────────────────┘ └──────────────────┘  │
│                                                            │
│  ┌────────────────────────────────┐ ┌──────────────────┐  │
│  │ Best Selling Products [Filter]│ │ Quick Add        │  │
│  │                               │ │ Categories       │  │
│  │  Product   Orders  Status     │ │ ┌─────┐ Fashion  │  │
│  │  Jacket    104     ● Stock    │ │ └─────┘          │  │
│  │  Dress     56      ● Stock    │ │ ┌─────┐ Access.  │  │
│  │  ...              [Details]   │ │ └─────┘          │  │
│  └────────────────────────────────┘ └──────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

**コンポーネント:**
- `StatCard`: 統計カード（タイトル、数値、変化率、期間）
- `WeeklyReport`: 期間切替 + 統計サマリー + 折れ線グラフ
- `RealtimeUsers`: リアルタイム数値 + バーチャート
- `SalesByCountry`: 国旗 + 国名 + 売上
- `TransactionTable`: 最近の取引一覧
- `TopProducts`: 商品ランキング
- `BestSellingTable`: ベストセラー商品テーブル
- `QuickAdd`: カテゴリショートカット

---

#### 3.3 Orders (`/admin/orders`)

```
┌────────────────────────────────────────────────────────────┐
│  O R D E R   M A N A G E M E N T         [+ Add] [More ⋮]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐│
│  │ Total      │ │ New        │ │ Completed  │ │ Cancelled││
│  │ 1,240      │ │ 240        │ │ 960        │ │ 87       ││
│  │ ↑ 14.4%    │ │ ↑ 20%      │ │ 85%        │ │ ↓ 5%     ││
│  └────────────┘ └────────────┘ └────────────┘ └──────────┘│
│                                                            │
│  [All (240)] [Completed] [Pending] [Cancelled]             │
│                             [Search...]  [Filter] [Sort]   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ □  No.  Order ID   Product         Date       Price  │ │
│  │    Status  Payment                                   │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ □  1   #ORD0001   [img] Jacket    01-01-2025  $49.99│ │
│  │                   ● Paid  ✓ Delivered                │ │
│  │ □  2   #ORD0002   [img] Dress     01-01-2025  $14.99│ │
│  │                   ○ Unpaid ⏳ Pending                │ │
│  │ ...                                                  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ← Previous  [1] [2] [3] [4] [5] ... [24]  Next →         │
└────────────────────────────────────────────────────────────┘
```

**Status Badges (VUAL Colors):**
- Delivered: `bg-emerald-50 text-emerald-700`
- Shipped: `bg-blue-50 text-blue-700`
- Pending: `bg-amber-50 text-amber-700`
- Cancelled: `bg-red-50 text-red-700`

---

#### 3.4 Customers (`/admin/customers`)

```
┌────────────────────────────────────────────────────────────┐
│  C U S T O M E R S                                         │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌───────────────────────────────────┐  │
│  │ Total        │  │ Customer Overview  [This week ▼]  │  │
│  │ Customers    │  │                                   │  │
│  │ 11,040       │  │  25k     5.6k    250k     5.5%    │  │
│  │ ↑ 14.4%      │  │  Active  Repeat  Visitors CVR    │  │
│  ├──────────────┤  │                                   │  │
│  │ New          │  │  ┌─────────────────────────────┐  │  │
│  │ Customers    │  │  │     📈 Line Chart           │  │  │
│  │ 2,370        │  │  │     (Weekly trend)          │  │  │
│  │ ↑ 20%        │  │  └─────────────────────────────┘  │  │
│  ├──────────────┤  └───────────────────────────────────┘  │
│  │ Visitors     │                                         │
│  │ 250k         │  Customer Details                       │
│  │ ↑ 20%        │  ┌───────────────────────────────────┐  │
│  └──────────────┘  │ ID      Name    Phone   Orders ... │  │
│                    │ #CUST01 John    +123... 25    ...  │  │
│                    │ #CUST02 Jane    +123... 5     ...  │  │
│                    └───────────────────────────────────┘  │
│                                                            │
│                    ┌─────────────────┐ ← 右サイドパネル    │
│                    │ 👤 John Doe     │   （行クリック時）  │
│                    │ john@email.com  │                    │
│                    │ +1234567890     │                    │
│                    │ 123 Main St, NY │                    │
│                    │ ─────────────── │                    │
│                    │ Total: 150      │                    │
│                    │ Completed: 140  │                    │
│                    │ Cancelled: 10   │                    │
│                    └─────────────────┘                    │
└────────────────────────────────────────────────────────────┘
```

---

#### 3.5 Transactions (`/admin/transactions`)

```
┌────────────────────────────────────────────────────────────┐
│  T R A N S A C T I O N S                                   │
├────────────────────────────────────────────────────────────┤
│  ┌───────────┐ ┌───────────┐ ┌─────────────────────────┐  │
│  │ Total     │ │ Completed │ │ Payment Method          │  │
│  │ Revenue   │ │ Trans.    │ │ ┌─────────────────────┐ │  │
│  │ $15,045   │ │ 3,150     │ │ │ 💳 Stripe ****2345  │ │  │
│  │ ↑ 14.4%   │ │ ↑ 20%     │ │ │ Status: Active      │ │  │
│  ├───────────┤ ├───────────┤ │ │ Trans: 1,250        │ │  │
│  │ Pending   │ │ Failed    │ │ │ Revenue: $50,000    │ │  │
│  │ 150       │ │ 75        │ │ └─────────────────────┘ │  │
│  │ 85%       │ │ 15%       │ │ [+ Add Card] [Deactivate]│ │
│  └───────────┘ └───────────┘ └─────────────────────────┘  │
│                                                            │
│  [All (240)] [Completed] [Pending] [Cancelled]             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Customer   Name    Date       Total   Method  Status │ │
│  │ #CUST001   John    01-01-25   $2,904  CC      ● Done │ │
│  │ ...                                                  │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

#### 3.6 Add Product (`/admin/products/add`) - VUALコア機能

**2カラムレイアウト + Model Casting セクション**

```
┌────────────────────────────────────────────────────────────┐
│  A D D   P R O D U C T                  [Publish] [Draft]  │
├────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐  ┌─────────────────────────┐ │
│  │ Basic Details           │  │ Upload Product Image    │ │
│  │                         │  │                         │ │
│  │ Product Name            │  │  ┌─────────────────┐   │ │
│  │ ┌─────────────────────┐ │  │  │                 │   │ │
│  │ │ Oversized Blazer    │ │  │  │   Drag & Drop   │   │ │
│  │ └─────────────────────┘ │  │  │   or Browse     │   │ │
│  │                         │  │  │                 │   │ │
│  │ Product Description     │  │  └─────────────────┘   │ │
│  │ ┌─────────────────────┐ │  │  [img] [img] [+ Add]   │ │
│  │ │ Premium wool blend  │ │  │                         │ │
│  │ │ oversized blazer... │ │  ├─────────────────────────┤ │
│  │ └─────────────────────┘ │  │ Categories              │ │
│  │                         │  │ [Select category  ▼]    │ │
│  ├─────────────────────────┤  │                         │ │
│  │ Pricing                 │  │ Tags                    │ │
│  │                         │  │ [Select tags     ▼]     │ │
│  │ Price        Currency   │  │                         │ │
│  │ ┌─────────┐  ┌───────┐  │  │ Colors                  │ │
│  │ │ $299.00 │  │ 🇺🇸 ▼ │  │  │ ○ ● ○ ○ ○              │ │
│  │ └─────────┘  └───────┘  │  │                         │ │
│  │                         │  │ Sizes                   │ │
│  │ Discounted Price (Opt.) │  │ [XS] [S] [M] [L] [XL]   │ │
│  │ ┌─────────┐  Sale: $249 │  │                         │ │
│  │ └─────────┘             │  └─────────────────────────┘ │
│  │                         │                              │
│  │ Tax Included  ● Yes ○ No│                              │
│  │                         │                              │
│  ├─────────────────────────┤                              │
│  │ Inventory               │                              │
│  │                         │                              │
│  │ Stock Qty    Status     │                              │
│  │ ┌─────────┐  ┌───────┐  │                              │
│  │ │ 50      │  │In Stock│ │                              │
│  │ └─────────┘  └───────┘  │                              │
│  │ ☑ Unlimited stock       │                              │
│  │ ☑ Feature in collection │                              │
│  └─────────────────────────┘                              │
│                                                            │
│  ═══════════════════════════════════════════════════════  │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │  ✨ M O D E L   C A S T I N G                      │   │ ← VUAL コア機能
│  │  ─────────────────────────────────────────────────  │   │
│  │                                                     │   │
│  │  Generate AI model wearing this product             │   │
│  │                                                     │   │
│  │  Gender           Age Range       Ethnicity         │   │
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐     │   │
│  │  │ Female  ▼ │   │ 25-35   ▼ │   │ Asian   ▼ │     │   │
│  │  └───────────┘   └───────────┘   └───────────┘     │   │
│  │                                                     │   │
│  │  Pose Style       Background                        │   │
│  │  ┌───────────┐   ┌───────────┐                     │   │
│  │  │ Standing▼ │   │ Studio  ▼ │                     │   │
│  │  └───────────┘   └───────────┘                     │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │           ✨ Generate Look                   │   │   │ ← アクセントカラーボタン
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  Generated Looks                                    │   │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                   │   │
│  │  │     │ │     │ │     │ │  +  │                   │   │
│  │  │ img │ │ img │ │ img │ │ Add │                   │   │
│  │  │     │ │     │ │     │ │     │                   │   │
│  │  └─────┘ └─────┘ └─────┘ └─────┘                   │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│             [Save to Draft]  [Publish Product]             │
└────────────────────────────────────────────────────────────┘
```

**Model Casting Options:**
```typescript
const modelCastingOptions = {
  gender: ["Female", "Male", "Non-binary"],
  ageRange: ["18-24", "25-35", "36-45", "46-55", "55+"],
  ethnicity: ["Asian", "Black", "Caucasian", "Hispanic", "Middle Eastern", "Mixed"],
  poseStyle: ["Standing", "Walking", "Sitting", "Dynamic"],
  background: ["Studio White", "Studio Gray", "Outdoor Urban", "Outdoor Nature", "Lifestyle"],
};
```

---

#### 3.7 AI Studio (`/admin/studio`) - VUAL コア機能

**独立したクリエイティブワークスペース**

```
┌────────────────────────────────────────────────────────────┐
│  ✨ V U A L   S T U D I O                                  │
├────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────────────┐ │
│  │ SELECT ITEMS        │  │ GENERATION CANVAS           │ │
│  │                     │  │                             │ │
│  │ [Search products...]│  │  ┌───────────────────────┐  │ │
│  │                     │  │  │                       │  │ │
│  │ ┌─────┐ ┌─────┐     │  │  │                       │  │ │
│  │ │     │ │     │     │  │  │                       │  │ │
│  │ │ ✓  │ │     │     │  │  │    GENERATED LOOK     │  │ │
│  │ │     │ │     │     │  │  │    PREVIEW            │  │ │
│  │ └─────┘ └─────┘     │  │  │                       │  │ │
│  │ Blazer   Pants      │  │  │    (Large Canvas)     │  │ │
│  │                     │  │  │                       │  │ │
│  │ ┌─────┐ ┌─────┐     │  │  │                       │  │ │
│  │ │     │ │     │     │  │  │                       │  │ │
│  │ │     │ │ ✓  │     │  │  │                       │  │ │
│  │ │     │ │     │     │  │  └───────────────────────┘  │ │
│  │ └─────┘ └─────┘     │  │                             │ │
│  │ Shirt    Bag        │  │  MODEL SETTINGS             │ │
│  │                     │  │  ┌──────┐ ┌──────┐ ┌──────┐│ │
│  │ Selected: 2 items   │  │  │Female│ │25-35 │ │Asian ││ │
│  │                     │  │  └──────┘ └──────┘ └──────┘│ │
│  │                     │  │                             │ │
│  │                     │  │  [✨ Generate New Look]     │ │
│  │                     │  │                             │ │
│  │                     │  │  HISTORY                    │ │
│  │                     │  │  ┌───┐ ┌───┐ ┌───┐ ┌───┐  │ │
│  │                     │  │  │   │ │   │ │   │ │   │  │ │
│  │                     │  │  └───┘ └───┘ └───┘ └───┘  │ │
│  └─────────────────────┘  └─────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

**Loading State (Framer Motion):**
```tsx
// スケルトンローディング + パルスエフェクト
<motion.div
  className="bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100"
  animate={{
    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
  }}
  transition={{
    duration: 2,
    repeat: Infinity,
    ease: "linear",
  }}
/>

// 波紋エフェクト
<motion.div
  className="absolute inset-0 rounded-full border-2 border-accent"
  animate={{
    scale: [1, 2],
    opacity: [0.5, 0],
  }}
  transition={{
    duration: 1.5,
    repeat: Infinity,
  }}
/>
```

---

#### 3.8 Live Broadcast (`/admin/live`) - VUAL コア機能

```
┌────────────────────────────────────────────────────────────┐
│  📡 L I V E   B R O A D C A S T                            │
├────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐  ┌─────────────────────────┐ │
│  │ PREVIEW                 │  │ PRODUCT CASTING AREA    │ │
│  │                         │  │                         │ │
│  │  ┌───────────────────┐  │  │ [Search products...]    │ │
│  │  │                   │  │  │                         │ │
│  │  │   CAMERA FEED     │  │  │ Products to Feature     │ │
│  │  │                   │  │  │ ┌─────┐ Blazer   $299  │ │
│  │  │   (Live Preview)  │  │  │ │ img │ ──────────────│ │
│  │  │                   │  │  │ └─────┘ [↑] [↓] [×]   │ │
│  │  │                   │  │  │                         │ │
│  │  └───────────────────┘  │  │ ┌─────┐ Dress    $199  │ │
│  │                         │  │ │ img │ ──────────────│ │
│  │  Stream Settings        │  │ └─────┘ [↑] [↓] [×]   │ │
│  │  Title: [Summer Col...]  │  │                         │ │
│  │  Category: [Fashion ▼]  │  │ ┌─────┐ Bag      $149  │ │
│  │                         │  │ │ img │ ──────────────│ │
│  │  ┌───────────────────┐  │  │ └─────┘ [↑] [↓] [×]   │ │
│  │  │                   │  │  │                         │ │
│  │  │   🔴 GO LIVE      │  │  │ [+ Add Product]         │ │
│  │  │                   │  │  │                         │ │
│  │  └───────────────────┘  │  │ Scheduled: 14:00 JST    │ │
│  │                         │  │ Duration: ~30min        │ │
│  │  ○ Schedule for later   │  │                         │ │
│  └─────────────────────────┘  └─────────────────────────┘ │
│                                                            │
│  Past Broadcasts                                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Title          Date       Duration  Views  Revenue   │ │
│  │ Summer Sale    Feb 20     32:15     1.2k   $4,500   │ │
│  │ New Arrivals   Feb 18     45:30     890    $3,200   │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

#### 3.9 Profile Settings (`/admin/settings/profile`)

```
┌────────────────────────────────────────────────────────────┐
│  P R O F I L E                                             │
├────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────────────┐ │
│  │ Profile             │  │ Profile Update       [Edit] │ │
│  │                     │  │                             │ │
│  │      ┌─────┐        │  │ [Avatar] [Upload] [Delete]  │ │
│  │      │ 👤  │        │  │                             │ │
│  │      └─────┘        │  │ First Name    Last Name     │ │
│  │   Wade Warren       │  │ ┌─────────┐  ┌─────────┐   │ │
│  │   wade@example.com  │  │ │ Wade    │  │ Warren  │   │ │
│  │                     │  │ └─────────┘  └─────────┘   │ │
│  │ Linked Accounts     │  │                             │ │
│  │ [G] [f] [X]         │  │ Email         Phone         │ │
│  │                     │  │ ┌─────────┐  ┌─────────┐   │ │
│  ├─────────────────────┤  │ │ wade@...│  │+1 (406)│   │ │
│  │ Change Password     │  │ └─────────┘  └─────────┘   │ │
│  │                     │  │                             │ │
│  │ Current Password    │  │ Location                    │ │
│  │ ┌─────────────────┐ │  │ ┌─────────────────────────┐│ │
│  │ │ ************    │ │  │ │ 2972 Westheimer Rd...   ││ │
│  │ └─────────────────┘ │  │ └─────────────────────────┘│ │
│  │                     │  │                             │ │
│  │ New Password        │  │ Biography                   │ │
│  │ ┌─────────────────┐ │  │ ┌─────────────────────────┐│ │
│  │ │                 │ │  │ │ Enter a biography...    ││ │
│  │ └─────────────────┘ │  │ └─────────────────────────┘│ │
│  │                     │  │                             │ │
│  │ [Save Change]       │  │            [Save Changes]   │ │
│  └─────────────────────┘  └─────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

### Phase 4: AIパイプライン統合

#### 4.1 Gemini 2.5 Flash Lite（解析）
- 商品画像の解析
- 最適画角判定
- 商品コピー生成

#### 4.2 Vertex AI VTON/Imagen（生成）
- アパレル → VTON API
- 小物/アクセサリー → Imagen（Inpainting）
- 動的ルーティング

---

### Phase 5: ライブ配信統合

- Mux API組み込み
- 配信者側（Admin）ストリーム管理
- 視聴者側（Customer）リアルタイム再生
- 商品オーバーレイ同期

---

## ファイル構成（詳細）

```
vual/
├── messages/                       # i18n 翻訳ファイル
│   ├── en.json                     # English (Default)
│   └── ja.json                     # Japanese
│
├── i18n.ts                         # next-intl configuration
├── middleware.ts                   # Locale detection & routing
│
├── app/
│   ├── globals.css
│   ├── layout.tsx                  # ルートレイアウト（ThemeProvider含む）
│   ├── not-found.tsx               # 404ページ
│   │
│   ├── [locale]/                   # i18n ルートグループ
│   │   ├── layout.tsx              # Locale Provider
│   │   ├── page.tsx                # Customer Home / Storefront
│   │   │
│   │   ├── (customer)/             # 顧客向けルートグループ
│   │   │   ├── layout.tsx          # CustomerLayout（Header/Footer）
│   │   │   ├── category/
│   │   │   │   └── [slug]/page.tsx # カテゴリ一覧
│   │   │   ├── product/
│   │   │   │   └── [id]/page.tsx   # 商品詳細
│   │   │   ├── cart/
│   │   │   │   └── page.tsx        # カート
│   │   │   ├── checkout/
│   │   │   │   └── page.tsx        # チェックアウト
│   │   │   ├── search/
│   │   │   │   └── page.tsx        # 検索
│   │   │   ├── collection/
│   │   │   │   └── [slug]/page.tsx # コレクション詳細
│   │   │   ├── blog/
│   │   │   │   ├── page.tsx        # ブログ一覧
│   │   │   │   └── [slug]/page.tsx # ブログ詳細
│   │   │   ├── about/
│   │   │   │   └── page.tsx        # Our Story
│   │   │   └── contact/
│   │   │       └── page.tsx        # Contact Us
│   │   │
│   │   ├── live/
│   │   │   └── page.tsx            # ライブコマース視聴
│   │   │
│   │   └── admin/                  # 管理画面
│   │       ├── layout.tsx          # AdminLayout（Sidebar + TopNav）
│   │       ├── page.tsx            # ダッシュボード
│   │       ├── orders/
│   │       │   └── page.tsx        # 注文管理
│   │       ├── customers/
│   │       │   └── page.tsx        # 顧客管理
│   │       ├── coupons/
│   │       │   └── page.tsx        # クーポン管理
│   │       ├── transactions/
│   │       │   └── page.tsx        # 取引管理
│   │       ├── products/
│   │       │   ├── page.tsx        # 商品一覧
│   │       │   ├── add/
│   │       │   │   └── page.tsx    # 商品登録 + Model Casting
│   │       │   └── media/
│   │       │       └── page.tsx    # メディア管理
│   │       ├── studio/
│   │       │   └── page.tsx        # ✨ AI Studio (VUAL Core)
│   │       ├── live/
│   │       │   └── page.tsx        # 📡 Live Broadcast (VUAL Core)
│   │       └── settings/
│   │           ├── profile/
│   │           │   └── page.tsx    # プロフィール設定
│   │           └── team/
│   │               └── page.tsx    # チーム管理
│   │
│   └── api/
│       ├── ai/
│       │   ├── analyze/route.ts    # Gemini解析
│       │   └── generate/route.ts   # VTON生成
│       ├── stripe/
│       │   └── checkout/route.ts
│       └── live/
│           └── stream/route.ts
│
├── components/
│   ├── ui/                         # 共通UIコンポーネント
│   │   ├── Button.tsx              # アクセントカラー対応ボタン
│   │   ├── Card.tsx                # 極細ボーダーカード
│   │   ├── Modal.tsx               # Framer Motionアニメーション
│   │   ├── Input.tsx               # フォーム入力
│   │   ├── Select.tsx              # ドロップダウン
│   │   ├── Skeleton.tsx            # ローディング
│   │   ├── Accordion.tsx           # 折りたたみ
│   │   ├── Tabs.tsx                # タブUI
│   │   ├── Pagination.tsx          # ページネーション
│   │   ├── Badge.tsx               # タグ/バッジ
│   │   └── ThemeProvider.tsx       # テーマ切替コンテキスト
│   │
│   ├── customer/                   # 顧客向けコンポーネント
│   │   ├── layout/
│   │   │   ├── CustomerHeader.tsx  # ☰ Logo 🔍 🛒
│   │   │   ├── CustomerFooter.tsx  # SNS、連絡先、ナビ
│   │   │   └── MenuDrawer.tsx      # スライドインメニュー
│   │   ├── home/
│   │   │   ├── HeroSection.tsx     # フルwidth画像 + CTA
│   │   │   ├── CategoryTabs.tsx    # 横スクロールタブ
│   │   │   └── CollectionBanner.tsx
│   │   ├── product/
│   │   │   ├── ProductGrid.tsx     # 2カラムグリッド
│   │   │   ├── ProductListView.tsx # リスト表示
│   │   │   ├── ProductCard.tsx     # 画像 + 情報 + ハート
│   │   │   ├── ImageCarousel.tsx   # スワイプカルーセル
│   │   │   ├── ColorSwatches.tsx   # カラー選択
│   │   │   ├── SizeSelector.tsx    # サイズ選択
│   │   │   ├── AddToBasketButton.tsx
│   │   │   └── RelatedProducts.tsx # 関連商品
│   │   ├── cart/
│   │   │   ├── CartItem.tsx        # カート商品行
│   │   │   ├── CartEmpty.tsx       # 空状態
│   │   │   └── CartSummary.tsx     # 合計 + チェックアウト
│   │   ├── checkout/
│   │   │   ├── AddressSection.tsx
│   │   │   ├── ShippingMethod.tsx
│   │   │   ├── PaymentMethod.tsx
│   │   │   ├── PromoCode.tsx
│   │   │   └── PaymentSuccess.tsx  # 成功モーダル
│   │   ├── search/
│   │   │   ├── SearchInput.tsx
│   │   │   ├── RecentSearches.tsx
│   │   │   └── SearchResults.tsx
│   │   ├── blog/
│   │   │   ├── BlogGridView.tsx
│   │   │   └── BlogListView.tsx
│   │   └── live/
│   │       ├── LiveHeader.tsx      # 戻る、ショップ情報、通知
│   │       ├── LivePlayer.tsx      # フルスクリーン動画
│   │       ├── CommentStream.tsx   # リアルタイムコメント
│   │       ├── ReactionBar.tsx     # 右サイドリアクション
│   │       ├── CommentInput.tsx    # コメント入力
│   │       ├── ProductSheet.tsx    # スライドアップ商品リスト
│   │       └── ProductRow.tsx      # 商品行
│   │
│   └── admin/                      # 管理画面コンポーネント
│       ├── layout/
│       │   ├── AdminSidebar.tsx    # 左サイドバー
│       │   ├── AdminTopNav.tsx     # トップナビゲーション
│       │   └── AdminLayout.tsx     # レイアウト統合
│       ├── dashboard/
│       │   ├── StatCard.tsx        # 統計カード
│       │   ├── WeeklyReport.tsx    # 週次レポート + グラフ
│       │   ├── RealtimeUsers.tsx   # リアルタイムユーザー
│       │   ├── SalesByCountry.tsx  # 国別売上
│       │   ├── TransactionTable.tsx # 取引テーブル
│       │   ├── TopProducts.tsx     # トップ商品
│       │   └── QuickAdd.tsx        # クイック追加
│       ├── orders/
│       │   ├── OrderStats.tsx      # 注文統計カード群
│       │   ├── OrderTable.tsx      # 注文テーブル
│       │   └── OrderStatusBadge.tsx # ステータスバッジ
│       ├── customers/
│       │   ├── CustomerStats.tsx   # 顧客統計
│       │   ├── CustomerOverview.tsx # 概要 + グラフ
│       │   ├── CustomerTable.tsx   # 顧客テーブル
│       │   └── CustomerDetail.tsx  # 詳細パネル
│       ├── transactions/
│       │   ├── TransactionStats.tsx
│       │   ├── PaymentMethod.tsx   # 支払い方法カード
│       │   └── TransactionTable.tsx
│       ├── products/
│       │   ├── ProductForm.tsx     # 商品フォーム
│       │   ├── ImageUploader.tsx   # 画像アップロード
│       │   ├── PricingSection.tsx  # 価格設定
│       │   ├── InventorySection.tsx # 在庫設定
│       │   ├── CategorySelect.tsx  # カテゴリ選択
│       │   ├── ColorSelect.tsx     # カラー選択
│       │   ├── SizeSelect.tsx      # サイズ選択
│       │   └── ModelCasting.tsx    # ✨ AI Model Casting (VUAL Core)
│       ├── studio/
│       │   ├── ItemSelector.tsx    # 商品選択パネル
│       │   ├── GenerationCanvas.tsx # 生成キャンバス
│       │   ├── ModelSettings.tsx   # モデル設定
│       │   ├── GenerateButton.tsx  # 生成ボタン
│       │   ├── GenerationHistory.tsx # 生成履歴
│       │   ├── SkeletonLoader.tsx  # スケルトンローディング
│       │   └── PulseEffect.tsx     # 波紋エフェクト
│       ├── live/
│       │   ├── CameraPreview.tsx   # カメラプレビュー
│       │   ├── StreamSettings.tsx  # 配信設定
│       │   ├── GoLiveButton.tsx    # GO LIVEボタン
│       │   ├── ProductCastingArea.tsx # 商品キャスティング
│       │   └── BroadcastHistory.tsx # 配信履歴
│       └── settings/
│           ├── ProfileCard.tsx     # プロフィールカード
│           ├── ProfileForm.tsx     # プロフィールフォーム
│           ├── PasswordChange.tsx  # パスワード変更
│           └── LinkedAccounts.tsx  # SNS連携
│
├── lib/
│   ├── firebase.ts
│   ├── stripe.ts
│   ├── mux.ts
│   └── ai/
│       ├── gemini.ts
│       └── vertex-vton.ts
│
├── hooks/
│   ├── useAuth.ts
│   ├── useFirestore.ts
│   ├── useTheme.ts
│   ├── useCart.ts
│   └── useSearch.ts
│
├── types/
│   └── index.ts
│
├── styles/
│   └── themes.css                  # 4テーマのCSS変数定義
│
├── tailwind.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 実装順序（詳細タスクリスト）

### Step 1: プロジェクト初期化
```bash
npx create-next-app@latest vual --typescript --tailwind --app --src-dir=false
cd vual
npm install framer-motion
npm install firebase
npm install @stripe/stripe-js stripe
npm install lucide-react  # アイコン
```

### Step 2: デザインシステム構築

**2.1 テーマCSS変数定義 (`styles/themes.css`)**

```css
/* ========================================
   VUAL DEFAULT THEME (デフォルト)
   ウォームでエレガントなブランドカラー
   ======================================== */
:root, [data-theme="vual"] {
  /* Text Colors */
  --color-title-active: #000000;      /* リンク・タイトル */
  --color-text-body: #3D3D3D;         /* 本文テキスト */
  --color-text-label: #5C5C5C;        /* ラベル */
  --color-text-placeholder: #8C8C8C; /* プレースホルダー */

  /* Background Colors */
  --color-bg-page: #FAFAFA;           /* ページ背景 (Off-white) */
  --color-bg-element: #FBF6F0;        /* 要素背景 (Background) */
  --color-bg-input: #F5EDE6;          /* 入力背景 (Input Background) */
  --color-line: #D4C4B0;              /* ライン・ボーダー */

  /* Brand Colors */
  --color-primary: #A67C5B;           /* プライマリ (ブラウン) */
  --color-secondary: #C48B6C;         /* セカンダリ/アクセント (コーラル) */
  --color-accent: #C48B6C;            /* アクセント（ボタン等） */
  --color-price: #C48B6C;             /* 価格表示 */

  /* Inverse (Dark) */
  --color-bg-inverse: #000000;
  --color-text-inverse: #FFFFFF;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* Typography */
  --font-heading: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  --letter-spacing-wide: 0.15em;
  --letter-spacing-wider: 0.2em;
}

/* ========================================
   THEME: MODERN (モード系)
   ======================================== */
[data-theme="modern"] {
  --color-title-active: #18181B;
  --color-text-body: #3F3F46;
  --color-text-label: #71717A;
  --color-text-placeholder: #A1A1AA;

  --color-bg-page: #FFFFFF;
  --color-bg-element: #FAFAFA;
  --color-bg-input: #F4F4F5;
  --color-line: #E4E4E7;

  --color-primary: #18181B;
  --color-secondary: #0055FF;
  --color-accent: #0055FF;
  --color-price: #0055FF;

  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 6px;
}

/* ========================================
   THEME: ORGANIC (ナチュラル・北欧系)
   ======================================== */
[data-theme="organic"] {
  --color-title-active: #2D3A2D;
  --color-text-body: #4A5A4A;
  --color-text-label: #6B7B6B;
  --color-text-placeholder: #9CAA9C;

  --color-bg-page: #FDFBF7;
  --color-bg-element: #F5F2ED;
  --color-bg-input: #EDEAE5;
  --color-line: #D8D4CF;

  --color-primary: #2D3A2D;
  --color-secondary: #6B7F5E;
  --color-accent: #6B7F5E;
  --color-price: #6B7F5E;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
}

/* ========================================
   THEME: STREET (ストリート/ブルータリズム)
   ======================================== */
[data-theme="street"] {
  --color-title-active: #000000;
  --color-text-body: #1A1A1A;
  --color-text-label: #4A4A4A;
  --color-text-placeholder: #7A7A7A;

  --color-bg-page: #FFFFFF;
  --color-bg-element: #FFFFFF;
  --color-bg-input: #F0F0F0;
  --color-line: #000000;
  --border-width: 3px;

  --color-primary: #000000;
  --color-secondary: #ED1C24;
  --color-accent: #ED1C24;
  --color-price: #ED1C24;

  --radius-sm: 0px;
  --radius-md: 0px;
  --radius-lg: 0px;

  --font-heading: 'Inter', sans-serif;
  --font-weight-heading: 900;
  --text-transform-heading: uppercase;
}

/* ========================================
   THEME: ELEGANT (コンサバ・フェミニン系)
   ======================================== */
[data-theme="elegant"] {
  --color-title-active: #2C2828;
  --color-text-body: #4A4545;
  --color-text-label: #7A7575;
  --color-text-placeholder: #B0ABAB;

  --color-bg-page: #FFFCFA;
  --color-bg-element: #FBF9F7;
  --color-bg-input: #F7F4F2;
  --color-line: #E8E3E0;

  --color-primary: #2C2828;
  --color-secondary: #C9A8A0;
  --color-accent: #C9A8A0;
  --color-price: #C9A8A0;

  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 24px;

  --font-heading: 'Playfair Display', serif;
  --shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.04);
}
```

**2.2 Tailwind設定 (`tailwind.config.ts`)**
- CSS変数をTailwindカラーに統合
- カスタムフォント設定
- アニメーション設定

**2.3 共通UIコンポーネント**
- `Button.tsx` - variant: primary/secondary/ghost
- `Card.tsx` - 極細ボーダー、hover時微細scale
- `Modal.tsx` - Framer Motion fade/slide
- `Input.tsx` - ミニマルボーダー
- `Accordion.tsx` - スムーズ開閉
- `Tabs.tsx` - アンダーラインアニメーション
- `Pagination.tsx` - 数字 + 矢印
- `Skeleton.tsx` - パルスアニメーション
- `ThemeProvider.tsx` - data-theme切替

### Step 3: Customer App - レイアウト & ホーム

**3.1 レイアウト**
- `app/layout.tsx` - フォント読み込み、ThemeProvider
- `components/customer/layout/CustomerHeader.tsx`
- `components/customer/layout/CustomerFooter.tsx`
- `components/customer/layout/MenuDrawer.tsx`

**3.2 ホーム画面 (`app/page.tsx`)**
- `HeroSection.tsx` - フルwidth画像 + オーバーレイ + CTA
- `CategoryTabs.tsx` - 横スクロール + アクティブ状態
- `ProductGrid.tsx` - 2カラム
- `ProductCard.tsx` - 画像 + ハート + ブランド + 商品名 + 価格
- `CollectionBanner.tsx`

### Step 4: Customer App - 商品系画面

**4.1 カテゴリ一覧 (`app/(customer)/category/[slug]/page.tsx`)**
- `CategoryHeader.tsx` - 件数、ソート、表示切替
- `FilterTags.tsx` - アクティブフィルター
- `ProductGridView.tsx` / `ProductListView.tsx`
- `Pagination.tsx`

**4.2 商品詳細 (`app/(customer)/product/[id]/page.tsx`)**
- `ImageCarousel.tsx` - スワイプ + ドットインジケーター
- `ColorSwatches.tsx` - 丸いカラー選択
- `SizeSelector.tsx` - サイズボタン
- `AddToBasketButton.tsx` - 黒背景CTA
- `AccordionSection.tsx` - MATERIALS, CARE, Shipping等
- `RelatedProducts.tsx` - 横スクロール

### Step 5: Customer App - カート & チェックアウト

**5.1 カート (`app/(customer)/cart/page.tsx`)**
- `CartItem.tsx` - 画像 + 情報 + 数量変更 + 削除
- `CartEmpty.tsx` - 空状態UI
- `CartSummary.tsx` - 合計 + CHECKOUTボタン

**5.2 チェックアウト (`app/(customer)/checkout/page.tsx`)**
- `AddressSection.tsx` - 配送先選択/追加
- `ShippingMethod.tsx` - 配送方法選択
- `PaymentMethod.tsx` - 支払い方法選択
- `PromoCode.tsx` - クーポンコード入力
- `PaymentSuccess.tsx` - 成功モーダル

### Step 6: Customer App - 検索 & その他

**6.1 検索 (`app/(customer)/search/page.tsx`)**
- `SearchInput.tsx` - 検索バー
- `RecentSearches.tsx` - 最近の検索タグ
- `SearchResults.tsx` - 結果グリッド

**6.2 ブログ (`app/(customer)/blog/page.tsx`)**
- `BlogGridView.tsx`
- `BlogListView.tsx`

**6.3 静的ページ**
- `app/(customer)/about/page.tsx`
- `app/(customer)/contact/page.tsx`
- `app/not-found.tsx`

### Step 7: ライブコマース視聴画面

`app/live/page.tsx` + 関連コンポーネント:
- `LiveHeader.tsx`
- `LivePlayer.tsx` (playsinline対応)
- `CommentStream.tsx` (Framer Motionアニメーション)
- `ReactionBar.tsx`
- `CommentInput.tsx`
- `ProductSheet.tsx` (Glassmorphism)
- `ProductRow.tsx`

### Step 8: i18n Setup

```bash
npm install next-intl
```

**8.1 Configuration Files**
- `i18n.ts` - next-intl configuration
- `middleware.ts` - Locale detection
- `messages/en.json` - English translations (default)
- `messages/ja.json` - Japanese translations

**8.2 Translation Structure**
```json
{
  "common": { "search": "Search", "save": "Save", ... },
  "admin": {
    "sidebar": { "dashboard": "Dashboard", ... },
    "dashboard": { "totalSales": "Total Sales", ... },
    "orders": { "title": "Order Management", ... },
    "customers": { "title": "Customers", ... },
    "products": { "addProduct": "Add Product", ... },
    "studio": { "title": "AI Studio", "generate": "Generate Look", ... },
    "live": { "title": "Live Broadcast", "goLive": "Go Live", ... }
  },
  "customer": { ... }
}
```

---

### Step 9: Admin Web App

**9.1 Admin Layout**
- `components/admin/layout/AdminSidebar.tsx`
  - VUAL logo
  - Menu sections: Main Menu, Product, VUAL, Settings
  - Active state: accent color background
  - User info + Your Shop link
- `components/admin/layout/AdminTopNav.tsx`
  - Page title (letter-spacing)
  - Search bar
  - Notification bell
  - Dark mode toggle
  - Language switcher (🌐)
  - Profile avatar
- `app/[locale]/admin/layout.tsx` - Layout integration

**9.2 Dashboard (`/admin`)**
- `StatCard.tsx` - Total Sales, Orders, Pending stats
- `WeeklyReport.tsx` - Period toggle + metrics + line chart
- `RealtimeUsers.tsx` - Real-time count + bar chart
- `SalesByCountry.tsx` - Flag + country + sales
- `TransactionTable.tsx` - Recent transactions
- `TopProducts.tsx` - Product ranking with search
- `BestSellingTable.tsx` - Product table with status
- `QuickAdd.tsx` - Category shortcuts

**9.3 Orders (`/admin/orders`)**
- `OrderStats.tsx` - 4 stat cards (Total, New, Completed, Cancelled)
- `OrderTable.tsx` - Full order table with tabs
- `OrderStatusBadge.tsx` - Status badges (Delivered, Pending, etc.)
- Pagination component

**9.4 Customers (`/admin/customers`)**
- `CustomerStats.tsx` - Left sidebar stats
- `CustomerOverview.tsx` - Metrics + line chart
- `CustomerTable.tsx` - Customer list
- `CustomerDetail.tsx` - Right panel on row click

**9.5 Transactions (`/admin/transactions`)**
- `TransactionStats.tsx` - Revenue, Completed, Pending, Failed
- `PaymentMethod.tsx` - Stripe card visual
- `TransactionTable.tsx` - Payment history

**9.6 Add Product (`/admin/products/add`) - VUAL Core**
- `ProductForm.tsx` - Main form container
- `ImageUploader.tsx` - Drag & drop with preview
- `PricingSection.tsx` - Price, discount, tax
- `InventorySection.tsx` - Stock qty, status
- `CategorySelect.tsx` - Category dropdown
- `ColorSelect.tsx` - Color swatches
- `SizeSelect.tsx` - Size buttons
- **`ModelCasting.tsx`** - ✨ VUAL Core Feature
  - Gender selector
  - Age range selector
  - Ethnicity selector
  - Pose style selector
  - Background selector
  - "Generate Look" button (accent color)
  - Generated looks gallery

**9.7 AI Studio (`/admin/studio`) - VUAL Core**
- `ItemSelector.tsx` - Left panel product grid
- `GenerationCanvas.tsx` - Large preview canvas
- `ModelSettings.tsx` - Quick model settings
- `GenerateButton.tsx` - Main CTA
- `GenerationHistory.tsx` - Past generations
- `SkeletonLoader.tsx` - Framer Motion skeleton
- `PulseEffect.tsx` - Ripple animation

**9.8 Live Broadcast (`/admin/live`) - VUAL Core**
- `CameraPreview.tsx` - Video feed preview
- `StreamSettings.tsx` - Title, category
- `GoLiveButton.tsx` - Large red GO LIVE button
- `ProductCastingArea.tsx` - Product list for stream
- `BroadcastHistory.tsx` - Past broadcasts table

**9.9 Settings (`/admin/settings/profile`)**
- `ProfileCard.tsx` - Avatar, name, email, social links
- `ProfileForm.tsx` - Editable fields
- `PasswordChange.tsx` - Password update form
- `LinkedAccounts.tsx` - Social media connections

### Step 9: バックエンド統合

**9.1 Firebase**
- `lib/firebase.ts` - 初期化
- Firestore: products, orders, users, streams
- Cloud Storage: 商品画像、生成画像
- Firebase Auth: 店舗スタッフ認証

**9.2 Stripe**
- `lib/stripe.ts`
- `app/api/stripe/checkout/route.ts`

**9.3 AI パイプライン**
- `lib/ai/gemini.ts` - 画像解析
- `lib/ai/vertex-vton.ts` - VTON生成
- `app/api/ai/analyze/route.ts`
- `app/api/ai/generate/route.ts`

**9.4 ライブ配信**
- `lib/mux.ts`
- `app/api/live/stream/route.ts`

---

## VUALデザインシステム適用ルール

参考画像のUIを以下のVUALルールで変換:

| 参考画像の要素 | VUAL適用 |
|--------------|---------|
| オレンジの価格表示 | → `var(--color-accent)` アクセントカラー |
| セリフ体ロゴ | → サンセリフ体（Inter/Helvetica Neue） |
| ドロップシャドウ | → 削除。余白 or 極細1pxライン |
| 太い枠線 | → theme-street以外は極細 or 無し |
| 角丸 | → テーマにより可変（`var(--radius-md)`） |
| 緑/青の汎用ボタン | → 黒背景 or アクセントカラー |
| 装飾的な要素 | → 削ぎ落とし、写真を主役に |

**Framer Motion適用箇所:**
- ページ遷移: `ease-in-out` フェード
- モーダル出現: スケールアップ + フェード
- ProductCard hover: 微細スケール（1.02）
- ボタン hover: アクセントカラー広がりエフェクト
- MenuDrawer: 右からスライドイン
- ProductSheet: 下からスライドアップ
- CommentStream: 新コメント時フェードイン
- PaymentSuccess: チェックアイコンアニメーション

---

## 検証方法

1. **開発サーバー起動**: `npm run dev`

2. **i18n テスト**:
   - `http://localhost:3000/en` - English (default)
   - `http://localhost:3000/ja` - Japanese
   - 言語切替UIの動作確認

3. **テーマ切替テスト**:
   ```js
   // ブラウザコンソールで実行
   document.documentElement.setAttribute('data-theme', 'vual')    // Default
   document.documentElement.setAttribute('data-theme', 'modern')
   document.documentElement.setAttribute('data-theme', 'organic')
   document.documentElement.setAttribute('data-theme', 'street')
   document.documentElement.setAttribute('data-theme', 'elegant')
   ```

4. **Customer画面確認**:
   - `http://localhost:3000/en` - Home / Storefront
   - `http://localhost:3000/en/category/apparel` - Category
   - `http://localhost:3000/en/product/1` - Product Detail
   - `http://localhost:3000/en/cart` - Cart
   - `http://localhost:3000/en/checkout` - Checkout
   - `http://localhost:3000/en/search` - Search
   - `http://localhost:3000/en/live` - Live Commerce

5. **Admin画面確認**:
   - `http://localhost:3000/en/admin` - Dashboard
   - `http://localhost:3000/en/admin/orders` - Order Management
   - `http://localhost:3000/en/admin/customers` - Customers
   - `http://localhost:3000/en/admin/transactions` - Transactions
   - `http://localhost:3000/en/admin/products/add` - Add Product + Model Casting
   - `http://localhost:3000/en/admin/studio` - ✨ AI Studio
   - `http://localhost:3000/en/admin/live` - 📡 Live Broadcast
   - `http://localhost:3000/en/admin/settings/profile` - Profile Settings

6. **VUAL Core機能確認**:
   - Model Casting: セレクター操作、Generate Look ボタン
   - AI Studio: アイテム選択、キャンバス表示、ローディングアニメーション
   - Live Broadcast: カメラプレビュー、GO LIVE ボタン、商品キャスティング

7. **レスポンシブ確認**:
   - Customer: Mobile (375px), Tablet (768px)
   - Admin: Tablet (768px), Desktop (1280px), Large (1536px)

8. **アニメーション確認**:
   - Framer Motion: ページ遷移、モーダル、ホバーエフェクト
   - AI Studio: スケルトンローディング、パルスエフェクト

---

## 実装方針

| 項目 | 設定 |
|------|------|
| **デフォルト言語** | English (`en`) |
| **デフォルトテーマ** | `theme-vual` (Warm/Coral) |
| **外部連携** | モック実装から開始 |
| **LINE LIFF** | UI完成後に統合 |

**実装優先度:**
1. Phase 1: 基礎インフラ + i18n Setup
2. Phase 9: Admin Dashboard + VUAL Core (Studio, Live, Model Casting)
3. Phase 2-7: Customer LIFF App
4. Phase 10: バックエンド統合（Firebase, Stripe, AI API）

**Admin Design Rules (VUAL適用):**
- ❌ 緑色のアクセント → ✅ VUALアクセントカラー（コーラル `#C48B6C`）
- ❌ 丸みを帯びたデザイン → ✅ シャープな角丸 (`rounded-sm`, `rounded-md`)
- ❌ ドロップシャドウ → ✅ 余白 or 極細ボーダー (`border-gray-100`)
- ❌ 太い枠線 → ✅ 1px ライン
- 背景: `#FFFFFF` or `#F9FAFB`
- テキスト: `#111827` (漆黒)
