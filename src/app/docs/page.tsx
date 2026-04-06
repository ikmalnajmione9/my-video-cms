"use client"

import Link from 'next/link'
import { useAdmin } from '@/contexts/AdminContext'
import { useViewer } from '@/contexts/ViewerContext'
import { useEffect, useState } from 'react'

type Post = {
  id: string | number
  title: string
  tag?: string
  author?: string
  group_name?: string
  created_at?: string
  createdAt?: string
  published_at?: string
  publishedAt?: string
  updated_at?: string
  updatedAt?: string
  inserted_at?: string
  insertedAt?: string
  date?: string
}

const normalizeTag = (tag?: string) => (tag || 'new').toLowerCase()
const formatTag = (tag?: string) => normalizeTag(tag).replace(/-/g, ' ')
const STATUS_OPTIONS = ['new', 'in-review', 'tested', 'released'] as const
const getPostDateValue = (post: Post) =>
  post.created_at ??
  post.createdAt ??
  post.published_at ??
  post.publishedAt ??
  post.updated_at ??
  post.updatedAt ??
  post.inserted_at ??
  post.insertedAt ??
  post.date ??
  null

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' })
}
const getTagBadgeClass = (tag?: string) => {
  const normalized = normalizeTag(tag)
  if (normalized === 'tested') return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
  if (normalized === 'released') return 'bg-indigo-100 text-indigo-700 border border-indigo-200'
  if (normalized === 'in-review') return 'bg-amber-100 text-amber-700 border border-amber-200'
  return 'bg-sky-100 text-sky-700 border border-sky-200'
}

