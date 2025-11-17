import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    // This is a client-side operation, but we need to handle the callback
    // The actual auth state will be set by the client
    return NextResponse.redirect(new URL(`/auth/callback?code=${code}&next=${next}`, requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

