# VUAL - ファッションテック SaaS プラットフォーム 全体設計書

> 最終更新: 2026-02-24

---

## プロジェクト概要

VUALは、ファッションブランド・ショップ・PRエージェント向けのSaaSプラットフォーム。
各テナント（ショップ/ブランド/PRエージェント）がサブスクし、自社の顧客向けにECストア・ライブ配信・バーチャル試着・LINE通知などの機能を提供できる。

最終的にはマーケットプレイス（顧客が全ショップを横断閲覧）やPRプラットフォーム（スタイリストがサンプル貸出を打診）も実現する。

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 14 (App Router) + TypeScript |
| スタイリング | Tailwind CSS + CSS Variables テーマ |
| 状態管理 | Zustand |
| アニメーション | Framer Motion |
| i18n | next-intl (ja/en) |
| データベース | Supabase (PostgreSQL) |
| 認証 | LINE LIFF + Firebase Google Auth |
| 決済 | Stripe Checkout + Webhooks |
| ストレージ | Firebase Storage |
| ライブ配信 | Mux (HLS) |
| バーチャル試着 | Google Vertex AI (VTON) |
| LINE通知 | LINE Messaging API (店舗別トークン) |
| デプロイ | Vercel |

---

## URL設計 (マルチテナント)

```
メインドメイン: vual.jp

顧客向け:
  vual.jp/explore              → マーケットプレイス（全ショップ横断）
  {shop}.vual.jp               → 個別ショップストア (例: estnation.vual.jp)
  {shop}.vual.jp/product/{id}  → 商品詳細
  {shop}.vual.jp/live          → ライブ配信
  {shop}.vual.jp/tryon         → バーチャル試着

管理画面:
  {shop}.vual.jp/admin         → ショップ管理画面
  admin.vual.jp                → VUAL運営管理（スーパーAdmin）

PRエージェント:
  pr.vual.jp                   → PRエージェントポータル
  pr.vual.jp/brands            → 取り扱いブランド管理
  pr.vual.jp/samples           → サンプル管理・スケジュール
  pr.vual.jp/requests          → リース依頼管理

セールスエージェント:
  sales.vual.jp                → セールスエージェントポータル
  sales.vual.jp/clients        → クライアント（ショップ）管理
  sales.vual.jp/orders         → 卸注文管理
  sales.vual.jp/analytics      → 売上分析

カスタムドメイン（将来プレミアム機能）:
  shop.estnation.co.jp → estnation.vual.jp へのCNAME
```

---

## データベース設計 (Supabase)

### 既存テーブル
```sql
stores          -- ショップ/テナント情報
products        -- 商品 (store_id で紐付け)
brands          -- ブランド
categories      -- カテゴリ
media           -- メディア（画像/動画）
customers       -- 顧客情報
orders          -- 注文 (Stripe連携)
streams         -- ライブ配信 (Mux連携)
```

### stores テーブル LINE連携カラム (Migration 007)
```sql
line_channel_access_token TEXT    -- 店舗のLINEチャネルアクセストークン
line_channel_id           TEXT    -- チャネルID
line_bot_basic_id         TEXT    -- Bot ID (@xxx) - LINE自動割り当て・変更不可
line_connected_at         TIMESTAMPTZ -- 連携日時
```

### 将来追加予定テーブル
```sql
-- Phase 2: マルチテナント
store_domains       -- サブドメイン/カスタムドメイン管理
subscriptions       -- サブスクリプション管理 (Stripe)

-- Phase 4: PRエージェント
pr_agencies         -- PRエージェント情報
samples             -- サンプル情報 + 画像 + ブランド紐付け
sample_schedules    -- 貸出スケジュール + 空き状況
lease_requests      -- リース打診 + ステータス管理

-- Phase 5: セールスエージェント
sales_agencies      -- セールスエージェント情報
wholesale_orders    -- 卸注文
```

---

## Phase 1: 顧客アプリ基本機能 ✅ 完了

### Step 1: ボトムナビバー + レイアウト ✅
- 5タブ: ホーム / 探す / ライブ / 試着 / マイページ
- frosted glass スタイル
- スクロール連動表示/非表示

