import { supabaseServer } from '@/lib/supabase-server'
import { AdminProvider } from '@/contexts/AdminContext'
import { ViewerProvider } from '@/contexts/ViewerContext'
import AdminDialogs from '@/components/AdminDialogs'
import UserGuideV2Shell from '@/components/UserGuideV2Shell'

export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const { data: posts } = await supabaseServer
    .from('posts')
    .select('id, title, tag, group_name')
    .order('id', { ascending: false })

  return (
    <AdminProvider>
      <ViewerProvider>
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
          <UserGuideV2Shell posts={posts || []}>{children}</UserGuideV2Shell>
          <AdminDialogs />
        </div>
      </ViewerProvider>
    </AdminProvider>
  )
}