import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { storage } from '@/lib/storage';

export const maxDuration = 30;

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');
  const category = searchParams.get('category');

  if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 });

  const supa = createServerClient();
  if (!supa) return NextResponse.json({ garments: [] });

  let q = supa
    .from('user_garments')
    .select('id, image_url, category, name, created_at, detail_urls')
    .eq('firebase_uid', uid)
    .order('created_at', { ascending: false });

  if (category) q = q.eq('category', category);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ garments: data ?? [] });
}

export async function POST(request: NextRequest) {
  try {
    const { firebaseUid, items } = await request.json();

    if (!firebaseUid || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'firebaseUid and items required' }, { status: 400 });
    }

    const supa = createServerClient();
    if (!supa) return NextResponse.json({ error: 'DB unavailable' }, { status: 500 });

    const ts = Date.now();
    const inserts = await Promise.all(
      items.map(async (item: { imageDataUrl?: string; imageUrl?: string; category: string; name?: string }, i: number) => {
        let imageUrl = item.imageUrl ?? null;

        if (item.imageDataUrl && !imageUrl) {
          const path = `user-garments/${firebaseUid}/${ts}-${i}.jpg`;
          imageUrl = await uploadBase64(item.imageDataUrl, path);
        }

        if (!imageUrl) return null;

        return {
          firebase_uid: firebaseUid,
          image_url: imageUrl,
          category: item.category || 'その他',
          name: item.name ?? null,
        };
      })
    );

    const valid = inserts.filter(Boolean) as { firebase_uid: string; image_url: string; category: string; name: string | null }[];
    if (valid.length === 0) return NextResponse.json({ created: 0 });

    const { data, error } = await supa.from('user_garments').insert(valid).select('id, image_url, category, name');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ created: data?.length ?? 0, garments: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