### Step 2: Google OAuth + 統合認証 ✅
- LINE LIFF 自動ログイン（LINE内ブラウザ）
- Google OAuth（Web直接アクセス）
- `authMethod: 'line' | 'google' | null` で認証方式を管理

### Step 3: マイページ ✅
- 未ログイン: LINE / Google ログインボタン
- ログイン済: プロフィール + メニューリスト
- LINE友だち追加バナー（LINE以外でログイン時に表示）

### Step 4: 注文履歴 ✅
- 注文一覧（タブ: すべて / 進行中 / 完了）
- 注文詳細（タイムライン + 商品リスト + 合計）

### Step 5: Supabase統一 ✅
- Firestore → Supabase API に全顧客ページを移行
- 商品閲覧、カテゴリ、検索すべてSupabase経由

### Step 6: バーチャル試着 ✅
- ポートレート撮影/アップロード/管理
- 商品詳細から「試着する」→ VTON実行
- 外部商品試着（URL貼り付け + 画像アップロード）
- Vertex AI VTON で合成

### Step 7: ライブ配信受信 ✅
- 配信一覧（LIVE / 予定 / アーカイブ）
- HLS.js プレイヤー（Safari は native HLS）
- リアルタイムコメント + 商品シート

### Step 8: LINE プッシュ通知 ✅
- **店舗別トークン** で各ショップの公式LINEから通知送信
- 管理画面でLINE連携設定（トークン入力→API検証→保存）
- 通知テンプレート: 注文確認、発送、ライブ開始、新商品、試着結果、プロモーション
- 顧客側で通知カテゴリ ON/OFF 設定

---

## Phase 2: マルチテナント（サブドメインルーティング）

### 目的
各ショップが `{shop}.vual.jp` で独自ストアを運営できるようにする。

### 実装内容
- Next.js middleware でサブドメイン解析 → `store_id` をコンテキストに注入
- `store_domains` テーブルでサブドメイン ↔ store_id マッピング
- Vercel ワイルドカードドメイン設定 (`*.vual.jp`)
- ショップ別テーマ（ロゴ、カラー、フォント）
- サブスクリプション管理（Stripe Billing）

### 技術ポイント
```
リクエスト → middleware.ts
  → Host ヘッダーからサブドメイン抽出
  → store_domains テーブルでstore_id取得
  → NextResponse.rewrite() でルーティング
  → storeContext にstore情報を注入
```

---

## Phase 3: マーケットプレイス

### 目的
顧客がVUALサブスク中の全ショップの商品を横断的に閲覧・検索・購入できる。

### 実装内容
```
vual.jp/explore
┌─────────────────────────────────┐
│ 🔍 検索バー + フィルター         │
├─────────────────────────────────┤
│ カテゴリ: [全て] [ウェア] [靴]...│
├─────────────────────────────────┤
│ 注目ショップ                     │
│ [ESTNATION] [BEAMS] [UNITED...] │
├─────────────────────────────────┤
│ 新着商品（全ショップ横断）        │
│ [商品] [商品] [商品] [商品]      │
│  店名   店名   店名   店名       │
├─────────────────────────────────┤
│ ライブ配信中のショップ           │
│ [LIVE🔴] [LIVE🔴]              │
└─────────────────────────────────┘
```

### API設計
- `GET /api/marketplace/products` — 全ストア横断検索（`store.is_published = true`）
- `GET /api/marketplace/stores` — サブスク中ストア一覧
- `GET /api/marketplace/live` — 全ストア配信中ライブ一覧

### データフロー
- 商品タップ → そのショップのサブドメインに遷移 or マーケット内で直接購入
- 全文検索: Supabase `products` テーブルに対する `ILIKE` or `tsvector` 検索

---

## Phase 4: PRエージェントポータル

### 目的
PRエージェントが取り扱いブランド・サンプルを管理し、スタイリストからのリース打診を受け付ける。

