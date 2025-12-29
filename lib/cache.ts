/**
 * Redis caching utilities for API responses and query results
 */

import { getRedisClient } from './redis';

/**
 * Cache options
 */
interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
}

/**
 * Generate cache key with optional prefix
 */
function getCacheKey(key: string, prefix?: string): string {
  return prefix ? `${prefix}:${key}` : key;
}

/**
 * Get cached value
 */
export async function getCache<T>(key: string, prefix?: string): Promise<T | null> {
  try {
    const redis = getRedisClient();
    const cacheKey = getCacheKey(key, prefix);
    const value = await redis.get<T>(cacheKey);
    return value;
  } catch (error) {
    console.error('Cache get error:', error);
    return null; // Fail gracefully - return null on error
  }
}

/**
 * Set cached value
 */
export async function setCache<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const cacheKey = getCacheKey(key, options.prefix);
    
    if (options.ttl) {
      await redis.setex(cacheKey, options.ttl, value);
    } else {
      await redis.set(cacheKey, value);
    }
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
    return false; // Fail gracefully
  }
}

/**
 * Delete cached value
 */
export async function deleteCache(key: string, prefix?: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const cacheKey = getCacheKey(key, prefix);
    await redis.del(cacheKey);
    return true;
  } catch (error) {
    console.error('Cache delete error:', error);
    return false;
  }
}

/**
 * Delete multiple cached values by pattern
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  try {
    const redis = getRedisClient();
    // Note: Upstash Redis REST API doesn't support KEYS command
    // We'll need to track keys manually or use a different approach
    // For now, return 0 and log a warning
    console.warn('Pattern-based cache deletion not supported with Upstash REST API');
    return 0;
  } catch (error) {
    console.error('Cache pattern delete error:', error);
    return 0;
  }
}

/**
 * Invalidate cache for a story (used when story is updated)
 */
export async function invalidateStoryCache(storyId: string): Promise<void> {
  try {
    await Promise.all([
      deleteCache(`story:${storyId}`, 'api'),
      deleteCache(`stories:list`, 'api'),
      deleteCache(`story:${storyId}:nodes`, 'api'),
    ]);
  } catch (error) {
    console.error('Story cache invalidation error:', error);
  }
}

/**
 * Cache wrapper for async functions
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try to get from cache first
  const cached = await getCache<T>(key, options.prefix);
  if (cached !== null) {
    return cached;
  }

  // Execute function and cache result
  const result = await fn();
  await setCache(key, result, options);
  return result;
}

