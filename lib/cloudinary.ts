import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface CloudinaryImageOptions {
  width?: number;
  height?: number;
  quality?: string | number;
  format?: string;
  crop?: string;
  gravity?: string;
}

/**
 * Upload an image to Cloudinary
 */
export async function uploadImageToCloudinary(
  imageBuffer: Buffer,
  folder: string,
  publicId: string,
  options: CloudinaryImageOptions = {}
): Promise<CloudinaryUploadResult> {
  try {
    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        ...options,
      }
    );

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    throw new Error(`Failed to upload image to Cloudinary: ${errorMessage}`);
  }
}

/**
 * Upload a video to Cloudinary
 */
export async function uploadVideoToCloudinary(
  videoBuffer: Buffer,
  folder: string,
  publicId: string,
  options: any = {}
): Promise<CloudinaryUploadResult> {
  try {
    const result = await cloudinary.uploader.upload(
      `data:video/mp4;base64,${videoBuffer.toString('base64')}`,
      {
        folder,
        public_id: publicId,
        resource_type: 'video',
        ...options,
      }
    );

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error('❌ Cloudinary video upload error:', error);
    throw new Error(`Failed to upload video to Cloudinary: ${error}`);
  }
}

/**
 * Generate a Cloudinary URL for an image with transformations
 */
export function getCloudinaryUrl(
  publicId: string,
  options: CloudinaryImageOptions = {}
): string {
  const {
    width = 'auto',
    height = 'auto',
    quality = 'auto',
    format = 'auto',
    crop = 'scale',
    gravity = 'auto',
  } = options;

  return cloudinary.url(publicId, {
    width,
    height,
    quality,
    format,
    crop,
    gravity,
  });
}

/**
 * Delete an asset from Cloudinary
 */
export async function deleteCloudinaryAsset(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    return false;
  }
}

/**
 * List assets in a folder
 */
export async function listCloudinaryAssets(folder: string): Promise<any[]> {
  try {
    const result = await cloudinary.search
      .expression(`folder:${folder}`)
      .max_results(500)
      .execute();
    
    return result.resources || [];
  } catch (error) {
    console.error('❌ Cloudinary list error:', error);
    return [];
  }
}

/**
 * Generate a unique public ID for story assets
 */
export function generateStoryAssetId(storySlug: string, nodeId: string, type: 'image' | 'video', index?: number): string {
  const suffix = index !== undefined ? `-${index}` : '';
  return `tts-books/${storySlug}/${type}-${nodeId}${suffix}`;
}

/**
 * Check if a reference is a Cloudinary asset reference (image-X, video-X)
 */
export function isAssetReference(value: string): boolean {
  return /^(image|video)-\d+$/.test(value.trim());
}

/**
 * Parse asset reference to get type and index
 */
export function parseAssetReference(value: string): { type: 'image' | 'video'; index: number } | null {
  const match = value.trim().match(/^(image|video)-(\d+)$/);
  if (!match) return null;
  
  return {
    type: match[1] as 'image' | 'video',
    index: parseInt(match[2], 10),
  };
}
