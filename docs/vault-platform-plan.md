# Vault Platform Plan
# ルック生成 × 試着プラットフォーム 設計・実装計画

作成日: 2026-06-26  
ステータス: 設計フェーズ

---

## 1. コンセプト

### 基本思想
ブランド・個人がAIでルックを生成し、公開するとグローバルなモンドリアングリッドになる。
グリッド上のルックには「レシピ」が内包されており、第三者がそのルックで試着できる。

```
[生成者（企業・個人）]
服の画像 + ロケ地設定
    ↓ AIルック生成
生成されたルック写真
    ↓ 公開を選択
グローバルモンドリアングリッド に追加
    ↓
[閲覧者（消費者）]
グリッドでルックを発見
    ↓ そのルックで試着
同じ世界観・レシピで自分の写真に適用
    ↓
ストアページへ → ブランドの投稿・ルックを全部見る
```

### ポジショニング
- **生成側**：モデル撮影費の代替（B2B企業・個人クリエイター）
- **閲覧側**：ネオPinterest × VTON（B2C消費者）
- **競合との差別化**：スマホアプリの試着は「消費者が服を買うため」。本プラットフォームは「服を売りたい人が量産するため」。

---

## 2. ターゲット・ユーザー

### 生成者（コンテンツ供給側）
- 企業・ブランドアカウント（既存のstores設計を流用）
- **個人ユーザーも初期から受け付ける**（コンテンツ量が最優先）

### 閲覧・試着者（コンテンツ消費側）
- vault.vual.jp / vual.jp/daily の既存ユーザー（Firebase auth）

---

## 3. ドメイン戦略

**現状維持：vault.vual.jp**

- 短期：vual.jpの実績・信頼を活かしてスタート
- 将来：プラットフォームとして育ったら独立ドメインへ移行
  - 候補：`thevault.jp`、`looksvault.com` など
  - 移行時はリダイレクトで対応
- 「vault = 自分だけの金庫 + レシピが保存されてる場所」のコンセプトは名前として有効

---

## 4. ルック生成モード（3段階）

| モード | コーデ数 | 生成ルック数 | Gemini呼び出し | グリッド | 公開 | 保存先 |
|--------|---------|------------|--------------|---------|------|--------|
| **Quick** | 1 | 2枚（A/B選択） | 1回 | なし | なし | マイ金庫のみ |
| **Standard** | 3 | 6枚 | 1回 | 6グリッド | 可 | マイ金庫 + グリッド |
| **Full** | 6 | 12枚 | 1回 | 6グリッド | 可 | マイ金庫 + グリッド |

### モード切り替えの技術仕様
`batch-generate.ts` は既に `shotCount` パラメータを持っており、1回のGemini呼び出しで対応：

```
Quick:    lookCount=1, shotCount=2   → 各コーデ2ショット
Standard: lookCount=3, shotCount=6   → 各コーデ2ショット
Full:     lookCount=6, shotCount=12  → 各コーデ2ショット（現行デフォルト）
```

coordinator.html の `let lookCount = 6;` をUIトグルで切り替えるだけで実装可能。

### Quickモードの特別仕様
- `batch-generate.ts` パイプライン（xlsx→R2→Firestore）は使わない
- `/api/ai/gemini-image` を直叩きする軽量フロー
- A/B 2枚を並べて表示 → 選択 → DL or マイ金庫保存
- グリッド未作成でも後から「コレクションに追加」できる導線を用意

### 課金設計（将来）
- Quick: 無料 or クレジット2枚消費
- Standard: クレジット6枚
- Full: クレジット12枚（サブスク向け）

---

## 5. アーキテクチャ設計

### ストレージ方針
**Supabase = テキスト（メタデータ）のみ / 画像バイナリ = R2のまま**

```
Supabase（メタデータ）              R2（バイナリ）
──────────────────────             ──────────────────────
collection_looks
  image_url ──────────────────→   vault/{store_id}/looks/{id}.jpg
  recipe_url ─────────────────→   vault/{store_id}/recipes/{id}/
  is_public (bool)  ← 追加
  published_at      ← 追加
  store_id
  created_at
```

### ユーザーモデルの拡張

個人ユーザーも `collection_looks` を使えるよう、`stores` テーブルに `type` カラムを追加：

