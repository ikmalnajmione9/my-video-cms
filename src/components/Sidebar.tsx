import Link from 'next/link'

export default function Sidebar({ posts, activeId }: any) {
  return (
    <aside className="w-72 bg-[#161b22] border-r border-[#30363d] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 font-semibold text-sm border-b border-[#30363d]">
        🧩 Net7 Feature Hub
      </div>

      {/* Search (UI only for now) */}
      <div className="p-3">
        <input
          placeholder="Search title..."
          className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {posts.map((post: any) => (
          <Link
            key={post.id}
            href={`/posts/${post.id}`}
            className={`block px-4 py-3 text-sm border-l-2
              ${
                activeId === post.id
                  ? 'bg-[#1f2937] border-blue-500'
                  : 'border-transparent hover:bg-[#1f2937]'
              }
            `}
          >
            <div className="font-medium">{post.title}</div>
            <div className="text-xs text-gray-400 flex justify-between mt-1">
              <span>{post.youtube_video_id}</span>
              <span className="bg-blue-600/20 text-blue-400 px-1.5 rounded">
                NEW
              </span>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  )
}