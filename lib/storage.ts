/**
 * Unified storage adapter — Cloudflare R2 (S3-compatible).
 *
 * Drop-in replacement for supabase.storage.from(bucket) calls.
 *
 * Bucket mapping:
 *   'gemini-results' → R2 bucket: vual-gemini  (temporary AI results, auto-cleaned)
 *   'model-images'   → R2 bucket: vual-media   (permanent collection images)
 *   'media'          → R2 bucket: vual-media   (product images, uploads)
 */

import { S3Client, PutObjectCommand, DeleteObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// ── R2 client (lazy singleton) ──────────────────────────────

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2 env vars: CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  }

  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return _client;
}

/**
 * Resolve Supabase bucket name → R2 bucket + public URL.
 *   'gemini-results' → vual-gemini bucket
 *   everything else  → vual-media bucket (with prefix)
 */
function resolveR2(supabaseBucket: string): { r2Bucket: string; prefix: string; publicUrl: string } {
  if (supabaseBucket === 'gemini-results') {
    return {
      r2Bucket: process.env.R2_BUCKET_GEMINI || 'vual-gemini',
      prefix: '',  // files go to root of vual-gemini bucket
      publicUrl: process.env.R2_PUBLIC_URL_GEMINI || '',
    };
  }
  // model-images, media, etc. → vual-media bucket with prefix
  return {
    r2Bucket: process.env.R2_BUCKET_MEDIA || 'vual-media',
    prefix: supabaseBucket, // e.g. "model-images/filename.png" or "media/filename.png"
    publicUrl: process.env.R2_PUBLIC_URL_MEDIA || '',
  };
}

// ── Public API (matches supabase.storage patterns) ──────────

export const storage = {
  from(bucket: string) {
    const { r2Bucket, prefix, publicUrl } = resolveR2(bucket);

    /** Build the full R2 object key */
    const toKey = (path: string) => prefix ? `${prefix}/${path}` : path;

    return {
      /**
       * Upload a file.
       */
      async upload(
        path: string,
        body: Buffer | Uint8Array | Blob,
        options?: { contentType?: string; upsert?: boolean },
      ): Promise<{ data: { path: string } | null; error: Error | null }> {
        const key = toKey(path);
        try {
          const client = getClient();
          await client.send(new PutObjectCommand({
            Bucket: r2Bucket,
            Key: key,
            Body: body instanceof Blob ? Buffer.from(await body.arrayBuffer()) : body,
            ContentType: options?.contentType || 'application/octet-stream',
          }));
          return { data: { path: key }, error: null };
        } catch (err) {
          console.error(`[R2] upload failed: ${r2Bucket}/${key}`, err);
          return { data: null, error: err as Error };
        }
      },

      /**
       * Get the public URL for a file.
       */
      getPublicUrl(path: string): { data: { publicUrl: string } } {
        const key = toKey(path);
        if (publicUrl) {
          return { data: { publicUrl: `${publicUrl}/${key}` } };
        }
        // Fallback to S3 API URL (requires public access)
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        return { data: { publicUrl: `https://${accountId}.r2.cloudflarestorage.com/${r2Bucket}/${key}` } };
      },

      /**
       * Delete files.
       */
      async remove(paths: string[]): Promise<{ error: Error | null }> {
        if (paths.length === 0) return { error: null };
        try {
          const client = getClient();
          await client.send(new DeleteObjectsCommand({
            Bucket: r2Bucket,
            Delete: {
              Objects: paths.map(p => ({ Key: toKey(p) })),
              Quiet: true,
            },
          }));
          return { error: null };
        } catch (err) {
          console.error(`[R2] remove failed: ${r2Bucket}/`, err);
          return { error: err as Error };
        }
      },

      /**
       * Create a signed upload URL (presigned PUT).
       * Equivalent to: supabase.storage.from('bucket').createSignedUploadUrl(path)
       */
      async createSignedUploadUrl(path: string): Promise<{ data: { signedUrl: string; token: string; path: string } | null; error: Error | null }> {
        const key = toKey(path);
        try {
          const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
          const client = getClient();
          const command = new PutObjectCommand({
            Bucket: r2Bucket,
            Key: key,
          });
          const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
          return { data: { signedUrl, token: 'r2', path: key }, error: null };
        } catch (err) {
          console.error(`[R2] createSignedUploadUrl failed: ${r2Bucket}/${key}`, err);
          return { data: null, error: err as Error };
        }
      },

      /**
       * Create a signed URL for private access.
       */
      async createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl: string } | null; error: Error | null }> {
        const key = toKey(path);
        try {
          const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
          const client = getClient();
          const command = new GetObjectCommand({
            Bucket: r2Bucket,
            Key: key,
          });
          const signedUrl = await getSignedUrl(client, command, { expiresIn });
          return { data: { signedUrl }, error: null };
        } catch (err) {
          console.error(`[R2] createSignedUrl failed: ${r2Bucket}/${key}`, err);
          return { data: null, error: err as Error };
        }
      },
    };
  },
};

/**
 * Ingest an external image URL into our own R2 bucket and return the new
 * public URL. Used when migrating products from Shopify/BASE/etc — their CSV
 * exports reference the source CDN, which dies once the merchant leaves that
 * platform. Copying the bytes to R2 makes the migration self-contained.
 *
 * Already-internal URLs (our own R2 public URL or data: URIs) are returned
 * untouched. On any failure the original URL is returned so the import never
 * breaks — worst case the image stays a remote reference, same as before.
 */
export async function ingestExternalImage(
  sourceUrl: string,
  destPrefix = 'imported',
): Promise<string> {
  if (!sourceUrl || sourceUrl.startsWith('data:')) return sourceUrl;

  // Skip if already on our own R2 public URL.
  const ownPublic = process.env.R2_PUBLIC_URL_MEDIA;
  if (ownPublic && sourceUrl.startsWith(ownPublic)) return sourceUrl;

  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      console.warn(`[ingest] fetch ${res.status} for ${sourceUrl} — keeping original`);
      return sourceUrl;
    }
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());

    // Derive an extension from the content type or the URL.
    const extFromType = contentType.split('/')[1]?.split(';')[0];
    const extFromUrl = sourceUrl.split('?')[0].split('.').pop();
    const ext = (extFromType || extFromUrl || 'jpg').toLowerCase().replace('jpeg', 'jpg');

    // Deterministic-ish unique key without Date.now/random (unavailable here):
    // hash the source URL so re-imports dedupe to the same key.
    let hash = 0;
    for (let i = 0; i < sourceUrl.length; i++) {
      hash = ((hash << 5) - hash + sourceUrl.charCodeAt(i)) | 0;
    }
    const key = `${destPrefix}/${Math.abs(hash).toString(36)}-${buf.length}.${ext}`;

    const { error } = await storage.from('media').upload(key, buf, {
      contentType,
      upsert: true,
    });
    if (error) {
      console.warn(`[ingest] R2 upload failed for ${sourceUrl} — keeping original`, error);
      return sourceUrl;
    }
    return storage.from('media').getPublicUrl(key).data.publicUrl;
  } catch (err) {
    console.warn(`[ingest] error for ${sourceUrl} — keeping original`, err);
    return sourceUrl;
  }
}
