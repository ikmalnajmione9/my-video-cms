"use client"

import { useState } from 'react'

export default function VideoGallery({ videoIds }: { videoIds: string[] }) {
  const [activeVideoId, setActiveVideoId] = useState(videoIds[0])

  if (!videoIds.length) return null

  return (
    <div className="my-10 space-y-6">
      {/* Main Player */}
      <div className="relative group w-[65%] mx-auto aspect-video rounded-2xl overflow-hidden glass-card shadow-2xl transition-all duration-500 hover:shadow-blue-500/10 border border-white/10">
        <iframe
          key={activeVideoId}
          src={`https://www.youtube.com/embed/${activeVideoId}?rel=0&modestbranding=1&enablejsapi=1`}
          className="w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
        
        {/* Gallery Label (Only if multiple) */}
        {videoIds.length > 1 && (
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-black/60 backdrop-blur-md rounded-full text-white/90 border border-white/10">
              Video Gallery
            </span>
          </div>
        )}
      </div>

      {/* Thumbnails (Only if multiple) */}
      {videoIds.length > 1 && (
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {videoIds.map((id, index) => (
            <button
              key={id}
              onClick={() => setActiveVideoId(id)}
              className={`relative overflow-hidden group w-32 aspect-video rounded-xl border transition-all duration-300 ${
                activeVideoId === id 
                  ? 'ring-2 ring-blue-500/50 border-blue-400/50 scale-105 shadow-lg' 
                  : 'border-white/10 opacity-60 hover:opacity-100 hover:scale-105 opacity-50 grayscale-50'
              }`}
              aria-label={`Switch to video ${index + 1}`}
            >
              <img 
                src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} 
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors" />
              {activeVideoId === id && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex bg-blue-500/80 rounded-full p-1.5 shadow-lg animate-pulse">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" stroke="none"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
