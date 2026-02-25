/**
 * Store resolver utilities for multi-tenant subdomain routing.
 *
 * Used by middleware (subdomain extraction) and server components (store info resolution).
 */

import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';

// Header name set by middleware
export const STORE_SLUG_HEADER = 'x-store-slug';

// Cookie name (fallback for client-side access)
export const STORE_SLUG_COOKIE = 'store-slug';

// Fallback for backward compatibility
export const FALLBACK_STORE_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
export const FALLBACK_STORE_SLUG = 'vual';

export interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  socialInstagram: string | null;
  socialTwitter: string | null;
  socialYoutube: string | null;
  socialLine: string | null;
}

/**
 * Extract subdomain from a hostname.
 * Returns null for root domain, 'www', or IP addresses.
 *
 * Examples:
 *   "mybrand.vual.jp"       → "mybrand"
 *   "mybrand.localhost:3000" → "mybrand"
 *   "vual.jp"               → null
 *   "localhost:3000"         → null
 */
export function extractSubdomain(hostname: string): string | null {
  // Remove port
  const host = hostname.split(':')[0];

  // Handle localhost
  if (host === 'localhost' || host === '127.0.0.1') {
    return null;
  }
  if (host.endsWith('.localhost')) {
    const sub = host.replace('.localhost', '');
    return sub && sub !== 'www' ? sub : null;
  }

  // Handle production domain
  // Split by dots: ["mybrand", "vual", "jp"] = 3 parts → subdomain = "mybrand"
  // ["vual", "jp"] = 2 parts → no subdomain
  const parts = host.split('.');
  if (parts.length <= 2) return null;

  const sub = parts[0];
  return sub && sub !== 'www' ? sub : null;
}

/**
 * Resolve full store info for server components and layouts.
 * Reads the store slug from cookies (set by middleware).
 */
export async function resolveStore(): Promise<StoreInfo | null> {
  const cookieStore = await cookies();
  const slug = cookieStore.get(STORE_SLUG_COOKIE)?.value || FALLBACK_STORE_SLUG;

  const supabase = createServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('stores')
    .select('id, name, slug, description, logo_url')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    logoUrl: data.logo_url,
    primaryColor: null,
    contactEmail: null,
    contactPhone: null,
    socialInstagram: null,
    socialTwitter: null,
    socialYoutube: null,
    socialLine: null,
  };
}
