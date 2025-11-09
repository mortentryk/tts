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

    // Debug: Log if ADMIN_PASSWORD is available (without exposing the value)
    console.log('ADMIN_PASSWORD available:', !!ADMIN_PASSWORD, 'Length:', ADMIN_PASSWORD?.length || 0);
    
    if (!ADMIN_PASSWORD) {
      console.error('ADMIN_PASSWORD environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get hashed password from database or create from env
    let hash = await getHashedPassword();
    console.log('Hash retrieved, length:', hash?.length || 0);
    let isValid = await verifyPassword(password, hash);
    console.log('Password validation result:', isValid);

    // If password doesn't match but ADMIN_PASSWORD matches the provided password,
    // update the hash in the database (handles case where ADMIN_PASSWORD changed)
    if (!isValid && ADMIN_PASSWORD === password) {
      console.log('Password matches ADMIN_PASSWORD directly, updating hash in database...');
      const newHash = await hashPassword(ADMIN_PASSWORD);
      await supabaseAdmin.from('admin_settings').upsert({
        key: 'admin_password_hash',
        hashed_password: newHash,
        updated_at: new Date().toISOString(),
      });
      hashedPassword = newHash;
      hash = newHash;
      isValid = true;
    }

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
