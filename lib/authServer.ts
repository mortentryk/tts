/**
 * Server-side authentication utilities
 * Gets user from Supabase Auth session
 */
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

// Legacy defaults
const LEGACY_SUPABASE_URL = 'https://ooyzdksmeglhocjlaouo.supabase.co';
const LEGACY_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MzMzODksImV4cCI6MjA3NjIwOTM4OX0.DbgORlJkyBae_VIg0b6Pk-bSuzZ8vmb2hNHVnhE7wI8';

/**
 * Get the current authenticated user from server-side request
 */
export async function getServerUser() {
  try {
    const cookieStore = await cookies();
    const url = SUPABASE_URL || LEGACY_SUPABASE_URL;
    const key = SUPABASE_ANON_KEY || LEGACY_SUPABASE_ANON_KEY;

    const supabase = createClient(url, key, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.delete(name);
        },
      },
    });

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user || !user.email) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      user,
    };
  } catch (error) {
    console.error('Error getting server user:', error);
    return null;
  }
}

