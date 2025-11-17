/**
 * Client-side authentication utilities using Supabase Auth
 * Replaces the localStorage-based email system
 */
'use client';

import { createClient } from './supabaseClient';
import type { User } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  user: User;
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = createClient();
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
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get the current user's email (for backward compatibility)
 */
export async function getUserEmail(): Promise<string | null> {
  const authUser = await getCurrentUser();
  return authUser?.email || null;
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign in with magic link (passwordless)
 */
export async function signInWithMagicLink(email: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign out
 */
export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  const supabase = createClient();
  
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user?.email) {
      const authUser: AuthUser = {
        id: session.user.id,
        email: session.user.email,
        user: session.user,
      };
      callback(authUser);
    } else {
      callback(null);
    }
  });
  
  return data;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

