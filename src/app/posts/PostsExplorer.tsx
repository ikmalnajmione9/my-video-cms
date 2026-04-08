"use client"

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Post = {
  id: string | number
  title: string
  tag?: string
  group_name?: string | null
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

export default function PostsExplorer({ posts }: { posts: Post[] }) {
  const searchParams = useSearchParams()
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const selectedGroup = (searchParams.get('group') || '').trim() || null

  // Get all statuses: defaults + custom from posts
  const allStatuses = useMemo(() => {
    const defaults = ['new', 'in-review', 'tested', 'released']
    const fromPosts = Array.from(new Set(posts.map(p => normalizeTag(p.tag))))
    const combined = Array.from(new Set([...defaults, ...fromPosts]))
    return combined.sort((a, b) => {
      const order: Record<string, number> = { 'new': 0, 'in-review': 1, 'tested': 2, 'released': 3 }
      return (order[a] ?? 999) - (order[b] ?? 999)
    })
  }, [posts])

  // Get displayed posts based on filters
  const displayedPosts = useMemo(() => {
    const byGroup = selectedGroup
      ? posts.filter(p => (p.group_name || '').trim() === selectedGroup)
      : posts

    if (selectedStatus) {
      return byGroup.filter(p => normalizeTag(p.tag) === selectedStatus)
    }

    if (selectedGroup) {
      return byGroup
    }

    return []
  }, [posts, selectedStatus, selectedGroup])

  const getStatusCount = (status: string) => {
    return posts.filter(p => normalizeTag(p.tag) === status).length
  }

  return (
    <>
      {/* Status Cards Section */}
      <div className="mb-8 p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Select a Status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {allStatuses.map(status => {
            const count = getStatusCount(status)
            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedStatus === status
                    ? 'border-blue-600 bg-white shadow-lg'
                    : 'border-slate-300 bg-white hover:border-blue-400'
                }`}
              >
                <div className={`inline-block rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-wider mb-3 ${getTagBadgeClass(status)}`}>
                  {formatTag(status)}
                </div>
                <div className="text-sm font-medium text-slate-900">{count}</div>
                <div className="text-xs text-slate-600">{count === 1 ? 'video' : 'videos'}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Videos Display */}
      <div className="rounded-lg border border-slate-100 bg-white p-6">
        {selectedGroup && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
            <div className="text-xs text-violet-800">
              Showing videos for group: <span className="font-bold uppercase tracking-wide">{selectedGroup}</span>
            </div>
            <Link href="/posts" className="text-xs font-semibold text-violet-700 hover:text-violet-900 hover:underline">
              Clear group filter
            </Link>
          </div>
        )}

        {posts.length === 0 && <p className="text-sm text-slate-600">No videos available yet.</p>}

        {posts.length > 0 && !selectedStatus && !selectedGroup && (
          <p className="text-sm text-slate-600">Select a status above to view videos.</p>
        )}

        {posts.length > 0 && selectedStatus && displayedPosts.length === 0 && (
          <p className="text-sm text-slate-600">No videos found in this status.</p>
        )}

        {displayedPosts.length > 0 && (
          <div>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
              {formatTag(selectedStatus || '')} ({displayedPosts.length})
            </h2>
            <div className="space-y-2">
              {displayedPosts.map(post => (
                <Link
                  key={post.id}
                  href={selectedGroup ? `/posts/${post.id}?group=${encodeURIComponent(selectedGroup)}` : `/posts/${post.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{post.title}</h3>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${getTagBadgeClass(post.tag)}`}>
                        {formatTag(post.tag)}
                      </span>
                      {post.group_name && (
                        <span className="rounded-full border border-violet-200 bg-violet-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                          {post.group_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 ml-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}