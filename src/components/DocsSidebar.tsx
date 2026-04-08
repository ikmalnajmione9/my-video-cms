"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAdmin } from '@/contexts/AdminContext'
import { useViewer } from '@/contexts/ViewerContext'

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

export default function DocsSidebar({ posts, basePath = '/docs', onClose }: { posts: Post[]; basePath?: string; onClose?: () => void }) {
  const UNGROUPED_KEY = '__ungrouped__'
  const GROUP_ORDER_KEY = 'docs-sidebar-group-order'
  const POST_ORDER_KEY = 'docs-sidebar-post-order'

  const pathname = usePathname()
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const { isAdmin, canManageAccounts, posts: adminPosts, groups: adminGroups, refreshPosts, refreshGroups, setUploadDialogOpen, setEditingPost, setCreateGroupDialogOpen, setGroupDialogOpen, setSelectedPostForGroup, setDeleteGroupDialogOpen, setGroupToDelete, setEditGroupDialogOpen, setGroupToEdit, setRemovePostDialogOpen, setPostToRemove } = useAdmin()
  const { posts: viewerPosts, groups: viewerGroups } = useViewer()
  const [groupOrder, setGroupOrder] = useState<string[]>([])
  const [postOrderByGroup, setPostOrderByGroup] = useState<Record<string, string[]>>({})
  const [draggedGroup, setDraggedGroup] = useState<string | null>(null)
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null)
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null)
  const [draggedPostGroup, setDraggedPostGroup] = useState<string | null>(null)
  const [dragOverPostId, setDragOverPostId] = useState<string | null>(null)
  const [postGroupOverride, setPostGroupOverride] = useState<Record<string, string>>({})

  const activeId = pathname?.split('/').pop() || ''
  const isHomeActive = pathname === basePath
  const isDocsActive = pathname === '/docs' || pathname?.startsWith('/docs/')
  const isUserGuideV2Active = pathname === '/user-guide-v2' || pathname?.startsWith('/user-guide-v2/')
  const isAccountsActive = pathname === '/admin/accounts' || pathname?.startsWith('/admin/accounts/')

  const sourcePosts = isAdmin ? adminPosts : viewerPosts
  // Keep marker posts out of the UI, even if server-provided data still includes them.
  const filteredPosts = sourcePosts.filter(p => {
    if (p.title?.startsWith('__GROUP_MARKER__') || p.tag === 'system') return false

    if (!searchQuery) return true

    const query = searchQuery.toLowerCase()
    return (
      p.title.toLowerCase().includes(query) ||
      (p.group_name && p.group_name.toLowerCase().includes(query)) ||
      (p.tag && p.tag.toLowerCase().includes(query))
    )
  })
  const currentGroups = isAdmin ? adminGroups : viewerGroups
  const allGroupsRaw = currentGroups.map(group => group.name)
  const getPostGroupKey = (post: Post) => {
    const postId = String(post.id)
    return postGroupOverride[postId] || post.group_name || UNGROUPED_KEY
  }

  const ungrouped = filteredPosts.filter(p => getPostGroupKey(p) === UNGROUPED_KEY)

  const mergeOrder = (ids: string[], storedOrder: string[]) => {
    const idSet = new Set(ids)
    const ordered = storedOrder.filter(id => idSet.has(id))
    const missing = ids.filter(id => !ordered.includes(id))
    return [...ordered, ...missing]
  }

  const orderPosts = (items: Post[], groupName: string) => {
    const ids = items.map(p => String(p.id))
    const storedOrder = postOrderByGroup[groupName] || []
    const merged = mergeOrder(ids, storedOrder)
    const byId = new Map(items.map(item => [String(item.id), item]))
    return merged.map(id => byId.get(id)).filter(Boolean) as Post[]
  }

  const getPostsForGroup = (groupName: string) => {
    if (groupName === UNGROUPED_KEY) {
      return filteredPosts.filter(p => getPostGroupKey(p) === UNGROUPED_KEY)
    }
    return filteredPosts.filter(p => getPostGroupKey(p) === groupName)
  }

  const allGroups = (() => {
    const merged = mergeOrder(allGroupsRaw, groupOrder)
    return merged
  })()
  const visibleGroups = searchQuery
    ? allGroups.filter(group => getPostsForGroup(group).length > 0)
    : allGroups

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

  useEffect(() => {
    // Once upstream post state is refreshed, we can clear local optimistic group overrides.
    setPostGroupOverride({})
  }, [sourcePosts])

  const moveItem = (items: string[], fromItem: string, toItem: string) => {
    const fromIndex = items.indexOf(fromItem)
    const toIndex = items.indexOf(toItem)
    if (fromIndex === -1 || toIndex === -1) return items
    const next = [...items]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    return next
  }

  const handleGroupDrop = (targetGroup: string) => {
    if (!draggedGroup || draggedGroup === targetGroup) return
    const nextOrder = moveItem(allGroups, draggedGroup, targetGroup)
    setGroupOrder(nextOrder)
    setDragOverGroup(null)
    setDraggedGroup(null)
  }

  const persistGroupChange = async (postId: string, targetGroup: string) => {
    if (!isAdmin) return
    const groupValue = targetGroup === UNGROUPED_KEY ? null : targetGroup
    try {
      await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_name: groupValue }),
      })
      await Promise.all([refreshPosts(), refreshGroups()])
    } catch {
      // Best effort sync; UI will reconcile on next refresh.
    }
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

    if (sourceGroup !== targetGroup) {
      setPostGroupOverride(prev => ({
        ...prev,
        [draggedPostId]: targetGroup,
      }))
      await persistGroupChange(draggedPostId, targetGroup)
    }

    setDragOverPostId(null)
    setDraggedPostId(null)
    setDraggedPostGroup(null)
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

  const toggleGroup = (g: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      return next
    })
  }

  const renderPost = (post: Post, groupKey: string) => {
    const isActive = String(post.id) === String(activeId)
    const postId = String(post.id)
    const isDraggedOver = dragOverPostId === postId && draggedPostGroup === groupKey
    return (
      <div
        key={post.id}
        className={`group rounded ${isDraggedOver ? 'ring-1 ring-blue-500/60 bg-blue-500/10' : ''}`}
        draggable={isAdmin}
        onDragStart={() => {
          if (!isAdmin) return
          setDraggedPostId(postId)
          setDraggedPostGroup(groupKey)
        }}
        onDragOver={(e) => {
          if (!isAdmin) return
          e.preventDefault()
          setDragOverPostId(postId)
        }}
        onDragLeave={() => {
          if (!isAdmin) return
          if (dragOverPostId === postId) setDragOverPostId(null)
        }}
          onDrop={(e) => {
          if (!isAdmin) return
          e.preventDefault()
          const targetPosts = groupKey === UNGROUPED_KEY
            ? orderPosts(ungrouped, UNGROUPED_KEY)
              : orderPosts(getPostsForGroup(groupKey), groupKey)
          handlePostDrop(postId, groupKey, targetPosts)
        }}
          onDragEnd={() => {
            if (!isAdmin) return
            setDragOverPostId(null)
            setDraggedPostId(null)
            setDraggedPostGroup(null)
          }}
      >
        <Link
          href={`${basePath}/${post.id}`}
          className={`flex min-w-0 items-center justify-between gap-2 text-sm transition-colors py-1 ${
            isActive
              ? 'text-slate-900 font-semibold'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <span className="block min-w-0 flex-1 break-words leading-snug">{post.title}</span>
          <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${getTagBadgeClass(post.tag)}`}>
              {formatTag(post.tag)}
          </span>
        </Link>
        {isAdmin && (
          <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {post.group_name && (
              <button
                onClick={() => {
                  setPostToRemove(post)
                  setRemovePostDialogOpen(true)
                }}
                className="text-slate-500 hover:text-amber-600 mr-2 p-1"
                title="Remove from group"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                </svg>
              </button>
            )}
            <button
              onClick={() => {
                setSelectedPostForGroup(post)
                setGroupDialogOpen(true)
              }}
              className="text-slate-500 hover:text-violet-600 mr-2 p-1"
              title="Manage groups"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.92 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
              </svg>
            </button>
            <button
              onClick={() => {
                setEditingPost(post)
                setUploadDialogOpen(true)
              }}
              className="text-slate-500 hover:text-blue-600 p-1"
              title="Edit post"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    )
  }

  if (basePath === '/user-guide-v2') {
    return (
      <div className="flex flex-col h-full font-sans bg-white">
        {/* Header */}
        <div className="px-6 py-6 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
              N7
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">Net7 System</div>
              <div className="text-xs text-slate-500">Product Guide Hub</div>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="Close sidebar"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6l-12 12" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            <Link
              href="/user-guide-v2"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                ${
                  isUserGuideV2Active
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }
              `}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Product Guide
            </Link>

            {canManageAccounts && (
              <Link
                href="/admin/accounts"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                  ${
                    isAccountsActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }
                `}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 12H9m6 0a6 6 0 01-6 6H6a6 6 0 010-12h4a6 6 0 016 6z" />
                </svg>
                Manage Accounts
              </Link>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 text-xs text-slate-500">
          <div>v1.0.0 • Net7 System</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 font-sans">

      <div className="mb-4">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
          Search
        </label>
        <div className="relative group/search">
          <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within/search:text-blue-400 transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
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

      {/* Admin Controls */}
      {isAdmin && (
        <div className="mb-5 rounded-xl border border-slate-300 bg-slate-100 p-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Admin Controls</h3>
          <div className="space-y-2">
            <button
              onClick={() => setUploadDialogOpen(true)}
              className="w-full flex items-center gap-2 text-left text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-200 px-2 py-1.5 rounded transition-colors whitespace-nowrap"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <path d="M14 2v6h6" />
                <path d="M12 12v6" />
                <path d="M9 15h6" />
              </svg>
              Upload New Video
            </button>
            <button
              onClick={() => setCreateGroupDialogOpen(true)}
              className="w-full flex items-center gap-2 text-left text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-200 px-2 py-1.5 rounded transition-colors whitespace-nowrap"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.92 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                <path d="M12 10v6" />
                <path d="M9 13h6" />
              </svg>
              Manage Groups
            </button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <Link
          href={basePath}
          className={`group relative flex min-w-0 items-center rounded py-1 text-left text-xs font-bold tracking-widest transition-colors whitespace-nowrap ${
            isHomeActive
              ? 'text-slate-900 font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex min-w-0 items-center">
            <span className="truncate whitespace-nowrap">All</span>
          </div>
        </Link>
      </div>

      {/* Grouped */}
      {visibleGroups.map(group => {
        const isCollapsed = collapsedGroups.has(group)
        const groupPosts = orderPosts(getPostsForGroup(group), group)
        const isGroupDraggedOver = dragOverGroup === group && draggedGroup !== group
        return (
          <div
            key={group}
            className={`mb-6 rounded ${isGroupDraggedOver ? 'ring-1 ring-blue-500/60 bg-blue-500/10' : ''}`}
            onDragOver={(e) => {
              if (!isAdmin) return
              e.preventDefault()
              setDragOverGroup(group)
            }}
            onDragLeave={() => {
              if (!isAdmin) return
              if (dragOverGroup === group) setDragOverGroup(null)
            }}
            onDrop={(e) => {
              if (!isAdmin) return
              e.preventDefault()
              if (draggedPostId) {
                void movePostBetweenGroups(group)
                return
              }
              handleGroupDrop(group)
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => toggleGroup(group)}
                className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left text-xs font-bold tracking-widest text-slate-600 hover:text-slate-900 transition-colors"
                draggable={isAdmin}
                onDragStart={() => {
                  if (!isAdmin) return
                  setDraggedGroup(group)
                }}
                onDragEnd={() => {
                  if (!isAdmin) return
                  setDraggedGroup(null)
                  setDragOverGroup(null)
                }}
              >
                <span className="min-w-0 flex-1 break-words leading-snug">{group}</span>
                <svg
                  viewBox="0 0 24 24"
                  className={`h-3 w-3 flex-shrink-0 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {isAdmin && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setGroupToEdit(group)
                      setEditGroupDialogOpen(true)
                    }}
                    className="text-slate-500 hover:text-blue-600 p-1"
                    title="Edit group"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setGroupToDelete(group)
                      setDeleteGroupDialogOpen(true)
                    }}
                    className="text-slate-500 hover:text-red-600 p-1"
                    title="Delete group"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <div className="mt-2 ml-3 border-l border-slate-100 pl-3 space-y-1">
                {groupPosts.length > 0 ? groupPosts.map(post => renderPost(post, group)) : (
                  <p className="text-xs text-slate-500 italic">No posts in this group</p>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Ungrouped */}
      {ungrouped.length > 0 && (
        <div
          className="mb-6"
          onDragOver={(e) => {
            if (!isAdmin) return
            e.preventDefault()
          }}
          onDrop={(e) => {
            if (!isAdmin) return
            e.preventDefault()
            if (draggedPostId) {
              void movePostBetweenGroups(UNGROUPED_KEY)
            }
          }}
        >
          <div className="space-y-1">
            {orderPosts(ungrouped, UNGROUPED_KEY).map(post => renderPost(post, UNGROUPED_KEY))}
          </div>
        </div>
      )}

      {searchQuery && visibleGroups.length === 0 && ungrouped.length === 0 && (
        <p className="text-xs text-slate-500 italic">No posts found</p>
      )}
    </div>
  )
}
