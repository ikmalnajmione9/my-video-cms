import { supabaseServer } from '@/lib/supabase-server'
import PostsExplorer from './PostsExplorer'

type Post = {
  id: string | number
  title: string
  tag?: string
  group_name?: string | null
}

export default async function PostsPage() {
  const { data, error } = await supabaseServer
    .from('posts')
    .select('id, title, tag, group_name')
    .not('tag', 'eq', 'system')
    .not('title', 'like', '__GROUP_MARKER__%')
    .order('id', { ascending: false })

  const posts: Post[] = data ?? []

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">All Videos</h1>
      <p className="text-slate-600 mb-8">Choose how to browse: all posts, by groups, or by tags.</p>

      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load videos.
        </div>
      )}

      <PostsExplorer posts={posts} />
    </div>
  )
}
