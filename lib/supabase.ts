import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_SERVICE_ROLE_KEY } from './env'

// Read NEXT_PUBLIC_* variables directly from process.env to avoid client-side import issues
// These must be available at build time and are embedded in the client bundle
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
    }
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseAdminClient) {
    const url = SUPABASE_URL;
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
