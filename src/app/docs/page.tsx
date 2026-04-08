"use client"

import Link from 'next/link'
import { useAdmin } from '@/contexts/AdminContext'
import { useViewer } from '@/contexts/ViewerContext'
import { ChangeEvent, FormEvent, Suspense, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { inferPostDateFromMarkdown } from '@/lib/r2-utils'

type Post = {
  id: string | number
  title: string
  tag?: string
  author?: string
  group_name?: string
  content_path?: string
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
  inferPostDateFromMarkdown(typeof post.content_path === 'string' ? post.content_path : '') ??
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

const getPostType = (post: Post): 'Video' | 'Link' => {
  const content = typeof post.content_path === 'string' ? post.content_path : ''
  if (/<!--\s*VIDEO_ID:/i.test(content)) return 'Video'
  return 'Link'
}

const getLinkUrlFromContent = (contentPath?: string | null): string | null => {
  if (typeof contentPath !== 'string') return null

  const content = contentPath.trim()
  if (!content || content.startsWith('posts/')) return null

  const markdownLinkMatch = content.match(/\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/i)
  if (markdownLinkMatch?.[1]) {
    return markdownLinkMatch[1]
  }

  const plainUrlMatch = content.match(/^(https?:\/\/\S+)$/i)
  if (plainUrlMatch?.[1]) {
    return plainUrlMatch[1]
  }

  const firstUrlMatch = content.match(/https?:\/\/[^\s)]+/i)
  return firstUrlMatch?.[0] ?? null
}

const getPostExternalUrl = (post: Post): string | null => {
  if (getPostType(post) === 'Video') return null
  return getLinkUrlFromContent(post.content_path)
}

const getPostDateMarkerFromContent = (contentPath?: string | null): string | null => {
  if (typeof contentPath !== 'string') return null
  const markerMatch = contentPath.match(/<!--\s*POST_DATE:([\s\S]*?)\s*-->/i)
  const markerValue = markerMatch?.[1]?.trim()
  if (!markerValue) return null
  const parsed = new Date(markerValue)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

const POSTS_PER_PAGE = 10

function DocsLandingPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isHomeDashboard = pathname === '/'
  const basePath = pathname?.startsWith('/user-guide-v2') || isHomeDashboard ? '/user-guide-v2' : '/docs'
  const isUserGuideV2Dashboard = basePath === '/user-guide-v2'
  const storagePrefix = basePath.replace(/^\//, '')

  useEffect(() => {
    if (basePath === '/docs') {
      router.replace('/user-guide-v2')
    }
  }, [basePath, router])
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
  const [sortBy, setSortBy] = useState<'title-asc' | 'title-desc' | 'date-old-new' | 'date-new-old'>('date-new-old')
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'Video' | 'Link' | null>(null)
  const [filterGroup, setFilterGroup] = useState<string | null>(null)
  const [savingStatusPostId, setSavingStatusPostId] = useState<string | number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [uploadPostMenuOpen, setUploadPostMenuOpen] = useState(false)
  const [uploadLinkDialogOpen, setUploadLinkDialogOpen] = useState(false)
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkGroupName, setLinkGroupName] = useState('')
  const [linkTag, setLinkTag] = useState<(typeof STATUS_OPTIONS)[number]>('new')
  const [uploadLinkStatus, setUploadLinkStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [uploadLinkMessage, setUploadLinkMessage] = useState('')
  const [editingLinkPostId, setEditingLinkPostId] = useState<string | number | null>(null)
  const [editingLinkDateMarker, setEditingLinkDateMarker] = useState<string | null>(null)

  // Restore selectedGroup and selectedStatus from localStorage
  useEffect(() => {
    const savedGroup = localStorage.getItem(`${storagePrefix}-selected-group`)
    const savedStatus = localStorage.getItem(`${storagePrefix}-selected-status`)
    if (savedGroup && savedGroup !== 'null') {
      setSelectedGroup(savedGroup)
    }
    if (savedStatus && savedStatus !== 'null') {
      setSelectedStatus(savedStatus)
    }
  }, [])

  // Save selectedGroup to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`${storagePrefix}-selected-group`, selectedGroup || '')
  }, [selectedGroup, storagePrefix])

  // Save selectedStatus to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`${storagePrefix}-selected-status`, selectedStatus || '')
  }, [selectedStatus, storagePrefix])

  // Restore dashboard group filter from URL first, then localStorage fallback.
  useEffect(() => {
    const queryGroup = (searchParams.get('group') || '').trim()
    const savedGroup = (localStorage.getItem(`${storagePrefix}-filter-group`) || '').trim()
    const nextGroup = queryGroup || savedGroup || null
    setFilterGroup(prev => (prev === nextGroup ? prev : nextGroup))
  }, [searchParams, storagePrefix])

  // Keep dashboard group filter in URL for browser history/back consistency.
  useEffect(() => {
    const currentQueryGroup = (searchParams.get('group') || '').trim()
    const nextGroup = (filterGroup || '').trim()

    localStorage.setItem(`${storagePrefix}-filter-group`, nextGroup)

    if (currentQueryGroup === nextGroup) return

    const params = new URLSearchParams(searchParams.toString())
    if (nextGroup) params.set('group', nextGroup)
    else params.delete('group')

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(nextUrl, { scroll: false })
  }, [filterGroup, pathname, router, searchParams, storagePrefix])

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

      // Type filter
      const matchesTypeFilter = !filterType || getPostType(post) === filterType
      
      // Group filter
      const matchesGroupFilter = !filterGroup || post.group_name === filterGroup
      
      return matchesSearch && matchesStatusFilter && matchesTypeFilter && matchesGroupFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title-asc':
          return a.title.localeCompare(b.title)
        case 'title-desc':
          return b.title.localeCompare(a.title)
        case 'date-old-new':
          return new Date(getPostDateValue(a) || 0).getTime() - new Date(getPostDateValue(b) || 0).getTime()
        case 'date-new-old':
          return new Date(getPostDateValue(b) || 0).getTime() - new Date(getPostDateValue(a) || 0).getTime()
        default:
          return 0
      }
    })

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedPosts.length / POSTS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * POSTS_PER_PAGE
  const paginatedPosts = filteredAndSortedPosts.slice(startIndex, startIndex + POSTS_PER_PAGE)
  const showingStart = filteredAndSortedPosts.length === 0 ? 0 : startIndex + 1
  const showingEnd = filteredAndSortedPosts.length === 0
    ? 0
    : Math.min(startIndex + POSTS_PER_PAGE, filteredAndSortedPosts.length)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortBy, filterStatus, filterType, filterGroup])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const openEdit = async (post: Post) => {
    if (getPostType(post) === 'Link') {
      try {
        const res = await fetch(`/api/posts/${encodeURIComponent(String(post.id))}`)
        if (!res.ok) throw new Error('Failed to load link post')
        const data = await res.json()
        const content = typeof data.content_path === 'string' ? data.content_path : ''
        const extractedUrl = getLinkUrlFromContent(content) || ''
        const normalizedTag = normalizeTag(data.tag)
        const safeTag = STATUS_OPTIONS.includes(normalizedTag as (typeof STATUS_OPTIONS)[number])
          ? (normalizedTag as (typeof STATUS_OPTIONS)[number])
          : 'new'

        setEditingLinkPostId(post.id)
        setEditingLinkDateMarker(getPostDateMarkerFromContent(content))
        setLinkTitle(data.title || post.title || '')
        setLinkUrl(extractedUrl)
        setLinkGroupName(data.group_name || '')
        setLinkTag(safeTag)
        setUploadLinkStatus('idle')
        setUploadLinkMessage('')
        setUploadLinkDialogOpen(true)
      } catch {
        alert('Failed to load link post for editing.')
      }
      return
    }

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

  const openUploadVideoDialog = () => {
    setUploadPostMenuOpen(false)
    setEditingPost(null)
    setUploadDialogOpen(true)
  }

  const openUploadLinkDialog = () => {
    setUploadPostMenuOpen(false)
    setEditingLinkPostId(null)
    setEditingLinkDateMarker(null)
    setLinkTitle('')
    setLinkUrl('')
    setLinkGroupName('')
    setLinkTag('new')
    setUploadLinkDialogOpen(true)
    setUploadLinkStatus('idle')
    setUploadLinkMessage('')
  }

  const closeUploadLinkDialog = () => {
    setUploadLinkDialogOpen(false)
    setEditingLinkPostId(null)
    setEditingLinkDateMarker(null)
    setLinkTitle('')
    setLinkUrl('')
    setLinkGroupName('')
    setLinkTag('new')
    setUploadLinkStatus('idle')
    setUploadLinkMessage('')
  }

  const handleUploadLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const cleanTitle = linkTitle.trim()
    const cleanUrl = linkUrl.trim()

    if (!cleanTitle || !cleanUrl) {
      setUploadLinkStatus('error')
      setUploadLinkMessage('Please fill in title and link.')
      return
    }

    let normalizedUrl = cleanUrl
    try {
      normalizedUrl = new URL(cleanUrl).toString()
    } catch {
      setUploadLinkStatus('error')
      setUploadLinkMessage('Please enter a valid URL (including http:// or https://).')
      return
    }

    try {
      setUploadLinkStatus('loading')
      setUploadLinkMessage(editingLinkPostId ? 'Saving link post...' : 'Uploading link post...')

      const formData = new FormData()
      const postDateIso = editingLinkDateMarker || new Date().toISOString()
      const markdownWithDate = `<!-- POST_DATE:${postDateIso} -->\n[Open link](${normalizedUrl})`

      if (editingLinkPostId) {
        const res = await fetch(`/api/posts/${encodeURIComponent(String(editingLinkPostId))}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: cleanTitle,
            markdown: markdownWithDate,
            tag: linkTag,
            group_name: linkGroupName || null,
          }),
        })

        const body = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(body?.error || 'Failed to save link post')
        }

        await Promise.all([refreshPosts(), refreshGroups()])
        closeUploadLinkDialog()
        return
      }

      formData.append('title', cleanTitle)
      formData.append('markdown', markdownWithDate)
      formData.append('tag', linkTag)
      formData.append('group_name', linkGroupName)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const body = await res.json()
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to upload link post')
      }

      await Promise.all([refreshPosts(), refreshGroups()])
      closeUploadLinkDialog()
    } catch (error) {
      setUploadLinkStatus('error')
      setUploadLinkMessage(error instanceof Error ? error.message : 'Failed to upload link post')
    }
  }

  const handleLinkUrlInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value
    const isDeletion = nextValue.length < linkUrl.length

    if (nextValue.trim() === '') {
      setLinkUrl('')
      setUploadLinkStatus('idle')
      setUploadLinkMessage('')
      return
    }

    if (isDeletion && linkUrl.trim() !== '') {
      setLinkUrl('')
      setUploadLinkStatus('error')
      setUploadLinkMessage('Link auto-cleared after edit. Paste the full URL again.')
      return
    }

    setLinkUrl(nextValue)
    if (uploadLinkStatus === 'error') {
      setUploadLinkStatus('idle')
      setUploadLinkMessage('')
    }
  }

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

  if (basePath === '/docs') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-5 w-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
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
                <div className="ml-auto grid grid-cols-2 gap-3 min-w-[320px] flex-shrink-0">
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
                {isUserGuideV2Dashboard ? (
                  <div className="relative">
                    <button
                      onClick={() => setUploadPostMenuOpen(prev => !prev)}
                      className="flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Upload Post
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>

                    {uploadPostMenuOpen && (
                      <div className="absolute left-0 top-full z-10 mt-2 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                        <button
                          onClick={openUploadVideoDialog}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 17l8-5-8-5v10z" />
                            <rect x="3" y="4" width="18" height="16" rx="2" />
                          </svg>
                          Upload Video
                        </button>
                        <button
                          onClick={openUploadLinkDialog}
                          className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                          Upload Link
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingPost(null); setUploadDialogOpen(true) }}
                    className="flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Upload New Video
                  </button>
                )}
                <button
                  onClick={() => setCreateGroupDialogOpen(true)}
                  className="flex items-center gap-2 rounded-md bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 10v6M9 13h6" />
                    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.92 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                  </svg>
                  Manage Groups
                </button>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-100 bg-white p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">All Posts</h2>
              
              {/* Search, Sort, and Filter Bar */}
              <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:gap-3">
                {/* Search Bar */}
                <div className="w-full md:max-w-[420px]">
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

                <div className="flex flex-col gap-4 md:ml-auto md:flex-row md:items-end md:gap-3">
                {/* Sort Dropdown */}
                <div className="min-w-[180px]">
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'title-asc' | 'title-desc' | 'date-old-new' | 'date-new-old')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                  >
                    <option value="date-new-old">Date (New → Old)</option>
                    <option value="date-old-new">Date (Old → New)</option>
                    <option value="title-asc">Title (A → Z)</option>
                    <option value="title-desc">Title (Z → A)</option>
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

                {/* Type Filter Dropdown */}
                <div className="min-w-[180px]">
                  <label className="block text-xs font-semibold text-slate-600 mb-2">By Type</label>
                  <select
                    value={filterType || ''}
                    onChange={(e) => setFilterType((e.target.value as 'Video' | 'Link') || null)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                  >
                    <option value="">All Types</option>
                    <option value="Video">Video</option>
                    <option value="Link">Link</option>
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

              </div>

              {/* Results Count */}
              <div className="text-xs text-slate-500 mb-3">
                Showing {showingStart}-{showingEnd} of {filteredAndSortedPosts.length} filtered posts ({localPosts.length} total)
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <div className="hidden grid-cols-[minmax(0,1fr)_170px_170px_170px_170px_170px_52px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 md:grid">
                  <div>Name</div>
                  <div className="text-center">Type</div>
                  <div className="text-center">Status</div>
                  <div>Group</div>
                  <div>Author</div>
                  <div>Date</div>
                  <div className="text-right"> </div>
                </div>
                {filteredAndSortedPosts.length > 0 ? (
                  paginatedPosts.map(post => (
                    (() => {
                      const externalUrl = getPostExternalUrl(post)
                      return (
                    <div
                      key={post.id}
                      className="group grid gap-3 border-t border-slate-100 px-4 py-4 transition-colors hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_170px_170px_170px_170px_170px_52px] md:items-center"
                    >
                      {externalUrl ? (
                        <a
                          href={externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 text-sm text-slate-800 transition-colors group-hover:text-slate-950"
                          title="Open link in new tab"
                        >
                          <span className="block truncate font-semibold text-slate-900">{post.title}</span>
                        </a>
                      ) : (
                        <Link
                          href={filterGroup ? `${basePath}/${post.id}?group=${encodeURIComponent(filterGroup)}` : `${basePath}/${post.id}`}
                          className="min-w-0 text-sm text-slate-800 transition-colors group-hover:text-slate-950"
                        >
                          <span className="block truncate font-semibold text-slate-900">{post.title}</span>
                        </Link>
                      )}

                      <div className="text-sm md:whitespace-nowrap md:text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${getPostType(post) === 'Video' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-violet-50 text-violet-700 border border-violet-200'}`}>
                          {getPostType(post)}
                        </span>
                      </div>

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

                      <div className="min-w-0 text-sm text-slate-600 md:whitespace-nowrap">
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
                        {externalUrl ? (
                          <a
                            href={externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 transition-colors group-hover:text-slate-700"
                            aria-label={`Open ${post.title} in a new tab`}
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 5l7 7-7 7" />
                            </svg>
                          </a>
                        ) : (
                          <Link
                            href={filterGroup ? `${basePath}/${post.id}?group=${encodeURIComponent(filterGroup)}` : `${basePath}/${post.id}`}
                            className="text-slate-500 transition-colors group-hover:text-slate-700"
                            aria-label={`Open ${post.title}`}
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        )}
                      </div>
                    </div>
                      )
                    })()
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500 text-sm">No posts found matching your search or filters.</p>
                  </div>
                )}
              </div>

              {(
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Page {safeCurrentPage} of {totalPages}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={safeCurrentPage === 1}
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                          safeCurrentPage === page
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={safeCurrentPage === totalPages}
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {uploadLinkDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{editingLinkPostId ? 'Edit Link' : 'Upload Link'}</h3>
              <button
                type="button"
                onClick={closeUploadLinkDialog}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close upload link dialog"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleUploadLink}>
              <div>
                <label className="block text-sm text-slate-700">Title</label>
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-blue-500"
                  placeholder="Enter post title"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-700">Link</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={handleLinkUrlInputChange}
                  className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-blue-500"
                  placeholder="Paste your URL here"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-700">Status Tag</label>
                <select
                  value={linkTag}
                  onChange={(e) => setLinkTag(e.target.value as (typeof STATUS_OPTIONS)[number])}
                  className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500"
                >
                  <option value="new">New</option>
                  <option value="in-review">In Review</option>
                  <option value="tested">Tested</option>
                  <option value="released">Released</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-700">Group</label>
                <select
                  value={linkGroupName}
                  onChange={(e) => setLinkGroupName(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-blue-500"
                >
                  <option value="">Ungrouped</option>
                  {currentGroups
                    .map(group => group.name)
                    .sort((a, b) => a.localeCompare(b))
                    .map(groupName => (
                      <option key={groupName} value={groupName}>
                        {groupName}
                      </option>
                    ))}
                </select>
              </div>

              {uploadLinkStatus === 'error' && uploadLinkMessage && (
                <p className="text-sm text-red-500">{uploadLinkMessage}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeUploadLinkDialog}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLinkStatus === 'loading'}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadLinkStatus === 'loading' ? (editingLinkPostId ? 'Saving...' : 'Uploading...') : (editingLinkPostId ? 'Save Changes' : 'Upload Link')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DocsLandingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="h-5 w-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      }
    >
      <DocsLandingPageContent />
    </Suspense>
  )
}
