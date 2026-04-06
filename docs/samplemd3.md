# My Video CMS - Sample API Videos

## Overview
This video provides sample request and response formats for selected endpoints in the project.

## Base URL
For local development:

```text
http://localhost:3000
```

## 1) List Posts
### Endpoint
```http
GET /api/posts
```

### Sample Response
```json
[
	{
		"id": "post_123",
		"title": "Welcome Video",
		"createdAt": "2026-03-20T10:00:00.000Z"
	}
]
```

## 2) Get Post by ID
### Endpoint
```http
GET /api/posts/{id}
```

### Sample Response
```json
{
	"id": "post_123",
	"title": "Welcome Video",
	"content": "Post body or rich content",
	"videoUrl": "https://cdn.example.com/video.mp4"
}
```

## 3) Upload Video
### Endpoint
```http
POST /api/upload-video
Content-Type: multipart/form-data
```

### Sample Response
```json
{
	"success": true,
	"videoUrl": "https://cdn.example.com/uploads/new-video.mp4"
}
```

## Error Format (Suggested)
```json
{
	"error": "Human-readable message",
	"code": "OPTIONAL_MACHINE_CODE"
}
```

## Notes
- Keep response shapes stable to avoid frontend regressions.
- Validate required fields on all write endpoints.
- Return clear status codes for auth and validation failures.
