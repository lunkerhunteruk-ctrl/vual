/**
 * Detect actual image format from binary data (magic bytes).
 * Returns 'png' or 'jpg'. Falls back to 'jpg' for unknown formats.
 */
export async function detectImageExt(blob: Blob): Promise<'png' | 'jpg'> {
  const header = await blob.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(header);
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'png';
  }
  return 'jpg';
}
