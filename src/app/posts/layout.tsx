export default function PostsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      {children}
    </div>
  )
}
``