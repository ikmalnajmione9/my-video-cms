"use client"

import { useAdmin } from '@/contexts/AdminContext'

type Post = {
  id: string | number
  title: string
  tag?: string
  author?: string
  group_name?: string
  content_path?: string
}

interface DocAdminControlsProps {
  post: Post
}

export default function DocAdminControls({ post }: DocAdminControlsProps) {
  const { 
    isAdmin, 
    setEditingPost, 
    setUploadDialogOpen,
    setDeletePostDialogOpen,
    setPostToDelete
  } = useAdmin()

  if (!isAdmin) return null

  const handleEdit = async () => {
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

  const handleDelete = () => {
    setPostToDelete(post)
    setDeletePostDialogOpen(true)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleEdit}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-colors text-xs font-semibold"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Edit
      </button>
      <button
        onClick={handleDelete}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 transition-colors text-xs font-semibold"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" />
        </svg>
        Delete
      </button>
    </div>
  )
}
