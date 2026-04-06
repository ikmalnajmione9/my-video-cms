# Cloudflare R2 Setup Guide

This guide explains how to set up and configure Cloudflare R2 storage for the Video CMS system.

## Prerequisites

- Cloudflare account with R2 enabled
- Node.js and npm installed
- Access to your Cloudflare dashboard

## Step 1: Create an R2 Bucket

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 Storage** in the sidebar
3. Click **Create bucket**
4. Enter a bucket name (e.g., `video-cms-bucket`)
5. Choose your preferred region
6. Click **Create bucket**

## Step 2: Configure Public Access for the Bucket

**This step is REQUIRED for videos to be playable in the browser.**

### Option A: Using a Custom Domain (Recommended)

1. Go to your Cloudflare Dashboard → **R2 > Buckets**
2. Click on your bucket name
3. Go to the **Settings** tab
4. Find **Domain Name** section
5. Click **Connect Domain** or **Create and Connect Custom Domain**
6. Choose one of:
   - **Cloudflare subdomain** (e.g., `videos.your-domain.com`) - Free and automatic
   - **Custom domain** - Requires you to own the domain
7. Once connected, copy the domain URL (e.g., `https://videos.your-domain.com`)
8. Add it to your `.env.local`:
   ```bash
   NEXT_PUBLIC_R2_PUBLIC_URL=https://videos.your-domain.com
   ```
9. Update the VideoPlayer to use the custom URL (optional - the app will construct URLs automatically)

### Option B: Make Bucket Publicly Readable (Simpler)

1. Go to **R2 > Buckets > Your Bucket > Settings**
2. Scroll to **Bucket visibility**
3. Click **Make Bucket Public**
4. Confirm the warning
5. No additional environment variable needed - public R2 URLs will work automatically

## Step 2b: Create R2 API Token

1. In your Cloudflare Dashboard, go to **R2 > Settings**
2. Scroll down to **API tokens** section
3. Click **Create API token**
4. Configure the token:
   - **Token name**: Give it a descriptive name (e.g., `video-cms-api-token`)
   - **Permission**: Select **Admin** (allows both read and write operations)
   - **TTL**: Set an appropriate expiration (or leave as "Never expire")
5. Click **Create API Token**
6. Copy and save the credentials:
   - Access Key ID
   - Secret Access Key

## Step 3: Get Your Account ID

1. In your Cloudflare Dashboard, go to **R2 > Overview**
2. Find your **Account ID** (displayed in the right sidebar)
3. Copy it down - you'll need it for configuration

## Step 4: Set Environment Variables

Create or update your `.env.local` file with the following variables:

```bash
# Cloudflare R2 Configuration (Server-side - private)
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=your_bucket_name_here

# Optional: Custom Public URL for R2 bucket
# If you have a custom domain or public URL for your R2 bucket, set it here:
# R2_PUBLIC_URL=https://your-custom-domain.com
# If not set, videos will be accessible via the default R2 URL format:
# https://bucket-name.account-id.r2.cloudflarestorage.com

# Cloudflare R2 Configuration (Client-side - public, for video playback)
NEXT_PUBLIC_R2_ACCOUNT_ID=your_account_id_here
NEXT_PUBLIC_R2_BUCKET_NAME=your_bucket_name_here
```

### Example `.env.local`:

```bash
# Server-side (private) credentials
R2_ACCOUNT_ID=12345678abcdefg
R2_ACCESS_KEY_ID=abc123def456ghi789
R2_SECRET_ACCESS_KEY=xyz789_secret_key_here
R2_BUCKET_NAME=video-cms-bucket

# Client-side (public) for video playback
NEXT_PUBLIC_R2_ACCOUNT_ID=12345678abcdefg
NEXT_PUBLIC_R2_BUCKET_NAME=video-cms-bucket
```

## Step 5: Install Dependencies

Run npm install to get the AWS SDK for S3 (used for R2 compatibility):

```bash
npm install
```

## Step 6: Test the Configuration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Try uploading a test video through the admin panel
3. Check your R2 bucket in the Cloudflare Dashboard to verify the video was uploaded:
   - Go to **R2 > Buckets > Your Bucket**
   - You should see files in a `videos/` folder with timestamps

## Troubleshooting

### Missing Credentials Error

If you get an error about missing R2 credentials:
- Make sure all R2 environment variables are set in `.env.local`
- Restart your dev server after updating `.env.local`
- Check that variable names match exactly (case-sensitive)

### Videos Not Uploading

1. Verify your API token has Admin permissions in Cloudflare Dashboard
2. Check that the bucket name matches exactly (case-sensitive)
3. Ensure your account ID is correct
4. Check browser console and server logs for detailed error messages

### Videos Upload but Won't Play

**This is the most common issue** - videos are stored in R2 but the browser can't access them.

**Solution:**
1. Go to **Cloudflare Dashboard → R2 > Buckets > Your Bucket**
2. Click **Settings**
3. Find **Bucket visibility** and click **Make Bucket Public**
4. Confirm the warning dialog
5. Wait 30 seconds for changes to propagate
6. Reload the page in your browser - videos should now play!

**Why this happens:**
- R2 buckets are private by default
- Private buckets can only be accessed with API credentials
- The browser doesn't have credentials, so it can't load videos
- Making the bucket public allows any browser to access video files

### Custom Domain Not Working

If you set a custom URL but videos still won't play:
1. Verify the domain is correctly configured in Cloudflare Dashboard
2. Check that the domain actually points to your R2 bucket
3. Test the URL directly in a browser (paste the full video URL and attempt to download it)
4. Clear your browser cache and restart the dev server
5. Make sure the bucket is also set to public access (Option A doesn't make it public by default)

### Public URL Not Working

If you set a custom `R2_PUBLIC_URL`:
- Make sure it's the correct domain for your R2 bucket
- Verify the domain is configured in Cloudflare Dashboard
- Test the URL directly in a browser to ensure it's accessible

## Security Considerations

- **Never commit `.env.local` to version control** - use `.gitignore`
- Rotate your API tokens periodically
- Use separate API tokens for different environments (dev, staging, production)
- Consider using Cloudflare's IP allowlist feature for additional security
- For production, consider restricting video URLs with Cloudflare authentication

## Video Deletion

When you delete a post from the admin panel:
- The associated video is automatically deleted from R2
- This is handled server-side in the API route
- Failed deletions don't prevent post deletion (logged as warnings)

## Switching Back from YouTube

If you were previously using YouTube:
- Existing YouTube videos won't be affected
- New uploads will go to R2
- The system now expects video IDs in the format `videos/timestamp-filename.mp4`
- Old YouTube embedded videos will no longer work with the new VideoPlayer component

## Reference

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS S3 Compatible API](https://developers.cloudflare.com/r2/api/s3/compatible-api/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/latest/)
