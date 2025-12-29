/**
 * Redis-based rate limiting for serverless environments
 * Works across all Vercel serverless instances using Upstash Redis
 */

import { NextRequest } from 'next/server';
import { getRedisClient } from './redis';

/**
 * Rate limiter using Redis
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param limit - Maximum number of requests
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit result
 */
export async function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  try {
    const redis = getRedisClient();
    const now = Date.now();
    const windowSeconds = Math.ceil(windowMs / 1000);
    const key = `ratelimit:${identifier}`;
    const resetAt = now + windowMs;

    // Use Redis INCR with expiration for atomic rate limiting
    // This pattern ensures thread-safe rate limiting across all instances
    const current = await redis.incr(key);
    
    // Set expiration on first request (when count is 1)
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    const remaining = Math.max(0, limit - current);
    const allowed = current <= limit;

    return {
      allowed,
      remaining,
      resetAt,
    };
  } catch (error) {
    // If Redis fails, allow the request (fail open)
    // This prevents Redis outages from breaking the entire app
    console.error('Rate limit Redis error:', error);
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: Date.now() + windowMs,
    };
  }
}

/**
 * Get client IP from request
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIP || 'unknown';
  return ip;
}

/**
 * Rate limit middleware for API routes
 */
export async function withRateLimit(
  request: NextRequest,
  limit: number,
  windowMs: number,
  handler: () => Promise<Response>
): Promise<Response> {
  const ip = getClientIP(request);
  const result = await rateLimit(ip, limit, windowMs);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        resetAt: new Date(result.resetAt).toISOString(),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetAt.toString(),
          'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // Add rate limit headers to response
  try {
    const response = await handler();
    
    // Try to clone response to ensure headers are mutable
    // If cloning fails (e.g., body already consumed), use original response
    let newResponse: Response;
    try {
      newResponse = response.clone();
    } catch (cloneError) {
      console.warn('Failed to clone response, using original:', cloneError);
      newResponse = response;
    }
    
    // Add rate limit headers
    newResponse.headers.set('X-RateLimit-Limit', limit.toString());
    newResponse.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    newResponse.headers.set('X-RateLimit-Reset', result.resetAt.toString());

    return newResponse;
  } catch (error: any) {
    console.error('Error in rate-limited handler:', error);
    console.error('Error stack:', error?.stack);
    // Return error response with rate limit headers
    const errorResponse = new Response(
      JSON.stringify({
        error: error?.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetAt.toString(),
        },
      }
    );
    return errorResponse;
  }
}

