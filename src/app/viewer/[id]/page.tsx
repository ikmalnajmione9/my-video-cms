"use client"

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useViewer } from '@/contexts/ViewerContext'
import ViewerPostSidebar from '@/components/ViewerPostSidebar'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import CodeBlock from '@/components/CodeBlock'
import VideoPlayer from '@/components/VideoPlayer'
import { inferPostDateFromMarkdown } from '@/lib/r2-utils'

function extractYouTubeVideoId(url: string) {
  if (!url) return null
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:(?:youtube\.com\/watch\?v=)|(?:youtube\.com\/embed\/)|(?:youtu\.be\/))([A-Za-z0-9_-]{11})/i
  const match = url.match(regex)
  return match?.[1] ?? null
}

function isR2VideoKey(id: string): boolean {
  return id ? id.startsWith('videos/') : false
}

export default function ViewerPostPage() {
  const params = useParams()
  const { id } = params
  const { posts, isLoading } = useViewer()
  const [post, setPost] = useState<any>(null)
  const [markdown, setMarkdown] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return

      try {
        // Find post in local state first
        const localPost = posts.find(p => String(p.id) === String(id))
        if (localPost) {
          setPost(localPost)
          
          // Fetch full post data including content
          const res = await fetch(`/api/posts/${encodeURIComponent(String(id))}`)
          if (res.ok) {
            const data = await res.json()
            setPost(data)
            
            // Fetch markdown content
            let content = ''
            if (data.content_path && typeof data.content_path === 'string' && data.content_path.trim().startsWith('posts/')) {
              // For Supabase storage files, we'd need to fetch from the API
              const contentRes = await fetch(`/api/posts/${encodeURIComponent(String(id))}/content`)
              if (contentRes.ok) {
                content = await contentRes.text()
              }
            } else if (data.content_path) {
              content = String(data.content_path)
            }
            setMarkdown(content)
          }
        }
      } catch (error) {
        console.error('Failed to fetch post:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!isLoading) {
      fetchPost()
    }
  }, [id, posts, isLoading])

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="h-5 w-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="h-5 w-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <ViewerPostSidebar posts={posts} />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Post not found</h1>
            <p className="text-slate-600">The post you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    )
  }

  const markerVideoIdMatch = markdown.match(/<!--\s*VIDEO_ID:([\s\S]*?)\s*-->/i)
  const markerVideoTitleMatch = markdown.match(/<!--\s*VIDEO_TITLE:([\s\S]*?)\s*-->/i)
  const markerVideoId = markerVideoIdMatch?.[1]?.trim() ?? null
  const markerVideoTitle = (markerVideoTitleMatch?.[1] || 'Uploaded Video').trim()
  const postDate = post.created_at ?? inferPostDateFromMarkdown(typeof post.content_path === 'string' ? post.content_path : '')
  const visibleMarkdown = markdown
    .replace(/\n?<!--\s*VIDEO_ID:[\s\S]*?-->/gi, '')
    .replace(/\n?<!--\s*VIDEO_TITLE:[\s\S]*?-->/gi, '')
    .trim()

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="flex-1 overflow-hidden">
          <ViewerPostSidebar posts={posts} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 bg-slate-50 text-slate-900">
          {/* Sticky Header */}
          <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/90 border-b border-slate-200 px-8 h-16 flex items-center">
            <h1 className="text-lg font-semibold truncate max-w-xl">{post.title}</h1>
          </header>

          <div className="p-8 max-w-5xl mx-auto w-full overflow-hidden">
            {/* Metadata Badges */}
            <div className="flex items-center gap-4 mb-8 text-xs">
              <div className="flex items-center gap-2 group">
                <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold shadow-lg group-hover:scale-110 transition-transform uppercase">
                  {(post.author || 'Unknown').split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                </div>
                <span className="text-slate-700">{post.author || 'Unknown'}</span>
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
              {markerVideoId && (
                isR2VideoKey(markerVideoId) ? (
                  <div className="w-full my-10">
                    <VideoPlayer videoUrl={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${markerVideoId}`} />
                  </div>
                ) : (
                  <iframe
                    title={markerVideoTitle || 'Uploaded Video'}
                    src={`https://www.youtube.com/embed/${markerVideoId}?rel=0&modestbranding=1&enablejsapi=1`}
                    className="w-full my-10 rounded-2xl overflow-hidden shadow-2xl"
                    style={{ aspectRatio: '16 / 9' }}
                    allowFullScreen
                  />
                )
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
                    const hastNode = node as any
                    const containsVideo = hastNode?.children?.some((n: any) => {
                      if (n.type === 'element' && n.tagName === 'a') return extractYouTubeVideoId(n.properties?.href)
                      if (n.type === 'text') return extractYouTubeVideoId(n.value)
                      return false
                    })

                    if (containsVideo) {
                      return (
                        <div className="mb-6 last:mb-0">
                          {React.Children.map(children, (child) => {
                            // If child is a string and is a YouTube URL, render player
                            if (typeof child === 'string') {
                              const vId = extractYouTubeVideoId(child)
                              if (vId) {
                                return (
                                  <iframe
                                    src={`https://www.youtube.com/embed/${vId}?rel=0&modestbranding=1&enablejsapi=1`}
                                    className="w-full my-10 rounded-2xl overflow-hidden shadow-2xl"
                                    style={{ aspectRatio: '16 / 9' }}
                                    allowFullScreen
                                  />
                                )
                              }
                            }
                            return child
                          })}
                        </div>
                      )
                    }

                    return <p className="leading-relaxed text-slate-700 mb-6 last:mb-0" style={{ wordBreak: 'break-word', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{children}</p>
                  },
                  a: ({ href, children, ...props }) => {
                    if (!href) return <a {...props}>{children}</a>
                    const videoId = extractYouTubeVideoId(href)
                    if (videoId) {
                      return (
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`}
                          className="w-full my-10 rounded-2xl overflow-hidden shadow-2xl"
                          style={{ aspectRatio: '16 / 9' }}
                          allowFullScreen
                        />
                      )
                    }
                    return <a href={href} target="_blank" rel="noreferrer noopener" className="text-indigo-400 hover:text-indigo-300 underline" {...props}>{children}</a>
                  },
                }}
              >
                {visibleMarkdown}
              </ReactMarkdown>
            </article>
          </div>
        </main>
      </div>
    </div>
  )
}