```sql
ALTER TABLE stores ADD COLUMN type TEXT DEFAULT 'brand';
-- type: 'brand' | 'personal'
```

初回ルック生成時に個人ユーザー用の stores 行を自動作成：
```
slug: "user_{uid短縮形}"
owner_id: firebase_uid
type: 'personal'
```

### Firestoreの整理方針

**Phase 1はバイパス戦略：Firestoreを廃止しない、新コンテンツだけSupabaseに書く**

```
既存 Firestore vault_collections  →  そのまま放置（触らない）
新しい生成フロー（Quick/Standard/Full） →  collection_looks（Supabase）に直接書く
新しいグローバルグリッド           →  Supabaseのみ参照（Firestoreを読まない）
```

Phase 1に必要なのは `is_public` フラグ追加だけ。Firestoreの廃止・データ移行は後のフェーズ。

**将来フェーズ（Phase 2以降）で移行する対象：**
- `vault_collections` → `collection_looks` に一本化
- `vault_user_generations` → Supabase に移行（store_id付き）
- `injection_counts` → Supabase に移行

### グローバルグリッドAPI
```sql
-- collection_looks に追加するフラグ
ALTER TABLE collection_looks ADD COLUMN is_public BOOLEAN DEFAULT false;
ALTER TABLE collection_looks ADD COLUMN published_at TIMESTAMPTZ;
ALTER TABLE collection_looks ADD COLUMN category TEXT DEFAULT NULL;
-- category: NULL（未設定）| 'high_fashion' | 'street' | 'casual' | 'minimal' | 'feminine' | 'classic' | 'vintage' | 'resort'
-- 公開時にカテゴリ必須。未設定のまま is_public=true にはできない（アプリ層でバリデーション）

-- グローバルグリッド取得（全カテゴリ）
SELECT * FROM collection_looks
WHERE is_public = true
ORDER BY published_at DESC;

-- カテゴリフィルタあり
SELECT * FROM collection_looks
WHERE is_public = true AND category = 'street'
ORDER BY published_at DESC;
```

---

## 6. 管理パネル設計

### HIGH / DAILY の転用方針

現行の HIGH/DAILY は「公開先ルーティング」だったが、カテゴリタグに転用する：

| 旧ラベル | 新カテゴリ | 意味 |
|---------|-----------|------|
| HIGH | `high_fashion` | editorial、ランウェイ、ラグジュアリー |
| DAILY | `casual` | 普段着、リラックス |
| （新設） | `street` | ストリート、スケート、都市 |
| （新設） | `minimal` | シンプル、白黒、シャープ |
| （新設） | `feminine` | ロマンチック、花柄、ガーリー |
| （新設） | `classic` | テーラード、上品、タイムレス |
| （新設） | `vintage` | 古着、レトロ、アーカイブ |
| （新設） | `resort` | 夏、ビーチ、旅行 |

**カテゴリ選択のUXルール：**
- 生成直後はカテゴリ未設定（NULL）でマイ金庫に保存
- DLのみの場合はカテゴリ不要
- 公開する場合のみカテゴリ選択を必須とする（バリデーション）
- 公開後もカテゴリは変更可能

**vual.jp/daily の活用：**
別サイトを維持せず、リダイレクトで資産を活かす：
```
vual.jp/daily → vault.vual.jp?category=daily
```
既存ブックマーク・リンクを死なせずに実装コストほぼゼロ。

**coordinator.html の HIGH/DAILY トグルの扱い：**
生成時のティア選択（HIGH/DAILY）を廃止せず、公開時のカテゴリ選択のデフォルト値として使う。
HIGH選択時 → デフォルトカテゴリ `high_fashion` / DAILY選択時 → デフォルト `daily`（変更可能）

### 既存パネル（維持）
- `/{locale}/admin/` ：ブランド向けStoreAdmin（orders, products, studio等）
- **VAULT Admin.app**：vual.jp公式editorial記事の投稿（従来通り）

### 新設：一般ユーザー向けmy パネル
```
/{locale}/my/looks      — 自分のルック一覧（公開/非公開/削除）
/{locale}/my/generate   — ルック生成（Quick/Standard/Fullモード選択）
```

