"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase-client'

type Post = {
  id: string | number
  title: string
  tag?: string
  author?: string
  group_name?: string
  created_at?: string
  content_path?: string
}

interface ViewerContextType {
  isLoading: boolean
  posts: Post[]
  groups: {name: string, post_count: number}[]
  refreshPosts: () => Promise<void>
  refreshGroups: () => Promise<void>
}

const ViewerContext = createContext<ViewerContextType | undefined>(undefined)

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [posts, setPosts] = useState<Post[]>([])
  const [groups, setGroups] = useState<{name: string, post_count: number}[]>([])

  useEffect(() => {
    // Viewer doesn't need auth check, just load data
    const loadData = async () => {
      try {
        await Promise.all([refreshPosts(), refreshGroups()])
      } catch (error) {
        console.error('Failed to load viewer data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
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

  const value: ViewerContextType = {
    isLoading,
    posts,
    groups,
    refreshPosts,
    refreshGroups,
  }

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>
}

export function useViewer() {
  const context = useContext(ViewerContext)
  if (context === undefined) {
    throw new Error('useViewer must be used within a ViewerProvider')
  }
  return context
}
