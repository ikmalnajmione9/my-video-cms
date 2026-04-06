import { ViewerProvider } from '@/contexts/ViewerContext'

export default function ViewerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ViewerProvider>
      {children}
    </ViewerProvider>
  )
}
