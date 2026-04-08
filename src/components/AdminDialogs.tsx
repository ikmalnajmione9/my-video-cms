"use client"

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAdmin } from '@/contexts/AdminContext'
import dynamic from 'next/dynamic'

// Dynamically import the heavy components
const UploadDialog = dynamic(() => import('@/app/posts/UploadDialog'), {
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
})

const GroupDialog = dynamic(() => import('@/components/GroupDialog'), {
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
})

export default function AdminDialogs() {
  const {
    isAdmin,
    uploadDialogOpen,
    setUploadDialogOpen,
    editingPost,
    setEditingPost,
    groupDialogOpen,
    setGroupDialogOpen,
    selectedPostForGroup,
    setSelectedPostForGroup,
    createGroupDialogOpen,
    setCreateGroupDialogOpen,
    deleteGroupDialogOpen,
    setDeleteGroupDialogOpen,
    groupToDelete,
    setGroupToDelete,
    editGroupDialogOpen,
    setEditGroupDialogOpen,
    groupToEdit,
    setGroupToEdit,
    removePostDialogOpen,
    setRemovePostDialogOpen,
    postToRemove,
    setPostToRemove,
    deletePostDialogOpen,
    setDeletePostDialogOpen,
    postToDelete,
    setPostToDelete,
    posts,
    groups,
    refreshPosts,
    refreshGroups
  } = useAdmin()

  const router = useRouter()
  const pathname = usePathname()

  const [newGroupName, setNewGroupName] = useState('')
  const [editGroupName, setEditGroupName] = useState('')
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [isEditingGroup, setIsEditingGroup] = useState(false)
  const [groupMessage, setGroupMessage] = useState('')

  // Reset form states when dialogs close
  useEffect(() => {
    if (!createGroupDialogOpen) {
      setNewGroupName('')
      setGroupMessage('')
      setIsCreatingGroup(false)
    }
  }, [createGroupDialogOpen])

  useEffect(() => {
    if (editGroupDialogOpen && groupToEdit) {
      setEditGroupName(groupToEdit)
    } else {
      setEditGroupName('')
      setGroupMessage('')
      setIsEditingGroup(false)
    }
  }, [editGroupDialogOpen, groupToEdit])

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setGroupMessage('Group name cannot be empty')
      return
    }

    setIsCreatingGroup(true)
    setGroupMessage('')

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newGroupName.trim() }),
      })

      if (response.ok) {
        setNewGroupName('')
        await Promise.all([refreshPosts(), refreshGroups()])
      } else {
        const error = await response.json()
        setGroupMessage(error.message || 'Failed to create group')
      }
    } catch (error) {
      setGroupMessage('Failed to create group')
    } finally {
      setIsCreatingGroup(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return

    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(groupToDelete)}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setDeleteGroupDialogOpen(false)
        setGroupToDelete(null)
        await Promise.all([refreshPosts(), refreshGroups()])
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to delete group')
      }
    } catch (error) {
      alert('Failed to delete group')
    }
  }

  const handleEditGroup = async () => {
    if (!groupToEdit || !editGroupName.trim()) {
      setGroupMessage('Group name cannot be empty')
      return
    }

    if (editGroupName.trim() === groupToEdit) {
      setEditGroupDialogOpen(false)
      setGroupToEdit(null)
      return
    }

    setIsEditingGroup(true)
    setGroupMessage('')

    try {
      const response = await fetch(`/api/groups?name=${encodeURIComponent(groupToEdit)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newName: editGroupName.trim() }),
      })

      if (response.ok) {
        setEditGroupDialogOpen(false)
        setGroupToEdit(null)
        await Promise.all([refreshPosts(), refreshGroups()])
      } else {
        const error = await response.json()
        setGroupMessage(error.message || 'Failed to rename group')
      }
    } catch (error) {
      setGroupMessage('Failed to rename group')
    } finally {
      setIsEditingGroup(false)
    }
  }

  const handleRemovePostFromGroup = async () => {
    if (!postToRemove) return

    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(String(postToRemove.id))}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ group_name: null }),
      })

      if (response.ok) {
        setRemovePostDialogOpen(false)
        setPostToRemove(null)
        await Promise.all([refreshPosts(), refreshGroups()])
      } else {
        alert('Failed to remove post from group')
      }
    } catch (error) {
      alert('Failed to remove post from group')
    }
  }

  const handleDeletePost = async () => {
    if (!postToDelete) return

    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(String(postToDelete.id))}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setDeletePostDialogOpen(false)
        setPostToDelete(null)
        
        // If currently viewing the deleted post, redirect to the parent page
        const deletedPostId = String(postToDelete.id)
        const currentPath = pathname
        
        if (currentPath.includes(`/${deletedPostId}`) || currentPath.endsWith(deletedPostId)) {
          // Determine redirect path based on current location
          if (currentPath.includes('/posts/')) {
            router.push('/posts')
          } else if (currentPath.includes('/docs/')) {
            router.push('/docs')
          } else if (currentPath.includes('/viewer/')) {
            router.push('/viewer')
          } else {
            await Promise.all([refreshPosts(), refreshGroups()])
          }
        } else {
          await Promise.all([refreshPosts(), refreshGroups()])
        }
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to delete post')
      }
    } catch (error) {
      alert('Failed to delete post')
    }
  }

  if (!isAdmin) return null

  return (
    <>
      {/* Upload Dialog */}
      <UploadDialog
        isOpen={uploadDialogOpen}
        onClose={() => {
          setUploadDialogOpen(false)
          setEditingPost(null)
        }}
        initialTitle={editingPost?.title}
        initialMarkdown={editingPost?.content_path}
        initialTag={editingPost?.tag || 'new'}
        initialAuthor={editingPost?.author}
        initialGroupName={editingPost?.group_name ?? null}
        groupOptions={groups.map(group => group.name)}
        postId={editingPost?.id}
        onSaved={() => {
          setUploadDialogOpen(false)
          setEditingPost(null)
          void Promise.all([refreshPosts(), refreshGroups()])
          // Force page refresh to show updated server-rendered data
          setTimeout(() => {
            window.location.reload()
          }, 300)
        }}
      />

      {/* Group Dialog */}
      {selectedPostForGroup && (
        <GroupDialog
          isOpen={groupDialogOpen}
          onClose={() => {
            setGroupDialogOpen(false)
            setSelectedPostForGroup(null)
          }}
          post={selectedPostForGroup}
          allPosts={posts}
          groups={groups}
          onSaved={() => {
            setGroupDialogOpen(false)
            setSelectedPostForGroup(null)
            void Promise.all([refreshPosts(), refreshGroups()])
            // Force page refresh to show updated server-rendered data
            setTimeout(() => {
              window.location.reload()
            }, 300)
          }}
        />
      )}

      {/* Create Group Dialog */}
      {createGroupDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-900">Manage Groups</h3>
              <p className="mt-1 text-sm text-slate-600">Create a new group, or edit and delete existing groups.</p>
            </div>

            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Create Group</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  placeholder="Group name..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500/60 transition-colors"
                  autoFocus
                />
                <button
                  onClick={handleCreateGroup}
                  disabled={isCreatingGroup}
                  className="rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingGroup ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Existing Groups</label>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
                {groups.length > 0 ? (
                  [...groups]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((group) => (
                      <div key={group.name} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{group.name}</p>
                          <p className="text-xs text-slate-500">{group.post_count || 0} posts</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setCreateGroupDialogOpen(false)
                              setGroupToEdit(group.name)
                              setEditGroupDialogOpen(true)
                            }}
                            className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setCreateGroupDialogOpen(false)
                              setGroupToDelete(group.name)
                              setDeleteGroupDialogOpen(true)
                            }}
                            className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-slate-500">No groups found.</p>
                )}
              </div>
            </div>

            {groupMessage && (
              <p className="mt-3 text-sm text-red-400">{groupMessage}</p>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setCreateGroupDialogOpen(false)}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                disabled={isCreatingGroup}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Dialog */}
      {editGroupDialogOpen && groupToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <button
              onClick={() => {
                setEditGroupDialogOpen(false)
                setGroupToEdit(null)
              }}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close edit group dialog"
              disabled={isEditingGroup}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6 pr-10">
              <h3 className="text-lg font-semibold text-slate-900">Edit Group</h3>
              <p className="mt-1 text-sm text-slate-600">Rename the group or adjust the posts inside it.</p>
            </div>
            
            {/* Group Name Section */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Group Name</label>
              <input
                type="text"
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500/60 transition-colors"
                autoFocus
              />
            </div>

            {/* Posts Management Section */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Manage Posts</label>
              
              {/* Current posts in group */}
              <div className="mb-4">
                <p className="text-xs text-slate-600 mb-2">In this group:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {posts.filter(p => p.group_name === groupToEdit && !p.title?.startsWith('__GROUP_MARKER__')).map(post => (
                    <div key={post.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="text-sm font-medium text-slate-800 truncate">{post.title}</span>
                      <button
                        onClick={async () => {
                          await fetch(`/api/posts/${encodeURIComponent(String(post.id))}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ group_name: null })
                          })
                          refreshPosts()
                        }}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {posts.filter(p => p.group_name === groupToEdit && !p.title?.startsWith('__GROUP_MARKER__')).length === 0 && (
                    <p className="text-xs italic text-slate-500">No posts in this group</p>
                  )}
                </div>
              </div>

              {/* Posts not in group */}
              <div>
                <p className="mb-2 text-xs text-slate-600">Add posts:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {posts.filter(p => p.group_name !== groupToEdit && !p.title?.startsWith('__GROUP_MARKER__')).map(post => (
                    <div key={post.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <span className="text-sm text-slate-800 truncate">{post.title}</span>
                      <button
                        onClick={async () => {
                          await fetch(`/api/posts/${encodeURIComponent(String(post.id))}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ group_name: groupToEdit })
                          })
                          refreshPosts()
                        }}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                  {posts.filter(p => p.group_name !== groupToEdit && !p.title?.startsWith('__GROUP_MARKER__')).length === 0 && (
                    <p className="text-xs italic text-slate-500">All posts are in this group</p>
                  )}
                </div>
              </div>
            </div>
            
            {groupMessage && (
              <p className="mb-4 text-sm text-red-400">{groupMessage}</p>
            )}

            <div className="mb-4 border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">Delete this group permanently. All posts in it will become ungrouped.</p>
              <button
                onClick={() => {
                  if (!groupToEdit) return
                  setEditGroupDialogOpen(false)
                  setGroupToDelete(groupToEdit)
                  setDeleteGroupDialogOpen(true)
                }}
                className="mt-3 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                disabled={isEditingGroup}
              >
                Delete Group
              </button>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setEditGroupDialogOpen(false)
                  setCreateGroupDialogOpen(true)
                  setGroupMessage('')
                }}
                className="mr-auto rounded-lg px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                disabled={isEditingGroup}
              >
                Back
              </button>
              <button
                onClick={handleEditGroup}
                disabled={isEditingGroup}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditingGroup ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Confirmation Dialog */}
      {deleteGroupDialogOpen && groupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-white p-6 shadow-[0_0_40px_-10px_rgba(220,38,38,0.25)]">
            <div className="mb-4 flex items-center gap-3 text-red-400">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-bold">Delete Group?</h3>
            </div>
            <p className="text-sm text-slate-700 mb-6 leading-relaxed">
              Are you sure you want to permanently delete the group <strong className="text-slate-900">"{groupToDelete}"</strong>? 
              All posts in this group will become ungrouped.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDeleteGroupDialogOpen(false)
                  setGroupToDelete(null)
                }}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGroup}
                className="rounded-xl bg-red-600/90 border border-red-500 hover:bg-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition-all hover:-translate-y-0.5"
              >
                Yes, Delete Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Post from Group Confirmation Dialog */}
      {removePostDialogOpen && postToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-amber-200 bg-white p-6 shadow-[0_0_40px_-10px_rgba(245,158,11,0.25)]">
            <div className="mb-4 flex items-center gap-3 text-amber-400">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-bold">Remove from Group?</h3>
            </div>
            <p className="text-sm text-slate-700 mb-6 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-900">"{postToRemove.title}"</strong> from its group?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setRemovePostDialogOpen(false)
                  setPostToRemove(null)
                }}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemovePostFromGroup}
                className="rounded-xl bg-amber-600/90 border border-amber-500 hover:bg-amber-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-600/20 transition-all hover:-translate-y-0.5"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Post Confirmation Dialog */}
      {deletePostDialogOpen && postToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-white p-6 shadow-[0_0_40px_-10px_rgba(220,38,38,0.25)]">
            <div className="mb-4 flex items-center gap-3 text-red-400">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-bold">Delete Post?</h3>
            </div>
            <p className="text-sm text-slate-700 mb-6 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-900">"{postToDelete.title}"</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDeletePostDialogOpen(false)
                  setPostToDelete(null)
                }}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePost}
                className="rounded-xl bg-red-600/90 border border-red-500 hover:bg-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition-all hover:-translate-y-0.5"
              >
                Yes, Delete Post
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
