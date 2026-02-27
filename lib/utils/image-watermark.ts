import sharp from 'sharp';
import { ensureFontConfig } from './font-setup';

/**
 * Add credit watermark to a try-on result image.
 * Shows store name prominently + VUAL branding subtly at the bottom.
 */
export async function addCreditWatermark(
  imageBuffer: Buffer,
  storeName: string,
): Promise<Buffer> {
  ensureFontConfig();

  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 768;
  const height = metadata.height || 1024;

  const storeFontSize = Math.round(width * 0.022);
  const vualFontSize = Math.round(width * 0.018);
  const paddingX = Math.round(width * 0.03);
  const paddingY = Math.round(height * 0.10);
  const lineGap = Math.round(storeFontSize * 1.4);

  const escapedName = storeName
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Position: right-aligned, raised from bottom
  const textX = width - paddingX;
  const vualY = height - paddingY;
  const storeY = vualY - lineGap;

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <text
    x="${textX}"
    y="${storeY}"
    text-anchor="end"
    font-family="Inter"
    font-size="${storeFontSize}"
    font-weight="500"
    letter-spacing="0.5"
    fill="white"
    opacity="0.85"
  >Styled by ${escapedName}</text>
  <text
    x="${textX}"
    y="${vualY}"
    text-anchor="end"
    font-family="Inter"
    font-size="${vualFontSize}"
    font-weight="500"
    letter-spacing="0.3"
    fill="white"
    opacity="0.70"
  >virtual try-on by VUAL</text>
</svg>`;

  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}
