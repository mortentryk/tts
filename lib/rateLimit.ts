/**
 * Simple in-memory rate limiting
 * For production, consider using Redis or Upstash
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Simple rate limiter
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param limit - Maximum number of requests
 * @param windowMs - Time window in milliseconds
 * @returns true if allowed, false if rate limited
 */
export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier;

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to clean up
    Object.keys(store).forEach((k) => {
      if (store[k].resetTime < now) {
        delete store[k];
      }
    });
  }

  const record = store[key];

  if (!record || record.resetTime < now) {
    // New window or expired
    store[key] = {
      count: 1,
      resetTime: now + windowMs,
    };
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + windowMs,
    };
  }

  if (record.count >= limit) {
    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetTime,
    };
  }

  // Increment count
  record.count++;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetAt: record.resetTime,
  };
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

import { NextRequest } from 'next/server';

/**
 * Rate limit middleware for API routes
 */
export function withRateLimit(
  request: NextRequest,
  limit: number,
  windowMs: number,
  handler: () => Promise<Response>
): Promise<Response> {
  const ip = getClientIP(request);
  const result = rateLimit(ip, limit, windowMs);

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
  const response = await handler();
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.resetAt.toString());

  return response;
}

