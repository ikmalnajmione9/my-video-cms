"use client"

import Link from 'next/link'
import { useState } from 'react'
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

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur px-3 sm:px-4">
        <div className="h-14 flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(prev => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100"
            aria-label="Toggle sidebar"
            aria-expanded={sidebarOpen}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
          </button>

          <Link
            href="/"
            className="text-sm sm:text-[15px] font-bold tracking-tight text-slate-900 hover:text-slate-700 transition-colors"
          >
            Net7 Product Guide Hub
          </Link>

          <div className="ml-auto">
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
          <aside className="fixed top-14 left-0 bottom-0 z-50 w-80 max-w-[88vw] border-r border-slate-200 bg-white overflow-hidden shadow-2xl">
            <DocsSidebar posts={posts} basePath="/user-guide-v2" onClose={() => setSidebarOpen(false)} />
          </aside>
        </>
      )}

      <div className="pb-4 pt-[4.5rem]">
        <main className="w-full rounded-2xl border border-slate-200 bg-white min-w-0">
          {children}
        </main>
      </div>
    </>
  )
}
