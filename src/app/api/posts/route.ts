import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { inferPostDateFromMarkdown } from '@/lib/r2-utils'

export const dynamic = 'force-dynamic'

const POSTS_SELECT_COLUMNS = [
  'id',
  'title',
  'tag',
  'author',
  'group_name',
  'content_path',
  'created_at',
  'inserted_at',
  'updated_at',
  'published_at',
  'date',
] as const

function getMissingColumnFromError(error: any) {
  const message = String(error?.message || error?.details || '')
  const match = message.match(/column\s+(?:[\w.]+\.)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+does not exist/i)
  return match?.[1] ?? null
}

async function fetchPosts(selectColumns: string[]) {
  return await supabaseServer
    .from('posts')
    .select(selectColumns.join(', '))
    .not('tag', 'eq', 'system')
    .not('title', 'like', '__GROUP_MARKER__%')
    .order('id', { ascending: false })
}

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

export async function GET() {
  try {
    let selectColumns = [...POSTS_SELECT_COLUMNS]

    while (true) {
      const { data, error } = await fetchPosts(selectColumns)

      if (!error) {
        return NextResponse.json((data ?? []).map(normalizePostDate))
      }

      const missingColumn = getMissingColumnFromError(error)
      if (!missingColumn || !selectColumns.includes(missingColumn)) {
        throw error
      }

      selectColumns = selectColumns.filter(column => column !== missingColumn)
      if (selectColumns.length === 0) {
        throw error
      }

      console.warn(`API /api/posts retrying without missing column: ${missingColumn}`)
    }
  } catch (err: any) {
    console.error('Error in /api/posts:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
