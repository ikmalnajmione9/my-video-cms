"use client"

import { useState, useEffect, useMemo } from 'react'

type Post = { id: string | number; title: string; group_name?: string; tag?: string }

interface GroupDialogProps {
  isOpen: boolean
  onClose: () => void
  post?: Post
  allPosts: Post[]
  groups?: { name: string; post_count: number }[]
  onSaved: () => void
}

export default function GroupDialog({ isOpen, onClose, post, allPosts, groups = [], onSaved }: GroupDialogProps) {
  const [activeTab, setActiveTab] = useState<'add' | 'create'>('add')
  const [searchGroup, setSearchGroup] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [groupToRemove, setGroupToRemove] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setActiveTab('add')
      setSearchGroup('')
      setNewGroupName('')
      setMessage('')
      setGroupToRemove(null)
    }
  }, [isOpen])

  // Use provided groups if available, otherwise extract from allPosts
  const groupStats = useMemo(() => {
    if (groups.length > 0) {
      return groups
    }
    // Fallback to extracting from posts if groups not provided
    const stats: Record<string, number> = {}
    allPosts.forEach(p => {
      if (p.group_name && !p.title?.startsWith('__GROUP_MARKER__')) {
        stats[p.group_name] = (stats[p.group_name] || 0) + 1
      }
    })
    return Object.entries(stats).map(([name, count]) => ({ name, count }))
  }, [groups, allPosts])

  const filteredGroups = groupStats.filter(g => !searchGroup || g.name.toLowerCase().includes(searchGroup.toLowerCase()))

  const handleUpdateGroup = async (groupName: string) => {
    if (!post) return
    setIsSaving(true)
    setMessage('')
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(String(post.id))}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_name: groupName })
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData?.error || 'Failed to update group')
      }
      onSaved()
      onClose()
    } catch (error: any) {
      console.error('Group save error:', error)
      setMessage(error.message || 'Failed to assign group')
      setIsSaving(false)
    }
  }

  const handleCreate = async () => {
    if (!newGroupName.trim()) {
      setMessage('Please enter a group title')
      return
    }
    await handleUpdateGroup(newGroupName.trim())
  }

  if (!isOpen || !post) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-md p-4 transition-all">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl flex flex-col overflow-hidden max-h-[85vh] glass-card">
        {/* Header Tabs */}
        <div className="px-6 pt-6 pb-0 border-b border-slate-200 flex items-center justify-between relative">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveTab('add')}
              className={`text-xl font-bold pb-3 border-b-2 transition-colors duration-200 ${activeTab === 'add' ? 'border-blue-500 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              Add to group
            </button>
            <button 
              onClick={() => setActiveTab('create')}
              className={`text-xl font-bold pb-3 border-b-2 transition-colors duration-200 ${activeTab === 'create' ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              Create a group
            </button>
          </div>
          <button
            onClick={onClose}
            className="absolute right-6 top-6 h-8 w-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {message && (
          <div className="px-6 pt-4">
            <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-md border border-red-400/20">{message}</p>
          </div>
        )}

        {/* Dynamic Content */}
        {activeTab === 'add' ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-6 pb-4">
              <input
                value={searchGroup}
                onChange={e => setSearchGroup(e.target.value)}
                placeholder="Search groups..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500/50 transition-all font-medium shadow-inner"
                autoFocus
              />
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1 custom-scrollbar">
              {filteredGroups.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm font-medium">
                  No groups found
                </div>
              ) : (
                filteredGroups.map(group => {
                  const isAdded = post.group_name === group.name
                  return (
                    <div key={group.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 transition-colors group-hover border border-transparent hover:border-slate-200">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="flex flex-col truncate">
                          <span className="text-sm font-bold text-slate-900 truncate">{group.name}</span>
                          <span className="text-xs font-medium text-slate-600">{(group as any).count || (group as any).post_count} {((group as any).count || (group as any).post_count) === 1 ? 'post' : 'posts'}</span>
                        </div>
                      </div>
                      
                      <div className="shrink-0 ml-4 pl-2">
                        {isAdded ? (
                          <button
                            onClick={() => setGroupToRemove(group.name)}
                            disabled={isSaving}
                            className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all disabled:opacity-50"
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateGroup(group.name)}
                            disabled={isSaving}
                            className="rounded-lg border border-blue-500/50 bg-blue-500/20 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-500/40 hover:text-blue-100 transition-all disabled:opacity-50"
                          >
                            Add to Group
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 pb-8 flex flex-col flex-1 h-[250px]">
            <label className="block text-sm font-bold text-slate-700 mb-2">Group title <span className="text-red-500">*</span></label>
            <input
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500/50 transition-all font-medium shadow-inner"
              placeholder="E.g. Engineering Videos"
              autoFocus
            />
            
            <div className="flex items-center justify-end mt-auto pt-6">
              <button
                onClick={handleCreate}
                disabled={isSaving || !newGroupName.trim()}
                className="rounded-xl bg-blue-600 px-8 py-3 font-bold text-sm text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:grayscale"
              >
                {isSaving ? 'Saving...' : 'Create & Assign'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full-screen Notifier for Removal (Foolproof) */}
      {groupToRemove && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/30 backdrop-blur-xl p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl glass-card text-center scale-in group">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Remove from Group?</h3>
            <p className="text-slate-600 text-sm mb-8">
              Are you sure you want to remove <span className="text-slate-900 font-semibold">"{post.title}"</span> from the <span className="text-indigo-600 font-semibold">{groupToRemove}</span> group?
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => { handleUpdateGroup(''); setGroupToRemove(null); }}
                disabled={isSaving}
                className="w-full h-12 rounded-xl bg-red-600 text-sm font-bold text-white shadow-lg shadow-red-500/20 hover:bg-red-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSaving ? 'Removing...' : 'Yes, Remove It'}
              </button>
              <button
                onClick={() => setGroupToRemove(null)}
                className="w-full h-12 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all bg-slate-100 rounded-xl border border-slate-200 hover:bg-slate-200"
              >
                No, Keep It
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.28);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 0.4);
        }
      `}</style>
    </div>
  )
}
