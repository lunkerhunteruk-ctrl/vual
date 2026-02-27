import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { INTER_FONT_BASE64 } from './inter-font';

const FONT_DIR = '/tmp/fonts';
const FONT_PATH = join(FONT_DIR, 'Inter-Variable.ttf');
const CONF_PATH = join(FONT_DIR, 'fonts.conf');

let initialized = false;

/**
 * Ensure fontconfig is set up with Inter font in /tmp.
 * Required for sharp SVG text rendering on Vercel serverless (no system fonts).
 * Idempotent — only writes files once per cold start.
 */
export function ensureFontConfig(): void {
  if (initialized) return;

  if (!existsSync(FONT_PATH)) {
    mkdirSync(FONT_DIR, { recursive: true });
    writeFileSync(FONT_PATH, Buffer.from(INTER_FONT_BASE64, 'base64'));
  }

  if (!existsSync(CONF_PATH)) {
    const fontsConf = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <dir>/tmp/fonts</dir>
</fontconfig>`;
    writeFileSync(CONF_PATH, fontsConf);
  }

  process.env.FONTCONFIG_PATH = FONT_DIR;
  initialized = true;
}
