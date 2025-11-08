import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from './env'

let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = SUPABASE_URL;
    const key = SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
    }
    supabaseClient = createClient(url, key);
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
