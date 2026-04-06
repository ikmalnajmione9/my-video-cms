"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useViewer } from '@/contexts/ViewerContext'
import ViewerPostSidebar from '@/components/ViewerPostSidebar'

type Post = {
  id: string | number
  title: string
  tag?: string
  group_name?: string
}

type FilterPageProps = {
  params: Promise<{ tag: string }>
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

export default function ViewerFilterPage({ params }: FilterPageProps) {
  const { isLoading, posts } = useViewer()
  const [tag, setTag] = useState<string>('')
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([])

  useEffect(() => {
    const getParams = async () => {
      const { tag: tagName } = await params
      setTag(decodeURIComponent(tagName))
    }
    getParams()
  }, [params])

  useEffect(() => {
    // Filter posts by tag
    const filtered = posts.filter(p => 
      normalizeTag(p.tag) === normalizeTag(tag) && 
      p.tag !== 'system' && 
      !p.title?.startsWith('__GROUP_MARKER__')
    )
    setFilteredPosts(filtered)
  }, [posts, tag])

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

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="flex-1 overflow-hidden">
          <ViewerPostSidebar posts={filteredPosts} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 bg-slate-50 text-slate-900">
          <div className="max-w-4xl px-6 py-12">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Link
                href="/viewer"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-400/40 hover:text-slate-900"
              >
                Back to All Videos
              </Link>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${getTagBadgeClass(tag)}`}>
                {formatTag(tag)}
              </span>
            </div>

            <div className="mb-8 border-b border-slate-100 pb-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-2">Filter Videos</p>
              <h1 className="text-3xl font-extrabold text-slate-900">{formatTag(tag)}</h1>
              <p className="text-sm text-slate-600 leading-relaxed mt-2">
                All videos with {formatTag(tag)} status.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5">
              {filteredPosts.length === 0 ? (
                <div className="rounded-lg border border-slate-100 bg-white p-6 text-center">
                  <p className="text-sm text-slate-600">No videos found with this status.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredPosts.map((post) => (
                    <div
                      key={post.id}
                      className="group flex items-center justify-between py-4 hover:bg-slate-100 px-2 rounded-md -mx-2 transition-colors"
                    >
                      <div className="flex-1 flex items-center gap-3">
                        <Link
                          href={`/viewer/${post.id}`}
                          className="flex-1 text-sm text-slate-700 group-hover:text-slate-900 transition-colors font-medium"
                        >
                          {post.title}
                        </Link>
                        {post.group_name && (
                          <span className="text-xs text-slate-500 px-2 py-1 rounded bg-slate-100">
                            {post.group_name}
                          </span>
                        )}
                      </div>
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors ml-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
