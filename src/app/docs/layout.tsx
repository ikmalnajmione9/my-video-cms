import { supabaseServer } from '@/lib/supabase-server'
import DocsSidebar from '@/components/DocsSidebar'
import { AdminProvider } from '@/contexts/AdminContext'
import { ViewerProvider } from '@/contexts/ViewerContext'
import AdminDialogs from '@/components/AdminDialogs'

export const metadata = {
  title: 'Net7 Product Guide Web — Videos',
  description: 'Internal videos for Net7 mobile app features.',
}

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  // Fetch posts for sidebar
  const { data: posts } = await supabaseServer
    .from('posts')
    .select('id, title, tag, group_name')
    .order('id', { ascending: false })

  return (
    <AdminProvider>
      <ViewerProvider>
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
          <div className="flex gap-4 px-4 pb-4 pt-4">
            {/* Left Sidebar */}
            <aside className="hidden md:block w-72 rounded-2xl border border-slate-200 bg-white">
              <DocsSidebar posts={posts || []} />
            </aside>
            
            {/* Main Content */}
            <main className="flex-1 rounded-2xl border border-slate-200 bg-white">
              {children}
            </main>
          </div>
          <AdminDialogs />
        </div>
      </ViewerProvider>
    </AdminProvider>
  )
}
