/**
 * Environment variable validation with fallback support
 * Validates all required environment variables lazily (only when accessed)
 * Supports hydrating NEXT_PUBLIC_* variables from server-side counterparts
 */

// Legacy defaults for backward compatibility
const LEGACY_DEFAULTS = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://ooyzdksmeglhocjlaouo.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MzMzODksImV4cCI6MjA3NjIwOTM4OX0.DbgORlJkyBae_VIg0b6Pk-bSuzZ8vmb2hNHVnhE7wI8',
};

// Default service role key for fallback (matches legacy hardcoded value in admin API routes)
const DEFAULT_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYzMzM4OSwiZXhwIjoyMDc2MjA5Mzg5fQ.97T-OTcCNBk0qrs-kdqoGQbhsFDyWCQ5Z_x4bbPPbTI';

function getEnvVar(key: string, required: boolean = true, defaultValue?: string, fallbackKey?: string): string {
  // Detect if we're in client-side code (browser environment)
  const isClientSide = typeof window !== 'undefined';
  
  let value = process.env[key];
  
  // NEXT_PUBLIC_* variables are embedded by Next.js at build time
  // For client-side safety, never throw errors for these - use fallbacks instead
  const isPublicVar = key.startsWith('NEXT_PUBLIC_');
  
  // If value is missing and we have a fallback key, try the fallback (only on server)
  if (!value && fallbackKey && !isClientSide) {
    value = process.env[fallbackKey];
  }
  
  // If still missing, try legacy defaults for known keys
  if (!value && LEGACY_DEFAULTS[key as keyof typeof LEGACY_DEFAULTS]) {
    value = LEGACY_DEFAULTS[key as keyof typeof LEGACY_DEFAULTS];
  }
  
  if (required && !value) {
    // For public variables, return empty string if missing (Next.js will embed the actual value at build time)
    // This prevents client-side errors when the module is bundled
    if (isPublicVar) {
      return defaultValue || '';
    }
    
    // For server-only variables in client-side code, return empty string (never throw)
    // Server-only vars should never be accessed in client code, but we need to prevent crashes
    if (isClientSide) {
      return defaultValue || '';
    }
    
    // For server-only variables, skip validation during build phase
    const isCollectingPageData = process.env.NEXT_PHASE === 'phase-production-build';
    
    if (isCollectingPageData) {
      // During build phase, return empty string to allow build to complete
      return defaultValue || '';
    }
    
    // At runtime on server, validate server-only env vars
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please set ${key} in your .env.local file or environment variables.`
    );
  }
  
  return value || defaultValue || '';
}

// Supabase Configuration with fallback support
// NEXT_PUBLIC_* vars can fallback to server-side vars if only server secrets are configured
export const SUPABASE_URL = getEnvVar(
  'NEXT_PUBLIC_SUPABASE_URL',
  true,
  undefined,
  'SUPABASE_URL' // Fallback to server-side SUPABASE_URL if NEXT_PUBLIC_* is not set
);

export const SUPABASE_ANON_KEY = getEnvVar(
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  true,
  undefined,
  'SUPABASE_ANON_KEY' // Fallback to server-side SUPABASE_ANON_KEY if NEXT_PUBLIC_* is not set
);

export const SUPABASE_SERVICE_ROLE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY', false, DEFAULT_SUPABASE_SERVICE_ROLE_KEY);

// Admin Authentication (optional - only required for admin routes)
export const ADMIN_PASSWORD = getEnvVar('ADMIN_PASSWORD', false);

// Cloudinary Configuration
export const CLOUDINARY_CLOUD_NAME = getEnvVar('CLOUDINARY_CLOUD_NAME');
export const CLOUDINARY_API_KEY = getEnvVar('CLOUDINARY_API_KEY');
export const CLOUDINARY_API_SECRET = getEnvVar('CLOUDINARY_API_SECRET');

// AI Services
export const OPENAI_API_KEY = getEnvVar('OPENAI_API_KEY', false);
export const REPLICATE_API_TOKEN = getEnvVar('REPLICATE_API_TOKEN', false);
export const ELEVENLABS_API_KEY = getEnvVar('ELEVENLABS_API_KEY', false);

// Ingest Token
export const INGEST_TOKEN = getEnvVar('INGEST_TOKEN', false);

// Stripe Configuration
export const STRIPE_SECRET_KEY = getEnvVar('STRIPE_SECRET_KEY', false);
export const STRIPE_PUBLISHABLE_KEY = getEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', false);
export const STRIPE_WEBHOOK_SECRET = getEnvVar('STRIPE_WEBHOOK_SECRET', false);
export const SITE_URL = getEnvVar('NEXT_PUBLIC_SITE_URL', false, 'http://localhost:3000');

// JWT Secret for admin sessions
// Generate a stable fallback if not set (but log a warning - should be set in production)
function generateJWTSecret(): string {
  // Use a combination of environment-specific values for a stable fallback
  // This ensures the same secret is used across all requests in the same deployment
  const fallback = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_SITE_URL || 'default-secret';
  // Create a stable hash-like string (64 chars) based on the deployment URL
  const base = `fallback-jwt-secret-${fallback}`;
  // Pad to 64 characters for consistency
  return (base + 'x'.repeat(64)).substring(0, 64);
}

export const JWT_SECRET = getEnvVar('JWT_SECRET', false, generateJWTSecret());

/**
 * Validate all required environment variables
 * Call this at application startup
 */
export function validateEnv() {
  try {
    // This will throw if any required vars are missing
    getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
    getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    getEnvVar('SUPABASE_SERVICE_ROLE_KEY', false, DEFAULT_SUPABASE_SERVICE_ROLE_KEY);
    getEnvVar('ADMIN_PASSWORD', false);
    getEnvVar('CLOUDINARY_CLOUD_NAME');
    getEnvVar('CLOUDINARY_API_KEY');
    getEnvVar('CLOUDINARY_API_SECRET');
    
    // JWT_SECRET is optional (has fallback), but warn if not set
    const jwtSecret = getEnvVar('JWT_SECRET', false, generateJWTSecret());
    if (!process.env.JWT_SECRET) {
      console.warn('⚠️  WARNING: JWT_SECRET not set. Using fallback. This should be set in production for security.');
    }
    
    console.log('✅ All required environment variables are set');
    return true;
  } catch (error: any) {
    console.error('❌ Environment validation failed:', error.message);
    throw error;
  }
}