### 実装内容
```
pr.vual.jp
├── /dashboard        → ダッシュボード（KPI、直近リクエスト）
├── /brands           → 取り扱いブランド管理
│   └── /brands/[id]  → ブランド詳細（コレクション、ルックブック）
├── /samples          → サンプル管理
│   ├── 一覧 + フィルター（ブランド/シーズン/カテゴリ）
│   ├── /samples/[id] → サンプル詳細
│   └── /samples/[id]/schedule → 貸出スケジュール管理
├── /requests         → リース依頼管理
│   ├── 受信リクエスト一覧
│   ├── ステータス管理（審査中/承認/拒否/返却済み）
│   └── カレンダービュー
├── /stylists         → スタイリスト一覧（リクエスト実績）
└── /settings         → 公開設定・プロフィール
```

### データモデル
```sql
pr_agencies (
  id, name, description, logo_url,
  is_brand_list_public BOOLEAN,     -- ブランド一覧を公開するか
  is_schedule_public BOOLEAN,       -- スケジュールを公開するか
  subscription_status, created_at
)

samples (
  id, pr_agency_id, brand_id, name, description,
  season, category, size, color,
  images JSONB, condition,
  is_available BOOLEAN,
  created_at
)

sample_schedules (
  id, sample_id,
  start_date, end_date,
  status: 'available' | 'reserved' | 'leased' | 'returning',
  leased_to (stylist_id), notes
)

lease_requests (
  id, sample_id, stylist_id, pr_agency_id,
  requested_dates (start, end),
  purpose, publication_name,
  status: 'pending' | 'approved' | 'rejected' | 'completed',
  created_at
)
```

---

## Phase 5: スタイリスト向けサンプル検索・リース打診

### 目的
スタイリストがVUALサブスク中の全PRエージェントから、ブランド・サンプルを横断検索し、空きスケジュールを確認してリース打診できる。

### 実装内容
```
pr.vual.jp/discover（スタイリスト向けビュー）
┌─────────────────────────────────┐
│ PRエージェント一覧               │
│ [エージェントA] [エージェントB]   │
│  取扱: 15ブランド  取扱: 8ブランド│
├─────────────────────────────────┤
│ ブランド横断検索                  │
│ 🔍 "Maison Margiela"           │
├─────────────────────────────────┤
│ サンプル貸出スケジュール          │
│ ┌───────────────────────┐      │
│ │ MM6 ジャケット S/S 25  │      │
│ │ 📅 3/1-3/15 空き       │      │
│ │ 📅 3/16-3/31 貸出中    │      │
│ │ [リース打診する]        │      │
│ └───────────────────────┘      │
└─────────────────────────────────┘
```

### リース打診フロー
```
スタイリスト: サンプル検索 → 空きスケジュール確認 → リース打診送信
  ↓
PRエージェント: LINE/メール通知受信 → 審査 → 承認/拒否
  ↓
スタイリスト: 結果通知 → 承認なら配送手配
  ↓
返却期限: リマインダー通知 → 返却確認
```

---

## Phase 6: セールスエージェントポータル

### 目的
セールスエージェント（卸営業）がクライアント（ショップ）管理、卸注文、売上分析を行う。

### 実装内容
```
sales.vual.jp
├── /dashboard        → KPI（月次売上、新規クライアント）
├── /clients          → クライアント（ショップ）管理
│   └── /clients/[id] → 取引履歴、注文一覧
├── /orders           → 卸注文管理
│   ├── 注文作成（ショップ向け見積もり）
│   └── ステータス管理
├── /catalog          → 取り扱いブランドカタログ
├── /analytics        → 売上分析・レポート
└── /settings         → プロフィール・通知設定
```

---

## 環境変数

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Firebase (認証 + Storage)
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx

# Stripe
STRIPE_SECRET_KEY=xxx
STRIPE_WEBHOOK_SECRET=xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=xxx

# LINE LIFF
NEXT_PUBLIC_LIFF_ID=xxx

# LINE Messaging API (各店舗のトークンはSupabase storesテーブルに保存)
LINE_CHANNEL_ACCESS_TOKEN=xxx  # VUALデフォルトアカウント用

# Mux Live Streaming
MUX_TOKEN_ID=xxx
MUX_TOKEN_SECRET=xxx

# Google Vertex AI (バーチャル試着)
GOOGLE_CLOUD_PROJECT=xxx
GOOGLE_APPLICATION_CREDENTIALS=xxx

