/**
 * CSV file parsing with automatic encoding detection (UTF-8 / Shift_JIS).
 * Uses PapaParse for robust CSV parsing.
 */

import Papa from 'papaparse';

export interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
  encoding: string;
  rowCount: number;
}

/**
 * Check if parsed text contains garbled characters (mojibake).
 * Shift_JIS text parsed as UTF-8 produces replacement characters.
 */
function hasGarbledText(rows: Record<string, string>[]): boolean {
  const sampleSize = Math.min(rows.length, 10);
  for (let i = 0; i < sampleSize; i++) {
    const values = Object.values(rows[i]);
    for (const val of values) {
      // U+FFFD = replacement character (garbled UTF-8)
      if (val.includes('\ufffd')) return true;
    }
  }
  return false;
}

/**
 * Parse a CSV file as text with a specific encoding.
 */
function readFileAsText(file: File, encoding: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file, encoding);
  });
}

/**
 * Parse CSV text using PapaParse.
 */
function parseCSVText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  return {
    headers: result.meta.fields || [],
    rows: result.data,
  };
}

/**
 * Parse a CSV file with automatic encoding detection.
 *
 * Strategy:
 * 1. Try UTF-8 first
 * 2. If garbled text is detected, retry with Shift_JIS
 */
export async function parseCSVFile(file: File): Promise<ParseResult> {
  // First attempt: UTF-8
  const utf8Text = await readFileAsText(file, 'UTF-8');
  const utf8Result = parseCSVText(utf8Text);

  if (utf8Result.rows.length > 0 && !hasGarbledText(utf8Result.rows)) {
    return {
      headers: utf8Result.headers,
      rows: utf8Result.rows,
      encoding: 'UTF-8',
      rowCount: utf8Result.rows.length,
    };
  }

  // Second attempt: Shift_JIS
  const sjisText = await readFileAsText(file, 'Shift_JIS');
  const sjisResult = parseCSVText(sjisText);

  return {
    headers: sjisResult.headers,
    rows: sjisResult.rows,
    encoding: 'Shift_JIS',
    rowCount: sjisResult.rows.length,
  };
}
