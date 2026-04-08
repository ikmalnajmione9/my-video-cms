import AppShellLayout from '@/components/AppShellLayout'

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  return <AppShellLayout>{children}</AppShellLayout>
}
