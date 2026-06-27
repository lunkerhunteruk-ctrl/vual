import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export const maxDuration = 60;

async function uploadBase64(dataUrl: string, path: string): Promise<string | null> {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return null;
  const [, mimeType, base64Data] = match;
  const buffer = Buffer.from(base64Data, 'base64');
  const { error } = await storage.from('model-images').upload(path, buffer, { contentType: mimeType, upsert: false });
  if (error) return null;
  const { data } = storage.from('model-images').getPublicUrl(path);
  return data.publicUrl;
}

// POST /api/my/upload-garments
// Body: { garmentImageSets: Record<number, string[]>, firebaseUid: string, bundleKey: string }
// Returns: { garmentUrlSets: Record<number, string[]> }
export async function POST(request: NextRequest) {
  try {
    const { garmentImageSets, firebaseUid, bundleKey } = await request.json();

    if (!firebaseUid || !garmentImageSets) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const key = bundleKey || `wardrobe/${firebaseUid}/${Date.now()}`;
    const garmentUrlSets: Record<number, string[]> = {};

    await Promise.all(
      Object.entries(garmentImageSets).map(async ([outfitIdxStr, garments]) => {
        const outfitIdx = parseInt(outfitIdxStr, 10);
        const uploaded = await Promise.all(
          (garments as string[]).map((img, i) =>
            uploadBase64(img, `${key}/garments/outfit${outfitIdx}-${i}.jpg`)
          )
        );
        garmentUrlSets[outfitIdx] = uploaded.filter(Boolean) as string[];
      })
    );

    return NextResponse.json({ garmentUrlSets, bundleKey: key });
  } catch (err) {
    console.error('[UploadGarments] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
