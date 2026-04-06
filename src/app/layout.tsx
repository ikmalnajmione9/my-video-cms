import "./globals.css"
import ClientLayoutWrapper from '@/components/ClientLayoutWrapper'
import ThemeProvider from '@/contexts/ThemeContext'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" />
      </head>
      <body className="h-screen overflow-hidden antialiased">
        <ThemeProvider>
          <ClientLayoutWrapper>
            {children}
          </ClientLayoutWrapper>
        </ThemeProvider>
      </body>
    </html>
  )
}
