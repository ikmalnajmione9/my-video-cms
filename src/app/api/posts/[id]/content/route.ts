import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params
  if (!postId) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
  }

  // First get the post to find the content path
  const { data: post, error } = await supabaseServer
    .from('posts')
    .select('content_path')
    .eq('id', postId)
    .single()

  if (error || !post) {
    return NextResponse.json({ error: error?.message || 'Post not found' }, { status: 404 })
  }

  let content = ''
  
  if (post.content_path && typeof post.content_path === 'string' && post.content_path.trim().startsWith('posts/')) {
    try {
      const { data } = await supabaseServer.storage
        .from('markdown-files')
        .download(post.content_path)
      if (data) {
        content = await data.text()
      }
    } catch (storageError) {
      console.error('Failed to fetch content from storage:', storageError)
      return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
    }
  } else if (post.content_path) {
    content = String(post.content_path)
  }

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
