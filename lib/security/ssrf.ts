/**
 * SSRF (Server-Side Request Forgery) 防御ユーティリティ
 *
 * ユーザーが任意のURLを入力できる機能で、VUALサーバーが
 * 内部ネットワークへのリクエストに悪用されることを防ぐ。
 */

interface SSRFCheckResult {
  safe: boolean;
  sanitizedUrl: string;
  reason?: string;
}

// プライベートIPレンジ（IPv4）
const PRIVATE_IP_RANGES = [
  /^127\./,                    // Loopback
  /^10\./,                     // Class A private
  /^172\.(1[6-9]|2\d|3[01])\./, // Class B private
  /^192\.168\./,               // Class C private
  /^169\.254\./,               // Link-local
  /^0\./,                      // Current network
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // Shared address space (CGN)
];

// 禁止するホスト名パターン
const BLOCKED_HOSTNAMES = [
  'localhost',
  '0.0.0.0',
  '[::1]',
  'metadata.google.internal',       // GCP metadata
  'instance-data',                   // AWS metadata alias
  '169.254.169.254',                // Cloud metadata endpoint (AWS/GCP/Azure)
  'metadata.google.com',
];

// 許可するプロトコル
const ALLOWED_PROTOCOLS = ['https:', 'http:'];

/**
 * URLがSSRF攻撃に使われないか検証する
 */
export function isSSRFSafe(urlString: string): SSRFCheckResult {
  const fail = (reason: string): SSRFCheckResult => ({
    safe: false,
    sanitizedUrl: '',
    reason,
  });

  // 基本的なURL形式チェック
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return fail('無効なURLです。正しいURLを入力してください。');
  }

  // プロトコルチェック（file://, ftp://, data:, javascript: 等を遮断）
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return fail('無効なURLです。https:// で始まるURLを入力してください。');
  }

  // ユーザー情報（user:pass@host）を遮断
  if (parsed.username || parsed.password) {
    return fail('無効なURLです。正しいURLを入力してください。');
  }

  const hostname = parsed.hostname.toLowerCase();

  // 禁止ホスト名チェック
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return fail('このURLにはアクセスできません。');
  }

  // IPv6ブラケット記法チェック
  if (hostname.startsWith('[')) {
    return fail('このURLにはアクセスできません。');
  }

  // IPアドレス直打ちのプライベートレンジチェック
  if (PRIVATE_IP_RANGES.some((regex) => regex.test(hostname))) {
    return fail('このURLにはアクセスできません。');
  }

  // ドットなしホスト名（内部DNS名）をブロック
  if (!hostname.includes('.')) {
    return fail('無効なURLです。正しいURLを入力してください。');
  }

  // DNS Rebinding 対策：ポート制限（80, 443以外のポートをブロック）
  const port = parsed.port;
  if (port && port !== '80' && port !== '443') {
    return fail('無効なURLです。正しいURLを入力してください。');
  }

  // パスにディレクトリトラバーサルがないか確認
  if (parsed.pathname.includes('..')) {
    return fail('無効なURLです。正しいURLを入力してください。');
  }

  return {
    safe: true,
    sanitizedUrl: parsed.toString(),
  };
}
