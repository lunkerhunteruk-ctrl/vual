// Rescue script: parse batch response and upload images to R2, update DB
const fs = require('fs');
const path = require('path');

// Load env
require('dotenv').config({ path: '/Users/mari/Desktop/vual/.env.local' });

const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const R2_BUCKET = process.env.R2_BUCKET_GEMINI || 'vual-gemini';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL_GEMINI;

async function main() {
  const data = JSON.parse(fs.readFileSync('/tmp/batch_response.json', 'utf8'));
  const responses = data.metadata?.output?.inlinedResponses?.inlinedResponses || [];
  console.log(`Processing ${responses.length} responses`);

  const savedLooks = [];

  for (const resp of responses) {
    const queueId = resp.metadata?.key;
    if (!queueId) continue;

    const parts = resp.response?.candidates?.[0]?.content?.parts || [];
    let imageBase64 = null;
    let mimeType = 'image/jpeg';
    for (const p of parts) {
      const d = p.inlineData || p.inline_data;
      if (d) {
        imageBase64 = d.data;
        mimeType = d.mimeType || d.mime_type || 'image/jpeg';
        break;
      }
    }

    if (!imageBase64) {
      console.log(`  [${queueId}] no image`);
      continue;
    }

    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const filename = `gemini-batch-${Date.now()}-${savedLooks.length}.${ext}`;
    const buffer = Buffer.from(imageBase64, 'base64');

    // Upload to R2
    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: filename,
      Body: buffer,
      ContentType: mimeType,
    }));
    const imageUrl = `${R2_PUBLIC_URL}/${filename}`;
    console.log(`  [${queueId}] uploaded: ${filename}`);

    // Get payload for productIds and storeId
    const { data: item } = await supabase
      .from('batch_queue')
      .select('payload, store_id')
      .eq('id', queueId)
      .single();

    const productIds = item?.payload?.productIds || [];
    const storeId = item?.store_id;

    // Save to gemini_results
    await supabase.from('gemini_results').insert({
      image_url: imageUrl,
      storage_path: filename,
      garment_count: 1,
      product_ids: [],
      expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      source: 'studio',
      store_id: storeId,
    });

    // Update queue item
    await supabase.from('batch_queue').update({
      status: 'completed',
      result_image_url: imageUrl,
      result_saved: true,
      completed_at: new Date().toISOString(),
    }).eq('id', queueId);

    savedLooks.push({ queueId, imageUrl, productIds, storeId });
  }

  console.log(`\nSaved ${savedLooks.length} looks. Creating collection bundle...`);

  if (savedLooks.length > 0) {
    const storeId = savedLooks[0].storeId;
    const { data: minPos } = await supabase
      .from('collection_looks')
      .select('position')
      .eq('store_id', storeId)
      .order('position', { ascending: true })
      .limit(1)
      .single();

    let nextPosition = (minPos?.position ?? 1) - savedLooks.length;
    const { randomUUID } = require('crypto');
    const editorialGroupId = randomUUID();
    const lookIds = [];

    for (const look of savedLooks) {
      const { data: inserted } = await supabase
        .from('collection_looks')
        .insert({
          store_id: storeId,
          image_url: look.imageUrl,
          product_ids: look.productIds.slice(0, 4),
          position: nextPosition++,
          editorial_group_id: editorialGroupId,
          show_credits: true,
        })
        .select('id')
        .single();

      if (inserted) lookIds.push(inserted.id);
    }

    if (lookIds.length > 1) {
      const { data: bundle } = await supabase
        .from('collection_bundles')
        .insert({ store_id: storeId })
        .select('id')
        .single();

      if (bundle) {
        for (let i = 0; i < lookIds.length; i++) {
          await supabase
            .from('collection_looks')
            .update({ bundle_id: bundle.id, bundle_position: i })
            .eq('id', lookIds[i]);
        }
        console.log(`Created bundle ${bundle.id} with ${lookIds.length} looks`);
      }
    }
  }

  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
