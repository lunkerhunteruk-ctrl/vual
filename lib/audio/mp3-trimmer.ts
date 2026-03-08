/**
 * Browser-side MP3 trimming + compression using Web Audio API + lamejs.
 * Trims to maxSeconds and re-encodes at target bitrate to keep file size down.
 */

// lamejs is a CommonJS module without types
// eslint-disable-next-line @typescript-eslint/no-require-imports
const lamejs = require('lamejs');

const MAX_DURATION_SEC = 60;
const TARGET_BITRATE_KBPS = 128;
const MAX_FILE_SIZE_BYTES = 4.5 * 1024 * 1024; // 4.5MB (Vercel limit)

interface TrimResult {
  blob: Blob;
  originalDuration: number;
  trimmedDuration: number;
  originalSize: number;
  compressedSize: number;
}

/**
 * Trims and compresses an MP3 file in the browser.
 * - Decodes to PCM via Web Audio API
 * - Trims to maxSeconds (default 60s)
 * - Re-encodes as MP3 at 128kbps via lamejs
 */
export async function trimAndCompressMP3(
  file: File,
  maxSeconds: number = MAX_DURATION_SEC,
  onProgress?: (phase: string) => void
): Promise<TrimResult> {
  onProgress?.('デコード中...');

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const originalDuration = audioBuffer.duration;
  const trimmedDuration = Math.min(originalDuration, maxSeconds);
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = Math.min(audioBuffer.numberOfChannels, 2); // stereo max
  const trimmedSamples = Math.floor(trimmedDuration * sampleRate);

  onProgress?.('エンコード中...');

  // Get channel data (trimmed)
  const leftChannel = new Float32Array(trimmedSamples);
  leftChannel.set(audioBuffer.getChannelData(0).subarray(0, trimmedSamples));

  let rightChannel: Float32Array | null = null;
  if (numChannels === 2) {
    rightChannel = new Float32Array(trimmedSamples);
    rightChannel.set(audioBuffer.getChannelData(1).subarray(0, trimmedSamples));
  }

  // Encode with lamejs
  const encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, TARGET_BITRATE_KBPS);
  const mp3Chunks: Uint8Array[] = [];

  // Process in chunks of 1152 samples (MP3 frame size)
  const SAMPLES_PER_FRAME = 1152;

  for (let i = 0; i < trimmedSamples; i += SAMPLES_PER_FRAME) {
    const end = Math.min(i + SAMPLES_PER_FRAME, trimmedSamples);
    const chunkSize = end - i;

    // Convert Float32 [-1,1] to Int16 [-32768,32767]
    const leftInt16 = floatTo16BitPCM(leftChannel.subarray(i, end), chunkSize);

    let mp3buf;
    if (numChannels === 2 && rightChannel) {
      const rightInt16 = floatTo16BitPCM(rightChannel.subarray(i, end), chunkSize);
      mp3buf = encoder.encodeBuffer(leftInt16, rightInt16);
    } else {
      mp3buf = encoder.encodeBuffer(leftInt16);
    }

    if (mp3buf.length > 0) {
      mp3Chunks.push(new Uint8Array(mp3buf.buffer, mp3buf.byteOffset, mp3buf.byteLength));
    }
  }

  // Flush remaining data
  const flushBuf = encoder.flush();
  if (flushBuf.length > 0) {
    mp3Chunks.push(new Uint8Array(flushBuf.buffer, flushBuf.byteOffset, flushBuf.byteLength));
  }

  audioContext.close();

  const blob = new Blob(mp3Chunks as BlobPart[], { type: 'audio/mpeg' });

  return {
    blob,
    originalDuration,
    trimmedDuration,
    originalSize: file.size,
    compressedSize: blob.size,
  };
}

function floatTo16BitPCM(float32: Float32Array, length: number): Int16Array {
  const int16 = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16;
}

/**
 * Check if a file needs trimming/compression before upload.
 */
export function needsProcessing(file: File): boolean {
  return file.size > MAX_FILE_SIZE_BYTES;
}

export { MAX_DURATION_SEC, MAX_FILE_SIZE_BYTES };
