import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from './env'

// Legacy defaults as final fallback
const LEGACY_SUPABASE_URL = 'https://ooyzdksmeglhocjlaouo.supabase.co';
const LEGACY_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MzMzODksImV4cCI6MjA3NjIwOTM4OX0.DbgORlJkyBae_VIg0b6Pk-bSuzZ8vmb2hNHVnhE7wI8';

let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    // Use env vars if available, otherwise fall back to legacy defaults
    const url = SUPABASE_URL || LEGACY_SUPABASE_URL;
    const key = SUPABASE_ANON_KEY || LEGACY_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
    }
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseAdminClient) {
    // Use env vars if available, otherwise fall back to legacy defaults for URL
    const url = SUPABASE_URL || LEGACY_SUPABASE_URL;
    const key = SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
    }
    supabaseAdminClient = createClient(url, key);
  }
  return supabaseAdminClient;
}

// Use Object.defineProperty to create lazy getters that preserve types
const supabaseObj = {} as { supabase: SupabaseClient; supabaseAdmin: SupabaseClient };

Object.defineProperty(supabaseObj, 'supabase', {
  get: getSupabaseClient,
  enumerable: true,
  configurable: false,
});

Object.defineProperty(supabaseObj, 'supabaseAdmin', {
  get: getSupabaseAdminClient,
  enumerable: true,
  configurable: false,
});

export const supabase = supabaseObj.supabase;
export const supabaseAdmin = supabaseObj.supabaseAdmin;
