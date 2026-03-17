export default function VideoPlayer({ videoId }: { videoId: string }) {
  return (
    <div className="relative bg-black rounded-md overflow-hidden">
      <div className="aspect-video">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className="w-full h-full"
          allowFullScreen
        />
      </div>

      {/* Open icon */}
      <a
        href={`https://www.youtube.com/watch?v=${videoId}`}
        target="_blank"
        className="absolute top-2 right-2 bg-black/60 p-2 rounded hover:bg-black"
      >
        ↗
      </a>
    </div>
  )
}