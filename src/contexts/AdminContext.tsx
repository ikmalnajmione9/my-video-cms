"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

type Post = {
  id: string | number
  title: string
  tag?: string
  author?: string
  group_name?: string
  created_at?: string
  content_path?: string
}

interface AdminContextType {
  isAdmin: boolean
  isLoading: boolean
  session: any
  posts: Post[]
  groups: {name: string, post_count: number}[]
  refreshPosts: () => Promise<void>
  refreshGroups: () => Promise<void>
  uploadDialogOpen: boolean
  setUploadDialogOpen: (open: boolean) => void
  editingPost: Post | null
  setEditingPost: (post: Post | null) => void
  groupDialogOpen: boolean
  setGroupDialogOpen: (open: boolean) => void
  selectedPostForGroup: Post | null
  setSelectedPostForGroup: (post: Post | null) => void
  createGroupDialogOpen: boolean
  setCreateGroupDialogOpen: (open: boolean) => void
  deleteGroupDialogOpen: boolean
  setDeleteGroupDialogOpen: (open: boolean) => void
  groupToDelete: string | null
  setGroupToDelete: (group: string | null) => void
  editGroupDialogOpen: boolean
  setEditGroupDialogOpen: (open: boolean) => void
  groupToEdit: string | null
  setGroupToEdit: (group: string | null) => void
  removePostDialogOpen: boolean
  setRemovePostDialogOpen: (open: boolean) => void
  postToRemove: Post | null
  setPostToRemove: (post: Post | null) => void
  deletePostDialogOpen: boolean
  setDeletePostDialogOpen: (open: boolean) => void
  postToDelete: Post | null
  setPostToDelete: (post: Post | null) => void
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [groups, setGroups] = useState<{name: string, post_count: number}[]>([])
  
  // Dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [selectedPostForGroup, setSelectedPostForGroup] = useState<Post | null>(null)
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false)
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null)
  const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false)
  const [groupToEdit, setGroupToEdit] = useState<string | null>(null)
  const [removePostDialogOpen, setRemovePostDialogOpen] = useState(false)
  const [postToRemove, setPostToRemove] = useState<Post | null>(null)
  const [deletePostDialogOpen, setDeletePostDialogOpen] = useState(false)
  const [postToDelete, setPostToDelete] = useState<Post | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 5000)
        )
        
        const authPromise = supabase.auth.getSession()
        
        const { data: { session } } = await Promise.race([authPromise, timeoutPromise]) as any
        
        // Any authenticated user is considered admin (no role-based system)
        setSession(session)
        setIsAdmin(!!session)
        setIsLoading(false)
      } catch (error) {
        console.error('Auth check failed or timed out:', error)
        setSession(null)
        setIsAdmin(false)
        setIsLoading(false)
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setIsAdmin(!!session)
      if (!session) {
        setSession(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const refreshPosts = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      const res = await fetch('/api/posts', {
        signal: controller.signal,
        cache: 'no-store',
      })
      clearTimeout(timeoutId)
      
      if (res.ok) {
        const data = await res.json()
        // Filter out system posts and marker posts
        const filteredData = (data || []).filter((p: Post) => 
          p.tag !== 'system' && 
          !p.title?.startsWith('__GROUP_MARKER__')
        )
        setPosts(filteredData)
      } else {
        console.error('Failed to refresh posts:', res.status)
        setPosts([])
      }
    } catch (error) {
      console.error('Failed to refresh posts:', error)
      setPosts([])
    }
  }

  const refreshGroups = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      const res = await fetch('/api/groups', {
        signal: controller.signal,
        cache: 'no-store',
      })
      clearTimeout(timeoutId)
      
      if (res.ok) {
        const data = await res.json()
        setGroups(data || [])
      } else {
        console.error('Failed to refresh groups:', res.status)
        setGroups([])
      }
    } catch (error) {
      console.error('Failed to refresh groups:', error)
      setGroups([])
    }
  }

  useEffect(() => {
    if (isAdmin) {
      refreshPosts()
      refreshGroups()
    }
  }, [isAdmin])

  const value: AdminContextType = {
    isAdmin,
    isLoading,
    session,
    posts,
    groups,
    refreshPosts,
    refreshGroups,
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
  }

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
