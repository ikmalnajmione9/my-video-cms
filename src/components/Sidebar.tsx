"use client"

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function Sidebar({ posts, activeId }: any) {
  const searchParams = useSearchParams()
  const activeGroup = (searchParams.get('group') || '').trim()

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col font-sans">
      {/* Header */}
      <div className="px-6 py-6 border-b border-slate-200">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
            N7
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900">Net7 System</div>
            <div className="text-xs text-slate-500">Product Guide Hub</div>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {posts.map((post: any) => (
            <Link
              key={post.id}
              href={activeGroup ? `/posts/${post.id}?group=${encodeURIComponent(activeGroup)}` : `/posts/${post.id}`}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all
                ${
                  activeId === post.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }
              `}
            >
              <div className="h-5 w-5 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="flex-1">{post.title}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200 text-xs text-slate-500">
        <div>v1.0.0 • Product Guide Hub</div>
      </div>
    </aside>
  )
}