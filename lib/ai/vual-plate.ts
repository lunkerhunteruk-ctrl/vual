import sharp from 'sharp';

export interface VualPlateOptions {
  imageBuffer: Buffer;
  shopName: string;
  itemName: string;
  width?: number;
}

const SIDE_BORDER = 24;
const TOP_BORDER = 24;
const BOTTOM_BORDER = 80;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

function createTextOverlaySvg(
  shopName: string,
  itemName: string,
  width: number
): Buffer {
  const safeShop = escapeXml(truncateText(shopName, 30));
  const safeItem = escapeXml(truncateText(itemName, 40));

  const svg = `<svg width="${width}" height="${BOTTOM_BORDER}" xmlns="http://www.w3.org/2000/svg">
  <text x="${width / 2}" y="28" text-anchor="middle"
        font-family="'Helvetica Neue', 'Hiragino Sans', sans-serif"
        font-size="16" font-weight="bold" fill="#333333">${safeShop}</text>
  <text x="${width / 2}" y="48" text-anchor="middle"
        font-family="'Helvetica Neue', 'Hiragino Sans', sans-serif"
        font-size="13" fill="#666666">${safeItem}</text>
  <text x="${width - 12}" y="68" text-anchor="end"
        font-family="'Helvetica Neue', 'Hiragino Sans', sans-serif"
        font-size="11" fill="#aaaaaa">image by VUAL</text>
</svg>`;

  return Buffer.from(svg);
}

/**
 * Apply VUAL Plate frame to an AI-generated try-on image.
 * Creates a polaroid-style frame with shop name, item name,
 * and "image by VUAL" branding.
 */
export async function applyVualPlate(options: VualPlateOptions): Promise<Buffer> {
  const { imageBuffer, shopName, itemName, width: targetWidth = 768 } = options;

  // 1. Resize input image to target width
  const resized = await sharp(imageBuffer)
    .resize(targetWidth, null, { fit: 'inside', withoutEnlargement: false })
    .toBuffer({ resolveWithObject: true });

  const imgWidth = resized.info.width;
  const imgHeight = resized.info.height;

  // 2. Calculate total canvas dimensions
  const canvasWidth = imgWidth + SIDE_BORDER * 2;
  const canvasHeight = imgHeight + TOP_BORDER + BOTTOM_BORDER;

  // 3. Create text overlay SVG
  const textSvg = createTextOverlaySvg(shopName, itemName, canvasWidth);

  // 4. Create subtle inner shadow line (1px gray line around the photo area)
  const borderSvg = Buffer.from(
    `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${SIDE_BORDER - 1}" y="${TOP_BORDER - 1}"
            width="${imgWidth + 2}" height="${imgHeight + 2}"
            fill="none" stroke="#e0e0e0" stroke-width="1" />
    </svg>`
  );

  // 5. Compose final image
  const result = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      // Border line
      { input: borderSvg, top: 0, left: 0 },
      // Main image centered
      { input: resized.data, top: TOP_BORDER, left: SIDE_BORDER },
      // Text overlay at bottom
      { input: textSvg, top: imgHeight + TOP_BORDER, left: 0 },
    ])
    .png({ quality: 90 })
    .toBuffer();

  return result;
}

/**
 * Convert a base64 image string to a Buffer for sharp processing.
 */
export function base64ToBuffer(base64: string): Buffer {
  // Strip data URL prefix if present
  const data = base64.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(data, 'base64');
}

/**
 * Convert a Buffer back to a base64 data URL.
 */
export function bufferToBase64DataUrl(buffer: Buffer, mimeType = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}
