import Link from 'next/link'

export default function Sidebar({ posts, activeId }: any) {
  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col font-sans">
      {/* Header */}
      <div className="px-4 py-3 font-semibold text-sm border-b border-slate-200 text-slate-900">
        🧩 Net7 Product Guide Web
      </div>

      {/* Search (UI only for now) */}
      <div className="p-3">
        <input
          placeholder="Search title..."
          className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm text-slate-800"
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
                  ? 'bg-blue-50 border-blue-500'
                  : 'border-transparent hover:bg-slate-100'
              }
            `}
          >
            <div className="font-medium text-slate-800">{post.title}</div>
            <div className="text-xs text-slate-500 flex justify-between mt-1">
              <span className="bg-blue-100 text-blue-700 px-1.5 rounded">NEW</span>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  )
}