"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    // Admin functionality is now integrated into /docs
    router.replace('/docs')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-5 w-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )
}

