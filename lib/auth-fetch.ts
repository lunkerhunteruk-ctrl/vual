import { auth } from '@/lib/firebase';

/**
 * fetch と同じ使い方で、ログイン中なら Firebase の IDトークンを付けて送る。
 * ログインしていなければそのまま送る（通すかどうかはサーバー側が決める）。
 */
export async function authFetch(url: string, options: RequestInit = {}) {
  if (auth) await auth.authStateReady();
  const user = auth?.currentUser;
  if (!user) return fetch(url, options);
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  return fetch(url, { ...options, headers });
}
