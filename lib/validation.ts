import { z } from 'zod';

/**
 * Common validation schemas for API routes
 */

export const emailSchema = z.string().email('Invalid email address');

export const storySlugSchema = z.string().min(1, 'Story slug is required').max(255);

export const storyIdSchema = z.string().uuid('Invalid story ID');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password is too long');

export const adminLoginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export const createCheckoutSessionSchema = z.object({
  type: z.enum(['one-time', 'subscription', 'lifetime']),
  userEmail: emailSchema,
  storyId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
});

export const verifyPurchaseSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

export const trackClickSchema = z.object({
  storySlug: z.string().min(1, 'Story slug is required'),
});

/**
 * Validate request body against schema
 */
export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Validate request body and return errors if invalid
 */
export function safeValidateBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
