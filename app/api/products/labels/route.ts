import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateLabel } from '@/lib/utils/label-generator';
import * as JSZip from 'jszip';

interface LabelRequest {
  productId: string;
  variantIds?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: LabelRequest = await request.json();
    const { productId, variantIds } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, base_price, currency, store_id, sku')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Fetch store name
    const { data: store } = await supabase
      .from('stores')
      .select('name')
      .eq('id', product.store_id)
      .single();
    const storeName = store?.name || 'SHOP';

    // Fetch variants
    const { data: variants } = await supabase
      .from('product_variants')
      .select('id, color, size, sku, price_override, stock')
      .eq('product_id', productId)
      .order('created_at', { ascending: true });

    const allVariants = variants || [];

    // Filter variants if specific IDs requested
    const targetVariants = variantIds && variantIds.length > 0
      ? allVariants.filter((v) => variantIds.includes(v.id))
      : allVariants;

    // No variants → generate single label from product-level data
    if (targetVariants.length === 0) {
      const label = await generateLabel({
        sku: product.sku || productId.slice(0, 8),
        productName: product.name,
        price: product.base_price,
        currency: product.currency || 'JPY',
        storeName,
      });

      return new NextResponse(label, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="label-${product.sku || productId.slice(0, 8)}.png"`,
        },
      });
    }

    // Single variant → return PNG directly
    if (targetVariants.length === 1) {
      const v = targetVariants[0];
      const label = await generateLabel({
        sku: v.sku,
        productName: product.name,
        color: v.color,
        size: v.size,
        price: v.price_override ?? product.base_price,
        currency: product.currency || 'JPY',
        storeName,
      });

      return new NextResponse(label, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="label-${v.sku}.png"`,
        },
      });
    }

    // Multiple variants → ZIP
    const zip = new JSZip();

    for (const v of targetVariants) {
      const label = await generateLabel({
        sku: v.sku,
        productName: product.name,
        color: v.color,
        size: v.size,
        price: v.price_override ?? product.base_price,
        currency: product.currency || 'JPY',
        storeName,
      });
      zip.file(`label-${v.sku}.png`, label);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="labels-${product.name}.zip"`,
      },
    });
  } catch (error) {
    console.error('Label generation error:', error);
    return NextResponse.json({ error: 'Label generation failed' }, { status: 500 });
  }
}
