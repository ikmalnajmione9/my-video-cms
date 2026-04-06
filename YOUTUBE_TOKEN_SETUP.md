# ⚠️ Deprecated: YouTube Integration

**This documentation is deprecated.** The video CMS has been migrated from YouTube to Cloudflare R2 storage.

## What Changed

- **Old System:** Videos were uploaded to YouTube via OAuth2 and refresh tokens
- **New System:** Videos are now stored directly in Cloudflare R2 buckets
- **Benefits:** Better privacy, lower costs, faster delivery, no YouTube branding

## For Existing Users

If you have old YouTube videos embedded in posts:

1. They will no longer display on the website
2. You'll need to re-upload videos through the new R2 storage system
3. See [R2_SETUP.md](R2_SETUP.md) for configuration instructions

## Migration Steps

1. Ensure R2 credentials are configured in `.env.local`
2. Upload new videos through the web interface
3. Videos will be stored in R2 and displayed using the new video player

For questions or issues with the R2 setup, see [R2_SETUP.md](R2_SETUP.md).