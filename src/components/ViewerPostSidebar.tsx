"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useViewer } from '@/contexts/ViewerContext'

type Post = { 
  id: string | number; 
  title: string; 
  content_path?: string; 
  tag?: string; 
  author?: string;
  group_name?: string;
}

const DEFAULT_TAG_OPTIONS = ['all', 'new', 'in-review', 'tested', 'released'] as const

const normalizeTag = (tag?: string) => (tag || 'new').toLowerCase()
const formatTag = (tag?: string) => normalizeTag(tag).replace(/-/g, ' ')
const getTagBadgeClass = (tag?: string) => {
  const normalized = normalizeTag(tag)
  if (normalized === 'tested') return 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
  if (normalized === 'released') return 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
  if (normalized === 'in-review') return 'bg-amber-600/20 text-amber-300 border border-amber-500/40'
  return 'bg-sky-600/20 text-sky-300 border border-sky-500/40'
}

export default function ViewerPostSidebar({ posts }: { posts: Post[] }) {
  const pathname = usePathname()
  const activeId = pathname?.split('/').pop() || ''
  const { groups } = useViewer()

  const [searchQuery, setSearchQuery] = useState('')

  const visiblePosts = [...posts]
    .filter((post) => !searchQuery || post.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const groupNames = Array.from(new Set([
    ...groups.map(group => group.name),
    ...(posts.map(post => post.group_name).filter(Boolean) as string[])
  ]))
  const ungroupedPosts = visiblePosts.filter(p => !p.group_name)

  const renderPost = (post: Post) => {
    const isActive = String(post.id) === String(activeId)

    return (
      <div
        key={post.id}
        className={`group relative flex items-center justify-between rounded-xl px-4 py-2.5 transition-all duration-300 select-none ${
          isActive 
            ? 'bg-blue-50 text-slate-900 shadow-[0_8px_20px_-16px_rgba(59,130,246,0.4)] border border-blue-200' 
            : 'text-slate-600 hover:bg-slate-100 border border-transparent'
        }`}
      >
        <Link
          href={`/viewer/${post.id}`}
          className="flex-1 text-sm font-medium transition-colors group-hover:text-slate-900"
        >
          <div className="break-words pr-4 leading-snug">{post.title}</div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${getTagBadgeClass(post.tag)}`}>
              {formatTag(post.tag)}
            </span>
            {post.group_name && (
                <span className="rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-violet-100 text-violet-700 border border-violet-200">
                {post.group_name}
              </span>
            )}
          </div>
        </Link>
      </div>
    )
  }

  return (
    <aside className="flex flex-col h-full font-sans">
      <div className="mb-6 space-y-4">
        <div className="space-y-4">
          <Link 
            href="/" 
            className="group/hub flex-1"
            title="Return to Home"
          >
            <h2 className="text-xl font-extrabold text-blue-700 truncate group-hover/hub:text-blue-600 transition-all active:scale-95 origin-left">
              Net7 Product Guide Web
            </h2>
            <p className="text-xs text-slate-600 mt-1">User Guide Videos</p>
          </Link>

          <div className="relative group/search">
            <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 transition-all shadow-inner hover:bg-slate-50"
            />
          </div>
        </div>
      </div>

      <nav className="space-y-4 custom-scrollbar max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
        {/* Groups */}
        {groupNames.map(groupName => {
          const groupPosts = visiblePosts.filter(p => p.group_name === groupName)

          return (
            <div 
              key={groupName} 
              className="rounded-xl transition-all border border-transparent"
            >
              <div className="flex items-center px-3 py-2 rounded-xl group/folder">
                <div className="flex min-w-0 items-center gap-2 flex-1">
                  <span className="text-[13px] font-bold break-words leading-snug text-slate-900">
                    {groupName}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {groupPosts.length}
                  </span>
                </div>
              </div>
              <div className="ml-4 pl-3 border-l-2 border-slate-100 space-y-0.5 py-1">
                {groupPosts.map(post => renderPost(post))}
              </div>
            </div>
          )
        })}

        {/* Ungrouped Posts */}
        {ungroupedPosts.length > 0 && (
          <div className="space-y-0.5">
            {ungroupedPosts.map(post => renderPost(post))}
          </div>
        )}

        {visiblePosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50">
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-slate-400 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-center text-slate-600">No matching items found.</p>
          </div>
        )}
      </nav>
      <style jsx global>{`
        /* Light mode - sidebar scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.35);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.8);
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </aside>
  )
}
