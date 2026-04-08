import AppShellLayout from '@/components/AppShellLayout'

export const metadata = {
  title: 'Net7 Product Guide Hub — Product Guide',
  description: 'Internal videos for Net7 mobile app features.',
}

export default async function UserGuideV2Layout({ children }: { children: React.ReactNode }) {
  return <AppShellLayout>{children}</AppShellLayout>
}
