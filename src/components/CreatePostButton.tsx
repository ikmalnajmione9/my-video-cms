"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import UploadDialog from '@/app/posts/UploadDialog'
import { supabase } from '@/lib/supabase-client'
import { useViewer } from '@/contexts/ViewerContext'

export default function CreatePostButton() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [session, setSession] = useState<any>(null)
  const router = useRouter()
  const { refreshPosts, refreshGroups, groups } = useViewer()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (!session) return null

  return (
    <>
      <UploadDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialTag="new"
        groupOptions={groups.map(group => group.name)}
        onSaved={() => {
          setDialogOpen(false)
          // Refresh viewer context data
          void Promise.all([refreshPosts(), refreshGroups()])
          // Refresh page to reflect server-side changes
          router.refresh()
        }}
      />
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl h-11 text-xs font-bold text-white bg-blue-600 shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Upload New Video
      </button>
    </>
  )
}
