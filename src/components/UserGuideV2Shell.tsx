"use client"

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import DocsSidebar from '@/components/DocsSidebar'
import TopRightAuthButton from '@/components/TopRightAuthButton'

type Post = {
  id: string | number
  title: string
  tag?: string
  group_name?: string
}

export default function UserGuideV2Shell({
  posts,
  children,
}: {
  posts: Post[]
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const [currentTitle, setCurrentTitle] = useState('Net7 Product Guide Hub')

  // Get current page title from posts
  useEffect(() => {
    const currentId = pathname.split('/').pop()
    const post = posts.find(p => String(p.id) === currentId)
    if (post) {
      setCurrentTitle(post.title)
    } else {
      setCurrentTitle('Net7 Product Guide Hub')
    }
  }, [pathname, posts])

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(prev => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100"
              aria-label="Toggle sidebar"
              aria-expanded={sidebarOpen}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </svg>
            </button>

            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {currentTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <TopRightAuthButton />
          </div>
        </div>
      </header>

      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed top-16 left-0 bottom-0 z-50 w-64 border-r border-slate-200 bg-white overflow-hidden shadow-2xl">
            <DocsSidebar posts={posts} basePath="/user-guide-v2" onClose={() => setSidebarOpen(false)} />
          </aside>
        </>
      )}

      <div className="pt-20 pb-4 px-4 sm:px-6 min-h-screen">
        <main className="w-full rounded-xl border border-slate-200 bg-white min-w-0">
          {children}
        </main>
      </div>
    </>
  )
}
