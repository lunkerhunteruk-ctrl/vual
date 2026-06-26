/**
 * Firestore → Supabase 一括移行スクリプト（1回実行）
 *
 * 対象:
 *   vault_users           → consumer_credits (firebase_uid + points追加)
 *   vault_user_generations → user_generations
 *   injection_counts       → collection_looks.injection_remaining
 *   vault_collections      → collection_bundles + collection_looks
 *
 * 実行:
 *   npx tsx scripts/migrate-firestore-to-supabase.ts
 *   npx tsx scripts/migrate-firestore-to-supabase.ts --dry-run  (書き込みなし確認)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');

// ── Firebase Admin 初期化 ──
// GOOGLE_APPLICATION_CREDENTIALS 環境変数にサービスアカウントJSONパスを設定するか、
// FIREBASE_SERVICE_ACCOUNT_JSON に JSON文字列を設定してください
function initFirebaseAdmin() {
  if (getApps().length > 0) return getApps()[0];
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    return initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  }
  // GOOGLE_APPLICATION_CREDENTIALS が設定されている場合はそちらを使用
  return initializeApp();
}

initFirebaseAdmin();
const adminDb = getAdminFirestore();

// ── Supabase Admin クライアント ──
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── ユーティリティ ──
function log(msg: string) { console.log(msg); }
function dryLog(msg: string) { if (DRY_RUN) console.log(`[DRY-RUN] ${msg}`); }

async function upsert(table: string, rows: object[], conflictCol: string) {
  if (rows.length === 0) return { count: 0 };
  if (DRY_RUN) { dryLog(`Would upsert ${rows.length} rows into ${table}`); return { count: rows.length }; }
  const { error, count } = await supabase.from(table).upsert(rows, { onConflict: conflictCol, count: 'exact' });
  if (error) throw new Error(`${table} upsert error: ${error.message}`);
  return { count: count ?? rows.length };
}

// ────────────────────────────────────────────
// 1. vault_users → consumer_credits
// ────────────────────────────────────────────
async function migrateVaultUsers() {
  log('\n[1/4] vault_users → consumer_credits');
  const snapshot = await adminDb.collection('vault_users').get();
  log(`  Firestore docs: ${snapshot.size}`);

  const rows = snapshot.docs.map(doc => {
    const d = doc.data();
    return {
      firebase_uid:              doc.id,
      free_tickets_remaining:    typeof d.freeUsed === 'number' ? Math.max(0, 3 - d.freeUsed) : 3,
      free_tickets_reset_at:     d.freeResetDate
        ? new Date(d.freeResetDate + 'T00:00:00+09:00').toISOString()
        : new Date(Date.now() + 86400000).toISOString(),
      paid_credits:              typeof d.paidCredits === 'number' ? d.paidCredits : 0,
      subscription_credits:      0,
      points:                    typeof d.points === 'number' ? d.points : 0,
    };
  });

  const { count } = await upsert('consumer_credits', rows, 'firebase_uid');
  log(`  ✅ ${count} rows upserted`);
}

// ────────────────────────────────────────────
// 2. vault_user_generations → user_generations
// ────────────────────────────────────────────
async function migrateUserGenerations() {
  log('\n[2/4] vault_user_generations → user_generations');
  const snapshot = await adminDb.collection('vault_user_generations').get();
  log(`  Firestore docs: ${snapshot.size}`);

  const rows = snapshot.docs.map(doc => {
    const d = doc.data();
    return {
      firebase_uid: d.userId,
      image_url:    d.imageUrl,
      look_file:    d.lookFile || null,
      city:         d.city || null,
      created_at:   d.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    };
  }).filter(r => r.firebase_uid && r.image_url);

  const { count } = await upsert('user_generations', rows, 'id');
  log(`  ✅ ${count} rows inserted`);
}

// ────────────────────────────────────────────
// 3. injection_counts → collection_looks
// ────────────────────────────────────────────
async function migrateInjectionCounts() {
  log('\n[3/4] injection_counts → collection_looks');
  const snapshot = await adminDb.collection('injection_counts').get();
  log(`  Firestore docs: ${snapshot.size}`);

  // lookFileパス → collection_looks.id の照合
  // 例: "vault/collections/01-06-2026_1247/look3-recipe/..." → bundle経由でlook_idを取得
  // injection_countsのkeyはlookFileToId()で生成された文字列
  // 既存のcollection_looksにlook_file列がないため、
  // bundle_id + position で照合するか、メタデータとして保存
  // → 今回はcollection_looksのimage_url/R2パスから照合できないため
  //   look_file_key として一時的にJSONBに保存し、後から紐付け可能にする

  let updated = 0;
  for (const doc of snapshot.docs) {
    const d = doc.data();
    const remaining = typeof d.remaining === 'number' ? d.remaining : 0;
    const initial   = typeof d.initial   === 'number' ? d.initial   : remaining;

    // look_fileキー(doc.id)でcollection_looksを検索
    // doc.id 例: "01-06-2026_1247_look3" や "collectionName_look3"
    const { data: looks } = await supabase
      .from('collection_looks')
      .select('id')
      .ilike('image_url', `%${doc.id.replace(/_look\d+$/, '')}%`)
      .limit(10);

    if (looks && looks.length > 0) {
      // look番号を解析して対象行を特定
      const lookNumMatch = doc.id.match(/_look(\d+)$/);
      const lookNum = lookNumMatch ? parseInt(lookNumMatch[1]) : 1;
      const target = looks[lookNum - 1] || looks[0];

      if (!DRY_RUN) {
        await supabase
          .from('collection_looks')
          .update({ injection_initial: initial, injection_remaining: remaining })
          .eq('id', target.id);
      }
      updated++;
    }
  }

  log(`  ✅ ${updated}/${snapshot.size} looks updated (残りは新規生成時に自動設定)`);
}

// ────────────────────────────────────────────
// 4. vault_collections → collection_bundles + collection_looks
// ────────────────────────────────────────────
async function migrateVaultCollections() {
  log('\n[4/4] vault_collections → collection_bundles + collection_looks');

  // vault.vual.jp 側のFirestoreを参照（同じFirebaseプロジェクト）
  const snapshot = await adminDb.collection('vault_collections').get();
  log(`  Firestore docs: ${snapshot.size}`);

  // vual.jp の store_id を取得（vault公式コンテンツ用）
  const { data: vualStore } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', 'vual')
    .single();

  if (!vualStore) {
    log('  ⚠️  slug=vual の stores 行が見つかりません。スキップします。');
    log('     先に stores テーブルに vual の公式レコードを作成してください。');
    return;
  }

  const storeId = vualStore.id;
  let bundleCount = 0;
  let lookCount = 0;

  for (const doc of snapshot.docs) {
    const d = doc.data();
    const publishAt = d.publishAt?.toDate?.() || null;
    const published = d.published ?? false;

    // collection_bundles に挿入（bundle = 旧vault_collection 1件）
    const bundleRow = {
      id:         doc.id,        // FirestoreのdocIDをそのまま使用（UUID形式でない場合は変換不要）
      store_id:   storeId,
      title:      d.city || '',
      subtitle:   d.subtitle || null,
      published_at: publishAt?.toISOString() || null,
      created_at: d.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    };

    if (!DRY_RUN) {
      const { error } = await supabase
        .from('collection_bundles')
        .upsert(bundleRow, { onConflict: 'id' });
      if (error) { log(`  ⚠️  bundle upsert error: ${error.message}`); continue; }
    } else {
      dryLog(`Would upsert bundle: ${bundleRow.id} (${bundleRow.title})`);
    }
    bundleCount++;

    // media配列 → collection_looks に1行ずつ
    const mediaItems = (d.media || []).filter((m: any) => !m.hidden);
    for (let i = 0; i < mediaItems.length; i++) {
      const m = mediaItems[i];
      const lookRow = {
        store_id:    storeId,
        bundle_id:   doc.id,
        image_url:   m.file || '',
        position:    i,
        is_public:   published,
        published_at: published ? (publishAt?.toISOString() || new Date().toISOString()) : null,
        category:    d.tier === 'high' ? 'high_fashion' : 'casual',
        show_credits: true,
      };

      if (!DRY_RUN) {
        const { error } = await supabase
          .from('collection_looks')
          .upsert(lookRow, { onConflict: 'store_id,bundle_id,position' });
        if (error) { log(`  ⚠️  look upsert error: ${error.message}`); }
        else lookCount++;
      } else {
        dryLog(`  Would insert look: ${m.file}`);
        lookCount++;
      }
    }
  }

  log(`  ✅ ${bundleCount} bundles, ${lookCount} looks upserted`);
}

// ── メイン ──
async function main() {
  log(`\n${'═'.repeat(60)}`);
  log(`Firestore → Supabase 移行スクリプト${DRY_RUN ? ' [DRY-RUN]' : ''}`);
  log('═'.repeat(60));

  try {
    await migrateVaultUsers();
    await migrateUserGenerations();
    await migrateInjectionCounts();
    await migrateVaultCollections();

    log(`\n${'═'.repeat(60)}`);
    log('✅ 移行完了');
    if (DRY_RUN) log('   ※ DRY-RUNのため実際のデータは変更されていません');
    log('═'.repeat(60));
  } catch (err) {
    console.error('\n❌ 移行エラー:', err);
    process.exit(1);
  }
}

main();
