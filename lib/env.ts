/**
 * Environment variable validation
 * Validates all required environment variables on startup
 */

function getEnvVar(key: string, required: boolean = true): string {
  const value = process.env[key];
  
  if (required && !value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please set ${key} in your .env.local file or environment variables.`
    );
  }
  
  return value || '';
}

// Supabase Configuration
export const SUPABASE_URL = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
export const SUPABASE_ANON_KEY = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
export const SUPABASE_SERVICE_ROLE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

// Admin Authentication
export const ADMIN_PASSWORD = getEnvVar('ADMIN_PASSWORD');

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
export const SITE_URL = getEnvVar('NEXT_PUBLIC_SITE_URL', false) || 'http://localhost:3000';

// JWT Secret for admin sessions
export const JWT_SECRET = getEnvVar('JWT_SECRET');

/**
 * Validate all required environment variables
 * Call this at application startup
 */
export function validateEnv() {
  try {
    // This will throw if any required vars are missing
    getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
    getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    getEnvVar('ADMIN_PASSWORD');
    getEnvVar('CLOUDINARY_CLOUD_NAME');
    getEnvVar('CLOUDINARY_API_KEY');
    getEnvVar('CLOUDINARY_API_SECRET');
    getEnvVar('JWT_SECRET');
    
    console.log('✅ All required environment variables are set');
    return true;
  } catch (error: any) {
    console.error('❌ Environment validation failed:', error.message);
    throw error;
  }
}

