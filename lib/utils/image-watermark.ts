import * as sharp from 'sharp';

/**
 * Add credit watermark to a try-on result image.
 * Shows store name prominently + VUAL branding subtly at the bottom.
 */
export async function addCreditWatermark(
  imageBuffer: Buffer,
  storeName: string,
): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 768;
  const height = metadata.height || 1024;

  // Font sizes relative to image width
  const storeFontSize = Math.round(width * 0.028);
  const vualFontSize = Math.round(width * 0.020);
  const bandHeight = Math.round(height * 0.08);
  const padding = Math.round(width * 0.02);

  // Escape XML special characters in store name
  const escapedName = storeName
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${height - bandHeight}" width="${width}" height="${bandHeight}" fill="url(#fade)"/>
  <text
    x="${width / 2}"
    y="${height - padding - vualFontSize - Math.round(storeFontSize * 0.4)}"
    text-anchor="middle"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-size="${storeFontSize}"
    font-weight="500"
    letter-spacing="0.5"
    fill="white"
    opacity="0.95"
  >item coordinated by ${escapedName}</text>
  <text
    x="${width / 2}"
    y="${height - padding}"
    text-anchor="middle"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-size="${vualFontSize}"
    font-weight="400"
    letter-spacing="0.3"
    fill="white"
    opacity="0.65"
  >virtual try-on by VUAL</text>
</svg>`;

  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}