機能：
- 公開・非公開トグル（`is_public` フラグ）
- 公開時カテゴリ選択（high_fashion / street / daily / minimal / feminine / vintage）
- グリッド順序の入れ替え
- 削除
- ルックのDL

### 拡張フェーズ（将来）
- ストアページ（`/store/{slug}`）：ブランドの投稿 + ルックを統合表示
- URL設計：`vault.vual.jp/store/brandname`（サブドメインからパスベースへ移行）

---

## 7. レシピ設計

各ルックに以下のレシピを内包させる：

```json
{
  "garment_urls": ["r2://..."],
  "location": "東京・代官山",
  "height": 175,
  "film": "leicaPortra800",
  "generation_params": { "shotId": "SB3", "customNote": "..." }
}
```

R2保存先：`vault/{store_id}/recipes/{look_id}/`

消費者が試着する際、レシピから同じ世界観を再現してGeminiに送信。

---

## 8. クレジット & ポイント設計

### クレジット（消費通貨）

**基本単位：1クレジット = 1枚の画像出力**

| アクション | 消費クレジット |
|-----------|-------------|
| 試着（VTON） | 1cr |
| Quick生成 | 2cr（2枚出力） |
| Standard生成 | 6cr（6枚出力） |
| Full生成 | 12cr（12枚出力） |

**無料枠：**

| ユーザー種別 | 無料クレジット | リセット |
|------------|-------------|--------|
| ゲスト（未ログイン） | **3cr/セッション** | リセットなし（ログインまで） |
| ログイン（無料） | **3cr/日** | UTC深夜に毎日リセット |
| 有料 | 購入クレジット消費 | — |

**ゲストの3crで何ができるか：**
- Quick 1回（2cr）+ 試着 1回（1cr）
- OR 試着 3回（1cr × 3）

**ログインのインセンティブ（無料枠は増やさないが）：**
- 毎日リセットされる（ゲストはセッション切れで消える）
- マイ金庫への保存ができる
- クレジット購入権

**設計思想：** Standard（6cr）はログイン無料枠（3cr）では1回分に届かないため、本格利用には必ず購入が必要になる。

**クレジットパック（現行維持）：**
```
pack-10:  10cr  ¥500  （¥50/cr）
pack-30:  30cr  ¥1,200 （¥40/cr）20%OFF
pack-100: 100cr ¥3,000 （¥30/cr）40%OFF
```

**技術課題：**
- 現行のクレジットチェックはクライアント側のみ → サーバー側にガード追加が必要
- 保存先がFirestore（旧）とSupabase（新）に分裂中 → 段階的にSupabaseへ統合

---

### ポイント（報酬通貨）

**現状：** 有料クレジット消費で10pt付与。UIに表示されるが使い道はまだない。

**エディション番号システム（ポイントとは別）：**
```
有料生成 → "003/005"（限定版番号が刻印される）
無料生成 → "SAMPLE — 000/000"
```
ルック写真に「何番目に生成されたか」を刻印する仕様。希少性・コレクター性を演出。

**将来のポイント活用案（未実装）：**
- Vaultオフィシャルが限定アイテムや新機能をリリースする際の**優先アクセス権**
- ポイント保有者への先行案内・限定招待
- クレジットへの交換（例：1000pt → 10cr）
- 将来的なコレクター向けデジタル特典

**ポイントはゆっくり設計して良い。** Phase 1では蓄積のみ継続し、使い道は後から決める。

---

## 9. 初期フェーズのスコープ

**フェーズ1（今作るもの）に絞る：**
- ✅ ルック生成（Quick / Standard / Fullモード）
- ✅ モンドリアングリッド管理
- ✅ 公開・非公開設定
- ✅ マイ金庫（ユーザーのルック保存）

**後回し：**
- ❌ ストアページ（公開後の拡張）
- ❌ ブログ×ルック統合表示
- ❌ 独立ドメイン移行

---

## 9. 実装ステップ

### Step 0：DB設計 + Firestore完全移行（3〜4日）

**Supabaseスキーマ追加：**
- [ ] `collection_looks` に `is_public`, `published_at`, `category`, `injection_initial`, `injection_remaining` カラム追加
- [ ] `stores` に `type` ('brand' | 'personal') カラム追加
- [ ] `consumer_credits` に `firebase_uid`, `points` カラム追加（制約更新）
- [ ] `user_generations` テーブル新規作成（vault_user_generations移行先）
- [ ] `decrement_injection()` ストアドプロシージャ追加（injection_countsのアトミック処理）

