import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabaseUrl && supabaseUrl !== 'your_supabase_url_here' && supabaseAnonKey;
};

// Client-side Supabase client
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Server-side Supabase client with service role (for API routes)
export function createServerClient(): SupabaseClient | null {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!isSupabaseConfigured() || !supabaseServiceKey || supabaseServiceKey === 'your_service_role_key_here') {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}
