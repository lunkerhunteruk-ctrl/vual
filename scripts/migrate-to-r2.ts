/**
 * Migrate files from Supabase Storage to Cloudflare R2.
 * Also updates DB URLs to point to R2.
 *
 * Usage: npx tsx scripts/migrate-to-r2.ts [--dry-run] [--bucket=gemini-results|model-images|media]
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// ── Config ──────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const R2_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET = process.env.R2_SECRET_ACCESS_KEY!;

const BUCKET_MAP: Record<string, { r2Bucket: string; prefix: string; publicUrl: string }> = {
  'gemini-results': {
    r2Bucket: process.env.R2_BUCKET_GEMINI || 'vual-gemini',
    prefix: '',
    publicUrl: process.env.R2_PUBLIC_URL_GEMINI || '',
  },
  'model-images': {
    r2Bucket: process.env.R2_BUCKET_MEDIA || 'vual-media',
    prefix: 'model-images',
    publicUrl: process.env.R2_PUBLIC_URL_MEDIA || '',
  },
  'media': {
    r2Bucket: process.env.R2_BUCKET_MEDIA || 'vual-media',
    prefix: 'media',
    publicUrl: process.env.R2_PUBLIC_URL_MEDIA || '',
  },
};

// ── Clients ─────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_KEY_ID, secretAccessKey: R2_SECRET },
});

// ── Helpers ─────────────────────────────────────────────────

function getR2Key(bucket: string, path: string): string {
  const { prefix } = BUCKET_MAP[bucket];
  return prefix ? `${prefix}/${path}` : path;
}

function getR2PublicUrl(bucket: string, path: string): string {
  const { publicUrl, prefix } = BUCKET_MAP[bucket];
  const key = prefix ? `${prefix}/${path}` : path;
  return `${publicUrl}/${key}`;
}

async function r2Exists(r2Bucket: string, key: string): Promise<boolean> {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: r2Bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function listAllFiles(bucket: string): Promise<{ name: string }[]> {
  const all: { name: string }[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list('', {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) { console.error(`List error (${bucket}):`, error); break; }
    if (!data || data.length === 0) break;

    // Filter out folders, recurse into them
    for (const item of data) {
      if (item.id) {
        // It's a file
        all.push({ name: item.name });
      } else {
        // It's a folder — list recursively
        const subFiles = await listAllFilesRecursive(bucket, item.name);
        all.push(...subFiles);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return all;
}

async function listAllFilesRecursive(bucket: string, folder: string): Promise<{ name: string }[]> {
  const all: { name: string }[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error || !data || data.length === 0) break;

    for (const item of data) {
      const fullPath = `${folder}/${item.name}`;
      if (item.id) {
        all.push({ name: fullPath });
      } else {
        const subFiles = await listAllFilesRecursive(bucket, fullPath);
        all.push(...subFiles);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return all;
}

// ── Migration ───────────────────────────────────────────────

async function migrateBucket(bucket: string, dryRun: boolean) {
  const config = BUCKET_MAP[bucket];
  if (!config) { console.error(`Unknown bucket: ${bucket}`); return; }

  console.log(`\n=== Migrating: ${bucket} → ${config.r2Bucket}/${config.prefix || '(root)'} ===`);

  const files = await listAllFiles(bucket);
  console.log(`Found ${files.length} files`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const r2Key = getR2Key(bucket, file.name);

    // Check if already exists in R2
    const exists = await r2Exists(config.r2Bucket, r2Key);
    if (exists) {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  [dry-run] Would migrate: ${file.name} → ${config.r2Bucket}/${r2Key}`);
      migrated++;
      continue;
    }

    try {
      // Download from Supabase
      const { data: blob, error } = await supabase.storage.from(bucket).download(file.name);
      if (error || !blob) {
        console.error(`  ✗ Download failed: ${file.name}`, error);
        failed++;
        continue;
      }

      const buffer = Buffer.from(await blob.arrayBuffer());
      const contentType = blob.type || 'application/octet-stream';

      // Upload to R2
      await r2.send(new PutObjectCommand({
        Bucket: config.r2Bucket,
        Key: r2Key,
        Body: buffer,
        ContentType: contentType,
      }));

      migrated++;
      if (migrated % 10 === 0) console.log(`  ... ${migrated} migrated`);
    } catch (err) {
      console.error(`  ✗ Failed: ${file.name}`, err);
      failed++;
    }
  }

  console.log(`Done: ${migrated} migrated, ${skipped} skipped (already exists), ${failed} failed`);
}

async function updateDbUrls(dryRun: boolean) {
  console.log('\n=== Updating DB URLs ===');

  const supabaseStorageBase = `${SUPABASE_URL}/storage/v1/object/public/`;

  // Tables with image URLs that reference Supabase storage
  const tables = [
    { table: 'collection_looks', column: 'image_url' },
    { table: 'gemini_results', column: 'image_url' },
    { table: 'gemini_results', column: 'thumbnail_url' },
    { table: 'product_model_images', column: 'image_url' },
  ];

  for (const { table, column } of tables) {
    const { data: rows, error } = await supabase
      .from(table)
      .select(`id, ${column}`)
      .like(column, `${supabaseStorageBase}%`);

    if (error) { console.error(`  Error querying ${table}.${column}:`, error); continue; }
    if (!rows || rows.length === 0) { console.log(`  ${table}.${column}: no Supabase URLs found`); continue; }

    console.log(`  ${table}.${column}: ${rows.length} URLs to update`);

    for (const row of rows) {
      const oldUrl: string = row[column];
      // Parse: https://xxx.supabase.co/storage/v1/object/public/model-images/path/to/file.png
      const afterPublic = oldUrl.replace(supabaseStorageBase, '');
      const slashIdx = afterPublic.indexOf('/');
      if (slashIdx === -1) continue;

      const bucket = afterPublic.substring(0, slashIdx);
      const path = afterPublic.substring(slashIdx + 1);
      const config = BUCKET_MAP[bucket];
      if (!config) { console.log(`    Skip unknown bucket: ${bucket}`); continue; }

      const newUrl = getR2PublicUrl(bucket, path);

      if (dryRun) {
        console.log(`    [dry-run] ${oldUrl.substring(0, 80)}... → ${newUrl.substring(0, 80)}...`);
      } else {
        const { error: updateError } = await supabase
          .from(table)
          .update({ [column]: newUrl })
          .eq('id', row.id);
        if (updateError) console.error(`    ✗ Update failed for ${table} id=${row.id}:`, updateError);
      }
    }
  }

  console.log('DB URL update complete');
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const bucketArg = args.find(a => a.startsWith('--bucket='))?.split('=')[1];

  if (dryRun) console.log('🏃 DRY RUN — no changes will be made\n');

  const buckets = bucketArg ? [bucketArg] : ['gemini-results', 'model-images', 'media'];

  for (const bucket of buckets) {
    await migrateBucket(bucket, dryRun);
  }

  await updateDbUrls(dryRun);

  console.log('\n✅ Migration complete!');
}

main().catch(console.error);
