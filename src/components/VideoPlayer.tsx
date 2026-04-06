'use client'

import { useState } from 'react'

export default function VideoPlayer({ videoUrl }: { videoUrl: string }) {
  const [error, setError] = useState<string | null>(null)

  const handleError = () => {
    setError('Failed to load video. Please check that the video file exists in R2 storage.')
    console.error('Video loading failed. URL:', videoUrl)
  }

  if (!videoUrl) {
    return (
      <div className="relative glass-card rounded-xl overflow-hidden border border-red-500/20 bg-red-950/10">
        <div className="w-full aspect-video bg-red-950/20 flex items-center justify-center">
          <div className="text-red-400 text-sm font-medium">❌ Invalid video URL</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative glass-card rounded-xl overflow-hidden border border-white/10">
      <div className="w-full aspect-video bg-black">
        <video
          src={videoUrl}
          controls
          className="w-full h-full"
          style={{ display: 'block' }}
          onError={handleError}
        />
      </div>

      {error && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
          <div className="text-center">
            <div className="text-red-400 text-sm font-medium mb-2">⚠️ {error}</div>
            <div className="text-gray-400 text-xs font-mono break-all px-4 py-2 bg-black/40 rounded">
              {videoUrl}
            </div>
          </div>
        </div>
      )}

      {/* Open in new tab icon */}
      {!error && (
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 bg-black/60 p-2 rounded hover:bg-black"
        >
          ↗
        </a>
      )}
    </div>
  )
}