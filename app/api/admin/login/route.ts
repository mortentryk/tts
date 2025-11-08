import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_PASSWORD } from '@/lib/env';
import { createAdminSession, setAdminSession, verifyPassword, hashPassword } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// Store hashed password in database (one-time setup)
// For now, we'll use a simple comparison but log a warning
let hashedPassword: string | null = null;

async function getHashedPassword(): Promise<string> {
  if (hashedPassword) {
    return hashedPassword;
  }

  // Try to get from database (admin_settings table)
  const { data } = await supabaseAdmin
    .from('admin_settings')
    .select('hashed_password')
    .eq('key', 'admin_password_hash')
    .single();

  if (data?.hashed_password) {
    hashedPassword = data.hashed_password;
    return data.hashed_password;
  }

  // If no hash in DB, create one from env var and store it
  if (ADMIN_PASSWORD) {
    const hash = await hashPassword(ADMIN_PASSWORD);
    
    // Store in database for future use
    await supabaseAdmin.from('admin_settings').upsert({
      key: 'admin_password_hash',
      hashed_password: hash,
      updated_at: new Date().toISOString(),
    });

    hashedPassword = hash;
    return hash;
  }

  throw new Error('ADMIN_PASSWORD not configured');
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    if (!ADMIN_PASSWORD) {
      console.error('ADMIN_PASSWORD environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get hashed password from database or create from env
    const hash = await getHashedPassword();
    const isValid = await verifyPassword(password, hash);

    if (isValid) {
      // Create session token
      const token = await createAdminSession();
      await setAdminSession(token);

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}
