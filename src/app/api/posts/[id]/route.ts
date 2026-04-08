import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { extractR2VideoKeyFromMarkdown, deleteVideoFromR2 } from '@/lib/r2-utils'
import { inferPostDateFromMarkdown } from '@/lib/r2-utils'

function normalizePostDate(post: Record<string, any>) {
  const createdAt =
    post.created_at ??
    post.createdAt ??
    post.published_at ??
    post.publishedAt ??
    post.updated_at ??
    post.updatedAt ??
    post.inserted_at ??
    post.insertedAt ??
    post.date ??
    inferPostDateFromMarkdown(typeof post.content_path === 'string' ? post.content_path : '') ??
    null

  return {
    ...post,
    created_at: createdAt,
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params
  if (!postId) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
  }

  const { data: post, error } = await supabaseServer
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single()

  if (error || !post) {
    return NextResponse.json({ error: error?.message || 'Post not found' }, { status: 404 })
  }

  return NextResponse.json(normalizePostDate(post))
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params
  if (!postId) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
  }

  const body = await req.json()
  const requestedGroupChange = typeof body.group_name !== 'undefined'

  let previousGroupName: string | null = null
  if (requestedGroupChange) {
    const { data: currentPost, error: currentPostError } = await supabaseServer
      .from('posts')
      .select('group_name')
      .eq('id', postId)
      .single()

    if (currentPostError) {
      return NextResponse.json({ error: currentPostError.message }, { status: 500 })
    }

    previousGroupName = currentPost?.group_name ?? null
  }

  const updateData: any = {}
  if (typeof body.title === 'string') {
    if (!body.title.trim()) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
    updateData.title = body.title.trim()
  }
  const contentCandidate = typeof body.description === 'string' ? body.description : body.markdown
  if (typeof contentCandidate === 'string') {
    updateData.content_path = contentCandidate.trim()
  }
  if (typeof body.tag === 'string') updateData.tag = body.tag.trim() || 'new'
  if (typeof body.author === 'string') updateData.author = body.author.trim() || 'Ikmal Najmi'
  if (typeof body.group_name !== 'undefined') updateData.group_name = body.group_name === null ? null : (typeof body.group_name === 'string' ? body.group_name.trim() : body.group_name)

  let error: any = null
  
  const executeUpdate = async (data: any): Promise<any> => {
    const { error: dbError } = await supabaseServer
      .from('posts')
      .update(data)
      .eq('id', postId)
    
    if (dbError) {
      if (typeof dbError.message === 'string' && dbError.message.toLowerCase().includes('column') && dbError.message.toLowerCase().includes('not found')) {
        // Extract the missing column name if possible
        const match = dbError.message.match(/column "(.*?)"/i) || dbError.message.match(/'(.*?)' column/i)
        if (match && match[1]) {
          const missingCol = match[1]
          console.warn(`Column '${missingCol}' missing from database. Retrying without it.`)
          const { [missingCol]: _, ...remainingData } = data
          if (Object.keys(remainingData).length > 0) {
            return executeUpdate(remainingData)
          }
        }
      }
      return { error: dbError }
    }
    return { success: true }
  }

  const result = await executeUpdate(updateData)
  error = result.error

  if (error) {
    console.error('Database update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // In fallback mode (no groups table), keep empty source groups visible via marker posts.
  const nextGroupName = typeof updateData.group_name === 'string' ? updateData.group_name : null
  const movedBetweenGroups = requestedGroupChange && previousGroupName && previousGroupName !== nextGroupName
  if (movedBetweenGroups) {
    const { data: remainingPosts, error: remainingPostsError } = await supabaseServer
      .from('posts')
      .select('id')
      .eq('group_name', previousGroupName)
      .not('tag', 'eq', 'system')
      .limit(1)

    if (!remainingPostsError && (!remainingPosts || remainingPosts.length === 0)) {
      const markerTitle = `__GROUP_MARKER__${previousGroupName}`
      const { data: existingMarker, error: markerLookupError } = await supabaseServer
        .from('posts')
        .select('id')
        .eq('title', markerTitle)
        .eq('tag', 'system')
        .limit(1)

      if (!markerLookupError && (!existingMarker || existingMarker.length === 0)) {
        await supabaseServer
          .from('posts')
          .insert({
            title: markerTitle,
            content_path: null,
            tag: 'system',
          })
      }
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params
  if (!postId) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
  }

  // First, fetch the post to get its content and extract the R2 video key
  const { data: post, error: fetchError } = await supabaseServer
    .from('posts')
    .select('content_path')
    .eq('id', postId)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 404 })
  }

  // Extract R2 video key from markdown content if it exists
  if (post?.content_path) {
    const videoKey = extractR2VideoKeyFromMarkdown(post.content_path)
    
    if (videoKey) {
      // Delete the video from R2
      const deleteResult = await deleteVideoFromR2(videoKey)
      
      if (!deleteResult.success) {
        console.warn(`Warning: Failed to delete R2 video ${videoKey}: ${deleteResult.error}`)
        // Continue with post deletion even if video deletion fails
      }
    }
  }

  // Delete the post from the database
  const { error: deleteError } = await supabaseServer
    .from('posts')
    .delete()
    .eq('id', postId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
