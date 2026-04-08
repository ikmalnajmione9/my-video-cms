import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getR2Client, getR2BucketName, getR2PublicUrl } from './r2-client'
import { Readable } from 'stream'

/**
 * Upload a video file to R2 storage
 * Returns the R2 object key (path) used to store the file
 */
export async function uploadVideoToR2(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = 'video/mp4'
): Promise<{ success: boolean; key?: string; url?: string; error?: string }> {
  try {
    const client = getR2Client()
    const bucketName = getR2BucketName()

    // Generate a unique key using timestamp and filename
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-')
    const key = `videos/${timestamp}-${sanitizedFileName}`

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    })

    await client.send(command)

    const url = getR2PublicUrl(key)

    console.log(`Successfully uploaded video to R2: ${key}`)
    return { success: true, key, url }
  } catch (error: any) {
    console.error('Failed to upload video to R2:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Delete a video from R2 storage by its key
 */
export async function deleteVideoFromR2(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!key) {
      return { success: false, error: 'No video key provided' }
    }

    const client = getR2Client()
    const bucketName = getR2BucketName()

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    await client.send(command)

    console.log(`Successfully deleted video from R2: ${key}`)
    return { success: true }
  } catch (error: any) {
    console.error(`Failed to delete video from R2 (${key}):`, error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Extract R2 video key from a URL
 */
export function extractR2VideoKey(url: string): string | null {
  if (!url) return null

  try {
    const urlObj = new URL(url)
    // Remove leading slash if present
    const key = urlObj.pathname.replace(/^\//, '')
    return key
  } catch {
    // If it's not a valid URL, it might already be a key
    return url.startsWith('videos/') ? url : null
  }
}

/**
 * Get the public URL for an R2 video key
 */
export function getR2VideoUrl(key: string): string {
  return getR2PublicUrl(key)
}

/**
 * Extract R2 video key from markdown content
 * Looks for R2 URLs or video keys in the markdown
 */
export function extractR2VideoKeyFromMarkdown(markdown: string): string | null {
  if (!markdown) return null

  // First, look for VIDEO_ID marker comment (e.g., <!-- VIDEO_ID:videos/1234567890-filename.mp4 -->)
  const markerPattern = /<!--\s*VIDEO_ID:([\s\S]*?)\s*-->/i
  const markerMatch = markdown.match(markerPattern)
  if (markerMatch && markerMatch[1]) {
    const videoId = markerMatch[1].trim()
    if (videoId.startsWith('videos/')) {
      return videoId
    }
  }

  // Look for R2 URLs in markdown
  // Pattern: https://bucket.accountid.r2.cloudflarestorage.com/videos/... or custom URLs
  const urlPattern = /(https?:\/\/[^\s)]+\/)(videos\/[^\s)]+)/i
  const urlMatch = markdown.match(urlPattern)
  if (urlMatch && urlMatch[2]) {
    return urlMatch[2]
  }

  // Look for direct video keys (e.g., videos/1234567890-filename.mp4)
  const keyPattern = /(videos\/[a-zA-Z0-9_.\-]+)/i
  const keyMatch = markdown.match(keyPattern)
  if (keyMatch && keyMatch[1]) {
    return keyMatch[1]
  }

  return null
}

/**
 * Extract the timestamp encoded in an uploaded R2 video key.
 * Keys are generated as videos/<timestamp>-<filename>.
 */
export function extractR2UploadTimestampFromKey(key: string): number | null {
  if (!key) return null

  const match = key.match(/^videos\/(\d{10,13})-/i)
  if (!match?.[1]) return null

  const rawTimestamp = Number(match[1])
  if (!Number.isFinite(rawTimestamp)) return null

  return match[1].length === 10 ? rawTimestamp * 1000 : rawTimestamp
}

/**
 * Infer a post date from markdown or marker content that references an uploaded R2 video.
 */
export function inferPostDateFromMarkdown(markdown: string): string | null {
  if (!markdown) return null

  const markerDateMatch = markdown.match(/<!--\s*POST_DATE:([\s\S]*?)\s*-->/i)
  const markerDate = markerDateMatch?.[1]?.trim()
  if (markerDate) {
    const parsed = new Date(markerDate)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  }

  const videoKey = extractR2VideoKeyFromMarkdown(markdown)
  if (!videoKey) return null

  const timestamp = extractR2UploadTimestampFromKey(videoKey)
  if (!timestamp) return null

  return new Date(timestamp).toISOString()
}