export default function DocsLandingPage() {
  const {
    isAdmin,
    isLoading: adminLoading,
    posts,
    groups,
    refreshPosts,
    refreshGroups,
    setUploadDialogOpen,
    setEditingPost,
    setCreateGroupDialogOpen,
    setDeleteGroupDialogOpen,
    setGroupToDelete,
    setEditGroupDialogOpen,
    setGroupToEdit,
    setDeletePostDialogOpen,
    setPostToDelete,
  } = useAdmin()

  const { posts: viewerPosts, groups: viewerGroups, isLoading: viewerLoading } = useViewer()

  const [localPosts, setLocalPosts] = useState<Post[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [filters, setFilters] = useState<{tag: string, count: number}[]>([])
  const [browseMode, setBrowseMode] = useState<'group' | 'status'>('group')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'title-asc' | 'title-desc' | 'group-asc' | 'group-desc' | 'date-old-new' | 'date-new-old'>('title-asc')
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterGroup, setFilterGroup] = useState<string | null>(null)
  const [savingStatusPostId, setSavingStatusPostId] = useState<string | number | null>(null)

  // Restore selectedGroup and selectedStatus from localStorage
  useEffect(() => {
    const savedGroup = localStorage.getItem('dashboard-selected-group')
    const savedStatus = localStorage.getItem('dashboard-selected-status')
    if (savedGroup && savedGroup !== 'null') {
      setSelectedGroup(savedGroup)
    }
    if (savedStatus && savedStatus !== 'null') {
      setSelectedStatus(savedStatus)
    }
  }, [])

  // Save selectedGroup to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dashboard-selected-group', selectedGroup || '')
  }, [selectedGroup])

  // Save selectedStatus to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dashboard-selected-status', selectedStatus || '')
  }, [selectedStatus])

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isAdmin) {
          // Filter out system posts and marker posts from admin posts
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
          setLoading(false)
        } else {
          // Use viewer posts for non-admin users
          const filteredPosts = viewerPosts.filter(p => 
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
          setLoading(false)
        }
      } catch (error) {
        console.error('Error in fetchData:', error)
        setLocalPosts([])
        setFilters([])
        setLoading(false)
      }
    }

    fetchData()
  }, [isAdmin, posts, viewerPosts])

  if (loading || adminLoading || viewerLoading) {
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
  const currentGroups = isAdmin ? groups : viewerGroups
  const groupNames = currentGroups.map(g => g.name)
  const selectedGroupPosts = selectedGroup
    ? (localPosts ?? []).filter(post => post.group_name === selectedGroup)
    : []
  const selectedStatusPosts = selectedStatus
    ? (localPosts ?? []).filter(post => normalizeTag(post.tag) === normalizeTag(selectedStatus))
    : []

  const handleDeleteGroup = (groupName: string | null | undefined) => {
    if (!groupName) return
    setGroupToDelete(groupName)
    setDeleteGroupDialogOpen(true)
  }

  const handleEditGroup = (groupName: string | null | undefined) => {
    if (!groupName) return
    setGroupToEdit(groupName)
    setEditGroupDialogOpen(true)
  }

  const handleDeletePost = (post: Post) => {
    setPostToDelete(post)
    setDeletePostDialogOpen(true)
  }

  const handleStatusChange = async (postId: string | number, nextStatus: string) => {
    setSavingStatusPostId(postId)
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(String(postId))}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tag: nextStatus }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to update status')
      }

      await refreshPosts()
    } catch (error) {
      console.error('Failed to update post status:', error)
      alert(error instanceof Error ? error.message : 'Failed to update status')
    } finally {
      setSavingStatusPostId(null)
    }
  }

  // Filter and sort posts based on search, status filter, and group filter
  const filteredAndSortedPosts = (localPosts ?? [])
    .filter(post => {
      // Search filter
      const matchesSearch = !searchQuery || 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (post.group_name && post.group_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (post.tag && post.tag.toLowerCase().includes(searchQuery.toLowerCase()))
      
      // Status filter
      const matchesStatusFilter = !filterStatus || normalizeTag(post.tag) === normalizeTag(filterStatus)
      
      // Group filter
      const matchesGroupFilter = !filterGroup || post.group_name === filterGroup
      
      return matchesSearch && matchesStatusFilter && matchesGroupFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title-asc':
          return a.title.localeCompare(b.title)
        case 'title-desc':
          return b.title.localeCompare(a.title)
        case 'group-asc':
          return (a.group_name || '').localeCompare(b.group_name || '')
        case 'group-desc':
          return (b.group_name || '').localeCompare(a.group_name || '')
        case 'date-old-new':
          return new Date(getPostDateValue(a) || 0).getTime() - new Date(getPostDateValue(b) || 0).getTime()
        case 'date-new-old':
          return new Date(getPostDateValue(b) || 0).getTime() - new Date(getPostDateValue(a) || 0).getTime()
        default:
          return 0
      }
    })

  const getInitials = (name?: string) => {
    const value = (name || 'Unknown').trim()
    return value
      .split(/\s+/)
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'U'
  }

  const openEdit = async (post: Post) => {
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(String(post.id))}`)
      const data = await res.json()
      setEditingPost({
        id: post.id,
        title: data.title,
        content_path: data.content_path,
        tag: data.tag || 'new',
        author: data.author || '',
        group_name: data.group_name,
      })
      setUploadDialogOpen(true)
    } catch {
      alert('Failed to load post for editing.')
    }
  }

  return (
    <div className="flex min-h-screen bg-transparent">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 bg-transparent text-slate-900">
          <div className="px-6 py-8">
            <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1 max-w-2xl">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-2">Dashboard</p>
                  <h1 className="text-3xl font-extrabold text-slate-900 mb-3">Product Guide Hub</h1>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 min-w-[320px] flex-shrink-0">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Total</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{total}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Groups</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{groupNames.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Controls */}
            {isAdmin && (
              <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Quick Actions</p>
                <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => { setEditingPost(null); setUploadDialogOpen(true) }}
                  className="flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Upload New Video
                </button>
                <button
                  onClick={() => setCreateGroupDialogOpen(true)}
                  className="flex items-center gap-2 rounded-md bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 10v6M9 13h6" />
                    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.92 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                  </svg>
                  Create Group
                </button>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-100 bg-white p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">All Videos</h2>
              
              {/* Search, Sort, and Filter Bar */}
              <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-end md:gap-3">
                {/* Search Bar */}
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Search</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by title, group, or status..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 pr-9 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Clear search"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6l-12 12M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sort Dropdown */}
                <div className="min-w-[180px]">
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'title-asc' | 'title-desc' | 'group-asc' | 'group-desc' | 'date-old-new' | 'date-new-old')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                  >
                    <option value="title-asc">Title (A → Z)</option>
                    <option value="title-desc">Title (Z → A)</option>
                    <option value="group-asc">Group (A → Z)</option>
                    <option value="group-desc">Group (Z → A)</option>
                    <option value="date-old-new">Date (Old → New)</option>
                    <option value="date-new-old">Date (New → Old)</option>
                  </select>
                </div>

                {/* Filter Dropdown */}
                <div className="min-w-[180px]">
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Filter</label>
                  <select
                    value={filterStatus || ''}
                    onChange={(e) => setFilterStatus(e.target.value || null)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                  >
                    <option value="">All Statuses</option>
                    <option value="released">Released</option>
                    <option value="in-review">In Review</option>
                    <option value="tested">Tested</option>
                    <option value="new">New</option>
                  </select>
                </div>

                {/* Group Filter Dropdown */}
                {(currentGroups?.length ?? 0) > 0 && (
                  <div className="min-w-[180px]">
                    <label className="block text-xs font-semibold text-slate-600 mb-2">By Group</label>
                    <select
                      value={filterGroup || ''}
                      onChange={(e) => setFilterGroup(e.target.value || null)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                    >
                      <option value="">All Groups</option>
                      {currentGroups.map(group => (
                        <option key={group.name} value={group.name}>{group.name}</option>
                      ))}
                    </select>
                  </div>
                )}


              </div>

              {/* Results Count */}
              <div className="text-xs text-slate-500 mb-3">
                Showing {filteredAndSortedPosts.length} of {localPosts.length} videos
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <div className="hidden grid-cols-[minmax(0,1fr)_170px_170px_170px_170px_52px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 md:grid">
                  <div>Name</div>
                  <div className="text-center">Status</div>
                  <div>Group</div>
                  <div>Author</div>
                  <div>Date</div>
                  <div className="text-right"> </div>
                </div>
                {filteredAndSortedPosts.length > 0 ? (
                  filteredAndSortedPosts.map(post => (
                    <div
                      key={post.id}
                      className="group grid gap-3 border-t border-slate-100 px-4 py-4 transition-colors hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_170px_170px_170px_170px_52px] md:items-center"
                    >
                      <Link
                        href={`/docs/${post.id}`}
                        className="min-w-0 text-sm text-slate-800 transition-colors group-hover:text-slate-950"
                      >
                        <span className="block truncate font-semibold text-slate-900">{post.title}</span>
                      </Link>

                      <div className="flex items-center justify-center gap-2 md:whitespace-nowrap">
                        {isAdmin ? (
                          <select
                            value={normalizeTag(post.tag)}
                            onChange={(e) => void handleStatusChange(post.id, e.target.value)}
                            disabled={savingStatusPostId === post.id}
                            className={`min-w-[92px] rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize outline-none transition-colors ${getTagBadgeClass(post.tag)} ${savingStatusPostId === post.id ? 'opacity-70' : 'hover:brightness-95'}`}
                          >
                            {STATUS_OPTIONS.map(status => (
                              <option key={status} value={status}>
                                {formatTag(status)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold capitalize whitespace-nowrap ${getTagBadgeClass(post.tag)}`}>
                            {formatTag(post.tag)}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 text-sm text-slate-600 md:whitespace-nowrap">
                        <span className="block truncate">{post.group_name || '—'}</span>
                      </div>

                      <div className="flex min-w-0 items-center gap-3 text-sm text-slate-600 md:whitespace-nowrap">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                          {getInitials(post.author)}
                        </span>
                        <span className="min-w-0 truncate">{post.author || 'Unknown'}</span>
                      </div>

                      <div className="text-sm text-slate-600 md:pr-2 md:whitespace-nowrap">{formatDate(getPostDateValue(post))}</div>

                      <div className="flex items-center justify-end gap-2">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEdit(post)}
                              className="opacity-0 transition-opacity text-[10px] px-2 py-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 group-hover:opacity-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePost(post)}
                              className="opacity-0 transition-opacity text-[10px] px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 group-hover:opacity-100"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        <Link
                          href={`/docs/${post.id}`}
                          className="text-slate-500 transition-colors group-hover:text-slate-700"
                          aria-label={`Open ${post.title}`}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500 text-sm">No videos found matching your search or filters.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
