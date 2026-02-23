# Vertex AI 価格表 (2026年2月時点)

## 画像生成モデル比較

| モデル | コスト/画像 | 日本円概算 | 特徴 |
|--------|------------|-----------|------|
| **Imagen 4 Fast** | $0.02 | ¥3 | 最安・高速・シンプル生成 |
| **Gemini 2.5 Flash Image** | $0.039 | ¥6 | 会話編集・日本語◎・柔軟 |
| **Imagen 4 Standard** | $0.04 | ¥6 | バランス型 |
| **Imagen 4 Ultra** | $0.06 | ¥9 | 最高品質 |
| **Imagen 4 (4K解像度)** | $0.24 | ¥36 | 超高解像度 |

## Gemini テキストモデル

| モデル | 入力 (100万トークン) | 出力 (100万トークン) |
|--------|---------------------|---------------------|
| Gemini 2.5 Flash | $0.30 | $2.50 |
| Gemini 2.5 Flash Lite | $0.075 | $0.30 |
| Gemini 2.5 Pro | $1.25 - $2.50 | $10.00 - $15.00 |

## Gemini 2.5 Flash Image 詳細

- **出力トークン単価**: $30.00 / 100万トークン
- **1画像あたりトークン**: 1,290
- **1画像あたりコスト**: $0.039 (約¥6)
- **対応言語**: EN, es-MX, ja-JP, zh-CN, hi-IN
- **対応アスペクト比**: 1:1, 3:2, 4:3, 16:9 など

## 無料枠・クレジット

### Google Cloud 新規アカウント
- **$300 の無料クレジット** (90日間有効)
- Gemini、Imagen 両方に使用可能

### Firebase Spark プラン (無料)
- Gemini Developer API の無料枠が使用可能
- **Imagen は使用不可** (Blaze必須)

### Firebase Blaze プラン (従量課金)
- **1枚目から課金発生**
- ただし $300 クレジットがあれば相殺される
- Gemini、Imagen 両方使用可能

## コスト試算例

### AI Studio 1日100枚生成の場合

| モデル | 日額 | 月額 (30日) |
|--------|------|------------|
| Imagen 4 Fast | ¥300 | ¥9,000 |
| Gemini 2.5 Flash Image | ¥600 | ¥18,000 |
| Imagen 4 Standard | ¥600 | ¥18,000 |

## リージョン

| 用途 | 推奨リージョン |
|------|---------------|
| テキスト処理 (Gemini) | `asia-northeast1` (日本) |
| 画像生成 (Gemini Image) | `us-central1` (US) |
| 画像生成 (Imagen) | `asia-northeast1` (日本) ✅ |

## Model ID 一覧

```
gemini-2.5-flash-lite      # テキスト処理 (軽量)
gemini-2.5-flash           # テキスト処理 (標準)
gemini-2.5-flash-image     # 画像生成
imagen-3.0-generate-001    # Imagen 3
imagen-4.0-generate-001    # Imagen 4
```

## 参考リンク

- [Vertex AI Pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Firebase AI Logic Pricing](https://firebase.google.com/docs/vertex-ai/pricing)

---
最終更新: 2026年2月
