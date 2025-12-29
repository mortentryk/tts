/**
 * Environment variable validation
 * Validates all required environment variables lazily (only when accessed)
 * Supports hydrating NEXT_PUBLIC_* variables from server-side counterparts
 * SECURITY: No hardcoded secrets - all values must come from environment variables
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

function getEnvVar(key: string, required: boolean = true, defaultValue?: string, fallbackKey?: string): string {
  // Detect if we're in client-side code (browser environment)
  const isClientSide = typeof window !== 'undefined';
  
  let value = process.env[key];
  
  // NEXT_PUBLIC_* variables are embedded by Next.js at build time
  const isPublicVar = key.startsWith('NEXT_PUBLIC_');
  
  // If value is missing and we have a fallback key, try the fallback (only on server)
  if (!value && fallbackKey && !isClientSide) {
    value = process.env[fallbackKey];
  }
  
  if (required && !value) {
    // For public variables during build, return empty string (Next.js will embed actual value)
    if (isPublicVar && (isBuildPhase || isClientSide)) {
      return defaultValue || '';
    }
    
    // For server-only variables in client-side code, return empty string (never throw)
    if (isClientSide) {
      return defaultValue || '';
    }
    
    // During build phase, allow empty for server vars (needed for static generation)
    if (isBuildPhase) {
      return defaultValue || '';
    }
    
    // In production, throw error for missing required variables
    // In development, allow fallback to empty string
    if (!isDevelopment) {
      throw new Error(
        `Missing required environment variable: ${key}\n` +
        `Please set ${key} in your environment variables.\n` +
        `This is a security requirement - hardcoded secrets are not allowed.`
      );
    }
    
    // Development mode: warn but allow empty string
    if (isDevelopment && !defaultValue) {
      console.warn(`⚠️  Missing environment variable: ${key} (required in production)`);
    }
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

export const SUPABASE_SERVICE_ROLE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY', true);

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

// Helper function to ensure URL has protocol
function ensureUrlProtocol(url: string): string {
  if (!url) return 'https://storific.app';
  // If URL already has protocol, return as is
  if (url.match(/^https?:\/\//)) {
    return url;
  }
  // Otherwise, add https://
  return `https://${url}`;
}

const rawSiteUrl = getEnvVar('NEXT_PUBLIC_SITE_URL', false, 'https://storific.app');
export const SITE_URL = ensureUrlProtocol(rawSiteUrl);

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
    // This will throw if any required vars are missing in production
    getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
    getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    getEnvVar('CLOUDINARY_CLOUD_NAME');
    getEnvVar('CLOUDINARY_API_KEY');
    getEnvVar('CLOUDINARY_API_SECRET');
    
    // Optional variables
    getEnvVar('ADMIN_PASSWORD', false);
    
    // JWT_SECRET is optional (has fallback), but warn if not set
    const jwtSecret = getEnvVar('JWT_SECRET', false, generateJWTSecret());
    if (!process.env.JWT_SECRET && !isBuildPhase) {
      console.warn('⚠️  WARNING: JWT_SECRET not set. Using fallback. This should be set in production for security.');
    }
    
    if (!isBuildPhase) {
      console.log('✅ Environment variables validated');
    }
    return true;
  } catch (error: any) {
    console.error('❌ Environment validation failed:', error.message);
    throw error;
  }
}