**Firestore → Supabase 移行スクリプト（1回実行）：**
- [ ] `vault_users` → `consumer_credits`（firebase_uid + paid_credits + points）
- [ ] `vault_user_generations` → `user_generations`（userId → firebase_uid）
- [ ] `injection_counts` → `collection_looks.injection_remaining`（ルックIDで照合）
- [ ] `vault_collections` → `collection_bundles` + `collection_looks`（media配列をflatten、bundle_idで束ねる）

**アプリコード切り替え：**
- [ ] `lib/daily/generations.ts` → Supabase読み書きに変更（2関数）
- [ ] `lib/daily/injection-count.ts` → Supabase読み書きに変更（3関数）
- [ ] `lib/daily/auth.ts` + `lib/daily/store.ts` → クレジット読み書きをFirestoreからSupabaseへ
- [ ] `/api/daily/implant` にサーバー側クレジットチェック追加（`deduct_consumer_credit()`呼び出し）
- [ ] `components/daily/VaultContent.tsx` → `vault_collections`（Firestore）から`collection_looks`（Supabase）に切り替え

**移行完了後：**
- [ ] Firestoreへの書き込みを全て停止（読み取り専用 → 最終的に廃止）

### Step 1：Quickモード実装（3〜4日）
- [ ] 軽量ルック生成UI（`/{locale}/my/generate`）
  - 服の画像アップロード（DnD）
  - ロケ地テキスト入力
  - A/B 2枚生成
  - DL ボタン
- [ ] `/api/my/generate` エンドポイント（gemini-image直叩き）
- [ ] 生成結果をマイ金庫に保存（Supabase collection_looks、is_public=false）
- [ ] 個人ユーザー用stores行の自動作成ロジック

### Step 2：マイ金庫 管理UI（2〜3日）
- [ ] `/{locale}/my/looks` ページ
  - 自分のルック一覧（グリッド表示）
  - 公開/非公開トグル
  - 削除
  - DL

### Step 3：Standard / Fullモード + coordinator切り替え（3〜4日）
- [ ] coordinator.html にモードトグル追加（3コーデ / 6コーデ）
- [ ] `lookCount` / `shotCount` のUI切り替え実装
- [ ] Standard/Fullモードの生成フローをmy/generateに統合

### Step 4：グローバルモンドリアングリッド（3〜4日）
- [ ] `is_public=true` のルックを横断取得するAPIエンドポイント
- [ ] グローバルグリッドUI（vault.vual.jp / vual.jp/daily の更新）
- [ ] 公開ルックへの試着導線（レシピ読み込み）

### Step 5：レシピ内包 + 試着連携（3〜5日）
- [ ] 生成時にレシピをR2に保存
- [ ] グリッドのルックからレシピを読み込んで試着APIに渡す
- [ ] 試着結果のマイ金庫保存（look_id / store_id紐付き）

### Step 6：認証・UX整備（2〜3日）
- [ ] Firebase auth → 個人stores行の自動作成フロー
- [ ] 未ログイン時のQuick生成制限（DL可、保存は要ログイン）
- [ ] my/ パネルのナビゲーション整備

---

## 10. 技術スタック（変更なし）

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 16 App Router + Turbopack |
| 認証 | Firebase Auth（消費者）/ Supabase Auth（ブランド）|
| DB | Supabase（テキストメタデータのみ）|
| 画像ストレージ | Cloudflare R2 |
| AI生成 | Gemini Flash（テキスト）/ Gemini Flash Image（画像）|
| 状態管理 | Zustand + persist |
| i18n | next-intl（ja / en）|

---

## 11. 将来の拡張ロードマップ

1. **ストアページ**（`/store/{slug}`）：ブランドの投稿＋ルック統合表示
2. **購入導線**：ルックからブランドの商品ページへリンク
3. **独立ドメイン**：プラットフォームが育ったタイミングで移行
4. **Shopifyアプリ化**：VTON + ルック生成APIのShopifyアドオン
5. **EC-CUBEアドオン**：国内中堅アパレルへの展開
