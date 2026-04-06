# Upload Video + Rich Markdown Editor Feature

## Summary

This feature enables users to create video posts by:
- entering a title
- editing rich markdown content with snippet helpers
- dropping a video directly into editor to upload to YouTube and insert link
- optionally uploading a video file via the Video block
- optionally providing a YouTube URL

## UI Updates

Component: `src/app/posts/UploadDialog.tsx`

- Title input at top
- Markdown editor textarea with toolbar:
  - Bold
  - Italic
  - Heading
  - Link
  - YouTube link
- Video upload area:
  - drag/drop file
  - file picker
  - dropped file triggers direct upload to `/api/upload-video`
  - on upload complete, inserts `https://www.youtube.com/watch?v=<id>` into markdown
- YouTube URL input
- Submit (uploads page post data via `/api/upload`)

## Backend Changes

- New endpoint: `src/app/api/upload-video/route.ts`
  - Accepts `video` file and uploads to YouTube
  - Returns `{ success: true, videoId }`

- Updated endpoint: `src/app/api/upload/route.ts`
  - Supports `video` file, `videoUrl`, and markdown embedded YouTube fallback

- Post detail: `src/app/posts/[id]/page.tsx`
  - Renders `post.youtube_video_id` as iframe
  - Embeds YouTube links in markdown content via custom ReactMarkdown link renderer

## Data Flow

1. User opens UploadDialog
2. Enters title + markdown
3. Drop video into markdown editor
4. `/api/upload-video` receives video file -> uploads to YouTube
5. `UploadDialog` inserts resulting URL into markdown text
6. User submits form
7. `/api/upload` saves markdown in Supabase storage and DB post record with `youtube_video_id`
8. Post detail page renders video and markdown content

## Notes

- this feature assumes env vars are configured for YouTube OAuth:
  - `YT_CLIENT_ID`
  - `YT_CLIENT_SECRET`
  - `YT_REFRESH_TOKEN`

- If you get "invalid_grant" error, the refresh token has expired. Run `node get-token.js` to get a new refresh token and update your .env file.

- on success, message shown: "Video uploaded and inserted into content. You can now submit."
