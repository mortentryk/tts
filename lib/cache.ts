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

const CACHE_KEY_SET = 'cache:keys';

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
    await redis.sadd(CACHE_KEY_SET, cacheKey);
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
    await redis.srem(CACHE_KEY_SET, cacheKey);
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
    if (!pattern.includes('*')) {
      const deleted = await redis.del(pattern);
      if (deleted) {
        await redis.srem(CACHE_KEY_SET, pattern);
      }
      return deleted;
    }

    const keys = await redis.smembers(CACHE_KEY_SET);
    const matcher = new RegExp(
      `^${pattern.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`
    );
    const matched = keys.filter((key) => matcher.test(key));

    if (matched.length === 0) {
      return 0;
    }

    const deleted = await redis.del(...matched);
    if (deleted) {
      await redis.srem(CACHE_KEY_SET, ...matched);
    }
    return deleted;
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

