import { S3Client } from '@aws-sdk/client-s3'

function getRequiredEnvVar(name: string): string {
  const raw = process.env[name]
  if (!raw) {
    throw new Error(`Missing ${name} in environment variables.`)
  }

  // Normalize common copy/paste mistakes from env providers (quotes/newlines).
  const normalized = raw.replace(/[\r\n]+/g, '').trim().replace(/^"|"$/g, '')

  if (!normalized) {
    throw new Error(`Invalid ${name}: empty after normalization.`)
  }

  // HTTP headers must not contain control characters.
  if (/[^\x20-\x7E]/.test(normalized)) {
    throw new Error(`Invalid ${name}: contains non-printable characters.`)
  }

  return normalized
}

/**
 * Create and return an R2 S3 client
 * Uses environment variables:
 * - R2_ACCOUNT_ID: Your Cloudflare account ID
 * - R2_ACCESS_KEY_ID: Your R2 API token access key
 * - R2_SECRET_ACCESS_KEY: Your R2 API token secret key
 * - R2_BUCKET_NAME: Your R2 bucket name
 */
export function getR2Client(): S3Client {
  const accountId = getRequiredEnvVar('R2_ACCOUNT_ID')
  const accessKeyId = getRequiredEnvVar('R2_ACCESS_KEY_ID')
  const secretAccessKey = getRequiredEnvVar('R2_SECRET_ACCESS_KEY')

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

/**
 * Get the R2 bucket name from environment
 */
export function getR2BucketName(): string {
  return getRequiredEnvVar('R2_BUCKET_NAME')
}

/**
 * Get the R2 public URL for a file
 * Uses R2_PUBLIC_URL environment variable if set, otherwise constructs from account ID
 */
export function getR2PublicUrl(key: string): string {
  const rawPublicUrl = process.env.R2_PUBLIC_URL
  const publicUrl = rawPublicUrl
    ? rawPublicUrl.replace(/[\r\n]+/g, '').trim().replace(/^"|"$/g, '')
    : ''

  if (publicUrl) {
    // If public URL is provided (e.g., https://videos.example.com)
    return `${publicUrl}/${key}`
  }

  const accountId = getRequiredEnvVar('R2_ACCOUNT_ID')
  const bucketName = getR2BucketName()

  // Default R2 public URL format
  return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`
}
