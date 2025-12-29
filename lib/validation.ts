import { z } from 'zod';
import type { NextResponse } from 'next/server';

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

export const trackClickSchema = z.object({
  storySlug: z.string().min(1, 'Story slug is required'),
});

// Admin route schemas
export const uploadCsvSchema = z.object({
  storySlug: storySlugSchema,
  publishStory: z.boolean().optional(),
});

export const generateImageSchema = z.object({
  storySlug: storySlugSchema,
  nodeId: z.string().min(1, 'Node ID is required'),
  storyText: z.string().min(1, 'Story text is required'),
  storyTitle: z.string().optional(),
  model: z.string().optional(),
  style: z.string().optional(),
  size: z.string().optional(),
  quality: z.string().optional(),
  referenceImageNodeKey: z.string().optional(),
  referenceImageUrl: z.string().url().optional().or(z.literal('')),
  useCustomPrompt: z.boolean().optional(),
});

export const generateAudioSchema = z.object({
  storySlug: storySlugSchema,
  nodeId: z.string().min(1, 'Node ID is required'),
});

export const generateVideoSchema = z.object({
  storySlug: storySlugSchema,
  nodeId: z.string().min(1, 'Node ID is required'),
  imageUrl: z.string().url().optional(),
});

export const verifyPurchaseSchema = z.object({
  sessionId: z.string().min(1).optional(),
  paymentIntentId: z.string().min(1).optional(),
}).refine((data) => data.sessionId || data.paymentIntentId, {
  message: 'Either sessionId or paymentIntentId is required',
  path: ['sessionId'], // This helps with error reporting
}).passthrough(); // Allow additional properties

export const oneClickCheckoutSchema = z.object({
  storyId: storyIdSchema,
  userEmail: emailSchema,
});

export const ttsSchema = z.object({
  text: z.string().min(1, 'Text is required').max(10000, 'Text too long'),
  voiceId: z.string().optional(),
  nodeKey: z.string().optional(),
  storyId: z.string().uuid().optional(),
});

export const characterSchema = z.object({
  storySlug: storySlugSchema,
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  referenceImageUrl: z.string().url().optional().or(z.literal('')),
  appearancePrompt: z.string().optional(),
});

export const characterAssignmentSchema = z.object({
  storySlug: storySlugSchema,
  nodeKey: z.string().min(1, 'Node key is required'),
  assignments: z.array(z.object({
    characterId: z.string().uuid(),
    role: z.string().optional(),
    emotion: z.string().optional(),
    action: z.string().optional(),
  })).min(1, 'At least one assignment is required'),
});

export const journeySchema = z.object({
  storySlug: storySlugSchema,
  nodeKey: z.string().min(1, 'Node key is required'),
  journeyTitle: z.string().min(1, 'Journey title is required'),
  journeyText: z.string().min(1, 'Journey text is required'),
  sequenceNumber: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
});

export const journeyUpdateSchema = z.object({
  journeyId: z.string().uuid(),
  journeyTitle: z.string().optional(),
  journeyText: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  videoUrl: z.string().url().optional().or(z.literal('')),
  sequenceNumber: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export const imageGallerySchema = z.object({
  storySlug: storySlugSchema,
  nodeKey: z.string().optional(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  publicId: z.string().optional(),
  characters: z.array(z.string()).optional(),
  cost: z.number().nonnegative().optional(),
  model: z.string().optional(),
  prompt: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  fileSize: z.number().int().positive().optional(),
});

export const imageAssignSchema = z.object({
  storySlug: storySlugSchema,
  nodeKey: z.string().min(1, 'Node key is required'),
  imageId: z.string().uuid(),
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

/**
 * Helper to return validation error response
 */
export function validationErrorResponse(error: z.ZodError): NextResponse {
  const errorMessage = error.errors
    .map((e) => `${e.path.join('.')}: ${e.message}`)
    .join(', ');
  return NextResponse.json(
    { error: `Validation failed: ${errorMessage}` },
    { status: 400 }
  );
}

