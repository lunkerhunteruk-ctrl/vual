import sharp from 'sharp';
import QRCode from 'qrcode';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface LabelParams {
  sku: string;
  productName: string;
  color?: string | null;
  size?: string | null;
  price: number;
  currency: string;
  storeName: string;
}

const LABEL_W = 580;
const LABEL_H = 280;
const QR_SIZE = 200;
const QR_MARGIN = 30;
const TEXT_X = QR_MARGIN + QR_SIZE + 24;

// Load font once at module level
let fontBase64: string | null = null;
function getFontBase64(): string {
  if (!fontBase64) {
    try {
      const fontPath = join(process.cwd(), 'public', 'fonts', 'Inter-Variable.ttf');
      fontBase64 = readFileSync(fontPath).toString('base64');
    } catch {
      fontBase64 = '';
    }
  }
  return fontBase64;
}

function fontFaceSvg(): string {
  const b64 = getFontBase64();
  if (!b64) return '';
  return `<style>@font-face { font-family: 'Inter'; src: url('data:font/ttf;base64,${b64}') format('truetype'); font-weight: 100 900; }</style>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPrice(price: number, currency: string): string {
  if (currency === 'JPY' || currency === 'KRW') {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency }).format(price);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/**
 * Generate a single label PNG image with QR code and product info.
 */
export async function generateLabel(params: LabelParams): Promise<Buffer> {
  const { sku, productName, color, size, price, currency, storeName } = params;

  // Generate QR code as PNG buffer
  const qrBuffer = await QRCode.toBuffer(sku, {
    type: 'png',
    width: QR_SIZE,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  // Build variant line
  const variantParts: string[] = [];
  if (color) variantParts.push(color);
  if (size) variantParts.push(size);
  const variantLine = variantParts.join(' / ');

  const nameDisplay = escapeXml(truncate(productName, 22));
  const variantDisplay = escapeXml(variantLine);
  const priceDisplay = escapeXml(formatPrice(price, currency));
  const skuDisplay = escapeXml(sku);
  const storeDisplay = escapeXml(storeName);

  // Pre-compute Y positions based on whether variant line exists
  const nameY = QR_MARGIN + 28;
  const variantY = QR_MARGIN + 62;
  const priceY = QR_MARGIN + (variantLine ? 100 : 66);
  const skuY = QR_MARGIN + (variantLine ? 132 : 98);

  const fontFamily = getFontBase64() ? "'Inter'" : "sans-serif";

  const variantSvg = variantLine
    ? `<text x="${TEXT_X}" y="${variantY}" font-family="${fontFamily}" font-size="18" fill="#555555">${variantDisplay}</text>`
    : '';

  const svg = `<svg width="${LABEL_W}" height="${LABEL_H}" xmlns="http://www.w3.org/2000/svg">
  ${fontFaceSvg()}
  <rect width="${LABEL_W}" height="${LABEL_H}" fill="white" rx="8" ry="8"/>
  <rect x="1" y="1" width="${LABEL_W - 2}" height="${LABEL_H - 2}" fill="none" stroke="#E0E0E0" stroke-width="1" rx="8" ry="8"/>
  <text x="${TEXT_X}" y="${nameY}" font-family="${fontFamily}" font-size="22" font-weight="600" fill="#1A1A1A">${nameDisplay}</text>
  ${variantSvg}
  <text x="${TEXT_X}" y="${priceY}" font-family="${fontFamily}" font-size="24" font-weight="700" fill="#1A1A1A">${priceDisplay}</text>
  <text x="${TEXT_X}" y="${skuY}" font-family="${fontFamily}" font-size="13" fill="#999999" letter-spacing="0.5">SKU: ${skuDisplay}</text>
  <text x="${LABEL_W - 16}" y="${LABEL_H - 16}" text-anchor="end" font-family="${fontFamily}" font-size="11" fill="#BBBBBB" letter-spacing="0.3">${storeDisplay}</text>
</svg>`;

  // Create label: white background + QR composite + text SVG overlay
  return sharp({
    create: {
      width: LABEL_W,
      height: LABEL_H,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: await sharp(qrBuffer).resize(QR_SIZE, QR_SIZE).png().toBuffer(),
        top: (LABEL_H - QR_SIZE) / 2 | 0,
        left: QR_MARGIN,
      },
      {
        input: Buffer.from(svg),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();
}
