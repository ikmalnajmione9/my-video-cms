"use client"

import { useEffect, useState } from 'react'
import { useViewer } from '@/contexts/ViewerContext'
import ViewerPostSidebar from '@/components/ViewerPostSidebar'
import Link from 'next/link'

type Post = {
  id: string | number
  title: string
  tag?: string
  group_name?: string
}

const normalizeTag = (tag?: string) => (tag || 'new').toLowerCase()
const formatTag = (tag?: string) => normalizeTag(tag).replace(/-/g, ' ')
const getTagBadgeClass = (tag?: string) => {
  const normalized = normalizeTag(tag)
  if (normalized === 'tested') return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
  if (normalized === 'released') return 'bg-indigo-100 text-indigo-700 border border-indigo-200'
  if (normalized === 'in-review') return 'bg-amber-100 text-amber-700 border border-amber-200'
  return 'bg-sky-100 text-sky-700 border border-sky-200'
}

export default function ViewerLandingPage() {
  const { isLoading, posts, groups } = useViewer()
  const [localPosts, setLocalPosts] = useState<Post[]>([])
  const [filters, setFilters] = useState<{tag: string, count: number}[]>([])
  const [browseMode, setBrowseMode] = useState<'group' | 'status'>('group')

  // Restore browseMode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('viewer-browse-mode')
    if (savedMode === 'group' || savedMode === 'status') {
      setBrowseMode(savedMode)
    }
  }, [])

  // Save browseMode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('viewer-browse-mode', browseMode)
  }, [browseMode])

  useEffect(() => {
    // Filter out system posts and marker posts
    const filteredPosts = posts.filter(p => 
      p.tag !== 'system' && 
      !p.title?.startsWith('__GROUP_MARKER__')
    )
    setLocalPosts(filteredPosts)

    // Get unique tags and their counts
    const tagMap = new Map<string, number>()
    const allStatuses = ['released', 'in-review', 'tested', 'new']
    
    // Initialize all statuses with 0
    allStatuses.forEach(status => {
      tagMap.set(status, 0)
    })
    
    // Count actual posts
    filteredPosts.forEach(p => {
      const tag = normalizeTag(p.tag)
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1)
    })
    
    const filterList = Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => {
        // Sort: released, in-review, tested, new
        const order = { 'released': 0, 'in-review': 1, 'tested': 2, 'new': 3 }
        const aOrder = order[a.tag as keyof typeof order] ?? 999
        const bOrder = order[b.tag as keyof typeof order] ?? 999
        return aOrder - bOrder
      })
    
    setFilters(filterList)
  }, [posts])

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="h-5 w-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="h-5 w-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const total = localPosts?.length ?? 0
  const groupNames = groups.map(g => g.name)

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="flex-1 overflow-hidden">
          <ViewerPostSidebar posts={localPosts} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 bg-slate-50 text-slate-900">
          <div className="max-w-4xl px-6 py-12">
            <div className="mb-8 border-b border-slate-100 pb-6 flex items-start justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-2">Videos</p>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-3">Net7 Product Guide Web</h1>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Browse, read and explore the features of the Net7 mobile app.
                </p>
              </div>
              <div className="flex gap-8 text-sm pt-4 text-right">
                <div>
                  <p className="text-2xl font-bold text-slate-900">{total}</p>
                  <p className="text-slate-500 text-xs mt-0.5">Total Videos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{groupNames.length}</p>
                  <p className="text-slate-500 text-xs mt-0.5">Groups</p>
                </div>
              </div>
            </div>

            {(groupNames.length > 0 || filters.length > 0) && (
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Browse</h2>
                  <select
                    value={browseMode}
                    onChange={(e) => setBrowseMode(e.target.value as 'group' | 'status')}
                    className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md px-2 py-1 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {groupNames.length > 0 && <option value="group">By Group</option>}
                    {filters.length > 0 && <option value="status">By Status</option>}
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {browseMode === 'group' && groupNames.map(groupName => {
                    const groupData = groups.find(g => g.name === groupName)
                    const count = groupData?.post_count ?? 0
                    return (
                      <div
                        key={groupName}
                        className="group flex flex-col gap-1 rounded-lg border border-slate-100 bg-white px-4 py-3 hover:border-blue-400/60 hover:bg-sky-50 transition-all relative"
                      >
                        <Link
                          href={`/viewer/groups/${groupName}`}
                          className="flex flex-col gap-1"
                        >
                          <span className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">{groupName}</span>
                          <span className="text-xs text-slate-500">{count} {count === 1 ? 'video' : 'videos'}</span>
                        </Link>
                      </div>
                    )
                  })}

                  {browseMode === 'status' && filters.map(({ tag, count }) => (
                    <Link
                      key={tag}
                      href={`/viewer/filter/${tag}`}
                      className="group rounded-lg border border-slate-100 bg-white px-4 py-3 hover:border-blue-400/60 hover:bg-sky-50 transition-all"
                    >
                      <div className="flex flex-col gap-2">
                        <span className={`inline-block text-xs font-bold uppercase tracking-wider rounded-full px-2 py-1 w-fit ${getTagBadgeClass(tag)}`}>
                          {formatTag(tag)}
                        </span>
                        <span className="text-xs text-slate-500">{count} {count === 1 ? 'video' : 'videos'}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-100 bg-white p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">All Videos</h2>
              <div className="divide-y divide-slate-100">
                {(localPosts ?? []).map(post => (
                  <div
                    key={post.id}
                    className="group flex items-center justify-between py-3 hover:bg-slate-100 px-2 rounded-md -mx-2 transition-colors"
                  >
                    <Link
                      href={`/viewer/${post.id}`}
                      className="flex-1 text-sm text-slate-700 group-hover:text-slate-900 transition-colors"
                    >
                      {post.title}
                    </Link>
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
