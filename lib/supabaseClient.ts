/**
 * Client-side Supabase client for authentication
 * This is separate from the server-side client to ensure proper auth handling
 */
import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

// Legacy defaults as fallback
const LEGACY_SUPABASE_URL = 'https://ooyzdksmeglhocjlaouo.supabase.co';
const LEGACY_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MzMzODksImV4cCI6MjA3NjIwOTM4OX0.DbgORlJkyBae_VIg0b6Pk-bSuzZ8vmb2hNHVnhE7wI8';

let supabaseBrowserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (typeof window === 'undefined') {
    // Server-side: return null or throw
    throw new Error('createClient should only be called on the client side');
  }

  if (supabaseBrowserClient) {
    return supabaseBrowserClient;
  }

  const url = SUPABASE_URL || LEGACY_SUPABASE_URL;
  const key = SUPABASE_ANON_KEY || LEGACY_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  supabaseBrowserClient = createBrowserClient(url, key);
  return supabaseBrowserClient;
}

