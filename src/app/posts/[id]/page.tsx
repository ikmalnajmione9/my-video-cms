import { supabaseServer } from '@/lib/supabase-server'
import ReactMarkdown from 'react-markdown'
import Sidebar from '@/components/Sidebar'
import VideoPlayer from '@/components/VideoPlayer'

export default async function PostPage({ params }: any) {
  const { data: posts } = await supabaseServer
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })

  const post = posts?.find(p => p.id === params.id)
  if (!post) return null

  const { data } = await supabaseServer.storage
    .from('markdown-files')
    .download(post.content_path)

  const markdown = await data!.text()

  return (
    <>
      <Sidebar posts={posts} activeId={post.id} />

      <main className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-xl font-semibold mb-1">
          {post.title}
        </h1>
        <div className="text-xs text-gray-400 mb-4">
          {post.youtube_video_id}
        </div>

        <VideoPlayer videoId={post.youtube_video_id} />

        <section className="prose prose-invert max-w-none mt-8">
          <ReactMarkdown>
            {markdown}
          </ReactMarkdown>
        </section>
      </main>
    </>
  )
}