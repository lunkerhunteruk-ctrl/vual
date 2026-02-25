/**
 * Store resolver for API routes (NextRequest-based).
 *
 * API routes are excluded from middleware matcher, so they need to
 * resolve the store directly from the Host header.
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { extractSubdomain, STORE_SLUG_COOKIE, FALLBACK_STORE_ID } from './store-resolver';

// In-memory cache to avoid DB query on every API call
const storeCache = new Map<string, { id: string; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * Resolve store_id from a NextRequest in API routes.
 * Extracts subdomain from Host header → looks up stores table → returns UUID.
 * Falls back to FALLBACK_STORE_ID if no subdomain or store not found.
 */
export async function resolveStoreIdFromRequest(request: NextRequest): Promise<string> {
  // Try cookie first (set by middleware for page navigations that then call API)
  const slugFromCookie = request.cookies.get(STORE_SLUG_COOKIE)?.value;

  // Then try Host header directly
  const host = request.headers.get('host') || '';
  const slugFromHost = extractSubdomain(host);

  const slug = slugFromCookie || slugFromHost;
  if (!slug) return FALLBACK_STORE_ID;

  return resolveSlugToId(slug);
}

async function resolveSlugToId(slug: string): Promise<string> {
  // Check cache
  const cached = storeCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.id;
  }

  const supabase = createServerClient();
  if (!supabase) return FALLBACK_STORE_ID;

  const { data, error } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', slug)
        .single();

  if (error || !data) {
    console.warn(`Store not found for slug: ${slug}, falling back to default`);
    return FALLBACK_STORE_ID;
  }

  // Update cache
  storeCache.set(slug, { id: data.id, expiresAt: Date.now() + CACHE_TTL_MS });

  return data.id;
}
