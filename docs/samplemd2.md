# My Video CMS - Local Development Guide

## Prerequisites
- Node.js 18+ installed.
- npm available in terminal.
- Supabase project credentials.

## Environment Setup
Create or update .env.local with required values:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Install Dependencies
```bash
npm install
```

## Run the App
```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

## Recommended Developer Workflow
1. Create a feature branch.
2. Build UI changes in src/app or src/components.
3. Add or update route handlers under src/app/api if backend logic changes.
4. Test admin and viewer flows manually.
5. Run lint checks before committing.

## Useful Project Areas
- src/lib/supabase-client.ts: Browser-side Supabase client setup.
- src/lib/supabase-server.ts: Server-side Supabase helper.
- src/app/api/posts: Post API routes.
- src/app/api/upload-video: Video upload route.

## Troubleshooting
- If login fails, verify callback URL and provider settings in Supabase.
- If API routes return unauthorized, check service role usage and env values.
- If uploads fail, inspect request size and storage bucket permissions.
