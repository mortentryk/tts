/**
 * Redis client initialization using Upstash
 * Uses environment variables from Vercel/Upstash integration
 */

import { Redis } from '@upstash/redis';

let redisClient: Redis | null = null;

/**
 * Get or create Redis client instance
 * Uses Redis.fromEnv() which automatically reads:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 * Or fallback to KV_* variables from Upstash KV
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    try {
      // Try to use standard Upstash Redis env vars first
      if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        redisClient = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
      } else if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        // Fallback to KV variables (Upstash KV uses same API)
        redisClient = new Redis({
          url: process.env.KV_REST_API_URL,
          token: process.env.KV_REST_API_TOKEN,
        });
      } else {
        // Try fromEnv as last resort
        redisClient = Redis.fromEnv();
      }
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      throw new Error('Redis client initialization failed. Please check environment variables.');
    }
  }
  return redisClient;
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    console.warn('Redis is not available:', error);
    return false;
  }
}