# App
NEXT_PUBLIC_APP_URL=https://vual.jp
```

---

## ディレクトリ構成

```
vual/
├── app/
│   └── [locale]/
│       ├── (customer)/          # 顧客向けページ
│       │   ├── page.tsx         # ホーム
│       │   ├── product/[id]/    # 商品詳細
│       │   ├── category/[slug]/ # カテゴリ
│       │   ├── search/          # 検索
│       │   ├── checkout/        # 決済
│       │   ├── orders/          # 注文履歴
│       │   ├── live/            # ライブ配信
│       │   ├── tryon/           # バーチャル試着
│       │   ├── mypage/          # マイページ
│       │   └── layout.tsx       # BottomNavBar + CustomerHeader
│       ├── admin/               # ショップ管理画面
│       │   ├── products/
│       │   ├── orders/
│       │   ├── streams/
│       │   ├── settings/line/   # LINE連携設定
│       │   └── layout.tsx       # Sidebar + AdminHeader
│       └── layout.tsx           # ルートレイアウト
├── components/
│   ├── customer/                # 顧客向けコンポーネント
│   │   ├── layout/              # BottomNavBar, CustomerHeader
│   │   ├── home/                # ProductGrid, HeroSlider
│   │   ├── product/             # ProductDetail, RelatedProducts
│   │   ├── live/                # MuxPlayer, StreamList, StreamCard
│   │   ├── tryon/               # PortraitCapture, TryOnModal
│   │   ├── orders/              # OrderCard, OrderTimeline
│   │   └── mypage/              # ProfileHeader, NotificationSettings
│   ├── admin/                   # 管理画面コンポーネント
│   ├── providers/               # LiffProvider, ThemeProvider
│   └── ui/                      # 共通UIコンポーネント
├── lib/
│   ├── supabase.ts              # Supabaseクライアント
│   ├── stripe.ts                # Stripe設定
│   ├── mux.ts                   # Mux設定
│   ├── line-messaging.ts        # LINE Messaging API (店舗別トークン)
│   ├── auth/
│   │   └── google-auth.ts       # Google OAuth
│   ├── ai/
│   │   ├── vertex-vton.ts       # Vertex AI VTON
│   │   └── vton-queue.ts        # 試着キュー管理
│   ├── notifications/
│   │   └── templates.ts         # LINE Flex Messageテンプレート
│   ├── hooks/                   # カスタムフック
│   └── store/                   # Zustand stores
├── supabase/
│   └── migrations/              # SQLマイグレーション
├── messages/
│   ├── ja.json                  # 日本語
│   └── en.json                  # 英語
├── types/
│   └── supabase.ts              # Supabase型定義
└── docs/
    └── ARCHITECTURE.md          # この文書
```

---

## 実装ロードマップ

| Phase | 内容 | 状態 |
|-------|------|------|
| **Phase 1** | 顧客アプリ基本機能（8ステップ） | ✅ 完了 |
| **Phase 2** | マルチテナント（サブドメインルーティング） | 📋 計画済み |
| **Phase 3** | マーケットプレイス（全ショップ横断閲覧） | 📋 計画済み |
| **Phase 4** | PRエージェントポータル | 📋 計画済み |
| **Phase 5** | スタイリスト向けサンプル検索・リース | 📋 計画済み |
| **Phase 6** | セールスエージェントポータル | 📋 計画済み |

---

## 主要な設計判断の記録

| 日付 | 判断 | 理由 |
|------|------|------|
| 2026-02 | LINE通知は店舗別トークン（B案）を採用 | 各ショップの公式LINEから通知を出すため |
| 2026-02 | サブドメイン方式を採用 | SEO、ブランディング、技術的シンプルさのバランス |
| 2026-02 | カスタムドメインは将来プレミアム機能に | 段階的にリリース、初期はサブドメインのみ |
| 2026-02 | データベースはSupabaseに統一 | Firestore→Supabase移行でコスト・パフォーマンス改善 |
| 2026-02 | 認証はLINE LIFF + Google OAuth | LINE内ブラウザ対応 + Web直接アクセス対応 |
| 2026-02 | バーチャル試着に外部URL対応 | 他サイトの商品でも試着できる差別化機能 |
