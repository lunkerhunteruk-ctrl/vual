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
