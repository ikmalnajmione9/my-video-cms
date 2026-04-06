import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase-server'

type GroupPageProps = {
  params: Promise<{ groupName: string }>
}

type Post = {
  id: string | number
  title: string
  tag?: string
}

const normalizeTag = (tag?: string) => (tag || 'new').toLowerCase()
const formatTag = (tag?: string) => normalizeTag(tag).replace(/-/g, ' ')
const getTagBadgeClass = (tag?: string) => {
  const normalized = normalizeTag(tag)
  if (normalized === 'tested') return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
  if (normalized === 'released') return 'bg-indigo-100 text-indigo-700 border border-indigo-200'
  if (normalized === 'in-review') return 'bg-amber-100 text-amber-700 border border-amber-200'
  return 'bg-sky-100 text-sky-700 border border-sky-200'
}

export default async function GroupPostsPage({ params }: GroupPageProps) {
  const { groupName } = await params

  const { data, error } = await supabaseServer
    .from('posts')
    .select('id, title, tag')
    .eq('group_name', groupName)
    .not('tag', 'eq', 'system')
    .not('title', 'like', '__GROUP_MARKER__%')
    .order('id', { ascending: false })

  const posts: Post[] = data ?? []

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/posts"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-400/40 hover:text-slate-900"
        >
          Back to All Videos
        </Link>
        <span className="rounded-full border border-violet-200 bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-700">
          {groupName}
        </span>
      </div>

      <h1 className="mb-2 text-3xl font-bold text-slate-900">{groupName}</h1>
      <p className="mb-8 text-slate-600">Select any post below to open it directly.</p>

      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load posts for this group.
        </div>
      )}

      <div className="rounded-lg border border-slate-100 bg-white p-4 sm:p-6\">
        {posts.length === 0 ? (
          <p className="text-sm text-slate-600">No posts found in this group.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="group rounded-lg border border-slate-100 bg-slate-50 p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/80"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900 group-hover:text-blue-700">{post.title}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getTagBadgeClass(post.tag)}`}>
                    {formatTag(post.tag)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
