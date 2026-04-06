import { S3Client } from '@aws-sdk/client-s3'

/**
 * Create and return an R2 S3 client
 * Uses environment variables:
 * - R2_ACCOUNT_ID: Your Cloudflare account ID
 * - R2_ACCESS_KEY_ID: Your R2 API token access key
 * - R2_SECRET_ACCESS_KEY: Your R2 API token secret key
 * - R2_BUCKET_NAME: Your R2 bucket name
 */
export function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing R2 credentials. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in your environment variables.'
    )
  }

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
  const bucketName = process.env.R2_BUCKET_NAME

  if (!bucketName) {
    throw new Error('Missing R2_BUCKET_NAME in environment variables.')
  }

  return bucketName
}

/**
 * Get the R2 public URL for a file
 * Uses R2_PUBLIC_URL environment variable if set, otherwise constructs from account ID
 */
export function getR2PublicUrl(key: string): string {
  const publicUrl = process.env.R2_PUBLIC_URL

  if (publicUrl) {
    // If public URL is provided (e.g., https://videos.example.com)
    return `${publicUrl}/${key}`
  }

  const accountId = process.env.R2_ACCOUNT_ID
  const bucketName = getR2BucketName()

  if (!accountId) {
    throw new Error('Missing R2_ACCOUNT_ID in environment variables.')
  }

  // Default R2 public URL format
  return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`
}
