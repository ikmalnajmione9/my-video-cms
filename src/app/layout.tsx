export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#0e1117] text-gray-100 h-screen overflow-hidden">
        {children}
      </body>
    </html>
  )
}
