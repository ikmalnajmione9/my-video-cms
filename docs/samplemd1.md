# My Video CMS - Project Overview

## Purpose
My Video CMS is a Next.js application for creating, organizing, and viewing post-based content with video support. It includes admin-facing management pages and viewer-facing browsing pages.

## Core Features
- Post management with list and detail pages.
- Video upload endpoints for media workflows.
- Group-based organization endpoints.
- Auth callback flow for Google login.
- Separate admin and viewer contexts.

## High-Level Architecture
### Frontend
- App Router pages live under src/app.
- Shared UI components live under src/components.
- State/context providers are under src/contexts.

### Backend
- Route handlers under src/app/api provide CRUD and workflow endpoints.
- Supabase client/server helpers are under src/lib.

### Data and Auth
- Supabase is used for database and authentication integration.
- Auth callback routes complete OAuth login flows.

## Suggested Folder Map
- src/app/admin: Admin pages and management UI.
- src/app/posts: Post listing and post detail experience.
- src/app/viewer: Viewer-focused layout and page routes.
- src/app/api: Server route handlers.
- videos: Team/project videos.

## Future Improvements
- Add role-based permission checks on all admin APIs.
- Add upload progress and retry behavior for large files.
- Add end-to-end tests for auth and post publishing.
