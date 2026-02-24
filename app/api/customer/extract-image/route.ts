import { NextRequest, NextResponse } from 'next/server';
import { isSSRFSafe } from '@/lib/security/ssrf';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URLを入力してください' }, { status: 400 });
    }

    // --- SSRF防御 ---
    const ssrfCheck = isSSRFSafe(url);
    if (!ssrfCheck.safe) {
      return NextResponse.json({ error: ssrfCheck.reason }, { status: 400 });
    }

    // タイムアウト付きでフェッチ（長時間ハングを防止）
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let response: Response;
    try {
      response = await fetch(ssrfCheck.sanitizedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return NextResponse.json({
          error: '指定されたURLの読み込みに時間がかかりすぎました。直接画像をアップロードしてください。',
          suggest_upload: true,
        }, { status: 408 });
      }
      return NextResponse.json({
        error: '指定されたURLにアクセスできませんでした。サイトのセキュリティ設定により取得できない可能性があります。直接画像をアップロードしてください。',
        suggest_upload: true,
      }, { status: 400 });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return NextResponse.json({
        error: '指定されたURLから画像を読み込めませんでした。サイトのセキュリティ設定により取得できない可能性があります。直接画像をアップロードしてください。',
        suggest_upload: true,
      }, { status: 400 });
    }

    // レスポンスサイズ制限（5MB）— 巨大レスポンスでメモリ枯渇を防ぐ
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      return NextResponse.json({
        error: 'ページサイズが大きすぎます。直接画像をアップロードしてください。',
        suggest_upload: true,
      }, { status: 400 });
    }

    const html = await response.text();

    // HTMLサイズ上限チェック（Content-Lengthが無い場合の安全策）
    if (html.length > 5 * 1024 * 1024) {
      return NextResponse.json({
        error: 'ページサイズが大きすぎます。直接画像をアップロードしてください。',
        suggest_upload: true,
      }, { status: 400 });
    }

    // Extract product image from OG tags or common patterns
    let imageUrl: string | null = null;

    // 1. Try og:image
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogMatch) {
      imageUrl = ogMatch[1];
    }

    // 2. Try twitter:image
    if (!imageUrl) {
      const twitterMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
      if (twitterMatch) {
        imageUrl = twitterMatch[1];
      }
    }

    // 3. Try JSON-LD product schema
    if (!imageUrl) {
      const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
      if (jsonLdMatch) {
        for (const match of jsonLdMatch) {
          try {
            const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
            const json = JSON.parse(jsonContent);
            if (json.image) {
              imageUrl = Array.isArray(json.image) ? json.image[0] : json.image;
              break;
            }
          } catch {
            // skip invalid JSON-LD
          }
        }
      }
    }

    if (!imageUrl) {
      return NextResponse.json({
        error: '商品画像が見つかりませんでした。サイトの構造により自動取得できない場合があります。直接画像をアップロードしてください。',
        suggest_upload: true,
      });
    }

    // Make URL absolute if relative
    if (imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl;
    } else if (imageUrl.startsWith('/')) {
      const urlObj = new URL(ssrfCheck.sanitizedUrl);
      imageUrl = urlObj.origin + imageUrl;
    }

    // 抽出した画像URLもSSRFチェック
    const imageSSRFCheck = isSSRFSafe(imageUrl);
    if (!imageSSRFCheck.safe) {
      return NextResponse.json({
        error: '取得された画像URLが無効です。直接画像をアップロードしてください。',
        suggest_upload: true,
      }, { status: 400 });
    }

    return NextResponse.json({ imageUrl: imageSSRFCheck.sanitizedUrl });
  } catch (error: any) {
    console.error('Extract image error:', error);
    return NextResponse.json({
      error: '画像の抽出に失敗しました。直接画像をアップロードしてください。',
      suggest_upload: true,
    }, { status: 500 });
  }
}
