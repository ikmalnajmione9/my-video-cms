import { supabaseServer } from '@/lib/supabase-server'
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import CodeBlock from '@/components/CodeBlock'
import Link from 'next/link'
import DocAdminControls from '@/components/DocAdminControls'
import VideoPlayer from '@/components/VideoPlayer'
import { getR2VideoUrl, inferPostDateFromMarkdown } from '@/lib/r2-utils'

function isR2VideoKey(id: string): boolean {
  return id ? id.startsWith('videos/') : false
}

type Heading = { level: number; text: string; slug: string }

function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = []
  const lines = markdown.split('\n')
  for (const line of lines) {
    const m = line.match(/^(#{1,3})\s+(.+)/)
    if (m) {
      const text = m[2].trim()
      const slug = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
      headings.push({ level: m[1].length, text, slug })
    }
  }
  return headings
}

const TAG_COLORS: Record<string, string> = {
  tested:      'bg-emerald-100 text-emerald-700 border-emerald-300 border',
  released:    'bg-indigo-100 text-indigo-700 border-indigo-300 border',
  'in-review': 'bg-amber-100 text-amber-700 border-amber-300 border',
  new:         'bg-sky-100 text-sky-700 border-sky-300 border',
}

export default async function UserGuideV2PostPage(props: any) {
  const basePath = '/user-guide-v2'
  const { id } = await props.params

  const { data: post, error } = await supabaseServer
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !post) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-slate-500">
        <p className="text-lg font-semibold text-slate-400 mb-2">Video not found</p>
        <Link href={basePath} className="text-sm text-blue-400 hover:underline">← Back to all videos</Link>
      </div>
    )
  }

  let markdown = ''
  if (post.content_path && typeof post.content_path === 'string' && post.content_path.trim().startsWith('posts/')) {
    const { data } = await supabaseServer.storage.from('markdown-files').download(post.content_path)
    if (data) markdown = await data.text()
  } else if (post.content_path) {
    markdown = String(post.content_path)
  }

  const markerVideoIdMatch = markdown.match(/<!--\s*VIDEO_ID:([\s\S]*?)\s*-->/i)
  const markerVideoTitleMatch = markdown.match(/<!--\s*VIDEO_TITLE:([\s\S]*?)\s*-->/i)
  const markerVideoId = markerVideoIdMatch?.[1]?.trim() ?? null
  const markerVideoTitle = (markerVideoTitleMatch?.[1] || 'Uploaded Video').trim()
  const visibleMarkdown = markdown
    .replace(/\n?<!--\s*VIDEO_ID:[\s\S]*?-->/gi, '')
    .replace(/\n?<!--\s*VIDEO_TITLE:[\s\S]*?-->/gi, '')
    .trim()

  const headings = extractHeadings(visibleMarkdown)

  const videoDocs: { id: string; title: string }[] = []
  if (markerVideoId) {
    videoDocs.push({ id: markerVideoId, title: markerVideoTitle || 'Uploaded Video' })
  }
  const allVideoDocs: any[] = []
  const attachmentVideoDocs: any[] = markerVideoId && isR2VideoKey(markerVideoId) ? [] : []

  const normalizedTag = (post.tag || 'new').toLowerCase()
  const tagClass = TAG_COLORS[normalizedTag] ?? TAG_COLORS.new
  const postDate = post.created_at ?? inferPostDateFromMarkdown(typeof post.content_path === 'string' ? post.content_path : '')

  return (
    <div className="flex">
      <div className="flex-1 max-w-4xl px-6 py-12">
        <div className="pr-8">
          <nav className="mb-6 flex items-center gap-2 text-xs text-slate-600">
            <Link href={basePath} className="hover:text-slate-700 transition-colors">All</Link>
            {post.group_name && (
              <>
                <span>/</span>
                <span className="text-slate-600">{post.group_name}</span>
              </>
            )}
            <span>/</span>
            <span className="text-slate-700 truncate max-w-[200px]">{post.title}</span>
          </nav>

          <h1 className="text-3xl font-extrabold text-slate-900 mb-4 leading-tight">{post.title}</h1>

          <div className="flex flex-wrap items-center gap-3 mb-8 pb-6 border-slate-300 border-b text-slate-600 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center text-[9px] font-bold text-white uppercase">
                {(post.author || 'A').split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
              </div>
              <span className="text-slate-700">{post.author || 'Mandrill Tech'}</span>
            </div>
            <span>·</span>
            <span>{postDate ? new Date(postDate).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</span>
            <span className={`border px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${tagClass}`}>
              {normalizedTag.replace('-', ' ')}
            </span>
            <div className="ml-auto">
              <DocAdminControls post={post} />
            </div>
          </div>

          <article className="prose prose-slate max-w-none prose-headings:scroll-mt-24">
            {markerVideoId && isR2VideoKey(markerVideoId) && (
              <div className="w-full my-10">
                <VideoPlayer videoUrl={getR2VideoUrl(markerVideoId)} />
              </div>
            )}

            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  if (inline) return <code className="bg-slate-100 text-blue-600 px-1.5 py-0.5 rounded text-[0.85em]" {...props}>{children}</code>
                  return <CodeBlock className={className}>{children}</CodeBlock>
                },
                h2: ({ children }) => {
                  const text = String(children)
                  const slug = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
                  return <h2 id={slug} className="text-xl font-bold mt-10 mb-4 border-slate-300 border-b pb-2">{children}</h2>
                },
                h3: ({ children }) => {
                  const text = String(children)
                  const slug = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
                  return <h3 id={slug} className="text-lg font-semibold mt-8 mb-3">{children}</h3>
                },
                p: ({ node, children }) => {
                  return <p className="leading-relaxed text-slate-700 mb-5">{children}</p>
                },
                a: ({ href, children, ...props }) => {
                  if (!href) return <a {...props}>{children}</a>
                  return <a href={href} target="_blank" rel="noreferrer noopener" className="text-blue-600 hover:text-blue-700 underline underline-offset-2" {...props}>{children}</a>
                },
              }}
            >
              {visibleMarkdown}
            </ReactMarkdown>
          </article>

          <div className="mt-12 pt-6 border-slate-300 border-t flex justify-between">
            <Link href={basePath} className="text-xs text-slate-600 hover:text-slate-700 transition-colors flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 19l-7-7 7-7" /></svg>
              Back to all videos
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
