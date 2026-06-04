require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const R2_BUCKET = process.env.R2_BUCKET_GEMINI || 'vual-gemini';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL_GEMINI;
const storeId = '5ab7bdaf-0355-46dc-af41-51bcb2d4b496';

async function processBatch(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const responses = data.metadata?.output?.inlinedResponses?.inlinedResponses || [];
  console.log(`Processing ${file}: ${responses.length} responses`);
  const lookUrls = [];

  for (let i = 0; i < responses.length; i++) {
    const resp = responses[i];
    const queueId = resp.metadata?.key;
    const parts = resp.response?.candidates?.[0]?.content?.parts || [];
    let imgData = null, mimeType = 'image/jpeg';
    for (const p of parts) {
      const d = p.inlineData || p.inline_data;
      if (d) { imgData = d.data; mimeType = d.mimeType || d.mime_type || 'image/jpeg'; break; }
    }
    if (!imgData) { console.log(`  [${i}] no image`); continue; }

    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const filename = `gemini-batch-${Date.now()}-${i}.${ext}`;
    await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: filename, Body: Buffer.from(imgData, 'base64'), ContentType: mimeType }));
    const imageUrl = `${R2_PUBLIC_URL}/${filename}`;

    await supabase.from('gemini_results').insert({ image_url: imageUrl, storage_path: filename, garment_count: 1, product_ids: [], expires_at: new Date(Date.now() + 5*24*60*60*1000).toISOString(), source: 'studio', store_id: storeId });
    if (queueId) await supabase.from('batch_queue').update({ status: 'completed', result_image_url: imageUrl, result_saved: true, completed_at: new Date().toISOString() }).eq('id', queueId);

    lookUrls.push(imageUrl);
    console.log(`  [${i}] uploaded ${filename}`);
  }

  // Add to collection as bundle
  if (lookUrls.length > 0) {
    const { data: minPos } = await supabase.from('collection_looks').select('position').eq('store_id', storeId).order('position', { ascending: true }).limit(1).single();
    let pos = (minPos?.position ?? 1) - lookUrls.length;
    const egId = randomUUID();
    const lookIds = [];
    for (const url of lookUrls) {
      const { data: ins } = await supabase.from('collection_looks').insert({ store_id: storeId, image_url: url, position: pos++, editorial_group_id: egId, show_credits: true }).select('id').single();
      if (ins) lookIds.push(ins.id);
    }
    if (lookIds.length > 1) {
      const { data: bundle } = await supabase.from('collection_bundles').insert({ store_id: storeId }).select('id').single();
      if (bundle) {
        for (let i = 0; i < lookIds.length; i++) await supabase.from('collection_looks').update({ bundle_id: bundle.id, bundle_position: i }).eq('id', lookIds[i]);
        console.log(`  Bundle: ${bundle.id} (${lookIds.length} looks)`);
      }
    }
  }
}

(async () => {
  await processBatch('/tmp/rescue_b1.json');
  await processBatch('/tmp/rescue_b2.json');
  console.log('Done!');
})().catch(e => { console.error(e); process.exit(1); });
