"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import UploadDialog from '@/app/posts/UploadDialog'
import GroupDialog from './GroupDialog'

type Post = { 
  id: string | number; 
  title: string; 
  content_path?: string; 
  tag?: string; 
  author?: string;
  group_name?: string;
}

type PostWithContent = Post & { content_path: string; tag?: string; author?: string }

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

export default function PostSidebar({ posts }: { posts: Post[] }) {
  const UNGROUPED_KEY = '__ungrouped__'
  const GROUP_ORDER_KEY = 'post-sidebar-group-order'
  const POST_ORDER_KEY = 'post-sidebar-post-order'

  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeId = pathname?.split('/').pop() || ''
  const activeGroup = (searchParams.get('group') || '').trim()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<PostWithContent | null>(null)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [actionMenuPostId, setActionMenuPostId] = useState<string | number | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [groupOrder, setGroupOrder] = useState<string[]>([])
  const [postOrderByGroup, setPostOrderByGroup] = useState<Record<string, string[]>>({})
  const [draggedGroup, setDraggedGroup] = useState<string | null>(null)
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null)
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null)
  const [draggedPostGroup, setDraggedPostGroup] = useState<string | null>(null)
  const [dragOverPostId, setDragOverPostId] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    import('@/lib/supabase-client').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
      supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    })
  }, [])

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupName)) next.delete(groupName)
      else next.add(groupName)
      return next
    })
  }

  const mergeOrder = (ids: string[], storedOrder: string[]) => {
    const idSet = new Set(ids)
    const ordered = storedOrder.filter(id => idSet.has(id))
    const missing = ids.filter(id => !ordered.includes(id))
    return [...ordered, ...missing]
  }

  const moveItem = (items: string[], fromItem: string, toItem: string) => {
    const fromIndex = items.indexOf(fromItem)
    const toIndex = items.indexOf(toItem)
    if (fromIndex === -1 || toIndex === -1) return items
    const next = [...items]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    return next
  }

  const openEditDialog = async (post: Post) => {
    const postId = String(post.id ?? '').trim()
    if (!postId || postId === 'undefined' || postId === 'null') {
      setStatusMessage('Invalid post id for edit.')
      return
    }

    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data?.error || 'Failed to load post')

      setEditingPost({
        id: postId,
        title: data.title,
        content_path: data.content_path,
        tag: typeof data.tag === 'string' ? data.tag : 'new',
        author: typeof data.author === 'string' ? data.author : '',
        group_name: data.group_name
      })
      setDialogOpen(true)
      setActionMenuPostId(null)
      setStatusMessage('')
    } catch (error: any) {
      setStatusMessage(error?.message || 'Failed to load post for edit')
    }
  }

  const visiblePosts = [...posts]
    .filter((post) => !searchQuery || post.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const getPostGroupKey = (post: Post) => post.group_name || UNGROUPED_KEY

  const groupsRaw = Array.from(new Set(visiblePosts.map(p => p.group_name).filter(Boolean))) as string[]
  const groups = mergeOrder(groupsRaw, groupOrder)

  const getPostsForGroup = (groupName: string) => {
    if (groupName === UNGROUPED_KEY) return visiblePosts.filter(p => getPostGroupKey(p) === UNGROUPED_KEY)
    return visiblePosts.filter(p => getPostGroupKey(p) === groupName)
  }

  const orderPosts = (items: Post[], groupName: string) => {
    const ids = items.map(p => String(p.id))
    const storedOrder = postOrderByGroup[groupName] || []
    const merged = mergeOrder(ids, storedOrder)
    const byId = new Map(items.map(item => [String(item.id), item]))
    return merged.map(id => byId.get(id)).filter(Boolean) as Post[]
  }

  const ungroupedPosts = orderPosts(getPostsForGroup(UNGROUPED_KEY), UNGROUPED_KEY)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const storedGroupOrder = localStorage.getItem(GROUP_ORDER_KEY)
      const storedPostOrder = localStorage.getItem(POST_ORDER_KEY)
      if (storedGroupOrder) {
        const parsed = JSON.parse(storedGroupOrder)
        if (Array.isArray(parsed)) setGroupOrder(parsed)
      }
      if (storedPostOrder) {
        const parsed = JSON.parse(storedPostOrder)
        if (parsed && typeof parsed === 'object') setPostOrderByGroup(parsed)
      }
    } catch {
      // Ignore malformed local preferences.
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(GROUP_ORDER_KEY, JSON.stringify(groupOrder))
  }, [groupOrder])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(POST_ORDER_KEY, JSON.stringify(postOrderByGroup))
  }, [postOrderByGroup])

  const persistGroupChange = async (postId: string, targetGroup: string) => {
    const groupValue = targetGroup === UNGROUPED_KEY ? null : targetGroup
    const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_name: groupValue })
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data?.error || 'Failed to update group')
    }
  }

  const handleGroupDrop = (targetGroup: string) => {
    if (!draggedGroup || draggedGroup === targetGroup) return
    const nextOrder = moveItem(groups, draggedGroup, targetGroup)
    setGroupOrder(nextOrder)
    setDragOverGroup(null)
    setDraggedGroup(null)
  }

  const movePostBetweenGroups = async (targetGroup: string, targetPostId?: string) => {
    if (!draggedPostId || !draggedPostGroup) return

    const sourceGroup = draggedPostGroup
    const sourcePosts = orderPosts(getPostsForGroup(sourceGroup), sourceGroup)
    const sourceIds = mergeOrder(sourcePosts.map(p => String(p.id)), postOrderByGroup[sourceGroup] || [])
    const sourceNext = sourceIds.filter(id => id !== draggedPostId)

    const targetPosts = orderPosts(getPostsForGroup(targetGroup), targetGroup)
    const targetIds = mergeOrder(targetPosts.map(p => String(p.id)), postOrderByGroup[targetGroup] || []).filter(id => id !== draggedPostId)

    let targetNext = [...targetIds]
    if (targetPostId) {
      const targetIndex = targetIds.indexOf(targetPostId)
      if (targetIndex >= 0) targetNext.splice(targetIndex, 0, draggedPostId)
      else targetNext.push(draggedPostId)
    } else {
      targetNext.push(draggedPostId)
    }

    setPostOrderByGroup(prev => ({
      ...prev,
      [sourceGroup]: sourceNext,
      [targetGroup]: targetNext,
    }))

    try {
      if (sourceGroup !== targetGroup) {
        await persistGroupChange(draggedPostId, targetGroup)
        router.refresh()
      }
    } catch (error: any) {
      setStatusMessage(error?.message || 'Failed to update group')
    } finally {
      setDragOverGroup(null)
      setDragOverPostId(null)
      setDraggedPostId(null)
      setDraggedPostGroup(null)
    }
  }

  const handlePostDrop = (targetPostId: string, targetGroup: string, groupPosts: Post[]) => {
    if (!draggedPostId || !draggedPostGroup) return
    if (draggedPostId === targetPostId) return

    const currentIds = groupPosts.map(p => String(p.id))
    const merged = mergeOrder(currentIds, postOrderByGroup[targetGroup] || [])

    if (draggedPostGroup === targetGroup) {
      const nextOrder = moveItem(merged, draggedPostId, targetPostId)
      setPostOrderByGroup(prev => ({
        ...prev,
        [targetGroup]: nextOrder,
      }))
      setDragOverPostId(null)
      setDraggedPostId(null)
      setDraggedPostGroup(null)
      return
    }

    void movePostBetweenGroups(targetGroup, targetPostId)
  }

  const handleStatusChange = async (post: Post, newTag: string) => {
    const postId = String(post.id ?? '').trim()
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: newTag })
      })
      if (!res.ok) throw new Error('Failed to update status')
      router.refresh()
    } catch (error: any) {
      setStatusMessage(error?.message || 'Update failed')
    }
  }

  const handleDelete = async (post: Post) => {
    const postId = String(post.id ?? '').trim()
    if (!postId || postId === 'undefined' || postId === 'null') {
      setStatusMessage('Invalid post id.')
      return
    }

    const confirmed = window.confirm(`Delete post “${post.title}”?`)
    if (!confirmed) return

    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body?.error || 'Delete failed')
      }

      // If currently viewing the deleted post, redirect to the parent page
      if (String(activeId) === String(postId)) {
        // Determine redirect path based on current location
        if (pathname.includes('/posts/')) {
          router.push('/posts')
        } else if (pathname.includes('/docs/')) {
          router.push('/docs')
        } else if (pathname.includes('/viewer/')) {
          router.push('/viewer')
        } else {
          router.refresh()
        }
      } else {
        router.refresh()
      }
    } catch (error: any) {
      setStatusMessage(error?.message || 'Delete failed')
    }
  }

  const renderPost = (post: Post, groupKey: string) => {
    const isActive = String(post.id) === String(activeId)
    const isMenuOpen = actionMenuPostId === post.id
    const postId = String(post.id)
    const isDraggedOver = dragOverPostId === postId && draggedPostGroup === groupKey

    return (
      <div
        key={post.id}
        draggable={!!session}
        onDragStart={() => {
          if (!session) return
          setDraggedPostId(postId)
          setDraggedPostGroup(groupKey)
        }}
        onDragOver={(e) => {
          if (!session) return
          e.preventDefault()
          setDragOverPostId(postId)
        }}
        onDragLeave={() => {
          if (!session) return
          if (dragOverPostId === postId) setDragOverPostId(null)
        }}
        onDrop={(e) => {
          if (!session) return
          e.preventDefault()
          const targetPosts = orderPosts(getPostsForGroup(groupKey), groupKey)
          handlePostDrop(postId, groupKey, targetPosts)
        }}
        onDragEnd={() => {
          if (!session) return
          setDragOverPostId(null)
          setDraggedPostId(null)
          setDraggedPostGroup(null)
        }}
        className={`group relative flex items-center justify-between rounded-xl px-4 py-2.5 transition-all duration-300 select-none ${
          isActive 
            ? 'bg-blue-600/10 text-white shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)] border border-blue-500/30' 
            : 'text-slate-400 hover:bg-white/5 border border-transparent'
        } ${isDraggedOver ? 'ring-1 ring-blue-500/60 bg-blue-500/10' : ''}`}
      >
        <Link
          href={activeGroup ? `/posts/${post.id}?group=${encodeURIComponent(activeGroup)}` : `/posts/${post.id}`}
          className="flex-1 text-sm font-medium transition-colors group-hover:text-white"
        >
          <div className="break-words pr-4 leading-snug">{post.title}</div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${getTagBadgeClass(post.tag)}`}>
              {formatTag(post.tag)}
            </span>
            {post.group_name && (
              <span className="rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-violet-600/20 text-violet-300 border border-violet-500/40">
                {post.group_name}
              </span>
            )}
          </div>
        </Link>

        {session && (
          <div className="relative">
            <button
              className={`flex h-6 w-6 items-center justify-center rounded-lg border transition-all ${
                isMenuOpen 
                  ? 'border-slate-300 bg-slate-100 text-slate-900' 
                  : 'border-slate-100 bg-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700'
              }`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setActionMenuPostId(isMenuOpen ? null : post.id)
              }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-2xl z-40 backdrop-blur-xl">
                <div className="px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 mb-1">Status</div>
                {['new', 'in-review', 'tested', 'released'].map(t => (
                  <button
                    key={t}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] transition-colors ${
                      normalizeTag(post.tag) === t 
                        ? 'bg-blue-600/20 text-blue-400 font-bold' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    onClick={() => handleStatusChange(post, t)}
                  >
                    <div className={`h-1.5 w-1.5 rounded-full ${
                      t === 'tested' ? 'bg-emerald-400' : 
                      t === 'released' ? 'bg-indigo-400' : 
                      t === 'in-review' ? 'bg-amber-400' : 'bg-sky-400'
                    }`} />
                    {formatTag(t)}
                  </button>
                ))}
                <div className="h-px bg-slate-200 my-1" />
                <button
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => openEditDialog(post)}
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  Full Edit
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] text-red-400 hover:bg-red-400/10"
                  onClick={() => handleDelete(post)}
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className="flex flex-col h-full font-sans">
      {statusMessage && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-[10px] text-red-300 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage('')}><svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
        </div>
      )}

      <UploadDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialTitle={editingPost?.title}
        initialMarkdown={editingPost?.content_path}
        initialTag={editingPost?.tag || 'new'}
        initialAuthor={editingPost?.author}
        initialGroupName={editingPost?.group_name ?? null}
        groupOptions={Array.from(new Set(posts.map(post => post.group_name || '').filter(Boolean) as string[]))}
        postId={editingPost?.id}
        onSaved={() => {
          setDialogOpen(false)
          router.refresh()
          // Force re-fetch of data from server
          setTimeout(() => {
            window.location.reload()
          }, 500)
        }}
      />

      <GroupDialog
        isOpen={groupDialogOpen}
        onClose={() => setGroupDialogOpen(false)}
        post={selectedPost || undefined}
        allPosts={posts}
        onSaved={() => {
          setGroupDialogOpen(false)
          router.refresh()
          // Force re-fetch of data from server
          setTimeout(() => {
            window.location.reload()
          }, 500)
        }}
      />

      <div className="mb-6 space-y-4">
        <div className="space-y-4">
          <Link 
            href="/" 
            className="group/hub flex-1"
            title="Return to Home"
          >
            <h2 className="text-xl font-extrabold text-blue-300 truncate group-hover/hub:text-blue-200 transition-all active:scale-95 origin-left">
              Net7 Product Guide Web
            </h2>
          </Link>

          <div className="relative group/search">
            <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within/search:text-blue-400 transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500/50 transition-all shadow-inner hover:bg-white/10"
            />
          </div>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        {session && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setEditingPost(null)
                setDialogOpen(true)
              }}
              className="flex items-center justify-center gap-2 rounded-xl h-10 text-[11px] font-bold text-white bg-blue-600 shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Upload
            </button>
            <button
              onClick={() => setGroupDialogOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl h-10 text-[11px] font-bold text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z" />
              </svg>
              Group
            </button>
          </div>
        )}

      </div>

      <nav className="space-y-4 custom-scrollbar max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
        {/* Groups */}
        {groups.map(groupName => {
          const isExpanded = expandedGroups.has(groupName)
          const groupPosts = orderPosts(getPostsForGroup(groupName), groupName)
          const isDragOver = dragOverGroup === groupName && draggedGroup !== groupName

          return (
            <div 
              key={groupName} 
              className={`rounded-xl transition-all border ${
                isDragOver ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_20px_-10px_rgba(59,130,246,0.5)]' : 'border-transparent'
              }`}
              onDragOver={(e) => {
                if (!session) return
                e.preventDefault()
                setDragOverGroup(groupName)
              }}
              onDragLeave={() => session && setDragOverGroup(null)}
              onDrop={(e) => {
                if (!session) return
                e.preventDefault()
                if (draggedPostId) {
                  void movePostBetweenGroups(groupName)
                  return
                }
                handleGroupDrop(groupName)
              }}
            >
              <button
                onClick={() => toggleGroup(groupName)}
                className="flex w-full items-center px-3 py-2 text-left hover:bg-white/10 rounded-xl transition-all group/folder"
                draggable={!!session}
                onDragStart={() => {
                  if (!session) return
                  setDraggedGroup(groupName)
                }}
                onDragEnd={() => {
                  if (!session) return
                  setDraggedGroup(null)
                  setDragOverGroup(null)
                }}
              >
                <div className="flex min-w-0 items-center gap-2 flex-1">
                  <span className={`text-[13px] font-bold break-words leading-snug ${isExpanded ? 'text-white' : 'text-slate-300'}`}>
                    {groupName}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {groupPosts.length}
                  </span>
                </div>
                <div className={`ml-2 flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                  <svg viewBox="0 0 24 24" className="h-3 w-3 text-slate-500 group-hover/folder:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
              {isExpanded && (
                <div className="ml-4 pl-3 border-l-2 border-white/5 space-y-0.5 py-1">
                  {groupPosts.map(post => renderPost(post, groupName))}
                </div>
              )}
            </div>
          )
        })}

        {/* Ungrouped Posts */}
        {ungroupedPosts.length > 0 && (
          <div
            className="space-y-0.5"
            onDragOver={(e) => {
              if (!session) return
              e.preventDefault()
            }}
            onDrop={(e) => {
              if (!session) return
              e.preventDefault()
              if (draggedPostId) {
                void movePostBetweenGroups(UNGROUPED_KEY)
              }
            }}
          >
            {ungroupedPosts.map(post => renderPost(post, UNGROUPED_KEY))}
          </div>
        )}

        {visiblePosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl border border-dashed border-white/5 bg-white/[0.02]">
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-slate-700 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-center text-slate-500">No matching items found.</p>
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
