import { supabaseServer } from '@/lib/supabase-server'
import Link from 'next/link'
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import CodeBlock from '@/components/CodeBlock'
import VideoPlayer from '@/components/VideoPlayer'
import { getR2VideoUrl, inferPostDateFromMarkdown } from '@/lib/r2-utils'

function isR2VideoKey(id: string): boolean {
  return id ? id.startsWith('videos/') : false
}

export default async function PostPage(props: any) {
  const { id } = await props.params
  const searchParams = await props.searchParams
  const contextGroup = typeof searchParams?.group === 'string' ? searchParams.group.trim() : ''

  const { data: post, error } = await supabaseServer
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !post) {
    return <div className="p-8">Post not found</div>
  }

  let markdown = ''
  if (post.content_path && typeof post.content_path === 'string' && post.content_path.trim().startsWith('posts/')) {
    const { data } = await supabaseServer.storage
      .from('markdown-files')
      .download(post.content_path)
    if (data) markdown = await data.text()
  } else if (post.content_path) {
    markdown = String(post.content_path)
  }

  const markerVideoIdMatch = markdown.match(/<!--\s*VIDEO_ID:([\s\S]*?)\s*-->/i)
  const markerVideoTitleMatch = markdown.match(/<!--\s*VIDEO_TITLE:([\s\S]*?)\s*-->/i)
  const markerVideoId = markerVideoIdMatch?.[1]?.trim() ?? null
  const markerVideoTitle = (markerVideoTitleMatch?.[1] || 'Uploaded Video').trim()
  const postDate = post.created_at ?? inferPostDateFromMarkdown(typeof post.content_path === 'string' ? post.content_path : '')
  const breadcrumbGroup = contextGroup || (typeof post.group_name === 'string' ? post.group_name : '')
  const allPostsHref = breadcrumbGroup
    ? `/posts?group=${encodeURIComponent(breadcrumbGroup)}`
    : '/posts'
  const visibleMarkdown = markdown
    .replace(/\n?<!--\s*VIDEO_ID:[\s\S]*?-->/gi, '')
    .replace(/\n?<!--\s*VIDEO_TITLE:[\s\S]*?-->/gi, '')
    .trim()

  return (
    <main className="flex-1 bg-slate-50 text-slate-900">
      {/* Breadcrumb Navigation */}
      <nav className="bg-white border-b border-slate-200 px-8 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-2 text-sm">
          <Link href={allPostsHref} className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors">
            All
          </Link>
          <span className="text-slate-400">/</span>
          {breadcrumbGroup && (
            <>
              <Link 
                href={`/posts?group=${encodeURIComponent(breadcrumbGroup)}`} 
                className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors truncate"
              >
                {breadcrumbGroup}
              </Link>
              <span className="text-slate-400">/</span>
            </>
          )}
          <span className="text-slate-600 truncate">{post.title}</span>
        </div>
      </nav>

      {/* Sticky Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/90 border-b border-slate-200 px-8 h-16 flex items-center">
        <h1 className="text-lg font-semibold truncate max-w-xl">{post.title}</h1>
      </header>

      <div className="p-8 max-w-5xl mx-auto w-full overflow-hidden">
        {/* Metadata Badges */}
        <div className="flex items-center gap-4 mb-8 text-xs">
          <div className="flex items-center gap-2 group">
            <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold shadow-lg group-hover:scale-110 transition-transform uppercase">
              {(post.author || 'Ikmal Najmi').split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
            </div>
            <span className="text-slate-700">{post.author || 'Ikmal Najmi'}</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-slate-300" />
          <div className="flex items-center gap-1.5 text-slate-600">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {postDate ? new Date(postDate).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
          </div>
          <div className="h-1 w-1 rounded-full bg-slate-300" />
          <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-tight text-[10px]">
            {post.tag || 'New'}
          </div>
        </div>

        <article className="pt-4 overflow-x-hidden" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', width: '100%' }}>
          {markerVideoId && isR2VideoKey(markerVideoId) && (
            <div className="w-full my-10">
              <VideoPlayer videoUrl={getR2VideoUrl(markerVideoId)} />
            </div>
          )}

          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
              // Use our custom CodeBlock component
              code({ node, inline, className, children, ...props }: any) {
                if (inline) return <code className="px-1.5 py-0.5 rounded bg-slate-100 text-blue-700" style={{ wordBreak: 'break-all', wordWrap: 'break-word' }} {...props}>{children}</code>
                return <CodeBlock className={className}>{children}</CodeBlock>
              },
              h2: ({ children }) => <h2 className="text-xl font-bold mt-12 mb-6 border-b border-slate-200 pb-2">{children}</h2>,
              p: ({ node, children }) => {
                return <p className="leading-relaxed text-slate-700 mb-6 last:mb-0" style={{ wordBreak: 'break-word', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{children}</p>
              },
              a: ({ href, children, ...props }) => {
                if (!href) return <a {...props}>{children}</a>
                return <a href={href} target="_blank" rel="noreferrer noopener" className="text-indigo-400 hover:text-indigo-300 underline" {...props}>{children}</a>
              },
            }}
          >
            {visibleMarkdown}
          </ReactMarkdown>
        </article>
      </div>
    </main>
  )
}
