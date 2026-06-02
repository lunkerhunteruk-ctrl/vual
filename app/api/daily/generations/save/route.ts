import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const R2_BUCKET = 'vual-media';
const R2_PUBLIC_URL = 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev';

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl, userId, lookFile, city } = await req.json();

    if (!imageDataUrl || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const match = imageDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
    }

    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');

    const timestamp = Date.now();
    const key = `vault/generations/${userId}/${timestamp}.${ext}`;

    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: `image/${match[1]}`,
    }));

    const imageUrl = `${R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ success: true, imageUrl });
  } catch (err) {
    console.error('Save generation error:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
