/**
 * Parse video duration from mp4 mvhd box.
 * Returns duration in seconds, or null if not found.
 */
export function parseMp4Duration(buffer: Buffer): number | null {
  const mvhdIdx = buffer.indexOf(Buffer.from('mvhd'));
  if (mvhdIdx === -1) return null;

  const version = buffer[mvhdIdx + 4];
  if (version === 0) {
    const timescale = buffer.readUInt32BE(mvhdIdx + 16);
    const dur = buffer.readUInt32BE(mvhdIdx + 20);
    if (timescale > 0) return Math.round((dur / timescale) * 10) / 10;
  } else {
    const timescale = buffer.readUInt32BE(mvhdIdx + 24);
    const dur = Number(buffer.readBigUInt64BE(mvhdIdx + 28));
    if (timescale > 0) return Math.round((dur / timescale) * 10) / 10;
  }

  return null;
}
